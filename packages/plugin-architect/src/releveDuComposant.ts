/**
 * Le relevé complet d'un jeu de variants : tous ses variants, leurs layers,
 * peintures, liaisons, textes, valeurs sans variable et instances, tels que
 * les contrôles du kit les lisent (`ReleveDeComposant`). Rien n'est écrit
 * dans le document, et aucune variable n'est importée.
 *
 * La vue Composant lit le seul variant par défaut (`lectureDuComposant.ts`) ;
 * ce relevé en reprend le parcours : une instance sous la racine est une
 * frontière, ses calques ne sont pas lus, et les liaisons que le parent y pose
 * se rattachent au layer de l'instance, qui en est le porteur.
 *
 * Le budget compte les layers de variants, racine comprise, comme S3. Un
 * variant se lit en entier ou pas du tout ; le premier se lit toujours. Une
 * lecture qui échoue est comptée dans `lecture.manquees` et ne devient jamais
 * un constat : une variable liée qui ne se lit pas reste une liaison
 * (`illisible`), et une boîte illisible ne donne aucune valeur en dur de taille.
 *
 * Une liaison se découpe en `champ`, `indice` et `plage` : `fills[0]` donne
 * le champ `fills` et l'indice 0 ; `fills[0].gradientStops[1].color` donne
 * `fills.gradientStops[1].color` et l'indice 0. Une liaison de texte garde sa
 * plage et figure à la fois dans `layer.liaisons` et dans `texte.plages`.
 */
import type { LayerLu, LiaisonLue, PeintureLue, ReleveDeComposant, VariantLu } from '@ucm-kit/core/controles';
import { BUDGET_DE_LAYERS_PAR_DEFAUT } from 'ucm-plugin-socle/src/composant/contract/budget';
import { compter, attendrePourLaMesure } from 'ucm-plugin-socle/src/composant/contract/mesure';
import type { JetonDAnnulation } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';

import { liaisonsDuNoeud, type NoeudLu } from './consommateurs';
import { LOT, liaisonsDesSurcharges, sujetDe, type PortDuComposant } from './lectureDuComposant';
import type { EspaceDuReleve } from './modele';

export interface OptionsDuReleve {
  /** Défaut : `BUDGET_DE_LAYERS_PAR_DEFAUT`. */
  readonly budgetDeLayers?: number;
  readonly jeton?: JetonDAnnulation;
  /** L'espace du document ; le sandbox le lit dans `figma.root.documentColorProfile`. */
  readonly espaceDeCouleur?: EspaceDuReleve;
}

export type IssueDuReleve =
  | { readonly statut: 'lu'; readonly releve: ReleveDeComposant }
  | { readonly statut: 'annule' }
  | { readonly statut: 'sans-sujet' };

type Manquee = ReleveDeComposant['lecture']['manquees'][number];
type Brut = Record<string, unknown>;
type Etape = { noeud: NoeudLu; parent: string | null; frontiere: boolean };

const estUnNombre = (valeur: unknown): valeur is number => typeof valeur === 'number' && Number.isFinite(valeur);
const estUnObjet = (valeur: unknown): valeur is Brut => typeof valeur === 'object' && valeur !== null;
const messageDErreur = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));
const champLu = (noeud: NoeudLu, champ: string): unknown => {
  compter('proprietesDuReleve');
  return (noeud as unknown as Brut)[champ];
};

const estUnVariant = (noeud: NoeudLu): boolean => noeud.type === 'COMPONENT' && noeud.parent?.type === 'COMPONENT_SET';

/** Les layers d'un variant, racine d'abord ; une instance sous la racine n'est pas descendue. */
function parcourir(racine: NoeudLu): Etape[] {
  const etapes: Etape[] = [];
  const aVisiter: Array<{ noeud: NoeudLu; parent: string | null }> = [{ noeud: racine, parent: null }];
  while (aVisiter.length > 0) {
    const { noeud, parent } = aVisiter.pop() as { noeud: NoeudLu; parent: string | null };
    const frontiere = noeud.type === 'INSTANCE' && noeud.id !== racine.id;
    etapes.push({ noeud, parent, frontiere });
    if (frontiere) continue;
    const enfants = noeud.children ?? [];
    for (let rang = enfants.length - 1; rang >= 0; rang -= 1) aVisiter.push({ noeud: enfants[rang], parent: noeud.id });
  }
  return etapes;
}

/** Une liaison par son chemin : champ sans indice de tête, indice, plage de texte. */
function decouper(propriete: string): { champ: string; indice?: number; plage?: { debut: number; fin: number } } {
  let reste = propriete;
  let plage: { debut: number; fin: number } | undefined;
  const dansUnTexte = /^texte\[(\d+)–(\d+)\]\.(.*)$/.exec(reste);
  if (dansUnTexte) {
    plage = { debut: Number(dansUnTexte[1]), fin: Number(dansUnTexte[2]) };
    reste = dansUnTexte[3];
  }
  const indexe = /^([A-Za-z]+)\[(\d+)\](.*)$/.exec(reste);
  if (indexe) return { champ: `${indexe[1]}${indexe[3]}`, indice: Number(indexe[2]), ...(plage ? { plage } : {}) };
  return { champ: reste, ...(plage ? { plage } : {}) };
}

function peinturesDe(champ: 'fills' | 'strokes', liste: unknown, layer: string, manquees: Manquee[]): PeintureLue[] {
  if (liste === undefined) return [];
  if (!Array.isArray(liste)) {
    manquees.push({ layer, champ, motif: 'peintures mixtes ou illisibles' });
    return [];
  }
  return liste.flatMap((peinture, indice) => {
    if (!estUnObjet(peinture)) return [];
    const lue: PeintureLue = {
      champ,
      indice,
      type: String(peinture.type),
      visible: peinture.visible !== false,
      opacite: estUnNombre(peinture.opacity) ? peinture.opacity : 1,
      blendMode: typeof peinture.blendMode === 'string' ? peinture.blendMode : 'NORMAL',
    };
    if (peinture.type === 'SOLID' && estUnObjet(peinture.color)) {
      const { r, g, b, a } = peinture.color as { r: number; g: number; b: number; a?: number };
      lue.couleur = { r, g, b, a: estUnNombre(a) ? a : 1 };
    }
    return [lue];
  });
}

const CHAMPS_NUMERIQUES = ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing'] as const;
const RAYONS = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const;

/** Les champs numériques qu'aucune variable ne lie sur ce layer. */
function valeursEnDur(noeud: NoeudLu, liaisons: readonly LiaisonLue[], dimensions: LayerLu['dimensions'] | null): LayerLu['valeursEnDur'] {
  const liees = new Set(liaisons.filter((liaison) => !liaison.plage).map((liaison) => liaison.champ));
  const liee = (...champs: string[]): boolean => champs.some((champ) => liees.has(champ));
  const valeurs: LayerLu['valeursEnDur'] = [];
  const ajouter = (champ: string, valeur: unknown, ...aussi: string[]) => {
    if (estUnNombre(valeur) && !liee(champ, ...aussi)) valeurs.push({ champ, valeur });
  };
  if (typeof champLu(noeud, 'layoutMode') === 'string' && champLu(noeud, 'layoutMode') !== 'NONE') for (const champ of CHAMPS_NUMERIQUES) ajouter(champ, champLu(noeud, champ));
  if (estUnNombre(champLu(noeud, 'cornerRadius'))) ajouter('cornerRadius', champLu(noeud, 'cornerRadius'), ...RAYONS);
  else for (const coin of RAYONS) ajouter(coin, champLu(noeud, coin), 'cornerRadius');
  // Figma donne une épaisseur (1 par défaut) à tout layer, même sans contour : sans contour visible, elle ne se voit pas.
  const contourVisible = Array.isArray(champLu(noeud, 'strokes')) && (champLu(noeud, 'strokes') as unknown[]).some((peinture) => estUnObjet(peinture) && peinture.visible !== false && peinture.opacity !== 0);
  if (contourVisible) ajouter('strokeWeight', champLu(noeud, 'strokeWeight'), 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight');
  if (dimensions) {
    if (!liee('width')) valeurs.push({ champ: 'width', valeur: dimensions.largeur });
    if (!liee('height')) valeurs.push({ champ: 'height', valeur: dimensions.hauteur });
  }
  return valeurs;
}

/** `null` quand la boîte ne se lit pas : la manquée est consignée, le layer garde des dimensions nulles. */
function dimensionsDe(noeud: NoeudLu, manquees: Manquee[]): LayerLu['dimensions'] | null {
  const boite = noeud.absoluteBoundingBox;
  if (boite) return { x: boite.x, y: boite.y, largeur: boite.width, hauteur: boite.height };
  if ([champLu(noeud, 'x'), champLu(noeud, 'y'), champLu(noeud, 'width'), champLu(noeud, 'height')].every(estUnNombre)) {
    return { x: champLu(noeud, 'x') as number, y: champLu(noeud, 'y') as number, largeur: champLu(noeud, 'width') as number, hauteur: champLu(noeud, 'height') as number };
  }
  manquees.push({ layer: noeud.id, champ: 'dimensions', motif: 'boîte illisible' });
  return null;
}

/**
 * Garde en mémoire les variables, collections et styles déjà demandés, et la lecture en cours de chacun : une même variable
 * ne se lit jamais deux fois, même si deux demandes se croisent.
 */
class Lecteur {
  private readonly variables = new Map<string, Promise<{ lue: LiaisonLue['variable'] | null; erreur?: string }>>();
  private readonly collections = new Map<string, Promise<{ nom: string; modes: Map<string, string> } | null>>();
  private readonly styles = new Map<string, string | null>();

  constructor(
    private readonly port: PortDuComposant,
    readonly manquees: Manquee[],
  ) {}

  collection(id: string) {
    let lecture = this.collections.get(id);
    if (!lecture) {
      lecture = (async () => {
        try {
          const collection = await this.port.variables.getVariableCollectionByIdAsync(id);
          return collection ? { nom: collection.name, modes: new Map(collection.modes.map((mode) => [mode.modeId, mode.name])) } : null;
        } catch (erreur) {
          this.manquees.push({ champ: `collection ${id}`, motif: messageDErreur(erreur) });
          return null;
        }
      })();
      this.collections.set(id, lecture);
    }
    return lecture;
  }

  private async variable(id: string, layer: string, champ: string): Promise<LiaisonLue['variable'] | null> {
    const premiere = !this.variables.has(id);
    if (premiere) {
      this.variables.set(id, (async () => {
        try {
          const variable = await this.port.variables.getVariableByIdAsync(id);
          if (!variable) return { lue: null };
          const collection = await this.collection(variable.variableCollectionId);
          return { lue: { id: variable.id, cle: variable.key, nom: variable.name, collection: collection?.nom ?? variable.variableCollectionId, distante: variable.remote } };
        } catch (erreur) {
          return { lue: null, erreur: messageDErreur(erreur) };
        }
      })());
    }
    const { lue, erreur } = await (this.variables.get(id) as Promise<{ lue: LiaisonLue['variable'] | null; erreur?: string }>);
    if (!lue) this.manquees.push({ layer, champ, motif: premiere && erreur !== undefined ? erreur : 'variable illisible' });
    return lue;
  }

  async liaisons(brutes: ReadonlyArray<{ propriete: string; variable: string }>, porteur: string): Promise<LiaisonLue[]> {
    const liaisons: LiaisonLue[] = [];
    for (const { propriete, variable } of brutes) {
      const lue = await this.variable(variable, porteur, propriete);
      liaisons.push(
        lue
          ? { ...decouper(propriete), porteur, variable: lue }
          : { ...decouper(propriete), porteur, illisible: true, variable: { id: variable, cle: '', nom: '', collection: '', distante: false } },
      );
    }
    return liaisons;
  }

  async style(id: string, layer: string): Promise<string | null> {
    if (!this.styles.has(id)) {
      try {
        this.styles.set(id, (await this.port.getStyleByIdAsync(id))?.name ?? null);
      } catch (erreur) {
        this.manquees.push({ layer, champ: 'textStyleId', motif: messageDErreur(erreur) });
        this.styles.set(id, null);
      }
    }
    return this.styles.get(id) ?? null;
  }

  async modes(noeud: NoeudLu): Promise<Record<string, string>> {
    const modes: Record<string, string> = {};
    for (const [idDeCollection, idDeMode] of Object.entries(noeud.resolvedVariableModes ?? {})) {
      const collection = await this.collection(idDeCollection);
      if (collection) modes[collection.nom] = collection.modes.get(idDeMode) ?? idDeMode;
    }
    return modes;
  }
}

type Segment = { start: number; end: number; fills?: unknown; fontSize?: unknown; fontWeight?: unknown; textStyleId?: unknown };

async function texteDe(lecteur: Lecteur, noeud: NoeudLu, liaisons: readonly LiaisonLue[], manquees: Manquee[]): Promise<LayerLu['texte']> {
  let segments: Segment[] = [];
  try {
    segments = (noeud.getStyledTextSegments?.(['fontSize', 'fontWeight', 'fills', 'boundVariables', 'textStyleId']) ?? []) as unknown as Segment[];
  } catch (erreur) {
    manquees.push({ layer: noeud.id, champ: 'texte', motif: messageDErreur(erreur) });
  }
  const identifiants = typeof noeud.textStyleId === 'string' ? [noeud.textStyleId] : [...new Set(segments.map((segment) => segment.textStyleId))];
  const unique = identifiants.length === 1 && typeof identifiants[0] === 'string' && identifiants[0] !== '' ? identifiants[0] : null;
  return {
    style: unique ? await lecteur.style(unique, noeud.id) : null,
    plages: segments.map((segment) => ({
      debut: segment.start,
      fin: segment.end,
      fontSize: estUnNombre(segment.fontSize) ? segment.fontSize : 0,
      fontWeight: estUnNombre(segment.fontWeight) ? segment.fontWeight : 0,
      peintures: peinturesDe('fills', segment.fills, noeud.id, manquees),
      liaisons: liaisons.filter((liaison) => liaison.plage?.debut === segment.start && liaison.plage.fin === segment.end),
    })),
  };
}

async function instanceDe(noeud: NoeudLu, manquees: Manquee[]): Promise<LayerLu['instanceDe'] | undefined> {
  try {
    const maitre = await noeud.getMainComponentAsync?.();
    if (!maitre) {
      manquees.push({ layer: noeud.id, champ: 'instanceDe', motif: 'composant source introuvable' });
      return undefined;
    }
    const jeu = estUnVariant(maitre) && maitre.parent ? maitre.parent : maitre;
    const references = champLu(noeud, 'componentPropertyReferences');
    const pilotee = estUnObjet(references) && typeof references.mainComponent === 'string' ? references.mainComponent : null;
    return { cle: String(champLu(jeu, 'key') ?? ''), nom: jeu.name, distante: champLu(maitre, 'remote') === true, pilotee };
  } catch (erreur) {
    manquees.push({ layer: noeud.id, champ: 'instanceDe', motif: messageDErreur(erreur) });
    return undefined;
  }
}

async function lireLeLayer(port: PortDuComposant, lecteur: Lecteur, etape: Etape, manquees: Manquee[]): Promise<LayerLu> {
  const { noeud, parent, frontiere } = etape;
  const dimensions = dimensionsDe(noeud, manquees);
  const layer: LayerLu = {
    id: noeud.id,
    nom: noeud.name,
    type: noeud.type,
    parent,
    visible: champLu(noeud, 'visible') !== false,
    opacite: estUnNombre(champLu(noeud, 'opacity')) ? champLu(noeud, 'opacity') as number : 1,
    dimensions: dimensions ?? { x: 0, y: 0, largeur: 0, hauteur: 0 },
    peintures: [...peinturesDe('fills', noeud.fills, noeud.id, manquees), ...peinturesDe('strokes', noeud.strokes, noeud.id, manquees)],
    liaisons: [],
    valeursEnDur: [],
  };
  if (estUnNombre(champLu(noeud, 'strokeWeight'))) layer.strokeWeight = champLu(noeud, 'strokeWeight') as number;
  try {
    layer.liaisons = await lecteur.liaisons(liaisonsDuNoeud(noeud), noeud.id);
    if (frontiere) {
      const lues: LiaisonLue[] = [];
      for (const { propriete, variable, porteur } of await liaisonsDesSurcharges(port, noeud, true)) {
        const surcharge = porteur.id === noeud.id ? {} : { surcharge: { id: porteur.id, nom: porteur.name, type: porteur.type } };
        lues.push(...(await lecteur.liaisons([{ propriete, variable }], noeud.id)).map((liaison) => ({ ...liaison, ...surcharge })));
      }
      const cle = (liaison: LiaisonLue): string => JSON.stringify([liaison.surcharge?.id ?? null, liaison.champ, liaison.indice, liaison.variable.id]);
      const connues = new Set(layer.liaisons.map(cle));
      layer.liaisons.push(...lues.filter((liaison) => !connues.has(cle(liaison))));
      const instance = await instanceDe(noeud, manquees);
      if (instance) layer.instanceDe = instance;
    }
  } catch (erreur) {
    manquees.push({ layer: noeud.id, champ: 'liaisons', motif: messageDErreur(erreur) });
  }
  layer.valeursEnDur = valeursEnDur(noeud, layer.liaisons.filter((liaison) => !liaison.surcharge), dimensions);
  if (noeud.type === 'TEXT') layer.texte = await texteDe(lecteur, noeud, layer.liaisons, manquees);
  return layer;
}

/** Les valeurs de variant d'un composant : `variantProperties`, sinon son nom `Propriété=Valeur, …`. */
function valeursDuVariant(variant: NoeudLu): Record<string, string> {
  const propres = champLu(variant, 'variantProperties');
  if (estUnObjet(propres)) return Object.fromEntries(Object.entries(propres).map(([nom, valeur]) => [nom, String(valeur)]));
  if (!estUnVariant(variant)) return {};
  return Object.fromEntries(
    variant.name.split(',').flatMap((morceau) => {
      const coupe = morceau.indexOf('=');
      return coupe < 0 ? [] : [[morceau.slice(0, coupe).trim(), morceau.slice(coupe + 1).trim()]];
    }),
  );
}

const TYPES_DE_PROPRIETE = new Set(['VARIANT', 'BOOLEAN', 'TEXT', 'INSTANCE_SWAP']);

function proprietesDe(jeu: NoeudLu, manquees: Manquee[]): ReleveDeComposant['proprietes'] {
  let definitions: unknown;
  try {
    definitions = champLu(jeu, 'componentPropertyDefinitions');
  } catch (erreur) {
    manquees.push({ champ: 'componentPropertyDefinitions', motif: messageDErreur(erreur) });
    return [];
  }
  if (!estUnObjet(definitions)) return [];
  return Object.entries(definitions).flatMap(([nom, definition]) => {
    if (!estUnObjet(definition) || typeof definition.type !== 'string' || !TYPES_DE_PROPRIETE.has(definition.type)) return [];
    const defaut = typeof definition.defaultValue === 'boolean' ? definition.defaultValue : String(definition.defaultValue ?? '');
    const valeurs = Array.isArray(definition.variantOptions) ? definition.variantOptions.map(String) : undefined;
    return [{ nom, type: definition.type as ReleveDeComposant['proprietes'][number]['type'], ...(valeurs ? { valeurs } : {}), defaut }];
  });
}

/**
 * Le relevé du jeu de variants qui contient `depart`. Un composant seul se
 * lit comme un jeu d'un variant. Une annulation ne rend aucun résultat partiel.
 */
export async function lireLeReleve(port: PortDuComposant, depart: NoeudLu, options: OptionsDuReleve = {}): Promise<IssueDuReleve> {
  const budget = options.budgetDeLayers ?? BUDGET_DE_LAYERS_PAR_DEFAUT;
  const annule = (): boolean => options.jeton?.leve === true;
  const trouve = sujetDe(depart);
  if (!trouve) return { statut: 'sans-sujet' };
  let { sujet } = trouve;
  if (sujet.type === 'INSTANCE') {
    const maitre = await sujet.getMainComponentAsync?.().catch(() => null);
    if (!maitre) return { statut: 'sans-sujet' };
    sujet = maitre;
  }
  const jeu = sujet.type === 'COMPONENT_SET' ? sujet : estUnVariant(sujet) && sujet.parent ? sujet.parent : sujet;
  const composants = jeu.type === 'COMPONENT_SET' ? (jeu.children ?? []).filter((enfant) => enfant.type === 'COMPONENT') : [jeu];
  if (composants.length === 0) return { statut: 'sans-sujet' };
  if (annule()) return { statut: 'annule' };

  const manquees: Manquee[] = [];
  const lecteur = new Lecteur(port, manquees);
  const variants: VariantLu[] = [];
  const variantsNonLus: string[] = [];
  let layersLus = 0;
  let layersNonLus = 0 as number | 'inconnu';
  let coupe = false;

  for (const composant of composants) {
    if (annule()) return { statut: 'annule' };
    let etapes: Etape[] | null = null;
    try {
      etapes = parcourir(composant);
    } catch (erreur) {
      manquees.push({ layer: composant.id, champ: 'children', motif: messageDErreur(erreur) });
    }
    if (!coupe && etapes && (variants.length === 0 || layersLus + etapes.length <= budget)) {
      const layers: LayerLu[] = [];
      for (const etape of etapes) {
        if (layers.length > 0 && layers.length % LOT === 0) {
          if (annule()) return { statut: 'annule' };
          await attendrePourLaMesure(() => port.pause(), 'cession');
        }
        layers.push(await lireLeLayer(port, lecteur, etape, manquees));
      }
      layersLus += layers.length;
      variants.push({ id: composant.id, nom: composant.name, valeurs: valeursDuVariant(composant), layers, modesEffectifs: await lecteur.modes(composant) });
      continue;
    }
    coupe = true;
    variantsNonLus.push(composant.name);
    layersNonLus = etapes && layersNonLus !== 'inconnu' ? layersNonLus + etapes.length : 'inconnu';
  }

  return {
    statut: 'lu',
    releve: {
      version: 1,
      jeu: { cle: String(champLu(jeu, 'key') ?? ''), id: jeu.id, nom: jeu.name },
      proprietes: proprietesDe(jeu, manquees),
      variants,
      lecture: { layersLus, layersNonLus, variantsNonLus, manquees },
      espaceDeCouleur: options.espaceDeCouleur ?? 'srgb',
    },
  };
}

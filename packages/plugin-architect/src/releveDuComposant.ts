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
import { copierLaMiseEnPage, type ChampDeMiseEnPage, type ChampsDeMiseEnPage } from 'ucm-plugin-socle/src/composant/analyse/acquisition';
import { champDe, type TableDesChamps } from 'ucm-plugin-socle/src/composant/analyse/faits';
import { BUDGET_DE_LAYERS_PAR_DEFAUT } from 'ucm-plugin-socle/src/composant/contract/budget';
import { compter } from 'ucm-plugin-socle/src/composant/contract/mesure';
import { AnalyseAnnulee, creerContexteCooperatif, type ContexteCooperatif, type JetonDAnnulation } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';

import { liaisonsDuNoeudCooperatives, type NoeudLu } from './consommateurs';
import { liaisonsDesSurcharges, type PortDuComposant } from './lectureDuComposant';
import type { EspaceDuReleve } from './modele';

export interface OptionsDuReleve {
  readonly progresser?: (fait: number, total: number) => void;
  /** Défaut : `BUDGET_DE_LAYERS_PAR_DEFAUT`. */
  readonly budgetDeLayers?: number;
  readonly jeton?: JetonDAnnulation;
  /** Le budget que l'analyse partage avec le moteur et les contrôles ; sans lui, le relevé en crée un qui cède par `port.pause`. */
  readonly cooperation?: ContexteCooperatif;
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
async function parcourir(racine: NoeudLu, cooperation: ContexteCooperatif): Promise<Etape[]> {
  const etapes: Etape[] = [];
  const aVisiter: Array<{ noeud: NoeudLu; parent: string | null }> = [{ noeud: racine, parent: null }];
  while (aVisiter.length > 0) {
    await cooperation.cederSiBesoin();
    const { noeud, parent } = aVisiter.pop() as { noeud: NoeudLu; parent: string | null };
    const frontiere = noeud.type === 'INSTANCE' && noeud.id !== racine.id;
    etapes.push({ noeud, parent, frontiere });
    if (frontiere) continue;
    const enfants = noeud.children ?? [];
    for (let rang = enfants.length - 1; rang >= 0; rang -= 1) {
      await cooperation.cederSiBesoin();
      aVisiter.push({ noeud: enfants[rang], parent: noeud.id });
    }
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

async function peinturesDe(champ: 'fills' | 'strokes', liste: unknown, layer: string, manquees: Manquee[], cooperation: ContexteCooperatif): Promise<PeintureLue[]> {
  if (liste === undefined) return [];
  if (!Array.isArray(liste)) {
    manquees.push({ layer, champ, motif: 'peintures mixtes ou illisibles' });
    return [];
  }
  const peintures: PeintureLue[] = [];
  for (const [indice, peinture] of liste.entries()) {
    await cooperation.cederSiBesoin();
    if (!estUnObjet(peinture)) continue;
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
    peintures.push(lue);
  }
  return peintures;
}

/** Copie des champs de mise en page, une lecture chacun, comptée comme les autres propriétés du relevé. */
const miseEnPage = <K extends ChampDeMiseEnPage>(noeud: NoeudLu, champs: readonly K[]) => copierLaMiseEnPage(noeud, champs, () => compter('proprietesDuReleve'));

/**
 * Le nombre fini d'un champ copié ; `undefined` sinon. Un champ mixte ou absent n'est pas une valeur en dur. Une
 * lecture qui a levé est consignée dans `manquees` et ne devient jamais un constat.
 */
function nombreDe<K extends ChampDeMiseEnPage>(table: TableDesChamps<Pick<ChampsDeMiseEnPage, K>>, champ: K, layer: string, manquees: Manquee[]): number | undefined {
  const etat = champDe(table, champ);
  if (etat.etat === 'acquis') return estUnNombre(etat.valeur) ? etat.valeur : undefined;
  if (etat.etat === 'refuse' && etat.raison === 'leve') manquees.push({ layer, champ, motif: etat.message ?? 'lecture refusée' });
  return undefined;
}

const CHAMPS_NUMERIQUES = ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom', 'itemSpacing'] as const;
const RAYONS = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const;

/** Les champs numériques qu'aucune variable ne lie sur ce layer. */
async function valeursEnDur(noeud: NoeudLu, liaisons: readonly LiaisonLue[], dimensions: LayerLu['dimensions'] | null, epaisseur: number | undefined, manquees: Manquee[], cooperation: ContexteCooperatif): Promise<LayerLu['valeursEnDur']> {
  const liees = new Set<string>();
  for (const liaison of liaisons) {
    await cooperation.cederSiBesoin();
    if (!liaison.plage && !liaison.surcharge) liees.add(liaison.champ);
  }
  const liee = (...champs: string[]): boolean => champs.some((champ) => liees.has(champ));
  const valeurs: LayerLu['valeursEnDur'] = [];
  const ajouter = (champ: string, valeur: unknown, ...aussi: string[]) => {
    if (estUnNombre(valeur) && !liee(champ, ...aussi)) valeurs.push({ champ, valeur });
  };
  const mode = champDe(miseEnPage(noeud, ['layoutMode']), 'layoutMode');
  if (mode.etat === 'acquis' && typeof mode.valeur === 'string' && mode.valeur !== 'NONE') {
    const espacements = miseEnPage(noeud, CHAMPS_NUMERIQUES);
    for (const champ of CHAMPS_NUMERIQUES) ajouter(champ, nombreDe(espacements, champ, noeud.id, manquees));
  }
  const rayon = miseEnPage(noeud, ['cornerRadius']);
  const commun = nombreDe(rayon, 'cornerRadius', noeud.id, manquees);
  if (commun !== undefined) ajouter('cornerRadius', commun, ...RAYONS);
  else {
    const coins = miseEnPage(noeud, RAYONS);
    for (const coin of RAYONS) ajouter(coin, nombreDe(coins, coin, noeud.id, manquees), 'cornerRadius');
  }
  // Figma donne une épaisseur (1 par défaut) à tout layer, même sans contour : sans contour visible, elle ne se voit pas.
  const contours = champLu(noeud, 'strokes');
  let contourVisible = false;
  if (Array.isArray(contours)) for (const peinture of contours) {
    await cooperation.cederSiBesoin();
    if (estUnObjet(peinture) && peinture.visible !== false && peinture.opacity !== 0) {
      contourVisible = true;
      break;
    }
  }
  if (contourVisible) ajouter('strokeWeight', epaisseur, 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight');
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
    readonly cooperation: ContexteCooperatif,
  ) {}

  collection(id: string) {
    let lecture = this.collections.get(id);
    if (!lecture) {
      lecture = (async () => {
        try {
          const collection = await this.port.variables.getVariableCollectionByIdAsync(id);
          if (!collection) return null;
          const modes = new Map<string, string>();
          for (const mode of collection.modes) {
            await this.cooperation.cederSiBesoin();
            modes.set(mode.modeId, mode.name);
          }
          return { nom: collection.name, modes };
        } catch (erreur) {
          if (erreur instanceof AnalyseAnnulee) throw erreur;
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
          if (erreur instanceof AnalyseAnnulee) throw erreur;
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
      await this.cooperation.cederSiBesoin();
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
    const effectifs = noeud.resolvedVariableModes ?? {};
    for (const idDeCollection of Object.keys(effectifs)) {
      await this.cooperation.cederSiBesoin();
      const idDeMode = effectifs[idDeCollection];
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
  const identifiants = new Set<unknown>();
  if (typeof noeud.textStyleId === 'string') identifiants.add(noeud.textStyleId);
  else for (const segment of segments) {
    await lecteur.cooperation.cederSiBesoin();
    identifiants.add(segment.textStyleId);
  }
  const premier = identifiants.values().next().value;
  const unique = identifiants.size === 1 && typeof premier === 'string' && premier !== '' ? premier : null;
  const liaisonsParPlage = new Map<string, LiaisonLue[]>();
  for (const liaison of liaisons) {
    await lecteur.cooperation.cederSiBesoin();
    if (!liaison.plage) continue;
    const cle = `${liaison.plage.debut}:${liaison.plage.fin}`;
    const groupe = liaisonsParPlage.get(cle) ?? [];
    groupe.push(liaison);
    liaisonsParPlage.set(cle, groupe);
  }
  const plages: NonNullable<LayerLu['texte']>['plages'] = [];
  for (const segment of segments) {
    await lecteur.cooperation.cederSiBesoin();
    plages.push({
      debut: segment.start,
      fin: segment.end,
      fontSize: estUnNombre(segment.fontSize) ? segment.fontSize : 0,
      fontWeight: estUnNombre(segment.fontWeight) ? segment.fontWeight : 0,
      peintures: await peinturesDe('fills', segment.fills, noeud.id, manquees, lecteur.cooperation),
      liaisons: liaisonsParPlage.get(`${segment.start}:${segment.end}`) ?? [],
    });
  }
  return {
    style: unique ? await lecteur.style(unique, noeud.id) : null,
    plages,
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
    peintures: await peinturesDe('fills', noeud.fills, noeud.id, manquees, lecteur.cooperation),
    liaisons: [],
    valeursEnDur: [],
  };
  for (const peinture of await peinturesDe('strokes', noeud.strokes, noeud.id, manquees, lecteur.cooperation)) {
    await lecteur.cooperation.cederSiBesoin();
    layer.peintures.push(peinture);
  }
  const epaisseur = nombreDe(miseEnPage(noeud, ['strokeWeight']), 'strokeWeight', noeud.id, manquees);
  if (epaisseur !== undefined) layer.strokeWeight = epaisseur;
  try {
    layer.liaisons = await lecteur.liaisons(await liaisonsDuNoeudCooperatives(noeud, lecteur.cooperation), noeud.id);
    if (frontiere) {
      const lues: LiaisonLue[] = [];
      for (const { propriete, variable, porteur } of await liaisonsDesSurcharges(port, noeud, true, lecteur.cooperation)) {
        await lecteur.cooperation.cederSiBesoin();
        const surcharge = porteur.id === noeud.id ? {} : { surcharge: { id: porteur.id, nom: porteur.name, type: porteur.type } };
        lues.push(...(await lecteur.liaisons([{ propriete, variable }], noeud.id)).map((liaison) => ({ ...liaison, ...surcharge })));
      }
      const cle = (liaison: LiaisonLue): string => JSON.stringify([liaison.surcharge?.id ?? null, liaison.champ, liaison.indice, liaison.variable.id]);
      const connues = new Set<string>();
      for (const liaison of layer.liaisons) {
        await lecteur.cooperation.cederSiBesoin();
        connues.add(cle(liaison));
      }
      for (const liaison of lues) {
        await lecteur.cooperation.cederSiBesoin();
        if (!connues.has(cle(liaison))) layer.liaisons.push(liaison);
      }
      const instance = await instanceDe(noeud, manquees);
      if (instance) layer.instanceDe = instance;
    }
  } catch (erreur) {
    if (erreur instanceof AnalyseAnnulee) throw erreur;
    manquees.push({ layer: noeud.id, champ: 'liaisons', motif: messageDErreur(erreur) });
  }
  layer.valeursEnDur = await valeursEnDur(noeud, layer.liaisons, dimensions, epaisseur, manquees, lecteur.cooperation);
  if (noeud.type === 'TEXT') layer.texte = await texteDe(lecteur, noeud, layer.liaisons, manquees);
  return layer;
}

/** Les valeurs de variant d'un composant : `variantProperties`, sinon son nom `Propriété=Valeur, …`. */
async function valeursDuVariant(variant: NoeudLu, cooperation: ContexteCooperatif): Promise<Record<string, string>> {
  const propres = champLu(variant, 'variantProperties');
  if (estUnObjet(propres)) {
    const valeurs: Record<string, string> = {};
    for (const nom of Object.keys(propres)) {
      await cooperation.cederSiBesoin();
      Object.defineProperty(valeurs, nom, { value: String(propres[nom]), enumerable: true, configurable: true, writable: true });
    }
    return valeurs;
  }
  if (!estUnVariant(variant)) return {};
  const valeurs: Record<string, string> = {};
  const nom = variant.name;
  let debut = 0;
  while (debut <= nom.length) {
    await cooperation.cederSiBesoin();
    const virgule = nom.indexOf(',', debut);
    const morceau = nom.slice(debut, virgule < 0 ? nom.length : virgule);
    const coupe = morceau.indexOf('=');
    if (coupe >= 0) Object.defineProperty(valeurs, morceau.slice(0, coupe).trim(), { value: morceau.slice(coupe + 1).trim(), enumerable: true, configurable: true, writable: true });
    if (virgule < 0) break;
    debut = virgule + 1;
  }
  return valeurs;
}

const TYPES_DE_PROPRIETE = new Set(['VARIANT', 'BOOLEAN', 'TEXT', 'INSTANCE_SWAP']);

async function proprietesDe(jeu: NoeudLu, manquees: Manquee[], cooperation: ContexteCooperatif): Promise<ReleveDeComposant['proprietes']> {
  let definitions: unknown;
  try {
    definitions = champLu(jeu, 'componentPropertyDefinitions');
  } catch (erreur) {
    manquees.push({ champ: 'componentPropertyDefinitions', motif: messageDErreur(erreur) });
    return [];
  }
  if (!estUnObjet(definitions)) return [];
  const proprietes: ReleveDeComposant['proprietes'] = [];
  for (const nom of Object.keys(definitions)) {
    await cooperation.cederSiBesoin();
    const definition = definitions[nom];
    if (!estUnObjet(definition) || typeof definition.type !== 'string' || !TYPES_DE_PROPRIETE.has(definition.type)) continue;
    const defaut = typeof definition.defaultValue === 'boolean' ? definition.defaultValue : String(definition.defaultValue ?? '');
    const options = definition.variantOptions;
    const valeurs: string[] = Array.isArray(options) ? new Array(options.length) : [];
    if (Array.isArray(options)) for (let rang = 0; rang < options.length; rang += 1) {
      await cooperation.cederSiBesoin();
      if (rang in options) valeurs[rang] = String(options[rang]);
    }
    proprietes.push({ nom, type: definition.type as ReleveDeComposant['proprietes'][number]['type'], ...(Array.isArray(definition.variantOptions) ? { valeurs } : {}), defaut });
  }
  return proprietes;
}

/**
 * Le relevé du jeu de variants qui contient `depart`. Un composant seul se
 * lit comme un jeu d'un variant. Une annulation ne rend aucun résultat partiel.
 */
export async function lireLeReleve(port: PortDuComposant, depart: NoeudLu, options: OptionsDuReleve = {}): Promise<IssueDuReleve> {
  try {
    return await lireLeReleveInterruptible(port, depart, options);
  } catch (erreur) {
    if (erreur instanceof AnalyseAnnulee) return { statut: 'annule' };
    throw erreur;
  }
}

async function lireLeReleveInterruptible(port: PortDuComposant, depart: NoeudLu, options: OptionsDuReleve): Promise<IssueDuReleve> {
  const budget = options.budgetDeLayers ?? BUDGET_DE_LAYERS_PAR_DEFAUT;
  const cooperation = options.cooperation ?? creerContexteCooperatif({ jeton: options.jeton, respirer: () => port.pause() });
  const annule = (): boolean => options.jeton?.leve === true;
  let sujet: NoeudLu | null = depart;
  while (sujet && !['COMPONENT', 'COMPONENT_SET', 'INSTANCE'].includes(sujet.type)) {
    await cooperation.cederSiBesoin();
    sujet = sujet.parent;
  }
  if (!sujet) return { statut: 'sans-sujet' };
  if (sujet.type === 'INSTANCE') {
    const maitre = await sujet.getMainComponentAsync?.().catch(() => null);
    if (!maitre) return { statut: 'sans-sujet' };
    sujet = maitre;
  }
  const jeu = sujet.type === 'COMPONENT_SET' ? sujet : estUnVariant(sujet) && sujet.parent ? sujet.parent : sujet;
  const composants: NoeudLu[] = [];
  if (jeu.type === 'COMPONENT_SET') {
    for (const enfant of jeu.children ?? []) {
      await cooperation.cederSiBesoin();
      if (enfant.type === 'COMPONENT') composants.push(enfant);
    }
  } else composants.push(jeu);
  if (composants.length === 0) return { statut: 'sans-sujet' };
  if (annule()) return { statut: 'annule' };

  const manquees: Manquee[] = [];
  const lecteur = new Lecteur(port, manquees, cooperation);
  const variants: VariantLu[] = [];
  const variantsNonLus: string[] = [];
  let layersLus = 0;
  let layersNonLus = 0 as number | 'inconnu';
  let coupe = false;

  for (const composant of composants) {
    await cooperation.cederSiBesoin();
    if (annule()) return { statut: 'annule' };
    let etapes: Etape[] | null = null;
    try {
      etapes = await parcourir(composant, cooperation);
    } catch (erreur) {
      if (erreur instanceof AnalyseAnnulee) throw erreur;
      manquees.push({ layer: composant.id, champ: 'children', motif: messageDErreur(erreur) });
    }
    if (!coupe && etapes && (variants.length === 0 || layersLus + etapes.length <= budget)) {
      const layers: LayerLu[] = [];
      for (const etape of etapes) {
        await cooperation.cederSiBesoin();
        layers.push(await lireLeLayer(port, lecteur, etape, manquees));
      }
      layersLus += layers.length;
      variants.push({ id: composant.id, nom: composant.name, valeurs: await valeursDuVariant(composant, cooperation), layers, modesEffectifs: await lecteur.modes(composant) });
      options.progresser?.(variants.length, composants.length);
      continue;
    }
    coupe = true;
    variantsNonLus.push(composant.name);
    layersNonLus = etapes && layersNonLus !== 'inconnu' ? layersNonLus + etapes.length : 'inconnu';
  }

  const proprietes = await proprietesDe(jeu, manquees, cooperation);
  cooperation.verifier();

  return {
    statut: 'lu',
    releve: {
      version: 1,
      jeu: { cle: String(champLu(jeu, 'key') ?? ''), id: jeu.id, nom: jeu.name },
      proprietes,
      variants,
      lecture: { layersLus, layersNonLus, variantsNonLus, manquees },
      espaceDeCouleur: options.espaceDeCouleur ?? 'srgb',
    },
  };
}

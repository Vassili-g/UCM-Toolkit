/**
 * La lecture d'un composant dans le sandbox : le sujet d'une sélection, ses
 * calques, ses composants imbriqués, ses liaisons, ses styles de texte et
 * les variables que ses liaisons atteignent. Rien n'est écrit dans le
 * document.
 *
 * Le sujet est le calque sélectionné s'il est un composant, une instance ou
 * un jeu de variants, sinon son plus proche ancêtre de l'un de ces types.
 *
 * Toute instance strictement sous le sujet est une frontière : ses calques
 * ne sont pas parcourus. Une liaison que le parent pose dans cette instance
 * se lit dans `InstanceNode.overrides` et se rattache au calque de
 * l'instance : elle appartient au sujet.
 *
 * Une variable liée à un calque se lit par son identifiant et ne s'importe
 * jamais. Les cibles de ses alias suivent la règle de `lecture.ts`.
 */
import { boiteDe } from './apercu';
import { champDe, natureDe, type CalqueDuComposant, type LectureDeComposant, type LiaisonDuComposant, type StyleDeTexte } from './composant';
import { liaisonsDuNoeud, liaisonsDuStyle, modesDuNoeud, type NoeudLu, type StyleLu } from './consommateurs';
import { convertirValeur, lireLesVariables, separerLesModes, traduireLesModes, type PortDeLecture, type SuiviDeLecture, type VariableFigma } from './lecture';
import { FORMAT_DU_RELEVE, hexaDeCouleur } from './modele';

/** Le nombre de calques lus entre deux pauses. */
export const LOT = 400;

/** Au-delà, la lecture s'arrête et compte les calques non lus. */
export const BORNE_DES_CALQUES = 2000;

const TYPES_DE_SUJET = new Set(['COMPONENT', 'INSTANCE', 'COMPONENT_SET']);

/** Le port de la lecture : la sélection, un calque ou un style par identifiant, et les variables. */
export interface PortDuComposant {
  selection(): readonly NoeudLu[];
  getNodeByIdAsync(id: string): Promise<NoeudLu | null>;
  getStyleByIdAsync(id: string): Promise<StyleLu | null>;
  readonly variables: PortDeLecture;
  /** Rend la main au moteur de Figma entre deux lots. */
  pause(): Promise<void>;
}

export interface SujetDeSelection {
  readonly sujet: NoeudLu;
  /** Le calque demandé : le sujet lui-même, ou l'un de ses descendants. */
  readonly portee: string;
  /** Les composants et instances qui contiennent le sujet, du plus lointain au plus proche. */
  readonly ancetres: readonly NoeudLu[];
}

const estUnVariant = (noeud: NoeudLu): boolean => noeud.type === 'COMPONENT' && noeud.parent?.type === 'COMPONENT_SET';

/** Le nom d'un sujet : un variant prend le nom de son jeu. */
function nomDeSujet(noeud: NoeudLu): string {
  return estUnVariant(noeud) && noeud.parent ? noeud.parent.name : noeud.name;
}

/**
 * Le sujet d'un calque, ou `null` hors de tout composant. Le jeu d'un variant
 * ne compte pas parmi ses ancêtres : il lui donne son nom.
 */
export function sujetDe(noeud: NoeudLu): SujetDeSelection | null {
  let sujet: NoeudLu | null = noeud;
  while (sujet && !TYPES_DE_SUJET.has(sujet.type)) sujet = sujet.parent;
  if (!sujet) return null;
  const ancetres: NoeudLu[] = [];
  let courant: NoeudLu | null = estUnVariant(sujet) && sujet.parent ? sujet.parent.parent : sujet.parent;
  while (courant) {
    if (TYPES_DE_SUJET.has(courant.type)) ancetres.unshift(courant);
    courant = estUnVariant(courant) && courant.parent ? courant.parent.parent : courant.parent;
  }
  return { sujet, portee: noeud.id, ancetres };
}

/** Ce que le message `selection` dit du sujet : le premier calque décide, les autres sont ignorés. */
export function sujetDeLaSelection(selection: readonly NoeudLu[]): { sujet: { id: string; portee: string } | null; ignores: number } {
  const trouve = selection.length > 0 ? sujetDe(selection[0]) : null;
  return { sujet: trouve ? { id: trouve.sujet.id, portee: trouve.portee } : null, ignores: Math.max(0, selection.length - 1) };
}

export type IssueDuComposant =
  | { readonly statut: 'lu'; readonly lecture: LectureDeComposant }
  | { readonly statut: 'annule' }
  /** Le calque de départ n'est dans aucun composant. */
  | { readonly statut: 'sans-sujet' };

const messageDErreur = (erreur: unknown): string => (erreur instanceof Error ? erreur.message : String(erreur));
const estUnNombre = (valeur: unknown): valeur is number => typeof valeur === 'number' && Number.isFinite(valeur);
const estUnObjet = (valeur: unknown): valeur is Record<string, unknown> => typeof valeur === 'object' && valeur !== null;

/** Les champs qu'une liaison lit dans une peinture ou un effet, et non dans `boundVariables` du calque. */
const LUS_PAR_LEURS_OBJETS = new Set(['fills', 'strokes', 'effects', 'layoutGrids']);

/** Le premier segment du chemin d'une liaison, sans indice : le champ que `overriddenFields` nomme. */
const champSurcharge = (propriete: string): string => champDe(propriete).champ.split('.')[0];

/** Vrai quand une surcharge de ce champ peut porter une liaison que la vue affiche. */
function surchargeLue(champ: string): boolean {
  return champ === 'boundVariables' || LUS_PAR_LEURS_OBJETS.has(champ) || natureDe(champ, '').nature !== 'autre';
}

/** Le nom du composant d'une instance : son jeu, son maître, ou le nom du calque quand le maître ne se lit pas. */
async function nomDuMaitre(instance: NoeudLu): Promise<string> {
  try {
    const maitre = await instance.getMainComponentAsync?.();
    if (maitre) return nomDeSujet(maitre);
  } catch {
    // Le nom du calque suit.
  }
  return instance.name;
}

type LiaisonLue = { propriete: string; variable: string; porteur: NoeudLu };

/** Les liaisons que le parent pose dans une instance frontière, lues sur les calques que ses surcharges visent. */
async function liaisonsDesSurcharges(port: PortDuComposant, instance: NoeudLu): Promise<LiaisonLue[]> {
  const liaisons: LiaisonLue[] = [];
  const vues = new Set<string>();
  for (const surcharge of instance.overrides ?? []) {
    const champs = new Set(surcharge.overriddenFields);
    if (![...champs].some(surchargeLue)) continue;
    const vise = surcharge.id === instance.id ? instance : await port.getNodeByIdAsync(surcharge.id);
    if (!vise) continue;
    for (const liaison of liaisonsDuNoeud(vise)) {
      const champ = champSurcharge(liaison.propriete);
      const citee = champs.has(champ) || (!LUS_PAR_LEURS_OBJETS.has(champ) && champs.has('boundVariables'));
      const cle = `${liaison.propriete}\u0000${liaison.variable}`;
      if (!citee || vues.has(cle)) continue;
      vues.add(cle);
      liaisons.push({ ...liaison, porteur: vise });
    }
  }
  return liaisons;
}

/** Les identifiants des styles de texte d'un calque : un seul, ou un par segment quand le style est mixte. */
function stylesDeTexteDe(noeud: NoeudLu): string[] {
  if (typeof noeud.textStyleId === 'string') return noeud.textStyleId ? [noeud.textStyleId] : [];
  if (noeud.textStyleId === undefined || typeof noeud.getStyledTextSegments !== 'function') return [];
  const ids = noeud.getStyledTextSegments(['textStyleId']).map((segment) => segment.textStyleId).filter((id): id is string => typeof id === 'string' && id !== '');
  return [...new Set(ids)];
}

const peintureVisible = (peinture: unknown): peinture is Record<string, unknown> =>
  estUnObjet(peinture) && peinture.type === 'SOLID' && peinture.visible !== false && peinture.opacity !== 0 && estUnObjet(peinture.color);

function hexaDePeinture(peinture: Record<string, unknown>): string {
  const { r, g, b } = peinture.color as { r: number; g: number; b: number };
  return hexaDeCouleur({ r, g, b, a: estUnNombre(peinture.opacity) ? peinture.opacity : 1 }).hexa;
}

const RAYONS = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'] as const;
const EPAISSEURS = ['strokeWeight', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'];
const ESPACEMENTS = ['itemSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'] as const;

/**
 * Les valeurs du calque qu'aucune variable ne lie. Une valeur compte quand
 * aucune liaison ne couvre sa propriété sur ce calque.
 */
function valeursSansToken(noeud: NoeudLu, liaisons: ReadonlyArray<{ propriete: string }>, porteUnStyle: boolean): Array<{ propriete: string; valeur: string }> {
  const liees = new Set(liaisons.map((liaison) => liaison.propriete.replace(/^texte\[[^\]]*\]\./, '')));
  const liee = (...champs: readonly string[]): boolean => champs.some((champ) => liees.has(champ));
  const directes: Array<{ propriete: string; valeur: string }> = [];

  if (Array.isArray(noeud.fills)) {
    noeud.fills.forEach((peinture, rang) => {
      if (peintureVisible(peinture) && !liee(`fills[${rang}]`)) directes.push({ propriete: `fills[${rang}]`, valeur: hexaDePeinture(peinture) });
    });
  }
  const contours = Array.isArray(noeud.strokes) && noeud.strokeWeight !== 0 ? noeud.strokes : [];
  contours.forEach((peinture, rang) => {
    if (peintureVisible(peinture) && !liee(`strokes[${rang}]`)) directes.push({ propriete: `strokes[${rang}]`, valeur: hexaDePeinture(peinture) });
  });

  if (estUnNombre(noeud.cornerRadius)) {
    if (noeud.cornerRadius !== 0 && !liee('cornerRadius', ...RAYONS)) directes.push({ propriete: 'cornerRadius', valeur: String(noeud.cornerRadius) });
  } else {
    for (const coin of RAYONS) {
      const rayon = noeud[coin];
      if (estUnNombre(rayon) && rayon !== 0 && !liee(coin, 'cornerRadius')) directes.push({ propriete: coin, valeur: String(rayon) });
    }
  }
  if (estUnNombre(noeud.strokeWeight) && noeud.strokeWeight !== 0 && contours.some(peintureVisible) && !liee(...EPAISSEURS)) {
    directes.push({ propriete: 'strokeWeight', valeur: String(noeud.strokeWeight) });
  }
  if (typeof noeud.layoutMode === 'string' && noeud.layoutMode !== 'NONE') {
    for (const champ of ESPACEMENTS) {
      const valeur = noeud[champ];
      if (estUnNombre(valeur) && valeur !== 0 && !liee(champ)) directes.push({ propriete: champ, valeur: String(valeur) });
    }
  }
  if (noeud.type === 'TEXT' && !porteUnStyle && estUnNombre(noeud.fontSize) && !liee('fontSize')) directes.push({ propriete: 'fontSize', valeur: String(noeud.fontSize) });
  return directes;
}

/** Le sujet tel que la vue le nomme : nom, variant lu, et les variants de son jeu. */
async function identiteDuSujet(sujet: NoeudLu, racine: NoeudLu): Promise<LectureDeComposant['sujet']> {
  const jeu = sujet.type === 'COMPONENT_SET' ? sujet : estUnVariant(sujet) ? sujet.parent : null;
  if (jeu) {
    const variants = (jeu.children ?? []).filter((enfant) => enfant.type === 'COMPONENT').map((enfant) => ({ id: enfant.id, nom: enfant.name }));
    return { id: sujet.id, nom: jeu.name, type: sujet.type, variant: racine.name, variants };
  }
  let variant: string | null = null;
  if (sujet.type === 'INSTANCE') {
    try {
      const maitre = await sujet.getMainComponentAsync?.();
      if (maitre && estUnVariant(maitre)) variant = maitre.name;
    } catch {
      // Sans maître lisible, l'instance ne nomme aucun variant.
    }
  }
  return { id: sujet.id, nom: sujet.name, type: sujet.type, variant, variants: [] };
}

/**
 * Lit le composant qui contient `depart`. Une erreur sur un calque se range
 * dans `erreurs` et la lecture continue. Une annulation ne rend aucun
 * résultat partiel.
 */
export async function lireLeComposant(port: PortDuComposant, depart: NoeudLu, suivi: SuiviDeLecture, horloge: () => number = () => 0): Promise<IssueDuComposant> {
  const trouve = sujetDe(depart);
  if (!trouve) return { statut: 'sans-sujet' };
  const { sujet } = trouve;
  const racine = sujet.type === 'COMPONENT_SET' ? sujet.defaultVariant ?? (sujet.children ?? []).find((enfant) => enfant.type === 'COMPONENT') : sujet;
  if (!racine) return { statut: 'sans-sujet' };

  const erreurs: Array<{ calque: string; message: string }> = [];

  // Le parcours s'arrête à chaque instance : ses calques appartiennent à un autre composant.
  const noeuds: Array<{ noeud: NoeudLu; parent: string | null; frontiere: boolean }> = [];
  const aVisiter: Array<{ noeud: NoeudLu; parent: string | null }> = [{ noeud: racine, parent: null }];
  while (aVisiter.length > 0) {
    const { noeud, parent } = aVisiter.pop() as { noeud: NoeudLu; parent: string | null };
    const frontiere = noeud.type === 'INSTANCE' && noeud.id !== racine.id;
    noeuds.push({ noeud, parent, frontiere });
    if (noeuds.length % LOT === 0) {
      if (suivi.annulee()) return { statut: 'annule' };
      await port.pause();
    }
    if (frontiere) continue;
    try {
      const enfants = noeud.children ?? [];
      for (let rang = enfants.length - 1; rang >= 0; rang -= 1) aVisiter.push({ noeud: enfants[rang], parent: noeud.id });
    } catch (erreur) {
      erreurs.push({ calque: noeud.id, message: messageDErreur(erreur) });
    }
  }

  const calques: CalqueDuComposant[] = [];
  const liaisons: Array<{ calque: string; propriete: string; variable: string }> = [];
  const porteurs: NoeudLu[] = [];
  const styles = new Map<string, StyleDeTexte | null>();
  const usagesDeStyle: Array<{ calque: string; style: string }> = [];
  const directes: Array<{ calque: string; propriete: string; valeur: string }> = [];

  const lireLeStyle = async (id: string): Promise<StyleDeTexte | null> => {
    if (styles.has(id)) return styles.get(id) ?? null;
    let lu: StyleDeTexte | null = null;
    try {
      const style = await port.getStyleByIdAsync(id);
      if (style) lu = { id, nom: style.name, liaisons: liaisonsDuStyle(style).map(({ propriete, variable }) => ({ champ: propriete, variable })) };
    } catch {
      lu = null;
    }
    styles.set(id, lu);
    return lu;
  };

  const lus = noeuds.slice(0, BORNE_DES_CALQUES);
  for (let rang = 0; rang < lus.length; rang += 1) {
    if (rang % LOT === 0) {
      if (suivi.annulee()) return { statut: 'annule' };
      await port.pause();
    }
    const { noeud, parent, frontiere } = lus[rang];
    let calque: CalqueDuComposant = { id: noeud.id, nom: noeud.name, type: noeud.type, parent, modes: {} };
    try {
      const boite = boiteDe(noeud);
      calque = { ...calque, modes: modesDuNoeud(noeud), ...(boite ? { boite } : {}) };
      if (frontiere) {
        calque = { ...calque, frontiere: { composant: await nomDuMaitre(noeud) } };
        for (const liaison of await liaisonsDesSurcharges(port, noeud)) {
          liaisons.push({ calque: noeud.id, propriete: liaison.propriete, variable: liaison.variable });
          porteurs.push(liaison.porteur);
        }
      } else {
        let duCalque = liaisonsDuNoeud(noeud);
        let porteUnStyle = false;
        if (noeud.type === 'TEXT') {
          for (const id of stylesDeTexteDe(noeud)) {
            const style = await lireLeStyle(id);
            if (!style) continue;
            porteUnStyle = true;
            usagesDeStyle.push({ calque: noeud.id, style: id });
            // Le style porte déjà ces variables : le calque ne les redit pas.
            duCalque = duCalque.filter((liaison) => !style.liaisons.some((duStyle) => duStyle.variable === liaison.variable && duStyle.champ === champDe(liaison.propriete).champ));
          }
        }
        for (const liaison of duCalque) {
          liaisons.push({ calque: noeud.id, ...liaison });
          porteurs.push(noeud);
        }
        for (const directe of valeursSansToken(noeud, duCalque, porteUnStyle)) directes.push({ calque: noeud.id, ...directe });
      }
    } catch (erreur) {
      erreurs.push({ calque: noeud.id, message: messageDErreur(erreur) });
    }
    calques.push(calque);
  }

  const stylesLus = [...styles.values()].filter((style): style is StyleDeTexte => style !== null);
  const departs = [...new Set([...liaisons.map((liaison) => liaison.variable), ...stylesLus.flatMap((style) => style.liaisons.map((liaison) => liaison.variable))])];

  // Les variables de départ sont gardées telles que Figma les rend : `resolveForConsumer` se lit sur elles.
  const brutes = new Map<string, VariableFigma>();
  const lues = await lireLesVariables(port.variables, departs, suivi, { auDepart: (id, variable) => brutes.set(id, variable) });
  if (!lues || suivi.annulee()) return { statut: 'annule' };
  const table = separerLesModes(lues.collections, lues.variables);

  const liaisonsLues: LiaisonDuComposant[] = liaisons.map((liaison, rang) => {
    try {
      const brute = brutes.get(liaison.variable);
      if (!brute || typeof brute.resolveForConsumer !== 'function') return liaison;
      return { ...liaison, valeurDeFigma: convertirValeur(brute.resolveForConsumer(porteurs[rang] as never).value) };
    } catch {
      return liaison;
    }
  });

  const variables = [...lues.variables.values()];
  const collections = [...lues.collections.values()].map((collection) => ({ ...collection, variables: collection.variables.filter((id) => lues.variables.has(id)) }));
  const lecture: LectureDeComposant = {
    sujet: await identiteDuSujet(sujet, racine),
    ancetres: trouve.ancetres.map((ancetre) => ({ id: ancetre.id, nom: nomDeSujet(ancetre) })),
    calques: calques.map((calque) => ({ ...calque, modes: traduireLesModes(table, calque.modes) })),
    liaisons: liaisonsLues,
    styles: stylesLus,
    usagesDeStyle,
    directes,
    releve: {
      format: FORMAT_DU_RELEVE,
      revision: 0,
      fichier: '',
      luA: horloge(),
      collections,
      variables,
      manquees: [...lues.manquees.values()],
      capacites: { collectionsEtendues: collections.some((collection) => collection.extension !== null), variablesDistantes: variables.some((variable) => variable.distante) },
    },
    calquesNonLus: noeuds.length - lus.length,
    erreurs,
  };
  return { statut: 'lu', lecture };
}

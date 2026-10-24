/**
 * Écrit les corrections de sorte `liaison` : lier un champ, une peinture ou une
 * plage de texte d'un layer à une variable, et pose le point d'annulation d'un
 * lot.
 *
 * Le fichier doit toujours déclarer UCM, relu une fois au début du lot, sinon
 * rien n'est écrit (`non-ucm`). Chaque correction relit ensuite ce que
 * l'analyse avait lu : le layer existe (`objet-change`), les valeurs de son
 * variant sont celles de `aRelire.axes` (`objet-change`), la liaison du champ
 * porte le nom de `aRelire.avant` (`fait-faux`), un champ numérique garde la
 * valeur de `aRelire.valeur` quand elle est donnée (`fait-faux`), la peinture
 * de l'indice existe (`objet-change`) et est unie (`fait-faux`), la variable
 * cible se trouve (`cible-introuvable`). Une écriture de Figma qui lève saute la correction
 * (`erreur`) ; les autres s'écrivent.
 *
 * La variable cible se cherche d'abord parmi les variables locales, puis
 * s'importe par sa clé (`importVariableByKeyAsync`) : une fois par clé et par
 * lot. Seul ce fichier importe une variable pendant une écriture.
 *
 * `ecrireLesLiaisons` ne pose aucun point d'annulation ; `ecrireLeLot` en pose un
 * seul, après les liaisons et les règles, pour qu'un Ctrl+Z défasse le lot.
 */
import type { Correction } from '@ucm-kit/core/controles';
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, lireLArchitectureDuFichier } from '@ucm-kit/core/referentiel';
import type { Annonce } from 'ucm-plugin-socle/src/composant/annonce';
import type { ModeleDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';

import { ecrireLesNomsDeValeurs, type ApiDeNomsDeValeurs } from './noms-de-valeurs';
import { ecrireLesRegles } from './regles';
import type { PortDEcritureDesRegles, ReglesSautees } from './regles';

export type MotifDeLiaisonSaute = 'objet-change' | 'fait-faux' | 'cible-introuvable' | 'erreur' | 'non-ucm';

export interface LiaisonSautee { readonly id: string; readonly motif: MotifDeLiaisonSaute }

export interface ResultatDEcritureDesLiaisons {
  /** Les identifiants des corrections écrites. */
  readonly ecrites: string[];
  readonly sautees: LiaisonSautee[];
}

/** Un layer tel que l'écriture le lit et l'écrit. Les champs numériques se lisent par leur nom. */
export interface LayerEcrivable {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly parent: LayerEcrivable | null;
  readonly removed?: boolean;
  readonly boundVariables?: unknown;
  fills?: unknown;
  strokes?: unknown;
  setBoundVariable?(champ: string, variable: unknown): void;
  getStyledTextSegments?(champs: string[]): ReadonlyArray<{ start: number; end: number; fills?: unknown }>;
  setRangeFills?(debut: number, fin: number, peintures: unknown[]): void;
}

/** Ce que l'écriture demande à Figma : les doubles des tests le remplacent. */
export interface ApiDeLiaisons {
  readonly root: { getSharedPluginData(espace: string, cle: string): string };
  getNodeByIdAsync(id: string): Promise<LayerEcrivable | null>;
  readonly variables: {
    getVariableByIdAsync(id: string): Promise<{ readonly name: string } | null>;
    getLocalVariablesAsync(): Promise<ReadonlyArray<{ readonly key: string }>>;
    importVariableByKeyAsync(cle: string): Promise<object>;
    setBoundVariableForPaint(peinture: unknown, champ: 'color', variable: object): unknown;
  };
  commitUndo(): void;
}

const estUnObjet = (valeur: unknown): valeur is Record<string, unknown> => typeof valeur === 'object' && valeur !== null;
const apiDeFigma = (): ApiDeLiaisons => figma as unknown as ApiDeLiaisons;

/** Les valeurs du variant qui porte le layer : `variantProperties`, sinon son nom `Propriété=Valeur, …`. `null` hors de tout variant. */
function valeursDuVariant(layer: LayerEcrivable): Record<string, string> | null {
  for (let courant: LayerEcrivable | null = layer; courant; courant = courant.parent) {
    if (courant.type !== 'COMPONENT' || courant.parent?.type !== 'COMPONENT_SET') continue;
    const propres = (courant as unknown as { variantProperties?: unknown }).variantProperties;
    if (estUnObjet(propres)) return Object.fromEntries(Object.entries(propres).map(([nom, valeur]) => [nom, String(valeur)]));
    return Object.fromEntries(courant.name.split(',').flatMap((morceau) => {
      const coupe = morceau.indexOf('=');
      return coupe < 0 ? [] : [[morceau.slice(0, coupe).trim(), morceau.slice(coupe + 1).trim()]];
    }));
  }
  return null;
}

function axesEgaux(axes: Readonly<Record<string, string>>, valeurs: Record<string, string> | null): boolean {
  if (valeurs === null) return Object.keys(axes).length === 0;
  const cles = Object.keys(axes);
  return cles.length === Object.keys(valeurs).length && cles.every((cle) => valeurs[cle] === axes[cle]);
}

/** Le nom de la variable que lie `alias` ; `null` sans liaison, `undefined` quand la variable liée ne se lit pas. */
async function nomLie(api: ApiDeLiaisons, alias: unknown): Promise<string | null | undefined> {
  if (!estUnObjet(alias) || alias.type !== 'VARIABLE_ALIAS' || typeof alias.id !== 'string') return null;
  try {
    return (await api.variables.getVariableByIdAsync(alias.id))?.name;
  } catch {
    return undefined;
  }
}

/** Ce qu'une correction cible, relu dans le document : une valeur numérique, une peinture ou une plage de texte. */
type Cible =
  | { readonly genre: 'nombre'; readonly champ: string; readonly valeur: number; readonly liaison: unknown }
  | { readonly genre: 'peinture'; readonly champ: 'fills' | 'strokes'; readonly indice: number; readonly peintures: unknown[]; readonly liaison: unknown }
  | { readonly genre: 'texte'; readonly debut: number; readonly fin: number; readonly indice: number; readonly peintures: unknown[]; readonly liaison: unknown };

type Lecture = { readonly cible: Cible } | { readonly saute: 'objet-change' | 'fait-faux' };

const liaisonDeLaPeinture = (peinture: unknown): unknown => (estUnObjet(peinture) && estUnObjet(peinture.boundVariables) ? peinture.boundVariables.color : undefined);

function lireLaCible(layer: LayerEcrivable, cible: Correction['cible']): Lecture {
  const champ = cible.champ ?? '';
  if (cible.plage) {
    if (layer.type !== 'TEXT' || !layer.getStyledTextSegments) return { saute: 'objet-change' };
    const { debut, fin } = cible.plage;
    const segment = layer.getStyledTextSegments(['fills']).find((lu) => lu.start === debut && lu.end === fin);
    if (!segment) return { saute: 'objet-change' };
    const indice = cible.indice ?? 0;
    if (champ !== 'fills' || !Array.isArray(segment.fills)) return { saute: 'fait-faux' };
    const peinture = segment.fills[indice];
    if (peinture === undefined) return { saute: 'objet-change' };
    if (!estUnObjet(peinture) || peinture.type !== 'SOLID') return { saute: 'fait-faux' };
    return { cible: { genre: 'texte', debut, fin, indice, peintures: [...segment.fills], liaison: liaisonDeLaPeinture(peinture) } };
  }
  if (champ === 'fills' || champ === 'strokes') {
    const liste = layer[champ];
    if (cible.indice === undefined || !Array.isArray(liste)) return { saute: 'fait-faux' };
    const peinture = liste[cible.indice];
    if (peinture === undefined) return { saute: 'objet-change' };
    if (!estUnObjet(peinture) || peinture.type !== 'SOLID') return { saute: 'fait-faux' };
    return { cible: { genre: 'peinture', champ, indice: cible.indice, peintures: [...liste], liaison: liaisonDeLaPeinture(peinture) } };
  }
  const valeur = (layer as unknown as Record<string, unknown>)[champ];
  if (typeof valeur !== 'number') return { saute: 'fait-faux' };
  return { cible: { genre: 'nombre', champ, valeur, liaison: estUnObjet(layer.boundVariables) ? layer.boundVariables[champ] : undefined } };
}

/** Le layer et la cible relus, ou le motif de l'écart entre la correction et le document. */
async function relire(api: ApiDeLiaisons, correction: Correction): Promise<{ layer: LayerEcrivable; cible: Cible } | MotifDeLiaisonSaute> {
  const identifiant = correction.cible.layer;
  const layer = identifiant ? await api.getNodeByIdAsync(identifiant).catch(() => null) : null;
  if (!layer || layer.removed) return 'objet-change';
  const { axes } = correction.aRelire;
  if (axes && !axesEgaux(axes, valeursDuVariant(layer))) return 'objet-change';
  const lue = lireLaCible(layer, correction.cible);
  if ('saute' in lue) return lue.saute;
  // La valeur que l'analyse a lue a changé : lier un token choisi pour elle changerait un autre rendu.
  if (lue.cible.genre === 'nombre' && correction.aRelire.valeur !== undefined && lue.cible.valeur !== correction.aRelire.valeur) return 'fait-faux';
  if ((await nomLie(api, lue.cible.liaison)) !== correction.aRelire.avant) return 'fait-faux';
  return { layer, cible: lue.cible };
}

/**
 * Applique les corrections de sorte `liaison`, une à la fois, sans point
 * d'annulation. Les autres sortes sont ignorées.
 */
export async function ecrireLesLiaisons(corrections: readonly Correction[], api: ApiDeLiaisons = apiDeFigma()): Promise<ResultatDEcritureDesLiaisons> {
  const ecrites: string[] = [];
  const sautees: LiaisonSautee[] = [];
  const aEcrire = corrections.filter((correction) => correction.sorte === 'liaison');
  if (aEcrire.length === 0) return { ecrites, sautees };
  if (lireLArchitectureDuFichier(api.root.getSharedPluginData(ESPACE_ARCHITECT, CLE_ARCHITECTURE_DU_FICHIER)) !== 'ucm') {
    return { ecrites, sautees: aEcrire.map(({ id }) => ({ id, motif: 'non-ucm' })) };
  }

  let locales: Promise<ReadonlyArray<{ readonly key: string }>> | null = null;
  const cibles = new Map<string, Promise<object | null>>();
  const chercher = async (cle: string): Promise<object | null> => {
    try {
      locales ??= api.variables.getLocalVariablesAsync();
      const locale = (await locales).find((variable) => variable.key === cle);
      return locale ?? (await api.variables.importVariableByKeyAsync(cle));
    } catch {
      return null;
    }
  };

  for (const correction of aEcrire) {
    const saute = (motif: MotifDeLiaisonSaute): void => { sautees.push({ id: correction.id, motif }); };
    try {
      const relu = await relire(api, correction);
      if (typeof relu === 'string') { saute(relu); continue; }
      const cle = correction.apres.cle;
      if (!cle) { saute('cible-introuvable'); continue; }
      if (!cibles.has(cle)) cibles.set(cle, chercher(cle));
      const variable = await cibles.get(cle);
      if (!variable) { saute('cible-introuvable'); continue; }
      ecrire(api, relu.layer, relu.cible, variable);
      ecrites.push(correction.id);
    } catch {
      saute('erreur');
    }
  }
  return { ecrites, sautees };
}

function ecrire(api: ApiDeLiaisons, layer: LayerEcrivable, cible: Cible, variable: object): void {
  if (cible.genre === 'nombre') {
    if (!layer.setBoundVariable) throw new Error('Ce layer ne se lie pas à une variable.');
    layer.setBoundVariable(cible.champ, variable);
    return;
  }
  const copie = [...cible.peintures];
  copie[cible.indice] = api.variables.setBoundVariableForPaint(cible.peintures[cible.indice], 'color', variable);
  if (cible.genre === 'texte') {
    if (!layer.setRangeFills) throw new Error('Ce layer ne lie pas une plage de texte.');
    layer.setRangeFills(cible.debut, cible.fin, copie);
  } else if (cible.champ === 'fills') {
    layer.fills = copie;
  } else {
    layer.strokes = copie;
  }
}

/** Le résultat d'un lot : liaisons et règles ensemble. */
export interface ResultatDUnLot {
  readonly ecrites: string[];
  readonly sautees: ReadonlyArray<LiaisonSautee | ReglesSautees>;
}

/** Ce que le lot reçoit en plus des corrections : de quoi écrire les règles. */
export interface OptionsDuLot {
  readonly annoncer?: Annonce;
  readonly modeles?: ReadonlyMap<string, ModeleDeRegles>;
  readonly portDeRegles?: PortDEcritureDesRegles;
}

/**
 * Écrit les corrections de sorte `liaison`, `regles` puis `nom-de-valeur`, et
 * pose un seul point d'annulation après toutes les écritures. Sans écriture,
 * aucun point. Les noms de valeurs passent en dernier : une liaison relit les
 * valeurs du variant, que le renommage change.
 */
export async function ecrireLeLot(corrections: readonly Correction[], options: OptionsDuLot = {}, api: ApiDeLiaisons = apiDeFigma()): Promise<ResultatDUnLot> {
  // Hors UCM, Architect ne fait que naviguer : ni liaison, ni instance de règles.
  if (lireLArchitectureDuFichier(api.root.getSharedPluginData(ESPACE_ARCHITECT, CLE_ARCHITECTURE_DU_FICHIER)) !== 'ucm') {
    const visees = corrections.filter((correction) => correction.sorte === 'liaison' || correction.sorte === 'regles' || correction.sorte === 'nom-de-valeur');
    return { ecrites: [], sautees: visees.map(({ id }) => ({ id, motif: 'non-ucm' as const })) };
  }
  const liaisons = await ecrireLesLiaisons(corrections, api);
  const regles = await ecrireLesRegles(corrections, options.annoncer, options.modeles, options.portDeRegles);
  const noms = await ecrireLesNomsDeValeurs(corrections, api as unknown as ApiDeNomsDeValeurs);
  const ecrites = [...liaisons.ecrites, ...regles.ecrites, ...noms.ecrites];
  if (ecrites.length > 0) {
    try {
      api.commitUndo();
    } catch {
      // Les écritures sont faites : un point d'annulation refusé ne les retire pas.
    }
  }
  return { ecrites, sautees: [...liaisons.sautees, ...regles.sautees, ...noms.sautees] };
}

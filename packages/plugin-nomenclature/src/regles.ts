/**
 * Les règles du fichier : une entrée de données partagées par règle, sans dépendance à Figma.
 *
 * Les clés vivent dans l'espace `ESPACE_ARCHITECT` du kit. Une entrée est un JSON qui porte `version: 1` ;
 * une entrée illisible ou d'une autre version se lit comme absente, et une lecture ne réécrit rien.
 * Toute écriture sort sous forme d'`Ecriture` (`texte: null` efface la clé) : la session les range par le port d'`ecriture.ts`.
 */
import { COLLECTIONS, ESPACE_ARCHITECT, type Collection, type ConflitDeVocabulaire, type DejaJuge, type Mots, type TermePersonnalise, type VocabulaireDuFichier } from '@ucm-kit/core/referentiel';
import { estConventions, lireChoix } from './conventions';
import type { EcritureChoisie } from './messages';

export const VERSION_DES_REGLES = 1;
export const CLE_ECRITURE = 'ecriture';
export const CLE_EXCLUES = 'exclues';
export const CLE_VUS = 'vus';
/** Clé de la convention de la v1, lue seulement quand `ecriture` manque. */
export const CLE_CONVENTIONS_V1 = 'conventions';
/** Clé de la référence du journal : elle nomme le lot courant et le nombre de ses entrées. */
export const CLE_JOURNAL = 'journal';
/** Clé du dernier import qui a écrasé l'écriture ou un terme ; elle ne répond à aucune question. */
export const CLE_IMPORT = 'reponse:import';
/** Figma limite une entrée à 100 ko : espace, clé et valeur comptés en octets UTF-8. */
const LIMITE_D_UNE_ENTREE = 100_000;
const MARGE_D_UNE_ENTREE = 1_000;
const ENTREE_ANCIENNE = /^journal:\d+$/u;
const ENTREE_DU_LOT = /^journal:[^:]+:\d+$/u;

export interface Ecriture { readonly cle: string; readonly texte: string | null }

export interface RenommageJournal {
  readonly type: 'variable' | 'collection';
  readonly id: string;
  readonly ancienNom: string;
  readonly nouveauNom: string;
}
export interface Journal { readonly heure: string; readonly renommages: readonly RenommageJournal[] }
/** Les entrées qu'une réponse a créées ou changées, avec leur texte d'avant (`null` : l'entrée n'existait pas). */
export interface ReponseRangee {
  readonly avant: Readonly<Record<string, string | null>>;
  /** Le texte que la réponse a écrit par clé ; absent des réponses rangées avant son ajout. */
  readonly apres?: Readonly<Record<string, string | null>>;
}
/** Un import qui a écrasé l'écriture ou un terme : `avant` et `apres` valent pour chaque clé qu'il a changée. */
export interface ImportRange { readonly heure: string; readonly avant: Readonly<Record<string, string | null>>; readonly apres: Readonly<Record<string, string | null>> }

export interface ReglesDuFichier {
  readonly ecriture?: EcritureChoisie;
  /** Vrai quand `ecriture` vient de la clé `conventions` de la v1 et n'est pas encore rangée. */
  readonly ecritureDeLaV1: boolean;
  readonly termes: readonly TermePersonnalise[];
  readonly ecartsUcm: readonly string[];
  readonly distincts: readonly (readonly [string, string])[];
  readonly voulus: readonly string[];
  /** Les termes (mots en minuscules joints par `-`) que le fichier traite comme des mots ordinaires, jamais comme des noms. */
  readonly ordinaires: readonly string[];
  readonly plusTard: readonly string[];
  /** Collections dont le designer garde le nom. */
  readonly collectionsGardees: readonly string[];
  /** Identifiant de la collection vers la collection UCM qu'elle prend pour nom ; propre au fichier, comme `collectionsGardees`. */
  readonly collectionsRenommees: Readonly<Record<string, Collection>>;
  readonly collectionsExclues: readonly string[];
  readonly reponses: Readonly<Record<string, ReponseRangee>>;
  readonly vus: readonly string[];
  readonly journal?: Journal;
  readonly dernierImport?: ImportRange;
}

export type Regle =
  | { readonly type: 'ecriture'; readonly ecriture: EcritureChoisie }
  | { readonly type: 'terme'; readonly terme: TermePersonnalise }
  | { readonly type: 'ecart'; readonly id: string }
  | { readonly type: 'distinct'; readonly termes: readonly [string, string] }
  | { readonly type: 'voulu'; readonly mots: Mots }
  | { readonly type: 'ordinaire'; readonly cle: string }
  | { readonly type: 'plus-tard'; readonly cle: string }
  | { readonly type: 'collection'; readonly id: string; readonly cible?: Collection }
  | { readonly type: 'exclues'; readonly ids: readonly string[] }
  | { readonly type: 'vus'; readonly groupes: readonly string[] };

const comparer = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const trier = (liste: readonly string[]): string[] => [...new Set(liste)].sort(comparer);
const estTexte = (valeur: unknown): valeur is string => typeof valeur === 'string' && valeur.length > 0;
/** Un mot de terme refuse les espaces et les caractères qui séparent un chemin, une paire ou une clé : / | . { } $. */
export const estMot = (valeur: unknown): valeur is string => estTexte(valeur) && !/[\s/|.{}$]/u.test(valeur);
const estMots = (valeur: unknown): valeur is Mots => Array.isArray(valeur) && valeur.length > 0 && valeur.every(estMot);
const estListeDeTextes = (valeur: unknown): valeur is string[] => Array.isArray(valeur) && valeur.every(estTexte);
const estObjet = (valeur: unknown): valeur is Record<string, unknown> => !!valeur && typeof valeur === 'object' && !Array.isArray(valeur);

// Les clés

export const cleTerme = (mots: Mots): string => `terme:${mots.join(' ')}`;
export const cleEcart = (id: string): string => `ecart:${id}`;
/** Une paire distincte s'écrit dans l'ordre trié. */
export const cleDistinct = (a: string, b: string): string => a <= b ? `distinct:${a}|${b}` : `distinct:${b}|${a}`;
export const cleVoulu = (mots: Mots): string => `voulu:${mots.join(' ')}`;
/** La clé d'un terme ordinaire joint ses mots par `-`, comme `ordinaires` du lexique. */
export const cleDuTermeOrdinaire = (mots: Mots): string => mots.map((mot) => mot.toLowerCase()).join('-');
export const cleOrdinaire = (cle: string): string => `ordinaire:${cle}`;
/** Les questions d'échelle ont quitté le plugin : leur clé déjà rangée n'est plus lue, pour ne compter ni parmi les mises de côté ni dans le plafond. */
const PREFIXE_RETIRE = 'echelle:';
export const clePlusTard = (cle: string): string => `plus-tard:${cle}`;
export const cleCollection = (id: string): string => `collection:${id}`;
export const cleReponse = (cle: string): string => `reponse:${cle}`;
/** Entrée d'un lot du journal. */
export const cleJournal = (lot: string, rang: number): string => `journal:${lot}:${rang}`;
/** Entrée de l'ancienne forme, dont la tête `journal:0` porte l'heure et le nombre d'entrées. */
export const cleJournalAncienne = (rang: number): string => `journal:${rang}`;
export const estCleDuJournal = (cle: string): boolean => cle === CLE_JOURNAL || ENTREE_ANCIENNE.test(cle) || ENTREE_DU_LOT.test(cle);

/**
 * Le nombre d'octets UTF-8 d'un texte. `TextEncoder` n'est pas garanti dans le bac à sable de Figma.
 * Une paire de substituts compte 4 octets ; un substitut isolé, 3.
 */
export function octetsUtf8(texte: string): number {
  let octets = 0;
  for (let i = 0; i < texte.length; i++) {
    const code = texte.charCodeAt(i);
    if (code < 0x80) octets += 1;
    else if (code < 0x800) octets += 2;
    else if (code >= 0xd800 && code < 0xdc00 && i + 1 < texte.length && (texte.charCodeAt(i + 1) & 0xfc00) === 0xdc00) { octets += 4; i++; }
    else octets += 3;
  }
  return octets;
}

function apres(cle: string, prefixe: string): string | undefined {
  return cle.startsWith(prefixe) && cle.length > prefixe.length ? cle.slice(prefixe.length) : undefined;
}
function motsDe(texte: string): Mots | undefined {
  const mots = texte.split(' ');
  return estMots(mots) ? mots : undefined;
}

// La lecture

/** Un JSON objet portant `version: 1`, sinon rien. */
function lireEntree(texte: string): Record<string, unknown> | undefined {
  if (!texte) return undefined;
  try {
    const brut: unknown = JSON.parse(texte);
    return estObjet(brut) && brut.version === VERSION_DES_REGLES ? brut : undefined;
  } catch { return undefined; }
}

function lireEcriture(brut: Record<string, unknown>): EcritureChoisie | undefined {
  const { groupes, variables } = brut;
  return estConventions({ groupes }) && estConventions({ variables }) ? { groupes, variables } as EcritureChoisie : undefined;
}

function lireTerme(mots: Mots, brut: Record<string, unknown>): TermePersonnalise | undefined {
  if (!estMots(brut.terme) || brut.terme.join(' ') !== mots.join(' ')) return undefined;
  if (!Array.isArray(brut.remplace) || !brut.remplace.every(estMots)) return undefined;
  if (brut.definition !== undefined && typeof brut.definition !== 'string') return undefined;
  return { terme: mots, remplace: brut.remplace, ...(brut.definition ? { definition: brut.definition } : {}) };
}

function lireAvant(brut: unknown): Record<string, string | null> | undefined {
  if (!estObjet(brut)) return undefined;
  const sortie: Record<string, string | null> = {};
  for (const [cle, texte] of Object.entries(brut)) {
    if (texte !== null && typeof texte !== 'string') return undefined;
    sortie[cle] = texte;
  }
  return sortie;
}

function lireImport(brut: Record<string, unknown>): ImportRange | undefined {
  const avant = lireAvant(brut.avant), ecrit = lireAvant(brut.apres);
  return avant && ecrit && typeof brut.heure === 'string' ? { heure: brut.heure, avant, apres: ecrit } : undefined;
}

function lireRenommages(brut: unknown): RenommageJournal[] | undefined {
  if (!Array.isArray(brut)) return undefined;
  const sortie: RenommageJournal[] = [];
  for (const item of brut) {
    if (!estObjet(item) || (item.type !== 'variable' && item.type !== 'collection') || !estTexte(item.id)
      || typeof item.ancienNom !== 'string' || typeof item.nouveauNom !== 'string') return undefined;
    sortie.push({ type: item.type, id: item.id, ancienNom: item.ancienNom, nouveauNom: item.nouveauNom });
  }
  return sortie;
}

/**
 * Le journal n'est lu que complet. La référence `journal` nomme le lot ; chaque entrée du lot porte ce lot et son rang.
 * Une entrée manquante, illisible ou d'un autre lot rend le journal illisible, et la lecture ne l'efface pas.
 * Sans référence, la forme ancienne `journal:<n>` (tête en `journal:0`) reste lue.
 */
function lireJournal(entrees: ReadonlyMap<string, string>): Journal | undefined {
  if (entrees.get(CLE_JOURNAL)) return lireJournalDuLot(entrees);
  const tete = lireEntree(entrees.get(cleJournalAncienne(0)) ?? '');
  if (!tete || !Number.isInteger(tete.morceaux) || (tete.morceaux as number) < 1 || typeof tete.heure !== 'string') return undefined;
  const renommages: RenommageJournal[] = [];
  for (let rang = 0; rang < (tete.morceaux as number); rang++) {
    const morceau = rang === 0 ? tete : lireEntree(entrees.get(cleJournalAncienne(rang)) ?? '');
    const lus = morceau && lireRenommages(morceau.renommages);
    if (!lus) return undefined;
    renommages.push(...lus);
  }
  return { heure: tete.heure, renommages };
}

function lireJournalDuLot(entrees: ReadonlyMap<string, string>): Journal | undefined {
  const reference = lireEntree(entrees.get(CLE_JOURNAL) ?? '');
  if (!reference || typeof reference.lot !== 'string' || !reference.lot || reference.lot.includes(':')
    || !Number.isInteger(reference.morceaux) || (reference.morceaux as number) < 1 || typeof reference.heure !== 'string') return undefined;
  const renommages: RenommageJournal[] = [];
  for (let rang = 0; rang < (reference.morceaux as number); rang++) {
    const entree = lireEntree(entrees.get(cleJournal(reference.lot, rang)) ?? '');
    const lus = entree && entree.lot === reference.lot && entree.rang === rang && lireRenommages(entree.renommages);
    if (!lus) return undefined;
    renommages.push(...lus);
  }
  return { heure: reference.heure, renommages };
}

/** Lit toutes les règles depuis les couples (clé, texte) de l'espace ; les clés inconnues sont ignorées. */
export function lireLesRegles(couples: Iterable<readonly [string, string]>): ReglesDuFichier {
  const entrees = new Map(couples);
  let ecriture: EcritureChoisie | undefined;
  const termes: TermePersonnalise[] = [];
  const ecartsUcm: string[] = [];
  const distincts = new Map<string, readonly [string, string]>();
  const voulus: string[] = [];
  const ordinaires: string[] = [];
  const plusTard: string[] = [];
  const gardees: string[] = [];
  const renommees: Record<string, Collection> = {};
  let exclues: string[] = [];
  const reponses: Record<string, ReponseRangee> = {};
  let vus: string[] = [];
  let dernierImport: ImportRange | undefined;
  for (const [cle, texte] of entrees) {
    const brut = lireEntree(texte);
    if (!brut) continue;
    let reste: string | undefined;
    if (cle === CLE_ECRITURE) ecriture = lireEcriture(brut);
    else if (cle === CLE_EXCLUES) { if (estListeDeTextes(brut.ids)) exclues = trier(brut.ids); }
    else if (cle === CLE_VUS) { if (estListeDeTextes(brut.groupes)) vus = trier(brut.groupes); }
    else if ((reste = apres(cle, 'terme:')) !== undefined) {
      const mots = motsDe(reste);
      const terme = mots && lireTerme(mots, brut);
      if (terme) termes.push(terme);
    } else if ((reste = apres(cle, 'ecart:')) !== undefined) ecartsUcm.push(reste);
    else if ((reste = apres(cle, 'distinct:')) !== undefined) {
      const [a, b, ...autres] = reste.split('|');
      if (estTexte(a) && estTexte(b) && autres.length === 0 && a !== b) {
        const paire: readonly [string, string] = a < b ? [a, b] : [b, a];
        distincts.set(paire.join('|'), paire);
      }
    } else if ((reste = apres(cle, 'voulu:')) !== undefined) { if (motsDe(reste)) voulus.push(reste); }
    else if ((reste = apres(cle, 'ordinaire:')) !== undefined) { if (estMot(reste)) ordinaires.push(reste); }
    else if ((reste = apres(cle, 'plus-tard:')) !== undefined) { if (!reste.startsWith(PREFIXE_RETIRE)) plusTard.push(reste); }
    else if ((reste = apres(cle, 'collection:')) !== undefined) {
      const cible = (COLLECTIONS as readonly unknown[]).includes(brut.cible) ? brut.cible as Collection : undefined;
      if (cible) renommees[reste] = cible;
      else gardees.push(reste);
    }
    else if (cle === CLE_IMPORT) dernierImport = lireImport(brut);
    else if ((reste = apres(cle, 'reponse:')) !== undefined) {
      const avant = lireAvant(brut.avant);
      const ecrit = brut.apres === undefined ? undefined : lireAvant(brut.apres);
      if (avant && (brut.apres === undefined || ecrit)) reponses[reste] = { avant, ...(ecrit ? { apres: ecrit } : {}) };
    }
  }
  const v1 = ecriture ? undefined : lireChoix(entrees.get(CLE_CONVENTIONS_V1) ?? '');
  const reprise: EcritureChoisie | undefined = v1?.conventions.groupes && v1.conventions.variables
    ? { groupes: v1.conventions.groupes, variables: v1.conventions.variables } : undefined;
  const journal = lireJournal(entrees);
  return {
    ...(ecriture ?? reprise ? { ecriture: ecriture ?? reprise } : {}),
    ecritureDeLaV1: !ecriture && !!reprise,
    termes: termes.sort((a, b) => comparer(a.terme.join(' '), b.terme.join(' '))),
    ecartsUcm: trier(ecartsUcm),
    distincts: [...distincts.values()].sort((a, b) => comparer(a.join('|'), b.join('|'))),
    voulus: trier(voulus),
    ordinaires: trier(ordinaires),
    plusTard: trier(plusTard),
    collectionsGardees: trier(gardees),
    collectionsRenommees: Object.fromEntries(Object.entries(renommees).sort(([a], [b]) => comparer(a, b))),
    collectionsExclues: exclues,
    reponses,
    vus,
    ...(journal ? { journal } : {}),
    ...(dernierImport ? { dernierImport } : {}),
  };
}

export const reglesVides: ReglesDuFichier = lireLesRegles([]);

/** Le vocabulaire que `indexerVocabulaire` du kit reçoit. */
export function vocabulaireDuFichier(regles: Pick<ReglesDuFichier, 'termes' | 'ecartsUcm'>): VocabulaireDuFichier {
  return { personnalises: regles.termes, ecartsUcm: regles.ecartsUcm };
}

/** Ce que les détecteurs de questions de `detecterParEtapes` ne reposent pas. */
export function dejaJugeDuFichier(regles: Pick<ReglesDuFichier, 'distincts' | 'plusTard' | 'voulus' | 'collectionsGardees' | 'collectionsRenommees'>): DejaJuge {
  return {
    distincts: regles.distincts, plusTard: regles.plusTard, voulus: regles.voulus,
    collectionsGardees: trier([...regles.collectionsGardees, ...Object.keys(regles.collectionsRenommees)]),
  };
}

// La sérialisation

/** Une règle devient son entrée. */
export function serialiserRegle(regle: Regle): Ecriture {
  const v = VERSION_DES_REGLES;
  switch (regle.type) {
    case 'ecriture': return { cle: CLE_ECRITURE, texte: JSON.stringify({ version: v, groupes: regle.ecriture.groupes, variables: regle.ecriture.variables }) };
    case 'terme': return { cle: cleTerme(regle.terme.terme), texte: JSON.stringify({ version: v, terme: regle.terme.terme, remplace: regle.terme.remplace,
      ...(regle.terme.definition ? { definition: regle.terme.definition } : {}) }) };
    case 'ecart': return { cle: cleEcart(regle.id), texte: JSON.stringify({ version: v }) };
    case 'distinct': return { cle: cleDistinct(regle.termes[0], regle.termes[1]), texte: JSON.stringify({ version: v }) };
    case 'voulu': return { cle: cleVoulu(regle.mots), texte: JSON.stringify({ version: v }) };
    case 'ordinaire': return { cle: cleOrdinaire(regle.cle), texte: JSON.stringify({ version: v }) };
    case 'plus-tard': return { cle: clePlusTard(regle.cle), texte: JSON.stringify({ version: v }) };
    case 'collection': return { cle: cleCollection(regle.id), texte: JSON.stringify({ version: v, ...(regle.cible ? { cible: regle.cible } : {}) }) };
    case 'exclues': return { cle: CLE_EXCLUES, texte: JSON.stringify({ version: v, ids: trier(regle.ids) }) };
    case 'vus': return { cle: CLE_VUS, texte: JSON.stringify({ version: v, groupes: trier(regle.groupes) }) };
  }
}

/** Toutes les entrées des règles, hors réponses et journal. `exclues` et `vus` ne sortent que s'ils ne sont pas vides. */
export function ecrituresDesRegles(regles: ReglesDuFichier): Ecriture[] {
  const liste: Regle[] = [
    ...(regles.ecriture ? [{ type: 'ecriture', ecriture: regles.ecriture } as const] : []),
    ...regles.termes.map((terme) => ({ type: 'terme', terme }) as const),
    ...regles.ecartsUcm.map((id) => ({ type: 'ecart', id }) as const),
    ...regles.distincts.map((termes) => ({ type: 'distinct', termes }) as const),
    ...regles.voulus.map((voulu) => ({ type: 'voulu', mots: voulu.split(' ') }) as const),
    ...regles.ordinaires.map((cle) => ({ type: 'ordinaire', cle }) as const),
    ...regles.plusTard.map((cle) => ({ type: 'plus-tard', cle }) as const),
    ...regles.collectionsGardees.map((id) => ({ type: 'collection', id }) as const),
    ...Object.entries(regles.collectionsRenommees).sort(([a], [b]) => comparer(a, b)).map(([id, cible]) => ({ type: 'collection', id, cible }) as const),
    ...(regles.collectionsExclues.length > 0 ? [{ type: 'exclues', ids: regles.collectionsExclues } as const] : []),
    ...(regles.vus.length > 0 ? [{ type: 'vus', groupes: regles.vus } as const] : []),
  ];
  return liste.map(serialiserRegle);
}

// Les réponses

/**
 * Les écritures d'une réponse : ses changements, qui n'écrivent que ce qui diffère de `courant`, puis `reponse:<cle>`
 * qui garde, par clé touchée, le texte d'avant et le texte écrit. Une réponse déjà rangée garde son premier « avant ».
 */
export function preparerReponse(cle: string, changements: readonly Ecriture[], courant: ReadonlyMap<string, string>): Ecriture[] {
  const rangee = lireEntree(courant.get(cleReponse(cle)) ?? '');
  const avant: Record<string, string | null> = { ...lireAvant(rangee?.avant) };
  const ecrit: Record<string, string | null> = { ...(rangee?.apres === undefined ? undefined : lireAvant(rangee.apres)) };
  const utiles = changements.filter((c) => (c.texte ?? '') !== (courant.get(c.cle) ?? ''));
  for (const { cle: touchee, texte } of utiles) {
    if (!(touchee in avant)) avant[touchee] = courant.get(touchee) ?? null;
    ecrit[touchee] = texte === '' ? null : texte;
  }
  return [...utiles, { cle: cleReponse(cle), texte: JSON.stringify({ version: VERSION_DES_REGLES, avant, apres: ecrit }) }];
}

/** Les formes remplacées d'une entrée `terme:` ; vide si l'entrée est absente ou illisible. */
function formesDe(texte: string | null | undefined): string[] {
  const brut = texte ? lireEntree(texte) : undefined;
  return brut && Array.isArray(brut.remplace) && brut.remplace.every(estMots) ? brut.remplace.map((forme) => forme.join(' ')) : [];
}

/**
 * Rétablit `avant` pour les clés dont le texte courant est encore celui que `ecrit` a écrit. Pour un `terme:` changé depuis,
 * retire seulement les formes que l'écriture a ajoutées ; une autre clé changée depuis reste telle quelle.
 * Sans `ecrit` (entrée ancienne), chaque clé revient à son texte d'avant.
 */
function retablir(
  avant: Readonly<Record<string, string | null>>, ecrit: Readonly<Record<string, string | null>> | undefined, courant: ReadonlyMap<string, string>,
): Ecriture[] {
  const sortie: Ecriture[] = [];
  for (const [touchee, texte] of Object.entries(avant)) {
    if (!ecrit || !(touchee in ecrit) || (courant.get(touchee) || null) === ecrit[touchee]) { sortie.push({ cle: touchee, texte }); continue; }
    const reste = apres(touchee, 'terme:');
    const actuel = courant.get(touchee);
    const mots = reste === undefined ? undefined : motsDe(reste);
    const entree = actuel ? lireEntree(actuel) : undefined;
    const terme = mots && entree && lireTerme(mots, entree);
    if (!terme) continue;
    const dejaLa = formesDe(texte);
    const ajoutees = new Set(formesDe(ecrit[touchee]).filter((forme) => !dejaLa.includes(forme)));
    const gardees = terme.remplace.filter((forme) => !ajoutees.has(forme.join(' ')));
    if (gardees.length === terme.remplace.length) continue;
    sortie.push(gardees.length === 0 && !terme.definition ? { cle: touchee, texte: null } : serialiserRegle({ type: 'terme', terme: { ...terme, remplace: gardees } }));
  }
  return sortie;
}

/** Défait la réponse rangée (voir `retablir`), puis efface `reponse:<cle>` ; rien si la réponse n'est pas rangée. */
export function defaireReponse(cle: string, courant: ReadonlyMap<string, string>): Ecriture[] | undefined {
  const rangee = lireEntree(courant.get(cleReponse(cle)) ?? '');
  const avant = lireAvant(rangee?.avant);
  if (!avant) return undefined;
  const ecrit = rangee?.apres === undefined ? undefined : lireAvant(rangee.apres);
  return [...retablir(avant, ecrit, courant), { cle: cleReponse(cle), texte: null }];
}

/** Défait le dernier import qui a écrasé l'écriture ou un terme, comme `defaireReponse`, puis efface `reponse:import`. */
export function defaireLImport(courant: ReadonlyMap<string, string>): Ecriture[] {
  const rangee = lireEntree(courant.get(CLE_IMPORT) ?? '');
  const lu = rangee && lireImport(rangee);
  return lu ? [...retablir(lu.avant, lu.apres, courant), { cle: CLE_IMPORT, texte: null }] : [];
}

/**
 * L'entrée `reponse:import` d'un import qui écrase l'écriture ou un terme déjà rangé sous un autre texte : elle garde
 * le texte d'avant et d'après des clés changées. `undefined` si l'import n'écrase rien.
 */
export function preparerImport(ecritures: readonly Ecriture[], courant: ReadonlyMap<string, string>, heure: string): Ecriture | undefined {
  const changees = ecritures.filter((e) => (e.texte ?? '') !== (courant.get(e.cle) ?? ''));
  const ecrase = changees.some((e) => (e.cle === CLE_ECRITURE || e.cle.startsWith('terme:')) && courant.has(e.cle));
  if (!ecrase) return undefined;
  const avant: Record<string, string | null> = {};
  const ecrit: Record<string, string | null> = {};
  for (const { cle, texte } of changees) { avant[cle] = courant.get(cle) ?? null; ecrit[cle] = texte; }
  return { cle: CLE_IMPORT, texte: JSON.stringify({ version: VERSION_DES_REGLES, heure, avant, apres: ecrit }) };
}

// Le journal

/** Un lot du journal : ses entrées, puis la référence qui le publie. Le rangeur écrit la référence en dernier. */
export interface JournalPrepare {
  readonly entrees: readonly { readonly cle: string; readonly texte: string }[];
  readonly reference: { readonly cle: string; readonly texte: string };
}

/** Le budget en octets de la valeur d'une entrée du lot : la clé la plus longue possible et la marge sont déjà retirées. */
export function budgetDUneEntree(lot: string): number {
  return LIMITE_D_UNE_ENTREE - octetsUtf8(ESPACE_ARCHITECT) - octetsUtf8(cleJournal(lot, 999_999_999)) - MARGE_D_UNE_ENTREE;
}

/**
 * Découpe le journal en entrées `journal:<lot>:<rang>` dont la valeur pèse `max` octets UTF-8 au plus,
 * puis prépare la référence `journal` (lot, heure, nombre d'entrées).
 * Rend `undefined` quand un renommage ne tient pas seul dans une entrée : le journal ne peut pas être écrit.
 */
export function preparerJournal(journal: Journal, lot: string, max: number = budgetDUneEntree(lot)): JournalPrepare | undefined {
  const reserve = octetsUtf8(JSON.stringify({ version: VERSION_DES_REGLES, lot, rang: 999_999_999, renommages: [] }));
  const morceaux: RenommageJournal[][] = [[]];
  let taille = reserve;
  for (const renommage of journal.renommages) {
    const longueur = octetsUtf8(JSON.stringify(renommage)) + 1;
    if (reserve + longueur > max) return undefined;
    if (morceaux[morceaux.length - 1]!.length > 0 && taille + longueur > max) { morceaux.push([]); taille = reserve; }
    morceaux[morceaux.length - 1]!.push(renommage);
    taille += longueur;
  }
  return {
    entrees: morceaux.map((renommages, rang) => ({
      cle: cleJournal(lot, rang), texte: JSON.stringify({ version: VERSION_DES_REGLES, lot, rang, renommages }),
    })),
    reference: { cle: CLE_JOURNAL, texte: JSON.stringify({ version: VERSION_DES_REGLES, lot, heure: journal.heure, morceaux: morceaux.length }) },
  };
}

/**
 * Les écritures qui effacent les clés du journal, de la forme ancienne et du lot, sauf celles de `garder`.
 * Les entrées de l'ancienne forme partent d'abord, puis la référence, puis les entrées des lots.
 */
export function effacerLeJournal(clesExistantes: Iterable<string>, garder: ReadonlySet<string> = new Set()): Ecriture[] {
  const rang = (cle: string): number => ENTREE_ANCIENNE.test(cle) ? 0 : cle === CLE_JOURNAL ? 1 : 2;
  return [...clesExistantes].filter((cle) => estCleDuJournal(cle) && !garder.has(cle))
    .sort((a, b) => rang(a) - rang(b)).map((cle) => ({ cle, texte: null }));
}

// L'export et l'import

export interface ExportDesRegles {
  readonly version: 1;
  readonly ecriture?: EcritureChoisie;
  readonly termes: readonly TermePersonnalise[];
  readonly ecartsUcm: readonly string[];
  readonly distincts: readonly (readonly [string, string])[];
  readonly voulus: readonly string[];
  /** Absent d'un export plus ancien : il se lit comme une liste vide. */
  readonly ordinaires?: readonly string[];
  readonly plusTard: readonly string[];
}

/** Les règles qui se portent d'un fichier à l'autre ; les réponses, les groupes vus, le journal et les collections gardées ou exclues (identifiants Figma) restent au fichier. */
export function exporterLesRegles(regles: ReglesDuFichier): string {
  const sortie: ExportDesRegles = {
    version: VERSION_DES_REGLES,
    ...(regles.ecriture ? { ecriture: regles.ecriture } : {}),
    termes: regles.termes, ecartsUcm: regles.ecartsUcm, distincts: regles.distincts, voulus: regles.voulus,
    ordinaires: regles.ordinaires, plusTard: regles.plusTard,
  };
  return JSON.stringify(sortie, null, 2);
}

/** Valide un export en entier ; la moindre entrée invalide le rend illisible. */
function lireExport(texte: string): ReglesDuFichier | undefined {
  let brut: unknown;
  try { brut = JSON.parse(texte); } catch { return undefined; }
  if (!estObjet(brut) || brut.version !== VERSION_DES_REGLES) return undefined;
  const liste = (valeur: unknown): unknown[] | undefined => valeur === undefined ? [] : Array.isArray(valeur) ? valeur : undefined;
  const termesBruts = liste(brut.termes), distinctsBruts = liste(brut.distincts);
  const ecarts = liste(brut.ecartsUcm), voulus = liste(brut.voulus), plusTard = liste(brut.plusTard), ordinaires = liste(brut.ordinaires);
  if (!termesBruts || !distinctsBruts || !ecarts || !voulus || !plusTard || !ordinaires) return undefined;
  const ecriture = brut.ecriture === undefined ? undefined : estObjet(brut.ecriture) ? lireEcriture({ version: 1, ...brut.ecriture }) : undefined;
  if (brut.ecriture !== undefined && !ecriture) return undefined;
  const termes: TermePersonnalise[] = [];
  for (const item of termesBruts) {
    const terme = estObjet(item) && estMots(item.terme) ? lireTerme(item.terme, item) : undefined;
    if (!terme) return undefined;
    termes.push(terme);
  }
  const distincts: (readonly [string, string])[] = [];
  for (const item of distinctsBruts) {
    if (!Array.isArray(item) || item.length !== 2 || !estTexte(item[0]) || !estTexte(item[1]) || item[0] === item[1] || /\|/u.test(item[0] + item[1])) return undefined;
    distincts.push(item[0] < item[1] ? [item[0], item[1]] : [item[1], item[0]]);
  }
  if (!estListeDeTextes(ecarts) || !estListeDeTextes(plusTard)
    || !voulus.every((v) => estTexte(v) && !!motsDe(v)) || !ordinaires.every(estMot)) return undefined;
  return {
    ...reglesVides,
    ...(ecriture ? { ecriture } : {}),
    termes, ecartsUcm: trier(ecarts), distincts, voulus: trier(voulus as string[]), ordinaires: trier(ordinaires as string[]), plusTard: trier((plusTard as string[]).filter((cle) => !cle.startsWith(PREFIXE_RETIRE))),
  };
}

function fusionner(actuelles: ReglesDuFichier, importees: ReglesDuFichier): ReglesDuFichier {
  const termes = new Map(actuelles.termes.map((t) => [t.terme.join(' '), t]));
  for (const t of importees.termes) termes.set(t.terme.join(' '), t);
  const paires = new Map([...actuelles.distincts, ...importees.distincts].map((p) => [p.join('|'), p]));
  return {
    ...actuelles,
    ...(importees.ecriture ? { ecriture: importees.ecriture, ecritureDeLaV1: false } : {}),
    termes: [...termes.values()].sort((a, b) => comparer(a.terme.join(' '), b.terme.join(' '))),
    ecartsUcm: trier([...actuelles.ecartsUcm, ...importees.ecartsUcm]),
    distincts: [...paires.values()].sort((a, b) => comparer(a.join('|'), b.join('|'))),
    voulus: trier([...actuelles.voulus, ...importees.voulus]),
    ordinaires: trier([...actuelles.ordinaires, ...importees.ordinaires]),
    plusTard: trier([...actuelles.plusTard, ...importees.plusTard]),
  };
}

export type ResultatDImport =
  | { readonly statut: 'illisible' }
  | { readonly statut: 'conflits'; readonly conflits: readonly ConflitDeVocabulaire[] }
  | { readonly statut: 'valide'; readonly regles: ReglesDuFichier; readonly ecritures: readonly Ecriture[] };

/**
 * Valide l'export en entier avant de rendre quoi que ce soit à écrire. Les règles importées s'ajoutent aux règles du fichier
 * (un terme importé remplace le terme de même nom) ; `controler` calcule les conflits du vocabulaire fusionné
 * (la session y branche `indexerVocabulaire` du kit).
 */
export function importerLesRegles(
  texte: string,
  actuelles: ReglesDuFichier,
  controler: (vocabulaire: VocabulaireDuFichier) => readonly ConflitDeVocabulaire[],
): ResultatDImport {
  const importees = lireExport(texte);
  if (!importees) return { statut: 'illisible' };
  const fusion = fusionner(actuelles, importees);
  const conflits = controler(vocabulaireDuFichier(fusion));
  if (conflits.length > 0) return { statut: 'conflits', conflits };
  return { statut: 'valide', regles: fusion, ecritures: ecrituresDesRegles(importees) };
}

// Le port de stockage

/** Ce que ces fonctions demandent au port d'`ecriture.ts`. */
export interface StockageDeRegles {
  cles(): readonly string[];
  lire(cle: string): string;
  ecrire(cle: string, texte: string): void;
  effacer(cle: string): void;
}

/** Toutes les entrées de l'espace, sous la forme que `lireLesRegles` attend. */
export function lireLeStockage(stockage: StockageDeRegles): Map<string, string> {
  return new Map(stockage.cles().map((cle) => [cle, stockage.lire(cle)] as const));
}

/**
 * Range les écritures dans l'ordre. Si l'une échoue, chaque clé déjà touchée (celle qui échoue comprise) retrouve son texte
 * d'avant, au mieux : chaque retour a son `try`. L'erreur d'origine est relancée.
 */
export function rangerLesEcritures(stockage: StockageDeRegles, ecritures: readonly Ecriture[]): void {
  const touchees = new Map<string, string>();
  try {
    for (const { cle, texte } of ecritures) {
      if (!touchees.has(cle)) touchees.set(cle, stockage.lire(cle));
      if (texte === null || texte === '') stockage.effacer(cle);
      else stockage.ecrire(cle, texte);
    }
  } catch (cause) {
    for (const [cle, avant] of touchees) {
      try {
        if (avant === '') stockage.effacer(cle);
        else stockage.ecrire(cle, avant);
      } catch { /* retour au mieux */ }
    }
    throw cause;
  }
}

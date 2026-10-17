/**
 * Les règles du fichier : une entrée de données partagées par règle, sans dépendance à Figma.
 *
 * Les clés vivent dans l'espace `ESPACE_ARCHITECT` du kit. Une entrée est un JSON qui porte `version: 1` ;
 * une entrée illisible ou d'une autre version se lit comme absente, et une lecture ne réécrit rien.
 * Toute écriture sort sous forme d'`Ecriture` (`texte: null` efface la clé) : la session les range par le port d'`ecriture.ts`.
 */
import type { ConflitDeVocabulaire, DejaJuge, Mots, TermePersonnalise, VocabulaireDuFichier } from '@ucm-kit/core/referentiel';
import { estConventions, lireChoix } from './conventions';
import type { EcritureChoisie } from './messages';

export const VERSION_DES_REGLES = 1;
export const CLE_ECRITURE = 'ecriture';
export const CLE_EXCLUES = 'exclues';
export const CLE_VUS = 'vus';
/** Clé de la convention de la v1, lue seulement quand `ecriture` manque. */
export const CLE_CONVENTIONS_V1 = 'conventions';
/** Taille maximale d'une entrée du journal ; Figma limite une entrée à 100 ko, clé et espace compris. */
export const TAILLE_MAX_D_UNE_ENTREE_DU_JOURNAL = 90_000;

export interface Ecriture { readonly cle: string; readonly texte: string | null }

export interface RenommageJournal {
  readonly type: 'variable' | 'collection';
  readonly id: string;
  readonly ancienNom: string;
  readonly nouveauNom: string;
}
export interface Journal { readonly heure: string; readonly renommages: readonly RenommageJournal[] }
/** Les entrées qu'une réponse a créées ou changées, avec leur texte d'avant (`null` : l'entrée n'existait pas). */
export interface ReponseRangee { readonly avant: Readonly<Record<string, string | null>> }

export interface ReglesDuFichier {
  readonly ecriture?: EcritureChoisie;
  /** Vrai quand `ecriture` vient de la clé `conventions` de la v1 et n'est pas encore rangée. */
  readonly ecritureDeLaV1: boolean;
  readonly termes: readonly TermePersonnalise[];
  readonly ecartsUcm: readonly string[];
  readonly distincts: readonly (readonly [string, string])[];
  readonly voulus: readonly string[];
  readonly plusTard: readonly string[];
  readonly collectionsGardees: readonly string[];
  readonly collectionsExclues: readonly string[];
  readonly reponses: Readonly<Record<string, ReponseRangee>>;
  readonly vus: readonly string[];
  readonly journal?: Journal;
}

export type Regle =
  | { readonly type: 'ecriture'; readonly ecriture: EcritureChoisie }
  | { readonly type: 'terme'; readonly terme: TermePersonnalise }
  | { readonly type: 'ecart'; readonly id: string }
  | { readonly type: 'distinct'; readonly termes: readonly [string, string] }
  | { readonly type: 'voulu'; readonly mots: Mots }
  | { readonly type: 'plus-tard'; readonly cle: string }
  | { readonly type: 'collection'; readonly id: string }
  | { readonly type: 'exclues'; readonly ids: readonly string[] }
  | { readonly type: 'vus'; readonly groupes: readonly string[] };

const comparer = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const trier = (liste: readonly string[]): string[] => [...new Set(liste)].sort(comparer);
const estTexte = (valeur: unknown): valeur is string => typeof valeur === 'string' && valeur.length > 0;
const estMot = (valeur: unknown): valeur is string => estTexte(valeur) && !/\s/u.test(valeur);
const estMots = (valeur: unknown): valeur is Mots => Array.isArray(valeur) && valeur.length > 0 && valeur.every(estMot);
const estListeDeTextes = (valeur: unknown): valeur is string[] => Array.isArray(valeur) && valeur.every(estTexte);
const estObjet = (valeur: unknown): valeur is Record<string, unknown> => !!valeur && typeof valeur === 'object' && !Array.isArray(valeur);

// Les clés

export const cleTerme = (mots: Mots): string => `terme:${mots.join(' ')}`;
export const cleEcart = (id: string): string => `ecart:${id}`;
/** Une paire distincte s'écrit dans l'ordre trié. */
export const cleDistinct = (a: string, b: string): string => a <= b ? `distinct:${a}|${b}` : `distinct:${b}|${a}`;
export const cleVoulu = (mots: Mots): string => `voulu:${mots.join(' ')}`;
export const clePlusTard = (cle: string): string => `plus-tard:${cle}`;
export const cleCollection = (id: string): string => `collection:${id}`;
export const cleReponse = (cle: string): string => `reponse:${cle}`;
export const cleJournal = (rang: number): string => `journal:${rang}`;

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

/** Le journal n'est lu que complet : une entrée manquante ou illisible le rend absent. */
function lireJournal(entrees: ReadonlyMap<string, string>): Journal | undefined {
  const tete = lireEntree(entrees.get(cleJournal(0)) ?? '');
  if (!tete || !Number.isInteger(tete.morceaux) || (tete.morceaux as number) < 1 || typeof tete.heure !== 'string') return undefined;
  const renommages: RenommageJournal[] = [];
  for (let rang = 0; rang < (tete.morceaux as number); rang++) {
    const morceau = rang === 0 ? tete : lireEntree(entrees.get(cleJournal(rang)) ?? '');
    const lus = morceau && lireRenommages(morceau.renommages);
    if (!lus) return undefined;
    renommages.push(...lus);
  }
  return { heure: tete.heure, renommages };
}

/** Lit toutes les règles depuis les couples (clé, texte) de l'espace ; les clés inconnues sont ignorées. */
export function lireLesRegles(couples: Iterable<readonly [string, string]>): ReglesDuFichier {
  const entrees = new Map(couples);
  let ecriture: EcritureChoisie | undefined;
  const termes: TermePersonnalise[] = [];
  const ecartsUcm: string[] = [];
  const distincts = new Map<string, readonly [string, string]>();
  const voulus: string[] = [];
  const plusTard: string[] = [];
  const gardees: string[] = [];
  let exclues: string[] = [];
  const reponses: Record<string, ReponseRangee> = {};
  let vus: string[] = [];
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
    else if ((reste = apres(cle, 'plus-tard:')) !== undefined) plusTard.push(reste);
    else if ((reste = apres(cle, 'collection:')) !== undefined) gardees.push(reste);
    else if ((reste = apres(cle, 'reponse:')) !== undefined) {
      const avant = lireAvant(brut.avant);
      if (avant) reponses[reste] = { avant };
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
    plusTard: trier(plusTard),
    collectionsGardees: trier(gardees),
    collectionsExclues: exclues,
    reponses,
    vus,
    ...(journal ? { journal } : {}),
  };
}

export const reglesVides: ReglesDuFichier = lireLesRegles([]);

/** Le vocabulaire que `indexerVocabulaire` du kit reçoit. */
export function vocabulaireDuFichier(regles: Pick<ReglesDuFichier, 'termes' | 'ecartsUcm'>): VocabulaireDuFichier {
  return { personnalises: regles.termes, ecartsUcm: regles.ecartsUcm };
}

/** Ce que les détecteurs de questions de `detecterParEtapes` ne reposent pas. */
export function dejaJugeDuFichier(regles: Pick<ReglesDuFichier, 'distincts' | 'plusTard' | 'voulus' | 'collectionsGardees'>): DejaJuge {
  return { distincts: regles.distincts, plusTard: regles.plusTard, voulus: regles.voulus, collectionsGardees: regles.collectionsGardees };
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
    case 'plus-tard': return { cle: clePlusTard(regle.cle), texte: JSON.stringify({ version: v }) };
    case 'collection': return { cle: cleCollection(regle.id), texte: JSON.stringify({ version: v }) };
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
    ...regles.plusTard.map((cle) => ({ type: 'plus-tard', cle }) as const),
    ...regles.collectionsGardees.map((id) => ({ type: 'collection', id }) as const),
    ...(regles.collectionsExclues.length > 0 ? [{ type: 'exclues', ids: regles.collectionsExclues } as const] : []),
    ...(regles.vus.length > 0 ? [{ type: 'vus', groupes: regles.vus } as const] : []),
  ];
  return liste.map(serialiserRegle);
}

// Les réponses

/**
 * Les écritures d'une réponse : ses changements, qui n'écrivent que ce qui diffère de `courant`, puis `reponse:<cle>`
 * qui garde le texte d'avant de chaque clé touchée. Une réponse déjà rangée garde son premier « avant ».
 */
export function preparerReponse(cle: string, changements: readonly Ecriture[], courant: ReadonlyMap<string, string>): Ecriture[] {
  const dejaRangee = lireAvant(lireEntree(courant.get(cleReponse(cle)) ?? '')?.avant) ?? {};
  const utiles = changements.filter((c) => (c.texte ?? '') !== (courant.get(c.cle) ?? ''));
  const avant: Record<string, string | null> = { ...dejaRangee };
  for (const { cle: touchee } of utiles) if (!(touchee in avant)) avant[touchee] = courant.get(touchee) ?? null;
  return [...utiles, { cle: cleReponse(cle), texte: JSON.stringify({ version: VERSION_DES_REGLES, avant }) }];
}

/** Rétablit chaque clé touchée à son texte d'avant, puis efface `reponse:<cle>` ; rien si la réponse n'est pas rangée. */
export function defaireReponse(cle: string, courant: ReadonlyMap<string, string>): Ecriture[] | undefined {
  const avant = lireAvant(lireEntree(courant.get(cleReponse(cle)) ?? '')?.avant);
  if (!avant) return undefined;
  return [...Object.entries(avant).map(([touchee, texte]) => ({ cle: touchee, texte })), { cle: cleReponse(cle), texte: null }];
}

// Le journal

/**
 * Découpe le journal en entrées de `max` caractères au plus. L'entrée 0 porte l'heure et le nombre d'entrées.
 * Les entrées `journal:<n>` d'un journal plus long que celui-ci sont effacées : `clesExistantes` les nomme.
 */
export function preparerJournal(journal: Journal, clesExistantes: Iterable<string> = [], max: number = TAILLE_MAX_D_UNE_ENTREE_DU_JOURNAL): Ecriture[] {
  const reserve = JSON.stringify({ version: VERSION_DES_REGLES, heure: journal.heure, morceaux: 999_999_999, renommages: [] }).length;
  const morceaux: RenommageJournal[][] = [[]];
  let taille = reserve;
  for (const renommage of journal.renommages) {
    const longueur = JSON.stringify(renommage).length + 1;
    const courant = morceaux[morceaux.length - 1]!;
    if (courant.length > 0 && taille + longueur > max) { morceaux.push([]); taille = reserve; }
    morceaux[morceaux.length - 1]!.push(renommage);
    taille += longueur;
  }
  const ecritures: Ecriture[] = morceaux.map((renommages, rang) => ({
    cle: cleJournal(rang),
    texte: JSON.stringify(rang === 0
      ? { version: VERSION_DES_REGLES, heure: journal.heure, morceaux: morceaux.length, renommages }
      : { version: VERSION_DES_REGLES, renommages }),
  }));
  for (const cle of clesExistantes) {
    const rang = /^journal:(\d+)$/u.exec(cle)?.[1];
    if (rang !== undefined && Number(rang) >= morceaux.length) ecritures.push({ cle, texte: null });
  }
  return ecritures;
}

/** Les écritures qui effacent le journal. */
export function effacerLeJournal(clesExistantes: Iterable<string>): Ecriture[] {
  return [...clesExistantes].filter((cle) => /^journal:\d+$/u.test(cle)).map((cle) => ({ cle, texte: null }));
}

// L'export et l'import

export interface ExportDesRegles {
  readonly version: 1;
  readonly ecriture?: EcritureChoisie;
  readonly termes: readonly TermePersonnalise[];
  readonly ecartsUcm: readonly string[];
  readonly distincts: readonly (readonly [string, string])[];
  readonly voulus: readonly string[];
  readonly plusTard: readonly string[];
}

/** Les règles qui se portent d'un fichier à l'autre ; les réponses, les groupes vus, le journal et les collections gardées ou exclues (identifiants Figma) restent au fichier. */
export function exporterLesRegles(regles: ReglesDuFichier): string {
  const sortie: ExportDesRegles = {
    version: VERSION_DES_REGLES,
    ...(regles.ecriture ? { ecriture: regles.ecriture } : {}),
    termes: regles.termes, ecartsUcm: regles.ecartsUcm, distincts: regles.distincts, voulus: regles.voulus,
    plusTard: regles.plusTard,
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
  const ecarts = liste(brut.ecartsUcm), voulus = liste(brut.voulus), plusTard = liste(brut.plusTard);
  if (!termesBruts || !distinctsBruts || !ecarts || !voulus || !plusTard) return undefined;
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
    || !voulus.every((v) => estTexte(v) && !!motsDe(v))) return undefined;
  return {
    ...reglesVides,
    ...(ecriture ? { ecriture } : {}),
    termes, ecartsUcm: trier(ecarts), distincts, voulus: trier(voulus as string[]), plusTard: trier(plusTard),
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

export function rangerLesEcritures(stockage: StockageDeRegles, ecritures: readonly Ecriture[]): void {
  for (const { cle, texte } of ecritures) {
    if (texte === null || texte === '') stockage.effacer(cle);
    else stockage.ecrire(cle, texte);
  }
}

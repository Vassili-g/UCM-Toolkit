/**
 * Les journaux rangés dans les données partagées d'`ESPACE_ARCHITECT`, et l'unique façon de les ranger : un lot d'entrées,
 * puis la référence qui le publie, écrite en dernier. Une lecture ne voit un lot que complet.
 *
 * Le journal des noms (`journal`) garde les renommages du dernier lot ; sa forme est lue par `nomenclature/regles.ts`, qui
 * rejette une ligne d'un autre genre. Le journal de structure (`journal-structure`) est une famille de clés à part, que cette lecture
 * ignore : il garde les scopes écrits, les cibles d'alias changées par mode et les variables créées, sous la même règle d'un
 * seul lot, remplacé à chaque écriture qui change le document.
 */
import { VERSION_DES_REGLES } from '@ucm-kit/core/protocoles';
import {
  CLE_JOURNAL, budgetDUneEntree, effacerLeJournal, octetsUtf8, preparerJournal,
  type Ecriture, type Journal, type JournalPrepare,
} from '../nomenclature/regles';

/** Le stockage des règles du fichier : une clé par règle, dans l'espace d'Architect. Une écriture de règle n'ouvre pas de point d'annulation. */
export interface PortDeRegles {
  cles(): readonly string[];
  lire(cle: string): string;
  ecrire(cle: string, texte: string): void;
  effacer(cle: string): void;
}

let compteurDeLots = 0;
/** Un identifiant de lot unique : heure, compteur du processus et hasard, en base 36. */
export const identifiantDeLot = (): string => `${Date.now().toString(36)}${(compteurDeLots++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Les clés d'un lot rangé, et le texte de la référence qu'il a remplacée (vide : aucune). */
export interface LotRange {
  readonly cles: ReadonlySet<string>;
  readonly entrees: readonly string[];
  readonly referenceAvant: string;
  readonly cleReference: string;
}

/**
 * Range un lot : ses entrées, puis la référence en dernier. Rend `undefined` quand le lot ne tient pas (`prepare` absent)
 * ou qu'une écriture échoue ; il efface alors les clés neuves et remet la référence d'avant.
 */
export function rangerUnLot(stockage: PortDeRegles, prepare: JournalPrepare | undefined): LotRange | undefined {
  if (!prepare) return undefined;
  const cleReference = prepare.reference.cle;
  const referenceAvant = stockage.lire(cleReference);
  try {
    for (const { cle, texte } of [...prepare.entrees, prepare.reference]) stockage.ecrire(cle, texte);
  } catch {
    // Une clé qui lève a pu être écrite : toutes celles du lot s'effacent.
    for (const { cle } of prepare.entrees) { try { stockage.effacer(cle); } catch { /* orpheline, effacée au lot suivant */ } }
    try {
      if (stockage.lire(cleReference) !== referenceAvant) { if (referenceAvant) stockage.ecrire(cleReference, referenceAvant); else stockage.effacer(cleReference); }
    } catch { /* la référence reste celle du lot raté, dont les entrées sont effacées */ }
    return undefined;
  }
  const entrees = prepare.entrees.map(({ cle }) => cle);
  return { cles: new Set([...entrees, cleReference]), entrees, referenceAvant, cleReference };
}

/** Range un lot du journal des noms. */
export const ranger = (stockage: PortDeRegles, journal: Journal, lot: string): LotRange | undefined => rangerUnLot(stockage, preparerJournal(journal, lot));

/** Efface les clés du journal qui ne sont pas à `garder` ; une clé qui résiste reste orpheline, sans effet sur la lecture. */
export function nettoyer(stockage: PortDeRegles, garder: ReadonlySet<string>, effacer: (cles: Iterable<string>, garder: ReadonlySet<string>) => Ecriture[] = effacerLeJournal): void {
  try {
    for (const { cle } of effacer(stockage.cles(), garder)) { try { stockage.effacer(cle); } catch { /* effacée au lot suivant */ } }
  } catch { /* idem */ }
}

/** Un lot sans écriture effective rend le journal d'avant : la référence reprend son texte, puis les entrées du lot partent. */
export function retirer(stockage: PortDeRegles, lot: LotRange): void {
  try {
    if (lot.referenceAvant) stockage.ecrire(lot.cleReference, lot.referenceAvant); else stockage.effacer(lot.cleReference);
  } catch { return; }
  for (const cle of lot.entrees) { try { stockage.effacer(cle); } catch { /* orpheline */ } }
}

// Le journal de structure

export const CLE_JOURNAL_DE_STRUCTURE = 'journal-structure';
const ENTREE_DE_STRUCTURE = /^journal-structure:[^:]+:\d+$/u;
export const cleDeStructure = (lot: string, rang: number): string => `${CLE_JOURNAL_DE_STRUCTURE}:${lot}:${rang}`;
export const estCleDuJournalDeStructure = (cle: string): boolean => cle === CLE_JOURNAL_DE_STRUCTURE || ENTREE_DE_STRUCTURE.test(cle);

/**
 * Les identifiants sont ceux de Figma. `avant` et `apres` d'un alias sont les identifiants des variables visées : l'annulation
 * remet l'alias d'avant sans importer de variable.
 */
export type LigneDeStructure =
  | { readonly sorte: 'scopes'; readonly variable: string; readonly nom: string; readonly avant: readonly string[]; readonly apres: readonly string[] }
  | { readonly sorte: 'alias-de-mode'; readonly variable: string; readonly nom: string; readonly mode: string; readonly avant: string; readonly apres: string }
  | { readonly sorte: 'creation'; readonly variable: string; readonly nom: string; readonly collection: string };

export interface JournalDeStructure { readonly heure: string; readonly lignes: readonly LigneDeStructure[] }

const estTexte = (valeur: unknown): valeur is string => typeof valeur === 'string' && valeur !== '';
const estListe = (valeur: unknown): valeur is string[] => Array.isArray(valeur) && valeur.every((item) => typeof item === 'string' && item !== '');
const estObjet = (valeur: unknown): valeur is Record<string, unknown> => typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);

function lireUneLigne(brut: unknown): LigneDeStructure | undefined {
  if (!estObjet(brut) || !estTexte(brut.variable) || typeof brut.nom !== 'string') return undefined;
  const { variable, nom } = brut;
  switch (brut.sorte) {
    case 'scopes': return estListe(brut.avant) && estListe(brut.apres) ? { sorte: 'scopes', variable, nom, avant: brut.avant, apres: brut.apres } : undefined;
    case 'alias-de-mode':
      return estTexte(brut.mode) && estTexte(brut.avant) && estTexte(brut.apres) ? { sorte: 'alias-de-mode', variable, nom, mode: brut.mode, avant: brut.avant, apres: brut.apres } : undefined;
    case 'creation': return estTexte(brut.collection) ? { sorte: 'creation', variable, nom, collection: brut.collection } : undefined;
    default: return undefined;
  }
}

function lireUneEntree(texte: string): Record<string, unknown> | undefined {
  try {
    const brut: unknown = JSON.parse(texte);
    return estObjet(brut) ? brut : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Le journal de structure, lu complet. Une référence absente rend `undefined` ; une entrée manquante, illisible ou d'un autre lot,
 * ou une ligne d'une forme inconnue, rend `undefined` aussi, et la lecture n'efface rien.
 */
export function lireLeJournalDeStructure(stockage: PortDeRegles): JournalDeStructure | undefined {
  const reference = lireUneEntree(stockage.lire(CLE_JOURNAL_DE_STRUCTURE));
  if (!reference || !estTexte(reference.lot) || reference.lot.includes(':') || !estTexte(reference.heure)
    || !Number.isInteger(reference.morceaux) || (reference.morceaux as number) < 1) return undefined;
  const lignes: LigneDeStructure[] = [];
  for (let rang = 0; rang < (reference.morceaux as number); rang++) {
    const entree = lireUneEntree(stockage.lire(cleDeStructure(reference.lot, rang)));
    if (!entree || entree.lot !== reference.lot || entree.rang !== rang || !Array.isArray(entree.lignes)) return undefined;
    for (const brute of entree.lignes) {
      const ligne = lireUneLigne(brute);
      if (!ligne) return undefined;
      lignes.push(ligne);
    }
  }
  return { heure: reference.heure, lignes };
}

/** Découpe les lignes en entrées `journal-structure:<lot>:<rang>` de `max` octets au plus ; `undefined` quand une ligne ne tient pas seule. */
export function preparerLeJournalDeStructure(journal: JournalDeStructure, lot: string, max: number = budgetDUneEntree(lot)): JournalPrepare | undefined {
  const reserve = octetsUtf8(JSON.stringify({ version: VERSION_DES_REGLES, lot, rang: 999_999_999, lignes: [] }));
  const morceaux: LigneDeStructure[][] = [[]];
  let taille = reserve;
  for (const ligne of journal.lignes) {
    const longueur = octetsUtf8(JSON.stringify(ligne)) + 1;
    if (reserve + longueur > max) return undefined;
    if (morceaux[morceaux.length - 1]!.length > 0 && taille + longueur > max) { morceaux.push([]); taille = reserve; }
    morceaux[morceaux.length - 1]!.push(ligne);
    taille += longueur;
  }
  return {
    entrees: morceaux.map((lignes, rang) => ({ cle: cleDeStructure(lot, rang), texte: JSON.stringify({ version: VERSION_DES_REGLES, lot, rang, lignes }) })),
    reference: { cle: CLE_JOURNAL_DE_STRUCTURE, texte: JSON.stringify({ version: VERSION_DES_REGLES, lot, heure: journal.heure, morceaux: morceaux.length }) },
  };
}

/** Les écritures qui effacent les clés du journal de structure sauf `garder` : la référence part avant les entrées. */
export function effacerLeJournalDeStructure(clesExistantes: Iterable<string>, garder: ReadonlySet<string> = new Set()): Ecriture[] {
  return [...clesExistantes].filter((cle) => estCleDuJournalDeStructure(cle) && !garder.has(cle))
    .sort((a, b) => Number(a !== CLE_JOURNAL_DE_STRUCTURE) - Number(b !== CLE_JOURNAL_DE_STRUCTURE)).map((cle) => ({ cle, texte: null }));
}

/** Range un lot du journal de structure, sans effacer le précédent : l'appelant nettoie avec `nettoyerLeJournalDeStructure` quand l'écriture est faite. */
export const rangerLeJournalDeStructure = (stockage: PortDeRegles, journal: JournalDeStructure, lot: string): LotRange | undefined =>
  rangerUnLot(stockage, preparerLeJournalDeStructure(journal, lot));

export const nettoyerLeJournalDeStructure = (stockage: PortDeRegles, garder: ReadonlySet<string>): void => nettoyer(stockage, garder, effacerLeJournalDeStructure);

export interface OptionsDuJournal {
  /** Heure du journal ; l'heure courante par défaut. */
  readonly heure?: () => string;
  /** Identifiant de lot, sans `:` ; un identifiant neuf à chaque appel par défaut. */
  readonly lot?: () => string;
}

/** Une variable que le plugin vient de créer : son identifiant Figma, son nom et l'identifiant de sa collection. */
export interface CreationJournal { readonly variable: string; readonly nom: string; readonly collection: string }

/**
 * Journalise des variables créées, pour que l'Historique puisse les défaire : le journal de structure est remplacé par un lot de
 * lignes `creation`. À appeler quand les variables existent, avec leurs identifiants. Rend `false` quand le fichier ne peut pas
 * garder le journal : les variables existent alors sans annulation possible, et l'appelant le dit.
 */
export function journaliserLesCreations(stockage: PortDeRegles, creations: readonly CreationJournal[], options: OptionsDuJournal = {}): boolean {
  if (creations.length === 0) return true;
  const heure = (options.heure ?? ((): string => new Date().toISOString()))();
  const lot = rangerLeJournalDeStructure(stockage, { heure, lignes: creations.map(({ variable, nom, collection }) => ({ sorte: 'creation', variable, nom, collection })) }, (options.lot ?? identifiantDeLot)());
  if (!lot) return false;
  nettoyerLeJournalDeStructure(stockage, lot.cles);
  return true;
}

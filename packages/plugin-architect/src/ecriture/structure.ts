/**
 * Écrit les corrections de structure du mode Tokens : les scopes d'une variable (sorte `scope`, `apres.nom` vide pour un ensemble
 * vide), la cible d'alias d'un mode (sorte `alias-de-mode`) et la création d'une couleur de `theme` (sorte `variable`). Défait
 * aussi, par le journal de structure, ce que ces écritures et les créations de variables ont fait.
 *
 * Le fichier doit toujours déclarer UCM, relu au début du lot, sinon rien n'est écrit (`non-ucm`). Chaque correction relit ensuite ce
 * que l'analyse avait lu : la variable existe (`objet-change`), ses scopes ou l'alias du mode sont ceux de `aRelire.avant`
 * (`fait-faux`), la variable visée se trouve parmi les variables locales (`cible-introuvable`). Une écriture de Figma qui lève saute
 * la correction (`erreur`) ; les autres s'écrivent.
 *
 * Une création relit la collection (locale, de rôle `theme`, qui porte les modes visés : `objet-change` sinon) puis le nom. Une
 * variable de ce nom qui est une couleur et vise déjà les mêmes cibles dans chaque mode saute la correction en `deja-la` ; une
 * autre variable de ce nom la saute en `existe-divergente`. Aucune écriture dans ces deux cas : un second Appliquer ne double rien.
 *
 * Le journal de structure est rangé avant la première écriture, sur les écritures prévues : s'il ne tient pas, rien ne s'écrit
 * (`journal-impossible`). Une variable à créer n'a pas encore d'identifiant : le journal prévu en garde la place avec `ID_A_CREER`.
 * Une fois les écritures faites, il est réécrit avec ce qui a changé et les identifiants réels des variables créées ; si cette
 * réécriture échoue, le journal prévu reste et l'Historique ne défait pas les variables créées. Sans écriture, le journal
 * précédent reste. Un lot pose un seul point d'annulation, après toutes les écritures.
 *
 * L'annulation remet, ligne par ligne et dans l'ordre inverse de l'écriture, l'état que le journal a gardé. Une ligne dont l'objet a
 * changé depuis est sautée et reste au journal. Une variable créée n'est supprimée que si aucune autre variable du fichier ne la vise
 * en alias et qu'aucun layer du fichier ne lui est lié ; les usages des autres fichiers échappent au plugin (`LIMITE_DES_USAGES`).
 *
 * Seul `liaisons.ts` importe une variable : la variable visée d'un alias se cherche ici parmi les variables locales.
 */
import type { Correction } from '@ucm-kit/core/controles';
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, collectionUcmReconnue, lireLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { COUCHE_DES_COULEURS } from '../preparations';
import {
  CLE_JOURNAL_DE_STRUCTURE, identifiantDeLot, lireLeJournalDeStructure, nettoyerLeJournalDeStructure, rangerLeJournalDeStructure, retirer,
  type LigneDeStructure, type PortDeRegles,
} from './journal';
import { creerPortDeRegles } from './noms';
import { creerUneVariableAliasee, type CollectionEcrivable } from './variables';

export type MotifDeStructureSaute =
  | 'objet-change' | 'fait-faux' | 'cible-introuvable' | 'erreur' | 'non-ucm' | 'journal-impossible' | 'deja-la' | 'existe-divergente';

export interface StructureSautee { readonly id: string; readonly motif: MotifDeStructureSaute }

export interface ResultatDEcritureDeStructure {
  /** Les identifiants des corrections écrites. */
  readonly ecrites: string[];
  readonly sautees: StructureSautee[];
}

/** Une variable locale telle que l'écriture la lit et l'écrit. */
export interface VariableEcrivable {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly remote?: boolean;
  readonly resolvedType: string;
  readonly variableCollectionId?: string;
  scopes: string[];
  readonly valuesByMode: Readonly<Record<string, unknown>>;
  setValueForMode(mode: string, valeur: unknown): void;
  remove(): void;
}

/** Un nœud tel que la recherche d'usages le lit. */
export interface NoeudDUsage {
  readonly id: string;
  readonly type?: string;
  readonly boundVariables?: unknown;
  readonly fills?: unknown;
  readonly strokes?: unknown;
  readonly effects?: unknown;
  getStyledTextSegments?(champs: string[]): ReadonlyArray<{ boundVariables?: unknown; fills?: unknown }>;
}

/** Ce que l'écriture demande à Figma : les doubles des tests le remplacent. */
export interface ApiDeStructure {
  readonly root: {
    getSharedPluginData(espace: string, cle: string): string;
    findAll(filtre: (noeud: NoeudDUsage) => boolean): readonly { readonly id: string }[];
  };
  loadAllPagesAsync(): Promise<void>;
  readonly variables: {
    getLocalVariablesAsync(): Promise<readonly VariableEcrivable[]>;
    getVariableByIdAsync(id: string): Promise<{ readonly key: string } | null>;
    getLocalVariableCollectionsAsync(): Promise<readonly CollectionEcrivable[]>;
    createVariable(nom: string, collection: CollectionEcrivable, type: string): VariableEcrivable;
    createVariableAlias(variable: VariableEcrivable): unknown;
  };
  commitUndo(): void;
}

export interface OptionsDeStructure {
  readonly api?: ApiDeStructure;
  readonly stockage?: PortDeRegles;
  /** Heure du journal ; l'heure courante par défaut. */
  readonly heure?: () => string;
  /** Identifiant de lot, sans `:` ; un identifiant neuf à chaque appel par défaut. */
  readonly lot?: () => string;
}

const apiDeFigma = (): ApiDeStructure => figma as unknown as ApiDeStructure;
const heureActuelle = (): string => new Date().toISOString();

/** Ce que le plugin ne voit pas d'une variable créée : dit au designer quand une création est défaite ou sautée. */
export const LIMITE_DES_USAGES = 'Le plugin ne voit pas les usages dans d’autres fichiers.';

const estUnObjet = (valeur: unknown): valeur is Record<string, unknown> => typeof valeur === 'object' && valeur !== null;

/** L'identifiant visé par un alias exact (`type` et `id` seuls) ; `null` sinon, opacité comprise. */
function aliasExact(valeur: unknown): string | null {
  if (!estUnObjet(valeur) || valeur.type !== 'VARIABLE_ALIAS' || typeof valeur.id !== 'string') return null;
  return Object.keys(valeur).every((cle) => cle === 'type' || cle === 'id') ? valeur.id : null;
}

/** Vrai quand `valeur` porte, à n'importe quelle profondeur, un alias vers `id`. */
function contientUnAlias(valeur: unknown, id: string, profondeur = 0): boolean {
  if (!estUnObjet(valeur) || profondeur > 8) return false;
  if (valeur.type === 'VARIABLE_ALIAS' && valeur.id === id) return true;
  return Object.values(valeur).some((enfant) => contientUnAlias(enfant, id, profondeur + 1));
}

const memeEnsemble = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && [...a].sort().join(',') === [...b].sort().join(',');
const listeDeScopes = (texte: string): string[] => (texte === '' ? [] : texte.split(','));

function trouverLaVariable(locales: readonly VariableEcrivable[], cle: string | undefined): VariableEcrivable | undefined {
  if (!cle) return undefined;
  return locales.find((variable) => variable.key === cle) ?? locales.find((variable) => variable.id === cle);
}

/** L'identifiant que le journal prévu garde pour une variable pas encore créée ; il a la forme d'un identifiant de Figma. */
const ID_A_CREER = 'VariableID:0000:00000';

interface Plan {
  readonly correction: Correction;
  /** Écrit, et rend la ligne du journal avec les identifiants réels : `ligne` elle-même quand rien n'était à découvrir. */
  readonly ecrire: () => LigneDeStructure;
  /** La ligne prévue, rangée avant la première écriture. */
  readonly ligne: LigneDeStructure;
}

function planifierUneCreation(
  api: ApiDeStructure, collections: readonly CollectionEcrivable[], locales: readonly VariableEcrivable[], correction: Correction,
): Plan | MotifDeStructureSaute {
  const { creation } = correction;
  if (!creation) return 'objet-change';
  const collection = collections.find((candidate) => candidate.id === creation.collection);
  if (!collection || collection.remote || collectionUcmReconnue(collection.name) !== COUCHE_DES_COULEURS) return 'objet-change';
  const modes = Object.keys(creation.alias);
  if (modes.length === 0 || !modes.every((mode) => collection.modes.some(({ modeId }) => modeId === mode))) return 'objet-change';
  const cibles = new Map(modes.map((mode) => [mode, trouverLaVariable(locales, creation.alias[mode]?.cle)] as const));
  const existante = locales.find((variable) => variable.name === creation.nom && variable.variableCollectionId === collection.id);
  if (existante) {
    const identique = existante.resolvedType === creation.type && modes.every((mode) => {
      const cible = cibles.get(mode);
      return cible !== undefined && aliasExact(existante.valuesByMode[mode]) === cible.id;
    });
    return identique ? 'deja-la' : 'existe-divergente';
  }
  const visees: Record<string, VariableEcrivable> = {};
  for (const [mode, cible] of cibles) {
    if (!cible) return 'cible-introuvable';
    visees[mode] = cible;
  }
  return {
    correction,
    ecrire: () => {
      const creee = creerUneVariableAliasee(api, collection, creation.nom, visees, creation.scopes);
      return { sorte: 'creation', variable: creee.id, nom: creee.name, collection: collection.id };
    },
    ligne: { sorte: 'creation', variable: ID_A_CREER, nom: creation.nom, collection: collection.id },
  };
}

async function planifier(
  api: ApiDeStructure, collections: readonly CollectionEcrivable[], locales: readonly VariableEcrivable[], correction: Correction,
): Promise<Plan | MotifDeStructureSaute> {
  if (correction.sorte === 'variable') return planifierUneCreation(api, collections, locales, correction);
  const variable = trouverLaVariable(locales, correction.cible.variable);
  if (!variable || variable.remote) return 'objet-change';
  if (correction.sorte === 'scope') {
    const lus = [...variable.scopes];
    if (!memeEnsemble(lus, listeDeScopes(correction.aRelire.avant ?? ''))) return 'fait-faux';
    const apres = listeDeScopes(correction.apres.nom);
    const ligne: LigneDeStructure = { sorte: 'scopes', variable: variable.id, nom: variable.name, avant: lus, apres };
    return { correction, ecrire: () => { variable.scopes = [...apres]; return ligne; }, ligne };
  }
  const mode = correction.cible.mode;
  if (!mode || !(mode in variable.valuesByMode)) return 'objet-change';
  const avant = aliasExact(variable.valuesByMode[mode]);
  if (avant === null) return 'fait-faux';
  const visee = locales.find((candidate) => candidate.id === avant) ?? await api.variables.getVariableByIdAsync(avant).catch(() => null);
  const cleAvant = visee?.key ? visee.key : avant;
  if (cleAvant !== correction.aRelire.avant) return 'fait-faux';
  const cible = trouverLaVariable(locales, correction.apres.cle);
  if (!cible) return 'cible-introuvable';
  const ligne: LigneDeStructure = { sorte: 'alias-de-mode', variable: variable.id, nom: variable.name, mode, avant, apres: cible.id };
  return { correction, ecrire: () => { variable.setValueForMode(mode, api.variables.createVariableAlias(cible)); return ligne; }, ligne };
}

/**
 * Applique les corrections de sorte `scope`, `alias-de-mode` et `variable`, une à la fois, avec le journal et un seul point d'annulation.
 * Les autres sortes sont ignorées.
 */
export async function ecrireLaStructure(corrections: readonly Correction[], options: OptionsDeStructure = {}): Promise<ResultatDEcritureDeStructure> {
  const api = options.api ?? apiDeFigma();
  const aEcrire = corrections.filter((correction) => correction.sorte === 'scope' || correction.sorte === 'alias-de-mode' || correction.sorte === 'variable');
  const ecrites: string[] = [];
  const sautees: StructureSautee[] = [];
  if (aEcrire.length === 0) return { ecrites, sautees };
  if (lireLArchitectureDuFichier(api.root.getSharedPluginData(ESPACE_ARCHITECT, CLE_ARCHITECTURE_DU_FICHIER)) !== 'ucm') {
    return { ecrites, sautees: aEcrire.map(({ id }) => ({ id, motif: 'non-ucm' })) };
  }
  const stockage = options.stockage ?? creerPortDeRegles(figma);
  const nouveauLot = options.lot ?? identifiantDeLot;
  const heure = (options.heure ?? heureActuelle)();

  const plans: Plan[] = [];
  try {
    const locales = await api.variables.getLocalVariablesAsync();
    const collections = aEcrire.some(({ sorte }) => sorte === 'variable') ? await api.variables.getLocalVariableCollectionsAsync() : [];
    for (const correction of aEcrire) {
      let plan: Plan | MotifDeStructureSaute;
      try { plan = await planifier(api, collections, locales, correction); } catch { plan = 'erreur'; }
      if (typeof plan === 'string') sautees.push({ id: correction.id, motif: plan });
      else plans.push(plan);
    }
  } catch {
    return { ecrites, sautees: aEcrire.map(({ id }) => ({ id, motif: 'erreur' })) };
  }
  if (plans.length === 0) return { ecrites, sautees };

  const prevu = rangerLeJournalDeStructure(stockage, { heure, lignes: plans.map(({ ligne }) => ligne) }, nouveauLot());
  if (!prevu) return { ecrites, sautees: [...sautees, ...plans.map(({ correction }) => ({ id: correction.id, motif: 'journal-impossible' as const }))] };

  const faites: LigneDeStructure[] = [];
  for (const plan of plans) {
    try {
      const ligne = plan.ecrire();
      ecrites.push(plan.correction.id);
      faites.push(ligne);
    } catch {
      sautees.push({ id: plan.correction.id, motif: 'erreur' });
    }
  }
  if (faites.length === 0) {
    retirer(stockage, prevu);
    return { ecrites, sautees };
  }
  // Si la réécriture échoue, le journal prévu reste valide : l'annulation reconnaît une ligne jamais écrite à son état d'avant.
  const identiques = faites.length === plans.length && faites.every((ligne, rang) => ligne === plans[rang]?.ligne);
  const reecrit = identiques ? undefined : rangerLeJournalDeStructure(stockage, { heure, lignes: faites }, nouveauLot());
  nettoyerLeJournalDeStructure(stockage, (reecrit ?? prevu).cles);
  try {
    api.commitUndo();
  } catch {
    // Les écritures sont faites : un point d'annulation refusé ne les retire pas.
  }
  return { ecrites, sautees };
}

// L'annulation

export type MotifDAnnulationSaute = 'objet-change' | 'usage-ajoute' | 'usage-illisible' | 'erreur';

export interface LigneDAnnulationSautee { readonly variable: string; readonly sorte: LigneDeStructure['sorte']; readonly motif: MotifDAnnulationSaute }

export interface ResultatDeLAnnulationDeStructure {
  /** `absent` : aucun journal ; `illisible` : il existe mais ne se lit pas, et reste tel quel. */
  readonly journal: 'lu' | 'absent' | 'illisible';
  /** Les lignes remises à leur état d'avant. */
  readonly defaites: number;
  readonly sautees: LigneDAnnulationSautee[];
  /** Les lignes que le journal garde, pour une annulation suivante. */
  readonly restantes: number;
  /** Vrai quand le journal porte une création : les usages d'autres fichiers ne se voient pas (`LIMITE_DES_USAGES`). */
  readonly limiteDesUsages: boolean;
}

type SortDeLaLigne = 'defaite' | 'retablie' | MotifDAnnulationSaute;

/** Vrai quand un layer du fichier est lié à la variable `id`. Lève si le fichier ne se parcourt pas. */
async function unLayerLieA(api: ApiDeStructure, id: string): Promise<boolean> {
  await api.loadAllPagesAsync();
  return api.root.findAll((noeud) => {
    if (contientUnAlias(noeud.boundVariables, id) || contientUnAlias(noeud.fills, id) || contientUnAlias(noeud.strokes, id) || contientUnAlias(noeud.effects, id)) return true;
    if (noeud.type !== 'TEXT' || typeof noeud.getStyledTextSegments !== 'function') return false;
    return noeud.getStyledTextSegments(['boundVariables', 'fills']).some((segment) => contientUnAlias(segment.boundVariables, id) || contientUnAlias(segment.fills, id));
  }).length > 0;
}

async function defaireLaLigne(api: ApiDeStructure, ligne: LigneDeStructure): Promise<SortDeLaLigne> {
  const locales = await api.variables.getLocalVariablesAsync();
  const variable = locales.find((candidate) => candidate.id === ligne.variable);
  if (ligne.sorte === 'creation') {
    if (!variable) return 'retablie';
    if (variable.remote || variable.name !== ligne.nom || variable.variableCollectionId !== ligne.collection) return 'objet-change';
    if (locales.some((autre) => autre.id !== variable.id && Object.values(autre.valuesByMode).some((valeur) => contientUnAlias(valeur, variable.id)))) return 'usage-ajoute';
    try {
      if (await unLayerLieA(api, variable.id)) return 'usage-ajoute';
    } catch {
      return 'usage-illisible';
    }
    variable.remove();
    return 'defaite';
  }
  if (!variable || variable.remote) return 'objet-change';
  if (ligne.sorte === 'scopes') {
    if (memeEnsemble(variable.scopes, ligne.avant)) return 'retablie';
    if (!memeEnsemble(variable.scopes, ligne.apres)) return 'objet-change';
    variable.scopes = [...ligne.avant];
    return 'defaite';
  }
  if (!(ligne.mode in variable.valuesByMode)) return 'objet-change';
  const actuel = aliasExact(variable.valuesByMode[ligne.mode]);
  if (actuel === ligne.avant) return 'retablie';
  if (actuel !== ligne.apres) return 'objet-change';
  variable.setValueForMode(ligne.mode, { type: 'VARIABLE_ALIAS', id: ligne.avant });
  return 'defaite';
}

/**
 * Défait le dernier lot du journal de structure, dans l'ordre inverse de son écriture. Une ligne dont l'objet a changé depuis, ou
 * dont la variable créée a gagné un usage, est sautée et reste au journal ; une ligne déjà rétablie en part. Le journal n'est
 * effacé que quand toutes ses lignes sont réglées. Un journal illisible n'est pas touché.
 */
export async function annulerLeDernierLotDeStructure(options: OptionsDeStructure = {}): Promise<ResultatDeLAnnulationDeStructure> {
  const api = options.api ?? apiDeFigma();
  const stockage = options.stockage ?? creerPortDeRegles(figma);
  const journal = lireLeJournalDeStructure(stockage);
  if (!journal) return { journal: stockage.lire(CLE_JOURNAL_DE_STRUCTURE) ? 'illisible' : 'absent', defaites: 0, sautees: [], restantes: 0, limiteDesUsages: false };

  const sautees: LigneDAnnulationSautee[] = [];
  const restantes: LigneDeStructure[] = [];
  let defaites = 0;
  for (const ligne of [...journal.lignes].reverse()) {
    let sort: SortDeLaLigne;
    try { sort = await defaireLaLigne(api, ligne); } catch { sort = 'erreur'; }
    if (sort === 'defaite') defaites += 1;
    else if (sort !== 'retablie') {
      sautees.push({ variable: ligne.variable, sorte: ligne.sorte, motif: sort });
      restantes.unshift(ligne);
    }
  }
  if (restantes.length === 0) {
    nettoyerLeJournalDeStructure(stockage, new Set());
  } else if (restantes.length !== journal.lignes.length) {
    const lot = rangerLeJournalDeStructure(stockage, { heure: journal.heure, lignes: restantes }, (options.lot ?? identifiantDeLot)());
    if (lot) nettoyerLeJournalDeStructure(stockage, lot.cles);
  }
  if (defaites > 0) {
    try {
      api.commitUndo();
    } catch {
      // Les écritures sont faites : un point d'annulation refusé ne les retire pas.
    }
  }
  return { journal: 'lu', defaites, sautees, restantes: restantes.length, limiteDesUsages: journal.lignes.some((ligne) => ligne.sorte === 'creation') };
}

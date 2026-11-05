/**
 * Écrit les corrections de structure du mode Tokens : les scopes d'une variable (sorte `scope`, `apres.nom` vide pour un ensemble
 * vide), la cible d'alias d'un mode (sorte `alias-de-mode`) et la création d'une couleur de `theme` (sorte `variable`). Défait
 * aussi, par le journal de structure, ce que ces écritures et les créations de variables ont fait.
 *
 * Le fichier doit toujours déclarer UCM, relu au début du lot, sinon rien n'est écrit (`non-ucm`). Chaque correction relit ensuite ce
 * que l'analyse avait lu : la variable existe (`objet-change`), elle porte encore le nom que l'analyse a lu (`objet-change` ; l'appelant
 * donne ces noms dans `nomsLus`, et sans lui le nom n'est pas vérifié), ses scopes ou l'alias du mode sont ceux de `aRelire.avant`
 * (`fait-faux`), la variable visée se trouve parmi les variables locales (`cible-introuvable`). Un renommage entre la lecture et
 * l'écriture saute donc la correction : les scopes et la cible de l'alias viennent du rôle de l'ancien nom, et la relecture qui suit
 * propose la correction de nouveau si elle tient encore. Une écriture de Figma qui lève saute la correction (`erreur`) ; les autres
 * s'écrivent.
 *
 * Une création relit la collection (locale, de rôle `theme`, qui porte les modes visés : `objet-change` sinon) puis le nom. Une
 * variable de ce nom qui est une couleur et vise déjà les mêmes cibles dans chaque mode saute la correction en `deja-la` ; une
 * autre variable de ce nom la saute en `existe-divergente`. Aucune écriture dans ces deux cas : un second Appliquer ne double rien.
 *
 * Le journal de structure est rangé avant la première écriture, sur les écritures prévues : s'il ne tient pas, rien ne s'écrit
 * (`journal-impossible`). Une variable à créer n'a pas encore d'identifiant : le journal prévu en garde la place avec `ID_A_CREER`.
 * Une fois les écritures faites, il est réécrit avec ce qui a changé et les identifiants réels des variables créées ; si cette
 * réécriture échoue, le journal prévu reste et l'Historique ne défait pas les variables créées : le résultat en rend les noms
 * (`sansAnnulation`) et l'écran les dit au designer. Sans écriture, le journal
 * précédent reste. Un lot pose un seul point d'annulation, après toutes les écritures.
 *
 * L'annulation remet, ligne par ligne et dans l'ordre inverse de l'écriture, l'état que le journal a gardé. Une ligne dont l'objet a
 * changé depuis est sautée et reste au journal. Une variable créée n'est supprimée que si aucune autre variable du fichier ne la vise
 * en alias et qu'aucun layer du fichier ne lui est lié ; les usages des autres fichiers échappent au plugin (`LIMITE_DES_USAGES`).
 *
 * Une fusion (E4.4, `fusionnerLesVariables`) réunit des variables du même rôle dans une palette : chaque token et chaque layer du fichier
 * qui visaient une variable retirée visent la variable gardée, puis la variable retirée devient un alias de la gardée dans chaque mode
 * et porte la marque `a-retirer` (données partagées de la variable). Rien n'est supprimé : les autres fichiers qui emploient la library
 * gardent leur liaison, et la variable retirée donne la couleur de la gardée. Le journal prévoit toutes les lignes avant la première
 * écriture ; une écriture que Figma refuse en cours de route laisse la fusion `erreur`, ses lignes faites au journal, et un nouvel
 * essai finit le reste. Un emplacement d'un layer qu'on ne sait pas réécrire refuse la fusion entière (`non-pris-en-charge`).
 *
 * Seul `liaisons.ts` importe une variable : la variable visée d'un alias se cherche ici parmi les variables locales.
 */
import type { Correction } from '@ucm-kit/core/controles';
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, collectionUcmReconnue, lireLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { COUCHE_DES_COULEURS } from '../preparations';
import { pendantUneEcriture } from '../sandbox/acquisition';
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
  /** Les noms des variables créées que l'Historique ne pourra pas défaire, faute de journal réécrit ; vide sinon. */
  readonly sansAnnulation: string[];
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
  getSharedPluginData?(espace: string, cle: string): string;
  setSharedPluginData?(espace: string, cle: string, valeur: string): void;
}

/** Un nœud tel que la recherche d'usages le lit, et la fusion le réécrit. */
export interface NoeudDUsage {
  readonly id: string;
  readonly name?: string;
  readonly type?: string;
  readonly boundVariables?: unknown;
  fills?: unknown;
  strokes?: unknown;
  effects?: unknown;
  getStyledTextSegments?(champs: string[]): ReadonlyArray<{ start?: number; end?: number; boundVariables?: unknown; fills?: unknown }>;
  setBoundVariable?(champ: string, variable: unknown): void;
  setRangeFills?(debut: number, fin: number, peintures: unknown[]): void;
}

/** Ce que l'écriture demande à Figma : les doubles des tests le remplacent. */
export interface ApiDeStructure {
  readonly root: {
    getSharedPluginData(espace: string, cle: string): string;
    findAll(filtre: (noeud: NoeudDUsage) => boolean): readonly NoeudDUsage[];
  };
  loadAllPagesAsync(): Promise<void>;
  getNodeByIdAsync?(id: string): Promise<NoeudDUsage | null>;
  readonly variables: {
    getLocalVariablesAsync(): Promise<readonly VariableEcrivable[]>;
    getVariableByIdAsync(id: string): Promise<{ readonly key: string } | null>;
    getLocalVariableCollectionsAsync(): Promise<readonly CollectionEcrivable[]>;
    createVariable(nom: string, collection: CollectionEcrivable, type: string): VariableEcrivable;
    createVariableAlias(variable: VariableEcrivable): unknown;
    setBoundVariableForPaint?(peinture: unknown, champ: 'color', variable: object): unknown;
    setBoundVariableForEffect?(effet: unknown, champ: string, variable: object): unknown;
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
  /**
   * Le nom que chaque correction de scope ou d'alias de mode a lu sur sa variable, par identifiant de correction. Donné, il est
   * exigé : une correction absente de la table, ou dont la variable porte un autre nom, saute en `objet-change`.
   */
  readonly nomsLus?: ReadonlyMap<string, string>;
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
  nomsLus: ReadonlyMap<string, string> | undefined,
): Promise<Plan | MotifDeStructureSaute> {
  if (correction.sorte === 'variable') return planifierUneCreation(api, collections, locales, correction);
  const variable = trouverLaVariable(locales, correction.cible.variable);
  if (!variable || variable.remote) return 'objet-change';
  if (nomsLus && nomsLus.get(correction.id) !== variable.name) return 'objet-change';
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
export function ecrireLaStructure(corrections: readonly Correction[], options: OptionsDeStructure = {}): Promise<ResultatDEcritureDeStructure> {
  return pendantUneEcriture(() => ecrireLesCorrections(corrections, options));
}

async function ecrireLesCorrections(corrections: readonly Correction[], options: OptionsDeStructure): Promise<ResultatDEcritureDeStructure> {
  const api = options.api ?? apiDeFigma();
  const aEcrire = corrections.filter((correction) => correction.sorte === 'scope' || correction.sorte === 'alias-de-mode' || correction.sorte === 'variable');
  const ecrites: string[] = [];
  const sautees: StructureSautee[] = [];
  if (aEcrire.length === 0) return { ecrites, sautees, sansAnnulation: [] };
  if (lireLArchitectureDuFichier(api.root.getSharedPluginData(ESPACE_ARCHITECT, CLE_ARCHITECTURE_DU_FICHIER)) !== 'ucm') {
    return { ecrites, sautees: aEcrire.map(({ id }) => ({ id, motif: 'non-ucm' })), sansAnnulation: [] };
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
      try { plan = await planifier(api, collections, locales, correction, options.nomsLus); } catch { plan = 'erreur'; }
      if (typeof plan === 'string') sautees.push({ id: correction.id, motif: plan });
      else plans.push(plan);
    }
  } catch {
    return { ecrites, sautees: aEcrire.map(({ id }) => ({ id, motif: 'erreur' })), sansAnnulation: [] };
  }
  if (plans.length === 0) return { ecrites, sautees, sansAnnulation: [] };

  const prevu = rangerLeJournalDeStructure(stockage, { heure, lignes: plans.map(({ ligne }) => ligne) }, nouveauLot());
  if (!prevu) return { ecrites, sautees: [...sautees, ...plans.map(({ correction }) => ({ id: correction.id, motif: 'journal-impossible' as const }))], sansAnnulation: [] };

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
    return { ecrites, sautees, sansAnnulation: [] };
  }
  // Si la réécriture échoue, le journal prévu reste valide : l'annulation reconnaît une ligne jamais écrite à son état d'avant.
  const identiques = faites.length === plans.length && faites.every((ligne, rang) => ligne === plans[rang]?.ligne);
  const reecrit = identiques ? undefined : rangerLeJournalDeStructure(stockage, { heure, lignes: faites }, nouveauLot());
  const sansAnnulation = identiques || reecrit ? [] : faites.flatMap((ligne) => (ligne.sorte === 'creation' ? [ligne.nom] : []));
  nettoyerLeJournalDeStructure(stockage, (reecrit ?? prevu).cles);
  try {
    api.commitUndo();
  } catch {
    // Les écritures sont faites : un point d'annulation refusé ne les retire pas.
  }
  return { ecrites, sautees, sansAnnulation };
}

// La fusion

/** La clé des données partagées d'une variable que la fusion a retirée de l'usage : sa valeur dit la variable gardée. */
export const CLE_A_RETIRER = 'a-retirer';

export type MotifDeFusionSaute = MotifDeStructureSaute | 'non-pris-en-charge';

/** Une variable de la fusion telle que la lecture l'a vue : sa clé, et le nom que l'analyse lui a lu. */
export interface VariableDeFusion { readonly cle: string; readonly nom: string }

export interface DemandeDeFusion {
  readonly garde: VariableDeFusion;
  readonly autres: readonly VariableDeFusion[];
}

export interface ResultatDeFusion {
  /** Vrai quand chaque variable retirée est un alias de la gardée, marquée, et que tous les tokens et layers sont reliés. */
  readonly ecrite: boolean;
  /** Pourquoi la fusion n'est pas écrite en entier. */
  readonly motif?: MotifDeFusionSaute;
  /** Vrai quand une écriture a eu lieu, même sans fusion complète : l'analyse d'un composant se périme. */
  readonly touchee: boolean;
  /** Les alias de tokens et les liens de layers écrits. */
  readonly tokens: number;
  readonly layers: number;
}

const peintureLiee = (peinture: unknown): string | null => (estUnObjet(peinture) && estUnObjet(peinture.boundVariables) ? aliasExact(peinture.boundVariables.color) : null);

/**
 * Les emplacements d'un nœud lié à la variable `id`. Un emplacement se réécrit : `champ:<champ>` (champ numérique), `fills:<rang>` et
 * `strokes:<rang>` (peinture), `effets:<rang>:<champ>`, `plage:<début>-<fin>:<rang>` (peinture d'une plage de texte). `autre:…` est lié
 * à un endroit que la fusion ne sait pas réécrire.
 */
function emplacementsLies(noeud: NoeudDUsage, id: string): string[] {
  const liste: string[] = [];
  const lies = noeud.boundVariables;
  if (estUnObjet(lies)) {
    for (const [champ, valeur] of Object.entries(lies)) {
      if (champ === 'fills' || champ === 'strokes' || champ === 'effects') continue;
      if (aliasExact(valeur) === id) liste.push(`champ:${champ}`);
      else if (contientUnAlias(valeur, id)) liste.push(`autre:${champ}`);
    }
  }
  for (const nom of ['fills', 'strokes'] as const) {
    const peintures = noeud[nom];
    if (!Array.isArray(peintures)) continue;
    peintures.forEach((peinture, rang) => {
      if (peintureLiee(peinture) === id) liste.push(`${nom}:${rang}`);
      else if (contientUnAlias(peinture, id)) liste.push(`autre:${nom}:${rang}`);
    });
  }
  if (Array.isArray(noeud.effects)) {
    noeud.effects.forEach((effet, rang) => {
      const effetLie = estUnObjet(effet) && estUnObjet(effet.boundVariables) ? effet.boundVariables : {};
      for (const [champ, valeur] of Object.entries(effetLie)) {
        if (aliasExact(valeur) === id) liste.push(`effets:${rang}:${champ}`);
        else if (contientUnAlias(valeur, id)) liste.push(`autre:effets:${rang}:${champ}`);
      }
    });
  }
  if (noeud.type === 'TEXT' && typeof noeud.getStyledTextSegments === 'function') {
    for (const segment of noeud.getStyledTextSegments(['fills'])) {
      if (!Array.isArray(segment.fills)) continue;
      segment.fills.forEach((peinture, rang) => {
        if (peintureLiee(peinture) === id) liste.push(`plage:${segment.start}-${segment.end}:${rang}`);
        else if (contientUnAlias(peinture, id)) liste.push(`autre:plage:${segment.start}-${segment.end}:${rang}`);
      });
    }
  }
  return liste;
}

/** Vrai quand le nœud est lié à la variable `id` en un endroit quelconque : le filtre de `findAll`. */
function estLieA(noeud: NoeudDUsage, id: string): boolean {
  if (contientUnAlias(noeud.boundVariables, id) || contientUnAlias(noeud.fills, id) || contientUnAlias(noeud.strokes, id) || contientUnAlias(noeud.effects, id)) return true;
  if (noeud.type !== 'TEXT' || typeof noeud.getStyledTextSegments !== 'function') return false;
  return noeud.getStyledTextSegments(['boundVariables', 'fills']).some((segment) => contientUnAlias(segment.boundVariables, id) || contientUnAlias(segment.fills, id));
}

/** Lie `emplacement` du nœud à `variable`. Lève si Figma refuse ou si le nœud ne sait pas porter cette liaison. */
function relier(api: ApiDeStructure, noeud: NoeudDUsage, emplacement: string, variable: VariableEcrivable): void {
  const [sorte, a = '', b = ''] = emplacement.split(':');
  if (sorte === 'champ') {
    if (!noeud.setBoundVariable) throw new Error('Ce layer ne se lie pas à une variable.');
    noeud.setBoundVariable(a, variable);
    return;
  }
  if (sorte === 'fills' || sorte === 'strokes') {
    const peintures = noeud[sorte];
    if (!Array.isArray(peintures) || !api.variables.setBoundVariableForPaint) throw new Error('Ce layer ne lie pas une peinture.');
    const copie = [...peintures];
    copie[Number(a)] = api.variables.setBoundVariableForPaint(copie[Number(a)], 'color', variable);
    noeud[sorte] = copie;
    return;
  }
  if (sorte === 'effets') {
    if (!Array.isArray(noeud.effects) || !api.variables.setBoundVariableForEffect) throw new Error('Ce layer ne lie pas un effet.');
    const copie = [...noeud.effects];
    copie[Number(a)] = api.variables.setBoundVariableForEffect(copie[Number(a)], b, variable);
    noeud.effects = copie;
    return;
  }
  if (sorte === 'plage') {
    const [debut, fin] = a.split('-').map(Number);
    const segment = noeud.getStyledTextSegments?.(['fills']).find((candidat) => candidat.start === debut && candidat.end === fin);
    if (!segment || !Array.isArray(segment.fills) || !noeud.setRangeFills || !api.variables.setBoundVariableForPaint) throw new Error('Ce layer ne lie pas une plage de texte.');
    const copie = [...segment.fills];
    copie[Number(b)] = api.variables.setBoundVariableForPaint(copie[Number(b)], 'color', variable);
    noeud.setRangeFills(debut, fin, copie);
    return;
  }
  throw new Error('Emplacement inconnu.');
}

interface EtapeDeFusion { readonly ligne: LigneDeStructure; readonly ecrire: () => void; readonly sorte: 'token' | 'layer' | 'variable' | 'marque' }

/**
 * Fusionne `autres` dans `garde`. Relit tout avant d'écrire : les variables existent, portent le nom lu, sont locales, de même collection
 * et de même type ; aucune ne vise la gardée par un alias qui ferait une boucle ; chaque valeur d'une variable retirée est un alias
 * exact (une valeur directe ne se journalise pas). Le fichier entier se parcourt pour trouver les layers liés : un parcours qui lève
 * refuse la fusion (`erreur`), car un usage inconnu resterait lié à une variable retirée.
 */
export function fusionnerLesVariables(demande: DemandeDeFusion, options: OptionsDeStructure = {}): Promise<ResultatDeFusion> {
  return pendantUneEcriture(() => fusionner(demande, options));
}

async function fusionner(demande: DemandeDeFusion, options: OptionsDeStructure): Promise<ResultatDeFusion> {
  const api = options.api ?? apiDeFigma();
  const sans = (motif: MotifDeFusionSaute): ResultatDeFusion => ({ ecrite: false, motif, touchee: false, tokens: 0, layers: 0 });
  if (lireLArchitectureDuFichier(api.root.getSharedPluginData(ESPACE_ARCHITECT, CLE_ARCHITECTURE_DU_FICHIER)) !== 'ucm') return sans('non-ucm');
  const stockage = options.stockage ?? creerPortDeRegles(figma);
  const nouveauLot = options.lot ?? identifiantDeLot;
  const heure = (options.heure ?? heureActuelle)();

  let locales: readonly VariableEcrivable[];
  try { locales = await api.variables.getLocalVariablesAsync(); } catch { return sans('erreur'); }
  const garde = trouverLaVariable(locales, demande.garde.cle);
  const retirees = demande.autres.map(({ cle }) => trouverLaVariable(locales, cle));
  if (!garde || garde.remote || demande.autres.length === 0 || retirees.some((variable) => !variable || variable.remote)) return sans('objet-change');
  const aRetirer = retirees as VariableEcrivable[];
  if (garde.name !== demande.garde.nom || aRetirer.some((variable, rang) => variable.name !== demande.autres[rang]!.nom)) return sans('objet-change');
  if (aRetirer.some((variable) => variable.id === garde.id || variable.variableCollectionId !== garde.variableCollectionId || variable.resolvedType !== garde.resolvedType)) return sans('objet-change');
  if (!api.variables.setBoundVariableForPaint || !api.variables.setBoundVariableForEffect) return sans('non-pris-en-charge');
  const ids = new Set(aRetirer.map(({ id }) => id));
  // La gardée qui vise une variable retirée ferait une boucle avec l'alias de la retirée.
  if (Object.values(garde.valuesByMode).some((valeur) => { const vise = aliasExact(valeur); return vise !== null && ids.has(vise); })) return sans('fait-faux');
  if (aRetirer.some((variable) => Object.values(variable.valuesByMode).some((valeur) => aliasExact(valeur) === null))) return sans('fait-faux');

  let noeuds: readonly NoeudDUsage[];
  try {
    await api.loadAllPagesAsync();
    noeuds = api.root.findAll((noeud) => [...ids].some((id) => estLieA(noeud, id)));
  } catch { return sans('erreur'); }

  const etapes: EtapeDeFusion[] = [];
  const alias = api.variables.createVariableAlias(garde);
  // 1. Les tokens du fichier qui visaient une variable retirée.
  for (const variable of locales) {
    if (ids.has(variable.id) || variable.id === garde.id || variable.remote) continue;
    for (const [mode, valeur] of Object.entries(variable.valuesByMode)) {
      const vise = aliasExact(valeur);
      if (vise === null || !ids.has(vise)) continue;
      etapes.push({ sorte: 'token', ligne: { sorte: 'alias-de-mode', variable: variable.id, nom: variable.name, mode, avant: vise, apres: garde.id }, ecrire: () => variable.setValueForMode(mode, alias) });
    }
  }
  // 2. Les layers.
  for (const noeud of noeuds) {
    for (const retiree of aRetirer) {
      for (const emplacement of emplacementsLies(noeud, retiree.id)) {
        if (emplacement.startsWith('autre:')) return sans('non-pris-en-charge');
        etapes.push({ sorte: 'layer', ligne: { sorte: 'lien-de-layer', variable: noeud.id, nom: noeud.name ?? '', emplacement, avant: retiree.id, apres: garde.id }, ecrire: () => relier(api, noeud, emplacement, garde) });
      }
    }
  }
  // 3. Chaque variable retirée devient un alias de la gardée dans chaque mode, puis porte la marque.
  for (const retiree of aRetirer) {
    for (const [mode, valeur] of Object.entries(retiree.valuesByMode)) {
      const avant = aliasExact(valeur)!;
      if (avant === garde.id) continue;
      etapes.push({ sorte: 'variable', ligne: { sorte: 'alias-de-mode', variable: retiree.id, nom: retiree.name, mode, avant, apres: garde.id }, ecrire: () => retiree.setValueForMode(mode, alias) });
    }
    const marque = JSON.stringify({ garde: garde.key });
    if (retiree.getSharedPluginData?.(ESPACE_ARCHITECT, CLE_A_RETIRER) !== marque) {
      etapes.push({
        sorte: 'marque', ligne: { sorte: 'marque', variable: retiree.id, nom: retiree.name },
        ecrire: () => {
          if (!retiree.setSharedPluginData) throw new Error('Cette variable ne porte pas de données partagées.');
          retiree.setSharedPluginData(ESPACE_ARCHITECT, CLE_A_RETIRER, marque);
        },
      });
    }
  }
  if (etapes.length === 0) return sans('deja-la');

  const prevu = rangerLeJournalDeStructure(stockage, { heure, lignes: etapes.map(({ ligne }) => ligne) }, nouveauLot());
  if (!prevu) return sans('journal-impossible');

  const faites: EtapeDeFusion[] = [];
  let ratees = 0;
  for (const etape of etapes) {
    try {
      etape.ecrire();
      faites.push(etape);
    } catch {
      ratees += 1;
    }
  }
  if (faites.length === 0) {
    retirer(stockage, prevu);
    return { ecrite: false, motif: 'erreur', touchee: false, tokens: 0, layers: 0 };
  }
  // Si la réécriture échoue, le journal prévu reste valide : l'annulation reconnaît une ligne jamais écrite à son état d'avant.
  const reecrit = ratees === 0 ? undefined : rangerLeJournalDeStructure(stockage, { heure, lignes: faites.map(({ ligne }) => ligne) }, nouveauLot());
  nettoyerLeJournalDeStructure(stockage, (reecrit ?? prevu).cles);
  try {
    api.commitUndo();
  } catch {
    // Les écritures sont faites : un point d'annulation refusé ne les retire pas.
  }
  const compte = (sorte: EtapeDeFusion['sorte']): number => faites.filter((etape) => etape.sorte === sorte).length;
  return { ecrite: ratees === 0, ...(ratees === 0 ? {} : { motif: 'erreur' as const }), touchee: true, tokens: compte('token'), layers: compte('layer') };
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
  if (ligne.sorte === 'lien-de-layer') {
    const noeud = await api.getNodeByIdAsync?.(ligne.variable);
    const avant = locales.find((candidate) => candidate.id === ligne.avant);
    if (!noeud || !avant) return 'objet-change';
    if (emplacementsLies(noeud, ligne.avant).includes(ligne.emplacement)) return 'retablie';
    if (!emplacementsLies(noeud, ligne.apres).includes(ligne.emplacement)) return 'objet-change';
    relier(api, noeud, ligne.emplacement, avant);
    return 'defaite';
  }
  if (ligne.sorte === 'marque') {
    if (!variable || variable.remote || !variable.getSharedPluginData || !variable.setSharedPluginData) return 'objet-change';
    if (variable.getSharedPluginData(ESPACE_ARCHITECT, CLE_A_RETIRER) === '') return 'retablie';
    variable.setSharedPluginData(ESPACE_ARCHITECT, CLE_A_RETIRER, '');
    return 'defaite';
  }
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
export function annulerLeDernierLotDeStructure(options: OptionsDeStructure = {}): Promise<ResultatDeLAnnulationDeStructure> {
  return pendantUneEcriture(() => defaireLeDernierLot(options));
}

async function defaireLeDernierLot(options: OptionsDeStructure): Promise<ResultatDeLAnnulationDeStructure> {
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
      sautees.push({ variable: ligne.sorte === 'lien-de-layer' && ligne.nom !== '' ? ligne.nom : ligne.variable, sorte: ligne.sorte, motif: sort });
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

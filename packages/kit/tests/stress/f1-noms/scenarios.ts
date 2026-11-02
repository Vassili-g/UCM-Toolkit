/**
 * Générateurs de scénarios du stress test F1 (plan F1, sections 3.2 à 3.5) : le squelette de 12 noms inventés, les axes de
 * placement et les strates S1 à S17. Un scénario décrit un fichier de noms et ce que le plan en attend ; il n'appelle pas le kit
 * (l'exécution et l'oracle sont du lot 3). Chaque strate est un générateur : rien n'est gardé en mémoire d'un cas à l'autre.
 */
import { createHash } from 'node:crypto';
import { choisir, echantillon, entier, graineDe, melanger, mulberry32 } from '../commun/prng.js';
import { REGISTRES_ARCHITECTURE, REGISTRES_COMPOSANTS, COLLECTIONS, FORMES_ANCIENNES_DES_COLLECTIONS } from '../../../src/referentiel/architecture.js';
import type { EntreeInventaire, Inventaire } from '../../../src/nommage/inventaire.js';
import { distanceUnOuEchange, TERMES_COMPOSES, termeOuFormeConnu } from '../../../src/referentiel/termes-connus.js';
import { ABREVIATIONS, REGISTRES, SYNONYMES_COURANTS } from '../../../src/referentiel/vocabulaire.js';
import { collectionDe, segmentsDuNom, type Systeme } from './corpus.js';
import {
  candidatsADistanceUn, candidatsDeFormes, candidatsDeSynonymes, construireLeDictionnaire, vocabulaireDeReference,
  type Dictionnaire, type VocabulaireDeReference,
} from './dictionnaire.js';
import {
  CASSES, ecrireEnCasse, formeComposee, joindre, mutationsADeuxLettres, mutationsDe, OPERATEURS_DE_FAUTE, pluriels, SEPARATEURS,
  SUFFIXES_DE_FORME_COMPOSEE, terminaisons, voisinsAUneLettre, type Ecarteur, type Mutation, type OperateurDeFaute,
} from './mutations.js';

export const GRAINE_PAR_DEFAUT = 7001;
export const COLLECTION_HORS_UCM = 'tokens';

export interface NomDeScenario {
  readonly collection: string;
  /** Le chemin, segments séparés par `/`. */
  readonly nom: string;
}
export interface Attendu {
  /** La propriété du plan, par exemple `P-01`. */
  readonly propriete: string;
  readonly mot?: string;
  readonly reference?: string;
  readonly note?: string;
}
export interface SiteReel {
  readonly systeme: string;
  /** Le rang du nom dans le fichier `noms.json` du système. */
  readonly indice: number;
  /** Le rang du segment dans le nom converti (chemins `tirets`, collections `couche`). */
  readonly rang: number;
  /** Le rang du mot dans le segment, quand la casse découpe le segment en plusieurs mots (`colorNeutral`). */
  readonly rangDuMot: number;
  readonly mot: string;
  readonly mutant: string;
  readonly collection: string;
  /** Les sites d'un même lot s'exécutent dans la même passe. */
  readonly lot: number;
}
export interface Scenario {
  readonly id: string;
  readonly strate: string;
  readonly operateur: string;
  readonly terme: string;
  readonly axes: Readonly<Record<string, string | number>>;
  /** Le squelette et les noms du cas ; vide pour S16, dont les noms viennent du système. */
  readonly noms: readonly NomDeScenario[];
  readonly attendus: readonly Attendu[];
  /** Faux pour un cas que le plan mesure sans le juger (S3). */
  readonly oracle: boolean;
  /** La question du plan (Q-Fx) dont dépend la décision provisoire du cas. */
  readonly provisoire?: string;
  /** `non-classe` : le cas vient d'une liste de candidats que personne n'a encore classée. */
  readonly classement?: 'non-classe';
  readonly nonRenommables?: readonly string[];
  /** Les collections que `enInventaire` écrit telles quelles ; les autres prennent la casse des collections de l'architecture (`Theme`). */
  readonly collectionsBrutes?: readonly string[];
  readonly site?: SiteReel;
}

export interface Contexte {
  readonly graine: number;
  readonly systemes: readonly Systeme[];
  readonly vocabulaire: VocabulaireDeReference;
  readonly dictionnaire: Dictionnaire;
  readonly motsDuDictionnaire: ReadonlySet<string>;
  readonly ecarte: Ecarteur;
  readonly pool: readonly string[];
  /** Les termes alphabétiques de 3 lettres ou plus : la cible des fautes. */
  readonly termesCibles: readonly string[];
}

// ---------------------------------------------------------------------------------------------------------------- contexte

const SYLLABES = ['zo', 'vak', 'quin', 'dre', 'mup', 'fyr', 'glo', 'skar', 'twe', 'bluv', 'cnu', 'yax', 'plo', 'vri', 'zef', 'kwa', 'hun', 'jex', 'wob', 'ruz'];
const TAILLE_DU_POOL = 400;
/** Le pool ne dépend pas de la graine : le squelette reste le même d'un tirage à l'autre. */
const GRAINE_DU_POOL = 424242;

/** Des mots inventés qui n'en contiennent aucun du vocabulaire ni du dictionnaire et qui sont deux à deux à plus d'une lettre. */
function construireLePool(connus: readonly string[]): string[] {
  const tirer = mulberry32(GRAINE_DU_POOL);
  const pool: string[] = [];
  for (let essai = 0; essai < 20000 && pool.length < TAILLE_DU_POOL; essai++) {
    const mot = [0, 1, 2].map(() => choisir(tirer, SYLLABES)).join('');
    if (pool.includes(mot) || connus.some((connu) => mot.includes(connu))) continue;
    if (pool.some((autre) => distanceUnOuEchange(mot, autre))) continue;
    pool.push(mot);
  }
  if (pool.length < TAILLE_DU_POOL) throw new Error(`Le pool de mots inventés compte ${pool.length} mots, ${TAILLE_DU_POOL} attendus.`);
  return pool;
}

export function creerLeContexte(systemes: readonly Systeme[], graine: number = GRAINE_PAR_DEFAUT): Contexte {
  const vocabulaire = vocabulaireDeReference();
  const dictionnaire = construireLeDictionnaire(systemes);
  const motsDuDictionnaire = new Set(dictionnaire.mots.map((entree) => entree.mot));
  const connus = [...new Set([...vocabulaire.termes, ...motsDuDictionnaire])].filter((mot) => /^[a-z]{3,}$/.test(mot));
  const ecarte: Ecarteur = (mot) => vocabulaire.termes.has(mot) || motsDuDictionnaire.has(mot) || termeOuFormeConnu(mot);
  return {
    graine, systemes, vocabulaire, dictionnaire, motsDuDictionnaire, ecarte, pool: construireLePool(connus),
    termesCibles: vocabulaire.alphabetiques.filter((terme) => terme.length >= 3),
  };
}

// ---------------------------------------------------------------------------------------------------------------- squelette

const FORME_DU_SQUELETTE: readonly (readonly [string, number])[] = [
  ['theme', 3], ['theme', 2], ['theme', 1], ['components', 3], ['components', 2],
  ['layout', 2], ['layout', 1], ['layout', 3], ['primitives', 3], ['primitives', 2], ['primitives', 2], ['primitives', 1],
];
const DEBUT_DES_REMPLISSAGES = 40;

/** Le squelette : 12 noms de mots inventés dans quatre collections, qui ne forment aucune question. */
export function squelette(pool: readonly string[]): NomDeScenario[] {
  let rang = 0;
  return FORME_DU_SQUELETTE.map(([collection, profondeur]) => ({
    collection, nom: Array.from({ length: profondeur }, () => pool[rang++]).join('/'),
  }));
}

/** Pose les noms d'un cas sur le squelette ; les segments de remplissage viennent du pool, sans jamais répéter un nom. */
class Constructeur {
  readonly noms: NomDeScenario[];
  private readonly vus = new Set<string>();
  private compteur = 0;
  constructor(private readonly pool: readonly string[]) {
    this.noms = squelette(pool);
    for (const nom of this.noms) this.vus.add(`${nom.collection}|${nom.nom}`);
  }
  remplissage(): string {
    return this.pool[DEBUT_DES_REMPLISSAGES + (this.compteur++ % (this.pool.length - DEBUT_DES_REMPLISSAGES))];
  }
  /** Un mot du pool fixe, hors des remplissages : le voisin ou le parent d'un cas. */
  fixe(rang: number): string { return this.pool[20 + rang]; }
  ajouter(collection: string, segments: readonly string[]): void {
    const cle = `${collection}|${segments.join('/')}`;
    if (this.vus.has(cle)) return;
    this.vus.add(cle);
    this.noms.push({ collection, nom: segments.join('/') });
  }
  /**
   * `nombre` noms de profondeur `profondeur` dont le segment `rang` vaut `mot`. `voisin` fixe le segment qui précède (ou qui suit
   * à la racine) ; `autres` fixe les autres segments, dans l'ordre. Un segment non fixé est un remplissage propre au nom.
   */
  emploi(collection: string, mot: string, nombre: number, rang: number, profondeur: number, voisin?: string, autres?: Readonly<Record<number, string>>): void {
    const rangDuVoisin = profondeur === 1 ? -1 : rang > 0 ? rang - 1 : 1;
    for (let i = 0; i < nombre; i++) {
      const segments: string[] = [];
      for (let r = 0; r < profondeur; r++) {
        segments.push(r === rang ? mot : r === rangDuVoisin && voisin !== undefined ? voisin : autres?.[r] ?? this.remplissage());
      }
      this.ajouter(collection, segments);
    }
  }
}

const identifiant = (strate: string, operateur: string, terme: string, axes: Readonly<Record<string, string | number>>): string =>
  [strate, operateur, terme, ...Object.entries(axes).map(([cle, valeur]) => `${cle}=${valeur}`)].join('/');

function scenario(c: Constructeur, strate: string, operateur: string, terme: string, axes: Readonly<Record<string, string | number>>,
  attendus: readonly Attendu[], extra: Partial<Scenario> = {}): Scenario {
  return { id: identifiant(strate, operateur, terme, axes), strate, operateur, terme, axes, noms: c.noms, attendus, oracle: true, ...extra };
}

const tirageDe = (c: Contexte) => ({ graine: c.graine, ecarte: c.ecarte });
const termesDeComposants = new Set(REGISTRES_COMPOSANTS.flatMap((registre) => registre.termes.map((terme) => terme.id)));

// ---------------------------------------------------------------------------------------------------------------- données

export interface FormeTolerees { readonly registre: string; readonly terme: string; readonly forme: string }
/** Les formes tolérées des registres de couleur, d'état, de taille et d'architecture, doublons entre registres compris (52). */
export function formesTolerees(): FormeTolerees[] {
  return [...REGISTRES, ...REGISTRES_ARCHITECTURE].flatMap((registre) =>
    registre.termes.flatMap((terme) => (terme.toleres ?? []).map((forme) => ({ registre: registre.id, terme: terme.id, forme }))));
}

export interface PaireDeMots { readonly a: string; readonly b: string; readonly source: string }
/** Les 24 paires des groupes de `SYNONYMES_COURANTS`. */
export function pairesDeLaTable(): PaireDeMots[] {
  return SYNONYMES_COURANTS.flatMap((groupe) => groupe.flatMap((a, i) => groupe.slice(i + 1).map((b) => ({ a, b, source: 'table' }))));
}

/** Les paires de mots distincts légitimes écrites à la main (plan F1, 2.6). Une copie rangée dans `donnees/distincts.json` la remplacera au lot 4. */
export const PAIRES_DISTINCTES_ECRITES: readonly (readonly [string, string])[] = [
  ['fill', 'full'], ['top', 'tip'], ['gap', 'cap'], ['xs', 'xl'], ['light', 'right'], ['title', 'tile'], ['radius', 'radio'],
  ['color', 'colon'], ['border', 'bolder'], ['label', 'lable'], ['solid', 'solis'], ['focus', 'locus'],
  ['sm', 'md'], ['md', 'mid'], ['2xl', '3xl'], ['fill', 'film'], ['line', 'link'], ['text', 'next'], ['icon', 'iron'],
  ['bold', 'bolt'], ['mute', 'mate'], ['hint', 'mint'], ['tint', 'tent'], ['tone', 'zone'], ['base', 'vase'],
  ['pace', 'race'], ['size', 'sire'], ['card', 'cord'], ['gray', 'grey'], ['rose', 'nose'],
];
const NEGATIONS: readonly (readonly [string, string])[] = [['selected', 'unselected'], ['active', 'inactive'], ['visible', 'invisible']];
const FRERES_LEGITIMES: readonly (readonly [string, string])[] = [
  ['primary', 'secondary'], ['sm', 'md'], ['hover', 'pressed'], ['top', 'bottom'], ['success', 'warning'],
  ['left', 'right'], ['small', 'large'], ['light', 'dark'], ['start', 'end'], ['inner', 'outer'],
];
const COLLECTIONS_INCONNUES = ['Core', 'Global', 'Base', 'Semantic', 'Tokens', 'Alias'];

/** Les termes de plusieurs mots : propriétés composées, formes tolérées composées, puis identifiants composés des registres. */
export function termesDePlusieursMots(): string[] {
  const tolerees = formesTolerees().map((entree) => entree.forme).filter((forme) => forme.includes('-'));
  const identifiants = [...REGISTRES, ...REGISTRES_ARCHITECTURE, ...REGISTRES_COMPOSANTS].flatMap((registre) => registre.termes.map((terme) => terme.id)).filter((id) => /^[a-z]+(-[a-z]+)+$/.test(id));
  return [...new Set([...TERMES_COMPOSES, ...tolerees, ...identifiants])].slice(0, 25);
}

// ---------------------------------------------------------------------------------------------------------------- strates

type Strate = (c: Contexte) => Generator<Scenario>;

interface Placement {
  readonly collectionFautive: 'meme' | 'autre' | 'hors-ucm';
  readonly rang: number;
  readonly profondeur: number;
  readonly m: number;
  readonly k: number;
  readonly voisin: 'identique' | 'different';
}
const POSITIONS: readonly (readonly [number, number])[] = [[0, 1], [0, 3], [1, 3], [2, 3], [3, 5], [4, 5]];
const COLLECTION_DU_MOT_JUSTE = 'theme';
const COLLECTION_AUTRE = 'layout';
const REFERENCE: Placement = { collectionFautive: 'meme', rang: 1, profondeur: 3, m: 1, k: 8, voisin: 'identique' };

const collectionFautive = (valeur: Placement['collectionFautive']): string =>
  valeur === 'meme' ? COLLECTION_DU_MOT_JUSTE : valeur === 'autre' ? COLLECTION_AUTRE : COLLECTION_HORS_UCM;

/** Pose le mot juste (`k` noms) et le mot fautif (`m` noms) selon les axes A-01 à A-05. */
function placer(c: Constructeur, juste: string, fautif: string, placement: Placement): void {
  const { rang, profondeur, m, k } = placement;
  const voisinDuJuste = c.fixe(0), voisinDuFautif = placement.voisin === 'identique' ? voisinDuJuste : c.fixe(1);
  if (k > 0) c.emploi(COLLECTION_DU_MOT_JUSTE, juste, k, rang, profondeur, voisinDuJuste);
  c.emploi(collectionFautive(placement.collectionFautive), fautif, m, rang, profondeur, voisinDuFautif);
}

const axesDe = (placement: Placement, variante: string): Record<string, string | number> => ({
  variante, a01: placement.collectionFautive, a02: `${placement.rang}/${placement.profondeur}`, m: placement.m, k: placement.k, a05: placement.voisin,
});

const attenduDeFaute = (juste: string, fautif: string): Attendu[] =>
  [{ propriete: termesDeComposants.has(juste) ? 'P-04' : 'P-01', mot: fautif, reference: juste }];

function* s1(c: Contexte): Generator<Scenario> {
  for (const terme of c.termesCibles) {
    for (const operateur of OPERATEURS_DE_FAUTE) {
      for (const mutation of mutationsDe(terme, operateur, tirageDe(c))) {
        const constructeur = new Constructeur(c.pool);
        placer(constructeur, terme, mutation.mot, REFERENCE);
        yield scenario(constructeur, 'S1', operateur, terme, axesDe(REFERENCE, mutation.variante), attenduDeFaute(terme, mutation.mot));
      }
    }
  }
}

const PIVOTS = ['background', 'border', 'ring'];
const MUTATIONS_DE_S2: readonly (readonly [OperateurDeFaute, string])[] = [['M-03', 'deuxieme'], ['M-04', 'apres-premiere']];
const VALEURS_DE_M = [1, 2, 3, 5, 10];
const VALEURS_DE_K = [1, 2, 4, 5, 8, 20];

function* s2(c: Contexte): Generator<Scenario> {
  for (const pivot of PIVOTS) {
    for (const [operateur, variante] of MUTATIONS_DE_S2) {
      const mutation = mutationsDe(pivot, operateur, tirageDe(c)).find((candidate) => candidate.variante === variante);
      if (!mutation) continue;
      for (const collection of ['meme', 'autre', 'hors-ucm'] as const) {
        for (const [rang, profondeur] of POSITIONS) {
          for (const m of VALEURS_DE_M) {
            const combinaisons: [number, Placement['voisin']][] = [[0, 'identique']];
            for (const k of VALEURS_DE_K) for (const voisin of ['identique', 'different'] as const) combinaisons.push([k, voisin]);
            for (const [k, voisin] of combinaisons) {
              const placement: Placement = { collectionFautive: collection, rang, profondeur, m, k, voisin };
              const constructeur = new Constructeur(c.pool);
              placer(constructeur, pivot, mutation.mot, placement);
              yield scenario(constructeur, 'S2', operateur, pivot, axesDe(placement, variante), attenduDeFaute(pivot, mutation.mot));
            }
          }
        }
      }
    }
  }
}

function* s3(c: Contexte): Generator<Scenario> {
  for (const terme of c.termesCibles) {
    for (const mutation of mutationsADeuxLettres(terme, 2, tirageDe(c))) {
      const constructeur = new Constructeur(c.pool);
      placer(constructeur, terme, mutation.mot, REFERENCE);
      yield scenario(constructeur, 'S3', 'M-06', terme, axesDe(REFERENCE, mutation.variante), attenduDeFaute(terme, mutation.mot), { oracle: false });
    }
  }
}

/** Trois mutations par mot, tirées parmi M-01 à M-05 : le même mot donne les mêmes trois d'une exécution à l'autre. */
function troisMutations(mot: string, c: Contexte, nombre = 3): Mutation[] {
  const toutes = OPERATEURS_DE_FAUTE.flatMap((operateur) => mutationsDe(mot, operateur, tirageDe(c)));
  return echantillon(mulberry32(graineDe(c.graine, `${mot}/trois`)), toutes, nombre);
}

function* s4(c: Contexte): Generator<Scenario> {
  const eligibles = c.dictionnaire.mots.filter((entree) => entree.df >= 3 && entree.mot.length >= 5 && !c.vocabulaire.termes.has(entree.mot)).map((entree) => entree.mot);
  for (const mot of echantillon(mulberry32(graineDe(c.graine, 'S4')), eligibles, 40).sort()) {
    for (const mutation of troisMutations(mot, c)) {
      for (const k of [2, 5, 8]) for (const m of [1, 2, 3]) {
        const placement: Placement = { ...REFERENCE, m, k };
        const constructeur = new Constructeur(c.pool);
        placer(constructeur, mot, mutation.mot, placement);
        yield scenario(constructeur, 'S4', mutation.operateur, mot, axesDe(placement, mutation.variante),
          [{ propriete: 'P-06', mot: mutation.mot, reference: mot }], { provisoire: 'Q-F1' });
      }
    }
  }
}

function* s5(c: Contexte): Generator<Scenario> {
  for (const { registre, terme, forme } of formesTolerees()) {
    for (const suffixe of SUFFIXES_DE_FORME_COMPOSEE) {
      for (const attache of ['suffixe', 'prefixe'] as const) {
        for (const parent of ['avec', 'sans'] as const) {
          const composee = formeComposee(forme, suffixe, attache);
          const constructeur = new Constructeur(c.pool);
          const voisin = constructeur.fixe(0);
          if (parent === 'avec') constructeur.emploi('theme', terme, 3, 1, 3, voisin);
          constructeur.emploi('theme', composee, 1, 1, 3, voisin);
          yield scenario(constructeur, 'S5', 'M-09', `${registre}:${forme}`, { suffixe, attache, terme: parent }, [{ propriete: 'P-12', mot: composee, reference: terme }]);
        }
      }
    }
  }
}

const FREQUENCES_DE_PAIRE: readonly (readonly [number, number])[] = [[1, 1], [1, 5], [5, 1], [5, 5]];

function* s6(c: Contexte): Generator<Scenario> {
  const abreviations = Object.entries(ABREVIATIONS).map(([a, b]) => ({ a, b, source: 'abreviation' }));
  const tolerees = formesTolerees().map((entree) => ({ a: entree.forme, b: entree.terme, source: `tolere:${entree.registre}` }));
  const dictionnaire = candidatsDeSynonymes(c.systemes, c.dictionnaire).map((paire) => ({ a: paire.a, b: paire.b, source: 'dictionnaire' }));
  const table = pairesDeLaTable();
  for (const paire of [...table, ...tolerees, ...abreviations, ...dictionnaire]) {
    const operateur = paire.source.startsWith('tolere') ? 'M-08' : 'M-07';
    const extra: Partial<Scenario> = paire.source === 'dictionnaire' ? { classement: 'non-classe' } : {};
    const attendus: Attendu[] = [{ propriete: paire.source.startsWith('tolere') ? 'P-10' : 'P-14', mot: paire.a, reference: paire.b }];
    const terme = `${paire.source}:${paire.a}|${paire.b}`;
    for (const [fa, fb] of FREQUENCES_DE_PAIRE) {
      for (const parente of ['freres', 'cousins'] as const) {
        const constructeur = new Constructeur(c.pool);
        const suivant = constructeur.fixe(2);
        if (parente === 'freres') {
          const parent = constructeur.fixe(3);
          constructeur.emploi('theme', paire.a, fa, 1, 3, parent, { 2: suivant });
          constructeur.emploi('theme', paire.b, fb, 1, 3, parent, { 2: suivant });
        } else {
          constructeur.emploi('theme', paire.a, fa, 1, 3, constructeur.fixe(3), { 2: suivant });
          constructeur.emploi('theme', paire.b, fb, 1, 3, constructeur.fixe(4), { 2: suivant });
        }
        yield scenario(constructeur, 'S6', operateur, terme, { parente, fa, fb }, attendus, extra);
      }
    }
    for (const [mot, n] of [[paire.a, 1], [paire.a, 5], [paire.b, 1], [paire.b, 5]] as const) {
      const constructeur = new Constructeur(c.pool);
      constructeur.emploi('theme', mot, n, 1, 3, constructeur.fixe(3), { 2: constructeur.fixe(2) });
      yield scenario(constructeur, 'S6', operateur, terme, { parente: 'isoles', seul: mot === paire.a ? 'a' : 'b', n }, attendus,
        { ...extra, ...(paire.source === 'table' ? { provisoire: 'Q-F5' } : {}) });
    }
  }
  for (const paire of table) {
    for (const [fa, fb] of FREQUENCES_DE_PAIRE) {
      const constructeur = new Constructeur(c.pool);
      constructeur.emploi('theme', paire.a, fa, 1, 3, constructeur.fixe(3), { 2: constructeur.fixe(2) });
      constructeur.emploi('components', paire.b, fb, 1, 3, constructeur.fixe(3), { 2: constructeur.fixe(2) });
      yield scenario(constructeur, 'S6', 'M-07', `table:${paire.a}|${paire.b}`, { parente: 'collections', fa, fb }, [{ propriete: 'P-14', mot: paire.a, reference: paire.b }]);
    }
  }
}

const TYPES_DE_SEGMENT = ['variable', 'groupe', 'mixte'] as const;
type TypeDeSegment = (typeof TYPES_DE_SEGMENT)[number];

/**
 * Pose `base` (3 noms) et `forme` (1 nom) à la même place selon le type du segment : dernier segment, groupe, ou mot de rangs
 * différents (un groupe d'un côté, une variable de l'autre).
 */
function paireDeFormes(c: Constructeur, base: string, forme: string, type: TypeDeSegment): void {
  const voisin = c.fixe(0);
  if (type === 'variable') {
    c.emploi('theme', base, 3, 1, 2, voisin);
    c.emploi('theme', forme, 1, 1, 2, voisin);
  } else if (type === 'groupe') {
    c.emploi('theme', base, 3, 0, 2, undefined, { 1: c.fixe(1) });
    c.emploi('theme', forme, 1, 0, 2, undefined, { 1: c.fixe(1) });
  } else {
    c.emploi('theme', base, 3, 1, 2, voisin);
    c.emploi('theme', forme, 1, 0, 2, undefined, { 1: voisin });
  }
}

function* s7(c: Contexte): Generator<Scenario> {
  const formes = candidatsDeFormes(c.dictionnaire);
  const bases: { terme: string; forme: string; propriete: string; operateur: string; extra: Partial<Scenario> }[] = [];
  for (const terme of c.termesCibles) {
    for (const forme of pluriels(terme)) bases.push({ terme, forme, propriete: 'P-13', operateur: 'M-10', extra: {} });
  }
  for (const entree of formesTolerees()) bases.push({ terme: `${entree.registre}:${entree.forme}`, forme: `${entree.forme}s`, propriete: 'P-13', operateur: 'M-10', extra: {} });
  for (const paire of formes.filter((p) => p.terminaison === 's' || p.terminaison === 'es')) {
    bases.push({ terme: `dictionnaire:${paire.base}`, forme: paire.forme, propriete: 'P-15', operateur: 'M-10', extra: { classement: 'non-classe' } });
  }
  for (const terme of c.termesCibles) {
    for (const forme of terminaisons(terme)) bases.push({ terme, forme, propriete: 'P-15', operateur: 'M-11', extra: {} });
  }
  for (const paire of formes.filter((p) => p.terminaison !== 's' && p.terminaison !== 'es')) {
    bases.push({ terme: `dictionnaire:${paire.base}`, forme: paire.forme, propriete: 'P-15', operateur: 'M-11', extra: { classement: 'non-classe' } });
  }
  for (const { terme, forme, propriete, operateur, extra } of bases) {
    const base = terme.includes(':') ? (terme.startsWith('dictionnaire:') ? terme.slice('dictionnaire:'.length) : terme.slice(terme.indexOf(':') + 1)) : terme;
    for (const type of TYPES_DE_SEGMENT) {
      const constructeur = new Constructeur(c.pool);
      paireDeFormes(constructeur, base, forme, type);
      yield scenario(constructeur, 'S7', operateur, terme, { forme, type }, [{ propriete, mot: forme, reference: base }], extra);
    }
  }
}

const PARTS_DE_CONVENTION = [1, 10, 19] as const;
const TYPES_ORDINAIRES = ['variable', 'groupe'] as const;

/** 20 noms de 3 segments, dont `nombre` portent `ecrit` et les autres `dominant`, au rang 2 (variable) ou 1 (groupe). */
function convention(c: Constructeur, ecrit: string, dominant: string, nombre: number, type: 'variable' | 'groupe'): void {
  const rang = type === 'variable' ? 2 : 1;
  for (let i = 0; i < 20; i++) {
    const segments = [c.remplissage(), c.remplissage(), c.remplissage()];
    segments[rang] = i < nombre ? ecrit : dominant;
    c.ajouter('theme', segments);
  }
}

function* s8(c: Contexte): Generator<Scenario> {
  const eligibles = c.termesCibles.filter((terme) => terme.length >= 4);
  for (const terme of echantillon(mulberry32(graineDe(c.graine, 'S8')), eligibles, 30).sort()) {
    const faute = OPERATEURS_DE_FAUTE.flatMap((operateur) => mutationsDe(terme, operateur, tirageDe(c)))[0]?.mot;
    for (const casse of CASSES) {
      for (const nature of ['juste', 'fautif'] as const) {
        const mot = nature === 'juste' ? terme : faute;
        if (mot === undefined) continue;
        for (const part of PARTS_DE_CONVENTION) {
          for (const type of TYPES_ORDINAIRES) {
            const constructeur = new Constructeur(c.pool);
            const voisin = constructeur.fixe(0);
            const ecrit = ecrireEnCasse(mot, casse, voisin);
            convention(constructeur, ecrit, mot, part, type);
            yield scenario(constructeur, 'S8', 'M-12', terme, { casse, nature, part: `${part}/20`, type },
              [{ propriete: 'P-17', mot: ecrit, reference: terme, note: nature === 'juste' ? 'renommage d\'écriture, aucune question de faute' : 'la faute reste détectée' }]);
          }
        }
      }
    }
  }
}

function* s9(c: Contexte): Generator<Scenario> {
  for (const terme of termesDePlusieursMots()) {
    const mots = terme.split('-');
    for (const separateur of SEPARATEURS) {
      for (const part of PARTS_DE_CONVENTION) {
        for (const type of TYPES_ORDINAIRES) {
          const constructeur = new Constructeur(c.pool);
          convention(constructeur, joindre(mots, separateur), terme, part, type);
          yield scenario(constructeur, 'S9', 'M-13', terme, { separateur, part: `${part}/20`, type }, [{ propriete: 'P-17', mot: joindre(mots, separateur), reference: terme }]);
        }
      }
    }
  }
  for (const terme of termesDePlusieursMots()) {
    const mots = terme.split('-');
    const derniere = OPERATEURS_DE_FAUTE.flatMap((operateur) => mutationsDe(mots[mots.length - 1], operateur, tirageDe(c)))[0]?.mot;
    if (derniere === undefined) continue;
    const soude = joindre([...mots.slice(0, -1), derniere], 'soude');
    for (const type of TYPES_ORDINAIRES) {
      const constructeur = new Constructeur(c.pool);
      constructeur.emploi('theme', soude, 1, type === 'variable' ? 2 : 1, 3, constructeur.fixe(0));
      yield scenario(constructeur, 'S9', 'M-14', terme, { variante: 'soude-fautif', type }, [{ propriete: 'P-16', mot: soude, reference: terme }]);
    }
  }
}

function* s10(c: Contexte): Generator<Scenario> {
  const connu = (mot: string) => c.ecarte(mot) || TERMES_COMPOSES.some((terme) => terme.replace(/-/g, '') === mot);
  const couples: [string, string][] = [];
  for (const a of c.termesCibles) for (const b of c.termesCibles) if (a !== b && !connu(a + b)) couples.push([a, b]);
  const tires = echantillon(mulberry32(graineDe(c.graine, 'S10')), couples, 150).sort((x, y) => (x[0] + x[1]).localeCompare(y[0] + y[1]));
  for (const [a, b] of tires) {
    const soude = a + b;
    for (const frequence of [1, 2, 5]) {
      for (const etat of ['deux', 'une', 'aucune'] as const) {
        const constructeur = new Constructeur(c.pool);
        const voisin = constructeur.fixe(0);
        if (etat !== 'aucune') constructeur.emploi('theme', a, 3, 1, 3, voisin);
        if (etat === 'deux') constructeur.emploi('theme', b, 3, 1, 3, voisin);
        constructeur.emploi('theme', soude, frequence, 1, 3, voisin);
        yield scenario(constructeur, 'S10', 'M-14', `${a}+${b}`, { frequence, parties: etat }, [{ propriete: 'P-16', mot: soude, reference: `${a} ${b}` }]);
      }
    }
  }
}

const NOMBRES_DE_BRANCHES = [2, 3, 6, 12, 13, 20];
const NOMBRES_D_ENTREES = [2, 10, 50, 200, 201];
const PARTS_COMMUNES = [60, 80, 100];
const NATURES_DE_DIFFERENCE = ['faute', 'synonyme', 'distincts', 'negation', 'deux-termes'] as const;

/** `branches` branches sœurs sous un parent ; deux d'entre elles portent la paire (a, b), les autres des mots inventés. */
function brancher(c: Constructeur, a: string, b: string, branches: number, entrees: number, part: number): void {
  const parParBranche = Math.max(1, Math.ceil(entrees / branches));
  const communs = Math.min(parParBranche, Math.max(1, Math.round((parParBranche * part) / 100)));
  const parent = c.fixe(0);
  const mots = [a, b, ...Array.from({ length: Math.max(0, branches - 2) }, (_, i) => c.fixe(10 + i))];
  for (const mot of mots) {
    for (let i = 0; i < parParBranche; i++) {
      c.ajouter('theme', [parent, mot, i < communs ? c.fixe(40 + i) : c.remplissage()]);
    }
  }
}

function* s11(c: Contexte): Generator<Scenario> {
  for (const branches of NOMBRES_DE_BRANCHES) for (const entrees of NOMBRES_D_ENTREES) for (const part of PARTS_COMMUNES) {
    for (const nature of NATURES_DE_DIFFERENCE) {
      const tirer = mulberry32(graineDe(c.graine, `S11/${branches}/${entrees}/${part}/${nature}`));
      let paire: readonly [string, string];
      if (nature === 'faute') {
        const terme = choisir(tirer, c.termesCibles.filter((t) => t.length >= 5));
        const mutation = OPERATEURS_DE_FAUTE.flatMap((operateur) => mutationsDe(terme, operateur, tirageDe(c)))[0];
        paire = [terme, mutation.mot];
      } else if (nature === 'synonyme') {
        const retenue = choisir(tirer, pairesDeLaTable());
        paire = [retenue.a, retenue.b];
      } else paire = choisir(tirer, nature === 'distincts' ? PAIRES_DISTINCTES_ECRITES : nature === 'negation' ? NEGATIONS : FRERES_LEGITIMES);
      const constructeur = new Constructeur(c.pool);
      brancher(constructeur, paire[0], paire[1], branches, entrees, part);
      const question = nature === 'faute' || nature === 'synonyme';
      yield scenario(constructeur, 'S11', 'M-15', `${paire[0]}|${paire[1]}`, { nature, branches, entrees, communs: part },
        [{ propriete: 'P-18', mot: paire[1], reference: paire[0], note: question ? 'question de branches parallèles attendue' : 'aucune question attendue' }]);
    }
  }
  for (const [a, b] of FRERES_LEGITIMES) for (const branches of NOMBRES_DE_BRANCHES) {
    const constructeur = new Constructeur(c.pool);
    brancher(constructeur, a, b, branches, 10, 100);
    yield scenario(constructeur, 'S11', 'M-15', `${a}|${b}`, { nature: 'legitimes', branches, entrees: 10, communs: 100 },
      [{ propriete: 'P-18', mot: b, reference: a, note: 'aucune question attendue' }]);
  }
}

const ECRITURES_DE_COLLECTION = [
  'casse-initiale', 'casse-majuscules', 'casse-interne', 'pluriel', 'faute-M-01', 'faute-M-02', 'faute-M-03', 'faute-M-04',
  'separateur-tiret', 'separateur-soulignement', 'separateur-espace',
] as const;
const ECRITURE_PAR_NOM = (nom: string, ecriture: (typeof ECRITURES_DE_COLLECTION)[number], c: Contexte, rempli: string): string | undefined => {
  switch (ecriture) {
    case 'casse-initiale': return ecrireEnCasse(nom, 'initiale', '');
    case 'casse-majuscules': return nom.toUpperCase();
    case 'casse-interne': return ecrireEnCasse(nom, 'interne', '');
    case 'pluriel': return `${nom}s`;
    case 'separateur-tiret': return `${nom}-${rempli}`;
    case 'separateur-soulignement': return `${nom}_${rempli}`;
    case 'separateur-espace': return `${nom} ${rempli}`;
    default: return mutationsDe(nom, ecriture.slice('faute-'.length) as OperateurDeFaute, tirageDe(c))[0]?.mot;
  }
};

function* s12(c: Contexte): Generator<Scenario> {
  const variantes: { terme: string; ecriture: string; ecrite: string; reference: string }[] = [];
  const rempli = c.pool[30];
  for (const collection of COLLECTIONS) {
    for (const ecriture of ECRITURES_DE_COLLECTION) {
      const ecrite = ECRITURE_PAR_NOM(collection, ecriture, c, rempli);
      if (ecrite !== undefined) variantes.push({ terme: collection, ecriture, ecrite, reference: collection });
    }
  }
  for (const [ancien] of Object.entries(FORMES_ANCIENNES_DES_COLLECTIONS)) {
    for (const casse of ['initiale', 'majuscules', 'interne'] as const) {
      variantes.push({ terme: ancien, ecriture: `ancienne-${casse}`, ecrite: ecrireEnCasse(ancien.replace(/-/g, ''), casse, ''), reference: FORMES_ANCIENNES_DES_COLLECTIONS[ancien] });
    }
  }
  for (const inconnue of COLLECTIONS_INCONNUES) variantes.push({ terme: inconnue, ecriture: 'inconnue', ecrite: inconnue, reference: '' });
  for (const { terme, ecriture, ecrite, reference } of variantes) {
    for (const variables of [1, 10]) {
      const constructeur = new Constructeur(c.pool);
      constructeur.emploi(ecrite, constructeur.fixe(5), variables, 1, 2, constructeur.fixe(6));
      yield scenario(constructeur, 'S12', 'M-16', terme, { ecriture, variables }, [{ propriete: 'P-19', mot: ecrite, reference }], { collectionsBrutes: [ecrite] });
    }
  }
}

const POSITIONS_DU_TERME_UCM = ['meme-dossier', 'absent', 'autre-dossier'] as const;
const NATURES_DE_COLLISION = ['casse', 'separateur', 'terme-du-fichier', 'groupe-devenu-token', 'non-renommable', 'destination-commune'] as const;

function* s13(c: Contexte): Generator<Scenario> {
  for (const { registre, terme, forme } of formesTolerees()) {
    for (const position of POSITIONS_DU_TERME_UCM) for (const type of TYPES_ORDINAIRES) for (const frequence of [1, 5]) {
      const constructeur = new Constructeur(c.pool);
      const rang = type === 'variable' ? 2 : 1;
      const parent = constructeur.fixe(0);
      constructeur.emploi('theme', forme, frequence, rang, 3, parent, rang === 2 ? { 0: constructeur.fixe(1) } : { 2: constructeur.fixe(2) });
      if (position === 'meme-dossier') constructeur.emploi('theme', terme, 1, rang, 3, parent, rang === 2 ? { 0: constructeur.fixe(1) } : { 2: constructeur.fixe(2) });
      if (position === 'autre-dossier') constructeur.emploi('theme', terme, 1, rang, 3, constructeur.fixe(7), rang === 2 ? { 0: constructeur.fixe(1) } : { 2: constructeur.fixe(2) });
      yield scenario(constructeur, 'S13', 'M-17', `${registre}:${forme}`, { terme: position, type, frequence },
        [{ propriete: position === 'meme-dossier' ? 'P-11' : 'P-10', mot: forme, reference: terme }, ...(position === 'meme-dossier' ? [{ propriete: 'P-20', mot: forme, reference: terme }] : [])]);
    }
  }
  const tolerees = formesTolerees();
  for (const nature of NATURES_DE_COLLISION) {
    for (const type of TYPES_ORDINAIRES) for (const frequence of [1, 5]) for (const sources of [1, 2, 3]) {
      const constructeur = new Constructeur(c.pool);
      const rang = type === 'variable' ? 2 : 1;
      const parent = constructeur.fixe(0);
      const mot = constructeur.fixe(3);
      const complete = (valeur: string, nombre: number) => constructeur.emploi('theme', valeur, nombre, rang, 3, parent, rang === 2 ? { 0: constructeur.fixe(1) } : { 2: constructeur.fixe(2) });
      const protegees: string[] = [];
      const { terme, forme } = tolerees[entier(mulberry32(graineDe(c.graine, `S13/${nature}`)), 0, tolerees.length - 1)];
      switch (nature) {
        case 'casse': complete(mot, frequence); for (const variante of [mot.toUpperCase(), ecrireEnCasse(mot, 'initiale', '')].slice(0, sources)) complete(variante, frequence); break;
        case 'separateur': complete(joindre([mot, 'x'], 'tiret'), frequence); ['soulignement', 'espace', 'camel'].slice(0, sources - 1).forEach((sep) => complete(joindre([mot, 'x'], sep as 'soulignement'), frequence)); break;
        case 'terme-du-fichier': complete(terme, 1); complete(forme, frequence); break;
        case 'groupe-devenu-token': constructeur.ajouter('theme', [parent, mot]); for (let i = 0; i < sources; i++) constructeur.ajouter('theme', [parent, mot, constructeur.remplissage()]); complete(mot, frequence); break;
        case 'non-renommable': complete(terme, 1); complete(forme, frequence); protegees.push(`theme|${parent}/${forme}`); break;
        case 'destination-commune': complete(terme, 1); for (const variante of tolerees.filter((entree) => entree.terme === terme).slice(0, sources)) complete(variante.forme, frequence); complete(forme, frequence); break;
      }
      yield scenario(constructeur, 'S13', 'M-17', nature, { type, frequence, sources }, [{ propriete: 'P-20', note: 'une question ou une carte de résolution désigne la collision' }],
        protegees.length ? { nonRenommables: protegees } : {});
    }
  }
}

function* s14(c: Contexte): Generator<Scenario> {
  const eligibles = formesTolerees().filter((entree) => entree.forme.length >= 5 && /^[a-z]+$/.test(entree.forme)).map((entree) => entree.forme);
  const formes = echantillon(mulberry32(graineDe(c.graine, 'S14/formes')), [...new Set(eligibles)].sort(), 20).sort();
  for (const forme of formes) {
    for (const mutation of troisMutations(forme, c)) {
      const constructeur = new Constructeur(c.pool);
      placer(constructeur, forme, mutation.mot, { ...REFERENCE, k: 0 });
      yield scenario(constructeur, 'S14', mutation.operateur, forme, axesDe({ ...REFERENCE, k: 0 }, mutation.variante), [{ propriete: 'P-10', mot: mutation.mot, reference: forme }]);
    }
  }
  const termes = echantillon(mulberry32(graineDe(c.graine, 'S14/termes')), c.termesCibles.filter((terme) => terme.length >= 4), 20).sort();
  for (const terme of termes) {
    for (const mutation of troisMutations(terme, c)) {
      const mot = `${mutation.mot}s`;
      const constructeur = new Constructeur(c.pool);
      placer(constructeur, terme, mot, REFERENCE);
      yield scenario(constructeur, 'S14', mutation.operateur, terme, { ...axesDe(REFERENCE, mutation.variante), pluriel: 's' }, [{ propriete: 'P-01', mot, reference: terme }]);
    }
  }
}

function* s15(c: Contexte): Generator<Scenario> {
  const paires: PaireDeMots[] = [
    ...candidatsADistanceUn(c.dictionnaire).map((paire) => ({ a: paire.a, b: paire.b, source: 'dictionnaire' })),
    ...PAIRES_DISTINCTES_ECRITES.map(([a, b]) => ({ a, b, source: 'main' })),
  ];
  for (const { a, b, source } of paires) {
    for (const [fa, fb] of [[1, 1], [1, 5], [5, 1], [2, 8]]) {
      const constructeur = new Constructeur(c.pool);
      const voisin = constructeur.fixe(0);
      constructeur.emploi('theme', a, fa, 1, 3, voisin);
      constructeur.emploi('theme', b, fb, 1, 3, voisin);
      yield scenario(constructeur, 'S15', 'distincts', `${source}:${a}|${b}`, { fa, fb }, [{ propriete: 'P-09', mot: b, reference: a, note: 'aucune question de faute' }],
        source === 'dictionnaire' ? { classement: 'non-classe' } : {});
    }
  }
}

const OPERATEURS_DE_S16 = ['M-01', 'M-02', 'M-03', 'M-04', 'M-08', 'M-07'] as const;
const SITES_PAR_PASSE = 20;

function mutantDuSite(mot: string, operateur: (typeof OPERATEURS_DE_S16)[number], c: Contexte, tirer: () => number): string | undefined {
  if (operateur === 'M-08') {
    const formes = formesTolerees().filter((entree) => entree.terme === mot).map((entree) => entree.forme);
    return formes.length ? choisir(tirer, formes) : undefined;
  }
  if (operateur === 'M-07') {
    const groupe = SYNONYMES_COURANTS.find((candidat) => (candidat as readonly string[]).includes(mot));
    return groupe ? choisir(tirer, (groupe as readonly string[]).filter((autre) => autre !== mot)) : undefined;
  }
  const mutations = mutationsDe(mot, operateur, tirageDe(c));
  return mutations.length ? choisir(tirer, mutations).mot : undefined;
}

function* s16(c: Contexte): Generator<Scenario> {
  const cibles = new Set(c.termesCibles);
  for (const systeme of c.systemes) {
    const sites: { indice: number; rang: number; rangDuMot: number; mot: string; collection: string }[] = [];
    systeme.noms.forEach((nom, indice) => {
      segmentsDuNom(nom.nom, 'tirets').forEach((segment, rang) => {
        segment.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ').forEach((morceau, rangDuMot) => {
          const mot = morceau.toLowerCase();
          if (cibles.has(mot)) sites.push({ indice, rang, rangDuMot, mot, collection: collectionDe(nom, 'couche') });
        });
      });
    });
    for (const operateur of OPERATEURS_DE_S16) {
      const tirer = mulberry32(graineDe(c.graine, `S16/${systeme.id}/${operateur}`));
      const seaux = new Map<string, typeof sites>();
      for (const site of melanger(tirer, sites)) {
        const cle = `${site.collection}|${Math.min(site.rang, 3)}`;
        seaux.set(cle, [...(seaux.get(cle) ?? []), site]);
      }
      const ordre = [...seaux.keys()].sort();
      const lots: { mot: string; mutant: string }[][] = [[], []];
      const retenus: SiteReel[] = [];
      for (let tour = 0; retenus.length < 2 * SITES_PAR_PASSE && tour < sites.length; tour++) {
        const seau = seaux.get(ordre[tour % ordre.length])!;
        const site = seau[Math.floor(tour / ordre.length)];
        if (!site) continue;
        const mutant = mutantDuSite(site.mot, operateur, c, tirer);
        if (mutant === undefined || mutant === site.mot) continue;
        const lot = lots.findIndex((membres) => membres.length < SITES_PAR_PASSE
          && !membres.some((membre) => membre.mot === site.mot || distanceUnOuEchange(membre.mutant, mutant)));
        if (lot < 0) continue;
        lots[lot].push({ mot: site.mot, mutant });
        retenus.push({ systeme: systeme.id, indice: site.indice, rang: site.rang, rangDuMot: site.rangDuMot, mot: site.mot, mutant, collection: site.collection, lot });
      }
      for (const site of retenus) {
        yield {
          id: identifiant('S16', operateur, site.mot, { systeme: systeme.id, nom: site.indice, rang: site.rang, mot: site.rangDuMot }), strate: 'S16', operateur, terme: site.mot,
          axes: { systeme: systeme.id, lot: site.lot }, noms: [],
          attendus: [{ propriete: operateur === 'M-07' ? 'P-14' : operateur === 'M-08' ? 'P-10' : 'P-01', mot: site.mutant, reference: site.mot }],
          oracle: true, site,
        };
      }
    }
  }
}

function* s17(c: Contexte): Generator<Scenario> {
  const termes = c.vocabulaire.alphabetiques.filter((terme) => terme.length >= 4);
  const parMot = new Map<string, Set<string>>();
  for (const terme of termes) {
    for (const voisin of voisinsAUneLettre(terme)) {
      if (voisin.length < 4 || c.vocabulaire.termes.has(voisin)) continue;
      parMot.set(voisin, (parMot.get(voisin) ?? new Set()).add(terme));
    }
  }
  const ambigus = [...parMot.entries()].filter(([, liste]) => liste.size >= 2).map(([mot, liste]) => ({ mot, termes: [...liste].sort() })).sort((x, y) => x.mot.localeCompare(y.mot));
  const dansLeDictionnaire = ambigus.filter((entree) => c.motsDuDictionnaire.has(entree.mot));
  const autres = ambigus.filter((entree) => !c.motsDuDictionnaire.has(entree.mot));
  const choisis = [...dansLeDictionnaire, ...echantillon(mulberry32(graineDe(c.graine, 'S17')), autres, Math.max(0, 60 - dansLeDictionnaire.length))].slice(0, 60);
  for (const { mot, termes: candidats } of choisis.sort((x, y) => x.mot.localeCompare(y.mot))) {
    for (const etat of ['deux-attestes', 'un-seul'] as const) {
      const constructeur = new Constructeur(c.pool);
      const voisin = constructeur.fixe(0);
      for (const candidat of etat === 'deux-attestes' ? candidats.slice(0, 2) : candidats.slice(0, 1)) constructeur.emploi('theme', candidat, 5, 1, 3, voisin);
      constructeur.emploi('theme', mot, 1, 1, 3, voisin);
      yield scenario(constructeur, 'S17', 'M-01', mot, { etat }, [{ propriete: 'P-05', mot, reference: candidats.join(',') }]);
    }
  }
}

export const STRATES: Readonly<Record<string, Strate>> = {
  S1: s1, S2: s2, S3: s3, S4: s4, S5: s5, S6: s6, S7: s7, S8: s8, S9: s9, S10: s10, S11: s11, S12: s12, S13: s13, S14: s14, S15: s15, S16: s16, S17: s17,
};
/** Les nombres de cas de la section 3.5 du plan. */
export const CAS_DU_PLAN: Readonly<Record<string, number>> = {
  S1: 1404, S2: 7020, S3: 216, S4: 1080, S5: 624, S6: 1548, S7: 1890, S8: 1440, S9: 950, S10: 1350, S11: 510, S12: 184, S13: 696, S14: 120, S15: 596, S16: 3840, S17: 120,
};
export const MARGE_DU_PLAN = 0.05;

export interface OptionsDeGeneration { readonly strates?: readonly string[]; readonly rapide?: boolean }

/** Les scénarios des strates demandées, dans l'ordre des strates. `rapide` garde un cas sur dix. */
export function* genererLesScenarios(contexte: Contexte, options: OptionsDeGeneration = {}): Generator<Scenario> {
  const demandees = options.strates ?? Object.keys(STRATES);
  for (const nom of demandees) {
    const strate = STRATES[nom];
    if (!strate) throw new Error(`Strate inconnue : ${nom}. Strates admises : ${Object.keys(STRATES).join(', ')}.`);
    let rang = 0;
    for (const cas of strate(contexte)) if (!options.rapide || rang++ % 10 === 0) yield cas;
  }
}

export interface BilanDesScenarios {
  readonly graine: number;
  readonly empreinte: string;
  readonly parStrate: Readonly<Record<string, { readonly cas: number; readonly plan: number; readonly ecart: number; readonly dansLaMarge: boolean }>>;
  readonly total: number;
}

/** Le SHA-256 de la liste des cas : identifiant, noms, attendus. Deux exécutions de même graine donnent la même empreinte. */
export function bilanDesScenarios(contexte: Contexte, options: OptionsDeGeneration = {}): BilanDesScenarios {
  const hachage = createHash('sha256');
  const comptes = new Map<string, number>();
  let total = 0;
  for (const cas of genererLesScenarios(contexte, options)) {
    hachage.update(JSON.stringify([cas.id, cas.noms, cas.attendus, cas.nonRenommables ?? null, cas.site ?? null]));
    comptes.set(cas.strate, (comptes.get(cas.strate) ?? 0) + 1);
    total++;
  }
  const parStrate: Record<string, { cas: number; plan: number; ecart: number; dansLaMarge: boolean }> = {};
  for (const nom of options.strates ?? Object.keys(STRATES)) {
    const cas = comptes.get(nom) ?? 0, plan = CAS_DU_PLAN[nom];
    const ecart = (cas - plan) / plan;
    parStrate[nom] = { cas, plan, ecart: Math.round(ecart * 10000) / 10000, dansLaMarge: Math.abs(ecart) <= MARGE_DU_PLAN };
  }
  return { graine: contexte.graine, empreinte: hachage.digest('hex'), parStrate, total };
}

// ---------------------------------------------------------------------------------------------------------------- inventaire

/** Le fichier d'un cas au format `Inventaire` du kit : une entrée par collection (`Theme`, la casse que les règles donnent aux collections), puis une par nom. */
export function enInventaire(cas: Pick<Scenario, 'noms' | 'id' | 'collectionsBrutes'>): Inventaire {
  const entrees: EntreeInventaire[] = [];
  const ids = new Map<string, string>();
  const collection = (nom: string): string => {
    let id = ids.get(nom);
    if (id === undefined) {
      id = `collection:${ids.size}`;
      ids.set(nom, id);
      entrees.push({ nom: { id, categorie: 'collections', portee: 'document', nom: cas.collectionsBrutes?.includes(nom) ? nom : nom[0].toUpperCase() + nom.slice(1) }, cible: { type: 'collection', collectionId: id }, renommable: true, protegee: false });
    }
    return id;
  };
  cas.noms.forEach((nom, rang) => {
    const idCollection = collection(nom.collection);
    const id = `variable:${rang}`;
    entrees.push({
      nom: { id, categorie: 'variables', portee: idCollection, nom: nom.nom }, contexte: { collection: nom.collection },
      cible: { type: 'variable', variableId: id, collectionId: idCollection }, renommable: true, protegee: false,
    });
  });
  return { entrees, marque: 'absente' };
}

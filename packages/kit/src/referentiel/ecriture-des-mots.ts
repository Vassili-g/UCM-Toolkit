/** Découpage et écriture des segments employés par les deux moteurs de normalisation. */
import { COLLECTIONS, FORMES_ANCIENNES_DES_COLLECTIONS, REGISTRE_PALETTES_COMPOSANT, REGISTRES_ARCHITECTURE } from './architecture.js';
import {
  CATEGORIES_DE_NOM, CONVENTION_DE_SEGMENT_DE_TOKEN, CONVENTION_DE_VALEUR_DE_VARIANT,
  type Casse, type CategorieDeNom, type NomANormaliser, type Separateur,
} from './conventions.js';
import type { NatureDeSegment } from './natures.js';
import type { ConventionDetectee } from './normalisation.js';
import { decouperUnBloc, TERMES_COMPOSES, termeOuVarianteConnu } from './termes-connus.js';
import { REGISTRE_ETATS, REGISTRE_TAILLES, REGISTRES, TAILLES_DE_VARIANT } from './vocabulaire.js';

export function frontieres(segment: string): string {
  return segment.replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1\0$2').replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1\0$2');
}

const termesDecomposables = [...REGISTRES, ...REGISTRES_ARCHITECTURE].flatMap((registre) => registre.termes).map((terme) => terme.id);
const decompositions = new Map([...termesDecomposables, ...COLLECTIONS, ...Object.keys(FORMES_ANCIENNES_DES_COLLECTIONS)].flatMap((terme) => {
  const mots = frontieres(terme).split(/[-_\s\0]+/u);
  return mots.length > 1 ? [[mots.join('').toLowerCase(), mots] as const] : [];
}));

/** Découpe un segment, sans deviner les mots d'une forme soudée absente du registre. */
export function decouperSegment(segment: string): string[] {
  const mots = frontieres(segment).split(/[-_\s\0]+/u).filter(Boolean);
  const decomposition = mots.length === 1 ? decompositions.get(segment.toLowerCase()) : undefined;
  if (!decomposition) return mots.flatMap(trancherUnBlocSoude);
  let debut = 0;
  return decomposition.map((mot) => {
    const morceau = segment.slice(debut, debut + mot.length);
    debut += mot.length;
    return morceau;
  });
}

/** Coupe un mot soudé en tranches du mot d'origine quand chaque morceau est connu (`textdefault`). Les questions et le renommage voient ainsi les mêmes mots. */
function trancherUnBlocSoude(mot: string): string[] {
  if (!/^\p{L}+$/u.test(mot)) return [mot];
  const morceaux = decouperUnBloc(mot);
  if (morceaux.length < 2 || morceaux.join('') !== mot.toLowerCase()) return [mot];
  let debut = 0;
  return morceaux.map((morceau) => mot.slice(debut, (debut += morceau.length)));
}

/**
 * Termes de plusieurs mots, en minuscules et joints par `-` : les propriétés composées, les identifiants et les formes tolérées des registres,
 * dont les valeurs du thème (`foreground-main`).
 */
const termesDePlusieursMots = new Set([
  ...TERMES_COMPOSES,
  ...[...REGISTRES, ...REGISTRES_ARCHITECTURE].flatMap((registre) => registre.termes)
    .flatMap((terme) => [terme.id, ...(terme.toleres ?? [])])
    .map((forme) => decouperSegment(forme).map((mot) => mot.toLowerCase()))
    .filter((mots) => mots.length > 1).map((mots) => mots.join('-')),
]);
const MOTS_DU_PLUS_LONG_TERME = Math.max(...[...termesDePlusieursMots].map((terme) => terme.split('-').length));

/** Les blocs d'un segment, en plages de mots : les séparateurs explicites (`-`, `_`, espace) les coupent, la casse et les mots soudés non. */
function blocsDuSegment(segment: string, mots: readonly string[]): (readonly [number, number])[] {
  const blocs: [number, number][] = [];
  let position = 0;
  let debut = 0;
  for (let rang = 0; rang < mots.length; rang++) {
    const place = segment.indexOf(mots[rang], position);
    if (place < 0) return [[0, mots.length]];
    if (rang > debut && /[-_\s]/u.test(segment.slice(position, place))) {
      blocs.push([debut, rang]);
      debut = rang;
    }
    position = place + mots[rang].length;
  }
  blocs.push([debut, mots.length]);
  return blocs;
}

/**
 * Plages `[début, fin[` des termes d'un segment découpé par `decouperSegment`, qui couvrent tous ses mots.
 * Un segment qui a une nature (composant, palette) est un seul terme. Sinon, bloc par bloc (un bloc va d'un séparateur explicite
 * à l'autre) : un bloc de plusieurs mots dont un mot est inconnu et qui n'est pas lui-même un terme de plusieurs mots reste entier,
 * car c'est un nom propre (`TileLinksWrap`) ; c'est ce qu'un nom de groupe devient une fois qu'il n'est plus un nom de composant.
 * Pour les autres blocs, une suite de mots qui forme un terme de plusieurs mots (`line-height`, `border-radius`, même de part et d'autre
 * d'un séparateur) est un terme, la plus longue d'abord ; tout autre mot est un terme à lui seul, pour que `primaryBg` reste deux termes.
 */
export function termesDuSegment(segment: string, mots: readonly string[], nature: NatureDeSegment | null): readonly (readonly [number, number])[] {
  if (mots.length === 0) return [];
  if (nature) return [[0, mots.length]];
  const minuscules = mots.map((mot) => mot.toLowerCase());
  const debuts = new Map<number, number>();
  const prises = new Set<number>();
  for (const [debut, fin] of blocsDuSegment(segment, mots)) {
    if (fin - debut < 2) continue;
    const bloc = minuscules.slice(debut, fin);
    if (termesDePlusieursMots.has(bloc.join('-')) || bloc.every(termeOuVarianteConnu)) continue;
    debuts.set(debut, fin - debut);
    for (let rang = debut; rang < fin; rang++) prises.add(rang);
  }
  for (let longueur = Math.min(MOTS_DU_PLUS_LONG_TERME, mots.length); longueur >= 2; longueur--) {
    for (let debut = 0; debut + longueur <= mots.length; debut++) {
      if (!termesDePlusieursMots.has(minuscules.slice(debut, debut + longueur).join('-'))) continue;
      let libre = true;
      for (let rang = debut; rang < debut + longueur; rang++) if (prises.has(rang)) libre = false;
      if (!libre) continue;
      for (let rang = debut; rang < debut + longueur; rang++) prises.add(rang);
      debuts.set(debut, longueur);
    }
  }
  const plages: [number, number][] = [];
  for (let rang = 0; rang < mots.length;) {
    const fin = rang + (debuts.get(rang) ?? 1);
    plages.push([rang, fin]);
    rang = fin;
  }
  return plages;
}

export function capitale(mot: string): string {
  return mot.replace(/^./u, (lettre) => lettre.toUpperCase());
}

export function motsAvecCasse(mots: readonly string[], casse: Casse): string[] {
  if (casse === 'inchangee') return [...mots];
  return mots.map((mot, rang) => {
    const minuscule = mot.toLowerCase();
    return casse === 'PascalCase' || (casse === 'initiale' && rang === 0) || (casse === 'camelCase' && rang > 0)
      ? capitale(minuscule) : minuscule;
  });
}

export function assembler(segment: string, mots: readonly string[], separateur: Separateur): string {
  if (separateur === 'inchange') {
    // Le nombre de mots change : la jonction reprend le premier séparateur du segment, ou soude les mots s'il n'en a pas.
    if (frontieres(segment).split(/[-_\s\0]+/u).filter(Boolean).length !== mots.length) return mots.join(/[-_\s]/u.exec(segment)?.[0] ?? '');
    let rang = 0;
    return frontieres(segment).replace(/[^-_\s\0]+/gu, () => mots[rang++] ?? '').replace(/\0/g, '');
  }
  const jonction = { tiret: '-', 'tiret-bas': '_', espace: ' ', soude: '', camelCase: '' }[separateur];
  return mots.join(jonction);
}

/** Les rôles dont une valeur de variant a une écriture décidée : la taille, la palette d'un composant et l'état. */
export type RoleDeValeur = 'taille' | 'palette' | 'etat';

/** Ce que le kit sait d'une valeur de variant qui écrit un terme connu. */
export interface EcritureDeVariant {
  /** L'identifiant du terme du registre que la valeur écrit (`xl`). */
  readonly terme: string;
  /** L'écriture du variant : mots entiers, une majuscule à chaque mot (`Extra Large`), selon `CONVENTION_DE_VALEUR_DE_VARIANT`. */
  readonly variant: string;
  /** Le segment du token qui écrit le terme : son identifiant (`xl`). */
  readonly token: string;
  /**
   * Vrai quand la valeur n'est pas déjà `variant` à la casse près : une abréviation (`S`, `sm`, `XL`) ou un synonyme (`Middle`, `Error`)
   * se corrige vers `variant`. Faux pour `small`, `SMALL` ou `extra large` : un terme connu ne reçoit aucun constat de casse.
   */
  readonly correction: boolean;
}

/** La valeur ramenée à la forme qu'on compare : mots de `decouperSegment`, en minuscules, joints par `-`. */
function formeDeValeur(valeur: string): string {
  return decouperSegment(valeur).map((mot) => mot.toLowerCase()).join('-');
}

function ecrireLeVariant(mots: readonly string[]): string {
  const { casse, separateur } = CONVENTION_DE_VALEUR_DE_VARIANT;
  return assembler('', motsAvecCasse(mots, casse), separateur);
}

let variantsConnus: Readonly<Record<RoleDeValeur, ReadonlyMap<string, EcritureDeVariant>>> | undefined;

/** Construit à la première demande : les registres sont fixes après le chargement. L'écriture du variant passe avant ses variantes, qui ne la remplacent pas. */
function indexDesVariants(): Readonly<Record<RoleDeValeur, ReadonlyMap<string, EcritureDeVariant>>> {
  if (variantsConnus) return variantsConnus;
  const index: Record<RoleDeValeur, Map<string, EcritureDeVariant>> = { taille: new Map(), palette: new Map(), etat: new Map() };
  const ajouter = (role: RoleDeValeur, ecrit: string, ecriture: EcritureDeVariant): void => {
    const forme = formeDeValeur(ecrit);
    if (forme && !index[role].has(forme)) index[role].set(forme, ecriture);
  };
  for (const terme of REGISTRE_TAILLES.termes) {
    const entree = TAILLES_DE_VARIANT[terme.id];
    if (!entree) continue;
    const ecriture = { terme: terme.id, variant: entree.variant, token: terme.id };
    ajouter('taille', entree.variant, { ...ecriture, correction: false });
    for (const forme of [terme.id, ...(terme.toleres ?? []), ...entree.abregees]) ajouter('taille', forme, { ...ecriture, correction: true });
  }
  for (const terme of REGISTRE_PALETTES_COMPOSANT.termes) {
    const ecriture = { terme: terme.id, variant: ecrireLeVariant(decouperSegment(terme.id)), token: terme.id };
    ajouter('palette', ecriture.variant, { ...ecriture, correction: false });
    for (const forme of terme.toleres ?? []) ajouter('palette', forme, { ...ecriture, correction: true });
  }
  // Une forme tolérée d'état se reconnaît sans correction : seules la taille et la palette ont une décision écrite.
  for (const terme of REGISTRE_ETATS.termes) {
    const ecriture = { terme: terme.id, variant: ecrireLeVariant(decouperSegment(terme.id)), token: terme.id, correction: false };
    for (const forme of [terme.id, ...(terme.toleres ?? [])]) ajouter('etat', forme, ecriture);
  }
  variantsConnus = index;
  return index;
}

/**
 * Le terme qu'une valeur de variant écrit, et comment le variant et le token l'écrivent ; `undefined` pour une valeur sans terme connu
 * dans ce rôle. Le rôle décide : `M` est une taille, pas une palette.
 */
export function ecritureDuVariant(role: RoleDeValeur, valeur: string): EcritureDeVariant | undefined {
  return indexDesVariants()[role].get(formeDeValeur(valeur));
}

/**
 * Le segment qu'un token écrit pour une valeur de variant : l'identifiant du terme connu dans `role` (`Small` donne `sm`), sinon la valeur en
 * minuscules, ses mots joints par un tiret, où le point et la barre deviennent un tiret aussi (`16/9` donne `16-9`, `1.5` donne `1-5`).
 */
export function segmentDeToken(valeur: string, role?: RoleDeValeur): string {
  const connue = role ? ecritureDuVariant(role, valeur) : undefined;
  if (connue) return connue.token;
  const { casse, separateur } = CONVENTION_DE_SEGMENT_DE_TOKEN;
  return assembler('', motsAvecCasse(valeur.split(/[\s./_-]+/u).filter(Boolean), casse), separateur);
}

export function categorieDuSegment(nom: NomANormaliser, rang: number): CategorieDeNom {
  return nom.categoriesDesSegments?.[rang] ?? nom.categorie;
}

function dominante<T extends string>(comptes: Record<T, number>): T | null {
  let gagnant: T | null = null;
  for (const valeur of Object.keys(comptes) as T[]) {
    if (comptes[valeur] > 0 && (gagnant === null || comptes[valeur] > comptes[gagnant])) gagnant = valeur;
  }
  return gagnant;
}

/** Accumule les votes par nom pour que la préparation du lexique puisse céder entre deux lots. */
export function commencerDetectionDesConventions(): {
  ajouter(nom: NomANormaliser, mots: ReadonlyMap<string, readonly string[]>): void;
  resultat(): Record<CategorieDeNom, ConventionDetectee>;
} {
  const comptes = Object.fromEntries(CATEGORIES_DE_NOM.map((categorie) => [categorie, {
    casse: { minuscules: 0, initiale: 0, camelCase: 0, PascalCase: 0, inchangee: 0 },
    separateur: { tiret: 0, 'tiret-bas': 0, soude: 0, camelCase: 0, espace: 0, inchange: 0 },
    total: 0,
  }])) as Record<CategorieDeNom, {
    casse: Record<Casse, number>; separateur: Record<Separateur, number>; total: number;
  }>;
  return {
    ajouter(nom, mots) {
      const parCategorie = new Map<CategorieDeNom, string[]>();
      nom.nom.split('/').forEach((segment, rang) => {
        const categorie = categorieDuSegment(nom, rang);
        const segments = parCategorie.get(categorie) ?? [];
        segments.push(segment);
        parCategorie.set(categorie, segments);
      });
      for (const [categorie, tous] of parCategorie) {
        const compte = comptes[categorie];
        compte.total++;
        const segments = tous.filter((segment) => /\p{L}/u.test(segment));
        const candidatsCasse: Casse[] = ['minuscules', 'initiale', 'camelCase', 'PascalCase'];
        const compatibles = candidatsCasse.filter((casse) => segments.every((segment) =>
          assembler(segment, motsAvecCasse(mots.get(segment) ?? decouperSegment(segment), casse), 'inchange') === segment));
        if (compatibles.length === 1) compte.casse[compatibles[0]]++;
        const separateurs = new Set<Separateur>();
        for (const segment of segments) {
          const avecFrontieres = frontieres(segment);
          if (segment.includes('-')) separateurs.add('tiret');
          if (segment.includes('_')) separateurs.add('tiret-bas');
          if (/\s/u.test(segment)) separateurs.add('espace');
          if (avecFrontieres.includes('\0')) separateurs.add('camelCase');
          if (!/[-_\s\0]/u.test(avecFrontieres) && (mots.get(segment) ?? decouperSegment(segment)).length > 1) separateurs.add('soude');
        }
        if (separateurs.size === 1) compte.separateur[[...separateurs][0]]++;
      }
    },
    resultat() {
      return Object.fromEntries(CATEGORIES_DE_NOM.map((categorie) => {
        const compte = comptes[categorie];
        const casse = dominante<Casse>(compte.casse);
        const separateur = dominante<Separateur>(compte.separateur);
        return [categorie, {
          dominante: casse && separateur ? { casse, separateur } : null,
          casse, separateur, comptes: { casse: compte.casse, separateur: compte.separateur }, total: compte.total,
        }];
      })) as Record<CategorieDeNom, ConventionDetectee>;
    },
  };
}

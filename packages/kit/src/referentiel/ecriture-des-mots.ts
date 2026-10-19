/** Découpage et écriture des segments employés par les deux moteurs de normalisation. */
import { COLLECTIONS, REGISTRES_ARCHITECTURE } from './architecture.js';
import { CATEGORIES_DE_NOM, type Casse, type CategorieDeNom, type NomANormaliser, type Separateur } from './conventions.js';
import type { NatureDeSegment } from './natures.js';
import type { ConventionDetectee } from './normalisation.js';
import { decouperUnBloc, TERMES_COMPOSES } from './termes-connus.js';
import { REGISTRES } from './vocabulaire.js';

export function frontieres(segment: string): string {
  return segment.replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1\0$2').replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1\0$2');
}

const termesDecomposables = [...REGISTRES, ...REGISTRES_ARCHITECTURE].flatMap((registre) => registre.termes).map((terme) => terme.id);
const decompositions = new Map([...termesDecomposables, ...COLLECTIONS].flatMap((terme) => {
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

/**
 * Plages `[début, fin[` des termes d'un segment découpé par `decouperSegment`, qui couvrent tous ses mots.
 * Un segment qui a une nature (composant, élément, palette) est un seul terme. Sinon, une suite de mots
 * qui forme un terme de plusieurs mots (`line-height`, `border-radius`) est un terme, la plus longue d'abord ;
 * tout autre mot est un terme à lui seul, pour que `primaryBg` reste deux termes.
 */
export function termesDuSegment(mots: readonly string[], nature: NatureDeSegment | null): readonly (readonly [number, number])[] {
  if (mots.length === 0) return [];
  if (nature) return [[0, mots.length]];
  const minuscules = mots.map((mot) => mot.toLowerCase());
  const debuts = new Map<number, number>();
  const prises = new Set<number>();
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

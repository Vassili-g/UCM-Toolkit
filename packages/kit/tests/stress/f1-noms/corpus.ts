/**
 * Corpus de noms justes du stress test F1 : lit les `noms.json` des design systems et les convertit en inventaires du kit.
 * Chaque système donne quatre inventaires (chemins `points` ou `tirets`, collections `couche` ou `unique`), décrits dans
 * le plan F1, section 2.2. Le fichier Slice (confidentiel, ignoré par Git) ne s'ouvre que par `lireLaSlice`, que `index.ts` appelle
 * seulement avec `--slice` ou `--verifier-fuite` ; `fichiersEnFuite` cherche ses mots dans les fichiers suivis par Git (plan F1, 2.5).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { EntreeInventaire, Inventaire } from '../../../src/nommage/inventaire.js';
import type { CategorieDeNom } from '../../../src/referentiel/conventions.js';

export const RACINE_DU_DEPOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..');
export const DOSSIER_DES_SYSTEMES = join(RACINE_DU_DEPOT, 'docs/references/design-systems');
export const DOSSIER_DE_SORTIE = join(RACINE_DU_DEPOT, '_local/stress/f1-noms');

/** Le fichier Slice, que seuls `--slice` et `--verifier-fuite` ouvrent ; `--verifier-fuite` le prend ici quand `--slice` ne donne pas de chemin. */
export const CHEMIN_DE_SLICE_PAR_DEFAUT = join(RACINE_DU_DEPOT, 'docs/notes/Archives/Plugin Architect/1 Architecture globale/Mesures/tokens-slice-exemple.json');
/** Toutes les sorties tirées de Slice : `_local/` est ignoré par Git. */
export const DOSSIER_DE_SLICE = join(DOSSIER_DE_SORTIE, 'slice');
export const ID_DE_SLICE = 'slice';

export type Couche = 'primitive' | 'semantique' | 'composant' | null;
export interface NomDeSysteme {
  readonly nom: string;
  readonly type: string | null;
  readonly couche: Couche;
  /** Slice seulement : la collection du fichier (sa racine), qui remplace la collection déduite de la couche. */
  readonly collection?: string;
  /** Slice seulement : la variable que ce nom vise par alias, écrite `collection|chemin` comme `collection` et `nom` de sa cible. */
  readonly alias?: string;
}
export interface Systeme { readonly id: string; readonly noms: readonly NomDeSysteme[] }

export type ModeDeChemins = 'points' | 'tirets';
export type ModeDeCollections = 'couche' | 'unique';
export const MODES_DE_CHEMINS: readonly ModeDeChemins[] = ['points', 'tirets'];
export const MODES_DE_COLLECTIONS: readonly ModeDeCollections[] = ['couche', 'unique'];

/** Le préfixe de langage que la conversion retire : `--var`, `$var` (Sass), `md.ref.`, `md.sys.`, `md.comp.`. */
export const PREFIXES_RETIRES: readonly { readonly motif: RegExp; readonly exemple: string }[] = [
  { motif: /^--/, exemple: '--sds-color-gray-900' },
  { motif: /^\$/, exemple: '$govuk-border-width' },
  { motif: /^md\.(ref|sys|comp)\./, exemple: 'md.sys.color.primary' },
];

/** Collection UCM de chaque couche, d'après le plan F1 : `semantique` et l'absence de couche vont dans `theme`. */
export const COLLECTION_PAR_COUCHE: Readonly<Record<'composant' | 'primitive' | 'semantique' | 'null', string>> = {
  composant: 'components', primitive: 'primitives', semantique: 'theme', null: 'theme',
};
/** Collection hors UCM de la variante `unique` (`tokens` n'est aucune des 7 collections du référentiel). */
export const COLLECTION_UNIQUE = 'tokens';

export function lireLesSystemes(dossier: string = DOSSIER_DES_SYSTEMES): Systeme[] {
  return readdirSync(dossier, { withFileTypes: true })
    .filter((entree) => entree.isDirectory() && existsSync(join(dossier, entree.name, 'noms.json')))
    .map((entree) => entree.name)
    .sort()
    .map((id) => ({ id, noms: JSON.parse(readFileSync(join(dossier, id, 'noms.json'), 'utf8')) as NomDeSysteme[] }));
}

export function sansPrefixe(nom: string): string {
  for (const { motif } of PREFIXES_RETIRES) if (motif.test(nom)) return nom.replace(motif, '');
  return nom;
}

/** Les segments d'un nom : coupe sur `.` et `/`, et sur `-` pour la variante `tirets`. Les segments vides sont écartés. */
export function segmentsDuNom(nom: string, chemins: ModeDeChemins): string[] {
  return sansPrefixe(nom).split(chemins === 'tirets' ? /[./-]/ : /[./]/).filter((segment) => segment !== '');
}

export function collectionDe(nom: NomDeSysteme, collections: ModeDeCollections): string {
  if (nom.collection !== undefined) return nom.collection;
  return collections === 'unique' ? COLLECTION_UNIQUE : COLLECTION_PAR_COUCHE[nom.couche ?? 'null'];
}

/** Même découpage en groupes que l'inventaire lu dans Figma (`packages/plugin-socle/src/inventaireDeNoms.ts`). */
function categoriesDesSegments(nom: string): (CategorieDeNom | null)[] | undefined {
  const segments = nom.split('/');
  return segments.length > 1 ? segments.map((_, rang) => (rang < segments.length - 1 ? 'groupes' : null)) : undefined;
}

export interface InventaireConverti {
  readonly systeme: string;
  readonly chemins: ModeDeChemins;
  readonly collections: ModeDeCollections;
  readonly inventaire: Inventaire;
  /** Le nombre de variables, sans les entrées de collection. */
  readonly nombreDeNoms: number;
  /** Les noms convertis qui reviennent plus d'une fois dans la même collection. */
  readonly doublons: number;
}

export function convertir(systeme: Systeme, chemins: ModeDeChemins, collections: ModeDeCollections): InventaireConverti {
  const entrees: EntreeInventaire[] = [];
  const idsDeCollection = new Map<string, string>();
  const vus = new Set<string>();
  let doublons = 0;
  const rangDeLaCible = new Map<string, number>();
  systeme.noms.forEach((source, rang) => { if (source.collection !== undefined) rangDeLaCible.set(`${source.collection}|${source.nom}`, rang); });
  const collectionId = (collection: string): string => {
    let id = idsDeCollection.get(collection);
    if (id === undefined) {
      id = `${systeme.id}:collection:${collection}`;
      idsDeCollection.set(collection, id);
      entrees.push({ nom: { id, categorie: 'collections', portee: 'document', nom: collection },
        cible: { type: 'collection', collectionId: id }, renommable: true, protegee: false });
    }
    return id;
  };
  systeme.noms.forEach((source, rang) => {
    const segments = segmentsDuNom(source.nom, chemins);
    if (segments.length === 0) throw new Error(`${systeme.id} : le nom n° ${rang} est vide après conversion`);
    const nom = segments.join('/');
    const collection = collectionDe(source, collections);
    const cle = `${collection}|${nom}`;
    if (vus.has(cle)) doublons++;
    vus.add(cle);
    const idCollection = collectionId(collection);
    const id = `${systeme.id}:${rang}`;
    const categories = categoriesDesSegments(nom);
    const rangCible = source.alias === undefined ? undefined : rangDeLaCible.get(source.alias);
    entrees.push({
      nom: { id, categorie: 'variables', portee: idCollection, nom, ...(categories ? { categoriesDesSegments: categories } : {}),
        ...(rangCible === undefined ? {} : { cibleAlias: `${systeme.id}:${rangCible}` }) },
      contexte: { collection }, cible: { type: 'variable', variableId: id, collectionId: idCollection }, renommable: true, protegee: false,
    });
  });
  return { systeme: systeme.id, chemins, collections, inventaire: { entrees, marque: 'absente' }, nombreDeNoms: systeme.noms.length, doublons };
}

export interface BilanDuCorpus {
  readonly systemes: number;
  readonly noms: number;
  /** Par variante `chemins/collections` : le nombre de noms convertis, sur tous les systèmes. */
  readonly nomsParVariante: Readonly<Record<string, number>>;
  readonly parSysteme: readonly { readonly id: string; readonly noms: number; readonly doublons: Readonly<Record<string, number>> }[];
}

/** Convertit les quatre variantes de chaque système, sans garder les inventaires : seuls les comptes servent au bilan. */
export function bilanDuCorpus(systemes: readonly Systeme[]): BilanDuCorpus {
  const nomsParVariante: Record<string, number> = {};
  const parSysteme = systemes.map((systeme) => {
    const doublons: Record<string, number> = {};
    for (const chemins of MODES_DE_CHEMINS) {
      for (const collections of MODES_DE_COLLECTIONS) {
        const converti = convertir(systeme, chemins, collections);
        const variante = `${chemins}/${collections}`;
        nomsParVariante[variante] = (nomsParVariante[variante] ?? 0) + converti.nombreDeNoms;
        doublons[variante] = converti.doublons;
      }
    }
    return { id: systeme.id, noms: systeme.noms.length, doublons };
  });
  return { systemes: systemes.length, noms: systemes.reduce((somme, systeme) => somme + systeme.noms.length, 0), nomsParVariante, parSysteme };
}

/** Le tableau de conversion que le mainteneur relit (`conversion.json`). */
export function tableauDeConversion(systemes: readonly Systeme[]) {
  return {
    prefixesRetires: PREFIXES_RETIRES.map(({ motif, exemple }) => ({ motif: motif.source, exemple, apres: sansPrefixe(exemple) })),
    chemins: {
      points: 'coupe sur « . » et « / », garde les tirets dans le segment',
      tirets: 'coupe aussi sur chaque « - »',
    },
    collections: {
      couche: COLLECTION_PAR_COUCHE,
      unique: `toutes les variables dans la collection « ${COLLECTION_UNIQUE} », hors des 7 collections UCM`,
    },
    exemples: systemes.map((systeme) => {
      const source = systeme.noms[Math.floor(systeme.noms.length / 2)];
      return {
        systeme: systeme.id, source: source.nom, couche: source.couche,
        points: segmentsDuNom(source.nom, 'points').join('/'), tirets: segmentsDuNom(source.nom, 'tirets').join('/'),
        collectionCouche: collectionDe(source, 'couche'),
      };
    }),
    bilan: bilanDuCorpus(systemes),
  };
}

// ---------------------------------------------------------------------------------------------------------------- Slice

const ALIAS_ENTIER = /^\{([^{}]+)\}$/;

/**
 * Un export de tokens à collections racines en système : chaque clé de premier niveau est une collection, le chemin sous la racine
 * est le nom, et un `$value` qui est un alias entier renseigne `alias` (`{racine.chemin}` devient `racine|chemin`). Un `$value` composé
 * ou un jeton posé à la racine n'ont pas de nom de variable et sont ignorés.
 */
export function systemeDepuisTokens(id: string, tokens: unknown): Systeme {
  const noms: NomDeSysteme[] = [];
  const visiter = (noeud: Record<string, unknown>, chemin: readonly string[], collection: string): void => {
    for (const [cle, valeur] of Object.entries(noeud)) {
      if (cle.startsWith('$') || valeur === null || typeof valeur !== 'object') continue;
      const enfant = valeur as Record<string, unknown>;
      if (!('$value' in enfant)) { visiter(enfant, [...chemin, cle], collection); continue; }
      const cible = typeof enfant.$value === 'string' ? ALIAS_ENTIER.exec(enfant.$value)?.[1].split('.') : undefined;
      noms.push({
        nom: [...chemin, cle].join('/'), type: typeof enfant.$type === 'string' ? enfant.$type : null, couche: null, collection,
        ...(cible && cible.length > 1 ? { alias: `${cible[0]}|${cible.slice(1).join('/')}` } : {}),
      });
    }
  };
  if (tokens === null || typeof tokens !== 'object') throw new Error('Le fichier de tokens n\'est pas un objet.');
  for (const [collection, racine] of Object.entries(tokens as Record<string, unknown>)) {
    if (!collection.startsWith('$') && racine !== null && typeof racine === 'object') visiter(racine as Record<string, unknown>, [], collection);
  }
  return { id, noms };
}

/** Le seul endroit qui ouvre le fichier Slice. Son message d'erreur ne cite aucun nom du fichier. */
export function lireLaSlice(chemin: string): Systeme {
  if (!existsSync(chemin)) throw new Error(`Le fichier ${chemin} n'existe pas.`);
  let tokens: unknown;
  try { tokens = JSON.parse(readFileSync(chemin, 'utf8')); } catch { throw new Error(`Le fichier ${chemin} n'est pas du JSON valide.`); }
  return systemeDepuisTokens(ID_DE_SLICE, tokens);
}

export const LONGUEUR_MINIMALE_D_UN_MOT_SURVEILLE = 5;

/**
 * Les mots de 5 lettres ou plus des noms et des collections d'un système qui ne sont connus ni du vocabulaire du kit ni du
 * dictionnaire des design systems : ceux qui, écrits dans un fichier suivi par Git, trahiraient le fichier. Un segment en casse mixte dont
 * un mot est inconnu entre aussi d'un bloc, en minuscules, pour que le même segment écrit sans casse soit retrouvé.
 */
export function motsASurveiller(systeme: Systeme, connu: (mot: string) => boolean): string[] {
  const mots = new Set<string>();
  const ajouter = (texte: string) => {
    for (const suite of texte.split(/[^A-Za-z]+/)) {
      const morceaux = suite.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().split(' ');
      const inconnus = morceaux.filter((mot) => mot.length >= LONGUEUR_MINIMALE_D_UN_MOT_SURVEILLE && !connu(mot));
      for (const mot of inconnus) mots.add(mot);
      if (inconnus.length > 0 && morceaux.length > 1) mots.add(suite.toLowerCase());
    }
  };
  for (const nom of systeme.noms) { ajouter(nom.nom); if (nom.collection !== undefined) ajouter(nom.collection); }
  return [...mots].sort();
}

/** Les mots d'un texte : suites de lettres en minuscules, avec et sans coupe aux passages de minuscule à majuscule (`sizeLarge` donne `size`, `large` et `sizelarge`). */
export function motsDuTexte(texte: string): Set<string> {
  const mots = new Set<string>();
  for (const brut of [texte, texte.replace(/([a-z])([A-Z])/g, '$1 $2')]) for (const mot of brut.toLowerCase().match(/[a-z]{5,}/g) ?? []) mots.add(mot);
  return mots;
}

/**
 * Les fichiers qui contiennent l'un des mots comme mot entier (`motsDuTexte`). Un mot collé à d'autres lettres en minuscules (`acmebrand`)
 * n'est pas retrouvé : la comparaison par sous-chaîne rendait presque chaque fichier, par les mots courants. Un fichier que `lire`
 * ne rend pas (supprimé, binaire) est ignoré.
 */
export function fichiersEnFuite(mots: readonly string[], fichiers: readonly string[], lire: (fichier: string) => string | undefined): string[] {
  const surveilles = new Set(mots);
  return fichiers.filter((fichier) => {
    const contenu = lire(fichier);
    if (contenu === undefined) return false;
    for (const mot of motsDuTexte(contenu)) if (surveilles.has(mot)) return true;
    return false;
  });
}

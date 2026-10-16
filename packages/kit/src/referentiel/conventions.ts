/** Les conventions de nommage choisies par catégorie, sans dépendance à Figma. */
import type { Registre } from './termes.js';

export type Casse = 'minuscules' | 'initiale' | 'camelCase' | 'PascalCase' | 'inchangee';
export type Separateur = 'tiret' | 'tiret-bas' | 'soude' | 'camelCase' | 'espace' | 'inchange';
export type Convention = { readonly casse: Casse; readonly separateur: Separateur };
/** `palettes` et `composants` ne nomment pas d'objet : ils qualifient un segment d'un nom de variable. */
export const CATEGORIES_DE_NOM = ['collections', 'variables', 'proprietes', 'valeurs', 'palettes', 'composants'] as const;
export type CategorieDeNom = typeof CATEGORIES_DE_NOM[number];
/** Un segment de ces catégories est un nom propre : le vocabulaire UCM ne le remplace pas. */
export const CATEGORIES_DE_SEGMENT = ['palettes', 'composants'] as const;
export const LIBELLES_DE_CATEGORIE: Readonly<Record<CategorieDeNom, { readonly fr: string; readonly en: string }>> = {
  collections: { fr: 'Collections', en: 'Collections' },
  variables: { fr: 'Variables', en: 'Variables' },
  proprietes: { fr: 'Propriétés', en: 'Properties' },
  valeurs: { fr: 'Valeurs', en: 'Values' },
  palettes: { fr: 'Noms de palettes', en: 'Palette names' },
  composants: { fr: 'Noms de composants', en: 'Component names' },
};
export type NomANormaliser = {
  readonly id: string;
  readonly categorie: CategorieDeNom;
  readonly portee: string;
  readonly nom: string;
  /**
   * Aligné sur les segments de `nom` découpé sur `/` : une catégorie remplace
   * celle du nom pour ce segment, `null` la laisse. Les doublons restent
   * comparés sous `categorie`.
   */
  readonly categoriesDesSegments?: readonly (CategorieDeNom | null)[];
};
export type ConventionsParCategorie = Readonly<Partial<Record<CategorieDeNom, Convention>>>;

export const REGISTRE_CASSES: Registre = {
  id: 'conventions-casse', extensible: false,
  termes: [
    { id: 'minuscules', libelle: { fr: 'Minuscules', en: 'Lowercase' }, definition: { fr: 'Tous les mots en minuscules.', en: 'All words in lowercase.' } },
    { id: 'initiale', libelle: { fr: 'Majuscule initiale', en: 'Sentence case' }, definition: { fr: 'Le premier mot commence par une majuscule.', en: 'The first word starts with a capital.' } },
    { id: 'camelCase', libelle: { fr: 'camelCase', en: 'camelCase' }, definition: { fr: 'Chaque mot après le premier commence par une majuscule.', en: 'Each word after the first starts with a capital.' } },
    { id: 'PascalCase', libelle: { fr: 'PascalCase', en: 'PascalCase' }, definition: { fr: 'Chaque mot commence par une majuscule.', en: 'Each word starts with a capital.' } },
    { id: 'inchangee', libelle: { fr: 'Inchangée', en: 'Unchanged' }, definition: { fr: 'La casse du nom est conservée.', en: 'The name retains its case.' } },
  ],
};

export const REGISTRE_SEPARATEURS: Registre = {
  id: 'conventions-separateurs', extensible: false,
  termes: [
    { id: 'tiret', libelle: { fr: 'Tiret', en: 'Hyphen' }, definition: { fr: 'Les mots sont séparés par un tiret.', en: 'Words are separated by a hyphen.' } },
    { id: 'tiret-bas', libelle: { fr: 'Tiret bas', en: 'Underscore' }, definition: { fr: 'Les mots sont séparés par un tiret bas.', en: 'Words are separated by an underscore.' } },
    { id: 'soude', libelle: { fr: 'Soudé', en: 'Joined' }, definition: { fr: 'Les mots se suivent sans séparateur.', en: 'Words follow each other without a separator.' } },
    { id: 'camelCase', libelle: { fr: 'camelCase', en: 'camelCase' }, definition: { fr: 'Les majuscules marquent les mots soudés.', en: 'Capitals mark joined word boundaries.' } },
    { id: 'espace', libelle: { fr: 'Espace', en: 'Space' }, definition: { fr: 'Les mots sont séparés par une espace.', en: 'Words are separated by a space.' } },
    { id: 'inchange', libelle: { fr: 'Inchangé', en: 'Unchanged' }, definition: { fr: 'Les séparateurs du nom sont conservés.', en: 'The name retains its separators.' } },
  ],
};

export const CONVENTIONS: readonly { readonly id: string; readonly libelle: { readonly fr: string; readonly en: string }; readonly convention: Convention }[] = [
  { id: 'tiret', libelle: { fr: 'Minuscules · tirets', en: 'Lowercase · hyphens' }, convention: { casse: 'minuscules', separateur: 'tiret' } },
  { id: 'bas', libelle: { fr: 'Minuscules · tirets bas', en: 'Lowercase · underscores' }, convention: { casse: 'minuscules', separateur: 'tiret-bas' } },
  { id: 'espace', libelle: { fr: 'Majuscule initiale · espaces', en: 'Sentence case · spaces' }, convention: { casse: 'initiale', separateur: 'espace' } },
  { id: 'camel', libelle: { fr: 'camelCase', en: 'camelCase' }, convention: { casse: 'camelCase', separateur: 'camelCase' } },
  { id: 'pascal', libelle: { fr: 'PascalCase', en: 'PascalCase' }, convention: { casse: 'PascalCase', separateur: 'camelCase' } },
  { id: 'soude', libelle: { fr: 'Minuscules · soudé', en: 'Lowercase · joined' }, convention: { casse: 'minuscules', separateur: 'soude' } },
  { id: 'inchange', libelle: { fr: 'Inchangée', en: 'Unchanged' }, convention: { casse: 'inchangee', separateur: 'inchange' } },
];

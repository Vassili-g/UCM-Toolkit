/** L'inventaire conserve les adresses Figma ; seuls les noms logiques atteignent le moteur. */
import { decouperSegment, COLLECTION_DES_COMPOSANTS, DESTINATION_DES_PALETTES, type CategorieDeNom, type NomANormaliser } from '@ucm-kit/core/referentiel';

export interface ObjetNomme {
  readonly id: string;
  readonly name: string;
  readonly remote: boolean;
}
export interface VariableLue extends ObjetNomme { readonly variableCollectionId: string }
export interface DefinitionLue { readonly type: string }
export interface ComposantLu extends ObjetNomme {
  readonly type: 'COMPONENT' | 'COMPONENT_SET';
  readonly parentId: string | null;
  readonly componentPropertyDefinitions: Readonly<Record<string, DefinitionLue>>;
  readonly variantProperties: Readonly<Record<string, string>> | null;
}
export interface PageALire {
  readonly id: string;
  readonly name: string;
  charger(): Promise<void>;
  composants(): readonly ComposantLu[];
}
export interface PortDeLecture {
  collections(): Promise<readonly ObjetNomme[]>;
  variables(): Promise<readonly VariableLue[]>;
  pages(): readonly PageALire[];
  /** Le texte de la recette d'UCM Palettes, lu à l'adresse partagée ; vide quand le fichier n'en porte pas. */
  recettePalettes?(): string;
}
export type CibleDeNom =
  | { readonly type: 'collection'; readonly collectionId: string }
  | { readonly type: 'variable'; readonly variableId: string; readonly collectionId: string }
  | { readonly type: 'propriete'; readonly ownerId: string; readonly proprieteId: string; readonly typePropriete: string }
  | { readonly type: 'valeur'; readonly ownerId: string; readonly axe: string; readonly valeur: string; readonly componentIds: readonly string[] };
export interface EntreeInventaire {
  readonly contexte?: { readonly collection?: string; readonly composant?: string; readonly page?: string; readonly axe?: string };
  readonly nom: NomANormaliser;
  readonly cible: CibleDeNom;
  readonly renommable: boolean;
  readonly motifNonRenommable?: 'type-propriete-inconnu' | 'syntaxe-variante' | 'axe-ambigu';
}
export interface Inventaire {
  readonly composants?: readonly ComposantLu[];
  readonly entrees: readonly EntreeInventaire[];
  readonly pages: readonly { readonly id: string; readonly nom: string }[];
}
export interface AvancementLecture {
  readonly phase: 'variables' | 'pages';
  readonly pagesLues: number;
  readonly totalPages: number;
  readonly page?: string;
}

/** Le suffixe technique reste dans l'adresse de mutation, jamais dans le nom proposé. */
export function nomDePropriete(identifiant: string): string {
  return identifiant.replace(/#[^#]+$/, '');
}

function identite(...parties: readonly string[]): string { return JSON.stringify(parties); }
function syntaxeDeVariante(nom: string): boolean { return nom.length > 0 && !/[=,]/u.test(nom); }

/** Deux noms sont les mêmes quand leurs mots le sont, quelles que soient la casse et la séparation. */
function motsDuNom(segment: string): string {
  return decouperSegment(segment).map((mot) => mot.toLowerCase()).join(' ');
}

/**
 * Les noms de la recette (identifiant et nom d'affichage), lus sans la valider :
 * le plugin ne s'en sert que pour reconnaître un segment. Une recette
 * illisible ou sans palette revient au repli sur la forme des chemins.
 */
export function nomsDePalettesDeLaRecette(texte: string): ReadonlySet<string> | undefined {
  if (!texte) return undefined;
  try {
    const palettes: unknown = JSON.parse(texte)?.palettes;
    if (!Array.isArray(palettes)) return undefined;
    const noms = new Set(palettes.flatMap((palette: { id?: unknown; nom?: unknown } | null) => [palette?.id, palette?.nom])
      .filter((nom): nom is string => typeof nom === 'string' && nom !== '').map(motsDuNom));
    return noms.size > 0 ? noms : undefined;
  } catch { return undefined; }
}

/**
 * La catégorie propre à chaque segment d'un nom de variable, ou `undefined`
 * quand aucun segment n'en a. Une palette ne se cherche que dans la
 * collection où Palettes écrit : ailleurs, `theme.neutral` ou
 * `color-utilities.neutral` sont des rôles, pas des noms de palettes. Sans
 * recette, une palette est le segment qui suit `colors`. Un segment à la fois
 * palette et composant compte comme palette.
 */
function categoriesDesSegments(
  nom: string, collection: string | undefined, palettes: ReadonlySet<string> | undefined, composants: ReadonlySet<string>,
): (CategorieDeNom | null)[] | undefined {
  const segments = nom.split('/');
  const dansLesPrimitives = collection?.toLowerCase() === DESTINATION_DES_PALETTES.collection;
  // Les variables vivent souvent dans un fichier sans composants : la racine
  // de la collection des composants nomme alors le composant.
  const dansLesComposants = collection?.toLowerCase() === COLLECTION_DES_COMPOSANTS;
  const categories = segments.map((segment, rang): CategorieDeNom | null => {
    const mots = motsDuNom(segment);
    if (mots === '') return null;
    const palette = dansLesPrimitives && (palettes ? palettes.has(mots)
      : rang > 0 && segments[rang - 1].toLowerCase() === DESTINATION_DES_PALETTES.groupe);
    if (palette) return 'palettes';
    return (dansLesComposants && rang === 0) || composants.has(mots) ? 'composants' : null;
  });
  return categories.some(Boolean) ? categories : undefined;
}

/** Charge chaque page avant son parcours et rend la main entre les pages et les lots de composants. */
export async function lireInventaire(
  port: PortDeLecture,
  options: { readonly pause: () => Promise<void>; readonly avancement?: (etat: AvancementLecture) => void },
): Promise<Inventaire> {
  const pages = [...port.pages()];
  const entrees: EntreeInventaire[] = [];
  const composantsLus: ComposantLu[] = [];
  const nomsDeComposants = new Set<string>();
  options.avancement?.({ phase: 'variables', pagesLues: 0, totalPages: pages.length });
  const collections = await port.collections();
  const locales = new Set(collections.filter((collection) => !collection.remote).map((collection) => collection.id));
  for (const collection of collections.filter((collection) => !collection.remote)) {
    entrees.push({ nom: { id: identite('collection', collection.id), categorie: 'collections', portee: 'document', nom: collection.name },
      cible: { type: 'collection', collectionId: collection.id }, renommable: true });
  }
  for (const variable of await port.variables()) {
    if (variable.remote || !locales.has(variable.variableCollectionId)) continue;
    entrees.push({ nom: { id: identite('variable', variable.id), categorie: 'variables', portee: variable.variableCollectionId, nom: variable.name },
      contexte: { collection: collections.find((collection) => collection.id === variable.variableCollectionId)?.name },
      cible: { type: 'variable', variableId: variable.id, collectionId: variable.variableCollectionId }, renommable: true });
  }
  await options.pause();
  for (const [rang, page] of pages.entries()) {
    options.avancement?.({ phase: 'pages', pagesLues: rang, totalPages: pages.length, page: page.name });
    await options.pause();
    await page.charger();
    const composants = page.composants().map((composant) => ({ ...composant,
      componentPropertyDefinitions: Object.fromEntries(Object.entries(composant.componentPropertyDefinitions).map(([id, definition]) => [id, { type: definition.type }])),
      variantProperties: composant.variantProperties ? { ...composant.variantProperties } : null,
    }));
    composantsLus.push(...composants);
    const sets = new Map(composants.filter((composant) => composant.type === 'COMPONENT_SET').map((set) => [set.id, set]));
    // Une variante porte le nom de son axe et de sa valeur : seuls l'ensemble ou le composant seul nomment un composant.
    for (const composant of composants) {
      if (composant.remote || (composant.type === 'COMPONENT' && composant.parentId && sets.has(composant.parentId))) continue;
      nomsDeComposants.add(motsDuNom(composant.name.split('/').pop() ?? ''));
    }
    const valeurs = new Map<string, EntreeInventaire & { cible: Extract<CibleDeNom, { type: 'valeur' }> }>();
    for (const [index, composant] of composants.entries()) {
      if (index > 0 && index % 100 === 0) await options.pause();
      if (composant.remote) continue;
      const parent = composant.parentId ? sets.get(composant.parentId) : undefined;
      if (parent?.remote) continue;
      for (const [proprieteId, definition] of Object.entries(composant.componentPropertyDefinitions)) {
        if (composant.type === 'COMPONENT' && (definition.type === 'VARIANT' || (parent && proprieteId in parent.componentPropertyDefinitions))) continue;
        const nom = nomDePropriete(proprieteId);
        const motifNonRenommable = !['TEXT', 'BOOLEAN', 'INSTANCE_SWAP', 'VARIANT'].includes(definition.type) ? 'type-propriete-inconnu'
          : definition.type === 'VARIANT' && !syntaxeDeVariante(nom) ? 'syntaxe-variante' : undefined;
        entrees.push({ nom: { id: identite('propriete', composant.id, proprieteId), categorie: 'proprietes', portee: composant.id, nom },
          contexte: { composant: composant.name, page: page.name },
          cible: { type: 'propriete', ownerId: composant.id, proprieteId, typePropriete: definition.type },
          renommable: motifNonRenommable === undefined, ...(motifNonRenommable ? { motifNonRenommable } : {}) });
      }
      if (!parent || composant.type !== 'COMPONENT') continue;
      const axes = Object.keys(parent.componentPropertyDefinitions).filter((cle) => parent.componentPropertyDefinitions[cle].type === 'VARIANT');
      for (const [axe, valeur] of Object.entries(composant.variantProperties ?? {})) {
        const correspondances = axes.filter((cle) => cle === axe || nomDePropriete(cle) === axe);
        const axeId = correspondances.length === 1 ? correspondances[0] : axe;
        const cle = identite('valeur', parent.id, axeId, valeur);
        const precedente = valeurs.get(cle);
        const motifNonRenommable = correspondances.length !== 1 ? 'axe-ambigu'
          : !syntaxeDeVariante(axe) || !syntaxeDeVariante(valeur) ? 'syntaxe-variante' : undefined;
        valeurs.set(cle, {
          contexte: { composant: parent.name, page: page.name, axe: nomDePropriete(axeId) },
          nom: { id: cle, categorie: 'valeurs', portee: identite(parent.id, axeId), nom: valeur },
          cible: { type: 'valeur', ownerId: parent.id, axe: axeId, valeur, componentIds: [...(precedente?.cible.componentIds ?? []), composant.id] },
          renommable: motifNonRenommable === undefined, ...(motifNonRenommable ? { motifNonRenommable } : {}),
        });
      }
    }
    entrees.push(...valeurs.values());
    options.avancement?.({ phase: 'pages', pagesLues: rang + 1, totalPages: pages.length, page: page.name });
    await options.pause();
  }
  const palettes = nomsDePalettesDeLaRecette(port.recettePalettes?.() ?? '');
  nomsDeComposants.delete('');
  const marquees = entrees.map((entree) => {
    if (entree.cible.type !== 'variable') return entree;
    const categories = categoriesDesSegments(entree.nom.nom, entree.contexte?.collection, palettes, nomsDeComposants);
    return categories ? { ...entree, nom: { ...entree.nom, categoriesDesSegments: categories } } : entree;
  });
  return { entrees: marquees, composants: composantsLus, pages: pages.map((page) => ({ id: page.id, nom: page.name })) };
}

/** Capture les occupants après les chargements ; la construction en mémoire ne cède plus à une tâche Figma. */
export async function relireInventaireAvantEcriture(port: PortDeLecture): Promise<Inventaire> {
  const pages = [...port.pages()];
  for (const page of pages) await page.charger();
  const collections = await port.collections();
  const variables = await port.variables();
  if (JSON.stringify(port.pages().map((page) => page.id)) !== JSON.stringify(pages.map((page) => page.id))) throw new Error('pages-modifiees');
  const copies = pages.map((page) => ({ id: page.id, name: page.name, composants: [...page.composants()] }));
  return lireInventaire({
    collections: async () => collections,
    variables: async () => variables,
    pages: () => copies.map((page) => ({ id: page.id, name: page.name, charger: async () => {}, composants: () => page.composants })),
    recettePalettes: port.recettePalettes,
  }, { pause: async () => {} });
}

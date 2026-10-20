/** La décision portable des axes de collections et des collisions qui les écartent. */
import { axeDesExtensions, tokenCssVariable } from './names.js';
import { prefixeDeCollection } from './chemins-de-tokens.js';

export interface CollectionPourAxe {
  readonly id: string;
  readonly nom: string;
  readonly nombreDeModes?: number;
  readonly extension?: boolean;
  readonly racine?: string;
}
export interface AxeDeCollectionDecide { readonly cle: string; readonly extensions: boolean }
export interface ConflitDAxes<C extends CollectionPourAxe = CollectionPourAxe> {
  readonly motif: 'meme-axe' | 'axe-et-extensions';
  readonly a: C;
  readonly b: C;
}
export interface OptionsDesAxes<C extends CollectionPourAxe> {
  readonly nomDe?: (collection: C) => string;
  readonly qualifier?: (collection: C, cle: string, extensions: boolean) => { readonly extensions: boolean } | null;
  readonly refuser?: (motif: 'prefixe-vide' | 'meme-axe', collections: readonly C[], cle: string) => void;
  readonly conflitDExtensions?: (a: C, b: C) => void;
}

/** Les noms des modes et les arbres d’extension se valident par `qualifier` quand l’inventaire les porte. */
export function deciderAxesDesCollections<C extends CollectionPourAxe>(
  collections: readonly C[], options: OptionsDesAxes<C> = {},
): { readonly axes: Map<string, AxeDeCollectionDecide>; readonly conflits: ConflitDAxes<C>[] } {
  const nomDe = options.nomDe ?? ((collection: C) => collection.nom);
  const racines = new Set(collections.flatMap((collection) => collection.extension && collection.racine !== undefined ? [collection.racine] : []));
  const parCle = new Map<string, C[]>();
  for (const collection of collections) {
    if (collection.extension || ((collection.nombreDeModes ?? 0) < 2 && !racines.has(collection.id))) continue;
    const cle = prefixeDeCollection(nomDe(collection));
    parCle.set(cle, [...(parCle.get(cle) ?? []), collection]);
  }
  const axes = new Map<string, AxeDeCollectionDecide>();
  const porteurs = new Map<string, C>();
  const conflits: ConflitDAxes<C>[] = [];
  for (const [cle, partageant] of parCle) {
    if (cle === '') { options.refuser?.('prefixe-vide', partageant, cle); continue; }
    if (partageant.length > 1) {
      options.refuser?.('meme-axe', partageant, cle);
      const triees = [...partageant].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
      for (let i = 0; i < triees.length; i++) for (let j = i + 1; j < triees.length; j++) conflits.push({ motif: 'meme-axe', a: triees[i]!, b: triees[j]! });
      continue;
    }
    const collection = partageant[0]!;
    const qualifie = options.qualifier ? options.qualifier(collection, cle, racines.has(collection.id)) : { extensions: racines.has(collection.id) };
    if (!qualifie) continue;
    axes.set(collection.id, { cle, extensions: qualifie.extensions });
    porteurs.set(collection.id, collection);
  }
  const parPropriete = new Map([...axes].map(([id, axe]) => [tokenCssVariable(axe.cle), id]));
  for (const [id, axe] of axes) {
    if (!axe.extensions) continue;
    const rivale = parPropriete.get(tokenCssVariable(axeDesExtensions(axe.cle)));
    if (rivale === undefined) continue;
    const a = porteurs.get(id)!, b = porteurs.get(rivale)!;
    conflits.push({ motif: 'axe-et-extensions', a, b });
    options.conflitDExtensions?.(a, b);
    if ((a.nombreDeModes ?? 0) < 2) axes.delete(id); else axes.set(id, { ...axe, extensions: false });
  }
  return { axes, conflits };
}

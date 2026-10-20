/**
 * Les chemins que l'export de tokens donne aux variables. UCM Exporter garde le premier de deux tokens de même chemin
 * et écarte un token dont le chemin est le groupe d'un autre : un renommage qui crée l'un de ces cas fait disparaître
 * un token de `tokens.json`. Le contrôle des noms Figma exacts ne les voit pas (`bg/primary` et `Background/primary`
 * ont deux noms et un chemin).
 *
 * Le module est pur : il lit un inventaire et des renommages, et ne touche à aucun objet Figma. Il vit dans le socle
 * parce que UCM Nomenclature et UCM Palettes contrôlent leurs noms par lui.
 *
 * Il contrôle aussi les axes de modes (`axesDeLExport`) : le nom d'une collection donne la clé de son axe, et l'export de tokens
 * écarte deux axes de même clé. Le contrôle ne voit un axe que si l'inventaire porte les modes de la collection.
 */
import { axeDesExtensions, tokenCssVariable } from '@ucm-kit/core/format';
import type { Collision } from '@ucm-kit/core/referentiel';
import { joinTokenPath, prefixeDeCollection } from './cheminsDeTokens';
import type { EntreeInventaire, Inventaire } from './inventaireDeNoms';

/**
 * Pourquoi un renommage fait perdre quelque chose à l'export de tokens :
 * - `meme-token` : deux variables donneraient le même chemin ;
 * - `token-et-groupe` : un token serait aussi le groupe d'un autre ;
 * - `meme-axe` : deux collections à modes donneraient la même clé d'axe, et l'export écarte les deux axes ;
 * - `axe-et-extensions` : le nom d'une collection serait celui que l'export réserve aux extensions d'une autre collection.
 */
export type MotifDeChemin = 'meme-token' | 'token-et-groupe' | 'meme-axe' | 'axe-et-extensions';

/**
 * Une collection de l'inventaire publié. Les modes et les extensions ne sont là que si l'adaptateur les lit ; sans eux, la
 * collection n'est jamais un axe. `racine` est l'identifiant de la racine dans cet inventaire, comme `id`.
 */
export interface CollectionPubliee {
  readonly id: string;
  readonly nom: string;
  readonly nombreDeModes?: number;
  readonly extension?: boolean;
  readonly racine?: string;
}
export interface VariablePubliee { readonly id: string; readonly nom: string; readonly collection: string }
/** Tout le document : les collections et les variables locales, analysées ou non, cochées ou non, protégées ou non. */
export interface InventairePublie { readonly collections: readonly CollectionPubliee[]; readonly variables: readonly VariablePubliee[] }

/** Un renommage qui crée un conflit de chemin. `id` est celui du renommage (variable ou collection). */
export interface CheminEnConflit {
  readonly id: string;
  readonly motif: MotifDeChemin;
  /**
   * `collection/variable` du token (qui est aussi le groupe de `autre` pour `token-et-groupe`), noms d'après les renommages.
   * Pour `meme-axe`, le nom de la collection en cause, puis celui de l'autre. Pour `axe-et-extensions`, le nom de la collection
   * qui a des extensions, puis celui de la collection dont le nom est réservé à ces extensions.
   */
  readonly apres: string;
  readonly autre: string;
}

/** Une collision de la session qui vient d'un conflit de chemin ; les collisions du kit n'ont pas ces champs. */
export interface CollisionDeChemin extends Collision {
  readonly motif: MotifDeChemin;
  readonly apres: string;
  readonly autre: string;
}
export const estCollisionDeChemin = (collision: Collision): collision is CollisionDeChemin => 'motif' in collision;

/** L'inventaire du plugin vers l'entrée du contrôle ; `cle` donne l'identifiant par lequel les renommages désignent l'entrée. */
export function inventairePublie(inventaire: Inventaire, cle: (entree: EntreeInventaire) => string): InventairePublie {
  const cles = new Map<string, string>();
  for (const entree of inventaire.entrees) if (entree.cible.type === 'collection') cles.set(entree.cible.collectionId, cle(entree));
  const collections: CollectionPubliee[] = inventaire.entrees.filter((entree) => entree.cible.type === 'collection').map((entree) => ({
    id: cle(entree), nom: entree.nom.nom,
    ...(entree.nombreDeModes !== undefined ? { nombreDeModes: entree.nombreDeModes } : {}),
    ...(entree.extension === true ? { extension: true } : {}),
    ...(entree.racine !== undefined ? { racine: cles.get(entree.racine) ?? entree.racine } : {}),
  }));
  const variables: VariablePubliee[] = [];
  for (const entree of inventaire.entrees) {
    if (entree.cible.type !== 'variable') continue;
    variables.push({ id: cle(entree), nom: entree.nom.nom, collection: cles.get(entree.cible.collectionId) ?? entree.cible.collectionId });
  }
  return { collections, variables };
}

/** Deux chemins en conflit : égaux, ou l'un est le groupe de l'autre. Un chemin vide ne se publie pas. */
const enConflit = (a: string, b: string): boolean => a !== '' && b !== '' && (a === b || a.startsWith(`${b}.`) || b.startsWith(`${a}.`));

/** Deux variables, désignées par leur identifiant dans l'inventaire publié, dont les chemins sont en conflit. L'ordre est sans effet. */
export type PaireEnConflit = readonly [string, string];
const clePaire = (a: string, b: string): string => (a < b ? JSON.stringify([a, b]) : JSON.stringify([b, a]));

/** Un chemin vers ses variables, et chaque groupe d'un chemin vers les variables qu'il contient. */
interface IndexDeChemins { readonly parChemin: Map<string, VariablePubliee[]>; readonly parGroupe: Map<string, VariablePubliee[]> }
function indexerLesChemins(variables: readonly VariablePubliee[], cheminDe: (variable: VariablePubliee) => string): IndexDeChemins {
  const parChemin = new Map<string, VariablePubliee[]>();
  const parGroupe = new Map<string, VariablePubliee[]>();
  const ajouter = (index: Map<string, VariablePubliee[]>, cle: string, variable: VariablePubliee): void => {
    const liste = index.get(cle);
    if (liste) liste.push(variable); else index.set(cle, [variable]);
  };
  for (const variable of variables) {
    const chemin = cheminDe(variable);
    if (chemin === '') continue;
    ajouter(parChemin, chemin, variable);
    for (let point = chemin.indexOf('.'); point !== -1; point = chemin.indexOf('.', point + 1)) ajouter(parGroupe, chemin.slice(0, point), variable);
  }
  return { parChemin, parGroupe };
}

/** Un axe de modes tel que l'export de tokens le retient : sa clé est le préfixe de sa collection, et `extensions` dit s'il garde les siennes. */
export interface AxeDeLExport { readonly cle: string; readonly extensions: boolean }

interface ConflitDAxes {
  readonly motif: 'meme-axe' | 'axe-et-extensions';
  /** `meme-axe` : la collection de plus petit identifiant. `axe-et-extensions` : la collection qui a des extensions. */
  readonly a: CollectionPubliee;
  /** `meme-axe` : l'autre collection. `axe-et-extensions` : la collection dont le nom est réservé à ces extensions. */
  readonly b: CollectionPubliee;
}

/**
 * Les axes que `axesDesCollections` de l'exporteur retient pour ces collections, d'après le nom que `nomDe` leur donne, et les
 * conflits qui en écartent d'autres. Une collection est un axe quand elle n'est pas une extension et qu'elle a au moins deux modes
 * ou qu'une extension locale la désigne comme racine. Deux axes de même clé, ou un axe de clé vide, sont écartés ; un axe qui a des
 * extensions les perd quand un autre axe donne la propriété CSS que ces extensions réserveraient.
 * Les autres causes d'écart de l'exporteur (mode sans nom, mode par défaut introuvable, extensions mal nommées) ne se lisent pas ici.
 */
function axesPrevus(collections: readonly CollectionPubliee[], nomDe: (collection: CollectionPubliee) => string): { readonly axes: Map<string, AxeDeLExport>; readonly conflits: ConflitDAxes[] } {
  const racines = new Set(collections.flatMap((collection) => (collection.extension === true && collection.racine !== undefined ? [collection.racine] : [])));
  const parCle = new Map<string, CollectionPubliee[]>();
  for (const collection of collections) {
    if (collection.extension === true || ((collection.nombreDeModes ?? 0) < 2 && !racines.has(collection.id))) continue;
    const cle = prefixeDeCollection(nomDe(collection));
    parCle.set(cle, [...(parCle.get(cle) ?? []), collection]);
  }
  const axes = new Map<string, AxeDeLExport>();
  const porteurs = new Map<string, CollectionPubliee>();
  const conflits: ConflitDAxes[] = [];
  for (const [cle, partageant] of parCle) {
    if (cle === '') continue;
    if (partageant.length === 1) {
      axes.set(partageant[0]!.id, { cle, extensions: racines.has(partageant[0]!.id) });
      porteurs.set(partageant[0]!.id, partageant[0]!);
      continue;
    }
    const triees = [...partageant].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    for (let i = 0; i < triees.length; i++) for (let j = i + 1; j < triees.length; j++) conflits.push({ motif: 'meme-axe', a: triees[i]!, b: triees[j]! });
  }
  const parPropriete = new Map([...axes].map(([id, axe]) => [tokenCssVariable(axe.cle), id]));
  for (const [id, axe] of [...axes]) {
    if (!axe.extensions) continue;
    const rivale = parPropriete.get(tokenCssVariable(axeDesExtensions(axe.cle)));
    if (rivale === undefined) continue;
    conflits.push({ motif: 'axe-et-extensions', a: porteurs.get(id)!, b: porteurs.get(rivale)! });
    if ((porteurs.get(id)!.nombreDeModes ?? 0) < 2) axes.delete(id); else axes.set(id, { ...axe, extensions: false });
  }
  return { axes, conflits };
}

/** Les axes de modes que l'export de tokens retient pour ces collections, par identifiant de collection. */
export function axesDeLExport(collections: readonly CollectionPubliee[]): ReadonlyMap<string, AxeDeLExport> {
  return axesPrevus(collections, (collection) => collection.nom).axes;
}

const cleDeConflitDAxes = ({ motif, a, b }: ConflitDAxes): string => JSON.stringify([motif, a.id, b.id]);

/**
 * Les renommages qui créent un conflit de chemin que le document n'avait pas. Un conflit présent avant les renommages
 * ne bloque rien. Un renommage en conflit avec un objet qui ne change pas est seul en cause ; deux renommages en conflit
 * le sont ensemble. Le renommage d'une collection est en cause quand ses variables entrent en conflit.
 * Il l'est aussi quand le nom de la collection donne la clé d'axe d'une autre collection à modes (`meme-axe`), ou le nom que
 * l'export réserve aux extensions d'une autre (`axe-et-extensions`), sans que ce soit déjà le cas avant les renommages.
 * Les renommages en cause sont retirés tous ensemble, puis le contrôle recommence, car le nom rendu à un objet peut en bloquer un autre.
 *
 * @param renommages le nouveau nom, par identifiant de variable ou de collection.
 * @param dejaEnConflit les paires de variables qu'un état antérieur à `inventaire` avait déjà en conflit (`pairesDejaEnConflit`) :
 *   une telle paire ne compte pas comme conflit nouveau. Sans ce paramètre, seul l'état de `inventaire` fait référence.
 */
export function cheminsEnConflit(inventaire: InventairePublie, renommages: ReadonlyMap<string, string>, dejaEnConflit: readonly PaireEnConflit[] = []): CheminEnConflit[] {
  const nomsDesCollections = new Map(inventaire.collections.map((collection) => [collection.id, collection.nom]));
  const avant = new Map(inventaire.variables.map((variable) => [variable.id, joinTokenPath(nomsDesCollections.get(variable.collection) ?? '', variable.nom)]));
  const anciennes = new Set(dejaEnConflit.map(([a, b]) => clePaire(a, b)));
  const axesAvant = new Set(axesPrevus(inventaire.collections, (collection) => collection.nom).conflits.map(cleDeConflitDAxes));
  const actifs = new Map(renommages);
  const causes: CheminEnConflit[] = [];
  for (;;) {
    const tour = unTour(inventaire, nomsDesCollections, avant, actifs, anciennes, axesAvant);
    if (tour.length === 0) return causes;
    for (const cause of tour) { actifs.delete(cause.id); causes.push(cause); }
  }
}

/**
 * Les paires de variables dont les chemins sont déjà en conflit dans `inventaire`, quand l'une des deux est touchée.
 * `touches` nomme des variables, ou des collections dont toutes les variables comptent. Chaque paire sort une fois,
 * triée, et la liste est triée : elle se range telle quelle.
 */
export function pairesDejaEnConflit(inventaire: InventairePublie, touches: ReadonlySet<string>): PaireEnConflit[] {
  const nomsDesCollections = new Map(inventaire.collections.map((collection) => [collection.id, collection.nom]));
  const chemins = new Map(inventaire.variables.map((variable) => [variable.id, joinTokenPath(nomsDesCollections.get(variable.collection) ?? '', variable.nom)]));
  const { parChemin, parGroupe } = indexerLesChemins(inventaire.variables, (variable) => chemins.get(variable.id)!);
  const paires = new Map<string, PaireEnConflit>();
  for (const variable of inventaire.variables) {
    if (!touches.has(variable.id) && !touches.has(variable.collection)) continue;
    const chemin = chemins.get(variable.id)!;
    if (chemin === '') continue;
    const autres: VariablePubliee[] = [...(parChemin.get(chemin) ?? []), ...(parGroupe.get(chemin) ?? [])];
    for (let point = chemin.indexOf('.'); point !== -1; point = chemin.indexOf('.', point + 1)) autres.push(...(parChemin.get(chemin.slice(0, point)) ?? []));
    for (const autre of autres) {
      if (autre.id === variable.id) continue;
      paires.set(clePaire(variable.id, autre.id), variable.id < autre.id ? [variable.id, autre.id] : [autre.id, variable.id]);
    }
  }
  return [...paires.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, paire]) => paire);
}

function unTour(
  inventaire: InventairePublie,
  collections: ReadonlyMap<string, string>,
  avant: ReadonlyMap<string, string>,
  actifs: ReadonlyMap<string, string>,
  anciennes: ReadonlySet<string>,
  axesAvant: ReadonlySet<string>,
): CheminEnConflit[] {
  const nomDeCollection = (id: string): string => actifs.get(id) ?? collections.get(id) ?? '';
  const nomDeVariable = (variable: VariablePubliee): string => actifs.get(variable.id) ?? variable.nom;
  const etiquette = (variable: VariablePubliee): string => `${nomDeCollection(variable.collection)}/${nomDeVariable(variable)}`;
  const touche = (variable: VariablePubliee): boolean => actifs.has(variable.id) || actifs.has(variable.collection);

  const apres = new Map<string, string>();
  for (const variable of inventaire.variables) {
    apres.set(variable.id, touche(variable) ? joinTokenPath(nomDeCollection(variable.collection), nomDeVariable(variable)) : avant.get(variable.id)!);
  }
  const { parChemin, parGroupe } = indexerLesChemins(inventaire.variables, (variable) => apres.get(variable.id)!);

  /** Le premier objet dont le chemin entre en conflit avec `chemin` sans que les deux l'aient été avant. */
  const nouveauConflit = (variable: VariablePubliee, chemin: string): { readonly motif: MotifDeChemin; readonly apres: VariablePubliee; readonly autre: VariablePubliee } | undefined => {
    if (chemin === '') return undefined;
    const nouveau = (autre: VariablePubliee): boolean => autre.id !== variable.id && !enConflit(avant.get(variable.id)!, avant.get(autre.id)!) && (anciennes.size === 0 || !anciennes.has(clePaire(variable.id, autre.id)));
    for (const autre of parChemin.get(chemin) ?? []) if (nouveau(autre)) return { motif: 'meme-token', apres: variable, autre };
    for (let point = chemin.indexOf('.'); point !== -1; point = chemin.indexOf('.', point + 1)) {
      for (const groupe of parChemin.get(chemin.slice(0, point)) ?? []) if (nouveau(groupe)) return { motif: 'token-et-groupe', apres: groupe, autre: variable };
    }
    for (const contenu of parGroupe.get(chemin) ?? []) if (nouveau(contenu)) return { motif: 'token-et-groupe', apres: variable, autre: contenu };
    return undefined;
  };

  const vus = new Set<string>();
  const tour: CheminEnConflit[] = [];
  const noter = (id: string, motif: MotifDeChemin, apresNom: string, autreNom: string): void => {
    if (vus.has(id)) return;
    vus.add(id);
    tour.push({ id, motif, apres: apresNom, autre: autreNom });
  };
  const signaler = (id: string, conflit: NonNullable<ReturnType<typeof nouveauConflit>>): void => noter(id, conflit.motif, etiquette(conflit.apres), etiquette(conflit.autre));
  for (const variable of inventaire.variables) {
    if (!touche(variable)) continue;
    const conflit = nouveauConflit(variable, apres.get(variable.id)!);
    if (!conflit) continue;
    // Le nom et la collection d'une même variable peuvent chacun causer le conflit : les deux sont alors en cause.
    if (actifs.has(variable.id)) signaler(variable.id, conflit);
    if (actifs.has(variable.collection)) signaler(variable.collection, conflit);
  }
  // Un conflit d'axes n'a pas de variable : il est neuf quand le renommage le crée, et le renommage de chaque collection en cause le signale.
  for (const conflit of axesPrevus(inventaire.collections, (collection) => nomDeCollection(collection.id)).conflits) {
    if (axesAvant.has(cleDeConflitDAxes(conflit))) continue;
    const { motif, a, b } = conflit;
    if (motif === 'meme-axe') {
      if (actifs.has(a.id)) noter(a.id, motif, nomDeCollection(a.id), nomDeCollection(b.id));
      if (actifs.has(b.id)) noter(b.id, motif, nomDeCollection(b.id), nomDeCollection(a.id));
    } else {
      for (const { id } of [a, b]) if (actifs.has(id)) noter(id, motif, nomDeCollection(a.id), nomDeCollection(b.id));
    }
  }
  return tour;
}

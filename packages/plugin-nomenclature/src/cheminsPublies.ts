/**
 * Les chemins que l'export de tokens donne aux variables. UCM Exporter garde le premier de deux tokens de même chemin
 * et écarte un token dont le chemin est le groupe d'un autre : un renommage qui crée l'un de ces cas fait disparaître
 * un token de `tokens.json`. Le contrôle des noms Figma exacts ne les voit pas (`bg/primary` et `Background/primary`
 * ont deux noms et un chemin).
 *
 * Le module est pur : il lit un inventaire et des renommages, et ne touche à aucun objet Figma.
 */
import type { Collision } from '@ucm-kit/core/referentiel';
import { joinTokenPath } from 'ucm-plugin-socle/src/cheminsDeTokens';
import type { EntreeInventaire, Inventaire } from './lecture';
import type { MotifDeChemin } from './messages';

export interface CollectionPubliee { readonly id: string; readonly nom: string }
export interface VariablePubliee { readonly id: string; readonly nom: string; readonly collection: string }
/** Tout le document : les collections et les variables locales, analysées ou non, cochées ou non, protégées ou non. */
export interface InventairePublie { readonly collections: readonly CollectionPubliee[]; readonly variables: readonly VariablePubliee[] }

/** Un renommage qui crée un conflit de chemin. `id` est celui du renommage (variable ou collection). */
export interface CheminEnConflit {
  readonly id: string;
  readonly motif: MotifDeChemin;
  /** `collection/variable` du token (qui est aussi le groupe de `autre` pour `token-et-groupe`), noms d'après les renommages. */
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
  const collections: CollectionPubliee[] = [];
  const cles = new Map<string, string>();
  for (const entree of inventaire.entrees) {
    if (entree.cible.type !== 'collection') continue;
    cles.set(entree.cible.collectionId, cle(entree));
    collections.push({ id: cle(entree), nom: entree.nom.nom });
  }
  const variables: VariablePubliee[] = [];
  for (const entree of inventaire.entrees) {
    if (entree.cible.type !== 'variable') continue;
    variables.push({ id: cle(entree), nom: entree.nom.nom, collection: cles.get(entree.cible.collectionId) ?? entree.cible.collectionId });
  }
  return { collections, variables };
}

/** Deux chemins en conflit : égaux, ou l'un est le groupe de l'autre. Un chemin vide ne se publie pas. */
const enConflit = (a: string, b: string): boolean => a !== '' && b !== '' && (a === b || a.startsWith(`${b}.`) || b.startsWith(`${a}.`));

/**
 * Les renommages qui créent un conflit de chemin que le document n'avait pas. Un conflit présent avant les renommages
 * ne bloque rien. Un renommage en conflit avec un objet qui ne change pas est seul en cause ; deux renommages en conflit
 * le sont ensemble. Le renommage d'une collection est en cause quand ses variables entrent en conflit.
 * Les renommages en cause sont retirés tous ensemble, puis le contrôle recommence, car le nom rendu à un objet peut en bloquer un autre.
 *
 * @param renommages le nouveau nom, par identifiant de variable ou de collection.
 */
export function cheminsEnConflit(inventaire: InventairePublie, renommages: ReadonlyMap<string, string>): CheminEnConflit[] {
  const nomsDesCollections = new Map(inventaire.collections.map((collection) => [collection.id, collection.nom]));
  const avant = new Map(inventaire.variables.map((variable) => [variable.id, joinTokenPath(nomsDesCollections.get(variable.collection) ?? '', variable.nom)]));
  const actifs = new Map(renommages);
  const causes: CheminEnConflit[] = [];
  for (;;) {
    const tour = unTour(inventaire, nomsDesCollections, avant, actifs);
    if (tour.length === 0) return causes;
    for (const cause of tour) { actifs.delete(cause.id); causes.push(cause); }
  }
}

function unTour(
  inventaire: InventairePublie,
  collections: ReadonlyMap<string, string>,
  avant: ReadonlyMap<string, string>,
  actifs: ReadonlyMap<string, string>,
): CheminEnConflit[] {
  const nomDeCollection = (id: string): string => actifs.get(id) ?? collections.get(id) ?? '';
  const nomDeVariable = (variable: VariablePubliee): string => actifs.get(variable.id) ?? variable.nom;
  const etiquette = (variable: VariablePubliee): string => `${nomDeCollection(variable.collection)}/${nomDeVariable(variable)}`;
  const touche = (variable: VariablePubliee): boolean => actifs.has(variable.id) || actifs.has(variable.collection);

  const apres = new Map<string, string>();
  for (const variable of inventaire.variables) {
    apres.set(variable.id, touche(variable) ? joinTokenPath(nomDeCollection(variable.collection), nomDeVariable(variable)) : avant.get(variable.id)!);
  }
  // Un chemin vers ses variables, et chaque groupe d'un chemin vers les variables qu'il contient.
  const parChemin = new Map<string, VariablePubliee[]>();
  const parGroupe = new Map<string, VariablePubliee[]>();
  const ajouter = (index: Map<string, VariablePubliee[]>, cle: string, variable: VariablePubliee): void => {
    const liste = index.get(cle);
    if (liste) liste.push(variable); else index.set(cle, [variable]);
  };
  for (const variable of inventaire.variables) {
    const chemin = apres.get(variable.id)!;
    if (chemin === '') continue;
    ajouter(parChemin, chemin, variable);
    for (let point = chemin.indexOf('.'); point !== -1; point = chemin.indexOf('.', point + 1)) ajouter(parGroupe, chemin.slice(0, point), variable);
  }

  /** Le premier objet dont le chemin entre en conflit avec `chemin` sans que les deux l'aient été avant. */
  const nouveauConflit = (variable: VariablePubliee, chemin: string): { readonly motif: MotifDeChemin; readonly apres: VariablePubliee; readonly autre: VariablePubliee } | undefined => {
    if (chemin === '') return undefined;
    const nouveau = (autre: VariablePubliee): boolean => autre.id !== variable.id && !enConflit(avant.get(variable.id)!, avant.get(autre.id)!);
    for (const autre of parChemin.get(chemin) ?? []) if (nouveau(autre)) return { motif: 'meme-token', apres: variable, autre };
    for (let point = chemin.indexOf('.'); point !== -1; point = chemin.indexOf('.', point + 1)) {
      for (const groupe of parChemin.get(chemin.slice(0, point)) ?? []) if (nouveau(groupe)) return { motif: 'token-et-groupe', apres: groupe, autre: variable };
    }
    for (const contenu of parGroupe.get(chemin) ?? []) if (nouveau(contenu)) return { motif: 'token-et-groupe', apres: variable, autre: contenu };
    return undefined;
  };

  const vus = new Set<string>();
  const tour: CheminEnConflit[] = [];
  const signaler = (id: string, conflit: NonNullable<ReturnType<typeof nouveauConflit>>): void => {
    if (vus.has(id)) return;
    vus.add(id);
    tour.push({ id, motif: conflit.motif, apres: etiquette(conflit.apres), autre: etiquette(conflit.autre) });
  };
  for (const variable of inventaire.variables) {
    if (!touche(variable)) continue;
    const conflit = nouveauConflit(variable, apres.get(variable.id)!);
    if (!conflit) continue;
    // Le nom et la collection d'une même variable peuvent chacun causer le conflit : les deux sont alors en cause.
    if (actifs.has(variable.id)) signaler(variable.id, conflit);
    if (actifs.has(variable.collection)) signaler(variable.collection, conflit);
  }
  return tour;
}

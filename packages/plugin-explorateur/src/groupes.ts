/**
 * L'arbre des groupes, construit depuis les seuls segments `/` des noms Figma.
 * Un point, une espace, un accent ou une casse ne créent ni ne fusionnent
 * aucun groupe. Un segment vide (`a//b`) reste un segment, affiché « (sans
 * nom) » et distinct de tout autre.
 *
 * Un groupe s'identifie par sa collection et la liste de ses segments, jamais
 * par une concaténation : `a/b` dans deux collections, ou un groupe `a.b` et un
 * groupe `a` contenant `b`, restent distincts.
 */
import type { CollectionRelevee, VariableRelevee } from './modele';

/** La clé d'un groupe : collection et segments, sérialisés sans ambiguïté. */
export function cleDeGroupe(collection: string, segments: readonly string[]): string {
  return JSON.stringify([collection, ...segments]);
}

/** Les segments de groupe d'un nom : tous sauf le dernier, qui nomme la variable. */
export function segmentsDeGroupe(nom: string): string[] {
  return nom.split('/').slice(0, -1);
}

/** Le dernier segment d'un nom, celui que la table affiche. */
export function nomCourt(nom: string): string {
  const segments = nom.split('/');
  return segments[segments.length - 1];
}

/** Vrai quand `segments` commence par `prefixe`. Un préfixe vide contient tout. */
export function commencePar(segments: readonly string[], prefixe: readonly string[]): boolean {
  if (prefixe.length > segments.length) return false;
  return prefixe.every((segment, rang) => segments[rang] === segment);
}

/**
 * Vrai quand la variable est rangée dans le groupe ou l'un de ses descendants.
 * L'appartenance à la collection se lit ailleurs, sur `variables` de la
 * collection : une collection étendue liste des variables de sa base.
 */
export function variableDansLeGroupe(variable: VariableRelevee, segments: readonly string[]): boolean {
  return commencePar(segmentsDeGroupe(variable.nom), segments);
}

export interface NoeudDeGroupe {
  readonly cle: string;
  readonly collection: string;
  readonly segments: readonly string[];
  /** Le dernier segment, ou le nom de la collection à la racine. */
  readonly libelle: string;
  readonly enfants: NoeudDeGroupe[];
  /** Les variables posées directement dans ce groupe. */
  readonly variables: string[];
  /** Variables du groupe et de tous ses descendants. */
  total: number;
}

/**
 * L'arbre d'une collection. Les enfants gardent l'ordre de première
 * apparition dans `variables` de la collection, qui suit l'ordre Figma.
 */
export function arbreDeCollection(collection: CollectionRelevee, variables: ReadonlyMap<string, VariableRelevee>): NoeudDeGroupe {
  const racine: NoeudDeGroupe = { cle: cleDeGroupe(collection.id, []), collection: collection.id, segments: [], libelle: collection.nom, enfants: [], variables: [], total: 0 };
  const parCle = new Map<string, NoeudDeGroupe>([[racine.cle, racine]]);
  for (const id of collection.variables) {
    const variable = variables.get(id);
    if (!variable) continue;
    let noeud = racine;
    noeud.total += 1;
    const segments = segmentsDeGroupe(variable.nom);
    for (let profondeur = 1; profondeur <= segments.length; profondeur += 1) {
      const chemin = segments.slice(0, profondeur);
      const cle = cleDeGroupe(collection.id, chemin);
      let enfant = parCle.get(cle);
      if (!enfant) {
        enfant = { cle, collection: collection.id, segments: chemin, libelle: chemin[profondeur - 1], enfants: [], variables: [], total: 0 };
        parCle.set(cle, enfant);
        noeud.enfants.push(enfant);
      }
      enfant.total += 1;
      noeud = enfant;
    }
    noeud.variables.push(id);
  }
  return racine;
}

/** Une ligne de l'arbre aplati, prête à être rendue par une liste virtualisée. */
export interface LigneDArbre {
  readonly noeud: NoeudDeGroupe;
  readonly profondeur: number;
  readonly deplie: boolean;
  readonly aDesEnfants: boolean;
}

/**
 * Les lignes visibles des arbres : un nœud replié cache ses descendants. Le
 * repli ne touche que l'arbre, jamais la sélection.
 */
export function lignesVisibles(arbres: readonly NoeudDeGroupe[], replies: ReadonlySet<string>): LigneDArbre[] {
  const lignes: LigneDArbre[] = [];
  const pile: Array<{ noeud: NoeudDeGroupe; profondeur: number }> = [...arbres].reverse().map((noeud) => ({ noeud, profondeur: 0 }));
  while (pile.length > 0) {
    const { noeud, profondeur } = pile.pop() as { noeud: NoeudDeGroupe; profondeur: number };
    const deplie = !replies.has(noeud.cle);
    lignes.push({ noeud, profondeur, deplie, aDesEnfants: noeud.enfants.length > 0 });
    if (!deplie) continue;
    for (let rang = noeud.enfants.length - 1; rang >= 0; rang -= 1) pile.push({ noeud: noeud.enfants[rang], profondeur: profondeur + 1 });
  }
  return lignes;
}

/** Les clés de la collection et des groupes ancêtres d'une variable dans `collection`, pour les déplier. */
export function clesDesAncetres(variable: VariableRelevee, collection: string = variable.collection): string[] {
  const segments = segmentsDeGroupe(variable.nom);
  return Array.from({ length: segments.length + 1 }, (_, profondeur) => cleDeGroupe(collection, segments.slice(0, profondeur)));
}

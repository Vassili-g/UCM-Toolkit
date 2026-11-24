/**
 * Ce qu'un fichier DTCG contient réellement, et donc ce qui existe.
 *
 * Un module, une question : **ce chemin de token est-il présent dans
 * `tokens.json` ?** La réponse ne passe par aucune projection de nom. Le nom
 * d'un token est son chemin, écrit à l'identique dans le contrat et dans le
 * fichier de tokens ; les comparer demande une lecture, pas une traduction.
 *
 * Pourquoi cela mérite un module plutôt qu'un `Set` construit sur place : la
 * question précédente se posait à la sortie CSS de Style Dictionary, et la
 * traduction `.` → `-` qu'elle imposait s'écrivait à chaque appelant. Elle
 * diverge déjà sur des données réelles : Figma publie des tokens nommés
 * `layouts.sizing.0,5` (virgule décimale), Style Dictionary écrit
 * `--layouts-sizing-0-5`, la traduction produit `layouts-sizing-0,5`, et le
 * token existant est déclaré absent. Une projection est une occasion de
 * diverger ; ce module en supprime le besoin.
 */

import { PREFIXE_DES_INTERMEDIAIRES, cheminDeReference as cheminDuFormat, tokenCssVariable } from "@ucm-kit/core/format";

function estObjet(valeur) {
  return Boolean(valeur) && typeof valeur === "object" && !Array.isArray(valeur);
}

/**
 * Une feuille DTCG est un nœud qui porte `$value` : c'est `$value` qui fait le
 * token, et lui seul. Indexer sur `$type` paraîtrait équivalent (il l'est sur
 * les 721 feuilles du corpus actuel, toutes typées) mais DTCG autorise un
 * `$type` posé sur un groupe et hérité par ses enfants : un `tokens.json`
 * produit par une autre chaîne verrait alors ses feuilles non typées passer
 * pour des groupes, et tous ses tokens pour des absents.
 */
function estFeuille(valeur) {
  return estObjet(valeur) && "$value" in valeur;
}

/**
 * Indexe les feuilles d'un arbre DTCG par leur chemin pointé.
 *
 * Le `$type` rendu avec chaque feuille est celui que DTCG lui reconnaît : le
 * sien s'il en porte un, sinon celui du groupe ancêtre le plus proche. C'est
 * l'héritage que la spécification décrit, et le lire ici évite que chaque
 * appelant le redécouvre, ou l'oublie.
 *
 * Les clés commençant par `$` sont des métadonnées de groupe (`$type`,
 * `$description`, `$extensions`), jamais des enfants : les descendre
 * fabriquerait des chemins qui ne désignent aucun token.
 */
export function indexerTokensDtcg(tokens, chemin = [], index = new Map(), typeHerite = undefined) {
  const pile = [{ valeur: tokens, chemin: chemin.join("."), aChemin: chemin.length > 0, typeHerite }];
  while (pile.length > 0) {
    const courant = pile.pop();
    if (!estObjet(courant.valeur)) continue;
    const type = typeof courant.valeur.$type === "string" ? courant.valeur.$type : courant.typeHerite;
    if (estFeuille(courant.valeur)) {
      index.set(courant.chemin, type === undefined ? courant.valeur : { ...courant.valeur, $type: type });
      continue;
    }
    // Empiler à rebours conserve l'ordre du document sans récursion.
    for (const [cle, enfant] of Object.entries(courant.valeur).reverse()) {
      if (cle.startsWith("$")) continue;
      pile.push({
        valeur: enfant,
        chemin: courant.aChemin ? `${courant.chemin}.${cle}` : cle,
        aChemin: true,
        typeHerite: type,
      });
    }
  }
  return index;
}

/**
 * Les chemins de chaque nom CSS que `tokenCssVariable` donne : une `Map` du nom
 * vers ses chemins, triés. Un nom porté par deux chemins est une collision.
 * `ucm tokens css`, `ucm tokens references` et le juge du code la lisent ici.
 */
export function nomsCssDesTokens(index) {
  return grouperParNomCss(index.keys());
}

function grouperParNomCss(chemins) {
  const parNom = new Map();
  for (const chemin of chemins) {
    const nom = tokenCssVariable(chemin);
    const memes = parNom.get(nom);
    if (memes) memes.push(chemin);
    else parNom.set(nom, [chemin]);
  }
  for (const memes of parNom.values()) memes.sort();
  return parNom;
}

/**
 * Les refus que la feuille CSS oppose à ces chemins, dans l'ordre des noms :
 * `vide` (le chemin ne donne aucun nom CSS), `prefixe-reserve` (le nom commence
 * par `PREFIXE_DES_INTERMEDIAIRES`, que les collections étendues occupent) et
 * `meme-nom` (plusieurs chemins donnent le même nom). Chaque refus porte le
 * `nom` et ses `chemins`, triés.
 *
 * L'Exporter les annonce au designer, et `ucm tokens css` refuse la feuille sur
 * les mêmes : un fichier que l'un laisse passer ne tombe pas chez l'autre.
 */
export function refusDesNomsCss(chemins) {
  const refus = [];
  for (const [nom, memes] of grouperParNomCss(chemins)) {
    if (nom === "--") {
      refus.push({ genre: "vide", nom, chemins: memes });
      continue;
    }
    if (nom.startsWith(PREFIXE_DES_INTERMEDIAIRES)) refus.push({ genre: "prefixe-reserve", nom, chemins: memes });
    if (memes.length > 1) refus.push({ genre: "meme-nom", nom, chemins: memes });
  }
  return refus;
}

/**
 * Le chemin que désigne une chaîne d'alias de `tokens.json`, ou `null`. La forme
 * vit dans `@ucm-kit/core/format`, où `isTokenReference` la partage : l'alias
 * vers un token de premier niveau (`{marque}`) est la seule référence que ce
 * lecteur admet et qu'un contrat n'admet pas.
 */
export const cheminDeReference = cheminDuFormat;

/**
 * Les références qui ne désignent aucun token du fichier DTCG, triées.
 *
 * Prend l'index et non l'arbre : le contrôle se répète pour chaque contrat du
 * repository, et l'arbre ne change pas entre deux.
 *
 * Une chaîne qui n'a pas la forme d'une référence est rendue absente elle
 * aussi. Elle ne peut venir que d'un `tokensUsed` de contrat 10.3 (le relevé
 * automatique, lui, ne ramasse que des références bien formées) et un index
 * qui nomme n'importe quoi désigne, très exactement, un token qui n'existe pas.
 */
export function referencesAbsentes(references, index) {
  // `cheminDeReference` rend `null` sur une chaîne mal formée, et l'index n'a
  // que des chemins pour clés : elle ressort donc absente, sans cas à part.
  return [...references]
    .filter((reference) => !index.has(cheminDeReference(reference)))
    .sort();
}

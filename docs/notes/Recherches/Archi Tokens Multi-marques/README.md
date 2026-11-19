# Architecture des tokens multi-marques

[La vue illustrée](./VUE-ILLUSTREE-MULTIMARQUES.html) est la référence actuelle :
structure des collections, panneau des variables, rôles et états, utilisation
dans Figma et dans le code. Ouvrir le fichier HTML dans un navigateur.

| Ressource | Contenu |
|---|---|
| [Vue illustrée](./VUE-ILLUSTREE-MULTIMARQUES.html) | Architecture et exploration des alias |
| [Référence](./tokens-reference.json) | `tokens.json` au format 2 de la référence complète, pour deux marques inventées (`marque-1`, `marque-2`) |
| [Générateur de la référence](./generer-reference.ts) | Écrit la référence depuis le kit ; son mode `--comparer` liste les écarts d'un autre `tokens.json` |
| [Données du panneau](./donnees-vue-illustree.js) | Les variables de la référence, telles que la vue les affiche |
| [Convertisseur du panneau](./generer-vue-illustree.ts) | Conversion d'un `tokens.json` en données du panneau |
| [Données du référentiel](./donnees-referentiel.js) | Collections, table en dossiers, libellés, recommandations et outils, produits par [`generer-donnees-referentiel.ts`](./generer-donnees-referentiel.ts) |

## Actualiser la vue

Depuis la racine du dépôt :

```sh
npm run vues
```

La commande régénère `tokens-reference.json`, puis `donnees-vue-illustree.js` à
partir de lui, puis `donnees-referentiel.js`. Elle n'écrit un fichier que si son
contenu change. Recharger ensuite la page HTML. Les tests de
`tests/vueIllustree.test.ts` échouent avec « La vue n'est plus à jour » tant
qu'un de ces fichiers est périmé, et refusent les anciens noms `color-brands`,
`color-utilities`, `layouts`, `colors` et `press` dans les données.

## La référence

`generer-reference.ts` écrit les 7 collections de la référence :
[`variablesAttendues`](../../../../packages/kit/src/referentiel/reference.ts)
donne les noms de `brands`, `utility` et `theme`, `ECHELLES_DE_REFERENCE` les
valeurs de `layout`, `typography` et des mesures de `primitives`, et
`CIBLES_DE_L_ELEVATION` les niveaux d'élévation. `theme` suit
`TABLE_DES_DOSSIERS` au sens normal. Le générateur ne recopie aucune de ces
listes.

Les couleurs de `primitives` sont calculées par le moteur
[`ucm-couleur`](../../../../packages/couleur/CARTE.md) au préréglage par
défaut : une couleur de départ par palette, neuf palettes nommées
`palette-a` à `palette-i`. Les deux marques ont chacune une palette primaire
et une palette secondaire, les quatre statuts ont une palette à deux profils,
et la dernière est le neutre. Le panneau montre aussi un bouton d'exemple dans
`components`, que la référence n'impose pas.

```sh
npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/generer-reference.ts"
```

## Comparer un export à la référence

```sh
npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/generer-reference.ts" --comparer "chemin/tokens.json"
```

Le mode `--comparer` écrit sur la sortie standard, par collection, les noms
manquants, les noms en trop et les valeurs qui diffèrent. Il n'écrit aucun
fichier et rend « Aucun écart. » quand le fichier suit la référence. Il
ignore trois choses : le nom des palettes de `primitives` (il compte seulement
leurs variables, 22, 24 ou 44), le cran visé par `identity`, que le designer
choisit, et `components`, que la référence n'impose pas. Un écart de `layout`
ou de `typography` se lit comme un écart à la proposition, jamais comme une
faute.

## Convertir un autre export

```sh
npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/generer-vue-illustree.ts" "chemin/tokens.json" "sortie.js"
```

Le convertisseur garde les valeurs et les alias du fichier lu. Sans argument,
il lit `tokens-reference.json` et remplace `donnees-vue-illustree.js`.

## Le référentiel de la page

La table des rôles, la liste des collections, les libellés, les recommandations
et le rôle des outils viennent du référentiel
([`packages/kit/src/referentiel`](../../../../packages/kit/src/referentiel/index.ts)
et [`emplois`](../../../../packages/kit/src/emplois/index.ts)).
`npm run vues` régénère aussi leurs données, et le test
`tests/vueIllustree.test.ts` échoue tant que `donnees-referentiel.js` n'est pas
à jour.

La maquette de comparaison de l’aperçu du plugin est rangée avec
[`comparer-maquette.cjs`](../../../../packages/plugin-palettes/galerie/comparer-maquette.cjs),
sous `galerie/fixtures/apercu-en-bandes.html`.

# Architecture des tokens multi-marques

[La vue illustrée](./VUE-ILLUSTREE-MULTIMARQUES.html) est la référence actuelle :
structure des collections, panneau des variables, rôles et états, utilisation
dans Figma et dans le code. Ouvrir le fichier HTML dans un navigateur.

| Ressource | Contenu |
|---|---|
| [Vue illustrée](./VUE-ILLUSTREE-MULTIMARQUES.html) | Architecture et exploration des alias |
| [Données du panneau](./donnees-vue-illustree.js) | Instantané des variables affichées |
| [Générateur](./generer-vue-illustree.ts) | Conversion d’un export de tokens en données du panneau |

## Actualiser le panneau

Depuis la racine du dépôt, après un export des tokens Figma :

```sh
npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/generer-vue-illustree.ts" "chemin/tokens.json"
```

Le générateur remplace `donnees-vue-illustree.js`. Il conserve les valeurs et
les alias de l’export ; il ne recalcule aucune palette. Recharger ensuite la
page HTML. Les collections montrées sont `components`, `theme`, `color-brands`,
`color-utilities`, `primitives`, `layouts` et `typography`, lorsqu’elles sont
présentes dans l’export.

La table des rôles et les garanties sont définies dans
[`packages/kit/src/emplois`](../../../../packages/kit/src/emplois/index.ts).
Lors d’une évolution, actualiser la vue et ses données.

La maquette de comparaison de l’aperçu du plugin est rangée avec
[`comparer-maquette.cjs`](../../../../packages/plugin-palettes/galerie/comparer-maquette.cjs),
sous `galerie/fixtures/apercu-en-bandes.html`.

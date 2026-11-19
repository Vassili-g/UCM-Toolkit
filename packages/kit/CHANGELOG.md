# Journal de la prise des modules

Ce journal note chaque changement de `@ucm-kit/core/modules`, la seule porte du kit que les modules peuvent appeler. Les versions sont du plus récent au plus ancien. Un changement interne au kit n'a pas d'entrée.

Une entrée a un genre (`ajout`, `déprécié` ou `rupture`), nomme les noms touchés entre accents graves, dit le geste à faire dans un module, et se termine par « Décidé par ... ». Les règles sont dans `invariants/versionnage.md`.

## 0.17.0

### ajout

La prise `@ucm-kit/core/modules` s'ouvre. Un module y trouve de quoi lire les mêmes contrats et les mêmes tokens qu'`ucm check`, avec 7 fonctions et 1 type.

- `lireConfiguration` dit où sont les contrats, les tokens et le code, d'après `ucm.config.json`.
- `trouverContrats` donne les contrats d'un dossier.
- `verdictDeVersion` dit si ce kit sait lire la version d'un contrat.
- `vueExacteDuVariant` donne ce que dit une combinaison de variantes.
- `indexerTokensDtcg` donne les tokens que le fichier de tokens contient.
- `isTokenReference` dit si une valeur est une référence de token.
- `tokenCssVariable` donne le nom CSS d'un token.
- `Contract` est la forme du contrat pour TypeScript.

Geste pour un module : importer ces noms depuis `@ucm-kit/core/modules` seulement, et épingler la version exacte du kit que la CLI du repository épingle.

Décidé par le mainteneur.

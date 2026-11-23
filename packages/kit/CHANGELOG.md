# Journal de la prise des modules

Ce journal note chaque changement de `@ucm-kit/core/modules`, la seule porte du kit que les modules peuvent appeler. Les versions sont du plus récent au plus ancien. Un changement interne au kit n'a pas d'entrée.

Une entrée a un genre (`ajout`, `déprécié` ou `rupture`), nomme les noms touchés entre accents graves, dit le geste à faire dans un module, et se termine par « Décidé par ... ». Les règles sont dans `invariants/versionnage.md`.

## 0.18.0

### rupture

- `lireConfiguration` refuse un motif `implementation` sans `{id}`. Geste dans un module : écrire `{id}` dans le motif de `ucm.config.json`, par exemple `{dir}/{id}/index.tsx`.
- `preparerControle` écrit la commande de dérogation `npx @ucm-kit/cli deroger …` au lieu de `npx ucm deroger …`. Geste dans un module : aucun, le message s'affiche tel quel.

Décidé par le mainteneur (P27, PP-104 et PP-209).

## 0.17.4

### ajout

La prise gagne `preparerControle`, qui juge le code d'un fichier de composant. Un module lui donne le fichier et le lecteur du code, et reçoit des constats complets : message, position, règle et commande de dérogation. C'est la fonction qu'`ucm check` appelle, donc l'éditeur et la CI disent la même chose.

- `preparerControle` lit `ucm.config.json`, les contrats, `tokens.json` et `.ucm/derogations.json` à chaque appel, et ne lève jamais : une panne de lecture devient une limite. Son option `texte` juge un texte non enregistré.
- `ControleDuFichier` est son résultat : la racine, le fichier, les composants, les limites et les constats.
- `Constat` est un constat ; le contenu de `faits` dépend de son `code`. `CodeDeConstat` liste les codes, et `RegleDuControle` les deux règles qu'un module affiche, `token-inconnu` et `valeur-en-dur`.
- `Limite` est ce que le contrôle n'a pas pu juger, avec `CodeDeLimite` pour ses codes.
- `LecteurDuCode` est le lecteur que `preparerControle` appelle. Ses résultats sont `UsagesDuCode`, `ChaineDuCode`, `DeclarationDuCode`, `DirectiveDuCode`, `LectureDuCode` et `FichiersDuComposant`.

Geste pour un module : importer ces noms depuis `@ucm-kit/core/modules` et le lecteur depuis `@ucm-kit/adapter-typescript/usages`, écrire une règle par valeur de `regle`, et ne jamais afficher en erreur un constat qui porte `deroge`.

Décidé par le mainteneur (Q7 A).

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

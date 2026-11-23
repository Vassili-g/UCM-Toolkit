# Journal de la porte `usages`

Ce journal note chaque changement de `@ucm-kit/adapter-typescript/usages`, la seule porte de l'adaptateur qu'un module peut importer. Les versions sont du plus récent au plus ancien. Un changement interne à l'adaptateur n'a pas d'entrée.

Une entrée a un genre (`ajout`, `déprécié` ou `rupture`), nomme les noms touchés entre accents graves, dit le geste à faire dans un module, et se termine par « Décidé par ... ». Les règles sont celles de la prise du kit, dans `packages/kit/invariants/versionnage.md` : une rupture monte le chiffre du milieu de l'adaptateur. `tests/usagesPromis.test.mjs` exige cette entrée.

## 0.2.14

### ajout

L'adaptateur ouvre la porte `@ucm-kit/adapter-typescript/usages`, avec un seul nom.

- `lecteurDuCode` relève ce que le code d'un composant écrit : ses chaînes, ses déclarations de style, ses variables `--nom` et les commentaires qui désactivent une règle UCM. Il lit les fichiers `.ts` et `.tsx`, liste les fichiers d'un composant, et ne juge rien. Ses types sont ceux de `LecteurDuCode` dans `@ucm-kit/core/modules`.

Geste pour un module : passer `lecteurDuCode` à `preparerControle` de `@ucm-kit/core/modules`, qui juge ce que le lecteur relève. Ne rien importer d'autre de l'adaptateur, et employer celui que le repository installe pour `ucm check`.

Décidé par le mainteneur (Q7 A).

# E3a. Rôles proches et palette voisine

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E2d.

Fichiers : `packages/kit/src/controles/integrite.ts`, `packages/kit/src/controles/theme.ts`.
Lisez `PLAN-STRESS-F2-STRUCTURE.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E3.1 Rôles proches (Q-F2-1, E-19). Un dernier segment proche d'un rôle du même dossier donne une question, au lieu de créer le
  rôle absent. Une variable loin de tout rôle ne donne rien.
- [x] E3.4 Palette voisine (Q-F2-2). Un rôle aliasé vers la rampe d'une autre palette donne une question sans présélection.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

E3.1 et E3.4 faites, non commitées, version du kit non montée.

- E3.1 : `controlerLIntegriteUcm` rend une question `variable-inconnue` (sans correction ni case cochée) quand une variable de `theme` est proche d'un rôle du même groupe, et ne crée plus le rôle absent. Proche : une lettre retirée, ajoutée, remplacée ou échangée sur le dernier segment ou sur le dossier, ou un synonyme (`memeConcept` du vocabulaire, plus `SYNONYMES_DE_ROLE` de `integrite.ts` pour `text`, `bg` et `focus`). Une variable loin de tout rôle ne donne rien. Le nom proposé reprend la casse et le séparateur du nom fautif.
- E3.4 : une variable sur la rampe d'une autre palette (`lesJumelles`, `etrangeres`) rend une question `rampe-autre-palette` à deux candidats, sans correction ; elle ne vote pas pour le sens.
- Fichiers : `packages/kit/src/controles/integrite.ts` ; régressions dans `packages/kit/tests/integrite.absentes.test.ts` (14 à 18) et `integrite.crans.test.ts` (16, 17) ; oracles K2 et Q3 de `packages/kit/tests/stress/f2-structure/` (`operateursCrans.ts`, `operateursNoms.ts`) et leurs gardes (`stressStructureOperateurs*.test.ts`).
- Contrôles : `mesurer.ts` rend 0 écart sur K2, Q1, Q2, Q3 et 0 faux positif sur la section A. Les régressions échouent avec les `integrite.ts` et `theme.ts` du dernier commit (14 échecs).
- Reste : les cartes d'Architect pour ces genres sont en E4a.

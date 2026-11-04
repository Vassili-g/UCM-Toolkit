# E2c. Formes tolérées, synonymes et collections

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E2b.

Fichiers : `packages/kit/src/referentiel/termes-connus.ts`, `packages/kit/src/referentiel/normalisation.ts`,
`packages/kit/src/referentiel/harmonisation.ts`, `packages/kit/src/referentiel/vocabulaire.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E2.6 Formes tolérées et synonymes. Une forme tolérée bloquée par collision pose une question (E-08). Les blocs gardés entiers
  (E-09), les pluriels (E-10), les termes de `REGISTRES_COMPOSANTS` (E-04) et une référence tolérée (N-02) sont lus. Les synonymes
  du classement `synonymes.json` alimentent la table de `packages/kit/src/referentiel/vocabulaire.ts`, au lieu des 9 groupes en dur (E-11). Un synonyme seul donne une question si son terme UCM est unique
  (Q-F5). Un synonyme sans terme UCM unique donne une information sans action.
- [ ] E2.7 Une collection à une lettre d'une collection UCM (`thme`) propose cette collection en question (Q-F8, E-15). Une référence
  inconnue se replie au lieu de bloquer (E-06). La conversion par `couche` reste (Q-F10).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Pas commencé.

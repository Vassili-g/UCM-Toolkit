# E3c. Doublons de rôle et d’échelle

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E3b.

Fichiers : `packages/kit/src/controles/integrite.ts`, `packages/kit/src/controles/structure.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E3.5 Doublons. Deux collections `theme` donnent un constat À faire (Q-F2-5). Un rôle présent deux fois est
  jugé pour ses deux variables (N-29) et reçoit la question de fusion de Q-F2-6 (écriture en E4.4).
- [ ] E3.6 Doublons d'échelle (Q-F2-8, N-33). Les alias se résolvent avant la comparaison, pour toutes les échelles, à 1e-6 près. Sans
  library choisie, une cible inaccessible donne une information.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Pas commencé.

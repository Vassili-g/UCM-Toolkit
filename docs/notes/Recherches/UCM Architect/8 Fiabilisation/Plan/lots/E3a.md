# E3a. Rôles proches et palette voisine

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E2d.

Fichiers : `packages/kit/src/controles/integrite.ts`, `packages/kit/src/controles/theme.ts`.
Lisez `PLAN-STRESS-F2-STRUCTURE.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E3.1 Rôles proches (Q-F2-1, E-19). Un dernier segment proche d'un rôle du même dossier donne une question, au lieu de créer le
  rôle absent. Une variable loin de tout rôle ne donne rien.
- [ ] E3.4 Palette voisine (Q-F2-2). Un rôle aliasé vers la rampe d'une autre palette donne une question sans présélection.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Pas commencé.

# E9d. Contours et anneaux

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E9c, E1b.

Fichiers : `packages/kit/src/controles/accessibilite.ts` et la définition commune d’anneau de E1b.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E9.8 Contours (Q-F7-8, N-63). Un contour sous 3:1 reste muet quand le remplissage du layer atteint 3:1. Sans remplissage visible,
  ou sous 3:1, mesurez le contour sur le fond des ancêtres.
- [ ] E9.9 Anneau par E1.4 (Q-F7-9, N-58, N-59). Un anneau rempli sans contour se mesure sur son remplissage.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Pas commencé.

# E5c. Texte et fond de page

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E5b.

Fichiers : `packages/kit/src/controles/theme.ts`, `packages/kit/src/controles/corrections.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E5.6 Texte sur fond de page (Q-F3-9, Q-F3-10, N-13, N-14). C59 suit l'alias du token du composant jusqu'au thème. Sa correction
  vise le token du composant qui vise `page/foreground`. Une plage n'est énumérée qu'une fois.
  C59 inclut les fonds `subtle`. Une liaison directe au thème garde C80 seul. Plusieurs tokens possibles vers
  `page/foreground` donnent une question, sans correction présélectionnée.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Pas commencé.

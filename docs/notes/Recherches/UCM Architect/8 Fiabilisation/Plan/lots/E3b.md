# E3b. Sens et modes

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur-exigeant`. Dépend de : E3a.

Fichiers : `packages/kit/src/controles/integrite.ts`, `packages/kit/src/controles/theme.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E3.2 Sens de la palette (Q-F2-3, N-25, N-27). Le sens se lit sur les rôles non dégradés. Un sens partagé ou un `solid/foreground` à
  contre-sens donne une question à deux réponses, sans correction. C60 lit le sens.
- [ ] E3.3 Modes (Q-F2-4, N-24, N-26, E-20). C60 trouve la branche dans le chemin (`primary/dark/300`) et dans les modes de la cible. Un
  alias vers l'autre branche au cran de son propre mode a la correction vers la bonne branche. Toute question C60 a un genre.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Pas commencé.

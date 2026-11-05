# E3b. Sens et modes

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur-exigeant`. Dépend de : E3a.

Fichiers : `packages/kit/src/controles/integrite.ts`, `packages/kit/src/controles/theme.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E3.2 Sens de la palette (Q-F2-3, N-25, N-27). Le sens se lit sur les rôles non dégradés. Un sens partagé ou un `solid/foreground` à
  contre-sens donne une question à deux réponses, sans correction. C60 lit le sens.
- [x] E3.3 Modes (Q-F2-4, N-24, N-26, E-20). C60 trouve la branche dans le chemin (`primary/dark/300`) et dans les modes de la cible. Un
  alias vers l'autre branche au cran de son propre mode a la correction vers la bonne branche. Toute question C60 a un genre.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

E3.2 et E3.3 faites, non commitées, version du kit non montée.

- E3.2 : `lireLeSens` (`integrite.ts`) lit le sens sur les rôles qui suivent la rampe de la palette. `solid/foreground` ne vote pas. Un rôle seul sur l'autre table ne retourne pas le sens (N-25) et reçoit sa correction. Les votes partagés rendent une question `sens-partage` par mode, sur le texte des boutons (blanc ou noir), sans correction. `solid/foreground` à contre-sens rend une question à deux réponses, jamais une correction. C60 lit le même sens.
- E3.3 : C60 (`theme.ts`) trouve la branche de mode dans le chemin de la cible (`primary/dark/300`) et dans les modes de sa collection. Un alias vers l'autre branche au cran du propre mode du rôle reçoit la correction vers la bonne branche (N-26), un cran valable pour les deux sens aussi (N-27). Toute question C60 porte le genre `branche-de-mode` (E-20).
- Fichiers : `packages/kit/src/controles/integrite.ts`, `packages/kit/src/controles/theme.ts` ; régressions dans `packages/kit/tests/integrite.crans.test.ts` (7, 9, 14, 15) et `packages/kit/tests/theme.test.ts` ; oracles K3, K4, M1 et M2 de `packages/kit/tests/stress/f2-structure/` et leurs gardes. Galerie d'Architect : `packages/plugin-architect/galerie/structure/integrite.cjs` (le fichier aux écarts met le texte des boutons au noir en Light) et l'état `t-sens-inconnu` de `galerie/etats/structure.cjs` ; sans cela `tokensCategories.test.ts` comptait une carte de moins sous Crans, parce que l'ancienne question de sens partagé n'existe plus.
- Contrôles : `mesurer.ts` rend 0 écart sur K1 à K4, M1 à M4 et sur les 24 interactions. Les régressions échouent avec les sources du dernier commit.
- Reste : les cartes d'Architect pour `sens-partage` et `branche-de-mode` sont en E4a.

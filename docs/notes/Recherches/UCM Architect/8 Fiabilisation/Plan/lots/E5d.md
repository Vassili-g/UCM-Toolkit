# E5d. Liaisons, alias de composant et scopes

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E5c.

Fichiers : `packages/kit/src/controles/corrections.ts`, `packages/kit/src/controles/mapping.ts`,
`packages/kit/src/controles/couche.ts`, `packages/kit/tests/stressComposantBase.test.ts` et les fixtures concernées.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E5.7 Un constat par liaison (Q-F3-12, Q-F3-16, N-06). Palette et état faux donnent une carte, vers le token qui corrige les deux
  segments, seulement si ce token est unique. Sinon, posez une question. Quand plusieurs constats visent la même liaison, celui qui porte la correction reste.
- [ ] E5.9 Tokens d'icône (Q-F3-15, N-07). Un composant ne déclare plus de token d'icône. L'alias d'un token de composant vers un autre
  composant est un défaut. Les 3 fixtures qui emploient ce motif se mettent à jour.
- [ ] E5.10 Écarts restants. N-04 et N-05 (scopes `SHAPE_FILL` et `FRAME_FILL` de C18), N-21 (variable non chargée ou inaccessible).
- [ ] E5.11 Monter la version du kit. Les régressions F3 passent. Retirez le `todo` N-04 seulement avec sa correction.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Pas commencé.

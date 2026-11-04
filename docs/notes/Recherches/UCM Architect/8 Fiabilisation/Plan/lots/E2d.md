# E2d. Idempotence et branches parallèles

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E2c.

Fichiers : `packages/kit/src/referentiel/normalisation.ts`, `packages/kit/src/referentiel/harmonisation.ts`,
`packages/kit/tests/stressF1Harnais.test.ts` et nouveaux tests de régression F1 dans `packages/kit/tests/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E2.8 Le renommage est idempotent (N-01). Les 720 cas de casse sont expliqués, puis corrigés côté kit ou côté oracle (N-03).
- [ ] E2.9 Branches parallèles au-delà de 12 branches (E-45).
- [ ] E2.10 Monter la version du kit. Les nouvelles régressions F1 passent.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions vérifient le second passage sans renommage ni question nouvelle, la casse et plus de 12 branches.

## Avancement

Pas commencé.

# E7b. Matrice et tokens sans emploi

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E7a.

Fichiers : `packages/kit/src/controles/nommage.ts`, `packages/kit/src/controles/oublis.ts`,
`packages/kit/tests/stress/f5-variants/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E7.5 Au-delà de 4 096 combinaisons, une information donne le total et le nombre de variants. Sous la borne, 200 constats au plus,
  puis « et N autres » (Q-F5-7, E-44). Une valeur répétée ne donne qu'un C31 (N-38).
- [ ] E7.6 Un token au nom illisible donne C32 `nom-illisible` ignorable (Q-F5-8, N-39). C32 `inutilise` ne compte pas une liaison illisible
  (E-33). Une palette hors registre donne `sans-variant` (N-40).
- [ ] E7.8 N-41. Comptez les opérations sur la matrice de 16 × 16 × 16 variants. Mesurez sa durée sur le même banc.
  La cible de 2 secondes reste un objectif du harnais, sans seuil de temps réel dans `npm test`.
- [ ] E7.9 Monter la version du kit. Les nouvelles régressions F5 passent.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les tests bornent le nombre de combinaisons et de constats. La durée de la matrice est relevée dans le harnais, hors test unitaire.

## Avancement

Pas commencé.

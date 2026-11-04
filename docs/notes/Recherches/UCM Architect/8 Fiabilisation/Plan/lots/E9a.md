# E9a. Composition et valeurs de couleur

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E8b.

Fichiers : `packages/kit/src/controles/accessibilite.ts`, `packages/kit/src/emplois/`,
`packages/kit/tests/stress/f7-accessibilite/`. Lisez `PLAN-STRESS-F7-ACCESSIBILITE.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E9.1 Composition et arrondi (Q-F7-1). Gardez les flottants jusqu'à un seul arrondi à 8 bits, puis comparez à dix décimales.
  Corrigez l'oracle si l'écart d'un octet vient d'un ordre d'arrondi différent. Un fond de page ou d'élévation d'alpha inférieur à 1 donne `fond-indetermine`.
- [ ] E9.5 Valeurs hors gamme (Q-F7-5, N-50, N-52). Un canal ou un alpha hors de [0, 1], ou NaN, donne `couleur-hors-gamut`.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Pas commencé.

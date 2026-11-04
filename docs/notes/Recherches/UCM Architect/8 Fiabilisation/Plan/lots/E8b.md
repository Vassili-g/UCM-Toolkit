# E8b. Styles de texte

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E8a.

Fichiers : `packages/kit/src/controles/typographie.ts`, `packages/kit/tests/stress/f5-variants/typo/`.
Lisez `PLAN-STRESS-F5-F6-VARIANTS-TYPO.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E8.3 C64 compare les styles dans chaque valeur de l'axe de taille (Q-F6-2, N-42). Deux layers homonymes ne masquent pas leurs
  styles (N-44). Un texte à styles mixtes reçoit l'information `styles-mixtes` (Q-F6-6, N-43).
  C64 `sans-style-ni-variables` vise seulement une plage sans style ni variable.
- [ ] E8.4 C65 couvre les huit champs de `CHAMPS_DE_TYPOGRAPHIE` (Q-F6-7).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Textes du designer

Écrits par la conversation principale avec `rediger-diagnostics-ucm`. Gardez-les tels quels.

- E8.3, information `styles-mixtes`. Phrase : `Le layer ${layer} porte plusieurs text styles.` Statut : « Appliquez un seul text style, ou ignorez ce constat ». N'écrivez pas « mélange » (Q-F7-14).

## Avancement

Pas commencé.

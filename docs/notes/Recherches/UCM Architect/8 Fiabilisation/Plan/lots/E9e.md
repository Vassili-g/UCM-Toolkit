# E9e. Désactivés et limites de lecture

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E9d.

Fichiers : `packages/kit/src/controles/accessibilite.ts`, `packages/plugin-architect/src/ui/textes/composant.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E9.10 Variants désactivés (Q-F7-10, N-51, N-55, N-60). Gardez `disabled` et `disable`, ajoutez `Disabled=True` et `Enabled=False`.
  C53 dit que contraste et cible sont exclus. Mesurez encore `Inactive`, `read-only`, `dimmed` et le texte sous 12 px, même désactivé.
  `Survol` est une forme tolérée de `hover`.
- [ ] E9.12 Mode de fusion et flou d'arrière-plan (Q-F7-14, N-46). La limite dit « mode de fusion » pour un mode de fusion.
  N-46. Testez la priorité de `peinture-superposee` sur `degrade` quand les remplissages se superposent.
- [ ] E9.13 Lecture partielle (N-53, N-54). Un cycle de `parent` termine. C49 et C50 ne jugent pas ce qui n'a pas été lu.
- [ ] E9.14 Monter la version du kit. Les nouvelles régressions F7 passent.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit. `npm run test:paquet -- architect` passe aussi.

## Avancement

Pas commencé.

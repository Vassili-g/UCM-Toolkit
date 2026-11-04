# E5a. Layers masqués et rôles

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E1b.

Fichiers : `packages/kit/src/controles/corrections.ts`, `packages/kit/src/controles/mapping.ts`,
`packages/kit/tests/stress/f3-composant/`. Lisez `PLAN-STRESS-F3-F4-COMPOSANT.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E5.1 Layers masqués (Q-F3-1). C25 et C29 jugent un layer masqué ou sous un ancêtre masqué. La carte dit que le layer est masqué.
  Une instance imbriquée reste une frontière (Q-F3-2).
- [ ] E5.2 C25 juge toute peinture sans token, pas seulement `title` (E-25, N-11). Il saute l'opacité 0 et la lecture mixte (N-12).
- [ ] E5.3 Nom et rôle (Q-F3-3, N-22). C24 lit la table de E1.5 dans les deux sens. La correction propose le token ou le nom, s'il est
  unique.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Textes du designer

Écrits par la conversation principale avec `rediger-diagnostics-ucm`. Gardez-les tels quels.

- E5.1. Une phrase précède la phrase du constat C25 ou C29 : `Le layer ${layer} est masqué.`, ou `Le layer ${layer} est dans ${ancetre}, qui est masqué.` pour un ancêtre masqué. Le statut ne change pas.
- E5.3. Les cases de correction : `Lier à \`${token}\`` quand le token est unique, `Renommer le layer en ${nom}` quand le nom est unique.

## Avancement

Pas commencé.

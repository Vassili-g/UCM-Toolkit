# E3c. Doublons de rôle et d’échelle

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E3b.

Fichiers : `packages/kit/src/controles/integrite.ts`, `packages/kit/src/controles/structure.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E3.5 Doublons. Deux collections `theme` donnent un constat À faire (Q-F2-5). Un rôle présent deux fois est
  jugé pour ses deux variables (N-29) et reçoit la question de fusion de Q-F2-6 (écriture en E4.4).
- [x] E3.6 Doublons d'échelle (Q-F2-8, N-33). Les alias se résolvent avant la comparaison, pour toutes les échelles, à 1e-6 près. Sans
  library choisie, une cible inaccessible donne une information.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

E3.5 et E3.6 faits. Rien n'est commité.

- `packages/kit/src/controles/integrite.ts` : `controlerLesThemesEnDouble` (`theme-en-double`, sans correction) ; `Prefixe.doublons` et question `role-en-double` (une candidate par variable), chaque variable du rôle étant jugée.
- `packages/kit/src/controles/structure.ts` : `controlerLesEchelles` compare toutes les échelles de `layout`, alias résolus, à 1e-6 ; `cible-inaccessible` (information, par collection) sans library choisie.
- Régressions : `tests/integrite.structure.test.ts` (14, 15), `tests/structure.test.ts` (échelles, cible inaccessible) ; elles échouent sur les sources d’avant le lot (vérifié). Oracles `tests/stress/f2-structure/` passés de `mesure` à `attendu` (X1, X2, L2-9, L2-10, E1-8).
- `npm run test --workspace @ucm-kit/core` : 7 échecs hors lot (4 dans `corrections*.test.ts`, 2 C29 et C80 dans `controles-*.test.ts`, le chrono de « 32 000 noms »), les six premiers aussi sur les sources d’avant le lot ; `npm run typecheck` passe.
- Reste : l'écriture de la fusion (E4.4), l'affichage des trois genres (E4a).

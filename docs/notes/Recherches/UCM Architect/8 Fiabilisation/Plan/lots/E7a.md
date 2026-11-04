# E7a. Axes et valeurs

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur-exigeant`. Dépend de : E6, E1a.

Fichiers : `packages/kit/src/controles/nommage.ts`, `packages/kit/src/controles/mapping.ts`,
`packages/kit/tests/stress/f5-variants/`. Lisez `PLAN-STRESS-F5-F6-VARIANTS-TYPO.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E7.1 Le nom de l'axe décide de son rôle, avant les termes d'un autre registre (Q-F5-2, N-36).
- [ ] E7.2 Deux valeurs renommées dans deux axes donnent C7 sans question (Q-F5-4). Un seul axe encore ouvert donne une question. Les candidats ne comptent pas une valeur déjà
  présente (N-35).
- [ ] E7.3 Deux axes de style (Q-F5-3). Un constat À faire demande de les réunir en un seul axe (`Variant=Solid, Subtle, Outline`),
  sans fusion automatique. Les tokens du style `subtle` visent `surface/*` du thème, ceux du style `solid` visent `solid/*`, et un écart
  donne un constat.
- [ ] E7.4 Casse et forme (Q-F5-5, Q-F5-6, N-34, N-37). Le variant en toutes lettres correspond au token abrégé par la table de E1.1. C9
  reste pour une valeur inconnue. `Error` reçoit C8 vers `Danger`.
- [ ] E7.7 Valeur à point ou à barre lue par E1.6 (Q-F5-10).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Pas commencé.

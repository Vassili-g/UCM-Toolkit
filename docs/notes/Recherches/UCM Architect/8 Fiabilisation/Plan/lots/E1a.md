# E1a. Valeurs de variant et axes

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur-exigeant`. Dépend de : E0, D6b.

Fichiers : `packages/kit/src/referentiel/vocabulaire.ts`, `packages/kit/src/referentiel/ecriture-des-mots.ts`,
`packages/kit/src/referentiel/architecture.ts`, `packages/kit/src/referentiel/conventions.ts`,
`packages/kit/src/controles/nommage.ts` (`axeDePropriete`).
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E1.1 Écriture d'une valeur de variant (Q-F5-5, Q-F5-6). Le variant s'écrit en toutes lettres, avec une majuscule à chaque mot
  (`Small`, `Extra Large`, `Danger`). Le token s'écrit en minuscules et en abréviation (`sm`, `xl`, `danger`). Une table du kit passe de
  l'un à l'autre. `S`, `M`, `L`, `sm` et `Middle` dans un variant ont une correction vers le mot entier.
- [ ] E1.2 Rôle d'un nom d'axe (Q-F5-1, Q-F5-9, E-27). `Type`, `Kind` et `Shape` pilotent le style. `Density` et `Spacing` pilotent la
  taille. Un nom français prend le rôle de son équivalent anglais et reçoit un renommage vers l'anglais. Un axe booléen ne pilote aucun segment.
- [ ] E1.6 Segment d'une valeur à point ou à barre (Q-F5-10). Le point et la barre deviennent un tiret (`16-9`, `1-5`).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Pas commencé.

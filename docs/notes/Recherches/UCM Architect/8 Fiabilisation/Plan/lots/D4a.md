# D4a. Ignorer sans acquisition

Phase D. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase D
dans [README.md](../README.md).

Fichiers : `src/sandbox/structure.ts`, `src/ui/structure/index.ts` et leurs tests.

- [x] D4.1 Refiltrez les constats acquis pour Ignorer et Ne plus ignorer un constat.
  Ignorer un rôle change `rolesIgnores` et relance les contrôles du kit sur le catalogue acquis.
- [x] D4.3a Comparez les résultats ordonnés à une acquisition complète pour chaque portée d'Ignorer et de rétablissement.
  Au moindre doute sur la fraîcheur, relisez le catalogue. Gardez les états périmé et partiel.

Fin : `npm run test:paquet -- architect` passe. Les tests comptent zéro lecture de variable pour le simple filtre et vérifient
le recalcul de C82 après Ignorer un rôle.

## Avancement

D4.1 et D4.3a faits (Claude, non commités). Fichiers : `src/sandbox/structure.ts` (lecture gardée `gardee`, `refiltrerLaLectureGardee`),
`src/sandbox/acquisition.ts` (`reperDesLectures`), `tests/structure.test.ts` (4 gestes comparés à une lecture complète, zéro lecture,
C82 recalculé, relecture après écriture ou nouvel Actualiser). `src/ui/structure/index.ts` inchangé : l'interface ne redemande aucune lecture.
`structure.test.ts` : 50 passent. `test:paquet -- architect` : 1908 passent, 10 échouent hors du lot (`projectionsDesControles`, `ordonnancementDuCatalogue`).
`typecheck` : architect conforme ; le kit échoue sur `tests/definitionsDeLayer.test.ts` (autre lot). Reste : rien pour ce lot.

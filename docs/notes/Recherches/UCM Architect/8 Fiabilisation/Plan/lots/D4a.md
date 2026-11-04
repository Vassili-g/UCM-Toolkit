# D4a. Ignorer sans acquisition

Phase D. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase D
dans [README.md](../README.md).

Fichiers : `src/sandbox/structure.ts`, `src/ui/structure/index.ts` et leurs tests.

- [ ] D4.1 Refiltrez les constats acquis pour Ignorer et Ne plus ignorer un constat.
  Ignorer un rôle change `rolesIgnores` et relance les contrôles du kit sur le catalogue acquis.
- [ ] D4.3a Comparez les résultats ordonnés à une acquisition complète pour chaque portée d'Ignorer et de rétablissement.
  Au moindre doute sur la fraîcheur, relisez le catalogue. Gardez les états périmé et partiel.

Fin : `npm run test:paquet -- architect` passe. Les tests comptent zéro lecture de variable pour le simple filtre et vérifient
le recalcul de C82 après Ignorer un rôle.

## Avancement

Pas commencé.

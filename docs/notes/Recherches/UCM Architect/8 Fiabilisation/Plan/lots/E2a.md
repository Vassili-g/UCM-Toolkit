# E2a. Dictionnaire et vocabulaire du fichier

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur-exigeant`. Dépend de : E1b.

Fichiers : `packages/kit/src/referentiel/vocabulaire.ts`, `packages/kit/src/referentiel/questions.ts`,
`packages/kit/src/referentiel/vocabulaire-du-fichier.ts`, `packages/plugin-architect/src/nomenclature/`,
`packages/kit/tests/stress/f1-noms/donnees/`. Lisez `PLAN-STRESS-F1-NOMS.md`, sections 1, 4 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E2.1 Dictionnaire (Q-F6). La conversation principale classe les listes de candidats du lot 1 dans `formes.json` et
  `synonymes.json`. Le mainteneur ne relit aucun JSON. Transférez les définitions retenues dans
  `packages/kit/src/referentiel/vocabulaire.ts`. Le runtime n'importe aucune donnée depuis `tests/`. Un couple qu'elle ne sait pas classer reste hors du dictionnaire.
- [ ] E2.2 Question « même mot ou deux mots ? » de Nomenclature pour ce couple. La réponse du designer se range dans le vocabulaire du
  fichier, et la question ne revient pas.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit. `npm run test:paquet -- architect` passe aussi.

## Textes du designer

Écrits par la conversation principale avec `rediger-diagnostics-ucm`. Gardez-les tels quels.

- E2.2. La carte reprend la forme d'une paire : titre `titreDePaire` (« Remplacer `a` par `b` ? »), boutons « Remplacer », « Termes différents » et « Plus tard ». Nouvel indice de paire `ecriture-proche` : « Écriture proche ». La réponse « Termes différents » garde la ligne existante « Gardés séparés ».

## Avancement

Pas commencé.

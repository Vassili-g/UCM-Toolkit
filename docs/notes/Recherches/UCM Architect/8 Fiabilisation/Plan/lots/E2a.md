# E2a. Dictionnaire et vocabulaire du fichier

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur-exigeant`. Dépend de : E1b.

Fichiers : `packages/kit/src/referentiel/vocabulaire.ts`, `packages/kit/src/referentiel/questions.ts`,
`packages/kit/src/referentiel/vocabulaire-du-fichier.ts`, `packages/plugin-architect/src/nomenclature/`,
`packages/kit/tests/stress/f1-noms/donnees/`. Lisez `PLAN-STRESS-F1-NOMS.md`, sections 1, 4 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E2.1 Dictionnaire (Q-F6). La conversation principale classe les listes de candidats du lot 1 dans `formes.json` et
  `synonymes.json`. Le mainteneur ne relit aucun JSON. Transférez les définitions retenues dans
  `packages/kit/src/referentiel/vocabulaire.ts`. Le runtime n'importe aucune donnée depuis `tests/`. Un couple qu'elle ne sait pas classer reste hors du dictionnaire.
- [x] E2.2 Question « même mot ou deux mots ? » de Nomenclature pour ce couple. La réponse du designer se range dans le vocabulaire du
  fichier, et la question ne revient pas.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit. `npm run test:paquet -- architect` passe aussi.

## Textes du designer

Écrits par la conversation principale avec `rediger-diagnostics-ucm`. Gardez-les tels quels.

- E2.2. La carte reprend la forme d'une paire : titre `titreDePaire` (« Remplacer `a` par `b` ? »), boutons « Remplacer », « Termes différents » et « Plus tard ». Nouvel indice de paire `ecriture-proche` : « Écriture proche ». La réponse « Termes différents » garde la ligne existante « Gardés séparés ».

## Avancement

E2.1 et E2.2 sont écrits. Les cases ne sont pas cochées.

E2.1. Le dictionnaire est dans le kit. `packages/kit/src/referentiel/vocabulaire.ts` exporte `FORMES_D_UN_MEME_MOT` (32 couples) et
`MOTS_DISTINCTS` (98 couples), copiés de `formes.json`. `questions.ts` supprime la question de tout couple de `MOTS_DISTINCTS`, qu'elle
vienne de la terminaison, du pluriel, des branches parallèles ou de la faute (`select`/`selected`, `bolder`/`border`). Les couples de
`FORMES_D_UN_MEME_MOT` gardent leurs questions de pluriel et de terminaison. Le runtime n'importe rien depuis `tests/`. Les 4 groupes
de `synonymes.json` et les 9 groupes en dur de `SYNONYMES_COURANTS` restent tels quels (E2c). Les 30 paires de `distincts.json` restent
dans le harnais.

E2.2. `questions.ts` pose une question de paire d'indice `ecriture-proche` pour deux mots du fichier qui remplissent ces conditions :
chacun a au moins 5 lettres et ne contient que des lettres ; ils diffèrent d'une lettre ajoutée, retirée, remplacée ou de deux lettres
voisines échangées ; ils partagent une place (même voisin, noms distincts, comme les synonymes) ; aucun n'est un terme, une forme ou une
faute connus du kit (`termeOuVarianteConnu`, ce cas reste à la question de faute) ; le couple n'est ni dans le dictionnaire, ni déjà une
paire d'un autre indice, ni jugé distinct, mis de côté ou voulu dans le fichier. Le mot le plus employé est proposé. La réponse
« Termes différents » écrit la règle `distinct:a|b` existante, que `dejaJugeDuFichier` relit : la question ne revient pas. Le seuil de 5
lettres est provisoire, E2.5 le fixe par la mesure (`LONGUEUR_MINIMALE_D_UN_COUPLE_PROCHE`).

Fichiers :
- `packages/kit/src/referentiel/vocabulaire.ts`, `packages/kit/src/referentiel/questions.ts`
- `packages/kit/src/referentiel/harmonisation.ts` (`IndiceDePaire` reçoit `ecriture-proche`)
- `packages/kit/tests/stress/f1-noms/faux-positifs.ts` (`TypeDeSortie` reçoit `ecriture-proche`, sinon le typecheck échoue)
- `packages/plugin-architect/src/ui/textes/nomenclature.ts` (`indiceDePaire`, « Écriture proche »)
- `packages/kit/tests/dictionnaireDuVocabulaire.test.ts` (nouveau, 10 tests)
- `packages/plugin-architect/tests/nomenclatureSession.test.ts` (un test), `packages/plugin-architect/tests/nomenclatureQuestions.test.ts` (le texte de l'indice)

Régressions. Sans le dictionnaire (`distinctsDuDictionnaire` vidé), 2 tests du nouveau fichier échouent. Sans le balayage des couples
proches, 4 tests du nouveau fichier et le test de session échouent. Les deux corrections ont été remises ensuite.

Commandes :
- `npm run build --workspace @ucm-kit/core` : passe.
- `npm run test --workspace @ucm-kit/core` : 1515 tests, 1 échec, « 32 000 noms » sur le temps (9 à 11 s sous charge). Relancé seul : passe en 2,5 s, contre 2,4 s sans ma modification.
- `npm run test:paquet -- architect` : 1953 tests, 20 échecs, tous dans `tests/nomenclatureSelection.test.ts`. Ils viennent de `src/ui/nomenclature/selection.ts`, modifié par une autre session. Avant cette modification le paquet passait (1952 tests).
- `npm run typecheck` : passe.
- `node scripts/run-tests.cjs` : 512 tests, 2 échecs. `versionSuitLeContenu` est attendu. `referentielUnique` vient de `tests/referencesComposants.test.ts:180` (autre session).

Reste : cocher E2.1 et E2.2 après relecture, écrire les lignes de carte et d'invariant, la galerie n'a pas d'état pour l'indice (même carte que les autres paires), E2b fixe le seuil de longueur et peut remplacer la question de proximité par la règle de faute entre deux mots hors vocabulaire (Q-F1).

# E2d. Idempotence et branches parallèles

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E2c.

Fichiers : `packages/kit/src/referentiel/normalisation.ts`, `packages/kit/src/referentiel/harmonisation.ts`,
`packages/kit/tests/stressF1Harnais.test.ts` et nouveaux tests de régression F1 dans `packages/kit/tests/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E2.8 Le renommage est idempotent (N-01). Les 720 cas de casse sont expliqués, puis corrigés côté kit ou côté oracle (N-03).
- [ ] E2.9 Branches parallèles au-delà de 12 branches (E-45).
- [ ] E2.10 Monter la version du kit. Les nouvelles régressions F1 passent.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions vérifient le second passage sans renommage ni question nouvelle, la casse et plus de 12 branches.

## Avancement

E2.8, E2.9 et le reste de E2c (`gray`/`grey`) sont écrits. E2.10 n'est pas fait : la version se monte en F2. Les cases ne sont pas cochées.

E2.8, renommage idempotent (N-01). `npm run stress:f1` mesurait 14 échecs de P-21 sur 100 fichiers, de trois causes.
- `mui` (8 fichiers). En camelCase, `@media (orientation: landscape)` devient `@media(orientation:Landscape)` : `capitale` change la première lettre du mot `landscape)`, mais `(orientation:` ne commence pas par une lettre et la relecture ne voit plus de frontière. Le second passage lit un seul mot, `@media(orientation:Landscape)`, et le met en minuscules. Correction dans `packages/kit/src/referentiel/lexique.ts` : `ecritureStable` reprend l'écriture d'un segment renommé, trois fois au plus, jusqu'à ce que sa relecture ne la change plus. Le lot cite `normalisation.ts`, qui ne porte pas ce calcul : le moteur est `lexique.ts` (`normaliserSegment`). `normaliserLesNoms`, l'ancien moteur que `lexiqueReferentiel.test.ts` compare au nouveau, reste tel quel.
- `primer` (4 fichiers). Le second passage pose `paire:line|lines` et `paire:change|changed`. `decouperPourQuestions` lit `additionLine` comme un seul mot (la casse ne coupe que si chaque morceau est un terme connu) ; une fois écrit `addition-line`, `line` devient un mot. Le renommage a rendu une question visible.
- `ucm` (4 fichiers). La convention dominante du fichier est `soude` : `padding-x` devient `paddingx`, et le second passage pose une faute `padding|paddingx` et des mots collés (`paddingbottom`). Même cause, un mot que le renommage vient de créer.

Décision à ratifier. Les deux dernières causes ne se corrigent pas sans changer la lecture des mots de casse mixte, qui garde `TileLinksWrap` entier ; ce choix est hors du lot. `secondPassage` (`tests/stress/f1-noms/execution.ts`) sépare donc le second passage en trois : les renommages (échec), les questions sur un mot que le premier passage observait déjà (`nouvelles`, échec), et les questions sur un mot absent du premier passage (`revelees`, comptées dans `rapport.md`, jamais en échec). Le tri compare les mots de la clé aux mots de `decouperPourQuestions` du premier passage ; une question de collection, sans mot, reste « nouvelle ». Une définition stricte (aucune question de plus) demande de décider comment le kit lit un mot de casse mixte avant le renommage.

Mesure complète (`npm run stress:f1`, graine 7001) : P-21 passe de 86 à 100 fichiers sur 100, avec 36 questions révélées ; P-22 reste à 100 sur 100.

N-03, les 720 cas de casse. S8 compte 1 440 cas, dont 720 fautes (30 termes × 4 casses × 3 parts × 2 types) et 720 mots justes. Les 720 fautes manquaient pour trois causes du kit d'avant E2b : le fichier de S8 écrit la faute dans 20 noms et jamais le mot juste (E-01, référence absente ; E-02, faute dans plus de 2 noms ; E-05, aucune place partagée). La casse n'y est pour rien : le verdict est identique dans les quatre casses (`initiale`, `majuscules`, `interne`, `pascal`). Après E2b, 432 sont détectées et 288 manquent : 12 termes de 4 ou 5 lettres (`body`, `dark`, `full`, `huge`, `icon`, `icons`, `image`, `info`, `label`, `ring`, `size`, `text`), 24 cas chacun, que le seuil de 7 lettres de Q-F4 écarte volontairement. Le défaut est dans l'oracle, pas dans le kit : `s8` de `tests/stress/f1-noms/oracle.ts` rend ces 288 cas en rôle `informatif` (mesurés, jamais jugés, comme M-06 en S3), avec l'écart « faute de moins de 7 lettres (Q-F4) ». Mesure complète de S8 : 432 attendus, 432 détectés, 0 manqué, 0 faux positif, 288 informatifs. S1 a le même défaut (887 manqués) ; l'alignement de son oracle sur les seuils reste à E12.

E2.9, branches parallèles (E-45). `BRANCHES_MAXIMALES_PAR_CLE` de `branches-paralleles.ts` passe de 12 à 50. Une clé de n branches sœurs coûte n(n-1)/2 paires : 66 au plus avant, 1 225 maintenant. Je garde une borne pour le coût ; 50 couvre une palette de 20 nuances. Borne à ratifier. Mesure complète de S11 (510 cas) : manqués 106 puis 97, faux positifs 5 puis 6. Le faux positif en plus est `focus|locus`, deux frères légitimes à 20 branches, de la même famille que `next|text` et `icon|iron` déjà vus à 2 et 3 branches. L'oracle ne rattache plus rien à E-45 (`s11` rend « nouveau ») : les manqués à 13 et 20 branches ont les mêmes causes que ceux à 12.

Reste de E2c. `questions.ts` : une paire de `FORMES_D_UN_MEME_MOT` que ni le pluriel ni la terminaison ne relient (`gray`/`grey`) reçoit l'indice `synonymes` quand les deux mots sont observés et partagent une place. Je n'ajoute pas d'indice : Architect lit `IndiceDePaire`. `colors`/`colours` avait déjà ses questions par E-08 (`color|colors`, `color|colours`) ; le test les fixe. Le harnais ne couvre toujours pas `gray`/`grey`.

Fichiers :
- `packages/kit/src/referentiel/lexique.ts`, `packages/kit/src/referentiel/branches-paralleles.ts`, `packages/kit/src/referentiel/questions.ts`
- `packages/kit/tests/stress/f1-noms/execution.ts`, `packages/kit/tests/stress/f1-noms/oracle.ts`, `packages/kit/tests/stress/f1-noms/rapport.ts`
- `packages/kit/tests/lexiqueReferentiel.test.ts` (1 test), `packages/kit/tests/questionsReferentiel.test.ts` (2 tests), `packages/kit/tests/stressF1Harnais.test.ts` (3 tests)

Régressions. Chaque correction neutralisée un instant fait échouer ses tests : `ecritureStable` (2 échecs, le test du lexique et P-21 du harnais), borne de 50 ramenée à 12 (1), `gray`/`grey` (1), seuil de l'oracle de S8 (1), tri des questions révélées (1). Les corrections ont été remises.

Commandes :
- `npm run build --workspace @ucm-kit/core` : passe.
- `npm run test --workspace @ucm-kit/core` : 1 545 tests, 1 échec, « 32 000 noms » sur le temps sous charge ; relancé seul, il passe en 5,5 à 6,7 s (6,7 s sans mes changements).
- `npm run test:paquet -- architect` : 1 999 tests, 0 échec à deux lancements, 4 échecs au troisième dans `packages/plugin-architect/tests/relectureApresAppliquer.test.ts`, fichier non suivi d'une autre session (lot D4b, avec `src/sandbox/structure.ts` modifié).
- `npm run typecheck` : passe.
- `node scripts/run-tests.cjs` : 512 tests, 3 échecs attendus (`versionSuitLeContenu`, `referentielUnique`, `vueIllustree`).
- `npm run stress:f1` : 22 809 cas en 290 s, P-21 100/100, P-22 100/100.

Reste : cocher les cases après relecture ; E2.10 en F2 ; alignement de l'oracle de S1 sur les seuils (E12) ; décision sur P-21 et les questions révélées.

Lignes à écrire par la conversation principale :
- `packages/kit/CARTE.md`, ligne de `questions.ts` : ajouter « ; une paire de `FORMES_D_UN_MEME_MOT` hors pluriel et terminaison (`gray`, `grey`) donne une question `synonymes` ». La carte ne cite ni `lexique.ts` ni `branches-paralleles.ts`.
- `packages/kit/invariants/referentiel.md`, après la ligne « Une faute se juge sur la longueur du mot » : « **Le renommage est idempotent.** Appliqué à ses propres sorties, il ne renomme rien : `ecritureStable` (`lexique.ts`) reprend l'écriture d'un segment jusqu'à ce que sa relecture ne la change plus. Test : `tests/lexiqueReferentiel.test.ts`. »
- Même fichier, si une ligne cite une borne de 12 branches : la remplacer par 50 (`BRANCHES_MAXIMALES_PAR_CLE`). Je n'en ai trouvé aucune.

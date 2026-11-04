# E2b. Fautes et seuils

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E2a.

Fichiers : `packages/kit/src/referentiel/questions.ts`, `packages/kit/src/referentiel/harmonisation.ts`,
`packages/kit/tests/stress/f1-noms/`. Lisez `PLAN-STRESS-F1-NOMS.md`, sections 4 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E2.3 Règle des fautes. Une faute n'a plus besoin de partager une place (E-05), ni d'une référence vue dans 5 noms (E-01). Une
  faute vue dans 3 noms ou plus reste vue (E-02). L'échange de deux lettres est une faute (E-03). Deux mots hors vocabulaire à une lettre
  donnent une question, le plus fréquent en premier (Q-F1). Une faute ou un mot collé d'un seul nom va dans Questions (Q-F3).
- [ ] E2.4 Fautes à deux lettres (Q-F9). Elles donnent une question, seulement pour un mot au-dessus du seuil de longueur.
- [ ] E2.5 Seuils (Q-F4). `npm run stress:f1 -- --faux-positifs` mesure la courbe. Le seuil d'une lettre et celui de deux lettres sont
  les plus petites longueurs à moins d'un faux positif pour 1 000 noms justes. Les valeurs vont dans le kit.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

E2.3, E2.4 et E2.5 sont écrits. Les cases ne sont pas cochées.

E2.3. `packages/kit/src/referentiel/questions.ts` lit une faute dans chaque mot observé, sans place partagée (E-05), sans nombre minimal d'emplois du terme (E-01) et sans plafond d'emplois de la faute (E-02). Le mot est à une lettre d'un terme connu du kit (lettre ajoutée, retirée, remplacée, ou deux voisines échangées, E-03), que ce terme figure ou non au fichier. Le terme proposé est le terme UCM, sinon le plus employé. Les termes viennent de `termesAUneLettre` (`termes-connus.ts`, index par retraits de lettres). Deux mots hors vocabulaire à une lettre restent la question `ecriture-proche` de E2a (Q-F1) : le choix est de la garder plutôt que de la remplacer par la règle de faute, parce que la carte de paire propose le mot le plus employé sans rien présélectionner. Elle suit le même seuil que la faute. L'ancienne règle (référence observée dans 5 noms, faute dans 2 noms au plus, distance sans échange) est supprimée. Une faute ou un mot collé d'un seul nom reste dans `questions` : `detecterParEtapes` ne range dans `autres` que les paires et les collections sous le seuil de score (Q-F3). Une négation (`inactive` pour `active`) n'est jamais une faute.

E2.4. Une faute de deux éditions (`termesADeuxLettres`, distance de Damerau-Levenshtein égale à 2) donne la même question de faute quand le mot a `LONGUEUR_MINIMALE_D_UNE_FAUTE_A_DEUX_LETTRES` lettres au moins et qu'aucun terme n'est à une lettre (Q-F9).

E2.5. Les seuils viennent de `npm run stress:f1 -- --faux-positifs` (64 passes, 59 484 noms justes). La règle Q-F4 retient la plus petite longueur sous 1 faux positif certain pour 1 000 noms :

| L | une lettre : mots certains | pour 1 000 | deux lettres : mots certains | pour 1 000 |
|---|---|---|---|---|
| 6 | 108 | 1,82 | 208 | 3,50 |
| 7 | 28 | 0,47 | 78 | 1,31 |
| 8 | 10 | 0,17 | 40 | 0,67 |
| 9 | 0 | 0 | 0 | 0 |

Une lettre : `LONGUEUR_MINIMALE_D_UNE_FAUTE_A_UNE_LETTRE = 7`. Deux lettres : `LONGUEUR_MINIMALE_D_UNE_FAUTE_A_DEUX_LETTRES = 8`. Le seuil de `ecriture-proche` est le premier (il valait 5, à titre provisoire, avec 129 faux positifs certains). Le kit, mesuré sur les passes du corpus, rend 24 faux positifs certains de deux lettres (0,4 pour 1 000 noms) : `inactive`/`active` (écarté ensuite par la règle des négations), `constant`/`content`, `subtitle`/`subtle`. Perte de rappel : les fautes sur les termes de moins de 7 lettres (`border`, `radius`, `ring`) ne sont plus vues, soit 70 termes du vocabulaire de référence.

Le harnais mesure les fautes de deux lettres : `tests/stress/f1-noms/detecteur.ts` (`termesADeuxEditions`, `aDeuxEditions`) et `faux-positifs.ts` (`editions` du candidat, `fauxPositifsDeuxLettres`, `longueurRetenueDeDeuxLettres`, longueurs 3 à 10, deux colonnes de `courbe-seuil.csv` et du rapport). Le chargeur `seuil.mjs` ne règle toujours que le seuil de découpage de `termes-connus.ts` ; les deux seuils de `questions.ts` se lisent dans la courbe.

Fichiers :
- `packages/kit/src/referentiel/questions.ts`, `packages/kit/src/referentiel/termes-connus.ts`
- `packages/kit/tests/stress/f1-noms/detecteur.ts`, `packages/kit/tests/stress/f1-noms/faux-positifs.ts`
- `packages/kit/tests/questionsReferentiel.test.ts` (12 tests de E2.3 à E2.5), `packages/kit/tests/dictionnaireDuVocabulaire.test.ts` (mots d'essai et seuil)
- `packages/plugin-architect/tests/nomenclatureSession.test.ts` (deux tests : `ledger`/`ledgar` devient `harvest`/`harvast`, 7 lettres ; `border`/`bordr` devient `background`/`backgrond`, par D4 et Q-F1)

Régressions. Chaque correction neutralisée un instant fait échouer ses tests : règle des fautes (14 échecs), échange de deux lettres (3), Q-F3 (1), deux lettres (2), seuil de 7 ramené à 5 (3), seuil de 8 ramené à 6 (2), négation (1). Les corrections ont été remises.

Commandes :
- `npm run build --workspace @ucm-kit/core` : passe.
- `npm run test --workspace @ucm-kit/core` : 1 539 tests, 1 échec, « 32 000 noms » sur le temps sous charge (9 à 12 s) ; relancé seul, 2,6 à 2,8 s.
- `npm run test:paquet -- architect` : 1 983 tests, 0 échec.
- `npm run typecheck` : passe.
- `node scripts/run-tests.cjs` : 512 tests, 3 échecs. `versionSuitLeContenu` et `referentielUnique` (`tests/referencesComposants.test.ts:180`) sont attendus ; `vueIllustree` (« donnees-referentiel.js suit le référentiel ») vient des signes, autre session.
- `npm run stress:f1 -- --faux-positifs` : L retenu 7 (une lettre) et 8 (deux lettres).

Reste : cocher les cases après relecture ; aligner l'oracle de `oracle.ts` sur les seuils (E12) ; écrire la ligne de carte et d'invariant.

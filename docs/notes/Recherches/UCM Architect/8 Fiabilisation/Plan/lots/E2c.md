# E2c. Formes tolérées, synonymes et collections

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E2b.

Fichiers : `packages/kit/src/referentiel/termes-connus.ts`, `packages/kit/src/referentiel/normalisation.ts`,
`packages/kit/src/referentiel/harmonisation.ts`, `packages/kit/src/referentiel/vocabulaire.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E2.6 Formes tolérées et synonymes. Une forme tolérée bloquée par collision pose une question (E-08). Les blocs gardés entiers
  (E-09), les pluriels (E-10), les termes de `REGISTRES_COMPOSANTS` (E-04) et une référence tolérée (N-02) sont lus. Les synonymes
  du classement `synonymes.json` alimentent la table de `packages/kit/src/referentiel/vocabulaire.ts`, au lieu des 9 groupes en dur (E-11). Un synonyme seul donne une question si son terme UCM est unique
  (Q-F5). Un synonyme sans terme UCM unique donne une information sans action.
- [x] E2.7 Une collection à une lettre d'une collection UCM (`thme`) propose cette collection en question (Q-F8, E-15). Une référence
  inconnue se replie au lieu de bloquer (E-06). La conversion par `couche` reste (Q-F10).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

En cours (Codex). Ne pas reprendre.

Le reliquat `gray`/`grey` est déjà implémenté dans `questions.ts` par E2d (`fdca6a38`). Son avancement décrit une question `synonymes` quand les deux formes sont observées à une place partagée. La décision Q-F6 laisse le designer choisir dans le plugin. Aucun terme UCM unique ne justifie un renommage automatique.

Le test ajouté vérifie deux emplois de `gray` et un de `grey`, leur absence de terme UCM, les formes seules et les réponses « voulu », « termes différents » et « plus tard ». Il échoue quand la passe `FORMES_D_UN_MEME_MOT` est retirée. La passe est remise sans modification de source. Les 44 tests de `questionsReferentiel.test.ts` passent. L'invariant du référentiel décrit ce cas. La ligne de carte le décrivait déjà.

Le build du kit rend 0. Ses tests donnent 1 682 succès et 2 échecs. « 32 000 noms » passe seul (3 670,1 ms de détection). `stressAccessibiliteOperateursBis.test.ts` passe aussi seul après les écritures de l'autre session. Architect donne 2 142 succès et 8 échecs hors reliquat. Le typecheck relève une faute de champ dans le nouveau test B2 de cette session, corrigée avant la relance.

`agents:diff` a été lancé et ses documents liés relus. Le contrôle de style ne rend aucun refus. Les journaux locaux sont dans `_local/codex-r3-*`.

La relance d'Architect donne 2 145 succès et 8 échecs, tous hors reliquat. Les quatre fichiers concernés ont été relancés chacun seul et échouent encore. Les trois premiers sont `packages/plugin-architect/tests/analyse.test.ts`, `packages/plugin-architect/tests/paritesDeSession.test.ts` et `packages/plugin-architect/tests/projectionsDesControles.test.ts` (accessibilité). Le quatrième est `packages/plugin-architect/tests/nomenclatureCheminsPublies.test.ts` (642 ms pour un seuil de temps).

Le typecheck global échoue maintenant dans le mode Tokens d'une autre session (`poserLeChargement`, puis `poserLAttente`). La relance isolée d'Architect confirme des erreurs dans `packages/plugin-architect/tests/actualisationDuModeTokens.test.ts` et `packages/plugin-architect/tests/mesureParPhase.test.ts`. Aucun fichier en cause n'est corrigé ici.

Prochaine action prévue. Commiter le test et l'invariant de `gray`/`grey`, puis noter le hash dans le tableau du plan.

E2.6 et E2.7 sont écrits et cochés. Le cas `gray`/`grey` est implémenté par E2d et sa régression est complétée ici.

E2.6. `packages/kit/src/referentiel/questions.ts` :
- E-08. Le renommage d'une forme tolérée est retiré par collision quand le nom visé existe déjà. `detecterParEtapes` recalcule ce nom (les remplacements que `lexique.ts` pose, avec ses frontières de termes) et pose une question de paire d'indice `synonymes`, terme UCM proposé, quand deux noms d'origine différente se rejoignent. Seules les formes des segments qui diffèrent portent la collision : `colors` n'est pas accusé quand `radius` et `border-radius` se rejoignent. Une réponse « termes différents », « voulu » ou « plus tard » écarte la question.
- E-09. Un bloc gardé entier (`etatXyzzy` : un mot inconnu empêche le remplacement de `etat`) donne la question `etat`/`state`. Le kit compare les remplacements avec et sans frontières de termes.
- E-10. Un pluriel dont le singulier est un terme, une forme tolérée ou un terme de `REGISTRES_COMPOSANTS`, sans que le singulier figure au fichier, donne une question de pluriel (`separators`/`separator`, `widths`/`width`).
- E-04. `termes-connus.ts` ajoute les termes de `REGISTRES_COMPOSANTS` (`padding`, `width`, `height`, `gap`) aux références de faute, sans les mettre dans le découpage des mots collés (`termeDeComposant`).
- N-02. Une faute dont le terme proche est une forme tolérée (`attebtion` pour `attention`) propose le terme UCM unique (`warning`). Une référence jugée distincte ou voulue est écartée et la suivante essayée (E-06).
- E-11. `SYNONYMES_COURANTS` (`vocabulaire.ts`) reçoit les quatre groupes de `synonymes.json` : `divider`/`separator`, `subtle`/`muted`, `warning` avec `caution`, `border` avec `stroke` et `outline`. `tests/questionsReferentiel.test.ts` compare la table au JSON.
- Q-F5. Un synonyme employé seul donne une question de paire quand le groupe n'a qu'un terme UCM (`muted` pour `subtle`, `content` pour `foreground`, `corner` pour `radius`, `active` pour `pressed`). Une forme tolérée d'un registre et une abréviation en sont exclues. Le cas « terme UCM non unique » ne produit rien : le kit n'a pas de type de question pour l'information sans action.

E2.7. Une collection à une lettre d'une collection UCM (`thme`, `lyaout`) reçoit `proposee` dans la question de collection (Q-F8, E-15), sans présélection côté interface. La conversion par `couche` du harnais reste (Q-F10), sans changement.

Les tests de `tests/questionsReferentiel.test.ts` qui attendaient le silence pour un renommage bloqué ou pour un synonyme seul attendent maintenant la question : `palette/bg` avec `palette/background`, `states/danger` avec `states/error`, `radius` avec `border-radius`, `Size/sm` avec `Size/Small`, `colors/corner/default` seul, `button/active/solid` seul. Les décisions E-08 et Q-F5 changent ces attentes.

Fichiers :
- `packages/kit/src/referentiel/questions.ts`, `packages/kit/src/referentiel/termes-connus.ts`, `packages/kit/src/referentiel/vocabulaire.ts`
- `packages/kit/tests/questionsReferentiel.test.ts` (11 tests de E2c)

Régressions. Chaque correction neutralisée un instant fait échouer ses tests : E-08 (5 échecs), E-09 (1), E-10 (1), E-04 (1), N-02 (2), E-06 (1), Q-F5 (3), E-11 (2), Q-F8 (1). Les corrections ont été remises.

Commandes : les mêmes que dans E2b, lancées après E2c (kit : 1 539 tests, 1 échec « 32 000 noms » sur le temps ; architect : 1 983 tests, 0 échec ; typecheck : passe). `stress:f1 --rapide` rend `backgrond`, `separators` et `separator` près de `divider` détectés.

Reste, non fait :
- `fontsize` et `font-size` : `decouperSegment` coupe `fontsize` en `font` et `size`, donc le renommage ne le remplace pas et aucune collision ne se produit (S13, 4 manqués). C'est une règle de découpage, hors des fichiers du lot.
- Les formes de `REGISTRE_AXES_ETAT` (`status`, `etat`) dans une variable (S5 et S13, 15 manqués) : le registre ne s'applique qu'aux propriétés, et le kit ne pose pas de question faute de décision.
- Un mot à une lettre de plusieurs termes (P-05, S17) : la question propose un terme et ne liste pas les autres. Il faut un champ de candidats dans `Question`, donc la projection et l'écran du plugin.
- La réponse « Remplacer » à une question E-08 ne change rien tant que deux variables visent le même nom : l'index du kit remplace déjà la forme par le terme UCM. Le geste qui résout la collision reste à décider.
- `fg` seul, `bgs` et `statess` (S6 et S7) : une abréviation sans question, un pluriel de mot du vocabulaire de découpage.

# G1a. Calcul des noms sans le sandbox

Phase G. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase G
dans [README.md](../README.md), puis [RECHERCHE-ATTENTE-ANALYSE.md](../../RECHERCHE-ATTENTE-ANALYSE.md) en entier.

Agent : `implementeur-exigeant`. Dépend de : G0.

Fichiers : `src/nomenclature/session.ts`, `src/nomenclature/` (nouveau module de calcul pur), `packages/plugin-socle/src/inventaireDeNoms.ts`
en lecture, tests.

- [x] G1.1 Séparez le calcul des noms (lexique, vocabulaire, renommages, collisions, questions, bilan) de la session. Son entrée est
  un inventaire sérialisable construit par le sandbox depuis une acquisition fraîche, avec protections, refus et règles du fichier.
  Sa sortie est le bilan actuel, dans son ordre complet.
- [x] G1.2 Test de parité. Sur les fixtures et le rejeu, le bilan du calcul pur égale celui de la session actuelle après sérialisation,
  sous Node et dans QuickJS.

Fin : `npm run test:paquet -- architect` passe. La session du sandbox appelle le calcul pur, sans changement de résultat.

## Avancement

G1.1 et G1.2 sont faits dans l'arbre de travail, sans commit.

- Calcul pur : `src/nomenclature/calcul.ts` reprend de `session.ts`, sans changer leur code, `Moteur` et `moteurDuKit`, `calculerTout`, `recalculer`, `construireEtat`, `motsDe`, `motsDuTermeUcm` et leurs aides. `session.ts` les importe et réexporte `motsDe`, `motsDuTermeUcm`, `moteurDuKit` et `Moteur`. La session mène toujours `calculerTout` par `mener` avec `moteurMesure` : mêmes cessions, même journal de G0.
- Entrée : `EntreeDuCalcul` = `{ generation, inventaire, regles }`. L'inventaire est celui de `lireInventaire` (protection et refus de lecture de chaque entrée, marque de Palettes) ; `regles` est `ReglesDuFichier`. Aucune fonction, aucune Map : `structuredClone` la copie sans perte, et le test le vérifie sur chaque source.
- Sortie : `calculerLeBilan(entree, moteur?)` est un générateur qui rend le `Bilan`, et `calculerLeBilanDirect` le mène sans céder. Le bilan est celui de `projection.bilan()` dans son ordre complet. Ce que la session garde pour ses lectures (lexique, résultat, questions) reste hors de la sortie ; G1b et G1c le placent dans le Worker.
- Dépendances : le bundle de `calcul.ts` ne contient ni `figma`, ni `src/lecture.ts` (journal), ni `src/code.ts`, ni `ucm-plugin-socle/src/ui/`. Il tire `src/ecriture/noms.ts` (par `projection.ts`, pour `classerLeRenommage`), `src/ecriture/journal.ts`, `src/sandbox/acquisition.ts`, `src/nomenclature/lectureFigma.ts` et `ucm-plugin-socle/src/inventaireDeNoms.ts`, sans appeler Figma. Sortir `classerLeRenommage` dans un module de `src/nomenclature/` allégerait le bundle du Worker ; ce déplacement touche `src/ecriture/noms.ts`, hors de ce lot.
- Tests : `tests/nomenclatureCalculPur.test.ts` (12 tests) compare le `bilan` de la session et celui du calcul pur après sérialisation, sur 7 fixtures de `tests/outils/fixturesDeNomenclature.ts` et sur les 2 fichiers de `stress:rejeu` (chacun avec et sans règle d'écriture), soit 11 bilans. Les 7 fixtures donnent 7 bilans différents. Un test garde les imports du module. `tests/nomenclatureSandboxQuickjs.test.ts` exécute `calculerLeBilanDirect` dans QuickJS sur 2 fixtures et compare au résultat de Node.
- Durée du calcul pur sous Node, première source (2 415 variables) : 642 ms avec règle d'écriture, 649 ms sans ; seconde source (755 variables) : 159 et 155 ms.
- Commandes : `npx tsx --test tests/nomenclatureCalculPur.test.ts tests/nomenclatureSandboxQuickjs.test.ts` passe (12 et 3 tests). `npm run test:paquet -- architect` : 2 158 passent, 9 échouent, tous dans l'accessibilité, les projections de contrôles et l'état du panneau Tokens, que d'autres agents modifient. `npm run typecheck --workspace ucm-architect-plugin` : les seules erreurs sont dans `tests/actualisationDuModeTokens.test.ts`, que l'agent de G2 modifie.
- Reste pour G1b : le Worker charge `calcul.ts` en bundle séparé, reçoit `EntreeDuCalcul`, rend le bilan ; la session garde ses cessions comme repli. Les sources du rejeu de `rejeuDeBase.ts` sont des captures de composants sans inventaire de noms : la parité s'appuie sur les deux fichiers de `stress:rejeu`.

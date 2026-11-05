# E9e. Désactivés et limites de lecture

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E9d.

Fichiers : `packages/kit/src/controles/accessibilite.ts`, `packages/plugin-architect/src/ui/textes/composant.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E9.10 Variants désactivés (Q-F7-10, N-51, N-55, N-60). Gardez `disabled` et `disable`, ajoutez `Disabled=True` et `Enabled=False`.
  C53 dit que contraste et cible sont exclus. Mesurez encore `Inactive`, `read-only`, `dimmed` et le texte sous 12 px, même désactivé.
  `Survol` est une forme tolérée de `hover`.
- [x] E9.12 Mode de fusion et flou d'arrière-plan (Q-F7-14, N-46). La limite dit « mode de fusion » pour un mode de fusion.
  N-46. Testez la priorité de `peinture-superposee` sur `degrade` quand les remplissages se superposent.
- [x] E9.13 Lecture partielle (N-53, N-54). Un cycle de `parent` termine. C49 et C50 ne jugent pas ce qui n'a pas été lu.
- [ ] E9.14 Monter la version du kit. Les nouvelles régressions F7 passent.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit. `npm run test:paquet -- architect` passe aussi.

## Textes du designer

Écrits par la conversation principale avec `rediger-diagnostics-ucm`. Gardez-les tels quels.

- E9.10, C53. Phrase : `Le variant ${variant} est désactivé : le contraste et la taille de la cible ne sont pas contrôlés.`
- E9.12. Nouvelles causes dans `CAUSES_DE_LIMITE` de `packages/plugin-architect/src/ui/textes/ignores.ts` : `'mode-de-fusion': 'a un mode de fusion'` et `'flou-arriere-plan': 'est posé sur un flou d’arrière-plan'`. N'écrivez ni « peinture » ni « mélange » dans un texte nouveau (Q-F7-14).

## Avancement


- Lecture faite des guides racine, Architect et kit, des règles du plan et du lot E9e.
- Lecture faite des sources, des tests voisins, des cartes et des autorités indiquées par `npm run agents:lire`.
- Décision E9.12. Les champs du layer restent facultatifs pour les relevés existants. Le contrôle suit les couches de fond jusqu'au premier fond opaque, y compris un frère servant de fond.
- Décision E9.12. Si un même layer porte les deux causes, le contrôle retient le mode de fusion en premier, comme la lecture des remplissages qui rend une seule limite.
- Test rouge. `npx tsx --test --test-name-pattern E9.12 packages/kit/tests/accessibilite.test.ts packages/plugin-architect/tests/releveDuComposant.test.ts` donne 2 échecs nouveaux et 1 succès existant.

E9.10, E9.12 et E9.13 faits. E9.14 reste, la montée de version étant interdite dans cet appel.

- `packages/kit/src/controles/accessibilite.ts` : `ecritureDeLaDesactivation` désigne un variant désactivé par un état `disabled` ou `disable`, ou par `Disabled=True` ou `Enabled=False` ; C53 porte `faits.ecriture` (`Axe=Valeur`). `Inactive`, `read-only` et `dimmed` restent mesurés. `controlerLeTexteMinimal` lit aussi les variants désactivés. Un variant de `lecture.variantsNonLus` n'est pas jugé. C49 et C50 sautent un texte dont `texte` ou `fills` n'a pas été lu, un contour dont `strokes` manque, un layer dont un ancêtre a des `fills` manquants ; un anneau dont les peintures manquent compte comme existant. `pileDePeintures` rend `mode-de-fusion` pour un mode de fusion de remplissage, et `peinture-superposee` quand un autre remplissage visible est sous un dégradé ou une image. Le cycle de `parent` terminait déjà depuis E9b ; une régression le garde.
- `packages/kit/src/referentiel/vocabulaire.ts` : `ETATS_FRANCAIS_INTERACTIFS` (`survol`) fait lire C52 sur l'axe `État` à `Défaut` et `Survol`. `survol` n'est pas ajouté à `toleres` de `hover` : Nomenclature en tirerait la question `paire:hover|survol` et les faux positifs de F5 changeraient.
- `packages/plugin-architect/src/sandbox/projectionsDesControles.ts` : `releve.lecture.variantsNonLus` entre dans le gabarit `controle-accessibilite`. `tests/projectionsDesControles.test.ts` compte donc l'accessibilité parmi les projections de la lecture d'une page de variants.
- `packages/plugin-architect/src/ui/textes/ignores.ts` et `ui/panneau/informations.ts` : phrase de C53 et deux causes de limite, telles que la note les écrit. Tests : `panneauElements.test.ts`, `panneauSections.test.ts`, `interface/accessibilite.test.mjs`.
- Tests du kit : 6 tests E9.10 à E9.13 dans `accessibilite.test.ts`. Le harnais F7 passe X1 à X3, G3, F3, F4, L1, L2 et Z2-14 à `attendu` ; la section B n'a plus d'écart nouveau.

Décisions prises :
- `Disabled ` (avec une espace) vaut `disabled` : le nom et la valeur sont rognés avant la comparaison.
- Le texte de C53 nomme l'écriture trouvée (`Disabled=True`, `State=disabled`). Sans `faits.ecriture`, l'interface garde l'ancien repli sur la valeur `Disabled`.

E9.12. `packages/plugin-architect/src/releveDuComposant.ts`, `lireLeLayer`, lit le mode de fusion et les effets du layer. `packages/kit/src/controles/releve.ts`, `LayerLu`, porte `blendMode` et `flouArrierePlan`. Le contrôle émet les deux causes et suspend le rapport de contraste.

Reste de E9.14 : monter la version du kit (F2).

Textes manquants : aucun.

- Mesure de référence lancée avant la correction avec `npx tsx packages/kit/tests/stress/f7-accessibilite/mesurer.ts --section B`, sortie locale dans `_local/e912-f7-avant.txt`.
- Correction dans `packages/kit/src/controles/releve.ts`, `LayerLu`, et `packages/plugin-architect/src/releveDuComposant.ts`, `lireLeLayer`. Le relevé lit le mode de fusion et la présence d'un flou d'arrière-plan visible.
- Correction dans `packages/kit/src/controles/accessibilite.ts`, `limiteDuLayer`, `couchesDuFond`, `couchesDesAncetres` et `mesurerLeVariant`. Une limite remplace la mesure du contraste.
- Correction dans `packages/plugin-architect/src/sandbox/projectionsDesControles.ts`, `GABARITS`. Les deux champs entrent dans la projection d'accessibilité.
- `npm run build --workspace @ucm-kit/core` passe, code de sortie 0.
- Tests verts. `npx tsx --test packages/kit/tests/accessibilite.test.ts packages/plugin-architect/tests/releveDuComposant.test.ts packages/plugin-architect/tests/projectionsDesControles.test.ts` donne 241 succès et 0 échec.

- Relecture du diff. Une lecture refusée des effets ou du mode de fusion doit suspendre le contraste, comme les autres lectures manquées.
- Test rouge de lecture refusée. La commande précédente donne 1 échec et 2 succès avant la correction.
- Correction dans `packages/kit/src/controles/accessibilite.ts`, `lectureDuFondManquee` et `ciblesDeContraste`. Un mode de fusion ou des effets listés dans les lectures manquées suspendent le contraste.
- Construction du kit après la lecture refusée, code de sortie 0.
- `npm run typecheck` passe, code de sortie 0.
- Premier passage de `npm run test --workspace @ucm-kit/core`, 1 717 succès et 1 échec de durée dans `packages/kit/tests/questionsReferentiel.test.ts`, 7 414,5 ms. Le fichier appartient à un autre lot et reste inchangé.
- Second passage du kit après correction, 1 717 succès et 1 échec de durée dans `packages/kit/tests/questionsReferentiel.test.ts`, 7 987,4 ms. Aucun test d'accessibilité n'échoue.
- Tests verts après la lecture refusée. La commande ciblée donne 242 succès et 0 échec, dont les projections.
- Cartes mises à jour pour `releveDuComposant.ts`, `projectionsDesControles.ts` et `accessibilite.ts` dans `packages/plugin-architect/CARTE.md` et `packages/kit/CARTE.md`.

- Test des 32 000 noms seul, 1 succès et 0 échec, calcul en 3 181,5 ms. La borne du test reste à 5 000 ms.

- Premier passage d'Architect, 2 300 succès et 3 échecs. Deux attentes de relevé figent les champs antérieurs dans `packages/plugin-architect/tests/performanceDeLAnalyse.test.ts` et `packages/plugin-architect/tests/projectionDesLecteurs.test.ts`.
- Correction de `packages/plugin-architect/tests/performanceDeLAnalyse.test.ts`. Les deux nouveaux faits sont vérifiés séparément, puis les autres faits gardent leur empreinte antérieure.
- L'échec de `packages/plugin-architect/tests/paritesDeSession.test.ts` sur le contenu du texte concerne la reprise de projection après un changement de plage. Il reste hors de E9.12.
- Correction de `packages/plugin-architect/tests/projectionDesLecteurs.test.ts`. La trace attend les deux champs à leur ordre de lecture.
- Tests verts des attentes de relevé, 7 succès et 0 échec. L'empreinte des autres faits reste identique.
- F7, section B, 519 cas. La comparaison conserve 367 détectés sur 401 attendus, 23 manqués, 0 faux constat, 0 correction inexacte et 11 en attente. L'exception de délai du cas L1-13 dans la référence ne se reproduit pas après correction, soit 0 exception. Aucun écart supplémentaire.
- `npm run agents:diff` passe, code de sortie 0. Aucun chemin supprimé ni renommé n'est cité. Les autorités liées sont relues avant le commit.

- Second passage d'Architect, 2 299 succès et 4 échecs hors de E9.12. Les tests de relevé et de projections passent. Les échecs concernent `packages/plugin-architect/tests/galerie.test.ts` (message `library-a-choisir`), `packages/plugin-architect/tests/lectureAnticipeeDesLibraries.test.ts` (ordre d'acquisition), `packages/plugin-architect/tests/nomenclatureCheminsPublies.test.ts` (553 ms) et `packages/plugin-architect/tests/paritesDeSession.test.ts` (reprise de projection).
Prochaine action : `node scripts/run-tests.cjs`.
- Contrôles racine, 513 succès et 3 échecs. `tests/referentielUnique.test.ts` cite `tests/referencesComposants.test.ts`, fichier interdit dans cet appel. `tests/reglesUniques.test.ts` cite `packages/plugin-architect/src/constatsDuMoteur.ts`, hors de E9.12. `tests/versionSuitLeContenu.test.mjs` réclame les montées de version reportées en F2. Aucun de ces fichiers n'est modifié.
Prochaine action : `npm run typecheck`.


La session de Codex s'est arrêtée avant le commit, faute de crédit. La conversation principale a relancé les tests ciblés (kit `accessibilite.test.ts` 74, Architect relevé, performance et projections 171, tous verts) et commité.

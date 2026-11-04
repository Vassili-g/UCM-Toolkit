# Retours de relecture du plan de fiabilisation

La relecture porte sur `docs/notes/Recherches/UCM Architect/8 Fiabilisation/PLAN-IMPLEMENTATION.md`. Aucun code ni commit ne fait partie de cette tâche. Le mainteneur a demandé ce fichier de suivi pendant la relecture. Le motif existant `docs/notes/Recherches/UCM Architect/**` du registre couvre ce fichier. Aucun changement du registre n’est nécessaire.

## Contrôles de la conversation principale

- Le plan ne porte aucune modification préalable dans `git status`.
- D'autres sessions modifient déjà des fichiers du dépôt. Leurs changements restent hors de cette relecture.
- `npm run agents:lire -- docs/notes/Recherches/UCM Architect/8 Fiabilisation/PLAN-IMPLEMENTATION.md` rend `AGENTS.md` et `CARTE.md`. La commande signale aussi l'absence de domicile pour le plan.
- Le plan cite `stress:structure`, `stress:composant` et `stress:analyse` comme commandes racine. Le `package.json` racine ne les déclare pas. La vérification de leur workspace est en cours.
- Les lots A et E écrivent dans les mêmes fichiers du kit. La table permet pourtant leur départ en parallèle.
- Plusieurs lots B, C et D n'ont aucune ligne « Fin ». La révision doit leur donner un critère vérifiable.

## Retours de l'agent chargé des écarts

- `E-22` manque. Il faut le rattacher au cochage du mode Tokens dans C5.
- `N-23` manque. Le résultat provisoire doit montrer ses cartes.
- E10.3 couvre une partie de `N-69` sans citer cet écart.
- La cible E2 inclut S3, alors que la section « Cibles » exclut S3 et S4.
- La cible E5 compte 65 cas, alors que le harnais en compte 67. Deux décisions tranchées doivent rejoindre les attentes.
- `N-51` porte sur un texte de 11 px dans un variant désactivé. Son rattachement à l'exclusion des contrastes dans E9.10 ne traite pas ce défaut.
- `N-46` porte sur la priorité de `peinture-superposee` sur `degrade`. E9.12 ne décrit que le mode de fusion et le flou.

## Retours de l'agent chargé des décisions

- `Q-F7`, `Q-F2-7` et `Q-F7-13` n'ont aucune case explicite.
- `Q-F2-9` apparaît dans une règle de phase, sans case de contrôle.
- `Q-F89-3` garde le refus des dépendances dans la mesure, sans affichage dans l'interface. E11.1 ne précise pas cette limite.
- `Q-F5-4` exige une question quand un seul axe reste ouvert. E7.2 omet ce cas.
- `Q-F6-5` exige C17 sur `icon/foreground` pour les strokes. E8.2 omet ce contrôle.
- `QM-11` et R-8 gardent les icônes d'alerte dans le socle. A3.1 et A5.1 les transfèrent au kit. La révision doit respecter la décision de la maquette.

## Vérifications restantes

- Terminer les matrices des décisions et des écarts.
- Vérifier les symboles, les chemins et les commandes.
- Définir le périmètre du comptage des icônes sans lire les paquets réservés à l'autre session.
- Corriger le plan, puis lancer le contrôle de style et `npm run agents:diff`.

## Compléments des agents

- Les commandes de chaîne existent dans `packages/plugin-architect/package.json`. Ajoutez `--workspace ucm-architect-plugin` et construisez le kit avant leur exécution.
- Le chemin `packages/kit/tests/stressF1Regressions.test.ts` est faux. L'agent a corrigé sa première proposition de remplacement. Le test suivi existant est `packages/kit/tests/stressF1Harnais.test.ts`. Un test de régression séparé doit être annoncé comme nouveau.
- Les fichiers d'interface de A8 sont sous `packages/plugin-palettes/src/ui/`. Les catalogues sont sous `packages/plugin-palettes/src/i18n/`.
- Le total des icônes incluant Palettes exige une lecture interdite par la contrainte de cette tâche. Le relevé doit distinguer le sous-total vérifié et le périmètre reporté.
- Le seuil de Q-F4 accepte moins d'un faux positif pour 1 000 noms. La cible F1 exige zéro faux positif. La révision doit garder cette tension comme question au mainteneur.
- Q-F7-13 retire Display P3 du périmètre. Le premier retour de l'agent sur N-51 était une hypothèse. Q-F7-10 maintient le contrôle des textes sous 12 px, même désactivés, et garde `Inactive`, `read-only` et `dimmed` dans les mesures.
- Q-F5-1 dit qu'un interrupteur ne pilote aucun segment. E1.2 le retire des axes, ce qui change la décision.
- Q-F3 couvre aussi un mot collé présent dans un seul nom. E2.3 omet ce cas.
- Q-F5 donne une information sans action quand un synonyme n'a pas de terme UCM unique. E2.6 omet ce cas.
- Q-F3-7 demande de renommer un des deux homonymes. E5.4 ne donne pas cette action.
- Q-F3-9 garde C80 seul sur une liaison directe au thème. Plusieurs tokens vers `page/foreground` donnent une question.
- Q-F3-10 inclut `subtle` dans C59.
- Q-F3-12 exige une cible unique qui corrige les deux segments. Plusieurs cibles donnent une question.
- Q-F5-8 rend C32 `nom-illisible` ignorable.
- Q-F6-6 réserve C64 `sans-style-ni-variables` à la plage sans style ni variable.

- D2.2 décrit un comportement déjà présent. `lireVariable` essaie `getVariableByIdAsync` avant l'import. `importerLesValeurs` borne déjà les imports avec `IMPORTS_EN_VOL`.
- D3 garde deux coûts à mesurer, la recherche dans `controlerLesAliasesManquants` et le recalcul de `lesJumelles`.
- La technique 16.11 porte un budget de 50 ms. Elle ne prouve pas la fraîcheur d'une prélecture ni sa priorité sur le mode Composant.
- Q-F7-1 conserve la composition flottante, un seul arrondi à 8 bits et une comparaison à dix décimales. L'oracle doit distinguer un écart d'un octet.
- Q-F7-4 donne `fond-indetermine` si le frère ne couvre qu'une partie du texte.
- Q-F7-6 inclut les modes du thème dès que le repli sert, même pour du texte en dur.
- Q-F7-8 mesure le contour sur le fond des ancêtres sans remplissage visible, ou si le remplissage est sous 3:1.
- Q-F7-10 garde `disabled` et `disable` dans les exclusions. C53 dit que le contraste et la cible sont exclus.
- Q-F7-12 construit l'identifiant avec le code, le nom du layer, l'usage et le fond nommé.
- Q-F89-19 laisse le premier variant sans borne.
- QV-1 exclut `complete` quand le sujet n'a aucun nœud.

La matrice complète des décisions et les comptes d'icônes restent en cours de vérification.


## Audit consolidé des références

L'agent a vérifié 27 définitions SVG hors Palettes. Le socle en porte 10, Architect 10, l'exporteur 1 et le hub 6. Les deux thèmes du chevron CSS et les deux déclarations du masque ne doublent pas le compte. La courbe dynamique du hub reste un graphique.

Le relevé des glyphes compte 10 caractères distincts, `× › → − ≠ ◆ ⚠ ✓ ✗ ❌`. L'agent a lu les littéraux de chaîne et de template des 299 fichiers `.ts` et `.mjs` suivis des sources de Socle, Architect, Exporter, Hub, CLI et Adapter. Il a cherché les caractères de l'inventaire `× → ✓ ⋯ ＋ − › ≠ ◆ ≈ ⊣ ✗ ℹ ⚠ ✅ ❌`. Le comptage exclut commentaires, ASCII et sélecteur de présentation. Le total des paquets réservés reste inconnu.

Les numéros de ligne du plan initial correspondaient à leur objet. La révision les remplace par chemins et symboles. Les trois fichiers `mesurer.ts` du kit existent. La dépendance racine `tsx` exécute ces fichiers sans exiger un script npm de même nom.

A2 doit migrer aussi la reprise `prop-boolean` de la famille `regles`. A4 doit citer la vue `docs/notes/Recherches/Archi Tokens Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html` et ses données `donnees-referentiel.js`. A4 et A10 modifient les sources du kit et exigent une montée de version.

A10 omet des producteurs de diagnostics. La révision ajoute notamment `packages/adapter-typescript/src/cli.mjs`, `packages/cli/src/guide.mjs` et les lecteurs de diagnostics. Elle distingue les glyphes de sévérité des symboles métier. A11 doit accepter graphiques et aperçus SVG.

`npm run vues` écrit aussi dans les paquets réservés. Les lots qui le lancent attendent la fin de cette session. Les migrations mécaniques A6 et A8 prennent `implementeur`.

## Audit consolidé des décisions et des écarts

L'archive porte 102 décisions. Le relevé des mesures porte 32 identifiants E et N-01 à N-88. Le plan initial omet E-22 et N-23. N-69 manque en rattachement explicite. Les autres écarts ont une référence, mais N-46 et N-51 décrivent le mauvais comportement.

QM-8 et QM-9 existent dans la maquette sans faire partie des 102 entrées de l'archive. Ils rattachent le cochage et Ignorer aux lots B et C. Le complément de texte de B7 figure dans la section 7 validée. Le cadre Tokens mesure 680 px. Le rappel de 640 px porte sur les cartes du tour 3.

Les clauses restaurées couvrent aussi les conteneurs de règles. C43 nomme l'instance d'une autre page qui n'est pas lue. Deux noms compactés égaux ne partagent pas le conteneur. Un conteneur supplémentaire ignoré garde C44. La répartition C34/C42 doit citer combinaisons manquantes, états non reconnus, états tolérés, absence de variant, absence de propriété et collisions de noms. Opacité et effets vont dans Tokens. Le constat de règle probablement renommée cite les deux noms sans correction. L'empreinte des points distincts rend inutile leur suffixe de rang.

Le seul `todo` pertinent trouvé est celui de N-04 dans `packages/kit/tests/stressComposantBase.test.ts`. Les autres régressions doivent être créées. Le `test.todo` d'interface reste hors du périmètre autorisé.

## Audit consolidé de la phase D

D0 prenait le dossier des rapports pour une source de catalogues. Le banc doit lire des fixtures ou des sources privées passées au rejeu. D1 doit partager l'acquisition dans une demande, puis réacquérir sur Actualiser. Changement externe, Ctrl+Z, library, déclaration, vocabulaire et refus puis disponibilité invalident une reprise sans preuve.

Ignorer un rôle change `rolesIgnores`, donc C82 doit recalculer sur le catalogue acquis. Après une écriture, les créations, noms, scopes, alias et modes peuvent modifier les candidats globaux. Une relecture complète reste nécessaire sans preuve des dépendances touchées.

La parité porte sur les objets complets ordonnés, dont identifiants, faits, questions, corrections, ignorés, limites et couverture. Une correction de défaut ne doit pas modifier les attentes d'un lot d'optimisation.

`creerListeVirtuelle` impose une hauteur fixe. La révision sépare l'adaptation aux cartes dépliables et leur branchement. Elle exige le maintien du focus, des cases, des menus et du dépliage.

L'agent avait signalé un recalcul de `lesJumelles`. La conversation principale a relu `packages/kit/src/controles/integrite.ts`. La mémoire `prefixe.jumelles` existe déjà. D3 doit la conserver et mesurer ses appels, sans promettre une optimisation déjà présente.

## Questions à rendre au mainteneur

- La cible F1 exige-t-elle zéro faux positif malgré Q-F4 qui accepte moins d'un faux positif pour 1 000 noms, par exemple 20 faux positifs à L = 7 dans la mesure ?
- Quelle preuve autorise le retrait de Q-F2-6 quand aucun usage local ne subsiste, mais qu'un autre fichier peut encore lier la variable ?

La conversation principale constate aussi des modifications nouvelles dans le kit et Architect pendant la relecture. Elle ne les a pas écrites. Les références décrivent le contenu observé et ne valent pas validation de ces changements.


## Retours de la seconde relecture

Les deux agents ont relu le plan corrigé. Ils ont trouvé cinq renvois ou critères restants. La conversation principale les a corrigés.

- Le retrait du `todo` N-04 renvoyait à E5c. Il renvoie à E5d.
- QV-4 omettait encore de dire que l'intégrité UCM n'est pas contrôlée. E3.9 et E4.6 portent maintenant cette conséquence.
- La fin A3c demandait encore une ligne dans le kit pour chaque icône. Elle distingue maintenant signes du kit et alertes du socle.
- Les fins E1b, E2a, E8a et E9e omettaient les tests d'Architect. E11b omettait les tests du socle. Les commandes sont ajoutées.
- E2.6 faisait encore venir les synonymes du JSON de test. Le classement alimente maintenant la table de `packages/kit/src/referentiel/vocabulaire.ts`.

L'agent chargé des écarts a aussi jugé E0 trop large. E0 préparait les oracles des sept harnais dans un appel avec `git diff --check` comme seule commande de fin. E0 prépare maintenant la table de couverture. Chaque sous-lot reclasse ses propres cas et rend les dénominateurs avant et après. Son harnais vérifie cet oracle.


## Changements faits dans le plan

| Lot ou case | Avant | Après | Raison |
|---|---|---|---|
| Exécution | Deux agents et versions du kit en parallèle, publication à chaque phase | Un seul lot écrit, versions et pins dans chaque lot, publication finale | Les lots partagent sources, cartes, verrou et versions. |
| A3, A5, A9, A11 | Toutes les formes passent au kit | Les alertes restent au socle. Le hub lit leur rendu sans DOM. Le contrôle distingue icônes et graphiques. | R-8 et QM-11 imposent cette frontière. |
| A3 | 31 SVG et 26 glyphes sans périmètre | 27 définitions SVG et 10 caractères distincts sur le périmètre autorisé | Le total des paquets réservés ne peut pas être vérifié ici. |
| A4, A6, A8, A10 | Chemins abrégés et producteurs oubliés | Chemins corrigés, vue nommée, sorties ajoutées, catalogues français et anglais | Chaque migration reçoit ses lecteurs et ses vérifications. |
| A2, A5, A8, C2 | Promesses de parité au pixel sans protocole | Dimensions fixes, écarts attendus et relecture des captures | Une migration d'icône peut changer taille, teinte ou nom accessible. |
| B1, C5 | Même règle de cochage dans plusieurs phases | E-34 appartient à B1. E-22 appartient à C5, dont les lignes ajoutées après relecture. | Chaque défaut a un responsable. |
| B4 à B7, E11 | Reprises des mêmes états | B porte les écrans. E11 porte les lecteurs, le budget et le cycle. | Les corrections évitent un second panneau concurrent. |
| D0 à D7 | Mémoire jusqu'à écriture, reprise ciblée sans preuve, virtualisation fixe | Acquisition par demande, fraîcheur testée, repli complet, prélecture mesurée, virtualisation en deux lots | Les changements externes et les cartes dépliables invalident les hypothèses initiales. |
| E0 | Décisions sans case et oracles supposés prêts | Décisions retirées documentées, régressions recensées, reclassement par sous-lot | Les décisions restent acquises sans ajouter de comportement. |
| E1 à E11 | Familles entières confiées en un appel | Sous-lots avec agent, dépendances, cases conservées et commande de fin | Chaque appel reçoit une portée vérifiable. |
| E5.8, E10b | Dédoublonnage réparti entre deux phases | E10b porte seul le doublon kit/moteur après E5 et E6 | Le traitement partage `packages/plugin-architect/src/constatsDuMoteur.ts`. |
| E9.10, E9.12, E11.8 | N-51 et N-46 mal décrits, N-23 absent | Texte sous 12 px conservé, priorité des limites testée, cartes provisoires présentes | Les cases suivent les décisions et les défauts mesurés. |
| E12 | Totaux promis avant reclassement | Objectifs de recette, anciens et nouveaux dénominateurs, absences de preuve explicites | Les décisions changent les cas attendus. |
| Couverture | Rattachements dispersés | Table des 102 décisions, avec cases existantes | Le mainteneur peut vérifier chaque décision. |
| Documents et tests | Plusieurs lots sans fin, tests de paquet incomplets | Fin pour chaque lot, galerie, spécifications, cartes, invariants et langues dans le lot concerné | Les critères de sortie couvrent les paquets touchés. |

## Constats non corrigés hors du plan

| Chemin | Constat | Raison |
|---|---|---|
| `packages/plugin-palettes/src/` | Le total complet des icônes et des glyphes reste inconnu. | La lecture du code est réservée à l'autre session. Seule l'existence des chemins a été contrôlée. |
| `docs/notes/Recherches/UCM Architect/8 Fiabilisation/MESURE-DES-FAILLES.md` | Les cibles et dénominateurs n'ont pas été réécrits. | Cette tâche autorise la correction du plan et le suivi demandé. E12 porte la future mesure. |
| `docs/notes/Recherches/UCM Architect/8 Fiabilisation/QUESTIONS-V2.html` | La tension entre le seuil Q-F4 et la cible F1 reste une question. | Une révision du plan ne change pas une décision produit. |
| `packages/plugin-architect/src/ecriture/structure.ts` | La preuve autorisant le retrait après fusion reste à préciser. | Aucun usage local ne prouve l'absence d'usage dans un autre fichier. La décision option C reste dans le plan. |
| `_local/recette-v2/` | Les captures supplémentaires et les durées Figma restent à produire. | Le mainteneur exécute cette recette. Aucun runtime Figma n'a été validé ici. |

La fusion E4c ne bloque plus E5a, qui dépend des contrats et des lecteurs déjà corrigés. La preuve complète de famille E12 attend E4c. E3e ne dépend plus de la lecture de recette E3d. L'écriture d'alias E4b garde ce prérequis.


## Retours de la dernière vérification des références

L'agent a trouvé une dépendance manquante de A9 envers A5.4. A9 dépend maintenant de A5. Le champ de repli de A3.6 porte explicitement le nom `texte`, que ses lecteurs attendent. Le fichier de test A11 porte la mention « nouveau ».

La mesure Figma de D5 bloquait D6, puis les corrections E. D5 est maintenant séparé entre candidat local D5a et mesure mainteneur D5b. D6 dépend de D4b. E0 dépend de C6. E1a ne dépend plus de A4 ni A10. E5a ne dépend plus de la fusion E4c. E12 rassemble les branches locales E3d, E4c, D7.1 et D5a avec E11c.

A4 peut régénérer ses seules données par `npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/generer-donnees-referentiel.ts"`. A9 peut régénérer le hub seul par `npm run hub --workspace ucm-hub`. Ces deux commandes existent et bornent leurs écritures. La relecture n'a exécuté aucun générateur. `npm run vues` reste réservé à un arbre stable.


## Correction du contrôle des commandes

Le contrôle final a trouvé une commande ajoutée dans le brouillon vers `packages/kit/tests/stress/f3-composant/mesurer.ts`. Ce fichier n'existe pas. La conversation principale a retiré cette commande.

Les opérateurs F3-F4 existent. Les tests gardent leurs oracles mais ne mesurent pas le kit complet. L'exécuteur de `npm run stress:composant --workspace ucm-architect-plugin` joue seulement la chaîne de 67 cas. Le nouveau lot E0b fait mesurer les opérateurs par cet exécuteur existant, avec un tableau distinct. E12 attend ce lot. Aucune commande vers un fichier futur n'est présentée comme disponible.


## Vérifications rendues

Le contrôle documentaire trouve 77 lots avec une ligne « Fin » et 216 cases sans doublon. Les 102 décisions ont une ligne de couverture. Les 32 identifiants E mesurés et N-01 à N-88 apparaissent dans le plan. Les chemins complets existants, les fichiers de mesure et les scripts cités ont été contrôlés. Les nouveaux fichiers sont annoncés comme tels.

`git diff --check` sur le plan sort en code 0, sans sortie. Le contrôle de style ciblé sur le plan et ce suivi rend « Style conforme. ». Aucun test produit, aucun `test:ui` et aucun générateur n'ont été lancés. Aucun commit n'a été créé.

`npm run agents:diff` sort en code 0. Sa liste porte aussi les modifications des autres sessions. Les autorités du kit, d'Architect et du socle ont été relues. Les documents de Couleur et Palettes restent hors lecture conformément à la contrainte de la tâche. Aucun chemin supprimé ou renommé n'est signalé.

Sortie de `node scripts/controle-style.mjs`, code 0. Les 605 signaux concernent le dépôt entier. Les deux documents de cette relecture n'ont ni signal ni refus au contrôle ciblé.

```text
605 signal(aux) à revoir, sans refus :
  opposition-deux-points : 212
  permet-de : 37
  deux-points-multiples : 193
  fleche : 163
Style conforme.
```

Sortie de `git diff --stat`. Elle inclut les changements des autres sessions. Ce fichier de suivi est encore non suivi et n'apparaît pas dans cette commande.

```text
warning: CRLF will be replaced by LF in docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md.
The file will have its original line endings in your working directory
warning: CRLF will be replaced by LF in docs/references/analyses/segmented-control.html.
The file will have its original line endings in your working directory
warning: CRLF will be replaced by LF in packages/couleur/src/reconstruction.ts.
The file will have its original line endings in your working directory
warning: CRLF will be replaced by LF in packages/plugin-architect/galerie/etats/structure.cjs.
The file will have its original line endings in your working directory
warning: CRLF will be replaced by LF in packages/plugin-architect/src/ui/nomenclature/coquille.ts.
The file will have its original line endings in your working directory
warning: CRLF will be replaced by LF in packages/plugin-palettes/galerie/etats.cjs.
The file will have its original line endings in your working directory
warning: CRLF will be replaced by LF in packages/plugin-palettes/src/analyse.ts.
The file will have its original line endings in your working directory
warning: CRLF will be replaced by LF in packages/plugin-palettes/src/i18n/en.ts.
The file will have its original line endings in your working directory
warning: CRLF will be replaced by LF in packages/plugin-palettes/src/i18n/fr.ts.
The file will have its original line endings in your working directory
warning: CRLF will be replaced by LF in packages/plugin-palettes/src/planche/modele.ts.
The file will have its original line endings in your working directory
warning: CRLF will be replaced by LF in packages/plugin-palettes/src/ui/garanties.ts.
The file will have its original line endings in your working directory
warning: CRLF will be replaced by LF in packages/plugin-palettes/src/ui/nuancier.ts.
The file will have its original line endings in your working directory
warning: CRLF will be replaced by LF in packages/plugin-palettes/tests/ajustement.test.ts.
The file will have its original line endings in your working directory
warning: CRLF will be replaced by LF in packages/plugin-palettes/tests/interface/interface.test.mjs.
The file will have its original line endings in your working directory
warning: CRLF will be replaced by LF in tests/referencesComposants.test.ts.
The file will have its original line endings in your working directory
 README.md                                          |    6 +-
 .../PLAN-IMPLEMENTATION.md"                        |  367 ++++++
 .../SUJETS IMPORTANTS \303\240 trancher/README.md" |   17 +-
 .../RECHERCHE-PLUGIN-PALETTES.md                   |   27 +-
 .../REVUE-CRITIQUE-VITESSE-ANALYSE.md              |  828 ++++++++++++-
 .../8 Fiabilisation/PLAN-IMPLEMENTATION.md         | 1220 +++++++++++++++-----
 docs/references/_outils/gabarit.html               |  208 ++--
 docs/references/_outils/guide.schema.json          | 1018 ++--------------
 docs/references/_outils/guide.ts                   |  787 +++++--------
 docs/references/analyses/segmented-control.html    |  587 ++++++++--
 docs/references/analyses/segmented-control.json    |  525 +++------
 package-lock.json                                  |   10 +-
 packages/adapter-typescript/README.md              |    2 +-
 packages/adapter-typescript/package.json           |    4 +-
 packages/cli/README.md                             |    8 +-
 packages/cli/package.json                          |    4 +-
 packages/couleur/CARTE.md                          |    4 +-
 packages/couleur/invariants/moteur-de-couleur.md   |    6 +-
 packages/couleur/planche/PLANCHE-DU-MOTEUR.html    |    2 +-
 packages/couleur/src/ancrageDeplace.ts             |    5 +-
 packages/couleur/src/limites.ts                    |    3 +-
 packages/couleur/src/palette.ts                    |   54 +-
 packages/couleur/src/promesses.ts                  |    3 +-
 packages/couleur/src/reconstruction.ts             |   40 +-
 packages/couleur/src/textes.ts                     |   10 +-
 packages/couleur/tests/alertes.test.ts             |    3 +-
 packages/couleur/tests/ancrage.test.ts             |   22 +
 packages/couleur/tests/ancrageDeplace.test.ts      |   13 +-
 .../couleur/tests/fixtures/instantane-rampes.json  |   12 +-
 packages/couleur/tests/limites.test.ts             |   21 +
 packages/couleur/tests/promesses.test.ts           |   14 +-
 packages/couleur/tests/reconstruction.test.ts      |   73 +-
 packages/couleur/tests/textes.test.ts              |  147 ++-
 packages/hub/HUB-UCM.html                          |   40 +-
 packages/kit/CARTE.md                              |    2 +-
 packages/kit/README.md                             |    2 +-
 packages/kit/package.json                          |    2 +-
 packages/kit/src/controles/structure.ts            |  Bin 17838 -> 18731 bytes
 packages/kit/src/referentiel/signes.ts             |   22 +-
 packages/kit/tests/signes.test.ts                  |   20 +-
 .../plugin-architect/galerie/etats/structure.cjs   |    6 +
 packages/plugin-architect/src/messages/rapport.ts  |    5 +-
 packages/plugin-architect/src/sandbox/rapport.ts   |   18 +-
 packages/plugin-architect/src/ui/application.ts    |   11 +-
 packages/plugin-architect/src/ui/index.ts          |    4 +-
 .../src/ui/nomenclature/coquille.ts                |    6 +-
 .../plugin-architect/src/ui/structure/index.ts     |   22 +-
 packages/plugin-architect/tests/rapport.test.ts    |  107 ++
 packages/plugin-palettes/CARTE.md                  |    2 +-
 packages/plugin-palettes/galerie/etats.cjs         |   19 +
 packages/plugin-palettes/src/analyse.ts            |    8 +-
 packages/plugin-palettes/src/i18n/en.ts            |    4 +
 packages/plugin-palettes/src/i18n/fr.ts            |    5 +
 packages/plugin-palettes/src/planche/modele.ts     |    3 +-
 packages/plugin-palettes/src/ui/apercuCompact.ts   |    3 +-
 packages/plugin-palettes/src/ui/garanties.ts       |    6 +
 packages/plugin-palettes/src/ui/nuancier.ts        |   10 +-
 packages/plugin-palettes/tests/ajustement.test.ts  |   14 +-
 packages/plugin-palettes/tests/analyse.test.ts     |   18 +-
 .../tests/interface/interface.test.mjs             |   27 +
 .../plugin-palettes/tests/modeleDePlanche.test.ts  |   15 +
 tests/referencesComposants.test.ts                 |  252 ++--
 62 files changed, 4075 insertions(+), 2628 deletions(-)
```

Sortie du diff limitée au plan, puis état des deux fichiers de cette tâche.

```text
.../8 Fiabilisation/PLAN-IMPLEMENTATION.md         | 1220 +++++++++++++++-----
 1 file changed, 957 insertions(+), 263 deletions(-)
 M "docs/notes/Recherches/UCM Architect/8 Fiabilisation/PLAN-IMPLEMENTATION.md"
?? "docs/notes/Recherches/UCM Architect/8 Fiabilisation/RETOURS-RELECTURE-PLAN.md"
```


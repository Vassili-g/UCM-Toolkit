# Lot 2 : coopération et annulation dans les boucles

[Sommaire des lots](./README.md).

## Tâches à committer

- [x] **2.1 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : injecter horloge, pause, budget et jeton dans un contexte commun ; relire le jeton après pause et tester la fermeture de portée. Travail local : `porteeDAnalyse.ts` du socle, `porteeDAnalyse.test.ts` de l'exporteur.
- [x] **2.2 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : transmettre ce contexte au relevé, au moteur et au pilote sans seconde portée globale ; comparer les sorties avec cessions imposées. Travail local : `sandbox/analyse.ts`, `exportComponent.ts` du socle.
- [x] **2.3 | gpt-6-luna | medium** | **Claude Sonnet | medium** : rendre interruptibles le parcours des enfants et le budget des variants ; tester une chaîne profonde et 90 variants. Travail local : `releveDuComposant.ts` (`parcourir`), `budget.ts` (`bornerLesVariants`).
- [ ] **2.4 | gpt-6-luna | medium** | **Claude Sonnet | medium** : céder dans les lectures de layers, liaisons, surcharges, plages et modes ; tester arrêt avant leur fin et parité du relevé. Travail local : `releveDuComposant.ts`, `lectureDuComposant.ts`, `consommateurs.ts`.
- [ ] **2.5 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : partager une itération synchrone et coopérative pour accessibilité et typographie ; comparer constats ordonnés et annulation interne. Travail local : `accessibilite.ts` et `typographie.ts` du kit.
- [ ] **2.6 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : rendre l'indexation et l'enrichissement des corrections interruptibles ; tester C25/C29 et une annulation avant publication. Travail local : `corrections.ts` du kit (`indexerLeReleve`, enrichissement).
- [ ] **2.7 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : céder dans la matérialisation des modes et le comptage du budget ; conserver produit, ordre et limites. Travail local : `accessibilite.ts` du kit (`combinaisonsDeModes`).
- [ ] **2.8 | gpt-6-luna | medium** | **Claude Sonnet | medium** : découper les contrôles de cible, texte minimal et anneau ; comparer leurs constats et couper pendant C52. Travail local : `accessibilite.ts` du kit (`controlerLesCibles`, `controlerLeTexteMinimal`, `controlerLAnneau`).
- [ ] **2.9 | gpt-6-luna | medium** | **Claude Sonnet | medium** : découper Oublis et son produit plafonné ; comparer C31 à C33 puis annuler dans la construction. Travail local : `oublis.ts` du kit.
- [ ] **2.10 | gpt-6-luna | medium** | **Claude Sonnet | medium** : découper Couches entre variants, calques et liaisons ; comparer C80/C20 et annuler dans 128 liaisons. Travail local : `couche.ts` du kit.
- [ ] **2.11 | gpt-6-luna | medium** | **Claude Sonnet | medium** : découper Mapping entre liaisons, modes et fratrie ; comparer les sorties et annuler dans 256 modes. Travail local : `mapping.ts` du kit.
- [ ] **2.12 | gpt-6-luna | medium** | **Claude Sonnet | medium** : découper Nommage et partager ses lectures d'axes et de tokens ; comparer l'ordre des candidats et annuler dans 256 tokens. Travail local : `nommage.ts` du kit.
- [ ] **2.13 | gpt-6-luna | medium** | **Claude Sonnet | medium** : découper Thème C59 dans l'index, les liaisons, les candidats et les fonds ; tester 256 ancêtres. Travail local : `theme.ts` du kit.
- [ ] **2.14 | gpt-6-luna | medium** | **Claude Sonnet | medium** : découper les deux branches Structure d'Architect ; comparer questions, corrections et lecture partielle. Travail local : `structure.ts` du kit.
- [ ] **2.15 | gpt-6-luna | medium** | **Claude Sonnet | medium** : borner chaque avancée C29 sur 2 000 tokens FLOAT ; garder l'empreinte des 90 variants. Travail local : `corrections.ts` (C29) et `candidatsDeLongueur.ts` du kit.
- [ ] **2.16 | gpt-6-luna | medium** | **Claude Sonnet | medium** : borner chaque avancée C25 sur 2 000 couleurs et liaisons ; construire son cache une seule fois pour deux calques. Travail local : `corrections.ts` du kit (C25).
- [ ] **2.17 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : découper la découverte des collections ; prouver l'annulation pendant cette découverte. Travail local : `bibliotheque.ts` du socle (`lireLesLibraries`), `catalogueDeFigma` de `sandbox/analyse.ts`.
- [ ] **2.18 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : découper la construction des cibles ; prouver l'annulation avant le moteur. Travail local : `accessibilite.ts` du kit (`ciblesDeContraste`).
- [ ] **2.19 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : auditer les dernières passes indivisibles du relevé et découper celles qui dépassent le budget simulé. Travail local : `releveDuComposant.ts`.
- [ ] **2.20 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : auditer les dernières passes du moteur et des helpers d'oublis ; découper celles qui dépassent le budget simulé. Se coche dans le commit de 2.20e.
- [ ] **2.20a | gpt-6.1-sol | medium** | **Claude Sonnet | high** : découper les recherches C31 à C33, les liaisons, l'index des variables et les passes finales de compaction, élision, signature et sérialisation ; comparer les sorties complètes et annuler sur 128 puis 256 entrées. Travail local : `oublis.ts` du kit ; `propertyBindings.ts`, `variables.ts` (`indexVariables`), `compactVariants.ts`, `elideNeutrals.ts`, `serializeJson.ts` du socle.
- [ ] **2.20b | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : découper la construction de la matrice et ses valeurs d'axes ; conserver ordre, clés publiques et avertissements, puis annuler pendant 256 variants. Travail local : `componentTree.ts` du socle (`buildVariantMatrix`, `getVariantValues`).
- [ ] **2.20c | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : découper la recherche des combinaisons manquantes ; garder cardinalité et cinq exemples ordonnés, puis annuler pendant la lecture des variants. Travail local : `componentTree.ts` du socle (`findMissingVariantCombinations`).
- [ ] **2.20d | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : découper les échantillons et les helpers de slots nécessaires ; garder textes, arguments, dépendances, surcharges et remplacements, puis annuler dans un gros variant. Travail local : `extractSamples.ts`, `slotNames.ts`, `slotRelations.ts` du socle.
- [ ] **2.20e | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : vérifier la parité du moteur raccordé, inventorier ses bornes natives et préparer version, changelog et pins du kit avant les commits isolés. Les montées de version suivent la règle du sommaire.
- [ ] **2.21 | gpt-6-luna | low** | **Claude Haiku | low** : comparer les budgets 16, 25 et 50 ms sur le même corpus dans le banc existant ; garder sorties et nombres de cessions. Travail local : `scripts/mesurer-export.cjs` de l'exporteur. Les mesures sont déjà consignées plus bas ; les rejouer pour la preuve du commit.

Prérequis : 1. Nature : correction du défaut de cession.
La case 2.20 regroupe l'audit ; seules ses sous-cases portent les commits.
Ordre : 2.20a, 2.20b, 2.20c, 2.20d, 2.20e. L'audit local compte,
sur 128 puis 256 variants, 128 puis 256 lectures de `variantProperties`
dans chacune des passes matrice et combinaisons ; sur 128 puis 256 textes,
l'échantillon lit `characters` 256 puis 512 fois sans cession.
Chemins : `packages/plugin-architect/src/releveDuComposant.ts`,
`sandbox/analyse.ts`, `packages/plugin-socle/src/composant/contract/porteeDAnalyse.ts`,
`exportComponent.ts`, `budget.ts`, et boucles internes identifiées par la trace.
Les fichiers « Travail local » des cases viennent du nom des fonctions de
chaque hunk ; l'agent confirme la répartition avant d'écrire son patch.
`exportableNodes.ts`, `extractVariantTypography.ts` et `structureTree.ts`
du socle portent aussi du travail local sans case désignée : l'agent de 2.19
ou de 2.20a les rattache à la sienne.

## Portée et preuves conservées

- **Acquis localement, non commité** : introduire un budget coopératif explicite avec
  horloge, pause et jeton injectables. Le budget traverse tous les variants.
  Garder une seule portée du moteur ; ne pas envelopper son appel dans une
  seconde portée globale. Les lecteurs et contrôles reçoivent le contexte
  coopératif sans ouvrir cette portée. Relire le jeton après la pause.
  `creerContexteCooperatif` porte horloge, pause, budget et jeton. Architect
  transmet le même objet au relevé, au moteur et au pilote des contrôles ;
  `analyserLeComposant` seul ouvre sa portée de mémoire. Le budget par défaut
  est de 25 ms entre points coopératifs, à confirmer dans Figma.
  `porteeDAnalyse.test.ts` prouve la relecture après pause, le budget après
  retour de pause et la fermeture ; `analyse.test.ts` compare les mêmes
  constats et corrections avec des cessions imposées.
- **Portée initiale répartie dans les cases ci-dessus** : rendre le parcours du relevé interruptible et
  remplacer le modulo de 400. Céder dans les boucles longues du budget, des
  contrôles et des corrections ; une pause entre deux contrôles ne suffit pas.
  Préserver les fonctions synchrones publiques du kit au besoin par un
  générateur commun que la voie synchrone épuise et que le pilote découpe.
  Versionner toute modification du kit dans son propre commit.
  Partie faite : parcours du relevé, empilement des enfants, lecture des
  layers, liaisons, surcharges, plages de texte et modes partagent ce budget.
  `budget.ts` conserve sa voie synchrone et expose une voie coopérative sur
  le même générateur ; le moteur utilise cette dernière.
  Les tests arrêtent un parcours de 1 500 niveaux avant lecture des layers
  et un décompte de 90 variants après 25 comptes. Le relevé de 90 petits
  variants reste identique avec et sans cessions.
  Suite locale : `accessibilite.ts`, `typographie.ts` et `corrections.ts`
  exposent chacun un générateur que leur voie synchrone épuise. Architect
  vérifie le budget toutes les 32 étapes. Le contraste cède entre cibles et
  combinaisons ; la typographie entre layers et sources ; les corrections
  pendant l'indexation, les recherches de C25/C29 et l'enrichissement.
  `analyse.test.ts` annule au milieu du contraste et de l'index des corrections,
  avant le moteur et avant toute publication provisoire. Les tests du kit
  comparent les sorties ordonnées des générateurs à leurs voies synchrones.
  La matérialisation des combinaisons de modes cède désormais avant chaque
  ajout, sans changer le produit complet, son ordre ni la borne. Un test coupe
  l'analyse pendant un produit 8 × 8 × 8, avant le moteur et tout provisoire ;
  un autre vérifie les rapports ordonnés de deux collections à deux modes.
  Les contrôles de cible, de texte minimal et d'anneau cèdent aussi entre
  variants, racines, calques, plages et anneaux. Une fixture compare les six
  constats ordonnés des deux voies ; Architect annule après le contraste,
  pendant C52, sans provisoire ni moteur. `controlerOublis` partage aussi un
  générateur avec sa voie synchrone ; le produit de variants plafonné à 4 096
  cède pendant sa construction. Les tests comparent C31 à C33 et annulent
  Architect au milieu du produit. `controlerCouches` cède entre variants,
  calques, liaisons, modes d'alias et cibles distinctes. Ses tests comparent
  C80 et C20 dans leur ordre et annulent au milieu de 128 liaisons.
  Mapping partage également un générateur avec sa voie synchrone. Le parcours
  des liaisons, les signatures par mode et la fratrie C21 cèdent ; le test
  d'annulation coupe une signature de 256 modes avant Couches et le moteur.
  Nommage cède dans les propriétés, les tokens, les variants et les candidats.
  Mapping et Oublis utilisent ses lectures d'axes et de tokens par étapes ;
  les API synchrones restent disponibles. Un test annule dans un catalogue de
  256 tokens et compare les constats et candidats dans leur ordre.
  Thème C59 cède pendant l'indexation des calques, la lecture des liaisons,
  la recherche des candidats et la remontée des fonds. Un test annule dans
  une chaîne de 256 ancêtres ; C60 reste hors du parcours Architect.
  Structure cède dans ses deux branches Architect : valeurs vides et
  contournements du thème. Les tests couvrent question, correction, lecture
  partielle et annulation dans un groupe de 256 valeurs.
  Un audit a mesuré 447 ms pour une seule avancée des corrections C29 avec
  2 000 tokens FLOAT. C29 délègue maintenant la lecture des tokens au cache
  partagé et cède pendant les filtres, modes, alias et candidats. Les tests
  bornent le travail par avancée sur 2 000 tokens, modes et candidats, puis
  comparent l'empreinte historique de 90 variants et annulent Architect
  pendant la résolution. C25 cède aussi pendant la recherche de peintures,
  l'index des couleurs, le filtrage et la construction des questions. Les
  compteurs couvrent 2 000 couleurs et liaisons avec un cache construit une
  seule fois pour deux calques.
  La découverte des collections, la construction des cibles, les helpers
  d'oublis et les passes auditées du moteur et du relevé disposent de cessions
  locales. Les cases 2.17 à 2.20 restent ouvertes jusqu'aux commits isolés. La version
  du kit et ses pins accompagnent chaque commit qui touche ses sources.
  Contrôles après cette suite : kit 1 025/1 025, Architect 1 083/1 083,
  exporteur 1 087/1 087 ; typecheck Architect et build livrable passent.
  Après la matérialisation coopérative : 49 tests ciblés, typecheck du kit et
  d'Architect, build du kit, `agents:diff` et `git diff --check` passent.
  Après les trois contrôles finaux : 51 tests ciblés, typecheck du kit et
  d'Architect, build du kit, `agents:diff` et `git diff --check` passent.
  Après les oublis : 82 tests ciblés, typecheck du kit et d'Architect,
  build du kit, `agents:diff` et `git diff --check` passent.
  La suite complète Architect a révélé un défaut de compilation QuickJS sur
  `for (... of yield* ...)`. Les deux résultats délégués sont désormais rangés
  avant leur boucle, sans changer le calcul. Le test QuickJS reproduisait le
  défaut puis passe après correction ; 83 tests ciblés passent. Sur l'arbre
  corrigé, kit 1 029/1 029 et Architect 1 086/1 086 passent.
  Après Couches : 65 tests ciblés, test QuickJS isolé, build du kit,
  typecheck du kit et d'Architect, `agents:diff` et `git diff --check` passent.
  Après Mapping : 67 tests ciblés, test QuickJS isolé, build du kit,
  typecheck du kit et d'Architect, `agents:diff` et `git diff --check` passent.
  Après Nommage : 71 tests ciblés, test QuickJS isolé, build du kit,
  typecheck du kit et d'Architect, `agents:diff` et `git diff --check` passent.
  Après Thème C59 : 43 tests ciblés, test QuickJS isolé, build du kit,
  typecheck du kit et d'Architect, `agents:diff` et `git diff --check` passent.
  Après Structure : 46 tests ciblés, test QuickJS isolé, build du kit,
  typecheck du kit et d'Architect, `agents:diff` et `git diff --check` passent.
  Après C29 : 99 tests ciblés, test QuickJS isolé, build du kit et typechecks
  du kit et d'Architect passent.
  Après C25 : 60 tests ciblés, test QuickJS isolé, build du kit et typechecks
  du kit et d'Architect passent.
  Les preuves de 2.20 couvrent 128 puis 256 entrées : recherches C31 à C33,
  liaisons, variables, calques, instances, matrice, combinaisons, échantillons,
  signatures, élision, compaction et sérialisation. Les pauses du moteur arrêtent
  les lectures à 25 unités simulées ; les recherches d'oublis lisent au plus
  deux valeurs par avancée. Les voies conservent leurs sorties ordonnées.
  QuickJS compile le bundle et exécute le sérialiseur ; les contrôles locaux
  passent : kit 1 050/1 050, exporteur 1 103/1 103, Architect 1 113/1 113,
  typecheck et build racine. `npm run vues` n'écrit rien.
  Montée locale provisoire : kit 0.13.3, CLI 0.1.100, adaptateur 0.1.93,
  manifests, lock et pins documentés. `versionSuitLeContenu` et `pinDocumente`
  passent. Cette montée regroupe les cases kit non committées et doit être
  ventilée avant leurs commits. Aucun changelog de paquet n'existe : son
  domicile reste à décider par le mainteneur ; le README reste une référence
  et le changelog de format ne reçoit aucune entrée pour cette optimisation.

Preuves locales : 66 tests ciblés passent ; suites socle 86/86 et exporteur
1 087/1 087. La suite Architect passe 1 079 tests sur 1 081 au premier essai :
la loi du nom du produit refuse trois traces du lot 1, puis passe après
retrait du préfixe ; le test temporel de nomenclature passe seul en 121 ms
après 570 ms pendant les suites parallèles. Les 35 tests ciblés de loi,
analyse et identités passent après correction. Style conforme ; build
Architect livré avec les sources du lot.

`scripts/mesurer-export.cjs` compare les budgets 16, 25 et 50 ms sur les
mêmes 1 000 variants : médianes Node 165,70, 162,57 et 152,35 ms, contre
156,32 ms sans pause ; 40, 27 et 17 cessions sur neuf essais. Le contrat
reste identique. Ce corpus synthétique ne mesure pas les appels natifs Figma ;
25 ms reste un choix provisoire, sans gain ni borne d'interaction établis.

Sortie : l'horloge simulée provoque une cession avant la fin de 90 petits
variants et une annulation au milieu d'un gros contrôle. Le contrat reste
identique avec et sans cessions. Essayer 16, 25 et 50 ms dans le banc ; ne pas
déduire une borne de gel d'un seuil vérifié entre appels Figma indivisibles.
Contrôles : Architect, socle et exporteur. **Build Architect.**

# Checklist d'implémentation de la vitesse d'analyse

Cette checklist applique la [revue critique](./REVUE-CRITIQUE-VITESSE-ANALYSE.md).
Elle couvre la première analyse et les analyses suivantes dans la même session.
Les sorties d'Architect et de l'exporteur servent de référence fonctionnelle.
Aucun gain de durée n'est acquis avant la recette dans Figma.

## Exécution et attribution

- [x] **P0 | gpt-6.1-sol | medium** : découper chaque lot en tâches committables,
  attribuer le modèle et l'effort de départ, fixer la publication finale,
  puis contrôler le document.

Chaque case numérotée est une tâche et donne lieu à un commit distinct. L'agent
ne coche sa case que dans ce commit, après les contrôles ciblés et la relecture
de son diff. Un seul agent travaille à la fois et ne prend qu'une case.
L'orchestrateur confie la
suivante après le commit précédent et vérifie les dépendances indiquées.
Un changement indivisible qui dépasse une case impose de redécouper la case
avant de coder, sans regrouper plusieurs cases dans un commit.
Chaque case qui modifie le kit inclut dans son commit la montée de version,
le changelog et les pins exigés par `versionSuitLeContenu`. Charger
`publier-paquets` avant cette modification. Ne pousser aucun commit et ne
publier aucune version intermédiaire sur npm. À la clôture, pousser tous les
commits une fois, puis publier seulement les versions finales des paquets
modifiés, dans l'ordre prescrit par cette skill.

Chaque case indique le modèle et l'effort de départ. `gpt-6-luna low` convient
aux ajouts bornés et aux tests dont les attentes sont fixées ;
`gpt-6-luna medium` aux changements locaux avec oracle ;
`gpt-6.1-sol medium` aux transformations qui demandent un arbitrage ;
`gpt-6.1-sol high` aux frontières entre paquets, à la fraîcheur et aux
dépendances. Réattribuer seulement après un
blocage nommé et documenté. Ces profils suivent la documentation officielle
d'[OpenAI sur le choix des modèles](https://developers.openai.com/api/docs/guides/model-selection).

L'orchestrateur transmet seulement la note du sous-lot, ses chemins, les
lectures rendues par `npm run agents:lire -- <chemins>`, ses prédécesseurs et sa
preuve de sortie. L'agent commence par `git status --short`, charge les skills
requises, puis rend son diff, ses contrôles et les limites restantes. La case
et son code sont committés ensemble, par chemins explicites. Une mesure Figma
indisponible reste non cochée et n'arrête pas les travaux locaux indépendants.

Les preuves consignées ci-dessous décrivent l'arbre de travail actuel : les
lots 0 à 2 contiennent des changements non committés. Aucune nouvelle case
n'est cochée sur la seule base de ces preuves. Leur découpage en commits doit
préserver les modifications du mainteneur et laisser chaque commit vérifiable.
Pour ces cases, isoler et contrôler le travail présent avant de coder ce qui
manque.

État à préserver : la revue critique contient une modification du mainteneur ;
`PLAN-IMPLEMENTATION.md` a été supprimé par le mainteneur. Ne restaurer ni ne
réécrire ces fichiers pour exécuter cette checklist. Le motif
`docs/notes/Recherches/UCM Architect/**` du registre `.agents/domiciles.json`
couvre déjà ce document. Aucun ajout de registre n'est nécessaire.

## Choix et limites

- Construire une acquisition commune dans le socle, puis des calculs purs
  partagés par Architect et l'exporteur. La publication suit ces calculs.
- Commencer la mémoire entre demandes par une validation conservatrice et une
  invalidation large. Ajouter ensuite les dépendances fines et les contributions.
- Garder les requêtes pures exécutables localement. Worker et incrémentalité
  restent indépendants. Le worker, les signatures et les échanges différentiels
  demandent chacun une preuve de gain net avant activation par défaut.
- Analyser autorise la réutilisation après validation. Actualiser contourne les
  résultats des demandes précédentes et réacquiert les entrées. Les
  mutualisations internes à la demande restent actives.
- Un événement absent ne valide pas une entrée Figma. Relire par défaut toute
  donnée sans couverture démontrée, dont les variables et ressources distantes.
- Une annulation, un arrêt ou une péremption ne promeut aucune référence.
  Une analyse partielle reste affichable ; ses échecs et sa couverture doivent
  être réévalués avant toute réutilisation.
- Conserver budgets, frontières, ordre, identifiants, règles d'agrégation et
  relectures avant écriture. Le format publié ne change pas.
- Garder V9 (`skipInvisibleInstanceChildren`), WebAssembly, plusieurs workers,
  diagrammes de décision et prélecture hors des lots obligatoires. Aucun
  échantillonnage de variants ne remplace l'analyse complète.
- La mesure mainteneur du Button dans Figma porte sur 90 variants et 142 s au
  total. Les 80 s affichées sous « Vérification des règles » couvrent aussi
  `controles`, `corrections` et `projection` (`src/ui/textes/analyse.ts`). Elles
  ne mesurent donc pas `extractRules` seul : `sandbox/analyse.ts` chronomètre
  `lecteurs.regles` comme une attente et `src/regles.ts` appelle `extractRules`.
- Priorité avant toute optimisation : exploiter les traces déjà instrumentées
  sur ce Button pour séparer `controles`, `regles`, `corrections` et `projection`.
  Si `regles` domine, mesurer finement `extractRules` : scan de page, candidats,
  appels `getMainComponentAsync` et assemblage. Compter les opérations et les
  attentes de chaque étape.
- Reporter la prélecture automatique à la sélection, hors lots obligatoires.
  Le travail Figma peut bloquer le thread et la fraîcheur entre sélection et
  clic n'est pas prouvée. Réévaluer après réduction du coût dominant et
  réalisation des lots de fraîcheur et de mémoire. Exiger alors une simulation
  idle, l'annulation sur changement de sélection, des ressources bornées, la
  parité et une mesure A/B dans Figma qui établit l'absence de ralentissement
  des interactions et un gain réel sur le temps total.

## Contrat de parité

Les comparaisons portent sur les objets complets ordonnés : constats, codes,
identifiants, faits, parties, localisations, questions, corrections,
`aRelire`, modèles de règles, ignorés et couverture. Ne retirer que la date
d'export dans la comparaison des contrats publiés. Ne trier ni les constats ni
les listes de modes pour faire passer la comparaison.

| Corpus | Cas obligatoires |
|---|---|
| Parcours | Beaucoup de petits variants, gros premier variant, instance frontière, masqués statiques et dynamiques, racine composée puis non composée, noms d'icône différents |
| Lecture | Texte mixte, plages adjacentes, surcharge d'instance, Display P3, champ illisible, variable ou style refusé puis disponible, `lecture.manquees` localisé |
| Budget | Premier variant dépassant le budget, coupure avant le dernier variant, nombre non lu inconnu, ajout ou retrait qui déplace le préfixe admis |
| Catalogue | Clés et noms en collision, doublons ordonnés, absence puis premier candidat, valeur non chargée, alias cyclique, profondeur restante, mode ou collection sans mode |
| Diagnostics | Tous les sites du moteur, traduction par défaut C42, émission après `structure`, imbrication bloquante, règles C43/C44/C45, modèle exact de correction |
| Modes | Produit très supérieur à 5 000, ordre des collections et modes, modes effectifs, cardinalité dépassant les entiers exacts, pire cas à égalité |
| Sessions | Mutations successives, plusieurs changements après péremption, événement retardé ou inconnu, page quittée puis retrouvée, correction puis Ctrl+Z/rétablissement, changement pendant calcul annulé |
| Configuration | AA/AAA, library choisie et contenu de library séparés, configuration refusée, déclaration UCM, ignorés, réponses et cases de la nouvelle génération |

Les fixtures sont fabriquées par les tests. Aucun `.contract.json` n'est
commité. Les lois de forme restent dans `packages/plugin-exporter/tests/lois.ts`.
Les preuves de croissance comptent les opérations ; les tests unitaires
n'imposent aucun seuil de durée réelle.

## Ordre des lots obligatoires

La chaîne principale est 0 à 11, puis 15. Les lots 12 à 14 sont des branches
conditionnelles après leurs prérequis. Ils ne bloquent pas la validation sûre
ni le recalcul ciblé. La recette Figma accompagne chaque build disponible ;
l'absence de mesure interdit une conclusion de performance, pas les preuves
locales de parité.

### Lot 0 : référence et banc de comparaison

#### Tâches à committer

- [ ] **0.1 | gpt-6-luna | low** : étendre le comparateur exporteur aux parties, localisations et diagnostics imbriqués, dans leur ordre ; test sensible à une permutation.
- [ ] **0.2 | gpt-6.1-sol | medium** : établir les deux fabriques Architect indépendantes et comparer messages, constats, corrections, modèles et catalogue ; test de divergence volontaire.
- [ ] **0.3 | gpt-6-luna | low** : ajouter les fixtures de texte à plages, surcharge d'instance et lectures manquées ; deux acquisitions fraîches donnent la même sortie.
- [ ] **0.4 | gpt-6-luna | low** : ajouter les fixtures de budget, retrait et ajout de variant ; comparer préfixe admis, couverture et nombre non lu.
- [ ] **0.5 | gpt-6-luna | low** : compter listes locales, lectures par identifiant, descendants et maîtres dans les doubles ; vérifier les compteurs sans seuil temporel.
- [ ] **0.6 | gpt-6.1-sol | medium** : couvrir questions, réponses, ignorés, corrections et échec de ressource suivi d'une réussite ; comparer les sorties complètes.

Prérequis : aucun. Nature : caractérisation à sortie identique.
Chemins : `packages/plugin-architect/tests/analyse.test.ts`,
`releveDuComposant.test.ts`, `identitesEtPage.test.ts`,
`packages/plugin-exporter/tests/aides/parite.ts`, `paritePerformance.test.ts`,
et doubles voisins. Les noms de fichiers sans préfixe reprennent le paquet
du dernier chemin complet.

#### Portée et preuves conservées

- **Acquis localement, non commité** : étendre le banc actuel pour capturer toutes les
  sorties du contrat de parité, notamment `parties`, localisations et modèles
  de règles. Produire deux exécutions indépendantes sur les mêmes doubles ;
  garder la voie actuelle comme oracle pendant la migration.
  Preuves : `aides/parite.ts` compare tout `ComponentExport`, dont les trois
  index de diagnostics dans leur ordre et les imbriqués. Architect dispose de
  `tests/parite.ts` : deux fabriques indépendantes, messages complets, constats
  retenus, corrections, modèles, relevé et catalogue. Seule la génération des
  messages est ramenée à une origine commune ; les identifiants des constats
  restent exacts. `analyse.test.ts` exerce C43, C44 localisé, correction retenue,
  modèle et ignoré. Contrôles : Architect 1 067 tests, exporteur 1 081 tests,
  typecheck des deux paquets ; extraction du helper revérifiée sur les 19 tests
  d'analyse. Aucun écran changé.
- **Acquis localement, non commité** : compléter le corpus avec les cas du tableau qui
  manquent, selon les constructeurs et attentes relus en 0.1 et 0.2.
  Ajouter les compteurs de lectures et de requêtes aux doubles, sans assertion
  sur un gain encore inconnu.
  Avancées ciblées : `releveDuComposant.test.ts` compare deux acquisitions
  fraîches du cas texte à plages et instance surchargée, puis retire et ajoute
  un variant avant une lecture au budget ; `analyse.test.ts` compare deux
  lectures partielles avec manque localisé et deux variants non lus.
  `releveDuComposant.test.ts` refuse aussi un identifiant à la première
  acquisition, puis le relit avec succès dans une seconde acquisition ; les
  doubles comptent les deux appels.
  `figmaDeTest.ts` compte désormais les appels aux listes locales en plus des
  lectures par identifiant. `analyse.test.ts` compare aussi une question C29
  avec deux candidats, puis la réponse et son `aRelire`. `paritePerformance.test.ts`
  compte séparément les recherches de descendants de chaque variant et les
  lectures de maître de chaque instance, avec et sans portée. Contrôle final :
  40 tests ciblés passent. Les compteurs décrivent les appels ; ils ne promettent
  aucun gain de durée.

Cas à raccorder au banc en 0.3 à 0.6, avec les constructeurs
existants :

- `releveDuComposant.test.ts`, `jeuFactice()` : comparer deux relevés frais du
  texte à plages adjacentes et de l'instance surchargée ; reprendre les budgets
  existants de 10 et 1 layers sans dupliquer leurs attentes de forme. Ajouter
  un retrait puis un ajout de variant qui change le préfixe admis.
- `analyse.test.ts`, `lecteurs()` et `tests/parite.ts` : passer une lecture
  partielle avec `manquees` localisé et deux variants non lus ; comparer aussi
  un cas avec question et candidats, d'après les fixtures de corrections
  existantes, puis sa correction et son `aRelire` après réponse.
- `figmaDeTest.ts`, `portDeTest()` compte déjà les appels par identifiant et
  les imports ; compléter seulement les lectures locales et les propriétés
  effectivement absentes de ses compteurs. Ajouter le refus puis la réussite
  du même identifiant entre deux acquisitions indépendantes.
- `paritePerformance.test.ts`, `monterLeSet()` : réutiliser les variants et les
  instances existants pour compter les lectures supplémentaires ; le compteur
  des maîtres est déjà présent. Les comparaisons d'export avec et sans portée
  couvrent désormais aussi les parties et localisations de tout le corpus.

Couverture existante à conserver : `constatsDuMoteur.test.ts` exerce la table
et le repli C42 ; `regles.test.ts` exerce C43/C45 et le modèle exact ;
`analyse.test.ts` exerce AA/AAA, le refus de configuration, les ignorés et les
fins. Les combinaisons au-delà des entiers exacts attendent la décision du lot 4.

Sortie : chaque comparaison échoue si l'on retire une localisation, permute
deux modes ou altère une correction. Contrôle : tests Architect et exporteur.
Ne pas construire un deuxième oracle qui appelle déjà le nouveau calcul.

### Lot 1 : mesures du clic au rendu et progression

#### Tâches à committer

- [ ] **1.1 | gpt-6.1-sol | medium** : ouvrir la trace avant la résolution du sujet et la fermer sur chaque fin ; horloge injectée et test d'annulation.
- [ ] **1.2 | gpt-6.1-sol | medium** : séparer dans la trace sujet, relevé, catalogue, moteur, règles, contrôles, corrections et projection ; vérifier les étapes imbriquées.
- [ ] **1.3 | gpt-6-luna | low** : compter appels API, attentes, cessions, tranches synchrones et taille de sortie dans les ports instrumentés ; test avec horloge simulée.
- [ ] **1.4 | gpt-6.1-sol | medium** : corréler clic, réception, premier affichage, premiers constats et final par identité de demande ; ignorer les acquittements tardifs.
- [ ] **1.5 | gpt-6.1-sol | medium** : transmettre phase, compte et progression monotone ; publier une phase nouvelle au même pourcentage et réserver 100 % au final.
- [ ] **1.6 | gpt-6-luna | low** : brancher les textes de progression prévus par la maquette, puis couvrir les phases par tests sans navigateur.
- [ ] **1.7 | gpt-6-luna | low** : créer les états de galerie avec compte, sans compte, annulé et périmé ; vérifier les écrans indiqués par la galerie.
- [ ] **1.8 | gpt-6.1-sol | medium** : relier les traces au banc de mesure Architect et documenter leur activation dans le README existant ; comparer mesure active et inactive.

Prérequis : 0. Nature : instrumentation et écran nouveau.
Chemins : `packages/plugin-socle/src/composant/contract/mesure.ts`,
`packages/plugin-architect/src/sandbox/analyse.ts`, `messages/analyse.ts`,
`ui/composant/analyse.ts`, `ui/analyse/`, `ui/textes/`, `ui/styles/`,
`galerie/etats/`, `scripts/mesurer.mjs`, et tests voisins.

#### Portée et preuves conservées

- **Acquis localement, non commité** : ouvrir une mesure d'Architect avant la résolution
  du sujet, sans réinitialisation par les étapes du moteur. Séparer sujet,
  relevé, catalogue, moteur, règles, contrôles, corrections et projection.
  Compter propriétés/API, attentes, vraies cessions, tranches synchrones et
  taille des sorties. Instrumenter les cessions actuelles avant de les changer.
  Clore aussi les mesures annulées, arrêtées et périmées sans fuite de portée.
- **Acquis localement, non commité** : corréler clic, réception et rendu par identifiant
  de demande puis identité d'analyse. Les durées de chaque contexte utilisent
  sa propre horloge ; les acquittements permettent les mesures aller-retour.
  Distinguer premier affichage, premiers constats et résultat final. La mesure
  reste facultative et ne change aucun constat.
- **Acquis localement, non commité** : transmettre phase, compte et progression monotone.
  Publier tout changement de phase même au même pourcentage, puis toute fin.
  Réserver 100 % au résultat final ; omettre le temps restant sans estimation
  établie. Reprendre les annonces du moteur et les textes de la maquette :
  « Lecture des variants : n sur N », « Lecture de la library »,
  « Lecture des composants imbriqués », « Lecture de la structure »,
  « Vérification des règles », « Annuler ».
- **Acquis localement, non commité** : ajouter les états de galerie de la progression,
  sans attente, avec compte, après annulation et après péremption. Charger
  `rediger-diagnostics-ucm` avant toute écriture des catalogues. Soumettre les
  textes manquants à l'orchestrateur avant clôture du lot.

Les textes reprennent ceux de la maquette ; aucun texte manquant n'est proposé.

Preuves : `analyse.test.ts` compare les sorties avec et sans mesure, vérifie
le temps du sujet à horloge simulée, la conservation des étapes du moteur,
les fins annulée, arrêtée et périmée et la fermeture de la trace.
`identitesEtPage.test.ts` refuse une demande remplacée, une génération
ancienne et un progrès tardif ; les acquittements utilisent une horloge
locale injectée et ignorent un rendu remplacé. Le test de progression couvre
le compte, les phases à fraction égale, la monotonie et le final à 100 %.
`mesure.test.ts` sépare appel API, attente, cession et appel synchrone ; une
réponse tardive ne compte jamais dans la trace suivante. Les phases agrégées
d'Architect sont distinctes des étapes internes du moteur. Les états de
galerie couvrent la lecture avec compte, la library sans compte, la structure,
les règles, l'annulation et la péremption.

Bornes des mesures : les accès explicites aux champs du relevé et les ports
variables, nœuds et styles sont comptés, en plus des compteurs du moteur ;
ce n'est pas un décompte exhaustif de toute l'API Figma. Les attentes
imbriquées se cumulent et ne représentent pas le temps mural. Les tranches
synchrones mesurées sont les appels de contrôles, corrections et projection
du pilote. La taille de sortie est la longueur du JSON en unités UTF-16.
Deux frames donnent une occasion de peinture, sans mesure du compositeur.
Les cessions instrumentées sont celles du relevé et du moteur ; aucune pause
n'est ajoutée. `README.md` décrit l'activation facultative et `--traces`.
Contrôle ciblé : 81 tests passent, dont les lois d'écriture et la lecture des
variables. `npm run build:plugin -- architect` produit le plugin livrable.
La recette Figma et la relecture du rendu
Chromium restent à faire par le mainteneur ; aucun `test:ui` n'est lancé.

Sortie : phases et fins non retenues par le filtrage ; messages d'une ancienne
demande ignorés ; traces comparables avec mesure activée et désactivée.
Contrôle ciblé : tests Architect, mesure exporteur. **Build livrable :
`npm run build:plugin -- architect`.** Le mainteneur peut relever la référence
Figma dès ce point ; les lots suivants continuent sans attendre ses mesures.

### Lot 2 : coopération et annulation dans les boucles

#### Tâches à committer

- [ ] **2.1 | gpt-6.1-sol | medium** : injecter horloge, pause, budget et jeton dans un contexte commun ; relire le jeton après pause et tester la fermeture de portée.
- [ ] **2.2 | gpt-6.1-sol | medium** : transmettre ce contexte au relevé, au moteur et au pilote sans seconde portée globale ; comparer les sorties avec cessions imposées.
- [ ] **2.3 | gpt-6-luna | medium** : rendre interruptibles le parcours des enfants et le budget des variants ; tester une chaîne profonde et 90 variants.
- [ ] **2.4 | gpt-6-luna | medium** : céder dans les lectures de layers, liaisons, surcharges, plages et modes ; tester arrêt avant leur fin et parité du relevé.
- [ ] **2.5 | gpt-6.1-sol | medium** : partager une itération synchrone et coopérative pour accessibilité et typographie ; comparer constats ordonnés et annulation interne.
- [ ] **2.6 | gpt-6.1-sol | medium** : rendre l'indexation et l'enrichissement des corrections interruptibles ; tester C25/C29 et une annulation avant publication.
- [ ] **2.7 | gpt-6.1-sol | medium** : céder dans la matérialisation des modes et le comptage du budget ; conserver produit, ordre et limites.
- [ ] **2.8 | gpt-6-luna | medium** : découper les contrôles de cible, texte minimal et anneau ; comparer leurs constats et couper pendant C52.
- [ ] **2.9 | gpt-6-luna | medium** : découper Oublis et son produit plafonné ; comparer C31 à C33 puis annuler dans la construction.
- [ ] **2.10 | gpt-6-luna | medium** : découper Couches entre variants, calques et liaisons ; comparer C80/C20 et annuler dans 128 liaisons.
- [ ] **2.11 | gpt-6-luna | medium** : découper Mapping entre liaisons, modes et fratrie ; comparer les sorties et annuler dans 256 modes.
- [ ] **2.12 | gpt-6-luna | medium** : découper Nommage et partager ses lectures d'axes et de tokens ; comparer l'ordre des candidats et annuler dans 256 tokens.
- [ ] **2.13 | gpt-6-luna | medium** : découper Thème C59 dans l'index, les liaisons, les candidats et les fonds ; tester 256 ancêtres.
- [ ] **2.14 | gpt-6-luna | medium** : découper les deux branches Structure d'Architect ; comparer questions, corrections et lecture partielle.
- [ ] **2.15 | gpt-6-luna | medium** : borner chaque avancée C29 sur 2 000 tokens FLOAT ; garder l'empreinte des 90 variants.
- [ ] **2.16 | gpt-6-luna | medium** : borner chaque avancée C25 sur 2 000 couleurs et liaisons ; construire son cache une seule fois pour deux calques.
- [ ] **2.17 | gpt-6.1-sol | medium** : découper la découverte des collections ; prouver l'annulation pendant cette découverte.
- [ ] **2.18 | gpt-6.1-sol | medium** : découper la construction des cibles ; prouver l'annulation avant le moteur.
- [ ] **2.19 | gpt-6.1-sol | medium** : auditer les dernières passes indivisibles du relevé et découper celles qui dépassent le budget simulé.
- [ ] **2.20 | gpt-6.1-sol | medium** : auditer les dernières passes du moteur et des helpers d'oublis ; découper celles qui dépassent le budget simulé.
- [ ] **2.21 | gpt-6-luna | low** : comparer les budgets 16, 25 et 50 ms sur le même corpus dans le banc existant ; garder sorties et nombres de cessions.

Prérequis : 1. Nature : correction du défaut de cession.
Chemins : `packages/plugin-architect/src/releveDuComposant.ts`,
`sandbox/analyse.ts`, `packages/plugin-socle/src/composant/contract/porteeDAnalyse.ts`,
`exportComponent.ts`, `budget.ts`, et boucles internes identifiées par la trace.

#### Portée et preuves conservées

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
  d'oublis et plusieurs passes du moteur et du relevé
  restent indivisibles : les cases 2.17 à 2.20 restent ouvertes. La version
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
  Le test racine `versionSuitLeContenu` reste rouge jusqu'à la montée du kit.

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

### Lot 3 : premiers constats et protocole de fin

#### Tâches à committer

- [ ] **3.1 | gpt-6.1-sol | medium** : définir un message provisoire distinct de partielle ; tester génération, double envoi et rejet d'un message tardif.
- [ ] **3.2 | gpt-6.1-sol | high** : ordonner contrôles du kit, lecture des ignorés, provisoire puis moteur ; vérifier l'ordre final et la même sortie sans provisoire.
- [ ] **3.3 | gpt-6.1-sol | medium** : interdire côté sandbox corrections, réponses, Ignorer et préparation applicable tant que le résultat est provisoire ; test d'écriture forgée.
- [ ] **3.4 | gpt-6.1-sol | medium** : appliquer le même verrou dans l'interface et conserver identifiants, défilement et sections ouvertes au passage au final.
- [ ] **3.5 | gpt-6-luna | low** : afficher la mention de la maquette et masquer les sections tenues pendant le provisoire ; état de galerie dédié.
- [ ] **3.6 | gpt-6-luna | medium** : retirer le provisoire après Annuler ; tester le rejet de tout final tardif.
- [ ] **3.7 | gpt-6-luna | medium** : retirer le provisoire après arrêt du moteur ; tester l'état arrêté et ses actions interdites.
- [ ] **3.8 | gpt-6-luna | medium** : publier les sorties finales partielles après lecture incomplète terminée ; tester couverture et corrections.
- [ ] **3.9 | gpt-6-luna | medium** : conserver les constats consultables après péremption ; refuser un final tardif de même identité.
- [ ] **3.10 | gpt-6-luna | low** : ajouter les états de galerie des quatre fins et lancer le build Architect pour la vérification du mainteneur.

Prérequis : 2. Nature : protocole et écran nouveau.
Chemins : `packages/plugin-architect/src/sandbox/analyse.ts`,
`sandbox/corrections.ts`, `sandbox/questions.ts`, `sandbox/ignores.ts`,
`messages/analyse.ts`, `ui/composant/analyse.ts`, `ui/analyse/`,
`ui/panneau/`, `ui/application.ts`, `galerie/etats/`, tests associés.

#### Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : séparer publication provisoire et rétention des
  corrections finales. Exécuter les contrôles du kit avant le moteur, lire les
  ignorés avant le premier envoi et conserver l'ordre final de référence.
  Le provisoire porte une marque de protocole distincte de `partielle`.
  Sandbox et interface refusent correction, réponse, Ignorer, propagation et
  préparation applicable tant que la finalisation manque.
- **Portée initiale répartie dans les cases ci-dessus** : garder les identifiants, le défilement et les
  sections ouvertes entre provisoire et final. Afficher la mention de la
  maquette : « L'analyse des composants imbriqués est en cours. D'autres points
  peuvent s'ajouter. » Ne montrer aucune section tenue avant la fin.
  Après Annuler, retirer le provisoire et afficher l'état annulé existant.
  Après arrêt du moteur, retirer le provisoire et afficher l'état arrêté.
  Après lecture incomplète terminée, publier les sorties finales `partielle`.
  Après péremption, garder les constats consultables sous l'état périmé ;
  aucun final tardif de même identité ne les rend applicables.
- **Portée initiale répartie dans les cases ci-dessus** : ajouter les états de galerie de chacune de ces
  fins et des tests de protocole sans navigateur. Les tests couvrent aussi
  nouvelle génération, double envoi et demande d'écriture forgée pendant calcul.

Sortie : chaque fin du provisoire a son test ; seule une finalisation valide
retient les corrections. Contrôle : Architect. **Build Architect.** Le rendu
dans Chromium reste vérifié par le mainteneur ; aucun agent ne lance `test:ui`.

### Lot 4 : supprimer les coûts algorithmiques du kit

#### Tâches à committer

- [ ] **4.1 | gpt-6.1-sol | medium** : indexer les variables du catalogue par clé puis nom, avec priorité et doublons inchangés ; test de collisions.
- [ ] **4.2 | gpt-6.1-sol | medium** : indexer collections et segments une seule fois par contenu immuable ; vérifier ordre et coût en opérations.
- [ ] **4.3 | gpt-6.1-sol | medium** : remplacer les recherches typographiques par fréquences de groupe et champ hors contribution courante ; test absence, null et exclusions.
- [ ] **4.4 | gpt-6.1-sol | medium** : produire seulement le préfixe de 5 000 combinaisons de modes, dans l'ordre global ; test de croissance en espace.
- [ ] **4.5 | gpt-6.1-sol | high** : établir la cardinalité au-delà des entiers exacts et sa représentation ; isoler toute correction visible avec test rouge.
- [ ] **4.6 | gpt-6.1-sol | medium** : mémoriser la résolution d'alias par variable, contexte et profondeur restante ; comparer cycles, refus et diagnostics.
- [ ] **4.7 | gpt-6.1-sol | medium** : mutualiser les faits de fond et visibilité dont les modes, ancêtres et opacités sont explicites ; tester deux contextes différents.
- [ ] **4.8 | gpt-6-luna | low** : vérifier les versions, changelogs et pins de 4.1 à 4.7 ; corriger un écart isolé et relancer le contrôle de version, sans publication.

Prérequis : 0 et 2. Nature : transformations à sortie identique.
Chemins : `packages/kit/src/controles/catalogue.ts`, `typographie.ts`,
`accessibilite.ts`, leur résolution d'alias et tests voisins.
Chaque commit qui touche le kit porte sa propre montée de version.

#### Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : construire les index du catalogue une fois par
  contenu immuable. Respecter la priorité clé puis nom des variables et la
  première occurrence clé-ou-nom des collections. Préserver doublons, ordre et
  portée de recherche. Découper les segments une fois sans modifier les types
  publiés du catalogue ni conserver un index sur des tableaux modifiés.
- **Portée initiale répartie dans les cases ci-dessus** : remplacer les recherches d'autres sources par des
  fréquences par groupe et champ, contribution courante retirée. Garder
  `AUTRES_MINIMUM`, exclusions, identité des sources et distinction entre
  absence, `null` et valeur. Réutiliser le même calcul pour la future mise à jour
  par contribution.
- **Portée initiale répartie dans les cases ci-dessus** : produire paresseusement le préfixe des combinaisons
  de modes ; conserver la borne globale de 5 000 et son ordre entre variants.
  Calculer le reste sans produit cartésien matérialisé. Établir une cardinalité
  exacte au-delà de `Number.MAX_SAFE_INTEGER` et sa représentation de sortie
  avant modification ; préserver la sortie actuelle sur tout compte exact.
  Si un nouveau comportement visible est nécessaire au-delà, l'isoler comme
  correction documentée avec un test rouge, sans arrondi prétendu exact.
- **Portée initiale répartie dans les cases ci-dessus** : partager les résolutions par variable, contexte
  pertinent et profondeur restante. Garder cycles, refus et ordre de diagnostic.
  Mutualiser les faits de fond/visibilité dans l'accessibilité, en incluant
  modes, ancêtres et opacités dans le contexte. Différer une mutualisation dont
  les entrées ne sont pas encore explicitables.
- **Portée initiale répartie dans les cases ci-dessus** : après relecture des transformations, charger
  `publier-paquets` et appliquer la montée minimale du kit, son changelog et les
  pins exigés par `versionSuitLeContenu`. Exécuter les contrôles de version.
  La publication npm attend la clôture des lots.

Sortie : égalité profonde avec la référence, tests de croissance du nombre
d'opérations, espace proportionnel au préfixe retenu pour les modes.
Contrôles : kit, tests racine requis par ce paquet, puis Architect/exporteur.
**Build Architect avec kit reconstruit.** Aucun changement de format n'est prévu.

### Lot 5 : mémoires sûres au sein d'une demande

#### Tâches à committer

- [ ] **5.1 | gpt-6-luna | medium** : garder le parcours brut par racine dans la portée ; prouver une seule traversée de racine répétée.
- [ ] **5.2 | gpt-6.1-sol | high** : appliquer après ce parcours les frontières composées et les filtres de visibilité selon chaque contexte ; comparer masqués statiques et dynamiques.
- [ ] **5.3 | gpt-6-luna | medium** : mémoriser les chemins de texte par contexte complet composé et noms d'icônes ; tester deux contextes sur la même racine.
- [ ] **5.4 | gpt-6-luna | medium** : rejouer diagnostics, parties et localisations par destination ; comparer la sortie ordonnée.
- [ ] **5.5 | gpt-6-luna | low** : vérifier fermeture de portée, appel hors portée et portée imbriquée ; garder les attentes du banc inchangées.

Prérequis : 2. Nature : déplacement à sortie identique.
Chemins : `packages/plugin-socle/src/composant/contract/exportableNodes.ts`,
`extractVariantTypography.ts`, `porteeDAnalyse.ts`, `localisation.ts`,
`packages/plugin-exporter/tests/paritePerformance.test.ts`.

#### Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : garder le parcours brut par racine dans la portée
  du moteur ; appliquer séparément les frontières composées et les filtres de
  visibilité. Mémoriser les chemins de texte avec leur contexte complet
  `composed` et `iconNames`, immuable ou comparé par contenu. Rejouer chaque
  diagnostic, ses parties et ses localisations dans chaque destination.
- **Portée initiale répartie dans les cases ci-dessus** : comparer la même racine sous contextes différents,
  dont racine elle-même composée, masqué lié et ensembles d'icônes différents.
  Vérifier nettoyage à la fermeture, refus des portées imbriquées et appels
  hors portée. Les attentes du banc existant restent inchangées.

Sortie : moins de parcours sur fixtures répétitives sans réutilisation entre
demandes. Contrôles : socle/exporteur et Architect. **Build Architect.**

### Lot 6 : faits ordinaires et acquisition commune

#### Tâches à committer

- [ ] **6.1 | gpt-6.1-sol | medium** : inventorier les champs consommés par relevé, moteur, budget et surveillance dans les modules existants ; fixer leurs projections en tests.
- [ ] **6.2 | gpt-6.1-sol | high** : définir les faits ordinaires avec identité, topologie, provenance, champs acquis ou refusés et couverture ; aucun objet Figma dans les types.
- [ ] **6.3 | gpt-6-luna | medium** : centraliser une famille de propriétés de nœuds et ses refus ; comparer les deux lecteurs avant d'en ajouter une autre.
- [ ] **6.4 | gpt-6-luna | medium** : centraliser variables et collections promises ou refusées ; tests de collision, alias et ressource redevenue lisible.
- [ ] **6.5 | gpt-6-luna | medium** : centraliser styles et maîtres avec déduplication par identité ; comparer frontières d'instance et localisations.
- [ ] **6.6 | gpt-6.1-sol | high** : séparer inventaires locaux, règles par page et libraries par demande ; borner à huit requêtes indépendantes en vol.
- [ ] **6.7 | gpt-6-luna | medium** : faire consommer les faits de peinture au relevé et au moteur ; comparer fills, strokes et refus.
- [ ] **6.8 | gpt-6.1-sol | high** : projeter les segments de texte par consommateur et fusionner les plages adjacentes prouvées ; conserver deux lectures si nécessaire.
- [ ] **6.9 | gpt-6.1-sol | medium** : dériver l'inventaire de péremption de la topologie et écouter les pages autorisées avant lecture longue ; test de couverture inconnue.
- [ ] **6.10 | gpt-6-luna | low** : comparer dans le banc parcours natif indexé et parcours coopératif explicite ; ne fixer aucun gagnant avant Figma.

Prérequis : 4 et 5. Nature : extraction progressive à sortie identique.
Chemins nouveaux proposés : `packages/plugin-socle/src/composant/analyse/faits.ts`,
`acquisition.ts`, `ressources.ts`, `topologie.ts`.
Lecteurs à adapter : `packages/plugin-architect/src/releveDuComposant.ts`,
`lectureDuComposant.ts`, `lecture.ts`, `catalogue.ts`, `sandbox/analyse.ts`,
et `packages/plugin-socle/src/composant/contract/`.

#### Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : définir les faits sans objet Figma : identité,
  parent, ordre, type, frontières, champs acquis ou refusés, couverture et
  provenance. Séparer topologie et valeurs. Énumérer les champs consommés par
  chaque lecteur et diagnostic avant de déplacer leur acquisition. Garder les
  vues distinctes du relevé, du moteur, du budget et de la surveillance.
- **Portée initiale répartie dans les cases ci-dessus** : centraliser les lectures de propriétés et les
  promesses de variables, collections, styles et maîtres, refus compris.
  Garder un inventaire local complet pour collisions et candidats, un inventaire
  de règles par page et un inventaire de libraries par demande. Borner les
  requêtes indépendantes à huit appels en vol au départ ; les compléments
  suivent la découverte de dépendances et le choix de library.
- **Portée initiale répartie dans les cases ci-dessus** : faire consommer les faits communs au relevé et
  aux lecteurs de ressources du moteur, famille de champs par famille.
  Mutualiser fills/strokes et segments de texte. L'union des champs de segments
  exige une projection et fusion de plages adjacentes par consommateur ; garder
  deux lectures si leur équivalence ou leur refus n'est pas prouvé.
- **Portée initiale répartie dans les cases ci-dessus** : faire produire l'inventaire de péremption depuis
  la topologie commune. Comparer parcours natif indexé et parcours explicite
  coopératif dans le banc, sans présumer du plus rapide dans Figma. Écouter les
  pages autorisées avant les lectures longues ; garder toute couverture inconnue
  comme obligation de relecture.

Sortie : relevé profondément identique, compteurs de chaque lecture expliqués,
mêmes budgets et limites. Les projections pures ne rappellent pas Figma.
Contrôles : socle, Architect et exporteur. **Build Architect à chaque famille
intégrée testable.** Mettre à jour les cartes sans créer de document auxiliaire.

### Lot 7 : diagnostics finalisés et publication séparée

#### Tâches à committer

- [ ] **7.1 | gpt-6.1-sol | high** : relever dans la table des sites diagnostics, faits lus, contexte et consommateurs, y compris après structure et compaction.
- [ ] **7.2 | gpt-6.1-sol | medium** : classer les calculs requis par diagnostic, correction, règle ou publication ; vérifier C42 et l'arbre exact encore nécessaire.
- [ ] **7.3 | gpt-6.1-sol | high** : extraire une première famille de requêtes pures et déclarer ses dépendances ; comparer tous ses diagnostics ordonnés.
- [ ] **7.4 | gpt-6.1-sol | high** : produire le résultat interne finalisé avec parties, localisations, props, états, imbrications, modèles et couverture ; test de parité complet.
- [ ] **7.5 | gpt-6.1-sol | medium** : assembler contrat et échantillons exporteur depuis ce résultat ; comparer hors date avec l'ancien chemin.
- [ ] **7.6 | gpt-6.1-sol | medium** : déplacer compaction et sérialisation après le calcul commun ; garder diagnostics tardifs et contrat ordonné.
- [ ] **7.7 | gpt-6.1-sol | high** : brancher Architect sur surface et règles sans JSON.parse du contrat ; comparer corrections, questions et modèles.
- [ ] **7.8 | gpt-6-luna | low** : retirer l'ancien chemin de production après parité ; garder le comparateur et exécuter les builds Architect et exporteur.

Prérequis : 6. Nature : extraction à sortie identique.
Chemins : `packages/plugin-socle/src/composant/contract/exportComponent.ts`,
`extractStructure.ts`, extracteurs appelés, `extractRules.ts`, `imbriques.ts`,
`template/modele.ts`, nouveaux modules de `composant/analyse/`,
`packages/plugin-architect/src/constatsDuMoteur.ts`, `regles.ts`, `sandbox/analyse.ts`.

#### Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : établir dans cette checklist la table des sites
  d'émission : diagnostics, faits, contexte et consommateurs. Inclure les sites
  après `structure`, après compaction et la traduction C42 par défaut.
  Classer chaque calcul comme requis par un diagnostic, une correction, les
  règles ou la seule publication ; ne pas retirer d'arbre exact encore requis.
- **Portée initiale répartie dans les cases ci-dessus** : extraire des requêtes pures à dépendances explicites
  et un résultat interne contenant diagnostics finalisés, parties/localisations,
  `props`, `stateModel`, imbrications, modèles, couverture et dépendances lues.
  Leur résultat reste indépendant de la génération de l'interface. Des appels
  explicites suffisent ; aucun ordonnanceur général n'est requis ici.
- **Portée initiale répartie dans les cases ci-dessus** : faire assembler à l'exporteur son contrat, ses
  échantillons, sa compaction et sa sérialisation après le même calcul.
  Faire consommer directement la surface et les règles à Architect ; retirer
  son `JSON.parse(content)` sans fabriquer de faux `ComponentExport`.
  Garder l'ancien chemin dans le banc jusqu'à parité de tous les extracteurs.

Sortie : Architect évite les sorties sans consommateur et conserve les
diagnostics tardifs ; l'exporteur produit le même contrat hors date.
Contrôles : socle/exporteur/Architect. **Build Architect et exporteur.**

### Lot 8 : couverture des dépendances et Actualiser

#### Tâches à committer

- [ ] **8.1 | gpt-6.1-sol | high** : établir la matrice de couverture des événements pour nœuds, héritage et pages ; tests de portée inconnue.
- [ ] **8.2 | gpt-6.1-sol | medium** : établir les relectures obligatoires de variables, collections, styles, maîtres, règles et libraries ; test de ressource externe modifiée.
- [ ] **8.3 | gpt-6.1-sol | medium** : vérifier la documentation Figma puis brancher seulement les événements dont la couverture est établie, dont stylechange si pertinent.
- [ ] **8.4 | gpt-6.1-sol | high** : accumuler les changements après la première péremption et hors analyse active ; tests d'événement retardé et de série de mutations.
- [ ] **8.5 | gpt-6-luna | medium** : conserver anciens parents et topologie des suppressions ; élargir l'invalidation si parent ou événement manque.
- [ ] **8.6 | gpt-6-luna | medium** : interrompre la couverture quand la page est quittée ou la file déborde ; test de retour sur page.
- [ ] **8.7 | gpt-6-luna | medium** : porter Analyser et Actualiser jusqu'au sandbox ; test qu'Actualiser contourne les résultats précédents.
- [ ] **8.8 | gpt-6.1-sol | high** : invalider après changement de configuration et écriture, distinguer imports et changements externes ; tests Ctrl+Z et refus.
- [ ] **8.9 | gpt-6.1-sol | medium** : rendre inapplicable une génération modifiée pendant lecture ou calcul ; tester avant réception de l'événement.

Prérequis : 7. Nature : correction de fraîcheur, sans mémoire activée.
Chemins : `packages/plugin-architect/src/code.ts`, `sandbox/contexte.ts`,
`sandbox/analyse.ts`, `sandbox/configuration.ts`, `messages/analyse.ts`,
`ui/application.ts`, nouvelles fonctions de suivi dans `composant/analyse/`.

#### Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : définir et tester la matrice événement/couverture/
  relecture pour nœuds directs, valeurs héritées, variables, collections,
  styles, maîtres, règles de page, inventaires et library. Vérifier la
  documentation officielle Figma avant toute nouvelle utilisation d'événement.
  Ajouter `stylechange` seulement pour sa couverture établie. Ne pas charger
  toutes les pages. Toute entrée sans suivi démontré est relue par demande.
- **Portée initiale répartie dans les cases ci-dessus** : conserver changements, anciens parents et périodes
  de surveillance indépendamment de la notification unique `perime`.
  Accumuler après la première péremption et sans analyse active. Une suppression
  utilise l'ancienne topologie ; événement inconnu, parent absent ou file trop
  grande élargit l'invalidation. Quitter une page interrompt sa couverture.
- **Portée initiale répartie dans les cases ci-dessus** : porter l'intention Analyser/Actualiser jusqu'au
  sandbox. Invalider les dépendances après changement effectif de configuration,
  écriture, annulation ou rétablissement, sans relance automatique. Distinguer
  imports autorisés et changements externes concomitants. Un changement pendant
  lecture ou calcul rend la génération inapplicable.

Sortie : la matrice dispose de tests de retards, inconnus, sources externes,
configuration refusée et changement avant réception de son événement.
Une cession avant finalisation traite les événements reçus sans revendiquer
de barrière atomique. Contrôle : Architect/socle. **Build Architect.**

### Lot 9 : réutilisation avec invalidation large et rétention bornée

#### Tâches à committer

- [ ] **9.1 | gpt-6.1-sol | high** : séparer faits et requêtes retenus de l'état affiché ; test que réponses et cases ne reviennent pas d'une génération antérieure.
- [ ] **9.2 | gpt-6.1-sol | high** : préparer une révision de travail et promouvoir seulement après lecture, calcul et identité valides ; tests de fins annulée, arrêtée et périmée.
- [ ] **9.3 | gpt-6.1-sol | medium** : retenir les invalidations et retenter les lectures refusées ou partielles ; test échec puis disponibilité.
- [ ] **9.4 | gpt-6.1-sol | high** : valider ressources et ensembles avant réutilisation d'un sujet ; test de modification sans notification couvrante.
- [ ] **9.5 | gpt-6.1-sol | medium** : appliquer d'abord l'invalidation du sujet entier ; parité avec reconstruction après mutation locale et globale.
- [ ] **9.6 | gpt-6.1-sol | medium** : réutiliser seulement les requêtes pures dont les entrées revalidées sont égales ; compter celles qui ne rejouent pas.
- [ ] **9.7 | gpt-6.1-sol | medium** : reconstruire sur Actualiser et conserver après changement de library les seules requêtes indépendantes validées.
- [ ] **9.8 | gpt-6.1-sol | medium** : borner sujets, octets et arêtes ; protéger l'actif, évincer le moins récent et nettoyer les orphelins.
- [ ] **9.9 | gpt-6-luna | low** : tester actif trop gros, fermeture de session, perte de suivi et absence de persistance clientStorage ; mesurer les maxima.

Prérequis : 8. Nature : mémoire validée entre demandes.
Chemins nouveaux proposés : `packages/plugin-socle/src/composant/analyse/session.ts`,
`revisions.ts`, `retention.ts`, et intégration `sandbox/analyse.ts`.

#### Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : séparer faits, requêtes et contributions de l'état
  affiché. Préparer une révision de travail ; promouvoir seulement après
  lecture, calcul et contrôle de l'identité. Conserver les invalidations
  après annulation, arrêt, péremption ou lecture partielle. Retenter les refus.
  Réutiliser un sujet seulement après validation de ses ressources et ensembles.
- **Portée initiale répartie dans les cases ci-dessus** : invalider d'abord le sujet entier pour tout
  changement pertinent. Réutiliser les requêtes pures si toutes les entrées
  revalidées sont identiques. Actualiser emprunte la reconstruction sans
  résultats antérieurs. Changement de library conserve seulement les requêtes
  indépendantes de son catalogue et dont les autres entrées sont validées.
- **Portée initiale répartie dans les cases ci-dessus** : borner sujets, octets estimés et arêtes par
  configuration interne testable ; mesurer leurs maxima. Protéger le sujet
  actif, évincer les moins récents, retirer ressources et arêtes orphelines.
  Un actif trop gros reste analysé entièrement sans rétention. Fermer la
  session retire écoutes et données ; aucune persistance `clientStorage`.

Sortie : deuxième analyse identique sans requête pure répétée après validation,
et parité avec Actualiser après tous les changements du corpus.
Éviction et perte de suivi reviennent au chemin complet. Contrôle : Architect
et socle. **Build Architect.** La rétention inclut les copies temporaires.

### Lot 10 : graphe de requêtes et recalcul ciblé

#### Tâches à committer

- [ ] **10.1 | gpt-6.1-sol | high** : définir clé de requête, session du document, version d'algorithme et révisions ; exclure la génération d'interface.
- [ ] **10.2 | gpt-6.1-sol | high** : enregistrer les dépendances réellement lues et remplacer les arêtes conditionnelles au recalcul ; test de branche changée.
- [ ] **10.3 | gpt-6-luna | medium** : suivre ensembles ordonnés, recherches vides et priorités ; tester le premier candidat apparu après absence.
- [ ] **10.4 | gpt-6.1-sol | high** : ajouter les arêtes inverses et valider à la demande ; égalité exacte arrête la propagation sans perdre diagnostics ni limites.
- [ ] **10.5 | gpt-6.1-sol | medium** : séparer rapport numérique, verdict AA/AAA et présentation des noms ; tester un changement de seuil seul.
- [ ] **10.6 | gpt-6.1-sol | high** : invalider par propriété, fonds, descendants et groupe typographique ; compter requêtes et arêtes visitées.
- [ ] **10.7 | gpt-6.1-sol | high** : traiter frontières, ordre, budget et couverture de modes ; repli large si portée inconnue ou coût fin supérieur à la reconstruction.
- [ ] **10.8 | gpt-6.1-sol | medium** : comparer après chaque ajout, suppression, déplacement, renommage, alias et mode à la reconstruction complète.
- [ ] **10.9 | gpt-6-luna | low** : ajouter les compteurs de propagation arrêtée, requêtes rejouées et arêtes visitées au banc de mutations.

Prérequis : 9. Nature : incrémentalité du calcul pur.
Chemins nouveaux proposés : `packages/plugin-socle/src/composant/analyse/requetes.ts`,
`dependances.ts`, et requêtes extraites au lot 7.

#### Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : donner aux requêtes une clé complète, une révision
  de dernière vérification et de dernier changement, et des dépendances lues
  pendant le calcul. Exclure la génération de la clé ; inclure session du
  document et version de l'algorithme. Remplacer les arêtes conditionnelles au
  recalcul. Suivre aussi ensembles ordonnés, recherches vides et priorités.
- **Portée initiale répartie dans les cases ci-dessus** : ajouter les dépendances inverses et la validation à
  la demande. Une sortie exactement égale conserve sa révision de changement et
  arrête la propagation. L'égalité inclut diagnostics et limites. Séparer
  rapport numérique, verdict AA/AAA et présentation des noms.
- **Portée initiale répartie dans les cases ci-dessus** : invalider par propriété et groupe depuis les faits
  modifiés. Inclure fonds et descendants, groupes typographiques, frontières,
  ordre, budget et couverture de modes. Revenir à l'invalidation large si la
  portée manque ou si le coût fin dépasse la reconstruction mesurée.
- **Portée initiale répartie dans les cases ci-dessus** : jouer des séquences de mutations déterministes
  et comparer après chaque mutation à la reconstruction complète sur les mêmes
  faits. Affirmer aussi le nombre de requêtes rejouées, d'arêtes visitées et de
  propagations arrêtées. L'insertion du premier candidat après absence doit
  invalider la réponse négative.

Sortie : mêmes sorties après ajout, suppression, déplacement, renommage,
changement d'alias ou de mode. Une modification locale épargne les requêtes
indépendantes ; une modification globale peut tout recalculer.
Contrôle : socle/Architect et exporteur si requêtes partagées. **Build Architect.**

### Lot 11 : contributions et agrégats maintenus

#### Tâches à committer

- [ ] **11.1 | gpt-6.1-sol | high** : conserver la provenance des contributions typographiques et remplacer les fréquences des anciens et nouveaux groupes.
- [ ] **11.2 | gpt-6-luna | medium** : reconstruire les membres affectés au franchissement d'un seuil ; comparer au calcul complet.
- [ ] **11.3 | gpt-6.1-sol | high** : remplacer rapports et limites de contraste affectés ; après suppression du pire cas, retrouver le suivant avec le même départage.
- [ ] **11.4 | gpt-6.1-sol | high** : recalculer la couverture globale après ajout, retrait ou déplacement de variant et mode ; réaffecter le préfixe des 5 000.
- [ ] **11.5 | gpt-6-luna | medium** : réaffecter le préfixe du budget de calques et préserver un constat encore porté par une autre occurrence.
- [ ] **11.6 | gpt-6.1-sol | medium** : reconstruire localisations, questions et corrections exactes à partir des contributions retenues ; test de retrait.
- [ ] **11.7 | gpt-6.1-sol | medium** : assembler dans l'ordre final, relire les ignorés et rattacher les corrections à la nouvelle identité.
- [ ] **11.8 | gpt-6-luna | low** : compter groupes reconstruits et durée d'assemblage dans la trace ; tester les compteurs sur une mutation.

Prérequis : 10. Nature : incrémentalité des groupes et de la restitution.
Chemins : modules de requêtes, contrôles typographie/accessibilité du kit si
nécessaire, projection d'Architect et tests de mutations.

#### Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : conserver la provenance des contributions.
  Remplacer les fréquences d'une source dans ses ancien et nouveau groupes,
  reconstruire les membres concernés après franchissement d'un seuil.
  Remplacer rapports et limites affectés ; supprimer le pire contraste doit
  retrouver le suivant avec le départage de référence. Reconstruire un groupe
  lorsqu'une maintenance fine ne réduit pas son coût.
- **Portée initiale répartie dans les cases ci-dessus** : recalculer le plan global de couverture après ajout,
  retrait ou ordre de variant/mode. Réaffecter le préfixe des 5 000 combinaisons
  et celui du budget de calques avant de réutiliser des contributions.
  Un constat encore produit par une occurrence reste présent après retrait
  d'une autre. Reconstruire localisations, questions et corrections exactes.
- **Portée initiale répartie dans les cases ci-dessus** : assembler le résultat final dans l'ordre de
  référence et rattacher toutes les corrections à la nouvelle identité.
  Relire les ignorés avant projection. Ne restaurer implicitement ni réponses
  ni cases cochées d'une ancienne analyse. Réutiliser les mêmes fonctions pour
  la reconstruction complète et la maintenance.

Sortie : parité après retrait du pire cas, changement de groupe et déplacement
des deux bornes. La trace compte groupes reconstruits et assemblage final.
Chaque commit touchant le kit porte sa montée de version. Contrôles des paquets
touchés. **Build Architect.**

## Branches conditionnelles

Leur implémentation locale peut aller jusqu'au candidat désactivé par défaut.
La décision d'activation exige la recette indiquée. Une branche rejetée ou
non mesurée ne supprime aucune preuve des lots obligatoires.

### Lot 12 : signatures par contrôle et factorisation des modes

#### Tâches à committer

- [ ] **12.1 | gpt-6.1-sol | medium** : sélectionner un contrôle répétitif d'après les compteurs et enregistrer ses entrées exactes dans le banc.
- [ ] **12.2 | gpt-6.1-sol | high** : signer valeurs, liaisons, noms lus, modes, ancêtres, frontières et options ; le hash n'écarte pas la comparaison exacte.
- [ ] **12.3 | gpt-6.1-sol | medium** : partager le résultat relatif et rattacher séparément chaque occurrence ; test de localisations et corrections.
- [ ] **12.4 | gpt-6.1-sol | high** : factoriser les rapports de contraste par collections atteignables et branches d'alias ; reconstruire le préfixe logique admis.
- [ ] **12.5 | gpt-6.1-sol | medium** : tester hash constant, corpus répétitif et corpus distinct ; comparer sorties, mémoire et opérations.
- [ ] **12.6 | gpt-6-luna | low** : préparer le build candidat et les compteurs pour une mesure Figma par le mainteneur ; garder le calcul direct disponible.

Prérequis : 7 ; intégrer ensuite aux révisions du lot 10. Nature : partage
de résultats purs. Chemins : modules de requêtes, accessibilité/typographie,
correspondances d'occurrences et banc de mesures.

#### Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : choisir un contrôle répétitif identifié par les
  compteurs. Définir sa signature avec toutes ses dépendances : valeurs,
  liaisons, noms si lus, modes, ancêtres, frontières et options. Un hash indexe
  des candidats ; l'égalité exacte décide. Garder un résultat relatif partagé
  et un rattachement propre à chaque occurrence réelle.
- **Portée initiale répartie dans les cases ci-dessus** : factoriser les rapports de contraste par collections
  atteignables, y compris par branches possibles d'alias. Reconstruire tous les
  `rapports`, étiquettes, comptes et premier pire cas pour le préfixe logique
  admis. La borne de 5 000 et le coût de matérialisation restent explicites.
- **Portée initiale répartie dans les cases ci-dessus** : prouver la parité avec un hash constant, un corpus
  répétitif et un corpus où tout diffère. Mesurer signatures, réutilisations et
  mémoire ; prévoir calcul direct et borne de rétention.

Activation : gain net supérieur à la dispersion sur Figma, coût maîtrisé sur
corpus distinct. Sans mesure, conserver le chemin direct. **Build Architect
du candidat** pour la recette ; le partage reste désactivable dans le banc.

### Lot 13 : worker unique, transport par lots et repli

#### Tâches à committer

- [ ] **13.1 | gpt-6.1-sol | high** : définir version, identité et numéros de lots du protocole ; seuls des faits ordinaires et tables de ressources traversent le pont.
- [ ] **13.2 | gpt-6-luna | medium** : borner la file à deux lots immuables et exiger un acquittement avant le troisième ; tests de saturation.
- [ ] **13.3 | gpt-6.1-sol | high** : démarrer le worker depuis l'iframe et transmettre les requêtes prêtes pendant l'acquisition ; mesurer son démarrage.
- [ ] **13.4 | gpt-6.1-sol | high** : finaliser les contrôles transversaux après fermeture des données requises ; aucune absence globale depuis un catalogue ouvert.
- [ ] **13.5 | gpt-6-luna | medium** : rejeter retards, doublons et anciennes générations ; assembler dans l'ordre de référence.
- [ ] **13.6 | gpt-6.1-sol | high** : annuler aux points coopératifs ou terminer le worker ; replier sur le même calcul local après échec.
- [ ] **13.7 | gpt-6-luna | low** : tester erreurs, réordonnancement et annulation du protocole sans navigateur ; compter copies et octets des trois contextes.
- [ ] **13.8 | gpt-6.1-sol | medium** : produire le build distribuable avec manifest et ressources du worker ; préparer la recette Figma du mainteneur.

Prérequis : 7 et 2. Nature : exécuteur alternatif des mêmes fonctions pures.
Chemins proposés : `packages/plugin-architect/src/analyse/worker.ts`,
`protocole.ts`, `transport.ts`, pont `src/ui/`, pilote `src/sandbox/`,
scripts de build et manifest réels.

#### Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : définir données ordinaires et tables de ressources
  partagées, version de protocole, identité d'analyse et numéro de lot.
  Le sandbox seul lit Figma et valide l'écriture. Un worker, au plus deux lots
  en attente, acquittement avant un troisième. Les lots publiés sont immuables.
  Un catalogue non clos n'autorise aucun diagnostic d'absence global.
- **Portée initiale répartie dans les cases ci-dessus** : démarrer depuis l'iframe et recouvrir acquisition
  et requêtes prêtes. Finaliser contrôles transversaux après fermeture des
  données requises. Rejeter retard, doublon et ancienne génération. Assembler
  dans l'ordre de référence. Annuler entre unités coopératives ou terminer le
  worker ; repli coopératif sur les mêmes fonctions si démarrage ou calcul échoue.
- **Portée initiale répartie dans les cases ci-dessus** : tester le protocole avec retards, erreurs,
  réordonnancement, files pleines et annulation, sans lancer `test:ui`.
  Compter démarrage, sérialisation, copies sandbox/iframe/worker, octets aller
  et retour, catalogue et intégration. Produire un build distribué testable.

Activation : démarrage réel validé par le mainteneur dans Figma et gain du
trajet complet à froid. Aucun seuil Node ou multiplicateur QuickJS/V8 ne
suffit. L'encodage binaire reste différé tant que copie/allocation ne domine
pas la trace. **Build Architect avec manifest et ressources du worker.**

### Lot 14 : worker conservé et différences versionnées

#### Tâches à committer

- [ ] **14.1 | gpt-6.1-sol | high** : ajouter identité de worker, révisions de base et cible, puis accusé de préparation ; test d'ancienne instance.
- [ ] **14.2 | gpt-6.1-sol | high** : transmettre ajouts, remplacements et suppressions immuables ; promouvoir ou abandonner atomiquement la révision.
- [ ] **14.3 | gpt-6-luna | medium** : resynchroniser après éviction, base absente ou redémarrage ; tests de doublon et de perte de base.
- [ ] **14.4 | gpt-6.1-sol | medium** : comparer calcul local minime et aller-retour worker avec copies comptées ; conserver une seule autorité du graphe.
- [ ] **14.5 | gpt-6.1-sol | high** : si le rendu le justifie, envoyer des différences de constats avec base explicite, repli entier et application atomique.
- [ ] **14.6 | gpt-6-luna | low** : préparer la collecte du temps à froid, du temps de session et de la mémoire cumulée pour la recette Figma.

Prérequis : 11 et worker retenu du lot 13. Nature : transport incrémental.
La maintenance des agrégats du lot 11 reste utilisable sans ce lot.

#### Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : ajouter identité de worker, révisions de base et
  cible, ajouts/remplacements/suppressions, acquittement et promotion/abandon.
  Éviction, base absente ou redémarrage impose resynchronisation. Une ancienne
  instance ne publie rien. Conserver une seule autorité du graphe et compter
  toute copie nécessaire au changement d'exécuteur.
- **Portée initiale répartie dans les cases ci-dessus** : tester perte de base, abandon, doublon, suppression
  et réinitialisation. Comparer calcul local minime et aller-retour du worker.
  N'ajouter des différences de constats vers l'interface que si son transport
  ou rendu domine encore : base explicite, repli entier et application finale
  atomique. Aucun mélange de révisions n'est applicable.

Activation : gain de session mesuré avec coût à froid et mémoire cumulée.
Le résultat final entier reste le premier protocole de restitution.
**Build Architect** pour chaque candidat retenu.

## Lot 15 : clôture locale et recette du mainteneur

#### Tâches à committer

- [ ] **15.1 | gpt-6-luna | low** : exécuter agents:diff et dresser les autorités et chemins à relire ; signaler les liens vers le plan supprimé.
- [ ] **15.2 | gpt-6.1-sol | medium** : mettre à jour la spec Architect pour les comportements modifiés ; relire ses liens et exemples.
- [ ] **15.3 | gpt-6-luna | low** : mettre à jour les invariants et cartes des modules ajoutés selon leur domicile ; vérifier chaque chemin.
- [ ] **15.4 | gpt-6.1-sol | high** : auditer acquisition et couverture des événements ; consigner les écarts avec leur test manquant.
- [ ] **15.5 | gpt-6.1-sol | high** : auditer pureté, promotion, clés, ordre et limites ; consigner les écarts avec leur test manquant.
- [ ] **15.6 | gpt-6.1-sol | medium** : retirer l'ancien chemin de production après parité en gardant voie complète et comparateurs du banc.
- [ ] **15.7 | gpt-6-luna | low** : vérifier que la trace inclut suivi, rétention, copies et rendu ; créer une case distincte pour chaque compteur manquant.
- [ ] **15.8 | gpt-6-luna | low** : lancer une seule vérification complète sur arbre stable et consigner ses résultats ; créer une case distincte pour chaque défaillance à corriger.
- [ ] **15.9 | gpt-6-luna | low** : préparer les builds comparables et commandes de collecte dans le banc.
- [ ] **15.10 | gpt-6-luna | low** : remettre au mainteneur la liste des écrans à vérifier : progression, provisoire, fins, périmé, corrections, questions et Actualiser.
- [ ] **15.11 | gpt-6-luna | low** : vérifier les versions finales, changelogs et pins des paquets modifiés, puis préparer le push unique et les commandes de publication.

Prérequis : 11 et branches retenues. Nature : vérification et documentation.

#### Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : lancer `npm run agents:diff`, rendre la liste des
  autorités concernées et signaler les références au plan supprimé sans modifier
  la revue du mainteneur. Vérifier cartes et registre des modules ajoutés.
  Mettre à jour les documents existants qui décrivent désormais un comportement
  faux, selon leur domicile. Les nouvelles règles d'Architect vont dans sa spec
  et son invariant ; la forme publiée reste dans `FORMAT.md`.
- **Portée initiale répartie dans les cases ci-dessus** : relire acquisition, pureté, promotion, couverture
  des événements, clés de mémoire, ordre et limites. Retirer l'ancien chemin de
  production seulement après parité ; garder une voie complète sans réutilisation
  et les comparateurs du banc. Vérifier que la trace inclut suivi et rétention.
- **Portée initiale répartie dans les cases ci-dessus** : sur l'arbre stable, exécuter une seule fois
  `npm test`, `npm run typecheck`, `npm run build`, puis les contrôles demandés
  par `agents:diff` et non déjà couverts. `npm run vues` seulement si ses
  sources ont changé. Aucun `test:ui` sans demande explicite. Rejouer après
  correction uniquement les contrôles invalidés puis la frontière nécessaire.
- **Portée initiale répartie dans les cases ci-dessus** : préparer les builds Architect comparables et les
  commandes de collecte dans le banc existant, sans nouveau Markdown. Donner
  au mainteneur les écrans à vérifier : progression, provisoire, fins, périmé,
  corrections, questions et Actualiser. L'orchestrateur commite seulement les
  chemins relus de chaque tâche ; les changements initiaux restent préservés.

### Recette Figma, à effectuer par le mainteneur

Ces cases ne sont pas des prérequis aux preuves locales. Leur absence signifie
« performance runtime non validée ». Ne pas les cocher depuis les doubles.
Chaque case de recette est cochée dans un commit qui consigne son résultat ici ;
les traces brutes restent dans le banc existant. Le mainteneur réalise les
gestes Figma ; l'agent analyse ensuite les traces fournies.

- [ ] **R1 | mainteneur | sans modèle** : relever la référence sur le Button avec dix essais exploratoires à froid ; conserver build, poste, version de Figma, fichier, library, ordre des essais et état réseau.
- [ ] **R2 | mainteneur | sans modèle** : relever chaque candidat dans les mêmes conditions, en alternant les builds et en rouvrant le plugin pour chaque essai à froid.
- [ ] **R3 | mainteneur | sans modèle** : refaire au moins 30 essais du candidat retenu pour médiane et 95e percentile ; augmenter la série si les extrêmes restent instables et rapporter séparément les réouvertures complètes de Figma.
- [ ] **R4 | mainteneur | sans modèle** : mesurer ouverture plus analyse, clic au premier affichage, premiers constats et final ; relever le plus long bloc synchrone et la réponse à Annuler.
- [ ] **R5 | mainteneur | sans modèle** : relever attentes API indivisibles, lectures, calculs, copies et mémoire sur les mêmes essais ; comparer aux cibles proposées de 2 s en médiane, 4 s au 95e percentile et 250 ms de réactivité.
- [ ] **R6 | mainteneur | sans modèle** : comparer référence, réutilisation et Actualiser après un deuxième clic identique, une peinture locale et un changement de texte ou de nom.
- [ ] **R7 | mainteneur | sans modèle** : comparer les trois chemins après variable ou alias partagé, règle hors jeu, premier candidat ajouté, variant ou mode près d'une borne.
- [ ] **R8 | mainteneur | sans modèle** : comparer les trois chemins après AA/AAA, changement de library, correction puis Ctrl+Z, retour sur page et ressource redevenue lisible.
- [ ] **R9 | mainteneur | sans modèle** : éprouver éviction et perte de worker, puis une longue série sur un sujet et une alternance dépassant la rétention ; relever suivi entre clics et temps cumulé.
- [ ] **R10 | gpt-6.1-sol | medium** : analyser les traces R1 à R5, séparer acquisition et calcul, puis proposer budgets et bornes de rétention avec leur dispersion.
- [ ] **R11 | gpt-6.1-sol | medium** : analyser R6 à R9 par scénario, comparer aux cibles proposées de 250 ms sans changement et 500 ms après modification locale sur le Button, relectures comprises.
- [ ] **R12 | gpt-6.1-sol | high** : décider l'activation de chaque branche sur son gain net mesuré et la parité ; garder la branche désactivée sans preuve de gain. Ne pas additionner les économies de passes recouvrantes.

La clôture locale demande la parité et les contrôles du lot 15. La validation
de performance demande en plus cette recette avec tous les mécanismes retenus
activés. Une branche sans gain reste désactivée ; une dépendance sans preuve
de fraîcheur reste relue.

Après le dernier commit du plan, y compris les cases de recette réalisées,
pousser l'ensemble des commits en une fois. Publier ensuite les seules
versions finales des paquets modifiés, kit d'abord, puis CLI et adaptateur si
leurs versions ont changé. Attendre chaque workflow et constater chaque
version par `npm view`, selon `publier-paquets`.

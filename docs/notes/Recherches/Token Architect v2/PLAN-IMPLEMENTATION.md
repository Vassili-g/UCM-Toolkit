Formule à respecter pour tous les agents:
"Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better."


# Plan d'implémentation de UCM Token Architect

Ce plan construit UCM Token Architect, décrit dans le
[document préparatoire](./PREPARATION-TOKEN-ARCHITECT.md), la
[grammaire des composants](./GRAMMAIRE-DES-COMPOSANTS.md) et l'
[aperçu de la génération](./APERCU-GENERATION-TOKENS-COMPOSANT.md). Les
numéros C, T et G renvoient aux fonctions du document préparatoire. Deux revues
ont relu le plan ; la section « Revue du plan » dit ce qu'elles ont changé.

Cocher une case quand son commit est fait, avec le hash entre parenthèses. Les
cases se cochent dans un commit à part, après celui du lot.

## Décisions qui encadrent le plan

| Sujet | Décision |
|---|---|
| Plugin | UCM Token Architect remplace UCM Token Explorer et UCM Nomenclature ; il garde l'identifiant de manifeste de l'explorateur |
| Périmètre | Contrôles et corrections pour un fichier qui déclare l'architecture UCM ; ailleurs, la navigation seule. Le sandbox relit la déclaration avant chaque contrôle et avant chaque écriture |
| Écriture | Token Architect écrit dans le document, par les seuls fichiers de `src/ecriture/` |
| Exactitude | Une correction n'est proposée que si une règle écrite la tire d'un fait lu dans Figma, avec un seul candidat ; le reste est une question sans réponse cochée |
| Corrections | Le modèle de Nomenclature : lot avec aperçu, Appliquer, une annulation ; questions à part |
| Contrôles de l'export | Le moteur de l'exporteur passe dans le socle des plugins (décision A), lu par l'exporteur et par Token Architect. Le kit ne peut pas le porter : il est publié sur npm et n'appelle jamais `figma`. Les contrôles nouveaux, qui jugent un relevé sérialisable, vont dans le kit |
| Lecteurs du composant | Deux lecteurs : le moteur de l'exporteur rend les points à corriger ; la lecture de l'explorateur (`src/lectureDuComposant.ts`), étendue à tous les variants, rend les liaisons calque par calque. Le contrat ne garde ni le calque ni le champ d'une liaison |
| Une opération à la fois | Le sandbox refuse une analyse ou une écriture demandée pendant une autre. Après une écriture ou un Ctrl+Z, le panneau se dit périmé jusqu'à Actualiser |
| Sélection | Changée au clic sur un constat, jamais ailleurs |
| Sévérités | Trois niveaux propres au panneau, sans effet sur l'export |
| Onglets | Variables gardé ; Comparer et Dépendants dans l'inspecteur ; Diagnostics dans un bloc Structure ; Intégrations et Relevés supprimés. `integrations/profilUcm.ts`, la lecture de la recette de Palettes et leurs tests sont gardés |
| Grammaire | `components/composant/famille/[élément]/[palette/style/taille/état]/rôle ou propriété` ; tailles d'icône dans `layout/icon` |
| Génération | Construite après les corrections, couleurs puis tailles ; liste transmise par `figma.clientStorage` |
| Interface | Le mainteneur lance les tests d'interface et les recettes Figma ; aucun agent ne lance Chromium |

## Principes d'exécution

- **Le plus simple d'abord.** Chaque lot prend la solution la plus simple qui
  tient ses critères. Une solution plus lourde se présente au mainteneur comme
  une décision, avec son coût, et n'est pas construite sans son accord.
- **Déplacer avant de réécrire.** Un code qui marche se déplace par
  `git mv` et garde ses tests. Une réécriture n'est jamais le moyen d'un
  déplacement.
- **Un fait Figma inconnu se mesure avant le lot qui en dépend.** Une sonde
  (modèle : `packages/plugin-exporter/sondes/`) le mesure, le mainteneur la
  lance, et le résultat entre dans ce plan avant le lot.
- **Une note de conception précède un lot dont la règle n'est pas encore
  écrite** (K1.0, P3.0, P7.0). La conversation principale l'écrit, le
  mainteneur la valide.
- **Une phase finit verte et utilisable.** `npm test`, `npm run typecheck`,
  `npm run build`, puis la recette du mainteneur. La phase suivante attend la
  recette.
- **Une analyse incomplète ne conclut jamais.** Une analyse partielle,
  interrompue ou en échec le dit, et n'affiche jamais « aucun constat ».
- **Aucun geste manuel inventé.** Un geste que le designer devrait retenir se
  présente comme une décision, avec une alternative automatique.
- **Les migrations du fichier Figma restent au mainteneur.** Le plan ne
  déplace ni ne renomme aucune variable d'un fichier réel.

## Règles d'exécution

- Un lot par appel d'agent : `implementeur` par défaut,
  `implementeur-exigeant` quand le lot le dit. Deux agents au plus en même
  temps, sur des fichiers disjoints.
- Le prompt d'un agent contient la note du lot, la sortie de
  `npm run agents:lire -- <chemins du lot>`, les fichiers concernés, la nature
  de la tâche (déplacement ou code nouveau) et les critères « Fait quand ».
- Avant chaque lot : `git status`. Un fichier modifié par une autre session
  n'entre pas dans le lot ; le lot s'arrête et remonte la question. Les lots
  marqués « seul » tournent arbre propre, sans autre agent.
- Les textes destinés au designer sont écrits par la conversation principale,
  avec la skill `rediger-diagnostics-ucm`, avant le lot qui les affiche.
  L'agent les recopie.
- La conversation principale relit chaque diff, fait lancer les vérifications
  par un `verificateur`, lance `npm run agents:diff`, puis commite par chemins
  explicites.
- **Push.** Un lot sans interface se pousse après ses vérifications. Un lot
  qui touche une interface met à jour sa galerie et ses tests d'interface sans
  les lancer ; il reste local jusqu'à ce que le mainteneur lance
  `npm run test:ui` du paquet. La CI rejoue ces tests à chaque push.
- Un changement du kit suit la règle du dépôt : tests racine, version du kit,
  publication de `@ucm-kit/core` (et de `@ucm-kit/cli` et
  `@ucm-kit/adapter-typescript` quand leurs dépendances changent). Une clé
  nouvelle de `ESPACE_ARCHITECT` se déclare dans le kit (`produits.ts`).

## Lois qui changent

| Loi | Aujourd'hui | Après | Lot |
|---|---|---|---|
| Document intact de l'exporteur | `plugin-exporter/tests/loiDuDocumentIntact.test.ts` balaie `src/` de l'exporteur ; seul `src/template/ecriture.ts` écrit | Balaie aussi `plugin-socle/src/composant/` ; `template/ecriture.ts` y reste la seule écriture ; ses importeurs permis sont listés (`plugin-exporter`, puis `plugin-architect` en P5) | P0.2 |
| Lecture seule de l'explorateur | `tests/loiDeLectureSeule.test.ts`, doubles de `tests/figmaDeTest.ts` qui lèvent à toute mutation | Remplacée par la loi d'écriture d'Architect ; les doubles suivent | P1.2 |
| Écriture de Nomenclature | `plugin-nomenclature/tests/loiDEcriture.test.ts` balaie tout `src/`, suppose `src/ecriture.ts` | Elle suit ses fichiers : elle balaie `src/nomenclature/` et `src/ecriture/noms.ts` d'Architect, avec les mêmes attendus | P1.2 |
| Écriture d'Architect | Aucune | Hors de `src/ecriture/` : aucune écriture, aucun changement de sélection ou de vue, aucun import de `plugin-socle/src/composant/template/ecriture` | P1.2 |
| Import de variables par l'explorateur | Seule `src/lecture.ts` importe, et seulement des cibles d'alias | Inchangée jusqu'à P2.5 ; P2.5 l'étend après sonde | P2.5 |
| Paquets séparés | `tests/pluginsSepares.test.ts` liste quatre plugins | Trois plugins, dont `plugin-architect` | P1.1, P1.2 |

## Décisions à prendre avant le lancement

| # | Question | Recommandation |
|---|---|---|
| A | Le moteur de l'exporteur dans le socle (`plugin-socle/src/composant/`) plutôt que dans le kit. Le socle s'exporte fichier par fichier : le bundle de Palettes et des autres plugins ne change pas | Oui. Confirmée, elle réécrit dans le même commit la section 3.3, la ligne « Contrôles de l'export » de la section 8.1 et G7 du document préparatoire |
| B | Renommer `packages/plugin-explorateur` en `packages/plugin-architect`, paquet `ucm-architect-plugin` | Oui |
| C | Repli pendant la fusion : Nomenclature disparaît du dépôt au lot P1.2. Pour s'en servir encore, le mainteneur construit le commit qui précède P1.2 | Noter ce commit dans le plan au lancement de P1.2 |
| D | Les points à corriger de l'exporteur disent « réexportez » et entrent dans le contrat. Token Architect les affiche-t-il tels quels ? | Oui, tels quels ; un texte propre à Token Architect changerait le contrat |
| E | Annulation d'une correction : Ctrl+Z de Figma (un point d'annulation par lot), ou en plus un journal rangé dans le document, comme l'Historique de Nomenclature ? | Ctrl+Z seul ; le journal est l'option lourde |
| F | Thème : l'explorateur est toujours sombre ; Nomenclature suit le thème de Figma | À trancher sur les maquettes M1 |
| G | Compléter les règles d'une instance de `.componentRules` déjà remplie (C47) demande une écriture nouvelle dans ses slots : l'écriture actuelle vide le slot avant de le reconstruire | P5.2 ne fait que générer les règles d'un composant qui n'en a pas (C46). C47 attend une sonde S3 et une décision ; d'ici là, le panneau signale la règle manquante et le designer l'ajoute |
| H | Le thème des statuts porte une intensité (`theme/danger/soft/…`, `theme/danger/vivid/…`). Comment la génération la choisit-elle ? | Si la bibliothèque n'a qu'une intensité pour ce statut, le choix est exact. Sinon, la question de chaque style demande aussi « douce ou vive », sans réponse cochée |
| I | Pour savoir quels axes entrent dans les noms et si deux calques (titre, message) partagent un token, la génération peut comparer les couleurs actuelles des calques, ou poser la question | Poser la question : une couleur actuelle fausse fausserait le découpage. Les axes reconnus par un registre (palette, état) entrent sans question ; un axe inconnu et deux calques du même rôle donnent une question |

## Ordre

| Phase | Contenu | Attend |
|---|---|---|
| M | Maquettes des deux modes | rien |
| P0 | Moteur de l'exporteur déplacé dans le socle | décision A ; tourne pendant M |
| K1 | Grammaire des composants dans le kit | note K1.0 validée ; tourne pendant M |
| P1 | Fusion | M validé, P0, décisions B à F |
| P2 | Lecture et contrôles | P1, K1 |
| P3 | Corrections exactes | P2, sonde S2 |
| P4 | Contraste et accessibilité | P2 |
| P5 | Composant de règles | P2 |
| P6 | Full UCM et bloc Structure | P3 |
| P7 | Génération | P3, P6, décisions H et I |
| P8 | Typographie et icônes | P2 |

P4 et P5 peuvent tourner ensemble.

## Lots

### M · Maquettes

Faites par la conversation principale : une maquette est une conception.

- [ ] **M1 · Mode Tokens.** Arbre et table à gauche ; Nomenclature à droite,
  ses onglets et sa Configuration à l'identique. Lien entre l'arbre et
  Nomenclature (T2). Inspecteur avec « Comparer avec un autre mode » et
  « Utilisée par ». Bloc Structure. Fichier qui ne déclare pas UCM. Thème
  (décision F).
- [ ] **M2 · Mode Composant.** Aperçu et liaisons à gauche ; barre latérale :
  familles, compte par sévérité, constat dépliable, lot avec Aujourd'hui et
  Après, question, Ignorer, Actualiser, analyse partielle, panneau périmé.
  Matrice des variants (C4).
- [ ] **M3 · Génération.** Questions par style dans le fichier des composants ;
  plan en attente dans le fichier des tokens.

Règles : états réels des galeries de l'explorateur et de Nomenclature, figés,
en thème sombre ; une idée par phrase ; mots de designer ;
`scripts/controle-style.mjs` et l'audit de maquette avant de montrer ; aucune
capture Chromium.

Fait quand : le mainteneur a validé la taille de la fenêtre et la largeur de
la barre latérale dans chaque mode, la place des onglets déplacés, les trois
sévérités, la forme d'un constat et le thème. Ses choix entrent dans les
décisions de ce plan.

### P0 · Le moteur de l'exporteur dans le socle

Le moteur (`plugin-exporter/src/contract/`, 40 fichiers, environ
12 700 lignes) lit des nœuds Figma. Ses tests le font tourner sur des nœuds
factices (`tests/aides/figmaFaux.ts`) et restent la garde du déplacement :
l'invariant `invariants/tests-du-moteur.md` interdit de juger le moteur sur un
contrat commité.

- [ ] **P0.1 · Le type `Annonce` sort de `messages.ts`.** Trois fichiers du
  moteur importent `Annonce` depuis `../messages`, qui dépend de toute
  l'interface de l'exporteur. Le type passe dans un fichier à lui.
  Fait quand : aucun fichier de `src/contract/`, `src/template/` ni
  `src/variables.ts` n'importe hors de ces trois emplacements, sauf le kit et
  ce type ; `npm run test:paquet -- exporter` passe.
- [ ] **P0.2 · Déplacement** (`implementeur-exigeant`, seul). `git mv` de
  `src/contract/`, `src/template/`, `src/variables.ts` et du type `Annonce`
  vers `plugin-socle/src/composant/`, en gardant l'arborescence relative.
  Les tests, `tests/lois.ts`, les invariants et `SPEC.md` restent dans
  l'exporteur ; leurs chemins sont réécrits. La loi du document intact suit
  la table « Lois qui changent ». `.agents/domiciles.json` route
  `plugin-socle/src/composant/**` vers les domaines de l'exporteur. Le test
  racine `tests/domiciles.test.ts` et les documents qui citent ces chemins
  suivent.
  Fait quand : `npm run test:paquet -- exporter` et `-- socle` passent sans
  changement d'attendu ; `npm test` passe ; `npm run build:plugin -- exporter`
  et `-- palettes` passent, avec des bundles de même taille à 1 % près ;
  `npm run agents:diff` ne liste aucun chemin mort ;
  `npm run agents:domicile -- packages/plugin-socle/src/composant/contract/layoutNodes.ts`
  rend un domaine de l'exporteur.
- [ ] **P0.R · Recette.** Le mainteneur réexporte deux composants déjà publiés
  dans UCM-Playground. L'exporteur doit annoncer qu'il n'y a rien à publier.

### K1 · Grammaire des composants dans le kit

- [ ] **K1.0 · Note de conception**, validée par le mainteneur. Elle tranche :
  - la reconnaissance d'un chemin à positions facultatives :
    `FORMES_DES_CHEMINS` est positionnel et à nombre exact de positions ;
    énumérer les formes ou reconnaître des positions facultatives ;
  - la levée des exclusions de `components` dans `grammaire.ts`
    (`formesReconnues`, `reconnaitreLeChemin`) ;
  - `layout/icon/<taille>` : une forme `layout` à part, `[icon, REGISTRE_TAILLES]` ;
    la forme famille et valeur dimensionnelle reste celle des autres familles ;
  - la lecture d'un segment qui appartient à deux registres : `text` est un
    rôle et un style. Palette, style, taille et état se lisent par les valeurs
    d'axe du composant quand le lecteur les a ; sans elles, un chemin à deux
    lectures rend `ambigu`, jamais la première forme ;
  - le registre qui reçoit `padding`, `gap`, `width`, `height`,
    `border-width` : un registre propre à `components`, pour ne pas changer la
    lecture des autres collections par Nomenclature ;
  - l'accès aux styles déclarés par l'équipe (termes personnalisés).
- [ ] **K1.1 · Implémentation** selon la note. Version et publication du kit,
  tests racine.
  Fait quand : un test du kit reconnaît, avec leurs positions, les chemins de
  la section 2 de la grammaire et refuse ceux de la section 4, écrits à la
  main dans le test ; `layout/icon/xl` est reconnu, `layout/sizing/xl`
  refusé ; un chemin à deux lectures rend `ambigu` sans les axes, une seule
  lecture avec ; les tests de Nomenclature passent sans changement d'attendu.

### P1 · La fusion

- [ ] **P1.1 · Renommage** (seul). Décision B : dossier, paquet, nom du
  manifeste « UCM Token Architect », identifiant gardé, permission
  `teamlibrary`. À suivre : `scripts/construire-plugin.mjs` ; script `build`
  et `package-lock.json` racine ; `.github/workflows/ci.yml` (dont `test:ui`) ;
  `.agents/domiciles.json` ; `tests/pluginsSepares.test.ts` ; tests racine qui
  importent les chemins de l'explorateur ; test du manifeste de l'explorateur ;
  commandes de `CONTRIBUTING.md` ; guides, cartes et liens de `docs/` hors
  Archives.
  Fait quand : `npm test`, `npm run typecheck` et
  `npm run build:plugin -- architect` passent ; `agents:diff` ne liste aucun
  chemin mort ; `tests/docLinks.test.ts` passe.
- [ ] **P1.2 · Nomenclature entre dans Architect** (`implementeur-exigeant`,
  seul). `git mv` de tout Nomenclature : le sandbox dans `src/nomenclature/`,
  `ecriture.ts` dans `src/ecriture/noms.ts`, l'interface dans
  `src/ui/nomenclature/`, la galerie et les tests à côté de ceux d'Architect.
  `code.ts` route les demandes des deux et refuse une opération pendant une
  autre. Les lois suivent la table « Lois qui changent ». Les invariants de
  Nomenclature passent dans `plugin-architect/invariants/` ; seuls leurs
  chemins changent. `packages/plugin-nomenclature` est supprimé, avec ses
  entrées dans les scripts, la CI, le registre et `pluginsSepares`. Les tests
  racine qui l'importent (`nomsDePalettes`, `loisEntreProduits`,
  `fabriquesDeFichiers`, `releveDeTest`) visent les nouveaux chemins, sans
  perdre un test ni changer un attendu. L'interface de Nomenclature n'est
  branchée qu'en P1.3.
  Fait quand : les tests du sandbox de Nomenclature passent sans changement
  d'attendu ; sa loi d'écriture passe sans changement d'attendu ; la loi
  d'Architect refuse, à l'essai, une écriture et un import de
  `template/ecriture` hors de `src/ecriture/` ; `npm test` passe.
- [ ] **P1.3 · Interface de Nomenclature dans la barre latérale**
  (`implementeur-exigeant`). La barre latérale du mode Tokens affiche
  `src/ui/nomenclature/` selon M1 ; thème selon F ; un seul `messages.ts`
  pour la loi de galerie du socle.
  Fait quand : les tests d'interface de Nomenclature et de l'explorateur sont
  réunis et mis à jour, sans être lancés ; la galerie montre les états de M1 ;
  `npm run build:plugin -- architect` passe.
- [ ] **P1.4 · Onglets et lien avec l'arbre.** Suppression des vues
  Intégrations et Relevés, de leurs préférences d'association et de leurs
  états de galerie. `integrations/profilUcm.ts`, `lireLaRecette` et le message
  `lire-recette-palettes` restent. Comparer et Dépendants dans l'inspecteur,
  Diagnostics dans le bloc Structure, selon M1. Lien entre l'arbre et
  Nomenclature (T2).
  Fait quand : aucun texte ni état de galerie ne cite Intégrations ou Relevés ;
  les tests de `profilUcm` passent ; un test lit la recette rangée par
  Palettes ; un test d'interface couvre le lien T2.
- [ ] **P1.5 · Mode Composant et fichier hors UCM.** La disposition du mode
  Composant prend la barre latérale de M2, avec « Aucun contrôle pour
  l'instant » ; le mode d'ouverture suit G3. Sans déclaration UCM, la barre
  latérale des deux modes invite à déclarer l'architecture ; la déclaration
  reste accessible.
  Fait quand : deux états de galerie, avec et sans déclaration, dans chaque
  mode.
- [ ] **P1.R · Recette.** Le mainteneur lance `npm run test:ui -w ucm-architect-plugin`,
  ouvre Token Architect dans ses deux fichiers, applique un renommage
  Nomenclature et l'annule. La taille du bundle d'Architect est relevée.

### P2 · Lecture et contrôles

- [ ] **P2.1 · Relevé du composant.** `src/lectureDuComposant.ts` lit tous les
  variants d'un jeu, plus les propriétés de composant : axes, booléens,
  textes, remplacements d'instance (C3). Chaque liaison garde son porteur réel
  (le calque visé par une surcharge, pas seulement l'instance frontière), son
  champ, et l'indice de peinture ou la plage de texte. Le relevé garde les
  variables atteintes : collection, portées, alias par mode et lectures
  manquées ; les contrôles de couche et de portée s'appuient dessus. La borne
  arrête le parcours lui-même. La vue Composant du variant par défaut garde sa
  lecture.
  Fait quand : test sur nœuds factices d'un jeu à six variants ; une liaison
  posée dans une instance imbriquée rend son porteur réel ; au-delà de la
  borne, aucun calque n'est visité et le relevé compte les calques non lus.
- [ ] **P2.2 · Noms des tokens de la bibliothèque.** Une fonction du socle
  rend, par bibliothèque et collection, le nom, la clé et le type de chaque
  variable (`figma.teamLibrary`). Palettes reste inchangé. Choix automatique
  de la bibliothèque la plus liée, modifiable dans la Configuration (Q11),
  sous une clé déclarée dans le kit.
  Fait quand : à égalité, ou sans aucune liaison, aucune bibliothèque n'est
  choisie seule et la Configuration demande ; une bibliothèque illisible est
  dite illisible ; un test choisit la plus liée entre deux.
- [ ] **T · Table des constats attendus**, écrite par la conversation
  principale et validée par le mainteneur avant P2.3. Pour Button et Alert,
  elle donne les constats attendus en P2 (code, chemin). Elle corrige la
  section 4 de la grammaire : un champ peint sans variable relève de C30 ; un
  rôle non peint ne donne aucun constat ; C59 attend P6.1.
- [ ] **P2.3 · Contrôles dans le kit.** Fonctions pures sur le relevé et la
  liste des noms : nommage (C7 à C11), mapping (C15 à C19, C21), couche (C20,
  C61), oublis (C31 à C33). C30 et C41 restent ceux du moteur. C21 rend un
  constat sans correction ; sa correction vient de C59 en P6. Chaque constat
  porte un code, le calque, le variant et les faits lus, sans correction.
  Version et publication du kit.
  Fait quand : un test positif et un test négatif par contrôle ; un relevé
  écrit à la main qui reproduit Button et Alert rend les constats de la
  table T ; ne donnent aucun constat : `alert/size/gap` sans axe de taille,
  un token partagé entre deux états, un rôle absent (règle 3 de la
  grammaire).
- [ ] **P2.4 · Panneau.** La barre latérale affiche les constats du kit et les
  points du moteur (C38, décision D), par famille, avec les trois sévérités ;
  matrice des variants (C4) ; un clic sélectionne le calque (C5) ; l'analyse
  du moteur se lance au bouton Actualiser (C74), jamais à chaque changement de
  sélection.
  Fait quand : états de galerie d'un composant sans constat, avec constats de
  chaque sévérité, en cours d'analyse, partiel et en échec ; une seconde
  analyse demandée pendant la première est refusée par le sandbox et
  Actualiser reste inactif ; une erreur du moteur (axes confondus, jeu sans
  variant) s'affiche comme un constat bloquant avec son message ; la
  sélection ne change que par `src/ecriture/selection.ts`.
- [ ] **S1 · Sonde : import d'une variable de bibliothèque.** Effet de
  `importVariableByKeyAsync` sur le fichier (variable visible, gardée après
  fermeture, marque le fichier modifié), temps pour 200 variables.
- [ ] **P2.5 · Bibliothèque dans le mode Tokens (T14)**, si S1 le permet.
  Arbre depuis les noms ; valeurs et alias d'un groupe importés à son
  ouverture, par lots de huit ; invariant d'import étendu.
  Fait quand : test sur doubles ; l'invariant d'import décrit la nouvelle
  règle.
- [ ] **P2.R · Recette.** Le mainteneur ouvre Button et Alert. Les constats
  doivent correspondre à la table T. Il relève le temps d'analyse du plus gros
  jeu de variants.

### P3 · Corrections exactes

- [ ] **S2 · Sonde : écrire une liaison.** Sur un composant d'un fichier de
  test : `setBoundVariable` sur un champ numérique ;
  `figma.variables.setBoundVariableForPaint` puis réaffectation de `fills` et
  `strokes` ; `setRangeFills` sur un texte ; un Ctrl+Z après
  `figma.commitUndo` défait-il tout le lot ?
- [ ] **P3.0 · Note de conception de l'écriture**, d'après S2 : champs
  couverts, ordre des écritures, relecture, objet changé depuis l'aperçu,
  échec partiel, annulation (décision E). Une écriture à la fois ; aucune
  analyse pendant une écriture ; après une écriture ou un Ctrl+Z, le panneau
  se dit périmé jusqu'à Actualiser.
- [ ] **P3.1 · Écriture des liaisons.** `src/ecriture/liaisons.ts` selon P3.0.
  Fait quand : un test par sorte d'écriture (nombre, peinture de cadre,
  contour, texte) sur doubles ; un objet changé depuis l'aperçu est sauté et
  compté ; une demande reçue alors que le fichier ne déclare plus UCM n'écrit
  rien.
- [ ] **P3.2 · Corrections exactes** (`implementeur-exigeant`). Token frère
  (C22), propagation depuis un variant de référence (C24), liaison initiale
  par la grammaire (C25), pour les couleurs et les tailles (C29), seulement
  quand chaque nom calculé existe, n'a qu'un candidat, et que le calque
  destinataire est unique (porteur réel et champ). Aperçu Aujourd'hui et
  Après, lot, groupes de même cause (C75).
  Fait quand : un test montre qu'un cas à deux candidats devient une question
  et n'entre jamais dans le lot ; un nom absent ne produit rien ; deux calques
  homonymes donnent une question.
- [ ] **P3.3 · Renommer une valeur de variante (C12).** Écriture du nom des
  variants du jeu ; le constat annonce que le contrat publié change.
  Fait quand : test sur doubles ; les instances du jeu gardent leur variant ;
  renommer vers une valeur déjà présente sur l'axe devient une question.
- [ ] **P3.4 · Questions et Ignorer.** Questions à plusieurs candidats, aucun
  coché (C70, C76) ; Ignorer rangé à la racine du document, sous une clé de
  `ESPACE_ARCHITECT` déclarée dans le kit (C71). La clé d'un constat ignoré :
  code, clé du jeu de variants, nom du variant, chemin du calque. Une limite
  de lecture ne s'ignore pas.
  Fait quand : un constat ignoré disparaît et revient quand on l'y remet ;
  aucune donnée n'est écrite sur un composant.
- [ ] **P3.R · Recette.** Le mainteneur corrige Button sur une copie de son
  fichier, vérifie chaque liaison et annule.

### P4 · Contraste et accessibilité

Les mesures portent sur le composant dessiné dans Figma. Elles signalent un
écart à vérifier ; elles ne prouvent pas la conformité de l'interface livrée.

- [ ] **P4.1** Contraste des textes, icônes, contours et anneaux contre le
  fond effectif, dans chaque variant et chaque combinaison de modes, fonds
  unis seulement (C49, C50) ; variant désactivé exclu (C53) ; niveau AA ou
  AAA dans la Configuration (C78). Un texte en grand corps (au moins 24 px, ou
  au moins 18,66 px en graisse 700 ou plus) est jugé à 3:1 ; ailleurs, les
  seuils `SEUILS_PAR_ROLE` du kit. Au-delà de la borne de combinaisons de
  modes du kit, le constat nomme les combinaisons non mesurées.
  Fait quand : tests d'un texte sur fond uni, sur fond semi-transparent posé
  sur un fond uni, et sur un dégradé, qui rend une limite ; un grand texte à
  3,5:1 ne donne aucun constat ; un dépassement de borne est dit.
- [ ] **P4.2** Taille de cible : constat sous 24 × 24 px, recommandation sous
  44 × 44 px, pour un composant qui a un axe d'état (C52). Variant de focus
  absent ou sans anneau (C36). Anneau comparé à la recommandation du kit
  (C51). Texte sous 12 px : recommandation (Q10).
  Fait quand : un test par contrôle, positif et négatif.

### P5 · Composant de règles

- [ ] **P5.1** Composant sans instance de règles (C43) ; validation des règles
  par le moteur (C44) ; règle `@prop` manquante ou orpheline (C45).
  Fait quand : un test par constat.
- [ ] **P5.2** Génération des règles d'un composant qui n'en a pas (C46), par
  `template/ecriture.ts` du socle ; Architect entre dans la liste de ses
  importeurs permis. C47 suit la décision G.
  Fait quand : la loi du document intact passe avec Architect dans la liste ;
  un composant qui a déjà une instance de règles ne reçoit aucune écriture.

### P6 · Full UCM et bloc Structure

- [ ] **P6.1** Règle du dossier (C59), état et dossier (C60), variable du
  thème hors de ses champs (C63), dans le kit.
- [ ] **P6.2** Mapping vers le thème (C27) : le dossier vient d'une question
  par valeur de style ; le reste suit la table des dossiers.
- [ ] **P6.3** Bloc Structure du mode Tokens : chaînes cassées, cas (a), (b),
  (c) et (f) de la recherche sur la structure, dans le kit (décision 8.1 du
  document préparatoire) ; règles du profil UCM, qui restent dans
  `profilUcm.ts`, sans association manuelle des couches.
- [ ] **P6.4** Correction des portées (T7).

Fait quand, pour chaque lot : un test positif et un test négatif par règle ;
P6.3 rend les cas (a) à (c) et (f) sur un relevé écrit à la main.

### P7 · Génération des tokens d'un composant

- [ ] **P7.0 · Note de conception**, validée par le mainteneur. Elle tranche :
  les axes et les éléments (décision I) ; l'icône : une instance pilotée par
  une propriété d'échange d'instance, sinon une question ; l'intensité des
  statuts (décision H) ; les cibles d'une variable : chaque variable du plan
  porte la liste de ses cibles (porteur, champ), et un même chemin avec deux
  alias différents devient une question ; les tailles : valeur exacte dans
  chaque mode de `layout`, sinon une question.
- [ ] **P7.1 · Plan, dans le kit.** Du relevé et des réponses à la liste des
  variables et de leurs cibles ; chaque entrée est exacte ou devient une
  question.
  Fait quand : le plan d'Alert rend les variables de l'aperçu, et un calque
  nommé `Frame 12` rend une question.
- [ ] **P7.2 · Mode Composant.** Questions, aperçu, plan rangé dans
  `figma.clientStorage` avec la clé et le nom du jeu de variants ; copie en
  texte en secours. Le texte à l'écran dit que le plan reste sur ce poste et
  dans cette application.
- [ ] **P7.3 · Mode Tokens.** Plan en attente ; le plugin vérifie que les
  cibles du plan existent parmi les variables locales, ce qui reconnaît le
  fichier des tokens ; aperçu ; création des seules variables manquantes et
  de leurs alias ; annulation.
- [ ] **P7.4 · Retour au composant.** Liaison par les cibles gardées dans le
  plan, seulement si le jeu trouvé a la même clé, sinon le plugin le dit. La
  variable se cherche dans la bibliothèque choisie (Q11) ; une variable pas
  encore publiée laisse son entrée en attente.
- [ ] **P7.5 · Règle de Nomenclature préparée (C13)**, par le même transfert.
- [ ] **P7.6 · Tailles.** Même chemin pour `size`, valeur exacte dans
  l'échelle de `layout`, un seul token (G-4).

Fait quand, pour P7.2 à P7.6 : un test par étape sur doubles ; un jeu d'une
autre clé ne reçoit aucune liaison ; une variable absente laisse l'entrée en
attente ; recette du mainteneur sur Alert.

### P8 · Typographie et icônes

- [ ] **P8.1** Style de texte et variables de typographie (C64, C65) ; icônes
  (C66, C67).
  Fait quand : un test par contrôle.

## Hors du plan

| Fonction | Raison |
|---|---|
| C6, C73 : analyse d'une page entière et rapport | Après la recette d'un composant |
| C14 : même axe nommé autrement dans deux composants | Demande de lire plusieurs composants |
| C23, C37, C54, C56 à C58, C72, C77, C79 | Utilité faible ou partielle |
| C55 : interlignage | Utilité faible ; la taille de texte minimale est en P4.2 |
| C26 : mapping par valeur | Contraire à la règle d'exactitude, sauf P7.6 : valeur exacte, un seul token (G-4) |
| C30, C41 dans le kit | Déjà rendus par le moteur de l'exporteur |
| C39, C40 : parité du code, écart avec le contrat publié | Hors de Figma, ou demande le réseau |
| C47 : compléter une instance de règles remplie | Décision G |
| C48 : rédaction par IA | Réseau |
| T3 : effet d'un renommage montré dans l'arbre | Après la recette de P1 |
| T4 : lecture unique des variables | Seulement si la recette montre une lenteur |
| T8 à T11, T13 | Utilité faible, ou doublon de Palettes |
| G8 : fusion de l'exporteur | Écartée |

## Revue du plan

Deux revues ont relu le plan : une revue Opus sur la première version
(commit `9ab1ee40`), puis la [revue de Codex](./REVUE-CODEX-DU-PLAN.md) sur la
même version, confrontée par une seconde revue Opus au plan corrigé.

### Première revue

| Constat | Changement |
|---|---|
| Garder Nomenclature jusqu'à la recette est impossible : un plugin ne peut pas importer un autre (`tests/pluginsSepares.test.ts`) | Nomenclature quitte le dépôt en P1.2 ; repli par le commit précédent (décision C) |
| Le contrat ne garde ni calque ni champ par liaison | Deux lecteurs du composant, décision écrite ; P2.1 étend `lectureDuComposant.ts` |
| Les témoins commités contredisent `invariants/tests-du-moteur.md` et ne peuvent pas rejouer des scénarios qui montent chacun leur `figma` | Témoins supprimés ; les tests existants sont la garde |
| `Annonce` tire toute l'interface de l'exporteur ; tests, `lois.ts` et invariants nommés par d'autres fichiers | P0.1 sort le type ; tests et invariants restent dans l'exporteur ; routes de `domiciles.json` ajoutées |
| Deux lois d'écriture, dossiers différents en P1.2 et P1.3 | Table « Lois qui changent » |
| `setBoundVariable` ne lie pas une couleur | Sonde S2 et note P3.0 avant l'écriture |
| Ignorer rangé sur un composant | Rangé à la racine du document |
| P1.4 supprimait `profilUcm.ts`, utilisé par P6.3 et des tests racine | Gardé |
| Liste de renommage incomplète ; CI Chromium rouge à chaque push d'interface | Liste complétée ; règle de push des lots d'interface |
| `FORMES_DES_CHEMINS` positionnel, `text` à double sens, registre non nommé | Note de conception K1.0 |
| C30 et C41 en double avec le moteur ; textes « réexportez » | Retirés du kit ; décision D |
| Import par clé contraire à l'invariant de l'explorateur, effet inconnu | Sonde S1 avant P2.5, rendu facultatif |
| Analyse du moteur coûteuse à chaque sélection | Au bouton Actualiser |
| Lots sans critère de fin ; fonctions sans lot | Un « Fait quand » par lot ; chaque fonction placée ou exclue |
| P0.3 recréait `handleExportComponent`, qui existe déjà sans réseau | Supprimé |
| Lots qui touchent toute la documentation pendant qu'une autre session travaille | Lots « seul », arbre propre |

### Seconde revue (Codex, confrontée au plan corrigé)

| Constat | Changement |
|---|---|
| R4 : la loi d'écriture de Nomenclature interdit l'import par clé que fait l'explorateur ; une loi générique perdait ses restrictions | La loi de Nomenclature suit ses fichiers avec les mêmes attendus ; une loi d'Architect s'y ajoute |
| R5 : `grammaire.ts` exclut `components` ; la forme `layout` refuse `layout/icon/xl` | K1.0 et K1.1 complétés |
| R6 : aucune règle de concurrence entre analyse, renommage et correction | Une opération à la fois, panneau périmé après écriture |
| R7 : le transfert ne vérifie pas le jeu de variants ; `figma.fileKey` est absent | Le plan garde la clé du jeu de variants ; P7.4 la vérifie |
| R8 : une surcharge est rangée sous l'instance frontière ; le porteur réel n'est pas rendu | P2.1 garde le porteur réel ; P3.2 exige un destinataire unique |
| R9 : l'écriture des règles ne sait pas compléter une instance remplie | Décision G ; P5.2 limité à C46 |
| R10 : rien n'empêche une écriture après le retrait de la déclaration UCM | Relecture de la déclaration avant chaque écriture |
| R11 : la borne de calques arrive après le parcours complet | La borne arrête le parcours |
| R12, R18 : la grammaire attribue des codes faux, et attend C59 dès P2 | Table T validée avant P2.3 ; grammaire corrigée |
| R13 : supprimer Intégrations perdait la lecture de la recette | `lireLaRecette` gardée |
| R15 : 12 px décidé en Q10 et C55 exclu | Taille minimale en P4.2 ; C55 réduit à l'interlignage |
| R16 : les tests racine semblaient supprimés avec Nomenclature | Ils visent les nouveaux chemins, sans perte |
| R17 : la décision A contredit la préparation | La confirmation de A réécrit la préparation |
| R19 : intensité des statuts, couleurs actuelles, plusieurs cibles par variable | Décisions H et I ; note P7.0 |
| R20 : le moteur lève sur des axes confondus ou un jeu sans variant | Constat bloquant ; une analyse en échec ne conclut pas |
| R21 : grand corps, borne de combinaisons, limites de la mesure | P4.1 complété ; limite de la mesure écrite |
| Rejetés | R14 (témoins déjà retirés) ; la version et le verrou du plan transmis (R7) ; le choix entre plusieurs collections (une seule bibliothèque de tokens) ; les exceptions de taille de cible (Q10 décidé) |
| Vu par la seconde revue Opus | P1.2 supprimait Nomenclature avant que P1.3 déplace son interface : P1.2 déplace tout. P2.2 déplaçait `lectureDesVariables.ts`, propre à Palettes : remplacé par une fonction du socle |

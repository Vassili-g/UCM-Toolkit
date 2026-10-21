Formule à respecter pour tous les agents:
"Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better."


# Plan d'implémentation de UCM Token Architect

Ce plan construit UCM Token Architect, décrit dans le
[document préparatoire](./PREPARATION-TOKEN-ARCHITECT.md), la
[grammaire des composants](./GRAMMAIRE-DES-COMPOSANTS.md) et l'
[aperçu de la génération](./APERCU-GENERATION-TOKENS-COMPOSANT.md). Les
numéros C, T et G renvoient aux fonctions du document préparatoire. Une revue
a relu la première version ; la section « Revue du plan » dit ce qu'elle a
changé.

Cocher une case quand son commit est fait, avec le hash entre parenthèses. Les
cases se cochent dans un commit à part, après celui du lot.

## Décisions qui encadrent le plan

| Sujet | Décision |
|---|---|
| Plugin | UCM Token Architect remplace UCM Token Explorer et UCM Nomenclature ; il garde l'identifiant de manifeste de l'explorateur |
| Périmètre | Contrôles et corrections pour un fichier qui déclare l'architecture UCM ; ailleurs, la navigation seule |
| Écriture | Token Architect écrit dans le document ; une seule loi d'écriture remplace la loi de lecture seule de l'explorateur et celle de Nomenclature |
| Exactitude | Une correction n'est proposée que si une règle écrite la tire d'un fait lu dans Figma, avec un seul candidat ; le reste est une question sans réponse cochée |
| Corrections | Le modèle de Nomenclature : lot avec aperçu, Appliquer, une annulation ; questions à part |
| Contrôles de l'export | Le moteur de l'exporteur passe dans le socle des plugins, lu par l'exporteur et par Token Architect. Le kit ne peut pas le porter : il est publié sur npm et n'appelle jamais `figma`. `ucm check` ne lit pas ces contrôles, qui demandent les nœuds Figma. Les contrôles nouveaux, qui jugent un relevé sérialisable, vont dans le kit |
| Lecteurs du composant | Deux lecteurs : le moteur de l'exporteur rend les points à corriger ; la lecture de l'explorateur (`src/lectureDuComposant.ts`), étendue à tous les variants, rend les liaisons calque par calque. Le contrat ne garde ni le calque ni le champ d'une liaison |
| Sélection | Changée au clic sur un constat, jamais ailleurs |
| Sévérités | Trois niveaux propres au panneau, sans effet sur l'export |
| Onglets | Variables gardé ; Comparer et Dépendants dans l'inspecteur ; Diagnostics dans un bloc Structure ; Intégrations et Relevés supprimés, `integrations/profilUcm.ts` et ses tests gardés |
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
- **Une phase finit verte et utilisable.** `npm test`, `npm run typecheck`,
  `npm run build`, puis la recette du mainteneur. La phase suivante attend la
  recette.
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
| Lecture seule de l'explorateur | `tests/loiDeLectureSeule.test.ts`, doubles de `tests/figmaDeTest.ts` qui lèvent à toute mutation | Supprimée, remplacée par la loi d'écriture | P1.2 |
| Écriture de Nomenclature | `plugin-nomenclature/tests/loiDEcriture.test.ts` balaie tout `src/`, suppose `src/ecriture.ts` | Une seule loi d'Architect : seuls `src/ecriture/*.ts` écrivent ; seule `src/ecriture/selection.ts` change la sélection et la vue ; les doubles de test suivent | P1.2 |
| Import de variables par l'explorateur | Seule `src/lecture.ts` importe, et seulement des cibles d'alias | Inchangée jusqu'à P2.5 ; P2.5 l'étend après sonde | P2.5 |
| Paquets séparés | `tests/pluginsSepares.test.ts` liste quatre plugins | Trois plugins, dont `plugin-architect` | P1.1, P1.2 |

## Décisions à prendre avant le lancement

| # | Question | Recommandation |
|---|---|---|
| A | Le moteur de l'exporteur dans le socle (`plugin-socle/src/composant/`) plutôt que dans le kit. Le socle s'exporte fichier par fichier : le bundle de Palettes et des autres plugins ne change pas | Oui |
| B | Renommer `packages/plugin-explorateur` en `packages/plugin-architect`, paquet `ucm-architect-plugin` | Oui |
| C | Repli pendant la fusion : Nomenclature disparaît du dépôt au lot P1.2. Pour s'en servir encore, le mainteneur construit le commit qui précède P1.2 | Noter ce commit dans le plan au lancement de P1.2 |
| D | Les points à corriger de l'exporteur disent « réexportez » et entrent dans le contrat. Token Architect les affiche-t-il tels quels ? | Oui, tels quels ; un texte propre à Token Architect changerait le contrat |
| E | Annulation d'une correction : Ctrl+Z de Figma (un point d'annulation par lot), ou en plus un journal rangé dans le document, comme l'Historique de Nomenclature ? | Ctrl+Z seul ; le journal est l'option lourde |
| F | Thème : l'explorateur est toujours sombre ; Nomenclature suit le thème de Figma | À trancher sur les maquettes M1 |

## Ordre

| Phase | Contenu | Attend |
|---|---|---|
| M | Maquettes des deux modes | rien |
| P0 | Moteur de l'exporteur déplacé dans le socle | décision A ; tourne pendant M |
| K1 | Grammaire des composants dans le kit | note de conception validée ; tourne pendant M |
| P1 | Fusion | M validé, P0, décisions B à F |
| P2 | Lecture et contrôles | P1, K1 |
| P3 | Corrections exactes | P2, sonde S2 |
| P4 | Contraste et accessibilité | P2 |
| P5 | Composant de règles | P2 |
| P6 | Full UCM et bloc Structure | P3 |
| P7 | Génération | P3, P6 |
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
  Après, question, Ignorer, Actualiser. Matrice des variants (C4).
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
  l'interface de l'exporteur. Le type passe dans un fichier à lui, dans
  l'exporteur.
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

- [ ] **K1.0 · Note de conception**, écrite par la conversation principale et
  validée par le mainteneur. Elle tranche :
  - la reconnaissance d'un chemin à positions facultatives :
    `FORMES_DES_CHEMINS` est positionnel et à nombre exact de positions ;
    énumérer les formes ou reconnaître positions facultatives ;
  - la lecture d'un segment qui appartient à deux registres : `text` est un
    rôle et un style (`button/color/primary/text/focus/foreground`) ;
  - le registre qui reçoit `padding`, `gap`, `width`, `height`,
    `border-width` : un registre propre à `components`, pour ne pas changer la
    lecture des autres collections par Nomenclature ;
  - l'accès aux styles déclarés par l'équipe (termes personnalisés).
- [ ] **K1.1 · Implémentation** selon la note. Version et publication du kit,
  tests racine.
  Fait quand : un test du kit reconnaît, avec leurs positions, les chemins de
  la section 2 de la grammaire et refuse ceux de la section 4, écrits à la
  main dans le test ; les tests de Nomenclature passent sans changement
  d'attendu.

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
- [ ] **P1.2 · Sandbox de Nomenclature et loi d'écriture**
  (`implementeur-exigeant`, seul). `git mv` du sandbox de Nomenclature et de
  ses tests dans Architect : `src/nomenclature/` ; `ecriture.ts` devient
  `src/ecriture/noms.ts`. `code.ts` route les demandes des deux. La loi
  d'écriture de la table remplace les deux anciennes, dans le même lot. Les
  invariants de Nomenclature passent dans `plugin-architect/invariants/` ; leur
  seule modification porte sur les chemins. `packages/plugin-nomenclature`
  est supprimé, avec ses entrées dans les scripts, la CI, le registre,
  `pluginsSepares` et les tests racine (`nomsDePalettes`, `loisEntreProduits`,
  `fabriquesDeFichiers`, `releveDeTest`). L'interface de Nomenclature reste
  hors du bundle jusqu'à P1.3.
  Fait quand : les tests du sandbox de Nomenclature passent dans le nouveau
  paquet sans changement d'attendu ; la loi d'écriture refuse, à l'essai, une
  écriture ajoutée hors de `src/ecriture/` ; `npm test` passe.
- [ ] **P1.3 · Interface de Nomenclature dans la barre latérale**
  (`implementeur-exigeant`). `git mv` de `src/ui/` de Nomenclature dans
  `src/ui/nomenclature/` ; la barre latérale du mode Tokens l'affiche selon M1 ;
  thème selon F ; un seul `messages.ts` pour la loi de galerie du socle.
  Fait quand : les tests d'interface de Nomenclature et de l'explorateur sont
  réunis et mis à jour, sans être lancés ; la galerie montre les états de M1 ;
  `npm run build:plugin -- architect` passe.
- [ ] **P1.4 · Onglets et lien avec l'arbre.** Suppression d'Intégrations et de
  Relevés (vues, préférences d'association, états de galerie) ;
  `integrations/profilUcm.ts` et ses tests restent. Comparer et Dépendants dans
  l'inspecteur, Diagnostics dans le bloc Structure, selon M1. Lien entre
  l'arbre et Nomenclature (T2).
  Fait quand : aucun texte ni état de galerie ne cite Intégrations ou Relevés ;
  les tests de `profilUcm` passent ; un test d'interface couvre le lien T2.
- [ ] **P1.5 · Mode Composant et fichier hors UCM.** La disposition du mode
  Composant prend la barre latérale de M2, avec « Aucun contrôle pour
  l'instant » ; le mode d'ouverture suit G3. Sans déclaration UCM, la barre
  latérale des deux modes invite à déclarer l'architecture.
  Fait quand : deux états de galerie, avec et sans déclaration, dans chaque
  mode.
- [ ] **P1.R · Recette.** Le mainteneur lance `npm run test:ui -w ucm-architect-plugin`,
  ouvre Token Architect dans ses deux fichiers, applique un renommage
  Nomenclature et l'annule. La taille du bundle d'Architect est relevée.

### P2 · Lecture et contrôles

- [ ] **P2.1 · Relevé du composant.** `src/lectureDuComposant.ts` lit tous les
  variants d'un jeu, plus les propriétés de composant : axes, booléens,
  textes, remplacements d'instance (C3). Borne et lots de la vue Composant
  gardés, comptés sur l'ensemble des variants.
  Fait quand : test sur nœuds factices d'un jeu à six variants ; un jeu qui
  dépasse la borne rend le nombre de calques non lus.
- [ ] **P2.2 · Noms des tokens de la bibliothèque.**
  `plugin-palettes/src/lectureDesVariables.ts` passe dans le socle par
  `git mv` ; Palettes et Architect l'importent. Choix automatique de la
  bibliothèque la plus liée, modifiable dans la Configuration (Q11), sous une
  clé déclarée dans le kit.
  Fait quand : tests de Palettes inchangés ; un test choisit la bibliothèque
  la plus liée entre deux.
- [ ] **P2.3 · Contrôles dans le kit.** Fonctions pures sur le relevé et la
  liste des noms : nommage (C7 à C11), mapping (C15 à C19, C21), couche (C20,
  C61), oublis (C31 à C33). C30 et C41 restent ceux du moteur. Chaque constat
  porte un code, le calque, le variant et les faits lus, sans correction.
  Version et publication du kit.
  Fait quand : chaque contrôle a un test positif et un test négatif ; un
  relevé qui reproduit Button et Alert de l'export du mainteneur, écrit à la
  main, rend les écarts de la section 4 de la grammaire.
- [ ] **P2.4 · Panneau.** La barre latérale affiche les constats du kit et les
  points du moteur (C38, décision D), par famille, avec les trois sévérités ;
  matrice des variants (C4) ; un clic sélectionne le calque (C5) ; l'analyse
  du moteur se lance au bouton Actualiser (C74), jamais à chaque changement de
  sélection.
  Fait quand : états de galerie d'un composant sans constat, avec constats de
  chaque sévérité, et en cours d'analyse ; la sélection ne change que par
  `src/ecriture/selection.ts`.
- [ ] **S1 · Sonde : import d'une variable de bibliothèque.** Effet de
  `importVariableByKeyAsync` sur le fichier (variable visible, gardée après
  fermeture, marque le fichier modifié), temps pour 200 variables.
- [ ] **P2.5 · Bibliothèque dans le mode Tokens (T14)**, si S1 le permet.
  Arbre depuis les noms ; valeurs et alias d'un groupe importés à son
  ouverture, par lots de huit ; invariant d'import étendu.
  Fait quand : test sur doubles ; l'invariant d'import décrit la nouvelle
  règle.
- [ ] **P2.R · Recette.** Le mainteneur ouvre Button et Alert. Les constats
  doivent correspondre à la section 4 de la grammaire. Il relève le temps
  d'analyse du plus gros jeu de variants.

### P3 · Corrections exactes

- [ ] **S2 · Sonde : écrire une liaison.** Sur un composant d'un fichier de
  test : `setBoundVariable` sur un champ numérique ;
  `figma.variables.setBoundVariableForPaint` puis réaffectation de `fills` et
  `strokes` ; `setRangeFills` sur un texte ; un Ctrl+Z après
  `figma.commitUndo` défait-il tout le lot ?
- [ ] **P3.0 · Note de conception de l'écriture**, d'après S2 : champs
  couverts, ordre des écritures, relecture, objet changé depuis l'aperçu,
  annulation (décision E).
- [ ] **P3.1 · Écriture des liaisons.** `src/ecriture/liaisons.ts` selon P3.0.
  Fait quand : un test par sorte d'écriture (nombre, peinture de cadre,
  contour, texte) sur doubles ; un objet changé depuis l'aperçu est sauté et
  compté.
- [ ] **P3.2 · Corrections exactes** (`implementeur-exigeant`). Token frère
  (C22), propagation depuis un variant de référence (C24), liaison initiale
  par la grammaire (C25), pour les couleurs et les tailles (C29), seulement
  quand chaque nom calculé existe et n'a qu'un candidat. Aperçu Aujourd'hui et
  Après, lot, groupes de même cause (C75).
  Fait quand : un test montre qu'un cas à deux candidats devient une question
  et n'entre jamais dans le lot ; un test montre qu'un nom absent ne produit
  rien.
- [ ] **P3.3 · Renommer une valeur de variante (C12).** Écriture du nom des
  variants du jeu ; le constat annonce que le contrat publié change.
  Fait quand : test sur doubles ; les instances du jeu gardent leur variant.
- [ ] **P3.4 · Questions et Ignorer.** Questions à plusieurs candidats, aucun
  coché (C70, C76) ; Ignorer rangé à la racine du document, sous une clé de
  `ESPACE_ARCHITECT` déclarée dans le kit (C71).
  Fait quand : un constat ignoré disparaît et revient quand on l'y remet ;
  aucune donnée n'est écrite sur un composant.
- [ ] **P3.R · Recette.** Le mainteneur corrige Button sur une copie de son
  fichier, vérifie chaque liaison et annule.

### P4 · Contraste et accessibilité

- [ ] **P4.1** Contraste des textes, icônes, contours et anneaux contre le
  fond effectif, dans chaque variant et chaque combinaison de modes, fonds
  unis seulement (C49, C50) ; variant désactivé exclu (C53) ; niveau AA ou
  AAA dans la Configuration (C78).
  Fait quand : tests d'un texte sur fond uni, sur fond semi-transparent posé
  sur un fond uni, et sur un dégradé, qui rend une limite.
- [ ] **P4.2** Taille de cible : constat sous 24 × 24 px, recommandation sous
  44 × 44 px, pour un composant qui a un axe d'état (C52). Variant de focus
  absent ou sans anneau (C36). Anneau comparé à la recommandation du kit
  (C51).
  Fait quand : un test par contrôle, positif et négatif.

### P5 · Composant de règles

- [ ] **P5.1** Composant sans instance de règles (C43) ; validation des règles
  par le moteur (C44) ; règle `@prop` manquante ou orpheline (C45).
  Fait quand : un test par constat.
- [ ] **P5.2** Génération des règles (C46) et correction sans écraser une
  instance remplie (C47), par `template/ecriture.ts` du socle ; Architect entre
  dans la liste de ses importeurs permis.
  Fait quand : la loi du document intact passe avec Architect dans la liste ;
  un test montre qu'une instance remplie n'est pas réécrite.

### P6 · Full UCM et bloc Structure

- [ ] **P6.1** Règle du dossier (C59), état et dossier (C60), variable du
  thème hors de ses champs (C63), dans le kit.
- [ ] **P6.2** Mapping vers le thème (C27) : le dossier vient d'une question
  par valeur de style ; le reste suit la table des dossiers.
- [ ] **P6.3** Bloc Structure du mode Tokens : chaînes cassées, cas (a), (b),
  (c) et (f) de la recherche sur la structure, règles du profil UCM sans
  association manuelle des couches.
- [ ] **P6.4** Correction des portées (T7).

Fait quand, pour chaque lot : un test positif et un test négatif par règle ;
P6.3 rend les cas (a) à (c) et (f) sur un relevé écrit à la main.

### P7 · Génération des tokens d'un composant

- [ ] **P7.1 · Plan, dans le kit.** Du relevé et des réponses à la liste des
  variables et de leurs cibles ; chaque entrée est exacte ou devient une
  question.
  Fait quand : le plan d'Alert rend les variables de l'aperçu, et un calque
  nommé `Frame 12` rend une question.
- [ ] **P7.2 · Mode Composant.** Questions, aperçu, plan rangé dans
  `figma.clientStorage` ; copie en texte en secours. Le texte à l'écran dit
  que le plan reste sur ce poste et dans cette application.
- [ ] **P7.3 · Mode Tokens.** Plan en attente ; le plugin vérifie que les
  cibles du plan existent parmi les variables locales, ce qui reconnaît le
  fichier des tokens ; aperçu ; création des seules variables manquantes et
  de leurs alias ; annulation.
- [ ] **P7.4 · Retour au composant.** Liaison par l'identifiant du calque gardé
  dans le plan ; la variable se retrouve par son nom dans la bibliothèque
  publiée.
- [ ] **P7.5 · Règle de Nomenclature préparée (C13)**, par le même transfert.
- [ ] **P7.6 · Tailles.** Même chemin pour `size`, valeur exacte dans
  l'échelle de `layout`.

Fait quand, pour P7.2 à P7.6 : un test par étape sur doubles ; recette du
mainteneur sur Alert.

### P8 · Typographie et icônes

- [ ] **P8.1** Style de texte et variables de typographie (C64, C65) ; icônes
  (C66, C67).
  Fait quand : un test par contrôle.

## Hors du plan

| Fonction | Raison |
|---|---|
| C6, C73 : analyse d'une page entière et rapport | Après la recette d'un composant |
| C14 : même axe nommé autrement dans deux composants | Demande de lire plusieurs composants |
| C23, C37, C54 à C58, C72, C77, C79 | Utilité faible ou partielle |
| C26 : mapping par valeur | Contraire à la règle d'exactitude |
| C30, C41 dans le kit | Déjà rendus par le moteur de l'exporteur |
| C39, C40 : parité du code, écart avec le contrat publié | Hors de Figma, ou demande le réseau |
| C48 : rédaction par IA | Réseau |
| T3 : effet d'un renommage montré dans l'arbre | Après la recette de P1 |
| T4 : lecture unique des variables | Seulement si la recette montre une lenteur |
| T8 à T11, T13 | Utilité faible, ou doublon de Palettes |
| G8 : fusion de l'exporteur | Écartée |

## Revue du plan

Une revue a relu la première version (commit `9ab1ee40`). Changements :

| Constat | Changement |
|---|---|
| Garder Nomenclature jusqu'à la recette est impossible : un plugin ne peut pas importer un autre (`tests/pluginsSepares.test.ts`) | Nomenclature quitte le dépôt en P1.2 ; repli par le commit précédent (décision C) |
| Le contrat ne garde ni calque ni champ par liaison | Deux lecteurs du composant, décision écrite ; P2.1 étend `lectureDuComposant.ts` |
| Les témoins commités contredisent `invariants/tests-du-moteur.md` et ne peuvent pas rejouer des scénarios qui montent chacun leur `figma` | Témoins supprimés ; les tests existants sont la garde |
| `Annonce` tire toute l'interface de l'exporteur ; tests, `lois.ts` et invariants nommés par d'autres fichiers | P0.1 sort le type ; tests et invariants restent dans l'exporteur ; routes de `domiciles.json` ajoutées |
| Deux lois d'écriture incompatibles, dossiers différents en P1.2 et P1.3 | Une seule loi, table « Lois qui changent », écrite avec le déplacement du sandbox |
| `setBoundVariable` ne lie pas une couleur | Sonde S2 et note P3.0 avant l'écriture |
| Ignorer rangé sur un composant | Rangé à la racine du document |
| P1.4 supprimait `profilUcm.ts`, utilisé par P6.3 et des tests racine | Gardé |
| Liste de renommage incomplète ; CI Chromium rouge à chaque push d'interface | Liste complétée ; règle de push des lots d'interface |
| `FORMES_DES_CHEMINS` positionnel, `text` à double sens, registre non nommé | Note de conception K1.0 validée avant K1.1 |
| C30 et C41 en double avec le moteur ; textes « réexportez » | Retirés du kit ; décision D |
| Import par clé contraire à l'invariant de l'explorateur, effet inconnu | Sonde S1 avant P2.5, rendu facultatif |
| Analyse du moteur coûteuse à chaque sélection | Au bouton Actualiser |
| P1.3 trop gros | Découpé en P1.2 (sandbox et loi) et P1.3 (interface) |
| Lots sans critère de fin | Un « Fait quand » par lot ou par phase |
| C3, C4, C25, C29, C36, C78, T2, T3, G3 absents | Placés dans un lot, ou dans « Hors du plan » |
| Plan de génération : clés, fichier des tokens, poste | P7.3 et P7.4 précisés ; texte sur le poste en P7.2 |
| P0.3 recréait `handleExportComponent`, qui existe déjà sans réseau | Supprimé |
| Lots qui touchent toute la documentation pendant qu'une autre session travaille | Lots « seul », arbre propre |

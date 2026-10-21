Formule à respecter pour tous les agents:
"Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better."


# Plan d'implémentation de UCM Token Architect

Ce plan construit UCM Token Architect, décrit dans le
[document préparatoire](./PREPARATION-TOKEN-ARCHITECT.md), la
[grammaire des composants](./GRAMMAIRE-DES-COMPOSANTS.md) et l'
[aperçu de la génération](./APERCU-GENERATION-TOKENS-COMPOSANT.md). Les
numéros C, T et G renvoient aux fonctions du document préparatoire.

Cocher une case quand son commit est fait, avec le hash entre parenthèses. Les
cases se cochent dans un commit à part, après celui du lot.

## Décisions qui encadrent le plan

| Sujet | Décision |
|---|---|
| Plugin | UCM Token Architect remplace UCM Token Explorer et UCM Nomenclature ; il garde l'identifiant de manifeste de l'explorateur |
| Périmètre | Contrôles et corrections pour un fichier qui déclare l'architecture UCM ; ailleurs, la navigation seule |
| Écriture | Token Architect écrit dans le document ; une loi d'écriture remplace la loi de lecture seule de l'explorateur |
| Exactitude | Une correction n'est proposée que si une règle écrite la tire d'un fait lu dans Figma, avec un seul candidat ; le reste est une question sans réponse cochée |
| Corrections | Le modèle de Nomenclature : lot avec aperçu, Appliquer, une annulation ; questions à part |
| Contrôles de l'export | Partagés entre l'exporteur et Token Architect, sans copie |
| Sélection | Changée au clic sur un constat, jamais ailleurs |
| Sévérités | Trois niveaux propres au panneau, sans effet sur l'export |
| Onglets | Variables gardé ; Comparer et Dépendants dans l'inspecteur ; Diagnostics dans un bloc Structure ; Intégrations et Relevés supprimés |
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
- **Une phase finit verte et utilisable.** Chaque phase se termine par
  `npm test`, `npm run typecheck`, `npm run build` et une recette du
  mainteneur. La phase suivante attend la recette.
- **Aucun geste manuel inventé.** Un geste que le designer devrait retenir se
  présente comme une décision, avec une alternative automatique.
- **Les migrations du fichier Figma restent au mainteneur.** Le plan ne
  déplace ni ne renomme aucune variable d'un fichier réel.

## Règles d'exécution

- Un lot par appel d'agent : `implementeur` par défaut,
  `implementeur-exigeant` quand le lot touche plusieurs lecteurs d'une même
  règle ou une interface au pixel près (indiqué sur le lot). Deux agents au
  plus en même temps, sur des fichiers disjoints.
- Le prompt d'un agent contient la note du lot, la sortie de
  `npm run agents:lire -- <chemins du lot>`, les fichiers concernés et les
  critères de fin.
- Avant chaque lot : `git status`. Un fichier modifié par une autre session
  n'entre pas dans le lot ; le lot s'arrête et remonte la question.
- Les textes destinés au designer sont écrits par la conversation principale,
  avec la skill `rediger-diagnostics-ucm`, avant le lot qui les affiche.
  L'agent les recopie.
- La conversation principale relit chaque diff, fait lancer les vérifications
  par un `verificateur`, lance `npm run agents:diff`, puis commite par chemins
  explicites et pousse sur `main`.
- Un changement du kit suit la règle du dépôt : tests racine, version du kit,
  publication de `@ucm-kit/core` (et de `@ucm-kit/cli` et
  `@ucm-kit/adapter-typescript` quand leurs dépendances changent).

## Décisions à prendre avant le lancement

| # | Question | Recommandation |
|---|---|---|
| A | Où vit le moteur partagé de l'exporteur ? Le kit est publié sur npm, sert à `ucm check` et n'appelle jamais `figma` ; le moteur lit des nœuds Figma | Dans le socle, `packages/plugin-socle/src/composant/`. Le socle porte déjà ce que les plugins partagent et se lit en source. Les règles pures (grammaire, registres, contrôles de la phase P2) vont dans le kit |
| B | Renommer le dossier `packages/plugin-explorateur` et son paquet ? | Oui : `packages/plugin-architect`, paquet `ucm-architect-plugin`. Nomenclature a suivi le même chemin lors de son renommage |
| C | Combien de temps garder le plugin Nomenclature séparé ? | Jusqu'à la recette de la phase P1, puis le supprimer |

## Ordre

| Phase | Contenu | Attend |
|---|---|---|
| M | Maquettes des deux modes | rien |
| P0 | Moteur de l'exporteur déplacé dans le socle | décision A ; peut tourner pendant M |
| P1 | Fusion : coquille, Nomenclature dans la barre latérale, onglets, loi d'écriture | M validé, P0, décisions B et C |
| P2 | Lecture du composant et des bibliothèques, contrôles en lecture | P1 |
| P3 | Corrections exactes | P2 |
| P4 | Contraste et accessibilité | P2 |
| P5 | Composant de règles | P3 |
| P6 | Contrôles full UCM et bloc Structure | P3 |
| P7 | Génération des tokens d'un composant | P3, P6 |
| P8 | Typographie et icônes | P2 |

P4 et P5 peuvent tourner ensemble ; P8 vient en dernier.

## Lots

### M · Maquettes

Faites par la conversation principale : une maquette est une conception, pas
un lot délégué.

- [ ] **M1 · Mode Tokens.** Arbre et table de l'explorateur à gauche ;
  Nomenclature à droite, ses onglets Renommages, Questions, Règles et sa
  Configuration, à l'identique. Inspecteur avec « Comparer avec un autre mode »
  et « Utilisée par ». Bloc Structure. État d'un fichier sans variable locale
  qui affiche une bibliothèque (T14). État d'un fichier qui ne déclare pas UCM
  (navigation seule).
- [ ] **M2 · Mode Composant.** Aperçu et liste des liaisons à gauche ; barre
  latérale des constats à droite : familles, compte par sévérité, constat
  dépliable, lot de corrections avec Aujourd'hui et Après, question à
  plusieurs candidats, Ignorer. Matrice des variants (C4).
- [ ] **M3 · Génération.** Les deux écrans de l'aperçu : questions par style
  dans le fichier des composants, plan en attente dans le fichier des tokens.

Règles des maquettes : partir des états réels de la galerie de l'explorateur
et de Nomenclature, figés, en thème sombre ; une idée par phrase ; mots de
designer, sans terme technique ; `scripts/controle-style.mjs` et l'audit de
maquette avant de montrer ; aucune capture Chromium.

Fait quand : le mainteneur valide la largeur de la barre latérale, la taille
de la fenêtre dans chaque mode, la place des onglets déplacés, les trois
sévérités et la forme d'un constat. Ses choix entrent dans la section
« Décisions » de ce plan.

### P0 · Le moteur de l'exporteur dans le socle

Le moteur (`plugin-exporter/src/contract/`, 40 fichiers, environ
12 700 lignes) lit des nœuds Figma. Ses tests le font tourner sur des nœuds
factices (`tests/aides/figmaFaux.ts`). Il se déplace sans réécriture.

- [ ] **P0.1 · Témoins.** Un test de l'exporteur rejoue chaque scénario des
  tests existants qui produit un contrat, et compare le contrat sérialisé et
  la liste des points à corriger à un fichier témoin commité. Le témoin est
  écrit avant tout déplacement.
  Fait quand : le test passe, et une modification volontaire d'un message le
  fait échouer.
- [ ] **P0.2 · Déplacement** (`implementeur-exigeant`). `git mv` de
  `src/contract/`, `src/template/`, `src/variables.ts` et de leurs
  dépendances vers `plugin-socle/src/composant/` ; leurs tests vers
  `plugin-socle/tests/`. L'exporteur importe
  `ucm-plugin-socle/src/composant/...`. Les invariants qui portent sur le
  moteur passent dans les invariants du socle ; `SPEC.md` reste dans
  l'exporteur et ses liens sont mis à jour.
  Fait quand : témoins identiques ; `npm run test:paquet -- exporter` et
  `-- socle` passent ; `npm run build:plugin -- exporter` passe ; la taille
  du bundle de l'exporteur change de moins de 1 % ; `npm run agents:diff` ne
  liste aucun lien cassé.
- [ ] **P0.3 · Analyse sans export.** Une fonction du socle,
  `analyserLeComposant(noeud)`, rend le contrat et les points à corriger,
  sans réseau ni configuration de dépôt. L'exporteur l'appelle.
  Fait quand : la loi du document intact passe sur cette fonction ; témoins
  identiques.
- [ ] **P0.R · Recette.** Le mainteneur réexporte deux composants déjà publiés
  dans UCM-Playground. La demande de fusion ne doit montrer aucune
  différence.

### P1 · La fusion

- [ ] **P1.1 · Renommage.** Décision B : dossier, paquet, nom du manifeste
  « UCM Token Architect », identifiant gardé, permission `teamlibrary`.
  `scripts/construire-plugin.mjs`, la CI, `.agents/domiciles.json`, les
  guides et les cartes suivent.
  Fait quand : `npm run build:plugin -- architect` passe ; `agents:diff` ne
  liste aucun chemin mort.
- [ ] **P1.2 · Loi d'écriture.** `tests/loiDeLectureSeule.test.ts` devient
  `tests/loiDEcriture.test.ts` : seuls `src/ecriture/*` et la route de
  sélection écrivent ou changent la sélection. Le fichier d'écriture de
  Nomenclature y entre en P1.3.
  Fait quand : le test refuse une écriture ajoutée ailleurs, à l'essai.
- [ ] **P1.3 · Nomenclature dans la barre latérale**
  (`implementeur-exigeant`). `git mv` du code de Nomenclature dans
  `src/nomenclature/` (sandbox) et `src/ui/nomenclature/` (écran). `code.ts`
  route les demandes des deux. La barre latérale du mode Tokens affiche ses
  onglets selon M1. Ses invariants passent avec lui, sans changement de règle.
  Les deux lectures des variables restent séparées (explorateur et inventaire
  de Nomenclature) : leur fusion (T4) ne se fait que si la recette montre une
  ouverture lente.
  Fait quand : tous les tests de Nomenclature passent dans le nouveau paquet ;
  `ESPACE_ARCHITECT` et ses clés sont inchangés ; les règles d'un fichier
  posées par Nomenclature se relisent.
- [ ] **P1.4 · Onglets.** Suppression d'Intégrations et de Relevés (code,
  préférences, tests, états de galerie). Comparer et Dépendants passent dans
  l'inspecteur, Diagnostics dans le bloc Structure, selon M1.
- [ ] **P1.5 · Mode Composant élargi.** La disposition du mode Composant prend
  la barre latérale de M2, vide de constats : elle affiche « Aucun contrôle
  pour l'instant ». Les valeurs sans token restent dans la liste de gauche.
- [ ] **P1.6 · Fichier hors UCM.** Sans déclaration UCM, la barre latérale
  des deux modes affiche une invitation à déclarer l'architecture et aucun
  contrôle ; la navigation reste entière.
- [ ] **P1.R · Recette.** Le mainteneur ouvre Token Architect dans son fichier
  de tokens et dans son fichier de composants, applique un renommage
  Nomenclature et l'annule.
- [ ] **P1.7 · Retrait de Nomenclature.** Suppression de
  `packages/plugin-nomenclature` après la recette ; registre, scripts, CI et
  documents suivent.

### P2 · Lecture et contrôles

- [ ] **K1 · Kit : grammaire.** `FORMES_DES_CHEMINS` reçoit la forme de
  `components` ; `FAMILLES_LAYOUT` reçoit `icon` ; les registres reçoivent
  `padding`, `gap`, `width`, `height`, `border-width`. Tests du kit et tests
  racine ; version et publication.
  Fait quand : les noms de l'export du mainteneur cités dans la grammaire se
  reconnaissent comme attendu, en test.
- [ ] **P2.1 · Relevé du composant.** Token Architect appelle
  `analyserLeComposant` sur le jeu de variants sélectionné, tous variants
  compris, et en tire un relevé sérialisable : axes, variants, calques,
  champ peint, variable liée et son nom.
  Fait quand : test sur nœuds factices ; borne de calques et lecture par lots
  reprises de la vue Composant.
- [ ] **P2.2 · Noms des tokens de la bibliothèque.** Lecture des noms, clés et
  types par `figma.teamLibrary` ; choix automatique de la bibliothèque la plus
  liée, modifiable dans la Configuration (Q11).
- [ ] **P2.3 · Contrôles dans le kit.** Fonctions pures du kit sur le relevé
  et la liste des noms : nommage (C7 à C11), mapping (C15 à C19, C21), couche
  (C20, C61), oublis (C30 à C33), variable introuvable (C41). Chaque constat
  porte un code, le calque, le variant, les faits lus, et aucune correction.
  Version et publication du kit.
  Fait quand : chaque contrôle a un test positif et un test négatif ; les
  écarts de la section 4 de la grammaire se retrouvent sur un relevé qui
  reproduit l'export du mainteneur.
- [ ] **P2.4 · Panneau.** La barre latérale affiche les constats du kit et les
  points à corriger de l'exporteur (C38), par famille, avec les trois
  sévérités ; un clic sélectionne le calque (C5) ; un bouton Actualiser
  relance (C74).
- [ ] **P2.5 · Bibliothèque dans le mode Tokens (T14).** Arbre affiché depuis
  les noms ; valeurs et alias d'un groupe importés à son ouverture, par lots
  de huit ; Nomenclature invite à ouvrir le fichier des tokens pour renommer.
- [ ] **P2.R · Recette.** Le mainteneur ouvre Button et Alert. Les constats
  doivent correspondre à la section 4 de la grammaire. Il relève le temps de
  lecture du plus gros jeu de variants et le temps d'ouverture d'un groupe de
  bibliothèque.

### P3 · Corrections exactes

- [ ] **P3.1 · Écriture des liaisons.** `src/ecriture/liaisons.ts` : import
  par clé, `setBoundVariable`, relecture avant écriture, point d'annulation
  par lot. Un objet changé depuis l'aperçu est sauté et compté.
- [ ] **P3.2 · Corrections exactes** (`implementeur-exigeant`). Token frère
  (C22) et propagation depuis un variant de référence (C24), seulement quand
  chaque nom substitué existe et n'a qu'un candidat. Aperçu Aujourd'hui et
  Après, lot, groupes de même cause (C75).
  Fait quand : un test montre qu'un cas à deux candidats devient une question
  et n'entre jamais dans le lot.
- [ ] **P3.3 · Renommer une valeur de variante (C12).** Écriture sur le jeu de
  variants ; le constat annonce que le contrat publié change.
- [ ] **P3.4 · Questions et Ignorer.** Questions à plusieurs candidats, aucun
  coché (C70, C76) ; Ignorer rangé dans les données partagées du composant
  (C71).
- [ ] **P3.R · Recette.** Le mainteneur corrige Button sur une copie de son
  fichier et vérifie chaque liaison.

### P4 · Contraste et accessibilité

- [ ] **P4.1** Contraste des textes, icônes, contours et anneaux contre le
  fond effectif, dans chaque variant et chaque combinaison de modes, fonds
  unis seulement ; un fond dégradé, image ou fusionné rend une limite (C49,
  C50). Variant désactivé exclu (C53). Calcul et seuils du kit.
- [ ] **P4.2** Taille de cible : constat sous 24 × 24 px, recommandation sous
  44 × 44 px, pour un composant qui a un axe d'état (C52). Anneau de focus
  comparé à la recommandation du kit (C51).

### P5 · Composant de règles

- [ ] **P5.1** Composant sans instance de règles (C43) ; validation des règles
  par le moteur déplacé en P0 (C44) ; règle `@prop` manquante ou orpheline
  (C45).
- [ ] **P5.2** Génération des règles depuis le composant (C46) et correction
  sans écraser une instance remplie (C47), par l'écriture de
  `template/ecriture.ts` déplacée en P0.

### P6 · Full UCM et bloc Structure

- [ ] **P6.1** Règle du dossier (C59), état et dossier (C60), variable du
  thème hors de ses champs (C63), dans le kit.
- [ ] **P6.2** Mapping vers le thème (C27) : le dossier vient d'une question
  par valeur de style ; le reste suit la table des dossiers.
- [ ] **P6.3** Bloc Structure du mode Tokens : chaînes cassées (l'ancien
  onglet Diagnostics), cas (a), (b), (c) et (f) de la recherche sur la
  structure, règles `couche`, `valeur-directe`, `portee`, `nuance` du profil
  UCM sans association manuelle des couches.
- [ ] **P6.4** Correction des portées (T7).

### P7 · Génération des tokens d'un composant

- [ ] **P7.1 · Plan, dans le kit.** Du relevé et des réponses aux questions à
  la liste des variables et de leurs cibles, selon l'aperçu ; chaque entrée
  est exacte ou devient une question.
- [ ] **P7.2 · Mode Composant.** Questions, aperçu, plan rangé dans
  `figma.clientStorage` ; copie en texte en secours.
- [ ] **P7.3 · Mode Tokens.** Plan en attente, aperçu, création des seules
  variables manquantes et de leurs alias, annulation.
- [ ] **P7.4 · Retour au composant.** Liaison par l'identifiant du calque
  gardé dans le plan.
- [ ] **P7.5 · Règle de Nomenclature préparée (C13)**, par le même transfert.
- [ ] **P7.6 · Tailles.** Même chemin pour `size`, valeur exacte dans
  l'échelle de `layout`.

### P8 · Typographie et icônes

- [ ] **P8.1** Style de texte et variables de typographie (C64, C65) ; icônes
  (C66, C67).

## Hors du plan

| Fonction | Raison |
|---|---|
| C6, C73 : analyse d'une page entière et rapport | Après la recette d'un composant |
| C14 : même axe nommé autrement dans deux composants | Demande de lire plusieurs composants |
| C23, C37, C54 à C58, C77, C79 | Utilité faible ou partielle |
| C26 : mapping par valeur | Contraire à la règle d'exactitude |
| C39, C40 : parité du code, écart avec le contrat publié | Hors de Figma, ou demande le réseau |
| C48 : rédaction par IA | Réseau |
| T4 : lecture unique | Seulement si la recette montre une lenteur |
| T8 à T11, T13 | Utilité faible, ou doublon de Palettes |
| G8 : fusion de l'exporteur | Écartée |

## Revue du plan

À remplir après la revue.

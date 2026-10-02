# Vue composant de l'explorateur : plan de recherche

Plan de recherche, sans décision d'implémentation. La
[maquette](./MAQUETTE-VUE-COMPOSANT.html) s'ouvre dans un navigateur, sans
connexion à Figma, sur quatre composants de UCM Playground. Aucun essai n'a encore été fait dans Figma :
la section 4 liste ce qui reste à y vérifier.

## 1. Le besoin

Un designer travaille dans un fichier qui consomme une bibliothèque. Le fichier
ne porte aucune variable locale. Sur un composant, le panneau de Figma nomme la
variable liée à chaque propriété, par exemple `button/primary/background`, et
s'arrête là. Les alias suivants, les collections traversées et la valeur
finale restent dans la bibliothèque.

Le designer sélectionne un composant et lit, pour chaque token du composant :

- la propriété qui le porte ;
- chaque alias de la chaîne, avec sa collection et le mode retenu ;
- la valeur finale.

L'affichage reste court : peu de texte, une ligne par token, la chaîne à la
demande.

## 2. Ce que le plugin fait aujourd'hui

| Sujet | État dans `packages/plugin-explorateur` | Écart avec le besoin |
|---|---|---|
| Relevé | `lireLeReleve` part des collections et des variables locales, puis lit les cibles de leurs alias | Sans variable locale, le relevé est vide. Une variable de bibliothèque liée à un calque n'y entre pas |
| Sélection | `envoyerSelection` (`src/code.ts`) lit les liaisons du calque sélectionné seul | Les calques internes du composant ne sont pas lus |
| Affichage | L'onglet Calques liste une propriété et un lien vers la variable | Le lien affiche un identifiant quand la variable manque à l'index. Aucune chaîne ne s'affiche |
| Fenêtre | 1200 × 800, arbre, table et inspecteur | Trois panneaux vides dans un fichier sans variable |

Quatre briques existent et se réutilisent sans changement de contrat :

- `liaisonsDuNoeud` et `modesDuNoeud` (`src/consommateurs.ts`) lisent les
  liaisons et les modes effectifs d'un calque ;
- `resoudre` (`src/resolution.ts`) rend la chaîne dans les modes d'un calque ;
- `cleDeBibliotheque` et l'import par clé (`src/lecture.ts`) lisent une cible
  de bibliothèque ;
- `resolveForConsumer` (`src/navigation.ts`) donne la valeur que Figma rend.

## 3. La proposition de la maquette

Le designer sélectionne un composant sur le canevas de Figma. Le plugin affiche
ce composant et ses tokens, un seul composant à la fois. Une nouvelle sélection
remplace l'affichage. Dans la maquette, le cadre « Figma » simule le canevas et
ses calques ; seule la fenêtre flottante est le plugin.

La fenêtre est étroite, 364 × 680 px dans la maquette. Elle porte une seule
colonne.

| État | Contenu |
|---|---|
| Rien de sélectionné | Un pictogramme et « Sélectionnez un composant » |
| Composant avec tokens | Nom, variant, modes du calque, aperçu, composants imbriqués, puis une ligne par token, groupée par nature |
| Chaîne interrompue | La ligne affiche « interrompue », la chaîne nomme la dernière étape lue et la cause |
| Composant sans token | « Aucun token », puis les valeurs directes |

### Le jeu de la maquette

Button, Alert, TileLink et StressTest viennent des contrats de UCM Playground,
premier variant de chacun. Leurs chaînes viennent de son `tokens.json`. Tag et
Avatar sont fictifs : ils portent la chaîne interrompue et le composant sans
token.

| Composant | Calques | Composants imbriqués | Variables liées | Lignes affichées |
|---|---|---|---|---|
| Button | 5 | 0 | 15 | 8 |
| Alert | 7 | 1 | 19 | 10 |
| StressTest | 52 | 10 | 139 | 52 |

Une ligne par variable liée demanderait 139 lignes pour StressTest. Les tokens
de ses dix composants imbriqués en ajouteraient 99.

### Les règles qui réduisent un composant complexe

1. Une ligne représente un token, quel que soit le nombre de calques qui le
   portent. La ligne affiche `×12` quand douze calques le portent, et la ligne
   dépliée les nomme.
2. Un style de texte tient sur une ligne. La ligne dépliée liste ses cinq
   variables.
3. La vue ne lit pas les calques d'un composant imbriqué. Elle le nomme dans une
   rangée sous l'aperçu, `Button ×2`. Un clic l'ouvre à la place du composant
   lu, et un fil d'Ariane ramène au parent. La règle reprend celle de
   `composes` dans le contrat : le parent ne décrit pas les internes d'une
   dépendance.
4. Au-delà de 12 lignes, chaque section s'ouvre repliée. Une section repliée
   affiche un résumé d'une ligne : les pastilles des couleurs, les valeurs
   distinctes des nombres, les noms des styles. Un clic sur une pastille ouvre
   la section et la chaîne de ce token.
5. La vue suit la sélection de Figma. Un calque sélectionné dans le composant
   restreint la vue à ce calque et à ses descendants.
6. La ligne compacte tient sur 28 px. Une pastille pleine désigne un fond, une
   pastille évidée un contour, une pastille marquée « A » un texte. Le nom perd
   le préfixe commun aux tokens du composant, `stresstest/info/`. La première
   étape de la chaîne écrit le nom entier.
7. Le survol d'une ligne entoure ses calques dans l'aperçu.
8. Une loupe ouvre un filtre sur le nom et la valeur.

Mesures prises dans la maquette, fenêtre de 680 px :

| Affichage | Hauteur du contenu | Défilement |
|---|---|---|
| StressTest, cinq sections repliées | 612 px | Aucun |
| StressTest, tout déplié | 1 893 px | Trois hauteurs de fenêtre |
| StressTest, calque `UserInput` sélectionné, 14 tokens dépliés | 819 px | 207 px |
| Alert, 10 lignes ouvertes | 612 px | Aucun |

Deux sélecteurs en haut de page comparent les options encore ouvertes :

| Sélecteur | Options | Coût mesuré |
|---|---|---|
| Regroupement | Nature, ou Partie : une section par calque de premier niveau | Par partie, StressTest fait huit sections et défile de 83 px |
| Ligne | Compacte, ou Détaillée : la propriété au-dessus du nom | Détaillée, Alert passe de 612 à 808 px et défile |

## 4. Questions à lever dans Figma

Chaque question se vérifie sur un fichier vide qui consomme `intencial-library`,
puis sur un fichier qui consomme une bibliothèque sans UCM.

| # | Question | Ce qui en dépend |
|---|---|---|
| R1 | `getVariableByIdAsync` rend-elle une variable de bibliothèque liée à un calque, avec ses valeurs par mode et sa collection ? | Le point de départ de chaque chaîne |
| R2 | Les cibles suivantes se lisent-elles jusqu'à la primitive : variable masquée à la publication, bibliothèque d'une bibliothèque, bibliothèque sans accès ? | La part des chaînes complètes, et le texte d'une chaîne interrompue |
| R3 | L'import par clé abonne le fichier à chaque variable de la chaîne. Cet effet est-il visible pour le designer, et acceptable sur un fichier client ? | La loi de lecture seule et son invariant sur l'import |
| R4 | `resolvedVariableModes` d'un calque nomme-t-il les collections de bibliothèque ? Que vaut le mode d'une collection intermédiaire que le calque ne porte pas ? | L'exactitude du mode affiché à chaque étape |
| R5 | Deux bibliothèques déclarent le même identifiant de mode : `separerLesModes` garde-t-il le rapprochement avec le mode du calque ? | La borne déjà écrite dans SPEC.md, section Lecture |
| R6 | Un style de texte, de couleur ou d'effet de bibliothèque porte des variables. Le calque les expose-t-il, ou faut-il lire le style ? | Les tokens de typographie, souvent portés par un style |
| R7 | Que lire d'une sélection : instance, composant, ensemble de variants, instance imbriquée, calque masqué ? | Le périmètre et le temps de lecture |
| R8 | La valeur de la chaîne égale-t-elle `resolveForConsumer` sur chaque token d'un composant réel ? | La confiance dans la valeur finale |
| R10 | `exportAsync` rend-il l'aperçu d'un composant sans écrire dans le document, et en combien de temps ? Que faire d'une sélection de plusieurs calques ? | L'aperçu dans le plugin, et la règle « un composant à la fois » |
| R11 | Une instance imbriquée expose-t-elle les liaisons de ses calques, surcharges du parent comprises ? | La lecture d'un composant imbriqué ouvert depuis son parent |
| R12 | `absoluteBoundingBox` situe-t-il chaque calque dans l'image d'`exportAsync`, calques rognés et pivotés compris ? | Le survol qui entoure les calques dans l'aperçu |
| R13 | Combien de temps prend la lecture d'un composant de 52 calques et de 139 variables liées ? | Le seuil au-delà duquel la vue lit par tranches |
| R14 | `InstanceNode.overrides` liste-t-il une liaison que le parent pose dans une instance imbriquée ? | Les tokens du parent portés par une icône ou un composant imbriqué |
| R9 | Le mode Dev de Figma, Variable Visualizer et Variable Vision affichent-ils déjà cette chaîne depuis un calque ? | L'utilité de développer la vue |

R3 touche un invariant d'AGENTS.md : seule la cible d'un alias du relevé
s'importe. Dans cette vue, le départ de la chaîne est une variable liée à un
calque. L'invariant s'étend ou la vue s'arrête à la première cible que Figma ne
rend pas.

R7 porte une difficulté d'interface. « Afficher dans Figma » change la
sélection, donc le composant que la vue lit. D12 la lève : un calque
sélectionné dans le composant restreint la vue sans la remplacer.

## 5. Décisions

Le mainteneur a validé D1 à D5 sur la première maquette, avec la variante A
pour D3.

| # | Décision | État |
|---|---|---|
| D1 | Écran d'accueil d'un fichier sans variable locale : la vue composant seule, sans arbre ni table | Validée |
| D2 | Tokens groupés par nature : couleur, forme, espacement, taille, texte | Validée |
| D3 | Ligne repliée : un point par étape à côté de la valeur | Validée, variante A |
| D4 | Propriétés sans token comptées dans le pied, listées au clic | Validée |
| D5 | Chaîne interrompue : les étapes lues, puis la cause, sans valeur | Validée |

Validées sur la maquette des composants complexes :

| # | Décision | Choix |
|---|---|---|
| D9 | Unité de la liste | Une ligne par token, avec le nombre de calques |
| D10 | Composant imbriqué | Toute instance imbriquée est une frontière. La vue la nomme et l'ouvre au clic |
| D11 | Composant de plus de 12 lignes | Sections repliées, chacune avec son résumé |
| D12 | Calque sélectionné dans le composant | La vue se restreint à ce calque |
| D13 | Regroupement | Par nature. Le calque sélectionné remplace le regroupement par partie |
| D14 | Ligne | Compacte pour tous les composants |
| D15 | Survol d'une ligne | Ses calques entourés dans l'aperçu, si R12 aboutit |

D10 diffère du contrat sur un point. Le contrat reconnaît une dépendance à ses
règles d'usage, absentes du fichier consommateur. La vue traite donc toute
instance imbriquée comme une frontière, une icône comprise.

Décisions reportées, non dessinées :

| # | Décision | Proposition |
|---|---|---|
| D6 | Fichier qui porte des variables locales | La même vue, dans un onglet à côté de la table |
| D7 | Ensemble de variants sélectionné | Un variant à la fois, choisi dans l'en-tête |
| D8 | Taille de la fenêtre | Étroite à l'ouverture sans variable locale, redimensionnable |

## 6. Étapes

1. Le mainteneur a validé D9 à D15 sur la maquette.
2. Essais R1 à R8 et R10 à R13 dans Figma, par un plugin d'essai en lecture
   seule, sur Alert et StressTest. Le relevé des résultats s'écrit dans ce
   dossier.
3. Essai R9 sur les trois outils, avec le même composant.
4. Décision de développer, puis D6 à D8.
5. [Plan d'implémentation](./PLAN-IMPLEMENTATION-VUE-COMPOSANT.md) par lots, avec
   les tests de la loi de lecture seule. Sa recette porte les essais de
   l'étape 2, R14 comprise.

## Hors périmètre

La vue ne modifie aucun calque et ne propose aucune réparation. Elle ne
remplace pas l'onglet Calques, qui cherche les consommateurs d'un token sur une
page ou un document.

# Refonte d'UCM Architect : conception

**Statut :** proposition revue par un agent spécialiste de l'UX, illustrée par
les [maquettes](./MAQUETTES-ARCHITECT.html). Rien n'est implémenté.

Lecteur : le mainteneur. Le document répond à ses retours sur les deux
maquettes précédentes et propose une organisation du plugin depuis le début.

## 1. Ce que le plugin fait

UCM Architect garde cohérents les noms d'un fichier Figma, sur deux plans :

| Plan | Question à laquelle il répond | Exemple |
|---|---|---|
| L'écriture | Comment écrit-on un nom : casse, séparation des mots ? | `Border_Radius` devient `border-radius` |
| Le vocabulaire | Quel mot emploie-t-on pour une notion ? | `hovered` devient `hover`, `press` devient `pressed` |

Il lit cinq sortes de noms :

| Sorte de nom | Exemple, partie concernée en gras |
|---|---|
| Collection | **`color-brands`** |
| Groupe de variable | **`button/primary`**`/background` |
| Nom de variable | `button/primary/`**`background`** |
| Propriété de composant | Button, propriété **`State`** |
| Valeur de variante | Button, `State` = **`pressed`** |

Les noms des composants eux-mêmes (`Button`, `Tile Link`) ne sont pas lus ;
l'interface le dit.

Le plugin travaille toujours dans le périmètre full UCM : le vocabulaire du
référentiel UCM s'applique dès l'ouverture. Le mode agnostique disparaît.

### Ce que le plugin ne fait plus

| Rôle retiré | Où il vit |
|---|---|
| État des palettes, palette modifiée | UCM Palettes |
| Valeurs manquantes, alias, couches | Profil UCM de l'explorateur, `ucm check` |
| Lecture des composants pour leurs liaisons | UCM Contract Exporter, au moment d'exporter |
| Publication des tokens et des conventions | UCM Contract Exporter |
| Construire `theme`, ajouter une marque | Aucun outil ; reste une piste hors de ce plugin |
| Accueil avec un état par domaine et un prochain geste | Supprimé : l'onglet Harmoniser donne les comptes |
| Grammaire des chemins par collection | Supprimée : elle décrivait l'architecture ; la comparaison à la même place en tient lieu pour les noms |
| Table des noms pour le développeur | Supprimée |

## 2. Le principe : un choix produit des renommages

Le plugin manipule trois objets. Le mot « règle » reste interne ; l'interface
parle de choix et de mots.

| Objet | Ce que c'est | Qui le crée |
|---|---|---|
| Choix | Une décision de l'équipe sur les noms : une écriture, un mot à employer et ses mots à remplacer, deux mots à garder distincts, un écart assumé | Le designer, dans l'onglet Règles ou en répondant à une question |
| Question | Un doute du plugin sur deux mots qu'il soupçonne de désigner la même chose, ou sur un mot mal écrit | La détection, à chaque analyse |
| Renommage | Un nom du fichier qui ne suit pas un choix, avec le nom qu'il prendrait | Les choix, à chaque analyse |

Quatre lois en découlent :

1. Un choix ne modifie jamais le fichier. Il ajoute des renommages à la liste.
2. Seul le bouton Appliquer de l'onglet Harmoniser écrit dans Figma, sur les
   renommages cochés.
3. Répondre à une question crée un choix. La carte affiche aussitôt son effet
   (« 24 noms changeront ») et ses renommages rejoignent l'étape 1.
4. Un choix qui en contredit un autre est refusé à l'enregistrement, avec le
   choix en conflit. Exemple : remplacer `hover` par `hovered` alors qu'UCM
   remplace `hovered` par `hover`.

Le renommage par format (PascalCase, tirets) et l'harmonisation des mots sont
deux sortes de choix, rangés dans le même onglet, qui alimentent la même liste.
Chaque renommage dit quel choix le produit.

```text
Détection ──► À trancher ──réponse──► Choix ◄── onglet Règles
                                        │
                                        ▼
                                   À appliquer ──coche──► Figma
```

## 3. L'organisation

### Deux onglets et la Configuration

| Lieu | Rôle | Contenu |
|---|---|---|
| Harmoniser | Signaler et questionner, puis appliquer | Étape 1, À appliquer : les renommages sûrs, groupés par choix. Étape 2, À trancher : les questions. Un pied unique avec le récapitulatif et Appliquer |
| Règles | Regrouper tous les choix | L'écriture, en haut ; les mots du fichier, avec leur statut ; la fiche de chaque mot |
| Configuration | Régler le plugin | Collections analysées, lecture des composants, langue, export et import des choix, dernier lot appliqué |

Les deux onglets répondent à la demande du mainteneur : un endroit qui signale
et questionne, un autre qui regroupe les règles.

### Pourquoi cette organisation

| Organisation envisagée | Raison de l'écarter |
|---|---|
| Un accueil qui résume l'état du fichier | Il répète les comptes et ajoute un écran entre l'ouverture et le travail |
| Trois onglets, Questions, Renommages, Règles | Renommages devient la sortie cachée de Questions ; deux onglets portent un seul travail |
| Une liste unique qui mêle questions et renommages | Une question attend un jugement, un renommage une coche : le bouton Appliquer ne dit plus sur quoi il agit |
| Un assistant en étapes | Utile au premier passage ; au retour, la moitié des étapes est vide |
| Un onglet par sorte de nom | Un mot comme `hover` traverse les valeurs de variantes et les variables ; le designer pense en mots |
| L'écriture dans la Configuration | L'écriture est un choix de l'équipe sur les noms, au même titre qu'un mot |

### L'ordre : le sûr, puis le doute

L'écriture, les mots UCM et les collections UCM sont certains : l'étape 1 les
présente en premier. Les questions viennent ensuite, parce que leur précision
reste à mesurer (section 7) : sur le fichier client de R3, la comparaison des
mots produisait 79 paires, dont trois vrais synonymes. L'étape 2 montre dix
questions au plus, triées par nombre de noms touchés, avec un compteur (« 3 sur
7 ») ; le reste se replie dans « Autres pistes ».

### Le premier lancement

1. **Analyser** : deux phrases sur le rôle du plugin, puis la lecture du
   fichier avec un avancement.
2. **Écriture des noms** : pour chaque sorte de nom, l'écriture la plus
   fréquente du fichier, proposée par défaut avec ses comptes et un exemple ;
   le designer confirme ou change. Les collections suivent les noms du
   référentiel UCM et n'ont pas de choix d'écriture. Une ligne rappelle que le
   vocabulaire UCM s'applique.
3. Le plugin ouvre Harmoniser, à l'étape 1.

L'écriture vit ensuite en haut de l'onglet Règles.

## 4. Les parcours

| Parcours | Étapes |
|---|---|
| Premier passage sur un fichier | Analyser, confirmer l'écriture, appliquer le sûr, trancher quelques questions, appliquer leurs renommages |
| Retour sur un fichier déjà traité | Le plugin relit le fichier à l'ouverture ; une marque « Nouveau » signale ce qui est apparu depuis la dernière analyse, y compris les mots ajoutés par une version du kit |
| Changer d'écriture | Règles, Écriture : changer une sorte de nom ; le pied annonce les renommages produits et mène à l'étape 1 |
| Ajouter un mot sans question | Règles : toucher un mot de la liste, ou chercher, puis « Remplacer par… » ou « Employer ce mot » |
| Comprendre un mot vu dans un chemin | Toucher une étiquette de chemin, n'importe où : la fiche du mot s'ouvre |
| Refuser un renommage | Sur une ligne : « Garder ce nom » ; sur un groupe d'un mot UCM : « Ne pas suivre UCM ici », qui crée un écart assumé |
| Revenir sur une décision | Règles : modifier ou retirer le choix ; ses renommages sortent de la liste, les coches des autres restent |
| Annuler après application | Le message de fin propose Annuler ; Ctrl+Z annule aussi le lot ; la Configuration garde le dernier lot |

## 5. Les écrans

| N° | Écran | Rôle | On y arrive par |
|---|---|---|---|
| 1 | Premier lancement | Dire ce que fait le plugin, lancer l'analyse | L'ouverture d'un fichier jamais analysé |
| 2 | Écriture des noms | Fixer l'écriture de chaque sorte de nom | La fin de la première analyse |
| 3 | Harmoniser, À appliquer | Vérifier les renommages sûrs, groupés par choix | L'onglet ; la fin du premier lancement |
| 4 | Harmoniser, À trancher | Répondre aux questions, une par carte | L'étape 2 de l'onglet |
| 5 | Réponse donnée | Montrer l'effet d'une réponse et permettre de la reprendre | Une réponse |
| 6 | Confirmation | Dire ce que l'écriture touche, quand le lot est sensible | Appliquer, si le lot touche une collection, une propriété, une valeur de variante ou une bibliothèque publiée |
| 7 | Après application | Dire ce qui a changé, proposer Annuler | Appliquer |
| 8 | Règles | Voir l'écriture et tous les mots du fichier, avec leur statut | L'onglet |
| 9 | Écriture modifiée | Changer l'écriture et voir les renommages produits | Règles, Écriture |
| 10 | Fiche d'un mot de l'équipe | Voir où un mot apparaît et décider de son sort | Une étiquette de chemin ; un mot de la liste |
| 11 | Fiche d'un mot UCM | Voir sa définition, ses mots à remplacer, assumer un écart | Idem |
| 12 | Remplacer par… | Choisir le mot à employer, la portée, et voir l'effet | La fiche d'un mot |
| 13 | Configuration | Régler le plugin | La roue dentée |

Les états particuliers et les types de cartes ont leur planche dans les
maquettes.

## 6. Les types de cartes

### Les renommages

Les renommages se groupent par choix : soixante noms qui passent de `press` à
`pressed` relèvent d'une seule décision. Le groupe se coche d'un geste et se
déplie pour cocher ou décocher un nom.

| Type | Exemple | Contenu de la carte |
|---|---|---|
| Écriture | `Default` devient `default` ; `fontsize` devient `font-size` | Sorte de nom, écriture choisie, ce qui change (casse, séparation, mots soudés reconnus), nombre, exemples |
| Mot | `press` devient `pressed` | Le mot à employer, sa marque UCM ou Équipe, nombre, exemples |
| Collection | `Color Brands` devient `color-brands` | La collection UCM reconnue |
| Bloqué | Deux noms donneraient le même ; un nom changé par un collègue depuis l'analyse | Les noms en cause et le geste à faire ; aucune coche |
| Protégé | Une palette écrite par UCM Palettes | Le nombre et la raison ; aucune coche |

Une ligne dont plusieurs choix changent le nom porte une étiquette par choix.
Le chemin s'affiche en étiquettes : une par segment, colorée selon la sorte de
nom ; le segment qui change est barré puis remplacé. Une ligne de propriété ou
de valeur de variante dit combien de variantes elle touche.

### Les questions

Quatre formes de carte couvrent les détecteurs :

| Forme | Détecteurs | Réponses |
|---|---|---|
| Deux mots, une même chose ? | Flexion (`hover`, `hovered`), singulier et pluriel (`color`, `colors`), abréviation (`bg`, `background`), synonyme connu (`error`, `danger`), synonyme à la même place (`contained`, `filled`) | Employer l'un, employer l'autre, un autre mot, ce sont deux choses différentes, plus tard |
| Ce mot est-il mal écrit ? | Faute de frappe (`contrashovered`), mot soudé inconnu (`vspacingsmall`) | Corriger en (proposition modifiable), c'est voulu, plus tard |
| Échelle de tailles mêlée | `sm, md, lg` et `small, medium, large` | Employer les abréviations, employer les mots entiers, plus tard |
| Collection non reconnue | `Typo Tokens` | La collection UCM correspondante, une collection de l'équipe, plus tard |

Chaque carte montre ses preuves : l'indice qui a déclenché la question
(« même mot, terminaison différente »), le nombre de noms de chaque côté, deux
chemins en étiquettes avec le mot en cause surligné.

Quand un des deux mots est déjà un mot à remplacer d'UCM, la paire devient un
renommage, pas une question. « Plus tard » range la question dans « Mises de
côté », visible et réversible depuis Règles.

Deux relevés de la recherche ne deviennent pas des questions, parce qu'aucun
renommage ne les corrige : un mot rangé à une place qui n'est pas la sienne
(`surface` à la place d'un état), et un mode écrit dans un nom.

### Les états particuliers

| État | Ce que montre l'écran |
|---|---|
| Analyse en cours | L'avancement : variables, puis pages des composants |
| Rien à faire | « Tous les noms suivent vos choix » |
| Fichier sans nom local | Ses variables viennent d'une bibliothèque : le plugin les renomme dans le fichier de la bibliothèque ; ses composants locaux restent analysés |
| Fichier modifié depuis l'analyse | Un bandeau et « Relancer » |
| Nouveautés depuis la dernière analyse | Une marque « Nouveau » sur les groupes et les questions concernés |

## 7. La détection

La [recherche R3](../1%20Architecture%20globale/Recherches/R3-NOMENCLATURE.md)
a mesuré la précision de chaque relevé sur deux fichiers réels. La détection
proposée en tire trois principes.

**Comparer à la même place seulement.** Le bruit de R3 vient des composants
dont la grammaire varie : `outlined` et `default` occupent la même profondeur
sans désigner la même chose.

| Sorte de nom | Même place |
|---|---|
| Segment de variable | Même collection, même profondeur, et même segment avant ou même segment après |
| Valeur de variante | Même nom de propriété, quel que soit le composant (`State` de Button et de Chip) |
| Propriété | Toutes les propriétés du fichier |
| Collection | Toutes les collections |

**Les preuves se cumulent.** Une paire monte quand plusieurs indices
concordent : terminaison, même place, même cible d'alias, nombre de noms
touchés. Sous un seuil, elle reste dans « Autres pistes ».

**Une réponse ne se repose pas.** « Ce sont deux choses différentes » range la
paire parmi les choix ; « Plus tard » la range dans les mises de côté.

Le déroulé d'une analyse :

1. Lire les cinq sortes de noms et découper chaque segment en mots
   (`decouperSegment` du référentiel, déjà employé par la v1).
2. Construire le lexique du fichier : chaque mot, ses noms, ses places, ses
   voisins, et pour une variable sa cible d'alias.
3. Appliquer les choix : chaque nom qui ne les suit pas donne un renommage.
   Repérer les doublons, y compris entre deux renommages, et les noms protégés.
4. Lancer les détecteurs sur les mots qu'aucun choix ne couvre, retirer les
   paires déjà jugées, classer le reste.

**Condition avant les écrans définitifs :** refaire les mesures de R3 avec ces
détecteurs sur C1 et C2, et fixer le seuil sous lequel une paire reste une
piste.

L'inventaire des mots de l'onglet Règles complète la détection : le filtre
« Sans choix » montre les mots qu'aucune table ne couvre, comme les synonymes
qui ne se ressemblent pas et les mots métier.

## 8. Où vivent les mots

| Niveau | Contenu | Où | Qui le modifie |
|---|---|---|---|
| Vocabulaire UCM | Les mots du concept : états, rôles, statuts, tailles, dossiers de `theme`, collections | Le référentiel de `@ucm-kit/core`, livré dans le plugin | Le mainteneur, par une version du kit |
| Vocabulaire de l'équipe | Les mots que l'équipe ajoute ou tranche, ses mots métier, ses écarts assumés | Le fichier Figma, en données partagées du document, une entrée par choix | Tout designer du fichier, dans l'onglet Règles |

Le référentiel UCM ne porte pas tous les mots : il porte les notions du
concept, qui changent rarement. Les mots propres à un produit restent dans le
fichier qui les emploie, sans développement.

| Besoin | Réponse |
|---|---|
| Une équipe refuse un mot UCM | Un écart assumé, par mot et par portée : compté et marqué dans Règles, sans renommage |
| Plusieurs fichiers pour un même design system | Exporter les choix depuis la Configuration, les importer dans un autre fichier |
| Un mot d'équipe utile à tous | « Proposer à UCM » copie le mot, sa définition et ses mots à remplacer au format du référentiel ; le mainteneur l'ajoute au kit |
| Une version du kit ajoute des mots | Les renommages produits portent la marque « Nouveau » au retour sur le fichier |
| Deux designers modifient les choix en même temps | Une entrée par choix limite les écrasements ; le plugin relit les choix avant d'appliquer |

Les données partagées du document sont lisibles par les autres plugins UCM.
L'exporteur pourrait publier le vocabulaire de l'équipe avec les tokens, pour
que `ucm check` applique les mêmes choix dans le dépôt. C'est une suite
possible, hors de cette refonte.

## 9. Écrire sans rien perdre

| Garde-fou | Quand |
|---|---|
| Récapitulatif dans le pied : nombre de noms, et parmi eux collections, propriétés, valeurs de variantes | Toujours |
| Confirmation : ce que le lot touche, et que les noms des tokens exportés changeront | Seulement si le lot touche une collection, une propriété, une valeur de variante, ou si le fichier est une bibliothèque publiée |
| Relecture de chaque nom juste avant l'écriture ; une ligne changée depuis l'analyse est sautée et signalée | Toujours |
| Un seul pas d'annulation Figma pour le lot | Toujours |
| Journal du dernier lot, rangé dans le fichier, qui permet « Annuler le dernier lot » depuis la Configuration | Après chaque application |

Le journal reste dans le fichier ; il n'est ni affiché comme une table ni
exporté. La [recherche sur l'API](../2%20Architect%20v1/RECHERCHE-API-ARCHITECT.md)
ne garantit ni le retour arrière face aux modifications d'un collègue ni la
préservation des surcharges d'instances : la recette dans Figma doit les
éprouver.

## 10. Réponses aux retours

### Maquette de l'architecture globale

| N° | Retour | Réponse |
|---|---|---|
| 1 | Mode agnostique abandonné ; couches à l'onboarding puis à la configuration ; sont-elles complètes, à quoi servent-elles ? | Agnostique retiré. Les couches proposées citaient trois des sept collections du référentiel (`components`, `theme`, `color-brands`, `color-utilities`, `primitives`, `layouts`, `typography`). Elles servaient au contrôle de l'architecture et à Construire, deux rôles retirés. Le plugin reconnaît les collections UCM par leur nom ; une collection inconnue devient la question « Collection non reconnue », dont la réponse la renomme. La Configuration garde le choix des collections analysées |
| 2 | Accueil : que veulent dire les états ? | Accueil supprimé. Couleurs relevait de Palettes, Architecture du profil UCM, Composants d'une lecture des liaisons, Publication de l'exporteur. Les comptes de Noms deviennent ceux des deux étapes d'Harmoniser |
| 3 | Vérifier : que montrent les pastilles, aller plus loin dans les cas | Les pastilles disparaissent. Les écarts deviennent l'étape À appliquer, les paires à juger l'étape À trancher, les observations sans renommage sortent. Chaque type de carte a son dessin dans la planche |
| 4 | Paires à juger : algorithme, Grammaire et Termes, UX globale, format et conventions | Algorithme en section 7. Grammaire retirée (section 1). Signalement et règles deviennent deux onglets ; l'écriture et les mots deux parties de Règles, qui alimentent la même liste. Chemins en étiquettes colorées partout |
| 6 | Construire | Retiré |
| 7 | Accueil en agnostique | Retiré |
| 8 | Fichier qui emploie la bibliothèque | Un fichier dont les variables viennent d'une bibliothèque publiée : Figma ne permet pas de les renommer depuis ce fichier. Il devient un état particulier ; ses composants locaux restent analysés |
| 9 | Termes : où cela vit, comment ajouter, synchronisation avec UCM | Section 8 ; l'ajout passe par la fiche d'un mot, ouverte depuis la liste des mots ou depuis n'importe quelle étiquette de chemin |
| 10 | Renommer un terme | Remplacé par la fiche d'un mot et « Remplacer par… » ; l'écriture dans Figma passe par Harmoniser |
| 11 | Uniformiser la casse | Remplacé par Règles, Écriture |
| 12 | Ignorer un écart avec un motif | Remplacé par « Garder ce nom » et l'écart assumé, relus dans Règles |
| 13 | Lire les composants | Retiré comme écran : l'analyse lit les pages avec un avancement ; la Configuration permet de ne pas les lire |
| 14 | Une palette a changé | Retiré : rôle de Palettes |
| 15 | Ajouter une marque | Retiré : relevait de Construire |
| 16 | Publier les conventions | Retiré : les choix vivent dans le fichier (section 8) |

### Exploration après la v1

| N° | Retour | Réponse |
|---|---|---|
| 1, 2 | Premier lancement, Accueil | Comme ci-dessus |
| 3 | Cartes peu compréhensibles ; lister tous les types | Section 6 et la planche des cartes |
| 4 | Écriture : est-ce le bon endroit, où est le bouton d'action ? | Au premier lancement, puis en haut de Règles. Le pied annonce les renommages produits et mène à l'étape 1, qui porte le seul bouton d'écriture |
| 5 | Chemins peu clairs | Étiquettes colorées par sorte de nom, segment changé barré puis remplacé |
| 6 | Avant d'appliquer | Une confirmation courte, seulement pour un lot sensible (section 9) |
| 7 | Après l'application, table des noms | Écran supprimé ; un message de fin avec Annuler |
| 8 | Construire | Retiré |
| 9 | Termes | Sections 6 et 8, écrans 8 à 12 |

## 11. La revue UX

Un agent spécialiste de l'UX a relu la première version de ce document. Ce
qu'elle a changé :

| Recommandation | Suite |
|---|---|
| Le sûr d'abord, les questions ensuite, plafonnées à dix | Retenue (section 3) |
| Ne pas montrer le mot « règle » ; afficher l'effet d'une réponse ; refuser un choix en conflit | Retenue (section 2), sauf le nom de l'onglet : Règles, le mot du mainteneur |
| Deux onglets au lieu de trois : Harmoniser en deux étapes avec un pied unique, et Règles | Retenue |
| L'inventaire des mots au cœur de Règles ; étiquettes de chemin cliquables ; « mot à employer » et « mots à remplacer » | Retenue |
| Quatre formes de question ; ajout de « Un autre mot » ; « Plus tard » réversible | Retenue |
| Cinq types de renommage ; doublon entre deux renommages ; nombre de variantes touchées | Retenue |
| Confirmation seulement pour un lot sensible ; journal du dernier lot | Retenue (section 9) |
| Une entrée par choix ; export et import entre fichiers ; marque Nouveau | Retenue (section 8) |
| Collections sans choix d'écriture ; écart assumé par mot ; noms de composants hors du plugin, dit dans l'interface | Retenue : ce sont les réponses aux questions 1, 2 et 4 de la version précédente |
| Proposer l'écriture UCM par défaut plutôt que l'écriture la plus fréquente du fichier | Écartée : le mainteneur a décidé que le plugin propose la convention dominante du fichier (phase 2 du plan du référentiel) |

## 12. Questions au mainteneur

1. Le nom des onglets : Harmoniser et Règles, ou d'autres mots ?
2. La confirmation dit que les noms des tokens exportés changeront. Faut-il
   aussi la montrer pour un lot qui ne touche que des noms de variables, dans
   un fichier qui n'est pas une bibliothèque ?
3. Les palettes qu'écrit UCM Palettes sont protégées, pour que Palettes les
   retrouve. Faut-il plutôt les renommer et laisser Palettes suivre la
   nouvelle écriture ?

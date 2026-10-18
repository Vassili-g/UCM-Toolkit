# Refonte d'UCM Architect : conception

**Statut :** validée par le mainteneur dans sa troisième version ; illustrée
par les [maquettes](./MAQUETTES-ARCHITECT.html), qui reprennent la
feuille de style commune des plugins. Rien n'est implémenté.

Lecteur : le mainteneur.

## 1. Ce que le plugin fait

UCM Architect harmonise les noms des variables du fichier des tokens, sur
deux plans :

| Plan | Question à laquelle il répond | Exemple |
|---|---|---|
| L'écriture | Comment écrit-on un nom : casse, séparation des mots ? | `fontSize` devient `font-size` |
| Les termes | Quel terme emploie-t-on pour une notion ? | `outline` devient `outlined`, `press` devient `pressed` |

Une variable se lit en trois parties :

| Partie | Exemple | Écriture |
|---|---|---|
| Collection | `components` | Les noms du référentiel UCM, sans choix |
| Groupes | `button/sizes/medium` | Choisie par le designer |
| Nom | `padding-x` | Choisie par le designer |

Le plugin renomme les variables et les collections locales du fichier ouvert.
Il travaille toujours dans le périmètre full UCM : les termes du référentiel
UCM s'appliquent dès l'ouverture.

### Pourquoi les variables seulement

Les tokens et les composants vivent dans deux fichiers Figma. Le plugin ne
renomme que ce qui est local au fichier ouvert : dans le fichier des tokens,
il n'y a pas de composant ; dans le fichier des composants, les variables
viennent de la bibliothèque et Figma interdit de les renommer. La v1 renommait
aussi les propriétés et les valeurs de variantes, parce que son plan les
avait incluses ; le mainteneur ne l'avait pas demandé, et la refonte les
retire. La divergence des noms dans les composants reste un problème, traité
comme une piste à part (section 11).

### Ce que le plugin ne fait plus

| Rôle retiré | Où il vit |
|---|---|
| Propriétés et valeurs des composants | Piste à part (section 11) |
| État des palettes, palette modifiée | UCM Palettes |
| Valeurs manquantes, alias, couches | Profil UCM de l'explorateur, `ucm check` |
| Publication des tokens et des conventions | UCM Contract Exporter |
| Construire `theme`, ajouter une marque | Aucun outil ; piste hors de ce plugin |
| Accueil, grammaire des chemins, table des noms pour le développeur | Supprimés |

## 2. Le principe : une règle produit des renommages

| Objet | Ce que c'est | Qui le crée |
|---|---|---|
| Règle | Une écriture ; un terme gardé et les termes qu'il remplace ; deux termes déclarés différents ; un terme UCM écarté pour ce fichier | Le designer, dans l'onglet Règles ou en répondant à une question |
| Question | Un doute du plugin sur deux termes ou sur un terme mal écrit | La détection, à chaque analyse |
| Renommage | Un nom qui ne suit pas une règle, avec le nom qu'il prendrait | Les règles, à chaque analyse |

1. Une règle ne modifie jamais le fichier. Elle ajoute des renommages.
2. Seul le bouton Appliquer écrit dans Figma, sur les renommages cochés.
3. Répondre à une question crée une règle ; la carte se réduit à une ligne
   qui dit ce qui changera, avec Annuler.
4. Une règle qui contredit une autre est refusée à l'enregistrement.

## 3. L'organisation

### Les principes de dessin

| Principe | Application |
|---|---|
| Les pièces des autres plugins | En-tête, bouton Configuration, onglets, boutons, champs, interrupteurs : la feuille de style commune (`packages/plugin-socle/src/ui/socle.css`) |
| Un onglet par vue | À appliquer, À trancher et Règles sont trois vues, donc trois onglets. Un choix segmenté sert seulement à changer l'affichage d'une même vue |
| Une liste, puis une feuille | Ce qui se consulte ou se modifie depuis une liste s'ouvre dans une feuille qui monte du bas, sur un fond assombri ; la liste reste derrière. Seule la Configuration est une page, comme dans Palettes |
| Une couleur d'accent | Le surlignage ambré marque ce qui est en cause, et rien d'autre : le terme qui change dans un chemin, la partie d'un nom que règle une écriture |
| Deux dessins de carte | Avant → après pour ce qui change ; deux termes face à face pour ce qui se tranche |

### Les lieux

| Lieu | Forme | Rôle |
|---|---|---|
| À appliquer | Onglet | Les renommages, sous trois intertitres (Termes, Écriture, Collections) ; en bas, le nombre de noms cochés et Appliquer |
| À trancher | Onglet | Les questions ; chaque réponse ajoute des renommages à À appliquer et met son compte à jour |
| Règles | Onglet | L'écriture, résumée ; la liste de tous les termes du fichier, avec leur statut |
| Écriture | Feuille, depuis Règles | Changer l'écriture des groupes ou des noms, voir l'effet, enregistrer |
| Terme | Feuille, depuis une ligne de Règles | Le terme, ce qu'il remplace, où il est employé, et les gestes possibles |
| Confirmation | Feuille, depuis Appliquer | Ce que le renommage touche |
| Configuration | Page, depuis le bouton Configuration | Collections analysées, export et import des règles, dernier renommage, langue |

À appliquer passe en premier : ses renommages sont sûrs, alors que la
précision des questions reste à mesurer (section 7). À trancher montre dix
questions au plus, les plus fréquentes d'abord.

### Le plan de navigation

| Écran | Porte d'entrée | Sortie |
|---|---|---|
| Premier lancement | L'ouverture d'un fichier jamais analysé | Analyser le fichier |
| Écriture des noms | La fin de la première analyse | Continuer, vers À appliquer |
| À appliquer, À trancher, Règles | Les onglets | Les onglets |
| Feuille de l'écriture | Modifier, sur le résumé de l'écriture | Enregistrer, Annuler, ✕, un clic sur le fond |
| Feuille d'un terme | Une ligne de la liste des termes | ✕, un clic sur le fond |
| Remplacer par… | Le bouton de la feuille d'un terme sans règle ; c'est l'étape suivante de la même feuille | ‹ revient à la fiche ; Enregistrer |
| Confirmation | Appliquer | Retour, ou Renommer |
| Configuration | Le bouton Configuration, en haut à droite | Retour |

## 4. Les écrans

| N° | Écran | Contenu |
|---|---|---|
| 1 | Premier lancement | Un titre, une ligne, Analyser le fichier ; puis l'avancement |
| 2 | Écriture des noms | Une carte : groupes, nom, collections ; chaque ligne sur un chemin réel où la partie concernée est surlignée, avec le compte des noms qui suivent déjà l'écriture proposée |
| 3 | À appliquer | Termes, Écriture, Collections ; chaque carte : avant → après, le nombre de variables, l'origine ; dépliée, une variable par ligne |
| 4 | À trancher | La question, deux termes face à face avec un exemple sous chacun, Garder dans chaque colonne ; Termes différents et Autre terme… à gauche, Plus tard à droite |
| 5 | Réponse donnée | La carte réduite à une ligne, avec Annuler |
| 6 | Confirmation | Feuille : ce que le renommage touche |
| 7 | Après application | Un message avec Annuler ; ne reste que ce qui n'était pas coché |
| 8 | Règles | L'écriture résumée avec Modifier ; recherche, filtres, liste des termes |
| 9 | Feuille de l'écriture | La carte de l'écran 2 et l'effet du changement |
| 10 | Feuille d'un terme UCM | Définition ; Remplace, avec + Ajouter ; Employé dans ; « Ne pas l'appliquer dans ce fichier » |
| 11 | Feuille d'un terme personnalisé | Même forme ; ✕ sur un terme remplacé ; Supprimer la règle ; Proposer à UCM |
| 12 | Feuille d'un terme sans règle | Employé dans ; Remplacer par… ; Remplace d'autres termes… |
| 13 | Remplacer par… | Le terme à garder, parmi ceux du fichier et d'UCM ; l'effet avant d'enregistrer |
| 14 | Configuration | Onglets Fichier et Général |

Deux pastilles d'origine : **UCM**, un terme défini par UCM ;
**Personnalisé**, un terme défini dans ce fichier.

## 5. Les cartes

### À appliquer

| Type | Exemple |
|---|---|
| Terme UCM | `disable` → `disabled`, 36 variables, pastille UCM |
| Terme personnalisé | `outline` → `outlined`, pastilles Personnalisé et Nouveau |
| Écriture | `fontSize` → `font-size` +20, « Noms · minuscules-tirets » |
| Collection UCM | `Color Brands` → `color-brands` |
| Bloqué | `Font Size` → `font-size`, qui existe déjà |
| Protégé | 143 noms écrits par UCM Palettes |

### À trancher

| Type | Question | Actions |
|---|---|---|
| Deux termes, une même chose | « Ces termes désignent-ils la même chose ? » ; l'indice en pastille : Terminaison, Singulier et pluriel, Abréviation, Synonymes, Même place | Garder l'un, garder l'autre ; Termes différents, Autre terme… ; Plus tard |
| Terme mal écrit | « Ce terme est-il mal écrit ? » | Corriger, C'est voulu ; Plus tard |
| Mots collés | « Ce terme réunit-il plusieurs mots ? » | Séparer, C'est un seul mot ; Plus tard |
| Tailles écrites de deux façons | « Quelle écriture garder pour les tailles ? » | Garder, dans chaque colonne ; Plus tard |
| Collection non reconnue | « À quelle collection UCM correspond… ? » | Renommer, Garder ce nom ; Plus tard |
| Règle refusée | « Cette règle contredit UCM » | Retour ; Ne pas appliquer ce terme UCM dans ce fichier |

La colonne proposée, bordée de bleu, est celle du terme UCM s'il y en a un,
sinon celle du terme le plus employé. Les questions mises de côté se replient
sous « Plus tard », en bas de À trancher, avec Reprendre.

### États

Analyse en cours ; rien à faire ; fichier sans variable locale, comme le
fichier des composants ; fichier modifié pendant que le plugin est ouvert.

Un nom qu'un collègue renomme pendant la session n'a pas de carte : le
plugin relit chaque nom avant d'écrire et saute celui qui a changé ; le nom
revient dans la liste à la relecture suivante s'il ne suit toujours pas les
règles.

## 6. Les parcours

| Parcours | Étapes |
|---|---|
| Premier passage | Analyser, confirmer l'écriture, appliquer, trancher, appliquer |
| Retour sur le fichier | Le plugin relit le fichier ; la pastille Nouveau marque ce qui est apparu, y compris les termes ajoutés par une version du kit |
| Changer d'écriture | Règles, Modifier, la feuille de l'écriture, Enregistrer |
| Donner une règle à un terme | Règles, la ligne du terme, Remplacer par… ou Remplace d'autres termes… |
| Écarter un terme UCM | La feuille du terme, Ne pas l'appliquer dans ce fichier |
| Revenir sur une décision | La feuille du terme : retirer un terme remplacé, ou supprimer la règle |
| Annuler un renommage | Annuler, dans le message de fin ; Ctrl+Z ; ou Configuration, Dernier renommage |

## 7. La détection

La [recherche R3](../1%20Architecture%20globale/Recherches/R3-NOMENCLATURE.md)
a mesuré la précision de chaque relevé sur deux fichiers réels. La détection
en tire trois principes.

**Comparer à la même place seulement.** Deux segments sont à la même place
s'ils sont dans la même collection, à la même profondeur, et partagent le
segment qui les précède ou celui qui les suit. Le bruit de R3 venait de
chemins dont la grammaire varie d'un composant à l'autre.

**Les preuves se cumulent.** Une paire monte quand plusieurs indices
concordent : terminaison, même place, même cible d'alias, nombre de variables
touchées. Sous un seuil, elle reste dans « Autres pistes ».

**Une réponse ne se repose pas.** Termes différents devient une règle ; Plus
tard range la question en bas de la liste.

Le déroulé d'une analyse :

1. Lire les collections et les variables locales, découper chaque segment en
   mots (`decouperSegment` du référentiel, déjà employé par la v1).
2. Construire le lexique du fichier : chaque terme, ses variables, ses
   places, ses voisins, et la cible d'alias de chaque variable.
3. Appliquer les règles ; repérer les doublons, y compris entre deux
   renommages, et les noms protégés.
4. Lancer les détecteurs sur les termes qu'aucune règle ne couvre, retirer
   les paires déjà jugées, classer le reste.

**Condition avant les écrans définitifs :** refaire les mesures de R3 avec
ces détecteurs sur C1 et C2, et fixer le seuil.

La liste des termes de l'onglet Règles complète la détection : le filtre
« Sans règle » montre les termes qu'aucune table ne couvre.

## 8. Où vivent les termes

| Niveau | Contenu | Où | Qui le modifie |
|---|---|---|---|
| Termes UCM | Les notions du concept : états, rôles, statuts, tailles, dossiers de `theme`, collections | Le référentiel de `@ucm-kit/core`, livré dans le plugin | Le mainteneur, par une version du kit |
| Termes personnalisés | Les termes que le fichier ajoute ou tranche, ses termes métier, ses écarts à UCM | Le fichier des tokens, en données partagées du document, une entrée par règle | Tout designer du fichier, dans l'onglet Règles |

| Besoin | Réponse |
|---|---|
| Écarter un terme UCM | « Ne pas l'appliquer dans ce fichier », dans sa feuille |
| Un terme personnalisé utile à tous | « Proposer à UCM » copie le terme au format du référentiel ; le mainteneur l'ajoute au kit |
| Une version du kit ajoute des termes | Leurs renommages portent la pastille Nouveau |
| Plusieurs fichiers de tokens | Exporter les règles, les importer dans l'autre fichier, depuis la Configuration |
| Deux designers modifient les règles en même temps | Une entrée par règle limite les écrasements ; le plugin relit les règles avant d'appliquer |

## 9. Écrire sans rien perdre

| Garde-fou | Quand |
|---|---|
| Le pied dit combien de noms sont cochés | Toujours |
| Confirmation : variables et collections renommées, liaisons et alias conservés, fichiers utilisateurs servis à la publication, noms des tokens changés au prochain export | À chaque application : le fichier des tokens est une bibliothèque |
| Relecture de chaque nom juste avant l'écriture | Toujours |
| Un seul pas d'annulation Figma pour le lot | Toujours |
| Journal du dernier renommage, rangé dans le fichier, pour l'annuler depuis la Configuration | Après chaque application |

Renommer une variable garde son identifiant : les composants et les styles
qui l'emploient restent liés
([recherche sur l'API](../2%20Architect%20v1/RECHERCHE-API-ARCHITECT.md)).
La recette dans Figma doit vérifier la propagation dans un fichier qui
utilise la bibliothèque.

## 10. Réponses aux retours

### Troisième série

| Retour | Réponse |
|---|---|
| Les composants : on n'en avait jamais parlé ; tokens et composants vivent dans deux fichiers | Retirés (section 1) ; piste à part (section 11) |
| Les fiches de règle ne doivent pas être une page à part | Des feuilles qui montent du bas, sur un fond assombri ; l'écriture aussi |
| La conception des pages n'est pas assez claire | Principes de dessin (section 3) ; intertitres dans À appliquer ; une seule couleur d'accent ; moins de texte secondaire |
| Un choix segmenté pour À appliquer et À trancher | Deux onglets |

### Deuxième série

| Écran | Retour | Réponse |
|---|---|---|
| 1 | Trop de texte | Un titre, une ligne, un bouton |
| 2 | Propriété, nom de variable, valeur : quelle différence ? | Sans objet depuis le retrait des composants ; restent groupes et nom |
| 2 | Encart Vocabulaire UCM | Retiré |
| 2 | Bouton de configuration | Celui des autres plugins |
| 3 | `press` et `pressed` trop petits, UCM collé | Avant → après en 13 px, pastille à droite |
| 3 | Chemins chargés | Seul le terme en cause est surligné |
| 4 | Question trop précise, preuves floues, boutons en vrac | Question générique, termes face à face, Garder dans chaque colonne |
| 5 | Carte de réponse peu claire | Une ligne avec Annuler |
| 7 | Ctrl+Z, noms changés par un collègue | Retirés |
| 8 | « Équipe » | Personnalisé |
| 10 à 14 | Accès aux écrans | Plan de navigation (section 3) |

### Première série

| Retour | Réponse |
|---|---|
| Mode agnostique | Retiré |
| Couches au premier lancement | Retirées ; une collection inconnue devient la question « Collection non reconnue » ; la Configuration choisit les collections analysées |
| Accueil, Construire, marque, palette modifiée, publication, lecture des composants | Retirés |
| Un endroit qui signale, un autre qui regroupe les règles | À appliquer et À trancher d'un côté, Règles de l'autre |
| Format et conventions | Deux sortes de règles, une même liste de renommages |
| Algorithme de détection | Section 7 |
| Termes : où ils vivent, comment en ajouter | Section 8 ; feuilles des termes |

## 11. Piste : les noms des composants

Les propriétés et les valeurs de variantes divergent aussi : `State=press`
dans un composant, `State=pressed` dans un autre. Architect ne les traite
pas, mais la chaîne UCM a deux endroits où les repérer sans ouvrir les deux
fichiers à la fois :

| Où | Ce qu'il ferait | Ce qui existe |
|---|---|---|
| L'exporteur, au moment d'exporter un composant | Signaler une valeur ou une propriété qui emploie un terme remplacé par une règle | Il avertit déjà le designer quand un état emploie un terme toléré d'UCM (`press`) |
| `ucm check`, dans le dépôt | Comparer les états de tous les contrats aux termes UCM et aux règles du fichier des tokens | Il lit déjà les contrats |

Pour que ces deux outils connaissent les termes personnalisés, les règles du
fichier des tokens doivent sortir de Figma : l'exporteur pourrait les publier
avec `tokens.json`, dans `$extensions`. Un mode « composants » d'Architect,
qui renommerait en masse dans le fichier des composants à partir de ces
règles, ne vaudrait que si les corrections à la main se révèlent trop
nombreuses.

## 12. La revue UX

Un agent spécialiste de l'UX a relu la première version de ce document :

| Recommandation | Suite |
|---|---|
| Le sûr d'abord, les questions ensuite, plafonnées à dix | Retenue |
| Afficher l'effet d'une réponse ; refuser une règle en conflit | Retenue |
| Harmoniser en deux listes avec un pied unique, et Règles | Remplacée par trois onglets ; le pied Appliquer reste dans À appliquer |
| Tous les termes du fichier au cœur de Règles | Retenue |
| Quatre formes de question, Autre terme, Plus tard réversible | Retenue, en deux dessins de carte |
| Confirmation seulement pour un lot sensible | Devenue systématique : dans le fichier des tokens, chaque lot touche une bibliothèque |
| Journal du dernier lot ; une entrée par règle ; export et import ; pastille Nouveau | Retenue |
| Étiquettes de chemin cliquables | Retirée avec les étiquettes colorées |
| Proposer l'écriture UCM par défaut | Écartée : le plugin propose l'écriture la plus fréquente du fichier, décision du mainteneur |

## 13. Décisions du mainteneur

| Sujet | Décision |
|---|---|
| Maquettes | Validées dans leur troisième version |
| Périmètre | Les variables et les collections locales du fichier des tokens |
| Confirmation | À chaque application |
| Palettes écrites par UCM Palettes | Protégées : les renommer perturberait Palettes |
| Composants | La piste de la section 11 convient |

Le [plan d'implémentation](./PLAN-IMPLEMENTATION.md) en découle.

## 14. Écarts constatés pendant l'implémentation

| Sujet | Ce que fait le plugin | Lot |
|---|---|---|
| Groupe d'un renommage | Un renommage appartient au groupe de sa règle la plus prioritaire ; entre deux règles de même sorte, au groupe qui renomme le plus de noms. L'écran et le sandbox rangent ainsi chaque nom dans le même groupe | P5 |
| Portée d'une variable | L'identifiant de sa collection dans l'inventaire, pour que la question d'une collection non reconnue compte ses variables | P4 |
| Renommer une collection | La réponse se range dans l'entrée `collection:<id>` de la collection, avec sa cible ; la collection rejoint À appliquer sous Collections. Ni l'export ni l'import ne la portent | P4 |
| Questions mises de côté | Elles ne prennent pas de place parmi les dix questions affichées | P4 |
| Bandeau « fichier modifié » | Jamais montré : un nom changé depuis la lecture est sauté, et l'application rend un résultat partiel ou refusé | P4 |
| Titre d'une fiche | Le terme s'écrit en texte simple dans l'en-tête de la feuille du socle ; sa pastille passe dans le corps | U4b |
| Remplacer par… | La saisie propose les termes du référentiel UCM, sans le nombre de variables de chacun : la liste de Règles occupe la lecture des termes | U4b |
| Terme remplacé | Il a sa propre fiche, « Remplacé par X », avec Retirer ce remplacement quand la règle vient du fichier | U4b |
| Galerie | L'effet simulé de la feuille de l'écriture n'y est pas atteignable : le pilote de la galerie ne déclenche pas le changement d'une liste déroulante | U5 |

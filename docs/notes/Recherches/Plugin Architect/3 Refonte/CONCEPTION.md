# Refonte d'UCM Architect : conception

**Statut :** deuxième version, après les retours du mainteneur sur la
première ; illustrée par les [maquettes](./MAQUETTES-ARCHITECT.html), qui
reprennent la feuille de style commune des plugins. Rien n'est implémenté.

Lecteur : le mainteneur.

## 1. Ce que le plugin fait

UCM Architect harmonise les noms d'un fichier Figma, sur deux plans :

| Plan | Question à laquelle il répond | Exemple |
|---|---|---|
| L'écriture | Comment écrit-on un nom : casse, séparation des mots ? | `fontsize` devient `font-size` |
| Les termes | Quel terme emploie-t-on pour une notion ? | `outline` devient `outlined`, `press` devient `pressed` |

### Variables et composants

Le plugin lit deux familles de noms, que Figma range à deux endroits :

| Famille | Ce qu'on y nomme | Où on le voit dans Figma | Exemple |
|---|---|---|---|
| Variables | Les groupes, puis le nom de chaque token | Le panneau des variables | `Button/Sizes/Medium/` (groupes) `padding-x` (nom) |
| Composants | Les propriétés d'un composant, puis les valeurs que chacune propose | Le panneau de droite, quand on sélectionne une instance | Propriété `State`, valeurs `default`, `pressed`, `disabled` |

Un même terme vit souvent dans les deux familles : `pressed` dans le chemin
d'une variable et comme valeur de la propriété `State`. C'est pourquoi le
plugin harmonise les termes dans les deux à la fois, alors que l'écriture se
choisit pour chacune. Dans le panneau des calques, Figma nomme une variante
`State=pressed, Size=medium` ; le plugin montre plutôt un composant comme le
panneau de droite : son nom, puis `State : pressed`.

Les noms des collections suivent ceux du référentiel UCM : ils n'ont pas de
choix d'écriture. Les noms des composants eux-mêmes (`Button`) ne sont pas
lus.

Le plugin travaille toujours dans le périmètre full UCM : les termes du
référentiel UCM s'appliquent dès l'ouverture.

### Ce que le plugin ne fait plus

| Rôle retiré | Où il vit |
|---|---|
| État des palettes, palette modifiée | UCM Palettes |
| Valeurs manquantes, alias, couches | Profil UCM de l'explorateur, `ucm check` |
| Lecture des composants pour leurs liaisons | UCM Contract Exporter |
| Publication des tokens et des conventions | UCM Contract Exporter |
| Construire `theme`, ajouter une marque | Aucun outil ; piste hors de ce plugin |
| Accueil avec un état par domaine | Supprimé |
| Grammaire des chemins par collection | Supprimée : la comparaison à la même place en tient lieu |
| Table des noms pour le développeur | Supprimée |

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

Le renommage par format et l'harmonisation des termes sont deux sortes de
règles, rangées dans le même onglet, qui alimentent la même liste.

## 3. L'organisation

### Ce qui ressemble aux autres plugins

L'en-tête, le bouton Configuration, les onglets, les boutons, les champs et
les interrupteurs viennent de la feuille de style commune
(`packages/plugin-socle/src/ui/socle.css`), comme dans Palettes : le titre
du plugin à gauche, le bouton « Configuration » à droite, qui devient
« Retour » pendant la configuration ; les onglets en pastilles sous le titre ;
un choix segmenté, comme Soft et Vivid, pour les deux listes d'Harmoniser.

### Les lieux

| Lieu | Rôle | Contenu |
|---|---|---|
| Onglet Harmoniser | Signaler, questionner, appliquer | Un choix segmenté entre À appliquer (les renommages, groupés par règle) et À trancher (les questions) ; en bas, le nombre de noms cochés et Appliquer |
| Onglet Règles | Regrouper les règles | L'écriture, résumée avec Modifier ; tous les termes du fichier, avec leur statut ; une fiche par terme |
| Configuration | Régler le plugin | Collections analysées, lecture des composants, export et import des règles, annulation du dernier renommage, langue |

À appliquer passe en premier : ses renommages sont sûrs, alors que la
précision des questions reste à mesurer (section 7). À trancher montre dix
questions au plus, les plus fréquentes d'abord, et range les autres sous
« Autres pistes ».

### Le plan de navigation

| Écran | Porte d'entrée |
|---|---|
| Premier lancement | L'ouverture d'un fichier jamais analysé |
| Écriture des noms | La fin de la première analyse |
| À appliquer | L'onglet Harmoniser, ouvert par défaut ; Continuer, au premier lancement |
| À trancher | Le choix segmenté d'Harmoniser |
| Confirmation | Appliquer, quand le lot est sensible |
| Règles | L'onglet Règles |
| Écriture modifiée | Modifier, sur le résumé de l'écriture, dans Règles |
| Fiche d'un terme | Le chevron d'une ligne de terme, dans Règles ; la recherche |
| Remplacer par… | Le bouton de la fiche d'un terme sans règle |
| Configuration | Le bouton Configuration, en haut à droite |

Une fiche et la Configuration ont un bouton Retour à la place du bouton
Configuration.

## 4. Les écrans

| N° | Écran | Contenu |
|---|---|---|
| 1 | Premier lancement | Un titre, une ligne, Analyser le fichier ; puis l'avancement |
| 2 | Écriture des noms | Deux cartes, Variables (groupes, nom) et Composants (propriétés, valeurs), chacune avec un exemple réel en couleurs, l'écriture proposée et ses comptes ; Continuer |
| 3 | À appliquer | Une carte par règle : avant → après en grand, ce que cela touche en petit, l'origine à droite ; dépliée, les variables puis les composants |
| 4 | À trancher | Une carte par question : deux termes face à face, leurs exemples, « Garder » dans chaque colonne, trois actions secondaires dessous |
| 5 | Réponse donnée | La carte réduite à une ligne : avant → après, le nombre de noms, Annuler |
| 6 | Confirmation | Ce que le lot touche ; seulement pour un lot sensible |
| 7 | Après application | Un message avec Annuler ; ne reste que ce qui n'était pas coché |
| 8 | Règles | L'écriture résumée ; la recherche, les filtres et la liste des termes |
| 9 | Écriture modifiée | Les deux cartes de l'écran 2 ; l'effet du changement en avant → après |
| 10 | Fiche d'un terme UCM | Le terme et sa définition ; ce qu'il remplace ; où il est employé ; « Ne pas l'appliquer dans ce fichier » |
| 11 | Fiche d'un terme personnalisé | Même forme ; retirer un terme remplacé, supprimer la règle, proposer à UCM |
| 12 | Fiche d'un terme sans règle | Où il est employé ; Remplacer par… ou Remplace d'autres termes… |
| 13 | Remplacer par… | Le terme à garder, choisi parmi ceux du fichier et d'UCM ; l'effet avant d'enregistrer |
| 14 | Configuration | Onglets Fichier et Général, comme dans Palettes |

Deux pastilles d'origine : **UCM**, un terme défini par UCM ;
**Personnalisé**, un terme défini dans ce fichier.

## 5. Les cartes

Deux formes suffisent :

| Forme | Pour | Dessin |
|---|---|---|
| Avant → après | Ce qui change : renommages, réponse donnée, effet d'une règle | Les deux termes en même taille, la flèche entre eux ; dessous, ce que cela touche ; à droite, l'origine |
| Face à face | Ce qui se tranche | Deux colonnes, une par terme : le terme, son nombre, un exemple, et « Garder » |

Dans un chemin de variable, seul le terme en cause est coloré, sans bordure ;
le reste est du texte simple.

### À appliquer

| Type | Exemple |
|---|---|
| Terme UCM | `disable` → `disabled`, pastille UCM |
| Terme personnalisé | `outline` → `outlined`, pastilles Personnalisé et Nouveau |
| Écriture | `Extra_Large` → `extra-large` + 37, et la règle en petit |
| Collection UCM | `Color Brands` → `color-brands` |
| Nom changé par deux règles | Une ligne présente dans les deux cartes, cochée ensemble |
| Bloqué | `Font Size` → `font-size`, qui existe déjà ; Garder les deux |
| Protégé | 143 noms écrits par UCM Palettes |

### À trancher

| Type | Question | Actions |
|---|---|---|
| Deux termes, une même chose | « Ces termes désignent-ils la même chose ? » ; l'indice en haut à droite : terminaison, singulier et pluriel, abréviation, synonymes courants, même place | Garder l'un, garder l'autre ; Termes différents, Autre terme…, Plus tard |
| Terme mal écrit | « Ce terme est-il mal écrit ? » | Corriger, C'est voulu, Plus tard |
| Mots collés | « Ce terme réunit-il plusieurs mots ? » | Séparer, C'est un seul mot, Plus tard |
| Tailles écrites de deux façons | « Quelle écriture garder pour les tailles ? » | Garder celle-ci, dans chaque colonne ; Plus tard |
| Collection non reconnue | « À quelle collection UCM correspond… ? » | Renommer, Garder ce nom, Plus tard |
| Règle refusée | « Cette règle contredit UCM » | Retour, Ne pas appliquer ce terme UCM dans ce fichier |

Le terme proposé en premier, en bleu, est le terme UCM s'il y en a un, sinon
le plus employé. Les questions mises de côté se replient sous « Plus tard »,
en bas de À trancher, avec Reprendre.

### États

Analyse en cours ; rien à faire ; fichier sans variable locale ; fichier
modifié pendant que le plugin est ouvert.

Un nom qu'un collègue renomme pendant la session n'a pas de carte : le
plugin relit chaque nom avant d'écrire, saute celui qui a changé, et le nom
revient dans la liste à la relecture qui suit l'application s'il ne suit
toujours pas les règles.

## 6. Les parcours

| Parcours | Étapes |
|---|---|
| Premier passage | Analyser, confirmer l'écriture, appliquer, trancher, appliquer |
| Retour sur un fichier | Le plugin relit le fichier ; la pastille Nouveau marque ce qui est apparu, y compris les termes ajoutés par une version du kit |
| Changer d'écriture | Règles, Modifier, changer un sélecteur, Voir dans À appliquer |
| Donner une règle à un terme | Règles, chevron du terme, Remplacer par… ou Remplace d'autres termes… |
| Écarter un terme UCM | Fiche du terme, Ne pas l'appliquer dans ce fichier |
| Revenir sur une décision | Fiche du terme, retirer un terme remplacé ou supprimer la règle |
| Annuler un renommage | Annuler dans le message de fin ; Ctrl+Z ; ou Configuration, Dernier renommage |

## 7. La détection

La [recherche R3](../1%20Architecture%20globale/Recherches/R3-NOMENCLATURE.md)
a mesuré la précision de chaque relevé sur deux fichiers réels. La détection
en tire trois principes.

**Comparer à la même place seulement.** Le bruit de R3 vient des composants
dont la grammaire varie : `outlined` et `default` occupent la même profondeur
sans désigner la même chose.

| Famille | Même place |
|---|---|
| Segment de variable | Même collection, même profondeur, et même segment avant ou même segment après |
| Valeur de composant | Même nom de propriété, quel que soit le composant (`State` de Button et de Chip) |
| Propriété | Toutes les propriétés du fichier |
| Collection | Toutes les collections |

**Les preuves se cumulent.** Une paire monte quand plusieurs indices
concordent : terminaison, même place, même cible d'alias, nombre de noms
touchés. Sous un seuil, elle reste dans « Autres pistes ».

**Une réponse ne se repose pas.** Termes différents devient une règle ; Plus
tard range la question en bas de la liste.

Le déroulé d'une analyse :

1. Lire les noms et découper chaque segment en mots (`decouperSegment` du
   référentiel, déjà employé par la v1).
2. Construire le lexique du fichier : chaque terme, ses noms, ses places, ses
   voisins, et pour une variable sa cible d'alias.
3. Appliquer les règles ; repérer les doublons, y compris entre deux
   renommages, et les noms protégés.
4. Lancer les détecteurs sur les termes qu'aucune règle ne couvre, retirer
   les paires déjà jugées, classer le reste.

**Condition avant les écrans définitifs :** refaire les mesures de R3 avec
ces détecteurs sur C1 et C2, et fixer le seuil.

La liste des termes de l'onglet Règles complète la détection : le filtre
« Sans règle » montre les termes qu'aucune table ne couvre, comme les
synonymes qui ne se ressemblent pas.

## 8. Où vivent les termes

| Niveau | Contenu | Où | Qui le modifie |
|---|---|---|---|
| Termes UCM | Les notions du concept : états, rôles, statuts, tailles, dossiers de `theme`, collections | Le référentiel de `@ucm-kit/core`, livré dans le plugin | Le mainteneur, par une version du kit |
| Termes personnalisés | Les termes qu'un fichier ajoute ou tranche, ses termes métier, ses écarts à UCM | Le fichier Figma, en données partagées du document, une entrée par règle | Tout designer du fichier, dans l'onglet Règles |

| Besoin | Réponse |
|---|---|
| Écarter un terme UCM | « Ne pas l'appliquer dans ce fichier », dans sa fiche ; la liste le montre |
| Plusieurs fichiers pour un même design system | Exporter les règles, les importer dans l'autre fichier, depuis la Configuration |
| Un terme personnalisé utile à tous | « Proposer à UCM » copie le terme au format du référentiel ; le mainteneur l'ajoute au kit |
| Une version du kit ajoute des termes | Leurs renommages portent la pastille Nouveau |
| Deux designers modifient les règles en même temps | Une entrée par règle limite les écrasements ; le plugin relit les règles avant d'appliquer |

## 9. Écrire sans rien perdre

| Garde-fou | Quand |
|---|---|
| Le pied dit combien de noms sont cochés, dont collections et valeurs de composants | Toujours |
| Confirmation | Si le lot touche une collection, des composants, ou une bibliothèque publiée |
| Relecture de chaque nom juste avant l'écriture | Toujours |
| Un seul pas d'annulation Figma pour le lot | Toujours |
| Journal du dernier renommage, rangé dans le fichier, pour l'annuler depuis la Configuration | Après chaque application |

La [recherche sur l'API](../2%20Architect%20v1/RECHERCHE-API-ARCHITECT.md)
ne garantit ni le retour arrière face aux modifications d'un collègue ni la
préservation des surcharges d'instances : la recette dans Figma doit les
éprouver.

## 10. Réponses aux retours

### Sur la première maquette de la refonte

| Écran | Retour | Réponse |
|---|---|---|
| 1 | Trop de texte | Un titre, une ligne, un bouton |
| 2 | Propriété, nom de variable, valeur : quelle différence ? | Section 1, « Variables et composants » ; deux cartes avec un exemple réel |
| 2 | À quoi sert l'encart Vocabulaire UCM ? | Il annonçait que les termes UCM s'appliquent ; retiré, ses renommages portent la pastille UCM |
| 2 | Bouton de configuration différent des autres plugins | Les maquettes chargent la feuille de style commune |
| 3 | Les chiffres 1 et 2 | Retirés ; choix segmenté |
| 3 | `press` et `pressed` trop petits, UCM collé | Avant → après en 13 px, de même taille ; pastille à droite |
| 3 | Chemins chargés | Seul le terme en cause est coloré, sans bordure |
| 3 | « Button State » ressemble à un token inventé | Les composants sont séparés des variables et s'écrivent comme dans le panneau de Figma |
| 3 | Écriture pas assez mise en avant | Avant → après, avec le premier nom et le nombre des autres |
| 4 | Question trop précise, preuves floues, cinq boutons en vrac | Question générique, termes face à face, « Garder » dans chaque colonne, trois actions secondaires alignées |
| 5 | Carte de réponse peu claire | Une ligne avant → après avec Annuler |
| 6 | Confirmation | Validée |
| 7 | Ctrl+Z, noms changés par un collègue | Retirés (section 5, États) |
| 8 | Qu'est-ce que « Équipe » ? | Renommé Personnalisé : défini dans ce fichier |
| 9 | Écriture modifiée | Validée |
| 10 à 13 | Comment y accède-t-on ? | Plan de navigation (section 3) ; chevron sur chaque ligne de Règles ; Retour en haut des fiches |
| 14 | Comment accède-t-on à la Configuration ? | Le bouton Configuration en haut à droite, comme dans Palettes |

### Sur les maquettes précédentes

| Retour | Réponse |
|---|---|
| Mode agnostique | Retiré |
| Couches au premier lancement : complètes ? à quoi servent-elles ? | Elles citaient trois des sept collections et servaient au contrôle de l'architecture et à Construire, deux rôles retirés. Une collection inconnue devient la question « Collection non reconnue » ; la Configuration garde le choix des collections analysées |
| Accueil et ses états | Supprimé |
| Pastilles de Vérifier ; tous les cas | Choix segmenté entre À appliquer et À trancher ; planche des cartes |
| Algorithme de détection | Section 7 |
| Un endroit qui signale, un autre qui regroupe les règles | Onglets Harmoniser et Règles |
| Format et conventions | Deux sortes de règles, une même liste de renommages |
| Termes : où ils vivent, comment en ajouter, synchronisation | Section 8 ; fiches des termes |
| Construire, marque, palette modifiée, publication, lire les composants | Retirés |
| Fichier qui emploie la bibliothèque | État « Fichier sans variable locale » |
| Avant d'appliquer, table des noms | Confirmation pour un lot sensible ; table supprimée |

## 11. La revue UX

Un agent spécialiste de l'UX a relu la première version de ce document. Ce
qu'elle a changé :

| Recommandation | Suite |
|---|---|
| Le sûr d'abord, les questions ensuite, plafonnées à dix | Retenue |
| Afficher l'effet d'une réponse ; refuser une règle en conflit | Retenue |
| Deux onglets : Harmoniser en deux listes avec un pied unique, et Règles | Retenue |
| Tous les termes du fichier au cœur de Règles | Retenue |
| Quatre formes de question, « Autre terme », « Plus tard » réversible | Retenue, ramenée à deux dessins de carte |
| Confirmation seulement pour un lot sensible ; journal du dernier lot | Retenue |
| Une entrée par règle ; export et import entre fichiers ; pastille Nouveau | Retenue |
| Collections sans choix d'écriture ; écart à un terme UCM ; noms de composants hors du plugin | Retenue |
| Étiquettes de chemin cliquables vers la fiche du terme | Retirée avec les étiquettes colorées : le mainteneur trouvait les chemins trop chargés ; la fiche s'ouvre depuis Règles |
| Proposer l'écriture UCM par défaut | Écartée : le mainteneur a décidé que le plugin propose l'écriture la plus fréquente du fichier |

## 12. Questions au mainteneur

1. Les composants : le plugin les harmonise, comme la v1. Faut-il les garder
   dans le même outil que les variables ?
2. La confirmation : la montrer aussi pour un lot de variables seules, dans
   un fichier qui n'est pas une bibliothèque ?
3. Les palettes qu'écrit UCM Palettes sont protégées, pour que Palettes les
   retrouve. Faut-il plutôt les renommer et laisser Palettes suivre ?
4. La planche : chaque carte vous convient-elle ?

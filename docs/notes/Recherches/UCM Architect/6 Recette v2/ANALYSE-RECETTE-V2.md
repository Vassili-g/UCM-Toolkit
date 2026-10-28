# Recette v2 d'Architect : analyse et propositions

Ce document part de la recette Figma du mode Composant du 28 octobre, sur
Button, Alert et Stresstest. Chaque point de la recette y reçoit sa cause,
lue dans le code, et une proposition. Rien n'est implémenté.

La maquette [MAQUETTE-RECETTE-V2.html](./MAQUETTE-RECETTE-V2.html) montre les
propositions d'interface sur les écrans réels figés de la galerie d'Architect.
Les questions au mainteneur sont numérotées à la suite de la recette v1, de
R-11 à R-25. La section 10 les réunit avec leur état ; la maquette les reprend
en section 8.

Le mainteneur a relu une première version de la maquette. Ses réponses sont
reportées dans chaque section. Deux sujets restent en discussion : le radius
de `.Ring` (7.3) et la section des informations (7.4).

## 1. Fenêtre, barre et panneau

| Point de la recette | Ce que fait le code | Décision |
|---|---|---|
| La fenêtre s'ouvre trop large en mode Composant | Panneau fermé, la fenêtre prend 520 px (`TAILLE_ETROITE`, `src/fenetre.ts:25`), ou la dernière taille rangée sous `ucm-explorateur/tailleFenetreEtroite`. Panneau ouvert : 1040 px | Panneau fermé : 500 px, qui est aussi la largeur minimale. Panneau ouvert : la vue garde sa largeur et le panneau s'ajoute à droite, 640 px. La fenêtre passe à 1144 px, poignée comprise (R-11, R-12) |
| Analyser ouvre aussi le panneau des constats | Le clic n'envoie que `analyser` (`src/ui/application.ts:226`). Seuls le bouton Constats et le collage d'une préparation ouvrent le panneau. La lecture du code n'explique pas ce que la recette a vu | Reproduire dans Figma avec le build courant. Un test d'interface vérifie que le panneau reste fermé après Analyser |
| La frontière entre la vue et le panneau lâche la souris | Le geste repose sur `setPointerCapture` et écoute la poignée seule (`src/ui/composant/corps.ts:47`). Dans Figma, Chromium retire la capture en cours de geste : le suivi s'arrête dès que la souris quitte la poignée | Reprendre le geste de la poignée des colonnes (`src/ui/poignee.ts`) : suivi sur `window` en phase de capture, fin au relâchement ou quand la souris sort de la fenêtre |
| Configuration change la largeur de la fenêtre | En mode Composant, `ouvrirLaConfiguration` passe d'abord en mode Tokens, qui redimensionne à 1360 px (`src/ui/application.ts:187`) | La Configuration s'ouvre à la place du contenu de la fenêtre, à sa largeur |
| Configuration fait quitter le mode Composant | Même cause : le passage en mode Tokens vient du commit `cc678b6d` | Le mode reste celui de départ. La bascule Tokens / Composant ne change pas |
| Un second clic sur Configuration ne la ferme pas | Le bouton renvoie le même événement d'ouverture. Seul le bouton Retour de la Configuration la ferme | Le bouton devient une bascule (`aria-pressed`). Le second clic ferme la Configuration et rend l'écran précédent : panneau, section ouverte, défilement |
| Actualiser reste actif sans composant sélectionné | `selectionSurLAnalyse` rend vrai quand la sélection est vide (`src/ui/composant/analyse.ts:78`) | Analyser et Actualiser sont désactivés tant qu'aucun composant n'est sélectionné. La bulle dit « Sélectionnez un composant dans Figma » |

### La barre compacte

La barre compacte vaut à toutes les largeurs du mode Composant (cadre 1b) :

- le logo et le nom « UCM Architect » disparaissent : la bascule vient en tête ;
- Analyser garde son libellé, qui devient Actualiser après une analyse ;
- Constats garde son icône et sa pastille, sans son mot ;
- Configuration reste un bouton à icône.

Les bornes minimales passent à 500 px pour la fenêtre (`src/fenetre.ts:31`)
et pour la vue (`src/ui/composant/corps.ts:19`). Une taille rangée plus grande
garde la priorité à l'ouverture : le designer qui a agrandi sa fenêtre la
retrouve. Une taille rangée plus petite que 500 px remonte à 500 px.

### La largeur de la Configuration

Les formulaires de la Configuration ont été validés à 640 px. Décidé (R-12) :
le panneau des constats prend 640 px par défaut.

- Panneau ouvert : la Configuration prend la place du panneau, à 640 px. La vue de gauche reste affichée.
- Panneau fermé : la Configuration prend la place de la vue, à 500 px. Ses formulaires passent sur une colonne.

Dans les deux cas, la largeur de la fenêtre ne change pas. R-25 confirme ce
partage.

## 2. Changer de variant sans que l'écran saute

Décidé : la proposition est retenue.

### Ce qui se passe

Un clic sur une valeur de la section Variants rend l'écran trois fois
(`src/ui/vues/composant.ts`).

1. `demander` passe la lecture à « en cours ». `rendre()` vide le corps et
   affiche « Lecture du composant… » : l'en-tête, l'aperçu, la section Variants
   et la liste disparaissent. La hauteur de la page change.
2. La lecture arrive. `recevoirLecture` efface l'aperçu, oublie les choix
   (lignes et sections ouvertes, filtre) et reconstruit tout le corps.
3. L'aperçu arrive. `recevoirApercu` crée une nouvelle image et reconstruit
   encore tout le corps.

Le défilement n'est pas gardé. Seul le dépliage des properties survit.

### Ce qui change

Pour un autre variant du même jeu, l'écran reste en place et seules les
valeurs changent.

- L'ancienne lecture reste affichée pendant la lecture. Une barre fine sous
  l'en-tête dit que la lecture est en cours. L'écran « Lecture du composant… »
  reste pour un nouveau composant.
- La vue met à jour ses éléments par clé au lieu de les recréer. Une ligne de
  token garde sa place quand son token existe dans les deux variants.
- L'aperçu garde la hauteur de son cadre. La nouvelle image remplace
  l'ancienne une fois chargée.
- Les sections ouvertes, le filtre et le défilement sont gardés.
- Une valeur qui change est surlignée pendant 600 ms, sans mouvement.

Ce travail touche la fonction de rendu de la vue entière : il revient à un lot
`implementeur-exigeant`, avec un test d'interface qui compare la position des
éléments avant et après un changement de variant.

### Le chevron des sections de la liste

Décidé, à la relecture de la maquette. Les en-têtes de section de la liste des
tokens (Couleur, Forme, Espacement, Taille, Texte) portent leur chevron à
gauche, juste au-dessus des signes des lignes. Le chevron passe à droite :
titre et nombre à gauche, chevron à droite (cadre 2c).

## 3. Le langage visuel des variants

Décidé (R-13) : la forme B dans la section Variants, la forme C dans les
constats, avec les puces de la forme A.

### Aujourd'hui

Un variant s'écrit partout comme Figma le nomme :
`Color=Primary, Variant=Contained, State=Default`. CONTRIBUTING.md en fait une
règle (« Messages destinés au designer »). Il apparaît :

- sous la section Variants, après « Affiché » (`src/ui/composant/variants.ts:296`) ;
- dans la phrase des constats et dans leur ligne de lieu (`src/ui/ignores/modele.ts:101`) ;
- dans les cartes de corrections et de questions.

Le nom complet est long, la valeur utile se perd, et le lieu d'un constat
mélange un nom de variant et une phrase comme « Tous les variants
désactivés ». Ce texte est fixe (`src/ui/textes/ignores.ts:93`) : il dit
« tous » quelle que soit la part des variants exclus.

### Les formes

| Forme | Où | Ce qui change |
|---|---|---|
| A. Une puce par paire | Section Variants et constats | Chaque paire devient une puce : property et signe égal en gris, valeur en clair |
| B. La section suffit | Section Variants | La ligne « Affiché » disparaît : la valeur choisie de chaque ligne de property dit déjà le variant |
| C. La ligne de lieu porte les variants | Constats | La phrase ne nomme plus le variant. La ligne de lieu donne le nombre de variants, puis les puces des seules paires qu'ils partagent : 36 variants, `State=Focus` |
| D. Deux colonnes | Constats | Écartée |

Une puce garde le texte exact de Figma, `State=Disabled`, pour que le designer
puisse le chercher. Elle ne prend pas de couleur : la couleur reste aux
alertes.

| Ligne de lieu aujourd'hui | Ligne de lieu retenue |
|---|---|
| Tous les variants désactivés | 18 variants, puis la puce `State=Disabled` |
| Tous les variants | Tous les variants |
| Layer container | Layer `container`, puis le bouton Sélectionner |

La règle de CONTRIBUTING.md change : un variant garde les noms et les valeurs
de Figma, en puces d'une paire chacune.

## 4. Le bouton « Copier ses liaisons aux autres variants »

Décidé (R-14) : le bouton quitte la section Variants et devient une carte du
panneau des constats, l'option a ci-dessous.

### Ce qu'il fait

Le bouton prend le variant affiché comme modèle (`proposerLaPropagation`,
`packages/kit/src/controles/propagation.ts`). Pour chaque liaison du modèle et
chaque autre variant :

1. il cherche le layer au même chemin dans l'autre variant ;
2. il prend le token du modèle et remplace les segments de property par les
   valeurs de l'autre variant ;
3. si ce token existe et n'a qu'un candidat, il propose la liaison. Sinon, il
   pose une question.

Exemple sur Button. Le modèle `Color=Primary, Variant=Contained, State=Default`
lie le fill de `container` à `Color/Primary/Contained/Default/background`. Pour
`Color=Info, Variant=Outlined, State=Hover`, le bouton propose
`Color/Info/Outlined/Hover/background`.

Rien n'est écrit dans Figma avant Appliquer.

### Son intérêt

Sans ce bouton, l'analyse ne propose aucune liaison pour une couleur en dur.
Seul le fill d'un texte nommé `title` reçoit une proposition (C25,
`packages/kit/src/controles/corrections.ts`). Les tailles en dur reçoivent
C29, qui cherche un token du composant de même valeur.

Le cas qu'il sert : les tokens de Button existent, et les layers de ses 216
variants ne sont pas liés. Le designer lie un seul variant à la main, une
dizaine de liaisons. Le bouton propose les liaisons des 215 autres, soit plus
de deux mille gestes épargnés. C'est la « correspondance fastidieuse » que le
mode Composant devait prendre en charge.

La préparation des tokens couvre un autre cas : elle crée les tokens qui
manquent, puis lie les layers à ces tokens. Le bouton sert quand les tokens
existent déjà, créés à la main ou après un renommage.

### Où le mettre

Le bouton est mal placé. La section Variants sert à choisir le variant
affiché. Le bouton y apparaît sur tous les composants, même entièrement liés,
où il ne propose rien.

| Option | Ce que voit le designer |
|---|---|
| a. Une carte dans le panneau des constats | Une carte dans Couleurs ou Tailles et forme, seulement quand des layers sont liés dans un variant et en dur dans d'autres. Le plugin prend comme modèle le variant qui porte le plus de liaisons et le nomme. Un bouton « Proposer les liaisons » ajoute les corrections, à appliquer ensuite |
| b. Un menu discret dans la section Variants | Un bouton « … » à côté du titre Variants, avec « Lier les autres variants sur ce modèle ». La phrase et l'exemple vont dans le résultat |
| c. Retirer la fonction | Le designer lie chaque variant dans Figma, ou passe par la préparation des tokens |

Retenue : a. La fonction apparaît là où le problème est signalé, et seulement
quand elle propose quelque chose. Le designer n'a pas à choisir le modèle.

### La carte

Une carte par section concernée. Les couleurs en dur vont dans Couleurs. Les
tailles en dur (padding, gap, radius, stroke weight) vont dans Tailles et forme.
Un même modèle peut donc donner deux cartes.

La carte ne paraît que si les trois conditions tiennent :

- un variant porte des liaisons de cette sorte ;
- les mêmes layers sont en dur dans d'autres variants ;
- au moins une liaison peut être proposée.

Le modèle est le variant qui porte le plus de liaisons de cette sorte. À
égalité, le premier variant du jeu.

Texte (cadre 4d), une idée par phrase :

> **À corriger** 4 layers ont une couleur en dur dans 215 variants.
> Un variant les lie déjà : `Color=Primary` `Variant=Contained` `State=Default`.
> Architect peut reprendre ses liaisons dans les autres variants.
> Bouton : « Proposer les liaisons »

### Ce que fait « Proposer les liaisons »

Cadre 4e.

1. Le sandbox calcule les liaisons depuis le modèle, sans rien écrire dans Figma
   (`servir-de-modele`, `proposerLaPropagation`).
2. La carte est remplacée par des cartes de corrections ordinaires, une par
   layer et par champ : « Lier le fill de `container` », 215 variants. Chacune a
   sa case, son bouton Appliquer et sa liste avant / après, ouverte au clic.
3. Un layer dont le token attendu n'existe pas, ou existe en plusieurs
   exemplaires, devient une question dans la même section.
4. Le designer applique carte par carte, ou avec Appliquer tout. Ctrl+Z défait
   le lot.

### Le chevron des cartes à bouton

Dans la carte 4d de la première version, le chevron se trouvait à gauche du
bouton. Une carte de correction du plugin place déjà son bouton Appliquer dans
l'en-tête, suivi du chevron (`bloc-tete avec-action`, puis `bloc-replier`).
Les cartes à bouton reprennent cette forme : contenu, bouton, puis chevron à
droite. La règle vaut aussi pour le bouton Sélectionner (section 6).

## 5. Le tableau des variants

Décidé (R-15) : le tableau disparaît. La section Variants garde une ligne par
property. Le bouton « Tableau », `basculerLeTableau`
(`src/ui/vues/composant.ts:423`), le rendu croisé (`src/ui/composant/variants.ts:213`)
et le texte « Croiser deux properties » partent avec lui, ainsi que les états
de galerie qui le montrent.

## 6. Sélectionner le layer d'un constat

Décidé (R-16) : un bouton « Sélectionner » dans l'en-tête de chaque carte qui
vise des layers, questions comprises. Il porte le signe de la sélection de
Figma. Une carte sans layer, comme une règle d'utilisation, n'en a pas.

Après le clic, le bouton devient « Sélectionnés » et se désactive. Il
redevient actif quand la sélection de Figma change. Ouvrir une carte ne
sélectionne plus rien : aujourd'hui, l'ouverture d'une carte de correction ou
de constat sélectionne ses layers sans l'annoncer.

Le bouton se place avant le chevron, comme le bouton Appliquer d'une carte de
correction (section 4, « Le chevron des cartes à bouton »).

## 7. Les constats de Button

### 7.1 L'anneau de focus « lié autrement dans 12 autres variants »

Constat C21, À vérifier (`ecartsDeFratrie`, `packages/kit/src/controles/mapping.ts:87`).

#### Pourquoi il apparaît

C21 cherche un variant lié autrement que ses voisins. Il réunit, pour un même
layer et un même champ, les liaisons de tous les variants : ici le stroke de
`.Ring`. Pour chaque liaison, il ne retient pas le token lié mais sa cible :
la variable du thème vers laquelle l'alias renvoie (`signature`,
`mapping.ts:76`). Si plus de la moitié des liaisons ont la même cible, toute
liaison dont la cible diffère reçoit C21.

Sur Button, le ring de `Color=Primary` renvoie à une autre variable du thème
que celui des autres couleurs. C'est un choix de design : la couleur Primary a
son anneau. C21 le lit comme une incohérence, parce qu'il ne regarde jamais si
le token lié correspond au variant. Or `Color/Primary/Contained/Focus/ring` est
exactement le token que le variant `Color=Primary, Variant=Contained,
State=Focus` doit porter.

Le rapport téléchargeable de Button (R-21) donnera les cibles exactes.

#### Correction

C21 juge la liaison, pas le contenu du token. Avant de comparer, il écarte
chaque liaison dont le token porte les valeurs de son propre variant : chaque
segment de property du nom, `Primary`, `Contained`, `Focus`, vaut la valeur du
variant. Ces segments se lisent avec `segmentDAxe`, que C15 et C16 emploient
déjà dans le même fichier. Une telle liaison est juste par construction. Ce
vers quoi son token renvoie relève des tokens, pas des liaisons.

C21 compare ensuite les liaisons restantes, comme aujourd'hui.

| Cas | Avant | Après |
|---|---|---|
| `Color=Primary` lié à `Color/Primary/Contained/Focus/ring` | C21 | Aucun constat |
| `Color=Primary` lié à `Color/Info/Contained/Focus/ring` | C21 | C21, et C16 signale déjà le segment `Info` |
| Layer lié à un token sans segment de property, différent de ses voisins | C21 | C21 |

Les trois cas entrent dans les tests de C21.

### 7.2 « 4 tokens écrivent Large. UCM écrit lg »

Constat C10 (`packages/kit/src/controles/nommage.ts:225`).

La décision existe. Le plan de Nomenclature l'écrit
(`docs/notes/Recherches/Plugin Architect/4 Nomenclature/PLAN-IMPLEMENTATION.md`,
ligne 58) : « dans le nom final des variables, `large` devient `lg`. Dans les
dossiers, `lg` devient `large` ». Le registre des tailles la porte aussi
(`packages/kit/src/referentiel/vocabulaire.ts:123`) : chaque cran a son mot de
dossier, comme `large` pour `lg`.

#### Pourquoi la définition n'a pas suffi

La définition est bien enregistrée, mais un seul des deux lecteurs la lit.

| Lecteur | Ce qu'il lit | Résultat sur `Size/Large/radius` |
|---|---|---|
| Nomenclature (`referentiel/vocabulaire-du-fichier.ts:80`) | `termePourCategorie` : le mot de dossier pour un dossier, l'abréviation pour la variable | Tenu |
| C10 (`controles/nommage.ts:229`) | `terme.id`, toujours `lg` | « UCM écrit lg » |

C10 vient des contrôles de l'exporteur, rangés dans le kit avant que le
registre ne distingue dossiers et variables. Le mot de dossier est arrivé avec
Nomenclature, par `identifiantParCategorie`. C10 n'a pas été repris, et aucun
test ne lui donnait un dossier écrit en mot entier.

#### Correction

1. C10 prend l'écriture attendue par `termePourCategorie(terme,
   categorieDuSegment(nom, rang))`, la fonction de Nomenclature.
   `Size/Large/radius` est tenu. `Size/radius/Large` reçoit encore C10, avec
   `lg`. `Size/lg/radius` reçoit C10, avec `Large`.
2. Les trois cas entrent dans les tests de C10.
3. Un test du kit refuse qu'un contrôle compare un segment à `terme.id` sans
   passer par `termePourCategorie`. Le prochain lecteur de la règle ne pourra
   pas l'oublier.

R-17 confirme que la règle vaut pour toutes les collections.

### 7.3 Le radius du layer `.Ring`, lié à un token de layout

En discussion (R-18). Constat C80, À corriger
(`packages/kit/src/controles/couche.ts:60`). La règle vient de R-2 : un layer
de composant ne se lie qu'aux tokens de son composant.

#### Les deux questions de la recette

**`.Ring` sans collection, est-ce une erreur ?** Non. FORMAT.md, « Composition
et dépendances » : un set imbriqué sans instance de `.componentRules` « reste
parcouru comme wrapper ou détail d'implémentation du parent ». `.Ring` est donc
une pièce de Button. Le contrat de Button publie l'anneau dans ses propres
`strokes.ring`.

**Faut-il tous les composants dans la collection des tokens ?** Non. CONCEPT.md,
« La composition ne duplique pas », vise les composants unifiés : ceux qui ont
leur propre contrat, parce qu'ils servent seuls. Un composant fait pour servir
seul a sa collection. Une pièce interne comme `.Ring` n'en a pas besoin.

#### Ce que la relecture a ajouté

`.Ring` servira à toutes les interfaces qui ont un état de focus : Button,
Input, Checkbox, Tabs. Une liaison posée dans le composant principal `.Ring`
vise une seule variable. Elle ne peut pas viser à la fois un token de Button et
un token d'Input. Lier le composant principal aux tokens de Button, comme le
proposait le tour précédent, ne tient donc pas.

`.Ring` est une **pièce partagée** : ni un composant unifié, puisqu'il ne sert
jamais seul et n'a pas de contrat, ni la pièce d'un seul composant. R-2 ne
prévoit pas ce cas : il suppose qu'un layer appartient à un seul composant.

#### Ce que porte l'anneau

| Propriété | Même valeur pour tous les composants ? | Où la lier |
|---|---|---|
| Couleur du stroke | Oui | Le thème : son dossier `ring` existe déjà (`REGISTRE_DOSSIERS_THEME`) |
| Stroke weight, écart | Oui | `layout`, par exemple `Stroke/outline-weight` |
| Radius | Non : il suit le radius du composant qui l'entoure, plus l'écart de l'anneau. Un Button Small et un Input n'ont pas le même | Dépend du composant hôte |

La couleur et l'épaisseur se lient une fois, dans le composant principal. Le
radius ne le peut pas, si l'anneau doit épouser la forme de chaque composant.

#### Les options

| Option | Ce que fait le designer | Ce qu'Architect contrôle | Limite |
|---|---|---|---|
| 1. Pièce partagée, liée à `theme` et `layout` | Rien de plus : `.Ring` garde ses liaisons dans le composant principal | Une pièce partagée peut se lier à `theme` et `layout`. C80 ne vise plus ses layers. Une valeur en dur reste un constat | L'anneau a le même radius partout. Sur un Button Small, il peut ne pas épouser la forme |
| 2. Option 1, et le radius surchargé par chaque hôte | Dans chaque composant hôte, lie le radius de l'instance `.Ring` à un token de ce composant, par exemple `Button/Size/Small/ring-radius`, qui renvoie à `layout` | Option 1 pour le composant principal. Une surcharge posée dans l'instance appartient à l'hôte : elle vise un token de l'hôte, sinon C80. Une instance sans surcharge du radius reçoit un À vérifier | Un token de radius d'anneau par taille et par hôte. La carte de modèle (section 4) propose les surcharges depuis un variant lié |
| 3. `.Ring` devient un composant unifié | Ajoute une instance de règles, une collection `ring` et un contrat. Chaque hôte le déclare dans `composes` | Les layers de `.Ring` se jugent dans son propre contrat | Un contrat et une collection pour une pièce qui ne sert jamais seule. Le radius pose le même problème : il dépend toujours de l'hôte |

Une pièce partagée se reconnaît ainsi : un set ou un composant imbriqué, dont
le nom commence par `.` ou `_`, sans instance de `.componentRules`. Figma ne
publie pas ces noms. L'exporteur les traite déjà comme des détails
d'implémentation du parent.

Pour l'option 2, le relevé doit distinguer une liaison héritée du composant
principal d'une surcharge posée dans l'instance. Figma l'expose par
`InstanceNode.overrides`. Le relevé ne le lit pas aujourd'hui.

#### Avis

L'option 1 tout de suite : elle retire le faux constat et suit la règle de
l'exporteur. L'option 2 ensuite, si le radius de l'anneau doit suivre celui du
composant. L'option 3 n'apporte rien de plus pour le radius, et coûte un
contrat.

Une question décide entre 1 et 2 : le radius de l'anneau doit-il épouser celui
de chaque composant, ou un seul radius convient-il à tous ?

Avec l'option 1, le constat disparaît. Avec l'option 2, une instance sans
surcharge reçoit (cadre 7b) :

> **À vérifier** Le radius de l'instance `.Ring` vient de la pièce partagée.
> Il ne suit pas celui de Button. Liez-le à un token de Button.

### 7.4 « Les 18 variants State=Disabled ne sont pas mesurés »

Constat C53, Information (`packages/kit/src/controles/accessibilite.ts:133`).

WCAG 2.2, critères 1.4.3 et 1.4.11 : un composant inactif n'a pas d'exigence
de contraste. Architect ne mesure donc pas les variants `State=Disabled`, et
le dit dans une carte. CONTRIBUTING.md écarte tout message sans geste.

Le premier tour proposait une carte, une ligne grise sous Accessibilité, rien,
ou un seuil propre aux désactivés (R-24, hors de cette recette).

#### La proposition du mainteneur : une section Informations

En discussion (R-19). Une dernière section du panneau, « Informations », réunit
ce qu'Architect n'a pas pu ou pas voulu mesurer. Ses lignes ne sont pas des
constats.

- La section vient toujours en dernier, après les éléments tenus.
- Elle a son signe, gris : une note, distincte du « i » bleu de l'alerte Information.
- Ses lignes ne comptent ni dans « Tout », ni dans la pastille du bouton Constats, ni dans le sommaire.
- Une ligne n'est pas une carte : ni liseré, ni mot de sévérité, ni chevron. Elle garde la ligne de lieu et le bouton Sélectionner quand elle vise des layers.
- La section arrive repliée. Sa bande dit le nombre de lignes.

Ce qui y va : tous les constats de type `info` du kit.

| Code | Ligne |
|---|---|
| C53 | Contraste non mesuré sur `State=Disabled`, que WCAG exempte |
| C49, C50 avec une limite | Contraste non mesuré, avec sa cause : texte sur une image, fond en dégradé, valeur non lue |
| C49 borne | Nombre de paires non mesurées |

C67, l'icône pilotée par une property que le composant ne déclare pas, est
de type `info` mais demande un geste : ajouter la property. Il devient une
carte À corriger.

L'alerte Information disparaît alors des cartes d'Architect : un constat est
À corriger, À vérifier ou Bloquant. CONTRIBUTING.md reçoit l'exception : dans
Architect, une information sans geste va dans cette section, jamais dans une
carte.

Avis : oui. La section garde l'information sans la mêler aux constats. Elle
suit la règle des messages : aucun constat sans geste.

### 7.5 Le stroke de `Variant=Outlined` sur un fond indéterminé

Décidé (R-20) : la source A, `elevation/…` du thème, mesurée dans chaque mode
du thème, avec la page Figma en repli. Constat de contraste non mesuré, cause
`fond-indetermine` (`packages/kit/src/controles/accessibilite.ts:474`).

#### Ce que fait le kit aujourd'hui

Le kit compose les fills des ancêtres du layer, dans le variant seulement. Il
s'arrête au premier fill opaque. Un variant Outlined n'a pas de fill opaque :
le fond reste inconnu. Les autres mesures de contraste se font déjà par
combinaison de modes.

#### Ce qui est retenu

| Source | Rang |
|---|---|
| A. Le fond d'élévation du thème, dans chaque mode | Premier |
| B. Le fond de la page Figma (`figma.currentPage.backgrounds`), une seule valeur | Repli, sans thème UCM |
| C. Une valeur fixe par mode | Écartée : fausse dès que Palettes change le fond |

La carte nomme le fond et le mode : « sur `elevation/raised`, en Dark ».

#### Sur quel fond : `elevation/page` ou `elevation/raised`

Le mainteneur précise qu'un composant Outlined, Button comme Alert, se pose sur
`elevation/raised`, le fond des cartes. R-23 change donc : faut-il mesurer sur
`elevation/raised` seul, ou sur `elevation/page` et `elevation/raised`, en
gardant le pire des deux ? Un Button se pose aussi sur la page, dans un
formulaire. Avis : les deux, et la carte nomme celui qui échoue.

#### D'où vient la valeur de `elevation/raised`

Le kit ne porte aucune palette d'un projet. Il porte seulement le nom et le
sens de la variable (`packages/kit/src/referentiel/theme.ts:34`). La valeur
vient du fichier Figma, comme celle de tout token lié :

1. Architect lit déjà le catalogue de référence : les variables de la library
   choisie, dont la collection `theme` qu'UCM Palettes a écrite
   (`src/catalogue.ts`).
2. Il y trouve `elevation/raised` par son nom, dans la collection de rôle
   `theme`.
3. Il résout sa valeur dans chaque mode, en suivant les alias jusqu'aux
   primitives, comme il le fait pour une couleur liée.

Si la variable n'est pas dans le catalogue, parce que la library du thème n'est
pas activée, la mesure passe au repli B. Une ligne de la section Informations
le dit : « Fond lu sur la page Figma : `elevation/raised` est introuvable. »

La valeur n'est pas lue aujourd'hui, puisqu'aucun layer n'y est lié. Le lot
ajoute son import, deux variables par analyse, dans la lecture du catalogue.

### 7.6 « La règle de label vise une property que le composant n'a pas »

Décidé (R-22) : la phrase simple et « propriété ». Constat C45, écart
`sans-propriete` (`src/regles.ts:80`).

Le contrôle compare les règles `@prop` et `@boolean` de l'instance de règles
aux props du contrat. La règle `label` ne trouve aucune prop de ce nom. La
cause n'est pas établie : Button n'a peut-être pas de propriété `label`, ou sa
propriété de texte n'entre pas dans les props du contrat. Le rapport
téléchargeable de Button la tranchera (R-21).

Texte retenu :

> **À corriger** La règle `label` ne correspond à aucune propriété de Button.
> Donnez-lui le nom exact de la propriété, ou supprimez-la.

« Property » devient « propriété » dans les phrases. Deux règles écrites
changent avec ce choix :

- la table des termes de CONTRIBUTING.md, qui écrit « component property » et « variant property » ;
- `tests/loiDuVocabulaire.test.ts`, qui exige les termes de Figma en anglais.

Les noms de types de Figma restent tels quels, comme `Instance swap`. Les
phrases concernées : `src/ui/textes/ignores.ts`, lignes 141, 144 et 159.

## 8. Le constat d'Alert : un stroke lié à `foreground`

Constat C17, À corriger (`packages/kit/src/controles/mapping.ts:47`).

#### Pourquoi il apparaît

C17 vérifie le rôle du token lié, le dernier segment de son nom. La fonction
`rolesAdmis` donne les rôles qu'un champ accepte :

| Champ lié | Rôles admis aujourd'hui |
|---|---|
| stroke d'un layer nommé `ring` ou `focus` | `ring` |
| autre stroke | `border` |
| fill d'un texte | `foreground`, `text` |
| fill d'une icône | `icon`, `foreground` |
| autre fill | `background` |

Le registre des rôles définit pourtant `foreground` comme la « couleur commune
au texte, à l'icône et à la bordure posés sur un fond »
(`packages/kit/src/referentiel/vocabulaire.ts:159`). Le texte et l'icône
l'admettent ; le stroke l'a oublié. Le contrôle contredit le registre.

#### Correction

Une ligne de `rolesAdmis` change : un stroke hors anneau admet
`['border', 'foreground']`. Le premier rôle reste celui qu'une correction pose :
un stroke en dur reçoit toujours une proposition `border`. Le stroke d'un
anneau garde `['ring']`.

Trois cas entrent dans les tests de C17 :

| Cas | Avant | Après |
|---|---|---|
| Stroke d'Alert Outlined lié à `Color/Info/Outlined/foreground` | C17 | Aucun constat |
| Stroke lié à un token `background` | C17 | C17 |
| Stroke d'un layer `ring` lié à `foreground` | C17 | C17 |

## 9. Les constats de Stresstest : un gap Auto lu comme une valeur

Constat C29, À corriger.

#### Pourquoi il apparaît

Quand le gap d'un auto layout vaut Auto, Figma répartit l'espace lui-même
(`primaryAxisAlignItems` vaut `SPACE_BETWEEN`). Le champ `itemSpacing` garde
pourtant la dernière valeur saisie, 10 ou 20 px, sans aucun effet. Le relevé
lit `itemSpacing` dès que le layer est en auto layout
(`src/releveDuComposant.ts:159`), sans regarder `primaryAxisAlignItems`. La vue
fait de même (`src/lectureDuComposant.ts:198`). C29 voit alors une valeur en
dur et propose d'en faire un token.

L'exporteur a déjà la règle : `inapplicableReason`
(`packages/plugin-socle/src/composant/contract/nodeBindings.ts:222`) écarte
`itemSpacing` sous un gap Auto ou une grille, et `counterAxisSpacing` sans wrap
ou sous un vertical gap Auto. Cette fonction n'est pas exportée : Architect a
écrit sa propre lecture et n'a pas repris la règle.

#### Correction

1. Le socle exporte la règle sous un nom à lui, par exemple
   `espacementSansEffet(noeud, champ)`, bâti sur `inapplicableReason`.
   L'exporteur, le relevé et la vue lisent cette seule fonction.
2. Le relevé et la vue sautent un espacement sans effet. Les champs dont la
   règle a besoin, `primaryAxisAlignItems` et `counterAxisAlignContent`, sont
   déjà lus par l'acquisition du socle.
3. Tests : un auto layout Auto avec `itemSpacing` à 10 ne donne aucun C29 ; le
   même en `MIN` en donne un ; la vue n'affiche pas le gap en dur.

C'est la même famille de défaut que le stroke weight d'un layer sans contour,
corrigé en R-1 : une valeur que Figma garde sans l'appliquer.

## 10. Questions au mainteneur

| N° | Question | Proposition | État |
|---|---|---|---|
| R-11 | Largeurs de la fenêtre en mode Composant | | Décidé : 500 px minimum et à l'ouverture, barre compacte avec Analyser en toutes lettres |
| R-12 | Largeur du panneau et de la Configuration | | Décidé : panneau à 640 px par défaut, fenêtre ouverte à 1144 px |
| R-13 | Forme d'un variant | | Décidé : B dans la section Variants, C dans les constats |
| R-14 | Le bouton de modèle | | Décidé : une carte dans le panneau, par section concernée |
| R-15 | Le tableau des variants | | Décidé : retiré |
| R-16 | Le bouton Sélectionner | | Décidé : désactivé une fois les layers sélectionnés ; ouvrir une carte ne sélectionne plus ; bouton avant le chevron |
| R-17 | Mots entiers dans les dossiers, abréviations dans les variables, dans toutes les collections | Oui, comme le plan de Nomenclature | Ouvert |
| R-18 | `.Ring`, pièce partagée : option 1, 2 ou 3 | 1 tout de suite, 2 si le radius de l'anneau doit suivre celui de chaque composant | En discussion |
| R-19 | Une section Informations en dernier, hors du compte des constats | Oui, avec tous les constats `info` sans geste ; l'alerte Information quitte les cartes | En discussion |
| R-20 | Le fond d'un variant sans fill | | Décidé : fond d'élévation du thème dans chaque mode, page Figma en repli |
| R-21 | Envoyer le rapport téléchargeable de Button | Pour établir la cause de C45 et les cibles de C21 | Ouvert |
| R-22 | « propriété » dans les phrases | | Décidé : oui ; les types de Figma restent en anglais |
| R-23 | Mesurer sur `elevation/raised` seul, ou sur `elevation/page` et `elevation/raised` | Les deux, la carte nomme celui qui échoue | Ouvert |
| R-24 | Un seuil de contraste propre aux variants désactivés | Non : à décider hors de cette recette | Ouvert |
| R-25 | La Configuration prend la place du panneau quand il est ouvert, celle de la vue quand il est fermé | Oui | Ouvert |

## 11. Ordre de travail proposé

Les corrections du kit ne dépendent pas de la maquette. Elles peuvent passer
en premier, dans une seule version du kit :

| Lot | Contenu | Dépend de |
|---|---|---|
| K1 | C21 écarte une liaison qui porte les valeurs de son variant (7.1) | — |
| K2 | C10 lit l'écriture des dossiers, et le test qui l'impose (7.2) | R-17 |
| K3 | C17 admet `foreground` sur un stroke (8) | — |
| K4 | Fond d'élévation du thème pour le contraste (7.5) | R-23 |
| K5 | Pièce partagée : `theme` et `layout` admis dans ses layers (7.3) | R-18 |
| S1 | Le socle exporte la règle des espacements sans effet ; relevé et vue la lisent (9) | — |
| A1 | Frontière, Configuration en bascule et à sa place, Actualiser désactivé (1) | R-25 |
| A2 | Fenêtre à 500 px, panneau à 640 px, barre compacte (1) | — |
| A3 | Changement de variant sans saut, chevron des sections de la liste (2) | — |
| A4 | Variants en puces, tableau retiré (3, 5) | — |
| A5 | Carte de modèle et cartes de correction qu'elle produit (4) | — |
| A6 | Bouton Sélectionner, textes des constats, section Informations (6, 7.4, 7.6) | R-19 |

Le plan d'implémentation s'écrira après les réponses, dans ce dossier.

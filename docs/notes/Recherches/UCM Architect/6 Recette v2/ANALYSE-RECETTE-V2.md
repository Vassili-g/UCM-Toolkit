# Recette v2 d'Architect : analyse et propositions

Ce document part de la recette Figma du mode Composant du 28 octobre, sur
Button, Alert et Stresstest. Chaque point de la recette y reçoit sa cause,
lue dans le code, et une proposition. Rien n'est implémenté.

La maquette [MAQUETTE-RECETTE-V2.html](./MAQUETTE-RECETTE-V2.html) montre les
propositions d'interface sur les écrans réels figés de la galerie d'Architect.
Les questions au mainteneur sont numérotées à la suite de la recette v1, de
R-11 à R-30. La section 11 les réunit avec leur état ; la maquette les reprend
en section 8.

Le mainteneur a relu une première version de la maquette. Ses réponses sont
reportées dans chaque section. Le chantier des garanties de Palettes sur la
carte entre dans la recette (section 10). Reste ouvert : R-30, qui suit sa
mesure.

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

Dans les deux cas, la largeur de la fenêtre ne change pas. Décidé (R-25).

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

### Valeurs seules, à l'essai

En voyant la liste avant / après de la carte 4e, le mainteneur juge que les
puces `Color=Info` prennent encore trop de place. Il propose les valeurs
seules, avec le nom de la property dans une bulle au survol. La maquette essaie
trois formes sur la même carte de constat et la même liste (cadres 3h à 3j) :

| Forme | Ce qui s'affiche | Au survol |
|---|---|---|
| C, retenue au tour précédent | `Color=Info` `Variant=Contained` `State=Default` | Rien |
| E. Valeurs en puces | `Info` `Contained` `Default` | La puce montre `Color=Info` |
| F. Valeurs en texte | Info, Contained, Default, en gris | Chaque valeur montre sa paire |

Une valeur seule perd une information quand deux properties ont la même
valeur, par exemple `Default` dans `State` et dans `Size`. Dans ce cas seul, la
puce garde sa property.

Avis : E. Elle divise la largeur par deux et garde la forme d'objet de la
puce. Le texte exact de Figma reste dans la bulle, pour le chercher dans
Figma. Décidé (R-27) : E.

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
   Dans cette liste, la colonne « Aujourd'hui » montre d'abord la valeur en dur,
   `#0369A1 en dur`, que la colonne « Après » remplace par le token. Le variant
   passe en second, en valeurs seules (section 3, « Valeurs seules »).
3. Un layer dont le token attendu n'existe pas, ou existe en plusieurs
   exemplaires, devient une question dans la même section.
4. Le designer applique carte par carte, ou avec Appliquer tout. Ctrl+Z défait
   le lot.

### Le bouton et le chevron d'une carte de constat

Deux tours ont placé le bouton dans l'en-tête de la carte : d'abord avant le
chevron, puis entre le contenu et le chevron. Les deux formes ont été jugées
étranges. Sur une carte de trois lignes, le bouton se centre en hauteur et
flotte au milieu ; le chevron se retrouve loin du titre.

Une carte de correction garde son Appliquer dans l'en-tête : son en-tête tient
sur deux lignes, et cette forme est validée (R-8). Une carte de constat, plus
haute, prend une autre forme (cadre 4d) :

- Le chevron reste en haut à droite, sur la ligne de la sévérité, comme sur
  toutes les cartes de constat.
- Les boutons vont dans une ligne d'actions en bas de la carte, alignés à
  gauche sous le texte. Cette ligne remplace la phrase d'action :
  « Proposer les liaisons » dit déjà le geste.
- Sélectionner rejoint cette ligne (section 6).

Le chevron déplie la carte. Pour la carte de modèle, il montre les layers
concernés et le token de chacun dans le modèle (cadre 4f) :
`container`, fill, `Color/Primary/Contained/Default/background`. Le designer voit
ce qui sera repris avant de cliquer.

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

Sur une carte de constat, le bouton va dans la ligne d'actions en bas de la
carte, et le chevron reste en haut à droite (section 4, « Le bouton et le
chevron d'une carte de constat »).

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

Le rapport de Button (R-21) donne les cibles exactes :

| Token lié | Cible dans le thème | Signature de C21 |
|---|---|---|
| `Button/Color/Info/Contained/Focus/ring`, et Success, Warning, Error | `Info/Vivid/ring` | `vivid/ring` |
| `Button/Color/Primary/Contained/Focus/ring`, et Secondary | `Primary/ring` | `ring` |

Les palettes de statut ont deux intensités, Soft et Vivid : leur anneau est
rangé sous `Vivid`. Les palettes de marque, Primary et Secondary, n'en ont
qu'une : leur anneau n'a pas ce segment. Les 12 variants Focus de statut
forment la majorité. Les 6 variants Focus de marque reçoivent C21, sur les
trois valeurs de `Variant`. Le constat vient d'une différence de structure du
thème, pas d'une erreur de liaison. La correction ci-dessous le retire.

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

Décidé (R-17) : la règle vaut pour toutes les collections.

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
| Couleur du stroke | Non : elle dépend du composant, comme dans le fichier aujourd'hui | Un token de l'hôte, en surcharge sur l'instance |
| Stroke weight, écart | Oui | `layout`, par exemple `Stroke/outline-weight` |
| Radius | Non : il suit le radius du composant qui l'entoure, plus l'écart de l'anneau. Un Button Small et un Input n'ont pas le même | Dépend du composant hôte |

L'épaisseur et le radius se lient une fois, dans le composant principal. La
couleur se surcharge dans chaque hôte.

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

#### Décision

Option 1, avec une précision du mainteneur : la couleur de l'anneau dépend du
composant, comme le fichier le fait aujourd'hui. Chaque hôte la surcharge sur
son instance `.Ring`, avec ses propres tokens (`Color/Primary/Contained/Focus/ring`
pour Button).

La règle devient :

| Liaison | Où elle est posée | Ce qu'Architect admet |
|---|---|---|
| Radius, stroke weight | Composant principal de la pièce interne | `theme` ou `layout`, sans constat |
| Couleur | Surcharge sur l'instance, dans l'hôte | Un token de l'hôte, sinon C80 comme tout layer de l'hôte |
| Toute propriété | Valeur en dur | Un constat, comme aujourd'hui |

Pour appliquer la première ligne, le relevé doit savoir qu'une liaison vient du
composant principal sans changement. Deux moyens : comparer la liaison de
l'instance à celle du layer correspondant dans le composant principal, ou lire
`InstanceNode.overrides`. Le lot choisira le moins coûteux, mesuré sur Button.

Le constat du radius de `.Ring` disparaît. Le cadre 7b n'a plus d'objet.

#### Factoriser et documenter la notion

Oui, la notion doit vivre à un seul endroit. Aujourd'hui, trois lecteurs
classent un composant imbriqué, chacun à sa façon :

| Lecteur | Ce qu'il distingue | Où |
|---|---|---|
| Exporteur | Composant unifié déclaré par `.componentRules`, wrapper de dimensions, détail d'implémentation | socle, `composant/contract/`, et FORMAT.md, « Composition et dépendances » |
| Relevé d'Architect | Liaison d'une instance imbriquée, rattachée à l'hôte (`surcharge`) | `src/releveDuComposant.ts`, kit `controles/releve.ts` |
| Contrôles du kit | Rien : C80 juge tout layer comme un layer de l'hôte | `controles/couche.ts` |

Proposition, en trois couches, selon la règle des domiciles d'AGENTS.md :

1. **Le kit définit les sortes.** Un fichier du référentiel, par exemple
   `packages/kit/src/referentiel/composition.ts`, nomme les sortes d'un
   composant imbriqué et la façon de les reconnaître :

   Le préfixe `.` ou `_` marque une **pièce interne** : un composant sans
   collection ni contrat, qui ne sert jamais seul. Elle peut servir à un seul
   composant, comme une sous-pièce, ou à plusieurs, comme `.Ring`.

   | Sorte | Se reconnaît à | Son contrat | Ses liaisons |
   |---|---|---|---|
   | Dépendance | Une instance de `.componentRules` la nomme, sur la page de son composant principal | Le sien ; l'hôte la cite dans `composes` | Jugées dans son propre contrat |
   | Wrapper de dimensions | La définition de FORMAT.md, « Layout » ; préfixé ou non, comme `.sizeWrapperButton` | Aucun ; ses props et dimensions entrent dans celles de l'hôte | Comme une pièce interne |
   | Pièce interne | Préfixe `.` ou `_`, sans `.componentRules` | Aucun ; chaque hôte publie ce qu'elle dessine | Composant principal : `theme`, `layout` ou tokens de l'hôte. Surcharges dans l'hôte : tokens de l'hôte |
   | Détail d'implémentation | Tout autre composant imbriqué, sans préfixe ni règles | Aucun | Tokens de l'hôte |

   Une fonction pure, `sorteDeLImbrique(faits)`, rend la sorte depuis des faits
   sérialisables : nom, règles d'utilisation trouvées, dimensions liées. Elle
   teste les sortes dans l'ordre du tableau : le wrapper de dimensions passe
   avant la pièce interne.

   **Pourquoi ne pas distinguer sous-pièce et pièce partagée (R-29).** La
   distinction ne change qu'une chose : une sous-pièce pourrait lier son
   composant principal aux tokens de son seul hôte, une pièce partagée ne le
   peut pas. Exiger ce lien d'une sous-pièce rapporterait peu. Une sous-pièce
   liée à `layout` reste liée à un token : rien n'est en dur, et le contrat de
   l'hôte publie la valeur. Le seul manque : l'hôte ne peut pas régler cette
   valeur par son propre token sans modifier la sous-pièce. C'est un choix du
   designer, pas une erreur. Les deux moyens de distinguer coûtaient plus que
   ce gain : compter les hôtes est fragile, une déclaration ajoute un geste.
   Une seule sorte, « pièce interne », suffit.
2. **Le socle relève les faits, une fois.** L'exporteur et le relevé
   d'Architect lisent les mêmes faits par la même acquisition, puis appellent
   la fonction du kit. Un test refuse qu'un des deux classe un imbriqué sans
   elle.
3. **Les documents renvoient au kit.** CONCEPT.md, section 2, ajoute la pièce
   partagée à côté du composant simple et du composant composé, en une phrase.
   FORMAT.md, « Composition et dépendances », renvoie à la fonction du kit au
   lieu de répéter les règles. L'invariant du référentiel
   (`packages/kit/invariants/referentiel.md`) reçoit la règle.

Le préfixe `.` ou `_` devient alors une convention UCM écrite : le designer
déclare ainsi qu'une pièce ne sert jamais seule. Figma ne publie déjà pas ces
composants. Décidé (R-26) : la notion est factorisée dans UCM Toolkit. Le
mainteneur a précisé qu'une pièce préfixée peut servir à un seul composant ou
à plusieurs : la sorte « pièce interne » couvre les deux cas, avec la même
règle de liaison (R-29).

### 7.4 « Les 18 variants State=Disabled ne sont pas mesurés »

Constat C53, Information (`packages/kit/src/controles/accessibilite.ts:133`).

WCAG 2.2, critères 1.4.3 et 1.4.11 : un composant inactif n'a pas d'exigence
de contraste. Architect ne mesure donc pas les variants `State=Disabled`, et
le dit dans une carte. CONTRIBUTING.md écarte tout message sans geste.

Le premier tour proposait une carte, une ligne grise sous Accessibilité, rien,
ou un seuil propre aux désactivés (R-24, hors de cette recette).

#### La proposition du mainteneur : une section Informations

Décidé (R-19). Une dernière section du panneau, « Informations », réunit
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

Un composant sans fond prend la couleur de ce qui est dessous. Dans le
produit, deux fonds UCM peuvent se trouver dessous :

- `elevation/page`, le fond de la page elle-même ;
- `elevation/raised`, le fond d'une carte posée sur la page.

Ces deux fonds n'ont pas la même couleur. Le contraste du stroke change donc
selon l'endroit où le composant est posé. Exemple, en Light, avec un stroke
`#8A94A6` :

| Le composant est posé | Fond | Contraste du stroke | Seuil 3:1 |
|---|---|---|---|
| Dans une carte | `elevation/raised`, `#FFFFFF` | 3,06:1 | Tenu |
| Directement sur la page | `elevation/page`, `#EEF2F6` | 2,72:1 | Échoue |

Le même Button passe dans une carte et échoue sur la page.

R-23 demande donc où un composant sans fond est censé se poser :

- toujours dans une carte : Architect mesure sur `elevation/raised` seul ;
- dans une carte ou sur la page : Architect mesure sur les deux fonds. La
  carte signale un échec sur l'un ou l'autre, et nomme le fond qui échoue.

Le mainteneur indique que les composants Outlined se posent sur
`elevation/raised`. Un Button se pose aussi sur la page, dans un formulaire.
Avis : les deux fonds.

#### Ce que UCM Palettes garantit

Le kit porte les sept garanties de contraste que Palettes tient pour chaque
palette (`GARANTIES`, `packages/kit/src/emplois/garanties.ts`). Elles portent
presque toutes sur la page, pas sur la carte :

| Variable du thème | Seuil | Garantie sur la page | Garantie sur la carte |
|---|---|---|---|
| `solid/default` | 3:1 | Oui | Non |
| `surface/foreground`, `surface/border` | 4,5:1, 3:1 | Oui, et sur les fonds `surface` | Non |
| `page/foreground` | 4,5:1 | Oui | Non |
| `page/border` | 3:1 | Oui | Non |
| `ring` | 3:1 | Oui | Oui |

Palettes prend donc en compte le contraste sur la page. C'est la carte qu'il ne
garantit pas, sauf pour l'anneau.

Palettes calcule le fond de la carte (`couleurDeLaCarte`, `packages/couleur/src/jugement.ts:66`) :
blanc en Light, et en Dark le cran juste plus clair que la page. Le risque
n'est donc pas le même dans les deux modes :

| Mode | La carte, par rapport à la page | Un texte ou un contour, posé sur la carte |
|---|---|---|
| Light | Plus claire | Gagne du contraste : il est foncé sur un fond plus clair |
| Dark | Plus claire | Perd du contraste : il est clair sur un fond moins sombre |

Une garantie tenue sur la page tient donc en général sur la carte en Light,
mais pas en Dark. C'est en Dark qu'un composant posé sur une carte peut passer
sous le seuil.

#### La règle retenue

Décidé (R-23) : Architect mesure sur les deux fonds, et la sévérité suit la
garantie de Palettes. Architect suit l'alias du token jusqu'à la variable du
thème, puis cherche cette variable et ce fond dans `GARANTIES` :

| Échec du contraste | Sévérité | Ce que dit la carte |
|---|---|---|
| Sur un fond que Palettes garantit pour cette variable | À corriger | Le fond, le mode et le contraste ; Palettes garantit ce contraste, donc la palette est hors garantie ou le token lié n'est pas le bon |
| Sur un fond que Palettes ne garantit pas | À vérifier | Le fond, le mode et le contraste ; Palettes ne garantit pas ce fond pour cette variable ; vérifiez si le composant s'y pose |
| Variable hors du thème UCM, ou fond de repli de la page Figma | À vérifier | Le fond mesuré, et qu'aucune garantie ne s'applique |

Il n'y a donc pas de constat dur sur un usage que Palettes ne promet pas. La
garantie est lue dans le kit, la même source que Palettes : une garantie
ajoutée à Palettes change la sévérité d'Architect sans autre lot.

Textes proposés (cadre 7f) :

> **À corriger** Sur la page, `elevation/page`, le stroke a un contraste de
> 2,4:1 en Dark, sous le seuil de 3:1. UCM Palettes garantit ce contraste pour
> `page/border`. Vérifiez la palette dans UCM Palettes, ou le token lié.

> **À vérifier** Sur une carte, `elevation/raised`, le stroke a un contraste de
> 2,7:1 en Dark, sous le seuil de 3:1. UCM Palettes ne garantit pas ce
> contraste sur une carte. Vérifiez si Button se pose sur une carte.

#### Une question pour Palettes

Les composants Outlined se posent sur une carte, et Palettes ne garantit pas
leurs couleurs sur ce fond.

Le fond le plus exigeant n'est pas le même selon le mode :

| Mode | Fond le plus exigeant pour un texte ou un contour |
|---|---|
| Light | La page : la carte est blanche, donc plus claire, et un contenu foncé y gagne du contraste |
| Dark | La carte : elle est plus claire que la page, et un contenu clair y perd du contraste |

En Dark, une garantie tenue sur la carte est donc tenue sur la page, pas
l'inverse. Palettes juge aujourd'hui sur la page dans les deux modes : en Dark,
il juge sur le fond le plus facile.

Décidé (R-28) : Palettes juge aussi les garanties 2 à 6 sur la carte, et ce
chantier entre dans la recette (section 10). Une fois les garanties étendues,
la sévérité d'Architect suit sans autre lot, puisqu'il lit les mêmes
garanties.

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
aux props du contrat.

#### La cause, établie par le rapport de Button

Le rapport de Button (R-21) donne les propriétés du jeu et des composants
imbriqués :

| Où | Propriétés |
|---|---|
| Button | `Color`, `Variant`, `State` |
| `.sizeWrapperButton`, imbriqué dans chaque variant | `Size`, `Label`, `Icon-Left`, `Icon-Right` |

Les quatre règles signalées, `size`, `label`, `iconLeft` et `iconRight`,
visent les propriétés de `.sizeWrapperButton`. C'est le wrapper de dimensions
de Button : l'exporteur fusionne ses propriétés dans l'API de Button (FORMAT.md,
« Layout »), et le contrat les publie.

C45 ne les voit pas. `lireLesRegles` (`src/regles.ts:150`) restreint les props
du contrat à celles que le jeu déclare, plus celles des imbriqués rattachés au
parent. Les props fusionnées du wrapper ne sont dans aucune des deux listes :
elles sont retirées avant la comparaison.

Les quatre constats sont faux. Correction : C45 compare les règles à toutes les
props que le contrat publie, wrapper compris. La sorte « wrapper de dimensions »
de R-26 donne cette liste : la même fonction sert l'exporteur et Architect.

Le cinquième constat est juste : la propriété `State` n'a pas de règle.

#### Le texte du constat

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

## 10. Le chantier de Palettes : les garanties sur la carte

Décidé : ce chantier entre dans la recette (R-28).

### Ce que Palettes juge aujourd'hui

La spécification de Palettes, section 11.2
(`docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md`),
juge les sept garanties contre la page. Seule G7, l'anneau, se juge aussi
contre la carte (`[VER-21]`). La spécification en donne la raison : « la
carte, plus claire que la page en Dark, est la plus exigeante ». La même
raison vaut pour les autres garanties, qui ne l'appliquent pas.

| Garantie | Premier membre | Fonds jugés aujourd'hui | Fonds proposés |
|---|---|---|---|
| G1 | `solid/foreground` | `solid/*` | Inchangés : le texte d'un bouton se pose sur le bouton |
| G2 | `solid/default` | Page | Page et carte |
| G3 | `surface/foreground` | `surface/*`, page | `surface/*`, page et carte |
| G4 | `surface/border` | `surface/*`, page | `surface/*`, page et carte |
| G5 | `page/foreground` | Page | Page et carte |
| G6 | `page/border` | Page | Page et carte |
| G7 | `ring` | Page et carte | Inchangés |

Règle proposée : partout où la page est un fond garanti, la carte l'est aussi.
Elle vaut dans les deux modes. En Light, la carte est blanche et la garantie y
tient presque toujours. En Dark, c'est elle qui contraint.

### Ce que le changement touche

| Couche | Changement |
|---|---|
| Kit, `packages/kit/src/emplois/garanties.ts` | `FOND_DE_LA_CARTE` rejoint les fonds de G2 à G6. Le kit monte de version : Palettes et Architect lisent `GARANTIES` |
| Moteur, `packages/couleur/src/promesses.ts` et `jugement.ts` | Rien à écrire : il juge déjà chaque fond de la liste, et sait calculer la carte. Le nombre de promesses passe de 16 à 21 par mode et par intensité |
| Palettes, interface | La carte des garanties et la réglette ont déjà deux colonnes, « sur la page » et « sur la carte », pour G7. Les garanties 2 à 6 les prennent aussi |
| Palettes, planche et rapport | Les promesses sur la carte s'ajoutent. Les textes qui comptent les contrôles changent : 64 et 32 deviennent 84 et 42 |
| Spécification de Palettes | Section 11.2 et `[VER-21]` réécrits. Le nombre de contrôles change |
| Architect | Rien de plus que K4 : la sévérité suit `GARANTIES` |

### Le risque : des palettes qui ne tiennent plus

La spécification a mesuré G2 à G7 sur 14 références et sur 864 références de
toutes teintes : aucune n'échoue sur la page. Rien n'a été mesuré sur la carte
en Dark. Le premier lot du chantier refait cette mesure avec la carte, avant
toute écriture.

Si des palettes échouent sur la carte en Dark, trois réponses existent :

1. accepter : Palettes signale la garantie manquée, comme aujourd'hui sur la page, et propose « Ajuster la référence » ;
2. changer un cran de la table des dossiers en Dark (`TABLE_DES_DOSSIERS`), pour la variable qui échoue ;
3. rapprocher la carte de la page en Dark (`[MOT-37]`).

Le choix dépend du nombre de références touchées. R-30 le pose une fois la
mesure faite.

## 11. Questions au mainteneur

| N° | Question | Proposition | État |
|---|---|---|---|
| R-11 | Largeurs de la fenêtre en mode Composant | | Décidé : 500 px minimum et à l'ouverture, barre compacte avec Analyser en toutes lettres |
| R-12 | Largeur du panneau et de la Configuration | | Décidé : panneau à 640 px par défaut, fenêtre ouverte à 1144 px |
| R-13 | Forme d'un variant | | Décidé : B dans la section Variants, C dans les constats |
| R-14 | Le bouton de modèle | | Décidé : une carte dans le panneau, par section concernée |
| R-15 | Le tableau des variants | | Décidé : retiré |
| R-16 | Le bouton Sélectionner | | Décidé : désactivé une fois les layers sélectionnés ; ouvrir une carte ne sélectionne plus ; bouton avant le chevron |
| R-17 | Mots entiers dans les dossiers, abréviations dans les variables, dans toutes les collections | | Décidé : oui |
| R-18 | `.Ring`, pièce partagée | | Décidé : option 1 ; la couleur reste surchargée par chaque hôte |
| R-19 | Une section Informations en dernier, hors du compte des constats | | Décidé : oui ; l'alerte Information quitte les cartes |
| R-20 | Le fond d'un variant sans fill | | Décidé : fond d'élévation du thème dans chaque mode, page Figma en repli |
| R-21 | Le rapport téléchargeable de Button | | Reçu : il établit les causes de C21 (7.1) et de C45 (7.6) |
| R-22 | « propriété » dans les phrases | | Décidé : oui ; les types de Figma restent en anglais |
| R-23 | Le fond d'un composant sans fond | | Décidé : la page et la carte ; À corriger si Palettes garantit ce fond pour la variable, À vérifier sinon ; la carte nomme le fond et la garantie |
| R-24 | Un seuil de contraste propre aux variants désactivés | | Décidé : non |
| R-25 | La Configuration prend la place du panneau quand il est ouvert, celle de la vue quand il est fermé | | Décidé : oui |
| R-26 | Les quatre sortes de composant imbriqué dans le référentiel du kit, et le préfixe `.` ou `_` comme convention de la pièce partagée | | Décidé : oui, factorisé dans UCM Toolkit |
| R-27 | Noms de variants | | Décidé : E, valeurs en puces, paire exacte au survol ; la property reste quand deux valeurs se confondent |
| R-28 | Les garanties de Palettes sur la carte | | Décidé : dans cette recette ; partout où la page est un fond garanti, la carte l'est aussi (section 10) |
| R-29 | Distinguer une sous-pièce d'une pièce partagée | | Décidé : non ; une seule sorte, « pièce interne », et une seule règle de liaison |
| R-30 | Si des palettes ne tiennent plus sur la carte en Dark : accepter, changer un cran de la table, ou rapprocher la carte de la page | Selon la mesure du lot P0 | Ouvert, après la mesure |

## 12. Ordre de travail proposé

Les corrections du kit ne dépendent pas de la maquette. Elles peuvent passer
en premier, dans une seule version du kit :

| Lot | Contenu | Dépend de |
|---|---|---|
| K1 | C21 écarte une liaison qui porte les valeurs de son variant (7.1) | — |
| K2 | C10 lit l'écriture des dossiers, et le test qui l'impose (7.2) | — |
| K3 | C17 admet `foreground` sur un stroke (8) | — |
| K4 | Contraste sur la page et la carte, sévérité selon les garanties de Palettes (7.5) | — |
| K5 | Sortes de composant imbriqué dans le référentiel, et leur test (7.3) | — |
| K6 | Pièce interne : `theme` et `layout` admis dans son composant principal (7.3) | K5 |
| P0 | Mesure des garanties G2 à G6 sur la carte, sur les références de la spécification (10) | — |
| P1 | Kit : la carte rejoint les fonds de G2 à G6 ; nouvelle version (10) | P0, R-30 |
| P2 | Palettes : carte des garanties, réglette, planche, rapport et textes ; spécification (10) | P1 |
| S1 | Le socle exporte la règle des espacements sans effet ; relevé et vue la lisent (9) | — |
| A1 | Frontière, Configuration en bascule et à sa place, Actualiser désactivé (1) | — |
| A2 | Fenêtre à 500 px, panneau à 640 px, barre compacte (1) | — |
| A3 | Changement de variant sans saut, chevron des sections de la liste (2) | — |
| A4 | Noms de variants en valeurs seules, tableau retiré (3, 5) | — |
| A5 | Carte de modèle et cartes de correction qu'elle produit (4) | — |
| A6 | Bouton Sélectionner, textes des constats, section Informations (6, 7.4, 7.6) | — |

Le plan d'implémentation s'écrira après les réponses, dans ce dossier.

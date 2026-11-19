# Architecture de référence complète

Ce document prépare la piste P21 de [`pistes.json`](../Evolutions%20globales/pistes.json).
Il propose le contenu attendu de chaque collection d'un fichier full UCM, avec
des valeurs de départ tirées de l'export Figma réel du mainteneur, et les lots
qui l'inscrivent dans le kit.

## En une page, pour le mainteneur

Une **collection** est un dossier de variables Figma, et UCM en compte 7
(`primitives`, `brands`, `utility`, `theme`, `layout`, `typography`,
`components`). Une variable peut porter une valeur (une couleur, 16 px) ou un
alias, c'est-à-dire un renvoi vers une autre variable. Un mode est une colonne
de valeurs, comme Light et Dark dans `theme` ou une colonne par marque dans
`brands`. Un cran est le numéro d'une nuance dans une palette, de 50 à 950. Une
échelle est la suite des valeurs d'une même famille, par exemple les rayons de
`xs` à `4xl`. La grammaire est la règle d'écriture des noms que le kit applique
déjà. La référence est la liste des variables qu'un fichier full UCM contient,
avec leurs noms et leurs valeurs de départ.

Le kit sait aujourd'hui écrire et lire les noms des 7 collections, et il connaît
le contenu complet de `theme`. Il ne dit pas quelles variables `brands`,
`utility`, `layout` et `typography` doivent contenir, ni avec quelles valeurs.
Le nouvel export du mainteneur suit déjà la structure attendue de `brands`,
`utility` et `theme`. Les écarts qui restent touchent `layout`, `typography` et
les noms de quelques groupes. Le tableau suivant résume la proposition pour
deux marques. Tous les noms proposés ont été passés à la grammaire actuelle du
kit (`reconnaitreLeChemin`), et aucun n'est refusé.

| Collection | Ce que la référence contient | Variables | Le nouvel export |
|---|---|---|---|
| `primitives` | Les palettes de couleur, 22 dimensions, 39 réglages de texte | 61 hors couleurs, 22 par palette de marque, 44 par palette de statut, 24 pour le neutre | Conforme, groupes de texte écrits soudés (`fontsize`) |
| `brands` | Par marque, `primary` et `secondary` en Light et en Dark, et les deux couleurs de charte | 46, une colonne par marque | Conforme |
| `utility` | Le neutre, quatre statuts en `soft` et `vivid`, deux niveaux d'élévation | 206 | Conforme |
| `theme` | Les 24 rôles du kit pour chaque palette | 295, en Light et en Dark | Présent, à comparer à la table du kit |
| `layout` | Espacements, rayons, épaisseurs de contour, tailles d'icône | 37 | Espacements conformes ; rayon nul, noms des contours et icônes à revoir |
| `typography` | 15 styles de texte, 5 réglages chacun | 75 | 4 réglages, sans police |
| `components` | Rien d'imposé, car ses variables naissent des composants dessinés | 0 | Les tailles d'icône y sont rangées sous un nom que la grammaire refuse |

Sur les six choix de designer, le nouvel export en a fait deux, en contredit
deux et en laisse deux ouverts. La partie 6 donne l'état de chacun et la
recommandation.

1. L'espacement numéroté par pas de 4 px, avec `sizing/2` à 8 px. Le nouvel
   export l'a fait.
2. Un rayon `none` à 0 px en plus des 9 rayons. Le nouvel export le laisse
   ouvert.
3. Les épaisseurs de contour nommées `sm` et `md` (1 et 2 px). Le nouvel export
   les nomme `outline-weight` et `ring-weight`.
4. Les icônes dans `layout`, en 5 tailles de 16 à 32 px. Le nouvel export en
   garde 6 dans `components`.
5. Une police dans chaque style de texte, et `body/lg` séparé de `body/md` par
   la taille. Le nouvel export le laisse ouvert.
6. `identity` en alias vers un cran Light. Le nouvel export l'a fait, et le
   designer confirme que ces crans portent la couleur de charte.

Le rôle d'Architect dans `brands` et `utility` est décidé, et la partie 4 le
décrit. Architect vérifie chaque lien, crée un lien manquant quand une seule
réponse existe, pose une question quand le designer doit choisir une palette,
et renvoie vers Palettes quand la couleur manque. Il ne crée jamais de couleur.

## 1. Les données lues

La source est le nouvel export du mainteneur, au format 2, rangé hors du dépôt
suivi. Cet agent n'avait pas le droit de le lire, donc la conversation
principale l'a lu et en a relevé les faits repris ici. Il porte les 7
collections sous leurs noms courants, deux modes de marque aux valeurs
identiques, et les thèmes Light et Dark. Les palettes de marque n'ont que Light
et Dark ; les autres ont `soft` et `vivid`, puis Light et Dark. Le neutre n'a
pas de profil.

Les trois écarts relevés dans l'ancien export du repository consommateur sont
corrigés. `sizing/2` vaut 8 px, le neutre de `utility` a 11 crans, et les
statuts ont leur cran 950. Le relevé du nouvel export détaille les trois styles
`body` de `typography`. Les 12 autres styles gardent ici les valeurs de
l'ancien export, et le lot 5 les compare.

Le nouvel export garde des noms que la référence écrit autrement.

| Nom du nouvel export | Nom de la référence | Ce que fait le kit |
|---|---|---|
| `primitives/fontsize/base`, `lineheight`, `letterspacing`, `fontweight`, `fontfamily` | `primitives/font-size/base`, `line-height`, `letter-spacing`, `font-weight`, `font-family` | La grammaire tolère la forme soudée, et Nomenclature la renomme |
| `typography/body/large/font-size` | `typography/body/lg/font-size` | La grammaire tolère `large`, `medium`, `small`, et Nomenclature les renomme |
| `layout/stroke/outline-weight`, `ring-weight` | `layout/stroke/sm`, `md` (proposé, partie 3.5) | La grammaire admet les deux écritures |
| `components/icon/size/base` | `layout/icon/md` (proposé, partie 3.5) | La grammaire refuse le nom actuel, qui finit sans propriété |

Trois écarts du nouvel export restent hors des noms.

- `layout/radius` n'a pas de rayon nul.
- `typography` n'a pas de police par style, et `body/lg` ne se distingue de
  `body/md` que par la graisse 600 et l'interligne.
- Le composant `stresstest` a 13 valeurs nulles et 15 couleurs qui visent
  `primitives` ou `utility` au lieu de `theme`. Il ne sert pas de référence.

## 2. Inventaire du kit, collection par collection

`packages/kit/src/referentiel/architecture.ts` définit `COLLECTIONS`,
`CIBLES_DES_COLLECTIONS` (qui peut viser qui), les familles de chaque
collection et `FORMES_DES_CHEMINS` (les formes de nom admises).
`packages/kit/src/emplois/dossiers.ts` définit les 24 rôles du thème et la table
de leurs crans.

| Collection | Ce que le kit définit | Ce qui manque |
|---|---|---|
| `primitives` | Familles `color`, `dimension`, `font-family`, `font-weight`, `font-size`, `line-height`, `letter-spacing`. Formes `color/<palette>/<thème>/<cran>`, avec ou sans profil, et `color/<palette>/white|black` | Les dimensions et réglages de texte attendus, et leurs valeurs |
| `brands` | Familles `identity`, `primary`, `secondary`. Formes `identity/<famille>` et `<famille>/<thème>/<cran>`. L'axe des marques (`data-brands`) | La liste attendue par marque, la cible de `identity` |
| `utility` | Familles `success`, `warning`, `info`, `danger`, `neutral`, `elevation`. Formes du neutre, des statuts et de l'élévation | La liste attendue, les crans visés par `elevation/page` et `elevation/raised` |
| `theme` | Les 24 rôles, la table des crans par thème et par sens, les supports et les scopes | Rien, la référence le reprend tel quel |
| `layout` | Familles `sizing`, `radius`, `stroke`, `icon`. Mesures numériques admises dans `sizing` | Les crans de chaque échelle et leurs valeurs |
| `typography` | Familles `display` à `label`, tailles du registre, 5 propriétés de texte | Les tailles retenues par famille et leurs valeurs |
| `components` | Formes `<composant>/color/...` et `<composant>/size/...`, 15 propriétés de taille | Rien pour la référence |

Les cibles d'élévation figuraient dans `ARCHITECTURE-FINALE-MULTIMARQUES.md`,
retiré du dépôt, et le nouvel export les suit. La page vise le cran 50 du
neutre en Light et en Dark. La carte vise le blanc en Light et le cran 100 du
neutre en Dark. Aucun fichier du kit ne les porte.

## 3. Proposition, collection par collection

Chaque échelle donne ce que le nouvel export contient, ce que publient les
design systems de `docs/references/design-systems/`, la proposition et sa
raison. Les valeurs sont en px. Un design system absent d'un tableau ne publie
pas cette échelle dans son `valeurs.json`.

### 3.1 `primitives`

Palettes écrit seul les couleurs de `primitives`. La référence n'en fixe que la
forme, que le nouvel export suit. Une palette de marque a 11 crans en Light et
11 en Dark, soit 22 variables. Une palette de statut a les profils `soft` et
`vivid`, soit 44 variables. Le neutre a 22 crans et `white` et `black`, soit 24
variables.

Les valeurs hors couleur sont celles que `layout` et `typography` visent. Un
nombre que rien ne vise sort de la référence, et le registre reste ouvert à
d'autres valeurs.

| Famille | Nouvel export | Proposition | Raison |
|---|---|---|---|
| `dimension` | 29 valeurs, de `none` à `full` | 22 valeurs : `none`, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 80, 96, `full` | 11, 18, 22, 30, 60, 72 et 128 ne servent à aucune variable de `layout` proposée |
| `font-family` | `base` (Open Sans) | `base` | La seule police de l'export |
| `font-weight` | 400, 600, 700 | 400, 600, 700 | Fluent publie 4 graisses, Radix 4, Material 3 en emploie 2. Trois suffisent aux 15 styles |
| `font-size` | 16 tailles, `4xs` (8) à `9xl` (128) | 13 tailles, `3xs` (10) à `8xl` (96) | `4xs`, `2xs` et `9xl` ne servent à aucun style. Les noms et valeurs de `xs` à `8xl` sont ceux de Tailwind |
| `line-height` | 16 valeurs, 11 à 128 | 14 valeurs, 12 à 96 | 11 et 128 ne servent à aucun style |
| `letter-spacing` | 8 valeurs, -2,5 à 0,25 | les mêmes 8 | Toutes servent |

La référence écrit les groupes avec un tiret (`font-size`), comme les décisions
T04, T05 et T13 de la nomenclature. Elle garde les noms des valeurs de l'export
(`font-size/base`, `font-weight/400`).

### 3.2 `brands`

Une marque a toujours `primary` et `secondary`, et c'est décidé. Chaque mode de
marque porte 46 variables, toutes des alias vers `primitives`. Le nouvel export
les porte toutes.

| Variables | Nombre | Cible |
|---|---|---|
| `primary/light/50` à `primary/light/950` | 11 | `primitives/color/<palette primaire>/light/<même cran>` |
| `primary/dark/50` à `primary/dark/950` | 11 | `primitives/color/<palette primaire>/dark/<même cran>` |
| `secondary/light/*` et `secondary/dark/*` | 22 | La palette secondaire, même règle |
| `identity/primary`, `identity/secondary` | 2 | Le cran Light qui porte la couleur de charte de la famille |

Une couleur de charte sert au logo et aux aplats imposés. Palettes ancre la
couleur saisie dans un cran de sa rampe, donc `identity` vise ce cran par
alias, sans valeur directe. Une couleur directe hors de `primitives` donne un
constat C82. Dans le nouvel export, `identity/primary` vise le cran Light 600
d'une palette de marque, et `identity/secondary` le cran Light 900 d'une autre.

### 3.3 `utility`

`utility` porte 206 variables dans un seul mode, toutes des alias vers
`primitives`. Le nouvel export les porte toutes, avec les cibles d'élévation de
la dernière ligne.

| Variables | Nombre | Cible |
|---|---|---|
| `neutral/light/<cran>`, `neutral/dark/<cran>` | 22 | La palette neutre (`titanium` dans l'export) |
| `neutral/light|dark/white`, `neutral/light|dark/black` | 4 | `white` et `black` de la palette neutre |
| `success/soft|vivid/light|dark/<cran>` | 44 | La palette choisie pour le succès |
| `warning/...`, `info/...`, `danger/...` | 132 | Une palette par statut, même règle |
| `elevation/light/page`, `elevation/dark/page` | 2 | Le cran 50 du neutre, dans le thème |
| `elevation/light/raised`, `elevation/dark/raised` | 2 | `white` en Light, le cran 100 du neutre en Dark |

Le kit écrit les cibles d'élévation dans une table (lot 1). Le réglage « Fond
de la page » de Palettes doit viser la même couleur que `elevation/page`, sinon
les garanties de contraste mesurent un autre fond.

### 3.4 `theme`

`theme` reprend tel quel le contenu du kit, soit 295 variables en Light et en
Dark. Chaque palette de marque a 15 rôles et 11 crans de `scale`, soit 26. Le
neutre en a 30, avec `page/foreground-main`, `page/foreground-subtle`,
`scale/0` et `scale/1000`. Les 8 palettes de statut (4 statuts, 2 profils) en ont
26 chacune. `disabled/*` et `elevation/*` ajoutent 5 variables globales. Le
nouvel export porte les 9 familles (`primary`, `secondary`, les 4 statuts,
`neutral`, `elevation`, `disabled`), et le lot 5 compare ses alias à la table.

La référence prend le sens normal de `TABLE_DES_DOSSIERS` pour chaque palette.
Le texte des boutons, réglé dans Palettes, fait passer une palette au sens
inversé, et Architect lit ce sens dans les alias.

### 3.5 `layout`

`layout` porte 37 variables, toutes des alias vers `primitives/dimension`. La
préparation d'Architect cherche, pour chaque marge, écart, rayon ou contour
d'un composant, la variable de `layout` qui vaut exactement la mesure. Une
mesure sans variable reste en dur. Une échelle trop courte laisse donc des
composants en dur, et une échelle qui a deux crans de même valeur donne une
question à chaque préparation.

#### Espacements, `sizing`

| Source | Crans | Valeurs |
|---|---|---|
| Nouvel export | 20 | 0, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 80, 96, nommés par la mesure divisée par 4 (`sizing/2,5` vaut 10) |
| Tailwind | un multiplicateur | n × 4, la même numérotation |
| Polaris | 18 | 0, 1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 112, 128 |
| Primer | 19 | 2, 4, 6, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 64, 80, 96, 112, 128 |
| Spectrum | 15 | 1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 |
| Figma SDS | 13 | 0, 2, 4, 6, 8, 12, 16, 24, 32, 48, 64, 96, 160 |
| Fluent 2 | 11 | 0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32 |
| Radix | 9 | 4, 8, 12, 16, 24, 32, 40, 48, 64, multipliés par 0,9 |

La proposition reprend les 20 crans du nouvel export. Le bouton emploie 10 px
pour son écart et 14 px pour sa marge horizontale. Seul Fluent publie 10, et
aucun système ne publie 14. Retirer ces deux crans laisserait le bouton en
dur. La numérotation par pas de 4 est celle de Tailwind, et la grammaire admet
la virgule (`0,5`), que la feuille CSS écrit `--layout-sizing-0-5`.

#### Rayons, `radius`

| Source | Crans nommés | Valeurs |
|---|---|---|
| Nouvel export | 9 | `xs` 2, `sm` 4, `md` 6, `lg` 8, `xl` 12, `2xl` 16, `3xl` 24, `4xl` 32, `full` |
| Tailwind | 8 | les mêmes noms et valeurs, sans `full` |
| Fluent 2 | 11 | 0, 2, 4, 6, 8, 12, 16, 24, 32, 40, cercle |
| Polaris | 10 | 0, 2, 4, 6, 8, 12, 16, 20, 30, `full` |
| Material 3 | 7 | 0, 4, 8, 12, 16, 28, `full` |
| Radix | 6 | 3, 4, 6, 8, 12, 16, multipliés par un facteur |
| Primer | 4 | 3, 6, 12, `full` |
| Figma SDS | 4 | 4, 8, 16, `full` |

La proposition garde les 9 rayons et ajoute `none` à 0 px, soit 10. Fluent,
Polaris, Material 3 et Spectrum publient un rayon nul. Un composant à coins
droits qui vise un rayon de `layout` garde alors le même token quand une marque
arrondit ses coins.

#### Épaisseurs de contour, `stroke`

| Source | Valeurs |
|---|---|
| Nouvel export | `outline-weight` 1, `ring-weight` 2 |
| Primer | 1, 2, 4, et un contour de focus de 2 |
| Polaris | 0, 0,66, 1, 2, 4 |
| Spectrum | 1, 2, 4 |
| Fluent 2 | 1, 2, 3, 4 |
| Figma SDS | contour 1, anneau de focus 2 |
| Material 3 | contour 1, focus 2 |

La proposition garde les deux valeurs et les nomme `stroke/sm` 1 et
`stroke/md` 2. Le kit range `outline` parmi les synonymes de `border`, et
`ring` est un rôle de couleur du registre `REGISTRE_ROLES`. Un nom de taille
laisse ces deux mots aux couleurs, et le token du composant dit l'usage
(`components/button/size/border-width`). Les deux valeurs sont celles de Figma
SDS et de Material 3 pour le contour et l'anneau de focus. Une troisième
épaisseur, `stroke/lg` à 4 px comme chez Primer, Polaris et Spectrum, entrera
le jour où un composant la demande.

#### Tailles d'icône, `icon`

| Source | Valeurs |
|---|---|
| Nouvel export, dans `components/icon/size` | `2xs` 14, `xs` 16, `sm` 20, `base` 24, `lg` 28, `xl` 32, en alias vers `layout/sizing` |
| Figma SDS | 24, 32, 40 |
| Material 3, dans ses composants | 18, 20, 24 |

La proposition est `layout/icon/xs` 16, `icon/sm` 20, `icon/md` 24,
`icon/lg` 28, `icon/xl` 32, en alias vers `primitives/dimension`. Le kit range
les tailles d'icône dans la famille `icon` de `layout`. La forme
`components/<composant>/size/...` doit finir par une propriété, donc la
grammaire refuse `components/icon/size/base`. Cinq tailles correspondent aux
cinq mots de variant que le kit connaît (`Extra Small` à `Extra Large`), que le
composant `Icon` emploie dans sa propriété `Size`. Le kit n'a pas de mot de
variant pour `2xs`, et `base` n'est pas une taille du registre, donc 14 px sort
et `base` devient `md`. Les cinq valeurs sont aussi les hauteurs de ligne de
cinq styles (`label/lg`, `body/sm`, `title/sm`, `title/md`, `title/lg`), et une
icône posée à côté d'un texte prend sa hauteur de ligne.

### 3.6 `typography`

`typography` porte 15 styles, de `display` à `label`, en `lg`, `md` et `sm`,
avec 5 réglages chacun, soit 75 alias vers `primitives`. Les familles sont
celles de Material 3, que le kit a reprises. Les lignes `body` viennent du
nouvel export, les autres de l'ancien.

| Style | Export (taille, interligne, graisse, approche) | Material 3 (taille, interligne, graisse) | Proposition |
|---|---|---|---|
| `display/lg` | 96, 96, 700, -2,5 | 57, 64, 400 | comme l'export |
| `display/md` | 72, 72, 700, -2 | 45, 52, 400 | comme l'export |
| `display/sm` | 60, 60, 700, -1,5 | 36, 44, 400 | comme l'export |
| `headline/lg` | 48, 48, 700, -1 | 32, 40, 400 | comme l'export |
| `headline/md` | 36, 40, 700, -0,5 | 28, 36, 400 | comme l'export |
| `headline/sm` | 30, 36, 700, -0,5 | 24, 32, 400 | comme l'export |
| `title/lg` | 24, 32, 600, -0,25 | 22, 28, 400 | comme l'export |
| `title/md` | 20, 28, 600, -0,25 | 16, 24, 500 | comme l'export |
| `title/sm` | 18, 24, 600, 0 | 14, 20, 500 | comme l'export |
| `body/lg` | 16, 24, 600 | 16, 24, 400 | 18, 28, 400, 0 |
| `body/md` | 16, 22, 400 | 14, 20, 400 | comme l'export |
| `body/sm` | 14, 20, 400 | 12, 16, 400 | comme l'export |
| `label/lg` | 14, 16, 600, 0 | 14, 20, 500 | comme l'export |
| `label/md` | 12, 14, 600, 0,25 | 12, 16, 500 | comme l'export |
| `label/sm` | 10, 12, 600, 0,25 | 11, 16, 500 | comme l'export |

Deux changements sont proposés. Chaque style reçoit `font-family`, qui vise
`primitives/font-family/base`. Le registre du kit compte cette propriété,
Figma la lie à une variable, et la feuille CSS d'un style en a besoin. `body/lg`
et `body/md` ont la même taille dans l'export, et la graisse 600 les sépare.
Material 3, Primer et Figma SDS séparent leurs tailles de corps par la taille,
à graisse égale. La proposition met `body/lg` à 18 px, interligne 28, graisse
400, trois valeurs que `primitives` porte déjà.

L'interligne égal à la taille des quatre plus grands styles suit Tailwind, qui
met l'interligne à 1 à partir de `5xl`. Les labels gardent un interligne serré
(16 pour 14 px), adapté à une ligne seule dans un bouton.

### 3.7 `components`

La référence ne fixe aucune variable de `components`. Ses variables naissent des
composants dessinés, et la préparation d'Architect les crée. Le générateur du
lot 4 ajoute un bouton d'exemple à la vue illustrée, avec les mesures du
bouton de l'ancien export.

| Variable | Cible |
|---|---|
| `components/button/size/md/padding-x` | `layout/sizing/3,5` (14) |
| `components/button/size/md/padding-y` | `layout/sizing/3` (12) |
| `components/button/size/md/gap` | `layout/sizing/2,5` (10) |
| `components/button/size/md/radius` | `layout/radius/md` (6) |
| `components/button/size/lg/padding-x` et `padding-y` | `layout/sizing/5` (20) |
| `components/button/size/sm/padding-y` | `layout/sizing/1` (4) |
| `components/button/size/sm/gap` | `layout/sizing/2` (8) |

Le composant `Icon` garde ses propres tokens s'il en a besoin, sous une forme
que la grammaire admet (`components/icon/size/md/width`), en alias vers
`layout/icon/md`.

## 4. Architect dans `brands` et `utility`

Le mainteneur a décidé de la règle. Architect ne crée jamais de couleur ni de
palette, et il ne modifie aucune valeur de `primitives`. Palettes est le seul
outil qui écrit une couleur. Dans `brands` et `utility`, Architect ne pose que
des alias, et il travaille sur les collections et les modes de marque que le
designer a créés.

Une branche est une famille dans un mode de marque (`primary`, `secondary`) ou
une famille de `utility` (`neutral`, `success`…), avec ses crans Light et Dark,
et ses profils pour un statut.

Architect vérifie chaque lien.

- Chaque mode de marque a `primary` et `secondary`.
- Chaque branche a 11 crans en Light et 11 en Dark.
- Le cran 300 Light d'une branche vise le cran 300 Light d'une palette, et
  toute la branche vise la même palette.
- `white` et `black` du neutre visent `white` et `black` de la palette neutre.
- Les quatre variables d'élévation visent les crans de la table du kit.

Architect propose de créer un lien manquant quand une seule réponse existe.
Les autres crans de la même branche visent tous la même palette, et
`primitives` porte le cran attendu. La création suit celle de `theme`, avec sa
case décochée, son aperçu dans l'onglet Constats, le journal de structure et
l'annulation par l'Historique. Un lien qui vise le mauvais cran ou le mauvais
thème de la bonne palette reçoit une correction, selon la même règle.

Architect pose une question quand la palette est un choix. Une branche absente
en entier (`utility/warning` vide, `secondary` absent d'une marque) ne dit pas
quelle palette prendre. La question liste les palettes de `primitives` qui ont
la forme attendue (sans profil pour une marque, avec `soft` et `vivid` pour un
statut), sans en cocher aucune. La réponse rend la création exacte, et
Architect crée alors les 22 ou 44 alias de la branche. `identity` suit la même
voie, et la question liste les 11 crans Light de la palette de la famille.

Architect renvoie vers Palettes quand la couleur manque. Une palette voulue qui
n'existe pas dans `primitives`, ou un cran absent d'une palette, donne un
constat « rampe à compléter dans Palettes », sans correction.

Architect ne fait jamais les gestes suivants.

- Choisir une palette par sa teinte ou par son nom (`grass` pour `success`).
- Cocher une réponse d'avance.
- Créer un mode de marque, une collection ou une couleur.
- Réécrire une variable de même nom qui diverge. Elle reste intacte, avec son
  constat.

Pour le designer, un fichier neuf demande trois gestes dans Figma. Il crée
`brands` avec un mode par marque, crée `utility` et lance Palettes. Architect
pose ensuite 4 questions par marque (deux palettes, deux crans de charte) et 5
pour `utility`, et chaque réponse crée ses alias. L'élévation suit sans question
dès que le neutre a sa palette. Pour deux marques, 13 réponses remplacent 92
valeurs d'alias dans `brands` et 206 dans `utility`, posées à la main. La règle
est celle que la SPEC d'Architect applique déjà à `theme`, où une variable
absente ne se crée que si les variables voisines et le référentiel donnent une
cible unique dans chaque mode. Sur le nouvel export, qui porte déjà ces 252
variables, Architect n'a rien à créer.

Architect ne crée rien dans `layout` ni dans `typography`. Leurs valeurs sont
des choix d'échelle, et une équipe qui a déjà la sienne ne doit recevoir aucun
constat d'écart. La référence de ces deux collections sert au générateur, à la
vue illustrée et au départ d'un fichier neuf.

## 5. Où vit la référence et comment elle reste à jour

La référence vit dans un nouveau fichier,
`packages/kit/src/referentiel/reference.ts`, à côté d'`architecture.ts` et de
`theme.ts`, exporté par `@ucm-kit/core/referentiel`. `architecture.ts` garde la
grammaire, que tous les lecteurs chargent. `reference.ts` porte le contenu
attendu et les valeurs de départ, et il les dérive au lieu de les recopier.

| Export | Contenu | Dérivé de |
|---|---|---|
| `variablesAttendues(collection, contexte)` | Les noms attendus de `brands`, `utility` et `theme`, pour des marques, des thèmes et des profils donnés | `FORMES_DES_CHEMINS`, `CRANS`, `REGISTRE_STATUTS`, `PROFILS`, `VARIABLES_DU_THEME` |
| `CIBLES_DE_L_ELEVATION` | Le cran ou la couleur absolue visée par chaque niveau, par thème | aucune donnée existante |
| `ECHELLES_DE_REFERENCE` | Les 37 variables de `layout`, les 75 de `typography`, les 61 valeurs hors couleur de `primitives`, avec leurs alias | aucune donnée existante |

Quatre lecteurs la lisent.

- Architect, par `controlerLIntegriteUcm` (C82), pour les variables manquantes
  de `brands`, `utility` et `theme`.
- `ucm check`, par `packages/kit/src/lecteurs/diagnostic-architecture.mjs`, qui
  passe le même C82 sur `tokens.json` et ne rend que de l'information.
- La vue illustrée, par le générateur du lot 4.
- L'inventaire, par `docs/inventaire/releves.ts`, qui relève chaque export du
  référentiel.

Six tests la rendent unique et forcent la mise à jour de ses lecteurs.

| Test | Ce qu'il refuse |
|---|---|
| `packages/kit/tests/reference.test.ts` (à créer) | Un nom attendu que la grammaire refuse ou lit de deux façons, un compte qui change sans que le test change, un doublon dans une échelle, un alias sans cible dans `primitives`, un écart entre `theme` et `TABLE_DES_DOSSIERS` |
| `tests/referentielUnique.test.ts` | Une échelle de référence recopiée dans un paquet, une fois ses listes ajoutées aux règles du détecteur |
| `tests/versionSuitLeContenu.test.mjs` | Un changement de `reference.ts` sans nouvelle version du kit |
| `tests/vueIllustree.test.ts` | Une vue illustrée qui ne suit plus la référence (« La vue n'est plus à jour ») et un ancien nom dans ses données |
| `tests/inventaire.test.ts` | Un export de la référence que la page de l'inventaire ne montre pas et que `docs/inventaire/couverture.ts` n'exclut pas |
| `tests/kitCompileAJour.test.mjs` | Un `dist` du kit plus ancien que ses sources, que les plugins embarqueraient |

Un écart entre un export réel et la référence se voit à trois endroits.

- Dans Figma, Architect classe les constats C82 de `brands` et `utility` dans
  Variables manquantes, Crans et Alias, comme ceux de `theme`.
- Dans une demande de fusion, la section architecture du rapport d'`ucm check`
  compte les variables manquantes par genre, en information, sans bloquer.
- Dans le dépôt, `generer-reference.ts --comparer <tokens.json>` liste par
  collection les noms manquants, les noms en trop et les valeurs qui diffèrent.
  Un écart de `layout` ou de `typography` s'y lit comme un écart à la
  proposition, jamais comme une faute.

## 6. Les choix qui restent au mainteneur

| Choix | Nouvel export | Recommandation | Conséquence dans Figma |
|---|---|---|---|
| 1. Espacement | Fait : 20 crans par pas de 4, `sizing/2` à 8 px | Garder tel quel | Aucune |
| 2. Rayons | Ouvert : 9 rayons, sans `none` | Ajouter `radius/none` à 0 px | Une variable de plus |
| 3. Contours | Contredit : `outline-weight` 1, `ring-weight` 2 | `stroke/sm` 1, `stroke/md` 2 | Deux renommages ; `outline` et `ring` restent aux couleurs |
| 4. Icônes | Contredit : 6 tailles de 14 à 32 px dans `components/icon/size` | `layout/icon/xs` à `xl`, soit 16, 20, 24, 28, 32 | Cinq variables déplacées vers `layout`, 14 px retiré, `base` renommé `md` |
| 5. Texte | Ouvert : pas de police, `body/lg` à 16, 24, 600 | `font-family` dans les 15 styles, `body/lg` à 18, 28, 400 | 15 variables de plus, et le corps large change d'aspect |
| 6. Charte | Fait : `identity` vise les crans Light 600 et 900 | Confirmer que ce sont les crans où Palettes a ancré la couleur saisie | Aucune si c'est le cas |

Quatre choix restent ouverts (2 à 5), et le sixième demande une confirmation.

Aucun nouvel export n'est nécessaire pour écrire la référence. Les valeurs de
`layout` et de `typography` viennent du nouvel export, et les couleurs viennent
de Palettes. Le lot 5 relit le nouvel export pour quatre points que le relevé
ne couvre pas.

- Les 12 styles de `typography` hors `body`, comparés à la partie 3.6.
- Les mesures du bouton, comparées à la partie 3.7.
- Les alias de `theme`, comparés à la table du kit, sans constat C82.
- Les crans d'`identity`, comparés aux crans d'ancrage de la recette de
  Palettes.

Un export suivant, après les migrations des choix 2 à 5, vérifiera `radius/none`,
les noms de `stroke`, les icônes dans `layout` et la police des styles.

## 7. Ce que devient la piste P21

Cinq lots se confient à des agents, dans cet ordre. Le lot 1 précède les
autres, et le lot 4 ne dépend que de lui.

| Lot | Agent | Fichiers | Critères de fin |
|---|---|---|---|
| 1. La référence dans le kit | `implementeur` | `packages/kit/src/referentiel/reference.ts`, `index.ts`, `packages/kit/tests/reference.test.ts`, `packages/kit/invariants/referentiel.md`, `packages/kit/CARTE.md`, `docs/inventaire/couverture.ts`, version du kit | Les trois exports de la partie 5 ; les comptes 46, 206, 295, 37, 75 et 61 tenus par le test ; chaque nom passe `reconnaitreLeChemin` avec une seule forme ; `controlerLesEchelles` ne rend rien sur la référence |
| 2. C82 dans `brands` et `utility` | `implementeur-exigeant` (Architect et `ucm check` lisent C82) | `packages/kit/src/controles/integrite.ts`, ses tests, `packages/kit/src/lecteurs/diagnostic-architecture.mjs` | Les genres de la partie 4 : lien manquant avec correction quand la branche désigne une palette, question sans réponse cochée quand elle est absente, rampe à compléter quand `primitives` n'a pas le cran ; aucun constat sur `layout` ni `typography` ; un fichier sans collection `brands` ne reçoit rien ; le nouvel export, rejoué en fixture anonymisée, ne reçoit aucun constat sur `brands` ni `utility` |
| 3. Architect crée les alias | `implementeur-exigeant` (interface au pixel près) | `packages/plugin-architect/src/` (Variables manquantes, questions de palette, écriture du journal), `packages/plugin-architect/SPEC.md` section Intégrité, ses invariants, la galerie des états | Une création écrit des alias seulement, sans scope (`COLLECTIONS_SANS_PORTEE`) ; aucune case cochée d'avance ; l'Historique défait le lot ; une palette absente renvoie vers Palettes ; un état de galerie par carte nouvelle |
| 4. Générateur et vue illustrée | `implementeur` | `docs/notes/Recherches/Archi Tokens Multi-marques/generer-reference.ts`, `generer-vue-illustree.ts`, `donnees-vue-illustree.js`, `VUE-ILLUSTREE-MULTIMARQUES.html`, `README.md` du dossier, `scripts/vues.mjs`, `tests/vueIllustree.test.ts`, `docs/references/design-systems/_outils/ucm.mjs` et `ucm/noms.json` | Le générateur écrit un `tokens.json` au format 2 depuis la référence, avec des palettes calculées par `packages/couleur` ; la vue lit ce fichier ; `npm run vues` le régénère ; le test refuse une vue périmée et les noms `color-brands`, `color-utilities`, `layouts`, `colors`, `press` |
| 5. Comparaison au nouvel export | `verificateur`, avec le droit de lire l'export, puis la conversation principale | Mode `--comparer` du générateur, aucun fichier suivi pour le rapport | La liste des écarts du nouvel export à la référence, rendue au mainteneur sans nom de marque, dont les quatre points de la partie 6 ; les choix 2 à 6 reportés dans la référence s'il les a changés |

Les migrations du fichier Figma restent au mainteneur, qui ajoute
`radius/none`, renomme `stroke`, déplace les icônes vers `layout` et ajoute
`font-family`.

Ce que les tests doivent imposer, au-delà de la partie 5, tient en six règles.

- Un nom de la référence passe la grammaire actuelle, avec une seule lecture.
- `theme` dans la référence égale la table de `dossiers.ts`, sans copie.
- Une création d'Architect dans `brands` ou `utility` n'écrit jamais de couleur
  ni de variable de `primitives`.
- Deux palettes candidates donnent une question, et aucune correction.
- La vue illustrée égale la sortie du générateur, sans ancien nom.
- Un changement de la référence change la version du kit dans le même commit.

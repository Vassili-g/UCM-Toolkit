# L'architecture de tokens multi-marques

Ce document propose la forme des tokens du nouveau design system : six marques,
un thème clair et un thème sombre, deux intensités de couleur, `soft` et
`vivid`, pour les statuts, et une seule intensité pour les palettes de marque
et le neutre. Le détail des arguments est dans [la
recherche](./RECHERCHE-ARCHI-MULTIMARQUES.md) et [la revue
critique](./SYNTHESE-CRITIQUE-ARCHI-MULTIMARQUES.md), qui emploient encore
l'ancien nom `scheme` de la collection `theme`. L'outil qui fabrique les
palettes fait l'objet d'une [recherche séparée](../Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md).

[VUE-ILLUSTREE-MULTIMARQUES.html](./VUE-ILLUSTREE-MULTIMARQUES.html) montre
la même architecture en schémas, à ouvrir dans un navigateur : le panneau des
variables de Figma aujourd'hui et demain, et les décisions D1 à D17, chacune
avec sa raison, l'option écartée et son origine. Ce document cite une décision
par son numéro.

Chaque nombre cité se rejoue avec un script de ce dossier :

```sh
node "docs/notes/Recherches/Archi Tokens Multi-marques/verifier-courbes.mjs"
node "docs/notes/Recherches/Archi Tokens Multi-marques/mesurer-derive-teinte.mjs"
node "docs/notes/Recherches/Archi Tokens Multi-marques/mesurer-rampes.mjs" <tokens.json>
```

## 1. Le principe : un numéro de cran vaut un contraste

Toutes les rampes de couleur partagent la même courbe de clarté. La clarté fixe
le contraste ; la teinte et la vivacité le déplacent peu. Un même numéro de cran
donne donc le même contraste contre le fond de page, quelle que soit la couleur :

| Cran | Contraste contre le fond de page | Emploi sûr |
|---|---|---|
| 500 | 2,58 à 3,26 | aucun emploi qui demande un seuil |
| 600 | 3,63 à 4,72 | bordure de contrôle, anneau de focus (seuil 3:1) |
| 700 | 5,23 à 6,79 | texte (seuil 4,5:1) |
| 800 | 7,45 à 9,50 | texte appuyé |

Ces bornes valent sur les 360 teintes, les deux profils et les deux thèmes,
calculées en flottant à teinte constante. Avec la dérive de Tailwind et
l'arrondi à 8 bits, les minimums baissent d'au plus 0,02 : 3,62 pour le 600,
7,44 pour le 800. Aucun ne franchit un seuil.

Le thème sombre a sa propre courbe, avec les mêmes numéros. Le cran 50 est le
fond de page dans les deux thèmes : le plus clair en clair, le plus sombre en
sombre. Il sert aussi de surface de carte (`surface-card`, section 4) : une
carte a la clarté du fond, un peu plus sombre que lui en sombre, et se borde
du cran 300.

| Cran | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Clair | 0,975 | 0,950 | 0,905 | 0,845 | 0,760 | 0,670 | 0,585 | 0,500 | 0,420 | 0,340 | 0,270 |
| Sombre | 0,180 | 0,225 | 0,275 | 0,330 | 0,400 | 0,490 | 0,580 | 0,670 | 0,760 | 0,850 | 0,930 |

Le mainteneur a retenu ces vingt-deux clartés. Toutes les rampes d'un fichier ont le même
nombre de crans, choisi parmi deux préréglages ; le Playground en emploie
aujourd'hui dix, onze ou douze selon la rampe, et son cran 500 y va de 2,2:1 à
6,9:1.

| Préréglage | Crans | Clartés ajoutées |
|---|---|---|
| 11 | 50 à 950, la table ci-dessus | aucune |
| 13 | 50 à 950, puis 1000 et 1050 | 0,215 et 0,165 en clair, 0,960 et 0,980 en sombre |

**Les crans 400 et 950 sont obligatoires** : le quatrième rang d'état les vise,
`surface` à 400 et `solid`, `text` à 950 (section 4, D17). Une liste de crans
qui omet l'un d'eux est refusée. Le cran 500 est le seul cran sans emploi.

Aucun préréglage n'insère de cran entre deux crans d'emploi : les états gardent
leurs numéros (section 4), et un même numéro garde sa clarté d'un préréglage à
l'autre. Une collection Figma porte les mêmes variables dans chaque mode : le
nombre de crans reste commun à toutes les marques d'un fichier. Une palette
libre du plugin UCM Palettes, dont les numéros sortent du modèle, n'alimente
pas `theme`.

## 2. Les collections

| Collection | Modes | Contenu |
|---|---|---|
| `primitives` | aucun | Le catalogue des palettes nommées, chacune en `light` et `dark` ; `colors/white` et `colors/black` ; les espacements, les durées et la typographie (D5, D10) |
| `brand` | un par marque | Ce qui change d'une marque à l'autre : un alias par cran de ses palettes `primary` et `secondary`, vers le catalogue, et sa couleur de charte (D3, D9) |
| `color-utilities` | aucun | Ce que les marques partagent : un alias par cran du neutre et des quatre statuts, vers le catalogue, et les niveaux d'élévation (D6, D15) |
| `theme` | `light`, `dark` | Chaque cran de chaque rôle, qui vise sa valeur claire ou sa valeur sombre selon une règle fixe (D2) |
| `usage` | aucun | La table des emplois en variables : ce qu'un calque cite (D13, section 5) |
| `components` | aucun | Les tokens de composants, qui visent `usage` (D11) |

Deux collections portent chacune un axe, et Figma choisit le mode de chaque
collection séparément. Une maquette pose donc une marque et un thème sans que
l'un dépende de l'autre. Une collection unique à douze modes, six marques fois
deux thèmes, dépasserait les dix modes par collection de l'offre Professional.

L'export dérive l'attribut HTML d'un axe du nom de sa collection : `brand`
donne `data-brand` et `theme` donne `data-theme`, sans réglage dans
`ucm.config.json`.

### Le chemin d'une couleur

Une palette se fabrique une fois, dans `primitives`, sous le nom que le
designer lui donne. Son chemin suit l'ordre palette, intensité, thème, cran ;
une palette à une intensité n'a pas de segment d'intensité.

```text
primitives.colors.titanium.light.700         le neutre, une intensité
primitives.colors.grass.soft.light.700       un statut, deux intensités
primitives.colors.terracota.dark.700         une palette de marque, une intensité
```

Un rôle choisit une palette par alias, sans déplacer de variable. Le fond
d'une alerte de succès traverse cinq collections :

```text
components.alert.success.background
  → usage.success.soft.surface.default
  → theme.success.soft.100                        light → color-utilities.success.soft.light.100
                                                  dark  → color-utilities.success.soft.dark.100
  → color-utilities.success.soft.light.100        → primitives.colors.grass.soft.light.100
```

La palette `primary` d'une marque suit le même chemin par `brand` :
`theme.primary.700` vise `brand.palette.primary.dark.700` en sombre, et la
colonne `intencial` de `brand` vise `primitives.colors.terracota.dark.700`.

**Le neutre est une palette fixe et grise**, commune aux marques, avec une
seule intensité. **Les quatre statuts**, `success`, `warning`, `info` et
`danger`, sont communs aux marques et portent les deux intensités. **Les
palettes de marque** portent une seule intensité, celle de la couleur de charte
(section 3.2). Chaque palette existe en deux jeux, un par courbe.

**Tout ce qui dépend de la marque va dans `brand`.** Deux collections à six
modes pourraient afficher la palette de la marque A avec les réglages de la
marque B dans la même maquette.

**Un calque cite `usage` ou `components`.** `primitives`, `brand`,
`color-utilities` et `theme` reçoivent des portées vides : leurs variables ne
paraissent dans aucun sélecteur de calque (D14).

### Ce que `theme` expose

| Groupe | Exemple | Cible en clair | Variables |
|---|---|---|---|
| Neutre | `theme.neutral.700` | `color-utilities.neutral.light.700` | 11 |
| Statuts | `theme.danger.vivid.700` | `color-utilities.danger.vivid.light.700` | 88 |
| Palettes de marque | `theme.primary.100` | `brand.palette.primary.light.100` | 22 |
| Élévation | `theme.elevation.raised` | `color-utilities.elevation.light.raised` | 3 |
| Exceptions | `theme.exception.…` | `brand.exception.light.…` | 0 |

En sombre, la cible remplace `light` par `dark`. `theme` compte 124 variables
à deux colonnes, et ne contient aucun choix du designer : quelle palette pour
quelle marque se range dans `brand`, quelle palette pour quel statut dans
`color-utilities`. Un script peut donc vérifier `theme` contre sa règle, et
UCM Palettes peut l'écrire.

### Les réglages et les exceptions de marque

Aucune marque ne diverge aujourd'hui. Les deux mécanismes ci-dessous n'ont donc
aucune variable, et leurs noms sont réservés.

Un **réglage de marque** est une valeur qui n'est pas une couleur et qui change
d'une marque à l'autre. Le thème ne le modifie pas, donc il ne passe pas par
`theme`.

```text
brand.params.radius.button        marque A → 4 px      marque B → 999 px
brand.params.font.title           marque A → Inter     marque B → Playfair Display
components.button.radius       →  brand.params.radius.button
```

Une **exception** sert quand une marque veut un composant différent dans un seul
thème. Exemple : la marque B veut un bouton principal gris foncé en sombre, et
identique aux autres en clair. `brand` porte les deux valeurs de chaque marque,
et `theme` choisit la claire ou la sombre :

```text
brand.exception.light.button.primary.background   A et B → brand.palette.primary.light.700
brand.exception.dark.button.primary.background    A      → brand.palette.primary.dark.700
                                                  B      → color-utilities.neutral.dark.200
theme.exception.button.primary.background         light → brand.exception.light.button.primary.background
                                                  dark  → brand.exception.dark.button.primary.background
components.button.primary.background           →  theme.exception.button.primary.background
```

Les six marques renseignent les deux valeurs d'une exception, y compris celles
qui gardent le cran commun. Une exception sur un fond porte aussi ses états :
un par rang de la section 4.

Trois règles permettent d'ajouter l'un ou l'autre sans toucher à un composant
publié :

1. `brand` est la seule collection qui porte l'axe des marques. Un réglage ou
   une exception s'y ajoute ; aucune seconde collection à six modes ne se crée.
2. Chaque propriété d'un composant Figma est liée à une variable de
   `components`. Ajouter un réglage ou une exception repointe cette variable, et
   le composant ne change pas.
3. Un réglage ou une exception se crée le jour où une marque le demande.

## 3. Fabriquer la palette d'une marque

### 3.1 D'un hexa à une rampe

Le designer donne la couleur de marque en hexa. Chaque cran de la rampe prend :

- sa clarté sur la courbe du thème ;
- sa teinte selon la règle de la section 3.3 ;
- sa chroma, c'est-à-dire sa vivacité, en part du maximum que l'écran affiche à
  cette clarté et à cette teinte.

Une chroma fixe sortirait de ce que l'écran affiche aux deux bouts de la rampe,
et elle rendrait un jaune et un bleu inégalement vifs, parce que leurs maximums
diffèrent.

### 3.2 Les profils `soft` et `vivid`

Les deux profils ont la même clarté, donc les mêmes contrastes. Ils diffèrent
par la part de chroma, 0,45 pour `soft` et 0,95 pour `vivid`, valeurs retenues
par le mainteneur. Les statuts portent les deux profils ; une palette de marque
n'en a qu'une, à la part de chroma de la couleur de charte, qui reste exacte à
son cran ; le neutre n'en a qu'un. Aucun profil ne se lie à un thème : une
couleur douce ou vive sert dans les deux.

Un profil règle l'insistance d'un élément. `soft` sert à un élément répété ou
secondaire, comme un badge présent vingt fois à l'écran. `vivid` sert à un
élément qui doit être remarqué, comme une alerte.

**Chaque profil peut avoir sa propre teinte.** Un bleu `vivid` peut tirer vers
le violet quand le bleu `soft` reste neutre. Les contrastes de la section 1 sont
mesurés sur les 360 teintes, donc ce choix ne les change pas.

**Les fonds du thème Dark perdent de la chroma.** Aux crans 50 à 300 du thème
Dark, la part de chaque intensité est multipliée par un facteur qui vaut 0,30
au cran 50 et remonte linéairement en clarté jusqu'à 1 au cran 400. Un fond
teinté sombre sature sinon deux à trois fois plus que les échelles sombres de
Radix aux mêmes clartés. Les accents, 400 et au-delà, et tout le thème clair
gardent leur part. Le facteur est un réglage commun de la recette.

Aux crans 50, 100 et 950, l'écart de chroma entre les deux profils descend sous
0,02 pour certaines teintes, et les deux profils s'y confondent. Un fond pâle
`soft` et un fond pâle `vivid` sont alors presque identiques ; les profils se
distinguent sur les crans 500 à 800. Ce seuil de 0,02 est un réglage à calibrer
à l'œil. L'outil de génération signale ces crans.

### 3.3 La dérive de teinte

Une rampe change de teinte en fonçant, et c'est voulu. Un jaune foncé à teinte
constante vire à l'olive. En tournant vers l'orange, il donne un brun doré.

Le relevé des dix-sept rampes colorées de Tailwind donne la dérive du bout
sombre selon la teinte de départ :

| Teinte au bout clair | Exemples | Dérive en fonçant |
|---|---|---|
| 70° à 105°, jaunes et oranges | orange, amber, yellow | -37° à -50°, vers le rouge |
| 120°, vert-jaune | lime | +11°, vers le vert |
| 155° à 180°, verts | green, emerald, teal | -3° à +12° |
| 200°, cyan | cyan | +29°, vers le bleu |
| 235° à 275°, bleus | sky, blue, indigo | +7° à +13°, vers le violet |
| 290° à 320°, violets | violet, purple, fuchsia | -6° à +6° |
| 340°, rose | pink | +21°, vers le rouge |
| 10° à 20°, rouges | rose, red | 0° à +9° |

Il n'y a pas de loi lisse. Entre le jaune et le lime, la dérive saute de -48° à
+11° : les bouts sombres fuient la zone jaune-olive des deux côtés, et aucun ne
finit entre 55° et 130°. Dans cette zone, l'écran n'affiche une couleur vive
qu'à très haute clarté, et une couleur sombre y devient kaki. Prédire la dérive
d'une rampe par interpolation entre ses deux voisines se trompe de 10,4° en
moyenne, contre 15,8° pour une teinte constante.

Les rampes `danger` et `success` du Playground reprennent au degré près les
rampes `red` et `green` de Tailwind.

La règle retenue : **deux teintes par rampe**, une au bout clair et une au bout
sombre. Entre les deux, la teinte suit la clarté du cran. Mesurée sur neuf
rampes réelles :

| Règle | Erreur moyenne | Pire erreur |
|---|---|---|
| Une seule teinte | 8,1° | 32,2° |
| Deux teintes, aux deux bouts | 2,9° | 16,0° |
| Trois teintes, aux bouts et au cran 500 | 2,0° | 10,4° |

La pire erreur tombe sur les jaunes et les oranges, qui tournent surtout entre
les crans 400 et 600. La troisième teinte sert à ces rampes.

La teinte dépend de la clarté, pas du numéro de cran. En sombre, le cran 50 est
sombre, donc il prend la teinte du bout sombre.

Le générateur propose la teinte du bout sombre d'après le tableau de Tailwind,
et le designer l'ajuste.

### 3.4 La couleur exacte de la marque

La couleur de la charte tombe rarement pile sur un cran. Elle reste hors de la
rampe, sous `brand.identity.primary`, pour le logo et les aplats imposés par la
charte. L'outil de génération affiche le cran dont elle est la plus proche en
clarté, et dit ce qu'elle peut porter.

Aucun composant ne la cite. Le fond plein d'un bouton prend le cran 700 dans
toutes les marques, quel que soit le cran de la couleur de charte. Une couleur
plus claire que le 700 donne donc un bouton plus foncé qu'elle, et l'outil de
génération le signale. Material 3 procède de même : la couleur choisie donne la
teinte de la palette, et le bouton prend toujours le même ton.

Exemple, un jaune de marque très clair (clarté 0,85, teinte 95°) :

| Question | Réponse |
|---|---|
| Cran le plus proche | 300 |
| Porte-t-elle un texte blanc ? | non, 1,58:1 |
| Porte-t-elle un texte noir ? | oui, 13,30:1 |
| Sert-elle de texte sur le fond de page ? | non, 1,47:1 |
| Le cran 700 de sa rampe sert-il de texte ? | oui, 5,57:1 |

### 3.5 Le fichier de recette

Tous les nombres qui fabriquent une palette tiennent dans un fichier versionné.
Deux outils qui lisent ce fichier produisent les mêmes hexas, et une palette
régénérée plus tard reste identique. Il contient :

- la liste des crans et les deux courbes de clarté ;
- les parts de chroma des deux profils, et le facteur des fonds du thème Dark ;
- pour chaque rampe, la couleur de départ, une intensité ou deux, et ses
  teintes aux bouts, par profil ;
- le gamut de sortie, sRGB ;
- la liste des crans retouchés à la main, que la régénération n'écrase pas.

Les couleurs sortent en sRGB. Display P3 est écarté : il changerait toutes les
valeurs, et un écran sRGB ne montre pas la différence au designer qui les
choisit.

## 4. La table en dossiers et ses états

Une variable de `theme` vise un cran, et ce cran est le même dans toutes les
marques. Aucune marque ne relie une variable à un autre cran. Un cran câblé par
marque obligerait à câbler aussi chacun de ses états dans chaque marque et
chaque thème.

La table range les variables de chaque palette en trois dossiers :

- `solid` : le fond plein d'un bouton ou d'un badge, et son texte ;
- `surface` : le fond teinté discret, avec son texte et son contour ;
- `page` : ce qui se pose directement sur la page, soit le texte coloré, le
  contour, le filet et l'anneau de focus.

Elle vaut pour toutes les palettes, de marque et de statut, et pour les deux
intensités. Un fond a trois états : `default`, `hover` et `pressed`.

**Le sens d'un thème.** Chaque thème choisit le texte de ses boutons, blanc
(`#FFFFFF`) ou noir (`#000000`). Blanc en clair et noir en sombre, le thème est
normal ; l'inverse le rend inversé. `solid/foreground` vaut ce texte, jamais le
fond de la page.

| Thème | Texte des boutons | Sens |
|---|---|---|
| Light | blanc | normal |
| Light | noir | inversé |
| Dark | noir | normal |
| Dark | blanc | inversé |

| Variable | Normal | Inversé |
|---|---|---|
| `solid/default` | 700 | 700 |
| `solid/hover` | 800 | 600 |
| `solid/pressed` | 900 | 500 |
| `solid/foreground` | le texte des boutons | le texte des boutons |
| `surface/default` | 100 | 100 |
| `surface/hover` | 200 | 200 |
| `surface/pressed` | 300 | 300 |
| `surface/foreground` | 800 | 900 |
| `surface/border` | 800 | 900 |
| `page/foreground` | 700 | 800 |
| `page/border` | 700 | 800 |
| `page/divider` | 300 | 300 |
| `page/focus` | 600 | 700 |

Le neutre ajoute des variables et ne change aucune des précédentes :
`page/foreground-main`, noir pur en clair et blanc pur en sombre dans les deux
sens, pour le corps de texte ; `page/foreground-subtle`, au cran de
`page/foreground` ; `scale/0` et `scale/1000`, blanc et noir en clair, échangés
en sombre. Les contrôles désactivés prennent `disabled/background` (200),
`disabled/foreground` (500) et `disabled/border` (500), hors seuil : WCAG
n'exige aucun contraste d'un composant inactif. `elevation/page` et
`elevation/raised` n'appartiennent à aucune palette (section 6).

**Les crans requis** sont 100, 200, 300, 600, 700, 800 et 900, plus 500 quand
un thème est inversé. Les crans 50, 400 et 950 sont facultatifs : le plugin les
calcule par défaut, une recette peut s'en passer, aucune variable ni garantie
ne les vise. Une variable dont le cran manque n'existe pas pour cette palette.
Le kit tient la table dans `packages/kit/src/emplois/dossiers.ts`.

**La courbe inversée.** Un texte blanc sur le cran 700 de la courbe sombre
normale tombe sous 4,5:1. Quand un thème est inversé, ses nuances 500 à 800
prennent d'autres clartés :

| Nuance | 500 | 600 | 700 | 800 |
|---|---|---|---|---|
| Clair normal | 0,67 | 0,585 | 0,50 | 0,42 |
| Clair inversé | 0,745 | 0,69 | 0,61 | 0,42 |
| Sombre normal | 0,49 | 0,58 | 0,67 | 0,76 |
| Sombre inversé | 0,45 | 0,50 | 0,55 | 0,70 |

Les autres nuances gardent leur clarté. Changer le texte des boutons d'un
thème remplace ses nuances 500 à 800 par les valeurs du sens d'arrivée ; une
courbe qui n'y resterait pas strictement monotone est refusée.

**Les états.** Le repos vise `default`, le survol `hover`, l'appui `pressed`,
sur `solid` comme sur `surface`. Le focus garde le fond du repos et ajoute
`page/focus`. Un état sélectionné prend un autre dossier, au choix du
designer : la table ne lui donne pas de cible. Un composant désactivé prend
`disabled/*`. `ucm check` ne compare plus l'état d'un composant à un rang.

**Les garanties.** Sept garanties se jugent par palette, dans la table du sens
du thème, contre le seul fond de la page. Aucune ne croise deux palettes.
Leurs seuils viennent de la recette : 4,5:1 pour un texte, 3:1 pour le reste.

| N° | Premier membre | Contre | Seuil |
|---|---|---|---|
| G1 | `solid/foreground` | `solid/default`, `hover`, `pressed` | texte |
| G2 | `solid/default` | le fond de la page | non textuel |
| G3 | `surface/foreground` | `surface/default`, `hover`, `pressed`, le fond de la page | texte |
| G4 | `surface/border` | les mêmes fonds | non textuel |
| G5 | `page/foreground` | le fond de la page | texte |
| G6 | `page/border` | le fond de la page | non textuel |
| G7 | `page/focus` | le fond de la page, `surface/default` de sa palette | non textuel |

Le fond de la page est le réglage « Fond » de chaque thème, `elevation/page`.
`elevation/raised` n'a pas de réglage dans le plugin et n'entre dans aucune
mesure. Sur les quatorze références de
[mesurer-dossiers.ts](./Collection%20usage/mesurer-dossiers.ts), à une et deux
intensités et dans les quatre thèmes, G2 à G6 n'échouent jamais. G1 n'échoue
que sur la nuance où la référence est ancrée : la couleur de marque garde ses
octets, et son texte des boutons peut manquer 4,5:1. G7 n'échoue que pour
`#16A34A`, dont l'anneau est la référence ancrée.

Les courbes ont leur propre garantie, valable pour toute teinte et les deux
profils. Dans la table du sens de chaque mode, `page/foreground` tient le seuil
du texte et `page/focus` le seuil non textuel contre le cran le plus clair de
la liste, gris ; `solid/default` tient le seuil du texte contre le texte des
boutons du mode. `packages/couleur/src/garantie.ts` la calcule.

**L'anneau de focus laisse un espace** entre lui et le contrôle. Posé au contact
d'un bouton plein, aucun cran de la rampe ne s'en détache à 3:1 : l'anneau 600
au contact du 700 donne 1,40:1. En CSS, un `outline-offset` non nul.

**La palette `primary` d'une marque porte ses actions**, pas forcément la
première couleur de sa charte. Une marque qui mène avec sa deuxième couleur la
place dans `primary` en générant ses palettes, sans aucune variable de plus.

## 5. Les variables de `theme` et leurs portées

La table de la section 4 s'écrit dans `theme`, une variable par ligne et par
palette, avec une valeur claire et une valeur sombre. `components` vise
`theme` ; il n'existe pas de collection `usage`. `theme` vise `color-brands`
pour les palettes de marque et `color-utilities` pour le neutre et les
statuts. UCM Palettes n'écrit ni `theme`, ni `color-brands`, ni `color-utilities` : ces collections
se posent à la main, et le profil d'UCM Explorateur compare leurs alias à la
table, en information.

Les portées de Figma filtrent ce qu'un sélecteur de propriété propose. Celles
de `theme` suivent ce que chaque variable peint, dans le vocabulaire que publie
UCM Exporter :

| Variables | Ce qu'elles peignent | Portées Figma |
|---|---|---|
| `solid/default`, `hover`, `pressed` | fond, contour | remplissage de cadre et de forme, contour |
| `surface/default`, `hover`, `pressed`, `disabled/background`, `elevation/*` | fond | remplissage de cadre et de forme |
| `*/foreground`, `page/foreground-main`, `page/foreground-subtle`, `disabled/foreground` | texte, icône | remplissage de texte et de forme |
| `*/border`, `page/divider`, `disabled/border` | contour | contour |
| `page/focus` | anneau | contour |
| `scale/*` | rien | aucune |

Les fonds de `solid` portent la portée du contour pour le bouton sans fond
survolé, focalisé ou appuyé. Un sélecteur de couleur de texte propose ainsi 3
variables par palette, `solid/foreground`, `surface/foreground` et
`page/foreground`. L'effet des portées sur le choix d'un alias dans le panneau
des variables reste à essayer dans Figma. Le kit les tient dans
`SUPPORT_DES_VARIABLES` (`packages/kit/src/emplois/dossiers.ts`).

`primitives`, `color-brands` et `color-utilities` reçoivent des portées vides.

### Un cran hors de la table

Un graphique demande une échelle de 100 à 800, une illustration un 400 : aucun
de ces crans n'a de variable de dossier. Les nuances de chaque palette restent
sous `scale`, sans portée, avec le même numéro dans les deux thèmes. Pour citer
un cran hors table, créer un token de composant qui vise `theme` :

```text
components.stresstest.info.scalewrap.colors.scale-5  →  theme.warning.vivid.scale.600
```

Le cran suit la marque et le thème. `ucm check` ne relève plus ce token pour
son seul chemin ; il mesure le contraste de la couleur contre son fond réel.
Un besoin hors table que deux composants partagent devient une variable de
dossier.

## 6. L'élévation

Trois niveaux, opaques, que `usage.elevation.*` expose et que
`color-utilities.elevation.light|dark.*` choisit :

| Niveau | Usage | Light | Dark |
|---|---|---|---|
| `page` | fond d'écran | neutre 50 | neutre 50 |
| `raised` | carte, panneau | blanc, et une ombre | neutre 100, et une ombre |
| `overlay` | menu, modale | blanc, et une ombre plus forte | neutre 100, et une ombre plus forte |

Les numéros de cran s'inversent entre les thèmes : un niveau plus haut prend
un cran plus grand en sombre, et plus petit en clair, où il n'y a rien sous le
cran 50. Les deux valeurs de chaque niveau se choisissent donc séparément,
dans `color-utilities`, et `theme` reste une règle fixe.

Un voile translucide change selon ce qu'il recouvre, et la table ne garantit
que des contrastes entre couleurs opaques. En clair, un voile blanc ne se voit
pas sur le fond de page : le blanc mesure 1,07:1 contre le cran 50.

`overlay` reste au cran 100 en sombre, et se distingue de `raised` par son
ombre. Sur le neutre 100, sur 360 teintes et les deux intensités, le texte 700
mesure au moins 4,88:1 et la bordure 600 au moins 3,41:1. Sur le neutre 200,
ils tombent à 4,23:1 et 2,96:1, sous les seuils. La section 10 de
`verifier-courbes.mjs` produit ces nombres.

Un élément posé sur un support de même niveau prend `border-decorative`, pas un
quatrième niveau.

Les ombres sont des effect styles, dont la couleur se lie à une variable noire
translucide, plus opaque en sombre. UCM Exporter publie un effet par son effect
style et lit ses liaisons de variables. La transparence ne sert qu'aux ombres et
au voile derrière une modale.

## 7. Un composant différent selon la marque

Prendre la première ligne qui répond au besoin :

| Besoin | Réponse | Exemple |
|---|---|---|
| Une autre couleur, pour toute la marque | Placer cette couleur dans la palette `primary` de la marque | La marque B mène avec sa couleur secondaire |
| Une autre valeur, sans être une couleur | Un réglage de marque | Boutons en pilule chez la marque B |
| Une autre valeur dans un seul thème | Une exception | Bouton gris foncé en sombre chez la marque B |
| Un cran que la table ne porte pas | Un token de composant qui vise `theme` (section 5) | L'échelle d'un graphique |
| Un autre dessin | Une variante de composant | Une icône présente chez la marque A seulement |

## 8. Côté code

Un attribut par axe, posé sur n'importe quel élément et valable pour ses
enfants :

```html
<html data-brand="marque-a" data-theme="light">
  <aside data-theme="dark">…</aside>
</html>
```

`ucm tokens css` produit la feuille. L'application pose `data-theme` selon la
préférence du système ; la feuille n'émet aucune règle `prefers-color-scheme`.

Un composant lit une propriété `--usage-*` ou la propriété de son token de
composant, jamais `--theme-*` ni `--primitives-*` :

```css
.button { background: var(--components-button-primary-background); }
/* --components-button-primary-background: var(--usage-primary-solid-default); */
```

## 9. Ce que coûte une marque

Deux palettes et une couleur de charte. Le designer donne la couleur primaire
et la secondaire en hexa, et leurs teintes de bout sombre si la proposition ne
convient pas ; UCM Palettes range les deux palettes dans le catalogue de
`primitives`, 22 couleurs chacune. La colonne de la marque dans `brand` reçoit
44 alias vers ces palettes et la couleur de charte. `color-utilities`, `theme`
et `usage` ne changent pas.

| Collection, six marques | Variables de couleur | Colonnes | Valeurs |
|---|---|---|---|
| `primitives` : 12 palettes de marque × 22, 4 statuts × 44, neutre 22, blanc et noir | 464 | 1 | 464 |
| `brand` : 44 alias et la couleur de charte | 45 | 6 | 270 |
| `color-utilities` : neutre 22, statuts 176, élévation 6 | 204 | 1 | 204 |
| `theme` : 121 crans, 3 niveaux d'élévation | 124 | 2 | 248 |
| `usage` : 10 palettes × 20, neutre 23, élévation 3 | 226 | 1 | 226 |
| Total | 1 063 | | 1 412 |

Le compte des valeurs pèse sur la taille de la feuille CSS que
`ucm tokens css` imprime.

Une nouvelle colonne de mode dans Figma recopie les valeurs de la première.
Avec des alias, la colonne d'une marque ajoutée vise les palettes de la
première marque tant qu'elle n'est pas renseignée : relire chacune de ses
variables avant de la publier.

## 10. Ce qui reste à décider

- Le fond de page en clair : le cran 50 de la courbe donne `#F7F7F7`, le
  fond visé est `#f8fafc` (clarté 0,984, teinte 248°). La palette neutre et la
  clarté de sa nuance 50 sont à régler en conséquence ; le mainteneur s'en
  charge.
- Le seuil de 0,02 qui dit où deux profils se confondent.
- Les teintes de bout sombre proposées par défaut, famille par famille.
- Trois essais dans Figma : le choix d'un alias filtre-t-il par portée ; la
  description d'une variable s'affiche-t-elle dans le sélecteur, pour y écrire
  la paire de chaque usage ; la couleur d'une ombre liée à une variable
  suit-elle le mode de `theme` ?
- Les contrôles de `ucm check` sur `tokens.json` et les contrats : un emploi
  posé sur ce qu'il ne peint pas, une paire texte et fond qui n'est pas dans la
  table, un cran hors table, un état qui ne vise pas son rang. Aucun n'est
  écrit. Les paires texte et fond d'un composant se lisent dans ses contrats,
  qui situent chaque peinture, et non dans les noms de ses tokens.
- `theme` suit sa règle, et chaque marque et chaque thème ont une valeur :
  aucun contrôle ne le vérifie encore.
- **Le bouton plein basculable, activé et survolé.** Question ouverte,
  posée sur la table en dossiers `solid`, `surface` et `page` à trois états
  (`default`, `hover`, `pressed`) qui remplace les quatre rangs. Un bouton
  plein qu'on active et désactive suit `solid/default`, `solid/hover` et
  `solid/pressed` ; activé, il reste sur `solid/pressed`. Activé et survolé,
  il n'a pas de variable : `solid/hover` lui donnerait la couleur du bouton
  désactivé survolé, et le survol effacerait la différence. L'ancien rang
  `active-hover` couvrait ce cas. Le mainteneur a de tels composants. Pistes :
  1. deux variables de plus dans `solid`, `solid/selected` et
     `solid/selected-hover` : 900 et 950 dans le thème normal, 500 et 400 dans
     le thème inversé. Les crans 950 et 400 redeviennent requis, et le texte
     des boutons doit tenir sur ces deux fonds. En Light inversé, la 400 et la
     500 ne sont qu'à 0,014 ΔEok : le survol activé s'y voit à peine. Les
     tokens d'Atlassian ont une famille `selected` avec ses propres `hovered`
     et `pressed` (à vérifier). Piste recommandée ;
  2. trois états, et l'état activé marqué autrement que par la couleur
     (coche, icône, contour intérieur en `solid/foreground`), le survol activé
     prenant `solid/hover`. WCAG 1.4.1 le demande de toute façon ; se combine
     avec la piste 1 ;
  3. un calque d'état translucide, comme Material : une couche de
     `solid/foreground` à faible opacité au survol et à l'appui. Sort du
     modèle opaque, et aucun outil du dépôt ne mesure un contraste composé ;
  4. l'état activé survolé reprend `solid/hover`. Garde l'ambiguïté ;
     déconseillée.

  Une décision touche la table des dossiers, les crans requis, les garanties
  du texte des boutons, l'aperçu d'UCM Palettes, la carte des garanties, la
  planche et la vue États de l'Interface de test.
  La recherche, les solutions du marché modélisées et les mesures sont dans
  [Bouton plein basculable](./Bouton%20plein%20basculable/README.md).

L'ordre des changements dans le code et la spécification d'UCM Palettes est
dans [PLAN-INTEGRATION-ARCHITECTURE.md](./PLAN-INTEGRATION-ARCHITECTURE.md).

Avant d'étendre à la bibliothèque, un prototype à six marques éprouve les cas
limites : un jaune clair, un bleu très sombre, une teinte très vive, une marque
presque grise. Il pose un bouton plein et son survol, une ligne sélectionnée
survolée, une alerte, un champ avec focus, une carte dans une modale, un libellé
long, une exception en sombre, un élément `soft` à côté d'un élément `vivid`.

## Sources

- [Understanding the scale, Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [How to generate color palettes for design systems, Matt Ström-Awn](https://mattstromawn.com/writing/generating-color-palettes/)
- [Leonardo, Adobe](https://github.com/adobe/leonardo)
- [How the color system works, Material 3](https://m3.material.io/styles/color/system/how-the-system-works)
- [Palette de Tailwind CSS en OKLCH, `theme.css`](https://github.com/tailwindlabs/tailwindcss/blob/main/packages/tailwindcss/theme.css)
- [Contraste du texte, WCAG](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [Contraste non textuel, WCAG](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- [OKLCH et conversion de gamut, CSS Color 4](https://www.w3.org/TR/css-color-4/#gamut-mapping)
- [Modes for variables, Figma Learn](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)

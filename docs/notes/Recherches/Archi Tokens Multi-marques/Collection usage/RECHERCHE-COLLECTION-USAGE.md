# La collection `usage`, reprise depuis le début

**Statut :** recherche. Ce document propose de remplacer la forme de `usage`
retenue par les décisions D13 et D17, et les propositions qui l'ont suivie.
Aucun code, aucune recette ni aucun format publié n'est modifié.

Vocabulaire : le **bouton** est le fond `solid` ; le **texte des boutons**,
`on-solid` ; le **fond teinté**, `surface` ; le **texte coloré**, `text`. Un
thème est **inversé** quand le texte des boutons n'a pas la couleur de la page
([dossier du texte des boutons](../../Plugin%20Palettes/Texte%20des%20boutons/DOSSIER-TEXTE-DES-BOUTONS.md)).

## En bref

**Le problème.** La forme actuelle demande au designer d'apparier lui-même un
texte et un fond à chaque état : `text.hover` va sur `surface.hover`. Les deux
propositions suivantes, l'escalier puis les ensembles, ont gardé cet
appariement et l'ont rendu plus difficile à suivre. Par ailleurs, `theme` ne
sait choisir qu'un numéro de nuance, le même en Light et en Dark : le thème
inversé, où le survol du bouton passe de 800 à 600, ne peut pas s'y écrire
sans une correspondance tapée à la main.

**Ce que font Material, Atlassian, Fluent, Polaris et Primer.** Un état
change le fond ; le texte posé dessus reste en général le même. Le nom d'un fond dit
quel texte va avec. La couche qui porte les noms d'usage porte aussi les
valeurs de chaque thème, et un programme les écrit.

**La proposition, en quatre règles pour le designer :**

1. Un dossier par sorte de fond : `solid` pour le bouton, `surface` pour le
   fond teinté. La racine de la palette sert à ce qui se pose sur la page ou
   une carte.
2. Le texte, l'icône et le contour se prennent dans le dossier du fond.
3. Un état ne change que le fond : `background`, `background-hover`,
   `background-pressed`. Le texte et le contour ne bougent pas.
4. Un élément sélectionné prend un autre dossier : une ligne neutre
   sélectionnée passe dans `primary/surface`.

**Ce qui change dans l'architecture.** `usage` disparaît dans `theme`. La
collection qui porte les modes Light et Dark porte aussi les noms d'usage, et
UCM Palettes écrit ses deux colonnes à partir d'une table du kit. Le designer
ne tape aucun alias et ne connaît aucun numéro de nuance.

**Ce que disent les mesures** (42 rampes, quatre thèmes dont deux inversés) :
le texte du dossier `surface` tient 4,5:1 sur ses trois fonds, la page et la
carte à la nuance 900, dans les quatre thèmes, au pire à 7,30:1. Son contour
tient 3:1 à la nuance 800, au pire à 4,44:1. Un seul anneau de focus, à la
nuance 900, tient 3:1 sur tous les fonds teintés de toutes les palettes. Seuls
le bouton, le texte des boutons, le texte coloré et le contour de la racine
changent de nuance dans un thème inversé.

**À décider :** section 9.

## 1. Ce qui a été proposé jusqu'ici

| Étape | Proposition | Ce qu'elle apportait | Ce qui l'a arrêtée |
|---|---|---|---|
| [Recherche initiale](../RECHERCHE-ARCHI-MULTIMARQUES.md), section 5.3 | Des crans commutés par miroir, et dix rôles facultatifs (`solid`, `on-solid`, `text`, `border`, `surface`) que chaque marque câble deux fois, en clair et en sombre | Un nom par emploi, avec sa promesse de contraste | La [revue critique](../SYNTHESE-CRITIQUE-ARCHI-MULTIMARQUES.md), section 3 : un miroir ne garantit aucun contraste ; des rôles facultatifs laissent les garanties facultatives ; vingt câblages par marque se font à la main |
| [Architecture finale](../ARCHITECTURE-FINALE-MULTIMARQUES.md), décisions D2, D13 et D17 de la [vue illustrée](../VUE-ILLUSTREE-MULTIMARQUES.html) | Une table des emplois commune à toutes les marques ; `theme` choisit le même cran en Light et en Dark ; `usage`, sans mode, nomme chaque emploi et ses quatre rangs `default` à `active-hover` | Aucune liaison par marque ; une seule table vérifiée sur la courbe | Le texte avance avec le fond, rang par rang ; les noms de rangs ressemblent à des états réservés |
| [Usages indexés](./1%20Usages%20indexes%20et%20catalogue/README.md), premier tour | Des niveaux numérotés et un catalogue de partenaires mesurés | Séparer niveau de couleur et état de composant | Un catalogue de contextes et de preuves, lourd à tenir |
| [Escalier](./2%20Escalier/PRESENTATION-NIVEAUX-ET-TEXTE-DES-BOUTONS.html) | Un texte de niveau n se pose sur toute surface de niveau inférieur ou égal à n | Dix couples garantis au lieu de quatre | Le mainteneur l'a jugée trop savante : la règle s'apprend et ne se lit pas dans les noms |
| [Ensembles](./3%20Ensembles/ENSEMBLES-DANS-FIGMA.html) | `surface-0` à `surface-4` et `solid-1` à `solid-4`, chacun avec son texte et son contour ; un état passe au numéro suivant | La règle « tout dans le même dossier » | Cinq numéros de surface dont le texte change, des conventions « conteneur plus un » ; une partie de la table passe dans `theme`, le reste dans `usage` |
| [Thème inversé](../../Plugin%20Palettes/Texte%20des%20boutons/DOSSIER-TEXTE-DES-BOUTONS.md), section 5 | En Dark avec texte blanc, le bouton reste la 700 et ses états vont vers la page : 700, 600, 500 | Un texte des boutons blanc ou noir choisi pour tout le design system | Le cran d'un emploi dépend du thème : `theme`, qui recopie un numéro, ne peut pas le porter |

Les étapes s'accordent sur trois points que ce document garde : un numéro ne
prouve aucun contraste, la mesure le prouve ; l'état d'un composant reste
dans `components` ; le texte des boutons est blanc ou noir purs, un choix par
thème pour tout le design system.

## 2. Les deux défauts à corriger

### 2.1 Le texte change avec l'état

D17 fait avancer le texte avec le fond : un texte resté à 700 sur un fond 200
tombe à 4,46:1. Le designer doit donc changer deux variables à chaque état, et
retrouver laquelle va avec laquelle. L'escalier et les ensembles cherchaient à
rendre cet appariement lisible. Ils ont gardé sa cause : un texte qui ne tient
que sur un seul fond.

Un texte qui tient sur tous les fonds de sa famille supprime l'appariement.
La section 5 mesure qu'il existe : la nuance 900 tient sur les fonds 100, 200
et 300, et même sur le 400.

### 2.2 `theme` choisit un numéro, pas un emploi

D2 donne à `theme` une règle fixe : `theme.primary.800` vise le 800 clair en
Light et le 800 sombre en Dark. `usage`, sans mode, vise ce numéro. Le survol
du bouton vaut donc 800 dans les deux thèmes.

Dans un thème inversé, ce survol vaut 800 en Light et 600 en Dark. Aucune
chaîne `usage → theme` actuelle ne l'exprime. Trois façons de l'écrire :

| Façon | Qui écrit la différence | Risque |
|---|---|---|
| Un designer repointe à la main, en Dark, les variables qui changent | Le designer, variable par variable | Une erreur ou un oubli ne se voit qu'en Dark ; personne ne relit un alias |
| Les ensembles : `theme` reçoit des variables nommées pour les emplois qui changent, `usage` garde les autres | UCM Palettes | La table se lit en deux endroits, selon que l'emploi change ou non |
| Tous les emplois passent dans la collection qui porte les modes | UCM Palettes, à partir d'une seule table | Aucun alias tapé ; un alias modifié à la main se détecte (section 4.6) |

La troisième façon est celle des systèmes de la section 3.

## 3. Ce que font les autres design systems

Valeurs relevées dans les fichiers publiés de chaque système.

| Système | Texte sur le bouton | États du bouton | Bouton en Dark | Qui écrit les valeurs de chaque thème |
|---|---|---|---|---|
| Material 3 | `on-primary`, apparié par son nom à `primary` | Le fond ne change pas : un calque de la couleur `on-*` le recouvre, 8 % au survol, 12 % à l'appui et au focus | Un autre ton de la même palette | Un algorithme, Material Color Utilities, depuis une couleur source |
| Atlassian | `color.text.inverse`, le même pour tous les états | `color.background.brand.bold`, `.hovered`, `.pressed` ; le texte n'a pas d'état | `#669DF1`, survol `#8FB8F6`, appui `#ADCBFB` ; texte `#1F1F21` | Un fichier par thème, généré |
| Fluent 2 | `colorNeutralForegroundOnBrand`, blanc dans les deux thèmes | `colorBrandBackground`, `Hover`, `Pressed`, `Selected` | Light : brand 80, survol 70, appui 40. Dark : brand 70, survol 80, appui 40 | Une fonction calcule chaque thème depuis la rampe de la marque |
| Polaris | `color-text-brand-on-bg-fill`, apparié par son nom à `color-bg-fill-brand` | `color-bg-fill-brand-hover`, `-active`, `-selected` | Sans objet ici | Un fichier par thème |
| Primer | `fgColor-onEmphasis`, blanc dans les deux thèmes | `button-primary-bgColor-rest`, `-hover`, `-active` | Fond d'accent `#1f6feb`, texte coloré `#4493f8` : deux couleurs distinctes | Un fichier par thème, compilé en CSS |

Quatre constats :

1. **Un état ne change que le fond.** Atlassian, Fluent et Primer n'ont
   qu'une variable de texte pour tous les états du bouton ; Material ne change
   même pas le fond. Seul Polaris prévoit des variantes `-hover` et `-active`
   du texte.
2. **Le nom dit le couple.** Material écrit `on-X` pour le texte de `X`,
   Polaris `text-X-on-bg-fill` pour celui de `bg-fill-X`. Le designer n'a
   aucune table à apprendre.
3. **Le thème inversé existe ailleurs.** Fluent et Primer posent un texte
   blanc sur leurs boutons Dark. Primer sépare alors le fond du bouton et le
   texte coloré, comme le propose le dossier du texte des boutons. Fluent fait
   aller le survol vers le texte en Dark, à l'inverse du Light.
4. **La couche d'usage porte les valeurs de chaque thème, et un programme les
   écrit.** Chez Atlassian, Fluent et Primer, un nom d'usage a une valeur par
   thème. Aucun ne dérive le Dark d'un numéro commun aux deux thèmes.

Un cinquième constat, sur le focus : Atlassian (`color.border.focused`),
Polaris (`color-border-focus`), Primer (`focus-outlineColor`) et Fluent
(`colorStrokeFocus2`) ont chacun **un seul** anneau pour tout le système.

## 4. La proposition

### 4.1 Les variables d'une palette

`{p}` désigne une palette : `primary`, `secondary`, `neutral`, ou un statut
avec son intensité, `success/soft`.

| Variable | Ce qu'elle peint | Se pose sur | Thème normal | Thème inversé |
|---|---|---|---|---|
| `{p}/solid/background` | Fond du bouton, du badge fort | la page, une carte, un fond teinté | 700 | 700 |
| `{p}/solid/background-hover` | Son survol | | 800 | 600 |
| `{p}/solid/background-pressed` | Son appui | | 900 | 500 |
| `{p}/solid/text` | Texte et icône sur ces trois fonds | `solid/background*` | blanc en Light, noir en Dark | noir en Light, blanc en Dark |
| `{p}/surface/background` | Fond teinté : alerte, badge doux, ligne sélectionnée | la page, une carte | 100 | 100 |
| `{p}/surface/background-hover` | Son survol | | 200 | 200 |
| `{p}/surface/background-pressed` | Son appui | | 300 | 300 |
| `{p}/surface/text` | Texte et icône sur ces trois fonds, la page et une carte | `surface/background*` | 900 | 900 |
| `{p}/surface/border` | Contour sur ces trois fonds, la page et une carte | `surface/background*` | 800 | 800 |
| `{p}/text` | Texte coloré, lien | la page, une carte | 700 | 800 |
| `{p}/border` | Contour d'un champ, d'une case | la page, une carte | 600 | 700 |
| `{p}/divider` | Filet, séparateur | partout | 300 | 300 |

Douze variables par palette, contre vingt dans D13. Le thème inversé ne
change que cinq lignes, toutes écrites par UCM Palettes.

Le texte de la racine, `{p}/text`, garde la couleur vive de la palette pour
les liens et les libellés posés sur la page. Posé sur un fond teinté, il
échoue : 82 mesures sur 126 tiennent en Light (section 5). C'est la raison
du dossier.

### 4.2 Ce qui ne dépend d'aucune palette

| Variable | Ce qu'elle peint | Nuance |
|---|---|---|
| `focus` | L'anneau de focus de tous les composants, séparé du composant par un espace | `primary` 900, dans les quatre thèmes |
| `neutral/text` | Le corps de texte | neutre 900 |
| `neutral/text-subtle` | Le texte secondaire, sur la page ou une carte | neutre 700, 800 dans un thème inversé |
| `disabled/background`, `disabled/text` | Un contrôle désactivé, exempté par WCAG | neutre 200 et 500 |
| `elevation/page`, `raised`, `overlay` | Les fonds d'écran, de carte et de modale (D15) | inchangés |

Pour le neutre, la racine `neutral/text` vise la 900 et non la 700 : un gris
moyen est trop pâle pour un paragraphe. C'est une ligne de la table du kit,
pas un choix du designer. L'option B des ensembles (section E5) disait la même
chose.

### 4.3 Les états d'un composant

| État | Variable visée | Exemple : bouton | Exemple : ligne d'un tableau |
|---|---|---|---|
| Repos | `background` du dossier choisi | `primary/solid/background` | aucun fond |
| Survol | `background-hover` | `primary/solid/background-hover` | `neutral/surface/background-hover` |
| Appui | `background-pressed` | `primary/solid/background-pressed` | `neutral/surface/background-pressed` |
| Sélectionné | le `background` d'un autre dossier | bouton bascule : `neutral/surface` devient `primary/solid` | `primary/surface/background` |
| Sélectionné et survolé | le `background-hover` de cet autre dossier | `primary/solid/background-hover` | `primary/surface/background-hover` |
| Focus | l'état courant, et `focus` | | |
| Désactivé | `disabled/*` | | |

Le texte de chaque exemple ne change pas entre les lignes d'un même dossier :
`primary/solid/text` pour le bouton, `neutral/surface/text` puis
`primary/surface/text` pour la ligne. Le quatrième rang de D17,
`active-hover`, n'a plus de raison d'être : la sélection survolée est le
survol de l'autre dossier.

Dans `components`, les noms d'état restent : `button/primary/hover/background`
vise `primary/solid/background-hover`. Le texte d'un composant n'a plus besoin
d'un token par état : `button/primary/text` sert à tous.

### 4.4 Où se décide la nuance de chaque thème

`usage` fusionne avec `theme`. La collection `theme`, qui porte les modes
Light et Dark, contient les variables des sections 4.1 et 4.2, et les nuances
numérotées, rangées sous `scale`, pour un usage hors table (D14) :

```text
components.button.primary.hover.background
  → theme.primary.solid.background-hover
        light → brand.palette.primary.light.800
        dark  → brand.palette.primary.dark.600        thème Dark inversé
  → brand, colonne de la marque → primitives.colors.terracota.dark.600

components.chart.scale-5
  → theme.warning.vivid.scale.600                     hors table, même numéro dans les deux thèmes
```

| Collection | Avant (D1 à D17) | Après |
|---|---|---|
| `primitives`, `brand`, `color-utilities` | inchangées | inchangées |
| `theme` | 124 nuances, une règle fixe : même numéro dans les deux thèmes | les variables d'usage, une valeur par thème, et les nuances sous `scale` |
| `usage` | 226 variables sans mode, qui visent `theme` | supprimée |
| `components` | vise `usage` | vise `theme` |

Le nom `theme` reste celui de la collection à modes : l'export en dérive
l'attribut `data-theme` (D1). Une couche `usage` sans mode, qui recopierait
`theme` nom pour nom, reste possible si le mainteneur tient au préfixe
`--usage-*` côté code ; elle double les variables sans rien vérifier de plus
(décision 2).

Les portées de D14 s'appliquent dans `theme` : les variables d'usage gardent
les portées de ce qu'elles peignent, les nuances sous `scale` reçoivent des
portées vides et ne paraissent dans aucun sélecteur de calque.

### 4.5 Le thème inversé, vu par le designer

Le designer règle une fois, dans UCM Palettes, le texte des boutons de chaque
thème. Il pose ensuite `primary/solid/background-hover` sur le survol de son
bouton, comme dans un thème normal. UCM Palettes écrit 800 dans la colonne
Light et 600 dans la colonne Dark. Le designer ne voit jamais ce 600.

### 4.6 Ce qui empêche l'erreur

| Risque | Ce qui le traite | État |
|---|---|---|
| Une valeur de `theme` tapée à la main, ou fausse dans un thème | UCM Palettes écrit les deux colonnes depuis la table du kit et la recette ; Gestion signale une variable dont la valeur diffère de ce qu'il a écrit | La reprise des variables existe pour `primitives` ; à étendre à `theme` |
| Un texte posé sur le fond d'un autre dossier | `ucm check` compare, dans chaque variant, le dossier du texte et celui du fond posé dessous, puis mesure leur contraste dans chaque marque et chaque thème | Le diagnostic des emplois existe ; la règle du dossier et la mesure systématique sont à écrire |
| Un couple qui échoue sur une palette réelle | UCM Palettes mesure chaque couple de la table sur chaque palette, et la carte des garanties l'affiche | Les garanties existent ; leur liste suit la table |
| Un designer qui choisit un texte dans le mauvais sélecteur | Les portées : un sélecteur de texte ne propose que des textes | D14 ; essai Figma A5.1 à faire |
| Un designer qui hésite | La description de chaque variable dit sur quoi elle se pose : « Se lit sur `primary/surface/background`, `-hover`, `-pressed`, la page et une carte » | Essai Figma A5.2 à faire |

## 5. Mesures

Protocole : recette par défaut, préréglage Tailwind, quatorze références à
une et deux intensités, soit 42 rampes par thème, référence ancrée. Une mesure
qui touche la nuance où la référence est ancrée se compte à part. La carte
vaut blanc en Light et la nuance 100 d'un gris en Dark. Seuils 4,5:1 pour un
texte et 3:1 pour un contour ou un anneau.

### Le dossier `surface`

Texte et contour constants, contre la page, la carte et les fonds 100, 200 et
300. Pire ratio :

| Nuance | Light | Dark | Light inversé | Dark inversé |
|---|---|---|---|---|
| Texte 800 | 5,26 | 5,64 | 5,26 | **4,44**, échoue |
| Texte 900 | 7,30 | 7,73 | 7,30 | 7,73 |
| Texte 900 sur un quatrième fond, 400 | 5,47 | 5,81 | 5,47 | 5,81 |
| Contour 700 | 3,74 | 3,89 | **2,66**, échoue | **2,44**, échoue |
| Contour 800 | 5,26 | 5,64 | 5,26 | 4,44 |

Entre deux fonds voisins, l'écart vaut au moins 0,045 ΔEok, assez pour voir
un survol.

### Le dossier `solid`

Texte des boutons, blanc ou noir purs, sur les trois fonds :

| Thème | Fonds | Pire ratio, hors nuance ancrée | Sur la nuance ancrée |
|---|---|---|---|
| Light, texte blanc | 700, 800, 900 | 5,67 | aucun échec |
| Dark, texte noir | 700, 800, 900 | 6,39 | aucun échec |
| Light inversé, texte noir | 700, 600, 500 | 4,66 | 5 références sur 14 échouent, de 3,90 à 4,43 |
| Dark inversé, texte blanc | 700, 600, 500 | 4,55 | 3 références sur 14 échouent, de 3,81 à 4,31 |

Les échecs sur la nuance ancrée sont ceux du dossier du texte des boutons,
section 5.6. Leur traitement reste sa décision 3.

### La racine

| Thème | Texte coloré sur la page et la carte | Contour sur la page et la carte | Le même texte posé sur un fond teinté |
|---|---|---|---|
| Light | 700 : 5,29 | 600 : 3,78 | 82 sur 126, pire 3,74 |
| Dark | 700 : 5,19 | 600 : 3,78 | 84 sur 126, pire 3,60 |
| Light inversé | 800 : 7,52 | 700 : 3,71 | 126 sur 126 |
| Dark inversé | 800 : 5,93 | 700 : 3,32 | 115 sur 126, pire 3,60 |

### L'anneau unique et les textes croisés

La nuance 900 de chaque palette, contre la page, la carte et les fonds 100 à
300 de toutes les palettes : 5 376 mesures par thème, aucun échec, pire ratio
6,19:1 en Dark inversé. Le même calcul pour le texte 900 donne 5 292 mesures
sans échec : le texte du dossier `surface` d'une palette se lit aussi sur le
fond teinté d'une autre, par exemple un texte neutre sur une ligne
sélectionnée bleue. La règle du dossier ne l'interdit pas pour ce cas ; elle
ne dit rien du sens, et un texte de succès sur un fond de danger reste une
erreur.

## 6. Ce que la proposition change dans les décisions D1 à D17

| Décision | Changement |
|---|---|
| D2, `theme` suit une règle fixe | `theme` suit une table : une nuance par variable et par thème, lue dans le kit et le réglage du texte des boutons. Elle ne contient toujours aucun choix du designer |
| D7, 400 et 950 obligatoires | Plus aucune variable d'usage ne vise la 400 ni la 950. Les garder obligatoires coûte peu ; décision 6 |
| D11, `components` vise `usage` | `components` vise `theme` |
| D13, la collection `usage` | Remplacée par les variables de la section 4.1 dans `theme` ; douze par palette au lieu de vingt |
| D14, une nuance hors table | Inchangée : le token de composant vise `theme.{p}.scale.N` |
| D16, une table pour les trois outils | Inchangée dans son principe ; la table du kit porte une colonne par thème, normal et inversé |
| D17, quatre rangs d'état | Trois fonds par dossier ; le texte ne change pas ; la sélection change de dossier |
| Ensembles E1 à E5 | Abandonnés : E2 est généralisé à tous les usages, E4 devient l'anneau `focus` à 900, E5 retient l'option B |

## 7. Cas d'usage

| Composant | Repos | Survol | Appui ou sélection | Texte, constant |
|---|---|---|---|---|
| Bouton principal | `primary/solid/background` | `…/background-hover` | `…/background-pressed` | `primary/solid/text` |
| Bouton secondaire, contour | pas de fond ; contour `primary/surface/border` | `primary/surface/background-hover` | `primary/surface/background-pressed` | `primary/surface/text` |
| Alerte de danger | `danger/vivid/surface/background` | | | `danger/vivid/surface/text` |
| Badge fort | `success/vivid/solid/background` | | | `success/vivid/solid/text` |
| Ligne de tableau | pas de fond | `neutral/surface/background-hover` | sélection : `primary/surface/background` | `neutral/surface/text`, puis `primary/surface/text` |
| Champ de saisie | fond `elevation/raised`, contour `neutral/border` | contour `primary/border` | | `neutral/text` |
| Lien dans un paragraphe | | | | `primary/text` |
| Focus de n'importe quel contrôle | | | | anneau `focus` |

## 8. Limites

- Le bouton secondaire prend le texte 900 du dossier `surface`, plus sombre que
  le texte coloré 700 d'un lien. Un texte 800 garderait plus de couleur ; il
  tient dans les thèmes normaux, au pire à 5,26:1, et échoue en Dark inversé
  (décision 3).
- L'anneau à 900 perd la teinte vive de la palette et se rapproche du texte.
- Une palette dont le designer a déplacé la courbe de 0,10 au plus
  (`BORNES_DES_REGLAGES`) n'a pas été mesurée ici. Les marges du texte 900
  (au moins 2,8 au-dessus du seuil) et du contour 800 (au moins 1,4) sont les
  plus larges de la table.
- Une palette libre, dont les numéros sortent du modèle, n'alimente pas
  `theme` : elle n'a pas de variables d'usage.
- La mesure porte sur des aplats opaques. Une opacité de calque ou un fond
  translucide demande une composition, que ni UCM Palettes ni `ucm check` ne
  calculent.
- Les essais Figma A5.1 et A5.2 du
  [plan d'intégration](../PLAN-INTEGRATION-ARCHITECTURE.md) restent à faire :
  filtrage du choix d'un alias par portée, affichage de la description d'une
  variable dans le sélecteur.

## 9. Décisions à prendre

1. **Adopter les dossiers à texte constant** à la place des rangs de D17 et des
   ensembles.
2. **Où vivent les variables d'usage :** dans `theme`, qui porte les modes
   (recommandé), ou dans une collection `usage` sans mode qui recopie `theme`
   nom pour nom.
3. **La nuance du texte du dossier `surface` :** 900 dans tous les thèmes
   (recommandé, une seule valeur, marge de 2,8), ou 800 dans les thèmes
   normaux et 900 dans les thèmes inversés.
4. **L'anneau unique `focus`** à `primary` 900 dans tous les thèmes.
5. **Les noms :** `background`, `background-hover`, `background-pressed`,
   `text`, `border`, `divider`, à éprouver dans le sélecteur Figma avant
   d'écrire la table.
6. **Les nuances 400 et 950** : rester obligatoires (D7), ou redevenir
   facultatives.
7. **Le thème inversé lui-même** reste à décider dans le
   [dossier du texte des boutons](../../Plugin%20Palettes/Texte%20des%20boutons/DOSSIER-TEXTE-DES-BOUTONS.md#9-décisions-à-prendre),
   avec l'ancrage d'une référence qui ne porte pas le texte des boutons. La
   proposition ci-dessus fonctionne avec ou sans lui.

Une fois ces décisions prises, l'ordre de travail serait : un essai dans Figma
sur un bouton, une ligne et une alerte, à la main, en Light et en Dark ; la
table du kit et ses tests ; l'écriture de `theme` par UCM Palettes ; la règle
du dossier dans `ucm check` ; la mise à jour d'ARCHITECTURE-FINALE et de la
vue illustrée.

## 10. Mesures et scripts

Depuis la racine du dépôt :

```sh
npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/Collection usage/mesurer-dossiers.ts"
```

[mesurer-dossiers.ts](./mesurer-dossiers.ts) écrit
[MESURES-DOSSIERS.json](./MESURES-DOSSIERS.json) : pour chaque thème, le texte
des boutons, les textes et contours candidats du dossier `surface`, la racine,
l'anneau et les textes croisés, avec le pire cas nommé.

## Sources

### Dépôt

- [ARCHITECTURE-FINALE-MULTIMARQUES.md](../ARCHITECTURE-FINALE-MULTIMARQUES.md)
  et la [vue illustrée](../VUE-ILLUSTREE-MULTIMARQUES.html), décisions D1 à D17.
- [`emplois.ts`](../../../../../packages/kit/src/emplois/emplois.ts),
  [`paires.ts`](../../../../../packages/kit/src/emplois/paires.ts),
  [`rangs.ts`](../../../../../packages/kit/src/emplois/rangs.ts),
  [`usages.ts`](../../../../../packages/kit/src/emplois/usages.ts).
- [Dossier du texte des boutons](../../Plugin%20Palettes/Texte%20des%20boutons/DOSSIER-TEXTE-DES-BOUTONS.md)
  et ses mesures.

### Externes

- [Material Web, opacités des calques d'état](https://github.com/material-components/material-web/blob/main/tokens/versions/v0_192/_md-sys-state.scss)
- [Atlassian, thème Dark de `@atlaskit/tokens`](https://unpkg.com/@atlaskit/tokens/dist/esm/artifacts/themes/atlassian-dark.js)
- [Fluent 2, couleurs du thème Light](https://unpkg.com/@fluentui/tokens/lib/alias/lightColor.js) et [du thème Dark](https://unpkg.com/@fluentui/tokens/lib/alias/darkColor.js)
- [Polaris, tokens de couleur](https://github.com/Shopify/polaris/blob/main/polaris-tokens/src/themes/base/color.ts)
- [Primer, thème Light](https://unpkg.com/@primer/primitives/dist/css/functional/themes/light.css) et [thème Dark](https://unpkg.com/@primer/primitives/dist/css/functional/themes/dark.css)
- [W3C, Understanding 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [W3C, Understanding 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

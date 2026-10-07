# La collection `usage`, reprise depuis le début

**Statut :** recherche. Ce document propose de remplacer la forme de `usage`
retenue par les décisions D13 et D17, et les propositions qui l'ont suivie.
Aucun code, aucune recette ni aucun format publié n'est modifié.

Vocabulaire : le **bouton** est le fond `solid` ; le **texte des boutons**,
`solid/foreground` ; le **fond teinté**, `surface` ; le **texte coloré**,
`page/foreground`. Un
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

**Ce que font Material, Atlassian, Fluent, Polaris, Primer, Carbon et
Radix.** Un état change le fond ; le texte posé dessus reste en général le
même, y compris sur les fonds teintés. Le nom d'un fond dit
quel texte va avec. La couche qui porte les noms d'usage porte aussi les
valeurs de chaque thème, et un programme les écrit.

**La proposition, en quatre règles pour le designer :**

1. Le dossier se lit sur le fond juste derrière le texte : la page, une carte
   ou une modale, `page` ; une teinte claire de la palette, `surface` ; la
   couleur franche de la palette, `solid`.
2. Le texte, l'icône et le contour se prennent dans ce dossier.
3. Un état qui garde la sorte de fond ne change que le fond : `default`,
   `hover`, `pressed`. Le texte et le contour ne bougent pas.
4. Un état qui change la sorte de fond change de dossier : le survol du bouton
   outlined passe de `page` à `solid`, une ligne neutre sélectionnée passe dans
   `primary/surface`.

**Ce qui change dans l'architecture.** `usage` disparaît dans `theme`. La
collection qui porte les modes Light et Dark porte aussi les noms d'usage.
Ses deux colonnes suivent une table du kit. Elles se posent dans Figma hors
d'UCM Palettes, qui n'écrit que les palettes de `primitives` : à la main
aujourd'hui, ou un jour par un autre plugin. Le profil d'UCM Explorateur
compare chaque alias à la table, en information. Le designer qui pose un calque ne connaît aucun numéro de
nuance.

**Ce que disent les mesures** (42 rampes, quatre thèmes dont deux inversés) :
le texte et le contour du dossier `surface`, à la nuance 800 dans les thèmes
normaux et 900 dans les thèmes inversés, tiennent 4,5:1 sur leurs trois fonds,
la page et la carte, au pire à 5,26:1. L'anneau de focus de chaque palette,
à la 600 (700 dans un thème inversé), tient 3:1 contre la page, la carte et
le fond 100 de sa palette dans les quatre thèmes. Seuls le bouton, le texte des boutons, le
texte et le contour de `surface`, le dossier `page` et l'anneau changent de
nuance dans un thème inversé.

**Une variante écartée : le texte qui suit le fond** (section 4.7). Le
texte d'un fond teinté y monte d'un cran avec le fond, comme les paires
d'UCM Palettes aujourd'hui. Elle garde le texte 700 du Playground sur
l'alerte, mais demande dix-huit variables par palette et un texte qui change
avec l'état, ce qu'aucun système vérifié ne fait. Le mainteneur a retenu le
texte constant.

**Ce que dit la recette sur les contrats du Playground** (section 7) : le
modèle exprime `Button` et `Alert` sans nuance hors table, dans les deux
variantes. Elle ajoute `disabled/border`, aligne le contour de chaque dossier
sur son texte, garde un anneau par palette, et fait du bouton `text` un bouton
du dossier `surface`.

**Ce que la proposition demande au moteur** : le
[document des changements du moteur](./CHANGEMENTS-DU-MOTEUR.md).

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
La section 5 mesure qu'il existe : la nuance 800 tient sur les fonds 100, 200
et 300 dans les thèmes normaux, la 900 dans les quatre thèmes.

### 2.2 `theme` choisit un numéro, pas un emploi

D2 donne à `theme` une règle fixe : `theme.primary.800` vise le 800 clair en
Light et le 800 sombre en Dark. `usage`, sans mode, vise ce numéro. Le survol
du bouton vaut donc 800 dans les deux thèmes.

Dans un thème inversé, ce survol vaut 800 en Light et 600 en Dark. Aucune
chaîne `usage → theme` actuelle ne l'exprime. Trois façons de l'écrire :

| Façon | Qui écrit la différence | Risque |
|---|---|---|
| Un designer repointe à la main, en Dark, les variables qui changent | Le designer, variable par variable | Une erreur ou un oubli ne se voit qu'en Dark ; personne ne relit un alias |
| Les ensembles : `theme` reçoit des variables nommées pour les emplois qui changent, `usage` garde les autres | Celui qui pose `theme`, depuis la table | La table se lit en deux endroits, selon que l'emploi change ou non |
| Tous les emplois passent dans la collection qui porte les modes | Celui qui pose `theme`, depuis une seule table | Un alias faux se détecte : le profil d'UCM Explorateur le compare à la table (section 4.6) |

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

Un sixième constat, sur les fonds teintés et neutres interactifs : le texte
reste constant chez Atlassian (aucun token `color.text.*` ne porte
`hovered` ni `pressed`), Primer (`control.fgColor.rest` sur les trois fonds du
bouton transparent), Carbon (`textPrimary` sur `layerHover`, `layerSelected`,
`layerActive`) et Radix (pas 11 ou 12 sur les pas 3, 4 et 5). Fluent et
Spectrum foncent le texte une seule fois : `colorNeutralForeground2` passe de
gris 26 à gris 14 au survol, à l'appui et à la sélection ;
`neutral-content-color` passe de gray-800 à gray-900 au survol et à l'appui.
Aucun système vérifié n'avance le texte d'un cran à chaque état. Les fonds
d'état de ces systèmes restent proches : Carbon clair va de #e8e8e8 à
#c6c6c6, Primer s'arrête à 15 % d'opacité.

Un cinquième constat, sur le focus : Atlassian (`color.border.focused`),
Polaris (`color-border-focus`), Primer (`focus-outlineColor`) et Fluent
(`colorStrokeFocus2`) ont chacun **un seul** anneau pour tout le système.
Ce modèle s'en écarte : l'anneau prend la couleur du composant, un bouton
`danger` a un anneau `danger`. La table actuelle d'UCM Palettes fait déjà
de `focus` un emploi de chaque palette, à la 600.

## 4. La proposition

### 4.1 Les variables d'une palette

`{p}` désigne une palette : `primary`, `secondary`, `neutral`, ou un statut
avec son intensité, `success/soft`.

| Variable | Ce qu'elle peint | Se pose sur | Thème normal | Thème inversé |
|---|---|---|---|---|
| `{p}/solid/default` | Fond du bouton, du badge fort | la page, une carte, un fond teinté | 700 | 700 |
| `{p}/solid/hover` | Son survol | | 800 | 600 |
| `{p}/solid/pressed` | Son appui | | 900 | 500 |
| `{p}/solid/foreground` | Texte et icône sur ces trois fonds | `solid/default`, `hover`, `pressed` | blanc en Light, noir en Dark | noir en Light, blanc en Dark |
| `{p}/surface/default` | Fond teinté : alerte, badge doux, ligne sélectionnée | la page, une carte | 100 | 100 |
| `{p}/surface/hover` | Son survol | | 200 | 200 |
| `{p}/surface/pressed` | Son appui | | 300 | 300 |
| `{p}/surface/foreground` | Texte et icône sur ces trois fonds, la page et une carte | `surface/default`, `hover`, `pressed` | 800 | 900 |
| `{p}/surface/border` | Contour sur ces trois fonds, la page et une carte | `surface/default`, `hover`, `pressed` | 800 | 900 |
| `{p}/page/foreground` | Texte coloré, lien, icône | la page, une carte | 700 | 800 |
| `{p}/page/border` | Contour d'un champ, d'une case, d'un bouton ou d'une alerte outlined | la page, une carte | 700 | 800 |
| `{p}/page/divider` | Filet, séparateur | partout | 300 | 300 |
| `{p}/page/focus` | Anneau de focus d'un composant de la palette, séparé du composant par un espace | la page, une carte, le fond 100 d'un conteneur | 600 | 700 |

Treize variables par palette, contre vingt dans D13. Le thème inversé change
huit lignes de la table.

`foreground` peint le texte et l'icône, comme le rôle `foreground` des
contrats UCM, qui couvre `color` et `fill`. Le mainteneur l'a préféré à
`text`, qui ne disait pas l'icône. Dans chaque dossier, le contour a la
nuance du texte. Le texte de `surface`
est à 800 parce que la 800 tient sur les fonds 100, 200 et 300 dans les deux
thèmes normaux et en Light inversé ; en Dark inversé, elle tombe à 4,44:1 sur
le fond 300, et la table y écrit la 900.

`{p}/page/border` prend la nuance de `{p}/page/foreground` : le contour et le texte
d'un bouton outlined ont la même couleur, comme dans le Playground. Contre la
page et la carte, ce contour tient au pire 5,19:1 (section 5).
`neutral/page/border` suit la même règle, 700 et 800.

Le dossier `page` ne porte pas de fond : la page et la carte sont les deux
fonds d'`elevation`, communs à toutes les palettes ; une modale prend le fond
de la carte. Son texte garde la
couleur vive de la palette pour les liens et les libellés. Posé sur un fond
teinté, il échoue : 82 mesures sur 126 tiennent en Light (section 5). C'est la
raison du dossier `surface`.

`default`, `hover` et `pressed` nomment une couleur du dossier, pas un rôle de
calque. Ceux de `solid` portent la portée du fond et celle du contour : le
bouton outlined survolé, focalisé ou appuyé prend son contour dans le fond
plein.

### 4.2 Ce qui ne dépend d'aucune palette

| Variable | Ce qu'elle peint | Nuance |
|---|---|---|
| `neutral/page/foreground-main` | Le corps de texte | noir pur en light, blanc pur en dark |
| `neutral/page/foreground-subtle` | Le texte secondaire, sur la page ou une carte | neutre 700, 800 dans un thème inversé |
| `neutral/scale/0`, `neutral/scale/1000` | Le blanc et le noir, hors table | blanc et noir en light, échangés en dark |
| `disabled/background`, `disabled/foreground`, `disabled/border` | Un contrôle désactivé, exempté par WCAG | neutre 200, 500 et 500 |
| `elevation/page`, `raised` | Le fond d'écran, et celui d'une carte ou d'une modale (D15 modifiée) | inchangés |

Le neutre a deux textes au lieu d'un. `neutral/page/foreground-main`, le
corps de texte, vise le noir pur en light et le blanc pur en dark : le
contraste le plus fort, quel que soit le réglage du texte des boutons.
`neutral/page/foreground-subtle` porte le texte secondaire. Le neutre n'a pas
de `page/foreground` ; ses autres variables suivent la section 4.1. Ce sont
des lignes de la table du kit, pas des choix du designer.

### 4.3 Les états d'un composant

| État | Variable visée | Exemple : bouton | Exemple : ligne d'un tableau |
|---|---|---|---|
| Repos | `default` du dossier choisi | `primary/solid/default` | aucun fond |
| Survol | `hover` | `primary/solid/hover` | `neutral/surface/hover` |
| Appui | `pressed` | `primary/solid/pressed` | `neutral/surface/pressed` |
| Sélectionné | le `default` d'un autre dossier | bouton bascule : `neutral/surface` devient `primary/solid` | `primary/surface/default` |
| Sélectionné et survolé | le `hover` de cet autre dossier | `primary/solid/hover` | `primary/surface/hover` |
| Focus | l'état courant, et l'anneau `{p}/page/focus` | | |
| Désactivé | `disabled/*` | | |

Le texte de chaque exemple ne change pas entre les lignes d'un même dossier :
`primary/solid/foreground` pour le bouton, `neutral/surface/foreground` puis
`primary/surface/foreground` pour la ligne. Le quatrième rang de D17,
`active-hover`, n'a plus de raison d'être : la sélection survolée est le
survol de l'autre dossier.

Dans `components`, les noms d'état restent :
`button/colors/primary/contained/hover/background` vise `primary/solid/hover`.
Un composant peut garder un token de texte par état, comme le Playground ; ces
tokens visent alors la même variable.

### 4.4 Où se décide la nuance de chaque thème

`usage` fusionne avec `theme`. La collection `theme`, qui porte les modes
Light et Dark, contient les variables des sections 4.1 et 4.2, et les nuances
numérotées, rangées sous `scale`, pour un usage hors table (D14) :

```text
components.button.colors.primary.contained.hover.background
  → theme.primary.solid.hover
        light → color-brands.primary.light.800
        dark  → color-brands.primary.dark.600         thème Dark inversé
  → color-brands, colonne de la marque → primitives.colors.terracota.dark.600

components.chart.scale-5
  → theme.warning.vivid.scale.600                     hors table, même numéro dans les deux thèmes
```

| Collection | Avant (D1 à D17) | Après |
|---|---|---|
| `primitives`, `color-brands`, `color-utilities` | inchangées | inchangées, sauf `elevation`, qui perd `overlay`, et le blanc et le noir de la section 4.8 |
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

Le texte des boutons se règle une fois par thème dans UCM Palettes, qui
recalcule la courbe du thème inversé. La colonne de `theme` suit la table de
ce thème : `primary/solid/hover` vise la 800 en light et la 600 en dark. Le
designer qui pose `primary/solid/hover` sur le survol de son bouton fait le
même geste que dans un thème normal, et ne voit jamais ce 600.

### 4.6 Ce qui empêche l'erreur

| Risque | Ce qui le traite | État |
|---|---|---|
| Un alias de `theme` faux dans un thème | Le profil d'UCM Explorateur, dans Figma, compare chaque alias de `theme` à la table du kit, dans chaque thème ; un plugin dédié pourrait poser `theme` depuis la table | À écrire ; UCM Palettes n'écrit que `primitives` |
| Un texte posé sur le fond d'un autre dossier | Le nom le dit : `surface/foreground` va sur `surface/*`. Le profil d'UCM Explorateur informe. `ucm check` ne juge pas l'usage des couleurs ; il mesure, en information, le contraste de chaque texte contre son fond réel dans le composant, dans chaque marque et chaque thème | Le diagnostic d'`ucm check` garde la mesure et perd la table ; le profil d'UCM Explorateur est à mettre à jour |
| Un couple qui échoue sur une palette réelle | UCM Palettes mesure chaque couple de la table sur chaque palette, et la carte des garanties l'affiche | Les garanties existent ; leur liste suit la table |
| Un designer qui choisit un texte dans le mauvais sélecteur | Les portées : un sélecteur de texte ne propose que des textes | D14 ; essai Figma A5.1 à faire |
| Un designer qui hésite | La description de chaque variable dit sur quoi elle se pose : « Se lit sur `primary/surface/default`, `hover`, `pressed`, la page et une carte » | Essai Figma A5.2 à faire |

### 4.7 Variante écartée : le texte qui suit le fond

Le mainteneur a retenu le texte constant. Cette section garde la variante pour
mémoire : elle a été dessinée dans la page de l'architecture avant la
décision, et elle reste la forme la plus proche des paires actuelles d'UCM
Palettes.

UCM Palettes mesure aujourd'hui les paires de D17 : un texte qui avance d'un
cran avec le fond teinté (paires 2 à 4 de
[`paires.ts`](../../../../../packages/kit/src/emplois/paires.ts)). En
dossiers, cette règle donne un sous-dossier par état, qui porte le fond, le
texte et le contour de cet état :

| Variable | Thème normal | Thème inversé |
|---|---|---|
| `{p}/solid/{état}/background` | 700, 800, 900 | 700, 600, 500 |
| `{p}/solid/{état}/foreground` | blanc en Light, noir en Dark, dans les trois | noir en Light, blanc en Dark |
| `{p}/surface/{état}/background` | 100, 200, 300 | 100, 200, 300 |
| `{p}/surface/{état}/foreground`, `border` | 700, 800, 900 | 800, 900, 950 |
| `{p}/page/foreground`, `border`, `divider` | comme la section 4.1 | comme la section 4.1 |

`{état}` vaut `default`, `hover` ou `pressed`. Dix-huit variables par palette
au lieu de douze. La règle 3 devient : un état qui garde la sorte de fond est
un sous-dossier, et le fond, le texte et le contour s'y prennent ensemble. Les
règles 1, 2 et 4 ne changent pas. Le quatrième rang de D17, `active-hover`,
disparaît : la sélection change de dossier.

| | Texte constant | Texte qui suit le fond |
|---|---|---|
| Geste du designer | Choisir le fond de l'état ; le texte et le contour ne changent pas | Choisir le sous-dossier de l'état, et y prendre le fond, le texte et le contour |
| Alerte standard | Texte 800 sur le fond 100 | Texte 700 sur le fond 100, comme le Playground |
| Bouton `text` | Texte 800 dans tous les états | 700 au repos, 800 au survol, 900 à l'appui |
| Ligne de tableau neutre | Texte 800 dans tous les états | Texte 900 au repos, 800 au survol, dans un thème normal |
| Contraste | Le texte 800 sur les fonds 100 à 300 : au pire 5,26:1 | Chaque texte sur son fond : au pire 5,02:1 |
| Marché | Atlassian, Primer, Carbon, Radix ; Fluent et Spectrum à un cran près | Aucun système vérifié |
| UCM Palettes | Les paires en escalier deviennent : un texte contre ses trois fonds | Les paires de texte restent ; les noms changent, et l'escalier monte d'un cran dans un thème inversé |

Dans un thème inversé, le texte 700 échoue même sur le fond 100 : 2 rampes
sur 42 seulement tiennent. L'escalier y commence donc à 800.

### 4.8 La forme retenue dans le fichier Figma

Le mainteneur a remappé les tokens dans Figma. La comparaison avec cette
recherche a fixé ces choix, qui font maintenant partie de la proposition :

| Sujet | Forme retenue |
|---|---|
| Qui écrit quoi | UCM Palettes écrit les palettes dans `primitives`, à l'endroit fixé par sa configuration ; `color-brands`, `color-utilities` et `theme` se posent hors du plugin |
| Collection des marques | `color-brands`, sans groupe `palette` : `color-brands.primary.light.700` |
| Couleur de charte (D9) | `color-brands.identity.primary` et `identity.secondary` sont des alias vers la nuance où la référence est posée ; l'alias garde le rang |
| Blanc et noir | `primitives.colors.titanium.white` et `.black`, dans la rampe du neutre |
| Alias du blanc et du noir | `color-utilities.neutral.light.white`, `.black`, et de même sous `dark` ; `{p}/solid/foreground` et les variables du neutre les visent |
| Élévation (D15) | deux niveaux, `page` et `raised` ; `overlay` est retiré |
| Neutre | `neutral/page/foreground-main` et `foreground-subtle` (section 4.2) ; `neutral/scale/0` et `1000` |
| Modes de `theme` | `light` et `dark`, en minuscules |
| Périmètre | `layouts`, `typography` et les primitives de dimension et de police restent hors de cette recherche |

`primitives` n'a aucun mode. Les portées des variables ne se lisent pas dans
l'export JSON : elles restent à vérifier dans Figma.

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
| Contour 700 | 3,74 | 3,89 | **2,35**, échoue | **2,44**, échoue |
| Contour 800 | 5,26 | 5,64 | 5,26 | 4,44 |

Entre deux fonds voisins, l'écart vaut au moins 0,045 ΔEok, assez pour voir
un survol. La table retient le texte et le contour à 800 dans les thèmes
normaux, à 900 dans les thèmes inversés : au pire 5,26:1 dans les quatre
thèmes.

### Le dossier `solid`

Texte des boutons, blanc ou noir purs, sur les trois fonds :

| Thème | Fonds | Pire ratio, hors nuance ancrée | Sur la nuance ancrée |
|---|---|---|---|
| Light, texte blanc | 700, 800, 900 | 5,67 | aucun échec |
| Dark, texte noir | 700, 800, 900 | 6,39 | aucun échec |
| Light inversé, texte noir | 700, 600, 500 | 5,27 | 5 références sur 14 échouent, de 3,90 à 4,43 |
| Dark inversé, texte blanc | 700, 600, 500 | 4,55 | 3 références sur 14 échouent, de 3,81 à 4,31 |

Les échecs sur la nuance ancrée sont ceux du dossier du texte des boutons,
section 5.6. Leur traitement reste sa décision 3.

### Le dossier `page`

| Thème | Texte coloré sur la page et la carte | Contour sur la page et la carte | Le même texte posé sur un fond teinté |
|---|---|---|---|
| Light | 700 : 5,29 | 600 : 3,78 | 82 sur 126, pire 3,74 |
| Dark | 700 : 5,19 | 600 : 3,78 | 84 sur 126, pire 3,60 |
| Light inversé | 800 : 7,52 | 700 : 3,42 | 126 sur 126 |
| Dark inversé | 800 : 5,93 | 700 : 3,32 | 115 sur 126, pire 3,60 |

### Le texte qui suit le fond

Chaque texte sur le fond teinté de même rang, hors nuance ancrée :

| Thème | Textes sur 100, 200, 300 | Tenues | Pire ratio |
|---|---|---|---|
| Light | 700, 800, 900 | 124/124 | 5,02 |
| Dark | 700, 800, 900 | 116/116 | 5,24 |
| Light inversé | 800, 900, 950 | 122/122 | 7,14 |
| Dark inversé | 800, 900, 950 | 114/114 | 5,99 |

### L'anneau et les textes croisés

Une nuance de chaque palette, contre la page, la carte et les fonds 100 à 300
de toutes les palettes, 5 376 mesures par thème :

| Anneau | Light | Dark | Light inversé | Dark inversé |
|---|---|---|---|---|
| 700 | toutes, pire 3,42 | toutes, pire 3,60 | 2 672, pire 1,99 | 3 329, pire 2,21 |
| 800 | toutes, pire 4,87 | toutes, pire 5,25 | toutes, pire 4,87 | toutes, pire 3,60 |
| 900 | toutes | toutes | toutes | toutes, pire 6,19 |

Un anneau entoure le composant, séparé par un espace : il se lit contre ce
qui entoure le composant, la page, la carte ou le fond 100 d'un conteneur
teinté, et non contre les fonds de survol et d'appui. Contre ces fonds-là,
l'anneau `{p}/page/focus` retenu, à la 600 et à la 700 dans un thème inversé :

| Thème | Nuance | Page et carte | Fond 100 de sa palette | Fond 100 d'une autre palette |
|---|---|---|---|---|
| Light | 600 | 84/84, pire 3,08 | 24/24, pire 3,55 ; sur l'ancre, 2,92 | 1 680/1 764, pire 2,83 |
| Dark | 600 | 84/84, pire 3,17 | 26/26, pire 3,82 | toutes, pire 3,16 |
| Light inversé | 700 | 84/84, pire 3,08 | 24/24, pire 3,21 ; sur l'ancre, 2,92 | 1 680/1 764, pire 2,83 |
| Dark inversé | 700 | 84/84, pire 3,17 | 26/26, pire 3,36 | toutes, pire 3,16 |

Le fond 100 de sa palette est le cas courant : l'action d'une alerte a la
couleur de l'alerte. Il échoue sur une seule référence, `#16A34A`, ancrée à
la 600 en Light et à la 700 en Light inversé. Le fond d'une autre palette est
plus rare : un bouton `success` posé dans une alerte de danger, où 84 mesures
échouent en Light et en Light inversé.
Les 900, 800 et 700 tenaient partout, mais se lisaient comme du noir en Light
et du blanc en Dark. Pour intencial, l'anneau de `primary` vaut la couleur de
charte `#B15152` dans les quatre thèmes.

Le même calcul pour le texte de `surface`, 800 dans les thèmes normaux et 900
dans les thèmes inversés, donne 5 292 mesures sans échec par thème, au pire
4,87:1 : le texte du dossier `surface` d'une palette se lit aussi sur le fond
teinté d'une autre, par exemple un texte neutre sur une ligne
sélectionnée bleue. La règle du dossier ne l'interdit pas pour ce cas ; elle
ne dit rien du sens, et un texte de succès sur un fond de danger reste une
erreur.

## 6. Ce que la proposition change dans les décisions D1 à D17

| Décision | Changement |
|---|---|
| D2, `theme` suit une règle fixe | `theme` suit une table : une nuance par variable et par thème, lue dans le kit et le réglage du texte des boutons. Elle ne contient toujours aucun choix du designer |
| D7, 400 et 950 obligatoires | Plus aucune variable d'usage ne vise la 50, la 400 ni la 950. Elles deviennent facultatives, calculées par défaut (section 9) |
| D11, `components` vise `usage` | `components` vise `theme` |
| D13, la collection `usage` | Remplacée par les dossiers `page`, `surface` et `solid` de la section 4.1, dans `theme` ; treize variables par palette au lieu de vingt |
| D14, une nuance hors table | Inchangée : le token de composant vise `theme.{p}.scale.N` |
| D15, trois niveaux d'élévation | Deux niveaux, `page` et `raised` : `overlay` est retiré |
| D16, une table pour les trois outils | Inchangée dans son principe ; la table du kit porte une colonne par thème, normal et inversé |
| D17, quatre rangs d'état | Trois fonds par dossier ; le texte ne change pas ; la sélection change de dossier |
| Ensembles E1 à E5 | Abandonnés : E2 est généralisé à tous les usages, E4 devient l'anneau de focus, E5 retient l'option B |

## 7. Cas d'usage

| Composant | Repos | Survol | Appui ou sélection | Texte |
|---|---|---|---|---|
| Bouton plein | `primary/solid/default` | `primary/solid/hover` | `primary/solid/pressed` | `primary/solid/foreground` |
| Bouton outlined | pas de fond ; contour `primary/page/border` | fond et contour `primary/solid/hover` | fond et contour `primary/solid/pressed` | `primary/page/foreground`, puis `primary/solid/foreground` |
| Bouton text | pas de fond | `primary/surface/hover` | `primary/surface/pressed` | `primary/surface/foreground` |
| Alerte standard | `danger/vivid/surface/default` | | | `danger/vivid/surface/foreground` |
| Alerte outlined | pas de fond ; contour `danger/vivid/page/border` | | | `danger/vivid/page/foreground` |
| Badge fort | `success/vivid/solid/default` | | | `success/vivid/solid/foreground` |
| Ligne de tableau | pas de fond | `neutral/surface/hover` | sélection : `primary/surface/default` | `neutral/surface/foreground`, puis `primary/surface/foreground` |
| Champ de saisie | fond `elevation/raised`, contour `neutral/page/border` | contour `primary/page/border` | | `neutral/page/foreground-main` |
| Lien dans un paragraphe | | | | `primary/page/foreground` |
| Focus de n'importe quel contrôle | | | | anneau `{p}/page/focus` de la palette du contrôle |

### Recette sur Button et Alert du Playground

Les contrats `src/components/Button/Button.contract.json` et
`src/components/Alert/Alert.contract.json` du dépôt UCM-Playground ont été
rebranchés sur `theme`, rôle par rôle. La
[page de l'architecture](./ARCHITECTURE-PROPOSEE.html), section « Recette », les dessine dans
les trois marques de la vue illustrée, en Light et en Dark, et mesure chaque
variant. `primary` et `secondary` visent `color-brands` ; `info`, `success` et
`warning` leur statut en `vivid` ; `error` vise `danger/vivid`.

| Token de composant | Playground aujourd'hui | Modèle |
|---|---|---|
| Button `contained`, fond au repos | la nuance de la marque ou du statut | `{c}/solid/default` |
| Button `contained`, fond au survol et au focus | un cran plus foncé | `{c}/solid/hover` |
| Button `contained`, fond à l'appui | le même que le survol | `{c}/solid/pressed` |
| Button `contained`, texte | `neutral.50`, quasi blanc | `{c}/solid/foreground` |
| Button, anneau au focus et à l'appui | la nuance 100 de la couleur, 200 pour `primary` | `{c}/page/focus` |
| Button `outlined`, fond au repos | `neutral.50`, opaque | aucun fond |
| Button `outlined`, texte et contour au repos | la nuance du fond plein | `{c}/page/foreground`, `{c}/page/border` |
| Button `outlined`, survol, focus, appui | le fond plein, contour compris, texte `neutral.50` | `{c}/solid/hover`, `default`, `pressed` ; texte `{c}/solid/foreground` |
| Button `outlined`, désactivé | `neutral.50` ; contour et texte neutre 500 | aucun fond ; `disabled/border`, `disabled/foreground` |
| Button `text`, texte | la nuance du fond plein | A : `{c}/page/foreground` ; B : `{c}/surface/foreground` |
| Button `text`, fond au survol, au focus, à l'appui | nuance 50, 100 pour `secondary` | A : `{c}/surface/default` ; B : `{c}/surface/hover`, puis `pressed` |
| Alert `standard` | fond 50 ; texte et icône 700 | `{c}/surface/default` ; `{c}/surface/foreground`, 800 |
| Alert `outlined` | texte 700, 900 pour `info` ; icône et contour 700 | `{c}/page/foreground` ; contour `{c}/page/border` |

Mesures sur les 42 rampes de la section 5 (bloc `composantsDuPlayground` de
[MESURES-DOSSIERS.json](./MESURES-DOSSIERS.json)) :

| Mesure | Light | Dark | Light inversé | Dark inversé |
|---|---|---|---|---|
| `page/border` à la nuance de `page/foreground`, sur la page et la carte | 84/84, pire 5,29 | 76/76, pire 5,19 | 84/84, pire 7,52 | 76/76, pire 5,93 |
| Anneau du Playground, nuance 100 | 0/84, pire 1,05 | 0/84, pire 1,00 | 0/84, pire 1,05 | 0/84, pire 1,00 |
| Anneau du Playground, nuance 200 | 0/84, pire 1,17 | 0/84, pire 1,12 | 0/84, pire 1,17 | 0/84, pire 1,12 |
| `page/foreground` sur le fond 100 | 42/42, pire 5,02 | 42/42, pire 5,16 | 42/42, pire 7,14 | 42/42, pire 5,16 |
| `page/foreground` sur le fond 200 | 40/42, pire 4,49 | 40/42, pire 4,42 | 42/42 | 40/42, pire 4,42 |
| `page/foreground` sur le fond 300 | 0/42 | 2/42 | 42/42 | 33/42 |

La recette conduit à sept ajustements du modèle, déjà portés par la
section 4 :

- le dossier `page` remplace la racine de la palette, et la règle du dossier
  n'a plus d'exception ;
- `page/border` prend la nuance de `page/foreground` : le bouton outlined au repos
  prend son texte et son contour dans `page`, de la même couleur ;
- chaque palette a son anneau, `{p}/page/focus`, à la 600, et à la 700 dans
  un thème inversé ;
- le texte et le contour de `surface` passent à la 800, et à la 900 dans un
  thème inversé ;
- le bouton `text` devient un bouton du dossier `surface`, sans fond au
  repos ;
- les fonds de `solid` portent la portée du contour, pour l'outlined survolé,
  focalisé ou appuyé ;
- `disabled/border` s'ajoute pour le bouton outlined désactivé.

Quatre ajustements reviennent aux composants :

- l'anneau vise `{c}/page/focus` : la nuance 100 ou 200 que prend le
  Playground n'atteint 3:1 sur aucune palette ;
- le bouton outlined ne pose plus de fond au repos. Le `neutral.50` opaque du
  Playground se voit sur une carte grise et en Dark ;
- l'alerte outlined prend un seul texte, `{c}/page/foreground`, au lieu de la 900
  pour `info` et de la 700 pour les autres sévérités ;
- l'alerte standard passe du fond 50 au fond 100, et du texte 700 au texte
  800.

Le bouton `text` n'a pas de fond au repos, pose un fond teinté au survol, et
l'alerte standard le place sur son propre fond `surface/default`. Deux formes
ont été comparées ; la page de l'architecture retient B (décision 8).

| | A. Texte du dossier `page` | B. Dossier `surface` |
|---|---|---|
| Texte | `{c}/page/foreground`, 700 | `{c}/surface/foreground`, 800 |
| Fond au survol, au focus, à l'appui | `{c}/surface/default` pour les trois : le texte 700 ne tient ni sur le 200 ni sur le 300 | `{c}/surface/hover`, puis `pressed` |
| Dans l'alerte standard | Le fond de survol est celui de l'alerte : le bouton ne change pas au survol | Le survol, à la 200, se distingue du fond 100 |
| Dans l'alerte outlined | L'action a la couleur du titre | L'action est plus sombre que le titre |

La page mesure aussi le bouton plein dans les trois marques. Il échoue à la
nuance 700 dans un thème inversé seulement : `info` en Dark avec texte blanc,
3,68:1, et `primary` d'intencial, 4,17:1, en Light avec texte noir. Les deux
touchent la nuance où la référence est ancrée ; la référence reste ancrée, et
le plugin signale l'échec. La courbe Light inversée corrigée, 0,745 / 0,69 /
0,61 de 500 à 700, fait tenir `secondary` de marque-2 et `error`, qui
échouaient avec la première courbe (0,71 / 0,66 / 0,58).

## 8. Limites

- Un composant du dossier `surface`, comme le bouton `text` ou l'alerte
  standard, prend le texte 800, un cran plus sombre que le texte coloré 700
  d'un lien ou d'une alerte outlined.
- En Light, l'anneau d'une palette descend sous 3:1 sur son propre fond 100
  quand sa référence est ancrée à la 600, et sur le fond 100 d'une autre
  palette quand il est vert vif et l'autre rouge (section 5). UCM Palettes
  doit le signaler pour la palette concernée.
- Une palette dont le designer a déplacé la courbe de 0,10 au plus
  (`BORNES_DES_REGLAGES`) n'a pas été mesurée ici. Le texte 800 de `surface`
  garde au moins 0,76 au-dessus du seuil dans les thèmes normaux.
- Une palette libre, dont les numéros sortent du modèle, n'alimente pas
  `theme` : elle n'a pas de variables d'usage.
- La mesure porte sur des aplats opaques. Une opacité de calque ou un fond
  translucide demande une composition, que ni UCM Palettes ni UCM Explorateur
  ne calculent.
- Les essais Figma A5.1 et A5.2 du
  [plan d'intégration](../PLAN-INTEGRATION-ARCHITECTURE.md) restent à faire :
  filtrage du choix d'un alias par portée, affichage de la description d'une
  variable dans le sélecteur.

## 9. Décisions à prendre

Retenus par le mainteneur : les dossiers `page`, `surface` et `solid` ; le
texte constant sur un fond teinté, à la place des rangs de D17 et des
ensembles : texte et contour de `surface` à 800 dans les thèmes normaux, 900
dans les thèmes inversés ; le contour de `page` à la nuance de
`page/foreground` ; le nom `foreground`, qui peint le texte et l'icône, au
lieu de `text` ; un anneau par palette, `{p}/page/focus`, à la 600, 700 dans
un thème inversé ; les choix de la section 4.8, issus du fichier Figma.

Retenus aussi dans le bilan de validation : les variables d'usage vivent
dans `theme`, sans collection `usage`, comme dans le fichier remappé ; les
nuances 50, 400 et 950 deviennent facultatives, calculées par défaut pour
nuancer des éléments sur mesure, sans variable de `theme` ni garantie.

Restent :

1. **`disabled/border`**, au neutre 500.
2. **Les noms des fonds :** `default`, `hover` et `pressed`. À éprouver dans
   le sélecteur Figma avant d'écrire la table, avec `foreground`, `border` et
   `divider`.
3. **Le bouton `text`** dans le dossier `surface` (B), section 7.
4. **Le thème inversé lui-même** est décidé dans le
   [dossier du texte des boutons](../../Plugin%20Palettes/Texte%20des%20boutons/DOSSIER-TEXTE-DES-BOUTONS.md#9-décisions),
   ancrage compris : une référence qui ne porte pas le texte des boutons reste
   ancrée, et le plugin signale la garantie manquée.

Une fois ces décisions prises, l'ordre de travail serait : un essai dans Figma
sur les contrats `Button` et `Alert` du Playground et sur une ligne, à la main,
en Light et en Dark ; la
table du kit et ses tests ; la pose de `theme` dans Figma, hors d'UCM Palettes ; le profil
d'UCM Explorateur, et le diagnostic des contrastes d'`ucm check`, sans table ; la mise à jour d'ARCHITECTURE-FINALE et de la
vue illustrée. Le [document des changements du moteur](./CHANGEMENTS-DU-MOTEUR.md)
détaille ces chantiers.

## 10. Mesures et scripts

Depuis la racine du dépôt :

```sh
npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/Collection usage/mesurer-dossiers.ts"
```

[mesurer-dossiers.ts](./mesurer-dossiers.ts) écrit
[MESURES-DOSSIERS.json](./MESURES-DOSSIERS.json) : pour chaque thème, le texte
des boutons, les textes et contours candidats du dossier `surface`, le
dossier `page`, le texte qui suit le fond, l'anneau, les textes croisés et
les cas des composants du Playground, avec le pire cas nommé.

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
- Dépôt UCM-Playground : `src/components/Button/Button.contract.json`,
  `src/components/Alert/Alert.contract.json` et `src/tokens/tokens.json`.

### Externes

- [Material Web, opacités des calques d'état](https://github.com/material-components/material-web/blob/main/tokens/versions/v0_192/_md-sys-state.scss)
- [Atlassian, thème Dark de `@atlaskit/tokens`](https://unpkg.com/@atlaskit/tokens/dist/esm/artifacts/themes/atlassian-dark.js)
- [Fluent 2, couleurs du thème Light](https://unpkg.com/@fluentui/tokens/lib/alias/lightColor.js) et [du thème Dark](https://unpkg.com/@fluentui/tokens/lib/alias/darkColor.js)
- [Polaris, tokens de couleur](https://github.com/Shopify/polaris/blob/main/polaris-tokens/src/themes/base/color.ts)
- [Primer, thème Light](https://unpkg.com/@primer/primitives/dist/css/functional/themes/light.css) et [thème Dark](https://unpkg.com/@primer/primitives/dist/css/functional/themes/dark.css)
- Fonds teintés : [Atlassian, noms des tokens](https://unpkg.com/@atlaskit/tokens@latest/dist/esm/artifacts/token-names.js),
  [Primer, contrôles](https://raw.githubusercontent.com/primer/primitives/main/src/tokens/functional/color/control.json5)
  et [bouton](https://raw.githubusercontent.com/primer/primitives/main/src/tokens/component/button.json5),
  [Carbon, thèmes](https://unpkg.com/@carbon/themes@11/lib/index.js),
  [Spectrum, alias de couleur](https://unpkg.com/@adobe/spectrum-tokens@latest/src/color-aliases.json),
  [Radix Colors, l'échelle](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [W3C, Understanding 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [W3C, Understanding 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

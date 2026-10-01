# UCM Palettes : spécification du plugin

UCM Palettes est un plugin Figma qui fabrique des palettes de couleur selon la
recette de [l'architecture
multi-marques](../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md),
et les dessine dans le fichier Figma. Une palette part d'une couleur de
référence et produit quatre rampes de onze crans : `soft` et `vivid`, en clair
et en sombre. La planche dessinée montre, pour chaque cran, son hexa, ses
valeurs OKLCH, ses contrastes, le seuil qu'il tient et les emplois que la table
de l'architecture lui confie.

Une palette ne sait pas à quoi elle sert : couleur de marque, utilitaire ou
autre. Le designer lui donne un nom s'il le souhaite, et ce nom n'a aucun effet
sur le calcul.

Ce document est la base du [plan de développement](./PLAN-PLUGIN-PALETTES.md).
Un agent qui implémente le plugin y trouve chaque formule, chaque écran et
chaque cadre de la planche ; le plan donne l'ordre des lots et le critère qui
ferme chacun. Ce qui manquait à la version précédente est dans [la revue
critique](./REVUE-CRITIQUE-PLUGIN-PALETTES.md).

## 1. Statut et lecture

- **Statut** : spécification en cours d'implémentation. Le plan coche les lots
  livrés.
- **Utilisateur** : l'équipe du design system.
- **Dépôt** : ce monorepo, en paquet séparé d'UCM Exporter. Le renommage du
  dépôt en UCM-Kit est prévu ; ce plugin ne l'attend pas et ne le prépare pas.
- **Exigences** : chaque règle vérifiable porte un identifiant entre crochets,
  `[MOT-03]` par exemple. Le plan de développement cite ces identifiants ; un
  test cite dans son nom l'identifiant qu'il vérifie.

| Préfixe | Domaine |
|---|---|
| `MOT` | Moteur de couleur, sans Figma |
| `REC` | Recette : contenu, rangement, version |
| `ENT` | Entrées du designer |
| `DER` | Le Color shift : sa carte et ses limites |
| `PLA` | Planche : les palettes dessinées dans Figma |
| `VER` | Vérifications et alertes |
| `ARC` | Architecture du code et réemploi |
| `UI` | Interface du plugin |

## 2. Vocabulaire

| Terme | Sens |
|---|---|
| Palette | Une couleur de référence et ses réglages. Elle produit quatre rampes |
| Couleur de référence | L'hexa que le designer saisit. Elle ne change jamais ; la palette se construit autour d'elle |
| Rampe | Onze crans, de 50 à 950, pour une intensité et un mode |
| Cran | Une couleur de la rampe, désignée par son numéro |
| Profil | `soft` ou `vivid` : la part de la vivacité maximale que l'écran affiche, 0,45 ou 0,95 par défaut |
| Intensité | Une rampe par mode qu'une palette porte : `soft` et `vivid` pour une palette à deux intensités, la rampe unique, sans nom de profil, pour une palette à une intensité (`[ENT-14]`) |
| Mode | `light` ou `dark` : la courbe de clarté employée |
| Color shift | Les décalages de teinte, de saturation et de luminosité à chaque bout de la rampe, autour de la couleur de référence (`[MOT-30]`). La recette les range sous `derive`, et le code garde ce nom |
| Dérive de teinte | Le décalage de teinte du Color shift, en degrés, entre la couleur de référence et chaque bout de la rampe |
| Poids d'une nuance | 0 à la clarté du pivot, 1 au bout de la rampe, linéaire entre les deux : la fraction du réglage d'un bout que la nuance reçoit (`[MOT-30]`) |
| Fond de référence | L'hexa contre lequel se mesurent les contrastes d'un mode |
| Emploi | Un usage d'un cran, `text` ou `solid` par exemple. La table des emplois de l'architecture lui fixe un cran, et un cran par rang |
| Rang | `default`, `hover`, `active` ou `active-hover` : le nombre de crans, de 0 à 3, dont un membre de paire avance. Un rang nomme un cran de la paire, pas une interaction |
| Recette | Tous les nombres qui fabriquent les palettes du fichier |
| Planche | Les cadres que le plugin dessine dans Figma |
| Profil porteur | Le profil dont les rampes contiennent la couleur de référence exacte, dans les deux modes (`[MOT-17]`). Une palette à une intensité n'en a pas : sa rampe unique contient la référence |
| Promesse | Une relation d'usage entre deux couleurs, `on-solid` sur `solid` par exemple, que son contraste mesuré vérifie contre un minimum |

L'interface et la planche emploient le vocabulaire d'affichage de
l'[inventaire des textes](../Textes et langues/INVENTAIRE-TEXTES-ET-PROPOSITIONS.md#vocabulaire-retenu) :
« Palettes et réglages » pour la recette, « Réglages communs » pour sa
configuration, « nuance » pour un cran, « intensité » pour une part de chroma,
« usage » pour un emploi, « Thème Light » et « Thème Dark » pour les modes.
Ce document garde les termes du code, que les données enregistrées portent
aussi.

## 3. Décisions

| # | Décision | Conséquence |
|---|---|---|
| D1 | Plugin séparé d'UCM Exporter, dans ce monorepo | UCM Exporter garde sa garantie : l'analyse et la publication n'écrivent jamais dans le document |
| D2 | Le résultat est une planche : des cadres Figma qui dessinent chaque palette et ses informations | Le plugin ne crée ni ne modifie aucune variable. Créer les variables est une option ultérieure ([section 17](#17-option-ultérieure--créer-les-variables)) |
| D3 | L'unité est la palette, sans notion de marque ni de famille | Le plugin ne nomme jamais une couleur `primary` ou `danger` ; le nom éventuel vient du designer |
| D4 | Le Color shift règle la teinte, la saturation et la luminosité aux deux bouts, autour de la couleur de référence | La couleur de référence reste fixe ; les autres crans suivent le réglage en direct, dans des limites qui gardent les garanties tenues ([section 12](#12-le-color-shift)) |
| D5 | Un préréglage « Tailwind » calcule les deux dérives de teinte depuis le relevé des rampes Tailwind | Reproduire le comportement de Tailwind tient en un clic. La saturation et la luminosité n'ont pas de préréglage |
| D6 | Le plugin n'a aucun accès réseau | La recette exportée se range à la main dans un dépôt |
| D7 | Le moteur de couleur est un module pur, rangé dans le paquet privé `packages/couleur`, nom `ucm-couleur`, servi en source. Le vocabulaire qu'UCM Palettes, l'architecture et `ucm check` partagent, emplois, paires, rangs et contraste WCAG 2, est dans le point d'entrée `@ucm-kit/core/emplois` du kit publié | Le plugin, ses tests et `ucm check` jugent sur la même table et le même arrondi. `ucm-couleur` importe ce vocabulaire ; la fabrication des palettes, la recette et ses formats restent hors du kit |
| D8 | Les contrastes se mesurent contre deux fonds de référence saisis, un clair et un sombre | Le plugin ne fabrique pas de rampe neutre |
| D9 | Les emplois forment une table fixe, celle de l'architecture, commune à toutes les palettes | Le designer voit quel cran sert à quoi et si la promesse tient. Aucune palette ne relie un emploi à un autre cran, et la recette ne porte aucun câblage |
| D10 | La recette rangée dans le fichier Figma fait autorité ; le JSON exporté en est une copie | Un import de JSON est un geste explicite, précédé de l'écart |
| D11 | Les couleurs produites sont des hexas sRGB à 8 bits par canal | Chaque contraste et chaque distance se calcule sur l'hexa, jamais sur le flottant |
| D12 | Les profils se nomment `soft` et `vivid`, comme dans l'architecture | La recette, le moteur et la planche emploient ces deux noms. Aucune recette n'était rangée quand le nom a changé : la lecture n'a pas de migration pour `subtle` |
| D13 | Une partie commune aux deux plugins est extraite dans un paquet privé, avant le squelette du plugin Palettes : build, manifest, tests communs, fenêtre, feuille de style, composants, en-tête à bouton de configuration et banc de galerie | Le plugin Palettes naît sur le socle, sans copie à remplacer. L'extraction ne change ni le DOM ni les styles calculés de l'interface d'UCM Exporter |
| D14 | Tous les textes destinés au designer sont dans un seul module de l'interface | Les textes provisoires se remplacent d'un geste quand le mainteneur les a validés |
| D15 | Une palette s'identifie par `p-` suivi de huit chiffres hexadécimaux, tirés au hasard par l'interface | Le moteur reste sans hasard : il reçoit l'identifiant |

## 4. Questions ouvertes et choix par défaut

L'agent n'attend pas ces réponses : il implémente le défaut, qui reste un
paramètre de la recette.

| # | Question | Défaut implémenté | Où se change le choix |
|---|---|---|---|
| Q1 | Courbes de clarté | Celles de l'architecture | Recette, `courbes` |
| Q2 | Parts de chroma | 0,45 `soft`, 0,95 `vivid` | Recette, `profils` |
| Q3 | Seuil de confusion entre profils | 0,02 en distance Oklab | Recette, `seuils` |
| Q4 | Gamut de fabrication | sRGB, tranché par l'architecture, qui écarte Display P3 | Recette, `gamut`, qui n'accepte que `srgb` |
| Q5 | Fonds de référence | `#F7F7F7` en clair, `#121212` en sombre : le gris de clarté 0,975 et 0,18 | Recette, `fonds` |
| Q6 | Profil vérifié par les promesses | Les deux, `soft` et `vivid` | Aucun endroit : la table des emplois vaut pour les deux profils |
| Q7 | Color shift d'une palette nouvelle | Teinte du préréglage Tailwind, saturation et luminosité à zéro | Réglage de la palette |

Les courbes et les parts de chroma sont des choix visuels : l'architecture les
a fixées en comparant des rampes à l'écran, sans règle qui les impose. Elles se
règlent dans la configuration de la recette, en regardant l'aperçu et la
planche.

## 5. Périmètre

Le plugin fait :

- fabriquer, pour chaque palette, ses quatre rampes ;
- régler le Color shift aux deux bouts, avec un aperçu en direct et des limites qui gardent les garanties tenues ;
- mesurer les contrastes de chaque cran contre les fonds de référence ;
- vérifier les promesses de la table des emplois ;
- signaler les alertes ;
- dessiner un cadre par palette, et le redessiner quand la recette change ;
- ranger la recette dans le fichier, l'exporter et l'importer en JSON ;
- exporter un rapport des vérifications.

Le plugin ne fait pas :

- créer, lire ou modifier une variable ou un style ;
- deviner l'emploi d'une palette ;
- publier vers GitHub ou GitLab ;
- créer ou modifier un composant ;
- écrire hors de la page de la planche, sauf la recette rangée sur le document ;
- juger APCA ou tout autre modèle que le contraste WCAG 2.

## 6. Le moteur de couleur

Le moteur est un ensemble de fonctions pures. Il ne lit ni `figma`, ni le DOM,
ni l'heure, ni le hasard. Les mêmes entrées donnent les mêmes octets dans Node,
dans l'iframe du plugin et dans le sandbox Figma.

### 6.1 Conversions

- `[MOT-01]` Hexa vers sRGB : `#RRGGBB`, `RRGGBB` et `#RGB`, sans casse
  imposée. Un alpha est refusé. La sortie s'écrit toujours `#RRGGBB` en
  majuscules.
- `[MOT-02]` sRGB vers linéaire et retour : fonction de transfert sRGB par
  morceaux, seuil `0.04045` à l'aller, `0.0031308` au retour.
- `[MOT-03]` Linéaire vers Oklab et retour : les matrices de Björn Ottosson,
  telles que `mesurer-recette.mjs` les écrit dans les deux sens. Le moteur est
  leur seul domicile dans le code livré.
- `[MOT-04]` Oklab vers OKLCH : `C = hypot(a, b)`, `H = atan2(b, a)` en degrés,
  ramené dans `[0, 360)`. Sous une chroma de `1e-4`, la teinte vaut 0.
- `[MOT-05]` sRGB linéaire vers Display P3 linéaire : par l'espace `XYZ` au
  blanc `D65`, avec les matrices de CSS Color 4. Cette conversion sert
  uniquement à peindre dans un document `DISPLAY_P3`
  ([section 6.7](#67-peindre-dans-lespace-du-document)).
- `[MOT-26]` Display P3 linéaire vers sRGB linéaire : l'inverse de `[MOT-05]`,
  par les mêmes matrices. Elle sert à relire la couleur d'une pastille posée
  dans un document `DISPLAY_P3` (`[ENT-04]`). Une composante hors de `[0, 1]` est bornée,
  et le résultat dit que la couleur a été ramenée dans le gamut sRGB.

### 6.2 Plafond de chroma

- `[MOT-06]` `plafond(L, H, gamut)` rend la plus grande chroma que le gamut
  porte à cette clarté et cette teinte. Dichotomie sur `[0, 0.5]`, 50
  itérations, tolérance d'appartenance au gamut `1e-6` par composante linéaire.
  La dichotomie rend la première sortie du gamut sur le rayon de chroma. Au
  coin du bleu primaire, le rayon sort avant d'atteindre le coin : `#0000FF`
  porte une chroma de 0,313, et le plafond à sa clarté et sa teinte vaut 0,266.
  Sur les 360 teintes entières aux clartés des deux courbes, aucun rayon ne
  rentre dans le gamut au-delà du plafond. La tolérance donne aussi un plafond
  non nul au noir, 0,02 au plus, sous la courbe sombre.
- `[MOT-07]` Le résultat est mémorisé par clé `L|H|gamut`. La mémoire est bornée
  à 20 000 entrées et vidée au-delà.
- `[MOT-08]` Seul `srgb` est implémenté. Une recette qui demande un autre gamut
  est refusée par la lecture de la recette, pas par le moteur.

### 6.3 Fabriquer un cran

Pour une palette, une intensité, un mode et un cran d'indice `i` :

```text
L  = courbes[mode][i]
w  = poids(L)                       section 6.4
H  = teinte(L)                      section 6.4
Lf = clamp(L + clarte[p] + clarté(w), 0, 1)              [MOT-29], [MOT-30]
q  = clamp(part(intensité) × (1 + saturation(w)), 0, 1)  [MOT-30]
C  = q × facteur(mode, L) × plafond(Lf, H, gamut)        [MOT-28]
rgbLinéaire = oklchVersSrgbLinéaire(Lf, C, H)
rgb8 = round(255 × encoder(clamp(rgbLinéaire, 0, 1)))   par canal
hexa = format(rgb8)
```

- `[MOT-09]` La couleur produite est `rgb8`. Toute mesure en aval part de
  `rgb8`.
- `[MOT-10]` L'arrondi est `Math.round`, demi vers le haut, après bornage.
- `[MOT-11]` Un cran rend aussi `L`, `C`, `H` recalculés depuis `rgb8`. La
  planche affiche ces valeurs, qui sont celles de la couleur produite.
- `[MOT-12]` Sur les rampes communes, avant l'ancrage de `[MOT-17]`, un cran
  clair et un cran sombre de même clarté rendent le même hexa : clair 500 et
  sombre 700 partagent 0,670. L'ancrage peut rompre cette égalité, puisque la
  référence ne remplace qu'un cran par mode.
- `[MOT-13]` Une palette de 44 crans se calcule en moins de 5 ms dans
  l'interface, pour que le Color shift suive le pointeur.
- `[MOT-28]` Les fonds du thème Dark perdent de la part. `facteur` vaut 1 en
  `light` ; en `dark`, il vaut `intensiteDesFondsSombres` (0,30 par défaut)
  jusqu'à la clarté `L50`, puis remonte linéairement en clarté jusqu'à 1 à
  `L400`, et au-delà. `L50` et `L400` sont les clartés Dark des numéros 50 et
  400 de la liste commune ; une liste importée sans 50 prend celle de la
  courbe par défaut des onze nuances. Le facteur se lit sur la clarté que la
  courbe vise. Il vaut pour chaque intensité, et pour les palettes libres par
  leur clarté. La référence exacte garde ses octets (`[MOT-17]`). Les accents,
  400 et au-delà, gardent leur part, et le thème `light` ne change pas.
  `facteurSombre` et `fondsSombresDe` (`packages/couleur`) en sont
  l'autorité.

### 6.4 La teinte d'un cran

La teinte dépend de la clarté, jamais du numéro de cran. En sombre, le cran 50
est sombre et prend la teinte du bout sombre.

La couleur de référence a une clarté `La` et une teinte `Ha`. Elle est le pivot :
à la clarté `La`, la teinte vaut `Ha`, quelle que soit la dérive. Les deux bouts
sont les clartés des numéros 50 et 950 sur la courbe claire, `Lc` et `Ls`, soit
0,975 et 0,270. Lus à ces numéros et non aux extrémités de la liste, ils ne
bougent pas quand treize nuances ajoutent 1000 et 1050 ; une palette libre sans 950 le
calcule par la règle de la luminosité d’un numéro ([conception
W6](../2 Ergonomie/CONCEPTION-NUANCES-ET-FORMAT-3.md#luminosité-dun-numéro)). Le designer règle deux angles signés : `dClair`, la dérive au
bout clair, et `dSombre`, la dérive au bout sombre.

```text
si L ≥ La : u = clamp((L − La) / (Lc − La), 0, 1)    u = 0 si Lc ≤ La
            teinte(L) = normaliser(Ha + dClair × u)
sinon     : v = clamp((La − L) / (La − Ls), 0, 1)    v = 1 si La ≤ Ls
            teinte(L) = normaliser(Ha + dSombre × v)
normaliser(h) = ((h mod 360) + 360) mod 360
```

`u` et `v` sont le poids de la nuance, `w` en section 6.3 : 0 à la clarté du
pivot, 1 au bout, linéaire entre les deux. La teinte n'est que la première des
trois grandeurs du Color shift, qui lisent toutes ce poids (`[MOT-30]`).
`poidsA` (`packages/couleur/src/rampe.ts`) calcule le poids, et `teinteA`
reste l'autorité de la teinte.

- `[MOT-14]` Une clarté hors de `[Ls, Lc]` prend le poids 1 du bout le plus
  proche, pour les trois grandeurs. La courbe sombre descend à 0,18 : ses crans
  50 et 100 prennent `dSombre` entier.
- `[MOT-15]` Une dérive de teinte se borne à `[-90, 90]` degrés. Une dérive
  positive tourne dans le sens des teintes croissantes : du bleu vers le
  violet, du jaune vers le vert. Un décalage de saturation se borne à
  `[-1, 1]`, un décalage de luminosité à `[-0,15, +0,15]`.
- `[MOT-16]` Chaque profil a son propre Color shift, trois grandeurs aux deux
  bouts. Par défaut, `soft` et `vivid` partagent le même
  ([section 12](#12-le-color-shift)). Une palette à une intensité garde les
  deux liés, donc égaux, et sa rampe unique lit celui de `vivid`.
- `[MOT-29]` Une palette peut porter des réglages de teinte, de saturation et
  de luminosité (`reglages`, section 7.1, `[ENT-15]`). Leur départ `S` vaut
  `reglages.depart`, sinon `originale`, quand un réglage du porteur existe ;
  sinon, la référence. Le pivot d'un profil `p` a pour clarté `S.L` et pour
  teinte `S.H + teinte[p]` : `La` et `Ha` ci-dessus sont les siens. Un cran
  lit sa clarté commune `L`. Sa teinte vaut `teinte(L)` autour du pivot de
  son profil, et sa couleur se fabrique à la clarté `L + clarte[p]`, bornée à
  `[0, 1]` ; `facteur` (`[MOT-28]`) lit `L`. Un décalage de clarté translate
  donc la courbe, le pivot et les bouts ensemble : la teinte d'un cran ne
  change pas. Sans réglage, le pivot est la référence et les crans sont ceux
  de la version 4 de la recette, à l'octet. `pivotDe` et `decalageDe`
  (`packages/couleur/src/palette.ts`) en sont l'autorité.
- `[MOT-30]` Le Color shift décale trois grandeurs, avec un réglage par bout.
  Une nuance de poids `w` reçoit le réglage du bout que sa clarté regarde :
  le bout clair quand `L ≥ La`, le bout sombre sinon.

  | Grandeur | Réglage au bout | Effet sur une nuance de poids `w` |
  |---|---|---|
  | Teinte | `d`, en degrés signés | `Ha + d × w`, la section 6.4 |
  | Saturation | `s`, fraction signée de la part du profil | part × (1 + `s × w`), bornée à `[0, 1]` |
  | Luminosité | `c`, décalage de clarté OKLCH | `L + clarte[p] + c × w`, bornée à `[0, 1]` |

  Le poids, la teinte et le facteur des fonds (`[MOT-28]`) se lisent sur la
  clarté `L` que la courbe vise, jamais sur la clarté décalée. « Nuances
  claires » désigne donc les nuances claires des deux thèmes : le 50 du
  thème Light et le 950 du thème Dark prennent le réglage du bout clair. Au
  pivot, le poids est nul et aucune grandeur ne décale la nuance ; le cran
  porteur garde en plus les octets de la référence (`[MOT-17]`). La luminosité
  réglée au bout incline la courbe autour du pivot, là où `clarte[p]` la
  translate : la transformation est affine de chaque côté du pivot et garde
  l'ordre des nuances tant que la limite de `[DER-19]` tient. Une part nulle
  reste nulle sous toute saturation : une palette grise reste grise. Sans
  saturation ni luminosité, les rampes sont celles de la teinte seule, à
  l'octet. `poidsA`, `teinteA` et `fabriquerRampe`
  (`packages/couleur/src/rampe.ts`) en sont l'autorité.
- `[MOT-17]` La couleur de référence ne se recalcule jamais : ses octets
  entrent tels quels dans les rampes de son intensité porteuse, un cran par
  mode : la rampe unique d'une palette à une intensité (`[ENT-14]`), le
  profil porteur d'une palette à deux.
  - Une palette de base Soft ou Vivid (`[ENT-11]`) désigne le profil porteur.
    Sans elle, le porteur que `reglages.porteur` a figé au premier réglage
    (`[ENT-15]`) le désigne. Sans l'un ni l'autre, le classement automatique
    compare la part de la référence (`[MOT-24]`) aux parts **communes** de
    `soft` et `vivid`, au millième : le plus proche la porte, `vivid` à
    égalité. Un gris pur (`[MOT-18]`), de part nulle, est donc porté par
    `soft`. Les parts propres d'une palette
    n'entrent pas dans ce choix : les régler ne fait pas changer la référence
    de profil. Changer les parts communes peut le faire, sauf sous une palette
    de base.
  - Dans chaque mode, le cran porteur est celui dont la clarté de la courbe
    est la plus proche de celle du départ (`[MOT-29]`), la référence sans
    réglage, le plus petit numéro à égalité. Un réglage de luminosité ne
    change donc pas la nuance qui porte la référence. Une référence hors de la courbe prend l'extrémité la plus proche.
    Le numéro peut différer entre `light` et `dark` : `#B00100` est le 700
    clair et le 500 sombre.
  - Le cran porteur prend `rgb8` de la référence, et `L`, `C`, `H` lus sur
    lui. Les autres crans, et l'autre profil au même rang, gardent le calcul de
    la section 6.3. Promesses, alertes, planche et rapport lisent ces rampes
    ancrées ; la teinte suit toujours la section 6.4, pivotée sur le pivot de
    son profil (`[MOT-29]`).
  - L'ancrage garde l'ordre des clartés avant quantification : la clarté de la
    référence est plus proche de son cran que des voisins. Deux crans voisins
    peuvent pourtant partager un hexa quand la courbe a des pas plus petits que
    la précision à 8 bits ; aucune loi ne promet une stricte différence.
    Les pas voisins de la référence sont moins réguliers que ceux de la courbe
    commune. Sur les 39 références colorées de la mesure
    (`packages/couleur/scripts/mesurer-ancrage.mjs`), une marche vers une
    voisine va de 0,044 à 0,159 en ΔEok, pour 0,084 à 0,129 sur la courbe
    commune ; le noir en `light` 950 fait une marche de 0,341. Une promesse peut
    ne plus être tenue après ancrage : le plugin la montre, et ne touche jamais
    la référence pour la faire tenir.

### 6.5 Le préréglage Tailwind

Le préréglage reproduit la dérive des dix-sept rampes colorées de Tailwind. Le
relevé est rangé dans la recette sous `derives` : une paire (teinte du cran 50,
teinte du cran 950) par rampe. Il redonne le tableau 3.3 de l'architecture :

| Teinte au bout clair | Exemples | Dérive totale en fonçant |
|---|---|---|
| 70° à 105°, jaunes et oranges | orange, amber, yellow | -37° à -50°, vers le rouge |
| 120°, vert-jaune | lime | +11°, vers le vert |
| 155° à 180°, verts | green, emerald, teal | -3° à +12° |
| 200°, cyan | cyan | +29°, vers le bleu |
| 235° à 275°, bleus | sky, blue, indigo | +7° à +13°, vers le violet |
| 290° à 320°, violets | violet, purple, fuchsia | -6° à +6° |
| 340°, rose | pink | +21°, vers le rouge |
| 10° à 20°, rouges | rose, red | 0° à +9° |

Calcul pour une couleur de référence `(La, Ca, Ha)`, lue sur le départ `S`
(`[MOT-29]`) : les réglages de la carte ne déplacent pas le préréglage.

```text
d       = dériveTailwind(Ha)          dérive totale, du bout clair au bout sombre
ta      = clamp((Lc − La) / (Lc − Ls), 0, 1)
dClair  = −d × ta
dSombre =  d × (1 − ta)
```

`dériveTailwind(h)` trie le relevé par teinte claire, prend les deux rampes
voisines de `h` sur le cercle et interpole linéairement leur dérive totale
selon la position angulaire de `h` entre leurs teintes claires. La dérive totale
d'une rampe est `écart(clair, sombre)`, avec
`écart(a, b) = ((b − a + 540) mod 360) − 180`. Sur le relevé, cette prédiction se
trompe de 10,4° en moyenne, contre 15,8° pour une teinte constante
(`mesurer-derive-teinte.mjs`).

La dérive totale se répartit entre les deux bouts selon la position de la
couleur de référence dans la rampe. Une référence claire reçoit presque toute la
dérive du côté sombre, une référence foncée du côté clair.

- `[MOT-18]` Une référence dont R, G et B ne diffèrent pas de plus d'une
  unité est un gris pur : un de ses voisins à une unité n'a pas de teinte, et
  la teinte lue ne dit rien de l'intention du designer. Sa part vaut 0
  (`[MOT-24]`), si bien que toutes ses nuances sont des gris purs, dans les
  deux intensités et les deux modes ; la référence garde ses octets à son
  cran (`[MOT-17]`). Le préréglage d'un gris pur rend `dClair = dSombre = 0`.
  Toute autre référence garde sa teinte et son préréglage : `#7C717B`, chroma
  0,020, a une teinte connue à 6° près. `#060605` et `#7F7F80` sont des gris
  purs ; `#0C0A09` (stone-950) et `#F8FAFC` (slate-50) ne le sont pas. Une
  référence terne donne des profils ternes (`[ENT-11]`) : `#6B7280` ne
  produit pas le bleu franc `#0E44F7` que la part commune de `vivid` donnerait
  en `vivid.700`. `estGrisPur` (`packages/couleur/src/palette.ts`) en est
  l'autorité.
- `[MOT-19]` Une seule évaluation de `dériveTailwind`, sur `Ha`. Deux
  implémentations rendent ainsi le même préréglage.
- `[MOT-20]` La recette garde les deux angles retenus et le nom du préréglage
  dont ils viennent, `tailwind`, `constante` ou `libre`. Elle ne garde jamais la
  formule : un relevé modifié ne change pas une palette déjà réglée.
- `[MOT-27]` Un angle et un décalage de saturation se rangent au centième,
  une part de chroma et un décalage de luminosité au millième, arrondis au
  moment où ils sont posés :
  `arrondir(x, n) = signe(x) × round(|x| × 10ⁿ) / 10ⁿ`, symétrique en signe. Le
  préréglage rend la valeur arrondie, et « Libre » se décide en comparant des
  valeurs arrondies. Pour `#1E6FD9`, arrondir les deux angles change un cran sur
  44 : le sombre 200 passe de `#021F63` à `#021F64`.

### 6.6 Contraste et distance

- `[MOT-21]` Le contraste est celui de WCAG 2 : luminance relative
  `0.2126 R + 0.7152 G + 0.0722 B` sur les composantes linéaires de `rgb8`,
  puis `(Yhaut + 0.05) / (Ybas + 0.05)`.
- `[MOT-22]` Une comparaison à un seuil se fait sur la valeur écrite à dix
  décimales (`toFixed(10)`), jamais sur l'affichage. L'affichage tronque cette
  même écriture après la deuxième décimale : 4,499 s'affiche 4,49 et échoue à
  4,5. `Math.floor(x × 100) / 100` rendrait 4,34 pour 4,35. Comparer la valeur
  brute ferait échouer un contraste de 4,5 moins 1e-11, que l'affichage écrit
  4,50. Le moteur
  écrit lui-même la virgule décimale, sans `Intl` ni `toLocaleString`, dont la
  sortie dépend de l'environnement. Un test vérifie que l'affichage et le
  verdict concordent.
- `[MOT-23]` La distance entre deux couleurs est la distance euclidienne en
  Oklab, sur `rgb8`, notée ΔEok.
- `[MOT-24]` La part de chroma d'une couleur est `C / plafond(L, H, gamut)`,
  bornée à `[0, 1]`. Une couleur sans teinte (`[MOT-04]`) a une part nulle : le
  blanc relu porte une chroma de 4e-8 contre un plafond de 2e-7. La part de la
  **référence** d'une palette lit le plafond à sa teinte et à sa clarté bornée
  à l'étendue de la liste de la palette. Près du noir ou du blanc, le plafond
  à sa propre clarté est minuscule : slate-950 `#020617` y vaut 0,458, et
  colorerait les nuances du milieu deux fois plus que la famille slate de
  Tailwind ; bornée à 0,27, sa part vaut 0,218. Une référence dans l'étendue
  garde la part de sa couleur. Un gris pur (`[MOT-18]`) a une part nulle.
  `partDeLaReference` (`packages/couleur/src/palette.ts`) en est l'autorité,
  arrondie au millième (`[MOT-27]`).

### 6.7 Peindre dans l'espace du document

Figma interprète la couleur d'une peinture dans le profil du document,
`figma.root.documentColorProfile`. Le plugin peint donc chaque pastille dans
cet espace, pour qu'elle s'affiche avec l'hexa qu'elle annonce.

| `documentColorProfile` | Ce que le plugin peint |
|---|---|
| `SRGB` | `rgb8 / 255` |
| `LEGACY` | `rgb8 / 255` ; le rapport garde le profil, et aucun message ne s'affiche |
| `DISPLAY_P3` | La couleur `rgb8` convertie en coordonnées Display P3, sans arrondi |

- `[MOT-25]` L'hypothèse de cette table se vérifie dans Figma au lot 6
  ([section 16](#16-recette-dans-figma)). Si elle est fausse, la ligne
  `DISPLAY_P3` peint `rgb8 / 255` et la table se corrige.

### 6.8 Vecteurs de test

Le moteur est livré avec des vecteurs figés dans ses tests. Ceux-ci se
calculent une fois avec une référence indépendante (Color.js ou culori), et la
référence n'entre pas dans les dépendances du paquet.

| Entrée | Attendu |
|---|---|
| `#FFFFFF` | `L = 1`, `C < 1e-4` |
| `#000000` | `L = 0` |
| `#767676` sur `#FFFFFF` | contraste 4,54 |
| `#1E6FD9` | `L ≈ 0,555`, `C ≈ 0,179`, `H ≈ 257,4` |
| `plafond(0.5, h, srgb)` sur 360 teintes | jamais hors gamut, et une chroma supérieure de `1e-3` en sort |
| dérives nulles, 360 teintes, deux profils, deux modes, rampes communes | les dix-neuf promesses de la [section 11.2](#112-promesses-des-emplois) tenues après arrondi |
| gris de clarté 0,975 et 0,180 | `#F7F7F7` et `#121212`, les fonds par défaut |
| tout Color shift, toute référence dans `[Ls, Lc]` | à la clarté `La`, la teinte vaut `Ha`, la part celle du profil et la clarté celle de la courbe |

Un second jeu vient de cette spécification. [`mesurer-recette.mjs`](./mesurer-recette.mjs)
le calcule, angles arrondis au centième (`[MOT-27]`) et contrastes tronqués
(`[MOT-22]`) ; le lot 1 le recalcule avec le moteur avant de le figer :

| Entrée | Attendu |
|---|---|
| Référence `#1E6FD9`, préréglage Tailwind | dérive totale 12,63°, `dClair = -7,53`, `dSombre = +5,11` |
| Même palette, `vivid`, clair 700 | `#0E5DC6`, contraste 5,76 contre `#F7F7F7` |
| Même palette, `vivid`, sombre 200 | `#021F64`, contraste 1,23 contre `#121212` |
| Référence `#F2A900`, préréglage Tailwind | dérive totale -39,63°, `dClair = +10,69`, `dSombre = -28,94` |
| Même palette, `vivid`, sombre 700 | `#C9851B`, contraste 6,11 contre `#121212` |

Ces vecteurs portent sur les rampes communes. Sur les rampes ancrées de
`[MOT-17]`, dans la recette par défaut :

| Entrée | Attendu |
|---|---|
| Référence `#1E6FD9`, préréglage Tailwind | profil porteur `vivid`, à la part de la référence, 0,894 (`[ENT-11]`) ; cran 600 en clair et en sombre, où l'hexa vaut `#1E6FD9` ; clair 700 `#185EC1` |
| Référence `#A0B599` | profil porteur `soft`, cran 400 en clair, 800 en sombre |
| Référence `#B00100` | profil porteur `vivid`, cran 700 en clair, 500 en sombre |
| Référence `#000000` | profil porteur `soft`, cran 950 en clair, 50 en sombre |

## 7. La recette

### 7.1 Contenu

La recette contient tous les nombres qui fabriquent les palettes du fichier.
Deux outils qui la lisent produisent les mêmes hexas.

| Clé | Contenu | Portée |
|---|---|---|
| `formatVersion` | Entier positif, version de la forme de la recette | Fichier |
| `crans` | `[50, 100, …, 950]`, 400 et 950 compris (`[VER-05]`) | Toutes les rampes |
| `courbes` | `light` et `dark`, une clarté par cran | Toutes les rampes |
| `profils` | `soft` et `vivid`, une part de chroma chacun | Toutes les palettes, sauf surcharge |
| `gamut` | `"srgb"` | Fichier |
| `fonds` | `light` et `dark`, un hexa chacun | Contrastes, et texte posé sur un fond plein |
| `seuils` | `texte` 4,5 ; `nonTexte` 3 ; `profilsConfondus` 0,02 ; `palettesProches` 0,05 | Vérifications |
| `derives` | Les dix-sept paires de Tailwind | Préréglage |
| `intensiteDesFondsSombres` | Nombre dans `[0, 1]`, 0,30 par défaut : le facteur de la part des fonds du thème Dark au numéro 50 (`[MOT-28]`) | Toutes les palettes, thème Dark |
| `contenuDesPlanches` | `note`, `usages`, `grilles`, `light`, `dark` : les parties qu'un cadre dessine, toutes vraies par défaut, un thème au moins (`[PLA-28]`) | Planche |
| `palettes` | Une entrée par palette, dans l'ordre d'affichage | Palettes |

La table des emplois n'entre pas dans la recette : elle est fixe, et la
[section 11.2](#112-promesses-des-emplois) la donne.

La recette ne porte pas la planche. L'identifiant de la page et ceux des cadres
dessinés se rangent sous la clé partagée `ucm_palettes/planche`, que l'export
ignore : un dessin écrit ces identifiants, et les ranger dans la recette
changerait son empreinte à chaque dessin.

Une palette porte :

| Clé | Contenu |
|---|---|
| `id` | `p-` suivi de huit chiffres hexadécimaux minuscules, tirés au hasard par l'interface à la création, jamais dérivé du nom |
| `nom` | Texte libre, facultatif. Absent, la palette s'affiche sous son hexa de référence |
| `reference` | L'hexa de la couleur de référence |
| `derive.lien` | `true` quand `soft` et `vivid` partagent le même Color shift, ses trois grandeurs comprises |
| `derive.soft`, `derive.vivid` | La teinte : `clair` et `sombre` en degrés, et `origine`, `tailwind`, `constante` ou `libre`, qui ne mesure que la teinte. Facultatifs (`[MOT-30]`) : `saturation`, `clair` et `sombre` en fraction de la part, dans `[-1, 1]` au centième ; `clarte`, `clair` et `sombre` en décalage de clarté OKLCH, dans `[-0,15, +0,15]` au millième. Un objet absent vaut zéro aux deux bouts ; un objet dont les deux valeurs sont nulles ne se range pas |
| `parts` | Facultatif : `soft` et `vivid`, une part de chroma chacun, qui remplace celle de `partsDesProfils`, et `origine` : `designer` (`[ENT-09]`) |
| `base` | Facultatif : `soft` ou `vivid`, la palette de base qui force le profil porteur (`[ENT-11]`). Absent, le classement automatique décide |
| `crans` | Facultatif : la liste d’une palette libre, 4 à 13 multiples de 50, de 50 à 1050, croissants. Chaque numéro suit les courbes communes. Absent, la palette suit la liste commune |
| `originale` | Facultatif : le code de la référence avant le premier ajustement ou le premier réglage du porteur, en majuscules. Différent de `reference`, sauf sous un réglage du porteur, dont le résultat peut rendre les mêmes octets. Absent, aucun ajustement |
| `intensites` | Facultatif : `1` pour une palette à une intensité (`[ENT-14]`), sans `base`, sans `parts`, sans `crans`, dérive liée. Absent, la palette porte Soft et Vivid |
| `reglages` | Facultatif (`[ENT-15]`) : `teinte` et `clarte`, une valeur par profil, en degrés dans `[-30, 30]` au centième et en décalage de clarté OKLCH dans `[-0,05, +0,02]` au millième ; `part`, la saturation de la référence, donc celle de son profil porteur, dans `[0, 1]` ; `porteur`, le profil porteur figé ; `depart`, la référence d'une palette ajustée avant la version 5. Une palette à une intensité range sous `vivid`. Absent, aucun réglage |

### 7.2 Exemple

```json
{
  "formatVersion": 7,
  "crans": [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
  "courbes": {
    "light": [0.975, 0.95, 0.905, 0.845, 0.76, 0.67, 0.585, 0.5, 0.42, 0.34, 0.27],
    "dark": [0.18, 0.225, 0.275, 0.33, 0.4, 0.49, 0.58, 0.67, 0.76, 0.85, 0.93]
  },
  "profils": { "soft": { "part": 0.45 }, "vivid": { "part": 0.95 } },
  "gamut": "srgb",
  "fonds": { "light": "#F7F7F7", "dark": "#121212" },
  "seuils": {
    "texte": 4.5, "nonTexte": 3, "profilsConfondus": 0.02,
    "palettesProches": 0.05
  },
  "derives": [["rose", 12.422, 12.094], ["red", 17.38, 26.042]],
  "intensiteDesFondsSombres": 0.3,
  "contenuDesPlanches": { "note": true, "usages": true, "grilles": true, "light": true, "dark": true },
  "palettes": [
    {
      "id": "p-3fa2c91e",
      "nom": "Bleu",
      "reference": "#1E6FD9",
      "intensites": 1,
      "derive": {
        "lien": true,
        "soft": { "clair": -7.53, "sombre": 5.11, "origine": "tailwind", "saturation": { "clair": -0.4, "sombre": 0 } },
        "vivid": { "clair": -7.53, "sombre": 5.11, "origine": "tailwind", "saturation": { "clair": -0.4, "sombre": 0 } }
      }
    },
    {
      "id": "p-08b7d4a0",
      "reference": "#F2A900",
      "derive": {
        "lien": false,
        "soft": { "clair": 10.69, "sombre": -28.94, "origine": "tailwind" },
        "vivid": { "clair": 6, "sombre": -35, "origine": "libre" }
      }
    }
  ]
}
```

L'exemple abrège `derives`. La recette par défaut du paquet porte les
dix-sept paires.

### 7.3 Rangement et version

- `[REC-01]` La recette se range par
  `figma.root.setSharedPluginData("ucm_palettes", "recette", json)`. L'espace de
  noms partagé survit à un changement d'identifiant du plugin, entre une
  version de développement et la version publiée.
- `[REC-02]` Le JSON rangé est canonique : clés triées, nombres tels que
  `JSON.stringify` les écrit. Son empreinte est un `FNV-1a` 32 bits sur les
  octets UTF-8 du JSON canonique, écrite en hexadécimal sur huit chiffres. Le
  moteur produit ces octets par son propre encodeur : le sandbox n'a pas
  `TextEncoder`.
- `[REC-03]` La lecture classe la recette avant de l'employer : absente, la
  recette par défaut du paquet est proposée ; `formatVersion` courante, lue ;
  antérieure, illisible, par le refus de `formatVersion` et sans conversion ;
  supérieure, refusée avec un message qui demande de mettre le plugin à jour ;
  illisible, refusée sans écrire.
- `[REC-04]` Un refus de lecture laisse la recette rangée intacte. Le plugin ne
  dessine rien tant que la recette n'est pas lisible.
- `[REC-05]` Une validation de forme précède tout emploi : crans croissants,
  deux courbes de même longueur que `crans`, courbe claire décroissante, courbe
  sombre croissante, clartés dans `[0, 1]`, parts dans `[0, 1]` avec
  `soft ≤ vivid` dans la recette et après les parts propres de chaque
  palette, dérives de teinte dans `[-90, 90]`, décalages de saturation dans
  `[-1, 1]` et de luminosité dans `[-0,15, +0,15]`, sans objet `saturation` ou
  `clarte` aux deux valeurs nulles, seuils strictement positifs, hexas valides,
  identifiants uniques, `crans` qui contient chaque cran de la table des emplois,
  400 et 950 compris (`[VER-05]`). `derives`
  compte au moins deux paires, aux noms uniques, aux teintes dans `[0, 360)`, et
  leurs teintes claires sont distinctes : deux teintes claires égales annulent
  le dénominateur de l'interpolation de `dériveTailwind`. Une clé que la
  version courante ne connaît pas est refusée, `planche` comprise. Une palette
  aux profils liés porte deux Color shift identiques, teinte, saturation et
  luminosité comprises ; chaque origine est l'une de
  celles que la section 7.1 énumère ; `base` vaut `soft` ou `vivid` ; un
  identifiant a la forme `p-` et huit chiffres hexadécimaux. Une palette libre
  porte 4 à 13 numéros, multiples de 50 de 50 à 1050, croissants, et pas de
  `base` ; `originale` est un hexa différent de `reference`. `intensites` ne
  vaut que 1, et refuse à côté de lui `base`, `parts`, `crans` et une dérive
  déliée ; `intensiteDesFondsSombres` est dans `[0, 1]` ;
  `contenuDesPlanches` garde un thème au moins. `reglages` porte au moins
  une teinte, une clarté ou `part`, dans leurs bornes, sans zéro ni objet
  vide ; une clé `soft` ne va qu'à deux intensités ; `porteur` accompagne des réglages à deux intensités sans `base`,
  et jamais `base` ; un réglage du porteur exige `originale` ; `depart`
  exige un réglage du porteur et diffère d'`originale`. La validation ne
  recalcule pas la référence réglée : deux moteurs JavaScript peuvent
  différer au dernier bit, et la recette deviendrait illisible. La version 7
  exige 400 et 950 dans `crans` et ajoute `saturation` et `clarte` au Color
  shift. Une recette d'une version antérieure est refusée sans conversion :
  seul le mainteneur en a rangé, pour ses essais. Un changement de forme
  reprendra sa conversion et ses tests le jour où des recettes seront rangées
  hors de ces essais. La validation rend tous ses refus, chacun avec sa règle
  et le chemin du champ, et ne rédige aucune phrase.
- `[REC-06]` La recette se range automatiquement à la fin de chaque geste :
  relâcher une poignée, valider un champ, créer, dupliquer, réordonner ou
  supprimer une palette. Elle ne se range jamais pendant un glisser. Après
  chaque rangement, le plugin appelle `figma.commitUndo()` : un Ctrl+Z dans
  Figma défait ce rangement seul, sans défaire le dessin qui le précède.
- `[REC-10]` Chaque demande de rangement porte l'empreinte de la recette que
  l'interface a lue. Si la recette rangée a une autre empreinte, parce qu'un
  autre designer ou un Ctrl+Z dans Figma l'a changée, le sandbox refuse et
  l'interface propose « Exporter mes modifications », qui exporte le
  brouillon affiché, puis « Recharger ». Jusqu'à la relecture, les vues
  restent consultables, et rien n'écrit sur la version périmée : aucun
  rangement, aucune génération, ni import ni réinitialisation ; la bannière
  reste en tête. L'interface relit l'état quand sa fenêtre reprend le focus.
- `[REC-11]` Une recette illisible ou future offre trois gestes : exporter la
  recette rangée telle quelle, importer une recette, et repartir de la recette
  par défaut après confirmation.

## 8. Les entrées

### 8.1 Une palette

| Entrée | Forme | Défaut |
|---|---|---|
| Couleur de référence | Hexa, avec le sélecteur de couleur embarqué (`[UI-13]`) | aucun |
| Nom | Texte libre, facultatif | l'hexa de référence |
| Color shift | Teinte, saturation et luminosité aux deux bouts, par profil, dans la carte de la [section 12](#12-le-color-shift) | teinte du préréglage Tailwind, saturation et luminosité à zéro |
| Intensités | « Une intensité » ou « Deux intensités », deux cartes à la création ; des segments « Une · Deux » dans la configuration (`[ENT-14]`) | Une |
| Réglage global | Teinte, saturation et luminosité de toute la rampe, trois curseurs pour Vivid, Soft ou les deux, dans la carte « Réglage global » (`[ENT-15]`) ; la saturation d'un profil est sa part de chroma | aucun réglage, parts de la recette |
| Référence exacte dans | Auto, Soft ou Vivid, dans la carte « Deux intensités » à la création, sous le segment « Deux » dans la configuration (`[ENT-11]`) | Auto |

- `[ENT-01]` Changer la couleur de référence recalcule le préréglage Tailwind.
  Une dérive d'origine `tailwind` suit ce nouveau calcul ; une dérive `libre` ou
  `constante` reste telle quelle, et l'éditeur montre la valeur Tailwind en
  repère.
- `[ENT-02]` Chaque saisie met l'aperçu à jour sans aller-retour avec le
  sandbox : le moteur est inclus dans l'interface.
- `[ENT-03]` Une palette se crée, se renomme, se duplique, se réordonne et se
  supprime dans l'onglet Création. Supprimer une palette ne supprime pas son
  cadre de la planche : l'onglet Palettes montre le cadre comme celui d'une
  palette supprimée, que « Supprimer définitivement » retire (`[PLA-27]`).
- `[ENT-04]` Une palette se crée depuis un code saisi ou choisi au sélecteur
  de couleur ; le plugin ne lit pas la couleur de la sélection Figma. La
  lecture de la peinture d'un calque sert au dessin, qui relit les pastilles
  qu'il a posées : seule une peinture `SOLID` visible et d'opacité 1 se lit,
  et dans un document `DISPLAY_P3` elle se convertit en sRGB (`[MOT-26]`).
- `[ENT-09]` Des parts propres viennent toujours du designer, d'origine
  `designer` : un changement de référence ne les pose ni ne les retire. Sans
  elles, les parts sont celles de `[ENT-11]`. L'alerte « Profils confondus »
  se tait pour une palette sans parts propres dont la référence est sous la
  part commune de `soft` : ses deux profils sont ternes et proches par
  construction. `#78716C` en confondrait dix nuances sur onze.
  `aDesProfilsTernes` (`packages/couleur/src/alertes.ts`) en est
  l'autorité.
- `[ENT-11]` Le profil porteur (`[MOT-17]`) prend la part de la référence
  (`[MOT-24]`), qu'une palette de base le force, que `reglages.porteur` le
  fige ou que le classement automatique le choisisse. On note `p` la part de
  la référence, `s` et `v` les parts communes de `soft` et `vivid`. Quand
  `p < s`, l'autre profil garde le rapport des parts communes : Soft porteur
  donne Vivid à `min(1, p × v / s)`, Vivid porteur donne Soft à `p × s / v`.
  Une référence terne donne ainsi deux profils ternes et distincts. Sinon,
  l'autre profil garde sa part commune, bornée pour que `soft` ne dépasse pas
  `vivid`. Les deux règles se rejoignent à `p = s`. Ces parts se calculent à
  la lecture, au millième, et ne se rangent pas : un changement de référence
  ou de part commune les suit. Des parts propres passent avant elles. Quand la
  référence passe d'un profil à l'autre en Auto, à mi-chemin des parts
  communes, les deux rampes changent d'un coup ; « Référence exacte dans »
  l'évite. Choisir Soft ou Vivid retire les parts d'origine `designer`.
  Revenir à Auto retire `base` : le classement automatique désigne de nouveau
  le porteur. `partsDesProfils` (`packages/couleur/src/palette.ts`) en est
  l'autorité. Quand
  les deux profils se rejoignent, l'alerte « Profils confondus » le dit et
  mène à la carte « Réglage global ». Ce choix, libellé « Référence exacte
  dans », ne paraît qu'avec deux intensités : dans leur carte à la création,
  sous le segment « Deux » dans la configuration. Sous des réglages
  (`[ENT-15]`), son aide dit que le porteur est fixé et qu'en changer
  modifie la référence : choisir l'autre profil pose `base` et récrit la
  référence avec les réglages de ce profil ; Auto retire `base` et fige le
  porteur d'avant, sans changer de couleur.
- `[ENT-14]` Une palette porte une intensité ou deux, au choix du designer à
  la création, « Une » par défaut, et dans la configuration. À une intensité,
  elle a une seule rampe par thème, sans nom de profil : celle que le profil
  porteur forcé donnerait, à la part de chroma de la référence, référence
  exacte à son cran. Elle n'a ni palette de base, ni parts propres, ni
  seconde dérive, et ses tokens n'ont pas de segment de profil :
  `theme.primary.700`. Elle a la carte « Réglage global »,
  sans choix de profil. Passer de deux à une ne demande pas de
  confirmation : la palette garde la dérive et les réglages de son intensité
  porteuse, et perd `base`, ses parts et les réglages de l'autre profil ; la
  référence ne change pas. Passer de une à deux rend Soft et Vivid ; la
  référence garde ses octets et `part`, que son profil porteur prend. Les
  réglages se rangent sous le profil que le classement automatique désigne. Une
  palette libre n'a pas ce choix ; la rendre au modèle la remet à une
  intensité. `intensitesDe` (`packages/couleur`) en est l'autorité : toute
  vue parcourt les intensités qu'elle rend.
- `[ENT-15]` La carte « Réglage global » règle toute la rampe de chaque
  profil. Ses gestes visent Vivid, Soft ou les deux ; « Les deux » déplace
  les deux profils du même écart et s'arrête quand l'un atteint sa borne.
  Chaque curseur s'arrête aussi à la limite dynamique de `[DER-19]`, calculée
  pour la cible choisie : une valeur qui ferait manquer une garantie tenue au
  début du geste n'est pas permise. La
  teinte d'un profil se mesure depuis le départ (`[MOT-29]`), en degrés, de
  −30 à +30. La luminosité décale toute la rampe du profil, de −0,05 à +0,02.
  La saturation d'un profil est sa part (`[ENT-09]`), bornée pour que
  `soft` ne dépasse pas `vivid`. La saturation du porteur est celle de la
  référence : le geste la range aussi dans `reglages.part`, et la référence
  se récrit à cette part, comme un cran de sa rampe. Sans cela, la référence
  garderait sa saturation entre des voisines plus ternes ou plus vives. Une
  part égale à celle du départ ne se range pas : poser la valeur que le
  curseur montrait rend les octets du départ. « Rétablir » et « Reprendre »
  retirent `part` avec les parts du designer. Le premier
  réglage fige le porteur dans `reglages.porteur`, sauf sous une palette de
  base. Un réglage du porteur (sa teinte, sa clarté ou `part`) déplace la
  référence : le geste garde `originale`, puis récrit
  `reference = referenceReglee(S, teinte[P], clarte[P], part)`
  (`packages/couleur/src/reglages.ts`). Aucun geste ne part de la référence
  déjà arrondie : un aller-retour de ±10° rend ses octets. Au premier
  réglage du porteur d'une palette ajustée avant la version 5,
  `reglages.depart` garde sa référence, qui reste le départ, et ses couleurs
  ne changent pas. « Revenir à l'originale » rend l'originale, retire
  `originale`, `depart` et les réglages du porteur, et garde ceux de
  l'autre profil. Un code saisi retire `originale` et tout `reglages`. Les
  gestes et `packages/plugin-palettes/tests/reglages.test.ts` tiennent
  l'égalité de la référence à `referenceReglee`.

### 8.2 Les fonds de référence

- `[ENT-05]` Deux hexas, `fonds.light` et `fonds.dark`, dans la configuration
  de la recette.
  Ils servent de fond de page pour tous les contrastes du mode, de couleur du
  texte posé sur un fond plein (`on-solid`), et de fond aux sections de la
  planche.
- `[ENT-06]` Un fond clair plus sombre que le cran 50 clair, ou un fond sombre
  plus clair que le cran 50 sombre, produit l'alerte « fond hors de la
  courbe » : les contrastes promis par l'architecture supposent le cran 50. La
  clarté du fond se compare à la valeur de la courbe avec une tolérance de
  0,005 : `#121212`, le fond sombre par défaut, a une clarté de 0,1822.

### 8.3 La recette commune

La configuration de la recette règle ce qui touche toutes les palettes :
courbes, parts, fonds du thème Dark, fonds, seuils et contenu des planches. Le bouton en forme d'engrenage
de l'en-tête l'ouvre, comme la configuration d'UCM Exporter, et le même
composant du socle la porte (`[UI-02]`).

- `[ENT-07]` Chaque champ de la configuration affiche le nombre de palettes
  qu'il modifie.
- `[ENT-13]` « Luminosité des nuances » s'ouvre sur le nombre de nuances,
  11 ou 13. Choisir un autre préréglage dit d'abord ce qu'il changerait :
  les numéros ajoutés ou retirés, les palettes dont une nuance gardée change
  de couleur, et le nombre de cadres qui passeraient « À actualiser ». Il
  ne se range qu'à « Passer à N nuances » ; « Annuler » ne range rien. Une
  liste importée se dit « Liste importée ». Au-delà de onze nuances, les
  champs de la table se resserrent pour tenir à la largeur minimale.
- `[ENT-12]` Les Réglages communs se rangent en six cartes : Couleurs de
  fond, Intensités, Luminosité des nuances, puis, repliées, Minimums des
  promesses, Détection des couleurs proches et Contenu des planches
  (`[PLA-28]`). La carte Intensités porte, sous Soft et Vivid, « Fonds du
  thème Dark », un curseur et un champ de 0 à 1 (`[MOT-28]`), qui touche
  toutes les palettes ; « Rétablir » le remet à 0,30 avec les parts. « Rétablir » remet une carte
  aux valeurs de la recette par défaut, sans toucher aux autres cartes ni aux
  palettes : leurs parts propres, du designer ou d'une palette de base
  forcée, restent. Les courbes se rétablissent à celles du préréglage que la liste
  reconnaît ; une liste importée n'en a pas, et « Rétablir » y reste inactif.
  En tête, l'aperçu compact de la palette
  ouverte, dans le thème de son aperçu, donne le résultat Soft et Vivid de ses
  garanties ; sans palette, rien n'est montré à sa place. Le tracé des deux
  courbes précède leur table, et marque d'un ◆ la référence de la palette
  ouverte à la nuance où elle est insérée, à sa propre luminosité. La table
  donne une colonne par nuance, sous son point du tracé, et une ligne par
  thème, Light puis Dark, en champs à la taille du corps de l'interface. Les
  flèches haut et bas d'un champ changent sa valeur de 0,005, de 0,05 avec
  Maj, et chaque pression enregistre. Minimums des promesses et Détection des
  couleurs proches donnent une ligne par seuil : le libellé et son aide à
  gauche, lisibles sans survol, le champ et son unité dans deux colonnes
  alignées d'une ligne à l'autre.
- `[ENT-08]` La liste commune se choisit parmi deux préréglages, 11 ou 13
  nuances, dans les Réglages communs ; une autre liste passe par un import de
  recette. Changer de préréglage garde la luminosité de chaque numéro gardé ;
  un numéro ajouté prend celle du préréglage quand la courbe reste monotone,
  sinon celle de la règle de la luminosité d’un numéro.
- `[ENT-10]` La configuration mesure la garantie des courbes : le cran 600
  tient 3:1 et le cran 700 tient 4,5:1 contre le cran 50 de la même courbe,
  gris, sur 360 teintes, les deux profils et les deux modes, sur les couleurs à
  8 bits. Une courbe qui ne la tient plus produit l'alerte « courbe hors
  garantie », qui nomme le cran, le mode, le profil, la teinte du pire cas et
  son contraste. L'alerte n'empêche ni le rangement ni le dessin. La
  garantie juge les courbes communes : elle n'établit pas les promesses d'une
  palette, dont la référence exacte remplace un cran (`[MOT-17]`). Seules ses
  promesses les établissent.

## 9. Sortie 1 : la planche

La planche dessine chaque palette dans Figma : ses rampes, ses usages et
leurs garanties et ses contrastes. Elle sert à
choisir une nuance, à présenter une palette et à comparer des palettes côte à
côte.

### 9.1 Emplacement et propriété

- `[PLA-01]` La planche vit sur une page dédiée, « Palettes », créée au premier
  dessin. Si une page de ce nom existe déjà sans être celle du plugin, le
  plugin crée « Palettes (UCM) ». Le suivi des cadres est rangé sous la clé
  `ucm_palettes/planche` : sa version, l'identifiant de la page et celui du
  cadre de chaque palette. Sa version est distincte de celle de la recette ;
  un suivi sans version se lit comme la version 1, et un suivi d'une version
  plus récente n'est ni lu ni réécrit. Le manifest déclare
  `documentAccess: "dynamic-page"` : le plugin appelle
  `await page.loadAsync()` avant de lire les enfants d'une page ou d'y écrire.
- `[PLA-26]` Le plugin retrouve d'abord chaque cadre par son identifiant rangé
  (`getNodeByIdAsync`), où que le designer l'ait rangé : section, autre cadre
  ou autre page déplacée par « Déplacer vers la page ». Un cadre ne compte que
  s'il porte encore l'identifiant de sa palette et se possède lui-même. Une
  recherche de secours parcourt ensuite la page de la planche en profondeur
  (`findAllWithCriteria` sur `ucm_palettes/cadre`) pour relever les copies ;
  un second cadre possédé de la même palette se signale aussi comme copie, et
  n'est jamais réécrit. Un cadre dont Figma refuse de lire le nom devient
  illisible, sans faire échouer la lecture.
  Elle ne parcourt toutes les pages qu'au geste « Chercher dans tout le
  fichier » ; l'onglet Palettes annonce cette limite quand un cadre reste
  introuvable. Le plugin charge la page de la planche et celles des cadres
  retrouvés, et aucune autre sans ce geste.
- `[PLA-02]` Un cadre par palette, posé au premier niveau de la page de la
  planche et nommé du nom de la palette ou de son hexa de référence. Chaque
  cadre porte la donnée de plugin partagée `ucm_palettes/cadre`, qui vaut
  l'identifiant de la palette, et `ucm_palettes/proprietaire`, qui vaut l'`id`
  du cadre lui-même.
- `[PLA-03]` Redessiner un cadre le remplace à sa place : même parent, même
  rang parmi ses frères, et la transformation de l'ancien. Dans un parent en
  auto layout, le rang suffit, sauf pour un cadre en position absolue. Le
  plugin n'écrit jamais hors des cadres qu'il possède. Chaque calque qu'il pose
  porte un marqueur. Avant de redessiner, il compte les calques sans marqueur
  que le designer a ajoutés dans le cadre, et demande confirmation en les
  nommant : ces calques disparaissent au dessin.
- `[PLA-04]` Une page supprimée par le designer est recréée au dessin suivant.
  Un cadre que Figma ne connaît plus est « introuvable » : supprimé, ou coupé
  puis collé, ce qui lui donne un nouvel identifiant et fait de lui une copie.
  Sa génération pose un cadre neuf et remplace l'identifiant rangé ; générer
  une autre palette garde son entrée. La page de la planche ne se recrée qu'au
  premier cadre neuf. Un cadre
  que Figma refuse de lire est en « lecture impossible » : son entrée reste
  rangée, et aucune génération de sa palette n'a lieu, pour ne pas poser un
  second cadre à côté du premier.
- `[PLA-05]` Les cadres se rangent de gauche à droite dans l'ordre de
  `recette.palettes`, 200 px entre eux. Un cadre déplacé à la main garde sa
  nouvelle position. Un cadre neuf se pose à 200 px à droite du cadre possédé
  le plus à droite, aligné sur le haut du premier cadre.
- `[PLA-06]` Le geste « Générer sur Figma » porte sur une palette : la palette
  ouverte dans l'onglet Création, ou celle d'une fiche de l'onglet Palettes.
  L'onglet Palettes propose aussi de générer les palettes à actualiser, et
  toutes les palettes. Après une génération, le plugin appelle
  `figma.commitUndo()` : un Ctrl+Z défait cette génération entière, et elle
  seule. Le résultat propose « Afficher dans Figma », qui ouvre la page du
  cadre et le cadre (`setCurrentPageAsync`, puis `scrollAndZoomIntoView`).
- `[PLA-25]` Un cadre dont `ucm_palettes/proprietaire` diffère de son propre
  `id` est une copie faite par le designer. Le plugin la signale en notice et ne
  la réécrit jamais.
- `[PLA-27]` « Supprimer définitivement » retire de Figma le cadre d'une
  palette supprimée, et son entrée du suivi, dans une seule écriture close par
  un seul `figma.commitUndo()` : un Ctrl+Z dans Figma rend le cadre et son
  entrée, et le cadre revient comme celui d'une palette supprimée. Le geste
  ne demande pas de confirmation. Le sandbox ne retire qu'un cadre possédé,
  qui porte encore l'identifiant de sa palette, quand la recette rangée se lit
  et ne contient plus cette palette ; il ne touche jamais une copie. Un cadre
  qui a disparu entre la lecture et le geste fait seulement oublier son
  entrée, sans erreur. Le geste est inactif pendant un conflit
  d'enregistrement, et un suivi d'une version plus récente le refuse avant
  toute écriture.

### 9.2 Le cadre d'une palette

Le cadre répond à la question que le designer se pose en posant un
composant : quelle nuance pour quel usage, et est-elle lisible (récit R1,
maquette W3.6). Chaque thème se lit de haut en bas : les rampes des
intensités de la palette, les usages de chacune dans leurs états, puis les
contrastes nuance par nuance ; la recette dit quelles parties se dessinent
(`[PLA-28]`). L'écran de réglages qui essaie la palette est dans l'onglet Création
(`[UI-14]`).

```text
┌ Bleu ─────────────────────────────────────────────────────────────────────┐
│ Bleu                                                                       │
│ Couleur de référence #1E6FD9 · Vivid · nuance 600                          │
├ Thème Light · fond #F7F7F7 ── filet ─────── ✓ Toutes les garanties tenues ┤
│ Les deux rampes                                                            │
│        50     100    …    600    …    950                                  │
│ Soft   [≈]    [≈]    …    [  ]   …    [  ]    codes sous chaque pastille   │
│ Vivid  [≈]    [≈]    …    [◆]    …    [  ]                                 │
│ ◆ : la couleur de référence exacte. ≈ : Soft et Vivid presque identiques…  │
│ Quelle nuance pour quel usage · Soft, puis la même section · Vivid        │
│                    default           hover             active             │
│ Fonds légers       [Fond léger] 100  [Fond léger] 200  [Fond léger] 300   │
│ surface            ✓ text 700 dessus : 5,34:1 …                            │
│ Textes colorés     Lien coloré 700   …                                     │
│ Fonds pleins · Bordures de champ · Anneau de focus · Séparateurs           │
│ Contrastes, nuance par nuance        une grille Soft, une grille Vivid     │
├ Thème Dark · fond #121212 ── filet ───────────────────────────────────────┤
└────────────────────────────────────────────────────────────────────────────┘
```

- `[PLA-07]` L'en-tête donne le nom de la palette, puis la couleur de
  référence avec son numéro de nuance, et son profil porteur pour une palette
  à deux intensités. Chaque thème ouvre sur son fond et son verdict : « ✓
  Toutes les garanties tenues », ou le nombre de garanties manquées du thème,
  chaque intensité comptée, dans la couleur de danger. La version de la recette, l'empreinte du modèle
  (`[PLA-19]`) et l'espace de couleur du document restent dans les données de
  plugin du cadre et dans le rapport ; aucun texte du cadre ne les imprime. Le
  cadre ne porte pas d'avertissement permanent sur son remplacement : la
  confirmation des calques ajoutés (`[PLA-03]`) le remplace.
- `[PLA-08]` Les mesures de la référence, contrastes avec le blanc, le noir et
  les fonds, luminosité, chroma, teinte, intensité et dérives, ne sont pas sur
  la planche : elles se lisent dans le détail d'une nuance de l'interface et
  dans le rapport (section 10.2).
- `[PLA-09]` La section `light` est peinte de `fonds.light`, la section `dark`
  de `fonds.dark`. Chaque rampe se lit ainsi sur le fond où elle servira. Un
  filet délimite chaque section, visible sur un fond blanc comme sur un fond
  sombre. Les légendes d'un thème prennent l'encre sombre ou claire, celle qui
  s'y lit le mieux ; l'encre seconde s'atténue vers le fond tant qu'elle y
  garde 4,5:1, et la couleur de danger est celle des deux qui s'y lit le mieux.
- `[PLA-10]` « Les deux rampes » ouvre chaque thème : les numéros de nuance,
  puis une rangée Soft et une rangée Vivid, chacune nommée à gauche, sans la
  part de chroma. Une palette à une intensité a « La rampe », une rangée sans
  nom. Chaque pastille porte son code dessous. La nuance qui porte
  la référence exacte montre ◆ dans sa pastille, comme l'aperçu.
- `[PLA-11]` Une note sous les rampes explique ◆, et ≈ quand une pastille le
  porte, ce qu'une palette à une intensité ne connaît pas. La légende des grilles tient en une ligne à droite de leur titre. Ni
  l'une ni l'autre ne nomme un seuil par son nom interne.

### 9.3 Les pastilles des rampes

- `[PLA-12]` Une pastille donne sa couleur et son code. Les rôles d'une nuance
  se lisent dans les usages ; ses mesures, dans le détail d'une nuance de
  l'interface et dans le rapport.
- `[PLA-13]` Un repère posé sur une pastille, ◆ ou ≈, prend le noir ou le
  blanc, celui des deux qui contraste le plus avec elle.
- `[PLA-14]` Le calque de la pastille se nomme `{profil}/{mode}/{cran}`,
  `vivid/light/700` par exemple, sous le cadre de sa palette ; `{mode}/{cran}`
  pour la rampe d'une palette à une intensité. Ce nom permet de
  retrouver chaque couleur dans le panneau des calques, et sert de clé à
  l'option de la [section 17](#17-option-ultérieure--créer-les-variables).
  Aucun autre calque ne porte ce nom : les pastilles des grilles se nomment
  `teinte {cran}`.
- `[PLA-15]` Une pastille où les deux profils se confondent porte ≈, sur tous
  les crans. L'alerte « Profils confondus » ne porte que sur les crans de la
  table des emplois ([section 11.3](#113-alertes)).
- `[PLA-16]` Les textes du cadre sont sélectionnables et copiables : un code
  se copie depuis la planche sans ouvrir le plugin.

### 9.4 Quelle nuance pour quel usage

Une ligne par usage, dans cet ordre : `surface-card`, quand la liste porte
la 50, `surface`, `text`, `solid`, `border-control`, `focus`,
`border-decorative`. `on-solid` n'a pas de ligne :
il se lit sur `solid`. Chaque ligne donne à gauche le nom de l'usage, son rôle
en police de code et ce qu'il habille ; puis une colonne par rang, `default`,
`hover`, `active` et `active-hover`, dans le vocabulaire des composants. L'état avance d'une
nuance. `surface-card`, `focus` et `border-decorative` n'ont que `default` ; l'anneau se lit
« focus · état focus ». Une colonne montre un spécimen peint de la nuance de
l'état, son numéro, puis ses garanties.

| Usage | Spécimen |
|---|---|
| `surface-card` | une carte bordée de `border-decorative`, « Carte » écrit en `text` |
| `surface` | un aplat, « Fond léger » écrit en `text` |
| `text` | « Lien coloré » |
| `solid` | un bouton plein, son libellé du fond du thème |
| `border-control` | un champ bordé |
| `focus` | un champ bordé de `border-control`, cerclé de l'anneau |
| `border-decorative` | un filet |

- `[PLA-17]` Toutes les paires du moteur sont représentées, dans chaque
  thème. Sous un état, une ligne par paire dont il est membre : « sur » son
  second membre quand il est premier, « dessus » son premier membre quand il
  est second, avec ✓ ou ✗, le contraste mesuré et son niveau WCAG
  (`[VER-13]`), dans le même texte. Une paire se lit donc sous
  chacun de ses membres qui a une ligne. Une garantie manquée prend la
  couleur de danger. `border-decorative` n'a aucune promesse, et aucune ligne
  ne lui en invente une.
- `[PLA-18]` Une palette à deux intensités a une section d'usages par
  profil, « · Soft » puis « · Vivid », quel que soit le porteur : deux
  palettes de même configuration donnent deux cadres de même structure,
  quelle que soit la saturation de leur référence. Une palette à une
  intensité a une section, sans nom de profil. Le cadre de Bleu compte
  1 966 calques à deux intensités et 1 008 à une, toutes parties dessinées.
- `[PLA-28]` `contenuDesPlanches` choisit les parties qu'un cadre dessine :
  la note sous les rampes, les usages, les grilles de contrastes, et chaque
  thème, un au moins. L'en-tête et les rampes se dessinent toujours : leurs
  pastilles sont ce que la [section 17](#17-option-ultérieure--créer-les-variables)
  lira. Une partie retirée change l'empreinte du modèle : les cadres générés
  passent « À actualiser ». La carte « Contenu des planches », repliée en
  dernier dans les Réglages communs, porte un interrupteur par partie et le
  nombre de calques qu'elle pèse dans le cadre de la palette ouverte.

### 9.5 Les contrastes, nuance par nuance

Chaque génération les dessine quand `contenuDesPlanches.grilles` le demande
(`[PLA-28]`). Pour chaque intensité de chaque thème, une grille sous une rangée de pastilles, dans les
colonnes des rampes : la ligne donne le fond, la colonne le texte. Une paire
qui atteint le minimum des éléments visibles se peint telle qu'elle se lira :
le fond de sa ligne, le ratio écrit dans la couleur de sa colonne, en gras à
partir du minimum des textes. Une case qui atteint 4,5:1 écrit après son
ratio le niveau qu'un texte courant y atteint, AA ou AAA (`[VER-13]`). En
dessous du minimum des éléments visibles, la case s'efface sur un aplat
neutre. Une nuance ne se compare pas à elle-même. La grille compare librement
toutes les nuances : ses cases ne sont pas des promesses.
### 9.6 Fraîcheur

- `[PLA-19]` Chaque cadre porte la donnée de plugin `ucm_palettes/empreinte` :
  l'empreinte du modèle de planche de ce cadre (`[ARC-07]`) au moment du
  dessin. Elle se calcule sur le modèle privé du texte qui l'affiche dans
  l'en-tête. Une empreinte de la recette entière périmerait tous les cadres dès
  qu'une seule palette change. Le sandbox la range et l'interface la
  recalcule, dans deux moteurs JavaScript dont `**` ne rend pas le même
  dernier bit : les composantes Display P3 du modèle s'arrondissent au
  millionième.
- `[PLA-20]` À l'ouverture et après chaque rangement de la recette, le plugin
  recalcule le modèle de chaque cadre et compare son empreinte à celle du
  cadre. Un écart classe le cadre « À actualiser » dans l'interface, avec le
  geste « Actualiser sur Figma ». Le plugin ne redessine jamais sans ce geste.
  L'état du cadre se distingue du résultat des garanties : un ratio
  insuffisant n'est pas une panne de génération. L'onglet Palettes relit l'état
  à son ouverture, après chaque génération et au geste « Actualiser », pour ce
  que les événements de Figma ne signalent pas. Le cadre ne montre rien des
  autres palettes : les renommer ne le périme pas.

### 9.7 Mise en page et typographie

- `[PLA-21]` Tous les cadres sont en auto layout, trame de 8 px, sans position
  absolue.
- `[PLA-22]` Police Inter, en six styles nommés : titre de palette, 28 px
  demi-gras ; titre de section, 16 px demi-gras ; titre d'usage, 12 px
  demi-gras ; valeur, 11 px normal ; note, 10 px normal ; chiffre, 10 px
  demi-gras, pour les numéros, les verdicts et les garanties manquées. Les styles entrent dans l'empreinte du modèle : en
  changer périme les cadres déjà dessinés. Le plugin charge chaque police par
  `loadFontAsync` avant de créer un seul calque ; un chargement qui échoue
  arrête le dessin, sans cadre à moitié dessiné. Un titre, un code ou un
  résultat n'a pas de largeur fixe : il ne se coupe jamais.
- `[PLA-23]` Les couleurs de l'en-tête, du filet et du danger sont des
  constantes du plugin ; les encres d'un thème s'en déduisent sur son fond.
  Aucune légende ne prend une couleur de la palette : seuls les spécimens et
  les grilles en portent.
- `[PLA-24]` Le dessin se fait palette par palette, avec un message de
  progression. Une génération groupée demande une confirmation au-delà de six
  palettes. Interrompue, elle nomme les palettes déjà générées et celles qui
  attendent ; « Réessayer » reprend à la palette fautive. Elle ne s'annule pas
  en cours de route. Le lot 6 mesure le temps de dessin de douze palettes
  et revoit ce seuil ; au-delà de dix secondes pour douze, le dessin d'une
  seule palette reste le geste par défaut.

## 10. Sortie 2 : la recette et le rapport

### 10.1 La recette exportée

- `[REC-07]` « Exporter la recette » télécharge `palettes.recette.json`, le JSON
  canonique de la [section 7.3](#73-rangement-et-version). Une recette
  illisible ou future s'exporte telle qu'elle est rangée (`[REC-11]`).
- `[REC-08]` « Importer une recette » lit un fichier, le valide, puis affiche
  l'écart avec la recette rangée : palettes ajoutées et retirées, palettes
  modifiées avec leurs champs, palette de base comprise, réglages communs et
  seuils modifiés, un à un. L'écart dit ce que l'import change : les couleurs
  des nuances, le résultat des garanties sans les couleurs, ou les seuls
  signalements de couleurs proches ; puis quels cadres à jour passeraient
  « À actualiser » et lesquels resteraient sans palette. Le designer
  confirme ; l'import remplace la recette rangée et ne redessine rien. Annuler
  ne touche à rien.
- `[REC-09]` La recette exportée se range dans le dépôt du design system. Cette
  étape est manuelle : le plugin n'a pas de réseau.

### 10.2 Le rapport de vérification

- `[VER-01]` « Exporter le rapport » télécharge `palettes.rapport.json` : pour
  chaque palette et chaque mode, chaque cran avec son hexa et ses contrastes,
  chaque promesse avec sa paire, son contraste et son verdict, et chaque alerte
  avec sa mesure.
- `[VER-02]` Le rapport porte l'empreinte de la recette qui l'a produit.
- `[VER-16]` Le rapport porte sa propre version, `formatDuRapport`, distincte
  de celle de la recette. Un champ ajouté la garde ; un champ ou un code
  d'alerte retiré ou renommé la monte. La version 2 ajoute l'ancrage de chaque
  palette (`[MOT-17]`) et le profil de couleur du document, et retire l'alerte
  de la référence plus claire que le bouton. La version 3 ajoute `intensites`,
  1 ou 2, et donne les crans d'une palette à une intensité en une liste par
  mode, sans clé de profil, et son ancrage sans profil. Le rapport garde toutes les
  alertes du moteur, y compris celles que l'interface montre ailleurs que dans
  la liste des messages.

## 11. Les vérifications

Les vérifications portent sur les hexas produits, contre les fonds de
référence de la recette.

### 11.1 Crans

- `[VER-03]` Chaque cran de chaque rampe reçoit son contraste contre le fond de
  référence de son mode, contre le blanc et contre le noir, et le seuil tenu
  contre le fond.
- `[VER-04]` Un cran n'a pas de verdict : seule une paire de la table des
  emplois promet un contraste.

### 11.2 Promesses des emplois

Pour chaque palette, chaque mode et chaque intensité présente, dix-neuf paires,
sur la table des emplois de l'architecture ; dix-sept dans une liste sans 50. `R+1` désigne le cran suivant celui que
l'emploi `R` vise, dans la même rampe : l'architecture fait avancer un état
d'un cran. `on-solid` est le fond de référence du mode.

| Emploi | Cran |
|---|---|
| `solid` | 700 |
| `on-solid` | fond |
| `text` | 700 |
| `surface` | 100 |
| `surface-card` | 50, facultatif |
| `border-control` | 600 |
| `border-decorative` | 300 |
| `focus` | 600 |

| # | Paire | Seuil |
|---|---|---|
| 1 | `text` sur fond | 4,5 |
| 2 | `text` sur `surface` | 4,5 |
| 3 | `text+1` sur `surface+1`, état hover | 4,5 |
| 4 | `text+2` sur `surface+2`, état active | 4,5 |
| 5 | `on-solid` sur `solid` | 4,5 |
| 6 | `on-solid` sur `solid+1` | 4,5 |
| 7 | `on-solid` sur `solid+2` | 4,5 |
| 8 | `border-control` sur fond | 3 |
| 9 | `border-control` sur `surface` | 3 |
| 10 | `border-control+1` sur `surface+1` | 3 |
| 11 | `border-control+2` sur `surface+2` | 3 |
| 12 | `focus` sur fond | 3 |
| 13 | `focus` sur `surface` | 3 |
| 14 | `solid+1` sur fond | 3 |
| 15 | `text` sur `surface-card` | 4,5 |
| 16 | `border-control` sur `surface-card` | 3 |
| 17 | `text+3` sur `surface+3`, état active-hover | 4,5 |
| 18 | `on-solid` sur `solid+3` | 4,5 |
| 19 | `border-control+3` sur `surface+3` | 3 |

Les paires 17 à 19 suivent les seize autres : les numéros 1 à 16, que les
rapports et les tests citent, ne bougent pas.

`surface-card` est la surface d'une carte, jamais le fond d'un bouton : un
bouton soft garde `surface`, et `surface` sur `surface-card` n'a aucun
minimum, comme `surface` sur le fond. L'emploi n'existe, avec les paires 15
et 16, que dans une liste qui porte la 50 : les deux préréglages l'ont. Une
carte a la clarté du fond de page, un peu plus sombre que lui en Dark : elle
se borde de `border-decorative`. L'anneau de focus, au cran de
`border-control`, n'a pas de paire propre sur une carte.

Une palette à deux intensités compte 76 paires : dix-neuf par mode et par
profil, ou 68 dans une liste sans 50. Une palette à une intensité en compte
38, ou 34 sans 50. Les deux
profils partagent leurs clartés, mais pas leur chroma : leurs contrastes
diffèrent un peu, et les composants citent l'un comme l'autre.

Les dix-neuf paires se groupent en dix associations : une association réunit
les paires de même premier emploi et de même second membre. L'état d'une paire
est le décalage le plus grand de ses deux membres, dans le vocabulaire des
composants : `default`, puis `hover` à une nuance, `active` à deux,
`active-hover` à trois.

| Association | Paires | États |
|---|---|---|
| `text` sur fond | 1 | default |
| `text` sur `surface` | 2, 3, 4, 17 | default, hover, active, active-hover |
| `on-solid` sur `solid` | 5, 6, 7, 18 | default, hover, active, active-hover |
| `border-control` sur fond | 8 | default |
| `border-control` sur `surface` | 9, 10, 11, 19 | default, hover, active, active-hover |
| `focus` sur fond | 12 | default |
| `focus` sur `surface` | 13 | default |
| `solid` sur fond | 14 | hover |
| `text` sur `surface-card` | 15 | default |
| `border-control` sur `surface-card` | 16 | default |

- `[VER-05]` Les paires visent les crans 100, 200, 300, 400, 600, 700, 800,
  900 et 950, et la 50 de `surface-card`. `[REC-05]` refuse une recette dont `crans`
  n'en contient pas un, la 50 exceptée : une liste importée sans 50 reste
  lisible, et les paires 15 et 16 ne s'y jugent pas.
- `[VER-06]` Une promesse manquée nomme l'association (section 11.2), le mode,
  l'état, le profil pour une palette à deux intensités, son contraste mesuré et le minimum demandé. L'onglet
  Création la porte sur la ligne de son association, dans la carte des
  garanties (`[UI-09]`), et non dans la liste des messages. Le compte reste
  celui des contrôles évalués, un par paire, mode et intensité. Aucun cran ne se
  propose : la table est commune à toutes les palettes. Le geste mène au
  réglage qui peut agir (section 11.4).
- `[VER-07]` Une promesse manquée n'empêche pas la génération. Le résultat de
  chaque profil se lit dans la carte des garanties (`[UI-09]`) : ✓ quand
  toutes ses promesses sont respectées, sinon le nombre de promesses
  manquées. La tête de la configuration ne porte aucun verdict. Ce
  résultat situe la palette et ses promesses : il ne certifie pas
  l'accessibilité d'une interface.
- `[VER-13]` Le résultat d'une promesse suit le minimum de la recette. Le
  niveau WCAG d'un contraste suit ses critères propres, sur la valeur mesurée
  sans arrondi, et ne s'enregistre nulle part :

  | Contraste mesuré | Texte courant | Grand texte | Éléments graphiques |
  |---|---|---|---|
  | 7:1 et plus | AAA | AAA | minimum 3:1 atteint |
  | de 4,5:1 inclus à 7:1 exclu | AA | AAA | minimum 3:1 atteint |
  | de 3:1 inclus à 4,5:1 exclu | insuffisant | AA | minimum 3:1 atteint |
  | moins de 3:1 | insuffisant | insuffisant | minimum 3:1 non atteint |

  Un couple de couleurs ne dit pas la taille d'un texte : « AA grand texte »
  s'affiche comme un usage possible. Le contraste non textuel n'a pas de
  niveau AAA. Une promesse respectée avec un minimum de texte abaissé à 4 peut
  rester insuffisante pour le texte courant ; les deux résultats s'affichent
  séparément.

  Le plugin et la planche écrivent ce niveau à côté de chaque contraste
  jugé : « AAA », « AA », ou « AA ✗ » sous le premier niveau. Dans le plugin,
  c'est une pastille pleine aux teintes adoucies, verte quand le niveau est
  atteint, rouge sinon ; sur la planche, un texte dans le calque du ratio.
  L'assistance technique lit ce que le badge juge et son résultat : « Texte
  courant : AA atteint, AAA non atteint ». Une paire au minimum des textes se
  juge en texte courant ; une paire au minimum des éléments visibles se juge
  en élément graphique, sans AAA. Le détail d'une nuance et les grilles de la
  planche jugent en texte courant. Les badges suivent les seuils fixes du
  WCAG, jamais les minimums de la recette : une promesse manquée au minimum
  de 6:1 peut porter un badge AA. Sources : critères
  [1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html),
  [1.4.6](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html) et
  [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

### 11.3 Alertes

| Alerte | Mesure | Seuil | Portée |
|---|---|---|---|
| Profils confondus | ΔEok entre `soft` et `vivid`, même cran et même mode, sur les crans de la table des emplois, états `+1` et `+2` compris, hors des fonds du thème Dark atténués (`[MOT-28]`) | `profilsConfondus` | chaque palette du modèle à deux intensités, sauf des profils ternes par construction (`[ENT-09]`) |
| Palettes proches | ΔEok moyen sur les crans 500, 600 et 700, en clair, chaque palette lue sur sa liste, sur les rampes de `[VER-17]` | `palettesProches` | chaque paire de palettes dont les deux listes portent ces trois crans |
| Référence plus terne que `soft` | part de la référence inférieure à la part de `soft` | sans seuil | chaque palette à deux intensités aux parts du designer |
| Fond hors de la courbe | [section 8.2](#82-les-fonds-de-référence) | sans seuil | chaque fond |

- `[VER-17]` « Palettes proches » compare Vivid à Vivid entre deux palettes à
  deux intensités, comme au format 3, et la rampe unique à la rampe unique
  entre deux palettes à une intensité. Entre une palette à une intensité et
  une à deux, la plus petite des distances de la rampe unique à Soft et à
  Vivid l'emporte : la part d'une rampe unique est quelconque, et elle
  ressemble au profil le plus proche d'elle.
- `[VER-08]` Une alerte n'empêche rien. Elle dit ce qui ressemble, manque ou
  change, et mène au réglage qui la lève. La mesure, sa valeur et le seuil se
  lisent dans le détail et dans le rapport. Une référence grise, noire,
  blanche ou hors de l'étendue de la liste ne produit aucun message : une
  palette peut partir de `#000000` ou de `#FFFFFF`. Sans parts du designer, le
  profil porteur a la part de la référence (`[ENT-11]`) : ni « Référence plus
  terne que `soft` » ni la notice « plus vive que `vivid` » ne sonnent.
- `[VER-10]` Une référence plus vive que `vivid` ne produit aucun message : la
  piste de saturation de la carte « Réglage global » porte
  un repère qui situe sa part, et le rapport garde la mesure. La référence exacte n'est jamais décrite comme plus terne
  qu'elle-même ; les nuances autour d'elle peuvent l'être.
- `[VER-11]` « Profils confondus » ne porte que sur les crans de la table des
  emplois, la 50 de `surface-card` exceptée : les deux profils s'y confondent
  sur la plupart des teintes claires, et aucun réglage ne les sépare ; sur la planche, la pastille de toute nuance où les deux profils
  se confondent porte ≈ (`[PLA-15]`). À dérive nulle, sur 360 teintes, l'alerte portée sur tous
  les crans sonne pour 320 teintes, aux crans 50, 100 et 950. Bornée aux crans
  de la table, elle sonne encore pour 249 teintes : `surface` vise le cran 100,
  qui confond les deux profils sur 216 teintes en clair et 39 en sombre.
  L'interface la montre près du réglage d'intensité qui peut la lever : celui
  de la palette quand elle porte ses propres intensités, sinon celui des
  Réglages communs. Les nuances concernées gardent un indice discret dans
  l'aperçu.

### 11.4 Sévérités et messages

| Sévérité | Emploi | Rang dans l'interface |
|---|---|---|
| Blocage | Le plugin ne peut ni enregistrer ni générer : recette illisible ou future, enregistrement refusé, police absente, génération interrompue | Premier, avant toute autre ligne |
| Promesse à corriger | Une paire de la table des emplois n'atteint pas son minimum | Ensuite, signal de danger |
| Point à vérifier | Une mesure franchit un seuil de conception, ou la planche peint une couleur différente de l'aperçu | Ensuite, signal d'avertissement |
| Information | Cadre orphelin, copie de cadre, couleur ramenée dans le gamut sRGB, document Display P3 | Dernier, en couleur secondaire |

Un profil de document `LEGACY` ne produit aucun message : la planche le peint
comme sRGB (section 6.7), et le rapport garde le profil.

- `[VER-09]` Chaque message a trois parties séparées : où, quoi, geste. Il se
  rédige avec la skill `rediger-diagnostics-ucm`, et le modèle de
  `packages/plugin-exporter/src/contract/localisation.ts` sert de patron, sans import.
  Tous les textes destinés au designer sont dans un seul module de l'interface
  (D14).
- `[VER-14]` Chaque groupe de messages porte son titre et son nombre. Une
  sévérité se lit par un texte ou une forme en plus de sa couleur, et un échec
  de promesse pèse plus qu'une alerte. Seul un événement qui demande une
  intervention immédiate s'annonce par `role="alert"` : un blocage, jamais un
  mouvement de poignée.
- `[VER-15]` Le geste d'un message est une cible typée, indépendante de sa
  phrase : réglage global de la palette, Color shift, luminosité commune, fonds,
  intensités communes. Une fonction de présentation la choisit selon la cause
  connue et la portée du réglage ; le lien ouvre et focalise ce réglage, et le
  retour garde la palette, le thème, la nuance choisie et la position de
  lecture.

## 12. Le Color shift

La carte « Color shift » règle la teinte, la saturation et la luminosité aux
deux bouts de la rampe, autour de la couleur de référence (`[MOT-30]`). Elle
montre l'effet sur chaque cran pendant le geste, et ses réglages s'arrêtent
avant de faire manquer une garantie tenue. Elle suit la carte « Réglage
global », qui déplace toute la rampe (`[ENT-15]`), dans la section « Ajuster
la palette » de l'onglet Création (`[UI-12]`). Repliée à l'ouverture, elle
porte dans son en-tête son glyphe, le titre « Color shift » dans les deux
langues, le sous-titre « Nuances claires et sombres, autour de la référence
◆ » et, à droite, un résumé : le préréglage de la teinte, chaque grandeur
réglée, bout clair puis bout sombre, et la synchronisation, « Tailwind ·
Teinte −7,5° / +5,1° · Saturation −40 % / 0 % · synchronisé ».

```text
┌ › ⟋◆⟍ Color shift ─────────── Tailwind · Teinte −7,5° / +5,1° · synchronisé ┐
│       Nuances claires et sombres, autour de la référence ◆                    │
│ [Teinte Tailwind ▾]   ☑ Synchroniser Soft et Vivid              Tout rétablir │
│ [Teinte −7,5° · +5,1°] [Saturation 0 % · 0 %] [Luminosité 0,000 · 0,000]      │
│ +30° ┤                                                                        │
│   0° ┼━━━━━━━━━━━━━━━━━━━━━━━━━━━━◆━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●            │
│      ●╱                                                         ▨ rail        │
│ −30° ┤                                                          ▨ interdit    │
│       50   100   200   300   400   500   600   700   800   900   950          │
│      ▪    ▪    ▪    ▪    ▪    ▪    ▪    ▪    ▪    ▪    ▪   sans Color shift   │
│      ▪    ▪    ▪    ▪    ▪    ▪    ▪    ▪    ▪    ▪    ▪   avec Color shift   │
├────────────────────────────────────────────────────────────────────────────────┤
│ Nuances claires  [ −7,5 ]°  ◂━━━━━━━━●━━━━━━━━▸   ┊ [Tailwind]                 │
│ Nuances sombres  [ +5,1 ]°  ◂━━━━━━━━━━●━━━━━━▸   ┊ [Tailwind]                 │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 12.1 Ce que la carte montre

- `[DER-18]` Trois onglets, Teinte, Saturation et Luminosité, choisissent la
  grandeur que le graphe et les réglettes règlent. Chaque onglet porte les
  deux valeurs de sa grandeur, bout clair puis bout sombre, et une pastille
  quand elle s'écarte de son point de départ : la teinte Tailwind pour la
  teinte, zéro pour les deux autres. L'onglet choisi dure la session. Un seul
  graphe se calcule à la fois.
- `[DER-01]` Un graphe : en abscisse le rang du cran dans la liste de la
  palette, une position régulière par nuance, commune ou libre, de la plus
  claire à gauche à la plus sombre à droite ; en ordonnée le décalage de la
  grandeur choisie, dans son unité : des degrés pour la teinte, un
  pourcentage de la part du profil pour la saturation, un décalage de clarté
  OKLCH pour la luminosité. L'échelle s'élargit par paliers lisibles quand
  les deux valeurs n'y tiennent plus : ±30°, ±45°, ±60° et ±90° ; ±25 %,
  ±50 % et ±100 % ; ±0,05, ±0,10 et ±0,15. Elle reste figée pendant un
  glisser et se réévalue avant ou après le geste : la poignée ne saute pas
  sous le pointeur. Les valeurs extrêmes restent accessibles au clavier et
  au champ numérique. La courbe est une ligne brisée qui passe, à chaque
  position, par le décalage que `[MOT-30]` donne à ce cran. Les positions
  régulières alignent le graphe et les rampes sur les mêmes colonnes. Les
  poignées se posent sur les colonnes des numéros 50 et 950, où se lisent
  les bouts ; une liste qui ne porte pas l'un d'eux pose sa poignée au bord,
  du côté de son bout. Le graphe se redessine à la largeur mesurée de sa
  colonne, une fois par image au plus : ses textes, ses traits, ses
  poignées, son pivot et sa hauteur gardent la taille qu'ils ont dans la
  fenêtre minimale, et seules ses colonnes s'étirent. Replié, il ne se
  redessine pas ; il relit sa largeur à l'ouverture.
- `[DER-02]` Le pivot est un losange sur la ligne zéro. L'abscisse est celle
  de la courbe claire, sur laquelle les deux bouts se définissent : le graphe
  ne change pas avec le thème de l'aperçu. Pour le profil porteur
  (`[MOT-17]`), le pivot tombe sur la colonne de la nuance qui porte la
  référence en Light, la ligne y passe à zéro, et son infobulle nomme la
  couleur de référence, son profil et sa nuance dans chaque thème. Pour
  l'autre profil, il se place entre les deux rangs qui encadrent la clarté
  de la référence, par interpolation linéaire, et son infobulle dit la
  teinte fixe sans désigner de pastille égale à la référence. Chaque courbe
  passe à zéro par le pivot de son profil (`[MOT-29]`) : un réglage global
  ne déplace pas la courbe de l'autre profil. La référence reste fixe
  pendant le déplacement des poignées.
- `[DER-03]` Deux poignées rondes aux bouts de la courbe portent le réglage
  de chaque bout. Leur étiquette donne la valeur signée, et pour la teinte la
  teinte absolue qui en résulte. Chaque poignée glisse sur un rail vertical,
  hachuré au-delà de la limite de `[DER-19]`.
- `[DER-04]` Sous le graphe, deux rampes du profil réglé, alignées sur les
  colonnes, dans le thème de l'aperçu : la rampe sans Color shift, puis la
  rampe avec, nommées « sans » et « avec » dans la marge des graduations.
  Quand les profils sont synchronisés, celles du profil porteur. Les deux se
  mettent à jour pendant le geste.
- `[DER-05]` Quand `soft` et `vivid` ont des réglages distincts, le graphe
  trace deux courbes de deux motifs de trait, plein et tireté, chacune avec
  le nom de son profil, pour rester lisibles sans la couleur. Chaque poignée
  porte l'initiale de son profil. Synchronisés, les deux profils partagent
  une courbe, tracée pour le profil porteur.
- `[DER-06]` Sur chaque réglette de teinte, un repère fin marque la valeur du
  préréglage Tailwind, même quand la teinte est personnalisée. Le designer
  voit ainsi l'écart avec Tailwind sans changer de préréglage.
- `[DER-17]` La carte ne redit pas le résultat des garanties : la carte des
  garanties le porte (`[UI-09]`), et le pied de l'onglet le résume
  (`[UI-18]`).

### 12.2 Ce que le designer fait

- `[DER-07]` Glisser une poignée verticalement change sa valeur au pas de la
  grandeur : 1°, 1 % ou 0,005. Maintenir Maj arrondit au grand pas : 5°, 5 %
  ou 0,02. La poignée ne se déplace pas horizontalement.
- `[DER-08]` Chaque bout a aussi un champ numérique et une réglette
  (`[DER-21]`), liés au graphe dans les deux sens. Le champ accepte une
  décimale pour les degrés et le pourcentage, trois pour la luminosité, la
  virgule et le point.
- `[DER-09]` Au clavier, une poignée ou une réglette qui a le focus avance
  d'un pas avec les flèches, d'un grand pas avec Maj et les flèches. Origine
  et Fin vont aux bornes permises (`[DER-19]`). À côté de chaque champ, un
  bouton « Tailwind » ramène la teinte du préréglage, et « Rétablir » ramène
  zéro pour la saturation et la luminosité. Chaque poignée et chaque
  réglette porte `role="slider"`, `aria-valuemin` et `aria-valuemax` aux
  bornes permises, et une `aria-valuetext` qui donne la valeur et la plage
  sûre, avec la teinte absolue pour la teinte.
- `[DER-10]` Un double-clic sur une poignée ramène sa valeur Tailwind pour la
  teinte, zéro pour les deux autres grandeurs.
- `[DER-11]` Le menu du préréglage ne règle que la teinte : « Teinte
  Tailwind », « Teinte constante » (les deux dérives de teinte à 0), et
  « Personnalisé » dès qu'une valeur s'écarte du préréglage choisi. Choisir
  un préréglage remplace les deux dérives de teinte du profil affiché, ou
  des deux profils quand ils sont liés. « Tout rétablir » rend la teinte
  Tailwind, et la saturation et la luminosité à zéro, aux deux bouts.
- `[DER-12]` La case « Synchroniser Soft et Vivid » est cochée par défaut. La
  décocher garde le Color shift courant dans les deux profils, puis montre
  le sélecteur du profil dont on règle les poignées. La recocher copie les
  trois grandeurs de `vivid` dans `soft`, après confirmation si leurs
  valeurs diffèrent ; l'annulation laisse les deux profils intacts.
- `[DER-13]` Tout changement se lit dans l'aperçu en moins d'une image
  (`[MOT-13]`). Il se range au relâchement de la poignée ou à la validation du
  champ, jamais pendant le glisser (`[REC-06]`). Ctrl+Z, ou Cmd+Z sur Mac,
  annule le dernier réglage du Color shift quand le focus est dans la carte,
  hors d'un champ texte, quelle que soit sa grandeur. La pile garde
  cinquante réglages, sans rétablissement.

### 12.3 Les limites

- `[DER-19]` Une valeur est permise quand chaque promesse tenue au début du
  geste reste tenue, dans chaque mode et chaque intensité que le geste
  touche, et, pour la luminosité, quand deux nuances voisines gardent 0,01 de
  clarté d'écart. La
  limite est l'intervalle autour de la valeur courante où cette règle tient,
  borné par les bornes fixes de `[MOT-15]` et balayé au pas de la grandeur.
  Une promesse manquée au début du geste ne borne rien : le designer peut la
  réparer, et une promesse réparée entre dans la règle au geste suivant. Une
  palette libre n'a pas de promesse : l'ordre des nuances borne seul sa
  luminosité. `limiteDynamique` (`packages/couleur/src/limites.ts`) en est
  l'autorité. Elle reçoit une fonction qui rend la palette candidate pour une
  valeur : le Color shift et le réglage global (`[ENT-15]`) lui passent
  chacun la leur.
- `[DER-20]` Chaque borne porte sa cause : la première promesse tenue au
  départ qui manquerait un pas au-delà, avec son contraste et son minimum, ou
  l'ordre des nuances. La limite se calcule sur l'état du début du geste : à
  l'ouverture de la carte, au changement d'onglet, au relâchement. Pendant un
  glisser, elle reste figée comme l'échelle du graphe. Une limite se croise
  avec les autres : une luminosité posée en butée resserre la teinte et la
  saturation du même bout. Une limite prend 24 ms en moyenne dans Node et
  jusqu'à 53 ms (`mesurer-limites.mjs`) : son calcul s'étale entre les images,
  `balayerLaLimite` rendant la main après chaque candidate, et un geste qui
  commence avant la fin du calcul le termine d'abord
  (`src/ui/calculDesLimites.ts`).
- `[DER-21]` Une réglette par bout suit le graphe. Sa piste est peinte par le
  moteur : la couleur que le bout prendrait pour chaque valeur, à la clarté
  du bout. Au-delà de la limite, la piste est hachurée, et le pouce s'arrête
  sur la borne. Un glisser ou une saisie au-delà d'une borne pose la borne.
- `[DER-22]` Sous les réglettes, une ligne fixe (`[UI-17]`) garde sa place
  vide : les hachures de la piste montrent la plage sûre, et le curseur
  l'annonce à l'assistance technique. Quand un geste pose une borne, la ligne
  en nomme la cause jusqu'au geste suivant : « Luminosité, nuances claires :
  limite atteinte à −0,050. Au-delà, text 700 / surface 100 (Soft, Light)
  tomberait à 4,44:1, sous 4,5:1. » ; pour l'ordre, « Au-delà, deux nuances
  voisines se rapprocheraient à moins de 0,01 de luminosité. »
- `[DER-23]` Le plugin ne ramène jamais une valeur rangée dans sa limite sans
  le geste du designer. Un réglage global, un réglage commun, un changement
  de référence ou un import peut resserrer la plage : la valeur reste en
  place, son pouce se lit hachuré, et la ligne de `[DER-22]` dit
  « Nuances sombres hors de la plage sûre : un autre réglage l'a
  resserrée. ». Un bout est hors de sa plage quand une garantie qu'il fait
  manquer serait tenue à sa valeur de départ, la teinte Tailwind ou zéro.
  Une garantie manquée s'affiche comme toute garantie.

### 12.4 Cas limites

- `[DER-14]` Une référence plus claire que le bout clair n'a pas de segment
  clair : la poignée claire et les réglettes du bout clair sont masquées,
  pour les trois grandeurs, et une note dit pourquoi. Même règle au bout
  sombre. La note se tait sous une palette grise (`[DER-15]`).
- `[DER-15]` Une palette grise désactive la teinte et la saturation : aucune
  nuance calculée, hors du cran de la référence, n'a de couleur, dans chaque
  intensité et chaque mode, et une part nulle reste nulle (`[MOT-30]`). Les
  onglets Teinte et Saturation se désactivent, et la luminosité reste
  réglable. La note dit « Cette palette est entièrement grise : teinte et
  saturation ne se voient pas. La luminosité reste réglable. ». La piste de
  teinte de la carte « Réglage global » suit la même condition. Une
  référence terne garde les trois grandeurs : `#7C717B` se règle. Une
  saturation du designer qui colore la rampe d'un gris pur rend la teinte
  réglable. Une teinte rangée garde son « Tailwind » actif, même sur une
  palette devenue grise. `estPaletteGrise` (`packages/couleur/src/palette.ts`)
  en est l'autorité.
- `[DER-16]` La largeur minimale de la fenêtre garde les onze positions du
  graphe lisibles : 24 px par cran au moins, repères compris ; 36 px à
  500 px.
- `[DER-24]` Une palette à une intensité n'a qu'un profil, sans
  synchronisation ni choix du profil. Sous des profils déliés, le profil
  réglé se choisit, le graphe trace l'autre en tireté, et la limite ne juge
  que le profil réglé.

## 13. L'interface

### 13.1 Fenêtre et onglets

- `[UI-01]` Taille par défaut 770 × 720, minimale 500 × 520, rangée sous une
  clé propre au plugin par la fenêtre du socle. La poignée de
  redimensionnement ne descend pas sous la largeur minimale, et une taille
  rangée plus étroite s'ouvre à 500 px. Une taille rangée égale à un ancien
  défaut, 600, 650 ou 750 × 720, s'ouvre à 770 × 720 ; toute autre taille
  rangée se garde. Le designer peut élargir la fenêtre, et chaque carte suit
  la largeur du panneau. Le geste de la poignée se suit sur le document, au
  plus un message par image, sans lire `buttons` ni compter sur la capture
  du pointeur, que Figma fait perdre en plein geste. Il finit au relâcher,
  ou à la sortie de la fenêtre quand la capture est perdue ; après lui, un
  survol ne redimensionne rien. Le sandbox n'applique qu'une taille qui
  change, et ne range la taille qu'une fois, à la fin du geste.
- `[UI-02]` Deux onglets, **Création** et **Palettes**, et un bouton en forme
  d'engrenage dans l'en-tête, qui ouvre les Réglages communs (section 8.3)
  comme celui d'UCM Exporter ouvre sa configuration. Le code garde les noms
  d'origine : `ongletPalettes.ts` et le panneau `#panneau-palettes` portent
  l'onglet Création, `ongletPlanche.ts` et `#panneau-planche` l'onglet
  Palettes. L'onglet Création ne
  génère rien : la génération appartient à l'onglet Palettes (`[UI-05]`), qui
  montre chaque palette, dans l'ordre de la recette : son nom, ses rampes Soft
  et Vivid dans le thème choisi en tête de l'onglet, sa référence, le résultat
  Soft et Vivid de ses garanties et l'état de son cadre en pastille, avec ses
  gestes. La pastille dit la sévérité : « À jour » sur le fond de succès ;
  « À actualiser » et « Pas encore sur Figma » en avertissement ; « Cadre
  introuvable » et « Lecture impossible » en danger. L'onglet
  propose aussi « Actualiser tout (2 palettes) », qui génère les palettes à
  actualiser et celles qui ne sont pas encore sur Figma, et « Générer tout
  (3 palettes) », au singulier pour une palette. Il range dans une section secondaire l'export et l'import des palettes et réglages et l'export du
  rapport. Chaque palette supprimée dont le cadre reste dans Figma a sa
  carte : son nom, une phrase, « Afficher dans Figma » et « Supprimer
  définitivement » (`[PLA-27]`).
- `[UI-03]` La hiérarchie de l'information de
  [CONTRIBUTING.md](../../../../../CONTRIBUTING.md#la-hiérarchie-de-linformation)
  s'applique, avec les surfaces propres à
  [UCM Palettes](../../../../../CONTRIBUTING.md#les-surfaces-ducm-palettes) : à
  la taille par défaut, la carte « Configuration de la palette » et le haut
  de l'aperçu se lisent sans défiler ; à 500 × 520, le sélecteur de palette,
  le titre de premier rang et la rangée du nom et de la référence. Le reste s'atteint en défilant. Seul le pied de l'onglet Création
  (`[UI-18]`) reste en vue : il couvre la bande du bas de la fenêtre, et la
  page défile jusqu'à dégager ce qu'il cache.
- `[UI-16]` L'interface s'ouvre en anglais, quelle que soit la langue de
  Figma, du navigateur ou du système. Le premier champ des Réglages communs,
  « Language », propose chaque langue du registre sous son nom dans sa propre
  langue : `English`, `Français`. Il reste utilisable sans recette, avec une
  recette illisible ou future, et pendant un dessin. Le choix traduit tout ce
  qui est affiché, résultats et erreurs compris, sans reconstruire un élément
  ni envoyer de demande de rangement, de dessin ou de retrait. Il se range dans
  `figma.clientStorage` sous `ucm-palettes.langue` ; une valeur absente ou
  inconnue donne l'anglais. Un refus du stockage garde la langue pour la
  session et propose de réessayer. La recette, le rapport, les empreintes et
  les textes des planches ne dépendent pas de la langue : les planches restent
  en français.

### 13.2 Écrans

Onglet Création, une palette ouverte :

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [● Bleu marque                            ▾] [Nouvelle palette] [⋯]  │
│   la création s'ouvre ici, en carte, seulement après [Nouvelle …]     │
│ Palette Bleu marque                                                   │
│ ┌ Configuration de la palette ────────────────────────────────────┐  │
│ │ Nom de la palette               Couleur de référence            │  │
│ │ [Bleu marque                ]   [■ #1E6FD9     ]                 │  │
│ │                                 Ajuster la référence            │  │
│ │ Modèle      [Standard|Libre]                                    │  │
│ │ Intensités  [Une|Deux]                                          │  │
│ │ Une variante douce « Soft » et une variante vive « Vivid ».     │  │
│ │ Référence exacte dans  [Auto|Soft|Vivid]                        │  │
│ │ Auto a choisi Vivid                                             │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│ ┌ [Thème Light|Thème Dark] ─────────────────────────── Fond [■] ──┐  │
│ │ ┌ surface peinte du fond du thème ──────────────────────────┐  │  │
│ │ │         50 100 200 300 400 500 600 700 800 900 950        │  │  │
│ │ │ Soft  ┆┆ ■   ■   ■   ■   ■   ■   ■   ■   ■   ■   ■        │  │  │
│ │ │ Vivid ┆┆ ■   ■   ■   ■   ■   ■   ◆   ■   ■   ■   ■        │  │  │
│ │ │       └┘   └─────────┘             └─────────┘            │  │  │
│ │ │  on-solid    surface               solid · text           │  │  │
│ │ │                   └┘         └─────────┘                  │  │  │
│ │ │       border-decorative      border-control · focus       │  │  │
│ │ │ détail de la nuance choisie                                │  │  │
│ │ └────────────────────────────────────────────────────────────┘  │  │
│ │ ◆ Référence : Vivid · nuance 600                                │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│ Ajuster la palette                                                   │
│ Le réglage global déplace toute la rampe. Le Color shift écarte …    │
│ ┌ › ▭ Réglage global ─────────── Aucun réglage · Soft 45 % · … ┐    │
│ ┌ › ◆ Color shift ───────────── Tailwind · Teinte −7,5° / +5,1° ┐   │
│ ┌ ⌄ Garanties de contraste ─────────────────────── Thème Dark ────┐  │
│ │ [Soft ✓ | Vivid ✗ 2]                                            │  │
│ │ réglette : on-solid, onze nuances, arcs de la garantie choisie  │  │
│ │ Textes lisibles                                 minimum 4,5:1   │  │
│ │   text sur surface     700 / 100   800 / 200   900 / 300        │  │
│ │   texte coloré…     ✓ 5,78 AA   ✓ 7,11 AAA  ✓ 8,04 AAA          │  │
│ │ Éléments visibles                                 minimum 3:1   │  │
│ │ border-decorative 300 · séparateur, sans minimum de contraste   │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│ ┌ › Interface de test ─────────────────────── Thème Light · Vivid ─┐ │
├──────────────────────────────────────────────────────────────────────┤
│ ✗ 2 garanties manquées sur 76 · 1 alerte · text 700 / …  [Détails]  │
└──────────────────────────────────────────────────────────────────────┘
```

À 500 × 520, la même disposition tient en largeur : le nom de la palette se
coupe, les noms de profil
restent à gauche des rangées, et les trois colonnes de « Configuration de la
palette » gardent leurs libellés au-dessus des champs.

- `[UI-04]` L'aperçu occupe la largeur utile de sa carte : ses colonnes se
  calculent après les espacements et les bordures réels. La carte n'a pas de
  titre. Son en-tête porte à gauche les onglets Light et Dark ; l'onglet actif
  prend le fond que toutes les bascules à onglets du plugin donnent à leur
  onglet actif, distinct de la carte aux deux thèmes de Figma, et garde
  `aria-pressed`. À droite, la pastille du fond du thème est un bouton : elle
  ouvre le sélecteur de couleur sur ce fond, et une ligne sous le sélecteur
  dit que le fond vaut pour toutes les palettes. La saisie change le réglage
  commun `fonds`, que les Réglages communs montrent aussi. L'étiquette
  accessible du bouton nomme le thème et la valeur. Sous la surface, la ligne
  « ◆ Référence : Vivid · nuance 600 », coupée par une ellipse, nomme le profil porteur et la nuance du
  thème montré ; une palette à une intensité écrit « ◆ Référence : nuance
  600 ». La surface est peinte du fond du thème choisi,
  et ses textes, bordures, sélection et focus prennent des couleurs lisibles
  sur ce fond ; le reste du panneau garde le thème de Figma. Chaque colonne
  porte son numéro de nuance, aligné entre Soft et Vivid. Une pastille
  `on-solid` précède les rampes sur la hauteur des deux rangées : peinte du
  fond du thème, détachée par un contour tireté, elle est la couleur du texte
  posé sur un fond plein.
  Sous les numéros, deux lignes d'accolades à trait fin nomment les rôles.
  Ligne 1 : `on-solid`, `surface` et `solid · text`. Ligne 2 :
  `border-decorative` et `border-control · focus`. Chaque accolade porte le
  nom du rôle en police de code, puis son nom français dessous ; ses plages se
  déduisent de `TABLE_DES_EMPLOIS` et de `decalagesDeLEmploi`. Une accolade ne
  couvre que des nuances de rôle. Un libellé plus large que son accolade
  déborde sur les colonnes libres de sa ligne, sans chevaucher son voisin. Les
  accolades ne se focalisent pas et ne dessinent pas les états.
  La nuance qui porte la référence exacte montre un repère fixe ◆, et la
  sélection d'une nuance est un anneau plein de 2 px de l'encre du fond,
  séparé de la pastille par un liseré du fond ; le focus reste un contour
  tireté. Un clic, Entrée ou Espace ouvre le détail d'une nuance ou de la
  pastille `on-solid` à une place stable, qui peut grandir sans couper le
  texte (`[UI-10]`). Le même geste sur la cellule déjà choisie la relâche et
  referme le détail, et le focus reste sur elle ; le survol signale la
  cible sans déplacer la page. Les flèches, Origine et Fin déplacent le focus ;
  une copie de code est un geste distinct de la sélection.
- `[UI-05]` La génération appartient à l'onglet Palettes. Le premier geste
  d'une fiche dit l'état du cadre : « Générer sur Figma » sans cadre ou pour
  un cadre introuvable, « Actualiser sur Figma » quand le cadre a changé. Un
  cadre à jour ou illisible n'en a pas. Ce geste est le bouton principal de la
  fiche ; suivent « Afficher » quand le cadre est localisé, puis « Modifier ».
  Les trois prennent la taille compacte du bouton du socle, 24 px, comme les
  gestes de la carte d'une palette supprimée. Le geste enregistre la palette
  si un rangement est en attente, puis génère son cadre, grille des contrastes
  comprise : la génération n'a pas d'option. Pendant la génération, les deux
  onglets sont inertes et la progression prend la place de « Générer tout ».
  L'erreur, la confirmation des calques étrangers ou les écarts de peinture se
  lisent en tête de l'onglet Palettes : un nouveau résultat remplace le
  précédent. L'onglet Création n'en montre aucun. « Nouvelle palette » est le
  seul bouton principal de l'onglet Création, et un filet sépare la barre du
  sélecteur et la création de la palette ouverte, à 15 px de chacune.
- `[UI-09]` La carte « Garanties de contraste » suit le Color shift et
  montre le thème que l'aperçu a choisi, qu'elle nomme dans son en-tête.
  Repliée à l'ouverture, comme toutes les cartes repliables de l'onglet, elle
  garde son état pendant la session ; repliée, son en-tête garde le
  résultat des intensités de la palette sur les deux thèmes. Une bascule
  Soft/Vivid choisit le profil affiché ; une palette à une intensité n'en a
  pas, et son résultat s'écrit « Garanties ✓ » ou « Garanties ✗ 2 »
  (`[ENT-14]`). Chaque segment porte le résultat de son profil dans le
  thème montré : ✓, ou ✗ suivi du nombre de contrôles manqués (`[VER-06]`). À
  l'ouverture d'une palette, le profil porteur est choisi. Quand l'autre thème
  a des garanties manquées, une ligne les compte et bascule l'aperçu sur ce
  thème ; « Revenir au thème » ramène au thème d'avant.
  Une réglette montre la case `on-solid`, puis les nuances du profil choisi,
  numérotées, sur le fond du thème. Comme le graphe de la dérive, elle suit la
  largeur de sa colonne sans grandir : le pas des cases se calcule sur la
  largeur mesurée, et les cases, les numéros et les arcs gardent la taille
  qu'ils ont dans la fenêtre minimale. La garantie choisie s'y trace par un arc
  par état, de la nuance du premier membre à celle du second : trait plein en
  `default`, tireté en `hover`, pointillé en `active`, tiret-point en
  `active-hover`. Un arc en échec prend la couleur de danger, et une légende
  d'une ligne nomme les quatre traits.
  La liste donne une ligne par association (section 11.2), dans deux
  encadrés : « Textes lisibles » au minimum texte, « Éléments visibles » au
  minimum non textuel, chacun avec son titre en bandeau et son minimum lu
  dans la recette. Sous le bandeau, les rangs `default`, `hover`, `active`
  et `active-hover` se nomment une fois, en tête de quatre colonnes. Une ligne porte
  la relation (« `text` sur `surface` »), les codes des rôles à la taille du
  texte sur un fond de note, et son nom français, puis chaque état dans sa
  colonne : le spécimen à gauche, les deux numéros comparés (« 700 / 100 »,
  « fond / 700 »), puis le ratio avec ✓ ou ✗ et son badge de niveau
  (`[VER-13]`) sur une seule ligne, « ✗ 21,00 » et « AA ✗ » compris. Sous
  700 px de fenêtre, les colonnes passent de 150 à 92 px, le spécimen passe
  au-dessus des numéros et du ratio, et le nom de chaque état se centre sur
  sa colonne. La ligne choisie prend le fond de survol et une barre de 3 px
  écartée du texte. Une ligne en échec
  porte l'état fautif, son ratio et le minimum, puis le lien vers le réglage
  qui peut agir (`[VER-15]`), « Ajuster la référence » (`[UI-15]`) en
  dernier. La liste se termine par `border-decorative`,
  sans spécimen et sans minimum.
  Une ligne se choisit au clic ou au clavier. Au départ, la première ligne en
  échec est choisie, sinon `text` sur `surface` ; le choix redessine les arcs
  et se conserve au changement de profil. Chaque ligne porte une étiquette
  accessible qui dit la relation, les numéros, les ratios et le résultat. La
  réglette est décorative pour l'assistance technique, et la bascule annonce
  le résultat du profil qu'elle ne montre pas.
- `[UI-10]` Le détail d'une nuance se lit en trois rangs. L'en-tête : une
  grande pastille, « Vivid · 700 » en titre, son code hexadécimal et
  « Copier » ; celui de la référence ajoute « ◆ Votre couleur de référence
  exacte ». Puis chaque groupe dans son encadré, titré en capitales
  discrètes, et OKLCH replié. Dans l'encadré « Sert à », une ligne
  par usage de la nuance : un spécimen, le rôle et l'état (« `solid` ·
  default »), le nom français du rôle, puis la garantie qui le concerne avec le
  numéro du partenaire et son badge (« ✓ sur `surface` 100 : 5,78:1 AA »). Un clic sur la
  garantie la choisit dans la carte des garanties. La pastille `on-solid` a son
  propre détail : le fond de page du thème, `neutral.50` du design system,
  posé en texte sur `solid` 700 à 950, avec les garanties de ces quatre états.
  Une nuance sans rôle a l'encadré « Sans rôle », qui dit qu'aucun rôle du
  modèle ne la vise. Toute nuance porte ensuite l'encadré « Contrastes de la
  nuance » : fond du thème, blanc et noir, chacun avec son ratio et son badge
  de texte courant (`[VER-13]`), puis la mention d'une nuance identique ou
  confondue. Les valeurs OKLCH se replient sous « OKLCH ». Aucun contraste ne
  s'écrit deux fois, et aucun ratio ne s'affiche sans le nom de ce qu'il
  compare.
- `[UI-11]` Le titre de premier rang est « Palette [nom] », avec le nom que le
  sélecteur affiche, seul sur sa ligne ; il suit un changement de nom pendant
  la saisie, sans retirer le focus du champ. Dessous ne se lisent que le refus
  d'un enregistrement et le conflit, avec leurs gestes ; un enregistrement
  réussi ne s'annonce pas. La carte « Configuration de la palette » ouvre la
  configuration, disposée comme la création (maquette Y2.6, P2) : Nom de la
  palette et Couleur de référence (pastille cliquable et code hexadécimal,
  qui prend le reste de sa colonne) en deux colonnes, libellé au-dessus du champ ; puis la rangée Modèle
  (Standard ou Libre) ; puis la rangée Intensités, en segments « Une ·
  Deux » de même facture que le Modèle (`[ENT-14]`) : les deux cartes et
  leurs rampes restent à la création. Sous les segments, l'aide du choix
  pressé, puis sa suite : la part de la
  référence pour une intensité ; pour deux,
  « Référence exacte dans » (Auto, Soft ou Vivid), et en Auto une ligne fixe (`[UI-17]`)
  qui dit le profil que le classement a choisi : « Auto a choisi Vivid ». Soft
  ou Vivid force le profil porteur (`[MOT-17]`). L'erreur d'un code invalide reste sous son champ.
  Sous le code, aligné à gauche et hors du libellé du champ, une ligne fixe
  (`[UI-17]`) dit l'état de la référence. Quand une garantie est manquée,
  dans l'un ou l'autre thème, elle compte les garanties manquées en couleur
  de danger et nomme leur thème, « ✗ 2 garanties manquées en Thème Light »,
  les deux thèmes ensemble quand les deux en manquent, puis « Ajuster la
  référence » ouvre la modale d'ajustement (`[UI-15]`). Sinon, une référence
  ajustée y lit « Ajustée depuis #16A34A · Revenir à l'originale », et une
  référence employée telle quelle « Couleur de référence employée telle
  quelle. ». Quand une garantie manque sur une référence ajustée, la ligne
  ajoute la trace au manque et porte les deux gestes ; à 500 px, le texte se
  réduit et les gestes se coupent, leur nom accessible entier. Une palette
  libre ne compte aucune garantie.
  Libre retire le choix des intensités, dit « Sans rôles ni garanties », et
  montre une puce par multiple de 50, de 50 à 1050, allumée
  quand la palette porte ce numéro. Une puce allumée ne s'éteint pas sous
  quatre numéros ; une puce éteinte ne s'allume pas au-delà de treize. Une
  palette libre n'a ni accolades, ni pastille `on-solid`, ni carte des
  garanties, et chaque bilan de garanties dit « Palette libre · N nuances ».
  Le détail d'une nuance libre ne lui prête aucun rôle. Standard rend la
  liste commune.
- `[UI-12]` Après l'aperçu, le titre de section « Ajuster la palette » et sa
  phrase, « Le réglage global déplace toute la rampe. Le Color shift écarte
  ensuite les nuances claires et sombres de la référence, qui ne bouge
  pas. », précèdent deux cartes repliables de même forme, repliées à
  l'ouverture, qui gardent leur état pendant la session : « Réglage global »,
  sous-titrée « Teinte, saturation et luminosité de toute la rampe », puis
  « Color shift » ([section 12](#12-le-color-shift)). Leur en-tête est un
  bouton : chevron, glyphe (`[UI-19]`), titre et sous-titre, puis un résumé
  aligné à droite, sur une ligne. Le résumé de la première donne les
  réglages de chaque profil, ou « Aucun réglage », puis sa saturation. La
  première porte les segments « Vivid · Soft · Les deux », le ◆ sur le
  profil porteur, une ligne fixe (`[UI-17]`), puis trois rangées : Teinte,
  Saturation et Luminosité, chacune avec sa réglette peinte par le moteur,
  son champ, la teinte absolue après le champ de la teinte, et « Rétablir » ;
  un double-clic sur la piste rétablit aussi. Chaque réglette prend la limite
  de `[DER-19]` pour la cible choisie, avec `reglerTeinte`,
  `reglerSaturation` ou `reglerClarte` comme candidate, ses hachures
  (`[DER-21]`) et sa ligne de butée (`[DER-22]`), sous les réglettes, vide
  sans butée. Les limites ne se calculent que carte dépliée. Les
  Réglages communs restent sans limite : ils touchent toutes les palettes à
  la fois. Un pas au clavier vaut 1°, 1 % ou 0,005, et Maj le multiplie. Sur
  chaque piste, la lettre de l'autre profil situe sa valeur quand un seul
  profil se règle ; sur la piste de saturation, un repère situe la référence
  (`[VER-10]`). La ligne fixe au-dessus des curseurs dit l'effet du réglage
  sur la référence : « Ce réglage ne touche pas la couleur de référence. »
  quand la cible ne la porte pas, « Attention : ce réglage va modifier votre
  couleur de référence. » avant un réglage du porteur, puis « Attention,
  votre couleur de référence a été modifiée. » tant qu'un réglage du porteur
  existe. Une palette grise n'a pas de teinte à régler (`[DER-15]`). Un
  glisser prévisualise une fois par image au plus, la fin du geste range, et
  Échap rend la palette d'avant le geste. Le glisser d'un curseur se suit sur
  le document, comme la poignée (`[UI-01]`) : il continue hors de la piste et
  finit au relâcher. Sous les curseurs, « Le Color shift s'applique ensuite,
  autour de la référence. », puis l'origine des parts, le retour aux parts
  communes et les alertes qui comparent les profils, chacun dans une ligne
  fixe réservée. Une palette à une intensité a cette carte sans segments,
  avec la ligne fixe ; son Color shift n'a qu'un tracé, sans synchronisation
  ni profil à choisir (`[ENT-14]`). Repliée, une carte annonce dans son
  résumé le point à vérifier qui la concerne, des profils confondus par
  exemple. Un lien de message qui vise un réglage déplie sa carte avant de
  focaliser le contrôle. Les deux cartes suivent l'aperçu, avant les
  Garanties de contraste (`[UI-09]`) : la palette se règle avant de se
  juger. L'Interface de test (`[UI-14]`) ferme l'onglet.
- `[UI-17]` Une ligne fixe porte un message sur une ligne de 24 px, qui ne
  change jamais de hauteur. Son texte se coupe par une ellipse ; le texte
  entier est dans `title` et dans le nom accessible. Elle a quatre tons,
  neutre, avertissement, danger et butée, signalés par une icône en plus de
  la couleur (`[VER-14]`). Ses gestes suivent le texte, qui leur cède sa place
  jusqu'à 24 px restés cliquables. Présente même sans message, elle dit alors l'état
  neutre, « Ce réglage ne touche pas la couleur de référence. », ou garde sa
  place vide. Un avertissement et un danger se lisent sur leur fond de
  sévérité. Un clic ouvre le texte entier dans une bulle posée
  par-dessus les cartes, dans la fenêtre du plugin ; Échap, un clic ailleurs
  et le défilement la ferment. L'ouvrir ou la fermer ne déplace aucun
  élément. `src/ui/ligneFixe.ts` en est le composant.
- `[UI-18]` Sous le contenu défilant de l'onglet Création, un pied fixe
  d'une ligne porte le bilan de la palette ouverte : une icône de sévérité,
  le compte des garanties et des alertes, « 76 garanties tenues · aucune
  alerte » ou « 2 garanties manquées sur 76 · 1 alerte », le premier
  message, et « Détails ». Il est fixé au bas de la fenêtre : il reste visible
  à toute position de défilement, pendant un geste compris, et quand le
  contenu est plus court que la fenêtre. « Détails » ouvre au-dessus du pied un volet
  superposé, « Garanties et alertes », qui liste les messages par sévérité
  (section 11.4), chacun avec ses parties et son lien vers le réglage
  (`[VER-15]`) ; Échap et « Fermer » le ferment et rendent le focus à
  « Détails ». Le volet garde sa taille et fait défiler son contenu. Une
  région `aria-live="polite"` du pied annonce le bilan à la fin d'un geste,
  jamais pendant. Un blocage, refus d'enregistrement ou conflit, reste sous
  le titre (`[UI-11]`). Sans palette ouverte, le pied ne paraît pas ; une
  palette libre n'y compte que ses alertes. `src/ui/piedDeLaPalette.ts` en
  est le composant.
- `[UI-19]` Chaque carte titrée porte un glyphe à gauche de son titre : un
  dessin tracé dans un cadre de 44 × 28, affiché en 38 × 24 px, d'un trait de
  1,8, peint des rôles `--texte-second` et `--texte-marque` de la feuille,
  sans couleur de donnée, `aria-hidden`. Le glyphe du réglage global montre
  une rampe translatée, celui du Color shift deux bouts qui pivotent autour
  d'un losange. Les autres cartes titrées en reçoivent un du même style :
  dans l'onglet Création, Configuration de la palette, Garanties de
  contraste, Interface de test et la création d'une palette ; dans les
  Réglages communs, Couleurs de fond, Intensités, Luminosité des nuances,
  Minimums des promesses, Détection des couleurs proches et Contenu des
  planches ; dans l'onglet Palettes, Palettes et réglages. Une fiche ou une
  carte titrée par un nom de palette n'en a pas. `src/ui/glyphes.ts` les
  dessine, d'après la planche des glyphes de la maquette du Color shift.
- `[UI-20]` Pendant un geste, aucun contrôle de l'onglet Création ne se
  déplace, et aucun élément ne change de hauteur. Six règles le tiennent :
  1. chaque avertissement tient sur une ligne fixe (`[UI-17]`), présente
     même sans avertissement ;
  2. son texte entier s'ouvre au clic, dans une bulle superposée ;
  3. le bilan des garanties et des alertes passe dans le pied (`[UI-18]`),
     et son détail dans un volet superposé ;
  4. le résumé d'une carte repliable tient sur une ligne, coupé par une
     ellipse, texte entier au survol et pour le lecteur d'écran ; le titre ne
     se coupe pas ;
  5. un volet ouvert garde sa taille pendant un geste et fait défiler son
     contenu ;
  6. les messages s'annoncent au lecteur d'écran une fois, à la fin du geste.

  L'état du geste se pose à un seul endroit, celui où la prévisualisation et
  la validation passent. Un test d'interface Chromium glisse les curseurs de
  la carte « Réglage global », une poignée et une réglette du Color shift sur
  une palette placée près d'un seuil, relève la position du contrôle à chaque
  image, et échoue au premier pixel d'écart.
- `[UI-14]` L'Interface de test est la dernière carte de l'onglet Création,
  repliée à l'ouverture. Elle montre la palette ouverte, peinte dans le thème
  de l'aperçu, en deux vues qu'une bascule choisit, et la vue choisie dure la
  session. Une palette à deux intensités a une seconde bascule, Soft et
  Vivid, au bord droit de la première, ouverte sur le profil porteur ; une
  palette à une intensité est peinte de sa rampe unique. « Écran » : une page « Membres de
  l'équipe » sur le modèle de Radix Themes, en HTML, avec une navigation dont
  l'entrée active est en `surface`, un encart en `surface`, un tableau dont
  une ligne se choisit, des badges `surface` et `solid`, un champ bordé de
  `border-control` et cerclé de `focus` au focus, une case et un
  interrupteur en `solid`, et trois boutons, sans fond, `surface` et
  `solid`. Le survol et l'appui avancent d'une nuance, texte et fond
  ensemble, et les contrôles se manipulent sans rien enregistrer. « États » :
  une rangée par composant, boutons plein, soft, contour et sans fond,
  champ, lien et badge, et une colonne par état, `default`, `hover`,
  `active` et `focus`, chaque cellule peinte de son état sans survol.
  Chaque couleur vient de la table des emplois. Une palette libre n'a pas
  cette carte. La planche ne porte pas cet écran.
- `[UI-15]` « Ajuster la référence », sous le code ou parmi les réglages
  d'une garantie en échec, ouvre une modale centrée au-dessus du panneau,
  sur un voile assombri : 520 px de large au plus, 16 px de marge à la
  fenêtre, défilante quand la hauteur manque. Le reste de la page est
  inerte, et Tab reste dans la modale. Elle part de la référence rangée.
  En tête, sous le titre, une phrase dit pourquoi ajuster, une idée par
  phrase, sans ratio : « La palette utilise votre couleur telle quelle. En
  Thème Light, elle est trop claire pour les bordures de champ. », avec le
  premier rôle manqué de chaque thème, trop claire en Light, trop sombre en
  Dark. Suivent l'originale et la proposition en grandes pastilles côte à
  côte ; « − » et « + » par pas de 0,01 de la luminosité du profil porteur
  (`[ENT-15]`), de −5 à +2 pas, et entre eux une piste qui peint les
  propositions voisines ; une ligne qui donne la nuance visée, que la
  luminosité ne change pas (`[MOT-17]`) ; le code de la proposition,
  saisissable, qui prend le pas le plus proche ; les garanties
  manquées avant ou après, en tableau (garantie, thème, avant, après et son
  badge), le thème et l'intensité passant en titre de groupe sous 552 px
  de fenêtre ; le bilan de chaque intensité ; puis « Annuler » et
  « Appliquer ». Seul « Appliquer » range : le pas devient la luminosité du
  porteur, comme dans la carte « Réglage global », et
  `originale` garde la référence d'avant le premier réglage. La modale
  s'ouvre au pas de la luminosité rangée. « Annuler », Échap et un clic sur le voile referment sans
  rien écrire. Chaque fermeture rend le focus au lien, ou au code quand le
  lien a disparu. « Revenir à l'originale » rend l'originale et retire le
  champ, avec les réglages du porteur (`[ENT-15]`) ; un code saisi dans la configuration le retire aussi, et une
  notice le dit. Aucun ajustement ne se fait sans le geste du designer.
- `[UI-13]` Aucune couleur ne se choisit dans le sélecteur du navigateur, qui
  s'ouvre en RGB dans Figma. La pastille de la couleur de référence, celle
  de la création, celles des deux fonds des Réglages communs et celle du
  fond de l'aperçu ouvrent le sélecteur embarqué : 232 px sous le contrôle,
  par-dessus le contenu, aligné sur son bord. Il porte une zone de saturation
  et de luminosité, un curseur de teinte, un menu de format et le code, en
  Hex à chaque ouverture ; RGB et HSL donnent trois champs. Aucune opacité.
  Le code a le focus à l'ouverture. Un glisser prévisualise et son relâcher
  enregistre. Pendant un glisser, la zone et le code suivent chaque
  mouvement ; le contrôle reçoit une couleur par image, la dernière, et
  l'onglet ne rend que l'aperçu, repeint en place : garanties, messages,
  intensités, Color shift et interface de test suivent le relâcher, qui range,
  ou l'abandon de l'aperçu, qui rend tout sans ranger. Un aperçu s'abandonne
  par Échap, par la fermeture du sélecteur, après le clic qui l'a refermé,
  ou par la capture du pointeur perdue en plein glisser. Aucun rendu complet
  ne part pendant le geste, même quand le pointeur s'arrête ; une réponse
  du sandbox à un rangement n'y montre qu'un refus. Pendant la saisie d'un fond des
  Réglages communs, seul leur aperçu compact suit : le tracé et la garantie
  des courbes, qui ne lisent pas les fonds, attendent le relâcher, et
  l'onglet Création, caché, se rend au retour. Un code s'enregistre à Entrée
  ou à la sortie du champ, et un code invalide reste dans son champ, marqué,
  sans rien enregistrer. Les
  flèches déplacent la zone de 1 % et la teinte de 1°, dix fois plus avec
  Maj, et chaque pression enregistre. Échap referme et rend le focus au
  contrôle ; un clic ou une tabulation hors du sélecteur le referme. Sur la
  référence, le sélecteur propose les nuances Vivid du thème de l'aperçu ;
  sur un fond, les deux fonds par défaut, le blanc et les deux premières
  nuances Vivid du thème, et une ligne dit que le fond vaut pour toutes les
  palettes. La création ne propose aucune pastille. Tout se calcule dans
  l'interface, sans requête.
- `[UI-06]` Le sélecteur de palette liste chaque palette par son nom ou son
  hexa, avec une pastille de sa référence. À l'ouverture du plugin, aucune
  palette n'est choisie : le sélecteur dit « Sélectionner une palette », le
  menu « … » se cache, et sous le filet se lisent le titre de premier rang
  « Choisissez une palette » et une phrase qui renvoie à la liste et à
  « Nouvelle palette », sans geste propre. Un choix dure jusqu'à la
  fermeture du plugin et ne se range pas. Une palette choisie qui disparaît,
  par un import ou une autre session, ramène à cet état ; une palette
  supprimée ouvre la suivante. Un fichier sans palette montre la création. Sa liste déroulante prend toute la
  largeur libre de sa ligne, et un nom long s'y coupe par des points de
  suspension. « Nouvelle palette » et « … » gardent leur largeur naturelle
  et prennent la hauteur de la liste. « Nouvelle palette » ouvre la création
  sous le sélecteur, dans une carte de même forme que « Configuration de la
  palette » (`[UI-11]`) : Nom de la palette et Couleur de référence (pastille
  et code), puis Modèle (Standard par défaut), puis les deux cartes
  d'intensités, « Une intensité » par défaut ; leurs rampes paraissent dès
  qu'un code se lit, et « Référence exacte dans » dit « Auto choisira
  Vivid ». En Libre, les puces des numéros remplacent les intensités,
  allumées sur la liste commune. Puis, à gauche : « Créer la
  palette » et « Annuler ». Entrée crée ;
  Échap annule quand « Annuler » est offert. Après création, la palette est
  ouverte ; après annulation, le focus revient à « Nouvelle palette ».

Onglet Palettes :

```text
┌──────────────────────────────────────────────────────────────┐
│ 3 palettes             [Thème Light] [Thème Dark] [Actualiser] │
│ ┌ Bleu ──────────────────────────────────── (À actualiser) ┐ │
│ │ Soft  ▪▪▪▪▪▪▪▪▪▪▪                                        │ │
│ │ Vivid ▪▪▪▪▪▪◆▪▪▪▪                                        │ │
│ │ ■ #1E6FD9 ◆ Vivid · nuance 600         Soft ✓  Vivid ✗ 2 │ │
│ │ [Actualiser sur Figma] [Afficher] [Modifier]             │ │
│ └──────────────────────────────────────────────────────────┘ │
│ … une fiche par palette                                       │
│ [Actualiser tout (2 palettes)] [Générer tout (3 palettes)]    │
│ ┌ Ardoise ──────────────────────────── teinte d'avertissement ┐ │
│ │ phrase courte : palette supprimée, cadre resté dans Figma  │ │
│ │ [Afficher dans Figma] [Supprimer définitivement]           │ │
│ └────────────────────────────────────────────────────────────┘ │
│ Informations : cadre introuvable, copie, P3                   │
│ ▸ Palettes et réglages : exporter, importer, rapport          │
└──────────────────────────────────────────────────────────────┘
```

Réglages communs, derrière l'engrenage :

```text
┌──────────────────────────────────────────────────────────────┐
│ ← Retour aux palettes et à la planche     Réglages communs    │
│ Palette ouverte : Bleu · Thème Light      Soft ✓  Vivid ✗ 2   │
│ Soft ▪▪▪▪▪▪▪▪▪▪▪  Vivid ▪▪▪▪▪▪◆▪▪▪▪                           │
│ ┌ Couleurs de fond ─────────── 3 palettes concernées  Rétablir ┐ │
│ │ Fond du thème Light         Fond du thème Dark              │ │
│ │ [■][#F7F7F7]                [■][#121212]                     │ │
│ ┌ Intensités ───────────────── 2 palettes concernées  Rétablir ┐ │
│ │ Intensité Soft  [───●──────] 0,45                           │ │
│ │ Intensité Vivid [────────●─] 0,95                           │ │
│ ┌ Luminosité des nuances ───── 3 palettes concernées  Rétablir ┐ │
│ │ tracé des deux courbes et ◆, une colonne par nuance dessous │ │
│ ┌ › Minimums des promesses  Texte 4,5:1 · Éléments graphiques 3:1 ┐ │
│ ┌ › Détection des couleurs proches   Soft et Vivid 0,02 · …   ┐ │
└──────────────────────────────────────────────────────────────┘
```

### 13.3 États de la galerie

Chaque état a son entrée dans `galerie/etats.cjs`, et un message déclaré dans
`messages.ts` sans état fait échouer le test de la galerie, comme dans UCM
Exporter. Un état que l'interface ne montre pas encore nomme la case du plan
qui le créera.

| État | Ce qu'il montre |
|---|---|
| Premier lancement | Aucune recette rangée, recette par défaut proposée, aucune palette |
| Onglet Création sans palette choisie | « Sélectionner une palette », l'invitation sous le filet, ni menu ni palette |
| Premier lancement, palette créée | La première palette ouverte, recette rangée |
| Création ouverte | La carte de création sous le sélecteur, en P2 : nom et couleur de référence, Modèle, « Une intensité » choisie, « Créer la palette » et « Annuler » |
| Palette à une intensité | La carte « Une intensité » choisie, une rangée par thème sans nom de profil, ni bascule des garanties |
| Palette à deux intensités | La carte « Deux intensités » choisie, « Référence exacte dans » et « Auto a choisi Vivid » dans la carte |
| Palette en saisie | Aperçu à jour, rien de généré |
| Référence Soft | Une référence peu intense, portée par Soft, avec son repère et sa nuance |
| Référence Vivid | Une référence intense, portée par Vivid, nuance différente en Light et en Dark |
| Palette de base forcée | Soft forcé sous « Référence exacte dans » sur une couleur saturée : même code, repère Soft, saturation propre dans « Réglage global » |
| Réglage global, à une intensité | La carte dépliée sans segments, la ligne fixe de l'avertissement, trois réglettes |
| Un profil réglé seul | Soft tourné de 8°, aucun avertissement, la lettre de Vivid sur chaque piste, le repère de la référence |
| Avant un réglage du porteur | Vivid ◆ choisi, l'avertissement avant tout geste |
| Référence modifiée | L'avertissement après le geste, « Ajustée depuis » sous le code, le porteur fixé par les réglages |
| Garanties respectées | Bascule ✓ sur les deux profils, `text` sur `surface` choisie et ses trois arcs |
| Garantie en échec | Bascule ✗ sur le profil, première ligne en échec choisie, arc de danger, lien vers le réglage |
| Garantie de l'autre thème | Ligne qui compte les garanties manquées de l'autre thème, aperçu basculé, « Revenir au thème » |
| Détail de la référence | La nuance de la référence choisie : usages, garanties avec numéros, repère ◆ |
| Nuance sans rôle | « Sans rôle », puis la table des contrastes, fond du thème, blanc et noir, chacun avec son badge |
| Nuance désélectionnée | La nuance choisie recliquée : détail refermé, focus resté sur la pastille |
| Cartes repliées | « Réglage global » et « Color shift » repliées, leur glyphe, leur résumé sur une ligne, un point à vérifier annoncé |
| Fond personnalisé | Un fond saturé peint sous le nuancier, textes et focus lisibles dessus |
| Fond dans le sélecteur de couleur | La pastille du fond ouverte, la mention du fond commun à toutes les palettes |
| Interface de test | L'écran de réglages peint de la palette, aux deux thèmes de l'aperçu |
| Ajuster la référence | La modale après deux pas : originale et proposition, nuance visée, garanties avant et après |
| Référence ajustée | « Ajustée depuis #16A34A · Revenir à l'originale » sous le code |
| Palette libre | Libre pressé, six puces allumées, l’aperçu à six colonnes sans `on-solid` ni accolades, aucune carte des garanties |
| Référence dans le sélecteur de couleur | La pastille de la référence ouverte, les nuances Vivid de la palette proposées |
| Réglages communs | Fonds, intensités, luminosité et groupes repliés, avec le nombre de palettes concernées |
| Réglages communs sans palette | Aucun aperçu en tête, tracé sans ◆, aucune palette concernée |
| Courbe hors garantie | Alerte sous la courbe : cran, mode, profil, teinte du pire cas et contraste |
| Hexa invalide | Le champ de référence refuse la saisie, aperçu inchangé |
| Conflit de sauvegarde | Enregistrement refusé : consultation et export du brouillon possibles, « Recharger » |
| Color shift lié, teinte Tailwind | Onglet Teinte, une courbe, repères Tailwind confondus avec les poignées, ligne de la butée vide |
| Color shift, saturation | Onglet Saturation, échelle en pourcentage, rails hachurés |
| Color shift, luminosité | Onglet Luminosité, échelle en clarté, rampes sans et avec Color shift |
| Color shift en butée | Une réglette posée sur sa borne, la ligne qui nomme la cause |
| Réglage global en butée | Un curseur de luminosité arrêté à sa limite, hachures et cause |
| Color shift délié et personnalisé | Deux courbes, repères Tailwind visibles à l'écart |
| Référence hors de la rampe | Une poignée masquée et sa note, la référence à l'extrémité, aucun point à vérifier |
| Palette désaturée | `#897288` : Soft à la saturation de la référence, Vivid plus vif, dérive réglable |
| Palette très désaturée | `#7C717B` : deux profils distincts, aucun point à vérifier, teinte réglable |
| Palette grise | `#808080` : onglets Teinte et Saturation et piste de teinte désactivés, luminosité réglable, la note et la ligne du gris pur |
| Avertissement long | La ligne fixe la plus longue coupée par une ellipse, sa bulle ouverte, à la taille par défaut et à 500 × 520 |
| Volet ouvert | Le pied et le volet « Garanties et alertes » ouvert sur vingt messages, à la taille par défaut et à 500 × 520 |
| Presque noir | `#060605` : un gris pur, rampes grises, aucun point à vérifier |
| Palette avec points à vérifier seuls | Garanties respectées, points à vérifier sous la carte qu'ils concernent |
| Génération en cours | Progression à la place de « Générer tout », aucun geste possible |
| Génération réussie | La fiche « À jour » sans premier geste, « Afficher » et « Modifier » |
| Titre seul | « Palette [nom] » seul sur sa ligne, un nom long coupé |
| Génération partielle | Palettes déjà créées nommées, palette fautive, reprise possible |
| Génération interrompue | Arrêt nommé, cadre précédent conservé, détail technique replié, « Réessayer » |
| Confirmation au-delà de six palettes | « Générer tout » demande confirmation |
| Onglet Palettes sans palette | Aucune palette à générer, geste vers l'onglet Création |
| Planche à jour | Chaque fiche dit « À jour » |
| Planche à actualiser | Fiches « À actualiser » ou « Pas encore sur Figma », en orange, génération groupée |
| Fiche d’une palette | Disposition A : nom et état en pastille, rampes, référence et garanties sur une ligne, gestes |
| Pastilles des cinq états | « À jour » sur fond de succès, « À actualiser » et « Pas encore sur Figma » en avertissement, introuvable et illisible en danger |
| Contenu des planches | Un interrupteur par partie d’un cadre et par thème, ses calques, l’effet sur le cadre de la palette ouverte |
| Fonds du thème Dark | Le réglage sous Soft et Vivid dans la carte Intensités des Réglages communs |
| Cadre déplacé | Un cadre rangé dans une section ou sur une autre page, retrouvé par son identité |
| Palette supprimée | Une carte par cadre resté dans Figma, teinte d'avertissement, « Supprimer définitivement » |
| Copie de cadre | Information, la copie n'est pas réécrite |
| Calques étrangers | Confirmation avant génération, qui nomme les calques ajoutés |
| Document Display P3 | Information de conversion |
| Recette future | Refus, demande de mise à jour du plugin, trois gestes de sortie |
| Recette illisible | Refus sans écriture, trois gestes de sortie |
| Import invalide | Erreurs de forme, palettes et réglages intacts |
| Import avec différences | Palettes et valeurs modifiées, conséquence sur la planche, confirmation |
| Police indisponible | Blocage, aucun cadre posé |

### 13.4 Messages

- `[UI-07]` `messages.ts` déclare les deux sens de la frontière. L'interface
  envoie des demandes : lire l'état, ranger la
  recette, dessiner une palette ou toutes, importer, voir sur la planche,
  retirer le cadre d'une palette supprimée, redimensionner, lire et ranger la
  langue (`[UI-16]`). Le sandbox envoie
  l'état (recette rangée, profil du document, état de chaque cadre), la
  la progression et les résultats. Un message entre dans `messages.ts` au lot qui le met en scène
  dans la galerie.
- `[UI-08]` Chaque résultat porte le numéro de la demande qui l'a produit.
  L'interface écarte un résultat plus ancien que la dernière demande du même
  geste.

## 14. Architecture du code

### 14.1 Les paquets

```text
packages/kit/src/emplois/        @ucm-kit/core/emplois, publié         [ARC-01]
                                   emplois, dix-neuf paires, rangs, table des états, contraste WCAG

packages/couleur/                ucm-couleur, privé, le moteur pur    [ARC-01]
  src/conversions.ts               hexa, sRGB, linéaire, Oklab, OKLCH, P3
  src/plafond.ts                   plafond de chroma, mémorisé
  src/rampe.ts                     cran, teinte pivotée, rampe entière
  src/tailwind.ts                  le préréglage et son relevé
  src/contraste.ts                 contraste WCAG, ΔEok, part de chroma
  src/promesses.ts                 le jugement des dix-neuf paires sur les rampes
  src/limites.ts                   la limite dynamique d'un réglage et sa cause
  src/alertes.ts                   les alertes de la section 11.3
  src/recette.ts                   forme, validation, classement, recette par défaut
  src/empreinte.ts                 JSON canonique, encodeur UTF-8 et FNV-1a
  src/index.ts                     la porte du paquet, lue en source

packages/plugin-socle/           privé, extrait avant le squelette    [ARC-02]
  build/inline-ui.cjs              du bundle et du CSS à un HTML autonome
  build/manifest.cjs               le manifest de distribution
  build/run-tests.cjs              le découvreur de tests
  ui/socle.css                     échelle de texte, trame, rôles de couleur, replis sombres
  ui/composants/                   Bouton, Onglets, Interrupteur, PoigneeDeRedimensionnement, En-tête
  fenetre.ts                       taille bornée, rangée dans clientStorage
  galerie/                         le banc d'états : build, captures, décalque du thème Figma
  tests/                           les lois communes : styles et DOM, gabarit, manifest

packages/plugin-palettes/        le plugin UCM Palettes              [ARC-03]
  manifest.json
  src/code.ts                      routage des demandes de l'interface
  src/messages.ts                  les deux sens de la frontière sandbox et interface
  src/planche/modele.ts            de la recette calculée à l'arbre de cadres à dessiner, pur
  src/ecriture/planche.ts          dessine un modèle de planche dans la page
  src/ecriture/recette.ts          range la recette dans le fichier
  src/lecture.ts                   la recette rangée, la page, les cadres, la couleur sélectionnée
  src/navigation.ts                la page courante, le cadrage et la sélection
  src/ui/                          l'interface
  src/ui/textes.ts                 tous les textes destinés au designer
  src/ui/derive/                   le Color shift : onglets, graphe, poignées, réglettes
  src/ui/ligneFixe.ts              la ligne d'un message, de hauteur fixe, et sa bulle
  src/ui/piedDeLaPalette.ts        le pied de l'onglet Création et son volet
  src/ui/glyphes.ts                le glyphe de chaque carte titrée
  galerie/etats.cjs                les états de l'interface
  tests/
```

- `[ARC-04]` Le moteur est le paquet privé `ucm-couleur`, sans étape de build :
  son `package.json` exporte `./src/index.ts`, qu'esbuild, tsx et tsc en
  résolution `Bundler` lisent tels quels. Il ne dépend que de `@ucm-kit/core`,
  dont il lit le point d'entrée `./emplois` : la table des emplois, les
  dix-neuf paires, les rangs et le contraste WCAG 2, que `ucm check` lit
  aussi. Le kit n'importe rien d'`ucm-couleur`. Sa compilation cible ES2020
  sans types d'environnement : `figma`, `document`, `window` et
  `performance` y sont des erreurs. Un changement de ce vocabulaire monte la
  version du kit, que la CLI et l'adaptateur épinglent ; la fabrication des
  palettes, la recette et ses formats restent dans `ucm-couleur`.
- `[ARC-05]` Le manifest du plugin déclare `editorType: ["figma"]`,
  `documentAccess: "dynamic-page"`, et
  `networkAccess: { "allowedDomains": ["none"] }`. Son identifiant est celui que
  Figma attribue à la création du plugin.
- `[ARC-06]` Le `package.json` racine ajoute le build du plugin à `npm run
  build`. `npm test` le couvre par les workspaces, sans ligne ajoutée.
- `[ARC-07]` La planche se calcule en deux temps. `planche/modele.ts` rend un
  arbre de données pur : cadres, textes, couleurs, tailles, noms de calque.
  `ecriture/planche.ts` le traduit en nodes Figma, sans décision. Tout ce que la
  [section 9](#9-sortie-1--la-planche) exige se teste sur le modèle, hors de
  Figma.
- `[ARC-08]` Le Color shift est un composant DOM natif, comme le reste de
  l'interface, dessiné en SVG. Sa géométrie (position d'une poignée, angle
  d'une position) est une fonction pure testée à part.

### 14.2 Ce qui se partage avec UCM Exporter

Les chemins partent de la racine du dépôt ; un nom seul reste dans le dossier
du chemin qui le précède.

| Élément d'UCM Exporter | Sort | Raison |
|---|---|---|
| `packages/plugin-exporter/scripts/build-ui.cjs` | Extrait dans le socle | Les deux plugins produisent un HTML autonome, et le piège de `String.replace` y est déjà traité |
| `packages/plugin-exporter/scripts/build-manifest.cjs`, `packages/plugin-exporter/scripts/run-tests.cjs` | Extraits | Identiques d'un plugin à l'autre |
| `packages/plugin-exporter/src/fenetre.ts` | Extrait, clé et bornes en paramètres | Les bornes diffèrent, la logique est la même |
| `packages/plugin-exporter/src/ui/styles.css`, variables et replis de thème | Socle extrait ; les règles propres à UCM Exporter restent dans son paquet | Une seule autorité sur le rendu dans les thèmes de Figma |
| `Button`, `Onglets`, `Interrupteur`, `ResizeGrip` de `packages/plugin-exporter/src/ui/components/` | Extraits ; `ResizeGrip` reçoit sa fonction d'envoi | Aucun ne dépend d'un message d'UCM Exporter, sauf l'envoi |
| `packages/plugin-exporter/src/ui/components/Header.ts`, le bouton de configuration | La bascule entre la vue de travail et la configuration est extraite ; ce qu'affiche l'en-tête reste à chaque plugin | Les deux plugins ouvrent leur configuration du même geste |
| `packages/plugin-exporter/galerie/build-galerie.cjs`, `capturer.cjs`, `theme-figma.css` | Extraits, `ETATS` passé en paramètre | Le banc est générique, les états ne le sont pas |
| `packages/plugin-exporter/tests/stylesUi.test.ts`, `buildUi.test.ts`, `manifestDistribution.test.ts` | Leur logique devient des fonctions du socle, appelées par un test dans chaque plugin | Chaque plugin garde un test à son nom, qui échoue chez lui |
| `packages/plugin-exporter/src/messages.ts`, `packages/plugin-exporter/src/ui/pont.ts` | Patron recopié, pas de code partagé | Le vocabulaire des messages est propre à chaque plugin |
| `packages/plugin-exporter/src/contract/localisation.ts` | Patron recopié | Les constats du plugin de palettes ne portent pas sur un contrat |
| `packages/plugin-exporter/tests/loiDuDocumentIntact.test.ts` | Patron recopié, sens inversé | Le plugin de palettes écrit par nature ; sa loi borne les fichiers qui écrivent |

- `[ARC-09]` L'extraction vient avant le squelette du plugin Palettes, qui
  naît sur le socle. Elle ne change rien à UCM Exporter : sa suite passe, et pour chaque
  état de sa galerie, le `innerHTML` de `#app` et le style calculé de chaque
  élément sont identiques avant et après. `dist/ui.html` est identique, ou ne
  diffère que par l'ordre des modules du bundle. La preuve se fait sur le DOM,
  pas sur les captures, qui ne sont pas reproductibles.
- `[ARC-10]` Le socle n'est pas publié. Ses fichiers sont lus par les deux
  plugins à travers le workspace, et esbuild les inclut dans chaque bundle.

### 14.3 Le plugin

- `[ARC-11]` Le moteur de couleur est inclus deux fois : dans l'interface pour
  l'aperçu, dans le sandbox pour le modèle de planche. Les deux importent le
  même module. Le sandbox calcule la planche depuis la recette rangée ;
  l'interface n'envoie jamais un hexa à dessiner.
- `[ARC-12]` Seuls les fichiers de `src/ecriture/` appellent une API Figma qui
  écrit. La loi qui le tient lit le code ligne à ligne et cherche une liste
  explicite de motifs : `figma.create*`, `.remove(`, `setPluginData`,
  `setSharedPluginData`, `appendChild`, `insertChild`, `.fills =`,
  `.strokes =`, `.name =`, `.characters =`, `.resize(`, `.x =`, `.y =`,
  `.layoutMode =`, `.fontName =`, `.fontSize =`. Une affectation absente de la
  liste lui échappe.
- `[ARC-13]` Aucun fichier de `src/` n'appelle `figma.variables`,
  `loadAllPagesAsync` ou une API de style.
- `[ARC-15]` La navigation (`setCurrentPageAsync`, `scrollAndZoomIntoView`,
  `selection`) est dans `src/navigation.ts`, hors de la loi d'écriture : elle
  ne modifie pas le document.
- `[ARC-14]` Le routage de `code.ts` n'a qu'une porte par geste d'écriture :
  « dessiner », « ranger la recette » et « retirer un cadre » (`[PLA-27]`).

### 14.4 Invariants

Ces règles entrent dans `AGENTS.md` au lot qui les rend vraies, chacune avec le
test qui la tient.

| Règle | Test |
|---|---|
| Le moteur de couleur ne lit ni `figma`, ni le DOM, ni l'heure, ni le hasard | Compilation sans types d'environnement, et loi de pureté sur `packages/couleur/src/` pour `Date`, `Math.random`, `Intl`, `toLocaleString` et `TextEncoder` |
| À la clarté du pivot, le Color shift ne décale ni la teinte, ni la part, ni la clarté | Test de propriété du moteur |
| Une valeur dans la limite du Color shift ou du réglage global garde chaque promesse tenue au début du geste | `packages/couleur/tests/limites.test.ts` |
| Pendant un geste, aucun contrôle de l'onglet Création ne se déplace | Test d'interface Chromium (`[UI-20]`) |
| Seul `src/ecriture/` écrit dans le document | Loi d'écriture, patron de `loiDuDocumentIntact` |
| Le plugin ne touche aucune variable | Loi d'écriture : `figma.variables` absent de `src/` |
| Le plugin n'écrit que dans les cadres qu'il possède et dans la recette | Tests du modèle et de l'écriture |
| Le manifest n'ouvre aucun domaine | Test du manifest |
| Aucun des deux plugins n'importe l'autre | Loi d'import à la racine du dépôt, `tests/pluginsSepares.test.ts`, qui lit les deux sens |
| Aucune vue ne pose un mot hors des catalogues de `src/i18n/`, et les catalogues ont les mêmes clés | `tests/loiDesTextes.test.ts` et `tests/i18n.test.ts` |

## 15. Les lots

Le [plan de développement](./PLAN-PLUGIN-PALETTES.md) détaille chaque lot en
cases et donne son critère de sortie. Chaque lot se termine par `npm test`,
`npm run typecheck` et `npm run build` verts, et par un commit sur `main`. Un
lot qui touche l'interface passe le protocole de relecture de
[CONTRIBUTING.md](../../../../../CONTRIBUTING.md#le-protocole-de-relecture).

Les lots s'exécutent dans cet ordre : 0, 1, 2, 8, 2b, 3, 4, 5, 6, 7, 9. Le lot
8 garde son numéro, et le plan ses identifiants de cases.

| Lot | Contenu | Exigences |
|---|---|---|
| 0 | Mise en place : cette spécification corrigée, le dossier suivi par Git | aucune |
| 1 | Moteur de couleur, préréglage Tailwind, dans `packages/couleur` | MOT-01 à MOT-24, MOT-26, MOT-27, ARC-01, ARC-04 |
| 2 | Promesses, alertes, recette, empreinte | VER-03 à VER-11, ENT-06, ENT-09, REC-02 à REC-05 |
| 8 | Extraction du socle commun, avant le squelette | ARC-02, ARC-09, ARC-10 |
| 2b | Table fixe des emplois : câblage retiré de la recette, promesses par profil, alerte de la référence plus claire que le bouton | VER-04 à VER-06, VER-11, VER-12, REC-05 |
| 3 | Squelette du plugin sur le socle, lecture et rangement de la recette, galerie | ARC-03, ARC-05, ARC-06, ARC-12 à ARC-15, REC-01, REC-04, REC-10, UI-01, UI-02, UI-07, UI-08 |
| 4 | Onglet Création, aperçu, gestion des palettes ; configuration des courbes, des parts et du seuil de profils confondus | ENT-01 à ENT-04, ENT-07, ENT-10, REC-06, UI-03 à UI-06, ARC-11 |
| 5 | Éditeur de dérive | DER-01 à DER-16, ARC-08 |
| 6 | Planche : modèle, écriture, fraîcheur, recette Figma | PLA-01 à PLA-25, MOT-25, ARC-07 |
| 7 | Reste de la configuration, import et export, rapport | ENT-05, ENT-08, REC-07 à REC-09, REC-11, VER-01, VER-02 |
| 9 | Clôture : README, invariants, feuille de route | invariants de la [section 14.4](#144-invariants) |

## 16. Recette dans Figma

Ce qui ne se prouve pas hors de Figma se rejoue à la main.

1. Document `SRGB` : dessiner une palette ; la pipette de Figma sur une pastille
   rend l'hexa de sa carte.
2. Document `DISPLAY_P3` : la pipette y rend une couleur P3, pas l'hexa sRGB
   de la carte. Dessiner la même palette dans un document `SRGB` et dans un
   document `DISPLAY_P3`, poser les deux planches côte à côte : elles
   s'affichent identiques, et les composantes relues de la peinture P3 égalent
   la conversion `[MOT-05]`. Ce point tranche `[MOT-25]`.
3. Glisser une poignée du Color shift : l'aperçu suit le pointeur sans
   saccade visible, et aucun curseur ne se déplace sous le pointeur.
4. Déplacer un cadre, redessiner : il reste à sa place.
5. Ctrl+Z après un dessin défait ce dessin entier.
6. Modifier la recette : le cadre est signalé périmé, puis redessiné au geste.
7. Douze palettes dessinées : temps mesuré, et défilement de la page Palettes
   sans saccade visible.
8. Copier un code depuis une pastille de la planche.

## 17. Option ultérieure : créer les variables

Cette option n'entre dans aucun lot. Elle se décide après usage du plugin, si
la planche convient. Ce qui suit liste ce qu'elle devra trancher, pour que la
décision parte de faits connus.

- **Les noms.** Le plugin ne connaît que le nom éventuel de la palette, le
  profil, le mode et le cran. Le designer devra dire dans quelle collection et
  sous quel chemin chaque palette entre ; le nom de calque des pastilles
  (`[PLA-14]`) donne déjà la fin de ce chemin.
- **Les modes Figma.** Si une collection porte un mode par marque, Figma remplit
  un mode ajouté avec les valeurs du premier. Une valeur copiée ne doit pas
  passer pour une valeur écrite ou retouchée.
- **Les retouches.** Une valeur modifiée à la main dans Figma ne s'écrase pas.
- **Le profil du document.** La table de la [section 6.7](#67-peindre-dans-lespace-du-document)
  vaut aussi pour la valeur d'une variable, à vérifier de même.
- **UCM Exporter.** Les variables écrites seront exportées comme les autres ; son
  moteur n'a pas à changer.

## 18. Risques

- **Les courbes et les parts de chroma sont des choix visuels.** L'onglet
  Recette sert à les régler en regardant la planche.
- **Une planche est un relevé.** Les pastilles sont peintes, pas liées : une
  couleur modifiée à la main sur la planche ne modifie pas la recette, et
  disparaît au prochain dessin.
- **Le profil Display P3.** La conversion repose sur `[MOT-25]`, que seule la
  recette Figma confirme.
- **La planche est lourde.** Environ 400 calques par palette. Le lot 6 mesure,
  et `[PLA-24]` prévoit le repli.
- **L'éditeur de dérive est le point d'ergonomie du plugin.** Le lot 5 lui est
  réservé, et le protocole de relecture s'y applique avant la suite.
- **L'extraction du socle touche UCM Exporter.** Le lot 8 ne passe que si le
  DOM et les styles calculés de sa galerie sont identiques.
- **Le socle se dessine avec un seul consommateur.** Il est extrait avant que
  le plugin Palettes existe : une frontière mal placée se corrigera quand le
  second plugin l'emploiera, et cette correction touchera encore UCM Exporter,
  sous la même preuve.

## 19. Consignes pour l'agent

Les règles de conduite de chaque lot sont dans [le
plan](./PLAN-PLUGIN-PALETTES.md#règles-de-conduite). Trois d'entre elles
touchent à cette spécification :

- lire ce document section par section, au lot qui la concerne ;
- mesurer avant d'implémenter une prémisse : une formule de ce document qui
  contredit une mesure se corrige ici, et le commit le dit ;
- ne rien changer au comportement d'UCM Exporter. Le lot 8 est le seul qui
  touche son paquet, et il ne change ni son DOM ni ses styles calculés.

# UCM Palettes : spécification du plugin

UCM Palettes est un plugin Figma qui fabrique des palettes de couleur selon la
recette de [l'architecture
multi-marques](../../Archi%20Tokens%20Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html),
et les écrit dans les variables ou les dessine dans le fichier Figma. Une
palette part d'une couleur de référence et produit une ou deux intensités,
en clair et en sombre, selon sa liste de nuances. La planche montre les
rampes, puis, pour chaque dossier `solid`, `surface` et `page` de la table de
l'architecture, les variables qui lui prennent une nuance et les garanties de
contraste qu'elles tiennent. Le détail d'une nuance de l'interface donne son
hexa, ses valeurs OKLCH et ses contrastes.

Le designer nomme la palette. Son nom n'a aucun effet sur le calcul ; sa
destination détermine le chemin de ses variables.

Ce document est la spécification du produit, malgré son emplacement dans les
recherches. Le [bilan Palettes](../README.md) distingue les fonctions
implémentées des pistes conservées.

## 1. Statut et lecture

- **Statut** : référence du plugin implémenté et du moteur de couleur.
- **Utilisateur** : l'équipe du design system.
- **Dépôt** : UCM Toolkit, paquet `packages/plugin-palettes` et moteur
  `packages/couleur`.
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
| `VAR` | Variables : les palettes écrites dans les variables de Figma |
| `VER` | Vérifications et alertes |
| `ARC` | Architecture du code et réemploi |
| `UI` | Interface du plugin |

## 2. Vocabulaire

| Terme | Sens |
|---|---|
| Palette | Une couleur de référence et ses réglages. Elle produit une rampe par intensité et par mode |
| Couleur de référence | La couleur autour de laquelle se calcule la palette ; le réglage global peut la modifier depuis son départ |
| Rampe | Une liste de nuances de 50 à 950, pour une intensité et un mode ; les préréglages comportent onze ou treize nuances |
| Cran | Une couleur de la rampe, désignée par son numéro |
| Profil | `soft` ou `vivid` : la part de la vivacité maximale que l'écran affiche, 0,85 ou 0,95 par défaut |
| Intensité | Une rampe par mode qu'une palette porte : `soft` et `vivid` pour une palette à deux intensités, la rampe unique, sans nom de profil, pour une palette à une intensité (`[ENT-14]`) |
| Mode | `light` ou `dark` : la courbe de clarté employée |
| Color shift | Les décalages de teinte, de saturation et de luminosité à chaque bout de la rampe, autour de la couleur de référence (`[MOT-30]`). La recette les range sous `derive`, et le code garde ce nom |
| Dérive de teinte | Le décalage de teinte du Color shift, en degrés, entre la couleur de référence et chaque bout de la rampe |
| Poids d'une nuance | 0 à la clarté du pivot, 1 au bout de la rampe, linéaire entre les deux : la fraction du réglage d'un bout que la nuance reçoit (`[MOT-30]`) |
| Fond de référence | Le fond de la page d'un mode, `elevation/page` : l'hexa contre lequel se mesurent les contrastes de ce mode |
| Variable de dossier | `solid/default` ou `page/foreground` par exemple, rangée sous `solid`, `surface` ou `page`. La table des dossiers de l'architecture lui fixe un cran, selon le sens du thème |
| Sens du thème | Normal ou inversé, selon que le texte des boutons du thème, blanc ou noir, a la couleur de sa page ou non |
| Recette | Tous les nombres qui fabriquent les palettes du fichier |
| Planche | Les cadres que le plugin dessine dans Figma |
| Profil porteur | Le profil dont les rampes contiennent la couleur de référence exacte, dans les deux modes (`[MOT-17]`). Une palette à une intensité n'en a pas : sa rampe unique contient la référence |
| Promesse | Une des sept garanties G1 à G7 entre deux variables du thème, `solid/foreground` sur `solid/default` par exemple, que son contraste mesuré vérifie contre un minimum. Le code garde ce nom (`promesses.ts`) |

L'interface et la planche emploient le vocabulaire d'affichage de
l'[inventaire des textes](../Textes et langues/INVENTAIRE-TEXTES-ET-PROPOSITIONS.md#vocabulaire-retenu) :
« Palettes et réglages » pour la recette, « Configuration » pour ses réglages,
« nuance » pour un cran, « intensité » pour une part de chroma,
« usage » pour un emploi, « Thème Light » et « Thème Dark » pour les modes.
Ce document garde les termes du code, que les données enregistrées portent
aussi.

## 3. Décisions

| # | Décision | Conséquence |
|---|---|---|
| D1 | Plugin séparé d'UCM Exporter, dans ce monorepo | UCM Exporter garde sa garantie : l'analyse et la publication n'écrivent jamais dans le document |
| D2 | Chaque palette a deux sorties dans Figma : une planche, des cadres qui la dessinent avec ses informations, et ses variables de couleur ([section 17](#17-sortie-2--les-variables)) | Le plugin n'écrit de variables que dans la destination que le designer a confirmée, ou dans les variables qu'il a reprises du fichier. Il n'écrit ni `color-brands`, ni `color-utilities`, ni `theme`, ni alias |
| D3 | L'unité est la palette, sans notion de marque ni de famille | Le plugin ne nomme jamais une couleur `primary` ou `danger` ; le nom éventuel vient du designer |
| D4 | Le Color shift règle la teinte, la saturation et la luminosité aux deux bouts, autour de la couleur de référence | La couleur de référence reste fixe ; les autres crans suivent le réglage en direct, dans des limites qui gardent les garanties tenues ([section 12](#12-le-color-shift)) |
| D5 | Un préréglage « Tailwind » calcule les deux dérives de teinte depuis le relevé des rampes Tailwind | Reproduire le comportement de Tailwind tient en un clic. La saturation et la luminosité n'ont pas de préréglage |
| D6 | Le plugin n'a aucun accès réseau | La recette exportée se range à la main dans un dépôt |
| D7 | Le moteur de couleur est un module pur, rangé dans le paquet privé `packages/couleur`, nom `ucm-couleur`, servi en source. Le vocabulaire qu'UCM Palettes, l'architecture et `ucm check` partagent, la table en dossiers, ses deux sens, les sept garanties et le contraste WCAG 2, est dans le point d'entrée `@ucm-kit/core/emplois` du kit publié | Le plugin, ses tests et `ucm check` jugent sur la même table et le même arrondi. `ucm-couleur` importe ce vocabulaire ; la fabrication des palettes, la recette et ses formats restent hors du kit |
| D8 | Les contrastes se mesurent contre deux fonds de référence saisis, un clair et un sombre | Le plugin ne fabrique pas de rampe neutre |
| D9 | Les variables de dossier forment une table fixe, celle de l'architecture, commune à toutes les palettes. Le texte des boutons de chaque thème en choisit le sens | Le designer voit quel cran sert à quelle variable et si la garantie tient. Aucune palette ne relie une variable à un autre cran, et la recette ne porte aucun câblage |
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
| Q2 | Parts de chroma | 0,85 `soft`, 0,95 `vivid` | Recette, `profils` |
| Q3 | Seuil de confusion entre profils | 0,02 en distance Oklab | Recette, `seuils` |
| Q4 | Gamut de fabrication | sRGB, tranché par l'architecture, qui écarte Display P3 | Recette, `gamut`, qui n'accepte que `srgb` |
| Q5 | Fonds de référence | `#F7F7F7` en clair, `#0A0A0A` en sombre : le gris de clarté 0,975 et 0,145 | Recette, `fonds` |
| Q6 | Profil vérifié par les promesses | Les deux, `soft` et `vivid` | Aucun endroit : la table en dossiers vaut pour les deux profils |
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
- vérifier les sept garanties de la table en dossiers ;
- signaler les alertes ;
- dessiner un cadre par palette, et le redessiner quand la recette change ;
- écrire chaque palette dans les variables de couleur de la destination que
  le designer choisit, et suivre leur état ;
- lire les palettes que les variables du fichier portent déjà, et les
  reprendre au geste du designer ;
- ranger la recette dans le fichier, l'exporter et l'importer en JSON ;
- exporter un rapport des vérifications.

Le plugin ne fait pas :

- créer ou modifier un style ;
- écrire une variable de `color-brands`, de `color-utilities` ou de `theme`, ni un alias ;
- deviner à quoi sert une palette ;
- publier vers GitHub ou GitLab ;
- créer ou modifier un composant ;
- écrire hors de la page de la planche, de la recette et des suivis rangés
  sur le document, et des variables de la [section 17](#17-sortie-2--les-variables) ;
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
Lf = clamp(L + clarte[p] + clarté(w), 0, 1)              [MOT-29], [MOT-30], [MOT-38]
Le = Lf sans le décalage de [MOT-38] (cran clair), sinon Lf
q  = clamp(part(intensité) × (1 + saturation(w)), 0, 1)  [MOT-30]
C  = clairs(L) × min(q × facteur(mode, L) × plafond(Lf, H, gamut),
         p0 × min(a × marge(H) × (1 − Le), b × Le))      [MOT-28], [MOT-35]
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
- `[MOT-35]` L'enveloppe de chroma plafonne la chroma d'un cran. `p0`, `a`, `b`,
  `jaunes` et `cyans` viennent du profil de l'intensité (`soft` pour Soft,
  `vivid` pour Vivid et pour l'intensité unique) et du thème du cran, dans
  `profils.<profil>.enveloppe` (section 7.1). `a × (1 − Le)` borne les crans
  clairs, `b × Le` les crans sombres. `marge(H) = 1 + jaunes × g(100°, 12°) +
  cyans × g(195°, 30°)`, avec `g(c, s) = exp(−½ × (écart entre H et c / s)²)`.
  `jaunes` élargit la borne claire autour du jaune. `cyans`, dans `[−1 ; 1]`,
  ajoute une seconde bosse à la marge autour du cyan, d'écart type 30° ;
  négatif, il la creuse : Vivid Light le porte à −0,2 par défaut, ce qui calme
  les teal et les cyans clairs. `jaunes` et `cyans` valent 0 en Dark par
  défaut, la marge y est alors 1.
  L'enveloppe se lit à `Le`, la clarté du cran sans le décalage de `[MOT-38]`
  (`Lenveloppe` dans `cranVise`) ; le plafond de l'écran se lit à `Lf`.
  `p0` ne suit ni le Color shift de saturation ni `facteur` : ils agissent sur
  `q × facteur`, pas sur l'enveloppe. Sans enveloppe,
  `C = q × facteur × plafond`.
  Le profil porte aussi `clairs`, le facteur de chroma des tons clairs du
  thème Light, dans `]0 ; 1]`. Il multiplie la chroma après l'enveloppe, en
  entier pour une clarté de courbe au-dessus de 0,88, pas du tout sous 0,78,
  avec un passage lissé entre les deux (`t = 1 − x²(3 − 2x)`,
  `x = clamp((0,88 − L) / 0,10, 0, 1)`). Soft le porte à 0,7 et Vivid à 1 : les
  fonds Light de Soft se calment, ses pleins et ses textes restent. Le thème
  Dark n'a pas de `clairs`. Soft porte aussi `dark.b` à 0,15 par défaut, qui
  calme ses tons foncés et moyens en Dark. `cranVise` et `enveloppeDe`
  (`packages/couleur`) en sont l'autorité, `viseesDeLaRampe` pour `clairs`.

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
    désigne toujours `vivid` (`profilAutomatique`), quelle que soit la part de
    la référence (`[MOT-24]`), gris pur compris (`[MOT-18]`). Une couleur plus
    saturée donne ainsi toujours des palettes plus saturées, et la palette ne
    bascule plus d'un profil à l'autre quand le designer fait glisser sa
    saturation. Sous une référence terne, `vivid` est aussi terne qu'elle et
    `soft` environ 10 % plus calme (`[ENT-11]`).
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
- `[MOT-39]` Dans l'intensité porteuse, quand la référence est plus vive que la
  chroma que sa rampe vise à son cran, les crans voisins montent vers elle : la
  chroma d'un cran vaut `max(C, min(part × plafond, Cref, C × (1 + (ρ − 1) × w)))`,
  avec `ρ = Cref / C` au cran de la référence et un poids gaussien
  `w = exp(−½ × ((L − Lref) / 0,10)²)` sur la clarté (σ 0,10). La bosse laisse
  les fonds en dehors : elle ne monte pas un cran dont la clarté de courbe est
  au-dessus de 0,88 en Light ou sous 0,50 en Dark, avec un passage lissé
  jusqu'à 0,78 et 0,56. Quand Vivid ou l'intensité unique pose la référence dans cette zone,
  la bosse y entre à proportion de la place qu'y tient la référence ; Soft
  garde ses fonds calmes même quand il la porte. Elle est gardée mode par mode :
  sa force est la plus grande, par quatorze dichotomies, qui ne fait manquer à
  ce mode et à cette intensité aucune promesse que la rampe tient sans elle. Une
  palette libre, qui n'a pas de promesses, la garde entière. `bosseDeChroma`
  (`packages/couleur/src/bosse.ts`) calcule la bosse, `rampesDe`
  (`palette.ts`) la garde, `jugerLesRampes` (`jugement.ts`) juge les
  promesses.

### 6.5 Le préréglage Tailwind

Le préréglage reproduit la dérive des dix-sept rampes colorées de Tailwind. Le
relevé est rangé dans la recette sous `derives` : la clarté et la teinte des
onze crans, du 50 au 950, de chaque rampe. Il redonne le tableau 3.3 de l'architecture :

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
h0(r)     = teinte de la rampe r à la clarté La
dClair(r) = teinte de r à Lc  − h0(r)
dSombre(r)= teinte de r à Ls  − h0(r)
dClair, dSombre = interpolation de (dClair(r), dSombre(r)) entre les deux
                  rampes voisines de Ha sur le cercle, triées par h0
```

La teinte d'une rampe à une clarté se lit entre ses crans, sur les teintes
dépliées, et reste celle du cran extrême au-delà. Les deux rampes voisines et la
position de `Ha` entre elles se calculent sur `h0`, la teinte de chaque rampe à
la clarté de la référence : la dérive suit la rampe là où la référence se
trouve, et non la teinte de son cran 50.

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
- `[MOT-19]` Une seule lecture du relevé par préréglage, sur `Ha` et `La`.
  Deux implémentations rendent ainsi le même préréglage.
- `[MOT-20]` La recette garde les deux angles retenus et le nom du préréglage
  dont ils viennent, `tailwind`, `constante` ou `libre`. Elle ne garde jamais la
  formule : un relevé modifié ne change pas une palette déjà réglée.
- `[MOT-36]` La dérive de chaque bout se lit sur les deux rampes voisines de
  la référence, choisies d'après leur teinte à la clarté `La`, à `Lc` pour le
  bout clair et à `Ls` pour le bout sombre. Le choix des rampes d'après la
  teinte de leur cran 50, et la répartition de la dérive totale selon la
  position de la référence, n'existent plus. Une référence qui est le cran 500
  d'une rampe du relevé retrouve la teinte de cette rampe à 12,5° près sur ses
  onze crans.
- `[MOT-38]` Les tons clairs suivent la clarté que les rampes de Tailwind
  montrent à la teinte de la référence. Le décalage du bout clair se lit sur
  le relevé `derives` : pour chaque rampe, l'écart de clarté de son cran 100 à
  la médiane des crans 100 du relevé ; les deux rampes voisines de la
  référence prêtent leur écart, interpolé comme la dérive de `[MOT-36]`, et le
  poids du cran 100 vers le bout clair le divise. Le résultat se borne à
  ±0,03, se range au millième, et vaut 0 pour un gris, une palette figée ou
  libre, ou une liste sans cran 100. Il se calcule à la lecture et ne se range
  jamais. Il s'ajoute à la luminosité du Color shift, au bout clair, des
  deux profils ; l'enveloppe de `[MOT-35]` se lit sans lui. Il se réduit,
  par douze dichotomies, jusqu'à garder l'ordre des nuances (`[DER-19]`) et
  toutes les promesses que la palette tient sans lui. Le décalage gardé est
  mémorisé par recette et par palette. `clarteSelonLaTeinte` et
  `clarteSelonLaTeinteGardee` (`packages/couleur/src/palette.ts`) et
  `clarteSelonLaTeinteDuReleve` (`tailwind.ts`) en sont l'autorité.
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
| dérives nulles, 360 teintes, deux profils, deux modes, rampes communes | les garanties de la [section 11.2](#112-promesses-des-emplois) tenues après arrondi, hors la nuance où la référence est ancrée |
| gris de clarté 0,975 et 0,180 | `#F7F7F7` et `#121212` |
| tout Color shift, toute référence dans `[Ls, Lc]` | à la clarté `La`, la teinte vaut `Ha`, la part celle du profil et la clarté celle de la courbe |

Un second jeu vient de cette spécification. [`mesurer-recette.mjs`](https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/mesurer-recette.mjs)
le calcule, angles arrondis au centième (`[MOT-27]`) et contrastes tronqués
(`[MOT-22]`) ; le lot 1 le recalcule avec le moteur avant de le figer :

| Entrée | Attendu |
|---|---|
| Référence `#1E6FD9`, préréglage Tailwind | dérive totale 11,63°, `dClair = -7,35`, `dSombre = +4,28` |
| Même palette, `vivid`, clair 700 | `#0E5DC6`, contraste 5,76 contre `#F7F7F7` |
| Même palette, `vivid`, sombre 200 | `#022160`, contraste 1,23 contre `#121212` |
| Référence `#F2A900`, préréglage Tailwind | dérive totale -49,61°, `dClair = +20,53`, `dSombre = -29,08` |
| Même palette, `vivid`, sombre 700 | `#C9851B`, contraste 6,11 contre `#121212` |

Ces vecteurs portent sur les rampes communes. Sur les rampes ancrées de
`[MOT-17]`, dans la recette par défaut :

| Entrée | Attendu |
|---|---|
| Référence `#1E6FD9`, préréglage Tailwind | profil porteur `vivid`, à la part de la référence, 0,894 (`[ENT-11]`) ; cran 600 en clair et en sombre, où l'hexa vaut `#1E6FD9` ; clair 700 `#185FC0` |
| Référence `#A0B599` | profil porteur `vivid`, à la part de la référence, 0,198, et `soft` à 0,177 ; cran 400 en clair, 800 en sombre |
| Référence `#B00100` | profil porteur `vivid`, cran 700 en clair, 500 en sombre |
| Référence `#000000` | profil porteur `vivid`, cran 950 en clair, 50 en sombre |

## 7. La recette

### 7.1 Contenu

La recette contient tous les nombres qui fabriquent les palettes du fichier.
Deux outils qui la lisent produisent les mêmes hexas.

| Clé | Contenu | Portée |
|---|---|---|
| `formatVersion` | Entier positif, version de la forme de la recette | Fichier |
| `crans` | `[50, 100, …, 950]` : la réunion des crans que la table de chaque thème exige dans son sens (`[VER-05]`, `[REC-13]`), 50 seul facultatif | Toutes les rampes |
| `courbes` | `light` et `dark`, une clarté par cran | Toutes les rampes |
| `profils` | `soft` et `vivid`, chacun avec sa `part` commune de chroma, son facteur `clairs` des tons clairs du Light et son `enveloppe`, tous obligatoires (`[REC-12]`, `[REC-14]`) | Toutes les palettes, sauf surcharge |
| `gamut` | `"srgb"` | Fichier |
| `fonds` | `light` et `dark`, un hexa chacun : le fond de la page de chaque thème | Les garanties |
| `texteDesBoutons` | `light` et `dark`, chacun `blanc` (`#FFFFFF`) ou `noir` (`#000000`) ; `blanc` en Light et `noir` en Dark par défaut | Thème |
| `seuils` | `texte` 4,5 ; `nonTexte` 3 ; `profilsConfondus` 0,02 ; `palettesProches` 0,05 | Vérifications |
| `derives` | Les dix-sept rampes colorées de Tailwind 3.4.17 : un nom et onze crans `[L, H]` du 50 au 950 (`[REC-12]`) | Préréglage |
| `intensiteDesFondsSombres` | Nombre dans `[0, 1]`, 0,30 par défaut : le facteur de la part des fonds du thème Dark au numéro 50 (`[MOT-28]`) | Toutes les palettes, thème Dark |
| `contenuDesPlanches` | `note`, `usages`, `grilles`, `light`, `dark` : les parties qu'un cadre dessine, toutes vraies par défaut, un thème au moins (`[PLA-28]`) | Planche |
| `palettes` | Une entrée par palette, dans l'ordre d'affichage | Palettes |

La table des dossiers n'entre pas dans la recette : elle est fixe, et la
[section 11.2](#112-promesses-des-emplois) la donne. Le texte des boutons de
chaque thème en choisit le sens.

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
| `intensites` | Facultatif : `1` pour une palette à une intensité (`[ENT-14]`), sans `base`, sans `parts`, dérive liée. Elle peut porter `crans` : une palette reprise du fichier garde ses nuances (`[VAR-13]`). Absent, la palette porte Soft et Vivid |
| `reglages` | Facultatif (`[ENT-15]`) : `teinte` et `clarte`, une valeur par profil, en degrés dans `[-30, 30]` au centième et en décalage de clarté OKLCH dans `[-0,10, +0,10]` au millième ; `part`, la saturation de la référence, donc celle de son profil porteur, dans `[0, 1]` ; `porteur`, le profil porteur figé ; `depart`, la référence d'une palette ajustée avant la version 5. Une palette à une intensité range sous `vivid`. Absent, aucun réglage |

Une palette reprise « telle quelle » des variables du fichier porte en plus
(`[VAR-13]`) :

| Clé | Contenu |
|---|---|
| `figees` | Facultatif : `light`, un hexa par nuance de `crans`, dans son ordre, et `dark`, facultatif, de même longueur. Les rampes de la palette rendent ces couleurs sans calcul ; sans `dark`, le thème Dark rend celles de `light`. À une intensité (`intensites: 1`), `figees` est `{ light, dark? }`. À deux intensités, sans `intensites`, c'est `{ soft, vivid }`, chacun de la forme `{ light, dark? }` (format 10) ; les deux formes ne se mélangent pas. Exige `crans`, et refuse `base`, `parts`, `reglages` et `originale`. Sous `figees`, `crans` porte les nuances lues dans les noms des variables : des entiers positifs ou nuls, croissants, hors des bornes d'une liste libre, les mêmes pour les deux intensités |

Une palette figée est libre : ni rôles, ni garanties, ni réglage global, ni
Color shift. Sa référence est la nuance qui en porte la couleur.

### 7.2 Exemple

```json
{
  "formatVersion": 12,
  "crans": [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
  "courbes": {
    "light": [0.975, 0.95, 0.905, 0.845, 0.76, 0.67, 0.585, 0.5, 0.42, 0.34, 0.27],
    "dark": [0.145, 0.225, 0.275, 0.33, 0.4, 0.49, 0.58, 0.67, 0.76, 0.85, 0.93]
  },
  "profils": {
    "soft": { "part": 0.85, "clairs": 0.7, "enveloppe": { "p0": 0.85, "light": { "a": 0.6, "b": 0.38, "jaunes": 1, "cyans": 0 }, "dark": { "a": 1.1, "b": 0.15, "jaunes": 0, "cyans": 0 } } },
    "vivid": { "part": 0.95, "clairs": 1, "enveloppe": { "p0": 0.95, "light": { "a": 1.1, "b": 0.48, "jaunes": 0.5, "cyans": -0.2 }, "dark": { "a": 1.1, "b": 0.3, "jaunes": 0, "cyans": 0 } } }
  },
  "gamut": "srgb",
  "fonds": { "light": "#F7F7F7", "dark": "#0A0A0A" },
  "texteDesBoutons": { "light": "blanc", "dark": "noir" },
  "seuils": {
    "texte": 4.5, "nonTexte": 3, "profilsConfondus": 0.02,
    "palettesProches": 0.05
  },
  "derives": [
    { "nom": "rose", "crans": [[0.9694, 12.42], [0.9414, 12.58], [0.2708, 12.09]] },
    { "nom": "red", "crans": [[0.9705, 17.38], [0.9356, 17.72], [0.2575, 26.04]] }
  ],
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

L'exemple abrège `derives` à deux rampes de trois crans. La recette par défaut
du paquet porte les dix-sept rampes de onze crans.

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
  recette par défaut du paquet est proposée ; au format 12, lue ; aux formats 8
  à 11, lue en format 12 par `classerRecette`, une étape par format
  (`[REC-12]`, `[REC-14]`), et son état est `courante`. Une recette 8 qui porte déjà
  `texteDesBoutons` est refusée par la règle `forme`.
  Antérieure à 8, elle est illisible, par le refus de `formatVersion` et sans
  conversion ; supérieure à 12, refusée avec un message qui demande de mettre
  le plugin à jour ; illisible, refusée sans écrire. Comme toute lecture, elle
  n'écrit pas (`[REC-04]`) : la recette rangée passe au format 12 au prochain
  rangement que fait un geste du designer.
- `[REC-04]` Un refus de lecture laisse la recette rangée intacte. Le plugin ne
  dessine rien tant que la recette n'est pas lisible.
- `[REC-05]` Une validation de forme précède tout emploi : crans croissants,
  deux courbes de même longueur que `crans`, courbe claire décroissante, courbe
  sombre croissante, clartés dans `[0, 1]`, parts dans `[0, 1]` avec
  `soft ≤ vivid` dans la recette et après les parts propres de chaque
  palette, dérives de teinte dans `[-90, 90]`, décalages de saturation dans
  `[-1, 1]` et de luminosité dans `[-0,15, +0,15]`, sans objet `saturation` ou
  `clarte` aux deux valeurs nulles, seuils strictement positifs, hexas valides,
  identifiants uniques, `crans` qui contient les crans requis par la table du
  sens de chaque thème (`[VER-05]`) ; `texteDesBoutons` vaut `blanc` ou
  `noir` pour chaque thème. Chaque profil a exactement `part`, `clairs` et `enveloppe`, et
  l'enveloppe a exactement `p0`, `light` et `dark`, chacun de ceux-ci avec
  `a`, `b`, `jaunes` et `cyans` (`[REC-12]`). `derives` compte au moins deux rampes, aux
  noms non vides et uniques, chacune d'au moins deux crans `[L, H]` dont les `L`
  sont dans `]0, 1[` et strictement décroissants, et les `H` dans `[0, 360)`.
  Le relevé doit compter deux teintes de premier cran distinctes au moins :
  deux teintes égales annulent le dénominateur de l'interpolation de
  `dériveTailwind`, et la validation ne le vérifie pas. Une clé que la
  version courante ne connaît pas est refusée, `planche` comprise. Une palette
  aux profils liés porte deux Color shift identiques, teinte, saturation et
  luminosité comprises ; chaque origine est l'une de
  celles que la section 7.1 énumère ; `base` vaut `soft` ou `vivid` ; un
  identifiant a la forme `p-` et huit chiffres hexadécimaux. Une palette libre
  porte 4 à 13 numéros, multiples de 50 de 50 à 1050, croissants, et pas de
  `base` ; `originale` est un hexa différent de `reference`. `intensites` ne
  vaut que 1, et refuse à côté de lui `base`, `parts` et une dérive
  déliée ; `figees` exige `crans`, porte un hexa par nuance dans chaque
  thème présent, et refuse `base`, `parts`, `reglages` et `originale` ; sa
  forme `{ light, dark? }` exige `intensites: 1`, sa forme `{ soft, vivid }`
  le refuse, et aucune des deux ne se mélange avec l'autre ; `intensiteDesFondsSombres` est dans `[0, 1]` ;
  `contenuDesPlanches` garde un thème au moins. `reglages` porte au moins
  une teinte, une clarté ou `part`, dans leurs bornes, sans zéro ni objet
  vide ; une clé `soft` ne va qu'à deux intensités ; `porteur` accompagne des réglages à deux intensités sans `base`,
  et jamais `base` ; un réglage du porteur exige `originale` ; `depart`
  exige un réglage du porteur et diffère d'`originale`. La validation ne
  recalcule pas la référence réglée : deux moteurs JavaScript peuvent
  différer au dernier bit, et la recette deviendrait illisible. La version 8
  ajoute `figees` et laisse une palette à une intensité porter `crans`. La
  version 9 ajoute `texteDesBoutons`. La
  version 10 laisse `figees` porter les couleurs de deux intensités, `{ soft, vivid }`. La
  version 11 range l'enveloppe de chaque profil et le relevé `derives` par
  rampes (`[REC-12]`). La version 12 ajoute `clairs` à chaque profil et
  `cyans` à chaque thème de l'enveloppe (`[REC-14]`). Une recette d'une version antérieure à
  8 est refusée sans conversion :
  seul le mainteneur en a rangé, pour ses essais. Un changement de forme
  reprendra sa conversion et ses tests le jour où des recettes seront rangées
  hors de ces essais. La validation rend tous ses refus, chacun avec sa règle
  et le chemin du champ, et ne rédige aucune phrase.
- `[REC-06]` La recette se range automatiquement à la fin de chaque geste :
  relâcher une poignée, valider un champ, créer, dupliquer ou supprimer une
  palette. Elle ne se range jamais pendant un glisser. Après
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
- `[REC-12]` Le format 11 range, pour chaque profil, sa `part` commune et son
  `enveloppe` de chroma, toutes deux obligatoires ; le format 12 y ajoute
  `clairs` (`[REC-14]`). L'enveloppe porte `p0` dans
  `]0 ; 1]`, et `light` et `dark`, chacun avec `a` et `b` dans `]0 ; 2]`,
  `jaunes` dans `[0 ; 2]` et, au format 12, `cyans` dans `[−1 ; 1]` ; `clairs`
  est dans `]0 ; 1]`. `p0` ne suit pas la part commune, et une valeur hors
  bornes est refusée par la règle `enveloppe`, au chemin du champ. Par défaut,
  `soft` a la part 0,85, `clairs` 0,7 et l'enveloppe `p0` 0,85, `light` `a` 0,6,
  `b` 0,38, `jaunes` 1, `cyans` 0, `dark` `a` 1,1, `b` 0,15, `jaunes` 0,
  `cyans` 0 ; `vivid` a la part 0,95, `clairs` 1 et l'enveloppe `p0` 0,95,
  `light` `a` 1,1, `b` 0,48, `jaunes` 0,5, `cyans` −0,2, `dark` `a` 1,1,
  `b` 0,30, `jaunes` 0, `cyans` 0. `derives` range des rampes `{ nom, crans }` ; la règle
  `derives-crans` refuse une rampe de moins de deux crans, un `L` hors de
  `]0 ; 1[`, un `H` hors de `[0 ; 360[` et des `L` qui ne décroissent pas
  strictement. `classerRecette` lit les formats 8 à 11 en format 12, une
  étape par format. L'étape du format 10 au format 11 donne aux profils les
  parts et les enveloppes par défaut du format 11, ajoute à la liste les crans 400, 500 et 950
  absents (`[REC-13]`) et remplace `derives` par le relevé du paquet : les parts
  de l'ancienne recette ne sont pas conservées, donc les couleurs changent. Les
  courbes, les fonds, le texte des boutons, les seuils et les palettes restent.
  Avant toute étape, une forme ancienne sans `crans` ou sans `courbes`, ou qui
  porte un champ d'un format suivant (`enveloppe` ou une rampe de `derives` en
  objet dans une recette 10 ou plus ancienne, `clairs` ou `cyans` dans une
  recette 11), est `illisible`, sans exception levée.
- `[REC-14]` Le format 12 ajoute `clairs` à chaque profil et `cyans` à chaque
  thème de son enveloppe (`[MOT-35]`). L'étape du format 11 au format 12
  garde les parts, les courbes, les fonds, les seuils, les palettes et le
  reste, et traite chaque profil à part : une enveloppe égale à celle du
  format 11 par défaut prend l'enveloppe et le `clairs` du format 12 par
  défaut, avec les fonds Dark de Soft à 0,15, les tons clairs de Soft à 0,7 et
  `cyans` −0,2 en Light de Vivid ; une enveloppe que le designer a modifiée
  garde ses valeurs, avec `cyans` 0 et `clairs` 1 : ses bornes de chroma ne
  changent pas à la lecture. `classerRecette` (`packages/couleur/src/recette.ts`) en est
  l'autorité.
- `[REC-13]` Les crans requis sont la réunion de ceux que la table de chaque
  thème exige, chacun dans le sens de son texte des boutons ; seul 50 est
  facultatif. Avec les textes par défaut, ce sont 100 à 900 et 950. La lecture
  d'une recette 10 ajoute les crans 400, 500 et 950 absents, avec dans chaque
  thème la clarté que `luminositeAuNumero` donne sur l'ancienne grille, au
  même rang. Une recette 11 ou 12 à qui il en manque un est refusée par la règle
  `crans-emplois`.

## 8. Les entrées

### 8.1 Une palette

| Entrée | Forme | Défaut |
|---|---|---|
| Couleur de référence | Hexa, avec le sélecteur de couleur embarqué (`[UI-13]`) | aucun |
| Nom | Texte libre, facultatif | l'hexa de référence |
| Color shift | Teinte, saturation et luminosité aux deux bouts, par profil, dans la carte de la [section 12](#12-le-color-shift) | teinte du préréglage Tailwind, saturation et luminosité à zéro |
| Intensités | « Une intensité » ou « Deux intensités », deux cartes à la création ; des segments « Une · Deux » dans la configuration (`[ENT-14]`) | Une |
| Réglage global | Teinte, saturation et luminosité de toute la rampe, trois curseurs pour Soft, Vivid ou les deux, dans la carte « Réglage global » (`[ENT-15]`) ; la saturation d'un profil est sa part de chroma | aucun réglage, parts de la recette |
| Référence exacte dans | Auto, Soft ou Vivid, dans la carte « Deux intensités » à la création, sous le segment « Deux » dans la configuration (`[ENT-11]`) | Auto |

- `[ENT-01]` Changer la couleur de référence recalcule le préréglage Tailwind.
  Une dérive d'origine `tailwind` suit ce nouveau calcul ; une dérive `libre` ou
  `constante` reste telle quelle, et l'éditeur montre la valeur Tailwind en
  repère.
- `[ENT-02]` Chaque saisie met l'aperçu à jour sans aller-retour avec le
  sandbox : le moteur est inclus dans l'interface.
- `[ENT-03]` Une palette se crée, se renomme, se duplique et se supprime dans
  l'onglet Création. Aucun geste ne la réordonne : le menu « … » porte
  « Dupliquer la palette » et « Supprimer la palette ». Une palette créée ou
  importée s'ajoute à la fin de la recette, dont l'ordre range les cadres de
  la planche (`[PLA-05]`) ; les onglets montrent les palettes par teinte
  (Création, Comparaison) ou par nom (Gestion), par `ordreParTeinte` et
  `ordreAlphabetique` (`src/ordreDesPalettes.ts`). Supprimer une palette ne
  supprime pas son cadre de la planche : l'onglet Gestion montre le cadre
  comme celui d'une palette supprimée, que « Supprimer définitivement »
  retire (`[PLA-27]`).
  Une palette sans cadre qui porte le nom d'une palette supprimée reprend
  son cadre : sa fiche le dit « À actualiser », la carte de la palette
  supprimée disparaît, et le dessin remplace ce cadre à sa place. Chaque
  cadre va à la première palette de ce nom, dans l'ordre de la recette.
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
  fige ou que le classement automatique le choisisse. Sans l'un ni l'autre,
  le classement automatique désigne toujours Vivid : la couleur exacte reste
  dans Vivid, et Soft en est une version plus calme, même sous une référence
  terne. On note `p` la part de
  la référence, `s` et `v` les parts communes de `soft` et `vivid`. Quand
  `p < s`, l'autre profil garde le rapport des parts communes : Soft porteur
  donne Vivid à `min(1, p × v / s)`, Vivid porteur donne Soft à `p × s / v`.
  Une référence terne donne ainsi deux profils ternes et distincts. Sinon,
  l'autre profil garde sa part commune, bornée pour que `soft` ne dépasse pas
  `vivid`. Les deux règles se rejoignent à `p = s`. Ces parts se calculent à
  la lecture, au millième, et ne se rangent pas : un changement de référence
  ou de part commune les suit. Des parts propres passent avant elles. En Auto,
  la palette ne bascule pas quand la saturation de la référence change :
  Vivid porte toujours la référence, et Soft saute seulement de la part
  `p × s / v` à `s` quand `p` franchit `s`. Le designer aligne des palettes avec
  l'onglet Comparer, « Référence exacte dans : Soft » et le curseur de
  saturation de Vivid. Choisir Soft ou Vivid retire les parts d'origine `designer`.
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
  profil. Ses gestes visent Soft, Vivid ou les deux ; « Les deux » déplace
  les deux profils du même écart et s'arrête quand l'un atteint sa borne.
  Chaque curseur s'arrête aussi à la limite dynamique de `[DER-19]`, calculée
  pour la cible choisie : une valeur qui ferait manquer une garantie tenue au
  début du geste n'est pas permise. La
  teinte d'un profil se mesure depuis le départ (`[MOT-29]`), en degrés, de
  −30 à +30. La luminosité décale toute la rampe du profil, de −0,10 à +0,10.
  La limite dynamique l'arrête avant que deux nuances voisines se confondent :
  à +0,04 sur les courbes par défaut.
  La saturation d'un profil est sa part (`[ENT-09]`), bornée pour que
  `soft` ne dépasse pas `vivid`. La saturation du porteur est celle de la
  référence : le geste la range aussi dans `reglages.part`, et la référence
  se récrit à cette part, comme un cran de sa rampe. Sans cela, la référence
  garderait sa saturation entre des voisines plus ternes ou plus vives. Une
  part égale à celle du départ ne se range pas : poser la valeur que le
  curseur montrait rend les octets du départ. « Par défaut » et « Tout par
  défaut » retirent `part` avec les parts du designer. Le premier
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
  Ils servent de fond de la page (`elevation/page`) pour tous les contrastes
  du mode, et de fond aux sections de la planche. La configuration range aussi
  `texteDesBoutons`, blanc ou noir pour chaque thème : il fixe la couleur de
  `solid/foreground` et le sens de la table du thème (section 11.2). Changer
  le texte des boutons d'un thème remplace ses nuances 500 à 800 par les
  luminosités par défaut du sens d'arrivée, normal ou inversé, dans les deux
  directions ; les autres nuances gardent leurs valeurs. Quand l'une des
  nuances 500 à 800 est réglée, c'est-à-dire différente du défaut du sens
  courant, le plugin demande confirmation (« Remplacer », « Annuler »). Une
  courbe qui ne reste pas strictement monotone après le remplacement est
  refusée, et la recette ne change pas. Les variables du thème passent
  « À actualiser » dans Gestion.
- `[ENT-06]` Un fond clair plus sombre que la nuance la plus légère de la
  liste, ou un fond sombre plus clair que la nuance la plus légère de la liste
  sombre, produit l'alerte « fond hors de la courbe », qui nomme cette nuance
  par son numéro : la garantie des
  courbes (`[ENT-10]`) se mesure contre cette nuance, la 50 des préréglages,
  et ne couvre pas un fond au-delà. La clarté du fond se compare à la valeur de la courbe avec une
  tolérance de 0,005 : `#0A0A0A`, le fond sombre par défaut, a une clarté de 0,1448.

### 8.3 La recette commune

La configuration de la recette règle ce qui touche toutes les palettes :
courbes, parts, fonds du thème Dark, fonds, seuils et contenu des planches. Le
bouton « Configuration » de l'en-tête l'ouvre, comme la configuration d'UCM
Exporter, et le même
composant du socle la porte (`[UI-02]`).

- `[ENT-21]` Le bouton de l'en-tête se nomme : l'engrenage de 12 px, puis le
  texte « Configuration » (« Settings » en anglais), sur une largeur
  automatique. Son `title` dit « Ouvrir la configuration » (« Open
  settings »). Le socle le porte, avec la classe `avec-libelle`, pour
  UCM Palettes et UCM Exporter ; l'explorateur n'a pas de configuration et
  n'en pose pas.
- `[ENT-20]` La Configuration, titrée « Configuration » (« Settings »), s'ouvre
  sur deux onglets du socle, Palettes puis Général. Une phrase sous les
  onglets dit ce que l'onglet actif règle : « Les réglages par défaut de
  toutes les palettes du fichier. » pour Palettes, « Les réglages du plugin
  sur ce poste. » pour Général. Palettes porte les cartes de `[ENT-12]` ;
  Général porte le champ Langue et son message de refus. Pendant un dessin,
  le panneau Palettes est inerte et la langue reste réglable. Chaque
  ouverture de la Configuration revient sur Palettes ; changer la langue ne
  change pas d'onglet.
- `[ENT-07]` Chaque champ de la configuration affiche le nombre de palettes
  qu'il modifie.
- `[ENT-13]` « Luminosité des nuances » s'ouvre sur le nombre de nuances,
  11 ou 13. Choisir un autre préréglage dit d'abord ce qu'il changerait :
  les numéros ajoutés ou retirés, les palettes dont une nuance gardée change
  de couleur, et le nombre de cadres qui passeraient « À actualiser ». Il
  ne se range qu'à « Passer à N nuances » ; « Annuler » ne range rien. Une
  liste importée se dit « Liste importée ». Au-delà de onze nuances, les
  champs de la table se resserrent pour tenir à la largeur minimale.
- `[ENT-12]` L'onglet Palettes de la Configuration se range en six cartes : Couleurs de
  fond, Intensités, Luminosité des nuances, puis, repliées, Contrastes
  minimums, Détection des couleurs proches et Contenu des planches
  (`[PLA-28]`). Couleurs de fond donne, pour chaque thème, le « Fond de la
  page » (`elevation/page`) et le « Texte des boutons » (`solid/foreground`),
  Blanc ou Noir ; « Par défaut » y remet le texte des boutons sans
  confirmation, et affiche le refus d'`[ENT-05]` quand la courbe par défaut
  ne reste pas monotone. La carte Intensités porte, sous Soft et Vivid, « Fonds du
  thème Dark », un curseur et un champ de 0 à 1 (`[MOT-28]`), qui touche
  toutes les palettes ; « Par défaut » le remet à 0,30 avec les parts. « Par
  défaut » remet une carte
  aux valeurs de la recette par défaut, sans toucher aux autres cartes ni aux
  palettes : leurs parts propres, du designer ou d'une palette de base
  forcée, restent. Les courbes reprennent celles du préréglage que la liste
  reconnaît ; une liste importée n'en a pas, et « Par défaut » y reste inactif.
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
  nuances, dans l'onglet Palettes de la Configuration ; une autre liste passe par un import de
  recette. Changer de préréglage garde la luminosité de chaque numéro gardé ;
  un numéro ajouté prend celle du préréglage quand la courbe reste monotone,
  sinon celle de la règle de la luminosité d’un numéro.
- `[ENT-10]` La configuration mesure la garantie des courbes. Dans la table
  du sens de chaque mode, le cran de `page/foreground` tient le seuil `texte`
  et le cran de `ring` le seuil `nonTexte` contre le cran le plus clair
  de la liste, de la même courbe, gris. Le cran de `solid/default` tient le
  seuil `texte` contre le texte des boutons du mode, blanc ou noir purs. Le
  contrôle porte sur 360 teintes, les deux profils et les deux modes, sur les
  couleurs à 8 bits. Une courbe qui ne le tient plus produit l'alerte « courbe
  hors garantie », qui nomme le cran, le mode, le profil, la teinte du pire
  cas, son contraste et ce contre quoi il est jugé : le cran le plus clair ou
  le texte des boutons. L'alerte n'empêche ni le rangement ni le dessin. Les
  courbes par défaut des quatre combinaisons de texte des boutons tiennent la
  garantie. Elle juge les courbes communes et n'établit pas les promesses
  d'une palette, dont la référence exacte remplace un cran (`[MOT-17]`) :
  seules ses promesses les établissent.

## 9. Sortie 1 : la planche

La planche dessine chaque palette dans Figma : ses rampes, ses variables par
dossier avec leurs garanties, et ses contrastes. Elle sert à
choisir une nuance, à présenter une palette et à comparer des palettes côte à
côte.

### 9.1 Emplacement et propriété

- `[PLA-01]` La planche vit sur une page dédiée, « Palettes », créée au premier
  dessin. Si une page de ce nom existe déjà sans être celle du plugin, le
  plugin crée « Palettes (UCM) ». Le designer choisit une autre page dans
  Gestion (`[PLA-29]`). Le suivi des cadres est rangé sous la clé
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
  Elle ne parcourt toutes les pages qu'au geste « Synchroniser »
  (`[UI-24]`). Tant que la recherche s'est bornée à la page de la planche,
  la ligne « Planche » d'un cadre introuvable invite à synchroniser et
  n'offre aucun geste. Le plugin charge la page de la planche et celles des
  cadres retrouvés, et aucune autre sans ce geste.
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
- `[PLA-06]` Le geste « Créer la planche » porte sur une palette : celle
  d'une fiche de l'onglet Gestion. « Tout mettre à jour » dessine aussi les
  planches en retard ou absentes (`[UI-28]`). Après une génération, le plugin appelle
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
- `[PLA-29]` La page des planches se choisit dans Gestion (`[UI-29]`) : une
  page du fichier, ou une page neuve dont le designer donne le nom. L'état lu
  porte la liste des pages, chacune avec son identifiant, son nom et son
  nombre de cadres possédés. `choisirLaPage` (`src/ecriture/planche.ts`),
  par la porte `choisir-page`, range la page dans le suivi `planche`, puis
  déplace chaque cadre possédé vers elle, à la place qu'un cadre neuf y
  prendrait (`[PLA-05]`), après `loadAsync` de la page ; un seul
  `figma.commitUndo()` clôt le changement. Un cadre copié, que le plugin ne
  possède pas, ne bouge pas. Un nom de page neuve déjà porté par une page du
  fichier est refusé, comme un suivi d'une version plus récente, avant toute
  écriture.

### 9.2 Le cadre d'une palette

Le cadre répond à la question que le designer se pose en posant un
composant : quelle nuance pour quelle variable, et est-elle lisible (récit R1,
maquette W3.6). Chaque thème se lit de haut en bas : les rampes des
intensités de la palette, les variables de chacune par dossier et par état, puis les
contrastes nuance par nuance ; la recette dit quelles parties se dessinent
(`[PLA-28]`). L'écran de réglages qui essaie la palette est dans l'onglet Création
(`[UI-14]`).

```text
┌ Bleu ─────────────────────────────────────────────────────────────────────┐
│ Bleu                                                                       │
│ Couleur de référence #1E6FD9 · Vivid · nuance 600                          │
├ Thème Light · fond de la page #F7F7F7 · texte des boutons blanc ── ✓ Toutes les garanties tenues ┤
│ Les deux rampes                                                            │
│        50     100    …    600    …    950                                  │
│ Soft   [≈]    [≈]    …    [  ]   …    [  ]    codes sous chaque pastille   │
│ Vivid  [≈]    [≈]    …    [◆]    …    [  ]                                 │
│ ◆ : la couleur de référence exacte. ≈ : Soft et Vivid presque identiques…  │
│ Quelle nuance pour quelle variable · Soft, puis la même section · Vivid    │
│                    default           hover             pressed             │
│ Fond plein         [Bouton]          [Bouton]          [Bouton]            │
│ solid              solid/default · 700   …  solid/foreground dessus : ✓ …  │
│ Fond teinté        [Fond teinté]     [Fond teinté]     [Fond teinté]       │
│ surface            surface/default · 100 …  texte et contour : 800         │
│ Sur la page        [Lien coloré]  [Champ]  [Anneau]  [Filet]               │
│ page               page/foreground · 700 …  page/divider · 300             │
│ Contrastes, nuance par nuance        une grille Soft, une grille Vivid     │
├ Thème Dark · fond #0A0A0A ── filet ───────────────────────────────────────┤
└────────────────────────────────────────────────────────────────────────────┘
```

- `[PLA-07]` L'en-tête donne le nom de la palette, puis la couleur de
  référence avec son numéro de nuance, et son profil porteur pour une palette
  à deux intensités. Chaque thème ouvre sur son fond et son verdict : « ✓
  Toutes les garanties tenues », ou le nombre de garanties manquées du thème,
  chaque intensité comptée, dans la couleur de danger. Le titre de la section
  donne le fond de la page du thème et son texte des boutons. La version de la recette, l'empreinte du modèle
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

- `[PLA-12]` Une pastille donne sa couleur et son code. Les variables d'une
  nuance se lisent dans les lignes de dossiers ; ses mesures, dans le détail d'une nuance de
  l'interface et dans le rapport.
- `[PLA-13]` Un repère posé sur une pastille, ◆ ou ≈, prend le noir ou le
  blanc, celui des deux qui contraste le plus avec elle.
- `[PLA-14]` Le calque de la pastille se nomme `{profil}/{mode}/{cran}`,
  `vivid/light/700` par exemple, sous le cadre de sa palette ; `{mode}/{cran}`
  pour la rampe d'une palette à une intensité. Ce nom permet de
  retrouver chaque couleur dans le panneau des calques, et reprend les
  segments de la clé d'une variable (`[VAR-01]`).
  Aucun autre calque ne porte ce nom : les pastilles des grilles se nomment
  `teinte {cran}`.
- `[PLA-15]` Une pastille où les deux profils se confondent porte ≈, sur les
  cinq fonds que juge l'alerte « Profils confondus » : `surface/hover` et
  `surface/pressed` en Light, `surface/default`, `hover` et `pressed` en Dark,
  au cran de la table de chaque thème ([section 11.3](#113-alertes)). Les
  autres pastilles n'en portent pas.
- `[PLA-16]` Les textes du cadre sont sélectionnables et copiables : un code
  se copie depuis la planche sans ouvrir le plugin.

### 9.4 Quelle nuance pour quel usage

La section s'intitule « Quelle nuance pour quelle variable ». Elle compte
trois lignes, une par dossier de la table du sens du thème, dans cet ordre :
`solid` (« Fond plein »), `surface` (« Fond teinté ») et `page` (« Sur la
page »). Une ligne dont aucune variable n'est présente est omise. Chaque ligne
donne à gauche le rôle du dossier, son nom en police de code et des exemples
d'emploi. Sous `solid`, elle dit aussi `solid/foreground` et le texte des
boutons du thème ; sous `surface`, `surface/foreground` et `surface/border`
avec leur nuance, dites une fois. La palette neutre ajoute sous `page` une note
sur `page/foreground-main`, corps de texte noir ou blanc purs hors de la
rampe. Une colonne par état, `default`, `hover` et `pressed`, dans cet ordre
dans les deux sens du thème ; la nuance de chaque variable vient de la table du
sens (section 11.2). Une cellule montre le spécimen d'une variable peint de sa
nuance, le nom de la variable avec son numéro de nuance, puis ses garanties. `page` n'a pas d'états : ses variables
`page/foreground`, `page/border` et `page/divider` se suivent sous les trois
colonnes.

| Variable | Spécimen |
|---|---|
| `solid/default`, `solid/hover`, `solid/pressed` | un bouton « Bouton » plein, écrit de `solid/foreground` |
| `surface/default`, `surface/hover`, `surface/pressed` | un aplat « Fond teinté », écrit de `surface/foreground` et bordé de `surface/border` |
| `page/foreground` | « Lien coloré » |
| `page/border` | un champ bordé |
| `ring` | un champ cerclé de l'anneau |
| `page/divider` | un filet |

- `[PLA-30]` `ring` n'appartient à aucun dossier : la planche lui donne une
  rangée au niveau de la palette, après les lignes `solid`, `surface` et
  `page`, avec son rôle, son nom et ses exemples comme une ligne de dossier ;
  sa cellule s'aligne sous la première colonne d'états et garde la largeur de
  l'anneau, 104 px, et ses garanties.
- `[PLA-17]` Les sept garanties du moteur sont représentées, dans chaque
  thème, lues dans les promesses du moteur : la planche ne juge rien. Une
  garantie dont le premier membre a une cellule se lit dans cette cellule,
  « sur » son fond. Sinon elle se lit sous le fond qu'elle juge, « dessus » :
  `solid/foreground` sous chacun des trois fonds de `solid`, `surface/foreground`
  et `surface/border` sous chacun des fonds de `surface` ; leur jugement contre
  la page se lit sous `surface/default`. Chaque ligne donne ✓ ou ✗, le
  contraste mesuré et son niveau WCAG (`[VER-13]`), dans le même texte. Une
  garantie manquée prend la couleur de danger, et son échec compte dans le
  verdict du thème. `page/divider` n'a aucune garantie : sa cellule dit « sans
  minimum de contraste ». Une garantie dont un cran manque à la liste n'a
  pas de ligne.
- `[PLA-18]` Une palette à deux intensités a une section de variables par
  profil, « · Soft » puis « · Vivid », quel que soit le porteur : deux
  palettes de même configuration donnent deux cadres de même structure,
  quelle que soit la saturation de leur référence. Une palette à une
  intensité a une section, sans nom de profil. Le cadre de Bleu compte
  1 778 calques à deux intensités et 914 à une, toutes parties dessinées.
- `[PLA-28]` `contenuDesPlanches` choisit les parties qu'un cadre dessine :
  la note sous les rampes, les trois lignes de dossiers (clé `usages`), les
  grilles de contrastes, et chaque thème, un au moins. L'en-tête et les rampes se dessinent toujours : leurs
  pastilles portent les couleurs que la palette écrit dans ses variables
  ([section 17](#17-sortie-2--les-variables)). Une partie retirée change l'empreinte du modèle : les cadres générés
  passent « À actualiser ». La carte « Contenu des planches », repliée en
  dernier dans l'onglet Palettes de la Configuration, porte un interrupteur par partie et le
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
  geste « Actualiser ». Le plugin ne redessine jamais sans ce geste.
  L'état du cadre se distingue du résultat des garanties : un ratio
  insuffisant n'est pas une panne de génération. L'onglet Gestion relit l'état
  à son ouverture, après chaque génération et au geste « Synchroniser », pour ce
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
  progression. « Tout mettre à jour » demande une confirmation
  (`[UI-28]`). Interrompue, elle nomme les palettes déjà générées et celles qui
  attendent ; « Réessayer » reprend à la palette fautive. Elle ne s'annule pas
  en cours de route. Le lot 6 mesure le temps de dessin de douze palettes
  et revoit ce seuil ; au-delà de dix secondes pour douze, le dessin d'une
  seule palette reste le geste par défaut.

## 10. Sortie 3 : la recette et le rapport

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
  chaque promesse avec sa garantie, nommée par ses variables, son contraste et
  son verdict, et chaque alerte avec sa mesure.
- `[VER-02]` Le rapport porte l'empreinte de la recette qui l'a produit, et le
  `texteDesBoutons` de chaque thème, qui donne le sens de sa table.
- `[VER-16]` Le rapport porte sa propre version, `formatDuRapport`, distincte
  de celle de la recette. Un champ ajouté la garde ; un champ ou un code
  d'alerte retiré ou renommé la monte. La version 2 ajoute l'ancrage de chaque
  palette (`[MOT-17]`) et le profil de couleur du document, et retire l'alerte
  de la référence plus claire que le bouton. La version 3 ajoute `intensites`,
  1 ou 2, et donne les crans d'une palette à une intensité en une liste par
  mode, sans clé de profil, et son ancrage sans profil. La version 4 nomme la
  garantie de chaque promesse par ses variables (`garantie.premier`,
  `garantie.fond`, `garantie.seuil`), sans numéro, et ajoute `texteDesBoutons`.
  La version 5 remplace la `distance` de l'alerte `palettes-proches` par sa
  `proximite` : la distance, le rôle, le thème et `presqueIdentiques`
  (`[VER-22]`).
  Le rapport garde toutes les alertes du moteur, y compris celles que l'interface montre ailleurs que dans
  la liste des messages.

## 11. Les vérifications

Les vérifications portent sur les hexas produits, contre les fonds de
référence de la recette.

### 11.1 Crans

- `[VER-03]` Chaque cran de chaque rampe reçoit son contraste contre le fond de
  référence de son mode, contre le blanc et contre le noir, et le seuil tenu
  contre le fond.
- `[VER-04]` Un cran n'a pas de verdict : seule une des sept garanties de la
  section 11.2 promet un contraste.

### 11.2 Promesses des emplois

Pour chaque palette, chaque mode et chaque intensité présente, sept garanties
G1 à G7 se jugent dans la table des dossiers du sens du thème, contre le fond
de la page, le réglage « Fond » du thème, `elevation/page`. G7 se juge aussi
contre la carte, `elevation/raised`, qui n'a pas de réglage dans le plugin : le
moteur la déduit du fond de la page (`[MOT-37]`). L'[architecture, section 4](../../Archi%20Tokens%20Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html)
explique le choix de cette table.

Le sens d'un thème vient de son texte des boutons, blanc (`#FFFFFF`) ou noir
(`#000000`) : Light blanc et Dark noir sont normaux, Light noir et Dark blanc
sont inversés (`sensDuTheme`). Le kit porte la suite :

- la table des dossiers, un cran par variable, thème et sens, est
  `TABLE_DES_DOSSIERS` (`packages/kit/src/emplois/dossiers.ts`) ;
- les libellés et définitions des variables sont dans
  `packages/kit/src/referentiel/theme.ts` ;
- le premier membre, les fonds et le seuil de chaque garantie sont dans
  `GARANTIES` (`packages/kit/src/emplois/garanties.ts`).

`ring` est une variable à la racine de la palette, hors des dossiers `solid`,
`surface` et `page`. `solid/foreground` prend le texte des boutons du thème.

Le neutre ajoute `page/foreground-main` (noir pur en Light, blanc pur en Dark,
dans les deux sens), `page/foreground-subtle` (le cran de `page/foreground`),
`scale/0` et `scale/1000` (blanc et noir en Light, échangés en Dark), puis les
trois variables `disabled/*`. Aucune de ces variables n'a de garantie.

- `[MOT-37]` La carte est le fond qu'une surface élevée pose sur la page. Aucun
  champ de la recette ne la porte : `couleurDeLaCarte(recette, mode)`
  (`packages/couleur/src/promesses.ts`) la déduit. Light : le blanc `#FFFFFF`.
  Dark : le moteur lit le fond Dark de la recette en OKLCH, cherche sur la
  courbe Dark le rang dont la clarté est la plus proche de la sienne, prend la
  clarté du rang suivant (le dernier rang, s'il n'y en a pas), et rend la
  couleur de cette clarté avec la teinte et la chroma du fond, la chroma
  réduite jusqu'à entrer dans le gamut, à 8 bits. Un fond au cran 50 donne une
  carte au cran 100 ; un fond teinté donne une carte de même teinte. Dans les
  promesses, la page et la carte sont deux désignations distinctes
  (`nature: 'fond'`, `fond: 'page'` ou `'carte'`), et la limite dynamique les
  distingue dans sa clé.
- `[VER-05]` Les seuils `texte` (4,5 par défaut) et `nonTexte` (3) viennent de
  la recette. Chaque garantie se juge par palette ; aucune ne croise deux
  palettes. Les crans requis d'un thème sont ceux que `cransRequis` tire de la
  table de son sens ; seul le cran 50 est facultatif. `[REC-05]` refuse une
  recette dont `crans` n'a pas les crans requis du sens de l'un de ses thèmes.
  Une variable dont le cran manque n'est pas présente, et une garantie qui la nomme n'est pas
  jugeable, comme un contrôle qui n'a pas lieu.

`solid/foreground` vaut le blanc ou le noir purs du thème, dans
les deux sens. G2 juge le bouton au repos dans les deux sens. Une référence
qui ne porte pas le texte des boutons reste ancrée, et le message de la
garantie manquée propose « Ajuster la référence ». Sur les quatorze
références de la recherche, à une et deux intensités et dans les quatre
thèmes, G1 n'échoue que sur la nuance où la référence est ancrée, G2 à G7
n'échouent jamais. Sur 864 références de toutes teintes, chromas et clartés,
G1 hors nuance ancrée tient dans les quatre thèmes.

Une palette à deux intensités compte 64 contrôles : seize par mode et par
profil. Une palette à une intensité en compte 32. Les deux profils partagent
leurs clartés, mais pas leur chroma : leurs contrastes diffèrent un peu, et
les composants citent l'un comme l'autre. L'interface et la planche nomment une
garantie par ses variables et son libellé, jamais par son numéro.

- `[VER-21]` G7 juge l'anneau contre la page et contre la carte : deux
  promesses, que la carte des garanties range dans deux colonnes, « sur la
  page » puis « sur la carte », et que la réglette montre par deux cases,
  « page » et « carte », avant celle des boutons. L'anneau peut tenir l'une et
  manquer l'autre ; la carte, plus claire que la page en Dark, est la plus
  exigeante. G7 ne vise plus `surface/default`.
- `[VER-06]` Une promesse manquée nomme ses deux variables, d'abord par leur
  libellé puis par leur nom (`surface/foreground` sur `surface/hover`), le
  mode, le profil pour une palette à deux intensités, son contraste mesuré et
  le minimum demandé. L'onglet Vérification la porte sur la ligne de sa
  garantie, dans la carte des garanties (`[UI-09]`), et non dans la liste des
  messages. Le compte reste celui des contrôles évalués, un par garantie,
  fond, mode et intensité. Aucun cran ne se propose : la table est commune à
  toutes les palettes. Le geste mène au réglage qui peut agir (section 11.4).
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
  courant : AA atteint, AAA non atteint ». Une garantie au minimum des textes se
  juge en texte courant ; une garantie au minimum des éléments visibles se juge
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
| Profils confondus | ΔEok entre `soft` et `vivid`, même cran et même mode, sur les cinq fonds que juge `[VER-11]`, dans le sens de chaque thème ; l'alerte sonne à trois | `profilsConfondus` | chaque palette du modèle à deux intensités, sauf des profils ternes par construction (`[ENT-09]`) |
| Palettes proches | le plus petit rapport entre la ΔEok de deux palettes et le seuil de son rôle, sur le plein et le fond teinté, en Light et en Dark (`[VER-22]`) | `palettesProches` | chaque paire de palettes colorées, ni libres ni figées |
| Référence plus terne que `soft` | part de la référence inférieure à la part de `soft` | sans seuil | chaque palette à deux intensités aux parts du designer |
| Fond hors de la courbe | [section 8.2](#82-les-fonds-de-référence) | sans seuil | chaque fond |

- `[VER-17]` « Palettes proches » lit une palette à deux intensités dans
  Vivid, et une palette à une intensité dans sa rampe unique (`[VER-22]`).
  Soft n'entre pas dans la comparaison.
- `[VER-22]` « Palettes proches » compare deux palettes colorées sur quatre
  couleurs : `solid/default` (rôle `plein`) et `surface/default` (rôle `fond`),
  chacun en Light et en Dark. Chaque cran vient de la table des rôles, dans le
  sens de chaque thème (`cranDeLaVariable`), lu dans la liste de la palette.
  Le texte des fonds teintés n'entre pas dans la comparaison. Une palette est
  colorée quand la chroma OKLCH de sa référence dépasse 0,05
  (`CHROMA_DES_PALETTES_COLOREES`). Une paire est comparée seulement si les
  deux palettes sont colorées, ni libres (liste de numéros propre) ni figées,
  et portent ces crans. Les fonds teintés, pâles, se comparent à
  `PART_DU_SEUIL_DES_FONDS` (0,2) du seuil `palettesProches`, soit 0,010 par
  défaut ; les pleins se comparent au seuil entier (`seuilDeProximite`). Le
  constat garde, parmi les quatre couleurs, celle dont le rapport distance sur
  seuil est le plus petit (la première à égalité, dans l'ordre plein Light,
  plein Dark, fond Light, fond Dark), avec son rôle, son thème et son seuil.
  La paire est trop proche quand la distance est sous le seuil du rôle retenu
  (`tropProche`), et presque identique sous 20 % de ce seuil. Le seuil des
  fonds n'a pas de champ dans la recette.
- `[VER-08]` Une alerte n'empêche rien. Elle dit ce qui ressemble, manque ou
  change, et mène au réglage qui la lève. Son message ne porte aucune ligne
  de mesure : la valeur et le seuil se lisent dans le rapport
  (`[VER-01]`). Une référence grise, noire,
  blanche ou hors de l'étendue de la liste ne produit aucun message : une
  palette peut partir de `#000000` ou de `#FFFFFF`. Sans parts du designer, le
  profil porteur a la part de la référence (`[ENT-11]`) : ni « Référence plus
  terne que `soft` » ni la notice « plus vive que `vivid` » ne sonnent.
- `[VER-10]` Une référence plus vive que `vivid` ne produit aucun message : la
  piste de saturation de la carte « Réglage global » porte
  un repère qui situe sa part, et le rapport garde la mesure. La référence exacte n'est jamais décrite comme plus terne
  qu'elle-même ; les nuances autour d'elle peuvent l'être.
- `[VER-11]` « Profils confondus » ne juge que cinq fonds, lus au cran que la
  table de chaque thème leur donne : en Light `surface/hover` et
  `surface/pressed`, en Dark `surface/default`, `surface/hover` et
  `surface/pressed`. L'alerte sonne quand trois des cinq se confondent (écart
  sous `profilsConfondus`), les deux thèmes réunis. Les pleins et les textes
  n'y entrent pas : Soft et Vivid les partagent à peu de chose près. Le fond
  Light `surface/default`, au cran 100, n'y entre pas non plus : l'écart
  possible entre deux couleurs aussi pâles est trop faible. Les fonds Dark y
  entrent sans exemption, puisque la borne de Soft à 0,15 les sépare. Les
  profils ternes par construction (`[ENT-09]`) restent sans alerte. Sur le
  balayage de 546 palettes jugées (36 teintes, six clartés, trois parts, texte
  blanc en Light et noir en Dark), l'alerte sonne pour 29. Elle ne sonne ni
  pour une palette à une intensité ni pour une palette libre.
  Sur la planche, la pastille d'un des cinq fonds où les deux profils se
  confondent porte ≈ (`[PLA-15]`) ; `confusionsDe` rend ces fonds, et
  `alertesDePalette` compte les mêmes. L'interface montre l'alerte dans la
  carte « Réglage global » de la palette, et son lien y focalise la réglette
  de saturation (`[VER-15]`). Les nuances concernées gardent un indice discret
  dans l'aperçu.

### 11.4 Sévérités et messages

| Sévérité | Emploi | Rang dans l'interface |
|---|---|---|
| Blocage | Le plugin ne peut ni enregistrer ni générer : recette illisible ou future, enregistrement refusé, police absente, génération interrompue | Premier, avant toute autre ligne |
| Promesse à corriger | Une des sept garanties n'atteint pas son minimum | Ensuite, signal de danger |
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
  phrase. Une fonction de présentation la choisit selon la cause connue. Le
  lien nomme le geste, ouvre la carte où il se fait, dépliée, et y focalise
  le réglage ; le message cite la même carte que son lien. Depuis
  Vérification, un lien vers un réglage de Création change d'onglet ; un lien
  vers la Configuration garde Vérification, où le retour rend le focus
  au lien. Le retour garde la palette, le thème, la nuance choisie et la
  position de lecture.

  | Le lien ouvre | Libellé |
  |---|---|
  | Création, « Réglage global », sur la réglette de saturation | Ajuster la saturation |
  | Création, « Réglage global » | Ajuster le réglage global |
  | Création, « Color shift » | Ajuster le Color shift |
  | Création, le champ de la référence | Changer la couleur de référence |
  | La modale « Ajuster la référence » | Ajuster la référence |
  | Configuration, onglet Palettes, « Luminosité des nuances » | Ajuster la luminosité des nuances |
  | Configuration, onglet Palettes, « Couleurs de fond » | Changer les couleurs de fond |
  | Configuration, onglet Palettes, « Intensités » | Ajuster les intensités communes |

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
  bouton « Tailwind » ramène la teinte du préréglage, et « Par défaut » ramène
  chaque grandeur à sa marque (`[DER-25]`). Chaque poignée et chaque
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
- `[DER-25]` Chaque réglette du Color shift porte sa marque par défaut
  (`[UI-38]`). Le défaut d'un bout de teinte est la valeur du préréglage
  Tailwind courant, rangée au centième ; celui de la saturation et de la
  luminosité est 0. La marque, le bouton « Par défaut », son état désactivé, la
  pastille de l'onglet, « Tout par défaut » et le résumé de la carte repliée
  emploient cette valeur. Le résumé (`Par défaut`, ou `Modifié :` et les
  grandeurs écartées) compare les valeurs au préréglage courant, et non
  l'origine rangée de la dérive, qui peut dater d'un relevé ancien. Les bouts de
  piste : familles voisines de la teinte de la référence pour la teinte, `plus
  terne` et `plus vive`, `plus foncée` et `plus claire`.

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
- `[UI-02]` Quatre onglets, **Création**, **Vérification**, **Comparaison**
  et **Gestion**, et un bouton « Configuration » dans l'en-tête, qui ouvre la
  Configuration (section 8.3) comme celui d'UCM Exporter ouvre sa
  configuration. Le
  designer crée une palette, vérifie ses contrastes, puis l'écrit dans
  Figma : chaque étape a son onglet. Création et Vérification portent sur la
  palette ouverte et partagent la barre du sélecteur (`[UI-23]`) ; Gestion
  porte sur le fichier. Le code nomme les onglets `creation`, `verification`,
  `harmonisation` et `gestion` : `ongletCreation.ts` et `#panneau-creation`,
  `ongletVerification.ts` et `#panneau-verification`, `ongletHarmonisation.ts`,
  `ongletGestion.ts` et `#panneau-gestion`. L'onglet Création ne génère rien et
  n'écrit aucune
  variable : ces gestes appartiennent à Gestion (`[UI-05]`). Le pied de
  Création mène à Vérification (`[UI-18]`), et le pied de Vérification à
  Gestion (`[VER-18]`).
- `[UI-21]` Au premier état lu dans le fichier, le plugin ouvre Gestion si la
  recette porte au moins une palette, Création sinon. Aucun état lu ensuite
  ne change d'onglet.
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
  Figma, du navigateur ou du système. Le champ « Language » de l'onglet Général
  de la Configuration propose chaque langue du registre sous son nom dans sa
  propre
  langue : `English`, `Français`. Il reste utilisable sans recette, avec une
  recette illisible ou future, et pendant un dessin. Le choix traduit tout ce
  qui est affiché, résultats et erreurs compris, sans reconstruire un élément
  ni envoyer de demande de rangement, de dessin ou de retrait. Il se range dans
  `figma.clientStorage` sous `ucm-palettes.langue` ; une valeur absente ou
  inconnue donne l'anglais. Un refus du stockage garde la langue pour la
  session et propose de réessayer. La recette, le rapport, les empreintes et
  les textes des planches ne dépendent pas de la langue : les planches restent
  en français.
- `[UI-37]` Une liste déroulante `select.input` prend la police de
  l'interface, perd sa flèche native pour un chevron de 8 × 5 px de la
  couleur du texte secondaire, dans les deux thèmes, et prend le fond de
  survol sous le pointeur. Parmi des boutons, dans `.carte-choix` ou avec
  `.champ-prereglage` (« Teinte Tailwind »), elle mesure 24 px de haut, sur
  une largeur automatique ; la liste de la langue garde ses 32 px, sur toute
  la largeur.

### 13.2 Écrans

Onglet Création, une palette ouverte :

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [● Bleu marque              ▾] [Nouvelle palette] [⋯]                 │
│   la création s'ouvre ici, en carte, seulement après [Nouvelle …]     │
│ Palette Bleu marque                          Aperçu [Light|Dark]      │
│ ┌ ⌄ Configuration de la palette ──────────────────────────────────┐  │
│ │ Nom de la palette               Couleur de référence            │  │
│ │ [Bleu marque                ]   [■ #1E6FD9     ]                 │  │
│ │                                 Ajuster la référence            │  │
│ │ Modèle      [Standard|Libre]                                    │  │
│ │ Intensités  [Une|Deux]                                          │  │
│ │ Une variante douce « Soft » et une variante vive « Vivid ».     │  │
│ │ Référence exacte dans  [Auto|Soft|Vivid]                        │  │
│ │ Auto a choisi Vivid                                             │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│ ┌ ▦ Aperçu · Les nuances sur le fond de la page ──────── Fond [■] ─┐  │
│ │ ┌ surface peinte du fond de la page ────────────────────────┐  │  │
│ │ │         50 100 200 300 400 500 600 700 800 900 950        │  │  │
│ │ │ Soft  ┆┆ ■   ■   ■   ■   ■   ■   ■   ■   ■   ■   ■        │  │  │
│ │ │ Vivid ┆┆ ■   ■   ■   ■   ■   ■   ◆   ■   ■   ■   ■        │  │  │
│ │ │ solid     texte des boutons · repos · survol · appui      │  │  │
│ │ │ surface   repos · survol · appui · texte · contour        │  │  │
│ │ │ page      filet · anneau de focus · texte · contour       │  │  │
│ │ │ détail de la nuance choisie                                │  │  │
│ │ └────────────────────────────────────────────────────────────┘  │  │
│ │ ◆ Référence : Vivid · nuance 600                                │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│ Ajuster la palette                                                   │
│ Le réglage global déplace toute la rampe. Le Color shift écarte …    │
│ ┌ › ▭ Réglage global ─────────────────────────────── Par défaut ┐    │
│ ┌ › ◆ Color shift ──────────────────────────────────── Par défaut ┐   │
│ ┌ › Interface de test ─────────────────────── Thème Light · Vivid ─┐ │
├──────────────────────────────────────────────────────────────────────┤
│ ✗ 2 garanties manquées sur 76 · 1 alerte · text 700 / …  [Vérifier] │
└──────────────────────────────────────────────────────────────────────┘
```

Onglet Création, fichier sans palette :

```text
┌──────────────────────────────────────────────────────────────────────┐
│ ┌ encart au fond bleuté ──────────────────────────────────────────┐  │
│ │ ▪▪▪▪▪▪▪▪▪▪▪  rampe d'exemple                                    │  │
│ │ Créez votre première palette                                    │  │
│ │ une phrase                                                      │  │
│ │ [Nouvelle palette]                                              │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│ Ce fichier porte déjà 3 palettes dans ses variables. Les voir dans … │
└──────────────────────────────────────────────────────────────────────┘
```

À 500 × 520, la même disposition tient en largeur : le nom de la palette se
coupe, les noms de profil
restent à gauche des rangées, et les trois colonnes de « Configuration de la
palette » gardent leurs libellés au-dessus des champs.

- `[UI-04]` L'aperçu occupe la largeur utile de sa carte : ses colonnes se
  calculent après les espacements et les bordures réels. La carte est fixe et
  toujours ouverte, sans chevron. Son en-tête porte un glyphe (`[UI-19]`), le
  titre « Aperçu » et le sous-titre « Les nuances sur le fond de la page »,
  comme les autres cartes titrées, puis, à droite, la pastille du fond de la
  page du thème montré, que la bascule « Aperçu » de la ligne du titre choisit (`[UI-23]`).
  La pastille est un bouton de saisie, hors des choix d'affichage : elle
  ouvre le sélecteur de couleur sur ce fond, et une ligne sous le sélecteur
  dit que le fond vaut pour toutes les palettes. La saisie change le réglage
  commun `fonds`, que l'onglet Palettes de la Configuration montre aussi. L'étiquette
  accessible du bouton nomme le thème et la valeur. Sous la surface, la ligne
  « ◆ Référence : Vivid · nuance 600 », coupée par une ellipse, nomme le profil porteur et la nuance du
  thème montré ; une palette à une intensité écrit « ◆ Référence : nuance
  600 ». La surface est peinte du fond de la page du thème choisi,
  et ses textes, bordures, sélection et focus prennent des couleurs lisibles
  sur ce fond ; le reste du panneau garde le thème de Figma. Chaque colonne
  porte son numéro de nuance, aligné entre Soft et Vivid. Une case
  tiretée précède les rampes sur la hauteur des deux rangées : peinte du fond
  de la page, détachée par un contour tireté, elle est le texte des boutons du
  thème, `solid/foreground`, blanc ou noir purs selon le réglage.
  Sous les rampes, trois bandes à fond léger, `solid`, `surface` et `page`,
  dans cet ordre, nomment les variables que la table du sens du thème montré
  prend à chaque nuance ; les crans changent avec le thème montré et avec son
  texte des boutons. Chaque bande porte en première colonne le spécimen de
  son dossier, le nom du dossier en police de code dans un cadre peint de ses
  variables, avec son rôle dessous : « fond plein », « fond teinté », « sur la
  page ». Le spécimen prend les couleurs de Vivid, ou de la rampe unique :
  `solid/default` et `solid/foreground` pour `solid`, `surface/default`,
  `surface/border` et `surface/foreground` pour `surface`, `page/border` et
  `page/foreground` pour `page`. Une rayure, sous les nuances que couvre un
  groupe de variables, peint une petite pastille par nuance et par intensité ;
  `solid/foreground` n'a qu'une petite pastille, du texte des boutons, sous la
  case tiretée. Sous chaque rayure, le code du groupe en police de code, puis
  son nom français. `solid` porte `foreground` (texte des boutons) et
  `default · hover · pressed` (repos · survol · appui), `surface` porte
  `default · hover · pressed` et `foreground · border` (texte · contour), `page`
  porte `divider` (filet), `ring` (anneau de focus) et `foreground · border`.
  Dans le sens inversé, `solid` s'écrit `pressed · hover · default` sous 500,
  600 et 700. La palette du neutre lit `foreground-subtle · border` (texte
  secondaire · contour) dans `page`, et une note sous la surface dit que
  `page/foreground-main` est un corps de texte noir ou blanc pur, hors de la
  rampe. À 500 px, un libellé qui ne tient pas dans sa plage passe à la ligne
  après un « · », sans chevaucher son voisin. Les bandes sont décoratives pour
  l'assistance technique : elles ne se focalisent pas et ne dessinent pas les
  états.
  Le survol lie les nuances aux variables. Survoler ou focaliser une pastille,
  une petite pastille, un code, la case tiretée ou le spécimen d'un dossier
  surligne ce que la table du sens du thème relie à cette cible : les codes et
  les petites pastilles du cran, et la pastille du même cran dans l'autre
  intensité ; le spécimen d'un dossier atténue les autres pastilles et les
  autres bandes. La nuance choisie garde son surlignage, qu'un survol remplace
  le temps du survol. Le surlignage ne porte ni délai ni animation, et suit le
  thème montré et son texte des boutons.
  La nuance qui porte la référence exacte montre un repère fixe ◆, et la
  sélection d'une nuance est un anneau plein de 2 px de l'encre du fond,
  séparé de la pastille par un liseré du fond ; le focus reste un contour
  tireté. Un clic, Entrée ou Espace ouvre le détail d'une nuance ou de la
  case tiretée à une place stable, qui peut grandir sans couper le
  texte (`[UI-10]`). Le même geste sur la cellule déjà choisie la relâche et
  referme le détail, et le focus reste sur elle ; le survol surligne
  les variables liées sans déplacer la page. Les flèches, Origine et Fin déplacent le focus ;
  une copie de code est un geste distinct de la sélection.
- `[UI-05]` La génération et l'écriture des variables appartiennent à
  l'onglet Gestion (`[UI-26]`). Le geste de la ligne « Planche » d'une fiche
  dit l'état du cadre : « Créer la planche » sans cadre, ou pour un cadre
  resté introuvable après une recherche sur toutes les pages (`[PLA-26]`),
  « Actualiser » quand le cadre a changé. Un cadre à jour ou illisible n'en
  a pas. « Afficher » suit quand le cadre est localisé. Les gestes prennent la taille
  compacte du bouton du socle, 24 px, comme ceux de la carte d'une palette
  supprimée. Le geste enregistre la palette si un rangement est en attente,
  puis génère son cadre, grille des contrastes comprise : la génération n'a
  pas d'option. Pendant la génération, les quatre onglets sont inertes. La
  progression, l'erreur, la confirmation des calques étrangers ou les écarts
  de peinture se lisent sous le bloc de la connexion, dans l'onglet
  Gestion : un nouveau résultat remplace le précédent. Les
  onglets Création et Vérification n'en montrent aucun. « Nouvelle palette »
  est le seul bouton principal de l'onglet Création, et un filet sépare la
  barre du sélecteur et la création de la palette ouverte, à 15 px de
  chacune.
- `[UI-09]` La carte « Garanties de contraste » est dans l'onglet
  Vérification (`[VER-18]`), fixe et toujours ouverte, sans chevron ni
  résumé. Elle montre le thème que la bascule « Aperçu » de la ligne du titre
  a choisi (`[UI-23]`) ; son en-tête ne le nomme pas et ne le choisit pas. Le
  corps s'ouvre sur une rangée dont le choix « Afficher », calé à droite, a
  la forme des autres choix d'affichage (`[UI-12]`) : le libellé précède les
  segments Soft et Vivid, dans cet ordre, qui choisissent le profil affiché
  sans rien régler ; une palette à une intensité n'en a pas, et son résultat
  s'écrit « Garanties ✓ » ou « Garanties ✗ 2 » (`[ENT-14]`). Chaque segment
  porte le résultat de son profil dans le thème montré : ✓, ou ✗ suivi du
  nombre de contrôles manqués (`[VER-06]`). À l'ouverture d'une palette, le
  profil porteur est choisi. Quand l'autre thème a des garanties manquées,
  une ligne les compte et son lien montre ce thème dans la bascule du titre ;
  « Revenir au thème » ramène au thème d'avant.
  Une réglette montre deux cases, la page et les boutons, puis les nuances du
  profil choisi, numérotées. La case de la page est peinte du fond de la page
  du thème, celle des boutons du texte des boutons, blanc ou noir purs. Comme
  le graphe de la dérive, la réglette suit la largeur de sa colonne sans
  grandir : le pas des cases se calcule sur la largeur mesurée, et les cases,
  les numéros et les arcs gardent la taille qu'ils ont dans la fenêtre
  minimale. La garantie choisie s'y trace en éventail : un arc part d'un seul
  point, la nuance de son premier membre, ou la case des boutons pour
  `solid/foreground`, vers chacun de ses fonds, un arc par colonne. Le trait
  est plein pour `default`, tireté pour `hover`, pointillé pour `pressed` et
  tiret-point pour la page. Un arc en échec prend la couleur de danger, et une
  légende d'une ligne nomme les quatre traits et rappelle que le texte garde
  sa nuance dans tous les états : seul le fond change.
  La liste donne une ligne par garantie de la section 11.2, nommée par ses
  variables et son libellé, jamais par son numéro. Les garanties se rangent
  dans deux encadrés : « Textes lisibles » au minimum texte, « Éléments
  visibles » au minimum non textuel, chacun avec son titre en bandeau et son
  minimum lu dans la recette. Sous le bandeau, les quatre colonnes de fonds,
  « sur la page », `default`, `hover` et `pressed`, se nomment une fois. Une
  ligne porte la relation (« `surface/foreground` sur `surface/*` et la
  page »), où `surface/*` désigne les trois états du dossier, et le libellé de
  son premier membre (« texte sur fond teinté »). La ligne de
  `solid/foreground` ajoute que ce texte suit le réglage « Texte des boutons »
  du thème. Chaque fond jugé s'écrit dans sa colonne : le spécimen à gauche, les deux
  numéros comparés (« 700 / 100 », « Blanc / 700 », « 700 / page »), puis le ratio avec ✓
  ou ✗ et son badge de niveau (`[VER-13]`) sur une seule ligne, « ✗ 21,00 » et
  « AA ✗ » compris. Une garantie qui ne vise pas un fond laisse sa case vide.
  Sous 900 px de fenêtre, la relation passe au-dessus des quatre cases, qui se
  partagent la largeur, le spécimen passe au-dessus des numéros et du ratio,
  et le nom de chaque colonne se centre sur elle. La ligne choisie prend le
  fond de survol et une barre de 3 px écartée du texte. Une ligne en échec
  porte le fond fautif (« Sur la page » ou « État hover »), son ratio et le
  minimum, puis les liens vers les réglages qui peuvent agir (`[VER-15]`),
  « Ajuster la référence » (`[UI-15]`) en dernier. La liste se termine par
  `page/divider`, le filet : une phrase dit sa nuance et qu'il n'a pas de
  minimum de contraste.
  Une ligne se choisit au clic ou au clavier. Au départ, la première ligne en
  échec est choisie, sinon la garantie de `surface/foreground` ; le choix
  redessine les arcs et se conserve au changement de profil et de thème. Chaque
  ligne porte une étiquette accessible qui dit la relation, le libellé, puis
  chaque fond avec ses numéros, son ratio et son résultat. La réglette est
  décorative pour l'assistance technique, et le choix du profil annonce le
  résultat du profil qu'il ne montre pas.
- `[UI-10]` Le détail d'une nuance se lit en trois rangs. L'en-tête : une
  grande pastille, « Vivid · 700 » en titre, son code hexadécimal et
  « Copier » ; celui de la référence ajoute « ◆ Votre couleur de référence
  exacte ». Puis chaque groupe dans son encadré, titré en capitales
  discrètes, et OKLCH replié. Dans l'encadré « Sert à », une ligne
  par variable que la table du sens du thème montré prend à cette nuance : un
  spécimen, le code de la variable puis son libellé (« `surface/foreground` ·
  texte sur fond teinté »), puis chacune de ses garanties, avec ✓ ou ✗, « sur »
  son fond quand la variable est le premier membre ou « dessus » son premier
  membre quand elle est le fond, le contraste et son badge (« ✓ sur
  `surface/default` : 5,78 AA »). Un clic sur la garantie ouvre Vérification
  et l'y choisit dans la carte des garanties (`[VER-20]`). La case tiretée a
  son propre détail : `solid/foreground`, le texte des boutons du thème, blanc
  ou noir purs, posé sur `solid/default`, avec ses garanties pour chaque
  intensité. Une nuance qu'aucune variable ne prend a l'encadré « Sans rôle »,
  qui dit qu'aucun usage prédéfini ne la vise. Toute nuance porte ensuite
  l'encadré « Contrastes de la nuance » : fond de la page, blanc et noir, chacun avec son ratio et son badge
  de texte courant (`[VER-13]`), puis la mention d'une nuance identique ou
  confondue. Les valeurs OKLCH se replient sous « OKLCH ». Aucun contraste ne
  s'écrit deux fois, et aucun ratio ne s'affiche sans le nom de ce qu'il
  compare.
- `[UI-11]` Le titre de premier rang est « Palette [nom] », avec le nom que le
  sélecteur affiche, en tête de sa ligne ; la bascule « Aperçu » Light/Dark le
  suit, calée à droite (`[UI-23]`). Il suit un changement de nom pendant
  la saisie, sans retirer le focus du champ. Dessous ne se lisent que le refus
  d'un enregistrement et le conflit, avec leurs gestes ; un enregistrement
  réussi ne s'annonce pas. La carte « Configuration de la palette » est
  repliable et ouverte à l'ouverture du plugin. Repliée, son en-tête porte un
  résumé : le nom, la référence, le modèle et le nombre d'intensités ; une
  palette figée ne montre que son nom. Créer une palette, depuis
  « Nouvelle palette » ou depuis l'invitation d'un fichier sans palette,
  replie la carte de la palette créée et met le focus sur son bouton de repli.
  Ouvrir une autre palette ou revenir d'un autre onglet ne change pas son
  état. Un message de Vérification qui mène à un réglage de cette carte la
  déplie avant de focaliser le champ. Ouverte, elle montre la
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
  palette libre n'a ni bandes, ni case tiretée, ni carte des
  garanties, et chaque bilan de garanties dit « Palette libre · N nuances ».
  Le détail d'une nuance libre ne lui prête aucun rôle. Standard rend la
  liste commune.
- `[UI-12]` Après l'aperçu, le titre de section « Ajuster la palette » et sa
  phrase, « Le réglage global déplace toute la rampe. Le Color shift écarte
  ensuite les nuances claires et sombres de la référence, qui ne bouge
  pas. », précèdent deux cartes repliables de même forme, repliées à
  l'ouverture, qui gardent leur état pendant la session : « Réglage global »,
  sous-titrée « Teinte, saturation et luminosité de toute la rampe », puis
  « Color shift » ([section 12](#12-le-color-shift)), dont le choix Soft ou
  Vivid porte le même libellé « Régler », sans « Les deux » (`[DER-12]`).
  Leur en-tête est un conteneur : un
  bouton de repli, avec chevron, glyphe (`[UI-19]`), titre et sous-titre, puis
  un résumé aligné à droite, sur une ligne, et à côté du bouton, hors de lui,
  l'emplacement des choix. Tous les choix d'affichage ont une seule forme :
  un libellé, puis des segments, avec les mêmes boutons et la même
  typographie (`src/ui/choix.ts`). Carte ouverte, l'en-tête montre ses choix,
  calés à droite, et cache son résumé ; carte repliée, il montre son résumé et
  cache ses choix. Un clic sur un segment ne replie pas la carte. À 500 px,
  des choix qui ne tiennent pas à côté du titre passent sous lui, calés à
  droite. Les cartes fixes, sans bouton de repli, posent leurs choix sur une
  première rangée de leur corps, calée à droite : les garanties
  (`[UI-09]`). Le résumé de la première donne les
  réglages modifiés, ou « Par défaut » (`[UI-38]`). La
  première porte, dans son en-tête, le libellé « Régler » et les segments
  « Soft · Vivid · Les deux », le ◆ sur le profil porteur ; son corps porte
  une ligne fixe (`[UI-17]`), puis trois rangées : Teinte,
  Saturation et Luminosité, chacune avec sa réglette peinte par le moteur,
  son champ, la teinte absolue après le champ de la teinte, et « Par défaut » ;
  un double-clic sur la piste remet aussi la valeur par défaut. Chaque réglette prend la limite
  de `[DER-19]` pour la cible choisie, avec `reglerTeinte`,
  `reglerSaturation` ou `reglerClarte` comme candidate, ses hachures
  (`[DER-21]`) et sa ligne de butée (`[DER-22]`), sous les réglettes, vide
  sans butée. Les limites ne se calculent que carte dépliée. La Configuration
  reste sans limite : elle touche toutes les palettes à
  la fois. Un pas au clavier vaut 1°, 1 % ou 0,005, et Maj le multiplie. Sur
  chaque piste, le nom de l'autre profil situe sa valeur quand un seul
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
  focaliser le contrôle. Les deux cartes suivent l'aperçu, et l'Interface de
  test (`[UI-14]`) ferme l'onglet : la palette se règle dans Création et se
  juge dans Vérification (`[VER-18]`).
- `[UI-38]` Le corps de la carte « Réglage global » commence par une rangée
  `.tete-des-reglages` qui cale à droite « Tout par défaut » : il remet
  teinte, saturation et luminosité du profil choisi dans « Régler », ou des
  deux profils avec « Les deux », et reste inactif quand ces réglettes sont
  toutes à leur valeur par défaut. Chaque réglette pose une marque
  (`.reglette-defaut`) à sa valeur par défaut, avant le pouce dans le DOM,
  avec le survol « Valeur par défaut : » et la valeur écrite comme dans le
  champ. Le libellé « par défaut » (`.reglette-legende`) se centre sous la
  marque quand le pouce s'en écarte de plus de 4 points de la course. Deux
  mots nomment les bouts de la piste (`.reglette-bout`) : « plus terne » et
  « plus vive », « plus foncée » et « plus claire », et pour la teinte « plus »
  suivi de la famille voisine de la teinte absolue affichée, dans le sens des
  degrés décroissants à gauche et croissants à droite. Huit familles, de
  centres 0° rose, 29° rouge, 62° orange, 100° jaune, 145° vert, 195° turquoise,
  255° bleu, 300° violet ; la voisine d'un sens est le centre le plus proche
  dans ce sens à plus de 10° de la teinte (257° : turquoise et violet).
  Un bout que le libellé frôle à moins de 6 px se masque, et se remontre
  quand le libellé disparaît. Teinte et luminosité valent 0 par défaut. La
  saturation d'un profil vaut sa part commune ; celle du profil qui porte la
  référence, ou d'une palette à une intensité, vaut la saturation de la
  référence rendue à son départ (`retablirLaSaturation`, sans part propre).
  Une réglette est modifiée quand sa valeur s'écarte du défaut de plus de
  0,5 point de sa course, pour l'un des profils visés. Elle ajoute alors
  une pastille (`.pastille-reglee`) après son nom, active son bouton
  « Par défaut » (survol « Revenir à la valeur par défaut, » et la valeur)
  et le laisse désactivé sinon. Le nom de l'autre profil remplace sa lettre
  sur la piste. Carte repliée, le résumé dit « Par défaut », ou « Modifié : »
  suivi de « teinte de Soft », « saturation de Vivid » ou « luminosité de
  Soft », dans l'ordre teinte, saturation, luminosité puis Soft avant Vivid,
  sans valeur ; une palette à une intensité écrit « Modifié : teinte,
  luminosité ». Un nombre de points à vérifier s'ajoute après, comme avant.
  Les tests `[UI-38]` de `tests/familles.test.ts`,
  `tests/reglagesParDefaut.test.ts`, `tests/textes.test.ts` et de l'interface
  les tiennent. La marque, le libellé, les bouts et la pastille sont des
  champs facultatifs de `EtatDeLaReglette` (`src/ui/derive/reglette.ts`) :
  une réglette sans eux reste celle d'avant.
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
  message, et « Vérifier ». Il est fixé au bas de la fenêtre : il reste visible
  à toute position de défilement, pendant un geste compris, et quand le
  contenu est plus court que la fenêtre. « Vérifier » ouvre l'onglet
  Vérification sur la palette ouverte, où se lisent les messages et leurs
  liens (`[VER-18]`) ; le pied n'a pas de volet. Une
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
  dans l'onglet Création, Configuration de la palette, Interface de test et
  la création d'une palette ; dans l'onglet Vérification, Garanties de
  contraste ; dans l'onglet Palettes de la Configuration, Couleurs de fond,
  Intensités, Luminosité des nuances,
  Minimums des promesses, Détection des couleurs proches et Contenu des
  planches ; dans l'onglet Gestion, Palettes et réglages. Une fiche ou une
  carte titrée par un nom de palette n'en a pas. `src/ui/glyphes.ts` les
  dessine, d'après la planche des glyphes de la maquette du Color shift.
- `[UI-20]` Pendant un geste, aucun contrôle de l'onglet Création ne se
  déplace, et aucun élément ne change de hauteur. Cinq règles le tiennent :
  1. chaque avertissement tient sur une ligne fixe (`[UI-17]`), présente
     même sans avertissement ;
  2. son texte entier s'ouvre au clic, dans une bulle superposée ;
  3. le bilan des garanties et des alertes passe dans le pied (`[UI-18]`),
     et son détail dans l'onglet Vérification, qui ne se rend que visible ;
  4. le résumé d'une carte repliable tient sur une ligne, coupé par une
     ellipse, texte entier au survol et pour le lecteur d'écran ; le titre ne
     se coupe pas ;
  5. les messages s'annoncent au lecteur d'écran une fois, à la fin du geste.

  Dans l'onglet Comparaison, la liste des paires et la liste des constats de
  la carte « Aperçu » gardent leur plus grande hauteur depuis l'entrée dans
  l'onglet (`data-hauteur-tenue`, `tenirLesHauteurs`) : un constat qui
  raccourcit ou une rangée qui se sépare ne remonte pas les réglettes. Une
  zone qui grandit pour une information nouvelle reste visible. L'entrée dans
  l'onglet efface ces hauteurs ; une zone dans une carte repliée n'en prend pas.

  L'état du geste se pose à un seul endroit, celui où la prévisualisation et
  la validation passent. Un test d'interface Chromium glisse les curseurs de
  la carte « Réglage global », une poignée et une réglette du Color shift sur
  une palette placée près d'un seuil, relève la position du contrôle à chaque
  image, et échoue au premier pixel d'écart.
- `[UI-14]` L'Interface de test est la dernière carte de l'onglet Création,
  repliée à l'ouverture. Elle montre la palette ouverte, peinte dans le thème
  de la bascule « Aperçu » de la ligne du titre (`[UI-23]`), en deux vues
  qu'un choix « Vue » (« Écran », « États ») détermine, et la vue
  choisie dure la session. L'en-tête de la carte ouverte porte ce choix puis,
  pour une palette à deux intensités, le choix du profil peint : le libellé
  « Afficher », puis Soft et Vivid, dans cet ordre, sans « Les deux ». Il
  s'ouvre sur le profil porteur ; changer de palette le rouvre sur le porteur.
  Un seul écran est peint, du profil choisi, et le résumé de la carte nomme le
  thème et ce profil. Une palette à une
  intensité est peinte de sa rampe unique, sans le choix du profil, et son
  en-tête ne garde que « Vue ». « Écran » : une page « Membres de
  l'équipe » sur le modèle de Radix Themes, en HTML, avec une navigation dont
  l'entrée courante est en `surface`, un encart en `surface`, un tableau dont
  une ligne se choisit, des badges `surface`, `solid` et `page`, un champ
  bordé de `page/border` et cerclé de `ring` au focus, une case et un
  interrupteur en `solid`, et trois boutons, sans fond, `surface` et
  `solid`. Le survol et l'appui prennent les fonds `hover` et `pressed` de
  `solid` ou de `surface` ; le texte ne change pas avec l'état. Les
  contrôles se manipulent sans rien enregistrer. « États » : une rangée par
  composant, boutons plein, soft, contour et sans fond, champ, lien et
  badge, et une colonne par état, `default`, `hover`, `pressed` et `focus`,
  chaque cellule peinte de son état sans survol. Le focus garde la forme du
  repos et ajoute l'anneau `ring` ; un composant qui n'a pas un état
  garde un tiret. La vue n'a pas de ligne « Carte » : la table ne donne pas
  de fond de carte à la palette, `elevation/raised` n'ayant pas de réglage.
  Survoler un élément ou un spécimen ouvre une bulle sous lui : une ligne par
  propriété qu'il peint, fond, texte, contour, anneau, coche, icône,
  pastille ou séparateur, avec la variable en police de code et sa nuance,
  le texte des boutons pour `solid/foreground`. La bulle est une aide à la
  souris, cachée aux lecteurs d'écran ; au clavier, rien ne change. Chaque
  couleur vient de la table des dossiers du sens du thème montré. Une palette
  libre n'a pas cette carte. La planche ne porte pas cet écran.
- `[UI-15]` « Ajuster la référence », sous le code ou parmi les réglages
  d'une garantie en échec, ouvre une modale centrée au-dessus du panneau,
  sur un voile assombri : 520 px de large au plus, 16 px de marge à la
  fenêtre, défilante quand la hauteur manque. Le reste de la page est
  inerte, et Tab reste dans la modale. Elle part de la référence rangée.
  En tête, sous le titre, une phrase dit pourquoi ajuster, une idée par
  phrase, sans ratio : « La palette utilise votre couleur telle quelle. En
  Thème Light, elle est trop claire pour « anneau de focus » (`ring`). »,
  avec la variable de la première garantie manquée de chaque thème, son
  libellé puis son nom, trop claire en Light, trop sombre en Dark. Suivent l'originale et la proposition en grandes pastilles côte à
  côte ; « − » et « + » par pas de 0,01 de la luminosité du profil porteur
  (`[ENT-15]`), de −5 à +2 pas, et entre eux une piste qui peint les
  propositions voisines ; une ligne qui donne la nuance visée, que la
  luminosité ne change pas (`[MOT-17]`) ; le code de la proposition,
  saisissable, qui prend le pas le plus proche ; les garanties
  manquées avant ou après, en tableau (garantie, thème, avant, après et son
  badge), la garantie nommée par ses deux variables, qui passent à la ligne
  entre elles et jamais dans un nom, le thème et l'intensité passant en titre de groupe sous 552 px
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
  de la création, celles des deux fonds de la Configuration et celle du
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
  du sandbox à un rangement n'y montre qu'un refus. Pendant la saisie d'un fond
  de la Configuration, seul son aperçu compact suit : le tracé et la garantie
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
  hexa, avec une pastille de sa référence, par teinte comme la liste
  de Comparaison (`[UI-40]`) ; le nuancier de l'accueil suit le même ordre.
  À l'ouverture du plugin, aucune palette n'est choisie : le sélecteur dit
  « Sélectionner une palette », le menu « … » se cache, et sous le filet se
  lisent le titre de premier rang « Choisissez une palette » et une phrase
  qui renvoie à la liste et à « Nouvelle palette », sans geste propre. Un
  choix dure jusqu'à la fermeture du plugin et ne se range pas. Une palette
  choisie qui disparaît, par un import ou une autre session, ramène à cet
  état ; une palette supprimée ouvre celle qui suit dans le sélecteur, ou la
  précédente si elle était la dernière. Un fichier sans palette montre
  l'encart de `[UI-22]`. Sa liste déroulante prend toute la
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
- `[UI-22]` Dans un fichier sans palette, l'onglet Création montre un encart
  au fond bleuté, mélange du rôle `--fond-marque` et du fond de la page : une
  rampe d'exemple, le titre « Créez votre première palette », une phrase et
  le bouton « Nouvelle palette ». Le bouton remplace l'encart par la carte de
  création de `[UI-06]` ; « Annuler » y ramène. Quand les variables du
  fichier portent au moins une palette (`[VAR-12]`), une ligne sous l'encart
  le dit, « Ce fichier porte déjà 3 palettes dans ses variables. », et son
  lien « Les voir dans Gestion » ouvre l'onglet Gestion.
- `[UI-23]` La barre de la palette, liste déroulante, « Nouvelle palette » et
  menu « … », avec la confirmation de suppression,
  existe en un seul exemplaire (`src/ui/barreDePalette.ts`). Elle se place
  dans le panneau de l'onglet actif, Création ou Vérification, au changement
  d'onglet : aucun de ses éléments ne se reconstruit, et elle garde sa
  palette et son état ouvert ou fermé. Depuis Vérification, « Nouvelle
  palette » passe d'abord à Création. Chaque option de la liste porte à droite
  le verdict de sa palette (`[VER-19]`), ✓, ! ou ✗, et le bouton porte celui
  de la palette ouverte ; le nom accessible de l'option dit le verdict en
  mots.
  La barre est un bloc ordinaire : elle défile avec la page et ne porte aucun
  choix de thème. Le thème se choisit dans la ligne du titre « Palette [nom] »
  (`src/ui/basculeDuTheme.ts`), que Création et Vérification rendent chacune
  et qui est un enfant direct de la vue de la palette. Le titre s'y coupe par
  une ellipse, et la bascule suit, calée à droite : le libellé « Aperçu », puis
  les segments « Light » et « Dark », de la forme des autres choix
  d'affichage (`[UI-12]`), sans cerne de la couleur de marque. Elle choisit le
  thème que l'aperçu, la carte des garanties, le Color shift et l'Interface
  de test montrent ; le segment pressé prend le fond de la page, comme dans
  tous les choix, et garde `aria-pressed`. La ligne se cache quand aucune
  palette n'est ouverte ; une palette libre la garde. Le thème s'ouvre en
  Light, ne se range ni dans la recette ni dans `figma.clientStorage`, ne
  modifie aucune palette, et son changement n'envoie aucune demande au
  sandbox. « Modifier », dans une fiche de Gestion, ouvre la palette dans le
  thème de cette fiche. La ligne du titre reste en haut du panneau pendant le
  défilement, sur un fond opaque : choisir Dark depuis l'Interface de test
  repeint l'écran sans défiler la page. La liste du sélecteur et le menu
  « … » s'ouvrent au-dessus de la ligne et des cartes. À 500 px, la ligne
  tient sur une seule ligne, en français et en anglais.

Onglet Vérification :

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [● Bleu marque            ✗ ▾] [Nouvelle palette] [⋯]                 │
│ Palette Bleu marque                          Aperçu [Light|Dark]      │
│ ┌ ✗ 2 garanties manquées sur 76 · 1 point à vérifier ──────────────┐ │
│ Garanties à corriger (2)                                              │
│ │ où · quoi · geste                          [Ajuster le Color shift] │
│ Points à vérifier (1)                                                 │
│ │ où · quoi · geste                          [Ajuster la saturation]  │
│ ┌ Garanties de contraste ──────────────────────────────────────────┐ │
│ │                                   Afficher  [Soft ✓ | Vivid ✗ 2] │  │
│ │ réglette : page, boutons, onze nuances, éventail de la garantie  │  │
│ │ Textes lisibles                                 minimum 4,5:1   │  │
│ │   text sur surface     700 / 100   800 / 200   900 / 300        │  │
│ │ Éléments visibles                                 minimum 3:1   │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│ Corrigez la palette dans Création, ou écrivez-la …  [Retour à Création] │
└──────────────────────────────────────────────────────────────────────┘
```

- `[VER-18]` L'onglet Vérification montre, de haut en bas : la barre du
  sélecteur (`[UI-23]`) ; la ligne du titre « Palette [nom] » et de la bascule
  « Aperçu » Light/Dark, qui reste en haut ; le verdict de la
  palette ouverte sur son fond de sévérité, avec le compte des garanties et
  des points à vérifier ; ses messages, groupés par sévérité (`[VER-14]`),
  les garanties à corriger en premier, chacun avec ses liens (`[VER-15]`) ;
  la carte « Garanties de contraste » (`[UI-09]`) ; le pied. Une palette
  libre n'a pas la carte des garanties, et son verdict dit « Palette libre ·
  N nuances ». Le pied dit « La palette tient ses garanties. » et porte
  « Passer à Gestion » ; quand une garantie manque, il dit « Corrigez la
  palette dans Création, ou écrivez-la telle quelle dans Gestion. » et porte
  « Retour à Création ». Sans palette choisie, l'onglet montre la barre et
  l'invitation de `[UI-06]`. L'onglet ne se rend que visible, et à la fin
  d'un geste : un glisser dans Création ne le recalcule pas.
- `[VER-19]` Chaque palette a un verdict : `danger` dès qu'une garantie
  manque, `avertissement` dès qu'un point à vérifier existe, `succes` sinon ;
  une palette libre est `succes`. `verdictDeLaPalette`
  (`src/presentation.ts`) en est l'unique autorité. Le verdict des palettes
  que le sélecteur liste se recalcule à la fin d'un geste, jamais pendant, et
  seulement pour une palette dont le JSON ou celui des réglages communs a
  changé : un glisser n'analyse que la palette ouverte.
- `[VER-20]` La carte des garanties et l'aperçu de Création montrent le thème
  de la bascule « Aperçu » de la ligne du titre (`[UI-23]`) ; la carte ne le
  nomme ni ne le choisit. Dans le détail d'une nuance (`[UI-10]`), un clic sur
  une garantie ouvre Vérification et y choisit sa ligne. Dans la carte, la
  ligne de l'autre thème garde ses deux liens : le lien vers l'autre thème
  change le thème de la bascule du titre sans quitter Vérification, et
  « Revenir au thème » ramène au thème d'avant ; ces deux liens ne se
  trouvent que dans la carte.
- `[VER-23]` Dans le bilan, la ligne d'une palette trop proche d'une autre
  (constat « trop proche de [nom] ») porte un lien « Comparer » à la place de
  « Vérifier » : il ouvre Comparaison avec la paire cochée, comme le bouton
  « Comparer » de la carte « Palettes trop proches » (`comparerLaPaire`,
  `[UI-40]`). La paire est la plus proche de la palette, celle que le constat
  nomme. Une ligne dont le constat est une garantie manquée ou une alerte de
  la palette garde « Vérifier ».

Onglet Comparaison :

- `[UI-39]` Comparaison se place entre Vérification et Gestion, indisponible
  sous deux palettes. Son compteur ambre donne le nombre de paires trop proches
  et disparaît à zéro. Le titre précède les choix Soft/Vivid et Light/Dark,
  sans libellé visible. Une ligne fixe de 24 px donne le nombre de paires,
  avec `!` et le ton avertissement, ou « Toutes vos palettes se distinguent »,
  avec `✓` et le ton neutre. Cette ligne ne porte aucun bouton. Ces choix
  d'aperçu restent dans la session, sans rangement dans la recette.
  La sélection conserve l'ordre de cochage de quatre identifiants au plus ;
  le cinquième est refusé. La première cochée devient la palette à régler ;
  décochée, elle cède sa place à la première restante. Un renommage conserve
  la sélection, y compris pour deux palettes de même nom. Une suppression,
  un import ou une synchronisation retire les identifiants disparus ; sous
  deux palettes, tout l'état se vide. Chaque entrée renouvelle les départs
  de l'annulation. L'état et ses transitions sont dans `src/harmonisation.ts` ;
  l'en-tête et le compteur sont dans `src/ui/ongletHarmonisation.ts`.

- `[UI-40]` La carte « Palettes trop proches » paraît s'il existe une paire :
  une rangée par paire de `pairesTropProches`, par rapport distance sur seuil
  croissant (`[VER-22]`), avec deux pastilles « Aa » sur le fond de page du
  thème du constat (plein et son texte, ou fond teinté et son texte, en Vivid
  ou l'unique intensité), les deux noms, le constat (« Boutons pleins trop
  proches » ou « Fonds teintés trop proches », avec le thème) et « Comparer ».
  Une paire que le réglage sépare garde sa rangée jusqu'à la sortie de
  l'onglet : la rangée s'atténue et son texte devient « Se distinguent
  maintenant », en ton de succès, et « Comparer » reste. Les rangées suivent
  l'ordre d'apparition des paires depuis l'entrée dans l'onglet
  (`pairesDeLaVisite`, `retenirLesPaires`), et l'entrée vide cette liste. La
  carte se cache quand il n'y a ni paire ni rangée gardée ; son résumé compte
  les paires encore trop proches. « Comparer » coche la paire seule, passe
  l'aperçu au thème du constat et met dans `regler` la palette de plus petite
  `sortieLaPlusProche` en valeur absolue, la palette A à égalité ou sans sortie
  de l'une et de l'autre. Il garde l'intensité, l'affichage et les réglages, et
  remet le refus de la cinquième palette à faux. La carte « Vos palettes » liste
  les palettes par teinte (`ordreParTeinte`) : case, nom, nuances dans le thème
  et l'intensité de l'aperçu, et un rond `!` sur chaque palette d'une paire trop
  proche, qui nomme ses voisines. La rangée entière est le `label` de sa case.
  L'ordre suit la teinte OKLCH de la référence, du rouge au rose : le cercle
  s'ouvre à mi-chemin des familles rose et rouge (14,5°). Deux teintes égales
  gardent l'ordre de la recette, et les palettes sans teinte (chroma de la
  référence au plus 0,05) viennent à la fin, dans l'ordre de la recette. Les
  cartes « Aperçu » et « Réglages » rangent les cochées dans cet ordre.
  Un glisser garde l'ordre de son départ : aucune rangée ne change de place
  sous le pointeur, et l'ordre suit la nouvelle teinte à la fin du geste.
  Le pied dit le nombre de palettes cochées et leur refus au-delà de quatre, et
  « Tout décocher » les décoche. Les cartes sont dans
  `src/ui/harmonisation/cartePaires.ts` et `carteListe.ts`, le choix de la
  palette à régler dans `paletteARegler` (`src/harmonisation.ts`).

- `[UI-41]` La carte « Aperçu » paraît dès deux palettes cochées. Une
  surface au fond de page du thème de l'aperçu, d'encre `#1E1E1E` en Light et
  `#F2F2F2` en Dark, aligne sous les numéros de la recette les nuances de
  chaque cochée, par teinte (`[UI-40]`), dans l'intensité et le thème de
  l'aperçu, puis range ses composants en
  une colonne par palette : plein, contour, message, lien. Le cran de chaque
  rôle vient de `cranDeLaVariable`, jamais d'un cran écrit en dur. Une palette
  à une intensité se montre sur sa seule rampe. Une palette libre ou figée
  dit « Palette libre : pas de composants » dans sa colonne. La bascule
  « Couleurs | Niveaux de gris » (`affichage`) remplace chaque couleur de la
  surface par `grisDeMemeClarte` ; le texte des boutons pleins reste blanc ou
  noir ; la liste, les pastilles des paires et les constats gardent leurs
  couleurs. Les constats, dans l'ordre : une ligne d'avertissement par paire
  cochée trop proche ; une ligne de succès « … se distinguent maintenant. »
  (constat `separee`) pour chaque paire cochée qui était trop proche depuis
  l'entrée dans l'onglet et ne l'est plus ; « Ces palettes se distinguent, en
  Light et en Dark. » quand il n'y a ni l'une ni l'autre ; puis, parmi les cochées colorées (ni libres, ni
  figées, chroma de la référence au-dessus de 0,05), une ligne d'information
  quand la saturation de l'intensité vue s'étale de 0,20 ou plus, et une quand
  sa luminosité s'étale de 0,01 ou plus. Une paire que `paletteARegler` rend
  `sansSortie` remplace « Sortez la teinte de l'une d'elles de la zone
  hachurée, dans Réglages. » par « Aucune teinte de la course ne les sépare :
  changez la saturation ou la luminosité de l'une d'elles. » La carte est dans
  `src/ui/harmonisation/carteComparaison.ts` ; `constatsDeLaComparaison` et
  `choisirAffichage` sont dans `src/harmonisation.ts`.

- `[UI-42]` La carte « Réglages » paraît dès deux palettes cochées. Sa bascule
  « Régler » nomme les cochées par teinte (`[UI-40]`) et choisit la palette
  réglée ; un point suit le nom d'une palette modifiée. Trois réglettes de
  Création règlent cette palette dans l'intensité vue : la teinte décale les
  deux intensités du même écart par `candidatDeTeinte`, la saturation et la
  luminosité ne touchent que l'intensité vue, par `reglerSaturation` et
  `reglerClarte`. Une palette à une intensité règle sa seule rampe. Sur la
  piste de teinte, `zonesTropProches` contre chaque autre cochée hachure les
  valeurs trop proches, dès l'arrivée sur la palette et même quand la paire
  est séparée à sa position actuelle, et le champ porte un cerne tant que la
  valeur y tombe,
  et `courseDeTeinte` borne la piste : la course que les garanties refusent se
  lit comme hors de la piste. Sur les deux autres pistes, un point marque la
  valeur de chaque autre cochée. La course et les zones se calculent au repos ;
  un glisser garde celles de son départ, et la recette, les paires, les
  constats et le compteur se repeignent à chaque image. Un glisser se
  prévisualise, sa fin range la recette par la frontière, Échap rend la palette
  d'avant. Une palette figée affiche « Palette figée : ses couleurs ne se
  règlent pas. » à la place des réglettes. Le départ d'une palette est la
  palette au premier réglage depuis l'entrée dans l'onglet, par identifiant.
  « Annuler les modifications » reste affiché, inactif tant que la palette
  réglée ne diffère pas de son départ (teinte de 0,5° ou plus, saturation de
  0,005, luminosité de 0,0005) ; une palette figée le cache. Actif, il lui
  rend la référence, `originale`, `base`, `reglages` et `parts` de ce départ,
  à elle seule, par la frontière, sans appeler `annulerLesModifications` de la
  session : le changement fait dans Création avant l'entrée et les autres
  palettes restent. Quand le clic le rend inactif, le focus passe à la
  première réglette. Un refus de la validation, ou un rangement que le sandbox
  juge invalide, rend la recette et les départs d'avant le geste ; un conflit
  d'enregistrement ne rend rien. La carte est dans
  `src/ui/harmonisation/carteReglages.ts` ; `memoriserLeDepart`,
  `modifieeDepuisLeDepart`, `restaurerLesReglages` et `annulerLaPalette` sont
  dans `src/harmonisation.ts`.

- `[UI-43]` La carte « Roue des teintes » est repliée à l'arrivée ; repliée,
  son résumé dit « Vision » et la vision choisie en minuscules, dépliée elle
  montre à la place le choix « Vision » : Normale, Deutéranopie, Protanopie,
  Tritanomalie. La troisième vision porte ce nom parce que la matrice est
  celle de la tritanomalie sévère de Machado, Oliveira et Fernandes (2009),
  dont les auteurs excluent la tritanopie ; « sévère » ne paraît pas, pour
  que la liste tienne à 480 px ; l'état range des identifiants
  (`normale`, `deuteranopie`, `protanopie`, `tritanomalie`) et les matrices,
  avec leur source, sont dans `src/vision.ts`. Un SVG à la largeur du corps de la carte,
  sur le fond de page de l'aperçu, a le rayon `max(70, ⌊largeur / 2 − 88⌋)` et
  la hauteur `2 × rayon + 48` (`geometrieDeLaRoue`) : à 351 px de carte, dans
  une fenêtre de 400 px, 351 × 222 px et un rayon de 87. Un `ResizeObserver`
  le redessine quand la largeur change, hors d'un glisser ; une carte plus
  étroite que 2 × (70 + 88) px déborde. L'anneau compte 90 arcs de 4,6° posés
  tous les 4° (0° en haut, sens horaire), épais de 16 px, de couleur OKLCH de
  clarté 0,78 en Light et 0,62 en Dark, de chroma 0,12 (`couleurDeLAnneau`),
  vue par la vision. Il n'y a ni cercle gris ni nom de famille de teinte. Un
  point par palette colorée (chroma de la référence au-dessus de 0,05, palette
  libre ou figée comprise) se pose sur l'anneau, à la teinte OKLCH de son cran
  700 dans l'intensité et le thème vus, du numéro le plus proche de 700 quand
  la grille n'a pas ce cran. Le point a pour rayon 7 px, 9 px s'il est coché,
  la couleur de `solid/default` vue par la vision, un contour ambre dans une
  paire trop proche, de l'encre d'aperçu s'il est coché, du fond sinon. Un arc
  ambre de 4 px, au rayon de l'anneau plus 13 px, couvre chaque paire trop
  proche et déborde de 14° ; la palette à régler montre à l'intérieur, au rayon
  de l'anneau moins 14 px, sa course de ±30° en encre translucide et ses zones
  trop proches, calculées comme celles de la carte « Réglages », hachurées
  d'ambre. Les noms s'écrivent à 11 px en deux colonnes alignées sur les bords
  de la plaque, à droite pour une teinte sous 180°, à gauche sinon, à 15 px du
  bord au moins ; 13 px au moins séparent deux noms d'une colonne, et une ligne
  brisée relie chaque nom à son point. Tous les noms des palettes colorées se
  posent quand la colonne la plus chargée tient dans la hauteur
  (`colonnesTiennent`), sinon les seules cochées et celles d'une paire
  (`palettesNommees`). Un nom coché est en gras et en encre, celui d'une paire
  en ambre. Saisir un point met sa
  palette dans « Régler » et la coche ; sans place pour une cinquième, rien ne
  se saisit et `trop` passe à vrai. La teinte réglée est la teinte rangée plus
  l'écart le plus court entre le pointeur et le point au départ du glisser,
  arrondi au degré et borné par la course des garanties tenues, dans `[−30°,
  +30°]` ; elle passe par `candidatDeTeinte`, se prévisualise une fois par
  image, se range à la fin et revient à la palette d'avant sur Échap. Le point
  d'une palette figée ne se saisit pas. La vision ne change ni la recette ni
  les alertes. La carte est dans `src/ui/harmonisation/carteRoue.ts` ; sa
  géométrie dans `src/roueDesTeintes.ts`, `saisirPalette`, `choisirLaVision` et
  `basculerLaRoue` dans `src/harmonisation.ts`.

- `[UI-44]` Au clavier, chaque point de la roue est un `role="slider"`
  focalisable (`tabindex` 0, −1 et `aria-disabled` pour une palette figée), nommé
  « Teinte de <nom> », de valeur la teinte réglée de l'intensité vue entre −30 et
  +30 : une flèche règle de 1°, avec Maj de 10°, dans la course permise ; la
  touche saisit d'abord la palette comme un clic, et le point garde le focus
  après le rangement. Dans le reste de l'onglet : les onglets suivent le motif
  du socle, la case de chaque rangée de « Vos palettes » porte le nom de la
  palette et la rangée entière est son `label`, chaque bascule marque son segment
  par `aria-pressed`, la ligne fixe et la liste des constats de la comparaison
  sont des `role="status"`, et les réglettes suivent `ui/derive/reglette.ts`
  (flèche d'un pas, Maj d'un grand pas, Début et Fin aux bornes permises ;
  `aria-valuetext` dit la valeur et « trop proche de <autre> » dans une zone).

- `[UI-45]` Le socle expose `definirDisponible(id, disponible)`. Un onglet
  indisponible porte `disabled` et `aria-disabled="true"`. Le clic et
  `selectionner` refusent de l'activer ; les flèches, Début et Fin le
  sautent. Si l'onglet actif devient indisponible, le premier disponible
  s'active. Le focus le suit seulement si l'onglet désactivé le détenait.
  Sans onglet disponible, tous les panneaux sont masqués et `actif()` rend
  `undefined`. Une réactivation sélectionne le premier disponible seulement
  en l'absence d'onglet actif. Le rappel de sélection reçoit uniquement un
  identifiant disponible. `socleLocalise.ts` expose la même API.

Onglet Gestion, Bleu dépliée :

```text
┌──────────────────────────────────────────────────────────────────────┐
│ ┌ Connexion à Figma ──────────── Synchronisé il y a 2 min  ⟳ Synchroniser ┐
│ │ Tokens     primitives · colors                           [Changer] │
│ │ Planches   Page « Palettes »                             [Changer] │
│ │ 1 à jour · 2 à mettre à jour             [Tout mettre à jour (2)]  │
│ └────────────────────────────────────────────────────────────────────┘
│                                                                      │
│ Palettes du plugin · 3                                  [Light|Dark] │
│ ┌ Palette      Nuances       Tokens Figma       Planche ───────────┐ │
│ │ ˅ ■ Bleu     ▪▪▪▪▪▪▪▪▪▪▪                             [Modifier] │ │
│ │   Soft  ▪▪▪▪▪▪▪▪▪▪▪                                              │ │
│ │   Vivid ▪▪▪▪▪▪◆▪▪▪▪                                              │ │
│ │   ■ #1E6FD9 ◆ Vivid · nuance 600             Soft ✓  Vivid ✗ 2   │ │
│ │   Tokens Figma (À mettre à jour) 6 couleurs ont changé [Mettre à jour] │
│ │   Planche      (À jour)                               [Afficher] │ │
│ │ › ■ Vert     ▪▪▪▪▪▪▪▪▪▪▪   (Pas encore écrits) (Pas encore créée) │ │
│ │ › ■ Rouge    ▪▪▪▪▪▪▪▪▪▪▪   (À jour)            (À actualiser)    │ │
│ │ Déjà dans le fichier · 1   Lues dans les variables du fichier…   │ │
│ │ › ┆ gray     ▪▪▪▪▪▪▪▪▪▪▪   (Variables du fichier)                │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│ ┌ Ardoise ───────────────────────────── teinte d'avertissement ───┐  │
│ │ palette supprimée, cadre ou variables restés dans Figma         │  │
│ │ [Afficher dans Figma] [Supprimer définitivement] [Supprimer les variables…] │
│ └─────────────────────────────────────────────────────────────────┘  │
│ Informations : cadre introuvable, copie, P3                          │
│ ▸ Palettes et réglages : exporter, importer, rapport                 │
└──────────────────────────────────────────────────────────────────────┘
```

- `[UI-24]` La section repliable « Connexion à Figma » ouvre Gestion dans
  les deux vues (`src/ui/connexion.ts`). Repliée, elle résume la collection
  et le groupe des tokens, puis la page des planches. Dépliée, elle porte
  les lignes « Tokens » et « Planches », chacune avec « Changer », puis
  l'heure du dernier état lu et « Synchroniser » en pied. « Synchroniser »
  relit les cadres sur toutes les pages (`[PLA-26]`), sans écrire dans le
  document. Les statuts des palettes restent dans leurs fiches.
- `[UI-25]` La barre « Palettes du plugin · N » porte la bascule des
  thèmes au bord droit. Le thème choisi peint la rampe en miniature de chaque
  ligne et les rampes des fiches dépliées.
- `[UI-26]` La fiche d'une palette dépliée (`[UI-27]`) montre les rampes de
  ses intensités dans le thème choisi, sa référence et le résultat de ses
  garanties, qui ouvre Vérification sur la palette ; puis une ligne par
  sortie (`src/ui/sorties.ts`) : un nom, une pastille d'état, un détail, des
  gestes au bord droit. « Modifier », au bord droit de la ligne dépliée,
  ouvre Création sur la palette.

  | Ligne | États | Gestes |
  |---|---|---|
  | Tokens Figma | Pas encore écrits · À jour · À mettre à jour · Modifiés dans Figma · Introuvables | « Écrire dans les tokens », « Mettre à jour », ou la décision de `[VAR-06]` |
  | Planche | Pas encore créée · À jour · À actualiser · Introuvable · Lecture impossible | « Créer la planche », « Actualiser », « Afficher » |

  La pastille de l'en-tête donne l'état le plus urgent des deux lignes, dans
  cet ordre : modifiée dans Figma, à mettre à jour, pas encore sur Figma,
  synchronisée. `etatDeLaFiche` (`src/presentation.ts`) en est l'unique
  autorité. Une sortie introuvable ou illisible compte comme à mettre à
  jour. Une palette qui manque des garanties s'écrit comme une autre : sa
  fiche montre « Soft ✗ ».
- `[UI-27]` Les palettes forment une liste, sous les en-têtes « Palette »,
  « Nuances », « Tokens Figma » et « Planche » : une ligne par palette, par
  nom affiché (`ordreAlphabetique` : sans casse ni accents, les nombres à
  leur valeur, l'ordre de la recette à égalité), avec son chevron, sa
  teinte, son nom, sa rampe en miniature, l'état de ses tokens et l'état de
  sa planche. Un clic sur la
  ligne, ou Entrée et Espace sur son nom, la déplie ou la replie ; un geste
  de la ligne ne la bascule pas. Dépliée, la ligne remplace ses deux états
  par « Modifier », et sa fiche (`[UI-26]`) s'ouvre dessous. Plusieurs lignes
  restent dépliées à la fois. Une palette qui attend une décision se déplie
  seule : couleurs changées dans Figma (`[UI-32]`), noms pris par d'autres
  variables, refus d'une écriture. Repliée par le designer, elle le reste
  tant que la même décision attend. Les lignes dépliées durent la session,
  sans rien ranger : à l'ouverture du plugin, la liste est repliée.
- `[UI-28]` Les mises à jour se font depuis les sorties de chaque fiche
  (`[UI-26]`, `[UI-31]`). Gestion ne propose aucun bouton global de mise à jour.
- `[UI-29]` « Changer », sur la ligne « Planches », ouvre la carte « Page
  des planches » à la place du bloc de la connexion : une liste à choix
  unique, chaque page du fichier avec son nombre de planches, puis
  « Nouvelle page » et son champ. La carte est grise, sans fond, comme le
  bloc ; la liste a un fond gris plus foncé ; elle n'a pas de simulation.
  « Enregistrer » demande le changement (`[PLA-29]`) ; « Enregistrer » ou
  « Annuler » rend le bloc et le focus à « Changer ». Un refus se lit dans
  la carte, qui reste ouverte.
- `[UI-30]` « Changer », sur la ligne « Tokens », ouvre la carte
  « Destination des tokens » à la place du bloc, de même facture que
  `[UI-29]`. Trois champs, sans texte d'aide : la collection, en liste à
  choix unique, « Nouvelle collection » et son champ, puis chaque collection
  locale avec son nombre de variables, puis les collections de bibliothèque,
  grisées et non choisissables (`[VAR-14]`) ; le groupe et les thèmes sur une
  rangée. Dessous, la simulation S-A liste un chemin par rampe, ses première
  et dernière nuances et son nombre de variables. L'en-tête nomme la
  collection et, pour les thèmes en modes, « modes Light, Dark ». Elle
  n'affiche aucune couleur. Elle se calcule par `planDesVariables` (`[VAR-01]`) sur la première
  palette du plugin et suit chaque choix sans rien ranger. « Enregistrer »
  range la destination (`[VAR-02]`).
- `[UI-31]` « Écrire dans les tokens » ouvre dans la fiche un encart : le
  nombre de variables, la collection, le premier et le dernier nom,
  « Annuler » et « Écrire N variables ». Tant que la destination n'est pas
  confirmée, le geste ouvre d'abord la carte de `[UI-30]`, puis l'encart
  quand elle est rangée. « Mettre à jour » écrit sans encart tant qu'il ne
  crée rien, et n'écrase aucune valeur changée dans Figma. Quand il doit
  créer des variables, après un changement de destination ou la disparition
  d'une variable, il ouvre le même encart, qui compte aussi les couleurs
  déjà écrites qu'il remplace. Ce que le sandbox refuse à une palette, un
  nom déjà pris ou un mode refusé, se lit dans sa fiche jusqu'à l'écriture
  suivante.
- `[UI-32]` Une palette « Modifiés dans Figma » montre dans sa fiche un
  encart d'avertissement : chaque couleur changée, son nom de variable, la
  valeur de Figma et celle du plugin, six au plus puis « Et N autres ».
  « Remettre les couleurs du plugin » écrit avec le choix `remettre`
  (`[VAR-06]`). « Laisser les couleurs de Figma » replie l'encart pour la
  session, sans rien ranger : l'état reste « Modifiés dans Figma », et la
  ligne offre « Mettre à jour », qui le rouvre.
- `[UI-33]` Après les palettes du plugin, dans la même liste (`[UI-27]`),
  l'intertitre « Déjà dans le fichier · N » et sa phrase précèdent les
  palettes que les variables du fichier portent et que le plugin n'a pas
  écrites (`[VAR-12]`) : une ligne à la teinte en tirets, la rampe du premier
  mode et l'étiquette « Variables du fichier » à la place des deux états.
  Dépliée, elle porte « Modifier dans le plugin » au bord droit (`[VAR-13]`),
  puis la rampe en tirets, la collection, le chemin, le nombre de couleurs et
  les modes. L'intertitre « Dans les bibliothèques · N » et la phrase
  « Publiées par une bibliothèque distante » précèdent les palettes des
  bibliothèques : l'étiquette « Bibliothèque », des pastilles vides ;
  dépliée, « Copier dans le plugin » (`[VAR-14]`), le nom de la collection et
  son nombre de variables, le chemin et « Couleurs lues à la copie ». Un
  groupe sans palette n'a pas d'intertitre.
- `[UI-34]` « Modifier dans le plugin » reprend la palette en mode
  `recalculees`, puis ouvre Création sur elle et y pose un encart sous le
  titre : les deux rampes, « Fichier » et « Plugin », la bascule
  « Recalculées · Telles quelles », le nombre de couleurs qui changeront, et
  « Annuler la reprise », qui supprime la palette du plugin. L'encart reste
  tant que la palette est reprise : il porte aussi « Passer au format du
  plugin », absent d'une palette figée, qui se recalcule d'abord. Ce geste
  ouvre d'abord ce qu'il fera, puis « Annuler » et « Passer au format du
  plugin » ; il est définitif, et l'encart disparaît avec la liaison de
  reprise. Une palette figée garde l'encart, seul endroit où revenir aux
  couleurs recalculées. Une
  palette figée ne montre ni la référence, ni le modèle, ni « Réglage
  global », ni « Color shift » ; une palette reprise ne propose pas deux
  intensités. Dans Gestion, la ligne des tokens d'une palette reprise dit sa
  collection et son chemin d'origine, puis le nombre de variables à créer,
  sinon les couleurs qui changent, sinon le nombre de variables à renommer.
  Quand des variables sont à créer, « Mettre à jour » ouvre l'encart
  d'écriture (`[UI-31]`). Sinon il ouvre un encart de remplacement : les
  couleurs qui changent, valeur de Figma et valeur du plugin, six au plus
  puis « Et N autres », la phrase « Les variables gardent leur nom et leurs
  liaisons. », « Annuler » et « Remplacer N couleurs ». Quand des variables
  sont à renommer, les deux encarts le disent par l'exemple de la première,
  ancien nom et nouveau nom, à la place de cette phrase ; sans couleur à
  remplacer, l'encart de remplacement prend le titre de l'écriture et le
  bouton « Mettre à jour ». Dans Création, l'encart dit aussi combien de
  variables la mise à jour créera. Une reprise que le sandbox refuse se dit
  sous le bloc de la connexion.
- `[UI-35]` Une palette supprimée dont le cadre ou des variables restent
  dans Figma garde sa carte (`[PLA-27]`), qui propose aussi « Supprimer les
  variables… », geste `danger` confirmé dans la carte (`[VAR-11]`). Sans
  cadre, la carte porte le chemin commun des variables pour nom. Sous les listes,
  l'onglet range dans une section secondaire l'export et l'import des
  palettes et réglages et l'export du rapport.

- `[UI-36]` Gestion regroupe trois sections repliables, dans cet ordre :
  « Connexion à Figma », « Palettes du plugin », « Palettes et réglages ».
  Les palettes du fichier et des bibliothèques sont des lignes de la liste
  du plugin (`[UI-33]`). Seules les palettes du plugin sont ouvertes par
  défaut. Les choix du
  designer se rangent sous `ucm-palettes.sections` dans `figma.clientStorage`.
  Une recette illisible ouvre la section de la recette sans ranger ce choix.

La Configuration, onglet Palettes, derrière le bouton « Configuration » :

```text
┌──────────────────────────────────────────────────────────────┐
│ ← Retour aux palettes et à la planche         Configuration    │
│ Palettes · Général                                              │
│ Les réglages par défaut de toutes les palettes du fichier.      │
│ Palette ouverte : Bleu · Thème Light      Soft ✓  Vivid ✗ 2   │
│ Soft ▪▪▪▪▪▪▪▪▪▪▪  Vivid ▪▪▪▪▪▪◆▪▪▪▪                           │
│ ┌ Couleurs de fond ─────────── 3 palettes concernées  Par défaut ┐ │
│ │ Fond du thème Light         Fond du thème Dark              │ │
│ │ [■][#F7F7F7]                [■][#0A0A0A]                     │ │
│ ┌ Intensités ───────────────── 2 palettes concernées  Par défaut ┐ │
│ │ Intensité Soft  [───────●──] 0,85                           │ │
│ │ Intensité Vivid [────────●─] 0,95                           │ │
│ ┌ Luminosité des nuances ───── 3 palettes concernées  Par défaut ┐ │
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
| Premier lancement | Aucune recette rangée : l'encart au fond bleuté, sa rampe d'exemple et « Nouvelle palette » (`[UI-22]`) |
| Fichier vide avec variables | L'encart, puis la ligne qui compte les palettes des variables et mène à Gestion |
| Onglet Création sans palette choisie | « Sélectionner une palette », l'invitation sous le filet, ni menu ni palette |
| Premier lancement, palette créée | La première palette ouverte, recette rangée |
| Création ouverte | La carte de création sous le sélecteur, en P2 : nom et couleur de référence, Modèle, « Une intensité » choisie, « Créer la palette » et « Annuler » |
| Palette à une intensité | La carte « Une intensité » choisie, une rangée par thème sans nom de profil, ni choix du profil dans les garanties |
| Palette à deux intensités | La carte « Deux intensités » choisie, « Référence exacte dans » et « Auto a choisi Vivid » dans la carte |
| Palette en saisie | Aperçu à jour, rien de généré |
| Référence Soft | Une référence peu intense, portée par Soft, avec son repère et sa nuance |
| Référence Vivid | Une référence intense, portée par Vivid, nuance différente en Light et en Dark |
| Palette de base forcée | Soft forcé sous « Référence exacte dans » sur une couleur saturée : même code, repère Soft, saturation propre dans « Réglage global » |
| Réglage global, à une intensité | La carte dépliée sans segments, la ligne fixe de l'avertissement, trois réglettes |
| Un profil réglé seul | Soft tourné de 8°, aucun avertissement, la lettre de Vivid sur chaque piste, le repère de la référence |
| Avant un réglage du porteur | Vivid ◆ choisi, l'avertissement avant tout geste |
| Référence modifiée | L'avertissement après le geste, « Ajustée depuis » sous le code, le porteur fixé par les réglages |
| Vérification tenue | Onglet Vérification : verdict de succès, choix du profil ✓ sur les deux profils, la garantie de `surface/foreground` choisie et ses quatre arcs, « Passer à Gestion » |
| Vérification manquée | Verdict de danger, messages à corriger avec leurs liens, première ligne en échec choisie, arc de danger, « Retour à Création » |
| Vérification d'une palette libre | « Palette libre · N nuances », aucune carte des garanties |
| Garantie de l'autre thème | Ligne qui compte les garanties manquées de l'autre thème, thème basculé, « Revenir au thème » |
| Verdicts dans le sélecteur | La liste ouverte sur trois palettes : ✓, ! et ✗ à droite de chaque option et sur le bouton |
| Détail de la référence | La nuance de la référence choisie : variables, garanties, repère ◆ |
| Nuance sans rôle | « Sans rôle », puis la table des contrastes, fond de la page, blanc et noir, chacun avec son badge |
| Nuance désélectionnée | La nuance choisie recliquée : détail refermé, focus resté sur la pastille |
| Cartes repliées | « Réglage global » et « Color shift » repliées, leur glyphe, leur résumé sur une ligne, un point à vérifier annoncé |
| Fond personnalisé | Un fond saturé peint sous le nuancier, textes et focus lisibles dessus |
| Fond dans le sélecteur de couleur | La pastille du fond ouverte, la mention du fond commun à toutes les palettes |
| Interface de test | L'écran de réglages peint de la palette, aux deux thèmes de l'aperçu |
| Ajuster la référence | La modale après deux pas : originale et proposition, nuance visée, garanties avant et après |
| Référence ajustée | « Ajustée depuis #16A34A · Revenir à l'originale » sous le code |
| Palette libre | Libre pressé, six puces allumées, l’aperçu à six colonnes sans case tiretée ni bandes, aucune carte des garanties |
| Référence dans le sélecteur de couleur | La pastille de la référence ouverte, les nuances Vivid de la palette proposées |
| Configuration de la recette | Les onglets Palettes et Général, puis fonds, intensités, luminosité et groupes repliés, avec le nombre de palettes concernées |
| Configuration, onglet Général | Le seul champ Langue, sous la phrase de l'onglet |
| Configuration sans palette (titre de l'état de la galerie) | Aucun aperçu en tête, tracé sans ◆, aucune palette concernée |
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
| Vingt messages | L'onglet Vérification sur vingt messages, à la taille par défaut et à 500 × 520 |
| Presque noir | `#060605` : un gris pur, rampes grises, aucun point à vérifier |
| Palette avec points à vérifier seuls | Garanties respectées, points à vérifier sous la carte qu'ils concernent |
| Génération en cours | Progression à la place de « Tout mettre à jour », aucun geste possible |
| Génération réussie | La ligne « Planche » dit « À jour », sans premier geste, avec « Afficher » |
| Titre seul | « Palette [nom] » seul sur sa ligne, un nom long coupé |
| Génération partielle | Palettes déjà créées nommées, palette fautive, reprise possible |
| Génération interrompue | Arrêt nommé, cadre précédent conservé, détail technique replié, « Réessayer » |
| Confirmation au-delà de six palettes | « Tout mettre à jour » demande confirmation |
| Onglet Gestion sans palette | Aucune palette à générer, geste vers l'onglet Création |
| Gestion, liste repliée | Le bloc « Connexion à Figma », la barre et la bascule des thèmes, une ligne repliée par palette sous les en-têtes de colonne |
| Gestion, une palette dépliée | « Modifier » à la place des deux états, la fiche sous la ligne, les autres lignes repliées |
| Page des planches | La carte à la place du bloc : les pages du fichier et leur nombre de planches, « Nouvelle page » |
| Planche à jour | Chaque ligne « Planche » dit « À jour » |
| Planche à actualiser | Lignes « À actualiser » ou « Pas encore créée », en avertissement, « Tout mettre à jour » |
| Fiche d’une palette | Nom, pastille d'état et « Modifier » ; rampes ; référence et garanties sur une ligne ; lignes de sortie |
| Pastilles des cinq états | « À jour » sur fond de succès, « À actualiser » et « Pas encore créée » en avertissement, introuvable et illisible en danger |
| Tokens jamais écrits | La ligne « Tokens Figma » dit « Pas encore écrits » et « 44 variables à créer » |
| Tokens à jour | « À jour · 44 variables » |
| Tokens à mettre à jour | « 2 couleurs ont changé dans le plugin » et « Mettre à jour » |
| Tokens introuvables | Des variables suivies ont disparu : « Introuvables » et « Mettre à jour » |
| Première écriture | L'encart de la fiche : nombre de variables, collection, premier et dernier nom |
| Destination ouverte | La carte « Destination des tokens » et sa simulation, thèmes dans le chemin |
| Destination en modes | La simulation à deux colonnes, Light et Dark |
| Nom déjà pris | La fiche nomme la variable qui porte déjà le nom |
| Écriture partielle | Une palette écrite, une interrompue avec sa raison dans sa fiche |
| Destination refusée | Le refus du sandbox dans la carte, qui nomme le champ |
| Variables supprimées | La ligne qui compte les variables retirées, après la confirmation |
| Palette supprimée avec variables | La carte propose « Supprimer les variables… » |
| Tokens modifiés dans Figma | L'encart qui liste les couleurs changées et les deux choix |
| Palettes du fichier | L'intertitre « Déjà dans le fichier », une ligne en tirets par palette, slate dépliée |
| Reprise recalculée | L'encart de Création, « Recalculées » pressé, le nombre de couleurs qui changeront |
| Reprise telle quelle | « Telles quelles » pressé, aucune couleur ne change |
| Reprise dans Gestion | La ligne des tokens dit la collection et le chemin d'origine, l'encart de remplacement |
| Reprise refusée | Le sandbox ne retrouve pas la palette du fichier : le message sous le bloc de la connexion |
| Bibliothèques | L'intertitre « Dans les bibliothèques », la ligne de gray dépliée, collections en lecture seule dans la destination |
| Copie de bibliothèque | La confirmation qui compte les variables ajoutées au fichier |
| Destination des tokens, collections de bibliothèque | Les collections de bibliothèque grisées, en lecture seule, avec leur compte |
| Copie de bibliothèque refusée | Figma refuse l'import : le message sous le bloc de la connexion |
| Bibliothèques illisibles | Figma n'a pas rendu les collections : la notice, et Gestion qui fonctionne |
| Contenu des planches | Un interrupteur par partie d’un cadre et par thème, ses calques, l’effet sur le cadre de la palette ouverte |
| Fonds du thème Dark | Le réglage sous Soft et Vivid dans la carte Intensités de la Configuration |
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
  retirer le cadre d'une palette supprimée, choisir la page des planches,
  ranger la destination, écrire ou retirer des variables, reprendre ou
  copier une palette du fichier, redimensionner, lire et ranger les
  préférences (`[UI-16]`, `[UI-36]`). Le sandbox envoie
  l'état (recette rangée, profil du document, état de chaque cadre, pages du
  fichier, collections, suivi et variables lues), la progression et les
  résultats. Un message entre dans `messages.ts` au lot qui le met en scène
  dans la galerie.
- `[UI-08]` Chaque résultat porte le numéro de la demande qui l'a produit.
  L'interface écarte un résultat plus ancien que la dernière demande du même
  geste.

## 14. Architecture du code

### 14.1 Les paquets

```text
packages/kit/src/emplois/        @ucm-kit/core/emplois, publié         [ARC-01]
                                   table en dossiers et ses deux sens, sept garanties, contraste WCAG

packages/couleur/                ucm-couleur, privé, le moteur pur    [ARC-01]
  src/conversions.ts               hexa, sRGB, linéaire, Oklab, OKLCH, P3
  src/plafond.ts                   plafond de chroma, mémorisé
  src/rampe.ts                     cran, teinte pivotée, rampe entière
  src/tailwind.ts                  le préréglage et son relevé
  src/contraste.ts                 contraste WCAG, ΔEok, part de chroma
  src/promesses.ts                 le jugement des sept garanties sur les rampes
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
  src/ecriture/planche.ts          dessine un modèle de planche dans la page, et change de page
  src/ecriture/recette.ts          range la recette dans le fichier
  src/ecriture/variables.ts        écrit les variables d'une palette, range la destination
  src/variables/                   le modèle pur des variables : destination, noms, plan, suivi, état, détection
  src/lecture.ts                   la recette rangée, la page, les cadres, les pages du fichier
  src/lectureDesVariables.ts       les collections et les variables de couleur, seul lecteur de `figma.variables`
  src/navigation.ts                la page courante, le cadrage et la sélection
  src/ui/                          l'interface
  src/ui/textes.ts                 tous les textes destinés au designer
  src/ui/derive/                   le Color shift : onglets, graphe, poignées, réglettes
  src/ui/ligneFixe.ts              la ligne d'un message, de hauteur fixe, et sa bulle
  src/ui/piedDeLaPalette.ts        le pied de l'onglet Création
  src/ui/glyphes.ts                le glyphe de chaque carte titrée
  galerie/etats.cjs                les états de l'interface
  tests/
```

- `[ARC-04]` Le moteur est le paquet privé `ucm-couleur`, sans étape de build :
  son `package.json` exporte `./src/index.ts`, qu'esbuild, tsx et tsc en
  résolution `Bundler` lisent tels quels. Il ne dépend que de `@ucm-kit/core`,
  dont il lit le point d'entrée `./emplois` : la table en dossiers et ses
  deux sens, les sept garanties et le contraste WCAG 2, que `ucm check` lit
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
- `[ARC-13]` Seuls `src/ecriture/variables.ts`, qui écrit, et
  `src/lectureDesVariables.ts`, qui lit, appellent `figma.variables` et
  `figma.teamLibrary`. Aucun fichier de `src/` n'appelle `loadAllPagesAsync`
  ou une API de style.
- `[ARC-15]` La navigation (`setCurrentPageAsync`, `scrollAndZoomIntoView`,
  `selection`) est dans `src/navigation.ts`, hors de la loi d'écriture : elle
  ne modifie pas le document.
- `[ARC-14]` Le routage de `code.ts` n'a qu'une porte par geste d'écriture :
  « dessiner », « ranger la recette », « retirer un cadre » (`[PLA-27]`),
  « choisir la page » (`[PLA-29]`), et les portes des variables de la
  [section 17](#17-sortie-2--les-variables).

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
| Seuls `src/ecriture/variables.ts` et `src/lectureDesVariables.ts` appellent `figma.variables` | Loi d'écriture : tout autre appel est refusé |
| Le plugin n'écrit que dans les cadres qu'il possède, dans la recette et dans les variables qu'il suit | Tests du modèle et de l'écriture |
| Le manifest n'ouvre aucun domaine | Test du manifest |
| Aucun des deux plugins n'importe l'autre | Loi d'import à la racine du dépôt, `tests/pluginsSepares.test.ts`, qui lit les deux sens |
| Aucune vue ne pose un mot hors des catalogues de `src/i18n/`, et les catalogues ont les mêmes clés | `tests/loiDesTextes.test.ts` et `tests/i18n.test.ts` |

## 15. Les lots

Le [plan de développement](https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/PLAN-PLUGIN-PALETTES.md) détaille chaque lot en
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

## 17. Sortie 2 : les variables

Le plugin écrit chaque palette dans les variables de couleur du fichier, au
geste du designer, depuis l'onglet Gestion. Le modèle est pur et vit dans
`src/variables/` ; `src/ecriture/variables.ts` écrit, et
`src/lectureDesVariables.ts` lit. `src/variables/gestion.ts` compte ce
qu'une écriture ferait, pour l'onglet Gestion, sur les règles de l'écriture.

### 17.1 La forme et la destination

- `[VAR-01]` `planDesVariables(recette, palette, destination)`
  (`src/variables/plan.ts`) rend la liste ordonnée de ce qu'une palette
  écrit. Chaque entrée porte sa clé stable, `{intensité}/{thème}/{nuance}`,
  son nom de variable, son mode, `unique`, `light` ou `dark`, et sa couleur
  en hexa. Les couleurs viennent de `rampesDe` du moteur, jamais de
  l'interface. Avec la destination par défaut, une palette s'écrit sous
  `colors/{palette}/{soft, vivid}/{light, dark}/{nuance}` : 44 entrées et 44
  variables pour deux intensités et onze nuances. Une palette à une
  intensité n'a pas de segment d'intensité. Une palette libre écrit ses
  seules nuances. Avec les thèmes en modes, le chemin perd son segment de
  thème : 44 entrées pour 22 variables, chacune à deux modes.
- `[VAR-02]` La destination vaut pour toutes les palettes du plugin
  (`src/variables/destination.ts`) : une collection, désignée par son
  identifiant ou par le nom d'une collection à créer ; un groupe, qui peut
  être vide ; les thèmes, `chemin` ou `modes`. Son défaut est la collection
  neuve `primitives`, le groupe `colors` et les thèmes dans le chemin. Elle
  se range dans le suivi (`[VAR-04]`), jamais dans la recette : un export de
  recette reste indépendant du fichier. Tant qu'elle n'a pas été confirmée
  une fois, « Écrire dans les tokens » ouvre sa carte avant d'écrire
  (`[UI-31]`). La changer ne déplace aucune variable : une palette déjà
  écrite garde les siennes, que Gestion montre « À mettre à jour » vers la
  nouvelle destination, et les anciennes variables restent dans le fichier.
- `[VAR-03]` Le segment d'une palette vient de son nom
  (`src/variables/noms.ts`) : `normalizeName` du kit, lu par
  `packages/plugin-socle`, puis le retrait de `.`, `{`, `}` et du `$` de
  tête, que Figma refuse. Une palette sans nom, ou dont le nom ne laisse
  aucun caractère, prend son identifiant. Deux palettes au même segment : la
  seconde, dans l'ordre de la recette, prend son identifiant en suffixe, et
  sa fiche le dit.

### 17.2 La propriété et l'état

- `[VAR-04]` Le plugin reconnaît ses variables par identifiant, jamais par
  leur nom. Le suivi rangé sous la clé partagée `ucm_palettes/variables`
  (`src/variables/suivi.ts`) porte sa version, la destination, si elle est
  confirmée, et pour chaque palette : sa collection, son groupe, ses modes,
  sa liaison, `destination` ou `reprise`, pour une reprise écrite son
  chemin d'origine et l'intensité de ses variables d'origine, et pour chaque clé du plan
  l'identifiant de la variable et la dernière couleur écrite. Il se lit comme le suivi des
  cadres (`[PLA-01]`) : une forme inattendue se lit comme un suivi vide, et
  un suivi d'une version plus récente refuse toute écriture. Chaque variable
  écrite porte aussi la donnée partagée de sa palette et de sa clé, qui ne
  sert que de repère.
  Une migration conserve la sortie précédente dans une entrée distincte du
  suivi, avec `sortieAnterieureDe`. Gestion en montre le chemin et le compte ;
  son retrait demande une confirmation propre et ne touche pas la sortie actuelle.
- `[VAR-05]` `etatDesTokens(plan, suivi, lues)` (`src/variables/etat.ts`)
  compare trois lectures : la couleur que le plugin calcule, la dernière
  écrite, la couleur lue dans Figma.

  | État | Condition, dans cet ordre |
  |---|---|
  | Pas encore écrits | Le suivi n'a aucune variable pour la palette, et la collection de l'écriture ne porte aucune variable des noms du plan (sinon « À mettre à jour », `[VAR-08]`) |
  | Introuvables | Une variable du suivi n'existe plus dans le fichier |
  | Modifiés dans Figma | Une couleur lue diffère de la dernière écrite |
  | À mettre à jour | Une couleur calculée diffère de la dernière écrite, une clé du plan n'est pas dans le suivi, la destination a changé depuis l'écriture, ou une variable d'une palette reprise est à renommer (`[VAR-13]`) |
  | À jour | Aucune des conditions précédentes |

  Deux couleurs sont égales quand leurs trois octets sRGB le sont, après
  arrondi des composantes de Figma. L'état porte la liste des entrées
  concernées : celles que Figma a changées, valeur de Figma et valeur du
  plugin, et celles que le plugin a changées.
  Une reprise dont des noms sont occupés reste « À mettre à jour » après
  l'écriture des autres entrées. Gestion nomme ces variables et demande leur
  renommage ou un autre groupe de destination.
- `[VAR-06]` Le plugin n'écrase jamais une couleur changée dans Figma sans
  le choix du designer, qui porte sur la palette entière. « Remettre les
  couleurs du plugin » écrit avec le choix `remettre` ; « Laisser les
  couleurs de Figma » garde l'état « Modifiés dans Figma », et la recette ne
  reprend pas ces couleurs (`[UI-32]`).

### 17.3 L'écriture

- `[VAR-07]` `ecrireLesVariables(figma, demande)`
  (`src/ecriture/variables.ts`), par la porte `ecrire-variables`, part de la
  recette rangée, jamais de couleurs envoyées par l'interface : la demande
  porte des identifiants de palette, l'empreinte lue de la recette, et pour
  chaque palette modifiée dans Figma le choix `remettre`. Elle refuse si
  l'empreinte de la recette rangée diffère, relit le suivi et les variables,
  puis recalcule le plan et l'état. La liste des variables locales fait
  foi : une variable suivie qui n'y est plus a disparu, et se recrée. Rien
  ne se supprime. Chaque variable créée naît sans portée (`scopes` vide,
  D14), puis reçoit sa valeur ; une valeur déjà égale à celle du plan ne se
  réécrit pas. Dans un document `DISPLAY_P3`, les composantes écrites sont
  en P3, comme sur la planche. Le suivi se range après les valeurs, et un seul
  `figma.commitUndo()` clôt l'écriture. Une erreur au milieu d'une palette
  retire les variables que cette écriture venait de créer pour elle ; les
  autres palettes continuent. Le résultat nomme, par palette, ce qui est
  créé, écrit, refusé et pourquoi.
  Les lectures et les mutations du document passent dans la même file du
  sandbox (`src/fileDuDocument.ts`). Une lecture refusée ou une création
  refusée rend une issue à la demande ; le geste suivant peut s'exécuter.
- `[VAR-08]` Avant toute création, le sandbox cherche dans la collection une
  variable du même nom, sans casse, qu'il ne suit pas pour la palette. La
  fiche compte d'avance celles qu'aucune autre palette de la recette ne suit,
  libres ou laissées par une palette supprimée : la ligne
  dit « À mettre à jour » et « N variables existantes à remplacer », et
  l'encart de `[UI-31]` les annonce, puis « Remplacer N variables ». Sur
  cette décision seulement, le sandbox les prend : elles gardent leur
  identifiant et leur portée, prennent le nom du plan et les couleurs du
  plugin, et entrent dans le suivi ; la palette supprimée qui les suivait les
  perd. Sans la décision, ou pour une variable qu'une autre palette de la
  recette suit, il arrête l'écriture de cette palette sans rien
  créer, et la fiche nomme la variable : le designer renomme la palette ou
  change de groupe.
- `[VAR-09]` La collection d'une palette est celle de son suivi tant que la
  destination n'a pas changé depuis son écriture, sinon celle que la
  destination désigne par identifiant, sinon une collection créée au nom
  donné. La collection créée devient la destination, par son identifiant :
  la palette suivante la rejoint. Une collection locale du même nom, que le
  plugin n'a pas créée, n'est jamais reprise sans que la destination la
  désigne par identifiant. Une collection désignée que le fichier ne porte
  plus arrête la palette.
- `[VAR-10]` Avec les thèmes en modes, le sandbox trouve ou crée les modes
  `Light` et `Dark`, par leur nom, sans casse ; le seul mode d'une
  collection sans variable se renomme `Light`. Un refus d'`addMode` arrête la palette, et la fiche montre le
  message de Figma replié. Avec les thèmes dans le chemin, dans une
  collection qui porte plusieurs modes, la même valeur s'écrit dans tous les
  modes.
- `[VAR-11]` Une palette supprimée laisse ses variables dans le fichier.
  « Supprimer les variables… », sur sa carte, les retire par la porte
  `retirer-variables` : le sandbox ne retire que les variables du suivi de
  cette palette, quand la recette rangée se lit et ne la contient plus, dans
  une écriture close par un seul `figma.commitUndo()`. Aucun autre geste ne
  supprime une variable, et seule l'écriture d'une palette reprise en
  renomme (`[VAR-13]`).
  Le retrait d'une ancienne sortie suit la même confirmation, même si la
  palette existe encore. Un retrait interrompu garde les variables restantes
  dans le suivi pour permettre une nouvelle tentative.
- `[VAR-16]` `rangerLaDestination`, par la porte `ranger-destination`,
  valide la destination, la range dans le suivi et la marque confirmée. Une
  écriture de variables suit les règles du dessin (`src/ui/frontiere.ts`) :
  elle part après le rangement en vol, un refus l'abandonne, et rien ne
  s'écrit pendant un conflit.

### 17.4 Les palettes du fichier

- `[VAR-12]` `palettesDuFichier(variables)` (`src/variables/detection.ts`)
  groupe les variables de couleur dont le dernier segment du nom est un
  nombre et dont le reste du chemin est le même. Un groupe d'au moins cinq
  variables est une palette. Les variables que le suivi possède sont
  écartées. Chaque palette rend sa collection, son chemin, ses nuances
  triées, ses couleurs par mode, et la nuance 600 ou la plus proche ; à
  distance égale, la plus sombre. La lecture ne suit pas les alias : une
  variable qui ne porte qu'un alias dans tous ses modes n'entre dans aucune
  palette.
- `[VAR-13]` « Modifier dans le plugin » reprend une palette du fichier par
  la porte `reprendre-palette`, qui range la recette et le suivi ensemble,
  sous un seul `figma.commitUndo()`, sans écrire une variable. La demande
  porte la recette et désigne la palette du fichier par sa collection et son
  chemin ; le sandbox relit les variables et la retrouve lui-même.
  `reprendreDuFichier` (`src/edition.ts`) crée une palette à une intensité,
  au nom du dernier segment non numérique du chemin, à la référence de la
  nuance 600 ou de la nuance colorée la plus proche. Le plugin ancre cette
  référence à la nuance de sa luminosité, qui peut différer de 600.
  En mode `recalculees`, elle est libre, avec les nuances lues, quand
  celles-ci ne sont pas celles de la recette et qu'une liste libre les
  accepte ; sinon elle suit la liste commune, et seules les nuances communes
  s'écrivent. En mode `telles-quelles`, elle est figée aux couleurs lues
  (`figees`, section 7.1), sur les seules nuances que le thème Light colore.
  Une palette groupée du fichier (`Poppy/soft/light`, `Poppy/soft/dark`,
  `Poppy/vivid/light`, `Poppy/vivid/dark`, ou ses deux autres formes) se
  reprend de même en `telles-quelles` : elle porte deux intensités, et
  `figees` y est `{ soft, vivid }`, lu dans chaque groupe. Une nuance que
  le thème Light ne colore pas dans l'une des intensités quitte les deux,
  et un alias Dark prend la couleur de Light. Les rampes rendent alors les
  couleurs du fichier à l'hexa près, et la palette est « À jour » sans
  écriture.
  Son suivi prend la liaison `reprise` : ses clés désignent les variables
  d'origine, par identifiant. Le thème Light vise le mode dont le nom
  contient « light », sans casse, s'il porte une couleur directe ; sinon le
  premier mode qui en porte une. Le thème Dark vise un autre mode dont le nom
  contient « dark », s'il porte une couleur directe, et ne
  s'écrit pas s'il n'existe pas. Une variable n'est pas suivie dans le thème
  où elle porte un alias. La dernière couleur écrite prend la couleur lue :
  une palette reprise telle quelle est « À jour » sans écriture. Pour une
  palette figée, le plan ne rend que les entrées que le suivi désigne : rien
  ne se crée ni ne se renomme, et une variable disparue quitte le suivi.
  Pour une palette recalculée, le plan couvre la palette entière dans la
  collection d'origine. Il prend le groupe configuré s'il diffère du groupe
  de référence du suivi ; sinon il suit le groupe relu dans les variables
  d'origine. Le dernier segment du chemin source nomme la palette
  (`cheminDeLaReprise`, `src/variables/plan.ts`). Le suivi range le chemin
  cible après écriture. Les noms suivent la
  forme d'une destination : `{chemin}/{intensité}/{thème}/{nuance}`, sans
  segment d'intensité à une intensité, sans segment de thème quand le thème
  Dark est en mode. Le thème Dark est en mode quand le suivi garde un mode
  Dark. Sinon il suit la destination : avec les thèmes en modes, le sandbox
  trouve ou crée le mode `Dark` de la collection d'origine (`[VAR-10]`) ;
  avec les thèmes dans le chemin, il crée les variables de `dark`. Un thème
  Dark créé dans le chemin y reste quand la destination change. Les
  fiches de reprise indiquent la forme réellement utilisée pour les thèmes,
  qui peut différer de la destination globale. Un mode suivi supprimé arrête
  l'écriture avant toute mutation ; le suivi est conservé.
  Les variables d'origine portent la rampe Light ; à deux intensités, celle de
  l'intensité qui porte la référence à la première écriture, que le suivi
  garde ensuite. Un suffixe non vide après un tiret, placé après le numéro de
  nuance dans le dernier segment, est conservé quand le plan renomme la
  variable. Ce suffixe seul ne demande pas de mise à jour ; un tiret final
  seul reste un renommage. Toute autre différence de nom est renommée : la
  variable garde son identifiant, donc ses liaisons, et la palette est « À
  mettre à jour » tant qu'un renommage reste à faire. Elle garde son nom quand
  une autre variable porte déjà celui du plan. Une variable
  d'origine disparue se recrée, et toute variable créée naît sans portée. Le
  suivi garde le chemin d'origine dès la première écriture, parce que les
  noms renommés ne le rendent plus. Une entrée sans variable dont le nom est
  celui d'une variable que la palette ne suit pas, ou qui vise un alias,
  sort du plan : le plugin n'y écrit pas. Une clé d'un plan plus ancien
  reste suivie tant que sa variable existe. Passer de
  « Recalculées » à « Telles quelles », ou annuler la reprise, est un
  rangement ordinaire de la recette. Une palette reprise puis supprimée
  rend ses variables à la liste des palettes du fichier.
  La bascule vers « Telles quelles » relit aussi les variables Dark créées
  dans le chemin, avec leurs retouches éventuelles dans Figma.
  « Passer au format du plugin » (porte `convertir-reprise`,
  `conversionDeLaReprise` dans `src/variables/conversion.ts`) rend une
  palette reprise et recalculée au format d'une palette que le plugin a
  créée, définitivement, sous un seul `figma.commitUndo()` et sans écrire de
  couleur. Ses clés rangées sous `unique` reprennent le nom de l'intensité
  qui porte les variables d'origine. Quand ses variables sont dans la
  collection de la destination et sous la forme de ses thèmes, elles restent
  les siennes : chacune prend le nom que la destination lui donne et garde
  son identifiant, donc ses liaisons, et le suivi prend la liaison
  `destination` au groupe de la destination. Un nom déjà porté par une autre
  variable de la collection, sans casse, refuse le geste avant tout
  renommage. Sinon, ses variables deviennent une sortie ancienne de la
  palette (`[UI-35]`), et la prochaine mise à jour l'écrit dans la
  destination comme une palette jamais écrite.
- `[VAR-14]` Le manifest déclare la permission `teamlibrary`. La lecture
  liste les collections de bibliothèque activées, nom, clé, bibliothèque et
  nombre de variables, et leurs palettes détectées sur les seuls noms
  (`src/variables/bibliotheques.ts`) : une valeur ne se lit qu'après
  l'import de sa variable. Figma rend ces collections par une lecture par
  collection : le sandbox les lit au premier état, puis à « Synchroniser »,
  et les garde entre deux. Une collection de bibliothèque n'est jamais une
  destination. « Copier dans le plugin », par la porte `copier-palette`,
  importe les variables de cette seule palette, lit leurs couleurs, puis la
  reprend en mode `recalculees` et range la recette, sous un seul
  `figma.commitUndo()`. La copie n'a pas de liaison de reprise : elle
  s'écrira dans la destination des tokens, jamais dans la bibliothèque. La
  confirmation, dans la fiche, dit combien de variables de la bibliothèque
  s'ajoutent au fichier. Des variables qui ne portent que des alias n'ont
  aucune couleur à copier. Un refus sur une collection conserve les autres
  bibliothèques accessibles ; la notice nomme les collections illisibles.
  Si `figma.teamLibrary` manque ou si la liste des collections est refusée,
  la lecture rend une liste vide, dite illisible, et le reste de Gestion fonctionne.
  La copie valide l'identifiant de palette et la recette avant l'import.
  Un échec après import nomme les références importées ; elles restent dans
  le fichier, y compris celles qu'il utilisait déjà.

### 17.5 Ce que le plugin n'écrit jamais

Le plugin n'écrit ni `brand`, ni `theme`, ni `usage`, ni alias. Il ne crée
ni marque, ni destination par palette. Il ne lie aucune pastille de planche
à une variable : la planche garde ses couleurs écrites, et son état se lit
dans Gestion. Les variables écrites s'exportent par UCM Exporter comme les
autres, sans changement de son moteur.

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
plan](https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/PLAN-PLUGIN-PALETTES.md#règles-de-conduite). Trois d'entre elles
touchent à cette spécification :

- lire ce document section par section, au lot qui la concerne ;
- mesurer avant d'implémenter une prémisse : une formule de ce document qui
  contredit une mesure se corrige ici, et le commit le dit ;
- ne rien changer au comportement d'UCM Exporter. Le lot 8 est le seul qui
  touche son paquet, et il ne change ni son DOM ni ses styles calculés.

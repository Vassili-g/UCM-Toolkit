# Harmonisation entre palettes : dossier

**Statut : recherche faite, maquettes à valider.** Ce dossier reprend le
[plan de recherche](./PLAN-RECHERCHE-HARMONISATION.md) du 2 octobre et la
[note de recherche](./RECHERCHE-HARMONISATION.md) du 5 octobre. Il mesure une
recette réelle, calcule trois façons d'harmoniser, résume le marché et
propose une interface. Les [maquettes](./Maquettes/MAQUETTES-HARMONISATION.html)
la montrent. Sept décisions restent au mainteneur (section 8).

## 1. Le besoin

Un designer règle chaque palette seule : la luminosité et la saturation du
Réglage global, puis le Color shift à chaque bout. Après quelques gestes, rien
ne lui dit si son alerte de danger a encore le poids de son alerte de succès.
Il demande deux gestes : comparer un groupe de palettes, puis l'harmoniser
sans recopier les valeurs d'une carte à l'autre.

## 2. Ce qui a changé depuis le plan

| Sujet | Plan du 2 octobre | Aujourd'hui |
|---|---|---|
| Recette | Format 8 | Format 10 : texte des boutons, palettes figées à deux intensités |
| Ce que le thème lit | Les emplois, nuances 50, 100, 300, 700 | Les dossiers `solid`, `surface`, `page` : 100, 200, 300 pour les fonds teintés, 600 à 900 pour les textes, le focus et les pleins (`TABLE_DES_DOSSIERS`) |
| Vérification sans palette ouverte | Un écran vide | Le nuancier de toutes les palettes, le bilan en trois onglets, les paires trop proches (V3a) |
| Création sans palette ouverte | Un écran vide | Le même nuancier (A2a) |

Le script de mesure du plan lisait les anciens emplois et écartait de son
calcul les nuances qui portent une référence. La section 3 montre que ces
nuances portent le plus grand écart.

## 3. Mesure sur une recette réelle

### Source et méthode

La recette mesurée est l'export `palettes-et-reglages-poppy-reparee.json` du
8 octobre : sept palettes, dont le groupe des statuts Poppy (danger),
Orange (warning), Grass (success) et Sky (info). Elle n'est pas rangée dans le
dépôt ; les scripts prennent son chemin en argument (section 10).

[`mesurer-ecarts.mjs`](./mesurer-ecarts.mjs) lit les rampes finales
(`rampesDe`) sur chaque variable du thème, dans le sens du thème de chaque
mode. Il compte la référence et la marque ◆.

### Réglages des quatre palettes

| Palette | Référence | Porteur | Parts Soft · Vivid | Luminosité du Réglage global | Color shift de luminosité Vivid (clair, sombre) | Référence en Light, en Dark |
|---|---|---|---|---|---|---|
| Poppy | `#ED0007` | Vivid | 1,00 · 1,00 | Soft +0,015 | −0,020 · +0,045 | 600 · 700 |
| Orange | `#F7A600` | Vivid | 0,92 · 1,00 | aucune | −0,020 · +0,045 | 400 · 900 |
| Grass | `#00BD5F` | Vivid | 0,45 · 1,00 | aucune | aucun | 500 · 800 |
| Sky | `#23BEFD` | Vivid | 0,65 · 0,97 | aucune | −0,015 · 0 | 400 · 800 |

Les réglages de Poppy viennent de sa reconstruction hors plugin (recette v8,
T18).

### Écarts mesurés

Écart de clarté OKLCH entre les quatre palettes, le plus grand d'une vue,
hors des nuances ◆, puis sur elles. Rapport de chroma : la plus forte sur la
plus faible, sur une même variable.

| Vue | Écart hors ◆ | Variable du pire écart | Écart sur ◆ | Rapport de chroma | Texte des boutons sur `solid/default` |
|---|---|---|---|---|---|
| Light · Soft | 0,016 | `solid/pressed` | aucune ◆ | ×3,0 | 5,80 à 6,31:1 |
| Light · Vivid | 0,041 | `solid/pressed` | 0,018 (`page/focus`) | ×2,9 | 5,61 à 6,32:1 |
| Dark · Soft | 0,016 | `surface/pressed` | aucune ◆ | ×3,1 | 4,67 à 5,13:1 |
| Dark · Vivid | 0,047 | `surface/default` | 0,065 (`surface/foreground`), 0,060 (`page/foreground`), 0,044 (`solid/default`) | ×2,5 | 4,52 à 4,74:1 |

La marche de clarté entre deux nuances voisines vaut 0,04 à 0,08 selon la
courbe. Un écart de 0,047 sur `surface/default` en Dark vaut donc plus d'une
demi-marche, sur le fond de chaque alerte.

### Les quatre causes

1. **Le Color shift de luminosité de Vivid.** Poppy et Orange ont +0,045 au
   bout sombre, Grass et Sky rien. En Light, leurs pleins au survol et à
   l'appui (800, 900) sont plus clairs de 0,03 à 0,04. En Dark, le bout
   sombre est celui des fonds : tout le dossier `surface` est plus clair de
   0,045.
2. **La luminosité globale de Soft.** +0,015 sur Poppy seule : toute sa rampe
   Soft est plus claire de 0,015, dans les deux thèmes.
3. **La référence.** Chaque référence garde ses octets à la nuance de sa
   clarté. En Dark, cette nuance diffère d'une palette à l'autre (Poppy 700,
   Grass et Sky 800, Orange 900) et tombe sur les textes et le plein. Écart de
   0,044 à 0,065, avant tout réglage. C'est la cause de l'écart en Dark le plus
   grand.
4. **La saturation de Soft.** Les parts valent 1,00, 0,92, 0,65 et 0,45. La
   chroma de Poppy y est trois fois celle de Grass : `#C2002C` contre
   `#496E4C` sur `solid/default`. La part Soft de Poppy vaut celle de son
   Vivid : ses deux profils ont la même saturation, ce qui vient peut-être de
   sa reconstruction.

Sans les causes 1 et 2, l'écart hors ◆ tombe à 0,002 dans les quatre vues
(section 4). La courbe commune de la recette fait déjà l'accord ; les
réglages propres le défont.

## 4. Le calcul de l'harmonisation

[`calculer-harmonisation.mjs`](./calculer-harmonisation.mjs) applique chaque
proposition par les gestes du plugin (`reglerClarte`, `reglerDecalage`,
`reglerSaturation`), puis juge les rampes finales : écart de clarté au
modèle hors ◆ et sur ◆, promesses qui manqueraient, ordre des nuances.

### Luminosité

Trois cibles :

- **Les courbes de la recette** : le groupe entier revient à zéro sur la
  luminosité du Réglage global et le Color shift de luminosité. La luminosité
  globale du profil porteur reste, car la changer déplacerait la référence
  (H5).
- **Recopie d'un modèle** : chaque palette prend les valeurs de Poppy.
- **Recherche** : chaque palette prend, au pas des réglettes (0,005), les
  valeurs qui approchent le mieux les clartés de Poppy. Une valeur qui ferait
  manquer une promesse tenue est écartée, comme la butée d'une réglette
  l'écarterait.

Écart hors ◆ au modèle, sur les deux thèmes :

| Profil | Palette | Avant | Courbes | Recopie de Poppy | Recherche vers Poppy |
|---|---|---|---|---|---|
| Soft | Orange | 0,016 | 0,002 | 0,002 | 0,002 |
| Soft | Grass | 0,016 | 0,002 | 0,002, mais **manque** : texte des boutons sur 700, Dark · Soft, 4,42:1 | 0,010 |
| Soft | Sky | 0,016 | 0,002 | 0,002 | 0,002 |
| Vivid | Orange | 0,012 | 0,002 | 0,012 (déjà les valeurs de Poppy) | 0,012 |
| Vivid | Grass | 0,046 | 0,002 | 0,008, mais **manque** : 4,24:1 en Dark · Vivid | 0,041 |
| Vivid | Sky | 0,045 | 0,002 | 0,009, mais **manque** : 4,37:1 en Dark · Vivid | 0,020 |

Sur les nuances ◆, l'écart reste de 0,043 à 0,065 en Dark · Vivid pour toutes
les cibles.

### Saturation de Soft

| Palette | Avant (rapport de chroma au modèle) | Même part que le modèle | Part qui approche le mieux la chroma du modèle |
|---|---|---|---|
| Modèle Grass (part 0,45) | | | |
| Poppy | 1,00 · ×3,04 | 0,45 · ×4,72 | 0,88 · ×2,66 |
| Orange | 0,92 · ×1,55 | 0,45 · ×3,17 | 0,94 · ×1,52 |
| Sky | 0,65 · ×2,69 | 0,45 · ×3,76 | 0,96 · ×1,79 |
| Modèle Poppy (part 1,00) | | | |
| Orange | 0,92 · ×2,19 | 1,00 · ×1,97 | 1,00 · ×1,97 |
| Grass | 0,45 · ×3,04 | 1,00 · ×5,48 | 0,49 · ×2,80 |
| Sky | 0,65 · ×2,59 | 0,97 · ×1,82 | 0,94 · ×1,82 |

Le rapport est le pire sur toutes les variables des deux thèmes.

### Ce que le calcul établit

1. **Revenir aux courbes aligne le groupe** à 0,002 près, sans manquer une
   garantie. C'est aussi le geste le plus lisible : « retirer les réglages de
   luminosité propres ».
2. **S'aligner sur une palette qui a éclairci son bout sombre coûte du
   contraste aux autres.** Le texte blanc des boutons sur le plein en Dark
   (thème inversé) est juste au-dessus de 4,5:1 ; +0,045 le fait passer
   dessous pour Grass et Sky.
3. **Sous les garanties, la recherche ne suit pas Poppy.** Grass reste à 0,041
   et Sky à 0,020 : le modèle visé est hors d'atteinte.
4. **L'écart des références ne se corrige pas par la luminosité.** Il vient de
   la référence elle-même. Seule une autre référence, ou un autre profil
   porteur, le changerait ; c'est un choix de marque, pas une harmonisation.
5. **La saturation ne s'aligne pas avec une part.** Une même part ne
   rapproche pas les chromas : vers Grass, elle aggrave l'écart (×3,2 à
   ×4,7) ; vers Poppy, elle aide Orange et Sky mais porte Grass à ×5,5. La
   meilleure part laisse ×1,5 à ×2,8, parce que le plafond sRGB n'a pas la
   même forme d'une teinte à l'autre. Aligner la
   chroma demanderait une part rapportée à un plafond commun, que le plan met
   hors périmètre.

### Un reste de la reconstruction de Poppy

Poppy porte une luminosité Vivid de −0,00009, résidu de sa reconstruction.
Le premier geste qui touche ses réglages réécrit la référence depuis son
départ : `#ED0007` devient `#ED0008`. Le calcul et les maquettes le montrent.
Ramener ce résidu à zéro dans la recette l'effacerait.

## 5. Ce que fait le marché

Recherche du 8 octobre, sources vérifiées sauf mention.

| Outil | Grandeur commune | Accord | Saturation entre teintes | Vue ou geste de groupe |
|---|---|---|---|---|
| [Adobe Leonardo](https://leonardocolor.io/theme.html) | Contraste cible par nuance contre un fond | Par construction | Curseur commun au thème | Curseurs globaux de clarté, contraste, saturation ; courbes de clarté et de chroma |
| [Material 3](https://github.com/material-foundation/material-color-utilities/blob/main/typescript/palettes/core_palette.ts) | Tone (L\* CIE) | Par construction | Chroma absolue par palette, réduite au gamut | Aucune vue documentée |
| [Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) | Contraste APCA par rôle | Réglé à la main | Étape 9 au maximum de chroma de l'échelle | Aucune |
| [Stripe](https://stripe.com/blog/accessible-color-systems) | Une courbe de clarté commune | Par construction, puis à l'œil | « Poids visuel » constant, sans algorithme publié | Graphiques teintes × nuances, avant et après |
| [Atlassian](https://atlassian.design/foundations/color/color-palette) | Contraste aligné entre teintes, méthode non publiée | Non publié | Non publié | Aucune |
| Tailwind v4, Carbon | Aucune garantie publiée | À la main | Libre | Aucune |
| Huetone, Supa Palette, Harmonizer | OKLCH ou contraste par niveau | À la main ou par construction | Par palette | Grille teintes × niveaux (Huetone, non vérifié) |

Trois constats :

1. L'accord de clarté s'obtient partout **par construction** : une courbe ou un
   contraste commun à toutes les teintes. UCM Palettes le fait déjà avec ses
   courbes ; ce sont les réglages propres qui le défont.
2. **La saturation est laissée à l'œil** ou fixée en chroma absolue (Material).
   Aucune source ne règle une part du plafond sRGB par teinte comme UCM.
3. **Le geste de groupe documenté est un curseur global** (Leonardo, Color
   Scales I/O), pas un alignement sur une palette.

## 6. Réponses proposées aux questions du plan

| # | Réponse proposée | Appui |
|---|---|---|
| M1 | Les nuances rendues : clarté et chroma. Les valeurs saisies se lisent dans les causes | Section 3 |
| M2 | Les variables du thème, par dossier | `TABLE_DES_DOSSIERS` |
| M3 | Seuil provisoire 0,02 ; à fixer sur la grille et les composants des maquettes | D6 |
| M4 | La chroma OKLCH, car la part ne dit pas la quantité de couleur | Section 4, saturation |
| M5 | Pas de verdict : des écarts, et un point ambre au-dessus du seuil | Maquette M1 |
| M6 | Un groupe de deux palettes ou plus | Maquette M1 |
| M7 | Les deux contrastes d'un composant tiennent tous ; le texte des boutons en Dark est le plus serré (4,52:1) | Section 3 |
| M8 | Soft contre Soft, Vivid contre Vivid. Une palette à une intensité entre dans les deux vues avec sa rampe unique, marquée ; une palette figée se compare sans geste d'alignement ; une palette libre ne se compare pas | À maquetter si D1 est retenue |
| H1 | Les courbes de la recette d'abord, une palette modèle en second | Section 4 |
| H2 | Remettre à zéro, pas chercher : le calcul exact ne fait pas mieux sous les garanties | Section 4 |
| H3 | La luminosité seule | Section 4, point 5 |
| H4 | La proposition se juge sur le résultat combiné ; une palette qui manquerait une promesse est laissée et nommée | D7 |
| H5 | La luminosité globale du profil porteur ne bouge pas | Section 4 |
| H6 | Geste ponctuel | D5 |
| H7 | Le réglage de groupe est la piste D ; le marché le fait par un curseur global. Il demande un groupe rangé dans la recette | Hors de cette proposition |
| H8 | Soft et Vivid, Light et Dark ensemble : la remise à zéro les traite tous | Section 4 |
| I1 | Vérification sans palette ouverte | Maquette M1 |
| I2 | Après le réglage ; le témoin de Création reste une variante | Maquettes M1, M4 |
| I3 | Choisi à la volée, rien dans la recette | D2 |
| I4 | Une grille par dossier, une réglette d'écart sans chiffre, la clarté seule en gris, et les composants | Maquettes M1, M2 |
| I5 | Oui, dans la forme de « Ajuster la référence » | Maquette M3 |
| I6 | Un seul rangement, défait en une fois ; les tokens passent à « À mettre à jour » | Maquette M3 |

## 7. Les maquettes

[MAQUETTES-HARMONISATION.html](./Maquettes/MAQUETTES-HARMONISATION.html), dans
les styles du plugin tirés de la galerie, avec les couleurs de la recette
mesurée :

- **Aujourd'hui** : Vérification sans palette ouverte, capture de la galerie.
- **M1. Comparer dans Vérification** : « Comparer » passe le nuancier en
  sélection ; la grille par dossier, la réglette d'écart, ◆, « Clarté seule »
  et les causes en clair.
- **M2. Composants** : alerte, bouton plein, bouton contour et lien de chaque
  palette, sur le fond du thème.
- **M3. Aligner la luminosité** : la modale, ses deux cibles, avant et après,
  les garanties et l'écart restant.
- **M4. Variante : témoin dans Création** : l'Aperçu de Poppy et la rampe
  d'une autre palette, avec l'écart à chaque nuance.

## 8. Décisions attendues du mainteneur

| # | Décision | Proposition |
|---|---|---|
| D1 | Où comparer | M1 dans Vérification ; M4 plus tard si le besoin pendant le réglage se confirme |
| D2 | Groupe choisi à la volée ou rangé | À la volée, rien dans la recette |
| D3 | Cible de l'alignement | Les courbes de la recette d'abord ; une palette modèle en second choix |
| D4 | Ce qui s'aligne | La luminosité seule ; la saturation se compare sans s'aligner |
| D5 | Geste ponctuel ou accord suivi | Geste ponctuel ; pas d'alerte de plus dans le bilan |
| D6 | Seuil de l'écart | 0,02 provisoire, à fixer sur M1 et M2 |
| D7 | Une palette refusée par ses garanties | Appliquer aux autres et la nommer |

Après ces décisions : un plan d'implémentation par lots (mesure dans
`packages/couleur`, geste dans `edition.ts`, vue dans le bilan, textes en
deux langues, galerie et tests d'interface).

## 9. Limites

- Une seule recette et un seul groupe. Une seconde recette, avec des palettes
  à une intensité ou figées, vérifierait M8.
- Le seuil de 0,02 n'est validé par aucun essai à l'œil.
- La saturation de Soft de Poppy peut venir de sa reconstruction ; le
  mainteneur dira si elle est voulue.
- Le marché ne publie pas comment Atlassian, Carbon ou Radix calibrent leurs
  teintes entre elles ; Huetone et Rampancy n'ont pas pu être vérifiés.

## 10. Reproduire

```sh
npx tsx "docs/notes/Recherches/Plugin Palettes/Harmonisation entre palettes/mesurer-ecarts.mjs" recette.json
npx tsx "docs/notes/Recherches/Plugin Palettes/Harmonisation entre palettes/calculer-harmonisation.mjs" recette.json --modele Poppy
npx tsx "docs/notes/Recherches/Plugin Palettes/Harmonisation entre palettes/calculer-harmonisation.mjs" recette.json --modele Grass
npx tsx "docs/notes/Recherches/Plugin Palettes/Harmonisation entre palettes/Maquettes/generer-donnees.mjs" recette.json
```

`--groupe` change le groupe (par défaut Poppy, Orange, Grass, Sky). La recherche
prend une dizaine de secondes. `generer-donnees.mjs` récrit
`Maquettes/donnees.js`.

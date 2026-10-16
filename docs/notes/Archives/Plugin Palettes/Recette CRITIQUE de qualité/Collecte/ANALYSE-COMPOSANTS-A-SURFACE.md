# Composants à surface colorée dans onze systèmes de design

Ce document relève, pour chaque type de composant qui porte une surface colorée, les pas ou crans de rampe que chaque système emploie pour le fond, le texte, le contour et les états, en clair et en sombre, avec les contrastes. Il décrit des valeurs publiées et ne recommande rien à UCM. Il complète [`RELEVE-STATUTS-ET-FOCUS.md`](./RELEVE-STATUTS-ET-FOCUS.md) et [`Surfaces/`](./Surfaces/README.md), dont il reprend la méthode.

Types relevés : badge discret (subtle, soft, lozenge, tag, chip), badge plein (solid), alerte ou bannière en ligne (callout, flash, section message, inline notification, message bar), bouton teinté (soft, subtle, tonal, secondaire coloré) avec repos, survol et appui, et bouton plein pour son survol et son appui seulement.

Systèmes : Radix Themes, Atlassian, GitHub Primer, Shopify Polaris, Microsoft Fluent 2, Material 3, Material UI, Adobe Spectrum 2, Tremor (classes Tailwind CSS 4), Carbon et le kit Figma d'Untitled UI.

## Reproduire

```
node Collecte/Composants/fetch.mjs     # télécharge à version épinglée, réécrit sources.json
node Collecte/Composants/extract.mjs   # relit les sources, réécrit processed/composants.json et les tableaux de ce fichier
```

`fetch.mjs` n'installe aucun paquet : il prend chaque fichier à une version npm épinglée (jsdelivr) ou à une révision GitHub épinglée, l'écrit dans `Composants/sources/` avec l'extension `.txt` ajoutée, et consigne l'URL, la version, le chemin d'origine et le SHA-256 dans `Composants/sources.json`. Les fichiers déjà figés par `Surfaces/`, `Radix/` et `Figma/` ne sont pas retéléchargés : ils sont repris par chemin, leur SHA-256 est relu, et ils portent la mention `reutilise`. Une seconde exécution donne un `sources.json` identique à l'octet près.

`extract.mjs` lit ces fichiers par motifs et par `JSON.parse` des tables publiées, sans exécuter aucun code téléchargé. Il refuse de s'exécuter si un SHA-256 ne correspond pas, et s'arrête si une règle attendue (couple fond/texte d'un composant, classe, jeton) n'est plus dans le fichier source. Chaque valeur de `processed/composants.json` porte `token`, `valeurPubliee`, `source.fichier` (et `source.ligne` quand le fichier n'est pas compacté), le pas quand l'échelle en a un, et le fichier du composant (`composant`). Les tableaux de ce document sont réécrits par `extract.mjs` entre les marqueurs `tableau` et `ecart` ; le reste est rédigé à la main.

## Lecture des tableaux

- **Pas** : entre crochets après la valeur. Radix `a3` est le troisième pas de l'échelle alpha. Tailwind et Untitled donnent le cran (`50`, `700`). Atlassian et Spectrum donnent un palier ou un cran propre (`subtler`, `bolder`, `800`). Fluent donne un pas nommé de la couleur (`tint60`, `shade10`). Material 3 donne le ton de la palette de référence (`ton 90`). Primer et Polaris ne publient que des jetons fonctionnels : aucun pas numéroté n'est lisible.
- **Hexa** : la valeur publiée, ou la valeur calculée quand elle est suivie de `~`. Le signe `~` marque une couleur translucide composée sur son support, une couche d'état de Material 3 ou une formule de Material UI. `α` donne l'opacité publiée. Les couleurs de Tremor viennent de `theme.css` de Tailwind 4.1.3 en oklch, converties en sRGB par le script et arrondies à 8 bits.
- **Texte/fond** : contraste WCAG 2 calculé sur les hexa. Un fond translucide est composé sur la carte du système (sur la page quand il n'y a pas de carte), puis un texte translucide est composé sur ce fond.
- **Fond/page** et **Fond/carte** : contraste entre le fond du composant, composé sur le support correspondant, et ce support. La page et la carte viennent de `Surfaces/processed/surfaces.json` pour Radix, Atlassian, Primer, Polaris, Material 3, Fluent (carte seule) et Carbon. Spectrum prend `background-base-color` comme page et `background-layer-2-color` comme carte. Material UI prend `background.default` et `background.paper`. Tremor prend le fond de son composant Card, sans page. Untitled n'a aucun support relevé.
- **Thèmes** : `clair` et `sombre`. Carbon a quatre thèmes (`white`, `g10`, `g90`, `g100`). Le thème sombre de Polaris est `dark-experimental`, partiel : ses jetons de statut gardent les valeurs claires.
- **Tons** : les tableaux montrent danger, success et warning, plus les lignes sans ton de statut (neutre, marque, secondaire, primaire). Le ton info est dans `processed/composants.json`. Pour Radix, les familles témoins sont green (success), amber (warning), red (danger) et blue (info) : Radix expose des familles de couleur et ne leur attribue pas ces sens.
- Aucun rendu navigateur : les contrastes sont calculés sur les hexa lus.

Les fourchettes de contraste citées dans les sections « Ce que font la plupart » portent sur les tons danger, success et warning, hors thème sombre de Polaris.

## 1. Badge discret

Radix `soft` et `surface`, Atlassian Lozenge, Primer Label, Polaris Badge, Fluent Badge `tint`, Material 3 Assist chip, Material UI Chip, Spectrum Badge `subtle` et `outline`, Tremor Badge, Untitled UI badges.

### Écart de pas entre fond et texte

<!-- ecart:badge-discret -->
| Système, composant, variante | Thème | Tons | Pas du fond | Pas du texte | Écart |
|---|---|---|---|---|---|
| Radix Themes : Badge soft | clair | danger, success, warning | a3 | a11 | 8 crans (échelle 1 à 12) |
| Radix Themes : Badge soft | sombre | danger, success, warning | a3 | a11 | 8 crans (échelle 1 à 12) |
| Radix Themes : Badge surface | clair | danger, success, warning | surface | a11 | échelle nommée, écart non compté |
| Radix Themes : Badge surface | sombre | danger, success, warning | surface | a11 | échelle nommée, écart non compté |
| Atlassian : Lozenge semantic (défaut) | clair | danger, success, warning | subtler | bolder | échelle nommée, écart non compté |
| Atlassian : Lozenge semantic (défaut) | sombre | danger, success, warning | subtler | bolder | échelle nommée, écart non compté |
| Microsoft Fluent 2 : Badge tint | clair | danger | red.tint60 | red.shade10 | échelle nommée, écart non compté |
| Microsoft Fluent 2 : Badge tint | sombre | danger | red.shade40 | red.tint30 | échelle nommée, écart non compté |
| Microsoft Fluent 2 : Badge tint | clair | success | green.tint60 | green.shade10 | échelle nommée, écart non compté |
| Microsoft Fluent 2 : Badge tint | sombre | success | green.shade40 | green.tint30 | échelle nommée, écart non compté |
| Microsoft Fluent 2 : Badge tint | clair | warning | yellow.tint60 | yellow.shade30 | échelle nommée, écart non compté |
| Microsoft Fluent 2 : Badge tint | sombre | warning | yellow.shade40 | yellow.tint30 | échelle nommée, écart non compté |
| Adobe Spectrum 2 : Badge subtle | clair | danger, success, warning | 200 | 1000 | 8 crans de 100 (fond dans l'échelle du ton, texte dans celle du gris) |
| Adobe Spectrum 2 : Badge subtle | sombre | danger, success, warning | 300 | 1000 | 7 crans de 100 (fond dans l'échelle du ton, texte dans celle du gris) |
| Tremor (Tailwind CSS) : Badge neutral | clair | neutre | 50 | 900 | 9 crans, échelle 50 à 950 |
| Tremor (Tailwind CSS) : Badge neutral | sombre | neutre | 400/10 | 400 | 0 cran (fond à 10 %), échelle 50 à 950 |
| Tremor (Tailwind CSS) : Badge success | clair | success | 50 | 900 | 9 crans, échelle 50 à 950 |
| Tremor (Tailwind CSS) : Badge success | sombre | success | 400/10 | 400 | 0 cran (fond à 10 %), échelle 50 à 950 |
| Tremor (Tailwind CSS) : Badge error | clair | danger | 50 | 900 | 9 crans, échelle 50 à 950 |
| Tremor (Tailwind CSS) : Badge error | sombre | danger | 400/10 | 400 | 0 cran (fond à 10 %), échelle 50 à 950 |
| Tremor (Tailwind CSS) : Badge warning | clair | warning | 50 | 900 | 9 crans, échelle 50 à 950 |
| Tremor (Tailwind CSS) : Badge warning | sombre | warning | 400/10 | 500 | 1 cran (fond à 10 %), échelle 50 à 950 |
| Untitled UI (kit Figma) : Badge (groupe, Figma) color=ton | clair | danger, warning, success | 50 | 700 | 7 crans, échelle 50 à 950 |
<!-- /ecart -->

### Valeurs

<!-- tableau:badge-discret -->
| Système, composant, variante | Thème | Ton | Fond | Texte | Contour | Texte/fond | Fond/page | Fond/carte |
|---|---|---|---|---|---|---|---|---|
| Radix Themes 3.3.0 : Badge soft | clair | danger | `--accent-a3` #feebec~ α8 % [a3] | `--accent-a11` #ce292e~ α83 % [a11] | - | 4.60 | 1.15 | 1.15 |
| Radix Themes 3.3.0 : Badge soft | sombre | danger | `--accent-a3` #411920~ α18 % [a3] | `--accent-a11` #ff9592 [a11] | - | 7.20 | 1.16 | 1.16 |
| Radix Themes 3.3.0 : Badge soft | clair | success | `--accent-a3` #e6f6eb~ α10 % [a3] | `--accent-a11` #1e8255~ α87 % [a11] | - | 4.28 | 1.12 | 1.12 |
| Radix Themes 3.3.0 : Badge soft | sombre | success | `--accent-a3` #1a3428~ α12 % [a3] | `--accent-a11` #3fdc90~ α83 % [a11] | - | 7.57 | 1.28 | 1.31 |
| Radix Themes 3.3.0 : Badge soft | clair | warning | `--accent-a3` #fff7c2~ α24 % [a3] | `--accent-a11` #ab6400 [a11] | - | 4.25 | 1.09 | 1.09 |
| Radix Themes 3.3.0 : Badge soft | sombre | warning | `--accent-a3` #372716~ α13 % [a3] | `--accent-a11` #ffca16 [a11] | - | 9.36 | 1.20 | 1.23 |
| Radix Themes 3.3.0 : Badge surface | clair | danger | `--accent-surface` #fff7f7~ α80 % [surface] | `--accent-a11` #ce2b30~ α83 % [a11] | `--accent-a6` #fdbdbe~ α26 % [a6] (1px, ombre interne) | 4.96 | 1.06 | 1.06 |
| Radix Themes 3.3.0 : Badge surface | sombre | danger | `--accent-surface` #241718~ α50 % [surface] | `--accent-a11` #ff9592 [a11] | `--accent-a6` #772832~ α41 % [a6] (1px, ombre interne) | 8.23 | 1.05 | 1.01 |
| Radix Themes 3.3.0 : Badge surface | clair | success | `--accent-surface` #f4fbf6~ α80 % [surface] | `--accent-a11` #1f8357~ α87 % [a11] | `--accent-a6` #adddc0~ α32 % [a6] (1px, ombre interne) | 4.50 | 1.05 | 1.05 |
| Radix Themes 3.3.0 : Badge surface | sombre | success | `--accent-surface` #171f1b~ α50 % [surface] | `--accent-a11` #3ed88e~ α83 % [a11] | `--accent-a6` #265d44~ α29 % [a6] (1px, ombre interne) | 9.15 | 1.08 | 1.05 |
| Radix Themes 3.3.0 : Badge surface | clair | warning | `--accent-surface` #fefbe9~ α80 % [surface] | `--accent-a11` #ab6400 [a11] | `--accent-a6` #f3d673~ α55 % [a6] (1px, ombre interne) | 4.43 | 1.04 | 1.04 |
| Radix Themes 3.3.0 : Badge surface | sombre | warning | `--accent-surface` #201c16~ α50 % [surface] | `--accent-a11` #ffca16 [a11] | `--accent-a6` #624211~ α32 % [a6] (1px, ombre interne) | 11.07 | 1.07 | 1.04 |
| Atlassian lozenge 17.0.5 : Lozenge semantic (défaut) | clair | danger | `color.background.danger.subtler` #ffd5d2 [subtler] | `color.text.danger.bolder` #5d1f1a [bolder] | `color.border.danger.subtle` #fd9891 [subtle] | 9.37 | 1.34 | 1.34 |
| Atlassian lozenge 17.0.5 : Lozenge semantic (défaut) | sombre | danger | `color.background.danger.subtler` #5d1f1a [subtler] | `color.text.danger.bolder` #ffd5d2 [bolder] | `color.border.danger.subtle` #ae2e24 [subtle] | 9.37 | 1.31 | 1.22 |
| Atlassian lozenge 17.0.5 : Lozenge semantic (défaut) | clair | success | `color.background.success.subtler` #d3f1a7 [subtler] | `color.text.success.bolder` #37471f [bolder] | `color.border.success.subtle` #b3df72 [subtle] | 8.12 | 1.24 | 1.24 |
| Atlassian lozenge 17.0.5 : Lozenge semantic (défaut) | sombre | success | `color.background.success.subtler` #37471f [subtler] | `color.text.success.bolder` #d3f1a7 [bolder] | `color.border.success.subtle` #4c6b1f [subtle] | 8.12 | 1.63 | 1.52 |
| Atlassian lozenge 17.0.5 : Lozenge semantic (défaut) | clair | warning | `color.background.warning.subtler` #fce4a6 [subtler] | `color.text.warning.bolder` #693200 [bolder] | `color.border.warning.subtle` #fbc828 [subtle] | 8.16 | 1.25 | 1.25 |
| Atlassian lozenge 17.0.5 : Lozenge semantic (défaut) | sombre | warning | `color.background.warning.subtler` #693200 [subtler] | `color.text.warning.bolder` #fce4a6 [bolder] | `color.border.warning.subtle` #9e4c00 [subtle] | 8.16 | 1.61 | 1.50 |
| GitHub Primer react 38.40.1 : Label success | clair | success | `background-color: transparent` #ffffff~ | `--fgColor-success` #1a7f37 | `--bgColor-success-emphasis` #1f883d | 5.08 | 1.00 | 1.00 |
| GitHub Primer react 38.40.1 : Label success | sombre | success | `background-color: transparent` #151b23~ | `--fgColor-success` #3fb950 | `--bgColor-success-emphasis` #238636 | 6.82 | 1.00 | 1.00 |
| GitHub Primer react 38.40.1 : Label attention | clair | warning | `background-color: transparent` #ffffff~ | `--fgColor-attention` #9a6700 | `--bgColor-attention-emphasis` #9a6700 | 4.87 | 1.00 | 1.00 |
| GitHub Primer react 38.40.1 : Label attention | sombre | warning | `background-color: transparent` #151b23~ | `--fgColor-attention` #d29922 | `--bgColor-attention-emphasis` #9e6a03 | 6.86 | 1.00 | 1.00 |
| GitHub Primer react 38.40.1 : Label danger | clair | danger | `background-color: transparent` #ffffff~ | `--fgColor-danger` #d1242f | `--borderColor-danger-emphasis` #cf222e | 5.24 | 1.00 | 1.00 |
| GitHub Primer react 38.40.1 : Label danger | sombre | danger | `background-color: transparent` #151b23~ | `--fgColor-danger` #f85149 | `--borderColor-danger-emphasis` #da3633 | 5.16 | 1.00 | 1.00 |
| Shopify Polaris 13.9.5 : Badge tone critical | clair | danger | `color-bg-fill-critical-secondary` #fed1d7 | `color-text-critical` #8e0b21 | - | 6.90 | 1.21 | 1.37 |
| Shopify Polaris 13.9.5 : Badge tone critical | sombre | danger | `color-bg-fill-critical-secondary` #fed1d7 | `color-text-critical` #8e0b21 | - | 6.90 | 12.69 | 9.63 |
| Shopify Polaris 13.9.5 : Badge tone success | clair | success | `color-bg-fill-success-secondary` #affebf | `color-text-success` #014b40 | - | 8.53 | 1.05 | 1.18 |
| Shopify Polaris 13.9.5 : Badge tone success | sombre | success | `color-bg-fill-success-secondary` #affebf | `color-text-success` #014b40 | - | 8.53 | 14.71 | 11.16 |
| Shopify Polaris 13.9.5 : Badge tone warning | clair | warning | `color-bg-fill-warning-secondary` #ffd6a4 | `color-text-warning` #5e4200 | - | 6.83 | 1.21 | 1.36 |
| Shopify Polaris 13.9.5 : Badge tone warning | sombre | warning | `color-bg-fill-warning-secondary` #ffd6a4 | `color-text-warning` #5e4200 | - | 6.83 | 12.77 | 9.68 |
| Microsoft Fluent 2 react-badge 9.5.6 : Badge tint danger | clair | danger | `colorPaletteRedBackground1` #fdf6f6 [red.tint60] | `colorPaletteRedForeground1` #bc2f32 [red.shade10] | `colorPaletteRedBorder1` #f1bbbc [red.tint40] | 5.48 | - | 1.07 |
| Microsoft Fluent 2 react-badge 9.5.6 : Badge tint danger | sombre | danger | `colorPaletteRedBackground1` #3f1011 [red.shade40] | `colorPaletteRedForeground1` #e37d80 [red.tint30] | `colorPaletteRedBorder1` #d13438 [red.primary] | 5.81 | - | 1.12 |
| Microsoft Fluent 2 react-badge 9.5.6 : Badge tint success | clair | success | `colorPaletteGreenBackground1` #f1faf1 [green.tint60] | `colorPaletteGreenForeground1` #0e700e [green.shade10] | `colorPaletteGreenBorder1` #9fd89f [green.tint40] | 5.89 | - | 1.07 |
| Microsoft Fluent 2 react-badge 9.5.6 : Badge tint success | sombre | success | `colorPaletteGreenBackground1` #052505 [green.shade40] | `colorPaletteGreenForeground1` #54b054 [green.tint30] | `colorPaletteGreenBorder1` #107c10 [green.primary] | 6.06 | - | 1.13 |
| Microsoft Fluent 2 react-badge 9.5.6 : Badge tint warning | clair | warning | `colorPaletteYellowBackground1` #fffef5 [yellow.tint60] | `colorPaletteYellowForeground1` #817400 [yellow.shade30] | `colorPaletteYellowBorder1` #fef7b2 [yellow.tint40] | 4.68 | - | 1.01 |
| Microsoft Fluent 2 react-badge 9.5.6 : Badge tint warning | sombre | warning | `colorPaletteYellowBackground1` #4c4400 [yellow.shade40] | `colorPaletteYellowForeground1` #feee66 [yellow.tint30] | `colorPaletteYellowBorder1` #fde300 [yellow.primary] | 8.26 | - | 1.48 |
| Material 3 @material/web 2.5.0 : Assist chip plat (flat) | clair | neutre | `container (plat) : aucun jeton de couleur` #f7f2fa~ | `md.sys.color.on-surface` #1d1b20 [ton 10] | `md.sys.color.outline` #79747e [ton 50] | 15.48 | 1.00 | 1.00 |
| Material 3 @material/web 2.5.0 : Assist chip plat (flat) | sombre | neutre | `container (plat) : aucun jeton de couleur` #1d1b20~ | `md.sys.color.on-surface` #e6e0e9 [ton 90] | `md.sys.color.outline` #938f99 [ton 60] | 13.17 | 1.00 | 1.00 |
| Material UI 9.5.0 : Chip filled (défaut) | clair | neutre | `palette.action.selected` #ebebeb~ α8 % | `palette.text.primary` #1f1f1f~ α87 % | - | 13.83 | 1.19 | 1.19 |
| Material UI 9.5.0 : Chip filled (défaut) | sombre | neutre | `palette.action.selected` #383838~ α16 % | `palette.text.primary` #ffffff | - | 11.73 | 1.60 | 1.60 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge subtle | clair | danger | `negative-subtle-background-color-default` #ffebe8 [200] | `gray-1000` #000000 [1000] | - | 18.30 | 1.15 | 1.15 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge subtle | sombre | danger | `negative-subtle-background-color-default` #571107 [300] | `gray-1000` #ffffff [1000] | - | 14.11 | 1.34 | 1.13 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge subtle | clair | success | `positive-subtle-background-color-default` #d7f7e1 [200] | `gray-1000` #000000 [1000] | - | 18.28 | 1.15 | 1.15 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge subtle | sombre | success | `positive-subtle-background-color-default` #003326 [300] | `gray-1000` #ffffff [1000] | - | 13.99 | 1.35 | 1.14 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge subtle | clair | warning | `notice-subtle-background-color-default` #ffeccf [200] | `gray-1000` #000000 [1000] | - | 18.15 | 1.16 | 1.16 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge subtle | sombre | warning | `notice-subtle-background-color-default` #501b00 [300] | `gray-1000` #ffffff [1000] | - | 14.02 | 1.35 | 1.13 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge outline | clair | danger | `background-layer-2-color` #ffffff [layer-2] | `gray-1000` #000000 [1000] | `negative-color-800` #f03823 [800] | 21.00 | 1.00 | 1.00 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge outline | sombre | danger | `background-layer-2-color` #222222 [layer-2] | `gray-1000` #ffffff [1000] | `negative-color-900` #fc432e [900] | 15.91 | 1.19 | 1.00 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge outline | clair | success | `background-layer-2-color` #ffffff [layer-2] | `gray-1000` #000000 [1000] | `positive-color-800` #079355 [800] | 21.00 | 1.00 | 1.00 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge outline | sombre | success | `background-layer-2-color` #222222 [layer-2] | `gray-1000` #ffffff [1000] | `positive-color-900` #099d59 [900] | 15.91 | 1.19 | 1.00 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge outline | clair | warning | `background-layer-2-color` #ffffff [layer-2] | `gray-1000` #000000 [1000] | `notice-color-800` #d45b00 [800] | 21.00 | 1.00 | 1.00 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge outline | sombre | warning | `background-layer-2-color` #222222 [layer-2] | `gray-1000` #ffffff [1000] | `notice-color-900` #e06400 [900] | 15.91 | 1.19 | 1.00 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Badge neutral | clair | neutre | `bg-gray-50` #f9fafb [50] | `text-gray-900` #101828 [900] | `ring-gray-500/30` #d2d5da~ α30 % [500/30] (1 px, anneau interne (`ring-1 ring-inset`)) | 16.98 | - | 1.05 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Badge neutral | sombre | neutre | `dark:bg-gray-400/10` #171d29~ α10 % [400/10] | `dark:text-gray-400` #99a1af [400] | `dark:ring-gray-400/20` #262b38~ α20 % [400/20] (1 px, anneau interne (`ring-1 ring-inset`)) | 6.49 | - | 1.14 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Badge success | clair | success | `bg-emerald-50` #ecfdf5 [50] | `text-emerald-900` #004f3b [900] | `ring-emerald-600/30` #b3e0d1~ α30 % [600/30] (1 px, anneau interne (`ring-1 ring-inset`)) | 9.14 | - | 1.05 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Badge success | sombre | success | `dark:bg-emerald-400/10` #082226~ α10 % [400/10] | `dark:text-emerald-400` #00d492 [400] | `dark:ring-emerald-400/20` #073632~ α20 % [400/20] (1 px, anneau interne (`ring-1 ring-inset`)) | 8.55 | - | 1.16 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Badge error | clair | danger | `bg-red-50` #fef2f2 [50] | `text-red-900` #82181a [900] | `ring-red-600/20` #faccce~ α20 % [600/20] (1 px, anneau interne (`ring-1 ring-inset`)) | 9.16 | - | 1.09 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Badge error | sombre | danger | `dark:bg-red-400/10` #221722~ α10 % [400/10] | `dark:text-red-400` #ff6467 [400] | `dark:ring-red-400/20` #3a1f29~ α20 % [400/20] (1 px, anneau interne (`ring-1 ring-inset`)) | 5.99 | - | 1.11 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Badge warning | clair | warning | `bg-yellow-50` #fefce8 [50] | `text-yellow-900` #733e0a [900] | `ring-yellow-600/30` #f1dbb3~ α30 % [600/30] (1 px, anneau interne (`ring-1 ring-inset`)) | 8.38 | - | 1.03 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Badge warning | sombre | warning | `dark:bg-yellow-400/10` #212117~ α10 % [400/10] | `dark:text-yellow-500` #f0b100 [500] | `dark:ring-yellow-400/20` #3a3315~ α20 % [400/20] (1 px, anneau interne (`ring-1 ring-inset`)) | 8.49 | - | 1.19 |
| Untitled UI (kit Figma) kit v2.0 : Badge (groupe, Figma) color=Error | clair | danger | `Red/50` #fef2f2 [50] | `Red/700` #b91c1c [700] | `Red/200` #fecaca [200] (contour du badge intérieur blanc (voir le relevé)) | 5.91 | - | - |
| Untitled UI (kit Figma) kit v2.0 : Badge (groupe, Figma) color=Warning | clair | warning | `Yellow/50` #fefce8 [50] | `Yellow/700` #a16207 [700] | `Yellow/200` #fef08a [200] (contour du badge intérieur blanc (voir le relevé)) | 4.76 | - | - |
| Untitled UI (kit Figma) kit v2.0 : Badge (groupe, Figma) color=Success | clair | success | `Green/50` #f0fdf4 [50] | `Green/700` #15803d [700] | `Green/200` #bbf7d0 [200] (contour du badge intérieur blanc (voir le relevé)) | 4.79 | - | - |
<!-- /tableau -->

### Ce que font la plupart

- **Fond au repos** : sept systèmes sur dix posent un fond teinté pâle : Radix `a3`, Atlassian `subtler`, Polaris `bg-fill-X-secondary`, Fluent `tint60`, Spectrum cran 200, Tremor et Untitled cran 50. Primer n'a pas de fond (contour et texte colorés), l'Assist chip de Material 3 est transparent, le Chip de Material UI est un gris translucide à 8 %.
- **Texte** : un pas sombre de la même teinte dans six cas (Radix `a11`, Atlassian `bolder`, Polaris `text-X`, Fluent `shade10` ou `shade30`, Tremor 900, Untitled 700). Spectrum emploie le gris 1000, noir en clair et blanc en sombre, quelle que soit la teinte. Là où l'échelle est numérotée, le texte est 7 à 9 crans au-dessus du fond (Radix 8, Tremor 9, Untitled 7, Spectrum 8 en clair et 7 en sombre).
- **Contour** : présent dans la variante discrète chez Atlassian (`border.X.subtle`), Fluent (`tint40` en clair, `primary` en sombre), Tremor (anneau de 1 px translucide) et Untitled (cran 200) ; absent chez Radix `soft`, Polaris et Spectrum `subtle`. Radix `surface` (`a6`) et Spectrum `outline` (2 px) en ajoutent un dans une variante à part.
- **États** : un badge n'a pas d'état dans la plupart des systèmes. Atlassian en définit quand le Lozenge reçoit `onClick` (`subtler`, puis `subtler.hovered`, puis `subtler.pressed`, ce dernier ayant la valeur du contour `subtle`), et le Chip de Material UI quand il est cliquable (opacité 8 % puis 12 % en clair).
- **Opaque ou translucide** : opaque chez Atlassian, Polaris, Fluent, Spectrum et Untitled, et chez Tremor en clair. Translucide chez Radix (fond de 8 à 24 % d'opacité en clair, de 12 à 18 % en sombre) et chez Tremor en sombre (cran 400 à 10 %).
- **Sombre** : chaque système redérive ses valeurs (Radix par son échelle sombre, Atlassian en échangeant exactement fond et texte, Fluent en `shade40` et `tint30`, Spectrum au cran 300, Tremor en 400 à 10 %) ; Polaris garde les valeurs claires. Texte/fond de 4,25 à 18,30 en clair et de 5,81 à 14,11 en sombre. Fond/page de 1,04 à 1,34 en clair et de 1,05 à 1,63 en sombre.

## 2. Badge plein

Radix `solid`, Fluent Badge `filled`, Material UI Chip coloré, Spectrum Badge `bold`. Atlassian (Lozenge 17.0.5), Primer (Label), Polaris (Badge) et Tremor n'ont pas de variante pleine dans les fichiers lus.

### Écart de pas entre fond et texte

<!-- ecart:badge-plein -->
_Aucun pas de fond et de texte comparables dans ce type : les systèmes lus n'ont ni échelle numérotée ni pas nommé pour les deux._
<!-- /ecart -->

### Valeurs

<!-- tableau:badge-plein -->
| Système, composant, variante | Thème | Ton | Fond | Texte | Contour | Texte/fond | Fond/page | Fond/carte |
|---|---|---|---|---|---|---|---|---|
| Radix Themes 3.3.0 : Badge solid | clair | danger | `--accent-9` #e5484d [9] | `--accent-contrast` #ffffff [contrast] | - | 3.91 | 3.91 | 3.91 |
| Radix Themes 3.3.0 : Badge solid | sombre | danger | `--accent-9` #e5484d [9] | `--accent-contrast` #ffffff [contrast] | - | 3.91 | 4.82 | 4.49 |
| Radix Themes 3.3.0 : Badge solid | clair | success | `--accent-9` #30a46c [9] | `--accent-contrast` #ffffff [contrast] | - | 3.16 | 3.16 | 3.16 |
| Radix Themes 3.3.0 : Badge solid | sombre | success | `--accent-9` #30a46c [9] | `--accent-contrast` #ffffff [contrast] | - | 3.16 | 5.98 | 5.57 |
| Radix Themes 3.3.0 : Badge solid | clair | warning | `--accent-9` #ffc53d [9] | `--accent-contrast` #21201c [contrast] | - | 10.33 | 1.58 | 1.58 |
| Radix Themes 3.3.0 : Badge solid | sombre | warning | `--accent-9` #ffc53d [9] | `--accent-contrast` #21201c [contrast] | - | 10.33 | 11.96 | 11.14 |
| Microsoft Fluent 2 react-badge 9.5.6 : Badge filled danger | clair | danger | `colorPaletteRedBackground3` #d13438 [red.primary] | `colorNeutralForegroundOnBrand` #ffffff | - | 4.93 | - | 4.93 |
| Microsoft Fluent 2 react-badge 9.5.6 : Badge filled danger | sombre | danger | `colorPaletteRedBackground3` #d13438 [red.primary] | `colorNeutralForegroundOnBrand` #ffffff | - | 4.93 | - | 2.95 |
| Microsoft Fluent 2 react-badge 9.5.6 : Badge filled success | clair | success | `colorPaletteGreenBackground3` #107c10 [green.primary] | `colorNeutralForegroundOnBrand` #ffffff | - | 5.37 | - | 5.37 |
| Microsoft Fluent 2 react-badge 9.5.6 : Badge filled success | sombre | success | `colorPaletteGreenBackground3` #107c10 [green.primary] | `colorNeutralForegroundOnBrand` #ffffff | - | 5.37 | - | 2.71 |
| Microsoft Fluent 2 react-badge 9.5.6 : Badge filled warning | clair | warning | `colorPaletteYellowBackground3` #fde300 [yellow.primary] | `colorNeutralForeground1Static` #242424 [14] | - | 11.95 | - | 1.30 |
| Microsoft Fluent 2 react-badge 9.5.6 : Badge filled warning | sombre | warning | `colorPaletteYellowBackground3` #fde300 [yellow.primary] | `colorNeutralForeground1Static` #242424 [14] | - | 11.95 | - | 11.20 |
| Material UI 9.5.0 : Chip filled color=error | clair | danger | `palette.error.main` #d32f2f [red[700]] | `palette.error.contrastText` #ffffff~ | - | 4.98 | 4.98 | 4.98 |
| Material UI 9.5.0 : Chip filled color=error | sombre | danger | `palette.error.main` #f44336 [red[500]] | `palette.error.contrastText` #ffffff~ | - | 3.68 | 5.09 | 5.09 |
| Material UI 9.5.0 : Chip filled color=warning | clair | warning | `palette.warning.main` #ed6c02 [littéral] | `palette.warning.contrastText` #ffffff~ | - | 3.11 | 3.11 | 3.11 |
| Material UI 9.5.0 : Chip filled color=warning | sombre | warning | `palette.warning.main` #ffa726 [orange[400]] | `palette.warning.contrastText` #000000~ | - | 10.81 | 9.64 | 9.64 |
| Material UI 9.5.0 : Chip filled color=success | clair | success | `palette.success.main` #2e7d32 [green[800]] | `palette.success.contrastText` #ffffff~ | - | 5.13 | 5.13 | 5.13 |
| Material UI 9.5.0 : Chip filled color=success | sombre | success | `palette.success.main` #66bb6a [green[400]] | `palette.success.contrastText` #000000~ | - | 8.88 | 7.92 | 7.92 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge bold | clair | danger | `negative-background-color-default` #d73220 [900] | `white` #ffffff [white] | - | 4.81 | 4.81 | 4.81 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge bold | sombre | danger | `negative-background-color-default` #df3422 [800] | `white` #ffffff [white] | - | 4.51 | 4.18 | 3.52 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge bold | clair | success | `positive-background-color-default` #05834e [900] | `white` #ffffff [white] | - | 4.81 | 4.81 | 4.81 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge bold | sombre | success | `positive-background-color-default` #068850 [800] | `white` #ffffff [white] | - | 4.52 | 4.18 | 3.52 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge bold | clair | warning | `notice-background-color-default` #fc7d00 [600] | `black` #000000 [black] | - | 8.07 | 2.60 | 2.60 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : Badge bold | sombre | warning | `notice-background-color-default` #e06400 [900] | `black` #000000 [black] | - | 5.99 | 5.39 | 4.54 |
<!-- /tableau -->

### Ce que font la plupart

- **Fond** : un pas moyen à fort de la teinte. Radix `9`, identique en clair et en sombre. Fluent le pas `primary` de la couleur, identique aussi dans les deux thèmes. Spectrum 900 en clair et 800 en sombre pour danger et success, 600 puis 900 pour warning. Material UI `main`, qui passe de `700` ou `800` en clair à `400` ou `500` en sombre.
- **Texte** : blanc, sauf sur les teintes jaune et orange. Radix amber prend `#21201c`, Fluent yellow `colorNeutralForeground1Static` (`#242424`), Spectrum `notice` le noir, Material UI le noir en sombre pour warning et success.
- **Contour et états** : aucun contour. Aucun état, sauf le Chip cliquable de Material UI, dont le fond passe de `main` à `dark`.
- **Contraste texte/fond** : de 3,11 à 11,95 en clair et de 3,16 à 11,95 en sombre. Les valeurs basses sont du texte blanc sur green de Radix (3,16) et sur warning de Material UI en clair (3,11). Les teintes jaune et orange sont à 8 ou plus.
- **Fond/support** : de 1,30 à 5,37 en clair et de 2,71 à 11,96 en sombre.

## 3. Alerte ou bannière en ligne

Radix Callout `soft` et `surface`, Atlassian Section message, Primer Flash, Polaris Banner (dans un contenu, puis dans une page), Fluent MessageBar, Material 3 (paire `error-container` et `on-error-container`, sans composant), Material UI Alert `standard` et `filled`, Spectrum InlineAlert (`border`, `subtleFill`, `boldFill`), Tremor Callout, Carbon Inline notification.

### Écart de pas entre fond et texte

<!-- ecart:alerte -->
| Système, composant, variante | Thème | Tons | Pas du fond | Pas du texte | Écart |
|---|---|---|---|---|---|
| Radix Themes : Callout soft | clair | danger, success, warning | a3 | a11 | 8 crans (échelle 1 à 12) |
| Radix Themes : Callout soft | sombre | danger, success, warning | a3 | a11 | 8 crans (échelle 1 à 12) |
| Radix Themes : Callout surface | clair | danger, success, warning | a2 | a11 | 9 crans (échelle 1 à 12) |
| Radix Themes : Callout surface | sombre | danger, success, warning | a2 | a11 | 9 crans (échelle 1 à 12) |
| Material 3 : Paire de rôles (aucun composant) error-container / on-error-container | clair | danger | ton 90 | ton 10 | 80 tons (échelle tonale 0 à 100) |
| Material 3 : Paire de rôles (aucun composant) error-container / on-error-container | sombre | danger | ton 30 | ton 90 | 60 tons (échelle tonale 0 à 100) |
| Material UI : Alert standard | clair | danger, success, warning | light + 90 % | light - 60 % | échelle nommée, écart non compté |
| Material UI : Alert standard | sombre | danger, success, warning | light + 90 % | light + 60 % | échelle nommée, écart non compté |
| Adobe Spectrum 2 : InlineAlert subtleFill | clair | danger, success, warning | 200 | 800 | 6 crans de 100 (fond dans l'échelle du ton, texte dans celle du gris) |
| Adobe Spectrum 2 : InlineAlert subtleFill | sombre | danger, success, warning | 300 | 800 | 5 crans de 100 (fond dans l'échelle du ton, texte dans celle du gris) |
| Tremor (Tailwind CSS) : Callout neutral | clair | neutre | 100 | 900 | 8 crans, échelle 50 à 950 |
| Tremor (Tailwind CSS) : Callout neutral | sombre | neutre | 800/70 | 400 | 4 crans, texte plus clair que le fond (fond à 70 %), échelle 50 à 950 |
| Tremor (Tailwind CSS) : Callout success | clair | success | 50 | 900 | 9 crans, échelle 50 à 950 |
| Tremor (Tailwind CSS) : Callout success | sombre | success | 950/70 | 500 | 5 crans, texte plus clair que le fond (fond à 70 %), échelle 50 à 950 |
| Tremor (Tailwind CSS) : Callout error | clair | danger | 50 | 900 | 9 crans, échelle 50 à 950 |
| Tremor (Tailwind CSS) : Callout error | sombre | danger | 950/70 | 500 | 5 crans, texte plus clair que le fond (fond à 70 %), échelle 50 à 950 |
| Tremor (Tailwind CSS) : Callout warning | clair | warning | 50 | 900 | 9 crans, échelle 50 à 950 |
| Tremor (Tailwind CSS) : Callout warning | sombre | warning | 950/70 | 500 | 5 crans, texte plus clair que le fond (fond à 70 %), échelle 50 à 950 |
<!-- /ecart -->

### Valeurs

<!-- tableau:alerte -->
| Système, composant, variante | Thème | Ton | Fond | Texte | Contour | Texte/fond | Fond/page | Fond/carte |
|---|---|---|---|---|---|---|---|---|
| Radix Themes 3.3.0 : Callout soft | clair | danger | `--accent-a3` #feebec~ α8 % [a3] | `--accent-a11` #ce292e~ α83 % [a11] | - | 4.60 | 1.15 | 1.15 |
| Radix Themes 3.3.0 : Callout soft | sombre | danger | `--accent-a3` #411920~ α18 % [a3] | `--accent-a11` #ff9592 [a11] | - | 7.20 | 1.16 | 1.16 |
| Radix Themes 3.3.0 : Callout soft | clair | success | `--accent-a3` #e6f6eb~ α10 % [a3] | `--accent-a11` #1e8255~ α87 % [a11] | - | 4.28 | 1.12 | 1.12 |
| Radix Themes 3.3.0 : Callout soft | sombre | success | `--accent-a3` #1a3428~ α12 % [a3] | `--accent-a11` #3fdc90~ α83 % [a11] | - | 7.57 | 1.28 | 1.31 |
| Radix Themes 3.3.0 : Callout soft | clair | warning | `--accent-a3` #fff7c2~ α24 % [a3] | `--accent-a11` #ab6400 [a11] | - | 4.25 | 1.09 | 1.09 |
| Radix Themes 3.3.0 : Callout soft | sombre | warning | `--accent-a3` #372716~ α13 % [a3] | `--accent-a11` #ffca16 [a11] | - | 9.36 | 1.20 | 1.23 |
| Radix Themes 3.3.0 : Callout surface | clair | danger | `--accent-a2` #fff7f7~ α3 % [a2] | `--accent-a11` #ce2b30~ α83 % [a11] | `--accent-a6` #fdbdbe~ α26 % [a6] (1px, ombre interne) | 4.96 | 1.06 | 1.06 |
| Radix Themes 3.3.0 : Callout surface | sombre | danger | `--accent-a2` #281a1b~ α7 % [a2] | `--accent-a11` #ff9592 [a11] | `--accent-a6` #772832~ α41 % [a6] (1px, ombre interne) | 7.95 | 1.05 | 1.05 |
| Radix Themes 3.3.0 : Callout surface | clair | success | `--accent-a2` #f4fbf6~ α4 % [a2] | `--accent-a11` #1f8357~ α87 % [a11] | `--accent-a6` #adddc0~ α32 % [a6] (1px, ombre interne) | 4.50 | 1.05 | 1.05 |
| Radix Themes 3.3.0 : Callout surface | sombre | success | `--accent-a2` #1a231f~ α4 % [a2] | `--accent-a11` #3fd98e~ α83 % [a11] | `--accent-a6` #265d44~ α29 % [a6] (1px, ombre interne) | 8.84 | 1.07 | 1.09 |
| Radix Themes 3.3.0 : Callout surface | clair | warning | `--accent-a2` #fefbe9~ α9 % [a2] | `--accent-a11` #ab6400 [a11] | `--accent-a6` #f3d673~ α55 % [a6] (1px, ombre interne) | 4.43 | 1.04 | 1.04 |
| Radix Themes 3.3.0 : Callout surface | sombre | warning | `--accent-a2` #252018~ α5 % [a2] | `--accent-a11` #ffca16 [a11] | `--accent-a6` #624211~ α32 % [a6] (1px, ombre interne) | 10.56 | 1.07 | 1.09 |
| Atlassian section-message 10.2.6 : Section message success | clair | success | `color.background.success` #efffd6 [défaut] | `color.text` #292a2e | - | 13.62 | 1.05 | 1.05 |
| Atlassian section-message 10.2.6 : Section message success | sombre | success | `color.background.success` #28311b [défaut] | `color.text` #cecfd2 | - | 8.72 | 1.21 | 1.13 |
| Atlassian section-message 10.2.6 : Section message warning | clair | warning | `color.background.warning` #fff5db [défaut] | `color.text` #292a2e | - | 13.20 | 1.09 | 1.09 |
| Atlassian section-message 10.2.6 : Section message warning | sombre | warning | `color.background.warning` #3a2c1f [défaut] | `color.text` #cecfd2 | - | 8.64 | 1.22 | 1.14 |
| Atlassian section-message 10.2.6 : Section message error | clair | danger | `color.background.danger` #ffeceb [défaut] | `color.text` #292a2e | - | 12.59 | 1.14 | 1.14 |
| Atlassian section-message 10.2.6 : Section message error | sombre | danger | `color.background.danger` #42221f [défaut] | `color.text` #cecfd2 | - | 9.11 | 1.16 | 1.08 |
| GitHub Primer react 38.40.1 : Flash success | clair | success | `--bgColor-success-muted` #dafbe1 | `--fgColor-default` #1f2328 | `--borderColor-success-muted` #b7e7c4~ α40 % | 14.19 | 1.11 | 1.11 |
| GitHub Primer react 38.40.1 : Flash success | sombre | success | `--bgColor-success-muted` #192f28~ α15 % | `--fgColor-default` #f0f6fc | `--borderColor-success-muted` #1f5030~ α40 % | 13.05 | 1.19 | 1.22 |
| GitHub Primer react 38.40.1 : Flash warning | clair | warning | `--bgColor-attention-muted` #fff8c5 | `--fgColor-default` #1f2328 | `--borderColor-attention-muted` #eedcab~ α40 % | 14.66 | 1.08 | 1.08 |
| GitHub Primer react 38.40.1 : Flash warning | sombre | warning | `--bgColor-attention-muted` #2e2a1f~ α15 % | `--fgColor-default` #f0f6fc | `--borderColor-attention-muted` #574319~ α40 % | 13.15 | 1.19 | 1.21 |
| GitHub Primer react 38.40.1 : Flash danger | clair | danger | `--bgColor-danger-muted` #ffebe9 | `--fgColor-default` #1f2328 | `--borderColor-danger-muted` #ffcdcd~ α40 % | 13.78 | 1.15 | 1.15 |
| GitHub Primer react 38.40.1 : Flash danger | sombre | danger | `--bgColor-danger-muted` #2c2127~ α10 % | `--fgColor-default` #f0f6fc | `--borderColor-danger-muted` #703132~ α40 % | 14.25 | 1.10 | 1.12 |
| Shopify Polaris 13.9.5 : Banner dans un contenu (withinContentContainer) | clair | danger | `color-bg-surface-critical` #fee8eb | `color-text-critical` #8e0b21 | - | 8.09 | 1.04 | 1.17 |
| Shopify Polaris 13.9.5 : Banner dans un contenu (withinContentContainer) | sombre | danger | `color-bg-surface-critical` #fee8eb | `color-text-critical` #8e0b21 | - | 8.09 | 14.88 | 11.29 |
| Shopify Polaris 13.9.5 : Banner dans un contenu (withinContentContainer) | clair | success | `color-bg-surface-success` #cdfed4 | `color-text-success` #014b40 | - | 8.99 | 1.01 | 1.12 |
| Shopify Polaris 13.9.5 : Banner dans un contenu (withinContentContainer) | sombre | success | `color-bg-surface-success` #cdfed4 | `color-text-success` #014b40 | - | 8.99 | 15.52 | 11.77 |
| Shopify Polaris 13.9.5 : Banner dans un contenu (withinContentContainer) | clair | warning | `color-bg-surface-warning` #fff1e3 | `color-text-warning` #5e4200 | - | 8.40 | 1.02 | 1.11 |
| Shopify Polaris 13.9.5 : Banner dans un contenu (withinContentContainer) | sombre | warning | `color-bg-surface-warning` #fff1e3 | `color-text-warning` #5e4200 | - | 8.40 | 15.70 | 11.91 |
| Shopify Polaris 13.9.5 : Banner dans une page (withinPage, aplat) | clair | danger | `color-bg-fill-critical` #c70a24 | `color-text-critical-on-bg-fill` #fffafb | - | 5.81 | 5.32 | 6.00 |
| Shopify Polaris 13.9.5 : Banner dans une page (withinPage, aplat) | sombre | danger | `color-bg-fill-critical` #c70a24 | `color-text-critical-on-bg-fill` #fffafb | - | 5.81 | 2.90 | 2.20 |
| Shopify Polaris 13.9.5 : Banner dans une page (withinPage, aplat) | clair | success | `color-bg-fill-success` #047b5d | `color-text-success-on-bg-fill` #fafffb | - | 5.20 | 4.65 | 5.25 |
| Shopify Polaris 13.9.5 : Banner dans une page (withinPage, aplat) | sombre | success | `color-bg-fill-success` #047b5d | `color-text-success-on-bg-fill` #fafffb | - | 5.20 | 3.31 | 2.51 |
| Shopify Polaris 13.9.5 : Banner dans une page (withinPage, aplat) | clair | warning | `color-bg-fill-warning` #ffb800 | `color-text-warning-on-bg-fill` #251a00 | - | 9.87 | 1.54 | 1.73 |
| Shopify Polaris 13.9.5 : Banner dans une page (withinPage, aplat) | sombre | warning | `color-bg-fill-warning` #ffb800 | `color-text-warning-on-bg-fill` #251a00 | - | 9.87 | 10.04 | 7.61 |
| Microsoft Fluent 2 react-message-bar 9.7.7 : MessageBar error | clair | danger | `colorStatusDangerBackground1` #fdf3f4 [cranberry.tint60] | `colorNeutralForeground1` #242424 [14] | `colorStatusDangerBorder1` #eeacb2 [cranberry.tint40] | 14.27 | - | 1.09 |
| Microsoft Fluent 2 react-message-bar 9.7.7 : MessageBar error | sombre | danger | `colorStatusDangerBackground1` #3b0509 [cranberry.shade40] | `colorNeutralForeground1` #ffffff | `colorStatusDangerBorder1` #c50f1f [cranberry.primary] | 17.33 | - | 1.19 |
| Microsoft Fluent 2 react-message-bar 9.7.7 : MessageBar success | clair | success | `colorStatusSuccessBackground1` #f1faf1 [green.tint60] | `colorNeutralForeground1` #242424 [14] | `colorStatusSuccessBorder1` #9fd89f [green.tint40] | 14.55 | - | 1.07 |
| Microsoft Fluent 2 react-message-bar 9.7.7 : MessageBar success | sombre | success | `colorStatusSuccessBackground1` #052505 [green.shade40] | `colorNeutralForeground1` #ffffff | `colorStatusSuccessBorder1` #107c10 [green.primary] | 16.49 | - | 1.13 |
| Microsoft Fluent 2 react-message-bar 9.7.7 : MessageBar warning | clair | warning | `colorStatusWarningBackground1` #fff9f5 [orange.tint60] | `colorNeutralForeground1` #242424 [14] | `colorStatusWarningBorder1` #fdcfb4 [orange.tint40] | 14.87 | - | 1.04 |
| Microsoft Fluent 2 react-message-bar 9.7.7 : MessageBar warning | sombre | warning | `colorStatusWarningBackground1` #4a1e04 [orange.shade40] | `colorNeutralForeground1` #ffffff | `colorStatusWarningBorder1` #f7630c [orange.primary] | 14.20 | - | 1.02 |
| Material 3 @material/web 2.5.0 : Paire de rôles (aucun composant) error-container / on-error-container | clair | danger | `md.sys.color.error-container` #f9dedc [ton 90] | `md.sys.color.on-error-container` #410e0b [ton 10] | - | 12.77 | 1.21 | 1.15 |
| Material 3 @material/web 2.5.0 : Paire de rôles (aucun composant) error-container / on-error-container | sombre | danger | `md.sys.color.error-container` #8c1d18 [ton 30] | `md.sys.color.on-error-container` #f9dedc [ton 90] | - | 7.17 | 2.04 | 1.87 |
| Material UI 9.5.0 : Alert standard | clair | danger | `lighten(palette.error.light, 0.9)` #fdeded~ [light + 90 %] | `darken(palette.error.light, 0.6)` #5f2120~ [light - 60 %] | - | 10.73 | 1.13 | 1.13 |
| Material UI 9.5.0 : Alert standard | sombre | danger | `darken(palette.error.light, 0.9)` #160b0b~ [light + 90 %] | `lighten(palette.error.light, 0.6)` #f4c7c7~ [light + 60 %] | - | 12.74 | 1.03 | 1.03 |
| Material UI 9.5.0 : Alert standard | clair | success | `lighten(palette.success.light, 0.9)` #edf7ed~ [light + 90 %] | `darken(palette.success.light, 0.6)` #1e4620~ [light - 60 %] | - | 9.80 | 1.10 | 1.10 |
| Material UI 9.5.0 : Alert standard | sombre | success | `darken(palette.success.light, 0.9)` #0c130d~ [light + 90 %] | `lighten(palette.success.light, 0.6)` #cce8cd~ [light + 60 %] | - | 14.35 | 1.01 | 1.01 |
| Material UI 9.5.0 : Alert standard | clair | warning | `lighten(palette.warning.light, 0.9)` #fff4e5~ [light + 90 %] | `darken(palette.warning.light, 0.6)` #663c00~ [light - 60 %] | - | 8.74 | 1.09 | 1.09 |
| Material UI 9.5.0 : Alert standard | sombre | warning | `darken(palette.warning.light, 0.9)` #191207~ [light + 90 %] | `lighten(palette.warning.light, 0.6)` #ffe2b7~ [light + 60 %] | - | 14.87 | 1.01 | 1.01 |
| Material UI 9.5.0 : Alert filled | clair | danger | `palette.error.main` #d32f2f [red[700]] | `getContrastText(palette.error.main)` #ffffff~ | - | 4.98 | 4.98 | 4.98 |
| Material UI 9.5.0 : Alert filled | sombre | danger | `palette.error.dark` #d32f2f [red[700]] | `getContrastText(palette.error.main)` #ffffff~ | - | 4.98 | 3.76 | 3.76 |
| Material UI 9.5.0 : Alert filled | clair | success | `palette.success.main` #2e7d32 [green[800]] | `getContrastText(palette.success.main)` #ffffff~ | - | 5.13 | 5.13 | 5.13 |
| Material UI 9.5.0 : Alert filled | sombre | success | `palette.success.dark` #388e3c [green[700]] | `getContrastText(palette.success.main)` #000000~ | - | 5.10 | 4.55 | 4.55 |
| Material UI 9.5.0 : Alert filled | clair | warning | `palette.warning.main` #ed6c02 [littéral] | `getContrastText(palette.warning.main)` #ffffff~ | - | 3.11 | 3.11 | 3.11 |
| Material UI 9.5.0 : Alert filled | sombre | warning | `palette.warning.dark` #f57c00 [orange[700]] | `getContrastText(palette.warning.main)` #000000~ | - | 7.77 | 6.93 | 6.93 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert border | clair | danger | `gray-25` #ffffff [25] | `body-color` #292929 [800] | `negative-color-800` #f03823 [800] | 14.55 | 1.00 | 1.00 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert border | sombre | danger | `gray-25` #111111 [25] | `body-color` #dbdbdb [800] | `negative-color-800` #df3422 [800] | 13.64 | 1.00 | 1.19 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert border | clair | success | `gray-25` #ffffff [25] | `body-color` #292929 [800] | `positive-color-700` #0ba45d [700] | 14.55 | 1.00 | 1.00 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert border | sombre | success | `gray-25` #111111 [25] | `body-color` #dbdbdb [800] | `positive-color-700` #047c4b [700] | 13.64 | 1.00 | 1.19 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert border | clair | warning | `gray-25` #ffffff [25] | `body-color` #292929 [800] | `notice-color-700` #e86a00 [700] | 14.55 | 1.00 | 1.00 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert border | sombre | warning | `gray-25` #111111 [25] | `body-color` #dbdbdb [800] | `notice-color-700` #b94900 [700] | 13.64 | 1.00 | 1.19 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert subtleFill | clair | danger | `negative-subtle-background-color-default` #ffebe8 [200] | `body-color` #292929 [800] | - | 12.68 | 1.15 | 1.15 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert subtleFill | sombre | danger | `negative-subtle-background-color-default` #571107 [300] | `body-color` #dbdbdb [800] | - | 10.19 | 1.34 | 1.13 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert subtleFill | clair | success | `positive-subtle-background-color-default` #d7f7e1 [200] | `body-color` #292929 [800] | - | 12.66 | 1.15 | 1.15 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert subtleFill | sombre | success | `positive-subtle-background-color-default` #003326 [300] | `body-color` #dbdbdb [800] | - | 10.10 | 1.35 | 1.14 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert subtleFill | clair | warning | `notice-subtle-background-color-default` #ffeccf [200] | `body-color` #292929 [800] | - | 12.57 | 1.16 | 1.16 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert subtleFill | sombre | warning | `notice-subtle-background-color-default` #501b00 [300] | `body-color` #dbdbdb [800] | - | 10.13 | 1.35 | 1.13 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert boldFill | clair | danger | `negative-background-color-default` #d73220 [900] | `white` #ffffff [white] | - | 4.81 | 4.81 | 4.81 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert boldFill | sombre | danger | `negative-background-color-default` #df3422 [800] | `white` #ffffff [white] | - | 4.51 | 4.18 | 3.52 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert boldFill | clair | success | `positive-background-color-default` #05834e [900] | `white` #ffffff [white] | - | 4.81 | 4.81 | 4.81 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert boldFill | sombre | success | `positive-background-color-default` #068850 [800] | `white` #ffffff [white] | - | 4.52 | 4.18 | 3.52 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert boldFill | clair | warning | `notice-background-color-default` #fc7d00 [600] | `black` #000000 [black] | - | 8.07 | 2.60 | 2.60 |
| Adobe Spectrum 2 s2 740c6c5, jetons 14.15.0 : InlineAlert boldFill | sombre | warning | `notice-background-color-default` #e06400 [900] | `black` #000000 [black] | - | 5.99 | 5.39 | 4.54 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Callout neutral | clair | neutre | `bg-gray-100` #f3f4f6 [100] | `text-gray-900` #101828 [900] | - | 16.13 | - | 1.10 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Callout neutral | sombre | neutre | `dark:bg-gray-800/70` #182130~ α70 % [800/70] | `dark:text-gray-400` #99a1af [400] | - | 6.21 | - | 1.19 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Callout success | clair | success | `bg-emerald-50` #ecfdf5 [50] | `text-emerald-900` #004f3b [900] | - | 9.14 | - | 1.05 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Callout success | sombre | success | `dark:bg-emerald-950/70` #032320~ α70 % [950/70] | `dark:text-emerald-500` #00bc7d [500] | - | 6.71 | - | 1.16 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Callout error | clair | danger | `bg-red-50` #fef2f2 [50] | `text-red-900` #82181a [900] | - | 9.16 | - | 1.09 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Callout error | sombre | danger | `dark:bg-red-950/70` #340a0e~ α70 % [950/70] | `dark:text-red-500` #fb2c36 [500] | - | 4.61 | - | 1.10 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Callout warning | clair | warning | `bg-yellow-50` #fefce8 [50] | `text-yellow-900` #733e0a [900] | - | 8.38 | - | 1.03 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Callout warning | sombre | warning | `dark:bg-yellow-950/70` #321b0b~ α70 % [950/70] | `dark:text-yellow-500` #f0b100 [500] | - | 8.47 | - | 1.19 |
| IBM Carbon themes 11.83.0 : Inline notification low-contrast | white | danger | `notification-background-error` #fff1f1 | `text-primary` #161616 | `support-error` #da1e28 (contour de 1 px à 40 % sur trois côtés, plus un trait à gauche) | 16.46 | 1.10 | 1.00 |
| IBM Carbon themes 11.83.0 : Inline notification low-contrast | g10 | danger | `notification-background-error` #fff1f1 | `text-primary` #161616 | `support-error` #da1e28 (contour de 1 px à 40 % sur trois côtés, plus un trait à gauche) | 16.46 | 1.00 | 1.10 |
| IBM Carbon themes 11.83.0 : Inline notification low-contrast | g90 | danger | `notification-background-error` #393939 | `text-primary` #f4f4f4 | `support-error` #ff8389 (contour de 1 px à 40 % sur trois côtés, plus un trait à gauche) | 10.50 | 1.31 | 1.00 |
| IBM Carbon themes 11.83.0 : Inline notification low-contrast | g100 | danger | `notification-background-error` #262626 | `text-primary` #f4f4f4 | `support-error` #fa4d56 (contour de 1 px à 40 % sur trois côtés, plus un trait à gauche) | 13.76 | 1.20 | 1.00 |
| IBM Carbon themes 11.83.0 : Inline notification low-contrast | white | success | `notification-background-success` #defbe6 | `text-primary` #161616 | `support-success` #24a148 (contour de 1 px à 40 % sur trois côtés, plus un trait à gauche) | 16.41 | 1.10 | 1.00 |
| IBM Carbon themes 11.83.0 : Inline notification low-contrast | g10 | success | `notification-background-success` #defbe6 | `text-primary` #161616 | `support-success` #24a148 (contour de 1 px à 40 % sur trois côtés, plus un trait à gauche) | 16.41 | 1.00 | 1.10 |
| IBM Carbon themes 11.83.0 : Inline notification low-contrast | g90 | success | `notification-background-success` #393939 | `text-primary` #f4f4f4 | `support-success` #42be65 (contour de 1 px à 40 % sur trois côtés, plus un trait à gauche) | 10.50 | 1.31 | 1.00 |
| IBM Carbon themes 11.83.0 : Inline notification low-contrast | g100 | success | `notification-background-success` #262626 | `text-primary` #f4f4f4 | `support-success` #42be65 (contour de 1 px à 40 % sur trois côtés, plus un trait à gauche) | 13.76 | 1.20 | 1.00 |
| IBM Carbon themes 11.83.0 : Inline notification low-contrast | white | warning | `notification-background-warning` #fcf4d6 | `text-primary` #161616 | `support-warning` #f1c21b (contour de 1 px à 40 % sur trois côtés, plus un trait à gauche) | 16.42 | 1.10 | 1.00 |
| IBM Carbon themes 11.83.0 : Inline notification low-contrast | g10 | warning | `notification-background-warning` #fcf4d6 | `text-primary` #161616 | `support-warning` #f1c21b (contour de 1 px à 40 % sur trois côtés, plus un trait à gauche) | 16.42 | 1.00 | 1.10 |
| IBM Carbon themes 11.83.0 : Inline notification low-contrast | g90 | warning | `notification-background-warning` #393939 | `text-primary` #f4f4f4 | `support-warning` #f1c21b (contour de 1 px à 40 % sur trois côtés, plus un trait à gauche) | 10.50 | 1.31 | 1.00 |
| IBM Carbon themes 11.83.0 : Inline notification low-contrast | g100 | warning | `notification-background-warning` #262626 | `text-primary` #f4f4f4 | `support-warning` #f1c21b (contour de 1 px à 40 % sur trois côtés, plus un trait à gauche) | 13.76 | 1.20 | 1.00 |
<!-- /tableau -->

### Ce que font la plupart

- **Fond** : un fond pâle teinté en clair dans les dix systèmes. Radix `a3` (`a2` pour `surface`), Atlassian le palier de base `background.X`, Polaris `bg-surface-X`, Fluent `tint60`, Spectrum `subtleFill` cran 200, Tremor cran 50, Primer `muted`, Material UI `lighten(light, 0.9)`, Material 3 ton 90. Carbon pose en clair des fonds pâles et, en sombre, le même gris pour les quatre tons que sa couche 01. Spectrum `border` pose un fond neutre (`gray-25`).
- **Texte** : neutre dans cinq systèmes (Atlassian `color.text`, Primer `fgColor-default`, Fluent `colorNeutralForeground1`, Carbon `text-primary`, Spectrum `body-color`), teinté dans les cinq autres (Radix `a11`, Polaris `text-X`, Material UI `darken(light, 0.6)`, Tremor 900, Material 3 ton 10). Quand le texte est neutre, l'icône porte la couleur du ton (Atlassian, Primer, Fluent). Texte/fond de 4,25 à 16,46 en clair et de 4,61 à 17,33 en sombre.
- **Contour** : présent chez Primer (1 px translucide à 40 %), Fluent (1 px, `tint40` en clair, `primary` en sombre), Carbon (contour de 1 px à 40 % sur trois côtés et trait à gauche), Spectrum `border` (2 px) et Radix `surface` (1 px interne, `a6`) ; absent des autres. Aucun état : une alerte n'est pas interactive.
- **Opaque ou translucide** : opaque chez Atlassian, Polaris, Fluent, Spectrum, Material UI, Material 3 et Carbon. Translucide chez Radix, chez Primer en sombre (opacité de 10 à 15 %) et chez Tremor en sombre (cran 950 à 70 %).
- **Variantes pleines** : Polaris `withinPage`, Spectrum `boldFill` et Material UI `filled` posent un aplat de la teinte (pas moyen à fort) avec un texte blanc, ou noir sur jaune et orange. Texte/fond de 3,11 à 9,87 en clair et de 4,51 à 7,77 en sombre.
- **Sombre** : fonds redérivés et plus profonds (Atlassian, Fluent, Spectrum, Material UI, Tremor, Radix, Primer), un gris unique pour les quatre tons chez Carbon g90 et g100, valeurs claires conservées chez Polaris. Fond/page de 1,00 à 1,21 en clair et de 1,01 à 2,04 en sombre.

## 4. Bouton teinté

Radix Button `soft`, Atlassian Button `default` et `subtle`, Primer Button `default` et `danger`, Polaris Button `tertiary` de ton critical, Fluent Button `subtle`, Material 3 FilledTonalButton, Material UI Button `text`, Tremor Button `light`, Untitled UI Secondary color. Les colonnes Survol et Appui donnent le fond de l'état, et le texte quand il change ; `(…)` signale un état sans valeur.

### Écart de pas entre fond et texte

<!-- ecart:bouton-teinte -->
| Système, composant, variante | Thème | Tons | Pas du fond | Pas du texte | Écart |
|---|---|---|---|---|---|
| Radix Themes : Button soft | clair | danger, success, warning | a3 | a11 | 8 crans (échelle 1 à 12) |
| Radix Themes : Button soft | sombre | danger, success, warning | a3 | a11 | 8 crans (échelle 1 à 12) |
| Material 3 : FilledTonalButton tonal | clair | secondaire | ton 90 | ton 10 | 80 tons (échelle tonale 0 à 100) |
| Material 3 : FilledTonalButton tonal | sombre | secondaire | ton 30 | ton 90 | 60 tons (échelle tonale 0 à 100) |
| Tremor (Tailwind CSS) : Button light | clair | neutre | 200 | 900 | 7 crans, échelle 50 à 950 |
| Tremor (Tailwind CSS) : Button light | sombre | neutre | 900 | 50 | 9 crans, texte plus clair que le fond, échelle 50 à 950 |
| Untitled UI (kit Figma) : Button (Figma) Secondary color | clair | marque | 50 | 700 | 7 crans, échelle 50 à 950 |
<!-- /ecart -->

### Valeurs

<!-- tableau:bouton-teinte -->
| Système, composant, variante | Thème | Ton | Fond | Texte | Contour | Survol | Appui | Texte/fond | Fond/page | Fond/carte |
|---|---|---|---|---|---|---|---|---|---|---|
| Radix Themes 3.3.0 : Button soft | clair | danger | `--accent-a3` #feebec~ α8 % [a3] | `--accent-a11` #ce292e~ α83 % [a11] | - | `--accent-a4` #ffdbdc~ α14 % [a4] | `--accent-a5` #ffcdce~ α20 % [a5] | 4.60 | 1.15 | 1.15 |
| Radix Themes 3.3.0 : Button soft | sombre | danger | `--accent-a3` #411920~ α18 % [a3] | `--accent-a11` #ff9592 [a11] | - | `--accent-a4` #561522~ α27 % [a4] | `--accent-a5` #671b29~ α34 % [a5] | 7.20 | 1.16 | 1.16 |
| Radix Themes 3.3.0 : Button soft | clair | success | `--accent-a3` #e6f6eb~ α10 % [a3] | `--accent-a11` #1e8255~ α87 % [a11] | - | `--accent-a4` #d6f1df~ α16 % [a4] | `--accent-a5` #c4e8d1~ α23 % [a5] | 4.28 | 1.12 | 1.12 |
| Radix Themes 3.3.0 : Button soft | sombre | success | `--accent-a3` #1a3428~ α12 % [a3] | `--accent-a11` #3fdc90~ α83 % [a11] | - | `--accent-a4` #184130~ α18 % [a4] | `--accent-a5` #1d4f39~ α24 % [a5] | 7.57 | 1.28 | 1.31 |
| Radix Themes 3.3.0 : Button soft | clair | warning | `--accent-a3` #fff7c2~ α24 % [a3] | `--accent-a11` #ab6400 [a11] | - | `--accent-a4` #ffee9c~ α39 % [a4] | `--accent-a5` #fbe577~ α53 % [a5] | 4.25 | 1.09 | 1.09 |
| Radix Themes 3.3.0 : Button soft | sombre | warning | `--accent-a3` #372716~ α13 % [a3] | `--accent-a11` #ffca16 [a11] | - | `--accent-a4` #452e14~ α20 % [a4] | `--accent-a5` #533613~ α26 % [a5] | 9.36 | 1.20 | 1.23 |
| Atlassian button 25.4.7 : Button default | clair | neutre | `color.background.neutral.subtle` #ffffff~ [subtle] | `color.text.subtle` #505258 [subtle] | `color.border` #dddedd~ α14 % | `color.background.neutral.subtle.hovered` #f0f1f2~ α6 % [subtle.hovered] | `color.background.neutral.subtle.pressed` #dddedd~ α14 % [subtle.pressed] | 7.81 | 1.00 | 1.00 |
| Atlassian button 25.4.7 : Button default | sombre | neutre | `color.background.neutral.subtle` #242528~ [subtle] | `color.text.subtle` #a9abaf [subtle] | `color.border` #3b3c41~ α12 % | `color.background.neutral.subtle.hovered` #303135~ α7 % [subtle.hovered] | `color.background.neutral.subtle.pressed` #3b3c41~ α12 % [subtle.pressed] | 6.66 | 1.00 | 1.00 |
| Atlassian button 25.4.7 : Button subtle | clair | neutre | `color.background.neutral.subtle` #ffffff~ [subtle] | `color.text.subtle` #505258 [subtle] | - | `color.background.neutral.subtle.hovered` #f0f1f2~ α6 % [subtle.hovered] | `color.background.neutral.subtle.pressed` #dddedd~ α14 % [subtle.pressed] | 7.81 | 1.00 | 1.00 |
| Atlassian button 25.4.7 : Button subtle | sombre | neutre | `color.background.neutral.subtle` #242528~ [subtle] | `color.text.subtle` #a9abaf [subtle] | - | `color.background.neutral.subtle.hovered` #303135~ α7 % [subtle.hovered] | `color.background.neutral.subtle.pressed` #3b3c41~ α12 % [subtle.pressed] | 6.66 | 1.00 | 1.00 |
| GitHub Primer react 38.40.1 : Button default | clair | neutre | `--button-default-bgColor-rest` #f6f8fa | `--button-default-fgColor-rest` #25292e | `--button-default-borderColor-rest` #d1d9e0 | `--button-default-bgColor-hover` #eff2f5 | `--button-default-bgColor-active` #e6eaef | 13.74 | 1.06 | 1.06 |
| GitHub Primer react 38.40.1 : Button default | sombre | neutre | `--button-default-bgColor-rest` #212830 | `--button-default-fgColor-rest` #f0f6fc | `--button-default-borderColor-rest` #3d444d | `--button-default-bgColor-hover` #262c36 | `--button-default-bgColor-active` #2a313c | 13.67 | 1.27 | 1.16 |
| GitHub Primer react 38.40.1 : Button danger | clair | danger | `--button-danger-bgColor-rest` #f6f8fa | `--button-danger-fgColor-rest` #d1242f | `--button-default-borderColor-rest` #d1d9e0 | `--button-danger-bgColor-hover` #cf222e, texte #ffffff | `--button-danger-bgColor-active` #a40e26, texte #ffffff | 4.93 | 1.06 | 1.06 |
| GitHub Primer react 38.40.1 : Button danger | sombre | danger | `--button-danger-bgColor-rest` #212830 | `--button-danger-fgColor-rest` #fa5e55 | `--button-default-borderColor-rest` #3d444d | `--button-danger-bgColor-hover` #b62324, texte #ffffff | `--button-danger-bgColor-active` #da3633, texte #ffffff | 4.82 | 1.27 | 1.16 |
| Shopify Polaris 13.9.5 : Button tertiary tone critical | clair | danger | `background (tertiary)` #ffffff~ | `color-text-critical` #8e0b21 | - | `color-bg-fill-transparent-hover` #f2f2f2~ α5 %, texte #5f0716 | `color-bg-fill-transparent-active` #ebebeb~ α8 %, texte #2f040b | 9.46 | 1.00 | 1.00 |
| Shopify Polaris 13.9.5 : Button tertiary tone critical | sombre | danger | `background (tertiary)` #303030~ | `color-text-critical` #8e0b21 | - | `color-bg-fill-transparent-hover` #4d4d4d~ α14 %, texte #5f0716 | `color-bg-fill-transparent-active` #535353~ α17 %, texte #2f040b | 1.40 | 1.00 | 1.00 |
| Microsoft Fluent 2 react-button 9.11.1 : Button subtle | clair | neutre | `colorSubtleBackground` #ffffff~ | `colorNeutralForeground2` #424242 [26] | - | `colorSubtleBackgroundHover` #f5f5f5 [96], texte #242424 | `colorSubtleBackgroundPressed` #e0e0e0 [88], texte #242424 | 10.05 | - | 1.00 |
| Microsoft Fluent 2 react-button 9.11.1 : Button subtle | sombre | neutre | `colorSubtleBackground` #292929~ | `colorNeutralForeground2` #d6d6d6 [84] | - | `colorSubtleBackgroundHover` #383838 [22], texte #ffffff | `colorSubtleBackgroundPressed` #2e2e2e [18], texte #ffffff | 10.01 | - | 1.00 |
| Material 3 @material/web 2.5.0 : FilledTonalButton tonal | clair | secondaire | `md.sys.color.secondary-container` #e8def8 [ton 90] | `md.sys.color.on-secondary-container` #1d192b [ton 10] | - | `hover-state-layer (on-secondary-container) su…` #d8cee8~ [couche 8 %] | `pressed-state-layer (on-secondary-container) …` #d0c6df~ [couche 12 %] | 13.24 | 1.23 | 1.17 |
| Material 3 @material/web 2.5.0 : FilledTonalButton tonal | sombre | secondaire | `md.sys.color.secondary-container` #4a4458 [ton 30] | `md.sys.color.on-secondary-container` #e8def8 [ton 90] | - | `hover-state-layer (on-secondary-container) su…` #575065~ [couche 8 %] | `pressed-state-layer (on-secondary-container) …` #5d566b~ [couche 12 %] | 7.19 | 2.00 | 1.84 |
| Material UI 9.5.0 : Button text (color) | clair | danger | `background (text)` #ffffff~ | `palette.error.main` #d32f2f [red[700]] | - | `alpha(palette.error.main, hoverOpacity)` #fdf7f7~ α4 % [main 4 %] | (aucun changement de couleur à l'appui ; l'effet est l'ondulation (TouchRipple), non relevée) | 4.98 | 1.00 | 1.00 |
| Material UI 9.5.0 : Button text (color) | sombre | danger | `background (text)` #121212~ | `palette.error.main` #f44336 [red[500]] | - | `alpha(palette.error.main, hoverOpacity)` #241615~ α8 % [main 8 %] | (aucun changement de couleur à l'appui ; l'effet est l'ondulation (TouchRipple), non relevée) | 5.09 | 1.00 | 1.00 |
| Material UI 9.5.0 : Button text (color) | clair | success | `background (text)` #ffffff~ | `palette.success.main` #2e7d32 [green[800]] | - | `alpha(palette.success.main, hoverOpacity)` #f7faf7~ α4 % [main 4 %] | (aucun changement de couleur à l'appui ; l'effet est l'ondulation (TouchRipple), non relevée) | 5.13 | 1.00 | 1.00 |
| Material UI 9.5.0 : Button text (color) | sombre | success | `background (text)` #121212~ | `palette.success.main` #66bb6a [green[400]] | - | `alpha(palette.success.main, hoverOpacity)` #192019~ α8 % [main 8 %] | (aucun changement de couleur à l'appui ; l'effet est l'ondulation (TouchRipple), non relevée) | 7.92 | 1.00 | 1.00 |
| Material UI 9.5.0 : Button text (color) | clair | warning | `background (text)` #ffffff~ | `palette.warning.main` #ed6c02 [littéral] | - | `alpha(palette.warning.main, hoverOpacity)` #fef9f5~ α4 % [main 4 %] | (aucun changement de couleur à l'appui ; l'effet est l'ondulation (TouchRipple), non relevée) | 3.11 | 1.00 | 1.00 |
| Material UI 9.5.0 : Button text (color) | sombre | warning | `background (text)` #121212~ | `palette.warning.main` #ffa726 [orange[400]] | - | `alpha(palette.warning.main, hoverOpacity)` #251e14~ α8 % [main 8 %] | (aucun changement de couleur à l'appui ; l'effet est l'ondulation (TouchRipple), non relevée) | 9.64 | 1.00 | 1.00 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Button light | clair | neutre | `bg-gray-200` #e5e7eb [200] | `text-gray-900` #101828 [900] | - | `hover:bg-gray-300/70` #dfe2e7~ α70 % [300/70] | (aucune classe `active:` : pas d'état d'appui) | 14.33 | - | 1.24 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Button light | sombre | neutre | `dark:bg-gray-900` #101828 [900] | `dark:text-gray-50` #f9fafb [50] | - | `dark:hover:bg-gray-800/80` #1a2433~ α80 % [800/80] | (aucune classe `active:` : pas d'état d'appui) | 16.98 | - | 1.09 |
| Untitled UI (kit Figma) kit v2.0 : Button (Figma) Secondary color | clair | marque | `Brand/50` #f9f5ff [50] | `Brand/700` #6941c6 [700] | `Brand/50` #f9f5ff [50] | (non relevé : le fichier relevé ne couvre que Default et Focused) | (non relevé) | 6.16 | - | - |
<!-- /tableau -->

### Ce que font la plupart

- **Fond au repos** : trois systèmes seulement posent un fond de la teinte : Radix `soft` (`a3`), Material 3 `tonal` (`secondary-container`, ton 90 en clair et 30 en sombre) et Untitled Secondary color (`Brand/50`). Les autres sont transparents (Atlassian, Fluent `subtle`, Polaris `tertiary`, Material UI `text`) ou gris neutre (Primer, Tremor `light`). Seul Radix pose au repos un fond teinté d'un ton de statut.
- **Survol et appui** : Radix monte d'un pas à chaque état (`a3`, puis `a4`, puis `a5`). Material 3 pose sur le conteneur une couche de la couleur du texte, à 8 % puis 12 %. Material UI `text` teinte le fond à 4 % de `main` (8 % en sombre) au survol et ne change rien à l'appui. Atlassian et Fluent passent par un fond neutre (`subtle.hovered`, puis `subtle.pressed` ; gris 96, puis gris 88 en clair). Primer `danger` passe d'un texte rouge sur gris à un fond rouge plein. Untitled n'a pas d'état relevé.
- **Texte** : la couleur du ton au pas 11 chez Radix (`a11`, translucide), le ton 10 ou 90 de la palette chez Material 3, `Brand/700` chez Untitled. Il reste le même aux trois états chez Radix, Material 3 et Atlassian.
- **Contour** : aucun chez Radix, Material 3, Polaris, Fluent, Material UI `text` et Tremor ; un contour gris chez Atlassian `default` et Primer ; un contour de la couleur du fond (`Brand/50`) chez Untitled.
- **Sombre** : Radix `a3` passe à 12–18 % d'opacité de l'échelle sombre, Material 3 au ton 30 avec un texte au ton 90, Atlassian échange ses jetons, Fluent passe à gris 22 puis gris 18 au survol et à l'appui. Texte/fond de 3,11 à 14,33 en clair et de 4,82 à 16,98 en sombre. Fond/support de 1,00 à 1,24 en clair et de 1,00 à 2,00 en sombre.

## 5. Bouton plein : survol et appui

Radix `solid`, Atlassian `primary`, `danger` et `warning`, Primer `primary`, Polaris `primary` (marque, critical, success), Fluent `primary`, Material 3 FilledButton, Material UI `contained`, Tremor `primary` et `destructive`, Untitled Primary.

### Écart de pas entre fond et texte

<!-- ecart:bouton-plein -->
| Système, composant, variante | Thème | Tons | Pas du fond | Pas du texte | Écart |
|---|---|---|---|---|---|
| Material 3 : FilledButton filled | clair | primaire | ton 40 | ton 100 | 60 tons (échelle tonale 0 à 100) |
| Material 3 : FilledButton filled | sombre | primaire | ton 80 | ton 20 | 60 tons (échelle tonale 0 à 100) |
<!-- /ecart -->

### Valeurs

<!-- tableau:bouton-plein -->
| Système, composant, variante | Thème | Ton | Fond | Texte | Contour | Survol | Appui | Texte/fond | Fond/page | Fond/carte |
|---|---|---|---|---|---|---|---|---|---|---|
| Radix Themes 3.3.0 : Button solid | clair | danger | `--accent-9` #e5484d [9] | `--accent-contrast` #ffffff [contrast] | - | `--accent-10` #dc3e42 [10] | `--accent-10` #dc3e42 [10], plus `filter: brightness(0.92) saturate(1.1)` | 3.91 | 3.91 | 3.91 |
| Radix Themes 3.3.0 : Button solid | sombre | danger | `--accent-9` #e5484d [9] | `--accent-contrast` #ffffff [contrast] | - | `--accent-10` #ec5d5e [10] | `--accent-10` #ec5d5e [10], plus `filter: brightness(1.08)` | 3.91 | 4.82 | 4.49 |
| Radix Themes 3.3.0 : Button solid | clair | success | `--accent-9` #30a46c [9] | `--accent-contrast` #ffffff [contrast] | - | `--accent-10` #2b9a66 [10] | `--accent-10` #2b9a66 [10], plus `filter: brightness(0.92) saturate(1.1)` | 3.16 | 3.16 | 3.16 |
| Radix Themes 3.3.0 : Button solid | sombre | success | `--accent-9` #30a46c [9] | `--accent-contrast` #ffffff [contrast] | - | `--accent-10` #33b074 [10] | `--accent-10` #33b074 [10], plus `filter: brightness(1.08)` | 3.16 | 5.98 | 5.57 |
| Radix Themes 3.3.0 : Button solid | clair | warning | `--accent-9` #ffc53d [9] | `--accent-contrast` #21201c [contrast] | - | `--accent-10` #ffba18 [10] | `--accent-10` #ffba18 [10], plus `filter: brightness(0.92) saturate(1.1)` | 10.33 | 1.58 | 1.58 |
| Radix Themes 3.3.0 : Button solid | sombre | warning | `--accent-9` #ffc53d [9] | `--accent-contrast` #21201c [contrast] | - | `--accent-10` #ffd60a [10] | `--accent-10` #ffd60a [10], plus `filter: brightness(1.08)` | 10.33 | 11.96 | 11.14 |
| Atlassian button 25.4.7 : Button primary | clair | marque | `color.background.brand.bold` #1868db [bold] | `color.text.inverse` #ffffff | - | `color.background.brand.bold.hovered` #1558bc [bold.hovered] | `color.background.brand.bold.pressed` #144794 [bold.pressed] | 5.20 | 5.20 | 5.20 |
| Atlassian button 25.4.7 : Button primary | sombre | marque | `color.background.brand.bold` #669df1 [bold] | `color.text.inverse` #1f1f21 | - | `color.background.brand.bold.hovered` #8fb8f6 [bold.hovered] | `color.background.brand.bold.pressed` #adcbfb [bold.pressed] | 6.00 | 6.00 | 5.59 |
| Atlassian button 25.4.7 : Button danger | clair | danger | `color.background.danger.bold` #c9372c [bold] | `color.text.inverse` #ffffff | - | `color.background.danger.bold.hovered` #ae2e24 [bold.hovered] | `color.background.danger.bold.pressed` #872821 [bold.pressed] | 5.16 | 5.16 | 5.16 |
| Atlassian button 25.4.7 : Button danger | sombre | danger | `color.background.danger.bold` #f87168 [bold] | `color.text.inverse` #1f1f21 | - | `color.background.danger.bold.hovered` #fd9891 [bold.hovered] | `color.background.danger.bold.pressed` #ffb8b2 [bold.pressed] | 5.92 | 5.92 | 5.51 |
| Atlassian button 25.4.7 : Button warning | clair | warning | `color.background.warning.bold` #fbc828 [bold] | `color.text.warning.inverse` #292a2e | - | `color.background.warning.bold.hovered` #fca700 [bold.hovered] | `color.background.warning.bold.pressed` #f68909 [bold.pressed] | 9.14 | 1.57 | 1.57 |
| Atlassian button 25.4.7 : Button warning | sombre | warning | `color.background.warning.bold` #fbc828 [bold] | `color.text.warning.inverse` #1f1f21 | - | `color.background.warning.bold.hovered` #fca700 [bold.hovered] | `color.background.warning.bold.pressed` #f68909 [bold.pressed] | 10.50 | 10.50 | 9.77 |
| GitHub Primer react 38.40.1 : Button primary | clair | success | `--button-primary-bgColor-rest` #1f883d | `--button-primary-fgColor-rest` #ffffff | `--button-primary-borderColor-rest` #dededf~ α15 % | `--button-primary-bgColor-hover` #1c8139 | `--button-primary-bgColor-active` #197935 | 4.52 | 4.52 | 4.52 |
| GitHub Primer react 38.40.1 : Button primary | sombre | success | `--button-primary-bgColor-rest` #238636 | `--button-primary-fgColor-rest` #ffffff | `--button-primary-borderColor-rest` #383d44~ α15 % | `--button-primary-bgColor-hover` #29903b | `--button-primary-bgColor-active` #2e9a40 | 4.63 | 4.09 | 3.74 |
| Shopify Polaris 13.9.5 : Button primary (marque) | clair | marque | `color-bg-fill-brand` #303030 | `color-text-brand-on-bg-fill` #ffffff | - | `color-bg-fill-brand-hover` #1a1a1a | `color-bg-fill-brand-active` #1a1a1a | 13.20 | 11.69 | 13.20 |
| Shopify Polaris 13.9.5 : Button primary (marque) | sombre | marque | `color-bg-fill-brand` #ffffff | `color-text-brand-on-bg-fill` #303030 | - | `color-bg-fill-brand-hover` #f3f3f3 | `color-bg-fill-brand-active` #f7f7f7 | 13.20 | 17.40 | 13.20 |
| Shopify Polaris 13.9.5 : Button primary tone critical | clair | danger | `color-bg-fill-critical` #c70a24 | `color-text-brand-on-bg-fill` #ffffff | - | `color-bg-fill-critical-hover` #a30a24 | `color-bg-fill-critical-active` #8e0b21 | 6.00 | 5.32 | 6.00 |
| Shopify Polaris 13.9.5 : Button primary tone critical | sombre | danger | `color-bg-fill-critical` #c70a24 | `color-text-brand-on-bg-fill` #303030 | - | `color-bg-fill-critical-hover` #a30a24 | `color-bg-fill-critical-active` #8e0b21 | 2.20 | 2.90 | 2.20 |
| Shopify Polaris 13.9.5 : Button primary tone success | clair | success | `color-bg-fill-success` #047b5d | `color-text-brand-on-bg-fill` #ffffff | - | `color-bg-fill-success-hover` #035e4c | `color-bg-fill-success-active` #014b40 | 5.25 | 4.65 | 5.25 |
| Shopify Polaris 13.9.5 : Button primary tone success | sombre | success | `color-bg-fill-success` #047b5d | `color-text-brand-on-bg-fill` #303030 | - | `color-bg-fill-success-hover` #035e4c | `color-bg-fill-success-active` #014b40 | 2.51 | 3.31 | 2.51 |
| Microsoft Fluent 2 react-button 9.11.1 : Button primary | clair | marque | `colorBrandBackground` #0f6cbd [80] | `colorNeutralForegroundOnBrand` #ffffff | - | `colorBrandBackgroundHover` #115ea3 [70] | `colorBrandBackgroundPressed` #0c3b5e [40] | 5.38 | - | 5.38 |
| Microsoft Fluent 2 react-button 9.11.1 : Button primary | sombre | marque | `colorBrandBackground` #115ea3 [70] | `colorNeutralForegroundOnBrand` #ffffff | - | `colorBrandBackgroundHover` #0f6cbd [80] | `colorBrandBackgroundPressed` #0c3b5e [40] | 6.66 | - | 2.18 |
| Material 3 @material/web 2.5.0 : FilledButton filled | clair | primaire | `md.sys.color.primary` #6750a4 [ton 40] | `md.sys.color.on-primary` #ffffff [ton 100] | - | `hover-state-layer (on-primary) sur le contene…` #735eab~ [couche 8 %] | `pressed-state-layer (on-primary) sur le conte…` #7965af~ [couche 12 %] | 6.44 | 6.12 | 5.84 |
| Material 3 @material/web 2.5.0 : FilledButton filled | sombre | primaire | `md.sys.color.primary` #d0bcff [ton 80] | `md.sys.color.on-primary` #381e72 [ton 20] | - | `hover-state-layer (on-primary) sur le contene…` #c4aff4~ [couche 8 %] | `pressed-state-layer (on-primary) sur le conte…` #bea9ee~ [couche 12 %] | 7.71 | 10.91 | 10.02 |
| Material UI 9.5.0 : Button contained (color) | clair | danger | `palette.error.main` #d32f2f [red[700]] | `palette.error.contrastText` #ffffff~ | - | `palette.error.dark` #c62828 [red[800]] | (aucun changement de couleur à l'appui ; seule l'ombre change (`boxShadow`)) | 4.98 | 4.98 | 4.98 |
| Material UI 9.5.0 : Button contained (color) | sombre | danger | `palette.error.main` #f44336 [red[500]] | `palette.error.contrastText` #ffffff~ | - | `palette.error.dark` #d32f2f [red[700]] | (aucun changement de couleur à l'appui ; seule l'ombre change (`boxShadow`)) | 3.68 | 5.09 | 5.09 |
| Material UI 9.5.0 : Button contained (color) | clair | success | `palette.success.main` #2e7d32 [green[800]] | `palette.success.contrastText` #ffffff~ | - | `palette.success.dark` #1b5e20 [green[900]] | (aucun changement de couleur à l'appui ; seule l'ombre change (`boxShadow`)) | 5.13 | 5.13 | 5.13 |
| Material UI 9.5.0 : Button contained (color) | sombre | success | `palette.success.main` #66bb6a [green[400]] | `palette.success.contrastText` #000000~ | - | `palette.success.dark` #388e3c [green[700]] | (aucun changement de couleur à l'appui ; seule l'ombre change (`boxShadow`)) | 8.88 | 7.92 | 7.92 |
| Material UI 9.5.0 : Button contained (color) | clair | warning | `palette.warning.main` #ed6c02 [littéral] | `palette.warning.contrastText` #ffffff~ | - | `palette.warning.dark` #e65100 [orange[900]] | (aucun changement de couleur à l'appui ; seule l'ombre change (`boxShadow`)) | 3.11 | 3.11 | 3.11 |
| Material UI 9.5.0 : Button contained (color) | sombre | warning | `palette.warning.main` #ffa726 [orange[400]] | `palette.warning.contrastText` #000000~ | - | `palette.warning.dark` #f57c00 [orange[700]] | (aucun changement de couleur à l'appui ; seule l'ombre change (`boxShadow`)) | 10.81 | 9.64 | 9.64 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Button primary | clair | marque | `bg-blue-500` #2b7fff [500] | `text-white` #ffffff [white] | - | `hover:bg-blue-600` #155dfc [600] | (aucune classe `active:` : pas d'état d'appui) | 3.76 | - | 3.76 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Button primary | sombre | marque | `dark:bg-blue-500` #2b7fff [500] | `dark:text-white` #ffffff [white] | - | `dark:hover:bg-blue-600` #155dfc [600] | (aucune classe `active:` : pas d'état d'appui) | 3.76 | - | 5.12 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Button destructive | clair | danger | `bg-red-600` #e7000b [600] | `text-white` #ffffff [white] | - | `hover:bg-red-700` #c10007 [700] | (aucune classe `active:` : pas d'état d'appui) | 4.77 | - | 4.77 |
| Tremor (Tailwind CSS) ca4d588, Tailwind 4.1.3 : Button destructive | sombre | danger | `dark:bg-red-700` #c10007 [700] | `text-white` #ffffff [white] | - | `dark:hover:bg-red-600` #e7000b [600] | (aucune classe `active:` : pas d'état d'appui) | 6.42 | - | 3.00 |
| Untitled UI (kit Figma) kit v2.0 : Button (Figma) Primary | clair | marque | `Brand/600` #7f56d9 [600] | `White` #ffffff [blanc] | `Brand/600` #7f56d9 [600] | (non relevé : le fichier relevé ne couvre que Default et Focused) | (non relevé) | 4.96 | - | - |
<!-- /tableau -->

### Ce que font la plupart

- **Fond au repos** : un pas moyen à fort de la teinte. Radix `9`, Tremor 500 ou 600, Atlassian `bold`, Fluent `brand[80]` en clair, Material UI `main`, Material 3 ton 40 en clair, Primer un vert de bouton principal.
- **Survol** : une valeur plus sombre en clair chez Radix (`9` vers `10`), Tremor (500 vers 600), Atlassian (`bold` vers `bold.hovered`), Fluent (`brand[80]` vers `brand[70]`), Primer (`#1f883d` vers `#1c8139`), Polaris (critical `#c70a24` vers `#a30a24`) et Material UI (`main` vers `dark`). Material 3 pose une couche de 8 % de `on-primary`. En sombre, le survol éclaircit chez Radix, Atlassian, Fluent et Primer.
- **Appui** : une troisième valeur distincte chez Atlassian (`bold.pressed`), Primer (`#197935`), Polaris (critical `#8e0b21`), Fluent (`brand[40]`) et Material 3 (couche de 12 %). Radix garde `accent-10` et ajoute un filtre (`brightness(0.92) saturate(1.1)` en clair, `brightness(1.08)` en sombre). Polaris `primary` de marque garde le fond du survol. Tremor (aucune classe `active:`) et Material UI ne changent pas la couleur à l'appui.
- **Texte** : blanc, ou une encre foncée sur jaune et orange (Radix amber `#21201c`, Atlassian `text.warning.inverse`). Texte/fond de 3,11 à 10,33 en clair et de 3,16 à 10,81 en sombre.
- **Contour** : aucun, sauf Primer (contour translucide) et Untitled (contour de la couleur du fond).

## Relevés anciens

Audit des fichiers de `Collecte/{Atlassian,Radix,MUI,Spectrum,Tailwind,Figma}/processed/`, limité aux composants de ce document ; `card.json` n'a pas été relu. Chaque verdict a été recoupé avec les sources figées de `Composants/sources/`. Verdicts : fiable, partiel (utilisable avec la réserve citée), obsolète, vide, invalide (fichier non lisible par `JSON.parse`), erroné (valeurs contredites par la source).

| Fichier | Verdict | Raison |
|---|---|---|
| `RELEVE-STATUTS-ET-FOCUS.md` | fiable | Les valeurs de Radix (dont les fonds sombres `#ff173f2d`, `#fa820022`, `#0077ff3a`), de Primer (Flash), d'Atlassian (Lozenge `subtler` et `bolder`, Section message), de Tremor et d'Untitled sont retrouvées à l'identique. Réserve : plusieurs liens visent une branche (`main`) ou une version non épinglée. |
| `Surfaces/processed/statuts.json`, Atlassian Lozenge | partiel | Le contour du Lozenge est donné comme `color.border.X` (`#6a9a23` en clair pour success). Le composant lit `border.X.subtle` (`#b3df72`) par `--border-color` : écart de pas. Les autres lignes du fichier sont recoupées par les nouveaux tableaux : 46 lignes comparées, aucune différence de valeur ; les fonds translucides de Primer en sombre ne diffèrent que par la forme (hexa calculé contre valeur publiée). |
| `Atlassian/processed/components/alert.json` | obsolète | Le paquet `@atlaskit/alert` n'existe pas dans npm. Les couleurs (`#0747A6`, `#36B37E`, `#FFAB00`, `#FF5630`) sont celles de l'ancienne palette d'Atlaskit, sans rapport avec les jetons actuels. La source est « documentation ». |
| `Atlassian/processed/components/button.json` | obsolète | Version `@atlaskit/button@17.0.5` inexistante (dernière : 25.4.7). Valeurs `#0066CC` et `#0052CC` absentes des jetons ; le bouton `primary` lit `background.brand.bold` (`#1868db`), `bold.hovered` (`#1558bc`) et `bold.pressed` (`#144794`). Le halo `focus-ring-blue` n'existe pas. |
| `Atlassian/processed/components/lozenge.json` | vide | Aucune valeur de couleur (noms `N200`, `B500` sans hexa). Les apparences listées (`inverse`, `primary`, `important`) et la propriété `isBold` appartiennent au Lozenge hérité, que la version 17.0.5 n'exporte plus par défaut. Le fichier reconnaît que le paquet n'a pas été extrait. |
| `Atlassian/processed/tokens/color-palettes.json` | invalide | Commentaire en tête. Le contenu est déclaré « basé sur la documentation publique » ; les valeurs sombres sont des inversions (`N50` sombre `#172B4D`), non des jetons. |
| `Atlassian/metadata.jsonl` | fiable | Versions et empreintes des paquets lozenge 17.0.5, section-message 10.2.6, tokens 20.4.1, badge 22.0.0. Les archives ne sont pas conservées. |
| `Radix/processed/components/badge.json` | invalide | Le fichier commence par un commentaire `/** … */`. Le contenu est fiable : solid `accent-9` et `accent-contrast`, soft `accent-a3` et `accent-a11`, surface `accent-surface`, `accent-a6` et `accent-a11` correspondent à `badge.css` 3.3.0. Il ne porte aucun hexa et cite des fichiers `work/…` absents du dépôt. |
| `Radix/processed/components/alert.json` | erroné | Décrit `AlertDialog`, pas `Callout`. Les couleurs `gray-a3`, `gray-a6` et `gray-a12` n'apparaissent pas dans `callout.css`, qui lit `accent-a3`, `accent-a2`, `accent-a6` et `accent-a11`. |
| `Radix/processed/components/button.json` | partiel | Solid `accent-9` puis `accent-10` : exact. Soft : fond `a3` et texte `a11` exacts, mais le survol (`a4`) et l'appui (`a5`) manquent. Le focus décrit `box-shadow 3px accent-a8` ; la feuille pose `outline: 2px solid accent-8`. |
| `Radix/processed/tokens/color-palettes.json` | partiel | Thème clair exact (48 valeurs sur 48 pour blue, green, amber, red). Thème sombre non fiable : les 48 valeurs `dark` répètent celles de `light`, et 44 diffèrent de la feuille sombre du paquet. |
| `MUI/processed/components/alert.json` | erroné | Fonds `#ffebee`, `#fff8e1` et textes `#c62828`, `#e65100`. Les formules de Material UI 9.5.0 donnent, pour error `standard`, `#fdeded` et `#5f2120`, et pour warning `#fff4e5` et `#663c00`. Source « documentation », version 5.15.0. |
| `MUI/processed/components/chip.json` | erroné | La variante `filled` par défaut est donnée en `#3f51b5` (ancien primaire). Le Chip par défaut lit `action.selected` (`rgba(0, 0, 0, 0.08)`) et `primary.main` vaut `#1976d2`. |
| `MUI/processed/components/button.json` | partiel | `contained` primary `#1976d2` et survol `#1565c0` : cohérents avec la palette 9.5.0 (non recoupés teinte par teinte). L'appui n'a pas de couleur dans la source. |
| `MUI/processed/tokens/color-palettes.json` | partiel | Rampes `red`, `green`, `orange`, `lightBlue` exactes (40 valeurs sur 40). Rampe `blue` différente (0 sur 10). Palettes sémantiques de l'ancien thème : `primary` et `info` valent `#3f51b5`, `warning` `#ffc107`. `MUI/sources/` ne contient que `METADATA.json`. |
| `Spectrum/processed/components/badge.json` | invalide | Un commentaire `// …` ligne 162 casse le JSON. Les noms (`accent-subtle`, `gray-1000`, `lightDark('accent-800', 'accent-900')`) sont conformes à `Badge.tsx` ; aucun hexa. |
| `Spectrum/processed/components/alert.json` | erroné | Un seul style : fond subtle, contour de 1 px de la teinte, texte `informative-visual`. `InlineAlert.tsx` a trois styles (`border`, `subtleFill`, `boldFill`), un contour de 2 px, et un texte `title` ou `body`, en gris. |
| `Spectrum/processed/components/button.json` | erroné | Les noms `accent-hover`, `accent-focus-ring` et `accent-contrast` ne sont pas des jetons de `@adobe/spectrum-tokens` 14.15.0. Source « documentation ». |
| `Spectrum/processed/tokens/color-tokens.json` | fiable | 163 jetons sur 212 recoupés avec `variables.json` 14.15.0 (les autres n'ont pas de forme comparable) : 163 valeurs claires identiques. |
| `Tailwind/processed/components/{badge,alert,button}.json` | obsolète | Tailwind CSS ne publie pas de composants : « basé sur les bonnes pratiques ». Les hexa (`#3b82f6`, `#22c55e`) sont ceux de la palette de la version 3 sous l'étiquette 4.0.0. Aucune source. |
| `Tailwind/processed/tokens/color-palettes.json` | obsolète | 54 valeurs sur 231 égales à `theme.css` 4.1.3 ; le reste est la palette de la version 3 (par exemple `gray-300` `#d1d5db` contre `#d1d5dc`). |
| `Figma/processed/components/badges.json` | fiable | Les quatre couples sont retrouvés dans la planche Colors (`Brand/50`, `Red/50`, `Yellow/50`, `Green/50` pour le fond ; 700 pour le texte ; 200 pour le contour) et les contrastes recalculés (6,16 ; 5,91 ; 4,76 ; 4,79) sont identiques. Limite : le contour appartient au badge intérieur blanc. |
| `Figma/processed/components/components-ui.json` | fiable | Boutons Primary et Secondary color aux états Default et Focused, recoupés avec la planche Colors. Pas de survol ni d'appui, pas de thème sombre. |

## Manques

- **Carbon** : le Tag (badge) et les boutons ne sont pas relevés. Seule la notification en ligne `low-contrast` est donnée, reprise de `Surfaces/`. La largeur du trait à gauche n'a pas été relue.
- **Atlassian** : aucune variante de Lozenge pleine dans la version 17.0.5 (la variante en gras ne vit que dans le Lozenge hérité, que l'index n'exporte pas par défaut). Le composant `Badge` (22.0.0) n'a pas été lu. Aucun Button n'emploie les fonds `subtler` et `subtlest` : ils figurent dans le JSON comme jetons seuls (type `gamme-tokens`). Le Lozenge n'a d'états que s'il est interactif.
- **Primer** : `StateLabel`, `CounterLabel` et le composant `Banner` ne sont pas lus. Le Label n'a pas de fond, donc aucun badge teinté. Les rampes de base (`base-color-*`) ne sont pas figées : les jetons fonctionnels sont donnés sans pas numéroté.
- **Polaris** : le thème sombre publié est expérimental et partiel. Les fonds de statut restent clairs, et le texte des boutons pleins critical et success devient gris foncé sur un fond rouge ou vert, soit 2,20 et 2,51 de contraste. Les pas de l'échelle d'origine ne sont pas lus. Le Badge n'a pas de variante pleine dans les règles lues.
- **Fluent 2** : pas de bouton teinté par un ton. Le MessageBar `info` n'a pas de couleur propre (fond neutre 3). Badge `ghost` et `outline`, thèmes Teams et à contraste élevé non relevés. Les versions des paquets `react-*` ne sont pas recoupées avec `@fluentui/tokens` 1.0.0-alpha.24. Le ton « info » du Badge est la couleur de marque du thème web.
- **Material 3** : `@material/web` 2.5.0 n'a ni alerte, ni badge de statut, ni rôle success, warning ou info. L'Assist chip est relevé en variante plate seulement ; les chips de filtre sélectionnés et le schéma dynamique ne sont pas relevés. Les couches d'état sont calculées par composition, non publiées.
- **Material UI** : Chip, Alert et Button `outlined`, les tons `primary` et `secondary`, `theme.vars` et l'ondulation à l'appui ne sont pas relevés. Le mode sombre est celui de `createPalette({ mode: 'dark' })`. Les couleurs d'Alert `standard`, de Button et de Chip sont calculées par les formules de `colorManipulator`, relues dans le fichier.
- **Spectrum 2** : Button non relevé. Les états de survol et d'appui des composants ne sont pas lus. Les jetons viennent de la version 14.15.0 de `@adobe/spectrum-tokens` ; une version 15.5.0 existe, non comparée. Le choix de la page (`background-base-color`) et de la carte (`background-layer-2-color`) est celui de ce relevé.
- **Tremor et Tailwind** : le code de Tailwind Plus et de Catalyst n'est pas public, donc non lu. Tremor n'a pas de badge plein et pas d'état d'appui. La version de Tailwind retenue (4.1.3) est la borne basse de la plage déclarée par le dépôt de Tremor, qui ne l'épingle pas.
- **Untitled UI** : le kit Figma ne porte que le thème clair, sans survol ni appui, sans page Alert. Le code d'Untitled UI React n'est pas lu. Le contour 200 est celui du badge intérieur blanc, pas du badge extérieur.
- **shadcn/ui** : Badge, Alert et Button ne sont pas relevés ; seuls ses jetons de surface le sont, dans `Surfaces/`.
- **Radix** : les variantes `highContrast` et `classic`, les tailles et les familles autres que blue, green, amber et red ne sont pas relevées. Aucune valeur sombre n'a été prise dans `Radix/processed/tokens/color-palettes.json`.
- **Tous les systèmes** : aucun rendu navigateur. Le contraste d'un fond translucide dépend du support ; il est donné sur la carte (texte/fond) et séparément sur la page et sur la carte (fond/support).

## Sources et versions

Les URL, révisions, chemins d'origine et SHA-256 de chaque fichier sont dans [`Composants/sources.json`](./Composants/sources.json). Les valeurs extraites sont dans [`Composants/processed/composants.json`](./Composants/processed/composants.json).

| Système | Paquets ou révisions | Fichiers lus |
|---|---|---|
| Radix Themes | `@radix-ui/themes@3.3.0`, `@radix-ui/colors@3.0.0` | `badge.css`, `callout.css`, `_internal/base-button.css`, feuilles de couleur de `Radix/sources/` |
| Atlassian | `@atlaskit/lozenge@17.0.5`, `section-message@10.2.6`, `button@25.4.7`, `tokens@20.4.1` | feuilles compilées et JS des composants, thèmes `atlassian-light` et `atlassian-dark` |
| GitHub Primer | `@primer/react@38.40.1`, `@primer/primitives@11.10.0` | `Label`, `Flash`, `ButtonBase` (CSS compilé), `light.css`, `dark.css` |
| Shopify Polaris | `@shopify/polaris@13.9.5`, `@shopify/polaris-tokens@9.4.2` | `styles.css`, `Banner/utilities.js`, jetons résolus (repris de `Surfaces/`) |
| Microsoft Fluent 2 | `@fluentui/tokens@1.0.0-alpha.24`, `react-badge@9.5.6`, `react-message-bar@9.7.7`, `react-button@9.11.1` | feuilles de style `.styles.raw.js`, alias de couleur, palettes, `brandColors.js` |
| Material 3 | `@material/web@2.5.0` | jetons `v0_192` : `filled-tonal-button`, `filled-button`, `assist-chip`, `sys-state`, `sys-color`, `ref-palette` |
| Material UI | `@mui/material@9.5.0`, `@mui/system@9.5.0` | `Alert.js`, `Chip.js`, `Button.js`, `createPalette.js`, `colors/*`, `colorManipulator.mjs` |
| Adobe Spectrum 2 | `adobe/react-spectrum@740c6c5c`, `@adobe/spectrum-tokens@14.15.0` | `Badge.tsx`, `InlineAlert.tsx`, `spectrum-theme.ts`, `variables.json` |
| Tremor | `tremorlabs/tremor@ca4d588f`, `tailwindcss@4.1.3` | `Badge.tsx`, `Callout.tsx`, `Button.tsx`, `Card.tsx`, `theme.css` |
| Carbon | `@carbon/themes@11.83.0`, `@carbon/styles@1.117.0` | reprise de `Surfaces/processed/statuts.json` |
| Untitled UI | kit Figma Community v2.0 | reprise de `Figma/processed/` |

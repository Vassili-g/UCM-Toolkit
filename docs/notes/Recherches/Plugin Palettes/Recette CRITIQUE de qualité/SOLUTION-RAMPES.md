# Rampes de couleur : la solution proposée

**Statut : solution à valider.** Ce document reprend tout le sujet des rampes
après les notes à l'aveugle du mainteneur et un relevé de neuf systèmes. Il
remplace les recommandations Q1, Q2, Q5 et Q6, et ajoute Q9, du
[dossier de qualité](./DOSSIER-QUALITE-DES-PALETTES.md) ; les mesures et les
pistes écartées restent dans ce dossier.

Sources : [Collecte/Surfaces](./Collecte/Surfaces/README.md) (Primer,
Atlassian, Carbon, Polaris, Material 3, Fluent 2, shadcn/ui, Radix, versions
figées), [Collecte/SDS](./Collecte/SDS/README.md) (Simple Design System de
Figma), [ANALYSE-COMPOSANTS-A-SURFACE.md](./Collecte/ANALYSE-COMPOSANTS-A-SURFACE.md)
(badges, alertes et boutons de onze systèmes),
[RELEVE-STATUTS-ET-FOCUS.md](./Collecte/RELEVE-STATUTS-ET-FOCUS.md),
et les scripts de [Mesures](./Mesures/) : `verifier-garanties.ts`,
`mesurer-textes-sombres.ts`, `generer-donnees.ts`.

## 1. Ce que font les autres systèmes

### Le support des composants

| Système | Light : page / carte | Dark : page / carte | Carte contre page, Dark |
|---|---|---|---|
| Primer | `#ffffff` / `#ffffff` | `#0d1117` / `#151b23` | 1,09 |
| Atlassian | `#FFFFFF` / `#FFFFFF` | `#1F1F21` / `#242528` | 1,07 |
| Radix Themes | `#ffffff` / `#ffffff` | `#111111` / `#191919` | 1,07 |
| shadcn/ui | `#ffffff` / `#ffffff` | `#0a0a0a` / `#171717` | 1,10 |
| Material 3, carte elevated | `#fef7ff` / `#f7f2fa` | `#141218` / `#1d1b20` | 1,09 |
| Polaris | `#f1f1f1` / `#ffffff` | `#1a1a1a` / `#303030`, thème expérimental | 1,32 |
| Carbon g10 et g100 | `#f4f4f4` / `#ffffff` | `#161616` / `#262626` | 1,20 |
| Fluent 2 | carte `#ffffff`, fonds `#fafafa` à `#f5f5f5` | carte `#292929`, fonds plus foncés | 1,13 à 1,27 |
| UCM aujourd'hui | `#F6F7F8` / `#FFFFFF` | `#111213` / `#1A1C1F` | 1,10 |

- **En Light, les composants se posent sur du blanc.** Quatre systèmes ont une
  page et une carte blanches ; Polaris, Carbon g10 et Fluent posent une carte
  blanche sur une page grise, comme UCM. Material 3 teinte à peine son blanc.
- **En Dark, sur un gris presque noir.** La page vaut une clarté OKLab de 0,15
  à 0,27 ; la carte est plus claire que la page ou de même couleur, jamais
  plus foncée.
  Cinq systèmes l'écartent de 1,07 à 1,10, comme UCM ; Carbon et Polaris de
  1,20 à 1,32.

L'intuition du mainteneur se vérifie, et UCM la suit déjà : carte blanche en
Light, carte un peu plus claire que le noir en Dark.

### Les fonds teintés de statut

| Système | Light, fond contre son support | Dark, fond contre son support | Fond |
|---|---|---|---|
| Primer, Flash | 1,15 | 1,12 | Opaque en Light, alpha en Dark |
| Atlassian, section message · lozenge | 1,14 · 1,34 | 1,08 · 1,22 | Opaque |
| Radix, soft | 1,12 | 1,17 à 1,31 | Alpha |
| Material 3, `error-container` | 1,15 | 1,87 | Opaque |
| Fluent 2, MessageBar · badge tint | 1,09 · 1,07 | 1,19 · 1,12 | Opaque |
| Polaris, banner · badge | 1,17 · 1,37 | thème sombre partiel | Opaque |
| Figma Simple Design System, notification · tag | 1,04 à 1,17 selon le ton | 1,09 à 1,40 | Opaque, cran 100 de son échelle en clair, 900 en sombre |
| Tailwind, Untitled UI, Tremor : cran 50 | 1,04 à 1,09 | alpha | Opaque en clair |
| Carbon, notification | aplat pâle ; le ton passe par un trait | gris neutre `layer-01`, sans teinte | Opaque |

- **Light** : deux familles. Primer, Atlassian, Radix, Material 3 et Polaris
  posent un fond à 1,12 à 1,17 du blanc. Tailwind, Untitled UI, Tremor et le
  Simple Design System de Figma (vert, jaune) le posent à 1,04 à 1,09 :
  presque le blanc, teinté. Un badge peut monter à 1,34 à 1,37 (Atlassian,
  Polaris).
- **Dark** : 1,08 à 1,31 contre la carte, autour de 1,15. Material 3 seul va
  plus loin, avec un conteneur franc.
- **Opaque ou translucide** : Atlassian, Material 3, Fluent, Polaris et Carbon
  sont opaques ; Radix, Primer en Dark et Tremor emploient l'alpha.

### Les textes de ces fonds

En Light, le texte coloré d'un statut se tient à une clarté de 0,3 à 0,56
(Primer `#d1242f`, Fluent `#bc2f32`, Atlassian `#5D1F1A`, Polaris `#8e0b21`).
En Dark, à 0,66 à 0,89, chroma 0,13 à 0,21 (Radix pas 11, Primer `fgColor`,
Fluent `#e37d80` à 0,70 et 0,13) ; Atlassian et Material 3 prennent un rose très clair
(`#FFD5D2`, `#f9dedc`).

## 2. Où UCM s'en écarte

| Mesure | UCM aujourd'hui | Autres systèmes | Écart |
|---|---|---|---|
| Fond teinté contre la carte, Light | 100 : 1,11 à 1,17 | 1,04 à 1,09 (Figma, Tailwind, Untitled UI) ; 1,12 à 1,17 (Primer, Atlassian, Radix) | Dans la famille foncée ; le mainteneur préfère la claire |
| Carte contre page, Dark | 1,10 | 1,07 à 1,32 | Juste ; jugée trop faible par le mainteneur |
| Fond teinté contre la carte, Dark | 100 : 1,00 à 1,02 | 1,08 à 1,40 | Le fond disparaît |
| Texte du fond teinté, Dark (Soft, enveloppe) | 900 : L 0,85, C 0,07 | L 0,66 à 0,89, C 0,13 à 0,21 | Texte terne |

Trois causes, mesurées :

1. **En Dark, la carte est le cran 100 du neutre, et le fond teinté un cran
   100.** Toutes les rampes partagent la clarté d'un cran : le fond a la
   clarté de la carte.
2. **En Dark, la page et la carte ne sont séparées que d'un cran** (50 et 100),
   au bas de la courbe où deux crans voisins diffèrent peu.
3. **La borne vers le blanc de l'enveloppe vaut pour les deux thèmes.** Elle
   calme les fonds clairs du Light, mais en Dark les crans clairs sont des
   textes, et elle les éteint.

## 3. La solution

### S1. Une enveloppe par thème

`C = min(part × plafond(L, H), p₀ × min(a × (1 − L), b × L))`, avec des bornes
propres à chaque thème :

| Profil | p₀ | Light : a, b | Dark : a, b |
|---|---|---|---|
| Soft | 0,85 | 0,6 · 0,38 | 1,1 · 0,38 |
| Vivid, intensité unique | 0,95 | 1,1 · 0,48 | 1,1 · 0,48 |

Le Light ne change pas : ses notes à l'aveugle tiennent (cohérence 5 en Soft,
4 en Vivid). En Dark, le texte 900 de Soft passe de C 0,069 à 0,077 à C 0,069
à 0,141. Les fonds sombres gardent la réduction de l'intensité des fonds du
thème Dark.

### S2. Le modèle des niveaux

Un composant teinté se pose sur une carte, et la carte sur la page. Chaque
niveau se tient un cran plus loin du fond que celui qui le porte :

| Niveau | Light | Dark |
|---|---|---|
| Page | neutre 50 | neutre 50, abaissé à L 0,145 |
| Carte (`raised`) | blanc, hors rampe | neutre 100 |
| Fond teinté au repos, survol, appui | 50, 100, 200 | 200, 300, 400 |
| Texte et contour du fond teinté | 800 | 900, dans les deux sens |
| Focus | 600 | 800, dans les deux sens |
| Plein, texte et contour de page | inchangés | inchangés |

La règle est la même dans les deux thèmes : le fond teinté prend le premier
cran au-delà de sa carte. En Light, la carte est le blanc, avant le cran 50 :
le fond prend 50. En Dark, la carte est le neutre 100 : le fond prend 200. Le
survol et l'appui suivent d'un cran chacun.

La page Dark gagne la séparation qui lui manque sans déplacer la carte. Le
cran 50 du Dark ne sert aucun rôle de dossier ; sa clarté descend de 0,180 à
0,145, celle de `#0A0A0A` chez shadcn/ui. La page passe de 1,10 à 1,16 contre
la carte, et toutes les palettes reçoivent ce cran 50 plus profond.

| Mesure | Aujourd'hui | Modèle |
|---|---|---|
| Fond teinté contre la carte, Light | 1,11 à 1,17 | 1,06 à 1,08 |
| Page contre carte, Dark | 1,10 | 1,16 |
| Fond teinté contre la carte, Dark | 1,00 à 1,02 | 1,13 à 1,16 |
| Échecs des garanties, balayage de 72 teintes | 164 | 144 |

Les 144 échecs restants existent déjà : G1, le texte blanc sur le plein de
références roses en Dark inversé. Le fond 50 retire les 20 échecs G7 du focus
en Light. Sur les palettes du mainteneur, le pire couple est le texte 900
d'Orange Vivid sur l'appui 400, à 4,72:1.

En Light, le fond 50 a la clarté de la page : un composant teinté posé sur la
page, hors d'une carte, prend `surface/hover` ou un contour `page/divider`.

Pistes mesurées et écartées :

| Piste | Échecs | Raison |
|---|---|---|
| Fond Light 100, la table actuelle | 164 | Tient, mais plus foncé que le rendu voulu par le mainteneur et que Figma, Tailwind et Untitled UI |
| Texte Dark 950, proposé par le dossier d'élévation | 164 | Tient, mais le texte devient presque blanc (C 0,03 à 0,07) |
| Texte Dark 800, plus coloré | 472 à 1 440 | Échoue sur le survol 300 et l'appui 400 |
| Carte Dark au neutre 200, fonds 300 | 444 | La carte plus claire fait échouer 218 pleins et 62 textes |
| Page Dark noire, du dossier d'élévation | 0 sur l'export mesuré par ce dossier | Tient (1,23 contre la carte), mais un noir pur ; aucun système relevé ne l'emploie sur le web |
| Fonds translucides | 160 | Inutiles : les composants se posent sur une carte |

### S3. Le mapping dans l'architecture des tokens

Le chemin d'une couleur ne change pas : un composant cite `theme`, qui cite
`color-utilities` ou `color-brands`, qui citent `primitives`. Ce qui change
est le cran visé, et la clarté d'un cran.

```text
components.badge.success.background
  → theme.success.soft.surface.default
      light → color-utilities.success.soft.light.50     (aujourd'hui .100)
      dark  → color-utilities.success.soft.dark.200     (aujourd'hui .100)
  → primitives.colors.grass.soft.light.50 | .dark.200

theme.elevation.page
      light → color-utilities.elevation.light.page   → primitives.colors.titanium.light.50
      dark  → color-utilities.elevation.dark.page    → primitives.colors.titanium.dark.50   (L 0,145)
theme.elevation.raised
      light → color-utilities.elevation.light.raised → primitives.colors.white
      dark  → color-utilities.elevation.dark.raised  → primitives.colors.titanium.dark.100
```

| Couche | Qui l'écrit | Ce qui change |
|---|---|---|
| `primitives` | UCM Palettes | La courbe Dark place le cran 50 à L 0,145 ; les rampes suivent l'enveloppe par thème (S1) |
| `color-utilities`, `color-brands` | Le designer, une fois | Rien : un alias par cran |
| `color-utilities.elevation` | Le designer, une fois | Rien : la page vise le neutre 50, la carte le blanc ou le neutre 100 |
| `theme` | La table du kit, `TABLE_DES_DOSSIERS` | La table distingue le thème en plus du sens : surfaces 50, 100, 200 en Light ; 200, 300, 400, texte 900 et focus 800 en Dark |
| Recette | UCM Palettes | Le réglage « Fond de la page » Dark vaut par défaut le neutre 50, soit environ `#0A0A0B` ; les garanties se mesurent contre lui |

Le cran 50 devient requis : la table le vise en Light. Les crans requis
passent à 50, 100, 200, 300, 400, 600, 700, 800 et 900, plus 500 quand un
thème est inversé ; 950 reste facultatif.

Le neutre suit la même table que les autres palettes : sa surface au repos
vaut 50 en Light et 200 en Dark, sans règle propre au neutre.

### S4. Des fonds opaques

Les composants teintés se posent toujours sur une carte : un fond opaque
choisi contre la carte suffit, comme chez Atlassian, Material 3, Fluent et
Polaris. Palettes n'écrit que des crans ; la piste translucide est abandonnée.

### S5. Les composants à surface

[ANALYSE-COMPOSANTS-A-SURFACE.md](./Collecte/ANALYSE-COMPOSANTS-A-SURFACE.md)
relève les badges, alertes et boutons de onze systèmes. Les rôles d'UCM s'y
retrouvent sans changement :

| Composant | Rôles UCM | Light | Dark proposé | Ce que font les autres |
|---|---|---|---|---|
| Alerte | `surface/default`, `surface/foreground` | 50 · 800 | 200 · 900 | Fond pâle teinté dans les dix systèmes ; texte neutre dans cinq, teinté dans cinq (Q4) |
| Badge discret | `surface/default`, `surface/foreground` | 50 · 800 | 200 · 900 | Fond pâle dans sept systèmes sur dix ; texte 7 à 9 crans plus loin que le fond |
| Badge plein | `solid/default`, `solid/foreground` | 700, texte des boutons | 700 | Pas moyen à fort, texte blanc ou encre sur jaune |
| Bouton teinté | `surface/default`, `hover`, `pressed`, texte constant | 50, 100, 200 | 200, 300, 400 | Un pas par état (Radix `a3`, `a4`, `a5`) ; texte constant |
| Bouton plein | `solid/default`, `hover`, `pressed` | 700, 800, 900 | Texte noir : 700, 800, 900, plus clair ; texte blanc : 700, 600, 500, plus sombre | Survol plus sombre en clair ; en sombre, plus clair chez Radix, Atlassian, Fluent et Primer |

UCM met 7 ou 8 crans entre le fond et le texte (50 et 800 ; 200 et 900 en
Dark), dans la plage relevée.

Avec un texte des boutons blanc en Dark, le réglage du mainteneur, le bouton
plein d'UCM fonce au survol, quand les quatre systèmes cités l'éclaircissent :
le plein éclairci perdrait le contraste du texte blanc. Avec un texte noir,
UCM l'éclaircit comme eux. Ce choix suit le sens du thème et ne change pas.

Un écart reste : le contour discret. Atlassian, Fluent, Tremor et Untitled UI
bordent le badge discret d'un trait plus clair que son texte (Untitled UI :
fond 50, contour 200, texte 700). Le contour d'UCM, `surface/border`, vaut le
texte : il convient à un contour franc. Un badge bordé discrètement prend
`page/divider` (cran 300) ; aucune variable n'est ajoutée.

Les badges d'Atlassian et de Polaris prennent aussi un fond plus marqué que
les alertes (1,34 à 1,37 contre 1,14 à 1,17). Dans UCM, un badge plus marqué
emploie `surface/hover` (100 en Light) au repos. Ces deux choix relèvent des composants.

## 4. Ce que la solution touche

| Proposition | Fichiers |
|---|---|
| S1 | `packages/couleur/src/rampe.ts` (`cranVise`), `recette.ts` (bornes par profil et par thème, format 11), `palette.ts`, `limites.ts` ; une recette au format 10 garde la part constante |
| S2, courbe | `packages/couleur/src/nuances.ts` : clarté du cran 50 de la courbe Dark par défaut ; le fond de page Dark par défaut de la recette |
| S2, table | `TABLE_DES_DOSSIERS` du kit : une table par thème en plus du sens ; crans requis ; `garanties.ts` et tests ; `promesses.ts` |
| S3 | Les alias `theme` de l'export suivent la table ; `color-utilities` et `elevation` ne changent pas ; la vue illustrée et l'architecture de référence |

## 5. Ce qui reste à juger à l'œil

Dans la [maquette de qualité](./Maquettes/MAQUETTE-QUALITE-EN-INTERFACE.html),
section « La solution proposée », et dans la
[maquette des rôles](./Maquettes/MAQUETTE-ROLES-ET-CRANS.html), section
« Le modèle des niveaux » : le fond Light 50, la page Dark abaissée, le fond
Dark 200 sur la carte.

## 6. Limites

- Le jugement visuel du modèle n'est pas encore fait.
- Polaris sombre est expérimental et partiel ; Material 3 ne publie qu'un rôle
  d'erreur ; Carbon ne teinte pas ses notifications en Dark.
- La marge du texte 900 sur l'appui 400 tient à 4,72:1 sur la recette du
  mainteneur ; une référence jaune très claire, hors du balayage, pourrait la
  réduire.
- Une recette existante garde sa courbe : son cran 50 Dark ne descend qu'après
  un changement de courbe accepté par le designer.

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

**Retenue au banc visuel.** Le mainteneur a préféré l'enveloppe, pour sa
cohérence, à la retenue par teinte et au moteur actuel, avec deux réglages : la
borne vers le blanc s'élargit autour du jaune (+100 % en Soft, +50 % en Vivid),
et les fonds Dark de Vivid sont bornés à `b = 0,30`
([robustesse](./ROBUSTESSE-DES-RAMPES.md), section 10). Auparavant rouverte : l'enveloppe corrige les verts clairs, mais sa borne ne dépend
que de la clarté : elle ternit aussi les jaunes et les ambres clairs, que
Tailwind et Radix gardent près du plafond. Le dossier
[Robustesse des rampes](./ROBUSTESSE-DES-RAMPES.md) la compare, sur toutes les
familles de teinte, à une retenue par teinte calée sur le marché, et corrige le
préréglage de teinte. Ce qui suit décrit l'enveloppe telle qu'elle a été
mesurée.

`C = min(part × plafond(L, H), p₀ × min(a × (1 − L), b × L))`, avec des bornes
propres à chaque thème :

| Profil | p₀ | Light : a, b | Dark : a, b |
|---|---|---|---|
| Soft | 0,85 | 0,6 · 0,38 | 1,1 · 0,38 |
| Vivid, intensité unique | 0,95 | 1,1 · 0,48 | 1,1 · 0,48 |

Le Light ne change pas : ses notes à l'aveugle tiennent (cohérence 5 en Soft,
4 en Vivid). En Dark, la chroma du texte 900 de Soft passe de 0,036 à 0,127
aujourd'hui (0,069 à 0,077 avec une borne unique) à 0,069 à 0,141. Les fonds sombres gardent la réduction de l'intensité des fonds du
thème Dark.

### S2. Le modèle des niveaux

Un composant teinté se pose sur une carte, et la carte sur la page. Chaque
niveau se tient un cran plus loin du fond que celui qui le porte :

| Niveau | Light | Dark |
|---|---|---|
| Page | neutre 50 | neutre 50, abaissé à L 0,145 |
| Carte (`raised`) | blanc, hors rampe | neutre 100 |
| Fond teinté au repos, survol, appui | 100, 200, 300 (retenu au banc ; 50, 100, 200 auparavant) | 300, 400, 500 (retenu au banc ; 200, 300, 400 auparavant) |
| Texte et contour du fond teinté | inchangés : 800 en sens normal, 900 en sens inversé | 900 dans les deux sens, ou 950 (voir plus bas) |
| Focus | inchangé : 600 en sens normal, 700 en sens inversé | inchangé : 600 en sens normal, 700 en sens inversé |
| Plein, texte et contour de page | inchangés | inchangés |

La règle est la même dans les deux thèmes : le fond teinté se tient à une
distance fixe de sa carte. Proposée à un cran (Light 50 sur la carte blanche,
Dark 200 sur la carte au neutre 100), elle a été retenue à deux crans par le
banc visuel, le mainteneur préférant un fond plus marqué : Light 100, Dark 300.
Le survol et l'appui suivent d'un cran chacun. Les mesures ci-dessous portent
sur la proposition à un cran ; celles du cran retenu sont dans le dossier
[Robustesse des rampes](./ROBUSTESSE-DES-RAMPES.md) (sections 3 et 5).

La page Dark gagne la séparation qui lui manque sans déplacer la carte. Son
écart avec la carte, 1,16, entre dans la plage relevée (1,07 à 1,32) ; une
ombre ou un contour de carte la renforce sans toucher aux contrastes, et reste
à juger à l'œil. Le
cran 50 du Dark ne sert aucun rôle de dossier ; sa clarté descend de 0,180 à
0,145, celle de `#0A0A0A` chez shadcn/ui. La page passe de 1,10 à 1,16 contre
la carte, et toutes les palettes reçoivent ce cran 50 plus profond.

| Mesure | Aujourd'hui | Modèle |
|---|---|---|
| Fond teinté contre la carte, Light | 1,11 à 1,17 | 1,06 à 1,08 |
| Page contre carte, Dark | 1,10 | 1,16 |
| Fond teinté contre la carte, Dark | 1,00 à 1,02 | 1,13 à 1,16 |
| Échecs des garanties, balayage de 72 teintes | 144 ; 164 avec l'enveloppe | 144 |

Le modèle n'ajoute aucun échec. Les 144 existent déjà avec le moteur actuel :
G1 en Dark inversé, le texte blanc sur le plein 700, où une référence de clarté 0,62 est ancrée et garde ses octets (72 teintes, deux profils), le cas que l'architecture
prévoit. Avec l'enveloppe, la table actuelle en ajouterait 20 : le focus Light
contre le fond 100 de cinq références vert-jaune. Le fond 50 les retire.

**Le texte des fonds en Dark : 900 ou 950.** Le texte 900 garde la couleur
(chroma jusqu'à 0,14 en Soft), comme Radix, Primer et Fluent. Sa marge est
mince sur les teintes chaudes : aux valeurs par défaut, Orange Vivid tient
4,72:1 sur l'appui 400 ; avec le Color shift « nuances sombres » de la recette
du mainteneur (+0,045 de luminosité), il tombe à 4,12:1, sous le seuil, dès
+0,02 environ. Le texte 950 tient dans ce cas (6,41:1) et sur tout le
balayage, mais il pâlit (chroma 0,03 à 0,07) : c'est le choix du Simple Design
System de Figma, d'Atlassian et de Material 3, un texte très clair sur un fond
profond.

| Texte des fonds en Dark | Couleur | Marge, Orange Vivid sur l'appui 400 | Conséquence |
|---|---|---|---|
| 900 | Colorée | 4,72:1 par défaut ; 4,12:1 avec le Color shift du mainteneur | Le Color shift « nuances sombres » des teintes chaudes se borne à +0,015 environ |
| 950 | Pâle | 7,70:1 par défaut ; 6,41:1 avec le Color shift du mainteneur | Aucune borne nouvelle |

Décidé au banc visuel : 950, qu'impose le fond Dark 300 retenu. Avant ce
choix, la recommandation était 900, parce que le mainteneur juge les textes sombres trop ternes
et que les systèmes relevés gardent un texte coloré (L 0,66 à 0,89). 950 si la
liberté du Color shift sombre compte davantage. La maquette de qualité compare
les deux.

Avec 900, la recette du mainteneur montre un échec dès l'ouverture : G3,
Orange Vivid, 4,12:1. La plage sûre d'un réglage ne borne que les garanties
tenues au départ (`limites.ts`) ; le designer ramène donc lui-même le Color
shift « nuances sombres » d'Orange sous +0,015. Avec 950, la recette ne
change pas. Le choix touche aussi l'alerte des palettes trop proches : le texte
900 rapproche les bleus et les violets en Dark
([dossier Comparer](./DOSSIER-COMPARER.md), section 8).

Avec le fond Light 100 retenu, un composant teinté se détache aussi de la
page (cran 50). Avec un fond 50, il aurait eu la clarté de la page.

Pistes mesurées et écartées, avec l'enveloppe par thème, sur le balayage de
72 teintes ([GARANTIES-BALAYAGE.json](./Mesures/GARANTIES-BALAYAGE.json)) :

| Piste | Échecs en plus du modèle | Raison |
|---|---|---|
| Fond Light 100, la table actuelle | 20 | Le focus manque 3:1 contre le fond 100 ; le fond est plus foncé que le rendu voulu par le mainteneur et que Figma, Tailwind et Untitled UI |
| Texte Dark 800, plus coloré | 1 282 | Échoue sur le survol 300 et l'appui 400 |
| Appui Dark 300, texte 800 | 320 | Le survol et l'appui se confondent, et le texte échoue encore en sens inversé |
| Carte Dark au neutre 200, fonds 300 | 334 | La carte plus claire fait échouer 218 pleins et 116 textes de page |
| Fonds translucides, focus Dark 800 | 16 | Inutiles : les composants se posent sur une carte |
| Page Dark noire, du dossier d'élévation | non mesurée sur le balayage | Un noir pur ; aucun système relevé ne l'emploie sur le web |

### S3. Le mapping dans l'architecture des tokens

Le chemin d'une couleur ne change pas : un composant cite `theme`, qui cite
`color-utilities` ou `color-brands`, qui citent `primitives`. Ce qui change
est le cran visé, et la clarté d'un cran.

```text
components.badge.success.background
  → theme.success.soft.surface.default
      light → color-utilities.success.soft.light.100    (inchangé)
      dark  → color-utilities.success.soft.dark.300     (aujourd'hui .100)
  → primitives.colors.grass.soft.light.100 | .dark.300

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
| `theme` | La table du kit, `TABLE_DES_DOSSIERS` | La table distingue le thème en plus du sens : surfaces 100, 200, 300 en Light, comme aujourd'hui ; 300, 400, 500 et texte 950 en Dark ; focus inchangé |
| Recette | UCM Palettes | Le réglage « Fond de la page » Dark vaut par défaut `#0A0A0A`, le cran 50 de la nouvelle courbe sans teinte ; les garanties se mesurent contre lui |

**La page a une seule couleur.** Dans les tokens, `elevation/page` vise le
neutre 50. Dans le plugin, les garanties se mesurent contre le réglage « Fond
de la page » ([architecture](../../Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md),
section 1). Les deux doivent rester la même couleur : sinon les garanties
mesurent une page que les tokens n'affichent pas. Par défaut, le réglage vaut
le cran 50 de la courbe sans teinte : `#F7F7F7` en Light, inchangé, et
`#0A0A0A` en Dark au lieu de `#121212`. Avec un neutre teinté, le designer le
règle sur son neutre 50, comme aujourd'hui (Titanium : `#F6F7F8` et
`#0A0A0B`). La page noire du dossier d'élévation est écartée.

Avec la table retenue, les crans requis passent à 100, 200, 300, 400, 500,
600, 700, 800, 900 et 950 : l'appui Dark (500) et le texte Dark (950) entrent
dans la table. Le cran 50 du neutre porte la page.

Le neutre suit la même table que les autres palettes : sa surface au repos
vaut 100 en Light et 300 en Dark, sans règle propre au neutre.

La table vaut pour les deux sens de chaque thème. En Light inversé (texte des
boutons noir), les fonds sont aussi 50, 100 et 200, le texte reste 900 et le
focus 700.

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
| S1 | `packages/couleur/src/rampe.ts` (`cranVise`), `recette.ts` (paramètres de la règle par profil et par thème, format 11), `palette.ts`, `limites.ts` ; une recette au format 10 garde la part constante |
| Q10, dérive de teinte | `packages/couleur/src/tailwind.ts` (`deriveTailwind`, `prereglageTailwind`) ; le relevé `derives` de la recette porte la teinte et la clarté de chaque cran |
| S2, courbe | `packages/couleur/src/nuances.ts` : clarté du cran 50 de la courbe Dark par défaut ; le fond de page Dark par défaut de la recette |
| S2, table | `packages/kit/src/emplois/dossiers.ts` : une table par thème et par sens, que `cranDeLaVariable`, `cransRequis`, `variablePresente` et `variablesDuCran` lisent avec le thème ; `garanties.ts` et ses tests. Lecteurs à suivre : `packages/couleur/src/promesses.ts`, `garantie.ts`, `alertes.ts`, `recette.ts` (crans requis) ; `packages/plugin-palettes/src/presentation.ts`, `planche/modele.ts`, `ui/nuancier.ts`, `ui/garanties.ts`, `ui/apercuCompact.ts`, `ui/interfaceDeTest.ts`, textes `i18n` ; `packages/plugin-explorateur/src/integrations/palettes.ts` et `profilUcm.ts` |
| Q8, `ring` à la racine de la palette | `VARIABLES_DE_PALETTE`, `ETAT_DU_FOND`, `SUPPORT_DES_VARIABLES`, G7 ; liaisons Figma et contrats qui lisent `page/focus` |
| G7 contre la page et la carte | `packages/kit/src/emplois/garanties.ts` : les fonds de G7 deviennent la page et la carte ; `packages/couleur/src/promesses.ts` et `garantie.ts` reçoivent la couleur de la carte (blanche en Light, neutre 100 en Dark), absente aujourd'hui de la recette ; textes de Vérification |
| S3 | Les alias `theme` de l'export suivent la table ; `color-utilities` et `elevation` ne changent pas. L'architecture de référence et la vue illustrée prennent : la table par thème, les crans requis (400, 500 et 950), le cran 50 Dark à L 0,145 et le fond de page `#0A0A0A`, `ring` à la racine de la palette, les mesures contre la carte. Le [dossier d'élévation](../../Archi%20Tokens%20Multi-marques/Elevation%20et%20surfaces/README.md) est remplacé sur la page noire et le texte 950 |

## 5. Ce qui reste à juger à l'œil

Dans la [maquette de qualité](./Maquettes/MAQUETTE-QUALITE-EN-INTERFACE.html),
section « La solution proposée », et dans la
[maquette des rôles](./Maquettes/MAQUETTE-ROLES-ET-CRANS.html), section
« Le modèle des niveaux » : le fond Light 50, la page Dark abaissée, le fond
Dark 200 sur la carte.

## 6. Limites

- Le jugement visuel du modèle n'est pas encore fait. Les notes à l'aveugle
  du Dark ont été données avec une borne unique (a = 0,6) : la borne Dark de
  S1 est mesurée, pas encore notée.
- Polaris sombre est expérimental et partiel ; Material 3 ne publie qu'un rôle
  d'erreur ; Carbon ne teinte pas ses notifications en Dark.
- Avec un texte Dark 900, la recette actuelle du mainteneur dépasse la marge
  sur Orange Vivid (4,12:1) : son Color shift « nuances sombres » est à
  ramener sous +0,015, ou le texte à passer à 950.
- Une recette existante garde sa courbe : son cran 50 Dark ne descend qu'après
  un changement de courbe accepté par le designer.
- `disabled/background` garde le neutre 200. En Dark, il prend la couleur d'une
  puce grise au repos ; le texte inactif (500) les distingue. Aujourd'hui, il
  égale déjà le survol gris.

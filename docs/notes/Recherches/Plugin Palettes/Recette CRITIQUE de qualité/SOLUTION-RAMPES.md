# Rampes de couleur : la solution proposée

**Statut : solution à valider.** Ce document reprend tout le sujet des rampes
après les notes à l'aveugle du mainteneur et un relevé de neuf systèmes. Il
remplace les recommandations Q1, Q2, Q5 et Q6 du
[dossier de qualité](./DOSSIER-QUALITE-DES-PALETTES.md) ; les mesures et les
pistes écartées restent dans ce dossier.

Sources : [Collecte/Surfaces](./Collecte/Surfaces/README.md) (Primer,
Atlassian, Carbon, Polaris, Material 3, Fluent 2, shadcn/ui, Radix, versions
figées), [RELEVE-STATUTS-ET-FOCUS.md](./Collecte/RELEVE-STATUTS-ET-FOCUS.md),
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
| Carbon, notification | aplat pâle ; le ton passe par un trait | gris neutre `layer-01`, sans teinte | Opaque |

- **Light** : un fond d'alerte vaut 1,07 à 1,17 contre le blanc. Un badge peut
  monter à 1,34 à 1,37 (Atlassian, Polaris).
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
| Fond teinté contre la carte, Light | 100 : 1,11 à 1,17 | 1,07 à 1,17 | Aucun |
| Fond teinté contre la carte, Dark | 100 : 1,00 à 1,02 | 1,08 à 1,31 | Le fond disparaît |
| Texte du fond teinté, Dark (Soft, enveloppe) | 900 : L 0,85, C 0,07 | L 0,66 à 0,89, C 0,13 à 0,21 | Texte terne |
| Carte contre page, Dark | 1,10 | 1,07 à 1,32 | Dans la plage |

Deux causes, mesurées :

1. **En Dark, la carte est le cran 100 du neutre, et le fond teinté un cran
   100.** Toutes les rampes partagent la clarté d'un cran : le fond a la
   clarté de la carte.
2. **La borne vers le blanc de l'enveloppe vaut pour les deux thèmes.** Elle
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
thème Dark. `verifier-garanties.ts` : 164 échecs, ceux qui existent déjà avec
le moteur actuel (G1 en Dark inversé, G7 de trois références vert-jaune).

### S2. La table Light ne change pas

Fonds 100, 200, 300 ; texte et contour 800 ; plein 700 ; focus 600. Le fond
100 se tient dans la plage des autres systèmes. Le cran 50, plus pâle que tous
(1,03 à 1,08), reste écarté.

### S3. La table Dark monte d'un cran

| Variable | Dark aujourd'hui | Dark proposé |
|---|---|---|
| `surface/default`, `hover`, `pressed` | 100, 200, 300 | 200, 300, 400 |
| `surface/foreground`, `surface/border` | 800 (sens normal), 900 (inversé) | 900 dans les deux sens |
| `page/focus` | 600 (normal), 700 (inversé) | 800 dans les deux sens |
| `solid/*`, `page/foreground`, `page/border` | inchangés | inchangés |

Le fond passe de 1,00 à 1,15 contre la carte, au milieu de la plage relevée.
Aucun échec ajouté sur le balayage ; sur les palettes du mainteneur, le pire
couple est le texte 900 d'Orange Vivid sur l'appui 400, à 4,72:1.

Pistes mesurées et écartées :

| Piste | Échecs | Raison |
|---|---|---|
| Texte 950, proposé par le dossier d'élévation | 164 | Tient, mais le texte devient presque blanc (C 0,03 à 0,07) |
| Texte 800, plus coloré | 472 à 1 440 | Échoue sur le survol 300 et l'appui 400 |
| Carte au neutre 200 et fonds 300 | 444 | La carte plus claire fait échouer 218 pleins et 62 textes |

### S4. Les supports ne changent pas

La carte blanche en Light et la carte au neutre 100 en Dark suivent la
majorité des systèmes. La séparation de la carte et de la page en Dark (1,10)
se règle hors des palettes, dans l'élévation du thème : un contour au cran 300
du neutre, celui de `page/divider`, la rend visible sans toucher aux
contrastes. Le banc à l'aveugle la montre.

### S5. Des fonds opaques

Les composants teintés se posent toujours sur une carte : un fond opaque
choisi contre la carte suffit, comme chez Atlassian, Material 3, Fluent et
Polaris. Palettes n'écrit que des crans ; la piste translucide est abandonnée.

### S6. Le badge, un choix de composant

Les badges d'Atlassian et de Polaris prennent un fond plus marqué que les
alertes (1,34 à 1,37 contre 1,14 à 1,17). Dans UCM, un badge peut employer
`surface/hover` au repos. Les palettes n'en changent pas.

## 4. Ce que la solution touche

| Proposition | Fichiers |
|---|---|
| S1 | `packages/couleur/src/rampe.ts` (`cranVise`), `recette.ts` (bornes par profil et par thème, format 11), `palette.ts`, `limites.ts` ; une recette au format 10 garde la part constante |
| S3 | `TABLE_DES_DOSSIERS` du kit : une table par thème en plus du sens ; `garanties.ts`, crans requis et tests ; les alias `theme` de l'export |
| S4 | Élévation du thème Dark, dans l'architecture de référence ; aucun fichier de Palettes |

## 5. Ce qui reste à juger à l'œil

Dans la [maquette de qualité](./Maquettes/MAQUETTE-QUALITE-EN-INTERFACE.html),
section « À l'aveugle », thème Dark, support Carte : noter « Fonds 200, texte
900 » et « Fonds 200, texte 900, carte bordée ». Le candidat Enveloppe y porte
déjà les bornes par thème de S1.

## 6. Limites

- Le jugement visuel du Dark proposé n'est pas encore fait.
- Polaris sombre est expérimental et partiel ; Material 3 ne publie qu'un rôle
  d'erreur ; Carbon ne teinte pas ses notifications en Dark.
- La marge du texte 900 sur l'appui 400 tient à 4,72:1 sur la recette du
  mainteneur ; une référence jaune très claire, hors du balayage, pourrait la
  réduire.

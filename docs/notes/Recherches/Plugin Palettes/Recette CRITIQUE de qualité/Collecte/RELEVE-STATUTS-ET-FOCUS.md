# Statuts discrets et focus dans six systèmes

Relevé lu dans le code et les fichiers de tokens publiés, aux versions citées.
Les valeurs « calculées » sont des compositions faites pour ce relevé, pas des
valeurs publiées. Ce relevé décrit des choix ; il ne recommande rien à UCM.

## Fonds, textes et contours des statuts discrets

### Radix Themes 3.3.0, @radix-ui/colors 3.0.0

Badge `soft` et Callout `soft` : fond `accent-a3`, texte `accent-a11`, sans
contour. Variante `surface` : fond `accent-surface` ou `accent-a2`, contour
intérieur 1 px `accent-a6`. Sources :
[badge.css](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/badge.css),
[callout.css](https://raw.githubusercontent.com/radix-ui/themes/main/packages/radix-ui-themes/src/components/callout.css).

| Vert | a3, fond | a11, texte | a6, contour |
|---|---|---|---|
| Clair | `#00a43319` (10 %) | `#00713fde` | `#00963c52` |
| Sombre | `#22ff991e` (11,8 %) | `#46fea5d4` | `#44ffaa4b` |

En sombre, fond a3 et texte a11 : rouge `#ff173f2d` / `#ff9592`, ambre
`#fa820022` / `#ffca16`, bleu `#0077ff3a` / `#70b8ff`. Page `gray-1`
`#111111`, panneau `gray-2` `#191919`. Calculé : `green-a3` redonne
`#132d21` sur la page et environ `#1a3428` sur le panneau.

### GitHub Primer, @primer/primitives 11.10.0

Flash : fond `bgColor-X-muted`, contour `borderColor-X-muted`, texte neutre,
icône seule colorée. Label : contour sans fond, texte coloré.
Sources : [light.css](https://unpkg.com/@primer/primitives/dist/css/functional/themes/light.css),
[dark.css](https://unpkg.com/@primer/primitives/dist/css/functional/themes/dark.css),
[Flash.module.css](https://raw.githubusercontent.com/primer/react/main/packages/react/src/Flash/Flash.module.css).

| Ton | Clair : fond / texte / contour | Sombre : fond / texte / contour |
|---|---|---|
| Succès | `#dafbe1` / `#1a7f37` / `#4ac26b66` | `#2ea04326` / `#3fb950` / `#2ea04366` |
| Attention | `#fff8c5` / `#9a6700` / `#d4a72c66` | `#bb800926` / `#d29922` / `#bb800966` |
| Danger | `#ffebe9` / `#d1242f` / `#ff818266` | `#f851491a` / `#f85149` / `#f8514966` |
| Accent | `#ddf4ff` / `#0969da` / `#54aeff66` | `#388bfd1a` / `#4493f8` / `#388bfd66` |

Surfaces sombres : `#0d1117`, `muted` `#151b23`.

### Atlassian, @atlaskit/tokens 20.4.1

Lozenge discret : fond `background.X.subtler`, texte `text.X.bolder`,
contour `border.X.subtle`. En sombre, les couples sont l'échange exact des
couples clairs. Section message : fond `background.X`, texte neutre, icône
colorée. Tout est opaque. Sources :
[atlassian-light.js](https://unpkg.com/@atlaskit/tokens/dist/cjs/artifacts/themes/atlassian-light.js),
[atlassian-dark.js](https://unpkg.com/@atlaskit/tokens/dist/cjs/artifacts/themes/atlassian-dark.js).

| Ton | Lozenge clair : fond / texte | Section message : fond clair / sombre |
|---|---|---|
| Succès | `#D3F1A7` / `#37471F` | `#EFFFD6` / `#28311B` |
| Avertissement | `#FCE4A6` / `#693200` | `#FFF5DB` / `#3A2C1F` |
| Danger | `#FFD5D2` / `#5D1F1A` | `#FFECEB` / `#42221F` |
| Info | `#CFE1FD` / `#123263` | `#E9F2FE` / `#1C2B42` |

Surfaces sombres : `surface` `#1F1F21`, `raised` `#242528`.

### Tremor (classes Tailwind, licence Apache 2.0)

Badge, contour intérieur 1 px. Clair : `bg-emerald-50 text-emerald-900
ring-emerald-600/30`. Sombre : `bg-emerald-400/10 text-emerald-400
ring-emerald-400/20`. Source : [tremor.so, Badge](https://www.tremor.so/docs/ui/badge).
Les classes de Tailwind Plus et de Catalyst ne sont pas publiques.

### Untitled UI, fichier Figma Community

Badges : fond 50, texte 700, contour 200 du badge intérieur ; voir
[l'analyse](../ANALYSE-UNTITLED-UI.md). Les rampes sont celles de Tailwind 3.

## Indicateur de focus

| Système | Clair / sombre | Géométrie | Portée | Token |
|---|---|---|---|---|
| Figma SDS | `#006AFF` / identique | 2 px, écart 2 px | global | `--global-focus-ring-color` |
| Untitled UI React | brand-500 `#9E77ED` / brand-400 | `outline-2 outline-offset-2` | par état (`outline-error`) | `--color-focus-ring` |
| Untitled UI, kit Figma | halo `#F4EBFF` (brand-100), 4 px, plus l'ombre du bouton | étendue 4 px, sans écart | par état | style d'effet `Focus ring/4px primary-100` |
| shadcn/ui | gris `oklch(0.708 0 0)` / `oklch(0.556 0 0)` | halo 3 px à 50 % et contour plein | par variante (`destructive`) | `--ring` |
| Radix Themes | `accent-8` (bleu `#5eb1ef` / `#2870bd`) | 2 px, écart 2 px ou −1 px | suit l'accent | `--focus-8` |
| Primer | `#0969da` / `#1f6feb` | 2 px, retrait 2 px | global | `focus.outline-color` |
| Atlassian | `#4688EC` / `#8FB8F6` | 2 px | global | `color.border.focused` |
| Carbon | `#0f62fe` / `#ffffff` | 2 px, retrait ; second trait `$focus-inset` | global | `$focus`, `$focus-inset` |
| Spectrum 2 | `#4B75FF` / `#4069FD` | 2 px, écart 2 px | global | `focus-indicator-color` |
| Material 3 | `#625b71` / `#ccc2dc` | 3 px, écart 2 px | global | `md.comp.focus-ring.*` |
| GOV.UK | jaune `#ffdd00` et noir `#0b0c0c` | 3 px, deux couleurs | global | `focus` |

Le halo du kit Figma d'Untitled UI a été lu dans le fichier par la
[préparation](../RELEVE-UNTITLED-FOCUS.json). Le code React du même éditeur
emploie un trait brand-500. Ce relevé ne lisait pas les systèmes qui collent
un halo pâle : Bootstrap, Flowbite, shadcn/ui et Ant Design le font, et Radix
colle un trait pâle sur quatre variantes de bouton
([Focus/](./Focus/README.md)).

WCAG 2.2 : [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
(AA) demande 3:1 entre l'indicateur et ses couleurs adjacentes et cite la
technique C40, un indicateur à deux couleurs.
[2.4.13](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
est de niveau AAA.

## Ce qui reste inconnu

- Le code de Tailwind Plus et de Catalyst.
- Le thème sombre de Polaris, marqué expérimental.
- La règle d'un statut posé sur une carte sombre : aucune documentation lue
  ne la prescrit. Seuls l'alpha, le contour et l'aplat propre au ton sont
  observables.

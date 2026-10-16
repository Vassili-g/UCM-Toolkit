# Relevé du Simple Design System de Figma

Cette collecte fige le dépôt [figma/sds](https://github.com/figma/sds) à la
révision `05525f75192a3aa5d5690c5e41277ebd19d2efe1`. `fetch.mjs` télécharge
`src/theme.css`, les feuilles de Notification et de Tag, et la licence ;
`sources.json` donne l'URL et le SHA-256 de chaque fichier. Elle complète
[`../Surfaces/`](../Surfaces/README.md) et ne recommande rien à UCM.

## Ce que les feuilles déclarent

- La notification `alert` prend `background-danger-tertiary`, son texte
  `text-danger-on-danger-tertiary`, son contour `border-danger-default`
  (`notification.css`). Le tag discret prend les fonds `secondary` et
  `tertiary` de son ton (`tag.css`).
- En clair, `background-<ton>-tertiary` vise le cran 100 de l'échelle du ton,
  le texte le cran 700 à 900. En sombre (`prefers-color-scheme: dark`), le fond
  vise le cran 900 et le texte le cran 100 (`theme.css`).
- Le fond par défaut, sur lequel se posent les composants, vaut `white-1000`
  en clair et `gray-900` (`#1e1e1e`) en sombre.

## Valeurs et contrastes

Contrastes WCAG 2 calculés sur les hexa lus.

| Ton | Clair : fond / texte | Fond contre blanc | Sombre : fond | Fond contre `#1e1e1e` |
|---|---|---|---|---|
| Danger | `#fee9e7` / `#900b09` | 1,17 | `#4d0b0a` | 1,09 |
| Succès | `#ebffee` / `#02542d` | 1,05 | `#024023` | 1,40 |
| Avertissement | `#fffbeb` / `#522504` | 1,04 | `#522504` | 1,29 |

Le cran 100 de cette échelle est très clair et sa clarté varie avec la teinte :
le fond d'un succès ou d'un avertissement se tient à 1,04 ou 1,05 du blanc.

## Ce qui n'est pas relevé

Le fichier Figma Community du même système n'est pas lu ; seules les feuilles
du dépôt font foi. Le badge, la bannière et les autres tons ne sont pas lus.

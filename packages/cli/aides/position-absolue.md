---
aide: position-absolue
quand: position-absolue
---

## Sens

Un slot `position: "absolute"` sort du flux. `constraints` dit à quels bords il
s'accroche, `inset` à quelle distance, en pixels. Aucune distance absente ne se
calcule. Tous les enfants d'un conteneur sans auto layout portent cette
position : le `layout` de ce conteneur ne place alors aucun d'eux.

## Écriture par défaut

`position: absolute` sur le slot et `position: relative` sur son conteneur.
Chaque clé d'`inset` devient la propriété du même nom. Une accroche `center`
centre le slot sur son axe : `inset-inline: 0` et `margin-inline: auto` sur
l'axe horizontal, `inset-block: 0` et `margin-block: auto` sur l'axe vertical,
avec une taille autre que `auto`. `scale` publie les deux côtés de cet axe.

## Preuve

Relecture de chaque slot hors du flux contre la vue exacte.

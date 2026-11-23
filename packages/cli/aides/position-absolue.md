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

`position: absolute` sur le slot et `position: relative` sur son conteneur. Chaque clé d'`inset` devient la propriété du même nom, sauf sur l'axe d'une accroche `center` ou `scale`. Une accroche `center` centre le slot et garde son décalage : sur l'axe horizontal, `inset-inline: 0`, `margin-inline: auto` et un `translate` horizontal de la moitié de `left` moins `right` ; sur l'axe vertical, `inset-block: 0`, `margin-block: auto` et un `translate` vertical de la moitié de `top` moins `bottom`, avec une taille autre que `auto`. Un slot centré à 10 px du bord gauche et à 30 px du bord droit se décale de 10 px vers la gauche. Une accroche `scale` s'écrit comme `stretch`, ses deux côtés tels quels. Le contrat ne publie pas la proportion que Figma garde au redimensionnement, et ce manque se rapporte au développeur.

## Preuve

Relecture de chaque slot hors du flux contre la vue exacte.

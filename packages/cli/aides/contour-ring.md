---
aide: contour-ring
quand: contour-ring
---

## Sens

Un `ring` se dessine hors du flux et ne déplace aucun voisin. Sa nature vient de `rendering.roles.ring` ; sa couleur et sa largeur viennent de `variants[].strokes[clé]`, et ses cibles de `paintPlacements.strokes[clé]` de la vue exacte ; son trait est plein ; `align` et
`width` disent de quel côté de la boîte et sur quelle épaisseur. Une largeur
`null` ne se rend pas. Sur une cible qui porte un autre contour, les deux se
composent sans que l'un efface l'autre. Pour un état de
focus, il remplace l'indicateur natif et n'apparaît qu'au focus clavier.

## Écriture par défaut

`outline: <width> solid <color>` ; `outline-offset: 0` pour `outside`,
`outline-offset: calc(<width> * -1)` pour `inside`,
`outline-offset: calc(<width> / -2)` pour `center`. Une largeur
qui diffère par côté se rend par une ombre décalée par côté, exacte pour
`inside` seulement ; signaler au développeur un autre alignement. Sur le même
calque qu'un `border`, le `border` garde `box-shadow` et le `ring` garde
`outline`.

## Preuve

Relecture contre la vue exacte. La comparaison visuelle au focus clavier revient au développeur ou au designer, après l'écriture du composant.

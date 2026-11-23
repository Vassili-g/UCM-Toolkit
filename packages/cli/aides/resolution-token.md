---
aide: resolution-token
quand: reference-token
---

## Sens

Une référence `{chemin.du.token}` devient une valeur par le moyen que le
repository fournit, et par aucun autre. Aucune couleur, dimension, famille ou
graisse tokenisée ne s'écrit en dur. Seules les valeurs que le contrat publie
en clair s'écrivent brutes. Les références d'un
contrat se relèvent partout sauf dans `samples` et `meta`, dont une chaîne en
forme de référence est un texte.

Quand ce moyen est une propriété personnalisée CSS, son nom est celui que
`tokenCssVariable` donne, et la feuille d'`ucm tokens css` le déclare. Une
projection recopiée tient la même règle : l'accent tombe et la lettre reste.
`café.fond` donne `--cafe-fond` ; une copie qui remplace tout caractère non
ASCII vise `--caf-fond`, une variable absente, sans erreur.

## Écriture par défaut

Écrire chaque référence comme le contrat, `"{chemin}"`, puis lancer
`ucm tokens references <fichiers>`, qui la remplace par `"var(--nom)"`. Le
code ne contient aucune fonction qui traduit un chemin en nom.

## Preuve

`ucm check`, section tokens. Relecture : aucune valeur littérale à la place
d'une référence, et aucune projection de nom qui s'écarte de
`tokenCssVariable`. Quand le repository suit l'écriture par défaut,
`ucm tokens references --verifier <fichiers>` sort sans erreur.

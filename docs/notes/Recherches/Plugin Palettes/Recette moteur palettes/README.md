# Recette du moteur de Palettes

Ce dossier reprend les défauts du moteur trouvés au test dans Figma, après
l'implémentation de la [recette critique de qualité](../Recette%20CRITIQUE%20de%20qualit%C3%A9/README.md).
Ses mesures se lancent depuis `Mesures/` par `npx tsx`, sur le moteur de
`packages/couleur`. Aucune valeur n'est décidée ici sans le mainteneur.

## Soft et Vivid trop proches

Constat au test dans Figma, recette par défaut au format 11 :

- 14 des 17 couleurs 500 de Tailwind déclenchent l'alerte « Soft et Vivid se
  confondent » (`profils-confondus`, seuil 0,02 ΔEok sur au moins trois
  nuances).
- La part de Soft vaut 0,85 et celle de Vivid 0,95 : sur la plupart des
  nuances, Soft garde 85 à 90 % de la chroma de Vivid.
- En Dark, Soft dépasse Vivid sur les nuances 300 à 700 du bleu, de
  l'indigo, du violet et du rose, jusqu'à 1,36 fois : la borne sombre de Soft
  (0,38 × 0,85) dépasse celle de Vivid (0,30 × 0,95).
- Une référence moins saturée que la part de Soft rend les deux profils
  identiques, et l'alerte se tait (`aDesProfilsTernes`). Depuis `#C59735`
  tourné en teinte, c'est le cas de 113° à 158°.

La part de Soft était passée de 0,45 à 0,85 parce qu'avec 0,45 ses textes
avaient 0,3 à 0,55 fois la chroma de Tailwind. Le banc visuel a jugé chaque
profil seul, et le décompte des garanties ne lançait pas les alertes du
plugin : l'écart entre Soft et Vivid n'a pas été mesuré.

### Mesure des candidats

`Mesures/mesurer-profils.ts` écrit `Mesures/MESURES-PROFILS.json`. Il juge
huit jeux de profils Soft sur les 17 couleurs 500 de Tailwind, trois tours de
teinte et la recette du mainteneur. Vivid reste celui du format 11.

| Candidat | Soft | Alertes, Tailwind 500 | Palettes ternes | Chroma du texte Soft / Tailwind (médiane) |
|---|---|---|---|---|
| A, actuel | part et p0 0,85, Dark b 0,38 | 14 / 17 | 3 | 0,79 |
| B | Dark b 0,25 | 14 | 3 | 0,79 |
| C | part et p0 0,70, Dark b 0,25 | 11 | 0 | 0,65 |
| D | part et p0 0,60, Dark b 0,25 | 7 | 0 | 0,55 |
| E | part et p0 0,45, Dark b 0,25 | 1 | 0 | 0,42 |
| F | C, et l'alerte ne juge pas les nuances 50 et 950 | 6 | 0 | 0,65 |

- Dark b 0,25 retire presque tous les cas où Soft dépasse Vivid en Dark ; il
  en reste au cran 600 des références très vives.
- La part de Soft décide de l'alerte ; `p0` seul ne la règle pas (candidats
  G et H du JSON).
- Aucun candidat ne garde à la fois des profils distincts et la chroma des
  textes Soft. Une règle qui sépare la part des textes de celle des fonds
  n'est pas mesurée.
- Les garanties G1 à G7 ne changent avec aucun candidat.

## La référence ressort de sa rampe

Constat au test dans Figma : une référence très saturée se détache de ses
voisines, qui ne s'en approchent pas progressivement. La référence garde sa
chroma à son cran ; l'enveloppe borne celle des autres crans.

| Référence | Cran et chroma de la référence (Vivid, Light) | Voisin clair | Voisin sombre |
|---|---|---|---|
| `#0013FF` | 800, 0,309 | 700, 0,228 | 900, 0,154 |
| `#FF0076` | 500, 0,258 | 400, 0,153 | 600, 0,234 |
| `#FFD300` | 200, 0,180 | 100, 0,079 | 300, 0,173 |

Une référence dans l'enveloppe ne se détache pas : `#3B82F6` (600, 0,188)
a pour voisines 0,161 et 0,225. Le banc visuel n'avait que des références de
chroma moyenne.

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

## Une cause commune

Les deux défauts viennent de la règle de chroma (l'enveloppe), appliquée de
la même façon aux fonds clairs, aux textes et aux voisines de la référence :

- une seule part règle à la fois les fonds et les textes de Soft : des fonds
  discrets et des textes lisibles demandent deux parts ;
- l'enveloppe borne les crans voisins de la référence, et pas la référence :
  la rampe ne la rejoint pas.

La borne sombre de Soft (Dark b 0,38) est une erreur de valeur, à corriger
quel que soit le reste : avec 0,25, Soft ne dépasse plus Vivid en Dark, sauf
au cran 600 des références très vives.

## Seconde passe et revue

La seconde passe (`Mesures/mesurer-regles.ts`, `Mesures/MESURES-REGLES.json`)
proposait « Soft = Vivid × 0,65 », Soft prenant l'enveloppe de Vivid, et une
bosse autour de la référence. La [revue de Codex](./REVIEW-CODEX.md) les a
écartées :

- Soft perdait l'uniformité de ses fonds clairs : ×1,24 → ×2,38 au cran 50 sur
  les quatre utilitaires du mainteneur, aux réglages communs ;
- la bosse faisait perdre G7 à des palettes réglées à leurs bornes de
  luminosité, colorait les fonds Dark et creusait le profil non porteur ;
- le contrôle comparait des totaux de promesses, qui cachaient des échecs
  déplacés ; la maquette recalculait l'alerte sans l'exception des profils
  ternes.

Deux constats de la seconde passe restent : Soft garde de 0,47 à 1,36 fois la
chroma de Vivid selon la teinte, la nuance et le thème, parce que chaque profil
a son enveloppe ; et la saillie de la référence a deux causes, la règle de
chroma et le plafond de l'écran, que seule la première laisse corriger.

## Troisième passe

`Mesures/mesurer-troisieme-passe.ts` écrit `Mesures/MESURES-TROISIEME-PASSE.json`
et les données de [la maquette](./Maquettes/MAQUETTE-MOTEUR.html), qui affiche
les verdicts du script sans les recalculer. Sa chaîne reproduit `rampesDe` à
l'octet près, palettes figées comprises ; le script s'arrête sinon. Les
promesses se comparent une à une : palette, thème, sens, profil, garantie et
fond. Jeux : Tailwind 500, trois tours de teinte, cinq références saturées à
une et deux intensités, la recette du mainteneur, les 20 palettes de la galerie
aux défauts du format 11, et le balayage de 72 teintes à deux clartés dans les
quatre combinaisons du texte des boutons.

### Soft plafonné (SP65)

Soft garde son enveloppe, donc ses fonds clairs, la marge des jaunes et ses
bornes. Il ne dépasse plus k = 0,65 fois ce que Vivid aurait à la même nuance,
avec la part relative, le Color shift et l'atténuation Dark de Soft :

- sur les fonds pâles du Light, le plafond s'efface (aucun au-dessus de 0,88 de
  clarté, entier sous 0,78) : l'écran n'y laisse pas d'écart visible, et le
  plafonner y casse l'uniformité (×1,24 → ×1,79 au cran 50) ;
- une référence de part supérieure à 0,78, le milieu entre 0,65 × 0,95 et 0,95,
  est portée par Vivid. Sinon, Soft la porte, et Vivid vaut sa part divisée par
  k, au plus 1. Le plafond suit alors le rapport réel des deux parts ;
- des parts réglées par le designer désactivent le plafond.

| Règle | Alertes actuelle / proposée, Tailwind · tour doux | Soft / Vivid, fond · plein · texte, Light | Dark | Soft dépasse Vivid | Uniformité des fonds Soft, cran 50 | Vivid changé, Tailwind | Promesses du balayage |
|---|---|---|---|---|---|---|---|
| Aujourd'hui | 14/14 · 0/0 | 0,69 · 0,85 · 0,86 | 0,90 · 0,90 · 0,90 | 21 | ×1,24 | 0 | 144 |
| SQ65, porteur du paquet | 7/2 · 0/0 | 0,69 · 0,65 · 0,65 | 0,66 · 0,65 · 0,66 | 12 | ×1,24 | 0 | 144, +0 −0 |
| SP65 | 10/0 · 20/0 | 0,76 · 0,65 · 0,65 | 0,65 · 0,65 · 0,65 | 0 | ×1,24 | 50 / 187 | 144, +12 −12 |
| SP75 | 13/3 · 24/11 | 0,76 · 0,75 · 0,75 | 0,75 · 0,75 · 0,75 | 0 | ×1,24 | 50 / 187 | 144, +2 −2 |

- SQ65 garde Vivid à l'octet près, mais les palettes dont Soft porte la
  référence restent proches : 12 nuances Soft plus vives que Vivid sur
  Tailwind.
- SP65 change Vivid pour les références de part 0,78 à 0,95 : Vivid les porte
  et prend leur saturation exacte. Les promesses manquées suivent la
  référence : 12 passent de Soft à Vivid sur le balayage, et la galerie passe
  de 50 à 46.
- Avec le porteur à k, une référence terne donne Vivid = part / k : l'exception
  des profils ternes de l'alerte tombe. L'alerte actuelle se déclenche alors sur
  10 palettes de Tailwind et 20 teintes douces sur 24 ; l'alerte proposée sur
  aucune. SP65 demande l'alerte proposée.
- La recette du mainteneur ne change avec aucune règle : ses palettes à deux
  intensités ont des parts réglées.
- Trois creux d'au plus 10 % restent à côté d'une référence portée par Soft.

### Bosse gardée, hors fonds

Seule la rampe porteuse se rapproche de la référence (poids gaussien σ 0,10
sur la clarté fabriquée). La bosse se réduit, thème par thème, jusqu'à ne faire
perdre aucune promesse tenue sans elle, et ne touche ni les fonds pâles du
Light (au-dessus de 0,88) ni la zone des fonds Dark (sous 0,50).

| Voisines | Saillie, références saturées, méd. · max | Promesses perdues aux bornes de luminosité | Fonds Dark du bleu électrique, 300 · 400 |
|---|---|---|---|
| Aujourd'hui | 1,46 · 2,91 | – | 0,093 · 0,114 |
| Bosse non gardée | 1,26 · 2,49 | 1 | 0,143 · 0,229 |
| Bosse gardée | 1,26 · 2,49 | 0 | 0,143 · 0,229 |
| Bosse gardée, hors fonds | 1,26 · 2,72 | 0 | 0,093 · 0,114 |

Le balayage ne change avec aucune bosse. Le maximum reste du côté où l'écran
borne la voisine. Le message vers la saturation est écarté : baisser la
saturation garde la saillie (jaune vif en Dark : 1,155 à part 1, 1,154 à part
0,5), et un constat sans geste qui le corrige contredit [VER-08].

## Le moteur retenu

Après la comparaison avec Tailwind et ses avis par teinte, le mainteneur a validé
à l'œil, dans la [maquette](./Maquettes/MAQUETTE-MOTEUR.html), ce moteur :

- Soft garde sa règle d'aujourd'hui : ses textes et ses pleins restent proches
  de ceux de Vivid, des textes trop désaturés devenant ternes ;
- Soft se distingue par ses fonds : tons clairs × 0,7 en Light, borne vers le
  noir 0,15 en Dark (au lieu de 0,38), ce qui retire aussi l'inversion où Soft
  dépassait Vivid ;
- Vivid porte toujours la référence, décidé sur la
  [démo du porteur](./Maquettes/DEMO-PORTEUR.html) : plus la couleur est
  saturée, plus ses palettes le sont, sans bascule d'un profil à l'autre ;
- la courbe de teinte de Vivid, seconde version, la bosse gardée et la clarté
  selon la teinte avec chroma gardée, gardée elle aussi
  ([CLARTE-SELON-LA-TEINTE.md](./CLARTE-SELON-LA-TEINTE.md)) ;
- l'alerte « Soft et Vivid se confondent » ne juge plus que les fonds.

[STRESS-TEST.md](./STRESS-TEST.md) rassemble ces règles, revoit la façon dont
elles agissent ensemble, liste ce qui peut casser et rend compte d'un test de
charge sur 7 237 palettes (`Mesures/stresser-moteur.ts`). Cette repasse propose
deux précisions : la bosse rejoint les fonds Dark autour d'une référence que
Vivid y pose, ce qui comble la plupart des creux qu'y laissaient les références
foncées ; l'alerte juge les fonds Light 200 et 300 et les fonds Dark 300 à 500
(`Mesures/mesurer-alerte-fonds.ts`).

## Suite

Le moteur retenu est implémenté dans `packages/couleur` (lots 1 à 5 de
[PLAN-IMPLEMENTATION.md](./PLAN-IMPLEMENTATION.md)) : le format 12 de la
recette, l'enveloppe et les tons clairs, le porteur toujours Vivid, l'alerte sur
les fonds, la clarté selon la teinte et la bosse, toutes deux gardées. Le
paquet rend les mêmes octets que l'oracle (`Mesures/ORACLE-PORTAGE.json`) sur
7 046 des 7 237 situations du test de charge. Les 191 autres sont expliquées :
Color shift réglé, palettes figées du jeu. Les règles sont écrites dans la
spécification (`[MOT-35]`, `[MOT-38]`, `[MOT-39]`, `[REC-14]`, `[ENT-11]`,
`[VER-11]`, `[PLA-15]`) et dans `AGENTS.md`.

Reste à faire :

1. La reprise d'un fichier (`reconstruction.ts`), qui doit reproduire le
   calcul du moteur : lot 6 du plan.
2. L'interface d'UCM Palettes : les tests à valeurs figées et le texte de
   l'alerte « profils confondus » : lot 7.
3. La suite complète, le commit et le push sur `main` : lot 9.

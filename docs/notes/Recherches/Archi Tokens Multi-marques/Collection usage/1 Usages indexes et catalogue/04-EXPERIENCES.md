# Expériences et résultats

## Reproduction

Depuis la racine du dépôt, avec les dépendances du projet installées :

```sh
npm run build --workspace @ucm-kit/core
npx tsx "docs/notes/Recherches/Archi Tokens Multi-marques/Collection usage/1 Usages indexes et catalogue/mesurer-associations.ts"
```

Le [script](./mesurer-associations.ts) écrit
[resultats-mesures.json](./resultats-mesures.json). Le fichier contient les
entrées exactes, la recette, les palettes, les minima avec leur contexte et
les empreintes des sources. Relancer le script actualise les résultats avec
le moteur présent dans le dépôt.

Le build préalable actualise le sous-chemin `@ucm-kit/core/emplois` utilisé
par le moteur. Ses fichiers compilés figurent aussi dans les empreintes.

## Périmètre mesuré

Six références synthétiques couvrent un bleu, un rouge, un jaune, un vert,
un violet et un gris : `#1E6FD9`, `#D94635`, `#EAB308`, `#16A34A`,
`#9333EA`, `#737373`. Elles ne représentent pas les six marques réelles.

Chaque référence est calculée une fois avec deux intensités et une fois avec
une seule. Les deux thèmes donnent 36 contextes de palette. Les valeurs
proviennent de `rampesDe()`, avec le préréglage Tailwind et l’ancrage réel de la
référence. Les réglages communs sont ceux de `recetteParDefaut()`.

Le script effectue 1 152 mesures de matrice : seize couples texte/surface et
seize couples contour/surface dans chacun des 36 contextes. Il évalue aussi
les 684 promesses existantes et les premiers plans sur les fonds pleins.

## Plusieurs partenaires atteignent le seuil

La table donne le minimum de chaque couple sur les 36 contextes. L’affichage
est arrondi à trois décimales ; les verdicts utilisent la comparaison du kit
à dix décimales.

| Texte ou fond plein | Surface 100 | Surface 200 | Surface 300 | Surface 400 |
|---|---:|---:|---:|---:|
| 700 | 5,017 | 4,416 | 3,601 | 2,657 |
| 800 | 7,136 | 6,343 | 5,264 | 3,942 |
| 900 | 10,061 | 8,799 | 7,302 | 5,468 |
| 950 | 12,969 | 11,356 | 9,391 | 6,923 |

Douze cellules atteignent 4,5:1 dans tous les contextes testés. La diagonale
actuelle n’en décrit que quatre. Par exemple, le texte 800 sur la surface 300
atteint au moins 5,264:1 dans cet échantillon.

Cette même table peut fournir les ratios entre fonds pleins et surfaces,
puisque `text` et `solid` visent les mêmes crans. Leur seuil et leur nécessité
dépendent toutefois de ce qui est peint. Une relation de séparation de contrôle
à 3:1 accepterait davantage de cellules qu’une relation de texte courant.

Pour le bleu à une intensité, le texte 700 sur la surface 200 atteint 4,649:1
en clair et 4,956:1 en sombre. Ce couple réussit pour ce bleu, mais échoue
sur le minimum global de l’échantillon. Un catalogue par marque peut donc
autoriser davantage de choix qu’un catalogue commun à toutes les marques.

## Le même indice ne garantit pas toutes les familles

| Couple contour/surface par rang | Minimum observé | Seuil 3:1 |
|---|---:|---|
| 600 / 100 | 2,918 | Manqué |
| 700 / 200 | 4,416 | Tenu |
| 800 / 300 | 5,264 | Tenu |
| 900 / 400 | 5,468 | Tenu |

Le premier échec concerne le vert `#16A34A` ancré au cran 600 en clair.
Sa surface 100 vaut `#C9FED2`. Le rapport exact est
`2.917643042714528`. Il échoue à la paire 9, contour sur surface, et à la paire
13, focus sur surface, dans l’intensité `vivid` et dans la palette à une
intensité. Cela donne quatre promesses manquées sur 684.

Ce résultat est déjà signalable par le moteur de promesses. Il ne démontre pas
un défaut de celui-ci. Il démontre qu’une table d’emplois reste une obligation
à mesurer après ancrage, même avec les courbes par défaut.

Les premiers plans correspondant au fond configuré atteignent au moins
5,290:1 sur le cran 700, puis 7,524, 10,608 et 13,675 sur les suivants.
La sonde utilisant un gris au cran 50 donne les mêmes minima globaux. Elle
ne prouve pas l’égalité des deux premiers plans dans chaque contexte : le
catalogue doit résoudre la vraie cible de `on-solid` dans les tokens exportés.

## Croiser des familles

Le script combine chaque texte de palette à une intensité avec chacune des
six surfaces de même rang. Les quatre couples de rangs, dans les deux thèmes,
donnent 288 mesures. Toutes atteignent 4,5:1 dans cet échantillon.

Le minimum est 4,864:1 : texte 700 du vert sur surface 100 du rouge en clair.
Ces associations croisées ne sont pas reconnues par la règle de même palette
du diagnostic actuel. Elles constituent un candidat concret à l’extension du
catalogue, sous réserve de préserver le sens des couleurs.

## Courbes sans ancrage et ensembles de teintes

Une seconde expérience balaie 360 teintes entières, les parts de chroma 0,45
et 0,95, et les deux thèmes. Elle utilise `fabriquerCran()` avec les courbes
par défaut. Elle exclut l’ancrage, la dérive, les réglages locaux et le facteur
de chroma des fonds sombres du calcul de palette.

Le script conserve les minima à teinte commune. Il calcule aussi les extrema
de luminance de chaque cran, en autorisant des teintes et parts différentes
pour le texte et la surface. Dans ce second calcul, le minimum s’obtient par
les deux extrema les plus proches, tant que les intervalles sont séparés.

| Texte | Surface 100 | Surface 200 | Surface 300 | Surface 400 |
|---|---:|---:|---:|---:|
| 700 | 4,765 | 4,094 | 3,294 | 2,346 |
| 800 | 6,773 | 5,819 | 4,682 | 3,334 |
| 900 | 9,545 | 8,200 | 6,598 | 4,699 |
| 950 | 12,429 | 10,678 | 8,591 | 6,119 |

Douze cellules dépassent encore 4,5:1. Certaines marges deviennent faibles,
notamment 800/300 et 900/400. Ces bornes portent sur l’ensemble discret mesuré.
Elles ne couvrent ni les teintes fractionnaires ni les autres parts de chroma.

Pour des ensembles dont tous les textes sont plus sombres que toutes les
surfaces, la borne est `(surfaceMin + 0,05) / (texteMax + 0,05)`. L’ordre
s’inverse dans le cas opposé. Si les intervalles se recouvrent, cette formule
ne fournit plus une borne de séparation supérieure à 1. Une garantie continue
exigerait des bornes démontrées sur toute la fonction de génération.

## La mesure du token ne couvre pas son opacité effective

Un texte noir sur blanc atteint 21:1. Dans une composition sRGB simple avec
une opacité de 40 %, sa couleur résultante est `#999999`, à 2,849:1 sur blanc.
Le calcul est enregistré comme contre-exemple. Il illustre pourquoi un succès
sur deux tokens opaques ne vaut pas après une opacité appliquée au calque.

## Sonde du diagnostic actuel

Un fragment de contrat au format de vue 14.0 lie un fond à
`usage.primary.solid.default` et son texte à `usage.primary.on-solid`.
Les deux tokens ont volontairement la même valeur sRGB. Le contraste vaut
1:1 ; `constatsDesEmplois()` rend une liste vide.

Cette sonde appelle directement le diagnostic sur un fragment contenant ses
entrées utiles. Elle ne prétend pas valider un contrat complet par le schéma,
ni tester toute la commande `ucm check`. Elle confirme l’absence de contrôle
numérique systématique des paires reconnues dans ce module.

## Limites et expériences restantes

- Les exports voisins inspectés portent deux marques et aucun axe de thème.
  Ils ne fournissent pas les valeurs de la cible à six marques et deux thèmes.
  Les mesures ne prononcent aucun verdict sur leur migration.
- Les calculs ne couvrent pas toutes les courbes éditables, les deux
  préréglages de crans, les références extrêmes ou chaque réglage global.
- Aucun test Figma n’a comparé le temps de recherche d’une variable indexée
  à celui d’une variable nommée par état.
- Les opacités, les fonds superposés, les images, les couleurs P3 et les
  modes de contraste forcé demandent des contrôles de rendu distincts.
- Le coût en temps n’est pas un résultat de cette étude : aucune campagne de
  performance répétée n’a été effectuée.

La direction proposée repose sur l’existence mesurée de partenaires
supplémentaires. La publication d’une garantie universelle reste exclue tant
que son domaine et ses bornes ne sont pas établis.

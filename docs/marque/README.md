# Marque UCM

Ce dossier contient les logos des outils UCM et leurs cartes de présentation.
Les fichiers SVG sont écrits par [`generer-marque.mjs`](./generer-marque.mjs) :
pour modifier une forme ou une couleur, changer le script puis le relancer
depuis la racine du dépôt.

```sh
node docs/marque/generer-marque.mjs
```

## Logos

| Produit | Logo | Carte |
|---|---|---|
| UCM Toolkit | [ucm-toolkit.svg](./logos/ucm-toolkit.svg) | [carte](./cartes/ucm-toolkit.svg) |
| UCM Contract Exporter | [ucm-contract-exporter.svg](./logos/ucm-contract-exporter.svg) | [carte](./cartes/ucm-contract-exporter.svg) |
| UCM Palettes | [ucm-palettes.svg](./logos/ucm-palettes.svg) | [carte](./cartes/ucm-palettes.svg) |
| UCM Token Explorer | [ucm-token-explorer.svg](./logos/ucm-token-explorer.svg) | [carte](./cartes/ucm-token-explorer.svg) |

Chaque logo est un carré de 100 unités découpé en rectangle arrondi de rayon
22,5. Il ne contient aucun texte. Le nom du produit s'écrit à côté du logo,
jamais dedans.

Chaque signe dessine un phénomène optique :

| Produit | Signe |
|---|---|
| Toolkit | Trois faisceaux droits qui se croisent en triangle. Chaque croisement a sa couleur. |
| Contract Exporter | Trois faisceaux en coin qui convergent sur un foyer blanc. |
| Palettes | La lumière blanche qui se déploie en secteurs depuis le coin bas gauche. |
| Token Explorer | Une spirale qui conduit du bord vers un cœur sombre. |

Toutes les régions sont des aplats opaques. Une rencontre entre deux formes
est une région à part, de couleur choisie : aucun dégradé ni transparence.

## Couleurs

Le spectre est partagé en tranches. Chaque plugin occupe la sienne, avec
plusieurs couleurs voisines. Toolkit reprend une couleur de chaque tranche.

| Produit | Tranche | Fond | Couleurs principales |
|---|---|---|---|
| Toolkit | Toutes | `#1a1030` | `#ff6f5e`, `#3fc4e0`, `#c04ad8` |
| Contract Exporter | Cyan à bleu | `#0d1b45` | `#2a62b8`, `#2f9fc4`, `#1f7fa8` |
| Palettes | Rouge à ambre | Aucun : les secteurs couvrent tout | `#f1e6d0`, `#ffc24f`, `#ff6f5e`, `#c2457e` |
| Token Explorer | Violet à magenta | `#240a30` | `#8a3fd8`, `#e0459e` |

Les couleurs de rencontre sont dans le script. Le jaune-vert et le vert sont
réservés aux plugins suivants. Un nouveau plugin prend une tranche libre, et
Toolkit peut alors reprendre sa couleur.

## Origine

La recherche qui a conduit à ces logos est dans
[Direction artistique, optique](../notes/Recherches/Direction%20artistique/Optique/README.md),
avec les mises en situation sur GitHub, dans Figma et en cartes.

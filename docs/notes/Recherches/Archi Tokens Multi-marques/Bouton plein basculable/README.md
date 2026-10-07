# Le bouton plein basculable

**Statut :** recherche. Question ouverte, aucune décision. Elle figure dans
[ARCHITECTURE-FINALE-MULTIMARQUES.md](../ARCHITECTURE-FINALE-MULTIMARQUES.md),
section 10.

## La question

Dans la table en dossiers à trois états (`default`, `hover`, `pressed`), un
bouton plein qu'on active et désactive suit les trois fonds de `solid`.
Activé, il reste sur `solid/pressed`. Activé et survolé, il n'a pas de
variable : `solid/hover` lui donnerait la couleur du bouton désactivé
survolé. L'ancien rang `active-hover` couvrait ce cas. Le mainteneur a des
composants pleins dans les deux états.

## Les documents

| Document | Rôle |
|---|---|
| [BOUTON-PLEIN-BASCULABLE.html](./BOUTON-PLEIN-BASCULABLE.html) | Les logiques du marché, les signes autres que la couleur et quatre propositions, modélisés avec la même palette dans les quatre thèmes |
| [mesurer-basculable.ts](./mesurer-basculable.ts) | Les écarts entre fonds voisins et le contraste du texte des boutons sur les fonds candidats |
| [MESURES-BASCULABLE.json](./MESURES-BASCULABLE.json) | Sa sortie |

## Ce que font les autres systèmes

Six logiques, lues dans les sources citées en bas de la page HTML :

- **Une famille `selected` à trois états** : Atlassian
  (`color.background.selected.bold`, `.hovered`, `.pressed`), Spectrum
  (`selected-default`, `-hover`, `-down`). Le bouton désactivé n'y est pas
  plein : la famille `selected.bold` a les valeurs du fond plein ordinaire.
- **Un repos activé propre, survol et appui repris** : Fluent 2
  (`colorBrandBackgroundSelected`, puis `…Hover` et `…Pressed`). Plein dans
  les deux états, Fluent accepte que l'activé survolé ait la couleur du
  désactivé survolé.
- **Activé = appui, sans survol** : Primer (bouton primary), Polaris
  (`pressed`).
- **Pas de survol défini pour l'activé** : Carbon (content switcher).
- **Un calque translucide sur un fond constant** : Material 3.
- **Aucun état activé** : Radix.

Les signes autres que la couleur : icône pleine ou contour (Fluent,
Material), coche (Material 3, refusée par eBay), anneau intérieur (Fluent
en mode accessible), ombre intérieure (Polaris, Heydon Pickering), texte
gras (Primer). WCAG 1.4.1 demande de ne pas signaler un état par la seule
couleur ; 1.4.11 demande 3:1 pour l'indicateur d'état, pas entre deux
états.

## Ce que la table permet

Un cran après `pressed` se distingue dans trois thèmes : 950 en Light et en
Dark (ΔEok au moins 0,069), 400 en Dark inversé (0,047). En Light inversé,
la 400 n'est qu'à 0,014 de la 500 : il faut sauter à la 300 (0,098). Le texte
des boutons tient au moins 8,7:1 sur chacun de ces fonds.

## Les propositions

| | Variables de plus | Activé | Activé survolé | Limite |
|---|---|---|---|---|
| **A. Le signe porte l'état** (recommandée) | aucune | `solid/pressed` et un anneau intérieur en `solid/foreground` | `solid/hover` et l'anneau | Un signe à dessiner dans chaque composant ; il peut être une icône ou une coche |
| B. Activé = appui | aucune | `solid/pressed` | `solid/pressed`, inchangé | Aucun retour au survol de l'état activé |
| C. Une famille `selected` | deux par palette | `solid/selected` (900, 500 inversé) | `solid/selected-hover` (950, 300 inversé) | La 950 redevient requise ; saut de teinte à la 300 en thème inversé |
| D. Le désactivé quitte `solid` | aucune | `solid/default` | `solid/hover` | Ne convient pas à un composant plein dans les deux états |

A ne demande aucune variable et marche dans les quatre thèmes. Son anneau a
le contraste du texte des boutons, déjà garanti à 4,5:1, et il répond à
WCAG 1.4.1. B et C se combinent avec le signe de A.

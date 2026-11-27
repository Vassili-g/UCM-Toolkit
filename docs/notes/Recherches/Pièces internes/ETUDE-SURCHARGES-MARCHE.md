# Surcharges imbriquées : ce que font les autres outils

Aucun outil lu ne recopie la règle de conservation des surcharges de Figma dans ce qu'il publie. Figma ne la garantit pas : son aide dit qu'il « attempts » de conserver les surcharges, et l'API Plugin écrit que l'heuristique de `swapComponent` peut changer. Seul Specs, le prototype de Nathan Curtis, vise le même but qu'UCM, un contrat dont le code est dérivé et vérifié, et il ne décrit pas les surcharges.

Recherche faite par un agent chercheur, sur les pages officielles ouvertes. Les pages d'Anima, Webflow, zeroheight et Specify n'ont pas pu être ouvertes.

## La règle de Figma

- Au changement de variante, Figma conserve une surcharge si le calque a le même nom et si la propriété avait la même valeur d'origine dans les deux variantes : un remplissage `#1BC47D` surchargé se conserve vers une variante `#1BC47D`, et se perd vers une variante `#FFFFFF` ([aide « instances »](https://help.figma.com/hc/en-us/articles/360039150733)). Un texte se conserve avec le même nom et une hiérarchie proche.
- Un échange par le panneau Assets ne conserve que les textes ([aide « Swap »](https://help.figma.com/hc/en-us/articles/360039150413-Swap-between-component-instances-in-a-file)).
- Deux bogues sont reconnus et sans correctif : une surcharge d'icône d'une instance imbriquée revient au défaut quand l'état est piloté par une variable (forum Figma, « bugs, not intended behavior »), et une instance imbriquée à variante de survol se comporte de façon inattendue (forum, 2024).
- L'API REST n'enregistre que les surcharges directes (« Inherited overrides are not included »), dans l'état présent.

## Ce que font les autres outils

| Approche | Outils | Au changement de variante ou d'état |
|---|---|---|
| Instantané | MCP de Figma (`get_design_context`), générateurs de code | Rien : l'état se fige en prop, et la sortie demande une relecture humaine |
| Propriété explicite | Code Connect, Locofy, Builder.io, Framer | Seul ce qu'une propriété expose passe ; Code Connect connecte chaque instance imbriquée à part et omet le reste |
| Règle propre à l'éditeur | Penpot, Plasmic | La règle est écrite par l'éditeur : Penpot (même nom, même type, même niveau, sinon la liaison casse), Plasmic (surcharge écrite par combinaison de variantes) |
| États en CSS | Specs, design systems en code | L'état est une pseudo-classe (`:hover`) ou un attribut (`data-state`) ; le parent passe une classe, une variable ou une recette de slot (Radix, Chakra, MUI, Primer) ; Spectrum interdit de changer les couleurs de ses composants |
| Contrat et test de conformité | Specs | Même but qu'UCM, en prototype ; aucune règle de surcharge |

Un éditeur tiers juge qu'aucune solution automatique fiable n'existe pour la parité des variantes et des états entre Figma et le code (Atomize).

## Ce que cela dit d'UCM

UCM vise un but que presque personne ne vise : un code reconstruit et vérifié depuis le seul contrat. Les autres outils partent d'un code existant, ou livrent une première version qu'un développeur reprend. Sur les surcharges, la confrontation (`CONFRONTATION-15.md`, décision 1) recopie la règle de Figma et écrit une perte quand elle ne peut pas prouver le rendu. Cette règle repose sur une heuristique que Figma ne garantit pas et qui a des bogues actifs : c'est le point faible de la méthode d'UCM.

Les outils dont la règle est fiable l'écrivent eux-mêmes (Penpot, Plasmic) ou la font déclarer par le designer (Code Connect, Framer). En code, un parent ne repeint pas l'intérieur d'un enfant : il lui passe une valeur que l'enfant applique dans tous ses états.

## À essayer dans Figma

- Poser un hôte avec une instance au repos, surcharger la couleur d'un calque, passer l'instance au survol par `setProperties`, puis lire `fills`.
- Répéter avec une couleur liée à un token, un calque renommé, un échange d'icône et un état piloté par une variable.
- Lire `overrides` avant et après le changement.

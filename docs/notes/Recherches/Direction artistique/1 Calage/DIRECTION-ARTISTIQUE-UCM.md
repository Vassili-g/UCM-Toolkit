# Direction artistique des produits UCM

Ce document propose une direction artistique commune à UCM Toolkit, à ses trois
plugins et aux paquets `@ucm-kit`. Elle porte sur les logos, les couvertures et
trois touches dans la fenêtre d'un plugin. Le mainteneur ne l'a pas validée, et
aucun plugin ne l'emploie.

| Fichier | Contenu |
| --- | --- |
| [PLANCHE-DIRECTION-ARTISTIQUE.html](./PLANCHE-DIRECTION-ARTISTIQUE.html) | Les marques, leurs tailles, leur construction, les couvertures et les touches dans Figma. À ouvrir dans un navigateur |
| [logos/](./logos/) | Une tuile de 128 unités par produit, et le logotype, en SVG |
| `generer-planche.mjs` | La géométrie des marques, écrite une fois ; il produit la planche et les logos |

## Le parti pris : le calage

Un imprimeur cale ses encres l'une sur l'autre, puis contrôle le tirage contre
le bon à tirer, l'épreuve que le client a signée. UCM fait le même travail entre
la maquette et le code : le contrat est l'épreuve signée, et `ucm check` contrôle
le code contre lui.

La direction prend donc son vocabulaire à l'atelier d'impression. Chaque produit
reçoit pour marque un outil de contrôle de l'imprimeur, et pour fond une encre
de la quadrichromie.

| Produit | Marque | Ce qu'elle dit du produit | Fond |
| --- | --- | --- | --- |
| UCM Toolkit | Croix de repérage | Deux représentations calées l'une sur l'autre | Papier |
| UCM Contract Exporter | Traits de coupe | Le contrat délimite ce que le composant livre | Cyan |
| UCM Palettes | Gamme de contrôle | Des plages mesurées, du point de trame le plus fin à l'aplat | Magenta |
| UCM Token Explorer | Compte-fils | La loupe de l'imprimeur : elle montre la trame et ne modifie rien | Jaune |
| `@ucm-kit/*` | Croix de repérage, en négatif | La croix du projet, côté code | Noir |

Un quatrième plugin prend un autre outil de l'atelier, par exemple l'équerre ou
le taquet, et une encre de surimpression : rouge, vert ou bleu-violet.

## Les règles de dessin

Ces règles suffisent à dessiner une nouvelle marque sans consulter les autres.

- La tuile est un carré de 128 unités, à angles vifs, peint à fond perdu. Le
  dessin tient dans une marge de 12 unités et se place sur un pas de 4.
- Une marque emploie trois niveaux opaques : le fond d'encre, le trait noir et
  la réserve blanche du papier.
- La graisse d'un trait vaut de 10 à 14 unités, soit environ un dixième de la
  tuile. À 16 px, un trait garde ainsi plus d'un pixel.
- Le dessin n'emploie que des droites horizontales et verticales, des diagonales
  à 45° et des arcs de cercle. Les extrémités sont coupées droit.
- Une marque compte au plus une douzaine de formes.

La version en une seule teinte retire le fond. Une réserve y devient un contour
de 4 unités, et la marque prend la couleur du texte voisin.

## Les encres

| Encre | Valeur | Emploi |
| --- | --- | --- |
| Cyan | `#009FE3` | Fond d'UCM Contract Exporter |
| Magenta | `#E6007E` | Fond d'UCM Palettes |
| Jaune | `#FFED00` | Fond d'UCM Token Explorer |
| Noir | `#1D1D1B` | Le trait de toutes les marques, le fond du kit |
| Papier | `#FFFFFF` | La réserve, le fond d'UCM Toolkit |

Ces valeurs sont l'approximation sRGB courante des encres de quadrichromie.
Aucune encre n'entre dans l'interface d'un plugin : l'action y reste au bleu de
Figma, et le jaune ou le magenta s'y liraient comme un état.

## Le logotype et la typographie

Les trois lettres du logotype sont dessinées sur la grille des marques, à la
même graisse, dans un bloc de 132 × 44 unités. Aucune police ne les compose.

Le nom du produit suit le logotype en Archivo étroit (largeur 62, graisse 700),
en capitales. Archivo est une police libre d'Omnibus-Type, sous licence Open Font. Son axe
de largeur donne l'étroit et le normal dans un seul fichier.
L'interface des plugins garde Inter, la police de Figma.

## Ce que la direction refuse

Ces traits reviennent dans les images qu'un modèle de langage produit par
défaut. Chacun est remplacé par une règle de la section précédente.

| Trait refusé | Règle qui le remplace |
| --- | --- |
| Dégradé, lueur, verre dépoli | Aplat d'encre, sans transition |
| Violet, indigo, bleu vers violet | Cyan, magenta, jaune, noir |
| Fond crème, terre cuite, sérif éditoriale | Blanc papier et noir d'imprimerie |
| Tuile aux angles arrondis, ombre portée | Carré à angles vifs, à fond perdu |
| Icône au trait fin de 1,5 px | Graisse de 10 à 14 unités sur 128 |
| Étincelle, hexagone, cube, nœuds reliés | Un outil d'imprimeur par produit |
| Ronds translucides qui se recouvrent | Trois niveaux opaques |
| Logotype composé en Inter ou en Space Grotesk | Trois lettres dessinées sur la grille |

## Les touches dans un plugin

L'interface reste sombre et garde les tailles de texte et les rôles de couleur
de `packages/plugin-socle/src/ui/socle.css`. La planche montre les trois touches
proposées dans une fenêtre d'UCM Token Explorer.

1. **L'en-tête.** La tuile du produit, en couleur, à 16 px, devant son nom.
   C'est le seul endroit où une encre paraît dans la fenêtre.
2. **L'état vide.** La marque du produit en une seule teinte, à 56 px, peinte du
   rôle `--texte-second`, au-dessus du message.
3. **L'attente.** La croix de repérage en une seule teinte, à 16 px, tournée par
   quarts de tour. Elle reste fixe quand le système demande moins d'animation.

Les glyphes des cartes d'UCM Palettes (`src/ui/glyphes.ts`) gardent leur dessin
au trait de 1,8 : ils illustrent un réglage, et la direction ne porte que sur
ce qui identifie un produit.

## Les livrables à produire après validation

| Livrable | Format | Source |
| --- | --- | --- |
| Icône de chaque plugin pour Figma Community | PNG de 128 × 128 | `logos/*.svg` |
| Couverture de chaque plugin | PNG de 1920 × 960 | La fonction `couverture` du script |
| En-tête du `README` de chaque paquet | La signature : tuile, logotype, nom | La planche, section « Les signatures » |
| Tuile de 16 px dans l'en-tête | SVG en ligne, dans le socle | `logos/*.svg` |

## Ce que le rendu a montré

La planche a été rendue dans Edge à 1280 px de large. Les cinq tuiles se
distinguent à 16 px par leur encre et par leur silhouette. À cette taille, les
points de trame de la gamme et les traits de coupe se réduisent à un ou deux
pixels : une version simplifiée pour 16 px reste à dessiner si le mainteneur
juge la tuile de l'en-tête trop chargée. Aucun rendu n'a été fait dans Figma.

## Décisions attendues du mainteneur

1. Retenir ou non le parti pris du calage.
2. Garder une encre par plugin, ou donner aux trois plugins le même fond.
3. Retenir Archivo étroit pour les noms, ou une autre police.
4. Admettre les trois touches dans le socle, ou limiter la direction aux logos.

## Pistes écartées

**Le poinçon.** Chaque produit porterait un poinçon d'orfèvre, losange ou
octogone frappé d'un signe, par analogie avec la garantie. La piste donne peu de
touches à l'interface, et un signe gravé dans un poinçon ne se lit plus à 16 px.

**L'assemblage.** Chaque marque montrerait un assemblage de menuiserie, deux
pièces emboîtées pour la maquette et le code. L'image convient au projet entier
et ne distingue pas un plugin d'un autre.

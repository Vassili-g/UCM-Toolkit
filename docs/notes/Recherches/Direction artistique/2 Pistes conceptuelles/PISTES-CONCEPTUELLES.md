# Quatre pistes conceptuelles pour les marques d'UCM

Ce document propose quatre directions pour les logos d'UCM Toolkit, de ses trois
plugins et des paquets `@ucm-kit`. Aucune n'est validée. L'interface des plugins
reste sombre et neutre dans les quatre cas.

[PLANCHE-PISTES.html](./PLANCHE-PISTES.html) montre les cinq tuiles de chaque
piste à 128, 32 et 16 px. `generer-pistes.mjs` porte la géométrie et produit la
planche.

## Le point de départ

Le mainteneur a exploré un cercle qui contient d'autres cercles : de nombreuses
unités, ordonnées, au sein d'un même modèle. Il en retient l'idée et en écarte
trois choses : la métaphore mécanique du roulement, un parti pris graphique
faible, et une forme difficile à décliner par produit.

Les quatre pistes gardent l'idée et partagent une méthode. Chacune prend une
forme élémentaire, la répète, et donne à chaque produit une règle d'ordre. Un
nouveau produit reçoit une nouvelle règle, sans nouveau dessin à inventer.

| Piste | Forme élémentaire | Ce qui distingue un produit | Couleurs |
| --- | --- | --- | --- |
| Capitule | Le point | La loi qui range les points dans le disque | Rose sur gris sombre |
| Mise en carte | La case | L'armure, sur huit fils par huit | Garance et blanc |
| Pavillons | Le champ | La partition du carré | Rouge, or, bleu, noir, blanc |
| Graduation | Le trait | L'échelle | Noir, blanc, un trait orange |

## Piste 1 : Capitule

Un cœur de tournesol range ses fleurons selon une seule loi d'angle. La piste
reprend le cercle de cercles du mainteneur et remplace le roulement par une
figure végétale. Le contour disparaît : les points seuls dessinent le disque.

| Produit | Loi | Lecture |
| --- | --- | --- |
| UCM Toolkit | Spirale | Toutes les unités, une seule loi |
| UCM Contract Exporter | Rangs en quinconce, du gros au fin | Les unités rangées pour sortir |
| UCM Palettes | Couronnes dont le point grossit | Une rampe |
| UCM Token Explorer | Chaînes qui partent d'un centre | Des alias jusqu'à une valeur |
| `@ucm-kit` | Quadrillage | Les mêmes unités, côté code |

**Force.** La piste reste la plus proche de l'intention d'origine et n'emploie
qu'une couleur.

**Limite.** À 16 px, les cinq disques se confondent sur la planche. La spirale
de points est aussi un motif courant de l'art génératif.

## Piste 2 : Mise en carte

Avant de tisser, le dessinateur reporte son motif sur un papier quadrillé, une
case par croisement de fils : c'est la mise en carte. Le métier Jacquard lit
ensuite ce report sur des cartons perforés. Le geste est celui d'UCM : un dessin
traduit en une grille qu'une machine exécute. Chaque produit prend une armure,
la règle qui dit quel fil passe dessus.

| Produit | Armure | Lecture |
| --- | --- | --- |
| UCM Toolkit | Sergé | La diagonale régulière, l'armure de base du projet |
| UCM Contract Exporter | Chevron | La diagonale se retourne et pointe vers la sortie |
| UCM Palettes | Satin ombré | Chaque colonne prend un fil de plus : un dégradé |
| UCM Token Explorer | Œil-de-perdrix | Des losanges emboîtés autour d'un centre |
| `@ucm-kit` | Toile, en couleurs inversées | Un fil dessus, un fil dessous |

La tuile est pleine, sans marge. Une case vaut 16 unités, soit deux pixels
entiers à 16 px.

**Force.** Le concept recouvre le sujet : maquette, grille, règle, machine. Le
motif plein ne ressemble à aucune icône voisine dans la liste des plugins.

**Limite.** Une armure se lit d'abord comme une texture. Le satin ombré est le
moins net des cinq. Un lecteur peut y voir un code-barres à deux dimensions,
ou le damier de transparence de Figma pour la toile.

## Piste 3 : Pavillons

Le code des signaux maritimes et le blason divisent un champ carré selon une
partition nommée, en couleurs franches. Chaque produit prend une partition.
UCM Toolkit est écartelé aux couleurs des quatre autres.

| Produit | Partition | Lecture |
| --- | --- | --- |
| UCM Toolkit | Écartelé | Un quartier par produit |
| UCM Contract Exporter | Tranché | La maquette d'un côté, le code de l'autre |
| UCM Palettes | Fascé, à bandes croissantes | Les crans d'une rampe |
| UCM Token Explorer | En abîme | Un champ dans un champ : regarder dedans |
| `@ucm-kit` | Chevron couché | Le sens de la lecture d'une ligne de commande |

**Force.** C'est la piste la plus lisible à 16 px. Une partition se décrit en un
mot, et le vocabulaire héraldique en fournit des dizaines.

**Limite.** Le lien avec le sujet est le plus lâche : la piste montre une
famille ordonnée et dit peu le contrat. Le chevron du kit rappelle l'invite d'un
terminal, une image usée.

## Piste 4 : Graduation

UCM mesure un contraste contre un seuil et un code contre un contrat. Une
échelle est une suite d'unités ordonnées dont un trait sert de repère. Chaque
produit prend une échelle, et le trait orange marque la lecture.

| Produit | Échelle | Lecture |
| --- | --- | --- |
| UCM Toolkit | Cadran | Le tour complet |
| UCM Contract Exporter | Règle | La cote d'un composant |
| UCM Palettes | Échelle de graisse | Sept crans, du plus fin au plus épais |
| UCM Token Explorer | Vernier | Deux échelles, et le trait où elles coïncident |
| `@ucm-kit` | Rapporteur, en négatif | L'angle d'un écart |

**Force.** La palette tient en noir, blanc et un accent. Le vernier décrit le
travail de l'explorateur : trouver la correspondance entre deux séries.

**Limite.** Le vocabulaire reste celui d'un instrument, proche de la mécanique
que le mainteneur veut éviter. À 16 px, les traits fins disparaissent.

## Recommandation

Mise en carte est la piste à creuser en premier. C'est la seule dont le concept
dit le métier d'UCM, et son motif plein donne le parti pris graphique que le
cercle n'avait pas. Deux réglages restent à essayer : une couleur de fond par
produit, pour aider la lecture à 16 px, et un satin ombré plus franc.

Pavillons est le second choix si la lisibilité à 16 px prime sur le concept.

## Décisions attendues du mainteneur

1. Retenir une piste, ou en croiser deux.
2. Pour la piste retenue : une couleur commune, ou une couleur par produit.
3. Le logotype et la police des noms, à dessiner une fois la piste choisie.

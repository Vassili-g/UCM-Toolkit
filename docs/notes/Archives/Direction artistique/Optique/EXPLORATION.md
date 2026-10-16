# Conduire l'exploration graphique

## Mission de l'agent

Lire le [brief](./README.md), le [style commun](./STYLE-COMMUN.md) et les quatre
fiches de produit. Produire des propositions graphiques comparables. Le
présent dossier contient les hypothèses de départ ; les images doivent
permettre de choisir les formes et leur traitement.

## Première exploration

Construire trois séries de quatre logos. Chaque série doit traiter les quatre
produits avec les mêmes règles de découpe, de couleur et de cadrage.

| Série proposée | Variable étudiée | Traitement |
|---|---|---|
| A | Interactions aux croisements | Surfaces presque planes, aplats distincts à chaque rencontre, nuances proches sur les bandes |
| B | Profondeur par les nuances | Plis et revers découpés, faces de clartés différentes, changements de teinte aux torsions |
| C | Concentration et dispersion | Caustiques dessinées en régions claires, bandes de couleur plus contrastées, accents localisés |

Garder des couleurs proches entre les séries pour pouvoir comparer le
traitement. Commencer par des silhouettes simples, puis dessiner leurs
régions colorées. Revoir le contour lorsque ce découpage en révèle une faiblesse.

Ces trois séries constituent une méthode proposée. Une autre organisation
convient si elle fournit plusieurs familles complètes et rend la différence
entre les essais identifiable.

## Comparaison

1. Examiner les quatre logos côte à côte, à taille apparente égale.
2. Réduire les images à 128, 64 et 32 pixels de côté. Noter les ouvertures ou
   les croisements qui disparaissent.
3. Comparer les contours en aplat d'une couleur. Employer cette vue pour
   juger les silhouettes. La richesse des nuances se juge sur la version couleur.
4. Sur la famille la plus convaincante, essayer le fond blanc cassé et adapter
   les contours si nécessaire.
5. Rédiger un avis sur la famille et sur chaque signe à partir des images.

Les valeurs de taille sont des repères de recherche, sans présumer du format
de publication final des plugins.

## Questions de relecture

| Critère | Question à trancher sur les images |
|---|---|
| Attrait visuel | Les courbes, les proportions et les rencontres de couleur donnent-elles envie de regarder le signe ? |
| Parenté | La famille reste-t-elle identifiable sans noms et en changeant l'ordre des quatre logos ? |
| Différenciation | Chaque produit conserve-t-il un contour reconnaissable lorsque les couleurs sont neutralisées ? |
| Abstraction | Le signe existe-t-il visuellement avant la lecture de son explication ? |
| Rapport au produit | Le mouvement proposé reste-t-il perceptible : relier, concentrer, déployer ou parcourir ? |
| Réduction | Les vides et les passages déterminants restent-ils visibles à 64 pixels ? |
| Richesse colorée | Les nuances et les couleurs de rencontre construisent-elles un dessin intérieur intéressant dans chacun des quatre signes ? |
| Aplats | Chaque région est-elle uniforme et opaque, sans dégradé ni transition diffuse ? |
| Lumière | Les régions claires précisent-elles les plis et les intersections ? |
| Cadrage | Les quatre signes occupent-ils le carré avec une présence comparable ? |

Une forme belle mais trop voisine d'une autre demande un travail de silhouette.
Une forme lisible mais peu intéressante demande un travail de courbe ou de
proportion. Décrire le défaut observé avant de modifier les régions colorées.

## Livrables

Ranger les essais dans un sous-dossier `Explorations/`, puis dans un dossier
par série. Employer les noms `ucm-toolkit`, `ucm-contract-exporter`,
`ucm-palettes` et `ucm-token-explorer` pour les fichiers.

Pour la première passe, fournir :

- douze images individuelles carrées, idéalement à 1024 × 1024 pixels ou plus ;
- une planche carrée sans texte par série, avec les quatre images sur une grille
  de deux colonnes et deux lignes ;
- les comparaisons de réduction et de silhouette ;
- les sources éditables ou les paramètres et consignes de génération réellement
  employés, selon le moyen choisi ;
- un court compte rendu Markdown avec les chemins des images, les différences
  entre séries, les défauts observés et la famille recommandée.

Sur les planches, placer Toolkit en haut à gauche, Exporter en haut à droite,
Palettes en bas à gauche et Explorer en bas à droite. L'ordre et les noms de
fichier identifient les produits sans inscrire de légende dans les images.

Choisir le moyen de production adapté au rendu : dessin vectoriel, rendu de
volume en aplats ou génération d'images. Contrôler les images produites : les
reflets dégradés et les transparences contreviennent au brief même si le
résultat semble optique. Une vectorisation finale peut suivre le choix des
formes. L'exploration remet des propositions à examiner ; leur intégration
dans les plugins constitue un travail ultérieur.

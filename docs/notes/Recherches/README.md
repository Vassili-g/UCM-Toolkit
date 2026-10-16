# État des recherches UCM

Ce dossier ne garde que les sujets en cours et les pistes de recherche. Les
sujets implémentés sont rangés dans `docs/notes/Archives/`, en attente de
suppression ; les liens ci-dessous qui y mènent pointent vers le commit
`5fc8c75` et restent valides après la suppression.

Pour modifier le produit, partez des références de
[docs/README.md](../../README.md) et du code, pas d'un plan archivé.

## Sujets en cours

| Sujet | État | Prochain geste |
|---|---|---|
| [Recette v10 de Palettes](./Plugin%20Palettes/Recette%20v10/README.md) | R2 à R6 implémentés ; R1 attend la décision D1 ; rampes Dark sans ancrage mesurées | Décision D1 du mainteneur, puis recette Figma |
| [Référentiel UCM](./Référentiel%20UCM/README.md) | Audit fait, décisions prises, [plan par lots](./Référentiel%20UCM/PLAN-IMPLEMENTATION.md) | Lot 1 |
| [Architecture globale UCM](./Architecture%20globale%20UCM%20et%20UCM%20Architect/VERSION-MINIMALE.md) | Version minimale retenue, non implémentée : fichier de conventions, `$description` publiée, onglet Intégrations retiré, état `selected` | Décision de mise en œuvre ; le reste du dossier est une piste |
| [Architecture multi-marques](Archi%20Tokens%20Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html) | Référence actuelle : collections, panneau des variables et rôles de `theme` | Actualiser les données du panneau après un export ; les évolutions ouvertes restent séparées dans le dossier |

La [spécification de Palettes](./Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md)
reste dans ce dossier jusqu'à son déplacement dans `packages/plugin-palettes/` :
c'est une référence du produit, pas une recherche.

## Pistes conservées

| Sujet | État |
|---|---|
| [Diff sémantique](./Diff%20Sémantique/PLAN-DIFF-SEMANTIQUE.md) | Proposé ; aucune commande `ucm diff` dans le CLI |
| [Conformité du rendu](./Linter%20Dev/PLAN-CONFORMITE-RENDU.md) | Non implémentée ; la parité TypeScript ne compare pas le rendu |
| [Coût de génération et implémenteur](./Optimisation%20Tokens/README.md) | Mesures et conception d'un compilateur ; aucun paquet d'implémenteur |
| [Comparaison des outils de palettes](./Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-CONCURRENCE-PALETTES.md) | Vision simulée, Display P3, APCA, sélection et jeu de départ |
| [Évolutions globales](./Evolutions%20globales/PISTES-EVOLUTION.md) | Catalogue d'options à confronter au format courant |
| [UCM Architect et nomenclature](./Architecture%20globale%20UCM%20et%20UCM%20Architect/ARCHITECTURE-GLOBALE-UCM.md) | Pistes : le plugin d'architecture intéresse le mainteneur, sans décision ; il lira le référentiel UCM |

Les comparatifs externes doivent être revérifiés avant une décision : tarifs,
versions et fonctions changent.

## Questions ouvertes reprises des sujets archivés

| Question | Origine |
|---|---|
| L'ombre ou le contour de la carte en Dark | [Recette critique, décisions, section 7](https://github.com/Vassili-g/UCM-Toolkit/blob/5fc8c75/docs/notes/Recherches/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/DECISIONS.md#7-ce-qui-reste-ouvert) |
| En Dark inversé, l'appui du fond teinté (500) a la couleur de l'appui du bouton plein | Même section |
| Les seuils des constats de saturation et de luminosité de l'onglet Comparaison, valeurs d'essai | Même section |
| L'alignement de la luminosité d'un groupe de palettes (D3 à D7) ; la comparaison seule est implémentée | [Dossier Harmonisation, section 8](https://github.com/Vassili-g/UCM-Toolkit/blob/5fc8c75/docs/notes/Recherches/Plugin%20Palettes/Harmonisation%20entre%20palettes/DOSSIER-HARMONISATION.md#8-décisions-attendues-du-mainteneur) |
| Cinq écarts de la vue composant de l'explorateur avec son plan ou sa maquette | [Suivi de la vue composant](https://github.com/Vassili-g/UCM-Toolkit/blob/5fc8c75/docs/notes/Recherches/Plugin%20Explorateur%20Tokens/Vue%20composant/SUIVI-VUE-COMPOSANT.md#écarts-avec-le-plan-ou-la-maquette-à-relire) |
| La gestion des marques, le jeu de départ et la vision simulée dans Palettes | [Parcours 01 à 06](https://github.com/Vassili-g/UCM-Toolkit/tree/5fc8c75/docs/notes/Recherches/Plugin%20Palettes/Int%C3%A9gration%20du%20march%C3%A9) |

## Recettes Figma en attente

Ces fonctions sont implémentées. Leur liste de gestes reste lisible au
commit `5fc8c75`.

| Fonction | Gestes à vérifier |
|---|---|
| Qualité des palettes, onglet Comparaison | [Tâche F4](https://github.com/Vassili-g/UCM-Toolkit/blob/5fc8c75/docs/notes/Recherches/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/PLAN-IMPLEMENTATION.md) |
| Moteur retenu, profils Soft et Vivid | [Recette du moteur](https://github.com/Vassili-g/UCM-Toolkit/blob/5fc8c75/docs/notes/Recherches/Plugin%20Palettes/Recette%20moteur%20palettes/README.md) |
| Thème en dossiers et texte des boutons | [Décisions du texte des boutons](https://github.com/Vassili-g/UCM-Toolkit/blob/5fc8c75/docs/notes/Recherches/Plugin%20Palettes/Texte%20des%20boutons/README.md) |
| Création, Vérification, Gestion | [Recette de la direction simple](https://github.com/Vassili-g/UCM-Toolkit/blob/5fc8c75/docs/notes/Recherches/Plugin%20Palettes/Int%C3%A9gration%20du%20march%C3%A9/07%20Direction%20simple/RECETTE-DIRECTION-SIMPLE.md) |
| Vue composant de l'explorateur | [Recette de la vue composant](https://github.com/Vassili-g/UCM-Toolkit/blob/5fc8c75/docs/notes/Recherches/Plugin%20Explorateur%20Tokens/Vue%20composant/RECETTE-VUE-COMPOSANT.md) |

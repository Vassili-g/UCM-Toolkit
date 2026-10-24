# État des recherches UCM

Ce dossier ne garde que les sujets en cours et les pistes de recherche. Les
sujets implémentés sont rangés dans `docs/notes/Archives/`, en attente de
suppression ; les liens ci-dessous qui y mènent pointent vers le commit
`202f46e` et restent valides après la suppression.

Pour modifier le produit, partez des références de
[docs/README.md](../../README.md) et du code, pas d'un plan archivé.

## Sujets en cours

| Sujet | État | Prochain geste |
|---|---|---|
| [Kits UCM et partage des données](./Kits%20UCM%20et%20partage%20des%20donnees/REVIEW-KITS-UCM-ET-PARTAGE-DES-DONNEES.md) | Revue du référentiel, des protocoles et de leurs consommateurs ; douze constats | Corriger les conclusions erronées du profil et de la comparaison d'exports, puis compléter les API communes du kit |
| [Recette v10 de Palettes](./Plugin%20Palettes/Recette%20v10/README.md) | R2 à R6 implémentés ; R1 attend la décision D1 ; rampes Dark sans ancrage mesurées | Décision D1 du mainteneur, puis recette Figma |
| [Référentiel UCM](./Référentiel%20UCM/README.md) | Lots 0 à 18 du [plan par lots](./Référentiel%20UCM/PLAN-IMPLEMENTATION.md) faits, kit 0.7.0 publié | Lot 19 : recette d'UCM Architect dans Figma, puis export des tokens |
| [Nomenclature, ex-Architect](./Plugin%20Architect/README.md) | Repris depuis le début. La v1 normalise les noms ; l'architecture globale UCM et les explorations de la suite y sont regroupées | Le mainteneur parcourt les maquettes et les réflexions |
| [UCM Architect](./UCM%20Architect/README.md) | Fusion de l'explorateur et de Nomenclature : préparation, grammaire des composants, maquettes, plans d'implémentation, recette v1, vitesse de l'analyse | Recette Figma de la recette v1 |
| [Guide des agents](./Guide%20des%20agents/README.md) | Découpage d'`AGENTS.md` fait : index, guides et invariants par paquet, convention compacte | Essais Codex et `/context` du mainteneur |
| [Crans clairs des palettes](./SUJETS%20IMPORTANTS%20%C3%A0%20trancher/README.md) | Remarques du mainteneur sur ses composants : crans clairs, texte de `surface`, noms des variables, contexte des composants ; maquette des solutions | Le mainteneur parcourt la maquette ; aucune solution décidée |
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
Les comparatifs externes doivent être revérifiés avant une décision : tarifs,
versions et fonctions changent.

## Questions ouvertes reprises des sujets archivés

| Question | Origine |
|---|---|
| L'ombre ou le contour de la carte en Dark | [Recette critique, décisions, section 7](https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/DECISIONS.md#7-ce-qui-reste-ouvert) |
| En Dark inversé, l'appui du fond teinté (500) a la couleur de l'appui du bouton plein | Même section |
| Les seuils des constats de saturation et de luminosité de l'onglet Comparaison, valeurs d'essai | Même section |
| L'alignement de la luminosité d'un groupe de palettes (D3 à D7) ; la comparaison seule est implémentée | [Dossier Harmonisation, section 8](https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Palettes/Harmonisation%20entre%20palettes/DOSSIER-HARMONISATION.md#8-décisions-attendues-du-mainteneur) |
| Cinq écarts de la vue composant de l'explorateur avec son plan ou sa maquette | [Suivi de la vue composant](https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Explorateur%20Tokens/Vue%20composant/SUIVI-VUE-COMPOSANT.md#écarts-avec-le-plan-ou-la-maquette-à-relire) |
| La gestion des marques, le jeu de départ et la vision simulée dans Palettes | [Parcours 01 à 06](https://github.com/Vassili-g/UCM-Toolkit/tree/202f46e/docs/notes/Recherches/Plugin%20Palettes/Int%C3%A9gration%20du%20march%C3%A9) |

## Recettes Figma en attente

Ces fonctions sont implémentées. Leur liste de gestes reste lisible au
commit `202f46e`.

| Fonction | Gestes à vérifier |
|---|---|
| Qualité des palettes, onglet Comparaison | [Tâche F4](https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/PLAN-IMPLEMENTATION.md) |
| Moteur retenu, profils Soft et Vivid | [Recette du moteur](https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Palettes/Recette%20moteur%20palettes/README.md) |
| Thème en dossiers et texte des boutons | [Décisions du texte des boutons](https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Palettes/Texte%20des%20boutons/README.md) |
| Création, Vérification, Gestion | [Recette de la direction simple](https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Palettes/Int%C3%A9gration%20du%20march%C3%A9/07%20Direction%20simple/RECETTE-DIRECTION-SIMPLE.md) |
| Vue composant de l'explorateur | [Recette de la vue composant](https://github.com/Vassili-g/UCM-Toolkit/blob/202f46e/docs/notes/Recherches/Plugin%20Explorateur%20Tokens/Vue%20composant/RECETTE-VUE-COMPOSANT.md) |

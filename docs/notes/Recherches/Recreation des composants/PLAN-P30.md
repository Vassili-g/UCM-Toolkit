# Plan de P30 : recréer en UCM les composants de la bibliothèque existante

Ce plan suit la piste P30 de `docs/notes/Recherches/Evolutions globales/pistes.json` et la [recherche](./RECHERCHE-RECREATION-DES-COMPOSANTS.md). Chaque case cochée porte le hash de son commit.

## Règle du plan

- Aucune donnée du client n'entre dans un fichier suivi par Git d'UCM-Toolkit : relevés, planches, cahiers et suivi par composant vivent dans `_local/recreation-composants/`.
- Les scripts du relevé, du banc et du contrôle sont génériques et testés sur des composants inventés.
- Aucun lot de code ne commence avant la case 1.2.

## Étape 1. Cadrage

- [ ] 1.0 Dresser la carte du workflow et la critiquer jusqu'à saturation (passes 1 à 5 de `CARTE-DU-WORKFLOW.md`).
- [ ] 1.1 (mainteneur). Répondre aux questions de la recherche et de la carte.
- [ ] 1.2 Écrire les lots d'implémentation des étapes 3 à 5 et leurs cas de test, d'après les réponses de 1.1.

## Étape 2. Marques

- [ ] 2.1 (mainteneur). Calculer dans UCM Palettes les palettes des 9 marques, et les écrire comme modes de l'axe des marques d'intencial-library.

## Étape 3. Relevé du code

- [ ] 3.1 Script du relevé, sur la v1 et la v2 : API, styles conditionnels, valeurs dessinées, icônes, composition, comportements, textes par défaut, une fiche par composant.
- [ ] 3.2 Relevé des usages dans les applications consommatrices : il fixe ce que chaque composant doit garder.
- [ ] 3.3 Relevé des candidats : composants d'Ant Design importés directement par les applications, composants locaux employés dans plusieurs fichiers, structures JSX recopiées ; une liste que le mainteneur tranche.
- [ ] 3.4 Relevé de la library Figma actuelle : jeux de variants, axes, valeurs et propriétés, lus par un plugin de relevé que le mainteneur lance, puis comparés au relevé du code.

## Étape 4. Banc de rendu

- [ ] 4.1 Installer la bibliothèque source en local et lancer son Storybook.
- [ ] 4.2 Générer les stories de combinaisons, d'états forcés et de marques, avec les calques qu'antd dessinait ouverts.
- [ ] 4.3 Capturer chaque combinaison et relever ses styles calculés ; rendre une planche par composant.

## Étape 5. Correspondance et cahier

- [ ] 5.1 Proposer pour chaque valeur relevée la valeur UCM la plus proche, avec l'écart, et grouper les valeurs voisines.
- [ ] 5.2 Rendre le cahier court et la liste de couverture de chaque composant.
- [ ] 5.3 Script du contrôle de couverture : contrat exporté contre relevé et liste de couverture.

## Étape 6. Pilote

- [ ] 6.1 (mainteneur). Valider le cahier de Tag, Button et Alert.
- [ ] 6.2 (mainteneur). Reconcevoir Tag, Button et Alert dans Figma et les exporter dans intencial-library ; chronométrer la part répétitive du travail sur le Button (Q50). Les icônes viennent de P32, et la construction de P31 s'essaie sur le Button.
- [ ] 6.3 Passer le contrôle de couverture sur les trois contrats, corriger la méthode, et décider la déclinaison par script (Q30).
- [ ] 6.4 Rejouer les passes 3 à 5 de la carte du workflow et réviser le plan avant le passage en masse.

## Étape 7. Passage en masse

- [ ] 7.1 (attend P22). Relever, cahier, reconcevoir, exporter et contrôler chaque composant retenu, dans l'ordre du graphe de composition.
- [ ] 7.2 Reconstruire le code de chaque composant dans intencial-library depuis son contrat, avec la parité de l'adaptateur.

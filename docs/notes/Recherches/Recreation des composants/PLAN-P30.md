# Plan de P30 : recréer en UCM les composants de la bibliothèque existante

Ce plan suit la piste P30 de `docs/notes/Recherches/Evolutions globales/pistes.json`, la [recherche](./RECHERCHE-RECREATION-DES-COMPOSANTS.md) et la [carte du workflow](./CARTE-DU-WORKFLOW.md). Chaque case cochée porte le hash de son commit.

## Règle du plan

- Aucune donnée du client n'entre dans un fichier suivi par Git d'UCM-Toolkit : relevés, planches, cahiers et registre vivent dans `_local/recreation-composants/`.
- Les scripts du relevé, du banc, du contrôle et du registre sont génériques, testés sur des composants inventés, et se suppriment à la fin de la migration des applications.
- Le chantier livre aux développeurs ce qui rend la migration des applications facile ; les développeurs la font.
- Aucun lot de code ne commence avant la case 1.4.

## Étape 1. Cadrage

- [x] 1.0 Dresser la carte du workflow et la critiquer (passes 1 à 3 de la carte). (c9254d63)
- [x] 1.1 (mainteneur). Trancher les décisions qui bloquent le relevé : fusion de la v1 et de la v2, durée de vie des scripts, forme du relevé. (4fd492c0)
- [ ] 1.2 (mainteneur). Obtenir des développeurs la liste des marques actives.
- [ ] 1.3 Vérifier dans les dépôts les points « à vérifier » de la carte (passe 4).
- [ ] 1.4 Écrire les lots d'implémentation des étapes 2, 4, 5 et 8 et leurs cas de test.

## Étape 2. Relevé

- [ ] 2.1 Script du relevé du code, sur la v1 et la v2 : API, styles conditionnels, valeurs dessinées, icônes, composition, accessibilité, responsive, comportements, textes par défaut ; une fiche par composant, en forme de contrat UCM, complétée par un agent dont chaque ligne est marquée « à confirmer ».
- [ ] 2.2 Relevé des usages dans les applications : chaque composant, prop et valeur employés, par application et par fichier.
- [ ] 2.3 Relevé des candidats : composants d'Ant Design importés directement, composants locaux employés dans plusieurs fichiers, structures recopiées.
- [x] 2.4 Plugin de relevé de la library Figma actuelle : jeux de variants, axes, valeurs et propriétés. Plugin local, hors de Git, dans `_local/recreation-composants/releve-figma/`.
- [x] 2.5 (mainteneur). Lancer le plugin de relevé dans la library Figma actuelle.
- [ ] 2.6 Première version du registre, servie par `npm run registre` : une fiche par composant et par candidat, avec ses usages, sa comparaison avec la library Figma actuelle et l'avancement que le mainteneur y note.

## Étape 3. Marques

- [ ] 3.1 (mainteneur, attend 1.2). Calculer dans UCM Palettes les palettes des marques actives, et les écrire comme modes de l'axe des marques d'intencial-library.

## Étape 4. Banc de rendu

- [ ] 4.1 Installer la v1 et la v2 en local et lancer leurs Storybook.
- [ ] 4.2 Générer les stories de combinaisons, d'états forcés, de marques et de largeurs d'écran, avec les calques qu'Ant Design dessinait ouverts.
- [ ] 4.3 Capturer chaque combinaison et relever ses styles calculés ; ajouter la planche de chaque composant au registre.

## Étape 5. Cahier

- [ ] 5.1 Proposer pour chaque valeur relevée la valeur UCM la plus proche, avec l'écart, et grouper les valeurs voisines.
- [ ] 5.2 Ajouter au registre le cahier et la liste de couverture de chaque composant.
- [ ] 5.3 Script du contrôle de couverture : contrat exporté contre relevé et liste de couverture.

## Étape 6. Pilote

- [ ] 6.1 (mainteneur). Valider le cahier de Tag, Button et Alert.
- [ ] 6.2 (mainteneur). Reconcevoir Tag, Button et Alert dans Figma et les exporter dans intencial-library ; chronométrer la part répétitive du travail sur le Button (Q50). Les icônes viennent de P32, et la construction de P31 s'essaie sur le Button.
- [ ] 6.3 Passer le contrôle de couverture sur les trois contrats, corriger la méthode, et décider la déclinaison par script (Q30).
- [ ] 6.4 Rejouer la critique de la carte (passes 3 et 5) et réviser le plan avant le passage en masse.

## Étape 7. Passage en masse

- [ ] 7.1 (attend P22). Relever, cahier, reconcevoir, exporter et contrôler chaque composant retenu, dans l'ordre du graphe de composition.

## Étape 8. Code et migration

- [ ] 8.1 Reconstruire le code de chaque composant dans intencial-library depuis son contrat, avec la parité de l'adaptateur.
- [ ] 8.2 Écrire pour les développeurs un guide par composant, tiré de la table de correspondance de l'ancienne API vers la nouvelle.
- [ ] 8.3 Écrire les codemods de la table, testés sur des fichiers avant et après, avec le rapport des appels qu'ils ne savent pas réécrire.
- [ ] 8.4 Rendre, par application et par fichier, la liste des appels à réécrire.

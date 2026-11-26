# Plan de P31 : UCM Architect construit un composant

Ce plan suit la piste P31 de `docs/notes/Recherches/Evolutions globales/pistes.json` et la [recherche](./RECHERCHE-CONSTRUCTION-DES-COMPOSANTS.md). Chaque case cochée porte le hash de son commit.

## Règle du plan

- Les essais emploient des composants inventés ou les captures de `_local/recettes/` ; aucune donnée du client n'entre dans un fichier suivi par Git.
- Toute liaison dont la cible n'est pas exacte et unique devient une question.
- Aucun lot de code ne commence avant la case 3.1.

## Étape 1. Mesure et conception

- [ ] 1.1 Mesurer la Préparation sur la capture du Button de `_local/recettes/` : variables proposées, cible de chaque valeur d'axe, questions, valeurs restées en dur, liaisons que le designer poserait encore à la main.
- [ ] 1.2 Note de conception : création du jeu de variants, déclinaison d'une variante de référence, enchaînement Préparer, Créer et Lier, d'après 1.1 et les réponses aux questions.
- [ ] 1.3 (mainteneur). Répondre aux questions de la recherche et valider la note.

## Étape 2. Interface

- [ ] 2.1 Maquettes des écrans du mode Composant que la construction ajoute ou change, sur la galerie réelle, en sombre.
- [ ] 2.2 (mainteneur). Valider les maquettes.

## Étape 3. Implémentation

- [ ] 3.1 Écrire les lots d'implémentation et leurs cas de test, d'après 1.3 et 2.2.
- [ ] 3.2 (mainteneur). Essayer la construction dans Figma sur le Button du pilote de P30.

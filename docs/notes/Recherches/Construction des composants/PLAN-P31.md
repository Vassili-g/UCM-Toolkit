# Plan de P31 : UCM Architect construit un composant

Ce plan suit la piste P31 de `docs/notes/Recherches/Evolutions globales/pistes.json` et la [recherche](./RECHERCHE-CONSTRUCTION-DES-COMPOSANTS.md). Chaque case cochée porte le hash de son commit.

## Règle du plan

- Les essais emploient des composants inventés ou les captures de `_local/recettes/` ; aucune donnée du client n'entre dans un fichier suivi par Git.
- Toute liaison dont la cible n'est pas exacte et unique devient une question.
- Aucun lot de code ne commence avant la case 3.1.

## Étape 1. Mesure et conception

- [ ] 1.1 Mesurer la Préparation sur la capture du Button de `_local/recettes/` : variables proposées, cible de chaque valeur d'axe, questions, valeurs restées en dur, liaisons que le designer poserait encore à la main.
- [ ] 1.1b Refaire la mesure sur un composant dessiné en dur : le Button capturé est déjà relié (section 6 de la recherche).
- [ ] 1.2 Note de conception de l'expérience « Relier le composant » (sections 7 à 9 de la recherche), commune au full UCM et à l'agnostique : création du jeu de variants, question par emplacement, token de chaque variante, aperçu, d'après 1.1 et les réponses aux questions.
- [ ] 1.3 (mainteneur). Répondre aux questions de la recherche et valider la note.

## Étape 2. Interface

- [ ] 2.1 Maquette de l'expérience « Relier le composant », sur la galerie réelle, en sombre : réglage de l'étape 1 en agnostique, question par emplacement, aperçu sur variantes contrastées, liste par variante, et le même écran en full UCM.
- [ ] 2.2 (mainteneur). Valider la maquette. Sans validation, la Préparation et les corrections actuelles restent, et seuls les gains de précision de la section 8 se livrent (décision Q7).

## Étape 3. Implémentation

- [ ] 3.1 Écrire les lots d'implémentation et leurs cas de test, d'après 1.3 et 2.2.
- [ ] 3.2 À la livraison, mettre à jour les textes qui réservent Architect au full UCM : `CONCEPT.md`, `README.md`, `packages/plugin-architect/SPEC.md`, la conception P28 et le risque de P28 dans `pistes.json`.
- [ ] 3.3 (mainteneur). Essayer la construction dans Figma sur le Button du pilote de P30, et la liaison dans un fichier non UCM.

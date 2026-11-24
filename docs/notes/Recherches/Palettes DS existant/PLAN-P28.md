# Plan de P28 : une échelle imposée dans UCM Palettes

Ce plan suit la piste P28 de `docs/notes/Recherches/Evolutions globales/pistes.json` et la [recherche](./RECHERCHE-PALETTES-DS-EXISTANT.md). Il mène à une preuve de concept que le mainteneur valide, puis que le lead UX du client voit, avant tout changement de la bibliothèque des primitives ou de celle des marques. Chaque case cochée porte le hash de son commit.

## Règle du plan

- Aucune donnée du client n'entre dans un fichier suivi par Git : ni nom de marque, ni nom de palette du client, ni valeur de couleur. La page de preuve de concept et ses données vivent dans `_local/p28/`.
- Aucun lot d'implémentation ne commence avant la case 3.1.
- Les deux exports du client (architecture d'octobre, primitives) sont toute la donnée : aucun autre export n'est demandé.

## Étape 1. Conception

- [ ] 1.1 Note de conception `CONCEPTION-ECHELLE-IMPOSEE.md` : nuances de marque multiples par primitive, courbes candidates des clairs, nuances foncées gardées et leurs limites, thème Dark et accents, un modèle des marqueurs `-[light]` et `-[dark]` qui dit sans ambiguïté le texte attendu sur chaque nuance, sans casser les noms ni les alias, activation et désactivation de l'échelle imposée, interface de Palettes écran par écran, répercussions sur le moteur, le kit, UCM Architect et les documents.
- [ ] 1.2 Page de preuve de concept dans `_local/p28/poc/` : composants de la structure du client (Button et ses variantes, chips, tags, alertes), rendus avec les primitives actuelles et chaque courbe candidate, en Light et en Dark, avec les contrastes mesurés.
- [ ] 1.3 (mainteneur). Valider la note et la page, sur le plan visuel et sur le plan du concept.

## Étape 2. Interface de Palettes

- [ ] 2.1 Maquettes des écrans de Palettes que l'échelle imposée change, sur la galerie réelle, en sombre.
- [ ] 2.2 (mainteneur). Valider les maquettes.

## Étape 3. Lead UX

- [ ] 3.1 (mainteneur). Montrer la preuve de concept au lead UX. Il choisit la courbe des clairs, le modèle des marqueurs et le traitement du Dark.

## Étape 4. Plan d'implémentation

- [ ] 4.1 Écrire les lots d'implémentation et leurs cas de test, d'après les choix de 1.3, 2.2 et 3.1.

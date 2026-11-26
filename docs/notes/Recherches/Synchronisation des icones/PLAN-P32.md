# Plan de P32 : synchroniser les icônes FontAwesome dans Figma

Ce plan suit la piste P32 de `docs/notes/Recherches/Evolutions globales/pistes.json` et la [recherche](./RECHERCHE-SYNCHRONISATION-DES-ICONES.md). Chaque case cochée porte le hash de son commit.

## Règle du plan

- La liste des icônes qu'un client emploie vit dans `_local/` ; les essais suivis par Git emploient des icônes gratuites de FontAwesome.
- Aucun jeton FontAwesome n'entre dans un fichier suivi par Git, ni dans le code du plugin.
- Aucun lot de code ne commence avant la case 3.3.

## Étape 1. Cadrage

- [ ] 1.1 Recherche : licence, source des tracés à jour, plugins existants, relevé des icônes dans un dépôt React.
- [ ] 1.2 (mainteneur). Répondre aux questions de la recherche.

## Étape 2. Relevé des icônes employées

- [ ] 2.1 Script qui liste, pour un ou plusieurs dépôts, chaque icône employée avec son style et les fichiers qui l'emploient ; une icône nommée par une valeur calculée devient une question.

## Étape 3. Plugin

- [ ] 3.1 Maquettes des écrans de la synchronisation, sur la galerie réelle, en sombre.
- [ ] 3.2 (mainteneur). Valider les maquettes.
- [ ] 3.3 Écrire les lots d'implémentation et leurs cas de test, d'après 1.2 et 3.2.
- [ ] 3.4 (mainteneur). Lancer la première synchronisation dans la library Figma.

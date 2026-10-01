# Intégration du marché dans UCM Palettes

Ce dossier range les propositions qui placent dans UCM Palettes les apports
retenus par [la comparaison avec les outils du
marché](../1 Recherche initiale/RECHERCHE-CONCURRENCE-PALETTES.md) : l'écriture des variables
`primitives`, `brand` et `theme`, la couleur de la sélection, le jeu de départ
et la vision simulée. Il s'adresse au mainteneur, qui décide, et à l'agent qui
écrira le plan d'implémentation.

Aucun document de ce dossier ne décide. La [spécification](../1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md)
reste l'autorité sur le comportement du plugin.

## Ordre de lecture

Chaque dossier corrige le précédent. Le dernier fait foi sur les points qu'il
traite ; un point qu'il ne traite pas se lit dans le dossier qui l'a traité en
dernier.

| Dossier | Contenu | Statut |
|---|---|---|
| [01 Proposition initiale](./01%20Proposition%20initiale/PROPOSITION-INITIALE.md) | Dix pistes : rôle de la palette, un état et un geste par palette, revue avant écriture, retouches, jeu de départ, sélection, vision simulée, fonds, carte Variables, aides. Maquettes et leur générateur | Remplacée par 03 |
| [02 Revue atelier](./02%20Revue%20atelier/REVUE-ET-PROTOTYPE-ATELIER.html) | Quinze constats sur la proposition initiale, et un prototype interactif en trois onglets Palettes, Vérifier, Appliquer, moteur embarqué | Constats repris par 03 ; parcours repris par 04 |
| [03 Proposition finale](./03%20Proposition%20finale/PROPOSITION-FINALE.md) | Fusion de 01 et 02, revue par douze scénarios : onglets Système et Palette, quatorze pistes, dix-neuf décisions, règles d'écriture des variables, cas limites, essais dans Figma. Maquettes et leur générateur | Référence pour les règles d'écriture et les cas limites |
| [04 Parcours en trois étapes](./04%20Parcours%20en%20trois%20%C3%A9tapes/PROPOSITION-TROIS-ETAPES.html) | Retour au parcours de l'atelier : trois questions du designer, cinq règles, neuf écrans | Référence pour l'organisation des écrans et les mots, sous les réserves de 05 |
| [05 Revue critique](./05%20Revue%20critique/REVUE-CRITIQUE-TROIS-ETAPES.md) | Revue de 04 contre la demande initiale et les propositions 01 à 03 : cas limites absents, vue du système retirée, correction qui abîme la rampe, destination sans contraintes. Script de mesure | À prendre en compte par 06 |
| [06 Direction globale](./06%20Direction%20globale/DIRECTION-GLOBALE.md) | La direction qui assemble 03, 04 et 05 : trois onglets Palette, Vérifier et Système, les règles d'écriture des variables, la correction bornée par la régularité, onze cas limites, vingt et une décisions, l'inventaire de toutes les modifications ; une maquette interactive à vingt-six scénarios, ses scripts de génération, de mesure et de vérification | Remplacée par 07 pour le parcours ; référence pour les essais dans Figma et les cas limites de l'écriture |
| [07 Direction simple](./07%20Direction%20simple/PLAN-DIRECTION-SIMPLE.md) | Le parcours en trois onglets, Création, Vérification et Gestion : l'encart du fichier vide, l'écriture d'une palette dans `primitives`, l'état des tokens et de la planche par palette, les palettes que le fichier porte déjà. Sans marques ni jeu de départ. Dix-neuf points validés, quatre questions, dix essais, cinq lots ; onze maquettes en thème sombre et leur générateur | Validée en partie |

## Régénérer les pages

Les couleurs, les garanties et les comptes des pages sortent du moteur. Chaque
page se régénère depuis la racine du dépôt :

```sh
node --import tsx "docs/notes/Recherches/Plugin Palettes/Intégration du marché/01 Proposition initiale/generer-maquettes-proposition-initiale.mjs"
node "docs/notes/Recherches/Plugin Palettes/Intégration du marché/02 Revue atelier/integrer-moteur-prototype-atelier.mjs"
node --import tsx "docs/notes/Recherches/Plugin Palettes/Intégration du marché/03 Proposition finale/generer-maquettes-proposition-finale.mjs"
node --import tsx "docs/notes/Recherches/Plugin Palettes/Intégration du marché/04 Parcours en trois étapes/generer-proposition-trois-etapes.mjs"
node --import tsx "docs/notes/Recherches/Plugin Palettes/Intégration du marché/05 Revue critique/mesurer-revue-critique.mjs"
node --import tsx "docs/notes/Recherches/Plugin Palettes/Intégration du marché/06 Direction globale/generer-maquette-direction-globale.mjs"
npm run galerie --workspace ucm-palettes-plugin
node "docs/notes/Recherches/Plugin Palettes/Intégration du marché/07 Direction simple/generer-maquettes-direction-simple.mjs"
```

Le script de l'atelier réécrit le moteur embarqué dans sa page ; les autres
réécrivent leur page entière. Celui de la direction simple part de la galerie
du plugin construit, que la commande qui le précède écrit.

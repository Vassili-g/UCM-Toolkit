# UCM Architect

Ce dossier prépare UCM Architect, qui remplace UCM Token Explorer
(`packages/plugin-explorateur`) et UCM Nomenclature
(`packages/plugin-nomenclature`). Ces deux noms disparaissent avec la fusion.
Le mode Composant valide un composant et aide à lier ses variables ; le mode
Tokens affiche Nomenclature à côté de l'arbre des variables.

## 1 Conception

| Document | Contenu |
|---|---|
| [PREPARATION-ARCHITECT.md](./1%20Conception/PREPARATION-ARCHITECT.md) | Les demandes du mainteneur, l'existant, les contraintes, chaque fonction possible avec sa faisabilité et son utilité, l'avis, l'ordre proposé et les décisions |
| [GRAMMAIRE-DES-COMPOSANTS.md](./1%20Conception/GRAMMAIRE-DES-COMPOSANTS.md) | Forme des chemins de `components`, ses règles, et les écarts qu'Architect relèverait sur l'export du mainteneur |
| [APERCU-GENERATION-TOKENS-COMPOSANT.md](./1%20Conception/APERCU-GENERATION-TOKENS-COMPOSANT.md) | Ce que donnerait la préparation des tokens d'un composant : déductions, questions, parcours entre les deux fichiers, prérequis, coût et avis |

## 2 Maquettes

| Document | Contenu |
|---|---|
| [MAQUETTE-ARCHITECT.html](./2%20Maquettes/MAQUETTE-ARCHITECT.html) | Les maquettes validées après trois tours de recette (`6cf27974`), sur les écrans réels figés de l'explorateur et de Nomenclature. Elles font autorité pour l'implémentation |
| [architect.css](./2%20Maquettes/architect.css) | La feuille des éléments nouveaux, référence des valeurs de style |
| [REVUE-UX-MAQUETTES.html](./2%20Maquettes/REVUE-UX-MAQUETTES.html) | La revue d'un designer UX sur la deuxième version |
| `Mesures/extraire-galerie.mjs` | Fige les états des galeries dans `galerie/` |
| `Mesures/auditer-maquette.mjs` | Contrôle la maquette sans capture : erreurs, cadres vides, débordements, style des chemins |
| `Mesures/capturer-cadres.mjs` | Capture un cadre de la maquette par identifiant |

## 3 Plan

| Document | Contenu |
|---|---|
| [PLAN-IMPLEMENTATION.md](./3%20Plan/PLAN-IMPLEMENTATION.md) | Le plan de l'orchestrateur : décisions, méthode de travail parallèle avec Codex, pistes par paquet, vagues, fiches de lots, notes à écrire, jalons et questions de fin |

## 4 Recette v1

| Document | Contenu |
|---|---|
| [ANALYSE-RECETTE-V1.md](https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/UCM%20Architect/4%20Recette%20v1/ANALYSE-RECETTE-V1.md) | La carte du stroke d'Alert (faux constat C29 sur les layers sans contour), le rangement du panneau par élément, la liste des signes des sortes d'objets, et les décisions R-1 à R-10 |
| [MAQUETTE-RECETTE-V1.html](https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/UCM%20Architect/4%20Recette%20v1/MAQUETTE-RECETTE-V1.html) | Les propositions sur les écrans réels figés de la galerie d'Architect, et la planche des signes |
| [recette.css](https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/UCM%20Architect/4%20Recette%20v1/recette.css) | La feuille des éléments nouveaux de la maquette |
| [PLAN-IMPLEMENTATION-RECETTE-V1.md](https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/UCM%20Architect/4%20Recette%20v1/PLAN-IMPLEMENTATION-RECETTE-V1.md) | Les lots K1 à G1, chacun avec son agent et son commit, et ce qui reste ouvert |
| `Mesures/extraire-galerie.mjs` | Fige les états du mode Composant dans `galerie/` |
| `Mesures/capturer.mjs` | Capture une page ou un élément, et rend les erreurs de la console |

## 5 Vitesse de l'analyse

| Document | Contenu |
|---|---|
| [RECHERCHE-VITESSE-ANALYSE.md](./5%20Vitesse%20de%20l'analyse/RECHERCHE-VITESSE-ANALYSE.md) | Où passe le temps de l'analyse d'un composant, les recherches sur Figma et la littérature, les leviers V1 à V9 et les décisions Q1 à Q3 |
| [MAQUETTE-PROGRESSION.html](./5%20Vitesse%20de%20l'analyse/MAQUETTE-PROGRESSION.html) | La barre de progression, la phase en cours et les premiers points avant la fin |
| [CHECKLIST-IMPLEMENTATION.md](./5%20Vitesse%20de%20l'analyse/CHECKLIST-IMPLEMENTATION.md) | Les lots de la vitesse d'analyse et leurs preuves locales |

## 6 Recette v2

| Document | Contenu |
|---|---|
| [ANALYSE-RECETTE-V2.md](https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/UCM%20Architect/6%20Recette%20v2/ANALYSE-RECETTE-V2.md) | Les points de la recette Figma de Button, Alert et Stresstest : cause lue dans le code, proposition, questions R-11 à R-22 et ordre de travail |
| [MAQUETTE-RECETTE-V2.html](https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/UCM%20Architect/6%20Recette%20v2/MAQUETTE-RECETTE-V2.html) | Fenêtre à 300 px, changement de variant, langage des variants, bouton de modèle, choix du tableau, bouton Sélectionner et constats réécrits, sur les écrans réels figés |
| [PLAN-IMPLEMENTATION-RECETTE-V2.md](https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/UCM%20Architect/6%20Recette%20v2/PLAN-IMPLEMENTATION-RECETTE-V2.md) | Les sous-lots à cocher, leur agent (Codex ou Claude), leurs dépendances et les vagues parallèles |
| [recette.css](https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/UCM%20Architect/6%20Recette%20v2/recette.css) | La feuille des éléments nouveaux de la maquette |
| `Mesures/extraire-galerie.mjs` | Fige les états de la galerie étroite dans `galerie/` |

Les recherches antérieures sur Nomenclature et sur le contrôle de structure des
tokens restent dans [Plugin Architect](../Plugin%20Architect/README.md).

## Où en est le sujet

Le plan de la recette v1 est implémenté : panneau du mode Composant sans onglets, signes des sortes d'objets dans le kit et le socle, règle des tokens du composant (C80). Il attend la recette Figma du mainteneur.

## 7 Règles manquantes

| Document | Contenu |
|---|---|
| [PLAN-IMPLEMENTATION-REGLES-MANQUANTES.md](https://github.com/Vassili-g/UCM-Toolkit/blob/da7f465d/docs/notes/Recherches/UCM%20Architect/7%20R%C3%A8gles%20manquantes/PLAN-IMPLEMENTATION-REGLES-MANQUANTES.md) | La correction de C45 qui ajoute les règles manquantes dans une instance remplie : décisions, lots à cocher avec leur agent, textes et recette |

# UCM Architect

Ce dossier regroupe les recherches, les maquettes et les réflexions sur le
plugin d'architecture des tokens. Le sujet reprend depuis le début : aucune
direction n'est retenue pour la suite, et chaque document ci-dessous se lit
comme une matière à trier.

Le code de la v1 vit dans [packages/plugin-architect](../../../../packages/plugin-architect/).
Le référentiel dont l'Architect lit les définitions a son propre dossier,
[Référentiel UCM](../Référentiel%20UCM/README.md).

## Où en est le sujet

| Étape | État |
|---|---|
| Architecture globale UCM | Recherche close. La [version minimale](./1%20Architecture%20globale/VERSION-MINIMALE.md) avait retenu « aucun nouveau plugin » et rangé l'Architect en piste |
| Architect v1 | Construit pendant la phase 2 du [plan du référentiel](../Référentiel%20UCM/PLAN-IMPLEMENTATION.md#phase-2--ucm-architect-v1--normaliser-les-noms), lots 14 à 18 : il normalise la casse et les séparateurs des noms, et remplace en option les termes tolérés (`press` en `pressed`) |
| Recette de la v1 | Lot 19 : recette dans Figma par le mainteneur, puis export des tokens du fichier renommé |
| Suite de l'Architect | Explorée sans décision : versions v1.1, v1.2 et v2, quatre questions ouvertes |
| Refonte | [Conception](./3%20Refonte/CONCEPTION.md) revue par un agent spécialiste de l'UX, et [maquettes](./3%20Refonte/MAQUETTES-ARCHITECT.html) ; attend la validation du mainteneur |
| Recette de la refonte | [Dossier](./5%20Recette/DOSSIER-RECETTE-ARCHITECT.md) et [maquettes](./5%20Recette/Maquettes/MAQUETTE-RECETTE-ARCHITECT.html) : langage visuel commun, avant et après dans À appliquer, cartes de À trancher, fiche d'un terme, question des tailles retirée ; attend les décisions D1 à D10 |

La v1 contredit la version minimale : le mainteneur a demandé l'Architect
quand les renommages de son fichier sont devenus trop nombreux pour être faits
à la main. La refonte reprend le plugin depuis ses deux buts : l'écriture des
noms et l'harmonisation des mots.

## Les maquettes

| Maquette | Contenu |
|---|---|
| [Recette de la refonte](./5%20Recette/Maquettes/MAQUETTE-RECETTE-ARCHITECT.html) | Les écrans réels figés, puis les propositions : langage visuel, Règles, À appliquer en deux colonnes, trois formes de cartes pour À trancher, fiche d'un terme animée |
| [Refonte](./3%20Refonte/MAQUETTES-ARCHITECT.html) | Troisième version, variables seulement, sur la feuille de style commune des plugins : le plan de navigation, quatorze écrans dont les feuilles des termes, la planche des cartes et des états |
| [Exploration du plugin d'architecture](./1%20Architecture%20globale/Maquettes/MAQUETTE-ARCHITECTE.html) | La première exploration : le flux en six étapes (premier lancement, accueil, vérifier, conventions, construire, publier) et seize écrans, thème sombre |
| [Écran de la v1](./2%20Architect%20v1/MAQUETTE-ARCHITECT.html) | L'écran unique validé avant la construction : écriture des noms et liste des renommages à cocher |
| [Exploration après la v1](./2%20Architect%20v1/EXPLORATION-UX-ARCHITECT.html) | Le parcours de la première exploration confronté au plugin construit : le flux en sept étapes, douze écrans marqués construit, v1.1, v1.2, v2 ou plus tard, les cas d'usage couverts et quatre questions |
| [Vue d'ensemble de l'architecture globale](./1%20Architecture%20globale/VUE-D-ENSEMBLE.html) | La présentation visuelle de toute la recherche : rôle des produits, propriétaire de chaque information, nomenclature, référentiel, revue externe et pistes |

La galerie du plugin construit montre ses états réels :
`npm run galerie -w ucm-architect-plugin` l'écrit dans
`packages/plugin-architect/dist/galerie/`.

## Les réflexions

| Document | Contenu |
|---|---|
| [VERSION-MINIMALE.md](./1%20Architecture%20globale/VERSION-MINIMALE.md) | La réponse retenue à l'époque, sans plugin : un fichier de conventions lu par `ucm check` et l'exporteur |
| [ARCHITECTURE-GLOBALE-UCM.md](./1%20Architecture%20globale/ARCHITECTURE-GLOBALE-UCM.md) | La proposition complète : rôle de chaque produit, propriétaire de chaque information, section 5.1 sur un plugin d'architecture, section 8 sur ses domiciles possibles |
| [PISTES-DE-REFLEXION.md](./1%20Architecture%20globale/PISTES-DE-REFLEXION.md) | Options et questions par sujet ; section 13 sur les périmètres agnostique et full UCM, section 14 sur le hub d'adoption |
| [REVUE-CONCEPTUELLE-ET-FONCTIONNELLE.md](./1%20Architecture%20globale/REVUE-CONCEPTUELLE-ET-FONCTIONNELLE.md) | La revue externe ; section 6 sur le besoin d'un quatrième plugin, section 7 sur les limites de la normalisation |
| [PLAN-DE-RECHERCHE.md](./1%20Architecture%20globale/PLAN-DE-RECHERCHE.md) | Les sujets R1 à R13, dont R5 sur le plugin d'architecture et R6 sur le bilan du fichier |
| [SUIVI.md](./1%20Architecture%20globale/SUIVI.md) | L'état de chaque sujet de l'architecture globale à sa clôture |
| [RECHERCHE-API-ARCHITECT.md](./2%20Architect%20v1/RECHERCHE-API-ARCHITECT.md) | Ce que l'API Plugin de Figma permet pour renommer : variantes, propriétés, variables, annulation, coût |

## Les recherches sourcées

| Document | Contenu |
|---|---|
| [Optimisation de la lecture et de l'affichage](./OPTIMISATION-LECTURE-ET-AFFICHAGE.md) | Revue du code de la v1, mesures reproductibles et proposition de réduction du calcul, des copies, des messages et du rendu |
| [R2-REFERENTIEL.md](./1%20Architecture%20globale/Recherches/R2-REFERENTIEL.md) | Les définitions UCM dans le code, leurs contradictions, le marché |
| [R3-NOMENCLATURE.md](./1%20Architecture%20globale/Recherches/R3-NOMENCLATURE.md) | Les relevés de forme et de synonymie mesurés sur deux fichiers réels |
| [R4-R6-DECLARATION-ET-BILAN.md](./1%20Architecture%20globale/Recherches/R4-R6-DECLARATION-ET-BILAN.md) | Où ranger la déclaration d'un design system, le catalogue des contrôles du bilan |
| [R4-R8-R11-R13-QUESTIONS-COURTES.md](./1%20Architecture%20globale/Recherches/R4-R8-R11-R13-QUESTIONS-COURTES.md) | Données partagées d'un plugin, descriptions de variables, typographie, lecture des agents, renommage |
| [R1-R9-RELEVES-LOCAUX.md](./1%20Architecture%20globale/Recherches/R1-R9-RELEVES-LOCAUX.md) | Le poids des plugins, ce que touche le retrait de l'onglet Intégrations |
| [LECTURE-DES-DOCUMENTS.md](./1%20Architecture%20globale/Recherches/LECTURE-DES-DOCUMENTS.md) | Ce que les documents d'autorité confirment, complètent ou contraignent |
| [Nomenclature initiale](./1%20Architecture%20globale/Recherches/Nomenclature%20initiale/RECHERCHE-NOMENCLATURE.md) | La première recherche, venue de l'explorateur, et ses trois rapports bruts |

Les scripts de mesure de R3, et celui qui régénère la section 13 de la vue
d'ensemble, sont dans [Mesures](./1%20Architecture%20globale/Mesures/).

# Documentation UCM

Le [README du dépôt](../README.md) présente les outils et les dépôts UCM.
Ce sommaire oriente vers les guides d'utilisation, les références techniques
et les recherches encore utiles.

## Utiliser les outils

| Tâche | Document |
|---|---|
| Créer, vérifier et écrire une palette dans Figma | [UCM Palettes](../packages/plugin-palettes/README.md) |
| Lire les alias ou les tokens d'un composant | [UCM Token Explorer](../packages/plugin-explorateur/README.md) |
| Ouvrir l'exporteur et choisir sa commande | [UCM Contract Exporter](../packages/plugin-exporter/README.md) |
| Préparer un composant, exporter et relire sa demande de fusion | [Guide designer](./guides/POUR-LES-DESIGNERS.md) |
| Installer les maîtres des règles d'usage | [Kit de règles](./guides/KIT-DE-REGLES.md) |
| Brancher un dépôt consommateur | [Installation](../README.md#brancher-un-repository), puis [CLI](../packages/cli/README.md) |
| Implémenter un contrat | `ucm guide <contrat>`, décrit dans le [guide du CLI](../packages/cli/README.md#the-guide-of-a-contract) |
| Ajouter la parité TypeScript | [Adaptateur](../packages/adapter-typescript/README.md) |
| Appeler les lecteurs depuis du code | [Kit](../packages/kit/README.md) |
| Éprouver le parcours Figma, npm et CI | [Recette externe](./guides/RECETTE.md) |

## Contribuer

Commencez par [AGENTS.md](../AGENTS.md) pour les invariants et la carte du code,
puis [CONTRIBUTING.md](../CONTRIBUTING.md) pour les règles de travail.
Lisez ensuite la spécification du domaine touché, indiquée ci-dessous.

Les README des paquets privés décrivent leur usage dans le monorepo :
[moteur de couleur](../packages/couleur/README.md) et
[socle des plugins](../packages/plugin-socle/README.md).
Les galeries et leurs commandes sont documentées dans chaque README de plugin.

## Quel document porte quelle règle

| Document | Autorité |
|---|---|
| [CONCEPT.md](../CONCEPT.md) | Responsabilités respectives de Figma, du code et des contrôles |
| [FORMAT.md](./format/FORMAT.md) | Forme du contrat et des tokens, sens des champs et de leur absence |
| [COMPATIBILITE.md](./format/COMPATIBILITE.md) | Fenêtres de lecture et responsabilités de migration |
| [CHANGELOG-FORMAT.md](./format/CHANGELOG-FORMAT.md) | Changements des versions du contrat et des tokens |
| [SPEC de l'exporteur](../packages/plugin-exporter/SPEC.md) | Lecture de Figma, choix des calques et diagnostics |
| [Spécification Palettes](./notes/Recherches/Plugin%20Palettes/1%20Recherche%20initiale/RECHERCHE-PLUGIN-PALETTES.md) | Calculs, recette, écriture des palettes et comportement de l'interface |
| [SPEC de l'explorateur](../packages/plugin-explorateur/SPEC.md) | Relevés, résolution et limites de lecture |
| [Architecture multi-marques](./notes/Recherches/Archi%20Tokens%20Multi-marques/ARCHITECTURE-FINALE-MULTIMARQUES.md) | Architecture cible des collections et des dossiers de `theme` ; son déploiement dans les consommateurs reste distinct |
| [AGENTS.md](../AGENTS.md) | Invariants du produit, bornes et fichiers qui les appliquent |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Code, tests, rédaction et vérifications |
| [ROADMAP.md](../ROADMAP.md) | Maturité, limites et validations restantes |

La spécification Palettes est encore rangée dans un dossier de recherche :
son titre et ses identifiants d'exigences en font une référence du produit.
Les plans voisins ne la remplacent pas.

## Recherches et décisions

L'[état des recherches](./notes/Recherches/README.md) donne le statut de
chaque chantier et les sources qui attestent son implémentation.

| Ensemble | Entrée |
|---|---|
| Palettes, ergonomie, langues et écriture des variables | [Bilan Palettes](./notes/Recherches/Plugin%20Palettes/README.md) |
| Diagnostics et propriétés visuelles du contrat 14.0 | [Spécification du moteur](../packages/plugin-exporter/SPEC.md) et [format](./format/FORMAT.md) |
| Performance de l'export | [Plan partiellement implémenté](https://github.com/Vassili-g/UCM-Toolkit/blob/5d7435d/docs/notes/Recherches/Performance%20de%20l'analyse/PLAN-IMPLEMENTATION-PERFORMANCE-ANALYSE.md) |
| Coût de génération et projet d'implémenteur | [Études et plan](./notes/Recherches/Optimisation%20Tokens/README.md) |
| Identité graphique | [Marque UCM](./marque/README.md), issue de la [recherche optique](./notes/Recherches/Direction%20artistique/Optique/README.md) |
| Diff sémantique, contrôle du rendu et autres pistes | [Évolutions globales](./notes/Recherches/Evolutions%20globales/PISTES-EVOLUTION.md) |

Une recette Figma non consignée est une validation restante. Elle ne suffit
pas à classer une fonction déjà présente dans le code comme non implémentée.

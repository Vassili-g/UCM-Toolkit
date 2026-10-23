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
| [PROMPT-CODEX-REVUE-DU-PLAN.md](./3%20Plan/PROMPT-CODEX-REVUE-DU-PLAN.md) | Le prompt de la revue de la première version du plan par Codex |
| [REVUE-CODEX-DU-PLAN.md](./3%20Plan/REVUE-CODEX-DU-PLAN.md) | La revue de Codex sur la première version du plan |
| [REVUE-BUGS-IMPLEMENTATION.md](./3%20Plan/REVUE-BUGS-IMPLEMENTATION.md) | Les bugs trouvés dans les contrôles du kit et leur usage par Architect, avec leur état de correction |

Les recherches antérieures sur Nomenclature et sur le contrôle de structure des
tokens restent dans [Plugin Architect](../Plugin%20Architect/README.md).

## Où en est le sujet

Maquettes validées (`6cf27974`). Le plan d'implémentation attend son lancement.

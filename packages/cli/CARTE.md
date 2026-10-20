# Carte : cli

Ligne de commande : @ucm-kit/cli, publiée.

## ./
- procedure.md : ce qui décide de quoi quand un agent implémente un contrat
- aides/ : une aide par caractéristique : sens, écriture par défaut, preuve
- tests/ : dont `recette.test.mjs`, sur des repositories temporaires

## src/
- ucm.mjs : aiguillage et codes de sortie
- init.mjs : installe ce qui manque, sans jamais écraser
- check.mjs : lance le contrôle du kit, imprime, écrit le rapport
- adaptateur.mjs : découvre l'adaptateur de stack installé dans le repo
- icons.mjs : icônes que les contrats du repo réclament
- rapport-gitlab.mjs : note du rapport sur une merge request GitLab
- tokens-css.mjs : feuille CSS des tokens et de leurs modes, depuis `tokens.json`
- aides.mjs : `ucm aides` : catalogue, une aide, copie dans les conventions
- guide.mjs : `ucm guide` : procédure, diagnostics, API des dépendances, aides et modes
- conventions.mjs : `.ucm/conventions.md` : fichier le plus proche, ses sections, ses anomalies

## tests/
- cascade/ : feuille des tokens rendue dans trois moteurs, par `npm run cascade`

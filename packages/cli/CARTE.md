# Carte : cli

Ligne de commande : @ucm-kit/cli, publiée.

## ./
- procedure.md : ce qui décide de quoi quand un agent implémente un contrat
- aides/ : une aide par caractéristique : sens, écriture par défaut, preuve
- tests/ : dont `recette.test.mjs`, sur des repositories temporaires

## src/
- ucm.mjs : aiguillage et codes de sortie ; `COMMANDES` (nom, usage, rôle, options) dont `ucm --help` est construit
- init.mjs : installe ce qui manque, sans jamais écraser ; workflows sans numéro de CLI recopié, exécution du paquet installé dans une stack Node et repli portable sans stack
- check.mjs : passe les rangs Git et l’état de l’adaptateur au contrôle du kit, imprime, écrit le rapport ; 0 conforme, 1 refus, 2 invocation
- adaptateur.mjs : découvre l'adaptateur de stack installé dans le repo ; table officielle des extensions et état attendu (`present`, `absent`, `casse`, `sans-adaptateur`)
- rangs.mjs : rangs des contrats, des implémentations et des tokens sur le premier parent, avec dates et changements non commités ; détecte le clone superficiel
- icons.mjs : icônes que les contrats du repo réclament
- rapport-gitlab.mjs : note du rapport sur une merge request GitLab
- tokens-css.mjs : feuille CSS des tokens et de leurs modes, depuis `tokens.json`
- tokens-references.mjs : `ucm tokens references`, remplace chaque `"{chemin}"` par `"var(--nom)"` ; `--verifier` sert de preuve
- deroger.mjs : `ucm deroger`, écrit une dérogation du code dans `.ucm/derogations.json`, avec l'export du contrat et l'auteur
- aides.mjs : `ucm aides` : catalogue, une aide, copie dans les conventions
- guide.mjs : `ucm guide` : procédure, diagnostics, API des dépendances, aides et modes
- conventions.mjs : `.ucm/conventions.md` : fichier le plus proche, ses sections, ses anomalies
- contrats.mjs : chemins des contrats d'un dossier, `[]` quand le dossier n'existe pas ; toute autre erreur remonte

## tests/
- cascade/ : feuille des tokens rendue dans trois moteurs, par `npm run cascade`

# Recette d'UCM Architect

Dossier des retours du mainteneur après l'essai du plugin dans Figma :
l'affichage des écritures, la ligne d'un terme, la question des tailles,
l'avant et l'après d'À appliquer, les cartes de À trancher, les sections de
Règles, la fiche d'un terme et le langage visuel commun.

**État.** Les lots L0 à N1 du plan d'implémentation sont faits : le plugin
s'appelle UCM Nomenclature et vit dans `packages/plugin-nomenclature/`.
Restent V et la recette Figma, puis les lots J à P du plan de fiabilité.

| Document | Contenu |
|---|---|
| [AUDIT-COMPLET-ARCHITECT.md](./AUDIT-COMPLET-ARCHITECT.md) | Les défauts AC1 à AC13 qui peuvent abîmer les variables ou `tokens.json`, rejoués sur le code, et ce qui tient |
| [AUDIT-INTEGRITE-TOKENS.md](./AUDIT-INTEGRITE-TOKENS.md) | Les risques de perte de noms, de restauration et de tokens à l’export, avec les reproductions et les corrections attendues |
| [DOSSIER-RECETTE-ARCHITECT.md](./DOSSIER-RECETTE-ARCHITECT.md) | Les points R1 à R11 : demande, constat dans le code, proposition, décision ; les lots qui suivent les décisions |
| [PLAN-FIABILITE.md](./PLAN-FIABILITE.md) | La lecture croisée des deux audits, les décisions, les textes et les lots J à P répartis par agent |
| [Maquettes/MAQUETTE-RECETTE-ARCHITECT.html](./Maquettes/MAQUETTE-RECETTE-ARCHITECT.html) | Le langage visuel, puis Règles, À appliquer, À trancher et la fiche d'un terme, chacun « Aujourd'hui » puis « Proposé », sur les écrans figés de la galerie |
| [Maquettes/propose.css](./Maquettes/propose.css) | Les règles de style proposées, posées après la feuille réelle du plugin |
| [Mesures/extraire-galerie.mjs](./Mesures/extraire-galerie.mjs) | Fige les écrans de la galerie sombre dans `Maquettes/galerie/`, après `npm run galerie -w ucm-nomenclature-plugin` |
| [Mesures/verifier-maquette.mjs](./Mesures/verifier-maquette.mjs) | Contrôle la maquette sans la capturer : erreurs, débordements, hauteur des cartes |
| [Mesures/auditer-maquette.mjs](./Mesures/auditer-maquette.mjs) | Cherche les défauts visuels sans capture : chevauchements, textes qui débordent, jetons coupés, chemins écrasés |

Les deux scripts se lancent depuis la racine du dépôt, par exemple
`node "docs/notes/Recherches/Plugin Architect/5 Recette/Mesures/extraire-galerie.mjs"`.

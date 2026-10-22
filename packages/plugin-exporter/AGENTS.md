# Exporteur (`packages/plugin-exporter`)

Le moteur : extraction Figma, dépend du kit.

L'analyse et la publication ne modifient jamais le document Figma. Un seul geste y écrit : la création des règles d'usage, qui pose une instance de `.componentRules` à côté du composant ou remplit une instance vierge. Supprimer cette instance défait la création.

- Écrit dans Figma : `plugin-socle/src/composant/template/ecriture.ts` seul, par la seule porte `creerRegles` (`src/code.ts`, demande `creer-regles`).
- Commandes : `npm run test:paquet -- exporter`, `npm run build:plugin -- exporter`, `npm run galerie:plugin -- exporter`.
- Carte : [CARTE.md](./CARTE.md).

<!-- domaines:debut -->
| Invariants | Chemins |
|---|---|
| [Portée et forme du contrat](./invariants/portee-du-contrat.md) | tout le paquet (défaut) |
| [Tokens et variables](./invariants/tokens-et-variables.md) | `src/tokens/**` |
| [Couleurs](./invariants/couleurs.md) | aucun |
| [Composition](./invariants/composition.md) | aucun |
| [Arbre des slots](./invariants/arbre-des-slots.md) | aucun |
| [Layout, dimensions et bornes](./invariants/layout.md) | aucun |
| [Grilles](./invariants/grilles.md) | aucun |
| [Diagnostics](./invariants/diagnostics.md) | `src/config.ts`, `src/depot.ts`, `src/forges/**` |
| [Échantillon de maquette](./invariants/echantillon.md) | aucun |
| [Écriture dans le document](./invariants/ecriture-dans-le-document.md) | `src/code.ts`, `src/prevol.ts` |
| [Tests du moteur](./invariants/tests-du-moteur.md) | `tests/**` |
<!-- domaines:fin -->

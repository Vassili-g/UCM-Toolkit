# Exporteur (`packages/plugin-exporter`)

Le moteur : extraction Figma, dépend du kit.

L'analyse et la publication ne modifient jamais le document Figma. Un seul geste y écrit : la création des règles d'usage, qui pose une instance de `.componentRules` à côté du composant ou remplit une instance vierge. Supprimer cette instance défait la création.

- Écrit dans Figma : `src/template/ecriture.ts` seul, par la seule porte `creerRegles` (`src/code.ts`, demande `creer-regles`).
- Commandes : `npm run test:paquet -- exporter`, `npm run build:plugin -- exporter`, `npm run galerie:plugin -- exporter`.
- Carte : [CARTE.md](./CARTE.md).

<!-- domaines:debut -->
| Invariants | Chemins |
|---|---|
| [Portée et forme du contrat](./invariants/portee-du-contrat.md) | tout le paquet (défaut) |
| [Tokens et variables](./invariants/tokens-et-variables.md) | `src/tokens/**`, `src/variables.ts` |
| [Couleurs](./invariants/couleurs.md) | `src/contract/colorKeys.ts` |
| [Composition](./invariants/composition.md) | aucun |
| [Arbre des slots](./invariants/arbre-des-slots.md) | `src/contract/imbriques.ts`, `src/contract/slotNames.ts`, `src/contract/structureTree.ts`, `src/contract/textRendering.ts` |
| [Layout, dimensions et bornes](./invariants/layout.md) | `src/contract/effectStyles.ts`, `src/contract/extractLayout.ts`, `src/contract/flexLayout.ts`, `src/contract/layoutNodes.ts`, `src/contract/nodeBindings.ts` |
| [Grilles](./invariants/grilles.md) | aucun |
| [Diagnostics](./invariants/diagnostics.md) | `src/config.ts`, `src/contract/localisation.ts`, `src/depot.ts`, `src/forges/**` |
| [Échantillon de maquette](./invariants/echantillon.md) | aucun |
| [Écriture dans le document](./invariants/ecriture-dans-le-document.md) | `src/code.ts`, `src/prevol.ts`, `src/template/**`, `src/contract/composedComponents.ts` |
| [Tests du moteur](./invariants/tests-du-moteur.md) | `tests/**` |
<!-- domaines:fin -->

# Socle des plugins (`packages/plugin-socle`)

Ce que les plugins partagent : ucm-plugin-socle, privé, lu en source.

- Commandes : `npm run test:paquet -- socle`.
- Carte : [CARTE.md](./CARTE.md).

<!-- domaines:debut -->
| Invariants | Chemins |
|---|---|
| [Portée et forme du contrat](../plugin-exporter/invariants/portee-du-contrat.md) | `src/composant/**` |
| [Tokens et variables](../plugin-exporter/invariants/tokens-et-variables.md) | `src/composant/variables.ts` |
| [Couleurs](../plugin-exporter/invariants/couleurs.md) | `src/composant/contract/colorKeys.ts` |
| [Arbre des slots](../plugin-exporter/invariants/arbre-des-slots.md) | `src/composant/contract/imbriques.ts`, `src/composant/contract/slotNames.ts`, `src/composant/contract/structureTree.ts`, `src/composant/contract/textRendering.ts` |
| [Layout, dimensions et bornes](../plugin-exporter/invariants/layout.md) | `src/composant/contract/effectStyles.ts`, `src/composant/contract/extractLayout.ts`, `src/composant/contract/flexLayout.ts`, `src/composant/contract/layoutNodes.ts`, `src/composant/contract/nodeBindings.ts` |
| [Diagnostics](../plugin-exporter/invariants/diagnostics.md) | `src/composant/contract/localisation.ts` |
| [Écriture dans le document](../plugin-exporter/invariants/ecriture-dans-le-document.md) | `src/composant/template/**`, `src/composant/contract/composedComponents.ts` |
| [Interface d'UCM Palettes](../plugin-palettes/invariants/interface.md) | tout le paquet (défaut) |
| [UCM Nomenclature](../plugin-nomenclature/invariants/nomenclature.md) | `src/inventaireDeNoms.ts` |
<!-- domaines:fin -->

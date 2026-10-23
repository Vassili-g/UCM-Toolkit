# Kit (`packages/kit`)

Le format et ses lecteurs : @ucm-kit/core, publié.

- Commandes : `npm run test --workspace @ucm-kit/core`, `npm run schema` après un changement de `src/format/types.ts`.
- Carte : [CARTE.md](./CARTE.md).

<!-- domaines:debut -->
| Invariants | Chemins |
|---|---|
| [Portée et forme du contrat](../plugin-exporter/invariants/portee-du-contrat.md) | `src/format/**` |
| [Tokens et variables](../plugin-exporter/invariants/tokens-et-variables.md) | `src/format/names.ts`, `src/format/tokens.ts`, `src/format/chemins-de-tokens.ts`, `src/format/axes-de-collections.ts`, `src/lecteurs/modes-tokens.mjs` |
| [Diagnostics](../plugin-exporter/invariants/diagnostics.md) | `src/lecteurs/**`, `src/format/version.ts`, `src/lecteurs/diagnostic-contrastes.mjs`, `src/lecteurs/perimetre-rapport.mjs` |
| [Versionnage](./invariants/versionnage.md) | tout le paquet (défaut), `src/format/types.ts` |
| [Corpus de test](./invariants/corpus-de-test.md) | `fixtures/**` |
| [Référentiel](./invariants/referentiel.md) | `src/referentiel/**` |
| [Moteur de couleur](../couleur/invariants/moteur-de-couleur.md) | `src/emplois/**`, `src/referentiel/theme.ts` |
| [Nomenclature d'UCM Architect](../plugin-architect/invariants/nomenclature.md) | `src/nommage/**`, `src/protocoles/**` |
<!-- domaines:fin -->

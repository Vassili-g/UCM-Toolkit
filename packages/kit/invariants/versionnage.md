# Versionnage

- **Un changement de forme du JSON incrémente `contractVersion` et met à jour la spec et les consommateurs.**
- **Le kit qui connaît une nouvelle version du format de tokens sort avec la CLI et l'adaptateur, le kit en premier, avant le plugin qui la produit.** → [compatibilité](../../../docs/format/COMPATIBILITE.md#lordre-dune-nouvelle-version-du-format-de-tokens)
- **`schema/ucm-contract.schema.json` est dérivé de `src/format/types.ts` par `npm run schema`, jamais rédigé.** Il décrit la forme et ignore la cohérence : renvois internes, format des valeurs tokenisées. Il ne remplace aucun contrôle du consommateur. Sa propre `description` énonce ses limites.

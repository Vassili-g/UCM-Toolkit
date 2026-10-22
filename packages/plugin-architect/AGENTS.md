# Explorateur (`packages/plugin-architect`)

Plugin UCM Architect : ucm-architect-plugin, privé. Le code de Nomenclature y est arrivé (`src/nomenclature/`, `src/ui/nomenclature/`) ; `src/code.ts` ne l'appelle pas encore.

- Écrit dans Figma : `src/ecriture/` seul. `noms.ts` : le `name` des variables et collections locales, ses données partagées dans `ESPACE_ARCHITECT` et le point d'annulation. Rien n'en dépend avant le branchement de Nomenclature.
- Commandes : `npm run test:paquet -- architect`, `npm run build:plugin -- architect`, `npm run galerie:plugin -- architect`.
- Carte : [CARTE.md](./CARTE.md).

<!-- domaines:debut -->
| Invariants | Chemins |
|---|---|
| [Explorateur de tokens](./invariants/explorateur.md) | tout le paquet (défaut) |
| [UCM Nomenclature](./invariants/nomenclature.md) | `src/nomenclature/**`, `src/ecriture/noms.ts`, `src/ui/nomenclature/**` |
<!-- domaines:fin -->

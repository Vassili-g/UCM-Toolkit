# UCM Architect (`packages/plugin-architect`)

Plugin UCM Architect : ucm-architect-plugin, privé. `src/code.ts` aiguille chaque demande vers son domaine (`src/sandbox/`, `src/messages/`) ; Nomenclature est le domaine `nomenclature`.

- Écrit dans Figma : `src/ecriture/` seul. `noms.ts` : le `name` des variables et collections locales, ses données partagées dans `ESPACE_ARCHITECT` et le point d'annulation.
- Commandes : `npm run test:paquet -- architect`, `npm run build:plugin -- architect`, `npm run galerie:plugin -- architect`.
- Carte : [CARTE.md](./CARTE.md).

<!-- domaines:debut -->
| Invariants | Chemins |
|---|---|
| [Explorateur de tokens](./invariants/explorateur.md) | tout le paquet (défaut) |
| [UCM Nomenclature](./invariants/nomenclature.md) | `src/nomenclature/**`, `src/ecriture/noms.ts`, `src/ui/nomenclature/**`, `src/messages/nomenclature.ts`, `src/sandbox/nomenclature.ts`, `src/ui/textes/nomenclature.ts`, `src/ui/styles/nomenclature.css` |
<!-- domaines:fin -->

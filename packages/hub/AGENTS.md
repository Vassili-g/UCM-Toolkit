# Hub UCM (`packages/hub`)

Hors du workspace. `npm test`, `npm run vues` et l'inventaire ne le lisent pas, et aucun paquet ne l'importe.

Page locale et autonome qui montre ce que le kit et le moteur de couleur produisent : ucm-hub, privé, lu en source.

- Écrit dans Figma : rien.
- Commandes : `npm --prefix packages/hub test` ; `npm --prefix packages/hub run hub` réécrit la page, après `npm run build --workspace @ucm-kit/core`.
- Plan : [PLAN-HUB-UCM.md](../../docs/notes/Recherches/Hub%20UCM/PLAN-HUB-UCM.md).
- Carte : [CARTE.md](./CARTE.md).

<!-- domaines:debut -->
| Invariants | Chemins |
|---|---|
| [Hub UCM](./invariants/hub.md) | tout le paquet (défaut) |
<!-- domaines:fin -->

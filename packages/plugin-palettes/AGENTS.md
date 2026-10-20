# Palettes (`packages/plugin-palettes`)

Plugin UCM Palettes : ucm-palettes-plugin, privé.

- Écrit dans Figma : les seuls fichiers de `src/ecriture/`, importés seulement par `src/code.ts`.
- Commandes : `npm run test:paquet -- palettes`, `npm run build:plugin -- palettes`, `npm run galerie:plugin -- palettes`.
- Carte : [CARTE.md](./CARTE.md).

<!-- domaines:debut -->
| Invariants | Chemins |
|---|---|
| [Écriture d'UCM Palettes](./invariants/ecriture.md) | tout le paquet (défaut), `src/ui/frontiere.ts` |
| [Langue d'UCM Palettes](./invariants/langue.md) | `src/i18n/**`, `src/preferences.ts`, `src/planche/textes.ts` |
| [Interface d'UCM Palettes](./invariants/interface.md) | `src/ui/**`, `src/harmonisation.ts`, `src/presentation.ts` |
<!-- domaines:fin -->

# ucm-plugin-socle

Le socle partagé des deux plugins Figma de [UCM Toolkit](../../README.md).
Ce paquet privé est consommé en source. Il regroupe le build des interfaces,
les composants communs et les outils de vérification des plugins.

## Contenu

| Entrée | Usage |
|---|---|
| `build/inline-ui.cjs` | Assemble JavaScript et CSS dans un HTML autonome |
| `build/manifest.cjs` | Produit le manifeste importable depuis `dist/` |
| `build/run-tests.cjs` | Découvre et exécute les tests d'un paquet |
| `src/fenetre.ts` | Borne la taille de fenêtre et la conserve dans `clientStorage` |
| `src/ui/` | Bouton, onglets, interrupteur, redimensionnement et commandes d'en-tête |
| `socle.css` | Échelles de texte, espacements, couleurs et replis sombres |
| `galerie/` | Construit et capture les états d'interface hors de Figma |
| `lois/` | Vérifie les styles, le gabarit, le manifeste et la galerie d'un plugin |

Les chemins d'import sont déclarés dans [package.json](./package.json).
Les styles du socle précèdent ceux du plugin. Chaque plugin fournit ses
messages, ses scénarios de galerie et ses dimensions de fenêtre.

## Vérifier une modification

Depuis la racine du dépôt :

```sh
npm run test --workspace ucm-plugin-socle
npm run typecheck --workspace ucm-plugin-socle
npm run galerie --workspace ucm-exporter-plugin
npm run galerie --workspace ucm-palettes-plugin
```

Une modification partagée se relit dans les deux galeries. Les captures se
lancent avec `npm run galerie:captures --workspace <plugin>`, après construction
de la galerie et installation de Chromium par `npx playwright install chromium`.
Les tests d'interaction restent dans chaque plugin.

[CONTRIBUTING.md](../../CONTRIBUTING.md#interface-du-plugin) définit la
hiérarchie de l'information et le protocole de relecture. Les README de
[l'exporteur](../plugin-exporter/README.md) et de [Palettes](../plugin-palettes/README.md)
décrivent leurs fonctions propres.

## Licence

[MIT](../../LICENSE).

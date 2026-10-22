# ucm-plugin-socle

Le socle partagé des trois plugins Figma de [UCM Toolkit](../../README.md).
Ce paquet privé est consommé en source. Il regroupe le build des interfaces,
les composants communs et les outils de vérification des plugins.

## Contenu

| Entrée | Usage |
|---|---|
| `build/inline-ui.cjs` | Assemble JavaScript et CSS dans un HTML autonome |
| `build/manifest.cjs` | Produit le manifeste importable depuis `dist/` |
| `build/run-tests.cjs` | Découvre et exécute les tests d'un paquet |
| `src/fenetre.ts` | Borne la taille de fenêtre et la conserve dans `clientStorage` |
| `src/inventaireDeNoms.ts` | Lit les collections et les variables locales d'un fichier par les ports de lecture ; la forme de l'inventaire et la protection sont dans `@ucm-kit/core/nommage` |
| `src/ui/` | Bouton, onglets, interrupteur, redimensionnement et commandes d'en-tête ; un composant par signal du langage visuel : `Chemin.ts`, `Jeton.ts`, `Alerte.ts`, `Changement.ts`, `Filtre.ts`, `PoigneeDeSeparation.ts` |
| `src/ui/socle.css` | Échelles de texte, espacements, couleurs et replis sombres |
| `src/ui/langage.css` | Langage visuel commun : chemins, jetons, alertes, changements, filtres. Un plugin le charge après `socle.css` et n'en redéfinit aucune classe |
| `galerie/` | Construit et capture les états d'interface hors de Figma ; `galerie/planche.cjs` construit la planche des signaux du socle (`node packages/plugin-socle/galerie/planche.cjs`, dans `dist/galerie`) |
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
npm run galerie --workspace ucm-architect-plugin
```

Une modification partagée se relit dans les trois galeries. Les captures se
lancent avec `npm run galerie:captures --workspace <plugin>`, après construction
de la galerie et installation de Chromium par `npx playwright install chromium`.
Les tests d'interaction restent dans chaque plugin.

[CONTRIBUTING.md](../../CONTRIBUTING.md#interface-du-plugin) définit la
hiérarchie de l'information et le protocole de relecture. Les README de
[l'exporteur](../plugin-exporter/README.md), de [Palettes](../plugin-palettes/README.md)
et de [l'explorateur](../plugin-architect/README.md)
décrivent leurs fonctions propres.

## Licence

[MIT](../../LICENSE).

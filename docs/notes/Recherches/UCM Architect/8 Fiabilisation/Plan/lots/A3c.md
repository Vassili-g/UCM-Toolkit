# A3c. Signes de Palettes

Phase A. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase A
dans [README.md](../README.md).

Fichiers : `packages/kit/src/referentiel/signes.ts`, ses tests et `packages/plugin-palettes/src/ui/glyphes.ts` (lecture après levée de la réserve).

- [x] A3.4 Famille `verdict-palettes`, teinte `couleurs` : `butee` (`⊣`), `reference` (`◆`), `confondus` (`≈`). Les verdicts `✓`, `!`,
  `✗` emploient les alertes du socle. Vérifiez leurs identifiants dans `TYPES_D_ALERTE` avant la migration.
- [x] A3.5 Famille `pictogramme-palettes`, grille 44×28 : les 11 glyphes de carte de `packages/plugin-palettes/src/ui/glyphes.ts`.
- [ ] A3.7 Monter la version du kit.

Fin : chaque signe de Palettes du relevé relève du kit ou des alertes du socle. `npm run test --workspace @ucm-kit/core` passe.

## Avancement

A3.4 et A3.5 faits, A3.7 non fait (la version se monte en F2). Cases non cochées pour la relecture.

- A3.4 : la famille `verdict-palettes`, teinte `couleurs`, porte `butee`, `reference` et `confondus`, avec leur glyphe (`⊣`, `◆`, `≈`). `glypheDuSigne(id)` rend le caractère d'un signe. Les verdicts `✓`, `!` et `✗` prennent les alertes du socle : `tenu`, `corriger` et `bloquant` existent dans `TYPES_D_ALERTE`. `!` n'est pas le repli texte de `corriger` (`⚠`) : c'est l'icône SVG qui le remplace.
- A3.5 : la famille `pictogramme-palettes`, sans teinte, porte les 11 pictogrammes de carte (`carte-apercu`, `carte-reglage-global`, `carte-color-shift`, `carte-garanties`, `carte-interface-de-test`, `carte-fonds`, `carte-intensites`, `carte-courbes`, `carte-minimums`, `carte-proches`, `carte-contenu`). La grille est de 44 × 28 : le champ `hauteur` s'ajoute à `grille`, et `svgDuSigne` en tient compte. Chaque forme garde son rôle dans `class` (`glyphe-*`). `line` et `polyline` deviennent des `path`. Les rôles sans cerne portent `stroke="none"`, et `glyphe-axe` porte `stroke-linecap="butt"`, pour annuler le trait du `svg` du kit.
- Fichiers : `packages/kit/src/referentiel/signes.ts`, `packages/kit/tests/signes.test.ts`. Le test `iconesDuKit.test.ts` du socle lit la hauteur du signe dans son `viewBox` (`packages/plugin-socle/tests/iconesDuKit.test.ts`).
- Commandes : `npm run build --workspace @ucm-kit/core` passe ; `npm run test --workspace @ucm-kit/core` 1536/1539 (un échec, « 32 000 noms conservent les comptes et le plafond de questions », du lot E2 ; deux tests `todo`) ; `npm run typecheck` passe.
- Reste : A3.7 (F2) ; `npm run vues` pour régénérer `donnees-referentiel.js` (le test `vueIllustree` échoue tant que la vue est périmée) ; lignes de `packages/kit/CARTE.md` et de `packages/kit/invariants/referentiel.md` (rapport).

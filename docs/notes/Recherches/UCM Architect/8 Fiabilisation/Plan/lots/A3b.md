# A3b. Types de terme et sorties texte

Phase A. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase A
dans [README.md](../README.md).

Fichiers : `packages/kit/src/referentiel/signes.ts`, `packages/kit/src/referentiel/signaux.ts` et leurs tests.

- [x] A3.3 Famille `type-de-terme`, teinte `regles` : les six icônes de Nomenclature. R-1 `palette` reprend `palette`. R-2 `composant`
  reprend `component`. R-3 `a-trancher` reprend `question`, en ambre. R-4 `conforme` reprend `applique`. `remplace` et `sans-regle` sont
  définis ici.
- [x] A3.6 Ajoutez le champ `texte` de repli à `TYPES_D_ALERTE`, sans déplacer les formes SVG du socle.
  Distinguez le texte brut et le commentaire de forge.

Fin : `npm run test --workspace @ucm-kit/core` passe pour les types de terme et les replis texte.

## Avancement

A3.3 et A3.6 faits (Claude), cases non cochées pour la relecture.

- A3.3 : famille `type-de-terme` (teinte `regles`) dans `packages/kit/src/referentiel/signes.ts`, avec `remplace` et `sans-regle` définis et quatre reprises (`palette`, `component`, `question`, `applique`). Le sens de `question` dit que l'ambre vient du lecteur.
- A3.6 : champ `texte: { brut, forge }` sur `TYPES_D_ALERTE` dans `signaux.ts`. `corriger` et `verifier` partagent `⚠` et `⚠️`, les sorties n'ayant qu'un avertissement.
- Tests : `packages/kit/tests/signes.test.ts` (18 passent). `npm run test --workspace @ucm-kit/core` : seul `valeursDeVariant.test.ts` (autre session) échoue. Typecheck et `controle-style` passent.
- Reste : cocher après relecture ; version du kit non montée.

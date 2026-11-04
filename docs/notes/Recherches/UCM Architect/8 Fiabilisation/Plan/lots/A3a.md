# A3a. Famille des icônes d'interface

Phase A. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase A
dans [README.md](../README.md).

Fichiers : `packages/kit/src/referentiel/signes.ts`, `packages/kit/tests/signes.test.ts`, `packages/kit/src/referentiel/signaux.ts` (`TYPES_D_ALERTE`).

Le relevé vérifié hors Palettes compte 27 définitions SVG, soit 10 au socle, 10 dans Architect, 1 dans l'exporteur et 6 au hub.
Il compte une définition par dessin, les deux thèmes du chevron CSS une fois, et le masque préfixé une fois.
La courbe dynamique du hub est un graphique et reste hors de ce compte. Le sous-total des glyphes est 10 caractères distincts,
`× › → − ≠ ◆ ⚠ ✓ ✗ ❌`. Le relevé lit les littéraux `.ts` et `.mjs` des 299 sources suivies de Socle, Architect, Exporter, Hub,
CLI et Adapter. Il cherche les caractères de l'inventaire `× → ✓ ⋯ ＋ − › ≠ ◆ ≈ ⊣ ✗ ℹ ⚠ ✅ ❌`, sans commentaires,
ASCII ni sélecteur de présentation. Le total incluant Palettes reste à relever après levée de la réserve de lecture.
Les nombres 31 SVG et 26 glyphes ne sont pas établis pour un périmètre reproductible.
`SigneDuLangage` reçoit une grille adaptée au tracé, sans déplacer les alertes du socle.

- [ ] A3.1 Conservez les cinq formes `FORMES` dans `packages/plugin-socle/src/ui/Alerte.ts` (R-8, QM-11).
  Testez que les migrations suivantes ne recopient pas ces formes dans le kit.
- [ ] A3.2 Famille `interface`, sans teinte : chevron (un tracé, quatre sens par rotation), fermer (`×`), lien externe, réglages,
  poignée de taille, loupe, tout replier, panneau latéral, synchroniser, menu (`⋯`), ajouter (`+`), retirer (`−`), avant-après (`→`),
  séparateur de chemin (`›`), différent (`≠`), vide (losange en tirets de la vue Composant).
Fin : `npm run test --workspace @ucm-kit/core` passe pour la famille interface.

## Avancement

Pas commencé.

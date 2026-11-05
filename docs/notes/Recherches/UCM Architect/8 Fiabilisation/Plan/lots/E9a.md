# E9a. Composition et valeurs de couleur

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E8b.

Fichiers : `packages/kit/src/controles/accessibilite.ts`, `packages/kit/src/emplois/`,
`packages/kit/tests/stress/f7-accessibilite/`. Lisez `PLAN-STRESS-F7-ACCESSIBILITE.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E9.1 Composition et arrondi (Q-F7-1). Gardez les flottants jusqu'à un seul arrondi à 8 bits, puis comparez à dix décimales.
  Corrigez l'oracle si l'écart d'un octet vient d'un ordre d'arrondi différent. Un fond de page ou d'élévation d'alpha inférieur à 1 donne `fond-indetermine`.
- [x] E9.5 Valeurs hors gamme (Q-F7-5, N-50, N-52). Un canal ou un alpha hors de [0, 1], ou NaN, donne `couleur-hors-gamut`.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

E9.1 et E9.5 faits.

- `packages/kit/src/controles/accessibilite.ts` : la composition garde déjà les flottants (`composer`) et ne s'arrondit qu'à 8 bits au calcul du rapport ; un test le garde. `fondsDeRepli` rend `fond-indetermine` quand `elevation/page`, `elevation/raised` ou la page Figma a un alpha inférieur à 1, au lieu de les forcer opaques (`enOpaque`) ; les fonds d'élévation du mode priment, même translucides, sans retomber sur la page Figma. `Cause` gagne `couleur-hors-gamut` : `pileDePeintures` la rend pour une couleur (remplissage, variable liée ou fond d’ancêtre) dont un canal ou l'alpha, ou l'alpha effectif, sort de [0, 1] ou vaut NaN ; les fonds de repli hors gamme la rendent aussi. Plus aucun rapport n'est calculé sur ces couleurs, ce qui retire l'exception NaN de `contrasteTronque` du chemin des contrôles (N-52).
- `packages/kit/src/emplois/` n'a pas changé.
- Oracle : les six cas O6 ne montrent aucun écart d'un octet avec l'arrondi final, donc l'oracle n'a pas changé. O4-10, O4-11, O6-1 à O6-6 et M5-9 à M5-12 passent de `mesure` à `attendu` (`operateursOpacites.ts`, `operateursModes.ts`).
- Tests : `packages/kit/tests/accessibilite.test.ts` (4 tests ajoutés ; sur l'ancienne source, 3 échouent, celui de la composition passe car la règle tenait déjà), `tests/stressAccessibiliteOperateurs.test.ts`. `mesurer.ts --operateur O4|O6|M5` : 0 écart, 0 en attente ; les exceptions L1-1 et L1-2 de la section B disparaissent. Les autres écarts de la section B (icônes S1, F4, F5, Y1) existaient avant le lot.
- Carte : `packages/kit/CARTE.md` (ligne `accessibilite.ts` ajoutée, absente jusque-là).

Décisions prises :
- Un fond d'élévation translucide donne `fond-indetermine` sans repli sur la page Figma, car le mode du thème désigne ces fonds.
- Un canal hors gamme sur un fond de repli donne `couleur-hors-gamut`, un alpha NaN aussi.

Textes manquants :
- `packages/plugin-architect/src/ui/textes/ignores.ts` : `CAUSES_DE_LIMITE` n'a pas de phrase pour `couleur-hors-gamut` ; la carte retombe sur « n'a pas pu être lu ». Phrase à écrire avec `rediger-diagnostics-ucm`.

Reste : rien dans le lot.

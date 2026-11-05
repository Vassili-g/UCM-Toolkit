# E8b. Styles de texte

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E8a.

Fichiers : `packages/kit/src/controles/typographie.ts`, `packages/kit/tests/stress/f5-variants/typo/`.
Lisez `PLAN-STRESS-F5-F6-VARIANTS-TYPO.md`, sections 3 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E8.3 C64 compare les styles dans chaque valeur de l'axe de taille (Q-F6-2, N-42). Deux layers homonymes ne masquent pas leurs
  styles (N-44). Un texte à styles mixtes reçoit l'information `styles-mixtes` (Q-F6-6, N-43).
  C64 `sans-style-ni-variables` vise seulement une plage sans style ni variable.
- [x] E8.4 C65 couvre les huit champs de `CHAMPS_DE_TYPOGRAPHIE` (Q-F6-7).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Textes du designer

Écrits par la conversation principale avec `rediger-diagnostics-ucm`. Gardez-les tels quels.

- E8.3, information `styles-mixtes`. Phrase : `Le layer ${layer} porte plusieurs text styles.` Statut : « Appliquez un seul text style, ou ignorez ce constat ». N'écrivez pas « mélange » (Q-F7-14).

## Avancement

E8.3 et E8.4 faits.

- `packages/kit/src/controles/typographie.ts` : C64 compare les styles parmi les textes de même nom, de même valeur de l'axe de taille quand le composant en a un (sans axe, tous ensemble) et de même rang parmi les layers de ce nom dans leur variant (`groupesDeComparaison`). Deux layers homonymes ne mêlent plus leurs styles (N-44). Un texte à `texte.stylesMixtes` reçoit une information C64 `styles-mixtes` (type `info`, `faits.calque`) et aucun autre constat C64 (N-43). `sans-style-ni-variables` vise un texte sans style, sans variable de `typography` et non mixte. C65 juge les huit champs de `CHAMPS_DE_TYPOGRAPHIE`.
- `packages/kit/src/controles/releve.ts` : champ optionnel `texte.stylesMixtes`.
- `packages/plugin-architect/src/ui/textes/ignores.ts` et `src/ui/panneau/informations.ts` : la phrase de la note, rendue dans la section Informations.
- Harnais F6 : S1-5 à S1-7 posent `stylesMixtes`, et tous les cas de Q-F6-2, Q-F6-6 et Q-F6-7 passent de `mesure` à `attendu` (S1-5 à S1-7, S2-5 à S2-7, S2-9, S2-12, S2-13, S3-9 à S3-11). `mesurer.ts --famille F6` : 0 manqué, 0 faux constat, 0 en attente sur S1, S2, S3, S2+S1, S3+S3, S2+S2, S1+I6.
- Tests : `packages/kit/tests/typographie.test.ts` (4 tests ajoutés, tous en échec sur les sources d'avant le lot, vérifié ; le test de lectures linéaires passe son budget de 24 à 32 lectures de liaison par layer pour huit champs et la référence du test aléatoire ignore les textes sans style), `tests/stressTypographieOperateurs.test.ts`, `packages/plugin-architect/tests/textesDeLaMatriceEtDesIcones.test.ts`.
- Carte : `packages/kit/CARTE.md` (typographie, releve).

Décisions prises :
- Un texte sans style ne vote pas dans l'unanimité des autres, car son défaut a déjà son constat. Sans cela, un seul texte sans style masquait le `style-different` des autres (S2+S1). Un texte lié à des variables de `typography` sans style se compare encore à l'unanimité de ceux qui ont un style (`aucun` en `styleLu`).
- Un texte sans style ni variable reçoit seulement `sans-style-ni-variables`, pas en plus `style-different`.
- Le fait « plusieurs text styles » est un champ du relevé (`stylesMixtes`) : `style: null` ne distingue pas un texte sans style d'un texte mixte.

Commandes :
- `npx tsx --test tests/typographie.test.ts tests/stressTypographieOperateurs.test.ts` (dans `packages/kit`) : passent.
- `npx tsx tests/stress/f5-variants/mesurer.ts --famille F6` : voir ci-dessus.

Textes manquants :
- Le statut de l'information `styles-mixtes` (« Appliquez un seul text style, ou ignorez ce constat ») n'a pas de place : la section Informations n'a ni statut ni geste. Le texte n'est pas écrit dans le catalogue.

Reste :
- Rien dans le lot. Le lecteur `packages/plugin-architect/src/releveDuComposant.ts` pose `texte.stylesMixtes` quand les segments portent plus d'un identifiant de text style, et `src/sandbox/projectionsDesControles.ts` le liste dans le gabarit (les trois tests « tout ce que la famille lit est dans son gabarit » l'exigent). Aucun test ne lit encore le lecteur sur un texte mixte.

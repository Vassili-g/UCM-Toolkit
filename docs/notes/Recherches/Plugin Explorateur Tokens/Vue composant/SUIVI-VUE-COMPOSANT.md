# Suivi de la vue composant de l'explorateur

Ce suivi porte l'état du [plan d'implémentation](./PLAN-IMPLEMENTATION-VUE-COMPOSANT.md) :
lots livrés, preuves, fichiers non commités et recette Figma restante. Il
suffit pour reprendre le travail sans l'historique de conversation.

## État

| Lot | État | Preuve principale |
|---|---|---|
| 0. État des lieux | Livré | Ligne de base ci-dessous, typings relus |
| 1. Modèle pur | Livré | `tests/composant.test.ts`, 13 tests |
| 2. Lecture dans le sandbox | À faire | |
| 3. Messages, routes, fenêtre | À faire | |
| 4. La vue, états simples | À faire | |
| 5. Composant complexe | À faire | |
| 6. Aperçu et survol | À faire | |
| 7. Documentation et lois | À faire | |
| 8. Recette Figma | À faire | |

**Prochaine tâche** : lot 2, extraire `lireLesVariables` de `lireLeReleve` dans
`packages/plugin-explorateur/src/lecture.ts`.

**Prochaine commande utile** :
`npm test --workspace ucm-explorateur-plugin`.

## Arbre partagé

Au lancement, `git status --short` montrait ces fichiers du paquet modifiés et
non commités par une autre session :

`SPEC.md`, `galerie/etats.cjs`, `src/copie.ts`, `src/integrations/contrats.ts`,
`src/lecture.ts`, `src/modele.ts`, `src/preferences.ts`, `src/resolution.ts`,
`src/ui/arbre.ts`, `src/ui/chaine.ts`, `src/ui/index.ts`,
`src/ui/inspecteur.ts`, `src/ui/styles.css`, `src/ui/table.ts`,
`src/ui/textes.ts`, `src/ui/valeurs.ts`, `tests/annexes.test.ts`,
`tests/figmaDeTest.ts`, `tests/interface/interface.test.mjs`,
`tests/lecture.test.ts`, `tests/loiDeLectureSeule.test.ts`,
`tests/resolution.test.ts`, et `src/ui/poignee.ts` non suivi. Hors du paquet :
`AGENTS.md`.

Un fichier de cette liste que ce plan modifie reste non commité. La colonne
« Commit » du tableau ci-dessous dit, lot par lot, ce qui est parti.

| Lot | Commité | Laissé non commité |
|---|---|---|
| 0 et 1 | `src/composant.ts`, `tests/composant.test.ts`, `tests/fixtures.ts`, `tests/fixturesDeComposant.ts`, ce dossier | `tests/loiDeLectureSeule.test.ts` : `composant.ts` ajouté à la liste du noyau |

## Typings relus

`@figma/plugin-typings` 1.138.0, `plugin-api.d.ts`. Aucun écart avec le plan.

| Déclaration | Forme lue |
|---|---|
| `InstanceNode.overrides` | `{ id: string; overriddenFields: NodeChangeProperty[] }[]` |
| `InstanceNode.getMainComponentAsync` | `Promise<ComponentNode \| null>` ; un maître distant ou supprimé peut n'avoir aucun parent |
| `exportAsync` | `Promise<Uint8Array>` pour `{ format: 'PNG', constraint: { type: 'WIDTH', value } }` |
| `absoluteBoundingBox`, `absoluteRenderBounds` | `Rect \| null` |
| `getStyleByIdAsync` | `Promise<BaseStyle \| null>` |
| `textStyleId` | `string \| PluginAPI['mixed']` |
| `ComponentSetNode.defaultVariant` | `ComponentNode` |
| `ShowUIOptions.visible`, `figma.ui.show()` | Présents |

## Décisions prises pendant l'exécution

| Sujet | Décision |
|---|---|
| Mots des natures et des libellés | `natureDe` rend des identifiants (`couleur`, `fond`, `rayon`). Leurs mots sont dans `src/ui/textes.ts`, seul catalogue des textes |
| Calques d'une ligne | Chaque calque compte une fois, même s'il porte le token sur deux propriétés. `×N` compte des calques |
| Préfixe commun | `prefixeCommun` reçoit les noms des tokens du sujet entier, pas ceux de la portée : un nom court ne change pas quand le designer sélectionne un calque |
| Modes nommés | L'en-tête et la chaîne nomment le mode d'une étape quand sa collection en déclare plusieurs |
| Liaisons du pied | Le compte réunit les variables liées et les styles de texte portés, comme la maquette |
| Fixtures | `tests/fixturesDeComposant.ts` porte Button, Alert, TileLink, StressTest, Tag et Avatar ; `tests/fixtures.ts` les réexporte. Chaque liaison de la maquette y donne une liaison : une marge horizontale tient sur `paddingLeft` seul. Avatar reçoit un calque de texte, sans lequel sa couleur de texte n'aurait pas de calque porteur |

## Commandes exécutées

| Commande | Résultat |
|---|---|
| `npm test --workspace ucm-explorateur-plugin` (ligne de base) | 113 tests, 0 échec |
| `npm run typecheck` (ligne de base) | Vert |
| `npm run build --workspace ucm-explorateur-plugin` (ligne de base) | Vert |
| `npm run test:ui --workspace ucm-explorateur-plugin` (ligne de base) | 13 tests, 0 échec |
| `npm test` (ligne de base) | 2 452 tests, 0 échec |

## Reprendre après un échec

| Échec | Reprise |
|---|---|
| `test:ui` ne trouve pas `dist/galerie-fixtures.cjs` | `npm run galerie --workspace ucm-explorateur-plugin` |
| Chromium absent | `npx playwright install chromium` |

# E5d. Liaisons, alias de composant et scopes

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E5c.

Fichiers : `packages/kit/src/controles/corrections.ts`, `packages/kit/src/controles/mapping.ts`,
`packages/kit/src/controles/couche.ts`, `packages/kit/tests/stressComposantBase.test.ts` et les fixtures concernées.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E5.7 Un constat par liaison (Q-F3-12, Q-F3-16, N-06). Palette et état faux donnent une carte, vers le token qui corrige les deux
  segments, seulement si ce token est unique. Sinon, posez une question. Quand plusieurs constats visent la même liaison, celui qui porte la correction reste.
- [x] E5.9 Tokens d'icône (Q-F3-15, N-07). Un composant ne déclare plus de token d'icône. L'alias d'un token de composant vers un autre
  composant est un défaut. Les 3 fixtures qui emploient ce motif se mettent à jour.
- [x] E5.10 Écarts restants. N-04 et N-05 (scopes `SHAPE_FILL` et `FRAME_FILL` de C18), N-21 (variable non chargée ou inaccessible).
- [ ] E5.11 Monter la version du kit. Les régressions F3 passent. Retirez le `todo` N-04 seulement avec sa correction.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Code et tests écrits, non commités. E5.9 et E5.10 sont cochées. E5.7 reste ouverte pour le texte de la carte fusionnée. E5.11 reste ouverte : la montée de version est en F2.

Fait :

- E5.7. `controles/corrections.ts` : les constats C16, C22 et C24 d'une même liaison (variant, layer, surcharge, champ, indice ou plage, token) forment un groupe quand ils jugent des segments différents. Le premier segment faux dans l'ordre du nom (axes, état, rôle) garde la carte. Elle vise le token dont le nom corrige tous les segments : un seul token présent donne la correction, sinon une question, et le cas d'un état qui passe de `default` à `hover` garde son indice. `faits.autresEcarts` nomme les autres segments (`State=disabled`). Un C21 ou un C59 sur la même liaison se tait quand cette carte porte une correction (Q-F3-16). `mapping.ts` ajoute `faits.surcharge` à C21 pour retrouver la liaison. Deux constats du même axe restent séparés.
- E5.9. Aucun changement de source : `controlerCouches` rend déjà C20 pour l'alias d'un token de `components` vers un autre (test voisin dans `controles-composant.test.ts`). Les trois fixtures du motif sont les cas K3-4, K3-8 et K3-12 du harnais, qui perdent leur verdict `mesure`, avec le cas de chaîne. La fixture `packages/plugin-architect/tests/fixturesDeComposant.ts` garde `tilelink/sizes/icon` vers `icons/sizes/xl` : elle est hors des fichiers du lot. L'interdiction de déclarer un token d'icône dans un composant (propriété `icon-size`) relève de E8a.
- N-04 et N-05. `mapping.ts` `porteeAttendue` : le fond d'une forme (RECTANGLE, ELLIPSE, POLYGON, STAR, VECTOR, LINE, BOOLEAN_OPERATION) attend `SHAPE_FILL`, un cadre `FRAME_FILL`, un texte ou une plage `TEXT_FILL`. Le `todo` de N-04 est retiré de `stressComposantBase.test.ts` et le test passe.
- N-21. `mapping.ts` : C15, C16 et C17 se taisent quand la variable liée est non chargée ou inaccessible, ou que sa collection est inaccessible.
- Harnais F3 : `operateursAxes.ts` (L5 sans `mesure`), `operateursCibles.ts` (K3 sans `mesure`). `npm run stress:composant -- --operateur T`, `K`, `L`, `X` : 0 écart sauf X1-3 (C81), qui vient de la propagation et reste hors de ces lots.
- Tests d'Architect. `analyse.test.ts` : « le provisoire part après les contrôles du kit… » reçoit deux C25 voulus (le fond blanc de Root et la plage grise de Label n'ont pas de token, et E5.2 juge toute peinture) ; les deux fixtures qui liaient le texte directement à `theme` (« annuler au milieu de la remontée des fonds du thème… » et « l'analyse UCM ajoute C59 et C63… ») le lient au token du composant, puisque C59 ne juge plus la liaison directe.

Tests : `tests/liaisons-portees-et-fratrie.test.ts` (11 tests : carte unique palette et état, question sans token, palette et rôle, axe seul inchangé, C21 tu, C59 tu, C21 gardé sans token, N-04, N-05, N-21, E5.9), `stressComposantBase.test.ts`, `stressComposantOperateurs.test.ts`. Sur les sources d'avant le lot, 8 des 11 tests échouent (l'axe seul, le C21 gardé et E5.9 passent : leur règle existait) et le `todo` de N-04 échoue.

Commandes : `npm run build --workspace @ucm-kit/core` passe. `npm run test --workspace @ucm-kit/core` : 1610 tests, seul « 32 000 noms » dépasse son chrono sous charge. `npm run typecheck` rend 0. `npm run test:paquet -- architect` : voir le rapport.

Reste :

- E5.7, interface : la carte d'une liaison à deux segments faux doit dire le second (`faits.autresEcarts`). Texte à écrire avec `rediger-diagnostics-ucm`, puis à poser dans `packages/plugin-architect/src/ui/` (cartes de jetons).
- Fixture `fixturesDeComposant.ts` d'Architect : retirer `tilelink/sizes/icon` quand E8a tranche le token d'icône.
- E5.11 : montée de version du kit en F2.

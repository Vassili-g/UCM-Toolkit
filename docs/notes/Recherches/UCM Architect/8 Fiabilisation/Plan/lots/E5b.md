# E5b. Propagation et héritage

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E5a.

Fichiers : `packages/kit/src/controles/propagation.ts`, `packages/kit/src/controles/couche.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E5.4 Propagation (Q-F3-6, Q-F3-7, N-09, N-10). Elle recopie seulement les tokens lisibles du composant. Une plage déjà liée ne
  donne pas de question. Un layer propre à un variant ne donne rien. Deux homonymes sous le même parent donnent une question qui demande de renommer l'un des deux.
- [x] E5.5 Héritage (Q-F3-8, N-17). Une liaison héritée sans changement n'est jamais jugée. Une surcharge de l'hôte l'est.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Code et tests écrits, non commités. E5.4 et E5.5 sont cochées pour le kit ; le libellé de la question de renommage reste à écrire dans l'interface.

Fait :

- E5.4. `controles/propagation.ts` : la propagation ne recopie qu'un token du composant dont le nom se lit (`token.lecture` non vide), donc pas une liaison directe à `theme` ou `layout` ni un nom illisible (N-10). Un champ déjà lié, au bon token ou à un autre, ne donne rien : la propagation ne réécrit plus (`avant` vaut toujours `null`). La peinture d'une plage de texte se cherche dans les plages du layer visé : une plage nue reçoit une correction, une plage liée ne reçoit rien (N-09). Un layer sans homologue, ou sans la peinture du modèle, ne donne rien (Q-F3-7). Deux homonymes sous un même parent, dans le modèle ou dans le variant visé, donnent une question sans candidat ; `layers` nomme les homonymes du variant visé et `faits.homonymes` en donne le nombre.
- E5.5. `controles/couche.ts` : une liaison dont `provenance` vaut `composant-principal` n'est jamais jugée (C80, C20), quelle que soit la sorte de l'instance ; une surcharge de l'hôte l'est. `mapping.ts` applique la même règle à C19. Invariant `packages/kit/invariants/referentiel.md` corrigé.
- Oracles du harnais F3 : M2-6, M2-9, M2-10, M2-11, M2-14 et K1-9, K1-10 ne portent plus le verdict `mesure` ; M2-7 attend le premier homonyme comme layer.

Tests : `tests/propagation.test.ts` (6 tests ajoutés ou réécrits), `tests/controles-composant.test.ts` (C80 et C19 hérités), `stressComposantOperateurs.test.ts`. Ils échouent sur les sources d'avant (vérifié sur une copie).

Commandes : mêmes résultats que E5a pour le kit et le typecheck. `npm run test:paquet -- architect` : 2036 tests, 4 échecs dans des fichiers d'autres sessions (`controle-structure` deux fois, `analyse`, `lire-structure`) ; les échecs de `controle-couches` venus d'une lecture de `homonymes` sur le layer sont corrigés.

Reste :

- Le texte de la question d'homonymes (« renommer l'un des deux ») manque dans la note du lot : l'interface affiche la question sans candidat actuelle. À écrire avec `rediger-diagnostics-ucm`, puis à poser dans `packages/plugin-architect/src/ui/questions/modele.ts`.
- Ligne de `packages/kit/CARTE.md` pour `propagation.ts` mise à jour.

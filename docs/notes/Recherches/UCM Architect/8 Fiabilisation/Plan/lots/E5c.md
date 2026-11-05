# E5c. Texte et fond de page

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E5b.

Fichiers : `packages/kit/src/controles/theme.ts`, `packages/kit/src/controles/corrections.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E5.6 Texte sur fond de page (Q-F3-9, Q-F3-10, N-13, N-14). C59 suit l'alias du token du composant jusqu'au thème. Sa correction
  vise le token du composant qui vise `page/foreground`. Une plage n'est énumérée qu'une fois.
  C59 inclut les fonds `subtle`. Une liaison directe au thème garde C80 seul. Plusieurs tokens possibles vers
  `page/foreground` donnent une question, sans correction présélectionnée.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Code et tests écrits, non commités. E5.6 est cochée ; aucun texte du designer n'est à écrire.

Fait :

- N-13. `controles/theme.ts` : C59 ne juge plus que la liaison d'un token de `components`. `vers` suit son alias, de token en token, jusqu'à la variable de `theme`. Elle rend `undefined` pour une valeur directe ou pour deux modes qui visent deux variables du thème, et `inconnue` pour un alias qui mène hors du catalogue ou hors de `theme` et `components` (C20 en répond). C59 se tait dans les deux cas. Une liaison directe à `theme` garde C80 seul (Q-F3-9) ; une liaison tenue sans changement du composant principal n'est jamais jugée (Q-F3-8).
- Correction. Elle vise le token du même composant (`estDuComposant`), présent, dont l'alias mène à `page/foreground` de la même collection de thème et de la même palette. Un seul candidat donne la correction, zéro ou plusieurs donnent une question sans case cochée.
- Q-F3-10. `FONDS_DE_SURFACE` garde `surface/subtle`. Un fond lié par un token de `components` se juge sur le thème que ce token vise. Un fond illisible, un alias hors du catalogue ou une liaison directe hors de `components` (C80, C20) passent pour un fond possible : C59 n'accuse pas ce qu'il n'a pas lu.
- N-14. `liaisonsDuLayer` énumère une liaison de plage une seule fois, qu'elle figure dans `layer.liaisons`, dans la plage ou dans les deux.
- Oracles du harnais F3. `operateursTheme.ts` : T1 et T2 n'ont plus de cas `mesure`. La liaison directe n'attend plus que C80, le token attend C59 avec le token du composant pour clé, les deux cas `page/foreground` absent et en double passent par token, et le fond `page/foreground` posé par un token compte comme second candidat.

Tests : `tests/theme.test.ts` (les cinq tests C59 réécrits avec des tokens de `components`, sept tests ajoutés : liaison directe, chaîne de tokens, deux candidats, autre composant, plage énumérée une fois, liaison tenue du composant principal, `subtle` direct et par token, alias hors du catalogue), `stressComposantOperateursBis.test.ts`, `stressComposantOperateurs.test.ts`. Sur les sources d'avant le lot, 11 de ces tests échouent ; `subtle` et la liaison tenue échouent quand on retire leur ligne (vérifié).

Commandes : voir l'avancement de E5d, qui cumule les vérifications des deux lots.

Reste : rien dans le kit.

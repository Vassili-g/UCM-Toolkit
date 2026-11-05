# E3e. Variables indisponibles, voisins et scopes

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E3c.

Fichiers : `packages/kit/src/controles/structure.ts`, `packages/kit/src/controles/integrite.ts`,
`packages/kit/src/controles/catalogue.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E3.10 Écarts restants (N-08 reste ouverte ; les cinq autres sont faits). N-08, N-15, N-28 (voisine choisie par le dernier segment), N-30 (collection dans l'identifiant), N-31
  (variable non chargée), N-32 (scopes des FLOAT).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

E3.10 faite sauf N-08, qui reste décochée. Rien n'est commité.

- N-15, N-28 : `packages/kit/src/controles/structure.ts`. Une sœur en alias compte pour C63 `vide`. `alias-supprime` ne cite une voisine que si elle porte le même rôle sous un autre préfixe (`theme`) ou le même chemin à la palette près (`brands`, `utility`) ; ailleurs, aucune voisine.
- N-30, N-31, N-32 : `packages/kit/src/controles/integrite.ts`. L'identifiant devient `C82:cran-absent:${theme.cle}:${rampe}/${cran}`. Une variable `theme` non chargée protège son rôle contre la création (`lesPrefixes` rend `nonChargees`). Les scopes d'une couche sans portée sont jugés pour tout type de variable.
- Règle D-01 : `tailleReconnue` dans `nommage.ts` remplace le `termeReconnu(REGISTRE_TAILLES, …)` en ligne de `structure.ts`. `tests/reglesUniques.test.ts` passe.
- Régressions, vérifiées en échec sur les sources d’avant le lot : `tests/structure.test.ts` (N-15, N-28), `tests/integrite.absentes.test.ts` (N-30, N-31), `tests/integrite.structure.test.ts` (N-32). `integrite.absentes.test.ts` et `integrite.crans.test.ts` attendent le nouvel identifiant.
- N-08 en attente du mainteneur : Q-F3-5 garde C63 `theme` avec sa correction, la table de couverture veut un seul constat.

Décision de la conversation principale (le mainteneur l'a déléguée) : N-08 se règle en E10b. C63 `theme` reste seul avec sa correction au cran, et C20 se tait sur une liaison dont la variable reçoit déjà C63 `theme`.

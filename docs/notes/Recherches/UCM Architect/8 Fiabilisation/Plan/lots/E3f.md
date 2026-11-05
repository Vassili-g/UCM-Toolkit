# E3f. Cartes de couches et thème absent

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E3e.

Fichiers : `packages/kit/src/controles/integrite.ts` et les faits échangés avec Architect.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E3.8 Regroupement des C82 `couche` (QV-3, N-87). Une carte par couple de collections et par couche visée, avec le nombre de
  variables et de modes.
- [x] E3.9 Thème non reconnu (QV-4, N-88). Une information dit qu'aucune collection n'est reconnue comme `theme` et que l'intégrité UCM n'est pas contrôlée.
- [ ] E3.11 Monter la version du kit. Les nouvelles régressions F2 passent.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

E3.8 et E3.9 faites. E3.11 reste (le mainteneur monte la version en F2). Rien n'est commité.

- E3.8 : `integrite.ts`. Les constats C82 `couche` gardent un par variable et par mode (Ignorer et Appliquer restent par constat) et portent le fait `collection`. Le port `grouperLesCouches(constats)` (exporté par `controles/index.ts`, type `GroupeDeCouche`) rend un groupe par collection source et couche visée : variables, modes et identifiants des constats. La carte de l'interface est pour E4a.
- E3.9 : `controlerLIntegriteUcm` rend l'information `C82:theme-non-reconnu` (type `info`, genre `theme-non-reconnu`) quand le fichier reconnaît une collection UCM et aucune `theme`. Un fichier sans aucun rôle reconnu (libre) et une collection `theme` inaccessible restent muets.
- Régressions, vérifiées en échec sur les sources d’avant le lot : `tests/integrite.structure.test.ts` (QV-3), `tests/integrite.absentes.test.ts` (QV-4). `plugin-architect/tests/variableSupprimee.test.ts` attend l'information en plus du C63.
- Documents : `packages/kit/CARTE.md` (ligne d'`integrite.ts`) et `packages/kit/invariants/versionnage.md` (deux invariants C82).

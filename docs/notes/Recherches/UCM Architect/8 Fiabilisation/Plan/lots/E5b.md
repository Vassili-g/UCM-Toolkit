# E5b. Propagation et héritage

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E5a.

Fichiers : `packages/kit/src/controles/propagation.ts`, `packages/kit/src/controles/couche.ts`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E5.4 Propagation (Q-F3-6, Q-F3-7, N-09, N-10). Elle recopie seulement les tokens lisibles du composant. Une plage déjà liée ne
  donne pas de question. Un layer propre à un variant ne donne rien. Deux homonymes sous le même parent donnent une question qui demande de renommer l'un des deux.
- [ ] E5.5 Héritage (Q-F3-8, N-17). Une liaison héritée sans changement n'est jamais jugée. Une surcharge de l'hôte l'est.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Pas commencé.

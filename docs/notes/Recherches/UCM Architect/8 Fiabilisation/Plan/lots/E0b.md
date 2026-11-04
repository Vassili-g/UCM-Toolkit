# E0b. Mesure des opérateurs F3-F4

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E0.
Fichiers : `packages/plugin-architect/scripts/stress/f3-composant/executer.ts`, les opérateurs existants sous
`packages/kit/tests/stress/f3-composant/` et un nouveau module de mesure dans le dossier de l'exécuteur.

- [ ] E0.6 Faites mesurer les opérateurs du kit F3-F4 par l'exécuteur existant. Il ne joue aujourd'hui que la chaîne de 67 cas.
  Réemployez les opérateurs et leurs oracles, sans recopier les contrôles. Séparez leur tableau de celui de la chaîne.
- [ ] E0.7 Donnez attendus, manqués, faux constats, corrections inexactes, exceptions et durées.
  Gardez les résultats nommés sous `_local/stress/f3-composant/`. Testez le comptage sur un échantillon fabriqué.

Fin : `npm run stress:composant --workspace ucm-architect-plugin` rend deux tableaux distincts et déterministes sur les mêmes entrées.
`npm run test:paquet -- architect` passe. Le lot mesure les défauts existants sans corriger le produit.

## Avancement

Pas commencé.

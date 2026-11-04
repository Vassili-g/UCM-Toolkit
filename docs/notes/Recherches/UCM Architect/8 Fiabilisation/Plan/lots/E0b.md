# E0b. Mesure des opérateurs F3-F4

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E0.
Fichiers : `packages/plugin-architect/scripts/stress/f3-composant/executer.ts`, les opérateurs existants sous
`packages/kit/tests/stress/f3-composant/` et un nouveau module de mesure dans le dossier de l'exécuteur.

- [x] E0.6 Faites mesurer les opérateurs du kit F3-F4 par l'exécuteur existant. Il ne joue aujourd'hui que la chaîne de 67 cas.
  Réemployez les opérateurs et leurs oracles, sans recopier les contrôles. Séparez leur tableau de celui de la chaîne.
- [x] E0.7 Donnez attendus, manqués, faux constats, corrections inexactes, exceptions et durées.
  Gardez les résultats nommés sous `_local/stress/f3-composant/`. Testez le comptage sur un échantillon fabriqué.

Fin : `npm run stress:composant --workspace ucm-architect-plugin` rend deux tableaux distincts et déterministes sur les mêmes entrées.
`npm run test:paquet -- architect` passe. Le lot mesure les défauts existants sans corriger le produit.

## Avancement

E0.6 et E0.7 faits, non commités.

- Fichiers : `packages/plugin-architect/scripts/stress/f3-composant/operateurs.ts` (nouveau), `executer.ts` (appelle le module, tableau séparé de la chaîne, options `--operateur` et `--cas K4-3`), `packages/plugin-architect/tests/stressOperateursComposant.test.ts` (nouveau).
- `npm run stress:composant --workspace ucm-architect-plugin` : 558 cas, 1 901 attendus, 1 607 détectés, 40 manqués, 3 890 faux constats, 220 corrections inexactes, 0 exception, 65 cas `mesure` (508 écarts en attente), 38 s. Deux exécutions donnent le même `operateurs.txt` et le même `operateurs.json` (`cmp`). Les durées vont à l'écran et dans `operateurs-durees.json`.
- L, R et K redonnent 185 attendus, 181 détectés, 2 manqués, 3 faux constats, comme MESURE-DES-FAILLES.md.
- `tsx --test` du nouveau test : 2 réussis. `npm run typecheck` et `node scripts/controle-style.mjs` passent. `npm run test:paquet -- architect` : 1 échec, `verrouDuProvisoire.test.ts` (fichier d'un autre lot) ; un essai précédent a échoué sur le seuil de durée de `nomenclatureCheminsPublies.test.ts`.
- Reste : ligne de CARTE.md à ajouter par la conversation principale.

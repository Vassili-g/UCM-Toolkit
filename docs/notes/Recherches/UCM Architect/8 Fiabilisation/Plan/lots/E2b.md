# E2b. Fautes et seuils

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E2a.

Fichiers : `packages/kit/src/referentiel/questions.ts`, `packages/kit/src/referentiel/harmonisation.ts`,
`packages/kit/tests/stress/f1-noms/`. Lisez `PLAN-STRESS-F1-NOMS.md`, sections 4 et 8.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E2.3 Règle des fautes. Une faute n'a plus besoin de partager une place (E-05), ni d'une référence vue dans 5 noms (E-01). Une
  faute vue dans 3 noms ou plus reste vue (E-02). L'échange de deux lettres est une faute (E-03). Deux mots hors vocabulaire à une lettre
  donnent une question, le plus fréquent en premier (Q-F1). Une faute ou un mot collé d'un seul nom va dans Questions (Q-F3).
- [ ] E2.4 Fautes à deux lettres (Q-F9). Elles donnent une question, seulement pour un mot au-dessus du seuil de longueur.
- [ ] E2.5 Seuils (Q-F4). `npm run stress:f1 -- --faux-positifs` mesure la courbe. Le seuil d'une lettre et celui de deux lettres sont
  les plus petites longueurs à moins d'un faux positif pour 1 000 noms justes. Les valeurs vont dans le kit.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Pas commencé.

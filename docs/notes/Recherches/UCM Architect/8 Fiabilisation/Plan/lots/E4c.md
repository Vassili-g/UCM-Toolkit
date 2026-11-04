# E4c. Fusion de variables

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur-exigeant`. Dépend de : E4b, E3c.

Fichiers : `packages/plugin-architect/src/ecriture/structure.ts`, `packages/plugin-architect/src/ecriture/journal.ts`,
`packages/plugin-architect/src/messages/structure.ts`, `packages/plugin-architect/src/sandbox/structure.ts`
et les cartes de `packages/plugin-architect/src/ui/structure/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E4.4 Fusion de deux variables du même rôle (Q-F2-6, option C). Architect relie à la variable gardée chaque token et chaque layer du
  fichier, puis fait de l'autre un alias de la variable gardée, marquée à retirer. Un second constat propose de la retirer quand plus
  rien ne l'emploie.

Fin : `npm run test:paquet -- architect` passe. Les tests vérifient tokens, layers, alias et marquage, avec refus et écriture partielle. Le critère de retrait reste soumis à la preuve demandée au mainteneur dans le rapport de relecture.

## Avancement

Pas commencé.

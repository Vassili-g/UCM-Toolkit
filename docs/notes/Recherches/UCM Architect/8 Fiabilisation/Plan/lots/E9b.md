# E9b. Visibilité et fond du texte

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E9a.

Fichiers : `packages/kit/src/controles/accessibilite.ts` et les acquisitions qui alimentent les opacités et les fonds.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E9.2 Opacités (Q-F7-2, N-48, N-57). L'alpha effectif multiplie ceux des ancêtres. Un layer d'alpha effectif nul n'est pas mesuré.
- [ ] E9.3 Grand texte gras à 56/3 px et 700 (Q-F7-3).
- [ ] E9.4 Fonds (Q-F7-4, N-45, N-47). Un frère plus bas qui couvre la boîte du texte est son fond. Une couverture partielle donne `fond-indetermine`. La visibilité suit chaque ancêtre.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

Pas commencé.

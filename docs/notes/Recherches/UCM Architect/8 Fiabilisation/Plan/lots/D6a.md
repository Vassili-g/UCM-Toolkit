# D6a. Virtualisation des cartes

Phase D. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase D
dans [README.md](../README.md).

Fichiers : `src/ui/virtualisation.ts`, tests unitaires nouveaux dans `packages/plugin-architect/tests/`.

- [x] D6.1a Adaptez la liste aux cartes dépliables, ou virtualisez seulement leurs sous-listes de hauteur fixe.
  Conservez focus, état déplié, menus, réponses et cases quand une ligne sort puis revient à l'écran.

Fin : `npm run test:paquet -- architect` passe. Les tests sur faux DOM bornent le nombre de nœuds et couvrent le retour d'une carte dépliée.

## Avancement

D6.1a fait (Claude). `creerListeDeCartes` ajoutée à `src/ui/virtualisation.ts` : cartes de hauteur variable, état rangé par clé via `sauver`, focus rendu par `data-focus`. `creerListeVirtuelle` est inchangée (arbre et table). Tests : `tests/listeDeCartes.test.ts` (6, faux DOM). Reste : vérifications finales (voir rapport), puis D6b.

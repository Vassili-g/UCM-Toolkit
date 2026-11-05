# D6b. Branchement des sections

Phase D. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase D
dans [README.md](../README.md).

Fichiers : `src/ui/structure/aFaire.ts`, `src/ui/structure/corrections.ts`, `src/ui/nomenclature/aAppliquer.ts`,
`src/ui/nomenclature/aTrancher.ts`, galerie et tests.

- [x] D6.1b Branchez les sections de plus de 50 cartes sur D6a. Le repli au-delà de 20 cartes de C3 reste une règle distincte.
  Le cochage global compte aussi les cartes hors du DOM. Ajoutez les états longs de galerie.

Fin : `npm run test:paquet -- architect` passe. Les tests gardent les compteurs et les gestes après défilement.
Le mainteneur relit les listes longues dans la galerie.

## Avancement

D6.1b écrite (Claude, non commitée, case non cochée).

Code, dans `packages/plugin-architect/src/ui/` :
- `virtualisation.ts` : `creerHoteDeCartes(hote, questionsSeules)`, `SEUIL_DE_LISTE = 50` et `rafraichirLesListesDe`. Jusqu'à 50 cartes (les intertitres ne comptent pas), l'hôte les pose comme avant. Au-delà, il contient une `creerListeDeCartes` bornée à 480 px de haut (`styles/structure.css`, `.liste-de-cartes`), qui défile seule. Une carte est créée à sa première apparition à l'écran et gardée, hors du DOM quand elle sort, jusqu'à la pose suivante : case, dépliage, menu d'Ignorer ouvert et pages chargées reviennent avec elle. `creerListeDeCartes` est inchangée, et `sauver` ne rend rien.
- `structure/aFaire.ts`, `structure/corrections.ts`, `nomenclature/aAppliquer.ts`, `nomenclature/aTrancher.ts` posent leurs cartes par `creerHoteDeCartes`. Le seuil s'applique à chaque conteneur : une catégorie de structure a un conteneur de constats et un de corrections, Noms a un conteneur de questions et un de renommages. Le repli de Noms au-delà de 20 cartes (`tokens/panneau.ts`, `SEUIL_DE_REPLI`) n'est pas touché.
- `tokens/panneau.ts` appelle `rafraichirLesListesDe` après chaque dessin des sections : un élément détaché perd sa position de défilement, et la liste la retrouve. `structure/index.ts` donne `questionsSeules` aux deux modules : sous la puce Questions, une liste longue ne garde que les cartes à question, car `.filtre-questions` ne peut pas cacher des cartes que la liste compte dans sa hauteur.
- Le cochage global lit les identifiants, non le DOM. Dans `corrections.ts` les lignes cochées vivent dans un ensemble, et une carte créée après coup prend ses cases dans cet ensemble. Dans `aAppliquer.ts` le modèle de sélection compte tous les groupes, et une carte créée prend l'état du modèle, du filtre de l'arbre et de la carte ciblée. Sous le filtre de l'arbre, les cartes sans nom retenu quittent la liste au lieu d'être cachées.
- `aAppliquer.ts` : la carte demandée par « Voir dans Corrections » est amenée à l'écran par `hote.montrer` avant d'être dépliée. `aTrancher.ts` fait de même avant de redonner le focus.

Tests : `tests/listesDeSections.test.ts` (20, faux DOM, nouveau). Il couvre le conteneur (seuil de 50 intertitres exclus, 2 000 cartes pour une portion de nœuds, retour d'une carte avec son état, `montrer`, puce Questions, retour sous le seuil) et, pour 120 cartes, les compteurs de la bande, de la puce et de `tokens.total()`, « Tout cocher » du pied et de la section, une case cochée avant et après défilement, Appliquer qui envoie les 120 identifiants de structure, Ignorer « Pour cette palette » sur une carte atteinte par défilement, les 480 noms et 119 groupes envoyés par les renommages, la réponse à une question atteinte par défilement, la section repliée puis rouverte à la même position. `tests/domDeTest.ts` gagne `before` et `parentElement`. `tests/rapport.test.ts` ajoute `choix` au faux panneau.

Galerie, `galerie/etats/structure.cjs`, galerie de 680 px : `t-liste-longue-noms` (120 renommages, Noms ouverte), `t-liste-longue-noms-cochee` (« Tout cocher » du pied, pied à 480 noms), `t-liste-longue-constats` (60 constats sous Couches). Chargés dans Chromium hors de `test:ui` : 17 cartes dans le DOM pour 123, 24 après un défilement de 3 000 px, aucune erreur de console.

Commandes : `npm run build --workspace @ucm-kit/core` passe. `npm run typecheck` passe. `npm run test:paquet -- architect` : 2 024 passent, 2 échouent (`tests/tokensCategories.test.ts` : `t-integrite-a-faire` compte 0 carte sous Crans au lieu de 1, et « une question de structure reste dans sa catégorie… »). Les deux lisent des constats de `packages/kit/src/controles/` (`integrite.ts` et `theme.ts`), qu'une autre session modifie ; aucun fichier de ce lot n'y touche. `npm run galerie:plugin -- architect` construit 125 états.

Reste : relire les trois états dans la galerie (hauteur de 480 px de la liste, espacement entre les intertitres et les cartes dans la liste de Noms) ; le seuil de 50 compte chaque conteneur, non la section entière (une catégorie à 40 constats et 40 corrections n'a pas de liste) ; aucun `tests/interface/*.mjs` ne vérifie encore le défilement.

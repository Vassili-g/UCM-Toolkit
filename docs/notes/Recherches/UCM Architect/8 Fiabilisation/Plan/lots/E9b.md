# E9b. Visibilité et fond du texte

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E9a.

Fichiers : `packages/kit/src/controles/accessibilite.ts` et les acquisitions qui alimentent les opacités et les fonds.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E9.2 Opacités (Q-F7-2, N-48, N-57). L'alpha effectif multiplie ceux des ancêtres. Un layer d'alpha effectif nul n'est pas mesuré.
- [x] E9.3 Grand texte gras à 56/3 px et 700 (Q-F7-3).
- [x] E9.4 Fonds (Q-F7-4, N-45, N-47). Un frère plus bas qui couvre la boîte du texte est son fond. Une couverture partielle donne `fond-indetermine`. La visibilité suit chaque ancêtre.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

E9.2 et E9.3 faits côté kit. E9.4 fait côté kit, case non cochée : l'acquisition d'Architect ne livre pas encore les positions.

- `packages/kit/src/controles/accessibilite.ts` : `opaciteEffective` multiplie l'opacité d'un layer par celles de ses ancêtres ; `pileDePeintures` la reçoit et laisse tomber une peinture d'alpha effectif nul. `ciblesDeContraste` écarte un layer d'opacité effective nulle et une plage vide ; `mesurerLeVariant` passe une pile sans couche (plage sans peinture, alpha 0). L'anneau d'opacité effective nulle ou de couleur d'alpha 0 ne compte plus (N-57). Les fonds des ancêtres utilisent l'opacité effective de l'ancêtre. `estGrandTexte` compare à 56/3 px en graisse 700. `freresDeFond` liste, du plus proche au plus bas, les frères plus bas qui sont des rectangles, cadres, ellipses, composants ou instances, visibles, avec un remplissage visible et une boîte lue ; `couchesDuFond` les compose avant les ancêtres, s'arrête à la première couche opaque, et rend `fond-indetermine` sans repli (`sansRepli`) pour un frère qui ne recouvre la boîte qu'en partie. Sans frère de fond, le fond reste mémorisé par chaîne d'ancêtres.
- `packages/kit/src/controles/releve.ts` `layersVisiblesDuVariant` : un layer visible sous un parent visible sous un grand-parent masqué était jugé visible quand le grand-parent était déjà évalué (N-45). Une chaîne masquée marque désormais tous ses layers masqués. Fichier hors de la liste du lot, touché parce qu'il porte la règle « la visibilité suit chaque ancêtre ».
- Tests : `packages/kit/tests/accessibilite.test.ts` (14 tests E9.2 à E9.11 ajoutés ; sur les sources du lot précédent, 13 échouent, le quatorzième garde la dépendance au thème). Oracle de F7 : G1, O1, O3-5, O5, F6 passent de `mesure` à `attendu` ; `mesurer.ts --operateur G1|O1|O3|O4|O5|O6|F5|F6` : 0 écart, 0 en attente. Les écarts restants de la section B (icônes, F4, L2, Z2-14, contours R1-12/R1-16, R4-9, R4-10) existaient avant le lot.

Décisions prises :
- Les frères d'un ancêtre ne servent pas de fond : seuls les frères du layer mesuré comptent (Q-F7-4).
- Un frère de type VECTOR, TEXT ou autre ne sert pas de fond, pour ne pas accuser une icône voisine dont la boîte touche le texte.
- Une boîte sans position lue (x ou y non fini) ne donne aucun frère de fond.

Acquisition d'Architect à changer (non faite, fichier de l'autre session) : `packages/plugin-architect/src/sandbox/projectionsDesControles.ts`, famille `controle-accessibilite`, ajouter `dimensions.x` et `dimensions.y` à la liste de `LAYERS` (aujourd'hui `dimensions.largeur`, `dimensions.hauteur`). Le relevé de `releveDuComposant.ts` `dimensionsDe` porte déjà `x` et `y` absolus. Sans cet ajout, la projection n'a pas de position, aucun frère ne sert de fond, et `npm run test:paquet -- architect` échoue sur quatre tests : les trois « controle-accessibilite : tout ce que la famille lit … est dans son gabarit », « un gabarit qui omet un champ lu est refusé par l'enregistrement des accès » (qui attend alors seulement `opacite` en manque) et « changer l'ajout d'un calque lié ne change que les projections qui le lisent ».

Textes manquants : aucun pour E9.2 à E9.4 (`fond-indetermine` existe déjà).

Reste : l'ajout des deux chemins au gabarit, puis cocher E9.4.

E9.4 fermée par la conversation principale : `dimensions.x` et `dimensions.y` ajoutés au gabarit `controle-accessibilite` de `projectionsDesControles.ts`. Le scénario « ajout d’un calque lié » de `projectionsDesControles.test.ts` ne compte plus l’accessibilité parmi les constats changés, car sa plage n’a aucune couleur.

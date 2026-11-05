# E9d. Contours et anneaux

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E9c, E1b.

Fichiers : `packages/kit/src/controles/accessibilite.ts` et la définition commune d’anneau de E1b.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E9.8 Contours (Q-F7-8, N-63). Un contour sous 3:1 reste muet quand le remplissage du layer atteint 3:1. Sans remplissage visible,
  ou sous 3:1, mesurez le contour sur le fond des ancêtres.
- [x] E9.9 Anneau par E1.4 (Q-F7-9, N-58, N-59). Un anneau rempli sans contour se mesure sur son remplissage.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

E9.8 et E9.9 faits côté kit.

- `packages/kit/src/controles/accessibilite.ts` : `leRemplissageAtteintLeSeuil` rend muet le contour (usage `stroke`) quand le remplissage du même layer, composé sur le même fond, atteint 3:1. Un remplissage absent, masqué, incalculable (dégradé, image, mode illisible) ou sous 3:1 laisse le contour mesuré sur le fond des ancêtres. Un anneau sans contour visible et rempli devient une cible `C50` d'usage `anneau` sur le champ `fills`. `anneauxDuVariant` reconnaît aussi un anneau sans peinture propre quand un descendant visible se peint (`unDescendantSePeint`). C51 ne juge plus l'épaisseur d'un anneau sans contour visible.
- Tests : `packages/kit/tests/accessibilite.test.ts` (3 tests E9.8 et E9.9, qui échouent sur les sources du lot précédent). `mesurer.ts --operateur R1|R4|R5` : 0 écart, 0 en attente ; R1-12 à R1-14, R4-9, R4-10, R5-12 passent de `mesure` à `attendu`. I5-1 et I5-2 (VECTOR `ring` rempli) attendent désormais un constat d'anneau.

Décisions prises :
- Un contour mesuré sur la page Figma garde sa limite `fond-de-repli` même quand le remplissage le rend muet.
- Le remplissage d'un layer ne couvre le contour que s'il atteint 3:1 sur le même fond et dans la même combinaison de modes.


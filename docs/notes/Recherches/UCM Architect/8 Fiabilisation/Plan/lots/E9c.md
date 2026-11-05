# E9c. Modes, garanties et identifiants

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur`. Dépend de : E9b.

Fichiers : `packages/kit/src/controles/accessibilite.ts` et les faits des garanties dans `packages/kit/src/emplois/`.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [x] E9.6 Modes du thème au repli (Q-F7-6). Incluez les modes de `theme` dès que le repli sert, même pour le texte en dur. Borne de 5 000 qui dit les variants non mesurés, sans collection inutile (Q-F7-11, N-61).
- [x] E9.7 Garantie du thème (Q-F7-7, N-49). `corriger` seulement si la garantie vise le même type de seuil, le niveau demandé et ce fond.
- [x] E9.11 Identifiant d'un constat de contraste par code, nom du layer, usage et fond nommé, sans plage ni niveau (Q-F7-12, N-62). Une plage vide ne donne rien (N-56).

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit.

## Avancement

E9.6, E9.7 et E9.11 faits.

- `packages/kit/src/controles/accessibilite.ts` : `combinaisonsDeModes` reçoit les cibles du variant (calculées une fois par `ciblesDeContraste`, puis passées à `mesurerLeVariant`). Une collection d'au moins deux modes dont aucune variable atteinte ne change de valeur d'un mode à l'autre sort du produit (`collectionInerte`) ; une collection à un mode reste, pour garder son étiquette. Si une cible se mesure sur le repli (`leRepliSertA` : fond `fond-indetermine` hors `sansRepli`, avec des fonds d'élévation), les modes de la collection `theme` entrent dans le produit. Les cibles qui ne se mesurent pas sur le repli ne gardent que la première combinaison de chaque état des autres collections, étiquetée sans le thème (`Combinaison.sansTheme`, `sansLeTheme`). `C49:borne` gagne `variantsNonMesures`, le nombre de variants dont le produit dépasse les combinaisons mesurées.
- `estGaranti` reçoit l'usage et le niveau : la garantie du thème couvre un texte (ou grand texte) seulement pour une garantie de seuil `texte` au niveau AA, et un icône, contour ou anneau seulement pour une garantie `nonTexte`. Sinon le constat est à vérifier.
- Identifiant : `code:layer:usage[:fond]`, sans plage, seuil ni niveau ; une limite : `code:layer:usage:limite:cause`. Deux plages d'un même layer et de même usage donnent un constat, celui du pire rapport. `fin <= debut` ne donne ni contraste ni taille.
- Harnais F7 : `cas.ts` ignore la plage dans `cleDeContraste` et `cleDeLimite` ; T1-1, T2-2 et l'interaction T1+M1 attendent un seul constat ; `poserLaBorne` donne un noir distinct par mode (sinon la collection sort du produit) ; M3 distingue les modes de ses chaînes et de son trait ; Q2-2, Q4-1, Q4-2, M6, Y1-10 à Y1-14, T2-2, O4+M6 passent de `mesure` à `attendu` ; il ne reste que Q-F7-10 en `mesure` pour G3-9.
- `packages/plugin-architect/tests/analyse.test.ts` : le test d'annulation pendant la matérialisation des modes lit un blanc légèrement différent par mode, car des modes de même couleur sortent désormais du produit.
- Tests : `packages/kit/tests/accessibilite.test.ts`, `stressAccessibiliteOperateurs.test.ts`, `stressAccessibiliteOperateursBis.test.ts`. `mesurer.ts --operateur M*|Q*|T*|Y1` : 0 écart pour M, Q, T ; Y1-2 et Y2 gardent l'écart des icônes qui existait avant.

Décisions prises :
- Une collection à un seul mode ne sort jamais du produit : elle ne change pas le compte et garde l'étiquette.
- Une garantie du thème ne couvre que le niveau AA : les seuils 4,5 et 3 des garanties sont ceux d'AA.
- Un mode du thème qui n'entre que pour le repli ne s'écrit pas dans l'étiquette d'une cible mesurée sur un fond opaque.

Textes manquants : la phrase de `C49:borne` dit les combinaisons non mesurées (`packages/plugin-architect/src/ui/panneau/informations.ts` `pairesNonMesurees`) ; elle ne dit pas `variantsNonMesures`. Phrase à écrire avec `rediger-diagnostics-ucm`.

Reste : rien dans le lot.

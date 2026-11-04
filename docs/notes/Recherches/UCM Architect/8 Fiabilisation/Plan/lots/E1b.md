# E1b. Icône, anneau et rôle de layer

Phase E. Lire avant de commencer les règles d'exécution, les chemins et commandes et l'introduction de la phase E
dans [README.md](../README.md).

Agent : `implementeur-exigeant`. Dépend de : E1a.

Fichiers : `packages/kit/src/controles/mapping.ts`, `packages/kit/src/controles/typographie.ts`,
`packages/kit/src/controles/accessibilite.ts`, `packages/plugin-architect/src/ui/composant/signes.ts`.
Auditez aussi `packages/plugin-socle/src/composant/contract/imbriques.ts`, sans changer sa règle d’export sur son seul nom.
Ajoutez les régressions voisines de chaque autorité modifiée.

- [ ] E1.3 Définition unique d'une icône (Q-F6-3, Q-F3-4, Q-F6-4, E-26). L'instance d'un composant `Icon` est le cas principal. Puis
  une instance qu'une propriété INSTANCE_SWAP pilote, dont la propriété ou le layer porte un mot d'icône, ou un VECTOR ou
  BOOLEAN_OPERATION dont le nom contient le mot entier `icon`, `icône`, `glyph`, `pictogram` ou `symbol`. Un FRAME ou un TEXT n'est jamais
  une icône. Les contrôles importent la définition commune du kit. Auditez aussi
  `packages/plugin-architect/src/ui/composant/signes.ts` (`estUnLayerDIcone`, `estUnTokenDIcone`).
  Distinguez la responsabilité d'export de `packages/plugin-socle/src/composant/contract/imbriques.ts` (`estUneIcone`).
  Ne supprimez pas ce lecteur sur son seul nom.
- [ ] E1.4 Définition d'un anneau (Q-F7-9). Un layer lié à un token de rôle `ring`, ou nommé `Ring` ou `Focus ring`. `NOM_D_ANNEAU`
  passe dans le référentiel.
- [ ] E1.5 Rôles qui désignent un layer (Q-F3-3). `divider` (noms `Divider`, `Separator`), `ring` (noms `Ring`, `Focus ring`) et `icon`
  (instance d'`Icon`). Les autres rôles ne regardent pas le nom.
- [ ] E1.7 Monter la version du kit.

Fin : `npm run test --workspace @ucm-kit/core` passe. Les régressions ciblées de chaque case échouent sans sa correction. Les contrôles racine suivent toute modification des sources du kit. `npm run test:paquet -- architect` passe aussi.

## Avancement

Code et tests écrits, non commités, cases non cochées. E1.7 reste à F2.

Fait :

- `packages/kit/src/referentiel/layers.ts` (nouveau, exporté par `referentiel/index.ts`) porte `MOTS_D_ICONE`, `estUneIcone`, `estUneInstanceDIcone`, `motDIconeDansLeNom`, `estUnNomDAnneau`, `estUnAnneau(layer, rolesLies)`, `estUnNomDeSeparateur`, `ROLES_QUI_DESIGNENT_UN_LAYER`, `leNomDuLayerDitLeRole` et `roleQueLeLayerDesigne`.
- E1.3. `controles/mapping.ts` (C17), `controles/accessibilite.ts` (C49) et `controles/typographie.ts` (C66, C67) lisent `estUneIcone`. Pour une surcharge, C17 admet aussi le tracé intérieur d'une instance d'`Icon`. `ui/composant/signes.ts` d'Architect lit `estUneIcone` dans `estUnLayerDIcone` ; `estUnTokenDIcone` reste, car il juge un nom de token et non un layer (commentaire ajouté).
- E1.4. `NOM_D_ANNEAU` quitte `accessibilite.ts`. C50 et C51 reconnaissent un anneau par `estUnAnneau(layer, rolesLiesDuLayer(layer, catalogue))`, donc aussi un layer `Outline` lié à un token `…/ring`. `mapping.ts` n'admet le rôle `ring` d'un contour que sur un nom d'anneau (l'ancien `/ring|focus/i` acceptait `Focus` et `Ring Wrapper`).
- E1.5. La table des rôles qui désignent un layer et `roleQueLeLayerDesigne` sont définies et testées. Aucun contrôle ne les emploie encore : le constat de nom et de rôle est E5.3 (E5a).
- Gabarits d'Architect : `packages/plugin-architect/src/sandbox/projectionsDesControles.ts` ajoute `instanceDe.nom` à mapping, accessibilité et typographie (et `instanceDe.pilotee` à l'accessibilité), car les contrôles lisent maintenant le nom du composant posé. Sans cela, `tests/projectionsDesControles.test.ts` échoue 9 fois.
- Audit de `packages/plugin-socle/src/composant/contract/imbriques.ts`, `estUneIcone` : il juge un composant imbriqué, non un layer. Il est une icône si le composant ne déclare aucune propriété publique et si son sous-arbre n'est qu'un dessin, donc sans lire de nom. Sa question (le contrat d'un parent doit-il demander des règles à ce composant ?) n'est pas celle du kit. Il garde sa responsabilité et sa règle, sans lire le kit. Aucun fichier du socle modifié.
- Audit de `controles/corrections.ts` (`corrigerLiaisonManquante`) : la branche `/icon/i.test(layer.nom) ? 'icon'` est inatteignable, car C25 ne vise que des TEXT nommés `title`. Non modifiée ; à supprimer ou à brancher sur `estUneIcone` quand un lot touchera cette correction.

Tests ajoutés :

- `packages/kit/tests/definitionsDeLayer.test.ts` : les définitions seules (mots entiers, trois cas d'icône, FRAME et TEXT exclus, anneau par nom ou par rôle, trois rôles de layer).
- `packages/kit/tests/iconeDansLesControles.test.ts` : C66, C49 et C17 jugent les mêmes neuf layers de la même façon ; slot d'échange (Q-F6-4) ; surcharge d'une instance d'`Icon` ; anneau par rôle pour C50 ; rôle `ring` de C17 par nom ; aucune expression propre dans les trois contrôles.
- `packages/plugin-architect/tests/signesDeComposant.test.ts` : le signe d'un fond de TileLink selon le layer (instance d'`Icon`, tracé `icon`, `Silicone`, FRAME `icon-container`, instance de `Photo`).
- Retouches de `controles-lectures-manquees.test.ts`, `controles-recette-figma.test.ts`, `typographie.test.ts`, `stress/f5-variants/composantDeBase.ts` et `stress/f5-variants/typo/definitionsDIcone.ts` : une icône de ces fixtures est maintenant une instance d'`Icon` (nom du composant `Icon`), comme la décision le veut.

Régressions vérifiées en neutralisant la correction un instant (le fichier est rétabli ensuite) : chaque lecteur remis à son ancienne expression fait échouer ses tests, ainsi que la suppression de l'exclusion des FRAME et TEXT, du filtre de nom sur l'échange d'instance, du mot `separator`, du rôle `ring` de `estUnAnneau`, de `estUneInstanceDIcone` pour la surcharge, et l'ancien `estUnLayerDIcone` d'Architect.

Commandes :

- `npm run build --workspace @ucm-kit/core` : passe.
- `npm run test --workspace @ucm-kit/core` : 1505 tests, 1504 passent. Échoue une fois `32 000 noms conservent les comptes et le plafond de questions` (5,3 s pour 5 s de borne, mesure de durée sans lien avec le lot) ; seul, le fichier passe (2,3 s).
- `npm run test:paquet -- architect` : 1932 tests, 1931 passent. Échoue `tests/analyse.test.ts`, « une lecture refusée en fin d'analyse… », dans les fichiers `src/sandbox/analyse.ts`, `src/messages/analyse.ts`, `src/ui/composant/analyse.ts` et `src/ui/textes/analyse.ts` qu'une autre session modifie (B6) : signalé, non corrigé.
- `npm run typecheck` : passe.
- `node scripts/run-tests.cjs` (racine) : 512 tests, 5 échecs. `versionSuitLeContenu` (attendu jusqu'à F2). `cartes.test.ts` pour `packages/kit/CARTE.md`, dont le contenu commité est abîmé (voir Reste). `referentielUnique.test.ts` et `styleDocumentaire.test.ts` (deux tests) échouent sur `tests/referencesComposants.test.ts`, `Plan/lots/C3.md` et `Plan/lots/C4.md`, fichiers d'autres sessions.

Reste :

- La conversation principale écrit la ligne de carte de `layers.ts` dans `packages/kit/CARTE.md` et la règle dans `packages/kit/invariants/referentiel.md` (lignes données dans le rapport de l'agent). `packages/kit/CARTE.md` a pour chaque ligne un suffixe « ; chaque type d'alerte porte son repli … » et des lignes de titre doublées, posés par le commit de A10 (8899b0fa) : à nettoyer avant d'y écrire.
- E1.7 : la version du kit se monte une seule fois en F2.
- E5.3 emploie `roleQueLeLayerDesigne` ; E9.9 mesure l'anneau rempli sans contour.

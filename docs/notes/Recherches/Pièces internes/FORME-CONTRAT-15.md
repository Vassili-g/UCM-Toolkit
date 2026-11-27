# Forme du contrat 15.0

Ce document fixe la forme du contrat de composant que P22 introduit en 15.0. Il part des décisions de l'étape 0 du [plan](./PLAN-P22.md), de l'[étude de D1](./ETUDE-D1-WRAPPER-ET-PIECE.md) et de l'[audit](./AUDIT-CONCEPTION-P22.md), et il sert d'entrée au plan d'implémentation, puis à la réécriture de [FORMAT.md](../../../format/FORMAT.md), de `packages/kit/src/format/types.ts` et du schéma.

Mesuré sur les captures, le contrat de Button passe de 49 608 à 49 250 octets sans espaces, soit 0,7 % de moins, et décrit en plus les trois variantes de `.sizeWrapperButton` et la pièce `.Ring`. Le contrat de Groupe passe de 13 099 à 79 127 octets, parce qu'il décrit les 90 variantes de `.Segment` au lieu des 9 que Groupe pose. Trois questions restent au mainteneur, au §7.

## 1. Les cinq changements de forme

1. Un bloc `pieces` à la racine. Une entrée par pièce, clé égale à l'identifiant de code de son nom. L'entrée a la forme d'un contrat sans `meta` ni catalogues. Les catalogues de la racine servent l'hôte et toutes ses pièces.
2. Un slot `piece` et un renvoi par occurrence. L'arbre de l'hôte s'arrête au slot qui porte `piece`. Chaque variant qui publie ce slot porte dans `variants[].pieces` un renvoi complet : la variante citée par son `nodeId`, l'identifiant de l'instance, les valeurs normatives, la vue exacte de l'occurrence et ses couleurs.
3. Une prop exposée nomme sa source. L'API de l'hôte contient ses props et celles des instances exposées. Une prop venue d'une instance exposée porte `source`, qui nomme le slot de l'instance et la clé de la prop dans la pièce. Les liaisons natives de ces props passent de l'hôte aux variantes de la pièce.
4. Les dimensions par taille vivent dans l'entrée qui porte l'axe. `structure.sizes` quitte la racine de Button et entre dans l'entrée de `.sizeWrapperButton`.
5. Les couleurs se rangent chez le composant qui les pose. Une couleur réelle d'une pièce vit dans ses variantes. Une couleur que l'hôte pose sur une occurrence vit dans le renvoi. Une couleur qu'un composant pose sur une icône dépendance vit dans sa feuille, placée au slot de la dépendance. Une couleur d'aperçu n'est publiée nulle part.

## 2. La forme, champ par champ

Les champs que la 14.0 publie et que ce document ne cite pas gardent leur forme et leur sens. « Requis » vaut pour un contrat 15.0 valide. « Absence » donne le seul sens d'un champ absent.

### 2.1 Racine du contrat

| Champ | Type | Requis | Absence | Invariant | Fondement |
|---|---|---|---|---|---|
| `pieces` | `Record<string, PieceEntry>` | non | l'hôte ne pose aucune pièce | chaque clé vaut `codeIdentifier(entree.name)`, elle diffère de celle de l'hôte et des autres pièces ; chaque entrée est atteinte par au moins un renvoi ; le graphe des pièces n'a pas de cycle | Choix 1, Choix 3, F25, F29 |
| `viewStructures`, `viewTypographies`, `viewComposes`, `viewIcons`, `viewPaintPlacements`, `viewEffects`, `variantViews`, `propertyBindingDefinitions`, `textStyles`, `effectStyles`, `samples` | inchangés | inchangé | inchangé | un seul catalogue pour l'hôte et ses pièces, partagé par égalité stricte ; une adresse se résout dans l'arbre du composant dont le variant renvoie | étude R6 §3, F28 |
| `rendering.roles` | inchangé | oui | sans objet | vaut pour l'hôte et pour chaque pièce | étude R6 §2 |
| `rendering.keyRoles` | inchangé | non | toutes les clés de l'hôte nomment leur rôle | ne couvre que les clés de l'hôte | étude R6 §2 |
| `composes` | inchangé | non | l'hôte ne pose lui-même aucune dépendance | union ordonnée des `viewComposes` des vues de l'hôte seul ; les dépendances posées dans une pièce restent dans son entrée | Q5, F27 |
| `icons` | inchangé | non | aucune icône déclarée dans l'arbre de l'hôte | `slot` vise un slot de l'arbre de l'hôte | E5 |
| `structure.sizes` | inchangé | non | l'hôte n'a pas d'axe de tailles | clés dans les `values` de la prop de taille de l'hôte | E4 |

`meta` ne change pas de forme. Il décrit l'export de l'hôte et de ses pièces, et `meta.diagnostics` porte les pertes du §2.10.

### 2.2 Entrée d'une pièce (`PieceEntry`)

L'entrée reprend les champs d'un contrat, sous les mêmes noms. Un lecteur la lit comme un contrat 14.0 sans `meta`, en lui prêtant les catalogues et `rendering.roles` de la racine et rien d'autre (§2.11). Un champ de l'hôte absent de l'entrée ne passe jamais à la pièce : une entrée sans `stateModel` décrit une pièce sans axe d'états.

| Champ | Type | Requis | Absence | Invariant | Fondement |
|---|---|---|---|---|---|
| `name` | `string` | oui | sans objet | nom Figma exact, préfixe compris (`.sizeWrapperButton`) | étude R6 §2 |
| `nodeId` | `string` | oui | sans objet | identifiant du component set de la pièce, ou du composant seul | étude R6 §2 |
| `props` | `Record<string, ContractProp>` | non | la pièce ne déclare aucune propriété | toutes les propriétés du set, exposées ou non, sans `source` | critère de fin 1, D5 |
| `figmaVariantLabels` | inchangé | non | même règle qu'à la racine | étiquettes des axes de la pièce | étude R6 §2 |
| `variants` | `ContractVariant[]` | oui | sans objet | une entrée par variante du set, posée ou non | critère de fin 1, F11 |
| `structure` | `ContractReferenceStructure` | oui | sans objet | `view` renvoie à `viewStructures` ; `sizes` selon §2.6 | E4 |
| `stateModel` | inchangé | non | la pièce n'a pas d'axe d'états | règle de la racine | étude R6 §2 |
| `rendering` | `{ keyRoles: ColorKeyRoles }` | non | toutes les clés de la pièce nomment leur rôle | ne couvre que les clés de la pièce et de ses renvois | étude R6 §2, F28 |
| `icons` | inchangé | non | aucune icône déclarée dans la pièce | `slot` vise un slot de l'arbre de la pièce ; la règle vient du bloc de l'hôte si la pièce est exposée, du bloc de la pièce sinon | E5, F21 |
| `composes` | inchangé | non | la pièce ne pose aucune dépendance | union des `viewComposes` des vues de la pièce | Q5, F27 |
| `intent` | inchangé | non | la pièce n'a pas de bloc `.componentRules` | lu dans le bloc de la pièce, sur sa page | D5, E5 |

`rendering` garde dans l'entrée le nom qu'il a à la racine. `entree.rendering?.keyRoles` et `contrat.rendering?.keyRoles` se lisent par le même accès, et les lecteurs actuels (`diagnostic-contrastes.mjs`, `caracteristiques.mjs`, `validation-contrat.mjs`) s'appliquent à l'entrée sans second chemin. L'entrée ne porte pas `componentKey` : une pièce préfixée n'est pas publiée, et la 14.0 ne publiait pas cette clé.

Une pièce sans choix (D5) reçoit son entrée sans `intent`. `.Ring` publie `props.property1` à une seule valeur, `default`, comme Figma la déclare, car la règle D5 décide des règles d'usage, pas de ce que l'entrée publie.

### 2.3 Slot qui porte une pièce

`ChildStructure` gagne un champ.

| Champ | Type | Requis | Absence | Invariant | Fondement |
|---|---|---|---|---|---|
| `piece` | `string` | non | ce slot ne pose aucune pièce | clé d'une entrée de `pieces` ; exclusif de `composes` et de `children` | Choix 1, étude R6 §5 |

Le slot d'une pièce porte seulement `slot`, `figmaLayer`, `piece` et les champs qui disent comment le parent place l'instance : `optional`, `visibilityProp`, `visibilityTargets`, `alignSelf`, `flexGrow`, `size`, `structuralSize`, `bounds`, `position`, `constraints`, `inset`, la place en grille, `rotation` et `opacity`. Il ne porte aucun champ de flux intérieur (`layout`, `justifyContent`, `alignItems`, `wrap`, `gap`, `rowGap`, `columnGap`, `padding`, `radius`, pistes de grille) : la racine de la vue de l'occurrence les porte. `visibilityProp` nomme une prop de l'hôte.

Le nom du slot suit la règle d'un slot de dépendance, qui prend le nom du calque normalisé, ici sans préfixe (F29). `.sizeWrapperButton` donne `sizewrapperbutton`, `.Ring` donne `ring`, et trois `.Segment` sous un même parent donnent `segment`, `segment-2` et `segment-3`. Le slot de `.sizeWrapperButton` s'appelait `label` en 14.0, parce que la pièce contient un texte.

La table suivante dit qui porte un champ de la boîte à une occurrence (F9). La racine de la pièce et le slot de l'hôte peuvent écrire la même famille de champs. À une occurrence, le slot fait autorité, et la racine de la pièce ne s'applique pas pour ces champs.

| Famille | Racine de la pièce | Slot de l'hôte | À l'occurrence |
|---|---|---|---|
| largeur et hauteur | `sizing`, toujours publié | `size`, `flexGrow`, `alignSelf`, `structuralSize` ; une absence vaut `Hug` | le slot |
| bornes | `bounds` | `bounds` | le slot |
| rotation, opacité | `rotation`, `opacity` | `rotation`, `opacity` | le slot |
| place hors du flux, place en grille | sans objet | `position`, `constraints`, `inset`, `columnStart`… | le slot |
| flux intérieur | `layout`, `gap`, `padding`, `radius`… | jamais | la racine de la vue du renvoi |

La règle diffère de celle d'une dépendance, dont l'instance ne publie `opacity` que si elle diffère de son principal. Une dépendance a son propre contrat, qui publie déjà son opacité ; une pièce n'en a pas, et Figma donne à chaque instance la valeur effective, héritée ou surchargée. Le slot publie donc toujours cette valeur effective, à la règle commune, et rien ne s'applique deux fois.

### 2.4 Renvoi d'une occurrence (`PieceReference`)

`ContractVariant` gagne `pieces?: PieceReference[]`. Le champ vaut pour un variant de l'hôte comme pour une variante d'une pièce qui pose elle-même une pièce. Absent, il dit que l'arbre publié de ce variant ne contient aucun slot `piece`.

| Champ | Type | Requis | Absence | Invariant | Fondement |
|---|---|---|---|---|---|
| `slotPath` | `string[]` | oui | sans objet | chemin du slot `piece` dans l'arbre de la vue du composant qui pose ; unique dans la liste | étude R6 §5 |
| `nodeId` | `string` | oui | sans objet | identifiant Figma de l'instance posée | §5.2, R2 |
| `variant` | `string` | oui | sans objet | `nodeId` d'une variante de l'entrée que nomme le slot | D4, Q4 |
| `values` | `Record<string, string \| boolean>` | non | la pièce n'a aucune propriété `BOOLEAN` ni `INSTANCE_SWAP` hors de son API exposée | une clé par propriété `BOOLEAN` ou `INSTANCE_SWAP` non exposée de la pièce, aux clés publiques de la pièce ; un `INSTANCE_SWAP` vaut le nom du composant placé | F10, D4 |
| `view` | `string` | oui | sans objet | clé de `variantViews` : la vue exacte de l'occurrence, adresses relatives à la racine de la pièce | D4 |
| `tokens` | `SlotTokens` | non | l'occurrence ne peint aucune couleur | feuille effective complète à cet endroit ; ses clés égalent celles que `paintPlacements` de la vue place en `fills` | D4, F6 |
| `strokes` | `SlotStrokes` | non | l'occurrence ne peint aucun contour | même règle, côté `strokes` | D4, F6 |
| `pieces` | `PieceReference[]` | non | la vue de l'occurrence ne contient aucun slot `piece` | un renvoi par slot `piece` de `view`, chemins relatifs à la pièce, complet comme le renvoi parent | F7 |

Un renvoi est complet (D4). Il ne reprend jamais une partie de la variante citée. Sa vue, ses feuilles et ses renvois imbriqués décrivent l'occurrence entière. Un renvoi sans `tokens` peint une occurrence sans couleur, jamais la couleur de la variante. Un lecteur qui déplie une occurrence lit `renvoi.pieces`, jamais les `pieces` de la variante citée.

Un renvoi par slot `piece` publié (F11). Chaque variant porte un renvoi pour chaque slot `piece` de l'arbre de sa vue, masqué par une prop de l'hôte compris. Un calque masqué sans prop sort de l'arbre, et son renvoi avec lui.

`nodeId` est la seule addition aux décisions. Une liaison native d'une prop exposée passe de l'hôte à la variante de la pièce (§2.5), qui cite le calque du maître (`3:429`). L'identifiant exact du calque dans l'instance s'écrit `I<nodeId du renvoi>;<nodeId de la liaison>`, `I3:152;3:429` sur Button. Sans `nodeId`, le contrat perdrait les 270 identifiants exacts que la 14.0 publie sur Button. Le champ coûte 2 083 octets sur Button, contre 12 009 octets pour les liaisons qu'il remplace. Dans un renvoi imbriqué, l'identifiant de l'instance intérieure se rattache de la même façon, en chaîne.

`values` ne porte pas les axes. La variante citée donne les valeurs d'axes. Une prop `disabled` qu'un axe d'états fabrique n'est pas une propriété `BOOLEAN` et n'entre pas dans `values`. Une propriété `TEXT` va dans l'échantillon (§2.9). Une propriété exposée prend la valeur de la prop de l'hôte, et n'entre jamais dans `values`.

Les clés de couleur d'un renvoi appartiennent à l'entrée de la pièce. `colorKeys.ts` les décide sur les variantes de la pièce et sur tous ses renvois, et `pieces.<P>.rendering.keyRoles` donne leur rôle. Une couleur de l'hôte ne fait plus allonger une clé de la pièce.

### 2.5 Props exposées et leur source

`PropMeta`, la partie commune à toutes les props, gagne un champ.

| Champ | Type | Requis | Absence | Invariant | Fondement |
|---|---|---|---|---|---|
| `source` | `{ slotPath: string[]; prop: string }` | non | l'hôte déclare lui-même cette prop | `slotPath` désigne un slot `piece` de l'arbre de l'hôte, au même chemin dans chaque variant qui le publie ; `prop` est une clé des `props` de l'entrée ; le type et les `values` égalent ceux de la prop de la pièce | E2, D1 |

La prop de l'hôte reste complète : `type`, `values`, `default` et la documentation lue dans le bloc de l'hôte (E5). La prop de l'entrée garde la forme que la pièce déclare, sans documentation. Une référence interne de la copie, comme `visibilityProp`, emploie les clés de l'hôte.

Une prop d'icône synthétique (`iconLeftName`) suit sa règle `@icons`. Pour une pièce exposée, la règle vient du bloc de l'hôte. L'entrée de la pièce reçoit la définition d'icône et la prop synthétique, et l'hôte reçoit la même prop avec `source`. Button garde donc `iconLeftName` et `iconRightName`.

Une prop `VARIANT` exposée choisit la variante de la pièce (E3, §2.11). Une prop `BOOLEAN`, `TEXT` ou `INSTANCE_SWAP` exposée décide de ce que la pièce rend à la place de `renvoi.values`. Les liaisons natives de ces props vivent dans `variants[].bindings` de l'entrée, avec un `figmaPath` relatif à la pièce. Une prop de l'hôte reliée à un calque intérieur d'une pièce garde sa liaison dans les `bindings` de l'hôte, avec son `figmaPath` complet (F8).

Une clé exposée déjà prise par l'hôte reste refusée par le diagnostic de collision. Figma montre alors deux propriétés distinctes, et le contrat ne peut pas publier les deux sous une clé. Une instance exposée dans une partie des variants seulement publie ses props, et une perte nomme les variants sans exposition (L6).

### 2.6 Dimensions par taille

`structure.sizes` vit dans l'entrée du set qui porte l'axe de tailles (E4). Pour Button, la racine n'a plus de `sizes`, et l'entrée de `.sizeWrapperButton` en porte un. Un hôte qui a son propre axe de tailles garde `sizes` à sa racine, et il ne décrit que ses propres calques (L3). La règle de FORMAT.md, §Sortie, vaut par entrée : quand une entrée porte `sizes`, la racine de sa projection de référence ne porte ni `gap`, ni `padding`, ni `radius`.

Une absence de `sizes` à côté d'une prop `size` de l'hôte veut dire que les tailles sont décrites dans une pièce, que la `source` de la prop nomme. C'est la classe 4 du changement.

La question 1 du §7 propose de retirer `structure.sizes` du contrat.

### 2.7 Couleurs d'une pièce

Aucun champ nouveau. D2 décide quelles valeurs entrent dans les champs existants.

| Emplacement du maître de la pièce | Verdict | Où le contrat l'écrit |
|---|---|---|
| lié à un token du composant hôte | réelle | `pieces.<P>.variants[].tokens` ou `.strokes`, placée par la vue de la variante |
| non lié à un token du composant, remplacé par chaque instance posée qui le montre, au moins une instance le montrant | aperçu | nulle part, sans message |
| tout autre cas | anomalie | publiée comme une couleur réelle ; le constat relève d'Architect (question 3) |

Le jugement porte sur l'emplacement (chemin du calque dans la pièce, champ, indice de la peinture), sur toutes les variantes du set (F14, F15). « Token du composant » a une seule définition dans le kit (F13). Dans un fichier libre sans dossier désigné, seul le remplacement compte : un emplacement remplacé partout est d'aperçu, les autres se publient comme en 14.0 (F17).

Une couleur que l'hôte pose sur une occurrence entre dans la feuille du renvoi, avec les couleurs réelles que l'occurrence garde. Le renvoi de Ring dans un variant `Focus` de Button porte la couleur de l'anneau que Button pose, et l'entrée `.Ring` ne publie aucun contour : la couleur de son maître est d'aperçu. La largeur et l'alignement du contour arrivent avec la couleur, dans `renvoi.strokes`, puisque `StrokeTokens` les groupe.

### 2.8 Icônes et dépendances posées dans une pièce

Une dépendance posée dans une pièce se range dans `pieces.<P>.composes` et dans les `viewComposes` des vues de la pièce. `Icon` est une dépendance de `.sizeWrapperButton` et de `.Segment`, jamais de l'hôte. La parité et le graphe déplient les occurrences pour compter (F27).

La couleur d'une icône dépendance suit D3, F19 et F20. Le composant qui pose l'instance publie la couleur qu'il donne au dessin de la dépendance, quand sa liaison diffère de celle du même emplacement dans le maître du composant placé, glyphe échangé compris. La couleur entre dans sa feuille (variante de la pièce, ou renvoi si l'hôte la pose à l'occurrence), et `paintPlacements` la place au chemin du slot qui porte `composes`. Son rôle se lit sur le dernier segment du token quand il nomme un rôle ; sinon il vaut `foreground` pour un texte de la dépendance, `icon` pour un tracé, `background` ailleurs. Dans `.Segment`, le glyphe d'`Icon` reçoit le token du texte voisin dans les 90 variantes : la clé `foreground` gagne le chemin `["cadre", "icon"]`, sans clé nouvelle. Une autre surcharge de peinture dans une dépendance reste hors du contrat, avec une perte écrite.

Une règle `@icons` sur une dépendance suit F21. Une règle `@icons` peut nommer le calque d'une instance de dépendance. Le slot porte alors `composes`, et la définition d'icône garde `runtimeProp`, `visibilityProp`, `slot` et `variants`. `figmaName` y nomme le glyphe que la dépendance affiche par défaut, lu sur son `INSTANCE_SWAP` quand elle en a un, sinon par la comparaison positionnelle de `swaps`. `size` reste absent, puisque la taille d'une dépendance appartient à son contrat. `ucm icons` liste ainsi les glyphes que le repository doit savoir dessiner.

La question 2 du §7 porte sur ce que le contrat d'`Icon` dit de cette couleur.

### 2.9 Contenu d'un `SLOT`

Le contenu par défaut d'un `SLOT` de l'hôte reste décrit comme en 14.0 (D6). Une pièce dans ce contenu reçoit son renvoi, au chemin qui traverse le slot, `["milieu", "segment"]` dans Groupe. Le renvoi se lit sur l'instance, sans comparaison au maître de l'hôte (F12).

Un `SLOT` d'une pièce que l'hôte remplit n'a pas encore de forme. Le contenu manque, et une perte nomme le slot et l'occurrence (Q6). Le renvoi reste valide pour le reste de la pièce.

### 2.10 Échantillon

`ContractSample` gagne `pieces?: PieceSample[]`.

| Champ | Type | Requis | Absence | Invariant |
|---|---|---|---|---|
| `slotPath` | `string[]` | oui | sans objet | égal au `slotPath` d'un renvoi du même variant |
| `args` | `Record<string, string>` | non | l'occurrence garde les textes de propriété `TEXT` de la variante citée | valeurs des propriétés `TEXT` non exposées de la pièce |
| `text` | `SampleText[]` | non | l'occurrence garde les textes de la variante citée | textes saisis sans propriété que l'occurrence change, aux chemins de la pièce |
| `composes` | `SampleInstance[]` | non | les dépendances de l'occurrence gardent l'usage de la variante citée | usage des dépendances que l'occurrence change |
| `pieces` | `PieceSample[]` | non | aucune occurrence imbriquée ne change | même règle, un niveau plus bas |

L'échantillon d'une occurrence suit la règle d'une dépendance (FORMAT.md, §9, « Le contenu d'une dépendance se lit en deux temps »). Le lecteur prend l'échantillon de la variante citée, puis les écarts de l'occurrence. `samples` n'est pas normatif, et cette lecture en deux temps y est déjà admise. Une entrée `PieceSample` sans écart ne s'écrit pas. Sur Button, l'échantillon de l'hôte se réduit à ses `args`, et le texte vit une fois, dans l'échantillon de la variante de la pièce.

### 2.11 Pertes dans `meta.diagnostics`

Les pertes que P22 introduit prennent le code `UCM_PORTABLE_PROJECTION_WARNING`, rendent `meta.coverage.portable` partiel, et portent `contractPath`, le champ qu'elles visent (`variants[12].pieces[0]`, `pieces.Segment.variants[4]`). Elles restent dans `meta.diagnostics` même quand l'interface de l'Exporter cesse de les montrer (P33).

| Cas | `contractPath` | Fondement |
|---|---|---|
| une adresse de couleur ou un renvoi imbriqué d'un renvoi n'existe pas dans une variante que les props exposées atteignent | le renvoi | E3 |
| la vue d'un renvoi d'une pièce exposée diffère de celle de la variante citée, `paintPlacements` exclu | le renvoi | E3, contradiction 8 |
| une instance sans préfixe ni règles, dont le composant laisse un choix, est décrite à plat | le slot | E6 |
| une instance est exposée dans une partie des variants seulement | la prop | L6 |
| la `source` d'une prop exposée n'a pas le même chemin dans tous les variants | la prop | E2 |
| l'hôte remplit un `SLOT` d'une pièce | le renvoi | D6 |
| un `INSTANCE_SWAP` non exposé d'une occurrence ne se nomme pas | le renvoi | F10 |
| une surcharge de peinture dans une dépendance n'est pas celle d'une icône | le slot de la dépendance | D3 |

Deux cas ne sont pas des pertes et n'entrent pas dans cette table. Deux pièces de même identifiant de code bloquent l'export (F29). Un cycle ou un chemin déplié de plus de 12 niveaux fait refuser le contrat par le lecteur (F25).

### 2.12 Résolution d'une occurrence

`packages/kit/src/lecteurs/variant-views.mjs` porte la seule résolution, appelée par le moteur, la validation, les contrastes, la parité et les lois des tests (F28).

1. `contratDeLaPiece(contrat, cle)` rend `{ ...catalogues de la racine, rendering: { roles, keyRoles: entree.rendering?.keyRoles }, ...champs de l'entrée }`. Les catalogues prêtés sont ceux du §2.1, et rien d'autre. `vueExacteDuVariant`, `nomFigmaDuVariant`, `projectionDeReference` et `nodeIdDeLiaison` s'appliquent à ce contrat sans changement.
2. Pour un slot `piece` d'un variant, le renvoi est celui dont `slotPath` égale le chemin du slot. La variante V est celle de l'entrée dont `nodeId` égale `renvoi.variant`.
3. Sans prop exposée, ou quand les props exposées gardent les valeurs de V, l'occurrence rend `renvoi.view`, `renvoi.tokens`, `renvoi.strokes` et `renvoi.pieces`.
4. Quand une prop `VARIANT` exposée prend une autre valeur, la variante V′ est celle dont les valeurs d'axes égalent celles de V, la valeur exposée remplacée. L'occurrence rend `structure`, `typography`, `composes`, `icons` et `effects` de la vue de V′, `paintPlacements` de `renvoi.view`, et les feuilles et renvois imbriqués du renvoi. Le moteur a vérifié chaque adresse dans V′, et une adresse absente a sa perte (§2.11).
5. Un booléen de la pièce vaut la prop de l'hôte s'il est exposé, `renvoi.values` sinon. Un slot dont `visibilityProp` vaut faux ne se rend pas. Un calque masqué sans propriété est déjà sorti de la vue de l'occurrence.
6. La boîte de l'occurrence suit la table du §2.3.
7. Le fond d'une couleur posée au chemin `[]` d'une pièce se cherche dans l'hôte, au plus long préfixe du chemin du slot, à la règle de FORMAT.md §2 appliquée au chemin déplié.
8. Le dépliage garde la pile des entrées ouvertes, refuse un cycle avant de descendre, et compte la profondeur sur le chemin déplié (F25).

### 2.13 Ce que la validation refuse

`validation-contrat.mjs` refuse un contrat 15.0 qui viole l'un de ces points, en plus des contrôles de la 14.0 appliqués à chaque entrée.

1. Un slot `piece` qui nomme une clé absente de `pieces`, ou qui porte aussi `composes`, `children` ou un champ de flux intérieur.
2. Une entrée qu'aucun renvoi n'atteint.
3. Un variant dont les renvois ne couvrent pas exactement les slots `piece` de son arbre publié, ou dont deux renvois ont le même `slotPath`.
4. Un `renvoi.variant` absent des variantes de l'entrée ; une `renvoi.view` absente de `variantViews`.
5. Des clés de `renvoi.tokens` ou `renvoi.strokes` qui ne correspondent pas aux clés placées par la vue du renvoi.
6. Une clé de `renvoi.values` qui n'est pas une prop `boolean` ou `instance-swap` non exposée de la pièce, ou une telle prop sans clé.
7. Une `source` dont le chemin ne désigne pas un slot `piece`, dont `prop` manque à l'entrée, ou dont le type diffère.
8. Une clé de `pieces` différente de `codeIdentifier(name)`, égale à celle de l'hôte ou d'une autre entrée.
9. Un cycle dans le graphe des pièces, ou un chemin déplié de plus de 12 niveaux.
10. Une entrée orpheline d'un catalogue, comptée sur tout le contrat, hôte et pièces ensemble.

## 3. Exemples

Les deux exemples sont réduits, et chaque renvoi y résout. Les valeurs viennent des contrats 14.0 rejoués dans `_local/p22/scripts/`. Les noms de Groupe et de ses tokens sont inventés, à la forme de la capture.

### 3.1 Button

Réductions : deux couleurs et deux états, deux variants de Button sur 90, l'icône de gauche seule, `meta`, `rendering.roles` et `textStyles` abrégés. Les icônes y sont des instances d'`Icon`, l'état que l'essai 1.2 du plan produira : la capture de Button a des tracés à leur place. Les noms de calques `arrow-left-long` et `Suivant` sont ceux de la capture.

```json
{
  "name": "Button",
  "meta": { "contractVersion": "15.0", "exportedAt": "…", "coverage": { "portable": "complete" },
            "figma": { "fileName": "…", "nodeId": "3:122" } },
  "props": {
    "color": { "type": "enum", "values": ["primary", "secondary"] },
    "variant": { "type": "enum", "values": ["contained", "outlined", "text"] },
    "disabled": { "type": "boolean", "default": false },
    "size": { "type": "enum", "values": ["medium", "large", "small"],
              "descriptions": { "medium": "Taille par défaut, tous écrans." },
              "source": { "slotPath": ["sizewrapperbutton"], "prop": "size" } },
    "label": { "type": "boolean", "default": true,
               "source": { "slotPath": ["sizewrapperbutton"], "prop": "label" } },
    "iconLeft": { "type": "boolean", "default": true,
                  "source": { "slotPath": ["sizewrapperbutton"], "prop": "iconLeft" } },
    "iconLeftName": { "type": "icon", "policy": "modifiable", "visibilityProp": "iconLeft",
                      "source": { "slotPath": ["sizewrapperbutton"], "prop": "iconLeftName" } }
  },
  "figmaVariantLabels": {
    "axes": { "color": "Color", "variant": "Variant", "state": "State" },
    "values": { "color": { "primary": "Primary", "secondary": "Secondary" },
                "variant": { "contained": "Contained", "outlined": "Outlined", "text": "Text" },
                "state": { "default": "Default", "focus": "Focus" } }
  },
  "viewStructures": {
    "st1": { "layout": "flex-row", "sizing": { "width": "fit-content", "height": "fit-content" },
             "justifyContent": "flex-start", "alignItems": "flex-start",
             "children": [{ "slot": "sizewrapperbutton", "figmaLayer": ".sizeWrapperButton", "piece": "SizeWrapperButton" }] },
    "st2": { "layout": "flex-row", "sizing": { "width": "fit-content", "height": "fit-content" },
             "justifyContent": "flex-start", "alignItems": "flex-start", "radius": "{layouts.radius.md}",
             "children": [
               { "slot": "ring", "figmaLayer": ".Ring", "optional": true, "position": "absolute",
                 "constraints": { "horizontal": "stretch", "vertical": "stretch" },
                 "inset": { "top": "-4px", "bottom": "-4px", "left": "-4.5px", "right": "-4.5px" }, "piece": "Ring" },
               { "slot": "sizewrapperbutton", "figmaLayer": ".sizeWrapperButton", "piece": "SizeWrapperButton" }] },
    "st3": { "layout": "flex-row", "sizing": { "width": "fit-content", "height": "fit-content" },
             "justifyContent": "center", "alignItems": "center", "gap": "{components.button.size.medium.gap}",
             "padding": { "x": "{components.button.size.medium.padding-x}", "y": "{components.button.size.medium.padding-y}" },
             "radius": "{components.button.size.medium.radius}",
             "children": [
               { "slot": "icon", "figmaLayer": "arrow-left-long", "optional": true, "visibilityProp": "iconLeft", "composes": "Icon" },
               { "slot": "label", "figmaLayer": "Suivant", "optional": true, "visibilityProp": "label" }] },
    "st4": { "layout": "flex-row", "sizing": { "width": "fit-content", "height": "fit-content" },
             "justifyContent": "center", "alignItems": "center", "gap": "{components.button.size.large.gap}",
             "padding": { "x": "{components.button.size.large.padding-x}", "y": "{components.button.size.large.padding-y}" },
             "radius": "{components.button.size.large.radius}",
             "children": [
               { "slot": "icon", "figmaLayer": "arrow-left-long", "optional": true, "visibilityProp": "iconLeft", "composes": "Icon" },
               { "slot": "label", "figmaLayer": "Suivant", "optional": true, "visibilityProp": "label" }] },
    "st5": { "layout": "flex-row", "sizing": { "width": "fit-content", "height": "fit-content" },
             "justifyContent": "center", "alignItems": "center", "gap": "{components.button.size.small.gap}",
             "padding": { "x": "{components.button.size.small.padding-x}", "y": "{components.button.size.small.padding-y}" },
             "radius": "{components.button.size.small.radius}",
             "children": [
               { "slot": "icon", "figmaLayer": "arrow-left-long", "optional": true, "visibilityProp": "iconLeft", "composes": "Icon" },
               { "slot": "label", "figmaLayer": "Suivant", "optional": true, "visibilityProp": "label" }] },
    "st6": { "layout": "flex-row", "sizing": { "width": "fit-content", "height": "fit-content" },
             "justifyContent": "center", "alignItems": "center",
             "children": [
               { "slot": "icon", "figmaLayer": "arrow-left-long", "optional": true, "visibilityProp": "iconLeft", "composes": "Icon" },
               { "slot": "label", "figmaLayer": "Suivant", "optional": true, "visibilityProp": "label" }] },
    "st7": { "layout": "flex-row", "sizing": { "width": "stretch", "height": "stretch" }, "radius": "{layout.radius.lg}" }
  },
  "viewTypographies": { "ty1": [{ "slotPath": ["label"], "style": "label.large", "alignContent": "center" }] },
  "viewComposes": { "cp1": [{ "component": "Icon", "figmaLayer": "arrow-left-long", "visibilityProp": "iconLeft" }] },
  "viewIcons": { "ic1": { "arrowLeftLong": { "figmaName": "arrow-left-long", "slotPath": ["icon"] } } },
  "viewPaintPlacements": {
    "pp1": { "fills": { "background": [[]], "foreground": [["icon"], ["label"]] } },
    "pp2": { "strokes": { "ring": [[]] } }
  },
  "variantViews": {
    "v1": { "structure": "st1" },
    "v2": { "structure": "st2" },
    "v3": { "structure": "st3", "typography": "ty1", "composes": "cp1", "icons": "ic1" },
    "v4": { "structure": "st4", "typography": "ty1", "composes": "cp1", "icons": "ic1" },
    "v5": { "structure": "st5", "typography": "ty1", "composes": "cp1", "icons": "ic1" },
    "v6": { "structure": "st3", "typography": "ty1", "composes": "cp1", "icons": "ic1", "paintPlacements": "pp1" },
    "v7": { "structure": "st7" },
    "v8": { "structure": "st7", "paintPlacements": "pp2" }
  },
  "propertyBindingDefinitions": {
    "b1": { "prop": "iconLeft", "figmaPropName": "Icon-Left#1261:147", "target": "visible", "figmaPath": ["arrow-left-long"] },
    "b2": { "prop": "label", "figmaPropName": "Label#234:0", "target": "visible", "figmaPath": ["Suivant"] }
  },
  "variants": [
    { "nodeId": "3:151", "values": { "color": "primary", "variant": "contained", "state": "default" }, "view": "v1",
      "pieces": [
        { "slotPath": ["sizewrapperbutton"], "nodeId": "3:152", "variant": "3:428", "view": "v6",
          "tokens": { "background": "{components.button.color.primary.contained.default.background}",
                      "foreground": "{components.button.color.primary.contained.default.foreground}" } }],
      "sample": "s1" },
    { "nodeId": "34:454", "values": { "color": "primary", "variant": "contained", "state": "focus" }, "view": "v2",
      "pieces": [
        { "slotPath": ["ring"], "nodeId": "1140:1447", "variant": "1140:1426", "view": "v8",
          "strokes": { "ring": { "color": "{components.button.color.primary.contained.focus.ring}",
                                 "width": "{layout.stroke.ring-weight}", "align": "inside" } } },
        { "slotPath": ["sizewrapperbutton"], "nodeId": "34:455", "variant": "3:428", "view": "v6",
          "tokens": { "background": "{components.button.color.primary.contained.focus.background}",
                      "foreground": "{components.button.color.primary.contained.focus.foreground}" } }],
      "sample": "s1" }
  ],
  "structure": { "view": "st1", "variantAxes": ["color", "variant", "state"] },
  "stateModel": { "axis": "state", "states": { "default": {}, "focus": { "selector": ":focus-visible" } },
                  "precedence": ["focus", "default"] },
  "rendering": { "roles": { "…": "…" } },
  "textStyles": { "label.large": { "figmaName": "Label/Large", "tokens": { "fontSize": "{typography.label.large.fontsize}" } } },
  "samples": {
    "s1": { "args": { "iconLeft": true, "label": true } },
    "s2": { "args": { "iconLeft": true, "label": true },
            "text": [{ "slotPath": ["label"], "figmaLayer": "Suivant", "value": "Label" }] }
  },
  "pieces": {
    "SizeWrapperButton": {
      "name": ".sizeWrapperButton", "nodeId": "3:423",
      "props": {
        "size": { "type": "enum", "values": ["medium", "large", "small"] },
        "label": { "type": "boolean", "default": true },
        "iconLeft": { "type": "boolean", "default": true },
        "iconLeftName": { "type": "icon", "policy": "modifiable", "visibilityProp": "iconLeft" }
      },
      "figmaVariantLabels": { "axes": { "size": "Size" },
                              "values": { "size": { "medium": "Medium", "large": "Large", "small": "Small" } } },
      "variants": [
        { "nodeId": "3:428", "values": { "size": "medium" }, "view": "v3",
          "bindings": [{ "definition": "b1", "nodeId": "3:429" }, { "definition": "b2", "nodeId": "3:430" }], "sample": "s2" },
        { "nodeId": "3:424", "values": { "size": "large" }, "view": "v4",
          "bindings": [{ "definition": "b1", "nodeId": "3:425" }, { "definition": "b2", "nodeId": "3:426" }], "sample": "s2" },
        { "nodeId": "3:432", "values": { "size": "small" }, "view": "v5",
          "bindings": [{ "definition": "b1", "nodeId": "3:433" }, { "definition": "b2", "nodeId": "3:434" }], "sample": "s2" }
      ],
      "structure": { "view": "st6", "variantAxes": ["size"],
        "sizes": {
          "medium": { "gap": "{components.button.size.medium.gap}", "radius": "{components.button.size.medium.radius}",
                      "padding": { "x": "{components.button.size.medium.padding-x}", "y": "{components.button.size.medium.padding-y}" } },
          "large": { "gap": "{components.button.size.large.gap}", "radius": "{components.button.size.large.radius}",
                     "padding": { "x": "{components.button.size.large.padding-x}", "y": "{components.button.size.large.padding-y}" } },
          "small": { "gap": "{components.button.size.small.gap}", "radius": "{components.button.size.small.radius}",
                     "padding": { "x": "{components.button.size.small.padding-x}", "y": "{components.button.size.small.padding-y}" } } } },
      "icons": { "arrowLeftLong": { "policy": "modifiable", "figmaName": "arrow-left-long", "slot": "icon",
                                    "visibilityProp": "iconLeft", "runtimeProp": "iconLeftName" } },
      "composes": [{ "component": "Icon", "figmaLayer": "arrow-left-long", "visibilityProp": "iconLeft" }]
    },
    "Ring": {
      "name": ".Ring", "nodeId": "1140:1427",
      "props": { "property1": { "type": "enum", "values": ["default"] } },
      "figmaVariantLabels": { "axes": { "property1": "Property 1" }, "values": { "property1": { "default": "Default" } } },
      "variants": [{ "nodeId": "1140:1426", "values": { "property1": "default" }, "view": "v7" }],
      "structure": { "view": "st7", "variantAxes": ["property1"] }
    }
  }
}
```

Ce que l'exemple montre :

- Button ne publie plus ni `tokens`, ni `bindings`, ni `icons`, ni `structure.sizes`. Tout ce que la 14.0 lisait dans le wrapper aplati vit dans l'entrée ou dans le renvoi.
- Les variantes de `.sizeWrapperButton` n'ont aucune couleur. Leurs fonds et textes gris du maître sont d'aperçu, et chaque renvoi porte ceux de Button.
- Le développeur qui rend Button `size=large` prend la vue `v4` de la variante `3:424` (étape 4 du §2.12), et applique les couleurs du renvoi par `pp1`.
- La clé `foreground` du renvoi peint le texte `["label"]` et l'icône dépendance `["icon"]` (D3).

### 3.2 Groupe

Réductions : un variant de Groupe sur 3, trois variantes de `.Segment` sur 90, `meta` et `rendering.roles` abrégés. Les calques `Cadre`, `BordGauche`, `BordDroit`, `Milieu` et `Texte`, la prop `avecMilieu` et les tokens `components.groupe.*` sont inventés. Les valeurs des booléens de chaque occurrence sont celles de la capture.

```json
{
  "name": "Groupe",
  "meta": { "contractVersion": "15.0", "…": "…" },
  "props": {
    "theme": { "type": "enum", "values": ["neutral", "primary", "secondary"] },
    "avecMilieu": { "type": "boolean", "default": false },
    "milieu": { "type": "slot" }
  },
  "figmaVariantLabels": { "axes": { "theme": "Theme" },
                          "values": { "theme": { "neutral": "Neutral", "primary": "Primary", "secondary": "Secondary" } } },
  "viewStructures": {
    "st1": { "layout": "flex-row", "sizing": { "width": "fit-content", "height": "fit-content" },
             "justifyContent": "flex-start", "alignItems": "center",
             "children": [
               { "slot": "segment", "figmaLayer": ".Segment", "piece": "Segment" },
               { "slot": "milieu", "figmaLayer": "Milieu", "alignSelf": "stretch", "optional": true, "visibilityProp": "avecMilieu",
                 "layout": "flex-row", "justifyContent": "flex-start", "alignItems": "flex-start",
                 "children": [{ "slot": "segment", "figmaLayer": ".Segment", "piece": "Segment" }] },
               { "slot": "segment-2", "figmaLayer": ".Segment", "piece": "Segment" }] },
    "st2": { "layout": "flex-row", "sizing": { "width": "fit-content", "height": "fit-content" },
             "justifyContent": "flex-start", "alignItems": "flex-start",
             "children": [
               { "slot": "cadre", "figmaLayer": "Cadre", "layout": "flex-row", "justifyContent": "center", "alignItems": "center",
                 "radius": { "topLeft": "{components.groupe.radius}", "bottomLeft": "{components.groupe.radius}" },
                 "gap": "{components.groupe.gap}", "padding": { "x": "{components.groupe.padding-x}" },
                 "children": [
                   { "slot": "icon", "figmaLayer": "Icon", "optional": true, "visibilityProp": "iconLeft", "composes": "Icon" },
                   { "slot": "label", "figmaLayer": "Texte" }] }] },
    "st3": { "layout": "flex-row", "sizing": { "width": "fit-content", "height": "fit-content" },
             "justifyContent": "flex-start", "alignItems": "flex-start",
             "children": [
               { "slot": "bordgauche", "figmaLayer": "BordGauche", "alignSelf": "stretch", "optional": true, "visibilityProp": "bordGauche" },
               { "slot": "cadre", "figmaLayer": "Cadre", "layout": "flex-row", "justifyContent": "center", "alignItems": "center",
                 "gap": "{components.groupe.gap}", "padding": { "x": "{components.groupe.padding-x}" },
                 "children": [
                   { "slot": "icon", "figmaLayer": "Icon", "optional": true, "visibilityProp": "iconLeft", "composes": "Icon" },
                   { "slot": "label", "figmaLayer": "Texte" }] },
               { "slot": "borddroit", "figmaLayer": "BordDroit", "alignSelf": "stretch", "optional": true, "visibilityProp": "bordDroit" }] },
    "st4": { "layout": "flex-row", "sizing": { "width": "fit-content", "height": "fit-content" },
             "justifyContent": "flex-start", "alignItems": "flex-start",
             "children": [
               { "slot": "bordgauche", "figmaLayer": "BordGauche", "alignSelf": "stretch", "optional": true, "visibilityProp": "bordGauche",
                 "radius": { "topRight": "{components.groupe.radius}", "bottomRight": "{components.groupe.radius}" } },
               { "slot": "cadre", "figmaLayer": "Cadre", "layout": "flex-row", "justifyContent": "center", "alignItems": "center",
                 "radius": { "topRight": "{components.groupe.radius}", "bottomRight": "{components.groupe.radius}" },
                 "gap": "{components.groupe.gap}", "padding": { "x": "{components.groupe.padding-x}" },
                 "children": [
                   { "slot": "icon", "figmaLayer": "Icon", "optional": true, "visibilityProp": "iconLeft", "composes": "Icon" },
                   { "slot": "label", "figmaLayer": "Texte" }] }] }
  },
  "viewComposes": { "cp1": [{ "component": "Icon", "figmaLayer": "Icon", "visibilityProp": "iconLeft" }] },
  "viewPaintPlacements": {
    "pp1": { "fills": { "background": [["cadre"]], "foreground": [["cadre", "icon"], ["cadre", "label"]] },
             "strokes": { "border": [["cadre"]] } },
    "pp2": { "fills": { "border": [["bordgauche"], ["borddroit"]], "foreground": [["cadre", "icon"], ["cadre", "label"]] },
             "strokes": { "border": [["cadre"]] } },
    "pp3": { "fills": { "border": [["bordgauche"]], "foreground": [["cadre", "icon"], ["cadre", "label"]] },
             "strokes": { "border": [["cadre"]] } }
  },
  "variantViews": {
    "v1": { "structure": "st1" },
    "v2": { "structure": "st2", "composes": "cp1", "paintPlacements": "pp1" },
    "v3": { "structure": "st3", "composes": "cp1", "paintPlacements": "pp2" },
    "v4": { "structure": "st4", "composes": "cp1", "paintPlacements": "pp3" }
  },
  "propertyBindingDefinitions": {
    "b1": { "prop": "iconLeft", "figmaPropName": "Icon Left#25922:0", "target": "visible", "figmaPath": ["Cadre", "Icon"] },
    "b2": { "prop": "bordDroit", "figmaPropName": "BordDroit#25882:182", "target": "visible", "figmaPath": ["BordDroit"] },
    "b3": { "prop": "bordGauche", "figmaPropName": "BordGauche#25882:91", "target": "visible", "figmaPath": ["BordGauche"] },
    "b4": { "prop": "avecMilieu", "figmaPropName": "AvecMilieu#25882:273", "target": "visible", "figmaPath": ["Milieu"] }
  },
  "variants": [
    { "nodeId": "10:1", "values": { "theme": "neutral" }, "view": "v1",
      "bindings": [{ "definition": "b4", "nodeId": "10:3" }],
      "pieces": [
        { "slotPath": ["segment"], "nodeId": "10:2", "variant": "20:1",
          "values": { "bordGauche": true, "bordDroit": true, "iconLeft": false }, "view": "v2",
          "tokens": { "background": "{components.groupe.selected.neutral.default.background}",
                      "foreground": "{components.groupe.selected.neutral.default.foreground}" },
          "strokes": { "border": { "color": "{components.groupe.selected.neutral.default.border}", "align": "inside" } } },
        { "slotPath": ["milieu", "segment"], "nodeId": "10:4", "variant": "20:5",
          "values": { "bordGauche": false, "bordDroit": true, "iconLeft": false }, "view": "v3",
          "tokens": { "border": "{components.groupe.unselected.default.border}",
                      "foreground": "{components.groupe.unselected.default.foreground}" },
          "strokes": { "border": { "color": "{components.groupe.unselected.default.border}", "align": "inside" } } },
        { "slotPath": ["segment-2"], "nodeId": "10:5", "variant": "20:9",
          "values": { "bordGauche": false, "bordDroit": true, "iconLeft": false }, "view": "v4",
          "tokens": { "border": "{components.groupe.unselected.default.border}",
                      "foreground": "{components.groupe.unselected.default.foreground}" },
          "strokes": { "border": { "color": "{components.groupe.unselected.default.border}", "align": "inside" } } }],
      "sample": "s1" }
  ],
  "structure": { "view": "st1", "variantAxes": ["theme"] },
  "rendering": { "roles": { "…": "…" } },
  "samples": {
    "s1": { "args": { "avecMilieu": false } },
    "s2": { "args": { "bordGauche": true, "bordDroit": true, "iconLeft": false },
            "text": [{ "slotPath": ["cadre", "label"], "figmaLayer": "Texte", "value": "Label" }],
            "composes": [{ "slotPath": ["cadre", "icon"], "figmaLayer": "Icon", "component": "Icon",
                           "args": { "size": "small", "background": "none", "color": "neutral" } }] }
  },
  "pieces": {
    "Segment": {
      "name": ".Segment", "nodeId": "20:0",
      "props": {
        "disabled": { "type": "boolean", "default": false },
        "selected": { "type": "enum", "values": ["true", "false"] },
        "theme": { "type": "enum", "values": ["neutral", "primary", "secondary"] },
        "position": { "type": "enum", "values": ["first", "middle", "last"] },
        "bordGauche": { "type": "boolean", "default": true },
        "bordDroit": { "type": "boolean", "default": true },
        "iconLeft": { "type": "boolean", "default": false }
      },
      "figmaVariantLabels": {
        "axes": { "selected": "Selected", "theme": "Theme", "state": "State", "position": "Position" },
        "values": { "selected": { "true": "True", "false": "False" },
                    "theme": { "neutral": "Neutral", "primary": "Primary", "secondary": "Secondary" },
                    "state": { "default": "Default", "hover": "Hover", "focused": "Focused", "pressed": "Pressed", "disabled": "Disabled" },
                    "position": { "first": "First", "middle": "Middle", "last": "Last" } } },
      "variants": [
        { "nodeId": "20:1", "values": { "selected": "true", "theme": "neutral", "state": "default", "position": "first" },
          "view": "v2",
          "tokens": { "background": "{components.groupe.selected.neutral.default.background}",
                      "foreground": "{components.groupe.selected.neutral.default.foreground}" },
          "strokes": { "border": { "color": "{components.groupe.selected.neutral.default.border}", "align": "inside" } },
          "bindings": [{ "definition": "b1", "nodeId": "20:3" }], "sample": "s2" },
        { "nodeId": "20:5", "values": { "selected": "false", "theme": "neutral", "state": "default", "position": "middle" },
          "view": "v3",
          "tokens": { "border": "{components.groupe.unselected.default.border}",
                      "foreground": "{components.groupe.unselected.default.foreground}" },
          "strokes": { "border": { "color": "{components.groupe.unselected.default.border}", "align": "inside" } },
          "bindings": [{ "definition": "b3", "nodeId": "20:6" }, { "definition": "b1", "nodeId": "20:8" },
                       { "definition": "b2", "nodeId": "20:10" }], "sample": "s2" },
        { "nodeId": "20:9", "values": { "selected": "false", "theme": "neutral", "state": "default", "position": "last" },
          "view": "v4",
          "tokens": { "border": "{components.groupe.unselected.default.border}",
                      "foreground": "{components.groupe.unselected.default.foreground}" },
          "strokes": { "border": { "color": "{components.groupe.unselected.default.border}", "align": "inside" } },
          "bindings": [{ "definition": "b3", "nodeId": "20:11" }, { "definition": "b1", "nodeId": "20:13" }], "sample": "s2" }
      ],
      "structure": { "view": "st2", "variantAxes": ["selected", "theme", "state", "position"] },
      "stateModel": { "axis": "state",
                      "states": { "default": {}, "hover": { "selector": ":hover" }, "focused": { "selector": ":focus-visible" },
                                  "pressed": { "selector": ":active" }, "disabled": { "selector": "[disabled]" } },
                      "precedence": ["disabled", "pressed", "focused", "hover", "default"] },
      "rendering": { "keyRoles": { "fills": { "border": "background" } } },
      "composes": [{ "component": "Icon", "figmaLayer": "Icon", "visibilityProp": "iconLeft" }]
    }
  }
}
```

Ce que l'exemple montre :

- Groupe perd les six props de `.Segment` (F39) et son `composes`. Ses trois `Icon` se comptent par les trois occurrences de `.Segment` (F27).
- Le renvoi recopie les couleurs de la variante citée, puisque Groupe ne les surcharge pas. Cette copie, prix de D4, pèse 2 523 octets sur le contrat réel (§5.1).
- Le contour de `Cadre` n'a pas de `width`, parce que ses épaisseurs par côté n'ont pas de variable, et la perte de la 14.0 reste. Chaque variante porte ses propres contours, et le faux conflit de F44 disparaît.
- `["cadre", "icon"]` place la couleur du glyphe d'`Icon`, que la 14.0 perdait (F19). L'échantillon montre `color: "neutral"` sur `Icon`, et la feuille de `.Segment` donne la couleur réelle.
- Aucune capture ne montre une pièce visible posée dans une pièce. La forme du renvoi imbriqué vient de F7 et du §2.4.

## 4. Vérifications

### 4.1 Les failles F1 à F44

« Forme » dit que ce document la résout. « Lot » dit que le plan la résout dans la case citée, sans effet sur la forme. « Ouverte » dit que rien ne la résout encore.

| Faille | État | Où |
|---|---|---|
| F1 critère du wrapper | forme et lot | E1, plus de sorte wrapper ; lot 4.1 |
| F2 quatre lecteurs de la sorte | lot | 4.1 |
| F3 deux comptes de dimensions | forme | E1 retire le compte ; lots 4.1, 8.1 |
| F4 wrapper préfixé à propriétés | forme | §2.5, E5 |
| F5 pièce partagée | forme | une entrée par hôte, D7 ; aucun champ |
| F6 absence d'un champ du renvoi | forme | §2.4, renvoi complet |
| F7 renvois imbriqués | forme | `PieceReference.pieces`, §2.4 |
| F8 liaisons traversantes | forme et lot | §2.5 ; lot 5.2 |
| F9 racine et slot sur un même réglage | forme | table du §2.3 |
| F10 `args` du renvoi | forme | `values`, §2.4 et étape 5 du §2.12 |
| F11 pièce masquée par une prop | forme | §2.4, un renvoi par slot publié |
| F12 pièce dans un `SLOT` de l'hôte | forme | §2.9 |
| F13 deux définitions du token du composant | lot | 5.4 |
| F14 jugement par emplacement | lot | 5.4, §2.7 |
| F15 cas sans instance | lot | 5.4, §2.7 |
| F16 couleurs d'`Icon` mêlées à celles de la pièce | forme et lot | §2.8 ; lot 5.5 |
| F17 Exporter sans dossier désigné | lot, puis ouverte | 5.4 ; 5.4b attend P31 |
| F18 style de couleur et token d'un autre composant | lot | 5.4 |
| F19 couleur d'icône par surcharge | forme et lot | §2.8 ; lot 5.5 ; question 2 |
| F20 surcharge et glyphe échangé | lot | 5.5, 8.3 |
| F21 règle `@icons` sur une dépendance | forme et lot | §2.8 ; lot 5.5 |
| F22 visibilité empruntée | lot | 2.2 |
| F23 axe propagé signalé en collision | forme | disparaît pour une pièce non exposée ; voir la contradiction 9 |
| F24 budget | lot | 5.1 |
| F25 cycle et dépliage | forme et lot | §2.12, §2.13 ; lots 3.2, 3.3 |
| F26 taille réelle | forme, en partie | taille mesurée au §5.1 ; temps d'analyse ouvert, case 1.5 |
| F27 cardinalité des dépendances | forme et lot | `composes` par entrée ; lot 7.1 |
| F28 lecteurs à la racine | forme et lot | `contratDeLaPiece`, §2.12 ; lot 3.2 |
| F29 slot à tiret, identifiants | forme et lot | §2.3, §2.13 ; lot 5.7 |
| F30 Architect ne lit pas le maître | lot | 8.1, 8.2 |
| F31 localisation des diagnostics | lot | 2.3, attend P33 |
| F32 « Relier le composant » | ouverte | D8, attend P31 |
| F33 axe à valeur unique | forme et lot | §2.2 ; lot 5.6 |
| F34 règles d'hôte orphelines | lot | 5.6, 6.1 ; E5 garde les props exposées dans le bloc de l'hôte |
| F35 texte du point bloquant | lot | 5.6 |
| F36 pièce sélectionnée seule | lot | 5.7 |
| F37 corpus 14.0 | lot | 2.1, 5.9 |
| F38 classes du changement | forme | §6.3 |
| F39 API de l'hôte au réexport | forme | §6.3, liste par cas |
| F40 E14 contre E15 | lot | 5.8 |
| F41 capture d'un client | résolue | D9 |
| F42 essai R1 | résolue | D10 |
| F43 index des règles de la capture | lot | 1.1 |
| F44 épaisseurs par côté d'un même contour | forme et lot | §3.2 ; lot 2.3c attend P33 |

### 4.2 Les décisions, reportées dans la forme

| Décision | Où dans la forme |
|---|---|
| Choix 1 | `pieces`, §2.1 |
| Choix 3 | entrées à plat, renvois imbriqués, §2.4 |
| Choix 5 | `.` et `_` reconnus ; la clé retire le préfixe, §2.1 |
| Parité | `<Pièce>Props` comparée si déclarée, §6.1 |
| D1, E1 à E7, L6 | §2.3, §2.5, §2.6, §2.11, §2.12 |
| D2 | §2.7 |
| D3 | §2.8 |
| D4, Q3, Q4 | §2.4 |
| D5, Q2 | §2.2 |
| D6, Q6 | §2.9 |
| D7 | aucune détection ; une entrée par hôte |
| Q5 | `composes` par entrée, §2.1, §2.8 |
| P33 | pertes dans `meta.diagnostics`, §2.11 |
| D8 | sans effet sur la forme |

### 4.3 Contradictions entre documents

| # | Contradiction | Correction proposée |
|---|---|---|
| 1 | La case 4.1 du plan garde « wrapper élu selon 0.6 », le test « un wrapper à axe de tailles posé une fois par variant reste wrapper » et la fin « `wrapper-de-dimensions` pour `.sizeWrapperButton` seul ». E retire la sorte. | Écrire l'ordre « dépendance sans préfixe, pièce préfixée, détail », retirer ce test et cette fin, comme le §4 de l'étude de D1 le demande. |
| 2 | L'étude du format (Q1 option A, §4 « une pièce peut avoir son wrapper », §8 « place le wrapper selon la question 9 ») garde le wrapper. | Marquer Q1 et ces deux phrases comme remplacées par E. |
| 3 | L'étude du format, §5 et son exemple, publie `args` dans le renvoi et omet `view`, `tokens` et `strokes` quand l'instance égale sa variante. | Remplacée par D4 et F10 : `values`, renvoi complet. L'exemple du §3 la remplace. |
| 4 | DECISIONS-P22.md, §2 à §4, recommande l'exposition comme critère et définit « Wrapper » ; son §5 retient E. | Ajouter en tête du §4 de D1 que l'option E l'a remplacée, et retirer « Wrapper » du vocabulaire. |
| 5 | RECHERCHE-PIECES-INTERNES.md §7 et `_local/p22/LISEZMOI.md` écrivent que la couleur d'`Icon` dans `.Segment` vient de son axe `Color`. F19 et la mesure disent l'inverse : le glyphe porte le token du texte voisin dans les 90 variantes. | Corriger la phrase du §7 de la recherche ; le fichier local suit. |
| 6 | La recherche §7, DECISIONS (D1, « 0 sur 15 »), l'étude de D1 et F15 comptent 15 instances de `.Segment` montrant 10 variantes. Les 3 variants de Groupe en posent 9, qui montrent 9 variantes ; F23 compte bien 9. | Écrire 9 instances et 9 variantes dans les variants de Groupe. Les 6 instances de plus ne vivent pas dans ses variants. |
| 7 | L'étude de D1 estime le contrat de Button à +8 à +11 ko. La mesure donne −358 octets. L'estimation n'a pas compté le départ des 270 liaisons de l'hôte vers les 3 variantes de la pièce. | Remplacer le chiffre de l'étude par celui du §5.1. |
| 8 | E3 écrit qu'un renvoi dont la vue diffère de la variante citée, sur une pièce exposée, produit une perte. Sur Button, les 108 renvois diffèrent de leur variante par `paintPlacements`, puisque les couleurs de l'hôte remplacent celles d'aperçu. | La comparaison exclut `paintPlacements` (§2.11). Les couleurs se vérifient adresse par adresse, comme E3 le prévoit déjà. |
| 9 | F23 et la case 4.2 traitent « l'axe propagé d'un wrapper ». Sans wrapper, une pièce non exposée ne collisionne plus, et une clé exposée égale à une clé de l'hôte est une vraie collision, puisque Figma montre deux propriétés. | Retirer la case 4.2 ; garder le diagnostic de collision pour une pièce exposée. |
| 10 | D2 écrit « l'Exporter avertit » pour le cas 3. Le critère de P33 veut qu'aucun contrôle du composant ne vive à la fois dans l'Exporter et dans Architect, et la case 8.2 porte ce constat dans Architect. | Question 3. |
| 11 | D3 écrit que le contrat d'`Icon` dit que sa couleur vient de l'hôte. L'Exporter qui exporte `Icon` ne lit pas ses hôtes (`loiDuDocumentIntact.test.ts` refuse `loadAllPagesAsync`). | Question 2. |
| 12 | L'audit annonce 43 failles. F44 s'est ajoutée ensuite. | Écrire 44 failles, dont 26 importantes. |
| 13 | La case 5.2 cite `portee-du-contrat.md` « si 0.8 retient B ». 0.8 a retenu A. | Retirer la condition. |
| 14 | FORMAT.md §1, §3, §6 (« un wrapper de dimensions sauté »), §9 (« l'unique occurrence exposée qui appartient au wrapper élu ») et `types.ts` (`ContractStructure.rotation`, `ContractReferenceStructure`, `SampleInstance`) décrivent le wrapper élu. | Réécrire ces passages avec la 15.0 (§6.2). |

## 5. Optimisation

### 5.1 Mesures

Les tailles sont celles du JSON sans espaces. Le contrat 15.0 est simulé par un script jetable, hors du dépôt, qui part des contrats 14.0 rejoués (Button, `.sizeWrapperButton` et `.Ring` exportés seuls, Groupe et `.Segment`, dans `_local/p22/scripts/`). Il applique les règles du §2, renumérote les catalogues partagés, et prend les identifiants d'instance dans les captures. Deux approximations le bornent : l'entrée de `.Segment` garde à plat une pièce intérieure qu'aucune vue ne montre, et elle garde l'emprunt de visibilité de F22.

| Contrat | 14.0 | 15.0 | Écart |
|---|---|---|---|
| Button | 49 608 | 49 250 | −358, soit −0,7 % |
| Groupe | 13 099 | 79 127 | +66 028, soit ×6,0 |
| Groupe et `.Segment` exporté seul, ensemble | 83 718 | 79 127 | −4 591 |

| Poste de Button 15.0 | Octets |
|---|---|
| entrée de `.sizeWrapperButton` | 2 188 |
| entrée de `.Ring` | 334 |
| 108 renvois (90 de la pièce, 18 de `.Ring`) | 25 933 |
| variants de Button sans leurs renvois | 10 129 |
| `nodeId` des renvois | 2 083 |
| liaisons natives de la 14.0 que les renvois remplacent | 12 009 |

| Poste de Groupe 15.0 | Octets |
|---|---|
| entrée de `.Segment` (90 variantes) | 51 402 |
| 9 renvois | 3 909 |
| dont les feuilles recopiées par D4 | 2 523 |

Button ne grossit pas. Les couleurs passent de `variants[].tokens` aux renvois à taille égale, et les 270 liaisons de l'hôte deviennent 9 liaisons dans la pièce. Groupe grossit parce qu'il décrit enfin les 81 variantes de `.Segment` qu'il ne pose pas, ce que le critère de fin 1 demande. Le temps d'analyse reste à mesurer, dans Figma ou par le protocole de la case 1.5.

### 5.2 Factorisations retenues

| Factorisation | Effet mesuré | Raison |
|---|---|---|
| Un seul jeu de catalogues pour l'hôte et ses pièces | −3 % contre des catalogues par entrée (étude R6, §3) | une vue de pièce se résout par le même chemin qu'une vue de l'hôte |
| Liaisons des props exposées dans les variantes de la pièce, et `nodeId` dans le renvoi | −9 926 octets sur Button | 3 variantes portent la liaison une fois ; l'identifiant exact se recompose sans perte |
| Couleurs de l'hôte dans le renvoi plutôt que dans `variants[].tokens` | neutre | une adresse de l'hôte s'arrête au slot `piece` ; les clés relèvent de l'entrée |
| Couleurs d'aperçu non publiées | −12 couleurs sur `.sizeWrapperButton`, −1 contour sur `.Ring` | D2 ; elles n'ont jamais été une décision de design |
| Échantillon d'occurrence en écarts | −117 octets sur Button | règle déjà écrite pour une dépendance, dans le seul champ non normatif |
| `rendering.roles` à la racine seule, `keyRoles` par entrée | −355 octets par pièce | le vocabulaire des rôles est générique |

### 5.3 Factorisations écartées

| Factorisation | Gain mesuré | Raison du refus |
|---|---|---|
| `view` absente quand elle égale la vue de la variante citée | 0 octet sur Button (0 renvoi sur 108 concerné) | deux sens pour une absence (F6, D4), sans gain sur le cas de référence |
| Renvoi limité aux couleurs que l'hôte change | −2 523 octets sur Groupe (3,2 %) | fusion implicite refusée par D4 et par l'invariant « Ni merge, ni héritage, ni défaut » |
| `source.prop` omis quand il égale la clé de l'hôte | −111 octets sur Button | moins de 0,3 % ; une clé renommée ouvrirait un second chemin de lecture |
| Prop exposée réduite à `source`, type et valeurs lus dans l'entrée | −275 octets sur Button | chaque lecteur de `props` (parité, génération des types, validation, guide) devrait résoudre la pièce |
| Septième catalogue de vue pour les renvois | +920 octets (étude R6, §5) | deux variants de l'hôte cesseraient de partager une vue |
| Catalogue de renvois partagés | aucun : `nodeId` est unique par occurrence | aucune entrée ne se répète |
| Renvoi sans `nodeId` | −2 083 octets sur Button | perd les 270 identifiants exacts que la 14.0 publie |
| Pièce décrite en arbre sous chaque instance | +53 % (étude R6, §7) | une pièce décrite deux fois finit par se contredire (Choix 3) |
| Retrait de `structure.sizes` | −1 125 octets sur Button (2,3 %) | modifie E4 : question 1 |

### 5.4 Ce que la 14.0 publiait, et où la 15.0 le garde

| Champ 14.0 d'un hôte à pièce | Emplacement 15.0 |
|---|---|
| `props` propres à l'hôte | `props`, inchangées |
| `props` fusionnées du wrapper élu | `props` avec `source` si l'instance est exposée ; `pieces.<P>.props` sinon (Groupe, F39) |
| `figmaVariantLabels` | inchangé ; ceux de la pièce dans l'entrée, information nouvelle |
| sous-arbre aplati de la pièce dans `viewStructures` | vues des variantes de la pièce et vues des renvois, dans le même catalogue |
| champs de flux de la racine de l'instance (`layout`, `gap`, `padding`, `radius`) | racine de la vue de l'occurrence |
| champs de placement de l'instance (`alignSelf`, `size`, `inset`, `opacity`…) | slot `piece` de l'hôte |
| nom du slot (`label`, `-ring`, `-segment`) | nom du calque sans préfixe ; `figmaLayer` inchangé |
| chemins de typographie, d'icônes, d'effets et de peinture qui traversent la pièce | mêmes parties dans la vue du renvoi, chemins relatifs à la pièce ; adresse complète = `slotPath` du renvoi + chemin |
| `viewComposes` d'une dépendance dans la pièce | vue de la pièce et `pieces.<P>.composes` ; union = `composes` 14.0 |
| définitions de liaison d'une prop de la pièce | définitions de l'entrée, `figmaPath` relatif ; chemin complet = `figmaLayer` du slot + `figmaPath` |
| `variants[].bindings` vers des calques de la pièce | `pieces.<P>.variants[].bindings` ; identifiant exact = `I` + `nodeId` du renvoi + `;` + `nodeId` de la liaison |
| `variants[].bindings` d'une prop de l'hôte sur un calque de la pièce | inchangés |
| `variants[].tokens` et `strokes` posés sur la pièce | `renvoi.tokens` et `renvoi.strokes`, avec le jeton, le chemin et le rôle |
| `variants[].tokens` posés sur les calques de l'hôte | inchangés |
| `structure.view` | projection de l'hôte, qui s'arrête au slot `piece` |
| `structure.sizes` lu sur le wrapper | `pieces.<P>.structure.sizes`, plus la vue exacte de chaque variante |
| `structure.variantAxes`, `stateModel`, `intent`, `textStyles`, `effectStyles` | inchangés |
| `rendering.keyRoles` d'une clé de la pièce | `pieces.<P>.rendering.keyRoles` |
| `icons` sur des calques de la pièce exposée | `pieces.<P>.icons`, `slot` relatif ; prop synthétique sur l'hôte avec `source` |
| `samples[].args` | inchangé ; une prop exposée reste une prop de l'hôte |
| `samples[].text` dans la pièce | échantillon de la variante de la pièce, et écart de l'occurrence dans `samples[].pieces` |
| `samples[].composes` dans la pièce | échantillon de la variante de la pièce, et écart dans `samples[].pieces[].composes` |
| `meta` | inchangé, plus les pertes du §2.11 |

Ce que la 14.0 ne publiait pas et que la 15.0 ajoute : les variantes non posées, les props et liaisons de la pièce, ses règles, les valeurs normatives de chaque occurrence, la couleur qu'un composant pose sur une icône dépendance, et l'identifiant de chaque instance posée. La 15.0 ne perd que ce que la 14.0 inventait. Les props de `.Segment` quittent l'API de Groupe, parce que Figma ne les montre pas sur Groupe, et une instance non exposée cesse de publier ses props sur l'hôte (L4).

## 6. Effets

### 6.1 Lecteurs du contrat

| Lecteur | Chemin | Effet |
|---|---|---|
| Résolution des vues | `packages/kit/src/lecteurs/variant-views.mjs` | `contratDeLaPiece`, la vue d'une occurrence, le dépliage avec pile et borne (§2.12) ; `compositionsExactesDuVariant` déplie les pièces pour la parité |
| Validation | `packages/kit/src/lecteurs/validation-contrat.mjs` | les dix refus du §2.13 ; `sizes` lu par entrée (contrôle des clés et refus de `fontSize`) ; `keyRoles` par entrée ; `structure` et champs autorisés de chaque entrée |
| Échantillons | `packages/kit/src/lecteurs/validation-echantillons.mjs` | `samples[].pieces`, adressé par le `slotPath` d'un renvoi du même variant |
| Graphe des contrats | `packages/kit/src/lecteurs/validation-graphe-contrats.mjs` | union des `composes` de l'hôte et de ses entrées ; miroir slot et `composes` vérifié par entrée ; cycle de `pieces` refusé |
| Contrastes | `packages/kit/src/lecteurs/diagnostic-contrastes.mjs` | rôle d'une clé lu dans l'entrée ; fond cherché au chemin déplié (étape 7 du §2.12) |
| Caractéristiques et aides | `packages/kit/src/lecteurs/caracteristiques.mjs` | table des champs vers les aides pour `ChildStructure.piece`, `PieceEntry.*`, `PieceReference.*`, `PieceSample.*` et `PieceSource.*` ; rôle d'une clé de contour par entrée ; aide `dimensions-par-taille` déclenchée par une entrée qui porte `sizes` |
| Listes du contrôle du code | `packages/kit/src/lecteurs/controle-du-code-listes.mjs` | les champs nouveaux entrent dans la table L3 (valeur en clair ou hors famille) |
| Parité | `packages/kit/src/lecteurs/diagnostic-parite.mjs`, `packages/adapter-typescript/src/parite.mjs` | dépendances comptées par occurrence, pièces dépliées, maximum entre variantes ; `<Pièce>Props` comparée si déclarée, « pièce non comparée » sinon |
| Génération des types | `packages/adapter-typescript/src/generation.mjs`, `types-variants.mjs` | unions des enums de chaque entrée, nommées par l'identifiant de la pièce (`SegmentPosition`) |
| Icônes | `packages/cli/src/icons.mjs` | `figmaName` lu aussi dans `pieces.*.icons` |
| Guide | `packages/cli/src/guide.mjs`, `packages/cli/procedure.md` | l'ordre de lecture d'un hôte, puis de ses pièces ; la règle de l'occurrence |
| Aides de la CLI | `packages/cli/aides/` | `composition.md` (pièce, dépendance, occurrence), `comptage-dependances.md`, `dimensions-par-taille.md` (entrée qui porte l'axe), `echantillon.md` (écarts d'occurrence), `liaison-native.md` (identifiant recomposé), `icone-composant.md` (icône dépendance), `peinture.md` (couleur posée sur une dépendance) |
| Prise des modules | `packages/kit/src/modules/` | rien : `vueExacteDuVariant` garde son contrat ; la résolution d'occurrence entre dans la prise quand un module l'importe |
| Skills | `.agents/skills/consommer-contrat/SKILL.md`, relais `ucm-implementer` écrit par `packages/cli/src/fichiers-du-consommateur.mjs` | rien : les deux renvoient au guide, qui porte la procédure |
| Moteur | `packages/plugin-socle/src/composant/` | lots 4.1, 5.1 à 5.8 du plan |

### 6.2 Ce que reçoivent les documents et le kit

- `packages/kit/src/format/types.ts` reçoit les types ci-dessous, puis `npm run schema` régénère `packages/kit/schema/ucm-contract.schema.json`. Le JSDoc de chaque champ porte la phrase « Absence » des tables du §2, puisque le schéma en tire ses descriptions. Les commentaires qui citent le wrapper élu (`ContractStructure.rotation`, `ContractReferenceStructure`, `SampleInstance`) changent.
- `packages/kit/src/format/version.ts` passe à `15.0`, et `version-contrat.mjs` lit 14.0 et 15.0.
- FORMAT.md reçoit une section « Pièces internes » (§2.2 à §2.4 et §2.12 de ce document), réécrit §1 (props exposées et `source`), §2 (D2, D3, clés par entrée), §3 (sans wrapper, `sizes` par entrée), §6 (slot `piece`, table du §2.3), §7 (`@icons` d'une pièce exposée et d'une dépendance), §9 (`samples[].pieces`, `args` sans wrapper), « Composition et dépendances » (trois sortes, `composes` par entrée), « Métadonnées » (pertes du §2.11 avec `contractPath`) et remplace l'exemple de Button par celui du §3.1.
- COMPATIBILITE.md reçoit l'ordre de sortie d'une majeure du contrat (F38) : paquets ensemble, kit d'abord, puis le code du consommateur, puis le plugin, puis le réexport.

```ts
/** Prop de l'hôte venue d'une instance exposée. */
export type PieceSource = { slotPath: string[]; prop: string };
type PropMeta = { figmaName?: string; source?: PieceSource };

export type ChildStructure = { /* … champs 14.0 … */ piece?: string };

export type PieceReference = {
  slotPath: string[];
  nodeId: string;
  variant: string;
  values?: Record<string, string | boolean>;
  view: string;
  tokens?: SlotTokens;
  strokes?: SlotStrokes;
  pieces?: PieceReference[];
};
export type ContractVariant = { /* … champs 14.0 … */ pieces?: PieceReference[] };

export type PieceSample = {
  slotPath: string[];
  args?: Record<string, string>;
  text?: SampleText[];
  composes?: SampleInstance[];
  pieces?: PieceSample[];
};
export type ContractSample = { /* … champs 14.0 … */ pieces?: PieceSample[] };

export type PieceEntry = {
  name: string;
  nodeId: string;
  props?: Record<string, ContractProp>;
  figmaVariantLabels?: FigmaVariantLabels;
  variants: ContractVariant[];
  structure: ContractReferenceStructure;
  stateModel?: StateModel;
  rendering?: { keyRoles: ColorKeyRoles };
  icons?: Record<string, IconDefinition>;
  composes?: ComposedDependency[];
  intent?: Intent;
};
export type Contract = { /* … champs 14.0 … */ pieces?: Record<string, PieceEntry> };
```

### 6.3 L'entrée de CHANGELOG-FORMAT.md

La 15.0 relève de trois classes (F38).

- Classe 2 : `pieces`, le slot `piece` et les renvois. Un lecteur 14.0 qui les ignore rend le slot d'une pièce vide.
- Classe 3 : le slot de `.sizeWrapperButton` passe de `label` à `sizewrapperbutton` ; `structure.sizes`, `icons`, `variants[].tokens` et `variants[].bindings` quittent la racine de Button ; Groupe perd `disabled`, `selected`, `position`, `bordGauche`, `bordDroit` et `iconLeft`, et son `composes`. Button garde toutes ses clés de props.
- Classe 4 : `composes` absent à la racine ne dit plus « aucune dépendance » pour un hôte à pièces ; `sizes` absent à côté d'une prop `size` veut dire « tailles décrites dans la pièce que `source` nomme ».

La fenêtre de lecture porte la 14.0 et la 15.0. Le code de Button et de Groupe s'adapte à la recette (case 11.5).

## 7. Questions au mainteneur

| # | Question | Réponse recommandée |
|---|---|---|
| 1 | Retirer `structure.sizes` du contrat ? En 15.0, la vue exacte de chaque variante porte déjà son `gap`, son `padding` et son `radius`, et `sizes` les recopie. | Oui. Le contrat de Button perd 1 125 octets (2,3 %), et la projection sans dimensions disparaît. L'hypothèse de FORMAT.md §3 (« les dimensions ne varient que selon l'axe de tailles ») tombe avec, et les `sizes` vides d'`Icon` aussi. La décision E4 devient sans objet, et l'aide `dimensions-par-taille` lit les vues. |
| 2 | Le contrat d'`Icon` doit-il dire que sa couleur vient de l'hôte (D3) ? L'Exporter qui exporte `Icon` ne lit pas ses hôtes. | Non. Aucun champ dans `Icon`. FORMAT.md écrit la règle : une couleur publiée par un composant au slot d'une dépendance remplace, à cet endroit, celle que le contrat de la dépendance donne à son dessin. |
| 3 | Une couleur de pièce du cas 3 (anomalie) se publie. Qui la signale ? D2 dit l'Exporter, et P33 veut qu'aucun contrôle ne vive dans les deux plugins. | Architect seul (case 8.2), et le contrat n'écrit rien dans `meta.diagnostics` : rien n'y est perdu. |

Six points techniques sont tranchés dans ce document sans remonter.

- Le renvoi porte `nodeId`, car la règle « rien ne se perd en silence » l'exige, et le champ coûte 2 083 octets contre 12 009 (§2.4).
- La comparaison des vues de E3 exclut `paintPlacements`, sans quoi 108 renvois sur 108 produisent une fausse perte (contradiction 8).
- À une occurrence, le slot porte la boîte, car Figma donne à l'instance sa valeur effective, et la racine de la pièce ne s'applique pas une seconde fois (§2.3).
- L'échantillon d'une occurrence s'écrit en écarts, comme FORMAT.md §9 le fait déjà pour une dépendance, dans le seul champ non normatif (§2.10).
- Les pertes de P22 prennent le code `UCM_PORTABLE_PROJECTION_WARNING`, car le moteur n'a que deux codes, et une perte rend la couverture partielle (§2.11).
- `.Ring` publie `props.property1`, car l'entrée décrit ce que Figma déclare, et D5 ne décide que des règles d'usage (§2.2).

### Réponses du mainteneur

Le mainteneur retient les trois réponses recommandées. `structure.sizes` sort du contrat, et la décision E4 devient sans objet : chaque vue exacte porte ses dimensions. Le contrat d'`Icon` ne dit rien de l'hôte, et FORMAT.md écrit la règle de remplacement au slot de la dépendance. Une couleur de pièce du cas 3 se signale dans Architect seul, et le contrat n'écrit rien dans `meta.diagnostics`, qui ne porte que les pertes.

# Forme du contrat 15.0

Ce document fixe la forme du contrat de composant que P22 introduit en 15.0. Il part des décisions de l'étape 0 du [plan](./PLAN-P22.md), de l'[étude de D1](./ETUDE-D1-WRAPPER-ET-PIECE.md) et de l'[audit](./AUDIT-CONCEPTION-P22.md), et il sert d'entrée au plan d'implémentation, puis à la réécriture de [FORMAT.md](../../../format/FORMAT.md), de `packages/kit/src/format/types.ts` et du schéma.

La simulation indépendante, récrite dans la forme finale, mesure 54 072 octets UTF-8 sans espaces pour Button et 83 258 pour Groupe, métadonnées recalculées comprises. Elle décrit les trois variantes de `.sizeWrapperButton`, `.Ring` et les 90 variantes de `.Segment`, dont Groupe pose 9 variantes. Les limites des simulations sont au §5.1. Le [stress test](./STRESS-TEST-CONTRAT-15.md) porte les preuves des corrections et les limites du moteur qui restent à mesurer. La [confrontation](./CONFRONTATION-15.md) porte les onze décisions qui ont fixé cette version, et la preuve rejouée de la forme finale.

## 1. Les cinq changements de forme

1. Un bloc `pieces` à la racine. Une entrée par pièce, clé égale à l'identifiant de code de son nom. L'entrée a la forme d'un contrat sans `meta` ni catalogues. Les catalogues de la racine servent l'hôte et toutes ses pièces.
2. Un slot `piece` et un renvoi par occurrence. L'arbre de l'hôte s'arrête au slot qui porte `piece`. Chaque variant qui publie ce slot porte dans `variants[].pieces` un renvoi complet : la variante citée par son `nodeId`, l'identifiant de l'instance, les valeurs normatives, la vue exacte de l'occurrence et ses couleurs.
3. Une prop exposée nomme sa source. L'API de chaque propriétaire contient ses props et celles des instances exposées. Une prop venue d'une instance exposée porte `source`, qui nomme le slot de l'instance et sa clé publique dans la pièce ou la dépendance. Les sources successives conservent leur propriétaire relatif. Une clé déjà prise reçoit le préfixe du slot de l'instance.
4. Les dimensions de chaque combinaison vivent dans sa vue exacte. `structure.sizes` sort du contrat, à la racine comme dans les pièces.
5. Les couleurs se rangent chez le composant qui les pose. Une couleur réelle d'une pièce vit dans ses variantes. Une couleur que l'hôte pose sur une occurrence vit dans le renvoi. Une couleur qu'un composant pose sur une icône dépendance vit dans sa feuille, placée au slot de la dépendance. Une couleur d'aperçu n'est publiée nulle part.

## 2. La forme, champ par champ

Les champs que la 14.0 publie et que ce document ne cite pas gardent leur forme et leur sens définis dans [FORMAT.md](../../../format/FORMAT.md). Les types hérités portent les noms de `packages/kit/src/format/types.ts`. Ce document fixe les changements de la 15.0, pas une seconde copie des champs inchangés. « Requis » vaut pour un contrat 15.0 valide. « Absence » donne le seul sens d'un champ absent.

Un propriétaire est l’hôte ou une entrée de pièce. Une adresse est un tableau ordonné de clés de slots depuis la racine d’une vue. L’adresse vide désigne cette racine. Une occurrence est l’instance d’une pièce à cette adresse dans un variant. Une variante est une entrée de `variants`, identifiée par `nodeId`. Les coordonnées sont ses valeurs d’axes, distinctes de son identité. Une feuille est l’objet `tokens` ou `strokes` d’une variante ou d’un renvoi, au sens de FORMAT.md. L’identité d’un calque est le chemin de ses `figmaLayer` depuis la racine de la vue, chaque nom suivi de son rang parmi les frères de même nom. Deux slots de même adresse et de noms différents sont deux calques. Un écart est une différence entre le renvoi et la variante qu’il cite, pour une identité de calque et un champ.

### 2.1 Racine du contrat

| Champ | Type | Requis | Absence | Invariant | Fondement |
|---|---|---|---|---|---|
| `pieces` | `Record<string, PieceEntry>` | non | l'hôte ne pose aucune pièce | chaque clé vaut `codeIdentifier(entree.name)`, elle diffère de celle de l'hôte et des autres pièces ; chaque entrée est atteinte par au moins un renvoi ; le graphe des pièces n'a pas de cycle | Choix 1, Choix 3, F25, F29 |
| `viewStructures` | `Record<string, VariantStructure>` | oui | sans objet | catalogue commun à l'hôte et aux pièces | étude R6 §3, F28 |
| `variantViews` | `Record<string, ContractVariantView>` | oui | sans objet | chaque vue résout ses parties dans les catalogues communs | F28 |
| `viewTypographies` | `Record<string, TextStyleUse[]>` | non | aucun usage typographique | adresses relatives au propriétaire de la vue | F28 |
| `viewComposes` | `Record<string, ComposedDependency[]>` | non | aucune dépendance placée | dépendances directes de chaque vue | Q5 |
| `viewIcons` | `Record<string, Record<string, VariantIconPlacement>>` | non | aucune icône placée | adresses relatives au propriétaire | F21 |
| `viewPaintPlacements` | `Record<string, VariantPaintPlacements>` | non | aucune peinture placée | miroir des feuilles de chaque variante et occurrence | D4 |
| `viewEffects` | `Record<string, EffectStyleUse[]>` | non | aucun usage d'effet | références au catalogue commun de styles | F28 |
| `propertyBindingDefinitions` | `Record<string, PropertyBindingDefinition>` | non | aucune liaison native | chaque usage résout sa définition dans ce catalogue | F8 |
| `textStyles` | `Record<string, TextStyleDefinition>` | non | aucun style de texte utilisé | partagé par égalité stricte | F28 |
| `effectStyles` | `Record<string, EffectStyleDefinition>` | non | aucun style d'effet utilisé | partagé par égalité stricte | F28 |
| `samples` | `Record<string, ContractSample>` | non | aucun contenu indicatif publié | partagé par égalité stricte, hors du normatif | §2.10 |
| `rendering.roles` | `Record<string, RenderingRole>` | oui | sans objet | vaut pour l'hôte et pour chaque pièce | étude R6 §2 |
| `rendering.keyRoles` | `ColorKeyRoles` | non | toutes les clés de l'hôte nomment leur rôle | ne couvre que les clés de l'hôte | étude R6 §2 |
| `composes` | `ComposedDependency[]` | non | l'hôte ne pose lui-même aucune dépendance | union ordonnée des `viewComposes` des vues de l'hôte seul ; les dépendances posées dans une pièce restent dans son entrée | Q5, F27 |
| `icons` | `Record<string, IconDefinition>` | non | aucune icône déclarée dans l'arbre de l'hôte | `slot` vise un slot de l'arbre de l'hôte | E5 |
| `structure.sizes` | retiré | interdit | dimensions dans les vues exactes | aucune projection par taille ne double les vues | réponse 1 du mainteneur, §7 |

`meta` ne change pas de forme. Il décrit l’export de l’hôte et de ses pièces. `meta.diagnostics` agrège les pertes de chaque propriétaire, y compris celles des variantes non posées (§2.11). Une pièce ne reçoit pas son propre `meta` dans le contrat publié.

### 2.2 Entrée d'une pièce (`PieceEntry`)

L'entrée reprend les champs d'un contrat, sous les mêmes noms. Un lecteur la lit comme un contrat 14.0 sans `meta`, en lui prêtant les catalogues et `rendering.roles` de la racine (§2.12). La façade de lecture reçoit aussi `meta.contractVersion`, car les lecteurs choisissent la résolution par cette version. Ce champ technique ne crée pas de métadonnées d'export dans l'entrée. Un champ de l'hôte absent de l'entrée ne passe jamais à la pièce : une entrée sans `stateModel` décrit une pièce sans axe d'états.

| Champ | Type | Requis | Absence | Invariant | Fondement |
|---|---|---|---|---|---|
| `name` | `string` | oui | sans objet | nom Figma exact, préfixe compris (`.sizeWrapperButton`) | étude R6 §2 |
| `nodeId` | `string` | oui | sans objet | identifiant du component set de la pièce, ou du composant seul | étude R6 §2 |
| `props` | `Record<string, ContractProp>` | non | la pièce ne déclare aucune propriété | toutes les propriétés propres du set et celles de ses instances exposées ; `source` est relative à cette pièce (§2.5) | critère de fin 1, D5 |
| `figmaVariantLabels` | `FigmaVariantLabels` | non | chaque variante porte son nom Figma selon la règle commune | étiquettes des axes de la pièce | étude R6 §2 |
| `variants` | `ContractVariant[]` | oui | sans objet | une entrée par variante du set, posée ou non | critère de fin 1, F11 |
| `structure` | `ContractReferenceStructure` | oui | sans objet | `view` renvoie à `viewStructures` ; `sizes` interdit selon §2.6 | E4 |
| `stateModel` | `StateModel` | non | la pièce n'a pas d'axe d'états | règle de la racine | étude R6 §2 |
| `rendering` | `{ keyRoles: ColorKeyRoles }` | non | toutes les clés de la pièce nomment leur rôle | ne couvre que les clés de la pièce et de ses renvois | étude R6 §2, F28 |
| `icons` | `Record<string, IconDefinition>` | non | aucune icône déclarée dans la pièce | `slot` vise un slot de l'arbre de la pièce ; la règle vient du bloc de l'hôte si la pièce est exposée, du bloc de la pièce sinon | E5, F21 |
| `composes` | `ComposedDependency[]` | non | la pièce ne pose aucune dépendance | union des `viewComposes` des vues de la pièce | Q5, F27 |
| `intent` | `Intent` | non | aucune intention d'usage déclarée par `@usage` | lu dans le bloc de la pièce, sur sa page ; un bloc sans `@usage` n'ajoute pas ce champ | D5, E5 |

`rendering` garde dans l'entrée le nom qu'il a à la racine. `entree.rendering?.keyRoles` et `contrat.rendering?.keyRoles` se lisent par le même accès, et les lecteurs actuels (`diagnostic-contrastes.mjs`, `caracteristiques.mjs`, `validation-contrat.mjs`) s'appliquent à l'entrée sans second chemin. L'entrée ne porte pas `componentKey` : une pièce préfixée n'est pas publiée, et la 14.0 ne publiait pas cette clé.

Une pièce sans choix (D5) reçoit son entrée sans `intent`. `.Ring` publie `props.property1` à une seule valeur, `default`, comme Figma la déclare, car la règle D5 décide des règles d'usage, pas de ce que l'entrée publie.

### 2.3 Slot qui porte une pièce

`ChildStructure` gagne un champ.

| Champ | Type | Requis | Absence | Invariant | Fondement |
|---|---|---|---|---|---|
| `piece` | `string` | non | ce slot ne pose aucune pièce | clé d'une entrée de `pieces` ; exclusif de `composes` et de `children` | Choix 1, étude R6 §5 |

Le slot d'une pièce porte seulement `slot`, `figmaLayer`, `piece` et les champs qui disent comment le parent place l'instance : `optional`, `visibilityProp`, `visibilityTargets`, `alignSelf`, `flexGrow`, `size`, `structuralSize`, `bounds`, `position`, `constraints`, `inset`, la place en grille, `rotation` et `opacity`. Il ne porte aucun champ de flux intérieur (`layout`, `justifyContent`, `alignItems`, `wrap`, `gap`, `rowGap`, `columnGap`, `padding`, `radius`, pistes de grille) : la racine de la vue de l'occurrence les porte. `visibilityProp` nomme une prop du propriétaire du slot.

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
| `values` | `Record<string, string \| boolean>` | non | l'API de la pièce n'a aucune propriété `BOOLEAN` ni `INSTANCE_SWAP` | une clé par propriété `BOOLEAN` ou `INSTANCE_SWAP` de l'API de la pièce, propre ou venue d'une instance qu'elle expose, exposée ou non à ce slot, aux clés publiques de la pièce ; la valeur posée à cette occurrence ; un `INSTANCE_SWAP` vaut le nom du composant placé | F10, D4, décision 4 de la confrontation |
| `view` | `string` | oui | sans objet | clé de `variantViews` : la vue exacte de l'occurrence, adresses relatives à la racine de la pièce | D4 |
| `tokens` | `SlotTokens` | non | l'occurrence ne peint aucune couleur | feuille effective complète à cet endroit ; ses clés égalent celles que `paintPlacements` de la vue place en `fills` | D4, F6 |
| `strokes` | `SlotStrokes` | non | l'occurrence ne peint aucun contour | même règle, côté `strokes` | D4, F6 |
| `pieces` | `PieceReference[]` | non | la vue de l'occurrence ne contient aucun slot `piece` | un renvoi par slot `piece` de `view`, chemins relatifs à la pièce, complet comme le renvoi parent | F7 |

Un renvoi est complet (D4). Il ne reprend jamais une partie de la variante citée. Sa vue, ses feuilles et ses renvois imbriqués décrivent l'occurrence entière. Un renvoi sans `tokens` peint une occurrence sans couleur, jamais la couleur de la variante. Un lecteur qui déplie une occurrence lit `renvoi.pieces`, jamais les `pieces` de la variante citée.

Un renvoi par slot `piece` publié (F11). Chaque variant porte un renvoi pour chaque slot `piece` de l'arbre de sa vue, masqué par une prop de l'hôte compris. Un calque masqué sans prop sort de l'arbre, et son renvoi avec lui.

`nodeId` conserve les identifiants exacts des liaisons déplacées. Une liaison native d'une prop exposée passe de l'hôte à la variante de la pièce (§2.5), qui cite le calque du maître (`3:429`). La jointure vaut `"I" + parent.replace(/^I/, "") + ";" + enfant.replace(/^I/, "")`. Le parent est le `nodeId` du renvoi. L'enfant est l'identifiant complet rendu par `nodeIdDeLiaison`, suffixe de définition compris. La chaîne porte un seul `I` initial, même avec plusieurs instances imbriquées. Le parent `I3:152;3:429` et l'enfant `1829:9613` donnent `I3:152;3:429;1829:9613`. La même jointure s'applique aux occurrences intérieures.

Sans `nodeId`, le contrat perdrait les 270 identifiants exacts que la 14.0 publie sur Button. Le champ coûte 2 101 octets par suppression avec sa virgule, contre 12 009 octets pour les liaisons qu'il remplace.

`values` ne porte pas les axes. La variante citée donne les valeurs d'axes. Une prop `disabled` qu'un axe d'états fabrique n'est pas une propriété `BOOLEAN` et n'entre pas dans `values`. Une propriété `TEXT` va dans l'échantillon (§2.10).

Le renvoi porte la valeur posée de chaque prop exposée, dans chaque variant du propriétaire. Un booléen ou un échange exposé la porte dans `values`. Un axe exposé la porte dans les coordonnées de `renvoi.variant`, et, pour un axe d'une pièce de pièce, dans celles du renvoi imbriqué. Le `default` de la prop de l'hôte ne dit pas cette valeur : un variant `y` peut poser `voir=false` quand le défaut vaut `true` (E07). Le code qui règle la prop de l'hôte remplace la valeur posée. Sans réglage, la valeur posée vaut. Une valeur égale au défaut s'écrit aussi, pour qu'une absence n'ait qu'un sens.

Les clés de couleur d'un renvoi appartiennent à l'entrée de la pièce. `colorKeys.ts` les décide sur les variantes de la pièce et sur tous ses renvois, et `pieces.<P>.rendering.keyRoles` donne leur rôle. Une couleur de l'hôte ne fait plus allonger une clé de la pièce.

### 2.5 Props exposées et leur source

`PropMeta`, la partie commune à toutes les props, gagne un champ.

| Champ | Type | Requis | Absence | Invariant | Fondement |
|---|---|---|---|---|---|
| `source` | `PieceSource` | non | le propriétaire déclare lui-même cette prop | chemin relatif au propriétaire courant ; cible `piece` ou `composes` ; type et valeurs égaux à ceux de la propriété publique ciblée | E2, D1, réponses 1 et 3 du stress test |

| Champ de `PieceSource` | Type | Requis | Absence | Invariant |
|---|---|---|---|---|
| `slotPath` | `string[]` | oui | sans objet | adresse relative au propriétaire courant, stable entre les variants qui publient l’instance |
| `prop` | `string` | oui | sans objet | clé publique de la propriété du propriétaire ciblé |
| `component` | `string` | pour une dépendance | la cible est une pièce | égal à l’identifiant public du contrat que le slot `composes` cite ; interdit pour une pièce |

Une propriété de pièce peut elle-même porter `source`. Résoudre successivement les sources de propriétaire en propriétaire, puis appliquer la valeur à la propriété terminale. Ne pas interpréter le chemin de la deuxième source depuis l’hôte. Un chemin traverse les cadres du propriétaire, puis s’arrête au slot `piece` ou `composes` ciblé. Le propriétaire suivant reprend avec son propre chemin. La résolution garde les couples propriétaire et propriété déjà visités et refuse une boucle.

Une source vers une dépendance se lit avec son contrat autonome. Le contrat de l’hôte ne recopie ni les calques ni les propriétés privées de la dépendance. Le validateur du graphe compare la clé publique, le type et les valeurs à ce contrat. Une dépendance non disponible produit un résultat de validation incomplet, jamais une validation réussie de cette source.

La prop de l'hôte reste complète : `type`, `values`, `default` et la documentation lue dans le bloc de l'hôte (E5). La propriété propre de l’entrée garde la forme que la pièce déclare. Une propriété issue d’une instance intérieure garde sa source relative. Sa documentation suit le bloc de règles du propriétaire qui la présente (§2.2, E5). Une référence interne de la prop de l'hôte, comme `visibilityProp`, emploie les clés de l'hôte.

Une prop d'icône synthétique (`iconLeftName`) suit sa règle `@icons`. Pour une pièce exposée, la règle vient du bloc de l'hôte. L'entrée de la pièce reçoit la définition d'icône et la prop synthétique, et l'hôte reçoit la même prop avec `source`. Button garde donc `iconLeftName` et `iconRightName`.

Une prop `VARIANT` exposée choisit la variante de la pièce (E3, §2.12). Une prop `BOOLEAN`, `TEXT` ou `INSTANCE_SWAP` exposée, réglée par le code, décide de ce que la pièce rend à la place de la valeur posée de `renvoi.values`. Les liaisons natives de ces props vivent dans `variants[].bindings` de l'entrée, avec un `figmaPath` relatif à la pièce. Une prop de l'hôte reliée à un calque intérieur d'une pièce garde sa liaison dans les `bindings` de l'hôte, avec son `figmaPath` complet (F8).

Figma montre une propriété par instance exposée, même quand deux instances présentent la même clé. Le contrat les publie toutes. Les clés se décident dans cet ordre, sans perte ni refus :

1. Les props propres du propriétaire gardent leur clé.
2. Les instances exposées se lisent dans l'ordre de l'arbre publié. La première qui présente une clé la garde, avec sa `source`.
3. Une instance suivante dont la clé est déjà prise, par une prop propre ou par une instance précédente, reçoit le préfixe de son slot. La clé préfixée est l'identifiant de code formé des mots du `slotPath`, puis de la clé : `segment-2` et `selected` donnent `segment2Selected`. Une clé préfixée déjà prise reçoit le plus petit suffixe entier libre à partir de 2.

`source.prop` garde la clé publique de la pièce. Deux occurrences du même set comptent comme deux instances. Une même instance présente la même clé dans tous les variants qui la publient, même si son chemin change (E2). Un hôte qui aurait son propre axe `size` garderait `size`, et l'axe exposé de `.sizeWrapperButton` deviendrait `sizewrapperbuttonSize` (A11). Une instance exposée dans une partie des variants seulement publie ses props, et une perte nomme les variants sans exposition (L6).

Un `INSTANCE_SWAP` exposé dont une valeur préférée (`preferredValues`) désigne une pièce reçoit une perte sur la prop du propriétaire, qui nomme cette pièce (A04b). Aucun renvoi ne décrit la pièce à ce slot, donc le contrat ne dit pas ce qu'elle rend quand le code la choisit. Une pièce posée par l'échange dans un variant reçoit son renvoi comme toute occurrence.

### 2.6 Dimensions par taille

`structure.sizes` est interdit en 15.0, à la racine comme dans chaque pièce. Chaque vue exacte porte son `gap`, son `padding` et son `radius`, même si un autre axe que la taille les fait varier. `structure.view` désigne une structure complète, avec ses dimensions. L'aide `dimensions-par-taille` suit les variantes réelles et leurs vues. La réponse 1 du mainteneur (§7) remplace E4.

### 2.7 Couleurs d'une pièce

Aucun champ nouveau. D2 décide quelles valeurs entrent dans les champs existants.

| Emplacement du maître de la pièce | Verdict | Où le contrat l'écrit |
|---|---|---|
| lié à un token du composant hôte | réelle | `pieces.<P>.variants[].tokens` ou `.strokes`, placée par la vue de la variante |
| non lié à un token du composant, remplacé par chaque occurrence qui peut montrer la variante, au moins une occurrence la montrant | aperçu | nulle part, sans message |
| tout autre cas | anomalie | publiée comme une couleur réelle ; le constat relève d'Architect seul, sans diagnostic de perte |

Le jugement porte sur l'emplacement (chemin du calque dans la pièce, champ, indice de la peinture), sur toutes les variantes du set (F14, F15). Une occurrence peut montrer une variante quand elle la cite, ou quand elle l'atteint par l'axe d'états de la pièce ou par un axe exposé (§2.12, étape 6). Elle remplace l'emplacement quand sa propre feuille y peint une autre valeur. Une occurrence qui atteint la variante sans peindre l'emplacement laisse voir la couleur du maître : l'emplacement n'est pas d'aperçu, et la variante publie sa couleur (A21). « Token du composant » a une seule définition dans le kit (F13). Dans un fichier libre sans dossier désigné, seul le remplacement compte : un emplacement remplacé partout est d'aperçu, les autres se publient comme en 14.0 (F17).

Une couleur que l'hôte pose sur une occurrence entre dans la feuille du renvoi, avec les couleurs réelles que l'occurrence garde. Le renvoi de Ring dans un variant `Focus` de Button porte la couleur de l'anneau que Button pose, et l'entrée `.Ring` ne publie aucun contour : la couleur de son maître est d'aperçu. La largeur et l'alignement du contour arrivent avec la couleur, dans `renvoi.strokes`, puisque `StrokeTokens` les groupe.

### 2.8 Icônes et dépendances posées dans une pièce

Une dépendance posée dans une pièce se range dans `pieces.<P>.composes` et dans les `viewComposes` des vues de la pièce. `Icon` est une dépendance de `.sizeWrapperButton` et de `.Segment`, jamais de l'hôte. La parité et le graphe déplient les occurrences pour compter (F27).

La couleur d'une icône dépendance suit D3, F19 et F20. Le composant qui pose l'instance publie la couleur qu'il donne au dessin de la dépendance, quand sa liaison diffère de celle du même emplacement dans le maître du composant placé, glyphe échangé compris. La couleur entre dans sa feuille (variante de la pièce, ou renvoi si l'hôte la pose à l'occurrence), et `paintPlacements` la place au chemin du slot qui porte `composes`. Son rôle se lit sur le dernier segment du token quand il nomme un rôle ; sinon il vaut `foreground` pour un texte de la dépendance, `icon` pour un tracé, `background` ailleurs. Dans `.Segment`, le glyphe d'`Icon` reçoit le token du texte voisin dans les 90 variantes : la clé `foreground` gagne le chemin `["cadre", "icon"]`, sans clé nouvelle. Une autre surcharge de peinture dans une dépendance reste hors du contrat, avec une perte écrite.

Une règle `@icons` sur une dépendance suit F21. Une règle `@icons` peut nommer le calque d'une instance de dépendance. Le slot porte alors `composes`, et la définition d'icône garde `runtimeProp`, `visibilityProp`, `slot` et `variants`. `figmaName` y nomme le glyphe que la dépendance affiche par défaut, lu sur son `INSTANCE_SWAP` quand elle en a un, sinon par la comparaison positionnelle de `swaps`. `size` reste absent, puisque la taille d'une dépendance appartient à son contrat. `ucm icons` liste ainsi les glyphes que le repository doit savoir dessiner.

Le contrat d'`Icon` ne dit rien de l'hôte. Une couleur publiée au slot de la dépendance remplace, à cet endroit, celle que le contrat de la dépendance donne à son dessin (réponse 2 du mainteneur, §7).

### 2.9 Contenu d'un `SLOT`

Le contenu par défaut d'un `SLOT` de l'hôte reste décrit comme en 14.0 (D6). Une pièce dans ce contenu reçoit son renvoi, au chemin qui traverse le slot, `["milieu", "segment"]` dans Groupe. Le renvoi se lit sur l'instance, sans comparaison au maître de l'hôte (F12).

Le contenu d’un `SLOT` de pièce rempli par l’hôte reste hors de la projection 15.0 (D6). Une perte nomme le slot et l’occurrence, même si ce contenu pose une autre pièce ou une dépendance. Le renvoi décrit le reste de la pièce. La matrice complète ne signifie donc pas que tous les remplissages de slots sont décrits.

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

Une perte signifie qu’une donnée du dessin ou de sa résolution manque au contrat portable. Les pertes prennent le code `UCM_PORTABLE_PROJECTION_WARNING` et rendent `meta.coverage.portable` égal à `partial`. Chaque perte porte `contractPath`. Il vaut le chemin du variant ou du renvoi dans le JSON publié, ou celui du champ de catalogue quand la donnée manque à un catalogue partagé, comme `effectStyles.<clé>.effects[0].color`. Son message nomme la propriété de l’API Figma manquante et l’adresse du calque dans son propriétaire. Les pertes restent dans le contrat quand l’interface de l’Exporter cesse de les montrer (P33). Les notes d’export (`UCM_EXPORT_NOTICE`) gardent la règle de la 14.0 et ne changent pas `coverage`.

Le moteur rassemble les pertes de l’hôte, de chaque pièce et de chaque occurrence. Il analyse toutes les variantes des pièces, posées ou non. Une perte du maître porte par exemple `pieces.Segment.variants[4]`, ou `pieces.Segment.variants` quand elle se regroupe. Une perte propre à une occurrence porte `variants[2].pieces[0]`. Une occurrence reçoit une perte seulement si sa valeur effective diffère de celle de la variante citée ; une perte de maître n’est donc pas recopiée sur chaque occurrence qui la pose. La racine d’une occurrence se juge sur la boîte de son slot (§2.3). Une dimension que deux insets fixent sous une contrainte `scale` ou `stretch` n’est pas une perte de dimension. Le moteur dédoublonne seulement deux constats qui décrivent la même perte au même chemin et au même variant. Les erreurs de collision corrigées par D1 et les visibilités corrigées par F22 ne sont pas des pertes résiduelles. Un constat du contrat 14.0 autonome d’une pièce que la 15.0 rend faux n’est pas publié : le conflit de rôle d’une couleur d’aperçu (D2), et le tracé vectoriel sans règle `@icons` quand la règle de l’hôte le nomme (§2.5).

| Cas | `contractPath` | Fondement |
|---|---|---|
| une sélection d’axes exposés ou d’état n’a aucun variant, ou en a plusieurs | le renvoi ou la source concernée | réponse 2 du stress test ; aucune sélection du premier |
| le transfert d’un écart vers une variante atteignable n’est pas prouvé : identité absente de la cible, appariement ambigu, valeurs initiales différentes, écart sans preuve, ou exposition qui diffère entre V et V′ | le renvoi | §2.12, étape 6 ; décision 1 de la confrontation |
| une instance sans préfixe ni règles, dont le composant laisse un choix, est décrite à plat | le slot | E6 |
| une instance est exposée dans une partie des variants seulement | la propriété | L6 |
| un `INSTANCE_SWAP` exposé peut désigner une pièce par une valeur préférée | la propriété, avec la pièce nommée dans le message | §2.5 ; décision 11 de la confrontation |
| la source d’une propriété exposée change de chemin selon le variant, ou sa cible ne peut pas être lue | la propriété | E2, source relative |
| l’hôte remplit un `SLOT` de pièce | le renvoi et le slot nommé dans le message | D6 |
| un `INSTANCE_SWAP` non exposé ne se nomme pas | le renvoi | F10 |
| une surcharge de peinture dans une dépendance n’est pas celle d’une icône | le slot de la dépendance | D3 |
| un mode de variable est forcé sur un calque, et une variable liée sous ce calque appartient à la collection forcée | le variant ou le renvoi, avec `explicitVariableModes` nommé | §2.14 ; décision 6 de la confrontation |
| une donnée de rendu manque dans une structure, une peinture, une plage de texte ou un effet | le variant ou le renvoi, avec le champ API nommé | §2.14 |

Deux instances exposées qui présentent la même clé ne produisent ni perte ni refus : la seconde reçoit le préfixe de son slot (§2.5). Deux pièces de même identifiant de code bloquent l’export (F29, gardé par la décision 8 de la confrontation). Un cycle ou un chemin déplié de plus de 12 niveaux fait refuser le contrat (F25). Ces refus ne se remplacent pas par une couverture partielle.

Les pertes de maître se regroupent (décision 10 de la confrontation). Une classe réunit les pertes de maître qui visent des variantes du même propriétaire, pour le même cas du tableau, la même propriété de l’API et la même adresse. Une vue contient une adresse quand sa structure a un slot à ce chemin, et toute vue contient l’adresse vide. Le moteur publie une seule perte pour la classe quand elle touche au moins deux variantes, et exactement les variantes du propriétaire dont la vue contient l’adresse. Sinon il publie une perte par variante, au chemin de la variante (`pieces.<P>.variants[4]`), comme une perte qui dépend de la valeur. Une perte regroupée garde `code` et `severity`, et porte ces champs de `ContractDiagnostic` :

- `contractPath`, égal à `variants` pour l’hôte ou à `pieces.<P>.variants` pour une pièce ;
- `slotPath`, l’adresse du calque dans son propriétaire, `[]` pour la racine, champ présent seulement sur une perte regroupée ;
- `figma.property`, le nom de la propriété de l’API qui manque ;
- `message`, qui nomme la propriété et l’adresse et finit par « Dans N variantes. », N étant le nombre de variantes de la classe.

```json
{ "code": "UCM_PORTABLE_PROJECTION_WARNING", "severity": "warning",
  "message": "strokeWeight manque à l'adresse [\"cadre\"]. La capture porte un contour dont le contrat omet la largeur. Dans 90 variantes.",
  "contractPath": "pieces.Segment.variants", "slotPath": ["cadre"], "figma": { "property": "strokeWeight" } }
```

Le lecteur retrouve la liste des variantes depuis le contrat seul. Il parcourt le tableau que `contractPath` désigne, résout la vue de chaque variante et garde, dans l’ordre du tableau, celles dont la structure contient `slotPath`. Leur nombre égale N, et la validation refuse une perte regroupée où il diffère (§2.13, point 15). Une perte de renvoi et une perte de catalogue ne se regroupent pas. Sur Groupe, 475 pertes deviennent 21 classes et une perte de catalogue, et chacune des 21 listes se retrouve ainsi.

### 2.12 Résolution d’une occurrence

La règle des états (étapes 3, 5 et 6, et le paragraphe qui suit la liste) attend sa réécriture selon la conclusion de l’[étude de la règle des états](./ETUDE-REGLE-DES-ETATS.md), dont la convention d’UCM remplace la décision 1 de la confrontation.

`packages/kit/src/lecteurs/variant-views.mjs` porte la seule résolution du futur moteur 15.0, de la validation, des contrastes et de la parité. Les scripts locaux éprouvent cette règle sans modifier ce lecteur de production.

1. `contratDeLaPiece(contrat, cle)` rend les champs de l’entrée, les catalogues de la racine, `meta: { contractVersion: contrat.meta.contractVersion }` et `rendering: { roles: contrat.rendering.roles, keyRoles: entree.rendering?.keyRoles }`. Assembler `rendering` après les champs de l’entrée. Les autres champs absents de l’entrée ne viennent pas de l’hôte.
2. Trouver le renvoi dont `slotPath` égale le chemin du slot `piece`. Trouver V par `renvoi.variant`, dans l’entrée ciblée. Sans changement d’axes ni d’état, rendre le renvoi complet, même si ses feuilles sont absentes. Ne pas compléter son rendu avec V.
3. Résoudre les propriétés exposées selon §2.5, puis former les coordonnées demandées à partir de celles de V. Remplacer les axes exposés réglés par l’hôte. Le code applicatif choisit l’état dans `stateModel` de la pièce, exposée ou non, puis remplace seulement cet axe. Le contrat décrit les états possibles ; il ne commande aucun événement.
4. Chercher toutes les variantes aux coordonnées demandées. Zéro ou plusieurs résultats donnent une sélection non résolue et une perte ciblée (§2.11). Ne choisir aucun variant arbitraire, même si deux rendus semblent identiques. Un appel qui désigne explicitement un `nodeId` reste une sélection par identité.
5. Pour une cible unique V′ différente de V, prendre sa vue et ses feuilles. Déduire les seuls écarts de l’occurrence en comparant V au renvoi, par identité de calque et par champ (§2). Comparer les peintures par leurs placements, pas par le seul nom des clés. Transférer chaque écart au calque de même identité dans V′ quand aucune perte de transfert ne vise le renvoi : le moteur les a prouvés à l’export (étape 6). Le lecteur ne refait pas la preuve, que les couleurs d’aperçu absentes du contrat (D2) empêcheraient. Une suppression de peinture est un écart. Une occurrence sans surcharge prend les couleurs de V′, jamais celles de V figées dans son renvoi. Une valeur de `values` n’est pas un écart : une propriété de composant suit l’instance d’une variante à l’autre. Les mêmes règles valent pour les renvois imbriqués.
6. Une variante V′ est atteignable depuis un renvoi quand ses coordonnées s’obtiennent en changeant, depuis V, les axes exposés de la pièce à ce slot ou l’axe de son `stateModel`. Le moteur vérifie le transfert de chaque écart vers chaque V′ atteignable, à l’export, quand il connaît encore le dessin. Le contrat écrit une perte chaque fois qu’il ne peut pas prouver ce que Figma rendrait, pour ne jamais dire une chose fausse. Un écart de couleur est prouvé quand trois conditions tiennent ensemble :
   - V′ contient un calque de même identité ;
   - aucun calque du chemin n’a de frère de même nom, ni dans V ni dans V′, car l’appariement de Figma serait alors ambigu ;
   - V et V′ portent la même valeur initiale pour cette identité et ce champ, couleurs d’aperçu comprises : c’est la condition que Figma documente pour garder une surcharge.

   Deux calques de noms différents à la même adresse ne transfèrent rien, même avec la même valeur initiale : l’identité du calque surchargé manque à V′ (A13b). Un écart dans un renvoi imbriqué suit la même règle, entre le renvoi que V y pose et celui que V′ y pose. Un écart de structure, de typographie, de visibilité sans propriété, d’échange ou d’effet n’a pas de preuve en 15.0. Le transfert n’est pas prouvé non plus quand une instance exposée dans la pièce diffère entre V et V′ : présente dans une seule des deux, posée dans une autre variante, ou avec d’autres valeurs posées. Une seule de ces conditions produit une perte. Une perte vise le renvoi entier : le lecteur laisse non résolues toutes ses coordonnées, même celles dont l’écart se prouve, et ne les annonce pas fidèles. Les textes suivent la conservation propre aux textes documentée par Figma. Leur contenu demeure indicatif sous `samples`.
7. Un booléen ou un échange exposé prend la valeur que le code donne à la prop du propriétaire, transmise par la chaîne de sources. Sinon, il prend la valeur posée de `renvoi.values`, jamais le `default` de la prop du propriétaire (§2.4). Un slot piloté par un booléen faux ne se rend pas. Un calque statiquement masqué est déjà sorti de la vue. Le contenu indicatif se lit selon §2.10.
8. Appliquer la boîte du slot selon §2.3. Chercher le fond d’une peinture au chemin vide de la pièce dans l’hôte, au plus long préfixe du chemin déplié, selon FORMAT.md §2.
9. Garder la pile des entrées ouvertes. Refuser un cycle avant de descendre. Compter la profondeur sur le chemin déplié, hôte et cadres compris, avec une borne de 12 niveaux.

La vérification des transitions est conservée. La [règle officielle de Figma](https://help.figma.com/hc/en-us/articles/360039150733-Apply-changes-to-instances) tient compte des noms de calques et de leurs valeurs initiales. La preuve de l’étape 6 exige les deux. Elle tient donc sous les deux lectures de cette règle que la confrontation a rejouées : une surcharge qui suit le nom et le rang du calque, ou une surcharge qui tombe quand la valeur initiale change. Une pièce verte au repos et blanche au survol peut perdre le rouge que l’hôte impose au repos. Un transfert rouge par adresse seule diverge de cette règle. Les [heuristiques de `swapComponent`](https://developers.figma.com/docs/plugins/api/properties/InstanceNode-swapcomponent/) peuvent changer. Une preuve documentaire ne remplace pas un rejeu dans Figma.

### 2.13 Ce que la validation refuse

`validation-contrat.mjs` refuse un contrat 15.0 qui viole l'un de ces points, en plus des contrôles de la 14.0 appliqués à chaque entrée.

1. Un slot `piece` qui nomme une clé absente de `pieces`, ou qui porte aussi `composes`, `children` ou un champ de flux intérieur.
2. Une entrée qu'aucun renvoi n'atteint.
3. Un variant dont les renvois ne couvrent pas exactement les slots `piece` de son arbre publié, ou dont deux renvois ont le même `slotPath`.
4. Un `renvoi.variant` absent des variantes de l'entrée ; une `renvoi.view` absente de `variantViews`.
5. Des clés de `renvoi.tokens` ou `renvoi.strokes` qui ne correspondent pas aux clés placées par la vue du renvoi.
6. Une clé de `renvoi.values` qui n'est pas une prop `boolean` ou `instance-swap` de l'API de la pièce, ou une telle prop sans clé, exposée ou non. Un `INSTANCE_SWAP` que l'export ne peut pas nommer reste absent si une perte vise ce renvoi et rend la couverture partielle (§2.11). Cette exception ne vaut pas pour un booléen manquant.
7. Une `source` dont le chemin ne cible ni `piece` ni `composes`, dont la clé publique manque, ou dont le type et les valeurs diffèrent. Pour `composes`, `component` doit égaler le contrat ciblé ; pour `piece`, il est interdit. Chaque source est relative à son propriétaire. Une boucle de sources est refusée. La vérification d’une dépendance non disponible reste incomplète.
8. Une clé de `pieces` différente de `codeIdentifier(name)`, égale à celle de l'hôte ou d'une autre entrée.
9. Un cycle dans le graphe des pièces, ou un chemin déplié de plus de 12 niveaux.
10. Une entrée orpheline d'un catalogue, comptée sur tout le contrat, hôte et pièces ensemble.
11. `structure.sizes` présent à la racine ou dans une pièce.
12. Un identifiant d'instance imbriquée dont la chaîne ne prolonge pas celle de son occurrence parente. Un identifiant direct n'encode pas son parent Figma et ne prouve pas à lui seul son appartenance à l'hôte.
13. Une clé répétée dans le texte JSON, avant son décodage. Après `JSON.parse`, le premier membre a déjà disparu et la validation de l'objet ne peut plus constater le doublon.
14. Un renvoi dont un écart vers une variante atteignable ne se prouve pas depuis le contrat, sans perte de transfert : identité absente de V′, frères de même nom sur le chemin, valeurs publiées différentes entre V et V′, écart sans preuve ou instance exposée qui diffère. Le contrat ne porte pas les couleurs d'aperçu, donc ce contrôle voit une condition nécessaire, pas la preuve entière du moteur.
15. Une perte regroupée sans `slotPath`, ou dont le nombre de variantes diffère du nombre de variantes du propriétaire dont la vue contient `slotPath`.
16. Deux props d'un même propriétaire de même `source`.

Le contrat seul ne dit pas qu'un mode est forcé, qu'un `SLOT` de pièce est rempli, qu'une instance est exposée ou qu'une perte de maître a été constatée. Les tests du moteur gardent donc ces constats du dessin à côté du contrat. Ils refusent un mode efficace sans perte, une perte de mode sans variable liée de sa collection, un `SLOT` rempli sans perte, une prop d'instance exposée absente de l'API, un échange vers une pièce sans perte et une perte de maître ni publiée seule ni couverte par sa classe.

### 2.14 Données de rendu et limites de projection

Chaque propriété de l’API Plugin de Figma qui change le dessin ou son comportement doit avoir un champ portable ou une perte qui la nomme. Cette règle vaut aussi dans les pièces non posées, les contenus de slots, les plages de texte et les sous-champs des peintures et effets. Un champ qui ne conserve qu’une partie d’un objet ne couvre pas les autres parties. Une lecture impossible produit une perte de lecture, jamais une valeur neutre inventée. Une propriété ou un type de nœud ajouté à l’API doit être classé avant que le moteur annonce une couverture complète.

Les propriétés d’éditeur, comme le verrouillage et le repli des calques, ne changent pas le contrat visuel. Les identifiants, noms et descriptions servent la traçabilité. Les animations et interactions de prototype appartiennent au code applicatif ; si le dessin en contient, le contrat signale leur absence de projection.

| Donnée | Champ déjà disponible | Ce que la 15.0 exige du moteur |
|---|---|---|
| largeur uniforme ou par côté d’un contour | `StrokeTokens.width`, référence ou côtés tokenisés | publier chaque côté lié ; une valeur non tokenisée manquante reçoit une perte nommant `strokeWeight` ou le côté concerné ; ne pas inventer une largeur de 1 px |
| couleur d’une ombre | `effectStyles.*.effects[].color` | publier la référence liée ; une couleur absente reçoit une perte au chemin de cette couleur dans `effectStyles`, une fois par style, que la variante qui l’emploie soit posée ou non |
| proportions d’une contrainte `scale` | `constraints` et `inset` ne suffisent pas aux proportions | déclarer la perte des proportions ; ne pas présenter les seuls offsets en pixels comme une reconstruction exacte |
| variables liées et styles | feuilles, `textStyles`, `effectStyles`, catalogues de vues | conserver les références ; une partie du style non représentée reçoit une perte nommant son champ API |
| modes de variables forcés par calque | aucun champ de mode par calque | déclarer la perte de `explicitVariableModes` quand une variable liée sous le calque, dans une variante que l’occurrence peut montrer, appartient à la collection forcée ; la référence de token seule ne dit pas ce forçage ; un mode sans variable liée de sa collection ne change aucun rendu et ne reçoit aucune perte |
| masque, écrêtage, fusion et ordre de peinture particulier | aucun champ général | nommer `isMask`, `maskType`, `clipsContent`, `blendMode`, `itemReverseZIndex` ou `strokesIncludedInLayout` quand leur effet n’est pas conservé |
| peinture non unie, image, vidéo, motif, peintures superposées | aucune représentation générale de ces peintures | nommer le type et les sous-champs perdus, comme `gradientStops`, `imageTransform` ou `blendMode` ; une couleur unie restante ne couvre pas toute la pile |
| géométrie vectorielle ou booléenne et contours particuliers | icône nommée si une règle la désigne | nommer les tracés, réseaux, arcs, opération booléenne, lissage, pointes, tirets, jonctions et largeur variable non représentés ; aucun tracé propriétaire ne se publie |
| typographie par plage | `viewTypographies` et `textStyles` pour les parties représentées | relever les plages ; nommer les espacements de paragraphes, listes, liens, décorations, césures et options de police qui n’ont pas de champ |
| grilles de mise en page et modes de dimensionnement | pistes, gaps, ancrages, spans, alignements, `size` et `bounds` | nommer les pistes automatiques, proportions ou règles de placement non représentées ; `layoutGrids` ne devient jamais une piste de layout, et une contrainte d’enfant relative à ses colonnes reçoit une perte nommant `layoutGrids` |
| transformation 2D autre qu’une rotation, instance agrandie ou réduite | `rotation`, `inset` | nommer `relativeTransform` pour un miroir ou un cisaillement ; nommer `scaleFactor` différent de 1 sur une instance, car les tokens de la vue citée ne valent plus la taille rendue |
| effet sans représentation | `effectStyles` pour les ombres et les flous représentés | nommer le type et les sous-champs perdus d’un bruit, d’une texture ou d’un flou progressif (`NoiseEffect`, `TextureEffect`, `blurType`) |
| transformations 3D, scènes, animations et réactions | aucun champ général | déclarer les pertes de `transform3d`, `scene3d`, `animations`, `manualKeyframeTracks`, `timelines`, `reactions` et `numberOfFixedChildren` présentes |
| texte sur un tracé (`TextPathNode`, type `TEXT_PATH`) | aucun champ : une vue place un texte dans une boîte | déclarer la perte du calque en nommant `TEXT_PATH`, `vectorPaths` et `textPathStartData` ; le style de texte et les variables liées gardent leur règle, et le contenu reste indicatif sous `samples` |
| groupe de transformation (`TransformGroupNode`, type `TRANSFORM_GROUP`) | les enfants se décrivent comme ceux d’un groupe | nommer `transformModifiers`, répétition linéaire ou radiale, et `transform3d` présents ; aucune copie répétée ne se publie |

Les 99 largeurs de contour, 18 usages d’ombre sans couleur et 2 formes de contrainte relevés par la reconstruction sont des limites du moteur et des données 14.0 rejouées. Les deux premiers champs existent déjà. La 15.0 exige leur publication quand la liaison existe, ou la perte ciblée de la valeur non publiée. Elle n’introduit pas de valeurs brutes dans les champs réservés aux tokens. Les proportions de `scale` restent une perte déclarée. Ces 119 manques ne deviennent pas des données retrouvées par le seul changement de version. Sur Groupe, le recalcul constate 90 pertes de largeur, une par variante de `.Segment`, et les publie en une perte regroupée (§2.11). Les 9 occurrences gardent la largeur de leur variante et n’en reçoivent aucune. L’ombre sans couleur donne une seule perte, sur son style. La capture de Button force 94 modes sur deux collections, et aucune variable liée sous ces calques n’appartient à l’une d’elles : aucun mode ne reçoit de perte. La capture de Groupe ne force aucun mode.

## 3. Exemples

Les deux exemples sont réduits, et chaque renvoi y résout. Les valeurs viennent des contrats 14.0 rejoués dans `_local/p22/scripts/`. Les noms de Groupe et de ses tokens sont inventés, à la forme de la capture.

### 3.1 Button

Réductions : deux couleurs et deux états, deux variants de Button sur 90, l'icône de gauche seule, `meta`, `rendering.roles` et `textStyles` abrégés. `meta.diagnostics` garde une des 3 pertes de `.Ring`, dont la racine n'a pas d'auto layout. Les icônes y sont des instances d'`Icon`, l'état que l'essai 1.2 du plan produira : la capture de Button a des tracés à leur place. Les noms de calques `arrow-left-long` et `Suivant` sont ceux de la capture.

```json
{
  "name": "Button",
  "meta": { "contractVersion": "15.0", "exportedAt": "…", "coverage": { "portable": "partial" },
            "diagnostics": [{ "code": "UCM_PORTABLE_PROJECTION_WARNING", "severity": "warning",
                              "message": "height manque à l'adresse []. …", "contractPath": "pieces.Ring.variants[0]" }],
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
        { "slotPath": ["sizewrapperbutton"], "nodeId": "3:152", "variant": "3:428",
          "values": { "label": true, "iconLeft": true }, "view": "v6",
          "tokens": { "background": "{components.button.color.primary.contained.default.background}",
                      "foreground": "{components.button.color.primary.contained.default.foreground}" } }],
      "sample": "s1" },
    { "nodeId": "34:454", "values": { "color": "primary", "variant": "contained", "state": "focus" }, "view": "v2",
      "pieces": [
        { "slotPath": ["ring"], "nodeId": "1140:1447", "variant": "1140:1426", "view": "v8",
          "strokes": { "ring": { "color": "{components.button.color.primary.contained.focus.ring}",
                                 "width": "{layout.stroke.ring-weight}", "align": "inside" } } },
        { "slotPath": ["sizewrapperbutton"], "nodeId": "34:455", "variant": "3:428",
          "values": { "label": true, "iconLeft": true }, "view": "v6",
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
      "structure": { "view": "st3", "variantAxes": ["size"] },
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
- Le développeur qui rend Button `size=large` prend la vue `v4` de la variante `3:424` (étape 5 du §2.12), et applique les couleurs du renvoi par `pp1`. Le transfert est prouvé : les trois tailles du maître portent les mêmes couleurs initiales aux mêmes calques, donc aucune perte ne vise ces renvois. Les 180 bascules de taille des 90 renvois sont décrites.
- `values` porte la valeur que chaque variant de Button pose sur les booléens exposés de `.sizeWrapperButton`. Ici elle égale le défaut, et elle s'écrit quand même.
- La clé `foreground` du renvoi peint le texte `["label"]` et l'icône dépendance `["icon"]` (D3).
- La perte de `.Ring` garde le chemin `pieces.Ring.variants[0]` et ne porte pas `slotPath`, car une classe demande au moins deux variantes (§2.11).
- La capture force 94 modes de variables, et aucune perte ne les nomme : aucune variable liée sous ces calques n'appartient aux collections forcées (§2.14).

### 3.2 Groupe

Réductions : un variant de Groupe sur 3, trois variantes de `.Segment` sur 90, `meta` et `rendering.roles` abrégés. Les calques `Cadre`, `BordGauche`, `BordDroit`, `Milieu` et `Texte`, la prop `avecMilieu` et les tokens `components.groupe.*` sont inventés. Les valeurs des booléens de chaque occurrence sont celles de la capture.

```json
{
  "name": "Groupe",
  "meta": { "contractVersion": "15.0", "coverage": { "portable": "partial" },
            "diagnostics": [{ "code": "UCM_PORTABLE_PROJECTION_WARNING", "severity": "warning",
                              "message": "strokeWeight manque à l'adresse [\"cadre\"]. … Dans 90 variantes.",
                              "contractPath": "pieces.Segment.variants", "slotPath": ["cadre"],
                              "figma": { "property": "strokeWeight" } }], "…": "…" },
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
- Le contour de `Cadre` n’a pas de `width`, parce que ses épaisseurs par côté n’ont pas de variable. `meta.diagnostics` le dit par une seule perte regroupée, que le lecteur rapporte aux variantes dont la vue contient `["cadre"]` (§2.11). Chaque variante porte ses propres contours, et le faux conflit de F44 disparaît.
- Groupe n'expose pas `.Segment`. Les états de la pièce donnent 36 bascules sur les 9 renvois, toutes décrites : les renvois égalent leurs variantes et les booléens sont des propriétés de composant (§2.12, étape 5).
- `["cadre", "icon"]` place la couleur du glyphe d'`Icon`, que la 14.0 perdait (F19). L'échantillon montre `color: "neutral"` sur `Icon`, et la feuille de `.Segment` donne la couleur réelle.
- Aucune capture ne montre une pièce visible posée dans une pièce. La forme du renvoi imbriqué vient de F7 et du §2.4.

## 4. Vérifications

### 4.1 Les failles F1 à F44

« Forme » dit que ce document la résout. « Lot » dit que le plan la résout dans la case citée, sans effet sur la forme. « Limite du moteur » désigne une mesure ou une interface différée, sans champ laissé indéfini.

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
| F10 `args` du renvoi | forme | `values`, §2.4 et étape 7 du §2.12 |
| F11 pièce masquée par une prop | forme | §2.4, un renvoi par slot publié |
| F12 pièce dans un `SLOT` de l'hôte | forme | §2.9 |
| F13 deux définitions du token du composant | lot | 5.4 |
| F14 jugement par emplacement | lot | 5.4, §2.7 |
| F15 cas sans instance | lot | 5.4, §2.7 |
| F16 couleurs d'`Icon` mêlées à celles de la pièce | forme et lot | §2.8 ; lot 5.5 |
| F17 Exporter sans dossier désigné | limite du moteur | §2.7 fixe la publication sans dossier ; l’interface de 5.4b attend P31 |
| F18 style de couleur et token d'un autre composant | lot | 5.4 |
| F19 couleur d'icône par surcharge | forme et lot | §2.8 ; lot 5.5 ; réponse 2 du mainteneur |
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
| F32 « Relier le composant » | limite du moteur | D8, interface différée à P31, sans changement du contrat |
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
| F44 épaisseurs par côté d’un même contour | forme et lot | §2.14 et §3.2 ; largeur publiée ou perte ciblée ; lot 2.3c attend P33 |

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
| confrontation, décision 1 (paire `BXID`) | identité de calque au §2, étapes 5 et 6 du §2.12, §2.13.14 ; à réécrire selon l'étude de la règle des états |
| confrontation, décisions 2 et 8 | clés préfixées au §2.5, A11 compris ; F29 gardé au §2.11 et au §2.13.8 |
| confrontation, décision 3 | renvoi complet, §2.4 inchangé |
| confrontation, décision 4 | valeur posée des props exposées : booléens et échanges dans `renvoi.values`, axes par les coordonnées de `renvoi.variant` ; §2.4, §2.13.6 et étape 7 du §2.12 |
| confrontation, décision 5 | aperçu jugé sur les variantes atteintes, §2.7 |
| confrontation, décisions 6 et 9 | modes efficaces, `TextPathNode` et `TransformGroupNode`, §2.11 et §2.14 |
| confrontation, décision 7 | perte d'exposition, étape 6 du §2.12 |
| confrontation, décision 10 | pertes de maître regroupées, §2.11 et §2.13.15 |
| confrontation, décision 11 | échange exposé vers une pièce, §2.5 et §2.11 |

### 4.3 Contradictions entre documents

| # | Contradiction | Correction proposée |
|---|---|---|
| 1 | La case 4.1 du plan garde « wrapper élu selon 0.6 », le test « un wrapper à axe de tailles posé une fois par variant reste wrapper » et la fin « `wrapper-de-dimensions` pour `.sizeWrapperButton` seul ». E retire la sorte. | Écrire l'ordre « dépendance sans préfixe, pièce préfixée, détail », retirer ce test et cette fin, comme le §4 de l'étude de D1 le demande. |
| 2 | L'étude du format (Q1 option A, §4 « une pièce peut avoir son wrapper », §8 « place le wrapper selon la question 9 ») garde le wrapper. | Marquer Q1 et ces deux phrases comme remplacées par E. |
| 3 | L'étude du format, §5 et son exemple, publie `args` dans le renvoi et omet `view`, `tokens` et `strokes` quand l'instance égale sa variante. | Remplacée par D4 et F10 : `values`, renvoi complet. L'exemple du §3 la remplace. |
| 4 | DECISIONS-P22.md, §2 à §4, recommande l'exposition comme critère et définit « Wrapper » ; son §5 retient E. | Ajouter en tête du §4 de D1 que l'option E l'a remplacée, et retirer « Wrapper » du vocabulaire. |
| 5 | RECHERCHE-PIECES-INTERNES.md §7 et `_local/p22/LISEZMOI.md` écrivent que la couleur d'`Icon` dans `.Segment` vient de son axe `Color`. F19 et la mesure disent l'inverse : le glyphe porte le token du texte voisin dans les 90 variantes. | Corriger la phrase du §7 de la recherche ; le fichier local suit. |
| 6 | La recherche §7, DECISIONS (D1, « 0 sur 15 »), l'étude de D1 et F15 comptent 15 instances de `.Segment` montrant 10 variantes. Les 3 variants de Groupe en posent 9, qui montrent 9 variantes ; F23 compte bien 9. | Écrire 9 instances et 9 variantes dans les variants de Groupe. Les 6 instances de plus ne vivent pas dans ses variants. |
| 7 | L'étude de D1 estime le contrat de Button à +8 à +11 ko. La simulation indépendante donne −721 octets UTF-8, avec `sizes` retiré et les pertes recalculées. L'estimation n'a pas compté le départ des 270 liaisons de l'hôte vers les 3 variantes de la pièce. | Remplacer le chiffre de l'étude par celui du §5.1. |
| 8 | E3 comparait les vues sans traiter séparément les placements de peinture et les états internes non exposés. | Appliquer la vérification de transfert du §2.12, avec une perte quand sa fidélité n’est pas prouvée. Une différence de placements seule ne constitue pas une perte. |
| 9 | F23 et la case 4.2 traitent « l'axe propagé d'un wrapper ». Sans wrapper, une pièce non exposée ne collisionne plus, et une clé exposée égale à une clé de l'hôte est une vraie collision, puisque Figma montre deux propriétés. | Retirer la case 4.2. Une clé exposée prise par l'hôte ou par une instance précédente reçoit le préfixe de son slot (§2.5), sans diagnostic de collision. |
| 10 | D2 écrit « l'Exporter avertit » pour le cas 3. Le critère de P33 veut qu'aucun contrôle du composant ne vive à la fois dans l'Exporter et dans Architect, et la case 8.2 porte ce constat dans Architect. | Architect seul, réponse 3 du mainteneur. |
| 11 | D3 écrit que le contrat d'`Icon` dit que sa couleur vient de l'hôte. L'Exporter qui exporte `Icon` ne lit pas ses hôtes (`loiDuDocumentIntact.test.ts` refuse `loadAllPagesAsync`). | Aucun champ dans Icon, réponse 2 du mainteneur. |
| 12 | L'audit annonce 43 failles. F44 s'est ajoutée ensuite. | Écrire 44 failles, dont 26 importantes. |
| 13 | La case 5.2 cite `portee-du-contrat.md` « si 0.8 retient B ». 0.8 a retenu A. | Retirer la condition. |
| 14 | FORMAT.md §1, §3, §6 (« un wrapper de dimensions sauté »), §9 (« l'unique occurrence exposée qui appartient au wrapper élu ») et `types.ts` (`ContractStructure.rotation`, `ContractReferenceStructure`, `SampleInstance`) décrivent le wrapper élu. | Réécrire ces passages avec la 15.0 (§6.2). |
| 15 | STRESS-TEST-CONTRAT-15.md, table des relais, écrit que la seconde de deux instances exposées à la même clé « se lit comme non exposée, avec une perte ». L'étude de D1 (E2) garde le diagnostic de collision pour une clé prise par l'hôte. | Remplacés par les décisions 2 et 8 de la confrontation : la seconde reçoit le préfixe de son slot (§2.5). |
| 16 | DECISIONS-P22.md, D2 cas 2, juge un emplacement d'aperçu quand il est « remplacé par chaque instance posée qui le montre ». | Remplacé par la décision 5 de la confrontation : chaque occurrence qui peut montrer la variante, par citation, par état ou par axe exposé (§2.7). |

## 5. Optimisation

### 5.1 Mesures

Les tailles sont celles de `Buffer.byteLength(JSON.stringify(contrat), "utf8")`. Compter `JSON.stringify(contrat).length` mesure des unités UTF-16, ce qui donnait 49 608 pour Button 14.0 et 13 099 pour Groupe 14.0. Les caractères accentués expliquent l'écart avec les octets.

Le constructeur indépendant `_local/p22/codex/constructeur15.cjs` part des contrats 14.0 rejoués et prend les identifiants d'instance dans les captures. Il retire `sizes`, garde les dimensions dans chaque vue et corrige F22. La simulation garde un détail intérieur de `.Segment` aplati. `_local/p22/codex/meta-relais.cjs` recalcule ensuite les pertes de l'hôte, de chaque variante de pièce et de chaque occurrence selon le §2.11, et les confronte aux pertes des contrats 14.0 autonomes des pièces. Le recalcul ne compte que les pertes, sans les notes d'export. Ces mesures chiffrent les données 14.0 transformées. `_local/p22/confrontation/mesures-integrees.cjs` récrit ensuite ces simulations dans la forme finale : valeurs posées des props exposées, pertes regroupées, pertes de mode et de transfert selon les règles finales. `postes-finales.cjs`, dans le même dossier, mesure les postes des deux tables suivantes. Groupe se mesure sur la simulation aux noms de la capture, dont seuls les chiffres sortent du dossier local. Sa copie aux noms inventés pèse 78 189 octets. Le moteur 15.0 devra refaire ces mesures.

| Contrat | 14.0 | 15.0 | Écart |
|---|---|---|---|
| Button | 49 663 | 54 072 | +4 409, soit +8,9 % |
| Groupe | 13 205 | 83 258 | +70 053, soit ×6,3 |
| Groupe et `.Segment`, chacun avec ses métadonnées | 89 375 | 83 258 | −6 117, soit −6,8 % |
| Groupe et `.Segment`, sans métadonnées | 80 927 | 75 902 | −5 025 |

Groupe grandit parce qu'il décrit les 90 variantes de `.Segment`. Le moteur constate 475 pertes, dont la largeur du contour de `Cadre` 90 fois. Publiées une par variante, elles pesaient 109 966 octets. Regroupées selon le §2.11, elles tiennent en 21 classes et une perte de catalogue, soit 7 099 octets. Pour chacune des 21 classes, les variantes touchées sont exactement celles dont la vue contient l'adresse, donc aucune perte ne reste publiée seule. Le contrat 14.0 autonome de la pièce disait ses manques en 16 constats, sans les contraintes `scale` que la 15.0 ajoute. Button porte 3 pertes, toutes sur la variante de `.Ring` : racine sans auto layout, hauteur fixe sans variable, gap et padding non transmis. Par rapport à la passe finale (48 942 octets), Button grandit de 5 130 octets, parce que chacun de ses 90 renvois de `.sizeWrapperButton` porte les valeurs posées de `label`, `iconLeft` et `iconRight` (§2.4). Button n'expose qu'une instance, donc aucune clé préfixée. Ses 94 modes forcés n'agissent sur aucune variable liée, donc aucune perte de mode.

Un poste se mesure par la somme des renvois sérialisés, ou par suppression d'un champ dans chaque renvoi, virgule comprise.

| Poste de Button 15.0 | Octets |
|---|---|
| contrat entier | 54 072 |
| `meta`, avec les 3 pertes | 889 |
| entrée de `.sizeWrapperButton` | 1 626 |
| entrée de `.Ring` | 334 |
| 108 renvois (90 de la pièce, 18 de `.Ring`) | 30 865 |
| dont les valeurs posées des booléens exposés, par suppression | 5 130 |
| variants de Button sans leurs renvois | 10 238 |
| coût des `nodeId` des renvois, par suppression | 2 101 |
| liaisons natives de la 14.0 que les renvois remplacent | 12 009 |

| Poste de Groupe 15.0 | Octets |
|---|---|
| contrat entier | 83 258 |
| `meta`, avec 21 classes et une perte de catalogue | 7 348 |
| entrée de `.Segment` (90 variantes) | 51 405 |
| 9 renvois | 3 933 |
| dont les feuilles recopiées par D4, par suppression | 2 523 |
| dont les valeurs posées des booléens, par suppression | 591 |

Les 90 renvois de `.sizeWrapperButton` donnent 180 bascules de taille, toutes décrites. Les 9 renvois de Groupe donnent 36 bascules d'état, toutes décrites. Un témoin qui change la couleur initiale de la variante `large` du maître perd 90 bascules, et la preuve les voit. Les 270 liaisons de Button deviennent 9 liaisons dans la pièce. Groupe décrit les 81 variantes de `.Segment` qu'il ne pose pas. Le temps d'analyse reste à mesurer dans le moteur, selon la case 1.5.

La simulation précédente de Button pèse 49 305 octets UTF-8. Le retrait de `sizes` la ramène à 48 180. Avant le recalcul des pertes, le constructeur indépendant ajoutait 95 octets à décision identique, soit 0,2 %. Les vues dépliées des 90 variantes sont identiques. Pour Groupe, l'écart entre les simulations vaut −434 octets, dont −477 dans les structures après correction de F22, +36 dans les variants et +7 dans l'entrée de la pièce.

### 5.2 Factorisations retenues

| Factorisation | Effet mesuré | Raison |
|---|---|---|
| Retrait de `structure.sizes` | −1 125 octets dans la simulation précédente de Button | réponse 1 du mainteneur ; chaque vue porte ses dimensions |
| Pertes de maître regroupées par propriétaire, adresse et propriété | −102 867 octets sur Groupe (475 pertes en 22 entrées) | décision 10 de la confrontation ; la liste des variantes se retrouve par l'adresse |
| Un seul jeu de catalogues pour l'hôte et ses pièces | −3 % contre des catalogues par entrée (étude R6, §3) | une vue de pièce se résout par le même chemin qu'une vue de l'hôte |
| Liaisons des props exposées dans les variantes de la pièce, et `nodeId` dans le renvoi | −9 908 octets sur Button | 3 variantes portent la liaison une fois ; l'identifiant exact se recompose sans perte |
| Couleurs de l'hôte dans le renvoi plutôt que dans `variants[].tokens` | neutre | une adresse de l'hôte s'arrête au slot `piece` ; les clés relèvent de l'entrée |
| Couleurs d'aperçu non publiées | −12 couleurs sur `.sizeWrapperButton`, −1 contour sur `.Ring` | D2 ; elles n'ont jamais été une décision de design |
| Échantillon d'occurrence en écarts | −117 octets sur Button | règle déjà écrite pour une dépendance, dans le seul champ non normatif |
| `rendering.roles` à la racine seule, `keyRoles` par entrée | −355 octets par pièce | le vocabulaire des rôles est générique |

### 5.3 Factorisations écartées

| Factorisation | Gain mesuré | Raison du refus |
|---|---|---|
| `view` absente quand elle égale la vue de la variante citée | 0 octet sur Button (0 renvoi sur 108 concerné) | deux sens pour une absence (F6, D4), sans gain sur le cas de référence |
| Renvoi limité aux couleurs que l'hôte change | −2 523 octets sur Groupe (3,0 %) | fusion implicite refusée par D4 et par l'invariant « Ni merge, ni héritage, ni défaut » |
| Valeur posée d'une prop exposée omise quand elle égale le défaut de l'hôte | −5 130 octets sur Button (270 valeurs sur 270) | deux sens pour une absence ; le défaut ne dit pas la valeur d'un variant (E07) |
| `source.prop` omis quand il égale la clé de l'hôte | −111 octets sur Button | moins de 0,3 % ; une clé renommée ouvrirait un second chemin de lecture |
| Prop exposée réduite à `source`, type et valeurs lus dans l'entrée | −275 octets sur Button | chaque lecteur de `props` (parité, génération des types, validation, guide) devrait résoudre la pièce |
| Septième catalogue de vue pour les renvois | +920 octets (étude R6, §5) | deux variants de l'hôte cesseraient de partager une vue |
| Catalogue de renvois partagés | aucun : `nodeId` est unique par occurrence | aucune entrée ne se répète |
| Renvoi sans `nodeId` | −2 101 octets sur Button | perd les 270 identifiants exacts que la 14.0 publie |
| Pièce décrite en arbre sous chaque instance | +53 % (étude R6, §7) | une pièce décrite deux fois finit par se contredire (Choix 3) |

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
| `variants[].bindings` vers des calques de la pièce | `pieces.<P>.variants[].bindings` ; identifiant exact par la jointure du §2.4, suffixe de définition compris |
| `variants[].bindings` d'une prop de l'hôte sur un calque de la pièce | inchangés |
| `variants[].tokens` et `strokes` posés sur la pièce | `renvoi.tokens` et `renvoi.strokes`, avec le jeton, le chemin et le rôle |
| `variants[].tokens` posés sur les calques de l'hôte | inchangés |
| `structure.view` | projection de l'hôte, qui s'arrête au slot `piece` |
| `structure.sizes` lu sur le wrapper | retiré ; dimensions dans la vue exacte de chaque variante |
| `structure.variantAxes`, `stateModel`, `intent`, `textStyles`, `effectStyles` | inchangés |
| `rendering.keyRoles` d'une clé de la pièce | `pieces.<P>.rendering.keyRoles` |
| `icons` sur des calques de la pièce exposée | `pieces.<P>.icons`, `slot` relatif ; prop synthétique sur l'hôte avec `source` |
| `samples[].args` | inchangé ; une prop exposée reste une prop de l'hôte |
| valeur posée d'une prop exposée, lue dans `samples[].args` | `renvoi.values` pour un booléen ou un échange, coordonnées de `renvoi.variant` pour un axe |
| `samples[].text` dans la pièce | échantillon de la variante de la pièce, et écart de l'occurrence dans `samples[].pieces` |
| `samples[].composes` dans la pièce | échantillon de la variante de la pièce, et écart dans `samples[].pieces[].composes` |
| `meta` | inchangé, plus les pertes du §2.11 |

Ce que la 14.0 ne publiait pas et que la 15.0 ajoute : les variantes non posées, les props et liaisons de la pièce, ses règles, les valeurs normatives de chaque occurrence, la couleur qu'un composant pose sur une icône dépendance, et l'identifiant de chaque instance posée. La 15.0 ne perd que ce que la 14.0 inventait. Les props de `.Segment` quittent l'API de Groupe, parce que Figma ne les montre pas sur Groupe, et une instance non exposée cesse de publier ses props sur l'hôte (L4).

## 6. Effets

### 6.1 Lecteurs du contrat

| Lecteur | Chemin | Effet |
|---|---|---|
| Résolution des vues | `packages/kit/src/lecteurs/variant-views.mjs` | `contratDeLaPiece`, sources relatives successives et vers une dépendance, valeur posée des props exposées, sélection unique, états internes, écarts appariés par identité de calque et transfert vérifié, dépliage avec pile et borne (§2.12) ; `compositionsExactesDuVariant` déplie les pièces pour la parité |
| Validation | `packages/kit/src/lecteurs/validation-contrat.mjs` | les refus du §2.13, dont `values` complet, props exposées comprises, transfert jugé par identité de calque et pertes regroupées cohérentes ; sources de dépendances validées par le graphe avec leurs contrats publics ; `sizes` interdit dans chaque entrée ; `keyRoles` par entrée ; `structure` et champs autorisés de chaque entrée |
| Échantillons | `packages/kit/src/lecteurs/validation-echantillons.mjs` | `samples[].pieces`, adressé par le `slotPath` d'un renvoi du même variant |
| Graphe des contrats | `packages/kit/src/lecteurs/validation-graphe-contrats.mjs` | union des `composes` de l'hôte et de ses entrées ; miroir slot et `composes` vérifié par entrée ; cycle de `pieces` refusé |
| Axes de modes transitifs | `packages/kit/src/lecteurs/modes-tokens.mjs` | `axesDuContrat` parcourt aussi les dépendances des pièces pour relever les axes de leurs contrats |
| Contrastes | `packages/kit/src/lecteurs/diagnostic-contrastes.mjs` | rôle d'une clé lu dans l'entrée ; fond cherché au chemin déplié (étape 8 du §2.12) |
| Diagnostics d'export | `packages/cli/src/guide.mjs` (`ligneDeDiagnostic`), `packages/kit/src/lecteurs/avertissements-export.mjs`, `packages/cli/aides/couverture-partielle.md` | une perte regroupée se lit avec son `slotPath` et la liste des variantes que l'adresse désigne (§2.11) ; le guide cite l'adresse à côté de `contractPath` |
| Caractéristiques et aides | `packages/kit/src/lecteurs/caracteristiques.mjs` | table des champs vers les aides pour `ChildStructure.piece`, `PieceEntry.*`, `PieceReference.*`, `PieceSample.*`, `PieceSource.*` et `ContractDiagnostic.slotPath` ; parcourir les entrées et les renvois pour peintures, contours, icônes, états, focus et composition ; aide `dimensions-par-taille` fondée sur les variantes et leurs vues |
| Listes du contrôle du code | `packages/kit/src/lecteurs/controle-du-code-listes.mjs` | les champs nouveaux entrent dans la table L3 (valeur en clair ou hors famille) |
| Parité | `packages/kit/src/lecteurs/diagnostic-parite.mjs`, `packages/adapter-typescript/src/parite.mjs` | dépendances comptées par occurrence, pièces dépliées, maximum entre variantes ; `<Pièce>Props` comparée si déclarée, « pièce non comparée » sinon |
| Génération des types | `packages/adapter-typescript/src/generation.mjs`, `types-variants.mjs` | unions des enums de chaque entrée, nommées par l'identifiant de la pièce (`SegmentPosition`) ; une clé préfixée (`segment2Selected`) donne son propre membre de `<Hôte>Props` |
| Icônes | `packages/cli/src/icons.mjs` | `figmaName` lu aussi dans `pieces.*.icons` |
| Guide | `packages/cli/src/guide.mjs`, `packages/cli/procedure.md` | l'ordre de lecture d'un hôte, puis de ses pièces ; la règle de l'occurrence |
| Aides de la CLI | `packages/cli/aides/` | `composition.md` (pièce, dépendance, occurrence), `comptage-dependances.md`, `dimensions-par-taille.md` (variantes et vues exactes), `echantillon.md` (écarts d'occurrence), `liaison-native.md` (identifiant recomposé), `icone-composant.md` (icône dépendance), `peinture.md` (couleur posée sur une dépendance), `composant.md` (source et absence), `contour-ring.md`, `contour-border.md` et `icone.md` (entrée et renvoi), `dimensions.md`, `opacite.md`, `rotation.md` (priorité de la boîte), `etats.md` et `focus-clavier.md` (états de la pièce) |
| Prise des modules | `packages/kit/src/modules/` | rien : `vueExacteDuVariant` garde son contrat ; la résolution d'occurrence entre dans la prise quand un module l'importe |
| Skills | `.agents/skills/consommer-contrat/SKILL.md`, relais `ucm-implementer` écrit par `packages/cli/src/fichiers-du-consommateur.mjs` | rien : les deux renvoient au guide, qui porte la procédure |
| Moteur | `packages/plugin-socle/src/composant/` | lots 4.1, 5.1 à 5.8 du plan ; relève les constats du dessin (modes forcés efficaces, `SLOT` remplis, instances exposées, échanges vers une pièce, pertes de maître), que ses tests comparent aux pertes publiées (§2.13) |

### 6.2 Ce que reçoivent les documents et le kit

- `packages/kit/src/format/types.ts` reçoit les types ci-dessous, puis `npm run schema` régénère `packages/kit/schema/ucm-contract.schema.json`. Le JSDoc de chaque champ porte la phrase « Absence » des tables du §2, puisque le schéma en tire ses descriptions. Les commentaires qui citent le wrapper élu (`ContractStructure.rotation`, `ContractReferenceStructure`, `SampleInstance`) changent.
- `packages/kit/src/format/version.ts` passe à `15.0`, et `version-contrat.mjs` lit 14.0 et 15.0.
- FORMAT.md reçoit une section « Pièces internes » (§2.2 à §2.4 et §2.12 de ce document), réécrit §1 (props exposées, `source`, clés préfixées et valeurs posées), §2 (D2, D3, clés par entrée), §3 (sans wrapper ni `sizes`, dimensions par vue), §6 (slot `piece`, table du §2.3), §7 (`@icons` d'une pièce exposée et d'une dépendance), §9 (`samples[].pieces`, `args` sans wrapper), « Composition et dépendances » (trois sortes, `composes` par entrée), « Métadonnées » (pertes du §2.11 avec `contractPath`, données manquantes du §2.14) et remplace l'exemple de Button par celui du §3.1.
- `ContractDiagnostic` reçoit `slotPath?: string[]`, présent seulement sur une perte regroupée (§2.11). FORMAT.md, section « Métadonnées », écrit le regroupement et la manière de retrouver la liste des variantes.
- COMPATIBILITE.md reçoit l'ordre de sortie d'une majeure du contrat (F38) : paquets ensemble, kit d'abord, puis le code du consommateur, puis le plugin, puis le réexport.

```ts
export type ContractReferenceStructure = { view: string; variantAxes?: string[] };

/** Prop de l'hôte venue d'une instance exposée. */
export type PieceSource = { slotPath: string[]; prop: string; component?: string };
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
export type ContractDiagnostic = { /* … champs 14.0 … */ slotPath?: string[] };
```

### 6.3 L'entrée de CHANGELOG-FORMAT.md

La 15.0 relève de trois classes (F38).

- Classe 2 : `pieces`, le slot `piece`, les renvois, les clés préfixées d'une seconde instance exposée et `slotPath` d'une perte regroupée. Un lecteur 14.0 qui les ignore rend le slot d'une pièce vide.
- Classe 3 : le slot de `.sizeWrapperButton` passe de `label` à `sizewrapperbutton` ; `structure.sizes`, `icons`, `variants[].tokens` et `variants[].bindings` quittent la racine de Button ; Groupe perd `disabled`, `selected`, `position`, `bordGauche`, `bordDroit` et `iconLeft`, et son `composes`. Button garde toutes ses clés de props.
- Classe 4 : `composes` absent à la racine ne dit plus « aucune dépendance » pour un hôte à pièces ; `structure.sizes` disparaît du format ; un `contractPath` égal à `variants` ou à `pieces.<P>.variants` vise toutes les variantes dont la vue contient le `slotPath` de la perte. Les dimensions se lisent dans les vues exactes, résolues dans la pièce quand `source` y mène.

La fenêtre de lecture porte la 14.0 et la 15.0. Le code de Button et de Groupe s'adapte à la recette (case 11.5).

## 7. Décisions appliquées

| # | Question | Réponse recommandée |
|---|---|---|
| 1 | Retirer `structure.sizes` du contrat ? En 15.0, la vue exacte de chaque variante porte déjà son `gap`, son `padding` et son `radius`, et `sizes` les recopie. | Oui. Le contrat de Button perd 1 125 octets (2,3 %), et la projection sans dimensions disparaît. L'hypothèse de FORMAT.md §3 (« les dimensions ne varient que selon l'axe de tailles ») tombe avec, et les `sizes` vides d'`Icon` aussi. La décision E4 devient sans objet, et l'aide `dimensions-par-taille` lit les vues. |
| 2 | Le contrat d'`Icon` doit-il dire que sa couleur vient de l'hôte (D3) ? L'Exporter qui exporte `Icon` ne lit pas ses hôtes. | Non. Aucun champ dans `Icon`. FORMAT.md écrit la règle : une couleur publiée par un composant au slot d'une dépendance remplace, à cet endroit, celle que le contrat de la dépendance donne à son dessin. |
| 3 | Une couleur de pièce du cas 3 (anomalie) se publie. Qui la signale ? D2 dit l'Exporter, et P33 veut qu'aucun contrôle ne vive dans les deux plugins. | Architect seul (case 8.2), et le contrat n'écrit rien dans `meta.diagnostics` : rien n'y est perdu. |

La [confrontation](./CONFRONTATION-15.md) a ensuite apporté onze décisions, toutes retenues par le mainteneur. Le §4.2 donne la section qui porte chacune, et la section « Intégration » de la confrontation en donne la preuve. Les six points techniques du contrat sont fixés dans les sections qu’ils concernent. Le renvoi porte son identifiant (§2.4). Le slot porte la boîte (§2.3). L’échantillon décrit les écarts indicatifs (§2.10). Les pertes ont un chemin ciblé (§2.11). L’axe à valeur unique reste publié (§2.2). Le transfert suit §2.12.

### Réponses du mainteneur

Le mainteneur retient les trois réponses recommandées. `structure.sizes` sort du contrat, et la décision E4 devient sans objet : chaque vue exacte porte ses dimensions. Le contrat d'`Icon` ne dit rien de l'hôte, et FORMAT.md écrit la règle de remplacement au slot de la dépendance. Une couleur de pièce du cas 3 se signale dans Architect seul, et le contrat n'écrit rien dans `meta.diagnostics`, qui ne porte que les pertes.

Les réponses 1 à 3 du stress test sont intégrées au §2.5 et au §2.12. La décision sur les états conserve la vérification et la perte du §2.12. Le mainteneur a confié ce choix à Codex après présentation du contre-exemple documentaire. La forme ne promet aucune reproduction des transitions Figma que le moteur n’a pas prouvée.

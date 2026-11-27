# Étude de faisabilité de la génération d'un composant

Cette étude répond à la décision « Chemin de la génération » de la [recherche](./RECHERCHE-CONSTRUCTION-DES-COMPOSANTS.md) de la piste P31 : un mode d'un plugin UCM génère un composant neuf dans Figma depuis une description, déjà relié aux variables. Elle ne code rien et ne mesure rien dans Figma. Les exemples sont ceux de Button, `.sizeWrapperButton`, `.Ring`, `Icon`, Groupe et `.Segment`.

## 1. Recommandation

1. La description est un contrat 15.0 partiel, écrit avant Figma, sans la liste des variantes et sans les champs qu'un export calcule. Trois blocs lui manquent, et l'étude les nomme au §2.
2. Le mode vit dans Architect, comme un domaine neuf avec son fichier d'écriture et sa loi d'écriture, parce que le catalogue, l'import des variables de library, la Préparation, la propagation et la relecture par l'analyse y sont déjà.
3. La génération se fait en deux passes séparées par la publication : la Préparation, produite depuis la description, crée les variables dans le fichier des tokens ; la construction dessine le jeu de variants dans le fichier des composants et lie chaque champ à la variable publiée.
4. Une relance ne touche jamais une variante existante. Elle crée les variantes manquantes à la règle « la description écrit ce qui manque, le dessin garde ce qui existe », et toute contradiction devient une question. Une valeur d'axe retirée est signalée, jamais supprimée sans un geste du designer par variante.
5. Aucun lot de code ne commence avant une mesure dans Figma (§8, lot 0), parce que la documentation officielle ne dit ni ce que `combineAsVariants` fait des clés, ni ce que la suppression d'une variante fait à ses instances, et le dépôt n'a jamais créé un composant.

## 2. Forme de la description

### Ce que le contrat 15.0 porte déjà

[FORME-CONTRAT-15.md](../Pièces%20internes/FORME-CONTRAT-15.md) décrit, §2 et §3, un composant entier avec les champs que la génération lit.

| Besoin de la construction | Champ du contrat 15.0 |
|---|---|
| Axes et valeurs, noms Figma | `props` (type `enum`), `figmaVariantLabels` |
| Arbre des calques, ordre des enfants, disposition, gap, marges, rayon | `viewStructures`, `ChildStructure[]` (`slot`, `figmaLayer`, `layout`, `padding`, `gap`, `radius`, `size`, `bounds`) |
| Dimensions par taille | `structure.sizes`, dans l'entrée qui porte l'axe |
| Texte et style de texte | `viewTypographies`, `textStyles.figmaName`, `samples.text` |
| Booléens, échanges d'instance, icônes | `props` (`boolean`, `instance-swap`, `icon`), `visibilityProp`, `icons` |
| Pièces internes et dépendances | `pieces`, slot `piece`, `composes` (`.sizeWrapperButton`, `.Ring`, `Icon`) |
| Props exposées d'une pièce | `source` d'une prop |
| Rôle de chaque couleur | clés de `tokens` et de `strokes` (`background`, `foreground`, `ring`), placées par `paintPlacements` |
| Axe d'états | `stateModel` |

### Ce qui manque pour construire

- La grille des cas. Le contrat énumère les variants (`variants[]`, une vue par variant). Une description de 150 variantes à la main serait illisible et fausse au premier ajout d'une valeur. Il faut un bloc `cas` qui dit, par sélecteur d'axes, ce qui change : `{ "state": "focus" }` ajoute le slot `ring`, `{ "variant": "outlined" }` retire le remplissage et pose un contour. Une fonction unique développe la description en la liste des variants du contrat ; le test de l'étude compare ce développement à l'export du composant généré.
- La table des cibles. Le contrat publie les tokens du composant (`{components.button.color.primary.contained.default.background}`) et jamais ce qu'ils visent dans `theme` ou `layout`, qui vit dans les tokens DTCG. La construction doit écrire ces alias. Un bloc `cibles` donne, par rôle et par case, la variable visée. Il porte le dossier du thème par case Variant par State (15 cases pour le Button, communes aux six couleurs, mesure de la section 6 bis de la recherche) et l'intensité des statuts.
- Le type de calque quand le contrat le tait. Un slot avec `children` est un cadre, un slot avec `composes` ou `piece` est une instance, un slot de texte porte `viewTypographies`. Un cadre sans enfant décrit (un fond, un anneau) n'a pas de type ; le bloc `cas` le déclare (`"kind": "frame"`).

Ce qui manque est donc un bloc de factorisation (`cas`), un bloc de cibles (`cibles`) et un champ de type, et non un format parallèle.

### Ce qui est en trop

Le contrat publie des champs qu'un export calcule et que personne n'écrit à la main. La description les omet, et la construction les produit.

- `meta` et tous les `nodeId`.
- `bindings`, `figmaPropName` et les identifiants `#id` de propriété, que Figma attribue.
- Les catalogues d'indirection (`variantViews`, `viewStructures`), qui dédoublonnent des vues déjà développées. La description garde l'arbre en clair.
- `samples`, `rendering.roles` et `rendering.keyRoles`.
- Les valeurs en dur. Une dimension se retouche seulement par les tokens (décision Q5), donc la description ne porte aucune valeur libre. Le contrat tait déjà une valeur neutre et avertit d'un nombre écrit à la main.

### Comparaison avec le cahier de P30

Le cahier de [PLAN-P30.md](../Recreation%20des%20composants/PLAN-P30.md) (étape 5, K1 à K6 de [CARTE-DU-WORKFLOW.md](../Recreation%20des%20composants/CARTE-DU-WORKFLOW.md)) donne, par composant, la valeur UCM la plus proche de chaque valeur relevée (K1), la forme Figma de chaque prop et de chaque état (K2) et la liste de couverture (K6). K1 et K2 sont les faits que `props`, `cas` et `cibles` portent. Écrire les deux produirait deux sources pour un même fait.

La forme unique est la suivante. La description est la source des décisions de dessin. Le cahier garde ce que la description ne porte pas (la planche du banc, les écarts au code existant, la couverture K6) et cite la description au lieu de répéter ses valeurs. Pour un composant recréé en P30, la ligne « ce qu'il faut dessiner » du cahier (K5) devient un renvoi à la description.

### Où vit chaque fait

| Fait | Source avant Figma | Source après la génération |
|---|---|---|
| Axes, valeurs, structure, props | la description | le jeu de variants dans Figma, puis le contrat exporté |
| Variable du composant et sa cible | `cibles` de la description | la variable dans le fichier des tokens |
| Réponse du designer à une question | la description (elle l'inscrit) | les données partagées d'Architect sur le jeu (Q9) |
| Variante dessinée par le designer | sans objet | le dessin |

La règle de lecture est qu'une relance applique la description à ce qui n'existe pas et ne réécrit jamais ce qui existe. Une variable existante qui diverge de `cibles` reste telle quelle tant que le designer ne répond pas « remplacer », comme `existe-divergente` dans `packages/plugin-architect/src/ecriture/variables.ts`.

### Dépendance et validation

Le contrat 15.0 est décidé et non implémenté (case 3.1 de [PLAN-P22.md](../Pièces%20internes/PLAN-P22.md), types et schéma). La description réutilise ses formes `pieces` et `source`. Elle dépend donc de la case 3.1, ou elle écrit pour l'hôte et la pièce un seul bloc `pieces` provisoire que 3.1 remplace. Le texte échangé suit celui de la Préparation (`format: "ucm-description"`, `version`, jugé dans cet ordre : format, version, champs, voir `packages/plugin-architect/src/preparations.ts`). `validation-contrat.mjs` valide les blocs hérités avec un drapeau « sans Figma ». Toucher aux types du kit demande `npm run schema`, les tests racine et une montée de version (AGENTS.md, Vérification).

## 3. L'API Plugin de Figma

Statut. « Lu » veut dire relu dans la documentation officielle pendant cette étude. « Connu » veut dire que l'API existe mais que sa page n'a pas été relue. « Non documenté » veut dire que la page ne répond pas, et que la case est à mesurer.

| Besoin | API | Statut | Dans le dépôt |
|---|---|---|---|
| Créer un composant | `figma.createComponent()` | connu | jamais en production ; seul motif interdit par `loiDEcriture.test.ts` |
| Créer le jeu | [`figma.combineAsVariants(nodes, parent, index?)`](https://developers.figma.com/docs/plugins/api/properties/figma-combineasvariants/) | lu | interdit à l'Exporter (`loiDuDocumentIntact.test.ts`), jamais utilisé |
| Clé et identifiant gardés par `combineAsVariants` | | non documenté | |
| Nommer les variantes | le nom d'un composant, `Property=Value, Autre=Valeur`, qui fixe les valeurs ; `variantProperties` le lit ([guide des propriétés](https://developers.figma.com/docs/plugins/working-with-component-properties/)) | lu | `noms-de-valeurs.ts` écrit déjà `variant.name` sur les enfants d'un jeu |
| Ajouter une variante à un jeu existant | créer un composant, le nommer, l'ajouter au jeu (même guide) | lu | aucun |
| Ajouter un axe | `componentSet.addComponentProperty("Size", "VARIANT", "Small")`, qui donne `Size=Small` à chaque variante existante | lu | aucun |
| Propriétés booléen, texte, échange d'instance | [`addComponentProperty`](https://developers.figma.com/docs/plugins/api/ComponentNode/), `editComponentProperty`, `deleteComponentProperty` ; `defaultValue` pour `BOOLEAN`, `TEXT`, `INSTANCE_SWAP` ; le nom reçoit un suffixe `#id` ; renommer change l'identifiant | lu | seulement en motifs interdits |
| Brancher un calque à une propriété | `componentPropertyReferences` (`visible`, `characters`, `mainComponent`, `slotContentId`) | lu | lecture seule (`propertyBindingDefinitions`) |
| Exposer une instance imbriquée | `isExposedInstance`, modifiable sur une instance primaire d'un composant ou d'un jeu, hérité ailleurs ([InstanceNode](https://developers.figma.com/docs/plugins/api/InstanceNode/)) | lu | aucun |
| `SLOT` | type de propriété disponible depuis la mise à jour du 2026-06-10, `createSlot()`, `slotSettings` ; `setProperties` ne l'écrit pas | lu | `SLOT` lu par le contrat ; le gabarit de règles du socle écrit dans un slot du maître de règles |
| Instances | `createInstance()`, `setProperties` | lu | `template/ecriture.ts` du socle |
| Instance d'un composant de library | `importComponentByKeyAsync` | connu | interdit à Architect (SPEC, « Lecture et écriture ») |
| Auto layout | `layoutMode`, `itemSpacing`, `padding*`, `layoutSizing*` | connu | lu par le relevé, jamais écrit |
| Lier une variable à un champ | [`setBoundVariable`](https://developers.figma.com/docs/plugins/api/properties/nodes-setboundvariable/) sur `width`, `height`, `itemSpacing`, `counterAxisSpacing`, `padding*`, `cornerRadius` et les quatre rayons, `strokeWeight` et ses quatre côtés, `opacity`, `visible`, bornes de taille ; le type de la variable suit le champ | lu | `liaisons.ts` et `structure.ts` |
| Lier une couleur | `setBoundVariableForPaint(paint, 'color', v)` sur une copie du tableau, puis réaffectation de `fills` ou `strokes` ; `setBoundVariableForEffect` ([guide des variables](https://developers.figma.com/docs/plugins/working-with-variables/)) | lu | `liaisons.ts`, `structure.ts` |
| Lier une plage de texte | `setRangeBoundVariable`, `setRangeFills` | lu | `liaisons.ts` |
| Style de texte | `setTextStyleIdAsync(id)`, qui exige la police chargée ; `loadFontAsync` pour chaque police d'un texte ([TextNode, loadFontAsync](https://developers.figma.com/docs/plugins/api/properties/figma-loadfontasync/)) | lu | `loadFontAsync` dans `template/ecriture.ts` et dans la planche de Palettes ; un style de library demande `importStyleByKeyAsync`, interdit à Architect |
| Variables d'une library | `importVariableByKeyAsync`, `teamLibrary` | lu | `liaisons.ts` (import par clé, une fois par lot), `bibliotheque.ts` ; la permission `teamlibrary` est dans le manifeste |
| Supprimer une variante | `remove()` d'un composant enfant | non documenté pour une variante (la page du jeu dit seulement qu'un jeu vide se supprime lui-même) | `.remove()` de règles dans le socle |
| Effet sur les instances de la suppression ou du renommage d'une variante | | non documenté par l'API |  |

Trois conséquences pèsent sur la conception.

- Le jeu se crée une fois, avec `combineAsVariants`. Toute relance ajoute des composants au jeu existant et ne recombine rien, parce que la page ne dit pas si la combinaison garde les clés des composants et le dépôt ne l'a jamais mesuré.
- La suppression d'une variante n'a pas d'effet documenté sur ses instances. L'aide de Figma dit que les instances d'un composant principal supprimé restent liées à lui et qu'une instance le restaure ([aide, composants](https://help.figma.com/hc/en-us/articles/360038663154-Create-components-to-reuse-in-designs)). [CARTE-DU-WORKFLOW.md](../Recreation%20des%20composants/CARTE-DU-WORKFLOW.md) (F10) et la question Q10 écrivent l'inverse. Les deux textes sont des documents d'aide, aucun ne parle de l'API. La question reste ouverte jusqu'au lot 0.
- Les polices et les styles de texte bornent la génération. `loadFontAsync` refuse une police absente du poste (le socle le contrôle avant d'écrire, `chargerLesPolices`), et un style de texte venu d'une library ne s'applique que par un import que la règle actuelle d'Architect interdit.

## 4. Code réutilisable

| Brique | Ce qu'elle donne | Ce qui manque |
|---|---|---|
| `packages/plugin-architect/src/ecriture/variables.ts` (`creerLesVariables`, `creerUneVariableAliasee`) | création des variables de `components` avec l'alias de chaque mode, état par variable, reprise sans doublon, journal et annulation | la description doit fabriquer la `PreparationRangee`, qui vient aujourd'hui du relevé ; le fichier des tokens n'a pas de relevé de composant |
| `packages/kit/src/controles/preparation.ts` (`preparerLesTokens`) | noms des variables, cibles par dossier, questions | il infère depuis des layers ; la génération connaît le rôle de chaque calque et la table des cibles, donc elle n'infère rien |
| `packages/plugin-architect/src/ecriture/liaisons.ts` | import d'une variable par clé une fois par lot, écriture d'une liaison de nombre, de peinture ou de plage, garde « le fichier déclare UCM » | l'écriture relit un layer existant (`relire`) ; un layer qu'on vient de créer n'a rien à relire, donc la fonction `ecrire` s'extrait, la relecture reste |
| `packages/plugin-architect/src/ecriture/noms-de-valeurs.ts` | renommage d'une valeur d'axe sur tous les enfants du jeu, refuse un nom déjà présent | rien, il sert tel quel à l'itération (§6) |
| `packages/kit/src/controles/propagation.ts` (`nomVise`, `layerHomologue`, `constatDeLaPropagation`) | la substitution du segment d'axe dans le nom d'un token, l'exactitude « un seul candidat au catalogue », l'homologue d'un layer par son chemin | elle part d'un variant lié ; la génération part d'un variant dessiné qui peut être en dur (§5) |
| `packages/kit/src/controles/nommage.ts` (`axeDePropriete`, `segmentEcritPourLaValeur`, `tokensDuComposant`) | rôle d'un axe (palette, style, taille, état), écriture de chaque valeur dans un nom | un composant neuf n'a pas de tokens à lire : la grammaire sert à les écrire |
| `packages/kit/src/referentiel/layers.ts` (`estUneIcone`, `estUnAnneau`, `estUnNomDeSeparateur`, `roleQueLeLayerDesigne`) | ce qu'un nom de calque désigne | la génération nomme ses calques pour que ces fonctions les reconnaissent, ce qui évite les 12 cibles fausses de la mesure 6 bis (anneau lu comme `border`) |
| `packages/plugin-socle/src/composant/template/` (`modele.ts`, `ecriture.ts`) | le modèle : le contrat devient un plan, un fichier seul écrit, les pièges de Figma mesurés (un nœud s'écrit hors de l'arbre puis se range d'un geste, aucun handle de sous-calque gardé, une écriture se relit, police vérifiée avant d'écrire) | Architect interdit d'importer `template/ecriture` (`loiDEcriture.test.ts`) ; on reprend les règles et on écrit un fichier propre à Architect |
| `packages/plugin-architect/tests/figmaDeTest.ts` (`atelierDEcriture`) | un journal ordonné des écritures | ses nœuds sont inertes : `appendChild` est vide, aucune création, aucun arbre. Générer demande un double d'arbre avec état (nœuds créés, parents, noms, liaisons) |
| `_local/generateur-composants/` | un oracle de composants (`Spec` à axes typés `palette`, `style`, `taille`, `etat`, `libre`, carte des liaisons attendues, constats attendus) et des opérateurs de défauts, sur des nœuds de données | il fabrique des faux documents et ne crée aucun nœud ; hors Git, son intégration au dépôt est un lot d'un autre plan |

L'oracle du générateur local sert à la génération dans l'autre sens. Le composant généré est relu par l'analyse d'Architect et doit rendre zéro constat C25 et C29, puis son export doit égaler le développement de la description. Le générateur de doubles ne remplace pas ce test, il fournit la carte des liaisons attendues.

## 5. Compléter depuis les variantes dessinées

La variante à créer est `m`, la source est la variante dessinée `s`. Quatre règles écrites, tirées de `propagation.ts` et du référentiel.

- Choix de la source. La distance compte les axes où `m` et `s` diffèrent, pondérés par le rôle de l'axe : `style` et `taille` d'abord (ils changent l'arbre ou les dimensions), `etat` ensuite, `palette` en dernier (elle ne change que des noms). Une égalité de distance entre deux sources dont les arbres diffèrent devient une question, comme deux layers homonymes dans `constatDeLaPropagation`.
- Ce qui se copie. L'arbre de `s` et ses champs liés. Un champ déjà lié dans `m` n'est jamais réécrit. Un layer qui n'existe que chez `s` donne ce que dit la description, ou rien.
- Le token de chaque champ. Le nom de `s` avec les segments d'axe de `m` (`nomVise`). La liaison est exacte si ce nom a un seul candidat, dans le catalogue ou dans les variables que la Préparation va créer ; sinon c'est une question sans case cochée.
- La cible de la variable créée. Elle est exacte quand une règle écrite la donne ; sinon la description la donne, sinon c'est une question.

| `m` diffère de `s` par | Verdict | Raison |
|---|---|---|
| Color, Primary vers Danger | exact | segment du nom ; l'intensité des statuts (soft ou vivid) est lue une fois dans `cibles` |
| Size | exact | segment de taille, et la table des tailles de `cibles` vise `layout` ; sans elle, une question par mesure |
| State, Default vers Hover ou Pressed | exact si le dossier de `s` porte l'état (`solid`, `surface`) | `page` n'a ni `hover` ni `pressed` dans `VARIABLES_DE_PALETTE` |
| State, vers Disabled | exact | `theme/disabled/background` et `theme/disabled/border` ne dépendent d'aucun axe |
| State, vers Focus | description | aucune règle d'état ; l'anneau vient du rôle `ring` posé par le nom `.Ring` |
| Variant | description | l'arbre change (fond ou contour) |

### Le dossier du thème qui change avec l'état

La mesure 6 bis montre qu'Outlined vise `page` au repos et `solid` au survol et à l'appui, et Text vise `page` au repos et `surface`. `s` = Outlined Default (`page`) ne dit rien de `m` = Outlined Hover, puisque `page` n'a pas d'état. La nouvelle règle est que le dossier se décide par case Variant par State. Trois sources, dans cet ordre.

1. La variante dessinée de la même case, si elle existe. Sa liaison dit la cible. Une peinture en dur donne une cible seulement si une variable du thème vaut exactement cette couleur et une seule (règle de la Préparation, « aucune supposition de mapping »).
2. La table `cibles` de la description, qui porte les 15 cases. C'est le cas courant, et aucune question ne se pose à la construction : elle se pose au moment d'écrire la description, dans l'aperçu.
3. Sinon une question par case, 15 réponses pour le Button, comme à l'étape 3 de la section 7 de la recherche.

Si la source 1 et la source 2 se contredisent (Outlined Hover dessiné sur `surface`, table sur `solid`), la construction garde le dessin, signale l'écart et ne réécrit pas la variable (Q1 de la recherche, deux sources qui se contredisent).

## 6. Itération

La nouvelle construction compare la description à ce que le jeu contient. Une relance ne touche pas une variante existante (décision Q4), donc chaque changement ci-dessous ne s'applique qu'aux variantes créées par la relance. Les écarts sur les variantes existantes se listent.

| La description change | Ce que fait la construction | Instances | Question |
|---|---|---|---|
| une valeur d'axe ajoutée | crée les variantes manquantes (`m`, §5), ajoute leurs variables, un nom `Axe=Valeur` suffit à faire apparaître l'option | intactes (aucun nœud existant touché) | seulement si une cible manque |
| un axe ajouté | `addComponentProperty(nom, 'VARIANT', défaut)` donne la valeur par défaut à toute variante existante, puis crée les variantes des autres valeurs | intactes ; le nombre de variantes se multiplie | oui si l'axe devrait entrer dans le nom des tokens existants, car les noms déjà écrits ne le portent pas |
| une prop (booléen, texte, échange) ajoutée | `addComponentProperty` sur le jeu, puis `componentPropertyReferences` sur le calque de chaque variante | intactes | non |
| une valeur d'axe renommée | `noms-de-valeurs.ts` renomme sur tous les enfants, et les variables suivent par `noms.ts` | à mesurer, car le nom change et le nœud reste | non, si la description porte `renomme: {de, vers}` |
| une valeur ou un axe retiré | liste des variantes orphelines, sans suppression | intactes | Q10 ci-dessous |
| une cible changée dans `cibles` | la variable existante diverge, elle reste telle quelle sauf réponse « remplacer » (la Préparation sait réécrire les alias) | les liaisons gardent la variable | oui, par variable divergente |
| une règle de structure changée (un calque en plus dans une case) | s'applique aux variantes à créer ; les variantes existantes de la case sont listées comme écart | intactes | non |

Déduire un renommage d'un retrait suivi d'un ajout serait une supposition de mapping. La description déclare le renommage (`renomme`), sinon la valeur retirée et la valeur ajoutée sont deux événements.

### Q10 : supprimer ou signaler

Recommandation. La construction signale les variantes dont l'axe ou la valeur a disparu de la description, et ne supprime que sur un geste du designer, variante par variante, case décochée au départ (comme les corrections de couleur décochées, mémoire du mainteneur). Raisons.

- L'effet de `remove()` sur les instances n'est pas documenté et les deux textes de Figma et du dépôt se contredisent (§3). Une suppression en lot sur une hypothèse non mesurée est la seule écriture irréversible de la génération.
- Le dépôt écrit déjà ainsi ce qui se perd. Une fusion de variables ne supprime rien et marque `a-retirer` (`structure.ts`).
- L'aide de Figma dit qu'un composant supprimé se restaure depuis une instance, ce qui limite la casse, sans l'avoir vérifié par l'API.

## 7. Le plugin hôte

| Critère | Mode d'Architect | Un autre plugin |
|---|---|---|
| Catalogue, import des variables, Préparation, propagation, analyse de relecture | déjà là, dans le même sandbox | à dupliquer ou à déplacer dans le socle |
| Deux fichiers (variables dans l'un, composants dans l'autre) | déjà géré : le mode Tokens crée, le mode Composant lie | à refaire |
| Promesse du plugin | change : Architect lit et corrige après confirmation, il ne crée pas de nœud | intacte pour Architect |
| Loi d'écriture | `loiDEcriture.test.ts` et l'invariant de l'explorateur changent ; un fichier `src/ecriture/construction.ts` passe le balayage (le dossier `ecriture/` en est exclu) mais exige sa propre loi, calquée sur `loiDEcritureDesNoms.test.ts` | nouvelle loi dans un nouveau paquet |
| Coût de paquet | un domaine (`src/construction/`, `src/messages/`, `src/sandbox/`, `src/ui/`) | un paquet : manifeste, build, galerie, `domiciles.json`, guide, carte, publication |
| Mode agnostique (décision Q6 et Q8) | possible : la description cite des variables existantes par leur chemin, la construction dessine et lie, et ne crée aucune variable | idem, mais sans le reste |
| Exporter | exclu : sa loi du document intact interdit `createInstance`, `combineAsVariants`, `appendChild` | |
| Palettes | exclu : il écrit déjà des nœuds (la planche) mais sur son propre périmètre, qui n'écrit que les primitives de palettes | |

Recommandation : un mode d'Architect, dans un domaine neuf. La promesse change, et elle change par décision écrite : le tableau « Lecture et écriture » de `packages/plugin-architect/SPEC.md` gagne une ligne (création du jeu de variants, geste Construire, annulation Ctrl+Z du lot). L'agnostique le permet sans création de variable, ce qui est déjà la décision Q8.

Le mode en full UCM exige un fichier des tokens déclaré UCM et la collection `components`. L'import d'un composant de library (`importComponentByKeyAsync`) et d'un style de texte de library (`importStyleByKeyAsync`) sont interdits à Architect aujourd'hui. La première version se limite aux composants et aux styles locaux du fichier, et refuse le reste en le disant. Pour le Button, `.sizeWrapperButton`, `.Ring` et `Icon` doivent donc se trouver dans le fichier des composants.

## 8. Coût et limites

Aucune mesure de temps d'écriture n'existe dans le dépôt. Les chiffres ci-dessous sont des produits de nombres mesurés ailleurs, marqués « estimation ».

- Nombre de variantes. La library actuelle compte 150 variantes pour le Button ([CARTE-DU-WORKFLOW.md](../Recreation%20des%20composants/CARTE-DU-WORKFLOW.md), F11) ; la capture de la section 6 de la recherche en a 90 ; la galerie d'Architect en a 216 (`packages/plugin-architect/CARTE.md`). Figma affiche un avertissement au-delà de 1 000 variantes dans un jeu et le dit coûteux en mémoire, sans plafond dur documenté (forum Figma, [fil sur les grands jeux](https://forum.figma.com/t/optimize-performance-in-large-variant-sets/67057)). 150 reste très en dessous.
- Écritures. La capture de 90 variants porte 764 liaisons de couleur, 6 d'effet et 837 de marge, d'espacement et de rayon, soit environ 18 liaisons par variant. Estimation pour 150 variantes, à densité égale : environ 2 700 liaisons, plus environ 330 nœuds (un composant, une instance de `.sizeWrapperButton`, parfois un `.Ring`) et les propriétés. L'analyse d'un Button prend aujourd'hui 5 secondes à froid ; la construction doit se mesurer.
- Gel du plugin. Figma recommande de couper un long travail en tranches et de rendre la main avec `setTimeout(…, 1)` ([frozen plugins](https://developers.figma.com/docs/plugins/frozen-plugins/)). La construction écrit par variante, rend la main entre deux variantes et affiche un compteur ; un échec à mi-parcours laisse les variantes écrites, ce que la relance sait reprendre (elle crée seulement les manquantes).
- Annulation. Le journal de structure défait les variables créées. Les nœuds n'ont que Ctrl+Z, par un seul point posé après toutes les écritures du lot, comme `ecrireLeLot`.
- Message entre l'interface et le sandbox. La description factorisée tient en quelques ko ; le développement en 150 lignes (nom, tokens, cibles) en quelques centaines de ko, sous `LONGUEUR_MAXIMALE_DU_TEXTE` (2 000 000 caractères, `preparations.ts`). Le contrat du Button pèse 49 ko sans espaces et celui de Groupe 79 ko, sans leur factorisation. Les réponses et la description rangées dans les données partagées d'Architect butent sur la limite de 100 ko par entrée, espace de noms, clé et valeur comprises ([setSharedPluginData](https://developers.figma.com/docs/plugins/api/properties/nodes-setsharedplugindata/)). Une description de plus de 100 ko se range en plusieurs clés.
- Position des variantes dans le jeu. La page de `combineAsVariants` ne dit pas comment le jeu est disposé. Une variante ajoutée à un jeu existant a une place à mesurer.

### Lot 0 : la mesure dans Figma

Le dépôt n'ouvre pas Figma. Le mainteneur lance un plugin local jetable, hors de Git, dans `_local/`, comme `releve-alias` de P28. Il répond à six points.

1. `combineAsVariants` sur des composants qui ont des instances : les clés et les liens sont-ils gardés ?
2. `remove()` d'une variante et renommage d'une valeur (`variant.name`) : les instances sont-elles détachées, déliées, ou liées à un composant supprimé ?
3. L'ajout d'un composant à un jeu existant (`appendChild`) : sa place, et la création de l'option de variante.
4. Le temps d'écriture pour 150 variantes liées (couleur, taille, texte, instances).
5. `isExposedInstance` et `componentPropertyReferences` écrits sur chaque variante : combien de temps, et quel contrat l'export publie ensuite.
6. L'écriture d'un style de texte et de polices sur un texte dans un composant.

## 9. Proposition d'expérience

| Étape | Qui | Ce qui se passe |
|---|---|---|
| 1. Description | le mainteneur et l'agent | un fichier `ucm-description`, collé dans le plugin comme le texte de la Préparation ; le plugin le juge (format, version, champs) |
| 2. Aperçu | le plugin | une liste sans écriture : axes, valeurs, nombre de variantes, variables à créer et existantes, cases de `cibles` vides, questions ; les variantes contrastées (deux ou trois très différentes, comme l'outil local) montrent un axe oublié |
| 3. Variables | le plugin, fichier des tokens | la Préparation tirée de la description crée les variables, avec journal ; le designer publie la library (geste inchangé) |
| 4. Variante de référence | le plugin, fichier des composants | une seule variante est construite, liée aux variables publiées ; le designer la regarde dans Figma, et peut la retoucher par les tokens |
| 5. Génération | le plugin | le reste du jeu est créé par lots, relié ; une barre de progression et un rapport (créées, sautées, questions) ; Ctrl+Z défait le lot |
| 6. Retouche | le designer | il dessine des variantes à sa main ou retouche une dimension par un token ; sa variante devient une source (Q1) |
| 7. Nouvelle génération | le plugin | la description a changé ; l'aperçu liste ce qui s'ajoute, ce qui est renommé, les orphelines et les écarts ; seules les variantes manquantes sont créées |

Les étapes 4 et 7 sont aussi le chemin d'un composant relié à la main : « Relier le composant » (section 7 de la recherche) reste l'entrée d'un composant existant, et la construction s'ouvre sur le même écran.

## 10. Lots possibles

| Lot | Contenu | Prérequis |
|---|---|---|
| 0 | Mesure dans Figma (§8) | le plugin jetable, lancé par le mainteneur |
| 1 | Format `ucm-description` dans le kit : types, validation avec le drapeau « sans Figma », schéma, développement en variants, version du kit | case 3.1 de P22 ou bloc `pieces` provisoire |
| 2 | Règles de complétion dans le kit : source, substitution, table des cibles, contradictions et questions, avec cas de test | lot 1 |
| 3 | Préparation tirée de la description, dans Architect (mode Tokens), et reprise de `creerLesVariables` | lots 1 et 2 |
| 4 | Double d'arbre avec état dans `tests/`, et loi d'écriture de la construction | |
| 5 | `src/ecriture/construction.ts` : jeu de variants, propriétés, instances, liaisons, polices et styles locaux ; extraction de `ecrire` de `liaisons.ts` | lots 0, 2 et 4 |
| 6 | Interface : import de la description, aperçu, questions, Construire, galerie des états, textes validés (`TODO(texte)` sinon) | lot 5, maquette validée (case 2.2 du plan) |
| 7 | Itération : diff description et jeu, renommage, orphelines, suppression par variante | lot 5 |
| 8 | Test aller-retour : génération, relecture par l'analyse (zéro C25 et C29), export, comparaison avec le développement | lots 5 et 1 |
| 9 | Mode agnostique : cibles par chemin de variable existante, aucune création | lot 6 |
| 10 | Essai sur le Button du pilote de P30, avec `.sizeWrapperButton`, `.Ring` et `Icon` (case 3.3 du plan) | le mainteneur |

Un `SLOT` à écrire (Groupe et `.Segment`) et l'import d'un composant ou d'un style de library sont hors de ces lots.

## 11. Questions au mainteneur

1. Forme de la description. Faut-il un contrat 15.0 partiel avec trois ajouts (`cas`, `cibles`, type de calque), ou un format propre ? Recommandation : le contrat partiel. Un format propre créerait deux sources pour les axes, la structure et les props, et un test d'aller-retour entre deux formes.
2. Q10, la valeur d'axe retirée. La construction supprime-t-elle les variantes orphelines, ou les signale-t-elle ? Recommandation : les signaler, et ne supprimer que par un geste du designer, variante par variante, case décochée, après le lot 0.
3. L'hôte. Un mode d'Architect ou un autre plugin ? Recommandation : un mode d'Architect, avec une ligne de plus dans le tableau d'écriture de la SPEC et sa propre loi d'écriture.
4. Deux passes ou une. La génération se fait-elle en deux passes séparées par la publication de la library (variables, puis dessin lié) ? Recommandation : oui, avec une variante de référence construite d'abord. Le dessin sans liaison, puis « Lier », crée des calques en dur que l'analyse actuelle ne voit pas dans les instances (270 couleurs sur 360 dans la mesure 6 bis).
5. La mesure avant tout lot. Le mainteneur lance-t-il le plugin de mesure du lot 0 avant la case 3.1 du plan de P31 ? Recommandation : oui, car la documentation ne dit rien sur la suppression d'une variante, la clé gardée par `combineAsVariants` et le temps d'écriture, et le plan interdit déjà tout lot de code avant 3.1.

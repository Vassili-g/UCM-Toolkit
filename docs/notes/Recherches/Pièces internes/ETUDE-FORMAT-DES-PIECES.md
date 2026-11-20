# Étude R6 : forme des pièces internes dans le contrat de l'hôte

État : questions 1 à 9 traitées, forme proposée écrite. Reste les réponses du
mainteneur au §9 et l'essai dans Figma décrit sous R1.

Cette étude répond à R6 de [RECHERCHE-PIECES-INTERNES.md](./RECHERCHE-PIECES-INTERNES.md).
Elle part du contrat 14.0 (`packages/kit/src/format/version.ts`). Les chemins
de code sont relatifs à `packages/plugin-socle/src/composant/` quand ils
commencent par `contract/` ou `analyse/`.

## 1. Le pipeline actuel

Deux fonctions produisent le contrat. `calculerLAnalyse` (`analyse/resultat.ts`)
lit Figma et rend un `ResultatInterne`. `publierLeContrat`
(`contract/publication.ts`) assemble les champs racine à partir de ce résultat,
sans relire Figma. `analyserLeComposant` (`contract/exportComponent.ts`) les
enchaîne.

Le moteur ne lit aucun préfixe de tokens `components.<hôte>`. Il résout chaque
variable par son nom (`VariableNameResolver`, `variables.ts`), et aucun fichier
de `contract/` ne cite `components.`. La règle « un layer se lie aux tokens de
son propre composant » appartient à Architect seul.

| Étape | Fonction | Ce qu'elle produit | Dépend de l'hôte |
|---|---|---|---|
| `regles` | `extractRules(set, page)` | `intent`, documentation des props, règles `@icons` | la page : celle du maître de la pièce, à charger (essai R1) |
| propriétés | `extractContractPropertyModel(defs)` | modèle des props | non |
| matrice | `findMissingVariantCombinationsParEtapes`, `buildVariantMatrixParEtapes` | variants, axes, avertissement de matrice clairsemée | non |
| budget | `bornerLesVariantsParTranches` | variants gardés | oui : un seul budget de layers pour l'hôte et ses pièces |
| `index` | `contientUneInstanceRendueParEtapes`, `indexContractedNames` | noms qui ont des règles dans le document | oui : un index par document, calculé une fois |
| `composition` | `scanComposedMatrix(variants, référence, contractés)` | `composed`, `mainByInstanceId`, surfaces des dépendances | non, sauf la carte des maîtres, qui peut s'unir |
| `wrapper` | `findWrapperReference` | wrapper de dimensions | non : une pièce peut avoir le sien |
| états | `buildStateModel` | `stateModel` | non |
| surface | `buildContractPropertySurface` | `props` | non |
| imbriqués | `releverLesImbriques` | points bloquants des imbriqués | oui : la sorte de chaque imbriqué se juge depuis l'hôte |
| liaisons | `extractPropertyBindingsParEtapes(matrix, clés, …, composed)` | `propertyBindingDefinitions`, `variants[].bindings`, valeurs appliquées | oui : le parcours de l'hôte doit s'arrêter aux instances de pièce |
| `variables` | `indexVariablesParEtapes` | index des variables locales | oui : un index par document, calculé une fois |
| `structure.*` | `extractStructure` | vues exactes, projection de référence, `textStyles`, `effectStyles`, icônes, rôles découverts | oui : le parcours de l'hôte doit s'arrêter aux instances de pièce |
| couleurs | `extractVariantTokens`, puis `colorKeys.ts` | `variants[].tokens`, `variants[].strokes`, clés allongées | oui : les clés se décident sur toute la matrice d'un composant |
| fusions | `mergePropDescriptions`, `mergeBooleanDescriptions`, `mergeEnumDefaults`, `mergeIconRules` | documentation des props, `icons` | non |
| dépendances | `mergeVariantDependencies` | `composes` | non |
| `echantillons` | `extractVariantSampleParEtapes` | `samples` | non |
| `compaction` | `compactVariantsParEtapes(variants, liaisons)` | les six catalogues, `variantViews`, `variants`, `samples` | oui : il crée ses propres tables d'identifiants à chaque appel |
| assemblage | `buildMeta`, `buildFigmaVariantLabels`, `renderingSemanticsFor`, `elideContractParEtapes` | `meta`, `figmaVariantLabels`, `rendering`, élision | `meta` seulement |

Trois sortes de dépendance à l'hôte apparaissent.

- Des ressources du document se lisent une fois et se partagent : l'index des
  noms à règles, l'index des variables, le budget, la carte des maîtres.
- Le parcours de l'hôte doit traiter une instance de pièce comme il traite
  aujourd'hui une dépendance de `composes` : un point d'arrêt. `composed`
  (`ComposedInstances`, `contract/exportableNodes.ts`) porte cet arrêt pour les
  dépendances, et `getAllNodes`, `extractLayout`, `extractVariantTokens`,
  `extractPropertyBindingsParEtapes` et `extractVariantSample` le lisent tous.
  Une seconde carte, celle des instances de pièce, suivrait le même chemin.
- La compaction crée ses tables d'identifiants dans `compactVariantsParEtapes`.
  Pour partager les catalogues entre l'hôte et ses pièces, elle doit recevoir
  les tables en paramètre.

Toutes les autres fonctions prennent un `ComponentSetNode` et ses variants, et
s'appliquent telles quelles au set d'une pièce. Le travail se résume donc à
appeler `calculerLAnalyse` sur chaque pièce, avec les ressources partagées, et à
publier ses champs dans l'entrée de la pièce.

Deux constats du code actuel comptent pour la suite.

- `extractPropertyBindingsParEtapes` parcourt l'instance de pièce. Un calque de
  la pièce lié à une propriété de la pièce cite une référence
  (`Afficher#12:3`) absente des clés de l'hôte. Le moteur pousse alors la note
  « le contrat ne la publie pas » et ne publie aucune liaison.
  `plugin-exporter/tests/exportComponent.test.ts` (« une liaison native sans
  prop publique est rangée comme une perte de portabilité ») fixe ce cas en
  général : la note rend `meta.coverage.portable` partiel. Aucun test ne le
  monte sous une pièce. Un hôte dont une pièce lie une propriété publie donc
  déjà une couverture partielle.
- `sorteDeLImbrique` teste le wrapper de dimensions avant le préfixe.
  `.sizeWrapperButton` (fixture `Button.contract.json`) est préfixé, porte des
  propriétés, et reste un wrapper dont les props rejoignent celles de l'hôte.
  La question 9 pose le cas.

## 2. Champ par champ

Une entrée de pièce reprend la forme d'un contrat, sans `meta`. Les catalogues
de parties de vue restent à la racine et servent l'hôte comme ses pièces
(question 3).

| Champ racine | Dans l'entrée de la pièce | Raison |
|---|---|---|
| `name` | même champ | nom Figma exact, `.CardHeader` |
| `meta` | sans objet ; l'entrée porte `nodeId` à sa racine | la version, la date, la couverture et les diagnostics décrivent l'export de l'hôte ; le `nodeId` du set de la pièce garde la traçabilité |
| `props` | même champ | `componentPropertyDefinitions` du set de la pièce |
| `figmaVariantLabels` | même champ | étiquettes des axes de la pièce |
| `viewStructures` | catalogue partagé | une entrée se résout contre la racine de son composant |
| `viewTypographies` | catalogue partagé | idem |
| `viewComposes` | catalogue partagé | idem |
| `viewIcons` | catalogue partagé | une clé d'icône se résout dans l'`icons` de l'entrée qui renvoie |
| `viewPaintPlacements` | catalogue partagé | une clé de couleur se résout dans la feuille du variant qui renvoie |
| `viewEffects` | catalogue partagé | idem |
| `variantViews` | catalogue partagé | une vue n'est qu'un jeu de renvois |
| `propertyBindingDefinitions` | catalogue partagé | `prop` se résout dans les `props` de l'entrée qui renvoie ; `figmaPropName` porte l'id Figma de la propriété, si bien que deux composants ne produisent jamais la même définition |
| `variants` | même champ | une entrée par variant du set de la pièce, avec `tokens`, `strokes`, `bindings`, `view`, `sample` |
| `structure` | même champ | `view`, `sizes` si la pièce a un axe de tailles, `variantAxes` |
| `stateModel` | même champ | une pièce peut porter un axe d'états |
| `rendering` | `roles` partagé, `keyRoles` dans l'entrée | `roles` est générique ; une clé de la pièce peut avoir un autre rôle qu'une clé homonyme de l'hôte |
| `icons` | même champ | les règles `@icons` de la pièce ; `slot` vise la structure de la pièce |
| `textStyles` | catalogue partagé | un style a la même définition partout |
| `effectStyles` | catalogue partagé | idem |
| `composes` | même champ | les dépendances que la pièce pose ; voir la question 9 pour l'union |
| `samples` | catalogue partagé | `variants[].sample` y renvoie |
| `intent` | même champ | lu dans le bloc `.componentRules` de la pièce, décision prise |

Le contrat de l'hôte reçoit en plus le bloc des pièces et le renvoi de chaque
instance posée, décrits aux questions 3 et 5.

## 3. Factorisation

Recommandation : une seule série de catalogues pour tout le contrat, que l'hôte
et ses pièces remplissent ensemble.

Le format partage déjà une entrée de catalogue entre deux vues dont les arbres
diffèrent. Dans `Button.contract.json` (fixture 13.0), `ty1` sert `st1` et
`st2`. Une entrée ne nomme jamais sa racine : un `slotPath` se résout contre la
structure de la vue qui renvoie. Une vue de l'hôte et une vue de la pièce se
partagent donc une entrée comme deux vues de l'hôte le font. L'égalité stricte
reste l'unique règle de partage, et résoudre les renvois d'une vue de pièce
redonne sa vue exacte, au bit près.

La mesure de la question 7 chiffre l'écart. Des catalogues propres à la pièce
recopient `ty1`, `ic1`, `pp1`, `pp2` et `textStyles`, et ajoutent 930 octets à
un contrat de 28 544 octets, soit 3 %. La lisibilité va aussi au partage : un
lecteur résout l'arbre d'une pièce par le même chemin,
`viewStructures[variantViews[variants[i].view].structure]`, avec la même
fonction (`resoudreLaVue`, `packages/kit/src/lecteurs/variant-views.mjs`).

Chaque adresse part de la racine du composant dont le variant renvoie.

- `slotPath` de typographie et d'effets, chemins de `paintPlacements`,
  `icons.*.slot`, `viewIcons.*.*.slotPath` et `samples.*.text[].slotPath`
  d'une vue de pièce partent de la racine de la pièce. `[]` désigne cette
  racine, que l'hôte rend à l'endroit de l'instance.
- Une adresse de l'hôte s'arrête au slot qui porte `piece`, comme elle
  s'arrête aujourd'hui au slot qui porte `composes`.
- L'adresse complète d'un calque de pièce, vue de l'hôte, est le `slotPath` du
  renvoi suivi du chemin dans la pièce.

Les clés se résolvent dans l'entrée qui renvoie. Une clé d'icône se lit dans
l'`icons` de l'entrée, une clé de couleur dans la feuille du variant, une `prop`
de liaison dans les `props` de l'entrée, et une clé sans rôle dans le
`rendering.keyRoles` de l'entrée. `colorKeys.ts` décide les clés sur la matrice
d'un composant, donc sur la pièce seule : une clé de la pièce ne s'allonge plus
parce que l'hôte peint une couleur de même dernier segment.

Les identifiants ne se heurtent pas. `compactVariantsParEtapes` numérote sur la
taille de la table qu'il reçoit : la même table passée d'un composant à l'autre
donne une seule série. L'ordre reste déterministe, l'hôte d'abord, puis chaque
pièce dans l'ordre de la question 4.

La clé d'une entrée de pièce est l'identifiant de code de son nom
(`codeIdentifier`, `.CardHeader` donne `CardHeader`), que l'Adaptateur cherchera
en `CardHeaderProps`. Deux pièces de même identifiant (`.CardHeader` et
`_CardHeader`) bloquent l'export, comme deux axes confondus.

La loi `lesAdressesDesignentUnCalqueReel` (`plugin-exporter/tests/lois.ts`)
parcourt aujourd'hui `variantViews`. Avec des clés résolues par entrée, elle
parcourt les couples formés d'une entrée et d'un de ses variants.

## 4. Récursivité

Le moteur analyse l'hôte, puis chaque pièce, avec la même fonction
`calculerLAnalyse` et des ressources partagées.

1. L'analyse d'un composant relève ses instances par `scanComposedMatrix`.
   Chaque instance dont le porteur (`porteurDuMaitre`, `contract/imbriques.ts`)
   est une pièce entre dans la carte d'arrêt du composant et dans une file.
2. Le parcours du composant s'arrête à ces instances, publie le slot avec
   `piece` et relève le renvoi de la question 5.
3. La file sort les pièces dans l'ordre de leur première rencontre : les
   variants dans l'ordre de la matrice, puis les calques dans l'ordre de
   l'arbre. Une pièce déjà vue, par l'identifiant de son set, ne rentre pas.
4. Chaque pièce sortie est analysée comme l'hôte, et ses propres pièces
   rejoignent la file. Ses parties de vue rejoignent les tables partagées de la
   compaction.

Chaque pièce reçoit une seule entrée, posée à une ou plusieurs profondeurs, par
l'hôte ou par une autre pièce. Le renvoi d'une instance vit dans le composant
qui la contient.

La file se vide. Un document contient un nombre fini de sets, et l'ensemble des
sets vus ne fait que croître. Figma refuse aussi qu'un composant contienne une
instance de lui-même, directement ou par un intermédiaire. L'ensemble des sets
vus suffit sans cette garantie.

Les frontières actuelles restent en place.

- Une dépendance publiée posée dans une pièce reste un point d'arrêt de
  `composes`, dans la vue de la pièce.
- Une pièce posée dans une dépendance publiée appartient au contrat de cette
  dépendance : `aQuiAppartient` rend `'elaguee'`.
- Une pièce peut avoir son wrapper de dimensions : `findWrapperReference`
  s'applique à son set.
- Le budget de layers compte les layers des pièces. Une pièce que le budget
  n'admet pas laisse l'analyse `partielle`, comme un variant non lu.

## 5. Renvoi de l'instance posée

L'hôte publie deux choses à l'endroit de l'instance. Le slot de sa structure
garde les champs de placement et nomme la pièce. Le variant de l'hôte cite la
variante posée et ses remplacements, dans un champ `pieces`.

Le slot porte `slot`, `figmaLayer`, `piece`, et les champs qui disent comment
le parent place l'instance : `alignSelf`, `flexGrow`, `size`, `bounds`,
`position`, `constraints`, `inset`, la place en grille, `rotation`, `opacity` et
la `visibilityProp` d'une propriété de l'hôte. Il ne porte ni `children`, ni les
champs du flux intérieur (`layout`, `gap`, `padding`, `radius`), qui viennent de
la pièce. `opacity` suit la règle des dépendances : publiée si l'instance
diffère de son maître.

Le renvoi vit dans le variant de l'hôte, à côté de `tokens` et de `bindings`.
Le choix de la variante posée change d'un variant de l'hôte à l'autre (un hôte
`Theme=dark` pose la pièce `Theme=dark`), comme ses couleurs. Le placer dans
la vue empêcherait deux variants de l'hôte de partager une vue que la 14.0
partage. La mesure de la question 7 donne 920 octets de plus pour un septième
catalogue de vue que pour le renvoi par variant.

```json
"pieces": [
  { "slotPath": ["header"], "variant": "812:105",
    "args": { "showIcon": true, "showAction": false } }
]
```

- `variant` est le `nodeId` de la variante de la pièce, celui que
  `pieces.<Pièce>.variants[].nodeId` publie. Il désigne une variante même quand
  deux variantes portent les mêmes valeurs d'axes après normalisation.
- `args` porte les valeurs des propriétés `BOOLEAN` et `INSTANCE_SWAP`, aux
  clés publiques de la pièce. Elles décident de ce que la pièce rend : elles
  sont normatives, à la différence des `args` d'une dépendance dans `samples`.
- `view`, `tokens` et `strokes` apparaissent seulement quand l'instance diffère
  de sa variante. Un champ absent reprend, entier, la vue ou la feuille de la
  variante citée. Le remplacement porte sur une partie complète, jamais sur un
  morceau d'arbre.

Le moteur décide `view` par la règle d'égalité du format. Il extrait le
sous-arbre de l'instance dans le contexte de la pièce (ses clés de propriétés,
ses règles `@icons`), avec les chemins relatifs à l'instance, et compare la vue
développée à celle de la variante citée. À l'égalité, `view` reste absent.
Sinon, les parties de la vue de l'instance rejoignent les catalogues partagés,
et `view` renvoie à leur jeu de renvois. Une seule partie différente ajoute une
seule entrée de catalogue.

| Remplacement sur une instance Figma | Lecture | Destination |
|---|---|---|
| Variante choisie (propriété `VARIANT`) | `getMainComponentAsync()` | `variant`, normatif |
| Propriété `BOOLEAN` | `componentProperties` | `args`, normatif |
| Propriété `INSTANCE_SWAP` | `componentProperties` et le maître de l'instance placée | `args`, avec le nom du composant placé, normatif |
| Propriété `TEXT` | `componentProperties` | `samples` de l'hôte, contenu |
| Contenu d'une propriété `SLOT` | les enfants du slot dans l'instance | question 9 |
| Texte saisi sans propriété | `overrides` (`characters`) | `samples` de l'hôte, contenu |
| Calque masqué ou montré sans propriété | `overrides` (`visible`) | `view` : le calque sort ou entre dans la structure |
| Icône échangée sans propriété | comparaison au maître, comme `swaps` | `view` : `figmaLayer` et emplacement d'icône |
| Calque renommé | `overrides` (`name`) | `view` : `figmaLayer` |
| Couleur liée remplacée | `boundVariables` des peintures | `tokens` ou `strokes` du renvoi |
| Dimension liée remplacée (gap, padding, rayon, taille, borne, opacité d'un calque intérieur) | `boundVariables` | `view`, partie structure |
| Text style ou effect style remplacé | `textStyleId`, `effectStyleId` | `view`, partie typographie ou effets |
| Auto layout de la racine remplacé (sens, alignement) | champs de layout de l'instance | `view`, partie structure |
| Valeur posée à la main, sans variable | champ brut | rien, avec l'avertissement de la règle commune |
| Taille, remplissage, place et rotation de l'instance | menu de dimensionnement, contraintes | slot de l'hôte |
| Propriété d'une pièce imbriquée exposée à l'hôte | `exposedInstances`, `componentProperties` de l'instance imbriquée | `pieces` du renvoi, un renvoi par instance imbriquée, adressé dans la pièce |
| Verrouillage, prototypage, réglages d'export | sans effet de rendu | hors contrat, comme aujourd'hui |

Un calque de la pièce lié à une propriété de l'hôte garde sa liaison dans les
`bindings` de l'hôte, avec son `figmaPath` complet. Un calque lié à une
propriété de la pièce publie sa liaison dans le variant de la pièce. La note
« le contrat ne la publie pas » de la question 1 disparaît.

Le sous-arbre que la 14.0 publie reste reconstructible : résoudre `view` (ou la
vue de la variante), `tokens` et `strokes` du renvoi redonne le sous-arbre, ses
couleurs et ses adresses. La question 6 en fait un critère.

Les valeurs `TEXT` et les textes saisis vont dans l'échantillon du variant de
l'hôte, sous une liste `pieces` adressée comme le renvoi : `slotPath` de
l'instance, `args` pour les propriétés `TEXT`, `text` aux chemins de la pièce.
Un contrat qui retire `samples` reste ainsi strictement normatif.

## 6. Preuve sans perte

Le moteur garde le parcours 14.0 : il suffit de lui passer une carte de pièces
vide. Pour un même document, `E14` désigne le contrat produit sans pièces, et
`E15` le contrat produit avec. Une fonction de test `deplierLesPieces(E15)`
remplace, dans la vue exacte de chaque variant de l'hôte, chaque slot `piece`
par un slot fusionné. Ce slot reçoit les champs de placement du slot de l'hôte
et les champs de flux de la racine de la vue résolue (celle du renvoi, sinon
celle de la variante), `sizing` excepté. La fonction préfixe chaque adresse de
la pièce par le `slotPath` du renvoi, joint les feuilles de couleurs, applique
la règle du texte unique de `contract/structureTree.ts`, puis recommence sous
chaque pièce imbriquée.

Critère A, la reconstruction. Pour chaque variant de l'hôte, la vue dépliée de
`E15` et la vue exacte de `E14` ont la même signature (`signature`,
`contract/compactVariants.ts`), à trois écarts près, chacun vérifié.

1. Les couleurs se comparent comme des ensembles de quadruplets : chemin,
   token, peinture ou contour, rôle. Une clé change de portée et peut perdre
   un allongement.
2. `E15` publie en plus les liaisons et les `visibilityProp` qui citent une
   propriété de la pièce. La comparaison les retire de `E15`, et vérifie que
   `E14` a émis la note « le contrat ne la publie pas » pour chacune.
3. Ces notes disparaissent de `meta.diagnostics`. Tout autre message reste,
   avec le même code.

L'échantillon déplié se compare de la même façon à celui de `E14`.

Critère B, la complétude. Chaque variant du set de chaque pièce posée a une
entrée dans `pieces.<Pièce>.variants`. L'entrée résolue égale, hors `meta`, le
contrat que `E15` produit quand le set de la pièce est le composant exporté,
après résolution des renvois des deux côtés. Les variantes que l'hôte ne pose
pas, les booléens et les règles sont ainsi décrits par les mêmes outils que
ceux d'un composant publié.

Critère C, la forme. Chaque `variant` d'un renvoi désigne une variante de
l'entrée. Chaque slot `piece` reçoit un renvoi dans chaque variant qui le rend.
Chaque entrée de `pieces` est atteinte par un renvoi. Chaque adresse désigne un
calque de l'arbre de son composant.

Trois tests le prouvent.

- `plugin-exporter/tests/piecesInternes.test.ts`, nouveau, monte avec
  `node` et `conteneurDeRegles` (`plugin-exporter/tests/aides/figmaFaux.ts`) un
  hôte de deux variants qui pose `.Piece`. Le set `.Piece` a quatre variantes
  (deux axes de deux valeurs), une propriété `BOOLEAN` liée à la visibilité
  d'une icône, et son bloc de règles sur sa page. L'hôte ne pose pas l'une des
  variantes. Une instance remplace une couleur, une autre masque un calque. Une
  pièce `.Pastille` est posée dans l'hôte et dans `.Piece`. Le test vérifie les
  critères A et B, et une seule entrée pour `.Pastille`.
- `plugin-exporter/tests/lois.ts` reçoit le critère C comme loi. Le banc
  l'applique à chaque contrat que le moteur fabrique, selon l'invariant « la
  vérification est posée sur le chemin d'appel »
  (`plugin-exporter/invariants/tests-du-moteur.md`).
- `packages/kit/tests/` reçoit un contrat 15.0 fabriqué, que
  `validation-contrat.mjs` accepte, et ses mutations refusées : renvoi vers une
  variante absente, entrée jamais atteinte, adresse hors de l'arbre de la pièce.

Les mocks ne prouvent pas la lecture d'une pièce rangée sur une autre page,
que l'essai décrit sous R1 établira dans Figma. Aucun contrat commité ne sert
d'oracle au moteur : `E14` est recalculé à chaque test.

## 7. Taille

Le script jetable `mesure.mjs`, hors du dépôt, part d'`Alert.contract.json`
(fixture 13.0, 8 variants) et lui fait poser une pièce `.AlertHeader` de 4
thèmes × 4 affichages × 2 booléens, soit 16 variantes. Chaque affichage a sa
structure, faite d'un arbre d'Alert (950 octets). Chaque variante porte 3
couleurs, un contour pour deux affichages, 2 liaisons et un échantillon. Les
tailles sont celles du JSON sans espaces ; le sérialiseur du moteur ajoute
1,6 % sur `Button.contract.json`.

| Contrat | Octets |
|---|---|
| Alert sans pièce | 14 001 |
| Alert avec pièce, forme 14.0 (seuls les états posés, avec perte) | 18 066 |
| Alert avec pièce, forme proposée | 28 544 |
| dont l'entrée de la pièce | 9 397 |
| dont les entrées ajoutées aux catalogues partagés | 4 989 |
| dont les renvois des 8 variants de l'hôte | 713 |
| Variante : catalogues propres à la pièce | 29 474 |
| Variante : renvoi dans un septième catalogue de vue | 29 463 |
| Variante : pièce posée deux fois et décrite en arbre sous chaque instance | 42 930 |
| Variante : produit cartésien des variants de l'hôte, des variantes et des booléens (512 variants) | 350 706 |

La forme proposée pèse 10,5 ko de plus que la 14.0 pour décrire 16 variantes
au lieu des 8 états posés. Les 16 entrées de `variants` de la pièce en font
7,7 ko. Ce poste domine déjà la 14.0 : `variants` pèse 44 759 octets des 53 809
de `Button.contract.json`. Les deux variantes rejetées coûtent 3 % chacune. La
description en arbre double le coût de la pièce à chaque instance. Le produit
cartésien multiplie le contrat par 12.

## 8. Impacts

Format et version :

- `packages/kit/src/format/types.ts` : `Contract.pieces`, le type de l'entrée,
  `ChildStructure.piece`, `ContractVariant.pieces` et le type du renvoi,
  `ContractSample.pieces`, `keyRoles` par entrée. Puis `npm run schema`, qui
  régénère `packages/kit/schema/ucm-contract.schema.json`.
- `packages/kit/src/format/version.ts` : 15.0. Le changement relève de la
  classe 2 de `docs/format/COMPATIBILITE.md`, majeure : un lecteur 14.0 qui
  ignore `pieces` rend le slot de la pièce vide. `docs/format/CHANGELOG-FORMAT.md`
  reçoit l'entrée.
- `packages/kit/fixtures/contrats/` : la fenêtre passe à 14.0 et 15.0. Un
  corpus 14.0 figé entre, et le corpus 13.0 sort avec son code de
  compatibilité (`packages/kit/invariants/corpus-de-test.md`).
- `docs/format/FORMAT.md` : une section sur les pièces internes, la règle
  d'adresse par entrée au §6, la sorte de l'imbriqué sous « Composition et
  dépendances », l'échantillon d'une pièce au §9.
- `packages/plugin-exporter/SPEC.md` : la lecture du set et de la page d'une
  pièce, ses règles, le renvoi et ses remplacements.

Lecteurs du kit (`packages/kit/src/lecteurs/`) :

- `variant-views.mjs` : `vueExacteDuVariant` pour un variant de pièce, et une
  fonction qui déplie une pièce posée.
- `validation-contrat.mjs` : forme de `pieces`, renvois, entrées orphelines
  sur les catalogues partagés, correspondance entre slot `piece` et renvoi.
- `validation-echantillons.mjs` : `samples.*.pieces`.
- `validation-graphe-contrats.mjs` : dépendances d'un contrat, hôte et pièces
  (question 9).
- `diagnostic-contrastes.mjs` : le fond d'une couleur posée à la racine d'une
  pièce est une couleur de l'hôte ; la règle du plus long préfixe s'applique au
  chemin déplié.
- `diagnostic-parite.mjs`, `version-contrat.mjs`, `schema-contrat.mjs` et
  `caracteristiques.mjs`, qui lisent `variantViews` ou la version.

Référentiel et Adaptateur :

- `packages/kit/src/referentiel/composition.ts` : `sorteDeLImbrique` teste le
  préfixe avant les règles (décidé), et place le wrapper selon la question 9.
  Tests : `packages/kit/tests/composition.test.ts`.
- `packages/adapter-typescript/src/parite.mjs` : comparer `<Pièce>Props` à
  côté de `nomInterfaceAttendue`, et compter les dépendances des pièces.

Moteur du socle (`packages/plugin-socle/src/composant/`) :

- `analyse/resultat.ts` : la file des pièces et les ressources partagées.
- `contract/composedComponents.ts` : `estContracte` refuse un nom préfixé
  avant de lire les règles ; le scan rend la carte des pièces.
- `contract/exportableNodes.ts`, `contract/extractLayout.ts`,
  `contract/structureTree.ts`, `contract/extractVariantTokens.ts`,
  `contract/propertyBindings.ts`, `contract/extractSamples.ts` : l'arrêt aux
  instances de pièce et le slot `piece`.
- `contract/compactVariants.ts` : les tables d'identifiants en paramètre.
- `contract/publication.ts`, `contract/elideNeutrals.ts`
  (`CATALOGUES_DE_VUES`) : l'assemblage et l'élision de `pieces`.
- `contract/imbriques.ts` : une pièce à propriétés sans règles entre dans
  `sansRegles` ; ses clés quittent `auParent` ; le commentaire
  d'`estUnePieceInterne` change.
- `contract/budget.ts`, `contract/localisation.ts` : le budget commun, et le
  nom de la pièce dans le sujet d'un message.
- `template/` : « Créer les règles d'usage » pose le bloc de chaque pièce
  (décidé).

Architect :

- `packages/plugin-architect/src/imbriquesDuReleve.ts` lit `sorteDeLImbrique`
  et suit son nouvel ordre.
- La règle « un layer se lie aux tokens de son propre composant » doit admettre
  qu'un calque du maître d'une pièce lie les tokens de son hôte. Tests :
  `packages/kit/tests/controles-composant.test.ts`,
  `packages/plugin-architect/tests/releveDuComposant.test.ts`.

Tests du moteur : `plugin-exporter/tests/lois.ts`, le nouveau
`piecesInternes.test.ts`, `imbriques.test.ts`, `composedComponents.test.ts`,
`exportComponent.test.ts`, `plugin-socle/tests/imbriquesParLeKit.test.ts`.

## 9. Questions ouvertes

### Q1. Un wrapper de dimensions préfixé reste-t-il un wrapper ?

`.sizeWrapperButton` est préfixé, porte les propriétés `Icon-Left`, `Label` et
`Icon-Right`, et ses props rejoignent celles de Button.

| Option | Conséquence |
|---|---|
| A. Le wrapper passe avant le préfixe, comme aujourd'hui | Button garde son API ; un wrapper n'a pas d'entrée de pièce ni de règles propres |
| B. Le préfixe passe avant le wrapper | Button perd `iconLeft`, `label` et `iconRight`, qui passent à la pièce ; son API publique change |

Recommandation : A. L'ordre devient dépendance publiée, wrapper, pièce,
détail, et une pièce ne devient jamais dépendance.

### Q2. Une pièce sans propriété reçoit-elle une entrée ?

| Option | Conséquence |
|---|---|
| A. Oui, comme toute pièce | Une seule règle de lecture ; une pièce posée trois fois se décrit une fois |
| B. Non, le parcours la décrit comme aujourd'hui | Le contrat reste plus court pour une pièce d'une seule variante ; deux règles de lecture coexistent |

Recommandation : A. Elle n'a pas de règles d'usage, décision prise, et son
entrée n'a pas d'`intent`.

### Q3. Une instance qui diffère de sa variante publie-t-elle des parties entières ou une liste de remplacements ?

| Option | Conséquence |
|---|---|
| A. Parties entières : `view`, `tokens`, `strokes` du renvoi | La règle d'égalité du §6 suffit ; résoudre redonne la vue sans fusion ; un écart se lit en comparant deux parties |
| B. Liste de remplacements calque par calque (chemin, champ, valeur) | L'écart se lit directement ; le lecteur doit fusionner un morceau d'arbre, ce que le §6 exclut (« aucun merge ») |

Recommandation : A. Elle tient le choix 4 au niveau de la partie : l'entrée
de la pièce cite les liaisons de son maître, le renvoi cite ce qu'il remplace.

### Q4. Le renvoi désigne-t-il la variante par son `nodeId` ou par ses valeurs d'axes ?

| Option | Conséquence |
|---|---|
| A. `nodeId` | Exact, même pour deux variantes de mêmes valeurs ; un lecteur fait une recherche pour lire les valeurs |
| B. Valeurs d'axes | Lisible sans recherche ; ambigu dans le cas que FORMAT.md décrit, deux variantes de mêmes valeurs après normalisation |

Recommandation : A.

### Q5. Le `composes` de l'hôte inclut-il les dépendances de ses pièces ?

La 14.0 les y met, puisqu'elle parcourt la pièce.

| Option | Conséquence |
|---|---|
| A. Chaque entrée garde ses dépendances ; les lecteurs du graphe et de la parité font l'union | La règle « `composes` est l'union des vues » reste vraie dans chaque entrée |
| B. L'hôte ajoute celles de ses pièces | Un lecteur 14.0 du graphe ne change pas ; la règle d'union devient « vues de l'hôte et des pièces » |

Recommandation : A, puisque la version majeure oblige déjà les lecteurs à
apprendre `pieces`.

### Q6. Où va le contenu qu'un hôte pose dans une propriété `SLOT` de la pièce ?

Ce contenu appartient à l'hôte, mais il vit sous l'instance de la pièce.

| Option | Conséquence |
|---|---|
| A. Le renvoi porte ce contenu, adressé par le chemin du slot dans la pièce, décrit par les outils de l'hôte | Rien n'est perdu ; le renvoi gagne un champ |
| B. Hors du premier lot : l'export avertit, et le contenu manque | Le premier lot reste court ; la couverture devient partielle sur ce cas |

Recommandation : B, puis A quand le fichier de test du mainteneur contiendra le
cas.

## Forme proposée

Un hôte `Card` à deux variants pose la pièce `.CardHeader`, qui a deux
variantes et un booléen. La vue `v2` de la pièce partage `ty1` et `pp1` avec la
vue `v1` de l'hôte : `["label"]` désigne `Body` dans l'hôte et `Titre` dans la
pièce, chacun dans l'arbre de son composant. Le second variant de l'hôte masque
l'icône par le booléen.

```json
{
  "name": "Card",
  "meta": { "contractVersion": "15.0", "…": "…" },
  "props": { "theme": { "type": "enum", "values": ["light", "dark"] } },
  "viewStructures": {
    "st1": { "layout": "flex-column", "sizing": { "width": "stretch", "height": "fit-content" },
      "children": [
        { "slot": "header", "figmaLayer": ".CardHeader", "piece": "CardHeader", "alignSelf": "stretch" },
        { "slot": "label", "figmaLayer": "Body" }
      ] },
    "st2": { "layout": "flex-row", "sizing": { "width": "stretch", "height": "fit-content" },
      "gap": "{components.card.header.gap}",
      "children": [
        { "slot": "icon", "figmaLayer": "info", "optional": true, "visibilityProp": "showIcon",
          "size": "{components.icons.sizes.sm}" },
        { "slot": "label", "figmaLayer": "Titre" }
      ] }
  },
  "viewTypographies": { "ty1": [{ "slotPath": ["label"], "style": "body.large" }] },
  "viewPaintPlacements": { "pp1": { "fills": { "background": [[]], "foreground": [["label"]] } } },
  "variantViews": {
    "v1": { "structure": "st1", "typography": "ty1", "paintPlacements": "pp1" },
    "v2": { "structure": "st2", "typography": "ty1", "paintPlacements": "pp1" }
  },
  "propertyBindingDefinitions": {
    "b1": { "prop": "showIcon", "figmaPropName": "Show icon#812:7", "target": "visible", "figmaPath": ["info"] }
  },
  "variants": [
    { "nodeId": "10:1", "values": { "theme": "light" }, "view": "v1",
      "tokens": { "background": "{components.card.colors.light.background}",
                  "foreground": "{components.card.colors.light.foreground}" },
      "pieces": [{ "slotPath": ["header"], "variant": "812:101", "args": { "showIcon": true } }] },
    { "nodeId": "10:2", "values": { "theme": "dark" }, "view": "v1",
      "tokens": { "background": "{components.card.colors.dark.background}",
                  "foreground": "{components.card.colors.dark.foreground}" },
      "pieces": [{ "slotPath": ["header"], "variant": "812:102", "args": { "showIcon": false } }] }
  ],
  "structure": { "view": "st1", "variantAxes": ["theme"] },
  "rendering": { "roles": { "…": "…" } },
  "textStyles": { "body.large": { "…": "…" } },
  "pieces": {
    "CardHeader": {
      "name": ".CardHeader",
      "nodeId": "812:100",
      "props": {
        "theme": { "type": "enum", "values": ["light", "dark"] },
        "showIcon": { "type": "boolean", "default": true, "description": "Affiche l’icône avant le titre." }
      },
      "variants": [
        { "nodeId": "812:101", "values": { "theme": "light" }, "view": "v2",
          "tokens": { "background": "{components.card.header.colors.light.background}",
                      "foreground": "{components.card.header.colors.light.foreground}" },
          "bindings": [{ "definition": "b1", "nodeId": "812:201" }] },
        { "nodeId": "812:102", "values": { "theme": "dark" }, "view": "v2",
          "tokens": { "background": "{components.card.header.colors.dark.background}",
                      "foreground": "{components.card.header.colors.dark.foreground}" },
          "bindings": [{ "definition": "b1", "nodeId": "812:202" }] }
      ],
      "structure": { "view": "st2", "variantAxes": ["theme"] },
      "intent": { "usage": "En-tête de Card : un titre et une icône facultative." }
    }
  }
}
```

## Questions pour le mainteneur

L'étude confirme les trois recommandations en attente.

- Choix 1 : un bloc `pieces` à la racine, une entrée par pièce, distinct de
  `composes`. Chaque instance posée renvoie à une entrée et à une variante par
  le champ `pieces` du variant qui la pose.
- Choix 3 : à plat. Une pièce posée à plusieurs profondeurs garde une seule
  entrée, et chaque renvoi vit dans le composant qui la pose.
- Choix 4 : confirmé, au grain de la partie entière, selon la question Q3 du
  §9.

Les six questions du §9 attendent une réponse. L'essai dans Figma décrit sous
R1 reste à faire avant le plan.

# Pièces internes décrites en entier dans le contrat de l'hôte

**Statut : R1 à R3 et R6 rendues (P22). Deux décisions sont prises. Cinq
choix attendent le mainteneur au §5, et six questions au §9 de l'étude R6.**
Le plan d'implémentation s'écrira après ses réponses et un essai dans Figma.

## 1. Le problème

Un composant se construit souvent avec des pièces propres à lui seul : l'en-tête
d'une carte, la poignée d'un curseur. Le designer préfixe leur nom par `.`
(`.CardHeader`), pour que Figma ne les publie pas dans sa bibliothèque. Une
telle pièce n'a ni contrat ni collection. `sorteDeLImbrique`
(`packages/kit/src/referentiel/composition.ts`) la reconnaît par son préfixe.

Une pièce peut porter beaucoup de réglages, par exemple 4 variantes de thème,
4 variantes d'affichage et des booléens. L'Exporter parcourt aujourd'hui la
pièce comme un simple calque de l'hôte. Le contrat montre donc seulement l'état
où chaque variant de l'hôte la pose. Les variantes de la pièce, ses booléens et
ce que chacun change disparaissent. Le développeur doit pourtant écrire la
pièce comme un sous-composant, et il invente alors son API.

Une pièce partagée par plusieurs composants, ou rangée dans une autre
bibliothèque, sort de ce cas d'usage.

## 2. Ce que le contrat publie

Le contrat de fixture `packages/kit/fixtures/contrats/13.0/Button.contract.json`
range `.sizeWrapperButton` comme un enfant de `viewStructures` : un slot `label`
avec `figmaLayer: ".sizeWrapperButton"`, son rayon, son gap et son padding.
Aucun bloc ne décrit la pièce elle-même. Aucun contrat de fixture ne contient
`.Ring`. Le champ `composes` nomme seulement les dépendances qui ont leur propre
contrat. La version courante du contrat est 14.0.

Dans le socle, `estUnePieceInterne` (`packages/plugin-socle/src/composant/contract/imbriques.ts`)
et `porteurDuMaitre` remontent déjà d'une instance à son component set.

## 3. Les recherches

| # | Question | État |
|---|---|---|
| R1 | Que lit l'API Plugin de Figma d'une pièce interne, locale ou venue d'une bibliothèque ? | rendue |
| R2 | Comment les formats et les design systems décrivent-ils les sous-parties d'un composant ? | rendue |
| R3 | Comment le code React et TypeScript type-t-il un sous-composant privé, et que peut comparer la parité ? | rendue |
| R6 | Comment chaque champ du contrat de l'hôte reçoit-il son équivalent pour une pièce, avec les catalogues partagés du format et sans perte ? | rendue, dans [ETUDE-FORMAT-DES-PIECES.md](./ETUDE-FORMAT-DES-PIECES.md) |

## 4. Résultats

### R1. Ce que Figma laisse lire

Une pièce locale se lit en entier. `getMainComponentAsync()` rend le variant
posé, et son `parent` est le `ComponentSetNode`. Ses `children` sont toutes les
variantes, et `componentPropertyDefinitions` liste toutes les propriétés du set
avec leur défaut et, pour une propriété `VARIANT`, toutes ses options
([ComponentSetNode](https://developers.figma.com/docs/plugins/api/ComponentSetNode/)).
Les types de propriété sont `BOOLEAN`, `TEXT`, `INSTANCE_SWAP`, `VARIANT` et
`SLOT` ([ComponentPropertyType](https://developers.figma.com/docs/plugins/api/ComponentPropertyType/)).
`InstanceNode.componentProperties` donne seulement les valeurs de l'instance
posée, et `variantGroupProperties` est déprécié.

Une pièce venue d'une autre bibliothèque ne se lit pas toujours, car le
`parent` d'un composant distant peut être `null`
([parent](https://developers.figma.com/docs/plugins/api/properties/nodes-parent/)).
Ce cas sort du cas d'usage.

L'aide de Figma cite seulement le point pour masquer un composant à la
publication. Le tiret bas y est cité pour les collections de variables
([Hide when publishing](https://help.figma.com/hc/en-us/articles/360039238193-Hide-styles-components-and-variables-when-publishing)).
Un signalement sur le forum de Figma dit que `_` ne masque plus les
composants, et le support n'y a pas répondu.

Une variante d'une autre page demande que sa page soit chargée : `PageNode.children`
lève une exception sur une page non chargée
([accessing-document](https://developers.figma.com/docs/plugins/accessing-document/)).
Aucune source ne dit si `getMainComponentAsync()` charge la page de la pièce.
Aucune profondeur maximale d'imbrication n'est documentée, et aucune mesure
publique ne chiffre la lecture d'un set de 50 variantes.

Un essai dans Figma lèvera l'incertitude : poser dans un hôte une pièce `.X`
rangée sur une autre page, puis lire
`(await instance.getMainComponentAsync()).parent.children` sans `loadAsync`.

### R2. Comment les autres formats décrivent une sous-partie

Les formats de composants décrivent leurs parties dans la déclaration de
l'hôte. Aucun ne déclare une partie une fois pour plusieurs composants.

- Le format d'anatomie de Spectrum range les parties dans un tableau à plat
  de l'hôte. Chaque partie a un nom, une description, `required`, `presentIn`
  et `contains`, et `contains` porte l'imbrication. Un vocabulaire commun
  (`anatomy-terms.json`) garde les mêmes noms d'un composant à l'autre
  ([anatomy-format](https://opensource.adobe.com/spectrum-design-data/spec/anatomy-format/)).
- Le Custom Elements Manifest liste `slots` et `cssParts` à plat dans la
  déclaration de l'élément, sans imbrication
  ([schema.d.ts](https://github.com/webcomponents/custom-elements-manifest/blob/main/schema.d.ts)).
- Zag écrit la liste des parties une fois par composant avec `createAnatomy`.
  Chaque partie reçoit des attributs `data-scope` et `data-part`
  ([create-anatomy.ts](https://raw.githubusercontent.com/chakra-ui/zag/main/packages/anatomy/src/create-anatomy.ts)).
- Le gabarit de spécification d'Open UI demande l'arbre DOM complet d'un
  composant qui en imbrique d'autres
  ([gabarit](https://open-ui.org/component-spec-template/)).
- Code Connect connecte chaque composant à part. Dans Dev Mode, l'hôte insère
  le snippet de son enfant, et `figma.children()` ne voit que les enfants
  directs ([doc React](https://developers.figma.com/docs/code-connect/react/),
  [issue 372](https://github.com/figma/code-connect/issues/372)).
- Storybook affiche le tableau des props d'un sous-composant
  (`subcomponents`), pour la documentation seulement
  ([doc](https://storybook.js.org/docs/writing-stories/stories-for-multiple-components)).

Les formats de schéma, eux, définissent une fois et renvoient. JSON Schema
range les sous-schémas réutilisés dans `$defs` et les cite par `$ref`
([structuring](https://json-schema.org/understanding-json-schema/structuring)).
OpenAPI range les siens dans `components`, et un élément non cité n'y a aucun
effet ([spec 3.1.0](https://spec.openapis.org/oas/v3.1.0.html#components-object)).
Le format DTCG cible un sous-champ par un `$ref` en JSON Pointer
([format 2025.10](https://www.designtokens.org/tr/2025.10/format/)).

Aucune source ne mesure l'effet de ces deux choix sur la taille d'un fichier ou
sur sa lecture par un agent.

| Choix de P22 | Ce que font les sources |
|---|---|
| Emplacement du bloc | Dans la déclaration de l'hôte (Spectrum, CEM, Open UI), ou dans un bloc de définitions à côté de la racine (`$defs`, `components`) |
| Par hôte ou commun | Par hôte pour tous les formats de composants. Un vocabulaire commun ou un fichier propre à l'enfant (Storybook, Code Connect) assure la cohérence |
| À plat ou en arbre | À plat avec un champ de contenu (Spectrum `contains`), à plat sans imbrication (CEM, Zag), ou en arbre (Open UI) |
| Renvoi d'une instance vers sa variante | Seuls `$ref` et les références DTCG renvoient à une définition. Aucun format de composant ne renvoie à une variante nommée |

### R3. Ce que le code fait d'un sous-composant privé

Les bibliothèques n'ont aucune convention commune pour écrire une pièce
interne.

- shadcn/ui exporte chaque partie à part (`Card`, `CardHeader`) et type ses
  props en ligne, sans interface `CardProps`
  ([card.tsx](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/card.tsx)).
- Mantine déclare `ButtonProps` et attache `Button.Group` en propriété
  statique. Ses parties stylables forment une union de noms, comme
  `'root' | 'inner' | 'label'` ([Button.tsx](https://raw.githubusercontent.com/mantinedev/mantine/master/packages/@mantine/core/src/components/Button/Button.tsx)).
- MUI remplace une partie par `slots` et lui passe ses props par `slotProps`.
  Les noms des parties vivent dans un type séparé, comme `BadgeSlots`
  ([Badge.d.ts](https://raw.githubusercontent.com/mui/material-ui/master/packages/mui-material/src/Badge/Badge.d.ts)).
- Primer range ses modules internes dans `src/internal` et les retire de la
  carte `exports` du paquet
  ([ADR-015](https://raw.githubusercontent.com/primer/react/main/contributor-docs/adrs/adr-015-internal-modules.md)).
- Un Server Component de Next.js ne peut pas lire `Menu.Item` sur un module
  client, et Dan Abramov recommande des exports nommés
  ([issue 51593](https://github.com/vercel/next.js/issues/51593)).

`react-docgen-typescript` part des exports du module et ignore une pièce non
exportée. Il ne gère pas de façon fiable `Object.assign(Button, { Ring })`
([parser.ts](https://raw.githubusercontent.com/styleguidist/react-docgen-typescript/master/src/parser.ts),
[issue 775](https://github.com/reactjs/react-docgen/issues/775)). Le
vérificateur de TypeScript, que l'Adaptateur emploie déjà, lit une déclaration
du fichier par son nom, exportée ou non.

L'Adaptateur cherche aujourd'hui l'interface `<Fichier>Props`
(`nomInterfaceAttendue`, `packages/adapter-typescript/src/parite.mjs`). Pour
une pièce, il chercherait `CardHeaderProps` dans le
fichier de l'hôte.

## 5. Les choix, expliqués

Chaque choix dit ce qui se décide, les options et la recommandation tirée des
recherches. Le mainteneur tranche.

### Choix 1. Où le contrat range-t-il les pièces internes ?

| Option | Conséquence |
|---|---|
| A. Un bloc à la racine du contrat, une entrée par pièce, nommée comme dans Figma | La pièce se décrit une fois, comme `$defs` en JSON Schema. Chaque instance posée renvoie à une entrée et à une variante |
| B. Dans `composes` | `composes` change de sens : il nomme aujourd'hui un composant qui a son propre contrat et que l'Exporter ne parcourt pas |

**Recommandation : A.** Un lecteur de `composes` ne doit pas apprendre à
distinguer deux sortes d'entrées.

### Décidé. Les règles d'usage ne déclarent plus un contrat

Le mainteneur sépare deux obligations. Aujourd'hui, une instance de
`.componentRules` qui nomme un composant imbriqué veut dire à la fois « il a
des règles » et « il a son propre contrat » : `sorteDeLImbrique`
(`packages/kit/src/referentiel/composition.ts`) teste les règles avant le
préfixe, et le commentaire d'`estUnePieceInterne`
(`packages/plugin-socle/src/composant/contract/imbriques.ts`) écrit qu'une
pièce interne n'aura jamais ni contrat ni règles. Une pièce qui a des
propriétés a besoin de règles, sans avoir de contrat.

| Composant imbriqué | Contrat propre | Règles d'usage |
|---|---|---|
| Publié, sans préfixe | obligatoire | obligatoires, comme aujourd'hui |
| Pièce préfixée, avec au moins une propriété | aucun | obligatoires, publiées dans le contrat de l'hôte |
| Pièce préfixée, sans propriété | aucun | aucune |

Le préfixe décide donc du contrat, et les propriétés décident des règles.
`sorteDeLImbrique` testera le préfixe avant les règles.

### Décidé. Comment l'obligation de règles d'une pièce s'applique

Le mainteneur a retenu ces quatre réponses.

| Question | Réponse |
|---|---|
| Où le designer pose-t-il les règles d'une pièce ? | Un bloc `.componentRules` à côté du maître de la pièce, sur sa page, comme pour un composant publié |
| Que fait l'export d'un hôte dont une pièce à propriétés n'a pas de règles ? | Le même point bloquant que pour un composant publié sans règles (`pointsDesImbriques`), qui nomme la pièce |
| « Créer les règles d'usage » couvre-t-il les pièces ? | Oui : il pose aussi le bloc de chaque pièce à propriétés, avec un marqueur `[À compléter]` par propriété |
| Où le contrat range-t-il ces règles ? | Dans l'entrée de la pièce, sous la même forme que le champ `intent` de l'hôte |

### Choix 3. Une pièce posée dans une autre pièce se décrit-elle à plat ?

| Option | Conséquence |
|---|---|
| A. À plat : chaque pièce a son entrée, et une variante renvoie aux pièces qu'elle contient | Une pièce se décrit une fois, même posée à deux profondeurs. C'est le choix de Spectrum (`contains`) |
| B. En arbre, la pièce intérieure décrite dans la pièce qui la contient | Une pièce posée à deux endroits se décrit deux fois |

**Recommandation : A.**

### Choix 4. Quels tokens une pièce cite-t-elle ?

Une pièce propre à un composant lie, dans son maître, les tokens de ce
composant. L'instance posée dans l'hôte peut remplacer une liaison.

| Option | Conséquence |
|---|---|
| A. L'entrée de la pièce cite les liaisons de son maître, et l'instance posée cite ses remplacements | Le contrat dit ce que Figma dessine, à chaque niveau |
| B. Le contrat ne cite que les liaisons de l'instance posée | Les tokens d'une variante que l'hôte ne pose pas disparaissent, c'est le défaut actuel |

**Recommandation : A.** La règle d'Architect « un layer se lie aux tokens de
son propre composant » s'applique au maître de la pièce comme à l'hôte.

### Choix 5. Le tiret bas désigne-t-il encore une pièce interne ?

Figma documente seulement le point pour masquer un composant à la
publication. Recommandation : garder les deux préfixes dans
`sorteDeLImbrique`, qui ne dépend pas de la publication.

### Choix 6. À qui appartiennent les couleurs d'une pièce et d'une dépendance posées dans l'hôte ?

Le cas vient du Button du Playground. `.sizeWrapperButton` a trois axes de taille et porte le texte et les icônes. Son maître peint un fond gris, et des couleurs primitives sur le texte et les icônes : ces couleurs servent seulement à voir la pièce dans Figma. Chaque variant de Button les surcharge toutes.

Ce que fait la 14.0, lu dans le format et le socle :

- `sorteDeLImbrique` classe `.sizeWrapperButton` comme wrapper de dimensions, avant le préfixe. Ses props rejoignent celles de Button, et l'Exporter parcourt son contenu comme celui de Button. Le contrat publie donc les couleurs effectives de chaque variant de Button, c'est-à-dire les surcharges ; les couleurs du maître n'y entrent jamais.
- Le mainteneur veut remplacer les icônes de la pièce par des instances du composant `Icon`. `Icon` aura des règles d'usage et son propre contrat : c'est une dépendance (décision du mainteneur).
- Une dépendance n'est pas parcourue : le relevé des couleurs écarte tout ce qui vit sous elle (`extractVariantTokens.ts`, paramètre `composed`). Les surcharges qu'un hôte pose dans une dépendance ne publient que `characters` et `visible` (FORMAT.md, « La frontière avec la composition »). La couleur que Button donne à l'icône, dans chaque variant, sort donc du contrat sans avertissement. Le code reconstruit ne sait plus que l'icône est `foreground` en Hover.

Le choix 4, option A, publierait au contraire les couleurs du maître de la pièce comme ses tokens propres : le gris et les primitives entreraient dans le contrat comme des décisions de design. Un développeur ou un agent les coderait comme valeurs par défaut, et la règle d'Architect « un calque se lie aux tokens de son propre composant » signalerait des primitives qui n'ont aucune importance.

| Option | Conséquence |
|---|---|
| A. Partage par nature de valeur : la structure, les propriétés, les variantes et les dimensions d'une pièce se lisent sur son maître ; ses couleurs se lisent sur chaque instance posée, et celles du maître sont des couleurs d'aperçu, jamais publiées | Le contrat dit les couleurs que l'hôte décide. Une couleur d'aperçu qu'une instance ne surcharge pas fuit dans le rendu : l'Exporter avertit, et Architect la signale |
| B. Choix 4 tel quel : le maître publie ses couleurs, l'instance ses remplacements | Les couleurs d'aperçu entrent dans le contrat et se confondent avec les couleurs voulues |

Pour une dépendance qui reçoit sa couleur de l'hôte, comme `Icon`, l'option A va plus loin : le contrat de la dépendance dit que sa couleur est fournie par l'hôte, et l'hôte publie la couleur qu'il pose sur le slot de l'icône. C'est la seule surcharge de peinture qui deviendrait une donnée du contrat.

**Recommandation : A.** Elle modifie le choix 4 pour les couleurs. Elle répond aussi en partie à la question Q1 de l'étude, puisqu'un wrapper garde ses dimensions et que ses couleurs suivent la même règle qu'une pièce. Un essai sur le Playground la confirme avant le plan : poser des instances d'`Icon` avec règles dans `.sizeWrapperButton`, exporter Button, et lire ce que le contrat publie pour la couleur des icônes.

### Parité

Recommandation : l'Adaptateur compare les props d'une pièce quand le fichier de
l'hôte déclare `<Pièce>Props`, exportée ou non, et le rapport dit « pièce non
comparée » sinon. Exiger un export contredirait la pratique de Primer.

## 6. Ce qui reste à faire avant le plan

- Le mainteneur répond aux questions Q1 à Q6 du §9 de
  [ETUDE-FORMAT-DES-PIECES.md](./ETUDE-FORMAT-DES-PIECES.md). L'étude confirme
  les recommandations des choix 1, 3 et 4.
- Le mainteneur tranche les choix 1, 3, 4, 5 et 6 et la parité. La séparation du
  contrat et des règles, et l'application de l'obligation de règles, sont
  décidées.
- Un essai dans Figma, décrit sous R1, établit la lecture d'une pièce rangée
  sur une autre page. Un second essai, décrit sous le choix 6, établit ce que
  le contrat publie de la couleur d'une dépendance `Icon` posée dans un wrapper.
- Le mainteneur fournit un fichier Figma de test : un hôte qui pose une pièce
  à plusieurs variantes et booléens, dont une variante que l'hôte n'emploie
  pas, et le bloc `.componentRules` de la pièce.

## 7. Le sujet en entier

P22 ne se limite pas aux pièces préfixées. Il règle ce qu'un hôte publie de chaque composant qu'il embarque, et qui en possède chaque valeur. Douze sous-sujets le composent ; chacun touche le format, l'Exporter, le kit et Architect.

| # | Sous-sujet | Où il est traité |
|---|---|---|
| S1 | Classification d'un imbriqué : dépendance, wrapper de dimensions, pièce, détail, et les cas mixtes (wrapper préfixé, pièce qui contient une dépendance) | `sorteDeLImbrique`, étude Q1, critique C11 |
| S2 | Description d'une pièce dans l'hôte : bloc `pieces`, variantes non posées, propriétés, vues | choix 1 et 3, étude R6 |
| S3 | Propriété des valeurs : structure et dimensions au maître, couleurs à l'hôte, couleurs d'aperçu | choix 4 et 6 |
| S4 | Une dépendance qui reçoit sa couleur de l'hôte (`Icon`), et son lien avec les règles `@icons`, le slot d'icône et `INSTANCE_SWAP` | choix 6 |
| S5 | Les autres surcharges de l'hôte : texte, visibilité, échanges, contenu d'une propriété `SLOT` | étude Q3 et Q6 |
| S6 | Résolution : remplacements vides, remplacements imbriqués, liaisons qui traversent une pièce, `args` | critique C1 à C5 |
| S7 | Budget, dépliage fini et performance | critique C6 à C8 |
| S8 | Lecteurs, validation, cardinalité des dépendances, parité | critique C9 et C10, §Parité |
| S9 | Architect : relevé des pièces, règle des tokens propres, couleurs d'aperçu non surchargées, couleurs peintes dans une instance | choix 6, recherche de P31 sections 6 et 8 |
| S10 | Règles d'usage des pièces et leur création | décisions du §5 |
| S11 | Version 15.0, compatibilité, réexport, contrats de fixture | `docs/format/COMPATIBILITE.md`, `CHANGELOG-FORMAT.md` |
| S12 | Preuves : fixtures, fichier de test du mainteneur, essais R1 et du choix 6, recette sur le Playground | §6 |

Le prompt [PROMPT-AUDIT-ET-PLAN.md](./PROMPT-AUDIT-ET-PLAN.md) confie à un agent la recherche des failles de cette conception et l'écriture du plan.

## Questions au mainteneur

- [Choix 1. Où le contrat range-t-il les pièces internes ?](#choix-1-où-le-contrat-range-t-il-les-pièces-internes)
- [Décidé. Comment l'obligation de règles d'une pièce s'applique](#décidé-comment-lobligation-de-règles-dune-pièce-sapplique)
- [Choix 3. Une pièce posée dans une autre pièce se décrit-elle à plat ?](#choix-3-une-pièce-posée-dans-une-autre-pièce-se-décrit-elle-à-plat)
- [Choix 4. Quels tokens une pièce cite-t-elle ?](#choix-4-quels-tokens-une-pièce-cite-t-elle)
- [Choix 6. À qui appartiennent les couleurs d'une pièce et d'une dépendance posées dans l'hôte ?](#choix-6-à-qui-appartiennent-les-couleurs-dune-pièce-et-dune-dépendance-posées-dans-lhôte)

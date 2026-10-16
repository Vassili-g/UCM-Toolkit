# Une nomenclature des tokens, et le contrôle qui relève les écarts

**Statut :** notes de recherche. Aucune décision n'est prise ; la section 8
liste les questions à trancher.

Lecteur : le mainteneur, pour décider s'il faut un contrôle des noms, où le
ranger et dans quel ordre le construire.

## 1. La question

Dans un design system Figma, un même concept reçoit parfois deux noms selon
la branche où la variable a été créée : `error` ici, `danger` là ; `press`
dans une collection, `pressed` dans une autre. Le mainteneur cherche un
contrôle qui relise toutes les variables du système, relève ces écarts et,
une fois une nomenclature de base adoptée, signale chaque nom qui s'en
écarte.

Trois questions en découlent :

1. comment un tel contrôle peut fonctionner, avec et sans nomenclature
   déclarée ;
2. dans quel outil le ranger : UCM Token Explorer, UCM Contract Exporter,
   `ucm check`, ou un plugin dédié ;
3. quels noms nos tokens réels emploient déjà.

## 2. Ce que le dépôt fait déjà des noms

| Mécanisme | Fichier | Ce qu'il fait |
|---|---|---|
| Projection Figma vers token | `normalizeName`, [names.ts](../../../../../../packages/kit/src/format/names.ts) | Met chaque segment en minuscules et remplace les espaces par des tirets |
| Collision de noms | `VariableIndex.ambiguous`, [variables.ts](../../../../../../packages/plugin-exporter/src/variables.ts) | Signale deux variables dont les noms donnent le même chemin (`Foo Bar` et `foo-bar`) |
| Synonymes d'états | `STATE_SELECTORS`, [semantics.ts](../../../../../../packages/plugin-exporter/src/contract/semantics.ts) | Accepte `hover` et `hovered`, `press` et `pressed`, `focus` et `focused`, `disable` et `disabled` ; un état inconnu produit un avertissement |
| Synonymes de tailles | `SIZE_VALUES`, même fichier | Reconnaît `small`, `medium`, `large`, `big` comme `sm`, `md`, `lg` |
| Vocabulaire de la table en dossiers | [dossiers.ts](../../../../../../packages/kit/src/emplois/dossiers.ts) | Fixe les noms `solid`, `surface`, `page`, `default`, `hover`, `pressed`, `foreground`, `border`, `focus`, `disabled` |
| Profil UCM de l'explorateur | [profilUcm.ts](../../../../../../packages/plugin-explorateur/src/integrations/profilUcm.ts) | Quatre règles d'architecture en information, activées par le designer, avec des exceptions par fichier |

Le moteur absorbe donc une partie des variantes de nommage au moment de
l'export. Aucun module ne les relève pour que le designer les réduise à la
source.

**Borne de la lecture par `tokens.json`.** `normalizeName` efface la casse et
les espaces. `fontSize`, `Font Size` et `fontsize` donnent `fontsize`. Un
contrôle qui ne lit que l'export ne voit donc ni une casse mélangée ni un
espace remplacé ; seul un lecteur des noms Figma les voit.

## 3. Les noms de nos tokens réels

Le relevé porte sur `UCM-Playground/src/tokens/tokens.json`. Le fichier de
`intencial-library` est identique octet pour octet. Il compte 760 feuilles
dans huit collections. Le script [inventorier-noms.mjs](../../Mesures/inventorier-noms.mjs)
produit les chiffres de cette section :

```text
node inventorier-noms.mjs <tokens.json> [--json]
```

### 3.1 Les collections et leurs termes

| Collection | Feuilles | Termes, hors crans |
|---|---|---|
| `components` | 369 | `button`, `alert`, `tilelink`, `icons`, `stresstest` ; `colors`, `sizes` ; palettes `primary`, `secondary`, `info`, `success`, `warning`, `error` ; variantes `contained`, `outlined`, `text`, `standard`, `filled` ; états `default`, `hover`, `focus`, `press`, `disable` ; rôles `background`, `foreground`, `border`, `ring`, `icon` ; tailles `small`, `medium`, `big`, `xs` à `xl`, `base` ; mesures `padding-x`, `padding-y`, `gap`, `border-radius`, `radius`, `height`, `width` |
| `primitives` | 175 | `colors` et neuf teintes, `dimensions`, `fontsize`, `lineheight`, `letterspacing`, `fontweight`, `fontfamily` ; tailles `4xs` à `9xl`, `base`, `full`, `none` |
| `typography` | 60 | `display`, `headline`, `title`, `body`, `label` ; `large`, `medium`, `small` ; `fontsize`, `lineheight`, `fontweight`, `letterspacing` |
| `color-utilities` | 54 | `success`, `warning`, `info`, `danger`, `neutral`, `white`, `black` |
| `color-brands` | 44 | marques `intencial`, `marque-2` ; `primary`, `secondary` |
| `layouts` | 31 | `sizing`, `radius`, `stroke` ; `xs` à `4xl`, `full`, `outline`, `ring` |
| `tests` | 17 | un token par type, suffixé `-2` à `-5` |
| `color-brand-tokens` | 10 | `primary`, `secondary` ; `subtlest`, `subtle`, `default`, `emphasis`, `strong` |

### 3.2 Les écarts relevés

Chaque ligne nomme les deux termes, leur nombre d'occurrences et le fait qui
les rapproche. Un écart n'est pas une erreur : la section 8 demande lesquels
le mainteneur veut réduire.

**Un concept, deux termes.**

| Termes | Occurrences | Fait relevé |
|---|---|---|
| `error` / `danger` | 48 / 10 | `components.button.colors.error.*` vise `color-utilities.danger.*` |
| `contained` / `filled` | 72 / 12 | La variante pleine du bouton et celle de l'alerte visent la même couleur, `color-utilities.danger.700` pour la palette `error` |
| `text` / `foreground` | 1 rôle, 1 suffixe / 107 | `stresstest.info.head.colors.text` et `text-color-tag` nomment la couleur du texte que `foreground` nomme partout ailleurs |
| `big` / `large` | 4 / 20 | `button.sizes.big` ; `typography.*.large` |
| `small`, `medium` / `sm`, `md`, `lg` | 24, 24 / 5, 1, 5 | Mots entiers dans `components` et `typography`, abréviations dans `layouts` et `primitives` |
| `base` / `md`, `medium` | 12 / 1, 24 | `base` occupe le cran du milieu dans `icons.sizes`, `fontsize`, `lineheight`, `letterspacing` |
| `sizing` / `dimensions` / `sizes` | 20 / 29 / 63 | Trois groupes de mesures : `layouts.sizing`, `primitives.dimensions`, `components.*.sizes` |
| `radius` / `border-radius` | 11 / 6 | `layouts.radius`, `stresstest.*.radius` ; `button.sizes.*.border-radius`, `alert.sizes.border-radius` |
| `gap-col`, `gap-rows` / `gap-x`, `gap-y` | 2, 1 / 1, 1 | Deux composants du même groupe `stresstest` |
| `padding-x`, `padding-y` / `padding-left`, `padding-top` / `padding` | 4, 4 / 1, 1 / 1 | Trois découpes de la marge intérieure |
| `stroke` / `border-width` / `sizes.border` | 2 / 2 / 1 | Trois noms d'épaisseur de bordure ; `stroke.ring` et `stresstest.warning.badge.sizes.border` visent `primitives.dimensions` |
| `icon` / `icons` / `icon-size` | 13 / 6 / 1 | Rôle `icon` de l'alerte, composant `icons`, mesure `icon-size` du badge |

**Une flexion.** Les tokens du Playground écrivent `press` et `disable` ; la
table du kit et la collection `theme` remaniée dans Figma écrivent `pressed`
et `disabled`. Les groupes sont au pluriel (`colors`, `sizes`), le token de
test au singulier (`tests.color`).

**Un terme, plusieurs concepts.** `default` désigne l'état au repos dans
`button.colors.*.*.default`, l'intensité centrale dans
`color-brand-tokens.primary.default`, et la couleur de fond au repos dans
`solid/default` de la table du kit. `text` est une variante de bouton
(61 occurrences) et, une fois, un rôle de couleur. `ring` nomme une épaisseur
dans `layouts.stroke.ring` et une couleur dans `button.*.focus.ring`.

**Un ordre de segments différent.** Le relevé 5 du script trouve
`colors` aux profondeurs 2 et 4 de `components` :

| Composant | Forme du chemin |
|---|---|
| `button` | `components/button/colors/{palette}/{variante}/{état}/{rôle}` |
| `tilelink` | `components/tilelink/colors/{palette}/{état}/{rôle}` |
| `alert` | `components/alert/colors/{palette}/{variante}/{rôle}` |
| `stresstest` | `components/stresstest/{palette}/{partie}/colors/{rôle}` |

Les tailles suivent le même écart : `button/sizes/{taille}/gap`, mais
`alert/sizes/gap` sans niveau de taille. Un qualificatif s'écrit tantôt en
segment, tantôt en suffixe : `background-tag`, `padding-x-tag`.

**Des mots composés écrits de deux façons.** `fontsize`, `lineheight`,
`letterspacing`, `fontweight`, `fontfamily` sont soudés ; `border-radius`,
`padding-x`, `max-width`, `icon-size` portent un tiret. L'export ayant mis
les noms en minuscules, la forme Figma des premiers (`fontSize` ou
`fontsize`) ne se lit pas dans le fichier.

**La langue et l'orthographe.** `marque-2` est le seul terme français.
`terracota` est l'orthographe espagnole ; l'anglais écrit `terracotta`.

**Des branches sœurs incomplètes.** Le relevé 6 liste 24 branches auxquelles
manque un enfant que leurs sœurs portent. Toutes celles des boutons et des
alertes sont voulues : le bouton `text` au repos et désactivé n'a pas de
fond, l'alerte `outlined` non plus. Ce relevé produit donc surtout des faux
positifs sur ce corpus.

### 3.3 Ce que la détection sans nomenclature trouve, et ce qu'elle rate

Le relevé 4 croise trois tests de chaînes sur les 105 mots du corpus.

| Test | Paires utiles | Paires sans rapport |
|---|---|---|
| Flexion (`+s`, `+d`, `+ed`) | `color`/`colors`, `size`/`sizes`, `icon`/`icons`, `outline`/`outlined` | aucune |
| Abréviation (initiale commune, lettres dans l'ordre) | `sm`/`small`, `md`/`medium`, `lg`/`large` | `lg`/`lineheight`, `lg`/`letterspacing`, `col`/`colors` |
| Distance d'édition 1 ou 2 | `subtle`/`subtlest` (voulue) | `bottom`/`button`, `grass`/`press`, `scale`/`small`, `badge`/`large`, `sizing`/`timing`, `right`/`height`, `string`/`strong` |

Les écarts les plus coûteux du corpus, `error`/`danger`, `contained`/`filled`,
`text`/`foreground`, `big`/`large`, ne ressemblent pas à leur synonyme. Aucun
test de chaînes ne les trouve ; seule une table de synonymes, ou la
comparaison des cibles d'alias, les rapproche. La distance d'édition, elle,
rapproche surtout des mots sans rapport.

## 4. Ce que font les design systems publics

Les systèmes lus écrivent presque tous une grammaire : des segments dans un
ordre donné. Peu fixent un vocabulaire fermé par position, et deux seulement
le vérifient par un programme. La recherche n'a trouvé aucun outil public qui
rapproche deux synonymes ; l'absence n'est pas prouvée.

| Système | Grammaire | Vocabulaire fermé | Vérification |
|---|---|---|---|
| [Nathan Curtis, EightShapes](https://nathanacurtis.substack.com/p/naming-tokens-in-design-systems-9e86c7444676) | Namespace, objet, base (catégorie, concept, propriété), modificateurs (variante, état, échelle, mode) ; l'auteur écrit qu'aucun ordre ne domine | Non ; une liste de termes retenus et de leurs alternatives | Aucune |
| [Adobe Spectrum](https://github.com/adobe/spectrum-design-data) | Nom stocké en objet à champs : `property`, `colorFamily`, `scaleIndex`, `variant`… ([token-names](https://github.com/adobe/spectrum-design-data/tree/main/packages/token-names)) | Oui : un fichier d'énumération par champ, 33 dans [`fields/`](https://github.com/adobe/spectrum-design-data/tree/main/packages/design-data/fields) | CLI `design-data validate`, schémas JSON et 59 règles ([rules.yaml](https://github.com/adobe/spectrum-design-data/blob/main/packages/design-data-spec/rules/rules.yaml)) |
| [GitHub Primer](https://primer.style/product/primitives/token-names/) | `prefix`, `namespace`, `pattern`, `variant`, `property`, `variant`, `scale` ; seul `property` est obligatoire, une seule variante par token | Partiel : `default`, `muted`, `emphasis` pour les couleurs, `xsmall` à `xxlarge` pour les tailles, `thin`, `thick`, `thicker` pour les épaisseurs | `lint:tokens` (schéma Zod, [regex de casse](https://raw.githubusercontent.com/primer/primitives/main/src/schemas/tokenName.ts)) ; [`check:removed-tokens`](https://raw.githubusercontent.com/primer/primitives/main/scripts/checkRemovedTokens.ts) |
| [Atlassian](https://atlassian.design/foundations/tokens/design-tokens) | `Foundation`, `Property`, `Modifier` facultatif | Non publié | [Plugin ESLint](https://atlassian.design/components/eslint-plugin-design-system/usage) sur l'usage et la dépréciation des tokens, pas sur leurs noms |
| [GitLab Pajamas](https://design.gitlab.com/product-foundations/design-tokens-reading) | Dix segments, de `group` à `state` ; un terme n'occupe jamais deux positions dans un même token | Non vérifié | Non vérifié |
| [Salesforce SLDS](https://www.salesforce.com/blog/what-are-styling-hooks/) | `slds`, portée `g` ou `c`, catégorie, propriété, rôle, état | Non vérifié | Un SLDS Linter signale des hooks renommés ; pages de règles inaccessibles |
| [IBM Carbon](https://carbondesignsystem.com/elements/color/tokens/) | Élément d'interface en tête (`background`, `layer`, `field`, `text`), état en suffixe, numéro de couche (`layer-hover-01`) | Non trouvé | Non trouvée |
| Material 3 | `md.ref`, `md.sys`, `md.comp`, puis catégorie et propriété ; préfixe `on-` pour le contenu posé sur une surface | Non vérifié : [page officielle](https://m3.material.io/foundations/design-tokens/overview) illisible | Non trouvée |
| Shopify Polaris | Discussions ouvertes seulement ([#6613](https://github.com/Shopify/polaris-react/discussions/6613), [#10225](https://github.com/Shopify/polaris/discussions/10225)) | Non | Aucun test de noms trouvé |
| [Style Dictionary](https://styledictionary.com/reference/hooks/transforms/predefined/) | CTI : catégorie, type, élément, sous-élément, état, déduits de la position | Non | Aucune ; transforms de casse seulement |
| [DTCG](https://www.designtokens.org/tr/drafts/format/) | Aucune grammaire de segments ; noms sensibles à la casse, sans `$` initial, `{`, `}` ni `.` | Non | Un outil peut avertir de deux noms qui ne diffèrent que par la casse |

**Spectrum est le seul modèle complet.** Le nom y est une donnée structurée,
et la chaîne s'en déduit. La règle SPEC-007 exige que le nom hérité se
régénère depuis l'objet ; SPEC-009 exige que chaque champ prenne une valeur
de son énumération ; SPEC-017 classe un nom en simple chaîne comme une dette.
Ce modèle suppose un dépôt de données que le design system écrit lui-même,
pas des variables saisies dans Figma.

**Primer contrôle la forme, pas le vocabulaire.** Sa regex refuse un
caractère interdit ou une majuscule initiale. Son second contrôle refuse
qu'un token disparaisse sans entrée dans `removed.json`, où la valeur est
`null` pour une suppression ou le nouveau nom pour un renommage.

### Recommandations qui reviennent d'un système à l'autre

- **Synonymes.** Curtis propose une table de termes retenus : `error` plutôt
  que `danger`, `alert` ou `critical` ; `information` plutôt que `info` ;
  `font` plutôt que `type`, `typography` ou `text`. Il demande d'éviter les
  homonymes comme `type` et `text`. Les énumérations de Spectrum outillent
  la même idée.
- **États.** Curtis liste `default`, `hover`, `press` ou `active`, `focus`,
  `disabled`, `visited`, `error`. Carbon et Salesforce placent l'état en dernier.
  Aucun système lu ne tranche entre `hover` et `hovered`.
- **Ordre.** Namespace en tête et modificateurs en fin chez Curtis, Primer,
  Pajamas et Salesforce. Carbon place l'état avant le numéro de couche.
- **Un terme, une position.** Primer limite un token à une variante ;
  Pajamas interdit qu'un terme occupe deux positions.
- **Abréviations.** Curtis préfère des noms courts (`font`, tailles en
  t-shirt) et demande surtout qu'une convention existe ; il ne tranche pas
  `bg` contre `background`. Primer écrit `bgColor` et `fgColor` sans en faire
  une règle écrite.

### Renommer sans casser les consommateurs

| Système | Mécanisme |
|---|---|
| Atlassian | Actif, puis déprécié (mineure), puis supprimé en douceur avec erreurs (mineure suivante), puis supprimé (majeure) ; `eslint --fix` migre le code ([Forge](https://developer.atlassian.com/platform/forge/design-tokens-and-theming/)) |
| Primer | `removed.json` : ancien nom vers nouveau nom ou `null` |
| Spectrum | `deprecated`, `replaced_by`, `plannedRemoval` ; la cible de `replaced_by` doit exister |
| DTCG | `$deprecated`, booléen ou texte, hérité par un groupe |

Un renommage de nomenclature change le chemin publié dans `tokens.json`, donc
la référence des contrats et la variable CSS du consommateur. Les quatre
systèmes gardent une table de l'ancien nom vers le nouveau ; UCM n'en a pas
aujourd'hui. La [piste du diff sémantique](../../../Diff%20Sémantique/PLAN-DIFF-SEMANTIQUE.md)
touche la même question.

## 5. Les outils et les techniques de détection

### 5.1 Les outils

| Outil | Lieu | Ce qu'il vérifie | Déclaration de la règle |
|---|---|---|---|
| [Terrazzo](https://terrazzo.app/docs/linting/) `core/consistent-naming` | CI | Une seule casse : kebab, camel, Pascal, snake ou constante, ou une fonction personnalisée | `lint.rules`, exclusions par globs |
| Terrazzo `core/required-children`, `core/required-modes` | CI | Les enfants ou les modes qu'un groupe doit porter | Globs déclarés |
| [Hypermatic Design Token Naming Linter](https://www.hypermatic.com/tools/design-token-naming-linter/) | Navigateur | Casses et séparateurs mélangés, caractères interdits, collisions après aplatissement, profondeur | Un style préféré et une profondeur maximale |
| [Style Dictionary](https://styledictionary.com/reference/logging/) | CI | Collisions de noms ; `log.warnings: 'error'` fait échouer le build | Aucune règle de noms |
| [Specify](https://docs.specifyapp.com/reference/parsers/change-case) `change-case` | CI | Rien : il convertit la casse | Regex de sélection |
| [Tokens Studio](https://docs.tokens.studio/manage-tokens/token-names/technical-specs) | Figma | Rien ; la documentation recommande une casse et des caractères | Aucune |
| [Design Lint](https://github.com/destefanis/design-lint) | Figma | Styles manquants et rayons, pas les variables | Code à forker |
| Supernova, Knapsack, zeroheight | Plateformes | Aucune validation de noms trouvée ; renommer une variable rompt son lien dans [zeroheight](https://help.zeroheight.com/hc/en-us/articles/35887032233371-Figma-Working-with-Figma-variables-in-zeroheight) | Aucune |

Les plugins communautaires de renommage en lot (Renamer, Batch rename
variables, TokenOps) n'ont pas pu être ouverts. Aucun outil trouvé ne
détecte un synonyme, un ordre de segments différent ou un segment manquant
sans règle déclarée. Seul Terrazzo vérifie une structure, et il faut la lui
déclarer.

### 5.2 Les techniques

La recherche sur les identifiants de code définit la cohérence d'un
vocabulaire comme une correspondance un à un entre concepts et noms : ni
synonyme (deux noms, un concept) ni homonyme (un nom, deux concepts)
([Deißenböck et Pizka, 2006](https://wwwbroy.in.tum.de/publ/papers/deissenboeck_pizka_identifier_naming.pdf)).
Leur outil est un dictionnaire des identifiants, tenu à jour par l'équipe.
[Lawrie, Feild et Binkley](https://link.springer.com/article/10.1007/s10664-006-9032-2)
découpent un identifiant en mots de dictionnaire et en abréviations connues,
puis mesurent la consistance des synonymes. [Kim et Kim, 2016](https://link.springer.com/article/10.1007/s10664-015-9369-5)
mesurent qu'un dictionnaire de mots du domaine réduit les fausses alertes,
avec une précision de 85 % et un rappel de 84 %. Ces trois sources ont été
lues par leur résumé : les PDF n'ont pas pu être ouverts.

Appliquées à nos tokens, ces techniques donnent les signaux suivants :

| Signal | Ce qu'il trouve | Coût en faux positifs, mesuré en 3.3 |
|---|---|---|
| Flexion d'un mot (`+s`, `+ed`) | `press`/`pressed`, `color`/`colors` | Nul sur le corpus |
| Abréviation (initiale commune, lettres dans l'ordre) | `sm`/`small`, `lg`/`large` | Moyen : `lg`/`lineheight` |
| Distance d'édition | Presque rien d'utile | Élevé |
| Table de synonymes | `error`/`danger`, `big`/`large`, `text`/`foreground` | Nul, mais la table s'écrit à la main |
| Deux termes à la même position qui visent la même cible d'alias | `error`/`danger`, `contained`/`filled` | Non mesuré ; signal propre aux tokens, absent de la littérature lue |
| Casse mélangée dans une collection | `fontSize` et `font-size` | Invisible dans `tokens.json`, lisible dans Figma |
| Terme à plusieurs profondeurs | L'ordre de `stresstest` | Faible |
| Enfant manquant dans une branche sœur | Rien d'utile sur ce corpus | Élevé : les absences sont voulues |

Le rapprochement par cible d'alias est le seul signal automatique qui trouve
les synonymes sans ressemblance de chaînes. Il demande la valeur de chaque
variable, donc un lecteur qui résout les alias. L'explorateur le fait déjà
(`resolution.ts`).

### 5.3 Ce que l'API Figma permet

| Fait | Source |
|---|---|
| `Variable.name` se lit et s'écrit ; l'exemple officiel renomme par une affectation de `name` | [Working with variables](https://developers.figma.com/docs/plugins/working-with-variables) |
| Un alias et une liaison désignent la variable par son `id`, que le renommage ne change pas | Même page ; effet sur les liaisons à vérifier dans Figma |
| Une variable de bibliothèque lue par `teamLibrary` n'expose que `name`, `key` et `resolvedType` ; la permission `teamlibrary` est requise | [LibraryVariable](https://developers.figma.com/docs/plugins/api/LibraryVariable/), [teamLibrary](https://developers.figma.com/docs/plugins/api/figma-teamlibrary/) |
| `codeSyntax` porte un nom par plateforme (WEB, ANDROID, iOS), distinct de `name` | [Variable](https://developers.figma.com/docs/plugins/api/Variable/) |
| Une collection porte au plus 5 000 variables | [Aide Figma](https://help.figma.com/hc/en-us/articles/15145852043927) |

Un contrôle des noms d'une bibliothèque lit donc ses variables dans le
fichier de la bibliothèque, où elles sont locales. Depuis un fichier
consommateur, il ne voit que les noms, sans valeurs ni alias : le signal par
cible d'alias y est perdu.

## 6. Comment le contrôle pourrait fonctionner

### 6.1 Deux temps : relever, puis déclarer

**Premier temps, sans nomenclature.** Le contrôle relève les termes de
chaque collection et propose des paires candidates : flexions, abréviations,
table de synonymes d'amorce, termes qui visent la même cible. Le designer
juge chaque paire : même concept, et quel terme garder ; ou concepts
distincts. Chaque jugement devient une ligne de la nomenclature. La
section 3 de ce document applique ce premier temps à la main.

**Second temps, avec nomenclature.** Le contrôle compare chaque nom à la
nomenclature et relève les écarts. Une nomenclature peut porter trois
niveaux de règles, du moins coûteux à tenir au plus coûteux :

| Niveau | Règle | Exemple de constat | Modèle du marché |
|---|---|---|---|
| 1. Forme | Une casse et un séparateur par segment | `fontSize` dans une collection en kebab | Terrazzo, Primer |
| 2. Termes | Un terme retenu et les termes qu'il remplace | `press` : écrire `pressed` | Table de Curtis |
| 3. Grammaire | Les positions d'une collection, et un vocabulaire fermé par position | `stresstest/info/base/colors/border` : `colors` attendu en troisième position | Spectrum, Primer, Pajamas |

Le niveau 3 décrit une architecture. Il entre en tension avec la règle de
l'explorateur, qui ne réserve aucun nom de collection, et avec celle
d'`ucm check`, qui ne bloque que sur une variable manquante. Il ne peut donc
être qu'une option, déclarée collection par collection.

### 6.2 Une forme possible du fichier

Une esquisse, pour fixer les idées ; ni le nom du fichier ni ses clés ne
sont décidés :

```json
{
  "casse": "kebab",
  "termes": {
    "pressed": ["press", "active"],
    "disabled": ["disable"],
    "error": ["danger"],
    "foreground": ["text", "fg"],
    "large": ["big", "lg"]
  },
  "distincts": [["subtle", "subtlest"]],
  "grammaires": {
    "components": "{composant}/colors/{palette}/{variante}/{état}/{rôle}"
  }
}
```

`distincts` garde les paires que le designer a jugées différentes, pour que
le premier temps ne les repropose pas. Un même mot peut être un synonyme à
une position et un autre concept ailleurs : `text` est une variante de
bouton et, dans `stresstest`, un rôle de couleur. Une ligne de `termes`
devrait donc pouvoir viser une position, pas seulement un mot.

### 6.3 Une nomenclature commune à UCM

Le kit fixe déjà des termes : `pressed`, `disabled`, `foreground`, `border`,
`focus` dans `dossiers.ts`, les états reconnus dans `semantics.ts`. Une
nomenclature par défaut pourrait les reprendre, publiée par
`@ucm-kit/core`, et le dépôt du design system l'étendrait ou la
remplacerait. Le moteur garderait ses synonymes d'export pour les fichiers
qui n'adoptent pas la nomenclature.

### 6.4 Ce que le contrôle ne fait pas

- Il ne renomme rien. Un renommage change le chemin publié, donc les
  contrats et le code consommateur. Ce geste demande une table de l'ancien
  nom vers le nouveau (section 4).
- Il ne bloque rien. Ses constats sont en information, comme le profil UCM
  et le diagnostic des contrastes d'`ucm check`.
- Il ne conclut pas qu'un écart est une faute. `subtle` et `subtlest` se
  ressemblent et nomment deux crans voulus.

## 7. Où ranger le contrôle

| Critère | UCM Token Explorer | UCM Contract Exporter | `ucm check` en CI | Plugin dédié |
|---|---|---|---|---|
| Lit les noms Figma, casse comprise | Oui | Oui | Non : noms normalisés | Oui |
| Lit toutes les variables du fichier | Oui, locales et cibles d'alias | Oui, à l'export des tokens | Celles de `tokens.json` | Oui |
| Résout les alias, donc le signal par cible | Oui (`resolution.ts`) | Oui | Oui, en lisant les références | À écrire |
| Moment | Pendant que le designer nomme | À la publication | À la pull request | Pendant que le designer nomme |
| Précédent de règles optionnelles | Profil UCM : quatre règles en information, exceptions par fichier | Aucun : son prévol juge la publication | Diagnostic des contrastes en information | Aucun |
| Peut renommer | Non : lecture seule, tenue par `loiDeLectureSeule.test.ts` | Non : un seul geste d'écriture, les règles d'usage | Non | Oui, si on lui en donne le droit |
| Accès à une nomenclature versionnée | Import de fichier, comme les contrats et `tokens.json` | Connecté au dépôt configuré | Lit le dépôt | À écrire |

**L'explorateur porte déjà des règles optionnelles.** Son profil UCM
contrôle quatre règles d'architecture en information ; le designer les
active et ignore un écart pour un fichier. Une intégration « Nomenclature »
à côté du profil reprendrait ce modèle : activation explicite, constats en
information, exceptions. Le relevé de l'explorateur garde aussi le nom Figma
de chaque variable, et la comparaison de deux relevés repère déjà une
variable renommée.

**L'exporteur juge ce qui se publie.** Son prévol dit si un contrat ou un
export de tokens peut partir. Le mainteneur a fixé que ce contrôle reste
agnostique et ne bloque que sur une variable manquante. Des constats de noms
s'y ajouteraient à chaque publication, à un moment où le designer ne
renomme plus.

**`ucm check` est le lieu d'une nomenclature partagée.** Le fichier de
nomenclature serait versionné dans le dépôt, à côté de `ucm.config.json`. La
CI relèverait les écarts de `tokens.json` dans la pull request, sans la
casse.

**Un plugin dédié ne se justifie que pour renommer.** L'explorateur et
`ucm check` suffisent à la détection. Un renommage en lot écrit dans le
document et change les chemins publiés ; il demande son propre produit.

Une organisation possible, à décider : la règle en module pur du kit, sans
dépendance, comme `@ucm-kit/core/emplois` ; deux lecteurs, l'explorateur
pour le designer et `ucm check` pour la CI ; rien dans l'exporteur.

## 8. Questions pour le mainteneur

1. Parmi les écarts de la section 3.2, lesquels faut-il réduire ?
   `error`/`danger`, `contained`/`filled`, `press`/`pressed`, les trois
   échelles de tailles et les trois noms de l'épaisseur de bordure sont les
   plus fréquents.
2. Faut-il les deux lecteurs, explorateur et `ucm check`, ou un seul pour
   commencer ?
3. La nomenclature est-elle propre à chaque dépôt, ou UCM en publie-t-il une
   par défaut, tirée du vocabulaire du kit ?
4. Jusqu'à quel niveau aller : forme et termes, ou aussi la grammaire de
   chaque collection ?
5. Le renommage reste-t-il hors du périmètre, ou devient-il le geste d'un
   plugin, avec une table de l'ancien nom vers le nouveau pour les
   consommateurs ?

### À vérifier dans Figma avant de concevoir

- Relancer l'inventaire sur les noms Figma, par un relevé de l'explorateur,
  pour voir la casse réelle de `fontsize` et des autres mots soudés.
- Renommer une variable liée à un calque et visée par un alias, puis relire
  `boundVariables` et l'alias, dans le fichier et dans un fichier
  consommateur de la bibliothèque.
- Créer deux variables qui ne diffèrent que par la casse dans une même
  collection, et noter si Figma les accepte.

## Fichiers du dossier

| Fichier | Rôle |
|---|---|
| [inventorier-noms.mjs](../../Mesures/inventorier-noms.mjs) | Relève les termes, les paires candidates, les profondeurs et les branches sœurs d'un `tokens.json` |


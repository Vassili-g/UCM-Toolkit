# Nomenclatures de tokens du marché

Rapport de recherche brut, sources en lien. Synthèse dans [RECHERCHE-NOMENCLATURE.md](../RECHERCHE-NOMENCLATURE.md), section 4.

## Réponse

Les systèmes publics décrivent presque tous une grammaire de noms (segments ordonnés), mais peu ont un vocabulaire fermé machine-vérifiable. Les deux cas les plus aboutis sont Adobe Spectrum (noms structurés en champs, avec 59 règles de validation) et GitHub Primer (regex de casse, garde-fou anti-suppression). Atlassian vérifie surtout l'usage et le cycle de vie des tokens, pas les noms. Je n'ai trouvé aucun outil public qui détecte les synonymes (`bg`/`background`, `hover`/`hovered`).

## Documenté : un tableau par système

**Nathan Curtis (EightShapes)**
- Nomenclature écrite : oui. Vocabulaire fermé : non, mais une liste « terme retenu / aka » à adopter (voir plus bas). Outil : aucun.
- Grammaire : « no prevailing token level order ». Tendances : namespace, puis objet (composant), puis base (catégorie, concept, propriété), puis modificateurs (variante, état, échelle, mode). Trois ordres possibles pour la base : `color-interactive-background`, `interactive-background-color`, `color-background-interactive`.
- Source : [Substack](https://nathanacurtis.substack.com/p/naming-tokens-in-design-systems-9e86c7444676)

**Adobe Spectrum** (dépôt renommé `spectrum-design-data`)
- Nomenclature : oui, sous forme de données. Chaque token a un objet `name` à champs : `property`, `colorFamily`, `scaleIndex`, `variant`… ([token-names](https://github.com/adobe/spectrum-design-data/tree/main/packages/token-names)).
- Vocabulaire fermé : oui. `packages/design-data/fields/` compte 33 fichiers, un par dimension (`state.json`, `variant.json`, `size.json`…). Le listing ne montre pas les valeurs : je n'ai pas lu leur contenu ([fields](https://github.com/adobe/spectrum-design-data/tree/main/packages/design-data/fields)).
- Outil : `design-data validate` (CLI Rust), schémas JSON 2020-12 et catalogue de 59 règles ([rules.yaml](https://github.com/adobe/spectrum-design-data/blob/main/packages/design-data/../design-data-spec/rules/rules.yaml)).
  - SPEC-007 : le nom hérité doit pouvoir être régénéré depuis l'objet structuré (« name-roundtrip »).
  - SPEC-009 : les champs doivent prendre leurs valeurs dans les enums du registre.
  - SPEC-050 : `property` doit être atomique.
  - SPEC-017 : un nom en simple chaîne est de la « dette technique ».
  - SPEC-026 : un état hors vocabulaire doit être décrit.
- Attention : le `SPECTRUM_NAMING_GUIDE_WIKI.md` parle de nommer des concepts produit (« picker » plutôt que « dropdown »), pas des tokens ([lu ici](https://github.com/adobe/spectrum-design-data/blob/main/SPECTRUM_NAMING_GUIDE_WIKI.md)).

**GitHub Primer**
- Nomenclature : oui ([token-names](https://primer.style/product/primitives/token-names/)).
- Grammaire : `prefix → namespace → pattern → variant → property → variant → scale`. Seul `property` est obligatoire. « Only one variant is allowed per token ». Exemples : `button-primary-bgColor-hover`, `bgColor-accent-emphasis`.
- Vocabulaire : fermé seulement pour certains blocs.
  - `prefix` n'accepte que `brand`, `namespace` que `base`.
  - Variantes de couleur : `default | muted | emphasis`.
  - Tailles : `xsmall … xxlarge`.
  - Densité : `condensed | normal | spacious`.
  - Épaisseur : `thin | thick | thicker`.
  - La page ne donne pas de liste d'états ; `rest` et `hover` n'apparaissent qu'en exemples.
- Outil, 3 contrôles :
  - `npm run lint:tokens` lance `validateTokenJson.ts`, qui applique un schéma Zod. La regex de nom est `/(^[a-z0-9][A-Za-z0-9-]*$|^@$)/` ([tokenName.ts](https://raw.githubusercontent.com/primer/primitives/main/src/schemas/tokenName.ts), [validateTokenJson.ts](https://raw.githubusercontent.com/primer/primitives/main/scripts/validateTokenJson.ts), [package.json](https://github.com/primer/primitives/blob/main/package.json)).
  - `check:removed-tokens` échoue si un token a disparu sans entrée dans `removed.json`. La valeur est `null` (supprimé) ou le nouveau nom (renommé) ([checkRemovedTokens.ts](https://raw.githubusercontent.com/primer/primitives/main/scripts/checkRemovedTokens.ts)).
  - `check:contrast`.
- Limite : la regex contrôle la casse et les caractères, pas le vocabulaire.

**Atlassian**
- Nomenclature : oui. Trois segments, `Foundation`, `Property`, `Modifier` (optionnel : rôle de couleur, emphase, état). Pas de vocabulaire complet ; la page ne donne que des exemples ([design-tokens](https://atlassian.design/foundations/tokens/design-tokens)).
- Outil : le plugin ESLint `@atlaskit/eslint-plugin-design-system` contrôle l'usage, pas la nomenclature : `ensure-design-token-usage`, `no-unsafe-design-token-usage`, `no-deprecated-design-token-usage`, `use-tokens-space`… ([usage](https://atlassian.design/components/eslint-plugin-design-system/usage)). Un plugin Stylelint existe pour le CSS pur ([Forge](https://developer.atlassian.com/platform/forge/design-tokens-and-theming/)).
- Je n'ai pas trouvé de règle qui valide les noms eux-mêmes.

**Salesforce SLDS (styling hooks)**
- Nomenclature : oui. Namespace `slds`, scope `g` ou `c`, catégorie, propriété, rôle, état. Exemples : `--slds-g-color-accent-container-1`, `--slds-g-font-scale-5` ([blog](https://www.salesforce.com/blog/what-are-styling-hooks/)).
- Le blog ne mentionne pas de segment « composant ». La forme complète `--slds-c-button-color-background-hover` vient d'un extrait de recherche, pas d'une page ouverte.
- Un SLDS Linter existe (extraits de recherche : il signale des hooks renommés et l'usage de l'espace de noms réservé). Les pages de doc et de règles ont renvoyé 403 ou 404 : non vérifié.

**Shopify Polaris**
- Nomenclature : partielle. Seule trace lue : la discussion [#6613](https://github.com/Shopify/polaris-react/discussions/6613), « sans réponse », qui propose `groupe + sous-groupe + variantes`, avec `state` en fin pour les couleurs. Elle laisse ouverte la question du pluriel des groupes. Ni `bg` ni `fg` n'y figurent.
- La discussion [#10225](https://github.com/Shopify/polaris/discussions/10225) propose `--p-color-{component}-{variant}-{structure}`.
- Outil : **je n'ai trouvé aucun test de noms** (la page de tokens a échoué avec « Socket is closed »). Votre hypothèse « Polaris a des tests sur les noms » est non confirmée.

**IBM Carbon**
- Nomenclature : implicite. Seule phrase explicite : les tokens sont « named and grouped by the common UI element that they are applied to ». Le reste se déduit des tableaux : préfixe d'élément (`background`, `layer`, `field`, `text`), état en suffixe (`background-hover`), numéro de couche (`layer-02`, `layer-hover-01`) ([Carbon](https://carbondesignsystem.com/elements/color/tokens/)).
- Vocabulaire fermé et outil : non trouvés.

**Material 3**
- Trois niveaux `md.ref.*`, `md.sys.*`, `md.comp.*`, patron `md.<tier>.<category>.<property>`, préfixe `on-` pour le contenu posé sur une surface.
- Je ne l'ai établi que par extraits de recherche. La page officielle ([m3.material.io](https://m3.material.io/foundations/design-tokens/overview)) est revenue vide : non vérifié à la source.

**Style Dictionary (CTI)**
- Grammaire : l'attribut `attribute/cti` dérive de la position dans l'arbre : category, type, item, subitem, state. Il n'y a ni vocabulaire ni validation de noms.
- Les transforms de casse sont fournis : `name/kebab`, `camel`, `snake`, `constant`, `pascal`.
- En v4, le type vient de `$type`, plus de la position ([doc](https://styledictionary.com/reference/hooks/transforms/predefined/)).

**DTCG (brouillon, « Do not attempt to implement »)**
- Impose peu : nom en chaîne JSON valide, sensible à la casse, sans `$` initial, sans `{`, `}` ni `.`. Les outils DOIVENT vérifier l'absence de conflit avec les noms réservés.
- Aucune grammaire de segments. Les outils PEUVENT avertir si deux noms ne diffèrent que par la casse ([spec](https://www.designtokens.org/tr/drafts/format/)).

**GitLab Pajamas** (non demandé, très structuré)
- Dix segments : `[group].[component].[variant].[element].[position].[relationship].[property].[type].[scale].[state]`. Règle : « the same term will never be in two places for a single design token » ([doc](https://design.gitlab.com/product-foundations/design-tokens-reading)). Outil : non vérifié.

## Recommandations récurrentes

- **Synonymes**
  - Curtis propose une liste terme retenu / alternatives : `error` ≈ danger, alert, critical ; `information` ≈ info ; `primary` ≈ default, base ; `font` ≈ type, typography, text. Il conseille d'« éviter les homonymes » (`type`, `text`) et vise l'homogénéité dans une classe ([Curtis](https://nathanacurtis.substack.com/p/naming-tokens-in-design-systems-9e86c7444676)).
  - Spectrum applique une version outillée de cette idée avec ses enums de registre (SPEC-009).
- **Abréviations**
  - Curtis : noms de système de cinq caractères ou moins, `font` plutôt que `typography`, tailles en t-shirt. Pour `on-`, il préfère la lisibilité mais tient cette préférence « loosely », tout en insistant « that a convention exists ». Il ne tranche pas `bg` contre `background`.
  - Primer utilise `bgColor` et `fgColor` et n'en fait pas une règle écrite sur la page lue.
  - Polaris et Carbon n'ont pas de règle trouvée sur ce point.
- **Casse**
  - Curtis : aucune consigne ; ses exemples sont en minuscules avec tirets.
  - Primer : camelCase ou kebab-case, forcé par regex, avec camelCase dans les noms de blocs à plusieurs mots.
  - Polaris (ancien paquet) : camelCase en JS, kebab-case en JSON et Sass ([npm](https://www.npmjs.com/package/@shopify/polaris-tokens), lu en extrait de recherche).
  - DTCG : sensible à la casse, avec avertissement facultatif.
- **États**
  - Curtis liste `default`, `hover`, `press/active`, `focus`, `disabled`, `visited`, `error`.
  - Primer exige cinq états d'interaction : rest, `:hover`, `:focus-visible`, `:active`, `:disabled` ([GUIDE](https://github.com/primer/primitives/blob/main/DESIGN_TOKENS_GUIDE.md)). Ce sont des états CSS, pas des noms de tokens ; les exemples de noms utilisent `rest` et `hover`.
  - Carbon met l'état en suffixe (`-hover`, `-active`, `-selected`, `-disabled`).
  - SLDS met l'état en dernier segment.
  - Aucun système lu ne tranche `hover` contre `hovered`.
- **Un seul terme par position**
  - Primer : une seule variante par token.
  - Pajamas : jamais le même terme à deux endroits.
- **Ordre**
  - Les namespaces viennent d'abord et les modificateurs (état, échelle, mode) en dernier chez Curtis, Primer, Pajamas et SLDS. Curtis précise toutefois qu'il n'existe pas d'ordre dominant.
  - Carbon place l'état avant le numéro de couche (`layer-hover-01`), alors que Curtis met les modificateurs après la base.

## Évolution, renommage, dépréciation

- **Atlassian** : actif, puis déprécié (version mineure), puis « soft-deleted » (fonctionne mais lève des erreurs, mineure suivante), puis supprimé (majeure). Les linters avertissent puis échouent, et `eslint --fix` migre ([Forge](https://developer.atlassian.com/platform/forge/design-tokens-and-theming/)).
- **Primer** : `removed.json`, voir plus haut.
- **Spectrum** : `deprecated`, `replaced_by` (UUID), `plannedRemoval`. Règles SPEC-010 à 013 : la cible doit exister, le tableau exige un commentaire, `replaced_by` exige `deprecated`.
- **DTCG** : `$deprecated` (booléen ou chaîne explicative), héritable par groupe. Les alias `{groupe.token}` sont suivis, sans cycle.
- **Curtis** : on commence par un token local au composant, puis on le promeut en token de groupe quand environ trois composants le partagent. Il conseille d'aliaser un jeu vers l'autre en cas de chevauchement.
- **Spectrum Naming Guide** : renommer est « OK (and expected) » ; pas de processus formel.

## À essayer dans Figma

Rien de ce qui précède ne dit comment un export Figma restitue ces règles. À vérifier :
- Créer des variables avec `/`, `.` et espaces, puis exporter en JSON. Regarder ce que devient le chemin par rapport aux interdits DTCG (`.`, `{`, `}`).
- Créer deux variables dont les noms ne diffèrent que par la casse (`Bg/Hover` et `bg/hover`) et voir si Figma les accepte.

## Limites

- Non ouverts ou échoués : pages SLDS (403), page Material 3 (vide), page Polaris des tokens (erreur), pages Atlassian « use tokens » (vide). Les points Material 3 et SLDS viennent d'extraits de recherche, signalés comme tels.
- Contenu des 33 champs Spectrum, des enums de registre et des autres règles de `SPEC-xxx` non lu.
- Aucun outil de détection de synonymes trouvé, mais l'absence n'est pas prouvée.
- Les pages ont été lues via un modèle de résumé, donc les citations sont paraphrasées.

## Sources
- [Curtis, Substack](https://nathanacurtis.substack.com/p/naming-tokens-in-design-systems-9e86c7444676)
- [DTCG format](https://www.designtokens.org/tr/drafts/format/)
- [Style Dictionary transforms](https://styledictionary.com/reference/hooks/transforms/predefined/)
- [Spectrum repo](https://github.com/adobe/spectrum-design-data)
- [Spectrum token-names](https://github.com/adobe/spectrum-design-data/tree/main/packages/token-names)
- [Spectrum design-data-spec](https://github.com/adobe/spectrum-design-data/tree/main/packages/design-data-spec)
- [Spectrum rules.yaml](https://github.com/adobe/spectrum-design-data/blob/main/packages/design-data-spec/rules/rules.yaml)
- [Spectrum fields](https://github.com/adobe/spectrum-design-data/tree/main/packages/design-data/fields)
- [Spectrum naming guide](https://github.com/adobe/spectrum-design-data/blob/main/SPECTRUM_NAMING_GUIDE_WIKI.md)
- [Primer token-names](https://primer.style/product/primitives/token-names/)
- [Primer repo](https://github.com/primer/primitives)
- [Primer package.json](https://github.com/primer/primitives/blob/main/package.json)
- [Primer validateTokenJson.ts](https://raw.githubusercontent.com/primer/primitives/main/scripts/validateTokenJson.ts)
- [Primer tokenName.ts](https://raw.githubusercontent.com/primer/primitives/main/src/schemas/tokenName.ts)
- [Primer designToken.ts](https://raw.githubusercontent.com/primer/primitives/main/src/schemas/designToken.ts)
- [Primer checkRemovedTokens.ts](https://raw.githubusercontent.com/primer/primitives/main/scripts/checkRemovedTokens.ts)
- [Primer DESIGN_TOKENS_GUIDE](https://github.com/primer/primitives/blob/main/DESIGN_TOKENS_GUIDE.md)
- [Atlassian design tokens](https://atlassian.design/foundations/tokens/design-tokens)
- [Atlassian ESLint plugin](https://atlassian.design/components/eslint-plugin-design-system/usage)
- [Atlassian Forge tokens](https://developer.atlassian.com/platform/forge/design-tokens-and-theming/)
- [SLDS blog](https://www.salesforce.com/blog/what-are-styling-hooks/)
- [Polaris #6613](https://github.com/Shopify/polaris-react/discussions/6613)
- [Polaris #10225](https://github.com/Shopify/polaris/discussions/10225)
- [Carbon tokens](https://carbondesignsystem.com/elements/color/tokens/)
- [GitLab Pajamas](https://design.gitlab.com/product-foundations/design-tokens-reading)

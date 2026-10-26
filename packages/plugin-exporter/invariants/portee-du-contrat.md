# Portée et forme du contrat

- **Contrat portable : aucune donnée d'extraction Figma dans l'artefact.** Toute limite de traduction → diagnostic + `meta.coverage.portable` partiel.
- **Aucune logique liée au nom d'un composant.**
- **Figma reste traçable après normalisation** (`figmaName`, `figmaLayer`).
- **`variants` décrit chaque combinaison présente** (`COMPONENT` sans axe, matrice clairsemée compris) **et référence une vue de `variantViews`.** Vue = six renvois : `structure`, `typography`, `composes`, `icons`, `paintPlacements`, `effects`, catalogués à part, partagés par égalité stricte du bloc JSON, ordre des clés ignoré. Ni merge, ni héritage, ni défaut. `structure` = projection du variant de référence, publiée aussi par renvoi, inconditionnellement. → [§S]
- **Aucune valeur neutre écrite.** Clé qui vaudrait `null`, `{}` ou `[]` : absente. Valeur vide : omise ; valeur contenant du vide : écrite sans lui, et reste. Sous un dictionnaire, la clé est une donnée : `stateModel.states.default` = `{}`. `slotPath` d'effet = `[]` pour la racine : adresse, non vide. Borne, qui porte tout : un seul passage, jamais de point fixe. Autorité : `elideNeutrals.ts`, où chaque sous-arbre ne passe qu'une fois.
- **Artefact : une entrée par ligne sur deux niveaux** (`serializeJson.ts`), sans seuil, forme jamais fonction du nombre de variants.
- **Une propriété native garde son type** (`INSTANCE_SWAP`, `SLOT`) **et ses liaisons** `visible`, `characters`, `mainComponent` : définition dans `propertyBindingDefinitions`, `nodeId` dans `variants[].bindings`. Borne : aucun rapprochement par nom de calque. → [§P]
- **Un enum renommé porte la même clé dans `props`, `variantAxes` et les arbres de variantes.** → [§P]
- **Un axe possède sa clé publique** : `analyse/proprietesEtEtats.ts` `lireLeModeleDeProprietes` la réserve avant les autres propriétés, ordre des déclarations Figma sans effet. Deux axes confondus par la normalisation : export refusé, aucun artefact, le designer en renomme un. → [SPEC](../SPEC.md#1-props)
- **La convention `State`/`States`/`Status` porte sur le seul type `VARIANT`.** Autre type du même nom : reste une prop. Props et `stateModel` lisent la même liste. Autorité : `analyse/proprietesEtEtats.ts` `STATE_AXIS_NAMES`, ré-exporté par `semantics.ts`. → [§P]
- **Axes d'API dans `props`, axe d'états dans `stateModel` ; une règle `@prop` suit cette répartition.** N'est une faute de frappe que ce que le contrat ne publie nulle part. → [§7]
- **Une règle dont un calque lu contient `[À compléter]` n'est pas rédigée.** Hors contrat ; seul son warning sort : une ligne par tag, portant toutes les règles marquées de ce tag. Conteneur dont `component-name` porte le marqueur : ne documente aucun composant, `rulesContainerOwner` ne le rattache à personne. Autorité : `extractRules.ts` `MARQUEUR_A_COMPLETER`, `porteLeMarqueur`. → [§7]

[§S]: ../../../docs/format/FORMAT.md#sortie
[§P]: ../../../docs/format/FORMAT.md#1-props
[§7]: ../../../docs/format/FORMAT.md#7-intention-et-documentation-des-props

# Lot 6 : faits ordinaires et acquisition commune

[Sommaire des lots](./README.md).

## Tâches à committer

- [x] **6.1 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : inventorier les champs consommés par relevé, moteur, budget et surveillance dans les modules existants ; fixer leurs projections en tests.
- [ ] **6.2 | gpt-6.1-sol | high** | **Claude Opus | high** : définir les faits ordinaires avec identité, topologie, provenance, champs acquis ou refusés et couverture ; aucun objet Figma dans les types. Les cases 6.3 à 6.9 reposent sur ces types.
- [ ] **6.3 | gpt-6-luna | medium** | **Claude Sonnet | medium** : centraliser une famille de propriétés de nœuds et ses refus ; comparer les deux lecteurs avant d'en ajouter une autre.
- [ ] **6.4 | gpt-6-luna | medium** | **Claude Sonnet | medium** : centraliser variables et collections promises ou refusées ; tests de collision, alias et ressource redevenue lisible.
- [ ] **6.5 | gpt-6-luna | medium** | **Claude Sonnet | medium** : centraliser styles et maîtres avec déduplication par identité ; comparer frontières d'instance et localisations.
- [ ] **6.6 | gpt-6.1-sol | high** | **Claude Sonnet | high** : séparer inventaires locaux, règles par page et libraries par demande ; borner à huit requêtes indépendantes en vol.
- [ ] **6.7 | gpt-6-luna | medium** | **Claude Sonnet | medium** : faire consommer les faits de peinture au relevé et au moteur ; comparer fills, strokes et refus.
- [ ] **6.8 | gpt-6.1-sol | high** | **Claude Sonnet | high** : projeter les segments de texte par consommateur et fusionner les plages adjacentes prouvées ; conserver deux lectures si nécessaire.
- [ ] **6.9 | gpt-6.1-sol | medium** | **Claude Sonnet | high** : dériver l'inventaire de péremption de la topologie et écouter les pages autorisées avant lecture longue ; test de couverture inconnue.
- [ ] **6.10 | gpt-6-luna | low** | **Claude Sonnet | low** : comparer dans le banc parcours natif indexé et parcours coopératif explicite ; ne fixer aucun gagnant avant Figma.

Prérequis : 4 et 5. Nature : extraction progressive à sortie identique.
Chemins nouveaux proposés : `packages/plugin-socle/src/composant/analyse/faits.ts`,
`acquisition.ts`, `ressources.ts`, `topologie.ts`.
Lecteurs à adapter : `packages/plugin-architect/src/releveDuComposant.ts`,
`lectureDuComposant.ts`, `lecture.ts`, `catalogue.ts`, `sandbox/analyse.ts`,
et `packages/plugin-socle/src/composant/contract/`.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : définir les faits sans objet Figma : identité,
  parent, ordre, type, frontières, champs acquis ou refusés, couverture et
  provenance. Séparer topologie et valeurs. Énumérer les champs consommés par
  chaque lecteur et diagnostic avant de déplacer leur acquisition. Garder les
  vues distinctes du relevé, du moteur, du budget et de la surveillance.
- **Portée initiale répartie dans les cases ci-dessus** : centraliser les lectures de propriétés et les
  promesses de variables, collections, styles et maîtres, refus compris.
  Garder un inventaire local complet pour collisions et candidats, un inventaire
  de règles par page et un inventaire de libraries par demande. Borner les
  requêtes indépendantes à huit appels en vol au départ ; les compléments
  suivent la découverte de dépendances et le choix de library.
- **Portée initiale répartie dans les cases ci-dessus** : faire consommer les faits communs au relevé et
  aux lecteurs de ressources du moteur, famille de champs par famille.
  Mutualiser fills/strokes et segments de texte. L'union des champs de segments
  exige une projection et fusion de plages adjacentes par consommateur ; garder
  deux lectures si leur équivalence ou leur refus n'est pas prouvé.
- **Portée initiale répartie dans les cases ci-dessus** : faire produire l'inventaire de péremption depuis
  la topologie commune. Comparer parcours natif indexé et parcours explicite
  coopératif dans le banc, sans présumer du plus rapide dans Figma. Écouter les
  pages autorisées avant les lectures longues ; garder toute couverture inconnue
  comme obligation de relecture.

Sortie : relevé profondément identique, compteurs de chaque lecture expliqués,
mêmes budgets et limites. Les projections pures ne rappellent pas Figma.
Contrôles : socle, Architect et exporteur. **Build Architect à chaque famille
intégrée testable.** Mettre à jour les cartes sans créer de document auxiliaire.

### Inventaire des champs (6.1)

Les sources sont `releveDuComposant.ts` (relevé), `lectureDuComposant.ts` et `consommateurs.ts` (vue Composant), `contract/` du socle (moteur), `contract/budget.ts` (budget) et `sandbox/analyse.ts` (surveillance). Les tests `plugin-architect/tests/projectionDesLecteurs.test.ts` et `plugin-exporter/tests/projectionDesLecteurs.test.ts` fixent l'ordre exact des lectures. Chaque cellule nomme le champ ou l'appel natif, puis le refus ou la sortie.

| Famille | Relevé et vue Composant | Moteur, budget et surveillance |
|---|---|---|
| Identité et topologie | Relevé et vue lisent `id`, `name`, `type`, `parent`, `children`. L'instance sous la racine est une frontière non descendue. `children` qui lève : manquée `children` (relevé), entrée de `erreurs` (vue). Le budget du relevé compte les étapes de ce parcours. | Moteur : `findAll(() => true)` par racine (`descendantsBruts`), `findAll(filtre)` et `findAllWithCriteria` pour instances, textes et règles, remontée de `parent` (`exportableNodes.ts`), `key`, `remote`. Budget : `findAll(() => true)` par variant, instances comprises, avec `'findAll' in`. Surveillance : `type`, `parent`, `id` du départ, puis `findAll`, `children`, `key`, `id` du jeu ; `nodeChanges[].node.id` dans `code.ts`. `findAll` qui lève : la surveillance ne garde que le jeu et ses variants. |
| Géométrie et mise en page | Relevé : `absoluteBoundingBox`, sinon `x`, `y`, `width`, `height` ; sans boîte : manquée `dimensions`, dimensions nulles. Valeurs en dur : `layoutMode`, `padding*`, `itemSpacing`, `cornerRadius` ou les quatre rayons, `strokeWeight`. Vue : `absoluteBoundingBox` non finie : pas de boîte ; mêmes champs de valeurs plus `fontSize`. | `layoutMode`, `layoutWrap`, `primaryAxisAlignItems`, `counterAxisAlignItems`, `counterAxisSpacing`, `itemSpacing`, `padding*`, rayons, `layoutSizing*`, `layoutPositioning`, `layoutAlign`, `layoutGrow`, `min`/`maxWidth`/`Height`, `rotation` (`nodeBindings.ts`, `flexLayout.ts`, `extractLayout.ts`). Un champ `undefined` désigne un type de nœud qui ne l'expose pas : le moteur ne réclame alors aucune variable. |
| Peintures | `fills` et `strokes` : liste de `type`, `visible`, `opacity`, `blendMode`, `color` des SOLID. Valeur non liste (mixte) : manquée `peintures mixtes ou illisibles` (relevé), liste vide (vue). Vue : peintures SOLID visibles sans liaison. | `fills`, `strokes`, `blendMode`, `isMask`, `dashPattern`, `opacity`, `effects`, `effectStyleId` (`extractSlotTokens.ts`, `effectStyles.ts`). Valeur non liste : rien à réclamer. `strokeWeight` à 0 : contour ignoré. |
| Texte et plages | `getStyledTextSegments(fontSize, fontWeight, fills, boundVariables, textStyleId)` et `textStyleId` (relevé, plus un appel `boundVariables, fills` pour les liaisons) ; `getStyledTextSegments(boundVariables, fills)`, `getStyledTextSegments(textStyleId)` si le style est mixte, `textStyleId`, `fontSize` (vue). Appel qui lève : manquée `texte` (relevé). | `characters`, `textStyleId`, `textCase`, `textDecoration*`, `textWrapStyle`, `leadingTrim`, `textAlign*`, `textTruncation`, `openTypeFeatures`, `listSpacing`, `hangingList`, `hangingPunctuation`, `getStyledTextSegments(listOptions)` et `(textStyleOverrides)` (`extractVariantTypography.ts`, `unsupportedProperties.ts`). Méthode absente ou qui lève : liste vide. |
| Liaisons et variables | `boundVariables` du nœud (alias, tableaux, `componentProperties`), des peintures (`color`, `gradientStops`), des effets, des grilles et des segments de texte ; `resolvedVariableModes` (relevé), `explicitVariableModes` et `resolvedVariableModes` (vue). API : `getVariableByIdAsync`, `getVariableCollectionByIdAsync` (relevé), `lireLesVariables` et `importVariableByKeyAsync` (vue et catalogue). Variable introuvable : liaison `illisible` et manquée (relevé). | `boundVariables` par champ (`getBinding`), `boundVariables.color` par peinture (`lirePeintures`), `getLocalVariableCollectionsAsync`, `getLocalVariablesAsync`, `getVariableByIdAsync`, `getVariableCollectionByIdAsync` (`exportComponent.ts`, `variables.ts`). Lecture par identifiant : `.catch(() => null)`. |
| Styles | `getStyleByIdAsync(textStyleId)` : `name` (relevé) ; `name`, `paints`, `effects`, `layoutGrids`, `boundVariables` (vue). Erreur : manquée `textStyleId` (relevé), style absent (vue). | `getStyleByIdAsync` : `type`, `name`, `boundVariables`, `fontName`, `textCase`, `textDecoration`, `paragraphSpacing`, `paragraphIndent`, `textWrapStyle`, `leadingTrim` ; style d'effets par `effectStyleId`. Style absent ou de mauvais `type` : diagnostic et pas de typographie. Deux appels pour un même style sur le jeu de test. |
| Maîtres et instances | `getMainComponentAsync()` : `key` du jeu, `name`, `remote`, `parent` ; `componentPropertyReferences.mainComponent` ; `overrides` et `getNodeByIdAsync` pour les liaisons de surcharge. Maître introuvable ou erreur : manquée `instanceDe` (relevé), nom du calque (vue). | `getMainComponentAsync()` mémorisé par instance dans `porteeDAnalyse.ts`, `.catch(() => null)` ; `remote`, `variantProperties`, `componentProperties`, `overrides` (`extractSamples.ts`), `findOne`. Surveillance : `getMainComponentAsync()` du sujet INSTANCE ; maître absent : pas de sujet. |
| Propriétés de composant | `componentPropertyDefinitions` du jeu : `type` parmi VARIANT, BOOLEAN, TEXT, INSTANCE_SWAP, `defaultValue`, `variantOptions` ; `variantProperties`, sinon le nom `Propriété=Valeur`. Lecture qui lève : manquée `componentPropertyDefinitions`. La vue ne lit ni l'un ni l'autre. | `componentPropertyDefinitions`, `variantProperties`, `componentPropertyReferences` (`visible`, `characters`, `mainComponent`), `componentProperties` (`componentTree.ts`, `extractRules.ts`, `composedComponents.ts`). |
| Visibilité | `visible !== false` et `opacity` (relevé). La vue ne lit ni `visible` ni `opacity`. | `visible`, `'visible' in`, `componentPropertyReferences.visible`, `boundVariables.visible` : un nœud masqué sans liaison est élagué avec son sous-arbre (`exportableNodes.ts`). `opacity` d'une dépendance : `extractLayout.ts`. |

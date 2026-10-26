# Lot 7 : diagnostics finalisés et publication séparée

[Sommaire des lots](./README.md).

## Tâches à committer

- [x] **7.1 | gpt-6.1-sol | high** | **Claude Sonnet | high** : relever dans la table des sites diagnostics, faits lus, contexte et consommateurs, y compris après structure et compaction. Relevé : section « Sites d'émission (7.1) », 104 lignes.
- [ ] **7.2 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : classer les calculs requis par diagnostic, correction, règle ou publication ; vérifier C42 et l'arbre exact encore nécessaire.
- [ ] **7.3 | gpt-6.1-sol | high** | **Claude Sonnet | high** : extraire une première famille de requêtes pures et déclarer ses dépendances ; comparer tous ses diagnostics ordonnés.
- [ ] **7.4 | gpt-6.1-sol | high** | **Claude Sonnet | high** : produire le résultat interne finalisé avec parties, localisations, props, états, imbrications, modèles et couverture ; test de parité complet.
- [ ] **7.5 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : assembler contrat et échantillons exporteur depuis ce résultat ; comparer hors date avec l'ancien chemin.
- [ ] **7.6 | gpt-6.1-sol | medium** | **Claude Sonnet | medium** : déplacer compaction et sérialisation après le calcul commun ; garder diagnostics tardifs et contrat ordonné.
- [ ] **7.7 | gpt-6.1-sol | high** | **Claude Sonnet | high** : brancher Architect sur surface et règles sans JSON.parse du contrat ; comparer corrections, questions et modèles.
- [ ] **7.8 | gpt-6-luna | low** | **Claude Sonnet | low** : retirer l'ancien chemin de production après parité ; garder le comparateur et exécuter les builds Architect et exporteur.

Prérequis : 6. Nature : extraction à sortie identique.
Chemins : `packages/plugin-socle/src/composant/contract/exportComponent.ts`,
`extractStructure.ts`, extracteurs appelés, `extractRules.ts`, `imbriques.ts`,
`template/modele.ts`, nouveaux modules de `composant/analyse/`,
`packages/plugin-architect/src/constatsDuMoteur.ts`, `regles.ts`, `sandbox/analyse.ts`.

## Portée et preuves conservées

- **Portée initiale répartie dans les cases ci-dessus** : établir dans cette checklist la table des sites
  d'émission : diagnostics, faits, contexte et consommateurs. Inclure les sites
  après `structure`, après compaction et la traduction C42 par défaut.
  Classer chaque calcul comme requis par un diagnostic, une correction, les
  règles ou la seule publication ; ne pas retirer d'arbre exact encore requis.
- **Portée initiale répartie dans les cases ci-dessus** : extraire des requêtes pures à dépendances explicites
  et un résultat interne contenant diagnostics finalisés, parties/localisations,
  `props`, `stateModel`, imbrications, modèles, couverture et dépendances lues.
  Leur résultat reste indépendant de la génération de l'interface. Des appels
  explicites suffisent ; aucun ordonnanceur général n'est requis ici.
- **Portée initiale répartie dans les cases ci-dessus** : faire assembler à l'exporteur son contrat, ses
  échantillons, sa compaction et sa sérialisation après le même calcul.
  Faire consommer directement la surface et les règles à Architect ; retirer
  son `JSON.parse(content)` sans fabriquer de faux `ComponentExport`.
  Garder l'ancien chemin dans le banc jusqu'à parité de tous les extracteurs.

Sortie : Architect évite les sorties sans consommateur et conserve les
diagnostics tardifs ; l'exporteur produit le même contrat hors date.
Contrôles : socle/exporteur/Architect. **Build Architect et exporteur.**

### Sites d'émission (7.1)

Relevé du code de `packages/plugin-socle/src/composant/contract/` et de `packages/plugin-architect/src/`, sans changement de code. Une ligne par site d'émission. Deux appels d'une même fonction qui ne diffèrent que par le regroupement sur les racines de variant (`pousserPourLesVariants` puis `pousserLocalise`) forment une seule ligne, marquée « groupé ou par calque ». Les chemins sont ceux de `contract/` sauf indication.

#### Chemin d'un message

- **Canaux** : un message naît dans un tableau de chaînes, et son identité est sa phrase (`phraseDe`). `R` : `rules.warnings` d'`extractRules`. `M` : `matrixWarnings`. `C` : `compositionWarnings`. `S` : `stateNotices`. `W` : `warnings` d'`exporterLeComposant`, que le résolveur `VariableNameResolver` alimente aussi. `E` : `extracted.warnings` d'`extractStructure`, copie de `M` au départ. `N` : `extracted.notices`. `B` : `bloquants`.
- **Registres par canal** (`localisation.ts`, `imbriques.ts`) : des `WeakMap` indexées par l'identité du tableau portent les nodes d'une phrase (`registres`), ses parties (`parties`), les absences de node déclarées (`declarations`), les racines de variant (`racinesDeVariants`) et les imbriqués sans règles (`imbriquesATaire`). Un site qui teste `estUneRacineDeVariant(canal, node)` ou `sousUnImbriqueSansRegles(canal, node)` lit un état que `extractStructure` a posé sur son canal `E` : `declarerLesRacinesDeVariants` si la matrice a plus d'un variant, `declarerLesImbriquesSansRegles` si `imbriques` est fourni. Toute copie d'un canal appelle `reporterLocalisations`.
- **Jonction** (`exporterLeComposant`, étape `compaction`) : `allWarnings` est la suite dédoublonnée par phrase de `B`, puis `W`, puis `E`, avec le report des trois registres. `extracted.notices` et `S` sont ajoutés à `W` au fil de l'export : leurs phrases passent donc avant celles de `E`. `localisationsDe`, `partiesDe` et `raisonsSansNode` donnent ensuite `ComponentExport.localisations`, `.parties` et `.localisationsDeclarees`, et `warningCount` vaut `allWarnings.length`.
- **Publication** : chaque phrase devient un élément de `meta.diagnostics` avec `severity: 'warning'` et `message` égal à la phrase. Le code est `UCM_PORTABLE_PROJECTION_WARNING` (colonne Pub. : P) si la phrase est dans `projectionWarnings`, sinon `UCM_EXPORT_NOTICE` (N). `meta.coverage.portable` vaut `partial` dès que `projectionWarnings` n'est pas vide. Le rapport de CI du kit (`packages/kit/src/lecteurs/avertissements-export.mjs`) ne remonte que P.
- **Consommateurs de l'exporteur** (`plugin-exporter/src/code.ts`) : un message `diagnostic` par phrase vers l'interface (`severite`, `famille`, `calque`, `titre`, `elements`, `impact`, `action`, `nodeIds`), le contrat téléchargé, et `warnings` de l'artefact qui part dans la demande de fusion.
- **Consommateur d'Architect** : `constatsDuMoteur(resultat.export, ids des variants du relevé)` lit `warnings`, `parties` et `localisations` sous l'étape `controle-fusion`, après la phase `regles`. Les constats du moteur traversent ensuite `proposerLesCorrectionsParEtapes` (kit) sans changement : cette fonction ne touche que C15, C16 et C17 et ajoute C22, C24, C25 et les valeurs en dur. `separerLesIgnores` les classe par `id`.
- **Pub.** : la colonne suit les curseurs `warningCursor` et `markProjectionWarningsSince` d'`exporterLeComposant`. Les messages de `R`, de `S`, de `N` et des fusions de documentation sont N. Ceux de `M`, `C`, `E`, du résolveur, de `mergeIconRules`, de `B` et des boucles de fin sont P.

#### Traduction en codes par Architect

`TABLE_DU_MOTEUR` (`constatsDuMoteur.ts`) retient la première règle dont `depuis` égale la `famille` du point et dont l'éventuelle expression régulière reconnaît `titre` joint à `elements` (ni l'impact ni l'action) :

| Rang | Famille du point | Texte reconnu | Code, type, famille du constat |
|---|---|---|---|
| 1 | `variables` | `[Vv]ariable introuvable` | C41, `bloquant`, `liaisons` |
| 2 | `variables` | tout | C30, `corriger`, `liaisons` |
| 3 | `disposition` | `masqué` | C35, `verifier`, `visibilite` |
| 4 | `proprietes` | `pilote` | C35, `verifier`, `visibilite` |
| 5 | `proprietes` | tout | C34, `verifier`, `variants` |
| 6 | `non-exportes` | tout | C42 (table), `verifier`, `export` |
| 7 | `regles` | tout | C44, `corriger`, `regles` |
| défaut | `disposition` sans `masqué`, `imbriques`, `styles`, `fichier` | aucune règle | C42 (défaut), `verifier`, `export` |

- Le défaut vaut aussi pour une phrase sans parties : `faits` ne porte alors que `message`. Un point de `severite: 'danger'` devient `bloquant` quelle que soit la règle.
- Les rangs 6 et défaut donnent le même constat ; seule la voie diffère.
- La colonne « famille, code » du relevé donne le résultat de cette table pour chaque site. Quatre faits se lisent dans le code :
  - Le titre du résolveur commence par « Variable introuvable ». L'expression du rang 1 accepte la majuscule depuis `2f9c28a1` : le site 34 donne C41, comme les sites 66 et 67.
  - Aucun titre émis aujourd'hui ne contient `pilote` en famille `proprietes`. Le seul titre qui le contient, celui du site 27, est en famille `disposition`. Le rang 4 ne reconnaît rien dans le code actuel.
  - Les expressions lisent aussi les noms de calque, puisque le titre contient `Layer « nom »`.
  - Le catalogue des codes C30 à C45 n'est pas dans le kit : `Constat.code` y est un gabarit `C${number}` (`packages/kit/src/controles/constat.ts`). Les codes du moteur ne sont écrits que dans `constatsDuMoteur.ts` (C30, C34, C35, C41, C42, C44) et `regles.ts` (C43, C45).

#### Groupe A : lecture des règles (étape `regles`)

Tous ces sites sont en famille `regles`, donc C44 (`corriger`), canal `R`, Pub. N. Le canal `R` est la copie de `rules.warnings` dans `W`, avec report des registres. `extractRules` lit la page (`findAllWithCriteria` sur `TEXT`, `INSTANCE` et `COMPONENT`, repli `findAll`), `findOne` dans chaque conteneur, `characters` des calques de règle, `variantProperties` et `getMainComponentAsync` (`isRuleInstance`). Son résultat est mémorisé par `inventaires.reglesDeLaPage` quand Architect fournit des inventaires.

| N° | Site | Condition | Contexte |
|---|---|---|---|
| 1 | `extractRules.ts` `extractRules`, branche sans conteneur | un conteneur au calque `component-name` vide ou marqué ne documente personne | Layer de l'orphelin ; canal local `absent` |
| 2 | `extractRules.ts` `extractRules`, branche sans conteneur et sans orphelin | aucune instance de la page n'écrit le nom du composant | sans node, absence déclarée `inexistant` (`noterSansNode`) |
| 3 | `extractRules.ts` `extractRules` | plusieurs conteneurs écrivent le même nom | Layer du premier conteneur ; `pousserNote` |
| 4 | `extractRules.ts` `ruleTagOf` | le tag du calque et celui de la valeur de variante diffèrent | Layer de l'instance de règle |
| 5 | `extractRules.ts` `extractRules` | une instance de règle écrit un texte sans aucun tag | sans node |
| 6 | `extractRules.ts` `signalerNonRedigees` | des règles gardent le marqueur à compléter, une ligne par tag | Layer de la première règle du tag, `noter` pour les autres |
| 7 | `extractRules.ts` `extractRules` | le conteneur ne contient aucune règle à tag | Layer du conteneur ; `pousserNote` |
| 8 | `rulesModel.ts` `buildRules` | le calque `content` d'une règle est vide (sauf `@icons` et `@default`) | sans node |
| 9 | `buildRules` | plusieurs `@usage` | sans node |
| 10 | `buildRules` | `@boolean` sans calque `prop` | sans node |
| 11 | `buildRules` | `@boolean` en double | sans node |
| 12 | `buildRules` | `@default` sans forme `propriété.valeur` | sans node |
| 13 | `buildRules` | `@default` en double | sans node |
| 14 | `buildRules` | `@icons` sans calque `icon` | sans node |
| 15 | `buildRules` | `@icons` dont `modifiable` et `strict` sont tous deux visibles ou tous deux masqués | sans node |
| 16 | `buildRules` | `@icons` en double | sans node |
| 17 | `buildRules` | `@prop` sans forme `propriété.valeur` | sans node |
| 18 | `buildRules` | `@prop` en double | sans node |

Pour les sites 8 à 18, `buildRules` ne reçoit que des `RuleEntry` (`tag`, `content`, `prop`, `iconName`, `iconPolicy`) : aucun objet Figma.

#### Groupe B : propriétés et variants (étapes `regles`, `variants`)

| N° | Site | Étape | Condition, famille, code, Pub., canal | Faits lus | Contexte |
|---|---|---|---|---|---|
| 19 | `exportComponent.ts` `exporterLeComposant` | `regles` | erreur levée (`ComponentExportError`), sans message dans un canal : deux axes de variante donnent la même clé (`collidingVariantAxes`). Architect : `bloquant()`, C42 `export:arret`, statut `arretee` | `componentPropertyDefinitions` | Component Set |
| 20 | `parsers.ts` `extractContractPropertyModel`, fonction `claim` | `regles` ; une seconde fois en `wrapper` pour les propriétés du wrapper | deux propriétés donnent la même clé publique ; `proprietes`, C34, P, `W` | `componentPropertyDefinitions` : clés normalisées, `type`, `variantOptions`, `defaultValue`, `preferredValues` | sans node |
| 21 | `parsers.ts` `extractContractPropertyModel` | idem | un axe dont les valeurs sont des tailles trouve son nom sémantique déjà pris ; `proprietes`, C34, P, `W` | idem | sans node |
| 22 | `parsers.ts` `extractContractPropertyModel` | idem | une booléenne `disabled` double la valeur « Disable » de l'axe d'états ; `proprietes`, C34, P, `W` | idem | sans node |
| 23 | `exporterLeComposant` | `regles` | des combinaisons de variantes n'existent pas, au singulier ou au pluriel ; `proprietes`, C34, N, `W` | `children` du set, valeurs de variantes (`findMissingVariantCombinationsParEtapes`) | Component Set |
| 24 | `componentTree.ts` `groupComponentsByVariantParEtapes` | `variants` | le set ne contient aucun variant ; `proprietes`, C34, P, `M` puis `E`. Sans effet publié : `exporterLeComposant` lève le site 25 avant `extractStructure` | `children` du set | sans node |
| 25 | `exporterLeComposant` | `variants` | erreur levée (`ComponentExportError`) : la matrice est vide. Architect : même sortie que le site 19 | `matriceLue.variants` | Component Set |

`extractContractPropertyModel` s'appelle aussi sans canal (`[]`) : dans Architect (`regles.ts` `clesDeclarees`), dans `imbriques.ts` `clesDeclareesParLePorteur` et dans `plugin-exporter/src/code.ts` `clesDeclareesPar`. Les messages y sont jetés.

#### Groupe C : composition, wrapper, état, imbriqués (étapes `composition`, `wrapper`)

| N° | Site | Étape | Condition, famille, code, Pub., canal | Faits lus | Contexte |
|---|---|---|---|---|---|
| 26 | `composedComponents.ts` `contractedOwner`, appelé par `scanComposedInstances` | `composition` | le maître d'une instance est introuvable ; `imbriques`, C42 (défaut), P, `C` (un canal par instance, concaténés dans l'ordre du document) | `getMainComponentAsync` (`maitreDe`) | Layer de l'instance |
| 27 | `exportableNodes.ts` `signalerUnMasque`, appelé par `releverLesNodesParEtapes` (`getAllNodes`) | `wrapper`, `structure.couleurs`, `structure.election`, `structure.reference`, `structure.vues`, `structure.tailles` | un calque statiquement masqué, sans liaison de visibilité, élague un contenu qui porte une variable ; `disposition`, C35 (rang 3), P, `W` ou `E` selon l'appelant. `pousserUneFois` évite le doublon | `visible`, `boundVariables` (dont `componentProperties`), `componentPropertyReferences.visible`, `parent`, `composed` | Layer du masqué |
| 28 | `semantics.ts` `buildStateModel` | `wrapper` | une valeur de l'axe d'états n'est pas reconnue ; `proprietes`, C34, P, `W` | axes et valeurs des variants, `STATE_SELECTORS` | sans node |
| 29 | `buildStateModel` | `wrapper` | une valeur d'état s'écrit autrement dans le vocabulaire UCM ; `proprietes`, C34, N, `S` | valeurs d'états, `REGISTRE_ETATS` | sans node |
| 30 | `propertySurface.ts` `mergeWrapperProps`, appelé par `buildContractPropertySurface` | `wrapper` | une clé est déclarée par le wrapper et par le set ; `proprietes`, C34, P, `W` | `componentPropertyDefinitions` du set et du wrapper | sans node |
| 31 | `propertyBindings.ts` `extractPropertyBindingsParEtapes` | `wrapper` | un calque se sert d'une propriété que le contrat ne publie pas ; `proprietes`, C34, P, `W`, une fois par propriété et cible | `componentPropertyReferences` (`visible`, `characters`, `mainComponent`) de chaque node de chaque variant, `publicKeyByFigmaName` | Layer du node (`pousserNote`) |
| 32 | `exporterLeComposant` | `wrapper`, en fin d'étape | aucune propriété de composant ; `proprietes`, C34, N, `W` | `componentPropertyDefinitions` | Component Set |

`releverLesImbriques` (`imbriques.ts`, étape `wrapper`) n'émet aucun message. Il produit le relevé que consomment le site 101 (le message), le site 48 (le silence des dessins) et `lireLesRegles` (`auParent`). Il lit `getAllNodes` de chaque variant, `parent` jusqu'à la racine, `componentPropertyDefinitions` du maître ou de son set, `remote`, ainsi que `maitres`, `contractes` et `composed` de `scanComposedMatrix`.

#### Groupe D : résolveur de variables (`variables.ts` `VariableNameResolver.loadName`)

Le résolveur reçoit `W` à sa construction. Ses messages n'entrent pas dans `E`, même quand une étape `structure.*` ou `extractSizes` les provoque. Il émet une fois par identifiant de variable (cache `namesByVariableId`), au premier appel. Pub. P, parce que `markProjectionWarningsSince` couvre `extractStructure`.

| N° | Site | Condition, famille, code | Faits lus | Contexte |
|---|---|---|---|---|
| 33 | `loadName`, branche ambiguë | le nom de la variable donne le même token qu'une autre, ou un groupe qui lui sert de feuille ; `fichier`, C42 (défaut) | `index.ambiguous` (issu de `getLocalVariablesAsync` et des collections locales) | sans node ; `usage.nodeName` et `usage.field` dans l'impact |
| 34 | `loadName`, branche non acquise | `getVariableByIdAsync` refuse ; `variables`, C41 | variable par identifiant, via `ressources.ts` | Layer de `usage.nodeId` (`pousserVersLeCalque`) ; sans `nodeId` (style de texte ou d'effets), sans node et déclaré `nom-publie` |
| 35 | `loadName`, collection | `getVariableCollectionByIdAsync` refuse ; `variables`, C30 | collection par identifiant | sans node |

#### Groupe E : couleurs et élection (étapes `structure.couleurs`, `structure.election`)

| N° | Site | Étape | Condition, famille, code, Pub., canal | Faits lus | Contexte |
|---|---|---|---|---|---|
| 36 | `extractVariantTokens.ts` `insertVariantLeaf` | `structure.couleurs` | deux variants ont les mêmes coordonnées normalisées ; `proprietes`, C34. Tous les appels de production passent un canal jeté (`[]`) : le message n'atteint aucun consommateur. Seuls les tests passent un vrai canal | axes et valeurs des variants | sans node |
| 37 | `extractVariantTokens.ts` `extractVariantTokens` | `structure.couleurs` | un variant n'a aucun fill ni stroke relié à une variable ; `variables`, C30, N, canal `N` | feuilles de `getSlotTokens` | Variant |
| 38 | `extractVariantTokens` | `structure.couleurs` | un token peint deux rôles selon les variants ; `variables`, C30, P, `E`, une fois par clé et par côté | rôles de rendu par clé | sans node |
| 39 | `extractSlotTokens.ts` `strokeAlignment`, groupé ou par calque | `structure.couleurs` | l'alignement du stroke est illisible ; `non-exportes`, C42 (table), P, `E` | `strokeAlign` | Layer, ou groupe de variants |
| 40 | `extractSlotTokens.ts` `warnPeinturesLibres`, groupé ou par calque | `structure.couleurs` | des fills ou strokes ne sont reliés à aucune variable ; `variables`, C30, P, `E` | `fills`, `strokes` (copie `PeintureLue`), `boundVariables` | Layer, ou groupe de variants |
| 41 | `extractSlotTokens.ts` `getSlotTokens`, groupé ou par calque | `structure.couleurs` | deux fills ou strokes superposés citent deux variables ; `non-exportes`, C42 (table), P, `E` | liaisons de peinture par nœud et par champ | Layer, ou groupe de variants |
| 42 | `getSlotTokens` | `structure.couleurs` | un stroke de même token reçoit deux rôles ; `variables`, C30, P, `E` | rôle de slot, token de stroke | Layer ; nomme l'autre calque |
| 43 | `getSlotTokens` | `structure.couleurs` | un stroke de même token a une largeur ou un alignement différents ; `variables`, C30, P, `E` | `strokeWeight`, `strokeAlign`, liaisons de côtés | Layer ; nomme l'autre calque |
| 44 | `getSlotTokens` | `structure.couleurs` | une couleur de même token reçoit deux rôles ; `variables`, C30, P, `E` | rôle de slot, token de couleur | Layer ; nomme l'autre calque |
| 45 | `layoutNodes.ts` `electVariantLayoutNodes` | `structure.election` | un variant ne contient pas l'instance du wrapper de référence ; `imbriques`, C42 (défaut), P, `E` | `getAllNodes` du variant, `getMainComponentAsync` des instances (`instanceOwnerId`) | Variant |

`extractIconLayers` (étape `structure.icones`) n'émet rien lui-même. Il appelle `resolveField` (sites 61 et suivants, canal `E`) pour la taille des icônes.

#### Groupe F : mise en page (étapes `structure.reference`, `structure.vues`, `structure.tailles`)

`extractLayout` s'exécute une fois sur le nœud de layout de référence (`structure.reference`) et une fois par variant (`structure.vues`). `extractSizeDimensions` (`structure.tailles`) appelle les fonctions `resolve*` de `nodeBindings.ts` avec `E`. Un même message revient donc plusieurs fois et se dédoublonne par phrase. Canal `E`, Pub. P.

| N° | Site | Condition, famille, code | Faits lus | Contexte |
|---|---|---|---|---|
| 46 | `extractStructure.ts` `extractStructure` | aucun nœud de layout de référence ; `disposition`, C42 (défaut) | élection du layout de référence | sans node |
| 47 | `extractLayout.ts` `warnUnsupportedProperties`, via `unsupportedProperties.ts` `unsupportedPropertyWarnings` | une propriété que le schéma ne porte pas (fill ou stroke mixte, dégradé ou image, blend mode, mask, dash, listes à puces et numérotées, décoration, OpenType, espacement de liste, listes et ponctuation suspendues) ; `non-exportes`, C42 (table). Une lecture de `fills` ou `strokes` qui lève fait lever l'analyse entière | `fills`, `strokes`, `blendMode`, `isMask`, `dashPattern`, `strokeWeight`, `getStyledTextSegments` (`listOptions`, `textStyleOverrides`), `openTypeFeatures`, `listSpacing`, `hangingList`, `hangingPunctuation` | Layer ; texte groupé pour les racines de variant sur les champs qui en ont un |
| 48 | `extractLayout.ts` `warnUndeclaredDrawing` | un calque n'est fait que de tracés et aucune règle `@icons` ne le nomme ; `imbriques`, C42 (défaut). Se tait sous un imbriqué sans règles | types des descendants (`estUnDessinNonDeclare`), `iconNames`, `composed`, canal `E` | Layer du dessin à nommer |
| 49 | `extractLayout.ts` `applyContainerProperties` | un conteneur de plus d'un calque sans auto layout ; `disposition`, C42 (défaut) | `layoutMode`, nombre d'enfants, `placeSesEnfantsParContraintes` | Layer |
| 50 | `applyContainerProperties` | un conteneur d'une dépendance sans auto layout ; `disposition`, C42 (défaut) | `layoutMode`, dépendances du slot | Layer |
| 51 | `extractLayout.ts` `describeNode`, via `structureTree.ts` `depthLimitWarning` | le calque dépasse la profondeur décrite et porte de l'information ; `disposition`, C42 (défaut) | profondeur, `informationDescendants` | Layer (`pousserNote`) |
| 52 | `describeNode` | la visibilité du calque et celle de la dépendance qu'il contient dépendent de deux propriétés ; `proprietes`, C34 | `componentPropertyReferences.visible`, dépendances | Layer |
| 53 | `describeNode` | un cadre contient des dépendances dont les calques sont masqués ; `imbriques`, C42 (défaut) | dépendances du slot, `publishesChildren` | Layer |
| 54 | `extractLayout.ts` `warnIntermediateBounds` | un calque entre le composant et ses slots fixe des bornes ; `disposition`, C42 (défaut) | `sizeBoundFields`, `parent` | Layer de chaque calque intermédiaire |
| 55 | `extractLayout.ts` `warnMissingDirection`, groupé ou par calque | le calque de layout n'a pas d'auto layout ; `disposition`, C42 (défaut) | `layoutMode`, `placeSesEnfantsParContraintes` | Layer, ou groupe de variants |
| 56 | `extractLayout.ts` `warnUntokenizedFreeSize`, groupé ou par calque | un axe figé sans variable sur un composant sans auto layout ; `variables`, C30 | `layoutSizing*`, `boundVariables` (`width`, `height`) | Layer, ou groupe de variants |
| 57 | `flexLayout.ts` `signalerPisteIllisible`, appelé par `gridTrackSizes`, groupé ou par calque | la taille d'une piste de grille est illisible ; `disposition`, C42 (défaut) | `gridColumnSizes`, `gridRowSizes` | Layer, ou groupe de variants |
| 58 | `flexLayout.ts` `flexContainerProperties`, groupé ou par calque | l'alignement d'auto layout est illisible ; `disposition`, C42 (défaut) | `primaryAxisAlignItems`, `counterAxisAlignItems` | Layer, ou groupe de variants |
| 59 | `flexLayout.ts` `flexItemProperties` | l'alignement d'un enfant est illisible (deux textes selon que le parent est une racine de variant) ; `disposition`, C42 (défaut) | `layoutAlign`, `childSizing` | Layer de l'enfant |
| 60 | `flexItemProperties` | `layoutGrow` hors 0 et 1 (deux textes selon que le parent est une racine de variant) ; `disposition`, C42 (défaut) | `layoutGrow`, `childSizing` | Layer de l'enfant |
| 61 | `nodeBindings.ts` `signalerSansVariable`, appelé par `resolveGroup` et `resolveOpacity`, groupé ou par calque | aucune variable reliée à une propriété (gap, padding, radius, stroke weight, opacité, tailles de slot) ; `variables`, C30 | `boundVariables` par champ (`getBinding`), valeurs par défaut implicites | Layer, ou groupe de variants |
| 62 | `nodeBindings.ts` `resolveGroup`, groupé ou par calque | gap ou padding sur un calque sans auto layout ; `disposition`, C42 (défaut) | `layoutMode` (`inapplicableReason`) | Layer, ou groupe de variants |
| 63 | `resolveGroup`, groupé ou par calque | vertical gap réglé sur « Auto » ; `variables`, C30 | `layoutWrap`, `primaryAxisAlignItems` | Layer, ou groupe de variants |
| 64 | `resolveGroup`, groupé ou par calque | les côtés sont reliés à des variables différentes ; `variables`, C30 | `boundVariables` de chaque côté | Layer, ou groupe de variants |
| 65 | `resolveGroup`, groupé ou par calque | deux réglages Figma (`cornerRadius` et quatre coins) se contredisent ; `variables`, C30 | `boundVariables`, jetons résolus | Layer, ou groupe de variants |
| 66 | `resolveGroup`, branche des côtés publiables, groupé ou par calque | certains côtés sont sans variable ou citent une variable introuvable ; `variables`, C41 si une variable est introuvable, sinon C30 | `boundVariables`, valeurs par défaut, jetons résolus | Layer, ou groupe de variants (un message par cause) |
| 67 | `resolveGroup`, fin de fonction | mêmes causes que le site 66 pour un groupe non publiable ; `variables`, C41 ou C30 | idem | Layer |
| 68 | `nodeBindings.ts` `resolveSizeBounds`, groupé ou par calque | des bornes minimales ou maximales sans variable ; `variables`, C30 | `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `boundVariables` | Layer, ou groupe de variants |

#### Groupe G : effets et typographie (étapes `structure.effets`, `structure.typographie`, `structure.typographie-exacte`)

`extractVariantTypography` tourne deux fois (référence, puis arbre exact) avec un cache de styles propre à chaque appel. Ses messages de canal `E` reviennent à l'identique et se dédoublonnent. Seul le site 80 est propre à la première passe. Canal `E`, Pub. P, sauf indication.

| N° | Site | Condition, famille, code | Faits lus | Contexte |
|---|---|---|---|---|
| 69 | `effectStyles.ts` `traduire` | un champ d'effet n'a aucune variable ; `variables`, C30 | `boundVariables` de l'effet, valeurs | sans node |
| 70 | `effectStyles.ts` `chargerLeStyle` | un effet n'est pas pris en charge ; `non-exportes`, C42 (table) | `style.effects` (type, visibilité) | sans node |
| 71 | `effectStyles.ts` `signalerSansStyle`, groupé ou par calque | un calque porte des effets sans style ; `styles`, C42 (défaut) | `effectStyleId`, `effects` | Layer, ou groupe de variants |
| 72 | `effectStyles.ts` `extractEffectStyles` | le style d'effets appliqué est introuvable ; `styles`, C42 (défaut) | `getStyleByIdAsync(effectStyleId)` | Layer |
| 73 | `extractEffectStyles` | les effets du calque diffèrent de ceux du style ; `styles`, C42 (défaut) | `effects` du calque et du style | Layer |
| 74 | `extractVariantTypography.ts` `loadTextStyle` | aucun style de texte unique sur le calque ; `styles`, C42 (défaut) | `textStyleId` | Layer |
| 75 | `loadTextStyle` | le style de texte est introuvable ou n'est pas de type `TEXT` ; `styles`, C42 (défaut) | `getStyleByIdAsync(textStyleId)` | Layer |
| 76 | `loadTextStyle` | le nom du style ne contient que des espaces ou des « / » ; `styles`, C42 (défaut) | `style.name` | sans node |
| 77 | `loadTextStyle` | une propriété typographique du style n'a aucune variable ; `variables`, C30 | `style.boundVariables`, valeurs numériques du style | sans node |
| 78 | `extractVariantTypography.ts` `signalerSurcharges` | une propriété du calque diffère de celle du style, ou est mixte ; `styles`, C42 (défaut) | propriétés littérales du calque et du style | Layer |
| 79 | `signalerSurcharges` | une plage ajoute italique ou gras au style ; `styles`, C42 (défaut) | `getStyledTextSegments(textStyleOverrides)` | Layer |
| 80 | `extractVariantTypography.ts` `extractVariantTypography` | un texte n'occupe pas la même place que dans le variant de référence ; `disposition`, C42 (défaut), N, canal `N` | chemins de slots des textes, `allowedSlotPaths` | Variant |
| 81 | `extractVariantTypography` | deux styles donnent la même clé de contrat ; `styles`, C42 (défaut) | `normalizeName(style.name)` | sans node |
| 82 | `extractVariantTypography` | un texte coupé sans « Max lines » ; `styles`, C42 (défaut) | `textTruncation`, `maxLines` | Layer |

#### Groupe H : après `structure` (dans `exporterLeComposant`, étape `structure.tailles` encore ouverte)

Ces sites s'exécutent après le retour d'`extractStructure` et avant `echantillons`. Les sites 83 à 87 et 99 sont N, les autres P. Canal `W`, sauf indication.

| N° | Site | Condition, famille, code | Faits lus | Contexte |
|---|---|---|---|---|
| 83 | `mergePropDescriptions.ts` `mergePropDescriptions` | une règle `@prop` vise une propriété qui n'est pas une enum ; `regles`, C44, N | `props`, `stateModel`, descriptions des règles | sans node |
| 84 | `mergePropDescriptions.ts` `mergeStateDescriptions` et `mergePropDescriptions` (message commun `unknownValueWarning`) | une règle `@prop` vise une valeur absente de l'axe ; `regles`, C44, N | `stateModel.states`, `props[x].values` | sans node |
| 85 | `mergeBooleanDescriptions.ts` `mergeBooleanDescriptions` | une règle `@boolean` vise une propriété qui n'est pas booléenne ; `regles`, C44, N | `props` | sans node |
| 86 | `mergeEnumDefaults.ts` `mergeEnumDefaults` | une règle `@default` vise une propriété qui n'est pas une enum ; `regles`, C44, N | `props` | sans node |
| 87 | `mergeEnumDefaults` | une règle `@default` vise une valeur absente ; `regles`, C44, N | `props[x].values` | sans node |
| 88 | `mergeIconRules.ts` `iconSlot` | une icône n'occupe pas exactement un slot (deux textes) ; `imbriques`, C42 (défaut), P | `layer.slots` (de `extractIconLayers`) | sans node |
| 89 | `mergeIconRules.ts` `iconSize` | la taille d'une icône change selon les variants ; `imbriques`, C42 (défaut), P | `layer.sizes` | sans node |
| 90 | `mergeIconRules.ts` `mergeIconRules` | une règle `@icons` ne trouve aucun calque ; `regles`, C44, P | `layers`, `rules` | sans node |
| 91 | `mergeIconRules` | plusieurs calques portent le nom dans un variant ; `imbriques`, C42 (défaut), P | `layer.maximumOccurrences` | sans node |
| 92 | `mergeIconRules` | une autre règle vise un calque au nom équivalent ; `regles`, C44, P | clés normalisées | sans node |
| 93 | `mergeIconRules` | la visibilité de l'icône dépend de propriétés différentes selon les variants ; `imbriques`, C42 (défaut), P | `layer.visibilityProps` | sans node |
| 94 | `mergeIconRules` | le remplacement dépend de propriétés d'échange différentes ; `imbriques`, C42 (défaut), P | `layer.swapProps` | sans node |
| 95 | `mergeIconRules` | la propriété d'échange n'est pas une `instance-swap` publiée ; `imbriques`, C42 (défaut), P | `props` | sans node |
| 96 | `mergeIconRules` | la visibilité de l'icône modifiable ne passe pas par une booléenne ; `imbriques`, C42 (défaut), P | `props` | sans node |
| 97 | `mergeIconRules` | le nom de la propriété runtime est déjà pris ; `imbriques`, C42 (défaut), P | `props` | sans node |
| 98 | `exportComponent.ts` `exporterLeComposant`, boucle des icônes | une icône active dans un variant a zéro ou plusieurs chemins de slot ; `imbriques`, C42 (défaut), P | `extracted.iconLayers[].variantNodeIds`, `variant.structure.children` (arbre exact), `icons` | sans node ; le nom du variant est dans le sujet |
| 99 | `exporterLeComposant` | ni intention ni règle d'intention à rédiger ; `regles`, C44, N | `rules.intent`, `rules.tagsARediger` | sans node |
| 100 | `exporterLeComposant`, après `mergeVariantDependencies` | une dépendance scannée n'est placée dans aucun arbre ; `imbriques`, C42 (défaut), P | `scannedComposes`, `variant.composes` (de `placedDependenciesFromTree` sur l'arbre exact) | sans node, déclaré `nom-publie` par le sujet |

#### Groupe I : après `compaction`

| N° | Site | Étape | Condition, famille, code | Faits lus | Contexte |
|---|---|---|---|---|---|
| 101 | `imbriques.ts` `pousserLesImbriques` (points de `pointsDesImbriques`) | `compaction`, étape ouverte avant `compactVariantsParEtapes` ; aucune étape propre | un composant imbriqué publié sans règles, ou une propriété sans porteur ; `imbriques` avec `severite: 'danger'`, donc C42 `bloquant`, P, canal `B` placé en tête de `allWarnings` | `ReleveDesImbriques` (`sansRegles`, `sansPorteur`), nom du composant | `nodeIds` de toutes les instances (`pousserNote` puis `noter`) ; le point sans porteur vise le composant exporté |

La compaction (`compactVariantsParEtapes`), l'élision (`elideContractParEtapes`, `elideNeutralsParEtapes`), les signatures (`signatureParEtapes`, `internParEtapes`) et la sérialisation (`serializeJsonParEtapes`) n'émettent aucun message. Leur seule erreur est le `TypeError` de `serializeJson` sur une structure circulaire. Le calcul d'`echantillons` (`extractVariantSampleParEtapes`) n'émet rien non plus : `extractSamples.ts` n'a aucun canal.

#### Groupe J : côté Architect

| N° | Site | Étape (Architect) | Rôle | Faits lus | Contexte et forme de sortie |
|---|---|---|---|---|---|
| 102 | `constatsDuMoteur.ts` `constatsDuMoteur`, appelé par `sandbox/analyse.ts` `analyser` | `controle-fusion` | un constat par phrase distincte de `warnings`, code par `TABLE_DU_MOTEUR` ; C42 (défaut) quand aucune règle ne reconnaît le point | `warnings`, `parties`, `localisations` de `resultat.export` ; ids des variants du relevé | `id` = `moteur:code:empreinte(titre ou phrase, nodes triés)` avec rang en cas de répétition ; `variants` et `layers` répartis d'après les ids du relevé ; `faits` = `titre`, `impact`, `action`, `geste` (la famille du point), `calque`, `elements`, ou `message` seul sans parties |
| 103 | `sandbox/analyse.ts` `bloquant`, trois appels dans `analyser` : sujet absent, relevé `sans-sujet`, exception du `catch` | avant `releve`, après `releve`, `catch` | le constat unique `export:arret`, C42 `bloquant`, famille `export`, statut `arretee`. Une exception peut venir du moteur : sites 19 et 25, relances de lecture dans `lirePeintures` (`extractSlotTokens.ts`) et `peinturesVisibles` (`unsupportedProperties.ts`), `serializeJson` | `messageDErreur(erreur)` | `faits.message` |
| 104 | `regles.ts` `constatsDeRegles`, avec `lireLesRegles` | phase `regles`, hors du moteur | C43 (pas d'instance de règles, avec correction `regles:creer:<id>`), C45 (propriété sans règle, règle sans propriété) | `lues.releve.conteneurDuComposant`, clés de `propDescriptions` et `booleanDescriptions`, `props` et `stateModel` du contrat, `imbriques.auParent` | Layer du composant pour C43, aucune correction pour C45. `lireLesRegles` ne s'exécute que si `resultat.etat === 'complete'`, et son échec est avalé (`catch(() => null)`) |

Le relevé compte 104 lignes : 101 pour le moteur (dont les erreurs 19 et 25, le site 24 sans effet publié et le site 36 sans effet en production) et 3 côté Architect. Les sites groupés ou par calque comptent pour un.

#### Pour 7.2 : ce qu'Architect reçoit sans le lire

`ComponentExport` porte `filename`, `content`, `warningCount`, `warnings`, `localisations`, `parties`, `localisationsDeclarees` et `imbriques`. Architect lit :

- `warnings`, `parties` et `localisations` (site 102) ;
- `content`, seulement pour `props` et `stateModel` : `modeleDeRegles` lit `type`, `values` des enums, les clés de `stateModel.states` et `axis` ;
- `imbriques.auParent` ;
- `etat` du résultat : `partielle` donne un statut `partielle` et supprime la lecture des règles, et `lus` et `nonLus` ne sont pas lus.

Architect ne lit ni `filename`, ni `warningCount`, ni `localisationsDeclarees`, ni `imbriques.sansRegles`, ni `imbriques.sansPorteur` (ces deux listes n'arrivent que par les points du site 101).

Ces calculs ne servent qu'à la publication : `echantillons`, `compaction`, `serialisation`, `buildMeta`, `figmaVariantLabels`, `viewStructures` et `structureView` (signatures, internage), `elideContract`, `renderingSemanticsFor`, `paintPlacementsFromPaths`, `exactPathsByVariant`, `targetedLayers`, `placedComposes`.

Ces résultats restent nécessaires aux diagnostics :

- l'arbre exact `extracted.variants[].structure.children` et `variant.composes` (sites 98 et 100) ;
- `iconLayers` (sites 88 à 97) ;
- `imbriques` (site 48, site 101 et `auParent`) ;
- `rules` (groupe A, sites 83 à 87, 90 à 92 et 99).

Le contrat que lit `lireLesRegles` a traversé `elideContract` et `serializeJson`. La case 7.7 vérifie ce que l'élision retire de `props` et de `stateModel`.

#### Pour 7.3 : ordre et état caché

- L'ordre de `allWarnings` est celui de `B`, `W`, `E`, avec dédoublonnage à la première occurrence. L'ordre des nodes d'une phrase est celui de l'inscription, reporté canal par canal.
- Chaque variant écrit dans un canal propre (`extractVariantTokens`, `scanComposedInstances`), concaténé ensuite dans l'ordre de la matrice. Les `Promise.all` ne changent donc pas l'ordre.
- Les sites 39 à 41, 47, 55 à 58, 61 à 66, 68 et 71 choisissent entre texte groupé et texte par calque d'après `estUneRacineDeVariant(canal, node)`, donc d'après l'identité du tableau `E`.
- `getAllNodes` mémorise ses masqués par (racine, `composed`) et les rejoue dans le canal de chaque appelant qui en passe un. Un appelant qui passe `[]` n'en reçoit aucun : `scanComposedInstances`, `extractIconLayers`, `slotNames`, `structureTree` et d'autres le font.
- Ces fonctions ne lisent aucun objet Figma et se prêtent à une extraction pure : `extractContractPropertyModel` (définitions), `buildStateModel` (axes et valeurs), `buildRules` (entrées), `mergePropDescriptions`, `mergeBooleanDescriptions`, `mergeEnumDefaults`, `mergeIconRules` (résumés d'icônes), `pointsDesImbriques` (relevé), `constatsDuMoteur` et `constatsDeRegles`.

#### Pour 7.7 : lecture du contrat par Architect

`JSON.parse` du contrat : `packages/plugin-architect/src/regles.ts` `lireLesRegles`, à la ligne `const contrat = JSON.parse(exportDuMoteur.content) as ContratLu`. `sandbox/analyse.ts` `LECTEURS_DE_FIGMA.regles` lui passe `resultat.export`. L'exporteur a un second `JSON.parse` du même contenu pour la création des règles (`plugin-exporter/src/code.ts`, `JSON.parse(analyse.content) as ContratLu`), que le lot ne vise pas.

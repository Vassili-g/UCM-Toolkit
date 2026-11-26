# Audit de la conception de P22

L'audit relève 43 failles : 13 bloquantes, 25 importantes et 5 mineures. La plus structurante porte sur la classification. Le critère du wrapper de dimensions range `.Segment` et `.Ring` parmi les wrappers, si bien que la conception actuelle ne décrit aucune des deux pièces des cas de référence (F1). Dix décisions nouvelles attendent le mainteneur, au §8, en plus des choix et des questions déjà ouverts.

Cet audit porte sur [RECHERCHE-PIECES-INTERNES.md](./RECHERCHE-PIECES-INTERNES.md) (choix 6 dans sa version du commit `dc6339ae`), [ETUDE-FORMAT-DES-PIECES.md](./ETUDE-FORMAT-DES-PIECES.md) et [CRITIQUE-PIECES-INTERNES.md](./CRITIQUE-PIECES-INTERNES.md). Le plan qui en découle est [PLAN-P22.md](./PLAN-P22.md).

## 1. Méthode et reproductions

L'audit suit cinq passes : carte des sous-sujets (§2), grille des angles (§3), preuve par le code (§4 et §5), cas limites (§6), saturation (§7).

Les scripts de reproduction vivent dans `_local/p22/scripts/`, hors de Git. Ils importent les fonctions du dépôt sans en modifier aucune.

| Script | Ce qu'il fait |
|---|---|
| `exporter.ts` | rejoue `analyserLeComposant` sur une capture, par `doubleDepuisCapture`, et écrit le contrat 14.0 ; `NOEUD` choisit le composant, `REGLES` déclare des conteneurs de règles sur les pages que la capture n'a pas balayées |
| `sortes.ts` | rend la sorte que `releverLesFaitsDUnImbrique` et `sorteDeLImbrique` donnent à chaque instance imbriquée, et le wrapper que `findWrapperReference` élit |
| `couleurs.cjs` | classe les couleurs liées du maître d'une pièce selon les deux définitions du « token du composant » |
| `critique.ts` | rejoue C1 sur `elideNeutrals` et liste les exports de `variant-views.mjs` |
| `explorer.cjs`, `explorer2.cjs` | listent les variants, les instances et les peintures d'une capture |

L'export du contrat se rejoue sur les deux captures. Sur Button, il passe sans hypothèse : 0 avertissement, contrat 14.0 de 50 474 octets. Sur Groupe, il échoue d'abord par `CaptureIncomplete` : la capture n'a pas relevé les textes des pages de `.Segment` et d'`Icon`, parce que l'index des règles venait de la mémoire de session (`nomsGardesDeLaPage`, `packages/plugin-socle/src/composant/contract/composedComponents.ts:355-387`). Avec l'hypothèse « `Icon` a ses règles » (`REGLES=Icon`), le rejeu rend exactement les diagnostics de l'Exporter et les constats C30 et C42 du rapport d'Architect. Cette hypothèse sert donc de point de départ : contrat 14.0 de 13 477 octets, 9 avertissements.

Les 67 tests que la critique cite passent : `node --import tsx --test packages/plugin-exporter/tests/elideNeutrals.test.ts packages/plugin-exporter/tests/budgetEtAnnulation.test.ts packages/kit/tests/composition.test.ts packages/adapter-typescript/tests/parite.test.mjs`.

## 2. Passe 1, carte des sous-sujets

S13 à S17 s'ajoutent aux douze sous-sujets de la recherche.

| # | Lit | Écrit | Possède | Peut se perdre |
|---|---|---|---|---|
| S1 Classification | nom, règles sur la page du maître, dimensions liées, axes du set | `SorteDImbrique` | kit (`composition.ts`), lu par le socle et Architect | une pièce rangée wrapper, une pièce à règles rangée dépendance |
| S2 Description de la pièce | set de la pièce, ses variants, `componentPropertyDefinitions` | entrée `pieces.<Pièce>` | moteur du socle | variantes non posées, propriétés |
| S3 Propriété des couleurs | liaisons du maître et de chaque instance posée | `tokens`, `strokes` de la pièce et des renvois | hôte pour les surcharges, pièce pour ses couleurs réelles | couleur réelle prise pour un aperçu, aperçu publié comme décision |
| S4 Couleur et glyphe d'une dépendance | surcharges de peinture et échanges sous l'instance | rien en 14.0 | contrat de la dépendance, puis l'hôte selon le choix 6 | la couleur que l'hôte donne à l'icône, le glyphe choisi |
| S5 Autres surcharges | `componentProperties`, `overrides`, contenu d'un `SLOT` | `args`, `samples`, vue du renvoi | hôte | texte, visibilité, contenu de slot |
| S6 Résolution | renvois, élision, liaisons, champs de racine | vue effective d'une occurrence | kit, une seule règle | effacement, choix d'une pièce imbriquée, liaison traversante |
| S7 Budget et performance | nombre de layers, de variants, de pages | `meta.coverage` | socle (`budget.ts`) | complétude, temps d'analyse |
| S8 Lecteurs et parité | contrat 15.0 | verdicts de `ucm check`, parité | kit, adaptateur | cardinalité, portée des clés |
| S9 Architect | relevé, catalogue, réponses rangées | constats, corrections | Architect et `@ucm-kit/core/controles` | couleurs de la pièce jamais jugées |
| S10 Règles des pièces | bloc `.componentRules` de la pièce | `intent` et documentation des props de l'entrée | designer, création des règles | documentation déplacée de l'hôte vers la pièce |
| S11 Version et compatibilité | `CONTRACT_VERSION`, fenêtre, corpus | 15.0, changelog | mainteneur du format | lecteur 14.0, corpus 14.0, API de l'hôte |
| S12 Preuves | mocks, captures, fichier du mainteneur | tests, lois | tests du moteur et du kit | preuve qui partage l'erreur qu'elle vérifie |
| S13 Définition du « token du composant » | collection, rôle, premier segment, désignation de P31 | verdict réel, aperçu ou anomalie | kit (`nommage.ts`) | deux définitions qui divergent |
| S14 Visibilité empruntée | `componentPropertyReferences.visible` d'un cadre et de ses dépendances | `visibilityProp` du slot | moteur (`extractLayout.ts`) | un label masqué avec l'icône |
| S15 Migration de l'hôte | règles et API publiées en 14.0 | règles et props en 15.0 | designer, développeur | props retirées, règles qui ne visent plus rien |
| S16 Localisation des diagnostics | nœud du relevé | bouton « sélectionner » | `localisation.ts`, Architect | correction faite sur une instance au lieu du maître |
| S17 Provenance des données de preuve | captures, fixtures | tests commités | mainteneur | donnée d'un client dans un fichier suivi |

## 3. Passe 2, grille

Les angles sont notés ainsi.

- A1 forme du contrat
- A2 extraction de l'Exporter
- A3 types, schéma et version du kit
- A4 lecteurs, validation et `ucm check`
- A5 parité de l'adaptateur
- A6 analyse et corrections d'Architect, en full UCM et en agnostique
- A7 interface et textes au designer
- A8 compatibilité, migration et réexport
- A9 budget et performance
- A10 preuves et tests
- A11 documents et invariants

| # | A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | A9 | A10 | A11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | F1 | F1, F2 | rien | rien | F29 | F2, F3 | F35 | F39 | rien | F40 | F4, F5 |
| S2 | F11 | F11, F36 | F6 | F28 | F29 | F30 | F36 | F37 | F26 | F40 | F6 |
| S3 | F14 | F14, F15, F16 | rien | F28 | rien | F13, F30 | F17 | F39 | rien | F41 | F13 |
| S4 | F19 | F20, F21 | F21 | F21 | F27 | F19 | F21 | F39 | rien | F41 | F20 |
| S5 | F12 | F10, F23 | F10 | F10 | rien | rien | F23 | rien | rien | F40 | F10 |
| S6 | F6, F7 | F8, F9 | F6, F7 | F28 | rien | rien | rien | rien | F25 | F40 | F6 |
| S7 | F24 | F24 | rien | F25 | F27 | F24 | rien | rien | F24, F26 | F26 | F25 |
| S8 | F28 | rien | F28 | F28 | F27 | rien | rien | F38 | F25 | F28 | F28 |
| S9 | rien | rien | rien | rien | rien | F30, F32 | F31 | rien | F24 | F30 | F30 |
| S10 | F34 | F33 | rien | rien | rien | F34 | F35 | F34 | rien | F33 | F33 |
| S11 | F38 | rien | F37 | F37 | F39 | rien | rien | F37, F38, F39 | rien | F37 | F38 |
| S12 | rien | rien | rien | rien | rien | rien | rien | rien | F26 | F40, F41, F42, F43 | F37 |
| S13 | F13 | F13, F17 | rien | rien | rien | F13 | F17 | rien | rien | F41 | F13 |
| S14 | F22 | F22 | rien | rien | rien | F22 | F22 | F39 | rien | F22 | F22 |
| S15 | F39 | F34 | rien | rien | F39 | F34 | F34 | F39 | rien | F40 | F38 |
| S16 | rien | F31 | rien | rien | rien | F31 | F31 | rien | rien | F31 | rien |
| S17 | rien | rien | rien | rien | rien | rien | rien | rien | rien | F41 | rien |

Les cases « rien » se justifient ainsi.

- S1 × A3, A4, A9 : la sorte d'un imbriqué ne se publie pas, et son calcul ne lit que des faits déjà relevés.
- S2 × A1 hors F11 : la forme de l'entrée reprend celle d'un contrat sans `meta` ; l'étude la décrit champ par champ et la critique n'y trouve rien d'autre.
- S3 × A3 : le choix 6 ne change aucun type, il décide quelles valeurs entrent dans les types existants. S3 × A5 : la parité ne lit aucune couleur. S3 × A9 : le jugement relit des liaisons déjà lues par le moteur.
- S4 × A9 : la lecture des surcharges sous une dépendance se fait sur des nœuds que `scanComposedMatrix` a déjà parcourus.
- S5 × A5, A6, A8, A9 : les booléens et textes posés dans une pièce n'entrent ni dans la parité, ni dans un constat d'Architect ; leur forme suit F10.
- S6 × A5 à A8 : la résolution est une règle du kit, lue par les lecteurs (A4) ; aucun écran ne l'affiche.
- S7 × A3, A7, A8 : le budget ne se publie que par `meta.coverage`, déjà typé.
- S8 × A2, A6, A7 : les lecteurs ne touchent ni l'extraction ni Architect.
- S9 × A1 à A5, A8 : Architect ne publie rien dans le contrat.
- S10 × A3, A4, A5, A9 : les règles d'une pièce prennent la forme du champ `intent` existant (décision prise).
- S11 × A2, A6, A7, A9 : la version ne change rien à la lecture de Figma.
- S12 : seules les cases A9, A10 et A11 portent un fait ; les autres angles ne lisent pas les preuves.
- S13 × A3, A4, A5, A8, A9 : la définition sert au moteur et à Architect ; le contrat publie seulement son résultat.
- S16 × A1, A3, A4, A5, A8, A9, A11 : la localisation n'entre pas dans le contrat (`ComponentExport.localisations`).
- S17 : seule la preuve est concernée.

## 4. Passe 3, ce que les reproductions établissent

Faits relevés sur les captures, que les failles citent.

- Button pose `.sizeWrapperButton` `Size=Medium` dans ses 90 variants, et `.Ring` dans ses 18 variants `Focus`. Aucun variant ne pose `Size=Large` ni `Size=Small`.
- Le maître de `.sizeWrapperButton` peint 12 couleurs liées (4 par variante), toutes des primitives ; chaque variant de Button les surcharge par ses tokens `Button/Color/…`.
- `.Ring` a un seul variant et une seule propriété, l'axe `Property 1` de valeur unique `Default`. Exporté seul, il publie `props.property1 = { type: "enum", values: ["default"] }`.
- `sortes.ts` rend `wrapper-de-dimensions` pour `.sizeWrapperButton` (4 dimensions liées), pour `.Ring` (1, son rayon) et pour `.Segment` (2, gap et padding de son calque `Cadre`). `findWrapperReference` élit `.Segment` comme wrapper de Groupe.
- Le contrat 14.0 de Groupe publie donc neuf props : ses trois (`theme`, `avecMilieu`, `middle`) et six de `.Segment` (`disabled`, `selected`, `position`, `bordGauche`, `bordDroit`, `iconLeft`).
- Le maître de `.Segment` porte 447 couleurs liées. 411 visent un token dont le nom commence par le dossier du composant hôte ; 90 de ces 411 sont posées sur le glyphe de l'instance d'`Icon` que la pièce contient ; 36 visent un token générique. Aucune instance posée dans Groupe ne surcharge une couleur de la pièce.
- Les instances d'`Icon` de `.Segment` ont `Color=Neutral`. Le maître d'`Icon` `Color=Neutral` peint son glyphe par un token d'`Icon`. Dans `.Segment`, le glyphe est échangé (`default` devient un autre glyphe, dont le maître est peint en noir brut) et repeint par un token du dossier de l'hôte.
- Exporté seul, `.Segment` donne un contrat de 77 135 octets (90 variants, 24 vues, 13 structures). `.Ring` seul donne 3 123 octets, `.sizeWrapperButton` seul 10 181 octets, `Icon` seul 36 761 octets.

## 5. Les failles

### S1. Classification

#### F1. Le critère du wrapper capture les pièces des deux cas de référence

- Sous-sujet et angle : S1, extraction et référentiel du kit.
- Énoncé : toute instance non dépendance dont le sous-arbre lie un gap, un padding ou un rayon complet est rangée wrapper de dimensions, et le wrapper passe avant la pièce, si bien que `.Segment` et `.Ring` ne deviendraient jamais des pièces.
- Preuve : `packages/kit/src/referentiel/composition.ts:33-35` ; `countLayoutBindings`, `packages/plugin-socle/src/composant/contract/componentTree.ts:334-345`, compte tout le sous-arbre ; `DIMENSIONS_DE_LAYOUT`, `packages/plugin-socle/src/composant/contract/nodeBindings.ts:71-76`. `sortes.ts` rend `wrapper-de-dimensions` pour les trois pièces préfixées des captures et élit `.Segment` wrapper de Groupe (§4). L'option A de Q1 (« wrapper avant pièce ») fige ce résultat en 15.0, et le critère de fin 4 de `pistes.json` (« un Button avec `.Ring` ») ne peut pas être tenu.
- Gravité : bloquante.
- Correction : un wrapper est l'unique instance élue d'un hôte qui remplit trois conditions, mesurées par le socle et par Architect avec les mêmes faits. Elle est posée une fois dans chaque variant de l'hôte, son set porte un axe que la détection des tailles reconnaît (FORMAT.md, « Dimensions par taille »), et elle lie au moins une dimension. Toute autre instance préfixée est une pièce.
- Décision D1 (critère du wrapper).

| Option | Conséquence |
|---|---|
| A. Wrapper = instance élue, posée une fois par variant, dont le set porte un axe de tailles | `.sizeWrapperButton` reste wrapper ; `.Segment` et `.Ring` deviennent des pièces ; le critère se teste sur les deux captures |
| B. Le designer déclare le wrapper (une règle dans le bloc de l'hôte) | Aucune supposition, mais un geste de plus sur chaque composant à wrapper, et un Button non migré perd ses props au réexport |
| C. Garder le critère actuel | P22 ne décrit ni `.Segment` ni `.Ring`, et Groupe garde une API fausse |
| D. Le critère est l'exposition Figma : une instance imbriquée dont le designer expose les propriétés (« Expose properties from nested instances », `isExposedInstance`) est un wrapper, ses props rejoignent l'API de l'hôte ; une instance préfixée non exposée est une pièce | Aucune supposition : le designer a déjà déclaré le cas dans Figma. Mesuré sur les captures : `.sizeWrapperButton` exposé dans les 90 variants de Button, `.Ring` non exposé dans ses 18, `.Segment` non exposé dans ses 15 instances de Groupe. Les trois cas tombent juste, sans condition de taille |

Recommandation : D, ajoutée après l'audit par la conversation principale. Elle remplace la condition « axe de tailles » de A par un fait que Figma porte, et garde les dimensions du wrapper lues comme en 14.0. Le moteur ne lit aujourd'hui `exposedInstances` que dans l'échantillon (`extractSamples.ts:271`).

#### F2. Une pièce qui reçoit ses règles devient une dépendance sans contrat, tant que quatre lecteurs ne changent pas ensemble

- Sous-sujet et angle : S1, extraction et Architect.
- Énoncé : la décision « le préfixe avant les règles » doit changer d'un seul geste `sorteDeLImbrique`, `estContracte`, l'index des noms contractés et la sorte d'Architect ; sinon le premier bloc de règles posé sur une pièce la fait sortir du contrat de l'hôte.
- Preuve : `sorteDeLImbrique` teste les règles d'abord (`composition.ts:33`) ; `estContracte` ne lit pas le préfixe (`composedComponents.ts:517-519`) ; `releverLesFaitsDUnImbrique` déduit les règles de `composed` (`componentTree.ts:386-392`) ; Architect passe `reglesTrouvees` à `sorteDeLImbrique` (`packages/plugin-architect/src/imbriquesDuReleve.ts:168-177`). Rejeu `REGLES=Icon,.Segment` : le contrat de Groupe passe de 13 477 à 6 776 octets, la pièce devient une dépendance et son contenu disparaît.
- Gravité : bloquante.
- Correction : un seul prédicat du kit, « nom préfixé », exclu du test de dépendance dans les quatre lecteurs, livré dans le même lot que l'obligation de règles des pièces et avant la création de leurs blocs.
- Décision : aucune (décision prise).

#### F3. Le socle et Architect comptent les dimensions liées de deux façons

- Sous-sujet et angle : S1, Architect.
- Énoncé : le socle compte les liaisons de tout le sous-arbre de l'instance, Architect seulement celles de l'instance et des calques que sa surcharge vise, si bien que les deux peuvent classer différemment la même instance.
- Preuve : `componentTree.ts:334-345` contre `imbriquesDuReleve.ts:45-64`, dont l'en-tête (lignes 6-11) reconnaît le double comptage.
- Gravité : importante.
- Correction : le critère de F1 se calcule dans le kit sur des faits que les deux relevés fournissent de la même façon (axes du set, occurrences par variant, dimensions liées du maître) ; un test croise les deux sur les captures rejouées.
- Décision : aucune, suit D1.

#### F4. La décision sur les règles ne dit pas si un wrapper préfixé à propriétés est une pièce

- Sous-sujet et angle : S1 et S10, documents.
- Énoncé : « une pièce préfixée avec au moins une propriété a des règles » couvre littéralement `.sizeWrapperButton`, alors que Q1 A le garde wrapper, ses props fusionnées dans celles de Button et documentées par le bloc de Button.
- Preuve : décision du §5 de la recherche ; Q1 de l'étude ; `packages/plugin-exporter/SPEC.md`, table « Quelles propriétés publiées reçoivent une règle ».
- Gravité : importante.
- Correction : écrire qu'un wrapper élu n'est pas une pièce, et que ses props se documentent dans le bloc de l'hôte, comme aujourd'hui.
- Décision : rattachée à D1, avec Q1.

#### F5. Une pièce partagée n'est pas détectable, et le référentiel l'admet

- Sous-sujet et angle : S1, documents et extraction.
- Énoncé : la décision sort la pièce partagée du périmètre, mais le référentiel la reconnaît (« Une pièce interne peut servir un seul composant ou plusieurs », `composition.ts:6`), et l'Exporter ne peut pas savoir qu'une pièce sert ailleurs sans lire tout le document.
- Preuve : `packages/plugin-exporter/invariants/composition.md`, `loiDuDocumentIntact.test.ts` refuse `loadAllPagesAsync` dans `contract/`.
- Gravité : importante.
- Correction : la forme par hôte décrit déjà une pièce partagée sans perte, une fois dans chaque hôte. Seul le choix 6 change : une couleur liée aux tokens d'un autre hôte tombe dans le cas 3 du choix 6.
- Décision D7 (pièce partagée).

| Option | Conséquence |
|---|---|
| A. Une pièce partagée se décrit dans chaque hôte, sans détection ; ses couleurs se jugent contre l'hôte qui l'exporte | Aucune lecture de plus ; la règle du référentiel reste vraie ; un avertissement de cas 3 dit la couleur d'un autre hôte |
| B. Détecter le partage (`getInstancesAsync`) et refuser | Coût non mesuré ; refus d'un cas que la forme sait décrire |
| C. Ne rien dire | La limite reste écrite dans la recherche et nulle part ailleurs |

Recommandation : A.

### S2 et S6. Forme du renvoi et résolution

#### F6. L'absence d'un champ du renvoi vaut héritage, ce que l'invariant interdit et que l'élision efface (C1)

- Sous-sujet et angle : S6, forme et invariants.
- Énoncé : l'étude fait reprendre à un renvoi sans `view`, `tokens` ou `strokes` la partie de la variante citée ; c'est un défaut implicite, et un remplacement vide disparaît à la sérialisation.
- Preuve : `packages/plugin-exporter/invariants/portee-du-contrat.md:6` (« Ni merge, ni héritage, ni défaut ») et ligne 7 (« Aucune valeur neutre écrite ») ; `critique.ts` rend `{"slotPath":["header"],"variant":"9:1"}` pour un renvoi `tokens: {}, strokes: {}, pieces: []`, comme la critique l'a vu.
- Gravité : bloquante.
- Correction : le renvoi cite toujours sa `view` et porte toujours sa feuille effective ; une feuille absente vaut « aucune couleur », comme pour `variants[].tokens` aujourd'hui (FORMAT.md §2). Aucune valeur vide n'a alors de sens à protéger.
- Décision D4 (forme du renvoi), avec Q3 et Q4.

| Option | Conséquence |
|---|---|
| A. Renvoi complet : `view` toujours citée, feuille effective toujours publiée, absence = vide | L'invariant tient ; la loi « aucune valeur neutre » ne change pas ; le contrat recopie la feuille de la variante dans chaque renvoi qui ne la change pas |
| B. Absence = héritage, vide protégé dans l'élision | Contrat plus court ; deux sens de l'absence dans un même contrat ; l'invariant change |
| C. Marqueur d'effacement explicite | Un troisième vocabulaire que chaque lecteur apprend |

Recommandation : A. La mesure de F26 chiffre son coût avant le lot du moteur.

#### F7. Les renvois imbriqués n'ont ni type ni règle d'absence (C2)

- Sous-sujet et angle : S6, forme.
- Énoncé : le renvoi d'une pièce posée dans une pièce, qui choisit une autre variante que celle du maître de la pièce intermédiaire, n'a aucune forme écrite.
- Preuve : une seule ligne du tableau du §5 de l'étude (« Propriété d'une pièce imbriquée exposée à l'hôte »), sans type ; le §8 ne liste pas ce type. La critique C2 donne le contre-exemple `.Header` et `.Badge`.
- Gravité : bloquante.
- Correction : le type du renvoi est récursif (`pieces` dans le renvoi, `slotPath` relatif à la pièce), avec la règle de F6 ; le relevé compare chaque instance imbriquée à la variante que le maître intermédiaire pose, exposée ou non.
- Décision : suit D4.

#### F8. L'arrêt aux pièces supprime les liaisons traversantes que le contrat publie aujourd'hui (C3)

- Sous-sujet et angle : S6, extraction.
- Énoncé : `extractPropertyBindingsParEtapes` lit les calques par `getAllNodesParEtapes`, et une carte d'arrêt aux pièces retire de sa lecture les calques intérieurs liés à une propriété de l'hôte.
- Preuve : `packages/plugin-socle/src/composant/contract/propertyBindings.ts` ; dans le contrat 14.0 de Groupe, les liaisons `b1` à `b6` portent des `nodeId` de la forme `I<instance de .Segment>;<calque>`, publiées parce que la pièce est traversée comme wrapper.
- Gravité : bloquante.
- Correction : relever les liaisons de chaque occurrence avant l'arrêt, et rattacher chaque propriété au composant qui la déclare par son identifiant Figma (`#12:3`), jamais par sa clé normalisée.
- Décision : aucune.

#### F9. La racine de la pièce et le slot de l'hôte peuvent porter le même réglage (C4), et le cas réel existe

- Sous-sujet et angle : S6, extraction et résolution.
- Énoncé : sans table de propriétaire par champ, la largeur, la hauteur, l'opacité ou la rotation d'une occurrence se lisent deux fois.
- Preuve : les instances de `.Segment` dans Groupe surchargent `width`, `height` et `primaryAxisSizingMode` (`overrides` des nœuds `<id>` et `<id>` de la capture). Le §6 de l'étude exclut `sizing` de la fusion sans dire qui le porte.
- Gravité : importante.
- Correction : une table par champ de racine dans FORMAT.md (source, propriétaire dans l'occurrence, priorité), dont `sizing` par axe ; un test sur une instance qui change sa taille et son opacité.
- Décision : aucune.

#### F10. Les `args` du renvoi n'ont pas de règle de résolution et portent le nom d'un champ non normatif (C5)

- Sous-sujet et angle : S5 et S6, forme, lecteurs et invariants.
- Énoncé : un `args.showIcon: false` peut contredire un slot dont la `visibilityProp` vaut `showIcon` sans règle qui tranche, et le même nom `args` désigne ailleurs une donnée d'échantillon que rien ne contrôle.
- Preuve : `packages/plugin-exporter/invariants/echantillon.md:8` (« `args` est la projection fermée… »), et « Tout le non normatif tient sous `samples` » ; les instances de `.Segment` posent `BordGauche`, `BordDroit` et `Icon Left` à des valeurs différentes selon leur position.
- Gravité : importante.
- Correction : le renvoi publie les valeurs normatives sous `values`, comme `variants[].values` ; le kit porte une seule fonction de résolution, appelée par le moteur, les diagnostics et le dépliage ; un booléen faux masque le slot lié, et une surcharge de visibilité sans propriété l'emporte sur lui.
- Décision : aucune.

#### F11. Le critère C ne dit pas qu'une pièce masquée par une propriété de l'hôte reçoit un renvoi

- Sous-sujet et angle : S2, forme et validation.
- Énoncé : « chaque slot `piece` reçoit un renvoi dans chaque variant qui le rend » laisse sans renvoi une pièce masquée dans tous les variants par une propriété de l'hôte, alors que le contrat la publie.
- Preuve : le `SLOT` `Middle` de Groupe a `visible = false` dans ses 3 variants, lié à `AvecMilieu` ; le contrat 14.0 publie son contenu (slot `middle`, `visibilityProp: "avecMilieu"`).
- Gravité : importante.
- Correction : un renvoi pour chaque slot `piece` de l'arbre publié du variant, masqué par une propriété compris.
- Décision : aucune.

#### F12. Une pièce posée dans le contenu par défaut d'un `SLOT` de l'hôte n'a pas de règle

- Sous-sujet et angle : S5, forme.
- Énoncé : Q6 traite le `SLOT` d'une pièce rempli par l'hôte, pas le `SLOT` de l'hôte dont le contenu par défaut est une pièce, et le relevé positionnel s'arrête à un `SLOT`.
- Preuve : `Middle` contient une instance de `.Segment` ; `masterInstances` saute le contenu d'un `SLOT` (`composedComponents.ts:487-489`) ; FORMAT.md, « Ce que `overrides` ne peut pas voir », borne d'un `SLOT`.
- Gravité : importante.
- Correction : le contenu par défaut d'un `SLOT` de l'hôte reste normatif, comme en 14.0, et sa pièce reçoit un renvoi lu directement sur l'instance, sans comparaison positionnelle.
- Décision D6, avec Q6.

| Option | Conséquence |
|---|---|
| A. Contenu par défaut normatif, renvoi lu sur l'instance | La 14.0 garde son sens ; le renvoi se lit sans passer par le maître de l'hôte |
| B. Contenu par défaut rangé dans l'échantillon | Le contenu par défaut sort du normatif, changement de classe 4 |

Recommandation : A pour le `SLOT` de l'hôte ; Q6 B (avertir) pour le `SLOT` de la pièce, jusqu'à ce que le fichier de test du mainteneur contienne le cas.

### S3. Propriété des couleurs (choix 6)

#### F13. Le « token du composant hôte » a deux définitions qui ne se recouvrent pas

- Sous-sujet et angle : S3 et S13, extraction, Architect, documents.
- Énoncé : la mesure du choix 6 lit un préfixe `components/<hôte>/` dans le nom de la variable, alors que le kit reconnaît un token du composant à son premier segment égal au nom du set, dans une collection de rôle `components`, rôle qui n'existe que dans un fichier déclaré UCM.
- Preuve : `estDuComposant`, `packages/kit/src/controles/nommage.ts:478-481` ; filtre de rôle, `nommage.ts:353-355` ; rôle posé seulement en architecture UCM, `packages/kit/src/controles/catalogue.ts:49`. `couleurs.cjs` sur `.Segment` : 411 couleurs sur 447 par le préfixe, 0 par la définition du kit (la collection n'a pas de rôle reconnu, et le premier segment est le dossier). Sur `.sizeWrapperButton` et Button, l'inverse : les tokens `Button/…` de la collection `components` passent le kit et pas le préfixe.
- Gravité : bloquante.
- Correction : une seule définition dans le kit, `estDuComposant` sur le chemin relatif au dossier des composants. En full UCM, le dossier est la collection `components` ; en agnostique, la collection et le dossier que le designer désigne (étape 1 de « Relier le composant », P31). L'Exporter et Architect l'appellent tous deux.
- Décision D2 (jugement des couleurs), avec le choix 6.

#### F14. Le cas 3 signale les couleurs d'aperçu du wrapper de Button, le cas de référence

- Sous-sujet et angle : S3, extraction.
- Énoncé : les variantes `Size=Large` et `Size=Small` de `.sizeWrapperButton` ne sont posées par aucun variant de Button, et leurs 8 couleurs d'aperçu tombent dans le cas 3 (« visible dans une variante que l'hôte ne pose pas »).
- Preuve : §4 ; les nœuds `3:424` et `3:432` de la capture peignent les mêmes primitives que `3:428`. Ces variantes se rendent pourtant, par l'axe `size` fusionné, avec les surcharges que Button pose sur `Size=Medium`.
- Gravité : bloquante.
- Correction : juger une couleur par emplacement (chemin du calque dans la pièce, champ, indice de la peinture), sur toutes les variantes du set. Un emplacement que chaque instance posée surcharge est d'aperçu dans toutes les variantes qui le portent.
- Décision D2.

| Option | Conséquence |
|---|---|
| A. Jugement par emplacement (chemin, champ, indice), sur tout le set | Button : 4 emplacements d'aperçu, aucun avertissement ; Groupe : les 36 couleurs génériques avertissent ; l'unité est celle des réponses de « Relier le composant » |
| B. Jugement par nœud de chaque variante | Button : 8 faux avertissements ; les variantes non posées se jugent sans instance |

Recommandation : A, avec F15 et F17.

#### F15. « Surchargée par chaque instance posée » est vrai sans instance

- Sous-sujet et angle : S3, extraction.
- Énoncé : un emplacement qu'aucune instance posée ne montre est surchargé par chacune d'elles au sens logique, et le cas 2 le classerait d'aperçu en silence.
- Preuve : les instances de Groupe montrent 10 des 90 variantes de `.Segment` ; les 36 couleurs génériques vivent sur des calques des variantes non posées (états autres que `Default`).
- Gravité : importante.
- Correction : le cas 2 exige au moins une instance posée qui montre l'emplacement ; sans elle, l'emplacement relève du cas 3.
- Décision : rattachée à D2.

#### F16. La mesure du choix 6 mélange les couleurs de la pièce et celles qu'elle pose dans une dépendance

- Sous-sujet et angle : S3 et S4, extraction.
- Énoncé : 90 des 411 couleurs comptées réelles sont posées sur le glyphe de l'instance d'`Icon` que contient `.Segment`, une surcharge dans une dépendance que l'extraction écarte, et la règle ne dit pas lequel des deux régimes s'y applique.
- Preuve : `couleurs.cjs`, classe « préfixe, masqué, 90, calque `Vector` » ; `extractVariantTokens` écarte tout ce qui vit sous une dépendance (paramètre `composed`, `packages/plugin-socle/src/composant/contract/extractVariantTokens.ts:70-116`).
- Gravité : importante.
- Correction : une couleur posée dans une dépendance suit S4 (D3), quel que soit le composant qui la pose ; elle se publie dans l'entrée du composant qui la pose, ici la pièce.
- Décision : suit D3.

#### F17. L'Exporter, agnostique par option, n'a pas de dossier des composants

- Sous-sujet et angle : S3 et S13, extraction et textes.
- Énoncé : sans la désignation de P31, aucune couleur n'est un token du composant hors d'un fichier UCM, et toute couleur non surchargée d'une pièce avertirait.
- Preuve : `catalogue.ts:49`. Selon les §7 et §9 de [RECHERCHE-CONSTRUCTION-DES-COMPOSANTS.md](../Construction%20des%20composants/RECHERCHE-CONSTRUCTION-DES-COMPOSANTS.md), la désignation vit dans la Configuration d'Architect, que l'Exporter ne lit pas.
- Gravité : importante.
- Correction : l'Exporter lit la désignation rangée par Architect dans `ESPACE_ARCHITECT` quand elle existe. Sans elle, il ne juge que la surcharge. Un emplacement surchargé partout est d'aperçu, un autre se publie comme en 14.0, sans avertissement de cas 3.
- Décision : rattachée à D2.

#### F18. Deux sources de couleur échappent à la règle : le style de couleur et le token d'un autre composant

- Sous-sujet et angle : S3, extraction et Architect.
- Énoncé : une peinture portée par un style de couleur n'est ni liée ni en dur au sens du choix 6, et une couleur de pièce liée au token d'un autre composant tombe dans le cas 3 alors que C19 la juge déjà.
- Preuve : le choix 6 ne lit que les liaisons ; C19, `packages/kit/src/controles/mapping.ts:258`. Les deux captures ne contiennent aucun style de couleur (`couleurs.cjs`).
- Gravité : mineure.
- Correction : un style de couleur suit la règle de l'extraction actuelle pour les couleurs ; une couleur liée à un autre composant reçoit le constat C19 dans l'analyse de l'hôte, sans second constat.
- Décision : aucune.

### S4. Couleur et glyphe d'une dépendance

#### F19. Les icônes de `.Segment` reçoivent leur couleur par surcharge, pas par l'axe `Color`

- Sous-sujet et angle : S4, forme et Architect.
- Énoncé : la recherche et le prompt présentent Groupe comme le principe opposé pour les icônes, alors que sa couleur d'icône est une surcharge dans la dépendance, comme dans le futur Button, et que le contrat 14.0 dit le contraire au consommateur.
- Preuve : §4 ; l'échantillon du contrat 14.0 publie `{"component":"Icon","args":{"size":"small","background":"none","color":"neutral"}}` pour les trois icônes, et la couleur réelle est un token de l'hôte qui varie avec la sélection et l'état.
- Gravité : bloquante.
- Correction : S4 traite les deux composants de la même façon. L'axe `Color` d'`Icon` (8 couleurs de marque) ne sait pas dire une couleur qui suit l'état de l'hôte : la surcharge est la seule source exacte.
- Décision D3 (couleur et glyphe d'une dépendance).

| Option | Conséquence |
|---|---|
| A. L'hôte publie, dans le renvoi ou la feuille du variant, la couleur qu'il pose sur chaque emplacement d'une dépendance ; le contrat de la dépendance dit que cette couleur est fournie | Rien ne se perd ; un champ normatif de plus ; FORMAT.md et `composition.md` changent |
| B. Une surcharge de couleur dans une dépendance est une anomalie : Architect demande de choisir la variante de la dépendance | Le contrat reste simple ; impossible pour Groupe, dont la couleur suit des états qu'`Icon` n'a pas |
| C. A, et Architect signale en plus toute surcharge que l'axe de la dépendance saurait dire | A, avec un constat d'information |

Recommandation : A.

#### F20. Une surcharge de peinture dans une dépendance se confond avec les peintures d'un glyphe échangé

- Sous-sujet et angle : S4, extraction et invariants.
- Énoncé : lire la couleur que l'hôte pose dans une dépendance par `overrides` ou par la présence d'une liaison confond une couleur voulue avec celle que Figma rapporte après un échange d'icône, et rate les surcharges héritées du maître de la pièce.
- Preuve : FORMAT.md:1156-1160 (« Une surcharge de peinture y est particulièrement trompeuse… ») ; dans `.Segment`, le glyphe est échangé et repeint. Le nœud `<id>` (instance d'`Icon` dans l'hôte) rend `overrides: []`, alors que sa peinture diffère de celle du maître d'`Icon`. La surcharge vient du maître de la pièce, et `overrides` exclut les surcharges héritées (critique, §6).
- Gravité : bloquante.
- Correction : une couleur posée dans une dépendance se juge en comparant la liaison effective de chaque emplacement à celle du même emplacement dans le maître du composant placé, après échange ; une peinture brute du maître du glyphe n'est pas une couleur de la dépendance. `composition.md` (« Ses couleurs appartiennent à son contrat ») et `echantillon.md` changent avec D3.
- Décision : suit D3.

#### F21. Une icône devenue dépendance fait perdre la règle `@icons` de l'hôte, sa prop et son glyphe

- Sous-sujet et angle : S4, extraction, types, lecteurs, textes.
- Énoncé : quand l'icône d'un hôte est une instance d'`Icon` à règles, la règle `@icons` de l'hôte ne trouve plus son calque, `iconLeftName` et `iconRightName` sortent de l'API, et le glyphe choisi n'est publié nulle part de normatif.
- Preuve : `extractIconLayers.ts:107-108` écarte les nœuds de `composed` ; `mergeIconRules.ts:97-105` rend « aucun calque de ce nom dans le composant », dont l'action (« Vérifiez l'orthographe ») est fausse ; le contrat 14.0 de Button publie `icons.arrowLeftLong` et `iconLeftName`, celui de Groupe (où `Icon` a ses règles) ne publie aucun `icons` ; son échantillon ne publie aucun `swaps`, cause non établie. Le diagnostic (5) de l'Exporter relevé par la conversation principale (« Règle @icons Icon : aucun calque de ce nom ») en est l'effet.
- Gravité : bloquante.
- Correction : une règle `@icons` peut viser le slot d'une dépendance. Le slot publie alors `composes`, et l'entrée `icons` garde sa `runtimeProp` et son nom de glyphe, lu sur l'`INSTANCE_SWAP` de la dépendance quand elle en a une, sinon par la comparaison positionnelle de `swaps`.
- Décision : rattachée à D3.

### S5 et S14. Visibilité et propagation

#### F22. Un cadre emprunte la visibilité d'une dépendance qu'il contient à n'importe quelle profondeur, même s'il range d'autres calques

- Sous-sujet et angle : S14, extraction, textes, invariants.
- Énoncé : le slot d'un cadre qui contient une seule dépendance prend sa `visibilityProp`, si bien que le contrat masque tout le cadre, label compris, avec l'icône.
- Preuve : `composedSlotDependenciesParEtapes` cherche les dépendances par `findAll` dans tout le sous-arbre (`packages/plugin-socle/src/composant/contract/slotRelations.ts:29-39`) ; `extractLayout.ts:516-519` et `544-549` en tirent la visibilité du slot. Contrat 14.0 de Groupe : le slot `-segment` entier porte `visibilityProp: "iconLeft"`. `.Segment` exporté seul : 12 structures où le slot `cadre` (icône et label) porte `visibilityProp: "iconLeft"`. Le même chemin produit le diagnostic (2) de l'Exporter sur `Middle` (« sa visibilité et celle du composant Icon dépendent de deux propriétés différentes »), dont le conseil est faux : les deux propriétés sont légitimes à deux niveaux. FORMAT.md:1481 et `composition.md` disent qu'une seule dépendance peut prêter sa visibilité au cadre, et que ce que le cadre range à côté lui appartient.
- Gravité : bloquante (défaut de la 14.0 que P22 rend visible dans chaque pièce).
- Correction : une dépendance prête sa visibilité au cadre seulement si elle en est l'unique contenu exportable, avec le test de `nestedSlotVisibility` (`controlsWholeSlot`) ; le diagnostic ne compare que la visibilité d'une dépendance enfant directe du cadre ; test rouge d'abord sur un cadre « icône et label ».
- Décision : aucune.

#### F23. Un axe de la pièce que l'hôte pose à sa propre valeur est signalé comme une collision

- Sous-sujet et angle : S5, extraction et textes.
- Énoncé : le diagnostic « `theme` : `.Segment` et le component set la déclarent tous les deux, renommez l'une des deux » vise une propagation voulue, chaque variant de l'hôte posant la pièce au `Theme` de même valeur.
- Preuve : diagnostic (1) relevé par la conversation principale, reproduit par `exporter.ts` ; les 9 instances de la capture portent le `Theme` de leur variant (§4).
- Gravité : importante.
- Correction : en 15.0, la pièce garde son axe dans son entrée et la collision disparaît ; le renvoi dit la variante posée. Pour un wrapper (F1), le message distingue l'axe propagé, dont chaque instance suit la valeur de l'hôte, de la vraie collision.
- Décision : aucune.

#### F44. Un même token de contour posé avec des épaisseurs par côté différentes selon la position de la pièce est signalé comme un conflit

- Sous-sujet et angle : S6, extraction et textes.
- Énoncé : après la correction des tokens dans Figma, l'Exporter avertit que le contour de `Cadre` « est déjà posé par le calque `Cadre`, avec une stroke weight ou un alignement différents ». Les deux calques cités sont les `Cadre` de deux segments posés dans le même variant de l'hôte.
- Preuve : dans la capture de Groupe, le maître de `.Segment` peint le même token de contour sur `Cadre`, alignement `INSIDE`, avec des épaisseurs par côté qui suivent l'axe `Position` : First `[1, 0, 1, 1]`, Middle `[1, 0, 1, 0]`, Last `[1, 1, 1, 0]` (haut, droite, bas, gauche). La 14.0 met les segments à plat dans le variant de l'hôte et range un contour par token, avec une seule épaisseur.
- Gravité : importante. Le dessin est juste ; le conseil « réglez les deux strokes de la même façon » casserait les bordures, et « reliez-les à deux variables différentes » n'a pas de sens pour une même couleur.
- Correction : en 15.0, chaque variante de la pièce a son entrée et ses contours ; le conflit disparaît (5.2, 5.3). Avant, le message nomme les deux occurrences par leur pièce et leur variante, et non deux fois le même nom de calque (2.3).
- Décision : aucune.

### S7. Budget et performance

#### F24. Le budget ne compte pas les layers des pièces et garde toujours le variant de référence (C6)

- Sous-sujet et angle : S7, extraction et Architect.
- Énoncé : le décompte s'arrête à chaque instance, garde le variant de référence de chaque analyse hors borne, et une pièce lue en entier échappe donc au budget d'Architect.
- Preuve : `packages/plugin-socle/src/composant/contract/budget.ts:41-48` (frontière à l'instance) et `124-129` (premier variant gardé). L'Exporter n'a pas de budget (`handleExportComponent` ne transmet pas `budgetDeLayers`, `exportComponent.ts:167-174`) : un contrat publié reste complet ; seule l'analyse d'Architect, bornée à 2 000 layers, est concernée.
- Gravité : importante.
- Correction : le budget d'Architect compte les variants de chaque pièce lue ; une pièce coupée rend l'analyse `partielle` et ses constats le disent ; l'Exporter, sans budget, résout tous les renvois avant de publier.
- Décision : aucune.

#### F25. Un contrat entrant peut décrire un cycle, et le dépliage peut croître en `2^d` (C7)

- Sous-sujet et angle : S7 et S8, lecteurs.
- Énoncé : l'ensemble des sets vus termine la découverte dans le moteur, pas la résolution d'un JSON fabriqué, et la profondeur 12 se compte par définition ou par chemin déplié sans règle.
- Preuve : `validation-graphe-contrats.mjs:218-247` détecte déjà un cycle de `composes`, pas de `pieces` ; `MAX_STRUCTURE_DEPTH = 12`, `structureTree.ts:35`.
- Gravité : importante.
- Correction : la validation refuse un cycle de `pieces` avant tout dépliage ; le résolveur garde une pile d'occurrences ; la borne de profondeur s'applique au chemin déplié et produit un refus nommé.
- Décision : aucune.

#### F26. La taille annoncée vient d'un contrat synthétique, et le rejeu donne un ordre de grandeur plus élevé (C8)

- Sous-sujet et angle : S7, budget et preuves.
- Énoncé : l'étude annonce +58 % sur une pièce de 16 variantes ; la pièce réelle de Groupe a 90 variantes et donne seule un contrat près de six fois plus lourd que son hôte.
- Preuve : §4 ; contrat 14.0 de Groupe, 13 477 octets ; `.Segment` seul, 77 135 octets. L'entrée de pièce, sans `meta` ni règles, s'en rapproche : le contrat 15.0 de Groupe dépasserait 80 000 octets.
- Gravité : importante.
- Correction : un protocole de mesure rejoué sur les captures de `_local/` (taille sérialisée, temps d'analyse, temps de compaction, nombre d'appels aux maîtres et de pages chargées) avant le lot du moteur ; le chiffre commité vient d'un mock aux noms inventés de même forme (90 variantes, 4 axes, 3 booléens).
- Décision : aucune ; un seuil se fixe après la mesure.

### S8. Lecteurs et parité

#### F27. La parité perd la cardinalité des dépendances posées dans les pièces (C9)

- Sous-sujet et angle : S8, parité.
- Énoncé : avec Q5 A, le `composes` de l'hôte ne contient plus les dépendances de ses pièces, et la parité compte 0 `Icon` pour Groupe, qui en rend 3.
- Preuve : `ecartsDeParite` ne lit que `contrat.composes` (`packages/adapter-typescript/src/parite.mjs:424-438`) ; le contrat 14.0 de Groupe liste 3 `Icon`.
- Gravité : importante.
- Correction : la parité compte les occurrences de chaque vue effective, pièces dépliées, puis le maximum entre variantes ; le graphe des contrats fait l'union des cibles.
- Décision : aucune ; Q5 reste au mainteneur, et sa recommandation A tient avec cette correction.

#### F28. Les lecteurs résolvent les clés à la racine, et `resoudreLaVue` n'existe pas (C10)

- Sous-sujet et angle : S8, types et lecteurs.
- Énoncé : un catalogue partagé demande une résolution qui reçoit le contrat, l'entrée propriétaire, le variant et le renvoi ; les lecteurs actuels lisent `rendering.keyRoles` et `props` à la racine.
- Preuve : `critique.ts` liste les exports de `variant-views.mjs` sans `resoudreLaVue` ; `diagnostic-contrastes.mjs:144-146` lit `contrat.rendering.keyRoles`.
- Gravité : importante.
- Correction : une interface de résolution unique dans `variant-views.mjs`, utilisée par la validation, les contrastes, la parité et les tests de loi ; la compaction de `nodeSuffix` se calcule sur toutes les occurrences d'une définition partagée.
- Décision : aucune.

#### F29. Le nom de slot d'une pièce commence par un tiret, et deux noms donnent le même identifiant

- Sous-sujet et angle : S1 et S8, forme et parité.
- Énoncé : le slot d'une instance préfixée se nomme `-ring` ou `-segment`, et `Card` et `.Card` donnent tous deux `CardProps`.
- Preuve : contrats 14.0 de Button (`"slot":"-ring"`) et de Groupe (`"slot":"-segment"`) ; critique C9.
- Gravité : mineure.
- Correction : le nom de slot retire le préfixe ; l'export refuse deux pièces, ou une pièce et l'hôte, de même identifiant de code, en nommant les deux.
- Décision : aucune.

### S9 et S16. Architect

#### F30. Architect ne lit jamais le maître d'une pièce, et personne ne signale le cas 3

- Sous-sujet et angle : S9, Architect en full UCM et en agnostique.
- Énoncé : l'analyse de l'hôte ne juge pas une liaison héritée du maître, C25 saute le fond d'une instance, et une pièce analysée seule tait le nommage, le mapping, les couches et les oublis ; les 36 couleurs génériques de `.Segment` ne reçoivent aucun constat.
- Preuve : `packages/kit/src/controles/couche.ts:6` ; `corrections.ts:237` ; `nommage.ts:483-490`. Aujourd'hui, Architect lit le set de `.Segment` parce qu'il le croit wrapper (`imbriquesDuReleve.ts:179`, `jeuxDeWrappers`) ; corriger F1 sans étendre cette lecture aux pièces retirerait les C30 du rapport sur ses calques.
- Gravité : bloquante.
- Correction : Architect lit le set de chaque pièce comme celui d'un wrapper, avec l'hôte comme propriétaire des tokens ; les constats du cas 3, des couleurs d'aperçu non surchargées et des couleurs peintes dans une instance (P-a de P31) jugent par emplacement (F14), dans un fichier UCM comme dans un fichier libre, la définition de F13 donnant le dossier.
- Décision : aucune ; l'écran suit D8.

#### F31. Un diagnostic sur un calque de pièce sélectionne les instances, alors que la correction se fait dans le maître

- Sous-sujet et angle : S16, extraction, Architect, textes.
- Énoncé : les points « Variables à relier » sur `Cadre`, `BordGauche` et `BordDroit` sélectionnent des calques `I<instance>;<calque>`, et le message ne dit pas d'aller dans le maître ; une épaisseur de contour par côté, lue `mixte`, reçoit le message d'une valeur sans variable.
- Preuve : diagnostic (3) relevé par la conversation principale. Dans le rapport d'Architect, le C30 de `Cadre` vise `<id>` et deux autres calques d'instance, alors que le calque du maître est `<id>`.
- Gravité : importante.
- Correction : un calque de pièce se localise sur le nœud du maître de la pièce, et le message nomme la pièce à ouvrir ; le cas `mixte` reçoit son propre texte.
- Décision : aucune ; les textes passent par la conversation principale.

#### F32. « Relier le composant » ne dit pas où écrire la liaison d'un emplacement de pièce

- Sous-sujet et angle : S9, Architect.
- Énoncé : P31 compte comme emplacement « chaque calque peint dans une instance », sans dire si la liaison s'écrit dans le maître de la pièce, qui sert tous les variants et toutes les variantes, ou dans chaque instance posée.
- Preuve : §7 de la recherche de P31, étape 2 ; Groupe lie ses couleurs dans le maître, Button dans chaque instance.
- Gravité : importante.
- Correction : suivre le verdict du choix 6 de chaque emplacement.
- Décision D8, attend P31.

| Option | Conséquence |
|---|---|
| A. Couleur réelle : liaison dans le maître ; couleur d'aperçu : liaison dans chaque instance | Les deux cas de référence gardent leur construction ; le plugin écrit dans une autre page quand la pièce y vit |
| B. Toujours dans les instances | Le maître garde ses aperçus ; les variantes non posées restent sans couleur réelle |
| C. Une question par emplacement | Juste mais lent sur 447 couleurs |

Recommandation : A, à valider sur la maquette de P31 (case 2.1 de son plan).

### S10. Règles des pièces

#### F33. Un axe à valeur unique fait d'une pièce une « pièce à propriétés »

- Sous-sujet et angle : S10, extraction et documents.
- Énoncé : `.Ring` n'a qu'un axe `Property 1` de valeur `Default`, le nom que Figma donne par défaut, et la décision lui imposerait un bloc de règles, faute de quoi l'export de Button bloque.
- Preuve : §4 ; `.Ring` exporté seul publie `property1` à une seule valeur.
- Gravité : importante.
- Correction : seule compte une propriété qui laisse choisir, soit un axe d'au moins deux valeurs, un booléen, un texte, un échange d'instance ou un `SLOT`.
- Décision D5.

| Option | Conséquence |
|---|---|
| A. Propriété = choix possible | `.Ring` devient une pièce sans propriété, sans règles (Q2) ; Button s'exporte sans bloc de plus |
| B. Toute propriété déclarée | Le designer supprime l'axe ou écrit un bloc vide de sens ; le critère de fin 4 dépend de ce geste |

Recommandation : A.

#### F34. Les règles d'hôte qui documentent des props de pièce perdent leur cible au réexport

- Sous-sujet et angle : S10 et S15, extraction, Architect, migration.
- Énoncé : la création des règles pose aujourd'hui dans le bloc de l'hôte les props qu'une pièce déclare, et ces règles viseraient en 15.0 des props que l'hôte ne publie plus.
- Preuve : `packages/plugin-exporter/SPEC.md`, table « Quelles propriétés publiées reçoivent une règle », ligne « Une de ses pièces internes la déclare » ; C45 (« Une règle d'usage et les propriétés du composant ne se correspondent pas »).
- Gravité : importante.
- Correction : « Créer les règles d'usage » d'une pièce reprend le texte d'une règle `@prop` de l'hôte de même clé exacte et la marque `[À compléter]` sinon ; l'analyse de l'hôte nomme les règles à déplacer vers le bloc de la pièce.
- Décision : aucune.

#### F35. Le point bloquant des imbriqués dit d'une pièce ce qui n'est vrai que d'une dépendance

- Sous-sujet et angle : S10, textes.
- Énoncé : le titre et l'impact de `pointsDesImbriques` (« décrit les calques… sans indiquer qu'il faut réutiliser ce composant ») sont faux pour une pièce, que le contrat décrit justement.
- Preuve : `packages/plugin-socle/src/composant/contract/imbriques.ts:318-333`.
- Gravité : importante.
- Correction : un texte propre à la pièce sans règles, écrit par la conversation principale avec la skill `rediger-diagnostics-ucm`.
- Décision : aucune.

#### F36. Une pièce sélectionnée seule s'exporte en contrat

- Sous-sujet et angle : S2 et S10, extraction et textes.
- Énoncé : sélectionner `.Segment` produit un contrat complet, alors qu'une pièce préfixée n'a jamais de contrat.
- Preuve : `NOEUD=<id>` rend un contrat de 77 135 octets et 19 avertissements ; `getSelectedComponent` accepte tout composant (`exportComponent.ts:98-112`).
- Gravité : mineure.
- Correction : l'Exporter refuse une pièce préfixée sélectionnée et nomme l'action (exporter l'hôte) ; l'analyse d'Architect d'une pièce seule reste possible.
- Décision : aucune.

### S11 et S15. Version, compatibilité, migration

#### F37. Le contrat de fixture demandé par la piste contredit l'invariant du corpus, et le corpus 14.0 n'existe pas

- Sous-sujet et angle : S11, types, lecteurs, migration.
- Énoncé : `pistes.json` demande un contrat de fixture 15.0 dans `packages/kit/fixtures/contrats/`, que l'invariant réserve à un corpus figé de la version précédente, et la 15.0 demande un corpus 14.0 produit par le moteur 14.0 avant tout changement.
- Preuve : `packages/kit/invariants/corpus-de-test.md` ; `packages/kit/fixtures/contrats/` contient 11.0, 12.0 et 13.0 ; les contrats du Playground sont en 13.0 (`meta.contractVersion`).
- Gravité : bloquante.
- Correction : figer d'abord un corpus 14.0, produit par le moteur courant sur les captures du Playground (`_local/recettes/` porte Button et Alert, fichier « UCM Tests - Composants ») ; ranger l'exemple 15.0 dans un contrat fabriqué par un test du kit ; retirer le corpus 13.0 avec son code quand la fenêtre passe à 14.0 et 15.0 ; corriger le point de `pistes.json`.
- Décision : aucune.

#### F38. P22 relève de trois classes, et l'ordre de sortie d'une majeure du contrat n'est pas écrit

- Sous-sujet et angle : S11, migration et documents.
- Énoncé : la recherche classe P22 en classe 2 seulement, alors que la 15.0 retire des props d'hôtes (classe 3) et change le sens de l'absence d'une dépendance dans le `composes` de l'hôte (classe 4).
- Preuve : `docs/format/COMPATIBILITE.md`, table des classes ; seule « L'ordre d'une nouvelle version du format de tokens » existe ; F27 et F39.
- Gravité : importante.
- Correction : l'entrée de `CHANGELOG-FORMAT.md` nomme les classes 2, 3 et 4 ; `COMPATIBILITE.md` reçoit l'ordre d'une majeure du contrat (paquets ensemble, kit d'abord ; adaptation du code consommateur ; plugin ; réexport).
- Décision : aucune.

#### F39. L'API publique des hôtes change au réexport

- Sous-sujet et angle : S15, parité, migration.
- Énoncé : Groupe perd six props absorbées de `.Segment` (F1), et Button perdrait `iconLeftName` et `iconRightName` si F21 n'est pas corrigé ; le code du Playground garde ces props et sa parité devient rouge.
- Preuve : §4 ; contrat 14.0 de Button, `props`.
- Gravité : importante.
- Correction : le changelog liste les props retirées par cas ; la recette sur le Playground prévoit l'adaptation du code avant de monter la borne.
- Décision : aucune.

### S12 et S17. Preuves

#### F40. Une carte de pièces vide ne redonne pas la 14.0

- Sous-sujet et angle : S12, preuves.
- Énoncé : le critère A compare `E15` déplié à `E14` produit sans pièces, alors que F1, F2 et F22 changent aussi la sortie de `E14`.
- Preuve : §6 de l'étude ; critique, §5.
- Gravité : importante.
- Correction : chaque test pose ses attentes explicites sur le mock ; la comparaison `E14` et `E15` se limite aux cas que F1, F2 et F22 ne touchent pas, et l'invariant « chaque export du banc est rejoué avec l'ancien chemin » (`tests-du-moteur.md`) garde l'ancienne classification le temps du lot.
- Décision : aucune.

#### F41. La capture de Groupe ne vient pas du Playground

- Sous-sujet et angle : S17, preuves.
- Énoncé : le fichier Figma de la capture porte le nom d'un design system client, et ses variables portent des noms de marque client, alors que la recherche et le prompt la présentent comme une capture du Playground.
- Preuve : `capture.fichier.nom` de `_local/p22/groupe-rapport-2026-11-26.json` ; le Playground ne contient aucun Groupe (`../UCM-Playground/src/components/`).
- Gravité : importante.
- Correction : aucun test commité ne reprend ses noms de variables ou de calques ; le mock de F26 et les tests du plan emploient des noms inventés de même forme ; le détail reste dans `_local/`.
- Décision D9.

| Option | Conséquence |
|---|---|
| A. Les noms déjà commités (`Groupe`, `.Segment`, axes) restent ; tout autre nom reste dans `_local/` | Les documents gardent leur lecture ; les tests restent inventés |
| B. Remplacer aussi les noms déjà commités par des noms inventés | Une réécriture de la recherche et du prompt |

Décision du mainteneur : B. Les noms tirés de la capture sont remplacés par des noms inventés (`Groupe`, `.Segment`, `Cadre`, `BordGauche`, `BordDroit`, `AvecMilieu`) dans les documents, et l'historique public a été purgé des noms d'origine.

#### F42. L'essai R1 est en partie établi par la capture

- Sous-sujet et angle : S12, preuves.
- Énoncé : `.Segment` vit sur une autre page que Groupe, et Architect a lu ses 90 variantes pendant une analyse réelle ; le moteur charge déjà la page de chaque propriétaire (`nomsGardesDeLaPage`, `page.loadAsync()`).
- Preuve : remontée des parents dans la capture (page « Nested component » pour la pièce, page « Segmented button » pour l'hôte) ; `composedComponents.ts:355-387`.
- Gravité : mineure.
- Correction : garder le chargement explicite (critique, §6) ; l'essai R1 ne sert plus qu'à savoir si `getMainComponentAsync()` charge la page, ce que le plan ne suppose pas.
- Décision D10.

| Option | Conséquence |
|---|---|
| A. Retirer l'essai R1 du plan | Un geste de moins pour le mainteneur ; le moteur garde le chargement explicite |
| B. Le garder | L'incertitude documentée de R1 se lève, sans changer le code |

Recommandation : A.

#### F43. Une capture d'Architect ne rejoue pas l'index des règles d'une session chaude

- Sous-sujet et angle : S12, preuves.
- Énoncé : la capture de Groupe ne contient pas les textes des pages de `.Segment` et d'`Icon`, que l'index des règles a repris de sa mémoire de session, si bien que le rejeu demande une hypothèse.
- Preuve : `CaptureIncomplete : Les types TEXT ne sont pas capturés pour la page 16387:63661` au premier rejeu.
- Gravité : mineure.
- Correction : le build de capture oublie l'index (`oublierLIndexDuDocument`) avant de capturer, ou capture les textes des pages de chaque propriétaire rencontré.
- Décision : aucune.

## 6. Passe 4, cas limites

| Cas | Ce que la conception fait | Faille |
|---|---|---|
| Button, capture | `.sizeWrapperButton` wrapper, `.Ring` wrapper non élu, couleurs d'aperçu du wrapper signalées par le cas 3 | F1, F14, F33 |
| Groupe, capture | `.Segment` élu wrapper, six props absorbées, segment entier masqué par `iconLeft`, couleurs d'`Icon` perdues | F1, F19, F22, F23 |
| Pièce dans une pièce | entrée unique, renvoi imbriqué sans type | F7 |
| Wrapper préfixé à propriétés | wrapper selon Q1 A, règles non dites | F4 |
| Pièce sans propriété | entrée sans règles (Q2) ; `.Ring` compte comme pièce à propriétés | F33 |
| Dépendance dans une pièce ou un wrapper (`Icon` dans `.sizeWrapperButton`) | arrêt de `composes` dans la vue de la pièce ; couleur et glyphe perdus, règle `@icons` sans cible | F16, F19, F20, F21 |
| Instance qui ne surcharge pas une couleur d'aperçu | cas 3 si l'emplacement n'est pas surchargé partout | F14, F15 |
| Couleur d'aperçu liée à une primitive ou écrite en dur | liée : cas 2 ou 3 ; en dur : avertissement actuel de couleur non liée | rien de plus |
| Échange d'instance d'une icône vers une autre dépendance | `swaps` positionnel ; peintures du glyphe échangé prises pour une surcharge | F20, F21 |
| Variant de l'hôte qui masque la pièce | statique : pas de renvoi ; par une propriété : renvoi non dit | F11 |
| Deux instances de la même pièce dans un variant | un renvoi par `slotPath` (Groupe : trois instances, trois variantes) | F29 pour le nom de slot |
| Booléen de la pièce lié à une prop de l'hôte | liaison traversante perdue à l'arrêt | F8 |
| Propriété `SLOT` de la pièce remplie par l'hôte | Q6 B : avertissement | F12 |
| `SLOT` de l'hôte dont le contenu par défaut est une pièce | non traité | F12 |
| Remplacement vide | effacé à l'élision | F6 |
| Pièce rangée sur une autre page | lue par le chargement existant | F42 |
| Cycle d'imbrication | moteur : sets vus ; JSON entrant : non refusé | F25 |
| Budget dépassé | Exporter sans budget ; Architect partiel | F24 |
| Contrat 14.0 réexporté en 15.0 | props d'hôte retirées, `composes` réduit, règles d'hôte orphelines | F34, F38, F39 |
| Lecteur 14.0 face à un contrat 15.0 | verdict `recent` (`version-contrat.mjs:20-21`), comme prévu | rien de plus |
| Axe de pièce propagé depuis l'hôte | collision signalée | F23 |
| Pièce partagée par deux hôtes | une entrée par hôte, cas 3 sur les couleurs de l'autre hôte | F5 |
| Pièce sélectionnée seule | contrat produit | F36 |
| Épaisseur de contour par côté (`mixte`) | message de valeur sans variable | F31 |
| Fichier libre (agnostique) | aucune couleur n'est token du composant | F13, F17 |

## 7. Passe 5, saturation

La première relecture de la carte a ajouté S13 à S17, et avec elles F13, F17, F22, F31 et F41. La deuxième a confronté les cinq diagnostics réels de l'Exporter sur Groupe : quatre recoupent F1, F21, F22 et F31, le cinquième (texte sans style) est juste, et F23 s'est ajoutée. La troisième a relu chaque option recommandée contre les invariants de l'Exporter et du kit, et n'a ajouté aucune faille qui change le plan. L'audit s'arrête là.

## 8. Décisions à demander au mainteneur

De la plus structurante à la moins structurante. Chaque décision renvoie à la faille qui porte ses options.

1. D1. Critère du wrapper et de la pièce, avec Q1 (F1, F4). Recommandation : D, l'exposition Figma.
2. D2. Jugement des couleurs du choix 6 : une définition du token du composant (F13), le jugement par emplacement (F14), le cas sans instance (F15), l'Exporter sans dossier désigné (F17). Recommandation : A de F14, avec les corrections de F13, F15 et F17.
3. D3. Couleur et glyphe d'une dépendance posée par l'hôte ou par une pièce (F19, F20, F21). Recommandation : A.
4. D4. Forme du renvoi : absence et vide (F6), avec Q3 et Q4. Recommandation : A de F6, Q3 A, Q4 A.
5. D5. Définition d'une propriété pour l'obligation de règles (F33). Recommandation : A.
6. D6. Contenu par défaut d'un `SLOT` de l'hôte, avec Q6 (F12). Recommandation : A, et Q6 B.
7. D7. Pièce partagée (F5). Recommandation : A.
8. D8. Écriture de « Relier le composant » dans le maître ou dans l'instance (F32). Recommandation : A, après la maquette de P31.
9. D9. Noms tirés de la capture de Groupe (F41). Tranchée : B, noms inventés et historique purgé.
10. D10. Essai R1 (F42). Recommandation : A.

Restent aussi les choix 1, 3, 4 et 5, la parité, Q2 et Q5 de la recherche et de l'étude. L'audit confirme les recommandations des choix 1, 3 et 5, de Q2 et de Q5 avec F27. Le choix 4 option A est remplacé par D2 pour les couleurs. La parité tient avec F27 à F29.

## 9. Ce que l'audit n'a pas pu vérifier

- La lecture dans Figma : chaque rejeu passe par `doubleDepuisCapture`, qui rend ce qu'Architect a lu et lève sur le reste.
- L'état réel des règles de Groupe, de `.Segment` et d'`Icon` dans le fichier : la capture ne porte pas les textes de leurs pages, et le rejeu suppose qu'`Icon` seul a ses règles (F43).
- La cause de l'absence de `swaps` pour le glyphe échangé dans l'échantillon de Groupe (F21).
- Le temps d'analyse dans Figma : le double ne mesure pas les allers-retours de l'API (F26).
- Le coût de `getInstancesAsync()` pour détecter une pièce partagée (F5).
- Le traitement d'une couleur portée par un style de couleur : aucune capture n'en contient (F18).
- Le Button dont les icônes sont des instances d'`Icon` : il n'existe pas encore ; F21 se déduit du code et de Groupe.

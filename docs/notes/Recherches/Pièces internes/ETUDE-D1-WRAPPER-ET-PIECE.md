# D1, le wrapper et la pièce

L'étude recommande l'option E, la description fidèle sans classement. Toute instance préfixée qui n'est pas une dépendance devient une pièce, décrite dans `pieces`, et la sorte `wrapper-de-dimensions` sort du kit. L'exposition Figma ne classe aucune instance. Elle remplit l'API de l'hôte, comme le mainteneur l'a validé, et elle laisse l'hôte choisir la variante de la pièce, comme Figma le fait sur une instance posée dans une maquette.

L'étude répond à la case 0.6 du [plan](./PLAN-P22.md) et aux failles F1, F3, F4 et F23 de l'[audit](./AUDIT-CONCEPTION-P22.md). Les faits sur Button, `.sizeWrapperButton`, `.Ring`, Groupe et `.Segment` viennent du §4 de l'audit, du §5 de [DECISIONS-P22.md](./DECISIONS-P22.md) et des contrats rejoués dans `_local/p22/scripts/`.

## 1. La question en clair

### 1.1 Ce que la distinction décide aujourd'hui

`sorteDeLImbrique` (`packages/kit/src/referentiel/composition.ts`) rend quatre sortes, testées dans cet ordre :

1. dépendance, quand un conteneur de règles nomme le composant sur la page de son maître ;
2. wrapper de dimensions, dès qu'une dimension de layout est liée dans le sous-arbre de l'instance ;
3. pièce interne, quand le nom commence par `.` ou `_` ;
4. détail, dans les autres cas.

`findWrapperReference` (`packages/plugin-socle/src/composant/contract/componentTree.ts`) élit ensuite un seul wrapper, sur le variant de référence. Son score vaut dix points par dimension liée, cinq points si le nom contient « wrapper » et trois points si l'instance porte des propriétés. Le bonus du nom est une devinette.

| # | Usage | Lecteur et chemin | Ce que la sorte change |
|---|---|---|---|
| U1 | API de l'hôte | `packages/plugin-socle/src/composant/contract/propertySurface.ts` (`buildContractPropertySurface`, `mergeWrapperProps`), appelé par `packages/plugin-socle/src/composant/analyse/resultat.ts` | les props du wrapper élu rejoignent `props` ; une clé déjà prise par l'hôte produit « renommez l'une des deux » (F23) |
| U2 | Racine du layout | `packages/plugin-socle/src/composant/contract/layoutNodes.ts` (`electVariantLayoutNodes`, `matchingWrapperInstance`) | le calque dont les enfants deviennent les slots se cherche depuis l'instance du wrapper ; un variant sans cette instance reçoit un avertissement |
| U3 | Dimensions par taille | `packages/plugin-socle/src/composant/contract/extractStructure.ts` (`proprietairesDAxeDeTailles`), `packages/plugin-socle/src/composant/contract/extractSizes.ts` | `structure.sizes` vient du set du wrapper avant celui de l'hôte ; un axe de tailles retire gap, padding et rayon du niveau haut de `structure`, et tait la taille du calque de layout dans les vues exactes (`suppressedSizeNodeIds`) |
| U4 | Parcours | `packages/plugin-socle/src/composant/contract/exportableNodes.ts`, `extractLayout.ts`, `extractVariantTokens.ts`, `propertyBindings.ts` | le sous-arbre du wrapper se lit comme celui de l'hôte, à la variante posée ; dans la conception de P22, une pièce s'arrête au slot `piece` et un wrapper reste parcouru |
| U5 | Surface d'une dépendance | `packages/plugin-socle/src/composant/contract/composedComponents.ts` (`wrapperOwnerId`), `packages/plugin-socle/src/composant/contract/extractSamples.ts` (`instanceArguments`) | l'échantillon d'une dépendance lit les props de l'unique occurrence exposée de son wrapper ; zéro ou plusieurs occurrences les taisent |
| U6 | Création des règles | `packages/plugin-socle/src/composant/template/modele.ts` (`restreindreAuParent`) | les props du wrapper se documentent dans le bloc de l'hôte |
| U7 | Pièce analysée seule | `packages/kit/src/controles/nommage.ts` (`estUnePieceInterne`), `packages/plugin-socle/src/composant/contract/imbriques.ts` | ces lecteurs appellent `sorteDeLImbrique` avec zéro dimension, et le wrapper n'y apparaît jamais |
| U8 | Relevé d'Architect | `packages/plugin-architect/src/imbriquesDuReleve.ts` (`marquerLImbrique`, `jeuxDeWrappers`), `packages/plugin-architect/src/releveDuComposant.ts` (`lireLesWrappers`, `noterLExposition`), `packages/kit/src/controles/releve.ts` (`WrapperLu`), `packages/plugin-architect/src/sandbox/projectionsDesControles.ts` | Architect lit tout le set d'un wrapper, et lit `isExposedInstance` pour lui seul |
| U9 | Contrôles d'Architect | `packages/kit/src/controles/oublis.ts` | C83 (le wrapper porte un axe que l'hôte n'a pas, et aucune instance n'est exposée) ; C32 et C84 (un token dont le rôle manque à l'hôte se cherche dans les variants du wrapper) ; relevé des natures de liaison |
| U10 | Lecteurs de `structure.sizes` | `packages/kit/src/lecteurs/validation-contrat.mjs` (clés de `sizes` contre une prop enum, dimensions par côté, refus de `fontSize`), `packages/kit/src/lecteurs/caracteristiques.mjs` (aide `dimensions-par-taille`), `packages/cli/aides/dimensions-par-taille.md`, `packages/plugin-socle/src/composant/contract/elideNeutrals.ts`, `packages/plugin-socle/src/composant/contract/publication.ts` | ils lisent `sizes` à la racine du contrat |

L'adaptateur, la CLI hors de son aide et `@ucm-kit/core/modules` ne lisent ni `structure.sizes` ni la sorte. 65 fichiers de test citent le mot « wrapper ».

### 1.2 Ce que la décision validée retire de la question

Le mainteneur a validé que l'API de l'hôte contient exactement les propriétés que Figma montre sur l'hôte. U1 ne dépend donc plus de la sorte. Les props d'une instance exposée rejoignent l'API, quelle que soit sa sorte, et celles d'une instance non exposée n'y entrent jamais. Button garde son API, puisque `.sizeWrapperButton` est exposé dans ses 90 variants. Groupe perd les six props de `.Segment`, que Figma ne montre pas sur Groupe (F39). U5 suit la même règle, et l'échantillon lit les occurrences exposées, rattachées par l'identifiant Figma de la propriété.

D1 décide donc le reste. Une instance préfixée posée une fois par variant, dont le set porte un axe de tailles, se décrit-elle aplatie dans l'hôte, avec `structure.sizes` sur l'hôte, ou comme une pièce, avec son entrée dans `pieces` ?

### 1.3 Ce que la forme aplatie perd déjà

La 14.0 décrit le wrapper à sa variante posée. Pour les autres tailles, elle publie seulement le gap, le padding et le rayon du calque de layout (`structure.sizes`). FORMAT.md, §3, écrit cette limite comme une hypothèse assumée. Un style de texte, une taille d'icône ou la dimension d'un calque intérieur qui change avec la taille se perd sans message. `extractSizes.ts` lit seulement le calque de layout, et la typographie des vues de l'hôte est celle de la variante posée.

Sur Button, la perte est nulle. Exporté seul, `.sizeWrapperButton` donne trois vues qui ne diffèrent que par le gap, le padding et le rayon (`_local/p22/scripts/sizeWrapper.seul.json`, vues `st1` à `st3`), avec le même style `label.large` et la même taille d'icône. Un design system dont le bouton Small emploie un style de texte plus petit perdrait ce style.

La piste P22 de `pistes.json` cite `.sizeWrapperButton` avec `.Ring` parmi les pièces que le code écrit comme un sous-composant.

## 2. Les options

Six cas limites servent à chaque option.

- L1, deux candidats : deux instances préfixées posées une fois par variant, chacune avec un axe de tailles et une dimension liée.
- L2, pièce à axe de tailles posée une fois : un hôte pose une pièce `.P` à `Size=Small` dans tous ses variants, sans l'exposer.
- L3, hôte qui a son propre axe de tailles : chaque variant `Size=Large` de l'hôte pose la pièce à `Size=Large`, et ainsi de suite.
- L4, wrapper non exposé : `.sizeWrapperButton` avec la case « Expose properties from nested instances » décochée.
- L5, composant agnostique : un fichier libre dont le wrapper n'a pas de préfixe, ou dont l'axe de tailles emploie d'autres mots que `small`, `medium`, `large`, `xs` à `3xl`.
- L6, exposition partielle : l'instance est exposée dans une partie des variants de l'hôte seulement.

L6 relève de la règle d'API validée, commune à toutes les options. La section E y répond.

### A. Le critère factuel de l'audit

Règle. Un wrapper est l'unique instance élue qui remplit trois conditions. Elle est posée une fois dans chaque variant de l'hôte, son set porte un axe que `findSizeAxis` reconnaît par ses valeurs, et elle lie au moins une dimension. Toute autre instance préfixée est une pièce.

Cas de référence. `.sizeWrapperButton` reste wrapper, puisqu'il est posé dans les 90 variants de Button, porte l'axe `Size` et lie quatre dimensions. `.Ring` devient pièce, puisqu'il est posé dans 18 variants sur 90 seulement. `.Segment` devient pièce, puisqu'il est posé plusieurs fois dans chaque variant de Groupe. Les trois cas tombent juste.

Cas limites.

- L1 : l'élection au score choisit l'un des deux, avec le bonus du nom. La règle du produit veut un seul candidat. A′ corrige ce point.
- L2 : `.P` devient wrapper. L'hôte publie les trois tailles de `.P` dans `structure.sizes`, sans prop `size`, puisque `.P` n'est pas exposée. Le filet de `validation-contrat.mjs` ne trouve aucune prop et ne rend aucun verdict. L'aide de la CLI renvoie le cas au développeur. Les deux autres variantes de `.P` ne sont décrites nulle part.
- L3 : `proprietairesDAxeDeTailles` prend le set du wrapper avant celui de l'hôte. Si les valeurs des deux axes diffèrent (`sm` contre `Small`), les clés de `sizes` ne correspondent plus à la prop `size` de l'hôte.
- L4 : l'instance reste wrapper. L'hôte publie `structure.sizes` sans prop `size`, comme en L2, et C83 avertit dans Architect.
- L5 : un wrapper sans préfixe reste reconnu, puisque le critère ne lit pas le nom. Un axe de tailles aux mots inconnus fait de l'instance une pièce, et le même dessin prend deux formes selon le vocabulaire.

Développeur. Le contrat de Button garde la forme 14.0, avec `structure.sizes` sur Button et le contenu du wrapper aplati à `Size=Medium` dans chaque vue. Le développeur écrit un seul composant Button et une table des tailles. `.Ring` arrive comme pièce.

Lecteurs à changer. `composition.ts` reçoit deux faits nouveaux, le nombre d'occurrences par variant et la présence d'un axe de tailles sur le set. `releverLesFaitsDUnImbrique` doit lire tous les variants de l'hôte, alors qu'il ne lit aujourd'hui que la référence. `imbriquesDuReleve.ts` doit compter les mêmes faits que le socle, ce qui demande de résoudre F3. FORMAT.md §3 réécrit l'élection. U2, U3, U8, U9 et U10 ne changent pas.

Taille. Le contrat de Button reste à 49 608 octets sans espaces, plus l'entrée de `.Ring` (1 035 octets exporté seul, sans `meta`) et ses 18 renvois.

Compatibilité. Button garde sa forme. Le code de Button du Playground ne change que pour `.Ring`.

Architect. Le relevé compte les occurrences par variant, lit les axes du set et compte les dimensions comme le socle (F3). C83, C32 et C84 restent attachés au wrapper.

Risque d'erreur silencieuse. Les pertes du §1.3 restent muettes. L2 et L3 publient des tailles fausses sans message. En L5, la forme du contrat change avec les mots des valeurs.

### A′. Le critère de l'audit, resserré

Règle. A′ ajoute trois conditions à A. Un seul candidat est élu, sinon aucun. L'hôte n'a pas d'axe de tailles propre. Le score perd le bonus du nom et celui des propriétés.

A′ règle L1 et L3. L2 et L4 restent faux : une pièce posée une fois, à axe de tailles et à dimension liée, non exposée, devient wrapper. Écarter ce cas demanderait la condition « exposée », c'est-à-dire l'option D, refusée. A′ classe toujours une instance d'après les mots de ses valeurs, et les pertes du §1.3 restent muettes. Les lecteurs, la taille, la compatibilité et le travail d'Architect sont ceux de A.

### B. La déclaration explicite

Règle. Le designer nomme le wrapper dans le bloc `.componentRules` de l'hôte, par une ligne du type `@wrapper .sizeWrapperButton`. Sans cette ligne, l'instance est une pièce, décrite comme en E.

Cas de référence. Le Button actuel n'a pas cette ligne. Au réexport, `.sizeWrapperButton` devient pièce, sauf si le designer l'ajoute. `.Ring` et `.Segment` sont des pièces.

Cas limites. L1 à L5 suivent la déclaration, sans devinette. Une ligne oubliée donne la forme de E, sans perte.

Développeur. Le même dessin Figma produit deux formes de contrat selon la présence d'une ligne de texte. Le développeur et chaque lecteur apprennent les deux.

Lecteurs à changer. Tous ceux de E, plus ceux de A, qui restent en service pour les hôtes déclarés. C'est l'option la plus chère.

Architect. « Créer les règles d'usage » propose la ligne, et chaque candidat devient une question.

Risque. Aucune perte, mais un geste oubliable change la forme du contrat sans rien changer dans Figma.

### C. Le critère actuel

`.Segment` et `.Ring` restent des wrappers, et Groupe garde une API fausse (F1). L'option ne tient pas les cas de référence.

### D. L'exposition comme critère

Le mainteneur l'a refusée, parce qu'un designer peut oublier la case. Sous D, une case oubliée change la forme du contrat (wrapper aplati ou pièce décrite), et rien dans Figma ne le montre au designer. Sous E, la même case change seulement ce que Figma montre déjà sur l'instance de l'hôte.

### E. La description fidèle sans classement

Règles.

- E1. Les sortes deviennent dépendance, pièce et détail. Une instance préfixée n'est jamais une dépendance (F2, décidé) et toujours une pièce. `dimensionsLiees` sort de `FaitsDImbrique`. `countLayoutBindings`, `scoreWrapper` et `findWrapperReference` disparaissent.
- E2. L'API de l'hôte contient ses props et celles de chaque instance exposée, comme validé. Chaque prop venue d'une instance exposée nomme sa source dans le contrat, par le chemin du slot de la pièce et la clé de la prop dans la pièce. Une clé déjà prise par l'hôte garde le diagnostic de collision.
- E3. Le renvoi cite la variante posée (D4). Une prop `VARIANT` exposée se règle sur l'instance de l'hôte, et le développeur prend la variante de la pièce dont les valeurs sont celles de la variante posée, avec la valeur que l'hôte reçoit. Les couleurs du renvoi (`tokens`, `strokes`) s'appliquent par adresse de slot. Le moteur vérifie que chaque adresse du renvoi existe dans chaque variante que les props exposées atteignent. Sinon, il écrit une perte dans `meta.diagnostics`. Un renvoi dont la vue diffère de la variante citée, sur une pièce exposée, produit aussi une perte, parce qu'une partie complète (D4) ne dit pas ce que Figma garde au changement de variante.
- E4. `structure.sizes` vit dans l'entrée du set qui porte l'axe de tailles. Chaque lecteur de U10 lit `sizes` dans l'entrée qu'il résout, hôte ou pièce.
- E5. Les props d'une pièce exposée font partie de l'API de l'hôte et se documentent dans le bloc de l'hôte, comme aujourd'hui. Une pièce dont tous les choix sont exposés n'a pas de bloc à elle. Ce point rejoint D5 (case 0.7).
- E6. Une instance sans préfixe, sans règles, dont le composant laisse un choix (D5) reste un détail aplati. Le contrat écrit une perte dans `meta.diagnostics` qui la nomme et dit que ses autres variantes manquent.
- E7. C83 devient une question restreinte : une pièce dont le set porte un axe de rôle taille que l'hôte n'a pas, et dont aucune instance n'est exposée. Rien n'est présélectionné.
- L6. Une instance exposée dans une partie des variants seulement publie ses props dans l'API, avec une perte dans `meta.diagnostics` qui nomme les variants sans exposition. Cette règle vaut pour toutes les options.

Cas de référence.

- `.sizeWrapperButton` devient une pièce. Son entrée porte ses trois variantes, ses props (`size`, `label`, `iconLeft`, `iconRight`) et son `structure.sizes`.
- Button garde les mêmes clés de props, venues de l'instance exposée dans ses 90 variants. Son slot `label` nomme la pièce, et ses 90 renvois citent `Size=Medium` avec les couleurs que Button pose sur la pièce. Le texte saisi va dans l'échantillon du renvoi (étude, §5).
- Le fait du mainteneur se lit tel quel. Le designer choisit Small, Medium ou Large sur Button, et chaque taille garde les dimensions fixées dans sa variante, sans prop de dimension sur Button.
- `.Ring` devient une pièce sans choix (D5), avec 18 renvois.
- `.Segment` devient une pièce non exposée, et ses six props quittent l'API de Groupe. Groupe et `.Segment` se décrivent comme sous A.

Cas limites.

- L1 : deux pièces, chacune avec son entrée.
- L2 : `.P` est une pièce, ses trois variantes sont décrites, le renvoi cite `Size=Small`, et l'API de l'hôte n'a pas de `size`.
- L3 : chaque variant de l'hôte cite la variante de la pièce qu'il pose. Les dimensions de la pièce arrivent par le renvoi, et `structure.sizes` de l'hôte ne décrit que ses propres calques.
- L4 : Figma ne montre pas `Size` sur Button, et le contrat non plus. Le renvoi cite `Size=Medium`. Le designer voit dans Figma qu'il ne peut pas choisir la taille, et la question de E7 le lui demande dans Architect.
- L5 : un wrapper préfixé devient pièce sans lire aucun mot de ses valeurs. Un wrapper sans préfixe devient un détail aplati, avec la perte de E6. Le fichier libre qui comptait sur l'élection actuelle perd `structure.sizes` sur cet hôte, et le contrat le dit.

Sous-variante écartée, E′. Toute instance non dépendance qui laisse un choix deviendrait une pièce, préfixée ou non. Dans un fichier libre, un composant de bibliothèque sans règles, comme un set d'icônes de plusieurs centaines de variantes, entrerait alors en entier dans `pieces`.

Développeur. Il écrit Button et un sous-composant interne pour `.sizeWrapperButton`, avec sa table des tailles, comme la piste P22 le prévoit. La parité compare `SizeWrapperButtonProps` si le code la déclare (décision 0.5).

Lecteurs à changer, en plus des lots déjà prévus par le plan.

- Kit : `packages/kit/src/referentiel/composition.ts` et `packages/kit/tests/composition.test.ts` ; `packages/kit/src/lecteurs/variant-views.mjs` pour E3 (lot 3.2) ; `validation-contrat.mjs` et `caracteristiques.mjs` pour E2 et E4 (lot 3.3).
- Socle : `componentTree.ts`, `layoutNodes.ts` (élection depuis l'hôte seul), `extractStructure.ts` (axe de tailles du set de l'hôte seul), `propertySurface.ts` (surface tirée de l'exposition), `composedComponents.ts` et `extractSamples.ts` (exposition par identifiant de propriété), `analyse/resultat.ts`, `template/modele.ts`, dans `packages/plugin-socle/src/composant/`.
- Architect : `packages/plugin-architect/src/imbriquesDuReleve.ts` (plus de dimensions), `releveDuComposant.ts` (sets et exposition de chaque pièce, lot 8.1), `packages/kit/src/controles/releve.ts` (`WrapperLu` étendu aux pièces), `packages/kit/src/controles/oublis.ts` (C83, C32, C84), `sandbox/projectionsDesControles.ts`.
- CLI : `packages/cli/aides/dimensions-par-taille.md`, et l'aide de la composition pour le choix de variante par une prop exposée.
- Documents : FORMAT.md §1, §3, « Sortie » et « Composition et dépendances » ; `packages/plugin-exporter/SPEC.md` ; `packages/plugin-architect/SPEC.md` ; `packages/kit/invariants/referentiel.md` ; les cartes du kit, du socle et d'Architect.
- Tests : les fixtures de wrapper des 65 fichiers changent d'attente.

Taille. Le contrat de Button gagne entre 8 et 11 ko, soit 16 à 22 %, d'après une estimation sur les captures. L'entrée de la pièce pèse 7 689 octets (contrat seul, sans `meta`). Les quatre structures de Button perdent 2 022 octets de sous-arbre, et `structure` perd 695 octets. Les 90 renvois ajoutent 3 à 6 ko, puisque les couleurs que Button pose sur la pièce passent de `variants[].tokens` au renvoi. La case 1.5 mesure ce chiffre. Groupe a la même taille sous A et sous E.

Compatibilité. La 15.0 est majeure dans tous les cas (F38). Pour Button, `structure.sizes` quitte la racine (classe 3), et son absence à côté d'une prop `size` veut dire « tailles décrites dans une pièce » (classe 4). Le code de Button du Playground s'adapte à la case 11.5, qui prévoit déjà l'adaptation de Groupe.

Architect. Le classement ne lit plus de dimension, et F3 disparaît. Le lot 8.1 étend déjà la lecture du set à chaque pièce. C83 se réécrit selon E7. C32 et C84 cherchent un rôle absent de l'hôte dans les variants des pièces.

Risque d'erreur silencieuse. Aucun cas connu. Le transfert des couleurs de E3 est vérifié par le moteur et la perte est écrite. Un lecteur qui lirait `sizes` à la seule racine se teste au lot 3.3, et un lecteur 14.0 refuse un contrat 15.0. L'instance sans préfixe de E6 reçoit une perte écrite.

## 3. Comparaison

| Critère | A | A′ | B | E |
|---|---|---|---|---|
| Devinette restante | mots des valeurs, bonus du nom | mots des valeurs | aucune | aucune |
| Geste oubliable qui change le contrat | aucun | aucun | la ligne `@wrapper` | aucun |
| Button | forme 14.0, `sizes` sur Button | forme 14.0 | selon la ligne | pièce, `sizes` dans l'entrée |
| `.Ring`, `.Segment` | pièces | pièces | pièces | pièces |
| L1, deux candidats | élu au score | aucun wrapper | déclaré | deux pièces |
| L2, pièce posée une fois | tailles sans prop | tailles sans prop | exacte | exacte |
| L3, hôte à axe de tailles | tailles du wrapper | pièce | exacte | exacte |
| L4, wrapper non exposé | tailles sans prop, C83 | tailles sans prop, C83 | selon la ligne | conforme à Figma, question E7 |
| L5, fichier libre sans préfixe | reconnu si les mots sont connus | idem | déclaré | détail, perte écrite |
| Pertes par taille du §1.3 | muettes | muettes | muettes si déclaré | aucune |
| Travail sur le classement | deux faits nouveaux, F3 | idem | A et E | retrait du wrapper |
| Travail sur le format | aucun | aucun | deux formes | E2, E3, E4 |
| Taille de Button | +1 ko (`.Ring`) | idem | selon la ligne | +8 à +11 ko estimés |
| Code de Button à adapter | `.Ring` seul | idem | selon la ligne | `.Ring` et `.sizeWrapperButton` |
| Erreur silencieuse | pertes par taille, L2, L3 | pertes par taille, L2 | aucune | aucune connue |

## 4. Recommandation

E est la seule option sans devinette et sans geste qui change la forme du contrat. A′ déduit toujours qu'une pièce est un wrapper de tailles à partir des mots de ses valeurs. Elle range L2 et L4 à tort, et elle garde muettes les pertes du §1.3. B supprime la devinette au prix d'une ligne oubliable et de deux formes de contrat pour un même dessin.

La règle d'API validée rend E neutre pour l'API de Button, qui garde les mêmes clés. L'exposition y joue seulement le rôle qu'elle a dans Figma. Une case oubliée se voit dans Figma, où le designer ne peut plus choisir la taille sur Button, et la question de E7 le lui signale dans Architect. Le contrat suit ce que Figma montre, sans rien deviner.

E coûte un contrat de Button plus lourd de 16 à 22 % selon l'estimation, l'adaptation du code de Button à la recette, et la règle de résolution E3 au lot 3.2. En échange, F1, F3 et F4 disparaissent, et F23 ne vaut plus que pour une pièce exposée. `countLayoutBindings`, `scoreWrapper`, `findWrapperReference`, `mergeWrapperProps`, la branche du wrapper dans `proprietairesDAxeDeTailles` et `jeuxDeWrappers` sortent du code. La classification tient en une règle, le préfixe et les règles, lue par le kit, le socle et Architect, et testée par `packages/kit/tests/composition.test.ts` et `packages/plugin-architect/tests/imbriquesParLeKit.test.ts`.

Effets sur le plan, si E est retenue.

- 0.6 se coche avec E.
- 4.1 prend l'ordre « dépendance sans préfixe, pièce préfixée, détail », et ses tests perdent le cas « un wrapper à axe de tailles posé une fois par variant reste wrapper ».
- 4.2 ne vise plus qu'une pièce exposée.
- 3.2 reçoit la résolution de E3, et 3.3 la lecture de `sizes` par entrée.
- 5.2 reçoit la vérification des adresses de E3.
- 8.1 remplace `jeuxDeWrappers` par la lecture des sets de pièces.
- FORMAT.md §3 perd le paragraphe du wrapper de dimensions.

## 5. Questions au mainteneur

| # | Question | Réponse recommandée |
|---|---|---|
| 1 | Retenir E : toute instance préfixée non dépendance est une pièce, et la sorte `wrapper-de-dimensions` disparaît ? | Oui. |
| 2 | Une prop exposée choisit la variante de la pièce, et les couleurs du renvoi s'appliquent par adresse de slot à chaque variante atteinte, vérifiées par le moteur avec une perte écrite sinon (E3) ? | Oui, avec L6 : une exposition partielle publie la prop et une perte qui nomme les variants sans exposition. |
| 3 | Les props d'une pièce exposée se documentent dans le bloc de l'hôte, et une pièce dont tous les choix sont exposés n'a pas de bloc à elle (E5) ? | Oui. La réponse précise D5, case 0.7. |
| 4 | Une instance sans préfixe ni règles, qui laisse un choix, reste-t-elle un détail aplati avec une perte écrite (E6), ou devient-elle une pièce (E′) ? | E6. E′ ferait entrer un set de bibliothèque entier dans le contrat. |
| 5 | C83 devient-il une question restreinte aux pièces dont le set porte un axe de rôle taille que l'hôte n'a pas, sans exposition, rien présélectionné (E7) ? | Oui. |

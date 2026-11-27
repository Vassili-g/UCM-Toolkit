# Construction des composants

Piste P31. Le designer dessine une variante d'un composant, et UCM Architect construit le reste : le jeu de variants, les variables du composant dans `components` et toutes les liaisons. Cette recherche part des gestes du designer, dit ce qu'Architect fait déjà et ce qui manque. Le [plan](./PLAN-P31.md) en découle.

## 1. Les gestes du designer aujourd'hui

Pour chaque composant, le designer fait cinq gestes à la main.

1. Il crée le composant dans le fichier des composants.
2. Il définit ses variantes, axe par axe.
3. Il crée le dossier du composant dans la collection `components` du fichier des tokens.
4. Pour chaque valeur de chaque axe, il fait viser à chaque variable le bon token de `theme` ou de `layout`.
5. Il revient au fichier des composants et lie chaque calque de chaque variante à sa variable de composant.

Les gestes 3 à 5 se répètent pour chaque combinaison d'axes : un Button à 6 types, 3 tailles et 5 états compte 90 variantes.

## 2. Ce qu'Architect fait déjà

La Préparation du mode Composant (`packages/plugin-architect/SPEC.md`, section « Préparation ») couvre les gestes 3 à 5 depuis ce que le designer a dessiné.

| Étape | Fichier | Ce qu'elle fait |
|---|---|---|
| Préparer | Composants | Le kit (`preparerLesTokens` de `packages/kit/src/controles/preparation.ts`) parcourt tous les variants, rattache chaque axe à un rôle ou à un état du référentiel, et propose pour chaque couleur et chaque taille une variable de `components` avec sa cible dans `theme` ou `layout`. Ce qu'il ne tranche pas devient une question. |
| Créer | Tokens | Seules les variables manquantes se créent, avec l'alias de chaque mode. |
| Lier | Composants | Les variables publiées reviennent au composant en corrections de liaison, à cocher. |

Un variant qui lie ses calques quand les autres gardent des valeurs en dur sert de modèle (C81) : Architect propose ses liaisons aux autres variants.

Trois bornes tiennent aujourd'hui.

- Une couleur qu'aucun token du thème ne vaut exactement, ou une taille qu'aucun token de `layout` ne vaut, reste en dur et la feuille le dit.
- Entre Créer et Lier, le designer publie la library des tokens à la main : l'API de Figma ne publie pas une library.
- Les gestes 1 et 2 ne sont pas couverts : Architect lit un jeu de variants, il n'en crée pas.

## 3. Ce qui manque

- M1. Créer le jeu de variants : axes, valeurs et nom de chaque variante selon la nomenclature du kit, à partir d'une variante dessinée et d'une liste d'axes.
- M2. Décliner la variante dessinée sur chaque valeur d'axe : recopier son dessin, puis faire viser à chaque variable la cible de sa valeur d'axe. La cible se déduit exactement quand le référentiel relie la valeur d'axe à un rôle ou à un état ; sinon c'est une question.
- M3. Enchaîner Préparer, Créer et Lier sur tout le jeu en un geste, avec la publication comme seule étape manuelle.
- M4. Mesurer ce que la Préparation laisse aujourd'hui sur un vrai composant : questions, valeurs restées en dur, noms qui diffèrent de ceux que le designer écrit à la main.

## 4. Ce qui reste au designer

Le dessin de la variante de référence, les réponses aux questions et la publication de la library. Le mainteneur garde les tokens et les composants dans deux fichiers dès le début : la publication entre Créer et Lier reste donc un geste du designer, et M3 s'arrête sur elle. Une variante qui diffère par sa structure (icône absente, autre mise en page) se retouche après la déclinaison.

## 5. Ce qu'apprend l'outil local de liaison des icônes

Le mainteneur emploie un plugin local, hors de Git, dans `_local/outils/relier-variantes/`. Dans un jeu de variants d'un fichier non UCM, il relie la couleur de chaque icône au token de sa variante. Il a servi sur des jeux réels de plusieurs dizaines de variantes. Trois de ses idées servent M2 et la note de conception (case 1.2 du plan).

- Le token voisin. Le plugin part du token déjà posé sur un autre calque de la variante, son fond par exemple, et remplace seulement le dernier mot : `…/on/default/background` donne `…/on/default/foreground`. Il ne lit aucun axe dans le nom. Il traverse donc le cas où le token écrit une valeur autrement que le variant (`on` pour `Active=True`), qui arrête la propagation d'un variant modèle (C81), et il ne suppose aucune nomenclature.
- Une question par emplacement. Chaque calque d'icône reçoit sa réponse une fois, parmi les derniers mots des tokens existants (`foreground`, `action`), puis elle vaut pour toutes les variantes. Le designer choisit le mot ; le plugin n'écrit que si le token visé existe une seule fois, ce qui garde la règle « aucune supposition de mapping ».
- Le résultat montré sur des variantes contrastées. Le plugin applique chaque règle à deux ou trois variantes aussi différentes que possible : une règle qui ignore un axe se voit d'un coup d'œil. Un nom construit qui laisse un axe hors du nom est signalé et replié.

Deux défauts de l'outil sont à corriger avant tout transfert. Un fond lié à un token commun (une couleur générique) donne le même token à des variantes qui devraient différer, sans le signaler. Deux calques de référence qui mènent à deux dossiers sont départagés par le nombre de variantes couvertes, sans que le designer le voie. L'outil choisit aussi les icônes par leur nom de calque ; Architect les reconnaît déjà mieux.

## 6. Mesure sur un Button relié

Script jetable dans `_local/recettes/` : il retire de la capture `button-2026-11-25` ses 764 liaisons de couleur, rejoue l'analyse d'Architect et compare ses propositions aux liaisons d'origine.

- Le jeu compte 90 variants. Chaque variant ne contient qu'une instance de la pièce interne `.sizeWrapperButton` : 612 des 764 liaisons de couleur sont posées dans des instances, en surcharge ou dans le maître de la pièce.
- Sans ses liaisons, le Button reçoit 0 correction de liaison et 0 question de liaison. L'analyse rend 90 C32 (un token du composant que rien ne lit), 12 C59, 5 C30 et les constats d'avant.
- C25 ne juge que les calques propres du variant et saute le fond d'une instance imbriquée (`corrections.ts`, `constatsManquantsParEtapes`). Une couleur laissée en dur dans une instance (icône, pièce interne) n'est donc signalée par aucun constat. C'est le cas du mainteneur : après la mise à jour d'un composant d'icône, les couleurs des icônes ont perdu leur liaison, et Architect ne l'aurait pas vu.

La mesure de la Préparation seule (case 1.1) ne dit rien sur ce Button : relié, il n'a plus aucune variable à préparer. Elle se refait sur un composant dessiné en dur.

## 6 bis. Mesure sur un Button dessiné en dur

Le script jetable `_local/recettes/mesure-dur.ts` (hors de Git) part de la capture de la section 6, la dessine en dur, rejoue l'analyse puis la Préparation du sandbox, et compare le plan aux liaisons d'origine. Il se lance depuis `packages/plugin-architect` : `npx tsx ../../_local/recettes/mesure-dur.ts <capture> [--theme-minuscules] [--reponses '<json>'] [--layout-en-dur] [--sans-imports] [--sortie <fichier>]`.

Le double retire les 764 liaisons de couleur des remplissages et des contours, les 6 des effets et les 837 liaisons de marge, d'espacement et de rayon vers les 192 variables `Button/…`. Ces 192 variables quittent le fichier et la liste de la library. Les collections, le thème et le layout restent, et chaque couleur garde la valeur résolue de sa liaison. La vérité de terrain est ce que le designer avait posé dans les 90 variants : 360 liaisons de couleur et 540 liaisons de taille.

Le relevé lit 198 layers dans ces variants : la racine de chacun, 90 instances `.sizeWrapperButton` et 18 instances `.Ring` (états Focus). Le fond ou le contour du bouton est la surcharge `fills` ou `strokes` de `.sizeWrapperButton`. Le texte et les deux vecteurs d'icône sont dans l'instance, sous la frontière que le relevé ne descend pas.

### Ce que l'analyse et la Préparation rendent

| | Fichier tel quel | Thème en minuscules |
|---|---|---|
| Corrections C25 et C29 | 0 | 0 |
| Variables proposées, sans réponse | 98 (90 couleurs, 8 tailles) | 98 (90 couleurs, 8 tailles) |
| dont une cible déjà posée | 4 (tailles) | 4 (tailles) |
| Questions | 6 | 6 |
| Variables après les six réponses | 8 (tailles) | 62 (54 couleurs, 8 tailles) |
| Couleurs restées en dur après les réponses | 90 (54 cibles absentes du thème, 36 sans règle) | 36 (sans règle) |
| Corrections de la liaison après création | 540 | 594 |

L'analyse rend 26 constats, dont 9 C30, et marque le composant `sansTokens`. Aucun n'est un C25 ni un C29. Ces deux constats sautent tout layer `INSTANCE` dont le parent n'est pas la racine (`constatsManquantsParEtapes`, `corrections.ts`), et le fond, les marges, l'espacement et le rayon du Button sont portés par `.sizeWrapperButton`. Le code de C25 justifie ce saut par une peinture qui vient du composant principal. Ici la peinture est une surcharge : `overrides` de `.sizeWrapperButton` liste `fills`, `height` et `width`, et le saut la perd.

Les six questions sont trois choix de dossier (`dossier:Contained`, `dossier:Outlined`, `dossier:Text`, chacun parmi `solid`, `surface`, `page`), soft ou vivid pour les statuts, et le nom de `.sizeWrapperButton` et de `.Ring`. Les réponses de la mesure sont `solid`, `page`, `page`, `vivid` et les noms proposés.

La colonne « Fichier tel quel » garde les noms du thème du fichier, écrits `Primary/Solid/default`. La Préparation cherche `theme/primary/solid/default`, et cette recherche distingue la casse : aucune des 90 couleurs ne trouve sa cible. La colonne « Thème en minuscules » renomme les variables du thème en minuscules dans le double, comme le kit les écrit. Les chiffres qui suivent sont ceux de cette seconde colonne.

### Cible par valeur d'axe

- Color : Primary et Secondary visent `theme/primary` et `theme/secondary`. Info, Success, Warning et Danger visent `theme/<statut>/vivid`, après la question soft ou vivid.
- State : Default, Hover et Pressed visent `default`, `hover` et `pressed` du dossier. Disabled vise `theme/disabled/background` ou `theme/disabled/border` sans question. Focus n'a aucune règle.
- Variant : une question de dossier par valeur, alors que le dossier du Button change avec l'état. Outlined vise `page` au repos et `solid` au survol et à l'appui. Text vise `page` au repos et `surface` au survol et à l'appui. La réponse `page` laisse donc en dur les 24 fonds des quatre cases Outlined et Text, Hover et Pressed.

### Écart à la vérité de terrain

| Lieu | Liaisons d'origine | Même cible | Cible fausse | Resté en dur | Non vu |
|---|---|---|---|---|---|
| Fond ou contour de `.sizeWrapperButton` | 72 | 42 | 0 | 30 | 0 |
| Anneau `.Ring` | 18 | 0 | 12 | 6 | 0 |
| Texte, dans l'instance | 90 | 0 | 0 | 0 | 90 |
| Vecteurs d'icône, dans l'instance | 180 | 0 | 0 | 0 | 180 |
| Couleurs | 360 | 42 | 12 | 36 | 270 |
| Marges, espacement et rayon de `.sizeWrapperButton` | 540 | 540 | 0 | 0 | 0 |

Avant les réponses, les 90 couleurs des layers propres et 432 des 540 tailles attendent une question. Les 108 autres tailles ont déjà leur cible.

Les 12 cibles fausses sont les anneaux Outlined et Text. Le référentiel n'a pas de rôle `ring` : la Préparation lit le contour comme `border` et vise `page/border` sans poser de question, alors que le designer a lié `Theme/<palette>/ring`. Les 6 anneaux Contained restent en dur, faute de `solid/border`. Les 6 fonds Contained en Focus restent en dur aussi : Focus n'a pas de règle, alors que le designer y a repris le token de Default.

Aucune des 582 liaisons de la bonne cible ne reprend le nom du token du designer. Les 42 couleurs ne diffèrent que par la casse et par un segment `.size-wrapper-button`. Les 540 tailles diffèrent par ce segment et par `Medium`, que la Préparation ne connaît pas parce que la taille est un axe de la pièce interne et non du Button. Le segment vient de la question de nom. Dès qu'un variant porte deux layers du même rôle (les 6 Outlined en Focus, fond ou contour plus anneau), `nomsDupliquesDansUnRole` marque le nom du layer dans tous les variants, soit 72 instances. Les 18 variants Text sans peinture sur le wrapper gardent un nom sans segment, et une même mesure reçoit deux variables (`size/.size-wrapper-button/padding-x` sur 144 lieux, `size/padding-x` sur 36). Le designer avait écrit 192 tokens `Button/…` (180 de couleur, 12 de taille) ; le plan en propose 62.

Après création et publication, le plan donne 594 corrections de liaison à cocher : 42 couleurs justes, 12 couleurs fausses, 540 tailles. Le designer poserait encore à la main 318 des 360 couleurs (270 dans les instances, 36 en dur, 12 à corriger) et aucune taille. Sur le fichier tel quel, il poserait les 360 couleurs.

### Ce que cela dit de l'expérience « Relier le composant » (section 7)

- Étape 2. Trois quarts des emplacements de couleur (270 sur 360) sont dans des instances, que ni la Préparation ni C25 ne voient. Une expérience bâtie sur le relevé actuel laisse ces 270 liaisons au designer. Elle doit lire sous la frontière, par les surcharges.
- Étape 3. Le dossier se décide par case Variant × State, pas par valeur de style. Pour 3 styles et 5 états, la grille compte 15 cases, communes aux six couleurs. Une question par case coûte 15 réponses et couvre les 90 variants. Une question par valeur de style en couvre trois, et aucune réponse unique ne convient à Outlined : `page` garde les 12 contours de Default et de Focus et laisse en dur les 12 fonds de Hover et de Pressed, `solid` fait l'inverse (42 cibles justes dans les deux cas, mais pas les mêmes).
- Étape 4. Sans liaison de départ, le token voisin n'a aucun voisin, et le nom construit par la grammaire porte seul les 42 bonnes cibles. Un nom qui garde le segment du layer (`.size-wrapper-button`) ne retrouve jamais le token du designer. La réponse de l'étape 3 doit nommer le rôle (`background`, `foreground`), et le segment du layer reste hors du nom.
- Étape 6. Le plan crée 62 variables là où le designer en avait 192. Les 90 tokens `foreground`, la moitié des tokens de couleur, portent le texte et les icônes que la Préparation ne voit pas.

### Ce que cela dit des gains de précision (section 8)

- P-a est le gain le plus large : les 270 couleurs d'instance, plus les 90 peintures du wrapper et de l'anneau et les 540 tailles du wrapper, qu'aucun constat ne signale sur ce composant. Le saut de C25 et de C29 doit s'arrêter aux champs que `overrides` ne liste pas.
- P-b ne joue pas ici, car un composant sans aucune liaison n'a ni variant modèle ni token voisin.
- P-c n'est pas mesuré, aucune liaison étrangère n'étant posée.
- P-d tient : la carte `sansTokens` s'affiche. Elle doit dire que la collection des composants existe dans la library et ne porte aucun `Button/…`.
- P-e s'étend : un rôle que le référentiel ne porte pas (`ring`) tombe sur `border` sans question, 12 fois. Le marquage du nom par layer se décide aussi sur 6 variants et s'applique aux 72.

Deux écarts que la section 8 ne couvre pas. La recherche du thème distingue la casse, et le fichier de test écrit `Primary/Solid/default` : toutes les couleurs restent en dur (90 contre 36). Les états Focus et la case Variant × State sont sans règle : 36 couleurs en dur et 12 cibles fausses.

### Limites de la mesure

- La capture ne porte aucun import de library. Le script remplit `libraries.imports` avec les variables captées. Les valeurs des tokens de `layout` que le Button ne lie pas sont donc inconnues, et une ambiguïté entre deux tokens de même valeur ne peut pas apparaître. Avec `--sans-imports`, les 540 tailles restent en dur.
- La colonne « Thème en minuscules » est une simulation : seuls les noms du thème changent.
- Le double ne crée aucune variable et ne publie rien. Le calcul de la liaison après création (594 corrections) lance `liaisonsDeLaPreparation` sur des clés fabriquées : aucune correction n'est écrite, ni relue par une nouvelle analyse.
- Les six réponses sont celles du mesureur. D'autres réponses changent les nombres, comme le montre l'étape 3 ci-dessus.
- Les couleurs en dur ont la valeur exacte du token d'origine. Un Button dessiné à la main aurait des teintes proches. La Préparation vise par rôle et n'y perd rien, mais toute reprise par valeur y perdrait.
- Le Button mesuré range tout dans une pièce interne. Un composant qui dessine son texte dans ses propres layers en ferait voir davantage à la Préparation.
- La mesure n'essaie ni l'interface ni les aperçus. Le jeu n'emploie que la taille Medium. `--layout-en-dur` retire en plus 757 liaisons directes vers le layout : il ajoute 2 variables de taille et 18 contours sans token exact, et ne change pas les couleurs.

## 7. Une seule expérience de liaison

Aujourd'hui, Architect relie un composant par quatre chemins qui ne se ressemblent pas : la Préparation (Préparer, Créer, Lier), les corrections C25 et C29 une par une, la propagation d'un variant modèle (C81 puis C24), et rien du tout dans un fichier non déclaré UCM. L'outil local montre qu'un seul geste suffit au designer : dire, pour chaque emplacement coloré, quel token il prend ; le plugin en déduit le token de chaque variante.

Proposition : une seule expérience, « Relier le composant », identique en full UCM et en agnostique. Seul change l'endroit où Architect trouve les tokens.

| Étape | Full UCM | Agnostique |
|---|---|---|
| 1. Où sont les tokens du composant | La collection `components` reconnue par la déclaration | Le designer désigne une fois, dans la Configuration, la collection et le dossier des composants (`<collection>` › `components`) ; le catalogue en tire le rôle `components` |
| 2. Les emplacements à relier | Chaque calque coloré du variant, et chaque calque peint dans une instance (icône, pièce interne), reconnus par `layers.ts` | Identique |
| 3. Le token de chaque emplacement | Une question par emplacement ; les réponses sont les derniers mots des tokens du composant ; le rôle attendu du référentiel (`icon`, `foreground`) se présélectionne quand il désigne un seul mot | Une question par emplacement ; mêmes réponses, rien de présélectionné |
| 4. Le token de chaque variante | Le nom construit par la grammaire UCM ; à défaut, le token voisin | Le token voisin ; à défaut, le nom construit à la main |
| 5. Le contrôle | Aperçu sur variantes contrastées, liste par variante, puis Appliquer ; une règle qui ignore un axe ou départage deux dossiers devient une question | Identique |
| 6. Les tokens manquants | La Préparation les crée dans `components`, avec leur cible dans `theme` ou `layout` | Aucun n'est créé : l'emplacement reste à relier, et la liste le dit |

Les réponses de l'étape 3 se rangent avec le composant. Une nouvelle analyse les reprend : une icône dont la liaison a sauté reçoit sa correction sans nouvelle question, ce qui répond au cas mesuré en section 6.

La construction d'un composant (M1 à M3) s'ouvre sur la même expérience : créer le jeu de variants, puis relier. Le setup initial et la réparation deviennent un seul écran, que le composant soit neuf ou déjà relié.

## 8. Précision à gagner

- P-a. Juger les couleurs peintes dans une instance : un nouveau constat, ou C25 étendu aux surcharges, quand l'emplacement a une réponse rangée ou un rôle attendu.
- P-b. Le token voisin, en repli de la propagation (`propagation.ts`, avant la question) : il traverse les valeurs écrites autrement que le variant (`on` pour `Active=True`).
- P-c. Une icône liée au token d'un autre composant (le cas de la mise à jour d'icône) : la règle « un calque ne lie que les tokens de son composant » attend toujours son contrôle.
- P-d. La carte « n'a pas de tokens. Ses couleurs sont en dur » se pose dès qu'aucune collection n'a le rôle `components` (`analyse.ts`, `sansTokens`) : elle doit dire où Architect a cherché, et proposer l'étape 1.
- P-e. Un départage silencieux entre deux règles devient une question ; un token commun à des variantes qui diffèrent se signale.

## 9. Ce que le mode agnostique change

- Le réglage de l'étape 1 dans la Configuration, à côté de l'interrupteur « Ce fichier suit l'architecture UCM ». La clé partagée `architecture` garde ses valeurs (`absente`, `ucm`, `libre`, `illisible`, `future`).
- L'onglet Analyse rouvert dans un fichier non déclaré, avec les seuls contrôles qui ne lisent pas la nomenclature (liaisons, contraste résolu, accessibilité) ; les contrôles du thème, de la structure et des couches restent propres au full UCM.
- La Préparation et la liaison ne refusent plus `hors-ucm` quand l'étape 1 est remplie.

Ce mode change quatre textes : `CONCEPT.md` et `README.md` (« seul l'Exporter offre l'agnostique »), `packages/plugin-architect/SPEC.md` (analyse et Préparation réservées à un fichier déclaré), la conception P28 (« Architect restant full UCM ») et le risque de P28 dans `pistes.json`. Palettes a déjà quitté cette règle.

## Décisions du mainteneur

| Question | Décision |
|---|---|
| Mode agnostique (Q6) | Architect prend un mode agnostique, avec les changements de la section 9. La règle des deux périmètres change pour lui à la livraison. |
| Expérience unique (Q7) | « Relier le composant » remplace la Préparation, les corrections de liaison et la propagation seulement si une maquette valide son expérience. Sinon, les écrans actuels restent. |
| Tokens manquants en agnostique (Q8) | Architect relie les tokens existants et n'en crée aucun. La création reste propre au full UCM. |
| Réponses par emplacement (Q9, tranché par l'agent) | Elles se rangent dans le fichier Figma, sur le jeu de variants, dans les données partagées d'Architect (`ESPACE_ARCHITECT`) qui portent déjà la déclaration et la configuration. Elles suivent le composant d'un poste à l'autre et d'un designer à l'autre, et une nouvelle analyse les reprend. |

## Questions au mainteneur

- Q1. Le designer dessine-t-il une seule variante de référence, ou une par valeur d'un axe de structure (taille, présence d'une icône) ?
- Q2. La liste des axes et de leurs valeurs vient-elle du cahier de P30, lu par le plugin, ou se saisit-elle dans le plugin ?
- Q4. Relancer la construction sur un composant déjà construit : le plugin complète les variantes manquantes sans toucher aux autres, ou refuse ?
- Q5. Une variante que le designer a retouchée à la main après la déclinaison se protège-t-elle d'une nouvelle déclinaison ?

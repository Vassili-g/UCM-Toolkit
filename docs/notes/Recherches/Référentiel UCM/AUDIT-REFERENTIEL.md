# Audit du référentiel UCM

## 1. Résumé

L'inventaire relève **60 ensembles de données**, comptés une fois chacun dans
le tableau principal. Une ligne regroupe une convention et ses paramètres ;
elle ne compte pas chaque token comme une définition distincte.

| Classement | Nombre |
|---|---:|
| Déjà dans la liste proposée | 28 |
| Manque au référentiel | 17 |
| Relève de FORMAT.md ou d'une SPEC | 10 |
| Propre à un seul plugin, à laisser en place | 5 |
| Total | 60 |

Les trois manques qui touchent le plus de consommateurs sont :

1. **Le protocole de lecture entre plugins** : l'adresse partagée de la
   recette est dans `ucm-couleur`, alors que Palettes et Explorateur
   l'utilisent comme point d'échange (S01).
2. **La sémantique complète du thème** : portées Figma, reconnaissance du
   neutre, exposition de `scale` et composition des états complètent les noms
   de dossiers déjà prévus (T06 à T10).
3. **Les conventions d'affectation et de mesure** : familles de marque et
   d'utilitaires, destination des primitives, seuils par usage et niveaux de
   contraste demandent des données plus précises que les seuls noms de
   collections ou de garanties (A04, A05, A11, G03, G04).

Les garanties G1 à G7 et le calcul du contraste ont déjà une autorité dans
`@ucm-kit/core/emplois`. `couleur/jugement.ts:10` importe les garanties ;
`couleur/promesses.ts:17` republie le jugement. Il n'y a pas deux tables
G1 à G7 à fusionner.

**Précision du mainteneur : les composants de la vue sont actuellement mal
configurés.** Leurs alias constituent un écart connu, pas une source pour
déduire les alias permis par l'architecture. La structure prescrite reste à
lire dans les règles de la vue et dans le profil UCM.

### Périmètre et lecture des sources

L'audit porte sur les sources présentes dans l'espace de travail. Il exclut
`node_modules`, `dist` et `docs/notes/Archives/`. Il ne modifie que ce rapport
et n'exécute aucune migration.

Les références ci-dessous utilisent ces préfixes de chemin :

| Préfixe | Chemin dans le dépôt |
|---|---|
| `kit/` | `packages/kit/src/` |
| `couleur/` | `packages/couleur/src/` |
| `palettes/` | `packages/plugin-palettes/src/` |
| `explorateur/` | `packages/plugin-explorateur/src/` |
| `exporter/` | `packages/plugin-exporter/src/` |
| `socle/` | `packages/plugin-socle/src/` |
| `cli/` | `packages/cli/src/` |
| `adapter/` | `packages/adapter-typescript/src/` |
| `Vue` | `docs/notes/Recherches/Archi Tokens Multi-marques/VUE-ILLUSTREE-MULTIMARQUES.html` |
| `Données` | `docs/notes/Recherches/Archi Tokens Multi-marques/donnees-vue-illustree.js` |
| `Générateur` | `docs/notes/Recherches/Archi Tokens Multi-marques/generer-vue-illustree.ts` |
| `Spec Palettes` | `docs/notes/Recherches/Plugin Palettes/1 Recherche initiale/RECHERCHE-PLUGIN-PALETTES.md` |

Ainsi, `kit/emplois/dossiers.ts:14` désigne
`packages/kit/src/emplois/dossiers.ts`, ligne 14. Les données de la vue sont
sérialisées sur la ligne 2 ; chaque citation de `Données:2` précise le chemin
ou le groupe observé. Le texte explicatif de la vue et son instantané sont
comparés séparément.

Les classements abrégés dans les tableaux correspondent exactement aux quatre
classes du résumé : **Prévu**, **Manque**, **Format/SPEC**, **Local**. Pour une
ligne « Manque », le titre du groupe donne le fichier d'accueil proposé ; les
nouveaux noms de fichier restent des propositions de rangement.

## 2. Tableau principal

### `crans.ts`

| Repère | Ce que la donnée définit | Sources et consommateurs actuels | Doublon ou écart | Classement |
|---|---|---|---|---|
| C01 | La liste commune de onze nuances numérotées de 50 à 950. | `couleur/nuances.ts:18` ; Palettes écrit la liste via `palettes/variables/plan.ts:145` ; Explorateur lit la liste de recette via `explorateur/integrations/palettes.ts:35`. | `Données:2`, rampes des collections de couleur, reproduit les onze numéros. | Prévu |
| C02 | Le préréglage à treize nuances ajoute 1000 et 1050 à la liste commune. | `couleur/nuances.ts:32` ; les mêmes lecteurs consomment la liste de la recette. | La proposition s'arrête à 950 ; `Données:2`, rampes primitives, s'arrête aussi à 950. Distinguer ces nuances de `neutral/scale/1000`, borne pure. | Manque |
| C03 | Les identifiants et l'ordre des thèmes sont `light`, puis `dark`. | `couleur/rampe.ts:30` ; type dans `kit/emplois/dossiers.ts:4` ; listes de détection dans `palettes/variables/detection.ts:128` ; type dans `explorateur/integrations/palettes.ts:19`. | Les mêmes identifiants sont recodés ; `Données:2`, `modes.theme`, les reprend. | Prévu |
| C04 | Les profils nommés sont `soft` et `vivid`, dans cet ordre. | `couleur/rampe.ts:19` et `:29` ; `palettes/variables/detection.ts:127` ; `explorateur/integrations/palettes.ts:18` et `:41`. | Types et listes répétés entre moteur et plugins. | Prévu |
| C05 | Une palette à une intensité n'a pas de segment de profil dans son chemin. | `couleur/rampe.ts:27` nomme l'intensité `unique` ; `couleur/palette.ts:50` ; `palettes/variables/plan.ts:152` ; Explorateur utilise `null` dans `explorateur/integrations/palettes.ts:24`. | `unique` et `null` représentent la même absence de profil dans deux modèles ; les valeurs internes ne sont pas nécessairement à fusionner. | Manque |

Les courbes de luminosité des préréglages restent des paramètres du moteur,
distincts du catalogue des numéros (L02).

### `theme.ts`

| Repère | Ce que la donnée définit | Sources et consommateurs actuels | Doublon ou écart | Classement |
|---|---|---|---|---|
| T01 | La table choisit les crans de `solid`, `surface`, `page` et `ring` selon le thème et son sens. | `kit/emplois/dossiers.ts:30` ; `couleur/jugement.ts:11` ; `explorateur/integrations/profilUcm.ts:89`. | Recopiée dans `Vue:142` à `:148` et résumée dans `AGENTS.md:1047`. La table HTML correspond aux quatre cas du kit. | Prévu |
| T02 | Le texte des boutons détermine le sens normal ou inversé et les crans requis en découlent. | `kit/emplois/dossiers.ts:6`, `:9`, `:69` ; `couleur/recette.ts:245` ; `couleur/nuances.ts:45`. | `Vue:138` et `AGENTS.md:1047` reprennent le sens. L'instantané Dark utilise le sens inversé ; le défaut de recette utilise le sens normal. | Prévu |
| T03 | Le neutre ajoute les deux textes de page et les bornes pures de l'échelle. | `kit/emplois/dossiers.ts:20` et `:63` ; `palettes/presentation.ts:388` ; `explorateur/integrations/palettes.ts:64`. | `Données:2`, `theme.neutral`, contient les bornes mais aucun `page.foreground-main` ni `page.foreground-subtle`. | Prévu |
| T04 | Les variables globales de désactivation utilisent les crans 200, 500 et 500. | `kit/emplois/dossiers.ts:21` et `:58` ; `explorateur/integrations/profilUcm.ts:16`. | Même table dans `Vue:150` et `Données:2`, `theme.disabled.*`. | Prévu |
| T05 | L'élévation distingue le fond de page et la surface élevée. | Noms dans `kit/emplois/dossiers.ts:22` ; calcul de la carte dans `couleur/jugement.ts:66` ; fonds de recette dans `couleur/recette.ts:244`. | `Vue:151` fixe neutre 50 et neutre 100 en Dark ; `Spec Palettes:1409` décrit une carte calculée depuis le fond réglable. Les noms sont prévus ; le rapport entre règle et exemple demande clarification. | Prévu |
| T06 | Chaque variable possède des usages de peinture et des portées Figma attendues. | `kit/emplois/dossiers.ts:110` et `:122` ; contrôle dans `explorateur/integrations/profilUcm.ts:132`. | `Vue:175` décrit les portées sans les détailler. Le contenu proposé de `theme.ts` ne mentionne pas `SUPPORT_DES_VARIABLES`. | Manque |
| T07 | Le nom `neutral` déclenche les usages propres au neutre dans les plugins. | `palettes/presentation.ts:386` et `:389` ; `explorateur/integrations/palettes.ts:16` et `:67`. | Constante recopiée ; Palettes retire les espaces autour du nom, Explorateur ne les retire pas. Le catalogue des statuts prévu ne définit pas à lui seul cette reconnaissance. | Manque |
| T08 | Le focus utilise un anneau séparé du composant par un espace de fond. | Donnée documentaire seulement : `Vue:148` et `:158` indiquent 2 px de fond et 2 px de trait ; le kit nomme l'anneau dans `kit/emplois/dossiers.ts:106`. | Le kit ne fixe pas cette géométrie ; `Données:2`, `layouts.stroke.ring`, vise une dimension de 4 px. La relation entre les deux prescriptions reste à préciser. | Manque |
| T09 | Le bouton basculable compose `surface` au repos non activé et `solid` lorsqu'il est activé. | Convention documentaire seulement : `Vue:163`, `:167`, `:168`, `:171` ; `kit/emplois/dossiers.ts:102` décrit les états du fond, sans axe d'activation. | Ce cas d'emploi n'est pas une nouvelle famille de tokens. Il n'est pas énuméré dans le contenu proposé. | Manque |
| T10 | `scale` expose les crans de palette hors des rôles prédéfinis. | `Vue:127` ; `Données:2`, `theme.primary.scale.*` et les autres familles. | `kit/emplois/dossiers.ts:20` ne catalogue que les bornes `scale/0` et `scale/1000` du neutre, pas une règle générale `scale/{cran}`. | Manque |

### `garanties.ts` et `contraste.ts`

| Repère | Ce que la donnée définit | Sources et consommateurs actuels | Doublon ou écart | Classement |
|---|---|---|---|---|
| G01 | G1 à G7 désignent les couples à comparer, les fonds et la catégorie de seuil. | `kit/emplois/garanties.ts:22` et `:33` ; imports dans `couleur/jugement.ts:10` ; Palettes les lit dans `palettes/planche/modele.ts:463`. | Pas de table concurrente dans `couleur/promesses.ts` ; `Spec Palettes:1406` et `AGENTS.md:1065` les décrivent. | Prévu |
| G02 | Le contraste et sa comparaison utilisent la même écriture à dix décimales. | `kit/emplois/contraste.ts:40`, `:49`, `:58` ; `couleur/contraste.ts:6` ; `kit/lecteurs/diagnostic-contrastes.mjs:17`, appelé par le CLI. | Calcul déjà partagé ; la proposition peut conserver cette autorité. | Prévu |
| G03 | Les seuils de référence et leur attribution à un usage distinguent texte et éléments non textuels. | Défauts 4,5 et 3 dans `couleur/recette.ts:246` ; seuils par rôle dans `kit/lecteurs/diagnostic-contrastes.mjs:28` ; catégories G1 à G7 dans `kit/emplois/garanties.ts:23`. | Deux tables numériques ; le lecteur impose aussi 4,5 aux icônes. Les seuils de recette sont réglables et ne décrivent pas la même politique que tous les rôles du lecteur. | Manque |
| G04 | Les niveaux AA et AAA se calculent selon texte, grand texte et graphique. | `couleur/contraste.ts:31` et `:37` ; emploi par la planche dans `palettes/planche/modele.ts:485`. | Le calcul WCAG commun du kit ne porte pas ce catalogue de niveaux. Les niveaux fixes sont distincts des seuils réglables de G03. | Manque |
| G05 | L'affichage d'une mesure tronque le résultat à deux décimales. | `couleur/contraste.ts:54` ; `kit/lecteurs/diagnostic-contrastes.mjs:198` ; prescription dans `Spec Palettes:463`. | Deux rendus consomment le calcul commun. La règle de présentation relève des spécifications des outils ; elle n'ajoute pas une définition d'architecture. | Format/SPEC |

G05 signale un doublon de présentation entre le moteur utilisé par le plugin
et le lecteur du kit. Le calcul et la comparaison restent déjà partagés (G02).

### `collections.ts`

| Repère | Ce que la donnée définit | Sources et consommateurs actuels | Doublon ou écart | Classement |
|---|---|---|---|---|
| A01 | L'architecture énumère ses collections et leur ordre de présentation. | `explorateur/integrations/profilUcm.ts:27` ; `Vue:189` ; `Générateur:30`. | Le profil connaît cinq couches ; la vue et son générateur listent sept collections, avec `layouts` et `typography`. | Prévu |
| A02 | Les alias autorisés relient les couches selon leur responsabilité. | `explorateur/integrations/profilUcm.ts:32` ; contrôle `:116` ; description `Vue:122` et `:126`. | Les données actuelles de `components` contournent `theme` ; configuration provisoire confirmée par le mainteneur. Ne pas la convertir en règle. | Prévu |
| A03 | Marque et thème constituent des axes indépendants de modes. | `Vue:121` et `:174` ; `Données:2`, `modes.theme` et `modes.color-brands`. | Le profil ne catalogue pas ces axes ; le format accepte des axes génériques dans `kit/format/tokens.ts:107`. Les noms de marques de l'instantané sont des valeurs de fichier. | Prévu |
| A04 | `color-brands` distingue les couleurs de charte `identity` des rampes `primary` et `secondary`. | `Vue:120` ; `Données:2`, `color-brands.identity.primary`, `.identity.secondary`, `.primary.*`, `.secondary.*`. | Aucun catalogue correspondant dans le profil à cinq couches ; `explorateur/integrations/profilUcm.ts:79` indique explicitement que `identity` n'est pas une variable de dossier reconnue. | Manque |
| A05 | `color-utilities` affecte les palettes aux statuts, au neutre et aux niveaux d'élévation. | `Vue:120` ; `Données:2`, groupes `success`, `warning`, `info`, `danger`, `neutral`, `elevation`. | Les statuts sont déjà prévus comme mots, mais leurs familles, leur intensité et leur place dans le chemin ne le sont pas explicitement. | Manque |
| A06 | `primitives` sépare les couleurs, dimensions et grandeurs typographiques. | `Vue:119` ; `Données:2`, groupes `colors`, `dimensions`, `fontfamily`, `fontweight`, `fontsize`, `lineheight`, `letterspacing`. Palettes écrit les couleurs via `palettes/variables/plan.ts:152`. | Le plugin n'écrit pas les autres familles. Leurs chemins sont attestés dans l'instantané ; aucune liste de familles équivalente dans le profil. | Prévu |
| A07 | `layouts` regroupe les alias de dimensions par sizing, radius et stroke. | `Vue:122` ; `Données:2`, `layouts.sizing.*`, `.radius.*`, `.stroke.*` ; extraction par `Générateur:30`. | Collection absente du profil ; les valeurs `0,5`, `1,5` et `full` sont des exemples présents dans l'instantané, pas une échelle imposée par le kit. | Prévu |
| A08 | `typography` regroupe les réglages de texte par rôle et taille. | `Vue:122` ; `Données:2`, rôles `display`, `headline`, `title`, `body`, `label`, tailles `large`, `medium`, `small`. | Le kit définit les types de styles dans `kit/format/types.ts`, pas ce catalogue de rôles. L'instantané comporte quatre attributs par combinaison ; aucun `fontfamily` dans cette collection. | Prévu |
| A09 | `components` nomme des propriétés par composant, axes et nature de valeur. | `Données:2`, par exemple `components.button.colors.primary.contained.default.background` et `components.button.sizes.medium.border-radius` ; `Vue:122`. | L'instantané montre plusieurs formes, dont les cas `stresstest`. Aucune grammaire unique de chemins n'est codée dans `explorateur/integrations/profilUcm.ts:102`. Les alias mal configurés ne fixent pas cette grammaire. | Prévu |
| A10 | Les collections intermédiaires de couleur ont des portées Figma vides. | `explorateur/integrations/profilUcm.ts:41` et `:129` ; `Vue:175`. | Cette règle de collection complète les portées de chaque variable T06. Elle manque à la description proposée de `collections.ts`. | Manque |
| A11 | L'écriture initiale des palettes vise `primitives/colors`, avec le thème dans le chemin. | `palettes/variables/destination.ts:22` ; construction dans `palettes/variables/plan.ts:142` ; `Spec Palettes:3220`. | Correspond à `Données:2`, `primitives.colors.*`. Le défaut décrit une convention UCM, même si le designer peut choisir une autre destination. La confirmation et le suivi restent locaux. | Manque |

A04 et A05 ajoutent l'affectation sémantique des familles. Elles ne demandent
pas de déplacer dans le kit les couleurs `terracota`, `deep`, `sky` ou le nom de
marque `intencial` de cet instantané.

### `vocabulaire.ts`

| Repère | Ce que la donnée définit | Sources et consommateurs actuels | Doublon ou écart | Classement |
|---|---|---|---|---|
| V01 | Les états reconnus comprennent les formes nominales et leurs variantes tolérées. | `exporter/contract/semantics.ts:32` ; états de fond dans `kit/emplois/dossiers.ts:14` ; `docs/format/FORMAT.md:347`. | L'exporteur accepte déjà `pressed` et `disabled`, mais recommande `press` et `disable` dans `exporter/contract/semantics.ts:142`. Le choix canonique du mainteneur doit remplacer cette recommandation. | Prévu |
| V02 | Les valeurs connues permettent de reconnaître un axe de tailles. | `exporter/contract/semantics.ts:60` et `:70` ; `Données:2`, `components.button.sizes.small`, `.medium`, `.big`. | La liste comprend `tiny`, `huge`, les tailles abrégées et leurs variantes. La classification d'un axe reste une lecture Figma ; le vocabulaire des tailles est prévu. | Prévu |
| V03 | Les noms d'axes d'état et les sélecteurs relient le vocabulaire UCM aux interactions web. | `exporter/contract/semantics.ts:32` et `:54` ; `exporter/contract/parsers.ts:85` ; `docs/format/FORMAT.md:347`. | Le contenu proposé énumère les états, mais ne mentionne ni `state/states/status` ni les déclencheurs. `active` n'est volontairement pas traduit en `:active`. | Manque |
| V04 | Une priorité générique départage les états simultanés. | `exporter/contract/semantics.ts:45` et `:148` ; `docs/format/FORMAT.md:351`. | Table codée dans le plugin et décrite dans le format. La priorité et les variantes admises doivent rester liées. | Manque |
| V05 | Le vocabulaire de peinture distingue fond, texte, icône, contour, séparateur et anneau. | Supports dans `kit/emplois/dossiers.ts:110` ; rôles rendables dans `exporter/contract/semantics.ts:173` ; `docs/format/FORMAT.md:1013`. | Le périmètre des noms diffère : `divider` est une variable de thème ; `icon` et `background` existent parmi les rôles rendables. Le mapping CSS publié relève de F04. | Prévu |
| V06 | Les slots texte et icône reçoivent des noms sémantiques et des suffixes stables. | `exporter/contract/semantics.ts:89` et `:103` ; types du contrat dans `kit/format/types.ts`. | La règle sert l'adresse portable d'un slot, pas l'architecture des collections. Pas de déplacement proposé vers le référentiel. | Format/SPEC |

Les libellés courts des thèmes, profils et variables sont aussi des données
de ces groupes : `palettes/i18n/fr.ts:801`, `:807`, `:846`, `:990` et
`palettes/i18n/en.ts:838` à `:859`. Le catalogue du référentiel doit pouvoir
les fournir en français et en anglais. Les phrases d'aide, accords et messages
contextuels restent dans les catalogues de l'interface.

### `produits.ts`

| Repère | Ce que la donnée définit | Sources et consommateurs actuels | Doublon ou écart | Classement |
|---|---|---|---|---|
| P01 | UCM Exporter lit les composants et variables, publie les artefacts et crée les règles d'usage dans Figma. | `packages/plugin-exporter/package.json:5` ; publication dans `exporter/code.ts:930` ; écriture du document dans `exporter/template/ecriture.ts:347`. | Rôle décrit aussi dans `AGENTS.md:3`, `packages/plugin-exporter/SPEC.md:995` et `Vue:177` à la suite de la table des outils. | Prévu |
| P02 | UCM Palettes calcule les palettes et écrit recette, variables primitives et planches. | `palettes/code.ts:10`, `:12`, `:82`, `:99` ; `palettes/ecriture/recette.ts:36` ; `palettes/variables/plan.ts:152`. | `packages/plugin-palettes/package.json:5` cite surtout les planches ; `Vue:178` cite surtout les primitives. Le catalogue doit couvrir les deux sorties. | Prévu |
| P03 | UCM Explorateur lit les variables et les intégrations sans écrire dans le document. | `packages/plugin-explorateur/package.json:5` ; `explorateur/code.ts:3`, `:151` ; préférences personnelles dans `explorateur/preferences.ts:31`. | `Vue:179` ne présente que le contrôle du profil UCM. Le rôle général du plugin dépasse ce profil facultatif. | Prévu |
| P04 | Le kit publie le format, les emplois et les lecteurs du contrat. | `packages/kit/package.json:4` et `:24` ; `kit/format/types.ts:1` ; `kit/lecteurs/controle-repository.mjs:691`. | Le futur catalogue doit conserver la distinction entre données pures et lecteurs qui emploient Node ou Ajv ; la présence d'un même paquet ne supprime pas cette frontière. | Prévu |
| P05 | Le CLI initialise le dépôt, contrôle les contrats et produit les sorties dérivées. | `cli/ucm.mjs:148`, `:190`, `:194`, `:222` ; CSS dans `cli/tokens-css.mjs:562` ; configuration dans `cli/init.mjs:31`. | `packages/cli/package.json:4` ne détaille pas toutes les commandes ; `Vue:176` ne décrit que la génération CSS. | Prévu |
| P06 | L'adaptateur TypeScript contrôle la parité et génère les types issus des contrats. | `packages/adapter-typescript/package.json:4` ; `adapter/index.mjs:2` et `:8` ; sortie par défaut dans `adapter/generation.mjs:66`, écriture `:95`. | Rôle déjà décrit dans la carte d'`AGENTS.md` ; ce paquet n'écrit pas dans Figma. | Prévu |
| P07 | Le moteur de couleur fournit les calculs et la lecture versionnée des recettes sans Figma ni DOM. | `packages/couleur/package.json:5` ; `couleur/recette.ts:985` ; `couleur/index.ts:12`. | Le module transporte aussi le protocole partagé S01. Ses algorithmes ne deviennent pas tous des définitions du référentiel. | Prévu |
| P08 | Le socle fournit aux plugins le build, l'interface commune et les chemins publiés des tokens. | `packages/plugin-socle/package.json:5` ; `socle/cheminsDeTokens.ts:1`. | Sa description de paquet couvre les moyens techniques ; son rôle doit rester distinct des responsabilités métier des plugins. | Prévu |

### `protocole.ts`, ajout proposé

| Repère | Ce que la donnée définit | Sources et consommateurs actuels | Doublon ou écart | Classement |
|---|---|---|---|---|
| S01 | L'adresse `ucm_palettes/recette` permet aux plugins d'échanger la recette du document. | `couleur/protocole.ts:8` et `:11` ; import dans `palettes/lecture.ts:6` ; lecture dans `explorateur/code.ts:151`. | Déjà une seule constante, située dans le moteur ; le rôle partagé dépasse ce moteur. Aucun déplacement des autres clés n'en découle. | Manque |
| S02 | Le schéma de recette définit sa version, ses champs et les versions antérieures lisibles. | `couleur/recette.ts:23`, `:215`, `:833`, `:985` ; lecture dans `explorateur/integrations/palettes.ts:30` ; `packages/plugin-explorateur/SPEC.md:245`. | Format courant 12 ; formats 8 à 11 convertis par étapes. Ce protocole sérialisé relève d'une SPEC de recette ; ses identifiants de thème et ses seuils renvoient au référentiel. | Format/SPEC |
| S03 | Les clés de suivi désignent variables, cadres et calques gérés par Palettes. | `palettes/variables/suivi.ts:16`, `:18`, `:21` ; `palettes/lecture.ts:14`, `:22`, `:53` ; `palettes/ecriture/planche.ts:31`. | Même espace partagé, mais lecteurs et écrivains relevés dans Palettes seulement. Les clés `variables`, `planche`, `palette`, `cle`, `cadre`, `proprietaire`, `empreinte`, `grille`, `calque` ne sont pas toutes un protocole entre plugins. | Local |
| S04 | Une empreinte distingue le texte rangé de la recette et le modèle calculé. | Canonisation dans `couleur/empreinte.ts:12`, FNV-1a dans `:54`, empreinte d'une valeur dans `:64` ; texte brut dans `palettes/lecture.ts:313`. | Deux objets d'empreinte différents ; aucune contradiction établie. Les octets et la version d'un protocole sont à spécifier, pas à transformer en entrée de vocabulaire. | Format/SPEC |

### `regles.ts`, ajout proposé

| Repère | Ce que la donnée définit | Sources et consommateurs actuels | Doublon ou écart | Classement |
|---|---|---|---|---|
| R01 | Les tags et noms du kit de règles identifient les intentions et propriétés documentables. | `exporter/contract/rulesModel.ts:12`, `:23` ; `exporter/contract/extractRules.ts:58`, `:60`, `:68`, `:72` ; `.rulesSection` dans `exporter/template/sources.ts:168`. | Huit tags répétés dans les expressions régulières `exporter/contract/rulesModel.ts:27` et `:40`, puis dans `docs/format/FORMAT.md:857`. La liste proposée n'inclut pas ce vocabulaire UCM. | Manque |
| R02 | La lecture des règles rapproche les témoins, les cibles et les textes d'aide avant d'enrichir le contrat. | `exporter/contract/rulesModel.ts:26`, `:39` ; `exporter/contract/extractRules.ts:86` ; `docs/format/FORMAT.md:844`, `:857`, `:871`. | Les tags peuvent être des données du kit ; les priorités de lecture, avertissements et règles de rattachement restent spécifiés par le format et l'exporteur. | Format/SPEC |

### Données à conserver dans `format/`

| Repère | Ce que la donnée définit | Sources et consommateurs actuels | Doublon ou écart | Classement |
|---|---|---|---|---|
| F01 | La configuration du dépôt fixe les chemins et le motif d'implémentation par défaut. | `kit/format/configuration.ts:10`, `:21`, `:57` ; `exporter/depot.ts:133` ; `cli/init.mjs:31` ; `kit/lecteurs/configuration.mjs:8`. | Autorité déjà commune : `components`, `tokens.json`, `{dir}/{id}.tsx`. Le nom du dossier `components` du dépôt n'est pas la collection Figma homonyme. | Format/SPEC |
| F02 | Les extensions DTCG décrivent la version, les axes, les valeurs par mode et leurs surcharges. | `kit/format/tokens.ts:15`, `:27`, `:84`, `:98` ; `kit/lecteurs/modes-tokens.mjs:22` ; `exporter/tokens/exportTokens.ts:370` ; `cli/tokens-css.mjs:228` ; `docs/format/FORMAT.md:1662` et `:1699`. | `com.ucm.axes` et `com.ucm.modes` sont du format, comme `com.ucm.axis` et `com.ucm.extensions`. Le référentiel décrit quels axes l'architecture utilise, pas leur enveloppe JSON. | Format/SPEC |
| F03 | La normalisation produit les identifiants de code, références de tokens et attributs CSS. | `kit/format/names.ts:3`, `:13`, `:70`, `:87` ; `kit/format/references.ts:21` ; assemblage dans `socle/cheminsDeTokens.ts:45` ; `exporter/variables.ts:6`. | L'assemblage du chemin est déjà partagé par Exporter et Explorateur. `Vue:176` illustre les attributs dérivés ; ces noms ne doivent pas devenir une deuxième table. | Format/SPEC |
| F04 | Le contrat sérialise les sélecteurs, rôles de rendu, dépendances et données normatives ou indicatives. | `kit/format/types.ts:142`, `:152`, `:208` ; `exporter/contract/semantics.ts:171` ; `docs/format/FORMAT.md:1011` ; responsabilités dans `CONCEPT.md:49`. | Le vocabulaire général peut être centralisé ; les champs et le mapping CSS publié restent du contrat. `divider` ne doit pas devenir automatiquement un rôle rendable. | Format/SPEC |
| F05 | Les versions du contrat et des tokens bornent les lecteurs ; les noms de graisses décrivent la lecture DTCG. | `kit/format/version.ts:16` ; `kit/format/tokens.ts:15` et `:24` ; `kit/format/typography.ts:9`, `:45`, `:51`. | Ces tables sont déjà dans le kit. Les familles typographiques de l'architecture A08 sont distinctes des types et conversions du format. | Format/SPEC |

### Données à laisser dans leur outil

| Repère | Ce que la donnée définit | Sources et consommateurs actuels | Doublon ou écart | Classement |
|---|---|---|---|---|
| L01 | La détection regroupe une palette à partir de cinq variables et choisit une référence proche de 600. | `palettes/variables/detection.ts:11`, `:14`, `:35`, `:159`. | Les listes de thèmes et profils réutilisables sont C03 et C04 ; le seuil de détection et le choix d'une référence restent des heuristiques de reprise de Palettes. | Local |
| L02 | Les paramètres numériques du moteur règlent les courbes, la chroma et la recherche des rampes. | `couleur/nuances.ts:21`, `:41` ; `couleur/recette.ts:156`, `:192`, `:470` ; `couleur/palette.ts:385`. | Sources lues par les plugins via `ucm-couleur`, sans table concurrente établie. La réutilisation d'un moteur ne suffit pas à faire de tous ses réglages une convention UCM. | Local |
| L03 | Les préférences d'interface et les familles de teinte organisent le travail dans chaque plugin. | `explorateur/preferences.ts:31` ; `palettes/preferences.ts:4` ; `palettes/familles.ts:7` et `:21`. | Une famille de teinte de la piste n'est pas une famille sémantique `primary` ou `success`. Aucun vocabulaire d'architecture à déplacer dans ces réglages. | Local |
| L04 | Les noms de palette et les collisions déterminent le segment que Palettes écrit dans la destination choisie. | `palettes/variables/noms.ts:17`, `:34`, `:49` ; réemploi de `socle/cheminsDeTokens.ts:19`. | La destination conventionnelle est A11 ; le suffixe d'identifiant et le maintien des variables reprises restent des choix d'écriture propres à Palettes. | Local |

Pour L02, « Local » inclut le moteur interne employé par Palettes. La forme
sérialisée de ses paramètres relève de S02 ; seuls les identifiants et valeurs
qui définissent l'architecture sont proposés pour le référentiel.

## 3. Contradictions et doublons

### États recommandés et états canoniques

`exporter/contract/semantics.ts:32` accepte `press`, `pressed`, `disable` et
`disabled`. Le message de `:142` recommande seulement les formes courtes.
`kit/emplois/dossiers.ts:14` et `Vue:142` utilisent `pressed`.

Le choix du mainteneur fixe `pressed` et `disabled` comme termes UCM et
maintient les formes courtes à la lecture. Le rapport ne propose pas de
renommer les valeurs d'un contrat existant. Le comportement de publication
d'une valeur Figma tolérée reste à préciser avec les règles de traçabilité du
format (`CONCEPT.md:88`, section « Les noms restent traçables »).

### Collections et alias

`explorateur/integrations/profilUcm.ts:27` reconnaît cinq couches de couleur.
`Vue:189` et `Générateur:30` énumèrent sept collections. Le profil ne peut donc
pas traiter `layouts` et `typography` comme des couches reconnues.

`explorateur/integrations/profilUcm.ts:33` limite les alias de couleur de
`components` à `theme`. `Vue:122` prescrit le même passage ; les données
actuelles de composants ne le suivent pas. Le mainteneur confirme que cette
configuration est à corriger. Les alias vers `layouts` et les primitives de
dimension doivent être examinés selon leur type : le contrôle actuel du
profil ignore les variables non `COLOR`
(`explorateur/integrations/profilUcm.ts:107`).

Le repli `brand` vers `color-brands` existe dans
`explorateur/integrations/profilUcm.ts:67`. C'est une compatibilité de
préférence rangée, pas la preuve que `brand` reste un nom canonique de
collection. La liste des noms canoniques et les tolérances de lecture doivent
rester distinctes dans A01.

### Neutre et espaces autour du nom

`palettes/presentation.ts:390` reconnaît `neutral` après `trim()` et passage en
minuscules. `explorateur/integrations/palettes.ts:64` ne fait que le passage
en minuscules. Une palette nommée ` neutral ` reçoit donc les usages du neutre
dans l'aperçu Palettes, mais pas dans cette intégration de l'Explorateur.

### Données déjà partagées

Les tables de dossiers, de garanties et le contraste sont déjà importés du
kit par le moteur (`couleur/jugement.ts:10`) et par l'Explorateur
(`explorateur/integrations/profilUcm.ts:12`). La proposition doit déplacer ou
réexporter cette autorité sans réécrire une deuxième table.

La configuration de repository suit aussi une autorité commune :
`kit/format/configuration.ts:57`, importée par `exporter/depot.ts:7`,
`cli/init.mjs:31` et `kit/lecteurs/configuration.mjs:8`. Aucun défaut
contradictoire n'est établi sur ces chemins.

### Libellés et unités de sens

Les noms de thèmes et profils sont recopiés dans
`palettes/i18n/fr.ts:801` et `:807`, puis dans le catalogue anglais. Les
libellés de variables sont aussi énumérés dans `palettes/i18n/fr.ts:846` et
`palettes/i18n/en.ts:844`.
Ces noms peuvent provenir des entrées bilingues du référentiel ; une phrase
contextuelle ne se réduit pas à la concaténation de leurs libellés.

`kit/emplois/dossiers.ts:125` associe `page/divider` au support de contour.
`exporter/contract/semantics.ts:173` publie des rôles de rendu qui comprennent
`icon` mais pas `divider`. Ce sont deux vocabulaires liés, avec des fonctions
différentes. Leur rapprochement doit conserver cette distinction.

## 4. Écarts entre la vue illustrée et le kit

### Texte prescriptif et instantané des composants

La vue indique que le panneau reproduit un instantané sans corriger ses alias
(`Vue:135`, `Générateur:1`). Son texte prescrit le passage des couleurs de
composants par `theme` (`Vue:122`).

Le comptage de `Données:2`, collection `components`, donne 369 entrées :

| Valeur ou collection directement visée | Nombre |
|---|---:|
| `color-utilities` | 217 |
| `color-brands` | 50 |
| `primitives` | 57 |
| `layouts` | 17 |
| `components` | 2 |
| Valeur absente `∅` | 24 |
| Valeur directe en pixels | 2 |
| `theme` | 0 |

Ces comptes décrivent la configuration provisoire signalée par le mainteneur.
Ils ne déterminent ni la grammaire finale de `components`, ni les alias permis.
Les chemins de cette collection comprennent 60 segments `press` et 36 segments
`disable` ; aucun segment `pressed` ou `disabled`.

### Sens du thème dans les données

La table HTML correspond aux quatre tables du kit (`Vue:142` à `:148` ;
`kit/emplois/dossiers.ts:30`). L'instantané applique Light normal et Dark
inversé : par exemple `theme.primary.solid.hover` vise 800 en Light et 600 en
Dark, `solid.pressed` vise 900 et 500, `page.foreground` vise 700 et 800, et
`ring` vise 600 et 700 (`Données:2`).

Ces valeurs sont compatibles avec la table du kit lorsque le texte Dark est
blanc. Elles diffèrent du défaut de recette, dont le texte Dark est noir
(`kit/emplois/dossiers.ts:7`, `couleur/recette.ts:245`). Ce constat ne prouve
pas une erreur de la table.

### Variables présentes d'un seul côté

| Sujet | Vue et données | Kit ou moteur | Nature de l'écart |
|---|---|---|---|
| Textes propres au neutre | `Vue:149` décrit `foreground-main`, mais `Données:2`, `theme.neutral`, n'a ni `foreground-main` ni `foreground-subtle`. | `kit/emplois/dossiers.ts:20` les énumère ; `:63` relie le texte secondaire au cran de `page/foreground`. | L'instantané n'expose pas les deux noms du kit. |
| Échelles de thème | `Données:2` expose onze `scale.{cran}` par famille de palette, plus 0 et 1000 pour le neutre ; `Vue:127` en décrit l'usage. | Le catalogue `kit/emplois/dossiers.ts:15` ne comporte pas les onze chemins de scale ; `:20` ajoute les deux bornes du neutre. | Règle générale de scale absente du catalogue d'emplois. |
| Couleurs de charte | `Données:2`, `color-brands.identity.primary` et `.secondary`, expose des références fixes de charte. | Le profil reconnaît la couche `color-brands`, sans catalogue des membres `identity` (`explorateur/integrations/profilUcm.ts:27`, `:79`). | Définition des familles à ajouter au référentiel. |
| Nuances supplémentaires | Les rampes de l'instantané s'arrêtent à 950. | `couleur/nuances.ts:35` ajoute 1000 et 1050 pour le préréglage 13. | Exemple à onze nuances, capacité du moteur plus large. |
| Layouts et typographie | Deux collections, 31 et 60 entrées dans `Données:2`. | Absentes de `explorateur/integrations/profilUcm.ts:27`. | Profil de contrôle limité aux cinq couches de couleur. |

### Élévation et anneau

`Données:2`, `color-utilities.elevation.*`, donne neutre 50 pour la page,
blanc pour la carte Light et neutre 100 pour la carte Dark. Le moteur accepte
un fond de page réglable et calcule la carte Dark avec la courbe
(`couleur/jugement.ts:66`). L'instantané est compatible avec un cas
particulier ; il ne représente pas toutes les recettes permises.

L'anneau décrit par `Vue:158` a 2 px de fond puis 2 px de trait.
`Données:2`, `layouts.stroke.ring`, vise `primitives.dimensions.4`. Le kit
porte l'usage `ring` et ses portées (`kit/emplois/dossiers.ts:119`), sans
largeur ni décalage universels. L'audit relève deux valeurs documentaires
à articuler, sans conclure que la dimension 4 représente nécessairement le
trait de 2 px.

### Contrôle des références de l'instantané

Une lecture de toutes les entrées des sept collections ne relève aucune
cible d'alias absente, parmi les valeurs qui nomment une de ces collections
(`Données:2`). Ce contrôle de présence ne juge ni l'architecture, ni les
types DTCG, ni les valeurs dans tous les contextes de modes. Le générateur
aplatit les feuilles pour le panneau (`Générateur:16`, `:34`).

## 5. Questions pour le mainteneur

Les questions suivantes ne remettent pas en cause les choix déjà pris :
données TypeScript pures dans le kit, architecture de la vue, termes
`pressed` et `disabled`, rôles des produits dans le référentiel.

1. **Crans et intensité unique.** Le référentiel doit-il cataloguer les deux
   préréglages 11 et 13, ainsi que l'absence de profil d'une palette à une
   intensité ? Quelle portée donner aux listes libres de 50 à 1050, déjà
   acceptées par le moteur (`couleur/recette.ts:470`) ?
2. **Familles de référence.** `primary` et `secondary` constituent-ils la
   liste fermée des rôles de marque, ou un minimum extensible ? Les noms de
   palettes concrètes et de marques de l'instantané doivent-ils rester des
   exemples, avec une règle de chemin paramétrée ?
3. **Grammaire de `components`.** Quelle grammaire doit faire autorité après
   correction des composants : parties `colors/sizes`, ordre des axes,
   familles autorisées et cibles permises selon le type de variable ? Les
   cas `stresstest` sont-ils uniquement des exemples de test ?
4. **Portée du profil.** Les sept collections doivent-elles toutes être
   contrôlées par le profil UCM, ou les collections `layouts` et `typography`
   doivent-elles être cataloguées avec un contrôle distinct ? Le code actuel
   ne contrôle que les couleurs des cinq couches associées.
5. **Scale et neutre.** Faut-il exposer `scale/{cran}` pour chaque famille de
   palette ? Les deux noms `foreground-main` et `foreground-subtle`
   remplacent-ils `neutral/page/foreground`, ou doivent-ils coexister ?
   Quelle règle de reconnaissance appliquer au nom `neutral` dans les deux
   plugins ?
6. **Élévation.** Les alias neutre 50 et neutre 100 sont-ils un exemple de
   recette, ou des contraintes de l'architecture ? Comment représenter dans
   le référentiel le fond réglable et la carte calculée, sans y déplacer
   tout le moteur de couleur ?
7. **Géométrie du focus.** La séparation de 2 px et le trait de 2 px sont-ils
   une règle UCM générale ? Quel rôle joue alors le token de 4 px
   `layouts.stroke.ring` dans l'instantané ?
8. **Règles d'emploi.** Le cas du bouton basculable doit-il être une donnée
   structurée du référentiel, ou un exemple généré à partir des dossiers et
   états existants ? La vue en fait une prescription, le kit ne la modèle
   pas encore.
9. **Seuils et niveaux.** Quels défauts et associations par rôle doivent être
   partagés entre les garanties de Palettes et le diagnostic du kit ? Le
   rôle `icon` doit-il conserver son seuil de 4,5 dans le lecteur, et comment
   documenter la différence avec les seuils réglables d'une recette ?
10. **Tolérances d'état.** Les lectures de `hovered` et `focused`, déjà
    acceptées, restent-elles admises avec `press` et `disable` ? Une valeur
    Figma tolérée doit-elle garder son identifiant publié, avec un nom
    canonique distinct, ou être normalisée à l'export en conservant son nom
    source ?
11. **Protocole entre plugins.** Le référentiel doit-il porter seulement les
    identifiants `ucm_palettes/recette`, avec une SPEC séparée pour la recette ?
    Existe-t-il un besoin décidé de lecture du suivi des variables ou des
    planches par un autre plugin ? L'audit n'en relève pas dans les sources
    examinées.
12. **Règles d'usage et libellés.** Le vocabulaire des huit tags, noms de
    maîtres et marqueur d'aide doit-il être importable depuis le kit ? Les
    libellés courts du référentiel deviennent-ils aussi la source des
    catalogues bilingues de Palettes, les messages restant dans le plugin ?

### Vérification de l'audit

Les comptes de collections, cibles et états proviennent d'une lecture JSON de
`Données:2`. Les références de sources ont été vérifiées sur les fichiers de
l'espace de travail. Aucun build ni test fonctionnel n'est nécessaire à cet
inventaire documentaire ; le contrôle de style porte sur ce rapport seul.

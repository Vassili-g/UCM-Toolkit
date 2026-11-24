# Zone 1 : règles jumelles et protocoles entre outils

## Étapes

- [x] 1. Relire `CONCEPT.md`, le premier audit P27, l'audit du 30 octobre et `tests/reglesUniques.test.ts`
- [x] 2. Relever les transformations de noms et d'identifiants de chaque paquet
- [x] 3. Comparer les fonctions jumelles sur un même jeu d'entrées (`noms.mts`, `jumelles.mts`, `palettes.mts`)
- [x] 4. Juger un même fichier par UCM Architect et par `ucm check` (`controles.mts`)
- [x] 5. Comparer les lecteurs jumeaux de `tokens.json` (`valeurs.mts`, `alias.mts`)
- [x] 6. Relever les protocoles entre outils (marqueurs, `ci-report.md`, branches, demande de fusion, artefacts, note GitLab)
- [x] 7. Relever les styles communs des plugins
- [x] 8. Fiches, inventaire `parametres.json`, contrôle de style

## Synthèse

La zone compte 12 écarts. 4 sont importants, 8 mineurs, aucun bloquant. 6 cassent la Robustesse et 6 la Confiance.

Les règles jumelles se logent entre UCM Architect et l'Exporter. Architect rattache une règle à sa propriété par `nomCompacte`, l'Exporter par l'égalité exacte des clés (PP-101). La préparation filtre les variables du composant par une casse que `estDuComposant` ignore (PP-102). Le contrôle des renommages ignore les collisions de nom CSS que `ucm tokens css` refuse (PP-103).

Le motif d'implémentation a deux grammaires, et l'adaptateur nomme le composant par son fichier au lieu de `{id}` (PP-104). Les protocoles écrits entre outils partagent leurs constantes. Seule la recherche du rapport précédent diverge entre GitHub et GitLab (PP-109).

## Méthode

Les scripts sont rangés hors du dépôt, dans le dossier `audit-p27-zone1` du brouillon de session. Chacun importe les vraies fonctions des sources par `npx tsx`, sans copie, et rend une table Markdown. Les fiches citent leur sortie.

| Script | Ce qu'il appelle | Résultat |
|---|---|---|
| `noms.mts` | `normalizeName`, `codeIdentifier`, `tokenCssVariable`, `formeReconnue`, `nomCompacte`, `normalizePropKey`, `normalizePropValue` sur 46 entrées (accents, casse, chiffres, `0,5`, espaces, emoji, `/`, suffixe `#12:3`) ; préfixe de la préparation contre `estDuComposant` | 11 paires règle et propriété divergent ; 5 variables sur 8 hors du filtre de la préparation |
| `jumelles.mts` | `constatsDeRegles` contre `mergeBooleanDescriptions` ; `cheminsEnConflit` contre `nomsCssDesTokens` ; `configurationDepuisJson`, `cheminImplementation` et `nomInterfaceAttendue` sur 6 motifs ; sélection de la note précédente | 3 cibles sur 4 divergent ; 3 renommages validés, refusés par la feuille ; 4 motifs donnent une interface fausse |
| `palettes.mts` | `segmentsDesPalettes`, `joinTokenPath`, `tokenCssVariable`, `cheminsEnConflit` sur 5 paires de noms de palettes | 4 paires acceptées par Palettes, refusées par la feuille CSS |
| `controles.mts` | `controlerLIntegriteUcm` et `controlerLeCatalogue` sur la fixture `tokensDeLiens`, en noms Figma puis après `normalizeName` ; `collectionUcmReconnue` sur 10 noms de collection | même verdict sur 9 scénarios ; 2 noms de collection reconnus d'un seul côté |
| `valeurs.mts` | `catalogueDepuisTokens`, `comparerAuTokenPublie`, `feuilleDesTokens` sur 8 valeurs de `tokens.json` | 6 valeurs lues par un lecteur, refusées par un autre |
| `alias.mts` | `isTokenReference`, `cheminDeReference`, `ALIAS_ENTIER`, `REFERENCE_DANS_UN_TEXTE` et l'expression de `conventions.mjs` sur 7 chaînes | 5 chaînes sur 7 reçoivent deux réponses |

Un sous-agent `Explore` a relevé les protocoles écrits entre outils. Chaque ligne citée ici a été relue dans le code.

## Ce qui tient

| Règle ou protocole | Source unique | Lecteurs |
|---|---|---|
| Marqueurs du rapport | `MARQUEUR_RAPPORT` et `MARQUEUR_SANS_OBJET`, `packages/kit/src/lecteurs/controle-repository.mjs:212,222` | importés par `packages/cli/src/init.mjs:37` (workflow et filet GitHub) et `packages/cli/src/rapport-gitlab.mjs:21` |
| Préfixe des branches d'export | `prefixeDeBranche`, `packages/plugin-exporter/src/depot.ts:110-112` | `depot.ts:431-433` seulement ; aucun lecteur dans la CLI, le kit ou les workflows générés |
| Titre et corps de la demande de fusion | `depot.ts:239-246,571` | aucun lecteur ; le workflow lit seulement le numéro |
| Clés `com.ucm.*` de `tokens.json` | constantes de `packages/kit/src/format/tokens.ts` | loi D-29 de `reglesUniques` |
| Espaces des données partagées des plugins | `ESPACE_ARCHITECT`, `ESPACE_PARTAGE`, `CLES_PARTAGEES_DE_PALETTES`, `packages/kit/src/referentiel/produits.ts:10-22` | Architect et Palettes |
| Identifiant d'un contrat | `codeIdentifier`, `packages/kit/src/format/names.ts:16` | nom de fichier (`plugin-socle/src/composant/contract/publication.ts:55`), types générés (`adapter-typescript/src/generation.mjs:14`), graphe des contrats (`kit/src/lecteurs/validation-graphe-contrats.mjs:82`) ; l'Exporter refuse deux composants au même identifiant (`depot.ts:354-412`) |
| Chemin d'un token | `joinTokenPath`, `packages/kit/src/format/chemins-de-tokens.ts:45` | index de l'Exporter (`plugin-socle/src/composant/variables.ts:172`), résolveur des contrats (`variables.ts:366`), modèle des renommages (`kit/src/nommage/chemins-publies.ts:137`) |
| Axes de modes | `deciderAxesDesCollections`, `kit/src/format/axes-de-collections.ts:26` | Exporter (`exportTokens.ts:643`) et modèle des renommages (`chemins-publies.ts:113`) |
| Attribut HTML d'un mode | `attributDeMode`, `names.ts:90` | `cli/src/tokens-css.mjs:138` |
| Verdict du mode Tokens sur un fichier | `catalogueDepuisTokens`, `kit/src/controles/projection-dtcg.ts:106` | `controles.mts` : Architect et `ucm check` rendent les mêmes constats sur 9 scénarios de casse (collections, statuts, profils, modes, groupes) |

Le dictionnaire de `decouperSegment` recoupe les mots soudés (`colorbrands` donne `color-brands`). Les noms que l'export met en minuscules gardent donc leur forme reconnue dans la plupart des cas.

## Fiches

### PP-101 · Architect tient pour rattachée une règle que l'Exporter écarte

| | |
|---|---|
| Règle | une règle `@boolean` ou `@prop` vise une propriété du composant par le texte de son calque `prop` |
| Implémentations | Architect compare par `nomCompacte` (`packages/plugin-architect/src/regles.ts:176,182,212`, `packages/kit/src/referentiel/kit-de-regles.ts:74-76`) ; l'Exporter compare par égalité exacte des clés `normalizePropKey` (`packages/plugin-socle/src/composant/contract/rulesModel.ts:113,145,203`, `mergeBooleanDescriptions.ts:18`, `mergePropDescriptions.ts:72`) |
| Entrées qui divergent | propriété `Icon Left` (clé `iconLeft`) et cible `iconleft`, `ICONLEFT` ou `Icon_Left` ; `Show Label` et `show_label` ; `Leading Icon` et `leadingicon` ; 11 paires dans `noms.mts` |
| Preuve | `jumelles.mts`, section A. Cible `iconleft` : `constatsDeRegles` ne rend aucun constat, `mergeBooleanDescriptions` avertit « le composant n'a aucune propriété booléenne portant ce nom ». `nomCompacte` retire `_`, `-`, les espaces et la casse ; `normalizePropKey` garde `_` et ne crée une bosse qu'après un séparateur ou une majuscule |
| Cas | le designer écrit `iconleft` dans la règle. Architect affiche la règle comme posée. L'export avertit, et le contrat publie `iconLeft` sans description. L'agent du consommateur devine ce que fait la prop |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | une fonction `cleDeRegle(texte)` dans le socle, lue par `rulesModel.ts` et par `regles.ts` ; un test de parité qui passe chaque paire (propriété, cible) aux deux et exige un C45 d'Architect dès que l'Exporter avertit |

### PP-102 · La préparation d'Architect ne charge pas les variables du composant d'une autre casse

| | |
|---|---|
| Règle | une variable de `components` appartient au composant par son premier segment |
| Implémentations | `estDuComposant` compare les formes reconnues (`packages/kit/src/controles/nommage.ts:299-302`) ; la préparation en library garde `cheminComplet(...).startsWith(\`components/${formeReconnue(jeu)}/\`)`, chemin brut contre forme (`packages/plugin-architect/src/sandbox/preparation.ts:91-96`) ; les liaisons cherchent la variable publiée par égalité exacte du chemin (`packages/plugin-architect/src/preparations.ts:282`) ; la préparation écrit le segment par `formeReconnue` (`packages/kit/src/controles/preparation.ts:120,141`) |
| Entrées qui divergent | jeu `Button` et variable `Button/color/background` ; `Icon Button` et `IconButton/color/background` ; `Text Field` et `Text Field/color/border` ; `Badge` et `components/Badge/color/background` |
| Preuve | `noms.mts`, section 3. 5 variables sur 8 sont hors du filtre alors qu'`estDuComposant` les rend au composant |
| Cas | la library porte `Button/color/background`, écrit à la main. Architect, lancé dans le fichier des composants, ne charge pas cette variable au catalogue. La préparation propose de créer `button/color/background`, et la liaison ne trouve pas la variable publiée |
| Promesse | Robustesse |
| Gravité | important |
| Garde proposée | le filtre lit `estDuComposant(cheminDeLaVariable(...).join('/'), jeu)`, et `liaisonsDeLaPreparation` compare par `formeDuChemin` ; un test de la préparation avec une library dont les variables gardent la casse du designer |
| À vérifier en recette Figma | Figma refuse-t-il dans une collection un nom qui ne diffère que par la casse, comme `memeNomFigma` l'affirme (`plugin-palettes/src/variables/noms.ts:10`) ? La préparation échoue alors à l'écriture au lieu de créer un doublon |

### PP-103 · Le contrôle des renommages ignore les collisions de nom CSS

| | |
|---|---|
| Règle | ce qu'un nom de variable fait perdre à l'export |
| Implémentations | `cheminsEnConflit` et `pairesDejaEnConflit` modélisent les pertes de l'export avec 4 motifs, `meme-token`, `token-et-groupe`, `meme-axe`, `axe-et-extensions` (`packages/kit/src/nommage/chemins-publies.ts:27,84`) ; Nomenclature d'Architect (`plugin-architect/src/ecriture/noms.ts:166`) et le calcul de renommage (`kit/src/nommage/calcul.ts:69`) les lisent ; Palettes dédoublonne ses segments par `toLowerCase()` (`plugin-palettes/src/variables/noms.ts:45`). L'export signale aussi deux chemins au même nom CSS (`plugin-exporter/src/tokens/exportTokens.ts:801-833`), et `ucm tokens css` refuse alors toute la feuille (`cli/src/tokens-css.mjs:315-327`) |
| Entrées qui divergent | `button/background hover` renommé `button/bg hover` à côté de `button/bg/hover` ; `button/gap_2` à côté de `button/gap/2` ; `card/radius 0,5` à côté de `card/radius/0.5` ; palettes `Café` et `Cafe`, `Sky Blue` et `Sky_Blue`, `Été` et `Ete`, `Café` composé et décomposé |
| Preuve | `jumelles.mts`, section B, et `palettes.mts`. `cheminsEnConflit` rend « aucun conflit » sur les 7 cas ; les deux chemins de chaque cas donnent le même nom CSS (`--components-button-bg-hover`, `--primitives-color-cafe-light-500`) |
| Cas | le designer applique un renommage que Nomenclature a validé. L'export suivant avertit, et le développeur ne peut plus générer `tokens.css` tant qu'un des deux noms ne change pas |
| Promesse | Robustesse |
| Gravité | important |
| Garde proposée | un motif `meme-nom-css` dans `chemins-publies.ts`, calculé par `tokenCssVariable` ; `segmentsDesPalettes` dédoublonne par le nom CSS ; un test de parité qui exige qu'un renommage sans conflit donne un index accepté par `nomsCssDesTokens` |

### PP-104 · Le motif d'implémentation a deux grammaires, et l'adaptateur nomme le composant par son fichier

| | |
|---|---|
| Règle | le nom du composant que l'implémentation doit porter |
| Implémentations | le kit nomme le composant par `{id}`, le nom de base du contrat (`packages/kit/src/lecteurs/implementation.mjs:16-18`, `controle-repository.mjs:1414`) ; l'adaptateur le nomme par le nom de base du fichier d'implémentation (`packages/adapter-typescript/src/parite.mjs:17-19,313`). `ucm init` exige `{id}` dans le motif (`packages/cli/src/init.mjs:125`), la grammaire de `ucm.config.json` non (`packages/kit/src/format/configuration.ts:42,119-120`) |
| Entrées qui divergent | motif `{dir}/index.tsx` (grammaire accepte, `init` refuse, interface attendue `indexProps`) ; `{dir}/{id}/index.tsx` (`indexProps`) ; `{dir}/{id}.component.tsx` (`Button.componentProps`, qui n'est pas un identifiant) ; `{dir}/{id}.view.tsx` (`Button.viewProps`) |
| Preuve | `jumelles.mts`, section C. Pour le contrat `components/Button/Button.contract.json`, `{id}` vaut `Button` et les types générés s'appellent `ButtonVariantProps` sur les 6 motifs |
| Cas | un dépôt range ses composants en `Button/index.tsx` et l'écrit à la main dans `ucm.config.json`. `ucm check` accepte la configuration, puis rend « L'interface `indexProps` est absente » pour chaque composant. Le développeur ne peut pas nommer une interface ainsi pour tous ses composants |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | `champsInvalidesDeLaConfiguration` exige `{id}`, comme `init` ; `nomInterfaceAttendue` reçoit `{id}` du kit au lieu du fichier ; un test de parité sur les motifs `{dir}/{id}/index.tsx` et `{dir}/{id}.component.tsx` |

### PP-105 · L'Exporter ne prédit pas le nom CSS vide que la CLI refuse

| | |
|---|---|
| Règle | les feuilles que `ucm tokens css` refuse de déclarer |
| Implémentations | `constatsDeNomsCss` dit nommer ces feuilles et teste le préfixe réservé et les doublons (`packages/plugin-exporter/src/tokens/exportTokens.ts:796-833`) ; la CLI refuse en plus une feuille dont le nom CSS est vide (`packages/cli/src/tokens-css.mjs:316-318`) |
| Entrées qui divergent | variable `🙂` de la collection `✦` : chemin `✦.🙂`, nom CSS `--` |
| Preuve | `jumelles.mts`, fin de la section B |
| Cas | l'export ne dit rien ; la génération de la feuille échoue chez le développeur |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | une fonction `refusDesNomsCss(chemins)` dans `@ucm-kit/core/lecteurs/navigateur`, appelée par l'Exporter et par `tokens-css.mjs` |
| À vérifier en recette Figma | Figma accepte-t-il un nom de collection et de variable fait seulement de symboles ? |

### PP-106 · Le chemin d'un token garde la forme Unicode que la projection CSS efface

| | |
|---|---|
| Règle | deux écritures Unicode d'un même nom désignent-elles le même token ? |
| Implémentations | `tokenCssVariable` et `codeIdentifier` décomposent et retirent les accents (`packages/kit/src/format/names.ts:17-19,74-76`) ; `normalizeName`, qui donne le chemin publié, ne normalise pas la forme Unicode (`names.ts:5-12`) ; `formeReconnue` et `nomCompacte` non plus |
| Entrées qui divergent | `Café` composé (NFC) et `Café` décomposé (NFD) : deux chemins `primitives.color.café...` distincts, un seul nom CSS `--primitives-color-cafe-...` |
| Preuve | `noms.mts`, lignes `Café` ; `palettes.mts`, troisième ligne. Le commentaire de `tokenCssVariable` (`names.ts:45-49`) décrit ce défaut pour le nom CSS seulement |
| Cas | un agent écrit `{primitives.color.café.light.500}` au clavier, en NFC, alors que `tokens.json` porte la forme NFD copiée depuis macOS. `ucm tokens references` dit la référence absente, et les deux chemins s'affichent pareil |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | `normalizeName` applique `normalize('NFC')` ; un test exige `normalizeName(nfd) === normalizeName(nfc)` ; la montée se note dans `CHANGELOG-FORMAT.md`, puisque le chemin publié change |
| À vérifier en recette Figma | Figma garde-t-il un nom de variable collé en NFD tel quel ? |

### PP-107 · Trois grammaires lisent une valeur de `tokens.json`

| | |
|---|---|
| Règle | la forme d'une valeur `dimension` ou `color` |
| Implémentations | `couleurDepuis` et `litteral` de `packages/kit/src/controles/projection-dtcg.ts:71-104` (accepte un nombre, une chaîne lue par `parseFloat`, un hexadécimal de 3 à 8 chiffres, ignore `unit`) ; `packages/kit/src/lecteurs/comparaison-dtcg.mjs:41-75` (accepte `"16px"`, refuse `rem`) ; `litteral` de `packages/cli/src/tokens-css.mjs:64-76` (exige `{ value, unit: "px" }` et `alpha`, comme `docs/format/FORMAT.md:1613`) |
| Entrées qui divergent | `"16px"`, `"1rem"`, `16`, `{ "value": 1, "unit": "rem" }`, une couleur sans `alpha`, `"#ff0000"`, `"#f00"` |
| Preuve | `valeurs.mts` : `"1rem"` devient `1` pour la projection d'`ucm check`, « non comparable » pour la comparaison, et la feuille le refuse |
| Cas | un développeur corrige `tokens.json` à la main avec `"1rem"`. Le diagnostic d'architecture d'`ucm check` juge une taille de 1 px, et `ucm tokens css` refuse la feuille |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | un lecteur `valeurDuToken(type, valeur)` dans `@ucm-kit/core/format`, à côté de `valeurs-figma.ts`, strict selon `FORMAT.md` ; la projection marque `valeursSautees` pour toute autre forme |

### PP-108 · Cinq expressions reconnaissent un alias

| | |
|---|---|
| Règle | la syntaxe d'une référence `{chemin}` |
| Implémentations | `TOKEN_REFERENCE`, `packages/kit/src/format/references.ts:21` (point exigé) ; `cheminDeReference`, `packages/kit/src/lecteurs/tokens-dtcg.mjs:102-106` (sans point) ; `ALIAS_ENTIER`, `packages/kit/src/controles/projection-dtcg.ts:40` (espaces admis) ; `REFERENCE_DANS_UN_TEXTE`, `packages/cli/src/tokens-references.mjs:24` (sans `$` ni accent grave) ; `packages/cli/src/conventions.mjs:137` |
| Entrées qui divergent | `{a b.c}` et `{a.b }` (alias pour la seule projection) ; `{$a.b}`, ``{a.`b}`` et `{a.b$}` (référence de contrat, pas référence de code) |
| Preuve | `alias.mts` : 5 chaînes sur 7 reçoivent deux réponses. Le commentaire de `cheminDeReference` justifie l'écart de premier niveau (`{marque}`), pas les autres |
| Cas | un `tokens.json` retouché porte `{color.primary }`. La projection d'`ucm check` le suit, l'index du kit le prend pour une valeur littérale |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | `TOKEN_REFERENCE` et une variante de premier niveau exportées par `format/references.ts`, seules sources ; une ligne de `reglesUniques` refuse `/\{[^{}` hors de ce fichier |

### PP-109 · GitHub et GitLab retrouvent le rapport précédent par deux codes

| | |
|---|---|
| Règle | quel commentaire porte le rapport à remplacer, et quand ne rien créer |
| Implémentations | jq et shell du workflow GitHub, `packages/cli/src/init.mjs:567-571` (corps qui commence par le marqueur, dernière note, marqueur sans objet dans les 2 premières lignes, auteur par `login`) ; JavaScript de `packages/cli/src/rapport-gitlab.mjs:122-123,157-165` (marqueur n'importe où, première note, sans objet n'importe où, auteur par `id`) |
| Entrées qui divergent | 4 notes du même compte, dont deux rapports et une note qui cite le marqueur en fin de texte ; un rapport dont le marqueur sans objet est en ligne 4 |
| Preuve | `jumelles.mts`, section D : GitHub met à jour la note 14, GitLab la note 12, qui cite le marqueur sans être un rapport. Le second cas crée un commentaire sur GitHub et rien sur GitLab |
| Cas | deux pipelines concurrents ont créé deux rapports. GitLab réécrit le plus ancien, et le designer lit en bas de la demande un verdict périmé |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | une fonction `rapportPrecedent(notes, compte)` dans le kit, lue par `rapport-gitlab.mjs` et par une commande `ucm rapport-github` que le workflow appelle au lieu du jq |

### PP-110 · Le nom Figma d'un variant se reconstruit par trois copies

| | |
|---|---|
| Règle | `Axe=Valeur, Axe=Valeur` rebâti depuis `figmaVariantLabels` |
| Implémentations | `packages/plugin-socle/src/composant/contract/componentTree.ts:531-535` (contrôle de l'export) ; `nomFigmaDuVariant`, `packages/kit/src/lecteurs/variant-views.mjs:82-96` ; `nomFigmaDuVariant11`, `packages/kit/src/lecteurs/validation-contrat.mjs:1326-1339`, que rien n'appelle |
| Entrées qui divergent | aucune aujourd'hui ; les copies diffèrent sur une étiquette vide (`!== undefined` contre `estTexte`) |
| Preuve | grep : aucun test ne cite `nomFigmaDuVariant` |
| Cas | le séparateur change dans le socle. L'export garde la table, le kit rebâtit un autre nom, et `validation-contrat.mjs:1133` l'accepte puisqu'il teste seulement un texte non vide |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | `nomFigmaReconstruit(axes, etiquettes, valeurs)` dans `@ucm-kit/core/format`, appelé par le socle et le lecteur ; `nomFigmaDuVariant11` retiré |

### PP-111 · La projection inverse de `tokens.json` perd les frontières de casse

| | |
|---|---|
| Règle | le nom qu'un contrôle du mode Tokens compare, dans Figma et dans `ucm check` |
| Implémentations | Architect lit les noms Figma ; `ucm check` lit les chemins que `normalizeName` a mis en minuscules, rebâtis par `catalogueDepuisTokens` (`packages/kit/src/controles/projection-dtcg.ts:147`, `packages/kit/src/lecteurs/diagnostic-architecture.mjs:105`) |
| Entrées qui divergent | segments `onSolid`, `textOnSolid`, `BgSurface`, `primaryStrong`, `cornerRadiusXl`, `bgCanvasAlt` (forme `on-solid` dans Figma, `onsolid` après l'export) ; collections `layOuts` et `TypoGraphy`, reconnues par `ucm check` et pas par Architect |
| Preuve | `noms.mts`, section 4, et `controles.mts`. Les 9 scénarios de la fixture rendent le même verdict, car les noms du référentiel sont dans le dictionnaire |
| Cas | une collection nommée `TypoGraphy` reçoit un diagnostic d'architecture dans le rapport de la demande, et aucun dans Architect |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | le scénario de `controles.mts` devient un test du kit, qui exige les mêmes constats avant et après la projection sur une liste de renommages |

### PP-112 · Le thème des plugins a deux règles

| | |
|---|---|
| Règle | thème clair ou sombre de l'interface d'un plugin |
| Implémentations | Architect force le sombre (`packages/plugin-architect/src/code.ts:28`, `themeColors: false` ; `src/ui/styles/commun.css:13-15`) ; Palettes et l'Exporter suivent le thème de Figma (`plugin-palettes/src/code.ts:36` et `plugin-exporter/src/code.ts:83`, `themeColors: true` ; `plugin-socle/src/ui/socle.css:115`) |
| Copies | `#5e5e5e` (`--bordure` sombre du socle, `--laterale-bordure` d'Architect), `#666666` (`--bordure-visee`, `--laterale-bordure-visee`), `#ffffff` (5 rôles), entre `plugin-socle/src/ui/socle.css`, `langage.css` et `plugin-architect/src/ui/roles.css` |
| Preuve | aucun document du dépôt n'écrit la règle du thème (grep de « toujours sombre » et « thème sombre » dans `CONTRIBUTING.md`, les guides et les invariants) |
| Cas | un agent ajoute un écran à Palettes et doit deviner s'il le dessine en clair, en sombre ou dans les deux |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | la règle écrite dans `CONTRIBUTING.md`, section « Interface du plugin », et un test qui compare `themeColors` des trois `code.ts` à cette règle |

## Compléments aux fiches du premier audit

- PP-10. Le nom de l'artefact `ucm-rapport` (`init.mjs:522,536`), les noms de job `contrats` (`init.mjs:458,527`) et `ucm` (`init.mjs:617,653`), et la variable `UCM_GITLAB_TOKEN` (`init.mjs:612,631`, `rapport-gitlab.mjs:103`) s'écrivent aussi en littéral, sans constante. Les tests les recopient (`cli.test.mjs`, `gitlab.test.mjs:78`, `recette.test.mjs:461`).
- PP-11. La lecture de `.ucm/derogations.json` existe deux fois, à l'identique, dans `kit/src/lecteurs/controle-du-code.mjs:587-596` et `controle-repository.mjs:1190-1200`. Le lecteur `lireJsonDuDepot` proposé par PP-11 les remplace.

## Questions au mainteneur

- PP-101, règle et propriété. Options : (a) Architect compare les clés exactes et rend un C45 « règle renommée » quand seule la casse ou `_` diffère ; (b) l'Exporter rattache par `nomCompacte`. Recommandation : (a), la clé publiée reste l'autorité et la correction existe déjà.
- PP-102, filtre de la préparation. Options : (a) le filtre et les liaisons lisent `estDuComposant` et `formeDuChemin` ; (b) Architect renomme d'abord les variables du composant vers la forme reconnue. Recommandation : (a), sans geste de plus pour le designer.
- PP-103, collisions CSS. Options : (a) `chemins-publies.ts` ajoute le motif `meme-nom-css`, et Palettes dédoublonne par le nom CSS ; (b) l'avertissement de l'export suffit. Recommandation : (a), la feuille entière tombe sinon.
- PP-104, motif d'implémentation. Options : (a) la grammaire exige `{id}` et l'adaptateur nomme le composant par `{id}` ; (b) la grammaire exige un motif qui finit par `{id}.<extension>`. Recommandation : (a), qui admet `{dir}/{id}/index.tsx`.
- PP-106, forme Unicode. Options : (a) `normalizeName` passe en forme composée (`NFC`), avec une entrée de `CHANGELOG-FORMAT.md` ; (b) le chemin garde la forme reçue. Recommandation : (a), le chemin et le nom CSS suivent alors la même règle.
- PP-107, valeurs de `tokens.json`. Options : (a) un lecteur strict dans le kit pour les trois usages ; (b) chaque lecteur garde sa tolérance. Recommandation : (a), la forme publiée est celle de `FORMAT.md`.
- PP-109, rapport précédent. Options : (a) une commande `ucm rapport-github` partage la sélection avec GitLab ; (b) le jq s'aligne à la main sur le JavaScript. Recommandation : (a), une seule implémentation testable.
- PP-112, thème des plugins. Options : (a) les trois plugins sont toujours sombres ; (b) seul Architect l'est, et la règle l'écrit. Recommandation : décider la règle d'abord ; la mémoire de session dit (a), le code fait (b).

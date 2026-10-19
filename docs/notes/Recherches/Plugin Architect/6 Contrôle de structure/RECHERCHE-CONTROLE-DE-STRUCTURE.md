# Contrôle de la structure des tokens

Ce dossier étudie comment UCM pourrait vérifier la structure des tokens d'un
fichier et signaler les erreurs simples qu'un designer ne voit pas. Il ne
tranche rien : les décisions attendues sont listées à la fin.

## Le besoin

L'analyse d'un export de tokens du mainteneur, comparé à l'export précédent
(`docs/notes/Recherches/Archi Tokens Multi-marques/donnees-vue-illustree.js`),
a trouvé des erreurs qu'aucun outil d'UCM ne signale. Elles servent de cas de
test à tout ce qui suit.

| Cas | Ce que le fichier contient | Pourquoi c'est une erreur |
|---|---|---|
| (a) Mode visant la mauvaise branche | En mode Dark, `theme/success/{vivid,soft}/ring` et `theme/info/{vivid,soft}/ring` pointent vers `…/light/700` | Toutes les autres variables du thème pointent en Dark vers `…/dark/…`, dont `warning` et `danger` pour le même rôle |
| (b) Valeur vide parmi des sœurs renseignées | `button/color/primary/contained/focus/ring` vaut `null` | Les sœurs `secondary`, `info`, `success`… ont une valeur ; ce token en avait une avant |
| (c) Doublon dans une échelle | `layouts/sizing/2` vaut 6 px, comme `sizing/1,5` | Une échelle de dimensions croît d'un cran à l'autre |
| (d) Cran recopié d'une autre rampe | `deep/dark/100` est identique à `deep/light/950`, plus saturé que `dark/200` | Le cran sort de la progression de sa rampe |
| (e) Cran saturé au blanc | `sun/soft/light/50` et `sun/vivid/light/50` valent #FFFFFF | Le cran se confond avec `titanium/white` |
| (f) Composant qui contourne le thème | Les boutons `secondary`, `info`, `success`… pointent vers `…/light/…` des palettes | Le bouton `primary` passe par `theme` ; les autres ne changent pas en sombre |
| (g) Tokens disparus | 24 tokens d'Alert absents du second export | Rien ne signale une disparition entre deux exports |

## Ce que le marché propose

Aucun outil trouvé ne détecte un mode qui vise la branche d'un autre mode, ni
une variable qui diffère de ses sœurs. Les linters couvrent la structure
générique, les outils de Figma couvrent les calques.

| Outil | Contrôles | Où |
|---|---|---|
| [Terrazzo `lint`](https://terrazzo.app/docs/linting/) | formats par type, nommage, doublons de valeur (alias exclus), `required-modes` (présence d'un mode), `required-children` (rampe complète), contraste sur paires déclarées, gamut | CLI et CI ; règles `error`, `warn`, `off`, motifs `match` et `ignore` ; règles personnalisées sur le modèle d'ESLint ([API](https://terrazzo.app/docs/reference/plugin-api/)) |
| [Format DTCG](https://www.designtokens.org/tr/2025.10/format/) | un outil doit signaler syntaxe invalide, chemin introuvable, cible qui n'est pas un token, cycle, type incompatible (§7.4.5) | norme |
| [design-token-kit](https://github.com/design-token-kit/design-token-kit) | références non résolues, cycles, cible de groupe, types ; `layer-reference` (primitive → sémantique → composant), `raw-value-usage`, `empty-group` | CLI, codes de sortie 0, 1, 2 |
| [Style Dictionary](https://styledictionary.com/reference/logging/) | collisions de valeur et de nom, références cassées | build |
| [Tokens Studio, Inspect](https://docs.tokens.studio/debug/inspect-tokens) | références cassées sur la sélection | Figma |
| [Figma, Check designs](https://help.figma.com/hc/en-us/articles/39592284074263-Check-designs-in-Figma) | valeurs en dur, mauvaise bibliothèque, contraste, sur les calques | Figma, offres Organization et Enterprise |
| [figma-token-audit](https://github.com/figma/community-resources/issues/86) | 48 contrôles, dont noms de modes cohérents entre collections et composants qui visent des primitives ; confiance haute, moyenne ou basse ; problème, impact et correction par constat | compétence d'agent, soumission refusée |

Les seules vérifications de modes trouvées sont des scripts propres à une
équipe : [figma-parity](https://github.com/tishsingh399/clementine-ds/pull/129)
résout les alias en Light et en Dark et compare au code attendu, et un
[linter jamais livré](https://github.com/NextAge-Consulting/nextage-dev-kit/issues/34)
devait signaler un token redéfini en Dark mais laissé Light dans une variante.
`required-modes` de Terrazzo vérifie qu'un mode existe, pas la branche qu'il
vise. Aucun outil ne compare deux exports de tokens.

## Ce qu'UCM a déjà

| Outil | Ce qu'il contrôle |
|---|---|
| `ucm check` | les variables manquantes d'un contrat ; le reste est informatif |
| Lecteurs du kit (`packages/kit/src/lecteurs/`) | présence d'un chemin dans `tokens.json`, axes de modes (`modes-tokens.mjs`), contraste d'une couleur de contrat contre son fond dans chaque combinaison de modes (`diagnostic-contrastes.mjs`), tokens d'un contrat absents de la source |
| UCM Nomenclature | l'écriture des noms et le vocabulaire ; il lit déjà, pour chaque variable, l'alias qu'elle vise (`cibleAlias`) |
| UCM Palettes | la qualité de ses rampes : monotonie, écarts, contraste |
| Plan du [diff sémantique](../../Diff%20Sémantique/PLAN-DIFF-SEMANTIQUE.md) | comparer deux ensembles de contrats et de tokens : proposé, non construit |

Le cas (g) relève du diff sémantique. Les cas (d) et (e) touchent des rampes
qu'UCM Palettes mesure déjà quand il les a écrites ; une rampe reprise ou
saisie à la main n'est mesurée par personne.

## Deux façons de trouver une erreur

### Des règles écrites

Une règle dit ce qui doit être vrai : « en mode Dark, la cible contient le
segment `dark` ». C'est la méthode de Terrazzo et de design-token-kit. Elle est
précise mais suppose une architecture connue. Elle convient au périmètre
« full UCM », où la structure est décrite par le référentiel.

### Des régularités apprises du fichier

Le fichier lui-même donne la norme : la majorité des variables sœurs. Les
travaux sur les configurations de réseau en sont les plus proches.

- [SelfStarter](https://www.usenix.org/conference/nsdi20/presentation/kakarla)
  infère des modèles à paramètres : une différence à l'intérieur d'un modèle
  est voulue, une différence entre modèles est une erreur probable.
- [Maverick](https://arxiv.org/abs/2101.09365) mesure l'écart d'une
  configuration au groupe censé faire la même chose et classe les écarts par
  gravité : environ 75 % d'exactitude sans réglage, 94 à 100 % après quelques
  minutes de réglage par un administrateur.

Deux outils d'analyse de code donnent les garde-fous contre les faux positifs.

- [Naturalize](https://ar5iv.labs.arxiv.org/html/1402.4182) apprend les
  conventions d'un dépôt, ne propose rien sans consensus, et règle son seuil
  sur un taux de faux positifs maximal.
- [Daikon](https://plse.cs.washington.edu/daikon/download/doc/daikon.html)
  ne garde qu'une régularité jamais contredite et assez observée : avec 3
  échantillons la confiance est trop basse, avec 9 elle suffit.

Un état de l'art des détecteurs à règles apprises
([Ciri](https://arxiv.org/html/2310.09690v2)) rappelle leur limite : une petite
équipe a souvent trop peu de données pour apprendre. Un fichier de tokens est
dans ce cas pour les groupes de deux ou trois sœurs.

Cette méthode est agnostique : elle ne suppose aucun nom de collection.

## Ce que chaque méthode trouverait

| Cas | Méthode | Comment | Risque de faux positif |
|---|---|---|---|
| (a) | apprise, puis écrite en full UCM | grouper les variables du thème par motif (`theme/*/*/ring`) ; en Dark, la majorité vise un chemin qui contient `dark` ; signaler les 4 sur 28 qui visent `light`. Règle écrite : le segment du mode apparaît dans la cible | faible : le segment de mode est explicite |
| (b) | apprise | une valeur vide quand la majorité des sœurs est renseignée | moyen : un token réservé peut rester vide |
| (c) | écrite, agnostique | dans un groupe dont les noms sont des nombres, valeurs strictement croissantes | faible |
| (d) | écrite | rampe : clarté OKLCH monotone d'un cran à l'autre ([Oklab](https://bottosson.github.io/posts/oklab/)) ; un cran égal à un cran d'une autre rampe | moyen : les extrémités d'une rampe s'écartent parfois |
| (e) | écrite | un cran d'une rampe égal à `#FFFFFF` ou `#000000` | faible |
| (f) | apprise, puis écrite en full UCM | les sœurs d'un composant passent par une couche, celui-ci non ; règle écrite : un composant ne vise pas une primitive à segment de mode | moyen : un composant volontairement fixe |
| (g) | diff | ensemble des chemins entre deux exports | nul sur le constat, la disparition peut être voulue |

## Présenter un constat à un designer

Les sources s'accordent sur quatre principes.

- **Chiffrer l'écart** : « 4 variables sur 28 visent la palette claire en mode
  Dark ». Le nombre de sœurs montre la force de la norme.
- **Se taire sans consensus** : pas de constat sous un nombre minimal de sœurs
  ni sous un seuil de majorité. Les valeurs de départ (4 sœurs, 80 %) restent à
  mesurer sur des fichiers réels.
- **Proposer la correction** : la cible attendue (`…/dark/700`), applicable en
  un geste.
- **Accepter l'exception** : marquer un écart comme voulu, rangé dans le
  fichier comme les règles d'UCM Nomenclature, pour qu'il ne revienne pas.

Comme le diagnostic des contrastes d'`ucm check` (sévérité `info`, décrit
dans [AGENTS.md](../../../../../AGENTS.md)), un constat de ce type resterait
informatif : il ne bloquerait jamais une fusion.

## Où l'intégrer

| Option | Pour | Contre |
|---|---|---|
| Fonction pure du kit, lancée par `ucm check` sur `tokens.json` | un seul calcul ; tourne en CI ; agnostique | le designer le voit après l'export |
| Onglet « Contrôles » d'UCM Nomenclature | le plugin lit déjà tout l'inventaire et les alias ; la correction s'applique dans Figma ; il range déjà des exceptions dans le fichier | le plugin s'élargit au-delà des noms |
| Nouveau plugin | périmètre net | un plugin de plus à ouvrir |

La forme la plus économe est une fonction du kit sur un inventaire (chemins,
valeurs et alias par mode), appelée par `ucm check` et par un plugin. Le
format de `tokens.json` donne déjà les alias par mode
(`$extensions["com.ucm.modes"]`) ; UCM Nomenclature lit la même information
dans Figma.

## Ce qui reste à essayer

1. Lancer le motif majoritaire sur l'export réel du mainteneur et sur un
   second fichier, puis compter ce qu'il trouve parmi (a) à (f) et ses faux
   positifs.
2. Mesurer la clarté OKLCH des rampes réelles pour fixer le seuil de
   monotonie sans signaler une rampe saine.
3. Tester avec un designer débutant le libellé d'un constat et le geste de
   correction.
4. Vérifier dans Figma qu'un alias entre deux collections à modes homonymes
   ne suit pas le mode : sinon le cas (a) aurait une autre cause.

## Les décisions attendues

1. **Périmètre** : contrôles agnostiques seulement, ou aussi des règles du
   périmètre « full UCM » ?
2. **Lieu** : `ucm check`, un onglet d'UCM Nomenclature, les deux, ou un
   nouveau plugin ?
3. **Correction** : le plugin propose-t-il de corriger en un geste, ou
   seulement de signaler ?
4. **Diff entre exports** (cas g) : le rattacher au plan du diff sémantique, ou
   à ce contrôle ?

# Décision sur l'API publique du kit

Ce document tranche la piste P3 de [pistes.json](./pistes.json) pour le
mainteneur. La partie 1 se lit seule. Les parties 2 et 3 donnent les preuves et
le travail à faire.

## 1. En une page, pour le mainteneur

### Le problème

Le kit (`@ucm-kit/core`) est la boîte à outils que les autres outils UCM
appellent pour lire un contrat, nommer un token ou rendre un verdict. Il met à
disposition 433 noms, qui sont des fonctions, des tables et des constantes. Son
historique Git compte 143 numéros successifs, de 0.1.0 à 0.16.0, parce qu'il
change à chaque retouche du référentiel.

Une image aide à voir le risque. Dans une maison, les appareils se branchent
sur des prises. Tant qu'une prise garde sa forme, l'électricien refait les fils
derrière le mur sans qu'aucun appareil ne le remarque. Le kit n'a pas de mur
aujourd'hui. Un appareil peut se brancher sur n'importe lequel des 433 fils, et
rien ne dit lesquels l'électricien a le droit de déplacer.

Hors des plugins du dépôt, les seuls appareils branchés sont la CLI et
l'adaptateur TypeScript. Ils vivent dans le même dépôt que le kit, et les agents du
mainteneur les recâblent dans le même commit. Les modules des développeurs
(linter, Storybook, vérificateur de rendu, intégration des contrats) seront
écrits par d'autres. Un fil déplacé les casserait sans prévenir.

### Pourquoi le sujet compte pour UCM

UCM promet la robustesse et la confiance ([CONCEPT.md](../../../../CONCEPT.md),
section 6). Un linter qui lirait un contrat autrement qu'`ucm check` rendrait
deux verdicts sur le même code. Cette divergence est le problème qu'UCM existe
pour supprimer (CONCEPT.md, section 1).

Le référentiel doit aussi continuer d'évoluer. Une promesse trop large le
figerait.

UCM a déjà résolu ce problème entre Figma et le code. Le contrat est la prise,
et Figma peut changer derrière lui. Les décisions ci-dessous appliquent la même
idée au kit.

### Les décisions

1. **Une seule prise.** Un module importe le kit par un seul point d'entrée,
   `@ucm-kit/core/modules`. Un point d'entrée est une porte du paquet, désignée
   par un chemin d'import. Les huit portes actuelles restent réservées au
   toolkit (CLI, adaptateur, plugins) et changent librement.
2. **Une petite prise.** Elle ouvre avec 7 fonctions et le type du contrat. Ces
   noms servent à lire les mêmes contrats et les mêmes tokens qu'`ucm check`.
   Un module ajoute ce qu'il appelle au moment de sa conception, avec l'accord du
   mainteneur.
3. **Le jugement reste dans le kit.** Un module ne recopie aucune règle UCM. La
   technologie (ESLint, Storybook, Playwright) reste dans le module. Aucun nom
   du référentiel n'entre dans la prise. Un module qui en aurait besoin révèle
   un trou du contrat.
4. **Un seul kit par repository.** Un module épingle la version exacte du kit
   que la CLI du repository épingle. Épingler veut dire écrire un numéro précis,
   sans accepter le suivant. `ucm guide` signale un écart.
5. **Le sens des numéros.** Le kit reste en 0.x. Le chiffre du milieu (0.16
   vers 0.17) monte quand la prise casse ou que le format change. Tout le reste
   monte le dernier chiffre. Le kit passe en 1.0 quand deux modules utilisent la
   prise et qu'elle a tenu trois mois sans rupture.
6. **Un journal et un préavis.** `packages/kit/CHANGELOG.md` note chaque
   changement de la prise. Un nom à retirer est annoncé dans une version, puis
   retiré dans une version suivante. Un test refuse une prise modifiée sans
   entrée au journal.

### Ce qui change pour le mainteneur

Les retouches du référentiel montent le dernier chiffre, sans geste de sa part.
Un changement de la prise arrête le test, qui demande une entrée de journal.
Cette entrée, écrite en mots simples, est la décision à prendre avec les
développeurs.

### Ce qui change pour les développeurs

Ils ont un seul chemin d'import, 8 noms à l'ouverture (7 fonctions et le type
du contrat), un journal à lire avant
une montée de version et un préavis avant tout retrait. Pour un nom qui manque,
ils le demandent au mainteneur. Ils ne vont pas le chercher dans une porte
interne.

## 2. Les décisions, une par question

### Les faits relevés

| Fait | Source |
|---|---|
| `@ucm-kit/core` 0.16.0 a 8 points d'entrée de code dans `exports`, plus `./schema` et `./package.json` | `packages/kit/package.json` |
| Ces 8 points exportent 433 noms de valeurs uniques, 529 en comptant les republications de `lecteurs/navigateur`, et `./referentiel` en porte 207 | import de chaque point, script de relevé |
| La CLI 0.1.151 et l'adaptateur 0.2.9 épinglent `@ucm-kit/core` à `0.16.0` | leurs `package.json` |
| La CLI et l'adaptateur importent 41 valeurs (15 de `format`, 24 de `lecteurs`, 2 de `referentiel`) et le type `AdaptateurDImplementation` | relevé de `packages/cli/src/` et `packages/adapter-typescript/src/` |
| `ucm init` écrit le chemin `./node_modules/@ucm-kit/core/schema/ucm-contract.schema.json` dans le `.vscode/settings.json` du consommateur | `packages/cli/src/init.mjs` |
| Les 6 paquets privés (trois plugins, socle, hub, couleur) dépendent du kit en `*` et importent 348 couples distincts de point d'entrée et de nom | relevé de leurs `src/` |
| Aucun code d'UCM-Playground ni d'intencial-library n'importe le kit ; les deux le citent seulement dans `.vscode/settings.json` | recherche dans les deux dépôts |
| Le workflow d'intencial-library lance `@ucm-kit/cli@0.1.48`, 103 versions derrière la 0.1.151 | `.github/workflows/ucm.yml` de la bibliothèque |
| Les README du kit, de la CLI et de l'adaptateur disent « 0.x, the public surface is not frozen. Pin an exact version » | leurs `README.md` |
| `tests/versionSuitLeContenu.test.mjs` exige un nouveau numéro quand un fichier publié change, sans dire lequel des trois chiffres | le test |
| Aucun `CHANGELOG.md` n'existe sous `packages/` ; le registre des documents accepte `packages/*/CHANGELOG.md` | `.agents/domiciles.json` |
| Le `npm test` de la racine construit le kit, puis lance les tests de chaque paquet contre ce kit | `package.json` racine |
| La CLI ne découvre qu'un adaptateur, `@ucm-kit/adapter-typescript`, et vérifie ses trois fonctions | `packages/cli/src/adaptateur.mjs` |
| `ucm guide` compare déjà les numéros de `@ucm-kit/cli` entre les relais, le workflow et `package.json` | `packages/cli/src/guide.mjs` |

Le relevé de P3 annonçait 23 noms de `lecteurs`. Le relevé de ce document en
trouve 24.

### Les critères

| Code | Critère | Origine |
|---|---|---|
| R | Robustesse et confiance. Un écart se voit avant la fusion, et un module rend le même verdict qu'`ucm check` | CONCEPT.md, section 6 |
| P | Un propriétaire par information. Aucune règle UCM n'est recopiée hors du kit | CONCEPT.md, section 3 ; `packages/kit/invariants/referentiel.md` |
| M | Coût pour le mainteneur, seul responsable du cœur, à mi-temps, sans compétence de développeur | règle `coeur-un-seul-mainteneur` de [decisions.json](./decisions.json) |
| S | Casse silencieuse. Un module ne casse jamais sans un avertissement lisible avant la montée | situation des modules |
| L | Liberté du référentiel. Il change souvent, 143 numéros le montrent | `packages/kit/invariants/referentiel.md` |
| D | Simplicité pour un nouveau développeur et son agent de code, qui importe ce qu'il trouve | situation des développeurs |

Chaque case dit « bon », « moyen » ou « faible », avec sa raison.

### Question préalable. Qui a besoin d'une promesse ?

Le kit a trois cercles de consommateurs, et ils ne courent pas le même risque.

- **Les paquets privés du dépôt.** Les trois plugins, le socle, le hub et
  `couleur` se construisent avec le kit du dépôt et ne sont jamais publiés.
  Une rupture casse leur build ou leurs tests dans le même commit.
- **Le train du toolkit.** La CLI et l'adaptateur sont publiés, mais épinglés à
  l'exact, testés par le `npm test` de la racine contre le kit du dépôt, et
  publiés après lui (skill `publier-paquets`). Une rupture se corrige dans le
  même commit. Leurs 41 noms n'ont besoin d'aucune promesse.
- **Le code des développeurs et des consommateurs.** Les modules, et le chemin du schéma
  que les réglages d'éditeur du consommateur citent. Ce code suit son propre
  rythme et ne passe pas par les tests du toolkit.

La promesse vise le troisième cercle seulement. Un module rangé dans le monorepo
compte aussi dans ce cercle. Il est écrit par un autre que le mainteneur, il
peut sortir du dépôt (transverse T6 de decisions.json), et le mainteneur ne veut
pas que ses agents le réécrivent à chaque retouche du kit.

### Question 2. Comment un module reçoit-il le kit ?

Cette question vient avant la première, parce que la forme de la prise décide de
ce qu'on peut y promettre.

| Option | R | P | M | S | L | D |
|---|---|---|---|---|---|---|
| A. Import libre de toute porte, version exacte (statu quo) | moyen, le numéro protège jusqu'à la montée | bon, le module appelle le kit | faible, le mainteneur ne sait pas qui casse | faible, une montée casse sans journal | faible, chaque nom peut être lu ailleurs | faible, 433 noms et aucun repère |
| B. Liste de noms promis dans les portes actuelles (proposition initiale de P3) | moyen, la liste vit à côté du code | bon | moyen, une liste et des portes à tenir d'accord | moyen, un test garde la liste | moyen, les noms promis sont mêlés aux internes de trois portes | moyen, l'agent voit 65 noms dans `lecteurs` sans savoir lesquels sont promis |
| C. Une porte réservée aux modules, version exacte | bon, mêmes fonctions qu'`ucm check` | bon | bon, seul un changement de la porte demande une décision | bon, test et journal sur la porte | bon, les 426 autres noms restent libres | bon, un chemin et une poignée de noms |
| D. Aucun import, contrats et tokens seulement | faible, chaque module refait la résolution d'une combinaison | faible, la règle existe en plusieurs exemplaires | bon | moyen, le format est versionné mais pas son interprétation | bon | moyen, chaque agent réinvente une lecture |
| E. Passer par la CLI seulement | bon, un seul verdict | bon | moyen, chaque besoin devient une commande à maintenir | moyen, la sortie de la CLI devient une seconde promesse | bon | moyen, impossible pour un linter d'éditeur |
| F. Modules dans le train, import libre comme la CLI | bon, tests communs | bon | faible, chaque retouche oblige à réécrire le code des développeurs | bon | faible, tout nom importé est figé de fait | moyen |

**L'option C est retenue.** Elle est la seule sans case faible. Le module importe
seulement de `@ucm-kit/core/modules`, qui republie les noms promis sous leur nom
d'origine. Les huit portes actuelles deviennent internes au toolkit.

Les autres options perdent pour ces raisons.

- **A** laisse la question ouverte. Un agent de développeur importe le premier
  nom qui répond, et ce nom devient promis sans que personne l'ait décidé.
- **B** demande de lire une liste pour savoir ce qu'une porte a le droit de
  servir. Une porte dédiée rend la même règle visible dans le chemin d'import, et
  un agent la respecte sans lire de document.
- **D** contredit le kit lui-même. La déclaration de `vueExacteDuVariant` dit
  « sans cette résolution, lire un variant demande de connaître les catalogues,
  et chaque consommateur les relirait à sa façon ». Un module sans kit
  recopierait la fenêtre de lecture et la résolution des vues, et une classe 2 de
  [COMPATIBILITE.md](../../../format/COMPATIBILITE.md) le ferait diverger en
  silence.
- **E** convient à un module qui tourne seulement en CI, mais un linter ESLint
  appelle le kit dans l'éditeur, fichier par fichier. Elle ajouterait aussi la
  sortie de la CLI comme seconde surface à versionner.
- **F** fait payer au mainteneur chaque retouche du référentiel en code des
  développeurs. Elle ne tient plus si les modules quittent le monorepo.

L'option C tient dans les deux répartitions de T6. Dans le monorepo, un test de
la racine refuse qu'un module importe une autre porte. Hors du monorepo, une
règle `no-restricted-imports` d'ESLint, que le guide P4 donnera, fait le même
travail dans le dépôt du module. Le plan de conformité du rendu
([PLAN-CONFORMITE-RENDU.md](../Linter%20Dev/PLAN-CONFORMITE-RENDU.md), bloc G)
pose la même condition : « garder la séparation entre le cœur, qui ne dépend
d'aucune technologie, et la couche d'affichage. Si cette séparation n'est pas
posée au départ, l'extraction devient une réécriture. »

Le partage du travail suit. Le kit porte le jugement. Il lit le contrat, résout
une combinaison, et portera le cœur des règles du linter (P6) et le comparateur
(P10). Le module porte la technologie, c'est-à-dire le plugin ESLint, le montage
Storybook ou l'observation Playwright. Un module peut lire un champ du contrat directement,
puisque [FORMAT.md](../../../format/FORMAT.md) et `contractVersion` le
garantissent. Il ne refait jamais un calcul que le kit fait.

#### La version que le module épingle

| Option | R | M | S | D |
|---|---|---|---|---|
| Version exacte choisie par le module | faible, la CLI lancée par `npx` et le module peuvent porter deux kits | bon | moyen | bon |
| Version exacte égale à celle de la CLI du repository, écart signalé par `ucm guide` | bon, un seul kit juge le repository | bon, `guide.mjs` compare déjà des numéros | bon, l'écart se lit avant la fusion | bon, une règle à retenir |
| Plage `^0.16.0` | moyen, une installation peut tirer une version jamais essayée | bon | moyen | moyen |
| Dépendance pair (`peerDependencies`) | moyen, elle unifie le dépôt mais pas la CLI lancée par `npx` | moyen, l'adaptateur change aussi | bon | faible, notion de plus pour le développeur |

**La version exacte égale à celle de la CLI est retenue.** Deux kits dans un même
repository peuvent juger le même contrat différemment, par exemple sur la
fenêtre de lecture des versions de contrat. La règle actuelle des README, qui
épinglent à l'exact, reste la même.

#### Ce qui ferait changer d'avis

- Un module doit tourner dans un navigateur (un addon de Storybook côté
  interface). Il faut alors une jumelle `@ucm-kit/core/modules/navigateur`,
  comme `lecteurs/navigateur`.
- Les développeurs écrivent un second adaptateur de pile. Le type
  `AdaptateurDImplementation` et la découverte de `packages/cli/src/adaptateur.mjs`
  entrent alors dans la promesse.
- `ucm guide` signale deux kits à chaque montée dans le dépôt des modules. Il
  faut alors passer à la dépendance pair.

### Question 1. Que contient la liste des noms promis ?

| Option | R | P | M | S | L | D |
|---|---|---|---|---|---|---|
| 1a. Les 41 noms de la CLI et de l'adaptateur | moyen | bon | moyen, 41 noms à couvrir d'exemples | moyen, un module aura besoin d'autres noms | faible, fige des noms internes à la CLI | moyen, la moitié sert au rapport de la CLI |
| 1b. Les 41 et ce que les modules auront besoin, estimé d'avance | moyen | bon | faible, promettre des conceptions non écrites | moyen | faible | moyen |
| 1c. Les 433 noms | bon | bon | faible | bon | faible, le référentiel est gelé | faible |
| 1d. La lecture commune, puis ce que chaque module apporte à sa conception | bon | bon | bon, 8 noms à l'ouverture | bon | bon | bon |

**L'option 1d est retenue.** La prise ouvre avec ce qu'il faut pour lire les
mêmes entrées qu'`ucm check` et refuser ce qu'il refuse. Ce besoin vient du
critère P et pas d'une supposition. Un module qui trouverait d'autres contrats
ou nommerait autrement un token rendrait un autre verdict. Les 7 fonctions sont
déjà appelées par la CLI pour le même usage.

| Nom | Porte d'origine | Ce qu'il répond | Appelé aujourd'hui par | Module qui en a besoin |
|---|---|---|---|---|
| `lireConfiguration` | `lecteurs` | où sont les contrats, les tokens et le code d'après `ucm.config.json` | CLI (5 fichiers), adaptateur | tous ; P9 y lira `figmaFileKey` |
| `trouverContrats` | `lecteurs` | quels contrats existent | `contrats.mjs`, adaptateur | tous ; P9 fait une story par contrat |
| `verdictDeVersion` | `lecteurs` | si ce kit sait lire ce contrat | `guide.mjs` | tous |
| `vueExacteDuVariant` | `lecteurs` | ce que dit une combinaison de variantes | `guide.mjs` | P9, P10 |
| `indexerTokensDtcg` | `lecteurs` | quels tokens existent | `tokens-css.mjs` | P6, P10 |
| `isTokenReference` | `format` | si une valeur est une référence de token | `conventions.mjs` | P6 |
| `tokenCssVariable` | `format` | le nom CSS d'un token | `tokens-css.mjs` | P6, P10 |
| type `Contract` | `format` | la forme du contrat pour TypeScript | aucun | tout module écrit en TypeScript |

Le chemin `schema/ucm-contract.schema.json` entre aussi dans la promesse, parce
qu'`ucm init` l'écrit déjà dans le dépôt du consommateur.

Les autres options perdent pour ces raisons.

- **1a** promet des noms qu'aucun module n'appellera. `MARQUEUR_RAPPORT` et
  `MARQUEUR_SANS_OBJET` sont des marques du commentaire de demande de fusion.
  `libelleNombre` accorde un mot au singulier ou au pluriel.
  `FORMES_ANCIENNES_DES_COLLECTIONS` garde les noms d'avant la décision D8. Les
  figer retire au mainteneur la liberté de les changer, sans protéger personne.
- **1b** promet des formes que personne n'a conçues. Les règles 3 et 4 du linter
  sont ouvertes (P6), et le format de l'observation du comparateur n'existe pas
  (P10). Une promesse posée avant la conception serait cassée à la conception.
- **1c** gèle le référentiel, qui porte 207 noms à lui seul.

Quatre règles gardent la prise petite.

- **Un nom entre quand le code d'un module l'importe**, jamais par anticipation.
  Ajouter un nom ne casse rien. Retirer un nom casse quelqu'un. Il vaut donc
  mieux promettre tard.
- **La prise promet une question plutôt qu'une pièce.** Le linter de P6 recevra
  une fonction du kit qui rend les constats d'un fichier, au lieu des quatre
  pièces qu'elle assemble. Les pièces restent libres de changer.
- **Aucun nom du référentiel n'entre.** CONCEPT.md le fonde : « Toute
  information nécessaire au consommateur doit donc être modélisée dans le
  vocabulaire portable. » Un module qui réclame un nom du référentiel signale un
  manque du contrat, à corriger dans le format.
- **Un nom promis qu'aucun module n'importe plus est déprécié.**

#### Ce qui ferait changer d'avis

- Un module demande plus de trois noms hors de la prise pendant sa conception.
  La lecture commune est alors mal découpée, et la prise se redessine avec lui.
- Un nom de la lecture commune n'est importé par aucun des deux premiers
  modules. Il est alors déprécié.

### Question 3. Que signifie une version 0.x ?

La spécification semver 2.0.0 (point 4, citée de mémoire, non revérifiée ici)
réserve la version 0.y.z au développement initial, où tout peut changer. Les
plages de npm (citées de mémoire) traitent le chiffre du milieu d'une 0.x comme
une rupture. `^0.16.0` accepte 0.16.5 et refuse 0.17.0.

| Option | R | M | S | L | D |
|---|---|---|---|---|---|
| 3a. 0.x sans règle (statu quo) | faible, le numéro ne dit rien | bon | faible | bon | faible |
| 3b. 0.x ; mineure pour une rupture de la prise ou du format, correctif pour le reste | bon, le numéro dit s'il faut lire le journal | bon, le test classe la montée | bon | bon | bon, règle connue des agents |
| 3c. 1.0 tout de suite | bon | moyen, la prise n'a jamais servi et sa première forme changera | bon | bon | bon |
| 3d. 1.0 à un signal observé, 3b jusque-là | bon | bon | bon | bon | bon |

**Les options 3b et 3d sont retenues ensemble.** Jusqu'à la 1.0, le numéro se lit
ainsi.

| Changement | Numéro du kit en 0.x | Journal |
|---|---|---|
| Changement interne (référentiel, contrôles, plugins, CLI) sans effet sur la prise | dernier chiffre (0.16.0 vers 0.16.1) | aucune entrée |
| Ajout d'un nom à la prise, ou d'un champ à un résultat | dernier chiffre | entrée « ajout » |
| Nom promis annoncé comme déprécié, avec son remplaçant | dernier chiffre | entrée « déprécié » |
| Nom promis retiré ou renommé, signature changée | chiffre du milieu (0.16 vers 0.17) | entrée « rupture », avec le geste de migration |
| Résultat différent d'un nom promis pour la même entrée | chiffre du milieu | entrée « rupture » |
| Nouvelle majeure de `contractVersion` ou nouvelle version du format de tokens | chiffre du milieu | entrée qui renvoie à [CHANGELOG-FORMAT.md](../../../format/CHANGELOG-FORMAT.md) |

La version qui ouvre la prise est la 0.17.0, pour marquer le début de la règle.
Une version sans entrée au journal n'a rien changé de promis. Le numéro du kit
reste indépendant de `contractVersion`, comme COMPATIBILITE.md le pose pour tout
paquet.

En 1.0, la même table se décale d'un cran. L'ajout monte le chiffre du milieu, la
rupture monte le premier chiffre, l'interne monte le dernier. Le test et le
journal ne changent pas.

L'option 3c perd sur M. Une prise jamais utilisée sera corrigée par le premier
module, et une 2.0 quelques semaines après la 1.0 use le signal de stabilité.
L'option 3a perd parce qu'un développeur qui passe de 0.16.0 à 0.16.40 ne sait pas
s'il doit relire son code.

#### Le signal du passage en 1.0

Le kit passe en 1.0 quand ces deux conditions sont réunies :

- deux modules en service importent la prise ;
- la prise n'a connu aucune rupture pendant trois mois.

Si les ruptures reviennent chaque mois, le kit reste en 0.x et la prise rétrécit.

### Qui décide, comment le prouver

| Changement | Qui le propose | Qui décide | Trace |
|---|---|---|---|
| Interne | agent du mainteneur | le mainteneur, comme aujourd'hui | aucune entrée |
| Ajout à la prise | développeur d'un module | le mainteneur, avec ce développeur | entrée « ajout » |
| Dépréciation ou rupture | le mainteneur ou un développeur | le mainteneur, en réunion avec les développeurs | entrée « déprécié » ou « rupture » |

Le mainteneur ne lit pas le code. Il lit l'entrée du journal, qui dit en mots
simples ce qui change, pour qui et quel geste en découle. L'entrée porte aussi le
nom de qui a décidé.

Trois tests rendent la règle mécanique.

- `packages/kit/tests/apiPublique.test.mjs` compare les noms de la prise à ceux
  de la version précédente, lue dans Git comme le fait
  `tests/versionSuitLeContenu.test.mjs`. Un nom ajouté ou retiré sans entrée au
  journal le fait échouer. Un nom retiré sans nouveau chiffre du milieu aussi.
- Le même test appelle chaque nom promis sur les contrats et les tokens de
  `packages/kit/fixtures/`, et compare le résultat à un résultat attendu écrit.
  Un résultat attendu modifié demande une entrée « rupture ».
- `tests/modulesParLaPrise.test.mjs`, à la racine, refuse qu'un paquet du dépôt
  hors du toolkit importe une autre porte que `@ucm-kit/core/modules`.

Une limite reste. Un changement de comportement qu'aucun exemple ne couvre passe
le test, comme la classe 4 de COMPATIBILITE.md passe le schéma. Les exemples de
chaque nom sont la seule défense, et ils s'enrichissent à chaque écart trouvé.

### Le préavis avant un retrait

Un nom promis à retirer reçoit l'étiquette `@deprecated` dans la déclaration de
la prise, avec le nom qui le remplace. L'éditeur barre alors le nom, et un agent
qui lit la déclaration voit l'étiquette. Le nom reste servi pendant au moins une
version publiée, puis il disparaît à la rupture suivante.

Cette règle reprend la fenêtre de lecture des contrats, qui accepte la version
courante et la précédente. Le développeur a toujours une version où l'ancien et
le nouveau nom coexistent.

## 3. Ce que la piste P3 devient

Le fichier `packages/kit/api-publique.json` disparaît du plan. La prise
elle-même est la liste, et un second fichier en serait une copie. Ce point suit
la règle « une information, un propriétaire ».

| Chemin | Action | Quoi |
|---|---|---|
| `packages/kit/src/modules/index.mjs` | créer | Republie les 7 fonctions sous leur nom d'origine, depuis `@ucm-kit/core/lecteurs` et `@ucm-kit/core/format` |
| `packages/kit/src/modules/index.d.mts` | créer | Déclare les 7 fonctions et le type `Contract` ; `vueExacteDuVariant` y reçoit un type de retour à la place de `unknown` |
| `packages/kit/package.json` | modifier | `exports` reçoit `./modules` ; `files` reçoit `src/modules` ; version 0.17.0 |
| `packages/kit/tests/apiPublique.test.mjs` | créer | Noms comparés à la version précédente, exemples d'appel sur `fixtures/`, entrée de journal exigée |
| `tests/modulesParLaPrise.test.mjs` | créer | Un paquet hors du toolkit n'importe que `@ucm-kit/core/modules` |
| `packages/kit/CHANGELOG.md` | créer | Première entrée à 0.17.0, genre « ajout », la prise et ses 8 noms |
| `packages/kit/invariants/versionnage.md` | modifier | Règles de la table des numéros, du préavis, du référentiel hors de la prise et de la décision avec le mainteneur |
| `packages/kit/README.md` | modifier | Section « Status » : seule `./modules` est promise, les autres portes servent le toolkit ; un module épingle le kit de sa CLI |
| `packages/cli/src/guide.mjs` | modifier | Nommer un `@ucm-kit/core` installé dans le repository à une autre version que celui de la CLI |
| `packages/cli/tests/` | modifier | Cas d'un kit installé à une autre version |
| `packages/cli/package.json`, `packages/adapter-typescript/package.json` | modifier | Épingler `0.17.0` et monter leur numéro (skill `publier-paquets`) |

Critères de fin :

- `node scripts/run-tests.cjs` passe dans `packages/kit` avec `apiPublique.test.mjs` ;
- retirer un nom de la prise fait échouer le test, mutation vérifiée une fois ;
- modifier un résultat attendu sans entrée « rupture » fait échouer le test,
  mutation vérifiée une fois ;
- `packages/kit/CHANGELOG.md` porte l'entrée de la 0.17.0 ;
- `npm test` passe à la racine, dont `versionSuitLeContenu` et
  `modulesParLaPrise`.

Les trois questions de P3 disparaissent, et la partie 2 y répond. La liste
compte 8 noms à l'ouverture (question 1). Un module importe une porte réservée,
à la version du kit de sa CLI (question 2). Le chiffre du milieu marque une
rupture, et la 1.0 attend un signal (question 3).

Les deux risques de P3 changent. « Une liste trop étroite pousse les modules
vers des symboles privés » se referme par le test de la racine et la règle ESLint
du guide P4. « Recompter avant de figer » est fait. Le relevé donne 41 valeurs et 1 type
sur 433 noms, et ces noms ne sont plus la liste.

Quatre pistes citent `api-publique.json` et doivent citer la prise à la place.

- **P4** cite la prise et la règle d'épinglage, et donne la règle
  `no-restricted-imports`.
- **P6** ajoute à la prise la fonction qui rend les constats d'un fichier, à la
  place de quatre pièces.
- **P10** ajoute à la prise le comparateur et le format d'un écart.
- **P15** vérifie 8 signatures au lieu des 607 lignes de `index.d.mts`, ce qui
  réduit son coût.

## 4. Glossaire

| Terme | Sens dans ce document |
|---|---|
| API publique | ce qu'un paquet promet de garder stable pour le code des autres |
| Point d'entrée, porte | un chemin d'import du paquet, comme `@ucm-kit/core/format` |
| Prise | le point d'entrée `@ucm-kit/core/modules`, réservé aux modules |
| Nom exporté | une fonction, une table ou une constante qu'un point d'entrée sert |
| Module | un outil écrit par les développeurs qui lit les contrats : linter, Storybook, vérificateur de rendu |
| Train du toolkit | le kit, la CLI et l'adaptateur, testés ensemble et publiés dans cet ordre |
| Épingler | écrire dans un `package.json` un numéro exact, sans accepter le suivant |
| Semver | la convention de numéros à trois chiffres, majeure.mineure.correctif |
| Rupture | un changement qui oblige le code d'un module à changer |
| Dépréciation | l'annonce qu'un nom sera retiré, avec son remplaçant, avant son retrait |
| Journal | `packages/kit/CHANGELOG.md`, qui note chaque changement de la prise |
| Référentiel | les définitions UCM de `packages/kit/src/referentiel/` : crans, modes, rôles, conventions |
| Fixture | un contrat ou un fichier de tokens fabriqué pour les tests |
| Dépendance pair | une dépendance que le repository installe une seule fois pour tous les paquets qui la demandent |

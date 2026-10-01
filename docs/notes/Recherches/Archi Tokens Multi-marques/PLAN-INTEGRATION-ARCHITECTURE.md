# Plan d'intégration de l'architecture des tokens

## Résultat attendu

L'architecture décrite par les décisions D1 à D17 de la [vue
illustrée](./VUE-ILLUSTREE-MULTIMARQUES.html) est écrite partout où elle a
cours :

- [ARCHITECTURE-FINALE-MULTIMARQUES.md](./ARCHITECTURE-FINALE-MULTIMARQUES.md)
  décrit six collections de couleur : `primitives` (le catalogue des palettes
  nommées), `brand`, `color-utilities`, `theme`, `usage` et `components` ;
- le moteur `ucm-couleur` porte quatre rangs d'état, dix-neuf paires, la
  table qui relie l'état d'un composant à son rang, et des listes de nuances
  qui contiennent toujours 400 et 950 ;
- UCM Palettes affiche le quatrième rang, ne propose plus le préréglage à
  neuf nuances et migre les recettes qui le portent ;
- la direction de l'écriture des variables par UCM Palettes écrit les six
  collections ;
- `ucm check` vérifie qu'un composant applique la table des emplois.

Ce plan est destiné à l'agent qui fera ces changements. Il ne décide rien : il
applique les décisions de la vue illustrée, retenues par le mainteneur. Un
point qu'elles ne tranchent pas figure sous [Questions au
mainteneur](#questions-au-mainteneur) et attend sa réponse avant le lot qu'il
touche.

## Autorités

Lire dans cet ordre :

1. la [vue illustrée](./VUE-ILLUSTREE-MULTIMARQUES.html), décisions D1 à D17,
   à ouvrir dans un navigateur ; elle fait foi sur la forme retenue tant
   qu'ARCHITECTURE-FINALE n'est pas réécrite (lot A0) ;
2. ce plan ;
3. [ARCHITECTURE-FINALE-MULTIMARQUES.md](./ARCHITECTURE-FINALE-MULTIMARQUES.md),
   pour les courbes, la fabrication des palettes et les mesures qui ne
   changent pas ;
4. la [spécification d'UCM Palettes](../Plugin%20Palettes/RECHERCHE-PLUGIN-PALETTES.md) ;
5. [AGENTS.md](../../../../AGENTS.md), [CONTRIBUTING.md](../../../../CONTRIBUTING.md),
   la skill [`rediger-sans-tics-ia`](../../../../.agents/skills/rediger-sans-tics-ia/SKILL.md)
   avant toute phrase, et la skill
   [`rediger-diagnostics-ucm`](../../../../.agents/skills/rediger-diagnostics-ucm/SKILL.md)
   avant tout message destiné au designer.

## Les décisions à appliquer

Le détail, les mesures et les options écartées sont dans la vue illustrée.

| # | Décision | Origine |
|---|---|---|
| D1 | Deux axes sur deux collections : `brand`, un mode par marque ; `theme`, `light` et `dark` | Commit 5306c1a |
| D2 | `theme` est le seul endroit où le thème se choisit ; ses alias suivent une règle, sans choix du designer | Commit 5306c1a |
| D3 | `color-brand-tokens` devient `brand` ; `color-brands` y est fusionnée | Recherche §5.2 |
| D4 | Les dix rôles `subtlest` à `strong` sont supprimés ; la table des emplois les remplace | Commit 9ea3adc |
| D5 | `primitives › colors` est un catalogue de palettes nommées, chacune en `light` et `dark` | Nouvelle |
| D6 | `color-utilities` porte les rôles communs à toutes les marques, et les niveaux d'élévation | Nouvelle |
| D7 | Une courbe de clarté commune et onze nuances, dont 400 et 950 obligatoires | Recherche §6.3, D17 |
| D8 | `soft` et `vivid` pour les statuts ; une intensité pour les palettes de marque et le neutre | Commits 5306c1a, e3f8e28 |
| D9 | La couleur de charte dans `brand.identity` | Revue critique §3.4 |
| D10 | `colors/white` et `colors/black`, constantes hors des palettes | Nouvelle |
| D11 | Les noms de `components` sont conservés ; leurs alias visent `usage` | Recherche §10 |
| D12 | `layouts` et `typography` conservées ; `params` et `exception` réservés | Commit 5306c1a |
| D13 | Une collection `usage`, sans mode : la table des emplois en variables | Nouvelle |
| D14 | Une nuance hors table passe par un token de composant ; portées Figma par emploi | Nouvelle |
| D15 | Trois niveaux d'élévation opaques : `page`, `raised`, `overlay` | Nouvelle |
| D16 | Une seule table des emplois pour UCM Palettes, l'architecture et `ucm check` | Nouvelle |
| D17 | Quatre rangs d'état et une table de l'état d'un composant vers son rang | Nouvelle |

## Faits qui fondent le plan

Relevés dans le code. Les chemins sont relatifs à la racine du dépôt.

| Fait | Source |
|---|---|
| Huit emplois ; les nuances que les paires visent sont 100, 200, 300, 600, 700, 800 et 900 | `packages/couleur/src/emplois.ts`, `EMPLOIS`, `CRANS_DES_EMPLOIS` |
| Seize paires, un décalage de 0 à 2 par membre, dix associations | `packages/couleur/src/promesses.ts`, `PAIRES`, `MembrePaire`, `EtatDePaire` |
| Trois préréglages : 9 (sans 400 ni 950), 11 et 13 nuances | `packages/couleur/src/nuances.ts`, `NombreDeNuances`, `PREREGLAGES` |
| La recette est au format 6 ; `[REC-05]` refuse une liste qui omet une nuance de `CRANS_DES_EMPLOIS` | `packages/couleur/src/recette.ts`, `FORMAT_RECETTE` |
| Les noms publiés des rangs sont `default`, `hover`, `active` | `packages/plugin-palettes/src/i18n/fr.ts` et `en.ts`, `NOM_DE_L_ETAT` ; `src/planche/modele.ts`, `ETATS` |
| L'interface propose les boutons 9, 11 et 13 nuances | `packages/plugin-palettes/src/ui/configuration.ts`, `boutonsDuNombre` ; `src/configuration.ts`, `effetDuPrereglage` |
| UCM Exporter publie ce qu'une couleur peint (`background`, `foreground`, `icon`, `border`, `ring`) et l'état d'un variant (axe `State`) | [FORMAT.md](../../../format/FORMAT.md), sections 2 et 4 |
| `ucm check` rend ses diagnostics depuis `@ucm-kit/core/lecteurs` ; un diagnostic non bloquant suit le modèle de `diagnostic-tokens.mjs` | `packages/cli/src/check.mjs`, `packages/kit/src/lecteurs/` |
| `@ucm-kit/core` est publié sur npm ; `ucm-couleur` est privé et servi en source | Spécification d'UCM Palettes, décision D7 |

## Ordre d'exécution

| Lot | Contenu | Prérequis |
|---|---|---|
| A0 | Les documents d'autorité | Aucun |
| A1 | Le vocabulaire commun dans le kit, et `ucm-couleur` | A0 |
| A2 | UCM Palettes | A1 |
| A3 | L'écriture des variables : la direction globale | A0, A1, essais du lot A5 |
| A4 | `ucm check` | A1 |
| A5 | Les essais dans Figma, par le mainteneur | Aucun |
| A6 | La migration du Playground | A0 à A4 |

Un lot se termine quand ses cases sont cochées et que `npm test`,
`npm run typecheck` et `npm run build` passent. Chaque document modifié passe
`node scripts/controle-style.mjs <fichier>` et `npx tsx --test tests/docLinks.test.ts`.

## Lot A0 : les documents d'autorité

- [x] **A0.1** ARCHITECTURE-FINALE, section 1 : la table des préréglages perd
  la ligne 9. Écrire que 400 et 950 sont obligatoires, et pourquoi : le
  quatrième rang les vise (D17). La 500 reste la seule nuance sans emploi.
- [x] **A0.2** ARCHITECTURE-FINALE, section 2, table des collections : six
  collections de couleur au lieu de quatre, avec le contenu et les modes de la
  vue illustrée. `primitives` porte `colors/{palette}/{light|dark}/{nuance}`,
  le segment d'intensité pour une palette à deux intensités, `colors/white`,
  `colors/black`, les dimensions et la typographie (D5, D10).
- [x] **A0.3** ARCHITECTURE-FINALE, section 2, « Le chemin d'une couleur » :
  remplacer `primitives.success.soft.light.700` par la chaîne
  `color-utilities.success.soft.light.700` vers
  `primitives.colors.grass.soft.light.700`, et
  `brand.palette.primary.dark.700` par son alias vers une palette du catalogue
  (D5, D6).
- [x] **A0.4** ARCHITECTURE-FINALE, « Ce que `theme` expose » : 124 variables,
  dont 3 niveaux d'élévation ; les cibles du neutre et des statuts sont dans
  `color-utilities` (D2, D6, D15).
- [x] **A0.5** ARCHITECTURE-FINALE, nouvelle section « `usage` » : les 20
  usages par palette, les 3 usages du neutre (`text-strong`, `text-disabled`,
  `fill-disabled`), les 3 niveaux d'élévation, les portées par emploi, la règle
  des nuances hors table (D13, D14).
- [x] **A0.6** ARCHITECTURE-FINALE, section 4 : la table des emplois prend le
  quatrième rang, ses minimums (13,66 ; 6,61 ; 5,32) et la table de l'état
  d'un composant vers son rang (D17).
- [x] **A0.7** ARCHITECTURE-FINALE, nouvelle section « L'élévation » : les
  valeurs de la vue illustrée, les mesures (4,88 et 3,41 sur la nuance 100 ;
  4,23 et 2,96 sur la 200), les ombres en effect styles (D15).
- [x] **A0.8** ARCHITECTURE-FINALE, sections 6 à 8 : les variables CSS
  `--usage-*`, le coût d'une marque avec les alias de `brand`, les points
  encore ouverts de ce plan.
- [x] **A0.9** `verifier-courbes.mjs`, sections 5 et 9 : mesurer les trois
  paires du quatrième rang et les paires sur les niveaux d'élévation, pour que
  chaque nombre des points A0.6 et A0.7 se rejoue. Le calcul de la vue
  illustrée, à teinte constante, redonne les minimums publiés à 0,04 près.
- [x] **A0.10** La vue illustrée : les badges « Nouvelle décision » et
  l'encadré des écarts disparaissent une fois ARCHITECTURE-FINALE réécrite.
- [x] **A0.11** [docs/README.md](../../../README.md) : une ligne pour ce plan ;
  la ligne d'ARCHITECTURE-FINALE nomme les six collections.

## Lot A1 : le vocabulaire commun dans le kit, et le moteur `ucm-couleur`

Le vocabulaire que les trois outils partagent entre dans `@ucm-kit/core`,
sous un nouveau point d'entrée `@ucm-kit/core/emplois`. La fabrication des
palettes reste dans `ucm-couleur`, qui importe ce vocabulaire du kit. Voir la
[décision R1](#r1-ce-qui-entre-dans-le-kit).

- [x] **A1.1** Créer `packages/kit/src/emplois/` et l'export `./emplois` du
  `package.json` du kit. Y déplacer, sans changer leur comportement :
  - `EMPLOIS`, `TABLE_DES_EMPLOIS`, `CRANS_DES_EMPLOIS`,
    `EMPLOIS_FACULTATIFS`, `emploiPresent`, `rangDuCranLeger` (aujourd'hui
    dans `packages/couleur/src/emplois.ts`) ;
  - les définitions des paires : `MembrePaire`, `Paire`, `PAIRES`,
    `Association`, `ASSOCIATIONS`, `EtatDePaire`, `associationDe`,
    `etatDeLaPaire`, `cleDeLAssociation`, `decalagesDeLEmploi`,
    `emploisDuCran`, `paireJugeable` (aujourd'hui dans `promesses.ts`) ;
  - le contraste WCAG 2 : `luminanceLineaire`, `luminanceRelative`,
    `rapportDeLuminances`, `contraste`, `atteintLeSeuil` et sa règle des dix
    décimales (aujourd'hui dans `contraste.ts`), avec le passage d'une couleur
    à 8 bits en sRGB linéaire qu'ils lisent.
- [x] **A1.2** Dans le kit : `CRANS_DES_EMPLOIS` devient
  `[100, 200, 300, 400, 600, 700, 800, 900, 950]` ; `MembrePaire.decalage` et
  `EtatDePaire` vont de 0 à 3. Trois paires s'ajoutent à la fin de `PAIRES`,
  sous les numéros 17 à 19, pour que les numéros 1 à 16 cités par la
  spécification et les rapports ne bougent pas : `text+3` sur `surface+3`
  (texte), `on-solid` sur `solid+3` (texte), `border-control+3` sur
  `surface+3` (non-texte). Les associations restent dix.
- [x] **A1.3** Dans le kit, un module des rangs et des usages :
  - `RANGS = ['default', 'hover', 'active', 'active-hover']`, les noms publiés,
    que l'interface et la planche lisent au lieu de les redéfinir ;
  - la table de l'état d'un composant vers son rang (repos 0, survol 1, appui 2,
    sélectionné 2, sélectionné et survolé 3, sélectionné et appuyé 3, focus 0
    avec l'anneau `focus`, désactivé vers les usages neutres) ;
  - la table de chaque emploi vers ce qu'il peint (`background`, `foreground`,
    `icon`, `border`, `ring`) et vers ses portées Figma (D14) ;
  - une fonction qui rend les noms des variables de `usage` d'une palette,
    pour qu'UCM Palettes et `ucm check` les dérivent de la même source (D16).
- [x] **A1.4** `ucm-couleur` dépend de `@ucm-kit/core` et importe ce
  vocabulaire ; ses fichiers `emplois.ts`, `promesses.ts` et `contraste.ts`
  ne gardent que ce qui juge une palette (`verifierPromesses` et ce qui lit la
  recette et les rampes), la distance Oklab et la part de chroma. Un test
  vérifie que le kit n'importe rien de `ucm-couleur`.
- [x] **A1.5** `nuances.ts` : `NombreDeNuances` devient `11 | 13` ; le
  préréglage 9 et sa branche de `nombreDeNuancesDe` disparaissent.
- [x] **A1.6** `recette.ts` : `FORMAT_RECETTE` passe à 7 (voir la [réponse
  R2](#r2-le-format-de-la-recette)). Aucune migration : une recette d'un format
  antérieur est refusée, avec le message de refus de `formatVersion` qui
  existe déjà. Les conversions de 3 à 6 sont retirées avec leurs tests.
  `[REC-05]` refuse une liste qui omet 400 ou 950.
- [x] **A1.7** Tests : ceux du kit pour le vocabulaire (19 paires, nuances
  visées, rangs, table des états, contraste à dix décimales) ;
  `packages/couleur/tests/` pour `nuances.test.ts` (préréglage retiré),
  `recette.test.ts` (une recette 6 refusée ; une liste sans 400 ou sans 950
  refusée), `promesses.test.ts` et `alertes.test.ts`.
  `packages/couleur/scripts/mesurer-ancrage.mjs` suit s'il lit `PAIRES`.
- [x] **A1.8** Version : `@ucm-kit/core` monte d'une version mineure, un point
  d'entrée s'ajoutant sans rien retirer. Le README du kit décrit le point
  d'entrée `./emplois`.

## Lot A2 : UCM Palettes

- [x] **A2.1** Spécification, section 11.2 : dix-neuf paires ; la table des
  paires et celle des associations prennent `active-hover` ; les comptes
  deviennent 76 paires pour une palette à deux intensités (68 sans la 50) et 38
  pour une intensité (34 sans la 50).
- [x] **A2.2** Spécification, `[VER-05]` et `[REC-05]` : les nuances visées
  comptent 400 et 950 ; une liste qui les omet est refusée. La section 7.3
  (rangement et version) dit qu'une recette d'un format antérieur est refusée,
  sans conversion (réponse R2).
- [x] **A2.3** Spécification, sections 7 (format 7 de la recette) et des
  préréglages : 11 et 13 nuances seulement.
- [x] **A2.10** Spécification, décision D7 : le moteur reste dans
  `ucm-couleur` ; le vocabulaire commun (emplois, paires, rangs, contraste
  WCAG) est dans `@ucm-kit/core/emplois` (réponse R1). `[ARC-01]` et
  `[ARC-04]` suivent.
- [x] **A2.4** `i18n/fr.ts` et `i18n/en.ts` : `NOM_DE_L_ETAT` lit `RANGS`
  d'`ucm-couleur` ; `ETATS_DU_DECALAGE`, la légende des traits (un quatrième
  style pour `active-hover`) et la liste des états prennent le quatrième rang.
  Les textes nouveaux passent par
  [TEXTES-A-VALIDER.md](../Plugin%20Palettes/TEXTES-A-VALIDER.md) et
  l'[inventaire des textes](../Plugin%20Palettes/INVENTAIRE-TEXTES-ET-PROPOSITIONS.md).
- [x] **A2.5** `planche/modele.ts` : `ETATS` lit `RANGS`. L'empreinte du
  modèle change : les cadres passent « À actualiser », comme prévu.
- [x] **A2.6** `ui/garanties.ts`, `ui/nuancier.ts`, `presentation.ts`,
  `ajustement.ts` : chaque boucle sur les états couvre les quatre rangs.
- [x] **A2.7** `configuration.ts` et `ui/configuration.ts` : les boutons du
  nombre de nuances deviennent 11 et 13 ; `effetDuPrereglage` suit.
- [x] **A2.8** Tests et galerie : `modeleDePlanche.test.ts`,
  `textes.test.ts`, `tests/interface/interface.test.mjs` (le cas des 9
  nuances), un état de galerie par écran qui montre les quatre rangs.
- [x] **A2.9** [AGENTS.md](../../../../AGENTS.md), carte du code : le point
  d'entrée `@ucm-kit/core/emplois` porte les emplois, les dix-neuf paires, les
  rangs et le contraste ; `ucm-couleur` les importe.
  [INSTRUCTION-NOMBRE-DE-NUANCES.md](../Plugin%20Palettes/INSTRUCTION-NOMBRE-DE-NUANCES.md)
  perd le préréglage 9.

## Lot A3 : l'écriture des variables

La [consigne de la direction
globale](../Plugin%20Palettes/Int%C3%A9gration%20du%20march%C3%A9/06%20Direction%20globale/PROMPT-DIRECTION-GLOBALE.md)
décrit encore trois collections. Mettre à jour la consigne avant de lancer
l'agent de la direction, ou mettre à jour sa direction si elle existe déjà.

- [ ] **A3.1** Section « Le contexte » : six collections de couleur ; le
  compte passe de 710 à 1 412 valeurs pour six marques, dont les alias de
  `brand`, `color-utilities`, `theme` et `usage` que le plugin déduit.
- [ ] **A3.2** La destination d'une palette : toujours
  `primitives.colors.{nom}`, sous le nom que le designer donne. Son rôle,
  palette de marque, statut ou neutre, écrit des alias dans `brand` ou
  `color-utilities`, sans déplacer de variable (D5, D6). Une palette à deux
  intensités affectée à une marque choisit l'intensité à l'affectation.
- [ ] **A3.3** « Ce qui ne se négocie pas » : `theme` et `usage` se déduisent
  de leurs règles et de la table de `@ucm-kit/core/emplois`, jamais d'une
  saisie.
- [ ] **A3.4** Les portées : vides sur `primitives`, `brand`,
  `color-utilities` et `theme` ; par emploi sur `usage`, d'après
  `@ucm-kit/core/emplois` (D14). Les niveaux d'élévation s'écrivent dans `color-utilities` (D15).
- [ ] **A3.5** [La comparaison avec le
  marché](../Plugin%20Palettes/RECHERCHE-CONCURRENCE-PALETTES.md), sections 3.2
  à 3.4 : les chemins et la couche `theme` suivent la nouvelle forme.
- [ ] **A3.6** Le format de recette que la direction ajoute pour les rôles, les
  familles et les marques prend le numéro qui suit le 7 du lot A1. Il n'a pas
  de conversion non plus, tant qu'aucune recette n'est rangée hors des essais
  du mainteneur (réponse R2).

## Lot A4 : `ucm check`

- [ ] **A4.1** Le diagnostic lit la table, les paires, les rangs et le
  contraste dans `@ucm-kit/core/emplois` (lot A1). Une couleur de
  `tokens.json` passe à 8 bits avant le contraste, comme dans UCM Palettes
  (décision D11 de sa spécification). Une couleur hors sRGB est relevée comme
  non jugée.
- [ ] **A4.2** Nouveau diagnostic dans `packages/kit/src/lecteurs/`, non
  bloquant, sur le modèle de `diagnostic-tokens.mjs`. Pour chaque couleur d'un
  contrat, il résout le premier alias dans `tokens.json` et rend quatre
  constats :
  - **support** : un emploi posé sur ce qu'il ne peint pas, un emploi de texte
    sur un contour par exemple ;
  - **paire** : dans un variant, un `foreground` et le `background` sur lequel
    il est posé ne forment pas une paire de la table au même rang ; le constat
    donne le contraste mesuré dans chaque marque et chaque thème ;
  - **hors table** : une couleur qui vise `theme` directement, avec son
    contraste mesuré (D14) ;
  - **état** : un variant dont l'état, publié par l'axe `State`, ne vise pas le
    rang que la table des états lui donne (D17).

  La règle qui dit sur quel `background` un `foreground` est posé se déduit de
  l'arbre publié par le contrat : l'écrire dans FORMAT.md avant le code.
- [ ] **A4.3** `controle-repository.mjs` rend ce diagnostic ; les messages
  suivent la skill `rediger-diagnostics-ucm`.
- [ ] **A4.4** Tests : un contrat par constat, et un contrat conforme sans
  constat.

## Lot A5 : les essais dans Figma

Le mainteneur les fait ; leurs résultats décident de points des lots A3 et A4.

- [ ] **A5.1** Le choix d'un alias dans le panneau des variables filtre-t-il
  par portée ? Si oui, les nuances de `theme` gardent les portées de
  remplissage et de contour (D14).
- [ ] **A5.2** La description d'une variable s'affiche-t-elle dans le
  sélecteur ? Si oui, UCM Palettes y écrit la paire de chaque usage.
- [ ] **A5.3** Une couleur d'ombre liée à une variable dans un effect style
  s'exporte-t-elle, et suit-elle le mode de `theme` ?

## Lot A6 : la migration du Playground

Dans le dépôt `UCM-Playground`, après les lots A0 à A4.

- [ ] **A6.1** Retirer `"modes": { "color-brand-tokens": "data-brand" }` de
  `ucm.config.json` : `data-brand` et `data-theme` se déduisent des noms des
  collections.
- [ ] **A6.2** Repointer les 306 couleurs de `components` vers `usage`, ou
  vers une nuance de `theme` pour une couleur hors table, comme l'exemple
  `scale-5` de la vue illustrée.
- [ ] **A6.3** Réexporter, régénérer la feuille avec `ucm tokens css`, lancer
  `ucm check` : aucun constat de support, de paire ni d'état.

## Réponses

### R1. Ce qui entre dans le kit

Le mainteneur a délégué ce choix, puis validé la réponse. `ucm check` a besoin de la table des
emplois, des paires, des rangs, de la table des états et du contraste WCAG :
ce vocabulaire entre dans `@ucm-kit/core/emplois`. La fabrication des
palettes reste dans `ucm-couleur`, privé.

- **Le besoin est étroit.** `ucm check` ne fabrique aucune palette. Les
  rampes, le gamut, la dérive, la recette et ses migrations, les alertes et
  les réglages forment l'essentiel des 2 556 lignes d'`ucm-couleur`, et aucun
  lecteur de `tokens.json` n'en a l'usage.
- **Le moteur change vite.** La recette est passée du format 3 au format 6,
  trois changements de forme (`git log -- packages/couleur/src/recette.ts`).
  Dans le kit, un changement de ce genre toucherait l'interface publiée et
  imposerait une version majeure de `@ucm-kit/core` aux dépôts qui
  l'installent pour `ucm check`.
- **Une seule source.** `ucm-couleur` importe le vocabulaire du kit : UCM
  Palettes et `ucm check` jugent sur la même table et le même arrondi (D16).

Écartés : tout le moteur dans le kit, pour les deux raisons ci-dessus ; une
copie de la table dans le kit, qui ferait deux sources à garder égales ; un
paquet `ucm-couleur` publié à part, qui ajoute un paquet à publier et
versionner pour le même contenu que le point d'entrée.

### R2. Le format de la recette

La recette est le fichier JSON qu'UCM Palettes range dans le document Figma :
tous les nombres qui fabriquent les palettes (liste des nuances, courbes,
intensités, fonds, puis pour chaque palette sa référence, sa dérive et ses
réglages). Son champ `formatVersion`, aujourd'hui 6, numérote la forme de ce
JSON. Quand un champ s'ajoute ou change de sens, le numéro monte, et le plugin
convertit à la lecture une recette d'un format plus ancien.

Le mainteneur est le seul à avoir rangé des recettes, pour ses essais. Un
changement de forme ne demande donc aucune conversion : le format monte, et une
recette plus ancienne est refusée à la lecture. La décision D12 de la
spécification d'UCM Palettes a procédé de même pour le renommage des
intensités. Le lot A1 prend le format 7 et retire les conversions existantes ;
la direction globale prend le format suivant (A3.6). Le jour où des recettes
seront rangées hors des essais, chaque changement de forme reprendra sa
conversion et ses tests.

## Questions au mainteneur

- **Q3.** Le fond de page en clair : à 0,975, la nuance 50 donne `#F7F7F7` ;
  le fond visé est `#f8fafc`. Le mainteneur règle la palette neutre et la
  clarté de sa nuance 50. Les minimums publiés se recalculent ensuite avec
  `verifier-courbes.mjs`.

Q4, les parts de chroma de `soft` et `vivid` (0,45 et 0,95), est tranchée : le
mainteneur retient ces valeurs, comme les deux courbes de clarté.

## Hors périmètre

- Un nom d'usage par composant, comme `button` ou `card` : ces noms restent
  dans `components` (D13).
- Un troisième mode de `theme`, à contraste renforcé.
- Display P3 : la sortie reste en sRGB (commit 5306c1a).

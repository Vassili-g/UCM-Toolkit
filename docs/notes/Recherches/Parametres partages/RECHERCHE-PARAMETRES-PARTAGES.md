# Parametres partages

## Étapes

- [x] 1. Relire l'audit du 30 octobre et les gardes existantes
- [x] 2. Versions, pins et kit embarqué
- [x] 3. Chemins des tokens et projection CSS
- [x] 4. Seuils, nombres et listes
- [x] 5. Configuration, fichiers d'`ucm init`, commandes de la CLI, aides
- [x] 6. Codes et textes de diagnostic
- [x] 7. Hypothèses implicites
- [x] 8. Collisions de vocabulaire
- [x] 9. Tests qui figent une copie
- [x] 10. Fiches, inventaire `parametres.json`, contrôle de style

## Synthèse

Le premier audit suit 57 paramètres. `parametres.json` en range 128 avec ceux des quatre zones. 19 ont une source unique et une garde automatique sans écart. Les 38 autres se rattachent à 24 écarts. Un écart est bloquant, 8 sont importants et 15 mineurs. 12 cassent la Robustesse et 12 la Confiance.

Le code tient bien ses constantes. Les versions, la projection CSS, la grammaire de `ucm.config.json`, les codes de constat et les listes du référentiel ont un propriétaire et une loi. Les écarts restants vivent aux frontières, dans les textes recopiés du code (guides, `FORMAT.md`, aides, messages), les fichiers qu'`ucm init` écrit chez le consommateur et trois hypothèses sans constante (casse des chemins, BOM, borne basse de la fenêtre).

L'écart bloquant est une promesse du guide des designers. Il dit que la mesure du rendu bloque la fusion, et aucun contrôle ne mesure le rendu.

## Méthode

Les relevés sont des scripts Node, rangés hors du dépôt dans le dossier `audit-p27` du brouillon de session. Chaque fiche cite la sortie ou la ligne qui la prouve.

| Script | Ce qu'il relève | Résultat |
|---|---|---|
| `litteraux.mjs` | littéraux de chaîne écrits dans les sources de deux paquets ou plus, hors commentaires | 1 189 littéraux sur 564 fichiers, 30 de sens métier relus |
| `codes-docs.mjs` | codes `Cnn` cités par la documentation vivante, face à `CODES_DES_CONSTATS` | 0 code inconnu (5 faux positifs dans des tracés SVG) |
| `symboles-docs.mjs` | symboles et chemins entre accents graves des `.md` vivants, absents du code | 7 symboles, dont 3 variables d'environnement et 2 noms de l'API Figma |
| `autorites.mjs` | symboles des phrases « Autorité » des invariants, absents de `packages/*/src` | 1 absent sur 198, plus 4 aides de test |
| `champs-format.mjs` et lecture du schéma | propriétés du schéma publié absentes de `FORMAT.md` | 19 sur 173 |
| `sorties-citees.mjs` | lignes de sortie citées en blocs `text` par les guides, retrouvées dans le code | 16 morceaux, aucun faux (les écarts sont des gabarits composés) |
| grep ciblés | BOM, séparateur décimal, dates, seuils, extensions, chemins de fichiers | cités dans les fiches |

## Carte de la chaîne

| Maillon | Écrit | Lit | Propriétaire de |
|---|---|---|---|
| UCM Palettes | variables primitives, recette | référentiel du kit, `ucm-couleur` | rampes et crans |
| UCM Architect | noms, scopes, alias, tokens du composant | référentiel, contrôles du kit | rien de publié ; il applique les règles du kit |
| Exporter et socle | `*.contract.json`, `tokens.json` | Figma, `ucm.config.json` du dépôt par `configurationDepuisJson` | forme publiée, via `CONTRACT_VERSION` et `TOKENS_FORMAT_VERSION` |
| Kit `@ucm-kit/core` | schéma généré, rapports | contrats, tokens, configuration | format, référentiel, fenêtre de lecture, juge du code |
| CLI `@ucm-kit/cli` | fichiers d'`ucm init`, `tokens.css`, `derogations.json`, `ci-report.md` | tout ce qui précède | commandes, gabarits du consommateur |
| Adaptateur TypeScript | types des variantes | code `.ts` et `.tsx` | parité, propriétés sans unité de React |
| Documentation et aides | rien | le code, à la main | rien ; chaque nombre ou nom y est une copie |
| Inventaire | `INVENTAIRE-UCM.html` | le kit compilé, le hub, les workflows | rien ; il relit ses sources par `releves.ts` |

## Ce qui est réglé

| Paramètre | Source | Garde |
|---|---|---|
| Version du contrat dans les contrats publiés | `CONTRACT_VERSION`, `packages/kit/src/format/version.ts:16` | import par `plugin-socle/src/composant/contract/publication.ts:42` et `plugin-exporter/src/code.ts:1215` |
| Version du format de tokens | `TOKENS_FORMAT_VERSION`, `packages/kit/src/format/tokens.ts:15` | import par `plugin-exporter/src/tokens/exportTokens.ts:1268`, `formatDeTokens.test.ts` |
| Schéma du contrat | généré de `types.ts` | `packages/kit/tests/schema.test.ts` |
| Kit embarqué par les plugins | `packages/kit/dist/.empreinte` | build des plugins, `tests/kitCompileAJour.test.mjs` |
| Pins de `@ucm-kit/core` | `packages/kit/package.json` | `tests/monorepoCoherent.test.mjs:84-100`, `tests/pinDocumente.test.mjs` |
| Nom CSS d'un token | `tokenCssVariable`, `packages/kit/src/format/names.ts:73` | seul constructeur de `--` du dépôt (grep), collisions par `nomsCssDesTokens` |
| Grammaire de `ucm.config.json` | `packages/kit/src/format/configuration.ts` | l'Exporter (`depot.ts:153`) et la CLI la lisent, `configuration.test.mjs:51-57` |
| Codes `C7` à `C82` | `CODES_DES_CONSTATS`, `packages/kit/src/controles/codes.ts` | `codesDesConstats.test.ts` ; `codes-docs.mjs` ne trouve aucun code inconnu |
| Listes du référentiel | `packages/kit/src/referentiel/` | `tests/referentielUnique.test.ts` |
| Règles dupliquées de l'audit du 30 octobre | propriétaires des lots U0 à U10 | `tests/reglesUniques.test.ts`, 48 exceptions nommées |
| Aides et caractéristiques | `CARACTERISTIQUES`, `kit/src/lecteurs/caracteristiques.mjs` | `packages/cli/tests/aides.test.mjs:56,61` |
| Écritures par défaut des aides | `PROPRIETES_PAR_FAMILLE` | `tests/ecrituresDesAidesJugees.test.mjs` |
| Extensions lues `.ts` et `.tsx` | `EXTENSIONS_LUES`, `adapter-typescript/src/usages.mjs:14` | `packages/cli/tests/deroger.test.mjs:163-165` |
| Fins de ligne de `.ucm/conventions.md` | `packages/cli/src/conventions.mjs:52` | CRLF ramené à LF avant la lecture |

## Fiches

### PP-01 · Le guide des designers promet une mesure du rendu

| | |
|---|---|
| Paramètre | ce qui bloque la fusion |
| Producteur | aucun contrôle ; le kit ne mesure pas le rendu |
| Lecteurs | le designer, par `docs/guides/POUR-LES-DESIGNERS.md` |
| Copies | `POUR-LES-DESIGNERS.md:223-226` (« La mesure automatique du rendu bloque », « un rendu que vous validez devient la capture de référence ») |
| Garde actuelle | aucune |
| Preuve | `VALIDATIONS-MVP.md:53` (« Aucun contrôle de contrat ne compare le rendu à Figma »), `:89` (« Aucun contrôle n'exerce le rendu »), `LINTER-UCM.md:26` (« Le comparateur de rendu s'en chargera ») ; grep de `capture`, `playwright`, `screenshot` dans `packages/cli/src`, `packages/kit/src/lecteurs` et l'adaptateur : rien |
| Cas | un développeur change la marge rendue par un `className` hors du contrat. Le designer croit la fusion gardée et ne relit pas le rendu |
| Promesse | Confiance |
| Gravité | bloquant |
| Garde proposée | une table des contrôles bloquants dans le kit (`verdict-bilan.mjs` sait déjà ce qui bloque), et un test qui refuse une phrase « … bloque » du guide sans entrée de la table |

### PP-02 · Les « quatre familles » du concept ne sont pas celles du linter

| | |
|---|---|
| Paramètre | familles d'écart qui bloquent |
| Producteur | `FAMILLES`, `packages/kit/src/lecteurs/controle-du-code-listes.mjs:18-23` (couleur, dimension, typographie, effet) |
| Lecteurs | juge du code, inventaire section 6, `docs/guides/LINTER-UCM.md:30` |
| Copies | `CONCEPT.md:134`, `POUR-LES-DESIGNERS.md:218`, `VALIDATIONS-MVP.md:164` (couleurs et tokens, dimensions et espacements, typographie, structure et ordre) |
| Garde actuelle | aucune |
| Preuve | les deux listes ont quatre entrées. L'effet (opacité, ombres, flous) bloque dans le linter et manque au concept. La structure vient de la parité de l'adaptateur, pas d'une famille |
| Cas | un agent lit `CONCEPT.md`, écrit une ombre en dur et la croit libre. Le linter la refuse |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | la phrase des trois documents cite les identifiants de `FAMILLES` plus la parité ; un test relit la phrase et compare la liste |

### PP-03 · Le workflow généré lance la CLI sans version

| | |
|---|---|
| Paramètre | version de `@ucm-kit/cli` chez le consommateur |
| Producteur | `versionDuPaquet()`, `packages/cli/src/init.mjs:179-183` |
| Lecteurs | relais `SKILL.md` (`init.mjs:296`), rappel `package.json` (`init.mjs:365`), `ucm guide` (`FICHIERS_EPINGLES`, `guide.mjs:47-52`) |
| Copies | `init.mjs:399` (`npx --yes @ucm-kit/cli "$@"`, repli sans `package.json`), `init.mjs:678` (job GitLab `rapport-gitlab`) |
| Garde actuelle | `tests/pinDocumente.test.mjs` lit les `.md`, pas les workflows générés |
| Preuve | `packages/cli/README.md:33` (« Pin an exact version ») ; `cli.test.mjs:759` ne vérifie le pin que dans le relais |
| Cas | le cas nominal de la recette n'a pas de `package.json`. Après une montée de la fenêtre de lecture, la CI rejuge les mêmes contrats avec un autre kit et passe au rouge sans commit |
| Promesse | Robustesse |
| Gravité | important |
| Garde proposée | écrire `@ucm-kit/cli@${version}` dans les deux lignes ; un test de `cli.test.mjs` refuse toute ligne `npx` des fichiers générés sans `@<version>` |

### PP-04 · Les seuils de contraste ont deux sources dans le kit et six copies

| | |
|---|---|
| Paramètre | seuils WCAG 4,5:1, 3:1 et 7:1 |
| Producteur | `SEUILS_PAR_USAGE` et `SEUIL_TEXTE_AAA`, `packages/kit/src/referentiel/contraste.ts:9-11` |
| Lecteurs | rôles de rendu, garanties de Palettes, planche du moteur |
| Copies | `SEUILS_D_ACCESSIBILITE`, `packages/kit/src/controles/accessibilite.ts:88-92` (seconde source, lue par C49 à C52) ; `kit/src/lecteurs/diagnostic-contrastes.mjs:234` (résumé écrit) ; `plugin-architect/src/ui/textes/nomenclature.ts:111` ; `plugin-palettes/src/i18n/fr.ts:1793` et `en.ts:1794` ; `plugin-palettes/src/planche/modele.ts:277` (`>= 4.5`) ; `docs/inventaire/releves.ts:213` |
| Garde actuelle | aucune ; `referentielUnique` relève les listes, pas les nombres |
| Preuve | grep de `4.5` dans `packages/*/src` |
| Cas | le seuil non-texte du référentiel passe à 3,5. Les garanties de Palettes suivent, C49 garde 3 et le rapport de `ucm check` écrit encore 3:1 |
| Promesse | Robustesse |
| Gravité | important |
| Garde proposée | `SEUILS_D_ACCESSIBILITE` dérivé de `contraste.ts` ; les textes interpolent le seuil ; une ligne de `reglesUniques` refuse `4.5`, `4,5:1` et `3:1` hors du référentiel |

### PP-05 · Un seuil s'écrit par trois fonctions

| | |
|---|---|
| Paramètre | écriture d'un seuil (« 4,5:1 ») |
| Producteur | aucun ; `ecrireContraste` (`kit/src/emplois/contraste.ts:78`) écrit une mesure, pas un seuil |
| Copies | `seuilEcrit`, `kit/src/lecteurs/diagnostic-contrastes.mjs:211` ; `seuilEnTexte`, `plugin-architect/src/ui/ignores/modele.ts:167` ; `seuilEcrit`, `plugin-palettes/src/i18n/fr.ts:496` et `en.ts:496` (arrondi à une décimale) |
| Garde actuelle | aucune |
| Cas | un seuil de 4,25 s'écrit « 4,25:1 » dans le rapport et « 4,3 » dans Palettes |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | `ecrireSeuil` exporté par `emplois/contraste.ts`, et une ligne de `reglesUniques` contre `String(seuil).replace('.', ',')` |

### PP-06 · La borne basse de la fenêtre de lecture s'écrit à la main

| | |
|---|---|
| Paramètre | `VERSION_CONTRAT_MINIMALE` |
| Producteur | `packages/kit/src/lecteurs/version-contrat.mjs:20`, `"13.0"` |
| Lecteurs | `verdictDeVersion`, `ucm check`, `docs/format/COMPATIBILITE.md:30-32` |
| Copies | la règle « la version courante et la précédente » de `COMPATIBILITE.md:32` et `CHANGELOG-FORMAT.md` |
| Garde actuelle | `packages/kit/tests/fenetre-de-lecture.test.mjs` exige des fixtures à la borne basse, pas une borne égale à la version précédente |
| Cas | `CONTRACT_VERSION` passe à `15.0` et la borne reste `13.0`. Tous les tests passent, la fenêtre compte trois versions, un contrat 13.0 est accepté |
| Promesse | Robustesse |
| Gravité | important |
| Garde proposée | un test lit les titres `## nn.0` de `CHANGELOG-FORMAT.md` et exige que la borne basse soit le titre qui précède `CONTRACT_VERSION`, sauf exception nommée |

### PP-07 · La version courante est recopiée dans la documentation et les tests

| | |
|---|---|
| Paramètre | `CONTRACT_VERSION`, `VERSION_DES_REGLES` |
| Copies | `docs/format/CHANGELOG-FORMAT.md:19` (« La version courante est la 14.0 », qui affirme que la constante est le seul endroit où elle s'écrit) ; `docs/guides/RECETTE.md:360` ; 9 littéraux `"14.0"` dans 7 fichiers de test (`cli/tests/check.test.mjs:19`, `verdictGit.test.mjs:23`, `kit/tests/caracteristiques.test.mjs:20`, `contrats-fabriques.mjs:100`, `controleRepository.test.mjs:37`, `diagnostic-architecture.test.mjs:165`, `diagnostic-contrastes.test.mjs:73,152,212`) ; `version: 1` dans `tests/fabriquesDeFichiers.ts` (`texteDesRegles`) |
| Garde actuelle | `apiPublique.test.mjs:205` exige un renvoi au changelog, pas la valeur |
| Cas | après la montée à 15.0, les tests jugent encore des contrats 14.0 et passent ; le changelog annonce 14.0 |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | un test compare la phrase du changelog à `CONTRACT_VERSION` et exige une section `## <CONTRACT_VERSION>` ; les fabriques de test importent la constante |

### PP-08 · `FORMAT.md` omet 19 propriétés du schéma publié

| | |
|---|---|
| Paramètre | champs du contrat et sens de leur absence |
| Producteur | `packages/kit/src/format/types.ts`, schéma généré |
| Lecteurs | agents du consommateur par `docs/format/FORMAT.md`, document portable |
| Copies absentes | `componentKey`, `contractPath`, `nodeName`, `variantName`, `preferredValues`, `key`, `settings`, `stretchChildOnInsert`, `displayEmptyByDefault`, `minChildren`, `maxChildren`, `allowPreferredValuesOnly`, `horizontal`, `vertical`, `topLeft`, `topRight`, `bottomRight`, `bottomLeft`, `nodeSuffix` |
| Garde actuelle | `tests/inventaireInvariants.test.ts` tient une liste manuelle `AUTORITES_FORMAT`, qui voit un nom disparaître mais pas un champ ajouté |
| Preuve | lecture des `properties` du schéma, 173 noms, 19 absents de `FORMAT.md` |
| Cas | un agent lit `settings.maxChildren` d'un slot et doit deviner si la borne s'impose au code |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | un test exige chaque propriété du schéma dans `FORMAT.md`, avec exceptions nommées |

### PP-09 · Nombres et listes du code recopiés en prose et dans l'inventaire

| | |
|---|---|
| Paramètre | bornes et listes que la documentation cite |
| Copies | `FORMAT.md:494` et `plugin-exporter/invariants/arbre-des-slots.md:4` (« 12 niveaux », `MAX_STRUCTURE_DEPTH`, `plugin-socle/src/composant/contract/structureTree.ts:35`) ; `FORMAT.md:1732` (groupes sans unité, `UNITLESS_GROUPS`, `exportTokens.ts:90`) ; `plugin-architect/SPEC.md:378` (« 2 000 layers », `BUDGET_DE_LAYERS_PAR_DEFAUT`, `budget.ts:19`) ; `AGENTS.md:124` et `RECETTE.md:453` (« huit fichiers ») ; `docs/inventaire/releves.ts:257` et `gabarit.html:578` (`C60`, `C63`, `C82`) |
| Garde actuelle | aucune |
| Preuve | `ucm init` écrit 8 fichiers en GitHub, 9 en GitLab, 5 ou 6 avec `--sans-agents`, plus les gabarits (`init.mjs:202-282`) |
| Cas | un neuvième fichier s'ajoute à `init` ; `AGENTS.md` et la recette restent à huit |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | `tests/nombresDocumentes.test.ts`, une table (document, motif, valeur calculée par import) |

### PP-10 · Chemins et adresses recopiés malgré une constante

| | |
|---|---|
| Paramètre | chemins des fichiers du consommateur |
| Copies | `FICHIERS_EPINGLES`, `packages/cli/src/guide.mjs:47-52`, recopie les chemins qu'`init.mjs:144,272,275-276` écrit ; `ci-report.md` en 10 lignes d'`init.mjs` (256 à 678) sans constante ; `src/generated/tokens.css` dans `init.mjs:371,373`, `packages/cli/README.md:344`, `docs/guides/RECETTE.md:66,170,171` ; `.ucm/derogations.json` en 4 messages (`controle-du-code-listes.mjs:313`, `controle-repository.mjs:475,502`, `deroger.mjs:96`) malgré `CHEMIN_DES_DEROGATIONS` (`derogations.mjs:12`) ; `ucm.config.json` en dur à `ucm.mjs:178` malgré `NOM_CONFIGURATION` ; `https://gitlab.com/api/v4` dans `cli/src/rapport-gitlab.mjs:33` et `plugin-exporter/src/forges/gitlab.ts:15` |
| Garde actuelle | aucune |
| Cas | le workflow GitHub change de nom dans `init`. `ucm guide` cesse de comparer son pin, sans message |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | `init.mjs` exporte ses chemins et `guide.mjs` les importe ; constantes `RAPPORT_CI` et `FEUILLE_DES_TOKENS` ; ligne de `reglesUniques` contre ces littéraux hors propriétaire |

### PP-11 · Le retrait du BOM est recopié 14 fois, et trois lectures l'oublient

| | |
|---|---|
| Paramètre | hypothèse implicite, encodage des JSON du consommateur |
| Producteur | aucun ; `retirerBom`, `kit/src/lecteurs/controle-du-code.mjs:60`, n'est pas exporté |
| Copies | 14 retraits dans 4 paquets : adaptateur `generation.mjs:82` ; CLI `guide.mjs:57`, `icons.mjs:23`, `tokens-css.mjs:514,614`, `tokens-references.mjs:179` ; kit `configuration.mjs:29`, `controle-du-code.mjs:60`, `controle-repository.mjs:110,1163,1300,1361`, `derogations.mjs:91` ; Exporter `depot.ts:145` |
| Lectures sans retrait | `packages/cli/src/deroger.mjs:58` (contrat), `init.mjs:357` (`package.json`), `init.mjs:378` (`tokens.json`) |
| Garde actuelle | aucune |
| Cas | un contrat enregistré avec BOM passe `ucm check`, et `ucm deroger` le déclare « illisible ». Un `package.json` avec BOM fait taire les rappels de pin et de script d'`ucm init` |
| Promesse | Robustesse |
| Gravité | important |
| Garde proposée | `lireJsonDuDepot(chemin)` exporté par `@ucm-kit/core/lecteurs` ; une ligne de `reglesUniques` refuse `JSON.parse(readFileSync(` hors du propriétaire |

### PP-12 · La casse d'un chemin change le verdict entre Windows et la CI

| | |
|---|---|
| Paramètre | hypothèse implicite, casse des chemins |
| Producteur | `implementationPresente`, `packages/kit/src/lecteurs/implementation.mjs:58-62`, par `existsSync` |
| Lecteurs | `controle-repository.mjs:162`, `rangs.mjs:44-52` (chemins Git) |
| Copies | `trouverContrats` compare `.contract.json` avec la casse (`trouver-contrats.mjs:20`), `check.mjs:144` et l'Exporter (`depot.ts:168`, `/i`) sans |
| Garde actuelle | aucune ; `implementation.test.mjs` n'éprouve pas la casse |
| Preuve | `existsSync` ignore la casse sous Windows et macOS, pas sous Linux. Une implémentation absente est un état d'avancement (`controle-repository.mjs:1021`), qui ne bloque pas |
| Cas | `button.tsx` implémente `Button.contract.json`. Le poste Windows mesure la parité ; la CI Linux dit « à implémenter » et ne mesure rien |
| Promesse | Robustesse |
| Gravité | important |
| Garde proposée | comparer le nom exact lu par `readdirSync` du dossier et rendre « présente sous une autre casse », bloquant partout ; un test avec un `existe` insensible à la casse |

### PP-13 · Deux constantes pour la frontière entre gris et coloré

| | |
|---|---|
| Paramètre | chroma 0,05 d'une référence |
| Producteur | `CHROMA_DES_GRIS`, `packages/couleur/src/palette.ts:138` (`C < 0.05`) |
| Copies | `CHROMA_DES_PALETTES_COLOREES`, `packages/couleur/src/alertes.ts:131`, lue en `C > 0.05` par Palettes (`harmonisation.ts:268`, `ordreDesPalettes.ts:22`, `carteRoue.ts:125`) et en `<=` par `alertes.ts:202` |
| Garde actuelle | `reglesUniques` refuse un `.C <= 0.0` en ligne, pas la seconde constante |
| Cas | une référence de chroma 0,05 n'est ni grise ni colorée. Une constante qui bouge seule ouvre une bande sans règle |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | une constante, `CHROMA_DES_GRIS`, et `estColoree` défini comme `!estReferenceGrise` |

### PP-14 · Textes du designer recopiés entre paquets

| | |
|---|---|
| Paramètre | textes destinés au designer |
| Copies | « UCM ne sait pas si cette palette met un texte blanc ou noir sur ses boutons. » dans `kit/src/controles/integrite.ts:452` et `plugin-architect/src/ui/textes/structure.ts:64` ; « Le composant a changé depuis l'analyse. » dans `kit/src/referentiel/signes.ts:430` et `plugin-architect/src/ui/textes/analyse.ts:69` ; « Votre design n'est pas en cause » dans `kit/src/lecteurs/diagnostic-parite.mjs:65` et deux filets d'`init.mjs` (506 écrit « ré-exporter », 671 « réexporter ») |
| Garde actuelle | aucune |
| Preuve | `litteraux.mjs`, phrases de plus de trois mots présentes dans deux paquets |
| Cas | la phrase du kit change ; Architect montre l'ancienne dans le panneau |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | Architect importe le texte du kit ; un test racine refuse une phrase de huit mots ou plus écrite dans deux paquets |

### PP-15 · Noms de collection écrits en ligne

| | |
|---|---|
| Paramètre | collection de destination des palettes |
| Producteur | `DESTINATION_DES_PALETTES`, `packages/kit/src/referentiel/architecture.ts:52` |
| Copies | `'primitives'` en défaut, `plugin-palettes/src/ui/destination.ts:240` ; `'brands'` et `'utility'`, `plugin-architect/src/ecriture/structure.ts:175` |
| Garde actuelle | `referentielUnique` relève une liste littérale, pas un nom seul |
| Cas | le référentiel renomme la destination ; l'écran de Palettes propose l'ancien nom |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | lecture de `DESTINATION_DES_PALETTES.collection` ; ligne de `reglesUniques` contre les noms de couche en littéral hors référentiel |

### PP-16 · Une autorité d'invariant ne vise plus rien

| | |
|---|---|
| Paramètre | autorités citées par les invariants |
| Copies | `packages/plugin-architect/invariants/explorateur.md:46` cite `mapping.ts` `rolesAdmis` ; la fonction s'appelle `rolesAdmisDuLayer` (`packages/kit/src/controles/mapping.ts:41`) |
| Garde actuelle | `tests/inventaireInvariants.test.ts:493` ne vérifie que la liste manuelle `AUTORITES` |
| Preuve | `autorites.mjs` : 198 symboles, 1 absent |
| Cas | un agent cherche `rolesAdmis` pour modifier la règle C17 et ne la trouve pas |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | le test relit chaque phrase « Autorité » des invariants au lieu de la liste manuelle |

### PP-17 · Les commandes de la CLI sont recopiées sans test

| | |
|---|---|
| Paramètre | commandes et options de `ucm` |
| Producteur | `COMMANDES`, `packages/cli/src/ucm.mjs:48-134` |
| Lecteurs | `packages/cli/README.md`, `procedure.md`, aides, skills `consommer-contrat` et `regler-le-linter`, workflows générés |
| Copies | usage d'`init` en trois copies (`ucm.mjs:51`, `ucm.mjs:199`, `README.md:71-79`) ; `github\|gitlab` en trois (`init.mjs:141`, `ucm.mjs:51,59`, README) ; `--verifier` dans `aides/resolution-token.md:24,32` et `README.md:325` ; défauts de `--components` et `--implementation` dans `README.md:75-77` |
| Garde actuelle | `cli.test.mjs:859` vérifie deux mots de `--help` |
| Preuve | toutes les commandes citées existent aujourd'hui ; `-h` n'est pas documenté ; `ucm tokens <faute>` lance `tokens css` (`ucm.mjs:239`) ; codes de sortie 0, 1, 2 sans constante |
| Cas | `--verifier` devient `--check`. L'aide lue par l'agent garde l'ancien nom, et aucun test ne rougit |
| Promesse | Confiance |
| Gravité | important |
| Garde proposée | un test extrait chaque `ucm <commande> --option` des `.md` du paquet, des aides et des skills, et le confronte à `COMMANDES` ; l'usage d'`init` vient de `COMMANDES` |

### PP-18 · La liste des propriétés sans unité de React est figée sur 18.3.1

| | |
|---|---|
| Paramètre | propriétés de style sans `px` |
| Producteur | `react-dom`, recopié dans `PROPRIETES_SANS_UNITE_DE_REACT`, `packages/adapter-typescript/src/usages.mjs:23-31` |
| Garde actuelle | `adapter-typescript/tests/usages.test.mjs:56` éprouve la copie, pas sa source |
| Cas | un consommateur en React 19 (l'exemple d'`init.mjs:318`) reçoit le comportement de React 18 si la liste a changé |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | un test lit `isUnitlessNumber` du `react-dom` installé en devDependency et compare |

### PP-19 · Le séparateur décimal se lit et s'écrit sans paire nommée

| | |
|---|---|
| Paramètre | hypothèse implicite, segment `0,5` |
| Producteur | `nom`, `packages/kit/src/referentiel/reference.ts:90` |
| Lecteurs | `nombre`, `kit/src/controles/structure.ts:456-460` ; `tokenCssVariable` (`0,5` devient `0-5`, `names.ts:71`) |
| Copies | conversions de saisie, `plugin-palettes/src/configuration.ts:56`, `ui/couleur/formats.ts:77` |
| Garde actuelle | `names.test.ts` pour la projection ; aucune pour l'aller-retour |
| Cas | un segment `0.5` écrit à la main dans Figma se lit comme `0,5` par `nombre` et devient le même nom CSS |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | `segmentDeNombre` et `nombreDuSegment` exportés côte à côte, avec un test d'aller-retour |

### PP-20 · « Famille » porte au moins six sens

| | |
|---|---|
| Paramètre | vocabulaire |
| Sens relevés | familles d'écart du concept (`CONCEPT.md:134`) ; familles du linter (`controle-du-code-listes.mjs:18`) ; `Constat.famille`, 9 valeurs (`kit/src/controles/constat.ts:41`) ; `FAMILLES_BRANDS` (`integrite.ts:735`) ; `FAMILLES_DE_TEINTE` (`plugin-palettes/src/familles.ts:7`) ; `FamilleDeLayout` (`corrections.ts:369`) ; familles de police (`plugin-exporter/src/tokens/familles.ts`) |
| Autres collisions | « état » (axe d'états, état de l'adaptateur `adaptateur.mjs:16`, état de la marque des tokens `tokens.ts:155-159`) ; « cran » (nuance, et « se referme d'un cran », `COMPATIBILITE.md:74`) ; « rang » (rang Git, `rangs.mjs`, et rang d'un terme, `FORMAT.md:355`) ; « export » (le geste, et le champ `export` d'une dérogation) |
| Garde actuelle | aucune |
| Cas | PP-02 en est la conséquence |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | qualifier chaque sens dans `referentiel/lexique.ts` ; un motif de `controle-style.mjs` signale « famille » sans complément dans les guides |

### PP-21 · Le hub abandonné reste relié

| | |
|---|---|
| Paramètre | périmètre du monorepo |
| Liens | workspaces `packages/*` (`npm test` lance ses tests) ; `scripts/vues.mjs:40-41` régénère `HUB-UCM.html` ; `docs/inventaire/releves.ts:50` importe `recetteDeDemonstration` ; `scripts/construire-plugin.mjs:33` ; exceptions de `referentielUnique.test.ts:121` et `reglesUniques.test.ts:33,97` ; `AGENTS.md` le liste |
| Garde actuelle | sans objet |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | selon la décision du mainteneur ; une fois sorti, un test refuse un import de `packages/hub` |

### PP-22 · `ucm init` lit des gabarits qu'aucun adaptateur ne publie

| | |
|---|---|
| Paramètre | gabarits de la stack |
| Producteur | aucun ; `adaptateur.cheminGabarits` n'existe pas dans `packages/adapter-typescript/src` |
| Lecteurs | `gabaritsDe`, `packages/cli/src/init.mjs:335-342` |
| Copies | `packages/cli/README.md:111`, `ucm.mjs:57`, exemple d'`init.mjs:320` |
| Garde actuelle | `cli.test.mjs:775-780` fabrique un faux adaptateur |
| Promesse | Confiance |
| Gravité | mineur |
| Garde proposée | un type `AdaptateurUcm` dans le kit, que l'adaptateur implémente et que la CLI lit |

### PP-23 · `engines: node >=20` n'est jamais éprouvé

| | |
|---|---|
| Paramètre | version de Node |
| Producteur | `engines` de `packages/kit`, `packages/cli` et `packages/adapter-typescript`, `package.json:12-13` |
| Copies | `node-version: 22` dans `.github/workflows/ci.yml:33,73` et `publish.yml:76` ; `node-version: 22` et `node:22` dans les workflows générés (`init.mjs:471,618,648`) |
| Garde actuelle | aucune |
| Cas | une API de Node 22 entre dans le kit ; un consommateur en Node 20 casse, la CI reste verte |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | `tests/monorepoCoherent.test.mjs` compare `engines` aux versions des workflows |

### PP-24 · Les fichiers d'`ucm init` supposent la forme par défaut

| | |
|---|---|
| Paramètre | `tokens` de `ucm.config.json`, schéma installé |
| Copies | `.gitattributes` écrit `tokens.json text eol=lf` en dur (`init.mjs:224`) ; `.vscode/settings.json` vise `./node_modules/@ucm-kit/core/schema/...` (`init.mjs:240`) ; défaut `sourceTokens = "tokens.json"` (`kit/src/lecteurs/diagnostic-tokens.mjs:29`) |
| Garde actuelle | aucune |
| Cas | `ucm init --tokens design` écrit `design/tokens.json` dans la configuration, et `.gitattributes` protège un fichier qui n'existe pas. Le dépôt sans `package.json` du cas nominal n'a pas de `node_modules`, et l'éditeur ne valide aucun contrat |
| Promesse | Robustesse |
| Gravité | mineur |
| Garde proposée | `.gitattributes` construit depuis la configuration écrite ; `ucm init` signale le schéma absent ; test sur les deux cas |

## L'audit du 30 octobre

L'audit `docs/notes/Archives/Règles dupliquées/AUDIT-REGLES-DUPLIQUEES.md` relevait 29 règles dupliquées en code. Ses questions Q-01 à Q-11 sont tranchées. Le README de l'archive les marque « retenue », et le plan `docs/notes/Archives/UCM Architect/8 Intégrité de la structure/PLAN-IMPLEMENTATION.md:39-49` donne chaque réponse. Les lots U0 à U10 sont cochés (55 cases U), et `tests/reglesUniques.test.ts` cite 21 fiches. Il reste les cases T1 à T5 (recette Figma) et C1 du plan.

La mémoire qui dit ces questions en attente est donc périmée.

P27 étend l'audit au-delà du code. Les copies trouvées ici sont des textes, des nombres en prose, des chemins et des hypothèses sans constante, que `reglesUniques` ne voit pas parce qu'elle cherche des fonctions recopiées.

## Questions au mainteneur

- PP-01, rendu dans le guide des designers. Options : (a) retirer les deux phrases et dire que le rendu n'est pas contrôlé, avec renvoi à `VALIDATIONS-MVP.md` ; (b) les garder au futur avec renvoi à la piste du comparateur de rendu. Recommandation : (a), parce que le guide décrit ce qui bloque aujourd'hui.
- PP-02, familles d'écart. Options : (a) la phrase cite les quatre familles du linter et la parité, générée ou testée ; (b) l'effet rejoint « couleurs et tokens » et la phrase garde quatre familles. Recommandation : (a), un seul propriétaire, `FAMILLES`.
- PP-03, CLI sans version. Options : (a) le repli écrit `@ucm-kit/cli@<version>` ; (b) le repli suit la dernière version publiée. Recommandation : (a), comme le README l'exige.
- PP-06, borne basse. Options : (a) la borne se calcule depuis `CHANGELOG-FORMAT.md` ; (b) elle reste écrite et un test la compare à la version précédente. Recommandation : (b), la constante reste lisible sans le changelog.
- PP-12, casse. Options : (a) « présente sous une autre casse » bloque partout ; (b) un avertissement seulement. Recommandation : (a), pour que Windows et la CI rendent le même verdict.
- PP-04, seuils. Options : (a) `SEUILS_D_ACCESSIBILITE` dérive du référentiel ; (b) le référentiel importe la table des contrôles. Recommandation : (a), le référentiel est la source déclarée.
- PP-08, `FORMAT.md`. Options : (a) un test exige chaque propriété du schéma, exceptions nommées ; (b) une annexe des champs générée depuis `types.ts`. Recommandation : (a), le sens d'une absence ne se génère pas.
- PP-20, « famille ». Options : (a) chaque sens reçoit un complément dans les textes, et un signal de style ; (b) `Constat.famille` devient `rubrique`. Recommandation : (a), sans renommage publié.
- PP-21, hub. Options : (a) sortir le hub du workspace, de `npm run vues` et de l'inventaire ; (b) le garder comme démonstration. Recommandation : (a), puisqu'il est abandonné.
- PP-23, Node. Options : (a) `engines` passe à `>=22` ; (b) un job CI en Node 20. Recommandation : (a), le cycle de maintenance de Node 20 est clos.
- `parametres.json`. Options : (a) un test racine lit l'inventaire et refuse une copie sans garde ni écart ouvert ; (b) l'inventaire reste documentaire. Recommandation : (a), après la correction des écarts importants. Le fichier demande alors une entrée au registre de `.agents/domiciles.json`.

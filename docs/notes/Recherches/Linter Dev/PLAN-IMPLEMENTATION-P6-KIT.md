# Plan d’implémentation de P6 dans le kit

Ce plan livre le linter du premier lot de P6 côté toolkit. Le kit juge, avec
`preparerControle`. L’adaptateur TypeScript lit le code, avec `releverUsages`.
Le plugin ESLint du développeur appelle les deux et affiche les constats.
`ucm check` les juge ensuite par la règle du dernier modifié, et l’inventaire
affiche toutes les règles. Le [cadrage](./RECHERCHE-CADRAGE-P6.md) porte la
conception, les décisions D1 à D14 et la section « Choix fondamentaux ». Aucun
lot de code n’est commencé.

| Lot | Contenu | Dépend de |
|---|---|---|
| 0 | Décisions et exemples d’échange | rien |
| 1 | Écriture des références `"var(--nom-exact)"` dans les aides et `ucm guide` | rien, à livrer avant les réimplémentations v14 du mainteneur |
| 2 | Juge du kit et extracteur de l’adaptateur, sans publication | lot 0 |
| 3 | Essai, deux prises, publication unique | lot 2 |
| 4 | Constats du code dans le verdict d’`ucm check` | lot 3 |
| 5 | Toutes les règles dans l’inventaire | partie `ucm check` : rien ; partie linter : lot 2 |

Les chemins partent de la racine du toolkit. Une case se coche avec le hash du
commit qui la livre. Une case de décision porte le choix du mainteneur.

## Agents

| Travail | Agent |
|---|---|
| Conception, décisions, textes pour le mainteneur, fichiers d’agents, relecture des diffs, commit, publication | conversation principale (Opus) |
| Sous-lot au périmètre fixé | `implementeur` (Sonnet), ou Codex, même rôle |
| Règle, cas limites, plusieurs lecteurs d’une même règle | `implementeur-exigeant` (Sonnet), ou Codex, même rôle |
| Version, pin, archive, remplacement listé | `executant` (Haiku), ou Codex, même rôle |
| `npm test`, `npm run typecheck`, `npm run build`, `npm run agents:diff`, `npm run vues` | `verificateur` (Haiku) |

Un appel d’agent réalise un sous-lot. Au plus deux agents travaillent à la fois.
Le prompt d’un implémenteur contient la section du cadrage que le sous-lot
cite, la nature de la tâche, la sortie de `npm run agents:lire -- <chemins du
sous-lot>`, les fichiers et les critères de fin. La conversation principale
relit chaque diff, fait relancer les vérifications par un `verificateur`, lance
`npm run agents:diff` et commite par chemins explicites. Aucun agent ne lance
`test:ui`.

## Lot 0. Décisions et exemples d’échange

- [x] 0.1 Décision du mainteneur. Valeurs neutres (D6) : liste A, `0`, `none` et `fit-content`.
  - Le corpus Playground écrit `0` dans `Button.tsx:254` et `:260`, `none` dans `Button.tsx:252`, `:253` et `TileLink.tsx:68`, `fit-content` dans `Button.tsx:248-249`, `StressTest.tsx:222-223` et `Alert.tsx:78`. FORMAT.md lit l’absence de dimensionnement d’un slot comme un `fit-content` (lignes 620 à 626).
  - Liste B, écartée : A, plus `auto`, `inherit`, `transparent` et `currentColor`, qu’aucun composant du corpus n’écrit.
  - Choix du mainteneur : A. Une valeur neutre passe dans toutes les propriétés des trois familles, donc chaque valeur ouvre un trou partout. Ajouter une valeur coûte une phrase et ne casse rien. En retirer une fait apparaître des erreurs dans du code existant.
  - Après le lot 2, `controle-du-code-listes.mjs` fait autorité sur ces valeurs, et ce plan n’est plus relu pour elles.
- [x] 0.2 Décision du mainteneur. L’explication pour le mainteneur vit dans un nouveau guide, `docs/guides/LINTER-UCM.md`, « vraiment bien écrit pour que ce soit très simple à comprendre, et avec le moins de texte possible ».
- [x] 0.3 Décision du mainteneur. Les mots-clés que le contrat publie en clair (`stretch`, `uppercase`, `center`) comptent comme valeurs publiées. Tout réglage d’une liste monte le chiffre du milieu du kit.
- [x] 0.4 Décision du mainteneur. Réalisation (b) avec un seul extracteur. La lecture du code vit une fois, dans `@ucm-kit/adapter-typescript`, et sert le plugin ESLint comme `ucm check`. Le juge reste dans le kit.
- [x] 0.5 Décision du mainteneur. Écriture par défaut des références : `"var(--nom-exact)"` en toutes lettres, sans fonction de traduction. L’agent écrit `"{chemin}"` comme le contrat, puis lance `npx ucm tokens references <fichiers>`, qui remplace chaque référence par son nom exact. Ni l’agent ni `ucm guide` ne calculent ou ne listent les noms.
- [x] 0.6 Décision du mainteneur. La chaîne d’un fichier d’implémentation qui ressemble à une valeur visuelle est jugée où qu’elle soit (définition au cadrage, §7).
- [ ] 0.7 Conversation principale, avec le développeur. Faire relire les exemples d’échange du [cadrage, §6](./RECHERCHE-CADRAGE-P6.md#6-la-séparation-entre-kit-adaptateur-et-module). Obtenir la forme d’écriture des styles d’intencial-library (cadrage, §12, première question). Commit : `…`
  - Fichiers proposés : `packages/kit/src/lecteurs/controle-du-code.mjs`, `packages/kit/src/lecteurs/controle-du-code-listes.mjs` et `packages/adapter-typescript/src/usages.mjs`. `npm run agents:domicile -- <chemin>` rend `packages/plugin-exporter/invariants/diagnostics.md` pour les deux premiers.
  - Fin : le développeur confirme que le plugin se réduit à l’appel du cadrage, §6. La forme des styles est écrite dans le cadrage. Une forme hors des objets `style` rouvre le choix de l’extracteur avant le lot 2.

## Lot 1. Écriture des références dans les aides et le guide

Ce lot ne touche que la CLI. Il se livre avant les réimplémentations v14 du
mainteneur, et sa CLI doit être celle que Playground épingle à ce moment
(correction 7). Note de conception : cadrage, §8.

- [ ] 1.1 `implementeur-exigeant`. Aides et rendu du guide. Commit : `…`
  - `packages/cli/aides/composant.md`, ligne 34 : remplacer « Chaque référence `{chemin.du.token}` reste écrite en toutes lettres. » par « Chaque référence reste écrite en toutes lettres, sous la forme que l’aide `resolution-token` donne. »
  - `packages/cli/aides/resolution-token.md` : ajouter une section « Écriture par défaut ». L’agent écrit chaque référence comme le contrat, `"{chemin}"`, puis lance `npx ucm tokens references <fichiers>`, qui la remplace par `"var(--nom)"`. Le code ne contient aucune fonction qui traduit un chemin en nom. La section « Preuve » ajoute `npx ucm tokens references --verifier <fichiers>`. L’aide sort ainsi de la liste `ANCRAGES` de `packages/cli/tests/aides.test.mjs` (lignes 15 à 25).
  - `packages/cli/src/guide.mjs`, `aidesDuContrat` (ligne 176) : avec `ecritures-par-defaut: non` et sans section `## resolution-token`, l’aide reste listée sous « Non tranché : demander au développeur », comme un ancrage. La règle nomme l’aide, comme le cas de `composant` à la ligne 182.
  - Nouvelle commande `ucm tokens references <fichiers…>`, dans `packages/cli/src/tokens-references.mjs`, appelée par la branche `tokens` de `packages/cli/src/ucm.mjs` (ligne 217), avec son aide de commande. Elle lit `tokens.json` par `lireConfiguration` et `indexerTokensDtcg`, et calcule chaque nom par `tokenCssVariable`. Elle ne recopie aucune règle de nom.
    - Elle remplace chaque chaîne entre guillemets dont tout le contenu est une référence, `"{chemin}"` ou `'{chemin}'`, par `"var(--nom)"`, en gardant les guillemets d’origine. Une référence prise dans une chaîne plus longue ou dans un gabarit n’est pas touchée, et la commande la signale.
    - Une référence absente de `tokens.json` n’est pas remplacée. La commande la nomme avec son fichier et sa ligne, et sort en erreur.
    - Deux chemins qui donnent le même nom CSS arrêtent la commande avant toute écriture, comme `ucm tokens css` (`packages/cli/src/tokens-css.mjs`, ligne 325).
    - Un second passage ne change rien. Le fichier n’est réécrit que s’il change.
    - `--verifier` n’écrit rien et sort en erreur s’il reste une référence à remplacer. C’est la commande de la « Preuve » de l’aide.
  - `ucm guide` n’imprime aucune liste de noms CSS.
  - L’aide `modes` (« ne déclare aucune variable de token ») reste vraie et ne change pas.
  - Fin : les cas G1 à G8 de la section [Cas de test](#cas-de-test) passent dans `packages/cli/tests/guide.test.mjs`, `aides.test.mjs`, `commande-aides.test.mjs` et le nouveau `packages/cli/tests/tokens-references.test.mjs`, sur des fichiers fabriqués dans un dossier temporaire.
- [ ] 1.2 `executant`, `verificateur`, puis conversation principale. Monter le dernier chiffre de `@ucm-kit/cli`, vérifier, commiter, publier la CLI seule selon `publier-paquets`. Commit : `…`
  - Fin : `npm view @ucm-kit/cli@<version> version` rend la version. Le mainteneur reçoit le numéro pour la correction 7.

`.agents/skills/consommer-contrat/SKILL.md` ne change pas. Elle fait lire le
guide et ses aides, donc elle reçoit la nouvelle écriture et la commande.

## Lot 2. Juge et extracteur, sans publication

Note de conception : cadrage, §6 et §7. Le lot ne touche à aucune prise. Il
monte les versions comme le demande `tests/versionSuitLeContenu.test.mjs`, sans
publier. Une version montée et jamais publiée laisse un numéro vide au registre.

- [ ] 2.1 `implementeur`. Écrire `packages/kit/src/lecteurs/controle-du-code-listes.mjs` et `packages/kit/tests/controle-du-code-listes.test.mjs`. Commit : `…`
  - `VALEURS_NEUTRES` : une entrée par ligne, `{ valeur, raison }`, avec la liste A. La raison est une phrase en mots simples.
  - `PROPRIETES_PAR_FAMILLE` : une entrée par ligne, `{ propriete, familles, raison }`. Liste initiale, que ce fichier remplace comme autorité :
    - couleur : `color`, `background`, `background-color`, `border-color`, `outline-color`, `fill`, `stroke`, `text-decoration-color` ;
    - dimension et espacement : `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height`, `padding` et ses quatre côtés, `gap`, `row-gap`, `column-gap`, `border-radius` et ses quatre coins, `border-width`, `outline-width`, `outline-offset`, `top`, `right`, `bottom`, `left`, `inset`, `grid-template-columns`, `grid-template-rows` ;
    - couleur, dimension et espacement : `border`, `outline`, `box-shadow` ;
    - typographie : `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `text-transform`, `font-variant-caps`, `text-decoration`, `text-decoration-line`, `font-style`, `text-wrap-style`, `text-box`, `text-align`, `text-indent`, `line-clamp`, `-webkit-line-clamp`.
  - Le test refuse une entrée sans raison, une valeur ou une propriété en double, une famille hors des trois, et une valeur écrite autrement qu’en minuscules sans espace de bord.
  - Fin : `npm run test --workspace @ucm-kit/core` passe. Aucun autre fichier du dépôt n’écrit ces valeurs.
- [ ] 2.2 `implementeur-exigeant`. Écrire `packages/kit/src/lecteurs/controle-du-code.mjs` et `packages/kit/tests/controle-du-code.test.mjs` : la préparation et les deux questions. Commit : `…`
  - `preparerControle(fichier, { racine, variablesDuFichier })` relit à chaque appel `ucm.config.json` (`lireConfiguration`), les contrats (`trouverContrats`), le contrat associé et `tokens.json`. Elle ne garde rien d’un appel à l’autre. L’association appelle `cheminImplementation` sans recopier son calcul. La forme pure `preparerControleDepuis` porte le calcul et reste hors de `lecteurs/index.mjs`.
  - `chaine(texte)` juge les citations, `{chemin}` sans projection et `var(--nom[, repli])` par `tokenCssVariable`, puis les valeurs visuelles selon la définition du cadrage, §7.
  - `declaration(propriete, valeur)` juge les parties `var(…)` comme `chaine`, puis chaque autre partie par famille, avec les valeurs neutres et les valeurs publiées par le contrat.
  - `CODES_DU_CONTROLE_DU_CODE` est une table gelée, une entrée par code : `{ code, regle, niveau, raison }`. Les messages en dérivent, et l’inventaire la lit (lot 5).
  - Fin : les cas C1 à C24 passent. Aucun nœud ESLint, TypeScript ou PostCSS n’entre dans le kit. Le kit n’exécute aucun code et ne propose aucun remplacement.
- [ ] 2.3 `implementeur-exigeant`. Écrire `packages/adapter-typescript/src/usages.mjs`, sa déclaration, la porte `./usages` dans `exports`, et `packages/adapter-typescript/tests/usages.test.mjs` sur des `.tsx` fabriqués dans le test. Commit : `…`
  - `releverUsages(texte, nomDuFichier)` passe par `ts.createSourceFile`, sans programme ni vérificateur de types. Il rend `chaines`, `declarations`, `variables` et `lecture`, avec les décalages `debut` et `fin` dans le texte (cadrage, §6).
  - La normalisation React vit ici : `backgroundColor` devient `background-color`, `WebkitLineClamp` devient `-webkit-line-clamp`, un nombre reçoit `px` sauf pour les propriétés sans unité de React (liste recopiée de React avec sa source en commentaire, seule copie du dépôt), et une expression donne `null`.
  - `usages.mjs` n’importe pas le kit. Il lit la syntaxe et ne juge rien.
  - Fin : les cas E1 à E10 passent. `parite.mjs` est inchangé.
- [ ] 2.4 `implementeur`. Exposer `preparerControle` et `CODES_DU_CONTROLE_DU_CODE` par `packages/kit/src/lecteurs/index.mjs` et `index.d.mts`, sans toucher à `src/modules/`. Ajouter les lignes de `packages/kit/CARTE.md` et de `packages/adapter-typescript/CARTE.md`, et les invariants dans `packages/plugin-exporter/invariants/diagnostics.md`. Charger `rediger-pour-agents` avant d’écrire les cartes et les invariants. Commit : `…`
  - Invariants : une règle par puce, avec `Autorité :` et `Tests :`. Une puce dit que les deux listes vivent seulement dans `controle-du-code-listes.mjs`. Une autre dit que `releverUsages` est la seule lecture du code pour le linter.
  - Fin : `npm run agents:diff` ne liste aucun document resté faux.
- [ ] 2.5 `executant` puis `verificateur`. Monter le dernier chiffre du kit et de l’adaptateur, puis les pins et le dernier chiffre de la CLI, selon `publier-paquets`. Ne rien publier. Le `verificateur` lance `npm run agents:diff`, `npm test`, `npm run typecheck`, `npm run build` et `npm run vues`. La conversation principale relit le diff et commite. Commit : `…`
  - Fin : les commandes passent, `versionSuitLeContenu` compris. `packages/kit/src/modules/index.mjs` est inchangé.

## Lot 3. Essai, deux prises et publication unique

Le juge et l’extracteur sortent sur npm une seule fois, à la fin de ce lot.

- [ ] 3.1 `executant`. Préparer les archives d’essai depuis le commit du lot 2. Commit : aucun.
  - Copier `packages/kit` dans le dossier temporaire de la session. Dans la copie seulement, republier `preparerControle` dans `src/modules/index.mjs` et `index.d.mts`, et poser la version `<version du lot 2>-essai.1`.
  - Lancer `npm pack` sur la copie du kit, puis sur `packages/cli` et `packages/adapter-typescript`, du même commit.
  - Remettre au développeur les trois archives, la recette d’installation du cadrage, §9, et l’esquisse du plugin du cadrage, §6.
  - Fin : dans un repository temporaire installé selon la recette, `npm ls @ucm-kit/core` montre une seule version, et les deux imports du plugin se résolvent. `git status` du toolkit ne montre aucun changement.
- [ ] 3.2 Conversation principale, avec le développeur. Essai sur les composants repris dans intencial-library, sur une branche d’essai jamais fusionnée. Commit : `…` (cadrage seul).
  - Le développeur rend un tableau : fichier, constats par code, usages non analysés, lectures incomplètes, faux positifs, temps d’analyse dans l’éditeur.
  - La conversation principale classe chaque écart : défaut du juge, défaut de l’extracteur, ou valeur neutre à décider par le mainteneur.
  - Fin : le cadrage porte le tableau et la liste des ajustements.
- [ ] 3.3 `implementeur-exigeant`. Appliquer les ajustements de 3.2, puis ouvrir les deux prises. Commit : `…`
  - Kit : republier `preparerControle` dans `packages/kit/src/modules/index.mjs` et `index.d.mts`. Ajouter à `packages/kit/tests/prise-exemples.mjs` les exemples des trois échanges du cadrage, §6, et un exemple qui passe chaque entrée de `VALEURS_NEUTRES` et de `PROPRIETES_PAR_FAMILLE` à `declaration`, avec leurs résultats dans `prise-attendus.json`. Écrire l’entrée `### ajout` de `packages/kit/CHANGELOG.md`.
  - Adaptateur : créer `packages/adapter-typescript/CHANGELOG.md`, avec l’entrée `### ajout` de `releverUsages`. Écrire `packages/adapter-typescript/tests/usagesPromis.test.mjs` selon la règle de la section [Ajout à la décision d’API](#ajout-à-la-décision-dapi). Autoriser l’import de `@ucm-kit/adapter-typescript/usages` dans `tests/modulesParLaPrise.test.mjs`.
  - Ajouter à `docs/guides/MODULES.md` les deux imports, l’appel complet, les résultats et les limites. Mettre à jour `packages/kit/README.md` et `packages/adapter-typescript/README.md`.
  - Fin : tous les cas de test passent encore, et les cas révélés par l’essai y sont ajoutés.
- [ ] 3.4 Conversation principale. Écrire la skill `.agents/skills/regler-le-linter/SKILL.md` et le guide `docs/guides/LINTER-UCM.md`, et transmettre le texte de l’ajout à `DECISION-API-PUBLIQUE.md` à la conversation qui l’applique. Commit : `…`
  - Skill : charger `rediger-pour-agents`. Sa description se déclenche sur « ajoute `auto` aux valeurs neutres » ou « retire `border` de la famille couleur ». Elle porte le geste dont la section [Régler une liste du linter](#régler-une-liste-du-linter) décrit la conception, et en devient l’autorité.
  - Guide : ce que le linter vérifie, ce qu’il ne voit pas, ce qui se règle, et la phrase à dire à un agent. Le moins de texte possible. Il nomme le fichier des listes sans recopier leurs valeurs, et renvoie à la skill en une ligne.
  - En-tête de `controle-du-code-listes.mjs` : une ligne qui renvoie à la skill.
  - Registre : les motifs `.agents/skills/*/**` et `docs/guides/**` du registre de `.agents/domiciles.json` couvrent déjà les deux fichiers. Ajouter la skill et le guide aux `lies` du domaine `diagnostics`. Ajouter une ligne au tableau des skills d’`AGENTS.md`. Le dépôt n’a pas de dossier `.claude/skills/`, donc aucune copie.
  - Fin : le mainteneur dit qu’il comprend chaque phrase du guide. Un agent sans contexte qui reçoit « ajoute `auto` aux valeurs neutres » trouve la skill dans le tableau d’`AGENTS.md` et fait le geste sans autre lecture.
- [ ] 3.5 `executant`, `verificateur`, puis conversation principale. Monter le dernier chiffre du kit et de l’adaptateur (ajouts aux prises) et de la CLI, les pins et les versions citées par la documentation. Vérifier, commiter, publier le kit, puis la CLI, puis l’adaptateur, selon `publier-paquets`. Commit : `…`
  - Fin : `npm view` rend les trois versions. Le développeur reçoit les trois numéros à épingler.

## Lot 4. Constats du code dans le verdict d’`ucm check`

Ce lot suit l’essai. L’extraction existe déjà depuis le lot 2. Il reste à
brancher les constats dans le verdict. Note de conception : cadrage, §9.

- [ ] 4.1 Conversation principale. Note de conception dans le cadrage : forme de l’état d’un composant, noms des états ajoutés, comparaison du rang des tokens au rang du code. Commit : `…`
  - L’état reste une donnée que `verdictDeLaDemande` calcule : `etat`, `constats`, `bloquant`, et pour chaque règle du code ses écarts, ses usages non analysés et l’état de lecture. Le rapport et le terminal la mettent en phrases, sans la recalculer.
  - Aucun nom n’entre dans la prise pour cette donnée (décision d’API, question 1).
- [ ] 4.2 `implementeur-exigeant`. `AdaptateurDImplementation` (`packages/kit/src/lecteurs/index.d.mts`, ligne 403) gagne une fonction facultative, `releverUsages`. `controlerRepository` lit chaque fichier d’implémentation, appelle l’extracteur puis le juge, et passe les constats à `verdictDeLaDemande`. Tests : un cas par ligne V-01 à V-20 touchée dans `packages/kit/tests/verdict-demande.test.mjs`, et `controleRepository.test.mjs`. Commit : `…`
- [ ] 4.3 `implementeur`. `packages/cli/src/adaptateur.mjs` (lignes 38 à 42) accepte l’adaptateur avec ou sans `releverUsages`. Lignes du rapport et du terminal. Tests dans `packages/cli/tests/check.test.mjs`. Commit : `…`
- [ ] 4.4 Conversation principale. Table du §6 de `docs/guides/POUR-LES-DESIGNERS.md`, `docs/guides/LINTER-UCM.md`, invariant de `diagnostics.md`, ligne CI de la frontière. Commit : `…`
- [ ] 4.5 `executant`, `verificateur`, puis conversation principale. Versions, vérifications, commit, publication du kit, de la CLI et de l’adaptateur. Commit : `…`
  - Fin : le job ESLint de la CI d’intencial-library cesse de bloquer. Le verdict de la CI vient d’`ucm check` seul.

## Lot 5. Toutes les règles dans l’inventaire

L’inventaire (`INVENTAIRE-UCM.html`, généré depuis `docs/inventaire/` par
`npm run vues`) affiche les règles d’`ucm check` et celles du linter. Le
générateur les lit dans le code.

- La section 6 du gabarit, « Ce qui est vérifié, et où » (`docs/inventaire/gabarit.html`, lignes 569 à 653), porte déjà la table générée des codes d’Architect (`codes-constats`, lue dans `CODES_DES_CONSTATS`).
- Les trois cartes « Ce que `ucm check` fait de chaque écart aujourd’hui » (lignes 625 à 644) sont écrites à la main. Elles disent encore qu’un token absent et un écart de parité avertissent sans bloquer, ce que la règle de P19 a changé.
- `docs/inventaire/sources.json` déclare déjà `packages/kit/src/**`, `packages/cli/src/**` et `packages/adapter-typescript/src/**`. Une règle modifiée fait échouer le test de fraîcheur sans ajout à ce fichier.

Ordre et présentation, dans la section 6 :

1. « Dans Figma, avec Architect » : inchangé.
2. « Dans la pull request, avec `ucm check` » : une table qui remplace les trois cartes. Une ligne par état de `ETATS_DE_COMPOSANT`, du plus grave au plus léger. Trois colonnes de verdict (demande de code, demande de contrats, demande de `tokens.json` seul), calculées par des appels à `verdictDeLaDemande`. Une colonne « pourquoi » et une colonne « autorité ».
3. « Dans l’éditeur et la CI, avec le linter » : une ligne par code de `CODES_DU_CONTROLE_DU_CODE`, avec sa règle, son niveau et sa raison. Un pli liste les propriétés par famille et les valeurs neutres, chacune avec sa raison.
4. Une ligne finale « Ce qui n’est pas vérifié » renvoie aux pistes du rendu.

- [ ] 5.1 `implementeur`. `RAISONS_DES_ETATS` dans `packages/kit/src/lecteurs/verdict-bilan.mjs`, une phrase par état, avec un test qui exige une raison pour chaque état de `ETATS_DE_COMPOSANT`. Publié après le lot 2, ce sous-lot attend la publication de 3.5. Commit : `…`
- [ ] 5.2 `implementeur`. Dans `docs/inventaire/releves.ts`, `generer-inventaire.ts` et `gabarit.html`, remplacer les trois cartes par la table 2. Commit : `…`
- [ ] 5.3 `implementeur`, après le lot 2. Ajouter la table 3 et son pli. Commit : `…`
- [ ] 5.4 Conversation principale. Faire lancer `npm run vues` puis `npm test`. Ouvrir `INVENTAIRE-UCM.html` dans un navigateur, à 1400 px et à 390 px de large. Lancer `node scripts/controle-style.mjs docs/inventaire/gabarit.html`. Changer une raison dans une copie de travail, constater « La vue n’est plus à jour », puis rétablir. Commit : `…`
  - Fin : chaque règle affichée se retrouve dans le code à l’autorité nommée. La section 6 n’est pas plus longue qu’avant le lot.

## Ajout à la décision d’API

État relevé. L’adaptateur publie une seule porte, `.` (`packages/adapter-typescript/package.json`).
Aucun test ne garde ses noms, et il n’a pas de journal. La CLI vérifie
seulement la présence de trois fonctions (`packages/cli/src/adaptateur.mjs`,
lignes 38 à 42). `tests/pinDocumente.test.mjs` garde les numéros que la
documentation épingle.

Texte proposé pour `docs/notes/Recherches/Evolutions globales/DECISION-API-PUBLIQUE.md`,
à la fin de la partie 2, que la conversation principale applique :

> ### Une seconde prise, dans l’adaptateur TypeScript
>
> Le linter de P6 lit le code par `releverUsages`, que `@ucm-kit/adapter-typescript` publie par la porte `@ucm-kit/adapter-typescript/usages`. Cette porte est la seule de l’adaptateur qu’un module importe. Elle lit la syntaxe et ne juge rien, donc elle n’importe pas le kit.
>
> Elle suit les règles de la prise du kit. Un nom y entre quand un module l’importe. Le journal `packages/adapter-typescript/CHANGELOG.md` note chaque changement, avec les genres `ajout`, `déprécié` et `rupture`. Une rupture monte le chiffre du milieu de l’adaptateur. `packages/adapter-typescript/tests/usagesPromis.test.mjs` compare les noms de la porte et les résultats attendus de ses exemples à la version précédente, et exige l’entrée du journal.
>
> Un module emploie l’adaptateur que le repository installe pour `ucm check`. Il n’en déclare pas un second. Un module extrait dans son propre paquet l’épingle à la version exacte que le repository installe, comme le kit.

## Régler une liste du linter

Cette section décrit la conception du geste. La skill
`.agents/skills/regler-le-linter/SKILL.md`, écrite au sous-lot 3.4, en devient
l’autorité. Les deux listes vivent dans un seul fichier,
`packages/kit/src/lecteurs/controle-du-code-listes.mjs`. Aucun autre fichier, ni
le module, ni un document, n’en recopie les valeurs.

| Étape | Geste |
|---|---|
| Fichier à ouvrir | `packages/kit/src/lecteurs/controle-du-code-listes.mjs` |
| Ligne à écrire | Dans `VALEURS_NEUTRES`, `{ valeur: "auto", raison: "<pourquoi cette valeur ne porte aucune décision du designer>" },`. Dans `PROPRIETES_PAR_FAMILLE`, `{ propriete: "<nom CSS>", familles: ["<famille>"], raison: "<phrase>" },`. Pour retirer, supprimer la ligne. |
| Ce que les tests vérifient | `controle-du-code-listes.test.mjs` refuse une ligne sans raison ou en double. `apiPublique.test.mjs` voit le résultat changé de l’exemple des listes et exige une entrée au journal. Le test de fraîcheur de l’inventaire demande `npm run vues`. |
| Résultat attendu | Recopier dans `packages/kit/tests/prise-attendus.json` le résultat que le test affiche pour l’exemple des listes. |
| Journal | Écrire dans `packages/kit/CHANGELOG.md` un titre `## <nouvelle version>`, puis `### rupture`, le nom `preparerControle`, la valeur ajoutée ou retirée, le geste du module et « Décidé par le mainteneur ». |
| Version | Le chiffre du milieu du kit monte (décision 0.3). La CLI et l’adaptateur montent leur dernier chiffre et épinglent le nouveau kit. Publier les trois selon `publier-paquets`. |
| Geste du développeur | Épingler dans intencial-library les trois nouvelles versions exactes, lancer `npm install`, puis ESLint. Après un retrait, corriger les nouveaux constats. |

Aucune autre règle n’est réglable au premier lot. Une exception pour une
variable CSS externe (D3) attend un cas réel. Elle prendrait la même forme, une
ligne avec sa raison dans le même fichier, et le même geste.

## Frontière avec le développeur

| Sujet | Le toolkit livre | Le développeur fournit ou décide |
|---|---|---|
| Lecture du code | `releverUsages` dans `@ucm-kit/adapter-typescript/usages`, normalisation React comprise | Rien. Il signale au mainteneur une forme de code que l’extracteur ne lit pas |
| Jugement | `preparerControle` dans la prise, ses types, ses exemples | Rien |
| Plugin | L’esquisse du cadrage, §6 | Le plugin local, la conversion des décalages par `getLocFromIndex`, le niveau des messages, l’affichage des usages non analysés et des lectures incomplètes |
| Forme des styles | L’extracteur lit les objets `style` et ceux annotés `CSSProperties` | La forme d’écriture des styles d’intencial-library, à donner au lot 0 |
| Écriture des tokens (D14) | Écriture par défaut `"var(--nom-exact)"` et commande `ucm tokens references` (lot 1). Le plugin ESLint pourra proposer la même correction par `--fix`, avec `tokenCssVariable` de la prise | Accepte l’écriture par défaut, ou écrit sa section `## resolution-token` dans `.ucm/conventions.md` |
| Corpus | Tests sur contrats fabriqués et fixtures | Reprend les composants, les contrats et les tokens de Playground, sans constat restant |
| TypeScript (D13) | L’adaptateur embarque son TypeScript 5.9 | Garde le projet en 6.0 (`~6.0.3` sur `dev` depuis la PR #11, `0036bc7`) tant que `@typescript-eslint/parser` refuse TypeScript 7 |
| Tests | Cas de la section suivante | Tests `RuleTester` sur l’affichage et les positions |
| Éditeur | Une préparation relit ses entrées à chaque appel | Cache ESLint désactivé. Commande de réanalyse de l’éditeur essayée et documentée |
| CI (D9) | Après le lot 4, le verdict d’`ucm check` | Jusqu’au lot 4, ESLint sur les fichiers que la demande modifie et sur ceux d’un envoi direct sur `main`. Après le lot 4, ce job ne bloque plus |
| Emplacement (D11) | Rien | Plugin local dans intencial-library, extraction décidée après l’essai |
| Essai (D12) | Archives du sous-lot 3.1 | Installation sur une branche d’essai jamais fusionnée, tableau des résultats |
| Après publication | Trois versions publiées | Épinglage exact, sans lien. Retrait de `overrides` et des archives |

Critères de fin de P6 qui ne dépendent pas du toolkit :

- les tests `RuleTester` du plugin passent ;
- le même constat apparaît dans l’éditeur et dans le rapport d’`ucm check` sur un fichier de test ;
- les faux positifs, les usages non analysés et les lectures incomplètes sont comptés sur les composants repris ;
- sur une branche d’essai, une demande de `tokens.json` seul reste verte, et une demande de code qui touche un fichier fautif est rouge ;
- le temps d’analyse d’un fichier est mesuré dans l’éditeur.

## Cas de test

Les tests utilisent des contrats et des tokens fabriqués en mémoire, ou
`packages/kit/fixtures/contrats/13.0/` et `12.0/`. Un dossier temporaire du test
reçoit les fichiers des cas qui passent par le disque. Aucun test n’ouvre un
clone voisin. Aucun `*.contract.json` n’est écrit à la main dans le dépôt.

### Juge du kit

| Cas | Entrée | Résultat attendu |
|---|---|---|
| C1 | `chaine("{components.button.sizes.medium.gap}")`, chemin présent | `[]` |
| C2 | `chaine("{components.button.sizes.medium.absent}")` | `token-inconnu`, `faits.reference` |
| C3 | Même texte, préparé avant puis après le retrait du token dans `tokens.json` sur disque | `[]`, puis `token-inconnu` |
| C4 | `chaine("var(--components-button-sizes-medium-gap)")`, nom projeté d’un token | `[]` |
| C5 | `chaine("var(--absente)")`, ni token ni variable du fichier | `token-inconnu`, `faits.variable` |
| C6 | `chaine("var(--layout-size-50)")`, tokens `layout.size.50%` et `layout.size.50` | `nom-css-ambigu`, niveau `limite`, les deux chemins, aucun token choisi |
| C7 | `chaine("var(--x)")` avec `variablesDuFichier: ["--x"]` | `[]` |
| C8 | `chaine("var(--components-button-sizes-medium-gap, 8px)")` | `repli-en-dur`, même si le token existe |
| C9 | `chaine("var(--")`, morceau fixe d’un gabarit qui construit le nom | `non-analyse` |
| C10 | `chaine("#ff0000")` dans une table de variantes | `valeur-en-dur` |
| C11 | `chaine("rgb(255 0 0)")` | `valeur-en-dur` |
| C12 | `chaine("15px")`, contrat `StressTest` 13.0 qui publie `structuralSize.height: "15px"` | `[]` |
| C13 | `chaine("12px")`, longueur qu’aucun champ du contrat ne publie | `valeur-en-dur` |
| C14 | `chaine("15px fit-content(100%)")`, deux valeurs publiées | `[]` |
| C15 | `chaine("Bouton de 12px")`, `chaine("red")`, `chaine("50%")`, `chaine("primary\|contained\|default")` | `[]` : texte, nom de couleur et pourcentage hors déclaration ne sont pas jugés |
| C16 | `declaration("padding", "0")`, `declaration("border", "none")`, `declaration("width", "fit-content")` | `[]` (liste A) |
| C17 | `declaration("font-size", "15px")`, même contrat | `valeur-en-dur`, la valeur publiée appartient à la famille dimension |
| C18 | `declaration("color", "red")` | `valeur-en-dur` |
| C19 | `declaration("background-color", "#ffffff")`, valeur égale à celle d’un token | `valeur-en-dur`, sans token proposé |
| C20 | `declaration("padding", "12px")`, `declaration("opacity", "0.5")` | `valeur-en-dur`, puis `[]` (`opacity` hors des trois familles) |
| C21 | `declaration("gap", null)` | `non-analyse` |
| C22 | Fichier qu’aucun contrat ne désigne | `contrat: null`, `limites: []`. Les valeurs ne sont pas jugées. Les citations le sont |
| C23 | Contrat `12.0`, puis contrat de version `15.0` | Limite `contrat-ancien`, puis `contrat-recent`. Les valeurs ne sont pas jugées. Les citations le sont |
| C24 | `tokens.json` absent, puis JSON invalide | Limite `tokens-illisibles`. Aucun `token-inconnu` |

Cas de propriété : deux préparations successives ne partagent aucun résultat ;
une préparation ne modifie aucune entrée ; l’ordre des groupes de `tokens.json`
ne change aucun constat ; `declaration("text-transform", "uppercase")` rend `[]`
quand le contrat publie `literals.textTransform: "uppercase"`, et `valeur-en-dur`
sinon.

### Extracteur de l’adaptateur

| Cas | Texte `.tsx` fabriqué | Résultat attendu |
|---|---|---|
| E1 | `const T = { a: "{x.y}" };` | une chaîne `{x.y}`, avec `debut` et `fin` qui encadrent le littéral |
| E2 | `` `var(--${c})` `` | deux morceaux fixes, `var(--` et `)` |
| E3 | `<div style={{ backgroundColor: "#fff" }} />` | une déclaration `background-color`, `#fff`, et aucune chaîne en double |
| E4 | `style={{ padding: 12, opacity: 0.5, lineHeight: 1.5 }}` | `12px`, `0.5`, `1.5` |
| E5 | `style={{ WebkitLineClamp: 2 }}` | propriété `-webkit-line-clamp`, valeur `2` |
| E6 | `style={{ gap: entry.gap, color: ok ? "a" : "b" }}` | deux déclarations à valeur `null` ; `a` et `b` en chaînes |
| E7 | `const S: CSSProperties = { width: "10px" };` et `Record<string, CSSProperties>` | déclarations relevées |
| E8 | `style={{ "--x": "8px" }}` | `variables: ["--x"]` |
| E9 | Commentaire `// "{x.y}"` et texte JSX `<p>12px</p>` | rien |
| E10 | Texte à erreur de syntaxe | `lecture.complete` faux, avec le nombre d’erreurs |

### Aides et guide

| Cas | Situation | Résultat attendu |
|---|---|---|
| G1 | Contrat qui cite des tokens, sans conventions | « Écriture par défaut » de `resolution-token`, qui nomme `ucm tokens references`. Aucune liste de noms CSS |
| G2 | Section `## resolution-token` dans `.ucm/conventions.md` | réponse du repository |
| G3 | `ecritures-par-defaut: non`, sans section | `resolution-token` listée sous « Non tranché » |
| G4 | `ucm tokens references` sur `"{café.fond}"` et `'{a.b}'` | `"var(--cafe-fond)"` et `'var(--a-b)'`, guillemets gardés |
| G5 | `ucm aides resolution-token` | Sens, Écriture par défaut, Preuve avec `--verifier` |
| G6 | Référence absente de `tokens.json`, et référence dans un gabarit | aucune des deux remplacée, chacune nommée avec fichier et ligne, sortie en erreur |
| G7 | Deux chemins qui donnent le même nom CSS | arrêt avant toute écriture, fichier inchangé |
| G8 | Second passage, puis `--verifier` | aucun changement ; `--verifier` sort sans erreur, et en erreur sur un fichier qui garde un `"{chemin}"` |

## Vérifications et clôture

Chaque implémenteur lance les tests de son paquet (`npm run test:paquet -- <nom>`
ou `npm run test --workspace @ucm-kit/core`) et `npm run typecheck`. Les tests
racine se lancent dès que `packages/kit/src/` change. Un défaut trouvé reçoit un
test de régression. Les résultats attendus s’écrivent depuis le cadrage et
FORMAT.md, jamais en rappelant la fonction testée.

Avant chaque commit d’un lot de code, un `verificateur` lance sur l’arbre stable :

```sh
npm run agents:diff
npm test
npm run typecheck
npm run build
```

Un changement de `packages/kit/src/`, `packages/cli/src/` ou
`packages/adapter-typescript/src/` demande aussi `npm run vues`. Une
publication se constate par `npm view <paquet>@<version> version`.

## Corrections hors de ce plan

Pour la conversation principale, après le commit des sessions qui ont des
modifications en cours dans ces fichiers :

1. `docs/notes/Recherches/Evolutions globales/PISTES-EVOLUTION.md`, §3.2, paragraphe « Direction proposée ». Remplacer « Commencer par des références littérales inconnues et des coordonnées de variants statiquement impossibles. Un contrôle des valeurs visuelles brutes demanderait de reconnaître leur emplacement : les pixels de grille et de positionnement autorisés par le contrat ne sont pas des défauts. » par « Le premier lot porte deux règles, token inconnu et valeur en dur, jugées au niveau du fichier ([cadrage](../Linter%20Dev/RECHERCHE-CADRAGE-P6.md)). Une valeur que le contrat publie en clair, comme un pixel de grille ou de position, passe. Les variantes impossibles restent hors du premier lot. »
2. Même §3.2, liste finale qui commence par « Le mainteneur et les développeurs doivent encore définir les échanges techniques ». Remplacer la liste par « Les échanges sont décidés dans le [cadrage de P6](../Linter%20Dev/RECHERCHE-CADRAGE-P6.md), §6 : l’adaptateur TypeScript lit le code, le kit juge, le module affiche. » Remplacer « La fonction prévue rend les constats d’un fichier » par « La fonction prévue prépare le juge d’un fichier ».
3. `docs/notes/Recherches/Evolutions globales/pistes.json`, fiche P6.
   - Ajouter `"plan": "docs/notes/Recherches/Linter Dev/PLAN-IMPLEMENTATION-P6-KIT.md"` et changer `recherche` en `docs/notes/Recherches/Linter Dev/RECHERCHE-CADRAGE-P6.md`.
   - Retirer les questions sur Stylelint (D10) et sur les pixels permis (D5). Garder celle des règles 3 et 4. Ajouter « Sous quelle forme intencial-library écrit-elle ses styles ? ».
   - Points : `packages/cli/aides/composant.md`, `resolution-token.md` et `packages/cli/src/guide.mjs` (lot 1) ; `packages/kit/src/lecteurs/controle-du-code.mjs` et `controle-du-code-listes.mjs` (lot 2) ; `packages/adapter-typescript/src/usages.mjs`, seule lecture du code (lot 2) ; `packages/kit/src/modules/index.mjs`, ajouter `preparerControle` (lot 3) ; `packages/kit/src/lecteurs/verdict-bilan.mjs` (lot 4) ; `docs/inventaire/` (lot 5) ; `docs/guides/LINTER-UCM.md` et `.agents/skills/regler-le-linter/SKILL.md` (lot 3) ; le plugin ESLint dans intencial-library, extraction décidée après l’essai (D11).
   - Risques : remplacer celui de la grille par « Une forme de style que l’extracteur ne lit pas laisse le linter sans objet » ; remplacer celui du cache par « Le cache ESLint reste désactivé ; le juge relit ses entrées à chaque préparation ».
   - `coutHumain` : « Donner la forme d’écriture des styles d’intencial-library, puis relire le guide du linter ».
4. `docs/guides/POUR-LES-DESIGNERS.md`, §6, « La règle appliquée ». Remplacer « Le linter, qui n’existe pas encore, refusera une valeur écrite en dur dans le code. » par « Le linter, en préparation, refusera dans le code d’un composant un token absent de `tokens.json` et une valeur écrite en dur. Il ne bloque que la demande d’un développeur qui modifie ce code. Une demande de contrats ou de `tokens.json` seuls reste verte. »
5. `pistes.json`, fiche P18, point `../intencial-library/package.json`. Remplacer « TypeScript entre 5.5 et 6 (contrainte de l’adaptateur) » par « TypeScript 6.0 (`~6.0.3`), que `@typescript-eslint/parser` accepte ; l’adaptateur embarque son propre TypeScript `<6` ».
6. `pistes.json`, nouvelle piste au numéro libre suivant.
   - `titre` : « Page santé des composants dans Storybook ».
   - `titreCourt` : « Santé des composants ».
   - `resume` : « Une page de Storybook sert de hub. Pour chaque composant, elle affiche l’état que le kit calcule (conforme, en retard, écart, non analysé), les constats par règle et leurs nombres, et elle alerte quand l’implémentation s’écarte du contrat. »
   - `dependances` : `["P9", "P6", "P20"]`.
   - `questions` : « Quel nom la prise ajoute-t-elle pour lire l’état des composants, quand la page l’importe ? »
7. Pour le mainteneur, avant les réimplémentations v14 de Playground. Le plan ne réalise aucune migration de Playground.
   - Dans `UCM-Playground/.ucm/conventions.md`, retirer la ligne « Traduire `{chemin.du.token}` » du tableau et la phrase « Il n’existe volontairement aucun helper partagé de résolution de token : chaque composant écrit ses références en toutes lettres. » La phrase suivante, sur `ucm tokens css` et l’absence de variable de token déclarée, reste vraie.
   - Épingler la CLI publiée au lot 1 dans `UCM-Playground/package.json` (`@ucm-kit/cli`, aujourd’hui `0.1.50`), et dans `UCM-Playground/.agents/skills/ucm-implementer/SKILL.md` et `.claude/skills/ucm-implementer/SKILL.md`, qui lancent `npx --yes @ucm-kit/cli@0.1.50 guide`. Sans ce pin, l’agent lit l’ancien guide et n’a pas la commande `ucm tokens references`.

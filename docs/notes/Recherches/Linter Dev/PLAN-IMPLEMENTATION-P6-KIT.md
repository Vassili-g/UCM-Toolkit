# Plan d’implémentation de P6 dans le kit

Ce plan livre dans `@ucm-kit/core` le juge des deux règles du premier lot du
linter, « token inconnu » et « valeur en dur », puis son entrée dans la prise
`@ucm-kit/core/modules`. Il ajoute les règles au rapport d’`ucm check` (lot 3)
et les affiche dans l’inventaire (lot 4). Le [cadrage](./RECHERCHE-CADRAGE-P6.md)
porte la conception et les décisions D1 à D14. Aucun lot de code n’est commencé.

Le développeur écrit le plugin ESLint dans intencial-library. La section
[Frontière avec le développeur](#frontière-avec-le-développeur) dit ce que le
kit lui livre, ce qu’il rend et ce qu’il décide seul.

Les chemins partent de la racine du toolkit. Une case se coche avec le hash du
commit qui la livre. Une case de décision porte le choix du mainteneur.

## Agents

| Travail | Agent |
|---|---|
| Conception, décisions, textes pour le mainteneur, fichiers d’agents, relecture des diffs, commit, publication | conversation principale (Opus) |
| Sous-lot au périmètre fixé | `implementeur` (Sonnet), ou Codex, même rôle |
| Règle et cas limites | `implementeur-exigeant` (Sonnet), ou Codex, même rôle |
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

- [x] 0.1 Décision du mainteneur. Liste des valeurs neutres (D6).
  - Liste A : `0`, `none` et `fit-content`. Le corpus Playground écrit `0` dans `Button.tsx:254` et `:260`, `none` dans `Button.tsx:252`, `:253` et `TileLink.tsx:68`, `fit-content` dans `Button.tsx:248-249`, `StressTest.tsx:222-223` et `Alert.tsx:78`. FORMAT.md lit l’absence de dimensionnement d’un slot comme un `fit-content` (lignes 620 à 626).
  - Liste B, écartée : A, plus `auto`, `inherit`, `transparent` et `currentColor`, qu’aucun composant du corpus n’écrit.
  - `stretch` et `100%` n’entrent pas dans la liste. Le contrat publie `stretch` dans `sizing`, et la règle des valeurs publiées le laisse passer (cadrage, §7).
  - Après le lot 1, `controle-du-code-listes.mjs` fait autorité sur ces valeurs, et ce plan n’est plus relu pour elles.
  - [x] A  [ ] B. Choix du mainteneur : A. Une valeur neutre passe dans toutes les propriétés des trois familles, donc chaque valeur ouvre un trou partout. Ajouter une valeur coûte une phrase et ne casse rien. En retirer une fait apparaître des erreurs dans du code existant.
- [x] 0.2 Décision du mainteneur. Emplacement de l’explication du linter pour le mainteneur.

  | Emplacement | Avantage | Inconvénient |
  |---|---|---|
  | Section de `docs/guides/MODULES.md` | Document existant | Lu par les développeurs, au milieu du texte technique de la prise |
  | Section de `docs/guides/POUR-LES-DESIGNERS.md` | Document que le mainteneur connaît | Lu par tout designer d’un repository consommateur, qui ne règle jamais le kit |
  | En-tête de `controle-du-code-listes.mjs` | À côté des listes | Fichier de code, que le mainteneur n’ouvre pas |
  | Nouveau guide `docs/guides/LINTER-UCM.md` | Un seul fichier, nommé d’après le sujet, écrit pour le mainteneur | Document de plus |

  - [ ] MODULES.md  [ ] POUR-LES-DESIGNERS.md  [ ] en-tête  [x] nouveau guide. Choix du mainteneur : le nouveau guide, « vraiment bien écrit pour que ce soit très simple à comprendre, et avec le moins de texte possible ». Le sous-lot 2.4 le rédige.
- [x] 0.3 Décision du mainteneur. Les mots-clés que le contrat publie en clair (`stretch`, `uppercase`, `center`) comptent comme valeurs publiées. Tout réglage d’une liste monte le chiffre du milieu du kit.
- [ ] 0.4 Conversation principale. Faire relire au développeur les exemples d’échange du [cadrage, §6](./RECHERCHE-CADRAGE-P6.md#6-la-séparation-entre-kit-et-module). Fixer les noms de fonctions et de fichiers. Commit : `…`
  - Fichiers source proposés : `packages/kit/src/lecteurs/controle-du-code.mjs` et `packages/kit/src/lecteurs/controle-du-code-listes.mjs`. `npm run agents:domicile -- <chemin>` rend `packages/plugin-exporter/invariants/diagnostics.md` pour les deux.
  - Fin : le développeur confirme qu’il sait fournir chaque entrée des trois exemples depuis ESLint. Les noms retenus sont écrits dans le cadrage, puis commités avec ce plan.

## Lot 1. Juge et tests, sans publication

Note de conception : cadrage, §6 et §7. Le lot ne touche pas à la prise. Il
monte la version comme le demande `tests/versionSuitLeContenu.test.mjs`, sans
publier. Une version montée et jamais publiée laisse un numéro vide au registre.

- [ ] 1.1 `implementeur`. Écrire `packages/kit/src/lecteurs/controle-du-code-listes.mjs` et `packages/kit/tests/controle-du-code-listes.test.mjs`. Commit : `…`
  - `VALEURS_NEUTRES` : une entrée par ligne, `{ valeur, raison }`, avec la liste A. La raison est une phrase en mots simples.
  - `PROPRIETES_PAR_FAMILLE` : une entrée par ligne, `{ propriete, familles, raison }`. Liste initiale, que ce fichier remplace comme autorité :
    - couleur : `color`, `background`, `background-color`, `border-color`, `outline-color`, `fill`, `stroke`, `text-decoration-color` ;
    - dimension et espacement : `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height`, `padding` et ses quatre côtés, `gap`, `row-gap`, `column-gap`, `border-radius` et ses quatre coins, `border-width`, `outline-width`, `outline-offset`, `top`, `right`, `bottom`, `left`, `inset`, `grid-template-columns`, `grid-template-rows` ;
    - couleur, dimension et espacement : `border`, `outline`, `box-shadow` ;
    - typographie : `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `text-transform`, `font-variant-caps`, `text-decoration`, `text-decoration-line`, `font-style`, `text-wrap-style`, `text-box`, `text-align`, `text-indent`, `line-clamp`, `-webkit-line-clamp`.
  - Le test refuse une entrée sans raison, une valeur ou une propriété en double, une famille hors des trois, et une valeur écrite autrement qu’en minuscules sans espace de bord.
  - Fin : `npm run test --workspace @ucm-kit/core` passe. Aucun autre fichier du dépôt n’écrit ces valeurs.
- [ ] 1.2 `implementeur-exigeant`. Écrire dans `packages/kit/src/lecteurs/controle-du-code.mjs` la préparation et la question `citation`, avec `packages/kit/tests/controle-du-code.test.mjs`. Commit : `…`
  - `preparerControle(fichier, { racine, variablesDuFichier })` relit à chaque appel `ucm.config.json` (`lireConfiguration`), les contrats (`trouverContrats`), le contrat associé et `tokens.json`. Elle ne garde rien d’un appel à l’autre.
  - L’association appelle `cheminImplementation` de `implementation.mjs` pour chaque contrat et compare les chemins résolus. Elle ne recopie pas son calcul.
  - La forme pure `preparerControleDepuis(fichier, { configuration, contrats, tokens, variablesDuFichier })` porte le calcul. Elle reste hors de `lecteurs/index.mjs`.
  - `citation(texte)` juge `{chemin}` contre `indexerTokensDtcg`, sans projection, et chaque `var(--nom[, repli])` du texte contre la projection `tokenCssVariable` dans les deux sens.
  - `CODES_DU_CONTROLE_DU_CODE` est une table gelée, une entrée par code : `{ code, regle, niveau, raison }`. Les messages en dérivent, et l’inventaire la lit (lot 4).
  - Fin : les cas C1 à C10 et C20 de la section [Cas de test du kit](#cas-de-test-du-kit) passent, avec la part `citation` de C18 et C19. Aucun nœud ESLint, TypeScript ou PostCSS n’entre dans le kit.
- [ ] 1.3 `implementeur-exigeant`. Ajouter la question `declaration` et le relevé des valeurs que le contrat publie en clair, dans les deux mêmes fichiers. Commit : `…`
  - Le relevé lit les champs listés au cadrage, §7, avec leur famille. Il parcourt le contrat entier, toutes vues comprises.
  - `declaration(propriete, valeur)` reçoit une propriété CSS en minuscules à tirets et une valeur texte, ou `null` pour une expression non résolue.
  - Fin : les cas C11 à C17 passent, avec la part `declaration` de C18 et C19. Le kit n’exécute aucun code, ne suit aucune expression et ne propose aucun remplacement.
- [ ] 1.4 `implementeur`. Exposer `preparerControle` et `CODES_DU_CONTROLE_DU_CODE` par `packages/kit/src/lecteurs/index.mjs` et `index.d.mts`, sans toucher à `src/modules/`. Ajouter les lignes de `packages/kit/CARTE.md` et les invariants dans `packages/plugin-exporter/invariants/diagnostics.md`. Charger `rediger-pour-agents` avant d’écrire la carte et les invariants. Commit : `…`
  - Invariants : une règle par puce, avec `Autorité :` et `Tests :`. Une puce dit que les deux listes vivent seulement dans `controle-du-code-listes.mjs`.
  - Fin : `npm run agents:diff` ne liste aucun document resté faux.
- [ ] 1.5 `executant` puis `verificateur`. Monter le dernier chiffre de `@ucm-kit/core`, puis les pins et le dernier chiffre de `@ucm-kit/cli` et `@ucm-kit/adapter-typescript`, selon la skill `publier-paquets`. Ne rien publier. Le `verificateur` lance `npm run agents:diff`, `npm test`, `npm run typecheck` et `npm run build` sur l’arbre stable. La conversation principale relit le diff et commite. Commit : `…`
  - Fin : les quatre commandes passent, `versionSuitLeContenu` compris. `src/modules/index.mjs` est inchangé.

## Lot 2. Essai, prise et publication unique

Le juge sort sur npm une seule fois, à la fin de ce lot, avec son entrée dans
la prise, l’exemple et le journal.

- [ ] 2.1 `executant`. Préparer les archives d’essai depuis le commit du lot 1. Commit : aucun.
  - Copier `packages/kit` dans le dossier temporaire de la session. Dans la copie seulement, republier `preparerControle` dans `src/modules/index.mjs` et `index.d.mts`, et poser la version `<version du lot 1>-essai.1`.
  - Lancer `npm pack` sur la copie du kit, puis sur `packages/cli` et `packages/adapter-typescript`. La CLI et l’adaptateur viennent du même commit que le kit, donc les tests racine les ont essayés ensemble.
  - Remettre au développeur les trois archives et la recette d’installation du cadrage, §8.
  - Fin : dans un repository temporaire installé selon la recette, `npm ls @ucm-kit/core` montre une seule version, et `import { preparerControle } from "@ucm-kit/core/modules"` se résout. `git status` du toolkit ne montre aucun changement.
- [ ] 2.2 Conversation principale, avec le développeur. Essai sur les quatre composants de Playground repris dans intencial-library, sur une branche d’essai jamais fusionnée. Commit : `…` (cadrage seul).
  - Le développeur rend un tableau : fichier, constats par code, usages non analysés, faux positifs, temps d’analyse.
  - La conversation principale classe chaque écart : défaut du juge, cas du module, ou valeur neutre à décider par le mainteneur.
  - Fin : le cadrage porte le tableau et la liste des ajustements. Une fixture du toolkit ne remplace pas cet essai.
- [ ] 2.3 `implementeur-exigeant`. Appliquer les ajustements de 2.2, puis ajouter le nom à la prise. Commit : `…`
  - Republier `preparerControle` dans `packages/kit/src/modules/index.mjs` et sa signature dans `index.d.mts`.
  - Ajouter à `packages/kit/tests/prise-exemples.mjs` les exemples des trois échanges du cadrage, §6, sur `fixtures/contrats/13.0/StressTest.contract.json`, et leurs résultats à `prise-attendus.json`.
  - Ajouter un exemple qui passe chaque entrée de `VALEURS_NEUTRES` et de `PROPRIETES_PAR_FAMILLE` à `declaration`. Un réglage d’une liste change alors son résultat attendu, et `apiPublique.test.mjs` exige l’entrée `rupture` et le chiffre du milieu.
  - Écrire l’entrée `### ajout` de `packages/kit/CHANGELOG.md`, avec le geste du module et « Décidé par le mainteneur, avec le développeur du linter ».
  - Ajouter à `docs/guides/MODULES.md` l’appel complet, les résultats, les limites et le traitement du réexport. Mettre à jour la liste des noms de la prise et `packages/kit/README.md`.
  - Fin : les cas de la section [Cas de test du kit](#cas-de-test-du-kit) passent encore, et les cas révélés par l’essai y sont ajoutés.
- [ ] 2.4 Conversation principale. Écrire la skill `.agents/skills/regler-le-linter/SKILL.md` et le guide `docs/guides/LINTER-UCM.md`. Commit : `…`
  - Skill : charger `rediger-pour-agents`. Sa description se déclenche sur « ajoute `auto` aux valeurs neutres » ou « retire `border` de la famille couleur ». Elle porte le geste dont la section [Régler une liste du linter](#régler-une-liste-du-linter) décrit la conception, et en devient l’autorité.
  - Guide : ce que le linter vérifie, ce qu’il ne voit pas, ce qui se règle, et la phrase à dire à un agent. Le moins de texte possible. Il nomme le fichier des listes sans recopier leurs valeurs, et renvoie à la skill en une ligne.
  - En-tête de `controle-du-code-listes.mjs` : une ligne qui renvoie à la skill.
  - Registre : le motif `.agents/skills/*/**` et le motif `docs/guides/**` du registre de `.agents/domiciles.json` couvrent déjà les deux fichiers. Ajouter la skill et le guide aux `lies` du domaine `diagnostics`, pour qu’`agents:diff` les nomme quand les listes changent. Ajouter une ligne au tableau des skills d’`AGENTS.md`. Le dépôt n’a pas de dossier `.claude/skills/`, donc aucune copie.
  - `node scripts/controle-style.mjs` passe sur les deux fichiers.
  - Fin : le mainteneur dit qu’il comprend chaque phrase du guide. Un agent sans contexte qui reçoit « ajoute `auto` aux valeurs neutres » charge la skill depuis le tableau d’`AGENTS.md` et fait le geste sans autre lecture.
- [ ] 2.5 `executant`, `verificateur`, puis conversation principale. Monter le dernier chiffre du kit (ajout à la prise), les pins et le dernier chiffre de la CLI et de l’adaptateur, et les versions citées par la documentation. Vérifier, commiter, publier le kit, puis la CLI, puis l’adaptateur, selon `publier-paquets`. Commit : `…`
  - Fin : `npm view @ucm-kit/core@<version> version` et les deux autres rendent les versions. Le développeur reçoit les trois numéros à épingler.

## Lot 3. Constats du linter dans le verdict d’`ucm check`

Ce lot suit l’essai du lot 2. Le rapport d’`ucm check` nomme le composant dont
le code a des constats, bloque une demande de code dont le code est le dernier
modifié, et marque « en retard » le composant dont le contrat ou les tokens ont
changé après le code.

| Réalisation | Ce qui change | Coût et risque |
|---|---|---|
| (a) La CI lance ESLint sur tout le code sans échouer. Le module écrit un fichier de constats, qu’`ucm check` lit. | Une forme de fichier entre le module et la CLI, une option de la CLI, une étape du workflow que `ucm init` écrit, et l’ordre des deux étapes. | La forme du fichier devient une seconde promesse publique, hors de la prise (option E de la décision d’API). La CLI dépend d’un outil du développeur. |
| (b) L’adaptateur TypeScript relève les chaînes citées et les déclarations de style des fichiers d’implémentation, et interroge le même juge. | Une fonction de plus dans `packages/adapter-typescript`, facultative pour la CLI. Aucune forme de fichier, aucun changement de workflow. | Deux extracteurs, l’un dans ESLint, l’autre dans l’adaptateur, peuvent trouver des usages différents. |

Faits relevés pour (b) :

- `lireApiPublique` (`packages/adapter-typescript/src/parite.mjs`, ligne 299) crée déjà un seul `ts.createProgram` pour tous les fichiers d’implémentation, à chaque `ucm check`. Il parcourt leurs arbres pour l’interface, les props lues et la composition. Le relevé des chaînes et des objets `style` est un parcours de plus sur des arbres déjà construits.
- L’adaptateur appartient au toolkit. Il importe `preparerControle` par `@ucm-kit/core/lecteurs`, sans passer par la prise, et sort avec le kit.
- `verdictDuComposant` (`packages/kit/src/lecteurs/verdict-bilan.mjs`, lignes 168 à 220) bloque un écart quand la demande juge le code (`code` ou `sans-base`) et que le contrat n’est pas plus récent que le code. Une demande `contrats-et-tokens` ou `tokens-seuls` ne bloque jamais sur le code. Les constats du linter suivent la même règle, avec une comparaison de plus entre le rang des tokens et celui du code.
- Comme pour la parité (V-12, V-18), un constat dans un fichier que la demande ne touche pas bloque une demande de code si ce fichier est plus récent que son contrat et ses tokens. Le corpus repris doit donc entrer sans constat.

Recommandation : (b). Elle donne le marquage et le verdict par la règle du
dernier modifié déjà écrite, sans nouvelle forme de fichier ni changement de
workflow. Le risque des deux extracteurs se tient par trois mesures. Le cadrage
écrit une seule liste des nœuds lus (§6, « Qui fait quoi »). Les tests de
l’adaptateur et les tests `RuleTester` du module rejouent les mêmes mutations.
La CI garde un seul verdict, celui d’`ucm check`, et le job ESLint du
développeur cesse de bloquer.

- [ ] 3.0 Décision du mainteneur. [ ] (a)  [ ] (b). Choix du mainteneur : …
- [ ] 3.1 Conversation principale. Note de conception dans le cadrage : forme de l’état d’un composant, noms des états ajoutés, règle des rangs pour les tokens, liste des nœuds lus. Commit : `…`
  - L’état reste une donnée que `verdictDeLaDemande` calcule : `etat`, `constats`, `bloquant`, et pour chaque règle du code ses écarts et ses usages non analysés. Le rapport et le terminal la mettent en phrases, sans la recalculer.
  - Aucun nom n’entre dans la prise pour cette donnée (décision d’API, question 1).
- [ ] 3.2 `implementeur-exigeant`. Étendre `verdictDuComposant` et `controlerRepository` aux constats du code, avec un cas par ligne V-01 à V-20 touchée dans `packages/kit/tests/verdict-demande.test.mjs` et dans `controleRepository.test.mjs`. Commit : `…`
- [ ] 3.3 `implementeur`. Pour (b), la fonction de relevé de l’adaptateur, son appel facultatif dans `packages/cli/src/adaptateur.mjs`, et les tests sur des fichiers `.tsx` fabriqués dans un dossier temporaire. Pour (a), l’option de `packages/cli/src/check.mjs` et la forme du fichier. Commit : `…`
- [ ] 3.4 Conversation principale. Mettre à jour la table du §6 de `docs/guides/POUR-LES-DESIGNERS.md`, `docs/guides/LINTER-UCM.md`, l’invariant de `diagnostics.md` et la ligne CI de la frontière. Commit : `…`
- [ ] 3.5 `executant`, `verificateur`, puis conversation principale. Versions, vérifications, commit, publication du kit, de la CLI et de l’adaptateur. Commit : `…`

## Lot 4. Toutes les règles dans l’inventaire

L’inventaire (`INVENTAIRE-UCM.html`, généré depuis `docs/inventaire/` par
`npm run vues`) affiche les règles d’`ucm check` et celles du linter. Le
générateur les lit dans le code. Aucune règle n’est recopiée à la main.

État relevé :

- La section 6 du gabarit, « Ce qui est vérifié, et où » (`docs/inventaire/gabarit.html`, lignes 569 à 653), porte déjà la table générée des codes d’Architect (`codes-constats`, lue dans `CODES_DES_CONSTATS`).
- Les trois cartes « Ce que `ucm check` fait de chaque écart aujourd’hui » (lignes 625 à 644) sont écrites à la main. Elles disent encore qu’un token absent et un écart de parité avertissent sans bloquer, ce que la règle de P19 a changé.
- `docs/inventaire/sources.json` déclare déjà `packages/kit/src/**`, `packages/cli/src/**` et `packages/adapter-typescript/src/**`. Une règle modifiée dans ces dossiers fait échouer le test de fraîcheur, sans ajout à ce fichier.

Ordre et présentation proposés, dans la section 6 :

1. « Dans Figma, avec Architect » : inchangé.
2. « Dans la pull request, avec `ucm check` » : une table qui remplace les trois cartes. Une ligne par état de `ETATS_DE_COMPOSANT`, du plus grave au plus léger. Trois colonnes de verdict, demande de code, demande de contrats, demande de `tokens.json` seul, avec « bloque » ou « passe ». Une colonne « pourquoi », une phrase. Une colonne « autorité », le fichier et la fonction.
3. « Dans l’éditeur et la CI, avec le linter » : une table, une ligne par code de `CODES_DU_CONTROLE_DU_CODE`, avec sa règle, son niveau et sa raison. Un pli sous la table liste les propriétés par famille et les valeurs neutres, chacune avec sa raison, lues dans `controle-du-code-listes.mjs`.
4. Une ligne finale « Ce qui n’est pas vérifié » renvoie aux pistes du comparateur de rendu.

Les verdicts de la table 2 viennent d’appels à `verdictDeLaDemande` sur un
composant fabriqué par état et par genre de demande. La page en clair, sans
thème sombre, reprend les classes `verdict` existantes.

- [ ] 4.1 `implementeur`. Ajouter `RAISONS_DES_ETATS` dans `packages/kit/src/lecteurs/verdict-bilan.mjs`, une phrase par état, et un test qui exige une raison pour chaque état de `ETATS_DE_COMPOSANT`. Ce sous-lot peut se faire avant le lot 1. Sa version suit `publier-paquets` ; publié après le lot 1, il attend la publication de 2.5. Commit : `…`
- [ ] 4.2 `implementeur`. Dans `docs/inventaire/releves.ts`, lire `ETATS_DE_COMPOSANT`, `RAISONS_DES_ETATS` et les verdicts calculés. Dans `generer-inventaire.ts` et `gabarit.html`, remplacer les trois cartes par la table 2. Commit : `…`
- [ ] 4.3 `implementeur`, après le lot 1. Lire `CODES_DU_CONTROLE_DU_CODE`, `VALEURS_NEUTRES` et `PROPRIETES_PAR_FAMILLE`, et ajouter la table 3 et son pli. Commit : `…`
- [ ] 4.4 Conversation principale. Faire lancer `npm run vues` puis `npm test` par un `verificateur`. Ouvrir `INVENTAIRE-UCM.html` dans un navigateur et vérifier la lecture des tables à 1400 px et à 390 px de large. Lancer `node scripts/controle-style.mjs docs/inventaire/gabarit.html`. Changer une raison dans une copie de travail, constater « La vue n’est plus à jour », puis rétablir. Commit : `…`
  - Fin : chaque règle affichée se retrouve dans le code à l’autorité nommée. La section 6 n’est pas plus longue qu’avant le lot.

## Régler une liste du linter

Cette section décrit la conception du geste. La skill
`.agents/skills/regler-le-linter/SKILL.md`, écrite au sous-lot 2.4, en devient
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
| Geste du développeur | Épingler dans intencial-library les trois nouvelles versions exactes (`@ucm-kit/core`, `@ucm-kit/cli`, `@ucm-kit/adapter-typescript`), lancer `npm install`, puis ESLint. Après un retrait, corriger les nouveaux constats. |

Aucune autre règle n’est réglable au premier lot. Une exception pour une
variable CSS externe (D3) attend un cas réel. Elle prendrait la même forme, une
ligne avec sa raison dans le même fichier, et le même geste.

## Frontière avec le développeur

| Sujet | Le kit livre | Le développeur fournit ou décide |
|---|---|---|
| Appel | `preparerControle` dans la prise, ses types, ses exemples | L’appel dans `create()` de chaque règle ESLint, une question par usage, le signalement sur le nœud |
| Formes de citation (D2, D14) | Accepte `"{chemin}"` et `var(--nom)` | Choisit avec le mainteneur la forme des composants. La copie locale de `token()` de Playground diverge de `tokenCssVariable` sur les lettres accentuées, et `tokenCssVariable` est dans la prise. Avec `token("{…}")`, chaque déclaration est un appel, que la règle « valeur en dur » rend non analysé |
| Normalisation | Reçoit la propriété CSS à tirets et la valeur en texte | Convertit `backgroundColor` en `background-color`. Écrit `padding: 12` en `"12px"` et garde `opacity: 0.5` et `lineHeight: 1.5` sans unité, selon les propriétés sans unité de React |
| Nœuds lus | La liste écrite au cadrage, §6, que l’adaptateur suit aussi au lot 3 | Les mêmes nœuds, testés sur les mêmes mutations |
| Constantes (D7) | Juge la valeur littérale reçue | Décide seul de suivre une constante du même fichier par l’analyse de portée d’ESLint, et le dit au mainteneur pour que l’adaptateur suive le même choix |
| Variables du fichier (D3) | Reçoit `variablesDuFichier` | Relève les propriétés `--nom` que le fichier déclare |
| Non analysés | Rend `non-analyse` | Les affiche à un niveau qu’il choisit. Ne rend jamais « conforme » quand il en reste |
| Corpus | Tests sur contrats fabriqués et fixtures | Reprend les composants, les contrats et les tokens de Playground dans intencial-library, sans constat restant |
| TypeScript (D13) | Rien | Précondition du premier lot. La branche `dev` d’intencial-library porte `typescript` `~6.0.3` depuis la PR #11 (`0036bc7`). Garder 6.0 tant que `@typescript-eslint/parser` refuse TypeScript 7 |
| Tests | Cas de la section suivante | Tests `RuleTester` sur le corpus et ses mutations |
| Éditeur | Une préparation relit ses entrées à chaque appel | Cache ESLint désactivé au premier lot. Commande de réanalyse de l’éditeur essayée et documentée |
| CI (D9) | Un juge qui ignore la demande de fusion. Après le lot 3, le verdict d’`ucm check` | Jusqu’au lot 3, ESLint sur les fichiers que la demande modifie et sur ceux d’un envoi direct sur `main`, jamais sur tout le dépôt. Après le lot 3 en (b), le job ESLint ne bloque plus |
| Emplacement (D11) | Rien | Plugin local dans intencial-library. Son extraction se décide après l’essai |
| Essai (D12) | Archives du sous-lot 2.1 | Installation sur une branche d’essai jamais fusionnée, tableau des résultats |
| Après publication | Trois versions publiées | Épinglage exact du kit égal à celui de la CLI, sans lien. Retrait de `overrides` et des archives |

Critères de fin de P6 qui ne dépendent pas du kit :

- les tests `RuleTester` des deux règles passent ;
- le même constat apparaît dans l’éditeur et dans le rapport de CI sur un fichier de test ;
- les faux positifs et les usages non analysés sont comptés sur les quatre composants repris ;
- sur une branche d’essai, une demande de `tokens.json` seul reste verte, et une demande de code qui touche un fichier fautif est rouge ;
- le temps d’analyse d’un fichier est mesuré dans l’éditeur et en CI.

## Cas de test du kit

Les tests utilisent des contrats et des tokens fabriqués en mémoire, ou
`packages/kit/fixtures/contrats/13.0/` et `12.0/`. Un dossier temporaire du test
reçoit les fichiers des cas qui passent par le disque. Aucun test n’ouvre un
clone voisin. Aucun `*.contract.json` n’est écrit à la main dans le dépôt.

| Cas | Entrée | Résultat attendu |
|---|---|---|
| C1 | `citation("{components.button.sizes.medium.gap}")`, chemin présent | `[]` |
| C2 | `citation("{components.button.sizes.medium.absent}")` | `token-inconnu`, `faits.reference` |
| C3 | Même texte, préparé avant puis après le retrait du token dans `tokens.json` sur disque | `[]`, puis `token-inconnu` |
| C4 | `citation("var(--components-button-sizes-medium-gap)")`, nom projeté d’un token | `[]` |
| C5 | `citation("var(--absente)")`, ni token ni variable du fichier | `token-inconnu`, `faits.variable` |
| C6 | `citation("var(--layout-size-50)")`, tokens `layout.size.50%` et `layout.size.50` | `nom-css-ambigu`, niveau `limite`, `faits.chemins` avec les deux chemins, aucun token choisi |
| C7 | `citation("var(--x)")` avec `variablesDuFichier: ["--x"]` | `[]` |
| C8 | `citation("var(--externe)")` sans déclaration dans le fichier | `token-inconnu` |
| C9 | `citation("var(--components-button-sizes-medium-gap, 8px)")` | `repli-en-dur`, même si le token existe |
| C10 | `citation("var(--")`, morceau fixe d’un gabarit qui construit le nom | `non-analyse` |
| C11 | `declaration("padding", "0")`, `declaration("border", "none")`, `declaration("width", "fit-content")` | `[]` (liste A) |
| C12 | `declaration("height", "15px")`, contrat `StressTest` 13.0 qui publie `structuralSize.height: "15px"` | `[]` |
| C13 | `declaration("font-size", "15px")`, même contrat | `valeur-en-dur`, la valeur publiée appartient à la famille dimension |
| C14 | `declaration("background-color", "#ff0000")` | `valeur-en-dur` |
| C15 | `declaration("background-color", "#ffffff")`, valeur égale à celle d’un token | `valeur-en-dur`, sans token proposé |
| C16 | `declaration("padding", "12px")` et `declaration("opacity", "0.5")`, valeurs que le module a normalisées | `valeur-en-dur`, puis `[]` (`opacity` hors des trois familles) |
| C17 | `declaration("gap", null)`, expression non résolue | `non-analyse` |
| C18 | Fichier qu’aucun contrat ne désigne | `contrat: null`, `limites: []`. `declaration` rend `[]`. `citation` juge encore les tokens |
| C19 | Contrat `12.0`, puis contrat de version `15.0` | Limite `contrat-ancien`, puis `contrat-recent`. `declaration` rend `[]`. `citation` juge encore les tokens |
| C20 | `tokens.json` absent, puis JSON invalide | Limite `tokens-illisibles`. `citation` rend `[]` pour toute référence, jamais `token-inconnu` |

Cas de propriété, dans le même fichier de test :

- deux préparations successives sur des entrées différentes ne partagent aucun résultat ;
- une préparation ne modifie ni le contrat, ni les tokens, ni `variablesDuFichier` reçus ;
- l’ordre des groupes de `tokens.json` ne change aucun constat ;
- `declaration("padding", "var(--x) 12px")` juge `12px` et laisse `var(--x)` à `citation` ;
- `declaration("text-transform", "uppercase")` rend `[]` quand le contrat publie `literals.textTransform: "uppercase"`, et `valeur-en-dur` sinon.

## Vérifications et clôture

Chaque implémenteur lance `npm run test --workspace @ucm-kit/core` et
`npm run typecheck`. Les tests racine (`node scripts/run-tests.cjs`) se lancent
dès que `packages/kit/src/` change. Un défaut trouvé reçoit un test de
régression. Les résultats attendus s’écrivent depuis le cadrage et FORMAT.md,
jamais en rappelant la fonction testée.

Avant chaque commit d’un lot de code, un `verificateur` lance sur l’arbre stable :

```sh
npm run agents:diff
npm test
npm run typecheck
npm run build
```

Un changement de `packages/kit/src/` demande aussi `npm run vues`, puisque
l’inventaire le lit. Une publication se constate par
`npm view <paquet>@<version> version`.

## Corrections hors de ce plan, pour la conversation principale

D’autres sessions ont des modifications non commitées dans ces fichiers. La
conversation principale y fait les corrections suivantes après leur commit.

1. `docs/notes/Recherches/Evolutions globales/PISTES-EVOLUTION.md`, §3.2, paragraphe « Direction proposée ». Remplacer « Commencer par des références littérales inconnues et des coordonnées de variants statiquement impossibles. Un contrôle des valeurs visuelles brutes demanderait de reconnaître leur emplacement : les pixels de grille et de positionnement autorisés par le contrat ne sont pas des défauts. » par « Le premier lot porte deux règles, token inconnu et valeur en dur, jugées au niveau du fichier ([cadrage](../Linter%20Dev/RECHERCHE-CADRAGE-P6.md)). Une valeur que le contrat publie en clair, comme un pixel de grille ou de position, passe. Les variantes impossibles restent hors du premier lot. »
2. Même §3.2, liste finale non commitée qui commence par « Le mainteneur et les développeurs doivent encore définir les échanges techniques ». Remplacer la liste de quatre questions par « Les échanges sont décidés dans le [cadrage de P6](../Linter%20Dev/RECHERCHE-CADRAGE-P6.md), §6 et §8 : le module pose ses questions à un juge préparé par le kit pour le fichier, et aucune représentation ESLint n’entre dans le kit. » Dans le même §3.2, remplacer « La fonction prévue rend les constats d’un fichier » par « La fonction prévue prépare le juge d’un fichier ».
3. `docs/notes/Recherches/Evolutions globales/pistes.json`, fiche P6. Ajouter `"plan": "docs/notes/Recherches/Linter Dev/PLAN-IMPLEMENTATION-P6-KIT.md"` et changer `recherche` en `docs/notes/Recherches/Linter Dev/RECHERCHE-CADRAGE-P6.md`. Retirer les questions « Installe-t-on Stylelint si les styles vivent dans des fichiers CSS ? » (D10, non au premier lot) et « Quels pixels restent permis (grille, position) quand le contrat les publie ? » (D5). Garder celle des règles 3 et 4. Réécrire les points : le point « plugin ESLint UCM » devient « dans intencial-library, extraction décidée après l’essai » (D11) ; le point `packages/kit/src/lecteurs/` nomme `controle-du-code.mjs` et `controle-du-code-listes.mjs` ; le point `packages/kit/src/modules/index.mjs` dit « ajouter `preparerControle` » ; le point `ucm.yml` dit « lancer ESLint sur les fichiers que la demande modifie, jusqu’au lot 3 ». Ajouter les points `packages/adapter-typescript/src/` (relevé du lot 3), `docs/guides/LINTER-UCM.md`, `.agents/skills/regler-le-linter/SKILL.md` et `docs/inventaire/` (lot 4). Remplacer le risque sur la grille par « Un code qui cite ses tokens par `token("{…}")` laisse la règle « valeur en dur » sur des usages non analysés ». Remplacer le risque du cache par « Le cache ESLint reste désactivé au premier lot ; le juge relit ses entrées à chaque préparation ». Ajouter le risque « Deux extracteurs, ESLint et l’adaptateur, peuvent relever des usages différents ». Changer `coutHumain` en « Choisir entre (a) et (b) au lot 3 ».
4. `docs/guides/POUR-LES-DESIGNERS.md`, §6, « La règle appliquée ». Remplacer « Le linter, qui n’existe pas encore, refusera une valeur écrite en dur dans le code. » par « Le linter, en préparation, refusera dans le code d’un composant un token absent de `tokens.json` et une valeur écrite en dur. Il ne bloque que la demande d’un développeur qui modifie ce code. Une demande de contrats ou de `tokens.json` seuls reste verte. »
5. `docs/notes/Recherches/Evolutions globales/pistes.json`, fiche P18, point `../intencial-library/package.json`. Remplacer « TypeScript entre 5.5 et 6 (contrainte de l’adaptateur) » par « TypeScript 6.0 (`~6.0.3`), que `@typescript-eslint/parser` accepte ; l’adaptateur embarque son propre TypeScript `<6` ». La branche `dev` d’intencial-library porte cette version depuis la PR #11 ; la branche `origin/dev` du clone local, non rafraîchie, montre encore `^7.0.2`.
6. `docs/notes/Recherches/Evolutions globales/pistes.json`, nouvelle piste, au numéro libre suivant.
   - `titre` : « Page santé des composants dans Storybook ».
   - `titreCourt` : « Santé des composants ».
   - `resume` : « Une page de Storybook sert de hub. Pour chaque composant, elle affiche l’état que le kit calcule (conforme, en retard, écart, non analysé), les constats par règle et leurs nombres, et elle alerte quand l’implémentation s’écarte du contrat. »
   - `dependances` : `["P9", "P6", "P20"]`. P9 fournit Storybook, P6 l’état des règles du code par le lot 3, P20 les écarts de rendu.
   - `questions` : « Quel nom la prise ajoute-t-elle pour lire l’état des composants, quand la page l’importe ? »

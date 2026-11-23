# Plan d’implémentation de P6 dans le kit

Ce plan livre tout ce que le plugin ESLint du développeur appelle, puis le
publie une seule fois. L’adaptateur TypeScript lit le code par `lecteurDuCode`.
Le kit juge un fichier par `preparerControle`, applique les dérogations et rend
des constats complets. `ucm check` appelle les mêmes fonctions et juge les
constats par la règle du dernier modifié. `ucm deroger` écrit une dérogation.
L’inventaire affiche toutes les règles. Le plugin lui-même reste au développeur.

Le [cadrage](./RECHERCHE-CADRAGE-P6.md) porte la conception et les décisions :
§6 pour les interfaces et le contrat du plugin, §7 pour les règles, le
périmètre et la dérogation, §8 pour l’écriture des références, §9 pour la CI.
Ce plan distribue le travail en vagues et porte les détails propres à chaque
lot. Aucun lot n’est commencé.

## Vagues

Une vague commence quand la précédente est commitée. Dans une vague, les lots
n’écrivent aucun fichier en commun, et ceux de la colonne « Fichiers écrits »
sont les seuls permis.

| Vague | Lot | Agent | Fichiers écrits | Dépend de |
|---|---|---|---|---|
| 0 | 0.20 Documents et verrou de publication | conversation principale | `.agents/skills/publier-paquets/SKILL.md`, ce plan, le cadrage, `pistes.json` | rien |
| 0 | 0.21 `nomsCssDesTokens` | `executant` | `packages/kit/src/lecteurs/tokens-dtcg.mjs`, `packages/kit/src/lecteurs/index.mjs`, `packages/kit/src/lecteurs/index.d.mts`, `packages/kit/tests/tokens-dtcg.test.mjs` | 0.20 |
| 1 | 1.1 Juge du kit et dérogation des constats | `implementeur-exigeant` | `packages/kit/src/lecteurs/controle-du-code-listes.mjs` (créé), `packages/kit/src/lecteurs/controle-du-code.mjs` (créé), `packages/kit/src/lecteurs/derogations.mjs`, `packages/kit/src/lecteurs/index.mjs`, `packages/kit/src/lecteurs/index.d.mts`, `packages/kit/tests/controle-du-code-listes.test.mjs` (créé), `packages/kit/tests/controle-du-code.test.mjs` (créé), `packages/kit/tests/derogations.test.mjs` | vague 0 |
| 1 | 1.2 Lecteur du code dans l’adaptateur | `implementeur-exigeant` | `packages/adapter-typescript/src/usages.mjs` (créé), `packages/adapter-typescript/src/parite.mjs`, `packages/adapter-typescript/src/index.d.mts`, `packages/adapter-typescript/tests/usages.test.mjs` (créé) | vague 0 |
| 1 | 1.3 Écriture des références et `ucm tokens references` | `implementeur` | `packages/cli/src/tokens-references.mjs` (créé), `packages/cli/src/ucm.mjs`, `packages/cli/src/tokens-css.mjs`, `packages/cli/src/guide.mjs`, `packages/cli/src/init.mjs`, `packages/cli/aides/resolution-token.md`, `packages/cli/aides/composant.md`, `packages/cli/README.md`, `packages/cli/tests/tokens-references.test.mjs` (créé), `packages/cli/tests/aides.test.mjs`, `packages/cli/tests/guide.test.mjs`, `packages/cli/tests/commande-aides.test.mjs`, `packages/cli/tests/tokens-css.test.mjs`, `packages/cli/tests/cli.test.mjs` | vague 0 |
| 2 | 2.1 Constats du code dans le verdict | `implementeur-exigeant` | `packages/kit/src/lecteurs/verdict-bilan.mjs`, `packages/kit/src/lecteurs/controle-repository.mjs`, `packages/kit/src/lecteurs/perimetre-rapport.mjs`, `packages/kit/src/lecteurs/index.mjs`, `packages/kit/src/lecteurs/index.d.mts`, `packages/kit/tests/verdict-demande.test.mjs`, `packages/kit/tests/controleRepository.test.mjs`, `packages/kit/tests/perimetre-rapport.test.mjs`, `packages/kit/tests/declarationsDesLecteurs.test.mjs`, `packages/cli/tests/check.test.mjs`, `packages/cli/tests/recette.test.mjs` | 1.1, 1.2 |
| 2 | 2.2 `ucm deroger`, rangs et procédure | `implementeur` | `packages/cli/src/deroger.mjs` (créé), `packages/cli/src/ucm.mjs`, `packages/cli/src/check.mjs`, `packages/cli/src/rangs.mjs`, `packages/cli/procedure.md`, `packages/cli/README.md`, `packages/cli/tests/deroger.test.mjs` (créé), `packages/cli/tests/verdictGit.test.mjs`, `packages/cli/tests/cli.test.mjs` | 1.1, 1.2, 1.3 |
| 2 | 2.3 Parité des aides et du juge | `implementeur` | `tests/ecrituresDesAidesJugees.test.mjs` (créé), `CARTE.md` (section `## tests/`), `packages/cli/aides/*.md` sauf `resolution-token.md` et `composant.md`, `packages/kit/src/lecteurs/controle-du-code-listes.mjs` (propriétés seulement) | 1.1, 1.3 |
| 3 | 3.1 Les deux prises | `implementeur-exigeant` | `packages/kit/src/modules/index.mjs`, `packages/kit/src/modules/index.d.mts`, `packages/kit/src/lecteurs/index.mjs`, `packages/kit/src/lecteurs/index.d.mts`, `packages/kit/tests/prise-exemples.mjs`, `packages/kit/tests/prise-attendus.json`, `packages/kit/CHANGELOG.md`, `packages/kit/README.md`, `packages/adapter-typescript/package.json`, `packages/adapter-typescript/src/usages.d.mts` (créé), `packages/adapter-typescript/CHANGELOG.md` (créé), `packages/adapter-typescript/tests/usagesPromis.test.mjs` (créé), `packages/adapter-typescript/README.md`, `docs/guides/MODULES.md` | vague 2 |
| 3 | 3.2 Toutes les règles dans l’inventaire | `implementeur` | `docs/inventaire/releves.ts`, `docs/inventaire/generer-inventaire.ts`, `docs/inventaire/gabarit.html`, `docs/inventaire/couverture.ts`, `docs/inventaire/page.css`, `docs/inventaire/page.js`, `docs/notes/Recherches/Evolutions globales/decisions.json` | vague 2 |
| 3 | 3.3 Guide, skill, invariants, cartes | conversation principale | `docs/guides/LINTER-UCM.md` (créé), `.agents/skills/regler-le-linter/SKILL.md` (créé), `AGENTS.md`, `.agents/domiciles.json`, `packages/plugin-exporter/invariants/diagnostics.md`, `packages/kit/CARTE.md`, `packages/adapter-typescript/CARTE.md`, `packages/cli/CARTE.md`, `docs/guides/POUR-LES-DESIGNERS.md`, `docs/notes/Recherches/Evolutions globales/DECISION-API-PUBLIQUE.md`, en-tête de `packages/kit/src/lecteurs/controle-du-code-listes.mjs` | vague 2 |
| 4 | 4.1 à 4.4 Versions, publication, clôture | `executant`, `verificateur`, conversation principale | `package.json` des trois paquets, pins et versions citées par la documentation, `INVENTAIRE-UCM.html`, ce plan, `pistes.json`, `.agents/skills/publier-paquets/SKILL.md` | vague 3 |

Fichiers que deux lots de vagues différentes écrivent, dans l’ordre :
`packages/kit/src/lecteurs/index.mjs` et `index.d.mts` (0.21, 1.1, 2.1, 3.1),
`packages/cli/src/ucm.mjs` (1.3, 2.2), `packages/cli/README.md` (1.3, 2.2),
`packages/cli/tests/cli.test.mjs` (1.3, 2.2), `controle-du-code-listes.mjs`
(1.1, 2.3, 3.3). Le chemin de `pistes.json` est
`docs/notes/Recherches/Evolutions globales/pistes.json`.

## Règles d’exécution

| Travail | Agent |
|---|---|
| Relecture des diffs, commits, textes pour le mainteneur et le designer, fichiers d’agents, publication | conversation principale |
| Lot de code à périmètre fixé | `implementeur` |
| Lot qui touche plusieurs lecteurs d’une même règle | `implementeur-exigeant` |
| Code donné en entier, versions, pins | `executant` |
| `npm run build`, `npm run vues`, `npm test`, `npm run typecheck`, `npm run agents:diff` | `verificateur` |

- Le prompt d’un lot contient, et rien d’autre : la note du lot, les sections du cadrage que la note nomme, la nature de la tâche, la liste « Fichiers écrits » de la table et la sortie de `npm run agents:lire -- <fichiers écrits du lot>`.
- L’agent lance `git status` d’abord. Un fichier de son lot modifié hors de ce plan l’arrête, et il rend la question.
- L’agent lance seulement les tests des paquets qu’il touche : `npm run test --workspace @ucm-kit/core` pour le kit, `npm run test:paquet -- cli`, `npm run test:paquet -- adapter`, puis `npm run typecheck`. Un lot qui touche `packages/kit/src/` lance aussi `node scripts/run-tests.cjs` à la racine.
- Deux échecs sont admis dans le compte rendu d’un agent, et seulement eux : `tests/versionSuitLeContenu.test.mjs`, et le test de fraîcheur de `tests/inventaire.test.ts` (« La vue n’est plus à jour »). Tout autre échec est un défaut du lot.
- Un implémenteur ne lance ni `npm run vues`, ni `npm test` à la racine. Aucun agent ne lance `test:ui`, et aucun agent ne commite.
- Un nom n’entre dans `packages/kit/src/lecteurs/index.mjs` qu’avec son premier appelant hors des tests. `preparerControle` et la porte `./usages` n’entrent qu’au lot 3.1. Une publication faite par une autre session avant 4.3 n’expose donc aucun juge inachevé (N-07).

### Point de synchronisation

À la fin de chaque vague, la conversation principale :

1. relit le diff de chaque lot contre sa note ;
2. fait lancer par un `verificateur`, sur l’arbre stable, dans cet ordre : `npm run agents:diff`, `npm run build`, `npm run vues`, `npm test`, `npm run typecheck` ;
3. relit les documents que `agents:diff` liste ;
4. commite chaque lot par chemins explicites, avec `INVENTAIRE-UCM.html` dans le dernier commit de la vague et la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ;
5. coche les cases des lots avec leur hash, fait relancer `npm run vues` (le plan est une source de l’inventaire), commite le plan et `INVENTAIRE-UCM.html` (`docs(recherches): P6, cases de la vague <n>`), puis pousse.

Exception : le lot 3.1 se commite avec le lot 4.1, parce que
`apiPublique.test.mjs` exige la version montée dès que la prise change.

### Tests qui échouent légitimement

| Test | De | Jusqu’à | Pourquoi |
|---|---|---|---|
| `tests/versionSuitLeContenu.test.mjs` | commit de 0.21 | commit de 4.1 | le contenu publiable du kit, puis de la CLI et de l’adaptateur, change sans montée ; une seule montée, en 4.1 |
| Fraîcheur de `tests/inventaire.test.ts` | chaque modification | `npm run vues` du point de synchronisation | `docs/inventaire/sources.json` déclare `packages/*/src/**`, les aides, les skills et les plans |
| `packages/kit/tests/apiPublique.test.mjs` | lot 3.1 | lot 4.1, même commit | la prise change, la version suit en 4.1 |
| `scripts/pins-servis.mjs` dans `publish.yml` | publication du kit | publication de l’adaptateur | les documents épinglent les trois versions, servies une par une (skill `publier-paquets`) |

## Décisions

- [x] 0.1 Décision du mainteneur. Valeurs neutres (D6) : liste A, `0`, `none` et `fit-content`.
  - Le corpus Playground écrit `0` dans `Button.tsx:254` et `:260`, `none` dans `Button.tsx:252`, `:253` et `TileLink.tsx:68`, `fit-content` dans `Button.tsx:248-249`, `StressTest.tsx:222-223` et `Alert.tsx:78`. FORMAT.md lit l’absence de dimensionnement d’un slot comme un `fit-content` (lignes 620 à 626).
  - Liste B, écartée : A, plus `auto`, `inherit`, `transparent` et `currentColor`, qu’aucun composant du corpus n’écrit.
  - Choix du mainteneur : A. Une valeur neutre passe dans toutes les propriétés des trois familles, donc chaque valeur ouvre un trou partout. Ajouter une valeur coûte une phrase et ne casse rien. En retirer une fait apparaître des erreurs dans du code existant.
  - Après le lot 2, `controle-du-code-listes.mjs` fait autorité sur ces valeurs, et ce plan n’est plus relu pour elles.
  - Révisée par 0.8.
- [x] 0.2 Décision du mainteneur. L’explication pour le mainteneur vit dans un nouveau guide, `docs/guides/LINTER-UCM.md`, « vraiment bien écrit pour que ce soit très simple à comprendre, et avec le moins de texte possible ».
- [x] 0.3 Décision du mainteneur. Les mots-clés que le contrat publie en clair (`stretch`, `uppercase`, `center`) comptent comme valeurs publiées. Tout réglage d’une liste monte le chiffre du milieu du kit.
- [x] 0.4 Décision du mainteneur. Réalisation (b) avec un seul extracteur. La lecture du code vit une fois, dans `@ucm-kit/adapter-typescript`, et sert le plugin ESLint comme `ucm check`. Le juge reste dans le kit.
- [x] 0.5 Décision du mainteneur. Écriture par défaut des références : `"var(--nom-exact)"` en toutes lettres, sans fonction de traduction. L’agent écrit `"{chemin}"` comme le contrat, puis lance `npx ucm tokens references <fichiers>`, qui remplace chaque référence par son nom exact. Ni l’agent ni `ucm guide` ne calculent ou ne listent les noms.
- [x] 0.6 Décision du mainteneur. La chaîne d’un fichier d’implémentation qui ressemble à une valeur visuelle est jugée où qu’elle soit (définition au cadrage, §7).
- [x] 0.8 Décision du mainteneur. Valeurs neutres : `0`, `none`, `fit-content`, `currentColor`, `transparent`. `inherit` n’en est pas.
- [x] 0.9 Décision du mainteneur. Un constat du code se déroge par la même dérogation motivée que la parité, dans `.ucm/derogations.json`. `eslint-disable` est interdit pour les règles UCM.
- [x] 0.10 Décision du mainteneur (Q1 A). Le juge lit et applique les dérogations. L’éditeur, ESLint et `ucm check` rendent le même verdict.
- [x] 0.11 Décision du mainteneur (Q2 C). Dans une déclaration, le juge ne juge que les parties couleur, longueur, nombre et pourcentage. Un identifiant CSS passe, sauf un nom de couleur. Un test de parité relie les écritures des aides et du format au juge (S-01).
- [x] 0.12 Décision du mainteneur (Q3 A). Une dérogation d’un constat du code tombe au réexport du contrat (clé `export`).
- [x] 0.13 Décision du mainteneur (Q4 B). Le juge examine l’implémentation et les fichiers qu’elle importe, directement ou transitivement, dans le dossier du composant. L’adaptateur résout les imports. Un fichier importé par deux composants reçoit la limite `fichier-partage`.
- [x] 0.14 Décision du mainteneur (Q5 A). Le plugin et `ucm check` jugent le même périmètre, les fichiers des composants.
- [x] 0.15 Décision du mainteneur (Q6 A). Les anciens lots 3 et 4 fusionnent. Les constats du code entrent dans le verdict d’`ucm check` avant l’unique publication.
- [x] 0.16 Décision du mainteneur (Q7 A). Chaque constat porte `regle`. La prise du kit gagne seulement `preparerControle`.
- [x] 0.17 Décision du mainteneur. `npx ucm deroger <composant> <genre> <coordonnées…> --motif "…"` remplit les coordonnées, la date d’export du contrat et l’auteur, valide et écrit l’entrée. Le message de blocage donne la commande complète, motif à remplir. `procedure.md` remplace son interdiction. La dérogation se documente dans le message, `procedure.md` et `docs/guides/LINTER-UCM.md`, et nulle part ailleurs.
- [x] 0.18 Décision du mainteneur. Chaque donnée (code, liste, raison, état, message, commande) a une source unique, lue par tous ses lecteurs, et gardée par un test de parité ou de fraîcheur.
- [x] 0.19 Décision du mainteneur. Le plan n’attend pas le développeur. L’ancienne case 0.7 devient l’[étape F](#étape-f-facultative-retour-du-développeur).

### Choix du plan, à relire par le mainteneur

Ces choix ne viennent d’aucune décision écrite. Le plan les applique, et le
cadrage les range parmi les décisions D15 à D25 (§12).

- `effet` devient une quatrième famille (`opacity`, `filter`, `backdrop-filter`), parce que le format 14.0 tokenise `opacity` et les effets (P4.1).
- Coordonnées des genres du code : `valeur-en-dur` par `fichier` et `valeur`, `token-inconnu` et `repli-en-dur` par `fichier` et `reference`.
- Un commentaire `eslint-disable` qui nomme une règle UCM rend le constat `desactivation-interdite`, bloquant et non dérogeable.
- `preparerControle` rend tous les constats du fichier avec leurs décalages, au lieu des deux fonctions `chaine` et `declaration` du cadrage précédent. Le plugin ne fait que les afficher.
- La porte de l’adaptateur publie un seul nom, `lecteurDuCode`.
- Un fichier partagé répond au contrat de chaque composant qui l’importe.
- Un constat du code plus ancien que le contrat ou que `tokens.json` est « en retard », et ne bloque pas.
- Dans un objet qui n’est pas un style, une clé qui est une propriété d’une famille fait juger sa valeur littérale comme une déclaration (tables `VARIANTS`, `SIZES`).
- `ucm check` signale sans bloquer un `@ucm-kit/core` installé différent de celui de la CLI (N-13).
- La CLI monte au chiffre du milieu (nouveau blocage dans `ucm check`, comme 0.2.0 pour P19). Le kit et l’adaptateur montent leur dernier chiffre (ajouts).
- Les invariants du linter vont dans `packages/plugin-exporter/invariants/diagnostics.md`, que `agents:domicile` rend aujourd’hui (S-11).
- Forme des styles d’intencial-library par défaut : objets `style` et objets typés `CSSProperties`.

## Vague 0

- [x] 0.20 Conversation principale. Commiter ce plan, le cadrage, `pistes.json` et `INVENTAIRE-UCM.html` régénéré par `npm run vues`. Ajouter à `.agents/skills/publier-paquets/SKILL.md`, après le titre, la puce suivante, en chargeant `rediger-pour-agents`. Commit : `7b6544c9`
  - « **Verrou P6.** Ne publier ni `@ucm-kit/core`, ni `@ucm-kit/cli`, ni `@ucm-kit/adapter-typescript` tant que cette puce existe : `main` porte un travail de P6 non publié (`docs/notes/Recherches/Linter Dev/PLAN-IMPLEMENTATION-P6-KIT.md`). Rendre la question au mainteneur. La case 4.3 du plan la retire. »
- [x] 0.21 `executant`. Écrire `nomsCssDesTokens` (S-04), le code ci-dessous tel quel. Commit : `47231744`
  - Dans `packages/kit/src/lecteurs/tokens-dtcg.mjs`, ajouter `import { tokenCssVariable } from "@ucm-kit/core/format";` en tête et, après `indexerTokensDtcg` :

```js
/**
 * Les chemins de chaque nom CSS que `tokenCssVariable` donne : une `Map` du nom
 * vers ses chemins, triés. Un nom porté par deux chemins est une collision.
 * `ucm tokens css`, `ucm tokens references` et le juge du code la lisent ici.
 */
export function nomsCssDesTokens(index) {
  const parNom = new Map();
  for (const chemin of index.keys()) {
    const nom = tokenCssVariable(chemin);
    const chemins = parNom.get(nom);
    if (chemins) chemins.push(chemin);
    else parNom.set(nom, [chemin]);
  }
  for (const chemins of parNom.values()) chemins.sort();
  return parNom;
}
```

  - Ajouter `nomsCssDesTokens` à l’export de `./tokens-dtcg.mjs` dans `packages/kit/src/lecteurs/index.mjs`, et dans `index.d.mts`, sous `indexerTokensDtcg` : `/** Les chemins de chaque nom CSS, triés ; deux chemins pour un nom sont une collision. */ export function nomsCssDesTokens(index: Map<string, unknown>): Map<string, string[]>;`.
  - Trois tests dans `packages/kit/tests/tokens-dtcg.test.mjs` : `layout.size.50%` et `layout.size.50` donnent une entrée `--layout-size-50` à deux chemins, `["layout.size.50", "layout.size.50%"]` ; deux chemins distincts donnent deux entrées d’un chemin ; l’ordre des groupes du fichier ne change pas le résultat.
  - Fin : `npm run test --workspace @ucm-kit/core` passe.

## Vague 1

- [x] 1.1 `implementeur-exigeant`. Juge du kit et dérogation des constats du code. Commit : `354ef421`
- [x] 1.2 `implementeur-exigeant`. Lecteur du code dans l’adaptateur. Commit : `84aac8a1`
- [x] 1.3 `implementeur`. Écriture des références et `ucm tokens references`. Commit : `afd57f0e`

### Lot 1.1. Juge du kit et dérogation des constats du code

Nature : code nouveau. Coller le cadrage §6 (« Le juge, dans le kit », « Le
contrat du plugin ») et §7 en entier.

`controle-du-code-listes.mjs` est un module pur : aucun `node:`, aucun import
hors du kit. Il porte, une entrée par ligne :

- `FAMILLES` : `couleur`, `dimension`, `typographie`, `effet`, chacune `{ famille, raison }`.
- `PROPRIETES_PAR_FAMILLE`, `{ propriete, familles, raison }`. Couleur : `color`, `background`, `background-color`, `border-color`, `outline-color`, `fill`, `stroke`, `text-decoration-color`. Dimension : `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height`, `padding` et ses quatre côtés, `padding-inline`, `padding-block`, `padding-inline-start`, `padding-inline-end`, `padding-block-start`, `padding-block-end`, `gap`, `row-gap`, `column-gap`, `border-radius` et ses quatre coins, `border-width`, `outline-width`, `outline-offset`, `top`, `right`, `bottom`, `left`, `inset`, `inset-inline`, `inset-block`, `grid-template-columns`, `grid-template-rows`. Couleur et dimension : `border`, `outline`, `box-shadow`, `text-shadow`. Typographie : `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `text-transform`, `font-variant-caps`, `text-decoration`, `text-decoration-line`, `font-style`, `text-wrap-style`, `text-box`, `text-align`, `text-indent`, `line-clamp`, `-webkit-line-clamp`. Effet : `opacity`, `filter`, `backdrop-filter`.
- `VALEURS_NEUTRES`, `{ valeur, raison }` : `0`, `none`, `fit-content`, `currentcolor`, `transparent`.
- Listes à raison unique, chacune un tableau et une constante `RAISON_…` : `UNITES_DE_LONGUEUR` (toutes les unités de longueur de CSS Values 4, plus `fr`), `FONCTIONS_DE_COULEUR` (`rgb`, `rgba`, `hsl`, `hsla`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `color`, `color-mix`, `light-dark`), `FONCTIONS_MATHEMATIQUES` (`calc`, `min`, `max`, `clamp`), `NOMS_DE_COULEUR` (les couleurs nommées de CSS Color 4, source en commentaire, sans `transparent` ni `currentcolor`), `MOTS_CLES_DE_FORME` (`solid`, `dashed`, `dotted`, `double`, `groove`, `ridge`, `inset`, `outset`, `hidden`, `auto`, `none`, `normal`), `ATTRIBUTS_SANS_VALEUR_VISUELLE` (`href`, `id`, `key`, `name`, `htmlFor`, et les préfixes `aria-` et `data-`).
- `CHAMPS_A_VALEUR_PUBLIEE`, `{ champ, famille, raison }`, et `CHAMPS_HORS_FAMILLE`, `{ champ, raison }`, d’après la table du cadrage §7 (S-03). `stretch` publie aussi `100%`.
- `CODES_DU_CONTROLE_DU_CODE`, `{ code, regles, niveau, raison }`, et `LIMITES_DU_CONTROLE`, `{ code, raison }`, avec les codes du cadrage §6. Une entrée ne porte pas « dérogeable » : `coordonneesDuGenre(code) !== null` le dit.
- Les messages des constats et des limites, construits par des fonctions de ce module à partir des `faits`. Textes ci-dessous.

`controle-du-code.mjs` porte :

- `preparerControle(fichier, { texte, lecteur, racine })` : remonte depuis le fichier jusqu’au premier `ucm.config.json` quand `racine` manque, lit la configuration (`lireConfiguration`), les contrats (`trouverContrats`), `tokens.json` (BOM retiré, état par `etatDuFormatDeTokens`) et `.ucm/derogations.json` (`lireDerogations`), puis appelle `preparerControleDepuis`. Elle ne garde rien d’un appel à l’autre et ne lève jamais : une panne de lecture devient une limite.
- `preparerControleDepuis(fichier, { racine, configuration, documents, tokens, derogations, lecteur, texte, lire, cache })` : `documents` est `[{ chemin, contrat }]` (`contrat` vaut `null` si illisible) ; `tokens` est `{ etat, index, noms }`, avec `noms` rendu par `nomsCssDesTokens` ; `lire(chemin)` lit un fichier (défaut `readFileSync` en UTF-8) ; `cache` est une `Map` du chemin vers son relevé, partagée par un appel d’`ucm check`. Le lot 2.1 l’appelle avec les données qu’`ucm check` a déjà lues (S-05).
- `jugerChaine`, `jugerDeclaration` et `creerContexteDuJuge({ tokens, contrat, variables })`, exportés par le module et absents de `index.mjs`, pour les tests et pour le lot 2.3.
- Texte et chemins : le kit retire un BOM de tête de `texte` avant le relevé, et les décalages valent dans le texte sans BOM. Les chemins se comparent par `path.relative`, que Node compare sans la casse sous win32. `fichier` et la coordonnée `fichier` sont relatifs à la racine, avec `/`.

Dans `derogations.mjs` :

- `COORDONNEES_PAR_GENRE` gagne `"valeur-en-dur": ["fichier", "valeur"]`, `"token-inconnu": ["fichier", "reference"]`, `"repli-en-dur": ["fichier", "reference"]`. `GENRES_NON_DEROGEABLES` gagne `nom-css-ambigu`, `non-analyse` et `desactivation-interdite`.
- `coordonneesDuGenre(genre)` rend la liste des coordonnées, ou `null` pour un genre inconnu ou non dérogeable.
- `commandeDeDerogation(composant, genre, coordonnees)` rend `npx ucm deroger <composant> <genre> <c1> <c2> --motif "…"`, coordonnées dans l’ordre de `COORDONNEES_PAR_GENRE`. Un argument hors de `[A-Za-z0-9._/@:+-]` s’écrit entre apostrophes ; s’il contient une apostrophe, entre guillemets, `"` et `\` échappés. Les apostrophes gardent `#`, `{`, `}` et `$` littéraux sous Bash comme sous PowerShell.
- `ajouterDerogation(texte, entree)` : `texte` vaut `null` pour un fichier absent. Rend `{ texte, erreurs, remplacee }`. Refuse une entrée identique (même composant, genre, coordonnées et export). Remplace l’entrée du même écart dont l’`export` est ancien, et le dit par `remplacee`. Valide le résultat entier par `lireDerogations`. Écrit du JSON indenté de deux espaces, terminé par un saut de ligne.
- Exporter `coordonneesDuGenre`, `commandeDeDerogation` et `ajouterDerogation` par `packages/kit/src/lecteurs/index.mjs` et `index.d.mts`, et rien d’autre de ce lot.

Messages, à écrire tels quels (`<…>` est une donnée des `faits`) :

| Code | Message |
|---|---|
| `token-inconnu`, référence | « `<reference>` ne nomme aucun token de tokens.json. » |
| `token-inconnu`, variable | « `<variable>` ne nomme aucun token de tokens.json, et aucun fichier du composant ne la déclare. » |
| `repli-en-dur` | « `var(<variable>, <repli>)` porte un repli écrit en dur. Retirez le repli, la feuille des tokens déclare la variable. » |
| `nom-css-ambigu` | « `<variable>` nomme plusieurs tokens de tokens.json, `<chemins>`. Le contrôle ne choisit pas. Signalez-le au designer. » |
| `valeur-en-dur`, déclaration | « `<propriete>` reçoit `<parties>`, que le contrat de `<composant>` ne publie pas. Écrivez la référence de token que le contrat donne. » |
| `valeur-en-dur`, chaîne | « `<parties>` est une valeur écrite en dur, que le contrat de `<composant>` ne publie pas. Écrivez la référence de token que le contrat donne. » |
| `non-analyse`, expression | « La valeur de `<propriete>` est calculée par le code. Le contrôle ne la juge pas. » |
| `non-analyse`, décomposition | « Une décomposition `...` dans un objet de style n’est pas jugée. » |
| `non-analyse`, gabarit | « Ce nom de variable est construit par le code. Le contrôle ne le juge pas. » |
| `desactivation-interdite` | « Ce commentaire désactive une règle UCM. `ucm check` juge le code sans en tenir compte. Retirez-le, et dérogez si la valeur doit rester. » |
| suffixe d’un écart dérogeable non couvert | « Pour la garder, lancez `<commande>` avec votre raison à la place de `…`. » |
| `configuration-absente` | « Aucun ucm.config.json au-dessus de ce fichier. Le contrôle ne sait pas où sont les contrats. » |
| `configuration-invalide` | « ucm.config.json est invalide : <erreur> » |
| `contrats-introuvables` | « Le dossier des contrats `<dossier>` est introuvable. » |
| `fichier-sans-chemin` | « Ce texte n’a pas de fichier sur le disque. Le contrôle ne le rattache à aucun composant. » |
| `tokens-illisibles` | « `<chemin>` est absent ou illisible. Les références ne sont pas jugées. » |
| `tokens-format-inconnu` | « `<chemin>` est d’une version que ce kit ne lit pas. Les références ne sont pas jugées. » |
| `contrat-illisible` | « Le contrat de `<composant>` est illisible. Les valeurs ne sont pas jugées. » |
| `contrat-ancien` | « Le contrat de `<composant>` est en <version>, plus ancien que ce que ce kit lit. Le designer le réexporte. Les valeurs ne sont pas jugées. » |
| `contrat-recent` | « Le contrat de `<composant>` est en <version>, plus récent que ce kit. Montez @ucm-kit/core. Les valeurs ne sont pas jugées. » |
| `contrats-multiples` | « Plusieurs contrats désignent ce fichier, `<composants>`. Les valeurs ne sont pas jugées. » |
| `fichier-partage` | « Ce fichier sert `<composants>`. Il répond au contrat de chacun. » |
| `lecture-incomplete` | « Ce fichier porte <n> erreurs de syntaxe. La partie illisible n’est pas jugée. » |
| `derogations-illisibles` | « .ucm/derogations.json contient des erreurs. Aucune dérogation n’est appliquée. » |
| `sans-adaptateur` | « Le lecteur du code ne lit pas les fichiers `<extension>`. Le code de `<composant>` n’est pas jugé. » |

Tests : les cas C1 à C47, L1 à L4 et D1 à D3 de la section
[Cas de test](#cas-de-test), dans les trois fichiers de tests du lot. Les cas
qui demandent un relevé reçoivent un lecteur fabriqué dans le test, qui rend
des relevés écrits à la main : le kit n’importe jamais l’adaptateur. Les
contrats viennent de `packages/kit/fixtures/contrats/13.0/` et de
`contrat140()` (`packages/kit/tests/contrats-fabriques.mjs`), jamais d’un
`*.contract.json` écrit à la main.

Fin : `npm run test --workspace @ucm-kit/core` et `node scripts/run-tests.cjs`
passent, hors des deux échecs admis. `preparerControle` n’est ni dans
`lecteurs/index.mjs`, ni dans `src/modules/`. Aucun nœud ESLint ou TypeScript
n’entre dans le kit.

### Lot 1.2. Lecteur du code dans l’adaptateur

Nature : code nouveau. Coller le cadrage §6 (« Le lecteur du code, dans
l’adaptateur », « Le contrat du plugin »).

`packages/adapter-typescript/src/usages.mjs` n’importe que `typescript`,
`node:fs` et `node:path`. Il ne juge rien.

- `releverUsages(texte, nomDuFichier)` passe par `ts.createSourceFile` (genre de script d’après l’extension), sans programme. Il rend `{ chaines, declarations, variables, directives, lecture }`, décalages dans `texte` reçu.
  - Objet de style : l’attribut JSX `style`, un littéral d’objet annoté d’un type qui nomme `CSSProperties` (dont `Record<…, CSSProperties>` et ses valeurs), suivi de `satisfies CSSProperties` ou `as CSSProperties`, ou rendu par une fonction dont le type de retour nomme `CSSProperties`. Chaque propriété y donne une déclaration `contexte: "style"`. Une expression donne `valeur: null`. Une décomposition `...x` donne `{ propriete: null, valeur: null }`.
  - Autre littéral d’objet : une propriété à clé identifiant ou chaîne, dont la valeur est une chaîne ou un nombre littéral, donne une déclaration `contexte: "objet"`. Une valeur calculée ne donne rien.
  - La valeur entière d’une déclaration n’est pas aussi une chaîne.
  - Chaîne : tout autre littéral de chaîne et chaque morceau fixe d’un gabarit. Une chaîne d’attribut JSX porte `attribut: <nom>`. Ne sont pas des chaînes : un commentaire, un texte JSX, un littéral de type, une clé d’objet, un spécificateur d’import ou d’export.
  - `variables` : les clés `--nom` des objets de style.
  - `directives` : chaque commentaire qui contient `eslint-disable`, avec `texte`, `debut` et `fin`.
  - `lecture` : `{ complete, erreurs }`, d’après les erreurs de syntaxe. Une extension hors de `EXTENSIONS_LUES` rend `{ complete: false, erreurs: 0, extension: "<ext>" }` et des listes vides.
- Normalisation React : `backgroundColor` devient `background-color`, `WebkitLineClamp` devient `-webkit-line-clamp`, `msFoo` devient `-ms-foo`. Un nombre reçoit `px`, sauf `0`, qui reste `0`, et sauf les propriétés sans unité de React, liste recopiée de React avec sa source en commentaire, seule copie du dépôt. Elle vaut pour les deux contextes.
- `fichiersDuComposant(implementation)` : rend `{ fichiers, lecture }`. `fichiers` porte des chemins absolus, l’implémentation d’abord, puis les fichiers qu’elle importe, triés. Les imports relatifs se lisent par `ts.preProcessFile`, se résolvent vers `.ts`, `.tsx`, puis `index.ts` et `index.tsx`, et ne se suivent que dans le dossier de l’implémentation et ses sous-dossiers, transitivement, sans boucler. Une implémentation absente rend `fichiers: []`.
- `EXTENSIONS_LUES = [".ts", ".tsx"]`.
- `lecteurDuCode = Object.freeze({ releverUsages, fichiersDuComposant, extensions: EXTENSIONS_LUES })`.
- `adaptateurTypeScript` (`src/parite.mjs`) gagne la propriété `lecteurDuCode`. `src/index.d.mts` déclare son type. `package.json` ne change pas : la porte `./usages` s’ouvre au lot 3.1.

Tests : E1 à E21 dans `packages/adapter-typescript/tests/usages.test.mjs`, sur
des `.tsx` et des dossiers fabriqués dans un dossier temporaire du test.

Fin : `npm run test:paquet -- adapter` passe, tests de parité compris, sans
changement d’attente.

### Lot 1.3. Écriture des références et `ucm tokens references`

Nature : code et texte nouveaux. Coller le cadrage §8.

- `packages/cli/aides/composant.md`, lignes 33 et 34 : remplacer « Chaque référence `{chemin.du.token}` reste écrite en toutes lettres. » par « Chaque référence reste écrite en toutes lettres, sous la forme que l’aide `resolution-token` donne. »
- `packages/cli/aides/resolution-token.md` :
  - Sens, lignes 10 et 11 : remplacer « Les pixels de `structuralSize` et des pistes de grille sont les seules valeurs brutes prévues. » par « Seules les valeurs que le contrat publie en clair s’écrivent brutes. » (P6.1).
  - Nouvelle section « Écriture par défaut » : « Écrire chaque référence comme le contrat, `"{chemin}"`, puis lancer `npx ucm tokens references <fichiers>`, qui la remplace par `"var(--nom)"`. Le code ne contient aucune fonction qui traduit un chemin en nom. »
  - Preuve : ajouter « Quand le repository suit l’écriture par défaut, `npx ucm tokens references --verifier <fichiers>` sort sans erreur. » (N-11).
  - L’aide sort de la liste `ANCRAGES` de `packages/cli/tests/aides.test.mjs`.
- `packages/cli/src/guide.mjs`, `aidesDuContrat` : avec `ecritures-par-defaut: non` et sans section `## resolution-token`, l’aide reste listée sous « Non tranché : demander au développeur », par une règle qui nomme l’aide, comme celle de `composant`.
- `packages/cli/src/tokens-references.mjs`, `ucm tokens references [--verifier] <fichiers…>` :
  - Lit `tokens.json` par `lireConfiguration` et `indexerTokensDtcg`, et les noms par `nomsCssDesTokens` (S-04). Détecte une référence par `isTokenReference` (S-09).
  - Remplace une chaîne entre guillemets dont tout le contenu est une référence par `"var(--nom)"`, guillemets d’origine gardés.
  - Laisse et nomme avec fichier et ligne : une référence absente de `tokens.json`, une référence dans une chaîne plus longue ou un gabarit, une référence passée en argument d’un appel (`token("{a.b}")`, P6.2). Chacune fait sortir en 1.
  - Deux chemins au même nom arrêtent la commande avant toute écriture, sortie 2.
  - Refuse d’écrire quand `.ucm/conventions.md` porte une section `## resolution-token`, sortie 2, avec un message qui nomme la section (N-11). `--verifier` y sort en 0 et dit que le repository garde sa propre écriture.
  - Garde les fins de ligne et le BOM du fichier (N-26). Un fichier n’est réécrit que s’il change. Un second passage ne change rien.
  - `--verifier` n’écrit rien et sort en 1 s’il reste une référence à remplacer ou un des cas laissés.
- `packages/cli/src/ucm.mjs` : entrée `tokens references` dans `COMMANDES`, avec usage, rôle et options. La branche `tokens` aiguille `css` vers `tokensCss` et `references` vers la nouvelle commande. `packages/cli/src/tokens-css.mjs` : `USAGE_TOKENS` et le message sans sous-commande nomment `css` et `references` ; le contrôle des collisions passe par `nomsCssDesTokens`, avec les mêmes messages (N-09).
- `packages/cli/src/init.mjs`, ligne 319, et `packages/cli/README.md`, ligne 382 : l’exemple de tête devient « Stack : React 19, styles en objets `style` typés `CSSProperties`. Un composant par dossier, tests à côté. », en anglais dans le README (F1). Le README gagne la commande dans sa liste.
- `ucm guide` n’imprime aucune liste de noms CSS.

Tests : G1 à G13, dans `packages/cli/tests/tokens-references.test.mjs` et les
tests de la CLI de la table, sur des fichiers fabriqués dans un dossier
temporaire.

Fin : `npm run test:paquet -- cli` passe. `ucm --help` liste la commande.

## Vague 2

- [ ] 2.1 `implementeur-exigeant`. Constats du code dans le verdict d’`ucm check`. Commit : `…`
- [ ] 2.2 `implementeur`. `ucm deroger`, rangs du composant et procédure. Commit : `…`
- [ ] 2.3 `implementeur`. Parité des aides et du juge. Commit : `…`

### Lot 2.1. Constats du code dans le verdict

Nature : modification d’une règle à plusieurs lecteurs. Coller le cadrage §7
(« Le périmètre », « La dérogation d’un constat du code ») et §9 (« La CI suit
la règle du dernier modifié », « L’état d’un composant, une donnée »).

- `AdaptateurDImplementation` (`packages/kit/src/lecteurs/index.d.mts`) gagne `lecteurDuCode?: LecteurDuCode`. Le type `LecteurDuCode` et ceux du relevé se déclarent dans le même fichier, d’après `packages/adapter-typescript/src/index.d.mts`.
- `controlerRepository` (`controle-repository.mjs`) :
  - pour chaque contrat lisible dont l’implémentation existe, prend les fichiers du composant par `adaptateur.lecteurDuCode.fichiersDuComposant`, appelle `preparerControleDepuis` sur chacun avec la configuration, les documents, l’index des tokens et les dérogations déjà lus, un `cache` commun, et garde les constats de ce composant ;
  - range le résultat dans le bilan : `bilan.code = { fichiers, ecarts, nonAnalyses, limites, lecture }`. `fichiers` est relatif à la racine. `ecarts` porte chaque constat de niveau `ecart` sous la forme de `ecartsIdentifiesDeParite` : `genre` (le code), `coordonnees`, `derogeable`, `niveau`, `texte` (le message), plus `fichier` et `ligne` ;
  - sans `lecteurDuCode` alors que l’adaptateur est attendu et présent, `bilan.code.lecture` vaut `adaptateur-ancien` (P3.2). Une limite `lecture-incomplete` d’un fichier du composant donne `lecture-incomplete` ;
  - le rang de repli d’une demande (`rangDeLaDemande`) vaut 0 pour le code quand un fichier du composant est modifié.
- `perimetreDeLaDemande` (`perimetre-rapport.mjs`) retient un bilan quand la demande modifie un de ses fichiers de code (`bilan.code.fichiers`), sinon son implémentation.
- `verdictDuComposant` (`verdict-bilan.mjs`) :
  - appelle `appliquerDerogations` une fois, sur les écarts de parité et du code ensemble, donc `tombees` et `sansObjet` les comptent une fois ;
  - un écart du code restant est « en retard » quand le contrat ou `tokens.json` est plus récent que le code. Le contrat plus récent donne `en-retard-sur-son-contrat`, sinon `en-retard-sur-les-tokens`. Sinon l’écart donne `ecart` ;
  - `adaptateur-ancien` et `lecture-incomplete` donnent `code-non-verifie`, et bloquent une demande qui juge le code ;
  - rend `bloquantPar: { contrat, tokens, parite, code }`, et `bloquant` vaut leur disjonction. Le rapport lit `bloquantPar`, et `reponseDeLaDemande` disparaît (S-06).
- `TEXTES_DES_ETATS` (`verdict-bilan.mjs`), une entrée par état de `ETATS_DE_COMPOSANT`, `{ phrase, raison }`, exportée par `index.mjs` et déclarée dans `index.d.mts`. Le terminal lit `phrase` (`etatDeLEcart` disparaît), l’inventaire lit `raison` (S-07). Textes :

| État | `phrase` | `raison` |
|---|---|---|
| `contrat-invalide` | contrat invalide | Le contrat est illisible, incomplet ou hors de la fenêtre de lecture, donc aucun outil ne peut le lire. |
| `tokens-absents` | token absent de tokens.json | Le contrat cite un token que tokens.json ne porte pas, donc le composant afficherait une valeur vide. |
| `ecart` | code en écart | Le code s’écarte du contrat ou de tokens.json et il est plus récent qu’eux. Le développeur le corrige. |
| `code-non-verifie` | code non vérifié | L’adaptateur attendu manque, est ancien, ne se charge pas ou ne lit pas le fichier. Rien n’est prouvé. |
| `en-retard-sur-son-contrat` | code en retard sur son contrat | Le contrat a changé après le code. Le développeur le rattrape à sa prochaine demande sur ce composant. |
| `en-retard-sur-les-tokens` | en retard sur les tokens | tokens.json a changé après le contrat ou le code. Le designer réexporte le contrat, ou le développeur met le code à jour. |
| `deroge-a-valider` | code en écart, accepté par une dérogation | Une dérogation motivée couvre l’écart jusqu’au prochain export du contrat. Le designer relit son motif. |
| `pas-encore-d-implementation` | pas encore d’implémentation | Le contrat est arrivé avant le code, état autorisé. |
| `conforme` | code conforme | Aucun écart, aucun retard, aucune dérogation. |

- Rapport et terminal. Les constats du code entrent dans les sections du code existantes. Une ligne d’écart s’écrit « `<composant>` : `<fichier>` ligne <ligne> : <message> », message avec sa commande compris, dix lignes au plus par composant, puis « et <n> autres : lancez `npx ucm check` en local ». Une ligne d’écart de parité dérogeable gagne la commande de `commandeDeDerogation`. L’action « poser une dérogation motivée dans `.ucm/derogations.json` » devient « Un développeur doit mettre le code à jour, ou lancer la commande donnée sous l’écart. ». Un retard du code sur `tokens.json` a sa section : titre « Le code cite des tokens que tokens.json n’a plus », action « Un développeur doit mettre le code à jour la prochaine fois qu’il modifie ce composant. », statut « Ce retard ne bloque pas la fusion. ». La section des tokens du designer ne retient que les composants dont `bilan.manquants` n’est pas vide. Les usages non analysés se disent en une ligne d’information par composant : « `<composant>` : <n> valeurs calculées par le code, non jugées. » (P3.3). `adaptateur-ancien` reprend la section « Le code TypeScript n’est pas vérifié », avec « L’adaptateur TypeScript installé ne sait pas lire le code des composants. » et l’action d’installation existante.

Tests : V-21 à V-32 dans `packages/kit/tests/verdict-demande.test.mjs` ;
S5 et S6 dans `controleRepository.test.mjs` ; S7 dans
`declarationsDesLecteurs.test.mjs` ; un cas de périmètre par fichier voisin dans
`perimetre-rapport.test.mjs`. Les tests de la CLI que le nouveau texte du
rapport touche se mettent à jour dans `check.test.mjs` et `recette.test.mjs`,
seuls fichiers de la CLI de ce lot. V-01 à V-20 passent sans changement
d’attente.

Fin : `npm run test --workspace @ucm-kit/core`, `node scripts/run-tests.cjs`
et `npm run test:paquet -- cli` passent, hors des deux échecs admis.

### Lot 2.2. `ucm deroger`, rangs du composant et procédure

Nature : code nouveau et texte donné. Coller le cadrage §7 (« La dérogation
d’un constat du code »).

- `packages/cli/src/deroger.mjs`, `ucm deroger <composant> <genre> <coordonnées…> --motif "<raison>" [--par "<nom>"]` :
  - seules `--motif` et `--par` sont des options ; tout autre argument est une coordonnée, même s’il commence par `--` ;
  - lit la configuration (une erreur sort en 2), trouve le contrat par `identifiantDuContrat`, et prend son `meta.exportedAt` ; un composant inconnu ou un contrat sans `exportedAt` sort en 2 ;
  - prend la liste des coordonnées par `coordonneesDuGenre` ; un genre inconnu ou non dérogeable sort en 2 avec le message du kit ; un nombre de coordonnées faux sort en 2 et nomme les coordonnées attendues ;
  - `par` vaut `--par`, sinon `git config user.name` ; vide, la commande sort en 2 et demande `--par` ;
  - un motif vide ou égal à `…` sort en 2 ;
  - écrit par `ajouterDerogation`, puis imprime l’entrée et « Commitez .ucm/derogations.json avec votre demande. ». Une entrée identique sort en 2 ; une entrée tombée remplacée se dit.
- `packages/cli/src/ucm.mjs` : entrée `deroger` dans `COMMANDES` et aiguillage.
- `packages/cli/src/rangs.mjs`, `mesurerLesRangs` : option `fichiersDuComposant`. Le rang du code d’un composant est le plus petit rang connu de ses fichiers, `null` si aucun n’est connu. Sans l’option, le rang reste celui de l’implémentation.
- `packages/cli/src/check.mjs` : passe `adaptateur?.lecteurDuCode?.fichiersDuComposant` à `mesurerLesRangs`. Écrit en avertissement, sans bloquer, les lignes de `noyauEnDesaccord(racine)` (`guide.mjs`) (N-13).
- `packages/cli/procedure.md`, ligne 44 : remplacer la puce « Écrire dans `.ucm/derogations.json`. Seul un développeur y pose une exception, avec son motif et son nom. » par « Écrire dans `.ucm/derogations.json` sans demande du développeur. Un constat se corrige d’abord dans le code. Si c’est impossible, proposer au développeur la commande `npx ucm deroger` que le constat donne, lui demander le motif, et ne la lancer qu’à sa demande. »
- `packages/cli/README.md` : la commande dans la liste, avec un exemple.
- Parité N-21 : un test vérifie que `EXTENSIONS_PAR_ADAPTATEUR["@ucm-kit/adapter-typescript"]` (`packages/cli/src/adaptateur.mjs`) égale `adaptateurTypeScript.lecteurDuCode.extensions`.

Tests : DR1 à DR8 et N21 dans `packages/cli/tests/deroger.test.mjs` ; RG1, RG2
et N13 dans `verdictGit.test.mjs` ; l’aide dans `cli.test.mjs`.

Fin : `npm run test:paquet -- cli` passe, hors des deux échecs admis.

### Lot 2.3. Parité des aides et du juge

Nature : test nouveau et texte d’aide. Coller le cadrage §7 (« Valeur en dur »).

- `tests/ecrituresDesAidesJugees.test.mjs` lit chaque `packages/cli/aides/*.md`, prend dans la section « Écriture par défaut » chaque code en ligne de la forme `propriete: valeur`, remplace chaque `<…>` et chaque `var(--…)` par la variable d’un token d’un `tokens.json` fabriqué, et passe la déclaration à `jugerDeclaration` (import relatif de `packages/kit/src/lecteurs/controle-du-code.mjs`, contexte par `creerContexteDuJuge`).
  - P1 : chaque déclaration rend `[]`.
  - P2 : chaque propriété qui y reçoit un `<…>` ou un `var(--…)` figure dans `PROPRIETES_PAR_FAMILLE`.
- Une écriture que l’aide donne en mots reçoit une forme en code qui passe le juge : dans `contour-border.md` et `contour-ring.md`, « moins la largeur » devient `outline-offset: calc(<width> * -1)`, « moins la demi-largeur » `outline-offset: calc(<width> / -2)` ; dans `position-absolue.md`, l’accroche `center` s’écrit `inset-inline: 0` et `margin-inline: auto` sur l’axe horizontal, `inset-block: 0` et `margin-block: auto` sur l’axe vertical, avec une taille autre que `auto`.
- Une propriété absente de `PROPRIETES_PAR_FAMILLE` s’y ajoute, avec sa raison. Une valeur qui n’y passe que neutre arrête le lot : ajouter une valeur neutre est une décision du mainteneur.
- `CARTE.md`, section `## tests/` : une ligne pour le nouveau test.

Fin : `node scripts/run-tests.cjs` et `npm run test:paquet -- cli` passent,
hors des deux échecs admis.

## Vague 3

- [ ] 3.1 `implementeur-exigeant`. Les deux prises. Commit : avec 4.1.
- [ ] 3.2 `implementeur`. Toutes les règles dans l’inventaire. Commit : `…`
- [ ] 3.3 Conversation principale. Guide, skill, invariants, cartes. Commit : `…`

### Lot 3.1. Les deux prises

Nature : ajout aux prises. Coller le cadrage §6 (« Le contrat du plugin ») et
la section [Ajout à la décision d’API](#ajout-à-la-décision-dapi).

- Kit : republier `preparerControle` dans `packages/kit/src/modules/index.mjs` et `index.d.mts`, et l’exporter par `packages/kit/src/lecteurs/index.mjs` et `index.d.mts`. Déclarer les types publiés : `ControleDuFichier`, `Constat` avec `faits` en union discriminée par `code`, `Limite`, `LecteurDuCode` et le relevé (N-12).
- `packages/kit/tests/prise-exemples.mjs` et `prise-attendus.json` :
  - les trois échanges du cadrage §6, sur un repository temporaire (contrat de `contrat140()`, `tokens.json` fabriqué) et un lecteur fabriqué ;
  - un exemple généré depuis les listes : une déclaration par entrée de `VALEURS_NEUTRES`, de `PROPRIETES_PAR_FAMILLE`, de `UNITES_DE_LONGUEUR`, de `FONCTIONS_DE_COULEUR` et de `FONCTIONS_MATHEMATIQUES`, et un appel par classe de valeur (couleur, longueur, nombre, pourcentage, fonction, identifiant, nom de couleur). Tout réglage d’une liste change donc un résultat attendu (N-19) ;
  - aucun chemin de la machine dans un résultat : `racine` retirée, `fichier` relatif.
- `packages/kit/CHANGELOG.md` : entrée `### ajout` pour `preparerControle`, « Décidé par le mainteneur (Q7 A) », sous le titre de la version que 4.1 pose.
- Adaptateur : `package.json` gagne l’entrée `"./usages": { "types": "./src/usages.d.mts", "default": "./src/usages.mjs" }`, qui ne publie que `lecteurDuCode`. Créer `src/usages.d.mts`, `packages/adapter-typescript/CHANGELOG.md` avec l’entrée `### ajout`, et `tests/usagesPromis.test.mjs`, sur le modèle de `packages/kit/tests/apiPublique.test.mjs` : il compare les noms de la porte, les membres de `lecteurDuCode` et les résultats de ses exemples à la version précédente, et exige l’entrée du journal.
- `docs/guides/MODULES.md` : les deux imports, l’appel complet, un renvoi aux types de `index.d.mts` pour les résultats et les limites. Le groupe `["@ucm-kit/adapter-typescript", "@ucm-kit/adapter-typescript/*", "!@ucm-kit/adapter-typescript/usages"]` rejoint l’exemple `no-restricted-imports` (N-25). « La prise a 8 noms » devient une phrase sans nombre.
- `packages/kit/README.md` et `packages/adapter-typescript/README.md` : la nouvelle fonction et la porte, en une ligne chacune.

Fin : `npm run test --workspace @ucm-kit/core` et `npm run test:paquet --
adapter` passent, hors de `apiPublique.test.mjs`, qui attend 4.1.

### Lot 3.2. Toutes les règles dans l’inventaire

Nature : texte généré. La section 7 du gabarit (« La suite ») ne change pas.

Dans la section 6 de `docs/inventaire/gabarit.html` (« Ce qui est vérifié, et
où ») :

1. « Dans Figma, avec Architect » ne change pas.
2. « Dans la pull request, avec `ucm check` » : une table remplace les trois cartes « Ce que `ucm check` fait de chaque écart aujourd’hui » et la note sur `bilanEstBloquant`. Une ligne par état de `ETATS_DE_COMPOSANT`, dans son ordre. Trois colonnes de verdict (demande de code, demande de contrats, demande de `tokens.json` seul), calculées par des appels à `verdictDeLaDemande`. Une colonne « pourquoi », lue dans `TEXTES_DES_ETATS`, et une colonne « autorité ».
3. « Dans l’éditeur et la CI, avec le linter » : une ligne par code de `CODES_DU_CONTROLE_DU_CODE`, avec ses règles, son niveau, sa raison, et « dérogeable » d’après `coordonneesDuGenre`. Un pli liste les familles, les propriétés par famille et les valeurs neutres, chacune avec sa raison, et une phrase nomme la commande `ucm deroger`.
4. Une ligne finale « Ce qui n’est pas vérifié » renvoie aux pistes du rendu.

- La réponse de la section 8 « Que se passe-t-il quand le designer change un token ? » perd la phrase « Un token cité par un contrat puis retiré avertit aujourd’hui, et bloquera une fois la règle de blocage codée (P19). » au profit de la règle du tableau (S-08).
- `releves.ts` importe les tables du kit par chemin relatif, comme il importe `packages/cli/src/ucm.mjs`. `generer-inventaire.ts` gagne l’univers « codes du linter » : chaque code de `CODES_DU_CONTROLE_DU_CODE` est montré par la page ou exclu dans `couverture.ts` (S-10).
- `decisions.json` : la règle `valeur-en-dur-bloquee-par-le-linter` dit « Une valeur écrite en dur dans le code d’un composant bloque la demande d’un développeur qui le modifie, par `ucm check` et le linter (P6). », et sort de la liste « pas encore dans le code » par le champ que lit `{{lignes-decidees}}`.
- La skill `regler-le-linter` et les commandes `ucm tokens references` et `ucm deroger` sont montrées par les générateurs existants (annexe « Outillage », table des commandes). Le lot le vérifie après `npm run vues`, et ne les écrit pas à la main (N-10).

Fin : le `verificateur` lance `npm run vues` puis
`node scripts/run-tests.cjs`. Dans une copie de travail, une raison changée
dans `controle-du-code-listes.mjs` fait échouer le test de fraîcheur, puis se
rétablit. `node scripts/controle-style.mjs docs/inventaire/gabarit.html` passe.
La conversation principale ouvre `INVENTAIRE-UCM.html` à 1400 px et à 390 px de
large. Aucun texte écrit à la main de la section 6 ne recopie une règle.

### Lot 3.3. Guide, skill, invariants, cartes

Conversation principale. Charger `rediger-pour-agents` pour la skill,
`AGENTS.md`, les invariants et les cartes. Lancer
`node scripts/controle-style.mjs` sur chaque fichier écrit.

- `docs/guides/LINTER-UCM.md`, le moins de texte possible : ce que le linter vérifie, ce qu’il ne voit pas, ce qui se règle et la phrase à dire à un agent pour le régler, le geste de dérogation (une ligne d’entrée et la commande `npx ucm deroger`), la CI (`ucm check` juge, `eslint-disable` ne cache rien), le même `@ucm-kit/core` dans l’éditeur et la CLI, le cache ESLint désactivé, et un renvoi aux types de `index.d.mts` pour le contrat du plugin. Il nomme les fichiers des listes sans recopier leurs valeurs. Le mainteneur dit qu’il comprend chaque phrase.
- `.agents/skills/regler-le-linter/SKILL.md` : le geste de la section [Régler une liste du linter](#régler-une-liste-du-linter), dont la skill devient l’autorité. Description déclenchée par « ajoute `auto` aux valeurs neutres » ou « retire `border` de la famille couleur ». Une ligne au tableau des skills d’`AGENTS.md`.
- En-tête de `controle-du-code-listes.mjs` : une ligne qui renvoie à la skill.
- `.agents/domiciles.json` : le guide et la skill rejoignent les `lies` du domaine `exporter-diagnostics`.
- `packages/plugin-exporter/invariants/diagnostics.md` : la puce du dernier modifié (ligne 16) gagne les constats du code, leur règle de retard et `adaptateur-ancien`, et perd le second lecteur `reponseDeLaDemande`. Trois puces nouvelles : les listes et les codes vivent seulement dans `controle-du-code-listes.mjs` ; `lecteurDuCode` est la seule lecture du code, pour le plugin comme pour `ucm check` ; une dérogation d’un constat du code s’applique dans `preparerControleDepuis`, par `appliquerDerogations`, pour l’éditeur comme pour `ucm check`.
- `packages/kit/CARTE.md`, `packages/adapter-typescript/CARTE.md`, `packages/cli/CARTE.md` : une ligne par fichier créé.
- `docs/guides/POUR-LES-DESIGNERS.md`, §6 : « Le linter, en préparation, refusera » devient le présent. Le tableau des cas gagne deux lignes : « Le développeur écrit une valeur en dur ou un token absent dans le code d’un composant » (bloque, l’écart et la commande de dérogation) et « Vous réexportez un contrat dont le code porte un constat » (passe, le composant est en retard).
- `docs/notes/Recherches/Evolutions globales/DECISION-API-PUBLIQUE.md` : le texte de la section [Ajout à la décision d’API](#ajout-à-la-décision-dapi), à la fin de la partie 2.

## Vague 4. Publication

- [ ] 4.1 `executant`. Monter le kit et l’adaptateur à leur dernier chiffre suivant, la CLI au chiffre du milieu suivant, les pins de `@ucm-kit/core` dans la CLI et l’adaptateur, le titre de version des deux journaux, et chaque version citée par la documentation que `tests/pinDocumente.test.mjs` et `npm run agents:diff` désignent, selon `publier-paquets`. Commit : `…` (avec 3.1)
- [ ] 4.2 `verificateur`. `npm run agents:diff`, `npm run build`, `npm run vues`, `npm test`, `npm run typecheck`. Tout passe, `versionSuitLeContenu` et `apiPublique` compris.
- [ ] 4.3 Conversation principale. Relire le diff de 3.1 et 4.1. Retirer la puce « Verrou P6 » de `publier-paquets` dans le même commit que 3.1 et 4.1. Commiter par chemins explicites, pousser, puis publier le kit, la CLI et l’adaptateur, dans cet ordre, selon `publier-paquets`. Constater chaque version par `npm view <paquet>@<version> version`.
- [ ] 4.4 Conversation principale. Mettre à jour l’alerte Playground de P6 dans `pistes.json` avec les versions publiées de la CLI et de l’adaptateur. Cocher les cases, `npm run vues`, commiter, pousser. Remettre au développeur les trois versions à épingler à l’exact. Commit : `…`

## Étape F, facultative, retour du développeur

Ces points n’ont pas de case. Un retour du développeur ajoute ici les cases
du travail qu’il demande.

- Ancienne case 0.7 : faire relire au développeur le contrat du plugin (cadrage §6), et obtenir la forme d’écriture des styles d’intencial-library. Le plan suppose les objets `style` et `CSSProperties`.
- Réponse avant 4.1 : essai depuis des archives. Créer un `git worktree` du dernier commit de la vague 3, y appliquer le diff de 3.1 (`git diff > _local/p6-prises.patch`, `git -C <worktree> apply`), poser les versions `<version>-essai.1`, lancer `npm ci`, puis `npm pack --workspace @ucm-kit/core`, `--workspace @ucm-kit/cli` et `--workspace @ucm-kit/adapter-typescript` (N-08). Remettre les archives et la recette du cadrage §9. Supprimer le worktree.
- Une forme de style hors des objets (CSS Modules, gabarits CSS-in-JS) : un second relevé dans `lecteurDuCode`, même sortie, et D10 se rouvre. Le juge ne change pas.
- Un faux positif d’une liste : la skill `regler-le-linter`, donc le chiffre du milieu du kit et une publication.
- Un défaut du relevé : correctif de l’adaptateur, dernier chiffre.
- Une demande sur la forme de `preparerControle` : avant 4.1, un ajustement de 3.1 ; après, une rupture de la prise, chiffre du milieu.

## Cas de test

Les tests utilisent des contrats et des tokens fabriqués en mémoire,
`packages/kit/fixtures/contrats/13.0/` et `12.0/`, et `contrat140()`. Un dossier
temporaire du test reçoit les fichiers qui passent par le disque. Aucun test
n’ouvre un clone voisin. Les attendus s’écrivent depuis le cadrage et FORMAT.md,
jamais en rappelant la fonction testée.

### Juge du kit (lot 1.1)

| Cas | Entrée | Résultat attendu |
|---|---|---|
| C1 | chaîne `{components.button.sizes.medium.gap}`, chemin présent | `[]` |
| C2 | chaîne `{components.button.sizes.medium.absent}` | `token-inconnu`, `faits.reference` |
| C3 | même texte, préparé avant puis après le retrait du token sur disque | `[]`, puis `token-inconnu` |
| C4 | chaîne `var(--components-button-sizes-medium-gap)` | `[]` |
| C5 | chaîne `var(--absente)`, ni token ni variable du composant | `token-inconnu`, `faits.variable` |
| C6 | chaîne `var(--layout-size-50)`, tokens `layout.size.50%` et `layout.size.50` | `nom-css-ambigu`, niveau `limite`, `faits.chemins` triés (N-20) |
| C7 | `var(--x)` dans `Button.variants.ts`, `--x` déclarée dans `Button.tsx` | `[]` (D3 au niveau du composant) |
| C8 | `var(--components-button-sizes-medium-gap, 8px)` | `repli-en-dur`, même si le token existe |
| C9 | morceau fixe de gabarit `var(--` | `non-analyse`, forme `gabarit`, règle `token-inconnu` |
| C10 | chaîne `#ff0000` dans une table | `valeur-en-dur` |
| C11 | chaîne `rgb(255 0 0)` | `valeur-en-dur` |
| C12 | chaîne `15px`, contrat `StressTest` 13.0 qui publie `structuralSize.height: "15px"` ; C12b même cas sur `contrat140()` | `[]` |
| C13 | chaîne `12px`, qu’aucun champ ne publie | `valeur-en-dur` |
| C14 | chaîne `15px fit-content(100%)` ; C14b sur `contrat140()` | `[]` |
| C15 | chaînes `Bouton de 12px`, `red`, `50%`, `primary\|contained\|default` | `[]` |
| C16 | déclarations `padding: 0`, `padding: 0px`, `border: none`, `width: fit-content`, `fill: currentColor`, `background: transparent` | `[]` |
| C17 | déclaration `font-size: 15px`, même contrat ; C17b sur `contrat140()` | `valeur-en-dur`, la valeur publiée est de la famille dimension |
| C18 | déclaration `color: red` | `valeur-en-dur` (nom de couleur) |
| C19 | déclaration `background-color: #ffffff`, égale à la valeur d’un token | `valeur-en-dur`, aucun token proposé |
| C20 | déclarations `padding: 12px` et `opacity: 0.5` | `valeur-en-dur` pour les deux (famille `effet`, P4.1) |
| C21 | déclaration `gap`, valeur `null` | `non-analyse`, forme `expression`, règle `valeur-en-dur` |
| C22 | fichier qu’aucun composant n’inclut | `composants: []`, `constats: []`, `limites: []` (Q5) |
| C23 | contrat 12.0, puis 15.0 | limite `contrat-ancien`, puis `contrat-recent`, pour ce composant ; valeurs non jugées, citations jugées |
| C24 | `tokens.json` absent, puis JSON invalide ; C24b format futur | `tokens-illisibles` ; `tokens-format-inconnu` (N-17) ; aucun `token-inconnu` |
| C25 | chaîne `1px solid #cccccc` | `valeur-en-dur` sur `#cccccc` et `1px` (N-04) |
| C26 | chaîne `inset 0 0 0 1px #000` | `valeur-en-dur` sur `1px` et `#000` |
| C27 | chaîne `12px solid` | `valeur-en-dur` sur `12px` |
| C28 | déclaration `box-shadow: inset 0 0 0 var(--w) var(--c)`, tokens présents | `[]` (Q2 C, N-01) |
| C29 | déclaration `outline: var(--w) solid transparent` | `[]` |
| C30 | déclarations `text-align: left`, `font-style: normal`, `width: auto`, `color: inherit` | `[]` (identifiants, Q2 C) |
| C31 | `padding: calc(12px)`, `padding: max(12px, 0px)` ; `outline-offset: calc(var(--w) * -1)` ; `opacity: calc(var(--absente) / 100)` | `valeur-en-dur` sur `12px` ; `[]` ; `token-inconnu` (P4.4, N-16) |
| C32 | chaînes `12pt`, `10vw`, `1.5ch`, `+4px`, `1e1px` | `valeur-en-dur` pour chacune (P4.5) |
| C33 | déclarations `fill: CURRENTCOLOR`, `border: NONE` | `[]` (N-15) |
| C34 | chaînes d’attribut `href="#add"`, `id="#feed"`, `aria-label="#fff"` | `[]` (P5.1) |
| C35 | fichier dans un sous-dossier, `ucm.config.json` deux niveaux au-dessus ; aucun `ucm.config.json` ; configuration invalide ; dossier des contrats absent ; fichier `<input>` | rattaché ; `configuration-absente` ; `configuration-invalide` ; `contrats-introuvables` ; `fichier-sans-chemin` ; jamais d’exception (N-06) |
| C36 | racine `a:\r`, fichier `A:\r\src\components\Button\Button.tsx`, comparés par `path.win32` | rattaché à `Button` |
| C37 | `Button.tsx` importe `./Button.variants`, qui importe `./tables` ; `Button.stories.tsx` dans le dossier | `tables.ts` rattaché à `Button` ; `Button.stories.tsx` hors périmètre (Q4, Q5) |
| C38 | `utils.ts` importé par `Button` et `Alert`, motif `src/components/{id}.tsx` | limite `fichier-partage`, `faits.composants` triés ; constats jugés pour chaque composant |
| C39 | dérogation `valeur-en-dur`, `fichier` et `valeur: "12px"`, `export` = `meta.exportedAt` ; puis `export` ancien | constat avec `deroge: { motif, par }` et sans `commande` ; puis sans `deroge`, avec `commande` (Q1, Q3) |
| C40 | constat `valeur-en-dur` non couvert dans `src/components/Button/Button.tsx` | message terminé par la commande ; `#fff` et `{a.b}` entre apostrophes |
| C41 | directive `// eslint-disable-next-line ucm/valeur-en-dur` ; directive `// eslint-disable-next-line react-hooks/exhaustive-deps` | `desactivation-interdite` ; `[]` |
| C42 | `.ucm/derogations.json` invalide | limite `derogations-illisibles`, aucun constat dérogé |
| C43 | relevé à `lecture.complete` faux | limite `lecture-incomplete`, les constats de la partie lue restent |
| C44 | déclarations `contexte: "objet"` : `color: "red"`, `size: "red"`, `height: "32px"`, `count: "3"` | `valeur-en-dur` ; `[]` ; `valeur-en-dur` ; `[]` |
| C45 | même texte avec et sans BOM de tête | mêmes décalages |
| C46 | un constat de chaque code | `regle` lue dans `CODES_DU_CONTROLE_DU_CODE`, ou selon le contexte pour `non-analyse` |
| C47 | décomposition dans un objet de style | `non-analyse`, forme `decomposition` |

Propriétés : deux préparations ne partagent aucun résultat ; une préparation
ne modifie aucune entrée ; l’ordre des groupes de `tokens.json` ne change
aucun constat ; `text-transform: uppercase` rend `[]` quand le contrat publie
`literals.textTransform: "uppercase"`, et `valeur-en-dur` sinon ; une
implémentation en `.jsx` avec un lecteur qui ne lit que `.ts` et `.tsx` rend la
limite `sans-adaptateur`.

### Listes, codes et dérogation (lot 1.1)

| Cas | Situation | Résultat attendu |
|---|---|---|
| L1 | entrée sans raison, en double, famille hors de `FAMILLES`, valeur hors minuscules ou avec espace de bord | refusée par le test |
| L2 | chaque `cssProperties` de `ROLES` (`packages/kit/src/format/roles-de-rendu.ts`) | dans `PROPRIETES_PAR_FAMILLE` avec la famille `couleur` (S-02) |
| L3 | chaque champ du schéma publié qui admet une chaîne ou un nombre hors référence | dans `CHAMPS_A_VALEUR_PUBLIEE` ou `CHAMPS_HORS_FAMILLE` (S-03) |
| L4 | chaque code de `CODES_DU_CONTROLE_DU_CODE` et de `LIMITES_DU_CONTROLE` | une raison ; `regles` dans `token-inconnu` et `valeur-en-dur` ; `coordonneesDuGenre` non nul pour `valeur-en-dur`, `token-inconnu` et `repli-en-dur` seulement |
| D1 | entrées des trois genres du code ; entrée `nom-css-ambigu` | acceptées ; refusée, « ne se déroge pas » |
| D2 | `commandeDeDerogation` sur `Button`, `valeur-en-dur`, `{ fichier: "src/a b.tsx", valeur: "#fff" }`, puis une valeur à apostrophe | `npx ucm deroger Button valeur-en-dur 'src/a b.tsx' '#fff' --motif "…"` ; guillemets échappés |
| D3 | `ajouterDerogation` sur fichier absent, ajout, doublon, entrée tombée, fichier invalide | création ; ajout ; refus ; `remplacee` ; erreurs, rien d’écrit |

### Lecteur du code (lot 1.2)

| Cas | Texte `.tsx` fabriqué | Résultat attendu |
|---|---|---|
| E1 | `const T = { a: "{x.y}" };` | une chaîne `{x.y}`, `debut` et `fin` encadrent le littéral |
| E2 | `` `var(--${c})` `` | deux morceaux fixes, `var(--` et `)` |
| E3 | `<div style={{ backgroundColor: "#fff" }} />` | une déclaration `background-color`, `#fff`, `contexte: "style"`, aucune chaîne en double |
| E4 | `style={{ padding: 12, opacity: 0.5, lineHeight: 1.5 }}` | `12px`, `0.5`, `1.5` |
| E5 | `style={{ WebkitLineClamp: 2 }}` | `-webkit-line-clamp`, `2` |
| E6 | `style={{ gap: entry.gap, color: ok ? "a" : "b" }}` | deux déclarations à `null` ; `a` et `b` en chaînes |
| E7 | `const S: CSSProperties = { width: "10px" };` et `Record<string, CSSProperties>` | déclarations `contexte: "style"` |
| E8 | `style={{ "--x": "8px" }}` | `variables: ["--x"]` |
| E9 | commentaire `// "{x.y}"` et texte JSX `<p>12px</p>` | rien |
| E10 | texte à erreur de syntaxe | `lecture.complete` faux, nombre d’erreurs |
| E11 | `style={{ padding: 0 }}` | valeur `0` (N-15) |
| E12 | `type Taille = "12px";` | aucune chaîne (N-18) |
| E13 | `const M = { "12px": 1 };` | la clé n’est pas une chaîne |
| E14 | `import x from "./12px";` | aucune chaîne |
| E15 | `<a href="#add" />` | chaîne `#add`, `attribut: "href"` |
| E16 | `{…} satisfies CSSProperties`, `{…} as CSSProperties`, `(): CSSProperties => ({…})` | déclarations `contexte: "style"` (P2.2) |
| E17 | `style={{ ...base, gap: 4 }}` | `{ propriete: null, valeur: null }` puis `gap`, `4px` |
| E18 | `const V = { color: "red", height: 32, count: 3, gap: x };` | déclarations `contexte: "objet"` pour `color`, `height` (`32px`), `count` (`3px`, que le kit ignore hors famille) ; rien pour `gap` (P2.1) |
| E19 | `// eslint-disable-next-line ucm/valeur-en-dur` | une directive, son texte et ses décalages |
| E20 | dossier `Button/` : `Button.tsx` importe `./Button.variants` et `../partage`, `Button.variants.ts` importe `./tables` et `Button.tsx` | `fichiers` : `Button.tsx`, puis `Button.variants.ts` et `tables.ts` ; rien hors du dossier ; aucune boucle |
| E21 | `releverUsages` sur `a.jsx` ; `fichiersDuComposant` sur une implémentation absente | `lecture.complete` faux, `extension: ".jsx"` ; `fichiers: []` |

### Aides et `ucm tokens references` (lot 1.3)

| Cas | Situation | Résultat attendu |
|---|---|---|
| G1 | contrat qui cite des tokens, sans conventions | « Écriture par défaut » de `resolution-token`, qui nomme `ucm tokens references` ; aucune liste de noms CSS |
| G2 | section `## resolution-token` dans `.ucm/conventions.md` | réponse du repository |
| G3 | `ecritures-par-defaut: non`, sans section | `resolution-token` sous « Non tranché » |
| G4 | `"{café.fond}"` et `'{a.b}'` | `"var(--cafe-fond)"` et `'var(--a-b)'` |
| G5 | `ucm aides resolution-token` | Sens réécrit, Écriture par défaut, Preuve avec `--verifier` sous condition |
| G6 | référence absente, et référence dans un gabarit | aucune remplacée, chacune nommée avec fichier et ligne, sortie 1 |
| G7 | deux chemins au même nom CSS | arrêt avant toute écriture, sortie 2, fichier inchangé |
| G8 | second passage, puis `--verifier` | aucun changement ; sortie 0, et 1 sur un fichier qui garde un `"{chemin}"` |
| G9 | `.ucm/conventions.md` avec `## resolution-token` | écriture refusée, sortie 2 ; `--verifier` sort en 0 (N-11) |
| G10 | fichier CRLF avec BOM | CRLF et BOM gardés (N-26) |
| G11 | `token("{a.b}")` | non remplacé, nommé avec fichier et ligne, sortie 1 (P6.2) |
| G12 | `ucm --help` ; `ucm tokens` sans sous-commande | la commande listée ; message qui nomme `css` et `references` (N-09) |
| G13 | `ucm init` sans conventions | exemple de tête en objets `style` (F1) |

### `ucm deroger` et rangs (lot 2.2)

| Cas | Situation | Résultat attendu |
|---|---|---|
| DR1 | commande complète | entrée écrite, `export` du contrat, `par` de `git config user.name`, sortie 0 |
| DR2 | une coordonnée de trop ou de moins | sortie 2, coordonnées attendues nommées |
| DR3 | composant inconnu ; genre `nom-css-ambigu` | sortie 2 ; message du kit |
| DR4 | `--motif` absent, vide ou `…` | sortie 2 |
| DR5 | `user.name` vide, sans `--par` | sortie 2, `--par` demandé |
| DR6 | entrée identique ; entrée tombée du même écart | sortie 2 ; entrée remplacée, dit |
| DR7 | coordonnée `--components-x` | lue comme coordonnée |
| DR8 | commande d’un constat de C40, motif remplacé, découpée comme un shell | s’exécute et écrit l’entrée que C39 couvre |
| N21 | `EXTENSIONS_PAR_ADAPTATEUR` et `lecteurDuCode.extensions` | égales |
| RG1 | `Button.variants.ts` modifié, `Button.tsx` non | rang du code de `Button` = 0 |
| RG2 | un fichier du composant hors de l’historique ; aucun connu | ignoré ; `null` |
| N13 | `node_modules/@ucm-kit/core` d’une autre version | une ligne d’avertissement, code de sortie inchangé |

### Verdict (lot 2.1)

| Cas | Demande et situation | Verdict attendu |
|---|---|---|
| V-21 | code ; `valeur-en-dur` dans `Button.variants.ts` modifié, contrat plus ancien | bloque, `ecart`, `bloquantPar.code` |
| V-22 | code ; contrat réexporté après le code | passe, `en-retard-sur-son-contrat` |
| V-23 | code ; `token-inconnu`, `tokens.json` plus récent que le code | passe, `en-retard-sur-les-tokens`, section du retard du code |
| V-24 | contrats et tokens ; constats du code | passe |
| V-25 | tokens seuls ; constats du code | passe, constats visibles |
| V-26 | code ; constat dérogé, `export` courant | passe, `deroge-a-valider` |
| V-27 | code ; dérogation du code à `export` ancien | bloque ; dérogation tombée |
| V-28 | adaptateur présent sans `lecteurDuCode` | code : bloque, `code-non-verifie`, `adaptateur-ancien` ; contrats : passe |
| V-29 | code ; un fichier du composant à erreur de syntaxe | bloque, `code-non-verifie`, `lecture-incomplete` |
| V-30 | usages non analysés seuls | `conforme`, une ligne d’information chiffrée |
| V-31 | code ; `desactivation-interdite` | bloque, non dérogeable |
| V-32 | une dérogation de parité et une du code sans objet | `sansObjet` les compte une fois chacune |
| S5 | un fichier fixe de test | mêmes constats par `ucm check` et par `preparerControle` (S-05) |
| S6 | toutes les demandes de V-01 à V-32 | le rapport dit bloquant exactement quand `bloquantPar` le dit (S-06) |
| S7 | `TEXTES_DES_ETATS` et `EtatDeComposant` de `index.d.mts` | une entrée par état de `ETATS_DE_COMPOSANT`, union égale (S-07) |

## Réponses aux relectures

Première relecture : `_local/reprise/RELECTURE-P6-RAPPORT.txt`. Seconde :
`_local/reprise/RELECTURE-P6-OPUS-2.txt`. Un problème repris par la seconde
sous un autre numéro a sa réponse sous le numéro de la première.

| Problème | Réponse |
|---|---|
| P1.1 | Lot 1.1 : racine trouvée en remontant, limites de configuration, comparaison par `path.relative`. C35, C36 |
| P1.2 | Décision 0.13 : fichiers importés, résolus par `fichiersDuComposant` (1.2), rang et périmètre par composant (2.1, 2.2). C37, E20, RG1 |
| P2.1 | Lot 1.2 : déclarations `contexte: "objet"`, nombres compris. E18, C44 |
| P2.2 | Lot 1.2 : `satisfies`, `as`, type de retour, décomposition. E16, E17, C47 |
| P2.3, O3 | Aucune porte avant 3.1, verrou dans `publier-paquets` (0.20) |
| P2.4 | Lot 1.2 : `adaptateurTypeScript.lecteurDuCode` |
| P3.1 | Décisions 0.9, 0.10 ; lots 1.1, 2.1, 2.2 ; `desactivation-interdite`. C39 à C42, V-26, V-27, V-31 |
| P3.2 | Lot 2.1 : `adaptateur-ancien`. V-28 |
| P3.3 | Lot 2.1 : information chiffrée, jamais un état ; phrase du cadrage §7 corrigée. V-30 |
| P3.4 | Skill `regler-le-linter` et journal : le nombre de constats nouveaux mesuré sur les fixtures avant publication |
| P4.1 | Famille `effet`, `text-shadow`. C20 inversé |
| P4.2 | `contrat140()`. C12b, C14b, C17b |
| P4.3 | Décision 0.8 |
| P4.4 | Fonctions mathématiques jugées dedans. C31 |
| P4.5 | Toutes les unités de longueur. C32 |
| P5.1 | `ATTRIBUTS_SANS_VALEUR_VISUELLE`. E15, C34 |
| P6.1 | Lot 1.3 : phrase du Sens réécrite. G5 |
| P6.2 | Lot 1.3 : argument d’un appel nommé, non remplacé. G11 |
| P7.1 | Cadrage §10 corrigé |
| P8.1 | Le job ESLint du développeur garde ses autres règles bloquantes ; `ucm check` juge les règles UCM (cadrage §9) |
| P8.2, O5 | Décision 0.15 |
| O1 | Inventaire en vague 3, après le verdict |
| O2 | Écarté : P19 est livrée et publiée (21b78694) |
| O4 | Tient ; la recette corrigée est dans l’étape F |
| G1 | Geste du mainteneur, hors plan ; l’alerte de `pistes.json` le garde (4.4) |
| G2 | `LINTER-UCM.md` et la skill disent comment demander un réglage ; le message donne la commande de dérogation |
| G3 | Écarté : la seule copie visible des listes, l’inventaire, est générée (3.2) |
| G4, S-11 | Écarté pour ce plan : invariants dans `diagnostics.md`. Un domaine propre demande l’accord du mainteneur |
| F1 | Lot 1.3 : exemple de tête d’`ucm init`. G13 |
| F2 | Étape F ; défaut objets `style` |
| N-01, S-01 | Décision 0.11 ; lot 2.3. C28 à C31, P1, P2 |
| N-02 | = P1.2, plus C7 (variables du composant) et C38 (fichier partagé) |
| N-03 | = P3.1 ; genres du code acceptés dans la même version que le juge |
| N-04 | Couleur refusée dans toute chaîne, longueur avec `MOTS_CLES_DE_FORME`. C25 à C27 |
| N-05 | Décision 0.14. C22 |
| N-06 | = P1.1 |
| N-07 | Une montée, en 4.1 ; aucune porte avant 3.1 ; verrou ; `npm run vues` à chaque synchronisation |
| N-08 | Étape F : `git worktree` et `npm pack --workspace` |
| N-09 | Lot 1.3 : `COMMANDES`, `lireArgumentsTokens`, `USAGE_TOKENS` ; la table de l’inventaire se génère. G12 |
| N-10 | Lot 3.2 : vérifié après `npm run vues` |
| N-11 | Lot 1.3 : Preuve sous condition, écriture refusée. G9 |
| N-12 | Cadrage §6 « Le contrat du plugin » ; types publiés en 3.1 |
| N-13 | Lot 2.2 : avertissement d’`ucm check`. Blocage écarté, la CLI juge avec son propre kit. N13 |
| N-14 | Décision 0.11. C30 |
| N-15 | E11, C33 |
| N-16 | `var()` cherché à toute profondeur. C31 |
| N-17 | Limite `tokens-format-inconnu`. C24b |
| N-18 | E12 à E15 |
| N-19 | Unités et fonctions dans les listes ; exemple de prise généré depuis les listes (3.1) |
| N-20 | `faits.chemins` triés. C6 |
| N-21 | `EXTENSIONS_LUES`, limite `sans-adaptateur`, parité N21 |
| N-22 | = P3.3 |
| N-23 | Corrections 1 à 6 retirées ; la 7 reste au mainteneur |
| N-24 | Décisions 0.8 à 0.19 ; cadrage mis à jour |
| N-25 | Lot 3.1 : groupe de l’adaptateur, nombre de noms retiré |
| N-26 | G10 |
| N-27 | Vagues ; un lot par appel ; listes et juge en un lot ; une publication |
| S-02 | L2 (rôles) et P2 (aides) |
| S-03 | L3 |
| S-04 | Lot 0.21 |
| S-05 | `preparerControleDepuis` appelé par `ucm check`. S5 |
| S-06 | `bloquantPar`. S6 |
| S-07 | `TEXTES_DES_ETATS`. S7 |
| S-08 | Lot 3.2 : cartes, note et réponse de la section 8 ; règle de `decisions.json`. T2 et T4 ne relèvent pas de P6 |
| S-09 | `isTokenReference` dans le juge et la commande |
| S-10 | Codes dans un module pur ; univers « codes du linter » |

## Ajout à la décision d’API

Texte pour `docs/notes/Recherches/Evolutions globales/DECISION-API-PUBLIQUE.md`,
à la fin de la partie 2, que le lot 3.3 applique :

> ### Une seconde prise, dans l’adaptateur TypeScript
>
> Le linter de P6 lit le code par `lecteurDuCode`, que `@ucm-kit/adapter-typescript` publie par la porte `@ucm-kit/adapter-typescript/usages`. Cette porte est la seule de l’adaptateur qu’un module importe. Elle publie un seul nom. Elle lit la syntaxe et ne juge rien, donc elle n’importe pas le kit.
>
> Elle suit les règles de la prise du kit. Un nom y entre quand un module l’importe. Le journal `packages/adapter-typescript/CHANGELOG.md` note chaque changement, avec les genres `ajout`, `déprécié` et `rupture`. Une rupture monte le chiffre du milieu de l’adaptateur. `packages/adapter-typescript/tests/usagesPromis.test.mjs` compare les noms de la porte, les membres de `lecteurDuCode` et les résultats attendus de ses exemples à la version précédente, et exige l’entrée du journal.
>
> Un module emploie l’adaptateur que le repository installe pour `ucm check`. Il n’en déclare pas un second. Un module extrait dans son propre paquet l’épingle à la version exacte que le repository installe, comme le kit.

## Régler une liste du linter

Conception du geste. La skill `.agents/skills/regler-le-linter/SKILL.md`,
écrite au lot 3.3, en devient l’autorité. Les listes vivent dans un seul
fichier, `packages/kit/src/lecteurs/controle-du-code-listes.mjs`.

| Étape | Geste |
|---|---|
| Fichier à ouvrir | `packages/kit/src/lecteurs/controle-du-code-listes.mjs` |
| Ligne à écrire | Dans `VALEURS_NEUTRES`, `{ valeur: "auto", raison: "<pourquoi cette valeur ne porte aucune décision du designer>" },`. Dans `PROPRIETES_PAR_FAMILLE`, `{ propriete: "<nom CSS>", familles: ["<famille>"], raison: "<phrase>" },`. Pour retirer, supprimer la ligne. |
| Mesure | Lancer le juge sur les fixtures avant et après, et compter les constats nouveaux ou disparus (P3.4) |
| Ce que les tests vérifient | `controle-du-code-listes.test.mjs` refuse une ligne sans raison ou en double. `apiPublique.test.mjs` voit changer le résultat de l’exemple généré depuis les listes et exige une entrée au journal. Le test de fraîcheur de l’inventaire demande `npm run vues`. |
| Résultat attendu | Recopier dans `packages/kit/tests/prise-attendus.json` le résultat que le test affiche |
| Journal | Dans `packages/kit/CHANGELOG.md`, un titre `## <nouvelle version>`, puis `### rupture`, le nom `preparerControle`, la valeur ajoutée ou retirée, le nombre de constats mesuré, le geste du module et « Décidé par le mainteneur » |
| Version | Le chiffre du milieu du kit monte (décision 0.3). La CLI et l’adaptateur montent leur dernier chiffre et épinglent le nouveau kit. Publier les trois selon `publier-paquets` |
| Geste du développeur | Épingler les trois nouvelles versions exactes, `npm install`, puis corriger les nouveaux constats ou déroger |

Aucune autre règle n’est réglable au premier lot. Une exception pour une
variable CSS externe (D3) attend un cas réel. Elle prendrait la même forme,
une ligne avec sa raison dans le même fichier, et le même geste.

## Frontière avec le développeur

| Sujet | Le toolkit livre | Le développeur fournit ou décide |
|---|---|---|
| Lecture du code | `lecteurDuCode` dans `@ucm-kit/adapter-typescript/usages` | Rien. Il signale une forme de code que le lecteur ne lit pas |
| Jugement | `preparerControle` dans la prise, ses types, ses exemples, les dérogations appliquées | Rien |
| Plugin | Le contrat du cadrage §6, les messages complets avec la commande de dérogation | Le plugin local, une règle ESLint par `regle`, la conversion des décalages par `getLocFromIndex`, l’affichage des limites, des constats dérogés et des usages non analysés |
| Forme des styles | Objets `style` et objets typés `CSSProperties`, tables comprises | La forme d’écriture d’intencial-library (étape F) |
| Écriture des tokens (D14) | `"var(--nom-exact)"` et `ucm tokens references` | Accepte l’écriture par défaut, ou écrit sa section `## resolution-token` |
| Dérogation | `npx ucm deroger`, commande complète dans chaque message | Le motif |
| Corpus | Tests sur contrats fabriqués et fixtures | Reprend les composants de Playground, sans constat restant |
| TypeScript (D13) | L’adaptateur embarque son TypeScript 5.9 | Garde le projet en 6.0 tant que `@typescript-eslint/parser` refuse TypeScript 7 |
| Tests | Cas de la section précédente | Tests `RuleTester` sur l’affichage et les positions |
| Éditeur | Une préparation relit ses entrées à chaque appel | Cache ESLint désactivé ; commande de réanalyse de l’éditeur essayée et documentée |
| CI (D9) | Le verdict d’`ucm check`, qui ignore `eslint-disable` | Le job ESLint garde ses autres règles bloquantes |
| Emplacement (D11) | Rien | Plugin local dans intencial-library, extraction décidée après l’essai |
| Après publication | Trois versions publiées | Épinglage exact des trois, le même `@ucm-kit/core` pour le plugin et la CLI |

Critères de fin de P6 qui ne dépendent pas du toolkit :

- les tests `RuleTester` du plugin passent ;
- le même constat apparaît dans l’éditeur et dans le rapport d’`ucm check` sur un fichier de test ;
- les faux positifs, les usages non analysés et les lectures incomplètes sont comptés sur les composants repris ;
- sur une branche d’essai, une demande de `tokens.json` seul reste verte, et une demande de code qui touche un fichier fautif est rouge ;
- le temps d’analyse d’un fichier est mesuré dans l’éditeur.

## Vérifications et clôture

- Chaque lot prouve qu’il ne casse rien par les tests de ses paquets (section [Règles d’exécution](#règles-dexécution)) ; chaque vague, par la vérification complète du point de synchronisation.
- Un défaut trouvé reçoit un test de régression.
- Une publication se constate par `npm view <paquet>@<version> version`.
- P6 est close côté toolkit quand les cases 0.20 à 4.4 portent leur hash. L’étape F n’a pas de case.

## Geste du mainteneur, hors plan

Avant les réimplémentations v14 de Playground, et après 4.3. Le plan ne réalise
aucune migration de Playground.

- Dans `UCM-Playground/.ucm/conventions.md`, retirer la ligne « Traduire `{chemin.du.token}` » du tableau et la phrase « Il n’existe volontairement aucun helper partagé de résolution de token : chaque composant écrit ses références en toutes lettres. ».
- Épingler la CLI publiée en 4.3 dans `UCM-Playground/package.json`, et dans `UCM-Playground/.agents/skills/ucm-implementer/SKILL.md` et `.claude/skills/ucm-implementer/SKILL.md`, qui lancent `npx --yes @ucm-kit/cli@<version> guide`. Épingler l’adaptateur publié en 4.3.

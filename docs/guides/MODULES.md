# Écrire un module consommateur

Ce guide s'adresse à un développeur, ou à son agent de code, qui écrit un module
au-dessus des contrats UCM : un linter, un générateur de stories, un vérificateur
de rendu, une intégration des contrats. Il suffit pour démarrer, sans question au
mainteneur. Chaque règle renvoie au fichier qui la porte ; en cas d'écart, ce
fichier a raison.

## Ce qu'est un module

Un module lit les contrats et les tokens d'un repository, puis produit quelque
chose dans sa technologie : du code de test, des stories, un rapport.

- Le jugement reste dans le kit. Un module demande une réponse (« ce contrat est-il lisible ? », « que dit ce variant ? ») et ne la recalcule pas.
- La technologie reste dans le module. Le kit ne connaît ni Storybook, ni ESLint, ni un framework de rendu.
- Un module ne recopie aucune règle UCM : ni cran, ni mode, ni convention de nommage, ni seuil. Un nom de `src/referentiel/` que le module croit lui manquer révèle un trou du contrat, à signaler pour le corriger dans le format.

## La seule porte permise

Un module importe le kit par `@ucm-kit/core/modules`, et par aucune autre porte
(`format`, `emplois`, `referentiel`, `controles`, `protocoles`, `nommage`,
`lecteurs`, `lecteurs/navigateur`). Ces portes servent la CLI, l'adaptateur et
les plugins, et changent sans préavis. Règle : [versionnage.md](../../packages/kit/invariants/versionnage.md).

Les signatures de la prise sont dans
[`index.d.mts`](../../packages/kit/src/modules/index.d.mts). Elle publie :

- `lireConfiguration(racine)` donne, d'après `ucm.config.json`, où sont les contrats, les tokens et le code ; sans fichier, la configuration par défaut.
- `trouverContrats(dossier)` donne les chemins des `*.contract.json` d'un dossier, `node_modules` exclu.
- `verdictDeVersion(version)` rend `ok`, `ancien` ou `recent` : le sens de l'écart entre la version d'un contrat et ce que ce kit sait lire. `ancien` demande un réexport du designer ; `recent` demande de monter le kit.
- `vueExacteDuVariant(contrat, variant)` rend ce que dit une combinaison de variantes (structure, typographie, composés, icônes, placements, effets), pour un contrat que `verdictDeVersion` juge `ok` ; `undefined` si le variant ne renvoie à aucune vue.
- `indexerTokensDtcg(tokens)` rend une `Map` des feuilles d'un fichier de tokens, par chemin pointé.
- `isTokenReference(valeur)` dit si une valeur est une référence de token.
- `tokenCssVariable(chemin)` donne le nom de la variable CSS d'un chemin de token.
- `Contract` est le type TypeScript du contrat.
- `preparerControle(fichier, options)` juge le code d'un fichier de composant et rend ses constats et ses limites (voir « Juger le code d'un composant »).

Un module appelle `verdictDeVersion` avant de lire un contrat, puis traite
`ancien` et `recent` comme deux messages différents.

## Juger le code d'un composant

Un module qui juge le code (le linter) importe deux noms, de deux paquets :

```js
import { lecteurDuCode } from "@ucm-kit/adapter-typescript/usages";
import { preparerControle } from "@ucm-kit/core/modules";

const controle = preparerControle(chemin, { texte, lecteur: lecteurDuCode });
```

- `lecteurDuCode` relève ce que le fichier écrit : chaînes, déclarations de style, variables `--nom`, commentaires qui désactivent une règle. Il lit la syntaxe et ne juge rien.
- `preparerControle` relit `ucm.config.json`, les contrats, `tokens.json` et `.ucm/derogations.json` à chaque appel, juge le relevé et ne lève jamais. `texte` remplace le fichier du disque, pour juger un texte non enregistré. `racine` évite de remonter jusqu'au premier `ucm.config.json`. `ucm check` appelle la même fonction.
- Le résultat est `{ racine, fichier, composants, limites, constats }`. Un constat porte `regle`, `code`, `niveau`, `composant`, `debut`, `fin`, `message` et `faits`, et selon le cas `coordonnees`, `commande` et `deroge`. Les formes de `faits` par `code`, les limites et leurs codes sont dans les types de [`index.d.mts`](../../packages/kit/src/modules/index.d.mts) (`ControleDuFichier`, `Constat`, `Limite`).
- Un module écrit une règle par valeur de `regle`, affiche les limites en tête de fichier, n'affiche jamais en erreur un constat qui porte `deroge`, et affiche un constat `non-analyse` au plus en information.
- `eslint-disable` ne cache aucun constat : un commentaire qui nomme une règle UCM donne `desactivation-interdite`, et `ucm check` juge le code sans lire les commentaires. Le cache d'ESLint reste désactivé.
- Une correction automatique se limite à remplacer `"{chemin}"` par `"var(--nom)"` ; une valeur en dur ne se corrige jamais seule.

Le plugin et la CLI emploient le même `@ucm-kit/core`, épinglé à l'exact. Le module emploie l'adaptateur que le repository installe pour `ucm check`, sans en déclarer un second. Les changements de la porte de l'adaptateur sont dans [`CHANGELOG.md`](../../packages/adapter-typescript/CHANGELOG.md).

## Épingler le kit

Un repository n'a qu'un kit. Le `package.json` du module épingle la version
exacte de `@ucm-kit/core` que la CLI `@ucm-kit/cli` du repository épingle, sans
`^`, sans `~`, sans lien :

```json
{ "dependencies": { "@ucm-kit/core": "0.17.3" } }
```

Quand le kit installé diffère de celui de la CLI, `ucm guide <contrat>` ajoute à
sa section « À relire avant de commencer » : « Le @ucm-kit/core installé dans ce
repository (…) n'est pas celui de cette CLI (…) : épinglez le même numéro des
deux côtés. » Le contrôle est `noyauEnDesaccord` dans
[`guide.mjs`](../../packages/cli/src/guide.mjs).

## Se déclarer module dans ce dépôt

Un paquet de `packages/` qui est un module porte `"ucmModule": true` dans son
`package.json`. [`tests/modulesParLaPrise.test.mjs`](../../tests/modulesParLaPrise.test.mjs)
refuse alors, pour ce paquet :

- un import d'une autre porte de `@ucm-kit/core`, y compris `@ucm-kit/core` seul ;
- un chemin relatif qui atteint `packages/kit` ;
- un import de la prise sans `@ucm-kit/core` déclaré ;
- une version du kit qui n'est pas exacte, ou qui diffère de celle de la CLI.

## Refuser les autres portes avec ESLint

Hors de ce dépôt, aucun test ne garde la règle. Posez-la dans la configuration
ESLint (flat config, `eslint.config.js`) du repository du module :

```js
export default [
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@ucm-kit/core", "@ucm-kit/core/*", "!@ucm-kit/core/modules"],
          message: "Un module importe le kit par @ucm-kit/core/modules seulement.",
        }, {
          group: ["@ucm-kit/adapter-typescript", "@ucm-kit/adapter-typescript/*", "!@ucm-kit/adapter-typescript/usages"],
          message: "Un module importe l'adaptateur par @ucm-kit/adapter-typescript/usages seulement.",
        }],
      }],
    },
  },
];
```

Le motif refuse `@ucm-kit/core` et toute sous-porte, et la négation
`!@ucm-kit/core/modules` rétablit la prise. L'ordre compte : la négation vient
après les motifs qu'elle excepte. Le second motif fait de même pour l'adaptateur, dont la seule porte permise est `usages`. La règle couvre `import`, `import type` et `export ... from`, mais pas `import()` ni `require()` : un module qui les emploie les garde par relecture.

## Tester un module sur les contrats

Les contrats de test sont dans
[`packages/kit/fixtures/contrats/`](../../packages/kit/fixtures/contrats/) : un
dossier par version, `11.0`, `12.0` et `13.0`, avec `Alert`, `Button`,
`TileLink` et `StressTest`. Les tokens d'un repository sont dans
`packages/kit/fixtures/tokens/origine/tokens.json`. Ces fixtures sont dans le
dépôt, pas dans le paquet publié : hors du dépôt, copiez-en quelques-unes dans le
dossier de tests du module.

```js
import { readFileSync } from "node:fs";
import { trouverContrats, verdictDeVersion, vueExacteDuVariant } from "@ucm-kit/core/modules";

for (const chemin of trouverContrats("fixtures/contrats/13.0")) {
  const contrat = JSON.parse(readFileSync(chemin, "utf8"));
  if (verdictDeVersion(contrat.meta.contractVersion) !== "ok") continue;
  const vue = vueExacteDuVariant(contrat, contrat.variants[0]);
  // la sortie du module pour cette vue se compare ici à un résultat écrit
}
```

Testez un contrat par verdict : un `ok`, un `ancien` (`12.0`), et le message que
le module donne pour chacun. Les exemples d'appel de chaque nom, avec leur
résultat attendu, sont dans
[`prise-exemples.mjs`](../../packages/kit/tests/prise-exemples.mjs) et
[`prise-attendus.json`](../../packages/kit/tests/prise-attendus.json).

## Demander un nom nouveau

Un agent qui touche à la prise rend la question au lieu de décider. Un nom entre
dans la prise quand le code d'un module l'importe, jamais par anticipation, et la
prise promet une question (un verdict, une vue), pas les pièces qu'elle assemble.
La marche :

1. Écrire au mainteneur le besoin du module : l'appel voulu, ce qu'il rend, et pourquoi `vueExacteDuVariant` ou les autres noms ne suffisent pas. Un ajout se décide avec le développeur du module ; une dépréciation ou une rupture, avec le mainteneur et les développeurs.
2. Ajouter le nom à `src/modules/index.mjs` et sa signature à `src/modules/index.d.mts`.
3. Ajouter un exemple d'appel dans `tests/prise-exemples.mjs` et son résultat dans `tests/prise-attendus.json`. Un type reçoit un extrait TypeScript compilé.
4. Écrire l'entrée du journal [`CHANGELOG.md`](../../packages/kit/CHANGELOG.md) : un titre `## <version>`, puis `### ajout`, le nom entre accents graves, le geste à faire dans un module, et une ligne « Décidé par ... ».
5. Monter la version du kit (voir ci-dessous).

[`tests/apiPublique.test.mjs`](../../packages/kit/tests/apiPublique.test.mjs)
refuse une modification de la prise sans entrée du journal à une version
nouvelle, un nom sans exemple, un nom de `src/referentiel/` dans la prise, une
signature qui s'écarte de celle de la porte d'origine, et un nom retiré sans
`@deprecated` annoncé avant. Il demande l'historique Git complet : un clone
superficiel échoue en disant de le récupérer.

## Ce que dit le numéro de version du kit

Le kit est en 0.x. Règle : [versionnage.md](../../packages/kit/invariants/versionnage.md).

- Le chiffre du milieu monte quand la prise ou le format casse : nom retiré ou renommé, signature changée, résultat différent pour la même entrée, nouvelle majeure du contrat, nouvelle version des tokens. Une montée du milieu demande de relire le journal avant d'épingler.
- Le dernier chiffre monte pour tout le reste : changement interne, ajout d'un nom ou d'un champ de résultat, dépréciation. Épingler la nouvelle version ne casse rien.
- Le mainteneur décide du passage en 1.0. En 1.0, l'ajout monte le chiffre du milieu, la rupture le premier, et l'interne le dernier.

# Cadrage du linter UCM et de son cœur dans le kit

Le premier lot du linter porte deux règles, « token inconnu » et « valeur en
dur ». Le kit prépare un juge pour chaque fichier. Le plugin ESLint, écrit par
le développeur dans intencial-library, pose une question au juge pour chaque
usage qu’il rencontre et signale lui-même le nœud.

Le mainteneur a validé les décisions D1 à D14, que le §12 résume. Le
[plan de la partie kit](./PLAN-IMPLEMENTATION-P6-KIT.md) distribue le travail et
rend la frontière avec le développeur. Les essais des §3, §4 et §13 restent
valables. Le §5 rapporte ce que le corpus réel de Playground montre.

## 1. Ce que le mainteneur et le développeur doivent retenir

Le kit répond à deux questions sur un fichier : « cette citation nomme-t-elle
un token ? » et « cette déclaration de style écrit-elle une valeur en dur ? ».
Le module trouve les citations et les déclarations dans le code, appelle le
juge et place les constats sur les bons nœuds.

| Acteur | Travail |
|---|---|
| Mainteneur, avec ses agents | Le juge, ses deux listes réglables, ses tests et son entrée dans la prise. Le guide `docs/guides/LINTER-UCM.md` et la skill `regler-le-linter`. Les constats du code dans le verdict d’`ucm check` et toutes les règles dans l’inventaire. |
| Développeur du module | Le plugin ESLint local, la normalisation propre à React, les tests `RuleTester`, l’éditeur et la CI. La reprise du corpus de Playground. |
| Mainteneur et développeur | L’essai sur les composants repris, avant la publication unique du kit. |

Ce que le premier lot ne fait pas : les variantes non publiées, les éléments
visuels supplémentaires, Stylelint, l’analyse typée et la correction
automatique.

## 2. Ce qui existe et ce qui manque

La [fiche P6](../Evolutions%20globales/pistes.json) prévoit deux règles décidées,
valeur en dur et token inconnu. Les variantes non publiées et les éléments
supplémentaires restent ouverts dans le
[plan de conformité](./PLAN-CONFORMITE-RENDU.md#ce-qui-reste-ouvert).

| Appui dans le dépôt | Usage pour P6 | Limite |
|---|---|---|
| `packages/kit/src/modules/index.mjs` et `index.d.mts` | Sept fonctions et le type `Contract`, dont `indexerTokensDtcg`, `isTokenReference`, `tokenCssVariable` et `verdictDeVersion` | Aucun contrôle de source. Le juge y entre au lot 2 du plan. |
| `packages/kit/src/lecteurs/tokens-dtcg.mjs` | Indexer les feuilles DTCG par chemin pointé, sans projection | L’existence d’un token ne prouve ni son bon usage ni sa valeur affichée. |
| `packages/kit/src/format/names.ts` | `tokenCssVariable`, ligne 73, « unique autorité » de la projection d’un chemin vers sa variable CSS | Deux chemins peuvent produire le même nom CSS (lignes 63 à 67). |
| `packages/kit/src/format/references.ts` | `isTokenReference`, ligne 26, et sa forme `TOKEN_REFERENCE`, ligne 21 | Reconnaît une chaîne entière `{a.b}`, pas une référence au milieu d’un texte. |
| `packages/kit/src/lecteurs/implementation.mjs` | `cheminImplementation`, ligne 28, associe un contrat au fichier que désigne le motif de `ucm.config.json` | Fonction interne au kit. Le module ne recopie pas son calcul. |
| `packages/kit/src/lecteurs/version-contrat.mjs` | Fenêtre de lecture de 13.0 (ligne 20) à `CONTRACT_VERSION`, soit 14.0 (`format/version.ts`, ligne 16) | Une montée à 15.0 refermera la fenêtre au-dessus de 13.0. |
| `packages/kit/src/lecteurs/verdict-bilan.mjs` | `verdictDeLaDemande`, ligne 252, règle du dernier modifié | Ne lit aucun constat du linter. Le lot 3 du plan l’étend. |
| `packages/adapter-typescript/src/parite.mjs` | Exemple de séparation entre relevé TypeScript et jugement | La parité ne relève pas les déclarations de styles. P6 ne lance pas un second programme TypeScript. |

## 3. Ce que montrent les outils existants

### ESLint fournit l’extraction et les positions

Une règle ESLint reçoit l’arbre syntaxique du fichier et visite ses nœuds.
`context.report` accepte un nœud ou une position explicite. Le module peut donc
garder les nœuds chez lui et transmettre des données ordinaires au kit.
L’[API des règles](https://eslint.org/docs/latest/extend/custom-rules) décrit ces
deux mécanismes.

Un plugin local peut être chargé dans la configuration sans publication npm.
Cette possibilité suffit pour le premier essai dans intencial-library.
L’[exemple de plugin local](https://eslint.org/docs/latest/use/configure/plugins#configure-a-local-plugin)
donne le branchement.

Le contrôle doit lire le texte fourni par ESLint. Relire le fichier source sur
disque ferait perdre les modifications encore dans l’éditeur. L’API
[`lintText`](https://eslint.org/docs/latest/integrate/nodejs-api#-eslintlinttextcode-options)
accepte justement un texte indépendant du fichier enregistré.

### L’analyse typée reste un second périmètre

Le parseur TypeScript peut fournir une syntaxe TypeScript avec JSX sans demander les types du
projet. Les règles typées utilisent ensuite les services du parseur et le
vérificateur TypeScript. Les
[services disponibles](https://typescript-eslint.io/developers/custom-rules/#typed-rules)
et leur [coût](https://typescript-eslint.io/troubleshooting/typed-linting/performance/)
sont documentés séparément.

Déduction pour P6, les références littérales et les déclarations littérales
peuvent former un premier lot sans analyse typée. Les imports, les expressions
calculées et les branches conditionnelles demandent un périmètre supplémentaire.
Un type TypeScript ne prouve pas à lui seul qu’une valeur sera effectivement
utilisée dans un état du composant.

### Stylelint fournit des contrôles CSS, avec des limites pour UCM

`no-unknown-custom-properties` recherche les définitions dans le fichier et ses
fichiers de référence. La règle accepte une variable inconnue accompagnée d’un
repli valide. Elle répond à une question CSS, distincte de l’existence d’un
chemin dans `tokens.json`. Voir
[la règle](https://stylelint.io/user-guide/rules/no-unknown-custom-properties/).

`value-type-custom-property-required-list` exige des variables pour des familles
de valeurs. La documentation la marque expérimentale. Elle ignore les
déclarations de variables, les replis de `var()` et les valeurs contenant une
variable inconnue. Voir
[son périmètre](https://stylelint.io/user-guide/rules/value-type-custom-property-required-list/).

Ces règles peuvent compléter P6. Elles ne fournissent pas le jugement propre au
contrat UCM. Un plugin Stylelint peut appeler le même cœur après extraction des
déclarations depuis PostCSS. Le
[guide des plugins](https://stylelint.io/developer-guide/plugins/) décrit cet accès.

### Atlassian confirme le besoin de distinguer les syntaxes

Atlassian fournit des règles de tokens pour ESLint et un plugin Stylelint.
Sa règle ESLint sépare les domaines couleur, espacement et forme. Elle expose
aussi des exceptions. Voir
[ensure-design-token-usage](https://atlassian.design/components/eslint-plugin-design-system/ensure-design-token-usage/usage)
et la [configuration Stylelint](https://atlassian.design/components/stylelint-design-system/configuration-and-setup).

Ce précédent appuie une séparation par syntaxe. Ses noms de tokens et ses
exceptions appartiennent au système Atlassian. Les règles UCM doivent être
calculées depuis le format et les décisions UCM.

## 4. Les essais réalisés

Les essais sont rejouables par [essais-p6.mjs](./essais-p6.mjs). Ils utilisent
Node 22.23.2, ESLint 10.15.0, `@typescript-eslint/parser` 8.73.0, Stylelint 18.1.0,
PostCSS 8.5.33 et `postcss-value-parser` 4.2.0.

Ce sont des essais des mécanismes des outils. La règle témoin du cache ne
constitue pas une implémentation de P6. Aucun essai n’ouvre Figma, une forge ou
un clone voisin.

### Un fichier externe modifié laisse le cache ESLint périmé

La règle témoin lit un fichier de tokens à chaque appel. Une première exécution
accepte le token. Le fichier de tokens est ensuite vidé sans modifier le code.

| Exécution | Stratégie `metadata` | Stratégie `content` |
|---|---|---|
| Token présent, première analyse | 0 erreur | 0 erreur |
| Token retiré, même cache et même configuration | 0 erreur, règle non appelée | 0 erreur, règle non appelée |
| Token retiré, cache désactivé | 1 erreur | 1 erreur |
| Token retiré, révision changée dans `settings` | 1 erreur | 1 erreur |

Le changement de révision dans `settings` est un témoin d’invalidation. Il ne
prouve pas qu’une révision chargée une fois au démarrage serait mise à jour dans
un éditeur ouvert. La
[documentation du cache](https://eslint.org/docs/latest/use/command-line-interface#--cache)
confirme l’absence de suivi des dépendances entre fichiers.

### Le module peut relever le tampon de l’éditeur

Le fichier enregistré contient `padding: 8`. Le texte analysé contient
`padding: 12`, `width: runtimeWidth` et `color: 'var(--missing)'`.

L’essai extrait la valeur 12 et les positions des trois expressions. Il
distingue deux littéraux et un identifiant. Il n’évalue pas `runtimeWidth`.
Cela prouve l’extraction sur cette forme JSX. Cela ne prouve ni le rattachement
aux slots du contrat ni la lecture de toutes les bibliothèques de styles.

### Les règles Stylelint seules laissent passer certains usages

Chaque colonne compte les avertissements de la règle indiquée, activée seule.

| Source CSS | `no-unknown-custom-properties` | `value-type-custom-property-required-list`, couleur et longueur |
|---|---|---|
| `a{color:red}` | 0 | 1 |
| `a{color:var(--absent,red)}` | 0 | 0 |
| `a{--x:8px;padding:var(--x)}` | 0 | 0 |
| `a{padding:var(--absent) 8px}` | 1 | 0 |
| `a{--x:8px;padding:var(--x) 8px}` | 0 | 1 |

Un second essai parcourt `var(--absent, var(--fallback, 8px)) 12px` avec
`postcss-value-parser`. Il relève les deux variables imbriquées. Ce parseur
fournit une [structure des valeurs CSS](https://github.com/postcss/postcss-value-parser).
Il ne valide pas la politique UCM et ne résout pas la cascade.


## 5. Ce que montre le corpus réel

Les relevés de cette section viennent d’une lecture seule d’UCM-Playground et
d’intencial-library. Aucun des deux clones n’a été modifié.

### Contrats, tokens et association

- `UCM-Playground/ucm.config.json` déclare `src/components` pour les contrats, `src/tokens/tokens.json` pour les tokens et le motif `{dir}/{id}.tsx`. Chaque contrat désigne donc un seul fichier, par exemple `src/components/Button/Button.tsx`.
- Les quatre contrats (`Alert`, `Button`, `StressTest`, `TileLink`) portent `contractVersion` `13.0`. Le kit lit de 13.0 à 14.0, donc `verdictDeVersion("13.0")` rend `ok`. La 14.0 ajoute les effets, l’opacité et la position des enfants d’un conteneur sans auto layout ([historique du format](../../../format/CHANGELOG-FORMAT.md)). Aucun champ que le juge lit ne manque à un contrat 13.0.
- `packages/kit/fixtures/contrats/13.0/` porte les mêmes quatre contrats. Les tests du kit les lisent sans ouvrir le clone.
- `src/tokens/tokens.json` porte 760 feuilles. `tokenCssVariable` ne produit aucune collision sur ces 760 chemins.

### Formes de citation

- Les quatre composants citent leurs tokens par des chaînes `"{chemin}"`, 463 fois au total : 40 dans `Alert.tsx`, 319 dans `Button.tsx`, 93 dans `StressTest.tsx`, 11 dans `TileLink.tsx`. Les 387 chemins distincts existent tous dans `tokens.json`.
- Chaque composant traduit ces chaînes par une fonction locale `token()` : `Alert.tsx:6-12`, `Button.tsx:11-17`, `StressTest.tsx:8-14`, `TileLink.tsx:5-11`. Elle applique `toLowerCase` puis remplace `[^a-z0-9]+` par un tiret.
- Cette copie diverge de `tokenCssVariable` (`names.ts`, ligne 73), qui décompose les accents et garde toute lettre Unicode. Sur les 760 chemins actuels, les deux donnent les mêmes noms, faute de lettre accentuée. Un chemin `café` donnerait `--caf` d’un côté et `--cafe` de l’autre.
- Le code n’écrit aucune chaîne `var(--nom)` littérale. Les seules occurrences sont des commentaires et le gabarit `var(--${…})` de `token()`.

### Valeurs littérales

- Les déclarations visuelles reçoivent presque toutes un appel (`token("{…}")`) ou une expression (`sizeEntry.gap`, `entry.tokens.background`). La règle « valeur en dur » les rend non analysées (D7).
- Littéraux des trois familles dans les objets `style` : `padding: 0` (`Button.tsx:254`), `background: "none"` et `border: "none"` (`Button.tsx:252-253`), `textDecoration: "none"` (`TileLink.tsx:68`), `width` et `height` à `"fit-content"` (`Button.tsx:248-249`, `StressTest.tsx:222-223`, `Alert.tsx:78`), `width: "stretch"` (`Alert.tsx:77`), `top` et `right` à `"13.63px"` (`StressTest.tsx:498-499`).
- Le contrat `StressTest` publie `inset` à `13.63px`, `sizing` à `fit-content`, 21 `structuralSize` à `15px` et 2 à `40px`, et des `rowSizes` qui commencent par `15px`. Le contrat `Alert` publie `sizing.width` à `stretch`.
- `StressTest.tsx` écrit `15px` 18 fois, sur 16 lignes : 14 fois dans des tables de données (`{ col: 1, row: 2, height: "15px" }`, lignes 81 à 109) et 4 fois dans les constantes `ROWS_12` et `ROWS_17` (lignes 90 et 111). Ces valeurs atteignent le style par `height: tile.height` et `gridTemplateRows: rows`, deux expressions.
- `outlineOffset: ring ? 0 : undefined` (`Button.tsx:260`) est une condition. Le juge la reçoit comme une expression non résolue.
- Les ombres de contour s’écrivent en gabarit, `` `inset 0 0 0 ${…} ${…}` `` (`Button.tsx:275`, `Alert.tsx:85`, `StressTest.tsx:231`). Le module les rend non analysées.
- Le corpus n’écrit ni `auto`, ni `inherit`, ni `transparent`, ni `currentColor` dans un style.

Conséquence pour le premier lot. Sur ce corpus, « token inconnu » juge les 463
citations. « Valeur en dur » juge 13 littéraux, qui passent tous
par une valeur neutre ou une valeur publiée, et laisse le reste non analysé.
La forme d’écriture des composants d’intencial-library (D14) décide de la part
analysée.

### Outillage d’intencial-library

- La branche `dev` d’intencial-library porte `typescript` `~6.0.3` depuis la PR #11 (commit `0036bc7`, « TypeScript 6.0, que le parseur d’ESLint sait lire »). La branche `origin/dev` du clone local, non rafraîchie, montre encore `^7.0.2`.
- `@typescript-eslint/parser` 8.73 accepte `typescript >=4.8.4 <6.1.0`. TypeScript 7 n’y entre que par `@typescript/native` à partir de `7.1.0-beta`.
- `@ucm-kit/adapter-typescript` 0.2.11 embarque son propre TypeScript `>=5.5.0 <6` (5.9.3 installé). Il ne contraint pas la version du projet.
- `@ucm-kit/cli` 0.2.0 et l’adaptateur 0.2.11 épinglent `@ucm-kit/core` 0.17.1. Le repository n’a pas encore de dépendance directe au kit.
- Le repository ne contient encore ni composant ni contrat, seulement `src/tokens/tokens.json`. Ses composants n’ont pas de feuille CSS propre, comme ceux de Playground, dont la seule feuille est `src/index.css` (décor de la galerie) avec la feuille générée des tokens.

## 6. La séparation entre kit et module

### Le juge préparé

Le kit fournit une fonction, `preparerControle(fichier, donnees)`. Le module
l’appelle dans le `create()` de chaque règle ESLint.

| Entrée | Contenu |
|---|---|
| `fichier` | Chemin du fichier analysé, celui que donne `context.filename` |
| `donnees.racine` | Racine du repository, où se trouve `ucm.config.json` |
| `donnees.variablesDuFichier` | Noms des propriétés `--nom` que le fichier déclare, relevés par le module |

La préparation lit `ucm.config.json`, trouve les contrats, associe le fichier
à son contrat par `cheminImplementation`, juge la version du contrat et indexe
`tokens.json` dans les deux sens de la projection CSS. Elle ne garde rien d’un
appel à l’autre, donc une nouvelle analyse après un réexport relit les fichiers
du disque. Le texte du composant, lui, vient d’ESLint, donc du tampon de
l’éditeur.

| Sortie | Contenu |
|---|---|
| `contrat` | Chemin du contrat associé, ou `null` pour un fichier qu’aucun contrat ne désigne |
| `limites` | Ce qui empêche une règle de juger ce fichier : `tokens-illisibles`, `contrat-illisible`, `contrat-ancien`, `contrat-recent`, `contrats-multiples` |
| `citation(texte)` | Les constats de « token inconnu » pour un texte du code |
| `declaration(propriete, valeur)` | Les constats de « valeur en dur » pour une déclaration de style |

Un constat porte `code`, `niveau` (`ecart`, `non-analyse` ou `limite`),
`message` et `faits`. Les codes sont `token-inconnu`, `nom-css-ambigu`,
`repli-en-dur`, `valeur-en-dur` et `non-analyse`. Le message est une phrase
pour le développeur, que le module peut afficher telle quelle.

Aucun nœud ESLint, TypeScript ou PostCSS n’entre dans le kit. Cette forme reste
« une question » au sens de la
[décision sur l’API publique](../Evolutions%20globales/DECISION-API-PUBLIQUE.md#question-1-que-contient-la-liste-des-noms-promis).
La prise gagne un seul nom, et les pièces assemblées (index, association,
projection, listes) restent libres de changer.

### Pourquoi le juge remplace le relevé complet

L’ancienne proposition faisait transmettre au module un relevé complet du
fichier, avec un identifiant par usage, puis rendait des constats rattachés à
ces identifiants. Le juge préparé retire deux pièces de ce montage.

- Le module ne tient plus de table entre identifiants et nœuds. Il reçoit la réponse au moment où il visite le nœud, et l’appel `context.report({ node, message })` se fait sur place.
- Le kit ne définit plus de format de relevé à valider : identifiants dupliqués, champs manquants, slot ou combinaison absents. Il reçoit un texte, ou une propriété et une valeur.

Le rattachement d’une déclaration au slot et à la combinaison disparaît aussi.
Le code réel ne le porte pas (§5), et la règle se juge au niveau du fichier
(D5).

### Les trois exemples d’échange

Esquisse du module, à confirmer par le développeur au lot 0 du plan :

```js
import { preparerControle } from "@ucm-kit/core/modules";

create(context) {
  const juge = preparerControle(context.filename, {
    racine: context.cwd,
    variablesDuFichier: releverLesVariables(context.sourceCode.ast),
  });
  return {
    Literal(node) {
      if (typeof node.value !== "string") return;
      for (const constat of juge.citation(node.value)) context.report({ node, message: constat.message });
    },
  };
}
```

Token inconnu, dans `Button.tsx` :

```js
juge.citation("{components.button.sizes.medium.gapp}");
// [{ code: "token-inconnu", niveau: "ecart",
//    message: "components.button.sizes.medium.gapp ne nomme aucun token de tokens.json.",
//    faits: { reference: "components.button.sizes.medium.gapp" } }]
```

Valeur en dur, dans `Button.tsx` :

```js
juge.declaration("padding", "12px");
// [{ code: "valeur-en-dur", niveau: "ecart",
//    message: "padding reçoit 12px. Une dimension du composant s’écrit avec un token.",
//    faits: { propriete: "padding", valeurs: ["12px"], familles: ["dimension"] } }]
```

Usage non analysé, pour `gap: sizeEntry.gap` :

```js
juge.declaration("gap", null);
// [{ code: "non-analyse", niveau: "non-analyse",
//    message: "La valeur de gap est calculée par le code. Le linter ne la juge pas.",
//    faits: { propriete: "gap" } }]
```

### Qui fait quoi

| Donnée ou calcul | Responsable |
|---|---|
| Lecture de `ucm.config.json`, des contrats et de `tokens.json`, à chaque préparation | Kit |
| Association du fichier au contrat selon `implementation` | Kit, par `cheminImplementation` |
| Verdict de version du contrat | Kit, par `verdictDeVersion` |
| Index des tokens, projection CSS et collisions | Kit |
| Familles de propriétés, valeurs neutres, valeurs publiées par le contrat | Kit |
| Trouver les textes, les déclarations de style et les variables `--nom` du fichier | Module |
| Convertir `backgroundColor` en `background-color` | Module |
| Écrire `padding: 12` en `"12px"` et laisser `opacity: 0.5` sans unité | Module, selon les propriétés sans unité de [React](https://react.dev/reference/react-dom/components/common#common-props) |
| Suivre une constante du même fichier par l’analyse de portée | Module, s’il le décide (D7) |
| Gabarit à expressions | Module, qui passe chaque morceau fixe à `citation` et rend la déclaration non analysée |
| Niveau ESLint, position du signalement, affichage des usages non analysés | Module et configuration du projet |

Un module ne recopie ni la liste des familles, ni la liste des valeurs
neutres, ni la règle de projection CSS.

### Les nœuds lus

Le module ESLint et, au lot 3, l’adaptateur TypeScript lisent les mêmes nœuds.
Cette liste est leur seule définition, à confirmer pendant l’essai.

- Chaque littéral de chaîne du fichier passe à `citation`.
- Chaque morceau fixe d’un gabarit passe à `citation`.
- Chaque propriété d’un littéral d’objet passe à `declaration`, quand l’objet est écrit dans l’attribut JSX `style` ou porte une annotation de type qui nomme `CSSProperties`.
- Une propriété dont la valeur n’est pas un littéral passe à `declaration` avec `null`.
- Une clé `--nom` d’un de ces objets entre dans `variablesDuFichier`.

## 7. Les deux règles du premier lot

### Token inconnu

La règle juge deux formes (D2). Une chaîne `{chemin}` se compare directement
aux chemins de `tokens.json`, sans projection. Un `var(--nom)` se compare à la
projection `tokenCssVariable` de tous les chemins.

| Cas | Résultat |
|---|---|
| Chemin ou nom présent | Aucun constat. Le bon rôle du token n’est pas prouvé. |
| Chemin absent | `token-inconnu` |
| Nom CSS projeté par deux chemins (`layout.size.50%` et `layout.size.50` donnent `--layout-size-50`) | `nom-css-ambigu`, niveau `limite`, avec les deux chemins. Le kit ne choisit aucun token. |
| Variable que le fichier déclare dans `variablesDuFichier` | Aucun constat (D3) |
| Variable qui n’est pas un token et que le fichier ne déclare pas | `token-inconnu` (D3) |
| Repli écrit en dur, `var(--token, 8px)` | `repli-en-dur`, même si le token existe (D4). Un repli `var(--autre)` est jugé comme une citation. |
| Nom construit par un gabarit, `var(--${…})` | `non-analyse` |
| `tokens.json` absent ou illisible | Limite `tokens-illisibles` pour le fichier. `citation` ne rend aucun `token-inconnu`. |

D3 ne prévoit aucune exception de configuration. Une exception pour une variable
externe attend un cas réel. Elle prendrait la forme d’une ligne avec sa raison
dans le fichier des listes.

### Valeur en dur

La règle s’applique au fichier d’implémentation d’un contrat (D5). Une
propriété des familles couleur, dimension et espacement, ou typographie ne
reçoit pas de valeur littérale. Le juge découpe la valeur en parties, sur les
espaces et les virgules hors des parenthèses. Une partie `var(…)` relève de
`citation`. Chaque autre partie passe dans deux cas seulement.

- C’est une valeur neutre, prise dans la liste fermée que le mainteneur a choisie (D6, liste A du plan, case 0.1).
- Le contrat publie lui-même cette valeur en clair, dans un champ d’une des familles de la propriété.

Les deux listes, propriétés par famille et valeurs neutres, vivent dans un seul
fichier du kit, `packages/kit/src/lecteurs/controle-du-code-listes.mjs`. Chaque
entrée tient sur une ligne avec sa raison. La skill
`.agents/skills/regler-le-linter/SKILL.md` porte le geste qui les règle, et tout
réglage monte le chiffre du milieu du kit. Ce document n’en recopie pas les
valeurs.

Valeurs que le contrat publie en clair, relevées dans
[FORMAT.md](../../../format/FORMAT.md) et `packages/kit/src/format/types.ts` :

| Champ | Exemple | Famille | Sources |
|---|---|---|---|
| `sizing.width`, `sizing.height` | `fit-content`, `stretch` | dimension | FORMAT.md 641-651 ; types.ts 419, 447-450 |
| `stretch` admet aussi `100%` | `width: 100%` | dimension | types.ts 441-446 |
| `structuralSize.width`, `.height` | `15px` | dimension | FORMAT.md 770-786 ; types.ts 336-339, 597 |
| `columnSizes`, `rowSizes` | `1fr`, `fit-content(100%)`, `120px`, `auto` | dimension | FORMAT.md 763-769 ; types.ts 501, 683-684, 879-880 |
| `inset` | `13.63px` | dimension | FORMAT.md 690-697 ; types.ts 396, 614 |
| `textStyles.<clé>.literals` | `uppercase`, `italic`, `underline` | typographie | FORMAT.md 382-400 ; types.ts 231-247, 254 |
| `textAlign`, `lineClamp` d’un usage typographique | `center`, `2` | typographie | FORMAT.md 411-413 ; types.ts 269-274 |

Le juge relève aussi, sans effet sur les trois familles, `rotation`
(types.ts 627), `columns`, `rows`, `columnStart`, `rowStart`, `columnSpan`,
`rowSpan` (types.ts 350-355, 649-652, 676-677), `flexGrow` (types.ts 660),
`alignContent` et `textOverflow` (types.ts 272-276). Leurs propriétés CSS
n’appartiennent à aucune famille, donc le code les écrit librement.

Les mots-clés de `sizing` et de `literals` ne sont pas numériques. Le mainteneur
les range parmi les valeurs publiées, parce que le contrat les écrit en clair
pour que le développeur les recopie.

La comparaison se fait par valeur et par famille. `15px` passe dans `height`,
parce que `StressTest` publie `structuralSize.height: "15px"`. `15px` est refusé
dans `font-size`, parce qu’aucune valeur typographique publiée ne vaut `15px`.
Une couleur littérale est toujours refusée, même égale à la valeur d’un token.
Le contrat ne publie jamais une couleur en clair. Les nombres se comparent sous
une forme canonique, `15.0px` égale `15px`.

| Cas | Résultat |
|---|---|
| Fichier qu’aucun contrat ne désigne | Aucun constat. `citation` juge encore les tokens. |
| Contrat illisible, ancien, récent, ou deux contrats pour le même fichier | Limite de fichier. `declaration` ne rend rien. |
| Propriété hors des trois familles (`display`, `opacity`, `transform`) | Aucun constat |
| Valeur `null`, expression non résolue | `non-analyse` (D7) |
| Fonction CSS autre que `var()` qui contient un `var()` | `non-analyse` pour cette partie |

Zéro écart avec des usages non analysés ne veut jamais dire « conforme ». Le
module affiche les usages non analysés ou leur nombre.

### Limites

Le linter ne voit pas ces écarts :

- une valeur juste posée sur le mauvais élément, que la comparaison par fichier laisse passer. Le comparateur de rendu (P10, P20) la rattrape ;
- un token existant employé dans le mauvais rôle ;
- une valeur calculée par un appel, un identifiant ou un gabarit, sauf si le module suit une constante du même fichier ;
- la valeur d’une variable `--nom` que le fichier déclare lui-même ;
- les styles écrits dans une feuille CSS, puisque Stylelint n’entre pas au premier lot (D10) ;
- le code d’un fichier qu’aucun contrat ne désigne, pour la règle « valeur en dur » ;
- un contrat hors de la fenêtre de lecture du kit, tant qu’il n’est pas réexporté.

Le kit n’exécute aucun code, ne suit aucune expression et ne propose aucune
correction automatique. Deux tokens de même valeur ne désignent pas le rôle
attendu.

## 8. Réexport, cache, éditeur et CI

| Mécanisme | Risque | Règle du premier lot |
|---|---|---|
| Cache des résultats ESLint sur disque | Un réexport ne relance pas la règle (§4) | Le développeur lance ESLint sans `--cache`. |
| Données gardées par le kit dans un processus ouvert | Une analyse relit une ancienne version | Le juge relit ses entrées à chaque préparation et ne garde rien. |
| Déclenchement de l’analyse dans l’éditeur | Un réexport ne provoque pas de nouvelle analyse | Le développeur essaie et documente la commande `ESLint: Revalidate all open files` de l’[extension](https://github.com/microsoft/vscode-eslint). |

Une empreinte des contrats et des tokens ne sert qu’après une mesure du coût.
L’essai mesure le temps d’une préparation sur le corpus réel. Aucun seuil n’est
fixé avant.

### La CI suit la règle du dernier modifié

POUR-LES-DESIGNERS.md, §6, promet qu’une demande de contrats et de
`tokens.json` seuls n’est jamais refusée pour le code. Une erreur ESLint fait
échouer la CI. Le linter lancé sur tout le code après un changement de tokens
rendrait donc rouge une demande du designer.

La solution retenue est la plus simple qui tient la promesse. La CI lance ESLint
sur les fichiers que la demande modifie, et sur ceux d’un envoi direct sur
`main`. Le constat d’un fichier ne dépend que de ce fichier, de son contrat, de
`tokens.json` et du kit.

- Une demande de contrats ou de `tokens.json` seuls ne modifie aucun fichier de code, donc ESLint ne juge rien et la demande reste verte.
- Une demande de code qui modifie un fichier fautif bloque, même si elle change aussi le contrat. C’est la ligne V-10 de la [décision sur le verdict](./DECISION-VERDICT-UCM-CHECK.md).
- Un fichier fautif que la demande ne touche pas est en retard. La prochaine demande de code qui le modifie bloque, comme la ligne V-11.

La [décision sur le verdict](./DECISION-VERDICT-UCM-CHECK.md#question-4-que-devient-un-token-retiré-par-une-demande-de-tokens-seuls)
prévoit déjà ce filtre : la règle « token inconnu » « tournera sur les fichiers
que le développeur modifie ». Le kit n’a rien à ajouter pour ce verdict. Le juge
ignore la demande de fusion, et le filtre est un réglage de CI.

Ce filtre ne nomme pas le composant en retard dans le rapport d’`ucm check`.
Le lot 3 du plan ajoute les constats du code au verdict d’`ucm check`, après
l’essai. Il compare deux réalisations et recommande la seconde, (b) :
l’adaptateur TypeScript, qui construit déjà un programme sur les fichiers
d’implémentation pour la parité, relève les mêmes nœuds que le module et
interroge le même juge. `ucm check` applique alors la règle du dernier modifié
de `verdictDeLaDemande`, et le job ESLint de la CI cesse de bloquer.

### L’état d’un composant, une donnée

Au lot 3, `verdictDeLaDemande` rend pour chaque composant son état, ses
constats par règle et leurs nombres, et le rapport met cette donnée en phrases
sans la recalculer. La future page santé des composants dans Storybook lira
cette même donnée, et son nom n’entrera dans la prise que lorsque cette page
l’importera.

### Recette d’installation de l’essai

Le développeur essaie le juge avant toute publication (D12). Le kit, la CLI et
l’adaptateur sont empaquetés par `npm pack` depuis le même commit du toolkit,
avec une version `-essai.N`. Sur une branche d’essai d’intencial-library,
jamais fusionnée :

```json
{
  "devDependencies": {
    "@ucm-kit/core": "file:.essai/ucm-kit-core-<version>-essai.1.tgz",
    "@ucm-kit/cli": "file:.essai/ucm-kit-cli-<version>-essai.1.tgz",
    "@ucm-kit/adapter-typescript": "file:.essai/ucm-kit-adapter-typescript-<version>-essai.1.tgz"
  },
  "overrides": { "@ucm-kit/core": "$@ucm-kit/core" }
}
```

`overrides` donne le même kit à la CLI, à l’adaptateur et au module.
`npm ls @ucm-kit/core` montre alors une seule version, ce que la règle « un seul kit
par repository » de [MODULES.md](../../../guides/MODULES.md#épingler-le-kit)
demande. Le lien `file:` déroge à l’épinglage exact. La branche d’essai n’est
donc jamais fusionnée. Une préversion publiée sur npm aurait demandé trois
publications de plus et une étiquette de distribution que `publish.yml` ne gère
pas.

Après la publication unique, le développeur épingle les trois versions publiées
à l’exact, retire `overrides` et les archives, et ajoute `@ucm-kit/core` en
dépendance directe, au numéro que la CLI épingle.

## 9. Ce que le kit prépare avant le développeur

Le mainteneur prépare le juge et ses tests sur des contrats fabriqués et sur
`packages/kit/fixtures/contrats/13.0/`. Cette préparation ne demande ni ESLint
dans le kit ni composant affiché.

L’essai reste nécessaire. Il vérifie que le module fournit chaque entrée sans
reconstituer la logique du composant, et il compte les faux positifs sur le
code réel.

La [décision sur l’API publique](../Evolutions%20globales/DECISION-API-PUBLIQUE.md#question-1-que-contient-la-liste-des-noms-promis)
fait entrer un nom dans la prise quand un module l’importe. Le juge reste donc
hors de la prise jusqu’à l’essai, qui l’importe depuis l’archive. Le juge sort
sur npm une seule fois, avec son entrée dans la prise, son exemple, son entrée
au journal `packages/kit/CHANGELOG.md` et la montée du dernier chiffre. Les
lots 3 et 4 du plan ont leurs propres publications.

## 10. Ordre de travail

| Étape | Responsable | Preuve attendue |
|---|---|---|
| Confirmer les trois exemples d’échange | Développeur | Réponse écrite dans ce cadrage |
| Écrire le juge et ses tests | Mainteneur et ses agents | Lot 1 du plan commité, sans publication |
| Reprendre les composants de Playground et écrire les deux règles ESLint | Développeur | Tests `RuleTester` sur le corpus repris |
| Essayer le juge depuis les archives | Mainteneur et développeur | Tableau des résultats dans ce cadrage |
| Ajouter le juge à la prise et publier | Mainteneur et ses agents | Versions constatées par `npm view` |
| Épingler, brancher la CI sur les fichiers modifiés | Développeur | Une demande de tokens seuls verte, une demande de code fautive rouge |
| Écrire la skill et le guide | Mainteneur et ses agents | Un agent sans contexte règle une liste sur une seule phrase |
| Ajouter les constats du code au verdict d’`ucm check` | Mainteneur et ses agents | Lot 3 du plan publié, composant en retard nommé au rapport |
| Afficher toutes les règles dans l’inventaire | Mainteneur et ses agents | Lot 4 du plan, partie `ucm check` possible dès maintenant |

La préparation du juge et la reprise du corpus avancent en parallèle après la
confirmation des exemples.

## 11. Cas nécessaires avant livraison

Le plan liste les cas du kit. Le module couvre en plus ces cas.

| Groupe | Cas à couvrir |
|---|---|
| Extraction | Texte non enregistré, commentaire qui ressemble à une citation, chaîne ordinaire, gabarit à expressions, objet diffusé avec `...`, table de données hors d’un objet `style` |
| Normalisation | `padding: 12`, `opacity: 0.5`, `lineHeight: 1.5`, `fontWeight: 600`, propriété préfixée (`WebkitLineClamp`) |
| Variables | Propriété `--nom` déclarée dans un objet `style`, variable lue sans déclaration |
| Actualisation | Ajout puis retrait d’un token sans modification du code, contrat réexporté, deux analyses dans le même processus de l’éditeur |
| Intégration | Même constat dans l’éditeur et en CI, niveau de message configuré, commande de réanalyse documentée |
| Fusion | Demande de code seul, de contrat seul et de `tokens.json` seul sur une branche d’essai |

Mesurer le temps d’une préparation et d’une analyse complète sur le corpus
repris. Compter les faux positifs et les usages non analysés par règle.

## 12. Décisions et questions restantes

| Décision | Contenu |
|---|---|
| D1 | Premier lot : token inconnu et valeur en dur. |
| D2 | Token inconnu juge `{chemin}` sans projection et `var(--nom)` par `tokenCssVariable`, avec détection des collisions. Un nom ambigu rend une limite. |
| D3 | Une variable CSS qui n’est pas un token est refusée, sauf si le même fichier la déclare. Aucune clé de configuration. |
| D4 | Un repli en dur dans `var(--token, 8px)` est refusé, même si le token existe. |
| D5 | Valeur en dur se juge au niveau du fichier, sans slot, sur trois familles, avec deux exceptions : valeur neutre, valeur publiée par le contrat. |
| D6 | Liste fermée des valeurs neutres : `0`, `none` et `fit-content`. Ajouter une valeur ne casse rien ; en retirer une fait apparaître des erreurs dans du code existant. |
| D7 | Une expression non résolue est non analysée. Le module décide seul de suivre une constante du même fichier. |
| D8 | Le kit prépare un juge par fichier, le module pose les questions et signale le nœud. |
| D9 | Le linter bloque une demande qui touche le code du composant. Une demande de contrats ou de tokens seuls reste verte. |
| D10 | Pas de Stylelint au premier lot. |
| D11 | Plugin local dans intencial-library, extraction décidée après l’essai. |
| D12 | Essai depuis des archives `npm pack`, puis une seule publication du kit. |
| D13 | TypeScript 6.0 dans intencial-library tant que le parseur refuse TypeScript 7. |
| D14 | Forme d’écriture des tokens dans les composants d’intencial-library, ouverte avec le développeur. Le kit accepte les deux. |
| Confirmations | Les mots-clés publiés par le contrat comptent comme valeurs publiées. Tout réglage d’une liste monte le chiffre du milieu du kit. Le guide `docs/guides/LINTER-UCM.md` et la skill `regler-le-linter` sont acceptés. Le lot 3 entre dans P6. |

Question restante pour le mainteneur : la réalisation du lot 3, (a) ou (b), dans
le plan, case 3.0.

Question restante avec le développeur : la forme d’écriture des tokens (D14).
Avec `token("{…}")`, « valeur en dur » rend chaque déclaration non analysée.
Avec `var(--nom)` écrit en chaîne, la déclaration est jugée, et le nom doit
suivre `tokenCssVariable`, que la prise fournit.

## 13. Rejouer les essais

Depuis la racine du toolkit, installer les dépendances dans un dossier
temporaire. Ces commandes ne modifient pas les dépendances du monorepo.

```powershell
$env:UCM_P6_DEPENDANCES = Join-Path $env:TEMP "ucm-p6-recherche"
npm install --prefix $env:UCM_P6_DEPENDANCES --no-audit --no-fund eslint@10.15.0 @typescript-eslint/parser@8.73.0 stylelint@18.1.0 postcss@8.5.33 postcss-value-parser@4.2.0
node "docs/notes/Recherches/Linter Dev/essais-p6.mjs"
```

Le script vérifie les résultats par assertions et affiche leur détail JSON.
Il crée un dossier temporaire distinct pour chaque rejeu. Le rejeu n’installe
aucun contrôle P6 dans un consommateur.

Les versions épinglées décrivent l’essai. Pour choisir les versions du module,
vérifier les contraintes de Node et de l’éditeur. ESLint 10 demande au moins
Node 20.19 sur la branche 20 ou Node 22.13 sur la branche 22. Voir sa
[migration](https://eslint.org/docs/latest/use/migrate-to-10.0.0#nodejs--v2019-v21-v23-are-no-longer-supported).
Le parseur documente ses
[versions compatibles](https://typescript-eslint.io/users/dependency-versions/).
Stylelint 18 demande au moins Node 22.22.2 sur la branche 22 ou Node 24.15 sur
la branche 24. Voir sa
[migration](https://stylelint.io/migration-guide/to-18/#removed-support-for-end-of-life-and-older-versions-of-nodejs).

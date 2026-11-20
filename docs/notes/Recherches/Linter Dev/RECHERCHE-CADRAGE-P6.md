# Cadrage du linter UCM et de son cœur dans le kit

Le premier lot du linter porte deux règles, « token inconnu » et « valeur en
dur ». L’adaptateur TypeScript lit le code d’un fichier. Le kit prépare un juge
pour ce fichier et répond à chaque usage relevé. Le plugin ESLint du
développeur appelle les deux et affiche les constats. `ucm check` appelle les
mêmes fonctions et juge les constats par la règle du dernier modifié.

Le mainteneur a validé les décisions D1 à D14 et les choix du plan, que le §12
résume. Le §10 examine chaque choix fondamental contre le cas qui le
casserait. Le [plan de la partie kit](./PLAN-IMPLEMENTATION-P6-KIT.md)
distribue le travail. Les essais des §3, §4 et §13 restent valables.

## 1. Ce que le mainteneur et le développeur doivent retenir

| Acteur | Travail |
|---|---|
| Mainteneur, avec ses agents | L’écriture par défaut des références dans les aides et `ucm guide`. Le juge et ses deux listes réglables dans le kit. L’extracteur dans l’adaptateur. Les deux prises, les constats dans `ucm check`, l’inventaire, le guide `docs/guides/LINTER-UCM.md` et la skill `regler-le-linter`. |
| Développeur du module | Le plugin ESLint local, son affichage, sa configuration, ses tests `RuleTester` et son branchement en CI. La forme d’écriture des styles d’intencial-library. La reprise du corpus de Playground. |
| Mainteneur et développeur | L’essai sur les composants repris, avant la publication unique. |

Le premier lot ne couvre ni les variantes non publiées, ni les éléments visuels
supplémentaires, ni Stylelint, ni l’analyse typée, ni la correction
automatique.

## 2. Ce qui existe et ce qui manque

La [fiche P6](../Evolutions%20globales/pistes.json) prévoit deux règles décidées,
valeur en dur et token inconnu. Les variantes non publiées et les éléments
supplémentaires restent ouverts dans le
[plan de conformité](./PLAN-CONFORMITE-RENDU.md#ce-qui-reste-ouvert).

| Appui dans le dépôt | Usage pour P6 | Limite |
|---|---|---|
| `packages/kit/src/modules/index.mjs` et `index.d.mts` | Sept fonctions et le type `Contract` | Aucun contrôle de source. Le juge y entre au lot 3. |
| `packages/kit/src/lecteurs/tokens-dtcg.mjs` | Indexer les feuilles DTCG par chemin pointé, sans projection | L’existence d’un token ne prouve ni son bon usage ni sa valeur affichée. |
| `packages/kit/src/format/names.ts` | `tokenCssVariable`, ligne 73, « unique autorité » de la projection d’un chemin vers sa variable CSS | Deux chemins peuvent produire le même nom (lignes 63 à 67). |
| `packages/cli/src/tokens-css.mjs` | Refuse deux feuilles qui donnent la même propriété CSS (ligne 325) | Ne protège que les repositories qui génèrent la feuille. |
| `packages/kit/src/lecteurs/implementation.mjs` | `cheminImplementation`, ligne 28 | Fonction interne. Personne ne recopie son calcul. |
| `packages/kit/src/lecteurs/version-contrat.mjs` | Fenêtre de lecture de 13.0 (ligne 20) à `CONTRACT_VERSION`, 14.0 (`format/version.ts`, ligne 16) | Une montée à 15.0 refermera la fenêtre au-dessus de 13.0. |
| `packages/kit/src/lecteurs/verdict-bilan.mjs` | `verdictDeLaDemande`, ligne 252, et `ETATS_DE_COMPOSANT`, ligne 133 | Ne lit aucun constat du code. Le lot 4 l’étend. |
| `packages/adapter-typescript/src/parite.mjs` | `lireApiPublique`, ligne 299, construit un programme TypeScript sur les fichiers d’implémentation | Ne relève ni chaîne ni déclaration de style. |
| `packages/cli/aides/` et `packages/cli/src/guide.mjs` | Les aides que lit l’agent qui implémente à froid | `guide.mjs` n’importe pas `tokenCssVariable`, donc n’imprime aucun nom CSS. |

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
d’intencial-library. Aucun des deux clones n’a été modifié. Les mesures ont
tourné avec Node 22.23.2 et TypeScript 5.9.3, celui du toolkit.

### Contrats, tokens et association

- `UCM-Playground/ucm.config.json` déclare `src/components`, `src/tokens/tokens.json` et le motif `{dir}/{id}.tsx`. Chaque contrat désigne un seul fichier.
- Les quatre contrats (`Alert`, `Button`, `StressTest`, `TileLink`) portent `contractVersion` `13.0`, que le kit lit. `packages/kit/fixtures/contrats/13.0/` porte les mêmes quatre contrats.
- `src/tokens/tokens.json` fait 64 331 octets et porte 760 feuilles. `tokenCssVariable` n’y produit aucune collision. Quatre feuilles ont une virgule (`layouts.sizing.0,5` à `3,5`). Les 376 références distinctes des quatre contrats n’ont que des minuscules ASCII, des chiffres, des points et des tirets.
- Lire `tokens.json` et les quatre contrats coûte 2,6 ms par préparation.

### Origine de la fonction `token()`

- `UCM-Playground/.ucm/conventions.md` porte une ligne « Traduire `{chemin.du.token}` | à écrire dans le composant | `var(--chemin-du-token)` », et la phrase « Il n’existe volontairement aucun helper partagé de résolution de token ».
- `packages/cli/aides/composant.md`, ligne 34, dit « Chaque référence `{chemin.du.token}` reste écrite en toutes lettres » pour la table des variants. `resolution-token.md` est un ancrage sans écriture par défaut (`packages/cli/tests/aides.test.mjs`, lignes 15 à 25).
- Les agents qui ont implémenté à froid ont donc gardé `{chemin}` dans la table et ajouté une traduction locale dans chaque composant : `Alert.tsx:6-12`, `Button.tsx:11-17`, `StressTest.tsx:8-14`, `TileLink.tsx:5-11`.
- Cette copie remplace `[^a-z0-9]+` par un tiret, sans décomposer les accents. Elle diverge de `tokenCssVariable` (`names.ts`, ligne 73) sur `café`, et rend les mêmes noms sur les 760 chemins actuels.

### Formes de citation et valeurs

- Les composants citent `"{chemin}"` 463 fois : 40 dans `Alert.tsx`, 319 dans `Button.tsx`, 93 dans `StressTest.tsx`, 11 dans `TileLink.tsx`. Les 387 chemins distincts existent. Le code n’écrit aucune chaîne `var(--nom)`.
- Littéraux des trois familles dans les objets `style` : `padding: 0` (`Button.tsx:254`), `background: "none"` et `border: "none"` (`Button.tsx:252-253`), `textDecoration: "none"` (`TileLink.tsx:68`), `width` et `height` à `"fit-content"` (`Button.tsx:248-249`, `StressTest.tsx:222-223`, `Alert.tsx:78`), `width: "stretch"` (`Alert.tsx:77`), `top` et `right` à `"13.63px"` (`StressTest.tsx:498-499`). `outlineOffset: ring ? 0 : undefined` (`Button.tsx:260`) est une condition.
- Le contrat `StressTest` publie `inset` à `13.63px`, 21 `structuralSize` à `15px` et 2 à `40px`, des `rowSizes` qui commencent par `15px`, et des `columnSizes` à `1fr`. Le contrat `Alert` publie `sizing.width` à `stretch`.
- Le style lit presque toutes ses valeurs par une expression (`token("{…}")`, `entry.tokens.background`). Les valeurs propres à chaque combinaison vivent dans des tables (`VARIANTS`, `SIZES`) et des constantes.

### Chaînes qui ressemblent à une valeur visuelle

Le relevé parcourt les 1 754 chaînes des quatre composants (99, 1 296, 323 et
36), morceaux fixes des gabarits compris, avec la définition du §7.

- 25 parties visuelles, toutes dans `StressTest.tsx` : 19 fois `15px` et 1 fois `40px` dans des tables et des constantes (lignes 81 à 111), 4 fois `1fr` (ligne 121), 2 fois `13.63px` (lignes 498 et 499).
- Les 25 sont des valeurs que le contrat publie. Le juge ne rend aucun écart et aucun faux positif.
- 19 de ces 25 parties sont hors d’une déclaration de style. La question `declaration` seule n’en verrait que 6.
- Aucune couleur hexadécimale, fonction de couleur ou nom de couleur n’apparaît dans les composants. Aucun texte ne contient de longueur.

### Lecture par TypeScript 5.9

`ts.createSourceFile` lit chacun des quatre composants sans erreur de syntaxe,
en 0,5 ms (`TileLink.tsx`, 2 687 octets) à 3,2 ms (`StressTest.tsx`,
20 907 octets). Charger le module `typescript` coûte 218 ms, une fois par
processus.

### Outillage d’intencial-library

- La branche `dev` porte `typescript` `~6.0.3` depuis la PR #11 (`0036bc7`). `@typescript-eslint/parser` 8.73 accepte `typescript >=4.8.4 <6.1.0`.
- `@ucm-kit/adapter-typescript` 0.2.11 embarque son propre TypeScript (`dependencies`, `>=5.5.0 <6`, 5.9.3 installé).
- La CLI 0.2.0 et l’adaptateur 0.2.11 épinglent `@ucm-kit/core` 0.17.1.
- Le repository ne contient encore ni composant ni contrat. Son `.ucm/conventions.md` ne porte que le commentaire d’`ucm init` : la forme d’écriture des styles n’est pas décidée.

## 6. La séparation entre kit, adaptateur et module

### L’extracteur, dans l’adaptateur

`@ucm-kit/adapter-typescript/usages` publie `releverUsages(texte, nomDuFichier)`.
La fonction passe par `ts.createSourceFile`, sans programme ni vérificateur de
types. Elle lit la syntaxe et ne juge rien.

| Sortie | Contenu |
|---|---|
| `chaines` | `{ texte, debut, fin }` pour chaque littéral de chaîne et chaque morceau fixe d’un gabarit, sauf la valeur entière d’une déclaration |
| `declarations` | `{ propriete, valeur, debut, fin }` pour chaque propriété d’un littéral d’objet écrit dans l’attribut JSX `style`, ou annoté d’un type qui nomme `CSSProperties` |
| `variables` | Les clés `--nom` de ces objets |
| `lecture` | `{ complete, erreurs }`, d’après les erreurs de syntaxe du fichier |

`debut` et `fin` sont des décalages dans le texte reçu. La normalisation React
vit ici, dans la couche TypeScript et React du toolkit. `backgroundColor`
devient `background-color`. Un nombre reçoit `px`, sauf pour les propriétés sans
unité de [React](https://react.dev/reference/react-dom/components/common#common-props)
(`opacity: 0.5` reste `0.5`). Une expression donne `null`. Un commentaire et un
texte JSX ne sont pas des chaînes.

Reconnaître une valeur visuelle est un jugement, donc l’extracteur rend toutes
les chaînes et le kit décide.

### Le juge, dans le kit

`preparerControle(fichier, { racine, variablesDuFichier })` lit
`ucm.config.json`, trouve les contrats, associe le fichier à son contrat par
`cheminImplementation`, juge la version du contrat et indexe `tokens.json` dans
les deux sens de la projection CSS. Elle ne garde rien d’un appel à l’autre.

| Sortie | Contenu |
|---|---|
| `contrat` | Chemin du contrat associé, ou `null` |
| `limites` | `tokens-illisibles`, `contrat-illisible`, `contrat-ancien`, `contrat-recent`, `contrats-multiples` |
| `chaine(texte)` | Les citations de token et les valeurs visuelles d’une chaîne |
| `declaration(propriete, valeur)` | Les citations et les valeurs en dur d’une déclaration de style |

Un constat porte `code`, `niveau` (`ecart`, `non-analyse` ou `limite`),
`message` et `faits`. Les codes sont `token-inconnu`, `nom-css-ambigu`,
`repli-en-dur`, `valeur-en-dur` et `non-analyse`. Aucun nœud ESLint, TypeScript
ou PostCSS n’entre dans le kit. La prise gagne un nom, `preparerControle`, qui
reste « une question » au sens de la
[décision sur l’API publique](../Evolutions%20globales/DECISION-API-PUBLIQUE.md#question-1-que-contient-la-liste-des-noms-promis).

### Le plugin, chez le développeur

Esquisse, à confirmer avec le développeur au lot 0 du plan :

```js
import { releverUsages } from "@ucm-kit/adapter-typescript/usages";
import { preparerControle } from "@ucm-kit/core/modules";

create(context) {
  return {
    Program() {
      const source = context.sourceCode;
      const usages = releverUsages(source.text, context.filename);
      const juge = preparerControle(context.filename, { racine: context.cwd, variablesDuFichier: usages.variables });
      const signaler = (usage, constats) => {
        for (const constat of constats) {
          context.report({
            loc: { start: source.getLocFromIndex(usage.debut), end: source.getLocFromIndex(usage.fin) },
            message: constat.message,
          });
        }
      };
      for (const usage of usages.chaines) signaler(usage, juge.chaine(usage.texte));
      for (const usage of usages.declarations) signaler(usage, juge.declaration(usage.propriete, usage.valeur));
    },
  };
}
```

`source.text` est le tampon de l’éditeur, donc un texte non enregistré est
jugé. `ucm check` appelle `releverUsages` sur le fichier du disque, puis le même
juge.

### Trois exemples d’échange

```js
juge.chaine("var(--components-button-sizes-medium-gapp)");
// [{ code: "token-inconnu", niveau: "ecart",
//    message: "--components-button-sizes-medium-gapp ne nomme aucun token de tokens.json.",
//    faits: { variable: "--components-button-sizes-medium-gapp" } }]

juge.declaration("padding", "12px");
// [{ code: "valeur-en-dur", niveau: "ecart",
//    message: "padding reçoit 12px. Une dimension du composant s’écrit avec un token.",
//    faits: { propriete: "padding", valeurs: ["12px"], familles: ["dimension"] } }]

juge.declaration("gap", null);
// [{ code: "non-analyse", niveau: "non-analyse",
//    message: "La valeur de gap est calculée par le code. Le linter ne la juge pas.",
//    faits: { propriete: "gap" } }]
```

## 7. Les deux règles du premier lot

### Token inconnu

| Cas | Résultat |
|---|---|
| `{chemin}` ou `var(--nom)` présent | Aucun constat. Le bon rôle du token n’est pas prouvé. |
| Chemin ou nom absent | `token-inconnu` |
| Nom CSS projeté par deux chemins | `nom-css-ambigu`, niveau `limite`, avec les deux chemins. Le kit ne choisit aucun token. |
| Variable que le fichier déclare (`variablesDuFichier`) | Aucun constat (D3) |
| Variable qui n’est ni un token ni déclarée | `token-inconnu` (D3) |
| Repli écrit en dur, `var(--token, 8px)` | `repli-en-dur`, même si le token existe (D4) |
| Nom construit par un gabarit, `var(--${…})` | `non-analyse` |
| `tokens.json` absent ou illisible | Limite `tokens-illisibles`. Aucun `token-inconnu`. |

### Valeur en dur

Les deux questions jugent le fichier d’implémentation d’un contrat (D5). Le
juge découpe une valeur en parties, sur les espaces et les virgules hors des
parenthèses. Une partie `var(…)` relève de la règle « token inconnu ».

Une chaîne hors d’une déclaration ressemble à une valeur visuelle quand chacune
de ses parties est une couleur, une longueur, un nombre, une fonction CSS ou une
valeur neutre, et qu’au moins une partie est une couleur ou une longueur.

- Couleur : hexadécimale (`#fff`, `#ffffff`, avec ou sans alpha) ou fonction de couleur (`rgb`, `rgba`, `hsl`, `hsla`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `color`). Toujours refusée, puisque le contrat ne publie jamais une couleur en clair.
- Longueur : un nombre suivi de `px`, `rem`, `em` ou `fr`. Refusée, sauf si le contrat la publie dans l’un de ses champs.

Une phrase (« Bouton de 12px »), un nom de couleur (`red`), un pourcentage
(`50%`) ou une clé de table (`primary|contained|default`) ne passe donc pas
par cette règle hors d’une déclaration. Un nom de couleur peut être une valeur
de prop ou un texte, et un pourcentage apparaît dans un libellé. Dans une
déclaration de style, la famille de la propriété est connue, et toute partie
littérale est jugée : nom de couleur, pourcentage, mot-clé.

Une partie passe dans deux cas seulement. C’est une valeur neutre, prise dans
la liste fermée du mainteneur (D6). Ou le contrat publie lui-même cette valeur
en clair, dans un champ d’une famille de la propriété, ou dans un champ
quelconque hors d’une déclaration.

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

`rotation` (types.ts 627), les places de grille (types.ts 350-355, 649-652,
676-677), `flexGrow` (types.ts 660), `alignContent` et `textOverflow`
(types.ts 272-276) n’appartiennent à aucune des trois familles. Les mots-clés
de `sizing` et de `literals` ne sont pas numériques. Le mainteneur les range
parmi les valeurs publiées, parce que le contrat les écrit en clair pour que le
développeur les recopie.

La comparaison se fait par valeur et par famille. `15px` passe dans `height`
quand `StressTest` publie `structuralSize.height: "15px"`, et il est refusé
dans `font-size`. Une couleur littérale est refusée même égale à la valeur d’un
token. Les nombres se comparent sous une forme canonique : `15.0px` égale
`15px`.

| Cas | Résultat |
|---|---|
| Fichier qu’aucun contrat ne désigne | Aucune valeur jugée. Les citations le sont. |
| Contrat illisible, ancien, récent, ou deux contrats pour le même fichier | Limite de fichier. Aucune valeur jugée. |
| Propriété hors des trois familles (`display`, `opacity`, `transform`) | Aucun constat |
| Valeur `null`, expression non résolue | `non-analyse` (D7) |
| Lecture incomplète du fichier | Limite rendue par le module et par `ucm check`, jamais « conforme » |

Zéro écart avec des usages non analysés ne veut jamais dire « conforme ».

### Limites

Le linter ne voit pas ces écarts :

- une valeur juste posée sur le mauvais élément, que le comparateur de rendu (P10, P20) rattrape ;
- un token existant employé dans le mauvais rôle ;
- une valeur calculée par un appel ou un identifiant ;
- la valeur d’une variable `--nom` que le fichier déclare lui-même ;
- un style écrit hors d’un objet `style` ou `CSSProperties` : feuille CSS, CSS Modules, gabarit d’une bibliothèque CSS-in-JS ;
- une phrase ou une prop qui contient un nom de couleur ou un pourcentage hors d’une déclaration ;
- le code d’un fichier qu’aucun contrat ne désigne, pour la règle « valeur en dur » ;
- un contrat hors de la fenêtre de lecture du kit, tant qu’il n’est pas réexporté.

Le kit n’exécute aucun code, ne suit aucune expression et ne propose aucune
correction automatique.

## 8. L’écriture `"var(--nom-exact)"`

L’aide `resolution-token` reçoit une écriture par défaut. L’agent écrit chaque
référence comme le contrat, `"{chemin}"`, puis lance
`npx ucm tokens references <fichiers>`. La commande remplace chaque référence
par `"var(--nom)"`, avec le nom que `tokenCssVariable` donne. Le code ne
contient aucune fonction qui traduit un chemin en nom, et ni l’agent ni
`ucm guide` ne calculent un nom.

- Le mécanisme existe. Une aide a une section « Écriture par défaut », que `ucm guide` imprime sauf si `.ucm/conventions.md` répond par une section `## <aide>` ou porte `ecritures-par-defaut: non` (`packages/cli/src/guide.mjs`, lignes 172 à 184).
- `resolution-token` est aujourd’hui un ancrage. Avec `ecritures-par-defaut: non` et sans section, un ancrage se liste sous « Non tranché : demander au développeur » (ligne 176). Une aide à écriture par défaut s’y tait. Le lot 1 garde donc `resolution-token` sous « Non tranché » dans ce cas, par une règle qui nomme l’aide, comme celle de `composant` (ligne 182). Un repository sans CSS reçoit toujours la question.
- L’aide `modes` dit déjà « Chaque référence devient `var(--…)` » et « ne déclare aucune variable de token ». L’écriture par défaut la rejoint.
- `.agents/skills/consommer-contrat/SKILL.md` fait lire le guide et ses aides, et ne change pas.

Une commande plutôt qu’une liste dans le guide. La traduction d’une référence
est exacte : une référence donne un seul nom. Une liste de tous les noms dans
`ucm guide` aurait ajouté 32 435 caractères au guide de `Button`, dont le contrat
fait 54 605 caractères, à chaque lecture par un agent. Une traduction par
l’agent pourrait se tromper. La commande ne coûte rien au guide et ne se trompe
pas.

- Elle remplace seulement une chaîne dont tout le contenu est une référence, et garde ses guillemets.
- Elle laisse et signale une référence absente de `tokens.json`, ou prise dans un gabarit.
- Elle s’arrête avant toute écriture sur deux chemins au même nom CSS.
- Un second passage ne change rien. `--verifier` sert de preuve à l’aide.

Le plugin ESLint pourra proposer la même correction par `--fix`, avec
`tokenCssVariable` de la prise. Cette correction est exacte, donc permise, à la
différence du remplacement d’une valeur en dur par un token, où plusieurs
tokens peuvent avoir la même valeur.

Ce que la forme `"var(--nom)"` change par rapport à `"{chemin}"` :

- La table du code n’est plus la copie littérale de `variants`. La relecture retrouve chaque chemin par la règle de `tokenCssVariable`, et `ucm check` juge l’existence de chaque nom.
- Le nom aplatit les segments : `components.button.sizes.medium.padding-x` devient `--components-button-sizes-medium-padding-x`. Le juge retrouve le chemin par l’index inverse, donc la règle « token inconnu » ne perd rien.
- Une collision de noms rendrait un nom ambigu. `ucm tokens css` refuse déjà deux feuilles au même nom (`packages/cli/src/tokens-css.mjs`, ligne 325). Un repository qui génère sa feuille n’en a donc aucune. Le juge garde `nom-css-ambigu` pour un `tokens.json` que la feuille refuserait.
- Le style reçoit des chaînes littérales. La règle « valeur en dur » juge alors la déclaration au lieu de la rendre non analysée.

La forme `"var(--nom)"` est retenue. Le juge accepte encore `"{chemin}"` pour
un repository qui l’écrit dans sa section `## resolution-token`.

## 9. Réexport, cache, éditeur et CI

| Mécanisme | Risque | Règle |
|---|---|---|
| Cache des résultats ESLint sur disque | Un réexport ne relance pas la règle (§4) | ESLint tourne sans `--cache`. |
| Données gardées par le kit | Une analyse relit une ancienne version | Le juge relit ses entrées à chaque préparation. |
| Analyse dans l’éditeur | Un réexport ne provoque pas de nouvelle analyse | Le développeur essaie et documente `ESLint: Revalidate all open files` de l’[extension](https://github.com/microsoft/vscode-eslint). |

### La CI suit la règle du dernier modifié

POUR-LES-DESIGNERS.md, §6, promet qu’une demande de contrats et de
`tokens.json` seuls n’est jamais refusée pour le code.

Jusqu’au lot 4, la CI lance ESLint sur les fichiers que la demande modifie, et
sur ceux d’un envoi direct sur `main`. Une demande du designer ne touche aucun
fichier de code, donc elle reste verte. Une demande de code qui touche un
fichier fautif bloque (V-10, V-11 de la
[décision sur le verdict](./DECISION-VERDICT-UCM-CHECK.md)).

Au lot 4, `ucm check` juge les constats du code. `verdictDuComposant`
(`packages/kit/src/lecteurs/verdict-bilan.mjs`, lignes 168 à 220) bloque un
écart quand la demande juge le code (`code` ou `sans-base`) et que le contrat
n’est pas plus récent que le code. Une demande `contrats-et-tokens` ou
`tokens-seuls` ne bloque jamais sur le code. Les constats du code suivent la
même règle, avec une comparaison de plus entre le rang des tokens et celui du
code. Le composant que le designer a fait changer en dernier est marqué « en
retard », et le rapport le nomme. Le job ESLint cesse alors de bloquer, et le
verdict de la CI vient d’`ucm check` seul.

Comme pour la parité (V-12, V-18), un constat dans un fichier que la demande ne
touche pas bloque une demande de code si ce fichier est plus récent que son
contrat et ses tokens. Le corpus repris doit donc entrer sans constat.

### L’état d’un composant, une donnée

Au lot 4, `verdictDeLaDemande` rend pour chaque composant son état, ses
constats par règle et leurs nombres, et le rapport met cette donnée en phrases
sans la recalculer. La future page santé des composants dans Storybook lira
cette même donnée, et son nom n’entrera dans la prise que lorsque cette page
l’importera.

### Recette d’installation de l’essai

Le kit, la CLI et l’adaptateur sont empaquetés par `npm pack` depuis le même
commit du toolkit, avec une version `-essai.N`. Sur une branche d’essai
d’intencial-library, jamais fusionnée :

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
`npm ls @ucm-kit/core` montre alors une seule version, ce que la règle « un seul
kit par repository » de [MODULES.md](../../../guides/MODULES.md#épingler-le-kit)
demande. Le lien `file:` déroge à l’épinglage exact, donc la branche d’essai
n’est jamais fusionnée. Après la publication, le développeur épingle les trois
versions publiées à l’exact et retire `overrides` et les archives.

## 10. Choix fondamentaux

| Choix | Argument décisif | Meilleur contre-argument | Cas qui le casserait | Risque restant |
|---|---|---|---|---|
| Le juge par fichier, dans le kit | Un seul jugement pour l’éditeur et `ucm check`, sans règle UCM dans le module ([MODULES.md](../../../guides/MODULES.md)) | Chaque préparation relit la configuration, les contrats et `tokens.json` | Un repository dont la lecture par fichier ralentit l’éditeur. Absent : 2,6 ms par préparation sur le corpus (§5) | Mesure à l’essai sur le corpus repris ; un cache seulement après mesure |
| L’extracteur unique, dans l’adaptateur | Une seule fonction lit le code, sur le tampon dans l’éditeur et sur le disque en CI : les deux rendent le même relevé | L’adaptateur embarque TypeScript 5.9 (`>=5.5.0 <6`) pour un projet en 6.0, et le plugin charge une seconde copie de TypeScript (218 ms, une fois par processus) | Une syntaxe que 5.9 ne lit pas, ou un style écrit hors d’un objet `style`. Absent : 0 erreur de lecture sur les quatre composants, styles tous en objets `style`. intencial-library n’a pas encore choisi sa forme de style (§5) | La lecture incomplète se rend en limite. La forme de style d’intencial-library est à donner au lot 0 ; une forme hors des objets rouvre ce choix |
| La réalisation (b) | La règle du dernier modifié existe déjà dans `verdictDuComposant` (`verdict-bilan.mjs`, 168-220), sans forme de fichier ni étape de workflow | `ucm check` dépend de l’adaptateur pour juger le code | Une technologie sans adaptateur : son code reste « présent, non vérifié » (V-17). Absent : le corpus est en TSX | Un fichier fautif plus récent que son contrat bloque toute demande de code (V-12, V-18) |
| Les chaînes visuelles, où qu’elles soient | Les valeurs de chaque combinaison vivent dans des tables : 19 des 25 parties visuelles du corpus sont hors d’une déclaration (§5) | Un texte peut contenir une longueur ou une couleur | Un libellé ou une valeur de prop en forme de valeur CSS. Absent : 0 faux positif sur 1 754 chaînes | La définition exclut phrases, noms de couleur et pourcentages hors déclaration, donc un nom de couleur en dur dans une table passe |
| L’écriture `"var(--nom-exact)"` | Aucune fonction de traduction, donc aucune projection recopiée, et un style que le juge lit | La table du code cesse d’être la copie littérale du contrat | Une collision de noms CSS : `ucm tokens css` la refuse (`tokens-css.mjs`, 325). Un chemin non ASCII : la commande donne le nom exact. Absent : 376 références ASCII | Un agent qui oublie de lancer la commande laisse des `"{chemin}"` : `--verifier` et le juge les voient |
| Le chiffre du milieu pour un réglage de liste | La même déclaration reçoit un autre verdict, donc une rupture selon `packages/kit/invariants/versionnage.md`, et `apiPublique.test.mjs` l’impose par l’exemple des listes | Un ajout ne casse aucun module et force pourtant trois publications et un nouvel épinglage | Des réglages fréquents. Absent du corpus | Chaque réglage demande trois publications et un nouvel épinglage |

## 11. Ordre de travail et cas du module

| Étape | Responsable | Preuve attendue |
|---|---|---|
| Écriture par défaut et commande `ucm tokens references` | Mainteneur et ses agents | Lot 1 publié avant les réimplémentations v14 |
| Exemples d’échange et forme des styles | Développeur | Réponse écrite dans ce cadrage |
| Juge et extracteur | Mainteneur et ses agents | Lot 2 commité, sans publication |
| Reprise du corpus et plugin | Développeur | Tests `RuleTester` sur le corpus repris |
| Essai depuis les archives | Mainteneur et développeur | Tableau des résultats dans ce cadrage |
| Deux prises, skill, guide, publication | Mainteneur et ses agents | Versions constatées par `npm view` |
| Constats du code dans `ucm check` | Mainteneur et ses agents | Lot 4 publié, composant en retard nommé au rapport |
| Toutes les règles dans l’inventaire | Mainteneur et ses agents | Lot 5 ; partie `ucm check` possible dès maintenant |

Le plan liste les cas du juge, de l’extracteur et du guide. Le plugin couvre en
plus l’affichage : position d’un constat sur un texte non enregistré, niveau de
message configuré, affichage des usages non analysés et d’une lecture
incomplète, commande de réanalyse documentée. L’essai mesure le temps d’analyse
d’un fichier dans l’éditeur et compte les faux positifs par règle.

## 12. Décisions et questions restantes

| Décision | Contenu |
|---|---|
| D1 | Premier lot : token inconnu et valeur en dur. |
| D2 | Token inconnu juge `{chemin}` sans projection et `var(--nom)` par `tokenCssVariable`, avec détection des collisions. |
| D3 | Une variable CSS qui n’est pas un token est refusée, sauf si le même fichier la déclare. Aucune clé de configuration. |
| D4 | Un repli en dur dans `var(--token, 8px)` est refusé, même si le token existe. |
| D5 | Valeur en dur se juge au niveau du fichier, sans slot, sur trois familles, avec deux exceptions : valeur neutre, valeur publiée par le contrat. |
| D6 | Valeurs neutres : `0`, `none` et `fit-content`. Ajouter une valeur ne casse rien ; en retirer une fait apparaître des erreurs dans du code existant. |
| D7 | Une expression non résolue est non analysée. |
| D8 | Le kit prépare un juge par fichier. |
| D9 | Le linter bloque une demande qui touche le code du composant. Une demande de contrats ou de tokens seuls reste verte. |
| D10 | Pas de Stylelint au premier lot. |
| D11 | Plugin local dans intencial-library, extraction décidée après l’essai. |
| D12 | Essai depuis des archives `npm pack`, puis une seule publication du juge et de l’extracteur. |
| D13 | TypeScript 6.0 dans intencial-library tant que le parseur refuse TypeScript 7. |
| D14 | Écriture par défaut `"var(--nom-exact)"`, posée par la commande `ucm tokens references` sur les `"{chemin}"` que l’agent écrit. Le juge accepte aussi `"{chemin}"`. |
| Choix du plan | Mots-clés publiés comptés comme valeurs publiées. Chiffre du milieu pour un réglage de liste. Guide `docs/guides/LINTER-UCM.md` et skill `regler-le-linter`. Réalisation (b) avec un seul extracteur dans l’adaptateur. Chaînes visuelles jugées où qu’elles soient. Seconde prise `@ucm-kit/adapter-typescript/usages`. |

Questions restantes :

- pour le développeur : la forme d’écriture des styles d’intencial-library, objets `style`, CSS Modules ou bibliothèque CSS-in-JS. L’extracteur ne lit que la première.

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

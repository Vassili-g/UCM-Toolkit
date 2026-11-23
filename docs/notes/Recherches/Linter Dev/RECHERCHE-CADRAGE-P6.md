# Cadrage du linter UCM et de son cœur dans le kit

Le premier lot du linter porte deux règles, « token inconnu » et « valeur en
dur ». L’adaptateur TypeScript lit le code des fichiers d’un composant. Le kit
juge un fichier, applique les dérogations et rend des constats complets. Le
plugin ESLint du développeur les affiche. `ucm check` appelle les mêmes
fonctions et juge les constats par la règle du dernier modifié. Une seule
publication livre le tout.

Le mainteneur a validé les décisions D1 à D14, puis les réponses aux deux
relectures du plan, que le §12 range en D15 à D27. Le §10 examine chaque choix
fondamental contre le cas qui le casserait. Le
[plan de la partie kit](./PLAN-IMPLEMENTATION-P6-KIT.md) distribue le travail
en vagues. Les essais des §3, §4 et §13 restent valables.

## 1. Ce que le mainteneur et le développeur doivent retenir

| Acteur | Travail |
|---|---|
| Mainteneur, avec ses agents | L’écriture par défaut des références et `ucm tokens references`. Le juge, ses listes et la dérogation des constats du code dans le kit. Le lecteur du code dans l’adaptateur. Les constats du code dans `ucm check`, la commande `ucm deroger`, les deux prises, l’inventaire, le guide `docs/guides/LINTER-UCM.md` et la skill `regler-le-linter`. |
| Développeur du module | Le plugin ESLint local, son affichage, sa configuration et ses tests `RuleTester`. La forme d’écriture des styles d’intencial-library. La reprise du corpus de Playground. |
| Mainteneur et développeur | L’essai sur les composants repris, avant la publication si le développeur répond à temps, après sinon. |

Le premier lot ne couvre ni les variantes non publiées, ni les éléments visuels
supplémentaires, ni Stylelint, ni l’analyse typée, ni la correction
automatique d’une valeur en dur.

## 2. Ce qui existe et ce qui manque

La [fiche P6](../Evolutions%20globales/pistes.json) prévoit deux règles décidées,
valeur en dur et token inconnu. Les variantes non publiées et les éléments
supplémentaires restent ouverts dans le
[plan de conformité](./PLAN-CONFORMITE-RENDU.md#ce-qui-reste-ouvert).

| Appui dans le dépôt | Usage pour P6 | Limite |
|---|---|---|
| `packages/kit/src/modules/index.mjs` et `index.d.mts` | Sept fonctions et le type `Contract` | Aucun contrôle de source. Le juge y entre à la publication. |
| `packages/kit/src/lecteurs/tokens-dtcg.mjs` | Indexer les feuilles DTCG par chemin pointé, sans projection | L’existence d’un token ne prouve ni son bon usage ni sa valeur affichée. |
| `packages/kit/src/format/names.ts` | `tokenCssVariable`, ligne 73, « unique autorité » de la projection d’un chemin vers sa variable CSS | Deux chemins peuvent produire le même nom (lignes 63 à 67). |
| `packages/cli/src/tokens-css.mjs` | Refuse deux feuilles qui donnent la même propriété CSS (ligne 325) | Ne protège que les repositories qui génèrent la feuille. |
| `packages/kit/src/lecteurs/implementation.mjs` | `cheminImplementation`, ligne 28 | Un seul fichier par contrat. Les fichiers qu’il importe viennent de l’adaptateur. |
| `packages/kit/src/lecteurs/version-contrat.mjs` | Fenêtre de lecture de 13.0 (ligne 20) à `CONTRACT_VERSION`, 14.0 (`format/version.ts`, ligne 16) | Une montée à 15.0 refermera la fenêtre au-dessus de 13.0. |
| `packages/kit/src/lecteurs/derogations.mjs` | `.ucm/derogations.json`, six genres de parité, `appliquerDerogations` | Refuse aujourd’hui un genre du code. |
| `packages/kit/src/lecteurs/verdict-bilan.mjs` | `verdictDeLaDemande`, ligne 252, et `ETATS_DE_COMPOSANT`, ligne 133 | Ne lit aucun constat du code. |
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

### Le lecteur du code, dans l’adaptateur

`@ucm-kit/adapter-typescript/usages` publie un seul nom, `lecteurDuCode`, un
objet gelé. `adaptateurTypeScript`, que charge `ucm check`, porte le même objet.

| Membre | Rôle |
|---|---|
| `releverUsages(texte, nomDuFichier)` | Lit la syntaxe d’un fichier par `ts.createSourceFile`, sans programme ni vérificateur de types, et rend son relevé |
| `fichiersDuComposant(implementation)` | Rend `{ fichiers, lecture }` : l’implémentation, puis les fichiers qu’elle importe par un chemin relatif, directement ou transitivement, dans son dossier et ses sous-dossiers |
| `extensions` | `.ts` et `.tsx`, les seules extensions lues, égales à celles qu’`ucm check` attend de cet adaptateur |

| Sortie de `releverUsages` | Contenu |
|---|---|
| `chaines` | `{ texte, debut, fin, attribut }` pour chaque littéral de chaîne et chaque morceau fixe d’un gabarit, hors valeur entière d’une déclaration. `attribut` nomme l’attribut JSX qui porte la chaîne, s’il y en a un |
| `declarations` | `{ propriete, valeur, debut, fin, contexte }`. `contexte: "style"` pour chaque propriété d’un objet de style : attribut JSX `style`, objet annoté d’un type qui nomme `CSSProperties`, suivi de `satisfies` ou `as CSSProperties`, ou rendu par une fonction de ce type. `contexte: "objet"` pour une propriété d’un autre objet dont la valeur est une chaîne ou un nombre littéral. Une expression donne `valeur: null`, une décomposition `propriete: null` |
| `variables` | Les clés `--nom` des objets de style |
| `directives` | Chaque commentaire qui contient `eslint-disable` |
| `lecture` | `{ complete, erreurs }`, d’après les erreurs de syntaxe. Un fichier d’une autre extension rend `complete: false` et son `extension` |

`debut` et `fin` sont des décalages dans le texte reçu. La normalisation React
vit ici. `backgroundColor` devient `background-color`. Dans un objet de style,
un nombre reçoit `px`, sauf `0` et sauf pour les propriétés sans unité de
[React](https://react.dev/reference/react-dom/components/common#common-props)
(`opacity: 0.5` reste `0.5`). Dans une table, un nombre garde sa forme écrite, porte `nombre: true` et `valeurEnStyle`, la valeur que React écrirait. Un commentaire, un texte JSX, un littéral de type,
une clé d’objet et un spécificateur d’import ne sont pas des chaînes.

Reconnaître une valeur visuelle est un jugement, donc l’adaptateur relève tout
et le kit décide.

### Le juge, dans le kit

`preparerControle(fichier, { texte, lecteur, racine })` remonte depuis le
fichier jusqu’au premier `ucm.config.json` quand `racine` manque. Elle lit la
configuration, les contrats, `tokens.json` et `.ucm/derogations.json`. Elle
trouve les composants dont les fichiers incluent ce fichier, juge son texte
(`texte` s’il est donné, le disque sinon), applique les dérogations et rend tous
les constats. Elle ne garde rien d’un appel à l’autre et ne lève jamais.
`ucm check` passe par la même fonction, avec les données qu’il a déjà lues.

| Sortie | Contenu |
|---|---|
| `racine` | Dossier du `ucm.config.json` trouvé, ou `null` |
| `fichier` | Chemin relatif à la racine, avec `/`, ou `null` |
| `composants` | Identifiants des composants dont les fichiers incluent ce fichier, `[]` hors périmètre |
| `limites` | `{ code, composant, message, faits }` pour chaque limite du fichier ou d’un composant |
| `constats` | Tous les constats du fichier, dans l’ordre du texte |

| Champ d’un constat | Contenu |
|---|---|
| `regle` | `token-inconnu` ou `valeur-en-dur`, la règle qui l’affiche |
| `code` | `token-inconnu`, `repli-en-dur`, `nom-css-ambigu`, `valeur-en-dur`, `non-analyse` ou `desactivation-interdite` |
| `niveau` | `ecart`, `non-analyse` ou `limite` |
| `composant` | Le composant dont le contrat juge ce constat |
| `debut`, `fin` | Décalages dans le texte sans BOM, celui que rend ESLint |
| `message` | Une phrase complète, avec la commande de dérogation d’un écart dérogeable non couvert |
| `faits` | Les données du constat, d’une forme propre à chaque code |
| `coordonnees` | Pour un code dérogeable, les coordonnées de sa dérogation |
| `commande` | Pour un écart dérogeable non couvert, la commande `npx ucm deroger` complète, motif à remplir |
| `deroge` | `{ motif, par }` quand une dérogation valide le couvre |

Limites : `configuration-absente`, `configuration-invalide`,
`contrats-introuvables`, `fichier-sans-chemin`, `tokens-illisibles`,
`tokens-format-inconnu`, `contrat-illisible`, `contrat-ancien`,
`contrat-recent`, `contrats-multiples`, `fichier-partage`,
`lecture-incomplete`, `derogations-illisibles` et `sans-adaptateur`.

Les codes, leurs règles, leurs raisons, les limites et les listes vivent dans un
module pur du kit, `packages/kit/src/lecteurs/controle-du-code-listes.mjs`.
Aucun nœud ESLint ou TypeScript n’entre dans le kit. La prise gagne un seul nom,
`preparerControle` (D22), qui reste « une question » au sens de la
[décision sur l’API publique](../Evolutions%20globales/DECISION-API-PUBLIQUE.md#question-1-que-contient-la-liste-des-noms-promis).

### Le contrat du plugin

Le plugin du développeur s’appuie sur ces points, et sur aucun autre. Les types
de `packages/kit/src/modules/index.d.mts` en font autorité après la publication.

1. Deux imports : `lecteurDuCode` de `@ucm-kit/adapter-typescript/usages`, `preparerControle` de `@ucm-kit/core/modules`.
2. Une règle ESLint par valeur de `regle`. Le plugin ne recopie aucune table de codes.
3. Le texte passé est `context.sourceCode.text`, donc un texte non enregistré est jugé. Les positions viennent de `getLocFromIndex(debut)` et `getLocFromIndex(fin)`.
4. Une limite s’affiche en tête de fichier. Un fichier dont `composants` est vide n’a rien à afficher.
5. Un constat qui porte `deroge` ne s’affiche jamais en erreur.
6. Un constat `non-analyse` s’affiche au plus en information.
7. `eslint-disable` ne sert pas pour les règles UCM. Un commentaire qui en nomme une rend le constat `desactivation-interdite`, et `ucm check` juge le code sans lire les commentaires.
8. Le cache ESLint reste désactivé. `preparerControle` relit ses entrées à chaque appel.
9. Le plugin et la CLI emploient le même `@ucm-kit/core`, épinglé à l’exact.
10. Une correction automatique se limite à remplacer `"{chemin}"` par `"var(--nom)"`, avec `faits.reference` et `tokenCssVariable`. Une valeur en dur ne se corrige jamais seule, parce que plusieurs tokens peuvent avoir la même valeur.

Esquisse, à confirmer avec le développeur :

```js
import { lecteurDuCode } from "@ucm-kit/adapter-typescript/usages";
import { preparerControle } from "@ucm-kit/core/modules";

const regle = (nom) => ({
  create(context) {
    return {
      Program() {
        const source = context.sourceCode;
        const controle = preparerControle(context.filename, { texte: source.text, lecteur: lecteurDuCode });
        for (const constat of controle.constats) {
          if (constat.regle !== nom || constat.deroge) continue;
          context.report({
            loc: { start: source.getLocFromIndex(constat.debut), end: source.getLocFromIndex(constat.fin) },
            message: constat.message,
          });
        }
      },
    };
  },
});

export default { rules: { "token-inconnu": regle("token-inconnu"), "valeur-en-dur": regle("valeur-en-dur") } };
```

`ucm check` lit le fichier sur le disque et passe par le même juge.

### Trois exemples d’échange

```js
// Button.tsx contient : padding: "var(--components-button-sizes-medium-gapp)"
// [{ regle: "token-inconnu", code: "token-inconnu", niveau: "ecart", composant: "Button",
//    message: "`--components-button-sizes-medium-gapp` ne nomme aucun token de tokens.json, et aucun fichier du composant ne la déclare. Pour la garder, lancez `npx ucm deroger Button token-inconnu src/components/Button/Button.tsx --components-button-sizes-medium-gapp --motif \"…\"` avec votre raison à la place de `…`.",
//    faits: { variable: "--components-button-sizes-medium-gapp" },
//    coordonnees: { fichier: "src/components/Button/Button.tsx", reference: "--components-button-sizes-medium-gapp" } }]

// Button.variants.ts contient : const SIZES = { medium: { padding: "12px" } }
// [{ regle: "valeur-en-dur", code: "valeur-en-dur", niveau: "ecart", composant: "Button",
//    message: "`padding` reçoit `12px`, que le contrat de `Button` ne publie pas. Écrivez la référence de token que le contrat donne. Pour la garder, lancez …",
//    faits: { propriete: "padding", valeur: "12px", parties: ["12px"], familles: ["dimension"] } }]

// Button.tsx contient : style={{ gap: entry.gap }}
// [{ regle: "valeur-en-dur", code: "non-analyse", niveau: "non-analyse", composant: "Button",
//    message: "La valeur de `gap` est calculée par le code. Le contrôle ne la juge pas.",
//    faits: { propriete: "gap", forme: "expression" } }]
```

## 7. Les deux règles du premier lot

### Token inconnu

| Cas | Résultat |
|---|---|
| `{chemin}` ou `var(--nom)` présent | Aucun constat. Le bon rôle du token n’est pas prouvé. |
| Chemin ou nom absent | `token-inconnu` |
| `var(--nom)` pris dans une fonction, `calc(var(--nom) / 100)` | Jugé comme hors fonction : `var()` se cherche à toute profondeur |
| Nom CSS projeté par deux chemins | `nom-css-ambigu`, niveau `limite`, avec les chemins triés. Le kit ne choisit aucun token. |
| Variable qu’un fichier du composant déclare | Aucun constat (D3, étendu au composant par D19) |
| Variable qui n’est ni un token ni déclarée | `token-inconnu` (D3) |
| Repli écrit en dur, `var(--token, 8px)` | `repli-en-dur`, même si le token existe (D4) |
| Nom construit par un gabarit, `var(--${…})` | `non-analyse` |
| `tokens.json` absent, illisible ou d’une version non lue | Limite `tokens-illisibles` ou `tokens-format-inconnu`. Aucun `token-inconnu`. |

Une référence `{chemin}` se reconnaît par `isTokenReference`.

### Valeur en dur

Le juge découpe une valeur en parties, sur les espaces et les virgules hors des
parenthèses. Il classe chaque partie : `var(…)`, couleur (hexadécimale, fonction
de couleur, nom de couleur), longueur (un nombre et une unité de longueur CSS,
`fr` compris), pourcentage, nombre, fonction mathématique (`calc`, `min`, `max`,
`clamp`), autre fonction, identifiant. Les mots-clés se comparent en
minuscules, et les nombres sous une forme canonique : `15.0px` égale `15px`,
`0px` égale `0`.

Une partie passe dans trois cas : c’est une valeur neutre (`0`, `none`,
`fit-content`, `currentColor`, `transparent`, D6), le contrat publie cette
valeur en clair dans un champ d’une famille de la propriété (dans un champ
quelconque hors d’une déclaration), ou c’est un identifiant dans une
déclaration.

**Dans une déclaration** dont la propriété appartient à une famille (couleur,
dimension, typographie, effet), le juge juge les parties couleur, longueur,
nombre et pourcentage (D17). Un identifiant CSS passe (`inset`, `solid`,
`left`, `normal`, `auto`, `inherit`), sauf un nom de couleur. Une fonction
mathématique se juge par ses arguments, et un nombre sans unité y passe, parce
qu’il multiplie ou divise. Une autre fonction se juge par ses arguments, sauf si
la partie entière égale une valeur publiée (`fit-content(100%)`). Une propriété
hors des familles (`display`, `transform`, `flex-grow`) ne reçoit aucun
`valeur-en-dur`.

**Dans une chaîne** hors d’une déclaration, une couleur hexadécimale ou une
fonction de couleur est toujours refusée, quels que soient les autres mots. Une
longueur est refusée, sauf si le contrat la publie, quand chaque autre partie
est une couleur, une longueur, un nombre, un pourcentage, une fonction, une
valeur neutre ou un mot-clé de forme (`solid`, `dashed`, `inset`…). Une phrase
(« Bouton de 12px »), un nom de couleur (`red`), un pourcentage (`50%`) ou une
clé de table (`primary|contained|default`) ne passe donc pas par cette règle.
La chaîne d’un attribut `href`, `id`, `key`, `name`, `htmlFor`, `aria-*` ou
`data-*` n’est pas jugée.

**Dans un autre objet**, une propriété dont la clé appartient à une famille se
juge comme une déclaration (`{ color: "red" }`, `{ height: 32 }` dans une table
`VARIANTS` ou `SIZES`). Une autre clé laisse sa chaîne à la règle des chaînes,
et son nombre n’est pas jugé.

La famille `effet` (`opacity`, `filter`, `backdrop-filter`) suit le format
14.0, qui tokenise l’opacité et les effets. `text-shadow` suit `box-shadow`,
dans les familles couleur et dimension.

Les listes (familles, propriétés par famille, valeurs neutres, unités,
fonctions, noms de couleur, mots-clés de forme, attributs, champs publiés)
vivent dans `packages/kit/src/lecteurs/controle-du-code-listes.mjs`. Chaque
entrée tient sur une ligne avec sa raison. La skill
`.agents/skills/regler-le-linter/SKILL.md` porte le geste qui les règle, et tout
réglage monte le chiffre du milieu du kit. Ce document n’en recopie pas les
valeurs. Un test relie les écritures par défaut des aides au juge : chacune
passe sans constat (D17).

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
(types.ts 272-276) n’appartiennent à aucune famille. Les mots-clés de `sizing`
et de `literals` comptent parmi les valeurs publiées, parce que le contrat les
écrit en clair pour que le développeur les recopie. Un test du kit exige que
chaque champ du schéma qui admet une valeur en clair soit rangé « publié » ou
« hors famille ».

Une couleur littérale est refusée même égale à la valeur d’un token. `15px`
passe dans `height` quand `StressTest` publie `structuralSize.height: "15px"`,
et il est refusé dans `font-size`.

| Cas | Résultat |
|---|---|
| Contrat illisible, ancien, récent, ou deux contrats pour le même fichier | Limite. Aucune valeur jugée pour ce composant. Les citations le sont. |
| Valeur `null`, expression non résolue, décomposition | `non-analyse` (D7) |
| Lecture incomplète du fichier | Limite `lecture-incomplete`, et le reste du fichier est jugé |

Un usage non analysé ne change pas l’état d’un composant. `ucm check` en donne
le nombre par composant, en information.

### Le périmètre

Le juge examine les fichiers d’un composant : son implémentation, puis les
fichiers qu’elle importe par un chemin relatif, directement ou transitivement,
dans son dossier et ses sous-dossiers (D19). `fichiersDuComposant` de
l’adaptateur résout ces imports. Un fichier du dossier que l’implémentation
n’importe pas, une story ou un test par exemple, est hors périmètre.

Le plugin et `ucm check` jugent ce même périmètre (D20). Un fichier hors
périmètre ne reçoit aucun constat, ni token inconnu, ni valeur en dur.

Un fichier importé par plusieurs composants reçoit la limite `fichier-partage`,
et répond au contrat de chacun : chaque constat porte son composant. Une
variable `--nom` déclarée par un fichier du composant vaut pour tous ses
fichiers. Le rang du code d’un composant, pour la règle du dernier modifié, est
celui du plus récent de ses fichiers.

Un fichier d’une extension que le lecteur ne lit pas donne la limite
`sans-adaptateur`, comme le rapport d’`ucm check` pour la même technologie.

### La dérogation d’un constat du code

Un constat du code se déroge par la même dérogation motivée que la parité,
dans `.ucm/derogations.json` (D15). Le juge l’applique, par
`appliquerDerogations`, donc l’éditeur, ESLint et `ucm check` rendent le même
verdict (D16). Elle tombe au réexport du contrat, par la clé `export` (D18).

| Genre | Coordonnées |
|---|---|
| `valeur-en-dur` | `fichier`, `valeur` (la valeur entière de la déclaration ou de la chaîne, après normalisation) |
| `token-inconnu` | `fichier`, `reference` (`{chemin}` ou `--nom`) |
| `repli-en-dur` | `fichier`, `reference` (`--nom`) |

`nom-css-ambigu`, `non-analyse` et `desactivation-interdite` ne se dérogent pas.
`fichier` est relatif à la racine, avec `/`. `derogations.mjs` porte ces
coordonnées avec celles de la parité.

`npx ucm deroger <composant> <genre> <coordonnées…> --motif "…"` écrit l’entrée
(D23). Elle prend l’`export` dans le contrat et l’auteur dans
`git config user.name`, valide l’entrée et l’écrit. Elle remplace l’entrée
tombée du même écart. Chaque message d’un écart dérogeable non couvert donne
cette commande déjà complète, motif à remplir. Les coordonnées qui contiennent
`#`, `{`, une espace ou un autre signe du shell s’écrivent entre apostrophes,
qui les gardent littérales sous Bash comme sous PowerShell.

Un agent corrige le code d’abord. Si c’est impossible, il propose la commande au
développeur, lui demande le motif, et ne la lance qu’à sa demande
(`packages/cli/procedure.md`). La dérogation se documente dans le message,
`procedure.md` et `docs/guides/LINTER-UCM.md`, et nulle part ailleurs.

`eslint-disable` est interdit pour les règles UCM (D24). `ucm check` ne lit pas
les commentaires, et un commentaire qui nomme une règle UCM rend le constat
`desactivation-interdite`, bloquant.

### Limites

Le linter ne voit pas ces écarts :

- une valeur juste posée sur le mauvais élément, que le comparateur de rendu (P10, P20) rattrape ;
- un token existant employé dans le mauvais rôle ;
- une valeur calculée par un appel ou un identifiant ;
- la valeur d’une variable `--nom` que le composant déclare lui-même ;
- un style écrit hors d’un objet `style`, d’un objet typé `CSSProperties` ou d’une table à clés CSS : feuille CSS, CSS Modules, gabarit d’une bibliothèque CSS-in-JS ;
- une phrase ou une prop qui contient un nom de couleur ou un pourcentage hors d’une déclaration ;
- le code d’un fichier hors du périmètre d’un composant ;
- un import d’un fichier hors du dossier du composant ;
- un contrat hors de la fenêtre de lecture du kit, tant qu’il n’est pas réexporté.

Le kit n’exécute aucun code, ne suit aucune expression et ne propose aucune
correction d’une valeur en dur.

## 8. L’écriture `"var(--nom-exact)"`

L’aide `resolution-token` reçoit une écriture par défaut. L’agent écrit chaque
référence comme le contrat, `"{chemin}"`, puis lance
`npx ucm tokens references <fichiers>`. La commande remplace chaque référence
par `"var(--nom)"`, avec le nom que `tokenCssVariable` donne. Le code ne
contient aucune fonction qui traduit un chemin en nom, et ni l’agent ni
`ucm guide` ne calculent un nom.

- Le mécanisme existe. Une aide a une section « Écriture par défaut », que `ucm guide` imprime sauf si `.ucm/conventions.md` répond par une section `## <aide>` ou porte `ecritures-par-defaut: non` (`packages/cli/src/guide.mjs`, lignes 172 à 184).
- `resolution-token` est aujourd’hui un ancrage. Avec `ecritures-par-defaut: non` et sans section, un ancrage se liste sous « Non tranché : demander au développeur ». `resolution-token` y reste, par une règle qui nomme l’aide, comme celle de `composant`. Un repository sans CSS reçoit toujours la question.
- Le Sens de l’aide disait « Les pixels de `structuralSize` et des pistes de grille sont les seules valeurs brutes prévues ». Il dit désormais que seules les valeurs que le contrat publie en clair s’écrivent brutes, comme le juge.
- L’aide `modes` dit déjà « Chaque référence devient `var(--…)` » et « ne déclare aucune variable de token ». L’écriture par défaut la rejoint.
- `.agents/skills/consommer-contrat/SKILL.md` fait lire le guide et ses aides, et ne change pas.

Une commande plutôt qu’une liste dans le guide. La traduction d’une référence
est exacte : une référence donne un seul nom. Une liste de tous les noms dans
`ucm guide` aurait ajouté 32 435 caractères au guide de `Button`, dont le contrat
fait 54 605 caractères, à chaque lecture par un agent. Une traduction par
l’agent pourrait se tromper. La commande ne coûte rien au guide et ne se trompe
pas.

- Elle remplace seulement une chaîne dont tout le contenu est une référence, et garde ses guillemets, ses fins de ligne et son BOM.
- Elle laisse et signale une référence absente de `tokens.json`, prise dans un gabarit, ou passée en argument d’un appel (`token("{a.b}")`, l’ancien helper du corpus).
- Elle s’arrête avant toute écriture sur deux chemins au même nom CSS.
- Elle refuse d’écrire dans un repository dont `.ucm/conventions.md` porte une section `## resolution-token`, qui garde sa propre écriture.
- Un second passage ne change rien. `--verifier` sert de preuve à l’aide, quand le repository suit l’écriture par défaut.

Ce que la forme `"var(--nom)"` change par rapport à `"{chemin}"` :

- La table du code n’est plus la copie littérale de `variants`. La relecture retrouve chaque chemin par la règle de `tokenCssVariable`, et `ucm check` juge l’existence de chaque nom.
- Le nom aplatit les segments : `components.button.sizes.medium.padding-x` devient `--components-button-sizes-medium-padding-x`. Le juge retrouve le chemin par `nomsCssDesTokens`, donc la règle « token inconnu » ne perd rien.
- Une collision de noms rendrait un nom ambigu. `ucm tokens css`, `ucm tokens references` et le juge la lisent par `nomsCssDesTokens`. Un repository qui génère sa feuille n’en a donc aucune.
- Le style reçoit des chaînes littérales, que la règle « valeur en dur » juge. Le code piloté par des tables garde des expressions (`entry.tokens.background`), que le juge compte en usages non analysés.

La forme `"var(--nom)"` est retenue. Le juge accepte encore `"{chemin}"` pour
un repository qui l’écrit dans sa section `## resolution-token`.

## 9. Réexport, cache, éditeur et CI

| Mécanisme | Risque | Règle |
|---|---|---|
| Cache des résultats ESLint sur disque | Un réexport ne relance pas la règle (§4) | ESLint tourne sans `--cache`. |
| Données gardées par le kit | Une analyse relit une ancienne version | Le juge relit ses entrées à chaque préparation. |
| Analyse dans l’éditeur | Un réexport ne provoque pas de nouvelle analyse | Le développeur essaie et documente `ESLint: Revalidate all open files` de l’[extension](https://github.com/microsoft/vscode-eslint). |
| Deux kits dans le repository | L’éditeur juge avec un autre kit que la CI | `ucm check` et `ucm guide` le signalent par `noyauEnDesaccord`, sans bloquer : la CI juge avec le kit de la CLI. |

### La CI suit la règle du dernier modifié

POUR-LES-DESIGNERS.md, §6, promet qu’une demande de contrats et de
`tokens.json` seuls n’est jamais refusée pour le code.

`ucm check` juge les constats du code dès la publication (D21). Aucun job ESLint
intérimaire ne bloque la CI. Le job ESLint du développeur garde ses autres
règles bloquantes, `no-restricted-imports` compris. Le verdict des règles UCM
vient d’`ucm check`, qui ne lit pas les commentaires `eslint-disable`.

`verdictDuComposant` (`packages/kit/src/lecteurs/verdict-bilan.mjs`) bloque un
écart quand la demande juge le code (`code` ou `sans-base`) et que le code est
le plus récent. Un constat du code dont le composant a un contrat ou un
`tokens.json` plus récent que son code est « en retard » : en retard sur son
contrat si le contrat est plus récent, en retard sur les tokens sinon. Il ne
bloque pas, et le rapport le nomme. Une demande `contrats-et-tokens` ou
`tokens-seuls` ne bloque jamais sur le code.

Comme pour la parité (V-12, V-18), un constat dans un fichier que la demande ne
touche pas bloque une demande de code si ce fichier est le plus récent du
composant, plus récent que son contrat et ses tokens. Le corpus repris doit donc
entrer sans constat. Un réglage de liste qui resserre le juge fait apparaître
des constats dans du code existant : la demande qui monte les versions les
corrige ou les déroge.

Un adaptateur présent qui ne porte pas `lecteurDuCode` laisse le code
« non vérifié » (`adaptateur-ancien`), et bloque une demande de code, comme un
adaptateur absent. Une lecture incomplète d’un fichier du composant fait de
même.

### L’état d’un composant, une donnée

`verdictDeLaDemande` rend pour chaque composant son état, ses constats par règle,
le nombre de ses usages non analysés et `bloquantPar`, la cause de chaque
blocage. Le rapport et le terminal mettent cette donnée en phrases sans la
recalculer, et `TEXTES_DES_ETATS` porte la phrase et la raison de chaque état.
La future page santé des composants dans Storybook lira cette même donnée, et
son nom n’entrera dans la prise que lorsque cette page l’importera.

### Recette d’installation de l’essai

L’essai ne retarde pas la publication (D27). Si le développeur répond avant,
le kit, la CLI et l’adaptateur s’empaquettent depuis un `git worktree` du
toolkit, par `npm pack --workspace <paquet>`, avec une version `-essai.N` : une
copie de `packages/kit` hors du monorepo ne s’empaquette pas, son script
`prepare` appelle `tsc` et le `tsconfig` de la racine. Sur une branche d’essai
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
| Le juge par fichier, dans le kit, sur les fichiers du composant | Un seul jugement pour l’éditeur et `ucm check`, dérogations comprises, sans règle UCM dans le module ([MODULES.md](../../../guides/MODULES.md)) | Chaque préparation relit la configuration, les contrats, `tokens.json` et les autres fichiers du composant | Un repository dont la lecture par fichier ralentit l’éditeur. Absent : 2,6 ms par préparation sur le corpus (§5), 0,5 à 3,2 ms par fichier relevé | Mesure à l’essai sur le corpus repris ; un cache seulement après mesure |
| Le lecteur unique, dans l’adaptateur | Une seule fonction lit le code, sur le tampon dans l’éditeur et sur le disque en CI : les deux rendent le même relevé | L’adaptateur embarque TypeScript 5.9 (`>=5.5.0 <6`) pour un projet en 6.0, et le plugin charge une seconde copie de TypeScript (218 ms, une fois par processus) | Une syntaxe que 5.9 ne lit pas, ou un style écrit hors des objets. Absent : 0 erreur de lecture sur les quatre composants, styles tous en objets `style`. intencial-library n’a pas encore choisi sa forme de style (§5) | La lecture incomplète se rend en limite. Une forme de style hors des objets demande un second relevé dans le même lecteur |
| La réalisation (b) | La règle du dernier modifié existe déjà dans `verdictDuComposant` (`verdict-bilan.mjs`), sans forme de fichier ni étape de workflow | `ucm check` dépend de l’adaptateur pour juger le code | Une technologie sans adaptateur : son code reste « présent, non vérifié » (V-17). Absent : le corpus est en TSX | Un fichier fautif plus récent que son contrat bloque toute demande de code (V-12, V-18) |
| Les chaînes visuelles, où qu’elles soient | Les valeurs de chaque combinaison vivent dans des tables : 19 des 25 parties visuelles du corpus sont hors d’une déclaration (§5) | Un texte peut contenir une longueur ou une couleur | Un libellé ou une valeur de prop en forme de valeur CSS. Absent : 0 faux positif sur 1 754 chaînes | Une couleur hexadécimale dans un texte libre est refusée ; la dérogation la garde |
| L’écriture `"var(--nom-exact)"` | Aucune fonction de traduction, donc aucune projection recopiée, et un style que le juge lit | La table du code cesse d’être la copie littérale du contrat | Une collision de noms CSS : `nomsCssDesTokens` la rend, et `ucm tokens css` la refuse. Un chemin non ASCII : la commande donne le nom exact. Absent : 376 références ASCII | Un agent qui oublie de lancer la commande laisse des `"{chemin}"` : `--verifier` et le juge les voient |
| Le chiffre du milieu pour un réglage de liste | La même déclaration reçoit un autre verdict, donc une rupture selon `packages/kit/invariants/versionnage.md`, et `apiPublique.test.mjs` l’impose par l’exemple généré depuis les listes | Les listes vivent dans le kit publié et épinglé à l’exact : tout réglage, ajout compris, coûte trois publications et un épinglage, quel que soit le chiffre monté | Des réglages fréquents. Absent du corpus | Chaque réglage demande trois publications et un nouvel épinglage |

## 11. Ordre de travail et cas du module

Le [plan](./PLAN-IMPLEMENTATION-P6-KIT.md) ordonne le travail du toolkit en
vagues et publie une fois, à la fin. Le développeur écrit le plugin contre le
contrat du §6 et reprend le corpus. L’essai mesure le temps d’analyse d’un
fichier dans l’éditeur et compte les faux positifs par règle.

Le plan liste les cas du juge, du lecteur, de la commande et du verdict. Le
plugin couvre en plus l’affichage : position d’un constat sur un texte non
enregistré, niveau de message configuré, affichage des limites, des constats
dérogés et des usages non analysés, commande de réanalyse documentée.

## 12. Décisions et questions restantes

| Décision | Contenu |
|---|---|
| D1 | Premier lot : token inconnu et valeur en dur. |
| D2 | Token inconnu juge `{chemin}` sans projection et `var(--nom)` par `tokenCssVariable`, avec détection des collisions. |
| D3 | Une variable CSS qui n’est pas un token est refusée, sauf si le composant la déclare. Aucune clé de configuration. |
| D4 | Un repli en dur dans `var(--token, 8px)` est refusé, même si le token existe. |
| D5 | Valeur en dur se juge sur les fichiers du composant, sans slot, par famille, avec deux exceptions : valeur neutre, valeur publiée par le contrat. |
| D6 | Valeurs neutres : `0`, `none`, `fit-content`, `currentColor` et `transparent`. `inherit` n’en est pas. Ajouter une valeur ne casse rien ; en retirer une fait apparaître des erreurs dans du code existant. |
| D7 | Une expression non résolue est non analysée. |
| D8 | Le kit prépare un juge par fichier. |
| D9 | Le linter bloque une demande qui touche le code du composant. Une demande de contrats ou de tokens seuls reste verte. |
| D10 | Pas de Stylelint au premier lot. |
| D11 | Plugin local dans intencial-library, extraction décidée après l’essai. |
| D12 | Une seule publication du juge et du lecteur. L’essai depuis des archives se fait avant si le développeur répond à temps (D27). |
| D13 | TypeScript 6.0 dans intencial-library tant que le parseur refuse TypeScript 7. |
| D14 | Écriture par défaut `"var(--nom-exact)"`, posée par la commande `ucm tokens references` sur les `"{chemin}"` que l’agent écrit. Le juge accepte aussi `"{chemin}"`. |
| D15 | Un constat du code se déroge par la dérogation motivée de la parité, dans `.ucm/derogations.json`. |
| D16 | Le juge applique les dérogations : l’éditeur, ESLint et `ucm check` rendent le même verdict (Q1 A). |
| D17 | Dans une déclaration, seules les parties couleur, longueur, nombre et pourcentage se jugent ; un identifiant passe, sauf un nom de couleur. Un test relie les écritures des aides au juge (Q2 C). |
| D18 | Une dérogation d’un constat du code tombe au réexport du contrat (Q3 A). |
| D19 | Le juge examine l’implémentation et les fichiers qu’elle importe dans son dossier, transitivement ; un fichier partagé reçoit `fichier-partage` (Q4 B). |
| D20 | Le plugin et `ucm check` jugent le même périmètre, les fichiers des composants (Q5 A). |
| D21 | Les constats du code entrent dans `ucm check` avant l’unique publication (Q6 A). |
| D22 | Chaque constat porte `regle` ; la prise gagne seulement `preparerControle` (Q7 A). |
| D23 | `npx ucm deroger` écrit une dérogation complète ; chaque message de blocage la donne, motif à remplir ; un agent ne la lance qu’à la demande du développeur. |
| D24 | `eslint-disable` est interdit pour les règles UCM ; un commentaire qui en nomme une rend `desactivation-interdite`. |
| D25 | Chaque donnée a une source unique, lue par ses lecteurs et gardée par un test de parité ou de fraîcheur. |
| D26 | Choix du plan, que le mainteneur relit : famille `effet`, coordonnées des genres du code, `preparerControle` rend tous les constats, porte `./usages` réduite à `lecteurDuCode`, retard du code sur les tokens, tables à clés CSS jugées comme des déclarations, CLI au chiffre du milieu. |
| D27 | Le plan n’attend pas le développeur. Son retour se traite dans l’étape F du plan. |
| Choix antérieurs | Mots-clés publiés comptés comme valeurs publiées. Chiffre du milieu pour un réglage de liste. Guide `docs/guides/LINTER-UCM.md` et skill `regler-le-linter`. Réalisation (b) avec un seul lecteur dans l’adaptateur. Chaînes visuelles jugées où qu’elles soient. Seconde prise `@ucm-kit/adapter-typescript/usages`. |

Questions restantes :

- pour le développeur : la forme d’écriture des styles d’intencial-library. Le plan suppose les objets `style`, les objets typés `CSSProperties` et les tables à clés CSS ; une autre forme demande un second relevé ;
- pour le développeur : la relecture du contrat du plugin (§6) ;
- pour le mainteneur : un domaine d’invariants propre au linter, au lieu de `packages/plugin-exporter/invariants/diagnostics.md`.

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

## Questions au mainteneur

- Le linter refuse-t-il une prop, une variante ou un élément absents du contrat (règles 3 et 4) ?

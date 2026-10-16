# Outils de contrôle des noms de variables

Rapport de recherche brut, sources en lien. Synthèse dans [RECHERCHE-NOMENCLATURE.md](../RECHERCHE-NOMENCLATURE.md), section 5.

**Réponse**
Je n'ai trouvé aucun outil, côté Figma ou côté CI, qui détecte sans nomenclature déclarée les synonymes (`bg`/`background`), l'ordre des segments ou un segment manquant dans une branche sœur. Les outils existants vérifient la casse, les caractères interdits, les collisions, des préfixes ou des structures déclarées. Les techniques de détection viennent de la recherche sur les identifiants de code. L'API Figma permet de renommer une variable locale sans toucher à son `id`. Les variables de bibliothèque n'exposent que `name`, `key` et `resolvedType`.

Format : ce rapport tient dans la limite de 600 mots de ma consigne de base, pas dans les 1200 à 2000 mots demandés. Je peux détailler un point si besoin.

**Documenté**

*Outils (nom, lieu, ce qu'il vérifie, déclaration de la règle)*
- Terrazzo `core/consistent-naming` (CI) : une seule casse parmi kebab, camel, Pascal, snake, SCREAMING_SNAKE, ou une fonction de validation personnalisée. Option `ignore` en globs. Déclaré dans `lint.rules`. [terrazzo.app/docs/linting](https://terrazzo.app/docs/linting/)
- Terrazzo `core/required-children` et `core/required-modes` (CI) : enfants ou modes obligatoires, par globs. Même page. C'est le seul contrôle de « segment manquant » que j'ai trouvé, et il est déclaratif.
- Hypermatic Design Token Naming Linter (navigateur, gratuit) : styles de casse ou séparateurs mélangés, caractères invalides, collisions après aplatissement, profondeur. Seuls réglages : un style préféré et une profondeur maximale. [hypermatic.com](https://www.hypermatic.com/tools/design-token-naming-linter/)
- Style Dictionary (CI) : aucun linter de noms. `log.warnings: 'error'` fait échouer le build sur les collisions de noms et de valeurs. [styledictionary.com/reference/logging](https://styledictionary.com/reference/logging/)
- Specify (CI) : le parser `change-case` convertit la casse (noms, modes), sélection par regex ou requête. Il renomme, il ne vérifie pas. [docs.specifyapp.com](https://docs.specifyapp.com/reference/parsers/change-case)
- Tokens Studio (Figma) : les pages de documentation ouvertes décrivent la casse, les `$`, les crochets et les accolades comme des recommandations. Elles ne décrivent aucune validation. [docs](https://docs.tokens.studio/manage-tokens/token-names/technical-specs)
- Design Lint (Figma, MIT) : vérifie les styles manquants et les rayons. Le README ne mentionne pas les variables. Règles ajoutées en forkant `lintingFunctions.ts`. [GitHub](https://github.com/destefanis/design-lint)
- `@atlaskit/eslint-plugin-design-system` : contrôle l'usage des tokens dans le code (valeurs en dur, tokens dépréciés), pas la cohérence des noms. [atlassian.design](https://atlassian.design/components/eslint-plugin-design-system/usage)
- Supernova : je n'ai pas trouvé de validation de noms dans sa documentation. [exporters](https://www.supernova.io/guides/supernova-figma-variables-playbook/2-connecting-to-supernova/supernovas-approach-to-design-tokens)
- zeroheight : renommer une variable casse son lien avec le token zeroheight. [aide](https://help.zeroheight.com/hc/en-us/articles/35887032233371-Figma-Working-with-Figma-variables-in-zeroheight)
- Knapsack : pas de règle de nommage documentée (« Flexible Token Naming »). [blog](https://www.knapsack.cloud/blog/effortless-design-consistency-february-product-updates)
- Vus seulement dans des résultats de recherche (pages en 403, non ouvertes) : TokenOps (nommage et préfixes), Renamer, Batch rename variables, Bulk rename variables. Je n'ai ni prix ni date pour eux.
- Variables Pro : non trouvé.
- DTCG 2025.10 : un nom ne commence pas par `$` et ne contient ni `{`, `}` ni `.`. Les noms sont sensibles à la casse. Les outils peuvent avertir quand deux noms ne diffèrent que par la casse. [designtokens.org](https://www.designtokens.org/tr/drafts/format/)

*Techniques*
- Cohérence = absence de synonymes et d'homonymes, soit une correspondance 1:1 entre concepts et noms. Outil : un dictionnaire d'identifiants tenu à jour. Deißenböck et Pizka (2006). Source lue par résumé de recherche : le PDF n'a pas pu être décodé. [PDF TUM](https://wwwbroy.in.tum.de/publ/papers/deissenboeck_pizka_identifier_naming.pdf)
- Lawrie, Feild et Binkley : qualité d'un identifiant = possibilité de le recomposer avec des mots de dictionnaire, des abréviations connues (liste d'environ 200) ou une stop-list. Ils proposent deux métriques automatiques : conciseness syntaxique et consistance des synonymes. Source lue par résumé de recherche : le PDF n'a pas pu être décodé. [Springer](https://link.springer.com/article/10.1007/s10664-006-9032-2)
- Kim et Kim (EMSE 2016) : un dictionnaire de code avec mots de domaine et idiomes réduit les fausses alertes. Précision 85,4 %, rappel 83,59 %. Résumé de recherche seulement. [Springer](https://link.springer.com/article/10.1007/s10664-015-9369-5)
- Lexicon bad smells (Abebe et al., WCRE 2009) et linguistic antipatterns (Arnaoudova et al.) : catalogues d'écarts, détecteurs LAPD et DOLAR. Résumés de recherche seulement. [Springer](https://link.springer.com/article/10.1007/s10664-014-9350-8)
- Pour les tokens, deux billets : « synonym sprawl » (`bg`/`background`) et la règle « un ordre, un délimiteur ». Les résumés d'un moteur de recherche les décrivent, mais la page n'a pas pu être ouverte (403). [source](https://www.designsystemscollective.com/design-token-naming-that-scales-how-to-prevent-token-chaos-b92ff4cd55fd)
- Always Twisted classe les incohérences de nommage en avertissements. Il cite `spacing.medium` et `spacing.md` à valeur identique. [article](https://www.alwaystwisted.com/articles/linting-your-design-tokens)

*API Figma*
- `name` est une chaîne non marquée en lecture seule. La page ne parle ni des groupes séparés par `/` ni des caractères interdits. [Variable](https://developers.figma.com/docs/plugins/api/Variable/)
- Renommage : `colorVariable.name = "text-primary"` dans l'exemple officiel. Les alias sont stockés par id, de la forme `{type:"VARIABLE_ALIAS", id}`. [working-with-variables](https://developers.figma.com/docs/plugins/working-with-variables)
- `codeSyntax` : `WEB`, `ANDROID`, iOS, modifié par `setVariableCodeSyntax`. `scopes` : tableau de portées. `remote` et `key` : en lecture seule. `valuesByMode` ne résout pas les alias. [Variable](https://developers.figma.com/docs/plugins/api/Variable/)
- Bibliothèque : il faut la permission `teamlibrary`, et les bibliothèques doivent être activées à la main dans l'interface. [teamLibrary](https://developers.figma.com/docs/plugins/api/figma-teamlibrary/)
- `LibraryVariable` n'a que `name`, `key` et `resolvedType`. [LibraryVariable](https://developers.figma.com/docs/plugins/api/LibraryVariable/)
- `importVariableByKeyAsync` rejette si aucune variable publiée ne porte cette clé. [page](https://developers.figma.com/docs/plugins/api/properties/figma-variables-importvariablebykeyasync/)
- Limites : 5 000 variables par collection. Un alias ne cible qu'un type identique. [aide Figma](https://help.figma.com/hc/en-us/articles/15145852043927)

**À essayer dans Figma**
- Caractères interdits dans `name` : assigner `a.b`, `a//b`, `/a`, `a/` et `a{b}` en plugin, puis relire le nom.
- Effet du renommage sur les liaisons (l'id stable est déduit de la forme des alias, non documenté) : lier un fill et un alias, renommer, relire `boundVariables`, puis ouvrir un fichier consommateur de la bibliothèque.
- Une variable importée (`remote: true`) est-elle renommable, et un renommage publié apparaît-il dans les fichiers consommateurs ?
- Une variable de bibliothèque passée par `importVariableByKeyAsync` expose-t-elle ses `valuesByMode` ?
- Comment la collision de noms est-elle traitée dans une même collection (renommage vers un nom existant) ?

**Sources ouvertes**
Les liens ci-dessus sont les pages lues directement, sauf mention « résumé de recherche seulement » ou « 403 ».

**Limites** : les PDF de Deißenböck et Lawrie sont illisibles via mes outils. Plusieurs plugins de la communauté Figma sont en 403.

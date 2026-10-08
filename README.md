# UCM Toolkit

UCM Toolkit regroupe trois plugins Figma et les outils qui contrôlent les
contrats de composants dans un dépôt de code. Un contrat décrit le visuel
exporté depuis Figma ; le développeur écrit le comportement du composant.

## Choisir un outil

| Besoin | Outil | Point d'entrée |
|---|---|---|
| Créer des palettes Light et Dark, vérifier leurs contrastes et écrire leurs variables dans Figma | UCM Palettes | [Utilisation et installation](./packages/plugin-palettes/README.md) |
| Comprendre la valeur d'un token, ses alias et les tokens d'un composant | UCM Token Explorer | [Utilisation et installation](./packages/plugin-explorateur/README.md) |
| Exporter un composant et ses règles d'usage, ou les variables du fichier | UCM Contract Exporter | [Ouvrir le plugin](#ouvrir-le-plugin) |
| Recevoir les exports et les contrôler dans GitHub ou GitLab | `@ucm-kit/cli` | [Brancher un repository](#brancher-un-repository) |
| Appeler les validateurs depuis du code | `@ucm-kit/core` | [API du kit](./packages/kit/README.md) |
| Comparer un contrat à une API TypeScript et dériver ses unions | `@ucm-kit/adapter-typescript` | [Adaptateur optionnel](./packages/adapter-typescript/README.md) |

Les plugins s'utilisent séparément. Palettes écrit les couleurs ; l'exporteur
publie les variables locales en tokens DTCG ; l'explorateur les explique en
lecture seule. L'explorateur fonctionne aussi sans contrat UCM.

## Les dépôts UCM

| Dépôt | Responsabilité |
|---|---|
| **UCM Toolkit**, ici | Sources des plugins, format, lecteurs, CLI et adaptateur TypeScript |
| [UCM Playground](https://github.com/Vassili-g/UCM-Playground) | Application React de recette : reconstruire des composants depuis leurs contrats, puis comparer leur rendu à Figma |
| `intencial-library` | Dépôt consommateur destiné aux solutions Intencial ; il contient les tokens et la configuration UCM, sans contrat ni implémentation de composant |

Le Playground utilise les paquets publiés. Ses composants sont jetables :
ils servent à éprouver le contrat, pas à constituer une bibliothèque de production.

## Du composant Figma au code

```text
Figma                     Dépôt consommateur
composant et règles  →    components/Button/Button.contract.json
variables locales    →    tokens.json
                          components/Button/Button.<ext>
                          contrôle UCM dans la CI
```

Le contrat reste à côté de son implémentation. Il décrit les variantes,
la structure, les références de tokens, la composition et les règles d'usage.
Le code de production ne l'interprète pas à l'exécution.

L'exporteur peut ouvrir une demande de fusion sur GitHub ou GitLab. La CI
contrôle les fichiers et publie un rapport destiné au designer. La comparaison
du rendu avec Figma reste une opération de recette.
[CONCEPT.md](./CONCEPT.md) précise les responsabilités de chaque source.

## Ouvrir le plugin

Le lien Community d'UCM Contract Exporter est :

**<https://www.figma.com/community/plugin/1678431364325816914>**

Le [README de l'exporteur](./packages/plugin-exporter/README.md) décrit ses
commandes et sa connexion à GitHub ou GitLab. Le
[guide designer](./docs/guides/POUR-LES-DESIGNERS.md) accompagne le premier export.

Pour construire les trois plugins localement, suivez la section
[Construction](#construire-le-plugin-depuis-ce-dépôt). Les README de
[Palettes](./packages/plugin-palettes/README.md#ouvrir-le-plugin) et de
[l'explorateur](./packages/plugin-explorateur/README.md#ouvrir-le-plugin)
donnent leurs prérequis propres.

## Brancher un repository

Avec Node 20 ou plus, à la racine du dépôt consommateur :

```sh
npx --yes @ucm-kit/cli@0.1.54 init
```

`init` crée la configuration et la CI de la forge détectée, sans écraser les
fichiers existants. Il imprime les ajouts à effectuer à la main. Le dépôt
consommateur peut utiliser une autre technologie que Node.

1. Relisez les fichiers créés et les instructions imprimées.
2. Commitez et poussez ces fichiers.
3. Configurez la protection de branche ou les règles de fusion selon les
   instructions d'`init`.
4. Transmettez l'adresse du dépôt au designer pour la
   [configuration du plugin](./docs/guides/POUR-LES-DESIGNERS.md#configurer-le-dépôt).

Pour choisir d'autres chemins dès l'installation :

```sh
npx --yes @ucm-kit/cli@0.1.54 init \
  --components src/components \
  --tokens src/tokens \
  --implementation '{dir}/{id}.vue'
```

Pour contrôler les exports sur le poste :

```sh
npx --yes @ucm-kit/cli@0.1.54 check --report ci-report.md
```

Gardez une version exacte. Le [README du CLI](./packages/cli/README.md)
détaille les options, la feuille CSS des tokens et les guides d'implémentation.

## Ce que les contrôles établissent

Le contrôle vérifie la forme et la version des contrats, leur composition,
les types des tokens typographiques et les références de tokens. Il examine
aussi les emplois des couleurs lorsqu'une collection `usage` est présente.
La parité avec le code demande un adaptateur installé dans le dépôt consommateur.

Un contrat illisible bloque le contrôle. Les écarts de références, d'emplois
et de parité produisent des avertissements. Le
[détail des verdicts](./packages/cli/README.md#what-the-report-says) distingue
chaque cas, notamment un fichier de tokens absent ou illisible.

Le contrôle statique ne prouve pas la fidélité visuelle. La
[recette externe](./docs/guides/RECETTE.md) ajoute l'export réel et la comparaison
d'un composant reconstruit avec Figma.

## Construire le plugin depuis ce dépôt

Utilisez Node 22, comme la CI :

```sh
npm install
npm run build
```

Dans Figma Desktop, ouvrez `Plugins > Development > Import plugin from manifest` :

| Plugin | Manifeste construit |
|---|---|
| UCM Contract Exporter | `packages/plugin-exporter/dist/manifest.json` |
| UCM Palettes | `packages/plugin-palettes/dist/manifest.json` |
| UCM Token Explorer | `packages/plugin-explorateur/dist/manifest.json` |

L'explorateur demande encore un identifiant Figma propre ; son README décrit
comment le renseigner.

| Commande | Vérification ou sortie |
|---|---|
| `npm test` | Tests des huit paquets et contrôles du monorepo |
| `npm run typecheck` | Types TypeScript |
| `npm run build` | Kit et trois plugins |
| `npm run test:ui --workspace <plugin>` | Interactions dans Chromium |
| `npm run galerie --workspace <plugin>` | États de l'interface hors de Figma |
| `npm run schema` | JSON Schema dérivé des types du contrat |
| `npm run cascade` | CSS des tokens dans Chromium, Firefox et WebKit |

Pour `<plugin>`, utilisez `ucm-exporter-plugin`, `ucm-palettes-plugin` ou
`ucm-explorateur-plugin`. Les tests d'interface demandent
`npx playwright install chromium` ; `cascade` demande aussi Firefox et WebKit.

## Architecture

| Dossier | Contenu |
|---|---|
| [plugin-exporter](./packages/plugin-exporter/README.md) | Lecture de Figma et publication des contrats et tokens |
| [plugin-palettes](./packages/plugin-palettes/README.md) | Création, vérification et gestion des palettes |
| [plugin-explorateur](./packages/plugin-explorateur/README.md) | Variables, chaînes d'alias et vue composant |
| [plugin-socle](./packages/plugin-socle/README.md) | Build, composants d'interface et galeries partagés |
| [couleur](./packages/couleur/README.md) | Calcul des rampes, limites et contrastes, sans Figma ni DOM |
| [kit](./packages/kit/README.md) | Format, emplois des couleurs, lecteurs et schéma |
| [cli](./packages/cli/README.md) | Installation et commandes du consommateur |
| [adapter-typescript](./packages/adapter-typescript/README.md) | Parité statique et types dérivés |

## État et documentation

Le projet reste un prototype avancé ; les API des paquets `@ucm-kit/*` sont en
0.x. Le build local exporte le contrat **14.0** et les tokens au format **2**.
Le kit lit les contrats **13.0 et 14.0**. La recette Palettes est au format **8** ;
ces trois numérotations sont indépendantes.

[ROADMAP.md](./ROADMAP.md) distingue l'implémentation, les validations et la
publication. Le [sommaire documentaire](./docs/README.md) donne les références
par tâche ; l'[état des recherches](./docs/notes/Recherches/README.md) sépare
les sujets implémentés, les travaux partiels et les pistes conservées.

Avant de contribuer, lisez [AGENTS.md](./AGENTS.md) et
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Licence

[MIT](./LICENSE).

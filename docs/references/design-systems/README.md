# Nomenclatures et valeurs des design systems

Ce dossier garde, pour chaque système de la première vague, les **noms** de
ses tokens et leurs **valeurs**, tels que le système les publie. Il sert de
référence durable pour fixer la nomenclature d'UCM : qui dit `surface`, qui dit
`background`, dans quel ordre, avec quels mots. Les valeurs alimentent le
nuancier des guides de composants : voir
[le README de `docs/references/`](../README.md). Le plan qui a fondé la
nomenclature est dans
[`Plugin Architect/4 Nomenclature`](https://github.com/Vassili-g/UCM-Toolkit/blob/e4817610/docs/notes/Recherches/Plugin%20Architect/4%20Nomenclature/PLAN-IMPLEMENTATION.md).

Chaque système a son dossier :

- `sources/` : les fichiers publiés, figés à une version ou à un commit exact,
  avec l'extension `.txt` ;
- `noms.json` : le tableau trié des noms, `{ "nom", "type", "couche" }` ;
- `valeurs.json` : une ligne par nom et par mode, `{ "nom", "mode", "valeur", "resolue" }`.
  Absent pour `mui` tant que `mui-theme.mjs` n'a pas relevé les valeurs.

`sources.json` donne, pour chaque fichier, l'URL, la version, le chemin
d'origine, le SHA-256 et la licence. Une source marquée `"usage": "composant"`
est le code publié d'un composant (CSS, styles JavaScript) : `extraire.mjs` ne la
lit pas, le releveur de composants la lit à la main. Sa licence est figée avec
elle, sous un nom `composant__<paquet>__…`. `ucm/` contient les noms d'UCM au même
format, sans valeurs.

## Rejouer

```
node _outils/recuperer.mjs && node _outils/extraire.mjs
```

`recuperer.mjs` télécharge ce qui manque et vérifie le SHA-256 de chaque
fichier. `extraire.mjs` relit les fichiers figés et réécrit les `noms.json` et
les `valeurs.json` sans rien exécuter. Node 18 ou plus, aucune dépendance.

Trois outils servent plus rarement :

- `figer.mjs` change les versions : il liste, télécharge et recalcule
  `sources.json`. Il fige aussi les cinq sources de composant du bouton, aux
  versions de la collecte archivée.
- `mui-theme.mjs` installe `@mui/material` dans un dossier temporaire et
  relève les chemins de clés de `createTheme()`, puis leurs valeurs scalaires
  hors des tableaux, dans `mui/sources/valeurs-du-theme-par-defaut.json.txt`.
  MUI ne publie pas ses tokens dans un fichier, et ce script exécute le code du
  paquet : on le lance à la main. Tant qu'il n'a pas tourné avec cette version,
  `mui` n'a pas de `valeurs.json`.
- `ucm.mjs` écrit `ucm/noms.json` depuis l’instantané de la
  [vue illustrée multimarques](../../notes/Recherches/Archi%20Tokens%20Multi-marques/donnees-vue-illustree.js).
  Il relève les registres de vocabulaire et d’architecture du kit compilé dans
  `ucm/registres.json`, avec la forme qu’un terme prend dans une catégorie
  (`identifiantParCategorie` : `large` dans un dossier, `lg` ailleurs). Depuis
  la racine du dépôt :

  ```sh
  npm run build --workspace @ucm-kit/core
  node docs/references/design-systems/_outils/ucm.mjs
  ```

  `ucm/sources.json` donne les empreintes de l’instantané, de l’extracteur et
  des registres, la version du kit et les comptes par collection.

## Lire un `noms.json`

- `nom` : le nom publié. Variable CSS avec ses `--`, clé d'objet, chemin
  DTCG joint par `.`, variable Sass avec son `$`. Pour Material 3, le jeton
  `md.sys.color.primary` est recomposé : le fichier donne la famille, la clé
  donne le reste. Pour UCM, le chemin est joint par `/`.
- `type` : le type de la source, sinon deviné d'après la valeur ou le nom
  (`color`, `dimension`, `duration`…), sinon `null`.
- `couche` : `primitive`, `semantique` ou `composant`, seulement quand la
  source la rend évidente ; sinon `null`. Elle vient d'un dossier (`base` ou
  `functional` chez Primer), d'un préfixe (`md.ref`, `md.sys`, `md.comp`), d'un
  fichier (`color-palette`, `themes`, `components` chez Carbon), d'une
  collection Figma (SDS) ou de `alias` et `global` (Fluent).

## Lire un `valeurs.json`

Une ligne par nom et par mode, triée comme `noms.json` (nom, puis mode).

- `mode` : le mode de la source (`light` et `dark` ; `white`, `g10`, `g90` et
  `g100` chez Carbon). `null` quand la source n'a qu'un mode. Pour les systèmes qui
  publient un thème sombre, un nom présent dans les deux prend `light` comme mode clair.
- `valeur` : la valeur publiée. Trois écarts : la valeur d'une couleur de la palette
  de Carbon est lue dans son champ `hex` ; l'enveloppe
  `if($exclude-hardcoded-values, null, …)` des fichiers de Material 3 est retirée ;
  les couleurs fonctionnelles de GOV.UK gardent leur forme `( name: "blue" )`.
- `resolue` : la fin de la chaîne d'alias, quand toute la chaîne reste dans les
  fichiers figés du système, sinon `null`. Aucune couleur n'est convertie : `resolue`
  garde l'écriture de la source (`#0f62fe`, `rgba(…)`, `oklch(…)`, `0 0% 100%`).
  Un alias sans mode qui mène à un token à plusieurs modes devient une ligne par mode.
- `alpha` : présent chez Carbon quand un thème applique une opacité à l'alias.
  Elle reste à part de `resolue`.
- `description` : la description de la source (Carbon, Ant Design), sur la première
  ligne de chaque nom.

Lectures à connaître :

- Fluent 2 : `brand[80]` se résout par `brandWeb`, le thème web par défaut ; `white` et
  `black` viennent de `lib/global/colors.js`.
- Material 3 : les tokens de composant n'ont pas de mode dans leurs fichiers. Ils en
  prennent un quand leur alias mène à une couleur système claire et sombre.
- Ant Design : seules les valeurs des tokens de composant sont publiées. Les tokens
  globaux, calculés à l'exécution depuis les graines, n'ont que leur description, avec
  `valeur: null`.
- Spectrum : le mode `wireframe` n'est pas gardé. Les modes `desktop` et `mobile`, qui
  décrivent l'échelle, restent.
- Polaris : le thème sombre est celui que le paquet marque `experimental`.
- Untitled UI : certaines chaînes mènent à des variables que le fichier figé ne définit
  pas (`--color-neutral-50`) : `resolue` vaut `null`.

Taille : 2,6 Mo pour l'ensemble des `valeurs.json`, dont 0,86 Mo pour Material 3 et
0,54 Mo pour Spectrum. Un test refuse le dépassement de 5 Mo.

## Systèmes

| Dossier | Source et version | Licence | Noms | Couche | Anciennes collectes |
|---|---|---|---|---|---|
| `atlassian` | `@atlaskit/tokens` 20.6.1, `token-names.js` et thèmes `atlassian-light` et `atlassian-dark` | Apache-2.0 | 611 | non | [Atlassian](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Atlassian), [Surfaces](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Surfaces/sources) |
| `carbon` | `@carbon/themes` 11.83.0 (DTCG), `@carbon/layout` 11.61.0, `@carbon/type` 11.69.0 | Apache-2.0 | 665 | oui, sauf layout et type | [Surfaces](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Surfaces/sources) |
| `spectrum` | `@adobe/spectrum-tokens` 15.6.0, `dist/json/variables.json` | Apache-2.0 | 2 572 | non | [Spectrum](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Spectrum) |
| `primer` | `@primer/primitives` 11.10.0, CSS `base`, `functional` et thèmes `light` et `dark` | MIT | 1 192 | oui | [Surfaces](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Surfaces/sources) |
| `polaris` | `@shopify/polaris-tokens` 9.4.2, `dist/css/styles.css` | MIT | 452 | non | [Surfaces](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Surfaces/sources) |
| `material-3` | `@material/web` 2.5.0, jetons `v0_192` (`ref`, `sys`, `comp`) | Apache-2.0 | 3 446 | oui | [Surfaces](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Surfaces/sources), [Composants](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Composants) |
| `fluent-2` | `@fluentui/tokens` 1.0.0-alpha.24, `lib/alias` (clair et sombre) et `lib/global` | MIT | 1 045 | oui | [Surfaces](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Surfaces/sources) |
| `figma-sds` | `figma/sds` au commit `05525f7`, `src/theme.css` | MIT | 364 | oui, sauf les styles | [SDS](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/SDS) |
| `radix` | `@radix-ui/themes` 3.3.0, `tokens.css` | MIT | 1 068 | non | [Radix](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Radix) |
| `tailwind` | `tailwindcss` 4.3.3, `theme.css` | MIT | 419 | non | [Tailwind](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Tailwind) |
| `shadcn` | `shadcn-ui/ui` au commit `30a58d4`, `themes/neutral.json` | MIT | 24 | non | [Surfaces](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Surfaces/sources) |
| `mui` | `@mui/material` 9.5.0, clés de `createTheme()` | MIT | 163 | non | [MUI](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/MUI) |
| `untitled-ui` | `untitleduico/react` au commit `1d410cb`, `styles/theme.css` | MIT | 379 | non | aucune |
| `ant-design` | `antd` 6.6.8, `es/version/token.json` et `token-meta.json` | MIT | 982 | composant seulement | aucune |
| `govuk` | `govuk-frontend` 6.6.0, `dist/govuk/settings/*.scss` | MIT | 189 | primitive (palette) et sémantique (couleurs fonctionnelles) | aucune |
| `ucm` | Instantané de la vue illustrée multimarques et registres du kit | propre au projet | 1 300 | primitives, sémantiques et composants | aucune |

Limites de ce qui est relevé :

- `ucm` garde les noms de l’instantané, y compris les formes antérieures aux
  registres actuels. La couche vient de la collection : `primitives`,
  `components`, ou sémantique pour les cinq autres. Une collection de
  l’instantané qui porte un ancien nom (`color-brands`, `color-utilities`,
  `layouts`) compte sous son nom courant. Le type est déduit des
  valeurs et des cibles d’alias dans chaque mode ; 24 valeurs absentes restent
  sans type. Les registres contiennent les formes retenues, sans renommer ces
  observations.
- `shadcn` ne compte que les variables du thème de base : les noms propres aux
  composants n'y sont pas.
- `mui` n'a pas de couche. Les indices de tableaux sont retirés (`shadows.0`
  devient `shadows`), `components` n'est pas relevé.
- `fluent-2` et `primer` figent les thèmes clair et sombre, avec les mêmes noms. Les
  autres thèmes (contraste élevé, Teams) ne sont pas figés.
- `atlassian` fige les thèmes `atlassian-light` et `atlassian-dark`. Les thèmes
  `finesse`, `future` et à contraste renforcé ne sont pas figés.
- `ant-design` nomme les tokens globaux depuis `token-meta.json` et les tokens de
  composant depuis les deux fichiers, sous la forme `Button.contentFontSize`.
- `govuk` lit les réglages Sass : variables `$govuk-…` et cartes dépliées
  (`$govuk-palette.blue.primary`). Le contenu du site de GOV.UK n'est pas copié. Le
  paquet npm ne publie pas de fichier de licence : `package.json`, qui porte
  `"license": "MIT"`, est figé à sa place.
- `spectrum` regroupe tous les niveaux dans un fichier que le système ne
  classe pas : la couche n'est donc pas donnée.

## Règles d'ajout

- N'enregistrer que des sources publiques sous licence libre, avec la licence
  copiée dans `sources/`.
- Figer une version exacte du paquet ou un commit exact, jamais `latest` ni une branche.
- Aucun fichier client ici, ni nom qui en dérive.
- Changer une version passe par `figer.mjs`, jamais par une édition à la main.
- Un fichier de composant publié entre dans `figer.mjs` avec `usage: "composant"`.
  Un paquet qui ne publie pas de fichier de licence donne son `package.json`.
- `extraire.mjs` écrit `noms.json` et `valeurs.json` : ne jamais les éditer à la main.
  `tests/referencesComposants.test.ts` les compare à une nouvelle extraction.

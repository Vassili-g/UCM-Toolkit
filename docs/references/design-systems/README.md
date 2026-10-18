# Nomenclatures des design systems

Ce dossier garde, pour chaque système de la première vague, les **noms** de
ses tokens (jamais les valeurs), tels que le système les publie. Il sert de
référence durable pour fixer la nomenclature d'UCM : qui dit `surface`, qui dit
`background`, dans quel ordre, avec quels mots. Le plan qui l'utilise est dans
[`Plugin Architect/4 Nomenclature`](../../notes/Recherches/Plugin%20Architect/4%20Nomenclature/PLAN-IMPLEMENTATION.md).

Chaque système a son dossier :

- `sources/` : les fichiers publiés, figés à une version ou à un commit exact,
  avec l'extension `.txt` ;
- `noms.json` : le tableau trié des noms, `{ "nom", "type", "couche" }`.

`sources.json` donne, pour chaque fichier, l'URL, la version, le chemin
d'origine, le SHA-256 et la licence. `ucm/` contient les noms d'UCM au même format.

## Rejouer

```
node _outils/recuperer.mjs && node _outils/extraire.mjs
```

`recuperer.mjs` télécharge ce qui manque et vérifie le SHA-256 de chaque
fichier. `extraire.mjs` relit les fichiers figés et réécrit les `noms.json`
sans rien exécuter. Node 18 ou plus, aucune dépendance.

Trois outils servent plus rarement :

- `figer.mjs` change les versions : il liste, télécharge et recalcule
  `sources.json`.
- `mui-theme.mjs` installe `@mui/material` dans un dossier temporaire et
  relève les chemins de clés de `createTheme()`. MUI ne publie pas ses tokens
  dans un fichier, et ce script exécute le code du paquet : on le lance à la
  main.
- `ucm.mjs` écrit `ucm/noms.json` depuis l’instantané de la
  [vue illustrée multimarques](../../notes/Recherches/Archi%20Tokens%20Multi-marques/donnees-vue-illustree.js).
  Il relève les registres de vocabulaire et d’architecture du kit compilé dans
  `ucm/registres.json`. Depuis la racine du dépôt :

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

## Systèmes

| Dossier | Source et version | Licence | Noms | Couche | Anciennes collectes |
|---|---|---|---|---|---|
| `atlassian` | `@atlaskit/tokens` 20.6.1, `token-names.js` | Apache-2.0 | 611 | non | [Atlassian](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Atlassian), [Surfaces](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Surfaces/sources) |
| `carbon` | `@carbon/themes` 11.83.0 (DTCG), `@carbon/layout` 11.61.0, `@carbon/type` 11.69.0 | Apache-2.0 | 638 | oui, sauf layout et type | [Surfaces](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Surfaces/sources) |
| `spectrum` | `@adobe/spectrum-tokens` 15.6.0, `dist/json/variables.json` | Apache-2.0 | 2 572 | non | [Spectrum](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Spectrum) |
| `primer` | `@primer/primitives` 11.10.0, CSS `base`, `functional` et thème `light` | MIT | 1 192 | oui | [Surfaces](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Surfaces/sources) |
| `polaris` | `@shopify/polaris-tokens` 9.4.2, `dist/css/styles.css` | MIT | 452 | non | [Surfaces](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Surfaces/sources) |
| `material-3` | `@material/web` 2.5.0, jetons `v0_192` (`ref`, `sys`, `comp`) | Apache-2.0 | 3 446 | oui | [Surfaces](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Surfaces/sources), [Composants](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Composants) |
| `fluent-2` | `@fluentui/tokens` 1.0.0-alpha.24, `lib/alias` et `lib/global` | MIT | 1 045 | oui | [Surfaces](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Surfaces/sources) |
| `figma-sds` | `figma/sds` au commit `05525f7`, `src/theme.css` | MIT | 364 | oui, sauf les styles | [SDS](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/SDS) |
| `radix` | `@radix-ui/themes` 3.3.0, `tokens.css` | MIT | 1 068 | non | [Radix](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Radix) |
| `tailwind` | `tailwindcss` 4.3.3, `theme.css` | MIT | 419 | non | [Tailwind](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Tailwind) |
| `shadcn` | `shadcn-ui/ui` au commit `30a58d4`, `themes/neutral.json` | MIT | 24 | non | [Surfaces](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/Surfaces/sources) |
| `mui` | `@mui/material` 9.5.0, clés de `createTheme()` | MIT | 163 | non | [MUI](../../notes/Archives/Plugin%20Palettes/Recette%20CRITIQUE%20de%20qualit%C3%A9/Collecte/MUI) |
| `untitled-ui` | `untitleduico/react` au commit `1d410cb`, `styles/theme.css` | MIT | 379 | non | aucune |
| `ucm` | Instantané de la vue illustrée multimarques et registres du kit | propre au projet | 1 300 | primitives, sémantiques et composants | aucune |

Limites de ce qui est relevé :

- `ucm` garde les noms de l’instantané, y compris les formes antérieures aux
  registres actuels. La couche vient de la collection : `primitives`,
  `components`, ou sémantique pour les cinq autres. Le type est déduit des
  valeurs et des cibles d’alias dans chaque mode ; 24 valeurs absentes restent
  sans type. Les registres contiennent les formes retenues, sans renommer ces
  observations.
- `shadcn` ne compte que les variables du thème de base : les noms propres aux
  composants n'y sont pas.
- `mui` n'a pas de valeurs ni de couche. Les indices de tableaux sont retirés
  (`shadows.0` devient `shadows`), `components` n'est pas relevé.
- `fluent-2` garde le thème clair seul : les noms sont les mêmes dans les autres.
- `primer` ne relève que le thème `light` ; les noms des autres thèmes sont les mêmes.
- `spectrum` regroupe tous les niveaux dans un fichier que le système ne
  classe pas : la couche n'est donc pas donnée.

## Règles d'ajout

- N'enregistrer que des sources publiques sous licence libre, avec la licence
  copiée dans `sources/`.
- Figer une version exacte du paquet ou un commit exact, jamais `latest` ni une branche.
- Aucun fichier client ici, ni nom qui en dérive.
- Changer une version passe par `figer.mjs`, jamais par une édition à la main.

# Relevé de l'indicateur de focus des boutons et des champs

Cette collecte relève, dans dix systèmes, l'indicateur de focus clavier du bouton plein principal, d'un bouton secondaire ou à contour et du champ de saisie texte, en thème clair et en thème sombre quand le système en a un. Elle décrit des valeurs publiées et ne recommande rien à UCM. Elle ne relève pas à nouveau les systèmes déjà couverts : Untitled UI (kit Figma), Radix Themes, Fluent, Spectrum, Polaris, Primer, Carbon, Material 3 et le Simple Design System de Figma. Elle complète [`../RELEVE-STATUTS-ET-FOCUS.md`](../RELEVE-STATUTS-ET-FOCUS.md) et suit la méthode de [`../Surfaces/fetch.mjs`](../Surfaces/fetch.mjs).

## Reproduire

```
node Collecte/Focus/fetch.mjs              # télécharge, réécrit sources.json
node Collecte/Focus/extract.mjs            # relit sources/, réécrit focus.json
node Collecte/Focus/extract.mjs --tableau  # affiche en plus le tableau de résultats de ce document
```

`fetch.mjs` n'installe aucun paquet : il utilise le `fetch` de Node, prend chaque fichier à une version npm épinglée (jsdelivr) ou à une révision GitHub épinglée, l'écrit dans `sources/` avec l'extension `.txt` ajoutée et consigne dans `sources.json` l'URL, la version, le chemin d'origine, le fichier local et le SHA-256. Une seconde exécution donne un `sources.json` identique à l'octet près.

`extract.mjs` relit ces fichiers sans exécuter aucun code téléchargé (lecture par motifs, blocs CSS, objets JavaScript lus comme du texte). Il refuse de s'exécuter si un SHA-256 ne correspond pas, et s'arrête si une règle attendue (classe de focus, déclaration de bloc, rôle de token) n'est plus dans le fichier source. Une seconde exécution donne un `focus.json` identique à l'octet près.

## Versions figées

| Système | Fichiers | Version ou révision |
|---|---|---|
| Bootstrap | `dist/css/bootstrap.css`, `scss/_variables.scss`, `scss/_variables-dark.scss`, `scss/_buttons.scss`, `scss/forms/_form-control.scss` | `bootstrap@5.3.8` |
| Flowbite | `content/components/buttons.md`, `content/components/forms.md`, `src/themes/default.css`, `plugin.js` | `themesberg/flowbite` révision `752fb715d35d8dda44bfbe22707fb4135e959276` (étiquette `v4.0.2`) |
| Tailwind (palette de Flowbite et d'Untitled UI React) | `theme.css` | `tailwindcss@4.3.3` |
| shadcn/ui | `apps/v4/registry/new-york-v4/ui/button.tsx`, `input.tsx`, `apps/v4/app/globals.css` | `shadcn-ui/ui` révision `30a58d4498f270af1c1e981a7d78a15cf5740841` (celle de `../Surfaces`) |
| Chakra UI | `dist/esm/theme/recipes/button.js`, `input.js`, `theme/semantic-tokens/colors.js`, `theme/tokens/colors.js`, `theme/global-css.js`, `preset-base.js` | `@chakra-ui/react@3.37.0` |
| Mantine | `styles.css`, `esm/core/styles-api/.../get-global-class-names.mjs`, `esm/core/MantineProvider/default-theme.mjs`, `default-variant-colors-resolver.mjs`, `esm/components/UnstyledButton/UnstyledButton.mjs` | `@mantine/core@7.17.8` (dernière 7.x) |
| Ant Design | `es/style/index.js`, `es/button/style/index.js`, `es/input/style/token.js`, `variants.js`, `es/theme/util/alias.js`, `es/theme/themes/seed.js`, `default/` et `dark/` (`colors.js`, `colorAlgorithm.js`), `shared/genColorMapToken.js`, `dark/index.js` | `antd@5.29.3` (dernière 5.x) |
| Ant Design (palettes) | `es/generate.js`, `es/presets.js`; `es/FastColor.js` | `@ant-design/colors@7.2.1`, `@ant-design/fast-color@2.0.6` (dépendances de `antd@5.29.3`) |
| Material UI | `Button/Button.js`, `ButtonBase/ButtonBase.js`, `ButtonBase/TouchRipple.js`, `OutlinedInput/OutlinedInput.js`, `styles/createPalette.js`, `styles/shadows.js`, `colors/blue.js`, `colors/common.js` | `@mui/material@7.3.11` (dernière 7.x) |
| Untitled UI React | `components/base/buttons/button.tsx`, `components/base/input/input.tsx`, `styles/theme.css`, `styles/globals.css` | `untitleduico/react` révision `1d410cb8facde8d50869e7bbb5f3d048e2267466` (tête de `main` à la collecte) |
| Atlassian | `new-button/variants/shared/button-base.js` et `.compiled.css`, `default/button.js`, `package.json` | `@atlaskit/button@25.4.7` |
| Atlassian | `text-field.js`, `text-field.compiled.css` | `@atlaskit/textfield@10.2.6` |
| Atlassian | `artifacts/themes/atlassian-light.js`, `atlassian-dark.js` | `@atlaskit/tokens@20.4.1` |
| Atlassian | `dist/bundle.css`; `dist/cjs/focus-ring.js` | `@atlaskit/css-reset@8.4.6`, `@atlaskit/focus-ring@6.0.0` |
| GOV.UK Frontend | `components/button/_mixin.scss`, `_settings.scss`, `components/input/_mixin.scss`, `helpers/_focused.scss`, `settings/_colours-functional.scss`, `_colours-palette--internal.scss`, `_measurements.scss` | `govuk-frontend@6.5.1` |

Les versions retenues sont les dernières publiées de la ligne demandée : Bootstrap 5.3.x, Mantine 7.x, Ant Design 5.x, Material UI 6 ou 7, Flowbite et Chakra en dernière version. Mantine, Ant Design et Material UI ont des lignes plus récentes (9.x, 6.x et 9.x) qui ne sont pas relevées. Les licences des paquets qui en portent une à la racine sont dans `sources/` (`*-licence*`).

## Ce qui est relevé

Pour chaque système : le bouton plein principal, un bouton secondaire ou à contour, le champ de saisie texte. Les noms de variantes diffèrent d'un système à l'autre ; le tableau donne la variante lue.

- Bootstrap : `btn-primary`, `btn-outline-primary`, `form-control`.
- Flowbite : `Default`, `Secondary` (nom de ce que les versions antérieures appelaient « Alternative »), `Outline Brand`, `form` « Base Input ». Les classes `focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800` n'apparaissent plus que dans les boutons en dégradé : le bouton `Gradient monochrome Blue` est relevé à part.
- shadcn/ui : `default`, `outline`, `Input`.
- Chakra UI : `solid` et `outline` avec la palette `gray`, qui est celle du thème par défaut (`colorPalette: "gray"` dans `global-css.js`), et `solid` et champ avec la palette `blue`, la plus courante dans les exemples.
- Mantine : `filled` (défaut), `default`, `TextInput` en variante `default`.
- Ant Design : `primary`, `default`, `Input` outlined.
- Material UI : `contained`, `outlined`, `OutlinedInput`.
- Untitled UI React : `primary`, `secondary`, `Input`.
- Atlassian : `appearance` primary et default, `Textfield` standard.
- GOV.UK : `govuk-button`, `govuk-button--secondary`, `govuk-input`.

Pour chaque composant, `focus.json` donne par thème (`light`, `dark`, ou `null` sans thème sombre) :

- `fondPage` et `fondComposant` : valeur publiée, hexa opaque, source (fichier et ligne). Le fond de page est celui que le système déclare pour le thème (`--bs-body-bg`, `--background`, `bg.DEFAULT`, `--mantine-color-body`, `palette.background.default`, `--ds-surface`, `--color-neutral-primary`, `bg-primary`). Il vaut `#ffffff` dans tous les thèmes clairs. Dark : Bootstrap `#212529`, Flowbite `#030712`, shadcn/ui `#0a0a0a`, Untitled UI React `#0a0a0a`, Chakra `#09090b`, Mantine `#242424`, Ant Design `#141414`, Material UI `#121212`, Atlassian `#1f1f21`.
- `couches` : chaque élément visible de l'indicateur (halo, trait, bordure, remplissage, ombre, ondulation), avec `valeurPubliee`, `couleurResolue`, `alpha` et `composeSur` si la couleur est translucide, `hexCompose`, `epaisseurPx`, `decalagePx`, `recouvre` (`page` ou `composant`), `contrasteAvecPage`, `contrasteAvecComposant` et `source`.
- `geometrie` : type, épaisseur, décalage de la couche principale (0 : collé ; positif : espace entre le composant et le trait ; négatif : à l'intérieur du bord), `position` (extérieur ou intérieur), `colle`, et `bordureComposant` (ce que devient la bordure du composant au focus).
- `principal`, `contrasteAvecPage`, `contrasteAvecComposant`, `pale`, `colleEtPale`, `autreCoucheNette`.

## Valeurs calculées

Les calculs sont faits par `extract.mjs`. Aucune valeur calculée n'est présentée comme publiée.

- Contraste : WCAG 2, luminance relative standard, arrondi à 0,01. Contrôle de la fonction : noir sur blanc donne 21,00.
- Couleur translucide : composée sur le fond qu'elle recouvre. Un halo ou un trait posé hors du composant se compose sur la page ; une bordure, un anneau intérieur ou une ondulation se compose sur le fond du composant (`recouvre`). Un fond de composant translucide (shadcn/ui en thème sombre) se compose d'abord sur la page.
- oklch (Tailwind, shadcn/ui) : converti en sRGB, arrondi à 8 bits.
- `principal` : indice de la couche qui sert d'indicateur, la plus extérieure, sinon la plus marquante. Les autres couches restent dans `couches` avec leurs contrastes.
- `pale` : vrai si la couche principale contraste à moins de 3:1 avec le fond de page.
- `colleEtPale` : vrai si la couche principale est hors du composant, sans décalage (0), et pâle.
- `autreCoucheNette` : vrai si une autre couche (bordure qui change de couleur, trait intérieur, ombre) atteint 3:1 contre la page.
- Bootstrap : au focus-visible, la règle applique le fond du survol (`--bs-btn-hover-bg`) ; le fond du composant retenu est celui-là. Le contraste du halo contre le fond au repos du bouton plein est dans `remarques`.
- Ant Design en thème sombre : les palettes ne sont pas publiées sous forme de liste. `extract.mjs` porte la fonction `generate` de `@ant-design/colors@7.2.1` et les conversions de `@ant-design/fast-color@2.0.6`, lues dans `sources/`, sans exécuter le code téléchargé. Le port est contrôlé sur la palette claire de `#1677ff` : elle doit égaler les dix valeurs de la liste `blue` publiée dans `presets.js`, sinon le script s'arrête. `controlOutline` est recalculé comme `alpha.js` le fait (`getAlphaColor`), puis composé sur `colorBgContainer`. Pour Ant Design, le fond de page retenu est `colorBgContainer` (`#ffffff` et `#141414`) : les composants s'y posent, alors que `colorBgLayout` vaut `#f5f5f5` en clair et `#000000` en sombre.
- Mantine : le thème sombre applique `primaryShade: { light: 6, dark: 8 }` (lu dans `default-theme.mjs`) ; la couleur du trait passe de `#228be6` à `#1971c2`.

## Résultats

Colonnes : couche principale (rôle, épaisseur, décalage) ; pour Light puis Dark, la couleur composée de la couche principale et les contrastes contre le fond de page puis contre le composant ; pour chaque thème, la lecture (`pâle`, `net` : 3:1 contre la page ; `collé` ; `autre couche nette`).

| Système | Composant (variante) | Couche principale (Light) | Light : couleur, page / composant | Dark : couleur, page / composant | Lecture |
|---|---|---|---|---|---|
| Bootstrap | bouton plein principal (btn-primary) | halo, 4 px, décalage 0 | #98c2fe, 1.83 / 3.19 | #295593, 2.07 / 1.28 | Light : pâle, collé ; Dark : pâle, collé |
| Bootstrap | bouton à contour (btn-outline-primary) | halo, 4 px, décalage 0 | #86b7fe, 2.06 / 2.19 | #174a93, 1.79 / 1.91 | Light : pâle, collé ; Dark : pâle, collé |
| Bootstrap | champ de saisie (form-control) | halo, 4 px, décalage 0 | #c3dbff, 1.41 / 1.41 | #1c375e, 1.29 / 1.29 | Light : pâle, collé ; Dark : pâle, collé, autre couche nette |
| Flowbite | bouton plein principal (Default, bg-brand) | halo, 4 px, décalage 0 | #bedbff, 1.42 / 4.8 | #1c398e, 1.94 / 1.98 | Light : pâle, collé ; Dark : pâle, collé |
| Flowbite | bouton secondaire (Secondary) | halo, 4 px, décalage 0 | #f3f4f6, 1.1 / 1.05 | #1e2939, 1.37 / 1 | Light : pâle, collé ; Dark : pâle, collé |
| Flowbite | bouton à contour (Outline Brand) | halo, 4 px, décalage 0 | #bedbff, 1.42 / 1.42 | #1c398e, 1.94 / 1.94 | Light : pâle, collé ; Dark : pâle, collé |
| Flowbite | bouton plein principal (Gradient monochrome Blue, blue-300 puis dark blue-800) | halo, 4 px, décalage 0 | #8ec5ff, 1.81 / 2.89 | #193cb8, 2.28 / 1.68 | Light : pâle, collé ; Dark : pâle, collé |
| Flowbite | champ de saisie (Base Input) | halo, 1 px, décalage 0 | #1447e6, 6.83 / 6.54 | #155dfc, 3.84 / 2.8 | Light : net, autre couche nette ; Dark : net, autre couche nette |
| shadcn/ui (new-york v4) | bouton plein principal (default) | halo, 3 px, décalage 0 | #d0d0d0, 1.54 / 13.62 | #3f3f3f, 1.88 / 8.36 | Light : pâle, collé ; Dark : pâle, collé |
| shadcn/ui (new-york v4) | bouton à contour (outline) | halo, 3 px, décalage 0 | #d0d0d0, 1.54 / 1.54 | #3f3f3f, 1.88 / 1.73 | Light : pâle, collé ; Dark : pâle, collé, autre couche nette |
| shadcn/ui (new-york v4) | champ de saisie (Input) | halo, 3 px, décalage 0 | #d0d0d0, 1.54 / 1.54 | #3f3f3f, 1.88 / 1.73 | Light : pâle, collé ; Dark : pâle, collé, autre couche nette |
| Untitled UI React | bouton plein principal (primary) | trait, 2 px, décalage 2 | #9e77ed, 3.33 / 1.49 | #b692f6, 7.95 / 1.99 | Light : net ; Dark : net |
| Untitled UI React | bouton secondaire (secondary) | trait, 2 px, décalage 2 | #9e77ed, 3.33 / 3.33 | #b692f6, 7.95 / 7.95 | Light : net ; Dark : net |
| Untitled UI React | champ de saisie (Input) | trait intérieur, 2 px, décalage 0 | #9e77ed, 3.33 / 3.33 | #b692f6, 7.95 / 7.95 | Light : net ; Dark : net |
| Chakra UI | bouton plein principal (solid, palette gray par défaut) | trait, 2 px, décalage 2 | #a1a1aa, 2.56 / 6.91 | #a1a1aa, 7.76 / 2.56 | Light : pâle ; Dark : net |
| Chakra UI | bouton plein principal (solid, palette blue) | trait, 2 px, décalage 2 | #3b82f6, 3.68 / 1.41 | #3b82f6, 5.41 / 1.41 | Light : net ; Dark : net |
| Chakra UI | bouton à contour (outline, palette gray) | trait, 2 px, décalage 2 | #a1a1aa, 2.56 / 2.56 | #a1a1aa, 7.76 / 7.76 | Light : pâle ; Dark : net |
| Chakra UI | champ de saisie (outline, palette gray) | trait, 1 px, décalage 0 | #a1a1aa, 2.56 / 2.56 | #a1a1aa, 7.76 / 7.76 | Light : pâle, collé ; Dark : net, autre couche nette |
| Chakra UI | champ de saisie (outline, palette blue) | trait, 1 px, décalage 0 | #3b82f6, 3.68 / 3.68 | #3b82f6, 5.41 / 5.41 | Light : net, autre couche nette ; Dark : net, autre couche nette |
| Mantine | bouton plein principal (filled) | trait, 2 px, décalage 2 | #228be6, 3.56 / 1 | #1971c2, 3.09 / 1 | Light : net ; Dark : net |
| Mantine | bouton secondaire (default) | trait, 2 px, décalage 2 | #228be6, 3.56 / 3.56 | #1971c2, 3.09 / 2.7 | Light : net ; Dark : net |
| Mantine | champ de saisie (TextInput default) | bordure, 1 px, décalage 0 | #228be6, 3.56 / 3.56 | #1971c2, 3.09 / 2.7 | Light : net ; Dark : net |
| Ant Design | bouton plein principal (primary) | trait, 3 px, décalage 1 | #91caff, 1.74 / 2.36 | #15325b, 1.44 / 2.47 | Light : pâle ; Dark : pâle |
| Ant Design | bouton secondaire (default) | trait, 3 px, décalage 1 | #91caff, 1.74 / 1.74 | #15325b, 1.44 / 1.44 | Light : pâle ; Dark : pâle |
| Ant Design | champ de saisie (Input outlined) | halo, 2 px, décalage 0 | #e6f4ff, 1.12 / 1.12 | #15325b, 1.44 / 1.44 | Light : pâle, collé, autre couche nette ; Dark : pâle, collé, autre couche nette |
| Material UI | bouton plein principal (contained) | ondulation intérieure | #5e9fe0, 2.8 / 1.65 | #6a95b8, 5.89 / 1.82 | Light : pâle ; Dark : net |
| Material UI | bouton à contour (outlined) | ondulation intérieure | #bad6f2, 1.5 / 1.5 | #384957, 2.02 / 2.02 | Light : pâle ; Dark : pâle |
| Material UI | champ de saisie (OutlinedInput) | bordure, 2 px, décalage 0 | #1976d2, 4.6 / 4.6 | #90caf9, 10.71 / 10.71 | Light : net ; Dark : net |
| Atlassian | bouton plein principal (primary) | non lisible dans le paquet publié | | | |
| Atlassian | bouton secondaire (default) | non lisible dans le paquet publié | | | |
| Atlassian | champ de saisie (Textfield standard) | bordure, 1 px, décalage 0 | #4688ec, 3.5 / 3.5 | #8fb8f6, 8.11 / 7.56 | Light : net, autre couche nette ; Dark : net, autre couche nette |
| Atlassian | anneau de référence de `@atlaskit/focus-ring` (non appliqué au bouton) | trait, 2 px, décalage 2 | #4688ec, 3.5 / 3.5 | #8fb8f6, 8.11 / 8.11 | Light : net ; Dark : net |
| GOV.UK Frontend | bouton plein principal (govuk-button, vert) | remplissage jaune | #ffdd00, 1.35 / 3.97 | sans thème sombre | Light : pâle, autre couche nette |
| GOV.UK Frontend | bouton secondaire (govuk-button--secondary) | remplissage jaune | #ffdd00, 1.35 / 1.21 | sans thème sombre | Light : pâle, autre couche nette |
| GOV.UK Frontend | champ de saisie (govuk-input) | trait, 3 px, décalage 0 | #ffdd00, 1.35 / 1.35 | sans thème sombre | Light : pâle, collé, autre couche nette |

## Systèmes qui emploient un halo pâle collé

Un halo collé est un `box-shadow` étendu ou un `ring` Tailwind, sans décalage, posé hors du composant. Quatre systèmes sur les dix en emploient un.

| Système | Composants | Halo (Light) | Contraste Light, page / composant | Contraste Dark, page / composant |
|---|---|---|---|---|
| Bootstrap | bouton plein, bouton à contour, champ | `rgba(49,132,253,.5)` sur le bouton plein et `rgba(13,110,253,.5)` sur le contour, 4 px ; `rgba(13,110,253,.25)`, 4 px, sur le champ | 1.83 / 3.19 (plein), 2.06 / 2.19 (contour), 1.41 / 1.41 (champ) | 2.07 / 1.28, 1.79 / 1.91, 1.29 / 1.29 |
| Flowbite | bouton plein, secondaire, contour, plein en dégradé | `ring-4` : `blue-200` (plein et contour), `gray-100` (secondaire), `blue-300` (dégradé) | 1.42 / 4.8, 1.1 / 1.05, 1.42 / 1.42, 1.81 / 2.89 | 1.94 / 1.98, 1.37 / 1, 1.94 / 1.94, 2.28 / 1.68 |
| shadcn/ui | bouton plein, bouton à contour, champ | `ring-[3px] ring-ring/50`, `--ring` à 50 % | 1.54 / 13.62 (plein), 1.54 / 1.54 (contour et champ) | 1.88 / 8.36 (plein), 1.88 / 1.73 (contour et champ) |
| Ant Design | champ seul | `0 0 0 2px controlOutline`, soit `#e6f4ff` composé | 1.12 / 1.12 | 1.44 / 1.44 |

Lecture, par système :

- Bootstrap : le halo est la seule couche en Light pour les boutons. Sur le champ, la bordure passe à `#86b7fe`, qui contraste à 2.06 avec la page en Light et à 7.51 en Dark.
- Flowbite : le champ n'emploie pas ce style. Il pose un anneau de 1 px et une bordure de 1 px, tous deux en `brand` (`blue-700`, 6.83 contre la page en Light ; `blue-600`, 3.84 en Dark).
- shadcn/ui : sur le bouton `outline` et sur le champ, la bordure passe à `--ring` (`#a1a1a1` en Light, 2.58 contre la page ; `#737373` en Dark, 4.18). Le bouton `default` n'a pas de bordure.
- Ant Design : la bordure du champ passe à `colorPrimary` (`#1677ff`, 4.10 contre la page en Light ; `#1668dc`, 3.55 en Dark). Le halo seul est pâle ; l'ensemble est net. Les boutons d'Ant Design emploient un trait de 3 px détaché de 1 px (`#91caff`, 1.74 ; `#15325b` en Dark, 1.44).

Autres formes relevées, qui ne sont pas des halos collés :

- Trait détaché (décalage 2 px) : Untitled UI React (3.33 en Light), Chakra (palette `gray` : 2.56 en Light, `blue` : 3.68), Mantine (3.56 et 3.09), Atlassian (`FocusRing` de référence : 3.5).
- Trait collé de 1 px sur un champ : Chakra (`gray.400` : 2.56 en Light, pâle ; 7.76 en Dark) et GOV.UK (jaune `#ffdd00`, 1.35, doublé par une bordure noire de 2 px à 19.59).
- Bordure seule : Mantine (3.56 et 3.09), Material UI (4.6 et 10.71), Atlassian (3.5 et 8.11).
- Ondulation intérieure : Material UI sur les boutons, avec une ombre noire translucide en plus sur `contained`.
- Remplissage : GOV.UK, où le bouton prend le fond jaune, avec une ombre noire de 2 px dessous (19.59 contre la page).

## Limites

- Aucun rendu dans un navigateur : les contrastes sont calculés sur les hexa lus, pas mesurés sur des pixels. Les compositions de couleurs translucides supposent un fond uni.
- Pour une couche posée sur le composant (ondulation de Material UI), le contraste contre la page ne décrit pas la visibilité ; la colonne contre le composant la décrit. L'ondulation de `contained` contraste à 1.65 contre le fond du bouton en Light. L'ombre `shadows[6]` du bouton `contained` (trois ombres noires translucides) n'est pas évaluée en contraste.
- Atlassian : `@atlaskit/button@25.4.7` ne publie aucune règle de focus. Le CSS compilé contient une seule règle `:focus-visible`, `z-index:100` du bouton scindé, et aucun `outline`. Le paquet déclare `@atlaskit/focus-ring` en dépendance sans l'importer dans `button-base.js` ni dans `button.js`. `@atlaskit/css-reset` cible le lien (`a:focus-visible`) et non le bouton. L'anneau relevé pour `@atlaskit/focus-ring` est celui du composant utilitaire, pas celui du bouton. Il n'est pas inventé pour le bouton.
- Untitled UI React : `theme.css` ne définit pas la palette neutre ; `bg-primary` en Dark vaut `--color-neutral-950`, lue dans `tailwindcss@4.3.3` faute de savoir quelle version de Tailwind le dépôt installe. Le dépôt ne porte pas de fichier de licence dans les chemins relevés.
- Flowbite : l'anneau de 1 px du champ vient de la base de formulaire de `plugin.js` (`calc(1px + var(--tw-ring-offset-width))`), à laquelle les classes `focus:ring-brand` et `focus:border-brand` ne changent que la couleur. Cette composition n'est pas vérifiée dans un CSS compilé.
- shadcn/ui : les variables `--ring`, `--primary`, `--input` et `--background` viennent de `globals.css` à la révision épinglée, thème de base `neutral`. Les autres jeux de couleur de base ne sont pas relevés.
- Chakra UI : l'option `inside` de `focusVisibleRing` pose un outline de 1 px à décalage 0 ; en CSS, il se dessine contre le bord extérieur de la bordure, et le relevé le classe en trait collé extérieur. La couleur de la bordure du champ prend la même valeur.
- Mantine : le fond du bouton `default` vient de `default-variant-colors-resolver.mjs` (`--mantine-color-default`). Le fond du bouton `filled` vient de `styles.css` (`--button-bg` avec repli sur `--mantine-primary-color-filled`). Un thème qui change `focusRing` ou `primaryShade` change le relevé.
- Ant Design : les couleurs du thème sombre sont calculées par le port décrit plus haut ; elles ne sont pas recoupées avec une liste publiée. Le thème par défaut est relevé, sans algorithme compact ni jeton personnalisé.
- GOV.UK : pas de thème sombre dans le paquet. Le bouton change de fond au focus (jaune) ; l'ensemble n'est donc pas un halo.
- Material UI : la ligne 7.x est relevée ; la 9.x ne l'est pas. Le focus d'un bouton `contained` repose sur une animation (`pulsate`) dont seule l'opacité de départ (0,3) est lue.
- Licences : les fichiers `*-licence*` de `sources/` couvrent Bootstrap, Flowbite, Tailwind, shadcn/ui, Chakra, Ant Design et Material UI. Mantine, GOV.UK, Atlassian et Untitled UI React n'en ont pas dans les chemins téléchargés.

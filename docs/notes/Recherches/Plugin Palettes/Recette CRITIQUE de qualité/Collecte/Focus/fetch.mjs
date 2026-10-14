/**
 * Télécharge les sources des indicateurs de focus (bouton plein, bouton
 * secondaire ou à contour, champ de saisie) de dix systèmes.
 * Chaque fichier est pris à une version npm épinglée (jsdelivr) ou à une
 * révision GitHub épinglée (raw.githubusercontent), rangé sous `sources/` avec
 * l'extension `.txt` ajoutée, puis décrit dans `sources.json` (URL, version,
 * chemin d'origine, fichier local, SHA-256).
 * Usage : node Collecte/Focus/fetch.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const npm = (paquet, version, fichiers) =>
  Object.entries(fichiers).map(([id, chemin]) => ({
    id,
    url: `https://cdn.jsdelivr.net/npm/${paquet}@${version}/${chemin}`,
    revision: `${paquet}@${version}`,
    originalPath: chemin,
  }));

const github = (depot, revision, fichiers) =>
  Object.entries(fichiers).map(([id, chemin]) => ({
    id,
    url: `https://raw.githubusercontent.com/${depot}/${revision}/${chemin}`,
    revision: `${depot}@${revision}`,
    originalPath: chemin,
  }));

const flowbiteRevision = '752fb715d35d8dda44bfbe22707fb4135e959276'; // étiquette v4.0.2
const shadcnRevision = '30a58d4498f270af1c1e981a7d78a15cf5740841'; // même révision que Collecte/Surfaces
const untitledRevision = '1d410cb8facde8d50869e7bbb5f3d048e2267466'; // tête de la branche main au moment de la collecte

const cibles = [
  // 1. Bootstrap 5.3 (dernière 5.3.x)
  ...npm('bootstrap', '5.3.8', {
    bootstrapCss: 'dist/css/bootstrap.css',
    bootstrapVariables: 'scss/_variables.scss',
    bootstrapVariablesDark: 'scss/_variables-dark.scss',
    bootstrapButtons: 'scss/_buttons.scss',
    bootstrapFormControl: 'scss/forms/_form-control.scss',
    bootstrapLicence: 'LICENSE',
  }),

  // 2. Flowbite (themesberg/flowbite, dernière version publiée) et sa palette Tailwind
  ...github('themesberg/flowbite', flowbiteRevision, {
    flowbiteButtons: 'content/components/buttons.md',
    flowbiteForms: 'content/components/forms.md',
    flowbiteTheme: 'src/themes/default.css',
    flowbitePlugin: 'plugin.js',
    flowbiteLicence: 'LICENSE.md',
  }),
  ...npm('tailwindcss', '4.3.3', {
    tailwindTheme: 'theme.css',
    tailwindLicence: 'LICENSE',
  }),

  // 3. shadcn/ui (registre new-york v4)
  ...github('shadcn-ui/ui', shadcnRevision, {
    shadcnButton: 'apps/v4/registry/new-york-v4/ui/button.tsx',
    shadcnInput: 'apps/v4/registry/new-york-v4/ui/input.tsx',
    shadcnGlobals: 'apps/v4/app/globals.css',
    shadcnLicence: 'LICENSE.md',
  }),

  // 4. Chakra UI v3
  ...npm('@chakra-ui/react', '3.37.0', {
    chakraButton: 'dist/esm/theme/recipes/button.js',
    chakraInput: 'dist/esm/theme/recipes/input.js',
    chakraSemanticColors: 'dist/esm/theme/semantic-tokens/colors.js',
    chakraColors: 'dist/esm/theme/tokens/colors.js',
    chakraPresetBase: 'dist/esm/preset-base.js',
    chakraGlobalCss: 'dist/esm/theme/global-css.js',
    chakraLicence: 'LICENSE',
  }),

  // 5. Mantine v7
  ...npm('@mantine/core', '7.17.8', {
    mantineStyles: 'styles.css',
    mantineGlobalClassNames:
      'esm/core/styles-api/use-styles/get-class-name/get-global-class-names/get-global-class-names.mjs',
    mantineDefaultTheme: 'esm/core/MantineProvider/default-theme.mjs',
    mantineUnstyledButton: 'esm/components/UnstyledButton/UnstyledButton.mjs',
    mantineVariantResolver:
      'esm/core/MantineProvider/color-functions/default-variant-colors-resolver/default-variant-colors-resolver.mjs',
  }),

  // 6. Ant Design v5
  ...npm('antd', '5.29.3', {
    antdStyle: 'es/style/index.js',
    antdButtonStyle: 'es/button/style/index.js',
    antdInputToken: 'es/input/style/token.js',
    antdInputVariants: 'es/input/style/variants.js',
    antdAlias: 'es/theme/util/alias.js',
    antdSeed: 'es/theme/themes/seed.js',
    antdGenColorMap: 'es/theme/themes/shared/genColorMapToken.js',
    antdLightColors: 'es/theme/themes/default/colors.js',
    antdLightAlgorithm: 'es/theme/themes/default/colorAlgorithm.js',
    antdDarkColors: 'es/theme/themes/dark/colors.js',
    antdDarkAlgorithm: 'es/theme/themes/dark/colorAlgorithm.js',
    antdDarkIndex: 'es/theme/themes/dark/index.js',
    antdLicence: 'LICENSE',
  }),
  ...npm('@ant-design/colors', '7.2.1', {
    antColorsGenerate: 'es/generate.js',
    antColorsPresets: 'es/presets.js',
  }),
  ...npm('@ant-design/fast-color', '2.0.6', {
    antFastColor: 'es/FastColor.js',
  }),

  // 7. Material UI v7
  ...npm('@mui/material', '7.3.11', {
    muiButton: 'Button/Button.js',
    muiButtonBase: 'ButtonBase/ButtonBase.js',
    muiTouchRipple: 'ButtonBase/TouchRipple.js',
    muiOutlinedInput: 'OutlinedInput/OutlinedInput.js',
    muiCreatePalette: 'styles/createPalette.js',
    muiBlue: 'colors/blue.js',
    muiCommon: 'colors/common.js',
    muiShadows: 'styles/shadows.js',
    muiLicence: 'LICENSE',
  }),

  // 8. Untitled UI React
  ...github('untitleduico/react', untitledRevision, {
    untitledButton: 'components/base/buttons/button.tsx',
    untitledInput: 'components/base/input/input.tsx',
    untitledTheme: 'styles/theme.css',
    untitledGlobals: 'styles/globals.css',
  }),

  // 9. Atlassian
  ...npm('@atlaskit/button', '25.4.7', {
    atlaskitButtonBase: 'dist/cjs/new-button/variants/shared/button-base.js',
    atlaskitButtonBaseCss: 'dist/cjs/new-button/variants/shared/button-base.compiled.css',
    atlaskitButtonDefault: 'dist/cjs/new-button/variants/default/button.js',
    atlaskitButtonPackage: 'package.json',
  }),
  ...npm('@atlaskit/textfield', '10.2.6', {
    atlaskitTextfield: 'dist/cjs/text-field.js',
    atlaskitTextfieldCss: 'dist/cjs/text-field.compiled.css',
  }),
  ...npm('@atlaskit/tokens', '20.4.1', {
    atlaskitLight: 'dist/cjs/artifacts/themes/atlassian-light.js',
    atlaskitDark: 'dist/cjs/artifacts/themes/atlassian-dark.js',
  }),
  ...npm('@atlaskit/css-reset', '8.4.6', {
    atlaskitCssReset: 'dist/bundle.css',
  }),
  ...npm('@atlaskit/focus-ring', '6.0.0', {
    atlaskitFocusRing: 'dist/cjs/focus-ring.js',
  }),

  // 10. GOV.UK Frontend
  ...npm('govuk-frontend', '6.5.1', {
    govukButtonMixin: 'dist/govuk/components/button/_mixin.scss',
    govukButtonSettings: 'dist/govuk/components/button/_settings.scss',
    govukInputMixin: 'dist/govuk/components/input/_mixin.scss',
    govukFocused: 'dist/govuk/helpers/_focused.scss',
    govukFunctionalColours: 'dist/govuk/settings/_colours-functional.scss',
    govukPalette: 'dist/govuk/settings/_colours-palette--internal.scss',
    govukMeasurements: 'dist/govuk/settings/_measurements.scss',
  }),
];

/** Nom de fichier local : `<id minuscule-tirets>.<extension d'origine>.txt`. */
const nomLocal = (cible) => {
  const base = cible.originalPath.split('/').pop();
  const extension = base.includes('.') ? base.slice(base.lastIndexOf('.') + 1) : 'txt';
  const id = cible.id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return `sources/${id}.${extension === 'txt' ? '' : extension + '.'}txt`.replace('..', '.');
};

await mkdir(new URL('./sources/', import.meta.url), { recursive: true });
const sources = [];
for (const cible of cibles) {
  const reponse = await fetch(cible.url);
  if (!reponse.ok) throw new Error(`${reponse.status} ${cible.url}`);
  const contenu = Buffer.from(await reponse.arrayBuffer());
  const localFile = nomLocal(cible);
  await writeFile(new URL(localFile, import.meta.url), contenu);
  sources.push({
    id: cible.id,
    url: cible.url,
    revision: cible.revision,
    originalPath: cible.originalPath,
    localFile,
    sha256: createHash('sha256').update(contenu).digest('hex'),
  });
}
await writeFile(new URL('./sources.json', import.meta.url), JSON.stringify(sources, null, 2) + '\n');
console.log(`${sources.length} sources téléchargées.`);

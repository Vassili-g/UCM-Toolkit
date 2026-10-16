/**
 * Télécharge les sources des composants à surface colorée (badge, alerte en
 * ligne, bouton teinté, bouton plein) qui manquaient aux relevés précédents.
 * Chaque fichier est pris à une version npm épinglée (jsdelivr) ou à une
 * révision GitHub épinglée (raw.githubusercontent), rangé sous `sources/` avec
 * l'extension `.txt` ajoutée, puis décrit dans `sources.json` (URL, version,
 * chemin d'origine, fichier local, SHA-256).
 *
 * Les fichiers déjà figés par `../Surfaces/` et `../Radix/` ne sont pas
 * retéléchargés : ils sont repris par chemin relatif, avec leur SHA-256 relu
 * sur disque, et marqués `reutilise`.
 *
 * Usage : node Collecte/Composants/fetch.mjs
 */
import { mkdir, writeFile, readFile } from 'node:fs/promises';
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

const revisionTremor = 'ca4d588f47820ff3d514d37fa4ee08a4222dec11';
const revisionSpectrum = '740c6c5c4a717ca8c82fc4d15d199f6166cd42dc';

const cibles = [
  // Radix Themes : les trois feuilles de composants
  ...npm('@radix-ui/themes', '3.3.0', {
    radixBadge: 'src/components/badge.css',
    radixCallout: 'src/components/callout.css',
    radixBaseButton: 'src/components/_internal/base-button.css',
  }),
  // Atlassian : composants (les tokens sont dans ../Surfaces/)
  ...npm('@atlaskit/lozenge', '17.0.5', {
    atlaskitLozengeCss: 'dist/esm/new/lozenge-base.compiled.css',
    atlaskitLozengeJs: 'dist/esm/new/lozenge-base.js',
    atlaskitLozengeIndex: 'dist/esm/lozenge.js',
    atlaskitLozengeLicence: 'LICENSE',
  }),
  ...npm('@atlaskit/section-message', '10.2.6', {
    atlaskitSectionMessageCss: 'dist/esm/section-message.compiled.css',
    atlaskitSectionMessageJs: 'dist/esm/section-message.js',
  }),
  ...npm('@atlaskit/button', '25.4.7', {
    atlaskitButtonCss: 'dist/esm/new-button/variants/shared/button-base.compiled.css',
    atlaskitButtonJs: 'dist/esm/new-button/variants/shared/button-base.js',
  }),
  // GitHub Primer : composants (les tokens sont dans ../Surfaces/)
  ...npm('@primer/react', '38.40.1', {
    primerLabelCss: 'dist/Label/Label-7904957c.css',
    primerFlashCss: 'dist/Flash/Flash-a3596568.css',
    primerButtonCss: 'dist/Button/ButtonBase-014fae23.css',
  }),
  // Fluent 2 : bouton (Badge et MessageBar sont dans ../Surfaces/) et rampe de marque web
  ...npm('@fluentui/react-button', '9.11.1', {
    fluentButtonStyles: 'lib/components/Button/useButtonStyles.styles.raw.js',
  }),
  ...npm('@fluentui/tokens', '1.0.0-alpha.24', {
    fluentBrandColors: 'lib/global/brandColors.js',
  }),
  // Material 3 : bouton tonal, bouton plein, chip d'assistance, couches d'état
  ...npm('@material/web', '2.5.0', {
    m3TonalButton: 'tokens/versions/v0_192/_md-comp-filled-tonal-button.scss',
    m3FilledButton: 'tokens/versions/v0_192/_md-comp-filled-button.scss',
    m3AssistChip: 'tokens/versions/v0_192/_md-comp-assist-chip.scss',
    m3SysState: 'tokens/versions/v0_192/_md-sys-state.scss',
  }),
  // Material UI : Chip, Alert, Button et la palette par défaut
  ...npm('@mui/material', '9.5.0', {
    muiAlert: 'Alert/Alert.js',
    muiChip: 'Chip/Chip.js',
    muiButton: 'Button/Button.js',
    muiPalette: 'styles/createPalette.js',
    muiBlue: 'colors/blue.js',
    muiRed: 'colors/red.js',
    muiLightBlue: 'colors/lightBlue.js',
    muiGreen: 'colors/green.js',
    muiOrange: 'colors/orange.js',
    muiCommon: 'colors/common.js',
    muiLicence: 'LICENSE',
  }),
  ...npm('@mui/system', '9.5.0', {
    muiColorManipulator: 'colorManipulator/colorManipulator.mjs',
  }),
  // Tailwind CSS 4 : palette (les classes de Tremor s'y résolvent)
  ...npm('tailwindcss', '4.1.3', {
    tailwindTheme: 'theme.css',
    tailwindLicence: 'LICENSE',
  }),
  // Tremor (code copié, licence Apache 2.0)
  ...github('tremorlabs/tremor', revisionTremor, {
    tremorBadge: 'src/components/Badge/Badge.tsx',
    tremorCallout: 'src/components/Callout/Callout.tsx',
    tremorButton: 'src/components/Button/Button.tsx',
    tremorCard: 'src/components/Card/Card.tsx',
    tremorLicence: 'LICENSE',
  }),
  // Spectrum 2 : Badge, InlineAlert, correspondance des noms, jetons
  ...github('adobe/react-spectrum', revisionSpectrum, {
    spectrumBadge: 'packages/@react-spectrum/s2/src/Badge.tsx',
    spectrumInlineAlert: 'packages/@react-spectrum/s2/src/InlineAlert.tsx',
    spectrumTheme: 'packages/@react-spectrum/s2/style/spectrum-theme.ts',
  }),
  ...npm('@adobe/spectrum-tokens', '14.15.0', {
    spectrumVariables: 'dist/json/variables.json',
  }),
];

/** Fichiers repris sans retéléchargement. */
const reutilises = [
  // ../Surfaces/ : lus dans leur sources.json (SHA-256 vérifié à la lecture)
  ...[
    'atlaskitLight', 'atlaskitDark', 'atlaskitTokenNames',
    'primerLight', 'primerDark',
    'polarisStyles', 'polarisTokensBuild', 'polarisBannerUtilities',
    'm3SysColor', 'm3RefPalette',
    'fluentLightColor', 'fluentDarkColor', 'fluentLightPalette', 'fluentDarkPalette',
    'fluentColors', 'fluentStatusMapping', 'fluentBadgeStyles', 'fluentMessageBarStyles',
    'fluentWebLightTheme', 'fluentWebDarkTheme',
  ].map((id) => ({ origine: '../Surfaces/', id })),
];
const reutilisesRadix = {
  radixBase: 'themes/base.css.txt',
  radixGray: 'themes/gray.css.txt',
  radixGreen: 'themes/green.css.txt',
  radixRed: 'themes/red.css.txt',
  radixAmber: 'themes/amber.css.txt',
  radixBlue: 'themes/blue.css.txt',
  radixGreenAlpha: 'colors/green-alpha.css.txt',
  radixRedAlpha: 'colors/red-alpha.css.txt',
  radixAmberAlpha: 'colors/amber-alpha.css.txt',
  radixBlueAlpha: 'colors/blue-alpha.css.txt',
  radixGreenDarkAlpha: 'colors/green-dark-alpha.css.txt',
  radixRedDarkAlpha: 'colors/red-dark-alpha.css.txt',
  radixAmberDarkAlpha: 'colors/amber-dark-alpha.css.txt',
  radixBlueDarkAlpha: 'colors/blue-dark-alpha.css.txt',
  radixGreenDark: 'colors/green-dark.css.txt',
  radixRedDark: 'colors/red-dark.css.txt',
  radixAmberDark: 'colors/amber-dark.css.txt',
  radixBlueDark: 'colors/blue-dark.css.txt',
};

/** Relevés Figma déjà produits (le fichier Community n'est pas téléchargeable ici). */
const reutilisesFigma = {
  figmaBadges: 'processed/components/badges.json',
  figmaComposants: 'processed/components/components-ui.json',
  figmaPalettes: 'processed/tokens/color-palettes.json',
};

/** Nom de fichier local : `sources/<id en minuscules et tirets>.<extension>.txt`. */
const nomLocal = (cible) => {
  const base = cible.originalPath.split('/').pop();
  const extension = base.includes('.') ? base.slice(base.lastIndexOf('.') + 1) : 'txt';
  const id = cible.id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return extension === 'txt' ? `sources/${id}.txt` : `sources/${id}.${extension}.txt`;
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

// Reprise des fichiers de ../Surfaces/
const surfaces = JSON.parse(await readFile(new URL('../Surfaces/sources.json', import.meta.url), 'utf8'));
const surfacesParId = Object.fromEntries(surfaces.map((s) => [s.id, s]));
for (const { id } of reutilises) {
  const s = surfacesParId[id];
  if (!s) throw new Error(`Source absente de ../Surfaces/sources.json : ${id}`);
  const brut = await readFile(new URL(`../Surfaces/${s.localFile}`, import.meta.url));
  const sha = createHash('sha256').update(brut).digest('hex');
  if (sha !== s.sha256) throw new Error(`SHA-256 différent dans ../Surfaces/ pour ${id}`);
  sources.push({ ...s, localFile: `../Surfaces/${s.localFile}`, reutilise: true });
}

// Reprise des feuilles de ../Radix/sources/ (paquets figés : themes 3.3.0, colors 3.0.0)
for (const [id, chemin] of Object.entries(reutilisesRadix)) {
  const brut = await readFile(new URL(`../Radix/sources/${chemin}`, import.meta.url));
  const colors = chemin.startsWith('colors/');
  sources.push({
    id,
    url: `https://cdn.jsdelivr.net/npm/${colors ? '@radix-ui/colors@3.0.0' : '@radix-ui/themes@3.3.0'}/`,
    revision: colors ? '@radix-ui/colors@3.0.0' : '@radix-ui/themes@3.3.0',
    originalPath: chemin.replace(/\.txt$/, ''),
    localFile: `../Radix/sources/${chemin}`,
    sha256: createHash('sha256').update(brut).digest('hex'),
    reutilise: true,
  });
}

// Reprise des relevés de ../Figma/ (kit Untitled UI, fichier Community figma.com/design/iJscFYgN97zFFr0i2XLeyf)
for (const [id, chemin] of Object.entries(reutilisesFigma)) {
  const brut = await readFile(new URL(`../Figma/${chemin}`, import.meta.url));
  sources.push({
    id,
    url: 'https://www.figma.com/design/iJscFYgN97zFFr0i2XLeyf/',
    revision: 'Untitled UI, kit gratuit et système de design v2.0 (Community)',
    originalPath: chemin,
    localFile: `../Figma/${chemin}`,
    sha256: createHash('sha256').update(brut).digest('hex'),
    reutilise: true,
  });
}

await writeFile(new URL('./sources.json', import.meta.url), JSON.stringify(sources, null, 2) + '\n');
console.log(`${cibles.length} sources téléchargées, ${sources.length - cibles.length} reprises.`);

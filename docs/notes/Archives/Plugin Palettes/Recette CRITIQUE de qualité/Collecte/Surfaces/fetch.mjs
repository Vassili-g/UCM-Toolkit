/**
 * Télécharge les sources des surfaces de support et des fonds de statut.
 * Chaque fichier est pris à une version npm épinglée (jsdelivr) ou à une
 * révision GitHub épinglée (raw.githubusercontent), rangé sous `sources/` avec
 * l'extension `.txt` ajoutée, puis décrit dans `sources.json` (URL, version,
 * chemin d'origine, fichier local, SHA-256).
 * Usage : node Collecte/Surfaces/fetch.mjs
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

const shadcnRevision = '30a58d4498f270af1c1e981a7d78a15cf5740841';
const github = (depot, revision, fichiers) =>
  Object.entries(fichiers).map(([id, chemin]) => ({
    id,
    url: `https://raw.githubusercontent.com/${depot}/${revision}/${chemin}`,
    revision,
    originalPath: chemin,
  }));

const cibles = [
  ...npm('@primer/primitives', '11.10.0', {
    primerLight: 'dist/css/functional/themes/light.css',
    primerDark: 'dist/css/functional/themes/dark.css',
    primerLicence: 'LICENSE',
  }),
  ...npm('@atlaskit/tokens', '20.4.1', {
    atlaskitLight: 'dist/cjs/artifacts/themes/atlassian-light.js',
    atlaskitDark: 'dist/cjs/artifacts/themes/atlassian-dark.js',
    atlaskitTokenNames: 'dist/cjs/artifacts/token-names.js',
    atlaskitLicence: 'LICENSE',
  }),
  ...npm('@carbon/themes', '11.83.0', {
    carbonWhite: 'js/generated/themes/white.js',
    carbonG10: 'js/generated/themes/g10.js',
    carbonG90: 'js/generated/themes/g90.js',
    carbonG100: 'js/generated/themes/g100.js',
    carbonNotificationTokens: 'scss/generated/_notification-tokens.scss',
    carbonLicence: 'LICENSE',
  }),
  ...npm('@carbon/styles', '1.117.0', {
    carbonInlineNotification: 'scss/components/notification/_inline-notification.scss',
  }),
  ...npm('@shopify/polaris-tokens', '9.4.2', {
    polarisTokensBuild: 'dist/cjs/build/index.js',
    polarisTokensLicence: 'LICENSE.md',
  }),
  ...npm('@shopify/polaris', '13.9.5', {
    polarisStyles: 'build/esm/styles.css',
    polarisBannerUtilities: 'build/esm/components/Banner/utilities.js',
  }),
  ...npm('@material/web', '2.5.0', {
    m3SysColor: 'tokens/versions/v0_192/_md-sys-color.scss',
    m3RefPalette: 'tokens/versions/v0_192/_md-ref-palette.scss',
    m3ElevatedCard: 'tokens/versions/v0_192/_md-comp-elevated-card.scss',
    m3FilledCard: 'tokens/versions/v0_192/_md-comp-filled-card.scss',
    m3OutlinedCard: 'tokens/versions/v0_192/_md-comp-outlined-card.scss',
    m3Dialog: 'tokens/versions/v0_192/_md-comp-dialog.scss',
    m3Menu: 'tokens/versions/v0_192/_md-comp-menu.scss',
    m3ColorTokensFull: 'labs/gb/styles/color/md-color-tokens-full.css',
    m3Licence: 'LICENSE',
  }),
  ...npm('@fluentui/tokens', '1.0.0-alpha.24', {
    fluentLightColor: 'lib/alias/lightColor.js',
    fluentDarkColor: 'lib/alias/darkColor.js',
    fluentLightPalette: 'lib/alias/lightColorPalette.js',
    fluentDarkPalette: 'lib/alias/darkColorPalette.js',
    fluentColors: 'lib/global/colors.js',
    fluentColorPalette: 'lib/global/colorPalette.js',
    fluentStatusMapping: 'lib/statusColorMapping.js',
    fluentSharedNames: 'lib/sharedColorNames.js',
    fluentWebLightTheme: 'lib/themes/web/lightTheme.js',
    fluentWebDarkTheme: 'lib/themes/web/darkTheme.js',
    fluentLicence: 'LICENSE',
  }),
  ...npm('@fluentui/react-card', '9.7.3', {
    fluentCardStyles: 'lib/components/Card/useCardStyles.styles.raw.js',
  }),
  ...npm('@fluentui/react-message-bar', '9.7.7', {
    fluentMessageBarStyles: 'lib/components/MessageBar/useMessageBarStyles.styles.raw.js',
  }),
  ...npm('@fluentui/react-badge', '9.5.6', {
    fluentBadgeStyles: 'lib/components/Badge/useBadgeStyles.styles.raw.js',
  }),
  ...github('shadcn-ui/ui', shadcnRevision, {
    shadcnThemes: 'apps/v4/registry/themes.ts',
    shadcnGlobals: 'apps/v4/app/globals.css',
    shadcnNeutralJson: 'apps/v4/public/r/themes/neutral.json',
    shadcnLicence: 'LICENSE.md',
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

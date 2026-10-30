/**
 * Fige les sources : liste les fichiers de chaque paquet à une version exacte
 * (jsdelivr) ou à un commit exact (GitHub), les télécharge, calcule leur SHA-256
 * et écrit `../sources.json`. À lancer seulement pour ajouter ou changer une
 * version ; pour rejouer l'existant, utiliser `recuperer.mjs`.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const racine = new URL('../', import.meta.url);
const npm = (paquet, version, motifs, licence) => ({ type: 'npm', paquet, version, motifs, licence });
// Un fichier de composant publié : `extraire.mjs` ne le lit pas pour `noms.json`.
// Sa licence se fige avec lui, sous un nom propre au paquet, parce qu'un paquet
// de composant n'est pas celui des tokens du même système. Un paquet qui ne
// publie pas de LICENSE donne son `package.json`, qui porte le champ `license`.
const echapper = (chemin) => chemin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const composant = (paquet, version, chemin, licence, fichierLicence = 'LICENSE') => ({
  type: 'npm', paquet, version, licence, usage: 'composant',
  motifs: [new RegExp(`^${echapper(chemin)}$`), new RegExp(`^${echapper(fichierLicence)}$`)],
});
const gh = (depot, commit, chemins, licence) => ({ type: 'gh', depot, commit, chemins, licence });

const SYSTEMES = {
  atlassian: [
    npm('@atlaskit/tokens', '20.6.1', [/^dist\/cjs\/artifacts\/(token-names|themes\/atlassian-(light|dark))\.js$/, /^LICENSE$/], 'Apache-2.0'),
    composant('@atlaskit/button', '25.4.7', 'dist/esm/new-button/variants/shared/button-base.compiled.css', 'Apache-2.0'),
  ],
  carbon: [
    npm('@carbon/themes', '11.83.0', [/^src\/dtcg\/(themes|color-palette)\.json$/, /^src\/dtcg\/components\/.*\.json$/, /^LICENSE$/], 'Apache-2.0'),
    npm('@carbon/layout', '11.61.0', [/^scss\/generated\/_(spacing|container|icon-size|size|border-radius|fluid-spacing|layout)\.scss$/], 'Apache-2.0'),
    npm('@carbon/type', '11.69.0', [/^scss\/_styles\.scss$/], 'Apache-2.0'),
  ],
  spectrum: [npm('@adobe/spectrum-tokens', '15.6.0', [/^dist\/json\/variables\.json$/, /^LICENSE$/], 'Apache-2.0')],
  primer: [npm('@primer/primitives', '11.10.0', [
    /^dist\/css\/base\/(motion|size|typography)\/.*\.css$/,
    /^dist\/css\/functional\/(motion|size|spacing|typography)\/.*\.css$/,
    /^dist\/css\/functional\/themes\/(light|dark)\.css$/, /^LICENSE$/], 'MIT'),
    composant('@primer/react', '38.40.1', 'dist/Button/ButtonBase-014fae23.css', 'MIT', 'package.json')],
  polaris: [npm('@shopify/polaris-tokens', '9.4.2', [/^dist\/css\/styles\.css$/, /^LICENSE\.md$/], 'MIT')],
  'material-3': [npm('@material/web', '2.5.0', [
    /^tokens\/versions\/v0_192\/_md-(ref|sys|comp)-(?![a-z0-9-]*-meta\.scss)[a-z0-9-]+\.scss$/, /^LICENSE$/], 'Apache-2.0')],
  'fluent-2': [npm('@fluentui/tokens', '1.0.0-alpha.24', [
    /^lib\/alias\/(lightColor|lightColorPalette|darkColor|darkColorPalette)\.js$/,
    /^lib\/global\/(borderRadius|brandColors|colorPalette|colors|curves|durations|fonts|spacings|strokeWidths|typographyStyles)\.js$/,
    /^LICENSE$/], 'MIT'),
    composant('@fluentui/react-button', '9.11.1', 'lib/components/Button/useButtonStyles.styles.raw.js', 'MIT')],
  'figma-sds': [gh('figma/sds', '05525f75192a3aa5d5690c5e41277ebd19d2efe1', ['src/theme.css', 'LICENSE'], 'MIT')],
  radix: [
    npm('@radix-ui/themes', '3.3.0', [/^tokens\.css$/, /^LICENSE$/], 'MIT'),
    composant('@radix-ui/themes', '3.3.0', 'src/components/_internal/base-button.css', 'MIT'),
  ],
  mui: [composant('@mui/material', '9.5.0', 'Button/Button.js', 'MIT')],
  'ant-design': [npm('antd', '6.6.8', [/^es\/version\/token(-meta)?\.json$/, /^LICENSE$/], 'MIT')],
  govuk: [npm('govuk-frontend', '6.6.0', [
    /^dist\/govuk\/settings\/_(colours-functional|colours-palette--internal|links|measurements|spacing|typography-font|typography-responsive)\.scss$/,
    /^package\.json$/], 'MIT')],
  tailwind: [npm('tailwindcss', '4.3.3', [/^theme\.css$/, /^LICENSE$/], 'MIT')],
  shadcn: [gh('shadcn-ui/ui', '30a58d4498f270af1c1e981a7d78a15cf5740841', ['apps/v4/public/r/themes/neutral.json', 'LICENSE.md'], 'MIT')],
  'untitled-ui': [gh('untitleduico/react', '1d410cb8facde8d50869e7bbb5f3d048e2267466', ['styles/theme.css', 'LICENSE'], 'MIT')],
};

// Les entrées de MUI viennent de `mui-theme.mjs` : on les garde.
const ancien = existsSync(new URL("sources.json", racine)) ? JSON.parse(readFileSync(new URL("sources.json", racine), "utf8")) : [];
const entrees = [];
async function prendre(systeme, url, version, originalPath, licence, usage) {
  const rep = await fetch(url);
  if (!rep.ok) throw new Error(`${rep.status} ${url}`);
  const brut = Buffer.from(await rep.arrayBuffer());
  const aplati = originalPath.replaceAll('/', '__');
  const paquet = version.slice(0, version.lastIndexOf('@')).replace(/^@/, '').replaceAll('/', '-');
  const localFile = `${systeme}/sources/${usage ? `composant__${paquet}__` : ''}${aplati}.txt`;
  mkdirSync(new URL(`${systeme}/sources/`, racine), { recursive: true });
  writeFileSync(new URL(localFile, racine), brut);
  entrees.push({
    systeme, url, version, originalPath, localFile,
    sha256: createHash('sha256').update(brut).digest('hex'), licence,
    ...(usage ? { usage } : {}),
  });
}

for (const [systeme, parts] of Object.entries(SYSTEMES)) {
  for (const p of parts) {
    if (p.type === 'npm') {
      const liste = await (await fetch(`https://data.jsdelivr.com/v1/packages/npm/${p.paquet}@${p.version}?structure=flat`)).json();
      const chemins = liste.files.map((f) => f.name.slice(1)).filter((n) => p.motifs.some((m) => m.test(n))).sort();
      if (!chemins.length) throw new Error(`Rien pour ${p.paquet}`);
      for (const c of chemins) {
        await prendre(systeme, `https://cdn.jsdelivr.net/npm/${p.paquet}@${p.version}/${c}`, `${p.paquet}@${p.version}`, c, p.licence, p.usage);
      }
    } else {
      for (const c of p.chemins) {
        await prendre(systeme, `https://raw.githubusercontent.com/${p.depot}/${p.commit}/${c}`, `${p.depot}@${p.commit}`, c, p.licence);
      }
    }
  }
}
entrees.push(...ancien.filter((e) => e.systeme === 'mui' && e.genere));
writeFileSync(new URL('sources.json', racine), JSON.stringify(entrees, null, 2) + '\n');
console.log(`${entrees.length} fichiers figés`);

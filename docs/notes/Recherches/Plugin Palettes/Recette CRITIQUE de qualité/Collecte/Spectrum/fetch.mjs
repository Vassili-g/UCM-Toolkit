/** Télécharge les sources de Spectrum 2 à la révision retenue pour la collecte. */
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const revision = '740c6c5c4a717ca8c82fc4d15d199f6166cd42dc';
const fichiers = {
  badge: 'packages/@react-spectrum/s2/src/Badge.tsx',
  inlineAlert: 'packages/@react-spectrum/s2/src/InlineAlert.tsx',
  style: 'packages/@react-spectrum/s2/style/style-macro.ts',
  theme: 'packages/@react-spectrum/s2/style/spectrum-theme.ts',
  tokens: 'packages/@react-spectrum/s2/style/tokens.ts',
  styleUtils: 'packages/@react-spectrum/s2/src/style-utils.ts',
  provider: 'packages/@react-spectrum/s2/src/Provider.tsx',
  package: 'packages/@react-spectrum/s2/package.json',
  licence: 'LICENSE',
};
await mkdir(new URL('./sources/', import.meta.url), { recursive: true });
const sources = [];
for (const [id, chemin] of Object.entries(fichiers)) {
  const url = `https://raw.githubusercontent.com/adobe/react-spectrum/${revision}/${chemin}`;
  const reponse = await fetch(url);
  if (!reponse.ok) throw new Error(`${reponse.status} ${url}`);
  const contenu = Buffer.from(await reponse.arrayBuffer());
  const localFile = `sources/${id}.txt`;
  await writeFile(new URL(localFile, import.meta.url), contenu);
  sources.push({ id, url, revision, originalPath: chemin, localFile, sha256: createHash('sha256').update(contenu).digest('hex') });
}
for (const [id, chemin] of Object.entries({ variables: 'dist/json/variables.json', tokenLicence: 'LICENSE' })) {
  const url = `https://cdn.jsdelivr.net/npm/@adobe/spectrum-tokens@14.15.0/${chemin}`;
  const reponse = await fetch(url);
  if (!reponse.ok) throw new Error(`${reponse.status} ${url}`);
  const contenu = Buffer.from(await reponse.arrayBuffer());
  const localFile = `sources/${id}.${id === 'variables' ? 'json' : 'txt'}`;
  await writeFile(new URL(localFile, import.meta.url), contenu);
  sources.push({ id, url, revision: '@adobe/spectrum-tokens@14.15.0', originalPath: chemin, localFile, sha256: createHash('sha256').update(contenu).digest('hex') });
}
await writeFile(new URL('./sources.json', import.meta.url), JSON.stringify(sources, null, 2) + '\n');
console.log(`${sources.length} sources téléchargées.`);

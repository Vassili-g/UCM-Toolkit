/** Télécharge les sources du Simple Design System de Figma à la révision retenue pour la collecte. */
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const revision = '05525f75192a3aa5d5690c5e41277ebd19d2efe1';
const fichiers = {
  theme: 'src/theme.css',
  notification: 'src/ui/primitives/Notification/notification.css',
  tag: 'src/ui/primitives/Tag/tag.css',
  licence: 'LICENSE',
};
await mkdir(new URL('./sources/', import.meta.url), { recursive: true });
const sources = [];
for (const [id, chemin] of Object.entries(fichiers)) {
  const url = `https://raw.githubusercontent.com/figma/sds/${revision}/${chemin}`;
  const reponse = await fetch(url);
  if (!reponse.ok) throw new Error(`${reponse.status} ${url}`);
  const contenu = Buffer.from(await reponse.arrayBuffer());
  const localFile = `sources/${id}.txt`;
  await writeFile(new URL(localFile, import.meta.url), contenu);
  sources.push({ id, url, revision, originalPath: chemin, localFile, sha256: createHash('sha256').update(contenu).digest('hex') });
}
await writeFile(new URL('./sources.json', import.meta.url), JSON.stringify(sources, null, 2) + '\n');
console.log(`${sources.length} sources téléchargées.`);

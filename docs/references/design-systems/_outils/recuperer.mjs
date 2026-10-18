/**
 * Télécharge chaque fichier de `sources.json` dans `<système>/sources/` et
 * vérifie son SHA-256. Un fichier déjà présent et conforme n'est pas retéléchargé.
 * Les entrées `genere` (MUI) ne se téléchargent pas : on vérifie seulement le
 * fichier, à refaire avec `mui-theme.mjs` s'il manque.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = new URL('../', import.meta.url);
const sources = JSON.parse(readFileSync(new URL('sources.json', racine), 'utf8'));
const sha = (b) => createHash('sha256').update(b).digest('hex');

let telecharges = 0;
let erreurs = 0;
for (const s of sources) {
  const chemin = fileURLToPath(new URL(s.localFile, racine));
  let brut = existsSync(chemin) ? readFileSync(chemin) : null;
  if (brut && sha(brut) === s.sha256) continue;
  if (s.genere) {
    console.error(`À regénérer avec _outils/mui-theme.mjs : ${s.localFile}`);
    erreurs++;
    continue;
  }
  const rep = await fetch(s.url);
  if (!rep.ok) {
    console.error(`${rep.status} ${s.url}`);
    erreurs++;
    continue;
  }
  brut = Buffer.from(await rep.arrayBuffer());
  if (sha(brut) !== s.sha256) {
    console.error(`SHA-256 différent : ${s.url}`);
    erreurs++;
    continue;
  }
  mkdirSync(dirname(chemin), { recursive: true });
  writeFileSync(chemin, brut);
  telecharges++;
}
console.log(`${sources.length} fichiers dans sources.json, ${telecharges} téléchargés, ${erreurs} erreurs`);
process.exitCode = erreurs ? 1 : 0;

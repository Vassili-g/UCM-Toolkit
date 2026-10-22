// Capture des cadres de la maquette de Token Architect, par identifiant, pour un agent qui reproduit un écran sans lire
// la maquette entière. Une image par cadre, avec sa légende, dans le dossier donné (par défaut, le dossier temporaire).
// Lancer depuis la racine du dépôt : `node "docs/notes/Recherches/Token Architect v2/Mesures/capturer-cadres.mjs" <dossier> <id>…`
// Exemple : `… capturer-cadres.mjs "$TMP" t-renommages c-corrections`.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';

const ici = path.dirname(fileURLToPath(import.meta.url));
const [sortie = tmpdir(), ...ids] = process.argv.slice(2);
if (ids.length === 0) { console.error('Donner au moins un identifiant de cadre, par exemple t-renommages.'); process.exit(1); }
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1700, height: 1000 } });
page.on('pageerror', (e) => console.error('Erreur de la maquette :', e.message));
await page.goto(pathToFileURL(path.resolve(ici, '../Maquettes/MAQUETTE-TOKEN-ARCHITECT.html')).href);
// Les cadres se chargent dans des iframes, puis leurs repères se posent 450 ms après.
await page.waitForTimeout(6000);
for (const id of ids) {
  const fichier = path.join(sortie, `${id}.png`);
  await page.locator(`#${id}`).locator('xpath=..').screenshot({ path: fichier });
  console.log(fichier);
}
await navigateur.close();

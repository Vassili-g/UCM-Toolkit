/**
 * MUI ne publie pas ses tokens dans un fichier : ils sont dans le thème que
 * `createTheme()` construit. Ce script installe `@mui/material` à la version
 * figée dans un dossier temporaire, appelle `createTheme()` et écrit deux
 * fichiers : les chemins de clés du thème par défaut dans
 * `mui/sources/theme-par-defaut.json.txt`, et leurs valeurs dans
 * `mui/sources/valeurs-du-theme-par-defaut.json.txt`. Il met ensuite à jour
 * `sources.json`. Les valeurs ne gardent que les feuilles scalaires hors des
 * tableaux : `extraire.mjs` écrit `mui/valeurs.json` depuis ce second fichier.
 * Il exécute le code du paquet npm ; il se lance à la main, jamais en CI.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const VERSION = '9.5.0';
const racine = new URL('../', import.meta.url);
const tmp = mkdtempSync(join(tmpdir(), 'mui-'));
writeFileSync(join(tmp, 'package.json'), '{"name":"mui-tmp","private":true}');
execFileSync('npm', ['install', '--no-audit', '--no-fund', `@mui/material@${VERSION}`, '@emotion/react', '@emotion/styled', 'react', 'react-dom'],
  { cwd: tmp, stdio: 'inherit', shell: true });

const require = createRequire(join(tmp, 'x.js'));
const { createTheme } = require('@mui/material/styles');
const chemins = new Set();
const valeurs = {};
function parcourir(valeur, chemin) {
  if (typeof valeur === 'function') return;
  if (valeur && typeof valeur === 'object') {
    for (const [k, v] of Object.entries(valeur)) parcourir(v, chemin ? `${chemin}.${k}` : k);
  } else if (chemin) {
    chemins.add(chemin);
    if (!/\.\d+(\.|$)/.test(chemin) && valeur !== undefined) valeurs[chemin] = valeur;
  }
}
const theme = createTheme();
delete theme.components;
parcourir(theme, '');
const contenu = JSON.stringify([...chemins].sort(), null, 2) + '\n';
mkdirSync(new URL('mui/sources/', racine), { recursive: true });
const localFile = 'mui/sources/theme-par-defaut.json.txt';
writeFileSync(new URL(localFile, racine), contenu);

const contenuValeurs = JSON.stringify(Object.fromEntries(Object.entries(valeurs).sort(([a], [b]) => (a < b ? -1 : 1))), null, 2) + '\n';
const fichierValeurs = 'mui/sources/valeurs-du-theme-par-defaut.json.txt';
writeFileSync(new URL(fichierValeurs, racine), contenuValeurs);

const fichier = new URL('sources.json', racine);
const liste = JSON.parse(readFileSync(fichier, 'utf8')).filter((e) => !(e.systeme === 'mui' && e.genere));
const genere = (originalPath, localFile, contenu) => ({
  systeme: 'mui',
  url: `npm:@mui/material@${VERSION}#createTheme()`,
  version: `@mui/material@${VERSION}`,
  originalPath,
  localFile,
  sha256: createHash('sha256').update(contenu).digest('hex'),
  licence: 'MIT',
  genere: true,
});
liste.push(
  genere('createTheme() : chemins de clés du thème par défaut', localFile, contenu),
  genere('createTheme() : valeurs du thème par défaut, hors tableaux', fichierValeurs, contenuValeurs),
);
writeFileSync(fichier, JSON.stringify(liste, null, 2) + '\n');
console.log(`${chemins.size} chemins, ${Object.keys(valeurs).length} valeurs`);

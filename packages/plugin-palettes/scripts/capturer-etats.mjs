#!/usr/bin/env node
/**
 * Capture des états de la galerie en thème sombre, aux deux tailles où le
 * plan de la direction simple les compare à leur maquette : 560 × 760 et la
 * taille minimale, 500 × 520. La galerie doit être construite.
 *
 *   npm run galerie --workspace ucm-palettes-plugin
 *   node packages/plugin-palettes/scripts/capturer-etats.mjs <dossier de sortie> <état> [<état>…]
 *
 * Chaque état donne deux images, `<état>-560.png` et `<état>-500.png`, de la
 * page entière : ce qui défile se lit aussi.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { chromium } from 'playwright';

const [sortie, ...etats] = process.argv.slice(2);
if (!sortie || etats.length === 0) {
  console.error('Usage : capturer-etats.mjs <dossier de sortie> <état> [<état>…]');
  process.exit(1);
}

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const TAILLES = [
  { suffixe: '560', dossier: 'galerie', largeur: 560, hauteur: 760 },
  { suffixe: '500', dossier: 'galerie-minimale', largeur: 500, hauteur: 520 },
];

mkdirSync(sortie, { recursive: true });
const navigateur = await chromium.launch();
for (const etat of etats) {
  for (const taille of TAILLES) {
    const page = await navigateur.newPage({ viewport: { width: taille.largeur, height: taille.hauteur } });
    await page.goto(pathToFileURL(path.join(DIST, taille.dossier, 'sombre', `${etat}.html`)).href);
    await page.waitForFunction(() => document.documentElement.dataset.galerie === 'pret');
    await page.screenshot({ path: path.join(sortie, `${etat}-${taille.suffixe}.png`), fullPage: true });
    await page.close();
  }
}
await navigateur.close();

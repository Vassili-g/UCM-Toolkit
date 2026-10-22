/**
 * Construit la galerie du socle : une planche qui montre chaque signal du
 * langage visuel, en clair et en sombre. Le socle n'a pas d'interface à lui ;
 * ce script en fabrique une (`galerie/planche/`), l'écrit dans `dist/ui.html`
 * et confie le reste au banc. La planche a la taille du cadre `s-planche` de la
 * maquette d'Architect, 640 × 1900.
 *
 * Le kit doit être construit (`npm run build:plugin -- palettes` le fait) : la
 * planche lit les types d'alerte dans `@ucm-kit/core/referentiel`.
 */
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');
const { construireUi } = require('../build/inline-ui.cjs');
const { construireGalerie } = require('./banc.cjs');

const RACINE = path.resolve(__dirname, '..');
const DOSSIER_UI = path.join(RACINE, 'src', 'ui');
const SOURCE_DE_LA_PLANCHE = path.join(__dirname, 'planche');

const ETATS = [{ id: 'planche', titre: 'Planche des signaux', existe: true, atteinte: [] }];

/** Écrit `dist/ui.html` sous `racine`, puis la galerie dans `dist/galerie`. */
function construirePlanche(racine = RACINE) {
  const dist = path.join(racine, 'dist');
  fs.mkdirSync(dist, { recursive: true });
  esbuild.buildSync({
    entryPoints: [path.join(SOURCE_DE_LA_PLANCHE, 'index.ts')],
    bundle: true,
    outfile: path.join(dist, 'ui.js'),
    format: 'iife',
    platform: 'browser',
    target: 'chrome80',
    minify: true,
    charset: 'utf8',
    logLevel: 'silent',
  });
  construireUi({
    srcDir: SOURCE_DE_LA_PLANCHE,
    distDir: dist,
    feuilles: [path.join(DOSSIER_UI, 'socle.css'), path.join(DOSSIER_UI, 'langage.css'), path.join(SOURCE_DE_LA_PLANCHE, 'planche.css')],
  });
  construireGalerie({ racine, etats: ETATS, largeur: 640, hauteur: 1900 });
}

module.exports = { construirePlanche, ETATS };

if (require.main === module) construirePlanche();

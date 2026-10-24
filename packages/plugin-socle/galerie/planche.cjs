/**
 * Construit la galerie du socle : deux planches qui montrent le langage visuel,
 * en clair et en sombre. Le socle n'a pas d'interface à lui ; ce script en
 * fabrique une (`galerie/planche/`), l'écrit dans `dist/ui.html` et confie le
 * reste au banc. La planche des signaux a la taille du cadre `s-planche` de la
 * maquette d'Architect, 640 × 1900, et s'écrit dans `dist/galerie`. La planche
 * des signes, plus haute, s'écrit dans `dist/galerie-signes`.
 *
 * Le kit doit être construit (`npm run build:plugin -- palettes` le fait) : les
 * planches lisent les types d'alerte et les signes dans `@ucm-kit/core/referentiel`.
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
const ETATS_DES_SIGNES = [{ id: 'signes', titre: 'Planche des signes', existe: true, atteinte: [] }];
const HAUTEUR_DES_SIGNES = 2300;

/** Écrit `dist/ui.html` d'après le point d'entrée `entree`, puis la galerie qu'`options` décrit. */
function construireUneFeuille(racine, entree, options) {
  const dist = path.join(racine, 'dist');
  fs.mkdirSync(dist, { recursive: true });
  esbuild.buildSync({
    entryPoints: [path.join(SOURCE_DE_LA_PLANCHE, entree)],
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
  construireGalerie({ racine, ...options });
}

/** Écrit les galeries des signaux (`dist/galerie`) et des signes (`dist/galerie-signes`) sous `racine`. */
function construirePlanche(racine = RACINE) {
  construireUneFeuille(racine, 'index.ts', { etats: ETATS, largeur: 640, hauteur: 1900 });
  construireUneFeuille(racine, 'index-signes.ts', { etats: ETATS_DES_SIGNES, largeur: 640, hauteur: HAUTEUR_DES_SIGNES, dossier: 'galerie-signes' });
}

module.exports = { construirePlanche, ETATS, ETATS_DES_SIGNES };

if (require.main === module) construirePlanche();

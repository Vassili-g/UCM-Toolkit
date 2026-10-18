/** Le banc du socle construit les galeries : la taille par défaut de la fenêtre, puis sa taille minimale. */
const path = require('path');
const { construireGalerie } = require('ucm-plugin-socle/galerie/banc.cjs');
const { ETATS } = require('./etats.cjs');
const racine = path.resolve(__dirname, '..');
const GALERIES = [
  { racine, etats: ETATS, largeur: 640, hauteur: 720 },
  { racine, etats: ETATS, largeur: 360, hauteur: 420, dossier: 'galerie-minimale' },
];
module.exports = { GALERIES };
if (require.main === module) for (const galerie of GALERIES) construireGalerie(galerie);

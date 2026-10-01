/**
 * Les galeries de l'explorateur, construites par le banc du socle : une à la
 * taille par défaut de la fenêtre, une à sa taille minimale.
 */
const path = require('path');
const { construireGalerie } = require('ucm-plugin-socle/galerie/banc.cjs');
const { ETATS } = require('./etats.cjs');

const racine = path.resolve(__dirname, '..');
const GALERIES = [
  { racine, etats: ETATS, largeur: 1200, hauteur: 800 },
  { racine, etats: ETATS, largeur: 560, hauteur: 480, dossier: 'galerie-minimale' },
];

module.exports = { GALERIES };

if (require.main === module) for (const galerie of GALERIES) construireGalerie(galerie);

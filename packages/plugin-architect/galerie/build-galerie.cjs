/** Le banc du socle construit les quatre états de la lecture. */
const path = require('path');
const { construireGalerie } = require('ucm-plugin-socle/galerie/banc.cjs');
const { ETATS } = require('./etats.cjs');
const GALERIES = [{ racine: path.resolve(__dirname, '..'), etats: ETATS, largeur: 640, hauteur: 720 }];
module.exports = { GALERIES };
if (require.main === module) for (const galerie of GALERIES) construireGalerie(galerie);

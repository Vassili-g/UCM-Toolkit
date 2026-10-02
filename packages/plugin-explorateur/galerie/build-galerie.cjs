/**
 * Les galeries de l'explorateur, construites par le banc du socle : une à la
 * taille par défaut de la fenêtre, une à sa taille minimale, et une à la
 * taille de la fenêtre étroite, pour les états de la vue composant.
 */
const path = require('path');
const { construireGalerie } = require('ucm-plugin-socle/galerie/banc.cjs');
const { ETATS } = require('./etats.cjs');

const racine = path.resolve(__dirname, '..');
const larges = ETATS.filter((etat) => etat.disposition !== 'etroite');
const etroits = ETATS.filter((etat) => etat.disposition === 'etroite');
const GALERIES = [
  { racine, etats: larges, largeur: 1200, hauteur: 800 },
  { racine, etats: larges, largeur: 560, hauteur: 480, dossier: 'galerie-minimale' },
  { racine, etats: etroits, largeur: 364, hauteur: 724, dossier: 'galerie-etroite' },
];

module.exports = { GALERIES };

if (require.main === module) for (const galerie of GALERIES) construireGalerie(galerie);

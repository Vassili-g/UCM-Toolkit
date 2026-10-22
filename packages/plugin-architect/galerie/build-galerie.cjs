/**
 * Les galeries d'Architect, construites par le banc du socle : une à la taille
 * du mode Tokens, une à sa taille minimale, et une à celle du mode Composant
 * (panneau fermé). Les états de Nomenclature se jouent dans le panneau latéral
 * du mode Tokens.
 */
const path = require('path');
const { construireGalerie } = require('ucm-plugin-socle/galerie/banc.cjs');
const { ETATS } = require('./etats.cjs');

const racine = path.resolve(__dirname, '..');
const larges = ETATS.filter((etat) => etat.disposition !== 'etroite');
const etroits = ETATS.filter((etat) => etat.disposition === 'etroite');
const GALERIES = [
  { racine, etats: larges, largeur: 1360, hauteur: 800 },
  { racine, etats: larges, largeur: 560, hauteur: 480, dossier: 'galerie-minimale' },
  { racine, etats: etroits, largeur: 520, hauteur: 760, dossier: 'galerie-etroite' },
];

module.exports = { GALERIES };

if (require.main === module) for (const galerie of GALERIES) construireGalerie(galerie);

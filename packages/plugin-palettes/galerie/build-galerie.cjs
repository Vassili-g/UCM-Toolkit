/**
 * Les galeries d'UCM Palettes, construites par le banc du socle : une à la
 * taille par défaut de la fenêtre, une à sa taille minimale, où le point (c)
 * du protocole de relecture se regarde.
 */
const path = require('path');
const { construireGalerie } = require('ucm-plugin-socle/galerie/banc.cjs');
const { ETATS } = require('./etats.cjs');

const racine = path.resolve(__dirname, '..');
const traductions = path.join(racine, 'dist/galerie-i18n.cjs');
require('esbuild').buildSync({ entryPoints: [path.join(racine, 'src/i18n/index.ts')], outfile: traductions, bundle: true, format: 'cjs', platform: 'node' });
const { CATALOGUES } = require(traductions);
const chemins = [
  ['TEXTES', 'ouvrirLesReglages'], ['TEXTES_DE_L_INTERFACE_DE_TEST', 'titre'],
  ['TEXTES_DE_L_ONGLET', 'derive'], ['TEXTES_DE_L_ONGLET', 'configuration'],
  ['TEXTES_DE_LA_BASE', 'libelle'], ['TEXTES_DE_L_AJUSTEMENT', 'plusSombre'],
  ['TEXTES_DE_CONFIGURATION', 'contenu'], ['TEXTES_DE_CONFIGURATION', 'fondsSombres'],
  ['TEXTES_DES_REGLAGES', 'titre'],
];
function selecteurDansLaLangue(selecteur, langue) {
  for (const [domaine, cle] of chemins) selecteur = selecteur.replaceAll(CATALOGUES.fr[domaine][cle], CATALOGUES[langue][domaine][cle]);
  if (langue === 'en') selecteur = selecteur.replaceAll('Profil Vivid, nuance', 'Profile Vivid, shade');
  return selecteur;
}
const dansLaLangue = (langue) => ETATS.map((etat) => ({
  ...etat,
  atteinte: [{ message: { type: 'langue', langue } }, ...(etat.atteinte ?? []).map((etape) => {
    if (etape.clic) return { clic: selecteurDansLaLangue(etape.clic, langue) };
    if (etape.saisie) return { saisie: { ...etape.saisie, dans: selecteurDansLaLangue(etape.saisie.dans, langue) } };
    return etape;
  })],
}));
const GALERIES = [
  { racine, etats: dansLaLangue('fr'), largeur: 600, hauteur: 720 },
  { racine, etats: dansLaLangue('fr'), largeur: 500, hauteur: 520, dossier: 'galerie-minimale' },
  { racine, etats: dansLaLangue('en'), largeur: 600, hauteur: 720, dossier: 'galerie-en' },
  { racine, etats: dansLaLangue('en'), largeur: 500, hauteur: 520, dossier: 'galerie-en-minimale' },
];

module.exports = { GALERIES };

if (require.main === module) for (const galerie of GALERIES) construireGalerie(galerie);

/**
 * Les données des états de « À faire dans Figma » et des corrections de modes et de scopes : le fichier Intencial de la maquette
 * (`theme/primary` ouvert, 13 variables), le bilan de Nomenclature qui donne 85 renommages et 3 questions, et le message `structure` du
 * sandbox avec les six constats et les quatre corrections de la maquette. Les pastilles disent donc 89, 3 et 6 : 85 renommages et
 * 4 corrections, 3 questions, 6 constats.
 *
 * Le sandbox du domaine n'existe pas encore : ces messages sont les données de la maquette, à la forme de `messages/structure.ts`.
 */
const { bilans } = require('../nomenclature/donnees.cjs');
const { constructeur, alias, nombre, couleur } = require('../etats/aide.cjs');

const THEME_PRIMARY = [
  ['solid/default', '700'], ['solid/hover', '800'], ['solid/pressed', '900'], ['solid/foreground', null],
  ['surface/default', '100'], ['surface/hover', '200'], ['surface/pressed', '300'], ['surface/foreground', '800'],
  ['surface/border', '800'], ['page/foreground', '700'], ['page/border', '700'], ['page/divider', '300'], ['ring', '600'],
];
const CRANS = { 100: '#F6E6E6', 200: '#EDCDCD', 300: '#E2B0B0', 600: '#C46667', 700: '#B15152', 800: '#8E3F40', 900: '#6B2F30' };

/** Le fichier Intencial : cinq collections aux nombres de variables de l'arbre de la maquette, `theme` ouvert sur le groupe `primary`. */
function releveDeStructure() {
  const c = constructeur('Intencial');
  c.collection('primitives', 'primitives', ['Valeur']);
  c.collection('brands', 'brands', ['intencial', 'apicil']);
  c.collection('theme', 'theme', ['light', 'dark']);
  c.collection('layout', 'layout', ['Valeur']);
  c.collection('components', 'components', ['Valeur']);
  const deja = { primitives: 0, brands: 0, theme: 0, layout: 0, components: 0 };
  const poser = (collection, id, nom, type, valeurs) => {
    deja[collection] += 1;
    c.variable(id, collection, nom, type, valeurs);
  };
  const remplir = (collection, total, modes, type = 'FLOAT') => {
    for (let rang = deja[collection]; rang < total; rang += 1) poser(collection, `${collection}-${rang}`, `remplissage-${rang}`, type, Object.fromEntries(modes.map((mode) => [mode, type === 'COLOR' ? couleur('#B15152') : nombre(rang)])));
  };
  const surModes = (modes, valeur) => Object.fromEntries(modes.map((mode) => [mode, valeur]));

  poser('primitives', 'primitives:scale/0', 'scale/0', 'COLOR', { Valeur: couleur('#FFFFFF') });
  remplir('primitives', 346, ['Valeur']);

  const brands = (nom, hex) => poser('brands', `brands:${nom}`, nom, 'COLOR', surModes(['intencial', 'apicil'], couleur(hex)));
  for (const [cran, hex] of Object.entries(CRANS)) brands(`primary/light/${cran}`, hex);
  brands('info/light/700', '#0B6BCB');
  brands('success/light/600', '#2E9E5B');
  brands('success/dark/600', '#7FDC9C');
  remplir('brands', 420, ['intencial', 'apicil']);

  const theme = (nom, cible) => poser('theme', `theme:${nom}`, nom, 'COLOR', surModes(['light', 'dark'], alias(cible)));
  for (const [nom, cran] of THEME_PRIMARY) theme(`primary/${nom}`, cran ? `brands:primary/light/${cran}` : 'primitives:scale/0');
  const groupe = (nom, total, noms) => {
    noms.forEach((entree, rang) => theme(`${nom}/${entree}`, rang % 2 === 0 ? 'brands:primary/light/700' : 'brands:primary/light/300'));
    for (let rang = noms.length; rang < total; rang += 1) theme(`${nom}/etat-${rang}`, 'brands:primary/light/700');
  };
  groupe('secondary', 13, []);
  groupe('neutral', 17, ['page/foreground-subtle']);
  theme('elevation/raised', 'brands:primary/light/100');
  groupe('info', 26, ['soft/page/border', 'soft/page/foreground', 'soft/surface/default']);
  groupe('success', 26, ['vivid/ring']);
  groupe('danger', 26, []);
  remplir('theme', 180, ['light', 'dark'], 'COLOR');

  poser('layout', 'layout:sizing/1,5', 'sizing/1,5', 'FLOAT', { Valeur: nombre(6) });
  poser('layout', 'layout:sizing/2', 'sizing/2', 'FLOAT', { Valeur: nombre(6) });
  remplir('layout', 60, ['Valeur']);
  poser('components', 'components:button/focus/ring', 'button/color/primary/contained/focus/ring', 'COLOR', { Valeur: couleur('#C46667') });
  remplir('components', 412, ['Valeur']);
  return { ...c.releve(), luA: new Date(2026, 0, 1, 14, 0).getTime() };
}

/** Le bilan de Nomenclature : 10 + 8 + 66 + 1 renommages, trois questions. */
const bilanDeStructure = { ...bilans.travail, groupes: [{ ...bilans.travail.groupes[0], variables: 10 }, ...bilans.travail.groupes.slice(1)] };

const constat = (id, type, faits, plus = {}) => ({ id, code: 'C63', type, famille: 'liaisons', variants: [], layers: [], faits, ...plus });
const scope = (variable) => ({
  id: `scope:${variable}`, sorte: 'scope', cible: { variable: `theme:${variable}` }, avant: 'ALL_SCOPES', apres: { nom: 'FRAME_FILL,SHAPE_FILL' },
  aRelire: { regle: 'UCM réserve le dossier surface aux fonds.', avant: 'ALL_SCOPES' },
});
const rampe = {
  id: 'mode:success/vivid/ring', sorte: 'alias-de-mode', cible: { variable: 'theme:success/vivid/ring', mode: 'dark' }, avant: 'brands:success/light/600',
  apres: { cle: 'brands:success/dark/600', nom: 'success/dark/600' }, aRelire: { axes: { mode: 'Dark' }, regle: 'En Dark, UCM attend le cran 600 de la rampe Dark.', avant: 'brands:success/light/600' },
};
const CORRECTIONS = [rampe, scope('primary/surface/default'), scope('primary/surface/hover'), scope('info/soft/surface/default')];

const CONSTATS = [
  constat('afaire:alias', 'corriger', {
    genre: 'alias-supprime', variable: 'theme/info/soft/page/border', cle: 'theme:info/soft/page/border', mode: 'Light',
    voisine: 'theme/info/soft/page/foreground', cibleDeLaVoisine: 'brands/info/light/700',
  }),
  constat('afaire:library', 'corriger', { genre: 'library-inactive', variable: 'theme/success/vivid/ring', cle: 'theme:success/vivid/ring', library: 'Intencial Brands' }),
  constat('afaire:mode', 'verifier', { genre: 'sans-valeur-en-mode', variable: 'theme/neutral/page/foreground-subtle', cle: 'theme:neutral/page/foreground-subtle', mode: 'Dark' }),
  constat('afaire:vide', 'verifier', { variable: 'components/button/color/primary/contained/focus/ring', cle: 'components:button/focus/ring', mode: 'Valeur', soeurs: 4 }),
  constat('afaire:echelle', 'info', { mode: 'Valeur', valeur: 6, doublons: 2 }, {
    famille: 'tailles', question: { id: 'afaire:echelle', candidats: [{ cle: 'layout:sizing/1,5', nom: 'sizing/1,5' }, { cle: 'layout:sizing/2', nom: 'sizing/2' }] },
  }),
  constat('afaire:couche', 'corriger', { genre: 'couleur-sans-alias', variable: 'theme/elevation/raised', cle: 'theme:elevation/raised', valeur: '#FFFFFF' }),
  ...CORRECTIONS.map((correction) => constat(`corrigeable:${correction.id}`, 'corriger', { variable: correction.cible.variable }, { correction })),
];

/** Ce que le sandbox répond à `lire-structure` : les constats, dont ceux qu'une correction règle, et les corrections. */
const structure = (demande = 1) => ({ type: 'structure', demande, constats: CONSTATS, corrections: CORRECTIONS, ignores: { constats: [], roles: [] } });

/** Ce que le sandbox répond quand le fichier n'a que trois constats et aucune correction : les états de Corrections, de Questions et de la recherche, où la pastille de À faire dans Figma dit 3. */
const structureAFaire = (demande = 1) => ({ type: 'structure', demande, constats: CONSTATS.slice(0, 3), corrections: [], ignores: { constats: [], roles: [] } });

module.exports = { releveDeStructure, bilanDeStructure, structure, structureAFaire };

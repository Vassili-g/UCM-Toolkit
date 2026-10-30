/**
 * Les données des états du contrôle d'intégrité C82 en mode Tokens : variables manquantes, crans, constats à régler dans Figma,
 * sens inconnu, application d'une création. Les constats sortent du vrai `controlerLIntegriteUcm` du kit, joué sur le catalogue de
 * sa fixture (`packages/kit/tests/fixtures/catalogueDeStructure.ts`) : 11 palettes dans `theme`, sans `surface/subtle` ni
 * `surface/divider`, `neutral` sans `page/foreground`, des crans de `surface` en Dark à l'ancienne table. Le relevé de l'explorateur
 * reprend les mêmes variables sous les mêmes identifiants, que les cartes retrouvent par `Noms`.
 */
const path = require('path');
const { constructeur, alias, nombre, couleur } = require('../etats/aide.cjs');

const KIT = path.resolve(__dirname, '../../../kit').replace(/\\/g, '/');
const SORTIE = path.resolve(__dirname, '../../dist/galerie-integrite.cjs');

require('esbuild').buildSync({
  stdin: {
    contents: `
      export { controlerLIntegriteUcm } from '${KIT}/src/controles/index';
      export { MODE_DARK, MODE_LIGHT, avecEcriture, catalogueDeStructure, cleDeLaFixture } from '${KIT}/tests/fixtures/catalogueDeStructure';
    `,
    resolveDir: __dirname,
    loader: 'ts',
  },
  outfile: SORTIE,
  bundle: true,
  format: 'cjs',
  platform: 'node',
});
const { controlerLIntegriteUcm, MODE_DARK, MODE_LIGHT, avecEcriture, catalogueDeStructure, cleDeLaFixture } = require(SORTIE);

const ECRITURE = avecEcriture('minuscules', 'tiret');
const NOM_DU_MODE = { [MODE_LIGHT]: 'light', [MODE_DARK]: 'dark' };

const controler = (catalogue, ecriture = ECRITURE) => controlerLIntegriteUcm(catalogue, { ecriture });
const genre = (...genres) => (constat) => genres.includes(constat.faits.genre);
const variable = (collection, nom, valeurs, type = 'COLOR') => ({ cle: cleDeLaFixture(collection, nom), nom, collection, type, etat: 'presente', ...(valeurs ? { valeurs } : {}) });

/** Le catalogue de la fixture, avec une variable de plus ou une variable remplacée. */
function avec(catalogue, ...variables) {
  const cles = new Set(variables.map((entree) => entree.cle));
  return { ...catalogue, variables: [...catalogue.variables.filter((entree) => !cles.has(entree.cle)), ...variables] };
}

/** Un fichier aux écarts de toute sorte : un groupe sans alias, une rampe sans cran, un type, un rangement, une couche, une valeur directe, un sens inconnu. */
function catalogueAuxEcarts() {
  let catalogue = catalogueDeStructure();
  const absent = cleDeLaFixture('brands', 'primary/light/50');
  catalogue = { ...catalogue, variables: catalogue.variables.filter((entree) => entree.cle !== absent) };
  const direct = (nom) => variable('theme', nom, { [MODE_LIGHT]: { valeur: '#B15152' }, [MODE_DARK]: { valeur: '#B15152' } });
  const solidePresse = catalogue.variables.find((entree) => entree.cle === cleDeLaFixture('theme', 'primary/solid/pressed'));
  catalogue = avec(
    catalogue,
    direct('tertiary/ring'),
    variable('theme', 'primary/ring', undefined, 'FLOAT'),
    variable('brands', 'primary/surface/default'),
    variable('primitives', 'color/red/500'),
    variable('theme', 'primary/page/border', { [MODE_LIGHT]: { alias: cleDeLaFixture('primitives', 'color/red/500') }, [MODE_DARK]: { alias: cleDeLaFixture('primitives', 'color/red/500') } }),
    variable('theme', 'primary/page/divider', { [MODE_LIGHT]: { alias: cleDeLaFixture('brands', 'primary/light/300') }, [MODE_DARK]: { valeur: '#E2B0B0' } }),
    { ...solidePresse, valeurs: { ...solidePresse.valeurs, [MODE_LIGHT]: { alias: cleDeLaFixture('brands', 'primary/light/500') } } },
  );
  return catalogue;
}

/** Le catalogue de la fixture dont la collection `theme` a d'autres modes. */
function catalogueAuxModes(modes) {
  const catalogue = catalogueDeStructure();
  return { ...catalogue, collections: catalogue.collections.map((collection) => (collection.cle === 'theme' ? { ...collection, modes } : collection)) };
}

const manquantes = controler(catalogueDeStructure()).filter(genre('variable-absente'));
const crans = controler(catalogueDeStructure()).filter(genre('cran'));
const sansEcriture = controler(catalogueDeStructure(), null).filter(genre('variable-absente'));

const auxEcarts = controler(catalogueAuxEcarts());
const sensInconnu = auxEcarts.filter((constat) => constat.question);
const modesDuTheme = [
  ...controler(catalogueAuxModes([{ id: MODE_LIGHT, nom: 'light' }])).filter(genre('mode-du-theme')),
  ...controler(catalogueAuxModes([{ id: 'm-a', nom: 'Clair' }, { id: 'm-b', nom: 'Sombre' }])).filter(genre('mode-du-theme')),
];
/** Les constats sans correction du fichier aux écarts, un par sorte, et les modes de `theme`. */
const aFaire = [
  ...auxEcarts.filter(genre('variable-absente')).filter((constat) => constat.faits.groupe === 'tertiary').slice(0, 1),
  ...auxEcarts.filter(genre('cran-absent')).slice(0, 1),
  ...modesDuTheme,
  ...auxEcarts.filter(genre('couche', 'valeur-directe', 'type', 'mal-rangee')),
  ...sensInconnu,
];

/** Le relevé de l'explorateur : les variables du catalogue sous leurs identifiants, chaque alias vers sa cible. */
function releveDIntegrite(catalogue) {
  const c = constructeur('Intencial');
  c.collection('primitives', 'primitives', ['Mode 1']);
  c.collection('brands', 'brands', ['Marque A', 'Marque B']);
  c.collection('utility', 'utility', ['Mode 1']);
  c.collection('theme', 'theme', ['light', 'dark']);
  const modes = { primitives: ['Mode 1'], brands: ['Marque A', 'Marque B'], utility: ['Mode 1'], theme: ['light', 'dark'] };
  for (const entree of catalogue.variables) {
    const surModes = (valeur) => Object.fromEntries(modes[entree.collection].map((mode) => [mode, valeur]));
    let valeurs;
    if (entree.type !== 'COLOR') valeurs = surModes(nombre(1));
    else if (entree.collection !== 'theme' || !entree.valeurs) valeurs = surModes(couleur('#808080'));
    else {
      valeurs = Object.fromEntries(Object.entries(entree.valeurs).map(([mode, valeur]) => [NOM_DU_MODE[mode], 'alias' in valeur ? alias(valeur.alias) : couleur('#B15152')]));
    }
    c.variable(entree.cle, entree.collection, entree.nom, entree.type === 'COLOR' ? 'COLOR' : 'FLOAT', valeurs);
  }
  return { ...c.releve(), luA: new Date(2026, 0, 1, 14, 0).getTime() };
}

/** Ce que le sandbox répond à `lire-structure` : ces constats et les corrections qu'ils portent. */
const reponse = (constats, demande = 1) => ({
  type: 'structure',
  demande,
  constats,
  corrections: constats.flatMap((constat) => (constat.correction ? [constat.correction] : [])),
});

module.exports = {
  /** Le relevé du fichier de la fixture, sans l'écart de rampe ni les variables ajoutées : les cibles des créations y sont toutes. */
  releveDeBase: () => releveDIntegrite(catalogueDeStructure()),
  releveAuxEcarts: () => releveDIntegrite(catalogueAuxEcarts()),
  reponse,
  manquantes,
  crans,
  sansEcriture,
  aFaire,
  sensInconnu,
  /** Un identifiant de ligne de variable manquante, pour les motifs de saut. */
  idsDeCreation: manquantes.filter((constat) => constat.correction).map((constat) => constat.id),
};

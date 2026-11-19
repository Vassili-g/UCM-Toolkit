/** Les cartes des liens de brands et utility, calculées par C82 sur les palettes inventées de la fixture du kit. */
const path = require('path');
const { constructeur, alias, compiler } = require('../etats/aide.cjs');
const KIT = path.resolve(__dirname, '../../../kit').replace(/\\/g, '/');
const fs = require('fs');
const entree = path.resolve(__dirname, `../../dist/galerie-liens-entree.${process.pid}.ts`);
fs.writeFileSync(entree, `
  export { controlerLIntegriteUcm } from '${KIT}/src/controles/index';
  export { catalogueDeLiens } from '${KIT}/tests/fixtures/tokensDeLiens';
  export { avecEcriture } from '${KIT}/tests/fixtures/catalogueDeStructure';
`);
let kit;
try { kit = compiler(entree, 'galerie-liens'); } finally { fs.rmSync(entree, { force: true }); }
const { controlerLIntegriteUcm, catalogueDeLiens, avecEcriture } = kit;
const ecriture = avecEcriture('minuscules', 'tiret');
const sans = (catalogue, retire) => ({ ...catalogue, variables: catalogue.variables.filter((variable) => !retire(variable)) });
const modifier = (catalogue, cle, changer) => ({ ...catalogue, variables: catalogue.variables.map((variable) => variable.cle === cle ? changer(variable) : variable) });

function releveDuCatalogue(catalogue) {
  const c = constructeur('Palettes de démonstration');
  for (const collection of catalogue.collections) c.collection(collection.cle, collection.nom, collection.modes.map((mode) => mode.nom));
  for (const variable of catalogue.variables) {
    const collection = catalogue.collections.find((candidate) => candidate.cle === variable.collection);
    const valeurs = Object.fromEntries(Object.entries(variable.valeurs ?? {}).map(([mode, valeur]) => {
      const nom = collection.modes.find((candidate) => candidate.id === mode).nom;
      if ('alias' in valeur) return [nom, alias(valeur.alias)];
      return [nom, { nature: 'couleur', couleur: valeur.valeur }];
    }));
    c.variable(variable.cle, variable.collection, variable.nom, variable.type, valeurs, { portees: [] });
  }
  return c.releve();
}

const base = catalogueDeLiens();
const cas = (catalogue, genre) => ({
  releve: releveDuCatalogue(catalogue),
  constats: controlerLIntegriteUcm(catalogue, { ecriture }).filter((constat) => constat.faits.genre === genre),
});
const sansLien = sans(base, (variable) => variable.cle === 'brands|primary/light/300');
const sansMode = modifier(base, 'brands|secondary/dark/700', (variable) => ({ ...variable, valeurs: { 'marque-1': variable.valeurs['marque-1'] } }));
const mauvaisCran = modifier(base, 'utility|success/vivid/light/300', (variable) => ({ ...variable, valeurs: { base: { alias: 'primitives|color/prairie/vivid/light/400' } } }));
const sansBranche = sans(base, (variable) => variable.collection === 'brands' && variable.nom.startsWith('secondary/'));
const sansCharte = sans(base, (variable) => variable.cle === 'brands|identity/primary');
const sansCran = sans(sansLien, (variable) => variable.cle === 'primitives|color/cobalt/light/300');
const sansPalette = sans(sansBranche, (variable) => variable.collection === 'primitives' && !variable.nom.includes('/soft/') && !variable.nom.includes('/vivid/'));

module.exports = {
  lienManquant: cas(sansLien, 'lien-manquant'),
  modeManquant: cas(sansMode, 'lien-manquant'),
  lienACorriger: cas(mauvaisCran, 'lien-a-corriger'),
  paletteAChoisir: cas(sansBranche, 'palette-a-choisir'),
  charteAChoisir: cas(sansCharte, 'charte-a-choisir'),
  rampeACompleter: cas(sansCran, 'rampe-a-completer'),
  paletteACreer: cas(sansPalette, 'rampe-a-completer'),
};

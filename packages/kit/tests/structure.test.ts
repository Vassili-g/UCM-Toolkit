import assert from 'node:assert/strict';
import test from 'node:test';
import { controlerLaStructure as structureDuComposant, controlerLaStructureParEtapes, controlerLeCatalogue, type CatalogueDeReference, type ReleveDeComposant } from '../src/controles/index.js';

const modes = [{ id: 'light', nom: 'Light' }, { id: 'dark', nom: 'Dark' }];
const collection = (cle: string, role: 'theme' | 'components' | 'layout' | 'brands') => ({ cle, nom: cle, role, modes, etat: 'lue' as const });
function cat(collections: CatalogueDeReference['collections'], variables: CatalogueDeReference['variables']): CatalogueDeReference {
  return { version: 1, library: null, collections, variables };
}
function releve(nom = 'Button'): ReleveDeComposant {
  return { version: 1, jeu: { cle: nom, id: nom, nom }, proprietes: [
    { nom: 'Palette', type: 'VARIANT', valeurs: ['primary', 'secondary', 'tertiary'], defaut: 'primary' },
    { nom: 'Style', type: 'VARIANT', valeurs: ['contained'], defaut: 'contained' },
    { nom: 'State', type: 'VARIANT', valeurs: ['default'], defaut: 'default' },
  ], variants: [], lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb' };
}
const variable = (cle: string, nom: string, collection: string, valeurs?: CatalogueDeReference['variables'][number]['valeurs']) => ({ cle, nom, collection, type: 'COLOR' as const, etat: 'presente' as const, valeurs });

const controlerLaStructure = (r: ReleveDeComposant, c: CatalogueDeReference) => [...structureDuComposant(r, c), ...controlerLeCatalogue(c)];

test('la structure par étapes conserve les questions de valeurs vides avant les contournements', () => {
  const r = releve();
  const c = cat([collection('components', 'components'), collection('brands', 'brands'), collection('theme', 'theme')], [
    variable('p', 'Button/color/primary/contained/default/ring', 'components', { dark: { valeur: null } }),
    variable('s', 'Button/color/secondary/contained/default/ring', 'components', { dark: { valeur: '#111' } }),
    variable('t', 'Button/color/tertiary/contained/default/ring', 'components', { dark: { valeur: '#222' } }),
    variable('primary', 'Button/color/primary/contained/default/background', 'components', { dark: { alias: 'theme-primary' } }),
    variable('secondary', 'Button/color/secondary/contained/default/background', 'components', { dark: { alias: 'brand-secondary' } }),
    variable('theme-primary', 'primary/solid/default', 'theme'),
    variable('theme-secondary', 'secondary/solid/default', 'theme'),
    variable('brand-secondary', 'secondary/light/700', 'brands'),
  ]);
  const attendu = [
    {
      id: 'C63:p:dark:vide', code: 'C63', type: 'verifier', famille: 'liaisons', variants: [], layers: [],
      faits: { variable: 'Button/color/primary/contained/default/ring', mode: 'Dark', soeurs: 2 },
      question: {
        id: 'C63:p:dark:vide', candidats: [
          { cle: 's', nom: 'Button/color/secondary/contained/default/ring' }, { cle: 't', nom: 'Button/color/tertiary/contained/default/ring' },
        ], indice: 'Les autres palettes de ce groupe ont une valeur dans ce mode.',
      },
    },
    {
      id: 'C63:secondary:dark:theme', code: 'C63', type: 'corriger', famille: 'liaisons', variants: [], layers: [],
      faits: { variable: 'Button/color/secondary/contained/default/background', mode: 'Dark', cible: 'secondary/light/700' },
      correction: {
        id: 'C63:secondary:dark:theme', sorte: 'alias-de-mode', cible: { variable: 'secondary', mode: 'dark' }, avant: 'brand-secondary',
        apres: { cle: 'theme-secondary', nom: 'secondary/solid/default' },
        aRelire: { axes: { mode: 'Dark' }, regle: 'Un composant UCM vise le thème, pas une primitive à segment de mode.', avant: 'brand-secondary' },
      },
    },
  ];
  const epuiser = () => {
    const calcul = controlerLaStructureParEtapes(r, c);
    let etape = calcul.next();
    while (!etape.done) etape = calcul.next();
    return etape.value;
  };
  assert.deepEqual(epuiser(), attendu);
  assert.deepEqual(structureDuComposant(r, c), attendu);
  c.variables[2].etat = 'non-chargee';
  r.lecture.layersNonLus = 1;
  assert.deepEqual(epuiser(), attendu.slice(1));
  assert.deepEqual(structureDuComposant(r, c), attendu.slice(1));
});

test('C63 compare les scopes au chemin complet du thème', () => {
  const c = cat([collection('theme', 'theme')], [
    { ...variable('default', 'success/surface/default', 'theme'), scopes: ['TEXT_FILL'] },
    { ...variable('foreground', 'success/surface/foreground', 'theme'), scopes: ['FRAME_FILL', 'SHAPE_FILL'] },
  ]);
  const resultats = controlerLaStructure(releve(), c).filter((constat) => constat.correction?.sorte === 'scope');
  assert.equal(resultats.length, 2);
  assert.equal(resultats.find(({ id }) => id.startsWith('C63:default'))?.correction?.apres.nom, 'FRAME_FILL,SHAPE_FILL');
  assert.equal(resultats.find(({ id }) => id.startsWith('C63:foreground'))?.correction?.apres.nom, 'SHAPE_FILL,TEXT_FILL');
});

test('C63 questionne une valeur vide si deux palettes sœurs sont renseignées', () => {
  const c = cat([collection('components', 'components')], [
    variable('p', 'Button/color/primary/contained/default/ring', 'components', { dark: { valeur: null } }),
    variable('s', 'Button/color/secondary/contained/default/ring', 'components', { dark: { valeur: '#111' } }),
    variable('t', 'Button/color/tertiary/contained/default/ring', 'components', { dark: { valeur: '#222' } }),
  ]);
  const resultat = controlerLaStructure(releve(), c).find(({ faits }) => faits.genre === undefined && faits.variable === 'Button/color/primary/contained/default/ring');
  assert.equal(resultat?.question?.candidats?.length, 2);
  const incomplet = cat([collection('components', 'components')], [
    variable('p', 'Button/color/primary/contained/default/ring', 'components', { dark: { valeur: null } }),
    variable('s', 'Button/color/secondary/contained/default/ring', 'components', { dark: { valeur: '#111' } }),
  ]);
  assert.equal(controlerLaStructure(releve(), incomplet).some(({ faits }) => faits.genre === undefined && faits.variable === 'Button/color/primary/contained/default/ring'), false);
});

test('C63 signale seulement les doublons numériques de sizing', () => {
  const c = cat([collection('layout', 'layout')], [
    { ...variable('a', 'sizing/1,5', 'layout'), type: 'FLOAT', valeurs: { light: { valeur: 6 } } },
    { ...variable('b', 'sizing/2', 'layout'), type: 'FLOAT', valeurs: { light: { valeur: 6 } } },
  ]);
  assert.equal(controlerLaStructure(releve(), c).some(({ question }) => question?.candidats?.length === 2), true);
  c.variables[1].valeurs = { light: { valeur: 8 } };
  assert.equal(controlerLaStructure(releve(), c).some(({ question }) => question?.candidats?.length === 2), false);
});

test('C63 redirige une primitive de composant vers le thème correspondant unique', () => {
  const c = cat([collection('components', 'components'), collection('brands', 'brands'), collection('theme', 'theme')], [
    variable('primary', 'Button/color/primary/contained/default/background', 'components', { dark: { alias: 'theme-primary' } }),
    variable('secondary', 'Button/color/secondary/contained/default/background', 'components', { dark: { alias: 'brand-secondary' } }),
    variable('theme-primary', 'primary/solid/default', 'theme'),
    variable('theme-secondary', 'secondary/solid/default', 'theme'),
    variable('brand-secondary', 'secondary/light/700', 'brands'),
  ]);
  const resultat = controlerLaStructure(releve(), c).find(({ id }) => id.startsWith('C63:secondary:'));
  assert.equal(resultat?.correction?.avant, 'brand-secondary');
  assert.equal(resultat?.correction?.apres.cle, 'theme-secondary');
  const sansCible = cat(c.collections, c.variables.filter(({ cle }) => cle !== 'theme-secondary'));
  assert.equal(controlerLaStructure(releve(), sansCible).find(({ id }) => id.startsWith('C63:secondary:'))?.correction, undefined);
});

test('le catalogue relève un alias supprimé et se tait quand sa cible existe', () => {
  const c = cat([collection('theme', 'theme')], [
    variable('source', 'success/surface/default', 'theme', { light: { alias: 'removed' } }),
  ]);
  const trouve = controlerLeCatalogue(c).find(({ faits }) => faits.genre === 'alias-supprime');
  assert.equal(trouve?.faits.variable, 'success/surface/default');
  assert.equal(trouve?.faits.cle, 'source');
  c.variables.push(variable('removed', 'primitives/color/blue/500', 'theme'));
  assert.equal(controlerLeCatalogue(c).some(({ faits }) => faits.genre === 'alias-supprime'), false);
});

test('le catalogue relève une library inactive et se tait sans alias absent', () => {
  const c = cat([collection('components', 'components'), { ...collection('remote', 'theme'), etat: 'inaccessible' }], [
    variable('source', 'Button/color/primary/background', 'components', { light: { alias: 'remote' } }),
    { ...variable('remote', 'primary/solid/default', 'remote'), etat: 'inaccessible' },
  ]);
  c.library = { cle: 'lib', nom: 'Bibliothèque' };
  assert.equal(controlerLeCatalogue(c).find(({ faits }) => faits.genre === 'library-inactive')?.faits.library, 'Bibliothèque');
  c.variables[1].etat = 'presente';
  c.collections[1].etat = 'lue';
  assert.equal(controlerLeCatalogue(c).some(({ faits }) => faits.genre === 'library-inactive'), false);
  c.variables[0].valeurs = { light: { alias: 'absent' } };
  assert.equal(controlerLeCatalogue(c).some(({ faits }) => faits.genre === 'alias-supprime'), true);
});

test('le catalogue relève un mode sans valeur et se tait quand la valeur existe', () => {
  const c = cat([collection('theme', 'theme')], [variable('source', 'success/surface/default', 'theme', { light: { valeur: '#fff' } })]);
  assert.equal(controlerLeCatalogue(c).find(({ faits }) => faits.genre === 'sans-valeur-en-mode')?.faits.mode, 'Dark');
  c.variables[0].valeurs = { light: { valeur: '#fff' }, dark: { valeur: '#000' } };
  assert.equal(controlerLeCatalogue(c).some(({ faits }) => faits.genre === 'sans-valeur-en-mode'), false);
});

test('le catalogue relève une couleur sans alias et se tait pour un alias', () => {
  const c = cat([collection('components', 'components')], [
    variable('source', 'Button/color/primary/background', 'components', { light: { valeur: '#fff' } }),
  ]);
  assert.equal(controlerLeCatalogue(c).find(({ faits }) => faits.genre === 'couleur-sans-alias')?.faits.valeur, '#fff');
  c.variables.push(variable('target', 'primitives/color/white/500', 'components'));
  c.variables[0].valeurs = { light: { alias: 'target' } };
  assert.equal(controlerLeCatalogue(c).some(({ faits }) => faits.genre === 'couleur-sans-alias'), false);
});

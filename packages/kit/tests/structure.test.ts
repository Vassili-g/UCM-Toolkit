import assert from 'node:assert/strict';
import test from 'node:test';
import { controlerCouches, controlerLaStructure as structureDuComposant, controlerLaStructureParEtapes, controlerLeCatalogue, controlerLesAliasesManquants, type CatalogueDeReference, type ReleveDeComposant } from '../src/controles/index.js';

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
  assert.equal(resultats.find(({ id }) => id.startsWith('C63:foreground'))?.correction?.apres.nom, 'SHAPE_FILL,STROKE_COLOR,TEXT_FILL');
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

test('C63 compare les scopes d’un nom du thème écrit en majuscules ou avec une autre casse', () => {
  const c = cat([collection('theme', 'theme')], [
    { ...variable('default', 'Success/Surface/Default', 'theme'), scopes: ['TEXT_FILL'] },
    { ...variable('foreground', 'SUCCESS/SURFACE/FOREGROUND', 'theme'), scopes: ['FRAME_FILL'] },
    { ...variable('inconnue', 'Success/Surface/inconnue', 'theme'), scopes: ['TEXT_FILL'] },
  ]);
  const resultats = controlerLaStructure(releve(), c).filter((constat) => constat.correction?.sorte === 'scope');
  assert.deepEqual(resultats.map(({ id }) => id).sort(), ['C63:default:scopes', 'C63:foreground:scopes']);
  assert.equal(resultats.find(({ id }) => id.startsWith('C63:default'))?.correction?.apres.nom, 'FRAME_FILL,SHAPE_FILL');
});

test('controlerLesAliasesManquants rend un constat par mode dont la cible manque, et rien d’autre', () => {
  const c = cat([collection('theme', 'theme')], [
    variable('source', 'success/surface/default', 'theme', { light: { alias: 'removed' }, dark: { alias: 'removed' } }),
    variable('sans-valeur', 'success/surface/hover', 'theme', { light: { valeur: '#fff' } }),
  ]);
  const constats = controlerLesAliasesManquants(c);
  assert.deepEqual(constats.map(({ faits }) => [faits.genre, faits.cle, faits.mode]), [
    ['alias-supprime', 'source', 'Light'],
    ['alias-supprime', 'source', 'Dark'],
  ]);
  c.variables.push(variable('removed', 'primitives/color/blue/500', 'theme'));
  assert.deepEqual(controlerLesAliasesManquants(c), []);
});

test('une variable dont la collection manque au catalogue ne fait pas lever les contrôles du catalogue', () => {
  const c = cat([collection('theme', 'theme')], [
    variable('orpheline', 'success/surface/default', 'disparue', { light: { alias: 'removed' } }),
  ]);
  assert.deepEqual(controlerLesAliasesManquants(c), []);
  assert.doesNotThrow(() => controlerLeCatalogue(c));
});

const flottant = (cle: string, nom: string, valeurs: CatalogueDeReference['variables'][number]['valeurs']) => ({ ...variable(cle, nom, 'layout', valeurs), type: 'FLOAT' as const });
const doublonsDEchelle = (c: CatalogueDeReference) => controlerLeCatalogue(c).filter(({ faits }) => typeof faits.doublons === 'number');

test('C63 compare les crans de toute échelle de layout, alias résolus, à 1e-6 près (Q-F2-8, N-33)', () => {
  const modeUnique = [{ id: 'light', nom: 'Light' }];
  const layout = { cle: 'layout', nom: 'layout', role: 'layout' as const, modes: modeUnique, etat: 'lue' as const };
  const primitives = { cle: 'primitives', nom: 'primitives', role: 'primitives' as const, modes: modeUnique, etat: 'lue' as const };
  // Une échelle `radius` dont deux crans valent 8.
  const radius = cat([layout], [flottant('md', 'radius/md', { light: { valeur: 8 } }), flottant('lg', 'radius/lg', { light: { valeur: 8 } }), flottant('sm', 'radius/sm', { light: { valeur: 4 } })]);
  assert.deepEqual(doublonsDEchelle(radius).map(({ question }) => question?.candidats?.map(({ cle }) => cle)), [['md', 'lg']]);
  // Deux alias vers des primitives de même valeur.
  const alias = cat([layout, primitives], [
    flottant('s1', 'spacing/1', { light: { alias: 'a' } }), flottant('s2', 'spacing/2', { light: { alias: 'b' } }),
    { ...flottant('a', 'spacing/base-a', { light: { valeur: 4 } }), collection: 'primitives' }, { ...flottant('b', 'spacing/base-b', { light: { valeur: 4 } }), collection: 'primitives' },
  ]);
  assert.equal(doublonsDEchelle(alias).length, 1);
  // 0,1 + 0,2 et 0,3 sont le même cran.
  const decimaux = cat([layout], [flottant('x', 'sizing/1', { light: { valeur: 0.1 + 0.2 } }), flottant('y', 'sizing/2', { light: { valeur: 0.3 } })]);
  assert.equal(doublonsDEchelle(decimaux).length, 1);
  const eloignes = cat([layout], [flottant('x', 'sizing/1', { light: { valeur: 0.3 } }), flottant('y', 'sizing/2', { light: { valeur: 0.30001 } })]);
  assert.equal(doublonsDEchelle(eloignes).length, 0);
});

test('C63 rend une information par collection quand la cible d’un alias est inaccessible et qu’aucune library n’est choisie (Q-F2-8)', () => {
  const c = cat([collection('components', 'components'), { ...collection('remote', 'theme'), etat: 'inaccessible' }], [
    variable('source', 'Button/color/primary/background', 'components', { light: { alias: 'remote' }, dark: { alias: 'remote' } }),
    { ...variable('remote', 'primary/solid/default', 'remote'), etat: 'inaccessible' },
  ]);
  const informations = controlerLeCatalogue(c).filter(({ faits }) => faits.genre === 'cible-inaccessible');
  assert.equal(informations.length, 1);
  assert.equal(informations[0].type, 'info');
  assert.deepEqual([informations[0].faits.collection, informations[0].faits.cibles, informations[0].faits.alias], ['remote', 1, 2]);
  assert.equal(controlerLeCatalogue(c).some(({ faits }) => faits.genre === 'library-inactive'), false);
});

const themeEtBrands = (extra: CatalogueDeReference['variables']) => cat([collection('components', 'components'), collection('brands', 'brands'), collection('theme', 'theme')], [
  variable('secondary', 'Button/color/secondary/contained/default/background', 'components', { dark: { alias: 'brand-secondary' } }),
  variable('brand-secondary', 'secondary/light/700', 'brands'),
  ...extra,
]);
const contournement = (c: CatalogueDeReference) => controlerLaStructure(releve(), c).find(({ id }) => id.startsWith('C63:secondary:'));

test('C63 theme vise la variable de la palette dont le cran de la table est celui du token, sans regarder les sœurs (Q-F3-5, N-16)', () => {
  const c = themeEtBrands([
    variable('primary', 'Button/color/primary/contained/default/background', 'components', { dark: { alias: 'theme-globale' } }),
    variable('theme-globale', 'disabled/background', 'theme'),
    variable('theme-secondary', 'secondary/solid/default', 'theme'),
    variable('theme-secondary-hover', 'secondary/solid/hover', 'theme'),
  ]);
  const resultat = contournement(c);
  assert.equal(resultat?.correction?.sorte, 'alias-de-mode');
  assert.equal(resultat?.correction?.apres.cle, 'theme-secondary');
});

test('C63 theme pose une question sans présélection quand plusieurs rôles de la palette visent le cran', () => {
  const resultat = contournement(themeEtBrands([
    variable('a', 'secondary/solid/default', 'theme'),
    variable('b', 'secondary/surface/foreground', 'theme'),
  ]));
  assert.equal(resultat?.correction, undefined);
  assert.deepEqual(resultat?.question?.candidats?.map(({ cle }) => cle).sort(), ['a', 'b']);
});

test('C63 theme pose une question quand deux variables du thème portent le même rôle au cran (S2-4)', () => {
  const resultat = contournement(themeEtBrands([
    variable('a', 'secondary/solid/default', 'theme'),
    variable('a-bis', 'secondary/solid/default', 'theme'),
  ]));
  assert.equal(resultat?.correction, undefined);
  assert.deepEqual(resultat?.question?.candidats?.map(({ cle }) => cle).sort(), ['a', 'a-bis']);
});

const liaisonsDuToken = (cle: string): ReleveDeComposant => ({
  ...releve(),
  variants: [{
    id: 'secondary', nom: 'secondary', valeurs: { Palette: 'secondary' }, modesEffectifs: {}, layers: [{
      id: 'fond', nom: 'fond', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 100, hauteur: 40 },
      peintures: [], valeursEnDur: [], liaisons: [{ champ: 'fills', indice: 0, porteur: 'fond', variable: { id: cle, cle, nom: cle, collection: 'components', distante: false } }],
    }],
  }],
});

test('C20 se tait sur une liaison dont le token reçoit déjà C63 theme, et C63 garde sa correction au cran (N-08)', () => {
  const c = themeEtBrands([variable('theme-secondary', 'secondary/solid/default', 'theme')]);
  const r = liaisonsDuToken('secondary');
  assert.deepEqual(controlerCouches(r, c).map(({ code }) => code), []);
  const duTheme = (catalogue: CatalogueDeReference) => controlerLaStructure(r, catalogue).find(({ id }) => id === 'C63:secondary:dark:theme');
  assert.equal(duTheme(c)?.correction?.apres.cle, 'theme-secondary');
  // Un alias vers un brands sans segment de mode n'est pas un contournement du thème : C20 le juge toujours.
  const sansMode = cat(c.collections, c.variables.map((entree) => (entree.cle === 'brand-secondary' ? { ...entree, nom: 'secondary-700' } : entree)));
  assert.deepEqual(controlerCouches(r, sansMode).map(({ code }) => code), ['C20']);
  assert.equal(duTheme(sansMode), undefined);
});

test('C63 theme ne corrige pas une palette dont le sens est partagé entre les deux tables', () => {
  const c = themeEtBrands([
    variable('a', 'secondary/solid/default', 'theme'),
    variable('hover', 'secondary/solid/hover', 'theme', { light: { alias: 'b800' } }),
    variable('pressed', 'secondary/solid/pressed', 'theme', { light: { alias: 'b500' } }),
    variable('b800', 'secondary/light/800', 'brands'),
    variable('b500', 'secondary/light/500', 'brands'),
  ]);
  const resultat = contournement(c);
  assert.equal(resultat?.correction, undefined);
  assert.deepEqual(resultat?.question?.candidats?.map(({ cle }) => cle), ['a']);
});

test('C63 vide : une palette sœur en alias compte comme une sœur qui a une valeur (N-15)', () => {
  const c = cat([collection('components', 'components'), collection('theme', 'theme')], [
    variable('p', 'Button/color/primary/contained/default/ring', 'components', { dark: { valeur: null } }),
    variable('s', 'Button/color/secondary/contained/default/ring', 'components', { dark: { alias: 'cible' } }),
    variable('t', 'Button/color/tertiary/contained/default/ring', 'components', { dark: { alias: 'cible' } }),
    variable('cible', 'primary/solid/default', 'theme'),
  ]);
  const vide = controlerLaStructure(releve(), c).find(({ id }) => id === 'C63:p:dark:vide');
  assert.deepEqual(vide?.question?.candidats.map(({ cle }) => cle), ['s', 't']);
  const alias = cat(c.collections, c.variables.map((entree) => (entree.cle === 'p' ? { ...entree, valeurs: { dark: { alias: 'cible' } } } : entree)));
  assert.equal(controlerLaStructure(releve(), alias).some(({ id }) => id.endsWith(':vide')), false);
});

test('alias-supprime ne cite que la voisine de même rôle dans une autre palette (N-28)', () => {
  const c = cat([collection('theme', 'theme')], [
    variable('source', 'primary/solid/default', 'theme', { light: { alias: 'removed' } }),
    variable('meme-dossier', 'primary/surface/default', 'theme', { light: { alias: 'cible' } }),
    variable('meme-segment', 'secondary/surface/default', 'theme', { light: { alias: 'cible' } }),
    variable('cible', 'secondary/solid/default-cible', 'theme'),
  ]);
  const sans = controlerLeCatalogue(c).find(({ faits }) => faits.genre === 'alias-supprime');
  assert.equal(sans?.faits.voisine, undefined);
  c.variables.push(variable('bonne', 'secondary/solid/default', 'theme', { light: { alias: 'cible' } }));
  const avec = controlerLeCatalogue(c).find(({ faits }) => faits.genre === 'alias-supprime');
  assert.deepEqual([avec?.faits.voisine, avec?.faits.cibleDeLaVoisine], ['secondary/solid/default', 'secondary/solid/default-cible']);
  const brands = cat([collection('brands', 'brands')], [
    variable('source', 'primary/light/700', 'brands', { light: { alias: 'removed' } }),
    variable('autre-cran', 'primary/light/800', 'brands', { light: { alias: 'cible' } }),
    variable('autre-mode', 'primary/dark/700', 'brands', { light: { alias: 'cible' } }),
    variable('cible', 'secondary/light/700-cible', 'brands'),
  ]);
  assert.equal(controlerLeCatalogue(brands).find(({ faits }) => faits.genre === 'alias-supprime')?.faits.voisine, undefined);
  brands.variables.push(variable('bonne', 'secondary/light/700', 'brands', { light: { alias: 'cible' } }));
  assert.equal(controlerLeCatalogue(brands).find(({ faits }) => faits.genre === 'alias-supprime')?.faits.voisine, 'secondary/light/700');
});

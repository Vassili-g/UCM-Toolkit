import assert from 'node:assert/strict';
import test from 'node:test';
import { controlerLeTheme as fondsDuComposant, controlerLeThemeParEtapes, controlerLesModes } from '../src/controles/theme.js';
import type { CatalogueDeReference, LayerLu, ReleveDeComposant } from '../src/controles/index.js';
import { MODE_DARK, MODE_LIGHT, catalogueDeStructure, cleDeLaFixture } from './fixtures/catalogueDeStructure.js';

const modes = [{ id: 'light', nom: 'Light' }, { id: 'dark', nom: 'Dark' }];
function cat(collections: CatalogueDeReference['collections'], variables: CatalogueDeReference['variables']): CatalogueDeReference {
  return { version: 1, library: null, collections, variables };
}
function releve(layer: LayerLu): ReleveDeComposant {
  return { version: 1, jeu: { cle: 'Alert', id: 'Alert', nom: 'Alert' }, proprietes: [],
    variants: [{ id: 'v1', nom: 'Alert', valeurs: {}, modesEffectifs: {}, layers: [layer] }],
    lecture: { layersLus: 1, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb' };
}
function layer(id: string, parent: string | null, name: string, variable?: { key: string; name: string; collection: string }, background?: { key: string; name: string; collection: string }): LayerLu {
  return {
    id, nom: name, type: 'TEXT', parent, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 10, hauteur: 10 },
    peintures: [{ champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' }], valeursEnDur: [],
    liaisons: [
      ...(variable ? [{ champ: 'fills', indice: 0, porteur: id, variable: { id: variable.key, cle: variable.key, nom: variable.name, collection: variable.collection, distante: false } }] : []),
      ...(background ? [{ champ: 'fills', indice: 0, porteur: id, variable: { id: background.key, cle: background.key, nom: background.name, collection: background.collection, distante: false } }] : []),
    ],
  };
}
const collection = (cle: string, role: 'theme' | 'brands', ms = modes) => ({ cle, nom: cle, role, modes: ms, etat: 'lue' as const });

const composants = { cle: 'comp', nom: 'comp', role: 'components' as const, modes, etat: 'lue' as const };
/** Un token de `components` aliasé, dans chaque mode, à une variable. */
const jeton = (cle: string, nom: string, vers: string): CatalogueDeReference['variables'][number] =>
  ({ cle, nom, collection: 'comp', type: 'COLOR', etat: 'presente', valeurs: { light: { alias: vers }, dark: { alias: vers } } });
const liaisonDeJeton = (cle: string, nom: string) => ({ key: cle, name: nom, collection: 'comp' });

const controlerLeTheme = (r: Parameters<typeof fondsDuComposant>[0], c: Parameters<typeof fondsDuComposant>[1]) => [...fondsDuComposant(r, c), ...controlerLesModes(c)];

test('le thème par étapes conserve les constats, corrections et questions dans l’ordre des plages', () => {
  const texte = layer('text', null, 'message', liaisonDeJeton('tok-surface', 'alert/color/success-surface-foreground'));
  texte.texte = { style: null, plages: [{
    debut: 5, fin: 10, fontSize: 14, fontWeight: 400, peintures: [],
    liaisons: [{
      champ: 'fills', porteur: 'text', plage: { debut: 5, fin: 10 },
      variable: { id: 'tok-warning', cle: 'tok-warning', nom: 'alert/color/warning-surface-foreground', collection: 'comp', distante: false },
    }],
  }] };
  const r = releve(texte);
  const c = cat([collection('themes', 'theme'), composants], [
    { cle: 'fg-surface', nom: 'success/surface/foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
    { cle: 'fg-page', nom: 'success/page/foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
    { cle: 'warning', nom: 'warning/surface/foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
    jeton('tok-surface', 'alert/color/success-surface-foreground', 'fg-surface'),
    jeton('tok-page', 'alert/color/success-page-foreground', 'fg-page'),
    jeton('tok-warning', 'alert/color/warning-surface-foreground', 'warning'),
  ]);
  const attendu = [
    {
      id: 'C59:v1:text:fills:0', code: 'C59', type: 'corriger', famille: 'liaisons', variants: ['v1'], layers: ['text'],
      faits: { variable: 'alert/color/success-surface-foreground', champ: 'fills', calque: 'message', indice: 0 },
      correction: {
        id: 'C59:v1:text:fills:0', sorte: 'liaison', cible: { layer: 'text', champ: 'fills', indice: 0, variable: 'tok-surface' },
        avant: 'alert/color/success-surface-foreground', apres: { cle: 'tok-page', nom: 'alert/color/success-page-foreground' },
        aRelire: { regle: 'Un texte lié à surface/foreground doit être posé sur un fond de surface visible.', avant: 'alert/color/success-surface-foreground' },
      },
    },
    {
      id: 'C59:v1:text:fills:5', code: 'C59', type: 'corriger', famille: 'liaisons', variants: ['v1'], layers: ['text'],
      faits: { variable: 'alert/color/warning-surface-foreground', champ: 'fills', calque: 'message', plageDebut: 5, plageFin: 10 },
      question: { id: 'C59:v1:text:fills:5', candidats: [] },
    },
  ];
  const calcul = controlerLeThemeParEtapes(r, c);
  let resultat = calcul.next();
  while (!resultat.done) resultat = calcul.next();
  assert.deepEqual(resultat.value, attendu);
  assert.deepEqual(fondsDuComposant(r, c), attendu);
});

/** Le catalogue de la plupart des cas : le thème `success`, un token du composant par variable utile. */
const catalogueDeBase = (...enPlus: CatalogueDeReference['variables']) => cat([collection('themes', 'theme'), composants], [
  { cle: 'fg-surface', nom: 'success/surface/foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
  { cle: 'fg-page', nom: 'success/page/foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
  { cle: 'bg', nom: 'success/surface/default', collection: 'themes', type: 'COLOR', etat: 'presente' },
  { cle: 'bg-subtle', nom: 'success/surface/subtle', collection: 'themes', type: 'COLOR', etat: 'presente' },
  jeton('tok-surface', 'alert/color/surface-foreground', 'fg-surface'),
  jeton('tok-page', 'alert/color/page-foreground', 'fg-page'),
  jeton('tok-bg', 'alert/color/background', 'bg'),
  jeton('tok-subtle', 'alert/color/subtle', 'bg-subtle'),
  ...enPlus,
]);
const texteDeSurface = () => layer('text', null, 'message', liaisonDeJeton('tok-surface', 'alert/color/surface-foreground'));

test('C59 suit l’alias du token du composant et propose le token qui vise page/foreground', () => {
  const resultat = controlerLeTheme(releve(texteDeSurface()), catalogueDeBase()).find(({ code }) => code === 'C59');
  assert.equal(resultat?.correction?.apres.cle, 'tok-page');
  assert.equal(resultat?.correction?.avant, 'alert/color/surface-foreground');
  assert.equal(resultat?.correction?.aRelire.avant, 'alert/color/surface-foreground');
  assert.deepEqual(resultat?.correction?.cible, { layer: 'text', champ: 'fills', indice: 0, variable: 'tok-surface' });
  assert.deepEqual(resultat?.faits, { variable: 'alert/color/surface-foreground', champ: 'fills', calque: 'message', indice: 0 });
});

test('C59 ne juge pas une liaison directe à theme : C80 en répond seul', () => {
  const r = releve(layer('text', null, 'message', { key: 'fg-surface', name: 'success/surface/foreground', collection: 'themes' }));
  assert.equal(controlerLeTheme(r, catalogueDeBase()).some(({ code }) => code === 'C59'), false);
});

test('C59 suit une chaîne de tokens du composant jusqu’au thème', () => {
  const r = releve(layer('text', null, 'message', liaisonDeJeton('tok-relais', 'alert/color/relais')));
  const resultat = controlerLeTheme(r, catalogueDeBase(jeton('tok-relais', 'alert/color/relais', 'tok-surface'))).find(({ code }) => code === 'C59');
  assert.equal(resultat?.correction?.apres.cle, 'tok-page');
});

test('C59 pose une question, sans correction, quand deux tokens du composant visent page/foreground', () => {
  const resultat = controlerLeTheme(releve(texteDeSurface()), catalogueDeBase(jeton('tok-page-bis', 'alert/color/page-foreground-bis', 'fg-page'))).find(({ code }) => code === 'C59');
  assert.equal(resultat?.correction, undefined);
  assert.deepEqual(resultat?.question?.candidats.map(({ cle }) => cle), ['tok-page', 'tok-page-bis']);
});

test('C59 ne propose pas le token page/foreground d’un autre composant', () => {
  const resultat = controlerLeTheme(releve(texteDeSurface()), catalogueDeBase(jeton('tok-autre', 'button/color/page-foreground', 'fg-page'))).find(({ code }) => code === 'C59');
  assert.equal(resultat?.correction?.apres.cle, 'tok-page');
});

test('C59 pose une question avec la localisation exacte de la peinture concernée', () => {
  const cible = texteDeSurface();
  cible.liaisons = [0, 1].map((rang) => ({
    ...cible.liaisons[0], indice: undefined, plage: rang === 0 ? { debut: 0, fin: 5 } : { debut: 5, fin: 10 },
  }));
  const resultat = controlerLeTheme(releve(cible), catalogueDeBase(jeton('tok-page-bis', 'alert/color/page-foreground-bis', 'fg-page'))).filter(({ code }) => code === 'C59');
  assert.equal(resultat.length, 2);
  assert.deepEqual(resultat.map(({ faits }) => [faits.champ, faits.plageDebut, faits.plageFin]), [['fills', 0, 5], ['fills', 5, 10]]);
  assert.equal(resultat[1].correction, undefined);
  assert.deepEqual(resultat[1].question?.candidats.map(({ cle }) => cle), ['tok-page', 'tok-page-bis']);
});

test('C59 énumère une plage une seule fois quand la liaison figure aussi parmi celles du layer', () => {
  const texte = texteDeSurface();
  const liaison = { ...texte.liaisons[0], indice: undefined, plage: { debut: 0, fin: 5 } };
  texte.liaisons = [liaison];
  texte.texte = { style: null, plages: [{ debut: 0, fin: 5, fontSize: 14, fontWeight: 400, peintures: [], liaisons: [liaison] }] };
  const resultat = controlerLeTheme(releve(texte), catalogueDeBase()).filter(({ code }) => code === 'C59');
  assert.deepEqual(resultat.map(({ id }) => id), ['C59:v1:text:fills:0']);
});

test('C59 ne juge pas une liaison que l’instance tient sans changement de son composant principal', () => {
  const texte = texteDeSurface();
  texte.liaisons[0].provenance = 'composant-principal';
  assert.equal(controlerLeTheme(releve(texte), catalogueDeBase()).some(({ code }) => code === 'C59'), false);
});

test('C59 compte surface/subtle parmi les fonds de surface, lié directement ou par un token du composant', () => {
  for (const fond of [{ key: 'bg-subtle', name: 'success/surface/subtle', collection: 'themes' }, liaisonDeJeton('tok-subtle', 'alert/color/subtle')]) {
    const r = releve(layer('root', null, 'container', undefined, fond));
    r.variants[0].layers.push(layer('text', 'root', 'message', liaisonDeJeton('tok-surface', 'alert/color/surface-foreground')));
    assert.equal(controlerLeTheme(r, catalogueDeBase()).some(({ code }) => code === 'C59'), false, fond.name);
  }
});

test('C59 reconnaît surface/foreground quelle que soit l’écriture et propose la variable du fichier', () => {
  const r = releve(layer('text', null, 'message', liaisonDeJeton('tok-surface', 'Alert/Color/Surface-Foreground')));
  const c = cat([collection('themes', 'theme'), composants], [
    { cle: 'fg-surface', nom: 'Success/Surface/foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
    { cle: 'fg-page', nom: 'Success/Page/foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
    { cle: 'fg-page-autre', nom: 'Danger/Page/foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
    jeton('tok-surface', 'Alert/Color/Surface-Foreground', 'fg-surface'),
    jeton('tok-page', 'Alert/Color/Page-Foreground', 'fg-page'),
    jeton('tok-page-autre', 'Alert/Color/Danger-Page-Foreground', 'fg-page-autre'),
  ]);
  const resultat = controlerLeTheme(r, c).find(({ code }) => code === 'C59');
  assert.equal(resultat?.correction?.avant, 'Alert/Color/Surface-Foreground');
  assert.deepEqual(resultat?.correction?.apres, { cle: 'tok-page', nom: 'Alert/Color/Page-Foreground' });
});

test('C59 reconnaît un nom en majuscules et sa cible écrite autrement', () => {
  const r = releve(layer('text', null, 'message', liaisonDeJeton('tok-surface', 'ALERT/COLOR/SURFACE-FOREGROUND')));
  const c = cat([collection('themes', 'theme'), composants], [
    { cle: 'fg-surface', nom: 'SUCCESS/SURFACE/FOREGROUND', collection: 'themes', type: 'COLOR', etat: 'presente' },
    { cle: 'fg-page', nom: 'success/page/foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
    jeton('tok-surface', 'ALERT/COLOR/SURFACE-FOREGROUND', 'fg-surface'),
    jeton('tok-page', 'alert/color/page-foreground', 'fg-page'),
  ]);
  assert.equal(controlerLeTheme(r, c).find(({ code }) => code === 'C59')?.correction?.apres.cle, 'tok-page');
});

test('C59 ne corrige jamais un token vers lui-même : sans cible, il pose une question sans candidat', () => {
  const r = releve(texteDeSurface());
  const c = cat([collection('themes', 'theme'), composants], [
    { cle: 'fg-surface', nom: 'Success/Surface/Foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
    jeton('tok-surface', 'alert/color/surface-foreground', 'fg-surface'),
  ]);
  const resultat = controlerLeTheme(r, c).find(({ code }) => code === 'C59');
  assert.equal(resultat?.correction, undefined);
  assert.deepEqual(resultat?.question?.candidats, []);
});

test('C59 disparaît quand un ancestor peint un fond surface visible', () => {
  const fond = layer('root', null, 'container', undefined, { key: 'bg', name: 'success/surface/default', collection: 'themes' });
  const texte = layer('text', 'root', 'message', { key: 'fg-surface', name: 'success/surface/foreground', collection: 'themes' });
  const r = releve(fond);
  r.variants[0].layers.push(texte);
  const c = cat([collection('themes', 'theme')], [
    { cle: 'fg-surface', nom: 'success/surface/foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
    { cle: 'fg-page', nom: 'success/page/foreground', collection: 'themes', type: 'COLOR', etat: 'presente' },
    { cle: 'bg', nom: 'success/surface/default', collection: 'themes', type: 'COLOR', etat: 'presente' },
  ]);
  assert.equal(controlerLeTheme(r, c).some(({ code }) => code === 'C59'), false);
});

test('C60 corrige un alias Dark vers Light selon TABLE_DES_DOSSIERS', () => {
  const c = cat([collection('themes', 'theme'), collection('brands', 'brands')], [
    { cle: 'theme-ring', nom: 'success/vivid/ring', collection: 'themes', type: 'COLOR', etat: 'presente', valeurs: { light: { alias: 'brand-light' }, dark: { alias: 'brand-light' } } },
    { cle: 'brand-light', nom: 'success/vivid/light/700', collection: 'brands', type: 'COLOR', etat: 'presente', valeurs: { light: { valeur: '#000000' }, dark: { valeur: '#000000' } } },
    { cle: 'brand-dark', nom: 'success/vivid/dark/800', collection: 'brands', type: 'COLOR', etat: 'presente', valeurs: { light: { valeur: '#000000' }, dark: { valeur: '#000000' } } },
  ]);
  const resultat = controlerLeTheme(releve(layer('text', null, 'message')), c).find(({ code }) => code === 'C60');
  assert.equal(resultat?.correction?.avant, 'brand-light');
  assert.equal(resultat?.correction?.apres.cle, 'brand-dark');
  assert.equal(resultat?.correction?.cible.mode, 'dark');
});

test('C60 pose une question si l’alias mode boucle ou si la cible calculée manque', () => {
  const c = cat([collection('themes', 'theme'), collection('brands', 'brands')], [
    { cle: 'theme-ring', nom: 'success/vivid/ring', collection: 'themes', type: 'COLOR', etat: 'presente', valeurs: { dark: { alias: 'brand-light' } } },
    { cle: 'brand-light', nom: 'success/vivid/light/700', collection: 'brands', type: 'COLOR', etat: 'presente', valeurs: { light: { alias: 'brand-light' } } },
  ]);
  const resultat = controlerLeTheme(releve(layer('text', null, 'message')), c).find(({ code }) => code === 'C60');
  assert.equal(resultat?.correction, undefined);
  assert.deepEqual(resultat?.question?.candidats, []);
});

test('C60 reconnaît un nom en majuscules et écrit le mode visé comme la collection cible', () => {
  const c = cat([collection('themes', 'theme'), collection('brands', 'brands')], [
    { cle: 'theme-ring', nom: 'Success/Vivid/Ring', collection: 'themes', type: 'COLOR', etat: 'presente', valeurs: { light: { alias: 'brand-light' }, dark: { alias: 'brand-light' } } },
    { cle: 'brand-light', nom: 'Success/Vivid/Light/700', collection: 'brands', type: 'COLOR', etat: 'presente', valeurs: { light: { valeur: '#000000' }, dark: { valeur: '#000000' } } },
    { cle: 'brand-dark', nom: 'Success/Vivid/Dark/800', collection: 'brands', type: 'COLOR', etat: 'presente', valeurs: { light: { valeur: '#000000' }, dark: { valeur: '#000000' } } },
  ]);
  const resultat = controlerLeTheme(releve(layer('text', null, 'message')), c).find(({ code }) => code === 'C60');
  assert.equal(resultat?.correction?.avant, 'brand-light');
  assert.deepEqual(resultat?.correction?.apres, { cle: 'brand-dark', nom: 'Success/Vivid/Dark/800' });
});

test('C59 ne juge pas un texte posé sur un fond dont l’alias mène hors du catalogue', () => {
  const r = releve(layer('root', null, 'container', undefined, liaisonDeJeton('tok-perdu', 'alert/color/perdu')));
  r.variants[0].layers.push(layer('text', 'root', 'message', liaisonDeJeton('tok-surface', 'alert/color/surface-foreground')));
  assert.equal(controlerLeTheme(r, catalogueDeBase(jeton('tok-perdu', 'alert/color/perdu', 'absente'))).some(({ code }) => code === 'C59'), false);
});

test('C59 ne juge pas un texte posé sur un fond lié à une variable illisible', () => {
  const fond: LayerLu = {
    ...layer('fond', null, 'container'), type: 'FRAME',
    liaisons: [{ champ: 'fills', indice: 0, porteur: 'fond', illisible: true, variable: { id: 'perdue', cle: '', nom: '', collection: '', distante: false } }],
  };
  const texte = layer('text', 'fond', 'message', liaisonDeJeton('tok-surface', 'alert/color/surface-foreground'));
  const r = { ...releve(texte), variants: [{ id: 'v1', nom: 'Alert', valeurs: {}, modesEffectifs: {}, layers: [fond, texte] }] };
  assert.equal(controlerLeTheme(r, catalogueDeBase()).find(({ code }) => code === 'C59'), undefined);
});

// ---------------------------------------------------------------------------------------------------------------------------
// C60 sur un catalogue de structure : le mode est dans le chemin de la rampe (`primary/dark/300`, comme l'écrit UCM Palettes).

const structure = (alias: Record<string, { mode: string; cible: string }>, sansVariables: readonly string[] = [], modesDeMarque?: string[]): CatalogueDeReference => {
  const base = catalogueDeStructure();
  return {
    ...base,
    collections: modesDeMarque
      ? base.collections.map((entree) => (entree.cle === 'brands' ? { ...entree, modes: entree.modes.map((mode, rang) => ({ ...mode, nom: modesDeMarque[rang] })) } : entree))
      : base.collections,
    variables: base.variables.filter((entree) => !sansVariables.includes(entree.cle)).map((entree) => {
      const reglage = alias[entree.nom];
      return reglage && entree.collection === 'theme' ? { ...entree, valeurs: { ...entree.valeurs, [reglage.mode]: { alias: reglage.cible } } } : entree;
    }),
  };
};
const modesDe = (catalogue: CatalogueDeReference, variable: string) => controlerLesModes(catalogue).filter((constat) => constat.faits.variable === variable);

test('C60 trouve la branche de mode dans le chemin de la rampe, même quand les modes de la marque portent un autre nom (N-24)', () => {
  const catalogue = structure({ 'primary/surface/default': { mode: MODE_LIGHT, cible: cleDeLaFixture('brands', 'primary/dark/200') } });
  const [constat, ...autres] = modesDe(catalogue, 'primary/surface/default');
  assert.equal(autres.length, 0);
  assert.equal(constat.code, 'C60');
  assert.equal(constat.correction?.avant, cleDeLaFixture('brands', 'primary/dark/200'));
  assert.deepEqual(constat.correction?.apres, { cle: cleDeLaFixture('brands', 'primary/light/100'), nom: 'primary/light/100' });
});

test('C60 corrige un alias vers l’autre branche au cran du propre mode du rôle : la bonne branche au cran de la table (N-26)', () => {
  for (const modesDeMarque of [undefined, ['light', 'dark']]) {
    const catalogue = structure({ 'primary/surface/default': { mode: MODE_LIGHT, cible: cleDeLaFixture('brands', 'primary/dark/100') } }, [], modesDeMarque);
    const [constat] = modesDe(catalogue, 'primary/surface/default');
    assert.equal(constat.correction?.apres.nom, 'primary/light/100', String(modesDeMarque));
    assert.equal(constat.question, undefined, String(modesDeMarque));
  }
});

test('C60 lit le sens de la palette : un cran fautif qui vaut pour les deux sens reçoit la correction du sens établi (N-27)', () => {
  const catalogue = structure({ 'primary/surface/foreground': { mode: MODE_LIGHT, cible: cleDeLaFixture('brands', 'primary/dark/950') } }, [], ['light', 'dark']);
  const [constat] = modesDe(catalogue, 'primary/surface/foreground');
  assert.equal(constat.question, undefined);
  assert.equal(constat.correction?.apres.nom, 'primary/light/700');
});

test('C60 ne corrige jamais le texte des boutons : il pose une question qui porte le blanc et le noir de la bonne branche', () => {
  const catalogue = structure({ 'primary/solid/foreground': { mode: MODE_LIGHT, cible: cleDeLaFixture('utility', 'neutral/dark/white') } });
  const [constat] = modesDe(catalogue, 'primary/solid/foreground');
  assert.equal(constat.correction, undefined);
  assert.equal(constat.faits.genre, 'branche-de-mode');
  assert.deepEqual(constat.question?.candidats.map(({ nom }) => nom).sort(), ['neutral/light/black', 'neutral/light/white']);
});

test('toute question C60 a un genre : la cible attendue absente, l’alias qui boucle (E-20)', () => {
  const absente = structure({ 'primary/surface/default': { mode: MODE_LIGHT, cible: cleDeLaFixture('brands', 'primary/dark/200') } }, [cleDeLaFixture('brands', 'primary/light/100')]);
  const [sansCible] = modesDe(absente, 'primary/surface/default');
  assert.equal(sansCible.correction, undefined);
  assert.deepEqual([sansCible.faits.genre, sansCible.question?.candidats], ['branche-de-mode', []]);
  const boucle = structure({ 'primary/surface/default': { mode: MODE_LIGHT, cible: cleDeLaFixture('brands', 'primary/dark/200') } });
  const surBoucle: CatalogueDeReference = {
    ...boucle,
    variables: boucle.variables.map((entree) => (entree.cle === cleDeLaFixture('brands', 'primary/dark/200')
      ? { ...entree, valeurs: { 'm-marque-a': { alias: entree.cle }, 'm-marque-b': { alias: entree.cle } } } : entree)),
  };
  const [enBoucle] = modesDe(surBoucle, 'primary/surface/default');
  assert.deepEqual([enBoucle.correction, enBoucle.faits.genre], [undefined, 'branche-de-mode']);
});

test('C60 ne dit rien d’un alias dans la bonne branche, ni quand deux modes de theme se lisent comme le même', () => {
  const bonne = structure({ 'primary/surface/default': { mode: MODE_LIGHT, cible: cleDeLaFixture('brands', 'primary/light/100') } });
  assert.deepEqual(controlerLesModes(bonne), []);
  const doublon: CatalogueDeReference = {
    ...bonne,
    collections: bonne.collections.map((entree) => (entree.cle === 'theme' ? { ...entree, modes: [{ id: MODE_LIGHT, nom: 'light' }, { id: MODE_DARK, nom: 'Light' }] } : entree)),
  };
  const mauvaise = structure({ 'primary/surface/default': { mode: MODE_LIGHT, cible: cleDeLaFixture('brands', 'primary/dark/200') } });
  assert.deepEqual(controlerLesModes({ ...mauvaise, collections: doublon.collections }), []);
});

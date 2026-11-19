/** C82 dans `brands` et `utility` : les liens vers `primitives`, jamais une couleur créée. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectionsDeReference, controlerLIntegriteUcm, corrigerLaQuestionDeLien,
  type CatalogueDeReference, type Constat, type OptionsDIntegrite, type VariableDuCatalogue,
} from '../src/controles/index.js';
import { avecEcriture } from './fixtures/catalogueDeStructure.js';
import { PALETTES_DE_LA_FIXTURE, catalogueDeLiens } from './fixtures/tokensDeLiens.js';

const GENRES_DES_LIENS = ['lien-manquant', 'lien-a-corriger', 'palette-a-choisir', 'charte-a-choisir', 'rampe-a-completer'];
const ecriture = avecEcriture('minuscules', 'tiret');
const MARQUE_1 = 'marque-1';
const MARQUE_2 = 'marque-2';

const sans = (catalogue: CatalogueDeReference, retire: (variable: VariableDuCatalogue) => boolean): CatalogueDeReference =>
  ({ ...catalogue, variables: catalogue.variables.filter((variable) => !retire(variable)) });

const modifier = (catalogue: CatalogueDeReference, cle: string, changer: (variable: VariableDuCatalogue) => VariableDuCatalogue): CatalogueDeReference => {
  assert.ok(catalogue.variables.some((variable) => variable.cle === cle), cle);
  return { ...catalogue, variables: catalogue.variables.map((variable) => (variable.cle === cle ? changer(variable) : variable)) };
};

const viser = (catalogue: CatalogueDeReference, cle: string, cible: string, mode = 'base'): CatalogueDeReference =>
  modifier(catalogue, cle, (variable) => ({ ...variable, valeurs: { ...variable.valeurs, [mode]: { alias: cible } } }));

const liens = (catalogue: CatalogueDeReference, options: OptionsDIntegrite = { ecriture }): Constat[] =>
  controlerLIntegriteUcm(catalogue, options).filter((constat) => GENRES_DES_LIENS.includes(String(constat.faits.genre)));

const dePalette = (collection: string, palette: string, fin: string): string => `${collection}|color/${palette}/${fin}`;
const branche = (collection: string, debut: string) => (variable: VariableDuCatalogue): boolean => variable.collection === collection && variable.nom.startsWith(debut);

test('1. la fixture anonymisée a 46 variables par marque et 206 dans utility, et ne reçoit aucun constat sur brands ni utility', () => {
  const catalogue = catalogueDeLiens();
  assert.equal(catalogue.variables.filter((variable) => variable.collection === 'brands').length, 46);
  assert.equal(catalogue.variables.filter((variable) => variable.collection === 'utility').length, 206);
  assert.deepEqual(catalogue.collections.find((collection) => collection.cle === 'brands')?.modes.map(({ nom }) => nom), [MARQUE_1, MARQUE_2]);
  assert.deepEqual(controlerLIntegriteUcm(catalogue, { ecriture }).filter((constat) => constat.faits.genre !== 'theme-non-reconnu'), []);
});

test('2. un lien absent dont la branche vise une palette reçoit la création de son alias dans chaque marque, sans scope', () => {
  const catalogue = sans(catalogueDeLiens(), (variable) => variable.cle === 'brands|primary/light/300');
  const [constat, ...autres] = liens(catalogue);
  assert.equal(autres.length, 0);
  assert.equal(constat.id, 'C82:lien-manquant:brands:primary/light/300');
  assert.equal(constat.code, 'C82');
  assert.equal(constat.type, 'corriger');
  assert.deepEqual(constat.faits, { genre: 'lien-manquant', variable: 'primary/light/300', groupe: 'primary', collection: 'brands', palette: 'cobalt', nom: 'primary/light/300' });
  assert.equal(constat.correction?.sorte, 'variable');
  assert.deepEqual(constat.correction?.creation, {
    collection: 'brands', nom: 'primary/light/300', type: 'COLOR', scopes: [],
    alias: {
      [MARQUE_1]: { cle: dePalette('primitives', 'cobalt', 'light/300'), nom: 'color/cobalt/light/300' },
      [MARQUE_2]: { cle: dePalette('primitives', 'orchidee', 'light/300'), nom: 'color/orchidee/light/300' },
    },
  });
  assert.equal(constat.question, undefined);
});

test('3. sans écriture choisie, le lien absent reste sans correction et dit pourquoi', () => {
  const catalogue = sans(catalogueDeLiens(), (variable) => variable.cle === 'utility|success/vivid/dark/500');
  const [constat] = liens(catalogue, {});
  assert.equal(constat.faits.raison, 'sans-ecriture');
  assert.equal(constat.correction, undefined);
});

test('4. le nom créé reprend l’écriture de ses voisines dans le fichier', () => {
  const catalogue = catalogueDeLiens();
  const ecrit = {
    ...catalogue,
    variables: catalogue.variables.filter((variable) => variable.cle !== 'utility|danger/vivid/light/500').map((variable) => (variable.collection === 'utility'
      ? { ...variable, nom: variable.nom.split('/').map((segment) => segment.replace(/^./, (lettre) => lettre.toUpperCase())).join('/') } : variable)),
  };
  const [constat] = liens(ecrit);
  assert.equal(constat.correction?.creation?.nom, 'Danger/Vivid/Light/500');
});

test('5. un lien vers le mauvais cran ou le mauvais thème de la bonne palette reçoit un alias corrigé, avec son ancienne cible', () => {
  const cran = viser(catalogueDeLiens(), 'utility|success/vivid/light/300', dePalette('primitives', 'prairie', 'vivid/light/400'));
  const [constat, ...autres] = liens(cran);
  assert.equal(autres.length, 0);
  assert.equal(constat.id, 'C82:lien-a-corriger:utility|success/vivid/light/300:base');
  assert.deepEqual(constat.faits, {
    genre: 'lien-a-corriger', variable: 'success/vivid/light/300', groupe: 'success', collection: 'utility', mode: 'base', avant: 'vivid/light/400', attendu: 'vivid/light/300',
    palette: 'prairie', cleDeCollection: 'utility', idDuMode: 'base',
  });
  assert.equal(constat.correction?.sorte, 'alias-de-mode');
  assert.deepEqual(constat.correction?.cible, { variable: 'utility|success/vivid/light/300', mode: 'base' });
  assert.equal(constat.correction?.avant, dePalette('primitives', 'prairie', 'vivid/light/400'));
  assert.deepEqual(constat.correction?.apres, { cle: dePalette('primitives', 'prairie', 'vivid/light/300'), nom: 'color/prairie/vivid/light/300' });

  const theme = viser(catalogueDeLiens(), 'utility|success/vivid/light/300', dePalette('primitives', 'prairie', 'vivid/dark/300'));
  const [dark] = liens(theme);
  assert.equal(dark.faits.avant, 'vivid/dark/300');
  assert.equal(dark.correction?.apres?.cle, dePalette('primitives', 'prairie', 'vivid/light/300'));
});

test('6. un lien vers le bon cran d’une autre palette reste intact, avec son constat sans correction', () => {
  const catalogue = viser(catalogueDeLiens(), 'utility|warning/soft/light/300', dePalette('primitives', 'azur', 'soft/light/300'));
  const [constat, ...autres] = liens(catalogue);
  assert.equal(autres.length, 0);
  assert.equal(constat.faits.genre, 'lien-a-corriger');
  assert.equal(constat.faits.raison, 'autre-palette');
  assert.equal(constat.correction, undefined);
});

test('7. une branche aux palettes multiples ne reçoit aucune création : le lien absent dit pourquoi', () => {
  let catalogue = catalogueDeLiens();
  for (const cran of [50, 100, 200, 300, 400, 500]) catalogue = viser(catalogue, `brands|primary/light/${cran}`, dePalette('primitives', 'ambre', `light/${cran}`), MARQUE_1);
  catalogue = sans(catalogue, (variable) => variable.cle === 'brands|primary/light/950');
  const constats = liens(catalogue);
  const absent = constats.find((constat) => constat.faits.variable === 'primary/light/950');
  assert.equal(absent?.faits.raison, 'palettes-multiples');
  assert.equal(absent?.correction, undefined);
});

test('8. une variable présente sans valeur dans un mode reçoit un alias de ce mode, sans création', () => {
  const catalogue = modifier(catalogueDeLiens(), 'brands|secondary/dark/700', (variable) => ({ ...variable, valeurs: { [MARQUE_1]: variable.valeurs![MARQUE_1] } }));
  const [constat, ...autres] = liens(catalogue);
  assert.equal(autres.length, 0);
  assert.equal(constat.faits.genre, 'lien-manquant');
  assert.equal(constat.faits.mode, MARQUE_2);
  assert.equal(constat.correction?.sorte, 'alias-de-mode');
  assert.equal(constat.correction?.avant, null);
  assert.equal(constat.correction?.apres?.cle, dePalette('primitives', 'sapin', 'dark/700'));
  assert.deepEqual(constat.correction?.cible, { variable: 'brands|secondary/dark/700', mode: MARQUE_2 });
});

test('9. une branche absente d’une marque donne une question de palette sans réponse cochée, et aucun lien manquant', () => {
  const catalogue = sans(catalogueDeLiens(), branche('brands', 'secondary/'));
  const constats = liens(catalogue);
  const questions = constats.filter((constat) => constat.faits.genre === 'palette-a-choisir');
  assert.deepEqual(questions.map((constat) => constat.id), [
    'C82:palette-a-choisir:brands:marque-1:secondary', 'C82:palette-a-choisir:brands:marque-2:secondary',
  ]);
  const [question] = questions;
  assert.equal(question.type, 'verifier');
  assert.equal(question.correction, undefined);
  assert.deepEqual(question.faits, { genre: 'palette-a-choisir', collection: 'brands', mode: MARQUE_1, groupe: 'secondary', cleDeCollection: 'brands', idDuMode: MARQUE_1 });
  assert.deepEqual(question.question?.candidats, ['ambre', 'cobalt', 'granite', 'orchidee', 'sapin'].map((nom) => ({ nom })));
  assert.ok(question.question?.candidats.every((candidat) => candidat.cle === undefined));
  assert.equal(question.question?.indice, undefined);
  assert.equal(constats.some((constat) => constat.faits.genre === 'lien-manquant'), false);
  assert.equal(constats.some((constat) => constat.faits.genre === 'charte-a-choisir'), false);
});

test('10. un statut absent de utility liste les palettes qui ont soft et vivid, jamais celle du nom', () => {
  const catalogue = sans(catalogueDeLiens(), branche('utility', 'warning/'));
  const constats = liens(catalogue);
  assert.equal(constats.length, 1);
  assert.equal(constats[0].id, 'C82:palette-a-choisir:utility:base:warning');
  assert.deepEqual(constats[0].question?.candidats, ['azur', 'corail', 'prairie', 'safran'].map((nom) => ({ nom })));
});

test('11. la réponse du designer rend la création exacte : 22 alias pour une marque, 44 pour un statut, aucun scope', () => {
  const absentes = sans(catalogueDeLiens(), branche('brands', 'secondary/'));
  const question = liens(absentes).find((constat) => constat.id === 'C82:palette-a-choisir:brands:marque-1:secondary')!;
  const corrections = corrigerLaQuestionDeLien(absentes, question, 'ambre', { ecriture });
  assert.equal(corrections.length, 22);
  assert.ok(corrections.every((correction) => correction.sorte === 'variable' && correction.creation?.scopes.length === 0 && correction.creation.collection === 'brands'));
  assert.deepEqual(corrections.find((correction) => correction.creation?.nom === 'secondary/dark/950')?.creation?.alias, {
    [MARQUE_1]: { cle: dePalette('primitives', 'ambre', 'dark/950'), nom: 'color/ambre/dark/950' },
  });
  assert.deepEqual(corrigerLaQuestionDeLien(absentes, question, 'prairie', { ecriture }), []);
  assert.deepEqual(corrigerLaQuestionDeLien(absentes, question, 'inconnue', { ecriture }), []);

  const sansStatut = sans(catalogueDeLiens(), branche('utility', 'warning/'));
  const statut = liens(sansStatut)[0];
  assert.equal(corrigerLaQuestionDeLien(sansStatut, statut, 'safran', { ecriture }).length, 44);
});

test('12. la couleur de charte absente liste les 11 crans Light de la palette de la famille, sans en cocher un', () => {
  const catalogue = sans(catalogueDeLiens(), (variable) => variable.cle === 'brands|identity/primary');
  const constats = liens(catalogue);
  assert.deepEqual(constats.map((constat) => constat.id), ['C82:charte-a-choisir:brands:marque-1:primary', 'C82:charte-a-choisir:brands:marque-2:primary']);
  const [marque1, marque2] = constats;
  assert.equal(marque1.type, 'verifier');
  assert.equal(marque1.correction, undefined);
  assert.equal(marque1.question?.candidats.length, 11);
  assert.deepEqual(marque1.question?.candidats[0], { cle: dePalette('primitives', 'cobalt', 'light/50'), nom: 'color/cobalt/light/50' });
  assert.ok(marque2.question?.candidats.every((candidat) => candidat.nom.startsWith('color/orchidee/light/')));
  assert.equal(marque1.question?.indice, undefined);

  const [correction] = corrigerLaQuestionDeLien(catalogue, marque1, dePalette('primitives', 'cobalt', 'light/600'), { ecriture });
  assert.deepEqual(correction.creation, {
    collection: 'brands', nom: 'identity/primary', type: 'COLOR', scopes: [],
    alias: { [MARQUE_1]: { cle: dePalette('primitives', 'cobalt', 'light/600'), nom: 'color/cobalt/light/600' } },
  });
  assert.deepEqual(corrigerLaQuestionDeLien(catalogue, marque1, dePalette('primitives', 'cobalt', 'dark/600'), { ecriture }), []);
});

test('13. un cran absent de primitives renvoie vers Palettes, sans correction, une fois par palette', () => {
  const catalogue = sans(catalogueDeLiens(), (variable) => variable.cle === 'brands|primary/light/300' || variable.cle === dePalette('primitives', 'cobalt', 'light/300'));
  const constats = liens(catalogue);
  assert.equal(constats.length, 1);
  assert.equal(constats[0].id, 'C82:rampe-a-completer:brands:cobalt');
  assert.deepEqual(constats[0].faits, { genre: 'rampe-a-completer', collection: 'brands', palette: 'cobalt', manque: 'light/300', variables: 1 });
  assert.equal(constats[0].correction, undefined);
  assert.equal(constats[0].question, undefined);
});

test('14. une branche absente sans palette de la forme voulue renvoie vers Palettes', () => {
  const catalogue = sans(catalogueDeLiens(), (variable) => branche('utility', 'neutral/')(variable) || variable.cle.startsWith(`primitives|color/${PALETTES_DE_LA_FIXTURE.neutral}/`));
  const constats = liens(catalogue);
  const neutre = constats.find((constat) => constat.faits.groupe === 'neutral');
  assert.equal(neutre?.faits.genre, 'rampe-a-completer');
  assert.equal(neutre?.faits.manque, 'palette');
  assert.equal(neutre?.correction, undefined);
});

test('15. l’élévation vise les crans de la table dans la palette du neutre', () => {
  const faux = viser(catalogueDeLiens(), 'utility|elevation/dark/raised', dePalette('primitives', 'granite', 'dark/200'));
  const [constat] = liens(faux);
  assert.equal(constat.faits.genre, 'lien-a-corriger');
  assert.equal(constat.correction?.apres?.cle, dePalette('primitives', 'granite', 'dark/100'));

  const absente = sans(catalogueDeLiens(), (variable) => variable.cle === 'utility|elevation/light/raised');
  const [creation] = liens(absente);
  assert.equal(creation.faits.genre, 'lien-manquant');
  assert.deepEqual(creation.correction?.creation?.alias, { base: { cle: dePalette('primitives', 'granite', 'white'), nom: 'color/granite/white' } });
  assert.deepEqual(creation.correction?.creation?.scopes, []);
});

test('16. white et black du neutre visent white et black de la palette neutre', () => {
  const catalogue = viser(catalogueDeLiens(), 'utility|neutral/dark/black', dePalette('primitives', 'granite', 'white'));
  const [constat] = liens(catalogue);
  assert.equal(constat.faits.genre, 'lien-a-corriger');
  assert.equal(constat.correction?.apres?.cle, dePalette('primitives', 'granite', 'black'));
});

test('17. sans palette du neutre établie, l’élévation ne reçoit aucun constat', () => {
  const catalogue = sans(catalogueDeLiens(), (variable) => branche('utility', 'neutral/')(variable) || variable.cle === 'utility|elevation/light/page');
  assert.equal(liens(catalogue).some((constat) => String(constat.faits.variable ?? '').startsWith('elevation')), false);
});

test('18. une valeur directe ou un alias hors de primitives n’est jamais réécrit ni compté pour une palette', () => {
  const direct = modifier(catalogueDeLiens(), 'utility|info/soft/light/200', (variable) => ({ ...variable, valeurs: { base: { valeur: { r: 0.1, g: 0.2, b: 0.3, a: 1 } } } }));
  assert.deepEqual(liens(direct), []);
  const versUtility = viser(catalogueDeLiens(), 'utility|info/soft/light/200', 'utility|neutral/light/200');
  assert.deepEqual(liens(versUtility), []);
});

test('19. aucun constat sur layout ni typography, même avec des échelles incomplètes', () => {
  const base = catalogueDeLiens();
  const collections = collectionsDeReference([
    ...base.collections.map(({ role: _role, ...collection }) => collection),
    { cle: 'layout', nom: 'layout', modes: [{ id: 'base', nom: 'base' }], etat: 'lue' },
    { cle: 'typography', nom: 'typography', modes: [{ id: 'base', nom: 'base' }], etat: 'lue' },
  ], 'ucm');
  const variables: VariableDuCatalogue[] = [
    { cle: 'layout|sizing/1', nom: 'sizing/1', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { base: { valeur: 4 } } },
    { cle: 'typography|body/md/font-size', nom: 'body/md/font-size', collection: 'typography', type: 'FLOAT', etat: 'presente', valeurs: { base: { valeur: 16 } } },
  ];
  const constats = controlerLIntegriteUcm({ ...base, collections, variables: [...base.variables, ...variables] }, { ecriture });
  assert.deepEqual(constats.filter((constat) => constat.faits.genre !== 'theme-non-reconnu'), []);
});

test('20. un fichier sans collection brands ne reçoit rien pour brands', () => {
  const base = catalogueDeLiens();
  const sansBrands: CatalogueDeReference = {
    ...base, collections: base.collections.filter((collection) => collection.cle !== 'brands'), variables: base.variables.filter((variable) => variable.collection !== 'brands'),
  };
  assert.deepEqual(controlerLIntegriteUcm(sansBrands, { ecriture }).filter((constat) => constat.faits.genre !== 'theme-non-reconnu'), []);
  const aussiSansStatut = sans(sansBrands, branche('utility', 'warning/'));
  const constats = liens(aussiSansStatut);
  assert.deepEqual(constats.map((constat) => constat.faits.collection), ['utility']);
});

test('21. une collection brands sans variable donne, par marque, une question pour primary et une pour secondary', () => {
  const catalogue = sans(catalogueDeLiens(), (variable) => variable.collection === 'brands');
  const questions = liens(catalogue);
  assert.equal(questions.length, 4);
  assert.ok(questions.every((constat) => constat.faits.genre === 'palette-a-choisir' && constat.correction === undefined));
});

test('22. un catalogue de 3 700 variables se contrôle sans attente', () => {
  const base = catalogueDeLiens();
  const marques = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const variables: VariableDuCatalogue[] = [...base.variables];
  for (const marque of marques) for (const variable of base.variables) if (variable.collection !== 'primitives') variables.push({ ...variable, cle: `${variable.cle}#${marque}`, nom: `${marque}-${variable.nom}` });
  const debut = performance.now();
  controlerLIntegriteUcm({ ...base, variables }, { ecriture });
  assert.ok(performance.now() - debut < 2000, `${performance.now() - debut} ms`);
});

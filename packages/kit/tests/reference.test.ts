import assert from 'node:assert/strict';
import test from 'node:test';
import { controlerLeCatalogue, type CatalogueDeReference } from '../src/controles/index.js';
import { TABLE_DES_DOSSIERS } from '../src/emplois/dossiers.js';
import { formesReconnues } from '../src/referentiel/grammaire.js';
import {
  CIBLES_DE_L_ELEVATION, ECHELLES_DE_REFERENCE, reconnaitreLeChemin, variablesAttendues,
  type Collection, type EntreeDEchelle,
} from '../src/referentiel/index.js';

const marques = ['marque-1', 'marque-2'];
const lire = (collection: Collection, chemin: string) => reconnaitreLeChemin(collection, chemin.split('/'), { themes: collection === 'theme' ? 'modes' : 'chemin' });

test('la référence compte 46 variables par marque, 206 dans utility et 295 dans theme', () => {
  const brands = variablesAttendues('brands', { marques });
  assert.equal(brands.length, 92);
  for (const marque of marques) assert.equal(brands.filter((variable) => variable.marque === marque).length, 46);
  assert.equal(variablesAttendues('utility').length, 206);
  assert.equal(variablesAttendues('theme').length, 295);
});

test('la référence compte 31 variables de layout, 60 de typography et 61 valeurs hors couleur de primitives', () => {
  assert.equal(ECHELLES_DE_REFERENCE.layout.length, 31);
  assert.equal(ECHELLES_DE_REFERENCE.typography.length, 60);
  assert.equal(ECHELLES_DE_REFERENCE.primitives.length, 61);
  assert.equal(ECHELLES_DE_REFERENCE.layout.filter(({ chemin }) => chemin.startsWith('sizing/')).length, 20);
  assert.equal(ECHELLES_DE_REFERENCE.layout.filter(({ chemin }) => chemin.startsWith('radius/')).length, 9);
  assert.equal(ECHELLES_DE_REFERENCE.layout.some(({ chemin }) => chemin.startsWith('icon/') || chemin === 'radius/none'), false);
  assert.equal(ECHELLES_DE_REFERENCE.typography.some(({ chemin }) => chemin.endsWith('font-family')), false);
});

test('chaque nom de la référence a une seule lecture dans la grammaire', () => {
  const noms: [Collection, string][] = [
    ...(['brands', 'utility', 'theme'] as const).flatMap((collection) => variablesAttendues(collection, { marques }).map(({ chemin }): [Collection, string] => [collection, chemin])),
    ...(['primitives', 'layout', 'typography'] as const).flatMap((collection) => ECHELLES_DE_REFERENCE[collection].map(({ chemin }): [Collection, string] => [collection, chemin])),
  ];
  for (const [collection, chemin] of noms) {
    const lu = lire(collection, chemin);
    assert.ok(lu.conforme, `${collection}/${chemin} : ${JSON.stringify(lu)}`);
    assert.equal(formesReconnues(collection, chemin.split('/'), { themes: collection === 'theme' ? 'modes' : 'chemin' }).length, 1, `${collection}/${chemin} a plusieurs lectures`);
  }
  for (const collection of ['brands', 'utility', 'theme'] as const) {
    const chemins = variablesAttendues(collection, { marques }).filter((variable) => variable.marque !== 'marque-2').map(({ chemin }) => chemin);
    assert.equal(new Set(chemins).size, chemins.length, `${collection} a un doublon`);
  }
});

test("aucune échelle n'a deux crans de même valeur", () => {
  const groupes = new Map<string, number[]>();
  for (const { chemin, valeur } of ECHELLES_DE_REFERENCE.primitives) {
    if (typeof valeur !== 'number') continue;
    const groupe = chemin.split('/')[0];
    groupes.set(groupe, [...(groupes.get(groupe) ?? []), valeur]);
  }
  for (const [groupe, valeurs] of groupes) assert.equal(new Set(valeurs).size, valeurs.length, `${groupe} a un doublon`);
  const sizing = ECHELLES_DE_REFERENCE.layout.filter(({ chemin }) => chemin.startsWith('sizing/')).map(({ alias }) => alias);
  assert.equal(new Set(sizing).size, sizing.length);
  const rayons = ECHELLES_DE_REFERENCE.layout.filter(({ chemin }) => chemin.startsWith('radius/')).map(({ alias }) => alias);
  assert.equal(new Set(rayons).size, rayons.length);
});

test('chaque alias vise une valeur de primitives', () => {
  const presentes = new Set(ECHELLES_DE_REFERENCE.primitives.map(({ chemin }) => `primitives/${chemin}`));
  for (const entree of [...ECHELLES_DE_REFERENCE.layout, ...ECHELLES_DE_REFERENCE.typography]) {
    assert.ok(entree.alias && presentes.has(entree.alias), `${entree.chemin} vise ${entree.alias}`);
  }
});

test("theme égale la table de dossiers.ts, pour chaque palette et chaque mode", () => {
  const theme = variablesAttendues('theme').map(({ chemin }) => chemin);
  for (const mode of ['light', 'dark'] as const) {
    for (const sens of ['normal', 'inverse'] as const) {
      const attendues = Object.keys(TABLE_DES_DOSSIERS[mode][sens]).map((variable) => `primary/${variable}`);
      assert.deepEqual(theme.filter((chemin) => chemin.startsWith('primary/') && !chemin.startsWith('primary/scale/')), attendues);
    }
  }
  assert.equal(theme.filter((chemin) => chemin.startsWith('primary/scale/')).length, 11);
});

test("l'élévation vise le cran 50 pour la page, le blanc en Light et le cran 100 en Dark pour la carte", () => {
  assert.deepEqual(CIBLES_DE_L_ELEVATION, {
    page: { light: { cran: 50 }, dark: { cran: 50 } },
    raised: { light: { absolue: 'white' }, dark: { cran: 100 } },
  });
});

test('controlerLesEchelles ne rend rien sur la référence', () => {
  const modes = [{ id: 'm', nom: 'm' }];
  const collections: CatalogueDeReference['collections'] = (['layout', 'primitives'] as const).map((role) => ({ cle: role, nom: role, role, modes, etat: 'lue' }));
  const variable = (collection: string, entree: EntreeDEchelle): CatalogueDeReference['variables'][number] => ({
    cle: `${collection}/${entree.chemin}`, nom: entree.chemin, collection, type: 'FLOAT', etat: 'presente',
    valeurs: { m: entree.alias ? { alias: entree.alias } : { valeur: entree.valeur } },
  });
  const variables = [
    ...ECHELLES_DE_REFERENCE.layout.map((entree) => variable('layout', entree)),
    ...ECHELLES_DE_REFERENCE.primitives.filter(({ valeur }) => typeof valeur === 'number').map((entree) => variable('primitives', entree)),
  ];
  const constats = controlerLeCatalogue({ version: 1, library: null, collections, variables }).filter(({ code }) => code === 'C63');
  assert.deepEqual(constats, []);
});

/** La lecture des variables : identité, cibles distantes, mutualisation, concurrence, annulation, lecture seule. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { CONCURRENCE, convertirValeur, lireLeReleve } from '../src/lecture';
import { collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const sansAnnulation = { annulee: () => false };
const horloge = () => 1234;
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

test('les valeurs Figma se convertissent sans coercition : zéro, faux, texte vide, alpha, alias', () => {
  assert.deepEqual(convertirValeur(0), { nature: 'nombre', nombre: 0 });
  assert.deepEqual(convertirValeur(false), { nature: 'booleen', booleen: false });
  assert.deepEqual(convertirValeur(''), { nature: 'texte', texte: '' });
  assert.deepEqual(convertirValeur({ r: 1, g: 0.5, b: 0, a: 0.25 }), { nature: 'couleur', couleur: { r: 1, g: 0.5, b: 0, a: 0.25 } });
  assert.deepEqual(convertirValeur({ r: 1, g: 0.5, b: 0 }), { nature: 'couleur', couleur: { r: 1, g: 0.5, b: 0, a: 1 } });
  assert.deepEqual(convertirValeur(alias('x')), { nature: 'alias', cible: 'x' });
  assert.equal(convertirValeur({ type: 'EASE_IN' }).nature, 'courbe');
  // Une expression ou un alias augmenté d'un champ inconnu reste lisible, sans valeur inventée.
  assert.deepEqual(convertirValeur({ expressionFunction: 'ADDITION', expressionArguments: [] }).nature, 'non-prise-en-charge');
  assert.equal(convertirValeur({ type: 'VARIABLE_ALIAS', id: 'x', opacity: 0.5 }).nature, 'non-prise-en-charge');
  assert.equal(convertirValeur(Number.NaN).nature, 'non-prise-en-charge');
});

test('les variables locales se lisent d’un appel, avec leurs modes, leur défaut et leur provenance', async () => {
  const { port } = portDeTest(
    [collectionFigma('c', 'Couleurs', ['Jour', 'Nuit'], ['a', 'b'], false, 'Nuit')],
    [variableFigma('a', 'c', 'surface', 'COLOR', { 'c:Jour': alias('b'), 'c:Nuit': { r: 0, g: 0, b: 0, a: 1 } }), variableFigma('b', 'c', 'papier', 'COLOR', { 'c:Jour': { r: 1, g: 1, b: 1, a: 1 }, 'c:Nuit': { r: 1, g: 1, b: 1, a: 1 } })],
  );
  const issue = await lireLeReleve(port, 'Fichier', 3, sansAnnulation, horloge);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.equal(issue.releve.revision, 3);
  assert.equal(issue.releve.luA, 1234);
  assert.equal(issue.releve.collections[0].modeParDefaut, 'c:Nuit');
  assert.deepEqual(issue.releve.variables.map((variable) => [variable.id, variable.distante]), [['a', false], ['b', false]]);
  assert.deepEqual(issue.releve.manquees, []);
});

test('une cible distante se lit par identifiant, sa collection aussi, une seule fois chacune', async () => {
  const { port, appels } = portDeTest(
    [collectionFigma('c', 'Interface', ['M'], ['a', 'b', 'c2'])],
    [variableFigma('a', 'c', 'a', 'COLOR', { 'c:M': alias('d1') }), variableFigma('b', 'c', 'b', 'COLOR', { 'c:M': alias('d1') }), variableFigma('c2', 'c', 'c', 'COLOR', { 'c:M': alias('d1') })],
    [variableFigma('d1', 'bib', 'primitive', 'COLOR', { 'bib:M': { r: 1, g: 0, b: 0, a: 1 } }, true)],
    [collectionFigma('bib', 'Bibliothèque', ['M'], ['d1'], true)],
  );
  const issue = await lireLeReleve(port, 'Fichier', 1, sansAnnulation, horloge);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.equal(appels.get('d1'), 1);
  assert.equal(appels.get('collection:bib'), 1);
  assert.equal(issue.releve.variables.find((variable) => variable.id === 'd1')?.distante, true);
  assert.equal(issue.releve.capacites.variablesDistantes, true);
});

test('une cible que Figma ne rend pas est introuvable, une lecture qui lève est refusée, chacune située', async () => {
  const { port } = portDeTest(
    [collectionFigma('c', 'Interface', ['M'], ['a', 'b'])],
    [variableFigma('a', 'c', 'a', 'COLOR', { 'c:M': alias('absente') }), variableFigma('b', 'c', 'b', 'COLOR', { 'c:M': alias('protegee') })],
    [],
    [],
    { refusees: new Set(['protegee']) },
  );
  const issue = await lireLeReleve(port, 'Fichier', 1, sansAnnulation, horloge);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.deepEqual(issue.releve.manquees.map((manquee) => [manquee.id, manquee.issue, manquee.depuis]), [['absente', 'introuvable', 'a'], ['protegee', 'refusee', 'b']]);
  assert.match(issue.releve.manquees[1].message, /refusé/);
});

test(`au plus ${CONCURRENCE} lectures par identifiant sont en vol`, async () => {
  const cibles = Array.from({ length: 40 }, (_, rang) => `d${rang}`);
  const { port, maximumEnVol } = portDeTest(
    [collectionFigma('c', 'Interface', ['M'], cibles.map((_, rang) => `a${rang}`))],
    cibles.map((cible, rang) => variableFigma(`a${rang}`, 'c', `a${rang}`, 'FLOAT', { 'c:M': alias(cible) })),
    cibles.map((cible) => variableFigma(cible, 'bib', cible, 'FLOAT', { 'bib:M': 1 }, true)),
    [collectionFigma('bib', 'Bibliothèque', ['M'], cibles, true)],
    { delai: 2 },
  );
  const issue = await lireLeReleve(port, 'Fichier', 1, sansAnnulation, horloge);
  assert.equal(issue.statut, 'lu');
  assert.ok(maximumEnVol() <= CONCURRENCE, `${maximumEnVol()} lectures en vol`);
  assert.ok(maximumEnVol() > 1, 'les lectures ne sont pas parallélisées');
});

test('une annulation rend la main avant la fin et ne publie aucun relevé partiel', async () => {
  const cibles = Array.from({ length: 200 }, (_, rang) => `d${rang}`);
  const { port, appels } = portDeTest(
    [collectionFigma('c', 'Interface', ['M'], cibles.map((_, rang) => `a${rang}`))],
    cibles.map((cible, rang) => variableFigma(`a${rang}`, 'c', `a${rang}`, 'FLOAT', { 'c:M': alias(cible) })),
    cibles.map((cible) => variableFigma(cible, 'bib', cible, 'FLOAT', { 'bib:M': 1 }, true)),
    [collectionFigma('bib', 'Bibliothèque', ['M'], cibles, true)],
    { delai: 1 },
  );
  let faites = 0;
  const issue = await lireLeReleve(port, 'Fichier', 1, { annulee: () => faites >= 20, progression: (_phase, fait) => { faites = fait; } }, horloge);
  assert.deepEqual(issue, { statut: 'annule' });
  const lues = [...appels.keys()].filter((cle) => cle.startsWith('d')).length;
  assert.ok(lues < cibles.length, `${lues} lectures faites sur ${cibles.length}`);
});

test('une collection étendue garde son parent, ses modes parents et ses surcharges', async () => {
  const base = collectionFigma('base', 'Base', ['Light'], ['v']);
  const extension = { ...collectionFigma('ext', 'Marque B', ['Light B'], ['v']), isExtension: true, parentVariableCollectionId: 'base', rootVariableCollectionId: 'base', modes: [{ modeId: 'ext:Light B', name: 'Light B', parentModeId: 'base:Light' }], variableOverrides: { v: { 'ext:Light B': { r: 0, g: 1, b: 0, a: 1 } } } };
  const { port } = portDeTest([base, extension], [variableFigma('v', 'base', 'fond', 'COLOR', { 'base:Light': { r: 1, g: 1, b: 1, a: 1 } })]);
  const issue = await lireLeReleve(port, 'Fichier', 1, sansAnnulation, horloge);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  const lue = issue.releve.collections.find((collection) => collection.id === 'ext');
  assert.equal(lue?.extension?.parent, 'base');
  assert.equal(lue?.modes[0].parent, 'base:Light');
  assert.deepEqual(lue?.extension?.surcharges.v['ext:Light B'], { nature: 'couleur', couleur: { r: 0, g: 1, b: 0, a: 1 } });
  assert.equal(issue.releve.capacites.collectionsEtendues, true);
});

test('un type de variable inconnu est écarté sans casser la lecture', async () => {
  const { port } = portDeTest([collectionFigma('c', 'X', ['M'], ['a', 'b'])], [variableFigma('a', 'c', 'a', 'FUTUR', { 'c:M': 1 }), variableFigma('b', 'c', 'b', 'FLOAT', { 'c:M': 1 })]);
  const issue = await lireLeReleve(port, 'Fichier', 1, sansAnnulation, horloge);
  assert.equal(issue.statut === 'lu' && issue.releve.variables.length, 1);
});

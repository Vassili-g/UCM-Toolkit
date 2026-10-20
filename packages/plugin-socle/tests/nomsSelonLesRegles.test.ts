/** Le calcul de renommage partagé : idempotent sur un fichier entier, et fidèle aux noms non renommables. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { inventaireDeLectures, type Inventaire, type ObjetNomme, type VariableLue } from '../src/inventaireDeNoms';
import { nomsSelonLesRegles, nomsSelonLesReglesSync, idsNonRenommables } from '../src/nomsSelonLesRegles';
import { lireReglesDeNommage } from '../src/reglesDeNommage';

const PALIERS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const collections: ObjetNomme[] = [
  { id: 'c1', name: 'primitives', remote: false },
  { id: 'c2', name: 'components', remote: false },
  { id: 'c3', name: 'theme', remote: false },
  { id: 'c4', name: 'color-utilities', remote: false },
];
let compteur = 0;
const variable = (collection: string, name: string): VariableLue => ({ id: `v${++compteur}`, name, variableCollectionId: collection, remote: false });

/** Un fichier inventé : palettes à deux intensités et deux thèmes, un blanc, des composants, un thème et des utilitaires. */
function fichier(): VariableLue[] {
  const palettes = ['soft', 'vivid'].flatMap((intensite) => ['light', 'dark'].flatMap((theme) => PALIERS.map((palier) => `colors/Poppy/${intensite}/${theme}/${palier}`)));
  return [
    ...palettes.map((nom) => variable('c1', nom)),
    variable('c1', 'colors/Titanium/white'),
    ...['big', 'small'].flatMap((taille) => ['border-radius', 'padding-x'].map((nom) => variable('c2', `button/sizes/${taille}/${nom}`))),
    ...['light', 'dark'].map((theme) => variable('c3', `surface/page/${theme}`)),
    variable('c4', 'success/vivid/light/50'),
    variable('c4', 'success/vivid/dark/50'),
  ];
}

const aucunAlias = { cibleAlias: () => undefined, protegee: () => false, palette: () => undefined };
const ECRITURE = JSON.stringify({ version: 1, groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'minuscules', separateur: 'tiret' } });
const regles = () => lireReglesDeNommage([['ecriture', ECRITURE]])!;

/** Calcule sur les noms courants, puis renomme les variables par les renommages rendus. */
function passer(variables: VariableLue[], nonRenommables: (inventaire: Inventaire) => string[] = () => []) {
  const inventaire = inventaireDeLectures(collections, variables, aucunAlias);
  const { resultat } = nomsSelonLesReglesSync(inventaire, regles(), nonRenommables(inventaire));
  const nouveaux = new Map(resultat.renommages.map((renommage) => [renommage.id, renommage.nouveauNom]));
  const suite = variables.map((v) => ({ ...v, name: nouveaux.get(JSON.stringify(['variable', v.id])) ?? v.name }));
  return { resultat, suite };
}

test('les groupes passent en PascalCase, les variables en minuscules et tirets', () => {
  const noms = new Set(passer(fichier()).suite.map((v) => v.name));
  for (const attendu of [
    'Color/Poppy/Soft/Dark/950', 'Color/Poppy/Vivid/Light/50', 'Color/Titanium/white',
    'Button/Size/Large/radius', 'Surface/Page/light', 'Success/Vivid/Dark/50',
  ]) assert.ok(noms.has(attendu), `${attendu} absent de ${[...noms].filter((nom) => !nom.includes('Poppy')).join(' | ')}`);
});

test('appliquer les renommages puis recalculer ne renomme plus rien', () => {
  const premier = passer(fichier());
  assert.ok(premier.resultat.renommages.length > 0);
  const second = passer(premier.suite);
  assert.deepEqual(second.resultat.renommages, []);
  assert.deepEqual(second.suite.map((v) => v.name), premier.suite.map((v) => v.name));
});

test('un nom non renommable fige les dossiers qui le portent et rien d’autre', () => {
  const variables = fichier();
  const figee = variables.find((v) => v.name === 'colors/Poppy/vivid/light/50')!;
  const figer = (inventaire: Inventaire): string[] => [...idsNonRenommables(inventaire, []), JSON.stringify(['variable', figee.id])];
  const premier = passer(variables, figer);
  const noms = new Map(premier.suite.map((v) => [v.id, v.name]));
  const nom = (ancien: string): string | undefined => noms.get(variables.find((v) => v.name === ancien)!.id);
  assert.equal(nom('colors/Poppy/vivid/light/50'), 'colors/Poppy/vivid/light/50');
  assert.equal(nom('colors/Poppy/vivid/light/100'), 'colors/Poppy/vivid/light/100', 'le dossier light de la variable figée garde son nom');
  assert.equal(nom('colors/Titanium/white'), 'colors/Titanium/white', 'colors est le dossier de la variable figée');
  assert.equal(nom('colors/Poppy/vivid/dark/50'), 'colors/Poppy/vivid/Dark/50', 'un dossier que la variable figée ne porte pas suit les règles');
  assert.equal(nom('colors/Poppy/soft/light/50'), 'colors/Poppy/Soft/Light/50');
  assert.equal(nom('button/sizes/big/border-radius'), 'Button/Size/Large/radius', 'une autre collection suit les règles');
  assert.deepEqual(passer(premier.suite, figer).resultat.renommages.length, 0, 'le calcul est aussi idempotent avec une variable figée');
});

test('une collection exclue n’est ni lue ni renommée', () => {
  const variables = fichier();
  const exclue = lireReglesDeNommage([['ecriture', ECRITURE], ['exclues', JSON.stringify({ version: 1, ids: ['c1'] })]])!;
  const inventaire = inventaireDeLectures(collections, variables, aucunAlias);
  const { resultat } = nomsSelonLesReglesSync(inventaire, exclue, idsNonRenommables(inventaire, exclue.collectionsExclues));
  const touches = new Set(resultat.renommages.map((renommage) => renommage.portee));
  assert.equal(touches.has(JSON.stringify(['collection', 'c1'])), false);
  assert.ok(touches.has(JSON.stringify(['collection', 'c2'])));
});

test('le générateur mené à la main rend le résultat de la version synchrone', () => {
  const inventaire = inventaireDeLectures(collections, fichier(), aucunAlias);
  const attendu = nomsSelonLesReglesSync(inventaire, regles(), []);
  const generateur = nomsSelonLesRegles(inventaire, regles(), []);
  let etape = generateur.next();
  while (!etape.done) etape = generateur.next();
  assert.deepEqual(etape.value.resultat, attendu.resultat);
});

test('le contrôle des chemins publiés retire un renommage qui ferait disparaître un token', () => {
  // `bg/primary` deviendrait `background/primary`, le chemin de `Background/primary`, qui garde son nom.
  const variables = [variable('c2', 'bg/primary'), variable('c2', 'Background/primary')];
  const minuscules = lireReglesDeNommage([['ecriture', JSON.stringify({ version: 1, groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } })]])!;
  const inventaire = inventaireDeLectures(collections, variables, aucunAlias);
  const figee = [JSON.stringify(['variable', variables[1].id])];
  const { brut, resultat } = nomsSelonLesReglesSync(inventaire, minuscules, figee);
  const cible = JSON.stringify(['variable', variables[0].id]);
  assert.deepEqual(brut.renommages.map((renommage) => [renommage.id, renommage.nouveauNom]), [[cible, 'background/primary']]);
  assert.deepEqual(resultat.renommages, []);
  assert.deepEqual(resultat.collisions.map((collision) => [collision.ids, 'motif' in collision ? collision.motif : null]), [[[cible], 'meme-token']]);
});

test('des règles de termes enchaînées se stabilisent au premier calcul', () => {
  const terme = (mots: string[], remplace: string[][]): [string, string] => [`terme:${mots.join(' ')}`, JSON.stringify({ version: 1, terme: mots, remplace })];
  const enchaine = lireReglesDeNommage([
    ['ecriture', JSON.stringify({ version: 1, groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } })],
    terme(['bar'], [['foo']]), terme(['baz'], [['bar']]), terme(['zed'], [['baz']]),
  ])!;
  const noms = ['colors/foo/vivid/light/50', 'colors/bar/vivid/light/100', 'colors/baz/vivid/light/200', 'colors/foo-quux/vivid/light/300', 'button/size/foo'];
  const variables = noms.map((nom) => variable('c1', nom));
  const premier = nomsSelonLesReglesSync(inventaireDeLectures(collections, variables, aucunAlias), enchaine, []);
  assert.deepEqual(premier.indexation.conflits, []);
  const nouveaux = new Map(premier.resultat.renommages.map((renommage) => [renommage.id, renommage.nouveauNom]));
  const suite = variables.map((v) => ({ ...v, name: nouveaux.get(JSON.stringify(['variable', v.id])) ?? v.name }));
  assert.deepEqual(suite.map((v) => v.name), ['color/zed/vivid/light/50', 'color/zed/vivid/light/100', 'color/zed/vivid/light/200', 'color/zed-quux/vivid/light/300', 'button/size/zed']);
  const second = nomsSelonLesReglesSync(inventaireDeLectures(collections, suite, aucunAlias), enchaine, []);
  assert.deepEqual(second.resultat.renommages, []);
});

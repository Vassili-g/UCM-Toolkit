/** Le relevé d'une library bâti depuis ses noms et ses valeurs importées, et les messages de règles reçues que l'interface lit. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { CollectionDeBibliotheque } from '../src/messages/bibliotheque';
import type { VariableRelevee } from '../src/modele';
import { ciblesAImporter, cleDeLaCible, releveDeLibrary, type ValeurImportee } from '../src/ui/bibliotheque/releve';
import { cleDeRegleRecue, estReglesRecues, ligneDeRegleRecue, sansDoublon } from '../src/ui/nomenclature/reglesRecues';

const collections: CollectionDeBibliotheque[] = [
  { nom: 'brands', cle: 'c-brands', variables: [{ nom: 'primary/700', cle: 'kb', type: 'COLOR' }] },
  { nom: 'theme', cle: 'c-theme', variables: [{ nom: 'primary/solid', cle: 'kt', type: 'COLOR' }, { nom: 'primary/ring', cle: 'kr', type: 'COLOR' }] },
];

const importee = (cle: string, valeurs: VariableRelevee['valeurs']): VariableRelevee => ({
  id: `VariableID:${cle}/1:1`, nom: cle, description: 'd', cle, distante: true, masqueeALaPublication: false, collection: 'VariableCollectionId:1:1', type: 'COLOR', portees: ['ALL_SCOPES'], syntaxe: {}, valeurs,
});
const rouge = { nature: 'couleur', couleur: { r: 1, g: 0, b: 0, a: 1 } } as const;

const entrees = (valeurs: ReadonlyMap<string, ValeurImportee> = new Map()) => ({ nom: 'Intencial Tokens', collections, valeurs, luA: 5, revision: 3 });

test('sans valeur importée, le relevé porte les noms de la library et aucune valeur', () => {
  const releve = releveDeLibrary(entrees());
  assert.equal(releve.fichier, 'Intencial Tokens');
  assert.deepEqual(releve.collections.map((collection) => [collection.id, collection.nom, collection.distante, collection.modes.length, collection.modeParDefaut]), [['c-brands', 'brands', true, 0, ''], ['c-theme', 'theme', true, 0, '']]);
  assert.deepEqual(releve.variables.map((variable) => [variable.id, variable.nom, variable.collection, variable.type, Object.keys(variable.valeurs).length]), [
    ['kb', 'primary/700', 'c-brands', 'COLOR', 0], ['kt', 'primary/solid', 'c-theme', 'COLOR', 0], ['kr', 'primary/ring', 'c-theme', 'COLOR', 0],
  ]);
  assert.deepEqual(releve.collections[1].variables, ['kt', 'kr']);
  assert.equal(releve.manquees.length, 0);
});

test('une valeur importée prend l’identifiant de sa clé, et son alias vise la clé de sa cible', () => {
  const valeurs = new Map<string, ValeurImportee>([
    ['kb', importee('kb', { '1:0': rouge, '1:1': rouge })],
    ['kt', importee('kt', { '2:0': { nature: 'alias', cible: 'VariableID:kb/1:1' } })],
  ]);
  const releve = releveDeLibrary(entrees(valeurs));
  const kt = releve.variables.find((variable) => variable.id === 'kt');
  assert.deepEqual(kt?.valeurs['2:0'], { nature: 'alias', cible: 'kb' });
  assert.equal(kt?.description, 'd');
  assert.deepEqual(releve.collections[0].modes.map((mode) => mode.id), ['1:0', '1:1']);
  assert.equal(releve.collections[0].modeParDefaut, '1:0');
});

test('les modes d’une library n’ont pas de nom : le mode seul s’appelle Valeur, les autres se numérotent', () => {
  const seul = releveDeLibrary(entrees(new Map([['kb', importee('kb', { 'm:1': rouge })]])));
  assert.deepEqual(seul.collections[0].modes, [{ id: 'm:1', nom: 'Valeur' }]);
  const deux = releveDeLibrary(entrees(new Map([['kb', importee('kb', { 'm:1': rouge, 'm:2': rouge })]])));
  assert.deepEqual(deux.collections[0].modes.map((mode) => mode.nom), ['Mode 1', 'Mode 2']);
});

test('une variable que l’import refuse devient une cible manquée, sans valeur', () => {
  const releve = releveDeLibrary(entrees(new Map([['kt', { illisible: 'Figma refuse.' }]])));
  assert.deepEqual(releve.manquees, [{ id: 'kt', genre: 'variable', issue: 'refusee', message: 'Figma refuse.' }]);
  assert.equal(Object.keys(releve.variables.find((variable) => variable.id === 'kt')?.valeurs ?? {}).length, 0);
});

test('seules les cibles connues de la library, pas encore demandées, s’importent à la suite', () => {
  const valeurs = new Map<string, ValeurImportee>([
    ['kt', importee('kt', { a: { nature: 'alias', cible: 'VariableID:kb/1:1' } })],
    ['kr', importee('kr', { a: { nature: 'alias', cible: 'VariableID:ailleurs/1:1' }, b: { nature: 'alias', cible: 'VariableID:kt/2:2' } })],
  ]);
  const connues = new Set(['kb', 'kt', 'kr']);
  assert.deepEqual(ciblesAImporter(valeurs, connues, new Set(['kt', 'kr'])), ['kb']);
  assert.deepEqual(ciblesAImporter(valeurs, connues, new Set(['kt', 'kr', 'kb'])), []);
  assert.deepEqual(ciblesAImporter(new Map([['kt', { illisible: 'x' }]]), connues, new Set()), []);
});

test('la clé d’une cible se lit dans son identifiant de library, jamais dans un identifiant local', () => {
  assert.equal(cleDeLaCible('VariableID:abc123/45:6'), 'abc123');
  assert.equal(cleDeLaCible('VariableID:45:6'), null);
  assert.equal(cleDeLaCible('kb'), null);
});

const outline = { ancien: 'outline', nouveau: 'outlined', composant: 'Alert', exemple: { ancien: 'alert/color/info/outline/border', nouveau: 'alert/color/info/outlined/border' } };

test('un message de règles reçues ne s’accepte que complet', () => {
  assert.equal(estReglesRecues({ type: 'regles-recues', regles: [outline] }), true);
  assert.equal(estReglesRecues({ type: 'regles-recues', regles: [] }), true);
  assert.equal(estReglesRecues({ type: 'regles-recues', regles: [{ ...outline, composant: '' }] }), false);
  assert.equal(estReglesRecues({ type: 'regles-recues', regles: [{ ancien: 'a' }] }), false);
  assert.equal(estReglesRecues({ type: 'releve', regles: [outline] }), false);
  assert.equal(estReglesRecues(null), false);
});

test('l’exemple d’une règle marque le segment du terme retiré, et deux règles identiques n’en font qu’une carte', () => {
  assert.deepEqual(ligneDeRegleRecue(outline).marques, [3]);
  assert.equal(cleDeRegleRecue(outline), 'recue:outline>outlined');
  assert.deepEqual(sansDoublon([outline, outline, { ...outline, composant: 'Chip' }]), [outline]);
});

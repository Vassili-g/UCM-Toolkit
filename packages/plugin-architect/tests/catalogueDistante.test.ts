/** `catalogueDuFichier` marque `distante` les variables de library, que C82 ne vise jamais en création. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogueDuFichier } from '../src/catalogue';
import { alias, constructeur } from './fixtures';

test('une variable distante porte distante, une variable locale ne porte rien', () => {
  const fichier = constructeur();
  fichier.collection('c-brands', 'brands', ['Marque A'], { distante: true });
  fichier.collection('c-theme', 'theme', ['light']);
  fichier.variable('v-distante', 'c-brands', 'primary/light/500', 'COLOR', {});
  fichier.variable('v-locale', 'c-theme', 'primary/solid/default', 'COLOR', { light: alias('v-distante') });
  const catalogue = catalogueDuFichier(fichier.releve(), 'ucm');
  const parNom = new Map(catalogue.variables.map((variable) => [variable.nom, variable]));
  assert.equal(parNom.get('primary/light/500')?.distante, true);
  assert.equal(parNom.get('primary/solid/default')?.distante, undefined);
  assert.equal('distante' in (parNom.get('primary/solid/default') ?? {}), false);
});

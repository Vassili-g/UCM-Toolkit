/** Le modèle réduit aux règles que l'instance ne porte pas encore. */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cibleCompacte,
  modeleDeRegles,
  reglesManquantes,
  type ElementDeModele,
} from '../src/composant/template/modele';

const modele = modeleDeRegles('Button', {
  props: {
    size: { type: 'enum', values: ['sm', 'md'] },
    disabled: { type: 'boolean' },
  },
  stateModel: { axis: 'state', states: { default: {}, hover: {}, focus: {} } },
} as never);

function cibles(elements: ElementDeModele[]): string[] {
  return elements.map((element) =>
    element.genre === 'separateur' ? '---' : (element.cible ?? element.tag));
}

const TOUTES = ['size.sm', 'size.md', 'state.default', 'state.hover', 'state.focus', 'disabled'];

test('rien de présent : toutes les sections prop et boolean, sans usage ni icons', () => {
  const rendu = reglesManquantes(modele, new Set());

  assert.deepEqual(rendu.sections.map((section) => section.tag), ['prop', 'boolean']);
  assert.equal(rendu.nom, 'Button');
  assert.deepEqual(cibles(rendu.sections[0].elements), ['size.sm', 'size.md', '---', 'state.default', 'state.hover', 'state.focus']);
});

test('tout présent : aucune section', () => {
  assert.deepEqual(reglesManquantes(modele, new Set(TOUTES)).sections, []);
});

test('un axe partiellement présent : ses règles manquantes sans séparateur', () => {
  const rendu = reglesManquantes(modele, new Set(['size.sm', 'size.md', 'state.default', 'disabled']));

  assert.equal(rendu.sections.length, 1);
  assert.equal(rendu.sections[0].tag, 'prop');
  assert.deepEqual(cibles(rendu.sections[0].elements), ['state.hover', 'state.focus']);
});

test('deux axes incomplets : un séparateur entre eux', () => {
  const rendu = reglesManquantes(modele, new Set(['size.md', 'state.default', 'disabled']));

  assert.deepEqual(cibles(rendu.sections[0].elements), ['size.sm', '---', 'state.hover', 'state.focus']);
});

test('la comparaison compacte la cible : State.Hover présent, state.hover non rendu', () => {
  const presentes = new Set(['size.sm', 'size.md', 'state.default', cibleCompacte('State.Hover'), 'disabled']);
  const rendu = reglesManquantes(modele, presentes);

  assert.deepEqual(cibles(rendu.sections[0].elements), ['state.focus']);
});

test('disabled absent, le reste présent : une seule section boolean', () => {
  const rendu = reglesManquantes(modele, new Set(TOUTES.filter((cible) => cible !== 'disabled')));

  assert.deepEqual(rendu.sections.map((section) => section.tag), ['boolean']);
  assert.deepEqual(cibles(rendu.sections[0].elements), ['disabled']);
});

test('cibleCompacte retire les espaces et passe en minuscules, le point reste', () => {
  assert.equal(cibleCompacte(' State . Hover '), 'state.hover');
});

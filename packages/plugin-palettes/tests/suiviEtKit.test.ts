/** Le suivi que Palettes range se lit par les lecteurs du kit : `lireLeSuiviComplet` et `identifiantsDuSuivi`. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { identifiantsDuSuivi, lireLeSuiviComplet } from '@ucm-kit/core/protocoles';

import { DESTINATION_PAR_DEFAUT } from '../src/variables/destination';
import { SUIVI_VIDE, lireLeSuivi, texteDuSuivi, type SuiviDesVariables } from '../src/variables/suivi';

const SUIVI: SuiviDesVariables = {
  ...SUIVI_VIDE,
  destination: DESTINATION_PAR_DEFAUT,
  confirmee: true,
  palettes: {
    'p-0000000a': {
      collection: 'VariableCollectionId:1:1',
      groupe: 'color/primitives/blue',
      modes: { light: 'mode-l', dark: 'mode-d' },
      variables: { '500': { id: 'VariableID:1:10', ecrite: '1E6FD9' }, '600': { id: 'VariableID:1:11', ecrite: '1859B0' } },
      liaison: 'destination',
    },
    'p-0000000b': {
      collection: 'VariableCollectionId:1:2',
      groupe: 'gris',
      modes: { unique: 'mode-u' },
      variables: { '500': { id: 'VariableID:1:20', ecrite: '6B7280' } },
      liaison: 'reprise',
      chemin: 'gris',
      intensite: 'soft',
    },
  },
};

test('les octets de texteDuSuivi se lisent par le kit, reprise comprise', () => {
  const texte = texteDuSuivi(SUIVI);
  const lu = lireLeSuiviComplet(texte);
  assert.equal(lu.etat, 'courante');
  if (lu.etat !== 'courante') return;
  assert.deepEqual(lu.valeur.palettes, SUIVI.palettes);
  assert.equal(lu.valeur.confirmee, true);
  assert.deepEqual([...identifiantsDuSuivi(texte)].sort(), ['VariableID:1:10', 'VariableID:1:11', 'VariableID:1:20']);
  assert.deepEqual(lireLeSuivi(texte).palettes, SUIVI.palettes);
});

test('un suivi de version 2 est futur pour la lecture complète et garde ses identifiants au relevé', () => {
  const texte = JSON.stringify({ ...JSON.parse(texteDuSuivi(SUIVI)), version: 2 });
  assert.equal(lireLeSuiviComplet(texte).etat, 'future');
  assert.equal(lireLeSuivi(texte).version, 2);
  assert.deepEqual(lireLeSuivi(texte).palettes, {});
  assert.equal(identifiantsDuSuivi(texte).size, 3);
});

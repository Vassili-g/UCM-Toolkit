import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CRANS, INTENSITE_UNIQUE, MODES, PROFILS, REGISTRES, REGISTRE_ETATS,
  STATE_AXIS_NAMES, STATE_PRECEDENCE, STATE_SELECTORS, SIZE_VALUES, ECHELLES_DE_TAILLES,
  REGISTRE_TAILLES, TAILLES_DE_COMPATIBILITE, libelleDuTerme, termeRetenu,
} from '../src/referentiel/index.js';

test('chaque registre porte un identifiant unique', () => {
  assert.equal(new Set(REGISTRES.map((registre) => registre.id)).size, REGISTRES.length);
});

for (const registre of REGISTRES) {
  test(`${registre.id} : identifiants et mots tolérés ne se confondent pas`, () => {
    const identifiants = registre.termes.map((terme) => terme.id);
    assert.equal(new Set(identifiants).size, identifiants.length);
    const toleres = registre.termes.flatMap((terme) => terme.toleres ?? []);
    assert.equal(new Set(toleres).size, toleres.length);
    for (const mot of toleres) assert.ok(!identifiants.includes(mot), mot);
  });

  test(`${registre.id} : chaque terme a un libellé et une définition dans les deux langues`, () => {
    assert.ok(registre.termes.length > 0);
    for (const terme of registre.termes) {
      for (const langue of ['fr', 'en'] as const) {
        assert.ok(libelleDuTerme(terme, langue).trim(), `${terme.id}.${langue}`);
        assert.ok(terme.definition[langue].trim(), `${terme.id}.${langue}`);
      }
    }
  });

  test(`${registre.id} : un identifiant ou un mot toléré retrouve le terme retenu`, () => {
    for (const terme of registre.termes) {
      assert.equal(termeRetenu(registre, terme.id), terme);
      for (const mot of terme.toleres ?? []) assert.equal(termeRetenu(registre, mot), terme);
    }
    assert.equal(termeRetenu(registre, 'inconnu-ucm'), undefined);
  });
}

test('les crans publics ne comprennent pas les bornes internes du moteur', () => {
  assert.deepEqual(CRANS, [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
  assert.deepEqual(MODES, ['light', 'dark']);
  assert.deepEqual(PROFILS, ['soft', 'vivid']);
  assert.equal(INTENSITE_UNIQUE, 'unique');
});

test('les états tolérés gardent le déclencheur et la priorité de l’exporteur', () => {
  assert.deepEqual(STATE_SELECTORS, {
    default: '', hover: ':hover', hovered: ':hover', focus: ':focus-visible',
    focused: ':focus-visible', press: ':active', pressed: ':active',
    disable: '[disabled]', disabled: '[disabled]',
    selected: '[aria-selected="true"]', 'selected-true': '[aria-selected="true"]',
    'selected-false': '', unselected: '', rest: '', resting: '', normal: '',
  });
  assert.deepEqual(STATE_PRECEDENCE, [
    'disable', 'disabled', 'press', 'pressed', 'selected-true', 'selected', 'focus', 'focused', 'hover', 'hovered',
    'default', 'rest', 'resting', 'normal', 'selected-false', 'unselected',
  ]);
  assert.deepEqual(STATE_AXIS_NAMES, ['state', 'states', 'status']);
  assert.equal(termeRetenu(REGISTRE_ETATS, 'active'), undefined);
  assert.equal(termeRetenu(REGISTRE_ETATS, 'HOVER'), undefined);
});

test('les tailles connues gardent les deux échelles reconnues par l’exporteur', () => {
  assert.deepEqual([...SIZE_VALUES], [
    'tiny', 'small', 'medium', 'large', 'big', 'huge',
    '9xs', '8xs', '7xs', '6xs', '5xs', '4xs', '3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl', '2xl', '3xl', '4xl',
    '5xl', '6xl', '7xl', '8xl', '9xl',
  ]);
  for (const formes of ECHELLES_DE_TAILLES) {
    for (const forme of formes) assert.ok(SIZE_VALUES.has(forme), forme);
  }
});

test('SIZE_VALUES vaut les identifiants et formes tolérées du registre des tailles, plus la compatibilité', () => {
  const duRegistre = REGISTRE_TAILLES.termes.flatMap((terme) => [terme.id, ...(terme.toleres ?? [])]);
  assert.deepEqual([...SIZE_VALUES].sort(), [...duRegistre, ...TAILLES_DE_COMPATIBILITE].sort());
  for (const taille of TAILLES_DE_COMPATIBILITE) assert.equal(termeRetenu(REGISTRE_TAILLES, taille), undefined, taille);
});

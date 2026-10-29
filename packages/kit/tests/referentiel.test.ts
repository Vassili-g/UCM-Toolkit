import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CRANS, INTENSITE_UNIQUE, MODES, PROFILS, REGISTRES, REGISTRE_ETATS,
  STATE_AXIS_NAMES, STATE_PRECEDENCE, STATE_SELECTORS, SIZE_VALUES, ECHELLES_DE_TAILLES,
  REGISTRE_TAILLES, TAILLES_DE_COMPATIBILITE, REGISTRES_ARCHITECTURE, REGISTRE_PROFILS, REGISTRE_VALEURS_THEME, FAMILLES_PRIMITIVES,
  formeReconnue, libelleDuTerme, termeReconnu, termeRetenu,
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

test('la forme reconnue joint en minuscules les mots que découpe decouperSegment', () => {
  for (const ecrit of ['Soft', 'SOFT', 'soft']) assert.equal(formeReconnue(ecrit), 'soft', ecrit);
  for (const ecrit of ['ForegroundMain', 'foreground_main', 'foreground-main', 'foregroundmain', 'Foreground Main']) assert.equal(formeReconnue(ecrit), 'foreground-main', ecrit);
  assert.equal(formeReconnue(''), '');
  assert.equal(formeReconnue('-_ '), '');
});

test('termeReconnu retrouve un terme quelle que soit l’écriture du segment', () => {
  for (const ecrit of ['Soft', 'SOFT', 'soft']) assert.equal(termeReconnu(REGISTRE_PROFILS, ecrit), termeRetenu(REGISTRE_PROFILS, 'soft'), ecrit);
  const colors = termeRetenu(FAMILLES_PRIMITIVES, 'color');
  assert.ok(colors);
  for (const ecrit of ['Color', 'Colors', 'colour', 'COLORS']) assert.equal(termeReconnu(FAMILLES_PRIMITIVES, ecrit), colors, ecrit);
  const typeDeTexte = termeRetenu(FAMILLES_PRIMITIVES, 'font-family');
  for (const ecrit of ['FontFamily', 'fontfamily', 'font_family', 'font-family']) assert.equal(termeReconnu(FAMILLES_PRIMITIVES, ecrit), typeDeTexte, ecrit);
  const textePrincipal = termeRetenu(REGISTRE_VALEURS_THEME, 'foreground-main');
  assert.ok(textePrincipal);
  for (const ecrit of ['foreground-main', 'ForegroundMain', 'foregroundmain']) assert.equal(termeReconnu(REGISTRE_VALEURS_THEME, ecrit), textePrincipal, ecrit);
});

test('termeReconnu rend undefined pour un terme absent, un segment vide ou sans mot', () => {
  assert.equal(termeReconnu(REGISTRE_PROFILS, 'medium'), undefined);
  assert.equal(termeReconnu(REGISTRE_PROFILS, ''), undefined);
  assert.equal(termeReconnu(REGISTRE_PROFILS, '--'), undefined);
  assert.equal(termeReconnu(REGISTRE_VALEURS_THEME, 'foreground-mai'), undefined);
});

for (const registre of [...REGISTRES, ...REGISTRES_ARCHITECTURE]) {
  test(`${registre.id} : deux termes ne donnent jamais la même forme reconnue`, () => {
    const proprietaires = new Map<string, string>();
    for (const terme of registre.termes) {
      for (const ecrit of [terme.id, ...(terme.toleres ?? [])]) {
        const forme = formeReconnue(ecrit);
        const autre = proprietaires.get(forme);
        assert.ok(autre === undefined || autre === terme.id, `${ecrit} (${terme.id}) et ${autre} donnent ${forme}`);
        proprietaires.set(forme, terme.id);
      }
    }
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
  assert.deepEqual(STATE_AXIS_NAMES, ['state', 'states', 'status', 'etat', 'état']);
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

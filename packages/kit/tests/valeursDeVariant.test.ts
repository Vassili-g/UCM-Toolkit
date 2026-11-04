/**
 * L'écriture d'une valeur de variant et celle de son segment de token (E1.1, E1.6 ; Q-F5-5, Q-F5-6, Q-F5-10).
 * Le variant s'écrit en toutes lettres avec une majuscule à chaque mot, le token en minuscules et en abréviation.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { CONVENTION_DE_VALEUR_DE_VARIANT, CONVENTION_DE_SEGMENT_DE_TOKEN } from '../src/referentiel/conventions.js';
import { ecritureDuVariant, segmentDeToken } from '../src/referentiel/ecriture-des-mots.js';
import { REGISTRE_STATUTS, REGISTRE_TAILLES, TAILLES_DE_VARIANT } from '../src/referentiel/vocabulaire.js';

test('les conventions du variant et du token', () => {
  assert.deepEqual(CONVENTION_DE_VALEUR_DE_VARIANT, { casse: 'PascalCase', separateur: 'espace' });
  assert.deepEqual(CONVENTION_DE_SEGMENT_DE_TOKEN, { casse: 'minuscules', separateur: 'tiret' });
});

test('une taille s’écrit en toutes lettres dans le variant et en abréviation dans le token', () => {
  const attendu = [['Extra Small', 'xs'], ['Small', 'sm'], ['Medium', 'md'], ['Large', 'lg'], ['Extra Large', 'xl']] as const;
  for (const [variant, token] of attendu) {
    assert.deepEqual(ecritureDuVariant('taille', variant), { terme: token, variant, token, correction: false }, variant);
    assert.equal(segmentDeToken(variant, 'taille'), token, variant);
  }
});

test('une taille connue ne reçoit aucun constat de casse', () => {
  for (const valeur of ['small', 'SMALL', 'extra large', 'Extra-Large', 'ExtraLarge', 'EXTRA LARGE', 'medium', 'LARGE']) {
    assert.equal(ecritureDuVariant('taille', valeur)?.correction, false, valeur);
  }
  assert.equal(ecritureDuVariant('taille', 'extra large')?.variant, 'Extra Large');
});

test('S, M, L, sm et Middle reçoivent une correction vers le mot entier', () => {
  const attendu: Record<string, string> = {
    S: 'Small', M: 'Medium', L: 'Large', sm: 'Small', SM: 'Small', md: 'Medium', lg: 'Large',
    Middle: 'Medium', XL: 'Extra Large', xl: 'Extra Large', 'X-Large': 'Extra Large', XS: 'Extra Small',
    Tiny: 'Extra Small', Big: 'Large', Huge: 'Extra Large',
  };
  for (const [valeur, variant] of Object.entries(attendu)) {
    const ecriture = ecritureDuVariant('taille', valeur);
    assert.equal(ecriture?.variant, variant, valeur);
    assert.equal(ecriture?.correction, true, valeur);
  }
});

test('une taille que la table ne nomme pas reste inconnue', () => {
  for (const valeur of ['Banana', '2xl', 'Compact', '']) assert.equal(ecritureDuVariant('taille', valeur), undefined, valeur);
});

test('TAILLES_DE_VARIANT ne nomme que des identifiants de REGISTRE_TAILLES', () => {
  const identifiants = REGISTRE_TAILLES.termes.map((terme) => terme.id);
  for (const token of Object.keys(TAILLES_DE_VARIANT)) assert.ok(identifiants.includes(token), token);
});

test('Danger reste Danger, et Error reçoit un renommage vers Danger', () => {
  assert.deepEqual(ecritureDuVariant('palette', 'Danger'), { terme: 'danger', variant: 'Danger', token: 'danger', correction: false });
  assert.equal(ecritureDuVariant('palette', 'danger')?.correction, false);
  for (const valeur of ['Error', 'error', 'Critical']) {
    const ecriture = ecritureDuVariant('palette', valeur);
    assert.equal(ecriture?.variant, 'Danger', valeur);
    assert.equal(ecriture?.token, 'danger', valeur);
    assert.equal(ecriture?.correction, true, valeur);
  }
});

test('chaque statut a son écriture de variant, et chaque forme tolérée se corrige vers lui', () => {
  const attendu: Record<string, string> = { success: 'Success', warning: 'Warning', info: 'Info', danger: 'Danger' };
  for (const terme of REGISTRE_STATUTS.termes) {
    assert.equal(ecritureDuVariant('palette', terme.id)?.variant, attendu[terme.id], terme.id);
    for (const toleree of terme.toleres ?? []) {
      const ecriture = ecritureDuVariant('palette', toleree);
      assert.equal(ecriture?.variant, attendu[terme.id], toleree);
      assert.equal(ecriture?.correction, true, toleree);
    }
  }
});

test('une palette de marque et un état connus gardent leur écriture, sans constat', () => {
  assert.deepEqual(ecritureDuVariant('palette', 'primary'), { terme: 'primary', variant: 'Primary', token: 'primary', correction: false });
  assert.deepEqual(ecritureDuVariant('etat', 'HOVER'), { terme: 'hover', variant: 'Hover', token: 'hover', correction: false });
  assert.equal(ecritureDuVariant('palette', 'Discovery'), undefined);
});

test('un état toléré se reconnaît sans correction de variant', () => {
  const ecriture = ecritureDuVariant('etat', 'Hovered');
  assert.equal(ecriture?.terme, 'hover');
  assert.equal(ecriture?.correction, false);
});

test('le rôle décide : M n’est une taille que dans un axe de taille', () => {
  assert.equal(ecritureDuVariant('palette', 'M'), undefined);
  assert.equal(ecritureDuVariant('etat', 'S'), undefined);
});

test('E1.6 : le point et la barre d’une valeur deviennent un tiret dans le segment du token', () => {
  assert.equal(segmentDeToken('16/9'), '16-9');
  assert.equal(segmentDeToken('1.5'), '1-5');
  assert.equal(segmentDeToken('Small/Medium'), 'small-medium');
  assert.equal(segmentDeToken('4.5/3'), '4-5-3');
  assert.equal(segmentDeToken('a / b'), 'a-b');
});

test('le segment de token d’une valeur sans terme connu : minuscules et tirets', () => {
  assert.equal(segmentDeToken('Extra Large'), 'extra-large');
  assert.equal(segmentDeToken('Ratio'), 'ratio');
  assert.equal(segmentDeToken('2xl'), '2xl');
  assert.equal(segmentDeToken('Banana Split', 'taille'), 'banana-split');
});

test('le segment de token d’un terme connu est son identifiant', () => {
  assert.equal(segmentDeToken('Middle', 'taille'), 'md');
  assert.equal(segmentDeToken('Error', 'palette'), 'danger');
  assert.equal(segmentDeToken('Hovered', 'etat'), 'hover');
});

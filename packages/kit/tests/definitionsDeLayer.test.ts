/**
 * Ce qu'un layer désigne (E1.3, E1.4, E1.5 ; Q-F6-3, Q-F3-4, Q-F6-4, Q-F7-9, Q-F3-3) : une icône, un anneau de focus, un séparateur.
 * Les cas partent des noms piégeux de l'opérateur I6 de F6 (`Silicone`, `Lexicon`, `IconButton`) et des trois cas de la décision.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  estUnAnneau, estUneIcone, estUneInstanceDIcone, estUnNomDAnneau, estUnNomDeSeparateur, motDIconeDansLeNom,
  MOTS_D_ICONE, ROLES_QUI_DESIGNENT_UN_LAYER, roleQueLeLayerDesigne, leNomDuLayerDitLeRole,
} from '../src/referentiel/layers.js';

const instance = (nom: string, composant: string, pilotee: string | null = null) => ({ nom, type: 'INSTANCE', instanceDe: { nom: composant, pilotee } });
const tracé = (nom: string, type = 'VECTOR') => ({ nom, type });

test('les cinq mots d\'icône', () => {
  assert.deepEqual([...MOTS_D_ICONE], ['icon', 'icône', 'glyph', 'pictogram', 'symbol']);
});

test('un mot d\'icône est un mot entier : Silicone, Lexicon, Iconoclast et Icons n\'en contiennent pas', () => {
  for (const nom of ['icon', 'Icon', 'Icon/Left', 'leading-icon', 'trailing icon', 'ICON_2', 'Icône', 'icone', 'Glyph', 'Pictogram', 'Symbol', 'ChevronIcon', 'IconButton']) {
    assert.equal(motDIconeDansLeNom(nom), true, nom);
  }
  for (const nom of ['Silicone', 'Silicon', 'Lexicon', 'Semiconductor', 'Iconoclast', 'Iconography', 'icons', 'Ico', 'Vector', 'Symbols', '']) {
    assert.equal(motDIconeDansLeNom(nom), false, nom);
  }
});

test('E1.3 cas 1 : l\'instance d\'un composant Icon est une icône, quel que soit le nom du layer', () => {
  assert.equal(estUneIcone(instance('Leading', 'Icon')), true);
  assert.equal(estUneIcone(instance('Slot', 'Icon/Chevron')), true);
  assert.equal(estUneInstanceDIcone(instance('Slot', 'Icon')), true);
  assert.equal(estUneIcone(instance('Avatar', 'Photo')), false);
  assert.equal(estUneInstanceDIcone(instance('icon', 'Photo')), false);
});

test('E1.3 cas 2 : une instance qu\'une propriété d\'échange pilote est une icône si la propriété ou le layer dit icône (Q-F6-4)', () => {
  assert.equal(estUneIcone(instance('Slot', 'Chevron', 'Icon#1:2')), true);
  assert.equal(estUneIcone(instance('Trailing icon', 'Chevron', 'Slot#9:9')), true);
  assert.equal(estUneIcone(instance('Avatar', 'Photo', 'Image#2:3')), false);
  assert.equal(estUneIcone(instance('Avatar', 'Photo', 'Image')), false);
});

test('E1.3 cas 3 : un VECTOR ou un BOOLEAN_OPERATION dont le nom contient un mot d\'icône', () => {
  for (const nom of ['icon', 'Icône', 'Glyph', 'Pictogram', 'Symbol', 'check-icon']) {
    assert.equal(estUneIcone(tracé(nom)), true, nom);
    assert.equal(estUneIcone(tracé(nom, 'BOOLEAN_OPERATION')), true, nom);
  }
  for (const nom of ['Silicone', 'Vector', 'Shape', 'Ico', 'icons']) {
    assert.equal(estUneIcone(tracé(nom)), false, nom);
    assert.equal(estUneIcone(tracé(nom, 'BOOLEAN_OPERATION')), false, nom);
  }
});

test('E1.3 : un FRAME ou un TEXT n\'est jamais une icône, ni un RECTANGLE ou un GROUP nommé icon', () => {
  for (const type of ['FRAME', 'TEXT', 'RECTANGLE', 'GROUP', 'ELLIPSE', 'COMPONENT']) {
    assert.equal(estUneIcone({ nom: 'Icon', type }), false, type);
  }
  assert.equal(estUneIcone({ nom: 'Icon', type: 'FRAME', instanceDe: { nom: 'Icon', pilotee: 'Icon#1:2' } }), false);
});

test('E1.4 : un anneau est nommé Ring ou Focus ring (focus-ring toléré, point ou tiret bas en tête), ou lié à un token de rôle ring', () => {
  for (const nom of ['Ring', 'ring', 'Focus ring', 'Focus Ring', 'focus-ring', 'focus_ring', '.Ring', '_ring']) assert.equal(estUnNomDAnneau(nom), true, nom);
  for (const nom of ['Focus', 'outline', 'Ring Wrapper', 'Ringtone', 'Spring', 'Divider']) assert.equal(estUnNomDAnneau(nom), false, nom);
  assert.equal(estUnAnneau({ nom: 'Outline' }, ['ring']), true);
  assert.equal(estUnAnneau({ nom: 'Focus ring' }, ['border']), true);
  assert.equal(estUnAnneau({ nom: 'Focus ring' }), true);
  assert.equal(estUnAnneau({ nom: 'Outline' }, ['border', 'background']), false);
  assert.equal(estUnAnneau({ nom: 'Outline' }), false);
});

test('E1.5 : trois rôles désignent un layer, divider, ring et icon, et les autres ne regardent pas le nom', () => {
  assert.deepEqual([...ROLES_QUI_DESIGNENT_UN_LAYER], ['divider', 'ring', 'icon']);
  for (const role of ['divider', 'ring', 'icon']) assert.equal(leNomDuLayerDitLeRole(role), true, role);
  for (const role of ['background', 'foreground', 'text', 'border', 'inverse']) assert.equal(leNomDuLayerDitLeRole(role), false, role);
});

test('E1.5 : le rôle qu\'un layer désigne par son nom ou par son instance', () => {
  for (const nom of ['Divider', 'divider', 'Separator', '.Divider']) assert.equal(estUnNomDeSeparateur(nom), true, nom);
  for (const nom of ['Line', 'Dividers', 'Divider wrapper', 'Ring']) assert.equal(estUnNomDeSeparateur(nom), false, nom);
  assert.equal(roleQueLeLayerDesigne({ nom: 'Divider', type: 'RECTANGLE' }), 'divider');
  assert.equal(roleQueLeLayerDesigne({ nom: 'Separator', type: 'LINE' }), 'divider');
  assert.equal(roleQueLeLayerDesigne({ nom: 'Focus ring', type: 'FRAME' }), 'ring');
  assert.equal(roleQueLeLayerDesigne(instance('Leading', 'Icon')), 'icon');
  assert.equal(roleQueLeLayerDesigne({ nom: 'Container', type: 'FRAME' }), undefined);
  assert.equal(roleQueLeLayerDesigne({ nom: 'Icon', type: 'FRAME' }), undefined, 'le nom Icon d\'un FRAME ne désigne pas le rôle icon');
  assert.equal(roleQueLeLayerDesigne(tracé('icon')), undefined, 'un tracé nommé icon est une icône, mais le rôle icon ne regarde que l\'instance d\'Icon');
});

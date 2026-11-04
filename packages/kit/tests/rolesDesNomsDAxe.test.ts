/**
 * Le rôle d'un nom d'axe (E1.2 ; Q-F5-1, Q-F5-9, E-27) : style, taille, palette ou état, pour `axeDePropriete`.
 * Un nom français prend le rôle de son équivalent anglais, un interrupteur oui ou non ne pilote aucun segment.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { INTERRUPTEURS, NOMS_D_AXES, NOMS_D_AXES_FRANCAIS } from '../src/referentiel/architecture.js';
import { axeDePropriete, estUnInterrupteur, nomDAxeEnAnglais } from '../src/controles/nommage.js';

test('Type, Kind et Shape pilotent le style', () => {
  for (const nom of ['Type', 'Kind', 'Shape', 'type', 'KIND']) assert.equal(axeDePropriete(nom), 'style', nom);
});

test('Density et Spacing pilotent la taille', () => {
  for (const nom of ['Density', 'Spacing', 'density']) assert.equal(axeDePropriete(nom), 'taille', nom);
});

test('Hierarchy, Emphasis et Fill style pilotent le style, Tone et Colour la palette (corpus de F5)', () => {
  for (const nom of ['Hierarchy', 'Emphasis', 'Fill style', 'FillStyle']) assert.equal(axeDePropriete(nom), 'style', nom);
  for (const nom of ['Tone', 'Colour']) assert.equal(axeDePropriete(nom), 'palette', nom);
});

test('un nom d’axe français prend le rôle de son équivalent anglais', () => {
  for (const nom of ['Couleur', 'Intention', 'Gravité', 'Gravite', 'couleur']) assert.equal(axeDePropriete(nom), 'palette', nom);
  for (const nom of ['Variante', 'Apparence', 'Hiérarchie', 'Hierarchie']) assert.equal(axeDePropriete(nom), 'style', nom);
  assert.equal(axeDePropriete('Taille'), 'taille');
  assert.equal(axeDePropriete('État'), 'etat');
});

test('un nom d’axe français reçoit un renommage vers l’anglais, à la casse de son initiale', () => {
  const attendu: Record<string, string> = {
    Couleur: 'Color', Intention: 'Intent', Gravité: 'Severity', Variante: 'Variant', Apparence: 'Appearance',
    Hiérarchie: 'Hierarchy', Taille: 'Size', État: 'State', Etat: 'State', couleur: 'color',
  };
  for (const [nom, anglais] of Object.entries(attendu)) assert.equal(nomDAxeEnAnglais(nom), anglais, nom);
  for (const nom of ['Color', 'Size', 'Type', 'State', 'Label', '']) assert.equal(nomDAxeEnAnglais(nom), undefined, nom);
});

test('chaque équivalent anglais d’un nom français pilote un segment', () => {
  for (const [francais, anglais] of Object.entries(NOMS_D_AXES_FRANCAIS)) {
    assert.ok(axeDePropriete(anglais) !== undefined, `${francais} → ${anglais}`);
  }
});

test('un interrupteur oui ou non ne pilote aucun segment et garde son nom', () => {
  for (const nom of ['Destructive', 'Danger', 'High contrast', 'HighContrast', 'Loading', 'Selected']) {
    assert.equal(estUnInterrupteur(nom), true, nom);
    assert.equal(axeDePropriete(nom), undefined, nom);
    assert.equal(nomDAxeEnAnglais(nom), undefined, nom);
  }
  for (const nom of ['Size', 'Type', 'State', 'Intent', 'Label', '']) assert.equal(estUnInterrupteur(nom), false, nom);
});

test('un nom de propriété de l’objet ne passe pas pour un nom d’axe', () => {
  for (const nom of ['constructor', 'toString', '__proto__']) {
    assert.equal(axeDePropriete(nom), undefined, nom);
    assert.equal(nomDAxeEnAnglais(nom), undefined, nom);
  }
});

test('la table des noms d’axe : aucun nom ne porte deux rôles ni n’est un interrupteur', () => {
  const tous = Object.values(NOMS_D_AXES).flat();
  assert.equal(new Set(tous).size, tous.length);
  for (const interrupteur of INTERRUPTEURS) assert.ok(!tous.includes(interrupteur), interrupteur);
});

test('les noms d’axe d’avant restent lus', () => {
  assert.equal(axeDePropriete('Size'), 'taille');
  assert.equal(axeDePropriete('Sizes'), 'taille');
  assert.equal(axeDePropriete('Variant'), 'style');
  assert.equal(axeDePropriete('Appearance'), 'style');
  for (const nom of ['Palette', 'Severity', 'Intent', 'Color']) assert.equal(axeDePropriete(nom), 'palette', nom);
  assert.equal(axeDePropriete('State'), 'etat');
  assert.equal(axeDePropriete('Label'), undefined);
});

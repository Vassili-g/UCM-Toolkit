/** Les formats de copie, exacts pour zéro, faux, la chaîne vide et l'alpha. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { copier, texteDeChaine } from '../src/copie';
import { indexer } from '../src/indexation';
import { hexaDeCouleur } from '../src/modele';
import { resoudre } from '../src/resolution';
import { projetLibre } from './fixtures';

const index = indexer(projetLibre());
const copie = (variable: string, format: Parameters<typeof copier>[3], contexte = {}) => copier(index, variable, resoudre(index, variable, contexte), format);

test('zéro, faux et la chaîne vide se copient tels quels, sans unité', () => {
  assert.equal(copie('zero', 'valeur').texte, '0');
  assert.equal(copie('espace-carte', 'valeur', { mesures: 'mesures:Confort' }).texte, '24');
  assert.equal(copie('visible', 'valeur').texte, 'false');
  assert.equal(copie('libelle', 'valeur').texte, '');
});

test('une couleur se copie en composantes exactes, ou en hexadécimal qui annonce son arrondi', () => {
  assert.equal(copie('voile', 'composantes', { couleurs: 'couleurs:Jour' }).texte, 'rgba(0, 0, 0, 0.4)');
  // 0,4 × 255 vaut 102 exactement ; 0,25 × 255 vaut 63,75, arrondi à 64.
  assert.deepEqual([copie('voile', 'hexa', { couleurs: 'couleurs:Jour' }).texte, copie('voile', 'hexa', { couleurs: 'couleurs:Jour' }).arrondi], ['#00000066', false]);
  const hexa = copie('voile', 'hexa', { couleurs: 'couleurs:Nuit' });
  assert.deepEqual([hexa.texte, hexa.arrondi], ['#FFFFFF40', true]);
  assert.deepEqual(hexaDeCouleur({ r: 1, g: 0, b: 0, a: 1 }), { hexa: '#FF0000', arrondi: false });
  assert.equal(copie('carte-fond', 'hexa').arrondi, false);
});

test('une valeur non résolue ne se copie pas, mais sa chaîne se copie comme constat', () => {
  const valeur = copie('legacy', 'valeur');
  assert.deepEqual([valeur.texte, valeur.raison], [null, 'non-resolu']);
  const chaine = copier(index, 'legacy', resoudre(index, 'legacy', {}), 'chaine', { constat: 'Cible inaccessible' });
  assert.equal(chaine.texte, 'Interface / legacy/border [Valeur]\n→ Cible inaccessible');
});

test('le nom copié est le nom Figma exact, et la chaîne nomme chaque mode', () => {
  assert.equal(copie('entete-titre', 'nom').texte, 'card/header/title');
  assert.equal(texteDeChaine(index, resoudre(index, 'carte-fond', {}), null), 'Interface / card/fill [Valeur]\n→ Couleurs / surface [Nuit]\n→ Couleurs / encre [Nuit]\n→ #222630');
});

test('aucune référence publiée sans correspondance vérifiée', () => {
  assert.deepEqual([copie('carte-fond', 'reference').texte, copie('carte-fond', 'reference').raison], [null, 'sans-correspondance']);
  const verifiee = copier(index, 'carte-fond', resoudre(index, 'carte-fond', {}), 'reference', { reference: '{interface.card.fill}' });
  assert.equal(verifiee.texte, '{interface.card.fill}');
});

test('une couleur n’a pas de forme hexadécimale pour un nombre', () => {
  assert.equal(copie('zero', 'hexa').raison, 'pas-une-couleur');
});

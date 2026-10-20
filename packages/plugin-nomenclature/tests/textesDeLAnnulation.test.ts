/** Les textes qu'une annulation laisse devant le designer quand des noms sont dans une collection exclue de l'analyse. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { TEXTES } from '../src/ui/textes';

test('N09 : le texte dit combien de noms sont rétablis, que les autres sont gardés, et quoi cocher pour les rétablir', () => {
  assert.equal(TEXTES.annulationDansUneCollectionExclue(3, 2),
    '3 noms rétablis. 2 autres noms sont dans une collection exclue de l’analyse : le plugin les garde. Pour les rétablir, cochez de nouveau la collection dans l’onglet Réglages, puis annulez de nouveau dans l’onglet Historique.');
  assert.equal(TEXTES.annulationDansUneCollectionExclue(1, 1),
    '1 nom rétabli. 1 autre nom est dans une collection exclue de l’analyse : le plugin le garde. Pour le rétablir, cochez de nouveau la collection dans l’onglet Réglages, puis annulez de nouveau dans l’onglet Historique.');
});

test('N09 : sans nom rétabli, le texte ne parle pas d’une annulation refusée à relancer', () => {
  const texte = TEXTES.annulationDansUneCollectionExclue(0, 3);
  assert.equal(texte,
    'Aucun nom n’a été rétabli. 3 noms sont dans une collection exclue de l’analyse : le plugin les garde. Pour les rétablir, cochez de nouveau la collection dans l’onglet Réglages, puis annulez de nouveau dans l’onglet Historique.');
  assert.doesNotMatch(texte, /Relancez l’analyse/u);
});

test('N09 : depuis l’onglet Renommages, le texte commence par ouvrir Configuration', () => {
  assert.equal(TEXTES.annulationDansUneCollectionExclue(2, 1, 'renommages'),
    '2 noms rétablis. 1 autre nom est dans une collection exclue de l’analyse : le plugin le garde. Pour le rétablir, ouvrez Configuration, cochez de nouveau la collection dans l’onglet Réglages, puis annulez de nouveau dans l’onglet Historique.');
});

test('N09 : les autres noms non rétablis ont leur propre phrase, accordée', () => {
  assert.match(TEXTES.annulationAutresNomsNonRetablis(1), /^1 autre nom n’a pas pu être rétabli : un nom occupe déjà sa place/u);
  assert.match(TEXTES.annulationAutresNomsNonRetablis(2), /^2 autres noms n’ont pas pu être rétablis : un nom occupe déjà leur place/u);
});

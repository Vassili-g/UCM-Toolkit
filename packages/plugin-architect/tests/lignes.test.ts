/** La logique pure des cartes de Renommages : sections, segments marqués, file des pages de noms. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { apresUnePage, creerLaFile, nomsRestants, prochainDebut, sectionsDansLOrdre, segmentsDeNom } from '../src/ui/lignes';

test('un nom se découpe aux / et seuls les rangs marqués le sont', () => {
  assert.deepEqual(segmentsDeNom('colors/Neutral/light/700', [0]), [
    { texte: 'colors', marque: true },
    { texte: 'Neutral', marque: false },
    { texte: 'light', marque: false },
    { texte: '700', marque: false },
  ]);
  assert.deepEqual(
    segmentsDeNom('fontSize/bodyLarge', [0, 1]).map(({ marque }) => marque),
    [true, true],
  );
  assert.deepEqual(
    segmentsDeNom('Card/bg/default', []).map(({ marque }) => marque),
    [false, false, false],
  );
});

test('l’ancien et le nouveau nom gardent le même nombre de segments, marqués aux mêmes rangs', () => {
  const ancien = segmentsDeNom('Button/bg/hover', [1]);
  const nouveau = segmentsDeNom('Button/background/hover', [1]);
  assert.equal(ancien.length, nouveau.length);
  assert.deepEqual(
    ancien.map(({ marque }) => marque),
    nouveau.map(({ marque }) => marque),
  );
  assert.equal(nouveau[1].texte, 'background');
});

test('les sections vont des conventions d’écriture au vocabulaire puis aux collections, sans section vide', () => {
  const groupe = (cle: string, sorte: 'terme' | 'ecriture' | 'collection') => ({ cle, regle: { sorte } });
  const groupes = [groupe('c1', 'collection'), groupe('t1', 'terme'), groupe('e1', 'ecriture'), groupe('t2', 'terme')];
  assert.deepEqual(
    sectionsDansLOrdre(groupes).map(({ sorte, groupes: dedans }) => [sorte, dedans.map(({ cle }) => cle)]),
    [['ecriture', ['e1']], ['terme', ['t1', 't2']], ['collection', ['c1']]],
  );
  assert.deepEqual(
    sectionsDansLOrdre([groupe('t1', 'terme')]).map(({ sorte }) => sorte),
    ['terme'],
  );
  assert.deepEqual(sectionsDansLOrdre([]), []);
});

test('la file demande la page qui suit les noms déjà montrés, jusqu’au total', () => {
  let file = creerLaFile(4, 120, 2);
  assert.equal(nomsRestants(file), 118);
  assert.equal(prochainDebut(file, 4), 2);
  file = apresUnePage(file, { generation: 4, nouveaux: 50 })!;
  assert.equal(prochainDebut(file, 4), 52);
  file = apresUnePage(file, { generation: 4, nouveaux: 50 })!;
  assert.equal(prochainDebut(file, 4), 102);
  file = apresUnePage(file, { generation: 4, nouveaux: 18 })!;
  assert.equal(nomsRestants(file), 0);
  assert.equal(prochainDebut(file, 4), null);
});

test('la file s’arrête quand la génération de l’écran n’est plus celle de la carte', () => {
  const file = creerLaFile(4, 120, 2);
  assert.equal(prochainDebut(file, 5), null);
  assert.equal(prochainDebut(file, null), null);
});

test('une page d’une autre génération arrête la file', () => {
  assert.equal(apresUnePage(creerLaFile(4, 120, 2), { generation: 5, nouveaux: 50 }), null);
});

test('une page sans nom nouveau épuise la file, qui ne redemande pas la même page', () => {
  const file = apresUnePage(creerLaFile(4, 120, 2), { generation: 4, nouveaux: 0 })!;
  assert.equal(nomsRestants(file), 0);
  assert.equal(prochainDebut(file, 4), null);
});

test('une carte dont tous les noms sont montrés n’a rien à demander', () => {
  assert.equal(prochainDebut(creerLaFile(1, 2, 2), 1), null);
});

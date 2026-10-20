/** L'annonce des renommages : une application reçue survit à l'erreur de la relecture. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ResultatVue } from '../src/messages';
import { annonceApresUneErreur, annonceDUneAnnulation, annonceDUneApplication } from '../src/ui/annonce';
import { TEXTES } from '../src/ui/textes';

const applique: ResultatVue = { sorte: 'application', statut: 'applique', renommes: 4, sautes: 0, annulable: true };

test('une application appliquée annonce ses noms renommés', () => {
  assert.deepEqual(annonceDUneApplication(applique), { type: 'renomme', renommes: 4, sautes: 0, annulable: true, bilanIllisible: false });
});

test('une application partielle compte les noms sautés', () => {
  const annonce = annonceDUneApplication({ ...applique, statut: 'partiel', sautes: 2 });
  assert.equal(annonce.type === 'renomme' && annonce.sautes, 2);
});

test('un refus garde sa cause', () => {
  assert.deepEqual(annonceDUneApplication({ ...applique, statut: 'refuse', renommes: 0, annulable: false, cause: 'journal-impossible' }), { type: 'refuse', cause: 'journal-impossible' });
  assert.deepEqual(annonceDUneApplication({ ...applique, statut: 'refuse', renommes: 0, annulable: false }), { type: 'refuse' });
});

test('une erreur après une application reçue garde l’annonce et ajoute le bilan illisible', () => {
  const annonce = annonceDUneApplication(applique);
  assert.deepEqual(annonceApresUneErreur({ sorte: 'application', demande: 3, recue: true }, annonce), { ...annonce, bilanIllisible: true });
});

test('une erreur sans application reçue annonce que rien n’a été renommé', () => {
  assert.deepEqual(annonceApresUneErreur({ sorte: 'application', demande: 3 }, null), { type: 'refuse' });
  assert.deepEqual(annonceApresUneErreur({ sorte: 'application', demande: 3, recue: false }, null), { type: 'refuse' });
});

test('une erreur pendant une annulation annonce son refus', () => {
  assert.deepEqual(annonceApresUneErreur({ sorte: 'annulation', demande: 4 }, null), { type: 'annulation-refusee' });
});

const annulation: ResultatVue = { sorte: 'annulation', statut: 'applique', renommes: 4, sautes: 0, annulable: false };

test('une annulation complète n’annonce rien, une partielle compte les noms non rétablis, une refusée propose de relancer', () => {
  assert.equal(annonceDUneAnnulation(annulation), null);
  assert.deepEqual(annonceDUneAnnulation({ ...annulation, statut: 'partiel', sautes: 2 }), { type: 'annulation-partielle', sautes: 2 });
  assert.deepEqual(annonceDUneAnnulation({ ...annulation, statut: 'refuse', renommes: 0, sautes: 2 }), { type: 'annulation-refusee' });
});

test('N09 : des noms gardés dans une collection exclue ne sont ni un refus à relancer ni des noms changés', () => {
  assert.deepEqual(annonceDUneAnnulation({ ...annulation, statut: 'refuse', renommes: 0, sautes: 3, exclues: 3 }),
    { type: 'annulation-collection-exclue', retablis: 0, exclues: 3, autres: 0 });
  assert.deepEqual(annonceDUneAnnulation({ ...annulation, statut: 'partiel', renommes: 5, sautes: 3, exclues: 2 }),
    { type: 'annulation-collection-exclue', retablis: 5, exclues: 2, autres: 1 });
});

test('une annulation distingue les variables non vérifiées des autres noms non rétablis', () => {
  for (const statut of ['partiel', 'refuse'] as const) {
    assert.deepEqual(annonceDUneAnnulation({ ...annulation, statut, renommes: statut === 'partiel' ? 4 : 0, sautes: 6, exclues: 2, nonVerifiees: 3 }),
      { type: 'annulation-non-verifiee', retablis: statut === 'partiel' ? 4 : 0, exclues: 2, nonVerifiees: 3, autres: 1 });
  }
});

test('N09 : depuis Renommages, le texte envoie à Configuration, là où se cochent les collections', () => {
  assert.equal(TEXTES.annulationDansUneCollectionExclue(0, 3, 'renommages'),
    'Aucun nom n’a été rétabli. 3 noms sont dans une collection exclue de l’analyse : le plugin les garde. '
    + 'Pour les rétablir, ouvrez Configuration, cochez de nouveau la collection dans l’onglet Réglages, puis annulez de nouveau dans l’onglet Historique.');
  assert.equal(TEXTES.annulationDansUneCollectionExclue(1, 1, 'renommages'),
    '1 nom rétabli. 1 autre nom est dans une collection exclue de l’analyse : le plugin le garde. '
    + 'Pour le rétablir, ouvrez Configuration, cochez de nouveau la collection dans l’onglet Réglages, puis annulez de nouveau dans l’onglet Historique.');
});

test('un lot partiel compte à part les variables non vérifiées : `sautes` garde les autres', () => {
  assert.deepEqual(annonceDUneApplication({ ...applique, statut: 'partiel', sautes: 3, nonVerifiees: 2 }),
    { type: 'renomme', renommes: 4, sautes: 1, nonVerifiees: 2, annulable: true, bilanIllisible: false });
  assert.deepEqual(annonceDUneApplication({ ...applique, statut: 'partiel', sautes: 2, nonVerifiees: 2 }),
    { type: 'renomme', renommes: 4, sautes: 0, nonVerifiees: 2, annulable: true, bilanIllisible: false });
});

test('un lot refusé dont toutes les variables sautées sont non vérifiées a sa propre annonce', () => {
  const refuse: ResultatVue = { ...applique, statut: 'refuse', renommes: 0, annulable: false, sautes: 2, nonVerifiees: 2 };
  assert.deepEqual(annonceDUneApplication(refuse), { type: 'refuse-non-verifiee' });
  assert.deepEqual(annonceDUneApplication({ ...refuse, sautes: 3 }), { type: 'refuse' });
  assert.deepEqual(annonceDUneApplication({ ...refuse, cause: 'journal-impossible' }), { type: 'refuse', cause: 'journal-impossible' });
});

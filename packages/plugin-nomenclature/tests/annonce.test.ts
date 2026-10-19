/** L'annonce des renommages : une application reçue survit à l'erreur de la relecture. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { ResultatVue } from '../src/messages';
import { annonceApresUneErreur, annonceDUneApplication } from '../src/ui/annonce';

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

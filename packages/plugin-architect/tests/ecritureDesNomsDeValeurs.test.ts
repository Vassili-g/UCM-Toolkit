/** Renommer une valeur de variante (C12) : relecture, valeur cible déjà présente, un lot et un seul point d’annulation. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Correction } from '@ucm-kit/core/controles';
import { texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { ecrireLeLot, type ApiDeLiaisons } from '../src/ecriture/liaisons';
import { ecrireLesNomsDeValeurs, type ApiDeNomsDeValeurs } from '../src/ecriture/noms-de-valeurs';
import { atelierDEcriture, type OptionsDeLEcriture } from './figmaDeTest';

const renommage = (id: string, extras: Partial<Correction> = {}): Correction => ({
  id, sorte: 'nom-de-valeur', cible: { layer: 'jeu', champ: 'Size' }, avant: 'Medium', apres: { nom: 'md' }, aRelire: { regle: 'valeurs', avant: 'Medium' }, ...extras,
});

function atelier(noms: readonly string[], options: OptionsDeLEcriture = {}) {
  const a = atelierDEcriture(options);
  a.jeuDeVariants('jeu', noms);
  return { ...a, noms: a.api as unknown as ApiDeNomsDeValeurs, lot: a.api as unknown as ApiDeLiaisons };
}

test('la valeur est renommée dans chaque variant qui la porte, les autres propriétés restent', async () => {
  const a = atelier(['Size=Medium, State=default', 'Size=Medium, State=hover', 'Size=Small, State=default']);
  const rendu = await ecrireLesNomsDeValeurs([renommage('n1')], a.noms);
  assert.deepEqual(rendu, { ecrites: ['n1'], sautees: [] });
  assert.deepEqual(a.journal, ['nom:jeu-v0:Size=md, State=default', 'nom:jeu-v1:Size=md, State=hover']);
});

test('une valeur cible déjà présente dans la propriété n’est jamais écrite : fait-faux', async () => {
  const a = atelier(['Size=Medium', 'Size=md']);
  const rendu = await ecrireLesNomsDeValeurs([renommage('n1')], a.noms);
  assert.deepEqual(rendu, { ecrites: [], sautees: [{ id: 'n1', motif: 'fait-faux' }] });
  assert.deepEqual(a.journal, []);
});

test('la même valeur dans une autre propriété ne gêne pas', async () => {
  const a = atelier(['Size=Medium, Tone=md']);
  assert.deepEqual((await ecrireLesNomsDeValeurs([renommage('n1')], a.noms)).ecrites, ['n1']);
});

test('un jeu disparu, une propriété ou une valeur absente : objet-change', async () => {
  const a = atelier(['Size=Small']);
  const rendu = await ecrireLesNomsDeValeurs([renommage('n1'), renommage('n2', { cible: { layer: 'jeu', champ: 'Tone' } }), renommage('n3', { cible: { layer: 'absent', champ: 'Size' } })], a.noms);
  assert.deepEqual(rendu.sautees, [{ id: 'n1', motif: 'objet-change' }, { id: 'n2', motif: 'objet-change' }, { id: 'n3', motif: 'objet-change' }]);
  assert.deepEqual(a.journal, []);
});

test('un fichier qui ne déclare plus UCM ne reçoit rien', async () => {
  const a = atelier(['Size=Medium'], { declaration: texteDeLArchitectureDuFichier(false) });
  assert.deepEqual(await ecrireLesNomsDeValeurs([renommage('n1')], a.noms), { ecrites: [], sautees: [{ id: 'n1', motif: 'non-ucm' }] });
  assert.deepEqual(a.journal, []);
});

test('un renommage que Figma refuse saute la correction : erreur', async () => {
  const a = atelier(['Size=Medium'], { refusees: new Set(['jeu-v0']) });
  assert.deepEqual(await ecrireLesNomsDeValeurs([renommage('n1')], a.noms), { ecrites: [], sautees: [{ id: 'n1', motif: 'erreur' }] });
});

test('le lot écrit les noms de valeurs avec les liaisons et pose un seul commitUndo', async () => {
  const a = atelier(['Size=Medium']);
  a.layer('1:1', 'FRAME', { paddingLeft: 8 });
  const liaison: Correction = { id: 'l1', sorte: 'liaison', cible: { layer: '1:1', champ: 'paddingLeft' }, avant: null, apres: { cle: 'k', nom: 'n' }, aRelire: { regle: 'r', avant: null } };
  const rendu = await ecrireLeLot([renommage('n1'), liaison], {}, a.lot);
  assert.ok(rendu.ecrites.includes('n1'));
  assert.equal(a.journal.filter((ligne) => ligne === 'commitUndo').length, 1);
  assert.equal(a.journal.at(-1), 'commitUndo');
  assert.ok(a.journal.indexOf('nom:jeu-v0:Size=md') < a.journal.indexOf('commitUndo'));
});

test('hors UCM, le lot saute aussi nom-de-valeur', async () => {
  const a = atelier(['Size=Medium'], { declaration: texteDeLArchitectureDuFichier(false) });
  const rendu = await ecrireLeLot([renommage('n1')], {}, a.lot);
  assert.deepEqual(rendu, { ecrites: [], sautees: [{ id: 'n1', motif: 'non-ucm' }] });
  assert.deepEqual(a.journal, []);
});

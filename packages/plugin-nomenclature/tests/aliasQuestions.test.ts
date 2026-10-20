/** N08 : de l'adaptateur Figma aux questions, une cible d'alias locale se retrouve dans le lexique. */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { PluginMessage } from '../src/messages';
import { creerPortDeLecture } from '../src/lectureFigma';
import { creerSession } from '../src/session';

test('N08 : deux alias locaux entre les branches ledger et registre posent la question de la paire', async () => {
  const variables = [
    ['t1', 'colors/zorb/registre/solid'], ['a1', 'colors/zorb/ledger/solid', 't1'],
    ['t2', 'colors/quix/registre/solid'], ['a2', 'colors/quix/ledger/solid', 't2'],
  ].map(([id, name, cible]) => ({
    id, name, remote: false, variableCollectionId: 'c',
    valuesByMode: { m1: cible ? { type: 'VARIABLE_ALIAS', id: cible } : { r: 0, g: 0, b: 0 } },
    getSharedPluginData: () => '',
  }));
  const api = {
    variables: { getLocalVariableCollectionsAsync: async () => [{ id: 'c', name: 'custom', remote: false }], getLocalVariablesAsync: async () => variables },
    root: { getSharedPluginData: () => '' },
  } as unknown as PluginAPI;
  const messages: PluginMessage[] = [];
  const stock = new Map<string, string>();
  const session = creerSession({
    port: {
      lecture: creerPortDeLecture(api),
      ecriture: { ouvrir: async () => { throw new Error('pas d’écriture'); } },
      regles: { cles: () => [...stock.keys()], lire: (cle) => stock.get(cle) ?? '', ecrire: (cle, texte) => { stock.set(cle, texte); }, effacer: (cle) => { stock.delete(cle); } },
    },
    envoyer: (message) => { messages.push(message); },
    tranches: { pause: async () => {} },
  });
  await session.recevoir({ type: 'analyser', demande: 1 });
  const bilan = messages.find((message) => message.type === 'bilan');
  assert.ok(bilan && bilan.type === 'bilan');
  assert.ok(bilan.bilan.questions.some((question) => question.cle === 'paire:ledger|registre'),
    JSON.stringify(bilan.bilan.questions.map((question) => question.cle)));
});

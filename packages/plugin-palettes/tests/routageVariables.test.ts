/** Les refus de Figma reviennent à la demande qui les a déclenchés dans le sandbox. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { jsonCanonique, recetteParDefaut } from 'ucm-couleur';
import { ajouter, nouvellePalette } from '../src/edition';
import { empreinteDuTexte } from '../src/lecture';
import type { PluginMessage, UiRequest } from '../src/messages';
import { FauxFigma } from './figmaDeTest';

test('[VAR-04] les lectures et mutations refusées rendent une réponse numérotée et libèrent la file du sandbox', async () => {
  const reponses: PluginMessage[] = [];
  const ui = { postMessage: (message: PluginMessage) => { reponses.push(message); }, resize: () => {}, onmessage: undefined as undefined | ((message: UiRequest) => Promise<void>) };
  const figma = Object.assign(new FauxFigma(), { ui, showUI: () => {}, clientStorage: { getAsync: async () => undefined, setAsync: async () => {} } });
  Object.assign(globalThis, { figma, __html__: '' });
  await import('../src/code');
  const recevoir = ui.onmessage!;
  const recette = ajouter(recetteParDefaut(), nouvellePalette(recetteParDefaut(), 'p-0000000a', '#1E6FD9', 1)!);
  const texte = jsonCanonique(recette);
  figma.root.setSharedPluginData('ucm_palettes', 'recette', texte);
  figma.variables.getLocalVariablesAsync = async () => { throw new Error('lecture refusée'); };
  figma.variables.getLocalVariableCollectionsAsync = async () => { throw new Error('collections refusées'); };
  await recevoir({ type: 'lire-etat', demande: 1 });
  await recevoir({ type: 'ecrire-variables', demande: 2, empreinteLue: empreinteDuTexte(texte), palettes: ['p-0000000a'], remettre: [] });
  await recevoir({ type: 'ranger-destination', demande: 3, destination: { collection: { id: 'absente' }, groupe: '', themes: 'chemin' } });
  await recevoir({ type: 'reprendre-palette', demande: 4, empreinteLue: empreinteDuTexte(texte), recette, palette: 'p-0000000a', source: { collection: 'absente', chemin: 'bleu' } });
  await recevoir({ type: 'ranger-destination', demande: 5, destination: { collection: { nom: 'Nouvelle' }, groupe: '', themes: 'chemin' } });
  assert.deepEqual(reponses.map((reponse) => [reponse.type, 'demande' in reponse ? reponse.demande : null]), [['etat-refuse', 1], ['variables-ecrites', 2], ['destination-rangee', 3], ['reprise', 4], ['destination-rangee', 5]]);
  assert.ok(reponses.slice(1, 4).every((reponse) => ('issue' in reponse ? reponse.issue : 'resultat' in reponse ? reponse.resultat : null)?.issue === 'interrompue'));
  assert.equal(reponses[4].type === 'destination-rangee' ? reponses[4].issue.issue : null, 'rangee');
});

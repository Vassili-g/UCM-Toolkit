/** Les deux côtés de la frontière refusent les lectures concurrentes. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { creerFrontiere } from '../src/ui/frontiere';
import { creerRoutage } from '../src/routage';
import { analyserInventaire } from '../src/analyse';
import { estUiMessage, type PluginMessage, type UiMessage } from '../src/messages';
import type { PortDeLecture } from '../src/lecture';

test('l’interface numérote les demandes, garde une analyse en vol et rejette les réponses anciennes', () => {
  const envoyes: UiMessage[] = [];
  const affiches: PluginMessage[] = [];
  const frontiere = creerFrontiere((message) => envoyes.push(message), (message) => affiches.push(message));
  frontiere.analyser();
  frontiere.analyser();
  frontiere.recevoir({ type: 'erreur', demande: 0, message: 'Ancien' });
  assert.equal(affiches.length, 0);
  frontiere.recevoir({ type: 'erreur', demande: 1, message: 'Erreur' });
  frontiere.analyser();
  frontiere.recevoir({ type: 'erreur', demande: 1, message: 'Ancien' });
  frontiere.recevoir({ type: 'initial' });
  assert.equal(affiches.length, 1);
  assert.deepEqual(envoyes, [{ type: 'analyser', demande: 1 }, { type: 'analyser', demande: 2 }]);
});

test('le routage refuse une seconde lecture et libère le geste après un échec', async () => {
  const reponses: PluginMessage[] = [];
  let liberer = () => {};
  let lectures = 0;
  const port: PortDeLecture = { collections: async () => { lectures++; await new Promise<void>((resolve) => { liberer = resolve; }); throw new Error('refus'); }, variables: async () => [], pages: () => [] };
  const router = creerRoutage({ lecture: port, pause: async () => {}, envoyer: (message) => reponses.push(message) });
  const premiere = router(1);
  await router(2);
  assert.equal(lectures, 1);
  liberer();
  await premiere;
  const suivante = router(3);
  liberer();
  await suivante;
  await router(1);
  assert.equal(lectures, 2);
  assert.deepEqual(reponses.filter((message) => message.type === 'erreur').map((message) => message.demande), [2, 1, 3]);
});

test('la détection sans preuve choisit Inchangée et une préférence explicite prévaut', () => {
  const inventaire = { entrees: [{ nom: { id: 'v', categorie: 'variables' as const, portee: 'c', nom: 'Color' }, cible: { type: 'variable' as const, variableId: 'v', collectionId: 'c' }, renommable: true }], pages: [] };
  assert.deepEqual(analyserInventaire(inventaire).conventions.variables, { casse: 'inchangee', separateur: 'inchange' });
  const resultat = analyserInventaire(inventaire, { variables: { casse: 'minuscules', separateur: 'tiret' } });
  assert.equal(resultat.normalisation.propositions[0].nouveauNom, 'color');
});

test('les occupants gelés bloquent une proposition qui atteindrait leur nom', () => {
  const inventaire = { entrees: ['A B', 'a-b'].map((nom, index) => ({ nom: { id: `v${index}`, categorie: 'valeurs' as const, portee: 'axe', nom }, cible: { type: 'valeur' as const, ownerId: 'set', axe: 'State', valeur: nom, componentIds: [] }, renommable: index === 0 })), pages: [] };
  const resultat = analyserInventaire(inventaire, { valeurs: { casse: 'minuscules', separateur: 'tiret' } });
  assert.equal(resultat.normalisation.propositions.length, 0);
  assert.equal(resultat.normalisation.collisions.length, 1);
});

test('les demandes invalides sont refusées avant routage', () => {
  for (const brut of [null, {}, { type: 'analyser', demande: -1 }, { type: 'analyser', demande: 1.2 }, { type: 'resize', largeur: Infinity, hauteur: 4 }]) assert.equal(estUiMessage(brut), false);
  assert.equal(estUiMessage({ type: 'analyser', demande: 1 }), true);
});

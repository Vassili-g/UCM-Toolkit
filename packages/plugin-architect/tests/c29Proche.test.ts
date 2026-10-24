/**
 * C29 proche (G6) : la question que le sandbox transforme en correction, la valeur que cette correction porte, et la carte de
 * l'onglet Questions, avec le regroupement des variants. Le kit produit la question ; ces tests la prennent telle qu'il la rend.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import { proposerLesCorrections, type CatalogueDeReference, type Constat, type LayerLu, type ReleveDeComposant } from '@ucm-kit/core/controles';

import type { PluginMessage } from '../src/messages';
import { commencerUneAnalyse, correctionsDeLAnalyse, reinitialiserLAnalyse, retenirLesCorrections } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { traiter } from '../src/sandbox/questions';
import { carteDeQuestion, regrouperLesCartes, reponsesDuGroupe, type ContexteDeQuestions } from '../src/ui/questions/modele';

const dimensions = { x: 0, y: 0, largeur: 20, hauteur: 20 };
const layer = (id: string, valeur: number): LayerLu => ({
  id, nom: 'fond', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions,
  peintures: [], liaisons: [], valeursEnDur: [{ champ: 'cornerRadius', valeur }],
});
const releve = (...variants: string[]): ReleveDeComposant => ({
  version: 1, jeu: { cle: 'alert-set', id: 'alert-set', nom: 'Alert' }, proprietes: [],
  variants: variants.map((id) => ({ id, nom: id, valeurs: {}, modesEffectifs: {}, layers: [layer(`${id}:fond`, 13)] })),
  lecture: { layersLus: variants.length, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
});
const rayon = (cle: string, valeur: number): CatalogueDeReference['variables'][number] => ({
  cle, nom: `radius/${cle}`, collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur }, Dark: { valeur } },
});
const catalogue = (...variables: CatalogueDeReference['variables']): CatalogueDeReference => ({
  version: 1, library: null,
  collections: [{ cle: 'layout', nom: 'layout', role: 'layout', modes: [{ id: 'Light', nom: 'Light' }, { id: 'Dark', nom: 'Dark' }], etat: 'lue' }],
  variables,
});
const c29 = (lu: ReleveDeComposant, cat: CatalogueDeReference): Constat[] => proposerLesCorrections(lu, cat, []).filter(({ code }) => code === 'C29');
const contexteUi = (lu: ReleveDeComposant): ContexteDeQuestions => ({
  composant: 'Alert', variants: lu.variants.map(({ id, nom }) => ({ id, nom })), layers: new Map(),
});

beforeEach(() => reinitialiserLAnalyse());

test('une réponse à une question proche tire une correction qui porte la valeur lue et dit que la valeur change', async () => {
  const lu = releve('v1');
  const [constat] = c29(lu, catalogue(rayon('r14', 14)));
  assert.equal(constat.faits.proche, 1);
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: {} as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument() {} };
  const analyse = commencerUneAnalyse('Alert', ['alert-set'], contexte);
  retenirLesCorrections(analyse, [constat], lu);
  await traiter({ type: 'repondre', analyse, question: constat.id, reponse: 'r14' }, contexte);
  const correction = correctionsDeLAnalyse(analyse)?.get(constat.id);
  assert.deepEqual(correction, {
    id: constat.id, sorte: 'liaison', cible: { layer: 'v1:fond', champ: 'cornerRadius' }, avant: null,
    apres: { cle: 'r14', nom: 'radius/r14' },
    aRelire: { axes: {}, regle: 'Le designer a choisi un token proche. La valeur change.', avant: null, valeur: 13 },
  });
});

test('une réponse à une question C29 à plusieurs exacts porte la valeur lue, sans la règle du token proche', async () => {
  const lu = releve('v1');
  const [constat] = c29(lu, catalogue(rayon('a', 13), rayon('b', 13)));
  assert.equal(constat.faits.proche, undefined);
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: {} as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument() {} };
  const analyse = commencerUneAnalyse('Alert', ['alert-set'], contexte);
  retenirLesCorrections(analyse, [constat], lu);
  await traiter({ type: 'repondre', analyse, question: constat.id, reponse: 'b' }, contexte);
  const { aRelire } = correctionsDeLAnalyse(analyse)?.get(constat.id) ?? {};
  assert.equal(aRelire?.valeur, 13);
  assert.equal(aRelire?.regle, 'Le designer a choisi ce token parmi les candidats du moteur.');
});

test('la carte d’une question proche : titre, un bouton par candidat avec son écart, méta, ligne de réponse', () => {
  const lu = releve('v1');
  const [constat] = c29(lu, catalogue(rayon('r12', 12), rayon('r14', 14)));
  const carte = carteDeQuestion(constat, contexteUi(lu));
  assert.ok(carte);
  assert.equal(carte.titreEnTexte, 'Le radius de fond vaut 13 px. Aucun token radius ne vaut cette valeur.');
  assert.deepEqual([carte.principal, ...carte.autres].map(({ libelle, token }) => [libelle, token]), [
    ['Adopter 12 px (−1 px)', 'radius/r12'], ['Adopter 14 px (+1 px)', 'radius/r14'],
  ]);
  assert.equal(carte.meta, 'Lier change le rendu de ce layer.');
  assert.equal(carte.proche, true);
  const correction = { id: constat.id, sorte: 'liaison', cible: {}, avant: null, apres: { cle: 'r14', nom: 'radius/r14' }, aRelire: { regle: '', avant: null, valeur: 13 } } as const;
  assert.equal(carte.reponseEnTexte(correction), 'fond sera lié à radius/r14. Sa valeur passe de 13 px à 14 px.');
});

test('le titre d’une question proche dit la famille du champ lu', () => {
  const lu = releve('v1');
  lu.variants[0].layers[0].valeursEnDur = [{ champ: 'paddingLeft', valeur: 13 }];
  const sizing: CatalogueDeReference['variables'][number] = { ...rayon('s14', 14), nom: 'sizing/s14' };
  const [constat] = c29(lu, catalogue(sizing));
  assert.equal(carteDeQuestion(constat, contexteUi(lu))?.titreEnTexte, 'Le padding left de fond vaut 13 px. Aucun token sizing ne vaut cette valeur.');
});

test('deux questions identiques de deux variants forment un groupe de deux, et un clic envoie deux réponses', () => {
  const lu = releve('v1', 'v2');
  const constats = c29(lu, catalogue(rayon('r14', 14)));
  assert.equal(constats.length, 2);
  const cartes = constats.flatMap((constat) => carteDeQuestion(constat, contexteUi(lu)) ?? []);
  const groupes = regrouperLesCartes(cartes, {});
  assert.equal(groupes.length, 1);
  assert.deepEqual(groupes[0].cartes.map(({ id }) => id), constats.map(({ id }) => id));
  assert.deepEqual(reponsesDuGroupe(groupes[0], 'r14'), constats.map(({ id }) => ({ question: id, reponse: 'r14' })));
});

test('des questions qui diffèrent par la valeur, le layer ou les candidats restent séparées', () => {
  const lu = releve('v1', 'v2');
  lu.variants[1].layers[0].valeursEnDur = [{ champ: 'cornerRadius', valeur: 13.5 }];
  const constats = c29(lu, catalogue(rayon('r14', 14)));
  const cartes = constats.flatMap((constat) => carteDeQuestion(constat, contexteUi(lu)) ?? []);
  assert.equal(regrouperLesCartes(cartes, {}).length, 2);
  const autre = c29(releve('v1'), catalogue(rayon('r14', 14), rayon('r12', 12)));
  const meles = [...cartes.slice(0, 1), ...autre.flatMap((constat) => carteDeQuestion(constat, contexteUi(lu)) ?? [])];
  assert.equal(regrouperLesCartes(meles, {}).length, 2);
});

test('une question qui n’est pas proche ne se groupe pas, et une réponse ne se mêle qu’à la même réponse', () => {
  const lu = releve('v1', 'v2');
  const exacts = c29(lu, catalogue(rayon('a', 13), rayon('b', 13))).flatMap((constat) => carteDeQuestion(constat, contexteUi(lu)) ?? []);
  assert.equal(regrouperLesCartes(exacts, {}).length, 2);
  const proches = c29(lu, catalogue(rayon('r12', 12), rayon('r14', 14))).flatMap((constat) => carteDeQuestion(constat, contexteUi(lu)) ?? []);
  const reponse = (cle: string) => ({ id: '', sorte: 'liaison', cible: {}, avant: null, apres: { cle, nom: cle }, aRelire: { regle: '', avant: null } }) as const;
  assert.equal(regrouperLesCartes(proches, { [proches[0].id]: reponse('r12'), [proches[1].id]: reponse('r12') }).length, 1);
  assert.equal(regrouperLesCartes(proches, { [proches[0].id]: reponse('r12'), [proches[1].id]: reponse('r14') }).length, 2);
  assert.equal(regrouperLesCartes(proches, { [proches[0].id]: reponse('r12') }).length, 2);
});

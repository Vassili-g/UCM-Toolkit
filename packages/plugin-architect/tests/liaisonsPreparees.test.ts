/**
 * Les liaisons préparées côté interface : la carte de Corrections tirée du message `liaisons-preparees` et de la lecture du composant,
 * l'analyse qui retient ce message sous son identité, et le moment où `lier-preparation` peut partir. Aucun DOM.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Correction, IdentiteDAnalyse } from '../src/messages/commun';
import type { PreparationVue } from '../src/messages/preparation';
import { aDesLiaisonsPreparees, noterLaDemandeDesLiaisons, preparationALier, recevoirUneAnalyse } from '../src/ui/composant/analyse';
import { carteDesLiaisonsPreparees } from '../src/ui/corrections/liaisons';
import type { ContexteDeCartes } from '../src/ui/corrections/modele';
import { etatInitial, type Etat } from '../src/ui/etat';

const identite: IdentiteDAnalyse = { sujet: 'jeu:1', generation: 3 };
const contexte: ContexteDeCartes = {
  composant: 'Pastille',
  variants: [{ id: 'v:1', nom: 'Ton=doux, Taille=petite' }, { id: 'v:2', nom: 'Ton=net, Taille=grande' }],
  layers: new Map([['l:fond', 'socle'], ['l:texte', 'libelle']]),
  constats: [],
};

const liaison = (layer: string, champ: string, nom: string): Correction => ({
  id: `preparation:p1:${layer}:${champ}`, sorte: 'liaison', cible: { layer, champ, indice: 0 }, avant: null, apres: { cle: `cle:${nom}`, nom },
  aRelire: { axes: {}, regle: 'La variable a été préparée pour ce layer.', avant: null },
});
const fond = liaison('l:fond', 'fills', 'components/pastille/couleur/doux/fond');
const texte = liaison('l:texte', 'fills', 'components/pastille/couleur/doux/texte');
const liaisons = {
  preparation: 'p1', corrections: [fond, texte],
  enAttente: [
    { variable: 'components/pastille/couleur/net/bordure', layer: 'l:fond', nomDuLayer: 'socle', variant: 'v:2', champ: 'strokes' },
    { variable: 'components/pastille/couleur/net/bordure', layer: 'l:texte', nomDuLayer: 'libelle', variant: 'v:2', champ: 'strokes' },
    { variable: 'components/pastille/couleur/net/fond', layer: 'l:ailleurs', nomDuLayer: 'halo', variant: 'v:9', champ: 'fills' },
  ],
};

test('la carte a une ligne cochable par correction et une ligne sans case par entrée en attente', () => {
  const carte = carteDesLiaisonsPreparees(liaisons, [], contexte);
  assert.ok(carte);
  assert.equal(carte.origine, 'preparation');
  assert.deepEqual(carte.lignes.map((ligne) => ligne.id), [fond.id, texte.id]);
  assert.equal(carte.lignes[0].avant, 'couleur en dur');
  assert.deepEqual(carte.lignes[0].marquesApres, [4]);
  assert.equal(carte.attente.length, 3);
});

test('une ligne en attente nomme son layer d’après le message, même hors de la lecture du composant, et son variant d’après l’analyse', () => {
  const carte = carteDesLiaisonsPreparees(liaisons, [], { ...contexte, layers: new Map() });
  assert.deepEqual(carte?.attente.map(({ layer, variant }) => [layer, variant]), [['socle', 'Ton=net, Taille=grande'], ['libelle', 'Ton=net, Taille=grande'], ['halo', null]]);
});

test('la ligne de compte dit les layers distincts et les variables distinctes qui attendent', () => {
  const carte = carteDesLiaisonsPreparees(liaisons, [], contexte);
  assert.deepEqual(carte?.meta, ['3 layers', '. ', '2 variables pas encore publiées.']);
  assert.deepEqual(carte?.layers, ['l:fond', 'l:texte', 'l:ailleurs']);
  const seule = carteDesLiaisonsPreparees({ ...liaisons, enAttente: liaisons.enAttente.slice(0, 1) }, [], contexte);
  assert.deepEqual(seule?.meta, ['2 layers', '. ', '1 variable pas encore publiée.']);
});

test('sans entrée en attente, la ligne de compte ne parle pas de publication', () => {
  assert.deepEqual(carteDesLiaisonsPreparees({ ...liaisons, enAttente: [] }, [], contexte)?.meta, ['2 layers']);
});

test('une correction déjà écrite quitte la carte, et rien ne reste quand tout est écrit', () => {
  assert.deepEqual(carteDesLiaisonsPreparees(liaisons, [fond.id], contexte)?.lignes.map((ligne) => ligne.id), [texte.id]);
  assert.equal(carteDesLiaisonsPreparees({ ...liaisons, enAttente: [] }, [fond.id, texte.id], contexte), null);
});

test('sans correction cochable, la carte ne garde que les lignes en attente', () => {
  const carte = carteDesLiaisonsPreparees({ ...liaisons, corrections: [] }, [], contexte);
  assert.equal(carte?.lignes.length, 0);
  assert.equal(carte?.attente.length, 3);
});

const message = (generation: number, refus: 'introuvable' | null = null) => ({
  type: 'liaisons-preparees' as const, analyse: { ...identite, generation }, preparation: 'p1', corrections: [fond], enAttente: liaisons.enAttente, ecartees: 0, refus,
});
const analyseComplete = (generation = identite.generation) => ({
  type: 'analyse' as const, analyse: { ...identite, generation }, statut: 'complete' as const, constats: [], lecture: null, variants: [], sansTokens: false,
});
const rangee = (cle: string, etat = 'creee'): PreparationVue => ({
  id: 'p1', source: { fichier: 'Pastille', cleDuFichier: null, jeu: { cle, nom: 'Pastille' } }, creeLe: '2026-10-23T10:00:00.000Z', variables: [{ nom: 'components/pastille/couleur/doux/fond', etat }], regles: [],
}) as unknown as PreparationVue;

const liaisonsRetenues = (etat: Etat) => etat.analyse?.liaisons ?? null;

test('l’analyse retient les liaisons de sa propre identité et ignore celles d’une autre', () => {
  const etat = etatInitial();
  recevoirUneAnalyse(etat, analyseComplete());
  recevoirUneAnalyse(etat, message(2));
  assert.equal(liaisonsRetenues(etat), null);
  recevoirUneAnalyse(etat, message(3));
  assert.deepEqual(liaisonsRetenues(etat)?.corrections, [fond]);
  assert.equal(aDesLiaisonsPreparees(etat.analyse), true);
});

test('un refus ne range aucune liaison', () => {
  const etat = etatInitial();
  recevoirUneAnalyse(etat, analyseComplete());
  recevoirUneAnalyse(etat, message(3, 'introuvable'));
  assert.equal(liaisonsRetenues(etat), null);
});

test('une nouvelle analyse, ou la péremption, retire les liaisons', () => {
  const etat = etatInitial();
  recevoirUneAnalyse(etat, analyseComplete());
  recevoirUneAnalyse(etat, message(3));
  recevoirUneAnalyse(etat, { type: 'analyse-commencee', analyse: { ...identite, generation: 4 } });
  assert.equal(liaisonsRetenues(etat), null);

  recevoirUneAnalyse(etat, analyseComplete(5));
  recevoirUneAnalyse(etat, message(5));
  assert.equal(aDesLiaisonsPreparees(etat.analyse), true);
  recevoirUneAnalyse(etat, { type: 'perime', analyse: { ...identite, generation: 5 }, cause: 'ecriture' });
  assert.equal(liaisonsRetenues(etat), null);
  recevoirUneAnalyse(etat, message(5));
  assert.equal(liaisonsRetenues(etat), null);
});

test('lier-preparation ne part pas tant qu’aucune variable de la préparation n’a vu de création, même sur un composant sans tokens', () => {
  const etat = etatInitial();
  recevoirUneAnalyse(etat, { ...analyseComplete(), sansTokens: true });
  etat.preparations = [rangee(identite.sujet, 'a-creer')];
  assert.equal(preparationALier(etat), null);
  etat.preparations = [rangee(identite.sujet, 'creee')];
  assert.equal(preparationALier(etat)?.id, 'p1');
});

test('lier-preparation ne se demande que pour une préparation du même jeu, sur une analyse complète non périmée, une seule fois', () => {
  const etat = etatInitial();
  assert.equal(preparationALier(etat), null);
  etat.preparations = [rangee('autre:jeu')];
  recevoirUneAnalyse(etat, analyseComplete());
  assert.equal(preparationALier(etat), null);

  etat.preparations = [rangee('autre:jeu'), rangee(identite.sujet)];
  assert.equal(preparationALier(etat)?.id, 'p1');
  noterLaDemandeDesLiaisons(etat);
  assert.equal(preparationALier(etat), null);

  recevoirUneAnalyse(etat, { type: 'analyse-commencee', analyse: { ...identite, generation: 4 } });
  assert.equal(preparationALier(etat), null);
  recevoirUneAnalyse(etat, { ...analyseComplete(4), statut: 'partielle' });
  assert.equal(preparationALier(etat), null);
  recevoirUneAnalyse(etat, analyseComplete(4));
  assert.equal(preparationALier(etat)?.id, 'p1');
  recevoirUneAnalyse(etat, { type: 'perime', analyse: { ...identite, generation: 4 }, cause: 'document' });
  assert.equal(preparationALier(etat), null);
});

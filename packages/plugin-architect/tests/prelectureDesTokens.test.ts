/**
 * Le candidat de prélecture du relevé Tokens (D5a) : il lit par tranches de 50 ms avec des cessions explicites, cède la place à une
 * demande du designer, s'abandonne quand il est remplacé ou périmé, n'importe rien, et ne répond jamais au clic. Rien ne l'appelle
 * dans `code.ts` : il reste inactif jusqu'à la mesure de D5b.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import { acquisitionCourante, oublierLAcquisition } from '../src/sandbox/acquisition';
import { BUDGET_DE_LA_PRELECTURE_DES_TOKENS_MS, creerLaPrelectureDesTokens, type DependancesDeLaPrelectureDesTokens } from '../src/sandbox/prelecture';
import { collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

beforeEach(() => oublierLAcquisition());

/** Une horloge qui avance de 30 ms à chaque lecture : le budget de 50 ms est écoulé une lecture sur deux. */
function banc(surcharge: Partial<DependancesDeLaPrelectureDesTokens> = {}, delai = 0) {
  const ids = ['A', 'B', 'C', 'D'];
  const variables = ids.map((id) => variableFigma(id, 'c1', `taille/${id}`, 'FLOAT', { 'c1:m': 4 }));
  const { port, appels } = portDeTest([collectionFigma('c1', 'tailles', ['m'], ids)], variables, [], [], { delai });
  let temps = 0;
  const etat = { cessions: 0, prioritaire: false, repere: 'r0' };
  const dependances: DependancesDeLaPrelectureDesTokens = {
    port,
    fichier: () => 'Fichier',
    espace: () => 'srgb',
    respirer: async () => { etat.cessions += 1; await new Promise((resolve) => setTimeout(resolve, 0)); },
    demandePrioritaire: () => etat.prioritaire,
    repere: () => etat.repere,
    maintenant: () => { temps += 30; return temps; },
    ...surcharge,
  };
  return { prelecture: creerLaPrelectureDesTokens(dependances), etat, appels };
}

test('la prélecture lit le relevé, cède la main chaque fois que le budget de 50 ms est écoulé et garde un candidat', async () => {
  const { prelecture, etat } = banc();
  assert.equal(BUDGET_DE_LA_PRELECTURE_DES_TOKENS_MS, 50);
  await prelecture.lancer();
  const candidat = prelecture.candidat();
  assert.ok(candidat, 'un candidat est gardé');
  assert.equal(candidat.releve.variables.length, 4);
  assert.ok(etat.cessions > 0, 'la lecture a rendu la main au sandbox');
});

test('sans cession possible dans le budget, la lecture n’en fait aucune : la cession dépend du budget, non d’une attente d’API', async () => {
  const { prelecture, etat } = banc({ maintenant: () => 0 }, 5);
  await prelecture.lancer();
  assert.ok(prelecture.candidat());
  assert.equal(etat.cessions, 0);
});

test('une demande du designer arrête la lecture avant la cession suivante : aucun candidat', async () => {
  const { prelecture, etat } = banc();
  etat.prioritaire = true;
  await prelecture.lancer();
  assert.equal(prelecture.candidat(), null);
});

test('cederLaPlace arrête la lecture qui court et le candidat n’existe pas', async () => {
  const { prelecture } = banc({}, 5);
  const lecture = prelecture.lancer();
  prelecture.cederLaPlace();
  await lecture;
  assert.equal(prelecture.candidat(), null);
});

test('une prélecture remplacée est abandonnée : seule la dernière laisse un candidat', async () => {
  const { prelecture, appels } = banc({}, 5);
  const premiere = prelecture.lancer();
  const seconde = prelecture.lancer();
  await Promise.all([premiere, seconde]);
  const candidat = prelecture.candidat();
  assert.ok(candidat);
  assert.equal(appels.get('local:variables'), 2, 'les deux lectures ont démarré, la première s’est arrêtée avant de conclure');
  assert.equal(candidat.releve.variables.length, 4);
});

test('un événement de Figma pendant la lecture, ou après elle, jette le candidat', async () => {
  const { prelecture } = banc({}, 5);
  const lecture = prelecture.lancer();
  prelecture.surChangement();
  await lecture;
  assert.equal(prelecture.candidat(), null, 'périmée pendant la lecture');
  await prelecture.lancer();
  assert.ok(prelecture.candidat());
  prelecture.surChangement();
  assert.equal(prelecture.candidat(), null, 'périmée après la lecture');
});

test('une écriture pendant la lecture, ou après elle, change le repère : le candidat est jeté', async () => {
  const { prelecture, etat } = banc({}, 5);
  const lecture = prelecture.lancer();
  etat.repere = 'r1';
  await lecture;
  assert.equal(prelecture.candidat(), null, 'repère changé pendant la lecture');
  await prelecture.lancer();
  assert.ok(prelecture.candidat());
  etat.repere = 'r2';
  assert.equal(prelecture.candidat(), null, 'repère changé après la lecture');
});

test('le clic ne reprend jamais le candidat, et la prélecture ne remplit pas l’acquisition d’Actualiser', async () => {
  const { prelecture } = banc();
  await prelecture.lancer();
  assert.ok(prelecture.candidat());
  assert.equal(prelecture.reprendreAuClic(), null);
  assert.equal(acquisitionCourante(), null);
});

test('la prélecture n’importe aucune variable de library, même quand une cible d’alias en porte la clé', async () => {
  const locale = variableFigma('L1', 'c1', 'taille/L', 'FLOAT', { 'c1:m': { type: 'VARIABLE_ALIAS', id: 'VariableID:cle-x/1:2' } });
  const { port, appels } = portDeTest([collectionFigma('c1', 'tailles', ['m'], ['L1'])], [locale], [], [], { importables: [variableFigma('VariableID:cle-x/1:2', 'd', 'x', 'FLOAT', {}, true)] });
  const { prelecture } = banc({ port });
  await prelecture.lancer();
  assert.deepEqual([...appels.keys()].filter((cle) => cle.startsWith('import:')), []);
});

test('fermer arrête la lecture et vide le candidat', async () => {
  const { prelecture } = banc({}, 5);
  const lecture = prelecture.lancer();
  prelecture.fermer();
  await lecture;
  assert.equal(prelecture.candidat(), null);
});

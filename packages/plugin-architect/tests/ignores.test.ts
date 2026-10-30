/** Ignorer : portées, constat limite, hors UCM, Ne plus ignorer, identité périmée, filtre de l’analyse suivante. */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { Constat, Correction } from '@ucm-kit/core/controles';
import { CLES_D_ARCHITECT, ESPACE_ARCHITECT, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { cleDUnRoleIgnore, constatsIgnores, ignorerUnConstat, ignorerUnRole, lireLesIgnores, retablirUnRole, rolesIgnoresDe, separerLesIgnores, type PortDIgnores } from '../src/ecriture/ignores';
import type { PluginMessage } from '../src/messages';
import { commencerUneAnalyse, correctionsDeLAnalyse, reinitialiserLAnalyse, retenirLesCorrections } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { rangementDeFigma, traiterAvec } from '../src/sandbox/ignores';
import { atelierDEcriture } from './figmaDeTest';

const correction: Correction = { id: 'C22:a', sorte: 'liaison', cible: { layer: '1:1', champ: 'fills', indice: 0 }, avant: 'x', apres: { cle: 'k', nom: 'y' }, aRelire: { regle: 'r', avant: 'x' } };
const avecCorrection: Constat = { id: 'C22:a', code: 'C22', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits: {}, correction };
const sansProposition: Constat = { id: 'C30:b', code: 'C30', type: 'verifier', famille: 'tailles', variants: [], layers: [], faits: {} };
const limite: Constat = { id: 'C99:l', code: 'C42', type: 'verifier', famille: 'export', variants: [], layers: [], faits: {}, limite: true };

function banc(declaration?: string) {
  const a = atelierDEcriture(declaration === undefined ? {} : { declaration });
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: a.api as never, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} };
  const traiter = traiterAvec(() => rangementDeFigma(a.api as unknown as PortDIgnores));
  const analyse = commencerUneAnalyse('Alert', ['jeu'], contexte);
  retenirLesCorrections(analyse, [avecCorrection, sansProposition, limite]);
  return { a, envoyes, contexte, traiter, analyse };
}
const rangees = (a: ReturnType<typeof atelierDEcriture>) => JSON.parse(a.donnees.get(`${ESPACE_ARCHITECT}/${CLES_D_ARCHITECT.ignorer}`) ?? '[]');

beforeEach(() => reinitialiserLAnalyse());

test('Ignorer range l’id du constat à la racine, retire sa correction du lot et rend la liste', async () => {
  const b = banc();
  await b.traiter({ type: 'ignorer', analyse: b.analyse, constat: 'C22:a', portee: 'constat' }, b.contexte);
  assert.deepEqual(rangees(b.a), ['C22:a']);
  assert.deepEqual(b.envoyes, [{ type: 'ignores', analyse: b.analyse, constats: ['C22:a'] }]);
  assert.equal(correctionsDeLAnalyse(b.analyse)?.has('C22:a'), false);
});

test('Ne plus proposer range l’id de la proposition : le constat n’est pas listé comme ignoré', async () => {
  const b = banc();
  await b.traiter({ type: 'ignorer', analyse: b.analyse, constat: 'C22:a', portee: 'proposition' }, b.contexte);
  assert.deepEqual(rangees(b.a), ['proposition:C22:a']);
  assert.deepEqual(b.envoyes, [{ type: 'ignores', analyse: b.analyse, constats: [] }]);
  assert.equal(correctionsDeLAnalyse(b.analyse)?.has('C22:a'), false);
});

test('Ne plus proposer sans proposition n’écrit rien', async () => {
  const b = banc();
  await b.traiter({ type: 'ignorer', analyse: b.analyse, constat: 'C30:b', portee: 'proposition' }, b.contexte);
  assert.deepEqual(b.a.journal, []);
});

test('un constat limite ne s’ignore pas : refusé, rien n’est écrit', async () => {
  const b = banc();
  await b.traiter({ type: 'ignorer', analyse: b.analyse, constat: 'C99:l', portee: 'constat' }, b.contexte);
  assert.deepEqual(b.a.journal, []);
  assert.deepEqual(b.envoyes, [{ type: 'ignores', analyse: b.analyse, constats: [] }]);
});

test('hors UCM, rien ne s’écrit', async () => {
  const b = banc(texteDeLArchitectureDuFichier(false));
  await b.traiter({ type: 'ignorer', analyse: b.analyse, constat: 'C22:a', portee: 'constat' }, b.contexte);
  assert.deepEqual(b.a.journal, []);
  assert.equal(correctionsDeLAnalyse(b.analyse)?.has('C22:a'), true);
});

test('Ne plus ignorer retire les clés et remet la correction dans le lot', async () => {
  const b = banc();
  await b.traiter({ type: 'ignorer', analyse: b.analyse, constat: 'C22:a', portee: 'constat' }, b.contexte);
  await b.traiter({ type: 'ne-plus-ignorer', analyse: b.analyse, constat: 'C22:a' }, b.contexte);
  assert.deepEqual(rangees(b.a), []);
  assert.deepEqual(b.envoyes.at(-1), { type: 'ignores', analyse: b.analyse, constats: [] });
  assert.equal(correctionsDeLAnalyse(b.analyse)?.get('C22:a'), correction);
});

test('une identité périmée ou un constat inconnu est ignoré sans écriture ni réponse', async () => {
  const b = banc();
  await b.traiter({ type: 'ignorer', analyse: { sujet: 'Alert', generation: b.analyse.generation - 1 }, constat: 'C22:a', portee: 'constat' }, b.contexte);
  await b.traiter({ type: 'ignorer', analyse: b.analyse, constat: 'inconnu', portee: 'constat' }, b.contexte);
  assert.deepEqual(b.a.journal, []);
  assert.deepEqual(b.envoyes, []);
});

test('l’analyse suivante filtre les constats ignorés et retire la proposition de ceux dont elle est rangée', () => {
  const { visibles, ignores } = separerLesIgnores([avecCorrection, sansProposition, limite], ['C30:b', 'proposition:C22:a']);
  assert.deepEqual(ignores, ['C30:b']);
  assert.deepEqual(visibles.map((c) => [c.id, c.correction === undefined]), [['C22:a', true], ['C99:l', true]]);
});

test('une donnée illisible ne donne aucune clé', () => {
  const a = atelierDEcriture();
  a.api.root.setSharedPluginData(ESPACE_ARCHITECT, CLES_D_ARCHITECT.ignorer, '{pas du json');
  assert.deepEqual(lireLesIgnores(a.api.root as never), []);
  assert.equal(ignorerUnConstat(a.api as never, limite, 'constat').ecrit, false);
});

test('un rôle ignoré a sa clé, que les constats ne comptent pas et que rolesIgnoresDe retrouve', () => {
  assert.equal(cleDUnRoleIgnore('surface/subtle'), 'role-ucm:surface/subtle');
  const cles = ['C22:a', 'proposition:C22:b', 'role-ucm:surface/subtle', 'role-ucm:surface/inconnu'];
  assert.deepEqual(rolesIgnoresDe(cles), ['surface/subtle']);
  assert.deepEqual(constatsIgnores(cles), ['C22:a']);
  assert.deepEqual(separerLesIgnores([avecCorrection], cles).ignores, ['C22:a']);
});

test('ignorer puis rétablir un rôle range et retire sa clé, sans doublon', () => {
  const a = atelierDEcriture();
  assert.equal(ignorerUnRole(a.api as never, 'surface/subtle').ecrit, true);
  assert.equal(ignorerUnRole(a.api as never, 'surface/subtle').ecrit, true);
  assert.deepEqual(rangees(a), ['role-ucm:surface/subtle']);
  assert.equal(retablirUnRole(a.api as never, 'surface/subtle').ecrit, true);
  assert.deepEqual(rangees(a), []);
});

test('hors UCM, ignorer ou rétablir un rôle refuse en non-ucm sans rien écrire', () => {
  const a = atelierDEcriture({ declaration: texteDeLArchitectureDuFichier(false) });
  assert.deepEqual(ignorerUnRole(a.api as never, 'surface/subtle'), { ecrit: false, cles: [], motif: 'non-ucm' });
  assert.deepEqual(retablirUnRole(a.api as never, 'surface/subtle'), { ecrit: false, cles: [], motif: 'non-ucm' });
  assert.deepEqual(a.journal, []);
});

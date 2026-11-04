/**
 * Garde le comptage de `scripts/stress/f3-composant/operateurs.ts` sur un échantillon fabriqué : un cas détecté, un manqué, un faux
 * constat, une correction inexacte, une exception et un cas `mesure`. La garde ne lance pas les 558 cas du kit, qui restent hors de
 * `npm test` (`npm run stress:composant`).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '../../kit/src/controles/constat';
import type { CasDeStress, ConstatAttendu } from '../../kit/tests/stress/commun/types';
import { agreger, mesurerLeCas, mesurerLesGroupes, tableau, type CasAMesurer, type GroupeDeCas } from '../scripts/stress/f3-composant/operateurs';

const constat = (code: `C${number}`, layer: string, apres?: string): Constat =>
  ({ id: `${code}-${layer}`, code, type: 'erreur', famille: 'liaisons', variants: [], layers: [layer], faits: {}, ...(apres ? { correction: { apres: { cle: apres, nom: apres } } } : {}) }) as unknown as Constat;
const attendu = (code: `C${number}`, cle: string, forme: ConstatAttendu['forme'] = 'a-faire', apres?: string): ConstatAttendu =>
  ({ code, cle, forme, ...(apres ? { apres: { cle: apres } } : {}) });
const cas = (id: string, operateur: string, attendus: ConstatAttendu[], verdict: 'attendu' | 'mesure' = 'attendu'): CasDeStress<unknown> =>
  ({ id, famille: 'F3', operateur, verdict, ...(verdict === 'mesure' ? { question: 'Q-F3-0' } : {}), entree: null, attendus });
const aMesurer = (definition: CasDeStress<unknown>, emettre: () => readonly Constat[]): CasAMesurer => ({ cas: definition, emettre, cleDe: (c) => c.layers[0] });

test('le comptage sépare détectés, manqués, faux constats, corrections inexactes, exceptions et cas mesure', () => {
  const mesures = [
    mesurerLeCas(aMesurer(cas('A-1', 'A', [attendu('C16', 'x')]), () => [constat('C16', 'x')])),
    mesurerLeCas(aMesurer(cas('A-2', 'A', [attendu('C16', 'y')]), () => [])),
    mesurerLeCas(aMesurer(cas('A-3', 'A', []), () => [constat('C18', 'z')])),
    mesurerLeCas(aMesurer(cas('B-1', 'B', [attendu('C24', 'k', 'correction', 'bon')]), () => [constat('C24', 'k', 'mauvais')])),
    mesurerLeCas(aMesurer(cas('B-2', 'B', [attendu('C24', 'k')]), () => { throw new Error('contrôle cassé'); })),
    mesurerLeCas(aMesurer(cas('B-3', 'B', [attendu('C29', 'm')], 'mesure'), () => [])),
  ];
  assert.equal(mesures[4].exception, 'contrôle cassé');
  const [a, b, total] = agreger(mesures);
  assert.deepEqual([a.operateur, a.cas, a.attendus, a.detectes, a.manques, a.fauxConstats, a.correctionsInexactes, a.exceptions, a.casMesure, a.enAttente], ['A', 3, 2, 1, 1, 1, 0, 0, 0, 0]);
  assert.deepEqual([b.operateur, b.cas, b.attendus, b.detectes, b.manques, b.fauxConstats, b.correctionsInexactes, b.exceptions, b.casMesure, b.enAttente], ['B', 3, 3, 0, 0, 0, 1, 1, 1, 1]);
  assert.deepEqual([total.operateur, total.cas, total.exceptions, total.casMesure, total.enAttente], ['Total', 6, 1, 1, 1]);
  assert.match(tableau([a, b, total], false), /\| A \| 3 \| 2 \| 1 \| 1 \| 1 \| 0 \| 0 \| 0 \| 0 \|/);
  assert.ok(!tableau([a], false).includes('Durée'));
  assert.ok(tableau([a], true).includes('Durée (ms)'));
});

test('un générateur qui lève est compté comme une exception sans couper les autres groupes', () => {
  const groupes: GroupeDeCas[] = [
    { nom: 'G', generer: () => { throw new Error('générateur cassé'); } },
    { nom: 'H', generer: () => [{ ...cas('H-1', 'H', []), entree: { composant: null } }] as never },
  ];
  const brut = mesurerLesGroupes(groupes);
  assert.equal(brut.length, 2);
  assert.equal(brut[0].exception, 'générateur cassé');
  assert.equal(brut[0].cas.operateur, 'G');
  // H-1 passe par les vrais contrôles sur une entrée fabriquée sans composant : l'exception est attrapée et comptée.
  assert.equal(brut[1].cas.id, 'H-1');
  assert.equal(brut[1].exception !== undefined, true);
  const lignes = agreger(brut);
  assert.deepEqual(lignes.map((l) => [l.operateur, l.exceptions]), [['G', 1], ['H', 1], ['Total', 2]]);
});

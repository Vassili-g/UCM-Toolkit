/**
 * Garde du harnais F8 (`scripts/stress/f8-analyse/`) : les nombres de cas du plan, les cas `mesure` et leur question, un oracle écrit à
 * la main par opérateur, et les 48 profils de règles sans C43 ni C45. Le harnais complet reste hors de `npm test`
 * (`npx tsx packages/plugin-architect/scripts/stress/f8-analyse/mesurer.ts`) ; cette garde ne passe aucun cas du moteur ni de l'écriture.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { CasF8 } from '../scripts/stress/f8-analyse/cas';
import { CORPUS_DU_MOTEUR } from '../scripts/stress/f8-analyse/corpusDuMoteur';
import { fauxPositifs } from '../scripts/stress/f8-analyse/fauxPositifs';
import { interactions } from '../scripts/stress/f8-analyse/interactions';
import { tousLesCas } from '../scripts/stress/f8-analyse/operateurs';
import { lireLaPage, specDuProfil } from '../scripts/stress/f8-analyse/pageDeRegles';
import { PROFIL_R0, PROFIL_R42, PROFILS_DE_REGLES } from '../scripts/stress/f8-analyse/profilsRegles';
import { PROFILS_D_ANALYSE } from '../scripts/stress/f8-analyse/scenarioDeBase';

const cas = tousLesCas('F8');
const parOperateur = (operateur: string): CasF8[] => cas.filter((entree) => entree.operateur === operateur);
const unCas = (id: string): CasF8 => cas.find((entree) => entree.id === id)!;

const NOMBRES: Readonly<Record<string, number>> = {
  G1: 6, G2: 15, H1: 16, H2: 16, H3: 12, H4: 14, J1: 6, E1: 8, E2: 10, E3: 2, E4: 5, E5: 5, E6: 6, M1: 40, M2: 8, M3: 17, M4: 5, M6: 14, M7: 21, M8: 9,
};

test('F8 : 235 cas, aux nombres du plan pour chaque opérateur', () => {
  for (const [operateur, nombre] of Object.entries(NOMBRES)) assert.equal(parOperateur(operateur).length, nombre, operateur);
  assert.equal(cas.length, 235);
  assert.equal(new Set(cas.map(({ id }) => id)).size, 235, 'les identifiants sont uniques');
});

test('F8 : 67 faux positifs, 16 interactions, 40 gabarits du moteur, 48 profils de règles, 72 profils d’analyse', () => {
  assert.equal(fauxPositifs().length, 67);
  assert.equal(interactions().length, 16);
  assert.equal(CORPUS_DU_MOTEUR.length, 40);
  assert.equal(PROFILS_DE_REGLES.length, 48);
  assert.equal(PROFILS_D_ANALYSE.length, 72);
  assert.equal(PROFIL_R0.id, 'r09');
  assert.equal(PROFIL_R42.forme, 'tile-link');
  assert.equal(PROFIL_R42.redigees, false);
});

test('F8 : un cas `mesure` cite sa question, et seul un cas `mesure` en cite une', () => {
  for (const entree of [...cas, ...fauxPositifs(), ...interactions()]) {
    assert.equal(entree.verdict === 'mesure', entree.question !== undefined, entree.id);
    if (entree.question) assert.match(entree.question, /^(Q-F89-\d+|non constructible)$/, entree.id);
  }
  const enAttente = cas.filter(({ verdict }) => verdict === 'mesure').map(({ id }) => id);
  assert.ok(enAttente.includes('G2-1') && enAttente.includes('H3-7') && enAttente.includes('M6-8'));
});

test('F8 : un oracle écrit à la main par opérateur', () => {
  const attendus = (id: string) => unCas(id).attendus.map(({ code, cle }) => `${code}|${cle}`);
  assert.deepEqual(attendus('G1-2'), ['C43|-']);
  assert.equal(unCas('G1-2').attendus[0].faits?.regles, 14, 'button-36 : @usage, @icons, 3 + 2 + 3 + 2 valeurs, 2 booléennes');
  assert.deepEqual(attendus('G2-9'), ['C43|-']);
  assert.deepEqual(attendus('G2-5'), []);
  assert.deepEqual(attendus('H1-4'), ['C45|sans-regle|palette']);
  assert.equal(unCas('H1-4').attendus[0].faits?.regles, 3);
  assert.deepEqual(attendus('H2-1'), ['C45|sans-valeur|palette']);
  assert.equal(unCas('H2-1').attendus[0].faits?.valeurs, 'primary');
  assert.deepEqual(attendus('H3-3'), ['C45|sans-propriete|loading']);
  assert.deepEqual(attendus('H4-1'), []);
  assert.deepEqual(attendus('J1-2'), ['C44|a-completer|@usage', 'C44|a-completer|@prop', 'C44|a-completer|@boolean', 'C44|a-completer|@icons']);
  assert.deepEqual(attendus('M1-1').map((cle) => cle.slice(0, 4)), ['C41|']);
  assert.equal(unCas('M1-1').attendus[0].type, 'bloquant');
  assert.equal(unCas('M2-5').attendus[0].code, 'C41');
  assert.equal(unCas('M2-1').attendus[0].code, 'C42');
  assert.equal(unCas('M3-2').attendus.length, 1, 'la même phrase deux fois donne un seul constat');
  assert.equal(unCas('M4-1').attendus[0].variants?.[0], '12:10');
  assert.equal(unCas('M6-1').operateur, 'M6');
  assert.equal(unCas('M7-1').attendus[0].code, 'C43');
  assert.equal(unCas('M8-9').attendus[0].code, 'C35');
  assert.equal(unCas('E1-1').operateur, 'E1');
});

test('F8 : les 48 profils de règles ne donnent ni C43 ni C45', async () => {
  for (const profil of PROFILS_DE_REGLES) {
    const { constats } = await lireLaPage(specDuProfil(profil));
    assert.deepEqual(constats.filter(({ code }) => code === 'C43' || code === 'C45').map(({ code, faits }) => `${code} ${String(faits.ecart)}`), [], profil.id);
  }
});

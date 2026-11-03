/**
 * Garde du harnais F9 (`scripts/stress/f8-analyse/`) : les nombres de cas du plan, les cas `mesure` et leur question, un oracle écrit à la
 * main par opérateur, et la forme des 88 faux positifs et des 20 interactions. Le harnais complet reste hors de `npm test`
 * (`npx tsx packages/plugin-architect/scripts/stress/f8-analyse/mesurer.ts --famille F9`) ; cette garde construit les cas sans en passer
 * un seul.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { CasF8 } from '../scripts/stress/f8-analyse/cas';
import { fauxPositifsF9 } from '../scripts/stress/f8-analyse/fauxPositifs';
import { interactionsDeF9 } from '../scripts/stress/f8-analyse/interactions';
import { tousLesCas } from '../scripts/stress/f8-analyse/operateurs';
import { PROFILS_D_ANALYSE } from '../scripts/stress/f8-analyse/scenarioDeBase';
import type { Attente } from '../scripts/stress/f8-analyse/seance';

const cas = tousLesCas('F9');
const parOperateur = (operateur: string): CasF8[] => cas.filter((entree) => entree.operateur === operateur);
const unCas = (id: string): CasF8 => cas.find((entree) => entree.id === id)!;
const oracle = (id: string): Attente => unCas(id).entree.oracle as Attente;

const NOMBRES: Readonly<Record<string, number>> = {
  N1: 5, N2: 3, N3: 3, N4: 3, N5: 3, N6: 3, N7: 6, N8: 6, N9: 3, N11: 5, Bd1: 15, Bd2: 9, Bd3: 6, Lm1: 12, Lm2: 4, Lm3: 4, Mp1: 8,
  An: 37, Pe: 39, Oc: 25, Pr: 25, Id: 11, Pv: 13, Li: 20, Hu: 19, Ig: 19, St: 38,
};

test('F9 : 344 cas, aux nombres du plan pour chaque opérateur', () => {
  for (const [operateur, nombre] of Object.entries(NOMBRES)) assert.equal(parOperateur(operateur).length, nombre, operateur);
  assert.equal(cas.length, 344);
  assert.equal(new Set(cas.map(({ id }) => id)).size, 344, 'les identifiants sont uniques');
  const sommes = { lectures: 40 + 20 + 8, budget: 30, cycle: 37 + 39 + 25 + 25 + 11 + 13, etats: 20 + 19 + 19 + 38 };
  assert.equal(sommes.lectures + sommes.budget + sommes.cycle + sommes.etats, 344);
});

test('F9 : 88 faux positifs dont les 72 profils d’analyse, 16 thèmes ciblés, 20 interactions sur deux profils', () => {
  const faux = fauxPositifsF9();
  assert.equal(faux.length, 88);
  assert.equal(faux.filter(({ operateur }) => operateur === 'FP1').length, PROFILS_D_ANALYSE.length);
  assert.equal(faux.filter(({ operateur }) => operateur === 'FP2').length, 16);
  assert.equal(new Set(faux.map(({ id }) => id)).size, 88);
  for (const profil of PROFILS_D_ANALYSE) assert.ok(faux.some((entree) => entree.entree.description.startsWith(`${profil.id} :`)), profil.id);
  for (const entree of faux) {
    assert.deepEqual(entree.attendus, [], entree.id);
    assert.equal(entree.verdict, 'attendu', entree.id);
  }
  const interactions = interactionsDeF9();
  assert.equal(interactions.length, 20);
  for (let couple = 1; couple <= 10; couple += 1) {
    const deux = interactions.filter(({ operateur }) => operateur === `J${couple}`);
    assert.equal(deux.length, 2, `J${couple}`);
    assert.deepEqual(deux.map(({ entree }) => entree.description.split(' : ')[0]), ['A0', 'a55'], `J${couple}`);
  }
});

test('F9 : un cas `mesure` cite sa question, et seul un cas `mesure` en cite une', () => {
  for (const entree of [...cas, ...fauxPositifsF9(), ...interactionsDeF9()]) {
    assert.equal(entree.verdict === 'mesure', entree.question !== undefined, entree.id);
    if (entree.question) assert.match(entree.question, /^(Q-F89-\d+|non constructible|à trancher)$/, entree.id);
    assert.ok(entree.entree.description.length > 10, entree.id);
  }
  const enAttente = new Map(cas.filter(({ verdict }) => verdict === 'mesure').map(({ id, question }) => [id, question]));
  assert.equal(enAttente.get('N4-1'), 'Q-F89-3');
  assert.equal(enAttente.get('N6-1'), 'Q-F89-4');
  assert.equal(enAttente.get('St-9'), 'Q-F89-3', 'les dépendances refusées seules');
  assert.equal(enAttente.get('Li-10'), 'Q-F89-20');
  assert.equal(enAttente.get('An-1'), 'non constructible', 'l’identité n’existe pas encore pendant la lecture du sujet');
  assert.equal(enAttente.get('Oc-10'), 'non constructible');
  assert.equal(enAttente.get('Bd1-6'), 'Q-F89-19');
  assert.equal(enAttente.get('Mp1-7'), 'Q-F89-19');
});

test('F9 : un oracle écrit à la main par opérateur, d’après la table de la section 2.5 et l’inventaire', () => {
  // Lectures refusées : une part non jugée rend `partielle`, jamais C43 ni C45.
  assert.equal(oracle('N1-1').statut, 'partielle');
  assert.deepEqual(oracle('N1-1').sansCodes, ['C43', 'C45']);
  assert.deepEqual(oracle('N1-5').statuts, ['annulee'], 'lever après la levée du jeton est une annulation');
  assert.deepEqual(oracle('N5-1').statuts, ['arretee'], 'le catalogue qui lève arrête l’analyse');
  assert.deepEqual(oracle('N7-3').statuts, ['annulee']);
  assert.equal(oracle('N8-3').statuts?.[0], 'annulee');
  assert.equal(oracle('N11-3').statut, 'complete', '`ucm: false` : le fichier est libre, pas une lecture refusée');
  assert.equal(oracle('N11-1').statut, 'partielle');
  // Lectures manquées et moteur partiel.
  assert.ok(oracle('Lm1-1').ecran?.dit?.[0].test('1 lecture a échoué'));
  assert.ok(oracle('Lm3-4').ecran?.dit?.[0].test('1 000 lectures ont échoué'), 'le pluriel et le nombre en toutes lettres de chiffres');
  assert.ok(!oracle('Lm3-1').ecran?.dit?.[0].test('1 lectures ont échoué'));
  assert.deepEqual(oracle('Mp1-1').sansCodes, ['C43', 'C45']);
  assert.equal(oracle('Mp1-1').statut, 'partielle');
  // Budget : 1 999 et 2 000 gardés, 2 001 coupé, premier variant lu quelle que soit sa taille.
  assert.match(unCas('Bd1-1').entree.description, /total 1999 layers, aucune coupe/);
  assert.match(unCas('Bd1-2').entree.description, /total 2000 layers, aucune coupe/);
  assert.match(unCas('Bd1-3').entree.description, /total 2001 layers, coupe après 199 variants, 11 layers laissés/);
  assert.match(unCas('Bd1-4').entree.description, /total 2520 layers, coupe après 1 variants, 20 layers laissés/);
  assert.match(unCas('Bd1-5').entree.description, /coupe après 166 variants, 600 layers laissés/, '216 variants de 12 layers : 166 tiennent dans 2 000');
  assert.deepEqual(oracle('Bd2-1').sansCodes, ['C31', 'C32', 'C33']);
  assert.deepEqual(oracle('Bd2-4').sansCodes, ['C21']);
  assert.deepEqual(oracle('Bd2-7').sansCodes, ['C7', 'C12', 'C13']);
  assert.ok(oracle('Bd3-1').ecran?.dit?.[0].test('231 layers lus sur 252'));
  // Cycle de vie.
  assert.deepEqual(oracle('An-2').statuts, ['annulee', 'complete']);
  assert.deepEqual(oracle('An-29').statuts, ['complete'], 'annuler après le final ne change rien');
  assert.deepEqual(oracle('Pe-1').perimes, ['document']);
  assert.deepEqual(oracle('Pe-14').perimes, ['selection']);
  assert.deepEqual(oracle('Pe-2').perimes, ['document']);
  assert.deepEqual(oracle('Pe-5').perimes, [], 'hors inventaire, rien ne change');
  assert.deepEqual(oracle('Pe-26').perimes, ['ecriture'], 'une écriture du plugin pendant le relevé');
  assert.equal(oracle('Oc-1').occupes, 1);
  assert.equal(oracle('Pr-1').occupes, 0, 'une prélecture adoptée par un clic ne répond jamais `occupe`');
  assert.equal(oracle('Pv-1').provisoires, 1);
  assert.deepEqual(oracle('Pv-3').statuts, ['arretee']);
  // États et filtres.
  assert.equal(oracle('Hu-1').statut, 'complete');
  assert.equal(oracle('Hu-4').statut, 'partielle', 'une déclaration illisible est dite, pas prise pour « libre »');
  assert.equal(oracle('Ig-1').statuts?.length, 2);
  assert.ok(oracle('Ig-6').ecran?.boutons?.[0].test('Ne plus ignorer'), 'quand tous les constats sont ignorés, l’écran garde le moyen de les restaurer');
  assert.equal(oracle('St-1').statut, 'complete', 'rien de refusé');
  assert.equal(oracle('St-2').statut, 'partielle', 'le relevé refusé seul');
  assert.equal(oracle('St-10').statut, 'partielle', 'une paire dont aucune part n’est une dépendance');
  assert.equal(oracle('St-9').statut, 'complete', 'les dépendances refusées seules (Q-F89-3)');
  assert.equal(oracle('St-38').statut, 'partielle', 'rien de jugé');
  assert.equal(parOperateur('St').filter((entree) => (entree.entree.oracle as Attente).statut === 'complete').length, 2);
});

test('F9 : les 28 paires de la table de vérité sont toutes là, une fois', () => {
  const paires = parOperateur('St').map((entree) => entree.entree.description).filter((description) => description.includes(' + '));
  assert.equal(paires.length, 28);
  assert.equal(new Set(paires).size, 28);
});

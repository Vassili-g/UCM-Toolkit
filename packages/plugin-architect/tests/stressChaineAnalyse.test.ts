/**
 * Garde de la section D du stress test F8 et F9 (`scripts/stress/f8-analyse/casDeLaChaine.ts`, `rejeu.ts`) : les nombres de cas par
 * série, les cas `mesure` et leur question, et un oracle écrit à la main par série. La garde ne joue que des cas légers, sur des
 * pages et des composants fabriqués : elle ne lit ni les captures de `_local/`, ni les 20 suites de messages de D2. Le harnais
 * complet reste hors de `npm test` (`npm run stress:analyse -- --section D`).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { CAS_B_ENREGISTRES, casDeLaChaine } from '../scripts/stress/f8-analyse/casDeLaChaine';
import type { CasDeChaine } from '../scripts/stress/f8-analyse/chaine';
import { tousLesCas } from '../scripts/stress/f8-analyse/operateurs';
import { NOMBRE_DE_SOURCES, NOMS_DES_PANNES } from '../scripts/stress/f8-analyse/rejeu';
import { rattacher } from '../scripts/stress/f8-analyse/signatures';

const cas = casDeLaChaine();
const serie = (famille: string, operateur: string): CasDeChaine[] => cas.filter((entree) => entree.famille === famille && entree.operateur === operateur);
const unCas = (id: string): CasDeChaine => cas.find((entree) => entree.id === id)!;

const NOMBRES: ReadonlyArray<readonly [string, string, number]> = [
  ['F8', 'D1', 4], ['F8', 'D2', 6], ['F8', 'D3', 8], ['F8', 'D4', 18], ['F8', 'D5', 12], ['F8', 'D6', 7],
  ['F9', 'D1', 19], ['F9', 'D2', 20], ['F9', 'D3', 30], ['F9', 'D4', 5],
];

test('section D : 129 cas, 55 pour F8 et 74 pour F9, aux nombres du plan pour chaque série', () => {
  for (const [famille, operateur, nombre] of NOMBRES) assert.equal(serie(famille, operateur).length, nombre, `${famille} ${operateur}`);
  assert.equal(cas.filter(({ famille }) => famille === 'F8').length, 55);
  assert.equal(cas.filter(({ famille }) => famille === 'F9').length, 74);
  assert.equal(cas.length, 129);
  assert.equal(new Set(cas.map(({ id }) => id)).size, 129, 'les identifiants sont uniques');
  for (const entree of cas) assert.match(entree.id, /^F[89]-D[1-6]-\d+$/, entree.id);
});

test('section D : un cas `mesure` cite sa question, et seul un cas `mesure` en cite une', () => {
  for (const entree of cas) {
    assert.equal(entree.verdict === 'mesure', entree.question !== undefined, entree.id);
    if (entree.question) assert.match(entree.question, /^(Q-F89-\d+|non constructible)$/, entree.id);
    assert.ok(entree.description.length > 10, entree.id);
  }
  const enAttente = new Map(cas.filter(({ verdict }) => verdict === 'mesure').map(({ id, question }) => [id, question]));
  assert.deepEqual([...enAttente], [
    ['F8-D3-4', 'Q-F89-11'], ['F8-D5-8', 'non constructible'], ['F8-D6-1', 'Q-F89-5'], ['F9-D2-14', 'Q-F89-17'],
  ]);
});

test('D3 et D4 de F9 : cinq sources, six pannes, une parité par source', () => {
  assert.equal(NOMBRE_DE_SOURCES, 5);
  assert.deepEqual(NOMS_DES_PANNES, [
    'les règles lèvent', 'le niveau est illisible', 'les ignorés sont illisibles', 'budget de 300 layers', 'moteur partiel', 'annulation à mi-parcours',
  ]);
  assert.equal(serie('F9', 'D3').length, NOMBRE_DE_SOURCES * NOMS_DES_PANNES.length);
  for (const [rang, entree] of serie('F9', 'D3').entries()) {
    assert.match(entree.description, new RegExp(`^source ${Math.floor(rang / NOMS_DES_PANNES.length) + 1} sous la panne « ${NOMS_DES_PANNES[rang % NOMS_DES_PANNES.length]} »$`), entree.id);
    assert.equal(entree.propriete, 'P13');
  }
  for (const [rang, entree] of serie('F9', 'D4').entries()) {
    assert.match(entree.description, new RegExp(`^source ${rang + 1} : prélecture promue puis clic`), entree.id);
    assert.equal(entree.propriete, 'P23');
  }
});

test('D2 de F9 : les 20 suites viennent de 20 cas B distincts de F9, rangés par opérateur', () => {
  const b = new Set(tousLesCas('F9').map(({ id }) => id));
  assert.equal(CAS_B_ENREGISTRES.length, 20);
  assert.equal(new Set(CAS_B_ENREGISTRES).size, 20);
  for (const id of CAS_B_ENREGISTRES) assert.ok(b.has(id), `${id} n’est pas un cas B de F9`);
  assert.deepEqual(serie('F9', 'D2').map(({ description }) => description.replace('relecture de la suite de messages du cas ', '')), [...CAS_B_ENREGISTRES]);
  const operateurs = new Set(CAS_B_ENREGISTRES.map((id) => id.replace(/-\d+$/, '')));
  for (const attendu of ['N1', 'Bd3', 'An', 'Pe', 'Oc', 'Id', 'Pv', 'Ig', 'Hu', 'St']) assert.ok(operateurs.has(attendu), attendu);
});

/** Un cas léger rejoué sur un composant et des pages fabriqués : son oracle contient cette vérification, écrite à la main. */
async function oracleDe(id: string): Promise<{ oracle: readonly string[]; echouees: number }> {
  const j = await unCas(id).executer();
  assert.equal(j.absent, false, id);
  assert.ok(j.verifiees > 0, `${id} ne juge rien`);
  return { oracle: j.oracle, echouees: j.echouees };
}

const contient = (oracle: readonly string[], fragment: string, id: string): void => {
  assert.ok(oracle.some((ligne) => ligne.includes(fragment)), `${id} : l’oracle ne dit pas « ${fragment} »`);
};

test('F8 D1 : la carte d’un C43 se lit — l’oracle nomme le composant et exclut la phrase de repli', async () => {
  const { oracle, echouees } = await oracleDe('F8-D1-1');
  contient(oracle, 'la carte nomme « Button »', 'F8-D1-1');
  contient(oracle, 'la carte n’emploie pas la phrase de repli « Constat Cnn. »', 'F8-D1-1');
  assert.equal(echouees, 0, 'la carte du C43 est lisible');
});

test('F8 D2 : l’oracle des cases attend aucune ligne cochée au premier affichage (Q-03)', async () => {
  const { oracle } = await oracleDe('F8-D2-1');
  contient(oracle, 'aucune ligne cochée au premier affichage', 'F8-D2-1');
  contient((await oracleDe('F8-D2-6')).oracle, 'le pied dit « Aucune correction cochée. » et Appliquer tout est inactif', 'F8-D2-6');
});

test('F8 D3 : un remplissage en dur va dans l’élément Couleurs, section dessinée', async () => {
  const { oracle, echouees } = await oracleDe('F8-D3-1');
  contient(oracle, 'le constat va dans l’élément « couleurs »', 'F8-D3-1');
  contient(oracle, 'le panneau dessine la section « couleurs »', 'F8-D3-1');
  assert.equal(echouees, 0);
});

test('F8 D4 : « Ne plus ignorer » rend le constat — le geste passe par le sandbox et revient à l’écran', async () => {
  const { oracle, echouees } = await oracleDe('F8-D4-3');
  contient(oracle, 'la carte du constat ignoré offre « Ne plus ignorer »', 'F8-D4-3');
  contient(oracle, 'le constat revient dans la liste visible', 'F8-D4-3');
  assert.equal(echouees, 0);
});

test('F8 D5 : la chaîne de bout en bout pose les règles, puis la relecture ne montre plus rien à corriger', async () => {
  const { oracle, echouees } = await oracleDe('F8-D5-1');
  contient(oracle, 'l’écriture se fait en un appel (creer)', 'F8-D5-1');
  contient(oracle, 'la relecture ne montre plus ni C43 ni C45 sans-regle ou sans-valeur', 'F8-D5-1');
  contient(oracle, 'un second passage ne pose rien', 'F8-D5-1');
  assert.equal(echouees, 0);
});

test('F8 D6 : l’oracle de l’absence d’instance attend une seule carte (Q-09)', async () => {
  const { oracle } = await oracleDe('F8-D6-1');
  contient(oracle, 'l’absence d’instance donne une seule carte', 'F8-D6-1');
});

test('F9 D1 : un écran par état — « pas encore analysé » et « complète sans constat » tiennent', async () => {
  const neuf = await oracleDe('F9-D1-4');
  contient(neuf.oracle, 'l\'écran dit ce qu’Analyser va lire', 'F9-D1-4');
  assert.equal(neuf.echouees, 0);
  const tenu = await oracleDe('F9-D1-13');
  contient(tenu.oracle, 'toutes les parts sont jugées : statut complete', 'F9-D1-13');
  contient(tenu.oracle, 'l\'écran dit « Aucun constat sur … » (tout est jugé)', 'F9-D1-13');
  assert.equal(tenu.echouees, 0);
});

test('signatures : un écart se rattache à un écart connu, à la déclaration du cas, sinon « nouveau »', () => {
  const vue = (cas: string, propriete: string, sorte: string, detail: string) => ({ cas, propriete, sorte, detail });
  assert.deepEqual(rattacher(vue('F8-D2-1', 'P12', 'cochee', '2 lignes cochées sur 2')).ids, ['E-34']);
  assert.deepEqual(rattacher(vue('F8-D6-5', 'P11', 'affiche-deux-fois', '2 cartes')).ids, ['E-30']);
  assert.deepEqual(rattacher(vue('F9-D3-4', 'P15', 'accusation', 'Analyse partielle : 90 variants lus sur 90')).ids, ['E-32']);
  assert.deepEqual(rattacher(vue('F9-D3-1', 'P14', 'accusation', 'statut complete')).ids, ['E-31']);
  assert.deepEqual(rattacher(vue('F9-D1-18', 'P22', 'fuite', 'occupe')).ids, ['N-80']);
  assert.deepEqual(rattacher(vue('F8-D4-1', 'P12', 'bouton-manquant', 'aucun bouton Ignorer')).ids, ['nouveau']);
  assert.deepEqual(rattacher(vue('F8-D4-1', 'P12', 'bouton-manquant', 'aucun bouton Ignorer'), 'E-35 (cartes de question)').ids, ['E-35']);
});

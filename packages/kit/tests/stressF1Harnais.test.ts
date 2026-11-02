/** Le harnais de stress test F1 (noms) : graine reproductible, mutations à une lettre, nombre de cas et squelette sans question. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { nomsSelonLesReglesSync } from '../src/nommage/index.js';
import { lireReglesDeNommage } from '../src/protocoles/nommage.js';
import { detecterLesQuestions, type DejaJuge } from '../src/referentiel/index.js';
import { distanceUnOuEchange } from '../src/referentiel/termes-connus.js';
import { lireLesSystemes } from './stress/f1-noms/corpus.js';
import { mutationsDe, OPERATEURS_DE_FAUTE } from './stress/f1-noms/mutations.js';
import {
  bilanDesScenarios, CAS_DU_PLAN, creerLeContexte, enInventaire, genererLesScenarios, MARGE_DU_PLAN, PAIRES_DISTINCTES_ECRITES, squelette,
} from './stress/f1-noms/scenarios.js';

const contexte = creerLeContexte(lireLesSystemes(), 7001);
const REGLES = lireReglesDeNommage([['ecriture', JSON.stringify({ version: 1, groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } })]])!;
const vide: DejaJuge = { distincts: [], plusTard: [], voulus: [], collectionsGardees: [] };

test('chaque mutation de M-01 à M-05 est à distance 1 de sa source et hors du vocabulaire', () => {
  let total = 0;
  for (const terme of contexte.termesCibles) {
    for (const operateur of OPERATEURS_DE_FAUTE) {
      for (const mutation of mutationsDe(terme, operateur, { graine: 7001, ecarte: contexte.ecarte })) {
        total++;
        assert.ok(distanceUnOuEchange(terme, mutation.mot), `${terme} -> ${mutation.mot} (${operateur}/${mutation.variante})`);
        assert.ok(!contexte.vocabulaire.termes.has(mutation.mot) && !contexte.motsDuDictionnaire.has(mutation.mot), `${mutation.mot} est connu`);
      }
    }
  }
  assert.ok(total > 1300, `${total} mutations`);
});

test('deux exécutions avec la graine 7001 donnent la même empreinte, une autre graine une autre', () => {
  const strates = ['S1', 'S3'];
  const premiere = bilanDesScenarios(contexte, { strates });
  const seconde = bilanDesScenarios(creerLeContexte(lireLesSystemes(), 7001), { strates });
  assert.equal(premiere.empreinte, seconde.empreinte);
  assert.notEqual(bilanDesScenarios({ ...contexte, graine: 7002 }, { strates }).empreinte, premiere.empreinte);
});

test('le nombre de cas des strates rapides tient à 5 % du plan, et chaque identifiant est unique', () => {
  const strates = ['S1', 'S3', 'S4', 'S5', 'S10', 'S12', 'S14', 'S17'];
  const identifiants = new Set<string>();
  const comptes: Record<string, number> = {};
  for (const cas of genererLesScenarios(contexte, { strates })) {
    assert.ok(!identifiants.has(cas.id), `identifiant en double : ${cas.id}`);
    identifiants.add(cas.id);
    comptes[cas.strate] = (comptes[cas.strate] ?? 0) + 1;
    assert.ok(cas.noms.length >= 12 && cas.noms.length <= 45, `${cas.id} compte ${cas.noms.length} noms`);
  }
  for (const strate of strates) {
    const ecart = Math.abs(comptes[strate] - CAS_DU_PLAN[strate]) / CAS_DU_PLAN[strate];
    assert.ok(ecart <= MARGE_DU_PLAN, `${strate} : ${comptes[strate]} cas pour ${CAS_DU_PLAN[strate]} au plan`);
  }
});

test('la liste écrite à la main compte 30 paires de mots différents', () => {
  assert.equal(PAIRES_DISTINCTES_ECRITES.length, 30);
  for (const [a, b] of PAIRES_DISTINCTES_ECRITES) assert.notEqual(a, b);
});

test('P-23 : le squelette seul ne donne ni question ni renommage', () => {
  const cas = { id: 'squelette', noms: squelette(contexte.pool) };
  assert.equal(cas.noms.length, 12);
  const { lexique, indexation, resultat } = nomsSelonLesReglesSync(enInventaire(cas), REGLES, []);
  assert.deepEqual(resultat.renommages.map((renommage) => renommage.nouveauNom), []);
  const { questions, autres } = detecterLesQuestions(lexique, indexation.index, vide, { seuil: 0, maximum: 500 });
  assert.deepEqual([...questions, ...autres].map((question) => question.cle), []);
});

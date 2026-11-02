/** Le harnais de stress test F1 (noms) : graine reproductible, mutations à une lettre, nombre de cas et squelette sans question. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { nomsSelonLesReglesSync } from '../src/nommage/index.js';
import { lireReglesDeNommage } from '../src/protocoles/nommage.js';
import { detecterLesQuestions, type DejaJuge } from '../src/referentiel/index.js';
import { distanceUnOuEchange } from '../src/referentiel/termes-connus.js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { lireLesSystemes, RACINE_DU_DEPOT } from './stress/f1-noms/corpus.js';
import { CERTAINES, classer, creerLeContexteDeClassement, lignesAJuger, PLAFOND_A_JUGER, type LigneDeFauxPositif } from './stress/f1-noms/faux-positifs.js';
import { chargerLesClassements, clePaire } from './stress/f1-noms/oracle.js';
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

test('chaque paire écrite à la main est à distance 1 et formes.json ne la tient pas pour un même mot', () => {
  const classements = chargerLesClassements();
  for (const [a, b] of PAIRES_DISTINCTES_ECRITES) {
    assert.ok(distanceUnOuEchange(a, b), `${a} / ${b} n'est pas à distance 1`);
    assert.ok(!classements.memeMot.has(clePaire(a, b)), `${a} / ${b} est un même mot selon formes.json`);
  }
});

// S6 n'est pas dans ce test : son générateur calcule les 40 paires du dictionnaire (1,7 s), au-delà du budget de 2 s du fichier
test('le correctif de fréquence : chaque nom répété par S12 et S13 est distinct', () => {
  for (const strate of ['S12', 'S13']) {
    let verifies = 0;
    for (const cas of genererLesScenarios(contexte, { strates: [strate] })) {
      const noms = cas.noms.map((nom) => `${nom.collection}|${nom.nom}`);
      assert.equal(new Set(noms).size, noms.length, `${cas.id} compte des noms en double`);
      const frequence = Number(cas.axes.fb ?? cas.axes.n ?? cas.axes.frequence ?? cas.axes.variables);
      if (frequence === 5 || frequence === 10) {
        assert.ok(noms.length >= 12 + frequence, `${cas.id} : ${noms.length} noms pour la fréquence ${frequence}`);
        if (++verifies === 3) break;
      }
    }
    assert.ok(verifies > 0, `${strate} : aucun cas de fréquence 5 ou 10`);
  }
});

test('P-23 : le squelette seul ne donne ni question ni renommage', () => {
  const cas = { id: 'squelette', noms: squelette(contexte.pool) };
  assert.equal(cas.noms.length, 12);
  const { lexique, indexation, resultat } = nomsSelonLesReglesSync(enInventaire(cas), REGLES, []);
  assert.deepEqual(resultat.renommages.map((renommage) => renommage.nouveauNom), []);
  const { questions, autres } = detecterLesQuestions(lexique, indexation.index, vide, { seuil: 0, maximum: 500 });
  assert.deepEqual([...questions, ...autres].map((question) => question.cle), []);
});

test('le chargeur de seuil réécrit la constante du kit et refuse une ligne qui a changé de forme', async () => {
  const chargeur = (await import(pathToFileURL(join(RACINE_DU_DEPOT, 'packages/kit/tests/stress/f1-noms/seuil.mjs')).href)) as { reecrireLaConstante: (source: string, longueur: number) => string };
  const source = readFileSync(join(RACINE_DU_DEPOT, 'packages/kit/src/referentiel/termes-connus.ts'), 'utf8');
  assert.match(chargeur.reecrireLaConstante(source, 7), /const LONGUEUR_MINIMALE_D_UNE_FAUTE = 7;/);
  assert.match(chargeur.reecrireLaConstante('const LONGUEUR_MINIMALE_D_UNE_FAUTE=5;', 3), /=3;/);
  for (const changee of ['const LONGUEUR_MINIMALE_D_UNE_FAUTE: number = 5;', 'const LONGUEUR_MINIMALE_D_UNE_FAUTE = 2 + 3;', 'const LONGUEUR_MINIMALE = 5;']) {
    assert.throws(() => chargeur.reecrireLaConstante(changee, 3), /a changé de forme/, changee);
  }
});

test('le classement des faux positifs suit les classes du plan', () => {
  const classement = creerLeContexteDeClassement(contexte);
  const passe = { dictionnaireDesAutres: new Set(['tip', 'title', 'tile', 'weight', 'height']), nomsPropres: new Set(['heights']) };
  const classe = (type: Parameters<typeof classer>[0]['type'], signales: string[], references: string[], paire?: [string, string]) => classer({ type, signales, references, paire }, classement, passe).classe;
  assert.equal(classe('synonymes', ['error', 'danger'], [], ['error', 'danger']), 'FP-B', 'synonymes du vocabulaire');
  assert.equal(classe('pluriel', ['color', 'colors'], [], ['color', 'colors']), 'FP-B', 'formes du même mot (formes.json)');
  assert.equal(classe('faute', ['tile'], ['title'], undefined), 'FP-A', 'mot attesté ailleurs');
  assert.equal(classe('faute', ['tip'], ['top'], undefined), 'FP-A');
  assert.equal(classe('faute', ['heights'], ['height']), 'FP-C', 'nom propre');
  assert.equal(classe('faute', ['backgrond'], ['background']), 'FP-D', 'mot attesté dans ce seul système');
  assert.equal(classe('renommage-ecriture', [], []), 'FP-B');
  assert.equal(classe('collection', ['tokens'], []), 'FP-B');
  assert.deepEqual([...CERTAINES].sort(), ['FP-A', 'FP-C']);
});

test('a-juger.csv garde 200 lignes au plus, les mieux notées, une par système et par mot', () => {
  const ligne = (rang: number, passe: string): LigneDeFauxPositif => ({ passe, systeme: `s${rang % 7}`, type: 'faute', classe: 'FP-D', score: rang % 13, mot: `mot${rang}`, reference: 'ref', nombre: 1, exemples: [], motif: '' });
  const lignes = Array.from({ length: 700 }, (_, rang) => ligne(rang, `s${rang % 7}/a`)).concat(Array.from({ length: 50 }, (_, rang) => ligne(rang, `s${rang % 7}/b`)));
  const rendues = lignesAJuger(lignes);
  assert.equal(rendues.length, PLAFOND_A_JUGER);
  assert.ok(rendues.every((rendue, rang) => rang === 0 || (rendues[rang - 1].score ?? 0) >= (rendue.score ?? 0)));
  assert.equal(new Set(rendues.map((rendue) => `${rendue.systeme}|${rendue.mot}`)).size, rendues.length);
});

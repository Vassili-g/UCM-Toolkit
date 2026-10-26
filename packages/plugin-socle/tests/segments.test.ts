/**
 * La lecture des segments de texte et leur projection : lire une fois `getStyledTextSegments` pour une union de champs,
 * puis projeter les plages sur les champs d'un lecteur en fusionnant les plages voisines égales. La projection doit
 * rendre ce que Figma rend pour ces champs seuls, puisque Figma coupe le texte dès qu'un des champs demandés change.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  egalesEnProfondeur,
  lireLesSegments,
  lireLesSegmentsCooperatif,
  projeterLesPlages,
  type PlageLue,
} from '../src/composant/analyse/acquisition';
import type { ChampDeSegment } from '../src/composant/analyse/faits';
import { dansUnePorteeDAnalyse, plagesDuNoeud } from '../src/composant/contract/porteeDAnalyse';

const plage = (debut: number, fin: number, valeurs: PlageLue['valeurs']): PlageLue => ({ debut, fin, valeurs });
const noir = { r: 0, g: 0, b: 0, a: 1 };

/** Figma : un texte de plages fines, rendu pour `champs` seuls, coupé dès qu'un champ demandé change. */
function figmaPour(fines: readonly PlageLue[], champs: readonly ChampDeSegment[]): PlageLue[] {
  const sortie: PlageLue[] = [];
  for (const fine of fines) {
    const valeurs = Object.fromEntries(champs.map((champ) => [champ, fine.valeurs[champ]]));
    const derniere = sortie[sortie.length - 1];
    if (derniere && derniere.fin === fine.debut && champs.every((champ) => JSON.stringify(derniere.valeurs[champ]) === JSON.stringify(valeurs[champ]))) {
      sortie[sortie.length - 1] = { ...derniere, fin: fine.fin };
    } else sortie.push({ debut: fine.debut, fin: fine.fin, valeurs });
  }
  return sortie;
}

test('la projection sur un sous-ensemble de champs rend les plages de Figma pour ces champs, sur mille textes tirés', () => {
  const champs: readonly ChampDeSegment[] = ['fontSize', 'fontWeight', 'fills', 'boundVariables', 'textStyleId'];
  const sousEnsembles: ChampDeSegment[][] = [['boundVariables', 'fills'], ['textStyleId'], ['fontSize', 'fontWeight', 'fills', 'boundVariables', 'textStyleId'], ['fills']];
  let graine = 7;
  const tirer = (borne: number) => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine % borne; };
  const fills = [[{ type: 'SOLID', color: noir }], [{ type: 'SOLID', color: { ...noir, r: 1 } }], [{ type: 'GRADIENT_LINEAR', gradientTransform: [[1, 0, 0]] }], [{ type: 'GRADIENT_LINEAR', gradientTransform: [[0, 1, 0]] }]];
  const liaisons = [{}, { fontSize: { type: 'VARIABLE_ALIAS', id: 'a' } }, { fontSize: { type: 'VARIABLE_ALIAS', id: 'b' } }];
  for (let essai = 0; essai < 1000; essai += 1) {
    const fines: PlageLue[] = [];
    let debut = 0;
    for (let rang = tirer(7); rang >= 0; rang -= 1) {
      const fin = debut + 1 + tirer(4);
      fines.push(plage(debut, fin, { fontSize: 12 + tirer(2), fontWeight: 400 + 300 * tirer(2), fills: fills[tirer(fills.length)], boundVariables: liaisons[tirer(liaisons.length)], textStyleId: ['', 'S:1'][tirer(2)] }));
      debut = fin;
    }
    const union = figmaPour(fines, champs);
    for (const sousEnsemble of sousEnsembles) assert.deepEqual(projeterLesPlages(union, sousEnsemble), figmaPour(fines, sousEnsemble), `essai ${essai}, ${sousEnsemble}`);
  }
});

test('une projection fusionne les plages voisines égales et garde les autres', () => {
  const plages = [
    plage(0, 3, { fontSize: 14, fills: [1] }),
    plage(3, 6, { fontSize: 16, fills: [1] }),
    plage(6, 9, { fontSize: 14, fills: [1] }),
    plage(9, 12, { fontSize: 14, fills: [2] }),
  ];
  assert.deepEqual(projeterLesPlages(plages, ['fills']), [plage(0, 9, { fills: [1] }), plage(9, 12, { fills: [2] })]);
  assert.deepEqual(projeterLesPlages(plages, ['fontSize']), [plage(0, 3, { fontSize: 14 }), plage(3, 6, { fontSize: 16 }), plage(6, 12, { fontSize: 14 })]);
  assert.deepEqual(projeterLesPlages(plages, ['fontSize', 'fills']).map((p) => `${p.debut}-${p.fin}`), ['0-3', '3-6', '6-9', '9-12']);
  assert.deepEqual(projeterLesPlages([], ['fills']), []);
});

test('une projection ne fusionne pas des plages séparées par un trou, ni des plages sans bornes numériques', () => {
  assert.deepEqual(projeterLesPlages([plage(0, 3, { fills: [] }), plage(4, 6, { fills: [] })], ['fills']).length, 2);
  const sansBornes = [{ debut: undefined, fin: undefined, valeurs: { fills: [] } }, { debut: undefined, fin: undefined, valeurs: { fills: [] } }] as unknown as PlageLue[];
  assert.equal(projeterLesPlages(sansBornes, ['fills']).length, 2);
});

test('la fusion compare les valeurs lues : deux dégradés qui ne diffèrent que par leur transformation restent séparés', () => {
  const degrade = (transformation: number[][]) => [{ type: 'GRADIENT_LINEAR', gradientTransform: transformation, gradientStops: [{ position: 0, color: noir }] }];
  const plages = [plage(0, 3, { fills: degrade([[1, 0, 0]]) }), plage(3, 6, { fills: degrade([[0, 1, 0]]) }), plage(6, 9, { fills: degrade([[0, 1, 0]]) })];
  assert.deepEqual(projeterLesPlages(plages, ['fills']).map((p) => `${p.debut}-${p.fin}`), ['0-3', '3-9']);
});

test('l’égalité profonde ignore l’ordre des clés et distingue les listes, les objets et les symboles', () => {
  const mixte = Symbol('figma.mixed');
  assert.equal(egalesEnProfondeur({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 }), true);
  assert.equal(egalesEnProfondeur({ a: 1, b: undefined }, { a: 1 }), true);
  assert.equal(egalesEnProfondeur([1, 2], [2, 1]), false);
  assert.equal(egalesEnProfondeur([], {}), false);
  assert.equal(egalesEnProfondeur({ a: 1 }, { a: 1, b: 2 }), false);
  assert.equal(egalesEnProfondeur(NaN, NaN), true);
  assert.equal(egalesEnProfondeur(null, undefined), false);
  assert.equal(egalesEnProfondeur(mixte, mixte), true);
  assert.equal(egalesEnProfondeur(mixte, Symbol('figma.mixed')), false);
});

test('la lecture appelle getStyledTextSegments une fois, avec les champs dans leur ordre, et copie les valeurs demandées', () => {
  const appels: string[][] = [];
  const noeud = {
    getStyledTextSegments(champs: string[]) {
      appels.push(champs);
      return [{ start: 0, end: 2, fontSize: 14, fills: [], inutile: 1 }, { start: 2, end: 5, fontSize: 16, fills: [] }];
    },
  };
  assert.deepEqual(lireLesSegments(noeud, ['fontSize', 'fills']), {
    etat: 'acquis',
    valeur: [plage(0, 2, { fontSize: 14, fills: [] }), plage(2, 5, { fontSize: 16, fills: [] })],
  });
  assert.deepEqual(appels, [['fontSize', 'fills']]);
});

test('la lecture refuse l’appel entier : méthode absente, appel qui lève, forme inattendue ; une liste absente vaut un texte vide', () => {
  assert.deepEqual(lireLesSegments({}, ['fills']), { etat: 'refuse', raison: 'absent' });
  assert.deepEqual(lireLesSegments({ getStyledTextSegments: () => { throw new Error('police non chargée'); } }, ['fills']), { etat: 'refuse', raison: 'leve', message: 'police non chargée' });
  assert.deepEqual(lireLesSegments({ get getStyledTextSegments(): unknown { throw new Error('nœud supprimé'); } }, ['fills']), { etat: 'refuse', raison: 'leve', message: 'nœud supprimé' });
  assert.deepEqual(lireLesSegments({ getStyledTextSegments: () => 'x' }, ['fills']).etat, 'refuse');
  assert.deepEqual(lireLesSegments({ getStyledTextSegments: () => [null] }, ['fills']).etat, 'refuse');
  assert.deepEqual(lireLesSegments({ getStyledTextSegments: () => undefined }, ['fills']), { etat: 'acquis', valeur: [] });
  assert.deepEqual(lireLesSegments({ getStyledTextSegments: () => [] }, ['fills']), { etat: 'acquis', valeur: [] });
});

test('la lecture coopérative cède la main après chaque plage', async () => {
  let cessions = 0;
  const noeud = { getStyledTextSegments: () => Array.from({ length: 5 }, (_, rang) => ({ start: rang, end: rang + 1, fills: [] })) };
  const lu = await lireLesSegmentsCooperatif(noeud, ['fills'], { cederSiBesoin: () => { cessions += 1; } });
  assert.equal(lu.etat === 'acquis' && lu.valeur.length, 5);
  assert.equal(cessions, 5);
});

function texteComptant(id: string | undefined, plages: unknown[] | Error) {
  const appels: string[] = [];
  const noeud = {
    id,
    getStyledTextSegments(champs: string[]) {
      appels.push(champs.join(','));
      if (plages instanceof Error) throw plages;
      return plages;
    },
  };
  return { noeud, appels };
}

const GROUPE: readonly ChampDeSegment[] = ['listOptions', 'textStyleOverrides'];

test('dans une portée, deux lecteurs d’un même nœud partagent un appel et chacun reçoit ses champs', async () => {
  const { noeud, appels } = texteComptant('t', [
    { start: 0, end: 2, listOptions: { type: 'NONE' }, textStyleOverrides: [] },
    { start: 2, end: 4, listOptions: { type: 'NONE' }, textStyleOverrides: [{ type: 'SEMANTIC_ITALIC' }] },
    { start: 4, end: 6, listOptions: { type: 'UNORDERED' }, textStyleOverrides: [{ type: 'SEMANTIC_ITALIC' }] },
  ]);
  await dansUnePorteeDAnalyse({}, async () => {
    const listes = plagesDuNoeud(noeud, ['listOptions'], GROUPE);
    const surcharges = plagesDuNoeud(noeud, ['textStyleOverrides'], GROUPE);
    assert.deepEqual(listes.etat === 'acquis' && listes.valeur.map((p) => `${p.debut}-${p.fin}`), ['0-4', '4-6']);
    assert.deepEqual(surcharges.etat === 'acquis' && surcharges.valeur.map((p) => `${p.debut}-${p.fin}`), ['0-2', '2-6']);
  });
  assert.deepEqual(appels, ['listOptions,textStyleOverrides']);
});

test('hors d’une portée, ou sans identifiant de nœud, chaque lecteur lit ses champs seuls', async () => {
  const hors = texteComptant('t', []);
  plagesDuNoeud(hors.noeud, ['listOptions'], GROUPE);
  plagesDuNoeud(hors.noeud, ['textStyleOverrides'], GROUPE);
  assert.deepEqual(hors.appels, ['listOptions', 'textStyleOverrides']);

  const sansId = texteComptant(undefined, []);
  await dansUnePorteeDAnalyse({}, async () => {
    plagesDuNoeud(sansId.noeud, ['listOptions'], GROUPE);
    plagesDuNoeud(sansId.noeud, ['textStyleOverrides'], GROUPE);
  });
  assert.deepEqual(sansId.appels, ['listOptions', 'textStyleOverrides']);
});

test('dans une portée, un refus se mémorise pour les deux lecteurs, et deux nœuds ne se confondent pas', async () => {
  const leve = texteComptant('a', new Error('police non chargée'));
  const autre = texteComptant('b', []);
  await dansUnePorteeDAnalyse({}, async () => {
    for (const champ of GROUPE) assert.deepEqual(plagesDuNoeud(leve.noeud, [champ], GROUPE), { etat: 'refuse', raison: 'leve', message: 'police non chargée' });
    for (const champ of GROUPE) assert.deepEqual(plagesDuNoeud(autre.noeud, [champ], GROUPE), { etat: 'acquis', valeur: [] });
  });
  assert.deepEqual(leve.appels, ['listOptions,textStyleOverrides']);
  assert.deepEqual(autre.appels, ['listOptions,textStyleOverrides']);
});

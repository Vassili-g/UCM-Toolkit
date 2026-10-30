/**
 * La création des variables que C82 propose (sorte `variable`) : une couleur de `theme`, un alias par mode, ses scopes. Le lot
 * garde un seul point d'annulation, un journal où la variable créée porte son identifiant réel, et l'Historique défait la création.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Correction } from '@ucm-kit/core/controles';

import { annulerLeDernierLotDeStructure, ecrireLaStructure, type ApiDeStructure } from '../src/ecriture/structure';
import { lireLeJournalDeStructure, type PortDeRegles } from '../src/ecriture/journal';
import { atelierDEcriture, type OptionsDeLEcriture, type VariableDEcriture } from './figmaDeTest';

const THEME = 'C:T';
const CLAIR = 'C:T:light';
const SOMBRE = 'C:T:dark';
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

const palette = (id: string, nom: string): VariableDEcriture => ({ id, key: `k-${id.slice(2)}`, name: nom, scopes: [], valuesByMode: {}, collection: 'C:B' });
const clair = (): VariableDEcriture => palette('V:b1', 'primary/light/50');
const sombre = (): VariableDEcriture => palette('V:b2', 'primary/dark/100');
const collections = [{ id: THEME, name: 'theme', modes: ['light', 'dark'] }, { id: 'C:B', name: 'brands', modes: ['Marque'] }];

const creation = (nom: string, extras: Partial<Correction> = {}): Correction => ({
  id: `C82:variable-absente:${THEME}:${nom}`, sorte: 'variable', cible: {}, avant: null, apres: { nom, collection: 'theme' },
  aRelire: { regle: 'La variable est prévue par le thème.', avant: null },
  creation: {
    collection: THEME, nom, type: 'COLOR', scopes: ['FRAME_FILL', 'SHAPE_FILL'],
    alias: { [CLAIR]: { cle: 'k-b1', nom: 'primary/light/50' }, [SOMBRE]: { cle: 'k-b2', nom: 'primary/dark/100' } },
  },
  ...extras,
});
const subtle = (): Correction => creation('primary/surface/subtle');
const divider = (): Correction => creation('primary/surface/divider');

function stockageEnMemoire() {
  const donnees = new Map<string, string>();
  const port: PortDeRegles = {
    cles: () => [...donnees.keys()],
    lire: (cle) => donnees.get(cle) ?? '',
    ecrire: (cle, texte) => { donnees.set(cle, texte); },
    effacer: (cle) => { donnees.delete(cle); },
  };
  return { donnees, port };
}

function monde(options: OptionsDeLEcriture = {}) {
  const a = atelierDEcriture({ locales: [clair(), sombre()], collections, ...options });
  const { port } = stockageEnMemoire();
  const api = a.api as unknown as ApiDeStructure;
  let rang = 0;
  const choix = { api, stockage: port, heure: () => 'h', lot: () => `lot${rang++}` };
  return {
    a, port,
    ecrire: (corrections: readonly Correction[]) => ecrireLaStructure(corrections, choix),
    annuler: () => annulerLeDernierLotDeStructure(choix),
    ecritures: () => a.journal.filter((ligne) => /^(creer|scopes|mode|supprimer):/u.test(ligne)),
    points: () => a.journal.filter((ligne) => ligne === 'commitUndo').length,
  };
}

test('deux corrections créent deux variables : un alias par mode, les scopes de la correction, un seul point d’annulation', async () => {
  const m = monde();
  const rendu = await m.ecrire([subtle(), divider()]);
  assert.deepEqual(rendu, { ecrites: [subtle().id, divider().id], sautees: [] });
  const [premiere, seconde] = m.a.locales().slice(2);
  assert.equal(premiere?.name, 'primary/surface/subtle');
  assert.equal(seconde?.name, 'primary/surface/divider');
  for (const creee of [premiere, seconde]) {
    assert.deepEqual(creee?.valuesByMode, { [CLAIR]: alias('V:b1'), [SOMBRE]: alias('V:b2') });
    assert.deepEqual(creee?.scopes, ['FRAME_FILL', 'SHAPE_FILL']);
  }
  assert.deepEqual(m.ecritures(), [
    'creer:primary/surface/subtle', `mode:V:neuve-1:${CLAIR}:V:b1`, `mode:V:neuve-1:${SOMBRE}:V:b2`, 'scopes:V:neuve-1:FRAME_FILL,SHAPE_FILL',
    'creer:primary/surface/divider', `mode:V:neuve-2:${CLAIR}:V:b1`, `mode:V:neuve-2:${SOMBRE}:V:b2`, 'scopes:V:neuve-2:FRAME_FILL,SHAPE_FILL',
  ]);
  assert.equal(m.points(), 1);
  assert.deepEqual(lireLeJournalDeStructure(m.port)?.lignes, [
    { sorte: 'creation', variable: 'V:neuve-1', nom: 'primary/surface/subtle', collection: THEME },
    { sorte: 'creation', variable: 'V:neuve-2', nom: 'primary/surface/divider', collection: THEME },
  ]);
});

test('une création, un alias et des scopes dans un même lot posent un seul point d’annulation', async () => {
  const autre: VariableDEcriture = { id: 'V:1', key: 'k-defaut', name: 'primary/surface/default', scopes: ['TEXT_FILL'], collection: THEME, valuesByMode: { [CLAIR]: alias('V:b1'), [SOMBRE]: alias('V:b1') } };
  const m = monde({ locales: [autre, clair(), sombre()] });
  const scopes: Correction = {
    id: 'C63:k-defaut:scopes', sorte: 'scope', cible: { variable: 'k-defaut' }, avant: 'TEXT_FILL', apres: { nom: '' }, aRelire: { regle: 'r', avant: 'TEXT_FILL' },
  };
  const versLeSombre: Correction = {
    id: 'C60', sorte: 'alias-de-mode', cible: { variable: 'k-defaut', mode: SOMBRE }, avant: 'k-b1', apres: { cle: 'k-b2', nom: 'primary/dark/100' }, aRelire: { regle: 'r', avant: 'k-b1' },
  };
  const rendu = await m.ecrire([scopes, versLeSombre, subtle()]);
  assert.equal(rendu.ecrites.length, 3);
  assert.equal(m.points(), 1);
  assert.deepEqual(m.a.variable('V:1')?.scopes, [], 'apres.nom vide : un ensemble vide');
  assert.deepEqual(lireLeJournalDeStructure(m.port)?.lignes.map(({ sorte }) => sorte), ['scopes', 'alias-de-mode', 'creation']);
});

test('un second Appliquer saute en deja-la : même nom, mêmes alias, rien ne s’écrit', async () => {
  const m = monde();
  await m.ecrire([subtle()]);
  const avant = m.ecritures().length;
  const points = m.points();
  const rendu = await m.ecrire([subtle()]);
  assert.deepEqual(rendu, { ecrites: [], sautees: [{ id: subtle().id, motif: 'deja-la' }] });
  assert.equal(m.ecritures().length, avant);
  assert.equal(m.points(), points);
});

test('une variable de même nom et d’autres alias saute en existe-divergente, sans écriture', async () => {
  const voisine: VariableDEcriture = {
    id: 'V:9', key: 'k-9', name: 'primary/surface/subtle', scopes: [], collection: THEME, valuesByMode: { [CLAIR]: alias('V:b1'), [SOMBRE]: alias('V:b1') },
  };
  const m = monde({ locales: [clair(), sombre(), voisine] });
  const rendu = await m.ecrire([subtle()]);
  assert.deepEqual(rendu, { ecrites: [], sautees: [{ id: subtle().id, motif: 'existe-divergente' }] });
  assert.deepEqual(m.ecritures(), []);
  assert.equal(m.points(), 0);
  assert.deepEqual(m.port.cles(), []);
});

test('une variable de même nom qui n’est pas une couleur saute en existe-divergente', async () => {
  const voisine: VariableDEcriture = {
    id: 'V:9', key: 'k-9', name: 'primary/surface/subtle', scopes: [], collection: THEME, type: 'FLOAT', valuesByMode: { [CLAIR]: alias('V:b1'), [SOMBRE]: alias('V:b2') },
  };
  const m = monde({ locales: [clair(), sombre(), voisine] });
  assert.deepEqual((await m.ecrire([subtle()])).sautees, [{ id: subtle().id, motif: 'existe-divergente' }]);
});

test('une variable de même nom dans une autre collection ne bloque pas la création', async () => {
  const ailleurs: VariableDEcriture = { id: 'V:9', key: 'k-9', name: 'primary/surface/subtle', scopes: [], collection: 'C:B', valuesByMode: {} };
  const m = monde({ locales: [clair(), sombre(), ailleurs] });
  assert.deepEqual((await m.ecrire([subtle()])).ecrites, [subtle().id]);
});

test('une cible disparue entre la lecture et l’écriture saute en cible-introuvable, les autres créations s’écrivent', async () => {
  const m = monde({ locales: [clair()] });
  const seule: Correction = { ...divider(), creation: { ...divider().creation!, alias: { [CLAIR]: { cle: 'k-b1', nom: 'primary/light/50' } } } };
  const rendu = await m.ecrire([subtle(), seule]);
  assert.deepEqual(rendu, { ecrites: [seule.id], sautees: [{ id: subtle().id, motif: 'cible-introuvable' }] });
  assert.deepEqual(m.ecritures().filter((ligne) => ligne.startsWith('creer:')), ['creer:primary/surface/divider']);
});

test('une collection absente, distante ou qui n’est pas theme saute en objet-change', async () => {
  const m = monde();
  const ailleurs = (collection: string): Correction => ({ ...subtle(), creation: { ...subtle().creation!, collection } });
  assert.deepEqual((await m.ecrire([ailleurs('C:disparue')])).sautees, [{ id: subtle().id, motif: 'objet-change' }]);
  assert.deepEqual((await m.ecrire([ailleurs('C:B')])).sautees, [{ id: subtle().id, motif: 'objet-change' }]);
  assert.deepEqual(m.ecritures(), []);
});

test('un mode que la collection n’a plus saute en objet-change', async () => {
  const m = monde();
  const disparu: Correction = { ...subtle(), creation: { ...subtle().creation!, alias: { 'C:T:disparu': { cle: 'k-b1', nom: 'primary/light/50' } } } };
  assert.deepEqual((await m.ecrire([disparu])).sautees, [{ id: subtle().id, motif: 'objet-change' }]);
  assert.deepEqual(m.ecritures(), []);
});

test('hors UCM, une création saute non-ucm', async () => {
  const m = monde({ declaration: 'libre' });
  const rendu = await m.ecrire([subtle()]);
  assert.deepEqual(rendu.sautees.map(({ motif }) => motif), ['non-ucm']);
  assert.deepEqual(m.ecritures(), []);
});

test('une création que Figma refuse saute en erreur, les autres s’écrivent et seules elles entrent au journal', async () => {
  const m = monde({ refusees: new Set(['creer:primary/surface/subtle']) });
  const rendu = await m.ecrire([subtle(), divider()]);
  assert.deepEqual(rendu.sautees, [{ id: subtle().id, motif: 'erreur' }]);
  assert.deepEqual(rendu.ecrites, [divider().id]);
  assert.deepEqual(m.a.locales().map(({ name }) => name), ['primary/light/50', 'primary/dark/100', 'primary/surface/divider']);
  assert.deepEqual(lireLeJournalDeStructure(m.port)?.lignes.map(({ nom }) => nom), ['primary/surface/divider']);
});

test('l’Historique défait les créations : les variables sans usage sont supprimées', async () => {
  const m = monde();
  await m.ecrire([subtle(), divider()]);
  const rendu = await m.annuler();
  assert.equal(rendu.defaites, 2);
  assert.equal(rendu.restantes, 0);
  assert.equal(rendu.limiteDesUsages, true);
  assert.deepEqual(m.a.locales().map(({ name }) => name), ['primary/light/50', 'primary/dark/100']);
  assert.deepEqual(m.port.cles(), []);
});

test('une variable créée puis liée à un layer n’est pas supprimée par l’annulation : usage-ajoute', async () => {
  const m = monde();
  await m.ecrire([subtle(), divider()]);
  m.a.layer('1:1', 'FRAME', { boundVariables: { paddingLeft: alias('V:neuve-1') } });
  const rendu = await m.annuler();
  assert.deepEqual(rendu.sautees, [{ variable: 'V:neuve-1', sorte: 'creation', motif: 'usage-ajoute' }]);
  assert.equal(rendu.defaites, 1);
  assert.ok(m.a.variable('V:neuve-1'));
  assert.equal(m.a.variable('V:neuve-2'), undefined);
  assert.equal(lireLeJournalDeStructure(m.port)?.lignes.length, 1);
});

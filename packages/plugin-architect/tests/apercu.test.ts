/** L'aperçu d'un composant : borne de largeur, origine, boîte d'un calque, export qui lève. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { LARGEUR_MAXIMALE, boiteDe, exporterLApercu, type NoeudExportable, type PortDeLApercu } from '../src/apercu';
import { enLectureSeule } from './figmaDeTest';

/** Un port sur un seul calque, qui relève les réglages de chaque export. */
function portSur(noeud: object | null) {
  const exports: unknown[] = [];
  const journal: string[] = [];
  const brut: object = { resize() {}, ...noeud };
  const fige = noeud ? (enLectureSeule(brut, ['exportAsync'], journal) as NoeudExportable) : null;
  const port: PortDeLApercu = { getNodeByIdAsync: async () => fige };
  return { exports, journal, port: enLectureSeule(port, ['getNodeByIdAsync'], journal) };
}

test('l’image garde la largeur du sujet jusqu’à 720 px, et la borne au-delà', async () => {
  const exports: unknown[] = [];
  const noeud = (largeur: number) => ({ absoluteRenderBounds: { x: 10, y: 20, width: largeur, height: 60 }, exportAsync: async (reglages: unknown) => { exports.push(reglages); return new Uint8Array([1, 2, 3]); } });
  const petit = await exporterLApercu(portSur(noeud(400.4)).port, '1:2');
  assert.deepEqual(exports.pop(), { format: 'PNG', constraint: { type: 'WIDTH', value: 400 } });
  assert.deepEqual(petit, { octets: new Uint8Array([1, 2, 3]), largeur: 400.4, hauteur: 60, origine: { x: 10, y: 20 } });
  await exporterLApercu(portSur(noeud(1600)).port, '1:2');
  assert.deepEqual(exports.pop(), { format: 'PNG', constraint: { type: 'WIDTH', value: LARGEUR_MAXIMALE } });
  await exporterLApercu(portSur(noeud(0.2)).port, '1:2');
  assert.deepEqual(exports.pop(), { format: 'PNG', constraint: { type: 'WIDTH', value: 1 } });
});

test('l’origine est celle de la zone rendue, ou de la boîte quand Figma ne donne pas la zone', async () => {
  const exportAsync = async () => new Uint8Array();
  const rendu = await exporterLApercu(portSur({ absoluteRenderBounds: { x: -4, y: -6, width: 108, height: 52 }, absoluteBoundingBox: { x: 0, y: 0, width: 100, height: 40 }, exportAsync }).port, '1:2');
  assert.deepEqual([rendu?.origine, rendu?.largeur, rendu?.hauteur], [{ x: -4, y: -6 }, 108, 52]);
  const sansRendu = await exporterLApercu(portSur({ absoluteRenderBounds: null, absoluteBoundingBox: { x: 3, y: 5, width: 100, height: 40 }, exportAsync }).port, '1:2');
  assert.deepEqual(sansRendu?.origine, { x: 3, y: 5 });
});

test('un export qui lève, un calque absent ou sans zone rendent null, sans rien écrire', async () => {
  const leve = portSur({ absoluteRenderBounds: { x: 0, y: 0, width: 10, height: 10 }, exportAsync: async () => { throw new Error('export refusé'); } });
  assert.equal(await exporterLApercu(leve.port, '1:2'), null);
  assert.deepEqual(leve.journal, ['getNodeByIdAsync', 'exportAsync']);
  assert.equal(await exporterLApercu(portSur(null).port, '1:2'), null);
  assert.equal(await exporterLApercu(portSur({ absoluteRenderBounds: null, absoluteBoundingBox: null, exportAsync: async () => new Uint8Array() }).port, '1:2'), null);
  assert.equal(await exporterLApercu(portSur({ absoluteRenderBounds: { x: 0, y: 0, width: 0, height: 10 }, exportAsync: async () => new Uint8Array() }).port, '1:2'), null);
});

test('la boîte d’un calque vient de absoluteBoundingBox ; une boîte absente ne rend rien', () => {
  assert.deepEqual(boiteDe({ absoluteBoundingBox: { x: 12, y: 8, width: 30, height: 20 } }), { x: 12, y: 8, largeur: 30, hauteur: 20 });
  assert.equal(boiteDe({ absoluteBoundingBox: null }), undefined);
  assert.equal(boiteDe({}), undefined);
  assert.equal(boiteDe({ absoluteBoundingBox: { x: Number.NaN, y: 0, width: 1, height: 1 } }), undefined);
});

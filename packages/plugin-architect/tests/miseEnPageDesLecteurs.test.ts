/**
 * La mise en page scalaire d'un même nœud, lue par le relevé et par le moteur au travers de la même acquisition :
 * chaque cas fixe les valeurs en dur que le relevé en tire et ce que le moteur juge exposé. Les attendus
 * sont ceux des lecteurs d'avant l'acquisition commune, sauf le champ qui lève, qui faisait échouer le relevé entier.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { copierLaMiseEnPage } from 'ucm-plugin-socle/src/composant/analyse/acquisition';
import { BINDING_PATTERNS, exposesAnyField } from 'ucm-plugin-socle/src/composant/contract/nodeBindings';
import { lireLeReleve } from '../src/releveDuComposant';
import { atelierDeCalques, portDeTest } from './figmaDeTest';

const MIXTE_FIGMA = Symbol('figma.mixed');
const boite = { x: 0, y: 0, width: 10, height: 10 };
const contour = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];

interface Cas {
  nom: string;
  champs: Record<string, unknown>;
  enDur: string[];
  epaisseur?: number;
  manquees: Array<[string, string]>;
  rayonExpose: boolean;
  paddingXExpose: boolean;
}

const cas: Cas[] = [
  {
    nom: 'auto layout, rayon unique, contour visible',
    champs: { layoutMode: 'HORIZONTAL', paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4, itemSpacing: 6, cornerRadius: 4, strokes: contour, strokeWeight: 2 },
    enDur: ['paddingLeft=8', 'paddingRight=8', 'paddingTop=4', 'paddingBottom=4', 'itemSpacing=6', 'cornerRadius=4', 'strokeWeight=2', 'width=10', 'height=10'],
    epaisseur: 2, manquees: [], rayonExpose: true, paddingXExpose: true,
  },
  {
    nom: 'rayon mixte : les quatre rayons prennent le relais',
    champs: { layoutMode: 'NONE', cornerRadius: MIXTE_FIGMA, topLeftRadius: 1, topRightRadius: 2, bottomLeftRadius: 3, bottomRightRadius: 4, paddingLeft: 8, paddingRight: 8 },
    enDur: ['topLeftRadius=1', 'topRightRadius=2', 'bottomLeftRadius=3', 'bottomRightRadius=4', 'width=10', 'height=10'],
    manquees: [], rayonExpose: true, paddingXExpose: true,
  },
  {
    nom: 'type de nœud sans mise en page : champs absents',
    champs: {},
    enDur: ['width=10', 'height=10'],
    manquees: [], rayonExpose: false, paddingXExpose: false,
  },
  {
    nom: 'valeurs neutres sous auto layout',
    champs: { layoutMode: 'VERTICAL', paddingLeft: 0, paddingRight: 0, itemSpacing: 0, cornerRadius: 0 },
    enDur: ['paddingLeft=0', 'paddingRight=0', 'itemSpacing=0', 'cornerRadius=0', 'width=10', 'height=10'],
    manquees: [], rayonExpose: true, paddingXExpose: true,
  },
  {
    nom: 'contour sans peinture : l’épaisseur reste un champ du layer, pas une valeur en dur',
    champs: { strokes: [], strokeWeight: 1 },
    enDur: ['width=10', 'height=10'],
    epaisseur: 1, manquees: [], rayonExpose: false, paddingXExpose: false,
  },
  {
    nom: 'un champ qui lève devient une manquée, les autres se lisent',
    champs: { layoutMode: 'HORIZONTAL', get paddingLeft(): number { throw new Error('nœud supprimé'); }, paddingRight: 8, paddingTop: 4, paddingBottom: 4, itemSpacing: 6 },
    enDur: ['paddingRight=8', 'paddingTop=4', 'paddingBottom=4', 'itemSpacing=6', 'width=10', 'height=10'],
    manquees: [['paddingLeft', 'nœud supprimé']], rayonExpose: false, paddingXExpose: true,
  },
];

for (const c of cas) {
  test(`relevé et moteur tirent la même mise en page : ${c.nom}`, async () => {
    const a = atelierDeCalques();
    const noeud = a.calque('n', 'FRAME', Object.defineProperties({ absoluteBoundingBox: boite }, Object.getOwnPropertyDescriptors(c.champs)));
    const racine = a.calque('r', 'COMPONENT', { absoluteBoundingBox: boite }, [noeud]);
    const issue = await lireLeReleve(a.port(portDeTest([], []).port), racine);
    assert.equal(issue.statut, 'lu');
    if (issue.statut !== 'lu') return;
    const layer = issue.releve.variants[0].layers.find((candidat) => candidat.id === 'n');
    assert.deepEqual(layer?.valeursEnDur.map((valeur) => `${valeur.champ}=${valeur.valeur}`), c.enDur);
    assert.equal(layer?.strokeWeight, c.epaisseur);
    assert.deepEqual(issue.releve.lecture.manquees.map((manquee) => [manquee.champ, manquee.motif]), c.manquees);

    assert.equal(exposesAnyField(noeud as never, BINDING_PATTERNS.radius), c.rayonExpose);
    assert.equal(exposesAnyField(noeud as never, BINDING_PATTERNS.paddingX), c.paddingXExpose);
  });
}

test('la table copiée est la même pour les deux lecteurs : états, ordre et nombre des lectures', () => {
  const lectures: string[] = [];
  const brut: Record<string, unknown> = {
    layoutMode: 'GRID', itemSpacing: 4, cornerRadius: MIXTE_FIGMA, counterAxisSpacing: null, layoutWrap: 3, paddingLeft: 'x',
    get paddingTop(): number { throw new Error('refus'); },
  };
  const noeud = new Proxy(brut, { get: (cible, cle) => { lectures.push(String(cle)); return Reflect.get(cible, cle); } });
  const table = copierLaMiseEnPage(noeud, ['layoutMode', 'itemSpacing', 'cornerRadius', 'counterAxisSpacing', 'layoutWrap', 'paddingLeft', 'paddingTop', 'paddingRight']);
  assert.deepEqual(lectures, ['layoutMode', 'itemSpacing', 'cornerRadius', 'counterAxisSpacing', 'layoutWrap', 'paddingLeft', 'paddingTop', 'paddingRight']);
  assert.deepEqual(table, {
    layoutMode: { etat: 'acquis', valeur: 'GRID' },
    itemSpacing: { etat: 'acquis', valeur: 4 },
    cornerRadius: { etat: 'mixte' },
    counterAxisSpacing: { etat: 'acquis', valeur: null },
    layoutWrap: { etat: 'mixte' },
    paddingLeft: { etat: 'mixte' },
    paddingTop: { etat: 'refuse', raison: 'leve', message: 'refus' },
    paddingRight: { etat: 'refuse', raison: 'absent' },
  });
});

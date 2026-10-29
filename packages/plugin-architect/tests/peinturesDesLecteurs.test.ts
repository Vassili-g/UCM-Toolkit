/**
 * Les peintures (`fills`, `strokes`) d'un même nœud, lues par le relevé d'Architect et par le moteur du socle au travers
 * de la même acquisition. Chaque cas fixe ce que le relevé en tire (peintures, liaisons, manquées, contour visible) et
 * ce que le moteur en tire (couleurs liées, peintures libres, propriétés non portées). Les attendus sont ceux des
 * lecteurs d'avant l'acquisition commune, sauf le refus d'une lecture : il faisait échouer le relevé entier, et il fait
 * maintenant une manquée.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { copierLesPeintures, lireLesPeintures } from 'ucm-plugin-socle/src/composant/analyse/acquisition';
import { getSlotTokens } from 'ucm-plugin-socle/src/composant/contract/extractVariantTokens';
import { phraseDe } from 'ucm-plugin-socle/src/composant/contract/localisation';
import { dansUnePorteeDAnalyse } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';
import { unsupportedPropertyWarnings } from 'ucm-plugin-socle/src/composant/contract/unsupportedProperties';
import { lireLeReleve } from '../src/releveDuComposant';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const MIXTE_FIGMA = Symbol('figma.mixed');
const boite = { x: 0, y: 0, width: 10, height: 10 };
const noir = { r: 0, g: 0, b: 0, a: 1 };
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const solide = (extra: Record<string, unknown> = {}) => ({ type: 'SOLID', color: noir, ...extra });

interface Cas {
  nom: string;
  type?: string;
  fills?: () => unknown;
  strokes?: () => unknown;
  strokeWeight?: number;
  segments?: unknown[];
}

const cas: Cas[] = [
  { nom: 'SOLID visible liée', fills: () => [solide({ visible: true, opacity: 1, boundVariables: { color: alias('fond') } })], strokes: () => [], strokeWeight: 1 },
  { nom: 'SOLID visible non liée', fills: () => [solide()], strokes: () => [], strokeWeight: 1 },
  { nom: 'SOLID masquée et liée', fills: () => [solide({ visible: false, boundVariables: { color: alias('fond') } })], strokes: () => [], strokeWeight: 1 },
  { nom: 'SOLID transparente et liée', fills: () => [solide({ opacity: 0, boundVariables: { color: alias('fond') } })], strokes: () => [], strokeWeight: 1 },
  {
    nom: 'dégradé dont un arrêt est lié',
    fills: () => [{ type: 'GRADIENT_LINEAR', opacity: 0.8, blendMode: 'MULTIPLY', gradientStops: [{ position: 0, color: noir, boundVariables: { color: alias('debut') } }, { position: 1, color: noir }] }],
    strokes: () => [],
    strokeWeight: 1,
  },
  { nom: 'image', fills: () => [{ type: 'IMAGE', visible: true }], strokes: () => [], strokeWeight: 1 },
  { nom: 'deux peintures, la seconde liée', fills: () => [solide(), solide({ boundVariables: { color: alias('fond') } })], strokes: () => [], strokeWeight: 1 },
  {
    nom: 'fills mixte sur un texte à plages',
    type: 'TEXT',
    fills: () => MIXTE_FIGMA,
    strokes: () => [],
    segments: [{ start: 0, end: 3, fills: [solide()] }, { start: 3, end: 7, fills: MIXTE_FIGMA }],
  },
  {
    nom: 'fills qui lève',
    fills: () => { throw new Error('nœud supprimé'); },
    strokes: () => [],
    strokeWeight: 1,
  },
  { nom: 'strokes vides, épaisseur positive', fills: () => [], strokes: () => [], strokeWeight: 2 },
  { nom: 'strokes visibles et libres', fills: () => [], strokes: () => [solide()], strokeWeight: 2 },
  { nom: 'strokes visibles et liés', fills: () => [], strokes: () => [solide({ boundVariables: { color: alias('trait') } })], strokeWeight: 2 },
  { nom: 'strokes visibles, épaisseur nulle', fills: () => [], strokes: () => [solide()], strokeWeight: 0 },
  { nom: 'strokes masqués', fills: () => [], strokes: () => [solide({ visible: false })], strokeWeight: 2 },
  { nom: 'strokes mixtes', fills: () => [], strokes: () => MIXTE_FIGMA, strokeWeight: 2 },
  { nom: 'nœud sans peinture', strokeWeight: 1 },
];

const variables = () => portDeTest(
  [collectionFigma('c', 'Composants', ['Valeur'], ['fond', 'debut', 'trait'])],
  ['fond', 'debut', 'trait'].map((id) => variableFigma(id, 'c', `couleur/${id}`, 'COLOR', { 'c:Valeur': noir })),
).port;

/** Les accesseurs de `fills` et `strokes`, qui comptent chaque accès natif. */
function champsComptes(c: Cas, lectures: { fills: number; strokes: number }): Record<string, unknown> {
  const champs: Record<string, unknown> = { absoluteBoundingBox: boite };
  if (c.strokeWeight !== undefined) champs.strokeWeight = c.strokeWeight;
  if (c.segments) champs.getStyledTextSegments = () => c.segments;
  if (c.fills) Object.defineProperty(champs, 'fills', { enumerable: true, get() { lectures.fills += 1; return c.fills?.(); } });
  if (c.strokes) Object.defineProperty(champs, 'strokes', { enumerable: true, get() { lectures.strokes += 1; return c.strokes?.(); } });
  return champs;
}

/**
 * Ce que chaque lecteur rend, avec le nombre d'accès natifs à `fills` et `strokes`. Avant l'acquisition commune, le relevé
 * lisait `fills` deux fois et `strokes` trois fois, le moteur deux fois chacun ; un `fills` qui levait faisait échouer
 * le relevé entier.
 */
const attendus = new Map<string, { releve: unknown; moteur: unknown }>([
  ['SOLID visible liée', {
    releve: { peintures: ['fills0:SOLID:1:NORMAL#0001'], liaisons: ['fills0=couleur/fond'], enDur: [], epaisseur: 1, manquees: [], lectures: { fills: 1, strokes: 1 } },
    moteur: { paints: ['couleur.fond:background'], strokes: [], libres: [], nonPortees: [], lectures: { fills: 1, strokes: 1 } },
  }],
  ['SOLID visible non liée', {
    releve: { peintures: ['fills0:SOLID:1:NORMAL#0001'], liaisons: [], enDur: [], epaisseur: 1, manquees: [], lectures: { fills: 1, strokes: 1 } },
    moteur: { paints: [], strokes: [], libres: ['Layer « Calque » : son fill n’est relié à aucune variable Fi'], nonPortees: [], lectures: { fills: 1, strokes: 1 } },
  }],
  ['SOLID masquée et liée', {
    releve: { peintures: ['fills0:SOLID:masquee:1:NORMAL#0001'], liaisons: ['fills0=couleur/fond'], enDur: [], epaisseur: 1, manquees: [], lectures: { fills: 1, strokes: 1 } },
    moteur: { paints: [], strokes: [], libres: [], nonPortees: [], lectures: { fills: 1, strokes: 1 } },
  }],
  ['SOLID transparente et liée', {
    releve: { peintures: ['fills0:SOLID:masquee:0:NORMAL#0001'], liaisons: ['fills0=couleur/fond'], enDur: [], epaisseur: 1, manquees: [], lectures: { fills: 1, strokes: 1 } },
    moteur: { paints: [], strokes: [], libres: [], nonPortees: [], lectures: { fills: 1, strokes: 1 } },
  }],
  ['dégradé dont un arrêt est lié', {
    releve: { peintures: ['fills0:GRADIENT_LINEAR:0.8:MULTIPLY'], liaisons: ['fills.gradientStops[0].color0=couleur/debut'], enDur: [], epaisseur: 1, manquees: [], lectures: { fills: 1, strokes: 1 } },
    moteur: { paints: [], strokes: [], libres: [], nonPortees: ['Layer « Calque », fill : ce réglage n’est pas pris en charge'], lectures: { fills: 1, strokes: 1 } },
  }],
  ['image', {
    releve: { peintures: ['fills0:IMAGE:1:NORMAL'], liaisons: [], enDur: [], epaisseur: 1, manquees: [], lectures: { fills: 1, strokes: 1 } },
    moteur: { paints: [], strokes: [], libres: [], nonPortees: ['Layer « Calque », fill : ce réglage n’est pas pris en charge'], lectures: { fills: 1, strokes: 1 } },
  }],
  ['deux peintures, la seconde liée', {
    releve: { peintures: ['fills0:SOLID:1:NORMAL#0001', 'fills1:SOLID:1:NORMAL#0001'], liaisons: ['fills1=couleur/fond'], enDur: [], epaisseur: 1, manquees: [], lectures: { fills: 1, strokes: 1 } },
    moteur: { paints: ['couleur.fond:background'], strokes: [], libres: ['Layer « Calque » : son fill n’est relié à aucune variable Fi'], nonPortees: [], lectures: { fills: 1, strokes: 1 } },
  }],
  ['fills mixte sur un texte à plages', {
    releve: { peintures: [], liaisons: [], enDur: [], plages: ['0-3:1p', '3-7:0p'], manquees: ['n.fills:peintures mixtes ou illisibles', 'n.fills:peintures mixtes ou illisibles'], lectures: { fills: 1, strokes: 1 } },
    moteur: { paints: [], strokes: [], libres: [], nonPortees: ['Layer « Calque », fill : ce réglage n’est pas pris en charge'], lectures: { fills: 1, strokes: 1 } },
  }],
  ['fills qui lève', {
    releve: { peintures: [], liaisons: [], enDur: [], epaisseur: 1, manquees: ['n.fills:peintures mixtes ou illisibles'], lectures: { fills: 1, strokes: 1 } },
    moteur: { echec: 'nœud supprimé', lectures: { fills: 1, strokes: 0 } },
  }],
  ['strokes vides, épaisseur positive', {
    releve: { peintures: [], liaisons: [], enDur: [], epaisseur: 2, manquees: [], lectures: { fills: 1, strokes: 1 } },
    moteur: { paints: [], strokes: [], libres: [], nonPortees: [], lectures: { fills: 1, strokes: 1 } },
  }],
  ['strokes visibles et libres', {
    releve: { peintures: ['strokes0:SOLID:1:NORMAL#0001'], liaisons: [], enDur: ['strokeWeight'], epaisseur: 2, manquees: [], lectures: { fills: 1, strokes: 1 } },
    moteur: { paints: [], strokes: [], libres: ['Layer « Calque » : son stroke n’est relié à aucune variable '], nonPortees: [], lectures: { fills: 1, strokes: 1 } },
  }],
  ['strokes visibles et liés', {
    releve: { peintures: ['strokes0:SOLID:1:NORMAL#0001'], liaisons: ['strokes0=couleur/trait'], enDur: ['strokeWeight'], epaisseur: 2, manquees: [], lectures: { fills: 1, strokes: 1 } },
    moteur: { paints: [], strokes: ['couleur.trait:border'], libres: ['Layer « Calque » : l’alignement du stroke est illisible. Le ', "Layer « Calque », stroke weight : aucune variable Figma n'es"], nonPortees: [], lectures: { fills: 1, strokes: 1 } },
  }],
  ['strokes visibles, épaisseur nulle', {
    releve: { peintures: ['strokes0:SOLID:1:NORMAL#0001'], liaisons: [], enDur: ['strokeWeight'], epaisseur: 0, manquees: [], lectures: { fills: 1, strokes: 1 } },
    moteur: { paints: [], strokes: [], libres: [], nonPortees: [], lectures: { fills: 1, strokes: 1 } },
  }],
  ['strokes masqués', {
    releve: { peintures: ['strokes0:SOLID:masquee:1:NORMAL#0001'], liaisons: [], enDur: [], epaisseur: 2, manquees: [], lectures: { fills: 1, strokes: 1 } },
    moteur: { paints: [], strokes: [], libres: [], nonPortees: [], lectures: { fills: 1, strokes: 1 } },
  }],
  ['strokes mixtes', {
    releve: { peintures: [], liaisons: [], enDur: [], epaisseur: 2, manquees: ['n.strokes:peintures mixtes ou illisibles'], lectures: { fills: 1, strokes: 1 } },
    moteur: { paints: [], strokes: [], libres: [], nonPortees: ['Layer « Calque », stroke : ce réglage n’est pas pris en char'], lectures: { fills: 1, strokes: 1 } },
  }],
  ['nœud sans peinture', {
    releve: { peintures: [], liaisons: [], enDur: [], epaisseur: 1, manquees: [], lectures: { fills: 0, strokes: 0 } },
    moteur: { paints: [], strokes: [], libres: [], nonPortees: [], lectures: { fills: 0, strokes: 0 } },
  }],
]);

/** Les attendus sont du JSON : une clé `undefined` s'y lit comme une clé absente. */
const enJson = (valeur: unknown): unknown => JSON.parse(JSON.stringify(valeur));

async function leReleve(c: Cas) {
  const lectures = { fills: 0, strokes: 0 };
  const a = atelierDeCalques();
  const noeud = a.calque('n', c.type ?? 'FRAME', champsComptes(c, lectures));
  const racine = a.calque('r', 'COMPONENT', { absoluteBoundingBox: boite }, [noeud]);
  let issue;
  try {
    issue = await lireLeReleve(a.port(variables()), racine);
  } catch (erreur) {
    return { echec: (erreur as Error).message, lectures };
  }
  if (issue.statut !== 'lu') return { echec: issue.statut, lectures };
  const layer = issue.releve.variants[0].layers.find((candidat) => candidat.id === 'n');
  return {
    peintures: layer?.peintures.map((p) => `${p.champ}${p.indice}:${p.type}${p.visible ? '' : ':masquee'}:${p.opacite}:${p.blendMode}${p.couleur ? `#${p.couleur.r}${p.couleur.g}${p.couleur.b}${p.couleur.a}` : ''}`),
    liaisons: layer?.liaisons.map((l) => `${l.champ}${l.indice ?? ''}=${l.variable.nom}`),
    enDur: layer?.valeursEnDur.map((v) => v.champ).filter((champ) => champ === 'strokeWeight'),
    epaisseur: layer?.strokeWeight,
    plages: layer?.texte?.plages.map((p) => `${p.debut}-${p.fin}:${p.peintures.length}p`),
    manquees: issue.releve.lecture.manquees.map((m) => `${m.layer}.${m.champ}:${m.motif}`),
    lectures,
  };
}

async function leMoteur(c: Cas) {
  const lectures = { fills: 0, strokes: 0 };
  const noeud = Object.defineProperties(
    { id: 'n', type: c.type ?? 'RECTANGLE', name: 'Calque', boundVariables: {}, findAll: () => [] },
    Object.getOwnPropertyDescriptors(champsComptes(c, lectures)),
  ) as unknown as ComponentNode;
  const resolver = { resolve: async (liaison: VariableAlias | null | undefined) => (liaison ? `couleur.${liaison.id}` : null) };
  const warnings: string[] = [];
  try {
    return await dansUnePorteeDAnalyse({}, async () => {
      const couleurs = await getSlotTokens(noeud, resolver, warnings);
      const nonPortees = unsupportedPropertyWarnings(noeud).map(phraseDe).map((phrase) => phrase.slice(0, 60));
      return {
        paints: couleurs.paints.map((p) => `${p.token}:${p.role}`),
        strokes: couleurs.strokes.map((p) => `${p.token}:${p.role}`),
        libres: warnings.map((phrase) => phrase.slice(0, 60)),
        nonPortees,
        lectures,
      };
    });
  } catch (erreur) {
    return { echec: (erreur as Error).message, lectures };
  }
}

for (const c of cas) {
  test(`relevé et moteur tirent les mêmes peintures et lisent chaque champ une fois : ${c.nom}`, async () => {
    const attendu = attendus.get(c.nom);
    assert.deepEqual(enJson(await leReleve(c)), attendu?.releve);
    assert.deepEqual(enJson(await leMoteur(c)), attendu?.moteur);
  });
}

test('hors d’une portée d’analyse, le moteur relit les peintures à chaque étape', async () => {
  const lectures = { fills: 0, strokes: 0 };
  const noeud = Object.defineProperties(
    { id: 'n', type: 'RECTANGLE', name: 'Calque', boundVariables: {}, findAll: () => [] },
    Object.getOwnPropertyDescriptors(champsComptes(cas[0], lectures)),
  ) as unknown as ComponentNode;
  await getSlotTokens(noeud, { resolve: async () => null }, []);
  unsupportedPropertyWarnings(noeud);
  assert.deepEqual(lectures, { fills: 2, strokes: 2 });
});

test('la copie garde les sous-champs lus, rend mixte une valeur sans forme de liste et refuse une propriété absente', () => {
  assert.deepEqual(copierLesPeintures(undefined), { etat: 'refuse', raison: 'absent' });
  assert.deepEqual(copierLesPeintures(MIXTE_FIGMA), { etat: 'mixte' });
  assert.deepEqual(copierLesPeintures('x'), { etat: 'mixte' });
  assert.deepEqual(copierLesPeintures([solide(), null]), { etat: 'mixte' }, 'une entrée qui n’est pas une peinture rend la liste mixte');
  assert.deepEqual(copierLesPeintures([{ type: 'SOLID', visible: false, color: { r: 1, g: 0, b: 0 }, boundVariables: { color: alias('a') }, nom: 'ignoré' }]), {
    etat: 'acquis',
    valeur: [{ type: 'SOLID', visible: false, color: { r: 1, g: 0, b: 0 }, boundVariables: { color: alias('a') } }],
  });
  assert.deepEqual(copierLesPeintures([{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: noir, boundVariables: { color: [alias('b'), alias('c')] } }] }]), {
    etat: 'acquis',
    valeur: [{ type: 'GRADIENT_LINEAR', gradientStops: [{ position: 0, color: noir, boundVariables: { color: alias('b') } }] }],
  });
});

test('un champ qui lève est refusé avec son message, et chaque lecture se compte avant l’accès', () => {
  let comptees = 0;
  const noeud = { get fills(): unknown { throw new Error('nœud supprimé'); }, strokes: [] };
  assert.deepEqual(lireLesPeintures(noeud, 'fills', () => { comptees += 1; }), { etat: 'refuse', raison: 'leve', message: 'nœud supprimé' });
  assert.deepEqual(lireLesPeintures(noeud, 'strokes', () => { comptees += 1; }), { etat: 'acquis', valeur: [] });
  assert.equal(comptees, 2);
});

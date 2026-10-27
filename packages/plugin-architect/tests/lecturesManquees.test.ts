/** Une lecture manquée ne devient jamais un constat : le relevé garde la liaison illisible, et l'analyse se dit partielle. */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { CatalogueDeReference, ReleveDeComposant } from '@ucm-kit/core/controles';
import type { ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';

import type { PluginMessage } from '../src/messages';
import { lireLeReleve } from '../src/releveDuComposant';
import { reinitialiserLAnalyse, traiterAvec, type Lecteurs, type SujetAAnalyser } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const boite = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

/** Un composant seul : une racine à padding lié, un rectangle à fond lié ; `avecBoite` retire la boîte de la racine. */
function composant(avecBoite = true) {
  const a = atelierDeCalques();
  const fond = a.calque('fond', 'RECTANGLE', {
    absoluteBoundingBox: boite(0, 0, 10, 10),
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: alias('absente') } }],
  });
  const racine = a.calque('racine', 'COMPONENT', {
    name: 'Button',
    ...(avecBoite ? { absoluteBoundingBox: boite(0, 0, 120, 40) } : {}),
    layoutMode: 'HORIZONTAL',
    paddingLeft: 8,
    paddingRight: 8,
    boundVariables: { paddingLeft: alias('absente') },
  }, [fond]);
  return { a, racine };
}

const toutesLesLiaisons = (releve: ReleveDeComposant) => releve.variants.flatMap((v) => v.layers.flatMap((l) => l.liaisons.map((liaison) => ({ layer: l.id, liaison }))));

for (const [motif, port] of [
  ['une variable que Figma ne rend pas', () => portDeTest([], [])],
  ['une variable dont la lecture lève', () => portDeTest([], [], [], [], { refusees: new Set(['absente']) })],
] as const) {
  test(`${motif} : la liaison reste dans le relevé, illisible, avec sa lecture manquée`, async () => {
    const { a, racine } = composant();
    const issue = await lireLeReleve(a.port(port().port), racine);
    assert.equal(issue.statut, 'lu');
    if (issue.statut !== 'lu') return;
    const { releve } = issue;

    assert.deepEqual(
      toutesLesLiaisons(releve).map(({ layer, liaison }) => [layer, liaison.champ, liaison.indice, liaison.illisible, liaison.variable]),
      [
        ['racine', 'paddingLeft', undefined, true, { id: 'absente', cle: '', nom: '', collection: '', distante: false }],
        ['fond', 'fills', 0, true, { id: 'absente', cle: '', nom: '', collection: '', distante: false }],
      ],
    );
    assert.deepEqual(
      releve.lecture.manquees.map(({ layer, champ }) => [layer, champ]),
      [['racine', 'paddingLeft'], ['fond', 'fills[0]']],
    );
    assert.ok(releve.lecture.manquees.every((m) => m.motif.length > 0));
  });
}

test('un champ lié par une variable illisible n’est pas une valeur en dur', async () => {
  const { a, racine } = composant();
  const issue = await lireLeReleve(a.port(portDeTest([], []).port), racine);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.deepEqual(issue.releve.variants[0].layers[0].valeursEnDur.map((v) => v.champ), ['paddingRight', 'width', 'height']);
});

test('une boîte illisible est une lecture manquée, et ne donne ni dimensions de 0 × 0 en dur ni largeur en dur', async () => {
  const { a, racine } = composant(false);
  const issue = await lireLeReleve(a.port(portDeTest([], []).port), racine);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  const [layer] = issue.releve.variants[0].layers;
  assert.deepEqual(issue.releve.lecture.manquees.filter((m) => m.champ === 'dimensions'), [{ layer: 'racine', champ: 'dimensions', motif: 'boîte illisible' }]);
  assert.deepEqual(layer.dimensions, { x: 0, y: 0, largeur: 0, hauteur: 0 });
  assert.deepEqual(layer.valeursEnDur.map((v) => v.champ), ['paddingRight']);
});

test('une variable lue reste une liaison ordinaire, sans lecture manquée', async () => {
  const { a, racine } = composant();
  const variables = portDeTest(
    [collectionFigma('c', 'Composants', ['Valeur'], ['absente'])],
    [variableFigma('absente', 'c', 'carte/fond', 'FLOAT', { 'c:Valeur': 8 })],
  );
  const issue = await lireLeReleve(a.port(variables.port), racine);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.deepEqual(issue.releve.lecture.manquees, []);
  assert.deepEqual(toutesLesLiaisons(issue.releve).map(({ liaison }) => [liaison.illisible, liaison.variable.nom]), [[undefined, 'carte/fond'], [undefined, 'carte/fond']]);
});

/* ---------- Analyse ---------- */

const catalogueVide: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };

function releveDe(lecture: Partial<ReleveDeComposant['lecture']>): ReleveDeComposant {
  return {
    version: 1,
    jeu: { cle: 'Alert', id: 'jeu-Alert', nom: 'Alert' },
    proprietes: [],
    variants: [{ id: 'v-Alert', nom: 'Alert défaut', valeurs: {}, layers: [], modesEffectifs: {} }],
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [], ...lecture },
    espaceDeCouleur: 'srgb',
  };
}

async function statutAvec(lecture: Partial<ReleveDeComposant['lecture']>) {
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: { root: { getSharedPluginData: () => '' } } as unknown as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} };
  const lecteurs: Lecteurs = {
    async sujet() {
      return { cle: 'Alert', noeud: { id: 'jeu-Alert' } as never, noeuds: ['jeu-Alert', 'v-Alert'] } satisfies SujetAAnalyser;
    },
    async releve() {
      return { statut: 'lu', releve: releveDe(lecture) };
    },
    async catalogue() {
      return catalogueVide;
    },
    moteur: async (): Promise<ResultatSansPublication> => ({ etat: 'calculee', interne: { warnings: [], parties: new Map(), localisations: new Map(), couverture: { etat: 'complete' } } as unknown as ResultatInterne }),
  };
  await traiterAvec(lecteurs)({ type: 'analyser' }, contexte);
  const analyse = envoyes.find((m) => m.type === 'analyse');
  return analyse?.type === 'analyse' ? analyse : null;
}

beforeEach(() => reinitialiserLAnalyse());

test('l’analyse d’un relevé aux lectures manquées est partielle, et se dit complète sans elles', async () => {
  const partielle = await statutAvec({ manquees: [{ layer: 'racine', champ: 'fills[0]', motif: 'variable illisible' }] });
  assert.equal(partielle?.statut, 'partielle');
  assert.equal(partielle?.lecture?.manquees.length, 1);

  reinitialiserLAnalyse();
  assert.equal((await statutAvec({}))?.statut, 'complete');
});

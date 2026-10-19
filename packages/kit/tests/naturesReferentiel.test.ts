import assert from 'node:assert/strict';
import test from 'node:test';
import { CRANS, naturesDesNoms, type NatureDeSegment, type NomLu } from '../src/referentiel/index.js';

const COLLECTIONS = ['components', 'primitives', 'color-utilities', 'color-brands', 'theme', 'layouts'];
const idDeCollection = (nom: string): string => JSON.stringify(['collection', nom]);

function collection(nom: string): NomLu {
  return { id: idDeCollection(nom), categorie: 'collections', portee: 'document', nom };
}

let compteur = 0;
function variable(nomDeCollection: string, nom: string, palette?: string): NomLu {
  return { id: `variable-${++compteur}`, categorie: 'variables', portee: idDeCollection(nomDeCollection), nom, ...(palette ? { palette } : {}) };
}

function rampe(nomDeCollection: string, prefixe: string, crans: readonly number[] = CRANS): NomLu[] {
  return crans.map((cran) => variable(nomDeCollection, `${prefixe}/${cran}`));
}

const COMPOSANTS = [
  'Button/Colors/Primary/Contained/Default/Background', 'Button/Sizes/Medium/Padding-x', 'Alert/Colors/Info/Standard/Background',
  'Icons/Sizes/xl', 'TileLink/Colors/Info/Default/Background', 'StressTest/Info/Base/Sizes/Gap', 'StressTest/Info/Head/Colors/Text',
  'StressTest/Info/TilesGrid/Colors/Tile', 'StressTest/Info/UserInput/Colors/Background', 'StressTest/Info/TextColumns/Colors/Title',
  'StressTest/Info/Divider/Colors/Background', 'StressTest/Info/ScaleWrap/Colors/Scale-1', 'StressTest/Info/TileLinksWrap/Sizes/Gap-x',
  'StressTest/Warning/Badge/Colors/Background',
];

/** Un extrait du fichier Playground : les noms et les collections de l'export du vocabulaire. */
function extraitDuPlayground(): NomLu[] {
  return [
    ...COLLECTIONS.map(collection),
    ...COMPOSANTS.map((nom) => variable('components', nom)),
    ...['light', 'dark'].flatMap((mode) => rampe('primitives', `colors/Titanium/${mode}`)),
    variable('primitives', 'colors/Titanium/white'),
    ...rampe('primitives', 'colors/Poppy/soft/light'),
    ...rampe('primitives', 'colors/Terracota/light'),
    variable('primitives', 'fontsize/base'),
    variable('primitives', 'lineheight/base'),
    ...rampe('color-brands', 'primary/light'),
    ...rampe('color-utilities', 'success/vivid/light'),
    ...rampe('theme', 'secondary/scale'),
    variable('theme', 'secondary/page/divider'),
  ];
}

/** Les natures d'un nom, sous la forme `segment:nature` pour les seuls segments qui en ont une. */
function natures(noms: readonly NomLu[], nom: string, options?: { readonly ordinaires?: ReadonlySet<string> }): string[] {
  const trouve = noms.find((candidat) => candidat.nom === nom);
  assert.ok(trouve, `${nom} n'est pas dans l'extrait`);
  const lues = naturesDesNoms(noms, options).get(trouve.id);
  assert.ok(lues, `${nom} n'a pas de natures`);
  const segments = nom.split('/');
  assert.equal(lues.length, segments.length, 'un tableau aligné sur les segments');
  return segments.flatMap((segment, rang) => lues[rang] ? [`${segment}:${lues[rang]}`] : []);
}

test('les composants, les éléments et les palettes du Playground sont reconnus', () => {
  const noms = extraitDuPlayground();
  const attendus: Record<string, string[]> = {
    'Button/Colors/Primary/Contained/Default/Background': ['Button:composant'],
    'Button/Sizes/Medium/Padding-x': ['Button:composant'],
    'Alert/Colors/Info/Standard/Background': ['Alert:composant'],
    'TileLink/Colors/Info/Default/Background': ['TileLink:composant'],
    'StressTest/Info/Head/Colors/Text': ['StressTest:composant', 'Head:element'],
    'StressTest/Info/TilesGrid/Colors/Tile': ['StressTest:composant', 'TilesGrid:element'],
    'StressTest/Info/UserInput/Colors/Background': ['StressTest:composant', 'UserInput:element'],
    'StressTest/Info/TextColumns/Colors/Title': ['StressTest:composant', 'TextColumns:element'],
    'StressTest/Info/ScaleWrap/Colors/Scale-1': ['StressTest:composant', 'ScaleWrap:element'],
    'StressTest/Info/TileLinksWrap/Sizes/Gap-x': ['StressTest:composant', 'TileLinksWrap:element'],
    'StressTest/Warning/Badge/Colors/Background': ['StressTest:composant', 'Badge:element'],
    'colors/Titanium/light/50': ['Titanium:palette'],
    'colors/Titanium/dark/950': ['Titanium:palette'],
    'colors/Titanium/white': ['Titanium:palette'],
    'colors/Poppy/soft/light/500': ['Poppy:palette'],
    'colors/Terracota/light/50': ['Terracota:palette'],
  };
  for (const [nom, attendu] of Object.entries(attendus)) assert.deepEqual(natures(noms, nom), attendu, nom);
});

test('un mot du référentiel, un mot employé ailleurs et un rôle de palette n’ont pas de nature', () => {
  const noms = extraitDuPlayground();
  assert.deepEqual(natures(noms, 'Icons/Sizes/xl'), [], 'Icons est une forme de icon');
  assert.deepEqual(natures(noms, 'StressTest/Info/Base/Sizes/Gap'), ['StressTest:composant'], 'Base est connu et employé dans fontsize/base');
  assert.deepEqual(natures(noms, 'StressTest/Info/Divider/Colors/Background'), ['StressTest:composant'], 'Divider est connu');
  assert.deepEqual(natures(noms, 'primary/light/500'), [], 'primary est un rôle');
  assert.deepEqual(natures(noms, 'success/vivid/light/400'), [], 'success est un statut');
  assert.deepEqual(natures(noms, 'secondary/scale/500'), [], 'scale n’est pas une palette');
  assert.deepEqual(natures(noms, 'secondary/page/divider'), []);
  assert.deepEqual(natures(noms, 'fontsize/base'), []);
  assert.deepEqual(natures(noms, 'lineheight/base'), []);
});

test('un nom de collection n’a aucune nature', () => {
  const noms = extraitDuPlayground();
  const lues = naturesDesNoms(noms);
  for (const nom of noms.filter((candidat) => candidat.categorie === 'collections')) {
    assert.deepEqual(lues.get(nom.id), [null], nom.nom);
  }
});

test('un mot employé aussi à une place sans nature perd la sienne', () => {
  const noms = [...extraitDuPlayground(), variable('components', 'Poppy/Sizes/Medium/Padding-x'), variable('primitives', 'Poppy')];
  assert.deepEqual(natures(noms, 'colors/Poppy/soft/light/500'), []);
  assert.deepEqual(natures(noms, 'Poppy/Sizes/Medium/Padding-x'), []);
  assert.deepEqual(natures(noms, 'Button/Sizes/Medium/Padding-x'), ['Button:composant']);
});

test('une palette demande cinq crans différents, sauf si ses variables portent un identifiant de palette', () => {
  const courte = rampe('primitives', 'colors/Mini/light', [50, 100, 200]);
  assert.deepEqual(natures(courte, 'colors/Mini/light/50'), [], 'trois crans');

  const quatre = [...rampe('primitives', 'colors/Quad/light', [50, 100, 200, 300]), ...rampe('primitives', 'colors/Quad/dark', [50, 100, 200, 300])];
  assert.deepEqual(natures(quatre, 'colors/Quad/light/50'), [], 'quatre crans différents, répétés dans deux modes');

  const cinq = rampe('primitives', 'colors/Cinq/light', [50, 100, 200, 300, 400]);
  assert.deepEqual(natures(cinq, 'colors/Cinq/light/50'), ['Cinq:palette']);

  const declaree = [variable('primitives', 'colors/Mini/light/50', 'mini'), ...rampe('primitives', 'colors/Mini/light', [100, 200])];
  assert.deepEqual(natures(declaree, 'colors/Mini/light/50'), ['Mini:palette']);
  assert.deepEqual(natures(declaree, 'colors/Mini/light/100'), ['Mini:palette'], 'le chemin est celui de la variable déclarée');
});

test('deux collections qui partagent un chemin ne mêlent pas leurs crans', () => {
  const noms = [...rampe('primitives', 'colors/Mix/light', [50, 100, 200]), ...rampe('theme', 'colors/Mix/light', [300, 400, 500])];
  assert.deepEqual(natures(noms, 'colors/Mix/light/50'), []);
});

test('une clé de ordinaires retire la nature, sous sa forme en minuscules, jointe par des tirets ou soudée', () => {
  const noms = extraitDuPlayground();
  const nom = 'StressTest/Info/Head/Colors/Text';
  assert.deepEqual(natures(noms, nom, { ordinaires: new Set(['stress-test']) }), ['Head:element']);
  assert.deepEqual(natures(noms, nom, { ordinaires: new Set(['stresstest']) }), ['Head:element']);
  assert.deepEqual(natures(noms, nom, { ordinaires: new Set(['head']) }), ['StressTest:composant']);
  assert.deepEqual(natures(noms, nom, { ordinaires: new Set(['autre']) }), ['StressTest:composant', 'Head:element']);
  assert.deepEqual(natures(noms, 'Button/Sizes/Medium/Padding-x', { ordinaires: new Set(['stress-test']) }), ['Button:composant']);
});

test('sans collection reconnue, seule la suite d’un groupe de propriétés désigne un composant', () => {
  const noms = [collection('Divers'), variable('Divers', 'Menu/Colors/Text'), variable('Divers', 'Autre/Taille/Gap')];
  assert.deepEqual(natures(noms, 'Menu/Colors/Text'), ['Menu:composant']);
  assert.deepEqual(natures(noms, 'Autre/Taille/Gap'), []);
});

test('une variable sans groupe n’a aucune nature, même dans la collection components', () => {
  const noms = [collection('Components'), variable('Components', 'Gap'), variable('Components', 'Widget/Medium')];
  assert.deepEqual(natures(noms, 'Gap'), []);
  assert.deepEqual(natures(noms, 'Widget/Medium'), ['Widget:composant']);
});

test('le calcul reste linéaire sur un fichier de plusieurs milliers de variables', () => {
  const noms = [collection('components'), collection('primitives')];
  for (let i = 0; i < 4000; i++) noms.push(variable('components', `Composant${i}/Colors/Etat/Background`));
  for (let i = 0; i < 400; i++) noms.push(...rampe('primitives', `colors/Palette${i}/light`));
  const debut = Date.now();
  const lues = naturesDesNoms(noms);
  assert.ok(Date.now() - debut < 2000, 'plusieurs milliers de noms en moins de deux secondes');
  const premier = noms.find((nom) => nom.nom === 'Composant7/Colors/Etat/Background')!;
  assert.deepEqual(lues.get(premier.id), ['composant' satisfies NatureDeSegment, null, null, null]);
  const palette = noms.find((nom) => nom.nom === 'colors/Palette7/light/50')!;
  assert.deepEqual(lues.get(palette.id), [null, 'palette', null, null]);
});

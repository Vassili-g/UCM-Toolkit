/**
 * Tests du parcours des calques qui peuvent participer au rendu.
 *
 * La visibilité locale ne suffit pas : une prop ou une variable peut rendre
 * un calque visible, tandis qu'un parent statiquement masqué exclut tout son
 * sous-arbre.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { contientUneInstanceRendue, getAllNodes, getAllNodesParEtapes } from 'ucm-plugin-socle/src/composant/contract/exportableNodes';
import { localisationsDe } from 'ucm-plugin-socle/src/composant/contract/localisation';
import { abandonnerLaMesure, fermerLaMesure, ouvrirLaMesure } from 'ucm-plugin-socle/src/composant/contract/mesure';
import { dansUnePorteeDAnalyse } from 'ucm-plugin-socle/src/composant/contract/porteeDAnalyse';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id }) as VariableAlias;

test('un parcours profond lit les parents un nombre linéaire de fois', () => {
  let lectures = 0;
  const descendants: SceneNode[] = [];
  const root = { id: 'root', type: 'COMPONENT', visible: true,
    findAll: () => descendants } as unknown as ComponentNode;
  let parent: SceneNode = root;
  for (let index = 0; index < 2000; index += 1) {
    const ancetre = parent;
    parent = { id: String(index), type: 'FRAME', visible: index !== 1999,
      get parent() { lectures += 1; return ancetre; } } as unknown as SceneNode;
    descendants.push(parent);
  }
  assert.deepEqual(getAllNodes(root), [root, ...descendants.slice(0, -1)]);
  assert.ok(lectures <= descendants.length * 3, `${lectures} lectures de parent`);
});

test('le masque extérieur garde le diagnostic et une dépendance masque ses internes', () => {
  const root = tree('Root', [{ type: 'FRAME', name: 'Masque', visible: false, children: [
    { type: 'FRAME', name: 'Masque intérieur', visible: false,
      boundVariables: { fills: [alias('fond')] } },
    { type: 'INSTANCE', id: 'dependency', name: 'Dépendance', children: [
      { type: 'RECTANGLE', name: 'Interne', boundVariables: { fills: [alias('interne')] } },
    ] },
  ] }]);
  const warnings: string[] = [];
  assert.deepEqual(getAllNodes(root, warnings, new Map([
    ['dependency', { component: 'Other', figmaLayer: 'Dépendance' }],
  ])), [root]);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /« Masque »/);
});

type TestNode = {
  type: string;
  id?: string;
  name: string;
  visible?: boolean;
  boundVariables?: Record<string, unknown>;
  componentPropertyReferences?: { visible?: string } | null;
  children?: TestNode[];
  parent?: TestNode;
  findAll?: (predicate: (node: TestNode) => boolean) => TestNode[];
};

/** Construit le même parcours préfixe que `findAll`, avec les vrais parents. */
function tree(name: string, children: TestNode[]): ComponentNode {
  const root: TestNode = { type: 'COMPONENT', name, children };
  const descendants: TestNode[] = [];
  const visit = (parent: TestNode, nodes: TestNode[]) => {
    for (const node of nodes) {
      node.parent = parent;
      descendants.push(node);
      visit(node, node.children ?? []);
    }
  };
  visit(root, children);
  root.findAll = (predicate) => descendants.filter(predicate);
  return root as unknown as ComponentNode;
}

test('un sous-arbre statiquement masqué est élagué et son token est signalé', () => {
  const descendant = {
    type: 'RECTANGLE',
    name: 'Ancien fond',
    boundVariables: { fills: [alias('legacy')] },
  };
  const groupeMasque = {
    type: 'FRAME',
    name: 'Archive',
    visible: false,
    children: [descendant],
  };
  const visible = { type: 'RECTANGLE', name: 'Fond', visible: true };
  const root = tree('Button', [groupeMasque, visible]);
  const warnings: string[] = [];

  const nodes = getAllNodes(root, warnings);

  assert.deepEqual(nodes.map((node) => node.name), ['Button', 'Fond']);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /« Archive ».*l'exclut avec tout son contenu/);
});

/**
 * Deux variants qui masquent chacun un calque au même nom produisent la même
 * phrase. Le message ne part qu'une fois, et il mène aux deux calques.
 */
test('un calque masqué répété dans deux variants se signale une fois et mène aux deux', () => {
  const masque = (id: string): TestNode => ({
    type: 'FRAME',
    id,
    name: 'Archive',
    visible: false,
    children: [{ type: 'RECTANGLE', name: 'Ancien fond', boundVariables: { fills: [alias('legacy')] } }],
  });
  const warnings: string[] = [];

  getAllNodes(tree('State=Default', [masque('1:1')]), warnings);
  getAllNodes(tree('State=Hover', [masque('2:2')]), warnings);

  assert.equal(warnings.length, 1);
  assert.deepEqual(localisationsDe(warnings).get(warnings[0]), ['1:1', '2:2']);
});

test('un calque masqué par une prop ou une variable de visibilité reste exportable', () => {
  const parProp = {
    type: 'VECTOR',
    name: 'Icône optionnelle',
    visible: false,
    componentPropertyReferences: { visible: 'iconLeft#1:2' },
  };
  const parVariable = {
    type: 'VECTOR',
    name: 'Icône par mode',
    visible: false,
    boundVariables: { visible: alias('show-icon') },
  };
  const root = tree('Button', [parProp, parVariable]);

  assert.deepEqual(
    getAllNodes(root).map((node) => node.name),
    ['Button', 'Icône optionnelle', 'Icône par mode'],
  );
});

test('un calque masqué sans donnée contractuelle est exclu sans bruit', () => {
  const root = tree('Button', [
    { type: 'RECTANGLE', name: 'Repère de travail', visible: false },
  ]);
  const warnings: string[] = [];

  assert.deepEqual(getAllNodes(root, warnings).map((node) => node.name), ['Button']);
  assert.deepEqual(warnings, []);
});

/**
 * Le test rapide et le parcours complet disent la même chose : c'est la seule
 * garantie que la garde de l'index ne change aucun contrat.
 */
function jugeCommeGetAllNodes(racine: ComponentNode, attendu: boolean): void {
  const parParcours = getAllNodes(racine).some((node) => node.type === 'INSTANCE');
  assert.equal(parParcours, attendu, 'le scénario ne dit pas ce que son nom annonce');
  assert.equal(contientUneInstanceRendue(racine), attendu);
}

/** Le même arbre, servi par `findAllWithCriteria` comme dans Figma. */
function avecCriteres(racine: ComponentNode): ComponentNode {
  const noeud = racine as unknown as TestNode & { findAllWithCriteria?: unknown };
  noeud.findAllWithCriteria = ({ types }: { types: string[] }) =>
    noeud.findAll!((node) => types.includes(node.type));
  return racine;
}

test('une instance visible est rendue', () => {
  jugeCommeGetAllNodes(avecCriteres(tree('Root', [
    { type: 'FRAME', name: 'Branch', children: [{ type: 'INSTANCE', name: 'Leaf' }] },
  ])), true);
});

test('une instance masquée sans liaison n’est pas rendue', () => {
  jugeCommeGetAllNodes(avecCriteres(tree('Root', [
    { type: 'INSTANCE', name: 'Leaf', visible: false },
  ])), false);
});

test('une instance sous un cadre masqué n’est pas rendue', () => {
  jugeCommeGetAllNodes(avecCriteres(tree('Root', [
    { type: 'FRAME', name: 'Branch', visible: false, children: [{ type: 'INSTANCE', name: 'Leaf' }] },
  ])), false);
});

test('une instance masquée dont une propriété pilote la visibilité est rendue', () => {
  jugeCommeGetAllNodes(avecCriteres(tree('Root', [
    { type: 'INSTANCE', name: 'Leaf', visible: false,
      componentPropertyReferences: { visible: 'Afficher#1:2' } },
  ])), true);
});

test('une racine sans instance n’en contient aucune', () => {
  jugeCommeGetAllNodes(avecCriteres(tree('Root', [
    { type: 'FRAME', name: 'Branch', children: [{ type: 'TEXT', name: 'Glyph' }] },
  ])), false);
});

test('sans findAllWithCriteria, le repli sur findAll juge de même', () => {
  jugeCommeGetAllNodes(tree('Root', [
    { type: 'INSTANCE', name: 'Masquée', visible: false },
    { type: 'FRAME', name: 'Branch', children: [{ type: 'INSTANCE', name: 'Leaf' }] },
  ]), true);
});

test('dans une portée, une racine parcourue sous deux contextes ne relève qu’une fois ses descendants', async () => {
  const root = tree('Root', [
    { type: 'FRAME', id: 'cadre', name: 'Cadre', children: [{ type: 'TEXT', id: 'texte', name: 'Texte' }] },
    { type: 'INSTANCE', id: 'dependency', name: 'Dépendance', children: [{ type: 'TEXT', id: 'interne', name: 'Interne' }] },
    { type: 'FRAME', id: 'masque', name: 'Masque', visible: false },
  ]);
  (root as unknown as { id: string }).id = 'root';
  const relevesNatifs = { nombre: 0 };
  const relever = (root as unknown as { findAll: (predicat: (node: TestNode) => boolean) => TestNode[] }).findAll;
  (root as unknown as { findAll: unknown }).findAll = (predicat: (node: TestNode) => boolean) => {
    relevesNatifs.nombre += 1;
    return relever(predicat);
  };
  const composee = new Map([['dependency', { component: 'Other', figmaLayer: 'Dépendance' }]]);
  const lireLesDeux = () => ({
    libre: getAllNodes(root).map((node) => node.id),
    compose: getAllNodes(root, [], composee).map((node) => node.id),
  });

  const horsPortee = lireLesDeux();
  assert.equal(relevesNatifs.nombre, 2);

  relevesNatifs.nombre = 0;
  ouvrirLaMesure();
  let dansLaPortee!: ReturnType<typeof lireLesDeux>;
  let compteurs;
  try {
    await dansUnePorteeDAnalyse({}, async () => { dansLaPortee = lireLesDeux(); });
    compteurs = fermerLaMesure('')!.compteurs;
  } finally { abandonnerLaMesure(); }

  assert.equal(relevesNatifs.nombre, 1);
  assert.equal(compteurs.appelsGetAllNodes, 2);
  assert.equal(compteurs.nodesParcourus, 5);
  assert.equal(compteurs.parcoursReutilises, 1);
  assert.deepEqual(dansLaPortee, horsPortee);
  assert.deepEqual(dansLaPortee.libre, ['root', 'cadre', 'texte', 'dependency', 'interne']);
  assert.deepEqual(dansLaPortee.compose, ['root', 'cadre', 'texte', 'dependency']);
});

/**
 * Un set aux masqués de toutes sortes : statique sans liaison, statique dont le contenu porte une variable,
 * piloté par une propriété, piloté par une variable, et deux instances qui contiennent du texte.
 */
function arbreDesMasques() {
  const root = tree('Root', [
    { type: 'FRAME', id: 'cadre', name: 'Cadre', children: [{ type: 'TEXT', id: 'texte', name: 'Texte' }] },
    { type: 'INSTANCE', id: 'dependency', name: 'Dépendance', children: [{ type: 'TEXT', id: 'interne', name: 'Interne' }] },
    { type: 'FRAME', id: 'repere', name: 'Repère', visible: false, children: [{ type: 'TEXT', id: 'sous-repere', name: 'Sous repère' }] },
    { type: 'FRAME', id: 'ancien', name: 'Ancien', visible: false, children: [
      { type: 'RECTANGLE', id: 'ancien-fond', name: 'Ancien fond', boundVariables: { fills: [alias('legacy')] } },
    ] },
    { type: 'FRAME', id: 'par-prop', name: 'Par prop', visible: false, componentPropertyReferences: { visible: 'Afficher' }, children: [
      { type: 'TEXT', id: 'sous-prop', name: 'Sous prop', boundVariables: { fills: [alias('a')] } },
    ] },
    { type: 'FRAME', id: 'par-variable', name: 'Par variable', visible: false, boundVariables: { visible: alias('v') }, children: [
      { type: 'TEXT', id: 'sous-variable', name: 'Sous variable' },
    ] },
    { type: 'INSTANCE', id: 'ancre', name: 'Ancre', children: [{ type: 'TEXT', id: 'sous-ancre', name: 'Sous ancre' }] },
  ]);
  (root as unknown as { id: string }).id = 'root';
  return root;
}

const contextes = () => ({
  libre: new Map(),
  imbriquee: new Map([['dependency', { component: 'Autre', figmaLayer: 'Dépendance' }]]),
  ancre: new Map([['ancre', { component: 'Ancre', figmaLayer: 'Ancre' }]]),
  racine: new Map([['root', { component: 'Soi', figmaLayer: 'Root' }]]),
  deux: new Map([
    ['dependency', { component: 'Autre', figmaLayer: 'Dépendance' }],
    ['ancre', { component: 'Ancre', figmaLayer: 'Ancre' }],
  ]),
});
type Nom = keyof ReturnType<typeof contextes>;

function lire(root: ComponentNode, nom: Nom, parEtapes: boolean) {
  const avertissements: string[] = [];
  const composed = contextes()[nom];
  if (!parEtapes) return { ids: getAllNodes(root, avertissements, composed).map((n) => n.id), avertissements };
  const calcul = getAllNodesParEtapes(root, avertissements, composed);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return { ids: etape.value.map((n) => n.id), avertissements };
}

test('les contextes successifs sur une même racine rendent chacun le résultat qu’ils auraient hors portée', async () => {
  const sequences: Nom[][] = [
    ['libre', 'imbriquee', 'racine', 'libre'],
    ['racine', 'libre', 'deux', 'imbriquee', 'ancre', 'racine'],
    ['deux', 'ancre', 'libre', 'libre', 'imbriquee'],
  ];
  for (const parEtapes of [false, true]) {
    for (const sequence of sequences) {
      const attendu = sequence.map((nom) => lire(arbreDesMasques(), nom, parEtapes));
      const root = arbreDesMasques();
      let natifs = 0;
      const relever = (root as unknown as { findAll: (p: (n: TestNode) => boolean) => TestNode[] }).findAll;
      (root as unknown as { findAll: unknown }).findAll = (p: (n: TestNode) => boolean) => { natifs += 1; return relever(p); };
      let obtenu!: ReturnType<typeof lire>[];
      await dansUnePorteeDAnalyse({}, async () => { obtenu = sequence.map((nom) => lire(root, nom, parEtapes)); });
      assert.deepEqual(obtenu, attendu, `séquence ${sequence.join(' > ')}${parEtapes ? ' par étapes' : ''}`);
      assert.equal(natifs, 1);
    }
  }
});

test('masqués statiques et dynamiques : chaque contexte garde ses calques et son diagnostic', async () => {
  const root = arbreDesMasques();
  let libre!: ReturnType<typeof lire>;
  let imbriquee!: ReturnType<typeof lire>;
  let racine!: ReturnType<typeof lire>;
  await dansUnePorteeDAnalyse({}, async () => {
    libre = lire(root, 'libre', false);
    imbriquee = lire(root, 'imbriquee', false);
    racine = lire(root, 'racine', false);
  });
  // Le repère et l'ancien, masqués sans liaison, disparaissent ; la propriété et la variable gardent leurs calques.
  assert.deepEqual(libre.ids, [
    'root', 'cadre', 'texte', 'dependency', 'interne', 'par-prop', 'sous-prop', 'par-variable', 'sous-variable', 'ancre', 'sous-ancre',
  ]);
  // Seul l'ancien porte une variable sous un masque statique : un diagnostic, et le même quel que soit le contexte.
  assert.equal(libre.avertissements.length, 1);
  assert.match(libre.avertissements[0], /« Ancien »/);
  assert.deepEqual(imbriquee.ids, libre.ids.filter((id) => id !== 'interne'));
  assert.deepEqual(imbriquee.avertissements, libre.avertissements);
  assert.deepEqual(racine, { ids: ['root'], avertissements: [] });
});

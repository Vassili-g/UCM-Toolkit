/** Les doubles refusent un parcours avant le chargement de leur page. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { lireInventaire, nomsDePalettesDeLaRecette, relireInventaireAvantEcriture, type AvancementLecture, type ComposantLu, type PortDeLecture } from '../src/lecture';
import { creerPortDeLecture } from '../src/lectureFigma';

function composant(id: string, modifications: Partial<ComposantLu> = {}): ComposantLu {
  return { id, name: id, remote: false, type: 'COMPONENT', parentId: null, componentPropertyDefinitions: {}, variantProperties: null, ...modifications };
}
function portDeTest(contenu: readonly (readonly ComposantLu[])[], traces: string[] = []): PortDeLecture {
  return {
    collections: async () => [{ id: 'local', name: 'Local', remote: false }, { id: 'remote', name: 'Remote', remote: true }],
    variables: async () => [
      { id: 'v1', name: 'Button color', variableCollectionId: 'local', remote: false },
      { id: 'v2', name: 'Distant', variableCollectionId: 'local', remote: true },
      { id: 'v3', name: 'Collection distante', variableCollectionId: 'remote', remote: false },
    ],
    pages: () => contenu.map((composants, index) => {
      let chargee = false;
      return { id: `p${index}`, name: `Page ${index}`, charger: async () => { chargee = true; traces.push(`charge:${index}`); }, composants: () => {
        assert.ok(chargee);
        traces.push(`parcours:${index}`);
        return composants;
      } };
    }),
  };
}

test('toutes les pages sont chargées avant parcours et les objets distants sont exclus', async () => {
  const traces: string[] = [];
  const progression: AvancementLecture[] = [];
  const inventaire = await lireInventaire(portDeTest([
    [composant('c1', { componentPropertyDefinitions: { 'Label#2:3': { type: 'TEXT' } } })],
    [composant('c2', { componentPropertyDefinitions: { 'Visible#2:4': { type: 'BOOLEAN' } } }), composant('distant', { remote: true, componentPropertyDefinitions: { Interdit: { type: 'TEXT' } } })],
  ], traces), { pause: async () => { traces.push('pause'); }, avancement: (etat) => progression.push(etat) });
  assert.deepEqual(inventaire.pages.map((page) => page.id), ['p0', 'p1']);
  assert.equal(inventaire.entrees.length, 4);
  assert.deepEqual(inventaire.entrees.filter((entree) => entree.cible.type === 'propriete').map((entree) => entree.nom.nom), ['Label', 'Visible']);
  assert.ok(traces.indexOf('charge:0') < traces.indexOf('parcours:0'));
  assert.ok(traces.indexOf('parcours:0') < traces.indexOf('charge:1'));
  assert.ok(traces.includes('pause'));
  assert.deepEqual(progression.map((etat) => [etat.phase, etat.pagesLues]), [['variables', 0], ['pages', 0], ['pages', 1], ['pages', 1], ['pages', 2]]);
  assert.deepEqual(JSON.parse(JSON.stringify(inventaire)), inventaire);
});

test('les identifiants complets de propriétés restent distincts des noms logiques', async () => {
  const inventaire = await lireInventaire(portDeTest([[composant('owner', { componentPropertyDefinitions: { 'Button label#12:34': { type: 'TEXT' } } })]]), { pause: async () => {} });
  const entree = inventaire.entrees.find((entree) => entree.cible.type === 'propriete');
  assert.equal(entree?.nom.nom, 'Button label');
  assert.deepEqual(entree?.cible, { type: 'propriete', ownerId: 'owner', proprieteId: 'Button label#12:34', typePropriete: 'TEXT' });
});

test('le set porte ses axes une fois et chaque valeur regroupe les variantes de son axe', async () => {
  const definitions = { 'State#1:2': { type: 'VARIANT' }, 'Size#1:3': { type: 'VARIANT' }, 'Label#1:4': { type: 'TEXT' } };
  const inventaire = await lireInventaire(portDeTest([[
    composant('set', { type: 'COMPONENT_SET', componentPropertyDefinitions: definitions }),
    composant('a', { parentId: 'set', componentPropertyDefinitions: definitions, variantProperties: { State: 'Default', Size: 'Default' } }),
    composant('b', { parentId: 'set', componentPropertyDefinitions: definitions, variantProperties: { State: 'Default', Size: 'Large' } }),
    composant('remoteSet', { type: 'COMPONENT_SET', remote: true, componentPropertyDefinitions: definitions }),
    composant('remoteChild', { parentId: 'remoteSet', componentPropertyDefinitions: definitions, variantProperties: { State: 'Default' } }),
  ]]), { pause: async () => {} });
  const proprietes = inventaire.entrees.filter((entree) => entree.cible.type === 'propriete');
  assert.equal(proprietes.length, 3);
  const valeurs = inventaire.entrees.filter((entree) => entree.cible.type === 'valeur');
  assert.equal(valeurs.length, 3);
  assert.deepEqual(valeurs[0].cible, { type: 'valeur', ownerId: 'set', axe: 'State#1:2', valeur: 'Default', componentIds: ['a', 'b'] });
  assert.notEqual(valeurs[0].nom.portee, valeurs[1].nom.portee);
});

test('les valeurs ambiguës restent occupantes et les grands lots rendent la main', async () => {
  let pauses = 0;
  const inventaire = await lireInventaire(portDeTest([[
    composant('set', { type: 'COMPONENT_SET', componentPropertyDefinitions: { State: { type: 'VARIANT' } } }),
    ...Array.from({ length: 201 }, (_, index) => composant(`c${index}`, { parentId: 'set', variantProperties: { State: 'a,b' } })),
  ]]), { pause: async () => { pauses++; } });
  const valeur = inventaire.entrees.find((entree) => entree.cible.type === 'valeur');
  assert.equal(valeur?.nom.nom, 'a,b');
  assert.equal(valeur?.renommable, false);
  assert.ok(pauses >= 5);
});

test('une erreur de chargement ne retourne aucun inventaire partiel', async () => {
  const port = portDeTest([]);
  port.pages = () => [{ id: 'refusee', name: 'Refusée', charger: async () => { throw new Error('refus'); }, composants: () => [] }];
  await assert.rejects(lireInventaire(port, { pause: async () => {} }), /refus/);
});

test('l’adaptateur Figma sélectionne les deux types après chargement de chaque page', async () => {
  const appels: string[] = [];
  const api = {
    variables: { getLocalVariableCollectionsAsync: async () => [], getLocalVariablesAsync: async () => [] },
    root: { getSharedPluginData: () => '', children: [0, 1].map((index) => ({
      id: `p${index}`, name: `Page ${index}`, loadAsync: async () => { appels.push(`charge:${index}`); },
      findAllWithCriteria: (critere: unknown) => { appels.push(`parcours:${index}`); assert.deepEqual(critere, { types: ['COMPONENT_SET', 'COMPONENT'] }); return []; },
    })) },
  };
  await lireInventaire(creerPortDeLecture(api as unknown as PluginAPI), { pause: async () => {} });
  assert.deepEqual(appels, ['charge:0', 'parcours:0', 'charge:1', 'parcours:1']);
});

function portDeVariables(noms: readonly [string, string][], composants: readonly ComposantLu[], recette?: string): PortDeLecture {
  return {
    collections: async () => [{ id: 'prim', name: 'primitives', remote: false }, { id: 'comp', name: 'components', remote: false }, { id: 'theme', name: 'theme', remote: false }],
    variables: async () => noms.map(([nom, collection], rang) => ({ id: `v${rang}`, name: nom, variableCollectionId: collection, remote: false })),
    pages: () => [{ id: 'p', name: 'Page', charger: async () => {}, composants: () => composants }],
    ...(recette === undefined ? {} : { recettePalettes: () => recette }),
  };
}
const categoriesDe = (inventaire: Awaited<ReturnType<typeof lireInventaire>>) =>
  Object.fromEntries(inventaire.entrees.filter((entree) => entree.cible.type === 'variable').map((entree) => [entree.nom.nom, entree.nom.categoriesDesSegments]));

test('un segment qui nomme un ensemble de variantes ou un composant seul est marqué composant', async () => {
  const composants = [
    composant('set', { name: 'Button Group', type: 'COMPONENT_SET' }),
    composant('v', { name: 'Size=Large', parentId: 'set' }),
    composant('seul', { name: 'Forms/Text field' }),
    composant('distant', { name: 'Card', remote: true }),
  ];
  const inventaire = await lireInventaire(portDeVariables([
    ['sizes/button-group/large', 'prim'], ['sizes/textField/large', 'prim'],
    ['sizes/card/large', 'prim'], ['sizes/size=large', 'prim'], ['sizes/forms', 'prim'],
  ], composants), { pause: async () => {} });
  assert.deepEqual(categoriesDe(inventaire), {
    'sizes/button-group/large': [null, 'composants', null],
    'sizes/textField/large': [null, 'composants', null],
    'sizes/card/large': undefined,
    'sizes/size=large': undefined,
    'sizes/forms': undefined,
  });
});

test('la racine de la collection des composants nomme un composant, même absent du fichier', async () => {
  const inventaire = await lireInventaire(portDeVariables([
    ['Button/colors/primary/default/background', 'comp'], ['Alert/sizes/medium/gap', 'comp'],
  ], []), { pause: async () => {} });
  assert.deepEqual(categoriesDe(inventaire), {
    'Button/colors/primary/default/background': ['composants', null, null, null, null],
    'Alert/sizes/medium/gap': ['composants', null, null, null],
  });
});

test('la recette nomme les palettes, par identifiant comme par nom d’affichage', async () => {
  const recette = JSON.stringify({ palettes: [{ id: 'poppy' }, { id: 'sky', nom: 'Deep Blue' }] });
  const inventaire = await lireInventaire(portDeVariables([
    ['colors/Poppy/light/500', 'prim'], ['colors/deepBlue/light/500', 'prim'], ['colors/Other/light/500', 'prim'],
  ], [], recette), { pause: async () => {} });
  assert.deepEqual(categoriesDe(inventaire), {
    'colors/Poppy/light/500': [null, 'palettes', null, null],
    'colors/deepBlue/light/500': [null, 'palettes', null, null],
    'colors/Other/light/500': undefined,
  });
  const relue = await relireInventaireAvantEcriture(portDeVariables([['colors/Poppy/light/500', 'prim']], [], recette));
  assert.deepEqual(categoriesDe(relue), { 'colors/Poppy/light/500': [null, 'palettes', null, null] });
});

test('un nom de palette hors de la collection des primitives est un rôle, pas une palette', async () => {
  const recette = JSON.stringify({ palettes: [{ id: 'neutral' }] });
  const inventaire = await lireInventaire(portDeVariables([
    ['colors/neutral/light/500', 'prim'], ['neutral/page/foreground', 'theme'],
  ], [], recette), { pause: async () => {} });
  assert.deepEqual(categoriesDe(inventaire), {
    'colors/neutral/light/500': [null, 'palettes', null, null],
    'neutral/page/foreground': undefined,
  });
});

test('sans recette lisible, une palette est le segment qui suit colors dans primitives', async () => {
  for (const recette of [undefined, '', 'pas du JSON', '{"palettes":[]}']) {
    const inventaire = await lireInventaire(portDeVariables([
      ['colors/Poppy/light/500', 'prim'], ['colors/Poppy/light/500', 'theme'], ['dimensions/base', 'prim'], ['Poppy/colors', 'prim'],
    ], [], recette), { pause: async () => {} });
    assert.deepEqual(inventaire.entrees.filter((entree) => entree.cible.type === 'variable').map((entree) => entree.nom.categoriesDesSegments),
      [[null, 'palettes', null, null], undefined, undefined, undefined], String(recette));
  }
  assert.equal(nomsDePalettesDeLaRecette('{"palettes":[{"id":"a"}]}')?.has('a'), true);
});

test('un segment à la fois palette et composant compte comme palette', async () => {
  const inventaire = await lireInventaire(portDeVariables([['colors/Button/light/500', 'prim']], [composant('c', { name: 'Button' })]), { pause: async () => {} });
  assert.deepEqual(categoriesDe(inventaire), { 'colors/Button/light/500': [null, 'palettes', null, null] });
});

test('l’adaptateur Figma lit la recette à l’adresse partagée', async () => {
  const lectures: unknown[][] = [];
  const api = { variables: { getLocalVariableCollectionsAsync: async () => [], getLocalVariablesAsync: async () => [] },
    root: { children: [], getSharedPluginData: (...args: unknown[]) => { lectures.push(args); return '{}'; } } };
  assert.equal(creerPortDeLecture(api as unknown as PluginAPI).recettePalettes?.(), '{}');
  assert.deepEqual(lectures, [['ucm_palettes', 'recette']]);
});

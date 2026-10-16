/** Les doubles refusent un parcours avant le chargement de leur page. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { lireInventaire, type AvancementLecture, type ComposantLu, type PortDeLecture } from '../src/lecture';
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
    root: { children: [0, 1].map((index) => ({
      id: `p${index}`, name: `Page ${index}`, loadAsync: async () => { appels.push(`charge:${index}`); },
      findAllWithCriteria: (critere: unknown) => { appels.push(`parcours:${index}`); assert.deepEqual(critere, { types: ['COMPONENT_SET', 'COMPONENT'] }); return []; },
    })) },
  };
  await lireInventaire(creerPortDeLecture(api as unknown as PluginAPI), { pause: async () => {} });
  assert.deepEqual(appels, ['charge:0', 'parcours:0', 'charge:1', 'parcours:1']);
});

/**
 * Les requêtes pures du modèle de propriétés et d'états : sur des entrées
 * fabriquées, sans double Figma, avec leurs points dans l'ordre, puis face à
 * l'ancien chemin sur les mêmes entrées.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import * as referentiel from '@ucm-kit/core/referentiel';

import {
  DEPENDANCES_DE_PROPRIETES_ET_ETATS,
  buildStateModel,
  extractContractPropertyModel,
  isStateProperty,
  lireLeModeleDEtats,
  lireLeModeleDeProprietes,
  pousserLesPoints,
  remplacerLesRequetesPourLeBanc,
  type DefinitionsDeProprietes,
} from '../src/composant/analyse/proprietesEtEtats';
import { partiesDe, phraseDe } from '../src/composant/contract/localisation';
import { modeleDEtatsAvant, modeleDeProprietesAvant } from './aides/cheminAvantLesRequetes';

/** Gèle l'entrée en profondeur : une requête qui l'écrirait lèverait en mode strict. */
function geler<T>(valeur: T): T {
  if (valeur && typeof valeur === 'object') {
    for (const enfant of Object.values(valeur)) geler(enfant);
    Object.freeze(valeur);
  }
  return valeur;
}

const definitions = (brut: unknown) => geler(brut) as DefinitionsDeProprietes;

/** Deux clés qui se confondent, un axe de tailles dont le nom est pris, une booléenne qui double « Disable ». */
const DEFINITIONS_EN_CONFLIT = definitions({
  'Icon Left#1:1': { type: 'TEXT', defaultValue: 'a' },
  'icon-left#1:2': { type: 'TEXT', defaultValue: 'b' },
  'Taille#1:3': { type: 'VARIANT', defaultValue: 'Small', variantOptions: ['Small', 'Medium', 'Large'] },
  'size#1:4': { type: 'BOOLEAN', defaultValue: false },
  'State#1:5': { type: 'VARIANT', defaultValue: 'Default', variantOptions: ['Default', 'Disable'] },
  'Disabled#1:6': { type: 'BOOLEAN', defaultValue: false },
});

test('le modèle de propriétés rend ses props et ses points dans l’ordre des déclarations', () => {
  const { modele, points } = lireLeModeleDeProprietes(DEFINITIONS_EN_CONFLIT);

  assert.deepEqual(Object.keys(modele.props), ['disabled', 'taille', 'iconLeft', 'size']);
  assert.deepEqual(modele.props.taille, { type: 'enum', values: ['small', 'medium', 'large'] });
  assert.deepEqual([...modele.publicVariantKeyByRawKey], [['taille', 'taille'], ['state', 'state']]);
  assert.deepEqual(points.map((point) => point.sujet), [
    'Propriété de variante « Taille »',
    'Propriétés de composant « Icon Left » et « icon-left »',
    'Propriété de composant « Disabled »',
  ]);
  assert.match(points[0].constat.manque, /ses valeurs sont des tailles, mais une autre propriété de composant porte déjà le nom « size »\./);
  assert.match(points[2].constat.manque, /« Disable », que le contrat publie sous le nom « disabled »/);
  assert.ok(points.every((point) => point.constat.famille === 'proprietes'));
});

test('le modèle d’états sépare les avertissements des termes tolérés, dans l’ordre des valeurs', () => {
  const { modele, points } = lireLeModeleDEtats(
    geler(['size', 'state']) as string[],
    geler([{ state: 'default' }, { state: 'loading' }, { state: 'hovered' }, { state: 'disabled' }]) as Array<Record<string, string>>,
  );

  assert.equal(modele?.axis, 'state');
  assert.deepEqual(Object.keys(modele?.states ?? {}), ['default', 'loading', 'hovered', 'disabled']);
  assert.deepEqual(modele?.states.loading, {});
  assert.deepEqual(modele?.precedence, ['disabled', 'hovered', 'default', 'loading']);
  assert.deepEqual(points.map((point) => [point.canal, point.constat.manque]), [
    ['avertissements', 'l\'état « loading » n\'est pas reconnu.'],
    ['notices', 'l’état « hovered » s’écrit « hover » dans le vocabulaire UCM.'],
  ]);
});

test('un axe État ou Etat est l’axe d’états : il quitte les props et le modèle d’états le publie', () => {
  for (const nom of ['State', 'States', 'Status', 'État', 'Etat']) {
    const { modele } = lireLeModeleDeProprietes(definitions({
      [`${nom}#1:1`]: { type: 'VARIANT', defaultValue: 'Default', variantOptions: ['Default', 'Hover'] },
    }));
    const cle = [...modele.publicVariantKeyByRawKey.keys()][0];
    assert.deepEqual(Object.keys(modele.props), [], nom);
    assert.equal(isStateProperty(cle), true, nom);

    const etats = lireLeModeleDEtats([cle], [{ [cle]: 'default' }, { [cle]: 'hover' }]);
    assert.deepEqual(etats.modele, { axis: cle, states: { default: {}, hover: { selector: ':hover' } }, precedence: ['hover', 'default'] }, nom);
  }
});

test('un jeu État=Défaut|Survol publie un modèle d’états, et signale ses valeurs inconnues', () => {
  const { modele } = lireLeModeleDeProprietes(definitions({
    'État#1:1': { type: 'VARIANT', defaultValue: 'Défaut', variantOptions: ['Défaut', 'Survol'] },
  }));
  const axe = [...modele.publicVariantKeyByRawKey.values()][0];
  const { modele: etats, points } = lireLeModeleDEtats([axe], [{ [axe]: 'défaut' }, { [axe]: 'survol' }]);

  assert.equal(etats?.axis, 'état');
  assert.deepEqual(Object.keys(etats?.states ?? {}), ['défaut', 'survol']);
  assert.deepEqual(points.map((point) => point.canal), ['avertissements', 'avertissements']);
});

test('sans axe d’états, le modèle d’états est nul et ne signale rien', () => {
  assert.deepEqual(lireLeModeleDEtats(['size'], [{ size: 'm' }]), { modele: null, points: [] });
});

test('pousserLesPoints écrit dans le canal reçu, un point à la fois, avec ses parties', () => {
  const { points } = lireLeModeleDeProprietes(DEFINITIONS_EN_CONFLIT);
  const canal: string[] = ['déjà là'];

  pousserLesPoints(canal, points);

  assert.equal(canal.length, 4);
  assert.equal(canal[0], 'déjà là');
  assert.deepEqual([...partiesDe(canal).keys()], canal.slice(1));
  assert.ok(canal[1].startsWith('Propriété de variante « Taille » : '));
  for (const [phrase, partie] of partiesDe(canal)) assert.equal(phraseDe(partie), phrase);
});

test('les dépendances déclarées nomment des constantes du référentiel qui existent', () => {
  for (const { referentiel: noms } of Object.values(DEPENDANCES_DE_PROPRIETES_ET_ETATS)) {
    for (const nom of noms) assert.ok(nom in referentiel, `${nom} n’est pas exporté par @ucm-kit/core/referentiel`);
  }
  assert.deepEqual(DEPENDANCES_DE_PROPRIETES_ET_ETATS.modeleDeProprietes.entrees, ['componentPropertyDefinitions']);
});

test('la même entrée donne le même résultat et les mêmes points, appel après appel', () => {
  assert.deepEqual(lireLeModeleDeProprietes(DEFINITIONS_EN_CONFLIT), lireLeModeleDeProprietes(DEFINITIONS_EN_CONFLIT));
});

/** Les entrées d'états de la comparaison : un axe reconnu, un axe inconnu, un terme toléré. */
const ENTREES_D_ETATS: Array<[string[], Array<Record<string, string>>]> = [
  [['state'], [{ state: 'default' }, { state: 'hover' }, { state: 'focus' }, { state: 'pressed' }, { state: 'disabled' }]],
  [['status', 'size'], [{ status: 'default', size: 's' }, { status: 'hovered', size: 'm' }, { status: 'constructor', size: 'l' }]],
  [['states'], [{ states: '__proto__' }, { states: 'press' }, { states: 'disable' }]],
  [['size'], [{ size: 's' }]],
  [['state'], []],
];

/** Les définitions de la comparaison : chaque type, chaque conflit, chaque ordre de déclaration. */
const DEFINITIONS_A_COMPARER: DefinitionsDeProprietes[] = [
  DEFINITIONS_EN_CONFLIT,
  definitions({}),
  definitions({
    kind: { type: 'BOOLEAN', defaultValue: true },
    Kind: { type: 'VARIANT', defaultValue: 'A', variantOptions: ['A', 'B'] },
  }),
  definitions({
    'State#1:1': { type: 'VARIANT', defaultValue: 'Default', variantOptions: ['Default', 'Hover'] },
    'State#2:2': { type: 'BOOLEAN', defaultValue: true },
    'Label#3:3': { type: 'TEXT', defaultValue: 'Valider' },
    'Icon#3:4': { type: 'INSTANCE_SWAP', defaultValue: 'cle', preferredValues: [{ type: 'COMPONENT', key: 'k' }] },
    'Contenu#3:5': { type: 'SLOT', defaultValue: true, preferredValues: [], description: 'zone', slotSettings: { orientation: 'row' } },
    'Taille#3:6': { type: 'VARIANT', defaultValue: 'S', variantOptions: ['Small', 'Medium'] },
    'Size#3:7': { type: 'VARIANT', defaultValue: 'x', variantOptions: ['x', 'y'] },
  }),
  definitions(JSON.parse(
    '{"constructor":{"type":"BOOLEAN","defaultValue":true},"__proto__":{"type":"TEXT","defaultValue":"x"}}',
  )),
];

test('le chemin d’avant et la requête rendent le même modèle, les mêmes messages et les mêmes parties dans le même ordre', () => {
  for (const entree of DEFINITIONS_A_COMPARER) {
    const avantCanal: string[] = [];
    const apresCanal: string[] = [];
    const avant = modeleDeProprietesAvant(entree, avantCanal);
    const apres = extractContractPropertyModel(entree, apresCanal);
    assert.deepEqual(apres, avant);
    assert.deepEqual(apresCanal, avantCanal);
    assert.deepEqual([...partiesDe(apresCanal)], [...partiesDe(avantCanal)]);
  }
  for (const [axes, valeurs] of ENTREES_D_ETATS) {
    const avant = { warnings: [] as string[], notices: [] as string[] };
    const apres = { warnings: [] as string[], notices: [] as string[] };
    const modeleAvant = modeleDEtatsAvant(axes, valeurs, avant.warnings, avant.notices);
    const modeleApres = buildStateModel(axes, valeurs, apres.warnings, apres.notices);
    assert.deepEqual(modeleApres, modeleAvant);
    assert.deepEqual(apres, avant);
    assert.deepEqual([...partiesDe(apres.warnings)], [...partiesDe(avant.warnings)]);
    assert.deepEqual([...partiesDe(apres.notices)], [...partiesDe(avant.notices)]);
  }
});

test('sans canal notices, les termes tolérés suivent les avertissements dans le même canal, dans l’ordre de la requête', () => {
  const valeurs = [{ state: 'hovered' }, { state: 'loading' }];
  const avant: string[] = [];
  const apres: string[] = [];
  modeleDEtatsAvant(['state'], valeurs, avant);
  buildStateModel(['state'], valeurs, apres);

  assert.equal(apres.length, 2);
  assert.deepEqual(apres, avant);
  assert.match(apres[0], /s’écrit « hover »/);
  assert.match(apres[1], /« loading » n'est pas reconnu/);
});

test('une remplaçante du banc prend la place de la requête jusqu’à son retrait', () => {
  const vue: string[] = [];
  remplacerLesRequetesPourLeBanc({
    modeleDeProprietes: (entree, canal) => {
      vue.push('proprietes');
      return modeleDeProprietesAvant(entree, canal);
    },
    modeleDEtats: (axes, valeurs, avertissements, notices) => {
      vue.push('etats');
      return modeleDEtatsAvant(axes, valeurs, avertissements, notices);
    },
  });
  try {
    extractContractPropertyModel(definitions({}));
    buildStateModel(['state'], [{ state: 'default' }], []);
  } finally {
    remplacerLesRequetesPourLeBanc({});
  }
  extractContractPropertyModel(definitions({}));
  assert.deepEqual(vue, ['proprietes', 'etats']);
});

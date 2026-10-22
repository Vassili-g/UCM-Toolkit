import assert from 'node:assert/strict';
import test from 'node:test';
import {
  axeDePropriete, controlerNommage,
  type CatalogueDeReference, type ReleveDeComposant,
} from '../src/controles/index.js';

function releve(nom: string, proprietes: ReleveDeComposant['proprietes'] = []): ReleveDeComposant {
  return {
    version: 1, jeu: { cle: nom, id: nom, nom }, proprietes, variants: [],
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

function catalogue(...noms: string[]): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: [{ cle: 'composants', nom: 'components', role: 'components', modes: [], etat: 'lue' }],
    variables: noms.map((nom, rang) => ({ cle: `v${rang}`, nom, collection: 'composants', type: 'COLOR', etat: 'presente' })),
  };
}

const axe = (nom: string, valeurs: string[]): ReleveDeComposant['proprietes'][number] => ({
  nom, type: 'VARIANT', valeurs, defaut: valeurs[0],
});

test('C7 signale une valeur d’axe absente, mais ignore un axe que les tokens ne portent pas', () => {
  const composant = releve('Button', [axe('Palette', ['primary', 'secondary'])]);
  assert.deepEqual(controlerNommage(composant, catalogue('button/color/primary/background')).map(({ code, faits }) => [code, faits.valeur]),
    [['C7', 'secondary']]);
  assert.deepEqual(controlerNommage(composant, catalogue('button/size/gap')), []);
});

test('C8 distingue la forme tolérée colors de la famille canonique color', () => {
  const composant = releve('Alert');
  assert.deepEqual(controlerNommage(composant, catalogue('alert/colors/info/standard/background')).map(({ code }) => code), ['C8']);
  assert.deepEqual(controlerNommage(composant, catalogue('alert/color/info/standard/background')), []);
});

test('C9 compare casse et séparateur sans confondre deux valeurs différentes', () => {
  const composant = releve('Button', [axe('Style', ['IconLeft'])]);
  assert.deepEqual(controlerNommage(composant, catalogue('button/color/icon-left/background')).map(({ code }) => code), ['C9']);
  assert.deepEqual(controlerNommage(composant, catalogue('button/color/IconLeft/background')), []);
});

test('C10 reconnaît medium comme forme tolérée de md et accepte md', () => {
  const composant = releve('Button', [axe('Size', ['medium'])]);
  assert.deepEqual(controlerNommage(composant, catalogue('button/size/medium/padding-x')).map(({ code }) => code), ['C10']);
  assert.deepEqual(controlerNommage(composant, catalogue('button/size/md/padding-x')), []);
});

test('C11 reconnaît les noms de l’axe d’état sans attribuer ce rôle à Variant', () => {
  assert.equal(axeDePropriete('States'), 'etat');
  assert.equal(axeDePropriete('STATE'), 'etat');
  assert.equal(axeDePropriete('Variant'), 'style');
  assert.equal(axeDePropriete('Label'), undefined);
});

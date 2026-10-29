/** Une propriété de variant est l'axe d'états par `estLAxeDEtats`, pour le nommage, l'accessibilité et les corrections. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { REGISTRE_AXES_ETAT, STATE_AXIS_NAMES, estLAxeDEtats } from '../src/referentiel/index.js';
import { axeDePropriete } from '../src/controles/nommage.js';
import {
  controlerLAccessibilite, proposerLesCorrections,
  type CatalogueDeReference, type Constat, type LayerLu, type ReleveDeComposant, type VariantLu,
} from '../src/controles/index.js';

const AXES_D_ETATS = ['State', 'States', 'Status', 'État', 'Etat', 'STATE', 'état'];

test('estLAxeDEtats reconnaît State, States, Status, État et Etat, et rien d’autre', () => {
  for (const nom of AXES_D_ETATS) assert.equal(estLAxeDEtats(nom), true, nom);
  for (const nom of ['Size', 'State Type', 'Stateful', 'Statut', 'Color', '']) assert.equal(estLAxeDEtats(nom), false, nom);
});

test('STATE_AXIS_NAMES est la liste du registre : l’identifiant, puis ses formes tolérées', () => {
  const [terme] = REGISTRE_AXES_ETAT.termes;
  assert.deepEqual(STATE_AXIS_NAMES, [terme.id, ...(terme.toleres ?? [])]);
  assert.deepEqual(STATE_AXIS_NAMES, ['state', 'states', 'status', 'etat', 'état']);
});

test('le nommage lit l’axe d’états sous chaque écriture', () => {
  for (const nom of AXES_D_ETATS) assert.equal(axeDePropriete(nom), 'etat', nom);
  assert.equal(axeDePropriete('Size'), 'taille');
});

const racine = (largeur: number): LayerLu => ({
  id: 'r', nom: 'Root', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur, hauteur: largeur },
  peintures: [{ champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 1, g: 1, b: 1, a: 1 } }],
  liaisons: [], valeursEnDur: [],
});

test('l’accessibilité contrôle la cible tactile d’un jeu interactif, quelle que soit l’écriture de l’axe d’états', () => {
  for (const nom of AXES_D_ETATS) {
    const releve: ReleveDeComposant = {
      version: 1, jeu: { cle: 'k', id: '1', nom: 'x-button' },
      proprietes: [{ nom, type: 'VARIANT', valeurs: ['Default', 'Hover'], defaut: 'Default' }],
      variants: [{ id: 'petit', nom: 'petit', valeurs: { [nom]: 'Default' }, layers: [racine(20)], modesEffectifs: {} }],
      lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
    };
    const catalogue: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };
    const cibles = controlerLAccessibilite(releve, catalogue, { niveau: 'AA' }).filter((c) => c.code === 'C52' && !c.limite);
    assert.equal(cibles.length, 1, nom);
  }
});

function layer(token: string, id = 'layer-1'): LayerLu {
  return {
    id, nom: 'container', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 },
    peintures: [], valeursEnDur: [],
    liaisons: [{ champ: 'fills', indice: 0, porteur: id, variable: { id: 'old', cle: 'old', nom: token, collection: 'components', distante: false } }],
  };
}

test('l’indice d’une question de survol compte les variants de l’axe d’états, quelle que soit son écriture', () => {
  const defaut = 'button/color/primary/contained/default/background';
  const survol = 'button/color/primary/contained/hover/background';
  for (const nom of AXES_D_ETATS) {
    const variants: VariantLu[] = [
      { id: 'variant-1', nom: 'Button', valeurs: { [nom]: 'hover' }, modesEffectifs: {}, layers: [layer(defaut)] },
      { id: 'variant-2', nom: 'Button 2', valeurs: { [nom]: 'hover' }, modesEffectifs: {}, layers: [layer(survol, 'layer-2')] },
      { id: 'variant-3', nom: 'Button 3', valeurs: { [nom]: 'hover' }, modesEffectifs: {}, layers: [layer(defaut, 'layer-3')] },
    ];
    const releve: ReleveDeComposant = {
      version: 1, jeu: { cle: 'button-set', id: 'button-set', nom: 'Button' },
      proprietes: [{ nom, type: 'VARIANT', valeurs: ['hover'], defaut: 'hover' }], variants,
      lecture: { layersLus: 3, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
    };
    const catalogue: CatalogueDeReference = {
      version: 1, library: null, collections: [{ cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' }],
      variables: [
        { cle: 'old', nom: defaut, collection: 'components', type: 'COLOR', etat: 'presente' },
        { cle: 'hover', nom: survol, collection: 'components', type: 'COLOR', etat: 'presente' },
      ],
    };
    const constat: Constat = {
      id: 'C16:test', code: 'C16', type: 'corriger', famille: 'liaisons', variants: ['variant-1'], layers: ['layer-1'],
      faits: { axe: nom, valeur: 'hover', token: defaut, champ: 'fills', indice: 0 },
    };
    const question = proposerLesCorrections(releve, catalogue, [constat]).find(({ code, question: candidat }) => code === 'C16' && !!candidat);
    assert.equal(question?.question?.indice, `1 des 2 variants State=hover emploient un token hover.`, nom);
  }
});

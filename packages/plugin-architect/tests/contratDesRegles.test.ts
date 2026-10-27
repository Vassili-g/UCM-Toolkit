/**
 * Le modèle des règles lu sur le résultat interne est celui que le contrat publié donnait : `contratDesReglesDe`
 * applique l'élision du contrat (`null`, `{}` et `[]` ne s'écrivent pas) aux `props` et au `stateModel`, y compris
 * quand cette élision rend un enum sans `values` ou un `stateModel` sans `states`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { ContractProp, StateModel } from '@ucm-kit/core/format';
import { elideContract } from 'ucm-plugin-socle/src/composant/contract/elideNeutrals';
import { serializeJson } from 'ucm-plugin-socle/src/composant/contract/serializeJson';
import { modeleDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';
import type { ContratLu } from 'ucm-plugin-socle/src/composant/template/modele';

import { contratDesReglesDe } from '../src/regles';

type Surface = { props: Record<string, ContractProp>; stateModel: StateModel | null };

/** Le contrat tel que l'ancienne voie le relisait : élidé, sérialisé, puis lu par `JSON.parse`. */
function contratPublie(surface: Surface): ContratLu {
  const contrat = elideContract({ name: 'Button', props: surface.props, stateModel: surface.stateModel, samples: {} }, []);
  return JSON.parse(serializeJson(contrat as never)) as ContratLu;
}

/** Le résultat du modèle, ou le nom de l'erreur qu'il lève. */
function modeleDe(contrat: ContratLu): unknown {
  try {
    return modeleDeRegles('Button', contrat);
  } catch (erreur) {
    return `erreur : ${(erreur as Error).name}`;
  }
}

const ETATS: StateModel = {
  axis: 'state',
  precedence: ['disabled', 'hover', 'default'],
  states: { default: {}, hover: { selector: ':hover' }, disabled: { selector: '[disabled]' } },
};

const SURFACES: Array<[string, Surface]> = [
  ['des props et des états', {
    props: {
      size: { type: 'enum', values: ['s', 'm'], default: 'm' },
      loading: { type: 'boolean', default: false },
      label: { type: 'string' },
    } as Record<string, ContractProp>,
    stateModel: ETATS,
  }],
  ['aucune prop et aucun état', { props: {}, stateModel: null }],
  ['des états sans prop', { props: {}, stateModel: ETATS }],
  ['des props sans état', { props: { loading: { type: 'boolean', default: true } } as Record<string, ContractProp>, stateModel: null }],
  ['un enum sans valeur', { props: { size: { type: 'enum', values: [] } } as unknown as Record<string, ContractProp>, stateModel: null }],
  ['un modèle d’états sans état', { props: {}, stateModel: { axis: 'state', precedence: [], states: {} } as StateModel }],
];

for (const [nom, surface] of SURFACES) {
  test(`${nom} : le modèle de règles est celui du contrat publié`, () => {
    const lu = contratDesReglesDe(surface);
    assert.deepEqual(modeleDe(lu), modeleDe(contratPublie(surface)));
    const { props, stateModel } = contratPublie(surface);
    assert.deepEqual(JSON.parse(JSON.stringify(lu)), JSON.parse(JSON.stringify({ props, stateModel })));
  });
}

test('un enum sans valeur et un modèle d’états sans état lèvent comme le contrat publié, que la lecture des règles avale', () => {
  const sansValeur = SURFACES.find(([nom]) => nom === 'un enum sans valeur')![1];
  const sansEtat = SURFACES.find(([nom]) => nom === 'un modèle d’états sans état')![1];
  assert.match(String(modeleDe(contratDesReglesDe(sansValeur))), /^erreur : /);
  assert.match(String(modeleDe(contratDesReglesDe(sansEtat))), /^erreur : /);
});

test('la surface du résultat interne n’est pas modifiée par la normalisation', () => {
  const props = { size: { type: 'enum', values: [] } } as unknown as Record<string, ContractProp>;
  const avant = JSON.stringify({ props, stateModel: null });
  contratDesReglesDe({ props, stateModel: null });
  assert.equal(JSON.stringify({ props, stateModel: null }), avant);
});

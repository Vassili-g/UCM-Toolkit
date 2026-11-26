/**
 * D24 (recette du Button, N3) : la liaison porte le nom de sa collection (`components`), le catalogue la clé de la variable (`c`). Les
 * corrections cherchent les candidats dans la collection que le catalogue donne à la variable liée, jamais dans celle que la liaison nomme.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { proposerLesCorrections, type CatalogueDeReference, type Constat, type ReleveDeComposant } from '../src/controles/index.js';

const releve: ReleveDeComposant = {
  version: 1, jeu: { cle: 'alert-set', id: 'alert-set', nom: 'Alert' },
  proprietes: [{ nom: 'Severity', type: 'VARIANT', valeurs: ['info', 'success'], defaut: 'info' }],
  variants: [{
    id: 'variant-1', nom: 'Alert', valeurs: { Severity: 'success' }, modesEffectifs: {},
    layers: [{
      id: 'layer-1', nom: 'icon', type: 'FRAME', parent: null, visible: true, opacite: 1,
      dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 }, peintures: [], valeursEnDur: [],
      liaisons: [{ champ: 'fills', indice: 0, porteur: 'layer-1', variable: { id: 'old', cle: 'old', nom: 'alert/color/info/background', collection: 'components', distante: false } }],
    }],
  }],
  lecture: { layersLus: 1, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
};

const catalogue: CatalogueDeReference = {
  version: 1, library: null,
  collections: [{ cle: 'c', nom: 'components', role: 'components', modes: [{ id: 'm', nom: 'Light' }], etat: 'lue' }],
  variables: [
    { cle: 'old', nom: 'alert/color/info/background', collection: 'c', type: 'COLOR', etat: 'presente' },
    { cle: 'icon', nom: 'alert/color/info/icon', collection: 'c', type: 'COLOR', etat: 'presente' },
    { cle: 'success', nom: 'alert/color/success/background', collection: 'c', type: 'COLOR', etat: 'presente' },
  ],
};

const constat = (code: Constat['code'], faits: Constat['faits']): Constat => ({ id: `${code}:test`, code, type: 'corriger', famille: 'liaisons', variants: ['variant-1'], layers: ['layer-1'], faits });

test('D24 : un rôle attendu retrouve son candidat quand la clé de la collection diffère de son nom', () => {
  const resultat = proposerLesCorrections(releve, catalogue, [constat('C17', { attendu: 'icon', token: 'alert/color/info/background', champ: 'fills', indice: 0 })]);
  assert.equal(resultat.find(({ code }) => code === 'C24')?.correction?.apres.cle, 'icon');
});

test('D24 : un axe retrouve son candidat quand la clé de la collection diffère de son nom', () => {
  const resultat = proposerLesCorrections(releve, catalogue, [constat('C15', { axe: 'Severity', valeur: 'success', token: 'alert/color/info/background', champ: 'fills', indice: 0 })]);
  assert.equal(resultat.find(({ code }) => code === 'C22')?.correction?.apres.cle, 'success');
});

test('D24 : une liaison dont la variable manque au catalogue n’a aucun candidat, sans deviner sa collection par le nom', () => {
  const sansLaVariable: CatalogueDeReference = { ...catalogue, variables: catalogue.variables.filter(({ cle }) => cle !== 'old') };
  const resultat = proposerLesCorrections(releve, sansLaVariable, [constat('C17', { attendu: 'icon', token: 'alert/color/info/background', champ: 'fills', indice: 0 })]);
  assert.deepEqual(resultat.find(({ code }) => code === 'C24')?.question?.candidats, []);
});

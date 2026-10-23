/** L'écriture des règles : relecture avant écriture, motifs sautés, instance remplie refusée. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Correction } from '@ucm-kit/core/controles';
import { releveVide } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import type { ReleveDeSource } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import type { ModeleDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';
import type { SourcesDeCreation } from 'ucm-plugin-socle/src/composant/template/sources';

import { ecrireLesRegles } from '../src/ecriture/regles';
import type { PortDEcritureDesRegles } from '../src/ecriture/regles';

const modele: ModeleDeRegles = { nom: 'Alert', sections: [] };
const sources = {} as SourcesDeCreation;
const correction = (operation: string, id = 'c1'): Correction => ({ id, sorte: 'regles', cible: { layer: '1:2' }, avant: null, apres: { nom: operation }, aRelire: { regle: 'regles', avant: null } });

function banc(sur: { composant?: boolean; releve?: Partial<ReleveDeSource>; refus?: boolean; leve?: boolean } = {}) {
  const appels: string[] = [];
  const port: PortDEcritureDesRegles = {
    composant: async () => (sur.composant === false ? null : ({ id: '1:2' } as ComponentSetNode)),
    releve: async () => ({ ...releveVide(), ...sur.releve }),
    resoudre: async () => (sur.refus ? { sources: null, refus: 'non' } : { sources, refus: null }),
    creer: async () => {
      appels.push('creer');
      if (sur.leve) throw new Error('Figma refuse');
      return { conteneur: {} as InstanceNode, regles: 3 };
    },
  };
  return { port, appels };
}

const modeles = new Map([['c1', modele]]);

test('une création relit, puis écrit', async () => {
  const b = banc();
  const rendu = await ecrireLesRegles([correction('creer')], () => {}, modeles, b.port);
  assert.deepEqual(rendu, { ecrites: ['c1'], sautees: [] });
  assert.deepEqual(b.appels, ['creer']);
});

test('un composant disparu : sautée objet-change, rien d’écrit', async () => {
  const b = banc({ composant: false });
  const rendu = await ecrireLesRegles([correction('creer')], () => {}, modeles, b.port);
  assert.deepEqual(rendu, { ecrites: [], sautees: [{ id: 'c1', motif: 'objet-change' }] });
  assert.deepEqual(b.appels, []);
});

test('une instance de règles apparue depuis l’analyse : sautée objet-change', async () => {
  const b = banc({ releve: { conteneurDuComposant: true } });
  const rendu = await ecrireLesRegles([correction('creer')], () => {}, modeles, b.port);
  assert.deepEqual(rendu.sautees, [{ id: 'c1', motif: 'objet-change' }]);
  assert.deepEqual(b.appels, []);
});

test('une erreur de Figma devient une sautée erreur, et la suivante s’écrit', async () => {
  const b = banc({ leve: true });
  const rendu = await ecrireLesRegles([correction('creer')], () => {}, modeles, b.port);
  assert.deepEqual(rendu.sautees, [{ id: 'c1', motif: 'erreur' }]);
  const refus = await ecrireLesRegles([correction('creer')], () => {}, modeles, banc({ refus: true }).port);
  assert.deepEqual(refus.sautees, [{ id: 'c1', motif: 'erreur' }]);
});

test('ajout et retrait sur une instance remplie : refusés instance-remplie, jamais écrits', async () => {
  const b = banc({ releve: { conteneurDuComposant: true } });
  const rendu = await ecrireLesRegles([correction('ajouter', 'a'), correction('retirer', 'r')], () => {}, modeles, b.port);
  assert.deepEqual(rendu, { ecrites: [], sautees: [{ id: 'a', motif: 'instance-remplie' }, { id: 'r', motif: 'instance-remplie' }] });
  assert.deepEqual(b.appels, []);
});

test('les corrections d’une autre sorte sont ignorées', async () => {
  const b = banc();
  const autre: Correction = { ...correction('creer'), sorte: 'liaison' };
  assert.deepEqual(await ecrireLesRegles([autre], () => {}, modeles, b.port), { ecrites: [], sautees: [] });
});

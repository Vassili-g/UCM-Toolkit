/** L'écriture des règles : relecture avant écriture, motifs sautés, ajout des règles manquantes, retrait refusé. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Correction } from '@ucm-kit/core/controles';
import { releveVide } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import type { ReleveDeSource } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import { cibleCompacte } from 'ucm-plugin-socle/src/composant/template/modele';
import type { ModeleDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';
import type { SourcesDeCreation } from 'ucm-plugin-socle/src/composant/template/sources';

import { ecrireLesRegles } from '../src/ecriture/regles';
import type { PortDEcritureDesRegles } from '../src/ecriture/regles';

const regle = (tag: 'prop' | 'boolean', cible: string) => ({ genre: 'regle' as const, tag, cible });
const modele: ModeleDeRegles = { nom: 'Alert', sections: [] };
const sources = {} as SourcesDeCreation;
const correction = (operation: string, id = 'c1'): Correction => ({ id, sorte: 'regles', cible: { layer: '1:2' }, avant: null, apres: { nom: operation }, aRelire: { regle: 'regles', avant: null } });

const modeleDe = (tag: 'prop' | 'boolean', ...cibles: string[]): ModeleDeRegles => ({ nom: 'Alert', sections: [{ tag, elements: cibles.map((cible) => regle(tag, cible)) }] });

function banc(sur: { composant?: boolean; releve?: Partial<ReleveDeSource>; refus?: boolean; leve?: boolean; sansConteneur?: boolean; presentes?: string[]; leveAjout?: boolean } = {}) {
  const appels: string[] = [];
  const ajoutees: ModeleDeRegles[] = [];
  const port: PortDEcritureDesRegles = {
    composant: async () => (sur.composant === false ? null : ({ id: '1:2' } as ComponentSetNode)),
    releve: async () => ({ ...releveVide(), ...sur.releve }),
    resoudre: async () => (sur.refus ? { sources: null, refus: 'non' } : { sources, refus: null }),
    presentes: async () => new Set((sur.presentes ?? []).map(cibleCompacte)),
    conteneur: async () => (sur.sansConteneur ? null : ({ id: '9:9' } as InstanceNode)),
    ajouter: async (_conteneur, manquantes) => {
      appels.push('ajouter');
      ajoutees.push(manquantes);
      if (sur.leveAjout) throw new Error('Figma refuse');
      return { conteneur: {} as InstanceNode, regles: 1 };
    },
    creer: async () => {
      appels.push('creer');
      if (sur.leve) throw new Error('Figma refuse');
      return { conteneur: {} as InstanceNode, regles: 3 };
    },
  };
  return { port, appels, ajoutees };
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

test('retrait sur une instance remplie : sauté instance-remplie ; ajout : une écriture', async () => {
  const b = banc({ releve: { conteneurDuComposant: true } });
  const ajoutable = new Map([['a', modeleDe('prop', 'size.sm')]]);
  const rendu = await ecrireLesRegles([correction('ajouter', 'a'), correction('retirer', 'r')], () => {}, ajoutable, b.port);
  assert.deepEqual(rendu, { ecrites: ['a'], sautees: [{ id: 'r', motif: 'instance-remplie' }] });
  assert.deepEqual(b.appels, ['ajouter']);
});

test('deux ajouts du même composant : un seul appel, modèle fusionné dans l’ordre prop puis boolean', async () => {
  const b = banc({ releve: { conteneurDuComposant: true } });
  const deux = new Map([['b', modeleDe('boolean', 'disabled')], ['a', modeleDe('prop', 'size.sm', 'size.lg')]]);
  const rendu = await ecrireLesRegles([correction('ajouter', 'b'), correction('ajouter', 'a')], () => {}, deux, b.port);
  assert.deepEqual(rendu, { ecrites: ['b', 'a'], sautees: [] });
  assert.deepEqual(b.appels, ['ajouter']);
  assert.deepEqual(b.ajoutees[0], { nom: 'Alert', sections: [{ tag: 'prop', elements: [regle('prop', 'size.sm'), regle('prop', 'size.lg')] }, { tag: 'boolean', elements: [regle('boolean', 'disabled')] }] });
});

test('second passage, cibles déjà présentes : rien d’écrit, sauté objet-change', async () => {
  const b = banc({ releve: { conteneurDuComposant: true }, presentes: ['size.sm', 'Size.lg'] });
  const rendu = await ecrireLesRegles([correction('ajouter', 'a')], () => {}, new Map([['a', modeleDe('prop', 'size.sm', 'size.lg')]]), b.port);
  assert.deepEqual(rendu, { ecrites: [], sautees: [{ id: 'a', motif: 'objet-change' }] });
  assert.deepEqual(b.appels, []);
});

test('une correction déjà satisfaite ne bloque pas l’autre du groupe', async () => {
  const b = banc({ releve: { conteneurDuComposant: true }, presentes: ['size.sm'] });
  const deux = new Map([['a', modeleDe('prop', 'size.sm')], ['b', modeleDe('boolean', 'disabled')]]);
  const rendu = await ecrireLesRegles([correction('ajouter', 'a'), correction('ajouter', 'b')], () => {}, deux, b.port);
  assert.deepEqual(rendu, { ecrites: ['b'], sautees: [{ id: 'a', motif: 'objet-change' }] });
  assert.deepEqual(b.ajoutees[0].sections, [{ tag: 'boolean', elements: [regle('boolean', 'disabled')] }]);
});

test('un modèle absent de l’analyse : sauté objet-change', async () => {
  const b = banc({ releve: { conteneurDuComposant: true } });
  const rendu = await ecrireLesRegles([correction('ajouter', 'inconnue')], () => {}, new Map(), b.port);
  assert.deepEqual(rendu, { ecrites: [], sautees: [{ id: 'inconnue', motif: 'objet-change' }] });
  assert.deepEqual(b.appels, []);
});

test('ajout sans conteneur : sauté objet-change', async () => {
  const b = banc({ sansConteneur: true });
  const rendu = await ecrireLesRegles([correction('ajouter', 'a')], () => {}, new Map([['a', modeleDe('prop', 'size.sm')]]), b.port);
  assert.deepEqual(rendu, { ecrites: [], sautees: [{ id: 'a', motif: 'objet-change' }] });
  assert.deepEqual(b.appels, []);
});

test('ajout sans sources : erreur pour tout le groupe', async () => {
  const b = banc({ refus: true });
  const deux = new Map([['a', modeleDe('prop', 'size.sm')], ['b', modeleDe('boolean', 'disabled')]]);
  const rendu = await ecrireLesRegles([correction('ajouter', 'a'), correction('ajouter', 'b')], () => {}, deux, b.port);
  assert.deepEqual(rendu.sautees, [{ id: 'a', motif: 'erreur' }, { id: 'b', motif: 'erreur' }]);
  assert.deepEqual(b.appels, []);
});

test('l’écriture de l’ajout lève : erreur pour tout le groupe', async () => {
  const b = banc({ leveAjout: true });
  const deux = new Map([['a', modeleDe('prop', 'size.sm')], ['b', modeleDe('boolean', 'disabled')]]);
  const rendu = await ecrireLesRegles([correction('ajouter', 'a'), correction('ajouter', 'b')], () => {}, deux, b.port);
  assert.deepEqual(rendu, { ecrites: [], sautees: [{ id: 'a', motif: 'erreur' }, { id: 'b', motif: 'erreur' }] });
});

test('les corrections d’une autre sorte sont ignorées', async () => {
  const b = banc();
  const autre: Correction = { ...correction('creer'), sorte: 'liaison' };
  assert.deepEqual(await ecrireLesRegles([autre], () => {}, modeles, b.port), { ecrites: [], sautees: [] });
});

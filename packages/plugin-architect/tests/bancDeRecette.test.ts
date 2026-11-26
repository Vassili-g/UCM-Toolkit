/**
 * Le banc de recette (`scripts/recette.ts`, D15 second filet) : sa comparaison aux attentes, et la propriété du double de capture
 * dont il dépend. Le moteur n'y voit les enfants d'un nœud que si `'findAll' in noeud` répond vrai (plan, L18).
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Constat } from '@ucm-kit/core/controles';

import type { CaptureArchitect } from '../src/sandbox/capture';
import { comparerAuxAttentes, grouperLesConstats, type Attente } from '../scripts/recette';
import { doubleDepuisCapture } from './outils/capture';

const capture = {
  noeuds: {
    v1: { id: 'v1', type: 'COMPONENT', proprietes: { name: 'State=Default' } },
    l1: { id: 'l1', type: 'RECTANGLE', proprietes: { name: 'Fond' } },
  },
} as unknown as CaptureArchitect;

const constat = (code: string, type: Constat['type'], famille: Constat['famille'], faits: Constat['faits'] = {}, layers: string[] = []): Constat =>
  ({ id: `${code}:${JSON.stringify(faits)}`, code: code as Constat['code'], type, famille, variants: [], layers, faits });

const attente = (code: string, type: string, famille: string, nombre: number, cible?: string): Attente => ({ code, type, famille, nombre, ...(cible ? { cible } : {}), raison: 'raison de l’essai' });

test('le banc ne rend aucun écart quand chaque constat a son attente et que les nombres tombent juste', () => {
  const constats = [constat('C10', 'corriger', 'tailles', { segment: 'Large' }), constat('C10', 'corriger', 'tailles', { segment: 'Small' }), constat('C53', 'info', 'contraste', {}, ['l1'])];
  const attentes = [attente('C10', 'corriger', 'tailles', 2), attente('C53', 'info', 'contraste', 1, 'Fond')];
  assert.deepEqual(comparerAuxAttentes(constats, attentes, capture), []);
});

test('le banc nomme un constat imprévu, un nombre qui ne tombe pas juste et une attente sans constat', () => {
  const constats = [constat('C24', 'corriger', 'liaisons'), constat('C10', 'corriger', 'tailles', { segment: 'Large' })];
  const ecarts = comparerAuxAttentes(constats, [attente('C10', 'corriger', 'tailles', 3), attente('C83', 'verifier', 'variants', 1)], capture);
  assert.equal(ecarts.length, 3);
  assert.ok(ecarts.some((ecart) => ecart.startsWith('C10 corriger tailles : 3 attendu, 1 rendu(s)') && ecart.includes('raison de l’essai')));
  assert.ok(ecarts.some((ecart) => ecart.startsWith('C83 verifier variants : 1 attendu, 0 rendu(s)')));
  assert.ok(ecarts.some((ecart) => ecart.startsWith('C24 corriger liaisons imprévu')));
});

test('une cible restreint le compte aux constats qui la nomment, par le nom d’un layer ou la valeur d’un fait', () => {
  const constats = [constat('C50', 'info', 'contraste', { calque: 'Ring' }, ['l1']), constat('C50', 'info', 'contraste', { calque: 'Autre' })];
  assert.deepEqual(comparerAuxAttentes(constats, [attente('C50', 'info', 'contraste', 1, 'Fond'), attente('C50', 'info', 'contraste', 1, 'Autre')], capture), []);
  assert.equal(comparerAuxAttentes(constats, [attente('C50', 'info', 'contraste', 2, 'Fond')], capture).length, 2, 'un compte faux et un constat non couvert');
});

test('le banc groupe les constats par code, type et famille de constats, avec leur nombre', () => {
  const groupes = grouperLesConstats([constat('C10', 'corriger', 'tailles'), constat('C10', 'corriger', 'tailles'), constat('C53', 'info', 'contraste')]);
  assert.deepEqual(groupes.map(({ groupe, nombre }) => [groupe, nombre]), [['C10 corriger tailles', 2], ['C53 info contraste', 1]]);
});

test('le double d’une capture répond à `\'findAll\' in noeud` pour un nœud qui a des enfants, et rend ses descendants', () => {
  const proprietes = (id: string, type: string, enfants?: string[]) => ({ id, type, name: id, ...(enfants ? { children: enfants.map((enfant) => ({ $: 'noeud', id: enfant })) } : {}) });
  const monde = {
    version: 1, date: '', jeu: 'jeu', selection: [], page: 'p', limites: { noeudsTronques: false, textesDePageTronques: false },
    fichier: { nom: 'f', fileKey: undefined, profilDeCouleur: 'SRGB', donneesPartagees: {}, niveau: undefined },
    pages: { p: { id: 'p', proprietes: { id: 'p', type: 'PAGE', name: 'p' }, selection: [], criteres: {} } },
    noeuds: {
      jeu: { id: 'jeu', type: 'COMPONENT_SET', proprietes: proprietes('jeu', 'COMPONENT_SET', ['v']) },
      v: { id: 'v', type: 'COMPONENT', proprietes: proprietes('v', 'COMPONENT', ['t']) },
      t: { id: 't', type: 'VECTOR', proprietes: proprietes('t', 'VECTOR') },
    },
    noeudsParIdentifiant: {}, variables: {}, collections: {}, locales: { collections: [], variables: [] }, styles: {}, libraries: null,
  } as unknown as CaptureArchitect;
  const { noeud } = doubleDepuisCapture(monde);
  const jeu = noeud('jeu') as { findAll(): { id: string }[] };
  assert.equal('findAll' in noeud('jeu'), true);
  assert.equal('findAll' in noeud('v'), true);
  assert.equal('findAll' in noeud('t'), false, 'une feuille n’a pas d’enfant à chercher');
  assert.deepEqual(jeu.findAll().map(({ id }) => id), ['v', 't']);
});

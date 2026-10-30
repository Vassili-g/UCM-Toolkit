/** L'écriture des liaisons : une sorte d'écriture par test, relecture avant écriture, motifs sautés, un seul point d'annulation par lot. */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { Correction } from '@ucm-kit/core/controles';
import { texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';
import { releveVide } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import type { ModeleDeRegles } from 'ucm-plugin-socle/src/composant/template/modele';
import type { SourcesDeCreation } from 'ucm-plugin-socle/src/composant/template/sources';

import { ecrireLeLot, ecrireLesLiaisons, type ApiDeLiaisons } from '../src/ecriture/liaisons';
import type { PortDEcritureDesRegles } from '../src/ecriture/regles';
import { atelierDEcriture, type OptionsDeLEcriture, type VariableDEcriture } from './figmaDeTest';

const cible: VariableDEcriture = { id: 'V:1', key: 'k-cible', name: 'button/size/md/padding-x' };
const ancienne: VariableDEcriture = { id: 'V:0', key: 'k-ancienne', name: 'button/size/sm/padding-x' };
const couleur: VariableDEcriture = { id: 'V:2', key: 'k-couleur', name: 'theme/solid/primary/background' };

const liaison = (id: string, cibleDeLaCorrection: Correction['cible'], extras: Partial<Correction> = {}): Correction => ({
  id,
  sorte: 'liaison',
  cible: cibleDeLaCorrection,
  avant: null,
  apres: { cle: cible.key, nom: cible.name },
  aRelire: { regle: 'liaisons', avant: null },
  ...extras,
});

function atelier(options: OptionsDeLEcriture = {}) {
  const a = atelierDEcriture({ importables: [cible, couleur], lisibles: [ancienne], ...options });
  return { ...a, api: a.api as unknown as ApiDeLiaisons };
}

const solide = (): Record<string, unknown> => ({ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, boundVariables: {} });
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

test('un nombre : setBoundVariable du champ, sans point d’annulation', async () => {
  const a = atelier();
  const frame = a.layer('1:1', 'FRAME', { paddingLeft: 8 });
  const rendu = await ecrireLesLiaisons([liaison('c1', { layer: '1:1', champ: 'paddingLeft' })], a.api);
  assert.deepEqual(rendu, { ecrites: ['c1'], sautees: [] });
  assert.deepEqual(frame.boundVariables, { paddingLeft: alias('V:1') });
  assert.ok(a.journal.includes('lier:1:1.paddingLeft:k-cible'));
  assert.ok(!a.journal.includes('commitUndo'));
});

test('le fill d’une frame : peinture liée, tableau copié, indice remplacé, fills réaffecté', async () => {
  const a = atelier();
  const premiere = solide();
  const frame = a.layer('1:1', 'FRAME', { fills: [premiere, solide()] });
  const avant = frame.fills as unknown[];
  const rendu = await ecrireLesLiaisons([liaison('c1', { layer: '1:1', champ: 'fills', indice: 1 }, { apres: { cle: couleur.key, nom: couleur.name } })], a.api);
  assert.deepEqual(rendu, { ecrites: ['c1'], sautees: [] });
  const apres = frame.fills as Array<Record<string, unknown>>;
  assert.notEqual(apres, avant, 'le tableau est une copie');
  assert.equal(apres[0], premiere);
  assert.deepEqual(apres[1].boundVariables, { color: alias('V:2') });
  assert.deepEqual(a.journal.filter((ligne) => ligne.startsWith('peinture:') || ligne.startsWith('fills:')), ['peinture:k-couleur', 'fills:1:1']);
});

test('un stroke : strokes est réaffecté, fills reste intact', async () => {
  const a = atelier();
  const frame = a.layer('1:1', 'FRAME', { fills: [solide()], strokes: [solide()] });
  const rendu = await ecrireLesLiaisons([liaison('c1', { layer: '1:1', champ: 'strokes', indice: 0 })], a.api);
  assert.deepEqual(rendu.ecrites, ['c1']);
  assert.deepEqual(a.journal.filter((ligne) => ligne.startsWith('strokes:') || ligne.startsWith('fills:')), ['strokes:1:1']);
  assert.deepEqual((frame.strokes as Array<Record<string, unknown>>)[0].boundVariables, { color: alias('V:1') });
});

test('un texte : setRangeFills sur la plage, avec la peinture liée', async () => {
  const a = atelier();
  const texte = a.layer('1:1', 'TEXT', { segments: [{ start: 0, end: 5, fills: [solide()] }, { start: 5, end: 9, fills: [solide()] }] });
  const rendu = await ecrireLesLiaisons([liaison('c1', { layer: '1:1', champ: 'fills', indice: 0, plage: { debut: 5, fin: 9 } })], a.api);
  assert.deepEqual(rendu, { ecrites: ['c1'], sautees: [] });
  assert.ok(a.journal.includes('plage:1:1[5-9]'));
  const segments = texte.segments as Array<{ fills: Array<Record<string, unknown>> }>;
  assert.deepEqual(segments[1].fills[0].boundVariables, { color: alias('V:1') });
  assert.deepEqual(segments[0].fills[0].boundVariables, {});
});

test('une variable cible s’importe une fois par lot, même pour plusieurs layers', async () => {
  const a = atelier();
  a.layer('1:1', 'FRAME', { paddingLeft: 8 });
  a.layer('1:2', 'FRAME', { paddingRight: 8 });
  const rendu = await ecrireLesLiaisons([liaison('c1', { layer: '1:1', champ: 'paddingLeft' }), liaison('c2', { layer: '1:2', champ: 'paddingRight' })], a.api);
  assert.deepEqual(rendu.ecrites, ['c1', 'c2']);
  assert.equal(a.journal.filter((ligne) => ligne === 'import:k-cible').length, 1);
});

test('une variable locale se lie sans import', async () => {
  const a = atelier({ locales: [cible], importables: [] });
  a.layer('1:1', 'FRAME', { paddingLeft: 8 });
  const rendu = await ecrireLesLiaisons([liaison('c1', { layer: '1:1', champ: 'paddingLeft' })], a.api);
  assert.deepEqual(rendu.ecrites, ['c1']);
  assert.ok(!a.journal.some((ligne) => ligne.startsWith('import:')));
});

test('un layer disparu ou un variant qui n’a plus les mêmes valeurs : sautée objet-change, rien d’écrit', async () => {
  const a = atelier();
  const jeu = { id: '0:5', type: 'COMPONENT_SET', parent: a.page };
  const variant = a.layer('2:1', 'COMPONENT', { name: 'Taille=lg, Etat=repos' }, jeu);
  a.layer('1:1', 'FRAME', { paddingLeft: 8 }, variant);
  const rendu = await ecrireLesLiaisons([
    liaison('absent', { layer: '9:9', champ: 'paddingLeft' }),
    liaison('variant', { layer: '1:1', champ: 'paddingLeft' }, { aRelire: { regle: 'liaisons', avant: null, axes: { Taille: 'md', Etat: 'repos' } } }),
  ], a.api);
  assert.deepEqual(rendu, { ecrites: [], sautees: [{ id: 'absent', motif: 'objet-change' }, { id: 'variant', motif: 'objet-change' }] });
  assert.ok(!a.journal.some((ligne) => ligne.startsWith('lier:')));
});

test('les valeurs du variant égales à aRelire.axes laissent écrire', async () => {
  const a = atelier();
  const jeu = { id: '0:5', type: 'COMPONENT_SET', parent: a.page };
  const variant = a.layer('2:1', 'COMPONENT', { name: 'Taille=md, Etat=repos' }, jeu);
  a.layer('1:1', 'FRAME', { paddingLeft: 8 }, variant);
  const rendu = await ecrireLesLiaisons([liaison('c1', { layer: '1:1', champ: 'paddingLeft' }, { aRelire: { regle: 'liaisons', avant: null, axes: { Etat: 'repos', Taille: 'md' } } })], a.api);
  assert.deepEqual(rendu.ecrites, ['c1']);
});

test('une liaison qui n’est plus celle de l’analyse : sautée fait-faux, nom lu comparé à aRelire.avant', async () => {
  const a = atelier();
  a.layer('1:1', 'FRAME', { paddingLeft: 8, boundVariables: { paddingLeft: alias('V:0') } });
  a.layer('1:2', 'FRAME', { paddingLeft: 8 });
  const attendue = { avant: ancienne.name, aRelire: { regle: 'liaisons', avant: ancienne.name } };
  const rendu = await ecrireLesLiaisons([
    liaison('lie-autre', { layer: '1:1', champ: 'paddingLeft' }),
    liaison('lie-attendu', { layer: '1:1', champ: 'paddingLeft' }, attendue),
    liaison('devenu-libre', { layer: '1:2', champ: 'paddingLeft' }, attendue),
  ], a.api);
  assert.deepEqual(rendu, { ecrites: ['lie-attendu'], sautees: [{ id: 'lie-autre', motif: 'fait-faux' }, { id: 'devenu-libre', motif: 'fait-faux' }] });
});

test('une peinture absente : objet-change ; un dégradé : fait-faux', async () => {
  const a = atelier();
  a.layer('1:1', 'FRAME', { fills: [solide(), { type: 'GRADIENT_LINEAR', boundVariables: {} }] });
  const rendu = await ecrireLesLiaisons([
    liaison('absente', { layer: '1:1', champ: 'fills', indice: 5 }),
    liaison('degrade', { layer: '1:1', champ: 'fills', indice: 1 }),
  ], a.api);
  assert.deepEqual(rendu.sautees, [{ id: 'absente', motif: 'objet-change' }, { id: 'degrade', motif: 'fait-faux' }]);
  assert.ok(!a.journal.includes('fills:1:1'));
});

test('une cible qui ne s’importe pas ou sans clé : cible-introuvable ; une écriture qui lève : erreur ; la suivante s’écrit', async () => {
  const a = atelier({ refusees: new Set(['1:2']) });
  a.layer('1:1', 'FRAME', { paddingLeft: 8 });
  a.layer('1:2', 'FRAME', { paddingLeft: 8 });
  a.layer('1:3', 'FRAME', { paddingLeft: 8 });
  const rendu = await ecrireLesLiaisons([
    liaison('inconnue', { layer: '1:1', champ: 'paddingLeft' }, { apres: { cle: 'k-fantome', nom: 'x' } }),
    liaison('sans-cle', { layer: '1:1', champ: 'paddingLeft' }, { apres: { nom: 'x' } }),
    liaison('refus', { layer: '1:2', champ: 'paddingLeft' }),
    liaison('bonne', { layer: '1:3', champ: 'paddingLeft' }),
  ], a.api);
  assert.deepEqual(rendu, { ecrites: ['bonne'], sautees: [{ id: 'inconnue', motif: 'cible-introuvable' }, { id: 'sans-cle', motif: 'cible-introuvable' }, { id: 'refus', motif: 'erreur' }] });
});

test('un fichier qui ne déclare plus UCM ne reçoit rien', async () => {
  for (const declaration of [texteDeLArchitectureDuFichier(false), '', '{']) {
    const a = atelier({ declaration });
    a.layer('1:1', 'FRAME', { paddingLeft: 8 });
    const rendu = await ecrireLesLiaisons([liaison('c1', { layer: '1:1', champ: 'paddingLeft' })], a.api);
    assert.deepEqual(rendu, { ecrites: [], sautees: [{ id: 'c1', motif: 'non-ucm' }] }, declaration);
    assert.deepEqual(a.journal, []);
  }
});

test('les corrections d’une autre sorte sont ignorées', async () => {
  const a = atelier();
  a.layer('1:1', 'FRAME', { paddingLeft: 8 });
  const rendu = await ecrireLesLiaisons([{ ...liaison('c1', { layer: '1:1', champ: 'paddingLeft' }), sorte: 'scope' }], a.api);
  assert.deepEqual(rendu, { ecrites: [], sautees: [] });
  assert.deepEqual(a.journal, []);
});

const modele: ModeleDeRegles = { nom: 'Alert', sections: [] };

test('un lot : liaisons et règles écrites, puis un seul commitUndo, après toutes les écritures', async () => {
  const a = atelier();
  a.layer('1:1', 'FRAME', { paddingLeft: 8 });
  a.layer('1:2', 'FRAME', { fills: [solide()] });
  const regles: Correction = { id: 'regles:creer:3:3', sorte: 'regles', cible: { layer: '3:3' }, avant: null, apres: { nom: 'creer' }, aRelire: { regle: 'regles', avant: null } };
  const port: PortDEcritureDesRegles = {
    composant: async () => ({ id: '3:3' } as ComponentSetNode),
    releve: async () => releveVide(),
    resoudre: async () => ({ sources: {} as SourcesDeCreation, refus: null }),
    presentes: async () => new Set(),
    conteneur: async () => null,
    ajouter: async () => ({ conteneur: {} as InstanceNode, regles: 0 }),
    creer: async () => { a.journal.push('regles'); return { conteneur: {} as InstanceNode, regles: 3 }; },
  };
  const rendu = await ecrireLeLot([
    liaison('c1', { layer: '1:1', champ: 'paddingLeft' }),
    regles,
    liaison('c2', { layer: '1:2', champ: 'fills', indice: 0 }),
  ], { modeles: new Map([[regles.id, modele]]), portDeRegles: port }, a.api);
  assert.deepEqual(rendu, { ecrites: ['c1', 'c2', regles.id], sautees: [] });
  assert.equal(a.journal.filter((ligne) => ligne === 'commitUndo').length, 1);
  assert.equal(a.journal[a.journal.length - 1], 'commitUndo');
  assert.ok(a.journal.includes('regles'));
});

test('un lot dans un fichier qui ne déclare plus UCM n’écrit ni liaison ni instance de règles', async () => {
  const a = atelier({ declaration: texteDeLArchitectureDuFichier(false) });
  a.layer('1:1', 'FRAME', { paddingLeft: 8 });
  const regles: Correction = { id: 'regles:creer:3:3', sorte: 'regles', cible: { layer: '3:3' }, avant: null, apres: { nom: 'creer' }, aRelire: { regle: 'regles', avant: null } };
  const port: PortDEcritureDesRegles = {
    composant: async () => ({ id: '3:3' } as ComponentSetNode),
    releve: async () => releveVide(),
    resoudre: async () => ({ sources: {} as SourcesDeCreation, refus: null }),
    presentes: async () => new Set(),
    conteneur: async () => null,
    ajouter: async () => ({ conteneur: {} as InstanceNode, regles: 0 }),
    creer: async () => { a.journal.push('regles'); return { conteneur: {} as InstanceNode, regles: 3 }; },
  };
  const rendu = await ecrireLeLot([liaison('c1', { layer: '1:1', champ: 'paddingLeft' }), regles], { modeles: new Map([[regles.id, modele]]), portDeRegles: port }, a.api);
  assert.deepEqual(rendu, { ecrites: [], sautees: [{ id: 'c1', motif: 'non-ucm' }, { id: regles.id, motif: 'non-ucm' }] });
  assert.deepEqual(a.journal, []);
});

test('un lot sans aucune écriture ne pose pas de point d’annulation', async () => {
  const a = atelier();
  const rendu = await ecrireLeLot([liaison('c1', { layer: '9:9', champ: 'paddingLeft' })], {}, a.api);
  assert.deepEqual(rendu.ecrites, []);
  assert.ok(!a.journal.includes('commitUndo'));
});

test('un point d’annulation refusé ne retire pas les écritures', async () => {
  const a = atelier();
  a.layer('1:1', 'FRAME', { paddingLeft: 8 });
  const api = { ...a.api, commitUndo() { throw new Error('refus'); } } as ApiDeLiaisons;
  const rendu = await ecrireLeLot([liaison('c1', { layer: '1:1', champ: 'paddingLeft' })], {}, api);
  assert.deepEqual(rendu.ecrites, ['c1']);
});

test('une valeur lue par l’analyse qui a changé : sautée fait-faux ; la même valeur laisse écrire', async () => {
  const a = atelier();
  const frame = a.layer('1:1', 'FRAME', { cornerRadius: 12 });
  const c29 = (id: string, valeur: number): Correction => liaison(id, { layer: '1:1', champ: 'cornerRadius' }, { aRelire: { regle: 'liaisons', avant: null, valeur } });
  const rendu = await ecrireLesLiaisons([c29('lue-13', 13), c29('lue-12', 12)], a.api);
  assert.deepEqual(rendu, { ecrites: ['lue-12'], sautees: [{ id: 'lue-13', motif: 'fait-faux' }] });
  assert.deepEqual(frame.boundVariables, { cornerRadius: alias('V:1') });
  assert.deepEqual(a.journal.filter((ligne) => ligne.startsWith('lier:')), ['lier:1:1.cornerRadius:k-cible']);
});

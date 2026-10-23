/** Le contraste d'une paire et les préférences rangées. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { contraste } from '@ucm-kit/core/emplois';
import { p3VersRgb8 } from 'ucm-couleur';

import { jugerContraste, ratioAffiche } from '../src/contraste';
import { indexer } from '../src/indexation';
import type { Releve } from '../src/modele';
import { creerPreferences, PREFERENCES_PAR_DEFAUT, preferencesValides } from '../src/preferences';
import { resoudre } from '../src/resolution';
import { constructeur, projetLibre } from './fixtures';

const index = indexer(projetLibre());

test('le contraste d’une paire opaque est celui du kit, tronqué à l’affichage', () => {
  const jugement = jugerContraste(resoudre(index, 'encre', {}), resoudre(index, 'papier', {}), 4.5);
  assert.equal(jugement.statut, 'juge');
  if (jugement.statut !== 'juge') return;
  assert.equal(jugement.ratio, contraste([0x22, 0x26, 0x30], [0xf7, 0xf8, 0xfa]));
  assert.equal(jugement.atteint, true);
  assert.equal(ratioAffiche(4.4999), '4,49');
});

test('une transparence, une chaîne qui n’aboutit pas ou un fond non couleur ne se jugent pas', () => {
  assert.deepEqual(jugerContraste(resoudre(index, 'voile', {}), resoudre(index, 'papier', {}), 3), { statut: 'non-juge', raison: 'transparence' });
  assert.deepEqual(jugerContraste(resoudre(index, 'legacy', {}), resoudre(index, 'papier', {}), 3), { statut: 'non-juge', raison: 'non-resolu' });
  assert.deepEqual(jugerContraste(resoudre(index, 'encre', {}), resoudre(index, 'zero', {}), 3), { statut: 'non-juge', raison: 'pas-une-couleur' });
});

test('les préférences illisibles prennent leur défaut, et les rangements gardent leur ordre', async () => {
  assert.deepEqual(preferencesValides(null), PREFERENCES_PAR_DEFAUT);
  assert.deepEqual(preferencesValides({ vueCompacte: 'oui', palettes: true, associations: { f: { c: 'usage' } } }), PREFERENCES_PAR_DEFAUT);
  assert.deepEqual(preferencesValides({ largeurs: { arbre: 300, nom: '240', type: -4, autre: 12 } }).largeurs, { arbre: 300 });
  assert.deepEqual(preferencesValides({ largeurs: [300] }).largeurs, {});
  const ranges: unknown[] = [];
  let refuser = true;
  const preferences = creerPreferences({
    getAsync: async () => ranges[ranges.length - 1],
    setAsync: async (_cle, valeur) => {
      await new Promise((resolve) => setTimeout(resolve, refuser ? 5 : 0));
      if (refuser) {
        refuser = false;
        throw new Error('refus');
      }
      ranges.push(valeur);
    },
  });
  const premier = preferences.ranger({ ...PREFERENCES_PAR_DEFAUT, vueCompacte: true });
  const second = preferences.ranger({ ...PREFERENCES_PAR_DEFAUT, largeurs: { arbre: 300 } });
  assert.deepEqual([await premier, await second], [false, true]);
  assert.deepEqual((await preferences.lire()).largeurs, { arbre: 300 });
});

test('les mêmes canaux donnent un autre contraste en Display P3 qu’en sRGB, celui des couleurs converties par p3VersRgb8', () => {
  const c = constructeur('Couleurs');
  c.collection('c', 'Couleurs', ['M']);
  const premierPlan = { r: 0.9, g: 0.2, b: 0.2, a: 1 };
  const fond = { r: 0.2, g: 0.6, b: 0.3, a: 1 };
  c.variable('texte', 'c', 'texte', 'COLOR', { M: { nature: 'couleur', couleur: premierPlan } });
  c.variable('fond', 'c', 'fond', 'COLOR', { M: { nature: 'couleur', couleur: fond } });
  const releve: Releve = c.releve();
  const jugement = (espace?: 'display-p3' | 'srgb') => {
    const indexe = indexer(espace ? { ...releve, espace } : releve);
    return jugerContraste(resoudre(indexe, 'texte', {}), resoudre(indexe, 'fond', {}), 3, espace);
  };
  const srgb = jugement('srgb');
  const p3 = jugement('display-p3');
  assert.equal(srgb.statut, 'juge');
  assert.equal(p3.statut, 'juge');
  if (srgb.statut !== 'juge' || p3.statut !== 'juge') return;
  const octets = (couleur: { r: number; g: number; b: number }): [number, number, number] => [couleur.r, couleur.g, couleur.b].map((canal) => Math.round(canal * 255)) as [number, number, number];
  assert.equal(srgb.ratio, contraste(octets(premierPlan), octets(fond)));
  assert.equal(p3.ratio, contraste(p3VersRgb8([0.9, 0.2, 0.2]).couleur, p3VersRgb8([0.2, 0.6, 0.3]).couleur));
  assert.notEqual(p3.ratio, srgb.ratio);
  // Sans espace donné, le contraste se calcule en sRGB.
  const sansEspace = jugement();
  assert.equal(sansEspace.statut === 'juge' ? sansEspace.ratio : null, srgb.ratio);
});

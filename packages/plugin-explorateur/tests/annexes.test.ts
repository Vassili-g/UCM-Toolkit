/** Le contraste d'une paire, le rapport exporté et les préférences rangées. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { contraste } from '@ucm-kit/core/emplois';

import { jugerContraste, ratioAffiche } from '../src/contraste';
import { diagnostiquer } from '../src/diagnostics';
import { indexer } from '../src/indexation';
import { creerPreferences, PREFERENCES_PAR_DEFAUT, preferencesValides } from '../src/preferences';
import { FORMAT_DU_RAPPORT, rapportDeDiagnostic } from '../src/rapport';
import { creerResolveur, resoudre } from '../src/resolution';
import { projetLibre } from './fixtures';

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

test('le rapport est versionné et garde contexte, révision, portée, chaîne et constat', () => {
  const contexte = { couleurs: 'couleurs:Jour' };
  const rapport = rapportDeDiagnostic(index, contexte, diagnostiquer(creerResolveur(index), contexte));
  assert.equal(rapport.format, FORMAT_DU_RAPPORT);
  assert.equal(rapport.version, 1);
  assert.deepEqual(rapport.contexte, [{ collection: 'couleurs', nom: 'Couleurs', mode: 'couleurs:Jour', nomDuMode: 'Jour' }]);
  assert.deepEqual(rapport.portee.manquees, ['distante-absente']);
  const inaccessible = rapport.constats.find((constat) => constat.nature === 'inaccessible');
  assert.deepEqual(inaccessible?.chemin.map((etape) => etape.source), ['→ distante-absente']);
  assert.equal(JSON.parse(JSON.stringify(rapport)).constats.length, 2);
});

test('les préférences illisibles prennent leur défaut, et les rangements gardent leur ordre', async () => {
  assert.deepEqual(preferencesValides(null), PREFERENCES_PAR_DEFAUT);
  assert.deepEqual(preferencesValides({ vueCompacte: 'oui', associations: { f: { c: 'usage', d: 3 } }, exceptions: { f: ['a', 2] } }), { ...PREFERENCES_PAR_DEFAUT, associations: { f: { c: 'usage' } }, exceptions: { f: ['a'] } });
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
  const second = preferences.ranger({ ...PREFERENCES_PAR_DEFAUT, palettes: true });
  assert.deepEqual([await premier, await second], [false, true]);
  assert.equal((await preferences.lire()).palettes, true);
});

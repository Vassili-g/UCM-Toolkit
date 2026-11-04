/**
 * Garde le rejeu des fichiers réels (mode Tokens) sur un document DTCG fabriqué ici : la conversion en catalogue et son bilan, le
 * déterminisme des contrôles (R2), l'application d'une correction `alias-de-mode` (R4) et un injecteur de R5 avec son oracle.
 * Aucun fichier réel n'est lu ; le rejeu complet se lance par `npm run stress:rejeu`, hors de `npm test`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Correction } from '../src/controles/index.js';
import { cleAttendue } from './stress/f2-structure/cas.js';
import { catalogueDepuisTokens } from './stress/rejeu-fichiers/dtcg.js';
import { INJECTEURS, appliquer, cleComplete, lire, r2Determinisme } from './stress/rejeu-fichiers/proprietes.js';

const couleur = (r: number) => ({ colorSpace: 'srgb', components: [r, 0.2, 0.3], alpha: 1 });

const DOCUMENT = {
  $extensions: { 'com.ucm.formatVersion': 2, 'com.ucm.axes': { theme: { modes: ['light', 'dark'], default: 'light' } } },
  primitives: {
    red: { 500: { $type: 'color', $value: couleur(0.9) } },
    text: { h1: { $type: 'typography', $value: { fontSize: 12 } } },
  },
  theme: {
    page: {
      bg: { $type: 'color', $value: '{primitives.red.500}', $extensions: { 'com.ucm.modes': { light: '{primitives.red.500}', dark: '{primitives.absente.500}' } } },
      fg: { $type: 'color', $value: '{primitives.red.500}' },
    },
  },
};

test('la conversion rend deux collections, les modes de l\'axe, un jeton composé sauté et un alias non résolu gardé', () => {
  const { catalogue, bilan } = catalogueDepuisTokens(structuredClone(DOCUMENT));
  assert.deepEqual(catalogue.collections.map((c) => [c.cle, c.role, c.modes.map((m) => m.nom)]), [['primitives', 'primitives', ['base']], ['theme', 'theme', ['light', 'dark']]]);
  assert.deepEqual(catalogue.variables.map((v) => v.cle), ['primitives|red/500', 'theme|page/bg', 'theme|page/fg']);
  assert.equal(bilan.jetonsSautes, 1);
  assert.deepEqual(bilan.jetonsSautesParType, { typography: 1 });
  assert.deepEqual([bilan.aliasTotal, bilan.aliasResolus, bilan.aliasNonResolus], [4, 3, 1]);
  const bg = catalogue.variables.find((v) => v.cle === 'theme|page/bg')!;
  assert.deepEqual(bg.valeurs, { light: { alias: 'primitives|red/500' }, dark: { alias: 'primitives|absente/500' } });
  assert.deepEqual(catalogue.variables[0].valeurs, { base: { valeur: { r: 0.9, g: 0.2, b: 0.3, a: 1 } } });
});

test('R2 : deux exécutions rendent les mêmes constats, dont l\'alias supprimé', () => {
  const { catalogue } = catalogueDepuisTokens(structuredClone(DOCUMENT));
  const base = lire(catalogue);
  assert.ok(base.constats.some((c) => c.code === 'C63' && c.faits.genre === 'alias-supprime'));
  assert.equal(r2Determinisme(catalogue, base).nombres.differences, 0);
});

test('R4 : une correction alias-de-mode appliquée à la copie retire le constat de l\'alias supprimé', () => {
  const { catalogue } = catalogueDepuisTokens(structuredClone(DOCUMENT));
  const correction: Correction = {
    id: 'C63:theme|page/bg:dark:alias-supprime', sorte: 'alias-de-mode', cible: { variable: 'theme|page/bg', mode: 'dark' }, avant: 'primitives|absente/500',
    apres: { cle: 'primitives|red/500', nom: 'red/500' }, aRelire: { regle: 'test', avant: null },
  };
  const copie = structuredClone(catalogue);
  assert.equal(appliquer(copie, correction), true);
  assert.equal(lire(catalogue).constats.filter((c) => c.faits.genre === 'alias-supprime').length, 1);
  assert.equal(lire(copie).constats.filter((c) => c.faits.genre === 'alias-supprime').length, 0);
});

test('R5 : l\'injecteur de valeur absente est détecté sous le code et la clé de L4', () => {
  const { catalogue } = catalogueDepuisTokens(structuredClone(DOCUMENT));
  const injecteur = INJECTEURS.find((entree) => entree.operateur === 'L4')!;
  const cible = injecteur.cibles(catalogue).find(({ variable }) => variable.cle === 'primitives|red/500')!;
  const attendus = injecteur.appliquer(catalogue, cible);
  assert.deepEqual(attendus, [{ code: 'C63', cle: cleAttendue('sans-valeur-en-mode', 'red/500', 'base') }]);
  const cles = new Set(lire(catalogue).constats.map(cleComplete));
  assert.ok(attendus.every(({ code, cle }) => cles.has(`${code}|${cle}`)));
  // Sans collection `theme` lue, l'injecteur de scope n'a aucune cible : C82 `scopes` ne s'exécute pas.
  const sansTheme = INJECTEURS.find((entree) => entree.operateur === 'S2')!;
  assert.deepEqual(sansTheme.cibles({ ...catalogue, collections: catalogue.collections.filter((c) => c.role !== 'theme') }), []);
});

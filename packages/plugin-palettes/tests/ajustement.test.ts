/**
 * Ajuster la référence (W7), en réponse R1 de la maquette Z10.4 : la modale
 * règle la luminosité du profil porteur, par pas de 0,01, et « Appliquer » la
 * pose comme la carte des réglages.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, validerRecette, type Palette } from 'ucm-couleur';

import {
  changementAuPasVoisin,
  garantiesComparees,
  manqueesParIntensite,
  nuancesVisees,
  paletteAuPas,
  pasALOuverture,
  pasLePlusProche,
  propositionAuPas,
} from '../src/ajustementDeLaReference';
import { ajouter, changerReference, nouvellePalette, revenirALOriginale } from '../src/edition';

const RECETTE = recetteParDefaut();
const VERT: Palette = { ...nouvellePalette(RECETTE, 'p-0000000b', '#16A34A', 2)!, nom: 'Vert' };
const auPas = (palette: Palette, pas: number): Palette => paletteAuPas(RECETTE, palette, pas)!;

test('W7.2 : sans pas, la proposition est l’originale elle-même ; un pas sombre sur #16A34A donne #0DA047 ; les pas s’arrêtent aux bornes de la luminosité', () => {
  assert.equal(pasALOuverture(RECETTE, VERT), 0);
  assert.equal(propositionAuPas(RECETTE, VERT, 0), '#16A34A');
  assert.equal(propositionAuPas(RECETTE, VERT, -1), '#0DA047');
  assert.ok(propositionAuPas(RECETTE, VERT, -5));
  assert.equal(propositionAuPas(RECETTE, VERT, -6), null, 'au-delà de −0,05, aucun pas');
  assert.equal(propositionAuPas(RECETTE, VERT, 3), null, 'au-delà de +0,02, aucun pas');
});

test('R1 : Appliquer pose la luminosité du porteur, garde l’originale, et le ◆ garde sa nuance', () => {
  const ajustee = auPas(VERT, -1);
  assert.equal(ajustee.reference, '#0DA047');
  assert.equal(ajustee.originale, '#16A34A');
  assert.deepEqual(ajustee.reglages, { porteur: 'vivid', clarte: { vivid: -0.01 } });
  assert.deepEqual(nuancesVisees(RECETTE, ajustee), nuancesVisees(RECETTE, VERT), 'la rampe se translate avec la référence');
  assert.ok('recette' in validerRecette(ajouter(RECETTE, ajustee)), 'la recette ajustée se range');
  // Rouvrir la modale repart du pas rangé ; un second ajustement garde l'originale du premier.
  assert.equal(pasALOuverture(RECETTE, ajustee), -1);
  assert.equal(auPas(ajustee, -2).originale, '#16A34A');
});

test('R1 : Revenir à l’originale, ou le pas zéro, rend la palette de départ', () => {
  const ajustee = auPas(VERT, -2);
  assert.deepEqual(revenirALOriginale(RECETTE, ajustee), VERT);
  assert.deepEqual(auPas(ajustee, 0), VERT);
  assert.equal(revenirALOriginale(RECETTE, VERT), VERT, 'une palette jamais ajustée ne change pas');
});

test('W7.5 : un code saisi dans la configuration est une nouvelle référence, qui retire l’originale et les réglages', () => {
  const saisie = changerReference(RECETTE, auPas(VERT, -1), '#15803D')!;
  assert.equal(saisie.reference, '#15803D');
  assert.equal('originale' in saisie, false);
  assert.equal('reglages' in saisie, false);
});

test('R1 : un pas de luminosité ne change plus le numéro de la référence', () => {
  for (let pas = -5; pas < 2; pas += 1) assert.deepEqual(changementAuPasVoisin(RECETTE, VERT, pas, 1), [], `pas ${pas}`);
  assert.equal(changementAuPasVoisin(RECETTE, VERT, 2, 1), null, 'hors des bornes');
});

test('W7.2 : les garanties se comparent avant et après : #16A34A en manque en Light, deux pas plus sombres les tiennent', () => {
  const ajustee = auPas(VERT, -2);
  const vivid = (liste: ReturnType<typeof manqueesParIntensite>) => liste.find(({ intensite }) => intensite === 'vivid')!.manquees;
  const avant = manqueesParIntensite(RECETTE, VERT);
  assert.deepEqual(avant.map(({ intensite }) => intensite), ['soft', 'vivid']);
  assert.ok(vivid(avant) > 0, 'l’originale manque des garanties en Vivid');
  assert.equal(vivid(manqueesParIntensite(RECETTE, ajustee)), 0);
  const comparees = garantiesComparees(RECETTE, VERT, ajustee);
  assert.ok(comparees.length > 0);
  assert.ok(comparees.every(({ avant: a, apres: b }) => a.paire.numero === b.paire.numero && a.mode === b.mode && a.profil === b.profil));
  assert.ok(comparees.some(({ avant: a, apres: b }) => a.verdict === 'manquee' && b.verdict === 'tenue'));
});

test('W7.2 : un code saisi dans la modale prend le pas dont la proposition lui ressemble le plus', () => {
  assert.equal(pasLePlusProche(RECETTE, VERT, '#0DA047'), -1);
  assert.equal(pasLePlusProche(RECETTE, VERT, '#16A34A'), 0);
  assert.equal(pasLePlusProche(RECETTE, VERT, '#000000'), -5, 'le pas extrême le plus proche');
});

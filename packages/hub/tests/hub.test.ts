/** Le modèle du hub juge comme le moteur sans essai et applique un essai ; la page commitée est à jour. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { verifierPromesses } from 'ucm-couleur';
import { construireModele, harmonisation, lireRecette, recetteDeDemonstration } from '../src/modele/modele';
import { CHEMIN_DU_HUB, genererHub } from '../src/generer';

const sansRetourChariot = (texte: string): string => texte.replace(/\r\n/g, '\n');

test('sans essai, le modèle juge les promesses du moteur, une à une', () => {
  const recette = recetteDeDemonstration();
  const modele = construireModele(recette);
  const garanties = modele.mesures.filter((mesure) => mesure.regle.startsWith('G'));
  const promesses = recette.palettes.flatMap((palette) => verifierPromesses(recette, palette));
  assert.equal(garanties.length, promesses.length);
  const verdicts = (liste: readonly { contraste?: number; ratio?: number; verdict?: string; tenue?: boolean }[]) =>
    liste.map((element) => `${(element.ratio ?? element.contraste)!.toFixed(6)}:${element.tenue ?? element.verdict === 'tenue'}`).sort();
  assert.deepEqual(verdicts(garanties), verdicts(promesses));
});

test('un cran modifié dans la table change la couleur que la garantie juge', () => {
  const recette = recetteDeDemonstration();
  const modele = construireModele(recette, { table: { light: { 'surface/border': 700 } }, exigences: { fondsSurvoles: true, fondsAppuyes: true } });
  const g4 = modele.mesures.filter((mesure) => mesure.regle === 'G4' && mesure.mode === 'light');
  assert.ok(g4.length > 0);
  assert.ok(g4.every((mesure) => mesure.premier.teinte.cran === 700));
});

test('sans les fonds appuyés, aucune garantie ne se juge contre solid/pressed ni surface/pressed', () => {
  const recette = recetteDeDemonstration();
  const avec = construireModele(recette).mesures.filter((mesure) => mesure.regle.startsWith('G'));
  const sans = construireModele(recette, { table: {}, exigences: { fondsSurvoles: true, fondsAppuyes: false } }).mesures.filter((mesure) => mesure.regle.startsWith('G'));
  assert.ok(sans.length < avec.length);
  assert.ok(sans.every((mesure) => !mesure.second.nom.endsWith('/pressed')));
});

test('l’harmonisation compare les palettes colorées seulement', () => {
  const modele = construireModele(recetteDeDemonstration());
  const grises = modele.palettes.filter((palette) => palette.grise).map((palette) => palette.rang);
  assert.ok(grises.length > 0);
  for (const ligne of harmonisation(modele, 'soft', 'light')) {
    assert.ok(ligne.lectures.every((lecture) => !grises.includes(lecture.palette)));
  }
});

test('le hub lit une recette exportée et refuse un texte qui n’en est pas une', () => {
  const lue = lireRecette(JSON.stringify(recetteDeDemonstration()));
  assert.ok('recette' in lue && lue.recette.palettes.length === 6);
  assert.ok('erreur' in lireRecette('{"palettes": 3}'));
});

test('la page commitée est à jour', () => {
  const attendu = genererHub();
  const commite = sansRetourChariot(readFileSync(CHEMIN_DU_HUB, 'utf8'));
  assert.ok(commite === attendu, "La vue n'est plus à jour. Lancez `npm run vues`.");
});

test('le hub est autonome et tient sous 1 Mo', () => {
  const page = genererHub();
  assert.ok(Buffer.byteLength(page) < 1_000_000);
  assert.deepEqual(page.match(/https?:\/\/|<script src|<link|@import|url\(/g), null);
});

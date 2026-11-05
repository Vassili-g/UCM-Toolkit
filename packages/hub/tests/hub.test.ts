/** Le modèle du hub juge comme le moteur sans essai et applique un essai ; la page commitée est à jour. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { svgDuSigne } from '@ucm-kit/core/referentiel';
import { verifierPromesses } from 'ucm-couleur';
import { svgDeLAlerte } from 'ucm-plugin-socle/src/ui/Alerte';
import { VARIABLES_DU_BANC, construireModele, harmonisation, lireRecette, recetteDeDemonstration } from '../src/modele/modele';
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

test('surface/divider et surface/subtle viennent de la table du kit, une seule fois chacun', () => {
  const modele = construireModele(recetteDeDemonstration());
  assert.equal(VARIABLES_DU_BANC.filter((variable) => variable === 'surface/divider').length, 1);
  assert.equal(VARIABLES_DU_BANC.filter((variable) => variable === 'surface/subtle').length, 1);
  assert.deepEqual([modele.table.light['surface/divider'], modele.table.dark['surface/divider']], [300, 500]);
  assert.deepEqual([modele.table.light['surface/subtle'], modele.table.dark['surface/subtle']], [50, 100]);
  const jeu = modele.jeux.find((autre) => autre.palette.aDesDossiers && autre.mode === 'light')!;
  assert.equal(jeu.v['surface/subtle']?.cran, 50);
  assert.equal(jeu.v['surface/divider']?.cran, 300);
});

test('les garanties 8 et 9 se jugent dans le banc, avec les fonds de la palette', () => {
  const mesures = construireModele(recetteDeDemonstration()).mesures;
  const g8 = mesures.filter((mesure) => mesure.regle === 'G8');
  const g9 = mesures.filter((mesure) => mesure.regle === 'G9');
  assert.ok(g8.length > 0 && g9.length > 0);
  assert.ok(g8.every((mesure) => mesure.premier.nom === 'surface/foreground' && mesure.second.nom === 'surface/pressed'));
  assert.ok(g9.every((mesure) => mesure.premier.nom === 'page/foreground' && ['surface/default', 'surface/hover'].includes(mesure.second.nom)));
  assert.deepEqual([...new Set(g9.map((mesure) => mesure.second.nom))].sort(), ['surface/default', 'surface/hover']);
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
  // L'espace de noms SVG des icônes du kit est un identifiant, non une ressource.
  assert.deepEqual(page.replaceAll('http://www.w3.org/2000/svg', '').match(/https?:\/\/|<script src|<link|@import|url\(/g), null);
});

test('les icônes du hub sont celles du kit et du socle, sans tracé propre', () => {
  const page = genererHub();
  const tracesDe = (svg: string): string[] => [...svg.matchAll(/ d="([^"]+)"/g)].map((trouve) => trouve[1]!);
  const attendus = [...['info', 'tenu', 'corriger'].flatMap((type) => tracesDe(svgDeLAlerte(type as 'info' | 'tenu' | 'corriger'))), ...tracesDe(svgDuSigne('avant-apres')), ...tracesDe(svgDuSigne('fermer'))];
  assert.ok(attendus.length >= 5);
  for (const trace of attendus) assert.ok(page.includes(trace), `Le tracé « ${trace} » n'est pas dans la page.`);
  // Les anciens tracés écrits à la main ne reviennent pas.
  for (const ancien of ['M4 10h11M11 6l4 4-4 4', 'M5 10.5l3.2 3.2L15 7', 'M6 6l8 8M14 6l-8 8', 'M10 3l8 14H2z']) assert.ok(!page.includes(ancien), `Le tracé « ${ancien} » est revenu.`);
});

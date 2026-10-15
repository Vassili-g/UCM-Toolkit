/** Les candidats du geste, les coordonnées des zones, les garanties et le gris de comparaison. */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  candidatDeTeinte,
  cleDuPorteur,
  courseDeTeinte,
  grisDeMemeClarte,
  limiteDynamique,
  lireHexa,
  pairesTropProches,
  proximiteDePalettes,
  rampesDe,
  recetteParDefaut,
  rgb8VersOklch,
  sortieLaPlusProche,
  validerRecette,
  verifierPromesses,
  zonesTropProches,
  type Palette,
  type Recette,
  type Rgb8,
} from '../src/index';
import { reglerClarte, reglerSaturation, reglerTeinte } from '../../plugin-palettes/src/edition';
import { paletteTailwind, recetteAvec } from './fabrique';

const BLEU = paletteTailwind('p-000000a1', '#1E6FD9');
const AUTRE_BLEU = { ...BLEU, id: 'p-000000a2' };
const VERTE = paletteTailwind('p-000000a3', '#22C55E');

function sansLimiteDeContraste(...palettes: Palette[]): Recette {
  const recette = recetteAvec(...palettes);
  return { ...recette, seuils: { ...recette.seuils, texte: 1, nonTexte: 1 } };
}

function valide(recette: Recette, palette: Palette): void {
  const lue = validerRecette({ ...recette, palettes: [palette] });
  assert.ok('recette' in lue, JSON.stringify(lue));
}

test('un aller puis un retour annule les réglages de teinte et rend les octets d’origine', () => {
  for (const reference of ['#1E6FD9', '#000012', '#A0B599']) {
    for (const options of [{}, { intensites: 1 as const }, { base: 'soft' as const }, { crans: [100, 300, 600, 950] }]) {
      const palette = paletteTailwind(BLEU.id, reference, options);
      const recette = recetteAvec(palette);
      assert.deepEqual(candidatDeTeinte(recette, palette, 0), palette);
      const reglee = candidatDeTeinte(recette, palette, 12);
      valide(recette, reglee);
      assert.deepEqual(candidatDeTeinte(recette, reglee, -12), palette);
      assert.equal('reglages' in candidatDeTeinte(recette, reglee, -12), false);
    }
  }
});

test('le candidat et reglerTeinte rendent la même palette pour chaque cible et chaque nombre d’intensités', () => {
  const recette = recetteParDefaut();
  for (const options of [{}, { intensites: 1 as const }, { base: 'soft' as const }, { base: 'vivid' as const }, { crans: [100, 300, 600, 950] }]) {
    for (const reference of ['#1E6FD9', '#A0B599', '#000012']) {
      const palette = paletteTailwind(BLEU.id, reference, options);
      const clarifiee = reglerClarte(recette, palette, 'deux', -0.02);
      const saturee = reglerSaturation(recette, clarifiee, 'deux', 0.6);
      const decalee = reglerTeinte(recette, saturee, 'soft', 25);
      for (const avant of [palette, saturee, decalee]) {
        for (const cible of ['soft', 'vivid', 'deux'] as const) {
          const profilVise = avant.intensites === 1 ? 'vivid' : cible === 'deux' ? cleDuPorteur(recette, avant) : cible;
          const valeurDuProfilVise = avant.reglages?.teinte?.[profilVise] ?? 0;
          for (const ecartCommun of [-100, -30, -0.01, 0, 0.01, 18.237, 100]) {
            const candidate = candidatDeTeinte(recette, avant, ecartCommun, cible);
            const geste = reglerTeinte(recette, avant, cible, valeurDuProfilVise + ecartCommun);
            assert.deepEqual(candidate, geste);
            assert.deepEqual(rampesDe(recette, candidate), rampesDe(recette, geste));
            valide(recette, candidate);
          }
        }
      }
    }
  }
});

test('le candidat préserve le départ d’une référence ajustée avant les réglages', () => {
  const recette = recetteAvec(BLEU);
  const ajustee = { ...BLEU, originale: '#2A7FDB' };
  const reglee = candidatDeTeinte(recette, ajustee, 8);
  assert.equal(reglee.reglages?.depart, BLEU.reference);
  assert.equal(reglee.originale, ajustee.originale);
  assert.deepEqual(candidatDeTeinte(recette, reglee, -8), ajustee);
});

test('Soft +25° et Vivid −20° limitent l’écart commun à −10° et +5°', () => {
  const recette = sansLimiteDeContraste(BLEU);
  const soft = candidatDeTeinte(recette, BLEU, 25, 'soft');
  const palette = candidatDeTeinte(recette, soft, -20, 'vivid');
  assert.deepEqual(courseDeTeinte(recette, palette), { bas: -10, haut: 5 });
  assert.deepEqual(candidatDeTeinte(recette, palette, 100).reglages?.teinte, { soft: 30, vivid: -15 });
  assert.deepEqual(candidatDeTeinte(recette, palette, -100).reglages?.teinte, { soft: 15, vivid: -30 });
});

test('les zones se translatent dans la valeur du profil affiché, avec la même course commune', () => {
  const recette = sansLimiteDeContraste(BLEU);
  const palette = candidatDeTeinte(recette, candidatDeTeinte(recette, BLEU, 25, 'soft'), -20, 'vivid');
  const autre = { ...palette, id: AUTRE_BLEU.id };
  const large = { ...recette, seuils: { ...recette.seuils, palettesProches: 2 } };
  assert.deepEqual(zonesTropProches(large, palette, autre, 'soft'), [{ debut: 15, fin: 30 }]);
  assert.deepEqual(zonesTropProches(large, palette, autre, 'vivid'), [{ debut: -30, fin: -15 }]);
});

test('la valeur courante d’une paire en alerte appartient à une zone', () => {
  const recette = recetteAvec(BLEU, AUTRE_BLEU);
  assert.equal(pairesTropProches(recette).length, 1);
  const zones = zonesTropProches(recette, BLEU, AUTRE_BLEU);
  assert.ok(zones.some(({ debut, fin }) => debut <= 0 && fin >= 0));
});

test('une paire éloignée n’a aucune zone et sa sortie vaut zéro', () => {
  const recette = recetteAvec(BLEU, VERTE);
  assert.deepEqual(pairesTropProches(recette), []);
  assert.deepEqual(zonesTropProches(recette, BLEU, VERTE), []);
  assert.equal(sortieLaPlusProche(recette, BLEU, VERTE), 0);
});

test('chaque degré de zone suit la proximité des rôles et la sortie est le plus petit écart permis', () => {
  const recette = sansLimiteDeContraste(BLEU, AUTRE_BLEU);
  const zones = zonesTropProches(recette, BLEU, AUTRE_BLEU, 'vivid');
  const sorties: number[] = [];
  for (let ecartCommun = -30; ecartCommun <= 30; ecartCommun += 1) {
    const candidate = candidatDeTeinte(recette, BLEU, ecartCommun);
    const proche = proximiteDePalettes(recette, candidate, AUTRE_BLEU)!.distance < recette.seuils.palettesProches;
    assert.equal(zones.some(({ debut, fin }) => ecartCommun >= debut && ecartCommun <= fin), proche, `${ecartCommun}°`);
    if (!proche) sorties.push(ecartCommun);
  }
  assert.ok(sorties.length > 0);
  const sortie = sortieLaPlusProche(recette, BLEU, AUTRE_BLEU);
  assert.notEqual(sortie, null);
  assert.equal(Math.abs(sortie!), Math.min(...sorties.map(Math.abs)));
});

test('une paire sans sortie rend null', () => {
  const recette = sansLimiteDeContraste(BLEU, AUTRE_BLEU);
  const large = { ...recette, seuils: { ...recette.seuils, palettesProches: 2 } };
  assert.deepEqual(zonesTropProches(large, BLEU, AUTRE_BLEU), [{ debut: -30, fin: 30 }]);
  assert.equal(sortieLaPlusProche(large, BLEU, AUTRE_BLEU), null);
});

test('la course garde exactement les limites des garanties tenues au départ', () => {
  let coursesBornees = 0;
  for (const reference of ['#1E6FD9', '#DC2626', '#EAB308', '#A0B599']) {
    const palette = paletteTailwind(BLEU.id, reference);
    const defaut = recetteAvec(palette);
    const recette = { ...defaut, seuils: { ...defaut.seuils, texte: 4, nonTexte: 4 } };
    const limite = limiteDynamique({ recette, palette, candidate: (ecart) => candidatDeTeinte(recette, palette, ecart), valeur: 0, bornes: { bas: -30, haut: 30 }, pas: 1, ordre: false });
    const course = courseDeTeinte(recette, palette);
    assert.deepEqual(course, { bas: limite.bas.valeur, haut: limite.haut.valeur });
    if (course.bas > -30 || course.haut < 30) coursesBornees += 1;
    const avant = verifierPromesses(recette, palette);
    for (let ecart = course.bas; ecart <= course.haut; ecart += 1) {
      const apres = verifierPromesses(recette, candidatDeTeinte(recette, palette, ecart));
      avant.forEach((promesse, rang) => {
        if (promesse.verdict === 'tenue') assert.equal(apres[rang].verdict, 'tenue');
      });
    }
  }
  assert.ok(coursesBornees > 0);
});

test('une intensité ignore le profil affiché et ne règle que vivid', () => {
  const palette: Palette = { ...BLEU, intensites: 1 };
  const autre = { ...palette, id: AUTRE_BLEU.id };
  const recette = sansLimiteDeContraste(palette, autre);
  const reglee = candidatDeTeinte(recette, palette, 6);
  assert.deepEqual(reglee.reglages?.teinte, { vivid: 6 });
  assert.equal('soft' in (reglee.reglages?.teinte ?? {}), false);
  assert.deepEqual(zonesTropProches(recette, reglee, autre, 'soft'), zonesTropProches(recette, reglee, autre, 'vivid'));
});

test('une palette libre se règle mais n’entre pas dans les zones de rôles', () => {
  const libre: Palette = { ...BLEU, crans: [100, 300, 600, 950] };
  const recette = recetteAvec(libre, AUTRE_BLEU);
  assert.notEqual(candidatDeTeinte(recette, libre, 8).reference, libre.reference);
  assert.deepEqual(courseDeTeinte(recette, libre), { bas: -30, haut: 30 });
  assert.deepEqual(zonesTropProches(recette, libre, AUTRE_BLEU), []);
  assert.equal(sortieLaPlusProche(recette, libre, AUTRE_BLEU), null);
});

test('une palette figée reste immobile et une palette terne n’entre pas dans les zones', () => {
  const figee: Palette = { ...BLEU, intensites: 1, crans: [100, 300, 600, 950], figees: { light: ['#111111', '#333333', '#666666', '#999999'] } };
  const terne = paletteTailwind(VERTE.id, '#888888');
  const recette = recetteAvec(figee, terne, AUTRE_BLEU);
  assert.equal(candidatDeTeinte(recette, figee, 10), figee);
  assert.deepEqual(courseDeTeinte(recette, figee), { bas: 0, haut: 0 });
  for (const palette of [figee, terne]) {
    assert.deepEqual(zonesTropProches(recette, palette, AUTRE_BLEU), []);
    assert.deepEqual(zonesTropProches(recette, AUTRE_BLEU, palette), []);
    assert.equal(sortieLaPlusProche(recette, palette, AUTRE_BLEU), null);
  }
});

test('les calculs gardent leurs entrées intactes', () => {
  const recette = recetteAvec(BLEU, AUTRE_BLEU);
  const avant = JSON.stringify(recette);
  candidatDeTeinte(recette, BLEU, 5);
  zonesTropProches(recette, BLEU, AUTRE_BLEU);
  sortieLaPlusProche(recette, BLEU, AUTRE_BLEU);
  assert.equal(JSON.stringify(recette), avant);
});

test('le gris conserve les extrêmes et la clarté OKLab à 0,005 près', () => {
  assert.deepEqual(grisDeMemeClarte([255, 255, 255]), [255, 255, 255]);
  assert.deepEqual(grisDeMemeClarte([0, 0, 0]), [0, 0, 0]);
  const couleurs: Rgb8[] = ['#FF0000', '#00FF00', '#0000FF', '#1E6FD9', '#EAB308', '#A0B599'].map((hexa) => lireHexa(hexa)!);
  for (let rang = 0; rang < 500; rang += 1) couleurs.push([(rang * 53) % 256, (rang * 97) % 256, (rang * 29) % 256]);
  for (const couleur of couleurs) {
    const gris = grisDeMemeClarte(couleur);
    assert.equal(gris[0], gris[1]);
    assert.equal(gris[1], gris[2]);
    assert.ok(Math.abs(rgb8VersOklch(gris).L - rgb8VersOklch(couleur).L) <= 0.005);
  }
});

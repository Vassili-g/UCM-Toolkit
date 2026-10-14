/**
 * Une palette à une intensité ([ENT-14]) : une seule rampe, sans profil, à la
 * part de sa référence ; et la recette de format 3, relue avec deux
 * intensités par palette.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MODES,
  PROFILS,
  alertesDePalette,
  ancrageDe,
  classerRecette,
  compterManquees,
  confusionsDe,
  distanceOk,
  intensitesDe,
  jsonCanonique,
  partDeChroma,
  partsDe,
  proximiteDePalettes,
  rampesDe,
  recetteParDefaut,
  validerRecette,
  verifierPromesses,
  arrondir,
  lireHexa,
  type Intensite,
  type Palette,
  type Recette,
} from '../src/index';
import { copie, paletteTailwind, recetteAvec } from './fabrique';

const unique = (id: string, reference: string): Palette => ({ ...paletteTailwind(id, reference), intensites: 1 });

test('[ENT-14] une palette à une intensité n’a qu’une rampe, sans profil, qui contient la référence exacte', () => {
  const bleu = unique('p-000000c1', '#1E6FD9');
  const recette = recetteAvec(bleu);
  assert.deepEqual(intensitesDe(bleu), ['unique']);
  const rampes = rampesDe(recette, bleu);
  assert.deepEqual(Object.keys(rampes), ['unique']);
  const ancrage = ancrageDe(recette, bleu);
  assert.equal(ancrage.profil, 'unique');
  for (const mode of MODES) assert.equal(rampes.unique![mode][ancrage.rangs[mode]].hexa, '#1E6FD9', mode);
  assert.deepEqual(partsDe(recette, bleu), { unique: arrondir(partDeChroma(lireHexa('#1E6FD9')!, 'srgb'), 3) });
});

/** Un générateur pseudo-aléatoire à graine, pour des tirages reproductibles. */
function generateur(graine: number): () => number {
  let etat = graine >>> 0;
  return () => {
    etat = (Math.imul(etat, 1664525) + 1013904223) >>> 0;
    return etat / 4294967296;
  };
}

test('[ENT-14] sur cinq cents références, la rampe unique est celle du profil porteur forcé, en Soft comme en Vivid', () => {
  const tirer = generateur(20260926);
  const fautes: string[] = [];
  for (let essai = 0; essai < 500; essai += 1) {
    const hexa = `#${[0, 1, 2].map(() => Math.floor(tirer() * 256).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
    const seule = unique('p-000000c2', hexa);
    const attendue = rampesDe(recetteAvec(seule), seule).unique!;
    for (const profil of PROFILS) {
      const forcee = { ...paletteTailwind('p-000000c2', hexa), base: profil };
      // La rampe unique prend l'enveloppe de Vivid ([MOT-35]) : Soft la prend aussi, pour que seul le porteur diffère.
      const recette = recetteAvec(forcee);
      const jugee = profil === 'soft'
        ? { ...recette, profils: { ...recette.profils, soft: { ...recette.profils.soft, enveloppe: recette.profils.vivid.enveloppe } } }
        : recette;
      const rampe = rampesDe(jugee, forcee)[profil]!;
      for (const mode of MODES) {
        if (jsonCanonique(rampe[mode]) !== jsonCanonique(attendue[mode])) fautes.push(`${hexa} ${profil} ${mode}`);
      }
    }
  }
  assert.deepEqual(fautes.slice(0, 5), []);
});

test('[ENT-14] une palette à une intensité juge trente-deux promesses, sans seconde série, et son verdict ne compte qu’elles', () => {
  const bleu = unique('p-000000c3', '#1E6FD9');
  const promesses = verifierPromesses(recetteAvec(bleu), bleu);
  assert.equal(promesses.length, 32);
  assert.deepEqual([...new Set(promesses.map((promesse) => promesse.profil))], ['unique']);
  // La courbe claire place le 700 à 0,60 : des garanties manquent en clair, et seules les promesses de la rampe unique comptent.
  const recette = recetteAvec(bleu);
  const light = [...recette.courbes.light];
  light[7] = 0.6;
  const plusClair: Recette = { ...recette, courbes: { ...recette.courbes, light } };
  const deux = paletteTailwind('p-000000c3', '#1E6FD9');
  const manqueesUne = compterManquees(verifierPromesses(plusClair, bleu));
  const manqueesDeux = verifierPromesses(plusClair, deux);
  assert.ok(manqueesUne > 0);
  assert.equal(manqueesUne, manqueesDeux.filter((promesse) => promesse.profil === 'vivid' && promesse.verdict === 'manquee').length, 'la rampe unique de #1E6FD9 est sa rampe Vivid');
  assert.ok(compterManquees(manqueesDeux) > manqueesUne);
});

test('[ENT-14] [VER-11] une palette à une intensité n’a ni profils confondus, ni référence plus terne ou plus vive', () => {
  // #6B7280 confond ses deux profils, et #A0B599 est plus terne que Vivid : à une intensité, rien ne sonne.
  for (const reference of ['#6B7280', '#A0B599', '#FACC15']) {
    const seule = unique('p-000000c4', reference);
    const recette = recetteAvec(seule);
    assert.deepEqual(confusionsDe(recette, seule), [], reference);
    const codes = alertesDePalette(recette, seule).map((alerte) => alerte.code);
    for (const code of ['profils-confondus', 'reference-plus-terne', 'reference-plus-vive']) assert.ok(!codes.includes(code as never), `${reference} : ${codes}`);
  }
  // À deux intensités, des parts du designer au-dessus de la référence font sonner « plus terne ».
  const deux = paletteTailwind('p-000000c4', '#A0B599', { parts: { soft: 0.45, vivid: 0.95, origine: 'designer' } });
  assert.ok(alertesDePalette(recetteAvec(deux), deux).some((alerte) => alerte.code === 'reference-plus-terne'), 'la même référence à deux intensités sonne');
});

test('[ENT-14] une palette à une intensité refuse une autre valeur, la palette de base, des parts et une dérive déliée, et porte sa liste de nuances', () => {
  const recette = recetteAvec(unique('p-000000c5', '#1E6FD9'));
  assert.ok('recette' in validerRecette(copie(recette)));
  const refus = (modifier: (palette: any) => void) => {
    const essai = copie(recette);
    modifier(essai.palettes[0]);
    const lue = validerRecette(essai);
    return 'refus' in lue ? lue.refus.map(({ regle, chemin }) => `${regle} ${chemin}`) : [];
  };
  assert.deepEqual(refus((palette) => { palette.intensites = 2; }), ['intensites-valeur palettes[0].intensites']);
  assert.deepEqual(refus((palette) => { palette.base = 'vivid'; }), ['intensites-incompatible palettes[0].base']);
  assert.deepEqual(refus((palette) => { palette.parts = { soft: 0.3, vivid: 0.8, origine: 'designer' }; }), ['intensites-incompatible palettes[0].parts']);
  // Format 8 : une palette reprise du fichier garde ses nuances, à une intensité ([VAR-13]).
  assert.deepEqual(refus((palette) => { palette.crans = [100, 300, 500, 700]; }), []);
  assert.deepEqual(refus((palette) => { palette.derive.lien = false; }), ['intensites-incompatible palettes[0].derive.lien']);
});

test("[VER-22] une palette à deux intensités se lit en Vivid : la part de Soft ne change pas sa proximité", () => {
  const seule = unique('p-000000c8', '#1E6FD9');
  const deux = paletteTailwind('p-000000c9', '#2A78D0');
  const recette = recetteAvec(seule, deux);
  const proximite = proximiteDePalettes(recette, seule, deux);
  assert.ok(proximite && proximite.distance < recette.seuils.palettesProches);
  const softPlusTerne = { ...deux, parts: { soft: 0.2, vivid: partsDe(recette, deux).vivid!, origine: 'designer' as const } };
  assert.notDeepEqual(rampesDe(recette, softPlusTerne).soft, rampesDe(recette, deux).soft, 'la part change bien la rampe de Soft');
  assert.deepEqual(proximiteDePalettes(recetteAvec(seule, softPlusTerne), seule, softPlusTerne), proximite);
  assert.equal(recetteParDefaut().formatVersion, 11);
});

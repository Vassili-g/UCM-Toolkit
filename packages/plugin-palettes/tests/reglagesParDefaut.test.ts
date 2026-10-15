/** Les valeurs par défaut de la carte « Réglage global » et les réglages modifiés ([UI-38]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { partDeLaReference, partsDesProfils, profilPorteur, recetteParDefaut, type Palette } from 'ucm-couleur';

import { choisirLaBase, nouvellePalette, reglerClarte, reglerSaturation, reglerTeinte, retablirLaSaturation } from '../src/edition';
import { estModifiee, reglagesModifies, valeursDesProfils, valeursParDefaut } from '../src/reglagesParDefaut';

const RECETTE = recetteParDefaut();
const BLEU: Palette = { ...nouvellePalette(RECETTE, 'p-0000003a', '#1E6FD9', 2)!, nom: 'Bleu' };
const MAUVE: Palette = { ...nouvellePalette(RECETTE, 'p-0000003b', '#897288', 1)!, nom: 'Mauve' };

test('[UI-38] une palette neuve n’a aucun réglage modifié, à une ou deux intensités', () => {
  assert.deepEqual(reglagesModifies(RECETTE, BLEU), []);
  assert.deepEqual(reglagesModifies(RECETTE, MAUVE), []);
});

test('[UI-38] les valeurs par défaut sont 0° et 0 ; la saturation du porteur est celle de la référence, celle de l’autre profil sa part commune', () => {
  const porteur = profilPorteur(RECETTE, BLEU);
  const autre = porteur === 'soft' ? 'vivid' : 'soft';
  const defauts = valeursParDefaut(RECETTE, BLEU);
  for (const profil of ['soft', 'vivid'] as const) {
    assert.equal(defauts[profil].teinte, 0);
    assert.equal(defauts[profil].luminosite, 0);
  }
  assert.equal(defauts[porteur].saturation, partDeLaReference(RECETTE, BLEU), `${porteur} porte la référence du Bleu`);
  assert.equal(defauts[autre].saturation, RECETTE.profils[autre].part, `${autre} garde sa part commune`);
  assert.deepEqual(valeursDesProfils(RECETTE, BLEU), defauts, 'rien de réglé : les réglettes sont sur leur marque');
});

test('[UI-38] Soft tourné de 8° et Vivid assombri de 0,02 : teinte de Soft, luminosité de Vivid', () => {
  const reglee = reglerClarte(RECETTE, reglerTeinte(RECETTE, BLEU, 'soft', 8), 'vivid', -0.02);
  assert.deepEqual(reglagesModifies(RECETTE, reglee), [
    { grandeur: 'teinte', profil: 'soft' },
    { grandeur: 'luminosite', profil: 'vivid' },
  ]);
});

test('[UI-38] la liste suit teinte, saturation, luminosité, puis Soft avant Vivid', () => {
  let palette = reglerTeinte(RECETTE, BLEU, 'vivid', 5);
  palette = reglerTeinte(RECETTE, palette, 'soft', -5);
  palette = reglerClarte(RECETTE, palette, 'soft', 0.03);
  palette = reglerClarte(RECETTE, palette, 'vivid', -0.03);
  palette = reglerSaturation(RECETTE, palette, 'soft', 0.1);
  assert.deepEqual(reglagesModifies(RECETTE, palette).map(({ grandeur, profil }) => `${grandeur} ${profil}`), [
    'teinte soft', 'teinte vivid', 'saturation soft', 'luminosite soft', 'luminosite vivid',
  ]);
});

test('[UI-38] la luminosité du porteur déplace la référence sans compter comme une saturation modifiée', () => {
  for (const base of ['soft', 'vivid'] as const) {
    const sombre = reglerClarte(RECETTE, choisirLaBase(RECETTE, BLEU, base), base, -0.05);
    assert.deepEqual(reglagesModifies(RECETTE, sombre), [{ grandeur: 'luminosite', profil: base }], `${base} porte la référence`);
  }
});

test('[UI-38] la valeur que « Par défaut » range pour la saturation est la valeur par défaut', () => {
  for (const profil of ['soft', 'vivid'] as const) {
    const reglee = reglerSaturation(RECETTE, BLEU, profil, 0.2);
    assert.ok(reglagesModifies(RECETTE, reglee).some((modifie) => modifie.grandeur === 'saturation' && modifie.profil === profil), `${profil} à 0,2 est modifié`);
    const retablie = retablirLaSaturation(RECETTE, reglee, profil);
    assert.equal(partsDesProfils(RECETTE, retablie)[profil], valeursParDefaut(RECETTE, reglee)[profil].saturation, `${profil} : la marque est la valeur rangée`);
    assert.deepEqual(reglagesModifies(RECETTE, retablie), [], `${profil} : plus rien de modifié`);
  }
});

test('[UI-38] à une intensité, la saturation de la référence réglée s’écarte du défaut, et « Par défaut » la rend', () => {
  const reglee = reglerSaturation(RECETTE, MAUVE, 'vivid', 0.5);
  assert.deepEqual(reglagesModifies(RECETTE, reglee), [{ grandeur: 'saturation', profil: null }]);
  assert.equal(valeursParDefaut(RECETTE, reglee).vivid.saturation, partDeLaReference(RECETTE, MAUVE));
  assert.deepEqual(reglagesModifies(RECETTE, retablirLaSaturation(RECETTE, reglee)), []);
});

test('[UI-38] un écart d’au plus 0,5 point de la course ne compte pas comme une modification', () => {
  assert.equal(estModifiee('saturation', 0.005, 0), false);
  assert.equal(estModifiee('saturation', 0.006, 0), true);
  assert.equal(estModifiee('teinte', 0.3, 0), false, '0,5 point des 60° de la piste');
  assert.equal(estModifiee('teinte', 0.4, 0), true);
  assert.equal(estModifiee('luminosite', 0.001, 0), false);
  assert.equal(estModifiee('luminosite', 0.002, 0), true);
});

/** Régler le Color shift : une grandeur à un bout, un préréglage, le lien des profils ([DER-07], [DER-11], [DER-12], [MOT-27]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { jsonCanonique, recetteParDefaut, validerRecette, type Palette } from 'ucm-couleur';

import { ajouter, appliquerPrereglage, changerReference, lierLesProfils, nouvellePalette, origineDe, prereglageDe, reglerDecalage, toutRetablir } from '../src/edition';

const RECETTE = recetteParDefaut();
const BLEU = nouvellePalette(RECETTE, 'p-0000000a', '#1E6FD9', 2)!;
const TAILWIND = prereglageDe(RECETTE, BLEU);
const DELIEE: Palette = lierLesProfils(BLEU, false);

test('[DER-07] régler un bout de profils liés change les deux profils, et l’origine devient libre', () => {
  const suivante = reglerDecalage(RECETTE, BLEU, 'vivid', 'teinte', 'clair', 12);
  assert.deepEqual(suivante.derive.soft, { clair: 12, sombre: TAILWIND.sombre, origine: 'libre' });
  assert.deepEqual(suivante.derive.vivid, suivante.derive.soft);
  assert.equal(suivante.derive.lien, true);
});

test('[DER-12] régler un profil délié ne touche pas l’autre', () => {
  const suivante = reglerDecalage(RECETTE, DELIEE, 'soft', 'teinte', 'sombre', -20);
  assert.equal(suivante.derive.soft.sombre, -20);
  assert.deepEqual(suivante.derive.vivid, BLEU.derive.vivid);
});

test('[MOT-27] un angle se range au centième, borné à ±90°, sans zéro négatif', () => {
  assert.equal(reglerDecalage(RECETTE, BLEU, 'vivid', 'teinte', 'clair', 12.3456).derive.vivid.clair, 12.35);
  assert.equal(reglerDecalage(RECETTE, BLEU, 'vivid', 'teinte', 'clair', 140).derive.vivid.clair, 90);
  assert.equal(reglerDecalage(RECETTE, BLEU, 'vivid', 'teinte', 'clair', -140).derive.vivid.clair, -90);
  assert.ok(Object.is(reglerDecalage(RECETTE, BLEU, 'vivid', 'teinte', 'clair', -0.001).derive.vivid.clair, 0));
});

test('[DER-11] revenir aux valeurs du préréglage rend l’origine tailwind, à zéro constante', () => {
  const libre = reglerDecalage(RECETTE, BLEU, 'vivid', 'teinte', 'clair', 12);
  assert.equal(reglerDecalage(RECETTE, libre, 'vivid', 'teinte', 'clair', TAILWIND.clair).derive.vivid.origine, 'tailwind');
  assert.equal(origineDe(RECETTE, BLEU, { clair: 0, sombre: 0 }), 'constante');
  assert.equal(origineDe(RECETTE, BLEU, { clair: 1, sombre: 0 }), 'libre');
});

test('[DER-11] un préréglage remplace les deux angles du profil affiché, ou des deux profils liés', () => {
  const constante = appliquerPrereglage(RECETTE, BLEU, 'vivid', 'constante');
  assert.deepEqual(constante.derive.soft, { clair: 0, sombre: 0, origine: 'constante' });
  assert.deepEqual(constante.derive.vivid, constante.derive.soft);
  const seulSoft = appliquerPrereglage(RECETTE, reglerDecalage(RECETTE, DELIEE, 'soft', 'teinte', 'clair', 30), 'soft', 'tailwind');
  assert.deepEqual(seulSoft.derive.soft, { ...TAILWIND, origine: 'tailwind' });
});

test('[DER-12] délier garde les deux Color shift, lier copie les trois grandeurs de vivid dans soft', () => {
  assert.deepEqual(DELIEE.derive.soft, BLEU.derive.soft);
  const ecartees = reglerDecalage(RECETTE, reglerDecalage(RECETTE, reglerDecalage(RECETTE, DELIEE, 'vivid', 'teinte', 'clair', 30), 'vivid', 'saturation', 'sombre', -0.4), 'vivid', 'clarte', 'clair', 0.02);
  const reliee = lierLesProfils(ecartees, true);
  assert.deepEqual(reliee.derive.soft.saturation, { clair: 0, sombre: -0.4 });
  assert.deepEqual(reliee.derive.soft.clarte, { clair: 0.02, sombre: 0 });
  assert.equal(reliee.derive.lien, true);
  assert.deepEqual(reliee.derive.soft, ecartees.derive.vivid);
});

test('[MOT-30] [MOT-27] la saturation se range au centième dans ±1, la luminosité au millième dans ±0,15', () => {
  const sature = reglerDecalage(RECETTE, BLEU, 'vivid', 'saturation', 'clair', -0.4567);
  assert.deepEqual(sature.derive.vivid.saturation, { clair: -0.46, sombre: 0 });
  assert.deepEqual(sature.derive.soft, sature.derive.vivid, 'liés, les deux profils suivent');
  assert.equal(sature.derive.vivid.origine, 'tailwind', 'la saturation ne change pas l’origine de la teinte');
  assert.deepEqual(reglerDecalage(RECETTE, BLEU, 'vivid', 'saturation', 'sombre', 3).derive.vivid.saturation, { clair: 0, sombre: 1 });
  assert.deepEqual(reglerDecalage(RECETTE, BLEU, 'vivid', 'clarte', 'sombre', 0.04567).derive.vivid.clarte, { clair: 0, sombre: 0.046 });
  assert.deepEqual(reglerDecalage(RECETTE, BLEU, 'vivid', 'clarte', 'clair', -1).derive.vivid.clarte, { clair: -0.15, sombre: 0 });
});

test('[REC-05] une grandeur revenue à zéro aux deux bouts quitte la recette, qui reste valide', () => {
  const reglee = reglerDecalage(RECETTE, BLEU, 'vivid', 'clarte', 'clair', 0.02);
  const revenue = reglerDecalage(RECETTE, reglee, 'vivid', 'clarte', 'clair', -0.0001);
  assert.equal('clarte' in revenue.derive.vivid, false);
  assert.equal(jsonCanonique(revenue), jsonCanonique(BLEU));
  assert.ok('recette' in validerRecette(ajouter(RECETTE, reglerDecalage(RECETTE, reglee, 'vivid', 'saturation', 'clair', 0.3))));
});

test('[DER-11] un préréglage ne règle que la teinte ; « Tout rétablir » rend la teinte Tailwind, la saturation et la luminosité à zéro', () => {
  const reglee = reglerDecalage(RECETTE, reglerDecalage(RECETTE, BLEU, 'vivid', 'saturation', 'clair', -0.4), 'vivid', 'teinte', 'sombre', 20);
  const constante = appliquerPrereglage(RECETTE, reglee, 'vivid', 'constante');
  assert.deepEqual(constante.derive.vivid, { clair: 0, sombre: 0, origine: 'constante', saturation: { clair: -0.4, sombre: 0 } });
  const retablie = toutRetablir(RECETTE, constante, 'vivid');
  assert.deepEqual(retablie.derive, BLEU.derive);
});

test('[ENT-01] une nouvelle référence suit le préréglage Tailwind de la teinte et garde la saturation et la luminosité', () => {
  const reglee = reglerDecalage(RECETTE, BLEU, 'vivid', 'clarte', 'sombre', 0.03);
  const jaune = changerReference(RECETTE, reglee, '#EAB308')!;
  const tailwind = prereglageDe(RECETTE, jaune);
  assert.deepEqual(jaune.derive.vivid, { clair: tailwind.clair, sombre: tailwind.sombre, origine: 'tailwind', clarte: { clair: 0, sombre: 0.03 } });
});

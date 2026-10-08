/** Le rapport de vérification ([VER-01], [VER-02], L6.14). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { ancrageDe, contraste, lireHexa, rampesDe, recetteParDefaut, type Recette } from 'ucm-couleur';

import { ajouter, nouvellePalette } from '../src/edition';
import { rapportDeLaRecette, type CranDuRapport } from '../src/rapport';

const VIDE = recetteParDefaut();
const BLEU = { ...nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9', 2)!, nom: 'Bleu' };
// Des parts du designer sous la référence : sans elles, Vivid prend la part de #FACC15 et rien ne sonne.
const JAUNE = { ...nouvellePalette(VIDE, 'p-0000000b', '#FACC15', 2)!, parts: { soft: 0.45, vivid: 0.95, origine: 'designer' as const } };
const RECETTE: Recette = [BLEU, JAUNE].reduce(ajouter, VIDE);

test('[VER-01] chaque palette donne, par mode et par profil, chaque cran avec son hexa et ses contrastes', () => {
  const rapport = rapportDeLaRecette(RECETTE, '0badc0de', 'SRGB', null);
  assert.deepEqual(rapport.palettes.map(({ id, nom }) => [id, nom]), [[BLEU.id, 'Bleu'], [JAUNE.id, null]]);
  const rampes = rampesDe(RECETTE, BLEU);
  const parProfil = (mode: 'light' | 'dark') => rapport.palettes[0].crans[mode] as { readonly [P in 'soft' | 'vivid']: readonly CranDuRapport[] };
  const clairVivid = parProfil('light').vivid;
  assert.deepEqual(clairVivid.map(({ cran }) => cran), RECETTE.crans);
  assert.deepEqual(clairVivid.map(({ hexa }) => hexa), rampes.vivid!.light.map(({ hexa }) => hexa));
  const [cinquante] = parProfil('dark').soft;
  assert.equal(cinquante.fond, contraste(rampes.soft!.dark[0].couleur, lireHexa(RECETTE.fonds.dark)!));
  assert.equal(cinquante.blanc, contraste(rampes.soft!.dark[0].couleur, [255, 255, 255]));
});

test('[VER-01] chaque promesse nomme sa garantie par ses variables, avec son contraste et son verdict ; chaque alerte, sa mesure', () => {
  const [bleu, jaune] = rapportDeLaRecette(RECETTE, null, 'SRGB', null).palettes;
  // Seize contrôles par mode et par intensité : 3 + 1 + 4 + 4 + 1 + 1 + 2.
  assert.equal(bleu.promesses.length, 64);
  assert.ok(bleu.promesses.every((promesse) => typeof promesse.contraste === 'number' && ['tenue', 'manquee'].includes(promesse.verdict)), JSON.stringify(bleu.promesses[0]));
  const premiere = bleu.promesses[0];
  assert.deepEqual(premiere.garantie, { premier: 'solid/foreground', fond: 'solid/default', seuil: 'texte' });
  const fonds = bleu.promesses.filter((promesse) => promesse.mode === 'light' && promesse.profil === 'vivid').map(({ garantie }) => `${garantie.premier} sur ${garantie.fond}`);
  assert.deepEqual(fonds, [
    'solid/foreground sur solid/default', 'solid/foreground sur solid/hover', 'solid/foreground sur solid/pressed',
    'solid/default sur elevation/page',
    'surface/foreground sur surface/default', 'surface/foreground sur surface/hover', 'surface/foreground sur surface/pressed', 'surface/foreground sur elevation/page',
    'surface/border sur surface/default', 'surface/border sur surface/hover', 'surface/border sur surface/pressed', 'surface/border sur elevation/page',
    'page/foreground sur elevation/page', 'page/border sur elevation/page',
    'page/focus sur elevation/page', 'page/focus sur surface/default',
  ]);
  assert.ok(bleu.promesses.every((promesse) => !('paire' in promesse) && !('numero' in promesse.garantie)), 'aucun numéro de garantie ni paire d’emplois');
  const vive = jaune.alertes.find((alerte) => alerte.code === 'reference-plus-vive');
  assert.ok(vive && vive.code === 'reference-plus-vive' && vive.part > vive.partVivid, JSON.stringify(jaune.alertes));
});

test('[VER-08] le rapport garde l’écart et le minimum d’une proximité, que l’interface ne montre plus', () => {
  // Deux bleus voisins : « palettes proches » sonne sur chacun.
  const voisin = nouvellePalette(VIDE, 'p-0000000c', '#1E70DA', 2)!;
  const [bleu] = rapportDeLaRecette([BLEU, voisin].reduce(ajouter, VIDE), null, 'SRGB', null).palettes;
  const proches = bleu.alertes.find((alerte) => alerte.code === 'palettes-proches');
  assert.ok(proches && proches.code === 'palettes-proches', JSON.stringify(bleu.alertes));
  assert.ok(proches.distance < proches.seuil && proches.seuil === VIDE.seuils.palettesProches, JSON.stringify(proches));
});

test('[MOT-17] le rapport nomme l’ancrage de chaque palette, le même que l’analyse, et le profil du document', () => {
  const rapport = rapportDeLaRecette(RECETTE, null, 'LEGACY', null);
  assert.equal(rapport.formatDuRapport, 4);
  assert.equal(rapport.profilDuDocument, 'LEGACY');
  for (const [rang, palette] of RECETTE.palettes.entries()) {
    const ancrage = ancrageDe(RECETTE, palette);
    assert.deepEqual(rapport.palettes[rang].ancrage, ancrage);
    assert.equal(rapport.palettes[rang].intensites, 2);
    for (const mode of ['light', 'dark'] as const) {
      const crans = rapport.palettes[rang].crans[mode] as { readonly [P in 'soft' | 'vivid']: readonly CranDuRapport[] };
      assert.equal(crans[ancrage.profil as 'soft' | 'vivid'][ancrage.rangs[mode]].hexa, palette.reference, `${palette.id} ${mode}`);
    }
  }
});

test('[VER-02] le rapport porte l’empreinte de la recette et les écarts du dernier dessin, et se relit tel quel en JSON', () => {
  const ecarts = [{ palette: BLEU.id, nom: 'vivid/light/700', apercu: '#0E5DC6', peint: '#000000' }];
  const rapport = rapportDeLaRecette(RECETTE, '0badc0de', 'SRGB', ecarts);
  assert.equal(rapport.empreinte, '0badc0de');
  assert.deepEqual(rapport.ecartsDuDernierDessin, ecarts);
  assert.equal(rapportDeLaRecette(RECETTE, null, 'SRGB', null).ecartsDuDernierDessin, null);
  assert.deepEqual(JSON.parse(JSON.stringify(rapport)), rapport);
});

test('[VER-01] le rapport porte le texte des boutons de chaque thème, et sa table suit le sens du thème', () => {
  assert.deepEqual(rapportDeLaRecette(RECETTE, null, 'SRGB', null).texteDesBoutons, { light: 'blanc', dark: 'noir' });
  const inversee = { ...RECETTE, texteDesBoutons: { light: 'blanc', dark: 'blanc' } } as Recette;
  const rapport = rapportDeLaRecette(inversee, null, 'SRGB', null);
  assert.deepEqual(rapport.texteDesBoutons, { light: 'blanc', dark: 'blanc' });
  const texte = (mode: 'light' | 'dark') => rapport.palettes[0].promesses.find((promesse) => promesse.mode === mode && promesse.garantie.premier === 'solid/foreground')!.premier;
  assert.deepEqual(texte('light'), { nature: 'texteDesBoutons', couleur: [255, 255, 255] });
  assert.deepEqual(texte('dark'), { nature: 'texteDesBoutons', couleur: [255, 255, 255] });
});

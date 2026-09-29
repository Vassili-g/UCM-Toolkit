/**
 * Les gestes de la carte « Teinte, saturation, luminosité » (Z10.5, Z10.8) :
 * ce que chacun fait à une palette, sans rien ranger.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aUnReglageDuPorteur,
  classerRecette,
  cleDuPorteur,
  departDe,
  ecrireHexa,
  jsonCanonique,
  profilPorteur,
  rampesDe,
  recetteParDefaut,
  referenceReglee,
  validerRecette,
  type Palette,
} from 'ucm-couleur';

import {
  ajouter,
  changerReference,
  choisirLaBase,
  choisirLesIntensites,
  nouvellePalette,
  passerEnLibre,
  prereglageDe,
  reglerClarte,
  reglerSaturation,
  reglerTeinte,
  revenirALOriginale,
  revenirAuModele,
} from '../src/edition';

const RECETTE = recetteParDefaut();
const BLEU: Palette = { ...nouvellePalette(RECETTE, 'p-0000001a', '#1E6FD9', 2)!, nom: 'Bleu' };
const PORTEUR = profilPorteur(RECETTE, BLEU);
const AUTRE = PORTEUR === 'vivid' ? 'soft' : 'vivid';

const valide = (palette: Palette): void => {
  const lue = validerRecette(ajouter(RECETTE, palette));
  assert.ok('recette' in lue, JSON.stringify('refus' in lue ? lue.refus : null));
};

test('Z10.8 un profil délié réglé ne touche pas l’autre, ni la référence, et fige le porteur', () => {
  const reglee = reglerTeinte(RECETTE, BLEU, AUTRE, 6);
  valide(reglee);
  assert.equal(reglee.reference, BLEU.reference);
  assert.equal('originale' in reglee, false);
  assert.deepEqual(reglee.reglages, { porteur: PORTEUR, teinte: { [AUTRE]: 6 } });
  assert.deepEqual(rampesDe(RECETTE, reglee)[PORTEUR], rampesDe(RECETTE, BLEU)[PORTEUR]);
  assert.notDeepEqual(rampesDe(RECETTE, reglee)[AUTRE], rampesDe(RECETTE, BLEU)[AUTRE]);
  const sombre = reglerClarte(RECETTE, BLEU, AUTRE, -0.03);
  assert.equal(sombre.reference, BLEU.reference);
  assert.deepEqual(rampesDe(RECETTE, sombre)[PORTEUR], rampesDe(RECETTE, BLEU)[PORTEUR]);
});

test('Z10.8 « Les deux » déplace les deux profils du même écart, et s’arrête quand l’un atteint sa borne', () => {
  const deux = reglerTeinte(RECETTE, reglerTeinte(RECETTE, BLEU, AUTRE, 20), 'deux', 15);
  valide(deux);
  assert.deepEqual(deux.reglages?.teinte, { [PORTEUR]: 10, [AUTRE]: 30 });
  const clartes = reglerClarte(RECETTE, BLEU, 'deux', -0.02);
  assert.deepEqual(clartes.reglages?.clarte, { soft: -0.02, vivid: -0.02 });
  const parts = reglerSaturation(RECETTE, BLEU, 'deux', 1.2);
  assert.equal(parts.parts!.vivid, 1, 'Vivid s’arrête à 1');
  assert.equal(parts.parts!.vivid - parts.parts!.soft, 0.5, 'l’écart des parts se garde');
});

test('Z10.8 un réglage du porteur déplace la référence, garde l’originale, et l’aller-retour la rend à l’octet', () => {
  const tournee = reglerTeinte(RECETTE, BLEU, PORTEUR, 10);
  valide(tournee);
  assert.notEqual(tournee.reference, BLEU.reference);
  assert.equal(tournee.originale, BLEU.reference);
  const retour = reglerTeinte(RECETTE, reglerTeinte(RECETTE, tournee, PORTEUR, -10), PORTEUR, 0);
  assert.deepEqual(retour, BLEU, 'aucune dérive d’arrondi : la référence se tire du départ');
  const bordee = reglerTeinte(RECETTE, BLEU, PORTEUR, 45);
  assert.equal(bordee.reglages?.teinte?.[PORTEUR], 30, 'la teinte s’arrête à 30°');
});

test('Z10.8 la dérive Tailwind se calcule sur le départ : les gestes de la carte ne la déplacent pas', () => {
  const reglee = reglerClarte(RECETTE, reglerTeinte(RECETTE, BLEU, PORTEUR, 12), PORTEUR, -0.04);
  assert.deepEqual(prereglageDe(RECETTE, reglee), prereglageDe(RECETTE, BLEU));
  assert.deepEqual(reglee.derive, BLEU.derive);
});

test('Z10.8 « Revenir à l’originale » retire les réglages du porteur et garde la couleur de l’autre profil', () => {
  const reglee = reglerTeinte(RECETTE, reglerTeinte(RECETTE, BLEU, PORTEUR, 8), AUTRE, 5);
  const revenue = revenirALOriginale(RECETTE, reglee);
  valide(revenue);
  assert.equal(revenue.reference, BLEU.reference);
  assert.equal('originale' in revenue, false);
  assert.deepEqual(revenue.reglages, { porteur: PORTEUR, teinte: { [AUTRE]: 5 } });
  assert.deepEqual(rampesDe(RECETTE, revenue)[AUTRE], rampesDe(RECETTE, reglee)[AUTRE]);
});

test('Z10.8 un code saisi, la base et Auto : réglages retirés, référence suivie, porteur gardé', () => {
  const reglee = reglerTeinte(RECETTE, reglerTeinte(RECETTE, BLEU, PORTEUR, 8), AUTRE, 5);
  const saisie = changerReference(RECETTE, reglee, '#2A7FDB')!;
  assert.equal('reglages' in saisie, false);
  assert.equal('originale' in saisie, false);
  const autre = choisirLaBase(RECETTE, reglee, AUTRE);
  valide(autre);
  assert.equal(autre.base, AUTRE);
  assert.equal(autre.reglages?.porteur, undefined);
  assert.notEqual(autre.reference, reglee.reference, 'la référence suit les réglages du nouveau porteur');
  const auto = choisirLaBase(RECETTE, autre, 'auto');
  valide(auto);
  assert.equal(auto.reglages?.porteur, AUTRE, 'Auto fige le porteur d’avant');
  assert.equal(auto.reference, autre.reference, 'aucune couleur ne change');
});

test('Z10.8 passer à une intensité et revenir à deux replie les réglages sans perdre la référence du porteur', () => {
  const reglee = reglerClarte(RECETTE, reglerTeinte(RECETTE, reglerTeinte(RECETTE, BLEU, PORTEUR, 6), AUTRE, 5), PORTEUR, -0.02);
  const une = choisirLesIntensites(RECETTE, reglee, 1);
  valide(une);
  assert.equal(une.reference, reglee.reference);
  assert.deepEqual(une.reglages, { teinte: { vivid: 6 }, clarte: { vivid: -0.02 } });
  const saturee = reglerSaturation(RECETTE, une, 'vivid', 0.4);
  valide(saturee);
  assert.equal(saturee.reglages?.part, 0.4);
  assert.notEqual(saturee.reference, une.reference, 'à une intensité, la saturation récrit la référence');
  const deux = choisirLesIntensites(RECETTE, saturee, 2);
  valide(deux);
  assert.equal(deux.reglages?.part, undefined);
  assert.equal(deux.reference, une.reference, 'sans part, la référence reprend la saturation de son départ');
  const libre = passerEnLibre(RECETTE, saturee);
  valide(libre);
  const modele = revenirAuModele(RECETTE, libre);
  valide(modele);
});

test('Z10.8 une palette ajustée avant la version 5 garde ses couleurs au premier réglage du porteur', () => {
  // Une référence de la version 4, ajustée sans réglage : #0DA047 depuis #16A34A.
  const vert = { ...nouvellePalette(RECETTE, 'p-0000001b', '#0DA047', 2)!, originale: '#16A34A' };
  valide(vert);
  const reglee = reglerTeinte(RECETTE, vert, profilPorteur(RECETTE, vert), 0.01);
  valide(reglee);
  assert.equal(reglee.reglages?.depart, '#0DA047');
  assert.equal(reglee.originale, '#16A34A');
  const zero = reglerTeinte(RECETTE, reglee, profilPorteur(RECETTE, reglee), 0);
  assert.equal(zero.reference, '#0DA047');
  assert.equal(zero.originale, '#16A34A', 'la référence ajustée et son originale reviennent');
  assert.equal(zero.reglages, undefined);
});

test('Z10.8 une recette réglée, exportée puis relue, est égale', () => {
  const reglee = reglerClarte(RECETTE, reglerTeinte(RECETTE, reglerTeinte(RECETTE, BLEU, PORTEUR, 7.5), AUTRE, -4.25), AUTRE, 0.015);
  const recette = ajouter(RECETTE, reglee);
  const classement = classerRecette(jsonCanonique(recette));
  assert.equal(classement.etat, 'courante');
  assert.ok(classement.etat === 'courante' && jsonCanonique(classement.recette) === jsonCanonique(recette));
  const recette4 = { ...ajouter(RECETTE, BLEU), formatVersion: 4 };
  const lue = classerRecette(jsonCanonique(recette4));
  assert.ok(lue.etat === 'migree' && jsonCanonique(lue.recette.palettes) === jsonCanonique(recette4.palettes), 'une recette 4 se lit');
});

test('Z10.8 après toute suite de gestes, la référence est celle que referenceReglee tire du départ, et la recette se valide', () => {
  let graine = 7;
  const tirer = (n: number): number => {
    graine = (graine * 1103515245 + 12345) % 2147483648;
    return graine % n;
  };
  let juges = 0;
  for (const hexa of ['#1E6FD9', '#16A34A', '#DC2626', '#A0B599', '#FACC15', '#6B7280']) {
    for (const nombre of [1, 2] as const) {
      let palette = nouvellePalette(RECETTE, 'p-0000001c', hexa, nombre)!;
      for (let geste = 0; geste < 40; geste += 1) {
        const cible = (['soft', 'vivid', 'deux'] as const)[tirer(3)];
        const choix = tirer(5);
        if (choix === 0) palette = reglerTeinte(RECETTE, palette, cible, tirer(61) - 30);
        else if (choix === 1) palette = reglerClarte(RECETTE, palette, cible, (tirer(8) - 5) / 100);
        else if (choix === 2) palette = reglerSaturation(RECETTE, palette, cible, tirer(101) / 100);
        else if (choix === 3) palette = reglerTeinte(RECETTE, palette, cible, 0);
        else palette = revenirALOriginale(RECETTE, palette);
        valide(palette);
        if (!aUnReglageDuPorteur(RECETTE, palette)) continue;
        juges += 1;
        const porteur = cleDuPorteur(RECETTE, palette);
        const { teinte, clarte, part } = palette.reglages!;
        const attendue = ecrireHexa(referenceReglee(departDe(RECETTE, palette), teinte?.[porteur] ?? 0, clarte?.[porteur] ?? 0, part, RECETTE.gamut));
        assert.equal(palette.reference, attendue, `${hexa}, ${nombre} intensité(s), geste ${geste}`);
      }
    }
  }
  assert.ok(juges > 100, `${juges} palettes réglées jugées`);
});

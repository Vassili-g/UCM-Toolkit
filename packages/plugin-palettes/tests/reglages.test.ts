/**
 * Les gestes de la carte « Teinte, saturation, luminosité » (Z10.5, Z10.8) :
 * ce que chacun fait à une palette, sans rien ranger.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aUnReglageDuPorteur,
  arrondir,
  classerRecette,
  cleDuPorteur,
  departDe,
  ecrireHexa,
  estPaletteGrise,
  fabriquerCran,
  jsonCanonique,
  lireHexa,
  partsDesProfils,
  profilPorteur,
  rampesDe,
  recetteParDefaut,
  referenceReglee,
  rgb8VersOklch,
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
  reprendreLesParts,
  retablirLaSaturation,
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
  const avant = partsDesProfils(RECETTE, BLEU);
  assert.equal(parts.parts!.vivid, 1, 'Vivid s’arrête à 1');
  assert.equal(arrondir(parts.parts!.vivid - parts.parts!.soft, 3), arrondir(avant.vivid - avant.soft, 3), 'l’écart des parts se garde');
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
  assert.equal(deux.reglages?.part, 0.4);
  assert.equal(deux.reference, saturee.reference, 'la référence garde sa saturation, et son porteur la prend');
  assert.equal(partsDesProfils(RECETTE, deux)[profilPorteur(RECETTE, deux)], 0.4);
  assert.equal(choisirLesIntensites(RECETTE, deux, 1).reference, saturee.reference);
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

test('Z11.7 « Rétablir » la saturation d’un profil laisse l’autre, et la palette reprend les parts de la recette quand les deux y reviennent', () => {
  const communes = partsDesProfils(RECETTE, BLEU);
  const reglee = reglerSaturation(RECETTE, reglerSaturation(RECETTE, BLEU, 'vivid', 0.8), 'soft', 0.3);
  const soft = retablirLaSaturation(RECETTE, reglee, 'soft');
  valide(soft);
  assert.deepEqual(soft.parts, { soft: communes.soft, vivid: 0.8, origine: 'designer' });
  const deux = retablirLaSaturation(RECETTE, soft, 'vivid');
  valide(deux);
  assert.equal('parts' in deux, false);
  assert.equal('parts' in retablirLaSaturation(RECETTE, reglee, 'deux'), false);
});

test('G5.3 à une intensité, #897288 tournée de +10° puis désaturée à 8 % garde une teinte réglable ; à 0 %, la teinte rangée reste', () => {
  const mauve = nouvellePalette(RECETTE, 'p-0000001d', '#897288', 1)!;
  const tournee = reglerTeinte(RECETTE, mauve, 'vivid', 10);
  const terne = reglerSaturation(RECETTE, tournee, 'vivid', 0.08);
  valide(terne);
  assert.ok(rgb8VersOklch(lireHexa(terne.reference)!).C < 0.03, 'sous l’ancien seuil de gris');
  assert.equal(estPaletteGrise(RECETTE, terne), false);
  assert.equal(terne.reglages?.teinte?.vivid, 10);
  // Sans saturation, la palette devient grise, mais la teinte rangée se garde : « Rétablir » la remet à zéro.
  const grise = reglerSaturation(RECETTE, terne, 'vivid', 0);
  valide(grise);
  assert.equal(estPaletteGrise(RECETTE, grise), true);
  assert.equal(grise.reglages?.teinte?.vivid, 10);
  assert.equal(reglerTeinte(RECETTE, grise, 'vivid', 0).reglages?.teinte, undefined);
});

test('G5.3 « Les deux » depuis une palette désaturée garde Vivid au-dessus de Soft', () => {
  const taupe = nouvellePalette(RECETTE, 'p-0000001e', '#7C717B', 2)!;
  const avant = partsDesProfils(RECETTE, taupe);
  assert.ok(avant.vivid > avant.soft);
  for (const valeur of [0, 0.02, 0.2, 0.6, 1]) {
    const parts = partsDesProfils(RECETTE, reglerSaturation(RECETTE, taupe, 'deux', valeur));
    assert.ok(parts.vivid > parts.soft, `${valeur} : ${JSON.stringify(parts)}`);
  }
});

test('G5.3 saturer Vivid d’un gris neutre colore ses nuances : la palette cesse d’être grise', () => {
  const gris = nouvellePalette(RECETTE, 'p-0000001f', '#808080', 2)!;
  assert.equal(estPaletteGrise(RECETTE, gris), true);
  const saturee = reglerSaturation(RECETTE, gris, 'vivid', 0.3);
  valide(saturee);
  assert.deepEqual(saturee.parts, { soft: 0, vivid: 0.3, origine: 'designer' });
  assert.equal(estPaletteGrise(RECETTE, saturee), false);
  assert.equal(saturee.reference, '#808080', 'à deux intensités, la saturation ne déplace pas la référence');
});

/** Vrai quand la référence est le cran que sa rampe aurait calculé à sa place : même part, à sa clarté. */
const fondueDansSaRampe = (palette: Palette): boolean => {
  const lue = rgb8VersOklch(lireHexa(palette.reference)!);
  return fabriquerCran(lue.L, lue.H, partsDesProfils(RECETTE, palette)[profilPorteur(RECETTE, palette)], RECETTE.gamut).hexa === palette.reference;
};

test('[ENT-09] à deux intensités, la saturation du porteur récrit la référence à la part de ses voisines', () => {
  const mauve = nouvellePalette(RECETTE, 'p-00000020', '#897288', 2)!;
  assert.equal(profilPorteur(RECETTE, mauve), 'soft');
  for (const cible of ['soft', 'deux'] as const) {
    const terne = reglerSaturation(RECETTE, mauve, cible, 0.08);
    valide(terne);
    assert.equal(partsDesProfils(RECETTE, terne).soft, 0.08, cible);
    assert.equal(terne.reglages?.part, 0.08, cible);
    assert.equal(terne.originale, '#897288', cible);
    assert.equal(profilPorteur(RECETTE, terne), 'soft', `${cible} : le porteur est figé`);
    assert.ok(fondueDansSaRampe(terne), `${cible} : ${terne.reference}`);
    assert.ok(rgb8VersOklch(lireHexa(terne.reference)!).C < rgb8VersOklch(lireHexa('#897288')!).C / 1.5, cible);
  }
  const vive = reglerSaturation(RECETTE, mauve, 'vivid', 0.5);
  assert.equal(vive.reference, '#897288', 'la saturation de l’autre profil ne déplace pas la référence');
  assert.equal(vive.reglages, undefined);
});

test('[ENT-09] « Rétablir » et « Reprendre » rendent à la référence la saturation de son départ, à l’octet', () => {
  const terne = reglerSaturation(RECETTE, reglerTeinte(RECETTE, BLEU, PORTEUR, 6), PORTEUR, 0.3);
  const tournee = reglerTeinte(RECETTE, BLEU, PORTEUR, 6);
  for (const rendue of [retablirLaSaturation(RECETTE, terne, PORTEUR), retablirLaSaturation(RECETTE, terne, 'deux'), reprendreLesParts(RECETTE, terne)]) {
    valide(rendue);
    assert.equal(rendue.reference, tournee.reference);
    assert.equal(rendue.reglages?.part, undefined);
    assert.equal(rendue.reglages?.teinte?.[PORTEUR], 6, 'la teinte réglée reste');
  }
  const affichee = reglerSaturation(RECETTE, BLEU, PORTEUR, partsDesProfils(RECETTE, BLEU)[PORTEUR]);
  assert.equal(affichee.reference, BLEU.reference, 'poser la valeur affichée garde les octets');
  assert.equal(affichee.reglages, undefined);
});

test('[ENT-09] des parts du designer rangées sans la référence se réaccordent au geste suivant', () => {
  // Une palette réglée avant que la référence suive son porteur : Soft à 0,08 autour de #897288 intacte.
  const ancienne: Palette = { ...nouvellePalette(RECETTE, 'p-00000021', '#897288', 2)!, parts: { soft: 0.08, vivid: 0.338, origine: 'designer' } };
  valide(ancienne);
  assert.equal(fondueDansSaRampe(ancienne), false);
  const reaccordee = reglerSaturation(RECETTE, ancienne, 'vivid', 0.4);
  valide(reaccordee);
  assert.deepEqual(partsDesProfils(RECETTE, reaccordee), { soft: 0.08, vivid: 0.4 });
  assert.ok(fondueDansSaRampe(reaccordee));
});

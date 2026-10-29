/**
 * L'ancrage déplacé en Dark normal ([MOT-17]) : une référence posée sur le 700, texte de la page, qui manque le
 * seuil `texte` sur les fonds de la garantie 9 (200 et 300) glisse au 600. Le 700 libéré s'éclaircit jusqu'au
 * seuil, le 400 et le 500 se relèvent vers un espacement régulier. Le Dark inversé et le Light n'en relèvent pas.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  ancrageDe,
  boutsDe,
  contraste,
  courbesParDefaut,
  cranDeLaVisee,
  ecrireHexa,
  fabriquerCran,
  grilleDe,
  lireHexa,
  prereglageTailwind,
  rampeDe,
  rampesDe,
  rampesSansCorrection,
  rangPorteur,
  rgb8VersOklch,
  validerRecette,
  verifierPromesses,
  type Palette,
  type Recette,
} from '../src/index';
import { deplacerLaReference, texteSurveille } from '../src/ancrageDeplace';
import { fondsDesTextes } from '../src/textes';

const brute: unknown = JSON.parse(readFileSync(new URL('./fixtures/palettes-et-reglages.json', import.meta.url), 'utf8'));
const validee = validerRecette(brute);
if (!('recette' in validee)) throw new Error(`Recette du mainteneur refusée : ${JSON.stringify(validee.refus)}`);
/** La configuration du mainteneur : Light normal, Dark inversé (texte blanc dans les deux thèmes). */
const INVERSE: Recette = validee.recette;
const TEXTE_NORMAL = { light: INVERSE.texteDesBoutons.light, dark: 'noir' } as const;
/** La même configuration en Dark normal : texte des boutons Dark noir, courbe Dark par défaut de ce sens. */
const NORMALE: Recette = { ...INVERSE, texteDesBoutons: TEXTE_NORMAL, courbes: { ...INVERSE.courbes, dark: courbesParDefaut(11, TEXTE_NORMAL).dark } };

const rang = (recette: Recette, cran: number): number => recette.crans.indexOf(cran);
const palette = (recette: Recette, nom: string): Palette => recette.palettes.find((autre) => autre.nom === nom)!;
const g9 = (recette: Recette, p: Palette, profil: string) => verifierPromesses(recette, p).filter((promesse) => promesse.garantie.numero === 9 && promesse.mode === 'dark' && promesse.profil === profil);
const clarteDe = (hexa: string): number => rgb8VersOklch(lireHexa(hexa)!).L;

/** Une palette au préréglage Tailwind dont la référence est le cran `niveau` de la courbe Light, à la teinte donnée. */
function paletteDeLaTeinte(recette: Recette, niveau: number, teinte: number, base: 'soft' | 'vivid'): Palette {
  const reference = ecrireHexa(fabriquerCran(recette.courbes.light[rang(recette, niveau)], teinte, 1, recette.gamut).couleur);
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recette));
  return { id: `t${teinte}`, reference, base, derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } };
}

test('la correction des textes vise les fonds de la garantie 9 : le 200 et le 300 en Dark, normal comme inversé', () => {
  for (const [recette, texte] of [[NORMALE, 700], [INVERSE, 800]] as const) {
    assert.deepEqual([...(fondsDesTextes(recette, 'dark').get(rang(recette, texte)) ?? [])].sort(), [rang(recette, 200), rang(recette, 300)], `texte ${texte}`);
    assert.deepEqual([...(fondsDesTextes(recette, 'dark').get(rang(recette, 950)) ?? [])].sort(), [rang(recette, 100), rang(recette, 200), rang(recette, 300)], 'texte de surface');
  }
});

test('le glissement ne vaut que pour le Dark normal : il surveille le 700 et ses deux fonds', () => {
  assert.deepEqual(texteSurveille(NORMALE), { rang: rang(NORMALE, 700), fonds: [rang(NORMALE, 200), rang(NORMALE, 300)] });
  assert.equal(texteSurveille(INVERSE), undefined);
  // La garantie 9 ne se juge pas sans le 200 : rien à surveiller.
  const sans = <T>(liste: readonly T[]): T[] => liste.filter((_, i) => i !== rang(NORMALE, 200));
  const sans200 = { ...NORMALE, crans: sans(NORMALE.crans), courbes: { light: sans(NORMALE.courbes.light), dark: sans(NORMALE.courbes.dark) } };
  assert.equal(texteSurveille(sans200), undefined);
});

test('Dark normal, configuration du mainteneur : Poppy Vivid et Irene Vivid glissent au 600 et tiennent la garantie 9', () => {
  const attendues = [['Poppy', 0.704], ['Irene', 0.710]] as const;
  for (const [nom, clarte] of attendues) {
    const p = palette(NORMALE, nom);
    const ancrage = ancrageDe(NORMALE, p);
    assert.equal(ancrage.profil, 'vivid');
    assert.equal(ancrage.crans.dark, 600, nom);
    assert.equal(ancrage.rangs.dark, rang(NORMALE, 600));
    const dark = rampeDe(rampesDe(NORMALE, p), 'vivid').dark;
    assert.equal(dark[rang(NORMALE, 600)].hexa, p.reference, `${nom} : le 600 porte les octets de la référence`);
    const texte = dark[rang(NORMALE, 700)];
    assert.ok(Math.abs(texte.L - clarte) < 0.002, `${nom} : 700 à ${texte.L}`);
    for (const fond of [200, 300]) assert.ok(contraste(texte.couleur, dark[rang(NORMALE, fond)].couleur) >= NORMALE.seuils.texte, `${nom} : 700 sur ${fond}`);
    const promesses = g9(NORMALE, p, 'vivid');
    assert.deepEqual(promesses.map((promesse) => promesse.second.nature === 'cran' && promesse.second.cran), [200, 300]);
    assert.ok(promesses.every((promesse) => promesse.verdict === 'tenue'), nom);
    assert.ok(dark.every((cran, k) => k === 0 || cran.L > dark[k - 1].L), `${nom} : l'ordre des nuances tient`);
  }
});

test('Dark normal : les autres palettes de la configuration gardent leur ancrage', () => {
  for (const p of NORMALE.palettes) {
    if (p.nom === 'Poppy' || p.nom === 'Irene') continue;
    // Le départ des réglages, ou la référence : la clarté qui désigne le cran porteur.
    const depart = clarteDe(p.reglages ? (p.originale ?? p.reference) : p.reference);
    assert.equal(ancrageDe(NORMALE, p).rangs.dark, rangPorteur(NORMALE.courbes.dark, depart), p.nom);
  }
});

test('Dark inversé, configuration du mainteneur : Poppy Vivid et Irene Vivid gardent leur référence au 800, et la garantie 9 manque', () => {
  for (const nom of ['Poppy', 'Irene']) {
    const p = palette(INVERSE, nom);
    assert.equal(ancrageDe(INVERSE, p).crans.dark, 800, nom);
    const dark = rampeDe(rampesDe(INVERSE, p), 'vivid').dark;
    assert.equal(dark[rang(INVERSE, 800)].hexa, p.reference, nom);
    assert.ok(g9(INVERSE, p, 'vivid').some((promesse) => promesse.verdict === 'manquee'), nom);
  }
});

test('le cran libéré part de la clarté de la courbe sans la correction, et la correction l’éclaircit', () => {
  const p = palette(NORMALE, 'Poppy');
  const sans = rampeDe(rampesSansCorrection(NORMALE, p), 'vivid').dark;
  const avec = rampeDe(rampesDe(NORMALE, p), 'vivid').dark;
  const texte = rang(NORMALE, 700);
  assert.ok(Math.abs(sans[texte].L - NORMALE.courbes.dark[texte]) < 0.003, `sans correction : ${sans[texte].L}`);
  assert.ok(contraste(sans[texte].couleur, sans[rang(NORMALE, 300)].couleur) < NORMALE.seuils.texte);
  assert.ok(avec[texte].L > sans[texte].L);
  assert.equal(avec[rang(NORMALE, 600)].hexa, p.reference, 'sans la correction, la référence glisse aussi');
  assert.equal(sans[rang(NORMALE, 600)].hexa, p.reference);
});

test('360 teintes, références au niveau 500 de la courbe Light, Soft et Vivid : l’ordre des nuances tient et aucun texte ne reste sous 4,5:1', () => {
  let glissees = 0;
  const fautes: string[] = [];
  for (const base of ['soft', 'vivid'] as const) {
    for (let teinte = 0; teinte < 360; teinte += 1) {
      const p = paletteDeLaTeinte(NORMALE, 500, teinte, base);
      const recette = { ...NORMALE, palettes: [p] };
      const ancrage = ancrageDe(recette, p);
      const rampes = rampesDe(recette, p);
      const cle = `${base} ${teinte}°`;
      if (ancrage.rangs.dark !== rangPorteur(recette.courbes.dark, clarteDe(p.reference))) {
        glissees += 1;
        if (ancrage.crans.dark !== 600) fautes.push(`${cle} : glissée au ${ancrage.crans.dark}`);
        if (rampeDe(rampes, ancrage.profil).dark[ancrage.rangs.dark].hexa !== p.reference) fautes.push(`${cle} : octets de la référence`);
      }
      for (const intensite of ['soft', 'vivid'] as const) {
        const dark = rampeDe(rampes, intensite).dark;
        if (!dark.every((cran, k) => k === 0 || cran.L > dark[k - 1].L)) fautes.push(`${cle} ${intensite} : ordre`);
        for (const fond of [200, 300]) {
          if (contraste(dark[rang(recette, 700)].couleur, dark[rang(recette, fond)].couleur) < recette.seuils.texte) fautes.push(`${cle} ${intensite} : 700 sur ${fond}`);
        }
      }
    }
  }
  assert.deepEqual(fautes.slice(0, 5), []);
  assert.ok(glissees > 100, `${glissees} références glissées`);
});

test('Dark inversé, 360 teintes : aucune référence ne glisse', () => {
  for (const niveau of [500, 600, 700]) {
    for (let teinte = 0; teinte < 360; teinte += 15) {
      const p = paletteDeLaTeinte(INVERSE, niveau, teinte, 'vivid');
      const recette = { ...INVERSE, palettes: [p] };
      assert.equal(ancrageDe(recette, p).rangs.dark, rangPorteur(recette.courbes.dark, clarteDe(p.reference)), `${niveau} ${teinte}°`);
    }
  }
});

test('une référence hors de la tranche ne bouge pas : plus claire que le 700, ou au 700 sans manquer le seuil', () => {
  const modele = paletteDeLaTeinte(NORMALE, 500, 250, 'vivid');
  const poser = (L: number, part: number): { recette: Recette; p: Palette } => {
    const p = { ...modele, reference: ecrireHexa(fabriquerCran(L, 250, part, NORMALE.gamut).couleur) };
    return { recette: { ...NORMALE, palettes: [p] }, p };
  };
  // Plus clair que le 700 de la courbe (0,67) : la référence est au 800, rien ne glisse.
  const au800 = poser(0.76, 0.3);
  assert.equal(ancrageDe(au800.recette, au800.p).crans.dark, 800);
  // Au 700 mais assez claire pour tenir 4,5:1 sur le 300 : elle reste au 700.
  const au700 = poser(0.7, 0.03);
  const dark = rampeDe(rampesDe(au700.recette, au700.p), 'vivid').dark;
  assert.ok(contraste(lireHexa(au700.p.reference)!, dark[rang(NORMALE, 300)].couleur) >= NORMALE.seuils.texte);
  assert.equal(ancrageDe(au700.recette, au700.p).crans.dark, 700);
  assert.equal(dark[rang(NORMALE, 700)].hexa, au700.p.reference);
  // Au 500 : le 400 et le 500 gardent la rampe commune, avant et après la correction des textes.
  const au500 = poser(0.49, 0.2);
  assert.equal(ancrageDe(au500.recette, au500.p).crans.dark, 500);
  const sansTextes = (rampes: ReturnType<typeof rampesDe>) => rampeDe(rampes, 'vivid').dark.map((cran, k) => ([700, 950].includes(NORMALE.crans[k]) ? null : cran.hexa));
  assert.deepEqual(sansTextes(rampesDe(au500.recette, au500.p)), sansTextes(rampesSansCorrection(au500.recette, au500.p)));
});

test('une palette libre ne glisse pas : sans la table, elle n’a pas de garantie à tenir', () => {
  const modele = paletteDeLaTeinte(NORMALE, 500, 250, 'vivid');
  const libre = { id: modele.id, reference: ecrireHexa(fabriquerCran(0.67, 250, 0.3, NORMALE.gamut).couleur), derive: modele.derive, crans: [100, 200, 300, 600, 700, 800, 950] } as Palette;
  const recette = { ...NORMALE, palettes: [libre] };
  const grille = grilleDe(recette, libre);
  const ancrage = ancrageDe(recette, libre);
  assert.equal(ancrage.rangs.dark, rangPorteur(grille.courbes.dark, clarteDe(libre.reference)));
  assert.equal(ancrage.crans.dark, 700);
});

/** Onze crans de teinte 260 aux clartés données. */
const cransAux = (clartes: readonly number[]) => clartes.map((L) => cranDeLaVisee({ L, C: 0.04, H: 260 }));
const CLARTES = [0.145, 0.225, 0.275, 0.33, 0.4, 0.49, 0.58, 0.67, 0.76, 0.85, 0.93];
const SURVEILLE = { rang: 7, fonds: [2, 3] };

test('le 400 et le 500 prennent 1/3 et 2/3 de leur écart à l’espacement régulier entre le 300 et la référence', () => {
  const crans = cransAux(CLARTES);
  const sortie = deplacerLaReference(NORMALE, crans, SURVEILLE, 0.67, false);
  const L300 = crans[3].L;
  const Lref = crans[7].L;
  assert.equal(sortie[6], crans[7], 'la référence passe au 600, octets gardés');
  for (const [k, f] of [[4, 1 / 3], [5, 2 / 3]] as const) {
    const attendu = crans[k].L + f * (L300 + (Lref - L300) * f - crans[k].L);
    assert.ok(Math.abs(sortie[k].L - attendu) < 0.004, `rang ${k} : ${sortie[k].L} pour ${attendu}`);
    assert.ok(sortie[k].L > crans[k].L);
  }
  for (const k of [0, 1, 2, 3, 8, 9, 10]) assert.equal(sortie[k], crans[k], `rang ${k}`);
  assert.ok(Math.abs(sortie[7].L - 0.67) < 0.003, 'le 700 libéré part de la clarté de la courbe');
  assert.ok(Math.abs(((sortie[7].H - crans[7].H + 540) % 360) - 180) < 3, 'il garde la teinte de la référence');
});

test('un cran déjà au-dessus de l’espacement régulier ne bouge pas', () => {
  const crans = cransAux(CLARTES.map((L, k) => (k === 4 ? 0.52 : L)));
  const sortie = deplacerLaReference(NORMALE, crans, SURVEILLE, 0.67, false);
  assert.equal(sortie[4], crans[4], 'le 400 est au-dessus de 0,44');
  assert.notEqual(sortie[5], crans[5]);
});

test('la correction éclaircit le cran libéré jusqu’au seuil, sans passer le cran plus clair', () => {
  const crans = cransAux(CLARTES);
  const sans = deplacerLaReference(NORMALE, crans, SURVEILLE, 0.67, false);
  const avec = deplacerLaReference(NORMALE, crans, SURVEILLE, 0.67, true);
  assert.ok(contraste(sans[7].couleur, crans[3].couleur) < NORMALE.seuils.texte);
  assert.ok(contraste(avec[7].couleur, crans[3].couleur) >= NORMALE.seuils.texte);
  assert.ok(contraste(avec[7].couleur, crans[2].couleur) >= NORMALE.seuils.texte);
  assert.ok(avec[7].L > sans[7].L && avec[7].L <= crans[8].L);
  // Un seuil hors d'atteinte : le cran s'arrête au voisin plus clair, et la garantie manque.
  const hors = deplacerLaReference({ ...NORMALE, seuils: { ...NORMALE.seuils, texte: 21 } }, crans, SURVEILLE, 0.67, true);
  assert.ok(hors[7].L <= crans[8].L + 0.003, 'à l’arrondi à 8 bits près');
  assert.ok(contraste(hors[7].couleur, crans[3].couleur) < 21);
});

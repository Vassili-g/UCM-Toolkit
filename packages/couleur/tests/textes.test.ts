/**
 * La correction des textes par teinte : le cran de `surface/foreground` tient le seuil `texte` sur
 * `surface/subtle`, `surface/default` et `surface/hover`, celui de `page/foreground` sur `surface/default`.
 * Une teinte qui les manque éloigne le cran des fonds par pas de 0,001 de clarté, sans franchir le cran voisin et
 * sans toucher le cran de la référence.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  PAS_DE_LA_CORRECTION,
  ancrageDe,
  boutsDe,
  contraste,
  corrigerLesTextes,
  ecrireHexa,
  fabriquerCran,
  intensitesDe,
  jugerLesRampes,
  lireHexa,
  plafond,
  prereglageTailwind,
  rampeDe,
  rampesDe,
  rampesSansCorrection,
  recetteAvecTexteDesBoutons,
  rgb8VersOklch,
  validerRecette,
  verifierPromesses,
  type Cran,
  type Intensite,
  type Mode,
  type Palette,
  type Recette,
} from '../src/index';

const brute: unknown = JSON.parse(readFileSync(new URL('./fixtures/palettes-et-reglages.json', import.meta.url), 'utf8'));
const validee = validerRecette(brute);
if (!('recette' in validee)) throw new Error(`Recette du mainteneur refusée : ${JSON.stringify(validee.refus)}`);
/** La configuration du mainteneur : Light normal, Dark inversé (texte blanc dans les deux thèmes). */
const RECETTE: Recette = validee.recette;

/** La configuration du mainteneur dont le texte des boutons d'un thème change de sens, nuances 500 à 800 remplacées. */
function avecLeTexte(recette: Recette, mode: Mode, texte: 'blanc' | 'noir'): Recette {
  const changee = recetteAvecTexteDesBoutons(recette, mode, texte);
  if (!('recette' in changee)) throw new Error(`Texte ${texte} refusé en ${mode}.`);
  return changee.recette;
}
const DARK_NORMAL = avecLeTexte(RECETTE, 'dark', 'noir');
const LIGHT_INVERSE = avecLeTexte(RECETTE, 'light', 'noir');

const rangDe = (recette: Recette, cran: number): number => recette.crans.indexOf(cran);
const nom = (palette: Palette): string => palette.nom ?? palette.id;

/** Les rampes d'une palette dont le texte d'un mode n'est pas corrigé, et ce que la correction en fait : une ligne par intensité. */
function corrections(recette: Recette, palette: Palette, mode: Mode) {
  const sans = rampesSansCorrection(recette, palette);
  const ancrage = ancrageDe(recette, palette);
  return intensitesDe(palette).map((intensite) => {
    const { corrections: lignes } = corrigerLesTextes(recette, mode, rampeDe(sans, intensite)[mode], intensite === ancrage.profil ? ancrage.rangs[mode] : undefined);
    return { intensite, lignes, sans: rampeDe(sans, intensite)[mode], finale: rampeDe(rampesDe(recette, palette), intensite)[mode] };
  });
}

/** Une palette au préréglage Tailwind dont la référence est le cran `niveau` de la courbe Light, à la teinte donnée. */
function paletteDeLaTeinte(recette: Recette, niveau: number, teinte: number): Palette {
  const reference = ecrireHexa(fabriquerCran(recette.courbes.light[rangDe(recette, niveau)], teinte, 1, recette.gamut).couleur);
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recette));
  return { id: `t${teinte}`, reference, derive: { lien: true, soft: { ...derive, origine: 'tailwind' }, vivid: { ...derive, origine: 'tailwind' } } };
}

test('Light normal, configuration du mainteneur : cinq rampes éloignent leur 700 du 200, jusqu’à 0,008', () => {
  const attendues = [
    ['Emerald', 'soft', 0.501, 0.493], ['Grass', 'soft', 0.499, 0.494], ['Grass', 'vivid', 0.501, 0.496], ['Emerald', 'vivid', 0.500, 0.495], ['Sky', 'soft', 0.501, 0.499],
  ] as const;
  const rang = rangDe(RECETTE, 700);
  const corrigees: string[] = [];
  for (const palette of RECETTE.palettes) {
    for (const { intensite, lignes } of corrections(RECETTE, palette, 'light')) {
      const ligne = lignes.find((autre) => autre.rang === rang)!;
      if (ligne.etat === 'tenue') continue;
      corrigees.push(`${nom(palette)} ${intensite}`);
      const attendue = attendues.find(([cle, profil]) => cle === nom(palette) && profil === intensite);
      assert.ok(attendue, `${nom(palette)} ${intensite} n'est pas une rampe que la mesure corrige`);
      assert.equal(ligne.etat, 'corrigee');
      // La clarté visée (avant l'arrondi à 8 bits) tombe sur la valeur de la mesure, au millième.
      assert.ok(Math.abs(ligne.avant.L - attendue[2]) < 0.0015, `${nom(palette)} ${intensite} avant ${ligne.avant.L}`);
      assert.ok(Math.abs(ligne.avant.L - ligne.pas * PAS_DE_LA_CORRECTION - attendue[3]) < 0.0015, `${nom(palette)} ${intensite} après`);
      assert.ok(ligne.pas * PAS_DE_LA_CORRECTION <= 0.008 + 1e-9, `${nom(palette)} ${intensite} : ${ligne.pas} pas`);
    }
  }
  assert.deepEqual(corrigees.sort(), attendues.map(([cle, profil]) => `${cle} ${profil}`).sort());
});

test('Light normal, configuration du mainteneur : le texte 700 passe 4,5:1 sur le 200 pour les 21 rampes', () => {
  let rampes = 0;
  for (const palette of RECETTE.palettes) {
    for (const { intensite, finale } of corrections(RECETTE, palette, 'light')) {
      rampes += 1;
      const valeur = contraste(finale[rangDe(RECETTE, 700)].couleur, finale[rangDe(RECETTE, 200)].couleur);
      assert.ok(valeur >= RECETTE.seuils.texte, `${nom(palette)} ${intensite} : ${valeur}`);
    }
  }
  assert.equal(rampes, 21);
});

test('le cran corrigé garde sa teinte et sa part de chroma, et s’éloigne des fonds : plus foncé en Light, plus clair en Dark', () => {
  for (const [recette, mode, cran] of [[RECETTE, 'light', 700], [RECETTE, 'dark', 800]] as const) {
    let vues = 0;
    for (const palette of recette.palettes) {
      for (const { lignes } of corrections(recette, palette, mode)) {
        const ligne = lignes.find((autre) => autre.rang === rangDe(recette, cran))!;
        if (ligne.etat !== 'corrigee') continue;
        vues += 1;
        assert.ok(mode === 'light' ? ligne.apres.L < ligne.avant.L : ligne.apres.L > ligne.avant.L, `${nom(palette)} ${mode}`);
        const ecartDeTeinte = Math.abs(((ligne.apres.H - ligne.avant.H + 540) % 360) - 180);
        assert.ok(ecartDeTeinte < 3 || ligne.avant.C < 0.02, `${nom(palette)} ${mode} : teinte ${ligne.avant.H} puis ${ligne.apres.H}`);
        const part = (c: Cran): number => c.C / plafond(c.L, c.H, recette.gamut);
        assert.ok(Math.abs(part(ligne.apres) - part(ligne.avant)) < 0.02, `${nom(palette)} ${mode} : part ${part(ligne.avant)} puis ${part(ligne.apres)}`);
      }
    }
    assert.ok(vues >= 5, `${mode} : ${vues} crans corrigés`);
  }
});

test('Light normal, 108° à 249° par pas de 10°, référence au 600 : le 700 se corrige de 0,011 au plus en Soft et de 0,008 au plus en Vivid', () => {
  const plus: Record<'soft' | 'vivid', number> = { soft: 0, vivid: 0 };
  let corrigees = 0;
  for (let teinte = 108; teinte <= 249; teinte += 10) {
    const palette = paletteDeLaTeinte(RECETTE, 600, teinte);
    const recette = { ...RECETTE, palettes: [palette] };
    for (const { intensite, lignes, finale } of corrections(recette, palette, 'light')) {
      const ligne = lignes.find((autre) => autre.rang === rangDe(recette, 700))!;
      assert.notEqual(ligne.etat, 'reference', `${teinte}° ${intensite}`);
      assert.notEqual(ligne.etat, 'voisin', `${teinte}° ${intensite}`);
      if (ligne.etat === 'corrigee') {
        corrigees += 1;
        plus[intensite as 'soft' | 'vivid'] = Math.max(plus[intensite as 'soft' | 'vivid'], ligne.pas * PAS_DE_LA_CORRECTION);
      }
      assert.ok(contraste(finale[rangDe(recette, 700)].couleur, finale[rangDe(recette, 200)].couleur) >= recette.seuils.texte, `${teinte}° ${intensite}`);
    }
  }
  assert.ok(corrigees >= 10, `${corrigees} rampes corrigées`);
  assert.ok(plus.soft <= 0.011 + 1e-9, `Soft : ${plus.soft}`);
  assert.ok(plus.vivid <= 0.008 + 1e-9, `Vivid : ${plus.vivid}`);
});

test('une référence ancrée au 700 qui manque 4,5:1 n’est pas corrigée, et G3 manque pour cette palette', () => {
  const palette = paletteDeLaTeinte(RECETTE, 700, 130);
  const recette = { ...RECETTE, palettes: [palette] };
  const ancrage = ancrageDe(recette, palette);
  assert.equal(ancrage.crans.light, 700);
  assert.equal(ancrage.profil, 'vivid');
  const rang = rangDe(recette, 700);
  const [soft, vivid] = corrections(recette, palette, 'light');
  assert.equal(vivid.lignes.find((ligne) => ligne.rang === rang)!.etat, 'reference');
  assert.equal(vivid.finale[rang].hexa, palette.reference, 'le 700 garde les octets de la référence');
  assert.deepEqual(vivid.finale[rang], vivid.sans[rang]);
  const g3 = verifierPromesses(recette, palette).find((p) => p.garantie.numero === 3 && p.mode === 'light' && p.profil === 'vivid' && p.second.nature === 'cran' && p.second.cran === 200)!;
  assert.equal(g3.verdict, 'manquee');
  assert.ok(g3.contraste < recette.seuils.texte);
  // Soft ne porte pas la référence : son 700 se corrige, et G3 tient.
  assert.equal(soft.lignes.find((ligne) => ligne.rang === rang)!.etat, 'corrigee');
  assert.equal(verifierPromesses(recette, palette).filter((p) => p.garantie.numero === 3 && p.profil === 'soft' && p.mode === 'light').every((p) => p.verdict === 'tenue'), true);
});

test('Dark inversé, configuration du mainteneur : neuf rampes éclaircissent leur 800 de 0,009 au plus ; Poppy Vivid et Irene Vivid, dont le 800 est la référence, restent telles quelles', () => {
  const rang = rangDe(RECETTE, 800);
  const corrigees: string[] = [];
  const tenant: string[] = [];
  for (const palette of RECETTE.palettes) {
    for (const { intensite, lignes, finale } of corrections(RECETTE, palette, 'dark')) {
      const ligne = lignes.find((autre) => autre.rang === rang)!;
      const cle = `${nom(palette)} ${intensite}`;
      const valeur = contraste(finale[rang].couleur, finale[rangDe(RECETTE, 300)].couleur);
      if (ligne.etat === 'corrigee') {
        corrigees.push(cle);
        assert.ok(ligne.pas * PAS_DE_LA_CORRECTION <= 0.009 + 1e-9, `${cle} : ${ligne.pas} pas`);
        assert.ok(valeur >= RECETTE.seuils.texte, `${cle} : ${valeur}`);
      } else if (ligne.etat === 'reference') {
        tenant.push(cle);
        assert.deepEqual(finale[rang], ligne.avant, cle);
        assert.ok(valeur < RECETTE.seuils.texte, `${cle} : ${valeur}`);
        const g9 = verifierPromesses(RECETTE, palette).find((p) => p.garantie.numero === 9 && p.mode === 'dark' && p.profil === intensite)!;
        assert.equal(g9.verdict, 'manquee', cle);
      } else {
        assert.ok(valeur >= RECETTE.seuils.texte, `${cle} : ${valeur}`);
      }
    }
  }
  assert.deepEqual(tenant.sort(), ['Irene vivid', 'Poppy vivid']);
  assert.equal(corrigees.length, 9);
  for (const cle of ['Titanium unique', 'Terracota unique', 'Deep unique', 'Poppy soft', 'Ocean soft', 'Ocean vivid', 'Iris soft', 'Iris vivid', 'Irene soft']) {
    assert.ok(corrigees.includes(cle), cle);
  }
});

test('Dark inversé, 360 teintes, références au 500, au 600 et au 700 : le 800 s’éclaircit de 0,02 au plus', () => {
  let plus = 0;
  for (const niveau of [500, 600, 700]) {
    for (let teinte = 0; teinte < 360; teinte += 1) {
      const palette = paletteDeLaTeinte(RECETTE, niveau, teinte);
      const recette = { ...RECETTE, palettes: [palette] };
      for (const { lignes } of corrections(recette, palette, 'dark')) {
        const ligne = lignes.find((autre) => autre.rang === rangDe(recette, 800))!;
        if (ligne.etat === 'corrigee') plus = Math.max(plus, ligne.pas * PAS_DE_LA_CORRECTION);
      }
    }
  }
  assert.ok(plus > 0.009, `${plus}`);
  assert.ok(plus <= 0.02, `${plus}`);
});

test('Dark normal : la règle s’applique au 700, texte de la page, et au 950, texte de surface', () => {
  const rang = rangDe(DARK_NORMAL, 700);
  let corrigees = 0;
  for (const palette of DARK_NORMAL.palettes) {
    for (const { intensite, lignes, finale } of corrections(DARK_NORMAL, palette, 'dark')) {
      const ligne = lignes.find((autre) => autre.rang === rang)!;
      const cle = `${nom(palette)} ${intensite}`;
      const valeur = contraste(finale[rang].couleur, finale[rangDe(DARK_NORMAL, 300)].couleur);
      if (ligne.etat === 'corrigee') {
        corrigees += 1;
        assert.ok(ligne.apres.L > ligne.avant.L, cle);
      }
      if (ligne.etat === 'reference') assert.ok(valeur < DARK_NORMAL.seuils.texte, cle);
      else assert.ok(valeur >= DARK_NORMAL.seuils.texte, `${cle} : ${valeur}`);
      assert.equal(lignes.find((autre) => autre.rang === rangDe(DARK_NORMAL, 950))!.etat, 'tenue', cle);
    }
  }
  assert.ok(corrigees > 0);
});

test('Light inversé : le 800 de la page et le 900 de surface tiennent le seuil sur le fond teinté, aucune correction', () => {
  for (const palette of LIGHT_INVERSE.palettes) {
    for (const { intensite, lignes } of corrections(LIGHT_INVERSE, palette, 'light')) {
      assert.deepEqual(lignes.map((ligne) => [LIGHT_INVERSE.crans[ligne.rang], ligne.etat]), [[900, 'tenue'], [800, 'tenue']], `${nom(palette)} ${intensite}`);
    }
  }
});

test('le cran corrigé ne passe jamais la clarté de son voisin : il reste tel quel et la garantie manque', () => {
  const emerald = RECETTE.palettes.find((palette) => nom(palette) === 'Emerald')!;
  const rang = rangDe(RECETTE, 700);
  // Le 800 à 0,498, sous les 0,501 du 700 : la correction de Soft, de 0,008, le franchirait.
  const courbe = [...RECETTE.courbes.light];
  courbe[rangDe(RECETTE, 800)] = 0.498;
  const serre: Recette = { ...RECETTE, courbes: { ...RECETTE.courbes, light: courbe } };
  const [soft] = corrections(serre, emerald, 'light');
  const ligne = soft.lignes.find((autre) => autre.rang === rang)!;
  assert.equal(ligne.etat, 'voisin');
  assert.deepEqual(soft.finale[rang], soft.sans[rang]);
  const g3 = verifierPromesses(serre, emerald).find((p) => p.garantie.numero === 3 && p.mode === 'light' && p.profil === 'soft' && p.second.nature === 'cran' && p.second.cran === 200)!;
  assert.equal(g3.verdict, 'manquee');
  // Dans la configuration du mainteneur, aucun cran corrigé n'atteint son voisin.
  for (const recette of [RECETTE, DARK_NORMAL]) {
    for (const palette of recette.palettes) {
      for (const mode of ['light', 'dark'] as const) {
        for (const { finale, lignes } of corrections(recette, palette, mode)) {
          for (const { rang: texte, etat } of lignes) {
            if (etat !== 'corrigee') continue;
            const sens = mode === 'light' ? -1 : 1;
            assert.ok(sens * (finale[texte + 1].L - finale[texte].L) > 0, `${nom(palette)} ${mode} ${recette.crans[texte]}`);
          }
        }
      }
    }
  }
});

test('le cran corrigé est le même pour toutes les variables qui le visent : en Light normal, le 700 porte solid/default, page/foreground, page/border et surface/foreground', () => {
  const emerald = RECETTE.palettes.find((palette) => nom(palette) === 'Emerald')!;
  const rang = rangDe(RECETTE, 700);
  for (const intensite of intensitesDe(emerald)) {
    const cran = rampeDe(rampesDe(RECETTE, emerald), intensite).light[rang];
    const premier = (numero: number) => verifierPromesses(RECETTE, emerald).find((p) => p.garantie.numero === numero && p.mode === 'light' && p.profil === intensite)!.premier;
    // G2 juge solid/default, G3 surface/foreground, G5 page/foreground, G6 page/border, G9 page/foreground.
    for (const numero of [2, 3, 5, 6, 9]) assert.deepEqual(premier(numero).couleur, cran.couleur, `G${numero} ${intensite}`);
    const g1 = verifierPromesses(RECETTE, emerald).filter((p) => p.garantie.numero === 1 && p.mode === 'light' && p.profil === intensite);
    assert.deepEqual(g1[0].second.couleur, cran.couleur, `G1 ${intensite}`);
  }
});

test('la limite dynamique lit les rampes corrigées : G3 au survol tient pour Emerald Soft, alors que ses rampes avant correction la manquent', () => {
  const emerald = RECETTE.palettes.find((palette) => nom(palette) === 'Emerald')!;
  const g3 = (promesses: readonly { garantie: { numero: number }; mode: string; profil: string; second: { nature: string; cran?: number }; verdict: string }[]) =>
    promesses.find((p) => p.garantie.numero === 3 && p.mode === 'light' && p.profil === 'soft' && p.second.nature === 'cran' && p.second.cran === 200)!;
  assert.equal(g3(jugerLesRampes(RECETTE, intensitesDe(emerald), rampesSansCorrection(RECETTE, emerald))).verdict, 'manquee');
  assert.equal(g3(verifierPromesses(RECETTE, emerald)).verdict, 'tenue');
});

test('une palette libre n’a ni table ni correction : ses rampes sont celles d’avant la correction', () => {
  const libre = { ...paletteDeLaTeinte(RECETTE, 600, 150), crans: [100, 200, 700, 800, 950] } as Palette;
  const recette = { ...RECETTE, palettes: [libre] };
  assert.deepEqual(rampesDe(recette, libre), rampesSansCorrection(recette, libre));
});

test('les rampes sans correction et les rampes corrigées ne diffèrent que par les crans de texte', () => {
  const texteLight = [rangDe(RECETTE, 700)];
  const texteDark = [rangDe(RECETTE, 800), rangDe(RECETTE, 950)];
  for (const palette of RECETTE.palettes) {
    const [sans, avec] = [rampesSansCorrection(RECETTE, palette), rampesDe(RECETTE, palette)];
    for (const intensite of intensitesDe(palette) as readonly Intensite[]) {
      for (const [mode, textes] of [['light', texteLight], ['dark', texteDark]] as const) {
        rampeDe(avec, intensite)[mode].forEach((cran, rang) => {
          if (textes.includes(rang)) return;
          assert.deepEqual(cran, rampeDe(sans, intensite)[mode][rang], `${nom(palette)} ${intensite} ${mode} ${RECETTE.crans[rang]}`);
        });
      }
    }
  }
});

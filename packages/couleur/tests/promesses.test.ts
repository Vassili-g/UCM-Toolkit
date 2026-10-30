/** Les promesses du thème : les garanties G1 à G9 ([VER-03] à [VER-07]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GARANTIES,
  ancrageDe,
  compterManquees,
  contraste,
  courbesParDefaut,
  couleurDeLaCarte,
  ecrireHexa,
  intensitesDe,
  jugerLesRampes,
  lineaireVersRgb8,
  lireHexa,
  mesurerCran,
  oklchVersLineaire,
  rampesDe,
  rampesSansCorrection,
  recetteParDefaut,
  rgb8VersOklch,
  verifierPromesses,
  type Mode,
  type Palette,
  type Profil,
  type Promesse,
  type Recette,
  type TexteDesBoutons,
} from '../src/index';
import { COULEUR_DU_TEXTE_DES_BOUTONS } from '@ucm-kit/core/emplois';
import { copie, paletteTailwind, profilsAuxParts, recetteAvec } from './fabrique';

const BLEU = paletteTailwind('p-0000000a', '#1E6FD9');
const recette = recetteAvec(BLEU);

/** Les quatre combinaisons de texte des boutons : Light blanc ou noir, Dark noir ou blanc. */
const COMBINAISONS: readonly { light: TexteDesBoutons; dark: TexteDesBoutons }[] = [
  { light: 'blanc', dark: 'noir' },
  { light: 'noir', dark: 'noir' },
  { light: 'blanc', dark: 'blanc' },
  { light: 'noir', dark: 'blanc' },
];

/** La recette par défaut dont les courbes suivent le texte des boutons demandé. */
function recetteDeTexte(texte: { light: TexteDesBoutons; dark: TexteDesBoutons }, ...palettes: Palette[]): Recette {
  return { ...recetteParDefaut(), texteDesBoutons: texte, courbes: courbesParDefaut(11, texte), palettes };
}

const sens = (mode: Mode, texte: { light: TexteDesBoutons; dark: TexteDesBoutons }) =>
  (mode === 'light' ? texte.light === 'blanc' : texte.dark === 'noir') ? 'normal' : 'inverse';

/** Ce qu'un second membre désigne : un numéro de cran, le fond de la page, la carte, ou le texte des boutons. */
type Cible = number | 'fond' | 'carte' | 'texteDesBoutons';

/**
 * Les garanties de la section 7 du plan, recopiées ici : les tests ci-dessous
 * bouclent sur elles, pas sur le kit, sans quoi une garantie retirée
 * retirerait son propre test. Leur forme se teste dans le kit
 * (`packages/kit/tests/emplois.test.ts`) ; ici, leur jugement. Le premier
 * membre et les fonds, dans l'ordre, pour chaque thème et chaque sens : le Dark
 * pose ses fonds de surface aux crans 100 à 400 et leur texte au 950.
 */
interface Membres { premier: Cible; fonds: Cible[] }
const TABLE_S7: {
  numero: number;
  seuil: 'texte' | 'nonTexte';
  light: { normal: Membres; inverse: Membres };
  dark: { normal: Membres; inverse: Membres };
}[] = [
  {
    numero: 1, seuil: 'texte',
    light: { normal: { premier: 'texteDesBoutons', fonds: [700, 800, 900] }, inverse: { premier: 'texteDesBoutons', fonds: [700, 600, 500] } },
    dark: { normal: { premier: 'texteDesBoutons', fonds: [700, 800, 900] }, inverse: { premier: 'texteDesBoutons', fonds: [700, 600, 500] } },
  },
  {
    numero: 2, seuil: 'nonTexte',
    light: { normal: { premier: 700, fonds: ['fond', 'carte'] }, inverse: { premier: 700, fonds: ['fond', 'carte'] } },
    dark: { normal: { premier: 700, fonds: ['fond', 'carte'] }, inverse: { premier: 700, fonds: ['fond', 'carte'] } },
  },
  {
    numero: 3, seuil: 'texte',
    light: { normal: { premier: 700, fonds: [50, 100, 200, 'fond', 'carte'] }, inverse: { premier: 900, fonds: [50, 100, 200, 'fond', 'carte'] } },
    dark: { normal: { premier: 950, fonds: [100, 200, 300, 'fond', 'carte'] }, inverse: { premier: 950, fonds: [100, 200, 300, 'fond', 'carte'] } },
  },
  {
    numero: 4, seuil: 'nonTexte',
    light: { normal: { premier: 700, fonds: [50, 100, 200, 300, 'fond', 'carte'] }, inverse: { premier: 900, fonds: [50, 100, 200, 300, 'fond', 'carte'] } },
    dark: { normal: { premier: 950, fonds: [100, 200, 300, 400, 'fond', 'carte'] }, inverse: { premier: 950, fonds: [100, 200, 300, 400, 'fond', 'carte'] } },
  },
  {
    numero: 5, seuil: 'texte',
    light: { normal: { premier: 700, fonds: ['fond', 'carte'] }, inverse: { premier: 800, fonds: ['fond', 'carte'] } },
    dark: { normal: { premier: 700, fonds: ['fond', 'carte'] }, inverse: { premier: 800, fonds: ['fond', 'carte'] } },
  },
  {
    numero: 6, seuil: 'nonTexte',
    light: { normal: { premier: 700, fonds: ['fond', 'carte'] }, inverse: { premier: 800, fonds: ['fond', 'carte'] } },
    dark: { normal: { premier: 700, fonds: ['fond', 'carte'] }, inverse: { premier: 800, fonds: ['fond', 'carte'] } },
  },
  {
    numero: 7, seuil: 'nonTexte',
    light: { normal: { premier: 600, fonds: ['fond', 'carte'] }, inverse: { premier: 700, fonds: ['fond', 'carte'] } },
    dark: { normal: { premier: 600, fonds: ['fond', 'carte'] }, inverse: { premier: 800, fonds: ['fond', 'carte'] } },
  },
  {
    numero: 8, seuil: 'nonTexte',
    light: { normal: { premier: 700, fonds: [300] }, inverse: { premier: 900, fonds: [300] } },
    dark: { normal: { premier: 950, fonds: [400] }, inverse: { premier: 950, fonds: [400] } },
  },
  {
    numero: 9, seuil: 'texte',
    light: { normal: { premier: 700, fonds: [100, 200] }, inverse: { premier: 800, fonds: [100, 200] } },
    dark: { normal: { premier: 700, fonds: [200, 300] }, inverse: { premier: 800, fonds: [200, 300] } },
  },
];

const cibleDe = (designation: Promesse['premier'] | Promesse['second']): Cible =>
  designation.nature === 'cran' ? designation.cran : designation.nature === 'fond' ? (designation.fond === 'carte' ? 'carte' : 'fond') : designation.nature;

/** La promesse d'une garantie contre un fond, pour un mode et une intensité. */
function promesse(r: Recette, palette: Palette, numero: number, fond: Cible, mode: Mode, profil: Profil): Promesse {
  const trouvee = verifierPromesses(r, palette)
    .find((p) => p.garantie.numero === numero && cibleDe(p.second) === fond && p.mode === mode && p.profil === profil);
  assert.ok(trouvee, `garantie ${numero} contre ${fond} absente en ${mode}, ${profil}`);
  return trouvee;
}

/**
 * La même promesse jugée sur les rampes avant la correction des textes. Les recettes de `recettePourEchouer`
 * font rejoindre deux membres ; le 700, texte de G3 et de G9, serait éloigné des fonds teintés par la correction
 * et la promesse serait rendue. Le jugement de la garantie se prouve donc sur les rampes que la correction n'a pas touchées.
 */
function promesseAvantCorrection(r: Recette, palette: Palette, numero: number, fond: Cible, mode: Mode, profil: Profil): Promesse {
  const trouvee = jugerLesRampes(r, intensitesDe(palette), rampesSansCorrection(r, palette))
    .find((p) => p.garantie.numero === numero && cibleDe(p.second) === fond && p.mode === mode && p.profil === profil);
  assert.ok(trouvee, `garantie ${numero} contre ${fond} absente en ${mode}, ${profil}`);
  return trouvee;
}

/**
 * Une recette où la promesse échoue pour ce mode et ce profil : un fond de la
 * page prend la couleur du premier membre ; un second cran prend la clarté du
 * texte des boutons (1 pour le blanc, 0 pour le noir) ou celle du premier
 * cran. Le contraste tombe près de 1.
 */
function recettePourEchouer(r: Recette, p: Promesse): Recette {
  const copiee = copie(r);
  if (p.second.nature === 'fond' && p.second.fond === 'carte') {
    // La carte se déduit du fond de la page : le premier membre prend sa clarté, et le contraste tombe près de 1.
    copiee.courbes[p.mode][copiee.crans.indexOf((p.premier as { cran: number }).cran)] = rgb8VersOklch(p.second.couleur).L;
  } else if (p.second.nature === 'fond') {
    copiee.fonds[p.mode] = ecrireHexa(p.premier.couleur);
  } else if (p.second.nature === 'cran') {
    const rang = copiee.crans.indexOf(p.second.cran);
    copiee.courbes[p.mode][rang] = p.premier.nature === 'texteDesBoutons'
      ? (copiee.texteDesBoutons[p.mode] === 'blanc' ? 1 : 0)
      : copiee.courbes[p.mode][copiee.crans.indexOf((p.premier as { cran: number }).cran)];
  }
  return copiee;
}

for (const { numero, light, dark } of TABLE_S7) {
  for (const profil of ['soft', 'vivid'] as const) {
    test(`[VER-03] G${numero}, ${profil} : tenue par défaut, manquée quand ses membres se rejoignent`, () => {
      assert.ok(GARANTIES.some((g) => g.numero === numero), `le kit n'a pas de garantie ${numero}`);
      for (const mode of ['light', 'dark'] as const) {
        for (const fond of (mode === 'light' ? light : dark).normal.fonds) {
          const p = promesse(recette, BLEU, numero, fond, mode, profil);
          assert.equal(p.verdict, 'tenue', `défaut, ${mode}, contre ${fond} : ${p.contraste}`);
          const echec = promesseAvantCorrection(recettePourEchouer(recette, p), BLEU, numero, fond, mode, profil);
          assert.equal(echec.verdict, 'manquee', `${mode}, contre ${fond} : ${echec.contraste}`);
        }
      }
    });
  }
}

test('[VER-03] chaque garantie désigne ses membres dans la table du sens de chaque mode, pour les quatre combinaisons', () => {
  for (const texte of COMBINAISONS) {
    const r = recetteDeTexte(texte, BLEU);
    const rampes = rampesDe(r, BLEU);
    for (const mode of ['light', 'dark'] as const) {
      for (const profil of intensitesDe(BLEU)) {
        const attendues = TABLE_S7.flatMap(({ numero, seuil, ...parSens }) => {
          const { premier, fonds } = parSens[mode][sens(mode, texte)];
          return fonds.map((fond) => ({ numero, seuil, premier, fond }));
        });
        const jugees = verifierPromesses(r, BLEU).filter((p) => p.mode === mode && p.profil === profil);
        const lieu = `${mode}, ${profil}, texte ${texte.light}/${texte.dark}`;
        assert.deepEqual(
          jugees.map((p) => ({ numero: p.garantie.numero, seuil: p.garantie.seuil, premier: cibleDe(p.premier), fond: cibleDe(p.second) })),
          attendues,
          lieu,
        );
        for (const p of jugees) {
          const couleurDe = (cible: Cible) => cible === 'fond'
            ? lireHexa(r.fonds[mode])
            : cible === 'carte'
              ? couleurDeLaCarte(r, mode)
              : cible === 'texteDesBoutons'
                ? lireHexa(COULEUR_DU_TEXTE_DES_BOUTONS[r.texteDesBoutons[mode]])
                : rampes[profil]![mode][r.crans.indexOf(cible)].couleur;
          assert.deepEqual(p.premier.couleur, couleurDe(cibleDe(p.premier)), `premier membre, ${lieu}`);
          assert.deepEqual(p.second.couleur, couleurDe(cibleDe(p.second)), `second membre, ${lieu}`);
          assert.equal(p.seuil, r.seuils[p.garantie.seuil], lieu);
          assert.equal(p.contraste, contraste(p.premier.couleur, p.second.couleur), lieu);
        }
      }
    }
  }
});

test('[VER-03] G8 juge le texte de surface sur l’appui à 3:1, G9 le texte coloré sur le repos et le survol à 4,5:1, et G3 ne juge plus l’appui', () => {
  const promesses = verifierPromesses(recette, BLEU).filter((p) => p.mode === 'light' && p.profil === 'soft');
  const g8 = promesses.filter((p) => p.garantie.numero === 8);
  assert.deepEqual(g8.map((p) => [cibleDe(p.premier), cibleDe(p.second), p.seuil]), [[700, 300, 3]]);
  const g9 = promesses.filter((p) => p.garantie.numero === 9);
  assert.deepEqual(g9.map((p) => [cibleDe(p.premier), cibleDe(p.second), p.seuil]), [[700, 100, 4.5], [700, 200, 4.5]]);
  const g3 = promesses.filter((p) => p.garantie.numero === 3).map((p) => cibleDe(p.second));
  assert.deepEqual(g3, [50, 100, 200, 'fond', 'carte']);
});

test('[VER-03] un fond jugé n’est jamais le texte des boutons', () => {
  for (const texte of COMBINAISONS) {
    for (const p of verifierPromesses(recetteDeTexte(texte, BLEU), BLEU)) {
      assert.notEqual(p.second.nature, 'texteDesBoutons');
      if (p.second.nature === 'fond') assert.notEqual(p.premier.nature, 'fond');
    }
  }
});

test('[VER-03] une palette compte cent promesses, par mode, puis par profil, puis par garantie et par fond', () => {
  const promesses = verifierPromesses(recette, BLEU);
  assert.equal(promesses.length, 100);
  const parGarantie = (mode: 'light' | 'dark') => TABLE_S7.flatMap(({ numero, ...parMode }) => parMode[mode].normal.fonds.map((fond) => `${numero} ${fond}`));
  assert.equal(parGarantie('light').length, 25);
  assert.equal(parGarantie('dark').length, 25);
  const attendu = (['light', 'dark'] as const).flatMap((mode) => ['soft', 'vivid'].flatMap((profil) => parGarantie(mode).map((cle) => `${mode} ${profil} ${cle}`)));
  assert.deepEqual(promesses.map((p) => `${p.mode} ${p.profil} ${p.garantie.numero} ${cibleDe(p.second)}`), attendu);
});

test('[VER-03] une palette à une intensité compte cinquante promesses, jugées sur sa rampe unique', () => {
  const unique = paletteTailwind('p-0000000b', '#1E6FD9', { intensites: 1 });
  const promesses = verifierPromesses(recetteAvec(unique), unique);
  assert.equal(promesses.length, 50);
  assert.deepEqual([...new Set(promesses.map((p) => p.profil))], ['unique']);
});

test('[VER-06] une promesse manquée nomme la garantie, le profil, le contraste et le seuil, sans cran proposé', () => {
  const tenue = promesse(recette, BLEU, 5, 'fond', 'light', 'soft');
  const manquee = promesse(recettePourEchouer(recette, tenue), BLEU, 5, 'fond', 'light', 'soft');
  assert.equal(manquee.verdict, 'manquee');
  assert.deepEqual(
    Object.keys(manquee).sort(),
    ['contraste', 'garantie', 'mode', 'premier', 'profil', 'second', 'seuil', 'verdict'],
  );
  assert.equal(manquee.seuil, 4.5);
  assert.ok(manquee.contraste < manquee.seuil);
});

test('[VER-07] le verdict d’une palette compte ses promesses manquées', () => {
  assert.equal(compterManquees(verifierPromesses(recette, BLEU)), 0);
  const r = { ...recette, fonds: { light: '#F7F7F7', dark: '#5A5A5A' } };
  const manquees = verifierPromesses(r, BLEU).filter((p) => p.verdict === 'manquee');
  assert.ok(manquees.length > 0);
  assert.equal(compterManquees(verifierPromesses(r, BLEU)), manquees.length);
});

/** Une recette sans le cran donné, courbes comprises. */
function sansCran(r: Recette, cran: number): Recette {
  const rang = r.crans.indexOf(cran);
  const sans = <T>(liste: readonly T[]): T[] => liste.filter((_, i) => i !== rang);
  return { ...r, crans: sans(r.crans), courbes: { light: sans(r.courbes.light), dark: sans(r.courbes.dark) } };
}

const garantiesDuMode = (promesses: readonly Promesse[], mode: Mode) => [...new Set(promesses.filter((p) => p.mode === mode).map((p) => p.garantie.numero))];

test('[VER-05] le cran 50 est requis : sans lui, G3 et G4 ne se jugent plus en Light, où surface/subtle le vise', () => {
  const promesses = verifierPromesses(sansCran(recette, 50), BLEU);
  assert.deepEqual(garantiesDuMode(promesses, 'light'), [1, 2, 5, 6, 7, 8, 9]);
  assert.deepEqual(garantiesDuMode(promesses, 'dark'), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(promesses.length, 100 - 2 * (5 + 6));
});

test('[VER-05] sans 400, G4 et G8 ne se jugent plus en Dark, où surface/pressed le vise ; sans 950, G8 non plus, où le texte de surface les vise', () => {
  const sans400 = verifierPromesses(sansCran(recette, 400), BLEU);
  assert.deepEqual(garantiesDuMode(sans400, 'light'), [1, 2, 3, 4, 5, 6, 7, 8, 9], 'sans 400, Light');
  assert.deepEqual(garantiesDuMode(sans400, 'dark'), [1, 2, 3, 5, 6, 7, 9], 'sans 400, Dark');
  assert.equal(sans400.length, 100 - 2 * (6 + 1));
  const sans950 = verifierPromesses(sansCran(recette, 950), BLEU);
  assert.deepEqual(garantiesDuMode(sans950, 'light'), [1, 2, 3, 4, 5, 6, 7, 8, 9], 'sans 950, Light');
  assert.deepEqual(garantiesDuMode(sans950, 'dark'), [1, 2, 5, 6, 7, 9], 'sans 950, Dark');
  assert.equal(sans950.length, 100 - 2 * (5 + 6 + 1));
});

test('[VER-05] sans le cran 900, G1 ne se juge pas dans le sens normal, et les autres garanties restent', () => {
  const promesses = verifierPromesses(sansCran(recette, 900), BLEU);
  assert.deepEqual([...new Set(promesses.map((p) => p.garantie.numero))], [2, 3, 4, 5, 6, 7, 8, 9]);
});

test('[VER-05] sans le cran 500, seul G1 d’un thème inversé se perd : surface/pressed est au 400, surface/divider n’a pas de garantie', () => {
  const sans500 = sansCran(recette, 500);
  assert.equal(verifierPromesses(sans500, BLEU).length, 100, 'deux thèmes normaux : aucune garantie ne vise le 500');
  const inverse = { ...sans500, texteDesBoutons: { light: 'noir' as const, dark: 'noir' as const } };
  const promesses = verifierPromesses(inverse, BLEU);
  assert.deepEqual(garantiesDuMode(promesses, 'light'), [2, 3, 4, 5, 6, 7, 8, 9], 'Light inversé : G1 attend le 500 de solid/pressed');
  assert.deepEqual(garantiesDuMode(promesses, 'dark'), [1, 2, 3, 4, 5, 6, 7, 8, 9], 'Dark normal : le 500 n’est que le filet de surface');
  assert.equal(promesses.length, 2 * 22 + 2 * 25);
});

test('[VER-05] une palette libre n’a pas de promesses', () => {
  const libre = { ...BLEU, crans: [100, 200] } as Palette;
  assert.deepEqual(verifierPromesses(recetteAvec(libre), libre), []);
});

test('[VER-04] un cran n’a pas de verdict', () => {
  const mesure = mesurerCran(lireHexa('#0E5DC6')!, lireHexa('#F7F7F7')!, recetteParDefaut().seuils);
  assert.deepEqual(Object.keys(mesure).sort(), ['blanc', 'fond', 'noir', 'seuilTenu']);
});

test('[VER-03] un cran reçoit ses contrastes contre le fond, le blanc et le noir, et le seuil tenu', () => {
  const seuils = recetteParDefaut().seuils;
  const fond = lireHexa('#F7F7F7')!;
  const cran700 = lireHexa('#0E5DC6')!;
  assert.deepEqual(mesurerCran(cran700, fond, seuils), {
    fond: contraste(cran700, fond),
    blanc: contraste(cran700, [255, 255, 255]),
    noir: contraste(cran700, [0, 0, 0]),
    seuilTenu: 'texte',
  });
  assert.equal(mesurerCran(lireHexa('#1477ED')!, fond, seuils).seuilTenu, 'nonTexte');
  assert.equal(mesurerCran(lireHexa('#4596FA')!, fond, seuils).seuilTenu, null);
});

/** Les oracles de la section 8 : recette par défaut, préréglage Tailwind, profil Vivid, Dark avec texte blanc. */
test('[VER-03] oracles S8 : trois références en Dark avec texte blanc, profil Vivid', () => {
  const texte = { light: 'blanc', dark: 'blanc' } as const;
  const lire = (reference: string) => {
    const palette = paletteTailwind('p-00000001', reference);
    // Les oracles de l'étude portent sur Vivid aux parts communes 0,45 et 0,95 : #2563EB y est la référence de Vivid.
    const r = { ...recetteDeTexte(texte, palette), profils: profilsAuxParts(0.45, 0.95) };
    const g1 = verifierPromesses(r, palette).filter((p) => p.garantie.numero === 1 && p.mode === 'dark' && p.profil === 'vivid');
    return { g1, hexa: (cran: number) => ecrireHexa(rampesDe(r, palette).vivid!.dark[r.crans.indexOf(cran)].couleur), ancre: ancrageDe(r, palette) };
  };
  const proche = (valeur: number, attendu: number) => assert.ok(Math.abs(valeur - attendu) <= 0.01, `${valeur} contre ${attendu}`);

  const bleu = lire('#2563EB');
  assert.equal(bleu.hexa(700), '#2563EB');
  assert.equal(bleu.ancre.crans.dark, 700);
  proche(bleu.g1[0].contraste, 5.17);
  // La bosse de chroma monte le 600 vers la référence, plus vive que sa rampe : #375EB3 sans elle.
  assert.equal(bleu.hexa(600), '#365EB5');
  assert.equal(cibleDe(bleu.g1[1].second), 600);

  const vert = lire('#16A34A');
  assert.equal(vert.hexa(700), '#118840');
  proche(vert.g1[0].contraste, 4.55);
  assert.equal(vert.g1[0].verdict, 'tenue');

  const rouge = lire('#D94635');
  assert.equal(rouge.ancre.crans.dark, 700);
  assert.equal(rouge.hexa(700), '#D94635');
  proche(rouge.g1[0].contraste, 4.31);
  assert.equal(rouge.g1[0].verdict, 'manquee');
});

/** Les quatorze références de l'étude du texte des boutons (`mesurer-dossiers.ts`). */
const REFERENCES = [
  '#1E6FD9', '#2563EB', '#D94635', '#DC2626', '#EAB308', '#FACC15', '#16A34A',
  '#9333EA', '#06B6D4', '#737373', '#808080', '#8B8178', '#F5F5F5', '#171717',
];

/** Les promesses des quatorze références, à une et à deux intensités, avec la nuance où chacune est ancrée. */
function promessesDesReferences(texte: { light: TexteDesBoutons; dark: TexteDesBoutons }) {
  return REFERENCES.flatMap((reference) => [false, true].flatMap((uneIntensite) => {
    const palette = paletteTailwind('p-00000001', reference, uneIntensite ? { intensites: 1 } : {});
    const r = recetteDeTexte(texte, palette);
    const ancrage = ancrageDe(r, palette);
    return verifierPromesses(r, palette).map((p) => ({
      reference,
      p,
      surLAncre: (designation: Promesse['second']) => p.profil === ancrage.profil && designation.nature === 'cran' && designation.cran === ancrage.crans[p.mode],
    }));
  }));
}

test('[VER-03] oracles S8 : sur les quatorze références, G1 n’échoue que sur la nuance ancrée, dans les quatre combinaisons', () => {
  for (const texte of COMBINAISONS) {
    const g1 = promessesDesReferences(texte).filter(({ p }) => p.garantie.numero === 1);
    // Quatorze références, trois rampes chacune (deux intensités, puis une), deux modes, trois fonds.
    assert.equal(g1.length, 14 * 3 * 2 * 3);
    const horsAncrage = g1.filter(({ p, surLAncre }) => !surLAncre(p.second));
    assert.ok(horsAncrage.length > 0);
    const echecs = horsAncrage.filter(({ p }) => p.verdict === 'manquee').map(({ reference, p }) => `${reference} ${p.mode} ${p.profil} ${p.contraste}`);
    assert.deepEqual(echecs, [], `texte ${texte.light}/${texte.dark}`);
  }
});

test('[VER-03] oracles S8 : en Light inversé, cinq références ancrées manquent G1, de 3,90 à 4,43:1 ; hors ancrage, le pire vaut 4,99:1', () => {
  const g1 = promessesDesReferences({ light: 'noir', dark: 'noir' }).filter(({ p }) => p.garantie.numero === 1 && p.mode === 'light');
  const manquees = g1.filter(({ p }) => p.verdict === 'manquee');
  assert.deepEqual([...new Set(manquees.map(({ reference }) => reference))], ['#1E6FD9', '#2563EB', '#DC2626', '#9333EA', '#737373']);
  assert.ok(manquees.every(({ p, surLAncre }) => surLAncre(p.second)));
  const ratios = manquees.map(({ p }) => p.contraste);
  assert.ok(Math.abs(Math.min(...ratios) - 3.90) <= 0.01, String(Math.min(...ratios)));
  assert.ok(Math.abs(Math.max(...ratios) - 4.43) <= 0.01, String(Math.max(...ratios)));
  const pire = Math.min(...g1.filter(({ p, surLAncre }) => !surLAncre(p.second)).map(({ p }) => p.contraste));
  // La clarté selon la teinte baisse les fonds clairs de ces teintes : 5,05:1 sans elle.
  assert.ok(Math.abs(pire - 4.99) <= 0.01, String(pire));
});

test('[VER-03] oracles S8 : G2 à G7 ne manquent jamais sur les quatorze références, dans les quatre combinaisons', () => {
  // G7 se jugeait contre `surface/default` et manquait sur #16A34A en Vivid, Light ; contre la page et la carte, elle tient partout.
  for (const texte of COMBINAISONS) {
    const manquees = promessesDesReferences(texte).filter(({ p }) => p.garantie.numero >= 2 && p.garantie.numero <= 7 && p.verdict === 'manquee');
    assert.deepEqual(manquees.map(({ reference, p }) => `${reference} ${p.mode} ${p.profil} G${p.garantie.numero}`), [], `texte ${texte.light}/${texte.dark}`);
  }
});

test('[VER-03] oracles S8 : sur les quatorze références, G3, G8 et G9 ne manquent que quand leur texte est le cran de la référence, dans les quatre combinaisons', () => {
  for (const texte of COMBINAISONS) {
    const manquees = promessesDesReferences(texte).filter(({ p }) => [3, 8, 9].includes(p.garantie.numero) && p.verdict === 'manquee');
    // Le cran de la référence ne se corrige pas (`corrigerLesTextes`) : Palettes propose alors d'ajuster la référence.
    const horsAncrage = manquees.filter(({ p, surLAncre }) => !surLAncre(p.premier)).map(({ reference, p }) => `${reference} ${p.mode} ${p.profil} G${p.garantie.numero} ${p.contraste}`);
    assert.deepEqual(horsAncrage, [], `texte ${texte.light}/${texte.dark}`);
  }
});

test('[MOT-37] la carte vaut le blanc en Light et le cran qui suit la page en Dark', () => {
  const defaut = recetteParDefaut();
  assert.deepEqual(couleurDeLaCarte(defaut, 'light'), [255, 255, 255]);
  // Le fond Dark par défaut de ce commit est #121212, au cran 50 : la carte est au cran 100, un gris.
  const gris = couleurDeLaCarte(defaut, 'dark');
  assert.equal(gris[0], gris[1]);
  assert.equal(gris[1], gris[2]);
  assert.ok(gris[0] >= 0x1a && gris[0] <= 0x1e, ecrireHexa(gris));

  // Un fond bleuté donne une carte de même teinte, à 5° près.
  const bleute = { ...defaut, fonds: { ...defaut.fonds, dark: '#0B1020' } };
  const carte = rgb8VersOklch(couleurDeLaCarte(bleute, 'dark'));
  const fond = rgb8VersOklch(lireHexa('#0B1020')!);
  const ecart = Math.abs(((carte.H - fond.H + 540) % 360) - 180);
  assert.ok(ecart <= 5, `teinte de la carte ${carte.H}, du fond ${fond.H}`);
  assert.ok(carte.C > 0.01, 'la carte garde la chroma du fond');

  // Un fond à la clarté du cran 100 : la carte est à la clarté du cran 200 (au pas de 8 bits près).
  const clairs = defaut.courbes.dark;
  const auCran100 = ecrireHexa(lineaireVersRgb8(oklchVersLineaire({ L: clairs[1], C: 0, H: 0 })));
  const sur100 = rgb8VersOklch(couleurDeLaCarte({ ...defaut, fonds: { ...defaut.fonds, dark: auCran100 } }, 'dark'));
  assert.ok(Math.abs(sur100.L - clairs[2]) < 0.005, `${sur100.L} contre ${clairs[2]}`);

  // Le dernier rang n'a pas de suivant : la carte reste à sa clarté.
  const dernier = rgb8VersOklch(couleurDeLaCarte({ ...defaut, fonds: { ...defaut.fonds, dark: '#FFFFFF' } }, 'dark'));
  assert.ok(Math.abs(dernier.L - clairs[clairs.length - 1]) < 0.005, String(dernier.L));
});

test('[VER-21] G7 tenue contre la page et manquée contre la carte : deux désignations distinctes', () => {
  const g7Dark = (r: Recette) => verifierPromesses(r, BLEU).filter((p) => p.garantie.numero === 7 && p.mode === 'dark' && p.profil === 'soft');
  // Par défaut, l'anneau tient la page et la carte, en Light comme en Dark.
  for (const p of verifierPromesses(recette, BLEU).filter((promesse) => promesse.garantie.numero === 7)) assert.equal(p.verdict, 'tenue', `${p.mode} ${p.profil} ${cibleDe(p.second)}`);
  // La carte est plus claire que la page : une clarté d'anneau existe où il tient l'une et manque l'autre.
  const rang = recette.crans.indexOf(600);
  let trouvee: Recette | null = null;
  for (let L = 0.4; L <= 0.6 && !trouvee; L += 0.002) {
    const essai = copie(recette);
    essai.courbes.dark[rang] = L;
    const [page, carte] = g7Dark(essai);
    if (page.verdict === 'tenue' && carte.verdict === 'manquee') trouvee = essai;
  }
  assert.ok(trouvee, 'aucune clarté ne sépare la page de la carte');
  const [page, carte] = g7Dark(trouvee);
  assert.deepEqual([cibleDe(page.second), cibleDe(carte.second)], ['fond', 'carte']);
  assert.deepEqual([page.second.nature === 'fond' && page.second.fond, carte.second.nature === 'fond' && carte.second.fond], ['page', 'carte']);
  assert.deepEqual(page.second.couleur, lireHexa(trouvee.fonds.dark));
  assert.deepEqual(carte.second.couleur, couleurDeLaCarte(trouvee, 'dark'));
  assert.notDeepEqual(page.second.couleur, carte.second.couleur);
  assert.deepEqual(page.premier.couleur, carte.premier.couleur, 'le même anneau, deux fonds');
  assert.ok(page.contraste > carte.contraste, 'la carte, plus claire que la page, porte moins de contraste');
});

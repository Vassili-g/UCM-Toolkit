/** Les promesses du thème : les garanties G1 à G7 ([VER-03] à [VER-07]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GARANTIES,
  ancrageDe,
  compterManquees,
  contraste,
  courbesParDefaut,
  ecrireHexa,
  intensitesDe,
  lireHexa,
  mesurerCran,
  rampesDe,
  recetteParDefaut,
  verifierPromesses,
  type Mode,
  type Palette,
  type Profil,
  type Promesse,
  type Recette,
  type TexteDesBoutons,
} from '../src/index';
import { copie, paletteTailwind, recetteAvec } from './fabrique';

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

/** Ce qu'un second membre désigne : un numéro de cran, le fond de la page, ou le texte des boutons. */
type Cible = number | 'fond' | 'texteDesBoutons';

/**
 * Les garanties de la section 7 du plan, recopiées ici : les tests ci-dessous
 * bouclent sur elles, pas sur le kit, sans quoi une garantie retirée
 * retirerait son propre test. Leur forme se teste dans le kit
 * (`packages/kit/tests/emplois.test.ts`) ; ici, leur jugement. Le premier
 * membre et les fonds, dans l'ordre, pour chaque sens.
 */
const TABLE_S7: {
  numero: number;
  seuil: 'texte' | 'nonTexte';
  normal: { premier: Cible; fonds: Cible[] };
  inverse: { premier: Cible; fonds: Cible[] };
}[] = [
  { numero: 1, seuil: 'texte', normal: { premier: 'texteDesBoutons', fonds: [700, 800, 900] }, inverse: { premier: 'texteDesBoutons', fonds: [700, 600, 500] } },
  { numero: 2, seuil: 'nonTexte', normal: { premier: 700, fonds: ['fond'] }, inverse: { premier: 700, fonds: ['fond'] } },
  { numero: 3, seuil: 'texte', normal: { premier: 800, fonds: [100, 200, 300, 'fond'] }, inverse: { premier: 900, fonds: [100, 200, 300, 'fond'] } },
  { numero: 4, seuil: 'nonTexte', normal: { premier: 800, fonds: [100, 200, 300, 'fond'] }, inverse: { premier: 900, fonds: [100, 200, 300, 'fond'] } },
  { numero: 5, seuil: 'texte', normal: { premier: 700, fonds: ['fond'] }, inverse: { premier: 800, fonds: ['fond'] } },
  { numero: 6, seuil: 'nonTexte', normal: { premier: 700, fonds: ['fond'] }, inverse: { premier: 800, fonds: ['fond'] } },
  { numero: 7, seuil: 'nonTexte', normal: { premier: 600, fonds: ['fond', 100] }, inverse: { premier: 700, fonds: ['fond', 100] } },
];

const cibleDe = (designation: Promesse['premier'] | Promesse['second']): Cible =>
  designation.nature === 'cran' ? designation.cran : designation.nature;

/** La promesse d'une garantie contre un fond, pour un mode et une intensité. */
function promesse(r: Recette, palette: Palette, numero: number, fond: Cible, mode: Mode, profil: Profil): Promesse {
  const trouvee = verifierPromesses(r, palette)
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
  if (p.second.nature === 'fond') {
    copiee.fonds[p.mode] = ecrireHexa(p.premier.couleur);
  } else if (p.second.nature === 'cran') {
    const rang = copiee.crans.indexOf(p.second.cran);
    copiee.courbes[p.mode][rang] = p.premier.nature === 'texteDesBoutons'
      ? (copiee.texteDesBoutons[p.mode] === 'blanc' ? 1 : 0)
      : copiee.courbes[p.mode][copiee.crans.indexOf((p.premier as { cran: number }).cran)];
  }
  return copiee;
}

for (const { numero, normal } of TABLE_S7) {
  for (const profil of ['soft', 'vivid'] as const) {
    test(`[VER-03] G${numero}, ${profil} : tenue par défaut, manquée quand ses membres se rejoignent`, () => {
      assert.ok(GARANTIES.some((g) => g.numero === numero), `le kit n'a pas de garantie ${numero}`);
      for (const mode of ['light', 'dark'] as const) {
        for (const fond of normal.fonds) {
          const p = promesse(recette, BLEU, numero, fond, mode, profil);
          assert.equal(p.verdict, 'tenue', `défaut, ${mode}, contre ${fond} : ${p.contraste}`);
          const echec = promesse(recettePourEchouer(recette, p), BLEU, numero, fond, mode, profil);
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
          const { premier, fonds } = parSens[sens(mode, texte)];
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
            : cible === 'texteDesBoutons'
              ? lireHexa(r.texteDesBoutons[mode] === 'blanc' ? '#FFFFFF' : '#000000')
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

test('[VER-03] le fond de la page est le seul fond jugé : jamais le texte des boutons', () => {
  for (const texte of COMBINAISONS) {
    for (const p of verifierPromesses(recetteDeTexte(texte, BLEU), BLEU)) {
      assert.notEqual(p.second.nature, 'texteDesBoutons');
      if (p.second.nature === 'fond') assert.notEqual(p.premier.nature, 'fond');
    }
  }
});

test('[VER-03] une palette compte soixante-quatre promesses, par mode, puis par profil, puis par garantie et par fond', () => {
  const promesses = verifierPromesses(recette, BLEU);
  assert.equal(promesses.length, 64);
  const parGarantie = TABLE_S7.flatMap(({ numero, normal }) => normal.fonds.map((fond) => `${numero} ${fond}`));
  assert.equal(parGarantie.length, 16);
  const attendu = ['light', 'dark'].flatMap((mode) => ['soft', 'vivid'].flatMap((profil) => parGarantie.map((cle) => `${mode} ${profil} ${cle}`)));
  assert.deepEqual(promesses.map((p) => `${p.mode} ${p.profil} ${p.garantie.numero} ${cibleDe(p.second)}`), attendu);
});

test('[VER-03] une palette à une intensité compte trente-deux promesses, jugées sur sa rampe unique', () => {
  const unique = paletteTailwind('p-0000000b', '#1E6FD9', { intensites: 1 });
  const promesses = verifierPromesses(recetteAvec(unique), unique);
  assert.equal(promesses.length, 32);
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

test('[VER-05] les crans 50, 400 et 950 sont facultatifs : sans eux, aucune garantie ne s’en va', () => {
  for (const cran of [50, 400, 950]) {
    const sans = sansCran(recette, cran);
    assert.ok(!sans.crans.includes(cran));
    assert.equal(verifierPromesses(sans, BLEU).length, 64, `sans ${cran}`);
  }
});

test('[VER-05] sans le cran 900, G1 ne se juge pas dans le sens normal, et les autres garanties restent', () => {
  const promesses = verifierPromesses(sansCran(recette, 900), BLEU);
  assert.deepEqual([...new Set(promesses.map((p) => p.garantie.numero))], [2, 3, 4, 5, 6, 7]);
});

test('[VER-05] sans le cran 500, G1 ne se juge que dans les thèmes normaux', () => {
  const sans500 = sansCran(recette, 500);
  assert.equal(verifierPromesses(sans500, BLEU).length, 64, 'deux thèmes normaux');
  const inverse = { ...sans500, texteDesBoutons: { light: 'noir' as const, dark: 'noir' as const } };
  const promesses = verifierPromesses(inverse, BLEU);
  const parMode = (mode: Mode) => [...new Set(promesses.filter((p) => p.mode === mode).map((p) => p.garantie.numero))];
  assert.deepEqual(parMode('light'), [2, 3, 4, 5, 6, 7], 'Light inversé : G1 attend le 500 de solid/pressed');
  assert.deepEqual(parMode('dark'), [1, 2, 3, 4, 5, 6, 7], 'Dark normal : G1 se juge');
  assert.equal(promesses.length, 2 * 13 + 2 * 16);
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
    const r = recetteDeTexte(texte, palette);
    const g1 = verifierPromesses(r, palette).filter((p) => p.garantie.numero === 1 && p.mode === 'dark' && p.profil === 'vivid');
    return { g1, hexa: (cran: number) => ecrireHexa(rampesDe(r, palette).vivid!.dark[r.crans.indexOf(cran)].couleur), ancre: ancrageDe(r, palette) };
  };
  const proche = (valeur: number, attendu: number) => assert.ok(Math.abs(valeur - attendu) <= 0.01, `${valeur} contre ${attendu}`);

  const bleu = lire('#2563EB');
  assert.equal(bleu.hexa(700), '#2563EB');
  assert.equal(bleu.ancre.crans.dark, 700);
  proche(bleu.g1[0].contraste, 5.17);
  assert.equal(bleu.hexa(600), '#154FE4');
  assert.equal(cibleDe(bleu.g1[1].second), 600);

  const vert = lire('#16A34A');
  assert.equal(vert.hexa(700), '#11883D');
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

test('[VER-03] oracles S8 : en Light inversé, cinq références ancrées manquent G1, de 3,90 à 4,43:1 ; hors ancrage, le pire vaut 5,27:1', () => {
  const g1 = promessesDesReferences({ light: 'noir', dark: 'noir' }).filter(({ p }) => p.garantie.numero === 1 && p.mode === 'light');
  const manquees = g1.filter(({ p }) => p.verdict === 'manquee');
  assert.deepEqual([...new Set(manquees.map(({ reference }) => reference))], ['#1E6FD9', '#2563EB', '#DC2626', '#9333EA', '#737373']);
  assert.ok(manquees.every(({ p, surLAncre }) => surLAncre(p.second)));
  const ratios = manquees.map(({ p }) => p.contraste);
  assert.ok(Math.abs(Math.min(...ratios) - 3.90) <= 0.01, String(Math.min(...ratios)));
  assert.ok(Math.abs(Math.max(...ratios) - 4.43) <= 0.01, String(Math.max(...ratios)));
  const pire = Math.min(...g1.filter(({ p, surLAncre }) => !surLAncre(p.second)).map(({ p }) => p.contraste));
  assert.ok(Math.abs(pire - 5.27) <= 0.01, String(pire));
});

test('[VER-03] oracles S8 : G2 à G6 ne manquent jamais, et G7 ne manque que sur #16A34A, à son anneau ancré', () => {
  for (const texte of COMBINAISONS) {
    const manquees = promessesDesReferences(texte).filter(({ p }) => p.garantie.numero >= 2 && p.verdict === 'manquee');
    assert.ok(manquees.every(({ p }) => p.garantie.numero === 7), `G2 à G6, texte ${texte.light}/${texte.dark}`);
    assert.ok(manquees.every(({ reference }) => reference === '#16A34A'));
    assert.ok(manquees.every(({ p, surLAncre }) => surLAncre(p.premier)), 'l’anneau manqué est la référence ancrée');
    // 600 en Light, 700 en Light inversé : le Dark tient G7 dans les deux sens.
    assert.deepEqual(
      [...new Set(manquees.map(({ p }) => `${p.mode} ${cibleDe(p.premier)}`))],
      [`light ${sens('light', texte) === 'normal' ? 600 : 700}`],
    );
  }
});

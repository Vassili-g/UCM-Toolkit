/** W6 et W7 : les préréglages, la palette libre, le format 3 et la proposition d'ajustement (CONCEPTION-NUANCES-ET-FORMAT-3.md). */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FORMAT_RECETTE,
  PREREGLAGES,
  alertesDeRecette,
  ancrageDe,
  boutsDe,
  classerRecette,
  courbesParDefaut,
  confusionsDe,
  distanceDePalettes,
  ecrireHexa,
  fabriquerPalette,
  grilleAuPrereglage,
  grilleDe,
  jsonCanonique,
  lireHexa,
  luminositeAuNumero,
  nombreDeNuancesDe,
  nuancesReglees,
  propositionDAjustement,
  pasDepuisLOriginale,
  rampesDe,
  recetteParDefaut,
  recetteAvecTexteDesBoutons,
  validerRecette,
  variablesDuCran,
  verifierPromesses,
  type Palette,
  type Recette,
} from '../src/index';
import { copie, paletteTailwind, recetteAvec } from './fabrique';

const proche = (valeur: number, attendue: number) => assert.ok(Math.abs(valeur - attendue) < 1e-9, `${valeur} ≠ ${attendue}`);

test('les deux préréglages portent les courbes par défaut des quatre combinaisons de texte', () => {
  for (const nombre of [11, 13] as const) {
    for (const light of ['blanc', 'noir'] as const) {
      for (const dark of ['blanc', 'noir'] as const) {
        const texteDesBoutons = { light, dark };
        const courbes = courbesParDefaut(nombre, texteDesBoutons);
        const attendues = {
          light: light === 'noir' ? [0.745, 0.69, 0.61, 0.42] : [0.67, 0.585, 0.5, 0.42],
          dark: dark === 'blanc' ? [0.45, 0.5, 0.55, 0.7] : [0.49, 0.58, 0.67, 0.76],
        };
        for (const mode of ['light', 'dark'] as const) {
          assert.deepEqual(PREREGLAGES[nombre].crans.map((cran, rang) => courbes[mode][rang]),
            PREREGLAGES[nombre].crans.map((cran, rang) => {
              const position = [500, 600, 700, 800].indexOf(cran);
              return position < 0 ? PREREGLAGES[nombre].courbes[mode][rang] : attendues[mode][position];
            }));
          const recette = { ...recetteParDefaut(), crans: PREREGLAGES[nombre].crans, courbes, texteDesBoutons };
          assert.deepEqual(nuancesReglees(recette, mode), []);
          assert.ok('recette' in validerRecette(recette));
        }
      }
    }
  }
});

test('Dark blanc puis noir rend la courbe initiale, et un choix identique conserve la recette', () => {
  const normale = recetteParDefaut();
  assert.deepEqual(recetteAvecTexteDesBoutons(normale, 'dark', 'noir'), { recette: normale, remplacees: [] });
  const inversee = recetteAvecTexteDesBoutons(normale, 'dark', 'blanc');
  assert.ok('recette' in inversee);
  assert.deepEqual(inversee.remplacees, [500, 600, 700, 800]);
  assert.deepEqual(inversee.recette.courbes.light, normale.courbes.light);
  const retour = recetteAvecTexteDesBoutons(inversee.recette, 'dark', 'noir');
  assert.ok('recette' in retour);
  assert.deepEqual(retour.recette, normale);
});

test('le changement garde une 300 réglée et relève les seules nuances réglées de 500 à 800', () => {
  const recette = copie(recetteParDefaut());
  recette.courbes.dark[recette.crans.indexOf(300)] = 0.35;
  recette.courbes.dark[recette.crans.indexOf(600)] = 0.59;
  assert.deepEqual(nuancesReglees(recette, 'dark'), [600]);
  assert.deepEqual(nuancesReglees(recette, 'light'), []);
  const resultat = recetteAvecTexteDesBoutons(recette, 'dark', 'blanc');
  assert.ok('recette' in resultat);
  assert.equal(resultat.recette.courbes.dark[recette.crans.indexOf(300)], 0.35);
  assert.deepEqual(nuancesReglees(resultat.recette, 'dark'), []);
  assert.equal(recette.texteDesBoutons.dark, 'noir');
  assert.equal(recette.courbes.dark[recette.crans.indexOf(600)], 0.59);
});

test('une 400 Dark réglée à 0,47 refuse le passage au blanc sans modifier la recette', () => {
  const recette = copie(recetteParDefaut());
  recette.courbes.dark[recette.crans.indexOf(400)] = 0.47;
  const avant = jsonCanonique(recette);
  assert.deepEqual(recetteAvecTexteDesBoutons(recette, 'dark', 'blanc'), { refus: 'courbe-non-monotone' });
  assert.equal(jsonCanonique(recette), avant);
});

test('le changement ne remplace que les numéros présents dans une liste importée', () => {
  const defaut = recetteParDefaut();
  const rangs = defaut.crans.map((cran, rang) => cran === 600 ? -1 : rang).filter((rang) => rang >= 0);
  const recette = { ...defaut, crans: rangs.map((rang) => defaut.crans[rang]), courbes: {
    light: rangs.map((rang) => defaut.courbes.light[rang]), dark: rangs.map((rang) => defaut.courbes.dark[rang]),
  } };
  const resultat = recetteAvecTexteDesBoutons(recette, 'dark', 'blanc');
  assert.ok('recette' in resultat);
  assert.deepEqual(resultat.remplacees, [500, 700, 800]);
  assert.deepEqual(resultat.recette.crans, recette.crans);
});

/** La recette par défaut passée à un préréglage, avec les palettes données. */
function recetteA(nombre: 11 | 13, ...palettes: Palette[]): Recette {
  const { crans, courbes } = grilleAuPrereglage(recetteParDefaut(), nombre);
  return { ...recetteAvec(...palettes), crans, courbes };
}

/** Les hexas d'une palette par nuance, dans chaque profil et chaque thème. */
function hexasParNuance(recette: Recette, palette: Palette): Map<string, string> {
  const rampes = rampesDe(recette, palette);
  const { crans } = grilleDe(recette, palette);
  const hexas = new Map<string, string>();
  for (const profil of ['soft', 'vivid'] as const) {
    for (const mode of ['light', 'dark'] as const) rampes[profil]![mode].forEach((cran, rang) => hexas.set(`${profil}/${mode}/${crans[rang]}`, cran.hexa));
  }
  return hexas;
}

test('W6 : les deux préréglages se reconnaissent, et la recette par défaut est celle de onze nuances', () => {
  assert.equal(nombreDeNuancesDe(recetteParDefaut().crans), 11);
  assert.equal(nombreDeNuancesDe(PREREGLAGES[13].crans), 13);
  assert.equal(nombreDeNuancesDe([50, 100, 200, 300, 400, 500, 600, 700, 800, 900]), null);
  assert.deepEqual(PREREGLAGES[13].crans.slice(-2), [1000, 1050]);
  for (const nombre of [11, 13] as const) assert.ok('recette' in validerRecette(recetteA(nombre)), String(nombre));
  assert.deepEqual(Object.keys(PREREGLAGES), ['11', '13'], 'le préréglage à neuf nuances, sans 400 ni 950, est retiré');
});

test('W6.8 : chaque préréglage garde les variables de thème à leurs numéros', () => {
  const variablesParNumero = (recette: Recette) => new Map(recette.crans.map((cran, rang) => [cran, variablesDuCran(recette.crans, rang, 'normal', true)]));
  const onze = variablesParNumero(recetteParDefaut());
  for (const nombre of [13] as const) {
    const autres = variablesParNumero(recetteA(nombre));
    for (const [cran, emplois] of onze) if (emplois.length > 0) assert.deepEqual(autres.get(cran), emplois, `${nombre} : ${cran}`);
  }
});

test('W6 : la luminosité d’un numéro, dans la liste, entre deux numéros, après et avant la liste', () => {
  const defaut = recetteParDefaut();
  assert.equal(luminositeAuNumero(defaut, 'light', 600), 0.585);
  proche(luminositeAuNumero(defaut, 'light', 450), (0.76 + 0.67) / 2);
  proche(luminositeAuNumero(defaut, 'light', 1000), 0.215);
  proche(luminositeAuNumero(defaut, 'light', 1050), 0.165);
  proche(luminositeAuNumero(defaut, 'dark', 1000), 0.96);
  proche(luminositeAuNumero(defaut, 'dark', 1050), 0.98);
  // Une courbe Dark réglée près du blanc : la règle proportionnelle reste monotone et n'atteint pas 1.
  const reglee = { ...defaut, courbes: { ...defaut.courbes, dark: defaut.courbes.dark.map((L, rang) => (rang === 10 ? 0.97 : L)) } };
  const [mille, milleCinquante] = [1000, 1050].map((numero) => luminositeAuNumero(reglee, 'dark', numero));
  assert.ok(mille > 0.97 && milleCinquante > mille && milleCinquante < 1, `${mille} ${milleCinquante}`);
  // Avant la liste : une liste importée qui commence à 100 prolonge vers le blanc en Light.
  const importee = { crans: defaut.crans.slice(1), courbes: { light: defaut.courbes.light.slice(1), dark: defaut.courbes.dark.slice(1) } };
  const cinquante = luminositeAuNumero(importee, 'light', 50);
  assert.ok(cinquante > 0.95 && cinquante < 1, String(cinquante));
});

test('W6 : les bouts de la dérive se lisent aux numéros 50 et 950, préréglage 13 compris', () => {
  for (const nombre of [11, 13] as const) {
    const bouts = boutsDe(PREREGLAGES[nombre]);
    proche(bouts.clair, 0.975);
    proche(bouts.sombre, 0.27);
  }
});

test('W6 : passer de 11 à 13 nuances ne change aucune couleur existante, hors des deux cas d’ancrage', () => {
  for (const hexa of ['#1E6FD9', '#16A34A', '#F2A900', '#6B7280', '#7C3AED']) {
    const palette = paletteTailwind('p-0000000a', hexa);
    const onze = hexasParNuance(recetteA(11, palette), palette);
    const treize = hexasParNuance(recetteA(13, palette), palette);
    for (const [cle, valeur] of onze) assert.equal(treize.get(cle), valeur, `${hexa} ${cle}`);
  }
  // Sous 0,2425 de luminosité, la référence s'ancre au 1000 en Light, et le 950 reprend sa couleur calculée.
  const sombre = paletteTailwind('p-0000000b', '#0B1A33');
  assert.equal(ancrageDe(recetteA(11, sombre), sombre).crans.light, 950);
  assert.equal(ancrageDe(recetteA(13, sombre), sombre).crans.light, 1000);
  const auDessus = paletteTailwind('p-0000000c', '#1A2A45');
  assert.equal(ancrageDe(recetteA(13, auDessus), auDessus).crans.light, 950, 'au-dessus du seuil, l’ancrage reste au 950');
});

test('W6.4 : un préréglage garde les luminosités réglées ; un numéro ajouté prend la sienne, ou la règle quand ses voisines l’empêchent', () => {
  const retour = grilleAuPrereglage(recetteA(13), 11);
  assert.deepEqual(retour.courbes, recetteParDefaut().courbes, '13 → 11 rend les courbes par défaut');
  const reglee = { ...recetteParDefaut(), courbes: { ...recetteParDefaut().courbes, light: recetteParDefaut().courbes.light.map((L, rang) => (rang === 10 ? 0.2 : L)) } };
  const treize = grilleAuPrereglage(reglee, 13);
  assert.equal(treize.courbes.light[10], 0.2, 'la valeur réglée est gardée');
  assert.ok(treize.courbes.light[11] < 0.2 && treize.courbes.light[12] < treize.courbes.light[11], 'la courbe reste monotone');
  assert.ok('recette' in validerRecette({ ...reglee, ...treize }));
});

test('W6 : une palette libre suit les courbes communes, garde sa référence exacte, et n’a ni promesse ni alerte des emplois', () => {
  const libre: Palette = { ...paletteTailwind('p-0000000a', '#1E6FD9'), crans: [100, 200, 400, 600, 800, 900] };
  const recette = recetteAvec(libre);
  assert.ok('recette' in validerRecette(recette));
  const grille = grilleDe(recette, libre);
  assert.deepEqual(grille.crans, [100, 200, 400, 600, 800, 900]);
  assert.deepEqual(grille.courbes.light, [0.95, 0.905, 0.76, 0.585, 0.42, 0.34]);
  const ancrage = ancrageDe(recette, libre);
  assert.deepEqual(ancrage.crans, { light: 600, dark: 600 });
  assert.equal(rampesDe(recette, libre)[ancrage.profil]!.light[ancrage.rangs.light].hexa, '#1E6FD9');
  assert.deepEqual(verifierPromesses(recette, libre), []);
  assert.ok(!alertesDeRecette(recette).some((alerte) => alerte.code === 'profils-confondus'));
  // À numéro égal et parts égales, hors de la nuance de la référence, la couleur est celle du modèle.
  const modele = paletteTailwind('p-0000000b', '#1E6FD9');
  const hexasDuModele = hexasParNuance(recetteAvec(modele), modele);
  for (const [cle, valeur] of hexasParNuance(recette, libre)) if (!cle.endsWith('/600')) assert.equal(valeur, hexasDuModele.get(cle), cle);
  // Le repère ≈ vaut sur toute nuance : le 100 de ce bleu confond Soft et Vivid.
  assert.ok(confusionsDe(recette, libre).some(({ cran }) => cran === 100));
});

test('W6.8 : une palette libre sans 500 ne se compare à aucune ; deux palettes qui portent 500, 600 et 700 se comparent', () => {
  const sans500: Palette = { ...paletteTailwind('p-0000000a', '#1E6FD9'), crans: [100, 300, 600, 700, 900] };
  const voisine = paletteTailwind('p-0000000b', '#1D6DDB');
  assert.equal(distanceDePalettes(recetteAvec(sans500, voisine), sans500, voisine), null);
  const avec500: Palette = { ...paletteTailwind('p-0000000c', '#1E6FD9'), crans: [100, 500, 600, 700] };
  const recette = recetteAvec(avec500, voisine);
  const distance = distanceDePalettes(recette, avec500, voisine);
  assert.ok(distance !== null && distance < recette.seuils.palettesProches);
  assert.ok(alertesDeRecette(recette).some((alerte) => alerte.code === 'palettes-proches'));
});

test('W6.3 : les règles du format 3 refusent une liste libre hors bornes, une base sur une palette libre et une originale identique', () => {
  const refus = (palette: Record<string, unknown>) => {
    const jugee = validerRecette({ ...recetteParDefaut(), palettes: [palette] });
    return 'refus' in jugee ? jugee.refus.map(({ regle, chemin }) => `${regle} ${chemin}`) : [];
  };
  const base = copie(paletteTailwind('p-0000000a', '#1E6FD9'));
  assert.deepEqual(refus({ ...base, crans: [100, 200, 300] }), ['crans-libres-nombre palettes[0].crans']);
  assert.deepEqual(refus({ ...base, crans: Array.from({ length: 14 }, (_, rang) => 50 + 50 * rang) }), ['crans-libres-nombre palettes[0].crans']);
  assert.deepEqual(refus({ ...base, crans: [100, 250, 225, 1100] }), ['crans-libres-numeros palettes[0].crans[2]', 'crans-libres-numeros palettes[0].crans[3]']);
  assert.deepEqual(refus({ ...base, crans: [100, 200, '300', 400] }), ['forme palettes[0].crans[2]']);
  assert.deepEqual(refus({ ...base, crans: [100, 200, 300, 400], base: 'soft' }), ['base-libre palettes[0].base']);
  assert.deepEqual(refus({ ...base, originale: '#1e6fd9' }), ['originale-identique palettes[0].originale']);
  assert.deepEqual(refus({ ...base, originale: '#12' }), ['hexa-invalide palettes[0].originale']);
  assert.deepEqual(refus({ ...base, crans: [...recetteParDefaut().crans], originale: '#16A34A' }), [], 'une liste égale à la liste commune est admise');
});

test('W7.6 : un pas sombre sur #16A34A donne #0DA047, zéro pas rend l’originale, et le pas se retrouve depuis la référence', () => {
  const originale = lireHexa('#16A34A')!;
  assert.equal(ecrireHexa(propositionDAjustement(originale, -1, 'srgb')!), '#0DA047');
  assert.equal(propositionDAjustement(originale, 0, 'srgb'), originale);
  assert.equal(propositionDAjustement(originale, 100, 'srgb'), null, 'hors de [0, 1]');
  assert.equal(pasDepuisLOriginale(originale, lireHexa('#0DA047')!, 'srgb'), -1);
  assert.equal(pasDepuisLOriginale(originale, lireHexa('#0DA048')!, 'srgb'), null, 'un code saisi à la main n’est pas une proposition');
});

/** Les alertes de la section 11.3 ([VER-08], [VER-10], [VER-11], [VER-22], [ENT-06], [ENT-09]). */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { cranDeLaVariable } from '@ucm-kit/core/emplois';

import {
  CHROMA_DES_PALETTES_COLOREES,
  PART_DE_CHROMA_QUI_DISTINGUE,
  POIDS_DES_CRANS_DE_PROXIMITE,
  aDesProfilsTernes,
  aUneIntensite,
  alertesDePalette,
  alertesDeRecette,
  confusionsDe,
  courbesParDefaut,
  distanceOk,
  grilleAuPrereglage,
  lireHexa,
  pairesTropProches,
  poidsDeProximite,
  proximiteDePalettes,
  rampeDe,
  rampesDe,
  rangsDesVariables,
  recetteParDefaut,
  rgb8VersOklch,
  severiteDeLAlerte,
  validerRecette,
  type Alerte,
  type Palette,
  type Recette,
} from '../src/index';
import { paletteTailwind, recetteAuxPartsDe045, recetteAvec } from './fabrique';

const BLEU = paletteTailwind('p-0000000a', '#1E6FD9');
const codes = (alertes: Alerte[]) => alertes.map((a) => a.code);
const dePalette = (palette: Palette) => alertesDePalette(recetteAvec(palette), palette);

test('[VER-08] profils confondus : sonne à partir de trois nuances, avec la mesure et le seuil', () => {
  // Aux parts communes 0,45 et 0,95, #1E6FD9 ne confond ses profils qu'au cran 100 clair : sous trois nuances, la palette passe.
  assert.ok(!codes(alertesDePalette(recetteAuxPartsDe045(BLEU), BLEU)).includes('profils-confondus'));
  const serrees = { ...BLEU, parts: { soft: 0.1, vivid: 0.105, origine: 'designer' as const } };
  const alerte = dePalette(serrees).find((a) => a.code === 'profils-confondus');
  assert.ok(alerte && alerte.code === 'profils-confondus');
  assert.ok(alerte.crans.length >= 3);
  for (const confusion of alerte.crans) assert.ok(confusion.distance < alerte.seuil);
  assert.equal(alerte.seuil, 0.02);
});

test('[VER-11] profils confondus : ne regarde que les crans que les variables de palette visent, dans le sens de chaque mode', () => {
  const recette = recetteParDefaut();
  const crans = (r: typeof recette) => rangsDesVariables(r).map((rang) => r.crans[rang]);
  // Le 50 est visé par surface/subtle, le 400 et le 950 par les surfaces du Dark.
  const tous = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  assert.deepEqual(crans(recette), tous);
  assert.deepEqual(crans({ ...recette, texteDesBoutons: { light: 'noir', dark: 'noir' } }), tous);
  assert.deepEqual(crans({ ...recette, texteDesBoutons: { light: 'blanc', dark: 'blanc' } }), tous);
  // Une liste sans 500 n'en a pas.
  const sans500 = { ...recette, texteDesBoutons: { light: 'noir' as const, dark: 'noir' as const }, crans: recette.crans.filter((cran) => cran !== 500) };
  assert.deepEqual(crans(sans500), [50, 100, 200, 300, 400, 600, 700, 800, 900, 950]);
});

/** Une palette de cette référence aux parts du designer, dans la recette par défaut. */
const auxParts = (reference: string, soft: number, vivid: number): Palette => ({ ...paletteTailwind('p-0000000b', reference), parts: { soft, vivid, origine: 'designer' as const } });
const nuancesConfondues = (palette: Palette) => confusionsDe(recetteAvec(palette), palette).map(({ mode, cran }) => `${mode} ${cran}`);

test('[VER-11] profils confondus : ne juge que les fonds, trois Dark (surface default, hover, pressed) et deux Light (hover, pressed)', () => {
  // Un bleu aux parts voisines confond tous ses crans : seuls les cinq fonds sont rendus, jamais le fond Light de surface/default (cran 100).
  assert.deepEqual(nuancesConfondues(auxParts('#1E6FD9', 0.3, 0.31)), ['light 200', 'light 300', 'dark 200', 'dark 300', 'dark 400']);
  assert.equal(cranDeLaVariable('surface/hover', 'light', 'normal'), 200);
  assert.equal(cranDeLaVariable('surface/pressed', 'light', 'normal'), 300);
  assert.deepEqual((['surface/default', 'surface/hover', 'surface/pressed'] as const).map((variable) => cranDeLaVariable(variable, 'dark', 'normal')), [200, 300, 400]);
});

test('[VER-11] [PLA-15] profils confondus, thème Light : le repère ≈ marque le fond hover et ne suffit pas à l’alerte', () => {
  // Le 300 Light, plus clair depuis la clarté commune des crans clairs, confond ses profils pour des parts plus proches que 0,05.
  const palette = auxParts('#D92626', 0.86, 0.91);
  assert.deepEqual(nuancesConfondues(palette), ['light 200']);
  assert.ok(!codes(dePalette(palette)).includes('profils-confondus'));
  // Les deux fonds Light de la liste ne font que deux nuances : il en faut trois.
  const deux = auxParts('#D92626', 0.85, 0.86);
  assert.deepEqual(nuancesConfondues(deux), ['light 200', 'light 300']);
  assert.ok(!codes(dePalette(deux)).includes('profils-confondus'));
});

test('[VER-11] profils confondus, thème Dark : trois fonds Dark confondus suffisent à l’alerte, sans exemption des fonds atténués', () => {
  const palette = auxParts('#14B8A6', 0.2, 0.4);
  assert.deepEqual(nuancesConfondues(palette), ['dark 200', 'dark 300', 'dark 400']);
  const alerte = dePalette(palette).find((a) => a.code === 'profils-confondus');
  assert.ok(alerte && alerte.code === 'profils-confondus');
  assert.deepEqual(alerte.crans.map(({ mode, cran }) => `${mode} ${cran}`), nuancesConfondues(palette));
  // Deux fonds Dark seulement : le repère reste, l’alerte se tait.
  const deux = paletteTailwind('p-0000000b', '#06B6D4');
  assert.deepEqual(nuancesConfondues(deux), ['dark 200', 'dark 300']);
  assert.ok(!codes(dePalette(deux)).includes('profils-confondus'));
});

test('[VER-11] profils confondus : les deux thèmes se comptent ensemble, avec la mesure et le seuil', () => {
  const palette = auxParts('#1E6FD9', 0.1, 0.105);
  const alerte = dePalette(palette).find((a) => a.code === 'profils-confondus');
  assert.ok(alerte && alerte.code === 'profils-confondus');
  assert.deepEqual(alerte.crans.map(({ mode, cran }) => `${mode} ${cran}`), ['light 200', 'light 300', 'dark 200', 'dark 300', 'dark 400']);
  for (const confusion of alerte.crans) assert.ok(confusion.distance < alerte.seuil);
  // Deux Light et deux Dark font quatre nuances.
  const mixte = recetteAuxPartsDe045(paletteTailwind('p-0000000b', '#BC6262'));
  assert.deepEqual(confusionsDe(mixte, mixte.palettes[0]).map(({ mode, cran }) => `${mode} ${cran}`), ['light 200', 'light 300', 'dark 200', 'dark 300']);
  assert.ok(alertesDePalette(mixte, mixte.palettes[0]).some((a) => a.code === 'profils-confondus'));
});

test('[VER-11] profils confondus : des pleins et des textes confondus ne déclenchent ni repère ni alerte', () => {
  // Aux parts 0,90 et 0,91, ce vert confond Soft et Vivid aux crans 500, 700, 800 et 900 du thème Light, hors de tout fond.
  const palette = auxParts('#16A34A', 0.9, 0.91);
  const recette = recetteAvec(palette);
  const rampes = rampesDe(recette, palette);
  for (const cran of [700, 800]) {
    const rang = recette.crans.indexOf(cran);
    assert.ok(distanceOk(rampeDe(rampes, 'soft').light[rang].couleur, rampeDe(rampes, 'vivid').light[rang].couleur) < recette.seuils.profilsConfondus, String(cran));
  }
  // Seul le fond Dark 200 se rend, jamais un 700 ou un 800 ; un fond seul ne suffit pas à l'alerte.
  assert.deepEqual(confusionsDe(recette, palette).map(({ mode, cran }) => `${mode} ${cran}`), ['dark 200']);
  assert.ok(!codes(dePalette(palette)).includes('profils-confondus'));
});

test('[ENT-09] profils confondus : se tait pour des profils ternes par construction, sonne pour les mêmes parts du designer', () => {
  // #78716C, sous la part commune de Soft : ses deux profils se confondent sur presque toute la liste.
  const terne = paletteTailwind('p-0000000c', '#78716C');
  const recette = recetteAvec(terne);
  assert.ok(aDesProfilsTernes(recette, terne));
  assert.deepEqual(confusionsDe(recette, terne), []);
  assert.ok(!codes(dePalette(terne)).includes('profils-confondus'));
  const choisies = { ...terne, parts: { soft: 0.088, vivid: 0.185, origine: 'designer' as const } };
  assert.ok(!aDesProfilsTernes(recetteAvec(choisies), choisies));
  assert.ok(codes(dePalette(choisies)).includes('profils-confondus'));
  assert.deepEqual(nuancesConfondues(choisies), ['light 200', 'dark 200', 'dark 300', 'dark 400']);
});

test('[VER-08] aucune alerte pour un gris, un noir, un blanc ou une référence hors de l’étendue', () => {
  // Une palette peut partir de `#000000` ou de `#FFFFFF` : rien ne le signale (réponse Q4 du plan des palettes désaturées).
  for (const reference of ['#808080', '#000000', '#FFFFFF', '#060605', '#6B7280', '#FFFCF5']) {
    assert.deepEqual(codes(dePalette(paletteTailwind('p-0000000f', reference))), [], reference);
  }
});

test('[VER-08] référence plus terne que soft : sonne pour des parts du designer au-dessus de #5B6B7A, jamais sans elles', () => {
  const sansParts = paletteTailwind('p-0000000d', '#5B6B7A');
  assert.ok(!codes(dePalette(sansParts)).includes('reference-plus-terne'), 'Soft porte la référence et prend sa part');
  const alerte = dePalette({ ...sansParts, parts: { soft: 0.45, vivid: 0.95, origine: 'designer' } }).find((a) => a.code === 'reference-plus-terne');
  assert.ok(alerte && alerte.code === 'reference-plus-terne');
  assert.deepEqual([alerte.part, alerte.partSoft], [0.226, 0.45]);
  assert.ok(!codes(dePalette(BLEU)).includes('reference-plus-terne'));
});

test('[VER-10] référence plus vive que vivid : une notice pour des parts du designer sous #F2A900, jamais sans elles', () => {
  const sansParts = paletteTailwind('p-0000000e', '#F2A900');
  assert.ok(!codes(dePalette(sansParts)).includes('reference-plus-vive'), 'Vivid porte la référence et prend sa part');
  const alerte = dePalette({ ...sansParts, parts: { soft: 0.45, vivid: 0.95, origine: 'designer' } }).find((a) => a.code === 'reference-plus-vive');
  assert.ok(alerte && alerte.code === 'reference-plus-vive' && alerte.part > alerte.partVivid);
  assert.equal(severiteDeLAlerte(alerte), 'notice');
  assert.ok(!codes(dePalette(BLEU)).includes('reference-plus-vive'));
});

test('[VER-08] palettes proches : sonne pour deux bleus voisins, se tait pour un bleu et un ambre', () => {
  const voisin = paletteTailwind('p-00000010', '#1D6DDB');
  const ambre = paletteTailwind('p-00000011', '#F2A900');
  const alerte = alertesDeRecette(recetteAvec(BLEU, voisin, ambre)).find((a) => a.code === 'palettes-proches');
  assert.ok(alerte && alerte.code === 'palettes-proches');
  assert.deepEqual(alerte.palettes, [BLEU.id, voisin.id]);
  assert.ok(alerte.proximite.score < 1);
  assert.equal(alerte.seuil, alerte.proximite.seuil);
  assert.equal(alerte.seuil, recetteParDefaut().seuils.palettesProches);
  assert.ok(alerte.proximite.tropProche);
  assert.equal(alertesDeRecette(recetteAvec(BLEU, voisin, ambre)).filter((a) => a.code === 'palettes-proches').length, 1);
});

/** Deux palettes à deux intensités, aux références données, dans la recette par défaut. */
function paire(a: string, b: string) {
  const [pa, pb] = [paletteTailwind('p-0000000a', a), paletteTailwind('p-0000000b', b)];
  const recette = recetteAvec(pa, pb);
  return { recette, pa, pb, proximite: proximiteDePalettes(recette, pa, pb) };
}

/** Les poids « cloche douce », écrits en clair : ils sont l'attendu des tests, pas une copie de la table du moteur. */
const POIDS: Readonly<Record<number, number>> = { 50: 0.1, 100: 0.1, 200: 0.2, 300: 0.5, 400: 1, 500: 1, 600: 1, 700: 1, 800: 0.6, 900: 0.3, 950: 0.2 };

/** Le score et la chroma de deux palettes, recalculés cran par cran sur Vivid (ou la rampe unique), en Light et en Dark. */
function mesureIndependante(recette: Recette, a: Palette, b: Palette) {
  const lire = (palette: Palette) => rampeDe(rampesDe(recette, palette), aUneIntensite(palette) ? 'unique' : 'vivid');
  const [ra, rb] = [lire(a), lire(b)];
  const somme = { light: 0, dark: 0 };
  let poids = 0;
  const chroma = (rampe: typeof ra) => {
    const valeurs = (['light', 'dark'] as const).flatMap((mode) => recette.crans.flatMap((cran, rang) => (cran >= 400 && cran <= 700 ? [rgb8VersOklch(rampe[mode][rang].couleur).C] : [])));
    return valeurs.reduce((total, valeur) => total + valeur, 0) / valeurs.length;
  };
  recette.crans.forEach((cran, rang) => {
    const w = POIDS[cran] ?? POIDS[950];
    poids += w;
    for (const mode of ['light', 'dark'] as const) somme[mode] += w * (distanceOk(ra[mode][rang].couleur, rb[mode][rang].couleur) / recette.seuils.palettesProches);
  });
  const [ca, cb] = [chroma(ra), chroma(rb)];
  return { score: (somme.light + somme.dark) / (2 * poids), mode: somme.dark < somme.light ? 'dark' : 'light', rapportDeChroma: Math.min(ca, cb) / Math.max(ca, cb) };
}

test('[VER-22] le score est la moyenne pondérée, sur toute la rampe et les deux thèmes, de la ΔEok de chaque cran sur palettesProches', () => {
  for (const [a, b] of [['#1E6FD9', '#2A78D0'], ['#D92626', '#D94026'], ['#22C55E', '#16A34A']]) {
    const { recette, pa, pb, proximite } = paire(a, b);
    assert.ok(proximite, `${a} ${b}`);
    const attendu = mesureIndependante(recette, pa, pb);
    assert.ok(Math.abs(proximite.score - attendu.score) < 1e-12, `${a} ${b} : ${proximite.score} contre ${attendu.score}`);
    assert.ok(Math.abs(proximite.rapportDeChroma! - attendu.rapportDeChroma) < 1e-12, `${a} ${b}`);
    assert.equal(proximite.mode, attendu.mode, `${a} ${b}`);
    assert.equal(proximite.seuil, recette.seuils.palettesProches);
    assert.deepEqual(proximiteDePalettes(recette, pb, pa), proximite, 'la mesure est symétrique');
  }
});

test('[VER-22] le seuil par cran suit palettesProches de la recette : le doubler divise le score par deux', () => {
  const { recette, pa, pb, proximite } = paire('#1E6FD9', '#2A78D0');
  const large = { ...recette, seuils: { ...recette.seuils, palettesProches: 2 * recette.seuils.palettesProches } };
  assert.ok(Math.abs(proximiteDePalettes(large, pa, pb)!.score - proximite!.score / 2) < 1e-12);
});

test('[VER-22] la table des poids : la cloche douce par numéro de cran, le poids du numéro le plus proche hors table', () => {
  assert.deepEqual(POIDS_DES_CRANS_DE_PROXIMITE, POIDS);
  for (const [numero, poids] of Object.entries(POIDS)) assert.equal(poidsDeProximite(Number(numero)), poids, numero);
  // Treize nuances : 1000 et 1050 prennent le poids du 950.
  assert.equal(poidsDeProximite(1000), POIDS[950]);
  assert.equal(poidsDeProximite(1050), POIDS[950]);
  // À égale distance de deux numéros, le plus petit : 350 entre 300 et 400.
  assert.equal(poidsDeProximite(350), POIDS[300]);
});

test('[VER-22] treize nuances : 1000 et 1050 entrent dans le score avec le poids du 950', () => {
  const [pa, pb] = [paletteTailwind('p-0000000a', '#1E6FD9'), paletteTailwind('p-0000000b', '#2A78D0')];
  const base = recetteAvec(pa, pb);
  const { crans, courbes } = grilleAuPrereglage({ crans: base.crans, courbes: base.courbes }, 13);
  const recette: Recette = { ...base, crans: [...crans], courbes };
  assert.deepEqual(recette.crans.slice(-3), [950, 1000, 1050]);
  const proximite = proximiteDePalettes(recette, pa, pb)!;
  const attendu = mesureIndependante(recette, pa, pb);
  assert.ok(Math.abs(proximite.score - attendu.score) < 1e-12, `${proximite.score} contre ${attendu.score}`);
});

/** La configuration du mainteneur : vingt palettes colorées ou neutres, réglées par lui. */
const brute: unknown = JSON.parse(readFileSync(new URL('./fixtures/palettes-et-reglages.json', import.meta.url), 'utf8'));
const validee = validerRecette(brute);
if (!('recette' in validee)) throw new Error(`Recette du mainteneur refusée : ${JSON.stringify(validee.refus)}`);
const MAINTENEUR: Recette = validee.recette;
const duMainteneur = (nom: string): Palette => {
  const trouvee = MAINTENEUR.palettes.find((palette) => palette.nom === nom);
  if (!trouvee) throw new Error(`Palette ${nom} absente de la configuration.`);
  return trouvee;
};

test('[VER-22] sur la configuration du mainteneur, aucune paire ne sonne', () => {
  assert.deepEqual(pairesTropProches(MAINTENEUR), []);
  assert.ok(!codes(alertesDeRecette(MAINTENEUR)).includes('palettes-proches'));
});

test('[VER-22] Terracota et Poppy se distinguent par la chroma, leur score pondéré seul étant sous 1', () => {
  const proximite = proximiteDePalettes(MAINTENEUR, duMainteneur('Terracota'), duMainteneur('Poppy'));
  assert.ok(proximite);
  assert.ok(Math.abs(proximite.score - 0.98) < 0.005, `score ${proximite.score}`);
  assert.ok(proximite.rapportDeChroma! <= PART_DE_CHROMA_QUI_DISTINGUE, `chroma ${proximite.rapportDeChroma}`);
  assert.ok(!proximite.tropProche && !proximite.presqueIdentiques);
});

test('[VER-22] une palette nettement plus terne se distingue ; à plus de 75 % de la chroma, le score décide', () => {
  const vive = paletteTailwind('p-0000000a', '#C2410C');
  // Un brun de même famille : score sous 1, mais sa chroma moyenne vaut 72 % de celle de l'orange.
  const terne = paletteTailwind('p-0000000b', '#B5603A');
  const separee = proximiteDePalettes(recetteAvec(vive, terne), vive, terne)!;
  assert.ok(separee.score < 1, `score ${separee.score}`);
  assert.ok(separee.rapportDeChroma! <= PART_DE_CHROMA_QUI_DISTINGUE, `chroma ${separee.rapportDeChroma}`);
  assert.ok(!separee.tropProche && !separee.presqueIdentiques);
  assert.deepEqual(pairesTropProches(recetteAvec(vive, terne)), []);
  // Un orange voisin garde plus de 75 % de la chroma : le score décide.
  const voisine = paletteTailwind('p-0000000c', '#C04A12');
  const proche = proximiteDePalettes(recetteAvec(vive, voisine), vive, voisine)!;
  assert.ok(proche.rapportDeChroma! > PART_DE_CHROMA_QUI_DISTINGUE, `chroma ${proche.rapportDeChroma}`);
  assert.ok(proche.score < 1 && proche.tropProche);
});

test('[VER-22] deux palettes de même teinte et de même saturation sonnent, « presque identiques » sous 0,2', () => {
  const identique = paire('#1E6FD9', '#1E6FD9').proximite!;
  assert.equal(identique.score, 0);
  assert.equal(identique.rapportDeChroma, 1);
  assert.ok(identique.tropProche && identique.presqueIdentiques);
  const voisin = paire('#1E6FD9', '#2A78D0').proximite!;
  assert.ok(voisin.tropProche && voisin.score >= 0.2 && !voisin.presqueIdentiques, JSON.stringify(voisin));
  assert.ok(voisin.rapportDeChroma! > PART_DE_CHROMA_QUI_DISTINGUE);
  const presque = paire('#1E6FD9', '#2070D8').proximite!;
  assert.ok(presque.tropProche && presque.score < 0.2 && presque.presqueIdentiques, JSON.stringify(presque));
  const eloignee = paire('#1E6FD9', '#F2A900').proximite!;
  assert.ok(!eloignee.tropProche && !eloignee.presqueIdentiques && eloignee.score >= 1, JSON.stringify(eloignee));
});

test('[VER-22] les fonds teintés et les crans des extrémités seuls ne font plus sonner une paire', () => {
  // Purple et fuchsia Tailwind : fond Light à 0,0084 (ancien verdict : signalée), mais les pleins à plus de 0,05.
  const { recette, proximite } = paire('#a855f7', '#d946ef');
  assert.ok(proximite && proximite.score >= 1 && !proximite.tropProche, JSON.stringify(proximite));
  assert.deepEqual(pairesTropProches(recette), []);
  assert.ok(!codes(alertesDeRecette(recette)).includes('palettes-proches'));
  // Orange et jaune : le cran 950 de Dark est à 0,03 l'un de l'autre, mais pèse 0,2.
  const jaune = paire('#D98026', '#D9D926');
  assert.ok(jaune.proximite && jaune.proximite.score >= 1, JSON.stringify(jaune.proximite));
  assert.deepEqual(pairesTropProches(jaune.recette), []);
});

test('[VER-22] deux neutres ne se comparent pas', () => {
  for (const [a, b] of [['#808080', '#808080'], ['#808080', '#6B7280'], ['#1E6FD9', '#6B7280']]) {
    const { recette, proximite } = paire(a, b);
    assert.equal(proximite, null, `${a} ${b}`);
    assert.deepEqual(pairesTropProches(recette), []);
  }
  // Une palette est colorée dès que la chroma de sa référence dépasse la constante.
  assert.ok(rgb8VersOklch(lireHexa('#6B7280')!).C <= CHROMA_DES_PALETTES_COLOREES);
  assert.ok(rgb8VersOklch(lireHexa('#1E6FD9')!).C > CHROMA_DES_PALETTES_COLOREES);
});

test('[VER-22] une palette à une intensité se compare sur sa rampe', () => {
  const unique = (id: string, reference: string): Palette => ({ ...paletteTailwind(id, reference), intensites: 1 });
  const [seule, deux, autre] = [unique('p-0000000a', '#1E6FD9'), paletteTailwind('p-0000000b', '#2A78D0'), unique('p-0000000c', '#3A80C8')];
  const recette = recetteAvec(seule, deux, autre);
  // La rampe unique contre Vivid d'une palette à deux intensités, et contre une autre rampe unique.
  for (const [a, b] of [[seule, deux], [seule, autre]]) {
    const attendu = mesureIndependante(recette, a, b);
    assert.ok(Math.abs(proximiteDePalettes(recette, a, b)!.score - attendu.score) < 1e-12);
  }
  assert.deepEqual(proximiteDePalettes(recette, deux, seule), proximiteDePalettes(recette, seule, deux), 'la mesure est symétrique');
});

test('[VER-22] une palette libre ou figée ne se compare pas', () => {
  const voisin = paletteTailwind('p-0000000b', '#1D6DDB');
  const recette = recetteAvec(BLEU, voisin);
  assert.ok(proximiteDePalettes(recette, BLEU, voisin), 'le point de départ se compare');
  const libre: Palette = { ...BLEU, crans: [...recette.crans] };
  const figee: Palette = { ...BLEU, intensites: 1, crans: [...recette.crans], figees: { light: rampesDe(recette, BLEU).vivid!.light.map((cran) => cran.hexa) } };
  for (const palette of [libre, figee]) {
    const essai = recetteAvec(palette, voisin);
    assert.equal(proximiteDePalettes(essai, palette, voisin), null);
    assert.equal(proximiteDePalettes(essai, voisin, palette), null);
    assert.deepEqual(pairesTropProches(essai), []);
    assert.ok(!codes(alertesDeRecette(essai)).includes('palettes-proches'));
  }
});

test('[VER-22] les paires trop proches se rendent par score croissant, avec les identifiants des palettes', () => {
  const [a, b, c, ambre] = [
    paletteTailwind('p-0000000a', '#1E6FD9'),
    paletteTailwind('p-0000000b', '#2873D0'),
    paletteTailwind('p-0000000c', '#1D6DDB'),
    paletteTailwind('p-0000000d', '#F2A900'),
  ];
  const recette = recetteAvec(a, b, c, ambre);
  const paires = pairesTropProches(recette);
  assert.deepEqual(paires.map((paire) => paire.palettes), [[a.id, c.id], [a.id, b.id], [b.id, c.id]]);
  const scores = paires.map((paire) => paire.proximite.score);
  assert.deepEqual(scores, [...scores].sort((x, y) => x - y));
  assert.deepEqual(alertesDeRecette(recette).flatMap((alerte) => (alerte.code === 'palettes-proches' ? [alerte.palettes] : [])), paires.map((paire) => paire.palettes));
});

test('[ENT-06] fond hors de la courbe : se tait pour les fonds par défaut, #0A0A0A compris', () => {
  assert.deepEqual(alertesDeRecette(recetteParDefaut()), []);
});

test('[ENT-06] #0A0A0A ne déclenche pas l’alerte contre la courbe Dark par défaut', () => {
  const recette = { ...recetteParDefaut(), fonds: { light: '#F7F7F7', dark: '#0A0A0A' } };
  assert.deepEqual(alertesDeRecette(recette), []);
});

test('[ENT-06] fond hors de la courbe : sonne pour un fond clair trop sombre ou un fond sombre trop clair', () => {
  const recette = { ...recetteParDefaut(), fonds: { light: '#EEEEEE', dark: '#1A1A1A' } };
  const alertes = alertesDeRecette(recette);
  assert.deepEqual(alertes.map((a) => a.code === 'fond-hors-courbe' && a.mode), ['light', 'dark']);
});

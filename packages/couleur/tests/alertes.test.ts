/** Les alertes de la section 11.3 ([VER-08], [VER-10], [VER-11], [VER-22], [ENT-06], [ENT-09]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { cranDeLaVariable, sensDuTheme } from '@ucm-kit/core/emplois';

import {
  CHROMA_DES_PALETTES_COLOREES,
  aDesProfilsTernes,
  aUneIntensite,
  alertesDePalette,
  alertesDeRecette,
  confusionsDe,
  distanceOk,
  lireHexa,
  pairesTropProches,
  proximiteDePalettes,
  rampeDe,
  rampesDe,
  rangsDesVariables,
  recetteParDefaut,
  rgb8VersOklch,
  severiteDeLAlerte,
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
  // Le 50 n'est visé par aucune variable, et les profils s'y confondent comme à la 50. Le Dark vise le 400 et le 950 (surfaces), le Light non.
  const tous = [100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  assert.deepEqual(crans(recette), tous);
  assert.deepEqual(crans({ ...recette, texteDesBoutons: { light: 'noir', dark: 'noir' } }), tous);
  assert.deepEqual(crans({ ...recette, texteDesBoutons: { light: 'blanc', dark: 'blanc' } }), tous);
  // Une liste sans 500 n'en a pas.
  const sans500 = { ...recette, texteDesBoutons: { light: 'noir' as const, dark: 'noir' as const }, crans: recette.crans.filter((cran) => cran !== 500) };
  assert.deepEqual(crans(sans500), [100, 200, 300, 400, 600, 700, 800, 900, 950]);
});

/** Une palette de cette référence aux parts du designer, dans la recette par défaut. */
const auxParts = (reference: string, soft: number, vivid: number): Palette => ({ ...paletteTailwind('p-0000000b', reference), parts: { soft, vivid, origine: 'designer' as const } });
const nuancesConfondues = (palette: Palette) => confusionsDe(recetteAvec(palette), palette).map(({ mode, cran }) => `${mode} ${cran}`);

test('[VER-11] profils confondus : ne juge que les fonds, trois Dark (surface default, hover, pressed) et deux Light (hover, pressed)', () => {
  // Un bleu aux parts voisines confond tous ses crans : seuls les cinq fonds sont rendus, jamais le fond Light de surface/default (cran 100).
  assert.deepEqual(nuancesConfondues(auxParts('#1E6FD9', 0.3, 0.31)), ['light 200', 'light 300', 'dark 300', 'dark 400', 'dark 500']);
  assert.equal(cranDeLaVariable('surface/hover', 'light', 'normal'), 200);
  assert.equal(cranDeLaVariable('surface/pressed', 'light', 'normal'), 300);
  assert.deepEqual(['default', 'hover', 'pressed'].map((etat) => cranDeLaVariable(`surface/${etat}` as 'surface/default', 'dark', 'normal')), [300, 400, 500]);
});

test('[VER-11] profils confondus, thème Light : le repère ≈ marque le fond hover et ne suffit pas à l’alerte', () => {
  const palette = auxParts('#D92626', 0.95, 0.96);
  assert.deepEqual(nuancesConfondues(palette), ['light 200']);
  assert.ok(!codes(dePalette(palette)).includes('profils-confondus'));
  // Les deux fonds Light de la liste ne font que deux nuances : il en faut trois.
  const deux = auxParts('#D92626', 0.9, 0.91);
  assert.deepEqual(nuancesConfondues(deux), ['light 200', 'light 300']);
  assert.ok(!codes(dePalette(deux)).includes('profils-confondus'));
});

test('[VER-11] profils confondus, thème Dark : trois fonds Dark confondus suffisent à l’alerte, sans exemption des fonds atténués', () => {
  const palette = auxParts('#14B8A6', 0.2, 0.4);
  assert.deepEqual(nuancesConfondues(palette), ['dark 300', 'dark 400', 'dark 500']);
  const alerte = dePalette(palette).find((a) => a.code === 'profils-confondus');
  assert.ok(alerte && alerte.code === 'profils-confondus');
  assert.deepEqual(alerte.crans.map(({ mode, cran }) => `${mode} ${cran}`), nuancesConfondues(palette));
  // Deux fonds Dark seulement : le repère reste, l’alerte se tait.
  const deux = paletteTailwind('p-0000000b', '#14B8A6');
  assert.deepEqual(nuancesConfondues(deux), ['dark 300', 'dark 400']);
  assert.ok(!codes(dePalette(deux)).includes('profils-confondus'));
});

test('[VER-11] profils confondus : les deux thèmes se comptent ensemble, avec la mesure et le seuil', () => {
  const palette = auxParts('#1E6FD9', 0.1, 0.105);
  const alerte = dePalette(palette).find((a) => a.code === 'profils-confondus');
  assert.ok(alerte && alerte.code === 'profils-confondus');
  assert.deepEqual(alerte.crans.map(({ mode, cran }) => `${mode} ${cran}`), ['light 200', 'light 300', 'dark 300', 'dark 400', 'dark 500']);
  for (const confusion of alerte.crans) assert.ok(confusion.distance < alerte.seuil);
  // Un Light et deux Dark font trois nuances.
  const mixte = recetteAuxPartsDe045(paletteTailwind('p-0000000b', '#BC6262'));
  assert.deepEqual(confusionsDe(mixte, mixte.palettes[0]).map(({ mode, cran }) => `${mode} ${cran}`), ['light 200', 'light 300', 'dark 300']);
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
  assert.deepEqual(confusionsDe(recette, palette), []);
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
  assert.deepEqual(nuancesConfondues(choisies), ['light 200', 'dark 300', 'dark 400', 'dark 500']);
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
  assert.ok(alerte.proximite.distance < alerte.seuil);
  assert.equal(alerte.seuil, recetteParDefaut().seuils.palettesProches);
  assert.equal(alertesDeRecette(recetteAvec(BLEU, voisin, ambre)).filter((a) => a.code === 'palettes-proches').length, 1);
});

/** Deux palettes à deux intensités, aux références données, dans la recette par défaut. */
function paire(a: string, b: string) {
  const [pa, pb] = [paletteTailwind('p-0000000a', a), paletteTailwind('p-0000000b', b)];
  const recette = recetteAvec(pa, pb);
  return { recette, pa, pb, proximite: proximiteDePalettes(recette, pa, pb) };
}

type Lecture = readonly ['solid/default' | 'surface/foreground', 'light' | 'dark'];

/** La distance de deux palettes sur une variable, dans un mode, au cran que la table des rôles lui donne ; Vivid, ou la rampe unique. */
function distanceSurLaVariable(recette: Recette, a: Palette, b: Palette, [variable, mode]: Lecture): number {
  const cran = cranDeLaVariable(variable, mode, sensDuTheme(mode, recette.texteDesBoutons[mode]));
  const rang = recette.crans.indexOf(cran as number);
  const lire = (palette: Palette) => rampeDe(rampesDe(recette, palette), aUneIntensite(palette) ? 'unique' : 'vivid')[mode][rang].couleur;
  return distanceOk(lire(a), lire(b));
}

const LECTURES: readonly Lecture[] = [['solid/default', 'light'], ['solid/default', 'dark'], ['surface/foreground', 'light']];

test('[VER-22] le plein en Light et en Dark, le texte du fond en Light', () => {
  const cas = [
    { refs: ['#D92626', '#D92926'], role: 'plein', lecture: LECTURES[0] },
    { refs: ['#AD1F1F', '#AD231F'], role: 'plein', lecture: LECTURES[1] },
    { refs: ['#AD1F1F', '#AD211F'], role: 'texte', lecture: LECTURES[2] },
  ] as const;
  for (const { refs, role, lecture } of cas) {
    const { recette, pa, pb, proximite } = paire(refs[0], refs[1]);
    assert.ok(proximite, refs.join(' '));
    assert.deepEqual([proximite.role, proximite.mode], [role, lecture[1]], refs.join(' '));
    assert.equal(proximite.distance, distanceSurLaVariable(recette, pa, pb, lecture), refs.join(' '));
    for (const autre of LECTURES) assert.ok(proximite.distance <= distanceSurLaVariable(recette, pa, pb, autre), `${refs.join(' ')} ${autre.join(' ')}`);
    assert.ok(proximite.distance < recette.seuils.palettesProches);
    assert.deepEqual(proximiteDePalettes(recette, pb, pa), proximite, 'la mesure est symétrique');
  }
});

test("[VER-22] le texte Dark n'entre pas", () => {
  // Au cran 950 de Dark, un orange et un jaune sont à 0,03 l'un de l'autre, sous le seuil : ils ne forment pas une paire.
  const { recette, pa, pb, proximite } = paire('#D98026', '#D9D926');
  assert.equal(cranDeLaVariable('surface/foreground', 'dark', sensDuTheme('dark', recette.texteDesBoutons.dark)), 950);
  assert.ok(distanceSurLaVariable(recette, pa, pb, ['surface/foreground', 'dark']) < recette.seuils.palettesProches, 'le texte Dark serait sous le seuil');
  assert.ok(proximite && proximite.distance >= recette.seuils.palettesProches, JSON.stringify(proximite));
  assert.deepEqual(pairesTropProches(recette), []);
  assert.ok(!codes(alertesDeRecette(recette)).includes('palettes-proches'));
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

test('[VER-22] presque identiques sous 0,01', () => {
  const presque = paire('#1E6FD9', '#2575D6').proximite;
  assert.ok(presque && presque.distance < 0.01 && presque.presqueIdentiques, JSON.stringify(presque));
  const proche = paire('#1E6FD9', '#3A80C8').proximite;
  assert.ok(proche && proche.distance >= 0.01 && proche.distance < 0.05 && !proche.presqueIdentiques, JSON.stringify(proche));
});

test('[VER-22] une palette à une intensité se compare sur sa rampe', () => {
  const unique = (id: string, reference: string): Palette => ({ ...paletteTailwind(id, reference), intensites: 1 });
  const [seule, deux, autre] = [unique('p-0000000a', '#1E6FD9'), paletteTailwind('p-0000000b', '#2A78D0'), unique('p-0000000c', '#3A80C8')];
  const recette = recetteAvec(seule, deux, autre);
  const plus = (a: Palette, b: Palette) => Math.min(...LECTURES.map((lecture) => distanceSurLaVariable(recette, a, b, lecture)));
  // La rampe unique contre Vivid d'une palette à deux intensités, et contre une autre rampe unique.
  assert.equal(proximiteDePalettes(recette, seule, deux)!.distance, plus(seule, deux));
  assert.equal(proximiteDePalettes(recette, seule, autre)!.distance, plus(seule, autre));
  assert.equal(proximiteDePalettes(recette, deux, seule)!.distance, plus(seule, deux), 'la mesure est symétrique');
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

test("[VER-22] sans l'un des crans que les rôles lisent, une paire ne se compare pas", () => {
  const voisin = paletteTailwind('p-0000000b', '#1D6DDB');
  // Le plein vise le 700 dans les deux thèmes, le texte du fond teinté le 800 en Light : sans l'un d'eux, la paire n'a plus de proximité.
  const recette = recetteAvec(BLEU, voisin);
  assert.ok(proximiteDePalettes(recette, BLEU, voisin));
  for (const manquant of [700, 800]) {
    const sans = { ...recette, crans: recette.crans.filter((cran) => cran !== manquant) };
    assert.equal(proximiteDePalettes(sans, BLEU, voisin), null, String(manquant));
  }
});

test('[VER-22] les paires trop proches se rendent par distance croissante, avec les identifiants des palettes', () => {
  const [a, b, c, ambre] = [
    paletteTailwind('p-0000000a', '#1E6FD9'),
    paletteTailwind('p-0000000b', '#2873D0'),
    paletteTailwind('p-0000000c', '#1D6DDB'),
    paletteTailwind('p-0000000d', '#F2A900'),
  ];
  const recette = recetteAvec(a, b, c, ambre);
  const paires = pairesTropProches(recette);
  assert.deepEqual(paires.map((paire) => paire.palettes), [[a.id, c.id], [b.id, c.id], [a.id, b.id]]);
  const distances = paires.map((paire) => paire.proximite.distance);
  assert.deepEqual(distances, [...distances].sort((x, y) => x - y));
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

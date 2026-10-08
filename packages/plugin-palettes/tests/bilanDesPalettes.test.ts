/**
 * Le bilan des palettes de Vérification sans palette ouverte : le classement
 * en à corriger, à vérifier et conforme, le premier constat de chaque palette,
 * l'onglet actif, et le temps de calcul sur vingt palettes. Pur : ni DOM ni texte.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { alertesDeRecette, recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { analyserPalette } from '../src/analyse';
import { changerReference, passerEnLibre } from '../src/edition';
import { verdictDeLaPalette } from '../src/presentation';
import { bilanDesPalettes, ongletActifDuBilan, toutEstConforme, type EtatDuBilan } from '../src/ui/bilanDesPalettes';

const DEFAUT = recetteParDefaut();
const nouvelle = (id: string, reference: string): Palette => changerReference(DEFAUT, {
  id,
  reference: '#000000',
  derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'tailwind' }, vivid: { clair: 0, sombre: 0, origine: 'tailwind' } },
}, reference)!;
/** Cyan, Ardoise et Jaune tiennent leurs garanties sans alerte ; Voisin est à moins du seuil de Cyan. */
const CYAN = nouvelle('p-0000000a', '#0891B2');
const VOISIN = nouvelle('p-0000000b', '#0992B3');
const ARDOISE = nouvelle('p-0000000c', '#6B7280');
const JAUNE = nouvelle('p-0000000d', '#FACC15');
/** Bleu confond ses deux profils sur trois nuances au moins, Vert manque la garantie de l'anneau de focus en Light. */
const BLEU: Palette = { ...nouvelle('p-0000000e', '#1E6FD9'), parts: { soft: 0.1, vivid: 0.105, origine: 'designer' } };
const VERT = nouvelle('p-0000000f', '#16A34A');
const avec = (...palettes: Palette[]): Recette => ({ ...DEFAUT, palettes });
const etats = (recette: Recette) => bilanDesPalettes(recette).lignes.map((ligne) => [ligne.palette.id, ligne.etat]);

test('une garantie manquée range la palette à corriger, une alerte ou l’appartenance à une paire trop proche à vérifier, le reste conforme', () => {
  const bilan = bilanDesPalettes(avec(CYAN, VOISIN, ARDOISE, BLEU, VERT));
  assert.deepEqual(bilan.lignes.map((ligne) => [ligne.palette.id, ligne.etat]), [
    [CYAN.id, 'ambre'],
    [VOISIN.id, 'ambre'],
    [ARDOISE.id, 'conforme'],
    [BLEU.id, 'ambre'],
    [VERT.id, 'rouge'],
  ]);
  assert.deepEqual(bilan.comptes, { rouge: 1, ambre: 3, conforme: 1 });
});

test('les deux palettes d’une paire trop proche sont à vérifier, chacune nomme l’autre et la même distance', () => {
  const bilan = bilanDesPalettes(avec(CYAN, VOISIN));
  assert.deepEqual(bilan.comptes, { rouge: 0, ambre: 2, conforme: 0 });
  const alerte = alertesDeRecette(avec(CYAN, VOISIN)).find((candidate) => candidate.code === 'palettes-proches');
  assert.ok(alerte && alerte.code === 'palettes-proches');
  const [premiere, seconde] = bilan.lignes.map((ligne) => ligne.constat);
  assert.ok(premiere && premiere.nature === 'proche' && seconde && seconde.nature === 'proche');
  assert.equal(premiere.avec.id, VOISIN.id);
  assert.equal(seconde.avec.id, CYAN.id);
  assert.equal(premiere.distance, alerte.distance);
  assert.equal(seconde.distance, alerte.distance);
  assert.deepEqual(etats(avec(VOISIN, CYAN)), [[VOISIN.id, 'ambre'], [CYAN.id, 'ambre']]);
});

test('une palette à corriger reste à corriger à côté d’une paire trop proche, qui reste à vérifier', () => {
  assert.deepEqual(etats(avec(CYAN, VOISIN, VERT)), [[CYAN.id, 'ambre'], [VOISIN.id, 'ambre'], [VERT.id, 'rouge']]);
});

test('le premier constat d’une palette à corriger est celui que sa vérification dit en premier : le groupe manqué de Light', () => {
  const [ligne] = bilanDesPalettes(avec(VERT)).lignes;
  assert.equal(ligne.etat, 'rouge');
  assert.ok(ligne.constat && ligne.constat.nature === 'garantie');
  assert.equal(ligne.constat.mode, 'light');
  assert.equal(ligne.constat.variable, 'page/focus');
  assert.ok(ligne.constat.contraste > 0 && ligne.constat.contraste < 3);
});

test('une palette en alerte donne son alerte ; la paire précède l’alerte, comme dans les messages de la palette', () => {
  const seule = bilanDesPalettes(avec(BLEU)).lignes[0];
  assert.ok(seule.constat && seule.constat.nature === 'alerte');
  assert.equal(seule.constat.alerte.code, 'profils-confondus');
  const voisinConfondu = { ...VOISIN, parts: { soft: 0.5, vivid: 0.55, origine: 'designer' as const } };
  const codes = alertesDeRecette(avec(CYAN, voisinConfondu)).map((alerte) => alerte.code);
  assert.ok(codes.includes('profils-confondus') && codes.includes('palettes-proches'), `les deux alertes existent : ${codes.join(', ')}`);
  const dans = bilanDesPalettes(avec(CYAN, voisinConfondu)).lignes[1];
  assert.equal(dans.etat, 'ambre');
  assert.equal(dans.constat?.nature, 'proche');
});

test('une garantie manquée l’emporte sur une paire trop proche : les deux palettes restent à corriger', () => {
  const light = [...DEFAUT.courbes.light];
  light[7] = 0.55;
  const ratee: Recette = { ...avec(CYAN, VOISIN), courbes: { ...DEFAUT.courbes, light } };
  assert.deepEqual(etats(ratee), [[CYAN.id, 'rouge'], [VOISIN.id, 'rouge']]);
  assert.deepEqual(bilanDesPalettes(ratee).comptes, { rouge: 2, ambre: 0, conforme: 0 });
});

test('une notice ne change pas l’état d’une palette, comme elle ne change pas son verdict', () => {
  const vive = { ...JAUNE, parts: { soft: 0.3, vivid: 0.6, origine: 'designer' as const } };
  const recette = avec(vive);
  assert.ok(analyserPalette(recette, vive).alertes.some((alerte) => alerte.code === 'reference-plus-vive'), 'la notice existe');
  assert.deepEqual(etats(recette), [[vive.id, 'conforme']]);
});

test('une alerte de la recette, comme un fond hors courbe, ne range aucune palette à vérifier', () => {
  const recette: Recette = { ...avec(ARDOISE, JAUNE), fonds: { ...DEFAUT.fonds, light: '#EFEFEF' } };
  assert.ok(alertesDeRecette(recette).some((alerte) => alerte.code === 'fond-hors-courbe'), 'l’alerte du fond existe');
  assert.deepEqual(bilanDesPalettes(recette).lignes.map((ligne) => ligne.etat).filter((etat) => etat === 'ambre'), []);
});

test('une palette libre n’a pas de garantie à manquer, mais une paire trop proche la compte comme une autre', () => {
  const libre = passerEnLibre(DEFAUT, CYAN);
  assert.deepEqual(etats(avec(libre, VOISIN)), [[libre.id, 'ambre'], [VOISIN.id, 'ambre']]);
  assert.deepEqual(etats(avec(VOISIN, libre)), [[VOISIN.id, 'ambre'], [libre.id, 'ambre']]);
});

test('le classement s’accorde avec le verdict de l’analyse de chaque palette', () => {
  const recette = avec(CYAN, VOISIN, ARDOISE, BLEU, VERT, JAUNE);
  for (const ligne of bilanDesPalettes(recette).lignes) {
    const analyse = analyserPalette(recette, ligne.palette);
    assert.equal(ligne.etat === 'rouge', analyse.manquees > 0, `${ligne.palette.id} : garanties manquées`);
    assert.equal(ligne.etat === 'rouge', verdictDeLaPalette(analyse) === 'danger', `${ligne.palette.id} : verdict`);
    if (ligne.etat === 'ambre') assert.equal(verdictDeLaPalette(analyse), 'avertissement', `${ligne.palette.id} : verdict`);
  }
});

test('une recette sans palette n’a pas de bilan, et tout est conforme', () => {
  const vide = bilanDesPalettes(avec());
  assert.deepEqual(vide.lignes, []);
  assert.equal(toutEstConforme(vide.comptes), true);
  assert.equal(toutEstConforme(bilanDesPalettes(avec(CYAN, ARDOISE)).comptes), true);
  assert.equal(toutEstConforme(bilanDesPalettes(avec(CYAN, VOISIN)).comptes), false);
});

test('l’onglet actif : le choix du designer tant que son onglet existe, sinon À corriger, sinon À vérifier, jamais aucun tant qu’un problème existe', () => {
  const compte = (rouge: number, ambre: number, conforme: number) => ({ rouge, ambre, conforme });
  const cas: [ReturnType<typeof compte>, EtatDuBilan | null, EtatDuBilan | null][] = [
    [compte(2, 3, 15), null, 'rouge'],
    [compte(0, 3, 17), null, 'ambre'],
    [compte(0, 0, 20), null, null],
    [compte(2, 3, 15), 'ambre', 'ambre'],
    [compte(2, 3, 15), 'conforme', 'conforme'],
    [compte(0, 3, 17), 'rouge', 'ambre'],
    [compte(2, 0, 18), 'ambre', 'rouge'],
    [compte(0, 0, 20), 'conforme', null],
    [compte(1, 0, 0), 'conforme', 'rouge'],
  ];
  for (const [comptes, choisi, attendu] of cas) assert.equal(ongletActifDuBilan(comptes, choisi), attendu, JSON.stringify([comptes, choisi]));
});

test('le bilan de vingt palettes se calcule en une fraction de seconde', () => {
  const references = [
    '#1E6FD9', '#FACC15', '#D94635', '#7C3AED', '#0891B2', '#6B7280', '#DB2777', '#4F46E5', '#65A30D', '#0D9488',
    '#C026D3', '#9333EA', '#A8A29E', '#1E3A8A', '#B25E34', '#B2B234', '#16A34A', '#B23488', '#2272DD', '#897288',
  ];
  const recette = avec(...references.map((reference, rang) => nouvelle(`p-${(0x100 + rang).toString(16).padStart(8, '0')}`, reference)));
  assert.equal(recette.palettes.length, 20);
  bilanDesPalettes(recette);
  const durees: number[] = [];
  for (let i = 0; i < 5; i += 1) {
    const depart = performance.now();
    bilanDesPalettes(recette);
    durees.push(performance.now() - depart);
  }
  durees.sort((a, b) => a - b);
  console.log(`bilan de 20 palettes : médiane ${durees[2].toFixed(1)} ms, de ${durees[0].toFixed(1)} à ${durees[4].toFixed(1)} ms`);
  assert.ok(durees[2] < 1000, `médiane ${durees[2].toFixed(1)} ms`);
});

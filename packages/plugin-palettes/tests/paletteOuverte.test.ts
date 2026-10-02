/** L'état que Création et Vérification partagent : la palette ouverte, ses abonnés et les verdicts ([UI-23], [VER-19]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { analyserPalette } from '../src/analyse';
import { changerReference, passerEnLibre, remplacerPalette } from '../src/edition';
import { verdictDeLaPalette } from '../src/presentation';
import { creerPaletteOuverte, type PaletteOuverte } from '../src/ui/paletteOuverte';

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
/** Bleu confond ses deux profils sur trois nuances au moins, Vert manque deux garanties en Thème Light. */
const BLEU: Palette = { ...nouvelle('p-0000000e', '#1E6FD9'), parts: { soft: 0.1, vivid: 0.105, origine: 'designer' } };
const VERT = nouvelle('p-0000000f', '#16A34A');
const avec = (...palettes: Palette[]): Recette => ({ ...DEFAUT, palettes });

/** La courbe claire place le cran 700 à 0,55 : text sur surface manque 4,5 en Light. */
function recetteRatee(...palettes: Palette[]): Recette {
  const light = [...DEFAUT.courbes.light];
  light[7] = 0.55;
  return { ...avec(...palettes), courbes: { ...DEFAUT.courbes, light } };
}

/** Un état dont chaque analyse se compte, par identifiant de palette. */
function etatCompte(): { etat: PaletteOuverte; analyses: string[] } {
  const analyses: string[] = [];
  const etat = creerPaletteOuverte((recette, palette) => {
    analyses.push(palette.id);
    return analyserPalette(recette, palette);
  });
  return { etat, analyses };
}

test('[VER-19] une garantie manquée donne danger, une alerte avertissement, rien succes ; une palette libre est succes', () => {
  assert.equal(verdictDeLaPalette(analyserPalette(avec(CYAN, ARDOISE), CYAN)), 'succes');
  assert.equal(verdictDeLaPalette(analyserPalette(avec(BLEU), BLEU)), 'avertissement');
  assert.equal(verdictDeLaPalette(analyserPalette(avec(CYAN, VOISIN), CYAN)), 'avertissement');
  assert.equal(verdictDeLaPalette(analyserPalette(avec(VERT), VERT)), 'danger');
  // Une garantie manquée l'emporte sur une alerte.
  assert.equal(verdictDeLaPalette(analyserPalette(recetteRatee(CYAN, VOISIN), CYAN)), 'danger');
  const libre = passerEnLibre(DEFAUT, CYAN);
  const avecLibre = avec(libre, VOISIN);
  assert.ok(analyserPalette(avecLibre, libre).alertes.some((alerte) => alerte.code === 'palettes-proches'), 'la palette libre a bien une alerte');
  assert.equal(verdictDeLaPalette(analyserPalette(avecLibre, libre)), 'succes');
});

test('[VER-19] une notice ne change pas le verdict', () => {
  const vive = { ...JAUNE, parts: { soft: 0.3, vivid: 0.6, origine: 'designer' as const } };
  const analyse = analyserPalette(avec(vive), vive);
  assert.deepEqual(analyse.alertes.map((alerte) => alerte.code), ['reference-plus-vive']);
  assert.equal(verdictDeLaPalette(analyse), 'succes');
});

test('[UI-23] un abonné reçoit la palette ouverte après un changement de palette et après une saisie validée', () => {
  const { etat } = etatCompte();
  const recus: (string | null)[] = [];
  etat.abonner((recu) => recus.push(recu.palette()?.reference ?? null));
  etat.poserRecette(avec(CYAN, ARDOISE));
  etat.rendu('complet');
  assert.deepEqual(recus, [null], 'aucune palette n’est choisie à l’ouverture');

  etat.ouvrir(ARDOISE.id);
  etat.rendu('complet');
  assert.deepEqual(recus, [null, '#6B7280']);

  etat.poserRecette(remplacerPalette(etat.recette()!, changerReference(DEFAUT, ARDOISE, '#64748B')!));
  etat.poserGeste(false);
  etat.rendu('complet');
  assert.deepEqual(recus, [null, '#6B7280', '#64748B']);
  assert.equal(etat.analyse()?.rampes !== undefined, true);
});

test('[UI-23] un rendu d’aperçu ne prévient aucun abonné', () => {
  const { etat } = etatCompte();
  let appels = 0;
  etat.abonner(() => { appels += 1; });
  etat.poserRecette(avec(CYAN));
  etat.ouvrir(CYAN.id);
  etat.rendu('complet');
  assert.equal(appels, 1);
  etat.poserGeste(true);
  etat.poserRecette(remplacerPalette(etat.recette()!, changerReference(DEFAUT, CYAN, '#2563EB')!));
  etat.rendu('apercu');
  assert.equal(appels, 1);
  assert.equal(etat.palette()?.reference, '#2563EB', 'la recette de l’aperçu se lit quand même');
});

test('[UI-23] un abonné désabonné ne reçoit plus rien', () => {
  const { etat } = etatCompte();
  let appels = 0;
  const desabonner = etat.abonner(() => { appels += 1; });
  etat.rendu('complet');
  desabonner();
  etat.rendu('complet');
  assert.equal(appels, 1);
});

test('[VER-19] l’analyse de la palette ouverte se calcule une fois par recette affichée', () => {
  const { etat, analyses } = etatCompte();
  etat.poserRecette(avec(CYAN, ARDOISE));
  etat.ouvrir(CYAN.id);
  etat.analyse();
  etat.analyse();
  assert.deepEqual(analyses, [CYAN.id]);
});

test('[VER-19] à la fin d’un geste, seule une palette changée se réanalyse ; pendant le geste, aucune autre que la palette ouverte', () => {
  const { etat, analyses } = etatCompte();
  etat.poserRecette(avec(CYAN, BLEU, VERT));
  etat.rendu('complet');
  assert.deepEqual([...analyses].sort(), [CYAN.id, BLEU.id, VERT.id].sort(), 'chaque palette s’analyse au premier état');
  assert.deepEqual([...etat.verdicts()], [[CYAN.id, 'succes'], [BLEU.id, 'avertissement'], [VERT.id, 'danger']]);

  etat.ouvrir(CYAN.id);
  analyses.length = 0;
  // Un glisser de la référence : chaque image pose une recette et rend l'aperçu.
  for (const reference of ['#16A34A', '#16A34B', '#16A34C']) {
    etat.poserGeste(true);
    etat.poserRecette(remplacerPalette(etat.recette()!, changerReference(DEFAUT, etat.palette()!, reference)!));
    etat.analyse();
    etat.rendu('apercu');
  }
  assert.deepEqual(analyses, [CYAN.id, CYAN.id, CYAN.id]);

  // Une prévisualisation complète, toujours en geste : les verdicts attendent la fin.
  etat.rendu('complet');
  assert.equal(etat.verdicts().get(CYAN.id), 'succes');
  assert.deepEqual(analyses, [CYAN.id, CYAN.id, CYAN.id]);

  etat.poserGeste(false);
  etat.rendu('complet');
  assert.deepEqual(analyses, [CYAN.id, CYAN.id, CYAN.id], 'la fin du geste reprend l’analyse de la palette ouverte, sans analyser les autres');
  assert.deepEqual([...etat.verdicts()], [[CYAN.id, 'danger'], [BLEU.id, 'avertissement'], [VERT.id, 'danger']]);
});

test('[VER-19] une palette devenue proche d’une autre change le verdict des deux, sans analyser la seconde', () => {
  const { etat, analyses } = etatCompte();
  etat.poserRecette(avec(CYAN, ARDOISE));
  etat.ouvrir(ARDOISE.id);
  etat.rendu('complet');
  assert.deepEqual([...etat.verdicts()], [[CYAN.id, 'succes'], [ARDOISE.id, 'succes']]);

  analyses.length = 0;
  etat.poserRecette(remplacerPalette(etat.recette()!, changerReference(DEFAUT, ARDOISE, VOISIN.reference)!));
  etat.rendu('complet');
  assert.deepEqual(analyses, [ARDOISE.id]);
  assert.deepEqual([...etat.verdicts()], [[CYAN.id, 'avertissement'], [ARDOISE.id, 'avertissement']]);

  // La palette s'éloigne : l'autre retrouve son verdict.
  etat.poserRecette(remplacerPalette(etat.recette()!, changerReference(DEFAUT, etat.palette()!, '#6B7280')!));
  etat.rendu('complet');
  assert.deepEqual([...etat.verdicts()], [[CYAN.id, 'succes'], [ARDOISE.id, 'succes']]);
});

test('[VER-19] un réglage commun changé réanalyse toutes les palettes, une palette supprimée quitte les verdicts', () => {
  const { etat, analyses } = etatCompte();
  etat.poserRecette(avec(CYAN, VOISIN));
  etat.rendu('complet');
  assert.deepEqual([...etat.verdicts()], [[CYAN.id, 'avertissement'], [VOISIN.id, 'avertissement']]);

  analyses.length = 0;
  etat.poserRecette(recetteRatee(CYAN, VOISIN));
  etat.rendu('complet');
  assert.deepEqual([...analyses].sort(), [CYAN.id, VOISIN.id]);
  assert.deepEqual([...etat.verdicts()], [[CYAN.id, 'danger'], [VOISIN.id, 'danger']]);

  etat.poserRecette(avec(CYAN));
  etat.rendu('complet');
  assert.deepEqual([...etat.verdicts()], [[CYAN.id, 'succes']], 'la voisine supprimée ne compte plus');

  etat.poserRecette(null);
  etat.rendu('complet');
  assert.equal(etat.verdicts().size, 0);
});

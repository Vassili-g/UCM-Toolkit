/** La forme de la recette, sa validation et son classement ([REC-03] à [REC-05]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { cransRequis } from '@ucm-kit/core/emplois';
import {
  FORMAT_RECETTE,
  ancrageDe,
  classerRecette,
  jsonCanonique,
  rampesDe,
  recetteParDefaut,
  validerRecette,
  verifierPromesses,
  type Palette,
  type RegleRecette,
} from '../src/index';
import { copie, paletteTailwind, recetteAvec } from './fabrique';

const valide = () => copie(recetteAvec(paletteTailwind('p-0000000a', '#1E6FD9'), paletteTailwind('p-0000000b', '#F2A900')));

test('[REC-05] la recette par défaut et une recette à deux palettes sont valides', () => {
  assert.deepEqual(validerRecette(copie(recetteParDefaut())), { recette: recetteParDefaut() });
  assert.ok('recette' in validerRecette(valide()));
});

/** Pour chaque règle : une altération de la recette valide, et le refus qu'elle doit produire. */
const CAS: [RegleRecette, string, (r: any) => void][] = [
  ['forme', 'crans', (r) => delete r.crans],
  ['forme', 'palettes[0].derive.lien', (r) => { r.palettes[0].derive.lien = 'oui'; }],
  // Seule la présence des clés refuse ici : l'origine absente est aussi une origine inconnue.
  ['forme', 'palettes[1].derive.vivid.origine', (r) => {
    r.palettes[1].derive.lien = false;
    delete r.palettes[1].derive.vivid.origine;
  }],
  ['cle-inconnue', 'planche', (r) => { r.planche = { page: '', cadres: {} }; }],
  ['cle-inconnue', 'palettes[1].couleur', (r) => { r.palettes[1].couleur = '#000000'; }],
  ['crans-croissants', 'crans[3]', (r) => { r.crans[3] = 150; }],
  ['courbes-longueur', 'courbes.light', (r) => { r.courbes.light.pop(); }],
  ['courbes-bornes', 'courbes.dark[10]', (r) => { r.courbes.dark[10] = 1.2; }],
  ['courbe-claire-decroissante', 'courbes.light[5]', (r) => { r.courbes.light[5] = 0.8; }],
  ['courbe-sombre-croissante', 'courbes.dark[5]', (r) => { r.courbes.dark[5] = 0.35; }],
  ['parts-bornes', 'profils.vivid.part', (r) => { r.profils.vivid.part = 1.2; }],
  ['parts-ordre', 'profils', (r) => { r.profils.soft.part = 0.96; }],
  ['parts-ordre', 'palettes[0].parts', (r) => { r.palettes[0].parts = { soft: 0.5, vivid: 0.4, origine: 'designer' }; }],
  ['gamut-inconnu', 'gamut', (r) => { r.gamut = 'display-p3'; }],
  ['hexa-invalide', 'fonds.light', (r) => { r.fonds.light = '#GGGGGG'; }],
  ['hexa-invalide', 'palettes[1].reference', (r) => { r.palettes[1].reference = 'bleu'; }],
  ['seuils-positifs', 'seuils.texte', (r) => { r.seuils.texte = 0; }],
  ['derives-nombre', 'derives', (r) => { r.derives = r.derives.slice(0, 1); }],
  ['derives-noms', 'derives[1]', (r) => { r.derives[1][0] = r.derives[0][0]; }],
  ['derives-teintes', 'derives[2]', (r) => { r.derives[2][2] = 360; }],
  ['derives-teintes-claires', 'derives[1]', (r) => { r.derives[1][1] = r.derives[0][1]; }],
  ['derive-bornes', 'palettes[0].derive.soft.clair', (r) => {
    r.palettes[0].derive.lien = false;
    r.palettes[0].derive.soft.clair = 95;
  }],
  ['derive-lien', 'palettes[0].derive', (r) => { r.palettes[0].derive.vivid.sombre += 1; }],
  ['derive-lien', 'palettes[0].derive', (r) => { r.palettes[0].derive.vivid.saturation = { clair: 0.3, sombre: 0 }; }],
  ['derive-lien', 'palettes[0].derive', (r) => {
    r.palettes[0].derive.soft.clarte = { clair: 0, sombre: -0.02 };
    r.palettes[0].derive.vivid.clarte = { clair: 0, sombre: -0.03 };
  }],
  ['derive-saturation', 'palettes[0].derive.soft.saturation.clair', (r) => {
    r.palettes[0].derive.lien = false;
    r.palettes[0].derive.soft.saturation = { clair: 1.2, sombre: 0 };
  }],
  ['derive-clarte', 'palettes[0].derive.vivid.clarte.sombre', (r) => {
    r.palettes[0].derive.lien = false;
    r.palettes[0].derive.vivid.clarte = { clair: 0, sombre: -0.2 };
  }],
  ['derive-nulle', 'palettes[0].derive.soft.saturation', (r) => {
    r.palettes[0].derive.lien = false;
    r.palettes[0].derive.soft.saturation = { clair: 0, sombre: 0 };
  }],
  ['forme', 'palettes[0].derive.soft.clarte.clair', (r) => {
    r.palettes[0].derive.lien = false;
    r.palettes[0].derive.soft.clarte = { sombre: 0.1 };
  }],
  ['cle-inconnue', 'palettes[0].derive.soft.clarte.milieu', (r) => {
    r.palettes[0].derive.lien = false;
    r.palettes[0].derive.soft.clarte = { clair: 0.1, sombre: 0, milieu: 0 };
  }],
  ['origine-inconnue', 'palettes[1].derive.vivid.origine', (r) => {
    r.palettes[1].derive.lien = false;
    r.palettes[1].derive.vivid.origine = 'auto';
  }],
  ['origine-inconnue', 'palettes[0].parts.origine', (r) => { r.palettes[0].parts = { soft: 0.4, vivid: 0.5, origine: 'auto' }; }],
  ['identifiant-forme', 'palettes[0].id', (r) => { r.palettes[0].id = 'p-1'; }],
  ['identifiants-uniques', 'palettes[1].id', (r) => { r.palettes[1].id = r.palettes[0].id; }],
  ['cle-inconnue', 'cablage', (r) => { r.cablage = { solid: { profil: 'vivid', cran: 700 } }; }],
  ['cle-inconnue', 'palettes[0].cablage', (r) => { r.palettes[0].cablage = { surface: { profil: 'soft', cran: 200 } }; }],
];

for (const [regle, chemin, alterer] of CAS) {
  test(`[REC-05] ${regle} : refusé en ${chemin}`, () => {
    const recette = valide();
    alterer(recette);
    const resultat = validerRecette(recette);
    assert.ok('refus' in resultat, 'la recette altérée a été acceptée');
    assert.ok(
      resultat.refus.some((refus) => refus.regle === regle && refus.chemin === chemin),
      `refus attendu ${regle} en ${chemin}, obtenus : ${JSON.stringify(resultat.refus)}`,
    );
  });
}

for (const cran of cransRequis('normal')) {
  test(`[REC-05] crans-emplois : refusé quand ${cran} manque`, () => {
    const recette = valide();
    // Le cran devient son voisin à +25 : la liste reste croissante et garde sa longueur.
    recette.crans[recette.crans.indexOf(cran)] = cran + 25;
    const resultat = validerRecette(recette);
    assert.ok('refus' in resultat, 'la recette altérée a été acceptée');
    assert.deepEqual(resultat.refus, [{ regle: 'crans-emplois', chemin: 'crans', valeur: cran }]);
  });
}

test('[REC-05] un refus montre la valeur lue quand elle est un nombre ou un texte', () => {
  const recette = valide();
  recette.crans[3] = 150;
  const resultat = validerRecette(recette);
  assert.ok('refus' in resultat);
  assert.deepEqual(resultat.refus[0], { regle: 'crans-croissants', chemin: 'crans[3]', valeur: 150 });
});

test('[REC-03] une recette absente propose la recette par défaut', () => {
  assert.deepEqual(classerRecette(undefined), { etat: 'absente', recette: recetteParDefaut() });
  assert.deepEqual(classerRecette(''), { etat: 'absente', recette: recetteParDefaut() });
});

test('[REC-03] une recette de la version courante est lue', () => {
  const recette = valide();
  assert.deepEqual(classerRecette(JSON.stringify(recette)), { etat: 'courante', recette });
});

test('[REC-03] une recette 9 exportée puis relue est égale', () => {
  const recette = { ...valide(), palettes: [...valide().palettes, paletteTailwind('p-0000000c', '#808080'), paletteTailwind('p-0000000d', '#7C717B')] };
  assert.equal(recette.formatVersion, 9);
  assert.deepEqual(classerRecette(JSON.stringify(recette)), { etat: 'courante', recette });
});

test('une recette 8 se lit au format 9 avec le texte des boutons par défaut', () => {
  const recette = valide();
  const { texteDesBoutons: _, ...ancienne } = recette;
  const texte = JSON.stringify({ ...ancienne, formatVersion: 8 });
  assert.deepEqual(classerRecette(texte), { etat: 'courante', recette });
  assert.equal(JSON.parse(texte).formatVersion, 8);
});

test('une recette 8 qui porte déjà texteDesBoutons est refusée par forme', () => {
  assert.deepEqual(classerRecette(JSON.stringify({ ...valide(), formatVersion: 8 })), {
    etat: 'illisible', refus: [{ regle: 'forme', chemin: 'texteDesBoutons' }],
  });
});

test('le texte des boutons refuse gris dans chacun des thèmes', () => {
  for (const mode of ['light', 'dark'] as const) {
    const recette = valide();
    recette.texteDesBoutons[mode] = 'gris';
    const resultat = validerRecette(recette);
    assert.ok('refus' in resultat);
    assert.deepEqual(resultat.refus, [{ regle: 'texte-des-boutons', chemin: `texteDesBoutons.${mode}`, valeur: 'gris' }]);
  }
});

test('une liste sans 500 se lit dans les thèmes normaux et se refuse dans chaque thème inversé', () => {
  const recette = valide();
  const rang = recette.crans.indexOf(500);
  recette.crans.splice(rang, 1);
  recette.courbes.light.splice(rang, 1);
  recette.courbes.dark.splice(rang, 1);
  assert.ok('recette' in validerRecette(recette));
  for (const mode of ['light', 'dark'] as const) {
    const inversee = { ...recette, texteDesBoutons: { ...recette.texteDesBoutons, [mode]: mode === 'light' ? 'noir' : 'blanc' } };
    const resultat = validerRecette(inversee);
    assert.ok('refus' in resultat);
    assert.deepEqual(resultat.refus, [{ regle: 'crans-emplois', chemin: 'crans', valeur: 500 }]);
  }
});

test('[REC-05] une liste sans 50, 400 ni 950 est acceptée dans les quatre combinaisons de texte des boutons', () => {
  const recette = valide();
  for (const cran of [950, 400, 50]) {
    const rang = recette.crans.indexOf(cran);
    recette.crans.splice(rang, 1);
    recette.courbes.light.splice(rang, 1);
    recette.courbes.dark.splice(rang, 1);
  }
  for (const light of ['blanc', 'noir'] as const) {
    for (const dark of ['blanc', 'noir'] as const) {
      const resultat = validerRecette({ ...recette, texteDesBoutons: { light, dark } });
      assert.ok('recette' in resultat, `refusée en ${light}/${dark} : ${JSON.stringify('refus' in resultat ? resultat.refus : [])}`);
    }
  }
});

test('[REC-03] une recette d’un format antérieur est illisible, sans conversion, par le refus de formatVersion', () => {
  for (const version of [0, 3, 7]) {
    assert.deepEqual(classerRecette(JSON.stringify({ ...valide(), formatVersion: version })), {
      etat: 'illisible',
      refus: [{ regle: 'forme', chemin: 'formatVersion', valeur: version }],
    });
  }
});

test('[REC-05] [MOT-30] une recette dont le Color shift porte saturation et clarté se valide et se relit à l’octet', () => {
  const recette = valide();
  const colorShift = { saturation: { clair: -0.4, sombre: 0.25 }, clarte: { clair: 0.012, sombre: -0.08 } };
  recette.palettes[0].derive.soft = { ...recette.palettes[0].derive.soft, ...colorShift };
  recette.palettes[0].derive.vivid = { ...recette.palettes[0].derive.vivid, ...colorShift };
  recette.palettes[1].derive.lien = false;
  recette.palettes[1].derive.vivid = { ...recette.palettes[1].derive.vivid, clarte: { clair: 0.15, sombre: -0.15 } };
  assert.deepEqual(validerRecette(copie(recette)), { recette });
  const texte = jsonCanonique(recette);
  const lue = classerRecette(texte);
  assert.ok(lue.etat === 'courante');
  assert.equal(jsonCanonique(lue.recette), texte);
});

test('[REC-03] une version supérieure est future', () => {
  assert.deepEqual(classerRecette(JSON.stringify({ ...valide(), formatVersion: FORMAT_RECETTE + 1 })), {
    etat: 'future',
    version: FORMAT_RECETTE + 1,
  });
});

test('[REC-04] une recette illisible est refusée sans recette de remplacement', () => {
  const cassee = valide();
  cassee.crans[3] = 150;
  for (const texte of ['{pas du json', '[]', '"texte"', JSON.stringify(cassee), JSON.stringify({ formatVersion: 'un' })]) {
    const classement = classerRecette(texte);
    assert.equal(classement.etat, 'illisible', texte);
    assert.ok(!('recette' in classement), texte);
  }
});

// ------------------------------------------------------------ les couleurs figées (format 8)

const NUANCES_FIGEES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const SLATE = ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A', '#020617'];

/** Slate, reprise telle quelle des variables du fichier : sa liste, une intensité, ses couleurs. */
function figee(reglages: Partial<Palette> = {}): Palette {
  const { parts: _parts, ...sansParts } = paletteTailwind('p-000000f1', '#475569');
  return { ...sansParts, intensites: 1, derive: { ...sansParts.derive, lien: true, soft: sansParts.derive.vivid }, crans: NUANCES_FIGEES, figees: { light: SLATE }, ...reglages };
}

const refusDeLaPalette = (palette: unknown): string[] => {
  const lue = validerRecette({ ...valide(), palettes: [palette] });
  return 'refus' in lue ? lue.refus.map(({ regle, chemin }) => `${regle} ${chemin}`) : [];
};

test('[VAR-13] une palette figée se valide, et ses rampes rendent ses couleurs telles quelles, sans calcul', () => {
  const palette = figee();
  assert.deepEqual(refusDeLaPalette(palette), []);
  const recette = { ...valide(), palettes: [palette] };
  const rampes = rampesDe(recette, palette);
  assert.deepEqual(Object.keys(rampes), ['unique']);
  assert.deepEqual(rampes.unique!.light.map((cran) => cran.hexa), SLATE);
  // Sans mode Dark à l'origine, le thème Dark rend les couleurs de Light.
  assert.deepEqual(rampes.unique!.dark.map((cran) => cran.hexa), SLATE);
  const sombre = [...SLATE].reverse();
  assert.deepEqual(rampesDe(recette, figee({ figees: { light: SLATE, dark: sombre } })).unique!.dark.map((cran) => cran.hexa), sombre);
  // Chaque cran porte sa lecture OKLCH : la planche et le détail d'une nuance la montrent.
  assert.ok(rampes.unique!.light.every((cran) => cran.L >= 0 && cran.L <= 1));
});

test('[VAR-13] la référence d’une palette figée est la nuance qui en porte la couleur, et une palette figée n’a pas de garantie', () => {
  const palette = figee();
  const recette = { ...valide(), palettes: [palette] };
  assert.deepEqual(ancrageDe(recette, palette), { profil: 'unique', rangs: { light: 6, dark: 6 }, crans: { light: 600, dark: 600 } });
  // Une référence que la liste ne porte pas retombe sur la première nuance.
  assert.equal(ancrageDe(recette, figee({ reference: '#123456' })).crans.light, 50);
  assert.deepEqual(verifierPromesses(recette, palette), []);
});

test('[VAR-13] des nuances lues dans des noms de variables ne suivent pas les bornes d’une liste libre', () => {
  const tons = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100, 1200];
  const couleurs = tons.map((_, rang) => SLATE[rang % SLATE.length]);
  assert.deepEqual(refusDeLaPalette(figee({ crans: tons, figees: { light: couleurs } })), []);
  assert.deepEqual(refusDeLaPalette(figee({ crans: [10, 10, 5, 2.5], figees: { light: SLATE.slice(0, 4) } })), [
    'crans-figes palettes[0].crans[1]', 'crans-figes palettes[0].crans[2]', 'crans-figes palettes[0].crans[3]',
  ]);
  assert.deepEqual(refusDeLaPalette(figee({ crans: [], figees: { light: [] } })), ['crans-figes palettes[0].crans']);
});

test('[VAR-13] des couleurs figées refusent une liste absente, deux intensités, une longueur fausse, un hexa illisible et un réglage de rampe', () => {
  const { crans: _crans, ...sansListe } = figee();
  assert.deepEqual(refusDeLaPalette(sansListe), ['figees-sans-liste palettes[0].figees']);
  const { intensites: _intensites, ...deux } = figee();
  assert.deepEqual(refusDeLaPalette(deux), ['figees-sans-liste palettes[0].figees']);
  assert.deepEqual(refusDeLaPalette(figee({ figees: { light: SLATE.slice(1) } })), ['figees-longueur palettes[0].figees.light']);
  assert.deepEqual(refusDeLaPalette(figee({ figees: { light: SLATE, dark: SLATE.slice(2) } })), ['figees-longueur palettes[0].figees.dark']);
  assert.deepEqual(refusDeLaPalette(figee({ figees: { light: ['bleu', ...SLATE.slice(1)] } })), ['hexa-invalide palettes[0].figees.light[0]']);
  assert.deepEqual(refusDeLaPalette({ ...figee(), figees: { dark: SLATE } }), ['forme palettes[0].figees.light']);
  assert.deepEqual(refusDeLaPalette(figee({ originale: '#334155' })), ['figees-incompatible palettes[0].originale']);
  assert.deepEqual(refusDeLaPalette({ ...figee(), reglages: { part: 0.5 } }).filter((refus) => refus.startsWith('figees')), ['figees-incompatible palettes[0].reglages']);
});

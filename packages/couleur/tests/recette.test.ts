/** La forme de la recette, sa validation et son classement ([REC-03] à [REC-05]). */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { cransRequis, sensDuTheme } from '@ucm-kit/core/emplois';
import {
  FORMAT_RECETTE,
  PROFILS_PAR_DEFAUT,
  RELEVE_TAILWIND,
  ancrageDe,
  classerRecette,
  jsonCanonique,
  luminositeAuNumero,
  rampesDe,
  recetteParDefaut,
  validerRecette,
  verifierPromesses,
  type Palette,
  type RegleRecette,
} from '../src/index';
import { copie, paletteTailwind, recetteAvec } from './fabrique';

/** Un témoin : une recette rangée dans sa forme d'origine, que les tests lisent et ne réécrivent jamais. */
const temoin = (nom: 'format-8' | 'format-9' | 'format-10'): string =>
  readFileSync(fileURLToPath(new URL(`./fixtures/recettes/${nom}.json`, import.meta.url)), 'utf8');

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
  ['derives-noms', 'derives[1]', (r) => { r.derives[1].nom = r.derives[0].nom; }],
  ['derives-noms', 'derives[1]', (r) => { r.derives[1].nom = ''; }],
  ['derives-crans', 'derives[3].crans', (r) => { r.derives[3].crans = r.derives[3].crans.slice(0, 1); }],
  ['derives-crans', 'derives[2].crans[4]', (r) => { r.derives[2].crans[4][0] = 1; }],
  ['derives-crans', 'derives[2].crans[4]', (r) => { r.derives[2].crans[4][1] = 360; }],
  ['derives-crans', 'derives[2].crans[5]', (r) => { r.derives[2].crans[5][0] = r.derives[2].crans[4][0]; }],
  ['forme', 'derives[0].crans[0]', (r) => { r.derives[0].crans[0] = [0.9]; }],
  ['forme', 'derives[4]', (r) => { r.derives[4] = ['rose', 12.4, 12.1]; }],
  ['forme', 'profils.soft.enveloppe', (r) => { delete r.profils.soft.enveloppe; }],
  ['forme', 'profils.vivid.enveloppe.dark.jaunes', (r) => { r.profils.vivid.enveloppe.dark.jaunes = 'oui'; }],
  ['forme', 'profils.soft.clairs', (r) => { delete r.profils.soft.clairs; }],
  ['forme', 'profils.vivid.enveloppe.light.cyans', (r) => { delete r.profils.vivid.enveloppe.light.cyans; }],
  ['cle-inconnue', 'profils.soft.enveloppe.light.c', (r) => { r.profils.soft.enveloppe.light.c = 1; }],
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

/** Les crans que la table des deux thèmes exige, chacun dans le sens de son texte des boutons. */
const requisDe = (texte: { light: 'blanc' | 'noir'; dark: 'blanc' | 'noir' }): number[] =>
  [...new Set((['light', 'dark'] as const).flatMap((mode) => cransRequis(mode, sensDuTheme(mode, texte[mode]))))].sort((a, b) => a - b);

/** La recette sans le cran `cran`, avec ses deux courbes au même rang. */
function sansLeCran(recette: any, cran: number): any {
  const rang = recette.crans.indexOf(cran);
  const sans = (liste: number[]) => liste.filter((_, place) => place !== rang);
  return { ...recette, crans: sans(recette.crans), courbes: { light: sans(recette.courbes.light), dark: sans(recette.courbes.dark) } };
}

for (const cran of requisDe({ light: 'blanc', dark: 'noir' })) {
  test(`[REC-13] crans-emplois : refusé quand ${cran} manque`, () => {
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

test('[REC-03] une recette 11 exportée puis relue est égale', () => {
  const recette = { ...valide(), palettes: [...valide().palettes, paletteTailwind('p-0000000c', '#808080'), paletteTailwind('p-0000000d', '#7C717B')] };
  assert.equal(recette.formatVersion, 12);
  assert.deepEqual(classerRecette(JSON.stringify(recette)), { etat: 'courante', recette });
});

test('[REC-03] un lecteur au format 11 lit une recette 12 comme future ; ce lecteur-ci lit le format 13 comme future', () => {
  // `classerRecette` classe `future` toute version au-dessus de FORMAT_RECETTE : passer à 12 suffit à écarter l'ancien lecteur.
  assert.ok(FORMAT_RECETTE > 11);
  assert.deepEqual(classerRecette(JSON.stringify({ ...valide(), formatVersion: 13 })), { etat: 'future', version: 13 });
});

test('[REC-12] la recette par défaut porte les profils et le relevé du paquet, en copies', () => {
  const defaut = recetteParDefaut();
  assert.deepEqual(defaut.profils, PROFILS_PAR_DEFAUT);
  assert.deepEqual(defaut.derives, RELEVE_TAILWIND);
  assert.notEqual(defaut.profils.soft.enveloppe, PROFILS_PAR_DEFAUT.soft.enveloppe);
  assert.notEqual(defaut.derives[0], RELEVE_TAILWIND[0]);
  assert.deepEqual(defaut.profils.soft, {
    part: 0.85,
    clairs: 0.7,
    enveloppe: { p0: 0.85, light: { a: 0.6, b: 0.38, jaunes: 1, cyans: 0 }, dark: { a: 1.1, b: 0.15, jaunes: 0, cyans: 0 } },
  });
  assert.deepEqual(defaut.profils.vivid, {
    part: 0.95,
    clairs: 1,
    enveloppe: { p0: 0.95, light: { a: 1.1, b: 0.48, jaunes: 0.5, cyans: -0.2 }, dark: { a: 1.1, b: 0.3, jaunes: 0, cyans: 0 } },
  });
});

test('[REC-12] [REC-14] une recette 10 se lit en 12, aux profils et au relevé par défaut', () => {
  const texte = temoin('format-10');
  const ancienne = JSON.parse(texte);
  const lue = classerRecette(texte);
  assert.ok(lue.etat === 'courante');
  assert.equal(ancienne.formatVersion, 10);
  assert.equal(lue.recette.formatVersion, 12);
  assert.deepEqual(lue.recette.profils, PROFILS_PAR_DEFAUT);
  assert.deepEqual(lue.recette.derives, RELEVE_TAILWIND);
  // Le reste de la recette est celui du témoin.
  for (const cle of ['gamut', 'fonds', 'texteDesBoutons', 'seuils', 'intensiteDesFondsSombres', 'contenuDesPlanches', 'palettes'] as const) {
    assert.deepEqual(lue.recette[cle], ancienne[cle], cle);
  }
});

test('[REC-12] une recette 8 passe par 9 et 10', () => {
  const ancienne = JSON.parse(temoin('format-8'));
  assert.equal(ancienne.formatVersion, 8);
  assert.ok(!('texteDesBoutons' in ancienne));
  const lue = classerRecette(JSON.stringify(ancienne));
  assert.ok(lue.etat === 'courante');
  assert.equal(lue.recette.formatVersion, 12);
  assert.deepEqual(lue.recette.texteDesBoutons, { light: 'blanc', dark: 'noir' });
  // Le témoin 8 a ses onze crans : les mêmes données rangées en 9, puis en 10, rendent la même recette.
  const avecTexte = { ...ancienne, texteDesBoutons: { light: 'blanc', dark: 'noir' } };
  assert.deepEqual(classerRecette(JSON.stringify({ ...avecTexte, formatVersion: 9 })), { etat: 'courante', recette: lue.recette });
  assert.deepEqual(classerRecette(JSON.stringify({ ...avecTexte, formatVersion: 10 })), { etat: 'courante', recette: lue.recette });
  assert.deepEqual(lue.recette.profils, PROFILS_PAR_DEFAUT);
  assert.deepEqual(lue.recette.derives, RELEVE_TAILWIND);
  assert.deepEqual(lue.recette.palettes, ancienne.palettes);
});

test('[REC-12] une recette 8 qui porte déjà texteDesBoutons est refusée par forme', () => {
  const ancienne = JSON.parse(temoin('format-8'));
  assert.deepEqual(classerRecette(JSON.stringify({ ...ancienne, texteDesBoutons: { light: 'blanc', dark: 'noir' } })), {
    etat: 'illisible', refus: [{ regle: 'forme', chemin: 'texteDesBoutons' }],
  });
});

test('[REC-12] une recette 9 se lit, palette figée à une intensité comprise, et la lecture la laisse rangée au format 9', () => {
  const texte = temoin('format-9');
  const lue = classerRecette(texte);
  assert.ok(lue.etat === 'courante');
  assert.equal(JSON.parse(texte).formatVersion, 9);
  assert.deepEqual(lue.recette.palettes, JSON.parse(texte).palettes);
  assert.ok(lue.recette.palettes.some((palette) => palette.intensites === 1 && palette.figees !== undefined));
});

test('[REC-12] une recette 10 lit ses couleurs figées à deux intensités', () => {
  const lue = classerRecette(temoin('format-10'));
  assert.ok(lue.etat === 'courante');
  const deux = lue.recette.palettes.find((palette) => palette.figees !== undefined && palette.intensites === undefined);
  assert.ok(deux && 'soft' in deux.figees!);
});

test('[REC-12] une forme ancienne sans courbes est illisible, sans exception', () => {
  for (const nom of ['format-8', 'format-9', 'format-10'] as const) {
    for (const cle of ['courbes', 'crans']) {
      const { [cle]: _absent, ...sans } = JSON.parse(temoin(nom));
      assert.deepEqual(classerRecette(JSON.stringify(sans)), { etat: 'illisible', refus: [{ regle: 'forme', chemin: cle }] }, `${nom} sans ${cle}`);
    }
  }
  // Des crans ou des courbes d'une autre forme que des nombres ne lèvent rien : la validation du format 11 les refuse.
  const ancienne = JSON.parse(temoin('format-10'));
  for (const alteree of [{ crans: 'abc' }, { crans: [50, 'x'] }, { courbes: 3 }, { courbes: { light: [0.9], dark: 'x' } }, { crans: [] }]) {
    const lue = classerRecette(JSON.stringify({ ...ancienne, ...alteree }));
    assert.equal(lue.etat, 'illisible', JSON.stringify(alteree));
  }
});

test('[REC-12] une enveloppe dans une recette 10 la rend illisible', () => {
  for (const nom of ['format-8', 'format-9', 'format-10'] as const) {
    const ancienne = JSON.parse(temoin(nom));
    const avecEnveloppe = { ...ancienne, profils: { ...ancienne.profils, vivid: { ...ancienne.profils.vivid, enveloppe: PROFILS_PAR_DEFAUT.vivid.enveloppe } } };
    assert.deepEqual(classerRecette(JSON.stringify(avecEnveloppe)), { etat: 'illisible', refus: [{ regle: 'forme', chemin: 'profils.vivid.enveloppe' }] }, nom);
    const avecRampe = { ...ancienne, derives: [RELEVE_TAILWIND[0], ...ancienne.derives.slice(1)] };
    assert.deepEqual(classerRecette(JSON.stringify(avecRampe)), { etat: 'illisible', refus: [{ regle: 'forme', chemin: 'derives[0]' }] }, nom);
  }
});

/** Une recette 12 réécrite en format 11 : sans `clairs` ni `cyans`, les profils par défaut du format 11, sauf `profils` si fourni. */
function enFormat11(profils?: Record<string, unknown>): any {
  const recette: any = copie(valide());
  recette.formatVersion = 11;
  recette.profils = profils ?? {
    soft: { part: 0.85, enveloppe: { p0: 0.85, light: { a: 0.6, b: 0.38, jaunes: 1 }, dark: { a: 1.1, b: 0.38, jaunes: 0 } } },
    vivid: { part: 0.95, enveloppe: { p0: 0.95, light: { a: 1.1, b: 0.48, jaunes: 0.5 }, dark: { a: 1.1, b: 0.3, jaunes: 0 } } },
  };
  return recette;
}

test('[REC-14] une recette 11 aux profils par défaut prend les profils par défaut du format 12', () => {
  const ancienne = enFormat11();
  const lue = classerRecette(JSON.stringify(ancienne));
  assert.ok(lue.etat === 'courante');
  assert.equal(lue.recette.formatVersion, 12);
  assert.deepEqual(lue.recette.profils, PROFILS_PAR_DEFAUT);
  assert.equal(lue.recette.profils.soft.enveloppe.dark.b, 0.15);
  assert.deepEqual(lue.recette.palettes, ancienne.palettes);
});

test('[REC-14] une recette 11 à l’enveloppe modifiée garde ses valeurs, avec cyans 0 et clairs 1', () => {
  const profils = enFormat11().profils;
  profils.soft.enveloppe.dark.b = 0.25;
  profils.vivid.part = 0.9;
  const lue = classerRecette(JSON.stringify(enFormat11(profils)));
  assert.ok(lue.etat === 'courante');
  assert.deepEqual(lue.recette.profils.soft, {
    part: 0.85,
    clairs: 1,
    enveloppe: { p0: 0.85, light: { a: 0.6, b: 0.38, jaunes: 1, cyans: 0 }, dark: { a: 1.1, b: 0.25, jaunes: 0, cyans: 0 } },
  });
  // Vivid garde son enveloppe par défaut du format 11 : il prend celle du format 12, et sa part reste 0,9.
  assert.deepEqual(lue.recette.profils.vivid, { ...PROFILS_PAR_DEFAUT.vivid, part: 0.9 });
});

test('[REC-14] une recette 11 qui porte un champ du format 12 est refusée par forme', () => {
  const avecClairs = enFormat11();
  avecClairs.profils.vivid.clairs = 1;
  assert.deepEqual(classerRecette(JSON.stringify(avecClairs)), { etat: 'illisible', refus: [{ regle: 'forme', chemin: 'profils.vivid.clairs' }] });
  const avecCyans = enFormat11();
  avecCyans.profils.soft.enveloppe.dark.cyans = 0;
  assert.deepEqual(classerRecette(JSON.stringify(avecCyans)), { etat: 'illisible', refus: [{ regle: 'forme', chemin: 'profils.soft.enveloppe.dark.cyans' }] });
});

test('[REC-12] cyans et clairs hors bornes sont refusés', () => {
  const avec = (modifier: (r: any) => void): ReturnType<typeof validerRecette> => {
    const recette = valide();
    modifier(recette);
    return validerRecette(recette);
  };
  assert.ok('recette' in avec((r) => {
    r.profils.soft.clairs = 1;
    r.profils.soft.enveloppe.light.cyans = 1;
    r.profils.vivid.clairs = 0.01;
    r.profils.vivid.enveloppe.dark.cyans = -1;
  }));
  for (const profil of ['soft', 'vivid']) {
    for (const valeur of [-1.01, 1.01]) {
      for (const mode of ['light', 'dark']) {
        const resultat = avec((r) => { r.profils[profil].enveloppe[mode].cyans = valeur; });
        assert.deepEqual('refus' in resultat && resultat.refus, [{ regle: 'enveloppe', chemin: `profils.${profil}.enveloppe.${mode}.cyans`, valeur }]);
      }
    }
    for (const valeur of [0, -0.1, 1.01]) {
      const resultat = avec((r) => { r.profils[profil].clairs = valeur; });
      assert.deepEqual('refus' in resultat && resultat.refus, [{ regle: 'enveloppe', chemin: `profils.${profil}.clairs`, valeur }]);
    }
  }
});

test('[REC-12] une enveloppe hors bornes est refusée', () => {
  const avec = (modifier: (r: any) => void): ReturnType<typeof validerRecette> => {
    const recette = valide();
    modifier(recette);
    return validerRecette(recette);
  };
  // Les bornes incluses sont acceptées, les bornes exclues refusées.
  assert.ok('recette' in avec((r) => {
    r.profils.soft.enveloppe.p0 = 1;
    r.profils.soft.enveloppe.light = { a: 2, b: 2, jaunes: 2, cyans: 0 };
    r.profils.vivid.enveloppe.dark = { a: 0.001, b: 0.001, jaunes: 0, cyans: 0 };
  }));
  const refusees: [string, number][] = [
    ['p0', 0], ['p0', 1.01], ['light.a', 0], ['light.a', 2.01], ['dark.b', 0], ['dark.b', 3], ['light.jaunes', -0.01], ['dark.jaunes', 2.01],
  ];
  for (const profil of ['soft', 'vivid']) {
    for (const [chemin, valeur] of refusees) {
      const resultat = avec((r) => {
        const cles = chemin.split('.');
        const dernier = cles.pop()!;
        cles.reduce((objet: any, cle) => objet[cle], r.profils[profil].enveloppe)[dernier] = valeur;
      });
      assert.ok('refus' in resultat, `${profil} ${chemin} ${valeur}`);
      assert.deepEqual(resultat.refus, [{ regle: 'enveloppe', chemin: `profils.${profil}.enveloppe.${chemin}`, valeur }]);
    }
  }
});

test("[REC-12] la lecture n'écrit rien, et ranger puis relire rend la même recette", () => {
  const texte = temoin('format-10');
  const lue = classerRecette(texte);
  assert.ok(lue.etat === 'courante');
  // La recette lue ne partage aucun objet avec les constantes du paquet.
  assert.notEqual(lue.recette.profils.soft, PROFILS_PAR_DEFAUT.soft);
  assert.notEqual(lue.recette.derives[0], RELEVE_TAILWIND[0]);
  assert.equal(temoin('format-10'), texte);
  assert.equal(JSON.parse(texte).formatVersion, 10);
  const rangee = jsonCanonique(lue.recette);
  assert.equal(JSON.parse(rangee).formatVersion, 12);
  const relue = classerRecette(rangee);
  assert.deepEqual(relue, { etat: 'courante', recette: lue.recette });
  assert.ok(relue.etat === 'courante');
  assert.equal(jsonCanonique(relue.recette), rangee);
});

test('[REC-13] la lecture ajoute 400 et 950 au témoin du format 10', () => {
  const ancienne = JSON.parse(temoin('format-10'));
  assert.ok(!ancienne.crans.includes(400) && !ancienne.crans.includes(950) && ancienne.crans.includes(500));
  const lue = classerRecette(JSON.stringify(ancienne));
  assert.ok(lue.etat === 'courante');
  const { crans, courbes } = lue.recette;
  assert.deepEqual(crans, [...ancienne.crans, 400, 950].sort((a: number, b: number) => a - b));
  for (const mode of ['light', 'dark'] as const) {
    assert.equal(courbes[mode].length, crans.length);
    crans.forEach((cran, rang) => {
      const avant = ancienne.crans.indexOf(cran);
      const attendue = avant >= 0 ? ancienne.courbes[mode][avant] : Math.round(luminositeAuNumero(ancienne, mode, cran) * 1000) / 1000;
      assert.equal(courbes[mode][rang], attendue, `${mode} ${cran}`);
    });
  }
  // Le cran 50, requis depuis surface/subtle, n'est pas ajouté : un témoin qui n'en a pas est refusé.
  const lueSans50 = classerRecette(JSON.stringify(sansLeCran(ancienne, 50)));
  assert.ok(lueSans50.etat === 'illisible');
  assert.deepEqual(lueSans50.refus, [{ regle: 'crans-emplois', chemin: 'crans', valeur: 50 }]);
});

test("[REC-13] la lecture ajoute aussi 500 quand le format 10 l'a laissé de côté", () => {
  const sans500 = sansLeCran(JSON.parse(temoin('format-10')), 500);
  const lue = classerRecette(JSON.stringify(sans500));
  assert.ok(lue.etat === 'courante');
  const rang = lue.recette.crans.indexOf(500);
  assert.ok(rang >= 0);
  assert.equal(lue.recette.courbes.light[rang], Math.round(luminositeAuNumero(sans500, 'light', 500) * 1000) / 1000);
  assert.equal(lue.recette.courbes.dark[rang], Math.round(luminositeAuNumero(sans500, 'dark', 500) * 1000) / 1000);
});

test('[REC-13] une recette sans 50 est refusée : surface/subtle le vise en Light', () => {
  const resultat = validerRecette(sansLeCran(valide(), 50));
  assert.ok('refus' in resultat);
  assert.deepEqual(resultat.refus, [{ regle: 'crans-emplois', chemin: 'crans', valeur: 50 }]);
});

test('[REC-13] une recette 11 sans 950 est refusée', () => {
  const resultat = validerRecette(sansLeCran(valide(), 950));
  assert.ok('refus' in resultat);
  assert.deepEqual(resultat.refus, [{ regle: 'crans-emplois', chemin: 'crans', valeur: 950 }]);
});

test('[REC-13] les crans requis réunissent ceux des deux thèmes, chacun dans son sens ; le 50 en fait partie par surface/subtle', () => {
  for (const light of ['blanc', 'noir'] as const) {
    for (const dark of ['blanc', 'noir'] as const) {
      const texteDesBoutons = { light, dark };
      const requis = requisDe(texteDesBoutons);
      assert.ok(requis.includes(50) && requis.includes(400) && requis.includes(500) && requis.includes(950), `${light}/${dark}`);
      const complete = { ...valide(), texteDesBoutons };
      for (const cran of requis) {
        const resultat = validerRecette(sansLeCran(complete, cran));
        assert.ok('refus' in resultat, `sans ${cran} en ${light}/${dark}`);
        assert.deepEqual(resultat.refus, [{ regle: 'crans-emplois', chemin: 'crans', valeur: cran }]);
      }
    }
  }
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

// ------------------------------------------------------------ les couleurs figées (formats 8 et 10)

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

// ------------------------------------------------------------ les couleurs figées à deux intensités (format 10)

const ROUGE = ['#FEF2F2', '#FEE2E2', '#FECACA', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D', '#450A0A'];
const NUIT = [...SLATE].reverse();

/** Une palette figée à deux intensités : Soft et Vivid portent chacun leurs couleurs, Light et Dark. */
function figeeADeuxIntensites(reglages: Partial<Palette> = {}): Palette {
  const { parts: _parts, ...sansParts } = paletteTailwind('p-000000f2', '#475569');
  return { ...sansParts, crans: NUANCES_FIGEES, figees: { soft: { light: SLATE, dark: NUIT }, vivid: { light: ROUGE, dark: [...ROUGE].reverse() } }, ...reglages };
}

test('[VAR-13] des couleurs figées à deux intensités se valident, et les rampes de chaque intensité rendent les siennes', () => {
  const palette = figeeADeuxIntensites();
  assert.deepEqual(refusDeLaPalette(palette), []);
  const recette = { ...valide(), palettes: [palette] };
  assert.deepEqual(validerRecette(copie(recette)), { recette });
  const rampes = rampesDe(recette, palette);
  assert.deepEqual(Object.keys(rampes), ['soft', 'vivid']);
  assert.deepEqual(rampes.soft!.light.map((cran) => cran.hexa), SLATE);
  assert.deepEqual(rampes.soft!.dark.map((cran) => cran.hexa), NUIT);
  assert.deepEqual(rampes.vivid!.light.map((cran) => cran.hexa), ROUGE);
  assert.deepEqual(rampes.vivid!.dark.map((cran) => cran.hexa), [...ROUGE].reverse());
  // Sans mode Dark à l'origine d'une intensité, son thème Dark rend celui de Light.
  const sansDark = figeeADeuxIntensites({ figees: { soft: { light: SLATE }, vivid: { light: ROUGE, dark: NUIT } } });
  assert.deepEqual(rampesDe(recette, sansDark).soft!.dark.map((cran) => cran.hexa), SLATE);
  assert.deepEqual(verifierPromesses(recette, palette), []);
});

test('[VAR-13] la référence d’une palette figée à deux intensités est la nuance de l’intensité qui en porte la couleur', () => {
  const recette = { ...valide(), palettes: [figeeADeuxIntensites()] };
  assert.deepEqual(ancrageDe(recette, figeeADeuxIntensites()), { profil: 'soft', rangs: { light: 6, dark: 6 }, crans: { light: 600, dark: 600 } });
  const vivid = figeeADeuxIntensites({ reference: '#B91C1C' });
  assert.deepEqual(ancrageDe(recette, vivid), { profil: 'vivid', rangs: { light: 7, dark: 7 }, crans: { light: 700, dark: 700 } });
  // Une référence que ni l'une ni l'autre ne porte retombe sur Soft, première nuance.
  assert.deepEqual(ancrageDe(recette, figeeADeuxIntensites({ reference: '#123456' })), { profil: 'soft', rangs: { light: 0, dark: 0 }, crans: { light: 50, dark: 50 } });
});

test('[VAR-13] les deux formes de figees ne se mélangent pas : une forme à une intensité exige intensites: 1, une forme à deux le refuse', () => {
  const { intensites: _intensites, ...sansIntensites } = figee();
  assert.deepEqual(refusDeLaPalette(sansIntensites), ['figees-sans-liste palettes[0].figees']);
  assert.deepEqual(refusDeLaPalette({ ...figeeADeuxIntensites(), intensites: 1 }), ['figees-incompatible palettes[0].intensites']);
  const melange = { ...figee(), figees: { light: SLATE, soft: { light: SLATE }, vivid: { light: SLATE } } };
  assert.ok(refusDeLaPalette(melange).includes('cle-inconnue palettes[0].figees.light'));
  assert.deepEqual(refusDeLaPalette(figeeADeuxIntensites({ figees: { soft: { light: SLATE } } as never })), ['forme palettes[0].figees.vivid']);
  assert.deepEqual(refusDeLaPalette(figeeADeuxIntensites({ figees: { soft: SLATE, vivid: ROUGE } as never })), [
    'forme palettes[0].figees.soft', 'forme palettes[0].figees.vivid',
  ]);
});

test('[VAR-13] chaque intensité figée porte un hexa lisible par nuance, et ne se règle pas', () => {
  const refus = (figees: unknown) => refusDeLaPalette(figeeADeuxIntensites({ figees: figees as never }));
  assert.deepEqual(refus({ soft: { light: SLATE.slice(1) }, vivid: { light: ROUGE } }), ['figees-longueur palettes[0].figees.soft.light']);
  assert.deepEqual(refus({ soft: { light: SLATE }, vivid: { light: ROUGE, dark: ROUGE.slice(2) } }), ['figees-longueur palettes[0].figees.vivid.dark']);
  assert.deepEqual(refus({ soft: { light: SLATE }, vivid: { light: ['bleu', ...ROUGE.slice(1)] } }), ['hexa-invalide palettes[0].figees.vivid.light[0]']);
  assert.deepEqual(refus({ soft: { dark: SLATE }, vivid: { light: ROUGE } }), ['forme palettes[0].figees.soft.light']);
  const { crans: _crans, ...sansListe } = figeeADeuxIntensites();
  assert.deepEqual(refusDeLaPalette(sansListe), ['figees-sans-liste palettes[0].figees']);
  assert.deepEqual(refusDeLaPalette(figeeADeuxIntensites({ base: 'soft' })).filter((r) => r.startsWith('figees')), ['figees-incompatible palettes[0].base']);
  assert.deepEqual(refusDeLaPalette(figeeADeuxIntensites({ originale: '#334155' })), ['figees-incompatible palettes[0].originale']);
});

/** Les messages avant leur mise en mots : groupes de promesses, place des alertes, cibles d'action ([VER-06], [VER-15]). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, sensDuTheme, verifierPromesses, type Alerte, type Mode, type Recette, type SensDuTheme, type TexteDesBoutons, type VariableDuTheme } from 'ucm-couleur';

import { changerReference } from '../src/edition';
import { TEXTES_DE_L_APERCU as TEXTES_EN } from '../src/i18n/en';
import { TEXTES_DE_L_APERCU as TEXTES_FR } from '../src/i18n/fr';
import {
  apercuEnBandes,
  bandesDe,
  ciblesDeLAlerte,
  colorShiftModifie,
  estLaPaletteNeutre,
  etatDeLaFiche,
  fondDeLaPromesse,
  garantiesDeLaVariable,
  gesteDeLaCible,
  groupesManques,
  hauteursDesRayures,
  placeDeLAlerte,
  reglageGlobalModifie,
  surlignageDe,
  variableDuFond,
  type Bande,
  type Geste,
  type GroupeDePromesses,
} from '../src/presentation';

const DEFAUT = recetteParDefaut();
const BLEU = changerReference(DEFAUT, {
  id: 'p-0000000a',
  reference: '#000000',
  derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'tailwind' }, vivid: { clair: 0, sombre: 0, origine: 'tailwind' } },
}, '#1E6FD9')!;

/**
 * La courbe claire place le cran 700 à 0,60 : en Light, le texte des boutons blanc
 * sur `solid/default` (G1) et `page/foreground` sur la page (G5) manquent leur
 * minimum, pour les deux profils.
 */
function recetteAMoitieRatee(): Recette {
  const light = [...DEFAUT.courbes.light];
  light[7] = 0.6;
  return { ...DEFAUT, palettes: [BLEU], courbes: { ...DEFAUT.courbes, light } };
}

/** Le fond d'un groupe, par son nom de variable. */
const nomDuFond = (fond: GroupeDePromesses['fond']): string => ('fondDeLaPage' in fond ? 'page' : fond.variable);

test('[VER-06] deux profils en échec sur le même fond font un groupe, et comptent deux contrôles', () => {
  const recette = recetteAMoitieRatee();
  const promesses = verifierPromesses(recette, BLEU);
  const groupes = groupesManques(promesses);
  assert.deepEqual(groupes.map((groupe) => `${groupe.garantie.premier.variable} ${groupe.mode} ${nomDuFond(groupe.fond)} ${groupe.manquees}`), ['solid/foreground light solid/default 2', 'page/foreground light page 2']);
  assert.equal(groupes.reduce((total, groupe) => total + groupe.manquees, 0), promesses.filter((promesse) => promesse.verdict === 'manquee').length);
  assert.deepEqual(groupes[0].resultats.map((promesse) => promesse.profil), ['soft', 'vivid']);
  assert.deepEqual(groupes.map((groupe) => groupe.garantie.numero), [1, 5]);
});

test('[VER-06] un groupe nomme un seul fond de sa garantie : trois fonds manqués font trois groupes, dans l’ordre des fonds', () => {
  const promesses = verifierPromesses({ ...DEFAUT, palettes: [BLEU] }, BLEU).map((promesse) =>
    (promesse.mode === 'dark' && promesse.profil === 'vivid' && promesse.garantie.numero === 3 ? { ...promesse, verdict: 'manquee' as const } : promesse));
  const groupes = groupesManques(promesses);
  assert.deepEqual(groupes.map((groupe) => `${groupe.mode} ${nomDuFond(groupe.fond)} ${groupe.manquees}/${groupe.resultats.length}`), ['dark surface/default 1/2', 'dark surface/hover 1/2', 'dark surface/pressed 1/2', 'dark page 1/2']);
  assert.ok(groupes.every((groupe) => groupe.garantie.numero === 3));
  assert.deepEqual(groupes.map((groupe) => groupe.resultats.length), [2, 2, 2, 2]);
});

test('[VER-06] un groupe garde le résultat du profil qui tient sa promesse', () => {
  const promesses = verifierPromesses(recetteAMoitieRatee(), BLEU).map((promesse) =>
    (promesse.profil === 'soft' ? { ...promesse, verdict: 'tenue' as const } : promesse));
  const [groupe] = groupesManques(promesses);
  assert.equal(groupe.manquees, 1);
  assert.deepEqual(groupe.resultats.map((promesse) => promesse.verdict), ['tenue', 'manquee']);
});

test('aucune promesse manquée, aucun groupe', () => {
  assert.deepEqual(groupesManques(verifierPromesses({ ...DEFAUT, palettes: [BLEU] }, BLEU)), []);
});

/** Les quatre combinaisons du texte des boutons, avec le texte posé sur chaque thème. */
const TEXTES: { readonly texte: Recette['texteDesBoutons']; readonly nom: string }[] = [
  { texte: { light: 'blanc', dark: 'noir' }, nom: 'normal' },
  { texte: { light: 'noir', dark: 'noir' }, nom: 'Light inversé' },
  { texte: { light: 'blanc', dark: 'blanc' }, nom: 'Dark inversé' },
  { texte: { light: 'noir', dark: 'blanc' }, nom: 'deux inversés' },
];

test('[UI-10] [I5] le fond que juge une promesse se lit dans son second membre, dans les quatre combinaisons du texte des boutons', () => {
  for (const { texte, nom } of TEXTES) {
    const promesses = verifierPromesses({ ...DEFAUT, texteDesBoutons: texte, palettes: [BLEU] }, BLEU);
    assert.ok(promesses.length > 0, nom);
    const vus = new Map<string, number>();
    for (const promesse of promesses) {
      // Le moteur rend une promesse par fond, dans l'ordre de la garantie : le rang dit le fond.
      const cle = `${promesse.mode}|${promesse.profil}|${promesse.garantie.numero}`;
      const rang = vus.get(cle) ?? 0;
      vus.set(cle, rang + 1);
      assert.deepEqual(fondDeLaPromesse(promesse), promesse.garantie.fonds[rang], `${nom} ${cle} rang ${rang}`);
    }
  }
  assert.equal(variableDuFond({ fondDeLaPage: true }), 'elevation/page');
  assert.equal(variableDuFond({ variable: 'surface/hover' }), 'surface/hover');
});

test('[UI-10] [I5] les garanties d\u2019une variable : une par fond quand elle est le premier membre, une quand elle est un fond', () => {
  const promesses = verifierPromesses({ ...DEFAUT, palettes: [BLEU] }, BLEU);
  const lire = (variable: VariableDuTheme) => garantiesDeLaVariable(promesses, 'light', 'vivid', variable).map(({ promesse, role, partenaire }) => `${promesse.garantie.numero} ${role} ${partenaire}`);
  assert.deepEqual(lire('solid/foreground'), ['1 premier solid/default', '1 premier solid/hover', '1 premier solid/pressed']);
  assert.deepEqual(lire('solid/default'), ['1 fond solid/foreground', '2 premier elevation/page']);
  assert.deepEqual(lire('surface/default'), ['3 fond surface/foreground', '4 fond surface/border', '7 fond page/focus']);
  assert.deepEqual(lire('page/focus'), ['7 premier elevation/page', '7 premier surface/default']);
  assert.deepEqual(lire('page/foreground'), ['5 premier elevation/page']);
  assert.deepEqual(lire('page/divider'), [], 'le filet n\u2019a pas de minimum');
  assert.deepEqual(garantiesDeLaVariable(promesses, 'light', 'soft', 'solid/default').map(({ promesse }) => promesse.profil), ['soft', 'soft'], 'une intensité à la fois');
  assert.deepEqual(garantiesDeLaVariable(promesses, 'dark', 'vivid', 'page/border').map(({ promesse }) => promesse.mode), ['dark'], 'un thème à la fois');
});

test('[UI-10] [I5] dans le sens inversé, le bouton survolé est la 600 : sa garantie est celle du texte des boutons sur solid/hover', () => {
  const inversee = { ...DEFAUT, texteDesBoutons: { light: 'noir', dark: 'noir' } as Recette['texteDesBoutons'], palettes: [BLEU] };
  const promesses = verifierPromesses(inversee, BLEU);
  const [garantie] = garantiesDeLaVariable(promesses, 'light', 'vivid', 'solid/hover');
  assert.equal(`${garantie.role} ${garantie.partenaire} ${garantie.promesse.second.nature === 'cran' ? garantie.promesse.second.cran : '-'}`, 'fond solid/foreground 600');
  assert.deepEqual(garantiesDeLaVariable(promesses, 'dark', 'vivid', 'solid/hover').map(({ promesse }) => (promesse.second.nature === 'cran' ? promesse.second.cran : 0)), [800], 'Dark reste normal');
});

test('[VER-10] [VER-11] les alertes qui comparent les intensités se lisent près du réglage d’intensité', () => {
  const place = (code: Alerte['code']) => placeDeLAlerte({ code } as Alerte);
  assert.deepEqual(
    ['profils-confondus', 'reference-plus-terne', 'reference-plus-vive', 'palettes-proches', 'fond-hors-courbe'].map((code) => place(code as Alerte['code'])),
    ['intensite', 'intensite', 'intensite', 'liste', 'liste'],
  );
});

test('[VER-15] chaque alerte ouvre le réglage de sa cause : des profils confondus, la saturation de la palette', () => {
  assert.deepEqual(ciblesDeLAlerte({ code: 'profils-confondus', palette: BLEU.id, crans: [], seuil: 0.02 }), ['saturation-palette']);
  assert.deepEqual(ciblesDeLAlerte({ code: 'reference-plus-terne', palette: BLEU.id, part: 0.2, partSoft: 0.45 }), ['intensites-palette']);
  assert.deepEqual(ciblesDeLAlerte({ code: 'palettes-proches', palettes: [BLEU.id, 'p-0000000b'], distance: 0.03, seuil: 0.05 }), ['reference']);
  assert.deepEqual(ciblesDeLAlerte({ code: 'fond-hors-courbe', mode: 'light', clarte: 0.9, cran: 0.975 }), ['fonds']);
});

/** Une bande en une ligne : ses accolades avec leurs codes, leurs colonnes et la place de leur libellé. */
function decrire(bande: Bande): string {
  return bande.accolades
    .map((accolade) => `${accolade.codes.map((code) => code.code).join('·')} ${accolade.debut}-${accolade.fin} [${accolade.libelle.debut}-${accolade.libelle.fin} ${accolade.libelle.alignement}${accolade.libelle.colle ? ' colle' : ''}]`)
    .join(' | ');
}

const NOMS = (bande: Bande, rang: number): string => bande.accolades[rang].codes.map((code) => code.nom).join('·');

/** Les bandes du sens normal, sur la liste par défaut (50 à 950) : 700, 800 et 900 pour `solid`, 800 pour `surface/foreground`. */
const BANDES_NORMALES = {
  solid: 'foreground -1--1 [-1-2 start] | default·hover·pressed 7-9 [6-10 center]',
  surface: 'default·hover·pressed 1-3 [-1-5 center] | foreground·border 8-8 [6-10 center]',
  page: 'divider 3-3 [2-4 center] | focus 6-6 [5-6 end colle] | foreground·border 7-7 [7-10 start]',
};
/** Les bandes du sens inversé : `solid` descend vers la page, le texte et le contour montent d'une nuance. */
const BANDES_INVERSEES = {
  solid: 'foreground -1--1 [-1-1 start] | pressed·hover·default 5-7 [2-10 center]',
  surface: 'default·hover·pressed 1-3 [-1-5 center] | foreground·border 9-9 [8-10 center]',
  page: 'divider 3-3 [2-4 center] | focus 7-7 [5-7 end colle] | foreground·border 8-8 [8-10 start]',
};

test('[UI-04] [I2] [I3] les trois bandes suivent la table du sens du thème, dans les quatre combinaisons du texte des boutons', () => {
  const combinaisons: [Mode, TexteDesBoutons, SensDuTheme, string][] = [
    ['light', 'blanc', 'normal', '#FFFFFF'],
    ['light', 'noir', 'inverse', '#000000'],
    ['dark', 'noir', 'normal', '#000000'],
    ['dark', 'blanc', 'inverse', '#FFFFFF'],
  ];
  for (const [mode, texte, sens, couleur] of combinaisons) {
    const apercu = apercuEnBandes(mode, texte, DEFAUT.crans, false);
    const attendues = sens === 'normal' ? BANDES_NORMALES : BANDES_INVERSEES;
    assert.equal(apercu.sens, sens, `${mode} ${texte}`);
    assert.equal(apercu.couleurDuTexte, couleur, `la case tiretée de ${mode} ${texte} prend le texte des boutons`);
    assert.deepEqual(apercu.bandes.map((bande) => bande.dossier), ['solid', 'surface', 'page']);
    assert.deepEqual(apercu.bandes.map(decrire), [attendues.solid, attendues.surface, attendues.page], `${mode} ${texte}`);
  }
  assert.equal(sensDuTheme('light', 'noir'), 'inverse', 'le sens vient du kit');
});

test('[UI-04] [I12] les états s’écrivent dans l’ordre de leurs nuances : pressed · hover · default dans le sens inversé', () => {
  const [normal, inverse] = (['normal', 'inverse'] as const).map((sens) => bandesDe(DEFAUT.crans, sens, false)[0]);
  assert.deepEqual(normal.accolades[1].codes.map((code) => code.variable), ['solid/default', 'solid/hover', 'solid/pressed']);
  assert.deepEqual(inverse.accolades[1].codes.map((code) => code.variable), ['solid/pressed', 'solid/hover', 'solid/default']);
  assert.equal(NOMS(normal, 1), 'repos·survol·appui');
  assert.equal(NOMS(inverse, 1), 'appui·survol·repos');
  const ecrire = (bande: Bande, textes: typeof TEXTES_FR | typeof TEXTES_EN) => bande.accolades[1].codes.map((code) => textes.noms[code.nom]).join(' · ');
  assert.equal(ecrire(normal, TEXTES_FR), 'repos · survol · appui');
  assert.equal(ecrire(inverse, TEXTES_FR), 'appui · survol · repos');
  assert.equal(ecrire(normal, TEXTES_EN), 'rest · hover · pressed');
  assert.equal(ecrire(inverse, TEXTES_EN), 'pressed · hover · rest');
  // Les fonds de `surface` restent dans l'ordre des nuances dans les deux sens.
  assert.equal(NOMS(bandesDe(DEFAUT.crans, 'inverse', false)[1], 0), 'repos·survol·appui');
});

test('[UI-04] [I12] les noms sous les codes viennent du catalogue de chaque langue, texte et contour compris', () => {
  const bandes = bandesDe(DEFAUT.crans, 'normal', false);
  const noms = (textes: typeof TEXTES_FR | typeof TEXTES_EN) => bandes.map((bande) => bande.accolades.map((accolade) => accolade.codes.map((code) => textes.noms[code.nom]).join(' · ')));
  assert.deepEqual(noms(TEXTES_FR), [['texte des boutons', 'repos · survol · appui'], ['repos · survol · appui', 'texte · contour'], ['filet', 'anneau de focus', 'texte · contour']]);
  assert.deepEqual(noms(TEXTES_EN), [['button text', 'rest · hover · pressed'], ['rest · hover · pressed', 'text · border'], ['divider', 'focus ring', 'text · border']]);
  assert.deepEqual([TEXTES_FR.roles.solid, TEXTES_FR.roles.surface, TEXTES_FR.roles.page], ['fond plein', 'fond teinté', 'sur la page']);
  assert.deepEqual([TEXTES_EN.roles.solid, TEXTES_EN.roles.surface, TEXTES_EN.roles.page], ['solid fill', 'tinted fill', 'on the page']);
});

test('[UI-04] [I12] une palette à une ou deux intensités a les mêmes bandes ; seule la hauteur des rayures change', () => {
  assert.deepEqual(hauteursDesRayures(2), { petite: 3, texteDesBoutons: 7 });
  assert.deepEqual(hauteursDesRayures(1), { petite: 5, texteDesBoutons: 5 });
  // Le contenu et la place des libellés ne dépendent que de la liste et du sens : `bandesDe` ne reçoit pas les intensités.
  assert.deepEqual(bandesDe(DEFAUT.crans, 'normal', false).map(decrire), [BANDES_NORMALES.solid, BANDES_NORMALES.surface, BANDES_NORMALES.page]);
});

test('[UI-04] [I2] une variable dont le cran manque n’a pas de code, et une accolade sans variable disparaît', () => {
  // Sans 500, une recette reste lisible tant que ses deux thèmes sont normaux ; inversé, `solid/pressed` manque.
  const sans500 = DEFAUT.crans.filter((cran) => cran !== 500);
  assert.equal(decrire(bandesDe(sans500, 'normal', false)[0]), 'foreground -1--1 [-1-2 start] | default·hover·pressed 6-8 [5-9 center]');
  const inverse = bandesDe(sans500, 'inverse', false)[0];
  assert.deepEqual(inverse.accolades[1].codes.map((code) => code.code), ['hover', 'default']);
  const sansPage = bandesDe([100, 200, 300], 'normal', false)[2];
  assert.deepEqual(sansPage.accolades.map((accolade) => accolade.codes.map((code) => code.code)), [['divider']]);
});

test('[UI-04] [I2] la bande du neutre lit foreground-subtle · border, et page/foreground-main se lit hors de la rampe', () => {
  for (const sens of ['normal', 'inverse'] as const) {
    const page = bandesDe(DEFAUT.crans, sens, true)[2];
    const dernier = page.accolades[2];
    assert.deepEqual(dernier.codes.map((code) => code.variable), ['page/foreground-subtle', 'page/border']);
    assert.deepEqual(dernier.codes.map((code) => code.code), ['foreground-subtle', 'border']);
    assert.deepEqual(dernier.codes.map((code) => TEXTES_FR.noms[code.nom]), ['texte secondaire', 'contour']);
    assert.deepEqual(dernier.codes.map((code) => TEXTES_EN.noms[code.nom]), ['secondary text', 'border']);
    // Les deux autres bandes ne changent pas.
    assert.deepEqual(bandesDe(DEFAUT.crans, sens, true).slice(0, 2).map(decrire), bandesDe(DEFAUT.crans, sens, false).slice(0, 2).map(decrire));
  }
  assert.equal(decrire(bandesDe(DEFAUT.crans, 'normal', true)[2]), BANDES_NORMALES.page.replace('foreground·border', 'foreground-subtle·border'));
  assert.equal(TEXTES_FR.noteDuNeutre, 'corps de texte, noir ou blanc purs, hors de la rampe');
  assert.equal(TEXTES_EN.noteDuNeutre, 'body text, pure black or white, outside the ramp');
  assert.equal(estLaPaletteNeutre({ nom: 'neutral' }), true);
  assert.equal(estLaPaletteNeutre({ nom: ' Neutral ' }), true);
  assert.equal(estLaPaletteNeutre({ nom: 'neutral-warm' }), false);
  assert.equal(estLaPaletteNeutre({}), false);
});

/** Ce qu'un geste surligne, en une ligne : les crans, les variables, puis le dossier. */
function surligne(geste: Geste, sens: SensDuTheme, neutre = false, crans: readonly number[] = DEFAUT.crans): string {
  const { crans: numeros, variables, dossier } = surlignageDe(geste, crans, sens, neutre);
  return `${numeros.join(',')} | ${variables.join(',')} | ${dossier ?? '-'}`;
}

const VIDE = ' |  | -';

test('[UI-04] [I13] survoler ou focaliser une pastille surligne chaque variable de son cran, dans la table du sens montré', () => {
  const cran = (numero: number): Geste => ({ nature: 'cran', numero });
  assert.equal(surligne(cran(700), 'normal'), '700 | solid/default,page/foreground,page/border | -');
  assert.equal(surligne(cran(800), 'normal'), '800 | solid/hover,surface/foreground,surface/border | -');
  assert.equal(surligne(cran(600), 'normal'), '600 | page/focus | -');
  assert.equal(surligne(cran(300), 'normal'), '300 | surface/pressed,page/divider | -');
  assert.equal(surligne(cran(900), 'normal'), '900 | solid/pressed | -');
  assert.equal(surligne(cran(700), 'inverse'), '700 | solid/default,page/focus | -');
  assert.equal(surligne(cran(600), 'inverse'), '600 | solid/hover | -');
  assert.equal(surligne(cran(500), 'inverse'), '500 | solid/pressed | -');
  assert.equal(surligne(cran(800), 'inverse'), '800 | page/foreground,page/border | -');
  assert.equal(surligne(cran(900), 'inverse'), '900 | surface/foreground,surface/border | -');
});

test('[UI-04] [I13] une nuance qu’aucune variable ne prend ne surligne rien', () => {
  for (const numero of [50, 400, 950]) assert.equal(surligne({ nature: 'cran', numero }, 'normal'), VIDE, `${numero}`);
  assert.equal(surligne({ nature: 'cran', numero: 500 }, 'normal'), VIDE, '500 n’est requis que dans le sens inversé');
  assert.equal(surligne({ nature: 'cran', numero: 400 }, 'inverse'), VIDE);
  assert.equal(surligne({ nature: 'cran', numero: 1234 }, 'normal'), VIDE, 'un numéro hors de la liste');
  // `disabled/*` n’a pas de code dans les bandes : le cran 500 du neutre reste muet.
  assert.equal(surligne({ nature: 'cran', numero: 500 }, 'normal', true), VIDE);
  // Le neutre ajoute son texte secondaire au cran 700 : page/foreground n’a plus de code.
  assert.equal(surligne({ nature: 'cran', numero: 700 }, 'normal', true), '700 | solid/default,page/border,page/foreground-subtle | -');
});

test('[UI-04] [I13] survoler un code surligne ses pastilles et ses petites pastilles ; solid/foreground, la case tiretée', () => {
  const code = (variable: VariableDuTheme): Geste => ({ nature: 'code', variable });
  assert.equal(surligne(code('solid/hover'), 'normal'), '800 | solid/hover | -');
  assert.equal(surligne(code('solid/hover'), 'inverse'), '600 | solid/hover | -', 'le surlignage suit la table du nouveau sens');
  assert.equal(surligne(code('surface/border'), 'inverse'), '900 | surface/border | -');
  assert.equal(surligne(code('solid/foreground'), 'normal'), ' | solid/foreground | -');
  assert.equal(surligne(code('page/foreground-subtle'), 'inverse', true), '800 | page/foreground-subtle | -');
  assert.equal(surligne(code('page/foreground-main'), 'normal', true), ' | page/foreground-main | -');
  assert.equal(surligne(code('page/foreground-main'), 'normal', false), VIDE, 'seul le neutre a cette note');
  assert.equal(surligne(code('page/foreground'), 'normal', true), VIDE, 'le neutre lit foreground-subtle à sa place');
  assert.equal(surligne(code('disabled/border'), 'normal', true), VIDE, 'pas de code dans les bandes');
  assert.equal(surligne(code('solid/pressed'), 'normal', false, [100, 200, 300, 700, 800]), VIDE, 'un cran absent de la liste');
});

test('[UI-04] [I13] survoler un spécimen de dossier surligne les crans du dossier, et le dossier pour atténuer le reste', () => {
  const dossier = (nom: 'solid' | 'surface' | 'page'): Geste => ({ nature: 'dossier', dossier: nom });
  assert.equal(surligne(dossier('solid'), 'normal'), '700,800,900 |  | solid');
  assert.equal(surligne(dossier('solid'), 'inverse'), '500,600,700 |  | solid');
  assert.equal(surligne(dossier('surface'), 'normal'), '100,200,300,800 |  | surface');
  assert.equal(surligne(dossier('surface'), 'inverse'), '100,200,300,900 |  | surface');
  assert.equal(surligne(dossier('page'), 'normal'), '300,600,700 |  | page');
  assert.equal(surligne(dossier('page'), 'inverse'), '300,700,800 |  | page');
  assert.equal(surligne(dossier('page'), 'inverse', true), '300,700,800 |  | page', 'le neutre garde les crans de page/foreground');
  assert.equal(surligne(dossier('solid'), 'inverse', false, DEFAUT.crans.filter((cran) => cran !== 500)), '600,700 |  | solid');
});

test('[UI-04] [I13] le choix d’une pastille surligne comme le survol, et le survol désigne un code avant une pastille, une pastille avant un dossier', () => {
  assert.deepEqual(gesteDeLaCible({ cran: '700' }), { nature: 'cran', numero: 700 });
  assert.deepEqual(gesteDeLaCible({ token: 'solid/hover', cran: '800' }), { nature: 'code', variable: 'solid/hover' });
  assert.deepEqual(gesteDeLaCible({ token: null, cran: '800', dossier: 'solid' }), { nature: 'cran', numero: 800 });
  assert.deepEqual(gesteDeLaCible({ dossier: 'surface' }), { nature: 'dossier', dossier: 'surface' });
  assert.equal(gesteDeLaCible({ dossier: 'autre' }), null);
  assert.equal(gesteDeLaCible({}), null);
  // Le choix d'une nuance est le geste d'une pastille de ce numéro : même surlignage, tant qu'elle reste choisie.
  const choisie = gesteDeLaCible({ cran: '700' })!;
  assert.equal(surligne(choisie, 'normal'), surligne({ nature: 'cran', numero: 700 }, 'normal'));
  // Changer le thème affiché ou le texte des boutons change le sens : le même geste surligne la table du nouveau sens.
  assert.notEqual(surligne(choisie, 'normal'), surligne(choisie, 'inverse'));
});


test('[UI-12] une carte repliée se dit réglée dès qu’une valeur quitte celle d’une palette neuve (recette v7)', () => {
  assert.equal(reglageGlobalModifie(BLEU), false);
  assert.equal(reglageGlobalModifie({ ...BLEU, reglages: { teinte: { soft: 8 } } }), true);
  assert.equal(reglageGlobalModifie({ ...BLEU, reglages: { clarte: { vivid: 0 } } }), false, 'un décalage nul ne compte pas');
  assert.equal(reglageGlobalModifie({ ...BLEU, parts: { soft: 0.3, vivid: 0.9, origine: 'designer' } }), true);
  assert.equal(reglageGlobalModifie({ ...BLEU, intensites: 1, reglages: { part: 0.6 } }), true);
  assert.equal(reglageGlobalModifie({ ...BLEU, intensites: 1, reglages: { teinte: { soft: 8 } } }), false, 'à une intensité, seul Vivid porte les réglages');

  assert.equal(colorShiftModifie(BLEU, false), false, 'le préréglage Tailwind d’une palette neuve');
  const libre = { ...BLEU, derive: { ...BLEU.derive, vivid: { clair: 6, sombre: 0, origine: 'libre' as const } } };
  assert.equal(colorShiftModifie(libre, false), true);
  assert.equal(colorShiftModifie(libre, true), false, 'une palette grise ne lit que sa luminosité');
  const eclaircie = { ...BLEU, derive: { ...BLEU.derive, vivid: { ...BLEU.derive.vivid, clarte: { clair: 0, sombre: 0.02 } } } };
  assert.equal(colorShiftModifie(eclaircie, true), true);
  assert.equal(colorShiftModifie({ ...BLEU, derive: { ...libre.derive, lien: true, vivid: BLEU.derive.vivid, soft: libre.derive.vivid } }, false), false, 'liés, les profils se lisent sur Vivid');
  assert.equal(colorShiftModifie({ ...BLEU, derive: { ...libre.derive, lien: false, vivid: BLEU.derive.vivid, soft: libre.derive.vivid } }, false), true);
});

test('[UI-26] l’état d’une fiche est le plus urgent de ses sorties : modifiée, à mettre à jour, pas encore, synchronisée', () => {
  // Sans ligne « Tokens Figma », la planche décide seule.
  assert.equal(etatDeLaFiche(null, 'a-jour'), 'synchronisee');
  assert.equal(etatDeLaFiche(null, 'jamais-dessinee'), 'pas-encore');
  for (const planche of ['perimee', 'introuvable', 'illisible'] as const) assert.equal(etatDeLaFiche(null, planche), 'a-mettre-a-jour');
  // Des couleurs changées dans Figma passent avant tout le reste.
  for (const planche of ['a-jour', 'perimee', 'jamais-dessinee'] as const) assert.equal(etatDeLaFiche('modifies', planche), 'modifiee');
  // Une sortie en retard passe avant une sortie absente.
  assert.equal(etatDeLaFiche('jamais-ecrits', 'perimee'), 'a-mettre-a-jour');
  assert.equal(etatDeLaFiche('a-mettre-a-jour', 'jamais-dessinee'), 'a-mettre-a-jour');
  assert.equal(etatDeLaFiche('introuvables', 'a-jour'), 'a-mettre-a-jour');
  assert.equal(etatDeLaFiche('jamais-ecrits', 'a-jour'), 'pas-encore');
  assert.equal(etatDeLaFiche('a-jour', 'jamais-dessinee'), 'pas-encore');
  assert.equal(etatDeLaFiche('a-jour', 'a-jour'), 'synchronisee');
});

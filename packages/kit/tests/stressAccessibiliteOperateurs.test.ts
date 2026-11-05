/**
 * Garde les opérateurs S, G, O, F, M et Y du harnais de stress F7 : P0 et un échantillon des 48 profils à zéro constat C49 à C52,
 * les nombres de cas par sous-opérateur contre le plan, les cas `mesure` et leur question, un oracle écrit à la main par opérateur,
 * et la réversibilité (dégrader puis annuler redonne la base). Le test ne mesure pas le kit sur les cas, sauf deux repères de WCAG :
 * un écart du kit sur les autres est un résultat du harnais, pas un échec d'ici.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { controlerLAccessibilite } from '../src/controles/accessibilite.js';
import { comparer } from './stress/commun/comparer.js';
import { cleDeConstat, type CasAccessibilite } from './stress/f7-accessibilite/cas.js';
import { composantDeContraste } from './stress/f7-accessibilite/composantDeContraste.js';
import { pairesTropJustes } from './stress/f7-accessibilite/couleursDeStress.js';
import { GENERATEURS, tousLesCas } from './stress/f7-accessibilite/operateurs.js';
import { composantDuProfil, constatsDuProfil, constatsInterdits, PROFIL_ALPHA, PROFIL_P0, PROFILS, profilTire } from './stress/f7-accessibilite/profils.js';

const base = composantDuProfil(PROFIL_P0);
const baseAvant = JSON.stringify({ releve: base.releve, catalogue: base.catalogue });
const TOUS = tousLesCas(base);
const cas = (id: string): CasAccessibilite => TOUS.find((entree) => entree.id === id)!;
const duOperateur = (operateur: string): CasAccessibilite[] => TOUS.filter((entree) => entree.operateur === operateur);
const cible = base.releve.variants[0].nom;

test('les 48 profils sont p001 à p048, P0 est button-36 à 48 variants en deux modes, fond opaque, niveau AA', () => {
  assert.equal(PROFILS.length, 48);
  assert.deepEqual([PROFILS[0].id, PROFILS[47].id], ['p001', 'p048']);
  assert.equal(new Set(PROFILS.map((profil) => profil.id)).size, 48);
  assert.deepEqual({ ...PROFIL_P0 }, { id: 'p013', forme: 'button-36', modes: 2, fond: 'opaque', niveau: 'AA' });
  assert.deepEqual({ ...PROFIL_ALPHA }, { id: 'p007', forme: 'alert-11', modes: 2, fond: 'translucide', niveau: 'AA' });
  assert.ok(PROFILS.some((profil) => profil.id === profilTire().id));
  assert.equal(base.releve.variants.length, 48);
  assert.deepEqual(base.releve.proprietes.find((p) => p.nom === 'State')!.valeurs, ['Default', 'Hover', 'Focus', 'Disabled']);
});

test('chaque paire de base dépasse son seuil de 25 % dans les deux modes et les deux fonds', () => {
  assert.deepEqual(pairesTropJustes(), []);
});

test('P0 ne donne aucun constat C49 à C52 : seul C53 sort, pour les douze variants désactivés', () => {
  const constats = constatsDuProfil(base);
  assert.deepEqual(constatsInterdits(constats), []);
  assert.deepEqual(constats.map((constat) => [constat.id, constat.faits.variantsExclus]), [['C53', 12]]);
  assert.equal(JSON.stringify({ releve: base.releve, catalogue: base.catalogue }), baseAvant);
});

test('un échantillon des profils, un par forme, un mode, deux modes, fond translucide et niveau AAA, ne donne aucun constat C49 à C52', () => {
  for (const id of ['p001', 'p007', 'p012', 'p016', 'p017', 'p024', 'p029', 'p033', 'p040', 'p046']) {
    const profil = PROFILS.find((entree) => entree.id === id)!;
    const debut = Date.now();
    const composant = composantDuProfil(profil);
    assert.deepEqual(constatsInterdits(constatsDuProfil(composant)).map((constat) => constat.id), [], id);
    if (profil.forme === 'button-216') assert.ok(Date.now() - debut < 2000, `${id} se construit en moins de 2 s`);
  }
  assert.equal(composantDuProfil(PROFILS.find((p) => p.id === 'p017')!).releve.variants.length, 216);
});

test('les opérateurs rendent les nombres de cas du plan : 96 S, 45 G, 47 O, 52 F, 36 M, 18 Y', () => {
  const attendus: Record<string, number> = {
    S1: 80, S2: 8, S3: 8, G1: 28, G2: 8, G3: 9, O1: 12, O2: 6, O3: 6, O4: 12, O5: 5, O6: 6,
    F1: 8, F2: 4, F3: 22, F4: 6, F5: 6, F6: 4, F7: 2, M1: 4, M2: 3, M3: 4, M4: 7, M5: 12, M6: 4, M7: 2, Y1: 14, Y2: 4,
  };
  for (const [operateur, nombre] of Object.entries(attendus)) assert.equal(duOperateur(operateur).length, nombre, operateur);
  assert.deepEqual(GENERATEURS.map((generer) => generer(base, 7107).length), [96, 45, 47, 52, 36, 18]);
  assert.equal(TOUS.length, 294);
});

test('chaque cas a un identifiant <opérateur>-<n>, une description qui commence par l\'opérateur et un verdict cohérent', () => {
  assert.equal(new Set(TOUS.map((entree) => entree.id)).size, TOUS.length);
  for (const operateur of new Set(TOUS.map((entree) => entree.operateur))) {
    duOperateur(operateur).forEach((entree, rang) => assert.equal(entree.id, `${operateur}-${rang + 1}`));
  }
  for (const entree of TOUS) {
    assert.equal(entree.famille, 'F7');
    assert.ok(entree.entree.description.startsWith(`${entree.operateur} :`), entree.id);
    assert.equal(entree.verdict === 'mesure', entree.question !== undefined, entree.id);
    assert.deepEqual(entree.codesJuges, ['C49', 'C50', 'C51', 'C52']);
  }
});

test('les cas qui dépendent d\'une question non confirmée portent le verdict mesure et son identifiant', () => {
  const parQuestion: Record<string, string[]> = {};
  for (const entree of TOUS.filter((autre) => autre.verdict === 'mesure')) (parQuestion[entree.question!] ??= []).push(entree.id);
  assert.deepEqual(parQuestion, {
    'Q-F7-10': ['G3-9'],
  });
});

test('S : une paire juste sous le seuil donne un constat au rapport tronqué, une paire juste au-dessus aucun', () => {
  // Texte AA sur blanc : #7C7290 (4,500000635) passe, #9A6C5A (4,499999851) échoue et s'affiche 4,49.
  assert.deepEqual(cas('S1-1').attendus, []);
  assert.deepEqual(cas('S1-2').attendus.map(({ code, cle, rapport, seuil, niveau, type, premierPlan, fond, variants }) => ({ code, cle, rapport, seuil, niveau, type, premierPlan, fond, variants })),
    [{ code: 'C49', cle: 'texte|Texte||', rapport: 4.49, seuil: 4.5, niveau: 'AA', type: 'corriger', premierPlan: '#9A6C5A', fond: '#FFFFFF', variants: [cible] }]);
  // Les dix lignes de S1 ont huit paires chacune ; la ligne AAA du contour attend 3, la ligne de l'anneau le code C50.
  assert.equal(duOperateur('S1').filter((c) => c.attendus.length > 0).length, 40);
  assert.deepEqual([cas('S1-50').attendus[0].cle, cas('S1-50').attendus[0].seuil], ['stroke|Contour||', 3]);
  assert.deepEqual([cas('S1-74').attendus[0].code, cas('S1-74').attendus[0].cle], ['C50', 'anneau|Ring||']);
  // S2 : #777777 en texte AA (4,4781), #5A5A5A en texte AAA (6,8969) et #959595 en grand texte et en icône (2,9953) échouent seuls.
  assert.deepEqual(duOperateur('S2').map((c) => c.attendus.length), [0, 1, 0, 1, 0, 1, 0, 1]);
  assert.deepEqual([cas('S2-2').attendus[0].rapport, cas('S2-4').attendus[0].rapport, cas('S2-6').attendus[0].rapport], [4.47, 6.89, 2.99]);
  // S3 : 5,0:1 échoue en texte AAA seul, 3,9:1 en grand texte AAA seul.
  assert.deepEqual(duOperateur('S3').map((c) => c.attendus.map((a) => `${a.cle}@${a.niveau}`)), [[], ['texte|Texte||@AAA'], [], ['grand-texte|Texte||@AAA'], [], [], [], []]);
});

test('G : la classe du texte suit 14 pt = 56/3 px, la taille minimale suit la frontière 11,99 / 12', () => {
  const seuilDe = (id: string): number | undefined => cas(id).attendus[0]?.seuil;
  // G1 : 18,65 à 700 est un petit texte (seuil 4,5) ; 18,67 à 700 un grand texte (aucun constat) ; 18,66 à 700 attend le seuil 4,5 en attente de Q-F7-3.
  assert.deepEqual([seuilDe('G1-3'), seuilDe('G1-19'), seuilDe('G1-7'), seuilDe('G1-25')], [4.5, undefined, 4.5, undefined]);
  assert.equal(cas('G1-7').verdict, 'attendu');
  assert.equal(cas('G1-6').verdict, 'attendu');
  // G2 : 4,0:1 échoue partout en AAA, au seuil 7 pour un texte et 4,5 pour un grand texte.
  assert.deepEqual(duOperateur('G2').map((c) => c.attendus[0].seuil), [7, 7, 7, 4.5, 7, 4.5, 4.5, 4.5]);
  assert.deepEqual(duOperateur('G2').map((c) => c.attendus[0].niveau), Array(8).fill('AAA'));
  // G3 : huit, dix, onze, 11,99 et zéro sont sous 12 px ; 12 et 12,01 ne le sont pas.
  assert.deepEqual(duOperateur('G3').map((c) => c.attendus.map((a) => a.cle)), [
    ['taille|Texte|8'], ['taille|Texte|10'], ['taille|Texte|11'], ['taille|Texte|11.99'], [], [], ['taille|Texte|0'], ['taille|Texte|11'], ['taille|Texte|11'],
  ]);
  assert.equal(cas('G3-9').question, 'Q-F7-10');
});

test('O : l\'alpha effectif compose le texte, une pile s\'arrête à l\'opaque, un fond translucide se mesure sur la page et la carte', () => {
  // O1 : noir à 50 % de chaque côté, soit 12,5 % d'alpha effectif, donne un gris clair sur blanc ; les quatre alphas nuls n'attendent rien.
  assert.deepEqual(cas('O1-1').attendus, []);
  assert.equal(cas('O1-8').attendus[0].premierPlan, '#DFDFDF');
  assert.deepEqual(duOperateur('O1').slice(8).map((c) => c.attendus.length), [0, 0, 0, 0]);
  // O2 : la peinture opaque coupe la pile ; la peinture masquée n'y entre pas.
  assert.equal(cas('O2-3').attendus[0].premierPlan, '#858585');
  assert.equal(cas('O2-5').attendus[0].premierPlan, '#B6B6B6');
  // O4 : un fond d'alpha 0 est la page elle-même, en mode Dark ; la page Figma garde ses constats nommés `page-figma` et l'information de repli.
  assert.deepEqual(cas('O4-4').attendus.map((a) => [a.cle, a.fond, a.premierPlan]), [['texte|Texte||page', '#0B1020', '#000000'], ['texte|Texte||carte', '#131A2E', '#000000']]);
  assert.deepEqual(cas('O4-8').attendus.map((a) => a.cle), ['texte|Texte||page-figma', 'fond-de-repli']);
  assert.deepEqual(['O4-10', 'O4-11'].map((id) => cas(id).attendus.map((a) => a.cle)), Array(2).fill(['limite:fond-indetermine|stroke|Root|', 'limite:fond-indetermine|texte|Texte|']));
  assert.deepEqual(cas('O4-9').attendus.map((a) => a.cle), ['limite:fond-indetermine|stroke|Root|', 'limite:fond-indetermine|texte|Texte|']);
  // O5 : le texte noir sous un parent à 50 % se mesure à l'alpha 0,5 ; le parent à 0 n'attend rien.
  assert.equal(cas('O5-1').attendus[0].premierPlan, '#808080');
  assert.deepEqual(cas('O5-4').attendus, []);
});

test('F : un dégradé, une image ou un mode de fusion rend une limite sans verdict ; un fond lisible rend le verdict normal', () => {
  assert.deepEqual(duOperateur('F1').map((c) => c.attendus.map((a) => a.cle)), Array(8).fill(['limite:degrade|texte|Texte|']));
  assert.deepEqual(duOperateur('F2').map((c) => c.attendus.map((a) => a.cle)), Array(4).fill(['limite:image|texte|Texte|']));
  const limites = duOperateur('F3').map((c) => c.attendus[0].cle === 'limite:peinture-superposee|texte|Texte|');
  assert.equal(limites.filter(Boolean).length, 19);
  assert.deepEqual([cas('F3-1').attendus[0].cle, cas('F3-2').attendus[0].cle, cas('F3-4').attendus[0].cle], ['texte|Texte||', 'texte|Texte||', 'limite:peinture-superposee|texte|Texte|']);
  assert.equal(cas('F3-22').attendus[0].cle, 'texte|Texte||');
  assert.deepEqual(duOperateur('F4').map((c) => c.attendus[0].cle.startsWith('limite:')), [true, true, false, false, false, true]);
  assert.deepEqual(duOperateur('F5').map((c) => c.attendus.length), [0, 0, 0, 0, 1, 1]);
  assert.deepEqual(cas('F6-2').attendus.map((a) => a.cle), ['limite:fond-indetermine|texte|Texte|', 'fond-de-repli']);
  assert.deepEqual([cas('F7-1').attendus[0].cle, cas('F7-2').attendus[0].cle], ['limite:peinture-superposee|texte|Texte|', 'limite:couleur-absente|texte|Texte|']);
});

test('M : une étiquette par combinaison de modes, 24 combinaisons pour 2, 3 et 4 modes, dix renvois au plus', () => {
  const m1 = cas('M1-1').attendus[0];
  assert.deepEqual([m1.mode, m1.autresModes, m1.rapports?.length, m1.type], ['theme en Light', 0, 2, 'corriger']);
  assert.deepEqual(duOperateur('M1').map((c) => c.attendus.length), [1, 1, 1, 0]);
  assert.deepEqual(cas('M1-3').attendus[0].autresModes, 1);
  // M2 : le mode effectif ouvre la liste des rapports, et le pire mode reste Light.
  assert.deepEqual(cas('M2-1').attendus[0].rapports?.map(([etiquette]) => etiquette), ['theme en Dark', 'theme en Light']);
  assert.deepEqual(cas('M2-2').attendus[0].rapports?.map(([etiquette]) => etiquette), ['theme en Light', 'theme en Dark']);
  assert.equal(cas('M2-1').attendus[0].mode, 'theme en Light');
  // M3 : 6, 24, 2 et 4 combinaisons.
  assert.deepEqual(duOperateur('M3').map((c) => c.attendus[0].rapports?.length), [6, 24, 2, 4]);
  // M4 : lisible jusqu'à 10 renvois, limite au-delà et pour les cycles.
  assert.deepEqual(duOperateur('M4').map((c) => c.attendus[0].cle), [
    'texte|Texte||', 'texte|Texte||', 'texte|Texte||', ...Array(4).fill('limite:mode-illisible|texte|Texte|'),
  ]);
  // M5 : huit limites `mode-illisible`, puis quatre limites `couleur-hors-gamut` (Q-F7-5).
  assert.deepEqual(duOperateur('M5').map((c) => c.attendus[0].cle.split('|')[0]), [...Array(8).fill('limite:mode-illisible'), ...Array(4).fill('limite:couleur-hors-gamut')]);
  // M6 : la proposition mesure les deux modes du thème, donc la page et la carte échouent en Dark ; avec un mode, rien.
  assert.deepEqual(duOperateur('M6').map((c) => c.attendus.map((a) => a.cle)), [
    ['texte|Texte||page', 'texte|Texte||carte'], [], ['texte|Texte||page', 'texte|Texte||carte'], ['texte|Texte||page', 'texte|Texte||carte'],
  ]);
  assert.deepEqual(duOperateur('M7').map((c) => c.attendus[0].cle), ['texte|Texte||', 'limite:mode-illisible|texte|Texte|']);
});

test('Y : la garantie nomme la page et la carte pour six des sept variables ; hors du thème et non reconnue, tout est à vérifier', () => {
  const types = (id: string): string => [...new Set(cas(id).attendus.map((a) => a.type))].join();
  assert.deepEqual(duOperateur('Y1').slice(0, 7).map((c) => types(c.id)), ['verifier', 'corriger', 'corriger', 'corriger', 'corriger', 'corriger', 'corriger']);
  assert.deepEqual(cas('Y1-1').attendus.map((a) => [a.cle, a.variableDuTheme]), [['texte|Texte||page', 'solid/foreground'], ['texte|Texte||carte', 'solid/foreground']]);
  assert.deepEqual([types('Y1-8'), types('Y1-9'), cas('Y1-8').attendus[0].variableDuTheme, cas('Y1-9').attendus[0].variableDuTheme], ['verifier', 'verifier', '', '']);
  // Q-F7-7 : le seuil ou le niveau que la garantie ne vise pas se vérifie.
  assert.deepEqual(duOperateur('Y1').slice(9).map((c) => [types(c.id), c.attendus[0].seuil, c.attendus[0].niveau]), [
    ['verifier', 4.5, 'AA'], ['verifier', 4.5, 'AA'], ['verifier', 4.5, 'AA'], ['verifier', 4.5, 'AA'], ['verifier', 7, 'AAA'],
  ]);
  // Y2 : la variable du thème vient de la liaison du champ mesuré, la première de la liste.
  assert.deepEqual(duOperateur('Y2').map((c) => [c.attendus[0].variableDuTheme, c.attendus[0].type]), [
    ['surface/border', 'corriger'], ['surface/foreground', 'corriger'], ['surface/foreground', 'corriger'], ['surface/border', 'corriger'],
  ]);
});

test('deux repères de WCAG passent par le kit : #767676 sur blanc passe, #777777 échoue', () => {
  for (const [id, attendus] of [['S2-1', 0], ['S2-2', 1]] as const) {
    const { composant } = cas(id).entree.materialiser();
    const emis = controlerLAccessibilite(composant.releve, composant.catalogue, { niveau: 'AA' });
    const resultat = comparer(cas(id), emis, cleDeConstat);
    assert.deepEqual([resultat.attendus, resultat.ecarts], [attendus, []], id);
  }
});

test('dégrader puis annuler redonne la base, pour un cas sur dix et le premier de chaque opérateur', () => {
  const echantillon = TOUS.filter((entree, rang) => rang % 10 === 0 || entree.id.endsWith('-1'));
  assert.ok(echantillon.length > 50);
  for (const entree of echantillon) {
    const copie = entree.entree.materialiser();
    assert.notEqual(copie.composant, base, entree.id);
    copie.annuler();
    assert.equal(JSON.stringify({ releve: copie.composant.releve, catalogue: copie.composant.catalogue }), baseAvant, entree.id);
  }
  assert.equal(JSON.stringify({ releve: base.releve, catalogue: base.catalogue }), baseAvant);
});

test('la dégradation de M2-3 supprime le mode effectif et l\'annulation le remet à sa place', () => {
  const copie = cas('M2-3').entree.materialiser();
  assert.equal(Object.keys(copie.composant.releve.variants[0].modesEffectifs).includes('col-theme'), false);
  copie.annuler();
  assert.deepEqual(Object.keys(copie.composant.releve.variants[0].modesEffectifs), Object.keys(base.releve.variants[0].modesEffectifs));
});

test('une même graine rend les mêmes cas, et un autre composant de la même spec les mêmes oracles', () => {
  const autre = tousLesCas(composantDeContraste(PROFIL_P0, 7107), 7107);
  assert.deepEqual(autre.map((c) => [c.id, c.attendus]), TOUS.map((c) => [c.id, c.attendus]));
});

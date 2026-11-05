/**
 * Garde les opérateurs L, S, Y, X, E et Q du harnais de stress F2, ses 85 faux positifs et ses relations métamorphiques : les
 * nombres de cas contre la section 3.3 et la section 4 du plan, la forme des cas, les cas `mesure` et leur question, un oracle
 * écrit à la main par opérateur et la cohérence de chaque dégradation (dégrader puis annuler redonne le thème de base). Il garde aussi
 * les 24 interactions déclarées (8 couples sur 3 profils). Le test ne mesure pas le kit : un écart du kit sur ces cas est un résultat de `mesurer.ts`, pas un échec d'ici.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { isDeepStrictEqual } from 'node:util';
import type { Constat } from '../src/controles/index.js';
import { identifiantsEnDouble, type CasDeStructure } from './stress/f2-structure/cas.js';
import { fauxPositifs } from './stress/f2-structure/fauxPositifs.js';
import { COUPLES, interactions } from './stress/f2-structure/interactions.js';
import { autreCasse, catalogueEnAutreCasse, catalogueMelange, verifierLesRelations } from './stress/f2-structure/metamorphiques.js';
import { GENERATEURS } from './stress/f2-structure/operateurs.js';
import { GRAINE_PAR_DEFAUT, PROFIL_P0, PROFILS_DE_THEME, themeDuProfil } from './stress/f2-structure/themeUcm.js';

const base = themeDuProfil(PROFIL_P0);
const baseAvant = JSON.stringify(base);
/** Les cinq derniers générateurs ; les trois premiers (172 cas) sont gardés par `stressStructureOperateurs.test.ts`, et les 426 cas par `mesurer.ts`. */
const AUTRES = GENERATEURS.slice(3).flatMap((generer) => generer(base, GRAINE_PAR_DEFAUT));
const FAUX_POSITIFS = fauxPositifs(base);
const cas = (id: string): CasDeStructure => [...AUTRES, ...FAUX_POSITIFS].find((entree) => entree.id === id)!;
const duOperateur = (operateur: string) => AUTRES.filter((entree) => entree.operateur === operateur);
const cles = (entree: CasDeStructure) => entree.attendus.map((attendu) => `${attendu.code}|${attendu.cle}`);

test('les opérateurs rendent les nombres de cas de la section 3.3 du plan : 48 L, 43 S, 63 Y, 13 E, 67 Q, 20 X, soit 254 et 426 avec R, K et M', () => {
  const attendus: Record<string, number> = {
    L1: 18, L2: 10, L3: 6, L4: 9, L5: 5, S1: 24, S1b: 4, S1c: 4, S2: 11, Y1: 26, Y2: 7, Y3: 12, Y4: 18,
    E1: 10, E2: 3, Q1: 55, Q2: 8, Q3: 4, X1: 4, X2: 4, X3: 3, X5: 1, X6: 8,
  };
  for (const [operateur, nombre] of Object.entries(attendus)) assert.equal(duOperateur(operateur).length, nombre, operateur);
  const parLettre = (lettre: string) => AUTRES.filter((entree) => entree.operateur.startsWith(lettre)).length;
  assert.deepEqual(['L', 'S', 'Y', 'E', 'Q', 'X'].map(parLettre), [48, 43, 63, 13, 67, 20]);
  assert.equal(AUTRES.length, 254);
  assert.equal(AUTRES.length + 172, 426);
  assert.equal(GENERATEURS.length, 8);
});

test('chaque cas a un identifiant <opérateur>-<n>, une description, des zones, un verdict cohérent et un oracle bien formé', () => {
  assert.equal(new Set(AUTRES.map((entree) => entree.id)).size, AUTRES.length);
  for (const operateur of new Set(AUTRES.map((entree) => entree.operateur))) {
    duOperateur(operateur).forEach((entree, rang) => assert.equal(entree.id, `${operateur}-${rang + 1}`));
  }
  for (const entree of AUTRES) {
    assert.equal(entree.famille, 'F2');
    assert.ok(entree.entree.description.startsWith(entree.operateur), entree.id);
    assert.ok(entree.entree.zones.length > 0, entree.id);
    assert.equal(entree.verdict === 'mesure', entree.question !== undefined, entree.id);
    for (const attendu of entree.attendus) {
      assert.ok(/^C(60|63|82)$/.test(attendu.code), `${entree.id} ${attendu.code}`);
      assert.equal(attendu.cle.split('|').length >= 3, true, `${entree.id} ${attendu.cle}`);
      if (attendu.forme === 'correction') assert.ok(attendu.apres?.cle ?? attendu.apres?.nom !== undefined, `${entree.id} sans cible`);
    }
    for (const detail of entree.details ?? []) assert.ok(cles(entree).includes(detail.pour), `${entree.id} ${detail.pour}`);
    for (const verification of entree.verifications ?? []) assert.ok(cles(entree).includes(verification.pour), `${entree.id} ${verification.pour}`);
  }
});

test('les cas qui dépendent d\'une question non confirmée portent le verdict mesure et son identifiant', () => {
  const mesures = AUTRES.filter((entree) => entree.verdict === 'mesure').map((entree) => [entree.id, entree.question]);
  assert.deepEqual(mesures, [
    ['L4-9', 'Q-F2-sans-numero'],
    ['Y4-3', 'Q-F2-sans-numero'], ['Y4-6', 'Q-F2-sans-numero'], ['Y4-9', 'Q-F2-sans-numero'], ['Y4-12', 'Q-F2-sans-numero'], ['Y4-15', 'Q-F2-sans-numero'],
    ['Y4-16', 'Q-F2-sans-numero'], ['Y4-17', 'Q-F2-sans-numero'], ['Y4-18', 'Q-F2-sans-numero'],
  ]);
});

test('L1 à L5 : alias-supprime sans correction, library-inactive avec le nom de la library, sans-valeur-en-mode, couleur-sans-alias', () => {
  // L1 : les neuf variables (4 de theme, 2 de brands, 2 de utility, 1 de components), un mode puis tous. Une cible dans une collection absente pour les couches à un seul mode.
  assert.deepEqual(cles(cas('L1-1')), ['C63|alias-supprime|primary/solid/default|light']);
  assert.deepEqual(cles(cas('L1-2')), ['C63|alias-supprime|primary/solid/default|light', 'C63|alias-supprime|primary/solid/default|dark']);
  assert.deepEqual(cles(cas('L1-10')), ['C63|alias-supprime|primary/light/700|Marque A', 'C63|alias-supprime|primary/light/700|Marque B']);
  assert.deepEqual(cles(cas('L1-18')), ['C63|alias-supprime|button/color/primary/background|Mode 1']);
  assert.deepEqual(cas('L1-18').entree.theme.catalogue.variables.find((v) => v.cle === 'components|button/color/primary/background')?.valeurs, { 'm-components': { alias: 'collection-absente|couleur' } });
  assert.ok(duOperateur('L1').every((entree) => entree.hypothese === 'H3' && entree.attendus.every((attendu) => attendu.forme === 'a-faire')));
  // La voisine citée doit avoir le même rôle dans une autre palette : une voisine du même dossier est un écart.
  const verification = cas('L1-1').verifications![0].verifier;
  const constat = (voisine: string): Constat => ({ id: 'x', code: 'C63', type: 'verifier', famille: 'liaisons', variants: [], layers: [], faits: { genre: 'alias-supprime', voisine } });
  assert.equal(verification(constat('secondary/solid/default')), undefined);
  assert.match(verification(constat('primary/surface/default'))!, /n'a pas le même rôle/);
  assert.equal(verification({ ...constat(''), faits: { genre: 'alias-supprime' } }), undefined);

  // L2 : la library est choisie pour les huit premiers cas ; les deux derniers n'en ont pas et attendent l'information `cible-inaccessible` (Q-F2-8).
  const l2 = duOperateur('L2');
  assert.deepEqual(l2.map((entree) => entree.entree.theme.catalogue.library?.nom ?? null), [...Array(8).fill('Bibliothèque des marques'), null, null]);
  assert.equal(l2[0].attendus.length, 5);
  assert.ok(l2[0].attendus.every((attendu) => attendu.code === 'C63' && attendu.cle.startsWith('library-inactive|') && attendu.cle.endsWith('|light')));
  assert.equal(l2[0].entree.theme.catalogue.variables.find((v) => v.cle === 'brands|primary/light/700')?.etat, 'inaccessible');
  assert.equal(l2[1].entree.theme.catalogue.collections.find((c) => c.cle === 'lib-inaccessible')?.etat, 'inaccessible');
  // L3 : une rampe de library. Le cran déplacé et le rôle retiré n'ont pas de correction, le scope posé n'a aucun constat.
  const l3 = duOperateur('L3');
  assert.deepEqual(l3.map((entree) => entree.attendus.length), [1, 1, 1, 1, 0, 0]);
  assert.equal(cas('L3-1').attendus[0].cle, 'cran|primary/solid/default|light');
  assert.equal(cas('L3-3').attendus[0].cle, 'variable-absente|primary/surface/subtle||cible-de-library');
  assert.equal(cas('L3-1').entree.theme.catalogue.variables.find((v) => v.cle === 'brands|primary/dark/300')?.distante, true);
  assert.deepEqual(cas('L3-5').entree.theme.catalogue.variables.find((v) => v.cle === 'brands|primary/light/500')?.scopes, ['ALL_SCOPES']);
  // L4 : huit variables de couches différentes, puis des valeurs absentes.
  assert.equal(duOperateur('L4').length, 9);
  assert.deepEqual(cles(cas('L4-1')), ['C63|sans-valeur-en-mode|color/primary/light/500|Mode 1']);
  assert.deepEqual(cles(cas('L4-5')), ['C63|sans-valeur-en-mode|primary/solid/default|light']);
  assert.equal(cas('L4-9').entree.theme.catalogue.variables.find((v) => v.cle === 'layout|sizing/5')?.valeurs, undefined);
  // L5 : le mode ajouté à components, les formes Colors et Colour, puis le nom sans segment de famille.
  assert.deepEqual(cles(cas('L5-2')), ['C63|couleur-sans-alias|button/color/primary/background|Mode 1', 'C63|couleur-sans-alias|button/color/primary/background|Mode 2']);
  assert.deepEqual(cles(cas('L5-3')), ['C63|couleur-sans-alias|button/Colors/primary/background|Mode 1']);
  assert.deepEqual(cles(cas('L5-4')), ['C63|couleur-sans-alias|button/Colour/primary/background|Mode 1']);
  assert.deepEqual(cles(cas('L5-5')), []);
});

test('S1 à S2 : les scopes du support par rôle, un retrait sur une couche sans portée, aucun constat pour la variable distante', () => {
  const s1 = duOperateur('S1');
  assert.equal(new Set(s1.map((entree) => entree.attendus[0].cle)).size, 24);
  // S1-1 pose ALL_SCOPES sur primary solid/default : le support d'un fond est FRAME_FILL et SHAPE_FILL.
  assert.equal(cas('S1-1').attendus[0].cle, '-|primary/solid/default|');
  assert.equal(cas('S1-1').attendus[0].apres?.nom, 'FRAME_FILL,SHAPE_FILL');
  assert.equal(cas('S1-1').details![0].avant, 'ALL_SCOPES');
  // S1-4 pose sur solid/foreground un scope hors de son support (le texte est TEXT_FILL, SHAPE_FILL, STROKE_COLOR).
  assert.equal(cas('S1-4').attendus[0].apres?.nom, 'SHAPE_FILL,STROKE_COLOR,TEXT_FILL');
  assert.equal(cas('S1-4').details![0].avant, 'FRAME_FILL');
  assert.ok(s1.slice(-9).every((entree) => entree.attendus[0].forme === 'correction'));
  assert.match(cas('S1-24').entree.description, /elevation\/raised/);
  assert.deepEqual(duOperateur('S1b').map((entree) => entree.details![0].avant), ['', '', '', '']);
  assert.deepEqual(duOperateur('S1c').map((entree) => entree.details![0].avant!.split(',').length), [3, 2, 2, 4]);
  // S2 : neuf couleurs de primitives, brands et utility, une variable FLOAT, une variable distante.
  assert.deepEqual(duOperateur('S2').map((entree) => entree.attendus.length), [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0]);
  assert.equal(cas('S2-1').attendus[0].cle, 'scopes|color/primary/light/500|');
  assert.equal(cas('S2-1').attendus[0].apres?.nom, '');
  assert.equal(cas('S2-10').entree.theme.catalogue.variables.find((v) => v.cle === 'primitives|spacing/base')?.type, 'FLOAT');
  assert.equal(cas('S2-11').entree.theme.catalogue.variables.find((v) => v.cle === 'brands|primary/light/400')?.distante, true);
});

test('Y1 à Y4 : la couche visée, la valeur directe, le type et le rangement, avec le plan corrigé de 19 à 20 paires interdites', () => {
  const y1 = duOperateur('Y1');
  assert.equal(y1.filter((entree) => entree.attendus.length === 0).length, 6);
  assert.equal(y1.filter((entree) => /admis/.test(entree.entree.description) && !/interdit/.test(entree.entree.description)).length, 5);
  assert.deepEqual(cles(cas('Y1-1')), ['C82|couche|sonde-y1|light', 'C82|couche|sonde-y1|dark']);
  assert.deepEqual(cles(cas('Y1-2')), []);
  assert.deepEqual(cles(cas('Y1-26')), []);
  assert.deepEqual(cles(cas('Y2-1')), ['C82|valeur-directe|sonde-y2|light']);
  assert.deepEqual(cles(cas('Y2-2')), ['C82|valeur-directe|sonde-y2|light', 'C82|valeur-directe|sonde-y2|dark']);
  assert.deepEqual(cles(cas('Y2-7')), []);
  assert.deepEqual(duOperateur('Y3').flatMap((entree) => entree.entree.touchees).length, 12);
  assert.deepEqual(cles(cas('Y3-1')), ['C82|type|primary/solid/default|']);
  assert.equal(cas('Y3-1').entree.theme.catalogue.variables.find((v) => v.cle === 'theme|primary/solid/default')?.type, 'FLOAT');
  assert.deepEqual(cles(cas('Y4-1')), ['C82|mal-rangee|primary/solid/default|']);
  assert.deepEqual(duOperateur('Y4').filter((entree) => entree.verdict === 'mesure').map((entree) => entree.attendus[0].cle.split('|')[1]),
    [...Array(5).fill('primary/ring'), 'color/primary/solid/default', 'color/primary/surface/border', 'color/neutral/page/divider']);
  assert.ok(cas('Y4-13').entree.theme.catalogue.collections.some((collection) => collection.cle === 'typography'));
});

test('X1 à X6 : deux collections theme, un rôle en double, des variables illisibles, un fichier libre, des entrées malformées', () => {
  const themes = (id: string) => cas(id).entree.theme.catalogue.collections.filter((collection) => collection.role === 'theme').length;
  assert.deepEqual(['X1-1', 'X1-2', 'X1-3', 'X1-4'].map(themes), [2, 2, 2, 1]);
  assert.deepEqual(cles(cas('X1-1')), ['C82|theme-en-double|Theme|', 'C82|cran-absent|primary/light/50|']);
  assert.deepEqual(cles(cas('X1-4')), ['C82|theme-en-double|Theme (copy)|']);
  const variablesDe = (id: string, collection: string) => cas(id).entree.theme.catalogue.variables.filter((v) => v.collection === collection).length;
  assert.ok(variablesDe('X1-2', 'theme-3') > 0 && variablesDe('X1-2', 'theme-3') < variablesDe('X1-2', 'theme'));
  assert.equal(variablesDe('X1-1', 'theme-2'), variablesDe('X1-1', 'theme'));
  assert.deepEqual(cas('X1-3').entree.theme.catalogue.collections.find((c) => c.cle === 'theme-4')!.modes.map((m) => m.nom), ['Day', 'Night']);
  // X2 : le second cas décale la copie du rôle de deux crans, et le plan n'attend la correction que pour la première variable (hypothèse 5).
  assert.deepEqual(cles(cas('X2-1')), ['C82|role-en-double|primary/solid/hover|']);
  assert.deepEqual(cles(cas('X2-2')), ['C82|role-en-double|primary/solid/hover|', 'C82|cran|primary/solid/hover|light', 'C82|cran|primary/solid/hover|dark']);
  assert.equal(cas('X2-2').hypothese, 'H5');
  assert.deepEqual(duOperateur('X2').map((entree) => entree.entree.theme.catalogue.variables.filter((v) => v.cle.startsWith('theme|primary/solid/hover')).length), [2, 2, 2, 2]);
  assert.deepEqual(duOperateur('X3').map((entree) => entree.attendus.length), [0, 0, 0]);
  assert.deepEqual(cas('X3-1').entree.theme.catalogue.collections.find((c) => c.cle === 'theme')?.etat, 'inaccessible');
  assert.equal(cas('X3-3').entree.theme.catalogue.variables.filter((v) => v.collection === 'theme').every((v) => v.etat === 'non-chargee'), true);
  assert.ok(cas('X5-1').entree.theme.catalogue.collections.every((collection) => collection.role === null));
  // X6 : huit entrées, et aucun code n'est jugé, donc aucun constat ne compte comme faux.
  assert.ok(duOperateur('X6').every((entree) => entree.attendus.length === 0 && entree.codesJuges?.length === 0));
  assert.equal(duOperateur('X6').length, 8);
  assert.ok(cas('X6-7').entree.theme.catalogue.variables.some((v) => v.nom === 'primary//ring'));
});

test('E1 et E2 : un doublon par valeur partagée dans un mode, avec ses candidats, sans doublon pour icon ni STRING', () => {
  assert.deepEqual(cas('E1-1').attendus.map((a) => [a.cle, a.candidats]), [['doublons|4|Mode 1', ['sizing/1', 'sizing/2']]]);
  assert.deepEqual(cas('E1-2').attendus[0].candidats, ['sizing/1', 'sizing/2', 'sizing/3']);
  assert.deepEqual(cas('E1-3').attendus.map((a) => a.cle), ['doublons|4|Mode 1', 'doublons|12|Mode 1']);
  assert.deepEqual(cas('E1-4').attendus.map((a) => a.cle), ['doublons|4|Mode 1', 'doublons|4|Mode 2']);
  assert.deepEqual(cas('E1-5').attendus.map((a) => a.cle), ['doublons|0|Mode 1']);
  assert.deepEqual(cas('E1-7').attendus.map((a) => a.cle), ['doublons|0.3|Mode 1']);
  assert.deepEqual(cas('E1-8').attendus.map((a) => a.cle), ['doublons|4|Mode 1']);
  assert.deepEqual([cas('E1-9').attendus.length, cas('E1-10').attendus.length], [0, 0]);
  assert.deepEqual(duOperateur('E2').map((entree) => entree.attendus.length), [0, 0, 0]);
  assert.ok(duOperateur('E1').every((entree) => entree.attendus.every((attendu) => attendu.forme === 'question')));
});

test('Q1 à Q3 : une question qui nomme le rôle proche, sans présélection ; le kit n\'a pas ce genre, l\'oracle l\'invente', () => {
  const q1 = duOperateur('Q1');
  assert.equal(q1.length, 55);
  assert.equal(q1.filter((entree) => /dernier segment/.test(entree.entree.description)).length, 45);
  assert.equal(q1.filter((entree) => /dossier/.test(entree.entree.description)).length, 10);
  assert.deepEqual(cles(cas('Q1-1')), ['C82|variable-inconnue|primary/solid/deault|']);
  assert.deepEqual(cles(cas('Q1-2')), ['C82|variable-inconnue|primary/solid/dxfault|']);
  assert.deepEqual(cles(cas('Q1-3')), ['C82|variable-inconnue|primary/solid/dfeault|']);
  assert.equal(cas('Q1-1').attendus[0].forme, 'question');
  assert.deepEqual(cles(cas('Q1-46')), ['C82|variable-inconnue|primary/soid/default|']);
  assert.ok(duOperateur('Q1').every((entree) => entree.hypothese === 'H4' && entree.attendus.length === 1 && entree.verifications!.length === 1));
  // La question doit nommer la variable que la faute remplace, et aucune autre : la vérification lit le nom de ses candidats.
  const verifier = cas('Q1-1').verifications![0].verifier;
  const question = (noms: string[]): Constat => ({
    id: 'x', code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits: {},
    question: { id: 'x', candidats: noms.map((nom) => ({ nom })) },
  });
  assert.equal(verifier(question(['primary/solid/default'])), undefined);
  assert.match(verifier(question(['primary/solid/hover']))!, /ne nomme pas/);
  assert.deepEqual(duOperateur('Q2').map((entree) => cles(entree)[0].split('|')[2]), [
    'primary/surface/outline', 'primary/page/text', 'primary/solid/active', 'primary/solid/hovered',
    'primary/page/separator', 'primary/focus', 'primary/surface/muted', 'primary/surface/bg',
  ]);
  // Q3 (Q-F2-1) : un nom loin de tout rôle ne rend rien.
  assert.equal(duOperateur('Q3').length, 4);
  assert.ok(duOperateur('Q3').every((entree) => entree.attendus.length === 0 && entree.verdict === 'attendu'));
});

test('les 85 faux positifs : 72 profils et 13 thèmes ciblés bien formés, aucun constat attendu', () => {
  assert.equal(FAUX_POSITIFS.length, 85);
  const parOperateur = Object.fromEntries([...new Set(FAUX_POSITIFS.map((entree) => entree.operateur))].map((operateur) => [operateur, FAUX_POSITIFS.filter((entree) => entree.operateur === operateur).length]));
  assert.deepEqual(parOperateur, { A0: 72, A1: 6, A2: 2, A3: 1, A4: 1, A5: 1, A6: 1, A7: 1 });
  assert.equal(new Set(FAUX_POSITIFS.map((entree) => entree.id)).size, 85);
  assert.ok(FAUX_POSITIFS.every((entree) => entree.famille === 'F2' && entree.verdict === 'attendu' && entree.attendus.length === 0 && entree.entree.description.startsWith(entree.operateur)));
  const profils = FAUX_POSITIFS.slice(0, 72);
  assert.deepEqual(profils.map((entree) => entree.entree.theme.profil.id), PROFILS_DE_THEME.map((profil) => profil.id));
  assert.equal(profils[13].entree.theme.profil.id, 'p14');
  assert.ok(profils.every((entree) => entree.entree.zones.length === 0 && isDeepStrictEqual(entree.entree.theme, entree.entree.base)));
  // Chaque catalogue est bien formé : une valeur dans chaque mode de sa collection, et chaque alias vise une variable du catalogue.
  const echantillon = [...profils.filter((_, rang) => rang % 9 === 0), ...FAUX_POSITIFS.slice(72)];
  for (const entree of echantillon) {
    const { collections, variables } = entree.entree.theme.catalogue;
    const cles = new Set(variables.map((variable) => variable.cle));
    for (const variable of variables) {
      const collection = collections.find((entreeDeCollection) => entreeDeCollection.cle === variable.collection);
      assert.ok(collection, `${entree.id} ${variable.cle} sans collection`);
      for (const mode of collection.modes) {
        const valeur = variable.valeurs?.[mode.id];
        assert.ok(valeur, `${entree.id} ${variable.cle} sans valeur en ${mode.nom}`);
        if ('alias' in valeur) assert.ok(cles.has(valeur.alias), `${entree.id} ${variable.cle} vise ${valeur.alias}`);
      }
    }
  }
  // Les thèmes ciblés.
  const ciblesDeLaCollection = (id: string) => cas(id).entree.theme.catalogue.collections.map((collection) => `${collection.cle}:${collection.nom}:${collection.role}`);
  assert.ok(ciblesDeLaCollection('A1-1').includes('theme:Theme:theme'));
  assert.ok(ciblesDeLaCollection('A1-2').includes('theme:themes:null'));
  assert.ok(ciblesDeLaCollection('A1-3').includes('theme:THEME:theme'));
  assert.ok(ciblesDeLaCollection('A1-4').includes('brands:color-brands:brands'));
  assert.ok(ciblesDeLaCollection('A1-5').includes('utility:color-utilities:utility'));
  assert.ok(ciblesDeLaCollection('A1-6').includes('layout:layouts:layout'));
  assert.deepEqual(cas('A2-2').entree.theme.catalogue.collections.find((c) => c.cle === 'theme')!.modes.map((m) => m.nom), ['LIGHT', 'DARK']);
  assert.equal(cas('A3-1').entree.theme.profil.id, 'p03');
  assert.ok(cas('A3-1').entree.theme.catalogue.variables.some((v) => v.nom.startsWith('accent/solid/')));
  assert.ok(cas('A3-1').entree.theme.catalogue.variables.some((v) => v.nom.startsWith('success/soft/solid/')));
  assert.deepEqual(cas('A4-1').entree.theme.catalogue.collections.find((c) => c.cle === 'brands')!.modes.map((m) => m.nom), ['Light', 'Dark']);
  assert.ok(cas('A4-1').entree.theme.catalogue.variables.filter((v) => v.collection === 'brands').every((v) => !/\/(light|dark)\//.test(v.nom)));
  assert.ok(cas('A5-1').entree.theme.catalogue.collections.every((collection) => collection.role === null));
  assert.equal(cas('A6-1').entree.theme.catalogue.collections.find((c) => c.cle === 'layout')!.modes.length, 3);
  assert.ok(cas('A7-1').entree.theme.catalogue.variables.some((v) => v.collection === 'components' && !v.nom.includes('/color/') && 'valeur' in v.valeurs!['m-components']));
});

test('P8 : le changement de casse et le mélange gardent les variables, ne touchent pas le cas, et un identifiant en double est un écart', () => {
  assert.equal(autreCasse('primary/solid/default'), 'Primary/Solid/Default');
  assert.equal(autreCasse('Primary/Solid/Default'), 'primary/solid/default');
  assert.equal(autreCasse('success/soft/foreground-main'), 'Success/Soft/Foreground-Main');
  assert.equal(autreCasse('Colors_x/y'), 'colors_x/y');
  const entree = cas('L4-1');
  const avant = JSON.stringify(entree.entree.theme.catalogue);
  const melange = catalogueMelange(entree, 7102);
  assert.equal(JSON.stringify(entree.entree.theme.catalogue), avant);
  assert.deepEqual(melange.variables.map((v) => v.cle).sort(), entree.entree.theme.catalogue.variables.map((v) => v.cle).sort());
  assert.notDeepEqual(melange.variables.map((v) => v.cle), entree.entree.theme.catalogue.variables.map((v) => v.cle));
  assert.deepEqual(catalogueMelange(entree, 7102).variables.map((v) => v.cle), melange.variables.map((v) => v.cle));
  const recasse = catalogueEnAutreCasse(entree);
  assert.ok(recasse.variables.every((v, rang) => v.cle === entree.entree.theme.catalogue.variables[rang].cle && v.nom !== entree.entree.theme.catalogue.variables[rang].nom));
  assert.equal(JSON.stringify(entree.entree.theme.catalogue), avant);
  // Deux contrôles qui rendent deux fois le même identifiant sont un écart de P8, que le plugin masque en dédoublonnant.
  const constat = (id: string): Constat => ({ id, code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits: {} });
  assert.deepEqual(identifiantsEnDouble([constat('a'), constat('b'), constat('a')]), ['a']);
  assert.deepEqual(identifiantsEnDouble([constat('a'), constat('b')]), []);
  const ecarts = verifierLesRelations(cas('S1-1'), [constat('x'), constat('x')], 7102);
  assert.ok(ecarts.some((ecart) => ecart.relation === 'identifiants' && ecart.detail === 'identifiant émis plusieurs fois : x'));
});

test('dégrader ne touche pas la base, puis annuler redonne le catalogue de la base ; les faux positifs ciblés aussi', () => {
  assert.equal(JSON.stringify(base), baseAvant);
  // `isDeepStrictEqual` plutôt que le texte, car annuler remet une valeur retirée en fin d'objet, ce qui ne change pas le catalogue.
  for (const entree of AUTRES) {
    const { theme, annuler } = entree.entree;
    assert.ok(!isDeepStrictEqual(theme.catalogue, base.catalogue), `${entree.id} ne dégrade rien`);
    annuler();
    assert.ok(isDeepStrictEqual(theme.catalogue, base.catalogue), `${entree.id} : annuler ne redonne pas la base`);
  }
  for (const entree of FAUX_POSITIFS.slice(72)) {
    const { theme, annuler, base: origine } = entree.entree;
    assert.ok(!isDeepStrictEqual(theme.catalogue, origine.catalogue), `${entree.id} ne dégrade rien`);
    annuler();
    assert.ok(isDeepStrictEqual(theme.catalogue, origine.catalogue), `${entree.id} : annuler ne redonne pas la base`);
  }
  assert.equal(JSON.stringify(base), baseAvant);
});

test('les 24 interactions : 8 couples sur P0, p37 et le profil tiré, un identifiant I<n>-<rang du profil>, un verdict attendu', () => {
  const cas24 = interactions();
  assert.equal(cas24.length, 24);
  assert.deepEqual(COUPLES, ['I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7', 'I8']);
  assert.deepEqual(cas24.map((entree) => entree.id), COUPLES.flatMap((couple) => [1, 2, 3].map((rang) => `${couple}-${rang}`)));
  for (const couple of COUPLES) {
    assert.deepEqual(cas24.filter((entree) => entree.operateur === couple).map((entree) => entree.entree.theme.profil.id), ['p14', 'p37', 'p24'], couple);
  }
  for (const entree of cas24) {
    assert.equal(entree.famille, 'F2');
    assert.equal(entree.verdict, 'attendu');
    assert.ok(entree.entree.description.startsWith(entree.operateur), entree.id);
    assert.ok(entree.entree.zones.length > 0, entree.id);
    assert.ok(entree.attendus.length > 0, `${entree.id} sans oracle`);
    for (const detail of entree.details ?? []) assert.ok(cles(entree).includes(detail.pour), `${entree.id} ${detail.pour}`);
  }
  assert.deepEqual(new Set(cas24.map((entree) => entree.id)).size, 24);
});

test('chaque couple d’interactions rend son oracle propre, écrit à la main', () => {
  const toutes = interactions();
  const couple = (id: string) => toutes.find((entree) => entree.id === id)!;
  // I1 : le rôle retiré et le cran qu'il visait donnent `cran-absent` de la rampe, jamais la création du rôle ; le chemin suit l'écriture du profil.
  assert.deepEqual(cles(couple('I1-1')), ['C82|cran-absent|primary/light/800|']);
  assert.deepEqual(cles(couple('I1-2')), ['C82|cran-absent|Primary/Light/600|']);
  assert.deepEqual(cles(couple('I1-3')), ['C82|cran-absent|neutral/light/800|'], 'les rampes de brands du profil tiré sont distantes : la palette de travail est neutral');
  assert.equal(couple('I1-1').entree.theme.catalogue.variables.some((v) => v.cle === 'brands|primary/light/800'), false);
  assert.equal(couple('I1-1').entree.theme.catalogue.variables.some((v) => v.cle === 'theme|primary/solid/hover'), false);
  // I2 : une question qui nomme le rôle retiré, aucune création de ce rôle, la création exacte du voisin dont le nom a pris la faute.
  assert.deepEqual(cles(couple('I2-1')), ['C82|variable-inconnue|primary/surface/hoer|', 'C82|variable-absente|primary/surface/pressed|']);
  assert.ok(!cles(couple('I2-1')).some((cle) => cle.includes('variable-absente|primary/surface/hover')));
  const verification = couple('I2-1').verifications![0].verifier;
  const question = (nom: string): Constat => ({
    id: 'x', code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits: {}, question: { id: 'x', candidats: [{ nom }] },
  });
  assert.equal(verification(question('primary/surface/hover')), undefined);
  assert.match(verification(question('primary/surface/pressed'))!, /ne nomme pas primary\/surface\/hover/);
  // I3 : deux corrections de cran vers la cible de la carte, une par rôle déplacé.
  assert.deepEqual(cles(couple('I3-2')), ['C82|cran|Primary/Solid/Default|Light', 'C82|cran|Primary/Solid/Hover|Light']);
  assert.equal(couple('I3-2').details!.length, 2);
  // I4 : l'alias dont la cible est supprimée ne donne que `alias-supprime`.
  assert.deepEqual(cles(couple('I4-1')), ['C63|alias-supprime|primary/solid/pressed|light']);
  assert.equal(couple('I4-1').entree.theme.catalogue.variables.some((v) => v.cle === 'brands|primary/light/950'), false);
  // I5 : un seul constat C60 avec la correction vers la branche Light au cran de la table, pas de `cran` de C82.
  assert.deepEqual(cles(couple('I5-1')), ['C60|-|primary/solid/default|light']);
  assert.equal(couple('I5-1').attendus[0].apres?.cle, 'brands|primary/light/700');
  assert.deepEqual(couple('I5-1').entree.theme.catalogue.collections.find((c) => c.cle === 'brands')!.modes.map((m) => m.nom), ['light', 'dark']);
  // I6 : la valeur directe et les scopes faux, sur la même variable.
  assert.deepEqual(cles(couple('I6-1')), ['C82|valeur-directe|primary/surface/border|light', 'C63|-|primary/surface/border|']);
  assert.equal(couple('I6-1').details![0].avant, 'ALL_SCOPES');
  // I7 : la couche seule, même quand le cran avait aussi bougé.
  assert.deepEqual(cles(couple('I7-1')), ['C82|couche|primary/surface/default|light']);
  // I8 : la rampe est de library sur tous les profils, et le rôle retiré garde la raison sans correction.
  assert.deepEqual(cles(couple('I8-1')), ['C82|variable-absente|primary/surface/subtle||cible-de-library']);
  for (const id of ['I8-1', 'I8-2', 'I8-3']) {
    const { catalogue } = couple(id).entree.theme;
    assert.equal(catalogue.library?.nom, 'Bibliothèque des marques', id);
    assert.ok(catalogue.variables.filter((v) => v.collection === 'brands' && /primary\/(light|dark)\//i.test(v.nom)).every((v) => v.distante === true), id);
  }
});

test('dégrader une interaction ne touche pas la base, puis annuler redonne le catalogue de la base', () => {
  for (const entree of interactions()) {
    const { theme, annuler, base: origine } = entree.entree;
    assert.ok(!isDeepStrictEqual(theme.catalogue, origine.catalogue), `${entree.id} ne dégrade rien`);
    annuler();
    assert.ok(isDeepStrictEqual(theme.catalogue, origine.catalogue), `${entree.id} : annuler ne redonne pas la base`);
  }
});

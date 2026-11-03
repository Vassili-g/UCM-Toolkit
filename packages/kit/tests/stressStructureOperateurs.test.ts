/**
 * Garde les opérateurs R, K et M du harnais de stress F2. Il garde leurs nombres de cas contre la section 3.3 du plan, la forme des
 * cas, les cas `mesure` et leur question, un échantillon d'oracles écrits à la main, et la cohérence de chaque dégradation
 * (dégrader puis annuler redonne le thème de base). Le test ne mesure pas le kit. Un écart du kit sur ces cas est un résultat de
 * `mesurer.ts`, pas un échec d'ici.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { isDeepStrictEqual } from 'node:util';
import type { Constat } from '../src/controles/index.js';
import { comparer } from './stress/commun/comparer.js';
import {
  cleAttendue, cleDeConstat, constatsDeStructure, constatsDuCas, verifierLesDetails, type CasDeStructure,
} from './stress/f2-structure/cas.js';
import { GENERATEURS, tousLesCas } from './stress/f2-structure/operateurs.js';
import { PROFIL_P0, themeDuProfil } from './stress/f2-structure/themeUcm.js';

const base = themeDuProfil(PROFIL_P0);
const baseAvant = JSON.stringify(base);
const TOUS = tousLesCas(base);
const cas = (id: string): CasDeStructure => TOUS.find((entree) => entree.id === id)!;
const duOperateur = (operateur: string) => TOUS.filter((entree) => entree.operateur === operateur);
const cles = (entree: CasDeStructure) => entree.attendus.map((attendu) => `${attendu.code}|${attendu.cle}`);

test('les opérateurs rendent les nombres de cas de la section 3.3 du plan : 53 R, 78 K, 41 M', () => {
  const attendus: Record<string, number> = { R1: 39, R2: 8, R3: 3, R4: 3, K1: 56, K2: 10, K3: 8, K4: 4, M1: 24, M2: 5, M3: 4, M4: 8 };
  for (const [operateur, nombre] of Object.entries(attendus)) assert.equal(duOperateur(operateur).length, nombre, operateur);
  const parLettre = (lettre: string) => TOUS.filter((entree) => entree.operateur.startsWith(lettre)).length;
  assert.deepEqual([parLettre('R'), parLettre('K'), parLettre('M')], [53, 78, 41]);
  assert.equal(TOUS.length, 172);
  assert.equal(GENERATEURS.length, 3);
});

test('chaque cas a un identifiant <opérateur>-<n>, une description, des zones, une clé à trois parts et un verdict cohérent', () => {
  assert.equal(new Set(TOUS.map((entree) => entree.id)).size, TOUS.length);
  for (const operateur of ['R1', 'R2', 'R3', 'R4', 'K1', 'K2', 'K3', 'K4', 'M1', 'M2', 'M3', 'M4']) {
    duOperateur(operateur).forEach((entree, rang) => assert.equal(entree.id, `${operateur}-${rang + 1}`));
  }
  for (const entree of TOUS) {
    assert.equal(entree.famille, 'F2');
    assert.ok(entree.entree.description.startsWith(entree.operateur), entree.id);
    assert.ok(entree.entree.zones.length > 0, entree.id);
    assert.equal(entree.verdict === 'mesure', entree.question !== undefined, entree.id);
    for (const attendu of entree.attendus) {
      assert.ok(/^C(60|63|82)$/.test(attendu.code), `${entree.id} ${attendu.code}`);
      assert.equal(attendu.cle.split('|').length >= 3, true, `${entree.id} ${attendu.cle}`);
      if (attendu.forme === 'correction') assert.ok(attendu.apres?.cle ?? attendu.apres?.nom, `${entree.id} sans cible`);
    }
    for (const detail of entree.details ?? []) assert.ok(cles(entree).includes(detail.pour), `${entree.id} ${detail.pour}`);
  }
});

test('les cas qui dépendent d\'une question non confirmée portent le verdict mesure et son identifiant', () => {
  const mesures = TOUS.filter((entree) => entree.verdict === 'mesure').map((entree) => [entree.id, entree.question]);
  assert.deepEqual(mesures, [
    ...Array.from({ length: 10 }, (_, rang) => [`K2-${rang + 1}`, 'Q-F2-2']),
    ['K3-1', 'Q-F2-3'], ['K3-2', 'Q-F2-3'], ['K4-1', 'Q-F2-3'], ['K4-2', 'Q-F2-3'],
    ...Array.from({ length: 12 }, (_, rang) => [`M1-${rang + 1}`, 'Q-F2-4']),
    ['M4-8', 'Q-F2-sans-numero'],
  ]);
});

test('R1 : un variable-absente avec création du rôle sous son nom, et un alias-supprime par couleur de composant qui le visait', () => {
  const r1 = duOperateur('R1');
  assert.equal(r1.filter((entree) => entree.attendus[0].forme === 'correction').length, 39);
  // R1-1 retire primary solid/default. `button/color/primary/background` visait cette variable et n'a plus de cible.
  assert.deepEqual(cles(cas('R1-1')), ['C82|variable-absente|primary/solid/default|', 'C63|alias-supprime|button/color/primary/background|Mode 1']);
  assert.equal(cas('R1-1').attendus[0].apres?.nom, 'primary/solid/default');
  assert.deepEqual(cas('R1-1').entree.base.catalogue.variables.find((v) => v.cle === 'theme|primary/solid/default')?.scopes, cas('R1-1').details![0].creation!.scopes);
  // R1-2 retire primary solid/hover, que aucun composant ne vise.
  assert.deepEqual(cles(cas('R1-2')), ['C82|variable-absente|primary/solid/hover|']);
  // R1-19 retire secondary solid/foreground. Le sens inverse donne le noir en Light et le blanc en Dark.
  const foregroundInverse = cas('R1-19');
  assert.match(foregroundInverse.entree.description, /secondary solid\/foreground/);
  assert.deepEqual(foregroundInverse.details![0].creation!.alias, { 'm-theme-light': 'utility|neutral/light/black', 'm-theme-dark': 'utility|neutral/dark/white' });
  assert.deepEqual(foregroundInverse.details![0].creation!.scopes, ['TEXT_FILL', 'SHAPE_FILL', 'STROKE_COLOR']);
  // Les rôles du neutre, des globales et des élévations suivent ceux des palettes (30, puis 4, 3 et 2).
  assert.match(cas('R1-31').entree.description, /neutral page\/foreground-main/);
  assert.deepEqual(cas('R1-35').details![0].creation!.alias, { 'm-theme-light': 'utility|neutral/light/200', 'm-theme-dark': 'utility|neutral/dark/200' });
  assert.deepEqual(cles(cas('R1-39')), ['C82|variable-absente|elevation/raised|']);
  assert.deepEqual(cas('R1-39').details![0].creation!.alias, { 'm-theme-light': 'utility|elevation/light/raised', 'm-theme-dark': 'utility|elevation/dark/raised' });
});

test('R2 : sans écriture, un variable-absente sans correction qui dit sa raison ; R4 : un rôle ignoré, aucun constat', () => {
  for (const entree of duOperateur('R2')) {
    assert.equal(entree.entree.ecriture, null, entree.id);
    assert.deepEqual([entree.attendus[0].forme, entree.attendus[0].cle.endsWith('|sans-ecriture')], ['a-faire', true], entree.id);
    assert.deepEqual(entree.details, [], entree.id);
  }
  // Huit rôles tirés, tous distincts.
  assert.equal(new Set(duOperateur('R2').map((entree) => entree.attendus[0].cle)).size, 8);
  assert.deepEqual(duOperateur('R4').map((entree) => [entree.attendus.length, entree.entree.rolesIgnores]), [
    [0, ['surface/subtle']], [0, ['solid/hover']], [0, ['page/divider']],
  ]);
});

test('R3 : la création n\'a lieu que pour un cran identique dans les deux sens ; sinon la raison dit pourquoi', () => {
  const [une, deux, aucun] = duOperateur('R3');
  const raisons = (entree: CasDeStructure) => entree.attendus.flatMap((attendu) => attendu.cle.split('|')[3] ?? []);
  assert.deepEqual(une.attendus.filter((attendu) => attendu.forme === 'correction').map((attendu) => attendu.cle.split('|')[1]), [
    'success/soft/surface/default', 'success/soft/surface/hover', 'success/soft/surface/pressed', 'success/soft/surface/subtle',
    'success/soft/surface/divider', 'success/soft/page/divider',
  ]);
  assert.deepEqual([une.attendus.length, raisons(une).length, new Set(raisons(une))], [14, 8, new Set(['sens-inconnu'])]);
  assert.deepEqual([deux.attendus.length, raisons(deux).filter((raison) => raison === 'prefixes-multiples').length, raisons(deux).filter((raison) => raison === 'sens-inconnu').length], [13, 12, 1]);
  assert.deepEqual([aucun.attendus.length, raisons(aucun).filter((raison) => raison === 'sans-jumelle').length, raisons(aucun).filter((raison) => raison === 'sens-inconnu').length], [16, 13, 1]);
  assert.deepEqual(aucun.attendus.filter((attendu) => attendu.cle.startsWith('valeur-directe')).map((attendu) => attendu.cle), [
    'valeur-directe|success/soft/solid/default|light', 'valeur-directe|success/soft/solid/default|dark',
  ]);
});

test('K1 : un cran de la table, lu dans les rôles qui n\'ont pas bougé, et l\'hypothèse 2 sur cinq cas', () => {
  const k1 = duOperateur('K1');
  assert.ok(k1.every((entree) => entree.attendus.length === 1 && entree.attendus[0].forme === 'correction' && entree.attendus[0].cle.startsWith('cran|')));
  // K1-1 déplace primary solid/default en Light du 700 au 800. La correction revient à la variable du 700.
  assert.equal(cas('K1-1').attendus[0].cle, 'cran|primary/solid/default|light');
  assert.equal(cas('K1-1').attendus[0].apres?.cle, 'brands|primary/light/700');
  assert.equal(cas('K1-1').details![0].avant, 'brands|primary/light/800');
  // Au bout de l'échelle (950 en Dark), le pas va vers le 900.
  assert.equal(cas('K1-16').attendus[0].cle, 'cran|primary/surface/foreground|dark');
  assert.equal(cas('K1-16').details![0].avant, 'brands|primary/dark/900');
  // En sens inverse, la cible est celle de la table inverse (secondary ring en Dark est au 800).
  assert.equal(cas('K1-56').attendus[0].cle, 'cran|secondary/ring|dark');
  assert.equal(cas('K1-56').attendus[0].apres?.cle, 'brands|secondary/dark/800');
  assert.deepEqual(k1.filter((entree) => entree.hypothese === 'H2').map((entree) => entree.id), ['K1-21', 'K1-22', 'K1-23', 'K1-24', 'K1-27']);
});

test('K2 à K4 : une question sans correction, une correction vers la couleur absolue de la table, deux candidats hors table', () => {
  for (const entree of duOperateur('K2')) assert.deepEqual([entree.attendus[0].forme, entree.attendus[0].cle.startsWith('rampe-autre-palette|')], ['question', true], entree.id);
  assert.deepEqual(cas('K3-1').attendus[0].candidats, ['neutral/light/white', 'neutral/light/black']);
  assert.deepEqual(cas('K3-2').attendus[0].candidats, ['neutral/dark/white', 'neutral/dark/black']);
  // K3-3 inverse scale/0 en Light, le blanc devenu noir. La correction revient au blanc.
  assert.equal(cas('K3-3').attendus[0].cle, 'cran|neutral/scale/0|light');
  assert.equal(cas('K3-3').attendus[0].apres?.cle, 'utility|neutral/light/white');
  assert.equal(cas('K3-3').details![0].avant, 'utility|neutral/light/black');
  assert.equal(cas('K3-8').attendus[0].apres?.cle, 'utility|neutral/dark/white');
  assert.deepEqual(duOperateur('K4').map((entree) => entree.attendus.length), [0, 0, 1, 1]);
  assert.deepEqual([cas('K4-3').attendus[0].forme, cas('K4-3').attendus[0].candidats], ['question', ['primary/light/700', 'primary/light/800']]);
  assert.deepEqual(cas('K4-4').attendus[0].candidats, ['primary/dark/700', 'primary/dark/800']);
  assert.equal(cas('K4-3').attendus[0].cle, 'cran|primary/page/border|light');
});

test('M1 à M4 : C60 avec une correction vers la bonne branche, sans correction quand la cible manque, mode-du-theme par mode manquant', () => {
  // M1-1 est de la place « chemin » (mesure Q-F2-4, hypothèse 1). M1-13 est de la place « modes ».
  assert.equal(cas('M1-1').attendus[0].cle, '-|primary/solid/default|light');
  assert.equal(cas('M1-1').attendus[0].apres?.cle, 'brands|primary/light/700');
  assert.equal(cas('M1-1').details![0].avant, 'brands|primary/dark/700');
  assert.equal(cas('M1-1').hypothese, 'H1');
  assert.equal(cas('M1-13').verdict, 'attendu');
  assert.equal(cas('M1-13').entree.theme.catalogue.collections.find((collection) => collection.cle === 'brands')!.modes[0].nom, 'light');
  assert.equal(cas('M1-1').entree.theme.catalogue.collections.find((collection) => collection.cle === 'brands')!.modes[0].nom, 'Marque A');
  // M2. Une question sans candidat, puis la cible qui boucle, qui est aussi une couche non admise.
  for (const entree of duOperateur('M2').slice(0, 4)) assert.deepEqual([entree.attendus[0].forme, entree.attendus[0].candidats], ['question', []], entree.id);
  assert.deepEqual(cles(cas('M2-5')), ['C60|-|primary/surface/default|light', 'C82|couche|primary/dark/200|dark']);
  // M3. Le cran du mode du rôle dans l'autre branche. surface/default en Light est au 100, donc la cible fautive est `dark/100`.
  assert.equal(cas('M3-1').details![0].avant, 'brands|primary/dark/100');
  assert.equal(cas('M3-1').attendus[0].apres?.cle, 'brands|primary/light/100');
  // M4. Les deux modes à nommer, ou celui qui manque ; un troisième mode ne manque à personne.
  assert.deepEqual(duOperateur('M4').map((entree) => entree.attendus.map((attendu) => attendu.cle)), [
    ['mode-du-theme|theme|les-deux'], ['mode-du-theme|theme|dark'], ['mode-du-theme|theme|light'], ['mode-du-theme|theme|les-deux'],
    ['mode-du-theme|theme|light'], ['mode-du-theme|theme|dark'], ['mode-du-theme|theme|les-deux'], [],
  ]);
});

test('la clé d\'un constat émis se lit comme celle de l\'oracle, et un attendu manquant reste un manque', () => {
  const fabrique = (faits: Constat['faits'], code: Constat['code'] = 'C82'): Constat => ({ id: 'x', code, type: 'corriger', famille: 'liaisons', variants: [], layers: [], faits });
  assert.equal(cleDeConstat(fabrique({ genre: 'variable-absente', variable: 'solid/default', groupe: 'primary', raison: 'sans-ecriture' })), 'variable-absente|primary/solid/default||sans-ecriture');
  assert.equal(cleDeConstat(fabrique({ genre: 'variable-absente', variable: 'disabled/border', groupe: '' })), 'variable-absente|disabled/border|');
  assert.equal(cleDeConstat(fabrique({ genre: 'cran', variable: 'primary/ring', mode: 'light', avant: 700 })), cleAttendue('cran', 'primary/ring', 'light'));
  assert.equal(cleDeConstat(fabrique({ genre: 'mode-du-theme', collection: 'theme', manque: 'dark' })), 'mode-du-theme|theme|dark');
  assert.equal(cleDeConstat(fabrique({ variable: 'primary/ring', mode: 'dark', cible: 'x' }, 'C60')), '-|primary/ring|dark');
  const resultat = comparer(cas('K1-1'), [], cleDeConstat);
  assert.deepEqual(resultat.ecarts.map((ecart) => ecart.sorte), ['manque']);
});

test('verifierLesDetails relève un avant, un nom, des scopes ou des alias faux, et ne dit rien d\'une création juste', () => {
  const entree = cas('R1-2');
  const juste = entree.details![0].creation!;
  const constat = (creation: object, avant: string | null = null): Constat => ({
    id: 'x', code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [],
    faits: { genre: 'variable-absente', variable: 'solid/hover', groupe: 'primary' },
    correction: {
      id: 'x', sorte: 'variable', cible: {}, avant, apres: { nom: juste.nom }, aRelire: { regle: '', avant },
      creation: { collection: juste.collection, nom: juste.nom, type: 'COLOR', scopes: [...juste.scopes], alias: Object.fromEntries(Object.entries(juste.alias).map(([mode, cle]) => [mode, { cle, nom: cle }])), ...creation },
    },
  });
  assert.deepEqual(verifierLesDetails(entree, [constat({})]), []);
  assert.equal(verifierLesDetails(entree, [constat({ nom: 'autre' })]).length, 1);
  assert.equal(verifierLesDetails(entree, [constat({ scopes: ['ALL_SCOPES'] })]).length, 1);
  assert.equal(verifierLesDetails(entree, [constat({ alias: { 'm-theme-light': { cle: 'faux', nom: 'faux' } } })]).length, 1);
  assert.deepEqual(verifierLesDetails(entree, []), []);
  const avant = cas('K1-1');
  const cran = (precedent: string): Constat => ({
    id: 'x', code: 'C82', type: 'corriger', famille: 'liaisons', variants: [], layers: [],
    faits: { genre: 'cran', variable: 'primary/solid/default', mode: 'light' },
    correction: { id: 'x', sorte: 'alias-de-mode', cible: {}, avant: precedent, apres: { cle: 'brands|primary/light/700', nom: '' }, aRelire: { regle: '', avant: precedent } },
  });
  assert.deepEqual(verifierLesDetails(avant, [cran('brands|primary/light/800')]), []);
  assert.equal(verifierLesDetails(avant, [cran('brands|primary/light/900')]).length, 1);
});

test('les contrôles s\'exécutent sur les cas sans modifier le catalogue du cas, et dédoublonnent par identifiant', () => {
  for (const id of ['R1-1', 'K1-1', 'M1-13', 'M4-1']) {
    const avant = JSON.stringify(cas(id).entree.theme.catalogue);
    const constats = constatsDuCas(cas(id));
    assert.equal(JSON.stringify(cas(id).entree.theme.catalogue), avant, id);
    assert.equal(new Set(constats.map((constat) => constat.id)).size, constats.length, id);
    assert.equal(comparer(cas(id), constats, cleDeConstat).attendus, cas(id).attendus.length, id);
  }
  assert.deepEqual(constatsDeStructure(base.catalogue, base.ecriture, []), []);
});

test('dégrader ne touche pas la base, puis annuler redonne le catalogue de la base', () => {
  assert.equal(JSON.stringify(base), baseAvant);
  // `isDeepStrictEqual` plutôt que le texte, car annuler remet une valeur retirée en fin d'objet, ce qui ne change pas le catalogue.
  for (const entree of TOUS) {
    const { theme, annuler } = entree.entree;
    assert.ok(!isDeepStrictEqual(theme.catalogue, base.catalogue), `${entree.id} ne dégrade rien`);
    annuler();
    assert.ok(isDeepStrictEqual(theme.catalogue, base.catalogue), `${entree.id} : annuler ne redonne pas la base`);
  }
  assert.equal(JSON.stringify(base), baseAvant);
  assert.deepEqual(constatsDeStructure(base.catalogue, base.ecriture, []), []);
});

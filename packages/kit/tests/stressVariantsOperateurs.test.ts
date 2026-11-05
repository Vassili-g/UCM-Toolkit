/**
 * Garde les opérateurs A, V, Q, M et O du harnais de stress F5 : les corpus, P0 et un échantillon des 60 profils à zéro constat,
 * les nombres de cas par sous-opérateur contre le plan, les cas `mesure` et leur question, un oracle écrit à la main par opérateur,
 * et la réversibilité (dégrader puis annuler redonne la base). Le test ne mesure pas le kit sur les cas : un écart du kit sur eux est un
 * résultat du harnais, pas un échec d'ici.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { c10, c31, c32, c33, c63DeuxAxesDeStyle, c7, c8, c9, variantCorrige, type CasDeVariants } from './stress/f5-variants/cas.js';
import { AXES_DE_P0, composantP0, constatsDeLaPortee, GRAINE_PAR_DEFAUT, verifierLaLecture } from './stress/f5-variants/composantDeBase.js';
import { GENERATEURS, tousLesCas } from './stress/f5-variants/operateurs.js';
import { AXES_ATTESTES, axesDuProfil, composantDuProfil, PROFILS, profilParId, rolesAttendusDuProfil, VALEURS_ATTESTEES } from './stress/f5-variants/profils.js';

const base = composantP0();
const baseAvant = JSON.stringify({ releve: base.releve, catalogue: base.catalogue });
const TOUS = tousLesCas(base);
const cas = (id: string): CasDeVariants => TOUS.find((entree) => entree.id === id)!;
const duOperateur = (operateur: string): CasDeVariants[] => TOUS.filter((entree) => entree.operateur === operateur);
const parCode = (id: string): Record<string, number> => {
  const compte: Record<string, number> = {};
  for (const attendu of cas(id).attendus) compte[attendu.code] = (compte[attendu.code] ?? 0) + 1;
  return compte;
};

test('les corpus comptent 35 noms d\'axes tous tranchés, et 88 valeurs en quatre catégories', () => {
  assert.equal(AXES_ATTESTES.length, 35);
  assert.equal(AXES_ATTESTES.filter((axe) => axe.verdict === 'attendu').length, 35);
  assert.deepEqual(AXES_ATTESTES.filter((axe) => axe.role === null).map((axe) => axe.nom), ['Loading', 'Selected', 'Destructive', 'Danger', 'High contrast']);
  assert.equal(new Set(AXES_ATTESTES.map((axe) => axe.nom)).size, 35);
  for (const axe of AXES_ATTESTES) assert.equal(axe.verdict === 'mesure', axe.question !== undefined, axe.nom);
  assert.equal(VALEURS_ATTESTEES.length, 88);
  const parCategorie = (categorie: string) => VALEURS_ATTESTEES.filter((valeur) => valeur.categorie === categorie).length;
  assert.deepEqual(['taille', 'etat', 'palette', 'style'].map(parCategorie), [30, 20, 18, 20]);
  // Les formes tolérées des registres : 5 états, 4 tailles (dont xxl, que le plan ne cite pas) et 4 palettes (Q-F5-5).
  const toleres = VALEURS_ATTESTEES.filter((valeur) => valeur.constat).map((valeur) => valeur.valeur);
  assert.deepEqual(toleres.sort(), ['Critical', 'Disable', 'Error', 'Focused', 'Hovered', 'Informative', 'Large', 'Medium', 'Positive', 'Press', 'Rest', 'Small', 'XXL']);
  assert.deepEqual(VALEURS_ATTESTEES.filter((valeur) => valeur.verdict === 'mesure'), []);
});

test('P0 compte 72 variants, ne donne aucun constat de la portée et se lit en entier', () => {
  assert.equal(base.releve.variants.length, 72);
  assert.deepEqual(AXES_DE_P0.map((axe) => axe.valeurs.length), [2, 3, 3, 4]);
  assert.deepEqual(constatsDeLaPortee(base.releve, base.catalogue), []);
  assert.deepEqual(verifierLaLecture(base), { sansLecture: [], malLus: [] });
  assert.equal(GRAINE_PAR_DEFAUT, 7105);
});

test('les 60 profils sont p01 à p60 et p18 est J3 en forme UCM, majuscules initiales', () => {
  assert.equal(PROFILS.length, 60);
  assert.deepEqual([PROFILS[0].id, PROFILS[59].id], ['p01', 'p60']);
  assert.equal(new Set(PROFILS.map((profil) => profil.id)).size, 60);
  assert.deepEqual({ ...profilParId('p18') }, { id: 'p18', jeu: 'J3', composant: 'Button', ecritureDuNom: 'initiales', ecritureDesValeurs: 'ucm' });
  assert.deepEqual(axesDuProfil(profilParId('p18')).map((axe) => [axe.nom, axe.valeurs.length, axe.segment]), [['Kind', 5, 'style'], ['Size', 5, 'taille'], ['State', 4, 'etat']]);
  // J7 : Fill style vient après Variant, qui occupe déjà la place du style ; Fill style n'écrit aucun segment.
  assert.deepEqual(axesDuProfil(profilParId('p37')).map((axe) => [axe.nom, axe.segment]), [['Variant', 'style'], ['Fill style', null], ['Size', 'taille'], ['State', 'etat']]);
  assert.deepEqual(axesDuProfil(profilParId('p40')).map((axe) => axe.nom), ['variant', 'fill style', 'size', 'state']);
  assert.deepEqual(axesDuProfil(profilParId('p41')).map((axe) => axe.nom), ['Variant', 'Fill Style', 'Size', 'State']);
  // La forme UCM d'un jeu : tailles en toutes lettres (Q-F5-6), états en default, focus et pressed.
  assert.deepEqual(axesDuProfil(profilParId('p38')).find((axe) => axe.nom === 'Size')!.valeurs, ['Small', 'Medium', 'Large', 'Extra Large']);
  assert.deepEqual(axesDuProfil(profilParId('p32')).find((axe) => axe.nom === 'State')!.valeurs, ['default', 'hover', 'pressed', 'disabled']);
  assert.deepEqual(rolesAttendusDuProfil(profilParId('p01')), { Variant: 'style', Color: 'palette', Size: 'taille', State: 'etat' });
});

test('un échantillon des profils sans constat à la mesure (J10) donne zéro constat et une lecture complète', () => {
  for (const id of ['p55']) {
    const composant = composantDuProfil(profilParId(id));
    assert.deepEqual(constatsDeLaPortee(composant.releve, composant.catalogue), [], id);
    assert.deepEqual(verifierLaLecture(composant), { sansLecture: [], malLus: [] }, id);
  }
});

test('les opérateurs rendent les nombres de cas du plan : 137 A, 66 V, 5 Q, 29 M, 33 O', () => {
  const attendus: Record<string, number> = {
    A1: 113, A2: 10, A3: 8, A4: 6, V1: 12, V2: 4, V3: 24, V4: 20, V5: 6, Q1: 3, Q2: 1, Q3: 1,
    M1: 13, M2: 2, M3: 9, M4: 3, M5: 2, O1: 4, O2: 6, O3: 3, O4: 2, O5: 12, O6: 6,
  };
  for (const [operateur, nombre] of Object.entries(attendus)) assert.equal(duOperateur(operateur).length, nombre, operateur);
  assert.deepEqual(GENERATEURS.map((generer) => generer(base, GRAINE_PAR_DEFAUT).length), [137, 66, 5, 29, 33]);
  assert.equal(TOUS.length, 270);
});

test('chaque cas a un identifiant <opérateur>-<n>, une description qui commence par l\'opérateur et un verdict cohérent', () => {
  assert.equal(new Set(TOUS.map((entree) => entree.id)).size, TOUS.length);
  for (const operateur of new Set(TOUS.map((entree) => entree.operateur))) {
    duOperateur(operateur).forEach((entree, rang) => assert.equal(entree.id, `${operateur}-${rang + 1}`));
  }
  for (const entree of TOUS) {
    assert.equal(entree.famille, 'F5');
    assert.ok(entree.entree.description.startsWith(`${entree.operateur} :`), entree.id);
    assert.equal(entree.verdict === 'mesure', entree.question !== undefined, entree.id);
    assert.ok(entree.entree.lecture !== undefined || entree.entree.materialiser !== undefined, entree.id);
  }
});

test('les cas qui dépendent d\'une question non confirmée portent le verdict mesure et son identifiant', () => {
  const parQuestion: Record<string, number> = {};
  for (const entree of TOUS.filter((autre) => autre.verdict === 'mesure')) parQuestion[entree.question!] = (parQuestion[entree.question!] ?? 0) + 1;
  // Restent en attente : le second axe de taille, de palette ou d'état (Q-F5-3), la forme tolérée d'un état dans un variant (Q-F5-5) et la famille `Colours`.
  assert.deepEqual(parQuestion, { 'Q-F5-3': 4, 'Q-F5-5': 6, 'Q-F5-8': 1 });
  assert.deepEqual(duOperateur('M3').filter((entree) => entree.verdict === 'mesure'), [], 'la borne est décidée (Q-F5-7)');
  assert.deepEqual(duOperateur('O6').map((entree) => entree.verdict), Array(6).fill('attendu'), 'le nom illisible est décidé (Q-F5-8)');
  assert.equal(cas('V4-12').verdict, 'mesure');
  assert.equal(cas('V4-11').verdict, 'attendu');
});

test('A1 et A2 : le rôle d\'un nom suit le corpus, la proposition de la section 9 pour un nom en attente', () => {
  const lecture = (id: string) => cas(id).entree.lecture!;
  assert.deepEqual([lecture('A1-1'), lecture('A1-2'), lecture('A1-3')].map((l) => [l.nom, l.attendu]), [['Size', 'taille'], ['size', 'taille'], ['SIZE', 'taille']]);
  const lectures = duOperateur('A1').map((entree) => entree.entree.lecture!);
  assert.deepEqual(lectures.filter((l) => l.nom.toLowerCase().includes('fill') || l.nom.includes('Fill')).map((l) => l.nom),
    ['Fill style', 'fill style', 'FILL STYLE', 'fill-style', 'fill_style', 'fillStyle', 'FillStyle']);
  // Tone, Hierarchy, Emphasis et Fill style valent un rôle (Q-08) ; un booléen n'est pas un axe ; un nom français vaut son équivalent anglais.
  const role = (nom: string) => lectures.find((l) => l.nom === nom)!.attendu;
  assert.deepEqual(['Tone', 'Hierarchy', 'Emphasis', 'Fill style', 'Type', 'Density', 'Danger', 'Selected', 'Couleur', 'Variante', 'État'].map(role),
    ['palette', 'style', 'style', 'style', 'style', 'taille', undefined, undefined, 'palette', 'style', 'etat']);
  assert.ok(duOperateur('A2').every((entree) => entree.entree.lecture!.attendu === undefined));
  assert.deepEqual(duOperateur('A2').map((entree) => entree.entree.lecture!.nom), ['Icon', 'Label', 'Orientation', 'Theme', 'Mode', 'Statusbar', 'Resize', 'Colorful', 'Sizing', 'Stateful']);
});

test('V1 : une valeur renommée donne C7, la question dont l\'unique candidat est le token orphelin, ses tokens sans variant et ses variants sans token', () => {
  // Style solid devient Ghost : 3 couleurs x 3 tailles x 4 états x 6 rôles de tokens `solid`, 36 variants Ghost sans token de couleur.
  assert.deepEqual(parCode('V1-1'), { C7: 1, C12: 1, C32: 216, C33: 36 });
  const question = cas('V1-1').attendus.find((attendu) => attendu.code === 'C12')!;
  assert.deepEqual([question.cle, question.candidats], ['Style=Ghost', ['solid']]);
  assert.ok(cas('V1-1').attendus.some((attendu) => attendu.cle === c7('Style', 'Ghost').cle));
  // Size Small devient Compact : l'orphelin est `sm`, dans les deux familles ; ni md ni lg, que d'autres variants portent (N-35).
  const taille = cas('V1-6').attendus.find((attendu) => attendu.code === 'C12')!;
  assert.deepEqual(taille.candidats, ['sm']);
  assert.equal(cas('V1-6').attendus.filter((attendu) => attendu.code === 'C33').length, 48);
  // Color primary devient Destructive : ni secondary ni danger parmi les candidats.
  assert.deepEqual(cas('V1-3').attendus.find((attendu) => attendu.code === 'C12')!.candidats, ['primary']);
});

test('V2 : une valeur ajoutée donne C7 et C33 par variant et famille sans token, aucune question', () => {
  assert.deepEqual(parCode('V2-1'), { C7: 1, C33: 24 });
  assert.deepEqual(parCode('V2-2'), { C7: 1, C33: 48 });
});

test('V3 : la casse seule donne C9 pour un style, rien pour un terme connu', () => {
  assert.deepEqual(cas('V3-1').attendus, [c9('solid', 'Solid')]);
  assert.deepEqual(cas('V3-13').attendus, [c9('Solid', 'solid')]);
  assert.deepEqual(cas('V3-14').attendus, [c9('Outline', 'outline')]);
  // Palette, taille et état d'un terme connu, dans les deux sens : zéro constat.
  assert.ok(['V3-3', 'V3-18'].every((id) => cas(id).attendus.length === 0));
});

test('V4 : une forme tolérée donne C8 ou C10 avec le terme canonique, la forme tolérée d\'un état dans un variant reste en attente', () => {
  assert.deepEqual(duOperateur('V4').slice(0, 6).map((entree) => entree.attendus), [
    [c8('hovered', 'hover')], [c8('focused', 'focus')], [c8('press', 'pressed')], [c8('disable', 'disabled')], [c8('rest', 'default')], [c8('normal', 'default')],
  ]);
  assert.deepEqual(duOperateur('V4').slice(6, 9).map((entree) => entree.attendus), [[c10('small', 'sm')], [c10('medium', 'md')], [c10('large', 'lg')]]);
  assert.deepEqual(duOperateur('V4').slice(9, 12).map((entree) => entree.attendus), [[c8('Colors', 'color')], [c8('Colour', 'color')], [c8('Colours', 'color')]]);
  // Une palette tolérée dans le token reçoit C8 (Q-F5-5), le variant qui l'écrit aussi.
  assert.deepEqual(duOperateur('V4').slice(12, 14).map((entree) => entree.attendus), [[c8('error', 'danger')], [c8('critical', 'danger')]]);
  assert.ok(duOperateur('V4').slice(12, 14).every((entree) => entree.verdict === 'attendu'));
  assert.ok(duOperateur('V4').slice(14).every((entree) => entree.verdict === 'mesure'));
  assert.deepEqual(cas('V4-15').attendus, []);
});

test('V5 : une taille attestée donne C10 pour le variant (Q-F5-6), un token qui n’est pas l’identifiant garde C9', () => {
  const variant = (valeur: string, mot: string) => variantCorrige('C10', 'Size', valeur, mot);
  // `s`, `m`, `l`, `middle` et `extra-large` ne sont pas des termes du registre des tailles pour un token : C9 les compare au variant.
  assert.deepEqual(duOperateur('V5').map((entree) => entree.attendus), [
    [c9('s', 'S'), variant('S', 'Small')], [c9('m', 'M'), variant('M', 'Medium')], [c9('l', 'L'), variant('L', 'Large')],
    [variant('XL', 'Extra Large')], [c9('extra-large', 'Extra Large')], [c9('middle', 'Middle'), variant('Middle', 'Medium')],
  ]);
  assert.ok(duOperateur('V5').every((entree) => entree.verdict === 'attendu'));
});

test('Q : deux valeurs renommées donnent deux C7 et deux C13 aux deux seuls orphelins ; un seul orphelin donne C12', () => {
  const [q11, q12] = duOperateur('Q1');
  assert.deepEqual(q11.attendus.filter((attendu) => attendu.code === 'C13').map((attendu) => [attendu.cle, [...attendu.candidats!].sort()]),
    [['Color=Brand', ['primary', 'secondary']], ['Color=Accent', ['primary', 'secondary']]]);
  assert.equal(q11.attendus.filter((attendu) => attendu.code === 'C7').length, 2);
  assert.deepEqual([...q12.attendus.find((attendu) => attendu.code === 'C13')!.candidats!].sort(), ['md', 'sm']);
  assert.equal(cas('Q2-1').verdict, 'attendu', 'Q-F5-4 est tranchée');
  assert.ok(cas('Q2-1').attendus.every((attendu) => attendu.forme !== 'question'), 'Q-F5-4 : C7 sans question');
  assert.equal(cas('Q2-1').attendus.filter((attendu) => attendu.code === 'C7').length, 2);
  assert.deepEqual(cas('Q3-1').attendus.find((attendu) => attendu.code === 'C12')!.candidats, ['md']);
});

test('M1 : un variant retiré donne C31 et ses six tokens de couleur sans variant ; une ligne entière retire aussi les tokens de taille', () => {
  assert.deepEqual(parCode('M1-1'), { C31: 1, C32: 6 });
  assert.deepEqual(cas('M1-1').attendus[0], c31({ Style: 'solid', Color: 'primary', Size: 'Small', State: 'default' }));
  assert.deepEqual(parCode('M1-8'), { C31: 2, C32: 12 });
  assert.deepEqual(parCode('M1-9'), { C31: 24, C32: 144 });
  assert.deepEqual(parCode('M1-10'), { C31: 24, C32: 144 + 5 });
  assert.equal(cas('M1-13').attendus.filter((attendu) => attendu.code === 'C31').length, 36);
  assert.deepEqual(parCode('M2-1'), {});
});

test('M3 : sous la borne, 200 C31 au plus et une ligne « et N autres » ; au-delà, l\'information de borne (Q-F5-7)', () => {
  assert.deepEqual(cas('M3-1').attendus, []);
  assert.equal(cas('M3-2').attendus.length, 1);
  assert.equal(cas('M3-3').attendus.length, 201);
  assert.equal(cas('M3-3').attendus[200].cle, 'et-autres|autres=3896');
  assert.deepEqual(cas('M3-4').attendus.map((attendu) => attendu.cle), ['information-de-borne|total=4097|variants=4097']);
  assert.deepEqual(cas('M3-7').attendus.map((attendu) => attendu.cle), ['information-de-borne|total=1048576|variants=0']);
  assert.deepEqual(cas('M3-9').attendus.map((attendu) => attendu.cle), ['information-de-borne|total=25920|variants=300']);
  assert.ok(duOperateur('M3').every((entree) => entree.entree.budgetMs === 2000));
  assert.deepEqual(duOperateur('M4').map((entree) => entree.attendus.length), [7, 0, 0]);
  assert.deepEqual(duOperateur('M5').map((entree) => entree.attendus), [[], []]);
});

test('O : les tokens sans variant, inutilisés, retirés ou illisibles ont chacun leur constat', () => {
  assert.deepEqual(cas('O1-1').attendus, [c32('button/color/primary/ghost/sm/default/background', 'sans-variant')]);
  assert.deepEqual(cas('O1-3').attendus, [c32('button/color/primary/solid/xl/default/background', 'sans-variant')]);
  assert.deepEqual(cas('O2-1').attendus, [c32('button/color/primary/solid/sm/default/border', 'inutilise')]);
  assert.deepEqual(cas('O2-4').attendus, [c32('button/size/sm/gap', 'inutilise')]);
  assert.deepEqual(cas('O3-1').attendus, []);
  assert.deepEqual(duOperateur('O4').map((entree) => entree.attendus), [[], []]);
  // Plus aucun token de Style=solid : C7 de la valeur et C33 pour chacun de ses 36 variants.
  assert.deepEqual(parCode('O5-1'), { C7: 1, C33: 36 });
  assert.deepEqual(cas('O5-1').attendus[0], c7('Style', 'solid'));
  assert.deepEqual(cas('O5-6').attendus.filter((attendu) => attendu.code === 'C33').length, 48);
  assert.deepEqual(duOperateur('O6').map((entree) => entree.attendus.length), [1, 1, 1, 0, 1, 1]);
  assert.deepEqual(cas('O6-1').attendus, [c32('button/color/default/solid/sm/primary/background', 'nom-illisible')]);
  const premier = base.releve.variants[0].id;
  assert.ok(!cas('O5-1').attendus.some((attendu) => attendu.cle === c33(premier, 'size').cle), 'les tokens de taille couvrent encore les variants');
});

test('dégrader puis annuler redonne la base, et la base ne bouge jamais', () => {
  const echantillon = ['V1-1', 'V2-1', 'V3-13', 'V4-2', 'M1-9', 'M2-1', 'M5-2', 'O3-3', 'O5-6', 'O6-1'];
  for (const id of echantillon) {
    const { composant, annuler } = cas(id).entree.materialiser!();
    const degrade = JSON.stringify({ releve: composant.releve, catalogue: composant.catalogue });
    assert.notEqual(degrade, baseAvant, `${id} dégrade quelque chose`);
    annuler();
    assert.equal(JSON.stringify({ releve: composant.releve, catalogue: composant.catalogue }), baseAvant, `${id} annulé`);
  }
  assert.equal(JSON.stringify({ releve: base.releve, catalogue: base.catalogue }), baseAvant);
});

test('une même graine rend les mêmes cas, une autre graine déplace les variants tirés de M1', () => {
  const memes = tousLesCas(composantP0(), GRAINE_PAR_DEFAUT);
  assert.deepEqual(memes.map((entree) => [entree.id, entree.entree.description]), TOUS.map((entree) => [entree.id, entree.entree.description]));
  const autres = tousLesCas(base, 1);
  assert.notDeepEqual(duOperateur('M1').map((entree) => entree.entree.description), autres.filter((entree) => entree.operateur === 'M1').map((entree) => entree.entree.description));
});

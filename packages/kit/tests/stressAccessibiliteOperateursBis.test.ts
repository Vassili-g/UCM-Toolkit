/**
 * Garde la suite du harnais de stress F7 : les opérateurs I, R, Z, X, Q, T et L (225 cas), les faux positifs (22 thèmes et 72
 * garanties), les interactions déclarées (7 couples sur 3 profils) et les deux relations métamorphiques. Le test vérifie les
 * nombres de cas contre le plan, les cas `mesure` et leur question, un oracle écrit à la main par opérateur et par couple, et la
 * réversibilité. Il ne mesure pas le kit sur les cas, sauf quelques repères : un écart du kit est un résultat du harnais.
 *
 * Display P3 est hors périmètre : les opérateurs E1 à E3 (27 cas) et le couple O2 et E1 (3 cas) ne sont pas posés.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { controlerLAccessibilite } from '../src/controles/accessibilite.js';
import { comparer } from './stress/commun/comparer.js';
import { cleDeConstat, type CasAccessibilite } from './stress/f7-accessibilite/cas.js';
import { composantDeContraste } from './stress/f7-accessibilite/composantDeContraste.js';
import { themesCibles, tousLesFauxPositifs } from './stress/f7-accessibilite/fauxPositifs.js';
import { lesInteractions, NOMBRE_DE_COUPLES, PROFILS_DES_INTERACTIONS } from './stress/f7-accessibilite/interactions.js';
import { rejouerLaRelation, RELATIONS } from './stress/f7-accessibilite/metamorphiques.js';
import { GENERATEURS_DU_LOT_2, tousLesCas, tousLesCasDesOperateurs, tousLesCasDuLot2 } from './stress/f7-accessibilite/operateurs.js';
import { composantDuProfil, PROFIL_ALPHA, PROFIL_P0 } from './stress/f7-accessibilite/profils.js';

const GRAINE = 7107;
const base = composantDuProfil(PROFIL_P0);
const baseAvant = JSON.stringify({ releve: base.releve, catalogue: base.catalogue });
const LOT_2 = tousLesCasDuLot2(base);
const cas = (id: string): CasAccessibilite => LOT_2.find((entree) => entree.id === id)!;
const duOperateur = (operateur: string): CasAccessibilite[] => LOT_2.filter((entree) => entree.operateur === operateur);
const cles = (id: string): string[] => cas(id).attendus.map((a) => a.cle);
const cible = base.releve.variants[0].nom;
const FAUX = tousLesFauxPositifs(base, GRAINE);
const INTERACTIONS = lesInteractions(GRAINE);
const interaction = (id: string): CasAccessibilite => INTERACTIONS.find((entree) => entree.id === id)!;

test('les opérateurs du lot 2 rendent les nombres de cas du plan : 41 I, 65 R, 34 Z, 30 X, 19 Q, 10 T, 26 L', () => {
  const attendus: Record<string, number> = {
    I1: 24, I2: 6, I3: 4, I4: 3, I5: 2, I6: 2, R1: 16, R2: 15, R3: 10, R4: 10, R5: 14, Z1: 14, Z2: 14, Z3: 4, Z4: 2,
    X1: 10, X2: 9, X3: 4, X4: 5, X5: 2, Q1: 8, Q2: 4, Q3: 3, Q4: 2, Q5: 2, T1: 8, T2: 2, L1: 20, L2: 6,
  };
  for (const [operateur, nombre] of Object.entries(attendus)) assert.equal(duOperateur(operateur).length, nombre, operateur);
  assert.deepEqual(GENERATEURS_DU_LOT_2.map((generer) => generer(base, GRAINE).length), [41, 65, 34, 30, 19, 10, 26]);
  assert.equal(LOT_2.length, 225);
  assert.equal(tousLesCasDesOperateurs(base).length, 519);
  assert.equal(tousLesCas(base).length + LOT_2.length, 519);
});

test('chaque cas du lot 2 a un identifiant <opérateur>-<n>, un verdict cohérent et ses codes jugés', () => {
  const tous = tousLesCasDesOperateurs(base);
  assert.equal(new Set(tous.map((entree) => entree.id)).size, 519);
  for (const operateur of new Set(LOT_2.map((entree) => entree.operateur))) {
    duOperateur(operateur).forEach((entree, rang) => assert.equal(entree.id, `${operateur}-${rang + 1}`));
  }
  for (const entree of LOT_2) {
    assert.equal(entree.famille, 'F7');
    assert.ok(entree.entree.description.startsWith(`${entree.operateur} :`), entree.id);
    assert.equal(entree.verdict === 'mesure', entree.question !== undefined, entree.id);
  }
  // L1 et les quatre dernières racines de Z1 ne jugent que les exceptions et les contrastes : C52 y est muet.
  assert.deepEqual(duOperateur('L1').map((entree) => entree.codesJuges), Array(20).fill([]));
  assert.deepEqual(duOperateur('Z1').slice(10).map((entree) => entree.codesJuges), Array(4).fill(['C49', 'C50', 'C51']));
  assert.deepEqual(cas('I1-1').codesJuges, ['C49', 'C50', 'C51', 'C52']);
});

test('les cas qui dépendent d\'une question non confirmée portent le verdict mesure et son identifiant', () => {
  const parQuestion: Record<string, string[]> = {};
  for (const entree of LOT_2.filter((autre) => autre.verdict === 'mesure')) (parQuestion[entree.question!] ??= []).push(entree.id);
  assert.deepEqual(parQuestion, {
    'Q-F3-4': [...Array.from({ length: 20 }, (_, rang) => `I1-${rang + 5}`), 'I2-3', 'I2-4'],
    'Q-F7-9': ['R2-10', 'R2-11', 'R2-12', 'R2-13', 'R2-14', 'R2-15', 'R5-11'],
    'E-40': ['Z2-9', 'Z2-10', 'Z2-11'],
  });
});

test('I : un VECTOR est une icône quel que soit son nom, un RECTANGLE nommé icon ne l\'est pas, un fill décide de C49 et le stroke de C50', () => {
  // I1 : le rapport de #B8B8B8 sur blanc est 1,984, affiché 1,98 ; VECTOR et BOOLEAN_OPERATION sont des icônes sous les deux noms.
  assert.deepEqual(cas('I1-1').attendus.map(({ cle, rapport, seuil, premierPlan }) => ({ cle, rapport, seuil, premierPlan })), [{ cle: 'icone|icon||', rapport: 1.98, seuil: 3, premierPlan: '#B8B8B8' }]);
  assert.deepEqual([cles('I1-2'), cles('I1-3'), cles('I1-4')], [['icone|Shape||'], ['icone|icon||'], ['icone|Shape||']]);
  // Un type de forme qui n'est pas un VECTOR : Q-F3-4 attend l'icône par le nom `icon` ou par l'instance pilotée.
  assert.deepEqual([cles('I1-5'), cles('I1-6'), cles('I1-21'), cles('I1-22'), cles('I1-24')], [['icone|icon||'], [], ['icone|icon||'], ['icone|Shape||'], []]);
  assert.deepEqual(cas('I1-22').icone, { nom: 'Shape', type: 'INSTANCE', instance: 'pilotee', estUneIcone: true });
  assert.deepEqual(cas('I1-24').icone, { nom: 'Shape', type: 'INSTANCE', instance: 'bibliotheque', estUneIcone: false });
  // I2 : le mot entier `icon` compte, `Silicone` et `Icons` non.
  assert.deepEqual(duOperateur('I2').map((c) => c.attendus.length), [0, 0, 1, 1, 0, 0]);
  assert.deepEqual(duOperateur('I2').map((c) => c.icone!.estUneIcone), [false, false, true, true, false, false]);
  // I3 : quatre VECTOR de nom libre sont des icônes (E-26). I5 : `ring` n'en est pas une.
  assert.deepEqual(duOperateur('I3').map((c) => c.attendus[0].cle), ['icone|Divider||', 'icone|Separator||', 'icone|Chevron||', 'icone|Glyph||']);
  assert.deepEqual(duOperateur('I5').map((c) => c.attendus.map((a) => a.cle)), [['anneau|ring||'], ['anneau|Focus ring||']]);
  // I4 : un fill et un stroke donnent un constat d'icône et un constat de contour ; deux fills, celui du dessus ; un fill noir d'alpha 0,2 se compose en gris clair (1,60).
  assert.deepEqual(cas('I4-1').attendus.map(({ code, cle, rapport }) => [code, cle, rapport]), [['C49', 'icone|Pictogramme||', 1.98], ['C50', 'stroke|Pictogramme||', 2.61]]);
  assert.deepEqual([cas('I4-2').attendus[0].premierPlan, cas('I4-2').attendus[0].rapport], ['#A8A8A8', 2.37]);
  assert.deepEqual([cas('I4-3').attendus[0].premierPlan, cas('I4-3').attendus[0].rapport], ['#CCCCCC', 1.6]);
  // I6 : un fill masqué ne donne rien, un stroke seul relève de C50.
  assert.deepEqual([cles('I6-1'), cles('I6-2')], [[], ['stroke|Pictogramme||']]);
});

test('R : le contour d\'épaisseur non nulle et de peinture visible, l\'anneau reconnu par son nom, C51 donne l\'épaisseur lue', () => {
  // R1 : absente et 0 ne sont pas des contours, 0,5, 1 et 2 le sont. Une peinture masquée ou d'opacité 0 ne donne rien, un dégradé donne une limite.
  assert.deepEqual(duOperateur('R1').slice(0, 5).map((c) => c.attendus.length), [0, 0, 1, 1, 1]);
  assert.deepEqual(duOperateur('R1').slice(5, 10).map((c) => c.attendus.map((a) => a.cle)), [[], [], [], ['stroke|Contour||'], ['limite:degrade|stroke|Contour|']]);
  assert.deepEqual(cles('R1-11'), []);
  assert.equal(cas('R1-16').attendus.length, 0);
  assert.deepEqual(cles('R1-15').sort(), ['stroke|Root||page', 'stroke|Root||carte'].sort());
  assert.deepEqual(duOperateur('R1').slice(11, 14).map((c) => c.attendus.length), [0, 1, 1]);
  // R2 : les huit premiers noms sont des anneaux, `ringer` et les six du Q-F7-9 n'en sont pas.
  assert.deepEqual(duOperateur('R2').map((c) => c.attendus.length), [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(cas('R2-9').attendus[0].variants, [base.releve.variants.find((v) => v.valeurs.State === 'Focus')!.nom]);
  // R3 : les cinq écritures du focus sont sans anneau, les quatre autres états ne sont pas des focus.
  assert.deepEqual(duOperateur('R3').map((c) => c.attendus.length), [1, 1, 1, 1, 1, 0, 0, 0, 0, 1]);
  // R4 : huit anneaux invisibles sont sans anneau ; l'instance `.Ring` est un anneau, l'ELLIPSE `ring` se mesure sur son fill.
  assert.deepEqual(duOperateur('R4').slice(0, 8).map((c) => cles(c.id)), Array(8).fill(['sans-anneau']));
  assert.deepEqual([cles('R4-9'), cles('R4-10')], [[], ['anneau|ring||']]);
  // R5 : C51 donne l'épaisseur lue pour toute valeur différente de 2, et un seul constat par nom et épaisseur.
  assert.deepEqual(duOperateur('R5').slice(0, 10).map((c) => cles(c.id)), [[], ['anneau|ring|0'], ['anneau|ring|1'], ['anneau|ring|1.5'], ['anneau|ring|1.99'], [], ['anneau|ring|2.01'], ['anneau|ring|3'], ['anneau|ring|4'], ['anneau|ring|8']]);
  assert.equal(cas('R5-13').layersUniques, true);
  assert.equal(cas('R5-14').attendus[0].variants!.length, 3);
});

test('Z : corriger sous 24 px, vérifier de 24 à moins de 44 px, rien à 44 px, et seulement pour un composant interactif', () => {
  assert.deepEqual(duOperateur('Z1').slice(0, 4).map((c) => cles(c.id)), [['cible|23.99x23.99|24'], ['cible|24x24|44'], ['cible|43.99x43.99|44'], []]);
  assert.deepEqual(duOperateur('Z1').slice(4, 10).map((c) => cles(c.id)), [['cible|23.99x100|24'], ['cible|100x23.99|24'], ['cible|24x200|44'], ['cible|44x30|44'], ['cible|100x43.99|44'], []]);
  assert.deepEqual([cas('Z1-1').attendus[0].type, cas('Z1-2').attendus[0].type], ['corriger', 'verifier']);
  // Z2 : 20 px accusé pour six axes d'états interactifs et pour {Default, Hovered}, {rest, press} et `État` ; trois cas à trancher (E-40).
  assert.deepEqual(duOperateur('Z2').map((c) => c.attendus.length), [0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual(duOperateur('Z2').filter((c) => c.verdict === 'mesure').map((c) => c.id), ['Z2-9', 'Z2-10', 'Z2-11']);
  // Z3 : les dimensions illisibles n'accusent personne ; la racine masquée reste mesurée.
  assert.deepEqual(duOperateur('Z3').map((c) => c.attendus.length), [0, 0, 0, 1]);
  // Z4 : un constat par couple de dimensions, un seul pour trois variants de même taille.
  assert.deepEqual(cas('Z4-1').attendus.map((a) => a.cle), ['cible|20x20|24', 'cible|30x30|44', 'cible|36x36|44']);
  assert.deepEqual([cas('Z4-2').attendus.length, cas('Z4-2').attendus[0].variants!.length], [1, 3]);
});

test('X : disabled, disable, Disabled=True et Enabled=False sont exclus et comptés, les autres écritures sont mesurées, C53 compte les variants exclus', () => {
  // P0 a douze variants Disabled : un cas qui en désactive un de plus en compte treize.
  assert.deepEqual(duOperateur('X1').map((c) => c.attendus.find((a) => a.code === 'C53')!.exclus), [13, 13, 13, 13, 13, 12, 12, 12, 12, 12]);
  assert.deepEqual(duOperateur('X1').map((c) => c.attendus.filter((a) => a.code === 'C49').length), [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
  assert.deepEqual(duOperateur('X2').map((c) => c.attendus.find((a) => a.code === 'C53')!.exclus), [13, 13, 13, 13, 13, 12, 12, 13, 13]);
  // X3 : le texte de 11 px reste mesuré, le contraste et la cible sont exclus.
  assert.deepEqual(cas('X3-1').attendus.map((a) => a.cle), ['taille|Texte|11', 'C53']);
  assert.deepEqual(duOperateur('X3').slice(1).map((c) => c.attendus.map((a) => a.cle)), [['C53'], ['C53'], ['C53']]);
  // X4 : 0, 1, 3, 48 puis 12 variants exclus ; aucun C53 pour 0.
  assert.deepEqual(duOperateur('X4').map((c) => c.attendus.map((a) => a.exclus)), [[], [1], [3], [48], [12]]);
  assert.deepEqual(duOperateur('X5').map((c) => c.attendus.map((a) => a.exclus)), [[13], [12]]);
});

test('Q : la borne sonne si et seulement si le total dépasse 5 000, les comptes sont exacts, les variants désactivés ne comptent pas', () => {
  const nonMesurees = (id: string): unknown => cas(id).attendus.find((a) => a.cle === 'borne')?.combinaisonsNonMesurees;
  assert.deepEqual(duOperateur('Q1').map((c) => nonMesurees(c.id)), [undefined, undefined, 1, undefined, 2 * 2501 - 5000, undefined, 51 * 100 - 5000, 216 * 24 - 5000]);
  assert.deepEqual(duOperateur('Q1').map((c) => c.attendus.length), [0, 0, 1, 0, 1, 0, 1, 1]);
  // Q2 : le troisième variant échoue à son dernier rang mesuré (constat) ou au premier non mesuré (aucun constat, borne de 1 000).
  assert.deepEqual(cas('Q2-1').attendus.map((a) => a.cle), ['texte|Texte||', 'borne']);
  assert.deepEqual(cas('Q2-2').attendus.map((a) => a.cle), ['borne']);
  assert.equal(nonMesurees('Q2-2'), 1000);
  assert.equal(nonMesurees('Q2-3'), 7000 - 5000);
  assert.deepEqual(cas('Q2-4').attendus.map((a) => a.cle), ['texte|Texte||', 'borne']);
  // Q3 : 720 combinaisons sans borne, 10^6 - 5 000 en nombre, 10^20 - 5 000 en chaîne de chiffres exacts.
  assert.deepEqual([nonMesurees('Q3-1'), nonMesurees('Q3-2'), nonMesurees('Q3-3')], [undefined, 995000, '99999999999999995000']);
  // Q4 : une collection dont le mode ne change pas la couleur lue sort du produit, donc un seul mode est rapporté.
  assert.deepEqual(duOperateur('Q4').map((c) => c.attendus[0].autresModes), [0, 0]);
  // Q5 : les variants désactivés restent hors du compte ; sans couleur liée, le total vaut 1.
  assert.deepEqual(cas('Q5-1').attendus.map((a) => [a.cle, a.exclus]), [['C53', 2]]);
  assert.deepEqual(cas('Q5-2').attendus.map((a) => a.cle), ['texte|Texte||']);
});

test('T et L : un constat par plage qui échoue au seuil de sa classe, aucune exception sur une entrée dégradée', () => {
  assert.deepEqual(cles('T1-1'), ['texte|Label||']);
  assert.deepEqual(cles('T1-2'), ['texte|Label||']);
  // Une plage de 24 px à 3,95:1 passe le seuil de 3 ; la plage de 14 px échoue au seuil de 4,5.
  assert.deepEqual(cas('T1-3').attendus.map((a) => [a.cle, a.seuil]), [['texte|Label||', 4.5]]);
  assert.deepEqual(cas('T1-4').attendus.map((a) => [a.cle, a.seuil]), [['texte|Label||', 4.5]]);
  assert.deepEqual(cles('T1-5'), []);
  assert.deepEqual(cas('T1-6').attendus.map((a) => [a.mode, a.autresModes]), [['theme en Light', 0]]);
  assert.equal(cas('T1-8').layersUniques, true);
  // T2 : deux tailles, deux constats ; deux longueurs de plage, un seul groupe attendu (Q-F7-12).
  assert.deepEqual(duOperateur('T2').map((c) => c.attendus.map((a) => a.cle)), [['texte|Label||', 'grand-texte|Label||'], ['texte|Label||']]);
  // L1 : vingt entrées dégradées, aucun constat attendu ; le cycle de `parent` ne finit pas et se mesure à part.
  assert.deepEqual(duOperateur('L1').map((c) => c.attendus.length), Array(20).fill(0));
  assert.deepEqual(duOperateur('L1').filter((c) => c.risqueDeBoucle).map((c) => c.id), ['L1-13']);
  // L2 : une lecture manquée n'accuse que ce qu'elle laisse lire.
  assert.deepEqual(duOperateur('L2').map((c) => c.attendus.length), [0, 0, 0, 0, 0, 1]);
});

test('les faux positifs : 22 thèmes ciblés et 72 garanties, aucun cas de garantie vide, aucun constat attendu hors du repli du fichier libre', () => {
  const themes = FAUX.cas.filter((entree) => entree.operateur === 'FP1');
  const garanties = FAUX.cas.filter((entree) => entree.operateur === 'FP2');
  assert.deepEqual([themes.length, garanties.length, FAUX.cas.length], [22, 72, 94]);
  assert.deepEqual(FAUX.vides, []);
  assert.equal(new Set(FAUX.cas.map((entree) => entree.id)).size, 94);
  assert.deepEqual(themes.filter((entree) => entree.attendus.length > 0).map((entree) => [entree.id, entree.attendus.map((a) => a.cle)]), [['FP1-16', ['fond-de-repli']]]);
  assert.deepEqual(garanties.flatMap((entree) => entree.attendus), []);
  assert.deepEqual(themesCibles(base, GRAINE).map((entree) => entree.id), themes.map((entree) => entree.id));
  // Chaque garantie est posée dans les deux modes pour quatre palettes : 4 × 9 × 2.
  assert.deepEqual(garanties.map((entree) => entree.entree.description.match(/garantie (\d)/)![1]).slice(0, 4), ['1', '1', '2', '2']);
  assert.equal(new Set(garanties.map((entree) => entree.entree.description.match(/teinte (\d+)/)![1])).size, 4);
  // Le tirage suit la graine : deux fois la même liste, une autre graine, d'autres teintes.
  assert.deepEqual(tousLesFauxPositifs(base, GRAINE).cas.map((entree) => entree.entree.description), FAUX.cas.map((entree) => entree.entree.description));
  assert.notDeepEqual(tousLesFauxPositifs(base, GRAINE + 1).cas.map((entree) => entree.entree.description), FAUX.cas.map((entree) => entree.entree.description));
});

test('quelques faux positifs passent par le kit sans écart : un thème par famille et trois garanties', () => {
  for (const id of ['FP1-1', 'FP1-2', 'FP1-6', 'FP1-9', 'FP1-12', 'FP1-16', 'FP1-18', 'FP1-22', 'FP2-1', 'FP2-30', 'FP2-72']) {
    const entree = FAUX.cas.find((autre) => autre.id === id)!;
    const { composant } = entree.entree.materialiser();
    const emis = controlerLAccessibilite(composant.releve, composant.catalogue, { niveau: entree.entree.niveau });
    assert.deepEqual(comparer(entree, emis, cleDeConstat).ecarts.map((ecart) => ecart.detail), [], id);
  }
});

test('les interactions : sept couples sur P0, Pα et le profil tiré, soit 21 cas ; le couple O2 et E1 est retiré avec Display P3', () => {
  assert.equal(NOMBRE_DE_COUPLES, 7);
  assert.deepEqual(PROFILS_DES_INTERACTIONS(GRAINE).map((profil) => profil.id), ['p013', 'p007', 'p042']);
  assert.equal(PROFIL_ALPHA.id, 'p007');
  assert.equal(INTERACTIONS.length, 21);
  assert.deepEqual([...new Set(INTERACTIONS.map((entree) => entree.operateur))], ['O4+M6', 'F1+M5', 'X1+Q1', 'G1+S3', 'R4+R5', 'Y1+O4', 'T1+M1']);
  assert.equal(new Set(INTERACTIONS.map((entree) => entree.id)).size, 21);
  for (const entree of INTERACTIONS) {
    assert.equal(entree.famille, 'F7');
    assert.ok(entree.entree.description.startsWith(`${entree.operateur} :`) || /^p\d{3} /.test(entree.entree.description), entree.id);
  }
});

test('chaque couple d\'interactions a son oracle propre, écrit à la main', () => {
  // O4 et M6 : le repli mesure les deux modes du thème, donc la page et la carte échouent en Dark. Sur le profil tiré, qui n'a que Light, le texte noir passe.
  assert.equal(interaction('O4+M6-p013').verdict, 'attendu');
  assert.deepEqual(interaction('O4+M6-p013').attendus.map((a) => a.cle), ['texte|Texte||page', 'texte|Texte||carte']);
  assert.deepEqual(interaction('O4+M6-p042').attendus, []);
  // F1 et M5 : deux limites de causes distinctes, aucun verdict.
  assert.deepEqual(interaction('F1+M5-p013').attendus.map((a) => a.cle), ['limite:degrade|texte|Texte|', 'limite:mode-illisible|texte|Autre|']);
  // X1 et Q1 : trois variants désactivés de 5 001 combinaisons ne consomment rien ; le variant actif de 10 passe.
  assert.deepEqual(interaction('X1+Q1-p013').attendus.map((a) => [a.cle, a.exclus]), [['C53', 3]]);
  // G1 et S3 en AAA : seuil 4,5 pour le grand texte à 3,9:1, seuil 7 pour le texte à 5:1.
  assert.deepEqual(interaction('G1+S3-p013').attendus.map((a) => [a.cle, a.seuil, a.niveau]), [['grand-texte|Grand||', 4.5, 'AAA'], ['texte|Petit||', 7, 'AAA']]);
  assert.equal(interaction('G1+S3-p013').entree.niveau, 'AAA');
  // R4 et R5 : l'anneau invisible d'épaisseur 1 donne `C50:sans-anneau` et aucun C51.
  assert.deepEqual(interaction('R4+R5-p013').attendus.map((a) => a.cle), ['sans-anneau']);
  // Y1 et O4 : un constat sur la page et un sur la carte, corriger, chacun avec la variable du thème.
  assert.deepEqual(interaction('Y1+O4-p013').attendus.map((a) => [a.cle, a.type, a.variableDuTheme]), [
    ['texte|Texte||page', 'corriger', 'surface/foreground'], ['texte|Texte||carte', 'corriger', 'surface/foreground'],
  ]);
  // T1 et M1 : une plage échoue en Light, l'autre en Dark ; un seul mode sur le profil tiré, donc la seconde plage n'échoue pas.
  assert.deepEqual(interaction('T1+M1-p013').attendus.map((a) => [a.cle, a.mode]), [['texte|Label||', 'theme en Light']]);
  assert.deepEqual(interaction('T1+M1-p042').attendus.map((a) => a.cle), ['texte|Label||']);
});

test('quelques interactions passent par le kit : X1 et Q1, G1 et S3, R4 et R5, F1 et M5 donnent les constats de leurs deux opérateurs', () => {
  for (const id of ['X1+Q1-p013', 'G1+S3-p013', 'R4+R5-p007', 'F1+M5-p042']) {
    const entree = interaction(id);
    const { composant } = entree.entree.materialiser();
    const emis = controlerLAccessibilite(composant.releve, composant.catalogue, { niveau: entree.entree.niveau });
    assert.deepEqual(comparer(entree, emis, cleDeConstat).ecarts.map((ecart) => ecart.detail), [], id);
  }
});

test('les relations : l\'ordre mélangé et la casse changée laissent les constats d\'un cas, et une différence de constats est vue', () => {
  assert.deepEqual([...RELATIONS], ['ordre', 'casse']);
  for (const id of ['I3-1', 'R2-9', 'Z4-1', 'X4-2', 'T1-1', 'Q5-1']) {
    const entree = cas(id);
    const { composant } = entree.entree.materialiser();
    const emis = controlerLAccessibilite(composant.releve, composant.catalogue, { niveau: entree.entree.niveau });
    for (const relation of RELATIONS) assert.equal(rejouerLaRelation(entree, relation, emis, GRAINE).issue, 'tenue', `${id} ${relation}`);
  }
  // Face à des constats vides, la relation est violée : elle compare bien.
  const entree = cas('I3-1');
  assert.equal(rejouerLaRelation(entree, 'ordre', [], GRAINE).issue, 'ecart');
  // La borne coupe les derniers variants du relevé : l'ordre ne s'applique pas ; un cycle de `parent` ne se rejoue pas.
  const borne = cas('Q1-3');
  const { composant } = borne.entree.materialiser();
  const emis = controlerLAccessibilite(composant.releve, composant.catalogue, { niveau: 'AA' });
  assert.deepEqual([rejouerLaRelation(borne, 'ordre', emis, GRAINE).issue, rejouerLaRelation(borne, 'casse', emis, GRAINE).issue], ['ignore', 'tenue']);
  assert.equal(rejouerLaRelation(cas('L1-13'), 'casse', [], GRAINE).issue, 'ignore');
});

test('dégrader puis annuler redonne la base, pour un cas sur douze du lot 2 et le premier de chaque opérateur', () => {
  const echantillon = LOT_2.filter((entree, rang) => rang % 12 === 0 || entree.id.endsWith('-1'));
  assert.ok(echantillon.length > 30);
  for (const entree of echantillon) {
    const copie = entree.entree.materialiser();
    assert.notEqual(copie.composant, base, entree.id);
    copie.annuler();
    assert.equal(JSON.stringify({ releve: copie.composant.releve, catalogue: copie.composant.catalogue }), baseAvant, entree.id);
  }
  assert.equal(JSON.stringify({ releve: base.releve, catalogue: base.catalogue }), baseAvant);
});

test('une même graine rend les mêmes cas, et un autre composant de la même spec les mêmes oracles', () => {
  const autre = tousLesCasDuLot2(composantDeContraste(PROFIL_P0, GRAINE), GRAINE);
  assert.deepEqual(autre.map((c) => [c.id, c.attendus]), LOT_2.map((c) => [c.id, c.attendus]));
  assert.deepEqual(lesInteractions(GRAINE).map((c) => [c.id, c.attendus]), INTERACTIONS.map((c) => [c.id, c.attendus]));
});

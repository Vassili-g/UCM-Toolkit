import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { commencerLexique, detecterLesQuestions, detecterParEtapes, indexerVocabulaire,
  LONGUEUR_MINIMALE_D_UNE_FAUTE_A_DEUX_LETTRES, LONGUEUR_MINIMALE_D_UNE_FAUTE_A_UNE_LETTRE, LONGUEUR_MINIMALE_D_UNE_FAUTE_D_UN_MOT_COURT, SYNONYMES_COURANTS,
  type DejaJuge, type NomLu, type Question } from '../src/referentiel/index.js';
import { detecterBranchesParalleles } from '../src/referentiel/branches-paralleles.js';
import { motConnu, motsAnglaisConnus, remplacerLesMotsConnus } from '../src/referentiel/mots-connus.js';

const index = indexerVocabulaire({ personnalises: [], ecartsUcm: [] }).index;
const vide: DejaJuge = { distincts: [], plusTard: [], voulus: [], collectionsGardees: [] };

function nom(id: string, chemin: string, portee = 'collection-1', cibleAlias?: string): NomLu {
  return { id, nom: chemin, portee, categorie: 'variables', ...(cibleAlias ? { cibleAlias } : {}) };
}

function lexique(noms: readonly NomLu[]) {
  const preparation = commencerLexique();
  preparation.ajouter(noms);
  const calcul = preparation.terminer();
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

function questions(noms: readonly NomLu[], juge: DejaJuge = vide): Question[] {
  const resultat = detecterLesQuestions(lexique(noms), index, juge, { seuil: 0, maximum: 100 });
  return [...resultat.questions];
}

function paires(noms: readonly NomLu[], juge: DejaJuge = vide): string[] {
  return questions(noms, juge).filter((q) => q.type === 'paire').map((q) => q.cle);
}

test('terminaison et pluriel ne rapprochent que des mots à la même place', () => {
  const noms = [nom('a', 'colors/paint/bg'), nom('b', 'colors/painted/bg'),
    nom('c', 'colors/badge/fg'), nom('d', 'colors/badges/fg')];
  assert.deepEqual(paires(noms), ['paire:badge|badges', 'paire:paint|painted']);
  assert.deepEqual(questions(noms).filter((q) => q.type === 'paire').map((q) => q.indice), ['pluriel', 'terminaison']);
});

test('abréviations et synonymes utilisent les tables du référentiel', () => {
  const noms = [nom('a', 'palette/fg/solid'), nom('b', 'palette/foreground/solid'),
    nom('c', 'states/pressed/solid'), nom('d', 'states/active/solid')];
  assert.deepEqual(paires(noms).sort(), ['paire:active|pressed', 'paire:fg|foreground']);
  const contenu = questions(noms).find((q) => q.type === 'paire' && q.cle === 'paire:fg|foreground');
  assert.equal(contenu?.type === 'paire' && contenu.termes[contenu.propose].mot, 'foreground');
  assert.equal(contenu?.score, 4);
  // Formes tolérées du référentiel (décisions C01 et T03) : remplacées sans question tant que rien ne bloque le renommage.
  assert.deepEqual(paires([nom('a', 'palette/bg/solid'), nom('c', 'states/danger/solid')]), []);
  // E16.3 : `error` et `danger` dans le même fichier, même sans place partagée, demandent au designer de choisir.
  assert.deepEqual(paires([nom('a', 'palette/bg/solid'), nom('c', 'states/danger/solid'), nom('d', 'states/error/solid', 'collection-2')]), ['paire:danger|error']);
  // E-08 : quand le terme UCM occupe déjà le nom visé, le renommage est retiré pour collision et une question prend le relais.
  assert.deepEqual(paires([nom('a', 'palette/bg/solid'), nom('b', 'palette/background/solid'),
    nom('c', 'states/danger/solid'), nom('d', 'states/error/solid')]), ['paire:background|bg', 'paire:danger|error']);
  // Q-F5 : un synonyme employé seul, dont un seul terme UCM du groupe le remplace, donne la question.
  assert.deepEqual(paires([nom('unique', 'colors/corner/default')]), ['paire:corner|radius']);
  assert.deepEqual(paires([nom('a', 'colors/radius/default'), nom('b', 'colors/corner/default')]), ['paire:corner|radius']);
  assert.deepEqual(paires([nom('a', 'colors/radius/default'), nom('b', 'colors/corner/default')],
    { ...vide, distincts: [['corner', 'radius']] }), []);
  assert.deepEqual(paires([nom('a', 'colors/radius/default'), nom('b', 'colors/corner/default')],
    { ...vide, voulus: ['corner'] }), []);
  // Décision T07 : `border-radius` est une forme tolérée de `radius`.
  assert.deepEqual(paires([nom('a', 'colors/radius/default'), nom('b', 'colors/border-radius/default')]), ['paire:border-radius|radius'], 'E-08 : le renommage vers radius est bloqué par la collision');
});

test('les formes d’un même mot sortent sans mot connu et sans voisin commun', () => {
  assert.deepEqual(paires([nom('a', 'button/paint'), nom('b', 'chip/painted')]), ['paire:paint|painted']);
  assert.deepEqual(paires([nom('a', 'button/default/solid'), nom('b', 'card/defaults/outline')]), ['paire:default|defaults']);
  // Une négation nomme l'état opposé : jamais une fusion.
  assert.deepEqual(paires([nom('a', 'button/selected/solid'), nom('b', 'card/unselected/outline')]), []);
  // `active` est un synonyme seul de `pressed` (Q-F5) ; `inactive`, sa négation, n'entre dans aucune question avec lui.
  assert.deepEqual(paires([nom('a', 'button/active/solid'), nom('b', 'card/inactive/outline')]), ['paire:active|pressed']);
  assert.deepEqual(paires([nom('a', 'button/paint/solid'), nom('b', 'button/painted/solid', 'collection-2')]), ['paire:paint|painted']);
  // Une variable et un groupe ne se comparent pas (décision S06) : `loading` est une variable, `load` un groupe.
  assert.deepEqual(paires([
    { ...nom('a', 'control/loading'), categoriesDesSegments: ['groupes', null] },
    { ...nom('b', 'control/load/value'), categoriesDesSegments: ['groupes', 'groupes', null] },
  ]), []);
  assert.deepEqual(paires([nom('a', 'control/loading/value'), nom('b', 'field/load/value')]), ['paire:load|loading']);
  assert.deepEqual(paires([nom('a', 'background/paper'), nom('b', 'papers/card/gap')]), []);
});

test('deux variables qui visent la même cible ne font plus une question', () => {
  const noms = [nom('a', 'button/shared/shape/filled', 'collection-1', 'token-1'),
    nom('b', 'card/shared/form/filled', 'collection-1', 'token-1')];
  assert.deepEqual(paires(noms), []);
  const dix = Array.from({ length: 17 }, (_, i) => nom(`n-${i}`, `colors/branch${i}/word${i}/solid`, 'collection-1', 'token-1'));
  assert.deepEqual(paires(dix), []);
});

/** Les questions de faute du fichier. */
type Faute = Extract<Question, { type: 'ecriture-du-terme' }>;
const fautes = (noms: readonly NomLu[], juge: DejaJuge = vide): Faute[] =>
  questions(noms, juge).filter((q): q is Faute => q.type === 'ecriture-du-terme' && q.indice === 'faute');

// E2.3
test('une faute d’un terme connu sort sans que le terme figure au fichier ni qu’un mot partage sa place (E-01, E-05)', () => {
  const [faute] = fautes([nom('rare', 'theme/primary/backgrond', 'collection-2')]);
  assert.equal(faute?.terme.mot, 'backgrond');
  assert.deepEqual(faute?.proposition, ['background']);
  assert.deepEqual(faute?.reference, { mot: 'background', nombre: 0 });
  assert.equal(fautes([nom('seul', 'backgrond')]).length, 1, 'un nom d’un seul segment');
  const avecLeTerme = [nom('rare', 'theme/primary/backgrond', 'collection-2'), ...Array.from({ length: 5 }, (_, i) => nom(`ref-${i}`, `button/${i}/background`))];
  assert.equal(fautes(avecLeTerme)[0]?.reference?.nombre, 5, 'le terme est aussi au fichier, ailleurs');
});

test('une faute vue dans trois noms ou davantage reste une faute (E-02)', () => {
  for (const nombre of [1, 2, 3, 5, 10, 40]) {
    const [faute] = fautes(Array.from({ length: nombre }, (_, i) => nom(`n-${i}`, `button/${i}/backgrond`)));
    assert.equal(faute?.terme.nombre, nombre, `${nombre} noms`);
    assert.deepEqual(faute?.proposition, ['background']);
  }
});

test('l’échange de deux lettres voisines est une faute (E-03)', () => {
  assert.deepEqual(fautes([nom('a', 'button/foregruond/text')]).map((q) => q.proposition), [['foreground']]);
  assert.deepEqual(fautes([nom('a', 'button/backgruond/text')]).map((q) => q.proposition), [['background']]);
});

test('la faute plus employée que son terme reste une faute : le vocabulaire départage, pas le nombre d’emplois', () => {
  const noms = [...Array.from({ length: 12 }, (_, i) => nom(`m-${i}`, `button/${i}/backgrond`)), nom('b', 'button/x/background')];
  assert.deepEqual(fautes(noms).map((q) => [q.terme.mot, q.proposition[0], q.reference?.nombre]), [['backgrond', 'background', 1]]);
});

test('une faute ou un mot collé d’un seul nom arrive dans les questions, pas dans les autres pistes (Q-F3)', () => {
  const faute = detecterLesQuestions(lexique([nom('seul', 'button/primary/backgrond')]), index, vide);
  assert.deepEqual(faute.questions.map((q) => q.cle), ['ecriture-du-terme:faute:backgrond|background']);
  assert.deepEqual(faute.autres, []);
  const colle = detecterLesQuestions(lexique([nom('c', 'colors/contrasttext/bg'), nom('a', 'colors/contrast/bg'), nom('b', 'colors/text/bg')]), index, vide);
  const motColle = colle.questions.find((q) => q.type === 'ecriture-du-terme' && q.indice === 'mots-colles');
  assert.equal(motColle?.type === 'ecriture-du-terme' && motColle.terme.nombre, 1);
  assert.equal(motColle?.score, 1);
});

test('un mot de deux lettres ou moins ne donne jamais de faute (E15, E16.2)', () => {
  assert.equal(LONGUEUR_MINIMALE_D_UNE_FAUTE_A_UNE_LETTRE, 7);
  assert.equal(LONGUEUR_MINIMALE_D_UNE_FAUTE_D_UN_MOT_COURT, 3);
  assert.deepEqual(fautes([nom('a', 'button/sm/text'), nom('b', 'button/gp/text'), nom('c', 'button/md/text'), nom('d', 'button/bg/text')]), [], 'deux lettres');
  assert.deepEqual(fautes([nom('a', 'set/cot/value'), nom('b', 'set/cat/value')]), [], 'cat et cot ne sont pas des termes connus');
  assert.equal(fautes([nom('a', 'button/warnning/text')]).length, 1, 'sept lettres : la règle d’E2b ne change pas');
});

// E15
test('un mot de 4 à 6 lettres à une lettre d’un terme connu est une faute s’il n’est pas un mot connu (E15)', () => {
  const proposition = (mot: string) => fautes([nom('a', `button/${mot}/text`)]).map((q) => q.proposition[0]);
  assert.deepEqual(proposition('colr'), ['color'], 'quatre lettres, lettre retirée');
  assert.deepEqual(proposition('hovr'), ['hover'], 'quatre lettres, lettre retirée');
  assert.deepEqual(proposition('bordr'), ['border'], 'cinq lettres, lettre retirée');
  assert.deepEqual(proposition('bordre'), ['border'], 'six lettres, échange de deux voisines');
  assert.deepEqual(proposition('sucess'), ['success'], 'six lettres, lettre retirée');
  assert.deepEqual(proposition('warnng'), ['warning'], 'six lettres, lettre retirée');
  assert.deepEqual(proposition('gapp'), ['gap'], 'quatre lettres près d’un terme de trois lettres');
  assert.deepEqual(proposition('icom'), ['icon'], 'quatre lettres, lettre remplacée');
});

test('un mot connu ne devient jamais une faute (E15)', () => {
  for (const mot of ['next', 'colon', 'color', 'text', 'icon', 'item', 'hover', 'colors']) assert.deepEqual(fautes([nom('a', `button/${mot}/text`)]), [], mot);
  // Sans le dictionnaire, `cover` serait une faute de `hover` et `dagger` une faute de `danger`. `next` et `colon` restent muets sans lui depuis E16.6 : ils sont des mots distincts de `text` et de `color`.
  remplacerLesMotsConnus([]);
  try {
    assert.deepEqual(fautes([nom('a', 'button/cover/text')]).map((q) => q.proposition[0]), ['hover']);
    assert.deepEqual(fautes([nom('a', 'button/dagger/text')]).map((q) => q.proposition[0]), ['danger']);
    assert.deepEqual(fautes([nom('a', 'button/next/text')]), [], 'E16.6');
  } finally { remplacerLesMotsConnus(); }
  assert.deepEqual(fautes([nom('a', 'button/cover/text')]), []);
});

test('au-dessus de six lettres, le dictionnaire n’est pas lu (E15)', () => {
  // `backgrond` n’est dans aucune liste ; un dictionnaire qui le connaîtrait ne doit pas le taire.
  remplacerLesMotsConnus(['backgrond', 'warnning']);
  try {
    assert.equal(fautes([nom('a', 'button/backgrond/text')]).length, 1);
    assert.equal(fautes([nom('a', 'button/warnning/text')]).length, 1);
  } finally { remplacerLesMotsConnus(); }
});

test('le dictionnaire des mots connus tient son format (E15)', () => {
  for (const mot of ['next', 'colon', 'under', 'light', 'shadow', 'radius', 'border']) assert.ok(motConnu(mot), mot);
  for (const mot of ['colr', 'hovr', 'bordr', 'tex', 'gao', 'sm', 'backgrond']) assert.equal(motConnu(mot), false, mot);
  for (const mot of ['cap', 'cat', 'btn', 'cjk']) assert.ok(motConnu(mot), `${mot} : un mot anglais ou un segment de design system de 3 lettres (E16.2)`);
  assert.ok(motConnu('NEXT'), 'la casse ne change rien');
  const mots = motsAnglaisConnus();
  assert.ok(mots.length >= 10_000 && mots.length <= 20_000, `${mots.length} mots anglais`);
  assert.ok(mots.every((mot) => /^[a-z]{3,6}$/.test(mot)), 'minuscules, de 3 à 6 lettres (E16.2)');
  assert.equal(new Set(mots).size, mots.length, 'sans doublon');
  assert.ok(readFileSync(new URL('../src/referentiel/mots-connus-donnees.ts', import.meta.url)).length <= 200_000, '200 Ko au plus');
  assert.match(readFileSync(new URL('../src/referentiel/mots-connus.LICENCE.txt', import.meta.url), 'utf8'), /Kevin Atkinson/u, 'la notice de licence est à côté du module');
});

test('un mot juste, une forme ou un mot jugé ne donne pas de faute', () => {
  assert.deepEqual(fautes([nom('a', 'button/backgrounds/text')]), [], 'pluriel d’un terme connu');
  assert.deepEqual(fautes([nom('a', 'button/background/text')]), []);
  const noms = [nom('a', 'button/backgrond/text')];
  assert.equal(fautes(noms).length, 1);
  assert.deepEqual(fautes(noms, { ...vide, voulus: ['backgrond'] }), []);
  assert.deepEqual(fautes(noms, { ...vide, distincts: [['backgrond', 'background']] }), []);
  assert.deepEqual(fautes(noms, { ...vide, plusTard: ['ecriture-du-terme:faute:backgrond|background'] }), []);
});

test('la référence UCM prime un terme connu plus employé pour une faute', () => {
  const noms = [nom('rare', 'set/foregrund/value'), ...Array.from({ length: 5 }, (_, i) => nom(`ucm-${i}`, 'set/foreground/value'))];
  assert.deepEqual(fautes(noms).map((q) => q.proposition), [['foreground']]);
});

test('deux mots hors vocabulaire à une lettre donnent la question de couple proche, le plus employé proposé (Q-F1)', () => {
  const noms = [...Array.from({ length: 40 }, (_, i) => nom(`m-${i}`, `color/harvest/${i}`)), nom('r', 'color/harvset/1')];
  const [question, ...autres] = questions(noms).filter((q) => q.type === 'paire');
  assert.deepEqual(autres, []);
  assert.ok(question?.type === 'paire');
  assert.equal(question.indice, 'ecriture-proche');
  assert.equal(question.termes[question.propose].mot, 'harvest');
  assert.deepEqual(fautes(noms), [], 'une seule question pour deux mots inconnus');
});

// E2.4
test('une faute de deux lettres donne une question au-dessus de son seuil (Q-F9)', () => {
  assert.equal(LONGUEUR_MINIMALE_D_UNE_FAUTE_A_DEUX_LETTRES, 8);
  assert.ok(LONGUEUR_MINIMALE_D_UNE_FAUTE_A_DEUX_LETTRES >= LONGUEUR_MINIMALE_D_UNE_FAUTE_A_UNE_LETTRE);
  const [faute] = fautes([nom('a', 'button/backgrnd/text')]);
  assert.equal(faute?.terme.mot, 'backgrnd');
  assert.deepEqual(faute?.proposition, ['background']);
  assert.deepEqual(fautes([nom('a', 'button/foregrnd/text')]).map((q) => q.proposition), [['foreground']]);
});

test('une faute de deux lettres sous son seuil ne donne rien, et une lettre garde la priorité', () => {
  assert.deepEqual(fautes([nom('a', 'button/divdr/text')]), [], 'cinq lettres');
  assert.deepEqual(fautes([nom('a', 'button/warnnxg/text')]), [], 'sept lettres, deux éditions : sous le seuil de deux lettres');
  assert.deepEqual(fautes([nom('a', 'button/backgrond/text')]).map((q) => q.proposition[0]), ['background'], 'une lettre');
});

test('une négation nomme l’état opposé : ce n’est pas une faute de deux lettres', () => {
  assert.deepEqual(fautes([nom('a', 'button/inactive/fill')]), []);
  assert.deepEqual(fautes([nom('a', 'button/unselected/fill')]), []);
});

test('l’ordre des noms ne change pas les fautes', () => {
  const noms = [nom('a', 'set/backgrond/x'), nom('b', 'set/foregruond/x'), nom('c', 'set/backgrnd/x')];
  const cles = (entrees: readonly NomLu[]) => fautes(entrees).map((q) => q.cle);
  assert.deepEqual(cles(noms), cles([...noms].reverse()));
  assert.equal(cles(noms).length, 3);
});

test('mots collés exige une segmentation en mots du lexique', () => {
  const noms = [nom('colle', 'colors/contrasttext/bg'), nom('a', 'colors/contrast/bg'), nom('b', 'colors/text/bg')];
  const question = questions(noms).find((q) => q.type === 'ecriture-du-terme' && q.indice === 'mots-colles');
  assert.deepEqual(question?.type === 'ecriture-du-terme' && question.proposition, ['contrast', 'text']);
  assert.equal(questions([nom('seul', 'colors/contrasttext/bg')]).some((q) => q.type === 'ecriture-du-terme'), false);
  assert.equal(questions([nom('colle', 'colors/contrasttext/bg'), nom('a', 'other/contrast/fg'), nom('b', 'other/text/fg')]
    ).some((q) => q.type === 'ecriture-du-terme' && q.indice === 'mots-colles'), false);
  const court = questions([nom('colle', 'parts/atone/value'), nom('a', 'parts/a/value'), nom('b', 'parts/tone/value')]);
  assert.equal(court.some((q) => q.type === 'ecriture-du-terme' && q.indice === 'mots-colles'), false);
  const sansMotExact = questions([nom('colle', 'colors/foobar/bg'), nom('a', 'colors/foo/bg'), nom('b', 'colors/bar/bg')]);
  assert.equal(sansMotExact.some((q) => q.type === 'ecriture-du-terme' && q.indice === 'mots-colles'), false);
  const autreDecoupage = questions([nom('colle', 'colors/texttone/bg'), nom('faux', 'other/tex/fg'),
    nom('suite', 'colors/ttone/bg'), nom('vrai-a', 'colors/text/bg'), nom('vrai-b', 'colors/tone/bg')]);
  const choix = autreDecoupage.find((q) => q.type === 'ecriture-du-terme' && q.indice === 'mots-colles');
  assert.deepEqual(choix?.type === 'ecriture-du-terme' && choix.proposition, ['text', 'tone']);
});

test('une collection inconnue donne sa question', () => {
  const noms = [nom('sm', 'sizes/sm/value'), nom('small', 'sizes/small/value'),
    { id: JSON.stringify(['collection', 'custom-id']), nom: 'Custom Colors', categorie: 'collections' as const, portee: 'document' }];
  const resultat = questions(noms);
  const collection = resultat.find((q) => q.type === 'collection');
  // Décision T06 : `small` est une forme tolérée de `sm`, remplacée sans question.
  assert.equal(collection?.type === 'collection' && collection.collectionId, JSON.stringify(['collection', 'custom-id']));
  assert.equal(questions([{ id: 'standard', nom: 'Color Brands', categorie: 'collections', portee: 'document' }]).length, 0);
});

test('une collection emploie son id opaque pour compter ses variables et une réponse gardée', () => {
  const noms: NomLu[] = [{ id: 'c1', nom: 'Custom Colors', categorie: 'collections', portee: 'document' },
    nom('a', 'colors/a/value', 'c1'), nom('b', 'colors/b/value', 'c1')];
  const question = questions(noms).find((q) => q.type === 'collection');
  assert.equal(question?.type === 'collection' && question.collectionId, 'c1');
  assert.equal(question?.type === 'collection' && question.nombre, 2);
  assert.equal(question?.score, 2);
  assert.equal(questions(noms, { ...vide, collectionsGardees: ['c1'] }).some((q) => q.type === 'collection'), false);
});

test('les remplacements et les décisions écartent les questions déjà jugées', () => {
  const noms = [nom('a', 'states/hover/solid'), nom('b', 'states/hovered/solid'),
    nom('c', 'states/error/solid'), nom('d', 'states/danger/solid'),
    { id: JSON.stringify(['collection', 'c1']), nom: 'Custom Colors', categorie: 'collections' as const, portee: 'document' }];
  // E-08 : `hovered` et `error` se renomment vers un nom déjà pris, donc les deux questions sortent, et chaque réponse les écarte.
  assert.deepEqual(paires(noms), ['paire:hover|hovered', 'paire:danger|error'].sort((a, b) => paires(noms).indexOf(a) - paires(noms).indexOf(b)));
  assert.deepEqual(paires(noms, { ...vide, distincts: [['danger', 'error'], ['hover', 'hovered']] }), []);
  assert.deepEqual(paires(noms, { ...vide, voulus: ['danger', 'hovered'] }), []);
  assert.deepEqual(paires(noms, { ...vide, plusTard: ['paire:danger|error', 'paire:hover|hovered'] }), []);
  assert.equal(questions(noms, { ...vide, collectionsGardees: [JSON.stringify(['collection', 'c1'])] }).some((q) => q.type === 'collection'), false);
});

test('un remplacement dans une catégorie ne couvre pas les occurrences d’une autre', () => {
  const noms: NomLu[] = [nom('a', 'states/status/solid'), nom('b', 'states/statuses/solid'),
    { id: 'property', nom: 'status', categorie: 'proprietes', portee: 'component-1' }];
  assert.deepEqual(paires(noms), ['paire:status|statuses']);
});

test('une réponse voulue ou reportée écarte aussi l’écriture', () => {
  const noms = [nom('a', 'sizes/sm/value'), nom('b', 'sizes/small/value'),
    nom('c', 'colors/contrasttext/bg'), nom('d', 'colors/contrast/bg'), nom('e', 'colors/text/bg')];
  assert.equal(questions(noms, { ...vide, voulus: ['contrast'] }).some((q) => q.type === 'ecriture-du-terme' && q.indice === 'mots-colles'), false);
  const colle = questions(noms).find((q) => q.type === 'ecriture-du-terme' && q.indice === 'mots-colles');
  assert.ok(colle);
  assert.equal(questions(noms, { ...vide, plusTard: [colle.cle] }).some((q) => q.cle === colle.cle), false);
});

test('Radius/sm et Button/Size/Small/padding-y ne produisent aucune question', () => {
  const noms = [nom('a', 'Radius/sm'), nom('b', 'Button/Size/Small/padding-y')];
  assert.deepEqual(questions(noms), []);
  const parCategorie = [nom('a', 'Radius/sm'), { ...nom('b', 'Button/Size/Small/padding-y'), categoriesDesSegments: [null, null, 'groupes', null] as const },
    nom('c', 'Radius/md'), { ...nom('d', 'Button/Size/Medium/padding-y'), categoriesDesSegments: [null, null, 'groupes', null] as const }];
  assert.deepEqual(questions(parCategorie), []);
  // E-08 : `Small` se renomme en `sm`, nom déjà pris par `Size/sm` : la question remplace le silence.
  assert.deepEqual(questions([nom('a', 'Size/sm'), nom('b', 'Size/Small'), nom('c', 'Size/md'), nom('d', 'Size/Medium')]).map((q) => q.cle).sort(), ['paire:md|medium', 'paire:sm|small']);
  assert.deepEqual(questions([nom('a', 'Size/sm'), nom('c', 'Size/md')]), []);
});

test('l’ordre des noms ne change ni les clés ni les propositions', () => {
  const noms = [nom('a', 'states/danger/solid'), nom('b', 'states/error/solid'),
    nom('c', 'states/bg/solid'), nom('d', 'states/background/solid'),
    nom('e', 'shapes/cat/value'), ...Array.from({ length: 5 }, (_, i) => nom(`f-${i}`, 'shapes/cot/value'))];
  const resume = (entrees: readonly NomLu[]) => questions(entrees).map((q) => ({ cle: q.cle, score: q.score,
    proposition: q.type === 'paire' ? q.termes[q.propose].mot : q.type === 'ecriture-du-terme' ? q.proposition : null }));
  assert.deepEqual(resume(noms), resume([...noms].reverse()));
});

test('score, seuil et plafond classent les noms distincts puis gardent les autres pistes', () => {
  const noms = [nom('a', 'states/active/solid'), nom('b', 'states/pressed/solid'),
    nom('c', 'states/pressed/solid'), nom('d', 'colors/paint/bg'), nom('e', 'colors/painted/bg')];
  const resultat = detecterLesQuestions(lexique(noms), index, vide, { seuil: 3, maximum: 1 });
  assert.deepEqual(resultat.questions.map((q) => q.cle), ['paire:active|pressed']);
  assert.ok(resultat.autres.some((q) => q.cle === 'paire:paint|painted'));
});

test('un jeu sain ne produit aucune question linguistique', () => {
  const noms = [nom('a', 'colors/primary/500'), nom('b', 'colors/secondary/600'),
    nom('c', 'typography/body/large', 'collection-2')];
  assert.deepEqual(questions(noms), []);
});

test('chaque terminaison et chaque pluriel ont un exemple attesté', () => {
  for (const [base, derive, indice] of [
    ['paint', 'painted', 'terminaison'], ['fade', 'faded', 'terminaison'], ['load', 'loading', 'terminaison'],
    ['badge', 'badges', 'pluriel'], ['box', 'boxes', 'pluriel'],
  ]) {
    const paire = questions([nom('a', `set/${base}/value`), nom('b', `set/${derive}/value`)])
      .find((q) => q.type === 'paire');
    assert.equal(paire?.type === 'paire' && paire.indice, indice);
  }
});

// E2c

const proprietes = (id: string, chemin: string): NomLu => ({ id, nom: chemin, portee: 'collection-1', categorie: 'proprietes' });

// E2.6
test('une forme tolérée dont le renommage est bloqué par une collision pose une question (E-08)', () => {
  const freres = [nom('a', 'theme/separator/fill'), nom('b', 'theme/divider/fill')];
  const [question] = questions(freres).filter((q) => q.type === 'paire');
  assert.ok(question?.type === 'paire');
  assert.equal(question.cle, 'paire:divider|separator');
  assert.equal(question.indice, 'synonymes');
  assert.equal(question.termes[question.propose].mot, 'divider', 'le terme UCM est proposé');
  assert.deepEqual(paires([nom('a', 'theme/separator/fill'), nom('b', 'theme/divider/stroke')]), ['paire:divider|separator'], 'E16.3 : sans collision, les deux termes UCM dans le fichier posent la question de choix');
  assert.deepEqual(questions([nom('a', 'theme/separator/fill')]), [], 'seule, la forme se renomme');
  assert.deepEqual(paires(freres, { ...vide, distincts: [['divider', 'separator']] }), []);
  assert.deepEqual(paires(freres, { ...vide, plusTard: ['paire:divider|separator'] }), []);
});

test('une collision n’accuse que les formes des segments qui diffèrent (E-08)', () => {
  const noms = [nom('a', 'colors/radius/default'), nom('b', 'colors/border-radius/default')];
  assert.deepEqual(paires(noms), ['paire:border-radius|radius'], '`colors` se renomme sans cause de blocage');
});

test('un bloc gardé entier donne une question au lieu du silence (E-09)', () => {
  // `etatXyzzy` reste un seul terme pour le renommage (un mot du bloc est inconnu) : `etat` n'y est donc jamais remplacé.
  const [question] = questions([proprietes('a', 'etatXyzzy')]).filter((q) => q.type === 'paire');
  assert.ok(question?.type === 'paire');
  assert.equal(question.cle, 'paire:etat|state');
  assert.equal(question.termes[question.propose].mot, 'state');
  assert.deepEqual(questions([proprietes('a', 'etat-strong')]), [], 'un bloc que le renommage lit n’en donne pas');
});

test('le pluriel d’un terme ou d’une forme d’un registre, sans son singulier au fichier, donne une question (E-10)', () => {
  assert.deepEqual(paires([nom('a', 'theme/separators/fill')]), ['paire:separator|separators']);
  assert.deepEqual(paires([nom('a', 'button/widths/fill')]), ['paire:width|widths'], 'un terme de REGISTRES_COMPOSANTS (E-04)');
  assert.deepEqual(paires([nom('a', 'theme/colors/fill')]), [], 'un pluriel que le référentiel connaît se renomme');
  assert.deepEqual(paires([nom('a', 'theme/separators/fill')], { ...vide, distincts: [['separator', 'separators']] }), []);
});

test('une faute d’un terme de registre de composant est lue (E-04)', () => {
  assert.deepEqual(fautes([nom('a', 'button/paddign/fill')]).map((q) => q.proposition), [['padding']], 'échange de deux lettres');
  assert.deepEqual(fautes([nom('a', 'button/pnadding/fill')]).map((q) => q.proposition), [['padding']], 'échange de deux lettres');
  assert.deepEqual(fautes([nom('a', 'button/padding/fill'), nom('b', 'button/paddings/fill')]), [], 'padding est juste, paddings est un pluriel');
});

test('une faute d’une forme tolérée propose le terme UCM (N-02)', () => {
  const [faute] = fautes([nom('a', 'theme/attebtion/fill')]);
  assert.deepEqual(faute?.proposition, ['warning']);
  assert.deepEqual(faute?.reference, { mot: 'warning', nombre: 0 });
  assert.equal(faute?.cle, 'ecriture-du-terme:faute:attebtion|warning');
});

test('une référence jugée se replie sur la suivante au lieu de bloquer (E-06)', () => {
  // `disabley` est à une lettre de `disable` et de `disabled` ; `disable` est une forme tolérée de `disabled` (N-02).
  const noms = [nom('a', 'theme/disabley/fill')];
  assert.deepEqual(fautes(noms).map((q) => q.proposition), [['disabled']]);
  assert.deepEqual(fautes(noms, { ...vide, distincts: [['disabley', 'disable']] }).map((q) => q.proposition), [['disabled']], 'la première référence jugée laisse la seconde');
  assert.deepEqual(fautes(noms, { ...vide, distincts: [['disabley', 'disabled']] }), [], 'les deux candidats mènent à un terme jugé');
  assert.deepEqual(fautes(noms, { ...vide, voulus: ['disabled'] }), []);
});

test('les groupes de synonymes classés entrent dans la table du référentiel (E-11)', () => {
  const classes = (JSON.parse(readFileSync(new URL('./stress/f1-noms/donnees/synonymes.json', import.meta.url), 'utf8')) as { groupes: string[][] }).groupes;
  for (const groupe of classes) {
    const retenu = SYNONYMES_COURANTS.find((candidat) => groupe.every((mot) => (candidat as readonly string[]).includes(mot)));
    assert.ok(retenu, `${groupe.join(', ')} est absent de SYNONYMES_COURANTS`);
  }
  assert.ok(SYNONYMES_COURANTS.some((groupe) => (groupe as readonly string[]).includes('muted') && (groupe as readonly string[]).includes('subtle')));
});

test('un synonyme seul donne une question quand son terme UCM est unique (Q-F5)', () => {
  assert.deepEqual(paires([nom('a', 'theme/muted/fill')]), ['paire:muted|subtle']);
  assert.deepEqual(paires([nom('a', 'theme/content/fill')]), ['paire:content|foreground']);
  assert.deepEqual(paires([nom('a', 'theme/subtle/fill')]), [], 'le terme UCM seul ne demande rien');
  assert.deepEqual(paires([nom('a', 'theme/btn/fill')]), [], 'une abréviation sans terme UCM unique : une information sans action, pas une question');
  assert.deepEqual(paires([nom('a', 'theme/muted/fill')], { ...vide, voulus: ['muted'] }), []);
});

// E2.7
test('gray et grey restent un choix du designer même quand une forme est plus fréquente', () => {
  const noms = [nom('a', 'neutral/gray/bg'), nom('b', 'neutral/gray/fg'), nom('c', 'neutral/grey/bg')];
  const paire = questions(noms).find((question) => question.cle === 'paire:gray|grey');
  assert.equal(paire?.type, 'paire');
  if (paire?.type !== 'paire') return;
  assert.equal(paire.indice, 'synonymes');
  assert.deepEqual(paire.termes.map(({ mot, nombre, ucm }) => ({ mot, nombre, ucm })), [
    { mot: 'gray', nombre: 2, ucm: false }, { mot: 'grey', nombre: 1, ucm: false },
  ]);
  assert.equal(paire.termes[paire.propose].mot, 'gray');
  assert.deepEqual(paires(noms.filter(({ id }) => id !== 'c')), []);
  assert.deepEqual(paires([noms[2]]), []);
  assert.deepEqual(paires(noms, { ...vide, voulus: ['grey'] }), []);
  assert.deepEqual(paires(noms, { ...vide, distincts: [['grey', 'gray']] }), []);
  assert.deepEqual(paires(noms, { ...vide, plusTard: [paire.cle] }), []);
});

test('deux orthographes d’un même mot que ni le pluriel ni la terminaison ne relient donnent une question (Q-F6)', () => {
  const memePlace = [nom('a', 'neutral/gray/bg'), nom('b', 'neutral/grey/bg')];
  assert.deepEqual(questions(memePlace).filter((q) => q.type === 'paire').map((q) => [q.cle, q.indice]), [['paire:gray|grey', 'synonymes']]);
  assert.deepEqual(paires([nom('a', 'neutral/gray/bg'), nom('b', 'surface/grey/fg')]), [], 'sans place partagée, rien à choisir');
  assert.deepEqual(paires(memePlace, { ...vide, distincts: [['gray', 'grey']] }), [], 'une réponse « termes différents » écarte la question');
  assert.deepEqual(paires([nom('a', 'a/colors/bg'), nom('b', 'a/colours/bg')]).sort(), ['paire:color|colors', 'paire:color|colours'], 'colors et colours se rejoignent sur color');
  assert.deepEqual(paires([nom('a', 'a/lines/bg'), nom('b', 'a/line/bg')]), ['paire:line|lines'], 'un pluriel garde son indice');
  assert.equal(questions([nom('a', 'a/lines/bg'), nom('b', 'a/line/bg')]).find((q) => q.type === 'paire')?.indice, 'pluriel');
});

function branches(nombre: number): NomLu[] {
  const noms: NomLu[] = [];
  const mot = (rang: number) => `${String.fromCharCode(97 + (rang % 26))}${String.fromCharCode(97 + Math.floor(rang / 26))}`.repeat(2);
  for (let branche = 0; branche < nombre; branche++) {
    const dossier = mot(branche).toUpperCase();
    for (let k = 0; k < 5; k++) noms.push(nom(`${dossier}-${k}`, `palette/${dossier}/${mot(40 + k)}/${mot(80 + k)}`));
    if (branche < 2) noms.push(nom(`${dossier}-d`, `palette/${dossier}/${mot(45)}/${branche === 0 ? 'small' : 'smalll'}`));
  }
  return noms;
}

test('des branches parallèles se lisent au-delà de 12 branches sœurs (E-45)', () => {
  const pairesDeBranches = (noms: readonly NomLu[]) => questions(noms).filter((q) => q.type === 'paire' && q.indice === 'branches-paralleles').map((q) => q.cle);
  for (const nombre of [2, 12, 13, 20, 50]) assert.deepEqual(pairesDeBranches(branches(nombre)), ['paire:small|smalll'], `${nombre} branches`);
  assert.deepEqual(pairesDeBranches(branches(51)), [], 'au-delà de 50 branches, la clé est ignorée pour borner le calcul');
});

test('une collection à une lettre d’une collection UCM propose celle-ci (Q-F8, E-15)', () => {
  const collection = (id: string, nomDeCollection: string): NomLu => ({ id, nom: nomDeCollection, categorie: 'collections', portee: 'document' });
  const proposee = (nomDeCollection: string) => {
    const question = questions([collection('c1', nomDeCollection), nom('v', 'a/b', 'c1')]).find((q) => q.type === 'collection');
    return question?.type === 'collection' ? (question.proposee ?? null) : undefined;
  };
  assert.equal(proposee('thme'), 'theme');
  assert.equal(proposee('Theeme'), 'theme');
  assert.equal(proposee('lyaout'), 'layout');
  assert.equal(proposee('Custom Colors'), null, 'aucune collection à une lettre : la question reste sans proposition');
});

test('une règle personnalisée retire ses occurrences des détecteurs', () => {
  const personnalise = indexerVocabulaire({ personnalises: [{ terme: ['paint'], remplace: [['painted']] }], ecartsUcm: [] }).index;
  const resultat = detecterLesQuestions(lexique([nom('a', 'set/paint/value'), nom('b', 'set/painted/value')]), personnalise, vide);
  assert.deepEqual(resultat, { questions: [], autres: [] });
});

test('32 000 noms conservent les comptes et le plafond de questions', (t) => {
  const noms = (nombre: number) => Array.from({ length: nombre }, (_, i) => nom(`n-${i}`, `Button ${Math.floor(i / 32)}/State Hover/Font Size ${i}`, `c${i % 8}`));
  const mesurer = (source: ReturnType<typeof lexique>) => {
    const debut = performance.now();
    const resultat = detecterLesQuestions(source, index, vide);
    return { resultat, duree: performance.now() - debut };
  };
  const petit = mesurer(lexique(noms(3_200)));
  const { resultat, duree } = mesurer(lexique(noms(32_000)));
  t.diagnostic(`Détection de 3 200 noms : ${petit.duree.toFixed(1)} ms ; de 32 000 noms : ${duree.toFixed(1)} ms`);
  // L'objectif d'une seconde se mesure par `Mesures/mesurer-performances.ts` (521 ms sur le poste de référence).
  // Une borne absolue échouait sous la charge du runner de publication (5 427 ms pour 5 000) : le test compare deux tailles sur la
  // même machine. Dix fois plus de noms coûtent dix fois plus en linéaire ; 30 laisse le bruit et refuse une croissance quadratique (100).
  assert.ok(duree < 30 * Math.max(petit.duree, 50), `${petit.duree.toFixed(1)} ms puis ${duree.toFixed(1)} ms`);
  assert.ok(duree < 20_000, `${duree.toFixed(1)} ms`);
  assert.ok(resultat.questions.length <= 10);
  assert.deepEqual([...resultat.questions, ...resultat.autres], []);
});

test('le générateur cède au plus tous les deux cents noms', () => {
  const noms = Array.from({ length: 1_000 }, (_, i) => nom(`n-${i}`, `colors/group${i % 8}/tone${i % 8}`));
  const source = lexique(noms);
  let lus = 0;
  const suivis = { values: function* () { for (const entree of source.noms.values()) { lus++; yield entree; } } } as unknown as typeof source.noms;
  const calcul = detecterParEtapes({ ...source, noms: suivis }, index, vide);
  let etape = calcul.next(), precedent = 0, pauses = 0;
  while (!etape.done) {
    assert.ok(lus - precedent <= 200, `${lus - precedent} noms avant une pause`);
    precedent = lus;
    pauses++;
    etape = calcul.next();
  }
  assert.ok(lus - precedent <= 200);
  assert.ok(pauses >= 5);
  assert.deepEqual(etape.value.questions, []);
});

test('les questions cèdent avant onze recherches de remplacements', () => {
  const source = lexique(Array.from({ length: 450 }, (_, rang) => nom(`${rang}`, `group${rang}/value${rang}`)));
  let recherches = 0;
  const surveille = { remplacements: (...args: Parameters<typeof index.remplacements>) => {
    recherches++;
    return index.remplacements(...args);
  } };
  const calcul = detecterParEtapes(source, surveille, vide);
  for (;;) {
    recherches = 0;
    const etape = calcul.next();
    assert.ok(recherches <= 10, `${recherches} recherches dans un seul pas`);
    if (etape.done) { assert.deepEqual(etape.value, { questions: [], autres: [] }); break; }
  }
});

test('les branches cèdent pendant le parcours des masques sans candidat', () => {
  const source = lexique(Array.from({ length: 450 }, (_, rang) => nom(`${rang}`, `group${rang}/section${rang}/value${rang}`)));
  const iterer = Map.prototype[Symbol.iterator];
  const descripteur = Object.getOwnPropertyDescriptor(Map.prototype, Symbol.iterator)!;
  let visites = 0;
  Object.defineProperty(Map.prototype, Symbol.iterator, { ...descripteur, value: function* (this: Map<unknown, unknown>) {
    for (const entree of iterer.call(this)) { visites++; yield entree; }
  } });
  try {
    const calcul = detecterBranchesParalleles(source);
    for (;;) {
      visites = 0;
      const etape = calcul.next();
      assert.ok(visites <= 20, `${visites} entrées de tables dans un seul pas`);
      if (etape.done) { assert.deepEqual(etape.value, []); break; }
    }
  } finally { Object.defineProperty(Map.prototype, Symbol.iterator, descripteur); }
});

test('les masques d’un nom long se construisent entre plusieurs cessions', () => {
  let lectures = 0;
  const source = lexique([nom('long', Array.from({ length: 40 }, (_, rang) => `group${rang}`).join('/'))]);
  const original = source.noms.get('long')!;
  const suivi = { ...original, get id() { lectures++; return 'long'; } };
  const calcul = detecterBranchesParalleles({ ...source, noms: new Map([['long', suivi]]) });
  for (;;) {
    lectures = 0;
    const etape = calcul.next();
    assert.ok(lectures <= 20, `${lectures} masques dans un seul pas`);
    if (etape.done) { assert.deepEqual(etape.value, []); break; }
  }
});

// E14 : trois défauts du kit que le rejeu final de F1 a mesurés, chacun avec la régression qui échoue sans sa correction.

test('une faute dans un morceau de casse mixte est lue, sans que ses voisins soient connus (S16)', () => {
  const [faute, ...autres] = fautes([nom('a', 'colorFillConrent'), nom('b', 'Card/bodyPaddingfSM')]);
  assert.equal(faute?.terme.mot, 'conrent');
  assert.deepEqual(faute?.proposition, ['content']);
  assert.deepEqual(autres.map((q) => q.terme.mot), ['paddingf']);
  assert.deepEqual(fautes([nom('c', 'Menu/darkDeangerItemColor')]).map((q) => [q.terme.mot, q.proposition[0]]), [['deanger', 'danger']]);
});

test('les morceaux de casse mixte ne servent qu’à la faute : aucun terme, aucune paire, aucune faute d’un mot connu (S16, PLAN-VOCABULAIRE)', () => {
  const noms = [nom('a', 'StressTest/Info/TileLinksWrap/Sizes/Gap-x'), nom('b', 'colorFillSecondary')];
  assert.deepEqual(questions(noms), [], 'une tuile, un lien, un mot courant : rien');
  assert.deepEqual(fautes([nom('d', 'Tree/titleHeight')]), [], 'un morceau juste');
});

// E15
test('une faute de 4 à 6 lettres dans un morceau de casse mixte est lue, un morceau connu non (S16)', () => {
  const proposition = (chemin: string) => fautes([nom('a', chemin)]).map((q) => [q.terme.mot, q.proposition[0]]);
  assert.deepEqual(proposition('Tree/titleHeigt'), [['heigt', 'height']], 'six lettres');
  assert.deepEqual(proposition('Button/linkHovr'), [['hovr', 'hover']], 'quatre lettres');
  assert.deepEqual(proposition('colorBgTextk'), [['textk', 'text']], 'cinq lettres');
  assert.deepEqual(proposition('colorwWhite'), [['colorw', 'color']], 'le découpage des mots garde la lettre en trop avec le morceau suivant');
  assert.deepEqual(proposition('colorIinfoTextActive'), [['iinfo', 'info']], 'cinq lettres au milieu du segment');
  assert.deepEqual(proposition('Menu/itemNext'), [], 'next est un mot connu');
  assert.deepEqual(proposition('Menu/itemColon'), [], 'colon est un mot connu');
});

test('un terme de plusieurs mots écrit sans séparateur n’est pas une faute de son premier mot (S9)', () => {
  assert.deepEqual(fautes([nom('a', 'spacing/paddingx'), nom('b', 'spacing/paddingy'), nom('c', 'spacing/padding-top')]), []);
  assert.deepEqual(fautes([nom('d', 'spacing/paddingz')]).map((q) => q.terme.mot), ['paddingz'], 'une vraie lettre en trop reste une faute');
});

test('une collection dont seule la casse est fausse, ou une ancienne forme à la casse fausse, propose la collection UCM (Q-F8)', () => {
  const collection = (nomDeLaCollection: string) => questions([{ id: 'c1', nom: nomDeLaCollection, categorie: 'collections', portee: 'document' }]).find((q) => q.type === 'collection');
  for (const [ecrite, attendue] of [['thEme', 'theme'], ['primiTives', 'primitives'], ['thme', 'theme'], ['layOuts', 'layout'], ['colorutIlities', 'utility']]) {
    const question = collection(ecrite);
    assert.equal(question?.type === 'collection' && question.proposee, attendue, ecrite);
  }
});

test('une faute dans la forme soudée d’un terme de plusieurs mots est lue, et la question propose le terme à tirets (S9)', () => {
  const lues = (chemin: string) => fautes([nom('a', chemin)]).map((q) => [q.terme.mot, q.proposition[0], q.reference?.mot]);
  assert.deepEqual(lues('type/fontsttyle'), [['fontsttyle', 'font-style', 'font-style']]);
  assert.deepEqual(lues('type/borderwiddth'), [['borderwiddth', 'border-width', 'border-width']]);
  assert.deepEqual(lues('type/foregroundmaain'), [['foregroundmaain', 'foreground-main', 'foreground-main']]);
  assert.deepEqual(lues('type/fontstyle'), [], 'le terme soudé lui-même est juste');
});

// E16.1 (nom de composant), E16.2 (trois lettres), E16.3 (synonymes UCM), E16.4 (axe d'états), E16.5 (pluriels), E16.8 (termes de composant collés).

test('la faute d’un nom de composant que le kit connaît est lue, un nom inconnu reste muet (E16.1)', () => {
  const noms = (composant: string) => [nom('a', `components/${composant}/background`)];
  assert.equal(lexique(noms('btton')).natures.get('a')?.[1], 'composant', 'le segment est bien un nom de composant');
  for (const faute of ['btton', 'buttono', 'btuton']) assert.deepEqual(fautes(noms(faute)).map((q) => [q.terme.mot, q.proposition[0]]), [[faute, 'button']], faute);
  assert.deepEqual(fautes(noms('buttons')), [], 'un pluriel reste un pluriel');
  assert.deepEqual(paires(noms('buttons')), [], 'un nom de composant ne fait pas de paire');
  assert.deepEqual(fautes(noms('chip')), [], 'un composant que le kit ne connaît pas');
  assert.deepEqual(fautes(noms('button')), []);
  assert.deepEqual(fautes(noms('Switch')), [], 'un mot connu du dictionnaire');
  assert.deepEqual(fautes(noms('BackTlp')).map((q) => [q.terme.mot, q.proposition[0]]), [['tlp', 'top']], 'le morceau d’un nom en casse mixte');
  assert.deepEqual(fautes(noms('BackTop')), []);
  assert.deepEqual(fautes(noms('ButtonGroup')), []);
});

test('trois lettres : une faute quand le mot est inconnu et qu’un seul terme du kit est à une lettre de lui (E16.2)', () => {
  const proposition = (mot: string) => fautes([nom('a', `button/${mot}/text`)]).map((q) => q.proposition[0]);
  assert.deepEqual(proposition('tex'), ['text']);
  assert.deepEqual(proposition('sze'), ['size']);
  assert.deepEqual(proposition('gao'), ['gap']);
  for (const mot of ['bg', 'btn', 'md', 'gp', 'txt']) assert.deepEqual(proposition(mot), [], `${mot} n'est pas une faute`);
  // Un mot connu du dictionnaire n'est pas une faute : `age` est un mot, à une lettre de `page` seulement.
  assert.ok(motConnu('age'));
  assert.deepEqual(proposition('age'), []);
  remplacerLesMotsConnus([]);
  try { assert.deepEqual(proposition('age'), ['page']); } finally { remplacerLesMotsConnus(); }
  // Deux termes du kit à une lettre (`gap` et `top`) : le kit ne choisit pas.
  assert.equal(motConnu('gop'), false);
  assert.deepEqual(proposition('gop'), []);
  // Aucun terme à une lettre.
  assert.deepEqual(proposition('zqx'), []);
});

test('deux termes UCM synonymes dans le même fichier donnent une question de choix, un seul n’en donne pas (E16.3)', () => {
  const ensemble = [nom('a', 'colors/danger/fill'), nom('b', 'layout/error/fill', 'collection-2'), nom('c', 'layout/error/stroke', 'collection-2')];
  const question = questions(ensemble).find((q) => q.type === 'paire');
  assert.ok(question?.type === 'paire');
  assert.equal(question.cle, 'paire:danger|error');
  assert.equal(question.indice, 'synonymes');
  assert.equal(question.termes[question.propose].mot, 'error', 'le terme le plus employé passe en premier');
  assert.deepEqual(question.termes.map((terme) => [terme.mot, terme.nombre]), [['danger', 1], ['error', 2]]);
  assert.deepEqual(paires([nom('a', 'colors/danger/fill')]), [], 'danger seul');
  assert.deepEqual(paires([nom('a', 'colors/error/fill')]), [], 'error seul');
  assert.deepEqual(paires([nom('a', 'colors/divider/fill'), nom('b', 'layout/separator/fill')]), ['paire:divider|separator']);
  assert.deepEqual(paires(ensemble, { ...vide, distincts: [['danger', 'error']] }), []);
  assert.deepEqual(paires(ensemble, { ...vide, voulus: ['error'] }), []);
  assert.deepEqual(paires(ensemble, { ...vide, plusTard: ['paire:danger|error'] }), []);
});

test('une abréviation ou un terme composé au pluriel donne la question de pluriel (E16.5)', () => {
  assert.deepEqual(paires([nom('a', 'button/bgs/fill')]), ['paire:bg|bgs']);
  assert.deepEqual(paires([nom('a', 'button/focus-rings/fill')]), ['paire:focus-ring|focus-rings'], 'une seule question, pas `ring` et `rings`');
  assert.deepEqual(paires([nom('a', 'button/selected-falses/fill')]), ['paire:selected-false|selected-falses']);
  assert.deepEqual(paires([nom('a', 'button/bg/fill')]), [], 'le singulier seul');
  assert.deepEqual(paires([nom('a', 'button/focus-ring/fill')]), []);
  assert.deepEqual(paires([nom('a', 'button/bgs/fill')], { ...vide, distincts: [['bg', 'bgs']] }), []);
  assert.deepEqual(paires([nom('a', 'button/rings/fill')]), ['paire:ring|rings'], 'un pluriel simple garde sa question');
});

test('un mot collé de termes exacts dont un terme de composant donne la question « écrire padding-width » (E16.8)', () => {
  const colle = (chemin: string) => questions([nom('a', chemin)]).filter((q) => q.type === 'ecriture-du-terme' && q.indice === 'mots-colles');
  const [question] = colle('button/paddingwidth');
  assert.ok(question?.type === 'ecriture-du-terme');
  assert.deepEqual(question.proposition, ['padding', 'width']);
  assert.equal(question.cle, 'ecriture-du-terme:mots-colles:padding|paddingwidth|width');
  assert.deepEqual(colle('button/padding'), [], 'un terme de composant seul');
  assert.deepEqual(colle('button/paddingx'), [], 'le terme soudé padding-x');
  assert.deepEqual(colle('button/iconsizee'), [], 'aucun terme de composant exact');
  assert.deepEqual(questions([nom('a', 'button/paddingwidth')], { ...vide, voulus: ['padding'] }).filter((q) => q.type === 'ecriture-du-terme'), []);
  assert.deepEqual(questions([nom('a', 'button/paddingwidth')], { ...vide, plusTard: [question.cle] }).filter((q) => q.type === 'ecriture-du-terme'), []);
});

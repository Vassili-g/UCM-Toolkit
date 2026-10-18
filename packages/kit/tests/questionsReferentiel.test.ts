import assert from 'node:assert/strict';
import test from 'node:test';
import { commencerLexique, detecterLesQuestions, detecterParEtapes, indexerVocabulaire,
  type DejaJuge, type NomLu, type Question } from '../src/referentiel/index.js';

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
  // Formes tolérées du référentiel (décisions C01 et T03) : remplacées sans question.
  assert.deepEqual(paires([nom('a', 'palette/bg/solid'), nom('b', 'palette/background/solid'),
    nom('c', 'states/danger/solid'), nom('d', 'states/error/solid')]), []);
  assert.deepEqual(paires([nom('unique', 'colors/corner/default')]), []);
  assert.deepEqual(paires([nom('a', 'colors/radius/default'), nom('b', 'colors/corner/default')]), ['paire:corner|radius']);
  assert.deepEqual(paires([nom('a', 'colors/radius/default'), nom('b', 'colors/corner/default')],
    { ...vide, distincts: [['corner', 'radius']] }), []);
  assert.deepEqual(paires([nom('a', 'colors/radius/default'), nom('b', 'colors/corner/default')],
    { ...vide, voulus: ['corner'] }), []);
  // Décision T07 : `border-radius` est une forme tolérée de `radius`.
  assert.deepEqual(paires([nom('a', 'colors/radius/default'), nom('b', 'colors/border-radius/default')]), []);
});

test('les formes d’un même mot sortent sans mot connu et sans voisin commun', () => {
  assert.deepEqual(paires([nom('a', 'button/paint'), nom('b', 'chip/painted')]), ['paire:paint|painted']);
  assert.deepEqual(paires([nom('a', 'button/default/solid'), nom('b', 'card/defaults/outline')]), ['paire:default|defaults']);
  // Une négation nomme l'état opposé : jamais une fusion.
  assert.deepEqual(paires([nom('a', 'button/selected/solid'), nom('b', 'card/unselected/outline')]), []);
  assert.deepEqual(paires([nom('a', 'button/active/solid'), nom('b', 'card/inactive/outline')]), []);
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

test('une faute rare se compare par une seule édition à une forme fréquente', () => {
  const noms = [nom('rare', 'colors/sucess/bg'),
    ...Array.from({ length: 5 }, (_, i) => nom(`ref-${i}`, `colors/sucess${'abcde'[i]}/bg`)),
    ...Array.from({ length: 5 }, (_, i) => nom(`bon-${i}`, 'colors/success/bg'))];
  const faute = questions(noms).find((q) => q.type === 'ecriture-du-terme' && q.indice === 'faute' && q.terme.mot === 'sucess');
  assert.equal(faute?.type === 'ecriture-du-terme' && faute.proposition[0], 'success');
  assert.equal(faute?.type === 'ecriture-du-terme' && faute.reference?.nombre, 5);
});

test('faute courte : insertion, suppression et substitution dans les deux sens', () => {
  for (const [rare, courant] of [['rings', 'ring'], ['rin', 'ring'], ['rong', 'ring']]) {
    const noms = [nom('rare', `set/${rare}/value`), ...Array.from({ length: 5 }, (_, i) => nom(`ref-${i}`, `set/${courant}/value`))];
    const faute = questions(noms).find((q) => q.type === 'ecriture-du-terme' && q.indice === 'faute' && q.terme.mot === rare);
    assert.deepEqual(faute?.type === 'ecriture-du-terme' && faute.proposition, [courant]);
  }
});

test('la référence UCM prime une forme plus fréquente pour une faute', () => {
  const noms = [nom('rare', 'set/rang/value'),
    ...Array.from({ length: 5 }, (_, i) => nom(`ucm-${i}`, 'set/ring/value')),
    ...Array.from({ length: 8 }, (_, i) => nom(`autre-${i}`, 'set/bang/value'))];
  const faute = questions(noms).find((q) => q.type === 'ecriture-du-terme' && q.indice === 'faute' && q.terme.mot === 'rang');
  assert.deepEqual(faute?.type === 'ecriture-du-terme' && faute.proposition, ['ring']);
  const inverse = [nom('ucm', 'set/ring/value'), ...Array.from({ length: 5 }, (_, i) => nom(`autre-${i}`, 'set/rang/value'))];
  assert.equal(questions(inverse).some((q) => q.type === 'ecriture-du-terme' && q.terme.mot === 'ring'), false);
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

test('échelle de tailles et collection inconnue donnent leurs questions propres', () => {
  const noms = [nom('sm', 'sizes/sm/value'), nom('small', 'sizes/small/value'),
    { id: JSON.stringify(['collection', 'custom-id']), nom: 'Custom Colors', categorie: 'collections' as const, portee: 'document' }];
  const resultat = questions(noms);
  const collection = resultat.find((q) => q.type === 'collection');
  // Décision T06 : `small` est une forme tolérée de `sm`, remplacée sans question d'échelle.
  assert.equal(resultat.some((q) => q.type === 'echelle'), false);
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
  assert.equal(paires(noms).includes('paire:hover|hovered'), false);
  assert.deepEqual(paires(noms, { ...vide, distincts: [['danger', 'error']] }), []);
  assert.deepEqual(paires(noms, { ...vide, voulus: ['danger'] }), []);
  assert.deepEqual(paires(noms, { ...vide, plusTard: ['paire:danger|error'] }), []);
  assert.equal(questions(noms, { ...vide, collectionsGardees: [JSON.stringify(['collection', 'c1'])] }).some((q) => q.type === 'collection'), false);
});

test('un remplacement dans une catégorie ne couvre pas les occurrences d’une autre', () => {
  const noms: NomLu[] = [nom('a', 'states/status/solid'), nom('b', 'states/statuses/solid'),
    { id: 'property', nom: 'status', categorie: 'proprietes', portee: 'component-1' }];
  assert.deepEqual(paires(noms), ['paire:status|statuses']);
});

test('une réponse voulue ou reportée écarte aussi écriture et échelle', () => {
  const noms = [nom('a', 'sizes/sm/value'), nom('b', 'sizes/small/value'),
    nom('c', 'colors/contrasttext/bg'), nom('d', 'colors/contrast/bg'), nom('e', 'colors/text/bg')];
  assert.equal(questions(noms, { ...vide, voulus: ['sm'] }).some((q) => q.type === 'echelle'), false);
  assert.equal(questions(noms, { ...vide, voulus: ['contrast'] }).some((q) => q.type === 'ecriture-du-terme' && q.indice === 'mots-colles'), false);
  const colle = questions(noms).find((q) => q.type === 'ecriture-du-terme' && q.indice === 'mots-colles');
  assert.ok(colle);
  assert.equal(questions(noms, { ...vide, plusTard: [colle.cle] }).some((q) => q.cle === colle.cle), false);
});

test('les tailles en mots entiers ne font plus de question d’échelle (décision T06)', () => {
  const noms = [nom('a', 'sizes/sm/small'), nom('b', 'sizes/small/sm')];
  assert.equal(questions(noms).some((q) => q.type === 'echelle'), false);
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

test('les décisions de termes distincts et voulus retirent les fautes', () => {
  const noms = [nom('rare', 'set/cot/value'), ...Array.from({ length: 5 }, (_, i) => nom(`ref-${i}`, 'set/cat/value'))];
  for (const decision of [{ ...vide, distincts: [['cot', 'cat']] as const }, { ...vide, voulus: ['cat'] }]) {
    assert.equal(questions(noms, decision).some((q) => q.type === 'ecriture-du-terme' && q.indice === 'faute'), false);
  }
  assert.equal(questions(noms.slice(0, 5)).some((q) => q.type === 'ecriture-du-terme'), false);
  assert.equal(questions([...noms, nom('rare-2', 'set/cot/value'), nom('rare-3', 'set/cot/value')])
    .some((q) => q.type === 'ecriture-du-terme'), false);
});

test('une règle personnalisée retire ses occurrences des détecteurs', () => {
  const personnalise = indexerVocabulaire({ personnalises: [{ terme: ['paint'], remplace: [['painted']] }], ecartsUcm: [] }).index;
  const resultat = detecterLesQuestions(lexique([nom('a', 'set/paint/value'), nom('b', 'set/painted/value')]), personnalise, vide);
  assert.deepEqual(resultat, { questions: [], autres: [] });
});

test('deux écritures de taille sur des tailles différentes ne font pas de question (décision T06)', () => {
  assert.equal(questions([nom('a', 'sizes/sm/value'), nom('b', 'sizes/large/value')]).some((q) => q.type === 'echelle'), false);
});

test('32 000 noms conservent les comptes et le plafond de questions', (t) => {
  const noms = Array.from({ length: 32_000 }, (_, i) => nom(`n-${i}`, `Button ${Math.floor(i / 32)}/State Hover/Font Size ${i}`, `c${i % 8}`));
  const source = lexique(noms);
  const debut = performance.now();
  const resultat = detecterLesQuestions(source, index, vide);
  const duree = performance.now() - debut;
  t.diagnostic(`Détection de 32 000 noms : ${duree.toFixed(1)} ms`);
  // L'objectif d'une seconde se mesure par `Mesures/mesurer-performances.ts` (521 ms sur le poste de référence) ;
  // le runner de la CI est environ 2,5 fois plus lent, et cette borne ne retient qu'une régression d'ordre de grandeur.
  assert.ok(duree < 5_000, `${duree.toFixed(1)} ms`);
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

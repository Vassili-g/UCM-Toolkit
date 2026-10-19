import assert from 'node:assert/strict';
import test from 'node:test';
import { commencerLexique, detecterLesQuestions, indexerVocabulaire,
  type DejaJuge, type NomLu, type Question } from '../src/referentiel/index.js';
import { decouperPourQuestions } from '../src/referentiel/termes-connus.js';
import { decouperSegment } from '../src/referentiel/ecriture-des-mots.js';

const index = indexerVocabulaire({ personnalises: [], ecartsUcm: [] }).index;
const vide: DejaJuge = { distincts: [], plusTard: [], voulus: [], collectionsGardees: [] };

function nom(id: string, chemin: string, portee = 'collection-1', cibleAlias?: string): NomLu {
  return { id, nom: chemin, portee, categorie: 'variables', ...(cibleAlias ? { cibleAlias } : {}) };
}

function questions(noms: readonly NomLu[]): Question[] {
  const preparation = commencerLexique();
  preparation.ajouter(noms);
  const calcul = preparation.terminer();
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  const resultat = detecterLesQuestions(etape.value, index, vide, { seuil: 0, maximum: 500 });
  return [...resultat.questions];
}

const paires = (noms: readonly NomLu[]): string[] => questions(noms).filter((q) => q.type === 'paire').map((q) => q.cle).sort();

test('le découpage garde la casse et les blocs soudés entiers si un morceau est inconnu', () => {
  assert.deepEqual(decouperPourQuestions('LineHeight'), ['line-height']);
  assert.deepEqual(decouperPourQuestions('Font Size'), ['font-size']);
  assert.deepEqual(decouperPourQuestions('letterspacing'), ['letter-spacing']);
  assert.deepEqual(decouperPourQuestions('ScaleWrap'), ['ScaleWrap']);
  assert.deepEqual(decouperPourQuestions('onSurface'), ['onSurface']);
  assert.deepEqual(decouperPourQuestions('badge'), ['badge']);
  assert.deepEqual(decouperPourQuestions('Scale-1'), ['Scale', '1']);
});

test('le découpage coupe les chiffres et les sigles, et accepte une faute proche d’un terme connu', () => {
  assert.deepEqual(decouperPourQuestions('Gray100'), ['Gray', '100']);
  assert.deepEqual(decouperPourQuestions('H1'), ['H', '1']);
  assert.deepEqual(decouperPourQuestions('2xl'), ['2xl']);
  assert.deepEqual(decouperPourQuestions('Gap-5xl'), ['Gap', '5xl']);
  assert.deepEqual(decouperPourQuestions('2xs'), ['2xs']);
  assert.deepEqual(decouperPourQuestions('3xlarge'), ['3', 'xlarge']);
  assert.deepEqual(decouperPourQuestions('URLBase'), ['URL', 'Base']);
  assert.deepEqual(decouperPourQuestions('textsucccess'), ['text', 'succcess']);
  assert.deepEqual(decouperPourQuestions('searchfilter'), ['search', 'filter']);
  assert.deepEqual(decouperPourQuestions('bordrefilter'), ['bordre', 'filter']);
  assert.deepEqual(decouperPourQuestions('vspacingsmall'), ['vspacingsmall']);
  assert.deepEqual(decouperPourQuestions('hoverDisabled'), ['hover', 'Disabled']);
});

test('un composant et une échelle, ou un mot tiré d’un mot composé, ne forment pas de question', () => {
  assert.deepEqual(paires([nom('a', 'ui/badge/solid'), nom('b', 'ui/scale/solid'), nom('c', 'ui/foreground/solid')]), []);
  assert.deepEqual(paires([nom('a', 'Display/Large/LineHeight'), nom('b', 'ui/border/solid'), nom('c', 'ui/height/solid')]), []);
  assert.deepEqual(paires([nom('a', 'Stress/Info/ScaleWrap/Colors/Scale-1'), nom('b', 'Stress/Info/Badge/Colors/Solid'),
    nom('c', 'Stress/Info/Scale/Colors/Solid')]).filter((cle) => cle.includes('scale')), []);
  assert.deepEqual(questions([nom('a', 'type/LineHeight/large'), nom('b', 'type/line-height/small')]), []);
});

test('les formes d’un même mot sortent : faute, pluriel, terminaison, abréviation ; une négation ne sort pas', () => {
  assert.deepEqual(paires([nom('a', 'x/succes/y'), nom('b', 'x/success/y')]), ['paire:succes|success']);
  assert.deepEqual(paires([nom('a', 'x/enable/y'), nom('b', 'z/enabled/w')]), ['paire:enable|enabled']);
  assert.deepEqual(paires([nom('a', 'x/hovers/y'), nom('b', 'x/hover/y')]), ['paire:hover|hovers']);
  assert.deepEqual(paires([nom('a', 'x/fg/y'), nom('b', 'x/foreground/y')]), ['paire:fg|foreground']);
  assert.deepEqual(paires([nom('a', 'x/selected/y'), nom('b', 'z/unselected/w')]), []);
  assert.deepEqual(paires([nom('a', 'x/default/y'), nom('b', 'z/defaults/w')]), ['paire:default|defaults']);
});

// Le renommage découpe ce bloc comme les questions : la réponse s’applique au milieu du mot collé.
test('une faute dans un bloc collé sort, et le renommage voit les mêmes mots', () => {
  const noms = [nom('rare', 'x/textsucccess/y'), ...Array.from({ length: 5 }, (_, i) => nom(`ref-${i}`, `x/success/${'abcde'[i]}`))];
  const faute = questions(noms).find((q) => q.type === 'ecriture-du-terme' && q.indice === 'faute');
  assert.deepEqual(faute?.type === 'ecriture-du-terme' && [faute.terme.mot, ...faute.proposition], ['succcess', 'success']);
  assert.deepEqual(decouperSegment('textsucccess'), ['text', 'succcess']);
  assert.deepEqual(decouperSegment('TextSucccess'), ['Text', 'Succcess']);
  assert.deepEqual(decouperSegment('scalewrap'), ['scalewrap']);
});

function arbre(): NomLu[] {
  const noms: NomLu[] = [];
  const ajouter = (mode: string, groupe: string, mot: string, enfants: readonly string[]) => {
    for (const enfant of enfants) noms.push(nom(`${mode}/${groupe}/${mot}/${enfant}`, `theme/${mode}/${groupe}/${mot}/${enfant}`));
  };
  for (const mode of ['light', 'dark']) {
    ajouter(mode, 'card', 'zorb', ['fill', 'edge']);
    ajouter(mode, 'card', 'quix', ['fill', 'edge']);
  }
  for (let i = 0; i < 60; i++) for (const mode of ['light', 'dark']) ajouter(mode, `g${i}`, 'zorb', ['fill']);
  ajouter('light', 'card', 'ledger', ['fill']); ajouter('dark', 'card', 'registre', ['fill']);
  ajouter('light', 'chip', 'ledger', ['fill']); ajouter('dark', 'chip', 'registre', ['fill']);
  ajouter('light', 'tab', 'tick-true', ['a', 'b', 'e']); ajouter('dark', 'tab', 'tick', ['a', 'b', 'e']);
  ajouter('light', 'tab', 'tick-false', ['a', 'b', 'c', 'd']); ajouter('dark', 'tab', 'untick', ['a', 'b', 'c', 'd']);
  return noms;
}

test('deux branches parallèles rapprochent les segments renommés, appariés un à un', () => {
  const cles = paires(arbre());
  assert.ok(cles.includes('paire:ledger|registre'));
  assert.ok(cles.includes('paire:tick|tick-true'));
  assert.ok(cles.includes('paire:tick-false|untick'));
  assert.equal(cles.includes('paire:tick-true|untick'), false);
  assert.equal(cles.some((cle) => cle.includes('light') || cle.includes('dark')), false);
  const paire = questions(arbre()).find((q) => q.cle === 'paire:ledger|registre');
  assert.equal(paire?.type === 'paire' && paire.indice, 'branches-paralleles');
});

test('un seul nom renommé, sans terme connu, ne suffit pas ; avec un terme connu, il suffit', () => {
  const base = arbre().filter((n) => !/ledger|registre|tick/u.test(n.nom));
  const seul = (a: string, b: string) => [...base, nom('x1', `theme/light/card/${a}/fill`), nom('x2', `theme/dark/card/${b}/fill`)];
  assert.deepEqual(paires(seul('ledger', 'registre')), []);
  assert.deepEqual(paires(seul('hover', 'hovers')).filter((cle) => cle.includes('hovers')), ['paire:hover|hovers']);
});

test('un alias et sa cible de même longueur rapprochent le segment qui diffère', () => {
  const noms = [
    nom('t1', 'colors/zorb/registre/solid'), nom('a1', 'colors/zorb/ledger/solid', 'collection-1', 't1'),
    nom('t2', 'colors/quix/registre/solid'), nom('a2', 'colors/quix/ledger/solid', 'collection-1', 't2'),
  ];
  assert.deepEqual(paires(noms), ['paire:ledger|registre']);
});

test('deux variables différentes qui visent la même cible ne sortent jamais', () => {
  const noms = [nom('t', 'colors/ccc/zorb'), nom('a', 'colors/aaa/zorb', 'collection-1', 't'),
    nom('b', 'colors/bbb/zorb', 'collection-1', 't'), nom('c', 'colors/ddd/quix', 'collection-1', 't')];
  assert.deepEqual(paires(noms), []);
});

test('les branches parallèles écartent les crans, les concepts distincts et les branches trop différentes', () => {
  const base = arbre().filter((n) => !/ledger|registre|tick/u.test(n.nom));
  const avec = (a: string, b: string) => [...base, nom('x1', `theme/light/card/${a}/fill`), nom('x2', `theme/dark/card/${b}/fill`),
    nom('x3', `theme/light/chip/${a}/fill`), nom('x4', `theme/dark/chip/${b}/fill`)];
  assert.deepEqual(paires(avec('ledger', 'registre')), ['paire:ledger|registre']);
  assert.deepEqual(paires(avec('700-[light]', '800-[light]')), []);
  assert.deepEqual(paires(avec('foreground', 'text')), []);
  const disperse = [...base, ...Array.from({ length: 200 }, (_, i) => nom(`s${i}`, `theme/light/solo${i}/zorb/fill`)),
    nom('x1', 'theme/light/card/ledger/fill'), nom('x2', 'theme/dark/card/registre/fill'),
    nom('x3', 'theme/light/chip/ledger/fill'), nom('x4', 'theme/dark/chip/registre/fill')];
  assert.deepEqual(paires(disperse).filter((cle) => cle.includes('ledger')), []);
});

test('un terme connu face à un mot inconnu sort en branches parallèles (décision M08) ; les ex aequo, non', () => {
  const base = arbre().filter((n) => !/ledger|registre|tick/u.test(n.nom));
  const avec = (a: string, b: string) => [...base, nom('x1', `theme/light/card/${a}/fill`), nom('x2', `theme/dark/card/${b}/fill`),
    nom('x3', `theme/light/chip/${a}/fill`), nom('x4', `theme/dark/chip/${b}/fill`)];
  assert.deepEqual(paires(avec('hover', 'survol')), ['paire:hover|survol']);
  const cles = paires(arbre());
  assert.equal(cles.includes('paire:tick-true|untick'), false);
  const egalite = [...arbre().filter((n) => !/tick/u.test(n.nom))];
  for (const mode of ['light', 'dark']) for (const mot of mode === 'light' ? ['pick-true', 'pick-false'] : ['pick', 'unpick'])
    for (const enfant of ['a', 'b']) egalite.push(nom(`${mode}/${mot}/${enfant}`, `theme/${mode}/tab/${mot}/${enfant}`));
  assert.deepEqual(paires(egalite).filter((cle) => cle.includes('pick-')), []);
});

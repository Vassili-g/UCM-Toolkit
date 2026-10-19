import assert from 'node:assert/strict';
import test from 'node:test';
import {
  commencerLexique, detecterLesQuestions, indexerVocabulaire, normaliserLeLexique,
  type ConventionsParCategorie, type DejaJuge, type Lexique, type NatureDeSegment, type NomLu,
} from '../src/referentiel/index.js';
import { decouperSegment, termesDuSegment } from '../src/referentiel/ecriture-des-mots.js';

const COLLECTIONS = ['components', 'primitives', 'theme'];
const idDeCollection = (nom: string): string => JSON.stringify(['collection', nom]);
const collection = (nom: string): NomLu => ({ id: idDeCollection(nom), categorie: 'collections', portee: 'document', nom });

let compteur = 0;
function variable(nomDeCollection: string, nom: string): NomLu {
  return { id: `variable-${++compteur}`, categorie: 'variables', portee: idDeCollection(nomDeCollection), nom };
}

function preparer(noms: readonly NomLu[], ordinaires?: ReadonlySet<string>): Lexique {
  const preparation = commencerLexique(ordinaires ? { ordinaires } : undefined);
  preparation.ajouter(noms);
  const calcul = preparation.terminer();
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** Les termes d'un segment, chacun sous la forme de ses mots joints par `-`. */
function termes(segment: string, nature: NatureDeSegment | null = null): string[] {
  const mots = decouperSegment(segment);
  const plages = termesDuSegment(mots, nature);
  assert.deepEqual(plages.flatMap(([debut, fin]) => mots.slice(debut, fin)), mots, `les plages de ${segment} couvrent tous ses mots, dans l'ordre`);
  return plages.map(([debut, fin]) => mots.slice(debut, fin).join('-').toLowerCase());
}

test('une propriété composée est un seul terme, quelle que soit son écriture', () => {
  for (const segment of ['lineheight', 'LineHeight', 'LetterSpacing', 'fontsize', 'FontWeight', 'Border-radius', 'Border-width', 'Max-width']) {
    assert.equal(termes(segment).length, 1, segment);
  }
  assert.deepEqual(termes('lineheight'), ['line-height']);
  assert.deepEqual(termes('LineHeight'), ['line-height']);
  assert.deepEqual(termes('Border-radius'), ['border-radius']);
  assert.deepEqual(termes('foreground-main'), ['foreground-main']);
});

test('les autres mots restent des termes séparés', () => {
  for (const segment of ['Padding-x', 'Gap-col', 'Background-Tag', 'Icon-size', 'primaryBg', 'TextColumns']) {
    assert.equal(termes(segment).length, 2, segment);
  }
  assert.equal(termes('Text-color-Tag').length, 3);
  assert.equal(termes('Radius-top-left').length, 3);
  assert.deepEqual(termes('primaryBg'), ['primary', 'bg']);
});

test('un terme de plusieurs mots d’un registre est un seul terme', () => {
  assert.deepEqual(termes('Focus-ring'), ['focus-ring']);
  assert.deepEqual(termes('Selected-false'), ['selected-false']);
  assert.deepEqual(termes('Button-focus-ring-width'), ['button', 'focus-ring', 'width']);
});

test('un segment qui a une nature est un seul terme', () => {
  assert.deepEqual(termes('StressTest', 'composant'), ['stress-test']);
  assert.deepEqual(termes('TileLinksWrap', 'element'), ['tile-links-wrap']);
  assert.deepEqual(termes('Titanium', 'palette'), ['titanium']);
  assert.deepEqual(termesDuSegment([], 'composant'), []);
  assert.equal(termes('TextColumns', null).length, 2);
});

/** Un extrait du Playground, avec la collection `components`. */
function extrait(): NomLu[] {
  return [
    ...COLLECTIONS.map(collection),
    variable('components', 'StressTest/Info/TextColumns/Colors/Title'),
    variable('components', 'StressTest/Info/ScaleWrap/Colors/Scale-1'),
    variable('components', 'Button/Colors/Primary/Outlined/Background'),
    variable('primitives', 'Display/Large/LineHeight'),
    variable('primitives', 'lineheight/3xl'),
  ];
}

test('le lexique indexe les termes entiers, jamais les morceaux d’un nom ou d’une propriété', () => {
  const lexique = preparer(extrait());
  for (const terme of ['stress-test', 'text-columns', 'scale-wrap', 'line-height', 'outlined']) {
    assert.ok(lexique.occurrencesDesTermes.has(terme), terme);
  }
  for (const morceau of ['stress', 'test', 'wrap', 'columns', 'line', 'height']) {
    assert.ok(!lexique.occurrencesDesTermes.has(morceau), morceau);
  }
  assert.equal(lexique.occurrencesDesTermes.get('line-height')?.length, 2);
  assert.deepEqual(lexique.occurrencesDesTermes.get('line-height')?.map((place) => place.longueur), [2, 2]);
  const stressTest = lexique.occurrencesDesTermes.get('stress-test')!;
  assert.equal(stressTest.length, 2);
  assert.deepEqual({ ...stressTest[0], nomId: undefined }, { nomId: undefined, rangSegment: 0, rangMot: 0, longueur: 2 });
  // L'index par mot ne change pas.
  assert.ok(lexique.occurrences.has('stress') && lexique.occurrences.has('wrap') && lexique.occurrences.has('line'));
});

test('un nom de collection n’a aucune occurrence de terme', () => {
  const lexique = preparer(extrait());
  for (const nom of COLLECTIONS) assert.ok(!lexique.occurrencesDesTermes.has(nom), nom);
  for (const places of lexique.occurrencesDesTermes.values()) {
    for (const place of places) assert.notEqual(lexique.noms.get(place.nomId)?.categorie, 'collections');
  }
});

test('le lexique porte la nature et les plages de chaque segment, alignées sur les segments du nom', () => {
  const noms = extrait();
  const lexique = preparer(noms);
  const textColumns = noms.find((nom) => nom.nom.endsWith('TextColumns/Colors/Title'))!;
  assert.deepEqual(lexique.natures.get(textColumns.id), ['composant', null, 'element', null, null]);
  assert.deepEqual(lexique.termes.get(textColumns.id), [[[0, 2]], [[0, 1]], [[0, 2]], [[0, 1]], [[0, 1]]]);
  const hauteur = noms.find((nom) => nom.nom === 'lineheight/3xl')!;
  assert.deepEqual(lexique.termes.get(hauteur.id), [[[0, 2]], [[0, 1]]]);
});

test('un nom traité comme un terme perd sa nature et reste un seul terme', () => {
  const lexique = preparer(extrait(), new Set(['stress-test']));
  assert.ok(lexique.occurrencesDesTermes.has('stress-test'));
  assert.ok(!lexique.occurrencesDesTermes.has('stress') && !lexique.occurrencesDesTermes.has('test'));
  const stressTest = [...lexique.noms.values()].filter((nom) => nom.nom.startsWith('StressTest/'));
  assert.ok(stressTest.length > 0 && stressTest.every((nom) => lexique.natures.get(nom.id)?.[0] === null));
  assert.ok(lexique.occurrencesDesTermes.has('text-columns'));
});

const conventions: ConventionsParCategorie = {
  variables: { casse: 'minuscules', separateur: 'tiret' },
  groupes: { casse: 'PascalCase', separateur: 'camelCase' },
  collections: { casse: 'minuscules', separateur: 'tiret' },
};

/** Les écritures inchangées isolent l'effet des termes. */
const sansEcriture: ConventionsParCategorie = {
  variables: { casse: 'inchangee', separateur: 'inchange' },
  groupes: { casse: 'inchangee', separateur: 'inchange' },
  collections: { casse: 'inchangee', separateur: 'inchange' },
};

function renommer(noms: readonly NomLu[], personnalises: Parameters<typeof indexerVocabulaire>[0]['personnalises'] = [],
  ecriture: ConventionsParCategorie = sansEcriture): Map<string, string> {
  const { index } = indexerVocabulaire({ personnalises, ecartsUcm: [] });
  const resultat = normaliserLeLexique(preparer(noms), ecriture, index);
  return new Map(resultat.renommages.map((renommage) => [renommage.ancienNom, renommage.nouveauNom]));
}

test('une règle sur un mot ne touche pas un nom d’élément qui le contient', () => {
  const noms = [
    ...COLLECTIONS.map(collection),
    variable('components', 'StressTest/Info/ScaleWrap/Colors/Scale-1'),
    variable('components', 'StressTest/Info/TileLinksWrap/Sizes/Gap-x'),
    variable('theme', 'layout/primaryWrap/gap'),
    variable('theme', 'layout/Wrap/gap'),
  ];
  const regle = [{ terme: ['container'], remplace: [['wrap']] }];
  const renommages = renommer(noms, regle);
  // D'autres règles renomment ces variables (`Colors` devient `Color`), mais leurs éléments gardent leur nom.
  assert.equal(renommages.get('StressTest/Info/ScaleWrap/Colors/Scale-1'), 'StressTest/Info/ScaleWrap/Color/Scale-1');
  assert.equal(renommages.get('StressTest/Info/TileLinksWrap/Sizes/Gap-x'), 'StressTest/Info/TileLinksWrap/Size/Gap-x');
  assert.equal(renommages.get('layout/primaryWrap/gap'), 'layout/primaryContainer/gap');
  assert.equal(renommages.get('layout/Wrap/gap'), 'layout/Container/gap');
});

test('le même mot est remplacé dans un nom qui n’est pas un élément', () => {
  // Sans la collection `components` ni groupe de propriétés, ScaleWrap n'a pas de nature : le mot reste remplaçable.
  const noms = [...COLLECTIONS.map(collection), variable('theme', 'layout/ScaleWrap/gap')];
  const regle = [{ terme: ['container'], remplace: [['wrap']] }];
  assert.equal(renommer(noms, regle).get('layout/ScaleWrap/gap'), 'layout/ScaleContainer/gap');
});

test('radius remplace toujours Border-radius, et bg s’applique toujours dans primaryBg', () => {
  const noms = [...COLLECTIONS.map(collection), variable('theme', 'layout/box/Border-radius'), variable('theme', 'layout/primaryBg/gap')];
  const renommages = renommer(noms, [], conventions);
  assert.equal(renommages.get('layout/box/Border-radius'), 'layout/box/radius');
  assert.equal(renommages.get('layout/primaryBg/gap'), 'layout/primary-background/gap');
});

test('une règle sur un mot d’une propriété composée ne la coupe pas', () => {
  const noms = [...COLLECTIONS.map(collection), variable('theme', 'layout/box/Max-width'), variable('theme', 'layout/box/width')];
  const renommages = renommer(noms, [{ terme: ['largeur'], remplace: [['width']] }]);
  assert.equal(renommages.get('layout/box/width'), 'layout/box/largeur');
  assert.equal(renommages.get('layout/box/Max-width'), undefined, 'width ne remplace pas la moitié de max-width');
});

const vide: DejaJuge = { distincts: [], plusTard: [], voulus: [], collectionsGardees: [] };

function questions(lexique: Lexique) {
  const { index } = indexerVocabulaire({ personnalises: [], ecartsUcm: [] });
  return detecterLesQuestions(lexique, index, vide, { seuil: 0, maximum: 100 }).questions;
}

test('un segment qui a une nature ne porte aucune question', () => {
  const noms = [
    ...COLLECTIONS.map(collection),
    variable('components', 'Widget/Colors/Primary/Background'),
    variable('components', 'Widgets/Colors/Primary/Background'),
  ];
  // Sans nature (`ordinaires`), le pluriel serait posé ; avec elle, les deux noms de composant sont laissés tels quels.
  const sansNature = questions(preparer(noms, new Set(['widget', 'widgets'])));
  assert.deepEqual(sansNature.filter((question) => question.type === 'paire').map((question) => question.cle), ['paire:widget|widgets']);
  assert.deepEqual(questions(preparer(noms)).filter((question) => question.type === 'paire'), []);
});

test('une taille comme 5xl reste entière dans les questions', () => {
  const noms = [...COLLECTIONS.map(collection), variable('theme', 'size/5xl/gap'), variable('theme', 'size/4xl/gap')];
  const mots = new Set(questions(preparer(noms)).flatMap((question) => question.type === 'paire' ? question.termes.map((terme) => terme.mot) : []));
  assert.ok(!mots.has('xl'));
  assert.ok(!mots.has('5'));
});

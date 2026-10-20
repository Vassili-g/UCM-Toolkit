/** Les assertions passent tant que les défauts de normalisation et de liaison des alias existent. */
import assert from 'node:assert/strict';
import {
  commencerLexique, detecterLesQuestions, indexerVocabulaire,
  type Lexique, type NomLu, type TermePersonnalise,
} from '../../../../../../packages/kit/src/referentiel/index.ts';
import { inventaireDeLectures, type VariableLue } from '../../../../../../packages/plugin-socle/src/inventaireDeNoms.ts';
import { nomsSelonLesReglesSync } from '../../../../../../packages/plugin-socle/src/nomsSelonLesRegles.ts';
import { lireReglesDeNommage } from '../../../../../../packages/plugin-socle/src/reglesDeNommage.ts';
import { exporterLesRegles, importerLesRegles, reglesVides } from '../../../../../../packages/plugin-nomenclature/src/regles.ts';
import { creerNommeur, type DonneesDeNommage } from '../../../../../../packages/plugin-palettes/src/variables/nommeur.ts';

const ecriture = {
  groupes: { casse: 'minuscules', separateur: 'tiret' },
  variables: { casse: 'minuscules', separateur: 'tiret' },
} as const;
const collections = [{ id: 'c', name: 'custom', remote: false }];
const sansAlias = { cibleAlias: () => undefined, protegee: () => false, palette: () => undefined };

function importer(termes: readonly TermePersonnalise[]) {
  const texte = exporterLesRegles({ ...reglesVides, ecriture, termes });
  const resultat = importerLesRegles(texte, reglesVides, (vocabulaire) => indexerVocabulaire(vocabulaire).conflits);
  assert.equal(resultat.statut, 'valide');
  if (resultat.statut !== 'valide') throw new Error(resultat.statut);
  const regles = lireReglesDeNommage(resultat.ecritures.filter((ecriture) => ecriture.texte !== null).map(({ cle, texte }) => [cle, texte!]));
  assert.ok(regles);
  return regles;
}

function appliquer(nom: string, regles: ReturnType<typeof importer>): string {
  const variables = [{ id: 'v', name: nom, variableCollectionId: 'c', remote: false }];
  const inventaire = inventaireDeLectures(collections, variables, sansAlias);
  const resultat = nomsSelonLesReglesSync(inventaire, regles, []);
  assert.deepEqual(resultat.indexation.conflits, []);
  assert.deepEqual(resultat.resultat.collisions, []);
  return resultat.resultat.renommages.find((renommage) => renommage.id === JSON.stringify(['variable', 'v']))?.nouveauNom ?? nom;
}

const chaine = importer([
  { terme: ['bar'], remplace: [['foo']] },
  { terme: ['baz'], remplace: [['bar']] },
]);
const premier = appliquer('foo', chaine);
const second = appliquer(premier, chaine);
assert.equal(premier, 'bar');
assert.equal(second, 'baz');
assert.notEqual(second, premier);
console.log('Chaîne acceptée, noms successifs :', ['foo', premier, second]);

const cyclePartiel = importer([
  { terme: ['bar', 'quux'], remplace: [['foo']] },
  { terme: ['foo'], remplace: [['bar']] },
]);
const suite = ['foo'];
for (let rang = 0; rang < 6; rang++) suite.push(appliquer(suite.at(-1)!, cyclePartiel));
assert.deepEqual(suite, [
  'foo', 'bar-quux', 'foo-quux', 'bar-quux-quux',
  'foo-quux-quux', 'bar-quux-quux-quux', 'foo-quux-quux-quux',
]);
console.log('Cycle partiel accepté, noms successifs :', suite);

function lexique(noms: readonly NomLu[]): Lexique {
  const preparation = commencerLexique();
  preparation.ajouter(noms);
  const calcul = preparation.terminer();
  for (;;) {
    const etape = calcul.next();
    if (etape.done) return etape.value;
  }
}

const variables: VariableLue[] = [
  ['t1', 'colors/zorb/registre/solid'], ['a1', 'colors/zorb/ledger/solid'],
  ['t2', 'colors/quix/registre/solid'], ['a2', 'colors/quix/ledger/solid'],
].map(([id, name]) => ({ id, name, variableCollectionId: 'c', remote: false }));
const alias = new Map([['a1', 't1'], ['a2', 't2']]);
const inventaire = inventaireDeLectures(collections, variables, { ...sansAlias, cibleAlias: (variable) => alias.get(variable.id) });
const noms = inventaire.entrees.map((entree) => entree.nom);
const index = indexerVocabulaire({ personnalises: [], ecartsUcm: [] }).index;
function clesDesQuestions(noms: readonly NomLu[]): string[] {
  const resultat = detecterLesQuestions(lexique(noms), index, {
    distincts: [], voulus: [], plusTard: [], collectionsGardees: [],
  }, { seuil: 0, maximum: 100 });
  return [...resultat.questions, ...resultat.autres].map((question) => question.cle);
}
const avant = clesDesQuestions(noms);
const apres = clesDesQuestions(noms.map((nom) => nom.cibleAlias
  ? { ...nom, cibleAlias: JSON.stringify(['variable', nom.cibleAlias]) }
  : nom));
assert.equal(avant.includes('paire:ledger|registre'), false);
assert.equal(apres.includes('paire:ledger|registre'), true);
console.log('Questions avec les identifiants lus :', avant);
console.log('Questions après conversion des seules cibles d’alias :', apres);

const donneesPalettes: DonneesDeNommage = {
  couples: [
    ['ecriture', JSON.stringify({ version: 1, ...ecriture })],
    ...chaine.vocabulaire.personnalises.map((terme) => [
      `terme:${terme.terme.join(' ')}`, JSON.stringify({ version: 1, ...terme }),
    ] as const),
  ],
  collections: [{ id: 'c', nom: 'custom' }],
  variables: [{ id: 'v', nom: 'color/bar/vivid/light/50', collection: 'c', palette: 'p' }],
};
const brutDuPlan = 'colors/foo/vivid/light/50';
const depuisPalettes = creerNommeur(donneesPalettes)!.pour({ id: 'c' })!([{ id: 'v', nom: brutDuPlan }])[0];
const depuisNomenclature = appliquer(depuisPalettes, chaine);
const depuisPalettesEnsuite = creerNommeur({
  ...donneesPalettes,
  variables: [{ ...donneesPalettes.variables[0], nom: depuisNomenclature }],
})!.pour({ id: 'c' })!([{ id: 'v', nom: brutDuPlan }])[0];
assert.equal(depuisPalettes, 'color/bar/vivid/light/50');
assert.equal(depuisNomenclature, 'color/baz/vivid/light/50');
assert.equal(depuisPalettesEnsuite, depuisPalettes);
console.log('Palettes, Nomenclature, puis Palettes :', [depuisPalettes, depuisNomenclature, depuisPalettesEnsuite]);

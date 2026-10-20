/** La protection des variables de Palettes se décide en un seul endroit : `estProtegee`, avec la marque de Palettes et les règles rangées. */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CAUSES_DE_PROTECTION, causeDeProtection, estProtegee, idsNonRenommables, inventaireSelonLaProtection, nomsSelonLesReglesSync, palettesLibres,
  type EntreeInventaire, type Inventaire,
} from '@ucm-kit/core/nommage';
import { classerLaMarqueDeNommage, lireLaMarqueDeNommage, lireReglesDeNommage, type EtatDeLaMarque } from '@ucm-kit/core/protocoles';
import {
  inventaireDeLectures, lireInventaire, lireLeSuiviDePalettes,
  type LecteurDeVariable, type ObjetNomme, type PortDeLecture, type VariableLue,
} from '../src/inventaireDeNoms';

const collections: ObjetNomme[] = [{ id: 'c1', name: 'primitives', remote: false }, { id: 'c2', name: 'components', remote: false }];
const variables: VariableLue[] = [
  { id: 'p1', name: 'colors/Poppy/vivid/light/50', variableCollectionId: 'c1', remote: false },
  { id: 'p2', name: 'colors/Poppy/vivid/dark/50', variableCollectionId: 'c1', remote: false },
  { id: 'b1', name: 'button/sizes/big/border-radius', variableCollectionId: 'c2', remote: false },
  { id: 'b2', name: 'button/sizes/small/border-radius', variableCollectionId: 'c2', remote: false },
];
const lecteur = (marque?: EtatDeLaMarque): LecteurDeVariable => ({
  cibleAlias: () => undefined,
  protegee: (variable) => variable.id.startsWith('p'),
  palette: (variable) => (variable.id.startsWith('p') ? 'poppy' : undefined),
  ...(marque === undefined ? {} : { marqueDePalettes: () => marque }),
});
const ECRITURE = JSON.stringify({ version: 1, groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'minuscules', separateur: 'tiret' } });

test('la marque de Palettes se classe : courante, future, illisible, absente', () => {
  assert.equal(classerLaMarqueDeNommage('{"version":1}'), 'courante');
  assert.equal(classerLaMarqueDeNommage('{"version":1,"autre":true}'), 'courante');
  assert.equal(classerLaMarqueDeNommage(''), 'absente');
  for (const texte of ['{"version":2}', '{"version":3}', '{"version":42}']) assert.equal(classerLaMarqueDeNommage(texte), 'future', texte);
  for (const texte of ['{}', '[]', 'null', '1', 'pas du json', '{"version":"1"}', '{"version":0}', '{"version":-1}', '{"version":1.5}', '{"version":2.5}', '{"version":null}']) {
    assert.equal(classerLaMarqueDeNommage(texte), 'illisible', texte);
  }
});

test('lireLaMarqueDeNommage classe le texte lu, et rend refusee quand la lecture lève', () => {
  assert.equal(lireLaMarqueDeNommage(() => '{"version":1}'), 'courante');
  assert.equal(lireLaMarqueDeNommage(() => ''), 'absente');
  assert.equal(lireLaMarqueDeNommage(() => { throw new Error('refus'); }), 'refusee');
});

test('le suivi de Palettes : absent, lu (toute version), illisible lu vide, refusé quand la lecture lève', () => {
  assert.deepEqual(lireLeSuiviDePalettes(() => ''), { etat: 'absent' });
  assert.deepEqual(lireLeSuiviDePalettes(() => { throw new Error('refus'); }), { etat: 'refuse' });
  for (const version of [2, 3]) {
    const suivi = JSON.stringify({ version, palettes: { p1: { variables: { a: { id: 'v1' }, b: { id: 'v2' } } } } });
    const lu = lireLeSuiviDePalettes(() => suivi);
    assert.equal(lu.etat, 'lu', `version ${version}`);
    assert.deepEqual(lu.etat === 'lu' ? [...lu.ids].sort() : [], ['v1', 'v2'], `version ${version}`);
  }
  const illisible = lireLeSuiviDePalettes(() => '{pas du json');
  assert.equal(illisible.etat, 'lu');
  assert.deepEqual(illisible.etat === 'lu' ? [...illisible.ids] : ['x'], []);
});

test('l’inventaire porte la marque que le lecteur lit, absente quand le lecteur n’en dit rien', () => {
  for (const marque of ['courante', 'illisible', 'future', 'refusee', 'absente'] as const) assert.equal(inventaireDeLectures(collections, variables, lecteur(marque)).marque, marque);
  assert.equal(inventaireDeLectures(collections, variables, lecteur()).marque, 'absente');
});

test('une variable indécidable porte indecidable, jamais avec protegee', () => {
  const lecteurIndecidable: LecteurDeVariable = { ...lecteur('absente'), indecidable: () => true };
  const entrees = inventaireDeLectures(collections, variables, lecteurIndecidable).entrees.filter((entree) => entree.cible.type === 'variable');
  assert.deepEqual(entrees.map((entree) => [entree.protegee, entree.indecidable]), [[true, undefined], [true, undefined], [false, true], [false, true]]);
  assert.ok(inventaireDeLectures(collections, variables, lecteur()).entrees.every((entree) => entree.indecidable === undefined));
});

test('lireInventaire pose la marque du port, après la lecture des variables', async () => {
  const ordre: string[] = [];
  const port: PortDeLecture = {
    collections: async () => collections,
    variables: async () => { ordre.push('variables'); return variables; },
    ...lecteur('courante'),
    marqueDePalettes: () => { ordre.push('marque'); return 'courante'; },
  };
  const inventaire = await lireInventaire(port, { pause: async () => {} });
  assert.equal(inventaire.marque, 'courante');
  assert.deepEqual(ordre, ['variables', 'marque']);
  assert.equal((await lireInventaire({ ...port, marqueDePalettes: undefined }, { pause: async () => {} })).marque, 'absente');
});

test('les variables de Palettes sont libres avec la marque courante et l’écriture rangée, pas sans l’une des deux', () => {
  const avecMarque = inventaireDeLectures(collections, variables, lecteur('courante'));
  assert.equal(palettesLibres(avecMarque, true), true);
  assert.equal(palettesLibres(avecMarque, false), false, 'premier lancement : l’écriture n’est pas rangée');
  for (const marque of ['absente', 'illisible', 'future', 'refusee'] as const) assert.equal(palettesLibres({ marque }, true), false, marque);
  assert.equal(palettesLibres({}, true), false);
});

test('estProtegee garde le fait lu tant que les variables de Palettes ne sont pas libres', () => {
  const entrees = inventaireDeLectures(collections, variables, lecteur('courante')).entrees.filter((entree) => entree.cible.type === 'variable');
  const [p1, , b1] = entrees;
  assert.equal(estProtegee(p1), true);
  assert.equal(estProtegee(p1, { palettesLibres: false }), true);
  assert.equal(estProtegee(p1, { palettesLibres: true }), false);
  assert.equal(estProtegee(b1, { palettesLibres: true }), false);
  assert.equal(estProtegee(b1), false);
});

test('idsNonRenommables fige les variables de Palettes par défaut et les libère avec palettesLibres', () => {
  const inventaire = inventaireDeLectures(collections, variables, lecteur('courante'));
  const ids = (options?: { palettesLibres: boolean }): string[] => idsNonRenommables(inventaire, [], options);
  assert.deepEqual(ids(), [JSON.stringify(['variable', 'p1']), JSON.stringify(['variable', 'p2'])]);
  assert.deepEqual(ids({ palettesLibres: false }), ids());
  assert.deepEqual(ids({ palettesLibres: true }), []);
  assert.deepEqual(idsNonRenommables(inventaire, ['c1'], undefined), [], 'une collection exclue n’entre pas dans les non renommables');
});

test('inventaireSelonLaProtection rend le même objet quand rien ne change, sinon une copie sans protection', () => {
  const inventaire = inventaireDeLectures(collections, variables, lecteur('courante'));
  assert.equal(inventaireSelonLaProtection(inventaire), inventaire);
  assert.equal(inventaireSelonLaProtection(inventaire, { palettesLibres: false }), inventaire);
  const libre = inventaireSelonLaProtection(inventaire, { palettesLibres: true });
  assert.notEqual(libre, inventaire);
  assert.deepEqual(libre.entrees.filter((entree) => entree.protegee), []);
  assert.equal(libre.marque, 'courante');
  assert.equal(inventaire.entrees.filter((entree) => entree.protegee).length, 2, 'l’inventaire lu garde le fait brut');
  const sansProtegee = inventaireDeLectures(collections, variables, { ...lecteur('courante'), protegee: () => false });
  assert.equal(inventaireSelonLaProtection(sansProtegee, { palettesLibres: true }), sansProtegee);
});

test('inventaireSelonLaProtection efface indecidable avec protegee quand les variables de Palettes sont libres', () => {
  const inventaire = inventaireDeLectures(collections, variables, { ...lecteur('courante'), protegee: () => false, indecidable: (variable) => variable.id.startsWith('p') });
  const indecidables = (i: Inventaire): number => i.entrees.filter((entree) => entree.indecidable === true).length;
  assert.equal(indecidables(inventaire), 2);
  assert.equal(inventaireSelonLaProtection(inventaire, { palettesLibres: false }), inventaire);
  const libre = inventaireSelonLaProtection(inventaire, { palettesLibres: true });
  assert.equal(indecidables(libre), 0);
  assert.equal(libre.entrees.every((entree) => !('indecidable' in entree)), true, 'la clé disparaît');
  assert.equal(indecidables(inventaire), 2, 'l’inventaire lu garde le fait brut');
});

test('estProtegee : une variable indécidable est protégée tant que les variables de Palettes ne sont pas libres', () => {
  const indecidable = { protegee: false, indecidable: true } as const;
  assert.equal(estProtegee(indecidable), true);
  assert.equal(estProtegee(indecidable, { palettesLibres: false }), true);
  assert.equal(estProtegee(indecidable, { palettesLibres: true }), false);
});

const MARQUES: readonly EtatDeLaMarque[] = ['absente', 'courante', 'illisible', 'future', 'refusee'];
const ENTREES: readonly Pick<EntreeInventaire, 'protegee' | 'indecidable'>[] = [{ protegee: false }, { protegee: true }, { protegee: false, indecidable: true }];

test('causeDeProtection : la cause de chaque combinaison', () => {
  const cause = (entree: Pick<EntreeInventaire, 'protegee' | 'indecidable'>, marque: EtatDeLaMarque, rangees: boolean) => causeDeProtection(entree, { marque }, rangees);
  for (const marque of MARQUES) for (const rangees of [true, false]) assert.equal(cause({ protegee: false }, marque, rangees), undefined, `${marque} ${rangees}`);
  assert.equal(cause({ protegee: true }, 'courante', true), undefined);
  assert.equal(cause({ protegee: false, indecidable: true }, 'courante', true), undefined);
  assert.equal(cause({ protegee: true }, 'refusee', true), 'lecture-refusee');
  assert.equal(cause({ protegee: true }, 'absente', true), 'marque-absente');
  assert.equal(cause({ protegee: true }, 'absente', false), 'marque-absente');
  assert.equal(cause({ protegee: true }, 'illisible', true), 'marque-illisible');
  assert.equal(cause({ protegee: true }, 'future', false), 'marque-future');
  assert.equal(cause({ protegee: true }, 'courante', false), 'sans-regles');
  for (const marque of MARQUES) for (const rangees of [true, false]) {
    if (marque === 'courante' && rangees) continue;
    assert.equal(cause({ protegee: false, indecidable: true }, marque, rangees), 'lecture-refusee', `${marque} ${rangees}`);
  }
  assert.equal(causeDeProtection({ protegee: true }, {}, true), 'marque-absente', 'une marque absente de l’inventaire vaut absente');
  assert.deepEqual([...CAUSES_DE_PROTECTION], ['marque-absente', 'marque-illisible', 'marque-future', 'sans-regles', 'lecture-refusee']);
});

test('estProtegee avec palettesLibres est vrai si et seulement si causeDeProtection rend une cause', () => {
  for (const entree of ENTREES) for (const marque of MARQUES) for (const rangees of [true, false]) {
    const inventaire = { marque };
    assert.equal(estProtegee(entree, { palettesLibres: palettesLibres(inventaire, rangees) }), causeDeProtection(entree, inventaire, rangees) !== undefined,
      `${JSON.stringify(entree)} ${marque} ${rangees}`);
  }
});

test('libres, les variables de Palettes et leurs dossiers suivent les règles ; sinon leurs dossiers gardent leur nom', () => {
  const regles = lireReglesDeNommage([['ecriture', ECRITURE]])!;
  const inventaire = inventaireDeLectures(collections, variables, lecteur('courante'));
  const noms = (palettesLibres: boolean): Map<string, string> => {
    const { resultat } = nomsSelonLesReglesSync(inventaire, regles, idsNonRenommables(inventaire, [], { palettesLibres }));
    return new Map(resultat.renommages.map((renommage) => [renommage.id, renommage.nouveauNom]));
  };
  const libres = noms(true);
  assert.equal(libres.get(JSON.stringify(['variable', 'p1'])), 'Color/Poppy/Vivid/Light/50');
  const protegees = noms(false);
  assert.equal(protegees.get(JSON.stringify(['variable', 'p1'])), undefined);
  assert.equal(protegees.get(JSON.stringify(['variable', 'p2'])), undefined);
  assert.ok(protegees.has(JSON.stringify(['variable', 'b1'])), 'les autres collections suivent les règles');
});

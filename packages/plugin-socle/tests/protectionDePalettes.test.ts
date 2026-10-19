/** La protection des variables de Palettes se décide en un seul endroit : `estProtegee`, avec la marque de Palettes et les règles rangées. */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  estProtegee, inventaireDeLectures, inventaireSelonLaProtection, lireInventaire, marqueDeNommageLue, palettesLibres,
  type LecteurDeVariable, type ObjetNomme, type PortDeLecture, type VariableLue,
} from '../src/inventaireDeNoms';
import { idsNonRenommables, nomsSelonLesReglesSync } from '../src/nomsSelonLesRegles';
import { lireReglesDeNommage } from '../src/reglesDeNommage';

const collections: ObjetNomme[] = [{ id: 'c1', name: 'primitives', remote: false }, { id: 'c2', name: 'components', remote: false }];
const variables: VariableLue[] = [
  { id: 'p1', name: 'colors/Poppy/vivid/light/50', variableCollectionId: 'c1', remote: false },
  { id: 'p2', name: 'colors/Poppy/vivid/dark/50', variableCollectionId: 'c1', remote: false },
  { id: 'b1', name: 'button/sizes/big/border-radius', variableCollectionId: 'c2', remote: false },
  { id: 'b2', name: 'button/sizes/small/border-radius', variableCollectionId: 'c2', remote: false },
];
const lecteur = (marque?: boolean): LecteurDeVariable => ({
  cibleAlias: () => undefined,
  protegee: (variable) => variable.id.startsWith('p'),
  palette: (variable) => (variable.id.startsWith('p') ? 'poppy' : undefined),
  ...(marque === undefined ? {} : { palettesSuiventLesRegles: () => marque }),
});
const ECRITURE = JSON.stringify({ version: 1, groupes: { casse: 'PascalCase', separateur: 'camelCase' }, variables: { casse: 'minuscules', separateur: 'tiret' } });

test('la marque de Palettes est un JSON objet qui porte version 1', () => {
  assert.equal(marqueDeNommageLue('{"version":1}'), true);
  for (const texte of ['', '{"version":2}', '{}', '[]', 'null', '1', 'pas du json', '{"version":"1"}']) assert.equal(marqueDeNommageLue(texte), false, texte);
});

test('l’inventaire porte la marque que le lecteur lit, faux quand le lecteur n’en dit rien', () => {
  assert.equal(inventaireDeLectures(collections, variables, lecteur(true)).palettesSuiventLesRegles, true);
  assert.equal(inventaireDeLectures(collections, variables, lecteur(false)).palettesSuiventLesRegles, false);
  assert.equal(inventaireDeLectures(collections, variables, lecteur()).palettesSuiventLesRegles, false);
});

test('lireInventaire pose la marque du port, après la lecture des variables', async () => {
  const ordre: string[] = [];
  const port: PortDeLecture = {
    collections: async () => collections,
    variables: async () => { ordre.push('variables'); return variables; },
    ...lecteur(true),
    palettesSuiventLesRegles: () => { ordre.push('marque'); return true; },
  };
  const inventaire = await lireInventaire(port, { pause: async () => {} });
  assert.equal(inventaire.palettesSuiventLesRegles, true);
  assert.deepEqual(ordre, ['variables', 'marque']);
  assert.equal((await lireInventaire({ ...port, palettesSuiventLesRegles: undefined }, { pause: async () => {} })).palettesSuiventLesRegles, false);
});

test('les variables de Palettes sont libres avec la marque et l’écriture rangée, pas sans l’une des deux', () => {
  const avecMarque = inventaireDeLectures(collections, variables, lecteur(true));
  const sansMarque = inventaireDeLectures(collections, variables, lecteur(false));
  assert.equal(palettesLibres(avecMarque, true), true);
  assert.equal(palettesLibres(avecMarque, false), false, 'premier lancement : l’écriture n’est pas rangée');
  assert.equal(palettesLibres(sansMarque, true), false);
  assert.equal(palettesLibres({}, true), false);
});

test('estProtegee garde le fait lu tant que les variables de Palettes ne sont pas libres', () => {
  const entrees = inventaireDeLectures(collections, variables, lecteur(true)).entrees.filter((entree) => entree.cible.type === 'variable');
  const [p1, , b1] = entrees;
  assert.equal(estProtegee(p1), true);
  assert.equal(estProtegee(p1, { palettesLibres: false }), true);
  assert.equal(estProtegee(p1, { palettesLibres: true }), false);
  assert.equal(estProtegee(b1, { palettesLibres: true }), false);
  assert.equal(estProtegee(b1), false);
});

test('idsNonRenommables fige les variables de Palettes par défaut et les libère avec palettesLibres', () => {
  const inventaire = inventaireDeLectures(collections, variables, lecteur(true));
  const ids = (options?: { palettesLibres: boolean }): string[] => idsNonRenommables(inventaire, [], options);
  assert.deepEqual(ids(), [JSON.stringify(['variable', 'p1']), JSON.stringify(['variable', 'p2'])]);
  assert.deepEqual(ids({ palettesLibres: false }), ids());
  assert.deepEqual(ids({ palettesLibres: true }), []);
  assert.deepEqual(idsNonRenommables(inventaire, ['c1'], undefined), [], 'une collection exclue n’entre pas dans les non renommables');
});

test('inventaireSelonLaProtection rend le même objet quand rien ne change, sinon une copie sans protection', () => {
  const inventaire = inventaireDeLectures(collections, variables, lecteur(true));
  assert.equal(inventaireSelonLaProtection(inventaire), inventaire);
  assert.equal(inventaireSelonLaProtection(inventaire, { palettesLibres: false }), inventaire);
  const libre = inventaireSelonLaProtection(inventaire, { palettesLibres: true });
  assert.notEqual(libre, inventaire);
  assert.deepEqual(libre.entrees.filter((entree) => entree.protegee), []);
  assert.equal(libre.palettesSuiventLesRegles, true);
  assert.equal(inventaire.entrees.filter((entree) => entree.protegee).length, 2, 'l’inventaire lu garde le fait brut');
  const sansProtegee = inventaireDeLectures(collections, variables, { ...lecteur(true), protegee: () => false });
  assert.equal(inventaireSelonLaProtection(sansProtegee, { palettesLibres: true }), sansProtegee);
});

test('libres, les variables de Palettes et leurs dossiers suivent les règles ; sinon leurs dossiers gardent leur nom', () => {
  const regles = lireReglesDeNommage([['ecriture', ECRITURE]])!;
  const inventaire = inventaireDeLectures(collections, variables, lecteur(true));
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

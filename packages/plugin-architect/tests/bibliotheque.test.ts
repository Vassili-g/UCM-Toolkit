/** Le domaine `bibliotheque` : l'arbre depuis les noms, les valeurs par lots de huit, la clé du fichier. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { rangerLaCleDuFichier } from '../src/ecriture/cleDuFichier';
import type { PluginMessage } from '../src/messages';
import { traiter } from '../src/sandbox/bibliotheque';
import type { Contexte } from '../src/sandbox/contexte';
import { portDeTest, variableFigma } from './figmaDeTest';

function contexte(figma: object): { contexte: Contexte; envoyes: PluginMessage[] } {
  const envoyes: PluginMessage[] = [];
  return { contexte: { figma: figma as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument: () => {} }, envoyes };
}

const teamLibrary = (collections: { key: string; name: string; libraryName: string; variables?: { key: string; name: string; resolvedType: string }[]; leve?: boolean }[]) => ({
  async getAvailableLibraryVariableCollectionsAsync() { return collections.map(({ key, name, libraryName }) => ({ key, name, libraryName })); },
  async getVariablesInLibraryCollectionAsync(cle: string) {
    const trouvee = collections.find((c) => c.key === cle)!;
    if (trouvee.leve) throw new Error('refusée');
    return trouvee.variables ?? [];
  },
});

function racine(initial = '') {
  const ecrits: string[] = [];
  return { ecrits, root: { getSharedPluginData: () => initial, setSharedPluginData: (_e: string, _c: string, v: string) => { ecrits.push(v); } } };
}

test('l’arbre se lit depuis les noms, sans import ni valeur ; une collection illisible est omise', async () => {
  const { root, ecrits } = racine();
  const { contexte: c, envoyes } = contexte({
    root, fileKey: 'FK1',
    teamLibrary: teamLibrary([{ key: 'c1', name: 'Couleurs', libraryName: 'Intencial', variables: [{ key: 'v1', name: 'bleu/500', resolvedType: 'COLOR' }] }, { key: 'c2', name: 'Cassée', libraryName: 'Intencial', leve: true }]),
  });
  await traiter({ type: 'lire-bibliotheque', demande: 4 }, c);
  assert.deepEqual(envoyes, [{
    type: 'bibliotheque', demande: 4, library: { nom: 'Intencial', cle: 'Intencial' },
    collections: [{ nom: 'Couleurs', cle: 'c1', variables: [{ nom: 'bleu/500', cle: 'v1', type: 'COLOR' }] }],
    cleDuFichierDesTokens: 'FK1',
  }]);
  assert.deepEqual(ecrits, ['FK1']);
});

test('plusieurs libraries sans liaison connue : aucune n’est choisie', async () => {
  const { contexte: c, envoyes } = contexte({
    root: racine().root,
    teamLibrary: teamLibrary([{ key: 'a', name: 'A', libraryName: 'L1' }, { key: 'b', name: 'B', libraryName: 'L2' }]),
  });
  await traiter({ type: 'lire-bibliotheque', demande: 1 }, c);
  assert.deepEqual(envoyes, [{ type: 'bibliotheque', demande: 1, library: null, collections: [], cleDuFichierDesTokens: null }]);
});

test('sans permission teamlibrary ou si la lecture lève, la library est illisible avec son motif', async () => {
  const sans = contexte({ root: racine().root });
  await traiter({ type: 'lire-bibliotheque', demande: 1 }, sans.contexte);
  assert.equal(sans.envoyes[0].type, 'bibliotheque-illisible');
  const leve = contexte({ root: racine().root, teamLibrary: { getAvailableLibraryVariableCollectionsAsync: async () => { throw new Error('hors ligne'); } } });
  await traiter({ type: 'lire-bibliotheque', demande: 2 }, leve.contexte);
  assert.deepEqual(leve.envoyes, [{ type: 'bibliotheque-illisible', demande: 2, motif: 'hors ligne' }]);
});

test('la clé du fichier n’est ni écrite ni rendue quand Figma ne la sert pas, et pas réécrite quand elle est rangée', () => {
  const vide = racine();
  assert.equal(rangerLaCleDuFichier({ root: vide.root }), null);
  assert.equal(rangerLaCleDuFichier({ fileKey: '', root: vide.root }), null);
  assert.deepEqual(vide.ecrits, []);
  const rangee = racine('FK');
  assert.equal(rangerLaCleDuFichier({ fileKey: 'FK', root: rangee.root }), 'FK');
  assert.deepEqual(rangee.ecrits, []);
});

test('les valeurs s’importent par lots de huit et gardent alias et modes', async () => {
  const cles = Array.from({ length: 20 }, (_, i) => `k${i}`);
  const importables = cles.map((cle, i) => ({ ...variableFigma(`VariableID:${cle}/1:${i}`, 'VariableCollectionId:c/1:0', `v${i}`, 'COLOR', { m1: i === 0 ? { type: 'VARIABLE_ALIAS', id: 'VariableID:z/1:9' } : { r: 0, g: 0, b: 0, a: 1 } }, true), key: cle }));
  const { port, appels, maximumEnVol } = portDeTest([], [], [], [], { importables, delai: 1 });
  const { contexte: c, envoyes } = contexte({ variables: port });
  await traiter({ type: 'lire-valeurs', demande: 9, cles: [...cles, 'absente'] }, c);
  assert.ok(maximumEnVol() <= 8);
  const message = envoyes[0] as { type: string; valeurs: Record<string, any> };
  assert.equal(message.type, 'valeurs');
  assert.deepEqual(message.valeurs.k0.valeurs.m1, { nature: 'alias', cible: 'VariableID:z/1:9' });
  assert.equal(message.valeurs.k1.valeurs.m1.nature, 'couleur');
  assert.match(message.valeurs.absente.illisible, /absente/);
  assert.equal(appels.get('import:k19'), 1);
});

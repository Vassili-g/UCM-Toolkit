/** QuickJS doit compiler le bundle du sandbox d'Architect et mener une analyse de Nomenclature avant tout essai dans Figma. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { buildSync } from 'esbuild';
import { getQuickJS } from 'quickjs-emscripten';
import ts from 'typescript';

test('le sandbox démarre et analyse des branches parallèles dans QuickJS', async () => {
  const bundle = buildSync({
    entryPoints: [path.resolve(__dirname, '../src/code.ts')],
    bundle: true, write: false, platform: 'browser', target: 'chrome80', logLevel: 'silent',
  }).outputFiles[0].text;
  // QuickJS refuse tout le script (« stack underflow ») quand une fonction place un `yield` dans la source d'un `for…of` : Figma n'ouvre alors pas le plugin.
  const quickjs = await getQuickJS();
  const vm = quickjs.createVm();
  try {
    const executer = (code: string): unknown => {
      const resultat = vm.evalCode(code);
      if (resultat.error) {
        const erreur = vm.dump(resultat.error);
        resultat.error.dispose();
        assert.fail(JSON.stringify(erreur));
      }
      const valeur = vm.dump(resultat.value);
      resultat.value.dispose();
      return valeur;
    };
    executer(`
      var messages = [];
      var ouvertures = 0;
      var __html__ = '';
      var setTimeout = function (rappel) { rappel(); };
      var figma = {
        showUI: function () { ouvertures++; },
        on: function () {},
        loadAllPagesAsync: async function () {},
        currentPage: { selection: [] },
        ui: { resize: function () {}, show: function () {}, postMessage: function (message) { messages.push(message); } },
        clientStorage: { getAsync: async function () {}, setAsync: async function () {} },
        root: { name: 'fichier', getSharedPluginDataKeys: function () { return []; }, getSharedPluginData: function () { return ''; } },
        variables: {
          getLocalVariableCollectionsAsync: async function () { return [{ id: 'c', name: 'theme', remote: false }]; },
          getLocalVariablesAsync: async function () {
            return ['hover', 'survol'].flatMap(function (etat) {
              return ['background', 'foreground', 'border'].map(function (role) {
                return { id: etat + role, name: etat + '/' + role, variableCollectionId: 'c', remote: false,
                  valuesByMode: {}, getSharedPluginData: function () { return ''; } };
              });
            });
          }
        }
      };
    `);
    executer(bundle);
    assert.equal(executer('ouvertures'), 1);
    const finir = (): void => {
      const travaux = vm.executePendingJobs();
      if (travaux.error) {
        const erreur = vm.dump(travaux.error);
        travaux.error.dispose();
        assert.fail(JSON.stringify(erreur));
      }
    };
    executer("figma.ui.onmessage({ type: 'lire-preferences' });");
    finir();
    assert.deepEqual(executer('messages.map(function (m) { return m.type; })'), ['preferences', 'disposition', 'selection', 'declaration', 'initial']);
    assert.deepEqual(executer("messages.filter(function (m) { return m.type === 'disposition'; })[0].disposition"), 'large');
    executer("figma.ui.onmessage({ type: 'noms-analyser', demande: 1 });");
    finir();
    assert.deepEqual(executer("messages.filter(function (m) { return m.type === 'erreur' || m.type === 'refus'; })"), []);
    assert.equal(executer("messages.filter(function (m) { return m.type === 'bilan' && m.demande === 1; }).length"), 1);
  } finally {
    vm.dispose();
  }
});

test("aucune source du sandbox ne met un `yield` dans l'itérable d'un `for…of`", () => {
  const racine = path.resolve(__dirname, '../../..');
  const { metafile } = buildSync({
    entryPoints: [path.resolve(__dirname, '../src/code.ts')],
    bundle: true, write: false, metafile: true, platform: 'browser', target: 'chrome80', logLevel: 'silent',
  });
  const fautes: string[] = [];
  const chercher = (noeud: ts.Node, fichier: ts.SourceFile, dansIterable: boolean): void => {
    if (dansIterable && ts.isYieldExpression(noeud)) {
      const { line } = fichier.getLineAndCharacterOfPosition(noeud.getStart(fichier));
      fautes.push(`${path.relative(racine, fichier.fileName)}:${line + 1}`);
    }
    // Une fonction imbriquée a sa propre pile : son `yield` ne compte pas pour la boucle.
    const herite = ts.isFunctionLike(noeud) ? false : dansIterable;
    ts.forEachChild(noeud, (enfant) => chercher(enfant, fichier, herite || (ts.isForOfStatement(noeud) && enfant === noeud.expression)));
  };
  const entrees = Object.keys(metafile.inputs).filter((entree) => /\.tsx?$/.test(entree));
  assert.ok(entrees.length > 100, 'le bundle du sandbox doit lister ses sources');
  for (const entree of entrees) {
    const chemin = path.resolve(racine, 'packages/plugin-architect', entree);
    const fichier = ts.createSourceFile(chemin, fs.readFileSync(chemin, 'utf8'), ts.ScriptTarget.ES2022, true);
    chercher(fichier, fichier, false);
  }
  assert.deepEqual(fautes, [], 'Écrire `const liste = yield* source();` puis `for (const x of liste)`.');
});

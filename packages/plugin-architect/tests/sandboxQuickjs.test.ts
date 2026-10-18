/** QuickJS doit compiler le bundle et mener une analyse avant tout essai dans Figma. */
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { buildSync } from 'esbuild';
import { getQuickJS } from 'quickjs-emscripten';

test('le sandbox démarre et analyse des branches parallèles dans QuickJS', async () => {
  const bundle = buildSync({
    entryPoints: [path.resolve(__dirname, '../src/code.ts')],
    bundle: true, write: false, platform: 'browser', target: 'chrome80', logLevel: 'silent',
  }).outputFiles[0].text;
  // Cette version conserve le défaut de compilation du yield dans la source d'un for…of.
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
        ui: { resize: function () {}, postMessage: function (message) { messages.push(message); } },
        clientStorage: { getAsync: async function () {} },
        root: { getSharedPluginDataKeys: function () { return []; }, getSharedPluginData: function () { return ''; } },
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
    assert.deepEqual(executer('messages.map(function (m) { return m.type; })'), ['initial']);
    executer("figma.ui.onmessage({ type: 'analyser', demande: 1 });");
    const travaux = vm.executePendingJobs();
    if (travaux.error) {
      const erreur = vm.dump(travaux.error);
      travaux.error.dispose();
      assert.fail(JSON.stringify(erreur));
    }
    assert.deepEqual(executer("messages.filter(function (m) { return m.type === 'erreur' || m.type === 'refus'; })"), []);
    assert.equal(executer("messages.filter(function (m) { return m.type === 'bilan' && m.demande === 1; }).length"), 1);
  } finally {
    vm.dispose();
  }
});

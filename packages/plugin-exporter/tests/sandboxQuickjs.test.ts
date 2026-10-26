/**
 * QuickJS, le moteur du sandbox Figma, doit compiler le bundle réel de l'exporteur
 * et exécuter le sérialiseur sur un tableau imbriqué avant tout essai dans Figma.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { buildSync } from 'esbuild';
import { getQuickJS } from 'quickjs-emscripten';
import { serializeJson } from 'ucm-plugin-socle/src/composant/contract/serializeJson';

function compiler(entree: string, options: { iife?: string } = {}): string {
  return buildSync({
    entryPoints: [path.resolve(__dirname, entree)],
    bundle: true, write: false, platform: 'browser', target: 'chrome80', logLevel: 'silent',
    ...(options.iife ? { format: 'iife' as const, globalName: options.iife } : {}),
  }).outputFiles[0].text;
}

async function executer<T>(travail: (executer: (code: string) => unknown) => T): Promise<T> {
  const vm = (await getQuickJS()).createVm();
  try {
    return travail((code) => {
      const resultat = vm.evalCode(code);
      if (resultat.error) {
        const erreur = vm.dump(resultat.error);
        resultat.error.dispose();
        assert.fail(JSON.stringify(erreur));
      }
      const valeur = vm.dump(resultat.value);
      resultat.value.dispose();
      return valeur;
    });
  } finally {
    vm.dispose();
  }
}

test('le sandbox de l’exporteur démarre dans QuickJS', async () => {
  const bundle = compiler('../src/code.ts');
  await executer((run) => {
    run(`
      var ouvertures = 0;
      var __html__ = '';
      var setTimeout = function (rappel) { rappel(); };
      var figma = {
        showUI: function () { ouvertures++; },
        on: function () {},
        notify: function () {},
        currentPage: { selection: [] },
        ui: { resize: function () {}, show: function () {}, postMessage: function () {} },
        clientStorage: { getAsync: async function () {}, setAsync: async function () {} },
        root: { name: 'fichier', getSharedPluginData: function () { return ''; } }
      };
    `);
    run(bundle);
    assert.equal(run('ouvertures'), 1);
  });
});

test('QuickJS exécute le sérialiseur sur un tableau imbriqué', async () => {
  const bundle = compiler('../../plugin-socle/src/composant/contract/serializeJson.ts', { iife: 'serialiseur' });
  const entree = { a: { b: [null, { valeur: 1 }, [2, 3]] } };
  await executer((run) => {
    assert.equal(run(`${bundle}\nserialiseur.serializeJson(${JSON.stringify(entree)})`), serializeJson(entree));
  });
});

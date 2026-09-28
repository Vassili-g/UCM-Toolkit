/** La sonde de préchauffage emploie le parcours de l'index sur le même document. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as composition from '../src/contract/composedComponents';
import * as portee from '../src/contract/porteeDAnalyse';
import * as mesure from '../src/contract/mesure';
import { node, conteneurDeRegles } from './aides/figmaFaux';

test('S2 retrouve les dépendances du moteur et retire ses écoutes après la mesure', async () => {
  const runtime = globalThis as unknown as { figma: unknown };
  const precedent = runtime.figma;
  let ecoutes = 0;
  const maitre = node('COMPONENT', 'Action');
  const masque = node('COMPONENT', 'Masqué');
  const instance = (main: any, visible = true) => node('INSTANCE', main.name, [], {
    visible, getMainComponentAsync: async () => main,
  });
  const racine = node('COMPONENT', 'Exemple', [
    instance(maitre), instance(masque, false),
    instance(node('COMPONENT', 'Action', [], { remote: true })),
  ]);
  const page = node('PAGE', 'Composants', [
    racine, maitre, masque, conteneurDeRegles('Action'), conteneurDeRegles('Masqué'),
  ], {
    selection: [racine], loadAsync: async () => {},
    on: () => { ecoutes += 1; }, off: () => { ecoutes -= 1; },
  });
  runtime.figma = { currentPage: page, skipInvisibleInstanceChildren: false };
  try {
    const attendus = await portee.dansUnePorteeDAnalyse({}, () => composition.indexContractedNames([racine]));
    assert.deepEqual([...attendus], ['action']);
    composition.oublierLIndexDuDocument();
    const chemin = join(__dirname, "../../../docs/notes/Recherches/Performance de l'analyse/sondes/S2-prechauffage.js");
    const source = ts.transpileModule(readFileSync(chemin, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const modules: Record<string, unknown> = { composedComponents: composition, porteeDAnalyse: portee, mesure };
    const sorties: any[] = [];
    await runInNewContext(source, {
      figma: runtime.figma, exports: {}, setTimeout,
      require: (nom: string) => modules[nom.split('/').at(-1)!],
      console: { log: (_tag: string, valeur: unknown) => sorties.push(valeur), error: (_tag: string, erreur: unknown) => { throw erreur; } },
    });
    assert.deepEqual([...sorties[0].contractes], [...attendus]);
    assert.equal(sorties[0].trace.compteurs.pagesChargees, 1);
    assert.ok(sorties[0].battements > 0);
    assert.equal(ecoutes, 0);
  } finally {
    composition.oublierLIndexDuDocument();
    runtime.figma = precedent;
  }
});

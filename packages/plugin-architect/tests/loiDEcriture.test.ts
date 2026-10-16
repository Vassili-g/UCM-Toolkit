/** La loi textuelle borne les appels permis ; les doubles d'écriture couvrent leur exécution. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = path.resolve(__dirname, '../src');
function fichiers(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    return entree.isDirectory() ? fichiers(chemin) : chemin.endsWith('.ts') ? [chemin] : [];
  });
}
const interdits = [
  /\b(?:figma|api)\.create\w*\s*\(/u, /\.remove\s*\(/u, /\.setPluginData\s*\(/u,
  /setValueForMode|setBoundVariable|setExplicitVariableMode|setVariableCodeSyntax|removeOverride/u,
  /createVariable|createVariableCollection|addMode|renameMode|removeMode/u,
  /import(?:Variable|Component|ComponentSet|Style)ByKeyAsync/u,
  /loadAllPagesAsync|triggerUndo|setProperties|swapComponent|addComponentProperty|deleteComponentProperty/u,
  /\.(?:fills|strokes|effects|characters|x|y|opacity|visible|description|scopes|hiddenFromPublishing)\s*[-+*/]?=(?!=)/u,
  /\.selection\s*=(?!=)|setCurrentPageAsync|scrollAndZoomIntoView/u,
];

test('le document ne reçoit que les renommages, la convention et le point d’annulation dans ecriture.ts', () => {
  const fautes: string[] = [];
  for (const fichier of fichiers(source)) {
    const relatif = path.relative(source, fichier);
    const texte = fs.readFileSync(fichier, 'utf8').replace(/\/\*[\s\S]*?\*\//gu, '').replace(/\/\/.*$/gmu, '');
    for (const motif of interdits) if (motif.test(texte)) fautes.push(`${relatif}: ${motif}`);
    if (relatif !== 'ecriture.ts' && /\.name\s*=(?!=)|\.editComponentProperty\s*\(|\.setSharedPluginData\s*\(|\.commitUndo\s*\(/u.test(texte)) fautes.push(relatif);
    if (!relatif.startsWith(`ui${path.sep}`) && /\.appendChild\s*\(|\.insertChild\s*\(/u.test(texte)) fautes.push(`${relatif}: déplacement`);
  }
  assert.deepEqual(fautes, []);
  const ecriture = fs.readFileSync(path.join(source, 'ecriture.ts'), 'utf8');
  assert.match(ecriture, /\.editComponentProperty\(cible\.proprieteId, \{ name: proposition\.nouveauNom \}\)/u);
  assert.match(ecriture, /setSharedPluginData\('ucm_architect', 'conventions', texte\)/u);
  assert.doesNotMatch(ecriture, /defaultValue|preferredValues|\.getNodeById\(/u);
});

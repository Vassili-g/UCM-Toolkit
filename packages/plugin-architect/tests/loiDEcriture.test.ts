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
  /loadAllPagesAsync|loadAsync|triggerUndo|setProperties|swapComponent|addComponentProperty|deleteComponentProperty|editComponentProperty/u,
  /\.(?:fills|strokes|effects|characters|x|y|opacity|visible|description|scopes|hiddenFromPublishing)\s*[-+*/]?=(?!=)/u,
  /\.selection\s*=(?!=)|setCurrentPageAsync|scrollAndZoomIntoView/u,
];
const sansCommentaires = (texte: string): string => texte.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/\/\/.*$/gmu, '');

test('le document ne reçoit que des noms de variables et de collections, les règles du fichier et le point d’annulation, tous dans ecriture.ts', () => {
  const fautes: string[] = [];
  for (const fichier of fichiers(source)) {
    const relatif = path.relative(source, fichier);
    const texte = sansCommentaires(fs.readFileSync(fichier, 'utf8'));
    for (const motif of interdits) if (motif.test(texte)) fautes.push(`${relatif}: ${motif}`);
    if (relatif !== 'ecriture.ts' && /\.name\s*=(?!=)|\.setSharedPluginData\s*\(|\.commitUndo\s*\(/u.test(texte)) fautes.push(relatif);
    if (!relatif.startsWith(`ui${path.sep}`) && /\.appendChild\s*\(|\.insertChild\s*\(/u.test(texte)) fautes.push(`${relatif}: déplacement`);
  }
  assert.deepEqual(fautes, []);
});

test('ecriture.ts affecte `name` d’un seul objet modifiable et ne range que dans l’espace d’Architect', () => {
  const ecriture = sansCommentaires(fs.readFileSync(path.join(source, 'ecriture.ts'), 'utf8'));
  assert.equal(ecriture.match(/\.name\s*=(?!=)/gu)?.length, 1);
  assert.match(ecriture, /etape\.element\.objet\.name = etape\.nom/u);
  const rangements = [...ecriture.matchAll(/setSharedPluginData\(([^,]+),/gu)].map((trouve) => trouve[1]);
  assert.deepEqual(rangements, ['ESPACE_ARCHITECT', 'ESPACE_ARCHITECT']);
  assert.doesNotMatch(ecriture, /getNodeById|getNodeByIdAsync|\.pages\b|findAll|componentPropertyDefinitions|variantProperties/u);
});

test('les variables et les collections se résolvent par l’API asynchrone des variables locales', () => {
  const ecriture = sansCommentaires(fs.readFileSync(path.join(source, 'ecriture.ts'), 'utf8'));
  assert.match(ecriture, /api\.variables\.getLocalVariableCollectionsAsync\(\)/u);
  assert.match(ecriture, /api\.variables\.getLocalVariablesAsync\(\)/u);
});

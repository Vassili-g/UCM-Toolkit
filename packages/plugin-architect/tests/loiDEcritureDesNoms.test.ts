/**
 * La loi textuelle borne les appels permis aux fichiers de Nomenclature ; les doubles d'écriture couvrent leur exécution.
 * Ces fichiers sont `src/nomenclature/`, `src/ui/nomenclature/` et `src/ecriture/noms.ts`, le seul qui écrive.
 * Ce que le reste d'Architect s'interdit est dans `loiDEcriture.test.ts`.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '../src');
const NOMS = path.join('ecriture', 'noms.ts');
const source = path.join(racine, 'nomenclature');
const interfaceNomenclature = path.join(racine, 'ui', 'nomenclature');
const fichiersDeNomenclature = (): string[] => [...fichiers(source), ...fichiers(interfaceNomenclature), path.join(racine, NOMS)];
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

test('le document ne reçoit que des noms de variables et de collections, les règles du fichier et le point d’annulation, tous dans ecriture/noms.ts', () => {
  const fautes: string[] = [];
  for (const fichier of fichiersDeNomenclature()) {
    const relatif = path.relative(racine, fichier);
    const texte = sansCommentaires(fs.readFileSync(fichier, 'utf8'));
    for (const motif of interdits) if (motif.test(texte)) fautes.push(`${relatif}: ${motif}`);
    if (relatif !== NOMS && /\.name\s*=(?!=)|\.setSharedPluginData\s*\(|\.commitUndo\s*\(/u.test(texte)) fautes.push(relatif);
    if (!relatif.startsWith(`ui${path.sep}`) && /\.appendChild\s*\(|\.insertChild\s*\(/u.test(texte)) fautes.push(`${relatif}: déplacement`);
  }
  assert.deepEqual(fautes, []);
});

test('ecriture/noms.ts affecte `name` d’un seul objet modifiable et ne range que dans l’espace d’Architect', () => {
  const ecriture = sansCommentaires(fs.readFileSync(path.join(racine, NOMS), 'utf8'));
  assert.equal(ecriture.match(/\.name\s*=(?!=)/gu)?.length, 1);
  assert.match(ecriture, /etape\.element\.objet\.name = etape\.nom/u);
  const rangements = [...ecriture.matchAll(/setSharedPluginData\(([^,]+),/gu)].map((trouve) => trouve[1]);
  assert.deepEqual(rangements, ['ESPACE_ARCHITECT', 'ESPACE_ARCHITECT']);
  assert.doesNotMatch(ecriture, /getNodeById|getNodeByIdAsync|\.pages\b|findAll|componentPropertyDefinitions|variantProperties/u);
});

test('les variables et les collections se résolvent par l’API asynchrone des variables locales', () => {
  const ecriture = sansCommentaires(fs.readFileSync(path.join(racine, NOMS), 'utf8'));
  assert.match(ecriture, /api\.variables\.getLocalVariableCollectionsAsync\(\)/u);
  assert.match(ecriture, /api\.variables\.getLocalVariablesAsync\(\)/u);
});

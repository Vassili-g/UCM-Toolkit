/**
 * Seuls les fichiers de `src/ecriture/` écrivent dans le document ([ARC-12]).
 * Seuls `src/ecriture/variables.ts`, qui écrit, et
 * `src/lectureDesVariables.ts`, qui lit, appellent `figma.variables`, et
 * aucun fichier de `src/` ne charge toutes les pages ni ne touche aux styles
 * ([ARC-13]).
 *
 * Borne : la loi lit la source ligne à ligne et cherche une liste explicite de
 * motifs. Une affectation absente de la liste, une écriture par crochets
 * (`node['x'] = …`) ou répartie sur deux lignes lui échappe.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');
const SOURCE = path.join(racine, 'src');

/** Le dossier qui écrit. */
const ECRITURE = path.join(SOURCE, 'ecriture');

/**
 * L'interface s'exécute dans une iframe où le global `figma` n'existe pas :
 * ses `appendChild` et ses `.name =` construisent le panneau du plugin.
 */
const INTERFACE = path.join(SOURCE, 'ui');

/** Les appels qui écrivent dans le document, hors de `src/ecriture/`. */
const ECRITURES: { motif: RegExp; quoi: string }[] = [
  { motif: /figma\.create[A-Z]\w*\s*\(/, quoi: 'création de node' },
  { motif: /\.remove\s*\(/, quoi: 'suppression de node' },
  { motif: /\.setPluginData\s*\(/, quoi: 'écriture de plugin data' },
  { motif: /\.setSharedPluginData\s*\(/, quoi: 'écriture de plugin data partagée' },
  { motif: /\.appendChild\s*\(|\.insertChild\s*\(/, quoi: 'déplacement de node' },
  // Une affectation, précédée ou non d'un opérateur, jamais une comparaison.
  { motif: /\.(fills|strokes|name|characters|x|y|layoutMode|fontName|fontSize)\s*[-+*/]?=(?!=)/, quoi: 'propriété de node' },
  // `figma.ui.resize` dimensionne la fenêtre du plugin, pas un node.
  { motif: /(?<!figma\.ui)\.resize\s*\(/, quoi: 'dimension de node' },
];

/** Les deux seuls fichiers qui appellent `figma.variables` : l'un écrit, l'autre lit. */
const VARIABLES = [path.join(ECRITURE, 'variables.ts'), path.join(SOURCE, 'lectureDesVariables.ts')];

/** L'API des variables, quel que soit le nom de la liaison qui porte `figma`. */
const API_DES_VARIABLES: { motif: RegExp; quoi: string }[] = [
  { motif: /\bfigma\w*\.variables\b/i, quoi: 'variables' },
  { motif: /\.(createVariable|createVariableCollection|setValueForMode|addMode|renameMode|getLocalVariablesAsync|getLocalVariableCollectionsAsync|getVariableByIdAsync|getVariableCollectionByIdAsync|importVariableByKeyAsync)\s*\(/, quoi: 'variables' },
];

/** Ce qu'aucun fichier de `src/` n'appelle, écriture et interface comprises. */
const INTERDITS: { motif: RegExp; quoi: string }[] = [
  { motif: /loadAllPagesAsync/, quoi: 'chargement de toutes les pages' },
  { motif: /\b(get|create|import)\w*Style\w*\s*\(/, quoi: 'API de style' },
  { motif: /\.(fill|stroke|text|effect|grid)StyleId\b|set\w*StyleIdAsync/, quoi: 'API de style' },
];

function fichiers(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return fichiers(chemin);
    return chemin.endsWith('.ts') ? [chemin] : [];
  });
}

const dans = (dossier: string) => (fichier: string): boolean => fichier.startsWith(dossier + path.sep);

/** Les lignes de code qui portent un motif ; un commentaire peut nommer ce qu'on s'interdit. */
function fautes(liste: readonly string[], motifs: typeof ECRITURES): string[] {
  const trouvees: string[] = [];
  for (const fichier of liste) {
    fs.readFileSync(fichier, 'utf8').split('\n').forEach((ligne, rang) => {
      const nu = ligne.trim();
      if (nu.startsWith('*') || nu.startsWith('//') || nu.startsWith('/*')) return;
      for (const { motif, quoi } of motifs) {
        if (motif.test(ligne)) trouvees.push(`${path.relative(racine, fichier)}:${rang + 1} ${quoi}`);
      }
    });
  }
  return trouvees;
}

test('[ARC-12] seul src/ecriture/ écrit dans le document', () => {
  // Un dossier renommé viderait l'exclusion ou le balayage sans que rien ne le dise.
  assert.ok(fs.existsSync(ECRITURE), 'src/ecriture/ n’existe plus');
  assert.ok(fs.existsSync(INTERFACE), 'src/ui/ n’existe plus');
  const balayes = fichiers(SOURCE).filter((fichier) => !dans(ECRITURE)(fichier) && !dans(INTERFACE)(fichier));
  assert.ok(balayes.some((fichier) => fichier.endsWith('code.ts')), 'code.ts n’est plus balayé');
  assert.deepEqual(fautes(balayes, ECRITURES), []);
});

test('[ARC-13] aucun fichier de src/ ne charge toutes les pages ni ne touche aux styles', () => {
  assert.deepEqual(fautes(fichiers(SOURCE), INTERDITS), []);
});

test('[ARC-13] seuls src/ecriture/variables.ts et src/lectureDesVariables.ts appellent figma.variables', () => {
  for (const fichier of VARIABLES) assert.ok(fs.existsSync(fichier), `${path.relative(racine, fichier)} n’existe plus`);
  assert.deepEqual(fautes(fichiers(SOURCE).filter((fichier) => !VARIABLES.includes(fichier)), API_DES_VARIABLES), []);
  // Les deux fichiers nommés l'appellent bien : une liste périmée exempterait un fichier pour rien.
  for (const fichier of VARIABLES) assert.ok(fautes([fichier], API_DES_VARIABLES).length > 0, path.relative(racine, fichier));
});

/**
 * Les imports d'un fichier qui chargent `src/ecriture/` à l'exécution : avec
 * ou sans liaison, `import '…'` compris. Un `import type` disparaît à la
 * compilation et ne mène à aucune écriture.
 */
function importeLEcriture(fichier: string): boolean {
  return [...fs.readFileSync(fichier, 'utf8').matchAll(/import\s+(type\s+)?(?:[^'";]*?\s+from\s+)?'([^']+)'/g)]
    .some(([, type, chemin]) => !type && /ecriture\//.test(chemin));
}

test('l’écriture n’est atteignable que par code.ts', () => {
  const importeurs = fichiers(SOURCE)
    .filter(importeLEcriture)
    .map((fichier) => path.relative(SOURCE, fichier));
  assert.deepEqual(importeurs, ['code.ts']);
});

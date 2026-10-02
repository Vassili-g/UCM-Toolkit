/**
 * L'explorateur ne crée ni ne modifie rien dans le document. Aucun fichier de
 * `src/` hors de l'interface n'appelle une création, une suppression, un
 * setter de variable, un import de composant ou de style, une écriture de
 * données ou le chargement de toutes les pages. `src/ui/` en est exclu :
 * l'iframe n'a pas de global `figma`, et ses `appendChild` construisent le
 * panneau du plugin.
 *
 * Un seul import est permis : celui d'une variable par sa clé, dans
 * `lecture.ts`, pour lire la cible d'un alias que Figma ne rend pas par son
 * identifiant.
 *
 * `clientStorage` reçoit la taille de la fenêtre et les préférences du
 * designer, et `figma.ui.resize` redimensionne la fenêtre du plugin.
 *
 * Borne : la loi lit le texte ligne à ligne. Une écriture par crochets ou
 * répartie sur deux lignes lui échappe ; les doubles de `figmaDeTest.ts`
 * couvrent l'exécution.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');
const SOURCE = path.join(racine, 'src');

const INTERDITS: { motif: RegExp; quoi: string }[] = [
  { motif: /figma\.create[A-Z]\w*\s*\(/, quoi: 'création de node' },
  { motif: /\.remove\s*\(/, quoi: 'suppression' },
  { motif: /\.set(Shared)?PluginData\s*\(/, quoi: 'écriture de plugin data' },
  { motif: /\.appendChild\s*\(|\.insertChild\s*\(/, quoi: 'déplacement de node' },
  { motif: /setValueForMode|setBoundVariable|setExplicitVariableMode|setVariableCodeSyntax|removeOverride/, quoi: 'setter de variable' },
  { motif: /createVariable|extend\s*\(|addMode|renameMode|removeMode/, quoi: 'création ou modification de collection' },
  { motif: /import(Component|ComponentSet|Style)ByKeyAsync/, quoi: 'import de composant ou de style' },
  { motif: /loadAllPagesAsync|commitUndo/, quoi: 'chargement de toutes les pages ou point d’annulation' },
  { motif: /\.(fills|strokes|effects|name|characters|x|y|opacity|visible|description|scopes|hiddenFromPublishing)\s*[-+*/]?=(?!=)/, quoi: 'propriété de node ou de variable' },
  { motif: /(?<!figma\.ui)\.resize\s*\(/, quoi: 'dimension de node' },
  { motif: /\.selection\s*=(?!=)|setCurrentPageAsync|scrollAndZoomIntoView/, quoi: 'page courante, sélection ou vue du designer' },
];

function fichiers(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return entree.name === 'ui' ? [] : fichiers(chemin);
    return chemin.endsWith('.ts') ? [chemin] : [];
  });
}

test('aucun fichier du sandbox ni du noyau n’écrit dans le document', () => {
  const balayes = fichiers(SOURCE);
  assert.ok(balayes.some((fichier) => fichier.endsWith('code.ts')), 'src/code.ts n’est plus balayé');
  assert.ok(balayes.some((fichier) => fichier.endsWith(path.join('integrations', 'palettes.ts'))), 'src/integrations/ n’est plus balayé');
  const fautes: string[] = [];
  for (const fichier of balayes) {
    fs.readFileSync(fichier, 'utf8').split('\n').forEach((ligne, rang) => {
      const nu = ligne.trim();
      if (nu.startsWith('*') || nu.startsWith('//') || nu.startsWith('/*')) return;
      for (const { motif, quoi } of INTERDITS) if (motif.test(ligne)) fautes.push(`${path.relative(racine, fichier)}:${rang + 1} ${quoi}`);
    });
  }
  assert.deepEqual(fautes, []);
});

test('seule la lecture importe une variable, par sa clé', () => {
  const importateurs = fichiers(SOURCE).filter((fichier) => {
    const texte = fs.readFileSync(fichier, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    return /importVariableByKeyAsync/.test(texte);
  });
  assert.deepEqual(importateurs.map((fichier) => path.relative(SOURCE, fichier)), ['lecture.ts']);
});

test('seuls le routage et l’aperçu exportent une image', () => {
  const exportateurs = fichiers(SOURCE).filter((fichier) => {
    const texte = fs.readFileSync(fichier, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    return /exportAsync/.test(texte);
  });
  assert.deepEqual(exportateurs.map((fichier) => path.relative(SOURCE, fichier)).filter((fichier) => fichier !== 'code.ts'), ['apercu.ts']);
});

test('le noyau ne lit ni Figma, ni le DOM, ni UCM', () => {
  const noyau = ['modele.ts', 'groupes.ts', 'indexation.ts', 'resolution.ts', 'comparaison.ts', 'diagnostics.ts', 'copie.ts', 'simulation.ts', 'releves.ts', 'composant.ts'];
  const fautes: string[] = [];
  for (const nom of noyau) {
    const texte = fs.readFileSync(path.join(SOURCE, nom), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    if (/\bfigma\./.test(texte)) fautes.push(`${nom} lit figma`);
    if (/\b(document|window)\./.test(texte)) fautes.push(`${nom} lit le DOM`);
    if (/from '(@ucm-kit|ucm-couleur|\.\/integrations)/.test(texte)) fautes.push(`${nom} importe une intégration UCM`);
  }
  assert.deepEqual(fautes, []);
});

test('aucune règle ne dépend d’un nom de collection réservé', () => {
  const noyau = fichiers(SOURCE).filter((fichier) => !fichier.includes(`${path.sep}integrations${path.sep}`));
  const fautes = noyau.filter((fichier) => /['"](usage|theme|brand|primitives|color-utilities|components)['"]/.test(fs.readFileSync(fichier, 'utf8')));
  assert.deepEqual(fautes.map((fichier) => path.relative(racine, fichier)), []);
});

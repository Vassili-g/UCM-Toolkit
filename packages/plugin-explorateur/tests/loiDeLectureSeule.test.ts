/**
 * L'explorateur n'écrit jamais dans le document. Aucun fichier de `src/` hors
 * de l'interface n'appelle une création, une suppression, un setter de
 * variable, un import distant, une écriture de données ou le chargement de
 * toutes les pages. `src/ui/` en est exclu : l'iframe n'a pas de global
 * `figma`, et ses `appendChild` construisent le panneau du plugin.
 *
 * Les seuls gestes permis touchent la vue du designer, à sa demande : page
 * courante, sélection et zoom de `code.ts`, et `clientStorage` pour ses
 * préférences.
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
  { motif: /import(Variable|Component|ComponentSet|Style)ByKeyAsync/, quoi: 'import distant' },
  { motif: /loadAllPagesAsync|commitUndo/, quoi: 'chargement de toutes les pages ou point d’annulation' },
  { motif: /\.(fills|strokes|effects|name|characters|x|y|opacity|visible|description|scopes|hiddenFromPublishing)\s*[-+*/]?=(?!=)/, quoi: 'propriété de node ou de variable' },
  { motif: /(?<!figma\.ui)\.resize\s*\(/, quoi: 'dimension de node' },
];

/** Les affectations permises : elles changent la vue du designer, jamais le document. */
const PERMISES: RegExp[] = [/figma\.currentPage\.selection\s*=/];

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
      if (PERMISES.some((permis) => permis.test(ligne))) return;
      for (const { motif, quoi } of INTERDITS) if (motif.test(ligne)) fautes.push(`${path.relative(racine, fichier)}:${rang + 1} ${quoi}`);
    });
  }
  assert.deepEqual(fautes, []);
});

test('le noyau ne lit ni Figma, ni le DOM, ni UCM', () => {
  const noyau = ['modele.ts', 'groupes.ts', 'indexation.ts', 'resolution.ts', 'comparaison.ts', 'diagnostics.ts', 'copie.ts', 'graphe.ts', 'simulation.ts', 'releves.ts'];
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

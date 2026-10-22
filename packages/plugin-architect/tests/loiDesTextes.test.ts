/**
 * Les vues ne posent aucun mot en dur : ce que le designer lit ou entend vient
 * de `src/ui/textes.ts`.
 *
 * Borne : la loi lit la source ligne à ligne et ne reconnaît qu'un littéral
 * posé directement dans une destination connue. Un mot rangé d'abord dans une
 * variable, ou écrit sur deux lignes, lui échappe.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');
const INTERFACE = path.join(racine, 'src', 'ui');

const LITTERAL = String.raw`(?:'([^']*)'|"([^"]*)"|\x60([^\x60]*)\x60)`;
const ATTRIBUTS = 'textContent|title|placeholder|alt|aria-label|aria-description|aria-valuetext|aria-roledescription';

const DESTINATIONS: RegExp[] = [
  new RegExp(String.raw`\.setAttribute\('(?:${ATTRIBUTS})',\s*${LITTERAL}`),
  new RegExp(String.raw`\.(?:textContent|innerText|title|placeholder|ariaLabel)\s*=\s*${LITTERAL}`),
  new RegExp(String.raw`\b(?:label|libelle|etiquette|infobulle):\s*${LITTERAL}`),
  new RegExp(String.raw`createTextNode\(${LITTERAL}`),
];

function fichiers(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return fichiers(chemin);
    return chemin.endsWith('.ts') && entree.name !== 'textes.ts' ? [chemin] : [];
  });
}

test('aucune vue ne pose un mot hors du catalogue', () => {
  const balayes = fichiers(INTERFACE);
  assert.ok(balayes.some((fichier) => fichier.endsWith('inspecteur.ts')), 'src/ui/ n’est plus balayé');
  const fautes: string[] = [];
  for (const fichier of balayes) {
    fs.readFileSync(fichier, 'utf8').split('\n').forEach((ligne, rang) => {
      const nu = ligne.trim();
      if (nu.startsWith('*') || nu.startsWith('//') || nu.startsWith('/*')) return;
      for (const destination of DESTINATIONS) {
        const trouve = destination.exec(ligne);
        if (!trouve) continue;
        const texte = trouve[1] ?? trouve[2] ?? trouve[3] ?? '';
        if (!/\p{L}/u.test(texte.replace(/\$\{[^}]*\}/g, ''))) continue;
        fautes.push(`${path.relative(racine, fichier)}:${rang + 1} ${JSON.stringify(texte)}`);
      }
    });
  }
  assert.deepEqual(fautes, []);
});

test('le nom du produit ne s’écrit que dans le catalogue, le gabarit et le manifest', () => {
  const { NOM_DU_PRODUIT } = require('../src/ui/textes') as { NOM_DU_PRODUIT: string };
  const manifest = JSON.parse(fs.readFileSync(path.join(racine, 'manifest.json'), 'utf8')) as { name: string };
  assert.equal(manifest.name, NOM_DU_PRODUIT);
  assert.match(fs.readFileSync(path.join(INTERFACE, 'index.html'), 'utf8'), new RegExp(`<title>${NOM_DU_PRODUIT}</title>`));
  const ailleurs = fichiers(path.join(racine, 'src')).filter((fichier) => fs.readFileSync(fichier, 'utf8').includes(NOM_DU_PRODUIT));
  assert.deepEqual(ailleurs, []);
});

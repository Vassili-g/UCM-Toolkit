/**
 * Les vues ne posent aucun mot en dur : ce que le designer lit ou entend vient
 * des catalogues de `src/i18n/`, dans la langue choisie.
 *
 * Borne : la loi lit la source ligne à ligne et ne reconnaît qu'un littéral
 * posé directement dans une liste de destinations (texte, infobulle, nom
 * accessible, libellé de bouton). Un mot rangé d'abord dans une variable, ou
 * écrit sur deux lignes, lui échappe. Elle ne juge pas la langue d'un texte :
 * elle refuse toute lettre, en dehors des exceptions motivées.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');
const INTERFACE = path.join(racine, 'src', 'ui');

/** Un littéral, simple, double ou gabarit, capturé sans ses délimiteurs. */
const LITTERAL = String.raw`(?:'([^']*)'|"([^"]*)"|\x60([^\x60]*)\x60)`;
const ATTRIBUTS = 'textContent|title|placeholder|alt|aria-label|aria-description|aria-valuetext|aria-roledescription';

const DESTINATIONS: RegExp[] = [
  new RegExp(String.raw`\.lier\([^,]+,\s*'(?:${ATTRIBUTS})',\s*${LITTERAL}`),
  new RegExp(String.raw`\.setAttribute\('(?:${ATTRIBUTS})',\s*${LITTERAL}`),
  new RegExp(String.raw`\.(?:textContent|innerText|title|placeholder|ariaLabel)\s*=\s*${LITTERAL}`),
  new RegExp(String.raw`\b(?:label|libelle|etiquette|infobulle):\s*${LITTERAL}`),
  new RegExp(String.raw`createTextNode\(${LITTERAL}`),
];

/** Les littéraux qui portent des lettres sans être des mots de l'interface. */
const EXCEPTIONS: { fichier: string; texte: string; pourquoi: string }[] = [
  { fichier: 'creation.ts', texte: '#1E6FD9', pourquoi: 'un code hexadécimal, identique dans toutes les langues' },
];

function fichiers(dossier: string): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return fichiers(chemin);
    return chemin.endsWith('.ts') ? [chemin] : [];
  });
}

test('aucune vue ne pose un mot hors des catalogues', () => {
  const balayes = fichiers(INTERFACE);
  assert.ok(balayes.some((fichier) => fichier.endsWith('ongletCreation.ts')), 'src/ui/ n’est plus balayé');
  const fautes: string[] = [];
  const exceptionsVues = new Set<string>();
  for (const fichier of balayes) {
    fs.readFileSync(fichier, 'utf8').split('\n').forEach((ligne, rang) => {
      const nu = ligne.trim();
      if (nu.startsWith('*') || nu.startsWith('//') || nu.startsWith('/*')) return;
      for (const destination of DESTINATIONS) {
        const trouve = destination.exec(ligne);
        if (!trouve) continue;
        const texte = trouve[1] ?? trouve[2] ?? trouve[3] ?? '';
        // Seules les lettres hors des substitutions `${…}` comptent.
        if (!/\p{L}/u.test(texte.replace(/\$\{[^}]*\}/g, ''))) continue;
        const exception = EXCEPTIONS.find((e) => e.texte === texte && fichier.endsWith(e.fichier));
        if (exception) { exceptionsVues.add(exception.texte); continue; }
        fautes.push(`${path.relative(racine, fichier)}:${rang + 1} ${JSON.stringify(texte)}`);
      }
    });
  }
  assert.deepEqual(fautes, []);
  // Une exception devenue inutile se retire, pour que la liste reste motivée.
  assert.deepEqual(EXCEPTIONS.map((e) => e.texte).filter((texte) => !exceptionsVues.has(texte)), []);
});

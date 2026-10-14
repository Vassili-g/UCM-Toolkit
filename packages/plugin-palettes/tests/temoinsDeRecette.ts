/** Les recettes témoins de `packages/couleur/tests/fixtures/recettes/`, dans leur forme d'origine : les tests les lisent et ne les réécrivent jamais. */
import fs from 'node:fs';
import path from 'node:path';

export function temoinDeRecette(nom: 'format-8' | 'format-9' | 'format-10'): string {
  return fs.readFileSync(path.resolve(__dirname, '..', '..', 'couleur', 'tests', 'fixtures', 'recettes', `${nom}.json`), 'utf8');
}

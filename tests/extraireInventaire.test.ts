/**
 * `docs/inventaire/extraire.ts` rend une section d'un Markdown, son tableau ou
 * ses sous-titres, et lève sur un titre absent.
 *
 * Les cas de fixture sont des chaînes écrites ici. Un cas réel lit
 * `ROADMAP.md` pour tenir l'extraction contre un document du dépôt.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { sectionDe, sousTitresDe, tableauDe } from '../docs/inventaire/extraire';

const racine = path.resolve(__dirname, '..');

const DOCUMENT = [
  '# Titre',
  '',
  'Intro.',
  '',
  '## Première',
  '',
  'Texte de la première.',
  '',
  '```sh',
  '# pas un titre',
  '```',
  '',
  '### Détail A',
  '',
  'Premier paragraphe de A,',
  'sur deux lignes.',
  '',
  'Second paragraphe de A.',
  '',
  '### Détail B',
  '### Détail C',
  '',
  'Texte de C.',
  '',
  '## Tableau',
  '',
  '| Nom | Rôle |',
  '|---|---|',
  '| `a` | premier \\| rôle |',
  '| b | second |',
  '',
  'Après le tableau.',
  '',
  '## Dernière',
  '',
  'Fin.',
].join('\n');

test('une section court jusqu’au titre de même niveau suivant, sous-sections comprises', () => {
  const section = sectionDe(DOCUMENT, 'essai.md', 'Première');
  assert.ok(section.startsWith('Texte de la première.'));
  assert.ok(section.includes('# pas un titre'));
  assert.ok(section.includes('### Détail C'));
  assert.ok(!section.includes('Tableau'));
});

test('la dernière section court jusqu’à la fin du document', () => {
  assert.equal(sectionDe(DOCUMENT, 'essai.md', 'Dernière'), 'Fin.');
});

test('un titre absent lève « ancre <titre> absente de <chemin> »', () => {
  assert.throws(
    () => sectionDe(DOCUMENT, 'docs/essai.md', 'Inconnue'),
    /ancre Inconnue absente de docs\/essai\.md/,
  );
  assert.throws(() => tableauDe(DOCUMENT, 'a.md', 'Inconnue'), /ancre Inconnue absente de a\.md/);
  assert.throws(() => sousTitresDe(DOCUMENT, 'a.md', 'Inconnue'), /ancre Inconnue absente de a\.md/);
});

test('un titre dans un bloc de code ne borne pas la section', () => {
  assert.throws(() => sectionDe(DOCUMENT, 'essai.md', 'pas un titre'), /ancre/);
});

test('le tableau d’une section devient des objets dont les clés sont les en-têtes', () => {
  assert.deepEqual(tableauDe(DOCUMENT, 'essai.md', 'Tableau'), [
    { Nom: '`a`', Rôle: 'premier | rôle' },
    { Nom: 'b', Rôle: 'second' },
  ]);
  assert.deepEqual(tableauDe(DOCUMENT, 'essai.md', 'Dernière'), []);
});

test('les sous-titres directs sont rendus avec leur premier paragraphe', () => {
  assert.deepEqual(sousTitresDe(DOCUMENT, 'essai.md', 'Première'), [
    { titre: 'Détail A', paragraphe: 'Premier paragraphe de A, sur deux lignes.' },
    { titre: 'Détail B', paragraphe: '' },
    { titre: 'Détail C', paragraphe: 'Texte de C.' },
  ]);
});

test('ROADMAP.md porte une section existante et un titre manquant lève', () => {
  const texte = fs.readFileSync(path.join(racine, 'ROADMAP.md'), 'utf8');
  assert.ok(sectionDe(texte, 'ROADMAP.md', 'Ce qui fonctionne').length > 0);
  assert.throws(() => sectionDe(texte, 'ROADMAP.md', 'Section qui n’existe pas'), /ancre .* absente de ROADMAP\.md/);
});

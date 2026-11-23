/**
 * `docs/inventaire/extraire.ts` rend une section d'un Markdown, son tableau,
 * ses sous-titres ou ses questions, et lève sur un titre absent.
 *
 * Les cas de fixture sont des chaînes écrites ici. Un cas réel lit
 * `VALIDATIONS-MVP.md` pour tenir l'extraction contre un document du dépôt, et un autre
 * lit les questions de deux recherches.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { aUnTitreContenant, questionsDe, sectionContenant, sectionDe, sousTitresDe, tableauDe } from '../docs/inventaire/extraire';

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

test('VALIDATIONS-MVP.md porte une section existante et un titre manquant lève', () => {
  const texte = fs.readFileSync(path.join(racine, 'VALIDATIONS-MVP.md'), 'utf8');
  assert.ok(sectionDe(texte, 'VALIDATIONS-MVP.md', 'Ce qui fonctionne').length > 0);
  assert.throws(() => sectionDe(texte, 'VALIDATIONS-MVP.md', 'Section qui n’existe pas'), /ancre .* absente de VALIDATIONS-MVP.md/);
});

const AVEC_QUESTIONS = [
  '# Recherche',
  '',
  '## 4. Le jeu de questions',
  '',
  'Pas la bonne section.',
  '',
  '## Questions au mainteneur : première série',
  '',
  'Intro.',
  '',
  '- Une question simple ?',
  '- [Un lien](#ancre), puis la suite.',
  '- Une question sur',
  '  deux lignes ?',
  '',
  '### Détail',
  '',
  '```md',
  '- pas une question',
  '```',
  '',
  '## Après',
  '',
  '- Hors section.',
].join('\n');

test('une section se désigne par un titre qui en contient le texte, sans tenir compte de la casse', () => {
  const section = sectionContenant(AVEC_QUESTIONS, 'essai.md', 'questions au mainteneur');
  assert.ok(section.startsWith('Intro.'));
  assert.ok(section.includes('### Détail'));
  assert.ok(!section.includes('Hors section'));
  assert.ok(aUnTitreContenant(AVEC_QUESTIONS, 'Questions au mainteneur'));
  assert.ok(!aUnTitreContenant(AVEC_QUESTIONS, 'Réponses'));
  assert.throws(() => sectionContenant(AVEC_QUESTIONS, 'docs/essai.md', 'Réponses'), /ancre Réponses absente de docs\/essai\.md/);
});

test('un élément de liste est une question, son lien et ses lignes indentées comprises', () => {
  const section = sectionContenant(AVEC_QUESTIONS, 'essai.md', 'Questions au mainteneur');
  assert.deepEqual(questionsDe(section), ['Une question simple ?', 'Un lien, puis la suite.', 'Une question sur deux lignes ?']);
});

test('une liste numérotée, une ligne de tableau et un paragraphe en gras sont des questions', () => {
  assert.deepEqual(questionsDe('1. Première ?\n2. Seconde ?\n   Suite.'), ['Première ?', 'Seconde ? Suite.']);
  assert.deepEqual(questionsDe('| Choix | Texte |\n|---|---|\n| Q1 | Quelle forme ? |\n| Q2 | Quel nom ? |'), ['Q1 : Quelle forme ?', 'Q2 : Quel nom ?']);
  const enGras = '**Q1. La forme de la bascule.**\n(a) Reprendre. (b) Passer.\nRecommandation : (a).\n\n**Q2. La taille.**\n(a) Commune.';
  assert.deepEqual(questionsDe(enGras), ['Q1. La forme de la bascule.', 'Q2. La taille.']);
});

test("un paragraphe sans puce ni gras n'est pas une question, une section sans question n'en donne aucune", () => {
  assert.deepEqual(questionsDe('Réponses du mainteneur :\n\nLa prio 4 est validée.'), []);
  assert.deepEqual(questionsDe(''), []);
});

test('les questions de P22 et de P23 se lisent dans leurs recherches', () => {
  const lire = (chemin: string): string => fs.readFileSync(path.join(racine, chemin), 'utf8').replace(/\r\n/g, '\n');
  const p22 = 'docs/notes/Recherches/Pièces internes/RECHERCHE-PIECES-INTERNES.md';
  const p23 = 'docs/notes/Recherches/Plugin Exporter/RECHERCHE-SELECTION-ET-STYLE-DICTIONARY.md';
  assert.equal(questionsDe(sectionContenant(lire(p22), p22, 'Questions au mainteneur')).length, 4);
  const questionsP23 = questionsDe(sectionContenant(lire(p23), p23, 'Questions au mainteneur'));
  assert.equal(questionsP23.length, 10);
  assert.equal(questionsP23[1], 'Q2. La taille de la fenêtre par mode.');
});

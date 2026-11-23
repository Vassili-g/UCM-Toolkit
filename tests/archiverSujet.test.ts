/**
 * Le calcul d'archivage (`scripts/archiver-sujet.mjs`) sur un dépôt Git
 * temporaire : ce que chaque citation change à la proposition, ce qui ne compte
 * pas comme citation, le refus d'une piste non livrée et la réécriture des
 * liens par `--figer`.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { calculerArchivage, figer, tableMarkdown } from '../scripts/archiver-sujet.mjs';

const PISTES = 'docs/notes/Recherches/Evolutions globales/pistes.json';
const DOSSIER = 'docs/notes/Recherches/Archi Tokens Multi-marques';

function ecrire(racine: string, chemin: string, contenu: string): void {
  const complet = path.join(racine, chemin);
  fs.mkdirSync(path.dirname(complet), { recursive: true });
  fs.writeFileSync(complet, contenu);
}

/** Un dépôt avec une piste P1 livrée (ou non), son dossier de trois fichiers et les citeurs donnés. */
function depot(citeurs: Record<string, string>, livre = true): string {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'archiver-'));
  execFileSync('git', ['init', '-q'], { cwd: racine });
  const piste = { id: 'P1', recherche: `${DOSSIER}/RECHERCHE.md`, plan: `${DOSSIER}/PLAN.md` };
  const autre = { id: 'P2', recherche: 'docs/autre/R.md', plan: null, points: 'rien' };
  ecrire(racine, PISTES, JSON.stringify({ version: 1, pistes: [piste, autre] }, null, 2));
  ecrire(racine, `${DOSSIER}/RECHERCHE.md`, '# Recherche\n');
  ecrire(racine, `${DOSSIER}/PLAN.md`, `# Plan\n\n- [x] 1 fait\n- [${livre ? 'x' : ' '}] 2 reste\n\n\`\`\`\n- [ ] ignoré\n\`\`\`\n`);
  ecrire(racine, `${DOSSIER}/cite-par-code.md`, 'a\n');
  ecrire(racine, `${DOSSIER}/cite-par-document.md`, 'b\n');
  ecrire(racine, `${DOSSIER}/sans-citation.md`, 'c\n');
  ecrire(racine, `${DOSSIER}/outil.mjs`, 'export {};\n');
  for (const [chemin, contenu] of Object.entries(citeurs)) ecrire(racine, chemin, contenu);
  execFileSync('git', ['add', '-A'], { cwd: racine });
  return racine;
}

function proposition(racine: string, fichier: string): string {
  const ligne = calculerArchivage(racine, 'P1').fichiers.find((l: { chemin: string }) => l.chemin === `${DOSSIER}/${fichier}`);
  assert.ok(ligne, `${fichier} absent de la table`);
  return ligne.proposition;
}

test('un fichier cité par du code est gardé, par un document relu, sans citation supprimé', () => {
  const racine = depot({
    'scripts/outil-voisin.mjs': `// voir ${DOSSIER}/cite-par-code.md\n`,
    'docs/guide.md': `Voir [le fichier](${DOSSIER}/cite-par-document.md).\n`,
  });
  assert.equal(proposition(racine, 'cite-par-code.md'), 'garder');
  assert.equal(proposition(racine, 'cite-par-document.md'), 'relire');
  assert.equal(proposition(racine, 'sans-citation.md'), 'supprimer');
});

test("un outil cité reste gardé, même par un seul document ; la fiche de la piste dans pistes.json ne compte pas", () => {
  const racine = depot({ 'docs/guide.md': `Lancer \`${DOSSIER}/outil.mjs\`.\n` });
  assert.equal(proposition(racine, 'outil.mjs'), 'garder');
  assert.equal(proposition(racine, 'RECHERCHE.md'), 'supprimer');
});

test("une citation relative encodée compte", () => {
  const racine = depot({
    'docs/notes/Recherches/README.md': '[x](Archi%20Tokens%20Multi-marques/cite-par-document.md)\n',
  });
  assert.equal(proposition(racine, 'cite-par-document.md'), 'relire');
});

test("une citation depuis docs/notes/Archives/ ou INVENTAIRE-UCM.html ne compte pas", () => {
  const racine = depot({
    'docs/notes/Archives/vieux.md': `[x](../../../${DOSSIER}/cite-par-code.md)\n`,
    'INVENTAIRE-UCM.html': `<a href="${DOSSIER}/cite-par-document.md">x</a>\n`,
  });
  assert.equal(proposition(racine, 'cite-par-code.md'), 'supprimer');
  assert.equal(proposition(racine, 'cite-par-document.md'), 'supprimer');
});

test('un lien figé vers un commit ne compte pas, et un fichier gardé qui lie un fichier supprimé est signalé', () => {
  const racine = depot({
    'docs/guide.md': `https://github.com/Vassili-g/UCM-Toolkit/blob/abcdef1/${DOSSIER}/sans-citation.md\n`,
    'scripts/lit.mjs': `// ${DOSSIER}/cite-par-code.md\n`,
  });
  ecrire(racine, `${DOSSIER}/cite-par-code.md`, 'Voir [c](sans-citation.md).\n');
  const calcul = calculerArchivage(racine, 'P1');
  assert.equal(proposition(racine, 'sans-citation.md'), 'supprimer');
  assert.deepEqual(calcul.liensVersSupprimes, [
    { depuis: `${DOSSIER}/cite-par-code.md`, vers: `${DOSSIER}/sans-citation.md` },
  ]);
});

test("une piste non livrée, inconnue ou sans plan est refusée", () => {
  const racine = depot({}, false);
  assert.throws(() => calculerArchivage(racine, 'P1'), /n'est pas livré/);
  assert.throws(() => calculerArchivage(racine, 'P9'), /inconnue/);
  assert.throws(() => calculerArchivage(racine, 'P2'), /pas de plan/);
});

test("--figer réécrit un lien relatif avec son ancre et laisse un lien externe intact", () => {
  const racine = depot({
    'docs/guide.md': [
      `[a](../${DOSSIER.replace(/ /g, '%20')}/sans-citation.md#Une-section)`,
      `[b](../${DOSSIER.replace(/ /g, '%20')}/sans-citation.md)`,
      '[c](https://example.com/sans-citation.md)',
      '[d]: ../' + DOSSIER.replace(/ /g, '%20') + '/sans-citation.md#x',
      '',
    ].join('\n'),
    'docs/notes/Archives/vieux.md': `[a](../../../${DOSSIER.replace(/ /g, '%20')}/sans-citation.md)\n`,
  });
  const modifies = figer(racine, 'abc1234', [`${DOSSIER}/sans-citation.md`]);
  assert.deepEqual(modifies, ['docs/guide.md']);
  const encode = 'docs/notes/Recherches/Archi%20Tokens%20Multi-marques/sans-citation.md';
  const base = `https://github.com/Vassili-g/UCM-Toolkit/blob/abc1234/${encode}`;
  assert.equal(
    fs.readFileSync(path.join(racine, 'docs/guide.md'), 'utf8'),
    [`[a](${base}#Une-section)`, `[b](${base})`, '[c](https://example.com/sans-citation.md)', `[d]: ${base}#x`, ''].join('\n'),
  );
  assert.match(fs.readFileSync(path.join(racine, 'docs/notes/Archives/vieux.md'), 'utf8'), /^\[a\]\(\.\.\//);
});

test("un outil non cité est à relire, jamais à supprimer", () => {
  const racine = depot({});
  assert.equal(proposition(racine, 'outil.mjs'), 'relire');
});

test("package.json compte comme code", () => {
  const racine = depot({ 'package.json': `{ "scripts": { "x": "node ${DOSSIER}/outil.mjs" } }\n` });
  assert.equal(proposition(racine, 'outil.mjs'), 'garder');
  const calcul = calculerArchivage(racine, 'P1');
  const ligne = calcul.fichiers.find((l: { chemin: string }) => l.chemin.endsWith('outil.mjs'));
  assert.deepEqual(ligne?.citations, [{ depuis: 'package.json', nature: 'code' }]);
});

test("un dossier partagé avec une piste non livrée garde les fichiers qu'elle cite", () => {
  const racine = depot({});
  const piste = path.join(racine, PISTES);
  const donnees = JSON.parse(fs.readFileSync(piste, 'utf8'));
  donnees.pistes.push({ id: 'P3', recherche: `${DOSSIER}/RECHERCHE-P3.md`, plan: `${DOSSIER}/PLAN-P3.md` });
  fs.writeFileSync(piste, JSON.stringify(donnees, null, 2));
  ecrire(racine, `${DOSSIER}/RECHERCHE-P3.md`, 'Voir [c](sans-citation.md).\n');
  ecrire(racine, `${DOSSIER}/PLAN-P3.md`, '- [ ] 1\n');
  execFileSync('git', ['add', '-A'], { cwd: racine });
  const calcul = calculerArchivage(racine, 'P1');
  assert.deepEqual(calcul.dossierPartage, ['P3']);
  assert.equal(proposition(racine, 'sans-citation.md'), 'garder');
  assert.equal(proposition(racine, 'PLAN-P3.md'), 'garder');
  assert.equal(proposition(racine, 'cite-par-document.md'), 'supprimer');
  assert.match(tableMarkdown(calcul), /Dossier partagé avec P3, non livrée : le dossier ne se déplace pas\./);
});

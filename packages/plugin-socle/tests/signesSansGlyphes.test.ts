/** Les sortes d'objet se montrent par `creerSigne`, jamais par un caractère de sorte écrit dans l'interface d'un plugin. */
import assert from 'node:assert/strict';
import test from 'node:test';

import fs from 'node:fs';
import path from 'node:path';

/** Les caractères que les signes ont remplacés dans la colonne de gauche d'Architect : forme, taille, épaisseur. */
const GLYPHES_REFUSES = ['◜', '⤢', '─'];

const racine = path.resolve(__dirname, '..', '..');

/** Les fichiers `.ts` de `src/ui/**` de chaque plugin. */
function sourcesDesInterfaces(): string[] {
  const trouves: string[] = [];
  const parcourir = (dossier: string): void => {
    for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
      const chemin = path.join(dossier, entree.name);
      if (entree.isDirectory()) parcourir(chemin);
      else if (entree.name.endsWith('.ts')) trouves.push(chemin);
    }
  };
  for (const paquet of fs.readdirSync(racine)) {
    const ui = path.join(racine, paquet, 'src', 'ui');
    if (paquet.startsWith('plugin-') && fs.existsSync(ui)) parcourir(ui);
  }
  return trouves;
}

/** Le texte sans commentaires de bloc ni de ligne ; un `//` après `:` est celui d'une adresse. */
const sansCommentaires = (texte: string): string => texte.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/(?<!:)\/\/.*$/gmu, '');

const glyphesDe = (texte: string): string[] => GLYPHES_REFUSES.filter((glyphe) => sansCommentaires(texte).includes(glyphe));

test('la garde lit les commentaires et refuse le reste', () => {
  assert.deepEqual(glyphesDe('// ◜ forme\n/* ⤢ taille */\nconst a = 1;'), []);
  assert.deepEqual(glyphesDe("const forme = '◜';"), ['◜']);
  assert.deepEqual(glyphesDe("const t = '─'; // ⤢"), ['─']);
});

test('aucune interface de plugin n’écrit ◜ ⤢ ─ hors d’un commentaire', () => {
  const fichiers = sourcesDesInterfaces();
  assert.ok(fichiers.length > 20, 'la garde doit lire les interfaces des plugins');
  const fautifs = fichiers
    .map((fichier) => ({ fichier: path.relative(racine, fichier).split(path.sep).join('/'), glyphes: glyphesDe(fs.readFileSync(fichier, 'utf8')) }))
    .filter(({ glyphes }) => glyphes.length > 0)
    .map(({ fichier, glyphes }) => `${fichier} : ${glyphes.join(' ')}`);
  assert.deepEqual(fautifs, [], 'Ces caractères disent une sorte d’objet : poser le signe du kit avec creerSigne.');
});

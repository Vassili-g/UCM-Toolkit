/**
 * Aucun document Markdown n'existe hors du registre.
 *
 * `.agents/domiciles.json` (clé `registre`) liste les motifs où le dépôt
 * accepte un `.md`. Un document créé ailleurs n'a ni domicile ni propriétaire :
 * il double une règle sans qu'on le sache. Le test prend les fichiers suivis et
 * ceux qui ne le sont pas encore (hors `.gitignore`), pour qu'un document
 * écrit pendant une session soit refusé avant son commit.
 *
 * `scripts/hook-documents.mjs` refuse la même création à l'écriture, avec le
 * même motif et le même message.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { chargerManifeste, correspond } from '../scripts/agents-contexte.mjs';

const racine = path.resolve(__dirname, '..');

function git(...args: string[]): string[] {
  const sortie = execFileSync('git', ['-c', 'core.quotepath=false', ...args], {
    cwd: racine,
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  });
  return sortie.split(/\r?\n/).filter(Boolean);
}

test('chaque Markdown du dépôt correspond à un motif du registre', () => {
  const registre = chargerManifeste(racine).registre as string[];
  assert.ok(registre.length > 0, 'le manifeste ne porte plus de registre');

  const documents = [
    ...git('ls-files', '*.md'),
    ...git('ls-files', '--others', '--exclude-standard', '*.md'),
  ].filter((chemin) => fs.existsSync(path.join(racine, chemin)));
  assert.ok(documents.length >= 50, `seuls ${documents.length} documents trouvés`);

  const hors = documents.filter((chemin) => !registre.some((motif) => correspond(motif, chemin)));
  assert.deepEqual(
    hors,
    [],
    `Documents hors registre :\n${hors.join('\n')}\n`
      + 'Écrire dans le domicile que donne `npm run agents:domicile`, ou faire ajouter '
      + "l'emplacement au registre par le mainteneur.",
  );
});

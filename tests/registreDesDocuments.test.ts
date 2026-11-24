/**
 * Aucun document Markdown n'existe hors du registre.
 *
 * `.agents/domiciles.json` (clés `registre` et `locaux`) liste les motifs où le
 * dépôt accepte un `.md`. Un document créé ailleurs n'a ni domicile ni
 * propriétaire : il double une règle sans qu'on le sache. `documentsHorsRegistre`
 * prend les fichiers suivis et ceux qui ne le sont pas encore (hors
 * `.gitignore`), pour qu'un document écrit pendant une session soit refusé
 * avant son commit.
 *
 * `scripts/hook-documents.mjs` refuse la même création à l'écriture, par le
 * même `verdictDuRegistre` et le même message.
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { chargerManifeste, documentsHorsRegistre, verdictDuRegistre } from '../scripts/agents-contexte.mjs';

const racine = path.resolve(__dirname, '..');

test('chaque Markdown du dépôt a un verdict accepté du registre', () => {
  const manifeste = chargerManifeste(racine);
  assert.ok((manifeste.registre as string[]).length > 0, 'le manifeste ne porte plus de registre');

  const hors = documentsHorsRegistre(racine);
  assert.deepEqual(
    hors,
    [],
    `Documents hors registre :\n${hors.join('\n')}\n`
      + 'Écrire dans le domicile que donne `npm run agents:domicile`, ou faire ajouter '
      + "l'emplacement au registre par le mainteneur.",
  );
});

test('le registre accepte les notes de travail de _local/ et refuse un chemin inconnu', () => {
  const manifeste = chargerManifeste(racine);
  assert.equal(verdictDuRegistre(manifeste, '_local/notes.md').accepte, true);
  assert.equal(verdictDuRegistre(manifeste, 'packages/kit/_local/essai.md').accepte, true);
  assert.equal(verdictDuRegistre(manifeste, 'divers/essai.md').accepte, false);
});

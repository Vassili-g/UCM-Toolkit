/**
 * Refuse la création d'un document Markdown hors du registre.
 *
 * Branché en `PreToolUse` sur `Write` par `.claude/settings.json`. Le registre
 * est la clé `registre` de `.agents/domiciles.json` ; `tests/registreDesDocuments.test.ts`
 * tient la même règle sur le dépôt, après coup. Le hook la rend à l'agent avant
 * que le fichier n'existe.
 *
 * Le refus ne vise que la création : écrire par-dessus un `.md` qui existe déjà
 * passe, comme tout fichier qui n'est pas un `.md` ou qui sort du dépôt. Sortie
 * 2, qui rend le texte de l'erreur à l'agent, plutôt que 1, qui n'irait qu'au
 * journal.
 *
 * Node lit l'entrée standard lui-même : ce dépôt tourne sous Windows, où `jq`
 * n'est pas installé.
 */
import fs from 'node:fs';
import path from 'node:path';

import { chargerManifeste, correspond, normaliser } from './agents-contexte.mjs';
import { racine } from './controle-style.mjs';

/** Le JSON que le hook reçoit sur son entrée standard, ou rien. */
async function demande() {
  const morceaux = [];
  for await (const bloc of process.stdin) morceaux.push(bloc);
  const brut = morceaux.join('').trim();
  if (brut === '') return null;
  try {
    return JSON.parse(brut);
  } catch {
    return null;
  }
}

const entree = await demande();
const vise = entree?.tool_input?.file_path;
if (typeof vise !== 'string' || vise === '') process.exit(0);

const chemin = normaliser(vise, racine);
const horsDuDepot = path.isAbsolute(chemin) || /^[a-zA-Z]:\//.test(chemin) || chemin.startsWith('..');
if (horsDuDepot || !chemin.endsWith('.md')) process.exit(0);
if (fs.existsSync(path.join(racine, chemin))) process.exit(0);

const registre = chargerManifeste(racine).registre ?? [];
if (registre.some((motif) => correspond(motif, chemin))) process.exit(0);

process.stderr.write(
  `Le registre des documents refuse la création de ${chemin}.\n`
    + 'Écrire dans le domicile que donne `npm run agents:domicile`, ou faire ajouter '
    + "l'emplacement au registre par le mainteneur.\n",
);
process.exit(2);

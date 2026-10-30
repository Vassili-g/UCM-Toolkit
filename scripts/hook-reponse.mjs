/**
 * Contrôle la dernière réponse d'un agent contre les motifs de refus communs
 * aux fichiers et aux réponses.
 *
 * Branché en `Stop` et en `SubagentStop` par `.claude/settings.json`. Seuls
 * les motifs de `MOTIFS_DE_REFUS_PARTOUT` s'appliquent : ni tiret, ni emphase,
 * ni signal, qui ne visent que les fichiers. Une faute sort en code 2 : Claude
 * Code rend le texte de stderr à l'agent, qui réécrit sa réponse.
 *
 * Le texte vient de `last_assistant_message` ; à défaut, du dernier message
 * `assistant` à blocs `text` du transcript JSONL (`agent_transcript_path` pour
 * un sous-agent, sinon `transcript_path`). `stop_hook_active` à `true` coupe la
 * boucle : la réponse réécrite ne se contrôle pas une seconde fois.
 */
import fs from 'node:fs';

import { fautesDeReponse } from './controle-style.mjs';

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

/** Le texte du dernier message de l'assistant dans un transcript JSONL, ou rien. */
function dernierMessage(transcript) {
  let contenu;
  try {
    contenu = fs.readFileSync(transcript, 'utf8');
  } catch {
    return null;
  }
  const lignes = contenu.split(/\r?\n/).filter(Boolean);
  for (let i = lignes.length - 1; i >= 0; i -= 1) {
    let ligne;
    try {
      ligne = JSON.parse(lignes[i]);
    } catch {
      continue;
    }
    if (ligne?.type !== 'assistant' || !Array.isArray(ligne.message?.content)) continue;
    const textes = ligne.message.content
      .filter((bloc) => bloc?.type === 'text' && typeof bloc.text === 'string')
      .map((bloc) => bloc.text);
    if (textes.length > 0) return textes.join('\n');
  }
  return null;
}

const entree = await demande();
if (!entree || entree.stop_hook_active === true) process.exit(0);

let texte = typeof entree.last_assistant_message === 'string' && entree.last_assistant_message !== ''
  ? entree.last_assistant_message
  : null;
if (texte === null) {
  const transcript = entree.agent_transcript_path ?? entree.transcript_path;
  if (typeof transcript === 'string') texte = dernierMessage(transcript);
}
if (texte === null) process.exit(0);

const fautes = fautesDeReponse(texte);
if (fautes.length === 0) process.exit(0);

process.stderr.write(
  `Ta dernière réponse contient ${fautes.length} tournure(s) que le dépôt refuse :\n`
    + `${fautes.map((faute) => `- ${faute.extrait}`).join('\n')}\n\n`
    + 'Réécris ta dernière réponse en entier sans ces tournures, selon le bloc « Écrire » '
    + 'd\'AGENTS.md. Une phrase sans fait se supprime.\n',
);
process.exit(2);

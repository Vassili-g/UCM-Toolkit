/**
 * Refuse la création d'un document Markdown hors du registre.
 *
 * Branché en `PreToolUse` sur `Write` par `.claude/settings.json`. Le registre
 * est la clé `registre` de `.agents/domiciles.json`, complétée par `locaux`
 * (les notes de travail que Git ignore) ; `verdictDuRegistre` de
 * `agents-contexte.mjs` rend le verdict, et `tests/registreDesDocuments.test.ts`
 * le tient sur le dépôt, après coup. Le hook le rend à l'agent avant que le
 * fichier n'existe.
 *
 * Le refus ne vise que la création : écrire par-dessus un `.md` qui existe déjà
 * passe, comme tout fichier qui n'est pas un `.md` ou qui sort du dépôt. Sortie
 * 2, qui rend le texte de l'erreur à l'agent, plutôt que 1, qui n'irait qu'au
 * journal.
 *
 * Sur un registre illisible, le hook rend la décision `ask` et sort 0, pour
 * que le mainteneur confirme la création à la main.
 *
 * Node lit l'entrée standard lui-même : ce dépôt tourne sous Windows, où `jq`
 * n'est pas installé.
 */
import fs from 'node:fs';
import path from 'node:path';

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

try {
  const { chargerManifeste, normaliser, verdictDuRegistre } = await import('./agents-contexte.mjs');
  const { racine } = await import('./controle-style.mjs');

  const entree = await demande();
  const vise = entree?.tool_input?.file_path;
  if (typeof vise !== 'string' || vise === '') process.exit(0);

  const chemin = normaliser(vise, racine);
  const horsDuDepot = path.isAbsolute(chemin) || /^[a-zA-Z]:\//.test(chemin) || chemin.startsWith('..');
  if (horsDuDepot || !chemin.endsWith('.md')) process.exit(0);
  if (fs.existsSync(path.join(racine, chemin))) process.exit(0);

  const verdict = verdictDuRegistre(chargerManifeste(racine), chemin);
  if (verdict.accepte) process.exit(0);

  process.stderr.write(`${verdict.message}\n`);
  process.exit(2);
} catch (erreur) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: `Le registre des documents est illisible : ${erreur instanceof Error ? erreur.message : String(erreur)}. Confirmez la création à la main.`,
    },
  }));
  process.exit(0);
}

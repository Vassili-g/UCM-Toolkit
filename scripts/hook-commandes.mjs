/**
 * Refuse qu'un agent lance une commande que le mainteneur se réserve.
 *
 * Branché en `PreToolUse` sur `Bash` et `PowerShell` par `.claude/settings.json`.
 * La clé `interdits` de `.agents/domiciles.json` liste les noms de commande
 * (`test:ui`, `galerie:captures`). Une commande qui en contient un sort en code
 * 2, sauf si le fichier `_local/autorise-test-ui` existe : le mainteneur le
 * crée pour autoriser une session.
 *
 * Sur une erreur interne, le hook rend la décision `ask` et sort 0.
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
  const { chargerManifeste } = await import('./agents-contexte.mjs');
  const { racine } = await import('./controle-style.mjs');

  const entree = await demande();
  const commande = entree?.tool_input?.command;
  if (typeof commande !== 'string' || commande === '') process.exit(0);

  const interdits = chargerManifeste(racine).interdits ?? [];
  const nom = interdits.find((interdit) => commande.includes(interdit));
  if (nom === undefined) process.exit(0);
  if (fs.existsSync(path.join(racine, '_local', 'autorise-test-ui'))) process.exit(0);

  process.stderr.write(`\`${nom}\` est réservé au mainteneur. Il crée \`_local/autorise-test-ui\` pour l'autoriser.\n`);
  process.exit(2);
} catch (erreur) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: `Le contrôle des commandes réservées n'a pas pu s'exécuter : ${erreur instanceof Error ? erreur.message : String(erreur)}. Confirmez la commande à la main.`,
    },
  }));
  process.exit(0);
}

/**
 * Refuse qu'un agent lance une commande que le mainteneur se réserve.
 *
 * Branché en `PreToolUse` sur `Bash` et `PowerShell` par `.claude/settings.json`.
 * La clé `interdits` de `.agents/domiciles.json` liste les noms de script
 * (`test:ui`, `galerie:captures`). Une commande qui lance l'un d'eux par
 * `npm run` (ou `npm run-script`) sort en code 2, sauf si le fichier
 * `_local/autorise-test-ui` existe : le mainteneur le crée pour autoriser une
 * session. Un nom écrit dans une chaîne entre guillemets ou dans le corps d'un
 * heredoc ne lance rien, et ne compte pas, sauf la chaîne que `bash -c`,
 * `cmd /c` ou `powershell -Command` exécute. `npm.cmd` vaut `npm`.
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

/** Le texte de la commande sans le corps de ses heredocs ni ses chaînes entre guillemets. */
function commandeSansTexte(commande) {
  const lignes = commande.split(/\r?\n/);
  const gardees = [];
  for (let i = 0; i < lignes.length; i++) {
    gardees.push(lignes[i]);
    const marque = /<<-?\s*['"]?([A-Za-z_][\w-]*)['"]?/.exec(lignes[i]);
    if (!marque) continue;
    while (i + 1 < lignes.length && lignes[i + 1].trim() !== marque[1]) i++;
  }
  return gardees.join('\n').replace(/'[^']*'|"(?:\\.|[^"\\])*"/g, ' ');
}

/** Les options de npm qui prennent le mot suivant : `npm run -w paquet test:ui` lance `test:ui`. */
const OPTIONS_A_VALEUR = new Set(['-w', '--workspace', '--prefix', '-C']);

/** La chaîne que `bash -c`, `sh -c`, `cmd /c` ou `powershell -Command` exécute : elle lance une commande. */
const CHAINE_EXECUTEE = /\b(?:bash|sh|zsh|cmd|powershell|pwsh)(?:\.exe)?\s+(?:-[\w-]+\s+)*?(?:-c|-Command|\/c)\s+('[^']*'|"(?:\\.|[^"\\])*")/gi;

/** Le nom réservé que la commande lance par `npm run`, ou `undefined`. */
function scriptReserveLance(commande, interdits) {
  // Une ligne continuée par une barre oblique inverse (bash) ou un accent grave (PowerShell) est une seule commande.
  const continuee = commande.replace(/[\\`]\r?\n/g, ' ');
  for (const [, chaine] of continuee.matchAll(CHAINE_EXECUTEE)) {
    const nom = scriptReserveLance(chaine.slice(1, -1), interdits);
    if (nom !== undefined) return nom;
  }
  for (const segment of commandeSansTexte(continuee).split(/;|&&|\|\||\||\n/)) {
    const mots = segment.trim().split(/\s+/);
    const npm = mots.findIndex((mot) => /(?:^|[\\/])npm(?:\.cmd|\.exe)?$/i.test(mot));
    if (npm === -1) continue;
    const run = mots.findIndex((mot, rang) => rang > npm && (mot === 'run' || mot === 'run-script'));
    if (run === -1) continue;
    let nom;
    for (let rang = run + 1; rang < mots.length && nom === undefined; rang++) {
      if (OPTIONS_A_VALEUR.has(mots[rang])) rang++;
      else if (!mots[rang].startsWith('-')) nom = mots[rang];
    }
    if (nom !== undefined && interdits.includes(nom)) return nom;
  }
  return undefined;
}

try {
  const { chargerManifeste } = await import('./agents-contexte.mjs');
  const { racine } = await import('./controle-style.mjs');

  const entree = await demande();
  const commande = entree?.tool_input?.command;
  if (typeof commande !== 'string' || commande === '') process.exit(0);

  const interdits = chargerManifeste(racine).interdits ?? [];
  const nom = scriptReserveLance(commande, interdits);
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

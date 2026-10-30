/**
 * Rejoue le contrôle de style sur le fichier qu'un agent vient d'écrire.
 *
 * Branché en `PostToolUse` sur `Write` et `Edit` par `.claude/settings.json`.
 * Le retour arrive à l'agent au moment de l'écriture, avant la relecture et
 * avant la CI. Un hook sera exécuté à chaque écriture plutôt que d'utiliser une
 * consigne en mémoire.
 *
 * Le contrôle lui-même vit dans `controle-style.mjs`, qui dit le partage des
 * rôles entre les moments où il s'applique.
 *
 * Un refus sort en code 2, qui rend le texte de l'erreur à l'agent pour qu'il
 * corrige, plutôt qu'en code 1, qui n'irait qu'au journal. Un signal sort en
 * code 0 avec une sortie JSON `additionalContext` : l'agent revoit la phrase et
 * la garde si le fait l'exige. Le fichier reste écrit dans les deux cas.
 *
 * Node lit l'entrée standard lui-même : ce dépôt tourne sous Windows, où `jq`
 * n'est pas installé.
 */
import fs from 'node:fs';
import path from 'node:path';

import { fautesDuFichier, horsPerimetre, racine, rapport } from './controle-style.mjs';

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
const vise = entree?.tool_response?.filePath ?? entree?.tool_input?.file_path;
if (!vise) process.exit(0);

const chemin = path.relative(racine, path.resolve(vise)).split(path.sep).join('/');
if (chemin.startsWith('..') || horsPerimetre(chemin)) process.exit(0);
if (!/\.(md|ts|tsx|mjs|cjs|html)$/.test(chemin)) process.exit(0);

const complet = path.join(racine, chemin);
if (!fs.existsSync(complet)) process.exit(0);

const toutes = fautesDuFichier(chemin, fs.readFileSync(complet, 'utf8'));
const refus = toutes.filter((faute) => faute.niveau === 'refus');
const signaux = toutes.filter((faute) => faute.niveau === 'signal');

if (refus.length > 0) {
  process.stderr.write(
    `Le style du dépôt refuse ${refus.length} passage(s) de ${chemin}.\n`
      + 'Corriger avant de continuer. Les règles vivent dans le bloc « Écrire » d\'AGENTS.md,\n'
      + 'dans CONTRIBUTING.md, section « Rédiger un document », et dans la skill\n'
      + '.agents/skills/relire-le-style.\n\n'
      + `${rapport(refus)}`
      + (signaux.length > 0 ? `\nÀ revoir aussi :\n${rapport(signaux)}` : ''),
  );
  process.exit(2);
}

if (signaux.length > 0) {
  const additionalContext = `Le contrôle de style signale ${signaux.length} passage(s) de ${chemin}. `
    + 'Revoir chaque phrase et la garder si le fait l\'exige.\n\n'
    + rapport(signaux);
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext },
  }));
}
process.exit(0);

/**
 * Refuse de finir un tour tant qu'un Markdown nouveau ou modifié enfreint le
 * registre ou le style.
 *
 * Branché en `Stop` et en `SubagentStop` par `.claude/settings.json`. Le hook
 * de création ne voit pas un `.md` qu'un agent écrit par `Bash` ; celui-ci relit
 * `git status --porcelain` à l'arrêt, garde les `.md` nouveaux ou modifiés, et
 * sort 2 avec la liste de ceux que `verdictDuRegistre` refuse ou que
 * `fautesDuFichier` refuse.
 *
 * Il ne refuse qu'une fois par tour : `stop_hook_active` à vrai sort 0, parce
 * qu'un `.md` qu'une autre session modifie peut figurer dans la liste. Une
 * erreur interne sort 0 et le dit sur stderr.
 */
import { spawnSync } from 'node:child_process';
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

/** Les chemins `.md` nouveaux ou modifiés d'après `git status --porcelain`. */
function markdownsModifies(racine) {
  const sortie = spawnSync('git', ['-c', 'core.quotepath=false', 'status', '--porcelain', '--untracked-files=all'], {
    cwd: racine,
    encoding: 'utf8',
    maxBuffer: 1 << 26,
  }).stdout ?? '';
  return sortie.split(/\r?\n/).filter(Boolean)
    .filter((ligne) => !ligne.slice(0, 2).includes('D'))
    .map((ligne) => ligne.slice(3).replace(/^.* -> /, '').replace(/^"|"$/g, ''))
    .filter((chemin) => chemin.endsWith('.md') && fs.existsSync(path.join(racine, chemin)));
}

try {
  const { chargerManifeste, verdictDuRegistre } = await import('./agents-contexte.mjs');
  const { fautesDuFichier, horsPerimetre, racine } = await import('./controle-style.mjs');

  const entree = await demande();
  if (entree?.stop_hook_active === true) process.exit(0);

  const manifeste = chargerManifeste(racine);
  const refuses = [];
  for (const chemin of markdownsModifies(racine)) {
    if (!verdictDuRegistre(manifeste, chemin).accepte) {
      refuses.push(`${chemin} (hors registre)`);
      continue;
    }
    if (horsPerimetre(chemin)) continue;
    const fautes = fautesDuFichier(chemin, fs.readFileSync(path.join(racine, chemin), 'utf8'))
      .filter((faute) => faute.niveau === 'refus');
    if (fautes.length > 0) refuses.push(`${chemin} (style : ${fautes.length} refus)`);
  }
  if (refuses.length === 0) process.exit(0);

  process.stderr.write(
    `Ces documents enfreignent le registre ou le style : ${refuses.join(', ')}. `
      + 'Corrigez-les, ou dites qu\'une autre session les écrit.\n',
  );
  process.exit(2);
} catch (erreur) {
  process.stderr.write(`Le contrôle de l'état des documents n'a pas pu s'exécuter : ${erreur instanceof Error ? erreur.message : String(erreur)}.\n`);
  process.exit(0);
}

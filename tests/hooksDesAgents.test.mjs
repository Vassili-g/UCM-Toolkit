/**
 * Les trois hooks de droits des agents, lancés en processus avec une entrée
 * fabriquée : `hook-documents.mjs` (registre), `hook-commandes.mjs` (commandes
 * réservées au mainteneur) et `hook-etat.mjs` (état des documents à l'arrêt).
 *
 * Un hook se lit par son code de sortie et par ce qu'il écrit : le test les
 * lance donc comme Claude Code le fait. Ceux qui dépendent de la racine du dépôt
 * tournent dans un dossier temporaire où le test copie les scripts, parce
 * qu'un hook calcule sa racine depuis son propre emplacement et que le test ne
 * crée jamais `_local/autorise-test-ui` dans le vrai dépôt.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { chargerManifeste, verdictDuRegistre } from '../scripts/agents-contexte.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = ['agents-contexte.mjs', 'controle-style.mjs', 'hook-documents.mjs', 'hook-commandes.mjs', 'hook-etat.mjs'];

/** Lance un hook avec `entree` sur son entrée standard, depuis `racine`. */
function lancer(racine, hook, entree) {
  const resultat = spawnSync(process.execPath, [path.join(racine, 'scripts', hook)], {
    cwd: racine,
    input: JSON.stringify(entree),
    encoding: 'utf8',
  });
  return { code: resultat.status, sortie: resultat.stdout, erreur: resultat.stderr };
}

/** Un dossier temporaire qui porte les scripts des hooks et le manifeste donné. */
function depotTemporaire(manifeste) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'ucm-hooks-'));
  fs.mkdirSync(path.join(dossier, 'scripts'));
  fs.mkdirSync(path.join(dossier, '.agents'));
  for (const script of SCRIPTS) fs.copyFileSync(path.join(RACINE, 'scripts', script), path.join(dossier, 'scripts', script));
  fs.writeFileSync(path.join(dossier, '.agents', 'domiciles.json'), manifeste);
  return dossier;
}

const manifesteReel = fs.readFileSync(path.join(RACINE, '.agents', 'domiciles.json'), 'utf8');

test('H3 : vingt chemins, `_local/` compris, reçoivent le verdict du registre', () => {
  const manifeste = chargerManifeste(RACINE);
  const chemins = [
    '_local/note.md',
    '_local/sous/dossier/note.md',
    'packages/kit/_local/essai.md',
    'packages/plugin-palettes/_local/essai.md',
    'divers/essai.md',
    'docs/essai.md',
    'docs/notes/essai.md',
    'docs/notes/Recherches/inconnu/essai.md',
    'docs/notes/Recherches/inconnu/PLAN-essai.md',
    'packages/kit/essai.md',
    'packages/kit/NOTES.md',
    'packages/kit/AGENTS.md',
    'packages/kit/CARTE.md',
    'packages/kit/README.md',
    'packages/inconnu/README.md',
    'scripts/essai.md',
    '.claude/essai.md',
    '.agents/essai.md',
    'ESSAI.md',
    'README.md',
  ];
  assert.equal(chemins.length, 20);
  for (const chemin of chemins) {
    const existe = fs.existsSync(path.join(RACINE, chemin));
    const attendu = existe || verdictDuRegistre(manifeste, chemin).accepte ? 0 : 2;
    const { code } = lancer(RACINE, 'hook-documents.mjs', { tool_input: { file_path: path.join(RACINE, chemin) } });
    assert.equal(code, attendu, `${chemin} : le hook sort ${code}, le verdict attend ${attendu}`);
  }
  assert.equal(verdictDuRegistre(manifeste, '_local/note.md').accepte, true);
});

test('H4 : un manifeste tronqué fait demander la création au hook des documents', () => {
  const dossier = depotTemporaire(manifesteReel.slice(0, 200));
  try {
    const { code, sortie } = lancer(dossier, 'hook-documents.mjs', { tool_input: { file_path: path.join(dossier, 'divers', 'nouveau.md') } });
    assert.equal(code, 0);
    const decision = JSON.parse(sortie).hookSpecificOutput;
    assert.equal(decision.hookEventName, 'PreToolUse');
    assert.equal(decision.permissionDecision, 'ask');
    assert.match(decision.permissionDecisionReason, /Le registre des documents est illisible/);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});

test('H5 : `test:ui` sort 2 sans `_local/autorise-test-ui`, 0 avec', () => {
  const dossier = depotTemporaire(manifesteReel);
  try {
    for (const commande of [
      'npm run test:ui',
      'npm run test:ui --workspace plugin-palettes',
      'npm --workspace plugin-palettes run test:ui',
      'cd packages/plugin-palettes && npm run galerie:captures',
      'npm run-script test:ui',
    ]) {
      const refus = lancer(dossier, 'hook-commandes.mjs', { tool_input: { command: commande } });
      assert.equal(refus.code, 2, commande);
      assert.match(refus.erreur, /est réservé au mainteneur/);
    }
    // Un nom qui ne se lance pas, écrit dans une chaîne, un heredoc ou un autre script, ne compte pas.
    for (const commande of [
      'npm test',
      'echo "lancer test:ui plus tard" >> note.txt',
      "git commit -m 'docs: npm run test:ui reste réservé'",
      "python - <<'EOF'\nprint('npm run test:ui')\nEOF",
      'npm run test:paquet -- palettes',
    ]) {
      assert.equal(lancer(dossier, 'hook-commandes.mjs', { tool_input: { command: commande } }).code, 0, commande);
    }

    fs.mkdirSync(path.join(dossier, '_local'));
    fs.writeFileSync(path.join(dossier, '_local', 'autorise-test-ui'), '');
    assert.equal(lancer(dossier, 'hook-commandes.mjs', { tool_input: { command: 'npm run test:ui' } }).code, 0);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});

test('H5 : un manifeste tronqué fait demander la commande au hook des commandes', () => {
  const dossier = depotTemporaire(manifesteReel.slice(0, 200));
  try {
    const { code, sortie } = lancer(dossier, 'hook-commandes.mjs', { tool_input: { command: 'npm run test:ui' } });
    assert.equal(code, 0);
    assert.equal(JSON.parse(sortie).hookSpecificOutput.permissionDecision, 'ask');
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});

test('H6 : chaque nom de `interdits` est un script d\'un package.json de paquet', () => {
  const interdits = chargerManifeste(RACINE).interdits;
  assert.ok(Array.isArray(interdits) && interdits.length >= 2, 'la clé interdits est absente');
  const scripts = new Set();
  for (const dossier of fs.readdirSync(path.join(RACINE, 'packages'))) {
    const fichier = path.join(RACINE, 'packages', dossier, 'package.json');
    if (!fs.existsSync(fichier)) continue;
    for (const nom of Object.keys(JSON.parse(fs.readFileSync(fichier, 'utf8')).scripts ?? {})) scripts.add(nom);
  }
  for (const nom of interdits) assert.ok(scripts.has(nom), `« ${nom} » n'est le script d'aucun paquet`);
});

test('H7 : un `.md` hors registre fait refuser l\'arrêt une fois, le second arrêt passe', () => {
  const dossier = depotTemporaire(manifesteReel);
  try {
    const git = spawnSync('git', ['init', '-q'], { cwd: dossier });
    assert.equal(git.status, 0, 'git init');

    assert.equal(lancer(dossier, 'hook-etat.mjs', {}).code, 0, 'rien à signaler');

    fs.mkdirSync(path.join(dossier, 'divers'));
    fs.writeFileSync(path.join(dossier, 'divers', 'nouveau.md'), '# Note\n');
    const premier = lancer(dossier, 'hook-etat.mjs', {});
    assert.equal(premier.code, 2);
    assert.match(premier.erreur, /divers\/nouveau\.md/);
    assert.match(premier.erreur, /enfreignent le registre ou le style/);

    assert.equal(lancer(dossier, 'hook-etat.mjs', { stop_hook_active: true }).code, 0);

    fs.mkdirSync(path.join(dossier, '_local'));
    fs.rmSync(path.join(dossier, 'divers'), { recursive: true });
    fs.writeFileSync(path.join(dossier, '_local', 'note.md'), '# Note\n');
    assert.equal(lancer(dossier, 'hook-etat.mjs', {}).code, 0, 'un `.md` de _local/ est accepté');
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
});

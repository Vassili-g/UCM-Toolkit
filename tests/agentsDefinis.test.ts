/**
 * Tient les définitions d'agents de `.claude/agents/` contre `CLAUDE.md`.
 *
 * Le tableau de délégation de `CLAUDE.md` nomme chaque agent en code, suivi du
 * modèle entre parenthèses (`implementeur` (Sonnet)). Un agent sans modèle dans
 * le tableau (`implementeur-exigeant`) n'est contrôlé que sur son fichier.
 *
 * `implementeur.md`, `implementeur-exigeant.md` et `executant.md` portent le
 * même corps : seules les lignes de `LIGNES_PROPRES` diffèrent.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');
const dossier = path.join(racine, '.claude', 'agents');

/** Lignes de corps qu'un agent est seul à porter. */
const LIGNES_PROPRES: Record<string, string[]> = {
  executant: ["- Tu ne fais que les modifications listées ; un choix à faire t'arrête."],
};

function lire(nom: string): string {
  return fs.readFileSync(path.join(dossier, `${nom}.md`), 'utf8').replace(/\r\n/g, '\n');
}

function modeleDeLaDefinition(nom: string): string | undefined {
  return /^model:\s*(\S+)\s*$/m.exec(lire(nom))?.[1];
}

function corps(nom: string): string[] {
  const texte = lire(nom);
  return texte.slice(texte.indexOf('\n---\n', 3) + 5).split('\n');
}

/** Les agents du tableau de `CLAUDE.md`, avec leur modèle quand il y figure. */
function tableDeClaude(): Map<string, string | undefined> {
  const agents = new Map<string, string | undefined>();
  for (const ligne of fs.readFileSync(path.join(racine, 'CLAUDE.md'), 'utf8').split(/\r?\n/)) {
    if (!/^\|/.test(ligne) || /^\|\s*(Travail|-)/.test(ligne)) continue;
    const colonne = ligne.split('|')[2] ?? '';
    for (const m of colonne.matchAll(/`([^`]+)`(?:\s*\((\w+))?/g)) {
      agents.set(m[1], m[2]?.toLowerCase());
    }
  }
  return agents;
}

test("O5 : chaque agent de la table de CLAUDE.md a son fichier et le modèle de son model:", () => {
  const table = tableDeClaude();
  assert.ok(table.size >= 6, `seuls ${table.size} agents lus dans CLAUDE.md`);
  const ecarts: string[] = [];
  for (const [nom, modele] of table) {
    if (!fs.existsSync(path.join(dossier, `${nom}.md`))) {
      ecarts.push(`${nom} : pas de .claude/agents/${nom}.md`);
      continue;
    }
    const reel = modeleDeLaDefinition(nom);
    if (modele !== undefined && modele !== reel) ecarts.push(`${nom} : CLAUDE.md dit ${modele}, model: dit ${reel}`);
  }
  assert.deepEqual(ecarts, []);
});

test("O5 : le corps d'implementeur égale celui d'implementeur-exigeant, et celui d'executant aux lignes propres près", () => {
  assert.deepEqual(corps('implementeur-exigeant'), corps('implementeur'));
  const sansPropres = corps('executant').filter((ligne) => !LIGNES_PROPRES.executant.includes(ligne));
  assert.deepEqual(sansPropres, corps('implementeur'));
  for (const ligne of LIGNES_PROPRES.executant) {
    assert.ok(corps('executant').includes(ligne), `ligne propre absente d'executant.md : ${ligne}`);
  }
});

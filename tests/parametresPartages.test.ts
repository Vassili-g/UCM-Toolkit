/**
 * Tient l'inventaire unique des paramètres partagés de P27
 * (`docs/notes/Recherches/Parametres partages/parametres.json`). Un paramètre
 * nomme sa source dans le code ou dans un document, et la source existe. Un
 * paramètre copié ailleurs a une garde, ou un écart ouvert que
 * `ECARTS_OUVERTS` explique.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const RACINE = join(__dirname, '..');
const INVENTAIRE = 'docs/notes/Recherches/Parametres partages/parametres.json';

interface Parametre {
  id: string;
  source: { fichier: string; symbole: string | null };
  copies?: unknown[];
  garde?: { test?: string; nature: string };
  ecart?: string;
}

const parametres: Parametre[] = JSON.parse(readFileSync(join(RACINE, INVENTAIRE), 'utf8')).parametres;

/**
 * Les écarts que l'inventaire laisse ouverts, avec la raison. Les six premiers
 * attendent l'accord du mainteneur sur le diff exact (cases 8.4 à 8.6 du plan) ;
 * retirer chacun avec sa case cochée. Les quatre derniers sont écartés par la
 * table des réponses du plan : PP-401 écarte l'entrée entière, les trois autres
 * écartent une partie de l'écart que la garde de l'entrée ne couvre pas.
 */
const ECARTS_OUVERTS: Record<string, string> = {
  'PP-301': 'le hook des documents garde son verdict propre jusqu\'à la case 8.6 (`verdictDuRegistre`, clé `locaux`)',
  'PP-302': '`hook-etat.mjs` ne refuse pas encore une seule fois par tour : case 8.6',
  'PP-306': 'l\'interdiction de `test:ui` n\'est pas tenue par un hook : case 8.6, après l\'accord du mainteneur',
  'PP-309': 'la variable de modèle des sous-agents attend l\'essai du mainteneur (case 8.4), puis la case 8.6',
  'PP-314': 'le prompt d\'un implémenteur dans `CLAUDE.md` attend l\'accord du mainteneur : case 8.6',
  'PP-316': 'le hook des documents lit son manifeste sans refus explicite : case 8.6',
  'PP-401': 'écarté : Display P3 est hors du périmètre d\'UCM, et `diagnostics.md` écrit la limite',
  'PP-01': 'écarté en partie : la table des contrôles bloquants que proposait la garde est remplacée par le retrait de la promesse',
  'PP-17': 'écarté en partie : les codes de sortie 0, 1 et 2 n\'ont aucun lecteur hors de la CLI',
  'PP-20': 'écarté en partie : « état », « cran », « rang » et « export » n\'ont aucun cas d\'erreur relevé',
};

test('chaque identifiant de l\'inventaire est unique', () => {
  const vus = new Set<string>();
  for (const { id } of parametres) {
    assert.ok(!vus.has(id), `L'identifiant « ${id} » figure deux fois dans ${INVENTAIRE}.`);
    vus.add(id);
  }
});

test('la source de chaque paramètre existe et contient son symbole', () => {
  for (const { id, source } of parametres) {
    const chemin = join(RACINE, source.fichier);
    assert.ok(existsSync(chemin), `${id} : la source ${source.fichier} n'existe pas.`);
    if (source.symbole && statSync(chemin).isFile()) {
      assert.ok(
        readFileSync(chemin, 'utf8').includes(source.symbole),
        `${id} : ${source.fichier} ne contient pas « ${source.symbole} ».`,
      );
    }
  }
});

test('le test de chaque garde existe', () => {
  for (const { id, garde } of parametres) {
    if (garde?.test) assert.ok(existsSync(join(RACINE, garde.test)), `${id} : le test ${garde.test} n'existe pas.`);
  }
});

test('un paramètre qui a des copies a une garde, ou un écart ouvert expliqué', () => {
  for (const { id, copies = [], garde, ecart } of parametres) {
    if (copies.length === 0) continue;
    if (garde) continue;
    assert.ok(ecart && ECARTS_OUVERTS[ecart], `${id} : des copies sans garde et sans écart de ECARTS_OUVERTS.`);
  }
});

test('un écart resté sur une entrée est nommé dans ECARTS_OUVERTS', () => {
  for (const { id, ecart } of parametres) {
    if (ecart) assert.ok(ECARTS_OUVERTS[ecart], `${id} : l'écart ${ecart} n'est pas dans ECARTS_OUVERTS.`);
  }
});

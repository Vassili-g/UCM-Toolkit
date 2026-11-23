/**
 * Tient les copies du code dans la documentation : les familles de propriétés,
 * la phrase sur le rendu, la version du contrat et les nombres écrits en
 * prose. Un nombre recopié se compare à la constante ou au calcul qui le
 * porte ; il n'a pas de seconde autorité.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { CONTRACT_VERSION } from '../packages/kit/src/format/version';
import { FAMILLES } from '../packages/kit/src/lecteurs/controle-du-code-listes.mjs';
import { UNITLESS_GROUPS } from '../packages/plugin-exporter/src/tokens/exportTokens';
import { BUDGET_DE_LAYERS_PAR_DEFAUT } from '../packages/plugin-socle/src/composant/contract/budget';
import { MAX_STRUCTURE_DEPTH } from '../packages/plugin-socle/src/composant/contract/structureTree';

const RACINE = join(__dirname, '..');
const lire = (chemin: string) => readFileSync(join(RACINE, chemin), 'utf8');

/** Le texte d'un document sur une seule ligne, pour qu'un retour à la ligne ne coupe pas une phrase. */
const aplati = (chemin: string) => lire(chemin).replace(/\s+/g, ' ');

const EN_LETTRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze'];
/** Écrit un entier de 1 à 12 en lettres. */
function enLettres(entier: number): string {
  assert.ok(Number.isInteger(entier) && entier >= 1 && entier <= 12, `${entier} n'est pas un entier de 1 à 12`);
  return EN_LETTRES[entier];
}

/** Les fichiers qu'`ucm init --forge github` écrit dans un dossier vide, gabarits exclus. */
function fichiersEcritsParInit(): number {
  const dossier = mkdtempSync(join(tmpdir(), 'ucm-copies-'));
  try {
    const sortie = spawnSync(process.execPath, [join(RACINE, 'packages/cli/src/ucm.mjs'), 'init', '--forge', 'github'], {
      cwd: dossier,
      encoding: 'utf8',
    });
    assert.equal(sortie.status, 0, `ucm init a échoué : ${sortie.stderr}`);
    const trouves: string[] = [];
    const parcourir = (courant: string, prefixe: string) => {
      for (const nom of readdirSync(courant)) {
        const chemin = join(courant, nom);
        const relatif = prefixe === '' ? nom : `${prefixe}/${nom}`;
        if (statSync(chemin).isDirectory()) parcourir(chemin, relatif);
        else if (!relatif.startsWith('.ucm/gabarits/')) trouves.push(relatif);
      }
    };
    parcourir(dossier, '');
    return trouves.length;
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

const PHRASE_DES_FAMILLES = /quatre familles de propriétés CSS/;

test('D1 : les trois documents nomment les familles de propriétés du kit et la parité', () => {
  for (const chemin of ['CONCEPT.md', 'docs/guides/POUR-LES-DESIGNERS.md', 'VALIDATIONS-MVP.md']) {
    const texte = aplati(chemin);
    assert.match(texte, PHRASE_DES_FAMILLES, `${chemin} ne dit plus « quatre familles de propriétés CSS »`);
    for (const { famille } of FAMILLES as { famille: string }[]) {
      assert.ok(texte.includes(`\`${famille}\``), `${chemin} ne cite pas la famille \`${famille}\``);
    }
  }
  for (const chemin of ['CONCEPT.md', 'docs/guides/POUR-LES-DESIGNERS.md']) {
    assert.match(aplati(chemin), /parité/, `${chemin} ne parle plus de la parité de l'API`);
  }
  assert.equal((FAMILLES as unknown[]).length, 4, 'le kit ne compte plus quatre familles : les documents disent « quatre »');
});

test('D2 : le guide des designers ne promet aucune mesure du rendu', () => {
  const texte = aplati('docs/guides/POUR-LES-DESIGNERS.md');
  assert.doesNotMatch(texte, /mesure automatique du rendu/i);
  assert.doesNotMatch(texte, /capture de référence/i);
});

test('D3 : le journal du format annonce la version courante du contrat', () => {
  const texte = lire('docs/format/CHANGELOG-FORMAT.md');
  const version = CONTRACT_VERSION.replace('.', '\\.');
  assert.match(texte, new RegExp(`La version courante est la ${version}\\b`));
  assert.match(texte, new RegExp(`^## ${version}\\s*$`, 'm'));
});

test('D4 : chaque nombre recopié dans la documentation égale sa source', () => {
  const copies = (chemin: string, motif: RegExp): string[] => [...aplati(chemin).matchAll(motif)].map((m) => m[1]);
  const exiger = (chemin: string, motif: RegExp, attendu: string) => {
    const trouvees = copies(chemin, motif);
    assert.ok(trouvees.length > 0, `${chemin} ne contient plus la copie ${motif}`);
    for (const trouvee of trouvees) assert.equal(trouvee, attendu, `${chemin} dit « ${trouvee} », la source dit « ${attendu} »`);
  };

  const profondeur = String(MAX_STRUCTURE_DEPTH);
  exiger('docs/format/FORMAT.md', /bornée à \**(\d+) niveaux/g, profondeur);
  exiger('packages/plugin-exporter/invariants/arbre-des-slots.md', /bornée à \**(\d+) niveaux/g, profondeur);

  const budget = String(BUDGET_DE_LAYERS_PAR_DEFAUT);
  const layers = [...aplati('packages/plugin-architect/SPEC.md').matchAll(/(\d[\d \u00a0\u202f]*) layers/g)]
    .map((m) => m[1].replace(/[\s\u00a0\u202f]/g, ''));
  assert.ok(layers.length > 0, 'SPEC.md ne cite plus le budget de layers');
  for (const trouvee of layers) assert.equal(trouvee, budget);

  const sansUnite = aplati('docs/format/FORMAT.md').match(/unité \(([^)]+)\) →/);
  assert.ok(sansUnite, 'FORMAT.md ne liste plus les groupes sans unité');
  const documentes = new Set(sansUnite[1].split(/[,/]/).map((groupe) => groupe.trim().replace(/[`-]/g, '')));
  assert.deepEqual([...documentes].sort(), [...UNITLESS_GROUPS].map((g) => g.replace(/-/g, '')).sort());

  const lettres = enLettres(fichiersEcritsParInit());
  for (const chemin of ['AGENTS.md', 'docs/guides/RECETTE.md']) {
    exiger(chemin, /\b(huit) fichiers/g, lettres);
  }

  exiger('docs/guides/RECETTE.md', /"contractVersion": "(\d+\.\d+)"` par/g, CONTRACT_VERSION);
});

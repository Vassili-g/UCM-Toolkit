/**
 * Gardes des plans de recherche : les hash des lots existent, les marques `attend Pn`
 * visent une piste non livrée, et chaque `PLAN*.md` appartient à une piste.
 * Un plan sans piste est gardé par PLANS_SANS_PISTE, avec sa raison.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { etatDuPlan, lireLePlan } from '../docs/inventaire/plans';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECHERCHES = 'docs/notes/Recherches';
const PISTES = `${RECHERCHES}/Evolutions globales/pistes.json`;

const DEPOTS_CONNUS = ['intencial-library', 'UCM-Playground'];

const LIVRE = 'sujet livré, à archiver (lot 5.1)';
const EN_COURS = 'sujet en cours sans piste : piste à créer';

/** Plans sans piste, avec la raison ; l'archivage (lot 5.1) ou une nouvelle piste les retire de la liste. */
const PLANS_SANS_PISTE: { chemin: string; raison: string }[] = [
  { chemin: `${RECHERCHES}/Evolutions globales/PLAN-API-MODULES.md`, raison: LIVRE },
  { chemin: `${RECHERCHES}/Evolutions globales/PLAN-INVENTAIRE.md`, raison: LIVRE },
  { chemin: `${RECHERCHES}/Hub UCM/PLAN-HUB-UCM.md`, raison: 'Hub UCM abandonné, à archiver comme sujet écarté' },
  { chemin: `${RECHERCHES}/Optimisation Tokens/Recherches/PLAN-REDUCTION-TOKENS.md`, raison: EN_COURS },
  { chemin: `${RECHERCHES}/Plugin Palettes/Recette v10/PLAN-IMPLEMENTATION-RECETTE-V10.md`, raison: EN_COURS },
  { chemin: `${RECHERCHES}/Plugin Palettes/Couleurs à mettre à jour/PLAN-IMPLEMENTATION.md`, raison: EN_COURS },
  { chemin: `${RECHERCHES}/UCM Architect/3 Plan/PLAN-IMPLEMENTATION.md`, raison: EN_COURS },
  ...[
    'PLAN-STRESS-F1-NOMS.md',
    'PLAN-STRESS-F2-STRUCTURE.md',
    'PLAN-STRESS-F3-F4-COMPOSANT.md',
    'PLAN-STRESS-F5-F6-VARIANTS-TYPO.md',
    'PLAN-STRESS-F7-ACCESSIBILITE.md',
    'PLAN-STRESS-F8-F9-ANALYSE.md',
    // La fiabilisation d'Architect est livrée ; ses plans de stress n'ont pas de cases.
  ].map((nom) => ({ chemin: `${RECHERCHES}/UCM Architect/8 Fiabilisation/${nom}`, raison: LIVRE })),
];

interface Piste { id: string; plan?: string; recherche?: string; archive?: string }
interface Plan { chemin: string; texte: string }

function lirePistes(): Piste[] {
  return JSON.parse(fs.readFileSync(path.join(RACINE, PISTES), 'utf8')).pistes as Piste[];
}

function plansDeRecherche(dossier = path.join(RACINE, RECHERCHES)): string[] {
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((entree) => {
    const chemin = path.join(dossier, entree.name);
    if (entree.isDirectory()) return plansDeRecherche(chemin);
    return /^PLAN.*\.md$/.test(entree.name) ? [path.relative(RACINE, chemin).split(path.sep).join('/')] : [];
  });
}

function commitExiste(hash: string): boolean {
  return spawnSync('git', ['cat-file', '-e', `${hash}^{commit}`], { cwd: RACINE }).status === 0;
}

const existeIci = (chemin: string) => fs.existsSync(path.join(RACINE, chemin));
const texteIci = (chemin: string) => (existeIci(chemin) ? fs.readFileSync(path.join(RACINE, chemin), 'utf8') : null);

function plansDesPistes(pistes: Piste[]): Plan[] {
  return pistes.flatMap((piste) => (piste.plan && !piste.archive ? [{ chemin: piste.plan, texte: texteIci(piste.plan) ?? '' }] : []));
}

function controlerHashes(plans: Plan[], existe: (hash: string) => boolean): string[] {
  const echecs: string[] = [];
  for (const plan of plans) {
    for (const lot of lireLePlan(plan.texte)) {
      for (const { depot, hash } of lot.hashes) {
        const ou = `${plan.chemin}, case ${lot.numero}`;
        if (depot === null) {
          if (!existe(hash)) echecs.push(`${ou} : le commit ${hash} n'existe pas ici.`);
        } else if (!DEPOTS_CONNUS.includes(depot)) {
          echecs.push(`${ou} : le dépôt « ${depot} » est inconnu (${DEPOTS_CONNUS.join(', ')}).`);
        }
      }
    }
  }
  return echecs;
}

function controlerMarques(plans: Plan[], pistes: Piste[], texteDuPlan: (chemin: string) => string | null): string[] {
  const livree = (piste: Piste): boolean => {
    // Une piste archivée est terminée : son plan ne vit plus que dans Git.
    if (piste.archive) return true;
    const texte = piste.plan ? texteDuPlan(piste.plan) : null;
    return texte !== null && etatDuPlan(lireLePlan(texte)).livre;
  };
  const echecs: string[] = [];
  for (const plan of plans) {
    for (const lot of lireLePlan(plan.texte)) {
      if (lot.marque === null || lot.marque === 'mainteneur') continue;
      const { attend } = lot.marque;
      const ou = `${plan.chemin}, case ${lot.numero}`;
      const cible = pistes.find((piste) => piste.id === attend);
      if (!cible) echecs.push(`${ou} : la piste ${attend} n'existe pas.`);
      else if (livree(cible)) echecs.push(`${ou} : la piste ${cible.id} est livrée, retirer « attend ${cible.id} ».`);
    }
  }
  return echecs;
}

function controlerCouverture(fichiers: string[], pistes: Piste[], sansPiste: { chemin: string }[], existe: (chemin: string) => boolean): string[] {
  const echecs: string[] = [];
  const deLaPiste = new Set(pistes.flatMap((piste) => [piste.plan, piste.recherche]).filter((c): c is string => Boolean(c)));
  const exemptes = new Set(sansPiste.map((entree) => entree.chemin));
  for (const fichier of fichiers) {
    if (!deLaPiste.has(fichier) && !exemptes.has(fichier)) {
      echecs.push(`${fichier} n'est le plan ni la recherche d'aucune piste : créer la piste, ou l'ajouter à PLANS_SANS_PISTE avec sa raison.`);
    }
  }
  for (const { chemin } of sansPiste) {
    if (!existe(chemin)) echecs.push(`PLANS_SANS_PISTE nomme ${chemin}, qui n'existe pas : retirer l'entrée.`);
  }
  return echecs;
}

test('les hash locaux des plans de piste existent et les dépôts sont connus', () => {
  assert.deepEqual(controlerHashes(plansDesPistes(lirePistes()), commitExiste), []);
});

test('un hash inventé échoue en nommant le plan et la case', () => {
  const echecs = controlerHashes([{ chemin: 'PLAN-X.md', texte: '- [x] 3 (deadbee). Lot.' }], () => false);
  assert.equal(echecs.length, 1);
  assert.match(echecs[0], /PLAN-X\.md, case 3/);
  assert.match(echecs[0], /deadbee/);
});

test('foo@1234567 échoue, foo hors de DEPOTS_CONNUS ; un dépôt connu passe', () => {
  const echecs = controlerHashes(
    [{ chemin: 'PLAN-X.md', texte: '- [x] 1 (foo@1234567). A.\n- [x] 2 (intencial-library@62d32976). B.' }],
    () => false,
  );
  assert.equal(echecs.length, 1);
  assert.match(echecs[0], /case 1.*« foo »/);
});

test("les marques attend Pn des plans de piste visent une piste qui n'est pas livrée", () => {
  const pistes = lirePistes();
  assert.deepEqual(controlerMarques(plansDesPistes(pistes), pistes, texteIci), []);
});

test('attend P99 échoue, attend P19 échoue (P19 livrée), attend P26 passe', () => {
  const pistes = lirePistes();
  const plan = (marque: string) => [{ chemin: 'PLAN-X.md', texte: `- [ ] 2 (attend ${marque}). Lot.` }];
  const inconnue = controlerMarques(plan('P99'), pistes, texteIci);
  assert.equal(inconnue.length, 1);
  assert.match(inconnue[0], /PLAN-X\.md, case 2.*P99 n'existe pas/);
  const livree = controlerMarques(plan('P19'), pistes, texteIci);
  assert.equal(livree.length, 1);
  assert.match(livree[0], /P19 est livrée/);
  assert.deepEqual(controlerMarques(plan('P26'), pistes, texteIci), []);
});

test("chaque PLAN*.md est le plan ou la recherche d'une piste, ou figure dans PLANS_SANS_PISTE", () => {
  assert.deepEqual(controlerCouverture(plansDeRecherche(), lirePistes(), PLANS_SANS_PISTE, existeIci), []);
});

test('un PLAN-X.md sans piste échoue ; une entrée de PLANS_SANS_PISTE sans fichier échoue', () => {
  const fichiers = [...plansDeRecherche(), `${RECHERCHES}/Hub UCM/PLAN-X.md`];
  const echecs = controlerCouverture(fichiers, lirePistes(), PLANS_SANS_PISTE, existeIci);
  assert.equal(echecs.length, 1);
  assert.match(echecs[0], /PLAN-X\.md/);

  const orpheline = [...PLANS_SANS_PISTE, { chemin: `${RECHERCHES}/Hub UCM/PLAN-ABSENT.md`, raison: 'essai' }];
  const manque = controlerCouverture(plansDeRecherche(), lirePistes(), orpheline, existeIci);
  assert.equal(manque.length, 1);
  assert.match(manque[0], /PLAN-ABSENT\.md.*n'existe pas/);
});

test('chaque entrée de PLANS_SANS_PISTE a une raison parmi les trois admises', () => {
  const admises = [/^sujet livré, à archiver/, /^Hub UCM abandonné/, /^sujet en cours sans piste/];
  for (const { chemin, raison } of PLANS_SANS_PISTE) {
    assert.ok(admises.some((motif) => motif.test(raison)), `${chemin} : raison « ${raison} » hors des trois admises`);
  }
});

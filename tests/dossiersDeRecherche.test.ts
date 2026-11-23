/**
 * Un sujet, un dossier : chaque recherche et chaque plan vit dans le dossier de son sujet.
 *
 * Lit `.agents/domiciles.json` (clé `registre`), `docs/notes/Recherches/README.md`
 * et `pistes.json`. Chaque échec nomme le dossier ou la piste et le geste qui le
 * corrige. `scripts/nouveau-sujet.mjs` crée le dossier, le motif, la ligne du
 * sommaire et le champ `recherche` ; ses cas tournent sur une copie temporaire.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const racine = path.resolve(__dirname, '..');
const RECHERCHES = 'docs/notes/Recherches';
const REGISTRE = '.agents/domiciles.json';
const PISTES = `${RECHERCHES}/Evolutions globales/pistes.json`;
const CATALOGUE = 'Evolutions globales';

interface Piste {
  id: string;
  recherche?: string;
  plan?: string;
}

interface Depot {
  racine: string;
  registre: string[];
  sommaire: string;
  pistes: Piste[];
}

function lireDepot(base: string): Depot {
  const lire = (chemin: string) => fs.readFileSync(path.join(base, chemin), 'utf8');
  return {
    racine: base,
    registre: JSON.parse(lire(REGISTRE)).registre as string[],
    sommaire: lire(`${RECHERCHES}/README.md`),
    pistes: JSON.parse(lire(PISTES)).pistes as Piste[],
  };
}

/** Cases de premier niveau hors blocs de code ; le lot 3.1 remplace ce comptage par `lireLePlan`. */
function planLivre(base: string, chemin: string): boolean {
  const fichier = path.join(base, chemin);
  if (!fs.existsSync(fichier)) return false;
  let dansUnBloc = false;
  let total = 0;
  let faites = 0;
  for (const ligne of fs.readFileSync(fichier, 'utf8').split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(ligne)) dansUnBloc = !dansUnBloc;
    if (dansUnBloc) continue;
    const trouvee = /^[-*] \[([ xX])\]/.exec(ligne);
    if (!trouvee) continue;
    total += 1;
    if (trouvee[1] !== ' ') faites += 1;
  }
  return total > 0 && faites === total;
}

/** Dossiers réels qui échappent à la règle, avec leur raison ; le lot 5.1 vide la liste. */
const EXCEPTIONS: Record<string, string> = {};

function dossierDe(chemin: string): string | null {
  const prefixe = `${RECHERCHES}/`;
  if (!chemin.startsWith(prefixe)) return null;
  return chemin.slice(prefixe.length).split('/')[0] ?? null;
}

function geste(nom: string, id: string): string {
  return `Lancez \`npm run sujet -- "${nom}" ${id}\``;
}

/** Les échecs de la règle, un message par cas. */
function controler(depot: Depot): string[] {
  const echecs: string[] = [];
  const dossiers = fs
    .readdirSync(path.join(depot.racine, RECHERCHES), { withFileTypes: true })
    .filter((entree) => entree.isDirectory())
    .map((entree) => entree.name);

  const liens = [...depot.sommaire.matchAll(/^\[[^\]]+\]:\s*(\S+)/gm)].map((m) => {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return m[1];
    }
  });
  for (const nom of dossiers) {
    if (EXCEPTIONS[nom]) continue;
    if (!depot.registre.includes(`${RECHERCHES}/${nom}/**`)) {
      echecs.push(`Le dossier « ${nom} » n'a pas de motif au registre. ${geste(nom, '<Pn>')}`);
    }
    if (!liens.some((lien) => lien.startsWith(`./${nom}/`))) {
      echecs.push(`Le dossier « ${nom} » n'a pas de lien ./${encodeURI(nom)}/ dans le sommaire. ${geste(nom, '<Pn>')}`);
    }
  }

  const plansParDossier = new Map<string, string[]>();
  for (const piste of depot.pistes) {
    for (const champ of ['recherche', 'plan'] as const) {
      const chemin = piste[champ];
      if (!chemin) continue;
      const nom = dossierDe(chemin);
      if (nom === null || !dossiers.includes(nom)) {
        echecs.push(`La piste ${piste.id} range son ${champ} hors de ${RECHERCHES}/<dossier>/ : ${chemin}. ${geste('<Nom>', piste.id)}`);
        continue;
      }
      if (champ === 'plan' && nom === CATALOGUE) {
        echecs.push(`La piste ${piste.id} a son plan dans « ${CATALOGUE} », le dossier du catalogue : ${chemin}. ${geste('<Nom>', piste.id)}`);
        continue;
      }
      if (champ === 'plan' && !EXCEPTIONS[nom] && !planLivre(depot.racine, chemin)) {
        plansParDossier.set(nom, [...(plansParDossier.get(nom) ?? []), piste.id]);
      }
    }
  }
  for (const [nom, ids] of plansParDossier) {
    if (new Set(ids).size > 1) {
      echecs.push(`Le dossier « ${nom} » porte les plans non livrés de plusieurs pistes (${ids.join(', ')}). ${geste('<Nom>', '<Pn>')} pour en déplacer un`);
    }
  }
  return echecs;
}

function copie(): string {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'ucm-sujet-'));
  for (const chemin of [REGISTRE, `${RECHERCHES}/README.md`, PISTES]) {
    fs.mkdirSync(path.join(base, path.dirname(chemin)), { recursive: true });
    fs.copyFileSync(path.join(racine, chemin), path.join(base, chemin));
  }
  for (const entree of fs.readdirSync(path.join(racine, RECHERCHES), { withFileTypes: true })) {
    if (entree.isDirectory()) fs.mkdirSync(path.join(base, RECHERCHES, entree.name), { recursive: true });
  }
  for (const piste of lireDepot(racine).pistes) {
    if (!piste.plan || !fs.existsSync(path.join(racine, piste.plan))) continue;
    fs.copyFileSync(path.join(racine, piste.plan), path.join(base, piste.plan));
  }
  return base;
}

function modifier(base: string, chemin: string, remplacer: (texte: string) => string): void {
  const fichier = path.join(base, chemin);
  fs.writeFileSync(fichier, remplacer(fs.readFileSync(fichier, 'utf8')));
}

function sujet(base: string, ...args: string[]) {
  return spawnSync(process.execPath, [path.join(racine, 'scripts/nouveau-sujet.mjs'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, UCM_RACINE: base },
  });
}

test("le dépôt d'aujourd'hui passe", () => {
  assert.deepEqual(controler(lireDepot(racine)), []);
});

test('un dossier sans motif au registre échoue en nommant le dossier', () => {
  const base = copie();
  modifier(base, REGISTRE, (texte) => texte.replace(`"${RECHERCHES}/Hub UCM/**",`, ''));
  const echecs = controler(lireDepot(base));
  assert.equal(echecs.length, 1);
  assert.match(echecs[0], /« Hub UCM » n'a pas de motif/);
  assert.match(echecs[0], /npm run sujet/);
});

test('un dossier sans lien dans le sommaire échoue', () => {
  const base = copie();
  modifier(base, `${RECHERCHES}/README.md`, (texte) => texte.replace(/^\[hub\]:.*$/m, ''));
  const echecs = controler(lireDepot(base));
  assert.ok(echecs.some((e) => e.includes("« Hub UCM » n'a pas de lien")));
});

test('une piste dont le plan vit dans « Evolutions globales » échoue', () => {
  const base = copie();
  modifier(base, PISTES, (texte) =>
    texte.replace(
      `"plan": "${RECHERCHES}/Roadmap/PLAN-ROADMAP.md"`,
      `"plan": "${RECHERCHES}/${CATALOGUE}/PLAN-ROADMAP.md"`,
    ),
  );
  const echecs = controler(lireDepot(base));
  assert.ok(echecs.some((e) => e.includes('P25') && e.includes(CATALOGUE)));
});

test('deux plans de pistes non livrées dans un dossier échouent', () => {
  const base = copie();
  const nom = 'Hub UCM';
  for (const fichier of ['PLAN-A.md', 'PLAN-B.md']) {
    fs.writeFileSync(path.join(base, RECHERCHES, nom, fichier), '- [ ] 1.1 Un lot.\n');
  }
  modifier(base, PISTES, (texte) => {
    const donnees = JSON.parse(texte);
    for (const piste of donnees.pistes) delete piste.plan;
    donnees.pistes[0].plan = `${RECHERCHES}/${nom}/PLAN-A.md`;
    donnees.pistes[1].plan = `${RECHERCHES}/${nom}/PLAN-B.md`;
    return JSON.stringify(donnees, null, 2);
  });
  const echecs = controler(lireDepot(base));
  assert.equal(echecs.length, 1, echecs.join('\n'));
  assert.match(echecs[0], /« Hub UCM » porte les plans non livrés/);

  fs.writeFileSync(path.join(base, RECHERCHES, nom, 'PLAN-B.md'), '- [x] 1.1 Un lot.\n');
  assert.deepEqual(controler(lireDepot(base)), []);
});

test('nouveau-sujet crée le dossier, le motif, la ligne et le champ recherche, puis refuse un doublon', () => {
  const base = copie();
  const piste = lireDepot(racine).pistes.find((p) => !p.recherche);
  assert.ok(piste, 'aucune piste sans recherche dans le dépôt');

  const premier = sujet(base, 'Sujet de Test', piste.id, "Vérifier l'essai.");
  assert.equal(premier.status, 0, premier.stderr);
  assert.match(premier.stdout, /npm run vues/);

  const document = `${RECHERCHES}/Sujet de Test/RECHERCHE-SUJET-DE-TEST.md`;
  assert.equal(
    fs.readFileSync(path.join(base, document), 'utf8'),
    '# Sujet de Test\n\n## Questions au mainteneur\n',
  );

  const depot = lireDepot(base);
  const motif = `${RECHERCHES}/Sujet de Test/**`;
  assert.ok(depot.registre.includes(motif));
  const motifs = depot.registre.filter((m) => /^docs\/notes\/Recherches\/.+\/\*\*$/.test(m));
  assert.deepEqual(motifs, [...motifs].sort((a, b) => a.localeCompare(b, 'fr')));
  assert.ok(depot.registre.indexOf(motif) < depot.registre.indexOf(`${RECHERCHES}/README.md`));
  assert.match(depot.sommaire, /^\| \[Sujet de Test\]\[sujet-de-test\] \| Vérifier l'essai\. \| Recherche en cours\. \|$/m);
  assert.match(depot.sommaire, /^\[sujet-de-test\]: \.\/Sujet%20de%20Test\/RECHERCHE-SUJET-DE-TEST\.md$/m);
  assert.equal(depot.pistes.find((p) => p.id === piste.id)?.recherche, document);
  assert.match(fs.readFileSync(path.join(base, PISTES), 'utf8'), new RegExp(`\\n {6}"recherche": "${document}",\\n`));
  assert.deepEqual(controler(depot), []);

  const second = sujet(base, 'Sujet de Test', piste.id, 'Autre.');
  assert.notEqual(second.status, 0);
  assert.match(second.stderr, /existe déjà/);

  const dejaPris = sujet(base, 'Autre sujet', piste.id, 'Autre.');
  assert.notEqual(dejaPris.status, 0);
  assert.match(dejaPris.stderr, /a déjà une recherche/);

  const inconnue = sujet(base, 'Encore un', 'P999', 'Autre.');
  assert.notEqual(inconnue.status, 0);
  assert.match(inconnue.stderr, /Piste inconnue/);
});

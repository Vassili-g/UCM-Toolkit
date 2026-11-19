/**
 * La page de l'inventaire commitée correspond à ce que le générateur écrit aujourd'hui, elle est autonome, et la liste des
 * sources que `agents:diff` lit désigne des fichiers qui existent.
 *
 * La génération lit le dépôt et dure plusieurs secondes : elle se fait une fois par fichier de test.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { motifVersRegex } from '../scripts/agents-contexte.mjs';
import { EXCLUSIONS } from '../docs/inventaire/couverture';
import { sectionDe } from '../docs/inventaire/extraire';
import { CHEMIN_DE_L_INVENTAIRE, genererInventaireEtCouverture } from '../docs/inventaire/generer-inventaire';
import { CHEMIN_DES_DECISIONS, validerLesChoix, type Decisions, type Regle } from '../docs/inventaire/releves';

const racine = path.resolve(__dirname, '..');
const sansRetourChariot = (texte: string): string => texte.replace(/\r\n/g, '\n');

let generation: ReturnType<typeof genererInventaireEtCouverture> | undefined;
const produite = (): ReturnType<typeof genererInventaireEtCouverture> => (generation ??= genererInventaireEtCouverture());
const generee = async (): Promise<string> => (await produite()).page;

test("la page de l'inventaire commitée est à jour", async () => {
  const commitee = sansRetourChariot(readFileSync(CHEMIN_DE_L_INVENTAIRE, 'utf8'));
  assert.ok(commitee === (await generee()), "La vue n'est plus à jour. Lancez `npm run vues`.");
});

test("la page de l'inventaire est autonome et tient sous 1 Mo", async () => {
  const page = await generee();
  assert.ok(Buffer.byteLength(page) < 1_000_000);
  assert.deepEqual(page.match(/\bsrc=|<link|@import/g), null);
  // Seul le label de sujet d'une piste sort de la page, vers un document du dépôt sur GitHub ; le script le compose.
  assert.deepEqual(page.match(/href="(?!#|' \+ url)[^"]*"/g), null);
  const url = [...page.matchAll(/url\((?!#|data:|"data:)[^)]{0,20}/g)].map((trouve) => trouve[0]);
  assert.deepEqual(url, [], 'une feuille de style charge une ressource');
  const adresses = [...new Set([...page.matchAll(/https?:\/\/[^"' )<]*/g)].map((trouve) => trouve[0]))];
  assert.deepEqual(adresses, ['http://www.w3.org/2000/svg', 'https://github.com/Vassili-g/UCM-Toolkit/blob/main/'], "seuls l'espace de noms SVG et le dépôt sur GitHub sont des adresses");
});

test("la page de l'inventaire dit qu'elle est générée", async () => {
  assert.match(await generee(), /^<!doctype html>\n<!-- Généré par docs\/inventaire\/generer-inventaire\.ts ; ne pas modifier à la main\. -->/);
});

function fichiersDuDepot(dossier: string): string[] {
  const trouves: string[] = [];
  for (const entree of readdirSync(dossier, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', '_local'].includes(entree.name)) continue;
    const complet = path.join(dossier, entree.name);
    if (entree.isDirectory()) trouves.push(...fichiersDuDepot(complet));
    else trouves.push(path.relative(racine, complet).split(path.sep).join('/'));
  }
  return trouves;
}

test('chaque source de sources.json désigne au moins un fichier du dépôt', () => {
  const { vues } = JSON.parse(readFileSync(path.join(racine, 'docs', 'inventaire', 'sources.json'), 'utf8')) as { vues: Record<string, string[]> };
  assert.deepEqual(Object.keys(vues), ['docs/inventaire/INVENTAIRE-UCM.html']);
  const donnees = ['pistes.json', 'decisions.json'].map((nom) => 'docs/notes/Recherches/Evolutions globales/' + nom);
  assert.deepEqual([...donnees, 'docs/inventaire/couverture.ts'].filter((source) => !vues['docs/inventaire/INVENTAIRE-UCM.html'].includes(source)), [], 'sources.json oublie une source de la page');
  const fichiers = fichiersDuDepot(racine);
  const sansFichier = vues['docs/inventaire/INVENTAIRE-UCM.html'].filter((motif) => !fichiers.some((fichier) => motifVersRegex(motif).test(fichier)));
  assert.deepEqual(sansFichier, [], "Ces sources ne désignent aucun fichier. Corriger docs/inventaire/sources.json.");
});


test("chaque élément d'un univers est montré par la page ou exclu avec sa raison", async () => {
  const { couverture } = await produite();
  const univers = Object.keys(couverture.univers);
  assert.deepEqual(Object.keys(EXCLUSIONS).filter((nom) => !univers.includes(nom)), [], "couverture.ts nomme un univers que la page ne contrôle pas");
  const refus: string[] = [];
  for (const [nom, { attendus, montres, aCompleter }] of Object.entries(couverture.univers)) {
    const groupes = EXCLUSIONS[nom] ?? [];
    const exclus = groupes.flatMap((groupe) => groupe.noms);
    for (const groupe of groupes) {
      if (!groupe.motif.trim()) refus.push(`univers « ${nom} » : un groupe d'exclusions n'a pas de motif (docs/inventaire/couverture.ts)`);
    }
    for (const exclu of exclus) {
      if (/[*?]/.test(exclu)) refus.push(`« ${exclu} » (univers « ${nom} ») est un motif : écrire les noms un par un dans docs/inventaire/couverture.ts`);
      else if (!attendus.includes(exclu)) refus.push(`« ${exclu} » (univers « ${nom} ») est exclu mais n'existe plus : le retirer de docs/inventaire/couverture.ts`);
      else if (montres.includes(exclu)) refus.push(`« ${exclu} » (univers « ${nom} ») est exclu et montré par la page : le retirer de docs/inventaire/couverture.ts`);
    }
    for (const doublon of exclus.filter((exclu, rang) => exclus.indexOf(exclu) !== rang)) {
      refus.push(`« ${doublon} » (univers « ${nom} ») est exclu deux fois dans docs/inventaire/couverture.ts`);
    }
    for (const attendu of attendus) {
      if (!montres.includes(attendu) && !exclus.includes(attendu)) refus.push(`« ${attendu} » (univers « ${nom} ») n'est ni montré ni exclu. À compléter : ${aCompleter}`);
    }
  }
  assert.deepEqual(refus, []);
});

test("une règle décidée écrite renvoie à un document dont l'ancre existe", () => {
  const { regles } = JSON.parse(readFileSync(path.join(racine, CHEMIN_DES_DECISIONS), 'utf8')) as { regles: { id: string; domicileCible: string; ecrite: string }[] };
  const sansAncre: string[] = [];
  for (const regle of regles.filter((candidate) => candidate.ecrite === 'oui')) {
    const [fichier, ancre] = regle.domicileCible.split('#');
    if (!ancre) {
      sansAncre.push(`${regle.id} : domicileCible ${fichier} n'a pas d'ancre`);
      continue;
    }
    try {
      sectionDe(sansRetourChariot(readFileSync(path.join(racine, fichier), 'utf8')), fichier, ancre);
    } catch (erreur) {
      sansAncre.push(`${regle.id} : ${(erreur as Error).message}`);
    }
  }
  assert.deepEqual(sansAncre, [], "Une règle marquée « oui » renvoie à une section qui n'existe pas (decisions.json)");
});

// ---------- Validation de decisions.json (G3.3) ----------

const regleTransverse = (id: string, options?: { valeur: string; libelle: string }[]): Regle => ({ id, genre: 'transverse', texte: 't', domicileCible: 'CONTRIBUTING.md', ecrite: 'non', pistes: [], ...(options ? { options } : {}) });
const decisionsFictives = (pistes: Decisions['pistes'], transverses: Decisions['transverses']): Decisions => ({
  version: 1,
  pistes,
  transverses,
  regles: [regleTransverse('T1'), regleTransverse('T10', [{ valeur: 'avant', libelle: 'Avant' }, { valeur: 'apres', libelle: 'Après' }])],
});
const connues = new Set(['P1', 'P2']);

test('decisions.json : des choix valides passent', () => {
  validerLesChoix(decisionsFictives({ P1: { choix: 'oui', note: 'a' }, P2: { choix: '', note: '' } }, { T1: { choix: 'non', note: '' }, T10: { choix: 'avant', note: '' } }), connues);
});

test('decisions.json : une piste inconnue nomme son identifiant', () => {
  assert.throws(() => validerLesChoix(decisionsFictives({ P99: { choix: 'oui', note: '' } }, {}), connues), /P99/);
});

test('decisions.json : une décision transverse sans règle T* nomme son identifiant', () => {
  assert.throws(() => validerLesChoix(decisionsFictives({}, { T42: { choix: 'oui', note: '' } }), connues), /T42/);
});

test('decisions.json : un choix de piste hors oui, non, vide nomme la piste', () => {
  assert.throws(() => validerLesChoix(decisionsFictives({ P1: { choix: 'peut-être', note: '' } }, {}), connues), /P1.*peut-être/);
});

test('decisions.json : T10 accepte ses options et refuse oui', () => {
  assert.throws(() => validerLesChoix(decisionsFictives({}, { T10: { choix: 'oui', note: '' } }), connues), /T10/);
  assert.throws(() => validerLesChoix(decisionsFictives({}, { T1: { choix: 'avant', note: '' } }), connues), /T1/);
});

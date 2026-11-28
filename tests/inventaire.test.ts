/**
 * La page de l'inventaire commitée correspond à ce que le générateur écrit aujourd'hui, elle est autonome, et la liste des
 * sources que `agents:diff` lit désigne des fichiers qui existent.
 *
 * La génération lit le dépôt et dure plusieurs secondes : elle se fait une fois par fichier de test.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { motifVersRegex } from '../scripts/agents-contexte.mjs';
import { EXCLUSIONS } from '../docs/inventaire/couverture';
import { sectionDe } from '../docs/inventaire/extraire';
import { CHEMIN_DE_LA_CHAINE, CHEMIN_DE_L_INVENTAIRE, genererChaine, genererInventaireEtCouverture } from '../docs/inventaire/generer-inventaire';
import { lireLePlan } from '../docs/inventaire/plans';
import { CHEMIN_DES_DECISIONS, CHEMIN_DES_PISTES, DEPOT_SUR_GITHUB, pistes, roadmap, type PisteEcrite, type Regle } from '../docs/inventaire/releves';

const racine = path.resolve(__dirname, '..');
const sansRetourChariot = (texte: string): string => texte.replace(/\r\n/g, '\n');

let generation: ReturnType<typeof genererInventaireEtCouverture> | undefined;
const produite = (): ReturnType<typeof genererInventaireEtCouverture> => (generation ??= genererInventaireEtCouverture());
const generee = async (): Promise<string> => (await produite()).page;

test("la page de l'inventaire commitée est à jour", async () => {
  const commitee = sansRetourChariot(readFileSync(CHEMIN_DE_L_INVENTAIRE, 'utf8'));
  assert.ok(commitee === (await generee()), "La vue n'est plus à jour. Lancez `npm run vues`.");
});

test('la page de la chaîne commitée est à jour', () => {
  const commitee = sansRetourChariot(readFileSync(CHEMIN_DE_LA_CHAINE, 'utf8'));
  assert.ok(commitee === genererChaine(), "La vue n'est plus à jour. Lancez `npm run vues`.");
});

test("la page de la chaîne est autonome : ni `src=` hors d'une URI `data:`, ni `<link`, ni `@import`, aucune adresse", () => {
  const page = genererChaine();
  assert.deepEqual(page.match(/\bsrc=(?!\\?"data:)|<link|@import/g), null);
  assert.deepEqual([...page.matchAll(/url\((?!#)[^)]{0,20}/g)].map((trouve) => trouve[0]), [], 'une feuille de style charge une ressource');
  assert.deepEqual([...new Set([...page.matchAll(/https?:\/\/[^"' )<\\]*/g)].map((trouve) => trouve[0]))], []);
});

test("la page de la chaîne dit qu'elle est générée, et ses logos sont des images écrites dans la page", () => {
  const page = genererChaine();
  assert.match(page, /^<!doctype html>\n<!-- Généré par docs\/inventaire\/generer-inventaire\.ts ; ne pas modifier à la main\. -->/);
  // Les trois logos de cartes, celui de l'en-tête et celui de la zone du kit.
  assert.ok(page.includes('src="data:image/svg+xml;base64,'));
});

test("la page de l'inventaire est autonome et tient sous 1 Mo", async () => {
  const page = await generee();
  assert.ok(Buffer.byteLength(page) < 1_000_000);
  assert.deepEqual(page.match(/\bsrc=(?!\\?"data:)|<link|@import/g), null);
  // Les seuls liens qui sortent de la page visent un document du dépôt sur GitHub : le script compose ceux de la recherche et du plan, le générateur écrit ceux des pistes terminées.
  // Le lien « Plein écran » de la chaîne vise `CHAINE-UCM.html`, écrit à côté de l'inventaire.
  // Le lien d'une carte de la chaîne vers sa fiche se compose dans `rendu.js` ; `pageDesFiches` y est vide, donc il vise l'ancre de la même page.
  assert.deepEqual(page.match(/href="(?!#|CHAINE-UCM\.html"|\$\{pageDesFiches\}#outil-|' \+ url)[^"]*"/g), null);
  const url = [...page.matchAll(/url\((?!#|data:|"data:)[^)]{0,20}/g)].map((trouve) => trouve[0]);
  assert.deepEqual(url, [], 'une feuille de style charge une ressource');
  const adresses = [...new Set([...page.matchAll(/https?:\/\/[^"' )<]*/g)].map((trouve) => trouve[0]))];
  const lienDuDepot = (adresse: string): boolean => adresse.startsWith(`${DEPOT_SUR_GITHUB}/`) && /^(main|[0-9a-f]{7,40})\//.test(adresse.slice(DEPOT_SUR_GITHUB.length + 1));
  const etrangeres = adresses.filter((adresse) => adresse !== 'http://www.w3.org/2000/svg' && !lienDuDepot(adresse));
  assert.deepEqual(etrangeres, [], "seuls l'espace de noms SVG et le dépôt sur GitHub (sur main ou sur un commit) sont des adresses");
});

/** Le bloc de la chaîne (en-tête, jauges, scène) d'une page, sans l'espace entre les balises ni le logo de l'en-tête. */
const blocDeLaChaine = (page: string): string => /<header>[\s\S]*?id="chaine-scene"><\/div>/.exec(page)![0].replace(/>\s+</g, '><');

test("la section 3 est la chaîne UCM : plus de parcours en huit étapes, un lien vers la page plein écran, le même bloc que cette page", async () => {
  const page = await generee();
  assert.ok(page.includes('<section class="partie" id="chaine">'));
  assert.ok(page.includes('<a href="#chaine">La chaîne UCM</a>'));
  assert.ok(page.includes('<a class="plein-ecran" href="CHAINE-UCM.html">Plein écran</a>'));
  assert.ok(!page.includes('class="parcours"') && !page.includes('etape-carte') && !page.includes('href="#parcours"'), 'le parcours en huit étapes est retiré');
  assert.equal(blocDeLaChaine(page), blocDeLaChaine(genererChaine()), 'le gabarit et plein-ecran.html écrivent le même balisage');
});

test("aucune règle de chaine.css ne sort de `.chaine`, sauf les @keyframes que la règle `chaine-flux` nomme", () => {
  const feuille = readFileSync(path.join(racine, 'docs', 'inventaire', 'chaine', 'chaine.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const hors: string[] = [];
  let profondeur = 0;
  let tete = '';
  for (const lettre of feuille) {
    if (lettre === '{') {
      if (profondeur === 0 && !tete.trim().startsWith('@')) {
        for (const selecteur of tete.split(',').map((candidat) => candidat.trim())) if (!/^(\.chaine|:where\(\.chaine\))(?![\w-])/.test(selecteur)) hors.push(selecteur);
      }
      if (profondeur === 0 && tete.trim().startsWith('@') && !/^@keyframes chaine-/.test(tete.trim())) hors.push(tete.trim());
      profondeur++;
      tete = '';
    } else if (lettre === '}') {
      profondeur--;
      tete = '';
    } else if (profondeur === 0) tete += lettre;
  }
  assert.deepEqual(hors, [], 'ces règles de chaine.css touchent le reste de la page');
});

test("le script de l'inventaire exclut la chaîne de l'étiquetage des produits", () => {
  const script = readFileSync(path.join(racine, 'docs', 'inventaire', 'page.js'), 'utf8');
  assert.match(/var HORS_ETIQUETTE = '([^']*)'/.exec(script)![1], /(^|, )\.chaine(,|$)/);
});

test("un lot fait n'affiche aucune attente, même marqué pour le mainteneur", () => {
  const script = readFileSync(path.join(racine, 'docs', 'inventaire', 'page.js'), 'utf8');
  const source = /function ligneDeLot\(l, groupe\) \{[\s\S]*?\n  \}/.exec(script)![0];
  const ligneDeLot = new Function('esc', 'txt', 'classeDuLot', `${source}; return ligneDeLot;`)(String, String, () => '') as (lot: object, groupe: string) => string;
  const lot = { numero: '0.1', texte: 'Choix', hash: 'abc', groupe: 'Étape 0' };
  assert.doesNotMatch(ligneDeLot({ ...lot, fait: true, marque: 'mainteneur' }, ''), /attend/);
  assert.doesNotMatch(ligneDeLot({ ...lot, fait: true, marque: 'attend P31' }, ''), /attend/);
  assert.match(ligneDeLot({ ...lot, fait: false, marque: 'mainteneur' }, ''), /décision en attente/);
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
  assert.deepEqual(Object.keys(vues), ['INVENTAIRE-UCM.html', 'CHAINE-UCM.html']);
  const donnees = ['pistes.json', 'decisions.json'].map((nom) => 'docs/notes/Recherches/Evolutions globales/' + nom);
  assert.deepEqual([...donnees, 'docs/inventaire/couverture.ts', 'docs/notes/Recherches/**/*.md'].filter((source) => !vues['INVENTAIRE-UCM.html'].includes(source)), [], 'sources.json oublie une source de la page');
  const fichiers = fichiersDuDepot(racine);
  const sansFichier = Object.values(vues).flat().filter((motif) => !fichiers.some((fichier) => motifVersRegex(motif).test(fichier)));
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


// ---------- Données de la Roadmap : pistes.json, plans, recherches ----------

const git = (dans: string, ...args: string[]): string => execFileSync('git', args, { cwd: dans, encoding: 'utf8' }).trim();

/** Le plan d'une piste, lu comme l'inventaire le lit : au commit d'archive, ou dans l'arbre. */
const planDeLaPiste = (piste: PisteEcrite): string =>
  piste.archive === undefined ? readFileSync(path.join(racine, piste.plan!), 'utf8') : git(racine, 'show', `${piste.archive}:${piste.plan}`);

/** La date du commit le plus récent que citent les lots faits d'un plan, lue sans passer par le lecteur de l'inventaire. */
function dateDuDernierHash(plan: string): string {
  const dates = lireLePlan(plan)
    .filter((lot) => lot.fait)
    .flatMap((lot) => lot.hashes.filter((hash) => hash.depot === null).map((hash) => git(racine, 'show', '-s', '--format=%cs', hash.hash)));
  return dates.sort().at(-1)!;
}

const transversesDuDepot = (): Regle[] => (JSON.parse(readFileSync(path.join(racine, CHEMIN_DES_DECISIONS), 'utf8')) as { regles: Regle[] }).regles.filter((regle) => regle.genre === 'transverse');

test('une piste de pistes.json sort avec ses champs du contrat, et P17 sort à la prio 4 posée par le mainteneur', () => {
  const { pistes: aSuivre } = roadmap(transversesDuDepot());
  const p17 = aSuivre.find((piste) => piste.id === 'P17')!;
  assert.equal(p17.prio, 4);
  assert.equal(p17.prioDeLAgent, 0);
  assert.match(p17.prioPosee!.raison, /On le fait mais plus tard/);
  const ecrites = new Map(pistes().map((piste) => [piste.id, piste]));
  for (const piste of aSuivre) {
    const posee = ecrites.get(piste.id)!.prioDuMainteneur;
    assert.deepEqual(piste.prioPosee, posee === undefined ? null : { raison: posee.raison }, `${piste.id} : la prio posée suit pistes.json`);
    if (posee !== undefined) assert.equal(piste.prio, posee.prio, `${piste.id} : la prio posée prime`);
  }
  assert.deepEqual(Object.keys(p17).sort(), [
    'attentes', 'avancement', 'complexite', 'coutHumain', 'criteresDeFin', 'debloque', 'dependances', 'dernierLot', 'etat', 'id', 'importance', 'lots',
    'plan', 'prio', 'prioDeLAgent', 'prioPosee', 'questions', 'raisonImportance', 'recherche', 'resume', 'risques', 'sujet', 'titre', 'titreCourt', 'transverses',
  ]);
});

test('P19 et P21 sortent dans TERMINEES avec la date de leur dernier hash et un lien vers leur plan', () => {
  const { pistes: aSuivre, terminees } = roadmap(transversesDuDepot());
  const ecrites = pistes();
  for (const id of ['P19', 'P21']) {
    const piste = ecrites.find((candidate) => candidate.id === id)!;
    const sortie = terminees.find((candidate) => candidate.id === id);
    assert.ok(sortie, `${id} manque à TERMINEES`);
    assert.equal(sortie.date, dateDuDernierHash(planDeLaPiste(piste)), `${id} : date du dernier lot`);
    assert.equal(sortie.ecartee, null);
    assert.ok(sortie.lien!.startsWith(`${DEPOT_SUR_GITHUB}/`) && sortie.lien!.endsWith('.md'), `${id} : lien ${sortie.lien}`);
    assert.ok(!aSuivre.some((candidate) => candidate.id === id || candidate.dependances.includes(id) || candidate.debloque.includes(id)), `${id} reste dans la suite`);
  }
});

test("l'avancement et l'état de chaque piste suivent son plan et sa recherche", () => {
  const ecrites = new Map(pistes().map((piste) => [piste.id, piste]));
  for (const piste of roadmap(transversesDuDepot()).pistes) {
    const source = ecrites.get(piste.id)!;
    if (source.plan === undefined) {
      assert.equal(piste.avancement, null, piste.id);
      assert.equal(piste.lots, null, piste.id);
      assert.equal(piste.etat, source.recherche === undefined ? 'idee' : 'recherche', piste.id);
      continue;
    }
    const lots = lireLePlan(planDeLaPiste(source));
    assert.deepEqual(piste.avancement, { faits: lots.filter((lot) => lot.fait).length, total: lots.length }, piste.id);
    assert.equal(piste.lots!.length, lots.length, piste.id);
    assert.equal(piste.etat, 'en-cours', piste.id);
    assert.ok(piste.avancement!.faits < piste.avancement!.total, `${piste.id} est livrée : elle sort dans TERMINEES`);
    assert.equal(piste.lots!.filter((lot) => lot.suivant).length, lots.some((lot) => !lot.fait && lot.marque === null) ? 1 : 0, piste.id);
  }
});

test("les questions d'une piste qui a une recherche viennent de sa section « Questions au mainteneur »", () => {
  const { pistes: aSuivre } = roadmap(transversesDuDepot());
  const questions = (id: string): string[] => aSuivre.find((piste) => piste.id === id)!.questions;
  assert.equal(questions('P23').length, 10);
  assert.equal(questions('P23')[0], "Q1. La forme de la bascule de l'Exporter.");
  assert.equal(questions('P20').length, 14);
  assert.equal(questions('P22').length, 4);
  assert.deepEqual(questions('P18'), [], "P18 n'a pas de section de questions");
  // Une piste sans recherche garde les questions de pistes.json.
  assert.deepEqual(questions('P17'), pistes().find((piste) => piste.id === 'P17')!.questions);
});

test('la page porte les pistes à suivre dans PISTES et les pistes terminées dans TERMINEES', async () => {
  const page = await generee();
  const lire = (nom: string): { id: string }[] => JSON.parse(new RegExp(`var ${nom} = (\\[.*?\\]);\\n`).exec(page)![1]);
  const { pistes: aSuivre, terminees } = roadmap(transversesDuDepot());
  assert.deepEqual(lire('PISTES').map(({ id }) => id), aSuivre.map(({ id }) => id));
  assert.deepEqual(lire('TERMINEES').map(({ id }) => id), terminees.map(({ id }) => id));
  for (const { id } of terminees) assert.ok(!page.includes(`href="#piste-${id}"`), `un lien vise la fiche de ${id}, terminée`);
});

test("la page n'enregistre plus de décision : ni fichier, ni localStorage des décisions, ni graphe", async () => {
  const page = await generee();
  assert.ok(!page.includes('showSaveFilePicker'));
  assert.ok(!page.includes("localStorage.setItem('inventaire-ucm-decisions'"));
  assert.ok(!page.includes('id="graphe"'));
});

test('decisions.json ne garde ni clé pistes, ni règle écrite de genre liste, ni question tranchée', () => {
  const decisions = JSON.parse(readFileSync(path.join(racine, CHEMIN_DES_DECISIONS), 'utf8')) as { regles: Regle[] };
  assert.deepEqual(Object.keys(decisions), ['version', 'regles']);
  assert.deepEqual(decisions.regles.filter((regle) => regle.genre === 'liste' && regle.ecrite === 'oui').map((regle) => regle.id), []);
  const restantes = decisions.regles.filter((regle) => /^T\d+$/.test(regle.id)).map((regle) => regle.id);
  for (const tranchee of ['T2', 'T3', 'T4', 'T7', 'T8', 'T9']) assert.ok(!restantes.includes(tranchee), `${tranchee} est tranchée : elle sort de decisions.json`);
});

// ---------- Les mêmes lectures sur un dépôt temporaire ----------

const DEPOTS_TEMPORAIRES: string[] = [];

/** Une piste complète de pistes.json ; `extra` remplace ou ajoute des champs. */
const ecrite = (id: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  id, titre: `Titre ${id}`, titreCourt: `Court ${id}`, sujet: 'Documentation', resume: 'Résumé.', importance: 'moyenne', raisonImportance: 'Parce que.',
  prio: 2, dependances: [], complexite: 'm', coutHumain: 'Aucun.', points: [], criteresDeFin: [], risques: [], ...extra,
});

function ecrireDans(base: string, chemin: string, contenu: string): void {
  mkdirSync(path.dirname(path.join(base, chemin)), { recursive: true });
  writeFileSync(path.join(base, chemin), contenu);
}

/** Un commit à la date donnée (AAAA-MM-JJ), rend son hash court. */
function commiter(base: string, date: string): string {
  const env = { ...process.env, GIT_AUTHOR_DATE: `${date}T12:00:00+00:00`, GIT_COMMITTER_DATE: `${date}T12:00:00+00:00` };
  execFileSync('git', ['add', '-A'], { cwd: base });
  execFileSync('git', ['-c', 'user.name=essai', '-c', 'user.email=essai@example.org', 'commit', '-q', '--allow-empty', '-m', `essai ${date}`], { cwd: base, env });
  return git(base, 'rev-parse', '--short', 'HEAD');
}

/** Un dépôt Git temporaire avec ce `pistes.json` et ces fichiers, sans commit. */
function depot(listeDePistes: Record<string, unknown>[], fichiers: Record<string, string> = {}): string {
  const base = mkdtempSync(path.join(tmpdir(), 'roadmap-'));
  DEPOTS_TEMPORAIRES.push(base);
  execFileSync('git', ['init', '-q'], { cwd: base });
  ecrireDans(base, CHEMIN_DES_PISTES, JSON.stringify({ version: 1, pistes: listeDePistes }, null, 2));
  for (const [chemin, contenu] of Object.entries(fichiers)) ecrireDans(base, chemin, contenu);
  return base;
}

test.after(() => {
  for (const base of DEPOTS_TEMPORAIRES) rmSync(base, { recursive: true, force: true });
});

test('une piste avec etat, alertes ou rang est refusée en nommant le champ', () => {
  for (const [champ, valeur] of [['etat', 'proposé'], ['alertes', []], ['rang', 2]] as const) {
    const base = depot([ecrite('P1', { [champ]: valeur })]);
    assert.throws(() => pistes(base), new RegExp(`piste P1, champ ${champ}`));
  }
});

test('une piste qui nomme un plugin a pour sujet ce plugin, et seul un plugin nommé donne ce sujet', () => {
  assert.throws(() => pistes(depot([ecrite('P1', { titre: 'Sélection des tokens dans UCM Exporter', sujet: 'Modules consommateurs' })])), /champ sujet.*« Plugin Exporter » attendu/);
  assert.throws(() => pistes(depot([ecrite('P1', { resume: 'Le moteur d’UCM Palettes calcule.', sujet: 'Documentation' })])), /« Plugin Palettes » attendu/);
  assert.throws(() => pistes(depot([ecrite('P1', { sujet: 'Plugin Architect' })])), /« Plugin Architect » demande que le titre ou le résumé nomme le plugin/);
  assert.equal(pistes(depot([ecrite('P1', { titre: 'Écran de UCM Architect', resume: 'Lit UCM Palettes.', sujet: 'Plugin Architect' })]))[0].sujet, 'Plugin Architect',
    'le titre décide avant le résumé');
});

test('prioDuMainteneur sans raison, ou à 6, est refusé ; une prio posée valide passe', () => {
  assert.throws(() => pistes(depot([ecrite('P1', { prioDuMainteneur: { prio: 3 } })])), /champ prioDuMainteneur\.raison/);
  assert.throws(() => pistes(depot([ecrite('P1', { prioDuMainteneur: { prio: 3, raison: '  ' } })])), /champ prioDuMainteneur\.raison/);
  assert.throws(() => pistes(depot([ecrite('P1', { prioDuMainteneur: { prio: 6, raison: 'Plus tard.' } })])), /champ prioDuMainteneur\.prio/);
  assert.throws(() => pistes(depot([ecrite('P1', { prio: 7 })])), /champ prio/);
  assert.equal(pistes(depot([ecrite('P1', { prioDuMainteneur: { prio: 0, raison: 'Tout de suite.' } })]))[0].prioDuMainteneur?.prio, 0);
});

test('ecartee sans raison est refusé', () => {
  assert.throws(() => pistes(depot([ecrite('P1', { ecartee: {} })])), /champ ecartee\.raison/);
  assert.throws(() => pistes(depot([ecrite('P1', { ecartee: { raison: '' } })])), /champ ecartee\.raison/);
});

test("questions à côté d'une recherche est refusé", () => {
  const base = depot([ecrite('P1', { recherche: 'R.md', questions: ['Une question ?'] })], { 'R.md': '# R\n' });
  assert.throws(() => pistes(base), /piste P1, champ questions.*Questions au mainteneur/);
});

test("archive est refusé quand le plan n'existe pas à ce commit", () => {
  const base = depot([ecrite('P1', { plan: 'PLAN.md', archive: 'HEAD' })], { 'PLAN.md': '- [x] 1. Fait.\n' });
  commiter(base, '2026-01-01');
  assert.equal(pistes(base).length, 1);
  const sansPlan = depot([ecrite('P1', { plan: 'PLAN.md', archive: 'HEAD' })]);
  commiter(sansPlan, '2026-01-01');
  assert.throws(() => pistes(sansPlan), /piste P1, champ archive.*PLAN\.md n'existe pas au commit HEAD/);
  const sansCommit = depot([ecrite('P1', { plan: 'PLAN.md', archive: 'abcdef1' })], { 'PLAN.md': '- [x] 1. Fait.\n' });
  assert.throws(() => pistes(sansCommit), /champ archive/);
});

test('une piste archivée lit son plan au commit, sort dans TERMINEES avec la date de son dernier hash et un lien figé', () => {
  const base = depot([ecrite('P1', { plan: 'PLAN.md' })], { 'a.txt': 'a\n' });
  const premier = commiter(base, '2026-02-03');
  ecrireDans(base, 'b.txt', 'b\n');
  const second = commiter(base, '2026-03-04');
  ecrireDans(base, 'PLAN.md', `# Plan\n\n- [x] 1 (${premier}). Un.\n- [x] 2 (${second}). Deux.\n`);
  const archive = commiter(base, '2026-03-05');
  // Le plan quitte l'arbre : seule la lecture au commit d'archive le retrouve.
  rmSync(path.join(base, 'PLAN.md'));
  const contenu = JSON.parse(readFileSync(path.join(base, CHEMIN_DES_PISTES), 'utf8'));
  contenu.pistes[0].archive = archive;
  ecrireDans(base, CHEMIN_DES_PISTES, JSON.stringify(contenu, null, 2));

  const { pistes: aSuivre, terminees } = roadmap([], base);
  assert.deepEqual(aSuivre, []);
  assert.deepEqual(terminees, [{ id: 'P1', titreCourt: 'Court P1', date: '2026-03-04', lien: `${DEPOT_SUR_GITHUB}/${archive}/PLAN.md`, ecartee: null }]);
});

test('une piste écartée sort dans TERMINEES avec sa raison, et les pistes qui en dépendent la retirent de leurs dépendances', () => {
  const base = depot([ecrite('P1', { ecartee: { raison: 'Storybook la remplace.' }, recherche: 'Dossier/R.md' }), ecrite('P2', { dependances: ['P1'] })], { 'Dossier/R.md': '# R\n' });
  const { pistes: aSuivre, terminees } = roadmap([], base);
  assert.deepEqual(terminees, [{ id: 'P1', titreCourt: 'Court P1', date: null, lien: `${DEPOT_SUR_GITHUB}/main/Dossier/R.md`, ecartee: 'Storybook la remplace.' }]);
  assert.deepEqual(aSuivre.map(({ id, dependances }) => ({ id, dependances })), [{ id: 'P2', dependances: [] }]);
});

test("le lien d'une piste terminée encode le chemin de son plan", () => {
  const base = depot([ecrite('P1', { plan: 'Dossier avec espace/Plan é.md' })], { 'Dossier avec espace/Plan é.md': '- [x] 1. Fait.\n' });
  assert.equal(roadmap([], base).terminees[0].lien, `${DEPOT_SUR_GITHUB}/main/Dossier%20avec%20espace/Plan%20%C3%A9.md`);
});

test("l'état, l'avancement, les lots et les attentes se calculent depuis la recherche et le plan", () => {
  const plan = ['# Plan', '', '## Vague 1', '', '- [x] 1.1 (HASH). Fait.', '- [ ] 1.2 (mainteneur). Choisir la forme.', '- [ ] 1.3 (attend P3). Après le contrat.', '- [ ] 1.4. Lot libre.', '  - [ ] sous-étape', ''].join('\n');
  const base = depot(
    [
      ecrite('P1', { prio: 0 }),
      ecrite('P2', { plan: 'PLAN.md', recherche: 'R2.md', dependances: ['P3'], importance: 'basse' }),
      ecrite('P3', { recherche: 'R3.md', prio: 1 }),
      ecrite('P4', { prio: 0, importance: 'critique', dependances: ['P1', 'P3'] }),
    ],
    { 'R2.md': '# R\n', 'R3.md': '# R\n\n## Questions au mainteneur\n\n- Une ?\n- [Deux ?](#deux)\n', 'a.txt': 'a\n', 'PLAN.md': plan },
  );
  const hash = commiter(base, '2026-04-05');
  ecrireDans(base, 'PLAN.md', plan.replace('HASH', hash));
  const { pistes: aSuivre } = roadmap([], base);
  assert.deepEqual(aSuivre.map(({ id }) => id), ['P4', 'P1', 'P3', 'P2'], 'prio, puis importance');
  const piste = (id: string) => aSuivre.find((candidate) => candidate.id === id)!;

  assert.equal(piste('P1').etat, 'idee');
  assert.deepEqual(piste('P1').attentes, [{ genre: 'toi', texte: 'À lancer, rien de commencé', detail: 'Prio 0 ou 1 sans recherche ni plan' }]);
  assert.equal(piste('P3').etat, 'recherche');
  assert.deepEqual(piste('P3').questions, ['Une ?', 'Deux ?']);
  assert.equal(piste('P3').attentes[0].texte, 'Décision en attente, 2 questions');
  assert.deepEqual(piste('P4').attentes.map(({ genre, texte }) => `${genre}:${texte}`), ['toi:À lancer, rien de commencé', 'piste:Après P1, P3']);
  assert.deepEqual(piste('P4').dependances, ['P1', 'P3']);
  assert.deepEqual(piste('P1').debloque, ['P4']);

  const p2 = piste('P2');
  assert.equal(p2.etat, 'en-cours');
  assert.deepEqual(p2.avancement, { faits: 1, total: 4 }, 'la sous-étape ne compte pas');
  assert.equal(p2.dernierLot, '2026-04-05');
  assert.deepEqual(p2.lots!.map(({ numero, fait, marque, suivant, hash: h }) => ({ numero, fait, marque, suivant, h })), [
    { numero: '1.1', fait: true, marque: '', suivant: false, h: hash },
    { numero: '1.2', fait: false, marque: 'mainteneur', suivant: false, h: '' },
    { numero: '1.3', fait: false, marque: 'attend P3', suivant: false, h: '' },
    { numero: '1.4', fait: false, marque: '', suivant: true, h: '' },
  ]);
  assert.equal(p2.lots![0].groupe, 'Vague 1');
  assert.deepEqual(p2.attentes.map(({ genre, texte, detail }) => ({ genre, texte, detail })), [
    { genre: 'toi', texte: 'Décision en attente, lot 1.2', detail: 'Choisir la forme.' },
    { genre: 'piste', texte: 'Lot 1.3 attend P3', detail: 'Après le contrat.' },
  ]);
});

test("une règle transverse va dans la fiche de chaque piste à suivre qu'elle nomme, sans les pistes terminées", () => {
  const base = depot([ecrite('P1'), ecrite('P2'), ecrite('P3', { ecartee: { raison: 'Écartée.' } })]);
  const regle: Regle = { id: 'T1', genre: 'transverse', titre: 'Sujet', texte: 'Texte.', domicileCible: 'CONTRIBUTING.md', ecrite: 'non', pistes: ['P1', 'P3'] };
  const { pistes: aSuivre } = roadmap([regle], base);
  assert.deepEqual(aSuivre.find(({ id }) => id === 'P1')!.transverses, [{ id: 'T1', titre: 'Sujet', texte: 'Texte.', pistes: ['P1'] }]);
  assert.deepEqual(aSuivre.find(({ id }) => id === 'P2')!.transverses, []);
});

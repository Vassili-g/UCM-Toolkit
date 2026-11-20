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
import { CHEMIN_DE_L_INVENTAIRE, bandeauDesAlertes, genererInventaireEtCouverture } from '../docs/inventaire/generer-inventaire';
import { CHEMIN_DES_DECISIONS, compterLesCases, pistes, validerLesAlertes, validerLesChoix, type Decisions, type Piste, type Regle } from '../docs/inventaire/releves';

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
  // Seuls le label de sujet et le statut d'une piste en cours sortent de la page, vers un document du dépôt sur GitHub ; le script les compose.
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
  assert.deepEqual(Object.keys(vues), ['INVENTAIRE-UCM.html']);
  const donnees = ['pistes.json', 'decisions.json'].map((nom) => 'docs/notes/Recherches/Evolutions globales/' + nom);
  assert.deepEqual([...donnees, 'docs/inventaire/couverture.ts'].filter((source) => !vues['INVENTAIRE-UCM.html'].includes(source)), [], 'sources.json oublie une source de la page');
  const fichiers = fichiersDuDepot(racine);
  const sansFichier = vues['INVENTAIRE-UCM.html'].filter((motif) => !fichiers.some((fichier) => motifVersRegex(motif).test(fichier)));
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

test('une piste avec un plan compte ses cases cochées sur le total', () => {
  for (const piste of pistes().filter((candidate) => candidate.plan !== undefined)) {
    const cases = readFileSync(path.join(racine, piste.plan!), 'utf8').split(/\r?\n/).filter((ligne) => /^\s*- \[[ x]\]/.test(ligne));
    assert.ok(cases.length > 0, `${piste.id} : le plan n'a aucune case`);
    assert.deepEqual(piste.avancement, { faites: cases.filter((ligne) => /^\s*- \[x\]/.test(ligne)).length, total: cases.length }, piste.id);
  }
});

test('un plan compte ses étapes hors des blocs de code, avec [X] et les puces * et +', () => {
  const plan = ['- [x] a', '- [X] b', '```md', '- [ ] exemple', '- [x] autre exemple', '```', '* [ ] c', '+ [x] d', '  - [ ] e'].join('\n');
  assert.deepEqual(compterLesCases(plan), { faites: 3, total: 5 });
});

test("aucun lien de la page ne vise la fiche d'une piste livrée", async () => {
  const page = await generee();
  for (const piste of pistes().filter((candidate) => candidate.avancement !== undefined && candidate.avancement.faites === candidate.avancement.total)) {
    assert.ok(!page.includes(`href="#piste-${piste.id}"`), `${piste.id} : un lien vise une fiche absente de la page`);
  }
});

test('une piste livrée quitte la suite et reste nommée par son plan', async () => {
  const page = await generee();
  const lire = (nom: string): { id: string; dependances?: string[] }[] => JSON.parse(new RegExp(`var ${nom} = (\\[.*?\\]);\\n`).exec(page)![1]);
  const suivies = lire('PISTES'), livrees = lire('LIVREES');
  for (const piste of pistes().filter((candidate) => candidate.avancement !== undefined && candidate.avancement.faites === candidate.avancement.total)) {
    assert.ok(livrees.some(({ id }) => id === piste.id), `${piste.id} manque à la ligne des livrées`);
    assert.ok(!suivies.some(({ id, dependances }) => id === piste.id || dependances!.includes(piste.id)), `${piste.id} reste dans la suite`);
  }
});

const pisteFictive = (alertes: unknown): Piste => ({ id: 'P1', titre: 'Titre', titreCourt: 'Court', sujet: 'Documentation', dependances: [], rang: 1, points: [], alertes: alertes as Piste['alertes'] });

test("une alerte de pistes.json apparaît dans le bandeau « À régler » et sur la fiche de sa piste", async () => {
  const page = await generee();
  const avecAlertes = pistes().filter((piste) => piste.alertes?.length && !(piste.avancement && piste.avancement.faites === piste.avancement.total));
  assert.ok(avecAlertes.length > 0, "aucune piste à suivre n'a d'alerte");
  const bandeau = /<div class="a-regler" id="a-regler"[\s\S]*?<\/ul>/.exec(page)?.[0] ?? '';
  const donnees = JSON.parse(/var PISTES = (\[.*?\]);\n/.exec(page)![1]) as Piste[];
  for (const piste of avecAlertes) {
    for (const alerte of piste.alertes!) {
      const sansCode = alerte.texte.replace(/`/g, '');
      assert.ok(bandeau.replace(/<\/?code>/g, '').includes(sansCode.replace(/&/g, '&amp;')), `${piste.id} : l'alerte manque au bandeau`);
      assert.ok(bandeau.includes(`href="#piste-${piste.id}"`) && bandeau.includes('Bloque :'), `${piste.id} : le lien ou « Bloque : » manque`);
    }
    assert.deepEqual(donnees.find(({ id }) => id === piste.id)!.alertes, piste.alertes, `${piste.id} : ses alertes n'arrivent pas à sa fiche`);
  }
  assert.ok(page.includes('alertesDeLaFiche(x)') && page.includes('repere-alerte'), 'le script ne rend ni le repère ni les alertes de la fiche');
});

test("le bandeau « À régler » liste chaque alerte, et une page sans alerte n'en a pas", () => {
  const bandeau = bandeauDesAlertes([pisteFictive([{ texte: 'Choisir `x`', avant: 'le lot 2' }]), { ...pisteFictive(undefined), id: 'P2' }], '<svg></svg>');
  assert.match(bandeau, /id="a-regler"/);
  assert.match(bandeau, /<a href="#piste-P1">P1 Court<\/a>.*Choisir <code>x<\/code>.*<b>Bloque :<\/b> le lot 2/);
  assert.ok(!bandeau.includes('P2'));
  assert.equal(bandeauDesAlertes([pisteFictive(undefined), pisteFictive([])], '<svg></svg>'), '');
});

test("pistes.json : une alerte sans texte, sans avant, ou un champ qui n'est pas un tableau échoue", () => {
  validerLesAlertes(pisteFictive([{ texte: 'a', avant: 'b' }]));
  validerLesAlertes(pisteFictive(undefined));
  assert.throws(() => validerLesAlertes(pisteFictive([{ avant: 'b' }])), /P1.*alertes\[0\]\.texte/);
  assert.throws(() => validerLesAlertes(pisteFictive([{ texte: 'a', avant: '  ' }])), /alertes\[0\]\.avant/);
  assert.throws(() => validerLesAlertes(pisteFictive([{ texte: 'a', avant: 'b' }, { texte: '', avant: 'b' }])), /alertes\[1\]\.texte/);
  assert.throws(() => validerLesAlertes(pisteFictive('texte')), /doit être un tableau/);
});

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

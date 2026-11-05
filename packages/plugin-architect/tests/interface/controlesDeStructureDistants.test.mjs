/**
 * Les contrôles de structure dans le vrai Worker, sous Chromium. Le test construit dans un dossier temporaire, sans toucher à `dist/` : le
 * bundle du Worker (mêmes options que `scripts/build-ui-js.cjs`), puis une page minimale qui embarque sa source et lance le client de l'écran
 * (`creerCalculateurDeNoms`) comme `ui.html` le fait. Le test joue le sandbox : il envoie `calcul-des-noms` (un travail `controler`) et lit la
 * réponse que le client lui adresse. Chaque liste de constats que le Worker rend égale celle du kit appelé sous Node, dans le même ordre.
 * Le test compte et n'écrit aucun nom du fichier du rejeu.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSync } from 'esbuild';
import { chromium } from 'playwright';

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const commun = { bundle: true, format: 'iife', platform: 'browser', target: 'chrome80', minify: true, absWorkingDir: racine, write: false, logLevel: 'silent' };

/** Le Worker et la page, construits dans un dossier temporaire ; la page déclare `recevoir` et lit les réponses dans `reponses`. */
function construire(dossier) {
  const travailleur = buildSync({ ...commun, entryPoints: ['src/ui/nomenclature/calculDesNomsWorker.ts'] }).outputFiles[0].text;
  const page = buildSync({
    ...commun,
    stdin: {
      contents: `import { creerCalculateurDeNoms } from './src/ui/nomenclature/calculDesNoms';
        window.reponses = [];
        const calcul = creerCalculateurDeNoms({ envoyer: (reponse) => { window.reponses.push({ ...reponse, recueA: Date.now() }); } });
        window.recevoir = (message) => { window.envoyeA = Date.now(); calcul.recevoir(message); };`,
      resolveDir: racine, loader: 'ts',
    },
    define: { __SOURCE_DU_WORKER_DE_NOMS__: JSON.stringify(travailleur) },
  }).outputFiles[0].text;
  writeFileSync(path.join(dossier, 'page.js'), page);
  writeFileSync(path.join(dossier, 'page.html'), '<!doctype html><html><head><meta charset="utf-8"></head><body><script src="page.js"></script></body></html>');
  return { octetsDuTravailleur: travailleur.length, adresse: pathToFileURL(path.join(dossier, 'page.html')).href };
}

/** Les catalogues, le rejeu et les contrôles du kit, compilés pour Node : la même entrée sert le Worker et la référence. */
function outils() {
  const { outputFiles } = buildSync({
    stdin: {
      contents: `export * from './tests/outils/fixturesDeNomenclature';
        export { fabriquerUnCatalogue } from './tests/aides/cataloguesDeCroissance';
        export { catalogueDepuisTokens } from '../kit/tests/stress/rejeu-fichiers/dtcg';
        export { controlerLIntegriteUcm, controlerLeCatalogue } from '@ucm-kit/core/controles';`,
      resolveDir: racine, loader: 'ts',
    },
    bundle: true, write: false, platform: 'node', format: 'cjs', logLevel: 'silent',
  });
  const module_ = { exports: {} };
  new Function('module', 'exports', 'require', outputFiles[0].text)(module_, module_.exports, createRequire(path.join(racine, 'package.json')));
  return module_.exports;
}
const { FIXTURES, entreeDeFixture, fabriquerUnCatalogue, catalogueDepuisTokens, controlerLIntegriteUcm, controlerLeCatalogue } = outils();

const DEMANDES_DE_CONTROLE = 2 ** 30;
const ECRITURE = { groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } };
const texte = (valeur) => JSON.stringify(valeur);
const direct = ({ catalogue, ecriture, roles }) => ({ catalogue: controlerLeCatalogue(catalogue), integrite: controlerLIntegriteUcm(catalogue, { ecriture, rolesIgnores: [...roles] }) });
const controle = (demande, entree) => ({ type: 'calcul-des-noms', demande: DEMANDES_DE_CONTROLE + demande, generation: demande, revision: 'r1', envoyeA: Date.now(), travail: { sorte: 'controler', entree } });

let dossier;
let navigateur;
let adresse;
before(async () => {
  dossier = mkdtempSync(path.join(tmpdir(), 'ucm-architect-g6-'));
  ({ adresse } = construire(dossier));
  navigateur = await chromium.launch();
});
after(async () => {
  await navigateur?.close();
  if (dossier) rmSync(dossier, { recursive: true, force: true });
});

async function ouvrir() {
  const contexte = await navigateur.newContext();
  const page = await contexte.newPage();
  page.setDefaultTimeout(30000);
  const erreurs = [];
  page.on('pageerror', (erreur) => erreurs.push(erreur.message));
  await page.goto(adresse);
  page.erreurs = erreurs;
  return page;
}
const fermer = async (page) => {
  assert.deepEqual(page.erreurs, []);
  await page.context().close();
};

/** Envoie un message au client comme le sandbox le ferait, et attend la réponse portant `demande`. */
async function lancer(page, message) {
  await page.evaluate((m) => window.recevoir(m), message);
  await page.waitForFunction((demande) => window.reponses.some((reponse) => reponse.demande === demande), message.demande);
  return page.evaluate((demande) => window.reponses.find((reponse) => reponse.demande === demande), message.demande);
}

const CAS = [
  { nom: 'palettes complètes', catalogue: fabriquerUnCatalogue(1, { palettes: 3, crans: 5, partManquante: 0 }), ecriture: ECRITURE, roles: [] },
  { nom: 'alias en partie manquants', catalogue: fabriquerUnCatalogue(2, { palettes: 4, crans: 6, partManquante: 0.3 }), ecriture: ECRITURE, roles: [] },
  { nom: 'sans écriture', catalogue: fabriquerUnCatalogue(2, { palettes: 4, crans: 6, partManquante: 0.3 }), ecriture: null, roles: ['surface/default'] },
  { nom: 'tous les alias manquants', catalogue: fabriquerUnCatalogue(3, { palettes: 2, crans: 4, partManquante: 1 }), ecriture: ECRITURE, roles: [] },
  { nom: 'fichier vide', catalogue: { version: 1, library: null, collections: [], variables: [] }, ecriture: null, roles: [] },
];

test('le Worker démarre dans Chromium et rend les constats du kit, dans leur ordre', async () => {
  const page = await ouvrir();
  try {
    let demande = 0;
    for (const cas of CAS) {
      demande += 1;
      const entree = { catalogue: cas.catalogue, ecriture: cas.ecriture, roles: cas.roles };
      const reponse = await lancer(page, controle(demande, entree));
      assert.equal(reponse.type, 'noms-calcules', cas.nom);
      assert.deepEqual([reponse.demande, reponse.generation, reponse.revision], [DEMANDES_DE_CONTROLE + demande, demande, 'r1']);
      assert.equal(reponse.resultat.sorte, 'constats');
      const attendu = direct(entree);
      assert.equal(texte(reponse.resultat.catalogue), texte(attendu.catalogue), `controlerLeCatalogue : ${cas.nom}`);
      assert.equal(texte(reponse.resultat.integrite), texte(attendu.integrite), `controlerLIntegriteUcm : ${cas.nom}`);
      assert.equal(reponse.mesure.demarrage, demande === 1, 'seule la première requête démarre le Worker');
      const { recuA, travailleurRecuA, calculDebutA, calculFinA } = reponse.mesure;
      assert.ok(recuA <= travailleurRecuA && travailleurRecuA <= calculDebutA && calculDebutA <= calculFinA, 'les heures se suivent');
      const { catalogue, integrite } = reponse.resultat.heures;
      assert.ok(calculDebutA <= catalogue.debut && catalogue.debut <= catalogue.fin && catalogue.fin <= integrite.debut && integrite.debut <= integrite.fin && integrite.fin <= calculFinA, 'les deux contrôles se suivent dans le calcul');
    }
    assert.ok(demande >= 5);
  } finally { await fermer(page); }
});

const REJEU = [
  { nom: 'premier fichier du rejeu', chemin: path.join(racine, '..', '..', 'docs/notes/Archives/Plugin Architect/1 Architecture globale/Mesures/tokens-slice-exemple.json') },
  { nom: 'second fichier du rejeu', chemin: path.join(racine, '..', '..', '..', 'intencial-library/src/tokens/tokens.json') },
];

for (const source of REJEU) {
  test(`${source.nom} : le Worker rend les constats du kit, et le message tient en un envoi`, { skip: !existsSync(source.chemin) }, async () => {
    const { readFileSync } = await import('node:fs');
    const { catalogue } = catalogueDepuisTokens(JSON.parse(readFileSync(source.chemin, 'utf8')));
    const page = await ouvrir();
    try {
      const entree = { catalogue, ecriture: ECRITURE, roles: [] };
      const message = controle(1, entree);
      const octets = texte(message).length;
      // Une première requête démarre le Worker ; la mesure porte sur la seconde, comme dans Figma après l'ouverture du plugin.
      await lancer(page, controle(2, { catalogue: { version: 1, library: null, collections: [], variables: [] }, ecriture: null, roles: [] }));
      const reponse = await lancer(page, message);
      const attendu = direct(entree);
      assert.equal(texte(reponse.resultat.catalogue), texte(attendu.catalogue), 'controlerLeCatalogue');
      assert.equal(texte(reponse.resultat.integrite), texte(attendu.integrite), 'controlerLIntegriteUcm');
      const { catalogue: c, integrite: i } = reponse.resultat.heures;
      const { mesure } = reponse;
      console.log(`${source.nom} : ${catalogue.variables.length} variables, message de ${octets} octets, ${reponse.resultat.catalogue.length} constats de catalogue et ${reponse.resultat.integrite.length} d'intégrité ; `
        + `dans le Worker sous Chromium : catalogue ${c.fin - c.debut} ms, intégrité ${i.fin - i.debut} ms, calcul ${mesure.calculFinA - mesure.calculDebutA} ms ; `
        + `transfert ${mesure.travailleurRecuA - mesure.recuA} ms, retour ${reponse.recueA - mesure.calculFinA} ms`);
    } finally { await fermer(page); }
  });
}

test('un contrôle et un calcul des noms de même numéro de demande attendent ensemble, chacun avec sa réponse', async () => {
  const page = await ouvrir();
  try {
    const entree = await entreeDeFixture(FIXTURES[1], 3);
    const controles = { catalogue: CAS[1].catalogue, ecriture: ECRITURE, roles: [] };
    await page.evaluate(([noms, structure]) => { window.recevoir(noms); window.recevoir(structure); }, [
      { type: 'calcul-des-noms', demande: 5, generation: 3, revision: 'r1', envoyeA: Date.now(), travail: { sorte: 'calculer', entree } },
      controle(5, controles),
    ]);
    await page.waitForFunction(() => window.reponses.length >= 2);
    const reponses = await page.evaluate(() => window.reponses);
    const bilan = reponses.find((reponse) => reponse.demande === 5);
    const constats = reponses.find((reponse) => reponse.demande === DEMANDES_DE_CONTROLE + 5);
    assert.equal(bilan?.resultat.sorte, 'bilan');
    assert.equal(constats?.resultat.sorte, 'constats');
    assert.equal(texte(constats.resultat.integrite), texte(direct(controles).integrite));
  } finally { await fermer(page); }
});

test('une politique de contenu qui refuse les Workers donne `noms-non-calcules` au contrôle, qui revient au sandbox', async () => {
  const page = await ouvrir();
  try {
    await page.evaluate(() => {
      const politique = document.createElement('meta');
      politique.httpEquiv = 'Content-Security-Policy';
      politique.content = "worker-src 'none'";
      document.head.append(politique);
    });
    const reponse = await lancer(page, controle(1, { catalogue: CAS[0].catalogue, ecriture: null, roles: [] }));
    assert.equal(reponse.type, 'noms-non-calcules');
    assert.ok(['demarrage', 'indisponible'].includes(reponse.cause), `cause ${reponse.cause}`);
    const suite = await lancer(page, controle(2, { catalogue: CAS[0].catalogue, ecriture: null, roles: [] }));
    assert.deepEqual([suite.type, suite.cause], ['noms-non-calcules', 'indisponible']);
  } finally { await fermer(page); }
});

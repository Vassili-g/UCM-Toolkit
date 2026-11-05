/**
 * Le Worker du calcul des noms dans Chromium, sur la page compilée de l'interface. Le test joue le sandbox : il envoie `calcul-des-noms`
 * et lit la réponse que l'écran lui adresse. Le Worker naît de la source que le build embarque ; le bilan qu'il rend égale celui du
 * calcul pur. Une politique de contenu qui refuse les Workers donne `noms-non-calcules`, après quoi le sandbox calcule lui-même.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { attendreLesDemandes, fermer, lancerLeNavigateur, ouvrir } from './aide.mjs';

lancerLeNavigateur();

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Les fixtures et le calcul pur, compilés pour Node : la même entrée sert le Worker et la référence. */
function outils() {
  const { outputFiles } = buildSync({
    stdin: { contents: "export * from './tests/outils/fixturesDeNomenclature'; export { calculerLeBilanDirect } from './src/nomenclature/calcul';", resolveDir: racine, loader: 'ts' },
    bundle: true, write: false, platform: 'node', format: 'cjs', logLevel: 'silent',
  });
  const module_ = { exports: {} };
  new Function('module', 'exports', 'require', outputFiles[0].text)(module_, module_.exports, createRequire(path.join(racine, 'package.json')));
  return module_.exports;
}
const { FIXTURES, entreeDeFixture, calculerLeBilanDirect } = outils();

/** Mille six cents variables, quatre par composant : de quoi passer par un message de la taille d'un fichier réel. */
const VOLUMINEUX = {
  nom: 'volumineux',
  collections: [{ id: 'c1', name: 'Components' }],
  variables: Array.from({ length: 400 }, (_, rang) => ['Background/Hover', 'Background/Pressed', 'Foreground/Default', 'Foreground/Disabled'].map((fin, i) => [`v${rang}-${i}`, `Comp${rang}/${fin}`, 'c1'])).flat(),
  regles: [],
};

const message = (entree, demande, revision = 'r1') => ({ type: 'calcul-des-noms', demande, generation: entree.generation, revision, envoyeA: Date.now(), entree });
const jouer = (page, brut) => page.evaluate((m) => window.postMessage({ pluginMessage: m }, '*'), brut);
const reponses = (page) => page.evaluate(() => window.demandes.filter((demande) => demande.type === 'noms-calcules' || demande.type === 'noms-non-calcules'));

test('le Worker démarre dans Chromium et rend le bilan du calcul pur', async () => {
  const page = await ouvrir();
  try {
    const entree = await entreeDeFixture(FIXTURES[2], 4);
    await jouer(page, message(entree, 1));
    const [reponse] = await attendreLesDemandes(page, 'noms-calcules');
    assert.deepEqual([reponse.demande, reponse.generation, reponse.revision], [1, 4, 'r1']);
    assert.equal(JSON.stringify(reponse.bilan), JSON.stringify(calculerLeBilanDirect(entree)));
    assert.equal(reponse.mesure.demarrage, true);
    const { recuA, travailleurRecuA, calculDebutA, calculFinA } = reponse.mesure;
    assert.ok(recuA <= travailleurRecuA && travailleurRecuA <= calculDebutA && calculDebutA <= calculFinA, 'les heures se suivent');
    // Une seconde requête réutilise le Worker : pas de démarrage, une génération de plus.
    await jouer(page, message({ ...entree, generation: 5 }, 2));
    const suite = await attendreLesDemandes(page, 'noms-calcules', 2);
    assert.equal(suite[1].mesure.demarrage, false);
    assert.equal(suite[1].generation, 5);
  } finally { await fermer(page); }
});

test('un inventaire de mille six cents variables passe en un message et revient en bilan identique', async () => {
  const page = await ouvrir();
  try {
    const entree = await entreeDeFixture(VOLUMINEUX, 2);
    const octets = JSON.stringify(entree).length;
    await jouer(page, message(entree, 1));
    const [reponse] = await attendreLesDemandes(page, 'noms-calcules');
    assert.equal(JSON.stringify(reponse.bilan), JSON.stringify(calculerLeBilanDirect(entree)));
    console.log(`${VOLUMINEUX.variables.length} variables : entrée de ${octets} octets, calcul dans le Worker ${reponse.mesure.calculFinA - reponse.mesure.calculDebutA} ms, démarrage ${reponse.mesure.travailleurRecuA - reponse.mesure.recuA} ms`);
  } finally { await fermer(page); }
});

test('la réponse d\'une requête remplacée n\'arrive pas : seule la dernière est rendue', async () => {
  const page = await ouvrir();
  try {
    const entree = await entreeDeFixture(FIXTURES[1], 5);
    await jouer(page, message(entree, 1));
    await jouer(page, message({ ...entree, generation: 6 }, 2));
    await attendreLesDemandes(page, 'noms-calcules');
    await page.waitForTimeout(200);
    const rendues = await reponses(page);
    assert.deepEqual(rendues.map((reponse) => [reponse.type, reponse.demande, reponse.generation]), [['noms-calcules', 2, 6]]);
  } finally { await fermer(page); }
});

test('une politique de contenu qui refuse les Workers donne `noms-non-calcules`, et le client ne réessaie pas', async () => {
  const page = await ouvrir();
  try {
    await page.evaluate(() => {
      const politique = document.createElement('meta');
      politique.httpEquiv = 'Content-Security-Policy';
      politique.content = "worker-src 'none'";
      document.head.append(politique);
    });
    const entree = await entreeDeFixture(FIXTURES[2], 4);
    await jouer(page, message(entree, 1));
    await attendreLesDemandes(page, 'noms-non-calcules');
    await jouer(page, message(entree, 2));
    const rendues = await attendreLesDemandes(page, 'noms-non-calcules', 2);
    assert.ok(['demarrage', 'indisponible'].includes(rendues[0].cause), `cause ${rendues[0].cause}`);
    assert.equal(rendues[1].cause, 'indisponible');
    assert.equal(await page.evaluate(() => window.demandes.filter((demande) => demande.type === 'noms-calcules').length), 0);
  } finally { await page.context().close(); }
});

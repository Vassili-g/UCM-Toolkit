/**
 * Le Worker des noms dans Chromium, sur la page compilée de l'interface. Le test joue le sandbox : il envoie `calcul-des-noms` (un travail)
 * et lit la réponse que l'écran lui adresse. Le Worker naît de la source que le build embarque ; il garde l'état de chaque génération, et
 * chaque résultat qu'il rend égale celui de l'atelier sous Node. Une politique de contenu qui refuse les Workers donne `noms-non-calcules`,
 * après quoi le sandbox travaille lui-même.
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

/** Les fixtures et l'atelier, compilés pour Node : la même entrée sert le Worker et la référence. */
function outils() {
  const { outputFiles } = buildSync({
    stdin: { contents: "export * from './tests/outils/fixturesDeNomenclature'; export { creerAtelier } from './src/nomenclature/atelier'; export { calculerLeBilanDirect } from './src/nomenclature/calcul';", resolveDir: racine, loader: 'ts' },
    bundle: true, write: false, platform: 'node', format: 'cjs', logLevel: 'silent',
  });
  const module_ = { exports: {} };
  new Function('module', 'exports', 'require', outputFiles[0].text)(module_, module_.exports, createRequire(path.join(racine, 'package.json')));
  return module_.exports;
}
const { FIXTURES, entreeDeFixture, creerAtelier, calculerLeBilanDirect } = outils();

/** Deux mille quatre cents variables, quatre par composant : de quoi passer par un message de la taille d'un fichier réel. */
const volumineux = (composants) => ({
  nom: 'volumineux',
  collections: [{ id: 'c1', name: 'Components' }],
  variables: Array.from({ length: composants }, (_, rang) => ['Background/Hover', 'Background/Pressed', 'Foreground/Default', 'Foreground/Disabled'].map((fin, i) => [`v${rang}-${i}`, `Comp${rang}/${fin}`, 'c1'])).flat(),
  regles: [],
});
const VOLUMINEUX = volumineux(400);

const calcul = (entree, demande, revision = 'r1') => ({ type: 'calcul-des-noms', demande, generation: entree.generation, revision, envoyeA: Date.now(), travail: { sorte: 'calculer', entree } });
const travail = (demande, generation, contenu, revision = 'r1') => ({ type: 'calcul-des-noms', demande, generation, revision, envoyeA: Date.now(), travail: contenu });
const jouer = (page, brut) => page.evaluate((m) => window.postMessage({ pluginMessage: m }, '*'), brut);
const reponses = (page) => page.evaluate(() => window.demandes.filter((demande) => demande.type === 'noms-calcules' || demande.type === 'noms-non-calcules'));
const texte = (valeur) => JSON.stringify(valeur);

/** Envoie un travail au Worker, attend sa réponse, et rend la réponse du Worker avec ce que l'atelier de Node répond au même travail. */
async function lancer(page, atelier, demande, generation, contenu, attendu) {
  await jouer(page, travail(demande, generation, contenu));
  const rendues = await attendreLesDemandes(page, 'noms-calcules', attendu);
  const reponse = rendues.find((candidate) => candidate.demande === demande);
  assert.ok(reponse, `réponse à la demande ${demande}`);
  return { reponse, reference: atelier.executer(JSON.parse(JSON.stringify(contenu)), generation) };
}

test('le Worker démarre dans Chromium et rend le bilan du calcul pur', async () => {
  const page = await ouvrir();
  try {
    const entree = await entreeDeFixture(FIXTURES[2], 4);
    await jouer(page, calcul(entree, 1));
    const [reponse] = await attendreLesDemandes(page, 'noms-calcules');
    assert.deepEqual([reponse.demande, reponse.generation, reponse.revision], [1, 4, 'r1']);
    assert.equal(reponse.resultat.sorte, 'bilan');
    assert.equal(JSON.stringify(reponse.resultat.bilan), JSON.stringify(calculerLeBilanDirect(entree)));
    assert.equal(reponse.mesure.demarrage, true);
    const { recuA, travailleurRecuA, calculDebutA, calculFinA } = reponse.mesure;
    assert.ok(recuA <= travailleurRecuA && travailleurRecuA <= calculDebutA && calculDebutA <= calculFinA, 'les heures se suivent');
    // Une seconde requête réutilise le Worker : pas de démarrage, une génération de plus.
    await jouer(page, calcul({ ...entree, generation: 5 }, 2));
    const suite = await attendreLesDemandes(page, 'noms-calcules', 2);
    assert.equal(suite[1].mesure.demarrage, false);
    assert.equal(suite[1].generation, 5);
  } finally { await fermer(page); }
});

test('G1.7 : le Worker garde l\'état et rend comme l\'atelier une page de lignes, une fiche, une simulation, une réponse à une question et les renommages', async () => {
  const page = await ouvrir();
  try {
    const entree = await entreeDeFixture(FIXTURES[1], 1);
    const atelier = creerAtelier();
    atelier.executer({ sorte: 'calculer', entree: JSON.parse(JSON.stringify(entree)) }, 1);
    await jouer(page, calcul(entree, 1));
    await attendreLesDemandes(page, 'noms-calcules');
    const bilan = calculerLeBilanDirect(entree);
    const groupe = bilan.groupes[0].cle;
    const paire = bilan.questions.find((question) => question.type === 'paire' && !question.cle.includes('fg'));
    const courant = [];
    const lectures = [
      { sorte: 'lire', lecture: { type: 'lignes', demande: 2, generation: 1, groupe, debut: 0 } },
      { sorte: 'lire', lecture: { type: 'termes', demande: 3, generation: 1, recherche: '', types: [], origines: [], places: [], tri: 'alpha', section: null, place: null, debut: 0 } },
      { sorte: 'lire', lecture: { type: 'fiche', demande: 4, generation: 1, terme: 'quux' } },
      { sorte: 'lire', lecture: { type: 'noms-selection', demande: 5, generation: 1, exclus: [], inclus: [] } },
      { sorte: 'simuler', demande: 6, geste: { type: 'ecart-ucm', terme: 'disabled', actif: false }, courant },
      { sorte: 'renommages', selection: { groupes: bilan.groupes.map((candidat) => candidat.cle), exclus: [], inclus: [] } },
    ];
    let attendu = 1;
    for (const [rang, contenu] of lectures.entries()) {
      attendu += 1;
      const { reponse, reference } = await lancer(page, atelier, 2 + rang, 1, contenu, attendu);
      assert.equal(texte(reponse.resultat), texte(reference), `résultat de ${contenu.sorte} ${contenu.lecture?.type ?? ''}`);
      assert.notEqual(reponse.resultat.sorte, 'perimee', 'le Worker a gardé la génération');
    }
    // Une réponse à une question : le Worker prépare les écritures puis recalcule la génération suivante.
    const preparation = { sorte: 'reponse', question: paire.cle, reponse: { type: 'garder', rang: 0 } };
    const prepare = await lancer(page, atelier, 20, 1, { sorte: 'preparer', preparation, courant: [] }, ++attendu);
    assert.equal(texte(prepare.reponse.resultat), texte(prepare.reference));
    assert.equal(prepare.reponse.resultat.sorte, 'ecritures');
    const regles = prepare.reponse.resultat.regles;
    const recalcule = await lancer(page, atelier, 21, 2, { sorte: 'recalculer', base: 1, regles }, ++attendu);
    assert.equal(texte(recalcule.reponse.resultat), texte(recalcule.reference));
    assert.equal(recalcule.reponse.resultat.bilan.generation, 2);
    const apres = await lancer(page, atelier, 22, 2, { sorte: 'lire', lecture: { type: 'lignes', demande: 22, generation: 2, groupe: recalcule.reponse.resultat.bilan.groupes[0].cle, debut: 0 } }, ++attendu);
    assert.equal(texte(apres.reponse.resultat), texte(apres.reference));
    // La génération précédente reste lisible, puis disparaît quand la troisième arrive.
    const ancienne = await lancer(page, atelier, 23, 1, { sorte: 'lire', lecture: { type: 'fiche', demande: 23, generation: 1, terme: 'quux' } }, ++attendu);
    assert.equal(ancienne.reponse.resultat.sorte, 'message');
    await lancer(page, atelier, 24, 3, { sorte: 'recalculer', base: 2, regles }, ++attendu);
    const perimee = await lancer(page, atelier, 25, 1, { sorte: 'lire', lecture: { type: 'fiche', demande: 25, generation: 1, terme: 'quux' } }, ++attendu);
    assert.deepEqual(perimee.reponse.resultat, { sorte: 'perimee' });
  } finally { await fermer(page); }
});

test('un inventaire de mille six cents variables passe en un message et revient en bilan identique', async () => {
  const page = await ouvrir();
  try {
    const entree = await entreeDeFixture(VOLUMINEUX, 2);
    const octets = JSON.stringify(entree).length;
    await jouer(page, calcul(entree, 1));
    const [reponse] = await attendreLesDemandes(page, 'noms-calcules');
    assert.equal(JSON.stringify(reponse.resultat.bilan), JSON.stringify(calculerLeBilanDirect(entree)));
    console.log(`${VOLUMINEUX.variables.length} variables : entrée de ${octets} octets, calcul dans le Worker ${reponse.mesure.calculFinA - reponse.mesure.calculDebutA} ms, démarrage ${reponse.mesure.travailleurRecuA - reponse.mesure.recuA} ms`);
  } finally { await fermer(page); }
});

test('la réponse d\'une analyse remplacée n\'arrive pas : seule la dernière est rendue', async () => {
  const page = await ouvrir();
  try {
    const entree = await entreeDeFixture(FIXTURES[1], 5);
    await jouer(page, calcul(entree, 1));
    await jouer(page, calcul({ ...entree, generation: 6 }, 2));
    await attendreLesDemandes(page, 'noms-calcules');
    await page.waitForTimeout(200);
    const rendues = await reponses(page);
    assert.deepEqual(rendues.map((reponse) => [reponse.type, reponse.demande, reponse.generation]), [['noms-calcules', 2, 6]]);
  } finally { await fermer(page); }
});

test('une politique de contenu qui refuse les Workers donne `noms-non-calcules`, et le client ne réessaie pas', async () => {
  // La politique est posée avant le chargement : le Worker naît au montage, une politique ajoutée après ne le refuserait plus.
  const page = await ouvrir({ politique: "worker-src 'none'" });
  try {
    const entree = await entreeDeFixture(FIXTURES[2], 4);
    await jouer(page, calcul(entree, 1));
    await attendreLesDemandes(page, 'noms-non-calcules');
    await jouer(page, calcul(entree, 2));
    const rendues = await attendreLesDemandes(page, 'noms-non-calcules', 2);
    assert.ok(['demarrage', 'indisponible'].includes(rendues[0].cause), `cause ${rendues[0].cause}`);
    assert.equal(rendues[1].cause, 'indisponible');
    assert.equal(await page.evaluate(() => window.demandes.filter((demande) => demande.type === 'noms-calcules').length), 0);
  } finally { await page.context().close(); }
});

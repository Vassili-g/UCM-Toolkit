/**
 * G1.2, parité du calcul pur des noms. Pour chaque fixture et chaque fichier du rejeu, le `bilan` que la session du sandbox envoie
 * est égal, après sérialisation et dans son ordre complet, à celui de `calculerLeBilanDirect` sur une copie `structuredClone` de
 * l'entrée. Le module de calcul ne tire ni `figma`, ni le socle d'interface, ni le journal du mode Tokens. Une source absente se
 * saute ; les tests comptent et n'écrivent aucun nom du fichier.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import test from 'node:test';
import { buildSync } from 'esbuild';

import { catalogueDepuisTokens } from '../../kit/tests/stress/rejeu-fichiers/dtcg';
import type { Bilan, MessageDeNomenclature } from '../src/messages/nomenclature';
import { calculerLeBilan, calculerLeBilanDirect, type EntreeDuCalcul } from '../src/nomenclature/calcul';
import { lireInventaire, type PortDeLecture } from '../src/nomenclature/lecture';
import { lireLesRegles, lireLeStockage } from '../src/nomenclature/regles';
import { creerSession } from '../src/nomenclature/session';
import { FIXTURES, entreeDeFixture, portDeLecture, portDeRegles, stockageDeRegles, type FixtureDeNomenclature } from './outils/fixturesDeNomenclature';

const racine = join(__dirname, '..', '..', '..');

/** Le bilan de la première analyse par la session du sandbox, et l'entrée qu'elle a lue pour le calculer. */
async function bilanDeLaSession(lecture: PortDeLecture, stock: Map<string, string>): Promise<{ bilan: Bilan; entree: EntreeDuCalcul }> {
  const regles = lireLesRegles(lireLeStockage(portDeRegles(stock)));
  const inventaire = await lireInventaire(lecture, { pause: async () => {} });
  const messages: MessageDeNomenclature[] = [];
  const session = creerSession({
    port: { lecture, ecriture: { ouvrir: async () => { throw new Error('pas d\'écriture'); } }, regles: portDeRegles(stock) },
    envoyer: (message) => { messages.push(message); },
    tranches: { pause: async () => {} },
  });
  await session.recevoir({ type: 'noms-analyser', demande: 1 });
  const bilan = messages.find((message) => message.type === 'bilan');
  assert.ok(bilan && bilan.type === 'bilan', `un bilan était attendu, reçu : ${messages.map((message) => message.type).join(',')}`);
  return { bilan: bilan.bilan, entree: { generation: bilan.bilan.generation, inventaire, regles } };
}

function comparer(session: { bilan: Bilan; entree: EntreeDuCalcul }): { readonly bilan: Bilan; readonly dureeMs: number } {
  const copie = structuredClone(session.entree);
  assert.deepEqual(copie, session.entree, 'structuredClone copie l\'entrée sans perte');
  const debut = performance.now();
  const pur = calculerLeBilanDirect(copie);
  const dureeMs = performance.now() - debut;
  assert.equal(JSON.stringify(structuredClone(pur)), JSON.stringify(session.bilan), 'le bilan du calcul pur égale celui de la session, dans son ordre complet');
  return { bilan: pur, dureeMs };
}

for (const fixture of FIXTURES) {
  test(`parité du calcul pur et de la session : ${fixture.nom}`, async () => {
    const stock = stockageDeRegles(fixture);
    const session = await bilanDeLaSession(portDeLecture(fixture), stock);
    const entree = await entreeDeFixture(fixture, session.bilan.generation);
    assert.deepEqual(entree, session.entree, 'les fixtures donnent l\'entrée que la session a lue');
    comparer(session);
  });
}

test('les fixtures couvrent des groupes, des questions et des renommages', async () => {
  let groupes = 0;
  let questions = 0;
  const distincts = new Set<string>();
  for (const fixture of FIXTURES) {
    const bilan = calculerLeBilanDirect(await entreeDeFixture(fixture));
    distincts.add(JSON.stringify(bilan));
    groupes += bilan.groupes.length;
    questions += bilan.questions.length;
  }
  assert.ok(groupes >= 5, `${groupes} groupes`);
  assert.ok(questions >= 1, `${questions} questions`);
  assert.equal(distincts.size, FIXTURES.length, 'chaque fixture change le bilan');
});

test('le calcul pur mené par tranches rend le même bilan que le calcul direct', async () => {
  const entree = await entreeDeFixture(FIXTURES[2]);
  const pas = calculerLeBilan(entree);
  let cessions = 0;
  for (let etape = pas.next(); ; etape = pas.next()) {
    if (etape.done) {
      assert.equal(JSON.stringify(etape.value), JSON.stringify(calculerLeBilanDirect(entree)));
      break;
    }
    cessions += 1;
  }
  assert.ok(cessions > 0, 'le calcul cède entre ses pas');
});

test('le calcul pur ne tire ni figma, ni le socle d\'interface, ni le journal du mode Tokens', () => {
  const { metafile, outputFiles } = buildSync({
    entryPoints: [join(__dirname, '../src/nomenclature/calcul.ts')],
    bundle: true, write: false, metafile: true, platform: 'browser', target: 'chrome80', logLevel: 'silent',
  });
  // Les chemins du métafichier sont relatifs au dossier du paquet.
  const sources = Object.keys(metafile.inputs).map((entree) => entree.split(sep).join('/'));
  assert.ok(sources.some((entree) => entree.endsWith('src/nomenclature/projection.ts')), 'le bilan vient de la projection');
  const interdits = sources.filter((entree) => /(^|\/)src\/(ui\/|code\.ts$|lecture\.ts$|sandbox\/(?!acquisition\.ts))/.test(entree));
  assert.deepEqual(interdits, [], 'ni interface, ni journal du mode Tokens, ni sandbox');
  const code = outputFiles[0].text.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal(/\bfigma\./.test(code), false, 'aucun appel à l\'objet figma');
});

// Les fichiers du rejeu

const SOURCES = [
  { nom: 'premier fichier', chemin: join(racine, 'docs/notes/Archives/Plugin Architect/1 Architecture globale/Mesures/tokens-slice-exemple.json') },
  { nom: 'second fichier', chemin: join(racine, '..', 'intencial-library/src/tokens/tokens.json') },
];

/** Le port de lecture de Figma que le rejeu simule : une variable par jeton, une collection par racine, aucune protection. */
function fixtureDeRejeu(chemin: string): FixtureDeNomenclature {
  const { catalogue } = catalogueDepuisTokens(JSON.parse(readFileSync(chemin, 'utf8')));
  return {
    nom: 'rejeu',
    collections: catalogue.collections.map((collection) => ({ id: collection.cle, name: collection.nom, modes: collection.modes })),
    variables: catalogue.variables.map((variable) => [variable.cle, variable.nom, variable.collection] as const),
    regles: [{ type: 'ecriture', ecriture: { groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } } }],
  };
}

for (const source of SOURCES) {
  test(`parité du calcul pur et de la session sur le rejeu : ${source.nom}`, { skip: !existsSync(source.chemin) }, async () => {
    const fixture = fixtureDeRejeu(source.chemin);
    const reglesVides = { ...fixture, regles: [] };
    let total = 0;
    for (const variante of [fixture, reglesVides]) {
      const session = await bilanDeLaSession(portDeLecture(variante), stockageDeRegles(variante));
      const { bilan, dureeMs } = comparer(session);
      total += 1;
      console.log(`${source.nom} (${variante.regles.length === 0 ? 'sans règle' : 'écriture choisie'}) : ${variante.variables.length} variables, ${bilan.groupes.length} groupes, ${bilan.questions.length} questions, calcul pur ${Math.round(dureeMs)} ms`);
    }
    assert.equal(total, 2);
  });
}

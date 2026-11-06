/** Le harnais de stress test F1 (noms) : graine reproductible, mutations à une lettre, nombre de cas et squelette sans question. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { nomsSelonLesReglesSync } from '../src/nommage/index.js';
import { lireReglesDeNommage } from '../src/protocoles/nommage.js';
import { LONGUEUR_MINIMALE_D_UNE_FAUTE_A_UNE_LETTRE } from '../src/referentiel/index.js';
import { motConnu } from '../src/referentiel/mots-connus.js';
import { detecterLesQuestions, type DejaJuge } from '../src/referentiel/index.js';
import { distanceUnOuEchange } from '../src/referentiel/termes-connus.js';
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  convertir, DOSSIER_DE_SLICE, fichiersEnFuite, ID_DE_SLICE, lireLesSystemes, motsASurveiller, RACINE_DU_DEPOT, systemeDepuisTokens,
} from './stress/f1-noms/corpus.js';
import { CERTAINES, classer, creerLeContexteDeClassement, lignesAJuger, PLAFOND_A_JUGER, type LigneDeFauxPositif } from './stress/f1-noms/faux-positifs.js';
import { chargerLesClassements, clePaire, creerLeContexteOracle, ECART_SEPARATEUR_SEUL, ECART_SOUS_LE_SEUIL, estSousLeSeuilDeLongueur, juger } from './stress/f1-noms/oracle.js';
import { creerLeDetecteur } from './stress/f1-noms/detecteur.js';
import { executerLesTemoins, executerUnCas, REGLES_FIXES, secondPassage } from './stress/f1-noms/execution.js';
import { mutationsDe, OPERATEURS_DE_FAUTE } from './stress/f1-noms/mutations.js';
import {
  bilanDesScenarios, CAS_DU_PLAN, creerLeContexte, enInventaire, genererLesScenarios, MARGE_DU_PLAN, PAIRES_DISTINCTES_ECRITES, squelette,
} from './stress/f1-noms/scenarios.js';

const contexte = creerLeContexte(lireLesSystemes(), 7001);
const REGLES = lireReglesDeNommage([['ecriture', JSON.stringify({ version: 1, groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } })]])!;
const vide: DejaJuge = { distincts: [], plusTard: [], voulus: [], collectionsGardees: [] };

test('chaque mutation de M-01 à M-05 est à distance 1 de sa source et hors du vocabulaire', () => {
  let total = 0;
  for (const terme of contexte.termesCibles) {
    for (const operateur of OPERATEURS_DE_FAUTE) {
      for (const mutation of mutationsDe(terme, operateur, { graine: 7001, ecarte: contexte.ecarte })) {
        total++;
        assert.ok(distanceUnOuEchange(terme, mutation.mot), `${terme} -> ${mutation.mot} (${operateur}/${mutation.variante})`);
        assert.ok(!contexte.vocabulaire.termes.has(mutation.mot) && !contexte.motsDuDictionnaire.has(mutation.mot), `${mutation.mot} est connu`);
      }
    }
  }
  assert.ok(total > 1300, `${total} mutations`);
});

test('deux exécutions avec la graine 7001 donnent la même empreinte, une autre graine une autre', () => {
  const strates = ['S1', 'S3'];
  const premiere = bilanDesScenarios(contexte, { strates });
  const seconde = bilanDesScenarios(creerLeContexte(lireLesSystemes(), 7001), { strates });
  assert.equal(premiere.empreinte, seconde.empreinte);
  assert.notEqual(bilanDesScenarios({ ...contexte, graine: 7002 }, { strates }).empreinte, premiere.empreinte);
});

test('le nombre de cas des strates rapides tient à 5 % du plan, et chaque identifiant est unique', () => {
  const strates = ['S1', 'S3', 'S4', 'S5', 'S10', 'S12', 'S14', 'S17'];
  const identifiants = new Set<string>();
  const comptes: Record<string, number> = {};
  for (const cas of genererLesScenarios(contexte, { strates })) {
    assert.ok(!identifiants.has(cas.id), `identifiant en double : ${cas.id}`);
    identifiants.add(cas.id);
    comptes[cas.strate] = (comptes[cas.strate] ?? 0) + 1;
    assert.ok(cas.noms.length >= 12 && cas.noms.length <= 45, `${cas.id} compte ${cas.noms.length} noms`);
  }
  for (const strate of strates) {
    const ecart = Math.abs(comptes[strate] - CAS_DU_PLAN[strate]) / CAS_DU_PLAN[strate];
    assert.ok(ecart <= MARGE_DU_PLAN, `${strate} : ${comptes[strate]} cas pour ${CAS_DU_PLAN[strate]} au plan`);
  }
});

test('la liste écrite à la main compte 28 paires de mots différents (E16.6 : lable et solis sont des fautes, rangées en témoins)', () => {
  assert.equal(PAIRES_DISTINCTES_ECRITES.length, 28);
  for (const [a, b] of PAIRES_DISTINCTES_ECRITES) assert.notEqual(a, b);
});

test('chaque paire écrite à la main est à distance 1 et formes.json ne la tient pas pour un même mot', () => {
  const classements = chargerLesClassements();
  for (const [a, b] of PAIRES_DISTINCTES_ECRITES) {
    assert.ok(distanceUnOuEchange(a, b), `${a} / ${b} n'est pas à distance 1`);
    assert.ok(!classements.memeMot.has(clePaire(a, b)), `${a} / ${b} est un même mot selon formes.json`);
  }
});

// S6 n'est pas dans ce test : son générateur calcule les 40 paires du dictionnaire (1,7 s), au-delà du budget de 2 s du fichier
test('le correctif de fréquence : chaque nom répété par S12 et S13 est distinct', () => {
  for (const strate of ['S12', 'S13']) {
    let verifies = 0;
    for (const cas of genererLesScenarios(contexte, { strates: [strate] })) {
      const noms = cas.noms.map((nom) => `${nom.collection}|${nom.nom}`);
      assert.equal(new Set(noms).size, noms.length, `${cas.id} compte des noms en double`);
      const frequence = Number(cas.axes.fb ?? cas.axes.n ?? cas.axes.frequence ?? cas.axes.variables);
      if (frequence === 5 || frequence === 10) {
        assert.ok(noms.length >= 12 + frequence, `${cas.id} : ${noms.length} noms pour la fréquence ${frequence}`);
        if (++verifies === 3) break;
      }
    }
    assert.ok(verifies > 0, `${strate} : aucun cas de fréquence 5 ou 10`);
  }
});

test('P-23 : le squelette seul ne donne ni question ni renommage', () => {
  const cas = { id: 'squelette', noms: squelette(contexte.pool) };
  assert.equal(cas.noms.length, 12);
  const { lexique, indexation, resultat } = nomsSelonLesReglesSync(enInventaire(cas), REGLES, []);
  assert.deepEqual(resultat.renommages.map((renommage) => renommage.nouveauNom), []);
  const { questions, autres } = detecterLesQuestions(lexique, indexation.index, vide, { seuil: 0, maximum: 500 });
  assert.deepEqual([...questions, ...autres].map((question) => question.cle), []);
});

test('le chargeur de seuil réécrit la constante du kit et refuse une ligne qui a changé de forme', async () => {
  const chargeur = (await import(pathToFileURL(join(RACINE_DU_DEPOT, 'packages/kit/tests/stress/f1-noms/seuil.mjs')).href)) as { reecrireLaConstante: (source: string, longueur: number) => string };
  const source = readFileSync(join(RACINE_DU_DEPOT, 'packages/kit/src/referentiel/termes-connus.ts'), 'utf8');
  assert.match(chargeur.reecrireLaConstante(source, 7), /const LONGUEUR_MINIMALE_D_UNE_FAUTE = 7;/);
  assert.match(chargeur.reecrireLaConstante('const LONGUEUR_MINIMALE_D_UNE_FAUTE=5;', 3), /=3;/);
  for (const changee of ['const LONGUEUR_MINIMALE_D_UNE_FAUTE: number = 5;', 'const LONGUEUR_MINIMALE_D_UNE_FAUTE = 2 + 3;', 'const LONGUEUR_MINIMALE = 5;']) {
    assert.throws(() => chargeur.reecrireLaConstante(changee, 3), /a changé de forme/, changee);
  }
});

test('le classement des faux positifs suit les classes du plan', () => {
  const classement = creerLeContexteDeClassement(contexte);
  const passe = { dictionnaireDesAutres: new Set(['tip', 'title', 'tile', 'weight', 'height']), nomsPropres: new Set(['heights']) };
  const classe = (type: Parameters<typeof classer>[0]['type'], signales: string[], references: string[], paire?: [string, string]) => classer({ type, signales, references, paire }, classement, passe).classe;
  assert.equal(classe('synonymes', ['error', 'danger'], [], ['error', 'danger']), 'FP-B', 'synonymes du vocabulaire');
  assert.equal(classe('pluriel', ['color', 'colors'], [], ['color', 'colors']), 'FP-B', 'formes du même mot (formes.json)');
  assert.equal(classe('faute', ['tile'], ['title'], undefined), 'FP-A', 'mot attesté ailleurs');
  assert.equal(classe('faute', ['tip'], ['top'], undefined), 'FP-A');
  assert.equal(classe('faute', ['heights'], ['height']), 'FP-C', 'nom propre');
  assert.equal(classe('faute', ['backgrond'], ['background']), 'FP-D', 'mot attesté dans ce seul système');
  assert.equal(classe('renommage-ecriture', [], []), 'FP-B');
  assert.equal(classe('collection', ['tokens'], []), 'FP-B');
  assert.deepEqual([...CERTAINES].sort(), ['FP-A', 'FP-C']);
});

test('a-juger.csv garde 200 lignes au plus, les mieux notées, une par système et par mot', () => {
  const ligne = (rang: number, passe: string): LigneDeFauxPositif => ({ passe, systeme: `s${rang % 7}`, type: 'faute', classe: 'FP-D', score: rang % 13, mot: `mot${rang}`, reference: 'ref', nombre: 1, exemples: [], motif: '' });
  const lignes = Array.from({ length: 700 }, (_, rang) => ligne(rang, `s${rang % 7}/a`)).concat(Array.from({ length: 50 }, (_, rang) => ligne(rang, `s${rang % 7}/b`)));
  const rendues = lignesAJuger(lignes);
  assert.equal(rendues.length, PLAFOND_A_JUGER);
  assert.ok(rendues.every((rendue, rang) => rang === 0 || (rendues[rang - 1].score ?? 0) >= (rendue.score ?? 0)));
  assert.equal(new Set(rendues.map((rendue) => `${rendue.systeme}|${rendue.mot}`)).size, rendues.length);
});

// Slice (lot 5) : les noms ci-dessous sont inventés ; aucun ne vient du fichier client.
const TOKENS_INVENTES = {
  zorblax: { couleur: { fond: { $type: 'color', $value: '#ffffff' }, bord: { $type: 'color', $value: '{zorblax.couleur.fond}' } }, $description: 'ignoré' },
  quimbus: { texte: { corps: { $type: 'color', $value: '{zorblax.couleur.bord}' }, ombre: { $type: 'shadow', $value: { x: 1 } }, perdu: { $type: 'color', $value: '{zorblax.absent.rien}' } } },
  vide: {},
};

test('Slice : chaque racine est une collection et les alias renseignent cibleAlias', () => {
  const systeme = systemeDepuisTokens(ID_DE_SLICE, TOKENS_INVENTES);
  assert.deepEqual(systeme.noms.map((nom) => `${nom.collection}|${nom.nom}`), ['zorblax|couleur/fond', 'zorblax|couleur/bord', 'quimbus|texte/corps', 'quimbus|texte/ombre', 'quimbus|texte/perdu']);
  const converti = convertir(systeme, 'points', 'couche');
  const variables = converti.inventaire.entrees.filter((entree) => entree.nom.categorie === 'variables');
  assert.deepEqual(variables.map((entree) => entree.contexte?.collection), ['zorblax', 'zorblax', 'quimbus', 'quimbus', 'quimbus']);
  assert.deepEqual(variables.map((entree) => entree.nom.cibleAlias), [undefined, `${ID_DE_SLICE}:0`, `${ID_DE_SLICE}:1`, undefined, undefined], 'une cible absente du fichier ne donne pas d\'alias');
  assert.equal(converti.inventaire.entrees.filter((entree) => entree.nom.categorie === 'collections').length, 2, 'une racine sans jeton n\'est pas une collection');
});

test('Slice : le contrôle de fuite retient les mots inconnus de 5 lettres ou plus et les trouve comme mots entiers', () => {
  const systeme = systemeDepuisTokens(ID_DE_SLICE, TOKENS_INVENTES);
  const mots = motsASurveiller(systeme, (mot) => ['couleur', 'texte', 'corps', 'ombre', 'perdu'].includes(mot));
  assert.deepEqual(mots, ['quimbus', 'zorblax']);
  const fichiers: Record<string, string> = { 'a.md': 'le Zorblax est un mot', 'b.ts': 'const quimbusBrand = 1;', 'c.md': 'rien ici', 'd.md': 'zorb et quim', 'e.bin': '' };
  assert.deepEqual(fichiersEnFuite(mots, Object.keys(fichiers), (fichier) => (fichier === 'e.bin' ? undefined : fichiers[fichier])), ['a.md', 'b.ts']);
  const blocs = motsASurveiller(systemeDepuisTokens(ID_DE_SLICE, { racine: { quimbusBrand: { $value: '1' } } }), () => false);
  assert.ok(blocs.includes('quimbusbrand') && blocs.includes('quimbus') && blocs.includes('brand'), 'le segment en casse mixte entre aussi sans casse');
  assert.deepEqual(fichiersEnFuite(blocs, ['f.md'], () => 'quimbusbrand'), ['f.md']);
});

test('Slice : sans --slice, rien du harnais n\'ouvre le fichier', () => {
  const dossier = join(RACINE_DU_DEPOT, 'packages/kit/tests/stress/f1-noms');
  const sources = readdirSync(dossier).filter((fichier) => fichier.endsWith('.ts')).map((fichier) => [fichier, readFileSync(join(dossier, fichier), 'utf8')] as const);
  for (const [fichier, source] of sources) {
    if (fichier !== 'corpus.ts') assert.ok(!/slice-exemple|lireLaSlice/.test(source) || fichier === 'index.ts', `${fichier} cite le fichier Slice`);
  }
  const index = sources.find(([fichier]) => fichier === 'index.ts')![1];
  const usages = index.split('\n').filter((ligne) => /lireLaSlice\(|CHEMIN_DE_SLICE_PAR_DEFAUT/.test(ligne) && !ligne.startsWith('  bilanDuCorpus'));
  assert.equal(usages.length, 3, 'deux appels de main et la lecture de verifierLaFuite');
  assert.ok(usages.every((ligne) => /options\.(slice|verifierFuite)|function verifierLaFuite|const slice = lireLaSlice\(chemin\)/.test(ligne)), 'chaque lecture suit --slice ou --verifier-fuite');
  assert.ok(!lireLesSystemes().some((systeme) => systeme.id === ID_DE_SLICE), 'le corpus ne contient pas Slice');
});

test('Slice : toutes les sorties vont sous _local/stress/f1-noms/slice/, que Git ignore', () => {
  assert.equal(DOSSIER_DE_SLICE, join(RACINE_DU_DEPOT, '_local/stress/f1-noms/slice'));
  const ignore = spawnSync('git', ['check-ignore', '-q', join(DOSSIER_DE_SLICE, 'rapport.md')], { cwd: RACINE_DU_DEPOT });
  assert.equal(ignore.status, 0);
});

const CAMEL = lireReglesDeNommage([['ecriture', JSON.stringify({ version: 1, groupes: { casse: 'camelCase', separateur: 'camelCase' }, variables: { casse: 'camelCase', separateur: 'camelCase' } })]])!;
const inventaireDe = (noms: string[]) => enInventaire({ id: 'p21', noms: noms.map((nom) => ({ collection: 'theme', nom })) } as Parameters<typeof enInventaire>[0]);

test('P-21 : un second passage ne renomme rien quand un mot ne commence pas par une lettre (N-01)', () => {
  const passage = secondPassage(inventaireDe(['mixins/toolbar/@media (orientation: landscape)/min-height']), CAMEL);
  assert.deepEqual(passage.renommages.map((renommage) => renommage.nouveauNom), []);
  assert.deepEqual([passage.nouvelles, passage.revelees], [[], []]);
});

test('P-21 : une question que le renommage fait naître est révélée, pas nouvelle (N-01)', () => {
  const passage = secondPassage(inventaireDe(['codeMirror-lines-bgColor', 'diffBlob-additionLine-bgColor', 'diffBlob-additionLine-fgColor']), REGLES_FIXES);
  assert.deepEqual(passage.renommages, []);
  assert.deepEqual(passage.nouvelles, []);
  assert.deepEqual(passage.revelees, ['paire:line|lines']);
});

test('S8 : la casse ne change aucun verdict ; une faute d’un mot connu ou de moins de quatre lettres n’est pas attendue (N-03, E15)', () => {
  const detecteur = creerLeDetecteur(contexte.vocabulaire, contexte.motsDuDictionnaire);
  const ctx = creerLeContexteOracle(contexte, detecteur, chargerLesClassements());
  const parTerme = new Map<string, Map<string, string>>();
  for (const cas of genererLesScenarios(contexte, { strates: ['S8'] })) {
    if (cas.axes.part !== '10/20' || cas.axes.type !== 'variable') continue;
    if (parTerme.size >= 12 && !parTerme.has(cas.terme)) break;
    const [verdict] = juger(cas, executerUnCas(cas), ctx);
    const faute = cas.axes.nature === 'fautif';
    if (!faute) assert.equal(verdict.issue, 'ok', `${cas.id} : ${verdict.detail}`);
    else if (estSousLeSeuilDeLongueur(verdict.mot ?? '', detecteur)) assert.equal(verdict.role, 'informatif', cas.id);
    else assert.equal(verdict.issue, 'detecte', `${cas.id} : ${verdict.detail}`);
    if (faute) parTerme.set(cas.terme, (parTerme.get(cas.terme) ?? new Map()).set(String(cas.axes.casse), `${verdict.role}/${verdict.issue}`));
  }
  assert.equal(parTerme.size, 12);
  const lectures = new Set([...parTerme.values()].flatMap((parCasse) => [...parCasse.values()]));
  assert.deepEqual([...lectures].sort(), ['oracle/detecte'], 'E15 : de 4 lettres au moins, chaque terme de l’échantillon est détecté');
  for (const [terme, parCasse] of parTerme) assert.equal(new Set(parCasse.values()).size, 1, `${terme} : ${[...parCasse].join(', ')}`);
  assert.deepEqual([...[...parTerme.values()][0].keys()].sort(), ['initiale', 'interne', 'majuscules', 'pascal']);
});

// E14.2 : l'oracle suit les décisions écrites de E2 ; chaque test fixe une décision citée dans oracle.ts.

let contexteDeLOracle: ReturnType<typeof creerLeContexteOracle> | undefined;
function verdictsDe(strate: string, retenir: (id: string) => boolean) {
  contexteDeLOracle ??= creerLeContexteOracle(contexte, creerLeDetecteur(contexte.vocabulaire, contexte.motsDuDictionnaire), chargerLesClassements());
  const ctx = contexteDeLOracle;
  const cas = [...genererLesScenarios(contexte, { strates: [strate] })].filter((unCas) => retenir(unCas.id));
  assert.ok(cas.length > 0, `aucun cas ${strate}`);
  return cas.flatMap((unCas) => juger(unCas, executerUnCas(unCas), ctx));
}

test('Q-F4, E15, E16.2 : une faute d’une lettre est mesurée, jamais jugée, sous trois lettres, pour un mot connu ou à une lettre de plusieurs termes ; sinon elle est attendue (S1)', () => {
  const detecteur = creerLeDetecteur(contexte.vocabulaire, contexte.motsDuDictionnaire);
  const sous = verdictsDe('S1', (id) => id.startsWith('S1/M-03/big/') && id.includes('/m=1/k=8/') && !id.includes('variante=ajout'));
  assert.ok(sous.length > 0);
  const trois = verdictsDe('S1', (id) => id.includes('/m=1/k=8/')).filter((v) => [...(v.mot ?? '')].length === 3);
  assert.ok(trois.length > 100, `${trois.length} mutants de 3 lettres`);
  assert.ok(trois.every((v) => (v.role === 'informatif') === (motConnu(v.mot!) || detecteur.termesProches(v.mot!).length !== 1)), 'à 3 lettres, seul un mutant connu ou à une lettre de plusieurs termes reste informatif');
  assert.ok(trois.every((v) => v.role !== 'informatif' || v.ecarts.length === 0 || v.ecarts.includes(ECART_SOUS_LE_SEUIL)));
  assert.ok(trois.some((v) => v.role === 'oracle' && v.issue === 'detecte'), 'au moins un mutant de 3 lettres est attendu et détecté');
  const quatre = verdictsDe('S1', (id) => id.startsWith('S1/M-03/size/') && id.includes('/m=1/k=8/'));
  assert.ok(quatre.every((v) => v.role === 'oracle' && v.issue === 'detecte'), quatre.map((v) => v.detail).join(' ; '));
  const mots = verdictsDe('S1', (id) => id.includes('/m=1/k=8/')).filter((v) => [...(v.mot ?? '')].length >= 4 && [...(v.mot ?? '')].length < LONGUEUR_MINIMALE_D_UNE_FAUTE_A_UNE_LETTRE);
  assert.ok(mots.length > 100, `${mots.length} mutants de 4 à 6 lettres`);
  assert.ok(mots.every((v) => (v.role === 'informatif') === motConnu(v.mot!)), 'seul un mutant connu reste informatif');
  const au_dessus = verdictsDe('S1', (id) => id.startsWith('S1/M-03/background/') && id.includes('/m=1/k=8/'));
  assert.ok(au_dessus.every((v) => v.role === 'oracle' && v.issue === 'detecte'), au_dessus.map((v) => v.detail).join(' ; '));
});

test('les cas du plan sortent comme les décisions de E2 les attendent', () => {
  const detecteur = creerLeDetecteur(contexte.vocabulaire, contexte.motsDuDictionnaire);
  const temoins = executerLesTemoins(contexte, creerLeContexteOracle(contexte, detecteur, chargerLesClassements()));
  assert.equal(temoins.length, 8);
  for (const temoin of temoins) assert.ok(temoin.conforme, `${temoin.nom} : ${temoin.verdict?.detail}`);
  assert.deepEqual(temoins.filter((temoin) => temoin.verdict?.issue === 'manque').map((temoin) => temoin.nom.split(' ')[0]), [], 'E15 : `bordre` et `paddng`, six lettres, sont lus');
});

test('E16.4 : etat, état et states se renomment en state dans une variable, status reste un mot à part, et fontfamily près de font-family est une collision de séparateur', () => {
  const axes = verdictsDe('S5', (id) => id.includes('axes-etat:'));
  assert.ok(axes.length > 0 && axes.every((v) => v.role === 'oracle' && v.issue === 'detecte'), axes.filter((v) => v.issue !== 'detecte').map((v) => v.detail).join(' ; '));
  assert.ok(![...genererLesScenarios(contexte, { strates: ['S5'] })].some((cas) => cas.id.includes('axes-etat:status/')), 'status n’est plus une forme tolérée de state');
  const lettres = verdictsDe('S6', (id) => id.includes('tolere:familles-primitives:fontfamily|font-family/parente=freres'));
  assert.ok(lettres.every((v) => v.role === 'informatif' && v.ecarts.includes(ECART_SEPARATEUR_SEUL)));
});

test('E16.8 : un mot collé dont une partie est un terme de composant donne la question de mot collé (S10)', () => {
  const composant = verdictsDe('S10', (id) => /^S10[/]M-14[/][^/]*(padding|width|height|gap)[^/]*[/]/.test(id));
  assert.ok(composant.length >= 10, `${composant.length} verdicts`);
  assert.ok(composant.every((v) => v.role === 'oracle' && v.issue === 'detecte'), composant.filter((v) => v.issue !== 'detecte').map((v) => v.detail).join(' ; '));
});

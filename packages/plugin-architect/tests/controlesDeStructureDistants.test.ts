/**
 * G6.1 et G6.3, les contrôles de structure du mode Tokens hors du sandbox. Sur des catalogues fabriqués et sur les deux fichiers du rejeu
 * (`npm run stress:rejeu`), les constats de `controlerLeCatalogue` et de `controlerLIntegriteUcm` que le Worker rend égalent ceux du kit appelé
 * directement, dans leur ordre : le travail passe par le port du sandbox, le client de l'écran et `servirLesCalculs`, comme dans le plugin, avec
 * une copie JSON à chaque pont. Le sandbox se replie sur son propre calcul sans Worker, après chaque cause de repli et après une réponse qu'il ne
 * sait pas lire. Le Worker réel se joue dans Chromium (`tests/interface/controlesDeStructureDistants.test.mjs`). Les tests comptent et
 * n'écrivent aucun nom du fichier du rejeu.
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';
import test from 'node:test';
import { buildSync } from 'esbuild';

import { controlerLIntegriteUcm, controlerLeCatalogue, type CatalogueDeReference, type Constat } from '@ucm-kit/core/controles';
import { VARIABLES_DE_PALETTE, VARIABLES_DU_THEME } from '@ucm-kit/core/emplois';
import type { EcritureChoisie } from '@ucm-kit/core/protocoles';

import { catalogueDepuisTokens } from '../../kit/tests/stress/rejeu-fichiers/dtcg';
import type { PassageANoter } from '../src/lecture';
import {
  estCalculDesNoms, estReponseDuCalculDesNoms, type MessageDeCalculDesNoms, type ReponseDuCalculDesNoms, type TravailDesNoms,
} from '../src/messages/calculDesNoms';
import { creerAtelier } from '../src/nomenclature/atelier';
import { controlerEtMesurer, controlerLeCatalogueEtLIntegrite, type EntreeDesControles } from '../src/nomenclature/controlesDeStructure';
import { DELAI_DES_CONTROLES_DISTANTS, DEMANDES_DE_CONTROLE, creerControlesDistants } from '../src/nomenclature/controlesDistants';
import { creerPortDistant, type IssueDuCalculDistant, type PortDeCalculDistant } from '../src/nomenclature/distant';
import { creerCalculateurDeNoms, type TravailleurDeNoms } from '../src/ui/nomenclature/calculDesNoms';
import { servirLesCalculs, type ReponseDuTravailleur, type RequeteDuTravailleur } from '../src/ui/nomenclature/calculDesNomsWorker';
import { fabriquerUnCatalogue } from './aides/cataloguesDeCroissance';
import { FIXTURES, entreeDeFixture } from './outils/fixturesDeNomenclature';

const racine = join(__dirname, '..', '..', '..');
const ECRITURE: EcritureChoisie = { groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } };
const texte = (valeur: unknown): string => JSON.stringify(valeur);

/** Un Worker relié à `servirLesCalculs` sans navigateur : chaque message traverse une copie JSON dans les deux sens. */
function travailleurRelie(): TravailleurDeNoms {
  const portee = {
    postMessage: (message: ReponseDuTravailleur) => { travailleur.onmessage?.({ data: JSON.parse(JSON.stringify(message)) as ReponseDuTravailleur }); },
    onmessage: null as null | ((evenement: { data: RequeteDuTravailleur }) => void),
  };
  let demarre = false;
  const travailleur: TravailleurDeNoms = {
    postMessage(message) {
      if (!demarre) {
        demarre = true;
        servirLesCalculs(portee);
      }
      portee.onmessage?.({ data: JSON.parse(JSON.stringify(message)) as RequeteDuTravailleur });
    },
    terminate() {},
    onmessage: null,
    onerror: null,
    onmessageerror: null,
  };
  return travailleur;
}

interface Chaine {
  readonly port: ReturnType<typeof creerPortDistant>;
  readonly envoyes: MessageDeCalculDesNoms[];
  readonly planifies: { rappel: () => void; ms: number; annule: boolean }[];
}

/** Le sandbox, l'écran et le Worker reliés comme dans le plugin : le port envoie à l'écran, qui répond au port. */
function chaine(options: { fabriquer?: () => TravailleurDeNoms | null } = {}): Chaine {
  const envoyes: MessageDeCalculDesNoms[] = [];
  const planifies: Chaine['planifies'] = [];
  const port = creerPortDistant({
    revision: () => 'r',
    envoyer: (message) => { envoyes.push(message); calculateur.recevoir(JSON.parse(JSON.stringify(message)) as MessageDeCalculDesNoms); },
    planifier: (rappel, ms) => { const p = { rappel, ms, annule: false }; planifies.push(p); return () => { p.annule = true; }; },
  });
  const calculateur = creerCalculateurDeNoms({
    envoyer: (reponse: ReponseDuCalculDesNoms) => { port.recevoir(JSON.parse(JSON.stringify(reponse)) as ReponseDuCalculDesNoms); },
    fabriquer: options.fabriquer ?? travailleurRelie,
  });
  return { port, envoyes, planifies };
}

const sansDoublon = (constats: readonly Constat[]): Constat[] => {
  const vus = new Set<string>();
  return constats.filter((constat) => !vus.has(constat.id) && vus.add(constat.id));
};

// Les catalogues

interface Source { readonly nom: string; readonly catalogue: CatalogueDeReference }

/** Un catalogue UCM sans collection `theme` lue, un fichier libre et un fichier où des scopes et des alias de mode manquent. */
function catalogueSansTheme(): CatalogueDeReference {
  const base = fabriquerUnCatalogue(5, { palettes: 2, crans: 3, partManquante: 0 });
  return { ...base, collections: base.collections.filter((collection) => collection.role !== 'theme') };
}
function catalogueLibre(): CatalogueDeReference {
  const base = fabriquerUnCatalogue(6, { palettes: 2, crans: 3, partManquante: 0.2 });
  return { ...base, collections: base.collections.map((collection) => ({ ...collection, role: null })) };
}

const FABRIQUES: readonly Source[] = [
  { nom: 'palettes complètes', catalogue: fabriquerUnCatalogue(1, { palettes: 3, crans: 5, partManquante: 0 }) },
  { nom: 'alias en partie manquants', catalogue: fabriquerUnCatalogue(2, { palettes: 4, crans: 6, partManquante: 0.3 }) },
  { nom: 'tous les alias manquants', catalogue: fabriquerUnCatalogue(3, { palettes: 2, crans: 4, partManquante: 1 }) },
  { nom: 'beaucoup de palettes', catalogue: fabriquerUnCatalogue(4, { palettes: 12, crans: 8, partManquante: 0.1 }) },
  { nom: 'sans collection theme', catalogue: catalogueSansTheme() },
  { nom: 'fichier libre', catalogue: catalogueLibre() },
  { nom: 'fichier vide', catalogue: { version: 1, library: null, collections: [], variables: [] } },
];

const REJEU: readonly { readonly nom: string; readonly chemin: string }[] = [
  { nom: 'premier fichier du rejeu', chemin: join(racine, 'docs/notes/Archives/Plugin Architect/1 Architecture globale/Mesures/tokens-slice-exemple.json') },
  { nom: 'second fichier du rejeu', chemin: join(racine, '..', 'intencial-library/src/tokens/tokens.json') },
];
const lireLeRejeu = (chemin: string): CatalogueDeReference => catalogueDepuisTokens(JSON.parse(readFileSync(chemin, 'utf8'))).catalogue;

/** Les réglages que le sandbox lit : aucun, l'écriture choisie, l'écriture et des rôles ignorés. */
const REGLAGES: readonly { readonly nom: string; readonly ecriture: EcritureChoisie | null; readonly roles: readonly (typeof VARIABLES_DU_THEME)[number][] }[] = [
  { nom: 'sans écriture', ecriture: null, roles: [] },
  { nom: 'écriture choisie', ecriture: ECRITURE, roles: [] },
  { nom: 'écriture choisie et deux rôles ignorés', ecriture: ECRITURE, roles: [VARIABLES_DE_PALETTE[0], VARIABLES_DE_PALETTE[1]] },
];

/** Ce que le kit rend appelé directement, sans copie : la référence de chaque comparaison. */
const direct = ({ catalogue, ecriture, roles }: EntreeDesControles) => ({
  catalogue: controlerLeCatalogue(catalogue),
  integrite: controlerLIntegriteUcm(catalogue, { ecriture, rolesIgnores: [...roles] }),
});

async function parLeWorker(entree: EntreeDesControles, demande = 1) {
  const { port, envoyes } = chaine();
  const passages: PassageANoter[] = [];
  const controles = creerControlesDistants({ port, noter: (passage) => passages.push(passage) });
  return { issue: await controles.controler(demande, entree), passages, envoyes };
}

// La parité

for (const source of FABRIQUES) {
  for (const reglage of REGLAGES) {
    test(`le Worker rend les constats du kit, dans leur ordre : ${source.nom}, ${reglage.nom}`, async () => {
      const entree: EntreeDesControles = { catalogue: source.catalogue, ecriture: reglage.ecriture, roles: reglage.roles };
      assert.deepEqual(structuredClone(entree), entree, 'structuredClone copie l\'entrée sans perte');
      const attendu = direct(entree);
      const { issue, envoyes } = await parLeWorker(entree);
      assert.equal(issue.voie, 'worker');
      assert.equal(issue.repli, undefined);
      assert.equal(texte(issue.constats.catalogue), texte(attendu.catalogue), 'controlerLeCatalogue');
      assert.equal(texte(issue.constats.integrite), texte(attendu.integrite), 'controlerLIntegriteUcm');
      assert.equal(envoyes.length, 1);
      assert.equal(envoyes[0].travail.sorte, 'controler');
      assert.deepEqual(structuredClone(envoyes[0]), envoyes[0], 'le message porte un objet que structuredClone copie sans perte');
      assert.equal(texte(structuredClone(attendu)), texte(attendu), 'les constats se copient sans perte');
    });
  }
}

test('les catalogues fabriqués couvrent les deux contrôles et plusieurs codes', () => {
  const codes = new Set<string>();
  let deCatalogue = 0;
  let dIntegrite = 0;
  for (const { catalogue } of FABRIQUES) {
    const rendus = direct({ catalogue, ecriture: ECRITURE, roles: [] });
    deCatalogue += rendus.catalogue.length;
    dIntegrite += rendus.integrite.length;
    for (const constat of [...rendus.catalogue, ...rendus.integrite]) codes.add(constat.code);
  }
  assert.ok(deCatalogue > 0, `${deCatalogue} constats de controlerLeCatalogue`);
  assert.ok(dIntegrite > 0, `${dIntegrite} constats de controlerLIntegriteUcm`);
  assert.ok(codes.size >= 2, `codes : ${[...codes].join(', ')}`);
});

for (const source of REJEU) {
  test(`le Worker rend les constats du kit sur ${source.nom}`, { skip: !existsSync(source.chemin) }, async () => {
    const catalogue = lireLeRejeu(source.chemin);
    for (const reglage of REGLAGES) {
      const entree: EntreeDesControles = { catalogue, ecriture: reglage.ecriture, roles: reglage.roles };
      const attendu = direct(entree);
      const { issue } = await parLeWorker(entree);
      assert.equal(issue.voie, 'worker');
      assert.equal(texte(issue.constats.catalogue), texte(attendu.catalogue), `controlerLeCatalogue, ${reglage.nom}`);
      assert.equal(texte(issue.constats.integrite), texte(attendu.integrite), `controlerLIntegriteUcm, ${reglage.nom}`);
      assert.equal(texte(sansDoublon([...issue.constats.catalogue, ...issue.constats.integrite])), texte(sansDoublon([...attendu.catalogue, ...attendu.integrite])), 'la liste sans doublon du sandbox');
    }
    const entree: EntreeDesControles = { catalogue, ecriture: ECRITURE, roles: [] };
    const attendu = direct(entree);
    const octets = texte({ type: 'calcul-des-noms', travail: { sorte: 'controler', entree } }).length;
    const debut = performance.now();
    controlerLeCatalogueEtLIntegrite(structuredClone(entree));
    const dureeMs = performance.now() - debut;
    console.log(`${source.nom} : ${catalogue.variables.length} variables, message de ${octets} octets, ${attendu.catalogue.length} constats de catalogue, ${attendu.integrite.length} d'intégrité, contrôles sous Node ${Math.round(dureeMs)} ms`);
  });
}

test('un contrôle de structure et un calcul des noms se suivent dans le même atelier sans mélanger leurs états', async () => {
  const atelier = creerAtelier();
  const noms = atelier.executer({ sorte: 'calculer', entree: JSON.parse(JSON.stringify(await entreeDeFixture(FIXTURES[1], 1))) }, 1);
  assert.equal(noms.sorte, 'bilan');
  const entree: EntreeDesControles = { catalogue: FABRIQUES[1].catalogue, ecriture: ECRITURE, roles: [] };
  const controles = atelier.executer({ sorte: 'controler', entree }, 99);
  assert.equal(controles.sorte, 'constats');
  assert.equal(texte({ catalogue: controles.sorte === 'constats' ? controles.catalogue : null, integrite: controles.sorte === 'constats' ? controles.integrite : null }), texte(direct(entree)));
  const lecture = atelier.executer({ sorte: 'lire', lecture: { type: 'fiche', demande: 1, generation: 1, terme: 'quux' } }, 1);
  assert.equal(lecture.sorte, 'message', 'la génération des noms reste lisible après un contrôle');
});

// Le protocole

test('le travail et la réponse de contrôle passent les contrôles de forme du protocole', async () => {
  const entree: EntreeDesControles = { catalogue: FABRIQUES[0].catalogue, ecriture: null, roles: [] };
  const message: MessageDeCalculDesNoms = { type: 'calcul-des-noms', demande: 7, generation: 7, revision: 'r', envoyeA: 1, travail: { sorte: 'controler', entree } };
  assert.equal(estCalculDesNoms(message), true);
  const mesure = controlerEtMesurer(entree);
  const resultat = { sorte: 'constats' as const, ...mesure };
  const reponse = { type: 'noms-calcules' as const, demande: 7, generation: 7, revision: 'r', resultat, mesure: { recuA: 1, demarrage: false, travailleurRecuA: 2, calculDebutA: 2, calculFinA: 3 } };
  assert.equal(estReponseDuCalculDesNoms(reponse), true);
  assert.equal(estReponseDuCalculDesNoms({ ...reponse, resultat: { sorte: 'constats', catalogue: [], integrite: {} , heures: mesure.heures } }), false, 'des listes sont attendues');
  assert.equal(estReponseDuCalculDesNoms({ ...reponse, resultat: { sorte: 'constats', catalogue: [], integrite: [] } }), false, 'les heures sont attendues');
});

test('les heures de chaque contrôle se suivent et couvrent le travail', () => {
  const heure = (() => { let t = 100; return () => (t += 5); })();
  const { heures } = controlerEtMesurer({ catalogue: FABRIQUES[0].catalogue, ecriture: null, roles: [] }, heure);
  assert.deepEqual(heures, { catalogue: { debut: 105, fin: 110 }, integrite: { debut: 110, fin: 115 } });
});

// La voie de repli

const MESURE = { recuA: 11, demarrage: true, travailleurRecuA: 14, calculDebutA: 14, calculFinA: 20 };

/** Un port dont la réponse est celle du test. */
const portImpose = (reponse: () => IssueDuCalculDistant | Promise<IssueDuCalculDistant>, vus: { demande: number; generation: number; delai?: number }[] = []): PortDeCalculDistant => ({
  calculer: ({ demande, generation, delai }) => {
    vus.push({ demande, generation, delai });
    return { issue: Promise.resolve(reponse()), annuler() {} };
  },
});

const ENTREE_DE_REPLI: EntreeDesControles = { catalogue: FABRIQUES[1].catalogue, ecriture: ECRITURE, roles: [] };

test('sans port, le sandbox mène les contrôles lui-même, sans repli', async () => {
  const passages: PassageANoter[] = [];
  const issue = await creerControlesDistants({ port: null, noter: (p) => passages.push(p) }).controler(4, ENTREE_DE_REPLI);
  assert.equal(issue.voie, 'sandbox');
  assert.equal(issue.repli, undefined);
  assert.equal(texte(issue.constats), texte(direct(ENTREE_DE_REPLI)));
  assert.deepEqual(passages.map((p) => [p.phase, p.voie, p.repli, p.demande]), [['controler-le-catalogue', 'sandbox', undefined, 4], ['controler-l-integrite', 'sandbox', undefined, 4]]);
});

for (const cause of ['indisponible', 'demarrage', 'echec', 'delai'] as const) {
  test(`une réponse de repli « ${cause} » donne les mêmes constats, calculés dans le sandbox`, async () => {
    const passages: PassageANoter[] = [];
    const issue = await creerControlesDistants({ port: portImpose(() => ({ type: 'repli', cause })), noter: (p) => passages.push(p) }).controler(2, ENTREE_DE_REPLI);
    assert.equal(issue.voie, 'sandbox');
    assert.equal(issue.repli, cause);
    assert.equal(texte(issue.constats), texte(direct(ENTREE_DE_REPLI)));
    assert.deepEqual(passages.map((p) => [p.phase, p.voie, p.repli]), [['controler-le-catalogue', 'sandbox', cause], ['controler-l-integrite', 'sandbox', cause]]);
  });
}

test('un port qui lève, une requête annulée et un résultat d\'une autre sorte se replient en `echec`', async () => {
  const autres: PortDeCalculDistant[] = [
    { calculer: () => { throw new Error('envoi impossible'); } },
    portImpose(() => ({ type: 'annule' })),
    portImpose(() => ({ type: 'calcule', resultat: { sorte: 'perimee' }, mesure: MESURE, envoyeA: 10, recuA: 21 })),
    portImpose(() => Promise.reject(new Error('rejetée'))),
  ];
  for (const port of autres) {
    const issue = await creerControlesDistants({ port, noter: () => {} }).controler(2, ENTREE_DE_REPLI);
    assert.equal(issue.voie, 'sandbox');
    assert.equal(issue.repli, 'echec');
    assert.equal(texte(issue.constats), texte(direct(ENTREE_DE_REPLI)));
  }
});

test('le Worker qui ne démarre pas jette ses requêtes : le sandbox rend les mêmes constats, et le client ne réessaie pas', async () => {
  const { port } = chaine({ fabriquer: () => null });
  const controles = creerControlesDistants({ port, noter: () => {} });
  for (const demande of [1, 2]) {
    const issue = await controles.controler(demande, ENTREE_DE_REPLI);
    assert.deepEqual([issue.voie, issue.repli], ['sandbox', 'indisponible']);
    assert.equal(texte(issue.constats), texte(direct(ENTREE_DE_REPLI)));
  }
});

test('un Worker muet se replie au délai des contrôles, bien avant celui du calcul des noms', async () => {
  const planifies: { rappel: () => void; ms: number }[] = [];
  const muet = creerPortDistant({ envoyer: () => {}, revision: () => 'r', planifier: (rappel, ms) => { planifies.push({ rappel, ms }); return () => {}; } });
  const attente = creerControlesDistants({ port: muet, noter: () => {} }).controler(1, ENTREE_DE_REPLI);
  assert.deepEqual(planifies.map((p) => p.ms), [DELAI_DES_CONTROLES_DISTANTS]);
  assert.ok(DELAI_DES_CONTROLES_DISTANTS < 120_000);
  planifies[0].rappel();
  const issue = await attente;
  assert.deepEqual([issue.voie, issue.repli], ['sandbox', 'delai']);
  assert.equal(texte(issue.constats), texte(direct(ENTREE_DE_REPLI)));
});

// La demande, la génération et la révision

test('la requête porte un numéro au-delà de ceux de Nomenclature, la génération de la demande de structure et la révision du sandbox', async () => {
  const vus: { demande: number; generation: number; delai?: number }[] = [];
  await creerControlesDistants({ port: portImpose(() => ({ type: 'repli', cause: 'echec' }), vus), noter: () => {} }).controler(9, ENTREE_DE_REPLI);
  assert.deepEqual(vus, [{ demande: DEMANDES_DE_CONTROLE + 9, generation: 9, delai: DELAI_DES_CONTROLES_DISTANTS }]);
  const { port, envoyes } = chaine();
  await creerControlesDistants({ port, noter: () => {} }).controler(9, ENTREE_DE_REPLI);
  assert.deepEqual([envoyes[0].demande, envoyes[0].generation, envoyes[0].revision], [DEMANDES_DE_CONTROLE + 9, 9, 'r']);
});

test('un calcul des noms et un contrôle de même numéro de demande attendent ensemble sans se croiser', async () => {
  const { port } = chaine();
  const noms = await entreeDeFixture(FIXTURES[1], 3);
  const controles = creerControlesDistants({ port, noter: () => {} });
  const bilan = port.calculer({ demande: 5, generation: 3, travail: { sorte: 'calculer', entree: JSON.parse(JSON.stringify(noms)) } as TravailDesNoms });
  const rendus = await Promise.all([bilan.issue, controles.controler(5, ENTREE_DE_REPLI)]);
  const [issueDesNoms, issueDesControles] = rendus;
  assert.equal(issueDesNoms.type, 'calcule');
  assert.equal(issueDesNoms.type === 'calcule' ? issueDesNoms.resultat.sorte : '', 'bilan');
  assert.equal(issueDesControles.voie, 'worker');
  assert.equal(texte(issueDesControles.constats), texte(direct(ENTREE_DE_REPLI)));
});

test('le journal des contrôles par le Worker note le transfert, le démarrage, chaque contrôle avec sa voie et le retour', async () => {
  const { issue, passages } = await parLeWorker({ catalogue: FABRIQUES[0].catalogue, ecriture: null, roles: [] }, 6);
  assert.equal(issue.voie, 'worker');
  assert.deepEqual(passages.map((p) => [p.phase, p.voie ?? null, p.demande]), [
    ['worker-transfert', null, 6], ['worker-demarrage', null, 6], ['controler-le-catalogue', 'worker', 6], ['controler-l-integrite', 'worker', 6], ['worker-retour', null, 6],
  ]);
  for (const p of passages) assert.ok(p.fin >= p.debut, `${p.phase} : la fin suit le début`);
  const { port } = chaine();
  const suite: PassageANoter[] = [];
  const controles = creerControlesDistants({ port, noter: (p) => suite.push(p) });
  await controles.controler(1, ENTREE_DE_REPLI);
  suite.length = 0;
  await controles.controler(2, ENTREE_DE_REPLI);
  assert.equal(suite.some((p) => p.phase === 'worker-demarrage'), false, 'le Worker déjà démarré ne compte pas de démarrage');
});

// Les imports

test('le module des contrôles et le Worker ne tirent ni figma, ni le socle d\'interface, ni le journal du mode Tokens', () => {
  for (const [entree, attendu] of [['src/nomenclature/controlesDeStructure.ts', 'src/nomenclature/controlesDeStructure.ts'], ['src/ui/nomenclature/calculDesNomsWorker.ts', 'src/nomenclature/controlesDeStructure.ts']]) {
    const { metafile, outputFiles } = buildSync({
      entryPoints: [join(__dirname, '..', entree)],
      bundle: true, write: false, metafile: true, platform: 'browser', target: 'chrome80', logLevel: 'silent',
    });
    const sources = Object.keys(metafile.inputs).map((chemin) => chemin.split(sep).join('/'));
    assert.ok(sources.some((chemin) => chemin.endsWith(attendu)), `${entree} tire ${attendu}`);
    const interdits = sources.filter((chemin) => /(^|\/)src\/(code\.ts$|lecture\.ts$|sandbox\/(?!acquisition\.ts)|ui\/(?!nomenclature\/calculDesNomsWorker\.ts))|plugin-socle\/src\/ui\//.test(chemin));
    assert.deepEqual(interdits, [], `${entree} : ni interface, ni journal, ni sandbox`);
    const code = outputFiles[0].text.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.equal(/\bfigma\./.test(code), false, `${entree} : aucun appel à l'objet figma`);
  }
});

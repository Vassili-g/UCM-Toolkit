/**
 * G6.1 et G6.2, le branchement des contrôles de structure dans le sandbox. `lire-structure` envoie les deux contrôles au Worker par le port
 * partagé avec Nomenclature et rend le même message `structure` qu'avec les contrôles menés sur place. L'envoi part sans attendre la fin des
 * contrôles, donc l'inventaire des noms part lui aussi pendant qu'ils tournent. Les contrôles passent avant les autres travaux dans la file du
 * Worker. Une lecture qui commence pendant l'attente des contrôles répond seule.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import type { CatalogueDeReference } from '@ucm-kit/core/controles';
import { VARIABLES_DU_THEME } from '@ucm-kit/core/emplois';

import { cleDUnRoleIgnore } from '../src/ecriture/ignores';
import { oublierLesPassagesDuModeTokens, passagesDuModeTokens } from '../src/lecture';
import type { PluginMessage } from '../src/messages';
import type { MessageDeCalculDesNoms, ReponseDuCalculDesNoms } from '../src/messages/calculDesNoms';
import { controlerLeCatalogueEtLIntegrite } from '../src/nomenclature/controlesDeStructure';
import { creerControlesDistants } from '../src/nomenclature/controlesDistants';
import { creerPortDistant, type IssueDuCalculDistant, type PortDeCalculDistant, type RequeteDistante } from '../src/nomenclature/distant';
import { creerSession } from '../src/nomenclature/session';
import { oublierLAcquisition } from '../src/sandbox/acquisition';
import type { Contexte } from '../src/sandbox/contexte';
import { portDuCalculDistant } from '../src/sandbox/nomenclature';
import { ACCES_AVEC_LE_WORKER, ACCES_DE_FIGMA, oublierLaLectureGardee, traiterAvec, type Acces } from '../src/sandbox/structure';
import { creerCalculateurDeNoms, type TravailleurDeNoms } from '../src/ui/nomenclature/calculDesNoms';
import { servirLesCalculs, type ReponseDuTravailleur, type RequeteDuTravailleur } from '../src/ui/nomenclature/calculDesNomsWorker';
import { fabriquerUnCatalogue } from './aides/cataloguesDeCroissance';
import { FIXTURES, entreeDeFixture, portDeLecture, portDeRegles, stockageDeRegles } from './outils/fixturesDeNomenclature';

const parLePont = <T>(valeur: T): T => JSON.parse(JSON.stringify(valeur)) as T;

type Structure = Extract<PluginMessage, { type: 'structure' }>;

function contexteDeTest() {
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: {} as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument: () => {} };
  const structures = (): Structure[] => envoyes.filter((message): message is Structure => message.type === 'structure');
  return { contexte, envoyes, structures };
}

/** Un fichier où des alias de mode manquent : les contrôles y rendent des constats et des corrections. */
const catalogueAvecDesEcarts = (): CatalogueDeReference => fabriquerUnCatalogue(2, { palettes: 4, crans: 6, partManquante: 0.3 });
/** Un thème dont une variable déclare un mauvais scope : une correction `C63:k-defaut:scopes`. */
const catalogueAvecUnScopeFaux = (): CatalogueDeReference => ({
  version: 1,
  library: null,
  collections: [{ cle: 'C:1', nom: 'theme', role: 'theme', modes: [{ id: 'C:1:light', nom: 'light' }], etat: 'lue' }],
  variables: [{ cle: 'k-defaut', nom: 'success/surface/default', collection: 'C:1', type: 'COLOR', etat: 'presente', scopes: ['TEXT_FILL'], valeurs: { 'C:1:light': { valeur: '#ffffff' } } }],
});
const catalogueSansEcart = (): CatalogueDeReference => fabriquerUnCatalogue(1, { palettes: 3, crans: 5, partManquante: 0 });

function accesSurLeCatalogue(catalogue: () => CatalogueDeReference, controles?: Acces['controles']): Acces {
  return {
    catalogue: async () => catalogue(),
    reglages: async () => ({ ecriture: null, cles: [] }),
    ecrire: async () => ({ ecrites: [], sautees: [], sansAnnulation: [] }),
    rangement: () => ({
      ignorerUnConstat: () => ({ ecrit: false, cles: [], motif: 'erreur' }),
      nePlusIgnorer: () => ({ ecrit: false, cles: [], motif: 'erreur' }),
      ignorerUnRole: () => ({ ecrit: false, cles: [], motif: 'erreur' }),
      retablirUnRole: () => ({ ecrit: false, cles: [], motif: 'erreur' }),
    }),
    ...(controles ? { controles } : {}),
  };
}

/** Un Worker relié à `servirLesCalculs` sans navigateur : chaque message traverse une copie JSON dans les deux sens. */
function travailleurRelie(): TravailleurDeNoms {
  const portee = {
    postMessage: (message: ReponseDuTravailleur) => { travailleur.onmessage?.({ data: parLePont(message) }); },
    onmessage: null as null | ((evenement: { data: RequeteDuTravailleur }) => void),
  };
  let demarre = false;
  const travailleur: TravailleurDeNoms = {
    postMessage(message) {
      if (!demarre) {
        demarre = true;
        servirLesCalculs(portee);
      }
      portee.onmessage?.({ data: parLePont(message) });
    },
    terminate() {},
    onmessage: null,
    onerror: null,
    onmessageerror: null,
  };
  return travailleur;
}

/** Le sandbox, l'écran et le Worker reliés comme dans le plugin ; `envoyes` garde ce que le sandbox envoie à l'écran. */
function chaine() {
  const envoyes: MessageDeCalculDesNoms[] = [];
  const port = creerPortDistant({
    revision: () => 'r',
    envoyer: (message) => { envoyes.push(message); calculateur.recevoir(parLePont(message)); },
    planifier: () => () => {},
  });
  const calculateur = creerCalculateurDeNoms({
    envoyer: (reponse: ReponseDuCalculDesNoms) => { port.recevoir(parLePont(reponse)); },
    fabriquer: travailleurRelie,
  });
  return { port, envoyes };
}

test('lire-structure confie les contrôles au Worker et rend le message du sandbox seul', async () => {
  for (const catalogue of [catalogueAvecDesEcarts, catalogueSansEcart]) {
    oublierLaLectureGardee();
    oublierLesPassagesDuModeTokens();
    const seul = contexteDeTest();
    await traiterAvec(accesSurLeCatalogue(catalogue))({ type: 'lire-structure', demande: 4 }, seul.contexte);
    const voiesSeul = passagesDuModeTokens().filter(({ phase }) => phase === 'controler-le-catalogue').map(({ voie }) => voie);
    assert.deepEqual(voiesSeul, ['sandbox'], 'sans port, le sandbox mène les contrôles');

    oublierLaLectureGardee();
    oublierLesPassagesDuModeTokens();
    const { port, envoyes } = chaine();
    const avecWorker = contexteDeTest();
    await traiterAvec(accesSurLeCatalogue(catalogue, () => creerControlesDistants({ port })))({ type: 'lire-structure', demande: 4 }, avecWorker.contexte);
    assert.deepEqual(envoyes.map(({ travail }) => travail.sorte), ['controler'], 'une demande de contrôle part au Worker, sans calcul de noms');
    const passages = passagesDuModeTokens();
    assert.deepEqual(passages.filter(({ phase }) => phase === 'controler-le-catalogue' || phase === 'controler-l-integrite').map(({ voie }) => voie), ['worker', 'worker']);
    assert.ok(passages.some(({ phase }) => phase === 'worker-retour'), 'le retour du Worker est noté');

    assert.equal(avecWorker.structures().length, 1);
    assert.equal(JSON.stringify(avecWorker.structures()[0]), JSON.stringify(seul.structures()[0]), 'mêmes constats, mêmes corrections, même ordre');
  }
  const ecarts = contexteDeTest();
  await traiterAvec(accesSurLeCatalogue(catalogueAvecDesEcarts))({ type: 'lire-structure', demande: 1 }, ecarts.contexte);
  assert.ok(ecarts.structures()[0].constats.length > 0, 'le catalogue de comparaison porte des constats');
});

test('Ignorer un rôle refait les contrôles par le Worker, et par lui seul', async () => {
  oublierLaLectureGardee();
  const { port, envoyes } = chaine();
  const { contexte, structures } = contexteDeTest();
  let cles: readonly string[] = [];
  const acces = { ...accesSurLeCatalogue(catalogueAvecDesEcarts, () => creerControlesDistants({ port })), reglages: async () => ({ ecriture: null, cles }) };
  const traiter = traiterAvec(acces);
  await traiter({ type: 'lire-structure', demande: 1 }, contexte);
  cles = [cleDUnRoleIgnore(VARIABLES_DU_THEME[0])];
  await traiter({ type: 'ignorer-role', demande: 2, role: VARIABLES_DU_THEME[0] }, contexte);
  assert.deepEqual(structures().map(({ demande }) => demande), [1, 2]);
  assert.deepEqual(envoyes.map(({ demande }) => demande), [2 ** 30 + 1, 2 ** 30 + 2], 'les rôles ignorés ont changé : les contrôles se refont, au Worker');
  assert.deepEqual(structures()[1].ignores.roles, [VARIABLES_DU_THEME[0]]);
});

test('une lecture plus récente répond seule et garde ses corrections retenues', async () => {
  oublierLaLectureGardee();
  let cataloguesLus = 0;
  const liberations: (() => void)[] = [];
  const controles: Acces['controles'] = () => ({
    async controler(_demande, entree) {
      await new Promise<void>((fin) => { liberations.push(fin); });
      return { constats: controlerLeCatalogueEtLIntegrite(entree), voie: 'worker' };
    },
  });
  const { contexte, envoyes, structures } = contexteDeTest();
  const traiter = traiterAvec(accesSurLeCatalogue(() => (++cataloguesLus === 1 ? catalogueAvecUnScopeFaux() : catalogueSansEcart()), controles));
  const premiere = traiter({ type: 'lire-structure', demande: 1 }, contexte);
  const seconde = traiter({ type: 'lire-structure', demande: 2 }, contexte);
  await new Promise((fin) => setImmediate(fin));
  assert.equal(liberations.length, 2, 'les deux lectures attendent leurs contrôles');
  // La seconde finit d'abord, la première après : sa réponse ne doit ni partir ni écraser celle de la seconde.
  liberations[1]();
  await seconde;
  liberations[0]();
  await premiere;
  assert.deepEqual(structures().map(({ demande }) => demande), [2], 'seule la lecture la plus récente répond');
  const id = 'C63:k-defaut:scopes';
  const { catalogue, integrite } = controlerLeCatalogueEtLIntegrite({ catalogue: catalogueAvecUnScopeFaux(), ecriture: null, roles: [] });
  assert.ok([...catalogue, ...integrite].some((constat) => constat.correction?.id === id), 'le catalogue de la première lecture porte cette correction');
  await traiter({ type: 'appliquer-structure', demande: 3, ids: [id] }, contexte);
  const reponse = envoyes.find((message) => message.type === 'structure-appliquee');
  assert.ok(reponse && reponse.type === 'structure-appliquee');
  assert.deepEqual(reponse.sautees, [{ id, motif: 'correction-inconnue' }], 'les corrections de la lecture remplacée ne sont pas retenues');
});

test('les accès du plugin envoient les contrôles à l’interface, et se replient sur le sandbox quand elle renonce', async () => {
  oublierLaLectureGardee();
  oublierLesPassagesDuModeTokens();
  assert.equal(ACCES_DE_FIGMA.controles, undefined, 'les accès nus laissent les contrôles au sandbox');
  const { contexte, envoyes, structures } = contexteDeTest();
  const acces: Acces = { ...ACCES_AVEC_LE_WORKER, catalogue: async () => catalogueAvecUnScopeFaux(), reglages: async () => ({ ecriture: null, cles: [] }) };
  const lecture = traiterAvec(acces)({ type: 'lire-structure', demande: 1 }, contexte);
  for (let tour = 0; tour < 50 && envoyes.length === 0; tour += 1) await new Promise((fin) => setImmediate(fin));
  const envoi = envoyes[0];
  assert.ok(envoi && envoi.type === 'calcul-des-noms' && envoi.travail.sorte === 'controler', 'les contrôles partent à l’interface');
  assert.equal(structures().length, 0, 'la structure attend la réponse sans bloquer');
  portDuCalculDistant(contexte).recevoir({ type: 'noms-non-calcules', demande: envoi.demande, generation: envoi.generation, revision: envoi.revision, cause: 'indisponible' });
  await lecture;
  assert.equal(structures().length, 1);
  assert.ok(structures()[0].corrections.some(({ id }) => id === 'C63:k-defaut:scopes'), 'le sandbox a mené les contrôles après le repli');
  const controle = passagesDuModeTokens().find(({ phase }) => phase === 'controler-le-catalogue');
  assert.deepEqual([controle?.voie, controle?.repli], ['sandbox', 'indisponible']);
});

// L'ordre des transferts (G6.2)

/** Un port qui note l'ordre des envois et ne répond jamais : ni les contrôles ni le calcul des noms ne finissent. */
function portMuet() {
  const sortes: string[] = [];
  const port: PortDeCalculDistant = {
    calculer({ travail }): RequeteDistante {
      sortes.push(travail.sorte);
      return { issue: new Promise<IssueDuCalculDistant>(() => {}), annuler: () => {} };
    },
  };
  return { port, sortes };
}

test('l’inventaire des noms part pendant que les contrôles de structure tournent', async () => {
  oublierLaLectureGardee();
  oublierLAcquisition();
  const fixture = FIXTURES[2];
  const { port, sortes } = portMuet();
  const { contexte, structures } = contexteDeTest();
  void traiterAvec(accesSurLeCatalogue(catalogueAvecDesEcarts, () => creerControlesDistants({ port })))({ type: 'lire-structure', demande: 1 }, contexte);
  const session = creerSession({
    port: { lecture: portDeLecture(fixture), ecriture: { ouvrir: async () => { throw new Error('pas d’écriture'); } }, regles: portDeRegles(stockageDeRegles(fixture)) },
    envoyer: () => {},
    tranches: { pause: async () => {} },
    heure: () => '2026-01-01T00:00:00.000Z',
    calcul: port,
  });
  void session.recevoir({ type: 'noms-analyser', demande: 1 });
  for (let tour = 0; tour < 50 && !sortes.includes('calculer'); tour += 1) await new Promise((fin) => setImmediate(fin));
  assert.deepEqual([...sortes].sort(), ['calculer', 'controler'], 'les contrôles et l’inventaire sont partis, sans attendre leur fin');
  assert.equal(structures().length, 0, 'les contrôles ne sont pas finis');
});

// La file du Worker

/** Un Worker dont les travaux ne s'exécutent que quand le test lui rend la main. */
function travailleurDifferre() {
  const envoyes: ReponseDuTravailleur[] = [];
  const portee = { postMessage: (message: ReponseDuTravailleur) => { envoyes.push(message); }, onmessage: null as null | ((evenement: { data: RequeteDuTravailleur }) => void) };
  const taches: (() => void)[] = [];
  servirLesCalculs(portee, { differer: (rappel) => { taches.push(rappel); } });
  const envoyer = (demande: number, travail: RequeteDuTravailleur['travail']): void => {
    portee.onmessage!({ data: parLePont({ type: 'travailler', demande, generation: 4, revision: 'r', travail } as RequeteDuTravailleur) });
  };
  const reprendreLaMain = (): void => { while (taches.length > 0) taches.shift()!(); };
  const resultats = (): number[] => envoyes.flatMap((message) => (message.type === 'resultat' ? [message.demande] : []));
  return { envoyes, envoyer, reprendreLaMain, resultats, taches };
}

test('le Worker sert les contrôles de structure avant les travaux arrivés plus tôt', async () => {
  const entree = await entreeDeFixture(FIXTURES[2], 4);
  const worker = travailleurDifferre();
  worker.envoyer(1, { sorte: 'calculer', entree: parLePont(entree) });
  worker.envoyer(2, { sorte: 'renommages', selection: { groupes: [], exclus: [], inclus: [] } });
  worker.envoyer(3, { sorte: 'controler', entree: { catalogue: catalogueAvecDesEcarts(), ecriture: null, roles: [] } });
  assert.deepEqual(worker.envoyes, [{ type: 'demarre' }], 'rien ne s’exécute avant que le Worker ne reprenne la main');
  worker.reprendreLaMain();
  assert.deepEqual(worker.resultats(), [3, 1, 2], 'les contrôles passent en premier, les autres travaux gardent leur ordre d’arrivée');
  const controle = worker.envoyes.find((message) => message.type === 'resultat' && message.demande === 3);
  assert.ok(controle && controle.type === 'resultat' && (controle.resultat as { sorte: string }).sorte === 'constats');
});

test('le Worker date l’arrivée du travail avant son attente, et rend les constats du kit', () => {
  const worker = travailleurDifferre();
  const entree = { catalogue: catalogueSansEcart(), ecriture: null, roles: [] };
  worker.envoyer(1, { sorte: 'controler', entree });
  assert.equal(worker.taches.length, 1);
  worker.reprendreLaMain();
  const reponse = worker.envoyes.at(-1)!;
  assert.ok(reponse.type === 'resultat' && reponse.recuA <= reponse.calculDebutA && reponse.calculDebutA <= reponse.calculFinA);
  const attendu = controlerLeCatalogueEtLIntegrite(entree);
  const rendu = reponse.resultat as { catalogue: unknown; integrite: unknown };
  assert.equal(JSON.stringify([rendu.catalogue, rendu.integrite]), JSON.stringify([attendu.catalogue, attendu.integrite]));
});

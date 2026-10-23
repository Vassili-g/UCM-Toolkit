/** L'analyse : identité, opération unique, annulation, erreur du moteur, résultat partiel, péremption. */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { CatalogueDeReference, ReleveDeComposant } from '@ucm-kit/core/controles';
import { ComponentExportError, type ComponentExport, type ResultatDAnalyse } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import { phraseDe, type PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';

import type { PluginMessage } from '../src/messages';
import type { IdentiteDAnalyse } from '../src/messages/commun';
import { analyseCourante, perimerApresUneEcriture, reinitialiserLAnalyse, surChangementDuDocument, surSelection, traiterAvec, type Lecteurs, type SujetAAnalyser } from '../src/sandbox/analyse';
import { origineDeLaSelection, retenirLaSelectionDuPlugin } from '../src/sandbox/commun';
import type { Contexte } from '../src/sandbox/contexte';

const catalogueVide: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };

function releveDe(nom: string, lecture: Partial<ReleveDeComposant['lecture']> = {}): ReleveDeComposant {
  return {
    version: 1,
    jeu: { cle: nom, id: `jeu-${nom}`, nom },
    proprietes: [],
    variants: [{ id: `v-${nom}`, nom: `${nom} défaut`, valeurs: {}, layers: [], modesEffectifs: {} }],
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [], ...lecture },
    espaceDeCouleur: 'srgb',
  };
}

function exportDe(points: readonly PointACorriger[] = []): ComponentExport {
  const phrases = points.map(phraseDe);
  return { warnings: phrases, parties: new Map(points.map((p, i) => [phrases[i], p])), localisations: new Map() } as unknown as ComponentExport;
}

const pointDeTest: PointACorriger = { famille: 'regles', titre: 'Règles : « À compléter » est resté.', impact: 'Impact.', action: 'Action.' };

interface Banc {
  contexte: Contexte;
  envoyes: PluginMessage[];
}

function banc(): Banc {
  const envoyes: PluginMessage[] = [];
  return { envoyes, contexte: { figma: {} as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} } };
}

/** Des lectures sur des doubles : seul le moteur change d'un test à l'autre. */
function lecteurs(moteur: (jeton: { readonly leve: boolean }) => Promise<ResultatDAnalyse>, nom = 'Alert'): Lecteurs {
  return {
    async sujet() {
      return { cle: nom, noeud: { id: `jeu-${nom}` } as never, noeuds: [`jeu-${nom}`, `v-${nom}`] } satisfies SujetAAnalyser;
    },
    async releve(sujet) {
      return { statut: 'lu', releve: releveDe(sujet.cle) };
    },
    async catalogue() {
      return catalogueVide;
    },
    moteur: async (_sujet, jeton) => moteur(jeton),
  };
}

const complete = (points: readonly PointACorriger[] = []) => async (): Promise<ResultatDAnalyse> => ({ etat: 'complete', export: exportDe(points) });
const attendre = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const deType = <T extends PluginMessage['type']>(b: Banc, type: T) => b.envoyes.filter((m) => m.type === type) as Array<Extract<PluginMessage, { type: T }>>;

beforeEach(() => reinitialiserLAnalyse());

test('une analyse complète rend l’identité dans chaque message et les constats du moteur traduits', async () => {
  const b = banc();
  await traiterAvec(lecteurs(complete([pointDeTest])))({ type: 'analyser' }, b.contexte);
  const [commencee] = deType(b, 'analyse-commencee');
  const [enCours] = deType(b, 'analyse-en-cours');
  const [resultat] = deType(b, 'analyse');
  assert.equal(commencee.analyse.sujet, 'Alert');
  assert.deepEqual(enCours.analyse, commencee.analyse);
  assert.deepEqual(resultat.analyse, commencee.analyse);
  assert.equal(resultat.statut, 'complete');
  assert.deepEqual(resultat.constats.map((c) => c.code), ['C44']);
  assert.deepEqual(resultat.variants, [{ id: 'v-Alert', nom: 'Alert défaut' }]);
});

test('une analyse lente d’Alert puis la sélection de Button : perime selection, la réponse porte l’ancienne identité', async () => {
  const b = banc();
  let ouvrir!: () => void;
  const porte = new Promise<void>((resolve) => { ouvrir = resolve; });
  const traiter = traiterAvec(lecteurs(async () => { await porte; return complete()(); }));
  const analyse = traiter({ type: 'analyser' }, b.contexte);
  await attendre(5);
  const alert = analyseCourante() as IdentiteDAnalyse;
  surSelection('jeu-Button', 'figma', b.contexte);
  ouvrir();
  await analyse;
  assert.deepEqual(deType(b, 'perime'), [{ type: 'perime', analyse: alert, cause: 'selection' }]);
  assert.deepEqual(deType(b, 'analyse')[0].analyse, alert);
  assert.equal(alert.sujet, 'Alert');
});

test('une seconde analyse pendant une analyse rend occupe et ne lance rien', async () => {
  const b = banc();
  let ouvrir!: () => void;
  const porte = new Promise<void>((resolve) => { ouvrir = resolve; });
  let lancees = 0;
  const traiter = traiterAvec(lecteurs(async () => { lancees += 1; await porte; return complete()(); }));
  const premiere = traiter({ type: 'analyser' }, b.contexte);
  await attendre(5);
  await traiter({ type: 'analyser' }, b.contexte);
  const [occupe] = deType(b, 'occupe');
  assert.deepEqual(occupe.analyse, analyseCourante());
  ouvrir();
  await premiere;
  assert.equal(lancees, 1);
  assert.equal(deType(b, 'analyse-commencee').length, 1);
  assert.equal(deType(b, 'analyse').length, 1);
});

test('annuler-analyse de l’identité courante rend annulee sans constat ; une identité périmée est ignorée', async () => {
  const b = banc();
  const traiter = traiterAvec(lecteurs(async (jeton) => {
    while (!jeton.leve) await attendre(2);
    return { etat: 'annulee' };
  }));
  const analyse = traiter({ type: 'analyser' }, b.contexte);
  await attendre(5);
  const courante = analyseCourante() as IdentiteDAnalyse;
  await traiter({ type: 'annuler-analyse', analyse: { sujet: courante.sujet, generation: courante.generation - 1 } }, b.contexte);
  await attendre(10);
  assert.equal(deType(b, 'analyse').length, 0);
  await traiter({ type: 'annuler-analyse', analyse: courante }, b.contexte);
  await analyse;
  const [resultat] = deType(b, 'analyse');
  assert.equal(resultat.statut, 'annulee');
  assert.deepEqual(resultat.constats, []);
});

test('une erreur du moteur rend arretee avec un seul constat bloquant', async () => {
  for (const erreur of [new ComponentExportError('Le composant est illisible.'), new Error('boum')]) {
    const b = banc();
    await traiterAvec(lecteurs(async () => { throw erreur; }))({ type: 'analyser' }, b.contexte);
    const [resultat] = deType(b, 'analyse');
    assert.equal(resultat.statut, 'arretee');
    assert.equal(resultat.constats.length, 1);
    assert.equal(resultat.constats[0].type, 'bloquant');
    assert.equal(resultat.constats[0].famille, 'export');
    assert.deepEqual(resultat.constats[0].faits, { message: erreur.message });
    assert.equal(resultat.lecture, null);
    reinitialiserLAnalyse();
  }
});

test('un résultat partiel du moteur rend partielle, avec ses constats et la lecture', async () => {
  const b = banc();
  const lec = lecteurs(async () => ({ etat: 'partielle', export: exportDe([pointDeTest]), lus: 1, nonLus: 3 }));
  await traiterAvec({ ...lec, releve: async (sujet) => ({ statut: 'lu', releve: releveDe(sujet.cle, { variantsNonLus: ['x', 'y', 'z'] }) }) })({ type: 'analyser' }, b.contexte);
  const [resultat] = deType(b, 'analyse');
  assert.equal(resultat.statut, 'partielle');
  assert.deepEqual(resultat.constats.map((c) => c.code), ['C44']);
  assert.deepEqual(resultat.lecture?.variantsNonLus, ['x', 'y', 'z']);
});

test('un clic sur un constat (sélection du plugin) ne change ni le sujet ni la génération et ne périme rien', async () => {
  const b = banc();
  await traiterAvec(lecteurs(complete()))({ type: 'analyser' }, b.contexte);
  const avant = analyseCourante();
  retenirLaSelectionDuPlugin(['l1']);
  assert.equal(origineDeLaSelection(['l1']), 'plugin');
  surSelection('jeu-Button', 'plugin', b.contexte);
  surSelection('v-Alert', 'figma', b.contexte);
  assert.deepEqual(analyseCourante(), avant);
  assert.equal(deType(b, 'perime').length, 0);
});

test('Ctrl+Z périme une seule fois sans réanalyse ; Actualiser ouvre une nouvelle génération', async () => {
  const b = banc();
  const traiter = traiterAvec(lecteurs(complete()));
  await traiter({ type: 'analyser' }, b.contexte);
  const premiere = analyseCourante() as IdentiteDAnalyse;
  surChangementDuDocument(['v-Alert'], b.contexte);
  surChangementDuDocument(['v-Alert'], b.contexte);
  assert.deepEqual(deType(b, 'perime'), [{ type: 'perime', analyse: premiere, cause: 'document' }]);
  assert.equal(deType(b, 'analyse').length, 1);
  await traiter({ type: 'analyser' }, b.contexte);
  const seconde = analyseCourante() as IdentiteDAnalyse;
  assert.equal(seconde.generation, premiere.generation + 1);
  surChangementDuDocument(['v-Alert'], b.contexte);
  assert.equal(deType(b, 'perime').length, 2);
  assert.equal(deType(b, 'perime')[1].analyse.generation, seconde.generation);
});

test('une écriture du plugin périme l’analyse courante', async () => {
  const b = banc();
  await traiterAvec(lecteurs(complete()))({ type: 'analyser' }, b.contexte);
  perimerApresUneEcriture(b.contexte);
  assert.equal(deType(b, 'perime')[0].cause, 'ecriture');
});

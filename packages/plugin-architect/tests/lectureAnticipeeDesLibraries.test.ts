/**
 * L'analyse lance la lecture des libraries avec le relevé (6.0) : même sortie qu'en séquence, les deux attentes se
 * chevauchent, une annulation ou un arrêt arrête la lecture, une erreur garde le repli sur le fichier.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { CatalogueDeReference, ReleveDeComposant } from '@ucm-kit/core/controles';
import { lireLesLibraries } from 'ucm-plugin-socle/src/bibliotheque';
import type { ResultatDAnalyse } from 'ucm-plugin-socle/src/composant/contract/exportComponent';

import type { PluginMessage } from '../src/messages';
import { catalogueDeFigma, reinitialiserLAnalyse, traiterAvec, type Lecteurs } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { capturerLAnalyse } from './parite';
import { collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

beforeEach(() => reinitialiserLAnalyse());

const attendre = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const dimensions = { x: 0, y: 0, largeur: 20, hauteur: 20 };

/** Un relevé dont un layer lie une variable de la library `Intencial` : la library est choisie, le catalogue vient d'elle. */
const releveLie = (): ReleveDeComposant => ({
  version: 1, jeu: { cle: 'alert-set', id: 'alert-set', nom: 'Alert' }, proprietes: [],
  variants: [{ id: 'v1', nom: 'Alert', valeurs: {}, modesEffectifs: {}, layers: [{
    id: 'racine', nom: 'racine', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions, peintures: [], valeursEnDur: [],
    liaisons: [{ champ: 'fills', indice: 0, porteur: 'racine', variable: { id: 'v-bouton', cle: 'v-bouton', nom: 'alert/color/info/background', collection: 'cc', distante: true } }],
  }] }],
  lecture: { layersLus: 1, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
});

interface Journal { readonly evenements: string[]; inventaires: number; lecturesDeCollection: number }

/** Une library de `collections` collections, dont chaque lecture dure `delai` ms ; la première porte la variable liée. */
function figmaAvecLibrary(journal: Journal, options: { delai?: number; inventaire?: number; collections?: number } = {}) {
  const { delai = 0, inventaire = delai, collections = 1 } = options;
  const bibliotheque = Array.from({ length: collections }, (_, i) => ({
    key: i === 0 ? 'cc' : `c${i}`, name: i === 0 ? 'components' : `autre${i}`, libraryName: 'Intencial',
    variables: i === 0 ? [{ key: 'v-bouton', name: 'alert/color/info/background', resolvedType: 'COLOR' }] : [],
  }));
  const teamLibrary = {
    async getAvailableLibraryVariableCollectionsAsync() {
      journal.inventaires += 1;
      journal.evenements.push('libraries:debut');
      await attendre(inventaire);
      return bibliotheque.map(({ key, name, libraryName }) => ({ key, name, libraryName }));
    },
    async getVariablesInLibraryCollectionAsync(cle: string) {
      journal.lecturesDeCollection += 1;
      await attendre(delai);
      journal.evenements.push('libraries:fin');
      return bibliotheque.find((collection) => collection.key === cle)!.variables;
    },
  };
  const fond = { ...variableFigma('VariableID:v-bouton/1:2', 'comp', 'alert/color/info/background', 'COLOR', { 'comp:Valeur': { r: 1, g: 1, b: 1, a: 1 } }, true), key: 'v-bouton' };
  const { port } = portDeTest([], [], [], [collectionFigma('comp', 'components', ['Valeur'], [], true)], { importables: [fond] });
  return { teamLibrary, root: { getSharedPluginData: () => '' }, variables: port } as never;
}

function contexteDe(figma: unknown): { contexte: Contexte; envoyes: PluginMessage[] } {
  const envoyes: PluginMessage[] = [];
  return { envoyes, contexte: { figma: figma as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument() {} } };
}

const moteurComplet = async (): Promise<ResultatDAnalyse> => ({ etat: 'complete', export: { warnings: [], parties: new Map(), localisations: new Map() } as never });

/** Les lectures de l'analyse avec le vrai `catalogueDeFigma` ; `enAvance` ajoute le lecteur des libraries. */
function lectures(journal: Journal, enAvance: boolean, releve: Lecteurs['releve']): Lecteurs {
  return {
    async sujet() { return { cle: 'alert-set', noeud: { id: 'alert-set' } as never, noeuds: ['alert-set', 'v1'] }; },
    releve,
    ...(enAvance ? { bibliotheques: (contexte, cooperation) => lireLesLibraries(contexte.figma as never, cooperation) } : {}),
    catalogue: catalogueDeFigma,
    moteur: moteurComplet,
  };
}

const releveLent = (journal: Journal, ms: number): Lecteurs['releve'] => async (_sujet, jeton) => {
  journal.evenements.push('releve:debut');
  await attendre(ms);
  journal.evenements.push('releve:fin');
  return jeton.leve ? { statut: 'annule' } : { statut: 'lu', releve: releveLie() };
};

test('les attentes du relevé et des libraries se chevauchent, et la sortie est celle de la lecture en séquence', async () => {
  const sortie = async (enAvance: boolean) => {
    const journal: Journal = { evenements: [], inventaires: 0, lecturesDeCollection: 0 };
    const figma = figmaAvecLibrary(journal, { delai: 20 });
    const { contexte, envoyes } = contexteDe(figma);
    const capture = await capturerLAnalyse(() => ({ b: { contexte, envoyes }, lectures: lectures(journal, enAvance, releveLent(journal, 200)) }));
    return { capture, journal };
  };
  const sequence = await sortie(false);
  const parallele = await sortie(true);
  assert.deepEqual(parallele.capture, sequence.capture);
  assert.equal(parallele.capture.catalogue?.library?.nom, 'Intencial', 'le catalogue vient de la library, pas du repli');
  assert.equal(parallele.journal.inventaires, 1);
  assert.deepEqual(sequence.journal.evenements.slice(0, 2), ['releve:debut', 'releve:fin']);
  // Les libraries demandent leur inventaire avant que le relevé finisse, et se terminent pendant lui (20 + 20 ms contre 200 ms).
  assert.deepEqual(parallele.journal.evenements, ['releve:debut', 'libraries:debut', 'libraries:fin', 'releve:fin']);
  const phases = (envoyes: readonly PluginMessage[]) => envoyes
    .flatMap((m) => (m.type === 'analyse-en-cours' && m.progression ? [m.progression.phase] : []))
    .filter((phase, rang, toutes) => phase !== toutes[rang - 1]);
  assert.deepEqual(phases(parallele.capture.messages), phases(sequence.capture.messages));
  assert.deepEqual(phases(parallele.capture.messages).slice(0, 3), ['sujet', 'releve', 'catalogue']);
});

test('la trace garde les libraries comme phase parallèle, l’attente restante du catalogue comme étape, et les compteurs d’attente intacts', async () => {
  const tracer = async (enAvance: boolean) => {
    const journal: Journal = { evenements: [], inventaires: 0, lecturesDeCollection: 0 };
    const { contexte, envoyes } = contexteDe(figmaAvecLibrary(journal, { delai: 30 }));
    reinitialiserLAnalyse();
    await traiterAvec(lectures(journal, enAvance, releveLent(journal, 10)))({ type: 'analyser', mesurer: true }, contexte);
    return envoyes.find((m): m is Extract<PluginMessage, { type: 'analyse' }> => m.type === 'analyse')!.mesure!;
  };
  const trace = await tracer(true);
  const sequence = await tracer(false);
  const phases = trace.phases!.map(({ nom }) => nom);
  assert.deepEqual(phases.filter((nom) => ['releve', 'libraries', 'catalogue'].includes(nom)), ['releve', 'libraries', 'catalogue']);
  const duree = (nom: string) => trace.phases!.find((phase) => phase.nom === nom)!.ms;
  assert.ok(duree('libraries') >= duree('releve'), 'les libraries ont démarré avec le relevé');
  const etapes = trace.etapes.map(({ nom }) => nom);
  assert.ok(etapes.indexOf('releve') < etapes.indexOf('catalogue') && etapes.indexOf('catalogue') < etapes.indexOf('catalogue-attente-libraries') && etapes.indexOf('catalogue-attente-libraries') < etapes.indexOf('catalogue-valeurs'));
  assert.equal(sequence.phases!.some(({ nom }) => nom === 'libraries'), false);
  // La phase parallèle n'ajoute aucune attente aux compteurs : le chevauchement ne se compterait pas deux fois.
  assert.equal(trace.compteurs.attentesArchitect, sequence.compteurs.attentesArchitect);
});

test('un jeton levé pendant le relevé arrête la lecture des libraries, sans promesse rejetée', async () => {
  const rejets: unknown[] = [];
  const surRejet = (raison: unknown) => rejets.push(raison);
  process.on('unhandledRejection', surRejet);
  try {
    const journal: Journal = { evenements: [], inventaires: 0, lecturesDeCollection: 0 };
    const { contexte, envoyes } = contexteDe(figmaAvecLibrary(journal, { inventaire: 5, delai: 40, collections: 40 }));
    const traiter = traiterAvec(lectures(journal, true, async (_sujet, jeton) => {
      await attendre(400);
      return jeton.leve ? { statut: 'annule' } : { statut: 'lu', releve: releveLie() };
    }));
    const analyse = traiter({ type: 'analyser', demande: 7 }, contexte);
    // L'annulation tombe quand les premières lectures de collection (40 ms chacune) sont en vol.
    while (journal.lecturesDeCollection === 0) await attendre(2);
    await traiter({ type: 'annuler-analyse', demande: 7 }, contexte);
    await analyse;
    const lues = journal.lecturesDeCollection;
    await attendre(120);
    assert.equal(journal.lecturesDeCollection, lues, 'aucune lecture de collection après l’annulation');
    assert.ok(lues > 0 && lues <= 8, `${lues} lectures sur 40`);
    assert.equal(envoyes.filter((m) => m.type === 'analyse').map((m) => (m as { statut: string }).statut).join(), 'annulee');
    assert.equal(envoyes.some((m) => m.type === 'analyse-provisoire'), false);
    await attendre(10);
    assert.deepEqual(rejets, []);
  } finally { process.off('unhandledRejection', surRejet); }
});

test('un relevé sans sujet arrête la lecture des libraries encore en vol', async () => {
  const journal: Journal = { evenements: [], inventaires: 0, lecturesDeCollection: 0 };
  const { contexte, envoyes } = contexteDe(figmaAvecLibrary(journal, { inventaire: 5, delai: 40, collections: 40 }));
  await traiterAvec(lectures(journal, true, async () => { await attendre(60); return { statut: 'sans-sujet' }; }))({ type: 'analyser' }, contexte);
  const lues = journal.lecturesDeCollection;
  await attendre(120);
  assert.equal(journal.lecturesDeCollection, lues);
  assert.ok(lues < 40, `${lues} lectures sur 40`);
  assert.equal((envoyes.find((m) => m.type === 'analyse') as { statut: string }).statut, 'arretee');
});

test('une lecture des libraries qui lève garde le repli sur les variables du fichier, sans arrêter l’analyse avant le relevé', async () => {
  const rejets: unknown[] = [];
  const surRejet = (raison: unknown) => rejets.push(raison);
  process.on('unhandledRejection', surRejet);
  try {
    const sortie = async (enAvance: boolean) => {
      const journal: Journal = { evenements: [], inventaires: 0, lecturesDeCollection: 0 };
      const figma = figmaAvecLibrary(journal);
      const { contexte, envoyes } = contexteDe(figma);
      const base = lectures(journal, false, releveLent(journal, 40));
      const lecteurs: Lecteurs = enAvance
        ? { ...base, bibliotheques: async () => { await attendre(5); journal.evenements.push('libraries:erreur'); throw new Error('réseau coupé'); } }
        : { ...base, catalogue: (releve, jeton, ctx, cooperation) => catalogueDeFigma(releve, jeton, { ...ctx, figma: { ...(ctx.figma as object), teamLibrary: undefined } as never }, cooperation) };
      const capture = await capturerLAnalyse(() => ({ b: { contexte, envoyes }, lectures: lecteurs }));
      return { capture, journal };
    };
    const repli = await sortie(false);
    const erreur = await sortie(true);
    assert.deepEqual(erreur.capture, repli.capture);
    assert.equal(erreur.capture.catalogue?.library, null);
    assert.equal(erreur.capture.messages.some((m) => m.type === 'analyse' && m.statut !== 'complete'), false);
    assert.deepEqual(erreur.journal.evenements, ['releve:debut', 'libraries:erreur', 'releve:fin'], 'l’erreur survient pendant le relevé sans l’interrompre');
    await attendre(10);
    assert.deepEqual(rejets, []);
  } finally { process.off('unhandledRejection', surRejet); }
});

test('catalogueDeFigma attend une lecture anticipée au lieu de relire les libraries', async () => {
  const journal: Journal = { evenements: [], inventaires: 0, lecturesDeCollection: 0 };
  const figma = figmaAvecLibrary(journal);
  const contexte = { figma } as unknown as Contexte;
  const lecture = await lireLesLibraries(figma as never);
  const catalogue: CatalogueDeReference = await catalogueDeFigma(releveLie(), { leve: false }, contexte, undefined, Promise.resolve({ lecture }));
  assert.equal(catalogue.library?.nom, 'Intencial');
  assert.equal(journal.inventaires, 1);
});

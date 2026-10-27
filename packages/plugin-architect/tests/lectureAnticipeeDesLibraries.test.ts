/**
 * L'analyse lance la lecture des libraries avec le relevé (6.0) : même sortie qu'en séquence, les deux attentes se
 * chevauchent, une annulation ou un arrêt arrête la lecture, une erreur garde le repli sur le fichier. La vérification
 * d'une lecture anticipée finie (6.0b) suit la même règle (16.5) : elle court avec le relevé, le catalogue en attend la fin.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { CatalogueDeReference, ReleveDeComposant } from '@ucm-kit/core/controles';
import { lireLesLibraries } from 'ucm-plugin-socle/src/bibliotheque';
import type { ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';

import type { PluginMessage } from '../src/messages';
import { catalogueDeFigma, intentionDe, reinitialiserLAnalyse, reutilisationPermise, traiterAvec, type Lecteurs } from '../src/sandbox/analyse';
import { abandonnerLesLibrariesAnticipees, anticiperLesLibraries, lireLesLibrariesAuClic, RECENCE_DE_L_ANTICIPATION_MS, uneLectureAnticipeeExiste } from '../src/sandbox/anticipation';
import { traiter as traiterLeComposant } from '../src/sandbox/composant';
import { fermerLaMesure, ouvrirLaMesure } from 'ucm-plugin-socle/src/composant/contract/mesure';
import type { Contexte } from '../src/sandbox/contexte';
import { capturerLAnalyse } from './parite';
import { collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

beforeEach(() => { reinitialiserLAnalyse(); abandonnerLesLibrariesAnticipees(); });

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

type BibliothequeDeTest = Array<{ key: string; name: string; libraryName: string; variables: Array<{ key: string; name: string; resolvedType: string }> }>;

interface Journal { readonly evenements: string[]; inventaires: number; lecturesDeCollection: number }

/** Une library de `collections` collections, dont chaque lecture dure `delai` ms ; la première porte la variable liée. */
function figmaAvecLibrary(journal: Journal, options: { delai?: number; inventaire?: number; collections?: number; bibliotheque?: BibliothequeDeTest } = {}) {
  const { delai = 0, inventaire = delai, collections = 1 } = options;
  const bibliotheque: BibliothequeDeTest = options.bibliotheque ?? Array.from({ length: collections }, (_, i) => ({
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

const moteurComplet = async (): Promise<ResultatSansPublication> => ({ etat: 'calculee', interne: { warnings: [], parties: new Map(), localisations: new Map(), couverture: { etat: 'complete' } } as never });

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

/* 6.0b : la lecture des libraries anticipée à la sélection d'un composant. */

const bibliothequeDe = (): BibliothequeDeTest => [
  { key: 'cc', name: 'components', libraryName: 'Intencial', variables: [{ key: 'v-bouton', name: 'alert/color/info/background', resolvedType: 'COLOR' }, { key: 'v-rayon', name: 'alert/size/radius', resolvedType: 'FLOAT' }] },
  { key: 'ct', name: 'theme', libraryName: 'Intencial', variables: [{ key: 'v-fond', name: 'surface/color/background', resolvedType: 'COLOR' }] },
];

const neuf = (): Journal => ({ evenements: [], inventaires: 0, lecturesDeCollection: 0 });
const figmaDe = (journal: Journal, bibliotheque = bibliothequeDe(), options: { delai?: number } = {}) => figmaAvecLibrary(journal, { ...options, bibliotheque }) as unknown as PluginAPI;

/** Attend que les 2 collections de `bibliothequeDe` soient lues, puis que la lecture anticipée se déclare finie. */
async function attendreLaFin(journal: Journal): Promise<void> {
  while (journal.evenements.filter((evenement) => evenement === 'libraries:fin').length < 2) await attendre(2);
  await attendre(5);
}

/** Une trace ouverte autour de `corps` : les compteurs de la lecture au clic. */
async function avecTrace<T>(corps: () => Promise<T>) {
  ouvrirLaMesure();
  const resultat = await corps();
  return { resultat, compteurs: fermerLaMesure('')!.compteurs };
}

test('une lecture anticipée finie est reprise au clic quand la liste est identique', async () => {
  const journal = neuf();
  const figma = figmaDe(journal);
  anticiperLesLibraries(figma);
  await attendreLaFin(journal);
  const un = await avecTrace(() => lireLesLibrariesAuClic(figma));
  const deux = await avecTrace(() => lireLesLibrariesAuClic(figma));
  assert.equal(un.compteurs.librariesAnticipeesReprises, 1);
  assert.equal(un.compteurs.librariesAnticipeesRelues, undefined);
  assert.ok(un.compteurs.msVerificationDesLibraries !== undefined, 'la trace donne la durée de la vérification');
  assert.equal(deux.resultat, un.resultat, 'la même lecture, pas une copie');
  assert.equal(journal.inventaires, 3, 'une lecture anticipée, une vérification par clic');
  const fraiche = await lireLesLibraries(figma as never);
  assert.deepEqual(un.resultat, fraiche);
});

test('une variable ajoutée, renommée ou de type changé fait relire : la nouvelle liste est celle de l’analyse', async () => {
  const changements: Array<[string, (bibliotheque: BibliothequeDeTest) => void]> = [
    ['ajoutée', (b) => { b[0].variables.push({ key: 'v-neuve', name: 'alert/size/gap', resolvedType: 'FLOAT' }); }],
    ['renommée', (b) => { b[0].variables[0].name = 'alert/color/info/fond'; }],
    ['de type changé', (b) => { b[0].variables[1].resolvedType = 'STRING'; }],
    ['retirée', (b) => { b[1].variables.pop(); }],
    ['collection ajoutée', (b) => { b.push({ key: 'cb', name: 'brands', libraryName: 'Intencial', variables: [] }); }],
  ];
  for (const [nom, changer] of changements) {
    abandonnerLesLibrariesAnticipees();
    const journal = neuf();
    const bibliotheque = bibliothequeDe();
    const figma = figmaDe(journal, bibliotheque);
    anticiperLesLibraries(figma);
    await attendreLaFin(journal);
    const avant = await lireLesLibraries(figma as never);
    changer(bibliotheque);
    const apres = await lireLesLibraries(figma as never);
    assert.notDeepEqual(apres, avant, nom);
    const clic = await avecTrace(() => lireLesLibrariesAuClic(figma));
    assert.deepEqual(clic.resultat, apres, nom);
    assert.equal(clic.compteurs.librariesAnticipeesRelues, 1, nom);
    assert.equal(clic.compteurs.librariesAnticipeesReprises, undefined, nom);
    // La lecture relue remplace l'anticipée : le clic suivant la reprend.
    const suivant = await avecTrace(() => lireLesLibrariesAuClic(figma));
    assert.equal(suivant.compteurs.librariesAnticipeesReprises, 1, nom);
  }
});

test('une lecture anticipée encore en cours s’attend au clic, sans relire', async () => {
  const journal = neuf();
  const figma = figmaDe(journal, bibliothequeDe(), { delai: 30 });
  anticiperLesLibraries(figma);
  await attendre(5);
  const clic = await avecTrace(() => lireLesLibrariesAuClic(figma));
  assert.equal(journal.inventaires, 1);
  assert.equal(journal.lecturesDeCollection, 2);
  assert.equal(clic.compteurs.librariesAnticipeesReprises, 1);
  assert.equal(clic.compteurs.msVerificationDesLibraries, undefined);
  assert.equal(clic.resultat.etat, 'lue');
});

test('une erreur de la lecture anticipée est sans effet : le clic relit normalement', async () => {
  const rejets: unknown[] = [];
  const surRejet = (raison: unknown) => rejets.push(raison);
  process.on('unhandledRejection', surRejet);
  try {
    const journal = neuf();
    const figma = figmaDe(journal, bibliothequeDe());
    const teamLibrary = (figma as unknown as { teamLibrary: { getAvailableLibraryVariableCollectionsAsync(): Promise<unknown> } }).teamLibrary;
    const lire = teamLibrary.getAvailableLibraryVariableCollectionsAsync;
    teamLibrary.getAvailableLibraryVariableCollectionsAsync = async () => { throw new Error('réseau coupé'); };
    anticiperLesLibraries(figma);
    await attendre(80);
    teamLibrary.getAvailableLibraryVariableCollectionsAsync = lire;
    const clic = await avecTrace(() => lireLesLibrariesAuClic(figma));
    assert.equal(clic.resultat.etat, 'lue');
    assert.equal(clic.compteurs.librariesAnticipeesReprises, undefined);
    assert.equal(clic.compteurs.msVerificationDesLibraries, undefined);
    await attendre(5);
    assert.deepEqual(rejets, []);
  } finally { process.off('unhandledRejection', surRejet); }
});

test('abandonner la lecture anticipée l’arrête et le clic relit', async () => {
  const journal = neuf();
  const figma = figmaDe(journal, Array.from({ length: 40 }, (_, i) => ({ key: `c${i}`, name: `n${i}`, libraryName: 'Intencial', variables: [] })), { delai: 20 });
  anticiperLesLibraries(figma);
  while (journal.lecturesDeCollection === 0) await attendre(2);
  abandonnerLesLibrariesAnticipees();
  const lues = journal.lecturesDeCollection;
  await attendre(100);
  assert.ok(lues <= 8 && journal.lecturesDeCollection === lues, `${lues} lectures, puis ${journal.lecturesDeCollection}`);
  const clic = await avecTrace(() => lireLesLibrariesAuClic(figma));
  assert.equal(clic.resultat.etat, 'lue');
  assert.equal(journal.inventaires, 2);
  assert.equal(clic.compteurs.librariesAnticipeesReprises, undefined);
});

test('la sélection d’un composant lance une seule lecture ; une lecture récente n’est pas relancée', async () => {
  const journal = neuf();
  const figma = figmaDe(journal, bibliothequeDe(), { delai: 10 });
  const composant = { id: 'jeu', type: 'COMPONENT_SET', name: 'Alert', parent: null, children: [] };
  const racine = (figma as unknown as { root: { getSharedPluginData(): string } }).root;
  racine.getSharedPluginData = () => JSON.stringify({ version: 1, ucm: true });
  const selection: unknown[] = [composant];
  Object.assign(figma, { currentPage: { selection }, getNodeByIdAsync: async () => null, getStyleByIdAsync: async () => null });
  const { contexte } = contexteDe(figma);
  await Promise.all([traiterLeComposant({ type: 'lire-composant', demande: 1, calque: null }, contexte), traiterLeComposant({ type: 'lire-composant', demande: 2, calque: null }, contexte)]);
  await traiterLeComposant({ type: 'lire-composant', demande: 3, calque: null }, contexte);
  await attendre(60);
  assert.equal(journal.inventaires, 1);
  // Passé le délai de récence, une sélection relance la lecture.
  const maintenant = Date.now;
  Date.now = () => maintenant() + RECENCE_DE_L_ANTICIPATION_MS + 1;
  try { await traiterLeComposant({ type: 'lire-composant', demande: 4, calque: null }, contexte); } finally { Date.now = maintenant; }
  await attendre(60);
  assert.equal(journal.inventaires, 2);
});

test('rien ne se lit sans composant ni hors d’un fichier UCM', async () => {
  const journal = neuf();
  const figma = figmaDe(journal, bibliothequeDe());
  const racine = (figma as unknown as { root: { getSharedPluginData(): string } }).root;
  const selection: unknown[] = [];
  Object.assign(figma, { currentPage: { selection }, getNodeByIdAsync: async () => null, getStyleByIdAsync: async () => null });
  const { contexte } = contexteDe(figma);
  const lire = (demande: number) => traiterLeComposant({ type: 'lire-composant', demande, calque: null }, contexte);
  racine.getSharedPluginData = () => JSON.stringify({ version: 1, ucm: true });
  await lire(1);
  selection.push({ id: 'cadre', type: 'FRAME', name: 'Cadre', parent: { id: 'page', type: 'PAGE', parent: null } });
  await lire(2);
  selection[0] = { id: 'jeu', type: 'COMPONENT_SET', name: 'Alert', parent: null, children: [] };
  racine.getSharedPluginData = () => JSON.stringify({ version: 1, ucm: false });
  await lire(3);
  racine.getSharedPluginData = () => '';
  await lire(4);
  await attendre(30);
  assert.equal(journal.inventaires, 0);
});

test('la sortie de l’analyse est celle de l’analyse sans anticipation, que la liste ait changé ou non', async () => {
  const sortie = async (anticiper: 'non' | 'identique' | 'changee') => {
    abandonnerLesLibrariesAnticipees();
    const journal = neuf();
    const bibliotheque = bibliothequeDe();
    const figma = figmaAvecLibrary(journal, { bibliotheque, delai: 5 }) as unknown as PluginAPI;
    if (anticiper !== 'non') {
      // La liste de l'anticipation porte une collection de plus que celle du clic.
      if (anticiper === 'changee') bibliotheque.push({ key: 'cx', name: 'extra', libraryName: 'Intencial', variables: [] });
      anticiperLesLibraries(figma);
      await attendre(40);
      if (anticiper === 'changee') bibliotheque.pop();
    }
    const { contexte, envoyes } = contexteDe(figma);
    const lecteurs: Lecteurs = {
      ...lectures(journal, false, releveLent(journal, 20)),
      bibliotheques: (ctx, cooperation) => lireLesLibrariesAuClic(ctx.figma, cooperation),
    };
    return capturerLAnalyse(() => ({ b: { contexte, envoyes }, lectures: lecteurs }));
  };
  const sans = await sortie('non');
  assert.equal(sans.catalogue?.library?.nom, 'Intencial');
  assert.deepEqual(await sortie('identique'), sans);
  assert.deepEqual(await sortie('changee'), sans);
});

/* 8.7 : Actualiser ne reprend aucune lecture d'une demande précédente. */

test('l’intention d’une demande est Analyser par défaut, et seul Analyser permet la réutilisation', () => {
  assert.equal(intentionDe({ type: 'analyser' }), 'analyser');
  assert.equal(reutilisationPermise({ type: 'analyser' }), true);
  assert.equal(reutilisationPermise({ type: 'analyser', intention: 'analyser' }), true);
  assert.equal(reutilisationPermise({ type: 'analyser', intention: 'actualiser' }), false);
});

test('Actualiser abandonne la lecture anticipée et relit ; Analyser la reprend', async () => {
  const demander = async (intention: 'analyser' | 'actualiser', fini: boolean) => {
    abandonnerLesLibrariesAnticipees();
    reinitialiserLAnalyse();
    const journal = neuf();
    const figma = figmaDe(journal, bibliothequeDe(), { delai: fini ? 0 : 30 });
    anticiperLesLibraries(figma);
    if (fini) await attendreLaFin(journal);
    const { contexte, envoyes } = contexteDe(figma);
    const lecteurs: Lecteurs = { ...lectures(journal, false, releveLent(journal, 5)), bibliotheques: (ctx, cooperation) => lireLesLibrariesAuClic(ctx.figma, cooperation) };
    await traiterAvec(lecteurs)({ type: 'analyser', intention, mesurer: true }, contexte);
    const finale = envoyes.find((m): m is Extract<PluginMessage, { type: 'analyse' }> => m.type === 'analyse')!;
    return { journal, compteurs: finale.mesure!.compteurs, anticipee: uneLectureAnticipeeExiste(figma), catalogue: finale.statut };
  };
  // Lecture anticipée finie : Analyser la vérifie et la reprend, Actualiser ne la consulte pas.
  const reprise = await demander('analyser', true);
  assert.equal(reprise.compteurs.librariesAnticipeesReprises, 1);
  assert.equal(reprise.anticipee, true);
  const relue = await demander('actualiser', true);
  assert.equal(relue.compteurs.librariesAnticipeesReprises, undefined);
  assert.equal(relue.compteurs.librariesAnticipeesRelues, undefined);
  assert.equal(relue.compteurs.msVerificationDesLibraries, undefined);
  assert.equal(relue.anticipee, false);
  assert.equal(relue.journal.inventaires, 2, 'l’anticipation, puis la relecture de la demande');
  // Lecture anticipée en cours : Analyser l'attend, Actualiser lit pour son compte.
  const attendue = await demander('analyser', false);
  assert.equal(attendue.journal.inventaires, 1);
  assert.equal(attendue.compteurs.librariesAnticipeesReprises, 1);
  const actualisee = await demander('actualiser', false);
  assert.equal(actualisee.journal.inventaires, 2);
  assert.equal(actualisee.compteurs.librariesAnticipeesReprises, undefined);
  assert.equal(actualisee.catalogue, 'complete');
});

/* 16.5 : la vérification d'une lecture anticipée finie court avec le relevé, hors du chemin critique. */

type ListeDeLibraries = Awaited<ReturnType<typeof lireLesLibraries>>;

/**
 * Une lecture anticipée finie, puis une analyse dont la vérification dure `verification` ms et le relevé `releve` ms. Le journal
 * ne garde que l'analyse ; `liste` est ce que le catalogue reçoit des libraries, et l'instant où il l'a reçue.
 */
async function analyserApresUneAnticipation(options: { verification: number; releve: number; avant?: (bibliotheque: BibliothequeDeTest) => void; mesurer?: boolean; annuleePendantLaVerification?: boolean }) {
  abandonnerLesLibrariesAnticipees();
  reinitialiserLAnalyse();
  const journal = neuf();
  const bibliotheque = bibliothequeDe();
  const figma = figmaDe(journal, bibliotheque);
  anticiperLesLibraries(figma);
  await attendreLaFin(journal);
  options.avant?.(bibliotheque);
  journal.evenements.length = 0;
  journal.lecturesDeCollection = 0;
  const teamLibrary = (figma as unknown as { teamLibrary: { getAvailableLibraryVariableCollectionsAsync(): Promise<unknown> } }).teamLibrary;
  const inventaire = teamLibrary.getAvailableLibraryVariableCollectionsAsync.bind(teamLibrary);
  teamLibrary.getAvailableLibraryVariableCollectionsAsync = async () => { await attendre(options.verification); return inventaire(); };
  const { contexte, envoyes } = contexteDe(figma);
  let liste: ListeDeLibraries | null = null;
  let catalogueLu: CatalogueDeReference | null = null;
  const base = lectures(journal, false, releveLent(journal, options.releve));
  const lecteurs: Lecteurs = {
    ...base,
    bibliotheques: async (ctx, cooperation) => {
      journal.evenements.push('verification:debut');
      try { return await lireLesLibrariesAuClic(ctx.figma, cooperation); }
      finally { journal.evenements.push('verification:fin'); }
    },
    catalogue: async (releve, jeton, ctx, cooperation, libraries, inventaires) => {
      journal.evenements.push('catalogue:debut');
      const issue = await libraries!;
      if ('lecture' in issue) liste = issue.lecture;
      journal.evenements.push('catalogue:liste');
      catalogueLu = await catalogueDeFigma(releve, jeton, ctx, cooperation, libraries, inventaires);
      journal.evenements.push('catalogue:fin');
      return catalogueLu;
    },
  };
  const traiter = traiterAvec(lecteurs);
  const analyse = traiter({ type: 'analyser', demande: 5, intention: 'analyser', ...(options.mesurer ? { mesurer: true } : {}) }, contexte);
  if (options.annuleePendantLaVerification) {
    while (!journal.evenements.includes('verification:debut')) await attendre(1);
    await traiter({ type: 'annuler-analyse', demande: 5 }, contexte);
  }
  await analyse;
  const finale = envoyes.find((m): m is Extract<PluginMessage, { type: 'analyse' }> => m.type === 'analyse')!;
  return { journal, figma, bibliotheque, liste: liste as ListeDeLibraries | null, catalogue: catalogueLu as CatalogueDeReference | null, finale };
}

const rang = (journal: Journal, evenement: string) => journal.evenements.indexOf(evenement);

test('la vérification lente ne retarde pas le relevé, et le catalogue attend sa fin', async () => {
  const { journal, liste, catalogue, finale } = await analyserApresUneAnticipation({ verification: 150, releve: 30 });
  assert.ok(rang(journal, 'verification:debut') >= 0 && rang(journal, 'verification:debut') < rang(journal, 'releve:fin'), 'la vérification part avant la fin du relevé');
  assert.ok(rang(journal, 'releve:fin') < rang(journal, 'verification:fin'), 'le relevé finit sans attendre la vérification');
  assert.ok(rang(journal, 'catalogue:debut') < rang(journal, 'verification:fin'), 'le catalogue commence avant la fin de la vérification');
  assert.ok(rang(journal, 'verification:fin') < rang(journal, 'catalogue:liste'), 'le catalogue ne reçoit la liste qu’une fois vérifiée');
  assert.equal(liste?.etat, 'lue');
  assert.equal(catalogue?.library?.nom, 'Intencial');
  assert.equal(finale.statut, 'complete');
});

test('une liste changée pendant la vérification donne un catalogue sur la liste fraîche', async () => {
  const { figma, liste, finale } = await analyserApresUneAnticipation({
    verification: 60, releve: 10,
    avant: (bibliotheque) => { bibliotheque[0].variables.push({ key: 'v-neuve', name: 'alert/size/gap', resolvedType: 'FLOAT' }); },
  });
  const fraiche = await lireLesLibraries(figma as never);
  assert.deepEqual(liste, fraiche);
  assert.ok(liste?.etat === 'lue' && liste.collections[0].variables.some((variable) => variable.cle === 'v-neuve'), 'la variable ajoutée est dans la liste du catalogue');
  assert.equal(finale.statut, 'complete');
});

test('une annulation pendant la vérification arrête les lectures et ne construit aucun catalogue', async () => {
  const rejets: unknown[] = [];
  const surRejet = (raison: unknown) => rejets.push(raison);
  process.on('unhandledRejection', surRejet);
  try {
    const { journal, finale } = await analyserApresUneAnticipation({ verification: 120, releve: 40, annuleePendantLaVerification: true });
    assert.equal(finale.statut, 'annulee');
    assert.equal(rang(journal, 'catalogue:debut'), -1);
    await attendre(250);
    assert.equal(journal.lecturesDeCollection, 0, 'aucune collection relue après l’annulation');
    assert.deepEqual(rejets, []);
  } finally { process.off('unhandledRejection', surRejet); }
});

test('la trace montre la vérification en parallèle : la phase libraries la compte, l’attente du catalogue non', async () => {
  const { finale } = await analyserApresUneAnticipation({ verification: 100, releve: 300, mesurer: true });
  const trace = finale.mesure!;
  const phase = trace.phases!.find(({ nom }) => nom === 'libraries')!;
  const attente = trace.etapes.find(({ nom }) => nom === 'catalogue-attente-libraries')!;
  assert.ok(trace.compteurs.msVerificationDesLibraries! >= 90, `vérification ${trace.compteurs.msVerificationDesLibraries} ms`);
  assert.ok(phase.ms >= 90, `phase libraries ${phase.ms} ms`);
  assert.ok(attente.ms < 100, `attente du catalogue ${attente.ms} ms, sur un relevé de 300 ms`);
  assert.equal(trace.compteurs.librariesAnticipeesReprises, 1);
});

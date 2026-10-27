/**
 * Les inventaires d'une demande d'analyse : le local, le scan des règles et les libraries se lisent une fois pour tous les
 * lecteurs de la demande, et rien ne survit à elle (6.6).
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { CatalogueDeReference, ReleveDeComposant } from '@ucm-kit/core/controles';
import { lireLesLibraries, type PortDeBibliotheque } from 'ucm-plugin-socle/src/bibliotheque';
import { creerInventairesDeLaDemande } from 'ucm-plugin-socle/src/composant/analyse/inventaires';
import { extractRules } from 'ucm-plugin-socle/src/composant/contract/extractRules';
import type { ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';

import type { PluginMessage } from '../src/messages';
import { lireLesRegles } from '../src/regles';
import { catalogueDeFigma, reinitialiserLAnalyse, traiterAvec, type Lecteurs, type SujetAAnalyser } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

beforeEach(() => reinitialiserLAnalyse());

const releve: ReleveDeComposant = {
  version: 1, jeu: { cle: 'alert', id: 'jeu-alert', nom: 'Alert' }, proprietes: [],
  variants: [{ id: 'v-alert', nom: 'Alert', valeurs: {}, layers: [], modesEffectifs: {} }],
  lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
};

const interneVide = { warnings: [], parties: new Map(), localisations: new Map(), couverture: { etat: 'complete' } } as unknown as ResultatInterne;
const moteurVide = async (): Promise<ResultatSansPublication> => ({ etat: 'calculee', interne: interneVide });

/** Un fichier sans library dont `variables` est la liste locale que le port rend, et que le test peut faire évoluer. */
function fichier(variables: ReturnType<typeof variableFigma>[], teamLibrary?: PortDeBibliotheque['teamLibrary']) {
  const { port, appels } = portDeTest([collectionFigma('c', 'Composants', ['Valeur'], variables.map((variable) => variable.id))], variables);
  const envoyes: PluginMessage[] = [];
  const contexte = {
    figma: { root: { getSharedPluginData: () => '' }, variables: port, ...(teamLibrary ? { teamLibrary } : {}) } as unknown as PluginAPI,
    envoyer: (message: PluginMessage) => envoyes.push(message),
    surveillerLeDocument() {},
  } as unknown as Contexte;
  return { contexte, appels, envoyes };
}

const fond = (id: string) => variableFigma(id, 'c', `fond/${id}`, 'COLOR', { 'c:Valeur': { r: 1, g: 1, b: 1, a: 1 } });

/** Les lectures d'Architect sur des doubles, avec le vrai catalogue ; le moteur lit ce que le vrai moteur lit des inventaires. */
function lecteurs(contexte: Contexte, vus: { variables: number[]; collections: number[] }, extra: Partial<Lecteurs> = {}): Lecteurs {
  return {
    async sujet() { return { cle: 'alert', noeud: { id: 'jeu-alert' } as never, noeuds: ['jeu-alert'] } satisfies SujetAAnalyser; },
    async releve() { return { statut: 'lu', releve }; },
    catalogue: (...arguments_) => catalogueDeFigma(...arguments_),
    async moteur(_sujet, _jeton, { figma }, _progresser, _cooperation, inventaires) {
      const [collections, variables] = await Promise.all([
        inventaires!.collectionsLocales(() => figma.variables.getLocalVariableCollectionsAsync()),
        inventaires!.variablesLocales(() => figma.variables.getLocalVariablesAsync()),
      ]);
      vus.collections.push(collections.length);
      vus.variables.push(variables.length);
      return { etat: 'calculee', interne: interneVide };
    },
    ...extra,
  };
}

test('le catalogue du fichier et le moteur lisent la liste locale une fois', async () => {
  const { contexte, appels } = fichier([fond('a'), fond('b')]);
  const vus = { variables: [] as number[], collections: [] as number[] };
  await traiterAvec(lecteurs(contexte, vus))({ type: 'analyser' }, contexte);
  assert.equal(appels.get('a'), 1, 'le catalogue est passé par le repli sur le fichier');
  assert.equal(appels.get('local:variables'), 1);
  assert.equal(appels.get('local:collections'), 1);
  assert.deepEqual(vus, { variables: [2], collections: [1] });
});

test('une nouvelle demande relit le fichier et voit une variable ajoutée entre les deux', async () => {
  const variables = [fond('a')];
  const { contexte, appels } = fichier(variables);
  const vus = { variables: [] as number[], collections: [] as number[] };
  const traiter = traiterAvec(lecteurs(contexte, vus));
  await traiter({ type: 'analyser' }, contexte);
  variables.push(fond('b'));
  await traiter({ type: 'analyser' }, contexte);
  assert.deepEqual(vus.variables, [1, 2]);
  assert.equal(appels.get('local:variables'), 2);
  assert.equal(appels.get('local:collections'), 2);
});

test('une analyse arrêtée avant le moteur ne lit ni les collections locales ni les règles', async () => {
  const { contexte, appels } = fichier([fond('a')]);
  const vus = { variables: [] as number[], collections: [] as number[] };
  let reglesLues = 0;
  await traiterAvec(lecteurs(contexte, vus, {
    async releve() { return { statut: 'sans-sujet' }; },
    async regles() { reglesLues += 1; throw new Error('jamais lu'); },
  }))({ type: 'analyser' }, contexte);
  assert.equal(appels.get('local:collections'), undefined);
  assert.equal(reglesLues, 0);
});

/** Un `teamLibrary` qui compte ses inventaires et ses lectures de collection. */
function bibliotheque() {
  const lectures = { inventaires: 0, collections: 0 };
  const teamLibrary: NonNullable<PortDeBibliotheque['teamLibrary']> = {
    async getAvailableLibraryVariableCollectionsAsync() { lectures.inventaires += 1; return [{ key: 'cc', name: 'components', libraryName: 'Intencial' }]; },
    async getVariablesInLibraryCollectionAsync() { lectures.collections += 1; return [{ key: 'v-fond', name: 'alert/color/info/background', resolvedType: 'COLOR' }]; },
  };
  return { lectures, teamLibrary };
}

test('les libraries se lisent une fois : lecteur lancé en avance et catalogue partagent la demande', async () => {
  const { lectures, teamLibrary } = bibliotheque();
  const { contexte } = fichier([fond('a')], teamLibrary);
  const vus = { variables: [] as number[], collections: [] as number[] };
  let avance = 0;
  await traiterAvec(lecteurs(contexte, vus, {
    bibliotheques: async ({ figma }, cooperation) => { avance += 1; return lireLesLibraries(figma as unknown as PortDeBibliotheque, cooperation); },
  }))({ type: 'analyser' }, contexte);
  assert.equal(avance, 1);
  assert.deepEqual(lectures, { inventaires: 1, collections: 1 });
});

test('un catalogue sans lecture en avance reprend celle que la demande a faite, et n’en refait pas', async () => {
  const { lectures, teamLibrary } = bibliotheque();
  const { contexte } = fichier([fond('a')], teamLibrary);
  const inventaires = creerInventairesDeLaDemande();
  const catalogue = async (): Promise<CatalogueDeReference> => catalogueDeFigma(releve, { leve: false }, contexte, undefined, undefined, inventaires);
  await catalogue();
  await catalogue();
  assert.deepEqual(lectures, { inventaires: 1, collections: 1 });
  await catalogueDeFigma(releve, { leve: false }, contexte);
  assert.deepEqual(lectures, { inventaires: 2, collections: 2 }, 'sans inventaires de demande, la lecture se refait');
});

/** Une page dont le scan des règles se compte : chaque scan interroge deux fois `findAllWithCriteria`. */
function pageAvecRegles() {
  const scans = { nombre: 0 };
  const page = {
    id: 'page', type: 'PAGE',
    findAllWithCriteria: ({ types }: { types: string[] }) => { if (types.includes('INSTANCE')) scans.nombre += 1; return []; },
  };
  const composant = { id: 'jeu', type: 'COMPONENT_SET', name: 'Alert', parent: page, componentPropertyDefinitions: {} } as unknown as ComponentSetNode;
  (page as unknown as { children: unknown[] }).children = [composant];
  return { scans, page: page as unknown as PageNode, composant };
}

const surfaceDuMoteur = { props: {}, stateModel: null, imbriques: { auParent: [] } } as unknown as Parameters<typeof lireLesRegles>[1];

test('le scan des règles lu par le moteur est repris par la lecture des règles, au même relevé', async () => {
  const { scans, page, composant } = pageAvecRegles();
  const inventaires = creerInventairesDeLaDemande();
  // Ce que le moteur fait au début de sa demande.
  await inventaires.reglesDeLaPage(page, composant, () => extractRules(composant, page));
  const partage = await lireLesRegles(composant, surfaceDuMoteur, inventaires);
  assert.equal(scans.nombre, 1);
  const seul = await lireLesRegles(composant, surfaceDuMoteur);
  assert.equal(scans.nombre, 2, 'sans inventaires, la lecture des règles scanne la page elle-même');
  assert.deepEqual(partage, seul);
});

test('la lecture des règles qui passe la première lit pour le moteur', async () => {
  const { scans, page, composant } = pageAvecRegles();
  const inventaires = creerInventairesDeLaDemande();
  await lireLesRegles(composant, surfaceDuMoteur, inventaires);
  await inventaires.reglesDeLaPage(page, composant, () => extractRules(composant, page));
  assert.equal(scans.nombre, 1);
});

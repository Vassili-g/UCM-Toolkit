/**
 * Le catalogue ne retient plus l'analyse (16.9) : il se lance sans être attendu, les dépendances puis le moteur se lisent
 * pendant ses appels, les contrôles du kit commencent à sa clôture. Les phases annoncées, l'ordre des constats et
 * l'annulation restent ceux de l'ancien ordre ; une variable de library que seul l'import rend lisible est lue après lui.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { CatalogueDeReference, ReleveDeComposant } from '@ucm-kit/core/controles';
import { oublierLIndexDuDocument } from 'ucm-plugin-socle/src/composant/contract/composedComponents';
import type { ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';

import type { PluginMessage } from '../src/messages';
import {
  analyseCourante, etatDeLEntree, LECTEURS_DE_FIGMA, reinitialiserLAnalyse, traiterAvec, type DependancesDuMoteur, type Lecteurs, type SujetAAnalyser,
} from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { fabriquerLeMonde } from './outils/mondeFabrique';

beforeEach(() => { reinitialiserLAnalyse(); oublierLIndexDuDocument(); });

const attendre = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const catalogueVide: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };
const types = (envoyes: readonly PluginMessage[]) => envoyes.map(({ type }) => type);
const phasesAnnoncees = (envoyes: readonly PluginMessage[]) => envoyes
  .flatMap((message) => (message.type === 'analyse-en-cours' && message.progression ? [message.progression.phase] : []))
  .filter((phase, rang, toutes) => phase !== toutes[rang - 1]);

/** Une porte que le test ouvre : le catalogue lent attend ses imports. */
function porte() {
  let ouvrir!: () => void;
  const ouverte = new Promise<void>((resolve) => { ouvrir = resolve; });
  return { ouverte, ouvrir };
}

const dependancesVides: DependancesDuMoteur = { regles: null, collectionsLocales: [], variablesLocales: [], styles: [], instances: 0, maitres: [], imbriqueesNonLues: 0, calquesDesInstancesDistantes: [] };

function releveDe(nom: string): ReleveDeComposant {
  return {
    version: 1,
    jeu: { cle: nom, id: `jeu-${nom}`, nom },
    proprietes: [],
    variants: [{ id: `v-${nom}`, nom: `${nom} défaut`, valeurs: {}, layers: [], modesEffectifs: {} }],
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] },
    espaceDeCouleur: 'srgb',
  };
}

const interne = { warnings: [], parties: new Map(), localisations: new Map(), couverture: { etat: 'complete' } } as unknown as ResultatInterne;

/** Des lectures sur des doubles qui notent leur ordre ; `catalogue` attend `fermeture` quand elle est donnée. */
function monter(options: { fermeture?: Promise<void>; moteur?: (jeton: { readonly leve: boolean }, progresser?: (phase: never) => void) => Promise<ResultatSansPublication> } = {}) {
  const ordre: string[] = [];
  const lectures: Lecteurs = {
    async sujet() { return { cle: 'Alert', noeud: { id: 'jeu-Alert' } as never, noeuds: ['jeu-Alert', 'v-Alert'], couverture: { instances: 'descendues', complete: true } } satisfies SujetAAnalyser; },
    async releve(sujet) { return { statut: 'lu', releve: releveDe(sujet.cle) }; },
    async catalogue() {
      ordre.push('catalogue:debut');
      await options.fermeture;
      ordre.push('catalogue:fin');
      return catalogueVide;
    },
    async dependances() { ordre.push('dependances'); await attendre(2); ordre.push('dependances:fin'); return dependancesVides; },
    async moteur(_sujet, jeton, _contexte, progresser) {
      ordre.push('moteur:debut');
      progresser?.('imbriques');
      const rendu = await (options.moteur ?? (async () => ({ etat: 'calculee', interne }) as ResultatSansPublication))(jeton, progresser as never);
      ordre.push('moteur:fin');
      return rendu;
    },
    async ignores() { ordre.push('ignores'); return []; },
  };
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: { root: { getSharedPluginData: () => '' } } as unknown as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} };
  return { ordre, lectures, envoyes, contexte };
}

test('les dépendances puis le moteur se lisent pendant un catalogue lent ; les contrôles et le provisoire attendent sa clôture', async () => {
  const catalogue = porte();
  const { ordre, lectures, envoyes, contexte } = monter({ fermeture: catalogue.ouverte });
  const analyse = traiterAvec(lectures)({ type: 'analyser', demande: 1 }, contexte);
  await attendre(30);
  assert.deepEqual(ordre, ['catalogue:debut', 'dependances', 'dependances:fin', 'moteur:debut', 'moteur:fin'], 'les dépendances sont lues avant le moteur, qui ne les devance pas');
  assert.deepEqual(phasesAnnoncees(envoyes), ['sujet', 'releve', 'catalogue'], 'aucune phase du moteur ni des contrôles avant la clôture');
  assert.equal(types(envoyes).includes('analyse-provisoire'), false);
  catalogue.ouvrir();
  await analyse;
  assert.deepEqual(ordre.slice(5), ['catalogue:fin', 'ignores']);
  assert.deepEqual(phasesAnnoncees(envoyes), ['sujet', 'releve', 'catalogue', 'controles', 'imbriques', 'regles', 'corrections', 'projection']);
  assert.equal(types(envoyes).filter((type) => type === 'analyse-provisoire').length, 1);
  assert.ok(types(envoyes).indexOf('analyse-provisoire') < types(envoyes).indexOf('analyse'));
});

test('les phases du moteur, rendues pendant le catalogue, s’annoncent dans leur ordre après les contrôles', async () => {
  const catalogue = porte();
  const { lectures, envoyes, contexte } = monter({
    fermeture: catalogue.ouverte,
    moteur: async (_jeton, progresser) => { progresser?.('structure' as never); progresser?.('imbriques' as never); progresser?.('structure' as never); return { etat: 'calculee', interne }; },
  });
  const analyse = traiterAvec(lectures)({ type: 'analyser', demande: 1 }, contexte);
  await attendre(30);
  catalogue.ouvrir();
  await analyse;
  const toutes = envoyes.flatMap((message) => (message.type === 'analyse-en-cours' && message.progression ? [message.progression.phase] : []));
  const apresLesControles = toutes.slice(toutes.indexOf('controles'));
  assert.deepEqual(apresLesControles.slice(0, 5), ['controles', 'imbriques', 'structure', 'imbriques', 'structure'], 'les annonces d’un moteur qui a fini avant les contrôles se rejouent dans l’ordre, après celle des dépendances');
  assert.ok(toutes.indexOf('controles') < toutes.indexOf('structure'));
});

test('annuler pendant le catalogue arrête le moteur lancé avec lui, sans provisoire ni résultat, et libère la place', async () => {
  const catalogue = porte();
  let jetonDuMoteur: { readonly leve: boolean } | null = null;
  const { ordre, lectures, envoyes, contexte } = monter({
    fermeture: catalogue.ouverte,
    moteur: async (jeton) => {
      jetonDuMoteur = jeton;
      while (!jeton.leve) await attendre(1);
      return { etat: 'annulee' };
    },
  });
  const traiter = traiterAvec(lectures);
  const analyse = traiter({ type: 'analyser', demande: 1 }, contexte);
  await attendre(30);
  assert.ok(ordre.includes('moteur:debut') && !ordre.includes('moteur:fin'), 'le moteur tourne pendant le catalogue');
  await traiter({ type: 'annuler-analyse', analyse: analyseCourante()! }, contexte);
  catalogue.ouvrir();
  await analyse;
  assert.equal(jetonDuMoteur!.leve, true);
  assert.ok(ordre.includes('moteur:fin'), 'la demande ne rend la place qu’après l’arrêt du moteur');
  const finales = envoyes.filter((message): message is Extract<PluginMessage, { type: 'analyse' }> => message.type === 'analyse');
  assert.equal(finales.length, 1);
  assert.equal(finales[0].statut, 'annulee');
  assert.deepEqual(finales[0].constats, []);
  assert.equal(types(envoyes).includes('analyse-provisoire'), false);
  assert.equal(ordre.includes('ignores'), false, 'les contrôles n’ont pas commencé');
  const suivante = monter();
  await traiterAvec(suivante.lectures)({ type: 'analyser', demande: 2 }, suivante.contexte);
  assert.equal(types(suivante.envoyes).includes('occupe'), false);
  assert.equal(suivante.envoyes.filter((message): message is Extract<PluginMessage, { type: 'analyse' }> => message.type === 'analyse').at(-1)?.statut, 'complete');
});

test('une analyse arrêtée par une erreur du moteur pendant le catalogue rend la même fin qu’après lui', async () => {
  const catalogue = porte();
  const { lectures, envoyes, contexte } = monter({ fermeture: catalogue.ouverte, moteur: async () => { throw new Error('refus du moteur'); } });
  const analyse = traiterAvec(lectures)({ type: 'analyser', demande: 1 }, contexte);
  await attendre(30);
  assert.equal(types(envoyes).includes('analyse'), false, 'l’erreur attend sa place : rien n’est rendu avant la clôture');
  catalogue.ouvrir();
  await analyse;
  assert.equal(types(envoyes).includes('analyse-provisoire'), true, 'le provisoire part avant l’erreur, comme avec le moteur après lui');
  const [finale] = envoyes.filter((message): message is Extract<PluginMessage, { type: 'analyse' }> => message.type === 'analyse');
  assert.equal(finale.statut, 'arretee');
  assert.match(finale.constats[0].faits.message as string, /refus du moteur/);
});

test('une entrée qui peut se valider garde le moteur pour après la validation ; les dépendances se lisent pendant le catalogue', async () => {
  const premiere = monter();
  await traiterAvec(premiere.lectures)({ type: 'analyser', demande: 1 }, premiere.contexte);
  assert.equal(etatDeLEntree('Alert').etat, 'utilisable');
  const catalogue = porte();
  const seconde = monter({ fermeture: catalogue.ouverte });
  const analyse = traiterAvec(seconde.lectures)({ type: 'analyser', demande: 2 }, seconde.contexte);
  await attendre(30);
  assert.deepEqual(seconde.ordre, ['catalogue:debut', 'dependances', 'dependances:fin'], 'le moteur peut être dispensé de tourner : il ne part pas avec le catalogue');
  catalogue.ouvrir();
  await analyse;
  assert.deepEqual(phasesAnnoncees(seconde.envoyes).slice(0, 5), ['sujet', 'releve', 'catalogue', 'controles', 'imbriques']);
});

test('Actualiser lance le moteur avec le catalogue même quand une entrée est utilisable', async () => {
  const premiere = monter();
  await traiterAvec(premiere.lectures)({ type: 'analyser', demande: 1 }, premiere.contexte);
  const catalogue = porte();
  const seconde = monter({ fermeture: catalogue.ouverte });
  const analyse = traiterAvec(seconde.lectures)({ type: 'analyser', demande: 2, intention: 'actualiser' }, seconde.contexte);
  await attendre(30);
  assert.ok(seconde.ordre.includes('moteur:fin'));
  catalogue.ouvrir();
  await analyse;
});

const globale = globalThis as { figma?: unknown };
const BIBLIOTHEQUE = 'VariableID:cle-lib-v/1:1';

/**
 * Le variant `repos` lie son fond à une variable de library que Figma ne rend qu'après l'import du catalogue. Le catalogue,
 * lent ici, l'importe quand `fermeture` s'ouvre ; le relevé garde sa propre mémoire, donc la mémoire de la demande voit
 * la variable pour la première fois avec les dépendances et le moteur.
 */
async function analyserLeMonde(ordre: 'catalogue-pendant-le-moteur' | 'moteur-apres-le-catalogue') {
  const fermeture = porte();
  const monde = fabriquerLeMonde();
  monde.repos.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: BIBLIOTHEQUE } } }];
  const lectures: Array<{ avantImport: boolean }> = [];
  const etat = { importFini: false, maitre: 0, catalogueClos: false };
  const variables = monde.figma.variables;
  const lire = variables.getVariableByIdAsync;
  variables.getVariableByIdAsync = (id: string) => { if (id === BIBLIOTHEQUE) lectures.push({ avantImport: !etat.importFini }); return lire(id); };
  const maitre = monde.instance.getMainComponentAsync as () => Promise<unknown>;
  monde.instance.getMainComponentAsync = () => { etat.maitre += 1; return maitre(); };
  const precedent = globale.figma;
  globale.figma = monde.figma;
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: monde.figma as unknown as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument: () => [] };
  const apresLeCatalogue = async () => { if (ordre === 'moteur-apres-le-catalogue') while (!etat.catalogueClos) await attendre(1); };
  const lecteurs: Lecteurs = {
    ...LECTEURS_DE_FIGMA,
    releve: (sujet, jeton, ctx, progresser, cooperation, inventaires) => LECTEURS_DE_FIGMA.releve(sujet, jeton, ctx, progresser, cooperation, inventaires && { ...inventaires, ressources: undefined }),
    async catalogue() {
      await fermeture.ouverte;
      await variables.importVariableByKeyAsync('cle-lib-v');
      etat.importFini = true;
      etat.catalogueClos = true;
      return catalogueVide;
    },
    async dependances(...appel) { await apresLeCatalogue(); return LECTEURS_DE_FIGMA.dependances!(...appel); },
    async moteur(...appel) { await apresLeCatalogue(); return LECTEURS_DE_FIGMA.moteur(...appel); },
  };
  try {
    const analyse = traiterAvec(lecteurs)({ type: 'analyser', demande: 1 }, contexte);
    await attendre(300);
    const pendant = { maitre: etat.maitre, lectures: lectures.length, avantImport: lectures.filter(({ avantImport }) => avantImport).length };
    fermeture.ouvrir();
    await analyse;
    return { pendant, lectures, envoyes, sortie: JSON.stringify(envoyes).replace(/"generation":\d+/g, '"generation":0') };
  } finally {
    globale.figma = precedent;
  }
}

test('une variable de library lisible seulement après son import est lue par le moteur après lui, pour la sortie de l’ancien ordre', async () => {
  const ancien = await analyserLeMonde('moteur-apres-le-catalogue');
  reinitialiserLAnalyse();
  oublierLIndexDuDocument();
  const nouveau = await analyserLeMonde('catalogue-pendant-le-moteur');
  assert.ok(nouveau.pendant.maitre > ancien.pendant.maitre, 'les dépendances et le moteur lisent le maître de l’instance pendant les imports, en plus du relevé');
  assert.deepEqual(nouveau.pendant, { ...ancien.pendant, maitre: nouveau.pendant.maitre }, 'pendant les imports, seul le relevé a lu la variable : le moteur attend leur fin pour la lire');
  assert.equal(nouveau.pendant.lectures, 1);
  assert.deepEqual(nouveau.lectures, [{ avantImport: true }, { avantImport: false }], 'le relevé la voit refusée avant l’import, le moteur la lit acquise après');
  assert.deepEqual(nouveau.lectures, ancien.lectures);
  const finale = (envoyes: readonly PluginMessage[]) => envoyes.filter((m): m is Extract<PluginMessage, { type: 'analyse' }> => m.type === 'analyse').at(-1)!;
  assert.ok(finale(nouveau.envoyes).constats.length > 0);
  assert.equal(nouveau.sortie, ancien.sortie, 'tous les messages, dans le même ordre, avec les mêmes objets');
});

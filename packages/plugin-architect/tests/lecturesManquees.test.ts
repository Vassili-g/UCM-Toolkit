/** Une lecture manquée ne devient jamais un constat : le relevé garde la liaison illisible, et l'analyse se dit partielle. */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { CatalogueDeReference, ReleveDeComposant } from '@ucm-kit/core/controles';
import { CLE_ARCHITECTURE_DU_FICHIER, CLES_D_ARCHITECT } from '@ucm-kit/core/referentiel';
import type { ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';

import type { PluginMessage } from '../src/messages';
import { lireLeReleve } from '../src/releveDuComposant';
import { catalogueDeFigma, informationDuPremierVariant, reinitialiserLAnalyse, traiterAvec, type Lecteurs, type SujetAAnalyser } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const boite = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

/** Un composant seul : une racine à padding lié, un rectangle à fond lié ; `avecBoite` retire la boîte de la racine. */
function composant(avecBoite = true) {
  const a = atelierDeCalques();
  const fond = a.calque('fond', 'RECTANGLE', {
    absoluteBoundingBox: boite(0, 0, 10, 10),
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: alias('absente') } }],
  });
  const racine = a.calque('racine', 'COMPONENT', {
    name: 'Button',
    ...(avecBoite ? { absoluteBoundingBox: boite(0, 0, 120, 40) } : {}),
    layoutMode: 'HORIZONTAL',
    paddingLeft: 8,
    paddingRight: 8,
    boundVariables: { paddingLeft: alias('absente') },
  }, [fond]);
  return { a, racine };
}

const toutesLesLiaisons = (releve: ReleveDeComposant) => releve.variants.flatMap((v) => v.layers.flatMap((l) => l.liaisons.map((liaison) => ({ layer: l.id, liaison }))));

for (const [motif, port] of [
  ['une variable que Figma ne rend pas', () => portDeTest([], [])],
  ['une variable dont la lecture lève', () => portDeTest([], [], [], [], { refusees: new Set(['absente']) })],
] as const) {
  test(`${motif} : la liaison reste dans le relevé, illisible, avec sa lecture manquée`, async () => {
    const { a, racine } = composant();
    const issue = await lireLeReleve(a.port(port().port), racine);
    assert.equal(issue.statut, 'lu');
    if (issue.statut !== 'lu') return;
    const { releve } = issue;

    assert.deepEqual(
      toutesLesLiaisons(releve).map(({ layer, liaison }) => [layer, liaison.champ, liaison.indice, liaison.illisible, liaison.variable]),
      [
        ['racine', 'paddingLeft', undefined, true, { id: 'absente', cle: '', nom: '', collection: '', distante: false }],
        ['fond', 'fills', 0, true, { id: 'absente', cle: '', nom: '', collection: '', distante: false }],
      ],
    );
    assert.deepEqual(
      releve.lecture.manquees.map(({ layer, champ }) => [layer, champ]),
      [['racine', 'paddingLeft'], ['fond', 'fills[0]']],
    );
    assert.ok(releve.lecture.manquees.every((m) => m.motif.length > 0));
  });
}

test('un champ lié par une variable illisible n’est pas une valeur en dur', async () => {
  const { a, racine } = composant();
  const issue = await lireLeReleve(a.port(portDeTest([], []).port), racine);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.deepEqual(issue.releve.variants[0].layers[0].valeursEnDur.map((v) => v.champ), ['paddingRight', 'width', 'height']);
});

test('une boîte illisible est une lecture manquée, et ne donne ni dimensions de 0 × 0 en dur ni largeur en dur', async () => {
  const { a, racine } = composant(false);
  const issue = await lireLeReleve(a.port(portDeTest([], []).port), racine);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  const [layer] = issue.releve.variants[0].layers;
  assert.deepEqual(issue.releve.lecture.manquees.filter((m) => m.champ === 'dimensions'), [{ layer: 'racine', champ: 'dimensions', motif: 'boîte illisible' }]);
  assert.deepEqual(layer.dimensions, { x: 0, y: 0, largeur: 0, hauteur: 0 });
  assert.deepEqual(layer.valeursEnDur.map((v) => v.champ), ['paddingRight']);
});

test('une variable lue reste une liaison ordinaire, sans lecture manquée', async () => {
  const { a, racine } = composant();
  const variables = portDeTest(
    [collectionFigma('c', 'Composants', ['Valeur'], ['absente'])],
    [variableFigma('absente', 'c', 'carte/fond', 'FLOAT', { 'c:Valeur': 8 })],
  );
  const issue = await lireLeReleve(a.port(variables.port), racine);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.deepEqual(issue.releve.lecture.manquees, []);
  assert.deepEqual(toutesLesLiaisons(issue.releve).map(({ liaison }) => [liaison.illisible, liaison.variable.nom]), [[undefined, 'carte/fond'], [undefined, 'carte/fond']]);
});

/* ---------- Analyse ---------- */

const catalogueVide: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };

function releveDe(lecture: Partial<ReleveDeComposant['lecture']>): ReleveDeComposant {
  return {
    version: 1,
    jeu: { cle: 'Alert', id: 'jeu-Alert', nom: 'Alert' },
    proprietes: [],
    variants: [{ id: 'v-Alert', nom: 'Alert défaut', valeurs: {}, layers: [], modesEffectifs: {} }],
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [], ...lecture },
    espaceDeCouleur: 'srgb',
  };
}

/** Ce qu'un lecteur refuse ou rend à moitié : le moteur coupé par son budget, et les lectures du fichier qui lèvent. */
interface Refus {
  readonly couverture?: { etat: 'partielle'; lus: number; nonLus: number | 'inconnu' };
  readonly lectures?: readonly ('regles' | 'niveau' | 'ignores')[];
}

async function statutAvec(lecture: Partial<ReleveDeComposant['lecture']>, refus: Refus = {}) {
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: { root: { getSharedPluginData: () => '' } } as unknown as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} };
  const lecteurs: Lecteurs = {
    async sujet() {
      return { cle: 'Alert', noeud: { id: 'jeu-Alert' } as never, noeuds: ['jeu-Alert', 'v-Alert'] } satisfies SujetAAnalyser;
    },
    async releve() {
      return { statut: 'lu', releve: releveDe(lecture) };
    },
    async catalogue() {
      return catalogueVide;
    },
    moteur: async (): Promise<ResultatSansPublication> => ({ etat: 'calculee', interne: { warnings: [], parties: new Map(), localisations: new Map(), couverture: refus.couverture ?? { etat: 'complete' } } as unknown as ResultatInterne }),
    ...(refus.lectures?.includes('regles') ? { regles: async () => { throw new Error('refusée'); } } : {}),
    ...(refus.lectures?.includes('niveau') ? { niveau: async () => { throw new Error('refusé'); } } : {}),
    ...(refus.lectures?.includes('ignores') ? { ignores: async () => { throw new Error('refusés'); } } : {}),
  };
  await traiterAvec(lecteurs)({ type: 'analyser' }, contexte);
  const analyse = envoyes.find((m) => m.type === 'analyse');
  return analyse?.type === 'analyse' ? analyse : null;
}

beforeEach(() => reinitialiserLAnalyse());

test('l’analyse d’un relevé aux lectures manquées est partielle, et se dit complète sans elles', async () => {
  const partielle = await statutAvec({ manquees: [{ layer: 'racine', champ: 'fills[0]', motif: 'variable illisible' }] });
  assert.equal(partielle?.statut, 'partielle');
  assert.equal(partielle?.lecture?.manquees.length, 1);

  reinitialiserLAnalyse();
  assert.equal((await statutAvec({}))?.statut, 'complete');
});

test('une analyse partielle porte une cause par lecture qui n’est pas allée au bout, et aucune quand tout est lu', async () => {
  assert.equal((await statutAvec({}))?.causes, undefined, 'une analyse complète ne porte aucune cause');

  const variants = await statutAvec({ variantsNonLus: ['Alert warning', 'Alert error'] });
  assert.equal(variants?.statut, 'partielle');
  assert.deepEqual(variants?.causes, [{ cause: 'variants', lus: 1, total: 3 }]);

  reinitialiserLAnalyse();
  const layers = await statutAvec({ layersLus: 2000, layersNonLus: 640 });
  assert.deepEqual(layers?.causes, [{ cause: 'layers', lus: 2000, total: 2640 }]);

  reinitialiserLAnalyse();
  const lesDeux = await statutAvec({ layersLus: 2000, layersNonLus: 640, variantsNonLus: ['Alert warning'] });
  assert.deepEqual(lesDeux?.causes, [{ cause: 'layers', lus: 2000, total: 2640 }], 'les layers laissés disent la part non lue : une seule ligne de lecture');

  reinitialiserLAnalyse();
  const inconnu = await statutAvec({ layersLus: 12, layersNonLus: 'inconnu' });
  assert.deepEqual(inconnu?.causes, [{ cause: 'layers', lus: 12, total: null }]);

  reinitialiserLAnalyse();
  const lectures = await statutAvec({ manquees: [{ motif: 'a' }, { motif: 'b' }] });
  assert.deepEqual(lectures?.causes, [{ cause: 'lectures', nombre: 2 }]);
});

test('un moteur coupé par son budget avec un relevé complet est partiel, dit ses layers (jamais « N lus sur N ») et dit que les règles ne sont pas lues', async () => {
  const moteur = await statutAvec({}, { couverture: { etat: 'partielle', lus: 300, nonLus: 80 } });
  assert.equal(moteur?.statut, 'partielle');
  assert.deepEqual(moteur?.causes, [{ cause: 'layers', lus: 300, total: 380 }, { cause: 'regles' }]);

  reinitialiserLAnalyse();
  const sansTotal = await statutAvec({}, { couverture: { etat: 'partielle', lus: 300, nonLus: 'inconnu' } });
  assert.deepEqual(sansTotal?.causes, [{ cause: 'layers', lus: 300, total: null }, { cause: 'regles' }]);
});

for (const lecteur of ['regles', 'niveau', 'ignores'] as const) {
  test(`une lecture refusée ${{ regles: 'des règles', niveau: 'du niveau', ignores: 'des ignorés' }[lecteur]} rend l’analyse partielle, avec sa cause`, async () => {
    const analyse = await statutAvec({}, { lectures: [lecteur] });
    assert.equal(analyse?.statut, 'partielle');
    assert.deepEqual(analyse?.causes, [{ cause: lecteur }]);
  });
}

test('les causes se cumulent dans l’ordre : lecture du composant, champs refusés, règles, niveau, ignorés', async () => {
  const analyse = await statutAvec({ layersLus: 2000, layersNonLus: 640, manquees: [{ motif: 'a' }] }, { lectures: ['ignores', 'niveau', 'regles'] });
  assert.equal(analyse?.statut, 'partielle');
  assert.deepEqual(analyse?.causes, [{ cause: 'layers', lus: 2000, total: 2640 }, { cause: 'lectures', nombre: 1 }, { cause: 'regles' }, { cause: 'niveau' }, { cause: 'ignores' }]);
});

/* ---------- Lectures du fichier refusées (E11.1, E11.2) ---------- */

interface Fichier {
  /** Ce que `getSharedPluginData` rend selon la clé : la déclaration, la library rangée. */
  readonly declaration?: string | (() => string);
  readonly library?: string;
  /** Les lecteurs qui remplacent ceux du banc. */
  readonly lecteurs?: Partial<Lecteurs>;
  readonly mesurer?: boolean;
  readonly origine?: 'prelecture';
}

/** Les messages de la dernière analyse jouée par `analyseDuFichier`. */
let envoyesDeLaDerniereAnalyse: PluginMessage[] = [];

async function analyseDuFichier({ declaration, library, lecteurs: remplaces = {}, mesurer, origine }: Fichier = {}) {
  const envoyes: PluginMessage[] = [];
  envoyesDeLaDerniereAnalyse = envoyes;
  const donnees = (cle: string): string => {
    if (cle === CLE_ARCHITECTURE_DU_FICHIER) return typeof declaration === 'function' ? declaration() : declaration ?? '';
    return cle === CLES_D_ARCHITECT.libraryChoisie ? library ?? '' : '';
  };
  const contexte: Contexte = { figma: { root: { getSharedPluginData: (_espace: string, cle: string) => donnees(cle) } } as unknown as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} };
  const lecteurs: Lecteurs = {
    async sujet() { return { cle: 'Alert', noeud: { id: 'jeu-Alert' } as never, noeuds: ['jeu-Alert', 'v-Alert'] } satisfies SujetAAnalyser; },
    async releve() { return { statut: 'lu', releve: releveDe({}) }; },
    async catalogue() { return catalogueVide; },
    moteur: async (): Promise<ResultatSansPublication> => ({ etat: 'calculee', interne: { warnings: [], parties: new Map(), localisations: new Map(), couverture: { etat: 'complete' } } as unknown as ResultatInterne }),
    ...remplaces,
  };
  await traiterAvec(lecteurs)({ type: 'analyser', ...(mesurer ? { mesurer: true, demande: 1 } : {}), ...(origine ? { origine } : {}) }, contexte);
  const analyse = envoyes.find((m) => m.type === 'analyse');
  return analyse?.type === 'analyse' ? analyse : null;
}

for (const [motif, declaration, etat] of [
  ['illisible (JSON invalide)', '{', 'illisible'],
  ['illisible (version absente)', '{"ucm":true}', 'illisible'],
  ['d’une version plus récente', '{"version":2,"ucm":true}', 'future'],
  ['dont la lecture lève', () => { throw new Error('Figma refuse la lecture de la déclaration'); }, 'illisible'],
] as const) {
  test(`N-78 : une déclaration ${motif} rend l’analyse partielle avec sa cause, et ne passe pas pour « libre »`, async () => {
    const analyse = await analyseDuFichier({ declaration });
    assert.equal(analyse?.statut, 'partielle');
    assert.deepEqual(analyse?.causes, [{ cause: 'declaration', etat }]);
  });
}

for (const [motif, declaration] of [['`ucm`', '{"version":1,"ucm":true}'], ['`libre`', '{"version":1,"ucm":false}'], ['absente', '']] as const) {
  test(`une déclaration ${motif} laisse l’analyse complète`, async () => {
    const analyse = await analyseDuFichier({ declaration });
    assert.equal(analyse?.statut, 'complete');
    assert.equal(analyse?.causes, undefined);
  });
}

test('un niveau que ni AA ni AAA ne désigne, des ignorés qui ne sont pas une liste et des règles absentes sont des lectures refusées', async () => {
  const niveau = await analyseDuFichier({ lecteurs: { niveau: async () => 'ZZ' as never } });
  assert.deepEqual(niveau?.causes, [{ cause: 'niveau' }]);
  reinitialiserLAnalyse();
  const ignores = await analyseDuFichier({ lecteurs: { ignores: async () => ({ cle: 'x' }) as never } });
  assert.deepEqual(ignores?.causes, [{ cause: 'ignores' }]);
  reinitialiserLAnalyse();
  const regles = await analyseDuFichier({ lecteurs: { regles: async () => undefined as never } });
  assert.deepEqual(regles?.causes, [{ cause: 'regles' }]);
});

test('Q-F89-3 : des dépendances refusées ne rendent pas l’analyse partielle ; la trace de mesure le dit', async () => {
  const analyse = await analyseDuFichier({ mesurer: true, lecteurs: { dependances: async () => { throw new Error('Figma refuse'); } } });
  assert.equal(analyse?.statut, 'complete');
  assert.equal(analyse?.causes, undefined);
  assert.equal(analyse?.mesure?.compteurs['nonReprise:lecture-refusee:dependances'], 1);
});

const sansLibrary = { async getAvailableLibraryVariableCollectionsAsync() { return []; }, async getVariablesInLibraryCollectionAsync() { return []; } };

/** Le catalogue du produit sur un fichier sans variable locale, avec ou sans accès à l’inventaire des libraries. */
function catalogueReel(teamLibrary: unknown): Partial<Lecteurs> {
  return {
    catalogue: (releve, jeton, contexte, cooperation, libraries, inventaires, options) => {
      const { port } = portDeTest([], []);
      const figma = { root: contexte.figma.root, currentPage: { id: 'page-1', backgrounds: [] }, clientStorage: { getAsync: async () => undefined }, variables: port, teamLibrary };
      return catalogueDeFigma(releve, jeton, { ...contexte, figma: figma as never }, cooperation, libraries, inventaires, options);
    },
  };
}

test('Q-F89-4 : un catalogue lu dans le fichier faute de library lisible rend l’analyse partielle et nomme la library rangée', async () => {
  const sansNom = await analyseDuFichier({ lecteurs: catalogueReel(undefined) });
  assert.equal(sansNom?.statut, 'partielle');
  assert.deepEqual(sansNom?.causes, [{ cause: 'catalogue', library: null }]);
  reinitialiserLAnalyse();
  const nommee = await analyseDuFichier({ library: 'UCM Tokens', lecteurs: catalogueReel(undefined) });
  assert.deepEqual(nommee?.causes, [{ cause: 'catalogue', library: 'UCM Tokens' }]);
  reinitialiserLAnalyse();
  const inventaire = await analyseDuFichier({ library: 'UCM Tokens', lecteurs: catalogueReel({ ...sansLibrary, getAvailableLibraryVariableCollectionsAsync: async () => { throw new Error('réseau coupé'); } }) });
  assert.deepEqual(inventaire?.causes, [{ cause: 'catalogue', library: 'UCM Tokens' }]);
});

test('un fichier sans aucune library activée lit ses tokens dans le fichier sans que l’analyse soit partielle', async () => {
  const analyse = await analyseDuFichier({ lecteurs: catalogueReel(sansLibrary) });
  assert.equal(analyse?.statut, 'complete');
  assert.equal(analyse?.causes, undefined);
});

test('Q-F89-4 : une collection inaccessible de la library choisie rend l’analyse partielle et nomme la library', async () => {
  const catalogue: CatalogueDeReference = {
    version: 1, library: { nom: 'UCM Tokens', cle: 'UCM Tokens' },
    collections: [{ cle: 'c-components', nom: 'components', role: 'components', modes: [], etat: 'inaccessible' }], variables: [],
  };
  const analyse = await analyseDuFichier({ lecteurs: { catalogue: async () => catalogue } });
  assert.equal(analyse?.statut, 'partielle');
  assert.deepEqual(analyse?.causes, [{ cause: 'catalogue', library: 'UCM Tokens' }]);
});

/* ---------- Décompte des layers (E11.4, Q-F89-19) ---------- */

/** Un jeu de variants dont chacun porte `layers` layers ; `leve` désigne les variants dont les enfants ne se lisent pas. */
function jeuDeVariants(layers: readonly number[], leve: readonly number[] = []) {
  const a = atelierDeCalques();
  const composants = layers.map((nombre, rang) => {
    const feuilles = Array.from({ length: nombre - 1 }, (_, k) => a.calque(`v${rang}-l${k}`, 'FRAME', { absoluteBoundingBox: boite(0, 0, 10, 10) }));
    const champs: Record<string, unknown> = { name: `Etat=v${rang}`, absoluteBoundingBox: boite(0, 0, 10, 10) };
    if (leve.includes(rang)) Object.defineProperty(champs, 'children', { enumerable: true, get() { throw new Error('Figma refuse la lecture des enfants'); } });
    return a.calque(`v${rang}`, 'COMPONENT', champs, leve.includes(rang) ? [] : feuilles);
  });
  const jeu = a.calque('jeu', 'COMPONENT_SET', {
    name: 'Budget', key: 'cle-budget', defaultVariant: composants[0],
    componentPropertyDefinitions: { Etat: { type: 'VARIANT', defaultValue: 'v0', variantOptions: composants.map((_, rang) => `v${rang}`) } },
  }, composants);
  return { jeu, port: a.port(portDeTest([], []).port) };
}

test('N-81 : un variant dont les enfants ne se lisent pas est une lecture manquée, et les variants suivants se lisent', async () => {
  const { jeu, port } = jeuDeVariants([5, 5, 5, 5], [1]);
  const issue = await lireLeReleve(port, jeu, { budgetDeLayers: 2000 });
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.deepEqual(issue.releve.variants.map(({ id }) => id), ['v0', 'v2', 'v3']);
  assert.deepEqual(issue.releve.lecture.manquees.map(({ layer, champ }) => [layer, champ]), [['v1', 'children']]);
  assert.deepEqual(issue.releve.lecture.variantsNonLus, [], 'le variant manqué n’est pas un variant laissé par le budget');
  assert.equal(issue.releve.lecture.layersNonLus, 0);
});

test('Q-F89-19 : le premier variant se lit sans borne, les suivants sont laissés, et le relevé coupe comme le moteur', async () => {
  const { jeu, port } = jeuDeVariants([2600, 10, 10]);
  const issue = await lireLeReleve(port, jeu, { budgetDeLayers: 2000 });
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.deepEqual(issue.releve.variants.map(({ id, layers }) => [id, layers.length]), [['v0', 2600]]);
  assert.deepEqual(issue.releve.lecture.variantsNonLus, ['Etat=v1', 'Etat=v2']);
  assert.equal(issue.releve.lecture.layersNonLus, 20);
});

test('Q-F89-19 : un premier variant de plus de 2 000 layers donne une information, et pas de plus de 2 000 ', () => {
  const variant = (nombre: number) => ({ variants: [{ id: 'v0', nom: 'Etat=v0', valeurs: {}, layers: Array.from({ length: nombre }, () => ({}) as never), modesEffectifs: {} }] });
  assert.equal(informationDuPremierVariant(variant(2000)), null);
  const information = informationDuPremierVariant(variant(2001));
  assert.deepEqual(information && [information.code, information.type, information.limite, information.variants, information.faits], ['C42', 'info', true, ['Etat=v0'], { genre: 'premier-variant-hors-budget', layers: 2001, budget: 2000 }]);
});

/* ---------- Library à choisir (E11.5, Q-F89-20) ---------- */

const UCM = '{"version":1,"ucm":true}';

const deuxLibraries = {
  etat: 'lue' as const, illisibles: [],
  collections: ['UCM Tokens', 'Brand Tokens'].map((library) => ({ cle: `c-${library}`, nom: 'components', library, variables: [{ cle: `v-${library}`, nom: 'alert/color/info/background', type: 'COLOR' as const }] })),
};

function lecteursAvecDeuxLibraries(lecteurs: Partial<Lecteurs> = {}) {
  const lectures = { releve: 0 };
  const base: Partial<Lecteurs> = {
    bibliotheques: async () => deuxLibraries,
    releve: async () => { lectures.releve += 1; return { statut: 'lu', releve: releveDe({}) }; },
    ...lecteurs,
  };
  return { lectures, base };
}

test('N-82 : une analyse sans library choisie ne part pas, et le sandbox le dit', async () => {
  const { lectures, base } = lecteursAvecDeuxLibraries();
  const analyse = await analyseDuFichier({ declaration: UCM, lecteurs: base, mesurer: true });
  assert.equal(analyse, null, 'aucun résultat final');
  assert.deepEqual(envoyesDeLaDerniereAnalyse.map(({ type }) => type).filter((type) => type !== 'analyse-en-cours'), ['analyse-commencee', 'library-a-choisir']);
  const refus = envoyesDeLaDerniereAnalyse.find((message) => message.type === 'library-a-choisir');
  assert.equal(refus?.type === 'library-a-choisir' ? refus.demande : null, 1);
  assert.equal(lectures.releve, 1, 'le relevé du composant est lu pour désigner la library par ses liaisons');
});

test('une library désignée par la Configuration laisse l’analyse partir', async () => {
  const { base } = lecteursAvecDeuxLibraries();
  const analyse = await analyseDuFichier({ declaration: UCM, library: 'UCM Tokens', lecteurs: base });
  assert.equal(analyse?.statut, 'complete');
});

test('N-82 : une prélecture ne lit rien tant que la library reste à choisir', async () => {
  const { lectures, base } = lecteursAvecDeuxLibraries();
  await analyseDuFichier({ declaration: UCM, lecteurs: base, origine: 'prelecture' });
  assert.equal(lectures.releve, 0);
  assert.deepEqual(envoyesDeLaDerniereAnalyse, [], 'une prélecture ne parle jamais à l’interface');
});

test('un fichier déclaré libre n’a pas de library à choisir : l’analyse part', async () => {
  const { base } = lecteursAvecDeuxLibraries();
  const analyse = await analyseDuFichier({ declaration: '{"version":1,"ucm":false}', lecteurs: base });
  assert.equal(analyse?.statut, 'complete');
});

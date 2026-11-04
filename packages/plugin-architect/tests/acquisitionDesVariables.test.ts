/**
 * L'acquisition des variables du mode Tokens : un Actualiser lit `getLocalVariablesAsync` une fois, au lieu de trois, et
 * `lire-structure` ne relit aucune variable locale par identifiant. L'ancien chemin reste ici comme oracle : le catalogue, le
 * message `structure` et le bilan de Nomenclature sont égaux avant et après. Ce que l'acquisition ne reprend pas sans preuve (une
 * autre demande, une écriture, un refus) lit Figma.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { Correction } from '@ucm-kit/core/controles';
import { VARIABLES_DE_PALETTE, cranDeLaVariable } from '@ucm-kit/core/emplois';
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { catalogueDuFichier } from '../src/catalogue';
import type { PortDeRegles } from '../src/ecriture/journal';
import { annulerLeDernierRenommage, appliquerLesRenommages, creerPortDeRegles, type SessionEcriture } from '../src/ecriture/noms';
import { annulerLeDernierLotDeStructure, ecrireLaStructure, type ApiDeStructure } from '../src/ecriture/structure';
import { creerLesVariables, type ApiDeVariables } from '../src/ecriture/variables';
import { oublierLesPassagesDuModeTokens, passagesDuModeTokens, type CollectionFigma, type VariableFigma } from '../src/lecture';
import type { MessageDeNomenclature } from '../src/messages/nomenclature';
import type { PluginMessage } from '../src/messages';
import { lireInventaire } from '../src/nomenclature/lecture';
import { creerPortDeLecture } from '../src/nomenclature/lectureFigma';
import { creerSession } from '../src/nomenclature/session';
import {
  DELAI_DE_REPRISE, acquisitionCourante, attendreLesLocalesEnCours, commencerUneAcquisition, fermerLaReprise, oublierLAcquisition, pendantUneEcriture,
  perimerLAcquisition, prendreLAcquisitionPourLaStructure, variablesDuCatalogue,
} from '../src/sandbox/acquisition';
import { annulees, traiter as traiterLArbre } from '../src/sandbox/arbre';
import type { Contexte } from '../src/sandbox/contexte';
import { ACCES_DE_FIGMA, catalogueParLesLectures, traiterAvec } from '../src/sandbox/structure';
import { atelierDEcriture, collectionFigma, variableFigma } from './figmaDeTest';

// Un fichier UCM : les mêmes variables que la structure du thème, en objets de Figma, avec un compteur d'appels

const MODES_DU_THEME = ['light', 'dark'] as const;
const CRANS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const couleur = { r: 0.2, g: 0.4, b: 0.6, a: 1 };

interface OptionsDuFichier {
  /** Les identifiants dont `getVariableByIdAsync` lève. */
  readonly refusees?: ReadonlySet<string>;
  /** Fait lever `getLocalVariablesAsync`. */
  readonly leveLesLocales?: boolean;
}

function fichierUcm(options: OptionsDuFichier = {}) {
  const palettes = ['primary', 'secondary'];
  const roles = VARIABLES_DE_PALETTE.filter((role) => role !== 'surface/subtle' && role !== 'surface/divider');
  const brandsId = 'C:brands';
  const themeId = 'C:theme';
  const utilityId = 'C:utility';
  const variables: VariableFigma[] = [];
  const rang = { n: 0 };
  const nouvelle = (collection: string, nom: string, valeurs: Record<string, unknown>): VariableFigma => {
    rang.n += 1;
    const variable = { ...variableFigma(`VariableID:${rang.n}:0`, collection, nom, 'COLOR', valeurs), getSharedPluginData: () => '' };
    variables.push(variable as VariableFigma);
    return variable as VariableFigma;
  };
  const brands = new Map<string, VariableFigma>();
  for (const palette of palettes) for (const mode of MODES_DU_THEME) for (const cran of CRANS) {
    brands.set(`${palette}/${mode}/${cran}`, nouvelle(brandsId, `${palette}/${mode}/${cran}`, { [`${brandsId}:Marque`]: couleur }));
  }
  const blancs = new Map(MODES_DU_THEME.map((mode) => [mode, nouvelle(utilityId, `neutral/${mode}/white`, { [`${utilityId}:Mode 1`]: couleur })] as const));
  // Une variable de library que le thème vise : lue par identifiant, collection distante comprise.
  const distante: VariableFigma = {
    ...variableFigma('VariableID:cle-lib/9:9', 'C:lib', 'color/red/500', 'COLOR', { 'C:lib:M': couleur }, true), getSharedPluginData: () => '',
  } as VariableFigma;
  for (const palette of palettes) {
    for (const role of roles) {
      const valeurs = Object.fromEntries(MODES_DU_THEME.map((mode) => {
        const cible = role === 'solid/foreground' ? blancs.get(mode)! : brands.get(`${palette}/${mode}/${cranDeLaVariable(role, mode, mode === 'light' ? 'normal' : 'inverse')}`)!;
        return [`${themeId}:${mode}`, alias(cible.id)];
      }));
      nouvelle(themeId, `${palette}/${role}`, valeurs);
    }
  }
  nouvelle(themeId, 'primary/ring', { [`${themeId}:light`]: alias(distante.id), [`${themeId}:dark`]: alias(distante.id) });
  const collections: CollectionFigma[] = [
    collectionFigma(themeId, 'theme', ['light', 'dark'], variables.filter((v) => v.variableCollectionId === themeId).map((v) => v.id)),
    collectionFigma(brandsId, 'brands', ['Marque'], variables.filter((v) => v.variableCollectionId === brandsId).map((v) => v.id)),
    collectionFigma(utilityId, 'utility', ['Mode 1'], variables.filter((v) => v.variableCollectionId === utilityId).map((v) => v.id)),
  ];
  const collectionDistante = collectionFigma('C:lib', 'lib', ['M'], [distante.id], true);

  const appels: Record<string, number> = {};
  const compter = (nom: string): void => { appels[nom] = (appels[nom] ?? 0) + 1; };
  const donnees = new Map<string, string>([[`${ESPACE_ARCHITECT}/${CLE_ARCHITECTURE_DU_FICHIER}`, texteDeLArchitectureDuFichier(true)]]);
  const figma = {
    root: {
      name: 'Fichier', documentColorProfile: 'SRGB',
      getSharedPluginData: (espace: string, cle: string) => donnees.get(`${espace}/${cle}`) ?? '',
      getSharedPluginDataKeys: (espace: string) => [...donnees.keys()].filter((cle) => cle.startsWith(`${espace}/`)).map((cle) => cle.slice(espace.length + 1)),
      setSharedPluginData: (espace: string, cle: string, valeur: string) => { donnees.set(`${espace}/${cle}`, valeur); },
    },
    variables: {
      async getLocalVariableCollectionsAsync() { compter('getLocalVariableCollectionsAsync'); return collections; },
      async getLocalVariablesAsync() {
        compter('getLocalVariablesAsync');
        if (options.leveLesLocales) throw new Error('Figma refuse');
        return variables;
      },
      async getVariableByIdAsync(id: string) {
        compter('getVariableByIdAsync');
        if (options.refusees?.has(id)) throw new Error('Accès refusé');
        return [...variables, distante].find((variable) => variable.id === id) ?? null;
      },
      async getVariableCollectionByIdAsync(id: string) {
        compter('getVariableCollectionByIdAsync');
        return [...collections, collectionDistante].find((collection) => collection.id === id) ?? null;
      },
      async importVariableByKeyAsync() { compter('importVariableByKeyAsync'); throw new Error('Clé absente'); },
    },
  };
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: figma as unknown as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument: () => {} };
  return { figma: figma as unknown as PluginAPI, appels, envoyes, contexte, nombreDeLocales: variables.length, distante };
}

type Fichier = ReturnType<typeof fichierUcm>;

const lireLeReleve = (f: Fichier, demande = 1) => traiterLArbre({ type: 'lire-releve', demande }, f.contexte);
const lireLaStructure = (f: Fichier, demande = 2) => traiterAvec(ACCES_DE_FIGMA)({ type: 'lire-structure', demande }, f.contexte);
const structureEnvoyee = (f: Fichier) => f.envoyes.filter((message) => message.type === 'structure').at(-1);
const appelsDe = (phase: string) => passagesDuModeTokens().filter((passage) => passage.phase === phase).at(-1)?.appels;

/** Nomenclature sur un fichier : sa lecture reprend les locales du relevé en cours quand `partage` est vrai. */
function nomenclature(f: Fichier, partage: boolean) {
  const messages: MessageDeNomenclature[] = [];
  const session = creerSession({
    port: {
      lecture: creerPortDeLecture(f.figma, partage ? attendreLesLocalesEnCours : undefined),
      ecriture: { ouvrir: async () => { throw new Error('pas d’écriture'); } },
      regles: creerPortDeRegles(f.figma),
    },
    envoyer: (message) => { messages.push(message); },
    tranches: { pause: async () => {} },
  });
  return {
    analyser: (demande = 1) => session.recevoir({ type: 'noms-analyser', demande }),
    bilan: () => messages.find((message) => message.type === 'bilan'),
  };
}

beforeEach(() => {
  oublierLAcquisition();
  oublierLesPassagesDuModeTokens();
  annulees.clear();
});

const parCle = <T extends { readonly cle: string }>(liste: readonly T[]): T[] => [...liste].sort((a, b) => a.cle.localeCompare(b.cle));

// Les compteurs

test('un Actualiser appelle getLocalVariablesAsync une fois et lire-structure ne relit aucune variable locale (avant : trois et V)', async () => {
  const avant = fichierUcm();
  await lireLeReleve(avant);
  perimerLAcquisition();
  const nomsAvant = nomenclature(avant, false);
  await nomsAvant.analyser();
  await lireLaStructure(avant);
  const compteursAvant = { ...avant.appels };
  const structureAvant = appelsDe('lire-structure');
  assert.equal(compteursAvant.getLocalVariablesAsync, 3);
  assert.equal(structureAvant?.getVariableByIdAsync, avant.nombreDeLocales + 1, 'une lecture par locale et une pour la cible de library');

  oublierLAcquisition();
  oublierLesPassagesDuModeTokens();
  const apres = fichierUcm();
  const releve = lireLeReleve(apres);
  const noms = nomenclature(apres, true).analyser();
  await Promise.all([releve, noms]);
  await lireLaStructure(apres);
  assert.equal(apres.appels.getLocalVariablesAsync, 1);
  assert.equal(apres.appels.getLocalVariableCollectionsAsync, 1);
  const structure = appelsDe('lire-structure');
  assert.equal(structure?.getVariableByIdAsync, undefined, 'aucune lecture par identifiant dans lire-structure');
  assert.equal(structure?.getLocalVariablesAsync, undefined);
  assert.deepEqual(appelsDe('rafraichir'), {}, 'rafraichir reprend les locales du relevé');
  assert.ok(structureEnvoyee(apres), 'la structure est envoyée');
  // Le relevé lit ses cibles comme avant ; les locales ne se relisent plus par identifiant, ni dans lire-structure ni ailleurs.
  assert.equal(apres.appels.getVariableByIdAsync, avant.appels.getVariableByIdAsync! - structureAvant!.getVariableByIdAsync!);
  console.log('compteurs avant', JSON.stringify(compteursAvant), 'après', JSON.stringify(apres.appels), 'V =', avant.nombreDeLocales);
});

// L'oracle : l'ancien chemin

test('le catalogue de l’acquisition est celui de l’ancienne lecture, collections triées par identifiant', async () => {
  const f = fichierUcm();
  await lireLeReleve(f);
  const acquisition = acquisitionCourante();
  assert.ok(acquisition, 'le relevé laisse une acquisition');
  const nouveau = catalogueDuFichier(variablesDuCatalogue(acquisition), 'ucm');
  const ancien = await catalogueParLesLectures(f.figma);
  assert.ok(ancien);
  assert.deepEqual({ ...nouveau, collections: parCle(nouveau.collections) }, { ...ancien, collections: parCle(ancien.collections) });
  assert.ok(nouveau.variables.some((variable) => variable.nom === 'color/red/500'), 'la cible de library entre au catalogue');
  assert.ok(nouveau.collections.some((collection) => collection.nom === 'lib'));
});

test('le message structure est identique, constats, corrections, ignorés et ordre compris, avec et sans acquisition', async () => {
  const avec = fichierUcm();
  await lireLeReleve(avec);
  await lireLaStructure(avec);
  const sans = fichierUcm();
  await lireLeReleve(sans);
  perimerLAcquisition();
  await lireLaStructure(sans);
  const a = structureEnvoyee(avec);
  const b = structureEnvoyee(sans);
  assert.ok(a && a.type === 'structure' && a.constats.length > 0, 'la fixture produit des constats');
  assert.deepEqual(a, { ...b, demande: 2 });
  assert.equal(appelsDe('lire-structure')?.getVariableByIdAsync, avec.nombreDeLocales + 1, 'le second passage a bien relu Figma');
});

test('le bilan de Nomenclature est identique avec les locales du relevé et avec sa propre lecture', async () => {
  const partage = fichierUcm();
  const releve = lireLeReleve(partage);
  const noms = nomenclature(partage, true);
  await Promise.all([releve, noms.analyser()]);
  const seul = fichierUcm();
  const nomsSeul = nomenclature(seul, false);
  await nomsSeul.analyser();
  assert.ok(noms.bilan(), 'un bilan est rendu');
  assert.deepEqual(noms.bilan(), nomsSeul.bilan());
  assert.equal(partage.appels.getLocalVariablesAsync, 1);
  assert.equal(seul.appels.getLocalVariablesAsync, 1);
});

test('lireInventaire avec des locales reprises n’appelle ni collections ni variables, et rend le même inventaire', async () => {
  const f = fichierUcm();
  const collections = await f.figma.variables.getLocalVariableCollectionsAsync();
  const variables = await f.figma.variables.getLocalVariablesAsync();
  const lu = await lireInventaire(creerPortDeLecture(f.figma), { pause: async () => {} });
  const appelsAvant = { ...f.appels };
  const repris = await lireInventaire(creerPortDeLecture(f.figma, async () => ({ collections: collections as never, variables: variables as never })), { pause: async () => {} });
  assert.deepEqual(f.appels, appelsAvant, 'aucune lecture de plus');
  assert.deepEqual(repris, lu);
});

// D2.3 : une lecture par demande

/** Les lectures de données partagées du nœud racine, par clé, pendant `travail`. */
async function lecturesDeLaRacine(f: Fichier, travail: () => Promise<void>): Promise<Record<string, number>> {
  const racine = f.figma.root as unknown as { getSharedPluginData(espace: string, cle: string): string };
  const origine = racine.getSharedPluginData;
  const lectures: Record<string, number> = {};
  racine.getSharedPluginData = (espace, cle) => { lectures[cle] = (lectures[cle] ?? 0) + 1; return origine(espace, cle); };
  try { await travail(); } finally { racine.getSharedPluginData = origine; }
  return lectures;
}

test('lire-structure lit le réglage d’écriture, les clés d’Ignorer et la déclaration une fois chacun, et une nouvelle demande les relit', async () => {
  const f = fichierUcm();
  await lireLeReleve(f);
  const premiere = await lecturesDeLaRacine(f, () => lireLaStructure(f, 2));
  const seconde = await lecturesDeLaRacine(f, () => lireLaStructure(f, 3));
  assert.deepEqual(Object.values(premiere), Object.values(premiere).map(() => 1), JSON.stringify(premiere));
  assert.ok(Object.keys(premiere).length >= 3, 'déclaration, écriture et clés d’Ignorer');
  assert.deepEqual(seconde, premiere, 'aucune mémoire d’une demande à l’autre');
});

// Qui reprend l'acquisition

test('lire-structure ne reprend l’acquisition qu’une fois : un second lire-structure lit Figma', async () => {
  const f = fichierUcm();
  await lireLeReleve(f);
  await lireLaStructure(f, 2);
  await lireLaStructure(f, 3);
  assert.equal(appelsDe('lire-structure')?.getVariableByIdAsync, f.nombreDeLocales + 1);
});

test('Ignorer ou Appliquer entre le relevé et lire-structure ferme la reprise', async () => {
  const f = fichierUcm();
  await lireLeReleve(f);
  await traiterAvec(ACCES_DE_FIGMA)({ type: 'ignorer-role', demande: 2, role: 'surface/subtle' }, f.contexte);
  await lireLaStructure(f, 3);
  assert.equal(appelsDe('lire-structure')?.getVariableByIdAsync, f.nombreDeLocales + 1, 'le lire-structure suivant lit Figma');
});

test('la reprise expire après DELAI_DE_REPRISE', () => {
  let maintenant = 1000;
  commencerUneAcquisition(() => maintenant).conclure({ revision: 1, luA: 0, lues: { collections: new Map(), variables: new Map(), manquees: new Map(), ecartees: new Set() }, idsLocaux: [] });
  maintenant += DELAI_DE_REPRISE + 1;
  assert.equal(prendreLAcquisitionPourLaStructure(() => maintenant), null);
  commencerUneAcquisition(() => maintenant).conclure({ revision: 2, luA: 0, lues: { collections: new Map(), variables: new Map(), manquees: new Map(), ecartees: new Set() }, idsLocaux: [] });
  assert.equal(prendreLAcquisitionPourLaStructure(() => maintenant + DELAI_DE_REPRISE)?.revision, 2);
});

test('un nouvel Actualiser qui commence ferme la reprise de l’ancien', () => {
  const lues = { collections: new Map(), variables: new Map(), manquees: new Map(), ecartees: new Set<string>() };
  commencerUneAcquisition().conclure({ revision: 1, luA: 0, lues, idsLocaux: [] });
  commencerUneAcquisition();
  assert.equal(prendreLAcquisitionPourLaStructure(), null);
});

test('Nomenclature lancé après la fin du relevé lit Figma', async () => {
  const f = fichierUcm();
  await lireLeReleve(f);
  await nomenclature(f, true).analyser();
  assert.equal(f.appels.getLocalVariablesAsync, 2);
});

test('une écriture pendant que Nomenclature attend les locales du relevé lui fait lire Figma', async () => {
  const f = fichierUcm();
  const releve = lireLeReleve(f);
  const attente = attendreLesLocalesEnCours();
  perimerLAcquisition();
  assert.equal(await attente, null);
  await releve;
  assert.equal(acquisitionCourante(), null, 'le relevé commencé avant l’écriture n’est pas retenu');
});

test('un relevé annulé laisse l’acquisition précédente, un relevé en échec n’en laisse aucune', async () => {
  const f = fichierUcm();
  await lireLeReleve(f, 1);
  const premiere = acquisitionCourante();
  assert.ok(premiere);
  annulees.add(2);
  await lireLeReleve(f, 2);
  assert.equal(acquisitionCourante(), premiere);
  assert.ok(f.envoyes.some((message) => message.type === 'annulation' && message.demande === 2));
  const casse = fichierUcm({ leveLesLocales: true });
  await lireLeReleve(casse, 3);
  assert.equal(acquisitionCourante(), null);
  assert.ok(casse.envoyes.some((message) => message.type === 'lecture-echouee'));
});

test('une lecture refusée ne valide aucune acquisition : lire-structure relit Figma', async () => {
  const f = fichierUcm();
  const refusee = new Set([f.distante.id]);
  const avecRefus = fichierUcm({ refusees: refusee });
  await lireLeReleve(avecRefus);
  assert.equal(acquisitionCourante(), null);
  await lireLaStructure(avecRefus);
  assert.equal(appelsDe('lire-structure')?.getVariableByIdAsync, avecRefus.nombreDeLocales + 1);
});

test('l’acquisition garde des objets convertis, pas ceux de Figma', async () => {
  const f = fichierUcm();
  await lireLeReleve(f);
  const acquisition = acquisitionCourante()!;
  const variables = [...acquisition.lues.variables.values()];
  assert.ok(variables.length > 0);
  assert.ok(variables.every((variable) => !('getSharedPluginData' in variable)));
  assert.deepEqual(JSON.parse(JSON.stringify(acquisition.lues.variables.get(variables[0]!.id))), variables[0]);
  const message = f.envoyes.find((envoye) => envoye.type === 'releve');
  assert.ok(message && message.type === 'releve');
  assert.equal(acquisition.revision, message.releve.revision, 'l’acquisition porte la révision du relevé envoyé');
  assert.equal(acquisition.idsLocaux.length, f.nombreDeLocales);
});

test('l’acquisition garde les modes de Figma, le relevé ceux de separerLesModes', async () => {
  const f = fichierUcm();
  await lireLeReleve(f);
  const message = f.envoyes.find((envoye) => envoye.type === 'releve');
  assert.ok(message && message.type === 'releve');
  const lib = message.releve.collections.find((collection) => collection.id === 'C:lib');
  assert.ok(lib);
  assert.deepEqual(acquisitionCourante()!.lues.collections.get('C:lib')!.modes.map((mode) => mode.id), ['C:lib:M']);
});

// Les sites d'écriture

function acquerir(): void {
  commencerUneAcquisition().conclure({ revision: 1, luA: 0, lues: { collections: new Map(), variables: new Map(), manquees: new Map(), ecartees: new Set() }, idsLocaux: [] });
  assert.ok(acquisitionCourante(), 'la fixture pose une acquisition');
}

function stockage(): PortDeRegles {
  const donnees = new Map<string, string>();
  return { cles: () => [...donnees.keys()], lire: (cle) => donnees.get(cle) ?? '', ecrire: (cle, texte) => { donnees.set(cle, texte); }, effacer: (cle) => { donnees.delete(cle); } };
}

const sessionVide = (): SessionEcriture => ({
  inventaire: { entrees: [], marque: 'absente' }, collection: () => null, variable: () => null, commitUndo: () => {},
});

test('pendantUneEcriture périme avant, après, et quand l’écriture lève ou rend une promesse', async () => {
  acquerir();
  let pendant: unknown = 'non lu';
  pendantUneEcriture(() => { pendant = acquisitionCourante(); });
  assert.equal(pendant, null);
  acquerir();
  assert.throws(() => pendantUneEcriture(() => { acquerir(); throw new Error('Figma'); }), /Figma/);
  assert.equal(acquisitionCourante(), null);
  acquerir();
  await pendantUneEcriture(async () => { await Promise.resolve(); acquerir(); });
  assert.equal(acquisitionCourante(), null, 'l’écriture asynchrone périme aussi à sa fin');
});

test('une lecture commencée pendant une écriture n’est pas retenue', () => {
  const lecture = commencerUneAcquisition();
  perimerLAcquisition();
  lecture.conclure({ revision: 1, luA: 0, lues: { collections: new Map(), variables: new Map(), manquees: new Map(), ecartees: new Set() }, idsLocaux: [] });
  assert.equal(acquisitionCourante(), null);
  assert.equal(prendreLAcquisitionPourLaStructure(), null);
  fermerLaReprise();
});

test('site noms.ts : appliquerLesRenommages périme l’acquisition, y compris sur un refus', () => {
  acquerir();
  appliquerLesRenommages({ demandes: [], session: sessionVide(), stockage: stockage() });
  assert.equal(acquisitionCourante(), null);
});

test('site noms.ts : annulerLeDernierRenommage périme l’acquisition, y compris sans journal', () => {
  acquerir();
  annulerLeDernierRenommage({ session: sessionVide(), stockage: stockage() });
  assert.equal(acquisitionCourante(), null);
});

const THEME = 'C:T';
const CLAIR = 'C:T:light';
const SOMBRE = 'C:T:dark';
const collectionsDuMonde = [{ id: THEME, name: 'theme', modes: ['light', 'dark'] }, { id: 'C:B', name: 'brands', modes: ['Marque'] }];
const palette = (id: string, nom: string) => ({ id, key: `k-${id.slice(2)}`, name: nom, scopes: [], valuesByMode: {}, collection: 'C:B' });
const defaut = () => ({ id: 'V:1', key: 'k-defaut', name: 'success/surface/default', scopes: ['TEXT_FILL'], collection: THEME, valuesByMode: { [CLAIR]: alias('V:b1'), [SOMBRE]: alias('V:b2') } });

function mondeDEcriture() {
  const a = atelierDEcriture({ locales: [defaut(), palette('V:b1', 'primary/light/50'), palette('V:b2', 'primary/dark/100')], collections: collectionsDuMonde });
  const vus: unknown[] = [];
  const enregistrer = (): void => { vus.push(acquisitionCourante()); };
  const variables = a.api.variables;
  const api = {
    ...a.api,
    variables: {
      ...variables,
      getLocalVariablesAsync: async () => { enregistrer(); return variables.getLocalVariablesAsync(); },
      createVariable: (nom: string, collection: { id: string }, type: string) => { enregistrer(); return variables.createVariable(nom, collection, type); },
    },
  };
  return { a, api: api as unknown as ApiDeStructure, vus, regles: stockage() };
}

const scope = (): Correction => ({
  id: 'C63:k-defaut:scopes', sorte: 'scope', cible: { variable: 'k-defaut' }, avant: 'TEXT_FILL', apres: { nom: 'FRAME_FILL,SHAPE_FILL' },
  aRelire: { regle: 'Le chemin déclare les scopes.', avant: 'TEXT_FILL' },
});

test('site structure.ts : ecrireLaStructure périme l’acquisition avant sa première lecture et après son écriture', async () => {
  acquerir();
  const m = mondeDEcriture();
  const rendu = await ecrireLaStructure([scope()], { api: m.api, stockage: m.regles, heure: () => 'h', lot: () => 'lot' });
  assert.deepEqual(rendu.ecrites, ['C63:k-defaut:scopes']);
  assert.deepEqual(m.vus, [null]);
  assert.equal(acquisitionCourante(), null);
});

test('site structure.ts : la création d’une variable (creerUneVariableAliasee) périme l’acquisition', async () => {
  acquerir();
  const m = mondeDEcriture();
  const creation: Correction = {
    id: `C82:variable-absente:${THEME}:primary/surface/subtle`, sorte: 'variable', cible: {}, avant: null, apres: { nom: 'primary/surface/subtle', collection: 'theme' },
    aRelire: { regle: 'r', avant: null },
    creation: {
      collection: THEME, nom: 'primary/surface/subtle', type: 'COLOR', scopes: ['FRAME_FILL'],
      alias: { [CLAIR]: { cle: 'k-b1', nom: 'primary/light/50' }, [SOMBRE]: { cle: 'k-b2', nom: 'primary/dark/100' } },
    },
  };
  const rendu = await ecrireLaStructure([creation], { api: m.api, stockage: m.regles, heure: () => 'h', lot: () => 'lot' });
  assert.equal(rendu.ecrites.length, 1);
  assert.ok(m.vus.length >= 2 && m.vus.every((vu) => vu === null), 'aucune lecture ni création ne voit l’acquisition');
  assert.equal(acquisitionCourante(), null);
});

test('site structure.ts : annulerLeDernierLotDeStructure périme l’acquisition, y compris sans journal', async () => {
  acquerir();
  const m = mondeDEcriture();
  const rendu = await annulerLeDernierLotDeStructure({ api: m.api, stockage: m.regles });
  assert.equal(rendu.journal, 'absent');
  assert.equal(acquisitionCourante(), null);
});

test('site structure.ts : annuler un lot qui a écrit périme l’acquisition', async () => {
  const m = mondeDEcriture();
  const options = { api: m.api, stockage: m.regles, heure: () => 'h', lot: () => 'lot' };
  await ecrireLaStructure([scope()], options);
  acquerir();
  const rendu = await annulerLeDernierLotDeStructure(options);
  assert.equal(rendu.defaites, 1);
  assert.equal(acquisitionCourante(), null);
});

test('site variables.ts : creerLesVariables périme l’acquisition, y compris sur un refus', async () => {
  acquerir();
  const vus: unknown[] = [];
  const a = atelierDEcriture({ locales: [], collections: collectionsDuMonde });
  const variables = a.api.variables;
  const api = {
    ...a.api,
    variables: { ...variables, getLocalVariableCollectionsAsync: async () => { vus.push(acquisitionCourante()); return variables.getLocalVariableCollectionsAsync(); } },
  } as unknown as ApiDeVariables & { root: unknown };
  const rendu = await creerLesVariables({ variables: [], questions: [] } as never, { api: api as never, stockage: stockage() });
  assert.equal(rendu.refus, 'sans-destination');
  assert.deepEqual(vus, [null]);
  assert.equal(acquisitionCourante(), null);
});

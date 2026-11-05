/**
 * La relecture qui suit Appliquer (D4b) : après une écriture, le `lire-structure` de l'interface relit tout Figma. Chaque geste est
 * joué sur un fichier de test dont l'écriture et la lecture partagent les mêmes objets, comme dans Figma ; le message `structure`
 * de cette relecture est comparé, entier et dans son ordre, à celui d'un Actualiser complet (`lire-releve` puis `lire-structure`,
 * qui reprend l'acquisition du relevé). Aucune voie ciblée n'existe : les tests prouvent le repli complet et qu'aucune correction
 * ne survit à l'écriture qui l'a rendue périmée.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import { VARIABLES_DE_PALETTE, SUPPORT_DES_VARIABLES, cranDeLaVariable, type ModeDuTheme } from '@ucm-kit/core/emplois';
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, texteDeLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import { annulerLeDernierLotDeStructure, ecrireLaStructure, type ApiDeStructure } from '../src/ecriture/structure';
import { creerPortDeRegles } from '../src/ecriture/noms';
import { oublierLesPassagesDuModeTokens, passagesDuModeTokens } from '../src/lecture';
import type { PluginMessage } from '../src/messages';
import { oublierLAcquisition, pendantUneEcriture } from '../src/sandbox/acquisition';
import { prendreLaPlaceDUneEcriture, reinitialiserLAnalyse } from '../src/sandbox/analyse';
import { annulees, traiter as traiterLArbre } from '../src/sandbox/arbre';
import type { Contexte } from '../src/sandbox/contexte';
import { ACCES_DE_FIGMA, oublierLaLectureGardee, traiterAvec, type Acces } from '../src/sandbox/structure';

const MODES: readonly ModeDuTheme[] = ['light', 'dark'];
const CRANS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const couleur = { r: 0.2, g: 0.4, b: 0.6, a: 1 };
const ECRITURE = { version: 1, groupes: { casse: 'minuscules', separateur: 'tiret' }, variables: { casse: 'minuscules', separateur: 'tiret' } };

interface VariableDuMonde {
  readonly id: string;
  readonly key: string;
  name: string;
  readonly description: string;
  readonly remote: boolean;
  readonly hiddenFromPublishing: boolean;
  readonly variableCollectionId: string;
  readonly resolvedType: string;
  scopes: string[];
  readonly codeSyntax: Record<string, string>;
  valuesByMode: Record<string, unknown>;
  getSharedPluginData(): string;
  setValueForMode(mode: string, valeur: unknown): void;
  remove(): void;
}

interface CollectionDuMonde {
  readonly id: string;
  readonly name: string;
  readonly key: string;
  readonly remote: boolean;
  readonly hiddenFromPublishing: boolean;
  readonly isExtension: boolean;
  readonly modes: { modeId: string; name: string }[];
  readonly defaultModeId: string;
  variableIds: string[];
}

/**
 * Un fichier UCM dont l'écriture (`ecrireLaStructure`) et la lecture (le sandbox) passent par les mêmes objets : une écriture se
 * relit, une annulation aussi. `refusees` fait lever la lecture par identifiant. Un test qui change une variable sans passer par
 * `ecrireLaStructure` ni `pendantUneEcriture` joue un changement à la main ou un Ctrl+Z de Figma : rien ne le signale au sandbox.
 */
function monde() {
  const themeId = 'C:theme';
  const brandsId = 'C:brands';
  const utilityId = 'C:utility';
  const variables: VariableDuMonde[] = [];
  const collections: CollectionDuMonde[] = [];
  const donnees = new Map<string, string>([
    [`${ESPACE_ARCHITECT}/${CLE_ARCHITECTURE_DU_FICHIER}`, texteDeLArchitectureDuFichier(true)],
    [`${ESPACE_ARCHITECT}/ecriture`, JSON.stringify(ECRITURE)],
  ]);
  const refusees = new Set<string>();
  const appels: Record<string, number> = {};
  const compter = (nom: string): void => { appels[nom] = (appels[nom] ?? 0) + 1; };
  let creations = 0;

  const collection = (id: string, name: string, modes: readonly string[]): CollectionDuMonde => {
    const creee: CollectionDuMonde = {
      id, name, key: `cle-${id}`, remote: false, hiddenFromPublishing: false, isExtension: false,
      modes: modes.map((mode) => ({ modeId: `${id}:${mode}`, name: mode })), defaultModeId: `${id}:${modes[0]}`, variableIds: [],
    };
    collections.push(creee);
    return creee;
  };
  collection(themeId, 'theme', MODES);
  collection(brandsId, 'brands', ['Marque']);
  collection(utilityId, 'utility', ['Mode 1']);

  const fabriquer = (collectionId: string, id: string, key: string, nom: string, valeurs: Record<string, unknown>, scopes: readonly string[], distante = false): VariableDuMonde => {
    const variable: VariableDuMonde = {
      id, key, name: nom, description: '', remote: distante, hiddenFromPublishing: false, variableCollectionId: collectionId, resolvedType: 'COLOR',
      scopes: [...scopes], codeSyntax: {}, valuesByMode: valeurs, getSharedPluginData: () => '',
      setValueForMode(mode, valeur) { variable.valuesByMode = { ...variable.valuesByMode, [mode]: valeur }; },
      remove() {
        variables.splice(variables.indexOf(variable), 1);
        const parente = collections.find((candidate) => candidate.id === collectionId);
        if (parente) parente.variableIds = parente.variableIds.filter((autre) => autre !== id);
      },
    };
    return variable;
  };
  const ajouter = (collectionId: string, id: string, key: string, nom: string, valeurs: Record<string, unknown>, scopes: readonly string[]): VariableDuMonde => {
    const variable = fabriquer(collectionId, id, key, nom, valeurs, scopes);
    variables.push(variable);
    collections.find((candidate) => candidate.id === collectionId)?.variableIds.push(id);
    return variable;
  };
  let rang = 0;
  const nouvelle = (collectionId: string, nom: string, valeurs: Record<string, unknown>, scopes: readonly string[] = []): VariableDuMonde => {
    rang += 1;
    return ajouter(collectionId, `VariableID:${rang}:0`, `cle-${rang}`, nom, valeurs, scopes);
  };

  const palette = new Map<string, VariableDuMonde>();
  for (const mode of MODES) for (const cran of CRANS) palette.set(`${mode}/${cran}`, nouvelle(brandsId, `primary/${mode}/${cran}`, { [`${brandsId}:Marque`]: couleur }));
  const blancs = new Map(MODES.map((mode) => [mode, nouvelle(utilityId, `neutral/${mode}/white`, { [`${utilityId}:Mode 1`]: couleur })] as const));
  // Une variable de library que le thème vise : lue par identifiant, collection distante comprise.
  const distante = fabriquer('C:lib', 'VariableID:cle-lib/9:9', 'cle-lib', 'color/red/500', { 'C:lib:M': couleur }, [], true);
  const collectionDistante: CollectionDuMonde = {
    id: 'C:lib', name: 'lib', key: 'cle-C:lib', remote: true, hiddenFromPublishing: false, isExtension: false, modes: [{ modeId: 'C:lib:M', name: 'M' }], defaultModeId: 'C:lib:M', variableIds: [distante.id],
  };
  const roles = VARIABLES_DE_PALETTE.filter((role) => role !== 'surface/subtle' && role !== 'surface/divider');
  for (const role of roles) {
    const valeurs = Object.fromEntries(MODES.map((mode) => {
      if (role === 'ring') return [`${themeId}:${mode}`, alias(distante.id)];
      const cible = role === 'solid/foreground' ? blancs.get(mode)! : palette.get(`${mode}/${cranDeLaVariable(role, mode, mode === 'light' ? 'normal' : 'inverse')}`)!;
      return [`${themeId}:${mode}`, alias(cible.id)];
    }));
    nouvelle(themeId, `primary/${role}`, valeurs, SUPPORT_DES_VARIABLES[role].portees);
  }

  const figma = {
    root: {
      name: 'Fichier', documentColorProfile: 'SRGB',
      getSharedPluginData: (espace: string, cle: string) => donnees.get(`${espace}/${cle}`) ?? '',
      getSharedPluginDataKeys: (espace: string) => [...donnees.keys()].filter((cle) => cle.startsWith(`${espace}/`)).map((cle) => cle.slice(espace.length + 1)),
      setSharedPluginData: (espace: string, cle: string, valeur: string) => { donnees.set(`${espace}/${cle}`, valeur); },
      findAll: () => [],
    },
    async loadAllPagesAsync() {},
    commitUndo() {},
    variables: {
      async getLocalVariableCollectionsAsync() { compter('getLocalVariableCollectionsAsync'); return collections; },
      async getLocalVariablesAsync() { compter('getLocalVariablesAsync'); return [...variables]; },
      async getVariableByIdAsync(id: string) {
        compter('getVariableByIdAsync');
        if (refusees.has(id)) throw new Error('Accès refusé');
        return [...variables, distante].find((variable) => variable.id === id) ?? null;
      },
      async getVariableCollectionByIdAsync(id: string) { compter('getVariableCollectionByIdAsync'); return [...collections, collectionDistante].find((candidate) => candidate.id === id) ?? null; },
      async importVariableByKeyAsync() { compter('importVariableByKeyAsync'); throw new Error('Clé absente'); },
      createVariable(nom: string, dans: { id: string }) {
        creations += 1;
        return ajouter(dans.id, `VariableID:neuve-${creations}:0`, `cle-neuve-${creations}`, nom, {}, ['ALL_SCOPES']);
      },
      createVariableAlias: (variable: { id: string }) => alias(variable.id),
    },
  };
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: figma as unknown as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument: () => {} };
  const api = figma as unknown as ApiDeStructure;
  const stockage = creerPortDeRegles(figma as unknown as PluginAPI);
  let lot = 0;
  const ecritures: string[][] = [];
  const acces: Acces = {
    ...ACCES_DE_FIGMA,
    ecrire: (corrections, nomsLus) => {
      ecritures.push(corrections.map(({ id }) => id));
      return ecrireLaStructure(corrections, { api, stockage, heure: () => 'h', lot: () => `lot-${(lot += 1)}`, nomsLus });
    },
  };
  return {
    figma, api, stockage, contexte, envoyes, acces, appels, refusees, variables, palette, ecritures,
    variable: (nom: string, collectionId = themeId) => variables.find((variable) => variable.name === nom && variable.variableCollectionId === collectionId)!,
  };
}

type Monde = ReturnType<typeof monde>;

beforeEach(() => {
  reinitialiserLAnalyse();
  oublierLAcquisition();
  oublierLaLectureGardee();
  oublierLesPassagesDuModeTokens();
  annulees.clear();
});

type Structure = Extract<PluginMessage, { type: 'structure' }>;

const structureEnvoyee = (m: Monde): Structure => m.envoyes.filter((message): message is Structure => message.type === 'structure').at(-1)!;
const sansNumero = (message: Structure): Structure => ({ ...message, demande: 0 });

/** Un Actualiser complet : le relevé acquiert les variables, puis `lire-structure` reprend cette acquisition. */
async function actualiser(m: Monde, demande: number): Promise<Structure> {
  await traiterLArbre({ type: 'lire-releve', demande }, m.contexte);
  await traiterAvec(m.acces)({ type: 'lire-structure', demande: demande + 1 }, m.contexte);
  return structureEnvoyee(m);
}

/**
 * La relecture que l'interface envoie après `structure-appliquee` : un `lire-structure` seul, sans relevé avant. Elle rend le message
 * et les appels de Figma de sa lecture du catalogue.
 */
async function relireApresAppliquer(m: Monde, demande: number): Promise<{ readonly message: Structure; readonly appels: Record<string, number> }> {
  oublierLesPassagesDuModeTokens();
  await traiterAvec(m.acces)({ type: 'lire-structure', demande }, m.contexte);
  const appels = passagesDuModeTokens().find(({ phase }) => phase === 'lire-le-catalogue')?.appels ?? {};
  return { message: structureEnvoyee(m), appels };
}

/** La relecture est complète : une lecture des variables locales, puis une lecture par identifiant de chacune et de la cible de library. */
function assertLectureComplete(m: Monde, appels: Record<string, number>): void {
  assert.equal(appels.getLocalVariablesAsync, 1);
  assert.equal(appels.getVariableByIdAsync, m.variables.length + 1);
}

/** La relecture après un geste rend, entière et dans son ordre, le message d'un Actualiser complet. */
async function relireEtComparer(m: Monde, demande: number): Promise<Structure> {
  const { message, appels } = await relireApresAppliquer(m, demande);
  assertLectureComplete(m, appels);
  assert.deepEqual(sansNumero(message), sansNumero(await actualiser(m, demande + 1)));
  return message;
}

const traiter = (m: Monde) => traiterAvec(m.acces);
const appliquer = (m: Monde, demande: number, ids: readonly string[]) => traiter(m)({ type: 'appliquer-structure', demande, ids }, m.contexte);
const reponse = (m: Monde): Extract<PluginMessage, { type: 'structure-appliquee' }> =>
  m.envoyes.filter((message): message is Extract<PluginMessage, { type: 'structure-appliquee' }> => message.type === 'structure-appliquee').at(-1)!;
const identifiants = (message: Structure): string[] => message.corrections.map(({ id }) => id);

/**
 * Un thème dont `primary/surface/default` vise le cran 900 en light au lieu de 100 (un alias à corriger) et dont `primary/solid/hover`
 * porte un scope de texte (un scope à corriger), avec les deux créations de C82 que le thème attend. `primary/ring` vise une
 * variable de library.
 */
function fichierAvecUnAliasFaux() {
  const m = monde();
  const defaut = m.variable('primary/surface/default');
  defaut.valuesByMode = { ...defaut.valuesByMode, 'C:theme:light': alias(m.palette.get('light/900')!.id) };
  const fautive = m.variable('primary/solid/hover');
  fautive.scopes = ['TEXT_FILL'];
  return {
    m, defaut, fautive,
    scope: `C63:${fautive.key}:scopes`,
    cran: `C82:cran:${defaut.key}:C:theme:light`,
    creation: 'C82:variable-absente:C:theme:primary/surface/subtle',
    autre: 'C82:variable-absente:C:theme:primary/surface/divider',
  };
}

test('le fichier de test propose un scope, un alias de mode et deux créations, et son Actualiser lit les variables une fois', async () => {
  const f = fichierAvecUnAliasFaux();
  const premier = await actualiser(f.m, 1);
  assert.deepEqual([f.scope, f.cran, f.creation, f.autre].filter((id) => !identifiants(premier).includes(id)), []);
  assert.equal(f.m.appels.getLocalVariablesAsync, 1, 'l’Actualiser est complet et sa lecture de structure reprend le relevé');
});

test('création : la relecture est complète, rend le message d’un Actualiser, et ne propose plus la création écrite', async () => {
  const f = fichierAvecUnAliasFaux();
  const avant = await actualiser(f.m, 1);
  await appliquer(f.m, 3, [f.creation]);
  assert.equal(reponse(f.m).ecrites, 1);
  assert.ok(f.m.variable('primary/surface/subtle'), 'la variable existe dans le fichier');
  const apres = await relireEtComparer(f.m, 4);
  assert.ok(identifiants(avant).includes(f.creation));
  assert.ok(!identifiants(apres).includes(f.creation), 'la création écrite n’est plus proposée');
  assert.ok(identifiants(apres).includes(f.autre), 'les autres créations restent');
  assert.ok(!apres.constats.some(({ id }) => id === f.creation), 'son constat C82 a disparu');
});

test('alias modifié : la relecture est complète, rend le message d’un Actualiser, et le jugement de cran disparaît', async () => {
  const f = fichierAvecUnAliasFaux();
  const avant = await actualiser(f.m, 1);
  await appliquer(f.m, 3, [f.cran]);
  assert.equal(reponse(f.m).ecrites, 1);
  const apres = await relireEtComparer(f.m, 4);
  assert.ok(avant.constats.some(({ id }) => id === f.cran));
  assert.ok(!apres.constats.some(({ id }) => id === f.cran));
  assert.deepEqual(identifiants(apres).filter((id) => id !== f.scope && id !== f.creation && id !== f.autre), [], 'rien d’autre ne se propose');
});

test('scope : la relecture est complète et rend le message d’un Actualiser', async () => {
  const f = fichierAvecUnAliasFaux();
  await actualiser(f.m, 1);
  await appliquer(f.m, 3, [f.scope]);
  assert.deepEqual([...f.fautive.scopes].sort(), [...SUPPORT_DES_VARIABLES['solid/hover'].portees].sort());
  const apres = await relireEtComparer(f.m, 4);
  assert.ok(!apres.constats.some(({ id }) => id === f.scope));
});

test('renommage écrit par Nomenclature : la relecture suit les noms, comme un Actualiser', async () => {
  const f = fichierAvecUnAliasFaux();
  const avant = await actualiser(f.m, 1);
  // Nomenclature écrit sous `pendantUneEcriture` (`ecriture/noms.ts`) : le nom perd son rôle reconnu.
  pendantUneEcriture(() => { f.defaut.name = 'primary/surface/fond'; });
  const apres = await relireEtComparer(f.m, 3);
  assert.ok(!avant.constats.some(({ faits }) => faits.variable === 'surface/default' && faits.genre === 'variable-absente'));
  assert.ok(apres.constats.some(({ faits }) => faits.variable === 'surface/default' && faits.genre === 'variable-absente'), 'le rôle perdu devient une variable absente');
  assert.ok(!apres.constats.some(({ id }) => id === f.cran), 'le jugement de cran de la variable renommée a disparu');
});

test('renommage puis correction de structure dans le même Appliquer : la correction de la variable renommée saute, la relecture la propose de nouveau', async () => {
  const f = fichierAvecUnAliasFaux();
  const avant = await actualiser(f.m, 1);
  const visees = f.defaut.valuesByMode['C:theme:light'];
  // Le renommage garde le rôle reconnu (la casse seule change) : la cible de l'alias et les scopes lus tiennent encore, mais le nom lu n'est plus celui de la variable.
  pendantUneEcriture(() => { f.defaut.name = 'Primary/Surface/Default'; });
  await appliquer(f.m, 3, [f.cran, f.scope]);
  assert.deepEqual(f.m.ecritures.at(-1), [f.cran, f.scope], 'les deux corrections partent à l’écriture');
  assert.equal(reponse(f.m).ecrites, 1, 'seule la correction de la variable qui n’a pas été renommée s’écrit');
  assert.deepEqual(reponse(f.m).sautees, [{ id: f.cran, motif: 'objet-change' }], 'la variable renommée n’est pas écrite');
  assert.equal(f.defaut.valuesByMode['C:theme:light'], visees, 'l’alias de la variable renommée n’a pas changé');
  assert.ok(identifiants(avant).includes(f.cran));
  const apres = await relireEtComparer(f.m, 4);
  assert.ok(!apres.constats.some(({ id }) => id === f.scope), 'la correction écrite a disparu');
});

test('un renommage entre la lecture et l’écriture saute la correction de scope, sans rien écrire', async () => {
  const f = fichierAvecUnAliasFaux();
  await actualiser(f.m, 1);
  pendantUneEcriture(() => { f.fautive.name = 'primary/solid/survol'; });
  await appliquer(f.m, 3, [f.scope]);
  assert.equal(reponse(f.m).ecrites, 0);
  assert.deepEqual(reponse(f.m).sautees, [{ id: f.scope, motif: 'objet-change' }]);
  assert.deepEqual(f.fautive.scopes, ['TEXT_FILL'], 'les scopes calculés pour l’ancien rôle ne sont pas écrits');
  await relireEtComparer(f.m, 4);
});

test('sans renommage, la correction d’une variable qui garde son nom s’écrit', async () => {
  const f = fichierAvecUnAliasFaux();
  await actualiser(f.m, 1);
  await appliquer(f.m, 3, [f.scope, f.cran]);
  assert.equal(reponse(f.m).ecrites, 2);
  assert.deepEqual(reponse(f.m).sautees, []);
});

test('écriture partielle : une correction périmée et une écriture refusée sont sautées, une création s’écrit, la relecture propose le reste', async () => {
  const f = fichierAvecUnAliasFaux();
  await actualiser(f.m, 1);
  // Entre la lecture et Appliquer, le designer change les scopes de la variable à la main et Figma refuse l'écriture de l'alias.
  f.fautive.scopes = ['FRAME_FILL'];
  f.defaut.setValueForMode = () => { throw new Error('Figma refuse'); };
  await appliquer(f.m, 3, [f.scope, f.cran, f.creation]);
  const rendu = reponse(f.m);
  assert.equal(rendu.ecrites, 1);
  assert.deepEqual([...rendu.sautees].sort((a, b) => a.id.localeCompare(b.id)), [{ id: f.scope, motif: 'fait-faux' }, { id: f.cran, motif: 'erreur' }]);
  assert.deepEqual(f.fautive.scopes, ['FRAME_FILL'], 'le scope périmé n’est pas écrit');
  const apres = await relireEtComparer(f.m, 4);
  assert.equal(apres.corrections.find(({ id }) => id === f.scope)?.aRelire.avant, 'FRAME_FILL', 'la correction vient des scopes d’aujourd’hui, pas de ceux de la première lecture');
  assert.ok(identifiants(apres).includes(f.cran), 'l’alias refusé se propose encore');
  assert.ok(!identifiants(apres).includes(f.creation), 'la création écrite ne se propose plus');
});

test('refus de lecture : la relecture rend le message d’un Actualiser refusé, ne se garde pas pour Ignorer, et la lecture permise est complète', async () => {
  const f = fichierAvecUnAliasFaux();
  await actualiser(f.m, 1);
  await appliquer(f.m, 3, [f.scope]);
  f.m.refusees.add('VariableID:cle-lib/9:9');
  const refusee = await relireApresAppliquer(f.m, 4);
  assert.ok(refusee.message.constats.length > 0, 'la lecture refusée reste affichée, comme avant D4');
  assert.deepEqual(sansNumero(refusee.message), sansNumero(await actualiser(f.m, 5)), 'un Actualiser refusé rend la même chose');
  await appliquer(f.m, 7, [f.scope]);
  assert.deepEqual(reponse(f.m).sautees, [{ id: f.scope, motif: 'correction-inconnue' }], 'une correction déjà écrite ne se rejoue pas');
  f.m.refusees.clear();
  const permise = await relireEtComparer(f.m, 8);
  assert.ok(identifiants(permise).includes(f.cran), 'la lecture permise rend de nouveau les corrections');
});

test('une lecture refusée ne se garde pas pour Ignorer : la lecture suivante, permise, est refaite', async () => {
  const f = fichierAvecUnAliasFaux();
  f.m.refusees.add('VariableID:cle-lib/9:9');
  await relireApresAppliquer(f.m, 1);
  f.m.refusees.clear();
  const lectures = f.m.appels.getLocalVariablesAsync;
  await traiter(f.m)({ type: 'ignorer-role', demande: 2, role: 'surface/divider' }, f.m.contexte);
  assert.equal(f.m.appels.getLocalVariablesAsync, lectures + 1, 'Ignorer relit Figma au lieu de refiltrer la lecture refusée');
  assert.deepEqual(sansNumero(structureEnvoyee(f.m)).ignores, { constats: [], roles: ['surface/divider'] });
  assert.ok(!structureEnvoyee(f.m).constats.some(({ code, faits }) => code === 'C63' && faits.genre === 'alias-supprime'), 'la lecture permise ne garde pas les constats du refus');
});

test('Ctrl+Z de l’Historique : la relecture est complète, rend le message d’un Actualiser, et retrouve celui d’avant l’écriture', async () => {
  const f = fichierAvecUnAliasFaux();
  const avant = await actualiser(f.m, 1);
  await appliquer(f.m, 3, [f.scope, f.cran, f.creation]);
  assert.equal(reponse(f.m).ecrites, 3);
  const ecrite = await relireEtComparer(f.m, 4);
  assert.ok(!identifiants(ecrite).includes(f.creation));
  const annulation = await annulerLeDernierLotDeStructure({ api: f.m.api, stockage: f.m.stockage });
  assert.equal(annulation.defaites, 3);
  const defaite = await relireEtComparer(f.m, 6);
  assert.deepEqual(sansNumero(defaite), sansNumero(avant), 'les trois corrections reviennent, avec leurs `aRelire` d’origine');
});

test('Ctrl+Z de Figma, que rien ne signale : l’Actualiser suivant le voit, Ignorer refiltre la dernière lecture (limite de D4a)', async () => {
  const f = fichierAvecUnAliasFaux();
  const avant = await actualiser(f.m, 1);
  await appliquer(f.m, 3, [f.scope]);
  const ecrite = await relireEtComparer(f.m, 4);
  assert.ok(!identifiants(ecrite).includes(f.scope));
  f.fautive.scopes = ['TEXT_FILL'];
  await traiter(f.m)({ type: 'ignorer-role', demande: 6, role: 'surface/divider' }, f.m.contexte);
  assert.ok(!identifiants(structureEnvoyee(f.m)).includes(f.scope), 'rien ne dit à Ignorer que Figma a changé : il montre la dernière lecture');
  const relevee = await actualiser(f.m, 7);
  assert.ok(identifiants(relevee).includes(f.scope), 'un Actualiser voit le Ctrl+Z');
  assert.deepEqual(identifiants(relevee).filter((id) => id !== f.autre), identifiants(avant).filter((id) => id !== f.autre));
});

// Aucune correction ne vient d'un catalogue périmé

type Ecrire = Acces['ecrire'];

for (const [nom, ecrire] of [
  ['réussie', async (corrections) => ({ ecrites: corrections.map(({ id }) => id), sautees: [], sansAnnulation: [] })],
  ['refusée', async (corrections) => ({ ecrites: [], sautees: corrections.map(({ id }) => ({ id, motif: 'erreur' as const })), sansAnnulation: [] })],
  ['qui lève', async () => { throw new Error('Figma'); }],
] as readonly (readonly [string, Ecrire])[]) {
  test(`une écriture ${nom} oublie la lecture gardée : Ignorer relit Figma, même si l’écriture ne périme rien`, async () => {
    const f = fichierAvecUnAliasFaux();
    f.m.acces.ecrire = ecrire;
    await actualiser(f.m, 1);
    await traiter(f.m)({ type: 'ignorer-role', demande: 3, role: 'surface/divider' }, f.m.contexte);
    const lecturesAvant = f.m.appels.getLocalVariablesAsync;
    await traiter(f.m)({ type: 'ignorer-role', demande: 4, role: 'surface/subtle' }, f.m.contexte);
    assert.equal(f.m.appels.getLocalVariablesAsync, lecturesAvant, 'la lecture gardée sert avant l’écriture');
    await appliquer(f.m, 5, [f.cran]);
    await traiter(f.m)({ type: 'retablir-role', demande: 6, role: 'surface/subtle' }, f.m.contexte);
    assert.equal(f.m.appels.getLocalVariablesAsync, lecturesAvant + 1, 'après l’écriture, le catalogue est relu');
  });
}

test('une demande refusée par une opération en cours n’écrit rien et garde la lecture gardée', async () => {
  const f = fichierAvecUnAliasFaux();
  await actualiser(f.m, 1);
  await traiter(f.m)({ type: 'ignorer-role', demande: 3, role: 'surface/divider' }, f.m.contexte);
  const lectures = f.m.appels.getLocalVariablesAsync;
  const place = await prendreLaPlaceDUneEcriture({ sujet: 'autre', generation: 1 });
  assert.ok('liberer' in place);
  await appliquer(f.m, 4, [f.cran]);
  assert.deepEqual(reponse(f.m).sautees, [{ id: f.cran, motif: 'occupe' }]);
  place.liberer();
  await traiter(f.m)({ type: 'retablir-role', demande: 5, role: 'surface/divider' }, f.m.contexte);
  assert.equal(f.m.appels.getLocalVariablesAsync, lectures, 'rien n’a été écrit : la lecture gardée sert encore');
});

test('une correction écrite n’est plus rejouée : un second Appliquer des mêmes identifiants n’écrit rien', async () => {
  const f = fichierAvecUnAliasFaux();
  await actualiser(f.m, 1);
  await appliquer(f.m, 3, [f.scope, f.cran]);
  const ecritures = f.m.ecritures.length;
  await appliquer(f.m, 4, [f.scope, f.cran]);
  assert.deepEqual(reponse(f.m).sautees, [{ id: f.scope, motif: 'correction-inconnue' }, { id: f.cran, motif: 'correction-inconnue' }]);
  assert.equal(f.m.ecritures.length, ecritures);
});

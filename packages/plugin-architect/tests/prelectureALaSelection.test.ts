/**
 * La prélecture à la sélection (lot 16, 16.16) : le moment (silence de 1 s, annulation par tout événement), la relance
 * des libraries toutes les 5 s, et l'absence d'import par clé. Le déroulé de l'analyse discrète, sa promotion et la prise au
 * premier plan par un clic ont leurs cas dans `paritesDeSession.test.ts`, qui les compare à Actualiser.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { CatalogueDeReference, ReleveDeComposant } from '@ucm-kit/core/controles';
import type { ResultatSansPublication } from 'ucm-plugin-socle/src/composant/contract/exportComponent';

import type { PluginMessage } from '../src/messages';
import { catalogueDeFigma, analysesLanceesParLeDesigner, annulerLaPrelecture, etatDeLEntree, operationEnCours, reinitialiserLAnalyse, sessionDesAnalyses, traiterAvec, type Lecteurs } from '../src/sandbox/analyse';
import { abandonnerLesLibrariesAnticipees, rafraichirLesLibraries, uneLectureAnticipeeExiste } from '../src/sandbox/anticipation';
import type { Contexte } from '../src/sandbox/contexte';
import { BORNE_DE_LA_RELANCE_MS, creerLaPrelecture, RELANCE_DES_LIBRARIES_MS, SILENCE_AVANT_PRELECTURE_MS, type DependancesDeLaPrelecture } from '../src/sandbox/prelecture';
import { collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

beforeEach(() => { reinitialiserLAnalyse(); abandonnerLesLibrariesAnticipees(); });

/** Une horloge que le test avance à la main : `planifier` range les rappels, `avancer` les rejoue dans l'ordre de leur échéance. */
function horlogeFausse() {
  let temps = 0;
  const taches: Array<{ echeance: number; rappel: () => void }> = [];
  return {
    maintenant: () => temps,
    planifierEnCours: () => taches.length,
    planifier(rappel: () => void, ms: number): () => void {
      const tache = { echeance: temps + ms, rappel };
      taches.push(tache);
      return () => { const rang = taches.indexOf(tache); if (rang >= 0) taches.splice(rang, 1); };
    },
    avancer(ms: number): void {
      const but = temps + ms;
      for (;;) {
        const suivante = taches.filter(({ echeance }) => echeance <= but).sort((a, b) => a.echeance - b.echeance)[0];
        if (!suivante) break;
        taches.splice(taches.indexOf(suivante), 1);
        temps = suivante.echeance;
        suivante.rappel();
      }
      temps = but;
    },
  };
}

interface Compte { lancees: number; annulees: number; libraries: number }

function planche(surcharge: Partial<DependancesDeLaPrelecture> = {}) {
  const horloge = horlogeFausse();
  const compte: Compte = { lancees: 0, annulees: 0, libraries: 0 };
  const etat = { sujet: true, operation: null as ReturnType<DependancesDeLaPrelecture['operationEnCours']>, analyses: 0 };
  const prelecture = creerLaPrelecture({
    aUnSujet: () => etat.sujet,
    lancer: async () => { compte.lancees += 1; },
    annuler: () => { compte.annulees += 1; },
    operationEnCours: () => etat.operation,
    analysesDuDesigner: () => etat.analyses,
    relancerLesLibraries: async () => { compte.libraries += 1; },
    planifier: horloge.planifier,
    maintenant: horloge.maintenant,
    ...surcharge,
  });
  return { prelecture, horloge, compte, etat };
}

test('la prélecture part après 1 s sans événement : chaque sélection, changement de nœud ou de style relance le silence', () => {
  const { prelecture, horloge, compte } = planche();
  prelecture.surSelection();
  horloge.avancer(SILENCE_AVANT_PRELECTURE_MS - 1);
  assert.equal(compte.lancees, 0);
  prelecture.surChangement();
  horloge.avancer(SILENCE_AVANT_PRELECTURE_MS - 1);
  assert.equal(compte.lancees, 0, 'un changement reprend le silence de zéro');
  prelecture.surSelection();
  horloge.avancer(SILENCE_AVANT_PRELECTURE_MS - 1);
  assert.equal(compte.lancees, 0, 'une sélection aussi');
  horloge.avancer(1);
  assert.equal(compte.lancees, 1);
  assert.equal(compte.annulees, 3, 'chaque événement a levé le jeton de la prélecture en cours');
  horloge.avancer(10 * SILENCE_AVANT_PRELECTURE_MS);
  assert.equal(compte.lancees, 1, 'une seule prélecture par silence');
});

test('un événement pendant la prélecture la reprend de zéro après 1 s de silence', () => {
  const { prelecture, horloge, compte } = planche();
  prelecture.surSelection();
  horloge.avancer(SILENCE_AVANT_PRELECTURE_MS);
  assert.equal(compte.lancees, 1);
  horloge.avancer(15_000);
  prelecture.surChangement();
  assert.equal(compte.annulees, 2);
  horloge.avancer(SILENCE_AVANT_PRELECTURE_MS - 1);
  assert.equal(compte.lancees, 1);
  horloge.avancer(1);
  assert.equal(compte.lancees, 2);
});

test('sans composant sélectionné, rien ne part ; un changement de nœud sur une sélection sans sujet n’arme rien', () => {
  const { prelecture, horloge, compte, etat } = planche();
  etat.sujet = false;
  prelecture.surSelection();
  prelecture.surChangement();
  horloge.avancer(10 * 60_000);
  assert.deepEqual({ lancees: compte.lancees, libraries: compte.libraries }, { lancees: 0, libraries: 0 });
  assert.equal(horloge.planifierEnCours(), 0);
  etat.sujet = true;
  prelecture.surSelection();
  etat.sujet = false;
  prelecture.surSelection();
  horloge.avancer(10 * 60_000);
  assert.deepEqual({ lancees: compte.lancees, libraries: compte.libraries }, { lancees: 0, libraries: 0 }, 'désélectionner annule le silence et la relance');
});

test('les libraries se relancent toutes les 5 s tant que la sélection reste, et s’arrêtent 2 minutes après la sélection', () => {
  const { prelecture, horloge, compte } = planche();
  prelecture.surSelection();
  horloge.avancer(RELANCE_DES_LIBRARIES_MS - 1);
  assert.equal(compte.libraries, 0);
  horloge.avancer(1);
  assert.equal(compte.libraries, 1);
  horloge.avancer(2 * RELANCE_DES_LIBRARIES_MS);
  assert.equal(compte.libraries, 3);
  horloge.avancer(10 * BORNE_DE_LA_RELANCE_MS);
  assert.equal(compte.libraries, BORNE_DE_LA_RELANCE_MS / RELANCE_DES_LIBRARIES_MS - 1, 'dernière relance à 115 s, aucune à 120 s');
  // Un changement de nœud ne rouvre pas la relance : seule une sélection la repart.
  prelecture.surChangement();
  horloge.avancer(60_000);
  assert.equal(compte.libraries, BORNE_DE_LA_RELANCE_MS / RELANCE_DES_LIBRARIES_MS - 1);
  prelecture.surSelection();
  horloge.avancer(RELANCE_DES_LIBRARIES_MS);
  assert.equal(compte.libraries, BORNE_DE_LA_RELANCE_MS / RELANCE_DES_LIBRARIES_MS);
});

test('la relance se tait pendant une prélecture ou une écriture, et s’arrête pour de bon quand le designer lance une analyse', () => {
  const { prelecture, horloge, compte, etat } = planche();
  prelecture.surSelection();
  etat.operation = 'prelecture';
  horloge.avancer(3 * RELANCE_DES_LIBRARIES_MS);
  assert.equal(compte.libraries, 0, 'la prélecture lit elle-même les libraries');
  etat.operation = 'ecriture';
  horloge.avancer(RELANCE_DES_LIBRARIES_MS);
  assert.equal(compte.libraries, 0);
  etat.operation = null;
  horloge.avancer(RELANCE_DES_LIBRARIES_MS);
  assert.equal(compte.libraries, 1);
  etat.analyses += 1;
  etat.operation = 'analyse';
  horloge.avancer(RELANCE_DES_LIBRARIES_MS);
  etat.operation = null;
  horloge.avancer(10 * RELANCE_DES_LIBRARIES_MS);
  assert.equal(compte.libraries, 1, 'l’analyse a arrêté la relance, même finie avant le tic suivant');
  assert.equal(horloge.planifierEnCours(), 0);
});

test('fermer le plugin retire les minuteries et annule la prélecture en cours', () => {
  const { prelecture, horloge, compte } = planche();
  prelecture.surSelection();
  prelecture.fermer();
  horloge.avancer(10 * 60_000);
  assert.deepEqual({ lancees: compte.lancees, libraries: compte.libraries }, { lancees: 0, libraries: 0 });
  assert.equal(compte.annulees, 2);
  assert.equal(horloge.planifierEnCours(), 0);
});

// L'analyse réelle derrière le moment : le silence lance une demande d'origine `prelecture`, un événement l'annule sans rien promouvoir.

const dimensions = { x: 0, y: 0, largeur: 20, hauteur: 20 };

const releveLie = (): ReleveDeComposant => ({
  version: 1, jeu: { cle: 'alert-set', id: 'alert-set', nom: 'Alert' }, proprietes: [],
  variants: [{ id: 'v1', nom: 'Alert', valeurs: {}, modesEffectifs: {}, layers: [{
    id: 'racine', nom: 'racine', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions, peintures: [], valeursEnDur: [],
    liaisons: [{ champ: 'fills', indice: 0, porteur: 'racine', variable: { id: 'v-bouton', cle: 'v-bouton', nom: 'alert/color/info/background', collection: 'cc', distante: true } }],
  }] }],
  lecture: { layersLus: 1, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
});

const catalogueVide: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };
const moteurComplet = async (): Promise<ResultatSansPublication> => ({ etat: 'calculee', interne: { warnings: [], parties: new Map(), localisations: new Map(), couverture: { etat: 'complete' } } as never });

function contexteDeTest(): { contexte: Contexte; envoyes: PluginMessage[] } {
  const envoyes: PluginMessage[] = [];
  return { envoyes, contexte: { figma: { root: { getSharedPluginData: () => '' } } as unknown as PluginAPI, envoyer: (message) => envoyes.push(message), surveillerLeDocument() {} } };
}

test('le silence lance une prélecture discrète que le moment suivant annule ; la seconde, laissée finir, promeut son entrée', async () => {
  const { contexte, envoyes } = contexteDeTest();
  let entrees = 0;
  let ouvrir!: () => void;
  const portail = new Promise<void>((resolve) => { ouvrir = resolve; });
  let arrivee!: () => void;
  const arrive = new Promise<void>((resolve) => { arrivee = resolve; });
  const lecteurs: Lecteurs = {
    async sujet() { return { cle: 'alert-set', noeud: { id: 'alert-set' } as never, noeuds: ['alert-set', 'v1'], couverture: { instances: 'descendues', complete: true, trous: [] } }; },
    async releve(_sujet, jeton) {
      entrees += 1;
      if (entrees === 1) { arrivee(); await portail; }
      return jeton.leve ? { statut: 'annule' } : { statut: 'lu', releve: releveLie() };
    },
    catalogue: async () => catalogueVide,
    moteur: moteurComplet,
  };
  const traiter = traiterAvec(lecteurs, { pauseDiscrete: async () => {} });
  let derniere: Promise<void> = Promise.resolve();
  const { prelecture, horloge } = planche({
    lancer: () => (derniere = traiter({ type: 'analyser', origine: 'prelecture' }, contexte)),
    annuler: () => { annulerLaPrelecture(); },
    operationEnCours,
    analysesDuDesigner: analysesLanceesParLeDesigner,
  });
  prelecture.surSelection();
  horloge.avancer(SILENCE_AVANT_PRELECTURE_MS);
  await arrive;
  assert.equal(operationEnCours(), 'prelecture');
  prelecture.surChangement();
  ouvrir();
  await derniere;
  assert.equal(sessionDesAnalyses().entree('alert-set'), null, 'une prélecture interrompue ne promeut rien');
  horloge.avancer(SILENCE_AVANT_PRELECTURE_MS);
  await derniere;
  assert.equal(entrees, 2, 'la prélecture a repris de zéro');
  assert.equal(etatDeLEntree('alert-set').etat, 'utilisable');
  assert.deepEqual(envoyes, [], 'aucun message vers l’interface pendant ni après les prélectures');
});

test('une prélecture lancée alors que la précédente finit son annulation attend sa fin au lieu de se perdre', async () => {
  const { contexte, envoyes } = contexteDeTest();
  let ouvrir!: () => void;
  const portail = new Promise<void>((resolve) => { ouvrir = resolve; });
  let arrivee!: () => void;
  const arrive = new Promise<void>((resolve) => { arrivee = resolve; });
  let entrees = 0;
  const lecteurs: Lecteurs = {
    async sujet() { return { cle: 'alert-set', noeud: { id: 'alert-set' } as never, noeuds: ['alert-set', 'v1'], couverture: { instances: 'descendues', complete: true, trous: [] } }; },
    async releve(_sujet, jeton) {
      entrees += 1;
      if (entrees === 1) { arrivee(); await portail; }
      return jeton.leve ? { statut: 'annule' } : { statut: 'lu', releve: releveLie() };
    },
    catalogue: async () => catalogueVide,
    moteur: moteurComplet,
  };
  const traiter = traiterAvec(lecteurs, { pauseDiscrete: async () => {} });
  const premiere = traiter({ type: 'analyser', origine: 'prelecture' }, contexte);
  await arrive;
  assert.equal(annulerLaPrelecture(), true);
  const seconde = traiter({ type: 'analyser', origine: 'prelecture' }, contexte);
  ouvrir();
  await Promise.all([premiere, seconde]);
  assert.equal(entrees, 2);
  assert.equal(etatDeLEntree('alert-set').etat, 'utilisable');
  assert.deepEqual(envoyes, []);
});

// Aucun import par clé : `importVariableByKeyAsync` abonne le fichier à la variable.

function figmaDeLibrary() {
  const fond = { ...variableFigma('VariableID:v-bouton/1:2', 'comp', 'alert/color/info/background', 'COLOR', { 'comp:Valeur': { r: 1, g: 1, b: 1, a: 1 } }, true), key: 'v-bouton' };
  const { port, appels } = portDeTest([], [], [], [collectionFigma('comp', 'components', ['Valeur'], [], true)], { importables: [fond] });
  const teamLibrary = {
    async getAvailableLibraryVariableCollectionsAsync() { return [{ key: 'cc', name: 'components', libraryName: 'Intencial' }]; },
    async getVariablesInLibraryCollectionAsync() { return [{ key: 'v-bouton', name: 'alert/color/info/background', resolvedType: 'COLOR' }]; },
  };
  return { figma: { teamLibrary, root: { getSharedPluginData: () => '' }, variables: port } as unknown as PluginAPI, appels };
}

const imports = (appels: ReadonlyMap<string, number>): string[] => [...appels.keys()].filter((cle) => cle.startsWith('import:'));

test('le catalogue d’une library lu sans import laisse non chargée la clé qu’il aurait importée, et compte l’import évité', async () => {
  const { figma, appels } = figmaDeLibrary();
  const { contexte } = contexteDeTest();
  let evites = 0;
  const sans = await catalogueDeFigma(releveLie(), { leve: false }, { ...contexte, figma }, undefined, undefined, undefined, { sansImport: true, importsEvites: (n) => { evites += n; } });
  assert.deepEqual(imports(appels), [], 'aucun importVariableByKeyAsync');
  assert.equal(evites, 1);
  assert.equal(sans.variables.find(({ cle }) => cle === 'v-bouton')?.etat, 'non-chargee');
  const avec = await catalogueDeFigma(releveLie(), { leve: false }, { ...contexte, figma }, undefined, undefined, undefined);
  assert.deepEqual(imports(appels), ['import:v-bouton']);
  assert.equal(avec.variables.find(({ cle }) => cle === 'v-bouton')?.etat, 'presente');
});

test('le catalogue du fichier lu sans import ne suit pas une cible d’alias par sa clé', async () => {
  const locale = variableFigma('L1', 'c1', 'alert/size/radius', 'COLOR', { 'c1:m': { type: 'VARIABLE_ALIAS', id: 'VariableID:cle-x/1:2' } });
  const { port, appels } = portDeTest([collectionFigma('c1', 'components', ['m'], ['L1'])], [locale]);
  const figma = { root: { getSharedPluginData: () => '' }, variables: port } as unknown as PluginAPI;
  const { contexte } = contexteDeTest();
  let evites = 0;
  await catalogueDeFigma(releveLie(), { leve: false }, { ...contexte, figma }, undefined, undefined, undefined, { sansImport: true, importsEvites: (n) => { evites += n; } });
  assert.deepEqual(imports(appels), []);
  assert.equal(evites, 1);
  await catalogueDeFigma(releveLie(), { leve: false }, { ...contexte, figma }, undefined, undefined, undefined);
  assert.deepEqual(imports(appels), ['import:cle-x']);
});

test('une prélecture entière ne fait aucun import, library lisible ou non', async () => {
  const { figma, appels } = figmaDeLibrary();
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma, envoyer: (message) => envoyes.push(message), surveillerLeDocument() {} };
  const lecteurs: Lecteurs = {
    async sujet() { return { cle: 'alert-set', noeud: { id: 'alert-set' } as never, noeuds: ['alert-set', 'v1'], couverture: { instances: 'descendues', complete: true, trous: [] } }; },
    releve: async () => ({ statut: 'lu', releve: releveLie() }),
    bibliotheques: async () => ({ etat: 'lue', collections: [{ cle: 'cc', nom: 'components', library: 'Intencial', variables: [{ cle: 'v-bouton', nom: 'alert/color/info/background', type: 'COLOR' }] }], illisibles: [] }),
    catalogue: catalogueDeFigma,
    moteur: moteurComplet,
  };
  await traiterAvec(lecteurs, { pauseDiscrete: async () => {} })({ type: 'analyser', origine: 'prelecture' }, contexte);
  assert.deepEqual(imports(appels), [], 'aucun import pendant la prélecture');
  assert.deepEqual(envoyes, []);
  assert.equal(sessionDesAnalyses().entree('alert-set'), null, 'le catalogue incomplet n’est pas promu');
  await traiterAvec(lecteurs, { pauseDiscrete: async () => {} })({ type: 'analyser', demande: 1 }, contexte);
  assert.deepEqual(imports(appels), ['import:v-bouton'], 'la demande du clic importe la clé manquante');
});

// La relance des libraries tient la mémoire de Figma chaude (E6).

function figmaDeLibraries(journal: { inventaires: number }, options: { delai?: number } = {}) {
  return {
    teamLibrary: {
      async getAvailableLibraryVariableCollectionsAsync() {
        journal.inventaires += 1;
        await new Promise((resolve) => setTimeout(resolve, options.delai ?? 0));
        return [{ key: 'c', name: 'components', libraryName: 'Intencial' }];
      },
      async getVariablesInLibraryCollectionAsync() { return [{ key: 'k', name: 'a/b', resolvedType: 'COLOR' }]; },
    },
  } as unknown as PluginAPI;
}

test('rafraichirLesLibraries lance une lecture sans attendre la récence, vérifie une lecture finie et n’en double pas une en cours', async () => {
  const journal = { inventaires: 0 };
  const figma = figmaDeLibraries(journal, { delai: 20 });
  assert.equal(uneLectureAnticipeeExiste(figma), false);
  const premiere = rafraichirLesLibraries(figma);
  assert.equal(uneLectureAnticipeeExiste(figma), true);
  const pendant = rafraichirLesLibraries(figma);
  await Promise.all([premiere, pendant]);
  assert.equal(journal.inventaires, 1, 'une lecture en cours s’attend');
  await rafraichirLesLibraries(figma);
  assert.equal(journal.inventaires, 2, 'une lecture finie se relit pour la vérifier');
  await rafraichirLesLibraries(figma);
  assert.equal(journal.inventaires, 3);
});

test('rafraichirLesLibraries relance après un échec de la lecture anticipée, sans attendre la minute de récence', async () => {
  const journal = { inventaires: 0 };
  const figma = figmaDeLibraries(journal);
  const teamLibrary = (figma as unknown as { teamLibrary: { getAvailableLibraryVariableCollectionsAsync(): Promise<unknown> } }).teamLibrary;
  const lire = teamLibrary.getAvailableLibraryVariableCollectionsAsync;
  teamLibrary.getAvailableLibraryVariableCollectionsAsync = async () => { throw new Error('réseau coupé'); };
  await rafraichirLesLibraries(figma);
  teamLibrary.getAvailableLibraryVariableCollectionsAsync = lire;
  await rafraichirLesLibraries(figma);
  assert.equal(journal.inventaires, 1, 'la seconde lecture a eu lieu malgré la récence');
});

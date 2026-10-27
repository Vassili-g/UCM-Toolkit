/**
 * La validation d'une entrée de session avant qu'une demande Analyser reprenne le résultat du moteur : modifications sans
 * notification couvrante, conditions de page et de couverture, Actualiser, et parité avec une analyse complète.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import type { CatalogueDeReference, LayerLu, ReleveDeComposant } from '@ucm-kit/core/controles';
import { creerInventairesDeLaDemande } from 'ucm-plugin-socle/src/composant/analyse/inventaires';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';
import { phraseDe, type PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';

import type { PluginMessage } from '../src/messages';
import { modelesDeLAnalyse, type ReleveDesRegles } from '../src/regles';
import {
  analyseCourante, correctionsDeLAnalyse, dependancesDeFigma, etatDeLEntree, reinitialiserLAnalyse, sessionDesAnalyses, traiterAvec,
  type DependancesDuMoteur, type EtatDeLEntree, type Lecteurs,
} from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';

/** Le fichier simulé : chaque lecteur en rend une copie, jamais l'objet lui-même, pour que seule une comparaison profonde dise l'égalité. */
interface Fichier {
  page: string | null;
  variable: { id: string; cle: string; nom: string };
  valeur: number;
  layers: LayerLu[];
  dependances: DependancesDuMoteur;
  regles: ReleveDesRegles;
}

const layer = (id: string, variable: Fichier['variable'], instanceDe?: LayerLu['instanceDe']): LayerLu => ({
  id, nom: id, type: instanceDe ? 'INSTANCE' : 'FRAME', parent: null, visible: true, opacite: 1,
  dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 }, peintures: [],
  liaisons: [{ champ: 'cornerRadius', porteur: id, variable: { ...variable, collection: 'components', distante: false } }],
  valeursEnDur: [],
  ...(instanceDe ? { instanceDe } : {}),
});

function fichierDeDepart(): Fichier {
  const variable = { id: 'VariableID:1', cle: 'k-rayon', nom: 'alert/size/radius' };
  return {
    page: 'page-1',
    variable,
    valeur: 12,
    layers: [layer('fond', variable), layer('bord', variable)],
    dependances: {
      regles: { intent: null, propDescriptions: {}, booleanDescriptions: {}, enumDefaults: {}, iconRules: [], warnings: [], sectionFound: false, releve: { conteneurDuComposant: false, conteneurVierge: null, maitreLocal: null, instanceSource: null }, aRediger: 0, tagsARediger: [] },
      collectionsLocales: [{ id: 'c1', nom: 'components' }],
      variablesLocales: [{ id: 'VariableID:1', nom: 'alert/size/radius', collection: 'c1' }],
      styles: [],
      instances: 0,
    },
    regles: { composant: { id: 'jeu-Alert', nom: 'Alert' }, instancePresente: false, modele: { nom: 'Alert', sections: [] }, proprietes: [], documentees: [] },
  };
}

const releveDe = (fichier: Fichier): ReleveDeComposant => structuredClone({
  version: 1,
  jeu: { cle: 'Alert', id: 'jeu-Alert', nom: 'Alert' },
  proprietes: [],
  variants: [{ id: 'v-Alert', nom: 'Alert défaut', valeurs: {}, layers: fichier.layers, modesEffectifs: {} }],
  lecture: { layersLus: fichier.layers.length, layersNonLus: 0, variantsNonLus: [], manquees: [] },
  espaceDeCouleur: 'srgb',
});

const catalogueDe = (fichier: Fichier): CatalogueDeReference => structuredClone({
  version: 1, library: null,
  collections: [{ cle: 'c1', nom: 'components', role: 'components', etat: 'lue', modes: [{ id: 'Light', nom: 'Light' }] }],
  variables: [{ cle: fichier.variable.cle, nom: fichier.variable.nom, collection: 'components', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: fichier.valeur } } }],
});

/** Le moteur nomme la variable liée : un résultat repris après un renommage garderait l'ancien nom. */
function moteurDe(fichier: Fichier): ResultatInterne {
  const point: PointACorriger = { famille: 'variables', titre: `Variable « ${fichier.variable.nom} » : à vérifier.`, impact: 'Impact.', action: 'Action.' };
  const phrase = phraseDe(point);
  return { warnings: [phrase], parties: new Map([[phrase, point]]), localisations: new Map(), props: {}, stateModel: null, imbriques: { auParent: [] }, couverture: { etat: 'complete' } } as unknown as ResultatInterne;
}

interface Banc {
  contexte: Contexte;
  envoyes: PluginMessage[];
}

function banc(): Banc {
  const envoyes: PluginMessage[] = [];
  return { envoyes, contexte: { figma: { root: { getSharedPluginData: () => '' } } as unknown as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} } };
}

interface Appels {
  moteur: number;
  regles: number;
  /** L'état de l'entrée quand le moteur est appelé : la marque que la validation vient de poser, ou aucune. */
  etats: EtatDeLEntree[];
}

function lecteursDe(fichier: Fichier, appels: Appels): Lecteurs {
  return {
    async sujet() {
      const noeud = fichier.page === null ? { id: 'jeu-Alert', type: 'COMPONENT_SET' } : { id: 'jeu-Alert', type: 'COMPONENT_SET', parent: { id: fichier.page, type: 'PAGE' } };
      return { cle: 'Alert', noeud: noeud as never, noeuds: ['jeu-Alert', 'v-Alert', 'fond', 'bord'], couverture: { instances: 'descendues', complete: true, trous: [] } };
    },
    releve: async () => ({ statut: 'lu', releve: releveDe(fichier) }),
    catalogue: async () => catalogueDe(fichier),
    dependances: async () => structuredClone(fichier.dependances),
    regles: async () => { appels.regles += 1; return structuredClone(fichier.regles); },
    moteur: async () => {
      appels.moteur += 1;
      appels.etats.push(etatDeLEntree('Alert'));
      return { etat: 'calculee', interne: moteurDe(fichier) };
    },
  };
}

/** Ce que l'interface reçoit et ce que le sandbox retient pour l'analyse affichée, sans la génération ni la progression. */
function affichage(b: Banc) {
  const identite = analyseCourante();
  assert.ok(identite);
  return {
    messages: b.envoyes
      .filter(({ type }) => type !== 'analyse-en-cours' && type !== 'analyse-commencee')
      .map((message) => ('analyse' in message && message.analyse ? { ...message, analyse: { sujet: message.analyse.sujet } } : message)),
    corrections: [...correctionsDeLAnalyse(identite) ?? []],
    modeles: [...modelesDeLAnalyse()],
  };
}

function preparer() {
  const fichier = fichierDeDepart();
  const appels: Appels = { moteur: 0, regles: 0, etats: [] };
  const lectures = lecteursDe(fichier, appels);
  const demander = async (intention: 'analyser' | 'actualiser' = 'analyser', avec: Lecteurs = lectures) => {
    const b = banc();
    await traiterAvec(avec)({ type: 'analyser', intention, demande: 1 }, b.contexte);
    return affichage(b);
  };
  return { fichier, appels, lectures, demander };
}

/** Après un changement sans événement, Analyser refuse la reprise pour `raisons`, relance le moteur et affiche ce qu'Actualiser affiche. */
async function refuseeEtComplete(changer: (fichier: Fichier) => void, raisons: readonly string[]): Promise<void> {
  const { fichier, appels, demander } = preparer();
  await demander();
  assert.deepEqual(etatDeLEntree('Alert'), { etat: 'utilisable' });
  changer(fichier);
  const analysee = await demander();
  assert.equal(appels.moteur, 2, 'le moteur est relancé');
  assert.deepEqual(appels.etats[1], { etat: 'invalide', raisons });
  const actualisee = await demander('actualiser');
  assert.equal(appels.moteur, 3);
  assert.equal(JSON.stringify(analysee), JSON.stringify(actualisee));
  assert.deepEqual(analysee, actualisee);
}

beforeEach(() => reinitialiserLAnalyse());

test('sans changement, Analyser valide l’entrée, ne rappelle pas le moteur et affiche ce qu’une analyse complète affiche', async () => {
  const { appels, demander } = preparer();
  await demander();
  const retenue = sessionDesAnalyses().entree('Alert');
  assert.ok(retenue);
  const reprise = await demander();
  assert.equal(appels.moteur, 1, 'le moteur n’est pas rappelé');
  assert.equal(appels.regles, 2, 'les règles se relisent pour la validation');
  const promue = sessionDesAnalyses().entree('Alert');
  assert.ok(promue && promue !== retenue, 'la reprise promeut une nouvelle entrée');
  assert.equal(promue.sorties.moteur, retenue.sorties.moteur, 'son moteur est celui de l’entrée validée');
  const complete = await demander('actualiser');
  assert.equal(appels.moteur, 2);
  assert.equal(JSON.stringify(reprise), JSON.stringify(complete), 'même objet affiché, dans le même ordre');
  assert.deepEqual(reprise, complete);
  assert.ok(reprise.messages.some((message) => message.type === 'analyse' && JSON.stringify(message.constats).includes('Variable « alert/size/radius »')), 'le constat du moteur est affiché');
});

test('une valeur de variable changée sans événement se voit au catalogue', async () => {
  await refuseeEtComplete((fichier) => { fichier.valeur = 14; }, ['different:catalogue']);
});

test('une variable liée renommée sans événement se voit au relevé et au catalogue, et le moteur relancé la nomme', async () => {
  await refuseeEtComplete((fichier) => {
    fichier.variable = { ...fichier.variable, nom: 'alert/size/corner' };
    fichier.layers = fichier.layers.map(({ id }) => layer(id, fichier.variable));
  }, ['different:releve', 'different:catalogue']);
});

test('une liaison changée sans événement se voit au relevé', async () => {
  await refuseeEtComplete((fichier) => {
    fichier.layers = [fichier.layers[0], layer('bord', { id: 'VariableID:2', cle: 'k-autre', nom: 'alert/size/other' })];
  }, ['different:releve']);
});

test('les mêmes calques dans un autre ordre sont un écart du relevé', async () => {
  await refuseeEtComplete((fichier) => { fichier.layers = [...fichier.layers].reverse(); }, ['different:releve']);
});

test('un jeu qui porte une instance ne reprend jamais le moteur, et un maître distant changé se voit au relevé', async () => {
  const { fichier, appels, demander } = preparer();
  const maitre = { cle: 'icone', nom: 'Icon', distante: true, pilotee: null };
  fichier.layers = [...fichier.layers, layer('icone', fichier.variable, maitre)];
  fichier.dependances = { ...fichier.dependances, instances: 1 };
  await demander();
  await demander();
  assert.equal(appels.moteur, 2, 'sans changement, le maître n’est pas revalidé : le moteur est relancé');
  assert.deepEqual(appels.etats[1], { etat: 'invalide', raisons: ['non-couvert:maitres'] });
  fichier.layers = [...fichier.layers.slice(0, 2), layer('icone', fichier.variable, { ...maitre, nom: 'Icon v2' })];
  const analysee = await demander();
  assert.deepEqual(appels.etats[2], { etat: 'invalide', raisons: ['non-couvert:maitres', 'different:releve'] });
  assert.deepEqual(analysee, await demander('actualiser'));
});

test('un style de texte ou d’effet empêche la reprise', async () => {
  await refuseeEtComplete((fichier) => { fichier.dependances = { ...fichier.dependances, styles: ['S:texte'] }; }, ['non-couvert:styles', 'different:dependances']);
});

test('les règles de la page, l’index des variables locales et les règles d’usage relus se comparent à ceux de l’entrée', async () => {
  await refuseeEtComplete((fichier) => { fichier.dependances = { ...fichier.dependances, regles: { ...(fichier.dependances.regles as object), aRediger: 1 } }; }, ['different:dependances']);
  reinitialiserLAnalyse();
  await refuseeEtComplete((fichier) => { fichier.dependances = { ...fichier.dependances, variablesLocales: [...fichier.dependances.variablesLocales, { id: 'VariableID:9', nom: 'alert/size/radius', collection: 'c1' }] }; }, ['different:dependances']);
  reinitialiserLAnalyse();
  await refuseeEtComplete((fichier) => { fichier.regles = { ...fichier.regles, documentees: ['severity'] }; }, ['different:regles']);
});

test('une relecture des dépendances qui lève refuse la reprise', async () => {
  const { appels, lectures, demander } = preparer();
  await demander();
  await demander('analyser', { ...lectures, dependances: async () => { throw new Error('illisible'); } });
  assert.equal(appels.moteur, 2);
  assert.deepEqual(appels.etats[1], { etat: 'invalide', raisons: ['lecture-refusee:dependances', 'different:dependances'] });
});

test('un jeu sans page, dont le moteur balaierait les règles de la page courante, ou sur une page que l’entrée n’écoutait pas, ne reprend pas le moteur', async () => {
  const sansPage = preparer();
  sansPage.fichier.page = null;
  await sansPage.demander();
  await sansPage.demander();
  assert.equal(sansPage.appels.moteur, 2);
  assert.deepEqual(sansPage.appels.etats[1], { etat: 'invalide', raisons: ['page-des-regles'] });

  reinitialiserLAnalyse();
  const deplace = preparer();
  await deplace.demander();
  deplace.fichier.page = 'page-2';
  await deplace.demander();
  assert.equal(deplace.appels.moteur, 2);
  assert.deepEqual(deplace.appels.etats[1], { etat: 'invalide', raisons: ['page-non-suivie'] });
});

test('Actualiser ne valide rien et suit le chemin complet ; sans lecteur de dépendances, Analyser aussi', async () => {
  const { appels, lectures, demander } = preparer();
  await demander();
  await demander('actualiser');
  assert.equal(appels.moteur, 2);
  assert.deepEqual(appels.etats[1], { etat: 'utilisable' }, 'aucune marque de validation');
  const { dependances: _dependances, ...sansDependances } = lectures;
  await demander('analyser', sansDependances);
  await demander('analyser', sansDependances);
  assert.equal(appels.moteur, 4);
  assert.deepEqual(appels.etats[3], { etat: 'utilisable' });
});

test('une entrée invalidée par le journal ne se valide pas : le chemin complet suit sans relire les règles pour la validation', async () => {
  const { appels, demander } = preparer();
  await demander();
  sessionDesAnalyses().invalider('Alert', ['sujet-touche']);
  await demander();
  assert.equal(appels.moteur, 2);
  assert.equal(appels.regles, 2, 'une lecture des règles par analyse');
  assert.deepEqual(appels.etats[1], { etat: 'invalide', raisons: ['sujet-touche'] });
});

test('le lecteur de Figma rend le scan des règles, les listes locales, les styles et les instances du jeu', async () => {
  let scans = 0;
  const page = { id: 'page-1', type: 'PAGE', findAllWithCriteria: ({ types }: { types: string[] }) => { if (types.includes('INSTANCE')) scans += 1; return []; } };
  const calques = [
    { id: 'texte', type: 'TEXT', textStyleId: 'S:texte' },
    { id: 'ombre', type: 'FRAME', effectStyleId: 'S:ombre' },
    { id: 'icone', type: 'INSTANCE' },
    { id: 'mele', type: 'TEXT', textStyleId: Symbol('mixed') },
    { id: 'nu', type: 'TEXT', textStyleId: '', effectStyleId: '' },
  ];
  const jeu = { id: 'jeu', type: 'COMPONENT_SET', name: 'Alert', parent: page, componentPropertyDefinitions: {}, findAll: (filtre: (noeud: unknown) => boolean) => calques.filter(filtre) };
  const figma = {
    currentPage: page,
    variables: {
      getLocalVariableCollectionsAsync: async () => [{ id: 'c1', name: 'components' }],
      getLocalVariablesAsync: async () => [{ id: 'v1', name: 'alert/size/radius', variableCollectionId: 'c1' }],
    },
  };
  const inventaires = creerInventairesDeLaDemande();
  const contexte = { figma } as unknown as Contexte;
  const lues = await dependancesDeFigma({ cle: 'Alert', noeud: jeu as never, noeuds: ['jeu'] }, contexte, inventaires);
  assert.deepEqual(lues.styles, ['S:texte', 'S:ombre', 'mixte']);
  assert.equal(lues.instances, 1);
  assert.deepEqual(lues.collectionsLocales, [{ id: 'c1', nom: 'components' }]);
  assert.deepEqual(lues.variablesLocales, [{ id: 'v1', nom: 'alert/size/radius', collection: 'c1' }]);
  assert.deepEqual((lues.regles as { releve: unknown }).releve, { conteneurDuComposant: false, conteneurVierge: null, maitreLocal: null, instanceSource: null });
  assert.equal(scans, 1);
  await inventaires.reglesDeLaPage(page, jeu, async () => { throw new Error('le moteur reprend le scan de la demande'); });
  assert.equal(scans, 1);
});

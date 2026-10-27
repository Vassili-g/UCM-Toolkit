/**
 * Parité de la session (corpus « Sessions » du contrat de parité) : après une série de mutations locales et globales,
 * Analyser après Analyser affiche ce qu'Actualiser affiche sur le même état. Une seule fixture, rejouée pour chaque cas :
 * un jeu avec une instance d'un maître local, un style de texte, des variables liées et un catalogue.
 *
 * Les dépendances sont lues par `dependancesDeFigma` sur un faux graphe de nœuds : le maître et le style que le test
 * mute sont ceux que la production relit. Une reprise effective est un Analyser qui ne rappelle pas le moteur.
 */
import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';

import type { CatalogueDeReference, LayerLu, ReleveDeComposant } from '@ucm-kit/core/controles';
import type { ChangementRecu, NoeudDEvenement } from 'ucm-plugin-socle/src/composant/analyse/couverture';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';
import { phraseDe, type PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';

import type { PluginMessage } from '../src/messages';
import { modelesDeLAnalyse, type ReleveDesRegles } from '../src/regles';
import {
  analyseCourante, correctionsDeLAnalyse, dependancesDeFigma, reinitialiserLAnalyse, sessionDesAnalyses, surChangementDeStyle, surChangementDuDocument, traiterAvec,
  type Lecteurs,
} from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';

const PAGE = 'page-1';

interface Fichier {
  variable: { id: string; cle: string; nom: string };
  valeur: number;
  niveau: 'AA' | 'AAA';
  library: { nom: string; cle: string } | null;
  layers: LayerLu[];
  maitre: { contenu: string; remote: boolean; imbrique: boolean };
  /** Les noms de composant que les conteneurs de règles de la page écrivent. */
  nomsDeLaPage: string[];
  style: { nom: string; taille: number; remote: boolean };
}

const base = (id: string, variable: Fichier['variable'], extra: Partial<LayerLu> = {}): LayerLu => ({
  id, nom: id, type: 'FRAME', parent: null, visible: true, opacite: 1,
  dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 }, peintures: [],
  liaisons: [{ champ: 'cornerRadius', porteur: id, variable: { ...variable, collection: 'components', distante: false } }],
  valeursEnDur: [],
  ...extra,
});

function fichierDeDepart(): Fichier {
  const variable = { id: 'VariableID:1', cle: 'k-rayon', nom: 'alert/size/radius' };
  return {
    variable,
    valeur: 12,
    niveau: 'AA',
    library: null,
    layers: [
      base('fond', variable),
      base('bord', variable),
      base('titre', variable, { type: 'TEXT', texte: { style: 'Body', plages: [{ debut: 0, fin: 5, fontSize: 14, fontWeight: 400, peintures: [], liaisons: [] }] } }),
      base('icone', variable, { type: 'INSTANCE', instanceDe: { cle: 'icone', nom: 'Icon', distante: false, pilotee: null } }),
    ],
    maitre: { contenu: 'rond', remote: false, imbrique: false },
    nomsDeLaPage: ['icon'],
    style: { nom: 'Body', taille: 14, remote: false },
  };
}

const releveDe = (fichier: Fichier): ReleveDeComposant => structuredClone({
  version: 1 as const,
  jeu: { cle: 'Alert', id: 'jeu-Alert', nom: 'Alert' },
  proprietes: [],
  variants: [{ id: 'v-Alert', nom: 'Alert défaut', valeurs: {}, layers: fichier.layers, modesEffectifs: {} }],
  lecture: { layersLus: fichier.layers.length, layersNonLus: 0, variantsNonLus: [], manquees: [] },
  espaceDeCouleur: 'srgb' as const,
});

const catalogueDe = (fichier: Fichier): CatalogueDeReference => structuredClone({
  version: 1 as const, library: fichier.library,
  collections: [{ cle: 'c1', nom: 'components', role: 'components' as const, etat: 'lue' as const, modes: [{ id: 'Light', nom: 'Light' }] }],
  variables: [{ cle: fichier.variable.cle, nom: fichier.variable.nom, collection: 'components', type: 'FLOAT' as const, etat: 'presente' as const, valeurs: { Light: { valeur: fichier.valeur } } }],
});

/** Le moteur nomme tout ce que le test mute : un résultat repris après une mutation garderait l'ancien état. */
function moteurDe(fichier: Fichier): ResultatInterne {
  const calques = fichier.layers.map(({ id, nom, peintures, texte }) => `${id}=${nom}:${peintures.length}:${texte?.plages[0]?.fontSize ?? ''}`).join(',');
  const point: PointACorriger = {
    famille: 'variables',
    titre: `Variable « ${fichier.variable.nom} », maître « ${fichier.maitre.contenu} », page « ${fichier.nomsDeLaPage.join('+')} », style « ${fichier.style.nom} ${fichier.style.taille} », calques ${calques} : à vérifier.`,
    impact: 'Impact.',
    action: 'Action.',
  };
  const phrase = phraseDe(point);
  return { warnings: [phrase], parties: new Map([[phrase, point]]), localisations: new Map(), props: {}, stateModel: null, imbriques: { auParent: [] }, couverture: { etat: 'complete' } } as unknown as ResultatInterne;
}

/** Le graphe Figma que `dependancesDeFigma` parcourt, relu à chaque appel depuis la fixture. */
function figmaDe(fichier: Fichier) {
  const page: { id: string; type: string; findAllWithCriteria: (criteres: { types: string[] }) => unknown[] } = {
    id: PAGE, type: 'PAGE',
    findAllWithCriteria: ({ types }) => (types.includes('TEXT') ? fichier.nomsDeLaPage.map((nom) => ({ name: 'component-name', type: 'TEXT', characters: nom, parent: { type: 'INSTANCE', parent: page } })) : []),
  };
  const fondDuMaitre = { id: 'M:icone/fond', type: 'RECTANGLE' };
  const dansLeMaitre = [fondDuMaitre, ...(fichier.maitre.imbrique ? [{ id: 'M:icone/bouton', type: 'INSTANCE' }] : [])];
  const maitre = { id: 'M:icone', type: 'COMPONENT', remote: fichier.maitre.remote, parent: fichier.maitre.remote ? null : page, findAll: () => dansLeMaitre };
  const calques = [
    { id: 'titre', type: 'TEXT', textStyleId: 'S:texte' },
    { id: 'icone', type: 'INSTANCE', getMainComponentAsync: async () => maitre },
  ];
  const jeu = { id: 'jeu-Alert', type: 'COMPONENT_SET', name: 'Alert', parent: page, componentPropertyDefinitions: {}, findAll: (filtre: (noeud: unknown) => boolean) => calques.filter(filtre) };
  const figma = {
    root: { getSharedPluginData: () => '' },
    currentPage: page,
    getStyleByIdAsync: async (id: string) => (id === 'S:texte' ? { name: fichier.style.nom, type: 'TEXT', remote: fichier.style.remote, fontSize: fichier.style.taille } : null),
    variables: {
      getLocalVariableCollectionsAsync: async () => [{ id: 'c1', name: 'components' }],
      getLocalVariablesAsync: async () => [{ id: fichier.variable.id, name: fichier.variable.nom, variableCollectionId: 'c1' }],
    },
  };
  return { figma, jeu };
}

const REGLES: ReleveDesRegles = { composant: { id: 'jeu-Alert', nom: 'Alert' }, instancePresente: false, modele: { nom: 'Alert', sections: [] }, proprietes: [], documentees: [] };

interface Banc {
  contexte: Contexte;
  envoyes: PluginMessage[];
}

function banc(fichier: Fichier): Banc {
  const envoyes: PluginMessage[] = [];
  return { envoyes, contexte: { figma: figmaDe(fichier).figma as unknown as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument() {} } };
}

function lecteursDe(fichier: Fichier, appels: { moteur: number }): Lecteurs {
  return {
    async sujet() {
      const noeuds = ['jeu-Alert', 'v-Alert', ...fichier.layers.map(({ id }) => id)];
      return { cle: 'Alert', noeud: figmaDe(fichier).jeu as never, noeuds, couverture: { instances: 'descendues', complete: true, trous: [] } };
    },
    releve: async () => ({ statut: 'lu', releve: releveDe(fichier) }),
    catalogue: async () => catalogueDe(fichier),
    niveau: async () => fichier.niveau,
    dependances: (sujet, contexte, inventaires, cooperation) => dependancesDeFigma(sujet, contexte, inventaires, cooperation),
    regles: async () => structuredClone(REGLES),
    moteur: async () => {
      appels.moteur += 1;
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
      .filter(({ type }) => type !== 'analyse-en-cours' && type !== 'analyse-commencee' && type !== 'perime')
      .map((message) => ('analyse' in message && message.analyse ? { ...message, analyse: { sujet: message.analyse.sujet } } : message)),
    corrections: [...correctionsDeLAnalyse(identite) ?? []],
    modeles: [...modelesDeLAnalyse()],
  };
}

async function demander(fichier: Fichier, appels: { moteur: number }, intention: 'analyser' | 'actualiser') {
  const b = banc(fichier);
  await traiterAvec(lecteursDe(fichier, appels))({ type: 'analyser', intention, demande: 1 }, b.contexte);
  return affichage(b);
}

/** Un changement de nœud tel que Figma l'émet : `parents` va du plus proche au plus lointain. */
function noeud(type: 'CREATE' | 'DELETE' | 'PROPERTY_CHANGE', id: string, parents: readonly string[], properties?: string[]): ChangementRecu {
  const chaine = parents.reduceRight<NoeudDEvenement | null>((parent, courant) => ({ id: courant, parent }), null);
  return { type, id, ...(properties ? { properties } : {}), node: type === 'DELETE' ? { id, removed: true } : { id, parent: chaine } };
}

const contexteDesEvenements = (fichier: Fichier): Contexte => banc(fichier).contexte;

interface Mutation {
  nom: string;
  /** Vrai quand Analyser doit reprendre le moteur de l'entrée : aucune mutation couverte ne l'a touché. */
  reprise: boolean;
  /** L'état de départ de la fixture, avant la première analyse. */
  depart?: (fichier: Fichier) => void;
  muter(fichier: Fichier): void;
  /** Les événements que Figma émet pour cette mutation ; aucun quand Figma n'en émet pas. */
  evenements?(contexte: Contexte): void;
}

const MUTATIONS: readonly Mutation[] = [
  { nom: 'aucune mutation', reprise: true, muter() {} },
  { nom: 'un changement d’un autre composant de la page', reprise: true, muter() {}, evenements: (c) => surChangementDuDocument([noeud('PROPERTY_CHANGE', 'autre', [PAGE], ['fills'])], c) },
  {
    nom: 'peinture d’un calque', reprise: false,
    muter: (f) => { f.layers[0] = { ...f.layers[0], peintures: [{ champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 1, g: 0, b: 0, a: 1 } }] }; },
    evenements: (c) => surChangementDuDocument([noeud('PROPERTY_CHANGE', 'fond', ['v-Alert', 'jeu-Alert'], ['fills'])], c),
  },
  {
    nom: 'texte d’un calque', reprise: false,
    muter: (f) => { f.layers[2] = { ...f.layers[2], texte: { style: 'Body', plages: [{ debut: 0, fin: 5, fontSize: 18, fontWeight: 400, peintures: [], liaisons: [] }] } }; },
    evenements: (c) => surChangementDuDocument([noeud('PROPERTY_CHANGE', 'titre', ['v-Alert', 'jeu-Alert'], ['characters'])], c),
  },
  {
    nom: 'nom d’un calque', reprise: false,
    muter: (f) => { f.layers[1] = { ...f.layers[1], nom: 'contour' }; },
    evenements: (c) => surChangementDuDocument([noeud('PROPERTY_CHANGE', 'bord', ['v-Alert', 'jeu-Alert'], ['name'])], c),
  },
  {
    nom: 'ajout d’un calque', reprise: false,
    muter: (f) => { f.layers = [...f.layers, base('neuf', f.variable)]; },
    evenements: (c) => surChangementDuDocument([noeud('CREATE', 'neuf', ['v-Alert', 'jeu-Alert'])], c),
  },
  {
    nom: 'suppression d’un calque', reprise: false,
    muter: (f) => { f.layers = f.layers.filter(({ id }) => id !== 'bord'); },
    evenements: (c) => surChangementDuDocument([noeud('DELETE', 'bord', [])], c),
  },
  { nom: 'valeur d’une variable', reprise: false, muter: (f) => { f.valeur = 14; } },
  {
    nom: 'liaison vers une autre variable (alias)', reprise: false,
    muter: (f) => { f.layers[0] = base('fond', { id: 'VariableID:2', cle: 'k-autre', nom: 'alert/size/other' }); },
  },
  {
    nom: 'style local', reprise: false,
    muter: (f) => { f.style = { ...f.style, taille: 16 }; },
    evenements: (c) => surChangementDeStyle([{ type: 'STYLE_PROPERTY_CHANGE', id: 'S:texte' }], c),
  },
  { nom: 'style distant sans événement', reprise: false, depart: (f) => { f.style.remote = true; }, muter: (f) => { f.style = { ...f.style, taille: 16 }; } },
  { nom: 'style distant inchangé', reprise: true, depart: (f) => { f.style.remote = true; }, muter() {} },
  {
    nom: 'maître local', reprise: false,
    muter: (f) => { f.maitre = { ...f.maitre, contenu: 'carré' }; },
    evenements: (c) => surChangementDuDocument([noeud('PROPERTY_CHANGE', 'M:icone/fond', ['M:icone', PAGE], ['fills'])], c),
  },
  { nom: 'maître local inchangé', reprise: true, muter() {} },
  {
    nom: 'nom de composant écrit sur la page du maître', reprise: false,
    muter: (f) => { f.nomsDeLaPage = ['icon', 'badge']; },
    evenements: (c) => surChangementDuDocument([noeud('PROPERTY_CHANGE', 'regle-badge', [PAGE], ['characters'])], c),
  },
  {
    nom: 'maître local qui contient une instance', reprise: false,
    depart: (f) => { f.maitre.imbrique = true; },
    muter: (f) => { f.maitre = { ...f.maitre, contenu: 'carré' }; },
    evenements: (c) => surChangementDuDocument([noeud('PROPERTY_CHANGE', 'M:bouton/fond', ['M:bouton', PAGE], ['fills'])], c),
  },
  { nom: 'maître de library sans événement', reprise: false, depart: (f) => { f.maitre.remote = true; }, muter: (f) => { f.maitre = { ...f.maitre, contenu: 'carré' }; } },
  { nom: 'library choisie', reprise: false, muter: (f) => { f.library = { nom: 'Intencial', cle: 'k-lib' }; } },
  { nom: 'niveau AA puis AAA', reprise: true, muter: (f) => { f.niveau = 'AAA'; } },
  {
    nom: 'plusieurs mutations avant l’Analyser', reprise: false,
    muter: (f) => { f.valeur = 20; f.maitre = { ...f.maitre, contenu: 'losange' }; f.style = { ...f.style, taille: 12 }; },
    evenements: (c) => {
      surChangementDuDocument([noeud('PROPERTY_CHANGE', 'M:icone/fond', ['M:icone', PAGE], ['fills'])], c);
      surChangementDeStyle([{ type: 'STYLE_PROPERTY_CHANGE', id: 'S:texte' }], c);
    },
  },
];

/** Applique la mutation, émet ses événements, puis demande Analyser. */
async function muterPuisAnalyser(m: Mutation, fichier: Fichier, appels: { moteur: number }) {
  const retenue = sessionDesAnalyses().entree('Alert');
  const avant = appels.moteur;
  m.muter(fichier);
  m.evenements?.(contexteDesEvenements(fichier));
  const analysee = await demander(fichier, appels, 'analyser');
  const promue = sessionDesAnalyses().entree('Alert');
  assert.ok(retenue && promue && promue !== retenue, `${m.nom} : l’analyse promeut une nouvelle entrée`);
  if (m.reprise) {
    assert.equal(appels.moteur, avant, `${m.nom} : le moteur n’est pas rappelé`);
    assert.equal(promue.sorties.moteur, retenue.sorties.moteur, `${m.nom} : le moteur est celui de l’entrée validée`);
  } else {
    assert.equal(appels.moteur, avant + 1, `${m.nom} : le moteur est relancé`);
    assert.notEqual(promue.sorties.moteur, retenue.sorties.moteur, `${m.nom} : rien du moteur retenu ne sert`);
    assert.notEqual(promue.requetes.controles.resultat, retenue.requetes.controles.resultat, `${m.nom} : les requêtes sont recalculées avec lui`);
  }
  return analysee;
}

// `nomsDeLaPage` lit le global `figma`, comme le moteur.
const global = globalThis as { figma?: unknown };
let figmaGlobal: unknown;
before(() => { figmaGlobal = global.figma; global.figma = { skipInvisibleInstanceChildren: false }; });
after(() => { global.figma = figmaGlobal; });
beforeEach(() => reinitialiserLAnalyse());

for (const mutation of MUTATIONS) {
  test(`parité avec Actualiser après : ${mutation.nom}`, async () => {
    const fichier = fichierDeDepart();
    mutation.depart?.(fichier);
    const appels = { moteur: 0 };
    await demander(fichier, appels, 'analyser');
    assert.equal(appels.moteur, 1);
    const analysee = await muterPuisAnalyser(mutation, fichier, appels);
    const moteursAvantActualiser = appels.moteur;
    const actualisee = await demander(fichier, appels, 'actualiser');
    assert.equal(appels.moteur, moteursAvantActualiser + 1, 'Actualiser reconstruit sans rien reprendre');
    assert.equal(JSON.stringify(analysee), JSON.stringify(actualisee), 'même objet affiché, dans le même ordre');
    assert.deepEqual(analysee, actualisee);
  });
}

test('des Analyser enchaînés, sans Actualiser entre eux, affichent chacun ce qu’une reconstruction affiche sur le même état', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await demander(fichier, appels, 'analyser');
  const etapes: Array<{ nom: string; fichier: Fichier; affichee: ReturnType<typeof affichage> }> = [];
  let reprises = 0;
  let relances = 0;
  const serie = ['aucune mutation', 'peinture d’un calque', 'maître local inchangé', 'niveau AA puis AAA', 'valeur d’une variable', 'maître local', 'aucune mutation', 'style local', 'ajout d’un calque', 'suppression d’un calque', 'library choisie', 'plusieurs mutations avant l’Analyser'];
  for (const nom of serie) {
    const mutation = MUTATIONS.find((candidate) => candidate.nom === nom);
    assert.ok(mutation, nom);
    const affichee = await muterPuisAnalyser(mutation, fichier, appels);
    if (mutation.reprise) reprises += 1; else relances += 1;
    etapes.push({ nom, fichier: structuredClone(fichier), affichee });
  }
  assert.equal(appels.moteur, 1 + relances, 'le moteur ne tourne que pour les mutations non reprises');
  assert.ok(reprises >= 4, 'des reprises ont eu lieu entre les mutations');
  for (const { nom, fichier: etat, affichee } of etapes) {
    reinitialiserLAnalyse();
    const reconstruite = await demander(etat, { moteur: 0 }, 'actualiser');
    assert.equal(JSON.stringify(affichee), JSON.stringify(reconstruite), `${nom} : même objet affiché`);
    assert.deepEqual(affichee, reconstruite, nom);
  }
});

test('un changement sous un maître local reçu avant la lecture des dépendances périme l’analyse et ne laisse aucune entrée', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const b = banc(fichier);
  const lectures = lecteursDe(fichier, appels);
  await traiterAvec({
    ...lectures,
    async dependances(sujet, contexte, inventaires, cooperation) {
      // Le maître n'est pas encore connu : l'événement ne vise aucun nœud suivi quand il arrive.
      surChangementDuDocument([noeud('PROPERTY_CHANGE', 'M:icone/fond', ['M:icone', PAGE], ['fills'])], b.contexte);
      assert.equal(b.envoyes.some(({ type }) => type === 'perime'), false);
      return dependancesDeFigma(sujet, contexte, inventaires, cooperation);
    },
  })({ type: 'analyser', demande: 1 }, b.contexte);
  assert.deepEqual(b.envoyes.filter(({ type }) => type === 'perime').map((message) => ('cause' in message ? message.cause : null)), ['document']);
  assert.equal(sessionDesAnalyses().entree('Alert'), null, 'une analyse périmée pendant son calcul ne promeut rien');
});

/** Une demande mesurée : ce que l'interface affiche, sans la trace, et les compteurs de requêtes de cette trace. */
async function mesuree(fichier: Fichier, appels: { moteur: number }, intention: 'analyser' | 'actualiser', ignores: readonly string[] = []) {
  const b = banc(fichier);
  await traiterAvec({ ...lecteursDe(fichier, appels), ignores: async () => [...ignores] })({ type: 'analyser', intention, demande: 1, mesurer: true }, b.contexte);
  const final = b.envoyes.find((message) => message.type === 'analyse' && message.statut === 'complete');
  assert.ok(final && 'mesure' in final && typeof final.mesure === 'object', 'la trace de la demande est rendue');
  const affiche = affichage(b);
  return {
    affiche: { ...affiche, messages: affiche.messages.map((message) => { const { mesure, ...reste } = message as PluginMessage & { mesure?: unknown }; return reste; }) },
    reprises: { non: final.mesure.compteurs.requetesNonRejouees ?? 0, rejouees: final.mesure.compteurs.requetesRejouees ?? 0 },
    constats: 'constats' in final ? final.constats.map(({ id }) => id) : [],
  };
}

test('Analyser deux fois sans changement ne rejoue aucune des trois requêtes et affiche ce qu’Actualiser affiche', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const premiere = await mesuree(fichier, appels, 'analyser');
  assert.deepEqual(premiere.reprises, { non: 0, rejouees: 3 }, 'sans entrée retenue, tout se calcule');
  const seconde = await mesuree(fichier, appels, 'analyser');
  assert.deepEqual(seconde.reprises, { non: 3, rejouees: 0 });
  assert.equal(appels.moteur, 1);
  const actualisee = await mesuree(fichier, appels, 'actualiser');
  assert.deepEqual(actualisee.reprises, { non: 0, rejouees: 3 }, 'Actualiser ne reprend rien');
  assert.equal(JSON.stringify(seconde.affiche), JSON.stringify(actualisee.affiche));
});

test('le niveau AA puis AAA rejoue les contrôles, qui le lisent, et pas les requêtes dont les entrées restent égales', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await mesuree(fichier, appels, 'analyser');
  fichier.niveau = 'AAA';
  const analysee = await mesuree(fichier, appels, 'analyser');
  assert.equal(appels.moteur, 1, 'le moteur est repris');
  assert.deepEqual(analysee.reprises, { non: 2, rejouees: 1 }, 'les contrôles rejouent ; leur résultat est égal, les corrections et la projection se reprennent');
  const actualisee = await mesuree(fichier, appels, 'actualiser');
  assert.equal(JSON.stringify(analysee.affiche), JSON.stringify(actualisee.affiche));
});

test('des ignorés rangés changés rejouent la projection, qui les lit, et pas les contrôles ni les corrections', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const premiere = await mesuree(fichier, appels, 'analyser');
  assert.ok(premiere.constats.length > 0, 'la fixture produit un constat à ignorer');
  const analysee = await mesuree(fichier, appels, 'analyser', [premiere.constats[0]]);
  assert.deepEqual(analysee.reprises, { non: 2, rejouees: 1 });
  const actualisee = await mesuree(fichier, appels, 'actualiser', [premiere.constats[0]]);
  assert.equal(JSON.stringify(analysee.affiche), JSON.stringify(actualisee.affiche));
});

test('une entrée invalidée ne reprend aucune requête, même quand leurs entrées lues sont égales', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await mesuree(fichier, appels, 'analyser');
  fichier.valeur = 14;
  const analysee = await mesuree(fichier, appels, 'analyser');
  assert.equal(appels.moteur, 2);
  assert.deepEqual(analysee.reprises, { non: 0, rejouees: 3 });
});

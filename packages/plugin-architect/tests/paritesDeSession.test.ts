/**
 * Parité de la session (corpus « Sessions » du contrat de parité) : après une série de mutations locales et globales,
 * Analyser après Analyser affiche ce qu'Actualiser affiche sur le même état. Une seule fixture, rejouée pour chaque cas :
 * un jeu avec une instance d'un maître local, un style de texte, des variables liées et un catalogue. Le maître peut porter
 * lui-même une instance, dont le maître (local, distant, sur une autre page ou illisible) entre dans la fermeture.
 *
 * Les dépendances sont lues par `dependancesDeFigma` sur un faux graphe de nœuds : le maître et le style que le test
 * mute sont ceux que la production relit. Une reprise effective est un Analyser qui ne rappelle pas le moteur.
 */
import assert from 'node:assert/strict';
import test, { after, before, beforeEach } from 'node:test';

import type { ChangementRecu, NoeudDEvenement } from 'ucm-plugin-socle/src/composant/analyse/couverture';
import type { ResultatInterne } from 'ucm-plugin-socle/src/composant/analyse/resultat';
import { phraseDe, type PointACorriger } from 'ucm-plugin-socle/src/composant/contract/localisation';

import type { PluginMessage } from '../src/messages';
import { modelesDeLAnalyse, type ReleveDesRegles } from '../src/regles';
import {
  analyseCourante, correctionsDeLAnalyse, dependancesDeFigma, etatDeLEntree, fermerLaSession, fixerLesBornesDeRetention, journalDesChangements, surInterruptionDePage, perimerApresUneEcriture, reinitialiserLAnalyse, sessionDesAnalyses, surChangementDeStyle, surChangementDuDocument, traiterAvec,
  type Lecteurs,
} from '../src/sandbox/analyse';
import { creerLeSuivi, type Contexte } from '../src/sandbox/contexte';
import { base, catalogueDe, fichierDeDepart, releveDe, type Fichier } from './aides/fichierDeSession';

const PAGE = 'page-1';

/** Le moteur nomme tout ce que le test mute : un résultat repris après une mutation garderait l'ancien état. */
function moteurDe(fichier: Fichier): ResultatInterne {
  const calques = fichier.layers.map(({ id, nom, peintures, texte }) => `${id}=${nom}:${peintures.length}:${texte?.plages[0]?.fontSize ?? ''}`).join(',');
  const point: PointACorriger = {
    famille: 'variables',
    titre: `Variable « ${fichier.variable.nom} », maître « ${fichier.maitre.contenu}@${fichier.maitre.liaison}${fichier.maitre.imbrique ? ` > ${fichier.imbrique.id}:${fichier.imbrique.contenu}@${fichier.imbrique.liaison}` : ''} », page « ${fichier.nomsDeLaPage.join('+')} », style « ${fichier.style.nom} ${fichier.style.taille} », calques ${calques} : à vérifier.`,
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
  const liee = (variable: string) => ({ fills: [{ type: 'VARIABLE_ALIAS', id: variable }] });
  const fondDuMaitre = { id: 'M:icone/fond', type: 'RECTANGLE', boundVariables: liee(fichier.maitre.liaison) };
  const { imbrique } = fichier;
  const pageDuMaitreImbrique = imbrique.page === PAGE ? page : { id: imbrique.page, type: 'PAGE', findAllWithCriteria: () => [] };
  const maitreImbrique = imbrique.id === '' ? null : { id: imbrique.id, type: 'COMPONENT', remote: imbrique.remote, parent: imbrique.remote ? null : pageDuMaitreImbrique, findAll: () => [{ id: `${imbrique.id}/fond`, type: 'RECTANGLE', boundVariables: liee(imbrique.liaison) }] };
  const dansLeMaitre = [fondDuMaitre, ...(fichier.maitre.imbrique ? [{ id: 'M:icone/bouton', type: 'INSTANCE', getMainComponentAsync: async () => maitreImbrique }] : [])];
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

const avecUneInstanceImbriquee = (fichier: Fichier): void => { fichier.maitre.imbrique = true; };

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
    nom: 'contenu d’un texte', reprise: false,
    muter: (f) => { f.layers[2] = { ...f.layers[2], texte: { style: 'Body', plages: [{ debut: 0, fin: 9, fontSize: 14, fontWeight: 400, peintures: [], liaisons: [] }] } }; },
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
  // Fermeture des maîtres (16.3) : le maître du jeu porte une instance d'un autre maître. Un calque d'un maître local
  // change toujours avec un `nodechange` ; le maître de l'instance et les noms de la page se comparent aussi sans événement.
  { nom: 'maître local à instance imbriquée inchangé', reprise: true, depart: avecUneInstanceImbriquee, muter() {} },
  {
    nom: 'calque d’un maître imbriqué', reprise: false, depart: avecUneInstanceImbriquee,
    muter: (f) => { f.imbrique = { ...f.imbrique, contenu: 'creux' }; },
    evenements: (c) => surChangementDuDocument([noeud('PROPERTY_CHANGE', 'M:bouton/fond', ['M:bouton', PAGE], ['fills'])], c),
  },
  {
    nom: 'instance imbriquée passée à un autre maître', reprise: false, depart: avecUneInstanceImbriquee,
    muter: (f) => { f.imbrique = { ...f.imbrique, id: 'M:badge' }; },
    evenements: (c) => surChangementDuDocument([noeud('PROPERTY_CHANGE', 'M:icone/bouton', ['M:icone', PAGE], ['mainComponent'])], c),
  },
  { nom: 'instance imbriquée passée à un autre maître, sans événement', reprise: false, depart: avecUneInstanceImbriquee, muter: (f) => { f.imbrique = { ...f.imbrique, id: 'M:badge' }; } },
  {
    nom: 'nom contracté écrit sur la page des maîtres imbriqués', reprise: false, depart: avecUneInstanceImbriquee,
    muter: (f) => { f.nomsDeLaPage = ['icon', 'bouton']; },
    evenements: (c) => surChangementDuDocument([noeud('PROPERTY_CHANGE', 'regle-bouton', [PAGE], ['characters'])], c),
  },
  { nom: 'nom contracté écrit sur la page des maîtres imbriqués, sans événement', reprise: false, depart: avecUneInstanceImbriquee, muter: (f) => { f.nomsDeLaPage = ['icon', 'bouton']; } },
  {
    nom: 'maître imbriqué de library sans événement', reprise: false,
    depart: (f) => { avecUneInstanceImbriquee(f); f.imbrique.remote = true; },
    muter: (f) => { f.imbrique = { ...f.imbrique, contenu: 'creux' }; },
  },
  {
    nom: 'maître imbriqué sur une page non écoutée', reprise: false,
    depart: (f) => { avecUneInstanceImbriquee(f); f.imbrique.page = 'page-2'; },
    muter: (f) => { f.imbrique = { ...f.imbrique, contenu: 'creux' }; },
  },
  // `NodeChangeProperty` ne nomme pas `boundVariables` : jusqu'au résultat de E4, une liaison changée seule n'a pas d'événement démontré.
  { nom: 'liaison d’un calque d’un maître local changée sans événement', reprise: false, muter: (f) => { f.maitre = { ...f.maitre, liaison: 'VariableID:2' }; } },
  { nom: 'liaison d’un calque d’un maître imbriqué changée sans événement', reprise: false, depart: avecUneInstanceImbriquee, muter: (f) => { f.imbrique = { ...f.imbrique, liaison: 'VariableID:2' }; } },
  { nom: 'instance imbriquée dont le maître ne se lit pas', reprise: false, depart: (f) => { avecUneInstanceImbriquee(f); f.imbrique.id = ''; }, muter() {} },
  { nom: 'maître de library sans événement', reprise: false, depart: (f) => { f.maitre.remote = true; }, muter: (f) => { f.maitre = { ...f.maitre, contenu: 'carré' }; } },
  {
    nom: 'library choisie', reprise: true,
    muter: (f) => { f.library = { nom: 'Intencial', cle: 'k-lib' }; },
    evenements: (c) => perimerApresUneEcriture(c, 'configuration'),
  },
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

for (const [sous, calque, parents] of [['un maître local', 'M:icone/fond', ['M:icone', PAGE]], ['un maître imbriqué', 'M:bouton/fond', ['M:bouton', PAGE]]] as const) {
  test(`un changement sous ${sous} reçu avant la lecture des dépendances périme l’analyse et ne laisse aucune entrée`, async () => {
    const fichier = fichierDeDepart();
    avecUneInstanceImbriquee(fichier);
    const appels = { moteur: 0 };
    const b = banc(fichier);
    const lectures = lecteursDe(fichier, appels);
    await traiterAvec({
      ...lectures,
      async dependances(sujet, contexte, inventaires, cooperation) {
        // Le maître n'est pas encore connu : l'événement ne vise aucun nœud suivi quand il arrive.
        surChangementDuDocument([noeud('PROPERTY_CHANGE', calque, parents, ['fills'])], b.contexte);
        assert.equal(b.envoyes.some(({ type }) => type === 'perime'), false);
        return dependancesDeFigma(sujet, contexte, inventaires, cooperation);
      },
    })({ type: 'analyser', demande: 1 }, b.contexte);
    assert.deepEqual(b.envoyes.filter(({ type }) => type === 'perime').map((message) => ('cause' in message ? message.cause : null)), ['document']);
    assert.equal(sessionDesAnalyses().entree('Alert'), null, 'une analyse périmée pendant son calcul ne promeut rien');
  });
}

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
    /** Ce que la trace dit du moteur : `repriseDuMoteur`, ou les raisons de non-reprise. */
    moteur: Object.entries(final.mesure.compteurs).filter(([nom]) => nom === 'repriseDuMoteur' || nom.startsWith('nonReprise:')).map(([nom, n]) => `${nom}=${n}`).sort(),
    /** Les requêtes que la trace compte sous leur nom, reprises puis rejouées, dans l'ordre alphabétique. */
    parRequete: {
      reprises: Object.keys(final.mesure.compteurs).filter((nom) => nom.startsWith('reprise:')).map((nom) => nom.slice('reprise:'.length)).sort(),
      rejouees: Object.keys(final.mesure.compteurs).filter((nom) => nom.startsWith('rejeu:')).map((nom) => nom.slice('rejeu:'.length)).sort(),
    },
    constats: 'constats' in final ? final.constats.map(({ id }) => id) : [],
  };
}

test('Analyser deux fois sans changement ne rejoue aucune des huit requêtes (six familles du kit, corrections, projection) et affiche ce qu’Actualiser affiche', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const premiere = await mesuree(fichier, appels, 'analyser');
  assert.deepEqual(premiere.reprises, { non: 0, rejouees: 8 }, 'sans entrée retenue, tout se calcule');
  const seconde = await mesuree(fichier, appels, 'analyser');
  assert.deepEqual(seconde.reprises, { non: 8, rejouees: 0 });
  assert.equal(appels.moteur, 1);
  const actualisee = await mesuree(fichier, appels, 'actualiser');
  assert.deepEqual(actualisee.reprises, { non: 0, rejouees: 8 }, 'Actualiser ne reprend rien');
  assert.equal(JSON.stringify(seconde.affiche), JSON.stringify(actualisee.affiche));
});

test('le niveau AA puis AAA rejoue l’accessibilité, qui le lit, et pas les autres familles ni les requêtes dont les entrées restent égales', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await mesuree(fichier, appels, 'analyser');
  fichier.niveau = 'AAA';
  const analysee = await mesuree(fichier, appels, 'analyser');
  assert.equal(appels.moteur, 1, 'le moteur est repris');
  assert.deepEqual(analysee.reprises, { non: 7, rejouees: 1 }, 'l’accessibilité rejoue ; son résultat est égal, les corrections et la projection se reprennent');
  const actualisee = await mesuree(fichier, appels, 'actualiser');
  assert.equal(JSON.stringify(analysee.affiche), JSON.stringify(actualisee.affiche));
});

test('des ignorés rangés changés rejouent la projection, qui les lit, et pas les familles de contrôles ni les corrections', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const premiere = await mesuree(fichier, appels, 'analyser');
  assert.ok(premiere.constats.length > 0, 'la fixture produit un constat à ignorer');
  const analysee = await mesuree(fichier, appels, 'analyser', [premiere.constats[0]]);
  assert.deepEqual(analysee.reprises, { non: 7, rejouees: 1 });
  const actualisee = await mesuree(fichier, appels, 'actualiser', [premiere.constats[0]]);
  assert.equal(JSON.stringify(analysee.affiche), JSON.stringify(actualisee.affiche));
});

test('une entrée invalidée rejoue le moteur et ne rejoue que les requêtes dont les entrées lues ont changé', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await mesuree(fichier, appels, 'analyser');
  fichier.valeur = 14;
  const analysee = await mesuree(fichier, appels, 'analyser');
  assert.equal(appels.moteur, 2);
  // La valeur n'est lue que par l'accessibilité (et la structure, absente ici) ; les corrections lisent le catalogue entier ;
  // leur résultat reste égal, donc la projection se reprend.
  assert.deepEqual(analysee.reprises, { non: 6, rejouees: 2 });
  const actualisee = await mesuree(fichier, appels, 'actualiser');
  assert.equal(JSON.stringify(analysee.affiche), JSON.stringify(actualisee.affiche));
});

test('une peinture changée sur une entrée invalidée ne rejoue que l’accessibilité, et les corrections et la projection qui la suivent', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await mesuree(fichier, appels, 'analyser');
  const mutation = MUTATIONS.find(({ nom }) => nom === 'peinture d’un calque')!;
  mutation.muter(fichier);
  mutation.evenements?.(contexteDesEvenements(fichier));
  assert.equal(etatDeLEntree('Alert').etat, 'invalide');
  const analysee = await mesuree(fichier, appels, 'analyser');
  assert.equal(appels.moteur, 2, 'le moteur est rejoué');
  // Le moteur de la fixture nomme le nombre de peintures : ses constats changent, donc les corrections et la projection aussi.
  assert.deepEqual(analysee.reprises, { non: 5, rejouees: 3 });
  const actualisee = await mesuree(fichier, appels, 'actualiser');
  assert.deepEqual(actualisee.reprises, { non: 0, rejouees: 8 });
  assert.equal(JSON.stringify(analysee.affiche), JSON.stringify(actualisee.affiche));
});

/** Les requêtes de l'analyse, dans l'ordre alphabétique : six familles du kit, corrections et projection. */
const REQUETES = ['controle-accessibilite', 'controle-couches', 'controle-mapping', 'controle-nommage', 'controle-oublis', 'controle-typographie', 'corrections', 'projection'];

/** Le banc des mutations locales d'un calque, sur une entrée invalidée par le journal : chaque requête est comptée sous son nom, reprise ou rejouée. */
const MUTATIONS_LOCALES: ReadonlyArray<{ nom: string; mutation: string; rejouees: string[] }> = [
  { nom: 'peinture', mutation: 'peinture d’un calque', rejouees: ['controle-accessibilite', 'corrections', 'projection'] },
  { nom: 'taille du texte', mutation: 'texte d’un calque', rejouees: ['controle-accessibilite', 'corrections', 'projection'] },
  // Les constats de contraste nomment la plage de texte (`0-5`) : sa fin change leurs identifiants, donc les corrections et la projection.
  { nom: 'contenu du texte', mutation: 'contenu d’un texte', rejouees: ['controle-accessibilite', 'corrections', 'projection'] },
  { nom: 'nom d’un calque', mutation: 'nom d’un calque', rejouees: ['controle-accessibilite', 'controle-couches', 'controle-mapping', 'controle-typographie', 'corrections', 'projection'] },
  { nom: 'ajout d’un calque', mutation: 'ajout d’un calque', rejouees: ['controle-accessibilite', 'controle-couches', 'controle-mapping', 'controle-oublis', 'controle-typographie', 'corrections', 'projection'] },
];

for (const { nom, mutation: nomDeLaMutation, rejouees } of MUTATIONS_LOCALES) {
  test(`banc de mutations locales, ${nom} : la trace compte chaque requête reprise ou rejouée, et l’affichage est celui d’Actualiser`, async () => {
    const fichier = fichierDeDepart();
    const appels = { moteur: 0 };
    await mesuree(fichier, appels, 'analyser');
    const mutation = MUTATIONS.find((candidate) => candidate.nom === nomDeLaMutation)!;
    mutation.muter(fichier);
    mutation.evenements?.(contexteDesEvenements(fichier));
    assert.equal(etatDeLEntree('Alert').etat, 'invalide');
    const analysee = await mesuree(fichier, appels, 'analyser');
    assert.equal(appels.moteur, 2, 'le moteur est rejoué');
    assert.deepEqual(analysee.parRequete.rejouees, rejouees, 'requêtes rejouées');
    assert.deepEqual(analysee.parRequete.reprises, REQUETES.filter((requete) => !rejouees.includes(requete)), 'requêtes reprises');
    assert.deepEqual(analysee.reprises, { non: REQUETES.length - rejouees.length, rejouees: rejouees.length }, 'les totaux sont la somme des compteurs par requête');
    const actualisee = await mesuree(fichier, appels, 'actualiser');
    assert.deepEqual(actualisee.parRequete, { reprises: [], rejouees: REQUETES }, 'Actualiser rejoue chacune');
    assert.equal(JSON.stringify(analysee.affiche), JSON.stringify(actualisee.affiche));
  });
}

test('la trace dit si le moteur est repris, ou pourquoi il ne l’est pas', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const premiere = await mesuree(fichier, appels, 'analyser');
  assert.deepEqual(premiere.moteur, ['nonReprise:entree-absente=1'], 'sans entrée');
  assert.deepEqual((await mesuree(fichier, appels, 'analyser')).moteur, ['repriseDuMoteur=1']);
  assert.deepEqual((await mesuree(fichier, appels, 'actualiser')).moteur, [], 'Actualiser ne valide rien');

  // Une raison de la validation : le catalogue relu diffère, sans événement.
  fichier.valeur = 14;
  assert.deepEqual((await mesuree(fichier, appels, 'analyser')).moteur, ['nonReprise:different:catalogue=1']);

  // Un maître local qui contient une instance d'un maître local suivi : la fermeture couvre tout, le moteur est repris.
  const imbrique = fichierDeDepart();
  avecUneInstanceImbriquee(imbrique);
  await mesuree(imbrique, appels, 'analyser');
  assert.deepEqual((await mesuree(imbrique, appels, 'analyser')).moteur, ['repriseDuMoteur=1']);

  // Une raison de la validation : une instance sous le maître n'a pas de maître lu, la fermeture est incomplète.
  imbrique.imbrique.id = '';
  await mesuree(imbrique, appels, 'analyser');
  assert.deepEqual((await mesuree(imbrique, appels, 'analyser')).moteur, ['nonReprise:non-couvert:maitres-autres-instances=1']);

  // Les raisons du journal : l'entrée est invalidée avant la validation.
  const modifie = fichierDeDepart();
  await mesuree(modifie, appels, 'analyser');
  const mutation = MUTATIONS.find(({ nom }) => nom === 'nom d’un calque')!;
  mutation.muter(modifie);
  mutation.evenements?.(contexteDesEvenements(modifie));
  const etat = etatDeLEntree('Alert');
  assert.equal(etat.etat, 'invalide');
  const attendues = etat.etat === 'invalide' ? etat.raisons.map((raison) => `nonReprise:${raison}=1`).sort() : [];
  assert.ok(attendues.length > 0);
  assert.deepEqual((await mesuree(modifie, appels, 'analyser')).moteur, attendues);

  // Une entrée à relire.
  const incomplet = fichierDeDepart();
  incomplet.catalogueIncomplet = true;
  await mesuree(incomplet, appels, 'analyser');
  assert.deepEqual((await mesuree(incomplet, appels, 'analyser')).moteur, ['nonReprise:catalogue-inaccessible=1']);
});

test('un nom de calque changé rejoue les quatre familles qui le lisent (mapping, couches, accessibilité, typographie), pas le nommage ni les oublis', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await mesuree(fichier, appels, 'analyser');
  const mutation = MUTATIONS.find(({ nom }) => nom === 'nom d’un calque')!;
  mutation.muter(fichier);
  mutation.evenements?.(contexteDesEvenements(fichier));
  const analysee = await mesuree(fichier, appels, 'analyser');
  assert.deepEqual(analysee.reprises, { non: 2, rejouees: 6 }, 'quatre familles, les corrections et la projection');
  const actualisee = await mesuree(fichier, appels, 'actualiser');
  assert.equal(JSON.stringify(analysee.affiche), JSON.stringify(actualisee.affiche));
});

test('un catalogue incomplet retenu n’interdit pas la reprise : la comparaison porte sur ce que la demande vient de lire', async () => {
  const fichier = fichierDeDepart();
  fichier.catalogueIncomplet = true;
  const appels = { moteur: 0 };
  await mesuree(fichier, appels, 'analyser');
  assert.equal(etatDeLEntree('Alert').etat, 'a-relire');
  const inchangee = await mesuree(fichier, appels, 'analyser');
  assert.equal(appels.moteur, 2, 'une entrée à relire ne reprend pas le moteur');
  assert.deepEqual(inchangee.reprises, { non: 8, rejouees: 0 }, 'le moteur rendu égale le retenu : tout se reprend');
  const complet = { ...fichier, catalogueIncomplet: false };
  const complete = await mesuree(complet, appels, 'analyser');
  assert.deepEqual(complete.reprises, { non: 1, rejouees: 7 }, 'une variable de moins change la liste que les six familles parcourent, et les corrections ; la projection se reprend');
  const actualisee = await mesuree(complet, appels, 'actualiser');
  assert.equal(JSON.stringify(complete.affiche), JSON.stringify(actualisee.affiche));
});

/** Tout ce que l'entrée de session porte comme objet : une reconstruction n'en garde aucun. */
function objetsDeLEntree(entree: NonNullable<ReturnType<ReturnType<typeof sessionDesAnalyses>['entree']>>): unknown[] {
  return [...Object.values(entree.sorties), ...Object.values(entree.requetes).map(({ resultat }) => resultat)].filter((valeur) => typeof valeur === 'object' && valeur !== null);
}

test('Actualiser après un Analyser qui a tout repris remplace l’entrée par une reconstruction complète : rien d’antérieur n’y survit', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await mesuree(fichier, appels, 'analyser');
  const reprise = await mesuree(fichier, appels, 'analyser');
  assert.deepEqual(reprise.reprises, { non: 8, rejouees: 0 });
  const avant = sessionDesAnalyses().entree('Alert')!;
  const anciens = new Set(objetsDeLEntree(avant));
  const actualisee = await mesuree(fichier, appels, 'actualiser');
  assert.equal(appels.moteur, 2, 'Actualiser rappelle le moteur');
  assert.deepEqual(actualisee.reprises, { non: 0, rejouees: 8 });
  const apres = sessionDesAnalyses().entree('Alert')!;
  assert.notEqual(apres, avant);
  assert.ok(apres.rang > avant.rang);
  const gardes = objetsDeLEntree(apres).filter((objet) => anciens.has(objet));
  assert.deepEqual(gardes, [], 'ni moteur, ni requête, ni dépendances, ni relevé de l’entrée précédente');
  assert.equal(JSON.stringify(actualisee.affiche), JSON.stringify(reprise.affiche));
});

test('une library choisie autre garde le moteur et les familles qui ne lisent pas la library, et rejoue les corrections, qui lisent le catalogue entier, pour le même affichage qu’Actualiser', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await mesuree(fichier, appels, 'analyser');
  const moteurRetenu = sessionDesAnalyses().entree('Alert')!.sorties.moteur;
  fichier.library = { nom: 'Intencial', cle: 'k-lib' };
  // Le réglage de la library entre au journal comme une écriture de configuration.
  perimerApresUneEcriture(banc(fichier).contexte, 'configuration');
  const analysee = await mesuree(fichier, appels, 'analyser');
  assert.equal(appels.moteur, 1, 'le moteur ne lit pas la library : il est repris');
  assert.equal(sessionDesAnalyses().entree('Alert')!.sorties.moteur, moteurRetenu);
  assert.deepEqual(analysee.reprises, { non: 7, rejouees: 1 }, 'aucune famille ne lit la library ; les corrections lisent le catalogue entier ; la projection reprend avec des corrections égales');
  const actualisee = await mesuree(fichier, appels, 'actualiser');
  assert.equal(JSON.stringify(analysee.affiche), JSON.stringify(actualisee.affiche));
});

test('une écriture du document, elle, invalide le sujet entier même quand rien d’autre n’a changé', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await mesuree(fichier, appels, 'analyser');
  perimerApresUneEcriture(banc(fichier).contexte);
  const analysee = await mesuree(fichier, appels, 'analyser');
  assert.equal(appels.moteur, 2, 'le moteur est rejoué');
  assert.deepEqual(analysee.reprises, { non: 8, rejouees: 0 }, 'ses entrées lues sont égales à celles de l’entrée : les requêtes se reprennent');
});

class FauxNoeud {
  constructor(readonly id: string) {}
  async getMainComponentAsync() { return null; }
}

/** Une valeur que la session ne doit pas porter : fonction, ou objet qui n'est ni simple, ni liste, ni `Map`, ni `Set`. */
function noeudsFigmaDans(valeur: unknown, chemin: string, vus = new Set<unknown>()): string[] {
  if (typeof valeur === 'function') return [chemin];
  if (typeof valeur !== 'object' || valeur === null || vus.has(valeur)) return [];
  vus.add(valeur);
  const prototype = Object.getPrototypeOf(valeur) as unknown;
  if (prototype !== Object.prototype && prototype !== null && !Array.isArray(valeur) && !(valeur instanceof Map) && !(valeur instanceof Set)) return [chemin];
  const enfants: [string, unknown][] = valeur instanceof Map ? [...valeur].map(([cle, v]) => [String(cle), v])
    : valeur instanceof Set ? [...valeur].map((v, i) => [String(i), v]) : Object.entries(valeur);
  return enfants.flatMap(([cle, v]) => noeudsFigmaDans(v, `${chemin}.${cle}`, vus));
}

test('l’entrée retenue ne porte aucun nœud Figma : les nœuds des règles sont réduits à leur identifiant', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const lecteurs = lecteursDe(fichier, appels);
  const b = banc(fichier);
  await traiterAvec({
    ...lecteurs,
    moteur: async () => {
      const interne = moteurDe(fichier) as unknown as Record<string, unknown>;
      interne.rules = { intent: null, warnings: [], releve: { conteneurDuComposant: false, conteneurVierge: new FauxNoeud('vierge'), maitreLocal: new FauxNoeud('maitre'), instanceSource: null }, aRediger: 0, tagsARediger: [] };
      interne.pourLaPublication = { noeud: new FauxNoeud('publication') };
      return { etat: 'calculee', interne: interne as unknown as ResultatInterne };
    },
  })({ type: 'analyser', demande: 1 }, b.contexte);
  const entree = sessionDesAnalyses().entree('Alert');
  assert.ok(entree);
  assert.deepEqual(noeudsFigmaDans({ sorties: entree.sorties, requetes: entree.requetes, suivi: entree.suivi }, 'entree'), []);
  assert.deepEqual(entree.sorties.moteur.rules.releve, { conteneurDuComposant: false, conteneurVierge: 'vierge', maitreLocal: 'maitre', instanceSource: null });
  assert.equal('pourLaPublication' in entree.sorties.moteur, false);
});

/** Les lecteurs d'un sujet nommé : le même jeu, une clé de sujet différente. */
const lecteursDuSujet = (cle: string, fichier: Fichier, appels: { moteur: number }): Lecteurs => ({
  ...lecteursDe(fichier, appels),
  sujet: async () => ({ cle, noeud: figmaDe(fichier).jeu as never, noeuds: ['jeu-Alert', 'v-Alert', ...fichier.layers.map(({ id }) => id)], couverture: { instances: 'descendues', complete: true, trous: [] } }),
});

async function analyserLeSujet(cle: string, fichier: Fichier, appels: { moteur: number }) {
  const b = banc(fichier);
  await traiterAvec(lecteursDuSujet(cle, fichier, appels))({ type: 'analyser', demande: 1 }, b.contexte);
  return b;
}

test('au-delà de la borne de sujets, le moins récent est évincé avec sa marque, et le sujet analysé reste', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  fixerLesBornesDeRetention({ sujets: 2 });
  await analyserLeSujet('S1', fichier, appels);
  sessionDesAnalyses().invalider('S1', ['style']);
  await analyserLeSujet('S2', fichier, appels);
  await analyserLeSujet('S3', fichier, appels);
  assert.deepEqual(sessionDesAnalyses().sujets(), ['S3', 'S2']);
  assert.equal(sessionDesAnalyses().entree('S1'), null);
  assert.deepEqual(sessionDesAnalyses().invalidations('S1'), [], 'la marque du sujet évincé est retirée avec lui');
  assert.equal(sessionDesAnalyses().evalueJusqua('S1'), null);
});

test('un sujet qui dépasse seul la borne s’affiche en entier, n’est pas retenu et perd son entrée précédente', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await analyserLeSujet('S1', fichier, appels);
  await analyserLeSujet('S2', fichier, appels);
  assert.deepEqual(sessionDesAnalyses().sujets(), ['S2', 'S1']);
  fixerLesBornesDeRetention({ octets: 100 });
  const b = await analyserLeSujet('S1', fichier, appels);
  assert.equal(b.envoyes.some((message) => message.type === 'analyse' && message.statut === 'complete'), true, 'l’analyse va jusqu’au bout');
  assert.equal(sessionDesAnalyses().entree('S1'), null);
  assert.equal(appels.moteur, 2, 'cette analyse a repris l’entrée d’avant, que sa promotion retire ensuite');
  await analyserLeSujet('S1', fichier, appels);
  assert.equal(appels.moteur, 3, 'sans entrée retenue, le sujet se calcule en entier à chaque fois');
  assert.deepEqual(sessionDesAnalyses().sujets(), ['S2'], 'les autres sujets restent');
});

/** Une demande Analyser sur un contexte donné, avec les lecteurs de la fixture. */
async function analyserSur(fichier: Fichier, appels: { moteur: number }, contexte: Contexte): Promise<void> {
  await traiterAvec(lecteursDe(fichier, appels))({ type: 'analyser', intention: 'analyser', demande: 1 }, contexte);
}

test('une perte de suivi ramène l’entrée au chemin complet : page non écoutée, journal débordé, page quittée', async () => {
  const cas: Array<{ nom: string; perdre(contexte: Contexte): Contexte }> = [
    { nom: 'page non écoutée', perdre: (c) => ({ ...c, surveillerLeDocument: () => ['0:9'] }) },
    { nom: 'journal débordé', perdre: (c) => { surChangementDuDocument(Array.from({ length: 5001 }, (_, rang) => `ailleurs-${rang}`), c); return c; } },
    { nom: 'page quittée', perdre: (c) => { surInterruptionDePage(PAGE, 'page-quittee', c); return c; } },
  ];
  for (const { nom, perdre } of cas) {
    reinitialiserLAnalyse();
    const fichier = fichierDeDepart();
    const appels = { moteur: 0 };
    await analyserSur(fichier, appels, banc(fichier).contexte);
    await analyserSur(fichier, appels, perdre(banc(fichier).contexte));
    assert.equal(appels.moteur, 2, `${nom} : le moteur est relancé`);
  }
});

test('le journal est rogné au plus ancien curseur retenu : des changements sans rapport ne s’accumulent pas', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await analyserSur(fichier, appels, banc(fichier).contexte);
  surChangementDuDocument([noeud('PROPERTY_CHANGE', 'autre', [PAGE], ['fills']), noeud('PROPERTY_CHANGE', 'autre', [PAGE], ['name'])], banc(fichier).contexte);
  await analyserSur(fichier, appels, banc(fichier).contexte);
  assert.equal(journalDesChangements()!.depuis(0).length, 2, 'la deuxième demande garde ce que la première a pu voir');
  await analyserSur(fichier, appels, banc(fichier).contexte);
  assert.equal(journalDesChangements()!.depuis(0).length, 0, 'la troisième retire ce que l’entrée et l’analyse affichée ont dépassé');
  assert.equal(appels.moteur, 1);
});

test('la fermeture de la session retire les écoutes, vide session et journal, et une analyse en cours ne promeut rien', async () => {
  const retraits: string[] = [];
  const page = { id: PAGE, on() {}, off(type: string) { retraits.push(type); } };
  const suivi = creerLeSuivi<typeof page>(() => page, () => {});
  suivi.surveiller(page);
  suivi.fermer();
  assert.deepEqual(retraits, ['nodechange']);
  suivi.fermer();
  assert.deepEqual(retraits, ['nodechange'], 'un second arrêt ne retire rien');

  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await analyserSur(fichier, appels, banc(fichier).contexte);
  assert.ok(sessionDesAnalyses().entree('Alert'));
  fermerLaSession();
  assert.equal(sessionDesAnalyses().entree('Alert'), null);
  assert.equal(journalDesChangements(), null);
  assert.equal(analyseCourante(), null);
  await analyserSur(fichier, appels, banc(fichier).contexte);
  assert.equal(appels.moteur, 2, 'après la fermeture, l’analyse suivante est complète');
});

test('aucune analyse n’écrit dans clientStorage', async () => {
  const fichier = fichierDeDepart();
  const ecritures: string[] = [];
  const contexte = banc(fichier).contexte;
  (contexte.figma as unknown as { clientStorage: unknown }).clientStorage = { setAsync: async (cle: string) => { ecritures.push(cle); }, getAsync: async () => undefined };
  const appels = { moteur: 0 };
  await analyserSur(fichier, appels, contexte);
  await analyserSur(fichier, appels, contexte);
  await traiterAvec(lecteursDe(fichier, appels))({ type: 'analyser', intention: 'actualiser', demande: 2 }, contexte);
  assert.deepEqual(ecritures, []);
});

test('la trace porte les maxima de la session au moment de la promotion', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const b = banc(fichier);
  const lecteurs = lecteursDe(fichier, appels);
  // Un changement sans rapport avec le sujet, reçu pendant la lecture : il entre au journal sans périmer l'analyse.
  await traiterAvec({ ...lecteurs, catalogue: async (...args) => { surChangementDuDocument([noeud('PROPERTY_CHANGE', 'autre', [PAGE], ['fills'])], b.contexte); return lecteurs.catalogue(...args); } })({ type: 'analyser', intention: 'analyser', demande: 1, mesurer: true }, b.contexte);
  const final = b.envoyes.find((message) => message.type === 'analyse' && message.statut === 'complete');
  assert.ok(final && 'mesure' in final && typeof final.mesure === 'object');
  const { compteurs } = final.mesure;
  const retenu = sessionDesAnalyses().mesure();
  assert.equal(compteurs.sujetsRetenus, 1);
  assert.equal(compteurs.octetsRetenus, retenu.octets);
  assert.equal(compteurs.aretesRetenues, retenu.aretes);
  assert.ok((compteurs.octetsRetenus ?? 0) > 0 && (compteurs.aretesRetenues ?? 0) > 0);
  assert.equal(compteurs.entreesDuJournal, journalDesChangements()!.depuis(0).length);
  assert.ok((compteurs.entreesDuJournal ?? 0) >= 1);
});

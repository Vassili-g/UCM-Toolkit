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
  analyseCourante, annulerLaPrelecture, correctionsDeLAnalyse, dependancesDeFigma, etatDeLEntree, fermerLaSession, fixerLesBornesDeRetention, journalDesChangements, operationEnCours, prendreLaPlaceDUneEcriture, surInterruptionDePage, perimerApresUneEcriture, reinitialiserLAnalyse, sessionDesAnalyses, surChangementDeStyle, surChangementDuDocument, surSelection, traiterAvec,
  type Lecteurs,
} from '../src/sandbox/analyse';
import { liaisonsRetenues, retenirLesLiaisons } from '../src/sandbox/bibliotheque';
import { traiter as traiterLaConfiguration } from '../src/sandbox/configuration';
import { creerLeSuivi, type Contexte } from '../src/sandbox/contexte';
import { base, catalogueDe, fichierDeDepart, releveDe, type Fichier } from './aides/fichierDeSession';

const PAGE = 'page-1';

/** Le moteur nomme tout ce que le test mute : un résultat repris après une mutation garderait l'ancien état. */
function moteurDe(fichier: Fichier): ResultatInterne {
  const calques = fichier.layers.map(({ id, nom, peintures, texte }) => `${id}=${nom}:${peintures.length}:${texte?.plages[0]?.fontSize ?? ''}`).join(',');
  const point: PointACorriger = {
    famille: 'variables',
    titre: `Variable « ${fichier.variable.nom} », maître « ${fichier.maitre.contenu}@${fichier.maitre.liaison}/${fichier.calqueDInstance}${fichier.maitre.imbrique ? ` > ${fichier.imbrique.id}:${fichier.imbrique.contenu}@${fichier.imbrique.liaison}` : ''} », page « ${fichier.nomsDeLaPage.join('+')} », style « ${fichier.style.nom} ${fichier.style.taille} », calques ${calques} : à vérifier.`,
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
  const maitreImbrique = imbrique.id === '' ? null : { id: imbrique.id, type: 'COMPONENT', name: imbrique.contenu, remote: imbrique.remote, parent: imbrique.remote ? null : pageDuMaitreImbrique, findAll: () => [{ id: `${imbrique.id}/fond`, type: 'RECTANGLE', boundVariables: liee(imbrique.liaison) }] };
  const dansLeMaitre = [fondDuMaitre, ...(fichier.maitre.imbrique ? [{ id: 'M:icone/bouton', type: 'INSTANCE', getMainComponentAsync: async () => maitreImbrique }] : [])];
  // `name` se lit au moment de la lecture, comme dans Figma : une lecture tardive voit un changement fait pendant le calcul.
  const maitre = { id: 'M:icone', type: 'COMPONENT', get name() { return fichier.maitre.contenu; }, remote: fichier.maitre.remote, parent: fichier.maitre.remote ? null : page, findAll: () => dansLeMaitre };
  // Le calque de l'instance suit son maître : une mise à jour de library le change sans événement.
  const calqueDInstance = { id: 'I:icone;trait', type: 'VECTOR', name: fichier.calqueDInstance, visible: true };
  const calques = [
    { id: 'titre', type: 'TEXT', textStyleId: 'S:texte' },
    { id: 'icone', type: 'INSTANCE', getMainComponentAsync: async () => maitre, findAll: () => [calqueDInstance] },
    calqueDInstance,
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

const REGLES: ReleveDesRegles = { composant: { id: 'jeu-Alert', nom: 'Alert' }, instancePresente: false, modele: { nom: 'Alert', sections: [] }, proprietes: [], documentees: [], presentes: [], manquantes: { nom: 'Alert', sections: [] } };

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
  { nom: 'maître imbriqué de library inchangé', reprise: true, depart: (f) => { avecUneInstanceImbriquee(f); f.imbrique.remote = true; }, muter() {} },
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
  // Maîtres de library (16.4) : relus et comparés, une mise à jour de library n'ayant pas d'événement démontré (E5).
  { nom: 'maître de library inchangé', reprise: true, depart: (f) => { f.maitre.remote = true; }, muter() {} },
  { nom: 'maître de library sans événement', reprise: false, depart: (f) => { f.maitre.remote = true; }, muter: (f) => { f.maitre = { ...f.maitre, contenu: 'carré' }; } },
  { nom: 'calque d’une instance de library changé sans événement', reprise: false, depart: (f) => { f.maitre.remote = true; }, muter: (f) => { f.calqueDInstance = 'trait épais'; } },
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

test('un champ sans événement changé pendant le calcul du moteur ne laisse pas reprendre ce moteur au clic suivant', async () => {
  // Les dépendances se lisent avant le moteur : une lecture après lui retiendrait la valeur nouvelle avec un moteur calculé
  // sur l'ancienne, et la validation suivante reprendrait ce moteur périmé (16.7 attend la mémoire de champs de 16.12).
  const fichier = fichierDeDepart();
  fichier.maitre.remote = true;
  const appels = { moteur: 0 };
  const lecteurs = lecteursDe(fichier, appels);
  await traiterAvec({
    ...lecteurs,
    async moteur(...args) {
      const calcule = await lecteurs.moteur(...args);
      // Une mise à jour de library pendant le calcul : aucun événement.
      fichier.maitre = { ...fichier.maitre, contenu: 'carré' };
      return calcule;
    },
  })({ type: 'analyser', demande: 1 }, banc(fichier).contexte);
  const analysee = await demander(fichier, appels, 'analyser');
  assert.equal(appels.moteur, 2, 'le moteur est relancé');
  assert.equal(JSON.stringify(analysee), JSON.stringify(await demander(fichier, appels, 'actualiser')));
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

test('une peinture changée sur une entrée invalidée ne rejoue que l’accessibilité, les couches (C81 lit quels champs sont peints), et les corrections et la projection qui les suivent', async () => {
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
  assert.deepEqual(analysee.reprises, { non: 4, rejouees: 4 });
  const actualisee = await mesuree(fichier, appels, 'actualiser');
  assert.deepEqual(actualisee.reprises, { non: 0, rejouees: 8 });
  assert.equal(JSON.stringify(analysee.affiche), JSON.stringify(actualisee.affiche));
});

/** Les requêtes de l'analyse, dans l'ordre alphabétique : six familles du kit, corrections et projection. */
const REQUETES = ['controle-accessibilite', 'controle-couches', 'controle-mapping', 'controle-nommage', 'controle-oublis', 'controle-typographie', 'corrections', 'projection'];

/** Le banc des mutations locales d'un calque, sur une entrée invalidée par le journal : chaque requête est comptée sous son nom, reprise ou rejouée. */
const MUTATIONS_LOCALES: ReadonlyArray<{ nom: string; mutation: string; rejouees: string[] }> = [
  // C81 juge un layer en dur par ses peintures : en ajouter une rejoue les couches.
  { nom: 'peinture', mutation: 'peinture d’un calque', rejouees: ['controle-accessibilite', 'controle-couches', 'corrections', 'projection'] },
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

  // Un maître de library relu égal : le moteur est repris.
  const distant = fichierDeDepart();
  distant.maitre.remote = true;
  await mesuree(distant, appels, 'analyser');
  assert.deepEqual((await mesuree(distant, appels, 'analyser')).moteur, ['repriseDuMoteur=1']);

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

// Validation du relevé (16.15) : sur une entrée `utilisable`, Analyser relit le relevé en entier et le compare au retenu ;
// égal, l'objet retenu sert. Le relevé lu porte les valeurs résolues : une liaison, une variable, une valeur ou une cible
// d'alias changées sans événement se voient dans la relecture.

/** Une demande mesurée : ce qu'elle affiche, ce que sa trace dit du relevé, et l'entrée promue après elle. */
async function demandeDuReleve(fichier: Fichier, appels: { moteur: number }, intention: 'analyser' | 'actualiser', surcharge: Partial<Lecteurs> = {}) {
  const b = banc(fichier);
  await traiterAvec({ ...lecteursDe(fichier, appels), ...surcharge })({ type: 'analyser', intention, demande: 1, mesurer: true }, b.contexte);
  const final = b.envoyes.find((message) => message.type === 'analyse');
  assert.ok(final && 'mesure' in final && typeof final.mesure === 'object', 'la trace de la demande est rendue');
  const affiche = affichage(b);
  return {
    affiche: JSON.stringify({ ...affiche, messages: affiche.messages.map((message) => { const { mesure, ...reste } = message as PluginMessage & { mesure?: unknown }; return reste; }) }),
    releve: Object.keys(final.mesure.compteurs).filter((nom) => nom === 'repriseDuReleve' || nom.startsWith('nonRepriseDuReleve:')).sort(),
    mesure: final.mesure,
    entree: sessionDesAnalyses().entree('Alert'),
  };
}

test('un second Analyser sans changement relit le relevé, le trouve égal et sert l’objet retenu ; Actualiser ne le reprend jamais ; affichage égal', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const premiere = await demandeDuReleve(fichier, appels, 'analyser');
  assert.deepEqual(premiere.releve, [], 'sans entrée, rien à valider');
  const seconde = await demandeDuReleve(fichier, appels, 'analyser');
  assert.deepEqual(seconde.releve, ['repriseDuReleve']);
  assert.equal(typeof seconde.mesure.compteurs.msValidationDuReleve, 'number');
  assert.equal(seconde.entree?.sorties.releve, premiere.entree?.sorties.releve, 'l’entrée promue garde l’objet retenu');
  assert.equal(appels.moteur, 1);
  const actualisee = await demandeDuReleve(fichier, appels, 'actualiser');
  assert.deepEqual(actualisee.releve, [], 'Actualiser ne compare rien');
  assert.notEqual(actualisee.entree?.sorties.releve, seconde.entree?.sorties.releve, 'Actualiser retient le relevé qu’il vient de lire');
  assert.equal(seconde.affiche, actualisee.affiche);
});

const SANS_EVENEMENT: ReadonlyArray<{ nom: string; muter(fichier: Fichier): void }> = [
  { nom: 'liaison vers une variable de même valeur', muter: (f) => { f.layers[0] = base('fond', { id: 'VariableID:3', cle: 'k-rayon-bis', nom: 'alert/size/radius-bis' }); } },
  { nom: 'liaison retirée', muter: (f) => { f.layers[1] = { ...f.layers[1], liaisons: [] }; } },
  {
    nom: 'liaison d’une plage de texte',
    muter: (f) => {
      const titre = f.layers[2];
      const liaison = { champ: 'fontSize', plage: { debut: 0, fin: 5 }, porteur: 'titre', variable: { ...f.variable, collection: 'components', distante: false } };
      f.layers[2] = { ...titre, liaisons: [...titre.liaisons, liaison], texte: { style: 'Body', plages: [{ debut: 0, fin: 5, fontSize: 14, fontWeight: 400, peintures: [], liaisons: [liaison] }] } };
    },
  },
  { nom: 'nom d’une variable liée', muter: (f) => { f.layers = f.layers.map((layer) => ({ ...layer, liaisons: layer.liaisons.map((liaison) => ({ ...liaison, variable: { ...liaison.variable, nom: 'alert/size/rayon' } })) })); } },
  // Le relevé lit la boîte résolue : une valeur liée qui change élargit le calque sans `nodechange` démontré.
  { nom: 'valeur d’une variable liée, vue dans la boîte du calque', muter: (f) => { f.valeur = 14; f.layers[0] = { ...f.layers[0], dimensions: { x: 0, y: 0, largeur: 24, hauteur: 20 } }; } },
  // Une cible d'alias changée change la couleur résolue de la peinture liée.
  {
    nom: 'cible d’alias changée, vue dans la couleur résolue',
    muter: (f) => { f.layers[0] = { ...f.layers[0], peintures: [{ champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 0, g: 0, b: 1, a: 1 } }] }; },
  },
  { nom: 'collection d’une variable liée renommée', muter: (f) => { f.layers[3] = { ...f.layers[3], liaisons: f.layers[3].liaisons.map((liaison) => ({ ...liaison, variable: { ...liaison.variable, collection: 'composants' } })) }; } },
];

for (const { nom, muter } of SANS_EVENEMENT) {
  test(`relevé relu et non repris après un changement sans événement : ${nom} ; affichage égal à Actualiser`, async () => {
    const fichier = fichierDeDepart();
    const appels = { moteur: 0 };
    const premiere = await demandeDuReleve(fichier, appels, 'analyser');
    muter(fichier);
    const analysee = await demandeDuReleve(fichier, appels, 'analyser');
    assert.deepEqual(analysee.releve, ['nonRepriseDuReleve:different']);
    assert.notEqual(analysee.entree?.sorties.releve, premiere.entree?.sorties.releve);
    assert.equal(analysee.affiche, (await demandeDuReleve(fichier, appels, 'actualiser')).affiche);
  });
}

test('une liaison changée dans un variant de wrapper que l’hôte n’instancie pas, sans événement, rend le relevé différent ; affichage égal à Actualiser', async () => {
  const fichier = fichierDeDepart();
  const liaison = (cle: string) => ({ champ: 'itemSpacing', porteur: 'w-large', variable: { id: `id-${cle}`, cle, nom: `alert/size/large/${cle}`, collection: 'components', distante: false } });
  fichier.wrappers = [{
    id: 'jeu-wrapper', cle: 'cle-wrapper', nom: '.sizeWrapperAlert',
    proprietes: [{ nom: 'Size', type: 'VARIANT', valeurs: ['Medium', 'Large'], defaut: 'Medium' }],
    variants: [
      { id: 'w-medium', nom: 'Size=Medium', valeurs: { Size: 'Medium' }, liaisons: [] },
      { id: 'w-large', nom: 'Size=Large', valeurs: { Size: 'Large' }, liaisons: [liaison('gap')] },
    ],
  }];
  const appels = { moteur: 0 };
  const premiere = await demandeDuReleve(fichier, appels, 'analyser');
  const identique = await demandeDuReleve(fichier, appels, 'analyser');
  assert.deepEqual(identique.releve, ['repriseDuReleve'], 'le relevé d’un wrapper inchangé est repris');
  fichier.wrappers[0].variants[1].liaisons = [liaison('padding')];
  const analysee = await demandeDuReleve(fichier, appels, 'analyser');
  assert.deepEqual(analysee.releve, ['nonRepriseDuReleve:different']);
  assert.notEqual(analysee.entree?.sorties.releve, premiere.entree?.sorties.releve);
  assert.equal(analysee.affiche, (await demandeDuReleve(fichier, appels, 'actualiser')).affiche);
});

test('un champ de nœud changé avec son nodechange invalide l’entrée : le relevé n’est pas validé, il se relit par le chemin complet', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const prelectures: number[] = [];
  const prelecture = async () => { prelectures.push(1); return 0; };
  await demandeDuReleve(fichier, appels, 'analyser', { prelecture });
  const mutation = MUTATIONS.find(({ nom }) => nom === 'nom d’un calque')!;
  mutation.muter(fichier);
  mutation.evenements?.(contexteDesEvenements(fichier));
  assert.equal(etatDeLEntree('Alert').etat, 'invalide');
  const analysee = await demandeDuReleve(fichier, appels, 'analyser', { prelecture });
  assert.deepEqual(analysee.releve, [], 'aucune comparaison du relevé');
  assert.deepEqual(prelectures, [], 'aucune prélecture sur une entrée invalide');
  assert.equal(analysee.affiche, (await demandeDuReleve(fichier, appels, 'actualiser', { prelecture })).affiche);
  assert.deepEqual(prelectures, [], 'ni sur Actualiser');
});

test('la prélecture reçoit le relevé retenu sur une entrée utilisable ; une prélecture qui échoue ne change rien', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const recus: unknown[] = [];
  await demandeDuReleve(fichier, appels, 'analyser', { prelecture: async (retenu) => { recus.push(retenu); return 0; } });
  assert.equal(recus.length, 0, 'sans entrée, aucune prélecture');
  const retenu = sessionDesAnalyses().entree('Alert')?.sorties.releve;
  const seconde = await demandeDuReleve(fichier, appels, 'analyser', { prelecture: async (releve) => { recus.push(releve); throw new Error('Figma refuse'); } });
  assert.equal(recus.length, 1);
  assert.equal(recus[0], retenu);
  assert.deepEqual(seconde.releve, ['repriseDuReleve']);
  assert.equal(seconde.affiche, (await demandeDuReleve(fichier, appels, 'actualiser')).affiche);
});

test('un changement du jeu reçu pendant la relecture du relevé périme la demande, qui ne promeut rien', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await demandeDuReleve(fichier, appels, 'analyser');
  const retenue = sessionDesAnalyses().entree('Alert');
  const b = banc(fichier);
  await traiterAvec({
    ...lecteursDe(fichier, appels),
    async releve() {
      surChangementDuDocument([noeud('PROPERTY_CHANGE', 'fond', ['v-Alert', 'jeu-Alert'], ['fills'])], b.contexte);
      return { statut: 'lu', releve: releveDe(fichier) };
    },
  })({ type: 'analyser', demande: 1 }, b.contexte);
  assert.deepEqual(b.envoyes.filter(({ type }) => type === 'perime').map((message) => ('cause' in message ? message.cause : null)), ['document']);
  assert.equal(sessionDesAnalyses().entree('Alert'), retenue, 'l’entrée d’avant reste, rien n’est promu');
});

// Prélecture à la sélection (16.16) : une analyse discrète, sans message vers l'interface, qui promeut son entrée. Le clic qui
// la suit valide cette entrée comme n'importe quelle autre ; un clic pendant la prélecture la prend au premier plan.

/** Les lectures de la prélecture sans pause réelle : le mode discret cède par `setTimeout(16)` en production. */
const SANS_PAUSE = { pauseDiscrete: async () => {} };

async function preluire(fichier: Fichier, appels: { moteur: number }, surcharge: Partial<Lecteurs> = {}): Promise<Banc> {
  const b = banc(fichier);
  await traiterAvec({ ...lecteursDe(fichier, appels), ...surcharge }, SANS_PAUSE)({ type: 'analyser', origine: 'prelecture' }, b.contexte);
  return b;
}

/** Une lecture qui s'arrête à son entrée jusqu'à `liberer()` : de quoi placer un clic ou un événement pendant la prélecture. */
function portail() {
  let entree!: () => void;
  let liberer!: () => void;
  const entre = new Promise<void>((resolve) => { entree = resolve; });
  const ouvert = new Promise<void>((resolve) => { liberer = resolve; });
  return { entre, entree, ouvert, liberer };
}

const typesEnvoyes = (b: Banc): string[] => b.envoyes.map(({ type }) => type);

test('une prélecture finie ne parle pas à l’interface et promeut une entrée que le clic suivant reprend, relevé et moteur ; affichage égal à Actualiser', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const b = await preluire(fichier, appels);
  assert.deepEqual(b.envoyes, [], 'aucun message vers l’interface');
  assert.equal(appels.moteur, 1);
  assert.equal(etatDeLEntree('Alert').etat, 'utilisable');
  const clic = await demandeDuReleve(fichier, appels, 'analyser');
  assert.deepEqual(clic.releve, ['repriseDuReleve']);
  assert.equal(appels.moteur, 1, 'le moteur de la prélecture sert');
  assert.equal(clic.mesure.compteurs.repriseDuMoteur, 1);
  assert.equal(clic.mesure.compteurs['clicApresPrelecture:repris'], 1);
  assert.equal(clic.mesure.compteurs.prelecturesLancees, 1, 'la prélecture dépose ses compteurs dans la première trace qui la suit');
  assert.equal(clic.mesure.compteurs.prelecturesPromues, 1);
  const actualisee = await demandeDuReleve(fichier, appels, 'actualiser');
  assert.equal(appels.moteur, 2, 'Actualiser reconstruit');
  assert.equal(clic.affiche, actualisee.affiche);
  assert.equal(actualisee.mesure.compteurs.prelecturesLancees, undefined, 'les compteurs ne se versent qu’une fois');
});

for (const mutation of MUTATIONS) {
  test(`parité avec Actualiser, entrée promue par une prélecture, après : ${mutation.nom}`, async () => {
    const fichier = fichierDeDepart();
    mutation.depart?.(fichier);
    const appels = { moteur: 0 };
    await preluire(fichier, appels);
    assert.equal(appels.moteur, 1);
    const analysee = await muterPuisAnalyser(mutation, fichier, appels);
    const moteursAvantActualiser = appels.moteur;
    const actualisee = await demander(fichier, appels, 'actualiser');
    assert.equal(appels.moteur, moteursAvantActualiser + 1, 'Actualiser reconstruit sans rien reprendre');
    assert.equal(JSON.stringify(analysee), JSON.stringify(actualisee), 'même objet affiché, dans le même ordre');
  });
}

test('une prélecture sur une entrée utilisable ne fait rien : ni lecture, ni message, ni compteur', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await demander(fichier, appels, 'analyser');
  const retenue = sessionDesAnalyses().entree('Alert');
  // Une sélection ailleurs périme l'analyse affichée sans toucher à l'entrée : seule l'entrée utilisable retient alors la prélecture.
  surSelection('autre-composant', 'figma', banc(fichier).contexte);
  assert.equal(etatDeLEntree('Alert').etat, 'utilisable');
  const b = await preluire(fichier, appels);
  assert.deepEqual(b.envoyes, []);
  assert.equal(appels.moteur, 1);
  assert.equal(sessionDesAnalyses().entree('Alert'), retenue);
  assert.equal(operationEnCours(), null);
  const suivante = await demandeDuReleve(fichier, appels, 'analyser');
  assert.equal(suivante.mesure.compteurs.prelecturesLancees, undefined);
});

test('une prélecture ne remplace pas l’analyse que l’interface affiche : elle ne lit rien tant qu’elle est applicable', async () => {
  const fichier = fichierDeDepart();
  fichier.catalogueIncomplet = true;
  const appels = { moteur: 0 };
  await demander(fichier, appels, 'analyser');
  assert.equal(etatDeLEntree('Alert').etat, 'a-relire', 'l’entrée n’est pas utilisable : seule l’analyse affichée retient la prélecture');
  const identite = analyseCourante();
  const lues: string[] = [];
  const lecteurSujet: Partial<Lecteurs> = { sujet: async (...args) => { lues.push('sujet'); return lecteursDe(fichier, appels).sujet(...args); } };
  const b = await preluire(fichier, appels, lecteurSujet);
  assert.deepEqual(b.envoyes, []);
  assert.deepEqual(lues, []);
  assert.equal(analyseCourante(), identite);
  // Une fois l'analyse périmée, la prélecture peut la remplacer sans rien annoncer.
  surChangementDuDocument([noeud('PROPERTY_CHANGE', 'fond', ['v-Alert', 'jeu-Alert'], ['fills'])], b.contexte);
  const apres = await preluire(fichier, appels, lecteurSujet);
  assert.deepEqual(lues, ['sujet']);
  assert.deepEqual(apres.envoyes, []);
});

test('un clic pendant la lecture du relevé prend la prélecture au premier plan : une seule analyse, annoncée comme une analyse ordinaire, égale à Actualiser', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const b = banc(fichier);
  const lecteurs = lecteursDe(fichier, appels);
  const arret = portail();
  const traiter = traiterAvec({ ...lecteurs, releve: async (...args) => { arret.entree(); await arret.ouvert; return lecteurs.releve(...args); } }, SANS_PAUSE);
  const prelecture = traiter({ type: 'analyser', origine: 'prelecture' }, b.contexte);
  await arret.entre;
  assert.deepEqual(b.envoyes, [], 'rien n’est annoncé pendant la prélecture');
  assert.equal(operationEnCours(), 'prelecture');
  const clic = traiter({ type: 'analyser', intention: 'analyser', demande: 1 }, b.contexte);
  assert.equal(operationEnCours(), 'analyse', 'la prélecture est désormais une analyse du designer');
  arret.liberer();
  await Promise.all([prelecture, clic]);
  assert.equal(operationEnCours(), null);
  assert.equal(appels.moteur, 1, 'une seule analyse au bout');
  const types = typesEnvoyes(b);
  assert.equal(types.filter((type) => type === 'analyse-commencee').length, 1);
  assert.equal(types.filter((type) => type === 'analyse').length, 1);
  assert.ok(types.indexOf('analyse-commencee') < types.indexOf('analyse-provisoire') && types.indexOf('analyse-provisoire') < types.indexOf('analyse'));
  for (const message of b.envoyes) {
    const { demande } = message as { demande?: number };
    if (demande !== undefined) assert.equal(demande, 1, 'tout porte la demande du clic');
  }
  const analysee = affichage(b);
  const actualisee = await demander(fichier, { moteur: 0 }, 'actualiser');
  assert.equal(JSON.stringify(analysee), JSON.stringify(actualisee));
});

test('un clic pendant le calcul du moteur prend la prélecture au premier plan et rend le même résultat final qu’Actualiser', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  retenirLesLiaisons(new Map());
  const b = banc(fichier);
  const lecteurs = lecteursDe(fichier, appels);
  const arret = portail();
  const traiter = traiterAvec({ ...lecteurs, moteur: async (...args) => { arret.entree(); await arret.ouvert; return lecteurs.moteur(...args); } }, SANS_PAUSE);
  const prelecture = traiter({ type: 'analyser', origine: 'prelecture' }, b.contexte);
  await arret.entre;
  const clic = traiter({ type: 'analyser', intention: 'analyser', demande: 1, mesurer: true }, b.contexte);
  arret.liberer();
  await Promise.all([prelecture, clic]);
  const types = typesEnvoyes(b);
  assert.equal(types.filter((type) => type === 'analyse').length, 1);
  assert.equal(types[0], 'analyse-commencee');
  const final = b.envoyes.find((message) => message.type === 'analyse');
  const liaisons = [...liaisonsRetenues()];
  assert.ok(liaisons.length > 0, 'la prise pose les liaisons que la prélecture avait lues avant elle');
  assert.ok(final && 'mesure' in final && final.mesure, 'la demande du clic était mesurée : la trace s’ouvre à la prise');
  assert.equal(final.mesure.compteurs['clicApresPrelecture:premierPlan'], 1);
  const { mesure, ...sansMesure } = final as PluginMessage & { mesure?: unknown };
  const actualisee = await demandeDuReleve(fichier, { moteur: 0 }, 'actualiser');
  const finalActualise = JSON.parse(actualisee.affiche).messages.find((message: { type: string }) => message.type === 'analyse');
  assert.equal(JSON.stringify({ ...sansMesure, analyse: { sujet: 'Alert' } }), JSON.stringify(finalActualise));
  assert.deepEqual([...liaisonsRetenues()], liaisons, 'les mêmes liaisons qu’Actualiser');
});

test('un clic Actualiser pendant la prélecture l’arrête : l’analyse du clic court seule, sans rien reprendre', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const b = banc(fichier);
  const lecteurs = lecteursDe(fichier, appels);
  const arret = portail();
  const traiter = traiterAvec({ ...lecteurs, releve: async (...args) => { arret.entree(); await arret.ouvert; return lecteurs.releve(...args); } }, SANS_PAUSE);
  const prelecture = traiter({ type: 'analyser', origine: 'prelecture' }, b.contexte);
  await arret.entre;
  const clic = traiter({ type: 'analyser', intention: 'actualiser', demande: 1 }, b.contexte);
  arret.liberer();
  await Promise.all([prelecture, clic]);
  assert.equal(typesEnvoyes(b).filter((type) => type === 'analyse').length, 1, 'la prélecture annulée ne rend rien');
  assert.equal(appels.moteur, 1, 'seule l’analyse du clic a lancé le moteur');
  assert.equal(JSON.stringify(affichage(b)), JSON.stringify(await demander(fichier, { moteur: 0 }, 'actualiser')));
});

test('un catalogue de prélecture qui a évité un import n’est pas promu, et un clic pendant la prélecture la remplace par une demande ordinaire', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const options: unknown[] = [];
  const lecteurs = lecteursDe(fichier, appels);
  const sansImport: Partial<Lecteurs> = {
    catalogue: async (_releve, _jeton, _contexte, _cooperation, _libraries, _inventaires, opt) => {
      options.push(opt?.sansImport ?? false);
      if (opt?.sansImport) opt.importsEvites?.(1);
      return catalogueDe(fichier);
    },
  };
  // Prélecture seule : l'import évité la rend partielle, rien n'est promu.
  const seule = await preluire(fichier, appels, sansImport);
  assert.deepEqual(seule.envoyes, []);
  assert.deepEqual(options, [true]);
  assert.equal(sessionDesAnalyses().entree('Alert'), null, 'un catalogue incomplet ne se promeut pas');
  // Clic pendant la prélecture, une fois le catalogue lu sans import : la prélecture n'est plus prenable.
  reinitialiserLAnalyse();
  options.length = 0;
  appels.moteur = 0;
  const b = banc(fichier);
  const arret = portail();
  const traiter = traiterAvec({ ...lecteurs, ...sansImport, moteur: async (...args) => { arret.entree(); await arret.ouvert; return lecteurs.moteur(...args); } }, SANS_PAUSE);
  const prelecture = traiter({ type: 'analyser', origine: 'prelecture' }, b.contexte);
  await arret.entre;
  await new Promise((resolve) => setTimeout(resolve, 5));
  const clic = traiter({ type: 'analyser', intention: 'analyser', demande: 1 }, b.contexte);
  arret.liberer();
  await Promise.all([prelecture, clic]);
  assert.deepEqual(options, [true, false], 'la demande du clic lit le catalogue avec ses imports');
  assert.equal(typesEnvoyes(b).filter((type) => type === 'analyse').length, 1);
  assert.equal(JSON.stringify(affichage(b)), JSON.stringify(await demander(fichier, { moteur: 0 }, 'actualiser')));
});

test('un clic qui prend la prélecture pendant son catalogue relit le catalogue avec les imports si le premier en a évité un', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const lecteurs = lecteursDe(fichier, appels);
  const arret = portail();
  const options: unknown[] = [];
  const traiter = traiterAvec({
    ...lecteurs,
    catalogue: async (_releve, _jeton, _contexte, _cooperation, _libraries, _inventaires, opt) => {
      options.push(opt?.sansImport ?? false);
      if (opt?.sansImport) {
        arret.entree();
        await arret.ouvert;
        opt.importsEvites?.(1);
      }
      return catalogueDe(fichier);
    },
  }, SANS_PAUSE);
  const b = banc(fichier);
  const prelecture = traiter({ type: 'analyser', origine: 'prelecture' }, b.contexte);
  await arret.entre;
  const clic = traiter({ type: 'analyser', intention: 'analyser', demande: 1 }, b.contexte);
  arret.liberer();
  await Promise.all([prelecture, clic]);
  assert.deepEqual(options, [true, false]);
  assert.equal(appels.moteur, 1);
  assert.equal(typesEnvoyes(b).filter((type) => type === 'analyse').length, 1);
  assert.equal(etatDeLEntree('Alert').etat, 'utilisable');
  assert.equal(JSON.stringify(affichage(b)), JSON.stringify(await demander(fichier, { moteur: 0 }, 'actualiser')));
});

test('un événement qui annule la prélecture ne laisse rien promu ni annoncé, périmée ou non', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const b = banc(fichier);
  const lecteurs = lecteursDe(fichier, appels);
  const arret = portail();
  const traiter = traiterAvec({ ...lecteurs, releve: async (...args) => { arret.entree(); await arret.ouvert; return lecteurs.releve(...args); } }, SANS_PAUSE);
  const prelecture = traiter({ type: 'analyser', origine: 'prelecture' }, b.contexte);
  await arret.entre;
  // Un changement du jeu périmerait une analyse ordinaire en le disant à l'interface ; la prélecture se tait.
  surChangementDuDocument([noeud('PROPERTY_CHANGE', 'fond', ['v-Alert', 'jeu-Alert'], ['fills'])], b.contexte);
  assert.equal(annulerLaPrelecture(), false, 'la péremption de son analyse a déjà levé son jeton, et un jeton levé ne se lève pas deux fois');
  arret.liberer();
  await prelecture;
  assert.deepEqual(b.envoyes, []);
  assert.equal(sessionDesAnalyses().entree('Alert'), null);
  assert.equal(appels.moteur, 0, 'le relevé annulé n’a pas laissé le moteur tourner');
  assert.equal(operationEnCours(), null);
  const suivante = await demandeDuReleve(fichier, appels, 'analyser');
  assert.equal(suivante.mesure.compteurs.prelecturesLancees, 1);
  assert.equal(suivante.mesure.compteurs.prelecturesAnnulees, 1);
  assert.equal(suivante.mesure.compteurs.prelecturesPromues, undefined);
});

test('une écriture du plugin passe avant la prélecture : elle l’arrête, attend sa fin et prend la place sans `occupe`, rien n’est promu ni annoncé', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const b = banc(fichier);
  const lecteurs = lecteursDe(fichier, appels);
  const arret = portail();
  const traiter = traiterAvec({ ...lecteurs, releve: async (...args) => { arret.entree(); await arret.ouvert; return lecteurs.releve(...args); } }, SANS_PAUSE);
  const prelecture = traiter({ type: 'analyser', origine: 'prelecture' }, b.contexte);
  await arret.entre;
  const demandee = prendreLaPlaceDUneEcriture({ sujet: 'structure', generation: 0 });
  let prise = false;
  void demandee.then(() => { prise = true; });
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(prise, false, 'la place attend la fin de la prélecture');
  arret.liberer();
  await prelecture;
  const place = await demandee;
  assert.ok('liberer' in place, 'l’écriture prend la place sans recevoir `occupe`');
  assert.equal(operationEnCours(), 'ecriture');
  place.liberer();
  assert.equal(operationEnCours(), null);
  assert.deepEqual(b.envoyes, []);
  assert.equal(sessionDesAnalyses().entree('Alert'), null);
});

test('une écriture qui passe avant la prélecture rend la place après sa fin : le clic qui suit court seul, ses événements jugés ; affichage égal à Actualiser', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const b = banc(fichier);
  const lecteurs = lecteursDe(fichier, appels);
  const arret = portail();
  const sujetDuClic = portail();
  let sujets = 0;
  let prelectureEnVol = false;
  let enVolAuClic: boolean | null = null;
  const traiter = traiterAvec({
    ...lecteurs,
    async sujet(...args) {
      sujets += 1;
      if (sujets === 2) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        enVolAuClic = prelectureEnVol;
        sujetDuClic.entree();
        await sujetDuClic.ouvert;
      }
      return lecteurs.sujet(...args);
    },
    async releve(...args) {
      if (sujets === 1) {
        prelectureEnVol = true;
        arret.entree();
        await arret.ouvert;
      }
      return lecteurs.releve(...args);
    },
  }, SANS_PAUSE);
  const prelecture = traiter({ type: 'analyser', origine: 'prelecture' }, b.contexte).then(() => { prelectureEnVol = false; });
  await arret.entre;
  setTimeout(() => arret.liberer(), 20);
  const place = await prendreLaPlaceDUneEcriture({ sujet: 'structure', generation: 0 });
  assert.ok('liberer' in place);
  place.liberer();
  const clic = traiter({ type: 'analyser', intention: 'analyser', demande: 1 }, b.contexte);
  await prelecture;
  await sujetDuClic.entre;
  // Un changement du jeu reçu avant que le clic connaisse son inventaire : sa garde des événements doit le juger.
  surChangementDuDocument([noeud('PROPERTY_CHANGE', 'fond', ['v-Alert', 'jeu-Alert'], ['fills'])], b.contexte);
  sujetDuClic.liberer();
  await clic;
  assert.equal(enVolAuClic, false, 'la prélecture a fini avant que le clic lise son sujet');
  assert.deepEqual(b.envoyes.filter(({ type }) => type === 'perime').map((message) => ('cause' in message ? message.cause : null)), ['document']);
  const suivante = await demander(fichier, appels, 'analyser');
  assert.equal(JSON.stringify(suivante), JSON.stringify(await demander(fichier, appels, 'actualiser')));
});

// Arrêtée au sujet, la prélecture n'a pas encore ouvert son analyse ; arrêtée au catalogue, elle a lu l'ancien niveau.
for (const arretDeLaPrelecture of ['sujet', 'catalogue'] as const) test(`un changement de niveau pendant la prélecture, arrêtée au ${arretDeLaPrelecture}, l’arrête : le clic lit le nouveau niveau, son analyse est applicable, affichage égal à Actualiser`, async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const b = banc(fichier);
  const lecteurs = lecteursDe(fichier, appels);
  const arret = portail();
  let lectures = 0;
  const bloquer = async (): Promise<void> => {
    lectures += 1;
    if (lectures === 1) { arret.entree(); await arret.ouvert; }
  };
  const surcharge: Partial<Lecteurs> = arretDeLaPrelecture === 'sujet'
    ? { sujet: async (...args) => { await bloquer(); return lecteurs.sujet(...args); } }
    : { catalogue: async (...args) => { await bloquer(); return lecteurs.catalogue(...args); } };
  const traiter = traiterAvec({ ...lecteurs, ...surcharge }, SANS_PAUSE);
  const prelecture = traiter({ type: 'analyser', origine: 'prelecture' }, b.contexte);
  await arret.entre;
  const reglages: Contexte = {
    figma: { clientStorage: { getAsync: async () => fichier.niveau, setAsync: async (_cle: string, niveau: 'AA' | 'AAA') => { fichier.niveau = niveau; } } } as unknown as PluginAPI,
    envoyer() {},
    surveillerLeDocument() {},
  };
  await traiterLaConfiguration({ type: 'ranger-niveau', niveau: 'AAA' }, reglages);
  assert.equal(fichier.niveau, 'AAA');
  const clic = traiter({ type: 'analyser', intention: 'analyser', demande: 1 }, b.contexte);
  arret.liberer();
  await Promise.all([prelecture, clic]);
  const identite = analyseCourante();
  assert.ok(identite);
  assert.notEqual(correctionsDeLAnalyse(identite), null, 'l’analyse affichée n’est pas une analyse périmée en silence');
  assert.equal(typesEnvoyes(b).filter((type) => type === 'analyse').length, 1);
  assert.equal(JSON.stringify(affichage(b)), JSON.stringify(await demander(fichier, { moteur: 0 }, 'actualiser')));
});

test('une prélecture annulée ne retient ni ses liaisons ni ses modèles ; une prélecture promue les retient', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  await demander(fichier, appels, 'analyser');
  const liaisons = [...liaisonsRetenues()];
  const modeles = [...modelesDeLAnalyse()];
  assert.ok(liaisons.length > 0 && modeles.length > 0);
  // La prélecture suivante lit d'autres liaisons et un autre modèle, puis s'arrête après les avoir lus.
  fichier.layers[0] = base('fond', { id: 'VariableID:2', cle: 'k-autre', nom: 'alert/size/other' });
  const autres = { ...REGLES, modele: { nom: 'Autre', sections: [] } };
  surSelection('autre-composant', 'figma', banc(fichier).contexte);
  sessionDesAnalyses().vider();
  await preluire(fichier, appels, { regles: async () => { annulerLaPrelecture(); return structuredClone(autres); } });
  assert.equal(sessionDesAnalyses().entree('Alert'), null, 'rien n’est promu');
  assert.deepEqual([...liaisonsRetenues()], liaisons, 'les liaisons de l’analyse du designer restent');
  assert.deepEqual([...modelesDeLAnalyse()], modeles, 'ses modèles aussi');
  await preluire(fichier, appels, { regles: async () => structuredClone(autres) });
  assert.ok(sessionDesAnalyses().entree('Alert'), 'la prélecture complète est promue');
  assert.notDeepEqual([...liaisonsRetenues()], liaisons, 'et retient ses liaisons');
  assert.notDeepEqual([...modelesDeLAnalyse()], modeles, 'et ses modèles');
});

test('une prélecture ne prend pas la place d’une analyse en cours et ne répond jamais `occupe`', async () => {
  const fichier = fichierDeDepart();
  const appels = { moteur: 0 };
  const b = banc(fichier);
  const lecteurs = lecteursDe(fichier, appels);
  const arret = portail();
  const traiter = traiterAvec({ ...lecteurs, releve: async (...args) => { arret.entree(); await arret.ouvert; return lecteurs.releve(...args); } }, SANS_PAUSE);
  const analyse = traiter({ type: 'analyser', demande: 1 }, b.contexte);
  await arret.entre;
  await traiter({ type: 'analyser', origine: 'prelecture' }, b.contexte);
  assert.equal(typesEnvoyes(b).includes('occupe'), false);
  arret.liberer();
  await analyse;
  assert.equal(typesEnvoyes(b).filter((type) => type === 'analyse').length, 1);
});

test('le mode discret cède par tranches de 8 ms avec une pause de 16 ms ; le clic qui prend la prélecture la ramène au budget normal', async () => {
  const fichier = fichierDeDepart();
  const mesurer = async (prise: boolean) => {
    reinitialiserLAnalyse();
    let temps = 0;
    const pauses: number[] = [];
    let normales = 0;
    const lecteurs = lecteursDe(fichier, { moteur: 0 });
    const arret = portail();
    const b = banc(fichier);
    const traiter = traiterAvec({
      ...lecteurs,
      releve: async (...args) => { if (prise) { arret.entree(); await arret.ouvert; } return lecteurs.releve(...args); },
    }, { horloge: () => (temps += 1), pauseDiscrete: async (ms) => { pauses.push(ms); }, respirer: async () => { normales += 1; } });
    const prelecture = traiter({ type: 'analyser', origine: 'prelecture' }, b.contexte);
    if (!prise) {
      await prelecture;
      return { pauses, normales };
    }
    await arret.entre;
    const clic = traiter({ type: 'analyser', demande: 1 }, b.contexte);
    arret.liberer();
    await Promise.all([prelecture, clic]);
    return { pauses, normales };
  };
  const discret = await mesurer(false);
  assert.ok(discret.pauses.length > 0 && discret.pauses.every((ms) => ms === 16), 'chaque cession dure 16 ms');
  assert.equal(discret.normales, 0, 'aucune cession au budget normal pendant la prélecture');
  const prise = await mesurer(true);
  assert.ok(prise.normales > 0, 'après la prise, les cessions suivent le budget normal');
  assert.equal(prise.pauses.length, 0, 'aucune cession discrète avant la prise : la prélecture attendait à l’entrée du relevé');
});

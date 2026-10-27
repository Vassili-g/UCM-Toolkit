/**
 * La fermeture des maîtres (16.3), éprouvée avec le vrai moteur. Un monde fabriqué place sous le jeu `Carte` une instance
 * de `Bouton`, maître local contracté, qui embarque une instance d'`Icone` (contractée aussi), elle-même porteuse d'une
 * instance de `Point`, et une instance de `Fleche`. Le moteur traverse ces maîtres par `indexContractedNames`,
 * `indexMasterInstances`, `scanComposedInstances` et `findWrapperReference`.
 *
 * L'enregistrement des accès range chaque lecture du moteur dans la région qui la couvre au second clic. Sur le monde
 * tout local, le second Analyser reprend le moteur et affiche ce qu'Actualiser affiche ; une mutation d'un maître
 * imbriqué, avec son événement, relance le moteur.
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';

import { oublierLIndexDuDocument } from 'ucm-plugin-socle/src/composant/contract/composedComponents';

import type { PluginMessage } from '../src/messages';
import type { Contexte } from '../src/sandbox/contexte';
import { capturerLeComposant, type CaptureArchitect } from '../src/sandbox/capture';
import { reinitialiserLAnalyse, sessionDesAnalyses, surChangementDuDocument, traiter } from '../src/sandbox/analyse';
import { enregistrerLesAccesDuMoteur } from './outils/accesDuMoteur';
import { noeud, type NoeudFabrique } from './outils/mondeFabrique';

const boite = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });
const noir = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } };

/** Une instance de `maitre` : ses enfants copient ceux du maître, comme Figma les sert. */
function instanceDe(id: string, nom: string, maitre: () => NoeudFabrique, enfants: NoeudFabrique[] = []): NoeudFabrique {
  return noeud(id, 'INSTANCE', { name: nom, visible: true, absoluteBoundingBox: boite(0, 0, 16, 16), componentProperties: {}, componentPropertyReferences: null, overrides: [], getMainComponentAsync: async () => maitre() }, enfants);
}

/** Un jeu de variants d'un seul variant `Forme=Base`. */
function jeuDeVariants(id: string, nom: string, enfants: NoeudFabrique[], champs: Record<string, unknown> = {}): { jeu: NoeudFabrique; variant: NoeudFabrique } {
  const variant = noeud(`${id}-base`, 'COMPONENT', { name: 'Forme=Base', remote: false, visible: true, absoluteBoundingBox: boite(0, 0, 40, 40), variantProperties: { Forme: 'Base' }, fills: [], ...champs }, enfants);
  const jeu = noeud(id, 'COMPONENT_SET', { name: nom, key: `cle-${id}`, remote: false, defaultVariant: variant, componentPropertyDefinitions: { Forme: { type: 'VARIANT', defaultValue: 'Base', variantOptions: ['Base'] } } }, [variant]);
  return { jeu, variant };
}

/** Un conteneur de règles d'usage qui écrit `nom` : la page contracte ce composant. */
const regles = (id: string, nom: string) => noeud(id, 'INSTANCE', { name: '.componentRules', getMainComponentAsync: async () => null }, [
  noeud(`${id}-nom`, 'TEXT', { name: 'component-name', characters: nom }),
]);

function fabriquerLeMondeImbrique({ flecheDistante }: { flecheDistante: boolean }) {
  const etat = { trace: 'rond' };
  const point = noeud('point', 'COMPONENT', { name: 'Point', key: 'cle-point', remote: false, visible: true, absoluteBoundingBox: boite(0, 0, 4, 4) }, [noeud('point-fond', 'RECTANGLE', { visible: true, fills: [noir] })]);
  const icone = jeuDeVariants('icone', 'Icone', [
    noeud('icone-trace', 'VECTOR', { visible: true, get name() { return `trace ${etat.trace}`; }, fills: [noir] }),
    instanceDe('icone-point', 'Point', () => point, [noeud('icone-point-fond', 'RECTANGLE', { visible: true, fills: [noir] })]),
  ]);
  const fleche = noeud('fleche', 'COMPONENT', { name: 'Fleche', key: 'cle-fleche', remote: flecheDistante, visible: true }, [noeud('fleche-trait', 'VECTOR', { visible: true, fills: [noir] })]);
  const bouton = jeuDeVariants('bouton', 'Bouton', [
    noeud('bouton-texte', 'TEXT', { name: 'Libellé', visible: true, characters: 'Valider', fontSize: 14, textStyleId: '', fills: [noir], getStyledTextSegments: () => [] }),
    instanceDe('bouton-icone', 'Icone', () => icone.variant, [noeud('bouton-icone-trace', 'VECTOR', { visible: true, fills: [noir] })]),
    instanceDe('bouton-fleche', 'Fleche', () => fleche, [noeud('bouton-fleche-trait', 'VECTOR', { visible: true, fills: [noir] })]),
  ], { layoutMode: 'HORIZONTAL', itemSpacing: 4 });
  const variantDeCarte = (id: string, etatDeCarte: string) => noeud(id, 'COMPONENT', { name: `Etat=${etatDeCarte}`, visible: true, absoluteBoundingBox: boite(0, 0, 120, 40), variantProperties: { Etat: etatDeCarte }, fills: [noir] }, [
    instanceDe(`${id}-bouton`, 'Bouton', () => bouton.variant, [noeud(`${id}-bouton-texte`, 'TEXT', { name: 'Libellé', visible: true, characters: 'Valider', textStyleId: '', getStyledTextSegments: () => [] })]),
  ]);
  const repos = variantDeCarte('repos', 'Repos');
  const carte = noeud('carte', 'COMPONENT_SET', {
    name: 'Carte', key: 'cle-carte', defaultVariant: repos,
    componentPropertyDefinitions: { Etat: { type: 'VARIANT', defaultValue: 'Repos', variantOptions: ['Repos', 'Survol'] } },
  }, [repos, variantDeCarte('survol', 'Survol')]);
  const enfantsDeLaPage = [carte, bouton.jeu, icone.jeu, point, regles('regles-bouton', 'Bouton'), regles('regles-icone', 'Icone'), ...(flecheDistante ? [] : [fleche])];
  const page = noeud('page', 'PAGE', { name: 'Composants', selection: [carte], loadAsync: async () => {}, on() {}, off() {} }, enfantsDeLaPage);
  const racine = noeud('0:0', 'DOCUMENT', { name: 'Fichier imbriqué', documentColorProfile: 'SRGB' }, [page]);
  page.parent = racine;
  const figma = {
    mixed: Symbol('figma.mixed'),
    fileKey: 'cle-de-fichier',
    skipInvisibleInstanceChildren: false,
    currentPage: page,
    root: Object.assign(racine, { getSharedPluginData: () => '', getSharedPluginDataKeys: () => [] }),
    clientStorage: { getAsync: async () => undefined },
    getNodeByIdAsync: async () => null,
    getStyleByIdAsync: async () => null,
    variables: {
      getLocalVariableCollectionsAsync: async () => [],
      getLocalVariablesAsync: async () => [],
      getVariableByIdAsync: async () => null,
      getVariableCollectionByIdAsync: async () => null,
      importVariableByKeyAsync: async () => { throw new Error('Aucune library'); },
    },
    teamLibrary: { getAvailableLibraryVariableCollectionsAsync: async () => [], getVariablesInLibraryCollectionAsync: async () => [] },
  };
  return { figma, carte, page, etat };
}

const globale = globalThis as { figma?: unknown };

async function capturer(monde: ReturnType<typeof fabriquerLeMondeImbrique>): Promise<CaptureArchitect> {
  const precedent = globale.figma;
  globale.figma = monde.figma;
  try {
    return JSON.parse(JSON.stringify(await capturerLeComposant(monde.figma as unknown as PluginAPI, { jeu: monde.carte, page: monde.page }))) as CaptureArchitect;
  } finally {
    globale.figma = precedent;
  }
}

beforeEach(() => {
  reinitialiserLAnalyse();
  oublierLIndexDuDocument();
});

test('chaque nœud que le moteur lit à travers les maîtres imbriqués est dans le jeu, la fermeture suivie, un maître distant ou une lecture comparée', async () => {
  const bilan = await enregistrerLesAccesDuMoteur(await capturer(fabriquerLeMondeImbrique({ flecheDistante: true })));
  assert.deepEqual(bilan.horsCouverture, []);
  assert.ok(bilan.noeuds.fermeture > 0 && bilan.noeuds.jeu > 0);
  assert.deepEqual(Object.keys(bilan.distants), ['fleche'], 'seul le maître distant reste hors du journal, objet de 16.4');
  assert.equal(bilan.dependances.maitresLus, 5, 'deux instances du jeu, puis les trois instances sous Bouton et Icone');
});

/** Une demande sur le monde, sans la trace ni la génération : ce que l'interface reçoit. */
async function demander(monde: ReturnType<typeof fabriquerLeMondeImbrique>, intention: 'analyser' | 'actualiser') {
  const envoyes: PluginMessage[] = [];
  const contexte: Contexte = { figma: monde.figma as unknown as PluginAPI, envoyer: (m) => envoyes.push(m), surveillerLeDocument: () => [] };
  const precedent = globale.figma;
  globale.figma = monde.figma;
  try {
    await traiter({ type: 'analyser', intention, demande: 1, mesurer: true }, contexte);
  } finally {
    globale.figma = precedent;
  }
  const final = envoyes.find((message) => message.type === 'analyse' && message.statut === 'complete');
  assert.ok(final && 'mesure' in final && typeof final.mesure === 'object', 'la demande va jusqu’au bout et rend sa trace');
  const moteur = Object.keys(final.mesure.compteurs).filter((nom) => nom === 'repriseDuMoteur' || nom.startsWith('nonReprise:')).sort();
  const affiche = envoyes
    .filter(({ type }) => type !== 'analyse-en-cours' && type !== 'analyse-commencee' && type !== 'perime')
    .map((message) => { const { mesure, ...reste } = message as PluginMessage & { mesure?: unknown }; return 'analyse' in reste && reste.analyse ? { ...reste, analyse: { sujet: (reste.analyse as { sujet: unknown }).sujet } } : reste; });
  return { moteur, affiche: JSON.stringify(affiche), contexte };
}

test('sur des maîtres imbriqués tous locaux, le second Analyser reprend le moteur ; une mutation d’un maître imbriqué avec son événement le relance ; chaque affichage égale Actualiser', async () => {
  const monde = fabriquerLeMondeImbrique({ flecheDistante: false });
  await demander(monde, 'analyser');
  const session = sessionDesAnalyses();
  const entree = session.entree(session.sujets()[0] ?? '');
  const suivis = entree?.suivi.maitres;
  assert.ok(suivis && ['icone', 'icone-trace', 'icone-point', 'point', 'point-fond', 'fleche'].every((id) => suivis.has(id)), 'les maîtres imbriqués et leurs descendants sont suivis');
  const seconde = await demander(monde, 'analyser');
  assert.deepEqual(seconde.moteur, ['repriseDuMoteur']);
  assert.equal(seconde.affiche, (await demander(monde, 'actualiser')).affiche);

  monde.etat.trace = 'carre';
  surChangementDuDocument([{ type: 'PROPERTY_CHANGE', id: 'icone-trace', properties: ['name'], node: { id: 'icone-trace', parent: { id: 'icone-base', parent: { id: 'icone', parent: { id: 'page', parent: null } } } } }], seconde.contexte);
  const apres = await demander(monde, 'analyser');
  assert.ok(apres.moteur.length > 0 && !apres.moteur.includes('repriseDuMoteur'), `moteur relancé : ${apres.moteur.join(', ')}`);
  assert.equal(apres.affiche, (await demander(monde, 'actualiser')).affiche);
});

test('sur le même monde, un maître imbriqué distant refuse la reprise par non-couvert:maitres, sans le refus des instances sous un maître', async () => {
  const monde = fabriquerLeMondeImbrique({ flecheDistante: true });
  await demander(monde, 'analyser');
  assert.deepEqual((await demander(monde, 'analyser')).moteur, ['nonReprise:non-couvert:maitres']);
});

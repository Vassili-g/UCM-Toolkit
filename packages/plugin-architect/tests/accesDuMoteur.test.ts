/**
 * La fermeture des maîtres (16.3) et la relecture des maîtres distants (16.4), éprouvées avec le vrai moteur. Un monde fabriqué place sous le jeu `Carte` une instance
 * de `Bouton`, maître local contracté, qui embarque une instance d'`Icone` (contractée aussi), elle-même porteuse d'une
 * instance de `Point`, et une instance de `Fleche`. Le moteur traverse ces maîtres par `indexContractedNames`,
 * `indexMasterInstances`, `scanComposedInstances` et `findWrapperReference`.
 *
 * L'enregistrement des accès range chaque lecture du moteur dans la région qui la couvre au second clic. Sur le monde
 * tout local, le second Analyser reprend le moteur et affiche ce qu'Actualiser affiche ; une mutation d'un maître
 * imbriqué, avec son événement, relance le moteur. Avec `Fleche` distante, sa relecture laisse reprendre le moteur, et le
 * calque de son instance changé sans événement le relance. Avec `variableDeLibrary`, le jeu porte une enveloppe de tailles
 * dont un variant lie une variable de library : le moteur la lit par identifiant, et son renommage sans événement le relance.
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

/**
 * La variable de library liée aux marges du variant `Taille=Large` de l'enveloppe, et sa collection. Le moteur lit les
 * tailles sur les variants de l'enveloppe (`findWrapperReference`, `extractSizes`) et tire le nom du token de ces deux
 * lectures ; le relevé lit aussi les variants du jeu de l'enveloppe, pour les tokens de taille que l'hôte ne lie pas, et voit
 * donc le renommage.
 */
const ESPACEMENT = 'VariableID:cle-espacement/1:1';
/** La variable de library que porte l'instance de l'enveloppe dans le jeu, lue aussi par le relevé. */
const MARGE = 'VariableID:cle-marge/1:2';
const COLLECTION_DE_LIBRARY = 'VariableCollectionId:cle-layout/1:1';
const COLLECTION_DES_MARGES = 'VariableCollectionId:cle-marges/1:2';

function fabriquerLeMondeImbrique({ flecheDistante, variableDeLibrary = false }: { flecheDistante: boolean; variableDeLibrary?: boolean }) {
  const etat = { trace: 'rond', trait: 'trait', espacement: 'gap/small', collection: 'layout' };
  // Une mise à jour de library acceptée renomme la variable sans aucun événement sur les nœuds qui la lient.
  const variable = (id: string) => ({ id, key: id === ESPACEMENT ? 'cle-espacement' : 'cle-marge', name: id === ESPACEMENT ? etat.espacement : 'padding/small', variableCollectionId: id === ESPACEMENT ? COLLECTION_DE_LIBRARY : COLLECTION_DES_MARGES, remote: true, resolvedType: 'FLOAT', scopes: ['GAP'], valuesByMode: { 'm:1': 8 } });
  const marges = (id: string) => ({ paddingLeft: { type: 'VARIABLE_ALIAS', id }, paddingRight: { type: 'VARIABLE_ALIAS', id } });
  const tailleDEnveloppe = (taille: string, id: string) => noeud(`enveloppe-${taille}`, 'COMPONENT', {
    name: `Taille=${taille}`, remote: false, visible: true, absoluteBoundingBox: boite(0, 0, 40, 20), variantProperties: { Taille: taille }, fills: [],
    layoutMode: 'HORIZONTAL', paddingLeft: 8, paddingRight: 8, paddingTop: 0, paddingBottom: 0, itemSpacing: 0, boundVariables: marges(id),
  }, []);
  const petite = tailleDEnveloppe('Small', MARGE);
  const enveloppe = noeud('enveloppe', 'COMPONENT_SET', {
    name: '.sizeWrapperCarte', key: 'cle-enveloppe', remote: false, defaultVariant: petite,
    componentPropertyDefinitions: { Taille: { type: 'VARIANT', defaultValue: 'Small', variantOptions: ['Small', 'Large'] } },
  }, [petite, tailleDEnveloppe('Large', ESPACEMENT)]);
  const collection = (id: string) => ({ id, key: id === COLLECTION_DE_LIBRARY ? 'cle-layout' : 'cle-marges', name: id === COLLECTION_DE_LIBRARY ? etat.collection : 'marges', remote: true, defaultModeId: 'm:1', modes: [{ modeId: 'm:1', name: 'Valeur' }] });
  const point = noeud('point', 'COMPONENT', { name: 'Point', key: 'cle-point', remote: false, visible: true, absoluteBoundingBox: boite(0, 0, 4, 4) }, [noeud('point-fond', 'RECTANGLE', { visible: true, fills: [noir] })]);
  const icone = jeuDeVariants('icone', 'Icone', [
    noeud('icone-trace', 'VECTOR', { visible: true, get name() { return `trace ${etat.trace}`; }, fills: [noir] }),
    instanceDe('icone-point', 'Point', () => point, [noeud('icone-point-fond', 'RECTANGLE', { visible: true, fills: [noir] })]),
  ]);
  const fleche = noeud('fleche', 'COMPONENT', { name: 'Fleche', key: 'cle-fleche', remote: flecheDistante, visible: true }, [noeud('fleche-trait', 'VECTOR', { visible: true, fills: [noir] })]);
  const bouton = jeuDeVariants('bouton', 'Bouton', [
    noeud('bouton-texte', 'TEXT', { name: 'Libellé', visible: true, characters: 'Valider', fontSize: 14, textStyleId: variableDeLibrary ? 'S:libelle' : '', effectStyleId: variableDeLibrary ? 'S:ombre' : '', fills: [noir], getStyledTextSegments: () => [] }),
    instanceDe('bouton-icone', 'Icone', () => icone.variant, [noeud('bouton-icone-trace', 'VECTOR', { visible: true, fills: [noir] })]),
    // Le calque de l'instance suit son maître : une mise à jour de library le change sans événement.
    instanceDe('bouton-fleche', 'Fleche', () => fleche, [noeud('bouton-fleche-trait', 'VECTOR', { visible: true, get name() { return etat.trait; }, fills: [noir] })]),
  ], { layoutMode: 'HORIZONTAL', itemSpacing: 4 });
  const variantDeCarte = (id: string, etatDeCarte: string) => noeud(id, 'COMPONENT', { name: `Etat=${etatDeCarte}`, visible: true, absoluteBoundingBox: boite(0, 0, 120, 40), variantProperties: { Etat: etatDeCarte }, fills: [noir] }, [
    instanceDe(`${id}-bouton`, 'Bouton', () => bouton.variant, [noeud(`${id}-bouton-texte`, 'TEXT', { name: 'Libellé', visible: true, characters: 'Valider', textStyleId: '', getStyledTextSegments: () => [] })]),
    ...(variableDeLibrary ? [Object.assign(instanceDe(`${id}-enveloppe`, 'Enveloppe', () => petite), { layoutMode: 'HORIZONTAL', paddingLeft: 8, paddingRight: 8, boundVariables: marges(MARGE) })] : []),
  ]);
  const repos = variantDeCarte('repos', 'Repos');
  const carte = noeud('carte', 'COMPONENT_SET', {
    name: 'Carte', key: 'cle-carte', defaultVariant: repos,
    componentPropertyDefinitions: { Etat: { type: 'VARIANT', defaultValue: 'Repos', variantOptions: ['Repos', 'Survol'] } },
  }, [repos, variantDeCarte('survol', 'Survol')]);
  const enfantsDeLaPage = [carte, bouton.jeu, icone.jeu, point, regles('regles-bouton', 'Bouton'), regles('regles-icone', 'Icone'), ...(flecheDistante ? [] : [fleche]), ...(variableDeLibrary ? [enveloppe] : [])];
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
    getStyleByIdAsync: async (id: string) => (variableDeLibrary && id === 'S:libelle' ? { id, name: 'Libellé', type: 'TEXT', key: 'cle-libelle', remote: true, fontSize: 14, fontName: { family: 'Inter', style: 'Regular' }, boundVariables: {} }
      : variableDeLibrary && id === 'S:ombre' ? { id, name: 'Ombre', type: 'EFFECT', key: 'cle-ombre', remote: true, effects: [], boundVariables: {} } : null),
    variables: {
      getLocalVariableCollectionsAsync: async () => [],
      getLocalVariablesAsync: async () => [],
      getVariableByIdAsync: async (id: string) => (variableDeLibrary && (id === ESPACEMENT || id === MARGE) ? variable(id) : null),
      getVariableCollectionByIdAsync: async (id: string) => (variableDeLibrary && (id === COLLECTION_DE_LIBRARY || id === COLLECTION_DES_MARGES) ? collection(id) : null),
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
  assert.deepEqual(Object.keys(bilan.distants), ['fleche'], 'seul le maître distant reste hors du journal : ses champs lus sont relus');
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
  return { moteur, affiche: JSON.stringify(affiche), contexte, compteurs: final.mesure.compteurs };
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
  // Le moteur repris ne lit aucun maître : ceux que la trace compte sont ceux que la prélecture du relevé demande.
  assert.ok((seconde.compteurs['api:getMainComponentAsync:appels'] ?? 0) > 0, 'la prélecture du relevé lit les maîtres par l’appel mesuré');

  monde.etat.trace = 'carre';
  surChangementDuDocument([{ type: 'PROPERTY_CHANGE', id: 'icone-trace', properties: ['name'], node: { id: 'icone-trace', parent: { id: 'icone-base', parent: { id: 'icone', parent: { id: 'page', parent: null } } } } }], seconde.contexte);
  const apres = await demander(monde, 'analyser');
  assert.ok(apres.moteur.length > 0 && !apres.moteur.includes('repriseDuMoteur'), `moteur relancé : ${apres.moteur.join(', ')}`);
  assert.equal(apres.affiche, (await demander(monde, 'actualiser')).affiche);
});

test('sur le même monde, un maître imbriqué distant relu laisse reprendre le moteur ; le calque de son instance changé sans événement le relance, affichage égal à Actualiser', async () => {
  const monde = fabriquerLeMondeImbrique({ flecheDistante: true });
  await demander(monde, 'analyser');
  assert.deepEqual((await demander(monde, 'analyser')).moteur, ['repriseDuMoteur']);
  monde.etat.trait = 'trait épais';
  const apres = await demander(monde, 'analyser');
  assert.deepEqual(apres.moteur, ['nonReprise:different:dependances']);
  assert.equal(apres.affiche, (await demander(monde, 'actualiser')).affiche);
});

// `Bouton` porte aussi un style de texte et un style d'effet, hors du jeu : un style que le moteur y lirait sortirait de la couverture.
test('le moteur lit par identifiant une variable de library liée sous un maître imbriqué : les dépendances refont la même lecture', async () => {
  const bilan = await enregistrerLesAccesDuMoteur(await capturer(fabriquerLeMondeImbrique({ flecheDistante: true, variableDeLibrary: true })));
  assert.ok(bilan.ressources.includes(`getVariableByIdAsync(${ESPACEMENT})`), `le moteur nomme le token par la variable : ${bilan.ressources.join(', ')}`);
  assert.deepEqual(bilan.horsCouverture, []);
});

test('une variable de library liée sous un maître imbriqué, renommée sans événement, relance le moteur ; affichage égal à Actualiser', async () => {
  const monde = fabriquerLeMondeImbrique({ flecheDistante: false, variableDeLibrary: true });
  await demander(monde, 'analyser');
  assert.deepEqual((await demander(monde, 'analyser')).moteur, ['repriseDuMoteur']);
  monde.etat.espacement = 'gap/large';
  const renommee = await demander(monde, 'analyser');
  assert.deepEqual(renommee.moteur, ['nonReprise:different:dependances', 'nonReprise:different:releve']);
  assert.equal(renommee.affiche, (await demander(monde, 'actualiser')).affiche);
  monde.etat.collection = 'espacements';
  const collectionRenommee = await demander(monde, 'analyser');
  assert.deepEqual(collectionRenommee.moteur, ['nonReprise:different:dependances', 'nonReprise:different:releve'], 'la collection renommée aussi');
  assert.equal(collectionRenommee.affiche, (await demander(monde, 'actualiser')).affiche);
});

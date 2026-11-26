/**
 * Ce que le relevé lit pour juger l'icône `arrow-left-long` de Button (L2 du plan de la recette du Button) : le dessin du
 * composant principal, la propriété qui pilote la visibilité, la chaîne des instances entre le layer lu et le calque peint,
 * l'exposition de `.sizeWrapperButton` et la provenance « style » d'une liaison que porte le style appliqué.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { controlerMapping, controlerOublis, type CatalogueDeReference } from '@ucm-kit/core/controles';

import { lireLeReleve } from '../src/releveDuComposant';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const noir = { r: 0, g: 0, b: 0 };
const boite = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

interface OptionsDuBouton {
  /** `isExposedInstance` de `.sizeWrapperButton` dans chaque variant de l'hôte ; absent : le champ n'existe pas. */
  exposees?: unknown[];
  /** Le composant principal de l'icône a un enfant que ce n'est pas un tracé. */
  iconeAvecTexte?: boolean;
  /** La lecture des enfants du composant principal de l'icône lève. */
  dessinIllisible?: boolean;
  /** La lecture de `isExposedInstance` lève. */
  expositionIllisible?: boolean;
}

/**
 * Button et `.sizeWrapperButton` tels que le fichier de recette les pose : le wrapper contient l'instance `arrow-left-long`,
 * que pilote `Icon-Left#1261:147`, dont le composant principal de bibliothèque n'a qu'un VECTOR. Le fill de ce VECTOR est lié
 * par surcharge à `foreground`. Le rayon lié du wrapper en fait un wrapper de dimensions.
 */
function bouton(options: OptionsDuBouton = {}) {
  const a = atelierDeCalques();
  const vecteurDuMaitre = a.calque('vecteur-maitre', 'VECTOR', { name: 'Vector' });
  const enfants = [vecteurDuMaitre, ...(options.iconeAvecTexte ? [a.calque('texte-maitre', 'TEXT', { name: 'Label' })] : [])];
  const lectures = { enfantsDeLIcone: 0 };
  const maitreIllisible = a.calque('icone-maitre', 'COMPONENT', {
    name: 'arrow-left-long', key: 'cle-fleche', remote: true,
    get children() {
      lectures.enfantsDeLIcone += 1;
      if (options.dessinIllisible) throw new Error('enfants illisibles');
      return enfants;
    },
  });

  const tailles = ['Small', 'Medium'].map((taille) => a.calque(`wrapper-${taille}`, 'COMPONENT', { name: `Size=${taille}`, key: `cle-wrapper-${taille}`, remote: false, absoluteBoundingBox: boite(0, 0, 10, 10) }));
  a.calque('jeu-wrapper', 'COMPONENT_SET', {
    name: '.sizeWrapperButton', key: 'cle-wrapper',
    componentPropertyDefinitions: { Size: { type: 'VARIANT', defaultValue: 'Small', variantOptions: ['Small', 'Medium'] } },
  }, tailles);

  const variants = ['Default', 'Hover'].map((etat, rang) => {
    const vecteur = a.calque(`I3:152;3:429;1829:9613-${etat}`, 'VECTOR', {
      name: 'Vector', absoluteBoundingBox: boite(0, 0, 10, 10),
      fills: [{ type: 'SOLID', color: noir, boundVariables: { color: alias('foreground') } }],
    });
    const fleche = a.calque(`I3:152;3:429-${etat}`, 'INSTANCE', {
      name: 'arrow-left-long', absoluteBoundingBox: boite(0, 0, 10, 10),
      componentPropertyReferences: { visible: 'Icon-Left#1261:147' },
      getMainComponentAsync: async () => maitreIllisible,
    }, [vecteur]);
    const champsDuWrapper: Record<string, unknown> = {
      name: '.sizeWrapperButton', absoluteBoundingBox: boite(0, 0, 125, 44), boundVariables: { cornerRadius: alias('rayon') },
      overrides: [{ id: vecteur.id, overriddenFields: ['fills'] }],
      getMainComponentAsync: async () => tailles[1],
    };
    if (options.expositionIllisible) Object.defineProperty(champsDuWrapper, 'isExposedInstance', { enumerable: true, get() { throw new Error('exposition illisible'); } });
    else if (options.exposees) champsDuWrapper.isExposedInstance = options.exposees[rang];
    const wrapper = a.calque(`I3:152-${etat}`, 'INSTANCE', champsDuWrapper, [fleche]);
    return a.calque(`variant-${etat}`, 'COMPONENT', { name: `State=${etat}`, absoluteBoundingBox: boite(0, 0, 125, 44) }, [wrapper]);
  });
  const jeu = a.calque('hote', 'COMPONENT_SET', {
    name: 'Button', key: 'cle-button',
    componentPropertyDefinitions: { State: { type: 'VARIANT', defaultValue: 'Default', variantOptions: ['Default', 'Hover'] } },
  }, variants);
  const { port } = portDeTest(
    [collectionFigma('c', 'components', ['Valeur'], ['foreground', 'rayon'])],
    [
      variableFigma('foreground', 'c', 'button/color/primary/foreground', 'COLOR', { 'c:Valeur': { r: 1, g: 1, b: 1, a: 1 } }),
      variableFigma('rayon', 'c', 'button/radius', 'FLOAT', { 'c:Valeur': 4 }),
    ],
  );
  return { a, jeu, port: a.port(port), lectures };
}

async function relever(options: OptionsDuBouton = {}) {
  const { a, jeu, port, lectures } = bouton(options);
  const issue = await lireLeReleve(port, jeu);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') throw new Error('relevé attendu');
  return { releve: issue.releve, a, lectures };
}

const wrapperDuVariant = (releve: Awaited<ReturnType<typeof relever>>['releve'], rang = 0) => releve.variants[rang].layers.find(({ nom }) => nom === '.sizeWrapperButton')!;

test('L2 : le relevé de Button donne le dessin, la propriété de visibilité et la chaîne d’instances de l’icône', async () => {
  const { releve } = await relever();
  const wrapper = wrapperDuVariant(releve);
  const liaison = wrapper.liaisons.find(({ surcharge }) => surcharge);
  assert.equal(liaison?.surcharge?.nom, 'Vector');
  assert.deepEqual(liaison?.surcharge?.instances?.map(({ nom, type, instanceDe }) => [nom, type, instanceDe?.nom, instanceDe?.dessin, instanceDe?.visibilitePar, instanceDe?.pilotee]), [
    ['arrow-left-long', 'INSTANCE', 'arrow-left-long', true, 'Icon-Left#1261:147', null],
  ]);
  assert.equal(wrapper.instanceDe?.dessin, false, 'le composant principal du wrapper n’a pas d’enfant : aucun tracé visible');
  assert.equal(wrapper.instanceDe?.visibilitePar, null);
});

test('L2 : l’analyse de Button ne rend ni C17 ni C24 sur le Vector de l’icône', async () => {
  const { releve } = await relever();
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'c', nom: 'components', role: 'components', modes: [], etat: 'lue' }],
    variables: [
      { cle: 'foreground', nom: 'button/color/primary/foreground', collection: 'c', type: 'COLOR', etat: 'presente' },
      { cle: 'background', nom: 'button/color/primary/background', collection: 'c', type: 'COLOR', etat: 'presente' },
    ],
  };
  const sur = controlerMapping(releve, catalogue).filter(({ code, layers }) => (code === 'C17' || code === 'C24') && layers.some((id) => id.includes('3:429')));
  assert.deepEqual(sur, []);
});

test('L2 : un composant principal qui n’a pas que des tracés visibles n’est pas un dessin', async () => {
  const { releve } = await relever({ iconeAvecTexte: true });
  const instances = wrapperDuVariant(releve).liaisons.find(({ surcharge }) => surcharge)?.surcharge?.instances;
  assert.equal(instances?.[0].instanceDe?.dessin, false);
});

test('L2 : une lecture du dessin qui lève laisse le champ absent, jamais faux, et se consigne', async () => {
  const { releve } = await relever({ dessinIllisible: true });
  const instances = wrapperDuVariant(releve).liaisons.find(({ surcharge }) => surcharge)?.surcharge?.instances;
  assert.ok(instances?.[0].instanceDe);
  assert.equal('dessin' in instances![0].instanceDe!, false);
  assert.ok(releve.lecture.manquees.some(({ champ, motif }) => champ === 'dessin' && motif === 'enfants illisibles'));
});

test('L2 : le dessin d’un composant principal se lit une fois pour tout le relevé', async () => {
  const { lectures, releve } = await relever();
  assert.equal(releve.variants.length, 2);
  assert.equal(lectures.enfantsDeLIcone, 1, 'deux variants posent la même icône : une lecture des enfants');
});

test('L2 : un wrapper que aucun variant n’expose rend expose faux, un wrapper exposé dans un variant rend vrai', async () => {
  assert.equal((await relever({ exposees: [false, false] })).releve.wrappers?.[0].expose, false);
  assert.equal((await relever({ exposees: [false, true] })).releve.wrappers?.[0].expose, true);
});

test('L2 : une exposition illisible ou absente rend inconnu, jamais faux', async () => {
  const illisible = await relever({ expositionIllisible: true });
  assert.equal(illisible.releve.wrappers?.[0].expose, 'inconnu');
  assert.ok(illisible.releve.lecture.manquees.some(({ champ }) => champ === 'isExposedInstance'));
  assert.equal((await relever()).releve.wrappers?.[0].expose, 'inconnu');
  assert.equal((await relever({ exposees: [false, undefined] })).releve.wrappers?.[0].expose, 'inconnu');
});

test('D12 : une liaison de typographie que porte le style du texte reçoit la provenance « style »', async () => {
  const a = atelierDeCalques();
  a.styleDeTexte('S:1', 'Body/Large', { fontFamily: alias('famille'), fontSize: alias('taille') });
  const texte = a.calque('texte', 'TEXT', {
    name: 'Label', absoluteBoundingBox: boite(0, 0, 40, 12), characters: 'Ok', textStyleId: 'S:1',
    getStyledTextSegments: () => [{
      start: 0, end: 2, fontSize: 14, fontWeight: 400, fills: [{ type: 'SOLID', color: noir }], textStyleId: 'S:1',
      boundVariables: { fontFamily: alias('famille'), fontSize: alias('taille'), lineHeight: alias('interligne') },
    }],
  });
  const variant = a.calque('variant', 'COMPONENT', { name: 'State=Default' }, [texte]);
  const jeu = a.calque('jeu', 'COMPONENT_SET', { name: 'Button', key: 'cle-jeu', componentPropertyDefinitions: { State: { type: 'VARIANT', defaultValue: 'Default', variantOptions: ['Default'] } } }, [variant]);
  const { port } = portDeTest(
    [collectionFigma('c', 'components', ['Valeur'], ['famille', 'taille', 'interligne'])],
    [
      variableFigma('famille', 'c', 'button/font/family', 'STRING', { 'c:Valeur': 'Inter' }),
      variableFigma('taille', 'c', 'button/font/size', 'FLOAT', { 'c:Valeur': 14 }),
      variableFigma('interligne', 'c', 'button/font/line', 'FLOAT', { 'c:Valeur': 20 }),
    ],
  );
  const issue = await lireLeReleve(a.port(port), jeu);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  const liaisons = issue.releve.variants[0].layers.find(({ id }) => id === 'texte')!.liaisons;
  assert.deepEqual(liaisons.map(({ champ, provenance }) => [champ, provenance]), [['fontFamily', 'style'], ['fontSize', 'style'], ['lineHeight', undefined]]);
});

test('D12 : un fill lié par le style de remplissage reçoit « style », une autre variable que celle du style garde sa provenance', async () => {
  const a = atelierDeCalques();
  a.styleDeTexte('F:1', 'Primary', {}, { type: 'PAINT', paints: [{ type: 'SOLID', color: noir, boundVariables: { color: alias('fond') } }] });
  const rect = a.calque('rect', 'RECTANGLE', {
    name: 'Fond', absoluteBoundingBox: boite(0, 0, 10, 10), fillStyleId: 'F:1',
    fills: [{ type: 'SOLID', color: noir, boundVariables: { color: alias('fond') } }],
    strokes: [{ type: 'SOLID', color: noir, boundVariables: { color: alias('bord') } }],
  });
  const variant = a.calque('variant', 'COMPONENT', { name: 'State=Default' }, [rect]);
  const jeu = a.calque('jeu', 'COMPONENT_SET', { name: 'Button', key: 'cle-jeu', componentPropertyDefinitions: { State: { type: 'VARIANT', defaultValue: 'Default', variantOptions: ['Default'] } } }, [variant]);
  const { port } = portDeTest(
    [collectionFigma('c', 'components', ['Valeur'], ['fond', 'bord'])],
    [variableFigma('fond', 'c', 'button/color/primary/background', 'COLOR', { 'c:Valeur': { r: 1, g: 1, b: 1, a: 1 } }), variableFigma('bord', 'c', 'button/color/primary/border', 'COLOR', { 'c:Valeur': { r: 0, g: 0, b: 0, a: 1 } })],
  );
  const issue = await lireLeReleve(a.port(port), jeu);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  const liaisons = issue.releve.variants[0].layers.find(({ id }) => id === 'rect')!.liaisons;
  assert.deepEqual(liaisons.map(({ champ, provenance }) => [champ, provenance]), [['fills', 'style'], ['strokes', undefined]]);
});

test('L3 : sur le relevé de Button, un wrapper non exposé qui porte Size rend C83 ; exposé ou d’exposition inconnue, aucun constat', async () => {
  const catalogue: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };
  const constatsDe = async (options: OptionsDuBouton) => controlerOublis((await relever(options)).releve, catalogue).filter(({ code }) => code === 'C83');
  const [constat] = await constatsDe({ exposees: [false, false] });
  assert.deepEqual(constat.faits, { wrapper: '.sizeWrapperButton', proprietes: 'Size', composant: 'Button' });
  assert.deepEqual(constat.layers, ['I3:152-Default', 'I3:152-Hover']);
  assert.deepEqual(await constatsDe({ exposees: [false, true] }), []);
  assert.deepEqual(await constatsDe({}), []);
});

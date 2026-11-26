/**
 * D31 : le relevé lit les textes et les icônes visibles sous chaque instance d'un variant (`VariantLu.dansInstances`), avec leurs
 * ancêtres jusqu'au layer de l'instance et les frères de ces ancêtres qui peignent dessous. C49 les mesure ; aucun autre contrôle ne
 * les voit. Le cas est `.sizeWrapperButton` : son label `Suivant` et ses flèches `arrow-left-long › Vector`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { controlerLAccessibilite, type CatalogueDeReference, type LayerLu, type ReleveDeComposant } from '@ucm-kit/core/controles';

import { lireLeReleve } from '../src/releveDuComposant';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const blanc = { r: 1, g: 1, b: 1, a: 1 };
const noir = { r: 0, g: 0, b: 0, a: 1 };
const gris = { r: 0.58, g: 0.58, b: 0.58, a: 1 };
const solide = (couleur: { r: number; g: number; b: number }, variable?: string) => ({ type: 'SOLID', visible: true, opacity: 1, blendMode: 'NORMAL', color: couleur, ...(variable ? { boundVariables: { color: alias(variable) } } : {}) });
const boite = (x: number, largeur: number, hauteur = 16) => ({ x, y: 0, width: largeur, height: hauteur });

interface Options {
  /** La couleur du fond que peint le variant ; `null` : aucun. */
  readonly fond?: { r: number; g: number; b: number } | null;
  /** La couleur du texte. */
  readonly texte?: { r: number; g: number; b: number };
  /** Un accesseur de `fills` du texte qui lève. */
  readonly texteIllisible?: boolean;
  /** L'instance est une dépendance : le composant a ses règles. */
  readonly dependance?: boolean;
  /** Un panneau blanc, premier enfant de l'instance, peint sous le texte et la flèche. */
  readonly panneau?: boolean;
  /** Le variant porte un décor que la visite ne lit pas : un cadre qui ne contient qu'un rectangle. */
  readonly decor?: boolean;
}

/** `Button` : un variant peint, une instance `.sizeWrapperButton` qui porte une flèche (icône d'un tracé), un label et un panneau peint. */
function button(options: Options = {}) {
  const a = atelierDeCalques();
  const { fond = blanc, texte = blanc } = options;
  // Le composant principal du wrapper tient la liaison de couleur du texte, comme Figma le montre pour un label non surchargé.
  const texteDuMaitre = a.calque('lab', 'TEXT', {
    name: 'Suivant', fills: [solide(texte, 'fg')], boundVariables: { fills: [alias('fg')] }, characters: 'Suivant', fontSize: 14, fontWeight: 400, textStyleId: '', absoluteBoundingBox: boite(40, 37),
    getStyledTextSegments: () => [{ start: 0, end: 7, fontSize: 14, fontWeight: 400, fills: [solide(texte, 'fg')], boundVariables: { fills: [alias('fg')] }, textStyleId: '' }],
  });
  const maitreDuWrapper = a.calque('wrap-maitre', 'COMPONENT', { name: '.sizeWrapperButton', key: 'cle-wrapper', remote: false, componentPropertyDefinitions: {}, absoluteBoundingBox: boite(0, 125, 44) }, [texteDuMaitre]);
  const traceDeLaFleche = a.calque('Iwrap;fl;vec', 'VECTOR', { name: 'Vector', fills: [solide(gris, 'fleche')], boundVariables: { fills: [alias('fleche')] }, absoluteBoundingBox: boite(12, 16, 12) });
  const traceDuMaitre = a.calque('fleche-source', 'VECTOR', { name: 'Vector', fills: [] });
  const maitreDeLaFleche = a.calque('fleche-maitre', 'COMPONENT', { name: 'arrow-left-long', key: 'cle-fleche', remote: true, componentPropertyDefinitions: {} }, [traceDuMaitre]);
  const fleche = a.calque('Iwrap;fl', 'INSTANCE', {
    name: 'arrow-left-long', absoluteBoundingBox: boite(10, 20, 20), variantProperties: {}, componentPropertyReferences: {}, overrides: [{ id: 'Iwrap;fl;vec', overriddenFields: ['fills'] }],
    getMainComponentAsync: async () => maitreDeLaFleche,
  }, [traceDeLaFleche]);
  const label = a.calque('Iwrap;lab', 'TEXT', {
    name: 'Suivant', boundVariables: { fills: [alias('fg')] }, characters: 'Suivant', fontSize: 14, fontWeight: 400, textStyleId: '', absoluteBoundingBox: boite(40, 37),
    get fills() {
      if (options.texteIllisible) throw new Error('fills illisibles');
      return [solide(texte, 'fg')];
    },
    getStyledTextSegments: () => [{ start: 0, end: 7, fontSize: 14, fontWeight: 400, fills: [solide(texte, 'fg')], boundVariables: { fills: [alias('fg')] }, textStyleId: '' }],
  });
  const panneau = options.panneau ? [a.calque('Iwrap;panneau', 'RECTANGLE', { name: 'Panneau', fills: [solide(blanc)], absoluteBoundingBox: boite(0, 125, 44) })] : [];
  const decor = options.decor ? [a.calque('Iwrap;decor', 'FRAME', { name: 'Decor', absoluteBoundingBox: boite(0, 4, 4), fills: [] }, [a.calque('Iwrap;decor;rect', 'RECTANGLE', { name: 'Rect', fills: [solide(noir)], absoluteBoundingBox: boite(0, 4, 4) })])] : [];
  const wrapper = a.calque('wrap', 'INSTANCE', {
    name: '.sizeWrapperButton', absoluteBoundingBox: boite(0, 125, 44), variantProperties: {}, componentPropertyReferences: {}, overrides: [], fills: [],
    getMainComponentAsync: async () => maitreDuWrapper,
  }, [...panneau, fleche, label, ...decor]);
  const variant = a.calque('v', 'COMPONENT', {
    name: 'State=Default', absoluteBoundingBox: boite(0, 125, 44), variantProperties: { State: 'Default' }, fills: fond ? [solide(fond)] : [],
  }, [wrapper]);
  const jeu = a.calque('jeu', 'COMPONENT_SET', { name: 'Button', key: 'cle-button', defaultVariant: variant, componentPropertyDefinitions: { State: { type: 'VARIANT', defaultValue: 'Default', variantOptions: ['Default'] } } }, [variant]);
  const { port } = portDeTest(
    [collectionFigma('c', 'components', ['Valeur'], ['fg', 'fleche'])],
    ['fg', 'fleche'].map((id) => variableFigma(id, 'c', `Button/Color/Primary/Filled/Default/${id}`, 'COLOR', { 'c:Valeur': id === 'fg' ? texte : gris })),
  );
  return { jeu, port: a.port(port), lectures: a.lectures };
}

const catalogue: CatalogueDeReference = {
  version: 1, library: null,
  collections: [{ cle: 'cle-c', nom: 'components', role: 'components', modes: [{ id: 'c:Valeur', nom: 'Valeur' }], etat: 'lue' }],
  variables: [
    { cle: 'cle-fg', nom: 'Button/Color/Primary/Filled/Default/fg', collection: 'cle-c', type: 'COLOR', etat: 'presente', valeurs: { 'c:Valeur': { valeur: blanc } } },
    { cle: 'cle-fleche', nom: 'Button/Color/Primary/Filled/Default/fleche', collection: 'cle-c', type: 'COLOR', etat: 'presente', valeurs: { 'c:Valeur': { valeur: gris } } },
  ],
};

async function relever(options: Options = {}, lecture: Parameters<typeof lireLeReleve>[2] = {}): Promise<ReleveDeComposant> {
  const { jeu, port } = button(options);
  const issue = await lireLeReleve(port, jeu, lecture);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') throw new Error('relevé attendu');
  return issue.releve;
}
const contraste = (releve: ReleveDeComposant) => controlerLAccessibilite(releve, catalogue, { niveau: 'AA' }).filter((c) => c.code === 'C49' && !c.limite);
const dansInstances = (releve: ReleveDeComposant): LayerLu[] => releve.variants[0].dansInstances ?? [];

test('le relevé lit le texte, la flèche et son tracé sous l’instance, avec les ancêtres et le frère peint, et rien d’autre', async () => {
  const releve = await relever({ decor: true, panneau: true });
  const lus = dansInstances(releve);
  assert.deepEqual(lus.map(({ id, type, parent }) => [id, type, parent]), [
    ['Iwrap;panneau', 'RECTANGLE', 'wrap'],
    ['Iwrap;fl', 'INSTANCE', 'wrap'],
    ['Iwrap;fl;vec', 'VECTOR', 'Iwrap;fl'],
    ['Iwrap;lab', 'TEXT', 'wrap'],
  ]);
  assert.deepEqual(releve.variants[0].layers.map(({ id }) => id), ['v', 'wrap'], 'les layers du variant restent la racine et son instance');
  const texte = lus.find(({ id }) => id === 'Iwrap;lab')!;
  assert.deepEqual(texte.dimensions, { x: 40, y: 0, largeur: 37, hauteur: 16 });
  assert.deepEqual(texte.texte?.plages.map(({ fontSize, fontWeight, peintures }) => [fontSize, fontWeight, peintures.length]), [[14, 400, 1]]);
  assert.equal(texte.opacite, 1);
  assert.equal(lus.find(({ id }) => id === 'Iwrap;fl;vec')?.peintures[0].champ, 'fills');
  assert.deepEqual(lus.find(({ id }) => id === 'Iwrap;fl')?.instanceDe?.dessin, true, 'la flèche garde ce qui la fait icône');
});

test('une liaison que le composant principal tient garde cette origine, et le calque ne porte que ses liaisons de couleur', async () => {
  const lus = dansInstances(await relever());
  const texte = lus.find(({ id }) => id === 'Iwrap;lab')!;
  assert.ok(texte.liaisons.length > 0);
  assert.ok(texte.liaisons.every((liaison) => liaison.champ === 'fills' || liaison.champ === 'strokes'));
  assert.ok(texte.liaisons.every((liaison) => liaison.provenance === 'composant-principal'), JSON.stringify(texte.liaisons.map((l) => l.provenance)));
  assert.deepEqual(texte.valeursEnDur, [], 'aucune valeur en dur : aucun contrôle de taille ne les lit');
  const fleche = lus.find(({ id }) => id === 'Iwrap;fl;vec')!;
  assert.deepEqual(fleche.liaisons.map((liaison) => liaison.provenance), ['instance'], 'la couleur de la flèche est posée par l’hôte, le maître ne la tient pas');
});

test('un texte blanc dans l’instance sur un fond blanc donne C49 à corriger, la flèche grise se mesure au seuil d’icône', async () => {
  const constats = contraste(await relever({ fond: blanc }));
  assert.deepEqual(constats.map((c) => [c.type, c.faits.usage, c.faits.calque, c.faits.seuil]).sort(), [['corriger', 'icone', 'Vector', 4.5], ['corriger', 'texte', 'Suivant', 4.5]]);
});

test('le même texte sur un fond foncé ne donne rien, et un panneau blanc posé dessous dans l’instance redonne C49', async () => {
  assert.deepEqual(contraste(await relever({ fond: noir })), [], 'le texte blanc et la flèche grise passent sur noir');
  const surPanneau = contraste(await relever({ fond: noir, panneau: true }));
  assert.deepEqual(surPanneau.map((c) => c.faits.calque).sort(), ['Suivant', 'Vector'], 'le panneau blanc, frère plus bas, est le fond que le texte voit');
});

test('une lecture refusée laisse le calque absent, la manquée la consigne, et C49 ne conclut pas', async () => {
  const releve = await relever({ texteIllisible: true });
  assert.equal(dansInstances(releve).some(({ id }) => id === 'Iwrap;lab'), false);
  assert.ok(releve.lecture.manquees.some(({ layer, champ }) => layer === 'Iwrap;lab' && champ === 'fills'));
  assert.deepEqual(contraste(releve).filter((c) => c.faits.usage === 'texte'), []);
});

test('une instance dont le composant a ses règles est une dépendance : ses calques ne sont pas lus', async () => {
  const { jeu, port } = button();
  const issue = await lireLeReleve(port, jeu, { reglesTrouvees: () => true });
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  assert.equal(issue.releve.variants[0].layers.find(({ id }) => id === 'wrap')?.sorte, 'dependance');
  assert.equal(issue.releve.variants[0].dansInstances, undefined);
});

test('un décor sans texte ni icône n’entre pas dans le relevé, et une instance qui ne contient rien n’y laisse rien', async () => {
  const lus = dansInstances(await relever({ decor: true }));
  assert.equal(lus.some(({ id }) => id.startsWith('Iwrap;decor')), false);
});

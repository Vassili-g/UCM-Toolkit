/**
 * D20 : le relevé marque l'origine des liaisons d'une dépendance, et garde la peinture visible du calque qu'une surcharge lie.
 * Le premier cas est Alert qui pose un Button documenté ; le second, un anneau peint sous la frontière d'une instance.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { controlerCouches, controlerLAccessibilite, controlerMapping, type CatalogueDeReference, type ReleveDeComposant } from '@ucm-kit/core/controles';

import { lireLeReleve } from '../src/releveDuComposant';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });
const boite = { x: 0, y: 0, width: 80, height: 40 };
const solide = (variable: string) => ({ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: alias(variable) } });
const rouge = { r: 1, g: 0, b: 0, a: 1 };

async function relever(jeu: Parameters<typeof lireLeReleve>[1], port: Parameters<typeof lireLeReleve>[0], options: Parameters<typeof lireLeReleve>[2] = {}): Promise<ReleveDeComposant> {
  const issue = await lireLeReleve(port, jeu, options);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') throw new Error('relevé attendu');
  return issue.releve;
}

/** Alert pose une instance `Action` de Button ; `surcharge` ajoute un calque que l'hôte peint avec un token de Button. */
function alertAvecButton(surcharge: boolean) {
  const a = atelierDeCalques();
  const fond = a.calque('fond', 'RECTANGLE', { fills: [solide('button-bg')] });
  const maitre = a.calque('button-main', 'COMPONENT', { name: 'Button', key: 'cle-button', remote: false, absoluteBoundingBox: boite, fills: [solide('button-bg')] }, [fond]);
  a.calque('Iaction;fond', 'RECTANGLE', { fills: [solide(surcharge ? 'button-hote' : 'button-bg')] });
  const action = a.calque('action', 'INSTANCE', {
    name: 'Action', absoluteBoundingBox: boite, fills: [solide('button-bg')],
    overrides: surcharge ? [{ id: 'Iaction;fond', overriddenFields: ['fills'] }] : [],
    getMainComponentAsync: async () => maitre,
  });
  const variant = a.calque('v', 'COMPONENT', { name: 'State=Default', absoluteBoundingBox: boite, variantProperties: { State: 'Default' } }, [action]);
  const jeu = a.calque('jeu', 'COMPONENT_SET', { name: 'Alert', key: 'cle-alert', defaultVariant: variant, componentPropertyDefinitions: { State: { type: 'VARIANT', defaultValue: 'Default', variantOptions: ['Default'] } } }, [variant]);
  const { port } = portDeTest(
    [collectionFigma('c', 'components', ['Valeur'], ['button-bg', 'button-hote'])],
    ['button-bg', 'button-hote'].map((id) => variableFigma(id, 'c', `Button/Color/Primary/Filled/Default/${id}`, 'COLOR', { 'c:Valeur': rouge })),
  );
  return { jeu, port: a.port(port) };
}

const catalogueDeButton: CatalogueDeReference = {
  version: 1, library: null,
  collections: [{ cle: 'cle-c', nom: 'components', role: 'components', modes: [], etat: 'lue' }],
  variables: ['button-bg', 'button-hote'].map((id) => ({ cle: `cle-${id}`, nom: `Button/Color/Primary/Filled/Default/${id}`, collection: 'cle-c', type: 'COLOR' as const, etat: 'presente' as const })),
};

const codesDe = (releve: ReleveDeComposant): string[] => [...controlerMapping(releve, catalogueDeButton), ...controlerCouches(releve, catalogueDeButton)].map(({ code }) => code);

test('Alert ne juge ni C19 ni C80 sur les liaisons que le Button documenté tient de son composant principal', async () => {
  const { jeu, port } = alertAvecButton(false);
  const releve = await relever(jeu, port, { reglesTrouvees: () => true });
  const action = releve.variants[0].layers.find(({ id }) => id === 'action');
  assert.equal(action?.sorte, 'dependance');
  assert.ok(action && action.liaisons.length > 0);
  assert.ok(action.liaisons.every((liaison) => liaison.provenance === 'composant-principal'), JSON.stringify(action.liaisons.map((l) => l.provenance)));
  const jugees = codesDe(releve).filter((code) => code === 'C19' || code === 'C80');
  assert.deepEqual(jugees, []);
});

test('Alert juge toujours la surcharge que l’hôte pose sur le Button documenté', async () => {
  const { jeu, port } = alertAvecButton(true);
  const releve = await relever(jeu, port, { reglesTrouvees: () => true });
  const action = releve.variants[0].layers.find(({ id }) => id === 'action');
  assert.equal(action?.sorte, 'dependance');
  assert.deepEqual(action?.liaisons.map((liaison) => [liaison.surcharge?.id ?? null, liaison.provenance]), [[null, 'composant-principal'], ['Iaction;fond', 'instance']]);
  assert.ok(codesDe(releve).includes('C19'), 'le token de Button posé par Alert reste jugé');
});

/** Un variant `State=Focus` qui pose `.Ring` : le rectangle de l'instance peint un contour de 2 px, lié à un token. */
function textFieldAvecAnneau(options: { strokesIllisibles?: boolean; masque?: boolean } = {}) {
  const a = atelierDeCalques();
  let lectures = 0;
  const strokes = () => [{ ...solide('ring'), ...(options.masque ? { visible: false } : {}) }];
  a.calque('Iring;stroke', 'RECTANGLE', {
    name: 'Ring', strokeWeight: 2,
    get strokes() {
      lectures += 1;
      // La première lecture sert la liaison ; les suivantes sont celles que le relevé fait de la peinture.
      if (options.strokesIllisibles && lectures > 1) throw new Error('contours illisibles');
      return strokes();
    },
  });
  const source = a.calque('stroke', 'RECTANGLE', { name: 'Ring', strokes: [], strokeWeight: 2 });
  const maitre = a.calque('ring-main', 'COMPONENT', { name: '.Ring', key: 'cle-ring', remote: true }, [source]);
  const instance = a.calque('ring', 'INSTANCE', {
    name: '.Ring', absoluteBoundingBox: boite,
    overrides: [{ id: 'Iring;stroke', overriddenFields: ['strokes'] }],
    getMainComponentAsync: async () => maitre,
  });
  const variant = a.calque('v', 'COMPONENT', { name: 'State=Focus', absoluteBoundingBox: boite, variantProperties: { State: 'Focus' } }, [instance]);
  const jeu = a.calque('jeu', 'COMPONENT_SET', { name: 'TextField', key: 'cle-textfield', defaultVariant: variant, componentPropertyDefinitions: { State: { type: 'VARIANT', defaultValue: 'Focus', variantOptions: ['Focus'] } } }, [variant]);
  const { port } = portDeTest(
    [collectionFigma('c', 'components', ['Valeur'], ['ring'])],
    [variableFigma('ring', 'c', 'TextField/Color/Primary/Filled/Focus/ring', 'COLOR', { 'c:Valeur': rouge })],
  );
  return { jeu, port: a.port(port) };
}

const sansAnneau = (releve: ReleveDeComposant) =>
  controlerLAccessibilite(releve, catalogueDeButton, { niveau: 'AA' }).filter(({ code, faits }) => code === 'C50' && faits.anneauVisible === 0);

test('le relevé range la peinture du calque que la surcharge lie : type, visibilité, opacité, épaisseur', async () => {
  const { jeu, port } = textFieldAvecAnneau();
  const releve = await relever(jeu, port);
  const anneau = releve.variants[0].layers.find(({ id }) => id === 'ring');
  const liaison = anneau?.liaisons.find(({ surcharge }) => surcharge?.id === 'Iring;stroke');
  assert.deepEqual(liaison?.surcharge?.peintures?.map(({ champ, indice, type, visible, opacite }) => ({ champ, indice, type, visible, opacite })), [{ champ: 'strokes', indice: 0, type: 'SOLID', visible: true, opacite: 1 }]);
  assert.equal(liaison?.surcharge?.strokeWeight, 2);
  assert.deepEqual(anneau?.peintures, [], 'le layer de l’instance garde ses propres peintures');
});

test('C50 ne déclare pas absent un anneau peint dans une instance, et le dit absent quand la peinture est masquée', async () => {
  const peint = await relever(...Object.values(textFieldAvecAnneau()) as [never, never]);
  assert.deepEqual(sansAnneau(peint), []);
  const masque = await relever(...Object.values(textFieldAvecAnneau({ masque: true })) as [never, never]);
  assert.equal(sansAnneau(masque).length, 1);
});

test('une peinture de surcharge qui ne se lit pas reste absente du relevé, consignée, et C50 ne conclut pas à l’absence', async () => {
  const { jeu, port } = textFieldAvecAnneau({ strokesIllisibles: true });
  const releve = await relever(jeu, port);
  const liaison = releve.variants[0].layers.find(({ id }) => id === 'ring')?.liaisons.find(({ surcharge }) => surcharge);
  assert.ok(liaison, 'la liaison de la surcharge est lue');
  assert.equal(liaison.surcharge?.peintures, undefined);
  assert.ok(releve.lecture.manquees.some(({ layer, champ }) => layer === 'Iring;stroke' && champ === 'strokes'), 'la manquée porte l’id du calque peint');
  assert.ok(!releve.lecture.manquees.some(({ layer }) => layer === 'ring'), 'et jamais celui de l’hôte');
  assert.deepEqual(sansAnneau(releve), []);
});

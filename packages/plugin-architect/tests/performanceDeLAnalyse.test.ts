/**
 * L'analyse d'un composant de 90 variants ne lit chaque variable qu'une fois et n'inventorie les libraries qu'une fois, sans
 * changer le relevé ni le catalogue (F7).
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import type { ReleveDeComposant } from '@ucm-kit/core/controles';

import { lireLeReleve } from '../src/releveDuComposant';
import { catalogueDeFigma } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

/** 90 variants d'un layer : une variable partagée, une variable que Figma refuse, une que le fichier ne connaît pas. */
export function jeuDe90Variants(options: { delai?: number } = {}) {
  const a = atelierDeCalques();
  const variants = Array.from({ length: 90 }, (_, i) => a.calque(`v${i}`, 'COMPONENT', {
    name: `Taille=T${i}`,
    absoluteBoundingBox: { x: 0, y: 0, width: 10, height: 10 },
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: alias('partagee') } }],
    boundVariables: { paddingLeft: alias('illisible'), paddingRight: alias('inconnue'), itemSpacing: alias('partagee') },
  }));
  const jeu = a.calque('jeu', 'COMPONENT_SET', {
    name: 'Button', key: 'cle-jeu', defaultVariant: variants[0],
    componentPropertyDefinitions: { Taille: { type: 'VARIANT', defaultValue: 'T0', variantOptions: variants.map((_, i) => `T${i}`) } },
  }, variants);
  const { port, appels } = portDeTest(
    [collectionFigma('c', 'Composants', ['Valeur'], ['partagee', 'illisible'])],
    [variableFigma('partagee', 'c', 'carte/fond', 'COLOR', { 'c:Valeur': { r: 1, g: 0, b: 0, a: 1 } }), variableFigma('illisible', 'c', 'carte/taille', 'FLOAT', { 'c:Valeur': 4 })],
    [], [], { refusees: new Set(['illisible']), delai: options.delai },
  );
  return { jeu, appels, portDuComposant: a.port(port) };
}

/** Empreinte du relevé que `lireLeReleve` rendait au commit 34c64a65, avant le cache de promesses, sur ce jeu. */
const EMPREINTE_DU_RELEVE = '1b431efa2b5964cc0b99251d1579b3abbe9c205dce067ef04d69791f2c806f15';

test('une variable partagée par 90 layers se lit une fois, et le relevé reste celui d’avant', async () => {
  const { jeu, appels, portDuComposant } = jeuDe90Variants();
  const issue = await lireLeReleve(portDuComposant, jeu);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  for (const id of ['partagee', 'illisible', 'inconnue', 'collection:c']) assert.equal(appels.get(id), 1, id);
  const { releve } = issue as { releve: ReleveDeComposant };
  assert.equal(releve.variants.length, 90);
  // Une entrée par liaison illisible, la première avec le motif de Figma.
  const manquees = releve.lecture.manquees.filter((entree) => entree.champ === 'paddingLeft');
  assert.equal(manquees.length, 90);
  assert.deepEqual(manquees[0], { layer: 'v0', champ: 'paddingLeft', motif: 'Accès refusé à la bibliothèque' });
  assert.deepEqual(manquees[1], { layer: 'v1', champ: 'paddingLeft', motif: 'variable illisible' });
  assert.equal(releve.lecture.manquees.filter((entree) => entree.champ === 'paddingRight').length, 90);
  assert.ok(releve.variants.every((variant) => variant.layers[0].liaisons.filter((liaison) => liaison.illisible).length === 2));
  assert.equal(createHash('sha256').update(JSON.stringify(releve)).digest('hex'), EMPREINTE_DU_RELEVE);
});

test('des lectures qui se croisent ne demandent pas deux fois la même variable', async () => {
  const { jeu, appels, portDuComposant } = jeuDe90Variants({ delai: 2 });
  const [a, b] = await Promise.all([lireLeReleve(portDuComposant, jeu), lireLeReleve(portDuComposant, jeu)]);
  assert.equal(a.statut, 'lu');
  assert.equal(b.statut, 'lu');
  // Deux relevés ont deux lecteurs : chacun lit chaque identifiant une fois.
  assert.equal(appels.get('partagee'), 2);
});

test('catalogueDeFigma n’inventorie les libraries qu’une fois', async () => {
  let inventaires = 0;
  const bibliotheque = [
    { key: 'cc', name: 'components', libraryName: 'Intencial', variables: [{ key: 'v-bouton', name: 'alert/color/info/background', resolvedType: 'COLOR' }] },
  ];
  const teamLibrary = {
    async getAvailableLibraryVariableCollectionsAsync() { inventaires += 1; return bibliotheque.map(({ key, name, libraryName }) => ({ key, name, libraryName })); },
    async getVariablesInLibraryCollectionAsync(cle: string) { return bibliotheque.find((collection) => collection.key === cle)!.variables; },
  };
  const fond = { ...variableFigma('VariableID:v-bouton/1:2', 'comp', 'alert/color/info/background', 'COLOR', { 'comp:Valeur': { r: 1, g: 1, b: 1, a: 1 } }, true), key: 'v-bouton' };
  const { port } = portDeTest([], [], [], [collectionFigma('comp', 'components', ['Valeur'], [], true)], { importables: [fond] });
  const contexte = { figma: { teamLibrary, root: { getSharedPluginData: () => '' }, variables: port } as never } as unknown as Contexte;
  const dimensions = { x: 0, y: 0, largeur: 20, hauteur: 20 };
  const releve: ReleveDeComposant = {
    version: 1, jeu: { cle: 'alert-set', id: 'alert-set', nom: 'Alert' }, proprietes: [],
    variants: [{ id: 'v1', nom: 'Alert', valeurs: {}, modesEffectifs: {}, layers: [{
      id: 'racine', nom: 'racine', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions, peintures: [], valeursEnDur: [],
      liaisons: [{ champ: 'fills', indice: 0, porteur: 'racine', variable: { id: 'v-bouton', cle: 'v-bouton', nom: 'alert/color/info/background', collection: 'cc', distante: true } }],
    }] }],
    lecture: { layersLus: 1, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
  const catalogue = await catalogueDeFigma(releve, { leve: false }, contexte);
  assert.equal(inventaires, 1);
  assert.equal(catalogue.library?.nom, 'Intencial');
});

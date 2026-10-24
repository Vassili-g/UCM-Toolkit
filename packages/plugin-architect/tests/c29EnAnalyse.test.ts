/**
 * C29 en analyse avec une library : les variables layout des familles en jeu se chargent, sinon la recherche se dit incomplète
 * (G4). Le catalogue passe par `catalogueDeFigma`, le chemin de l'analyse réelle.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { proposerLesCorrections, type Constat, type ReleveDeComposant } from '@ucm-kit/core/controles';

import { catalogueDeFigma } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { carteDAFaire, estAFaire } from '../src/ui/ignores/modele';
import { collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const dimensions = { x: 0, y: 0, largeur: 20, hauteur: 20 };
const lie = { champ: 'fills', indice: 0, porteur: 'racine', variable: { id: 'v-bouton', cle: 'v-bouton', nom: 'alert/color/info/background', collection: 'cc', distante: true } };
const releve: ReleveDeComposant = {
  version: 1, jeu: { cle: 'alert-set', id: 'alert-set', nom: 'Alert' }, proprietes: [],
  variants: [{ id: 'v1', nom: 'Alert', valeurs: {}, modesEffectifs: {}, layers: [{
    id: 'racine', nom: 'racine', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions,
    peintures: [], liaisons: [lie], valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }],
  }] }],
  lecture: { layersLus: 1, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
};

function contexteDeLibrary(layout: { leve?: boolean; importable?: boolean }): Contexte {
  const bibliotheque = [
    { key: 'cl', name: 'layout', libraryName: 'Intencial', leve: layout.leve, variables: [{ key: 'v-size-8', name: 'layout/sizing/8', resolvedType: 'FLOAT' }] },
    { key: 'cc', name: 'components', libraryName: 'Intencial', variables: [{ key: 'v-bouton', name: 'alert/color/info/background', resolvedType: 'COLOR' }] },
  ];
  const teamLibrary = {
    async getAvailableLibraryVariableCollectionsAsync() { return bibliotheque.map(({ key, name, libraryName }) => ({ key, name, libraryName })); },
    async getVariablesInLibraryCollectionAsync(cle: string) {
      const trouvee = bibliotheque.find((collection) => collection.key === cle)!;
      if (trouvee.leve) throw new Error('refusée');
      return trouvee.variables;
    },
  };
  const taille = { ...variableFigma('VariableID:v-size-8/1:1', 'lay', 'layout/sizing/8', 'FLOAT', { 'lay:Valeur': 8 }, true), key: 'v-size-8' };
  const fond = { ...variableFigma('VariableID:v-bouton/1:2', 'comp', 'alert/color/info/background', 'COLOR', { 'comp:Valeur': { r: 1, g: 1, b: 1, a: 1 } }, true), key: 'v-bouton' };
  const { port } = portDeTest([], [], [], [collectionFigma('lay', 'layout', ['Valeur'], [], true), collectionFigma('comp', 'components', ['Valeur'], [], true)],
    { importables: layout.importable === false ? [fond] : [taille, fond] });
  const root = { getSharedPluginData: () => '' };
  return { figma: { teamLibrary, root, variables: port } as never } as unknown as Contexte;
}

async function c29(contexte: Contexte): Promise<Constat> {
  const catalogue = await catalogueDeFigma(releve, { leve: false }, contexte);
  const constat = proposerLesCorrections(releve, catalogue, []).find(({ code }) => code === 'C29');
  assert.ok(constat);
  return constat as Constat;
}

test('avec une library, un padding de 8 et layout/sizing/8 non lié : C29 porte sa correction', async () => {
  const constat = await c29(contexteDeLibrary({}));
  assert.equal(constat.correction?.apres.cle, 'v-size-8');
  assert.equal(constat.faits.recherche, undefined);
});

test('une collection layout inaccessible : C29 sans question ni correction, et sa carte dit que les tokens n’ont pas pu être lus', async () => {
  const constat = await c29(contexteDeLibrary({ leve: true }));
  assert.equal(constat.correction, undefined);
  assert.equal(constat.question, undefined);
  assert.equal(constat.faits.recherche, 'incomplete');
  const carte = carteDAFaire(constat, { composant: 'Alert', variants: [], layers: new Map([['racine', 'racine']]) });
  assert.equal(carte.phrase, 'Le padding left du layer racine vaut 8 px, sans variable. Les tokens de layout n’ont pas pu être lus.');
  assert.equal(carte.statut, 'Vérifiez la library de tokens dans la Configuration');
});

test('une variable de la famille que l’import refuse : recherche incomplète', async () => {
  const constat = await c29(contexteDeLibrary({ importable: false }));
  assert.equal(constat.faits.recherche, 'incomplete');
  assert.equal(constat.correction, undefined);
  assert.equal(constat.question, undefined);
});

test('une recherche complète sans candidat reste une question sans candidat, dans À faire dans Figma', () => {
  const sans: Constat = { id: 'C29:x', code: 'C29', type: 'corriger', famille: 'tailles', variants: [], layers: [], faits: { champ: 'paddingLeft', valeur: 8 }, question: { id: 'q', candidats: [] } };
  assert.equal(estAFaire(sans), true);
  assert.equal(carteDAFaire(sans, { composant: 'Alert', variants: [], layers: new Map() }).statut, 'Ajoutez un token de layout qui vaut cette valeur, puis liez-le');
});

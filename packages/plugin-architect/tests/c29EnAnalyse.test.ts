/**
 * C29 en analyse avec une library : les tokens de taille du composant en jeu se chargent, sinon la recherche se dit incomplète
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

const NOM_TAILLE = 'alert/size/padding-left';

/** Un token de taille du composant (`components`), un token `layout` de même valeur en témoin, et un token du composant que le relevé n'attend pas. */
function contexteDeLibrary(composants: { leve?: boolean; importable?: boolean }): Contexte {
  const bibliotheque = [
    { key: 'cl', name: 'layout', libraryName: 'Intencial', variables: [{ key: 'v-size-8', name: 'layout/sizing/8', resolvedType: 'FLOAT' }] },
    {
      key: 'cc', name: 'components', libraryName: 'Intencial', leve: composants.leve,
      variables: [
        { key: 'v-bouton', name: 'alert/color/info/background', resolvedType: 'COLOR' },
        { key: 'v-pad', name: NOM_TAILLE, resolvedType: 'FLOAT' },
        { key: 'v-rayon', name: 'alert/size/radius', resolvedType: 'FLOAT' },
      ],
    },
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
  const marge = { ...variableFigma('VariableID:v-pad/1:3', 'comp', NOM_TAILLE, 'FLOAT', { 'comp:Valeur': 8 }, true), key: 'v-pad' };
  const rayon = { ...variableFigma('VariableID:v-rayon/1:4', 'comp', 'alert/size/radius', 'FLOAT', { 'comp:Valeur': 4 }, true), key: 'v-rayon' };
  const { port } = portDeTest([], [], [], [collectionFigma('lay', 'layout', ['Valeur'], [], true), collectionFigma('comp', 'components', ['Valeur'], [], true)],
    { importables: composants.importable === false ? [taille, fond, rayon] : [taille, fond, marge, rayon] });
  const root = { getSharedPluginData: () => '' };
  return { figma: { teamLibrary, root, variables: port } as never } as unknown as Contexte;
}

async function c29(contexte: Contexte): Promise<Constat> {
  const catalogue = await catalogueDeFigma(releve, { leve: false }, contexte);
  const constat = proposerLesCorrections(releve, catalogue, []).find(({ code }) => code === 'C29');
  assert.ok(constat);
  return constat as Constat;
}

test('avec une library, un padding de 8 : C29 porte la correction du token du composant, jamais celle du token layout de même valeur', async () => {
  const constat = await c29(contexteDeLibrary({}));
  assert.equal(constat.correction?.apres.cle, 'v-pad');
  assert.equal(constat.faits.recherche, undefined);
});

test('les valeurs chargées sont celles des tokens du composant que le relevé met en jeu, pas celles de layout', async () => {
  const catalogue = await catalogueDeFigma(releve, { leve: false }, contexteDeLibrary({}));
  const etat = (cle: string) => catalogue.variables.find((variable) => variable.cle === cle)?.etat;
  assert.equal(etat('v-pad'), 'presente');
  assert.equal(etat('v-bouton'), 'presente');
  assert.equal(etat('v-rayon'), 'non-chargee');
  assert.equal(etat('v-size-8'), 'non-chargee');
});

test('une collection components inaccessible : C29 sans question ni correction, et sa carte dit que les tokens n’ont pas pu être lus', async () => {
  const constat = await c29(contexteDeLibrary({ leve: true }));
  assert.equal(constat.correction, undefined);
  assert.equal(constat.question, undefined);
  assert.equal(constat.faits.recherche, 'incomplete');
  const carte = carteDAFaire(constat, { composant: 'Alert', variants: [], layers: new Map([['racine', 'racine']]) });
  assert.equal(carte.phrase, 'Le padding left du layer racine vaut 8 px, sans variable. Les tokens du composant n’ont pas pu être lus.');
  assert.equal(carte.statut, 'Vérifiez la library de tokens dans la Configuration');
});

test('un token du composant que l’import refuse : recherche incomplète', async () => {
  const constat = await c29(contexteDeLibrary({ importable: false }));
  assert.equal(constat.faits.recherche, 'incomplete');
  assert.equal(constat.correction, undefined);
  assert.equal(constat.question, undefined);
});

test('une recherche complète sans candidat reste une question sans candidat, dans À faire dans Figma', () => {
  const sans: Constat = { id: 'C29:x', code: 'C29', type: 'corriger', famille: 'tailles', variants: [], layers: [], faits: { champ: 'paddingLeft', valeur: 8 }, question: { id: 'q', candidats: [] } };
  assert.equal(estAFaire(sans), true);
  assert.equal(carteDAFaire(sans, { composant: 'Alert', variants: [], layers: new Map() }).statut, 'Créez un token du composant qui vaut cette valeur, puis liez-le');
});

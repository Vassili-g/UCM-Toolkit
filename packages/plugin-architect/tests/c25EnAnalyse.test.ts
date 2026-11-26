/**
 * C25 en analyse avec une library (D19, L10) : le token de couleur que C25 peut proposer se charge avec les valeurs du thème qu'il atteint,
 * même si aucune liaison du relevé ne le cite, sinon `gardeLeDessin` ne le lit pas et la proposition disparaît. Le catalogue passe par
 * `catalogueDeFigma`, le chemin de l'analyse réelle.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { proposerLesCorrections, type Constat, type ReleveDeComposant } from '@ucm-kit/core/controles';

import { catalogueDeFigma } from '../src/sandbox/analyse';
import type { Contexte } from '../src/sandbox/contexte';
import { collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const dimensions = { x: 0, y: 0, largeur: 100, hauteur: 40 };
const NOIR = { r: 0, g: 0, b: 0, a: 1 };
const BLANC = { r: 1, g: 1, b: 1, a: 1 };
const solide = (couleur: typeof NOIR, champ: 'fills' | 'strokes' = 'fills') => ({ champ, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur });

/** Un fond blanc lié à `v-bg`, et un texte noir écrit en dur : C25 propose un token `foreground` que le relevé ne lie nulle part. */
const releve: ReleveDeComposant = {
  version: 1, jeu: { cle: 'alert-set', id: 'alert-set', nom: 'Alert' }, proprietes: [],
  variants: [{ id: 'v1', nom: 'Alert', valeurs: {}, modesEffectifs: {}, layers: [
    {
      id: 'racine', nom: 'racine', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions, peintures: [solide(BLANC)], valeursEnDur: [],
      liaisons: [{ champ: 'fills', indice: 0, porteur: 'racine', variable: { id: 'v-bg', cle: 'v-bg', nom: 'alert/color/info/background', collection: 'cc', distante: true } }],
    },
    {
      id: 'texte', nom: 'Label', type: 'TEXT', parent: 'racine', visible: true, opacite: 1, dimensions: { x: 4, y: 4, largeur: 40, hauteur: 16 },
      peintures: [], liaisons: [], valeursEnDur: [],
      texte: { style: null, plages: [{ debut: 0, fin: 5, fontSize: 14, fontWeight: 400, peintures: [solide(NOIR)], liaisons: [] }] },
    },
  ] }],
  lecture: { layersLus: 2, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
};

const alias = (cle: string) => ({ type: 'VARIABLE_ALIAS', id: `VariableID:${cle}/1:1` });

/**
 * Une library : `components` porte le fond lié, le token `foreground` que rien ne lie et un token `border` hors des rôles du texte ; `theme`
 * porte la couleur noire que `foreground` vise. `foreground`, que le relevé ne cite pas, s'importe par clé.
 */
function contexteDeLibrary(themeNoir = true): Contexte {
  const bibliotheque = [
    { key: 'cc', name: 'components', libraryName: 'Intencial', variables: [
      { key: 'v-bg', name: 'alert/color/info/background', resolvedType: 'COLOR' },
      { key: 'v-fg', name: 'alert/color/info/foreground', resolvedType: 'COLOR' },
      { key: 'v-bord', name: 'alert/color/info/border', resolvedType: 'COLOR' },
    ] },
    { key: 'ct', name: 'theme', libraryName: 'Intencial', variables: [{ key: 'v-theme', name: 'info/surface/foreground', resolvedType: 'COLOR' }] },
  ];
  const teamLibrary = {
    async getAvailableLibraryVariableCollectionsAsync() { return bibliotheque.map(({ key, name, libraryName }) => ({ key, name, libraryName })); },
    async getVariablesInLibraryCollectionAsync(cle: string) { return bibliotheque.find((collection) => collection.key === cle)!.variables; },
  };
  const fond = { ...variableFigma('VariableID:v-bg/1:2', 'comp', 'alert/color/info/background', 'COLOR', { 'comp:Valeur': BLANC }, true), key: 'v-bg' };
  const premierPlan = { ...variableFigma('VariableID:v-fg/1:3', 'comp', 'alert/color/info/foreground', 'COLOR', { 'comp:Valeur': alias('v-theme') }, true), key: 'v-fg' };
  const bord = { ...variableFigma('VariableID:v-bord/1:4', 'comp', 'alert/color/info/border', 'COLOR', { 'comp:Valeur': NOIR }, true), key: 'v-bord' };
  const theme = {
    ...variableFigma('VariableID:v-theme/1:1', 'th', 'info/surface/foreground', 'COLOR', { 'th:Light': themeNoir ? NOIR : BLANC, 'th:Dark': themeNoir ? NOIR : BLANC }, true),
    key: 'v-theme',
  };
  const { port } = portDeTest([], [], [], [collectionFigma('comp', 'components', ['Valeur'], [], true), collectionFigma('th', 'theme', ['Light', 'Dark'], [], true)],
    { importables: [fond, premierPlan, bord, theme] });
  return { figma: { teamLibrary, root: { getSharedPluginData: () => '' }, variables: port } as never } as unknown as Contexte;
}

const c25 = (catalogue: Awaited<ReturnType<typeof catalogueDeFigma>>): Constat => {
  const constat = proposerLesCorrections(releve, catalogue, []).find(({ code, layers }) => code === 'C25' && layers.includes('texte'));
  assert.ok(constat);
  return constat;
};

test('un token de couleur que rien ne lie se charge avec sa cible du thème : C25 le propose quand il garde le dessin', async () => {
  const catalogue = await catalogueDeFigma(releve, { leve: false }, contexteDeLibrary());
  const etat = (cle: string) => catalogue.variables.find((variable) => variable.cle === cle)?.etat;
  assert.equal(etat('v-fg'), 'presente');
  assert.equal(etat('v-theme'), 'presente', 'la cible d’alias du candidat se charge aussi');
  const constat = c25(catalogue);
  assert.equal(constat.correction?.apres.cle, 'v-fg');
  assert.equal(constat.question, undefined);
});

test('un candidat qui change la couleur reste une question, même chargé', async () => {
  const constat = c25(await catalogueDeFigma(releve, { leve: false }, contexteDeLibrary(false)));
  assert.equal(constat.correction, undefined);
  assert.deepEqual(constat.question?.candidats.map(({ cle }) => cle), ['v-fg']);
});

test('les tokens que C25 ne peut pas proposer restent non chargés', async () => {
  const catalogue = await catalogueDeFigma(releve, { leve: false }, contexteDeLibrary());
  assert.equal(catalogue.variables.find((variable) => variable.cle === 'v-bord')?.etat, 'non-chargee');
});

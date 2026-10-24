/**
 * Régressions de la recette Figma d'Alert et de Button (24 octobre) : le layer intérieur d'une surcharge, les alias d'une
 * library suivis jusqu'aux primitives, et une phrase pour chaque constat d'À faire dans Figma.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { controlerLAccessibilite, variableDuCatalogue, type CatalogueDeReference } from '@ucm-kit/core/controles';

import { chargerLesValeurs } from '../src/catalogue';
import type { Constat } from '../src/messages/commun';
import { lireLeReleve } from '../src/releveDuComposant';
import { carteDAFaire, estAFaire, type ContexteDAFaire } from '../src/ui/ignores/modele';
import { TEXTES } from '../src/ui/textes';
import { atelierDeCalques, collectionFigma, portDeTest, variableFigma } from './figmaDeTest';

const alias = (id: string) => ({ type: 'VARIABLE_ALIAS', id });

test('le relevé garde, pour chaque surcharge, le layer de l’instance qu’elle lie, même quand deux layers visent la même variable', async () => {
  const a = atelierDeCalques();
  const peint = { fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 }, boundVariables: { color: alias('texte') } }] };
  const libelle = a.calque('I1;texte', 'TEXT', { name: 'Suivant', ...peint });
  const trace = a.calque('I1;trace', 'VECTOR', { name: 'Vector', ...peint });
  const wrapper = a.calque('I1', 'INSTANCE', {
    name: '.sizeWrapperButton',
    overrides: [{ id: 'I1;texte', overriddenFields: ['fills'] }, { id: 'I1;trace', overriddenFields: ['fills'] }],
    getMainComponentAsync: async () => ({ id: 'm', name: 'Wrapper', type: 'COMPONENT', key: 'cle-wrapper', remote: false, parent: null }),
  }, [libelle, trace]);
  const variant = a.calque('v', 'COMPONENT', { name: 'State=Default' }, [wrapper]);
  const jeu = a.calque('jeu', 'COMPONENT_SET', { name: 'Button', key: 'cle-jeu', componentPropertyDefinitions: { State: { type: 'VARIANT', defaultValue: 'Default', variantOptions: ['Default'] } } }, [variant]);
  const { port } = portDeTest([collectionFigma('c', 'components', ['Valeur'], ['texte'])], [variableFigma('texte', 'c', 'button/color/foreground', 'COLOR', { 'c:Valeur': { r: 1, g: 1, b: 1, a: 1 } })]);
  const issue = await lireLeReleve(a.port(port), jeu);
  assert.equal(issue.statut, 'lu');
  if (issue.statut !== 'lu') return;
  const layer = issue.releve.variants[0].layers.find(({ id }) => id === 'I1');
  assert.deepEqual(layer?.liaisons.map(({ porteur, surcharge }) => [porteur, surcharge]), [
    ['I1', { id: 'I1;texte', nom: 'Suivant', type: 'TEXT' }],
    ['I1', { id: 'I1;trace', nom: 'Vector', type: 'VECTOR' }],
  ]);
});

test('un alias de la library qui vise une primitive hors du catalogue est suivi : la couleur se lit et le contraste se mesure', async () => {
  const catalogue: CatalogueDeReference = {
    version: 1, library: { nom: 'Intencial', cle: 'Intencial' },
    collections: [{ cle: 'cc', nom: 'components', role: 'components', modes: [], etat: 'lue' }, { cle: 'ct', nom: 'theme', role: 'theme', modes: [], etat: 'lue' }],
    variables: [
      { cle: 'cle-fond', nom: 'alert/color/info/background', collection: 'cc', type: 'COLOR', etat: 'non-chargee' },
      { cle: 'cle-texte', nom: 'alert/color/info/foreground', collection: 'cc', type: 'COLOR', etat: 'non-chargee' },
      { cle: 'cle-theme', nom: 'info/surface/background', collection: 'ct', type: 'COLOR', etat: 'non-chargee' },
    ],
  };
  const fond = variableFigma('VariableID:cle-fond/1:1', 'comp', 'alert/color/info/background', 'COLOR', { 'comp:Valeur': alias('VariableID:cle-theme/1:2') }, true);
  const texte = variableFigma('VariableID:cle-texte/1:3', 'comp', 'alert/color/info/foreground', 'COLOR', { 'comp:Valeur': alias('VariableID:cle-noir/1:5') }, true);
  const theme = variableFigma('VariableID:cle-theme/1:2', 'them', 'info/surface/background', 'COLOR', { 'them:Light': alias('VariableID:cle-blanc/1:4') }, true);
  // Les primitives ne sont pas publiées : seul leur identifiant, importé avec le token qui les vise, les lit.
  const blanc = variableFigma('VariableID:cle-blanc/1:4', 'prim', 'color/white', 'COLOR', { 'prim:Valeur': { r: 1, g: 1, b: 1, a: 1 } }, true);
  const noir = variableFigma('VariableID:cle-noir/1:5', 'prim', 'color/black', 'COLOR', { 'prim:Valeur': { r: 0, g: 0, b: 0, a: 1 } }, true);
  const { port } = portDeTest([], [], [blanc, noir], [
    collectionFigma('comp', 'components', ['Valeur'], [], true), collectionFigma('them', 'theme', ['Light'], [], true), collectionFigma('prim', 'primitives', ['Valeur'], [], true),
  ], { importables: [{ ...fond, key: 'cle-fond' }, { ...texte, key: 'cle-texte' }, { ...theme, key: 'cle-theme' }] });
  const charge = (await chargerLesValeurs(port, catalogue, ['cle-fond', 'cle-texte'])).catalogue;
  const primitive = variableDuCatalogue(charge, 'cle-blanc');
  assert.ok(primitive !== 'absente');
  assert.equal(primitive.etat, 'presente');
  assert.equal(charge.collections.find(({ cle }) => cle === primitive.collection)?.role, 'primitives');

  const peinture = (v: number) => ({ champ: 'fills' as const, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: v, g: v, b: v, a: 1 } });
  const lie = (cle: string) => ({ champ: 'fills', indice: 0, porteur: 'x', variable: { id: cle, cle, nom: cle, collection: 'components', distante: true } });
  const dims = { x: 0, y: 0, largeur: 100, hauteur: 40 };
  const constats = controlerLAccessibilite({
    version: 1, jeu: { cle: 'alert', id: 'jeu', nom: 'Alert' }, proprietes: [],
    lecture: { layersLus: 2, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
    variants: [{ id: 'v', nom: 'Type=Info, Variant=Filled', valeurs: {}, modesEffectifs: {}, layers: [
      { id: 'r', nom: 'Type=Info, Variant=Filled', type: 'COMPONENT', parent: null, visible: true, opacite: 1, dimensions: dims, peintures: [peinture(0.5)], liaisons: [lie('cle-fond')], valeursEnDur: [] },
      { id: 't', nom: 'Titre', type: 'TEXT', parent: 'r', visible: true, opacite: 1, dimensions: dims, peintures: [], liaisons: [], valeursEnDur: [],
        texte: { style: null, plages: [{ debut: 0, fin: 5, fontSize: 16, fontWeight: 400, peintures: [peinture(0.5)], liaisons: [{ ...lie('cle-texte'), plage: { debut: 0, fin: 5 } }] }] } },
    ] }],
  }, charge, { niveau: 'AA' });
  assert.deepEqual(constats.filter((constat) => constat.limite).map(({ faits }) => faits.cause), []);
});

const contexte: ContexteDAFaire = {
  composant: 'Button',
  variants: [{ id: 'v1', nom: 'Color=Primary, Variant=Outlined, State=Default' }, { id: 'v2', nom: 'Color=Primary, Variant=Text, State=Focus' }],
  layers: new Map([['v1', 'Color=Primary, Variant=Outlined, State=Default'], ['l1', '.sizeWrapperButton']]),
};
const constat = (code: `C${number}`, faits: Constat['faits'], autres: Partial<Constat> = {}): Constat =>
  ({ id: `${code}:x`, code, type: 'corriger', famille: 'liaisons', variants: ['v1'], layers: ['l1'], faits, ...autres });

test('chaque constat que la recette a montré sans phrase reçoit sa phrase et son geste', () => {
  const cas: Constat[] = [
    constat('C24', { token: 'Button/Color/Primary/Outlined/Default/foreground', role: 'foreground', attendu: 'border', champ: 'strokes' }),
    constat('C10', { token: 'Button/Size/Medium/gap', segment: 'Medium', attendu: 'md', tokens: 4 }, { famille: 'tailles', variants: [], layers: [] }),
    constat('C21', { nom: 'Button/Color/Primary/Text/Focus/ring', majorite: 'theme:ring', autres: 4, exemple: 'Button/Color/Info/Text/Focus/ring', champ: 'strokes' }, { type: 'verifier' }),
    constat('C45', { composant: 'Alert', regle: 'severity', ecart: 'sans-propriete' }, { famille: 'regles', variants: [], layers: [] }),
    constat('C45', { composant: 'Button', propriete: 'disabled', ecart: 'sans-regle' }, { famille: 'regles', variants: [], layers: [] }),
  ];
  for (const entree of cas) {
    const carte = carteDAFaire(entree, contexte);
    assert.notEqual(carte.phrase, TEXTES.aFaireDuComposant.sansPhrase(entree.code), entree.code);
    assert.ok(carte.statut, `${entree.code} sans geste`);
  }
  assert.equal(carteDAFaire(cas[0], contexte).phrase, 'Le stroke est lié à `Color/Primary/Outlined/Default/foreground`, un token foreground. Un stroke de ce layer attend un token border.');
  assert.equal(carteDAFaire(cas[1], contexte).phrase, '4 tokens écrivent `Medium`, comme `Size/Medium/gap`. UCM écrit `md`.');
});

test('une question sans candidat ne se répond pas : son constat reste dans À faire dans Figma', () => {
  assert.equal(estAFaire(constat('C24', {}, { question: { id: 'q', candidats: [] } })), true);
  assert.equal(estAFaire(constat('C24', {}, { question: { id: 'q', candidats: [{ nom: 'x' }] } })), false);
});

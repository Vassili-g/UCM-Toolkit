/**
 * `clesDesTokensDeTailleAttendus` ne lit que les tokens FLOAT et aucun quand le relevé n'a pas de valeur en dur : même sortie que
 * l'appel sans filtre, et le nom d'une variable écartée n'est jamais lu.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { clesDesTokensDeTailleAttendus, proprietesDeComposantDuChamp } from '../src/controles/corrections.js';
import { tokensDuComposant, type CatalogueDeReference, type LayerLu, type ReleveDeComposant, type VariableDuCatalogue } from '../src/controles/index.js';

const layer = (valeursEnDur: LayerLu['valeursEnDur']): LayerLu => ({
  id: 'racine', nom: 'racine', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 },
  peintures: [], liaisons: [], valeursEnDur,
});
const releve = (valeursEnDur: LayerLu['valeursEnDur'], proprietes: ReleveDeComposant['proprietes'] = []): ReleveDeComposant => ({
  version: 1, jeu: { cle: 'alert-set', id: 'alert-set', nom: 'Alert' }, proprietes,
  variants: [{ id: 'v1', nom: 'Alert', valeurs: {}, modesEffectifs: {}, layers: [layer(valeursEnDur)] }],
  lecture: { layersLus: 1, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
});
const composants = { cle: 'components', nom: 'components', role: 'components' as const, modes: [], etat: 'lue' as const };
const variable = (cle: string, nom: string, type: VariableDuCatalogue['type'], extra: Partial<VariableDuCatalogue> = {}, collection = 'components'): VariableDuCatalogue =>
  ({ cle, nom, collection, type, etat: 'presente', valeurs: { Light: { valeur: 8 } }, ...extra });
const catalogue = (variables: VariableDuCatalogue[]): CatalogueDeReference => ({
  version: 1, library: null, collections: [composants, { cle: 'layout', nom: 'layout', role: 'layout', modes: [], etat: 'lue' }], variables,
});

/** L'implémentation d'avant : tous les tokens, puis le filtre FLOAT et propriété. Les propriétés sont celles des champs jugés des fixtures. */
function clesDeReference(r: ReleveDeComposant, cat: CatalogueDeReference, champs: string[]): string[] {
  const proprietes = new Set(champs.flatMap((champ) => proprietesDeComposantDuChamp(champ)));
  return tokensDuComposant(r, cat)
    .filter((token) => token.variable.type === 'FLOAT' && proprietes.has(token.lecture.find((segment) => segment.role === 'propriete')?.terme ?? ''))
    .map((token) => token.variable.cle);
}

const mixte = (): VariableDuCatalogue[] => [
  variable('pad', 'alert/size/padding-x', 'FLOAT'), variable('rayon', 'alert/size/radius', 'FLOAT'), variable('trait', 'alert/size/border-width', 'FLOAT'),
  variable('couleur-pad', 'alert/color/info/background', 'COLOR'), variable('titre', 'alert/typography/title', 'STRING'),
  variable('non-chargee', 'alert/size/gap', 'FLOAT', { etat: 'non-chargee', valeurs: undefined }), variable('autre', 'banner/size/padding-x', 'FLOAT'),
  variable('layout-8', 'layout/sizing/8', 'FLOAT', {}, 'layout'), variable('rayon-bis', 'Alert/size/radius', 'FLOAT'),
];

test('la sortie ordonnée égale celle de l’implémentation d’avant sur des variables mêlées', () => {
  const cas: Array<[string[], VariableDuCatalogue[]]> = [
    [['paddingLeft', 'topLeftRadius', 'itemSpacing'], mixte()],
    [['cornerRadius'], mixte()],
    [['width'], mixte()],
    [['paddingLeft'], mixte().reverse()],
    [['paddingLeft', 'strokeWeight'], []],
  ];
  for (const [champs, variables] of cas) {
    const r = releve(champs.map((champ) => ({ champ, valeur: 8 })));
    const cat = catalogue(variables);
    assert.deepEqual(clesDesTokensDeTailleAttendus(r, cat), clesDeReference(r, cat, champs), champs.join());
  }
  const r = releve([{ champ: 'paddingLeft', valeur: 8 }, { champ: 'topLeftRadius', valeur: 4 }]);
  assert.deepEqual(clesDesTokensDeTailleAttendus(r, catalogue(mixte())).sort(), ['pad', 'rayon', 'rayon-bis']);
});

test('un relevé sans valeur en dur rend [] comme avant', () => {
  const r = releve([]);
  assert.deepEqual(clesDesTokensDeTailleAttendus(r, catalogue(mixte())), []);
  assert.deepEqual(clesDeReference(r, catalogue(mixte()), []), []);
});

test('l’appel avec types rend le sous-ensemble de l’appel sans filtre, dans le même ordre, sans toucher à la mémoire', () => {
  const r = releve([{ champ: 'paddingLeft', valeur: 8 }], [{ nom: 'Size', type: 'VARIANT', valeurs: ['sm'], defaut: 'sm' }]);
  const cat = catalogue(mixte());
  const filtre = tokensDuComposant(r, cat, { types: ['FLOAT'] });
  const complet = tokensDuComposant(r, cat);
  assert.deepEqual(filtre, complet.filter((token) => token.variable.type === 'FLOAT'));
  assert.notEqual(filtre, complet);
  assert.equal(tokensDuComposant(r, cat), complet);
  assert.ok(complet.some((token) => token.variable.type === 'COLOR'));
});

/** Compte les lectures de `nom` de chaque variable ; `type` se lit sans compte. */
function espionner(variables: VariableDuCatalogue[]): { variables: VariableDuCatalogue[]; lectures: Map<string, number> } {
  const lectures = new Map<string, number>();
  const espionnees = variables.map((v) => {
    const { nom, ...reste } = v;
    return Object.defineProperty({ ...reste } as VariableDuCatalogue, 'nom', { enumerable: true, get() { lectures.set(v.cle, (lectures.get(v.cle) ?? 0) + 1); return nom; } });
  });
  return { variables: espionnees, lectures };
}

test('le nom n’est lu pour aucune variable COLOR ni STRING', () => {
  const { variables, lectures } = espionner(mixte());
  const r = releve([{ champ: 'paddingLeft', valeur: 8 }]);
  clesDesTokensDeTailleAttendus(r, catalogue(variables));
  assert.ok(lectures.size > 0);
  assert.equal(lectures.has('couleur-pad'), false);
  assert.equal(lectures.has('titre'), false);
});

test('le nom n’est lu pour aucune variable quand le relevé n’a pas de valeur en dur', () => {
  const { variables, lectures } = espionner(mixte());
  clesDesTokensDeTailleAttendus(releve([]), catalogue(variables));
  assert.equal(lectures.size, 0);
});

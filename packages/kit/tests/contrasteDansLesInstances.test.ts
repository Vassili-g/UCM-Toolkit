/**
 * D31 : C49 mesure les textes et les icônes que le relevé lit sous une instance (`VariantLu.dansInstances`), sur la preuve du fond
 * des layers de l'hôte, et aucun autre contrôle ne les juge. Un texte blanc du `Button` vit sous l'instance `.sizeWrapperButton`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  controlerCouches, controlerLAccessibilite, controlerLaStructure, controlerLaTypographie, controlerLeTheme, controlerMapping, controlerNommage, controlerOublis,
  constatsDeModele, proposerLesCorrections,
  type CatalogueDeReference, type Constat, type LayerLu, type LiaisonLue, type PeintureLue, type ReleveDeComposant, type VariantLu,
} from '../src/controles/index';

const gris = (v: number) => ({ r: v, g: v, b: v, a: 1 });
const solide = (champ: 'fills' | 'strokes', couleur: { r: number; g: number; b: number; a: number }): PeintureLue =>
  ({ champ, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur });
const dims = (largeur: number, hauteur: number, x = 0) => ({ x, y: 0, largeur, hauteur });

/** Le variant : un cadre peint, une instance `.sizeWrapperButton` posée dessus, et ce qu'elle contient. */
function racine(fond: number): LayerLu {
  return { id: 'r', nom: 'Root', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: dims(125, 44), peintures: [solide('fills', gris(fond))], liaisons: [], valeursEnDur: [] };
}
const enveloppe: LayerLu = {
  id: 'e', nom: '.sizeWrapperButton', type: 'INSTANCE', parent: 'r', visible: true, opacite: 1, dimensions: dims(125, 44), peintures: [], liaisons: [], valeursEnDur: [],
  instanceDe: { cle: 'k', nom: '.sizeWrapperButton', distante: false, pilotee: null },
};
const label = (couleur: number, extra: Partial<LayerLu> = {}): LayerLu => ({
  id: 'label', nom: 'Suivant', type: 'TEXT', parent: 'e', visible: true, opacite: 1, dimensions: dims(37, 16, 40), peintures: [], liaisons: [], valeursEnDur: [],
  texte: { style: null, plages: [{ debut: 0, fin: 7, fontSize: 14, fontWeight: 400, peintures: [solide('fills', gris(couleur))], liaisons: [] }] },
  ...extra,
});
const fleche = (couleur: number): LayerLu[] => [
  {
    id: 'fleche', nom: 'arrow-left-long', type: 'INSTANCE', parent: 'e', visible: true, opacite: 1, dimensions: dims(20, 20, 10), peintures: [], liaisons: [], valeursEnDur: [],
    instanceDe: { cle: 'a', nom: 'arrow-left-long', distante: true, pilotee: 'Icon-Left#1:1', dessin: true },
  },
  { id: 'trace', nom: 'Vector', type: 'VECTOR', parent: 'fleche', visible: true, opacite: 1, dimensions: dims(16, 12, 12), peintures: [solide('fills', gris(couleur))], liaisons: [], valeursEnDur: [] },
];

function releve(fond: number, dansInstances: LayerLu[]): ReleveDeComposant {
  const variant: VariantLu = { id: 'v', nom: 'State=Default', valeurs: {}, layers: [racine(fond), enveloppe], modesEffectifs: {}, ...(dansInstances.length > 0 ? { dansInstances } : {}) };
  return { version: 1, jeu: { cle: 'k', id: '1', nom: 'Button' }, proprietes: [], variants: [variant], lecture: { layersLus: 2, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb' };
}
const catalogueVide: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };
/** Les constats de tous les contrôles que le panneau lance, puis les corrections qu'ils proposent. */
const tousLesConstats = (r: ReleveDeComposant, c: CatalogueDeReference): Constat[] => {
  const constats = [...controlerMapping(r, c), ...controlerCouches(r, c), ...controlerOublis(r, c), ...controlerNommage(r, c), ...controlerLaTypographie(r, c), ...controlerLAccessibilite(r, c, { niveau: 'AA' })];
  return [...constats, ...proposerLesCorrections(r, c, constats), ...constatsDeModele(r, c)];
};
const contraste = (r: ReleveDeComposant) => controlerLAccessibilite(r, catalogueVide, { niveau: 'AA' }).filter((c) => c.code === 'C49' && !c.limite);

test('D31 : un texte blanc dans une instance posée sur un fond blanc donne C49 à corriger', () => {
  const constats = contraste(releve(1, [label(1)]));
  assert.equal(constats.length, 1);
  assert.deepEqual([constats[0].type, constats[0].faits.usage, constats[0].faits.calque, constats[0].faits.rapport, constats[0].layers], ['corriger', 'texte', 'Suivant', 1, ['label']]);
});

test('D31 : le même texte blanc sur un fond foncé ne donne aucun constat', () => {
  assert.deepEqual(contraste(releve(0.1, [label(1)])), []);
});

test('D31 : une flèche dans une instance se mesure au seuil d’icône, pas au seuil de non-texte', () => {
  // Gris 0,58 sur blanc : 3,2 pour 1. Il passe les 3 d'un contour et manque les 4,5 d'une icône.
  const constats = contraste(releve(1, fleche(0.58)));
  assert.equal(constats.length, 1);
  assert.deepEqual([constats[0].faits.usage, constats[0].faits.calque, constats[0].faits.seuil], ['icone', 'Vector', 4.5]);
  assert.deepEqual(contraste(releve(1, fleche(0.4))), [], 'une flèche assez sombre passe');
});

test('D31 : le texte d’un cadre sans fond se mesure sur le fond du layer de l’hôte, le fond du cadre prime', () => {
  const cadre: LayerLu = { id: 'cadre', nom: 'Contenu', type: 'FRAME', parent: 'e', visible: true, opacite: 1, dimensions: dims(125, 44), peintures: [solide('fills', gris(0))], liaisons: [], valeursEnDur: [] };
  assert.deepEqual(contraste(releve(1, [cadre, label(1, { parent: 'cadre' })])), [], 'blanc sur un cadre noir passe');
  assert.equal(contraste(releve(0, [{ ...cadre, peintures: [solide('fills', gris(1))] }, label(1, { parent: 'cadre' })])).length, 1, 'blanc sur un cadre blanc échoue');
});

test('D31 : un calque masqué, ou sous une instance masquée, n’est pas mesuré', () => {
  assert.deepEqual(contraste(releve(1, [label(1, { visible: false })])), []);
  const r = releve(1, [label(1)]);
  r.variants[0].layers[1] = { ...enveloppe, visible: false };
  assert.deepEqual(contraste(r), []);
});

test('D31 : aucun autre contrôle ne juge un calque lu sous une instance', () => {
  // Des tokens étrangers, des valeurs en dur, un nom homonyme, des textes sans style : de quoi faire parler C17, C19, C21, C25, C64, C65 et C80 s'ils les jugeaient.
  const lie = (porteur: string, cle: string, champ = 'fills'): LiaisonLue => ({ champ, indice: 0, porteur, provenance: 'composant-principal', variable: { id: cle, cle, nom: cle, collection: 'x', distante: false } });
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'x', nom: 'components', role: 'components', modes: [{ id: 'm', nom: 'Valeur' }], etat: 'lue' }],
    variables: [{ cle: 'AutreComposant/Color/Primary/Filled/Default/background', nom: 'AutreComposant/Color/Primary/Filled/Default/background', collection: 'x', type: 'COLOR', etat: 'presente', valeurs: { m: { valeur: gris(1) } } }],
  };
  const etranger = 'AutreComposant/Color/Primary/Filled/Default/background';
  const calques: LayerLu[] = [
    label(1, { liaisons: [lie('label', etranger)], valeursEnDur: [{ champ: 'paddingLeft', valeur: 7 }] }),
    ...fleche(0.58).map((layer) => (layer.id === 'trace' ? { ...layer, liaisons: [lie('trace', etranger)], valeursEnDur: [{ champ: 'width', valeur: 16 }] } : layer)),
    { ...label(0.5, { id: 'label-bis', nom: 'Suivant' }), liaisons: [lie('label-bis', etranger)] },
  ];
  const sans = releve(1, []);
  const avec = releve(1, calques);
  const hors = (constats: readonly Constat[]) => constats.filter((c) => c.code !== 'C49');
  for (const [nom, controle] of Object.entries({
    controlerMapping, controlerCouches, controlerOublis, controlerNommage, controlerLeTheme, controlerLaStructure, controlerLaTypographie,
    constatsDeModele, tousLesConstats,
  }) as [string, (r: ReleveDeComposant, c: CatalogueDeReference) => Constat[]][]) {
    assert.deepEqual(hors(controle(avec, catalogue)), hors(controle(sans, catalogue)), nom);
  }
  assert.deepEqual(controlerLAccessibilite(avec, catalogue, { niveau: 'AA' }).filter((c) => c.code !== 'C49').map((c) => c.id), controlerLAccessibilite(sans, catalogue, { niveau: 'AA' }).filter((c) => c.code !== 'C49').map((c) => c.id), 'C50 à C53 ne changent pas');
  assert.ok(controlerLAccessibilite(avec, catalogue, { niveau: 'AA' }).some((c) => c.code === 'C49' && c.faits.calque === 'Suivant'), 'C49 mesure bien le texte');
  // La garde : les mêmes calques, lus comme des layers de l'hôte, donnent bien des constats que ces contrôles auraient rendus.
  const pose = releve(1, []);
  pose.variants[0].layers.push(...calques);
  const jugee = new Set(hors(tousLesConstats(pose, catalogue)).map((c) => c.code));
  for (const code of ['C25', 'C29', 'C64', 'C66', 'C67'] as const) assert.ok(jugee.has(code), `posés comme layers, les calques donnent ${code} : ${[...jugee].join(', ')}`);
  // Le layer de l'hôte peut en donner (sa peinture n'est pas liée) : les calques lus dessous n'en ajoutent aucun.
  const nombre = (constats: readonly Constat[], code: Constat['code']) => constats.filter((c) => c.code === code).length;
  const rendusAvec = tousLesConstats(avec, catalogue);
  const rendusSans = tousLesConstats(sans, catalogue);
  for (const code of ['C17', 'C19', 'C21', 'C25', 'C29', 'C64', 'C65', 'C66', 'C67', 'C80'] as const) assert.equal(nombre(rendusAvec, code), nombre(rendusSans, code), code);
  assert.ok(rendusAvec.every((c) => !c.layers.some((id) => ['label', 'label-bis', 'fleche', 'trace'].includes(id)) || c.code === 'C49'), 'aucun constat hors C49 ne nomme un calque lu sous l’instance');
});

test('D31 : un relevé sans `dansInstances` mesure comme avant', () => {
  assert.deepEqual(contraste(releve(1, [])), []);
});

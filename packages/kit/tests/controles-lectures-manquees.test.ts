/** Une lecture manquée ne devient jamais un constat : liaison illisible, boîte illisible. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlerLAccessibilite, controlerLaTypographie, lectureManquee, preparerLesTokens, proposerLesCorrections,
  type CatalogueDeReference, type LayerLu, type LiaisonLue, type PeintureLue, type ReleveDeComposant, type VariantLu,
} from '../src/controles/index.js';

const dims = { x: 0, y: 0, largeur: 100, hauteur: 40 };
const solide = (champ: 'fills' | 'strokes' = 'fills'): PeintureLue => ({ champ, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 0, g: 0, b: 0, a: 1 } });
const illisible = (champ: string, indice?: number): LiaisonLue => ({
  champ, ...(indice === undefined ? {} : { indice }), porteur: 'x', illisible: true,
  variable: { id: 'VariableID:9:9', cle: '', nom: '', collection: '', distante: false },
});
const catalogue: CatalogueDeReference = {
  version: 1, library: null, variables: [],
  collections: [
    { cle: 'typography', nom: 'typography', role: 'typography', modes: [], etat: 'lue' },
    { cle: 'layout', nom: 'layout', role: 'layout', modes: [], etat: 'lue' },
    { cle: 'theme', nom: 'theme', role: 'theme', modes: [], etat: 'lue' },
  ],
};
function layer(id: string, nom: string, type: string, parent: string | null, extras: Partial<LayerLu> = {}): LayerLu {
  return { id, nom, type, parent, visible: true, opacite: 1, dimensions: dims, peintures: [], liaisons: [], valeursEnDur: [], ...extras };
}
const variant = (id: string, layers: LayerLu[], valeurs: Record<string, string> = {}): VariantLu => ({ id, nom: id, valeurs, layers, modesEffectifs: {} });
function releve(variants: VariantLu[], manquees: ReleveDeComposant['lecture']['manquees'] = [], proprietes: ReleveDeComposant['proprietes'] = []): ReleveDeComposant {
  return {
    version: 1, jeu: { cle: 'k', id: 'jeu', nom: 'Alert' }, proprietes, variants,
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees }, espaceDeCouleur: 'srgb',
  };
}
const texte = (id: string, liaisons: LiaisonLue[]): LayerLu => layer(id, 'message', 'TEXT', 'r', {
  texte: { style: null, plages: [{ debut: 0, fin: 3, fontSize: 14, fontWeight: 400, peintures: [], liaisons }] }, liaisons,
});
const typographie = (r: ReleveDeComposant, code: string) => controlerLaTypographie(r, catalogue).filter((c) => c.code === code);

test('lectureManquee : vrai pour le layer et le champ consignés, faux pour les autres', () => {
  const r = releve([], [{ layer: 'racine', champ: 'dimensions', motif: 'boîte illisible' }]);
  assert.equal(lectureManquee(r, 'racine', 'dimensions'), true);
  assert.equal(lectureManquee(r, 'racine', 'fills'), false);
  assert.equal(lectureManquee(r, 'autre', 'dimensions'), false);
});

test('C66 : une couleur et une taille liées par une variable illisible ne sont ni « sans variable » ni jugées', () => {
  const icone = (id: string, liaisons: LiaisonLue[]) => layer(id, 'icon', 'INSTANCE', 'r', {
    liaisons, instanceDe: { cle: 'c', nom: 'Info', distante: true, pilotee: null },
  });
  const lie = releve([variant('a', [icone('i', [illisible('fills', 0), illisible('width'), illisible('height')])])]);
  assert.deepEqual(typographie(lie, 'C66'), []);

  const sans = releve([variant('a', [icone('i', [])])]);
  assert.deepEqual(typographie(sans, 'C66').map((c) => c.faits.motif).sort(), ['couleur-sans-variable', 'taille-sans-variable']);
});

test('C64 et C65 : une liaison de typographie illisible compte comme liée', () => {
  const seul = releve([variant('a', [texte('t', [illisible('fontSize')])])]);
  assert.deepEqual(typographie(seul, 'C64'), []);
  assert.deepEqual(typographie(releve([variant('a', [texte('t', [])])]), 'C64').map((c) => c.faits.motif), ['sans-style-ni-variables']);

  const trois = (milieu: LiaisonLue[]) => releve([
    variant('a', [texte('ta', [illisible('fontSize')])]), variant('b', [texte('tb', milieu)]), variant('c', [texte('tc', [illisible('fontSize')])]),
  ]);
  assert.deepEqual(typographie(trois([illisible('fontSize')]), 'C65'), []);
  assert.deepEqual(typographie(trois([]), 'C65').map((c) => c.faits.motif), ['sans-liaison-comme-les-autres']);
});

test('C25 et préparation : une peinture liée par une variable illisible est liée', () => {
  const titre = (liaisons: LiaisonLue[]) => releve([variant('a', [layer('t', 'Title', 'TEXT', 'r', { peintures: [solide()], liaisons })])]);
  assert.deepEqual(proposerLesCorrections(titre([illisible('fills', 0)]), catalogue, []).filter((c) => c.code === 'C25'), []);
  assert.equal(proposerLesCorrections(titre([]), catalogue, []).filter((c) => c.code === 'C25').length, 1);

  const fond = (liaisons: LiaisonLue[]) => releve([variant('a', [layer('f', 'container', 'FRAME', null, { peintures: [solide()], liaisons })])]);
  assert.deepEqual(preparerLesTokens(fond([illisible('fills', 0)]), catalogue).variables, []);
  assert.ok(preparerLesTokens(fond([]), catalogue).variables.length > 0);
});

test('contraste : une peinture liée par une variable illisible rend la limite mode-illisible, jamais un verdict', () => {
  const texteLie = layer('t', 'message', 'TEXT', 'r', {
    texte: { style: null, plages: [{ debut: 0, fin: 3, fontSize: 14, fontWeight: 400, peintures: [solide()], liaisons: [illisible('fills', 0)] }] },
  });
  const racine = layer('r', 'Alert', 'COMPONENT', null, { peintures: [{ ...solide(), couleur: { r: 0, g: 0, b: 0, a: 1 } }] });
  const constats = controlerLAccessibilite(releve([variant('a', [racine, texteLie])]), catalogue, { niveau: 'AA' }).filter((c) => c.code === 'C49');
  assert.deepEqual(constats.map((c) => [c.limite === true, c.faits.cause]), [[true, 'mode-illisible']]);
});

test('C52 : un variant dont la boîte de la racine ne s’est pas lue n’est pas jugé', () => {
  const proprietes: ReleveDeComposant['proprietes'] = [{ nom: 'State', type: 'VARIANT', valeurs: ['default', 'hover'], defaut: 'default' }];
  const racine = (largeur: number, hauteur: number) => layer('r', 'Button', 'COMPONENT', null, { dimensions: { x: 0, y: 0, largeur, hauteur } });
  const c52 = (r: ReleveDeComposant) => controlerLAccessibilite(r, catalogue, { niveau: 'AA' }).filter((c) => c.code === 'C52');

  const illue = releve([variant('a', [racine(0, 0)])], [{ layer: 'r', champ: 'dimensions', motif: 'boîte illisible' }], proprietes);
  assert.deepEqual(c52(illue), []);
  assert.equal(c52(releve([variant('a', [racine(10, 10)])], [], proprietes)).length, 1);
});

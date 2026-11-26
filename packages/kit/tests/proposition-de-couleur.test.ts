/**
 * D19 (recette du Button, lot L14) : une proposition de couleur n'est une correction que si elle garde le dessin. C25 propose un token
 * pour une peinture écrite en dur ; la fonction du kit `gardeLeDessin` compare la couleur résolue du candidat à la couleur actuelle dans
 * chaque mode, puis le contraste avec le fond prouvé. Faux ou inconnu donnent une question avec le candidat, sans réponse cochée.
 * C59 suit la même règle (tests dans `theme.test.ts`).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { proposerLesCorrections, type CatalogueDeReference, type Constat, type LayerLu, type ReleveDeComposant } from '../src/controles/index.js';
import { gardeLeDessin } from '../src/controles/gardeDuDessin.js';

const NOIR = { r: 0, g: 0, b: 0, a: 1 };
const BLANC = { r: 1, g: 1, b: 1, a: 1 };
const GRIS = { r: 0.2, g: 0.2, b: 0.2, a: 1 };
const modes = [{ id: 'light', nom: 'Light' }, { id: 'dark', nom: 'Dark' }];

const solide = (couleur?: typeof NOIR) => ({ champ: 'fills' as const, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', ...(couleur ? { couleur } : {}) });

function layer(id: string, nom: string, type: string, parent: string | null, extra: Partial<LayerLu> = {}): LayerLu {
  return { id, nom, type, parent, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 24, hauteur: 24 }, peintures: [], liaisons: [], valeursEnDur: [], ...extra };
}

/** Un variant Radio : une racine, et ses enfants. */
function releve(layers: LayerLu[]): ReleveDeComposant {
  return {
    version: 1, jeu: { cle: 'radio', id: 'radio', nom: 'Radio' },
    proprietes: [{ nom: 'State', type: 'VARIANT', valeurs: ['Default'], defaut: 'Default' }],
    variants: [{ id: 'v1', nom: 'State=Default', valeurs: { State: 'Default' }, modesEffectifs: {}, layers }],
    lecture: { layersLus: layers.length, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

type Valeurs = NonNullable<CatalogueDeReference['variables'][number]['valeurs']>;
const jeton = (cle: string, nom: string, valeurs?: Valeurs) => ({ cle, nom, collection: 'components', type: 'COLOR' as const, etat: 'presente' as const, ...(valeurs ? { valeurs } : {}) });
const parMode = (clair: unknown, sombre: unknown = clair): Valeurs => ({ light: { valeur: clair }, dark: { valeur: sombre } });
const catalogue = (...variables: CatalogueDeReference['variables']): CatalogueDeReference => ({
  version: 1, library: null, collections: [{ cle: 'components', nom: 'components', role: 'components', modes, etat: 'lue' }], variables,
});

/** Le Dot du Radio : une ELLIPSE noire en dur, dans une racine dont le fond est lié au token `background` (blanc). */
function radio(couleurDuPoint: typeof NOIR | null = NOIR, avecFond = true, fondLie = true): ReleveDeComposant {
  const fond = layer('root', 'Radio', 'FRAME', null, {
    peintures: [solide(BLANC)],
    liaisons: !fondLie ? [] : [{ champ: 'fills', indice: 0, porteur: 'root', variable: { id: 'bg', cle: 'bg', nom: 'radio/color/background', collection: 'components', distante: false } }],
  });
  const point = layer('dot', 'Dot', 'ELLIPSE', 'root', { dimensions: { x: 4, y: 4, largeur: 16, hauteur: 16 }, peintures: [solide(couleurDuPoint ?? undefined)] });
  return releve(avecFond ? [fond, point] : [{ ...fond, peintures: [], liaisons: [] }, point]);
}

const c25 = (r: ReleveDeComposant, c: CatalogueDeReference): Constat => {
  const trouve = proposerLesCorrections(r, c, []).find(({ code, layers }) => code === 'C25' && layers.includes('dot'));
  assert.ok(trouve, 'C25 se prononce sur le point');
  return trouve;
};

test('D19 : le point noir du Radio ne reçoit pas le fond blanc en correction, mais une question avec le candidat (C5)', () => {
  const constat = c25(radio(), catalogue(jeton('bg', 'radio/color/background', parMode(BLANC))));
  assert.equal(constat.correction, undefined);
  assert.deepEqual(constat.question, { id: constat.id, candidats: [{ cle: 'bg', nom: 'radio/color/background' }] });
});

test('D19 : sans fond prouvé, un candidat d’une autre couleur est une question, un candidat de la même couleur une correction', () => {
  const sansFond = radio(NOIR, false);
  const autre = c25(sansFond, catalogue(jeton('bg', 'radio/color/background', parMode(BLANC))));
  assert.equal(autre.correction, undefined);
  assert.equal(autre.question?.candidats[0].cle, 'bg');
  const meme = c25(sansFond, catalogue(jeton('bg', 'radio/color/background', parMode(NOIR))));
  assert.equal(meme.question, undefined);
  assert.equal(meme.correction?.apres.cle, 'bg');
});

test('D19 : un candidat qui a la même couleur dans chaque mode garde sa correction, un candidat qui change dans un mode non', () => {
  const r = radio(GRIS, false);
  assert.equal(c25(r, catalogue(jeton('bg', 'radio/color/background', parMode(GRIS)))).correction?.apres.cle, 'bg');
  const sombreAutre = c25(r, catalogue(jeton('bg', 'radio/color/background', parMode(GRIS, BLANC))));
  assert.equal(sombreAutre.correction, undefined);
  assert.equal(sombreAutre.question?.candidats[0].cle, 'bg');
});

test('D19 : un candidat d’une autre couleur garde sa correction quand le contraste avec le fond prouvé reste au seuil', () => {
  // Point noir sur fond blanc écrit en dur ; le token est gris foncé : 15,8 contre 21, tous deux au-dessus de 3 (non-texte).
  const constat = c25(radio(NOIR, true, false), catalogue(jeton('fg', 'radio/color/foreground', parMode(GRIS))));
  assert.equal(constat.correction?.apres.cle, 'fg');
  assert.equal(constat.question, undefined);
});

test('D19 : une valeur illisible donne une question, pas une correction', () => {
  const sansFond = radio(NOIR, false);
  const illisible = (valeurs?: Valeurs) => c25(sansFond, catalogue(jeton('bg', 'radio/color/background', valeurs)));
  for (const [cas, valeurs] of [
    ['token sans valeur', undefined],
    ['valeur qui n’est pas une couleur', parMode('#000000')],
    ['alias vers une variable absente', { light: { alias: 'absente' }, dark: { alias: 'absente' } }],
    ['mode sans valeur', { light: { valeur: NOIR } }],
  ] as [string, Valeurs | undefined][]) {
    const constat = illisible(valeurs);
    assert.equal(constat.correction, undefined, cas);
    assert.equal(constat.question?.candidats[0].cle, 'bg', cas);
  }
  const sansCouleur = c25(radio(null, false), catalogue(jeton('bg', 'radio/color/background', parMode(NOIR))));
  assert.equal(sansCouleur.correction, undefined, 'couleur actuelle non lue');
  assert.equal(sansCouleur.question?.candidats[0].cle, 'bg', 'couleur actuelle non lue');
});

test('gardeLeDessin : garde, change ou inconnu, avec la liaison actuelle d’un calque lié', () => {
  const r = radio();
  const variant = r.variants[0];
  const point = variant.layers[1];
  const noir = jeton('noir', 'radio/color/foreground', parMode(NOIR));
  const blanc = jeton('blanc', 'radio/color/background', parMode(BLANC));
  const cat = catalogue(noir, blanc, jeton('bg', 'radio/color/fond', parMode(BLANC)));
  const lie = { champ: 'fills', indice: 0, porteur: 'dot', variable: { id: 'noir', cle: 'noir', nom: noir.nom, collection: 'components', distante: false } };
  const base = { variant, layer: point, champ: 'fills' as const, indice: 0, liaison: lie };
  assert.equal(gardeLeDessin(cat, { ...base, candidat: noir }), 'garde', 'le même token');
  assert.equal(gardeLeDessin(cat, { ...base, candidat: blanc }), 'change', 'blanc sur blanc');
  const absente = { ...lie, variable: { ...lie.variable, cle: 'absente' } };
  assert.equal(gardeLeDessin(cat, { ...base, liaison: absente, candidat: blanc }), 'inconnu', 'la liaison actuelle ne se lit pas');
  assert.equal(gardeLeDessin(cat, { ...base, liaison: { ...lie, illisible: true }, candidat: blanc }), 'inconnu', 'liaison illisible');
});

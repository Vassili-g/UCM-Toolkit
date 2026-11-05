/**
 * Lot E5a : C25 juge toute peinture unie sans token (E-25, N-11, N-12), C25 et C29 jugent un layer masqué et le disent (Q-F3-1),
 * l'instance imbriquée reste une frontière (Q-F3-2), et C17 lit la table des rôles qui désignent un layer dans les deux sens (Q-F3-3).
 * Les variants s'écrivent en toutes lettres (`Size=Small`), les tokens en abrégé (`sm`).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlerMapping, proposerLesCorrections,
  type CatalogueDeReference, type Constat, type LayerLu, type PeintureLue, type ReleveDeComposant, type VariantLu,
} from '../src/controles/index.js';

const SOLIDE = (champ: 'fills' | 'strokes' = 'fills', changements: Partial<PeintureLue> = {}): PeintureLue =>
  ({ champ, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', ...changements });

function layer(id: string, nom: string, type: string, parent: string | null, extra: Partial<LayerLu> = {}): LayerLu {
  return {
    id, nom, type, parent, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 },
    peintures: [], liaisons: [], valeursEnDur: [], ...extra,
  };
}

const lien = (cle: string, nom: string) => ({ id: cle, cle, nom, collection: 'components', distante: false });

function releve(layers: LayerLu[], valeurs: Record<string, string> = { Size: 'Small' }, manquees: ReleveDeComposant['lecture']['manquees'] = []): ReleveDeComposant {
  const variants: VariantLu[] = [{ id: 'v1', nom: 'Size=Small', valeurs, modesEffectifs: {}, layers }];
  return {
    version: 1, jeu: { cle: 'button', id: 'button', nom: 'Button' },
    proprietes: Object.entries(valeurs).map(([nom, valeur]) => ({ nom, type: 'VARIANT' as const, valeurs: [valeur], defaut: valeur })),
    variants, lecture: { layersLus: layers.length, layersNonLus: 0, variantsNonLus: [], manquees }, espaceDeCouleur: 'srgb',
  };
}

const token = (cle: string, nom: string) => ({ cle, nom, collection: 'components', type: 'COLOR' as const, etat: 'presente' as const });

function catalogue(...variables: CatalogueDeReference['variables']): CatalogueDeReference {
  return { version: 1, library: null, collections: [{ cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' }], variables };
}

const FOND = token('bg', 'button/color/sm/background');
const TEXTE = token('fg', 'button/color/sm/foreground');
const ICONE = token('ic', 'button/color/sm/icon');
const BORDURE = token('bd', 'button/color/sm/border');
const SEPARATEUR = token('dv', 'button/color/sm/divider');
const ANNEAU = token('rg', 'button/color/sm/ring');
const TOUS = catalogue(FOND, TEXTE, ICONE, BORDURE, SEPARATEUR, ANNEAU);

const c25 = (r: ReleveDeComposant, c: CatalogueDeReference = TOUS): Constat[] => proposerLesCorrections(r, c, []).filter(({ code }) => code === 'C25');
const racine = () => layer('root', 'Root', 'FRAME', null);

test('E5.2 : C25 juge le fond, le trait, une forme, une icône et un texte quel que soit leur nom, avec le token du rôle de la table', () => {
  const r = releve([
    racine(),
    layer('fond', 'Container', 'FRAME', 'root', { peintures: [SOLIDE()] }),
    layer('trait', 'Edge', 'FRAME', 'root', { peintures: [SOLIDE('strokes')] }),
    layer('point', 'Dot', 'ELLIPSE', 'root', { peintures: [SOLIDE()] }),
    layer('texte', 'Label', 'TEXT', 'root', { peintures: [SOLIDE()] }),
  ]);
  const constats = c25(r);
  assert.deepEqual(constats.map(({ layers }) => layers[0]), ['fond', 'trait', 'point', 'texte']);
  // Un trait admet border et foreground : deux candidats donnent une question sans réponse cochée.
  assert.deepEqual(constats.map(({ correction }) => correction?.apres.cle), ['bg', undefined, 'bg', 'fg']);
  assert.deepEqual(constats[1].question?.candidats.map(({ cle }) => cle).sort(), ['bd', 'fg']);
  assert.equal(constats[1].faits.champ, 'strokes');
});

test('E5.2 : C25 propose le token d’icône pour une instance d’Icon, et le jugement d’une plage de texte garde sa plage (N-11)', () => {
  const icone = layer('icone', 'Leading', 'VECTOR', 'root', { peintures: [SOLIDE()], instanceDe: undefined });
  const instance = layer('inst', 'Leading', 'INSTANCE', 'root', { instanceDe: { cle: 'icon', nom: 'Icon', distante: false, pilotee: null }, peintures: [] });
  const texte = layer('texte', 'Label', 'TEXT', 'root', {
    texte: { style: null, plages: [{ debut: 0, fin: 5, fontSize: 14, fontWeight: 500, liaisons: [], peintures: [SOLIDE()] }] },
  });
  const constats = c25(releve([racine(), icone, instance, texte]));
  assert.equal(constats.length, 2);
  const [plage] = constats.filter(({ layers }) => layers[0] === 'texte');
  assert.equal(plage.faits.plageDebut, 0);
  assert.equal(plage.faits.plageFin, 5);
  assert.deepEqual(plage.correction?.cible.plage, { debut: 0, fin: 5 });
  assert.equal(plage.correction?.apres.cle, 'fg');
});

test('E5.2 : le token proposé ne dépend pas de l’ordre des propriétés du jeu (N-11)', () => {
  const lignes: [string, string][] = [['Color', 'Primary'], ['Style', 'Solid'], ['Size', 'Small'], ['State', 'Hover']];
  const cat = catalogue(token('bg', 'button/color/primary/solid/sm/hover/background'), token('bg-md', 'button/color/primary/solid/md/hover/background'));
  const ordres = [[0, 1, 2, 3], [3, 2, 1, 0], [3, 0, 1, 2], [2, 0, 1, 3], [1, 0, 3, 2]];
  for (const ordre of ordres) {
    const valeurs = Object.fromEntries(ordre.map((rang) => lignes[rang]));
    const r = releve([racine(), layer('fond', 'Container', 'FRAME', 'root', { peintures: [SOLIDE()] })], valeurs);
    assert.equal(c25(r, cat)[0]?.correction?.apres.cle, 'bg', ordre.join());
  }
});

test('E5.2 : C25 saute l’opacité 0, la peinture masquée, le dégradé, la peinture liée et la lecture mixte (N-12)', () => {
  const liee = layer('liee', 'Linked', 'FRAME', 'root', { peintures: [SOLIDE()], liaisons: [{ champ: 'fills', indice: 0, porteur: 'liee', variable: lien('bg', FOND.nom) }] });
  const r = releve([
    racine(), liee,
    layer('nulle', 'Faded', 'FRAME', 'root', { peintures: [SOLIDE('fills', { opacite: 0 })] }),
    layer('cachee', 'Off', 'FRAME', 'root', { peintures: [SOLIDE('fills', { visible: false })] }),
    layer('degrade', 'Gradient', 'FRAME', 'root', { peintures: [SOLIDE('fills', { type: 'GRADIENT_LINEAR' })] }),
    layer('mixte', 'Mixed', 'TEXT', 'root', { peintures: [SOLIDE()] }),
  ], { Size: 'Small' }, [{ layer: 'mixte', champ: 'fills', motif: 'peintures mixtes ou illisibles' }]);
  assert.deepEqual(c25(r), []);
});

test('E5.2 : une liaison de surcharge ne lie pas la peinture du layer', () => {
  const surcharge = { champ: 'fills', indice: 0, porteur: 'inst', surcharge: { id: 'inst;1', nom: 'Path', type: 'VECTOR' }, variable: lien('bg', FOND.nom) };
  const r = releve([racine(), layer('inst', 'Frame', 'FRAME', 'root', { peintures: [SOLIDE()], liaisons: [surcharge] })]);
  assert.equal(c25(r).length, 1);
});

test('E5.1 : C25 juge un layer masqué et un layer sous un ancêtre masqué, et le constat le dit (Q-F3-1)', () => {
  const r = releve([
    racine(),
    layer('cache', 'Hidden', 'FRAME', 'root', { visible: false, peintures: [SOLIDE()] }),
    layer('groupe', 'Group', 'FRAME', 'root', { visible: false }),
    layer('enfant', 'Child', 'FRAME', 'groupe', { peintures: [SOLIDE()] }),
    layer('visible', 'Shown', 'FRAME', 'root', { peintures: [SOLIDE()] }),
  ]);
  const [cache, enfant, visible] = c25(r);
  assert.deepEqual([cache.layers[0], enfant.layers[0], visible.layers[0]], ['cache', 'enfant', 'visible']);
  assert.deepEqual([cache.faits.masque, cache.faits.ancetre], ['layer', undefined]);
  assert.deepEqual([enfant.faits.masque, enfant.faits.ancetre], ['ancetre', 'Group']);
  assert.equal('masque' in visible.faits, false);
  assert.equal(cache.correction?.apres.cle, 'bg');
});

test('E5.1 : une instance imbriquée reste une frontière, sa peinture vient de son composant principal (Q-F3-2)', () => {
  const r = releve([racine(), layer('inst', 'Glyph', 'INSTANCE', 'root', { peintures: [SOLIDE()] })]);
  assert.deepEqual(c25(r), []);
});

test('E5.1 : une valeur en dur sur un layer masqué donne un C29 qui le dit (Q-F3-1)', () => {
  const r = releve([racine(), layer('cache', 'Hidden', 'FRAME', 'root', { visible: false, valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }] })]);
  const [c29] = proposerLesCorrections(r, catalogue(), []).filter(({ code }) => code === 'C29');
  assert.equal(c29.faits.masque, 'layer');
});

// ---------------------------------------------------------------------------------------------------------------------------
// E5.3 : le nom du layer et le rôle du token

const liaison = (layerId: string, champ: string, variable: CatalogueDeReference['variables'][number]) =>
  ({ champ, indice: 0, porteur: layerId, variable: lien(variable.cle, variable.nom) });

function roleConstats(nom: string, type: string, champ: 'fills' | 'strokes', lie: CatalogueDeReference['variables'][number]): { c17: Constat[]; c24: Constat[] } {
  const r = releve([racine(), layer('cible', nom, type, 'root', { peintures: [SOLIDE(champ)], liaisons: [liaison('cible', champ, lie)] })]);
  const c17 = controlerMapping(r, TOUS).filter(({ code }) => code === 'C17');
  return { c17, c24: proposerLesCorrections(r, TOUS, c17).filter(({ code }) => code === 'C24') };
}

test('E5.3 : un layer Divider ou Separator accepte le rôle divider sur son fond comme sur son trait', () => {
  for (const nom of ['Divider', 'Separator']) for (const champ of ['fills', 'strokes'] as const) {
    assert.deepEqual(roleConstats(nom, 'RECTANGLE', champ, SEPARATEUR).c17, [], `${nom} ${champ}`);
  }
});

test('E5.3 : un layer Divider lié à un autre rôle reçoit un constat, dont la correction propose le token divider', () => {
  const { c17, c24 } = roleConstats('Divider', 'RECTANGLE', 'fills', FOND);
  assert.equal(c17.length, 1);
  assert.equal(c17[0].faits.attendu, 'divider');
  assert.equal(c24[0].correction?.apres.cle, 'dv');
  assert.equal(c24[0].correction?.avant, FOND.nom);
});

test('E5.3 : un layer Ring accepte le rôle ring sur son fond, et refuse un autre rôle', () => {
  assert.deepEqual(roleConstats('Ring', 'RECTANGLE', 'fills', ANNEAU).c17, []);
  assert.deepEqual(roleConstats('Focus ring', 'FRAME', 'strokes', ANNEAU).c17, []);
  const { c17, c24 } = roleConstats('Ring', 'RECTANGLE', 'fills', FOND);
  assert.equal(c17[0]?.faits.attendu, 'ring');
  assert.equal(c24[0]?.correction?.apres.cle, 'rg');
});

test('E5.3 : un token divider, ring ou icon posé sur un layer d’un autre nom reçoit un constat, avec le token du rôle du layer', () => {
  for (const [lie, champ] of [[SEPARATEUR, 'fills'], [ANNEAU, 'fills'], [ANNEAU, 'strokes'], [ICONE, 'fills']] as const) {
    const { c17, c24 } = roleConstats('Container', 'FRAME', champ, lie);
    assert.equal(c17.length, 1, `${lie.nom} ${champ}`);
    assert.equal(c24[0].correction?.apres.cle, champ === 'strokes' ? 'bd' : 'bg', `${lie.nom} ${champ}`);
  }
});

test('E5.3 : background, foreground, text et border ne regardent pas le nom ; inverse ne dit rien du layer', () => {
  assert.deepEqual(roleConstats('Divider', 'RECTANGLE', 'strokes', BORDURE).c17.map(({ faits }) => faits.attendu), ['divider']);
  assert.deepEqual(roleConstats('Container', 'FRAME', 'fills', FOND).c17, []);
  assert.deepEqual(roleConstats('Edge', 'FRAME', 'strokes', BORDURE).c17, []);
  assert.deepEqual(roleConstats('Label', 'TEXT', 'fills', TEXTE).c17, []);
  assert.deepEqual(roleConstats('Label', 'TEXT', 'fills', token('inv', 'button/color/sm/inverse')).c17, []);
  assert.deepEqual(roleConstats('Divider', 'TEXT', 'fills', TEXTE).c17, [], 'un texte ne désigne aucun rôle par son nom');
});

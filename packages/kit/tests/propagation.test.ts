/** La propagation depuis un variant modèle (C24) : exacte ou en question. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { proposerLaPropagation, type CatalogueDeReference, type LayerLu, type ReleveDeComposant, type VariantLu } from '../src/controles/index.js';

const NOMS = {
  infoStandard: 'alert/colors/info/standard/background',
  errorOutlined: 'alert/colors/error/outlined/background',
};

function layer(id: string, nom: string, parent: string | null, lie?: { cle: string; nom: string }): LayerLu {
  return {
    id, nom, type: 'FRAME', parent, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 },
    peintures: [{ champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' }],
    valeursEnDur: [],
    liaisons: lie ? [{ champ: 'fills', indice: 0, porteur: id, variable: { id: lie.cle, cle: lie.cle, nom: lie.nom, collection: 'components', distante: false } }] : [],
  };
}

function variant(id: string, valeurs: Record<string, string>, layers: LayerLu[]): VariantLu {
  return { id, nom: Object.entries(valeurs).map(([k, v]) => `${k}=${v}`).join(', '), valeurs, modesEffectifs: {}, layers };
}

function releve(variants: VariantLu[]): ReleveDeComposant {
  return {
    version: 1, jeu: { cle: 'alert-set', id: 'alert-set', nom: 'Alert' },
    proprietes: [
      { nom: 'Severity', type: 'VARIANT', valeurs: ['info', 'error'], defaut: 'info' },
      { nom: 'Variant', type: 'VARIANT', valeurs: ['standard', 'outlined'], defaut: 'standard' },
    ],
    variants, lecture: { layersLus: 2, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

const variable = (cle: string, nom: string) => ({ cle, nom, collection: 'components', type: 'COLOR' as const, etat: 'presente' as const });

function catalogue(variables: CatalogueDeReference['variables']): CatalogueDeReference {
  return { version: 1, library: null, collections: [{ cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' }], variables };
}

const MODELE = variant('m', { Severity: 'info', Variant: 'standard' }, [layer('m-1', 'container', null, { cle: 'k-info', nom: NOMS.infoStandard })]);
const VISE = (layers: LayerLu[]) => variant('v', { Severity: 'error', Variant: 'outlined' }, layers);
const CATALOGUE = catalogue([variable('k-info', NOMS.infoStandard), variable('k-error', NOMS.errorOutlined)]);

test('le variant visé reçoit la variable dont les segments d’axe prennent ses valeurs', () => {
  const r = releve([MODELE, VISE([layer('v-1', 'container', null)])]);
  const [constat, ...autres] = proposerLaPropagation(r, CATALOGUE, 'm');
  assert.equal(autres.length, 0);
  assert.equal(constat.code, 'C24');
  assert.equal(constat.famille, 'liaisons');
  assert.equal(constat.type, 'corriger');
  assert.deepEqual(constat.variants, ['v']);
  assert.deepEqual(constat.layers, ['v-1']);
  assert.deepEqual(constat.faits, { modele: 'Severity=info, Variant=standard', calque: 'container', champ: 'fills', indice: 0 });
  assert.equal(constat.id, 'C24:modele:v:v-1:fills:0');
  assert.equal(constat.question, undefined);
  assert.equal(constat.correction?.apres.cle, 'k-error');
  assert.equal(constat.correction?.apres.nom, NOMS.errorOutlined);
  assert.equal(constat.correction?.avant, null);
  assert.deepEqual(constat.correction?.cible, { layer: 'v-1', champ: 'fills', indice: 0 });
  assert.deepEqual(constat.correction?.aRelire.axes, { Severity: 'error', Variant: 'outlined' });
  assert.match(constat.correction?.aRelire.regle ?? '', /Severity=info, Variant=standard/);
});

test('un champ lié à une autre variable garde son nom dans avant', () => {
  const r = releve([MODELE, VISE([layer('v-1', 'container', null, { cle: 'k-info', nom: NOMS.infoStandard })])]);
  const [constat] = proposerLaPropagation(r, CATALOGUE, 'm');
  assert.equal(constat.correction?.avant, NOMS.infoStandard);
  assert.equal(constat.correction?.cible.variable, 'k-info');
});

test('un nom absent du catalogue donne une question sans réponse cochée', () => {
  const r = releve([MODELE, VISE([layer('v-1', 'container', null)])]);
  const [constat] = proposerLaPropagation(r, catalogue([variable('k-info', NOMS.infoStandard)]), 'm');
  assert.equal(constat.correction, undefined);
  assert.deepEqual(constat.question, { id: constat.id, candidats: [] });
});

test('un champ déjà lié à la variable visée ne donne aucun constat', () => {
  const r = releve([MODELE, VISE([layer('v-1', 'container', null, { cle: 'k-error', nom: NOMS.errorOutlined })])]);
  assert.deepEqual(proposerLaPropagation(r, CATALOGUE, 'm'), []);
});

test('deux candidats donnent une question', () => {
  const r = releve([MODELE, VISE([layer('v-1', 'container', null)])]);
  const [constat] = proposerLaPropagation(r, catalogue([variable('k-info', NOMS.infoStandard), variable('a', NOMS.errorOutlined), variable('b', NOMS.errorOutlined)]), 'm');
  assert.equal(constat.correction, undefined);
  assert.deepEqual(constat.question?.candidats.map(({ cle }) => cle), ['a', 'b']);
});

test('deux layers homonymes dont le rang est introuvable donnent une question', () => {
  const modele = variant('m', { Severity: 'info', Variant: 'standard' }, [
    layer('m-0', 'racine', null),
    layer('m-1', 'ligne', 'm-0', { cle: 'k-info', nom: NOMS.infoStandard }),
    layer('m-2', 'ligne', 'm-0', { cle: 'k-info', nom: NOMS.infoStandard }),
  ]);
  const vise = VISE([layer('v-0', 'racine', null), layer('v-1', 'ligne', 'v-0')]);
  const constats = proposerLaPropagation(releve([modele, vise]), CATALOGUE, 'm');
  assert.equal(constats.length, 2);
  for (const constat of constats) {
    assert.equal(constat.correction, undefined);
    assert.deepEqual(constat.question?.candidats, []);
    assert.deepEqual(constat.layers, []);
  }
});

test('le rang parmi les homonymes désigne le layer visé', () => {
  const modele = variant('m', { Severity: 'info', Variant: 'standard' }, [
    layer('m-1', 'ligne', null),
    layer('m-2', 'ligne', null, { cle: 'k-info', nom: NOMS.infoStandard }),
  ]);
  const vise = VISE([layer('v-1', 'ligne', null), layer('v-2', 'ligne', null)]);
  const [constat] = proposerLaPropagation(releve([modele, vise]), CATALOGUE, 'm');
  assert.deepEqual(constat.layers, ['v-2']);
});

test('une liaison sans segment d’axe vise la même variable', () => {
  const modele = variant('m', { Severity: 'info', Variant: 'standard' }, [layer('m-1', 'container', null, { cle: 'k-gap', nom: 'alert/layout/gap' })]);
  const vise = VISE([layer('v-1', 'container', null)]);
  const [constat] = proposerLaPropagation(releve([modele, vise]), catalogue([variable('k-gap', 'alert/layout/gap')]), 'm');
  assert.equal(constat.correction?.apres.cle, 'k-gap');
});

test('un variant modèle inconnu ne donne rien', () => {
  assert.deepEqual(proposerLaPropagation(releve([MODELE]), CATALOGUE, 'inconnu'), []);
});

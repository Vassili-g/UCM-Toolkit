/** La propagation depuis un variant modèle (C24) : exacte ou en question. */
import assert from 'node:assert/strict';
import test from 'node:test';
import { candidatsDeModele, controlerCouches, proposerLaPropagation, type CatalogueDeReference, type LayerLu, type ReleveDeComposant, type VariantLu } from '../src/controles/index.js';

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

test('un champ déjà lié à une autre variable n’est pas réécrit (Q-F3-6)', () => {
  const r = releve([MODELE, VISE([layer('v-1', 'container', null, { cle: 'k-info', nom: NOMS.infoStandard })])]);
  assert.deepEqual(proposerLaPropagation(r, CATALOGUE, 'm'), []);
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

test('deux layers homonymes sous le même parent du modèle donnent une question qui nomme les homonymes du variant visé (Q-F3-7)', () => {
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
    assert.deepEqual(constat.layers, ['v-1']);
    assert.equal(constat.faits.homonymes, 1);
    assert.equal(constat.faits.parent, 'racine');
  }
});

test('deux layers homonymes dans le variant visé donnent une question qui les nomme tous les deux (Q-F3-7)', () => {
  const modele = variant('m', { Severity: 'info', Variant: 'standard' }, [layer('m-1', 'ligne', null, { cle: 'k-info', nom: NOMS.infoStandard })]);
  const vise = VISE([layer('v-1', 'ligne', null), layer('v-2', 'ligne', null)]);
  const [constat, ...autres] = proposerLaPropagation(releve([modele, vise]), CATALOGUE, 'm');
  assert.equal(autres.length, 0);
  assert.equal(constat.correction, undefined);
  assert.deepEqual(constat.question?.candidats, []);
  assert.deepEqual(constat.layers, ['v-1', 'v-2']);
  assert.equal(constat.faits.homonymes, 2);
});

test('la question des homonymes nomme leur parent dans le variant visé', () => {
  const modele = variant('m', { Severity: 'info', Variant: 'standard' }, [
    layer('m-0', 'racine', null), layer('m-parent', 'contenu', 'm-0'),
    layer('m-ligne', 'ligne', 'm-parent', { cle: 'k-info', nom: NOMS.infoStandard }),
  ]);
  const vise = VISE([
    layer('v-0', 'racine', null), layer('v-parent', 'contenu', 'v-0'),
    layer('v-1', 'ligne', 'v-parent'), layer('v-2', 'ligne', 'v-parent'),
  ]);
  const [constat] = proposerLaPropagation(releve([modele, vise]), CATALOGUE, 'm');
  assert.equal(constat.faits.parent, 'contenu');
  assert.equal(constat.faits.homonymes, 2);
  assert.deepEqual(constat.layers, ['v-1', 'v-2']);
  assert.deepEqual(constat.question?.candidats, []);
  assert.equal(constat.correction, undefined);
});

test('un layer qui n’existe que dans un variant ne donne aucun constat, dans le modèle comme dans le variant visé (Q-F3-7)', () => {
  const modele = variant('m', { Severity: 'info', Variant: 'standard' }, [
    layer('m-1', 'container', null, { cle: 'k-info', nom: NOMS.infoStandard }),
    layer('m-2', 'badge', null, { cle: 'k-info', nom: NOMS.infoStandard }),
  ]);
  const vise = VISE([layer('v-1', 'container', null, { cle: 'k-error', nom: NOMS.errorOutlined }), layer('v-2', 'extra', null)]);
  assert.deepEqual(proposerLaPropagation(releve([modele, vise]), CATALOGUE, 'm'), []);
});

test('un layer visé sans la peinture du modèle ne donne aucun constat (Q-F3-7)', () => {
  const sansPeinture = { ...layer('v-1', 'container', null), peintures: [] };
  assert.deepEqual(proposerLaPropagation(releve([MODELE, VISE([sansPeinture])]), CATALOGUE, 'm'), []);
});

test('un champ dont la lecture a échoué ne reçoit aucune proposition et ne compte pas dans C81 (P18)', () => {
  const vise = VISE([layer('v-1', 'container', null)]);
  const lecture = { layersLus: 2, layersNonLus: 0, variantsNonLus: [], manquees: [{ layer: 'v-1', champ: 'fills', motif: 'peintures mixtes ou illisibles' }] };
  const sansLecture = { ...releve([MODELE, vise]), lecture };
  assert.deepEqual(proposerLaPropagation(sansLecture, CATALOGUE, 'm'), []);
  assert.deepEqual(candidatsDeModele(sansLecture, CATALOGUE), []);
  // Le même variant lu en entier reçoit la correction : seule la lecture manquée la retire.
  assert.equal(proposerLaPropagation(releve([MODELE, vise]), CATALOGUE, 'm').length, 1);
  assert.equal(candidatsDeModele(releve([MODELE, vise]), CATALOGUE).length, 1);
});

test('une liaison directe à theme ou un token au nom illisible n’est pas recopié (Q-F3-6)', () => {
  const modele = variant('m', { Severity: 'info', Variant: 'standard' }, [layer('m-1', 'container', null, { cle: 'k-theme', nom: 'surface/default' })]);
  const theme = { ...variable('k-theme', 'surface/default'), collection: 'theme' };
  const c = {
    ...CATALOGUE,
    collections: [...CATALOGUE.collections, { cle: 'theme', nom: 'theme', role: 'theme' as const, modes: [], etat: 'lue' as const }],
    variables: [...CATALOGUE.variables, theme],
  };
  assert.deepEqual(proposerLaPropagation(releve([modele, VISE([layer('v-1', 'container', null)])]), c, 'm'), []);
  const illisible = variant('m', { Severity: 'info', Variant: 'standard' }, [layer('m-1', 'container', null, { cle: 'k-libre', nom: 'alert/fond-libre' })]);
  assert.deepEqual(proposerLaPropagation(releve([illisible, VISE([layer('v-1', 'container', null)])]), catalogue([variable('k-libre', 'alert/fond-libre')]), 'm'), []);
});

function texte(id: string, plages: { debut: number; fin: number }[], liees: boolean): LayerLu {
  const lieeA = { id: 'k-error', cle: 'k-error', nom: NOMS.errorOutlined, collection: 'components', distante: false };
  return {
    ...layer(id, 'label', null), type: 'TEXT', peintures: [],
    liaisons: liees ? plages.map((plage) => ({ champ: 'fills', plage, porteur: id, variable: lieeA })) : [],
    texte: {
      style: null,
      plages: plages.map((plage) => ({
        ...plage, fontSize: 14, fontWeight: 500, liaisons: [],
        peintures: [{ champ: 'fills' as const, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' }],
      })),
    },
  };
}

test('une plage de texte nue reçoit une correction, une plage déjà liée aucun constat (N-09)', () => {
  const plages = [{ debut: 0, fin: 5 }, { debut: 5, fin: 10 }];
  const source = { id: 'k-info', cle: 'k-info', nom: NOMS.infoStandard, collection: 'components', distante: false };
  const modele = variant('m', { Severity: 'info', Variant: 'standard' }, [
    { ...texte('m-1', plages, false), liaisons: plages.map((plage) => ({ champ: 'fills', plage, porteur: 'm-1', variable: source })) },
  ]);
  const nue = proposerLaPropagation(releve([modele, VISE([texte('v-1', plages, false)])]), CATALOGUE, 'm');
  assert.equal(nue.length, 2);
  for (const constat of nue) {
    assert.equal(constat.question, undefined);
    assert.equal(constat.correction?.apres.cle, 'k-error');
  }
  assert.deepEqual(nue.map(({ correction }) => correction?.cible.plage), plages);
  assert.deepEqual(proposerLaPropagation(releve([modele, VISE([texte('v-1', plages, true)])]), CATALOGUE, 'm'), []);
});

test('une liaison sans segment d’axe vise la même variable', () => {
  const modele = variant('m', { Severity: 'info', Variant: 'standard' }, [layer('m-1', 'container', null, { cle: 'k-fond', nom: 'alert/colors/background' })]);
  const vise = VISE([layer('v-1', 'container', null)]);
  const [constat] = proposerLaPropagation(releve([modele, vise]), catalogue([variable('k-fond', 'alert/colors/background')]), 'm');
  assert.equal(constat.correction?.apres.cle, 'k-fond');
});

test('un variant modèle inconnu ne donne rien', () => {
  assert.deepEqual(proposerLaPropagation(releve([MODELE]), CATALOGUE, 'inconnu'), []);
});

const enDur = (n: number) => Array.from({ length: n }, (_, i) => variant(`v${i}`, { Severity: 'error', Variant: 'outlined' }, [layer(`v${i}-1`, 'container', null)]));

test('C81 : un variant lié et trois en dur donnent un constat par la section des couleurs', () => {
  const r = releve([MODELE, ...enDur(3)]);
  assert.deepEqual(candidatsDeModele(r, CATALOGUE), [{ sorte: 'couleurs', modele: 'm', layers: ['m-1'], variants: ['v0', 'v1', 'v2'], liaisons: 3, lignes: [{ layer: 'container', champ: 'fills', token: NOMS.infoStandard }] }]);
  const [constat, ...autres] = controlerCouches(r, CATALOGUE).filter(({ code }) => code === 'C81');
  assert.equal(autres.length, 0);
  assert.equal(constat.famille, 'liaisons');
  assert.equal(constat.type, 'corriger');
  assert.deepEqual(constat.faits, { modele: 'm', layers: 1, variants: 3, liaisons: 3, lignes: JSON.stringify([{ layer: 'container', champ: 'fills', token: NOMS.infoStandard }]) });
  assert.deepEqual(constat.variants, ['m']);
  assert.deepEqual(constat.layers, ['m-1']);
  assert.equal(constat.correction, undefined);
});

test('C81 : le modèle est le variant qui porte le plus de liaisons, à égalité le premier', () => {
  const deux = variant('deux', { Severity: 'info', Variant: 'standard' }, [
    layer('d-1', 'a', null, { cle: 'k-info', nom: NOMS.infoStandard }), layer('d-2', 'b', null, { cle: 'k-info', nom: NOMS.infoStandard }),
  ]);
  const vise = variant('vise', { Severity: 'error', Variant: 'outlined' }, [layer('x-1', 'a', null), layer('x-2', 'b', null)]);
  assert.equal(candidatsDeModele(releve([MODELE, deux, vise]), CATALOGUE)[0].modele, 'deux');
  const autre = variant('autre', { Severity: 'info', Variant: 'standard' }, [layer('o-1', 'a', null, { cle: 'k-info', nom: NOMS.infoStandard })]);
  assert.equal(candidatsDeModele(releve([autre, MODELE, vise]), CATALOGUE)[0].modele, 'autre');
});

test('C81 : tous les variants liés ne donnent aucun constat', () => {
  const lies = Array.from({ length: 3 }, (_, i) => variant(`v${i}`, { Severity: 'error', Variant: 'outlined' }, [layer(`v${i}-1`, 'container', null, { cle: 'k-error', nom: NOMS.errorOutlined })]));
  const r = releve([MODELE, ...lies]);
  assert.deepEqual(candidatsDeModele(r, CATALOGUE), []);
  assert.deepEqual(controlerCouches(r, CATALOGUE).filter(({ code }) => code === 'C81'), []);
});

test('C81 : aucun variant lié ne donne aucun constat', () => {
  const r = releve(enDur(3));
  assert.deepEqual(candidatsDeModele(r, CATALOGUE), []);
  assert.deepEqual(controlerCouches(r, CATALOGUE).filter(({ code }) => code === 'C81'), []);
});

test('C81 : sans liaison proposable, aucun constat', () => {
  const r = releve([MODELE, ...enDur(2)]);
  assert.deepEqual(candidatsDeModele(r, catalogue([variable('k-info', NOMS.infoStandard)])), []);
});

test('C81 : `lignes` liste un layer et son champ une fois, dans l’ordre des layers du modèle, avec le token du modèle', () => {
  const modele = variant('deux', { Severity: 'info', Variant: 'standard' }, [
    layer('d-1', 'icon', null, { cle: 'k-info', nom: NOMS.infoStandard }), layer('d-2', 'container', null, { cle: 'k-info', nom: NOMS.infoStandard }),
  ]);
  const vise = variant('vise', { Severity: 'error', Variant: 'outlined' }, [layer('x-1', 'icon', null), layer('x-2', 'container', null)]);
  const [candidat] = candidatsDeModele(releve([modele, vise]), CATALOGUE);
  assert.deepEqual(candidat.lignes, [{ layer: 'icon', champ: 'fills', token: NOMS.infoStandard }, { layer: 'container', champ: 'fills', token: NOMS.infoStandard }]);
  const [constat] = controlerCouches(releve([modele, vise]), CATALOGUE).filter(({ code }) => code === 'C81');
  assert.deepEqual(JSON.parse(String(constat.faits.lignes)), candidat.lignes);
});

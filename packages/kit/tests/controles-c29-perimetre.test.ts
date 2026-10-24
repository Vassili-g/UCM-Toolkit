import assert from 'node:assert/strict';
import test from 'node:test';
import { famillesDeLayoutAttendues } from '../src/controles/corrections.js';
import { proposerLesCorrections, type CatalogueDeReference, type LayerLu, type ReleveDeComposant } from '../src/controles/index.js';

function layer(id: string, parent: string | null, over: Partial<LayerLu> = {}): LayerLu {
  return {
    id, nom: id, type: 'FRAME', parent, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 },
    peintures: [], liaisons: [], valeursEnDur: [], ...over,
  };
}

function releve(layers: LayerLu[], manquees: ReleveDeComposant['lecture']['manquees'] = []): ReleveDeComposant {
  return {
    version: 1, jeu: { cle: 'alert-set', id: 'alert-set', nom: 'Alert' }, proprietes: [],
    variants: [{ id: 'v1', nom: 'Alert', valeurs: {}, modesEffectifs: {}, layers }],
    lecture: { layersLus: layers.length, layersNonLus: 0, variantsNonLus: [], manquees }, espaceDeCouleur: 'srgb',
  };
}

const catalogue: CatalogueDeReference = {
  version: 1, library: null,
  collections: [{ cle: 'layout', nom: 'layout', role: 'layout', modes: [], etat: 'lue' }],
  variables: [
    { cle: 'radius-13', nom: 'layout/radius/13', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 13 } } },
    { cle: 'size-8', nom: 'layout/sizing/8', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur: 8 } } },
  ],
};

const c29 = (r: ReleveDeComposant) => proposerLesCorrections(r, catalogue, []).filter(({ code }) => code === 'C29');

test('un padding à 8 sur la racine visible reste un C29 corrigé par sa variable', () => {
  const resultat = c29(releve([layer('racine', null, { valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }] })]));
  assert.equal(resultat.length, 1);
  assert.deepEqual(resultat[0].faits, { calque: 'racine', champ: 'paddingLeft', valeur: 8 });
  assert.equal(resultat[0].correction?.apres.cle, 'size-8');
});

test('un padding dans un groupe masqué ne donne aucun C29, ni sous le parent masqué ni sur le layer masqué', () => {
  const dur = { valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }] };
  const sousParent = releve([layer('racine', null), layer('groupe', 'racine', { visible: false }), layer('enfant', 'groupe', dur)]);
  assert.deepEqual(c29(sousParent), []);
  assert.deepEqual(c29(releve([layer('racine', null), layer('masque', 'racine', { visible: false, ...dur })])), []);
});

test('un rayon à 0, un padding à 0 et un strokeWeight à 0 ne donnent aucun C29', () => {
  const zeros = [{ champ: 'cornerRadius', valeur: 0 }, { champ: 'paddingTop', valeur: 0 }, { champ: 'strokeWeight', valeur: 0 }];
  assert.deepEqual(c29(releve([layer('racine', null, { valeursEnDur: zeros })])), []);
});

test('une largeur et une hauteur de la boîte calculée ne donnent aucun C29', () => {
  const boite = [{ champ: 'width', valeur: 100 }, { champ: 'height', valeur: 24 }];
  assert.deepEqual(c29(releve([layer('racine', null, { valeursEnDur: boite })])), []);
});

test('un layer d’instance sous la racine ne donne aucun C29 ; une instance racine garde le jugement', () => {
  const dur = { valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }] };
  assert.deepEqual(c29(releve([layer('racine', null), layer('icone', 'racine', { type: 'INSTANCE', ...dur })])), []);
  assert.equal(c29(releve([layer('racine', null, { type: 'INSTANCE', ...dur })])).length, 1);
});

test('un champ dont la lecture a échoué ne donne aucun C29 ; les autres champs du layer le gardent', () => {
  const r = releve(
    [layer('racine', null, { valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }, { champ: 'paddingRight', valeur: 8 }] })],
    [{ layer: 'racine', champ: 'paddingLeft', motif: 'illisible' }],
  );
  assert.deepEqual(c29(r).map(({ faits }) => faits.champ), ['paddingRight']);
});

test('un rayon par coin relève de la famille radius : constat et correction', () => {
  const coins = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];
  const r = releve([layer('racine', null, { valeursEnDur: coins.map((champ) => ({ champ, valeur: 13 })) })]);
  const resultat = c29(r);
  assert.deepEqual(resultat.map(({ faits }) => faits.champ), coins);
  for (const constat of resultat) {
    assert.equal(constat.correction?.apres.cle, 'radius-13');
    assert.equal(constat.correction?.cible.champ, constat.faits.champ);
  }
});

test('un rayon par coin n’emprunte pas une variable sizing de même valeur', () => {
  const r = releve([layer('racine', null, { valeursEnDur: [{ champ: 'topLeftRadius', valeur: 8 }] })]);
  const [constat] = c29(r);
  assert.equal(constat.correction, undefined);
  assert.deepEqual(constat.question?.candidats, []);
});

const dur8 = { valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }] };
const avecLayout = (collection: CatalogueDeReference['collections'][number] | null, variables: CatalogueDeReference['variables']): CatalogueDeReference =>
  ({ version: 1, library: null, collections: collection ? [collection] : [], variables });
const c29Avec = (cat: CatalogueDeReference) => proposerLesCorrections(releve([layer('racine', null, dur8)]), cat, []).filter(({ code }) => code === 'C29');

test('une collection layout inaccessible ou absente : C29 sans question ni correction, recherche incomplète', () => {
  for (const cat of [
    avecLayout({ cle: 'layout', nom: 'layout', role: 'layout', modes: [], etat: 'inaccessible' }, []),
    avecLayout(null, []),
  ]) {
    const [constat] = c29Avec(cat);
    assert.equal(constat.correction, undefined);
    assert.equal(constat.question, undefined);
    assert.equal(constat.faits.recherche, 'incomplete');
  }
});

test('une variable de la famille non chargée ou inaccessible : recherche incomplète ; hors famille, elle ne gêne pas', () => {
  const lue = { cle: 'layout', nom: 'layout', role: 'layout' as const, modes: [], etat: 'lue' as const };
  for (const etat of ['non-chargee', 'inaccessible'] as const) {
    const [constat] = c29Avec(avecLayout(lue, [{ cle: 'x', nom: 'layout/sizing/8', collection: 'layout', type: 'FLOAT', etat }]));
    assert.equal(constat.faits.recherche, 'incomplete');
    assert.equal(constat.question, undefined);
  }
  const [horsFamille] = c29Avec(avecLayout(lue, [{ cle: 'x', nom: 'layout/radius/8', collection: 'layout', type: 'FLOAT', etat: 'non-chargee' }]));
  assert.equal(horsFamille.faits.recherche, undefined);
  assert.deepEqual(horsFamille.question?.candidats, []);
});

test('une recherche complète sans candidat reste une question sans candidat', () => {
  const [constat] = c29Avec(catalogue);
  assert.equal(constat.faits.recherche, undefined);
  assert.equal(constat.correction?.apres.cle, 'size-8');
  const [sans] = c29Avec({ ...catalogue, variables: [catalogue.variables[0]] });
  assert.equal(sans.correction, undefined);
  assert.deepEqual(sans.question?.candidats, []);
});

test('famillesDeLayoutAttendues rend les familles des seuls constats que C29 juge', () => {
  const r = releve([layer('racine', null, { valeursEnDur: [
    { champ: 'paddingLeft', valeur: 8 }, { champ: 'topLeftRadius', valeur: 4 }, { champ: 'strokeWeight', valeur: 0 }, { champ: 'width', valeur: 9 },
  ] })]);
  assert.deepEqual(famillesDeLayoutAttendues(r).sort(), ['radius', 'sizing']);
});

test('C29 lit la famille d’une variable de layout nommée comme dans Figma, sans le nom de sa collection', () => {
  // Figma nomme `radius/13` dans la collection `layout` ; l'export en tire `layout.radius.13`.
  const lu = releve([layer('racine', null, { valeursEnDur: [{ champ: 'topLeftRadius', valeur: 13 }] })]);
  const catalogue: CatalogueDeReference = {
    version: 1, library: null,
    collections: [{ cle: 'lay', nom: 'layouts', role: 'layout', modes: [{ id: 'm', nom: 'Valeur' }], etat: 'lue' }],
    variables: [{ cle: 'r13', nom: 'radius/13', collection: 'lay', type: 'FLOAT', etat: 'presente', valeurs: { m: { valeur: 13 } } }],
  };
  const [c29] = proposerLesCorrections(lu, catalogue, []).filter(({ code }) => code === 'C29');
  assert.equal(c29?.correction?.apres.nom, 'radius/13');
});

test('un alias vers une primitive de 8 px rend C29 exact', () => {
  const cat: CatalogueDeReference = {
    version: 1, library: null,
    collections: [
      { cle: 'layout', nom: 'layout', role: 'layout', modes: [{ id: 'm', nom: 'Valeur' }], etat: 'lue' },
      { cle: 'prim', nom: 'primitives', role: 'primitives', modes: [{ id: 'p', nom: 'Valeur' }], etat: 'lue' },
    ],
    variables: [
      { cle: 'p8', nom: 'spacing/8', collection: 'prim', type: 'FLOAT', etat: 'presente', valeurs: { p: { valeur: 8 } } },
      { cle: 'md', nom: 'radius/md', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { m: { alias: 'p8' } } },
    ],
  };
  const lu = releve([layer('racine', null, { valeursEnDur: [{ champ: 'cornerRadius', valeur: 8 }] })]);
  const [constat] = proposerLesCorrections(lu, cat, []).filter(({ code }) => code === 'C29');
  assert.equal(constat.correction?.apres.cle, 'md');
  assert.equal(constat.question, undefined);
});

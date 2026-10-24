import assert from 'node:assert/strict';
import test from 'node:test';
import { clesDesTokensDeTailleAttendus, proprietesDeComposantDuChamp } from '../src/controles/corrections.js';
import { proposerLesCorrections, type CatalogueDeReference, type LayerLu, type ReleveDeComposant } from '../src/controles/index.js';
import { REGISTRE_PROPRIETES_COMPOSANT } from '../src/referentiel/architecture.js';
import { termeReconnu } from '../src/referentiel/reconnaissance.js';

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

// Depuis le lot K1, C29 ne cherche que les tokens `components` du composant ; `layout` ne fournit jamais de candidat.
const composants = { cle: 'components', nom: 'components', role: 'components' as const, modes: [], etat: 'lue' as const };
const taille = (cle: string, nom: string, valeur: number, collection = 'components'): CatalogueDeReference['variables'][number] =>
  ({ cle, nom, collection, type: 'FLOAT', etat: 'presente', valeurs: { Light: { valeur } } });

const catalogue: CatalogueDeReference = {
  version: 1, library: null,
  collections: [composants, { cle: 'layout', nom: 'layout', role: 'layout', modes: [], etat: 'lue' }],
  variables: [
    taille('radius-13', 'alert/size/radius', 13),
    taille('size-8', 'alert/size/padding-x', 8),
    // Même valeur que les tokens du composant, mais dans `layout` : jamais proposés.
    taille('layout-radius-13', 'layout/radius/13', 13, 'layout'),
    taille('layout-sizing-8', 'layout/sizing/8', 8, 'layout'),
  ],
};

const c29 = (r: ReleveDeComposant) => proposerLesCorrections(r, catalogue, []).filter(({ code }) => code === 'C29');

test('un padding à 8 sur la racine visible reste un C29 corrigé par le token du composant', () => {
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

test('un rayon par coin relève de la propriété radius : constat et correction', () => {
  const coins = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius'];
  const r = releve([layer('racine', null, { valeursEnDur: coins.map((champ) => ({ champ, valeur: 13 })) })]);
  const resultat = c29(r);
  assert.deepEqual(resultat.map(({ faits }) => faits.champ), coins);
  for (const constat of resultat) {
    assert.equal(constat.correction?.apres.cle, 'radius-13');
    assert.equal(constat.correction?.cible.champ, constat.faits.champ);
  }
});

test('un rayon par coin n’emprunte pas le token padding de même valeur', () => {
  const r = releve([layer('racine', null, { valeursEnDur: [{ champ: 'topLeftRadius', valeur: 8 }] })]);
  const [constat] = c29(r);
  assert.equal(constat.correction, undefined);
  assert.equal(constat.question, undefined);
});

const dur8 = { valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }] };
const avecComposants = (collections: CatalogueDeReference['collections'], variables: CatalogueDeReference['variables']): CatalogueDeReference =>
  ({ version: 1, library: null, collections, variables });
const c29Avec = (cat: CatalogueDeReference) => proposerLesCorrections(releve([layer('racine', null, dur8)]), cat, []).filter(({ code }) => code === 'C29');

test('une collection components inaccessible ou absente : C29 sans question ni correction, recherche incomplète', () => {
  for (const cat of [
    avecComposants([{ ...composants, etat: 'inaccessible' }], []),
    avecComposants([], []),
    // `layout` lisible ne remplace pas `components`.
    avecComposants([{ cle: 'layout', nom: 'layout', role: 'layout', modes: [], etat: 'lue' }], [taille('layout-sizing-8', 'layout/sizing/8', 8, 'layout')]),
  ]) {
    const [constat] = c29Avec(cat);
    assert.equal(constat.correction, undefined);
    assert.equal(constat.question, undefined);
    assert.equal(constat.faits.recherche, 'incomplete');
  }
});

test('un token du composant non chargé ou inaccessible : recherche incomplète ; hors propriété, il ne gêne pas', () => {
  for (const etat of ['non-chargee', 'inaccessible'] as const) {
    const [constat] = c29Avec(avecComposants([composants], [{ cle: 'x', nom: 'alert/size/padding-x', collection: 'components', type: 'FLOAT', etat }]));
    assert.equal(constat.faits.recherche, 'incomplete');
    assert.equal(constat.question, undefined);
  }
  const [horsPropriete] = c29Avec(avecComposants([composants], [{ cle: 'x', nom: 'alert/size/radius', collection: 'components', type: 'FLOAT', etat: 'non-chargee' }]));
  assert.equal(horsPropriete.faits.recherche, undefined);
  assert.equal(horsPropriete.question, undefined);
  // Le token d'un autre composant n'est pas un candidat : s'il n'est pas chargé, la recherche reste complète.
  const [autreComposant] = c29Avec(avecComposants([composants], [{ cle: 'x', nom: 'banner/size/padding-x', collection: 'components', type: 'FLOAT', etat: 'non-chargee' }]));
  assert.equal(autreComposant.faits.recherche, undefined);
});

test('une recherche complète sans candidat laisse le constat seul : ni correction ni question', () => {
  const [constat] = c29Avec(catalogue);
  assert.equal(constat.faits.recherche, undefined);
  assert.equal(constat.correction?.apres.cle, 'size-8');
  const [sans] = c29Avec({ ...catalogue, variables: catalogue.variables.filter(({ cle }) => cle !== 'size-8') });
  assert.equal(sans.correction, undefined);
  assert.equal(sans.question, undefined);
  assert.equal(sans.faits.recherche, undefined);
});

test('un token du composant qui renvoie à layout puis à une primitive de 8 px rend C29 exact, et dit sa collection', () => {
  const cat: CatalogueDeReference = {
    version: 1, library: null,
    collections: [
      { ...composants, modes: [{ id: 'm', nom: 'Valeur' }] },
      { cle: 'layout', nom: 'layout', role: 'layout', modes: [{ id: 'm', nom: 'Valeur' }], etat: 'lue' },
      { cle: 'prim', nom: 'primitives', role: 'primitives', modes: [{ id: 'p', nom: 'Valeur' }], etat: 'lue' },
    ],
    variables: [
      { cle: 'p8', nom: 'spacing/8', collection: 'prim', type: 'FLOAT', etat: 'presente', valeurs: { p: { valeur: 8 } } },
      { cle: 'md', nom: 'radius/md', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { m: { alias: 'p8' } } },
      { cle: 'rayon', nom: 'alert/size/radius', collection: 'components', type: 'FLOAT', etat: 'presente', valeurs: { m: { alias: 'md' } } },
    ],
  };
  const lu = releve([layer('racine', null, { valeursEnDur: [{ champ: 'cornerRadius', valeur: 8 }] })]);
  const [constat] = proposerLesCorrections(lu, cat, []).filter(({ code }) => code === 'C29');
  assert.deepEqual(constat.correction?.apres, { cle: 'rayon', nom: 'alert/size/radius', collection: 'components', valeur: 8 });
  assert.equal(constat.question, undefined);
});

test('un token dont le nom ne se lit pas, qui nomme un autre composant ou qui est une couleur n’est pas un candidat', () => {
  const cat = avecComposants([composants], [
    taille('autre', 'banner/size/padding-x', 8), taille('illisible', 'alert/size/fantaisie/padding-x/extra', 8),
    { ...taille('couleur', 'alert/color/padding-x', 8), type: 'COLOR' },
  ]);
  const [constat] = c29Avec(cat);
  assert.equal(constat.correction, undefined);
  assert.equal(constat.question, undefined);
});

test('les noms de propriété que C29 emploie sont ceux du registre des propriétés de components', () => {
  const champs = ['strokeWeight', 'borderWidth', 'cornerRadius', 'radius', 'topLeftRadius', 'itemSpacing', 'gap', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'];
  for (const champ of champs) {
    const noms = proprietesDeComposantDuChamp(champ);
    assert.ok(noms.length > 0, champ);
    for (const nom of noms) assert.equal(termeReconnu(REGISTRE_PROPRIETES_COMPOSANT, nom)?.id, nom, `${champ} : ${nom}`);
  }
  assert.deepEqual(proprietesDeComposantDuChamp('counterAxisSpacing'), []);
});

test('un padding de chaque côté se lie à padding-x ou au côté, jamais à l’autre axe ni au padding des quatre côtés', () => {
  const lu = (champ: string) => releve([layer('racine', null, { valeursEnDur: [{ champ, valeur: 8 }] })]);
  const cat = avecComposants([composants], [taille('x', 'alert/size/padding-x', 8), taille('y', 'alert/size/padding-y', 8), taille('tout', 'alert/size/padding', 8)]);
  const parChamp = (champ: string) => proposerLesCorrections(lu(champ), cat, []).find(({ code }) => code === 'C29')?.correction?.apres.cle;
  assert.deepEqual(['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'].map(parChamp), ['x', 'x', 'y', 'y']);
  const deuxFacons = avecComposants([composants], [taille('x', 'alert/size/padding-x', 8), taille('gauche', 'alert/size/padding-left', 8)]);
  const [question] = proposerLesCorrections(lu('paddingLeft'), deuxFacons, []).filter(({ code }) => code === 'C29');
  assert.equal(question.correction, undefined);
  assert.deepEqual(question.question?.candidats.map(({ cle }) => cle), ['x', 'gauche']);
});

function releveDeTailles(valeurs: Record<string, string>, champ: string, valeur: number, nomDuLayer = 'racine'): ReleveDeComposant {
  const lu = releve([layer('racine', null, { nom: nomDuLayer, valeursEnDur: [{ champ, valeur }] })]);
  lu.proprietes = [{ nom: 'Size', type: 'VARIANT', valeurs: ['sm', 'lg'], defaut: 'sm' }];
  lu.variants[0].valeurs = valeurs;
  return lu;
}

test('le segment de taille d’un token filtre les candidats par la valeur Size du variant', () => {
  const cat = avecComposants([composants], [taille('sm', 'alert/size/sm/border-width', 1), taille('lg', 'alert/size/lg/border-width', 1)]);
  const [sm] = proposerLesCorrections(releveDeTailles({ Size: 'sm' }, 'strokeWeight', 1), cat, []).filter(({ code }) => code === 'C29');
  assert.equal(sm.correction?.apres.cle, 'sm');
  const [lg] = proposerLesCorrections(releveDeTailles({ Size: 'lg' }, 'strokeWeight', 1), cat, []).filter(({ code }) => code === 'C29');
  assert.equal(lg.correction?.apres.cle, 'lg');
  // Un token de la taille lg ne vaut pas pour un variant sm, même à la bonne valeur.
  const seulLg = avecComposants([composants], [taille('lg', 'alert/size/lg/border-width', 1)]);
  const [sansSm] = proposerLesCorrections(releveDeTailles({ Size: 'sm' }, 'strokeWeight', 1), seulLg, []).filter(({ code }) => code === 'C29');
  assert.equal(sansSm.correction, undefined);
  assert.equal(sansSm.question, undefined);
  // Un token sans segment de taille vaut pour toutes les tailles.
  const commun = avecComposants([composants], [taille('commun', 'alert/size/border-width', 1)]);
  const [tous] = proposerLesCorrections(releveDeTailles({ Size: 'sm' }, 'strokeWeight', 1), commun, []).filter(({ code }) => code === 'C29');
  assert.equal(tous.correction?.apres.cle, 'commun');
});

test('le segment d’élément d’un token doit nommer le layer', () => {
  const cat = avecComposants([composants], [taille('icone', 'alert/size/icon/gap', 4)]);
  const gap = (nomDuLayer: string) => proposerLesCorrections(releveDeTailles({ Size: 'sm' }, 'itemSpacing', 4, nomDuLayer), cat, []).find(({ code }) => code === 'C29');
  assert.equal(gap('container')?.correction, undefined);
  assert.equal(gap('icon')?.correction?.apres.cle, 'icone');
});

test('clesDesTokensDeTailleAttendus rend les tokens FLOAT du composant dont la propriété sert un champ jugé', () => {
  const r = releve([layer('racine', null, { valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }, { champ: 'topLeftRadius', valeur: 4 }, { champ: 'width', valeur: 9 }] })]);
  const cat = avecComposants([composants], [
    taille('pad', 'alert/size/padding-x', 8), taille('rayon', 'alert/size/radius', 4), taille('trait', 'alert/size/border-width', 1),
    taille('autre', 'banner/size/padding-x', 8), taille('layout-8', 'layout/sizing/8', 8, 'layout'),
  ]);
  assert.deepEqual(clesDesTokensDeTailleAttendus(r, cat).sort(), ['pad', 'rayon']);
});

const radiusLu = (valeur: number) => releve([layer('racine', null, { valeursEnDur: [{ champ: 'cornerRadius', valeur }] })]);
// Les tokens portent tous le nom `alert/size/radius` : seule leur clé les distingue.
const catalogueDeRayons = (variables: Array<[string, Record<string, { valeur: number }>]>): CatalogueDeReference => ({
  version: 1, library: null,
  collections: [{ ...composants, modes: [{ id: 'Light', nom: 'Light' }, { id: 'Dark', nom: 'Dark' }] }],
  variables: variables.map(([cle, valeurs]) => ({ cle, nom: 'alert/size/radius', collection: 'components', type: 'FLOAT' as const, etat: 'presente' as const, valeurs })),
});
const rayon13 = (cat: CatalogueDeReference) => proposerLesCorrections(radiusLu(13), cat, []).filter(({ code }) => code === 'C29')[0];

test('sans exact, un token radius du composant à 1 px donne une question proche : aucune correction, rien de coché, la valeur du candidat', () => {
  const constat = rayon13(catalogueDeRayons([['r14', { Light: { valeur: 14 }, Dark: { valeur: 14 } }]]));
  assert.equal(constat.correction, undefined);
  assert.equal(constat.faits.proche, 1);
  assert.deepEqual(constat.question?.candidats, [{ cle: 'r14', nom: 'alert/size/radius', valeur: 14 }]);
});

test('un token de 14 px en Light et de 18 px en Dark ne donne aucun candidat proche', () => {
  const constat = rayon13(catalogueDeRayons([['r', { Light: { valeur: 14 }, Dark: { valeur: 18 } }]]));
  assert.equal(constat.faits.proche, undefined);
  assert.equal(constat.question, undefined);
});

test('un token de 16 px pour 13 px est trop loin : aucun candidat', () => {
  const constat = rayon13(catalogueDeRayons([['r16', { Light: { valeur: 16 }, Dark: { valeur: 16 } }]]));
  assert.equal(constat.faits.proche, undefined);
  assert.equal(constat.question, undefined);
});

test('un token proche de layout n’est jamais proposé, même sans aucun token du composant', () => {
  const cat = avecComposants([composants, { cle: 'layout', nom: 'layout', role: 'layout', modes: [], etat: 'lue' }], [taille('layout-14', 'layout/radius/14', 14, 'layout')]);
  const constat = rayon13(cat);
  assert.equal(constat.faits.proche, undefined);
  assert.equal(constat.question, undefined);
  assert.equal(constat.correction, undefined);
});

test('deux tokens de part et d’autre donnent deux candidats ; un exact reste une correction sans proche', () => {
  const deux = rayon13(catalogueDeRayons([['r12', { Light: { valeur: 12 } }], ['r14', { Light: { valeur: 14 } }]]));
  assert.deepEqual(deux.question?.candidats.map(({ cle, valeur }) => [cle, valeur]), [['r12', 12], ['r14', 14]]);
  const exact = rayon13(catalogueDeRayons([['r13', { Light: { valeur: 13 } }], ['r14', { Light: { valeur: 14 } }]]));
  assert.equal(exact.correction?.apres.cle, 'r13');
  assert.equal(exact.faits.proche, undefined);
});

test('la correction exacte porte la valeur lue, relue à l’écriture, et la dit dans apres', () => {
  const [constat] = c29(releve([layer('racine', null, { valeursEnDur: [{ champ: 'paddingLeft', valeur: 8 }] })]));
  assert.equal(constat.correction?.aRelire.valeur, 8);
  assert.equal(constat.correction?.apres.valeur, 8);
  assert.equal(constat.correction?.apres.collection, 'components');
});

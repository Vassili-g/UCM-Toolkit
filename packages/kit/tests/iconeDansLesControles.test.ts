/**
 * Une seule définition d'icône et d'anneau pour les contrôles (E1.3, E1.4 ; Q-F6-3, Q-F3-4, Q-F6-4, Q-F7-9, E-26).
 * C17 (mapping), C49 (accessibilité) et C66 (typographie) jugent le même layer de la même façon : l'instance d'un composant Icon,
 * l'instance qu'une propriété d'échange d'instance pilote sous un nom d'icône, un tracé dont le nom dit « icon » en mot entier.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  controlerLAccessibilite, controlerLaTypographie, controlerMapping, proposerLesCorrections,
  type CatalogueDeReference, type LayerLu, type LiaisonLue, type PeintureLue, type ReleveDeComposant,
} from '../src/controles/index.js';

const BLANC: PeintureLue = { champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: 1, g: 1, b: 1, a: 1 } };
const dims = { x: 0, y: 0, largeur: 20, hauteur: 20 };

function layer(id: string, nom: string, type: string, plus: Partial<LayerLu> = {}): LayerLu {
  return { id, nom, type, parent: 'r', visible: true, opacite: 1, dimensions: dims, peintures: [], liaisons: [], valeursEnDur: [], ...plus };
}
const racine = (): LayerLu => layer('r', 'Root', 'FRAME', { parent: null, peintures: [BLANC] });
const instance = (id: string, nom: string, composant: string, pilotee: string | null = null): LayerLu =>
  layer(id, nom, 'INSTANCE', { instanceDe: { cle: 'lib', nom: composant, distante: true, pilotee } });

function releve(layers: LayerLu[], proprietes: ReleveDeComposant['proprietes'] = []): ReleveDeComposant {
  return {
    version: 1, jeu: { cle: 'k', id: '1', nom: 'Button' }, proprietes,
    variants: [{ id: 'v', nom: 'v', valeurs: {}, layers: [racine(), ...layers], modesEffectifs: {} }],
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}
const catalogue: CatalogueDeReference = {
  version: 1, library: null,
  collections: [{ cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' }],
  variables: [
    { cle: 'icone', nom: 'button/color/primary/icon', collection: 'components', type: 'COLOR', etat: 'presente' },
    { cle: 'fond', nom: 'button/color/primary/background', collection: 'components', type: 'COLOR', etat: 'presente' },
    { cle: 'anneau', nom: 'button/color/primary/ring', collection: 'components', type: 'COLOR', etat: 'presente' },
    { cle: 'bordure', nom: 'button/color/primary/border', collection: 'components', type: 'COLOR', etat: 'presente' },
  ],
};

/** Ce que C66 et C67 disent des layers : seuls les layers jugés comme des icônes en reçoivent un. */
const iconesPourLaTypographie = (layers: LayerLu[], proprietes: ReleveDeComposant['proprietes'] = []): string[] =>
  controlerLaTypographie(releve(layers, proprietes), catalogue)
    .filter((c) => c.code === 'C66' || c.code === 'C67')
    .flatMap((c) => c.layers)
    .filter((id, rang, tous) => tous.indexOf(id) === rang).sort();

/** Les layers peints en blanc sur blanc que C49 juge comme des icônes. */
const iconesPourLAccessibilite = (layers: LayerLu[]): string[] =>
  controlerLAccessibilite(releve(layers.map((l) => ({ ...l, peintures: [BLANC] }))), catalogue, { niveau: 'AA' })
    .filter((c) => c.code === 'C49' && c.faits.usage === 'icone')
    .flatMap((c) => c.layers).sort();

/** Les layers dont le remplissage lié à un token `…/icon` n'attire pas de C17 : C17 les juge comme des icônes. */
function iconesPourLeMapping(layers: LayerLu[]): string[] {
  const lies = layers.map((l): LayerLu => ({
    ...l, liaisons: [{ champ: 'fills', indice: 0, porteur: l.id, variable: { id: 'icone', cle: 'icone', nom: 'button/color/primary/icon', collection: 'components', distante: false } } satisfies LiaisonLue],
  }));
  const refus = new Set(controlerMapping(releve(lies), catalogue).filter((c) => c.code === 'C17').flatMap((c) => c.layers));
  return lies.map((l) => l.id).filter((id) => !refus.has(id)).sort();
}

const CAS: { nom: string; layer: LayerLu; icone: boolean }[] = [
  { nom: 'une instance du composant Icon, quel que soit le nom du layer', layer: instance('a', 'Leading', 'Icon'), icone: true },
  { nom: 'une instance de l\'ensemble Icon/Chevron', layer: instance('b', 'Slot', 'Icon/Chevron'), icone: true },
  { nom: 'une instance d\'un composant sans mot d\'icône sous un nom sans mot d\'icône', layer: instance('c', 'Avatar', 'Photo'), icone: false },
  { nom: 'un VECTOR nommé Pictogram', layer: layer('d', 'Pictogram', 'VECTOR'), icone: true },
  { nom: 'un BOOLEAN_OPERATION nommé Glyph', layer: layer('e', 'Glyph', 'BOOLEAN_OPERATION'), icone: true },
  { nom: 'un VECTOR nommé Silicone', layer: layer('f', 'Silicone', 'VECTOR'), icone: false },
  { nom: 'un VECTOR de nom libre', layer: layer('g', 'Shape', 'VECTOR'), icone: false },
  { nom: 'un FRAME nommé Icon', layer: layer('h', 'Icon', 'FRAME'), icone: false },
  { nom: 'un FRAME nommé icon-container', layer: layer('i', 'icon-container', 'FRAME'), icone: false },
];

for (const { nom, layer: l, icone } of CAS) {
  test(`C66, C49 et C17 jugent pareil ${nom} : ${icone ? 'icône' : 'pas une icône'}`, () => {
    // C66 et C67 n'émettent rien pour un layer qui n'est pas une icône ; C49 ne mesure que l'icône ; C17 attend `icon` pour une icône.
    // Un tracé hors icône admet aussi `icon` (D2 du plan de la recette du Button) : C17 ne l'accuse pas, sans qu'il soit une icône.
    const traceLibre = l.type === 'VECTOR' || l.type === 'BOOLEAN_OPERATION';
    const typographie = iconesPourLaTypographie([l]).includes(l.id);
    const accessibilite = iconesPourLAccessibilite([l]).includes(l.id);
    const mapping = iconesPourLeMapping([l]).includes(l.id);
    assert.deepEqual({ typographie, accessibilite, mapping }, { typographie: icone, accessibilite: icone, mapping: icone || traceLibre });
  });
}

test('un slot d\'échange d\'instance est une icône si sa propriété ou son layer dit icône, sinon aucun C66 ni C67 (Q-F6-4)', () => {
  const proprietes: ReleveDeComposant['proprietes'] = [
    { nom: 'Icon#1:2', type: 'INSTANCE_SWAP', defaut: '1:1' }, { nom: 'Image#2:3', type: 'INSTANCE_SWAP', defaut: '1:1' },
  ];
  const parPropriete = instance('p', 'Slot', 'Chevron', 'Icon#1:2');
  const parLeLayer = instance('q', 'Trailing icon', 'Chevron', 'Slot#9:9');
  const avatar = instance('r2', 'Avatar', 'Photo', 'Image#2:3');
  assert.deepEqual(iconesPourLaTypographie([parPropriete, parLeLayer, avatar], proprietes), ['p', 'q']);
  assert.deepEqual(iconesPourLAccessibilite([parPropriete, parLeLayer, avatar]), ['p', 'q']);
});

test('C17 lit l\'instance d\'Icon que la surcharge peint : le tracé intérieur de nom libre reste une icône', () => {
  const hote = instance('hote', 'Leading', 'Icon');
  hote.liaisons = [{ champ: 'fills', indice: 0, porteur: 'hote', surcharge: { id: 'I;v', nom: 'Vector', type: 'VECTOR' }, variable: { id: 'icone', cle: 'icone', nom: 'button/color/primary/icon', collection: 'components', distante: false } }];
  assert.deepEqual(controlerMapping(releve([hote]), catalogue).filter((c) => c.code === 'C17'), []);
});

test('C17 lit aussi l’instance pilotée par un échange d’instance : son tracé intérieur nommé Vector est une icône, celui d’un composant ordinaire non', () => {
  // Un token `background` distingue les deux : une icône ne l'admet pas, un tracé hors icône l'admet (D2).
  const lie = (hote: LayerLu): LayerLu => ({
    ...hote, liaisons: [{ champ: 'fills', indice: 0, porteur: hote.id, surcharge: { id: `${hote.id};v`, nom: 'Vector', type: 'VECTOR' }, variable: { id: 'fond', cle: 'fond', nom: 'button/color/primary/background', collection: 'components', distante: false } }],
  });
  const refus = (hote: LayerLu) => controlerMapping(releve([lie(hote)]), catalogue).filter((c) => c.code === 'C17').flatMap((c) => c.layers);
  assert.deepEqual(refus(instance('p', 'Slot', 'Chevron', 'Icon#1:2')), ['p']);
  assert.deepEqual(refus(instance('q', 'Slot', 'Chevron', 'Image#2:3')), []);
  assert.deepEqual(refus(instance('r2', 'Badge', 'Badge')), []);
});

// ---------------------------------------------------------------------------------------------------------------------------
// Le Button réel : variant › .sizeWrapperButton › arrow-left-long (un seul Vector) › Vector lié à `…/foreground` par surcharge.

const AVANT = { cle: 'avant', nom: 'button/color/primary/foreground', collection: 'components', type: 'COLOR' as const, etat: 'presente' as const };
const catalogueAvecAvant: CatalogueDeReference = { ...catalogue, variables: [...catalogue.variables, AVANT] };
const liaisonDe = (cle: string): LiaisonLue['variable'] =>
  ({ id: cle, cle, nom: catalogueAvecAvant.variables.find((v) => v.cle === cle)!.nom, collection: 'components', distante: false });

type Instance = NonNullable<NonNullable<LiaisonLue['surcharge']>['instances']>[number];
const flecheDe = (instanceDe: { dessin?: boolean; visibilitePar?: string | null }): Instance =>
  ({ nom: 'arrow-left-long', type: 'INSTANCE', instanceDe: { nom: 'arrow-left-long', pilotee: null, ...instanceDe } });
const FLECHE_COMPLETE = flecheDe({ dessin: true, visibilitePar: 'Icon-Left#1261:147' });
const FLECHE_DESSIN = flecheDe({ dessin: true });
const FLECHE_VISIBLE = flecheDe({ visibilitePar: 'Icon-Left#1261:147' });
const FLECHE_NUE = flecheDe({});

function wrapper(variable: string, instances?: Instance[], champ = 'fills'): LayerLu {
  return layer('w', '.sizeWrapperButton', 'INSTANCE', {
    instanceDe: { cle: 'w', nom: '.sizeWrapperButton', distante: false, pilotee: null },
    liaisons: [{
      champ, indice: 0, porteur: 'w', variable: liaisonDe(variable),
      surcharge: { id: 'I3:152;3:429;1829:9613', nom: 'Vector', type: 'VECTOR', ...(instances ? { instances } : {}) },
    }],
  });
}

function constatsDe(hote: LayerLu) {
  const r = releve([hote]);
  const c17 = controlerMapping(r, catalogueAvecAvant).filter((c) => c.code === 'C17');
  return { c17, c24: proposerLesCorrections(r, catalogueAvecAvant, c17).filter((c) => c.code === 'C24') };
}

test('le Vector du Button, lié à foreground sous une instance de dessin pilotée par Icon-Left, ne reçoit ni C17 ni C24', () => {
  for (const fleche of [FLECHE_COMPLETE, FLECHE_DESSIN, FLECHE_VISIBLE, FLECHE_NUE]) {
    const { c17, c24 } = constatsDe(wrapper('avant', [fleche]));
    assert.deepEqual([c17.length, c24.length], [0, 0], JSON.stringify(fleche.instanceDe));
  }
  const sansInstances = constatsDe(wrapper('avant'));
  assert.deepEqual([sansInstances.c17.length, sansInstances.c24.length], [0, 0], 'un relevé sans `instances` ne dit rien de plus');
});

test('une instance montrée par Icon-Left rend le Vector peint une icône certaine : background est refusé, avec le chemin', () => {
  for (const fleche of [FLECHE_COMPLETE, FLECHE_VISIBLE]) {
    const { c17, c24 } = constatsDe(wrapper('fond', [fleche]));
    assert.equal(c17.length, 1, JSON.stringify(fleche.instanceDe));
    assert.equal(c17[0].faits.attendu, 'icon');
    assert.equal(c17[0].faits.chemin, '.sizeWrapperButton › arrow-left-long › Vector');
    assert.equal(c24[0].faits.chemin, '.sizeWrapperButton › arrow-left-long › Vector', 'C24 recopie le chemin de C17');
  }
  // Sans fait d'icône, le Vector libre admet background : aucun constat, donc aucun chemin à porter.
  assert.deepEqual(constatsDe(wrapper('fond', [FLECHE_NUE])).c17, []);
});

test('une instance faite d’un seul dessin, sans nom ni propriété d’icône, est une icône probable : son Vector admet aussi background (D1)', () => {
  // Une pointe de Tooltip est aussi un composant fait d'un tracé : le dessin seul n'accuse pas background, et ne retire pas border au trait.
  assert.deepEqual(constatsDe(wrapper('fond', [FLECHE_DESSIN])).c17, []);
  assert.deepEqual(constatsDe(wrapper('avant', [FLECHE_DESSIN])).c17, []);
  assert.deepEqual(constatsDe(wrapper('bordure', [FLECHE_DESSIN], 'strokes')).c17, []);
});

test('le chemin de C17 suit celui du layer, puis liste les instances de la plus externe à la plus interne et le calque', () => {
  const { c17 } = constatsDe(wrapper('fond', [{ nom: 'Slot', type: 'INSTANCE' }, FLECHE_COMPLETE]));
  assert.equal(c17[0].faits.chemin, '.sizeWrapperButton › Slot › arrow-left-long › Vector');
  // Sans surcharge, le chemin est celui du layer : le nom des calques, racine du variant exclue.
  const sansSurcharge = layer('s', 'Container', 'FRAME', { liaisons: [{ champ: 'fills', indice: 0, porteur: 's', variable: liaisonDe('avant') }] });
  const simple = constatsDe(sansSurcharge).c17;
  assert.equal(simple.length, 1);
  assert.equal(simple[0].faits.chemin, 'Container');
});

test('le chemin de C17 sépare deux layers de même nom sous deux parents, que le nom seul fusionnait', () => {
  const parent = (id: string, nom: string): LayerLu => layer(id, nom, 'FRAME');
  const lie = (id: string, parentId: string): LayerLu =>
    layer(id, 'Label', 'FRAME', { parent: parentId, liaisons: [{ champ: 'fills', indice: 0, porteur: id, variable: liaisonDe('avant') }] });
  const r = releve([parent('h', 'Header'), parent('f', 'Footer'), lie('a', 'h'), lie('b', 'f')]);
  const c17 = controlerMapping(r, catalogueAvecAvant).filter((c) => c.code === 'C17');
  assert.deepEqual(c17.map((c) => [c.layers[0], c.faits.chemin]).sort(), [['a', 'Header › Label'], ['b', 'Footer › Label']]);
  const c24 = proposerLesCorrections(r, catalogueAvecAvant, c17).filter((c) => c.code === 'C24');
  assert.deepEqual(c24.map((c) => c.faits.chemin).sort(), ['Footer › Label', 'Header › Label']);
});

test('le trait d’un calque à l’intérieur d’une icône admet icon et foreground, celui d’un autre calque border et foreground', () => {
  assert.deepEqual(constatsDe(wrapper('avant', [FLECHE_COMPLETE], 'strokes')).c17, []);
  assert.equal(constatsDe(wrapper('bordure', [FLECHE_COMPLETE], 'strokes')).c17[0]?.faits.attendu, 'icon');
  assert.deepEqual(constatsDe(wrapper('bordure', [FLECHE_NUE], 'strokes')).c17, []);
});

test('C49 et C66 jugent une instance montrée par Icon-Left comme une icône ; un dessin seul se mesure sans recevoir C66 ni C67 ; une instance nue n’est rien (D1)', () => {
  const comme = (fleche: Instance): LayerLu => layer('f', fleche.nom, 'INSTANCE', { instanceDe: { cle: 'lib', distante: true, ...fleche.instanceDe! } });
  for (const fleche of [FLECHE_VISIBLE, FLECHE_COMPLETE]) {
    assert.deepEqual(iconesPourLAccessibilite([comme(fleche)]), ['f'], 'C49');
    assert.deepEqual(iconesPourLaTypographie([comme(fleche)]), ['f'], 'C66');
  }
  // Une pointe de Tooltip est aussi un composant fait d'un seul tracé : C49 la mesure au seuil d'une icône, sans rien accuser d'autre, et
  // elle ne reçoit ni C66 ni C67.
  assert.deepEqual(iconesPourLAccessibilite([comme(FLECHE_DESSIN)]), ['f'], 'C49 mesure le dessin');
  assert.deepEqual(iconesPourLaTypographie([comme(FLECHE_DESSIN)]), [], 'C66 et C67 ne jugent pas le dessin');
  assert.deepEqual(iconesPourLAccessibilite([comme(FLECHE_NUE)]), []);
  assert.deepEqual(iconesPourLaTypographie([comme(FLECHE_NUE)]), []);
});

test('un anneau se reconnaît à son nom : Ring, Focus ring, focus-ring, .Ring ; pas Focus, outline ni Ring Wrapper (Q-F7-9)', () => {
  const anneau = (nom: string): LayerLu => layer(nom, nom, 'FRAME', {
    peintures: [{ ...BLANC, champ: 'strokes' }], strokeWeight: 2,
  });
  const etatFocus: ReleveDeComposant['proprietes'] = [{ nom: 'State', type: 'VARIANT', valeurs: ['default', 'focus'], defaut: 'default' }];
  const sansAnneau = (nom: string): boolean => {
    const r = releve([anneau(nom)], etatFocus);
    r.variants[0].valeurs = { State: 'focus' };
    return controlerLAccessibilite(r, catalogue, { niveau: 'AA' }).some((c) => c.id === 'C50:sans-anneau');
  };
  for (const nom of ['Ring', 'Focus ring', 'focus-ring', '.Ring']) assert.equal(sansAnneau(nom), false, nom);
  for (const nom of ['Focus', 'outline', 'Ring Wrapper']) assert.equal(sansAnneau(nom), true, nom);
});

/** Un layer au contour peint, lié par `strokes` à la variable du catalogue `cle`, dans un variant `State=focus`. */
function releveEnFocus(nom: string, cle: string | null): ReleveDeComposant {
  const l = layer(nom, nom, 'FRAME', {
    peintures: [{ ...BLANC, champ: 'strokes' }], strokeWeight: 2,
    liaisons: cle === null ? [] : [{ champ: 'strokes', indice: 0, porteur: nom, variable: { id: cle, cle, nom: `button/color/primary/${cle}`, collection: 'components', distante: false } } satisfies LiaisonLue],
  });
  const r = releve([l], [{ nom: 'State', type: 'VARIANT', valeurs: ['default', 'focus'], defaut: 'default' }]);
  r.variants[0].valeurs = { State: 'focus' };
  return r;
}
const sansAnneau = (r: ReleveDeComposant): boolean =>
  controlerLAccessibilite(r, catalogue, { niveau: 'AA' }).some((c) => c.id === 'C50:sans-anneau');

test('un layer lié à un token de rôle ring est un anneau, sous le nom qu’il porte (Q-F7-9)', () => {
  assert.equal(sansAnneau(releveEnFocus('Outline', 'anneau')), false);
  assert.equal(sansAnneau(releveEnFocus('Outline', 'bordure')), true);
  assert.equal(sansAnneau(releveEnFocus('Outline', null)), true);
  assert.equal(sansAnneau(releveEnFocus('Focus ring', null)), false);
});

test('C50 mesure le contour d’un anneau reconnu par son rôle comme un anneau, non comme un simple contour', () => {
  const usages = (r: ReleveDeComposant): unknown[] => controlerLAccessibilite(r, catalogue, { niveau: 'AA' })
    .filter((c) => c.code === 'C50' && c.faits.usage !== undefined).map((c) => c.faits.usage);
  assert.deepEqual(usages(releveEnFocus('Outline', 'anneau')), ['anneau']);
  assert.deepEqual(usages(releveEnFocus('Outline', 'bordure')), ['stroke']);
});

test('C17 attend le rôle ring d’un contour seulement sur un layer nommé Ring ou Focus ring, non sur Focus ni Ring Wrapper', () => {
  const attendu = (nom: string): unknown => {
    const r = releveEnFocus(nom, 'anneau');
    return controlerMapping(r, catalogue).find((c) => c.code === 'C17')?.faits.attendu;
  };
  assert.equal(attendu('Ring'), undefined);
  assert.equal(attendu('Focus ring'), undefined);
  assert.equal(attendu('Focus'), 'border');
  assert.equal(attendu('Ring Wrapper'), 'border');
});

test('aucun contrôle ne porte sa propre définition d\'icône ni d\'anneau', () => {
  const dossier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/controles');
  const source = (fichier: string): string => fs.readFileSync(path.join(dossier, fichier), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(source('accessibilite.ts'), /NOM_D_ANNEAU\s*=|function estIcone\b/);
  assert.doesNotMatch(source('typographie.ts'), /NOM_D_ICONE\s*=|function estIcone\b/);
  assert.doesNotMatch(source('mapping.ts'), /function estUneIcone\b|\/icon\/i/);
});

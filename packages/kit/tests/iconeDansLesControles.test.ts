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
  controlerLAccessibilite, controlerLaTypographie, controlerMapping,
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
    const typographie = iconesPourLaTypographie([l]).includes(l.id);
    const accessibilite = iconesPourLAccessibilite([l]).includes(l.id);
    const mapping = iconesPourLeMapping([l]).includes(l.id);
    assert.deepEqual({ typographie, accessibilite, mapping }, { typographie: icone, accessibilite: icone, mapping: icone });
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
  const lie = (hote: LayerLu): LayerLu => ({
    ...hote, liaisons: [{ champ: 'fills', indice: 0, porteur: hote.id, surcharge: { id: `${hote.id};v`, nom: 'Vector', type: 'VECTOR' }, variable: { id: 'icone', cle: 'icone', nom: 'button/color/primary/icon', collection: 'components', distante: false } }],
  });
  const refus = (hote: LayerLu) => controlerMapping(releve([lie(hote)]), catalogue).filter((c) => c.code === 'C17').flatMap((c) => c.layers);
  assert.deepEqual(refus(instance('p', 'Slot', 'Chevron', 'Icon#1:2')), []);
  assert.deepEqual(refus(instance('q', 'Slot', 'Chevron', 'Image#2:3')), ['q']);
  assert.deepEqual(refus(instance('r2', 'Badge', 'Badge')), ['r2']);
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

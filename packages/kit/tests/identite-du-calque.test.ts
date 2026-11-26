/**
 * D16 : un calque s'identifie par son chemin depuis la racine du variant et son rang parmi ses homonymes de même parent.
 * C21, C64 et la propagation (C24, C81) lisent la même identité, `identiteDuCalque`.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  constatsDeModele, controlerLaTypographie, controlerMapping, proposerLaPropagation,
  type CatalogueDeReference, type LayerLu, type LiaisonLue, type ReleveDeComposant, type VariantLu,
} from '../src/controles/index.js';
import { identiteDuCalque } from '../src/controles/releve.js';

const dims = { x: 0, y: 0, largeur: 20, hauteur: 20 };

function layer(id: string, nom: string, type: string, parent: string | null, plus: Partial<LayerLu> = {}): LayerLu {
  return { id, nom, type, parent, visible: true, opacite: 1, dimensions: dims, peintures: [], liaisons: [], valeursEnDur: [], ...plus };
}

const lie = (porteur: string, cle: string, nom: string, plus: Partial<LiaisonLue> = {}): LiaisonLue =>
  ({ champ: 'fills', indice: 0, porteur, variable: { id: cle, cle, nom, collection: 'components', distante: false }, ...plus });

const SOLIDE = { champ: 'fills', indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL' } as const;

function texteLie(id: string, parent: string, cle: string, nom: string): LayerLu {
  return layer(id, 'Label', 'TEXT', parent, { peintures: [SOLIDE], liaisons: [lie(id, cle, nom)] });
}

function variant(id: string, valeurs: Record<string, string>, layers: LayerLu[]): VariantLu {
  return { id, nom: Object.entries(valeurs).map(([k, v]) => `${k}=${v}`).join(', '), valeurs, modesEffectifs: {}, layers };
}

function releve(variants: VariantLu[], proprietes: Record<string, string[]>, nom = 'Card'): ReleveDeComposant {
  return {
    version: 1, jeu: { cle: nom, id: nom, nom },
    proprietes: Object.entries(proprietes).map(([nom, valeurs]) => ({ nom, type: 'VARIANT' as const, valeurs, defaut: valeurs[0] })),
    variants, lecture: { layersLus: variants.reduce((n, v) => n + v.layers.length, 0), layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

const jeton = (cle: string, nom: string): CatalogueDeReference['variables'][number] =>
  ({ cle, nom, collection: 'components', type: 'COLOR', etat: 'presente' });

function catalogue(variables: CatalogueDeReference['variables']): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: [
      { cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' },
      { cle: 'typography', nom: 'typography', role: 'typography', modes: [], etat: 'lue' },
    ],
    variables,
  };
}

const TITRE = 'card/color/foreground';
const CORPS = 'card/color/text';
const CAT_CARD = catalogue([jeton('titre', TITRE), jeton('corps', CORPS)]);

/** Root > Header > Label, Root > Body > Label, Root > Footer > Label. */
function carte(id: string, valeurs: Record<string, string>, liaisons: Record<string, [string, string]>): VariantLu {
  const racine = `${id}-root`;
  const layers = [layer(racine, `Racine ${id}`, 'COMPONENT', null)];
  for (const section of ['Header', 'Body', 'Footer']) {
    layers.push(layer(`${id}-${section}`, section, 'FRAME', racine));
    layers.push(texteLie(`${id}-${section}-label`, `${id}-${section}`, ...liaisons[section]));
  }
  return variant(id, valeurs, layers);
}

const SORTES: Record<string, [string, string]> = { Header: ['titre', TITRE], Body: ['corps', CORPS], Footer: ['corps', CORPS] };
const c21 = (r: ReleveDeComposant, c: CatalogueDeReference) => controlerMapping(r, c).filter(({ code }) => code === 'C21');

test('identiteDuCalque : la racine n’entre pas dans le chemin, le rang se compte masqués compris', () => {
  const a = variant('a', {}, [
    layer('ra', 'Racine A', 'COMPONENT', null), layer('a1', 'Label', 'TEXT', 'ra', { visible: false }), layer('a2', 'Label', 'TEXT', 'ra'),
  ]);
  const b = variant('b', {}, [layer('rb', 'Racine B', 'COMPONENT', null), layer('b1', 'Label', 'TEXT', 'rb'), layer('b2', 'Label', 'TEXT', 'rb')]);
  assert.deepEqual(identiteDuCalque(a, a.layers[2]).chemin, ['label']);
  assert.equal(identiteDuCalque(a, a.layers[2]).rang, 1, 'le second Label garde le rang 1 quand le premier est masqué');
  assert.equal(identiteDuCalque(a, a.layers[2]).cle, identiteDuCalque(b, b.layers[2]).cle, 'deux racines de noms différents ne séparent pas leurs enfants');
  assert.notEqual(identiteDuCalque(a, a.layers[1]).cle, identiteDuCalque(a, a.layers[2]).cle);
});

test('identiteDuCalque : deux parents homonymes séparent leurs enfants par leur rang', () => {
  const v = variant('a', {}, [
    layer('r', 'Racine', 'COMPONENT', null), layer('p1', 'Body', 'FRAME', 'r'), layer('p2', 'Body', 'FRAME', 'r'),
    layer('l1', 'Label', 'TEXT', 'p1'), layer('l2', 'Label', 'TEXT', 'p2'),
  ]);
  assert.deepEqual(identiteDuCalque(v, v.layers[3]).chemin, identiteDuCalque(v, v.layers[4]).chemin);
  assert.notEqual(identiteDuCalque(v, v.layers[3]).cle, identiteDuCalque(v, v.layers[4]).cle);
});

/* ---------- C21 ---------- */

test('C21 : un texte Label sous Header, Body et Footer ne se compare pas à ses homonymes d’un autre parent (C6)', () => {
  const r = releve([carte('v0', { State: 'Default' }, SORTES), carte('v1', { State: 'Hover' }, SORTES)], { State: ['Default', 'Hover'] });
  assert.deepEqual(c21(r, CAT_CARD), []);
});

test('C21 : deux layers homologues de variants différents restent comparés, et l’isolé est accusé', () => {
  const corps = (id: string, signe: [string, string]): VariantLu => variant(id, { State: id }, [
    layer(`${id}-root`, `State=${id}`, 'COMPONENT', null), layer(`${id}-Body`, 'Body', 'FRAME', `${id}-root`), texteLie(`${id}-label`, `${id}-Body`, ...signe),
  ]);
  const r = releve([corps('a', ['corps', CORPS]), corps('b', ['corps', CORPS]), corps('c', ['titre', TITRE])], { State: ['a', 'b', 'c'] });
  const constats = c21(r, CAT_CARD);
  assert.equal(constats.length, 1);
  assert.deepEqual(constats[0].variants, ['c']);
  assert.deepEqual(constats[0].layers, ['c-label']);
});

test('C21 : une majorité se compte en variants distincts, pas en liaisons d’un même variant', () => {
  const instance = (id: string, signe: string, surcharges: string[]): LayerLu => layer(id, 'Icon', 'INSTANCE', `${id}-root`, {
    liaisons: surcharges.map((n) => lie(id, signe, `card/color/${signe}`, { surcharge: { id: `${id}-path-${n}`, nom: 'Path', type: 'VECTOR' } })),
  });
  const avec = (id: string, signe: string, surcharges: string[]) => variant(id, { State: id }, [layer(`${id}-root`, 'Racine', 'COMPONENT', null), instance(id, signe, surcharges)]);
  const r = releve([avec('a', 'icon', ['1', '2']), avec('b', 'foreground', ['1'])], { State: ['a', 'b'] });
  assert.deepEqual(c21(r, catalogue([jeton('icon', 'card/color/icon'), jeton('foreground', 'card/color/foreground')])), []);
});

/* ---------- C64 ---------- */

const styleDuTexte = (id: string, parent: string, style: string): LayerLu =>
  layer(id, 'Label', 'TEXT', parent, { texte: { style, plages: [] } });

function carteTypee(id: string, layout: string, titreVisible: boolean, styleDuCorps = 'body/md'): VariantLu {
  return variant(id, { Layout: layout }, [
    layer(`${id}-root`, `Layout=${layout}`, 'COMPONENT', null),
    layer(`${id}-Header`, 'Header', 'FRAME', `${id}-root`, { visible: titreVisible }),
    styleDuTexte(`${id}-title`, `${id}-Header`, 'title/md'),
    layer(`${id}-Body`, 'Body', 'FRAME', `${id}-root`),
    styleDuTexte(`${id}-body`, `${id}-Body`, styleDuCorps),
  ]);
}

const c64 = (r: ReleveDeComposant) => controlerLaTypographie(r, catalogue([])).filter(({ code, limite }) => code === 'C64' && !limite);
const AXE_LAYOUT = { Layout: ['Compact', 'Standard', 'Expanded', 'Wide'] };

test('C64 : le corps d’un variant qui masque le titre ne se compare pas aux titres des autres (C10)', () => {
  const r = releve([carteTypee('c', 'Compact', false), carteTypee('s', 'Standard', true), carteTypee('e', 'Expanded', true)], AXE_LAYOUT);
  assert.deepEqual(c64(r), []);
});

test('C64 : deux textes homologues de variants différents restent comparés', () => {
  const r = releve([
    carteTypee('s', 'Standard', true), carteTypee('e', 'Expanded', true), carteTypee('x', 'Compact', true), carteTypee('w', 'Wide', true, 'body/lg'),
  ], AXE_LAYOUT);
  const constats = c64(r);
  assert.equal(constats.length, 1);
  assert.equal(constats[0].faits.styleLu, 'body/lg');
  assert.equal(constats[0].faits.styleAttendu, 'body/md');
  assert.deepEqual(constats[0].layers, ['w-body']);
});

/* ---------- Propagation ---------- */

const NOM_MODELE = 'progress/color/default/foreground';
const NOM_VISE = 'progress/color/hover/foreground';
const CAT_PROGRESS = catalogue([jeton('k-default', NOM_MODELE), jeton('k-hover', NOM_VISE)]);

function progress(id: string, etat: string, valeur: LayerLu): VariantLu {
  return variant(id, { State: etat }, [layer(`${id}-root`, `State=${etat}`, 'COMPONENT', null), valeur]);
}

const valeurLiee = layer('m-value', 'Value', 'RECTANGLE', 'm-root', { peintures: [SOLIDE], liaisons: [lie('m-value', 'k-default', NOM_MODELE)] });
const valeurEnDur = (parent = 'v-root', nom = 'Value') => layer('v-value', nom, 'RECTANGLE', parent, { peintures: [SOLIDE] });
const AXE_ETAT = { State: ['Default', 'Hover'] };

test('propagation : un même calque sous deux racines de variants de noms différents est son homologue (N2)', () => {
  const r = releve([progress('m', 'Default', valeurLiee), progress('v', 'Hover', valeurEnDur())], AXE_ETAT, 'Progress');
  const [constat, ...autres] = proposerLaPropagation(r, CAT_PROGRESS, 'm');
  assert.equal(autres.length, 0);
  assert.deepEqual(constat.layers, ['v-value']);
  assert.equal(constat.correction?.apres.nom, NOM_VISE);
  const modele = constatsDeModele(r, CAT_PROGRESS);
  assert.deepEqual(modele.map(({ code }) => code), ['C81']);
});

test('propagation : un layer de même nom sous un autre parent n’est pas l’homologue', () => {
  const sousCadre = (parent: string) => variant('v', { State: 'Hover' }, [
    layer('v-root', 'State=Hover', 'COMPONENT', null), layer('v-cadre', 'Cadre', 'FRAME', 'v-root'), valeurEnDur(parent),
  ]);
  const r = releve([progress('m', 'Default', valeurLiee), sousCadre('v-cadre')], AXE_ETAT, 'Progress');
  assert.deepEqual(proposerLaPropagation(r, CAT_PROGRESS, 'm'), []);
});

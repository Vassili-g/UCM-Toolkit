/**
 * Lot E8a : l'icône d'un composant est une instance d'`Icon`, son remplissage suit un token de premier plan du composant et sa
 * propriété `Size` suit la taille du variant (E8.1, Q-F6-1 option A) ; le trait d'une icône sans fill visible tient lieu de couleur
 * (E8.2, Q-F6-5) ; un slot sans mot d'icône n'est pas une icône (E8.5, Q-F6-4). Les variants s'écrivent en toutes lettres
 * (`Size=Small`), les tokens en abrégé (`sm`).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlerLaTypographie, controlerMapping,
  type CatalogueDeReference, type Constat, type LayerLu, type LiaisonLue, type PeintureLue, type ReleveDeComposant, type VariableDuCatalogue, type VariantLu,
} from '../src/controles/index.js';
import { rolesAdmisDuLayer } from '../src/controles/mapping.js';

const dims = { x: 0, y: 0, largeur: 20, hauteur: 20 };
const peinture = (champ: 'fills' | 'strokes', visible = true): PeintureLue => ({ champ, indice: 0, type: 'SOLID', visible, opacite: 1, blendMode: 'NORMAL', couleur: { r: 0, g: 0, b: 0, a: 1 } });
const jeton = (nom: string, collection = 'components'): VariableDuCatalogue => ({ cle: nom, nom, collection, type: 'COLOR', etat: 'presente' });
const liaison = (champ: string, nom: string, collection = 'components'): LiaisonLue =>
  ({ champ, indice: 0, porteur: 'icone', variable: { id: nom, cle: nom, nom, collection, distante: false } });

/** Les tokens de premier plan, d'icône et de fond de Button, par palette et par taille, plus un `foreground` du thème. */
const palettes = ['primary', 'danger'] as const;
const tailles = ['sm', 'md'] as const;
const TOKENS = palettes.flatMap((palette) => tailles.flatMap((taille) => ['foreground', 'icon', 'background'].map((role) => `button/color/${palette}/${taille}/${role}`)));
const THEME = 'neutral/surface/foreground';
const catalogue = (sansComposant = false): CatalogueDeReference => ({
  version: 1, library: null,
  collections: [
    { cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' },
    { cle: 'theme', nom: 'theme', role: 'theme', modes: [], etat: 'lue' },
  ],
  variables: [...(sansComposant ? [] : TOKENS.map((nom) => jeton(nom))), jeton(THEME, 'theme')],
});

const proprietes = (axeDeTaille = true): ReleveDeComposant['proprietes'] => [
  { nom: 'Color', type: 'VARIANT', valeurs: ['Primary', 'Danger'], defaut: 'Primary' },
  ...(axeDeTaille ? [{ nom: 'Size', type: 'VARIANT' as const, valeurs: ['Small', 'Medium'], defaut: 'Small' }] : []),
];
const VARIANTS = [['Primary', 'Small', 'primary', 'sm'], ['Primary', 'Medium', 'primary', 'md'], ['Danger', 'Small', 'danger', 'sm']] as const;

interface OptionsDIcone {
  readonly instanceDe?: LayerLu['instanceDe'];
  readonly sansInstance?: true;
  readonly type?: string;
  readonly nom?: string;
  readonly peintures?: PeintureLue[];
  /** Les liaisons de l'icône du variant, par défaut le fill lié au token `icon` du variant. */
  readonly liaisons?: (palette: string, taille: string) => LiaisonLue[];
  readonly sizeDeLInstance?: (taille: string) => string | undefined;
}

function icone(variant: readonly [string, string, string, string], options: OptionsDIcone): LayerLu {
  const [, taille, palette, abrege] = variant;
  const valeur = options.sizeDeLInstance ? options.sizeDeLInstance(taille) : taille;
  return {
    id: 'icone', nom: options.nom ?? 'Icon', type: options.type ?? 'INSTANCE', parent: 'r', visible: true, opacite: 1, dimensions: dims,
    peintures: options.peintures ?? [peinture('fills')], valeursEnDur: [],
    liaisons: (options.liaisons ?? ((p, t) => [liaison('fills', `button/color/${p}/${t}/icon`)]))(palette, abrege),
    ...(options.sansInstance ? {} : {
      instanceDe: options.instanceDe ?? { cle: 'lib', nom: 'Icon', distante: true, pilotee: null, ...(valeur === undefined ? {} : { valeurs: { Size: valeur } }) },
    }),
  };
}

function releve(options: OptionsDIcone = {}, variants: readonly (readonly [string, string, string, string])[] = VARIANTS, axeDeTaille = true): ReleveDeComposant {
  const lus: VariantLu[] = variants.map((variant) => ({
    id: variant.slice(0, 2).join('-'), nom: `Color=${variant[0]}, Size=${variant[1]}`, valeurs: { Color: variant[0], Size: variant[1] }, modesEffectifs: {},
    layers: [{ id: 'r', nom: 'Root', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: dims, peintures: [], liaisons: [], valeursEnDur: [] }, icone(variant, options)],
  }));
  return {
    version: 1, jeu: { cle: 'k', id: '1', nom: 'Button' }, proprietes: proprietes(axeDeTaille), variants: lus,
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

const c66 = (r: ReleveDeComposant, c: CatalogueDeReference = catalogue()): Constat[] => controlerLaTypographie(r, c).filter((constat) => constat.code === 'C66');
const motifs = (constats: readonly Constat[]): unknown[] => constats.map((constat) => constat.faits.motif);

test('E8.1 : une instance d\'Icon dont le fill suit le token du composant et dont Size suit le variant ne donne aucun C66', () => {
  assert.deepEqual(c66(releve()), []);
});

test('E8.1 : un token foreground du composant convient comme un token icon', () => {
  const r = releve({ liaisons: (p, t) => [liaison('fills', `button/color/${p}/${t}/foreground`)] });
  assert.deepEqual(c66(r), []);
});

test('E8.1 : une icône qui n\'est pas une instance d\'Icon est signalée, sans plus parler de library', () => {
  const vecteur = c66(releve({ type: 'VECTOR', sansInstance: true }));
  assert.deepEqual(vecteur.map(({ faits }) => faits), [{ calque: 'Icon', motif: 'pas-une-instance' }]);
  const autre = c66(releve({ instanceDe: { cle: 'lib', nom: 'Chevron', distante: true, pilotee: 'Icon#1:2' } }));
  assert.deepEqual(autre.map(({ faits }) => faits), [{ calque: 'Icon', motif: 'autre-composant', composant: 'Chevron' }]);
  const locale = c66(releve({ instanceDe: { cle: 'lib', nom: 'Icon', distante: false, pilotee: null } }));
  assert.deepEqual(locale, [], 'une instance locale d\'Icon est une instance d\'Icon');
});

test('E8.1 : Size de l\'instance qui n\'est pas la taille du variant donne taille-differente, regroupée par couple de valeurs', () => {
  const constats = c66(releve({ sizeDeLInstance: () => 'Medium' }));
  assert.deepEqual(constats.map(({ faits, variants }) => [faits.motif, faits.valeur, faits.taille, variants]), [
    ['taille-differente', 'Medium', 'Small', ['Color=Primary, Size=Small', 'Color=Danger, Size=Small']],
  ]);
});

test('E8.1 : Size écrite par son abréviation, absente, ou qui ne dit pas une taille n\'est pas jugée', () => {
  assert.deepEqual(c66(releve({ sizeDeLInstance: (taille) => (taille === 'Small' ? 'sm' : 'md') })), []);
  assert.deepEqual(c66(releve({ sizeDeLInstance: () => undefined })), []);
  assert.deepEqual(c66(releve({ sizeDeLInstance: () => '24' })), []);
  assert.deepEqual(c66(releve({ sizeDeLInstance: () => 'Medium' }, VARIANTS, false)), [], 'sans axe de taille, rien ne se compare');
});

test('E8.1 : largeur et hauteur ne se jugent plus : liées à layout ou libres, l\'icône n\'a aucun constat de taille', () => {
  const liees = c66(releve({ liaisons: (p, t) => [liaison('fills', `button/color/${p}/${t}/icon`), liaison('width', 'icon/sm', 'layout'), liaison('height', 'icon/sm', 'layout')] }));
  assert.deepEqual(liees, []);
});

test('E8.1 : un fill lié au thème ou à un fond du composant nomme le token que le variant prévoit', () => {
  const theme = c66(releve({ liaisons: () => [liaison('fills', THEME, 'theme')] }));
  assert.deepEqual(theme.map(({ faits, variants }) => [faits.motif, faits.variable, faits.attendu, variants.length]), [
    ['couleur-hors-premier-plan', THEME, undefined, 3],
  ], 'trois variants attendent trois tokens : le constat ne nomme aucun token');
  const unVariant = c66(releve({ liaisons: () => [liaison('fills', 'button/color/primary/sm/background')] }, [VARIANTS[0]]));
  assert.deepEqual(unVariant.map(({ faits }) => [faits.motif, faits.variable, faits.attendu]), [
    ['couleur-hors-premier-plan', 'button/color/primary/sm/background', 'button/color/primary/sm/foreground,button/color/primary/sm/icon'],
  ]);
});

test('E8.1 : sans fill lié, C66 dit que la couleur n\'a pas de token et nomme les tokens du variant', () => {
  const sans = c66(releve({ liaisons: () => [] }, [VARIANTS[0]]));
  assert.deepEqual(sans.map(({ faits }) => [faits.motif, faits.attendu]), [['couleur-sans-variable', 'button/color/primary/sm/foreground,button/color/primary/sm/icon']]);
  assert.deepEqual(motifs(c66(releve({ liaisons: () => [] }))), ['couleur-sans-variable'], 'un seul constat pour trois variants');
});

test('E8.1 : sans token de premier plan dans le composant, le constat ne nomme aucun token attendu', () => {
  const r = releve({ liaisons: () => [liaison('fills', THEME, 'theme')] });
  const [constat] = c66(r, catalogue(true));
  assert.equal(constat.faits.motif, 'couleur-hors-premier-plan');
  assert.equal(constat.faits.attendu, undefined);
});

test('E8.1 : un token de premier plan d\'une autre palette est l\'affaire de C15, pas de C66', () => {
  const r = releve({ liaisons: (_, t) => [liaison('fills', `button/color/danger/${t}/icon`)] }, [VARIANTS[0]]);
  assert.deepEqual(c66(r), []);
  assert.equal(controlerMapping(r, catalogue()).filter((c) => c.code === 'C15').length, 1);
});

test('E8.2 : sans fill visible, le trait lié à un token de premier plan tient lieu de couleur', () => {
  const trace = (liaisons: (p: string, t: string) => LiaisonLue[]) => releve({ peintures: [peinture('strokes')], liaisons }, [VARIANTS[0]]);
  assert.deepEqual(c66(trace((p, t) => [liaison('strokes', `button/color/${p}/${t}/foreground`)])), []);
  assert.deepEqual(motifs(c66(trace(() => []))), ['couleur-sans-variable']);
  assert.deepEqual(motifs(c66(trace(() => [liaison('strokes', THEME, 'theme')]))), ['couleur-hors-premier-plan']);
});

test('E8.2 : avec un fill visible, seul le fill porte la couleur de l\'icône', () => {
  const r = releve({ peintures: [peinture('fills'), peinture('strokes')], liaisons: (p, t) => [liaison('strokes', `button/color/${p}/${t}/border`)] }, [VARIANTS[0]]);
  assert.deepEqual(motifs(c66(r)), ['couleur-sans-variable']);
  const masque = releve({ peintures: [peinture('fills', false), peinture('strokes')], liaisons: () => [] }, [VARIANTS[0]]);
  assert.deepEqual(motifs(c66(masque)), ['couleur-sans-variable'], 'un fill masqué ne porte pas la couleur : le trait la porte, et il n\'est pas lié');
});

test('E8.2 : C17 admet icon ou foreground pour le trait d\'une icône sans fill visible, border ou foreground sinon', () => {
  const trace = (peintures: PeintureLue[]): LayerLu => ({ ...icone(VARIANTS[0], { peintures }), liaisons: [] });
  assert.deepEqual(rolesAdmisDuLayer(trace([peinture('strokes')]), 'strokes'), ['icon', 'foreground']);
  assert.deepEqual(rolesAdmisDuLayer(trace([peinture('fills', false), peinture('strokes')]), 'strokes'), ['icon', 'foreground']);
  assert.deepEqual(rolesAdmisDuLayer(trace([peinture('fills'), peinture('strokes')]), 'strokes'), ['border', 'foreground']);
  const cadre: LayerLu = { ...trace([peinture('strokes')]), type: 'FRAME', nom: 'Frame', instanceDe: undefined };
  assert.deepEqual(rolesAdmisDuLayer(cadre, 'strokes'), ['border', 'foreground']);
});

test('E8.2 : un trait d\'icône lié à un token icon ne reçoit pas de C17, sauf si un fill visible porte déjà la couleur', () => {
  const lie = (peintures: PeintureLue[]) => releve({ peintures, liaisons: (p, t) => [liaison('strokes', `button/color/${p}/${t}/icon`)] }, [VARIANTS[0]]);
  assert.deepEqual(controlerMapping(lie([peinture('strokes')]), catalogue()).filter((c) => c.code === 'C17'), []);
  assert.equal(controlerMapping(lie([peinture('fills'), peinture('strokes')]), catalogue()).filter((c) => c.code === 'C17').length, 1);
});

test('E8.5 : un slot d\'échange d\'instance sans mot d\'icône n\'est pas une icône, donc ni C66 ni C67', () => {
  const slot = (nom: string, propriete: string): LayerLu => ({ ...icone(VARIANTS[0], { nom, instanceDe: { cle: 'lib', nom: 'Photo', distante: true, pilotee: propriete } }), liaisons: [] });
  const r = releve({}, [VARIANTS[0]]);
  r.variants[0].layers.splice(1, 1, slot('Avatar', 'Image#2:3'));
  r.proprietes.push({ nom: 'Image#2:3', type: 'INSTANCE_SWAP', defaut: '1:1' });
  assert.deepEqual(controlerLaTypographie(r, catalogue()).filter((c) => c.code === 'C66' || c.code === 'C67'), []);
  r.variants[0].layers.splice(1, 1, slot('Avatar', 'Icon#2:3'));
  assert.ok(controlerLaTypographie(r, catalogue()).some((c) => c.code === 'C67'), 'la propriété dit icône : le slot en est une');
});

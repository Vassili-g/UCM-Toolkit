/** Régressions relevées par la recette Figma d'Alert et de Button : liaisons dans une instance, anneau `.Ring`, constats en double. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlerLAccessibilite, controlerMapping, controlerNommage, proposerLesCorrections,
  type CatalogueDeReference, type LayerLu, type LiaisonLue, type PeintureLue, type ReleveDeComposant, type VariantLu,
} from '../src/controles/index.js';

const solide = (champ: 'fills' | 'strokes', v = 0): PeintureLue => ({ champ, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL', couleur: { r: v, g: v, b: v, a: 1 } });
const dims = { x: 0, y: 0, largeur: 100, hauteur: 40 };

function variable(nom: string): LiaisonLue['variable'] {
  return { id: `id:${nom}`, cle: nom, nom, collection: 'components', distante: true };
}
function liaison(champ: 'fills' | 'strokes', nom: string, surcharge?: LiaisonLue['surcharge']): LiaisonLue {
  return { champ, indice: 0, porteur: 'instance', variable: variable(nom), ...(surcharge ? { surcharge } : {}) };
}
function layer(id: string, nom: string, type: string, parent: string | null, liaisons: LiaisonLue[], peintures: PeintureLue[] = []): LayerLu {
  return { id, nom, type, parent, visible: true, opacite: 1, dimensions: dims, peintures, liaisons, valeursEnDur: [] };
}
function variant(id: string, layers: LayerLu[], valeurs: Record<string, string> = {}): VariantLu {
  return { id, nom: id, valeurs, layers, modesEffectifs: {} };
}
function releve(variants: VariantLu[], proprietes: ReleveDeComposant['proprietes'] = []): ReleveDeComposant {
  return {
    version: 1, jeu: { cle: 'button', id: 'jeu', nom: 'Button' }, proprietes, variants,
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}
function catalogue(...noms: string[]): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: [{ cle: 'components', nom: 'components', role: 'components', modes: [], etat: 'lue' }],
    variables: noms.map((nom) => ({ cle: nom, nom, collection: 'components', type: 'COLOR', etat: 'presente' })),
  };
}

const FOND = 'button/color/primary/background';
const TEXTE = 'button/color/primary/foreground';

/** Le wrapper `.sizeWrapperButton` est une instance : le relevé y rattache le fond de l'instance et les surcharges du texte et de l'icône. */
function wrapper(): LayerLu {
  return layer('instance', '.sizeWrapperButton', 'INSTANCE', 'racine', [
    liaison('fills', FOND),
    liaison('fills', TEXTE, { id: 'I;texte', nom: 'Suivant', type: 'TEXT' }),
    liaison('fills', TEXTE, { id: 'I;icone', nom: 'Vector', type: 'VECTOR' }),
  ], [solide('fills', 1)]);
}

test('C17 lit le rôle du layer que la surcharge peint : un texte et une icône dans une instance prennent foreground', () => {
  const constats = controlerMapping(releve([variant('v', [layer('racine', 'Button', 'COMPONENT', null, []), wrapper()])]), catalogue(FOND, TEXTE));
  assert.deepEqual(constats.filter((constat) => constat.code === 'C17'), []);
});

test('C17 garde le fond de l’instance elle-même : un foreground posé sur son fill reste signalé', () => {
  const instance = layer('instance', '.sizeWrapperButton', 'INSTANCE', 'racine', [liaison('fills', TEXTE)]);
  const constats = controlerMapping(releve([variant('v', [layer('racine', 'Button', 'COMPONENT', null, []), instance])]), catalogue(FOND, TEXTE));
  assert.deepEqual(constats.filter((constat) => constat.code === 'C17').map(({ faits }) => faits.attendu), ['background']);
});

test('une icône admet icon et foreground, un stroke admet border et foreground', () => {
  const icone = layer('icone', 'circle-info', 'INSTANCE', 'racine', [liaison('fills', TEXTE, { id: 'I;v', nom: 'circle-info', type: 'VECTOR' })]);
  const racine = layer('racine', 'Alert', 'COMPONENT', null, [liaison('strokes', TEXTE)]);
  const constats = controlerMapping(releve([variant('v', [racine, icone])]), catalogue(TEXTE, 'button/color/primary/border'));
  assert.deepEqual(constats.filter((constat) => constat.code === 'C17'), []);
});

test('C17 : un stroke Outlined lié à foreground est admis, un background ou un anneau lié à foreground ne l’est pas', () => {
  const OUTLINED = 'button/color/info/outlined/foreground';
  const outlined = layer('racine', 'Alert', 'COMPONENT', null, [liaison('strokes', OUTLINED)]);
  assert.deepEqual(controlerMapping(releve([variant('v', [outlined])]), catalogue(OUTLINED)).filter((constat) => constat.code === 'C17'), []);
  const surFond = layer('racine', 'Alert', 'COMPONENT', null, [liaison('strokes', FOND)]);
  assert.deepEqual(controlerMapping(releve([variant('v', [surFond])]), catalogue(FOND)).filter((constat) => constat.code === 'C17').map(({ faits }) => faits.attendu), ['border']);
  const anneau = layer('ring', 'ring', 'FRAME', null, [liaison('strokes', TEXTE)]);
  assert.deepEqual(controlerMapping(releve([variant('v', [anneau])]), catalogue(TEXTE)).filter((constat) => constat.code === 'C17').map(({ faits }) => faits.attendu), ['ring']);
});

test('C17 cède la place à C24 : un écart de rôle ne se compte qu’une fois', () => {
  const racine = layer('racine', 'Alert', 'COMPONENT', null, [liaison('strokes', FOND)]);
  const lu = releve([variant('v', [racine])]);
  const cat = catalogue(FOND, 'button/color/primary/border');
  const tous = proposerLesCorrections(lu, cat, controlerMapping(lu, cat));
  assert.deepEqual(tous.filter((constat) => constat.code === 'C17' || constat.code === 'C24').map(({ code }) => code), ['C24']);
  assert.equal(tous.find((constat) => constat.code === 'C24')?.correction?.apres.nom, 'button/color/primary/border');
});

test('une correction tirée d’une surcharge vise le layer de l’instance qu’elle peint', () => {
  const instance = layer('instance', '.sizeWrapperButton', 'INSTANCE', 'racine', [
    liaison('fills', FOND, { id: 'I;texte', nom: 'Suivant', type: 'TEXT' }),
  ]);
  const lu = releve([variant('v', [layer('racine', 'Button', 'COMPONENT', null, []), instance])]);
  const cat = catalogue(FOND, TEXTE);
  const c24 = proposerLesCorrections(lu, cat, controlerMapping(lu, cat)).find((constat) => constat.code === 'C24');
  assert.equal(c24?.correction?.cible.layer, 'I;texte');
  assert.equal(c24?.correction?.apres.nom, TEXTE);
  assert.equal(c24?.faits.calque, 'Suivant');
});

test('C21 compare les liaisons d’une instance layer intérieur par layer intérieur', () => {
  const variants = ['a', 'b', 'c'].map((id) => variant(id, [layer('racine', 'Button', 'COMPONENT', null, []), { ...wrapper(), id: `instance-${id}` }]));
  assert.deepEqual(controlerMapping(releve(variants), catalogue(FOND, TEXTE)).filter((constat) => constat.code === 'C21'), []);
});

test('C10 rend un constat par segment à renommer, qui compte ses tokens', () => {
  const composant = releve([], [{ nom: 'Size', type: 'VARIANT', valeurs: ['medium'], defaut: 'medium' }]);
  const constats = controlerNommage(composant, catalogue('button/size/md/gap', 'button/size/md/padding-x', 'button/size/md/radius'));
  assert.deepEqual(constats.map(({ code, faits }) => [code, faits.segment, faits.attendu, faits.tokens]), [['C10', 'md', 'medium', 3]]);
});

test('un anneau nommé .Ring, la marque d’un layer privé, compte comme anneau de focus', () => {
  const anneau = { ...layer('ring', '.Ring', 'FRAME', 'racine', [], [solide('strokes')]), strokeWeight: 2 };
  const focus = variant('f', [layer('racine', 'Button', 'COMPONENT', null, [], [solide('fills', 1)]), anneau], { State: 'focus' });
  const lu = releve([focus], [{ nom: 'State', type: 'VARIANT', valeurs: ['default', 'focus'], defaut: 'default' }]);
  const constats = controlerLAccessibilite(lu, { version: 1, library: null, collections: [], variables: [] }, { niveau: 'AA' });
  assert.equal(constats.find((constat) => constat.id === 'C50:sans-anneau'), undefined);
});

test('le contraste ne prend pas la liaison d’un texte intérieur pour le fond de l’instance', () => {
  const blanc = { cle: 'blanc', nom: 'blanc', collection: 'c', type: 'COLOR' as const, etat: 'presente' as const, valeurs: { m: { valeur: { r: 1, g: 1, b: 1, a: 1 } } } };
  const cat: CatalogueDeReference = { version: 1, library: null, collections: [{ cle: 'c', nom: 'c', role: null, modes: [{ id: 'm', nom: 'M' }], etat: 'lue' }], variables: [blanc] };
  const instance = layer('instance', 'Chip', 'INSTANCE', 'racine', [
    { champ: 'fills', indice: 0, porteur: 'instance', variable: { ...variable('blanc'), collection: 'c' }, surcharge: { id: 'I;t', nom: 'Label', type: 'TEXT' } },
  ], [solide('fills', 0)]);
  const texte: LayerLu = {
    ...layer('t', 'Texte', 'TEXT', 'instance', []),
    texte: { style: null, plages: [{ debut: 0, fin: 4, fontSize: 14, fontWeight: 400, peintures: [solide('fills', 1)], liaisons: [] }] },
  };
  const constats = controlerLAccessibilite(releve([variant('v', [layer('racine', 'X', 'COMPONENT', null, [], [solide('fills', 1)]), instance, texte])]), cat, { niveau: 'AA' });
  // Le texte blanc se lit sur le fond noir de l'instance : 21:1, aucun manque. Avec la surcharge prise pour le fond, il serait blanc sur blanc.
  assert.equal(constats.filter((constat) => constat.code === 'C49' && !constat.limite).length, 0);
});

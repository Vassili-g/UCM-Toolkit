/** Typographie et icônes d'un composant : un cas positif et un négatif par contrôle. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  controlerLaTypographie, controlerLaTypographieParEtapes,
  type CatalogueDeReference, type LayerLu, type LiaisonLue, type ReleveDeComposant, type VariantLu,
} from '../src/controles/index';

const dims = { x: 0, y: 0, largeur: 20, hauteur: 20 };
const liaison = (champ: string, nom: string, collection: string): LiaisonLue =>
  ({ champ, porteur: 'x', variable: { id: nom, cle: `k:${nom}`, nom, collection, distante: false } });
const catalogue: CatalogueDeReference = {
  version: 1, library: null, variables: [],
  collections: [
    { cle: 'typography', nom: 'typography', role: 'typography', modes: [], etat: 'lue' },
    { cle: 'layout', nom: 'layout', role: 'layout', modes: [], etat: 'lue' },
    { cle: 'theme', nom: 'theme', role: 'theme', modes: [], etat: 'lue' },
    { cle: 'primitives', nom: 'primitives', role: 'primitives', modes: [], etat: 'lue' },
  ],
};
function texte(style: string | null, liaisons: LiaisonLue[] = []): LayerLu {
  return {
    id: `t${Math.random()}`, nom: 'message', type: 'TEXT', parent: 'r', visible: true, opacite: 1, dimensions: dims,
    peintures: [], liaisons: [], valeursEnDur: [],
    texte: { style, plages: [{ debut: 0, fin: 3, fontSize: 14, fontWeight: 400, peintures: [], liaisons }] },
  };
}
function icone(over: Partial<LayerLu> = {}, liaisons: LiaisonLue[] = [
  liaison('width', 'icon/md', 'layout'), liaison('height', 'icon/md', 'layout'), liaison('fills', 'foreground/default', 'theme'),
]): LayerLu {
  return {
    id: `i${Math.random()}`, nom: 'icon', type: 'INSTANCE', parent: 'r', visible: true, opacite: 1, dimensions: dims,
    peintures: [], liaisons, valeursEnDur: [], instanceDe: { cle: 'c', nom: 'Info', distante: true, pilotee: null }, ...over,
  };
}
const variant = (nom: string, layers: LayerLu[]): VariantLu => ({ id: nom, nom, valeurs: { Severity: nom }, layers, modesEffectifs: {} });
const releve = (variants: VariantLu[], proprietes: ReleveDeComposant['proprietes'] = []): ReleveDeComposant => ({
  version: 1, jeu: { cle: 'k', id: '1', nom: 'x-alert' }, proprietes, variants,
  lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
});
const code = (r: ReleveDeComposant, c: string, limite = false) =>
  controlerLaTypographie(r, catalogue).filter((x) => x.code === c && !!x.limite === limite);
const bien = (): LiaisonLue[] => [liaison('fontSize', 'body/small/font-size', 'typography')];

test('la typographie par étapes conserve les constats ordonnés et cède par layer', () => {
  const layers = Array.from({ length: 90 }, (_, i) => ({ ...texte(null), id: `t-${i}`, nom: `message-${i}` }));
  const r = releve([variant('a', layers)]);
  const calcul = controlerLaTypographieParEtapes(r, catalogue);
  let etapes = 0;
  let resultat = calcul.next();
  while (!resultat.done) { etapes += 1; resultat = calcul.next(); }
  assert.ok(etapes >= 90);
  assert.deepEqual(resultat.value, controlerLaTypographie(r, catalogue));
});

test('C64 : un texte sans style ni variables est signalé, un texte avec style passe', () => {
  const mauvais = code(releve([variant('a', [texte(null)])]), 'C64');
  assert.equal(mauvais[0].faits.motif, 'sans-style-ni-variables');
  assert.equal(code(releve([variant('a', [texte('Body/Small')])]), 'C64').length, 0);
  assert.equal(code(releve([variant('a', [texte(null, bien())])]), 'C64').length, 0);
});

test('C64 : un style différent de celui des autres variants unanimes est signalé, sans unanimité rien', () => {
  const trois = [variant('a', [texte('Body/Small')]), variant('b', [texte('Body/Small')]), variant('c', [texte('Body/Large')])];
  const c = code(releve(trois), 'C64');
  assert.equal(c.length, 1);
  assert.deepEqual(c[0].variants, ['c']);
  assert.equal(c[0].faits.styleAttendu, 'Body/Small');
  assert.equal(c[0].faits.styleLu, 'Body/Large');
  const partages = [variant('a', [texte('Body/Small')]), variant('b', [texte('Body/Large')]), variant('c', [texte('Body/Medium')])];
  assert.equal(code(releve(partages), 'C64').length, 0);
});

test('C65 : une taille liée à une autre collection est signalée, une liaison de typographie passe', () => {
  const mauvais = code(releve([variant('a', [texte('S', [liaison('fontSize', 'dimension/14', 'primitives')])])]), 'C65');
  assert.equal(mauvais[0].faits.collectionAttendue, 'typography');
  assert.equal(code(releve([variant('a', [texte('S', bien())])]), 'C65').length, 0);
});

test('C65 : une valeur sans liaison alors que les autres variants en ont une est signalée', () => {
  const r = releve([variant('a', [texte('S', bien())]), variant('b', [texte('S', bien())]), variant('c', [texte('S')])]);
  const c = code(r, 'C65');
  assert.equal(c.length, 1);
  assert.deepEqual(c[0].variants, ['c']);
  assert.equal(code(releve([variant('a', [texte('S')]), variant('b', [texte('S')]), variant('c', [texte('S')])]), 'C65').length, 0);
});

test('C66 : une icône qui n\'est pas une instance de la library est signalée, une instance distante passe', () => {
  const mauvais = code(releve([variant('a', [icone({ type: 'VECTOR', instanceDe: undefined })])]), 'C66');
  assert.ok(mauvais.some((c) => c.faits.motif === 'pas-une-instance'));
  assert.equal(code(releve([variant('a', [icone()])]), 'C66').length, 0);
});

test('C66 : taille et couleur hors variables d\'icône ou de premier plan sont signalées', () => {
  const l = [liaison('width', 'sizing/md', 'layout'), liaison('fills', 'background/default', 'theme')];
  const c = code(releve([variant('a', [icone({}, l)])]), 'C66').map((x) => x.faits.motif);
  assert.ok(c.includes('taille-hors-icone'));
  assert.ok(c.includes('couleur-hors-premier-plan'));
  assert.ok(code(releve([variant('a', [icone({}, [])])]), 'C66').some((x) => x.faits.motif === 'couleur-sans-variable'));
});

test('C67 : une icône pilotée par une propriété absente est signalée, sinon la limite est dite', () => {
  const pilotee = icone({ instanceDe: { cle: 'c', nom: 'Info', distante: true, pilotee: 'Icon' } });
  const absente = code(releve([variant('a', [pilotee])]), 'C67');
  assert.equal(absente[0].faits.motif, 'propriete-absente');
  const declaree = releve([variant('a', [pilotee])], [{ nom: 'Icon', type: 'INSTANCE_SWAP', defaut: 'x' }]);
  assert.equal(code(declaree, 'C67').length, 0);
  const limite = code(declaree, 'C67', true);
  assert.equal(limite[0].type, 'info');
  assert.equal(limite[0].faits.cause, 'icones-permises-non-lues');
  assert.equal(code(releve([variant('a', [icone()])]), 'C67', true)[0].faits.cause, 'icone-non-pilotee');
});

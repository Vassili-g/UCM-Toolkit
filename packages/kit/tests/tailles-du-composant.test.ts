/**
 * Lot E6 : l'égalité des longueurs à 1e-6 px près et les égalités de distance (Q-F3-11), les tokens de taille écrits `sizes` et
 * `border-radius` (Q-F3-13), un token de taille qui change de valeur entre Light et Dark (Q-F3-14). Les variants s'écrivent en toutes
 * lettres (`Size=Medium`), les tokens en abrégé (`md`).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { candidatsDeLongueur, classerLesCandidats, EGALITE_EN_PIXELS } from '../src/controles/candidatsDeLongueur.js';
import {
  controlerNommage, proposerLesCorrections,
  type CatalogueDeReference, type Constat, type LayerLu, type ReleveDeComposant, type VariableDuCatalogue,
} from '../src/controles/index.js';

const MODES = [{ id: 'l', nom: 'Light' }, { id: 'd', nom: 'Dark' }];

function layer(champ: string, valeur: number): LayerLu {
  return {
    id: 'root', nom: 'Root', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions: { x: 0, y: 0, largeur: 20, hauteur: 20 },
    peintures: [], liaisons: [], valeursEnDur: [{ champ, valeur }],
  };
}

function releve(champ: string, valeur: number): ReleveDeComposant {
  return {
    version: 1, jeu: { cle: 'card', id: 'card', nom: 'Card' },
    proprietes: [{ nom: 'Size', type: 'VARIANT', valeurs: ['Small', 'Medium'], defaut: 'Small' }],
    variants: [{ id: 'v1', nom: 'Size=Medium', valeurs: { Size: 'Medium' }, modesEffectifs: {}, layers: [layer(champ, valeur)] }],
    lecture: { layersLus: 1, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

const taille = (nom: string, valeurs: number | readonly [number, number]): VariableDuCatalogue => ({
  cle: nom, nom, collection: 'components', type: 'FLOAT', etat: 'presente',
  valeurs: typeof valeurs === 'number' ? { l: { valeur: valeurs }, d: { valeur: valeurs } } : { l: { valeur: valeurs[0] }, d: { valeur: valeurs[1] } },
});

const catalogue = (variables: VariableDuCatalogue[], modes = MODES): CatalogueDeReference => ({
  version: 1, library: null,
  collections: [{ cle: 'components', nom: 'components', role: 'components', modes, etat: 'lue' }],
  variables,
});

const c29 = (r: ReleveDeComposant, c: CatalogueDeReference): Constat[] => proposerLesCorrections(r, c, []).filter(({ code }) => code === 'C29');
const selonLeMode = (r: ReleveDeComposant, c: CatalogueDeReference): Constat[] =>
  proposerLesCorrections(r, c, []).filter(({ faits }) => faits.genre === 'taille-selon-le-mode');

test('E6.1 : une valeur et un token écartés de moins de 1e-6 px sont égaux, et la carte propose le token', () => {
  assert.equal(EGALITE_EN_PIXELS, 1e-6);
  const [constat] = c29(releve('cornerRadius', 8), catalogue([taille('card/size/md/radius', 8.0000001)]));
  assert.equal(constat.correction?.apres.nom, 'card/size/md/radius');
  assert.equal(constat.question, undefined);
});

test('E6.1 : 0,1 + 0,2 face à 0,3 est une correction, et 1e-5 px d’écart reste un token proche', () => {
  const [somme] = c29(releve('cornerRadius', 0.1 + 0.2), catalogue([taille('card/size/md/radius', 0.3)]));
  assert.equal(somme.correction?.apres.nom, 'card/size/md/radius');
  const [proche] = c29(releve('cornerRadius', 8), catalogue([taille('card/size/md/radius', 8.00001)]));
  assert.equal(proche.correction, undefined);
  assert.deepEqual(proche.question?.candidats.map(({ nom }) => nom), ['card/size/md/radius']);
});

test('E6.1 : les deux modes d’un token valent la même longueur à 1e-6 px près', () => {
  const [constat] = c29(releve('cornerRadius', 8), catalogue([taille('card/size/md/radius', [8, 8.0000005])]));
  assert.equal(constat.correction?.apres.nom, 'card/size/md/radius');
});

test('E6.1 : deux proches à égalité de distance, du même côté, sont tous deux montrés', () => {
  const [constat] = c29(releve('cornerRadius', 12), catalogue([
    taille('card/size/md/radius', 11), taille('card/size/radius', 11), taille('card/size/root/radius', 10.5),
  ]));
  assert.equal(constat.correction, undefined);
  assert.deepEqual(constat.question?.candidats.map(({ nom, valeur }) => [nom, valeur]), [['card/size/md/radius', 11], ['card/size/radius', 11]]);
});

test('E6.1 : une distance égale à 1e-6 px près est une égalité, et un côté ne garde que son meilleur sinon', () => {
  const variable = (cle: string): VariableDuCatalogue => ({ cle, nom: cle, collection: 'l', type: 'FLOAT', etat: 'presente' });
  const candidat = (cle: string, valeur: number) => ({ variable: variable(cle), parMode: { m: valeur }, exacte: valeur });
  const { exacts, proches } = classerLesCandidats([candidat('a', 11), candidat('b', 11.0000005), candidat('c', 10.5), candidat('d', 13)], 12);
  assert.deepEqual(exacts, []);
  assert.deepEqual(proches.map(({ variable: { cle } }) => cle), ['a', 'b', 'd']);
});

test('E6.1 : l’index de layout garde ses exacts à 1e-6 px près', () => {
  const layout: CatalogueDeReference = {
    version: 1, library: null, collections: [{ cle: 'layout', nom: 'layout', role: 'layout', modes: MODES, etat: 'lue' }],
    variables: [{ cle: 'r', nom: 'radius/8', collection: 'layout', type: 'FLOAT', etat: 'presente', valeurs: { l: { valeur: 8.0000001 }, d: { valeur: 8 } } }],
  };
  assert.deepEqual(candidatsDeLongueur(layout, 'radius', 8).exacts.map(({ cle }) => cle), ['r']);
});

test('E6.2 : la famille `sizes` et la propriété `border-radius` sont lues, le token est candidat', () => {
  const [rayon] = c29(releve('cornerRadius', 8), catalogue([taille('card/sizes/md/border-radius', 8)]));
  assert.equal(rayon.correction?.apres.nom, 'card/sizes/md/border-radius');
  const [ecart] = c29(releve('itemSpacing', 12), catalogue([taille('card/sizes/md/gap', 12)]));
  assert.equal(ecart.correction?.apres.nom, 'card/sizes/md/gap');
});

test('E6.2 : C8 demande d’écrire `size` et `radius` pour une famille `sizes` et une propriété `border-radius`', () => {
  const r = releve('cornerRadius', 8);
  const c = catalogue([taille('card/sizes/md/border-radius', 8), taille('card/sizes/sm/gap', 4), taille('card/size/md/radius', 8)]);
  const c8 = controlerNommage(r, c).filter(({ code }) => code === 'C8');
  assert.deepEqual(c8.map(({ faits }) => [faits.segment, faits.attendu, faits.tokens]).sort(), [['border-radius', 'radius', 1], ['sizes', 'size', 2]]);
  assert.ok(c8.every(({ type }) => type === 'corriger'));
  assert.deepEqual(controlerNommage(r, catalogue([taille('card/size/md/radius', 8)])).filter(({ code }) => code === 'C8'), []);
});

test('E6.3 : un token de taille qui change entre Light et Dark donne un constat à faire, sans correction ni case cochée', () => {
  const constats = selonLeMode(releve('paddingLeft', 16), catalogue([taille('card/size/md/padding-x', [16, 20])]));
  assert.equal(constats.length, 1);
  const [constat] = constats;
  assert.equal(constat.code, 'C63');
  assert.equal(constat.type, 'corriger');
  assert.equal(constat.correction, undefined);
  assert.equal(constat.question, undefined);
  assert.deepEqual(
    [constat.faits.variable, constat.faits.modeClair, constat.faits.valeurClair, constat.faits.modeSombre, constat.faits.valeurSombre],
    ['card/size/md/padding-x', 'Light', 16, 'Dark', 20],
  );
});

test('E6.3 : le token à valeur divergente n’est pas proposé pour C29, et deux valeurs égales ne donnent aucun constat', () => {
  const [constat] = c29(releve('paddingLeft', 16), catalogue([taille('card/size/md/padding-x', [16, 20])]));
  assert.equal(constat.correction, undefined);
  assert.equal(constat.question, undefined);
  assert.deepEqual(selonLeMode(releve('paddingLeft', 16), catalogue([taille('card/size/md/padding-x', 16)])), []);
  assert.deepEqual(selonLeMode(releve('paddingLeft', 16), catalogue([taille('card/size/md/padding-x', [16, 16.0000005])])), []);
});

test('E6.3 : seuls les modes Light et Dark comptent ; un token non chargé ou sans valeur ne prouve rien', () => {
  const autresModes = catalogue([taille('card/size/md/padding-x', [16, 20])], [{ id: 'l', nom: 'Default' }, { id: 'd', nom: 'Comfortable' }]);
  assert.deepEqual(selonLeMode(releve('paddingLeft', 16), autresModes), []);
  assert.deepEqual(selonLeMode(releve('paddingLeft', 16), catalogue([{ ...taille('card/size/md/padding-x', [16, 20]), etat: 'non-chargee' }])), []);
  assert.deepEqual(selonLeMode(releve('paddingLeft', 16), catalogue([{ ...taille('card/size/md/padding-x', [16, 20]), valeurs: undefined }])), []);
});

/**
 * Loi : une valeur d'axe d'un variant correspond à un segment de token par `memeValeurDAxe`, et un token appartient
 * au composant par `estDuComposant`. Les contrôles ne recopient ni l'une ni l'autre.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { estDuComposant, memeValeurDAxe } from '../src/controles/nommage.js';
import {
  controlerMapping, controlerNommage, controlerOublis,
  type CatalogueDeReference, type ReleveDeComposant, type VariantLu,
} from '../src/controles/index.js';

const DOSSIER = new URL('../src/controles/', import.meta.url);

test('memeValeurDAxe : égalité de forme, puis même terme reconnu des deux côtés', () => {
  assert.equal(memeValeurDAxe('palette', 'Danger', 'Error'), true);
  assert.equal(memeValeurDAxe('etat', 'Pressed', 'press'), true);
  assert.equal(memeValeurDAxe('etat', 'Zorglub', 'Bidule'), false);
  assert.equal(memeValeurDAxe('taille', 'Big', 'Huge'), false);
});

test('memeValeurDAxe : la même forme inconnue reste égale, un axe sans registre ne reconnaît que la forme', () => {
  assert.equal(memeValeurDAxe('etat', 'Zorglub', 'zorglub'), true);
  assert.equal(memeValeurDAxe('style', 'IconLeft', 'icon-left'), true);
  assert.equal(memeValeurDAxe('style', 'Outlined', 'Filled'), false);
});

test('estDuComposant : le premier segment a la forme du nom du jeu, quelle que soit son écriture', () => {
  assert.equal(estDuComposant('Button/Color/Primary/Background', 'Button'), true);
  assert.equal(estDuComposant('button/color/primary/background', 'Button'), true);
  assert.equal(estDuComposant('icon-button/color/background', 'IconButton'), true);
  assert.equal(estDuComposant('Button', 'button'), true);
  assert.equal(estDuComposant('ButtonGroup/Color/Background', 'Button'), false);
  assert.equal(estDuComposant('Alert/Color/Background', 'Button'), false);
});

const axe = (nom: string, valeurs: string[]): ReleveDeComposant['proprietes'][number] => ({ nom, type: 'VARIANT', valeurs, defaut: valeurs[0] });

function variant(id: string, valeurs: Record<string, string>, cle: string): VariantLu {
  return {
    id, nom: id, valeurs, modesEffectifs: {}, layers: [{
      id: `layer-${id}`, nom: 'container', type: 'FRAME', parent: null, visible: true, opacite: 1,
      dimensions: { x: 0, y: 0, largeur: 100, hauteur: 40 }, peintures: [], valeursEnDur: [],
      liaisons: [{ champ: 'fills', indice: 0, porteur: `layer-${id}`, variable: { id: cle, cle, nom: cle, collection: 'composants', distante: false } }],
    }],
  };
}

function releve(proprietes: ReleveDeComposant['proprietes'], variants: VariantLu[]): ReleveDeComposant {
  return {
    version: 1, jeu: { cle: 'Button', id: 'Button', nom: 'Button' }, proprietes, variants,
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

function catalogue(...noms: string[]): CatalogueDeReference {
  return {
    version: 1, library: null,
    collections: [{ cle: 'composants', nom: 'components', role: 'components', modes: [], etat: 'lue' }],
    variables: noms.map((nom, rang) => ({ cle: `v${rang}`, nom, collection: 'composants', type: 'COLOR', etat: 'presente' })),
  };
}

const codesDesLecteurs = (r: ReleveDeComposant, c: CatalogueDeReference): string[] =>
  [...controlerNommage(r, c), ...controlerMapping(r, c), ...controlerOublis(r, c)].map(({ code }) => code);

test('un jeu Color=Error lié à Color/Danger/… ne rend ni C7, ni C15, ni C17, ni C18, ni C32, ni C33', () => {
  const r = releve([axe('Color', ['Error'])], [variant('error', { Color: 'Error' }, 'v0')]);
  const c = catalogue('Button/Color/Danger/Background');
  assert.deepEqual(codesDesLecteurs(r, c), []);
});

test('un jeu dont la palette n’est écrite par aucun terme reconnu garde ses constats', () => {
  const r = releve([axe('Color', ['Zorglub'])], [variant('zorglub', { Color: 'Zorglub' }, 'v0')]);
  const c = catalogue('Button/Color/Danger/Background');
  const codes = codesDesLecteurs(r, c);
  assert.ok(codes.includes('C7'), codes.join(','));
});

test('C7 signale une valeur d’état inconnue quand les tokens portent un autre état inconnu', () => {
  const r = releve([axe('State', ['Zorglub', 'Bidule'])], []);
  const c = catalogue('Button/Color/Primary/Bidule/Background');
  assert.deepEqual(controlerNommage(r, c).filter(({ code }) => code === 'C7').map(({ faits }) => faits.valeur), ['Zorglub']);
});

test('aucun contrôle hors de nommage.ts ne recopie la comparaison d’axe ni l’appartenance au composant', () => {
  const interdits: [string, RegExp][] = [
    ['registre d’axe choisi en ligne', /axe === 'etat' \? REGISTRE_/],
    ['premier segment comparé au jeu', /formeReconnue\([^)]*split\('\/'\)\[0\]\)/],
  ];
  const fautifs: string[] = [];
  for (const fichier of readdirSync(DOSSIER).filter((nom) => nom.endsWith('.ts') && nom !== 'nommage.ts')) {
    readFileSync(new URL(fichier, DOSSIER), 'utf8').split(/\r?\n/).forEach((ligne, rang) => {
      for (const [nom, motif] of interdits) if (motif.test(ligne)) fautifs.push(`${fichier}:${rang + 1} ${nom}`);
    });
  }
  assert.deepEqual(fautifs, []);
});

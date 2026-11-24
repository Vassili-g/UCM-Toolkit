/** Les fonds par défaut et les numéros de nuance : ce que le moteur écrit, le référentiel le reconnaît (PP-406, PP-407). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { BORNES_DES_CRANS_LIBRES, CRANS, SEUIL_DE_PALETTE, naturesDesNoms, type NomLu } from '@ucm-kit/core/referentiel';

import {
  couleurDeLaCarte,
  courbesParDefaut,
  ecrireHexa,
  intensitesDe,
  rampeDe,
  rampesDe,
  recetteParDefaut,
  validerRecette,
  TEXTE_DES_BOUTONS_PAR_DEFAUT,
  type Recette,
} from '../src/index';
import { copie, paletteTailwind, recetteAvec } from './fabrique';

test('Y4 : les fonds par défaut sont le cran 50 d’un gris pur de chaque thème, et la carte Dark son cran 100', () => {
  const gris = paletteTailwind('p-0000000a', '#808080');
  const recette = recetteAvec(gris);
  const rampes = rampesDe(recette, gris);
  for (const intensite of intensitesDe(gris)) {
    const { light, dark } = rampeDe(rampes, intensite);
    assert.equal(recetteParDefaut().fonds.light, light[0].hexa, `Light, ${intensite}`);
    assert.equal(recetteParDefaut().fonds.dark, dark[0].hexa, `Dark, ${intensite}`);
    assert.equal(ecrireHexa(couleurDeLaCarte(recetteParDefaut(), 'dark')), dark[1].hexa, `carte Dark, ${intensite}`);
  }
  assert.equal(CRANS[0], 50);
  assert.equal(CRANS[1], 100);
});

/** Les listes de nuances qu'une recette valide porte : les deux préréglages, puis des listes libres de 4, 11 et 13 numéros. */
const LISTES_LIBRES: readonly (readonly number[])[] = [
  [50, 100, 150, 200],
  Array.from({ length: 11 }, (_, rang) => 50 + rang * 100),
  Array.from({ length: BORNES_DES_CRANS_LIBRES.nombre[1] }, (_, rang) => BORNES_DES_CRANS_LIBRES.premier + rang * BORNES_DES_CRANS_LIBRES.pas),
  Array.from({ length: BORNES_DES_CRANS_LIBRES.nombre[1] }, (_, rang) => BORNES_DES_CRANS_LIBRES.dernier - rang * BORNES_DES_CRANS_LIBRES.pas).reverse(),
];

/** Les noms que Palettes écrit pour une palette : un par numéro et par thème, avec ou sans la marque `palette`. */
function nomsDeLaPalette(numeros: readonly number[], declaree: boolean): NomLu[] {
  const collection: NomLu = { id: 'collection-primitives', categorie: 'collections', portee: 'document', nom: 'primitives' };
  return [collection, ...['light', 'dark'].flatMap((theme) => numeros.map((numero): NomLu => ({
    id: `variable-${theme}-${numero}`,
    categorie: 'variables',
    portee: collection.id,
    nom: `color/Titanium/${theme}/${numero}`,
    ...(declaree ? { palette: 'p-0000000a' } : {}),
  })))];
}

test('Y5 : chaque liste de nuances que validerRecette accepte donne la nature palette à son nom', () => {
  const onze = recetteParDefaut();
  const treize: Recette = { ...onze, crans: [...CRANS, 1000, 1050], courbes: courbesParDefaut(13, TEXTE_DES_BOUTONS_PAR_DEFAUT) };
  const acceptees = [
    onze.crans,
    treize.crans,
    ...LISTES_LIBRES.map((crans) => {
      const recette = copie(recetteAvec(paletteTailwind('p-0000000a', '#1E6FD9', { crans })));
      assert.ok('recette' in validerRecette(recette), `validerRecette refuse ${crans.join(', ')}`);
      return crans;
    }),
  ];
  assert.ok(acceptees.some((crans) => crans.includes(150) && crans.includes(1050)), 'la liste 50, 150, …, 1050 est testée');
  for (const crans of acceptees) {
    for (const declaree of [true, false]) {
      if (!declaree && crans.length < SEUIL_DE_PALETTE) continue;
      const noms = nomsDeLaPalette(crans, declaree);
      const natures = naturesDesNoms(noms);
      for (const nom of noms.filter((candidat) => candidat.categorie === 'variables')) {
        assert.deepEqual(natures.get(nom.id), [null, 'palette', null, null], `${nom.nom}, liste ${crans.join(', ')}, ${declaree ? 'déclarée' : 'détectée'}`);
      }
    }
  }
});

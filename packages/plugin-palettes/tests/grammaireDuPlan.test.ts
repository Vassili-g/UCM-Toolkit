/** La grammaire du kit reconnaît chaque nom que `planDesVariables` écrit sur la destination de référence (lot 6, décisions D1 et D7). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { DESTINATION_DES_PALETTES, porteeDeLaGrammaire, reconnaitreLeChemin, type RoleDeSegment } from '@ucm-kit/core/referentiel';
import { grilleAuPrereglage, recetteParDefaut, type NombreDeNuances, type Palette, type Recette } from 'ucm-couleur';

import { ajouter, nouvellePalette } from '../src/edition';
import { DESTINATION_PAR_DEFAUT, segmentsDuGroupe, type Destination } from '../src/variables/destination';
import { planDesVariables } from '../src/variables/plan';

const VIDE = recetteParDefaut();

function recetteDe(nombre: NombreDeNuances, intensites: 1 | 2): { readonly recette: Recette; readonly palette: Palette } {
  const palette: Palette = { ...nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9', intensites)!, nom: 'Ocean' };
  return { recette: ajouter({ ...VIDE, ...grilleAuPrereglage(VIDE, nombre) }, palette), palette };
}

const FORMES = {
  chemin: { 1: 'primitives:color/palette/theme/cran', 2: 'primitives:color/palette/intensite/theme/cran' },
  modes: { 1: 'primitives:color/palette/cran', 2: 'primitives:color/palette/intensite/cran' },
} as const;
const ROLES: Readonly<Record<'chemin' | 'modes', Readonly<Record<1 | 2, readonly RoleDeSegment[]>>>> = {
  chemin: { 1: ['famille', 'palette', 'theme', 'cran'], 2: ['famille', 'palette', 'intensite', 'theme', 'cran'] },
  modes: { 1: ['famille', 'palette', 'cran'], 2: ['famille', 'palette', 'intensite', 'cran'] },
};

for (const themes of ['chemin', 'modes'] as const) for (const intensites of [1, 2] as const) for (const nombre of [11, 13] as const) {
  test(`la grammaire reconnaît le plan de la destination de référence : ${intensites} intensité, ${nombre} nuances, thèmes ${themes === 'chemin' ? 'dans le chemin' : 'en modes'}`, () => {
    const { recette, palette } = recetteDe(nombre, intensites);
    const destination: Destination = { ...DESTINATION_PAR_DEFAUT, themes };
    const plan = planDesVariables(recette, palette, destination);
    assert.equal(plan.length, 2 * intensites * nombre);
    assert.equal(porteeDeLaGrammaire(DESTINATION_DES_PALETTES.collection, segmentsDuGroupe(destination.groupe)!), 'reference');
    const refus: string[] = [];
    for (const entree of plan) {
      const reconnu = reconnaitreLeChemin('primitives', entree.nom.split('/'), destination);
      if (!reconnu.conforme) { refus.push(`${entree.nom} : ${JSON.stringify(reconnu)}`); continue; }
      assert.equal(reconnu.forme, FORMES[themes][intensites], entree.nom);
      assert.deepEqual(reconnu.segments.map((segment) => segment.role), ROLES[themes][intensites], entree.nom);
    }
    assert.deepEqual(refus, []);
  });
}

test('1000 et 1050 de la palette à treize nuances sont des numéros de palette', () => {
  const { recette, palette } = recetteDe(13, 2);
  const noms = planDesVariables(recette, palette, DESTINATION_PAR_DEFAUT).map((entree) => entree.nom);
  for (const nom of ['color/Ocean/soft/light/1000', 'color/Ocean/vivid/dark/1050']) assert.ok(noms.includes(nom), nom);
});

test('une sortie libre a la portée libre : la grammaire ne la juge pas', () => {
  const { recette, palette } = recetteDe(11, 2);
  for (const [collection, groupe] of [['Autre', 'color'], ['primitives', 'palettes'], ['primitives', ''], ['primitives', 'colors'], ['primitives', 'brand/color']] as const) {
    const destination: Destination = { collection: { nom: collection }, groupe, themes: 'chemin' };
    assert.equal(porteeDeLaGrammaire(collection, segmentsDuGroupe(groupe)!), 'libre', `${collection}/${groupe}`);
    assert.ok(planDesVariables(recette, palette, destination).length > 0, `${collection}/${groupe} reste écrit tel quel`);
  }
});

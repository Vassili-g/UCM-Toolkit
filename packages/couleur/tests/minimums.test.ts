/** Les minimums de contraste : leurs bornes, le verdict que chaque juge en tire et leur effet sur les rampes (PP-402, PP-403). */
import assert from 'node:assert/strict';
import test from 'node:test';

import { controlerLAccessibilite, type CatalogueDeReference, type LayerLu, type ReleveDeComposant } from '@ucm-kit/core/controles';
import { CONTRACT_VERSION } from '@ucm-kit/core/format';
import { constatsDesContrastes } from '@ucm-kit/core/lecteurs';
import { MINIMUMS_ADMIS, SEUILS_PAR_USAGE } from '@ucm-kit/core/referentiel';

import {
  atteintLeSeuil,
  contraste,
  courbesParDefaut,
  ecrireHexa,
  intensitesDe,
  lireHexa,
  rampeDe,
  rampesDe,
  recetteParDefaut,
  verifierPromesses,
  type Palette,
  type Recette,
  type Rgb8,
} from '../src/index';
import { paletteTailwind, recetteAvec } from './fabrique';

test('les minimums admis vont du seuil AA de chaque usage à 21, et la recette par défaut les atteint par le bas', () => {
  assert.deepEqual(MINIMUMS_ADMIS, { texte: { min: SEUILS_PAR_USAGE.texte, max: 21 }, nonTexte: { min: SEUILS_PAR_USAGE.nonTexte, max: 21 } });
  assert.equal(recetteParDefaut().seuils.texte, MINIMUMS_ADMIS.texte.min);
  assert.equal(recetteParDefaut().seuils.nonTexte, MINIMUMS_ADMIS.nonTexte.min);
  assert.equal(contraste([255, 255, 255], [0, 0, 0]), MINIMUMS_ADMIS.texte.max);
});

const peinture = ([r, g, b]: Rgb8) => ({
  champ: 'fills' as const, indice: 0, type: 'SOLID', visible: true, opacite: 1, blendMode: 'NORMAL',
  couleur: { r: r / 255, g: g / 255, b: b / 255, a: 1 },
});

/** Un relevé de composant : un fond plein, et un texte de 14 px posé dessus. */
function releveDeLaPaire(texte: Rgb8, fond: Rgb8): ReleveDeComposant {
  const dimensions = { x: 0, y: 0, largeur: 100, hauteur: 48 };
  const racine: LayerLu = {
    id: 'r', nom: 'Root', type: 'FRAME', parent: null, visible: true, opacite: 1, dimensions,
    peintures: [peinture(fond)], liaisons: [], valeursEnDur: [],
  };
  const libelle: LayerLu = {
    id: 't', nom: 'Label', type: 'TEXT', parent: 'r', visible: true, opacite: 1, dimensions: { ...dimensions, largeur: 40, hauteur: 16 },
    peintures: [], liaisons: [], valeursEnDur: [],
    texte: { style: null, plages: [{ debut: 0, fin: 5, fontSize: 14, fontWeight: 400, peintures: [peinture(texte)], liaisons: [] }] },
  };
  return {
    version: 1, jeu: { cle: 'k', id: '1', nom: 'x-button' }, proprietes: [],
    variants: [{ id: 'a', nom: 'a', valeurs: {}, layers: [racine, libelle], modesEffectifs: {} }],
    lecture: { layersLus: 0, layersNonLus: 0, variantsNonLus: [], manquees: [] }, espaceDeCouleur: 'srgb',
  };
}

const CATALOGUE_VIDE: CatalogueDeReference = { version: 1, library: null, collections: [], variables: [] };

/** C49 manque quand il rend un constat de texte sous la limite. */
const c49Manque = (texte: Rgb8, fond: Rgb8): boolean => controlerLAccessibilite(releveDeLaPaire(texte, fond), CATALOGUE_VIDE, { niveau: 'AA' })
  .some((constat) => constat.code === 'C49' && !constat.limite && constat.faits.usage === 'texte');

const srgb = (hexa: string) => ({ colorSpace: 'srgb', components: [1, 3, 5].map((debut) => Number.parseInt(hexa.slice(debut, debut + 2), 16) / 255), alpha: 1 });

/** `ucm check` manque quand `constatsDesContrastes` rend un constat sur le bouton de la paire. */
function constatsManquent(texte: Rgb8, fond: Rgb8): boolean {
  const contrat = {
    meta: { contractVersion: CONTRACT_VERSION },
    rendering: { roles: {}, keyRoles: {} },
    stateModel: { axis: 'state', states: {}, precedence: [] },
    variantViews: { vue: { structure: 'arbre', paintPlacements: 'peintures' } },
    viewStructures: { arbre: { children: [] } },
    viewPaintPlacements: { peintures: { fills: { background: [[]], foreground: [['label']] }, strokes: {} } },
    variants: [{
      values: { state: 'default' },
      view: 'vue',
      tokens: { background: '{composants.bouton.fond}', foreground: '{composants.bouton.texte}' },
    }],
  };
  const jetons = {
    composants: {
      bouton: {
        fond: { $type: 'color', $value: srgb(ecrireHexa(fond)) },
        texte: { $type: 'color', $value: srgb(ecrireHexa(texte)) },
      },
    },
  };
  return constatsDesContrastes(contrat, jetons).length > 0;
}

test('Y2 : au minimum par défaut, C49, constatsDesContrastes et verifierPromesses jugent une paire de texte pareil', () => {
  const references = ['#1E6FD9', '#16A34A', '#0891B2', '#64748B', '#F2A900'];
  // La 700 de Light éclaircie : le texte blanc du bouton manque alors sur plusieurs teintes.
  const courbes = courbesParDefaut(11, recetteParDefaut().texteDesBoutons);
  const eclaircie = { ...courbes, light: courbes.light.map((valeur, rang) => (rang === 7 ? 0.58 : valeur)) };
  const recettes: Recette[] = [recetteParDefaut(), { ...recetteParDefaut(), courbes: eclaircie }];
  const paires = recettes.flatMap((base) => references.flatMap((reference, rang) => {
    const palette = paletteTailwind(`p-0000000${rang}`, reference);
    return verifierPromesses({ ...base, palettes: [palette] }, palette).filter((promesse) => promesse.garantie.seuil === 'texte');
  }));
  assert.ok(paires.every((promesse) => promesse.seuil === SEUILS_PAR_USAGE.texte), 'le minimum du texte est celui du référentiel');
  assert.deepEqual([...new Set(paires.map((promesse) => promesse.verdict))].sort(), ['manquee', 'tenue'], 'les promesses jugées tiennent et manquent');
  for (const promesse of paires) {
    const manque = promesse.verdict === 'manquee';
    const paire = `${ecrireHexa(promesse.premier.couleur)} sur ${ecrireHexa(promesse.second.couleur)}, ${promesse.contraste}`;
    assert.equal(c49Manque(promesse.premier.couleur, promesse.second.couleur), manque, `C49, ${paire}`);
    assert.equal(constatsManquent(promesse.premier.couleur, promesse.second.couleur), manque, `constatsDesContrastes, ${paire}`);
  }
});

test('Y2 : la paire qui encadre le minimum par défaut tient d’un côté et manque de l’autre pour les juges', () => {
  const blanc = lireHexa('#FFFFFF')!;
  const [tient, manque] = [lireHexa('#767676')!, lireHexa('#777777')!];
  assert.ok(atteintLeSeuil(contraste(tient, blanc), SEUILS_PAR_USAGE.texte));
  assert.ok(!atteintLeSeuil(contraste(manque, blanc), SEUILS_PAR_USAGE.texte));
  assert.deepEqual([c49Manque(tient, blanc), c49Manque(manque, blanc)], [false, true]);
  assert.deepEqual([constatsManquent(tient, blanc), constatsManquent(manque, blanc)], [false, true]);
});

/** Les couleurs de chaque rampe de la palette, par intensité, thème et numéro. */
function couleursDesRampes(recette: Recette, palette: Palette): string[] {
  const rampes = rampesDe(recette, palette);
  return intensitesDe(palette).flatMap((intensite) => (['light', 'dark'] as const)
    .flatMap((mode) => rampeDe(rampes, intensite)[mode].map((cran, rang) => `${intensite}/${mode}/${recette.crans[rang]}:${cran.hexa}`)));
}

test('Y3 : un autre minimum du texte déplace des nuances, un autre minimum graphique aucune', () => {
  let nuancesChangees = 0;
  for (const reference of ['#1E6FD9', '#64748B', '#16A34A']) {
    const palette = paletteTailwind('p-0000000a', reference);
    const base = recetteAvec(palette);
    const avant = couleursDesRampes(base, palette);
    const apres = couleursDesRampes({ ...base, seuils: { ...base.seuils, texte: 7 } }, palette);
    nuancesChangees += avant.filter((couleur, rang) => couleur !== apres[rang]).length;
    const graphique = couleursDesRampes({ ...base, seuils: { ...base.seuils, nonTexte: 4.5 } }, palette);
    assert.deepEqual(graphique, avant, `${reference} : le minimum des éléments graphiques ne déplace aucune nuance`);
  }
  assert.ok(nuancesChangees > 0, 'le minimum du texte à 7 déplace des nuances');
});

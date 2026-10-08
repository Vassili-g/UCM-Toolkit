/** La sélection d'une nuance dans l'aperçu ([UI-04]) et les couleurs de l'interface de test ([UI-14]). */
import assert from 'node:assert/strict';
import test from 'node:test';
import { recetteParDefaut } from 'ucm-couleur';

import { analyserPalette } from '../src/analyse';
import { ajouter, nouvellePalette } from '../src/edition';
import { TEXTES_DE_L_INTERFACE_DE_TEST } from '../src/i18n/fr';
import { PROPRIETES, creerVuesInterfaceDeTest, proprieteConvient } from '../src/ui/interfaceDeTest';
import { creerLocalisation } from '../src/ui/localisation';
import { creerVuesNuancier, type Choix } from '../src/ui/nuancier';

const { couleursDeLInterface } = creerVuesInterfaceDeTest(creerLocalisation('fr'));
const { memeChoix } = creerVuesNuancier(creerLocalisation('fr'));

const VIDE = recetteParDefaut();
const BLEU = nouvellePalette(VIDE, 'p-0000000a', '#1E6FD9', 2)!;
const RECETTE = ajouter(VIDE, BLEU);
const ANALYSE = analyserPalette(RECETTE, BLEU);

test('[UI-04] le même clic sur la même nuance la relâche ; une autre nuance, un autre profil ou la case tiretée la remplacent', () => {
  const vivid600: Choix = { nature: 'nuance', profil: 'vivid', rang: 6, numero: 600 };
  assert.equal(memeChoix(vivid600, { ...vivid600 }), true);
  assert.equal(memeChoix(vivid600, { ...vivid600, profil: 'soft' }), false);
  assert.equal(memeChoix(vivid600, { ...vivid600, rang: 7, numero: 700 }), false);
  assert.equal(memeChoix(vivid600, { nature: 'fond' }), false);
  assert.equal(memeChoix({ nature: 'fond' }, { nature: 'fond' }), true);
  assert.equal(memeChoix(null, vivid600), false, 'sans choix, un clic choisit');
});

/** S2 écrite en dur : les crans de chaque variable, dans le sens normal puis inversé. */
const CRANS_NORMAL = { 'solid/default': 700, 'solid/hover': 800, 'solid/pressed': 900, 'surface/default': 100, 'surface/hover': 200, 'surface/pressed': 300, 'surface/foreground': 800, 'surface/border': 800, 'page/foreground': 700, 'page/border': 700, 'page/divider': 300, 'page/focus': 600 } as const;
const CRANS_INVERSE = { ...CRANS_NORMAL, 'solid/hover': 600, 'solid/pressed': 500, 'surface/foreground': 900, 'surface/border': 900, 'page/foreground': 800, 'page/border': 800, 'page/focus': 700 } as const;

test('[UI-14] chaque variable de l’interface de test prend la nuance de la table des dossiers du sens du thème montré, dans le profil porteur, pour les quatre combinaisons', () => {
  for (const mode of ['light', 'dark'] as const) {
    for (const texte of ['blanc', 'noir'] as const) {
      const recette = { ...RECETTE, texteDesBoutons: { ...RECETTE.texteDesBoutons, [mode]: texte } };
      const couleurs = couleursDeLInterface(recette, ANALYSE, mode);
      const normal = texte === (mode === 'light' ? 'blanc' : 'noir');
      const crans = normal ? CRANS_NORMAL : CRANS_INVERSE;
      const rampe = ANALYSE.rampes[ANALYSE.ancrage.profil]![mode];
      const nuance = (numero: number) => rampe[ANALYSE.grille.crans.indexOf(numero)].hexa;
      const message = `${mode}, texte ${texte}`;
      assert.equal(couleurs.sens, normal ? 'normal' : 'inverse', message);
      assert.equal(couleurs.fond, recette.fonds[mode], message);
      for (const [variable, cran] of Object.entries(crans)) {
        assert.equal(couleurs.variable(variable as keyof typeof CRANS_NORMAL), nuance(cran), `${message} : ${variable}`);
      }
      assert.equal(couleurs.variable('solid/foreground'), texte === 'blanc' ? '#FFFFFF' : '#000000', `${message} : le texte des boutons`);
    }
  }
});

test('[UI-14] une variable ne peint que ce que la table de ce qu’elle peint lui laisse', () => {
  assert.equal(proprieteConvient('fond', 'solid/default'), true);
  assert.equal(proprieteConvient('fondEtContour', 'solid/hover'), true, 'le plein porte aussi le contour');
  assert.equal(proprieteConvient('fondEtContour', 'surface/hover'), false, 'un fond teinté ne peint pas de contour');
  assert.equal(proprieteConvient('texte', 'solid/foreground'), true);
  assert.equal(proprieteConvient('icone', 'surface/foreground'), true);
  assert.equal(proprieteConvient('texte', 'solid/default'), false);
  assert.equal(proprieteConvient('contour', 'page/border'), true);
  assert.equal(proprieteConvient('anneau', 'page/focus'), true);
  assert.equal(proprieteConvient('contour', 'page/focus'), false, 'l’anneau n’est pas un contour');
  assert.deepEqual(Object.keys(TEXTES_DE_L_INTERFACE_DE_TEST.peint).sort(), [...PROPRIETES].sort(), 'chaque propriété a son mot');
});

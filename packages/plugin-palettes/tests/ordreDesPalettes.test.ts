/** L'ordre d'affichage des palettes : par teinte dans Création et Harmonisation, par nom dans Gestion. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { recetteParDefaut, type Palette, type Recette } from 'ucm-couleur';

import { nomDeLaPalette } from '../src/i18n/fr';
import { ordreAlphabetique, ordreParTeinte, palettesParTeinte, rangerSelon } from '../src/ordreDesPalettes';

const avec = (rang: number, reference: string, nom = reference): Palette => ({
  id: `p-0000001${rang}`, nom, reference,
  derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'libre' }, vivid: { clair: 0, sombre: 0, origine: 'libre' } },
});
const recetteDe = (palettes: Palette[]): Recette => ({ ...recetteParDefaut(), palettes });

test('[UI-40] par teinte de la référence, du rouge au rose, les neutres à la fin, l’ordre de la recette à égalité', () => {
  const recette = recetteDe([
    avec(0, '#6B7280'), avec(1, '#2563EB'), avec(2, '#DB2777'), avec(3, '#DC2626'), avec(4, '#16A34A'), avec(5, '#2563EB'), avec(6, '#FFFFFF'),
  ]);
  const ordre = ordreParTeinte(recette);
  // Rouge vers 27°, vert vers 149°, bleu vers 263°, rose vers 1° : le rose ferme le cercle. Le gris et le blanc n'ont pas de teinte.
  assert.deepEqual(palettesParTeinte(recette).map(({ nom }) => nom), ['#DC2626', '#16A34A', '#2563EB', '#2563EB', '#DB2777', '#6B7280', '#FFFFFF']);
  assert.deepEqual(ordre.slice(2, 4), ['p-00000011', 'p-00000015']);
  const cochees = [recette.palettes[2], recette.palettes[0], recette.palettes[4]];
  assert.deepEqual(rangerSelon(cochees, ordre, ({ id }) => id).map(({ nom }) => nom), ['#16A34A', '#DB2777', '#6B7280']);
  assert.deepEqual(rangerSelon(cochees, [], ({ id }) => id), cochees, 'hors de l’ordre, chacune garde son rang');
});

test('[UI-27] par nom, sans casse ni accents, les nombres à leur valeur, l’ordre de la recette à égalité', () => {
  const recette = recetteDe([
    avec(0, '#1E6FD9', 'bleu 10'), avec(1, '#FACC15', 'Jaune'), avec(2, '#6B7280', 'Écorce'), avec(3, '#1E6FD9', 'Bleu 2'),
    avec(4, '#DC2626', ''), avec(5, '#16A34A', 'ardoise'), avec(6, '#FACC15', 'jaune'),
  ]);
  const ordre = ordreAlphabetique(recette, nomDeLaPalette, 'fr');
  const noms = ordre.map((id) => nomDeLaPalette(recette.palettes.find((palette) => palette.id === id)!));
  // Une palette sans nom se montre sous son hexa, qui passe devant les lettres.
  assert.deepEqual(noms, ['#DC2626', 'ardoise', 'Bleu 2', 'bleu 10', 'Écorce', 'Jaune', 'jaune']);
});

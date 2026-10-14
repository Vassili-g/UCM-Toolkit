/**
 * Compare `rampesDe` du paquet à `rampesDuBanc` avec `REGLE_FINALE`, sur les
 * palettes du balayage de `garanties-regles.ts` (72 teintes, deux clartés de
 * référence), la recette par défaut du paquet, dans les quatre couples de
 * texte des boutons. Les deux calculs suivent la même chaîne ; aucun canal ne
 * doit différer de plus d'une unité.
 *
 * `npx tsx comparer-implementation.ts` affiche le plus grand écart et le
 * nombre de couleurs différentes.
 */
import { ecrireHexa, lineaireVersRgb8, oklchVersLineaire } from '../../../../../../packages/couleur/src/conversions';
import { courbesParDefaut } from '../../../../../../packages/couleur/src/nuances';
import { plafond } from '../../../../../../packages/couleur/src/plafond';
import { rampesDe } from '../../../../../../packages/couleur/src/palette';
import { recetteParDefaut, type Palette, type Recette } from '../../../../../../packages/couleur/src/recette';
import { rampesDuBanc } from './prototype';
import { REGLE_FINALE } from './variantes';

const teintes = Array.from({ length: 72 }, (_, i) => i * 5);
const references = teintes.flatMap((H) => [0.62, 0.75].map((L) => ecrireHexa(lineaireVersRgb8(oklchVersLineaire({ L, C: 0.9 * plafond(L, H, 'srgb'), H })))));

const textes = ['blanc', 'noir'] as const;
let couleurs = 0;
let differentes = 0;
let ecartMaximal = 0;
let pire = '';

for (const clair of textes) {
  for (const sombre of textes) {
    const base = recetteParDefaut();
    const texteDesBoutons = { light: clair, dark: sombre };
    const palettes: Palette[] = references.map((reference, k) => ({
      id: `p-${(k + 1).toString(16).padStart(8, '0')}`,
      reference,
      derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'constante' }, vivid: { clair: 0, sombre: 0, origine: 'constante' } },
    } as Palette));
    const recette: Recette = { ...base, texteDesBoutons, courbes: courbesParDefaut(11, texteDesBoutons), palettes };
    for (const palette of palettes) {
      const paquet = rampesDe(recette, palette);
      const banc = rampesDuBanc(recette, palette, REGLE_FINALE);
      for (const intensite of ['soft', 'vivid'] as const) {
        for (const mode of ['light', 'dark'] as const) {
          paquet[intensite]![mode].forEach((cran, rang) => {
            const autre = banc[intensite]![mode][rang];
            const ecart = Math.max(...cran.couleur.map((canal, i) => Math.abs(canal - autre.couleur[i])));
            couleurs += 1;
            if (ecart > 0) differentes += 1;
            if (ecart > ecartMaximal) {
              ecartMaximal = ecart;
              pire = `${palette.reference} ${intensite} ${mode} rang ${rang}, texte ${clair}/${sombre} : ${cran.hexa} contre ${autre.hexa}`;
            }
          });
        }
      }
    }
  }
}

console.log(`${couleurs} couleurs comparées, ${differentes} différentes, plus grand écart d'un canal : ${ecartMaximal}.`);
if (pire) console.log(`Plus grand écart : ${pire}`);
if (ecartMaximal > 1) {
  console.error('Écart supérieur à une unité.');
  process.exitCode = 1;
}

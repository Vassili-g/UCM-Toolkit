/**
 * Le cran le plus discret de l'anneau de focus décalé. L'anneau est séparé du
 * composant par 2 px de fond : il se juge contre ce qui l'entoure, la page et
 * la carte (décision G7), à 3:1. Balayage de 72 teintes à deux clartés de
 * référence, règle retenue au banc, dans les quatre combinaisons du texte des
 * boutons.
 *
 * `npx tsx mesurer-anneau.ts`
 */
import { ecrireHexa, lineaireVersRgb8, oklchVersLineaire, lireHexa } from '../../../../../../packages/couleur/src/conversions';
import { plafond } from '../../../../../../packages/couleur/src/plafond';
import { courbesParDefaut } from '../../../../../../packages/couleur/src/nuances';
import { recetteParDefaut, type Palette, type Recette } from '../../../../../../packages/couleur/src/recette';
import { contraste } from '../../../../../../packages/kit/src/emplois/contraste';
import { sensDuTheme, type TexteDesBoutons } from '../../../../../../packages/kit/src/emplois/dossiers';
import { rampesDuBanc } from './prototype';
import { REGLE_FINALE, valider } from './variantes';

const PAGE = { light: '#F7F7F7', dark: '#0A0A0B' };
const CARTE = { light: '#FFFFFF', dark: '#1A1C1F' };
const CANDIDATS = { light: [500, 600, 700], dark: [500, 600, 700, 800] };
const teintes = Array.from({ length: 72 }, (_, i) => i * 5);
const references = teintes.flatMap((H) => [0.62, 0.75].map((L) => ecrireHexa(lineaireVersRgb8(oklchVersLineaire({ L, C: 0.9 * plafond(L, H, 'srgb'), H })))));

const resultats: Record<string, { echecs: number; total: number; pire: number }> = {};
const textes: TexteDesBoutons[] = ['blanc', 'noir'];
for (const tl of textes) for (const td of textes) {
  const base = recetteParDefaut();
  const texteDesBoutons = { light: tl, dark: td };
  const palettes = references.map((reference, k) => ({
    id: `p-${(k + 1).toString(16).padStart(8, '0')}`, reference,
    derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'constante' }, vivid: { clair: 0, sombre: 0, origine: 'constante' } },
  } as Palette));
  const recette: Recette = valider({ ...base, fonds: PAGE, profils: { soft: { ...base.profils.soft, part: 0.85 }, vivid: { ...base.profils.vivid, part: 0.95 } }, texteDesBoutons, courbes: courbesParDefaut(11, texteDesBoutons), palettes });
  for (const palette of recette.palettes) {
    const rampes = rampesDuBanc(recette, palette, REGLE_FINALE);
    for (const i of ['soft', 'vivid'] as const) for (const mode of ['light', 'dark'] as const) {
      const sens = sensDuTheme(mode, texteDesBoutons[mode]);
      for (const cran of CANDIDATS[mode]) {
        const couleur = lireHexa(rampes[i]![mode][recette.crans.indexOf(cran)].hexa)!;
        const v = Math.min(contraste(couleur, lireHexa(PAGE[mode])!), contraste(couleur, lireHexa(CARTE[mode])!));
        const cle = `${mode} ${sens} ${cran}`;
        const r = resultats[cle] ?? { echecs: 0, total: 0, pire: Infinity };
        r.total += 1;
        if (v < 3) r.echecs += 1;
        r.pire = Math.min(r.pire, v);
        resultats[cle] = r;
      }
    }
  }
}
for (const [cle, r] of Object.entries(resultats).sort()) console.log(`${cle.padEnd(18)} échecs ${String(r.echecs).padStart(3)} / ${r.total}   pire ${r.pire.toFixed(2)}:1`);

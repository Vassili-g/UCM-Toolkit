/** Mesure des témoins synthétiques aux réglages identiques ; aucune écriture dans le produit. */
import { writeFileSync } from 'node:fs';
import { recetteParDefaut, validerRecette, type Palette } from '../../../../../packages/couleur/src/recette';
import { ancrageDe, partsDe, rampesDe } from '../../../../../packages/couleur/src/palette';
import { fabriquerCran } from '../../../../../packages/couleur/src/rampe';
import { lireHexa, rgb8VersOklch } from '../../../../../packages/couleur/src/conversions';
import { contraste } from '../../../../../packages/kit/src/emplois/contraste';

const recette = recetteParDefaut();
const references = ['#ED0007', '#F7A600', '#00BD5F', '#23BEFD'];
const crans = [50, 100, 600, 700, 800, 900];
const palettes = references.map((reference, indice): Palette => ({
  id: `p-${(indice + 1).toString(16).padStart(8, '0')}`,
  reference,
  base: 'vivid',
  parts: { soft: 0.45, vivid: 0.95, origine: 'designer' },
  derive: { lien: true, soft: { clair: 0, sombre: 0, origine: 'constante' }, vivid: { clair: 0, sombre: 0, origine: 'constante' } },
}));
const validation = validerRecette({ ...recette, palettes });
if ('refus' in validation) throw new Error(JSON.stringify(validation.refus));
const arrondir = (valeur: number) => Number(valeur.toFixed(6));
const mesures = palettes.map((palette) => {
  const rampes = rampesDe(recette, palette);
  const ancrage = ancrageDe(recette, palette);
  const lignes = (['soft', 'vivid'] as const).flatMap((profil) =>
    (['light', 'dark'] as const).flatMap((mode) => crans.map((cran) => {
      const couleur = rampes[profil]![mode][recette.crans.indexOf(cran)];
      const fond50 = rampes[profil]![mode][recette.crans.indexOf(50)];
      const fond100 = rampes[profil]![mode][recette.crans.indexOf(100)];
      return {
        profil, mode, cran, hexa: couleur.hexa,
        L: arrondir(couleur.L), C: arrondir(couleur.C), H: arrondir(couleur.H),
        ancre: profil === ancrage.profil && cran === ancrage.crans[mode],
        contrasteBlanc: arrondir(contraste(couleur.couleur, [255, 255, 255])),
        contrasteFond50: arrondir(contraste(couleur.couleur, fond50.couleur)),
        contrasteFond100: arrondir(contraste(couleur.couleur, fond100.couleur)),
      };
    })),
  );
  return { palette, parts: partsDe(recette, palette), ancrage, lignes };
});

const plafondParTeinte = [30, 90, 150, 210, 270].map((H) => {
  const cran = fabriquerCran(0.5, H, 0.45, 'srgb');
  return { teinteVisee: H, part: 0.45, L: arrondir(cran.L), C: arrondir(cran.C), hexa: cran.hexa };
});

const resultat = {
  nature: 'Témoins synthétiques ; les références ne reproduisent pas la recette des alertes du mainteneur.',
  recette: validation.recette,
  plafondParTeinte,
  mesures,
  untitled: [
    { nom: 'Brand', node: '1046:8087', fond: '#F9F5FF', texte: '#6941C6' },
    { nom: 'Red', node: '1130:86065', fond: '#FEF2F2', texte: '#B91C1C' },
    { nom: 'Yellow', node: '1130:84018', fond: '#FEFCE8', texte: '#A16207' },
    { nom: 'Green', node: '1130:86461', fond: '#F0FDF4', texte: '#15803D' },
  ].map((temoin) => ({
    ...temoin,
    source: `https://www.figma.com/design/iJscFYgN97zFFr0i2XLeyf/?node-id=${temoin.node.replace(':', '-')}`,
    fondLch: rgb8VersOklch(lireHexa(temoin.fond)!),
    texteLch: rgb8VersOklch(lireHexa(temoin.texte)!),
    contraste: arrondir(contraste(lireHexa(temoin.fond)!, lireHexa(temoin.texte)!)),
  })),
  haloUntitled: { hexa: '#F4EBFF', contrasteSurBlanc: arrondir(contraste(lireHexa('#F4EBFF')!, [255, 255, 255])) },
};
writeFileSync(new URL('./MESURES-TEMOINS.json', import.meta.url), `${JSON.stringify(resultat, null, 2)}\n`);
console.log('MESURES-TEMOINS.json : quatre palettes validées, 96 couleurs mesurées et cinq témoins de chroma.');

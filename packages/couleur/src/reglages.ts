/**
 * La référence réglée (Z10.5) : la seule fonction qui tire les octets de la
 * référence de son départ, de la teinte et de la clarté du profil porteur, et
 * de la part d'une palette à une intensité. Aucun geste ne l'écrit autrement :
 * enchaîner des gestes sur la référence déjà arrondie la ferait dériver.
 */
import { normaliserTeinte, rgb8VersOklch, type Rgb8 } from './conversions';
import { plafond, type Gamut } from './plafond';
import { fabriquerCran } from './rampe';

/**
 * La couleur à `teinte` degrés et `clarte` de clarté OKLCH du départ. Sa
 * chroma vaut `part` fois le plafond quand `part` est donnée, sinon celle du
 * départ, bornée au plafond, comme `propositionDAjustement`. Tout zéro rend le
 * départ, octets compris.
 */
export function referenceReglee(depart: Rgb8, teinte: number, clarte: number, part: number | undefined, gamut: Gamut): Rgb8 {
  if (teinte === 0 && clarte === 0 && part === undefined) return depart;
  const { L, C, H } = rgb8VersOklch(depart);
  const clarteVisee = Math.min(1, Math.max(0, L + clarte));
  const teinteVisee = normaliserTeinte(H + teinte);
  const maximum = plafond(clarteVisee, teinteVisee, gamut);
  const partVisee = part ?? (maximum > 0 ? Math.min(1, C / maximum) : 0);
  return fabriquerCran(clarteVisee, teinteVisee, partVisee, gamut).couleur;
}

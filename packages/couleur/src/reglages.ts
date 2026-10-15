/**
 * La référence réglée (Z10.5) : la seule fonction qui tire les octets de la
 * référence de son départ, de la teinte et de la clarté du profil porteur, et
 * de la part d'une palette à une intensité. Aucun geste ne l'écrit autrement :
 * enchaîner des gestes sur la référence déjà arrondie la ferait dériver.
 */
import { ecrireHexa, lireHexa, normaliserTeinte, rgb8VersOklch, type Rgb8 } from './conversions';
import { aUnReglageDuPorteur, aUneIntensite, cleDuPorteur, departDe } from './palette';
import { plafond, type Gamut } from './plafond';
import { fabriquerCran, PROFILS, type Profil } from './rampe';
import type { Palette, ParProfil, Recette, Reglages } from './recette';

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

/** Les valeurs réglables d'une palette : teinte et clarté par profil, et la part de la référence. */
export interface ValeursReglees {
  readonly teinte: ParProfil;
  readonly clarte: ParProfil;
  readonly part?: number;
}

/** Une valeur par profil sans zéro ; `null` quand il n'en reste aucune. */
function sansZero(valeurs: ParProfil): ParProfil | null {
  const gardees = PROFILS.filter((profil) => valeurs[profil] !== undefined && valeurs[profil] !== 0);
  return gardees.length === 0 ? null : Object.fromEntries(gardees.map((profil) => [profil, valeurs[profil]]));
}

/**
 * Pose des valeurs réglées sur une palette (Z10.5, « Les gestes ») : zéros
 * retirés, porteur figé à deux intensités sans palette de base, `originale`
 * et `depart` posés au premier réglage du porteur, la référence tirée du
 * départ par `referenceReglee`.
 * `porteur` remplace le porteur d'avant, quand le geste en change ; `base`
 * est celle de la palette rendue.
 */
export function appliquerLesReglages(
  recette: Recette,
  avant: Palette,
  valeurs: ValeursReglees,
  options: { porteur?: Profil; base?: Profil } = {},
): Palette {
  const porteur = options.porteur ?? cleDuPorteur(recette, avant);
  // Une base passée à `undefined` la retire : seule une clé absente garde celle d'avant.
  const base = 'base' in options ? options.base : avant.base;
  const une = aUneIntensite(avant);
  const teinte = sansZero(valeurs.teinte);
  const clarte = sansZero(valeurs.clarte);
  const part = valeurs.part;
  const reglages: { -readonly [K in keyof Reglages]: Reglages[K] } = {};
  if (teinte) reglages.teinte = teinte;
  if (clarte) reglages.clarte = clarte;
  if (part !== undefined) reglages.part = part;
  const aDesReglages = Object.keys(reglages).length > 0;
  if (aDesReglages && !une && !base) reglages.porteur = porteur;

  const duPorteur = part !== undefined || teinte?.[porteur] !== undefined || clarte?.[porteur] !== undefined;
  const avaitDuPorteur = aUnReglageDuPorteur(recette, avant);
  let originale = avant.originale;
  let depart = avant.reglages?.depart;
  if (duPorteur && !avaitDuPorteur) {
    // Une référence ajustée avant la version 5 garde ses octets comme départ, et son originale.
    if (!originale) originale = avant.reference;
    else if (originale.toUpperCase() !== avant.reference.toUpperCase()) depart = avant.reference;
  }
  const couleurDeDepart = lireHexa(avaitDuPorteur || duPorteur ? (depart ?? originale ?? avant.reference) : avant.reference) ?? departDe(recette, avant);
  let reference: string;
  if (duPorteur) {
    reference = ecrireHexa(referenceReglee(couleurDeDepart, teinte?.[porteur] ?? 0, clarte?.[porteur] ?? 0, part, recette.gamut));
    if (depart) reglages.depart = depart.toUpperCase();
  } else {
    reference = ecrireHexa(couleurDeDepart);
    if (originale?.toUpperCase() === reference) originale = undefined;
  }

  const { reglages: _reglages, originale: _originale, base: _base, ...reste } = avant;
  return {
    ...reste,
    reference,
    ...(base ? { base } : {}),
    ...(originale ? { originale: originale.toUpperCase() } : {}),
    ...(aDesReglages ? { reglages } : {}),
  };
}

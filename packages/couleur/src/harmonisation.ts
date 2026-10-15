/** Les candidats de teinte, leur course permise et les zones de proximité entre palettes. */
import { atteintLeSeuil, contraste } from '@ucm-kit/core/emplois';

import { nuancesDeProximite, proximiteDeNuances, type NuancesDeProximite } from './alertes';
import { lineaireVersRgb8, rgb8VersOklch, type Rgb8 } from './conversions';
import { estFigee } from './nuances';
import { aUneIntensite, cleDuPorteur, rampesDe } from './palette';
import { verifierPromesses, type Designation, type Promesse } from './promesses';
import { arrondir, rampeDe, type Profil, type Rampes } from './rampe';
import { BORNES_DES_REGLAGES, type Palette, type Recette } from './recette';
import { appliquerLesReglages } from './reglages';

export interface CourseDeTeinte {
  readonly bas: number;
  readonly haut: number;
}

export interface ZoneTropProche {
  readonly debut: number;
  readonly fin: number;
}

/**
 * Décale les deux profils du même `ecartCommun`, borné par chacun à ±30°.
 * Une cible de profil réserve le geste à ce profil ; une intensité vise
 * toujours `vivid`. Les valeurs se rangent au centième, puis
 * `appliquerLesReglages` range le reste. Une palette figée garde ses
 * couleurs et ses réglages.
 */
export function candidatDeTeinte(recette: Recette, palette: Palette, ecartCommun: number, cible: Profil | 'deux' = 'deux'): Palette {
  if (estFigee(palette)) return palette;
  const profils: readonly Profil[] = aUneIntensite(palette) ? ['vivid'] : cible === 'deux' ? ['soft', 'vivid'] : [cible];
  const avant = palette.reglages?.teinte ?? {};
  const borne = BORNES_DES_REGLAGES.teinte;
  const bas = Math.max(...profils.map((profil) => -borne - (avant[profil] ?? 0)));
  const haut = Math.min(...profils.map((profil) => borne - (avant[profil] ?? 0)));
  const ecart = Math.min(haut, Math.max(bas, ecartCommun));
  const teinte = { ...avant };
  for (const profil of profils) teinte[profil] = arrondir((avant[profil] ?? 0) + ecart, 2) + 0;
  const { clarte = {}, part } = palette.reglages ?? {};
  return appliquerLesReglages(recette, palette, part === undefined ? { teinte, clarte } : { teinte, clarte, part });
}

function bornesDeLEcartCommun(palette: Palette): CourseDeTeinte {
  if (estFigee(palette)) return { bas: 0, haut: 0 };
  const profils: readonly Profil[] = aUneIntensite(palette) ? ['vivid'] : ['soft', 'vivid'];
  const valeurs = profils.map((profil) => palette.reglages?.teinte?.[profil] ?? 0);
  return {
    bas: -BORNES_DES_REGLAGES.teinte - Math.min(...valeurs),
    haut: BORNES_DES_REGLAGES.teinte - Math.max(...valeurs),
  };
}

function couleurDe(designation: Designation, promesse: Promesse, recette: Recette, rampes: Rampes): Rgb8 {
  return designation.nature === 'cran'
    ? rampeDe(rampes, promesse.profil)[promesse.mode][recette.crans.indexOf(designation.cran)].couleur
    : designation.couleur;
}

interface PositionDeTeinte {
  readonly ecartCommun: number;
  readonly palette: Palette;
  readonly rampes: Rampes;
}

function balayerLaCourse(recette: Recette, palette: Palette, rampesDuDepart: Rampes = rampesDe(recette, palette)): { course: CourseDeTeinte; positions: PositionDeTeinte[] } {
  const bornes = bornesDeLEcartCommun(palette);
  const tenues = verifierPromesses(recette, palette).filter((promesse) => promesse.verdict === 'tenue');
  const positions: PositionDeTeinte[] = [{ ecartCommun: 0, palette, rampes: rampesDuDepart }];
  const gardeLesGaranties = (rampes: Rampes): boolean => tenues.every((promesse) => atteintLeSeuil(
    contraste(couleurDe(promesse.premier, promesse, recette, rampes), couleurDe(promesse.second, promesse, recette, rampes)),
    promesse.seuil,
  ));
  const chercher = (sens: -1 | 1): number => {
    const fixe = sens < 0 ? bornes.bas : bornes.haut;
    let derniere = 0;
    for (let pas = 1; sens * (fixe - derniere) > 0; pas += 1) {
      const ecartCommun = sens < 0 ? Math.max(fixe, -pas) : Math.min(fixe, pas);
      const candidate = candidatDeTeinte(recette, palette, ecartCommun);
      const rampes = rampesDe(recette, candidate);
      if (!gardeLesGaranties(rampes)) return derniere;
      if (Number.isInteger(ecartCommun)) positions.push({ ecartCommun, palette: candidate, rampes });
      derniere = ecartCommun;
    }
    return fixe;
  };
  const bas = chercher(-1);
  const haut = chercher(1);
  return { course: { bas, haut }, positions: positions.sort((a, b) => a.ecartCommun - b.ecartCommun) };
}

/** La course de l'écart commun, limitée par les profils et les garanties tenues au départ, au pas de 1°. */
export function courseDeTeinte(recette: Recette, palette: Palette): CourseDeTeinte {
  return balayerLaCourse(recette, palette).course;
}

function positionsDeLaPaire(recette: Recette, palette: Palette, autre: Palette): { ecartCommun: number; proche: boolean }[] | null {
  const immobiles = nuancesDeProximite(recette, autre);
  const courantes = nuancesDeProximite(recette, palette);
  if (!immobiles || !courantes) return null;
  const separe = (nuances: NuancesDeProximite | null): boolean => nuances === null || proximiteDeNuances(nuances, immobiles).distance >= recette.seuils.palettesProches;
  if (separe(courantes)) return [{ ecartCommun: 0, proche: false }];
  const { positions } = balayerLaCourse(recette, palette);
  return positions.map((position) => ({
    ecartCommun: position.ecartCommun,
    proche: !separe(nuancesDeProximite(recette, position.palette, position.rampes)),
  }));
}

/**
 * Les suites de degrés trop proches, en valeurs du `profilAffiche` (le
 * porteur par défaut). L'écart commun reste la coordonnée du balayage.
 * Une palette libre, figée ou terne n'entre pas dans cette alerte de rôles.
 * Les rampes de l'autre palette se calculent une fois par appel.
 */
export function zonesTropProches(recette: Recette, palette: Palette, autre: Palette, profilAffiche: Profil = cleDuPorteur(recette, palette)): ZoneTropProche[] {
  const positions = positionsDeLaPaire(recette, palette, autre);
  if (!positions?.find((position) => position.ecartCommun === 0)?.proche) return [];
  const valeurDuProfilAffiche = palette.reglages?.teinte?.[aUneIntensite(palette) ? 'vivid' : profilAffiche] ?? 0;
  const zones: ZoneTropProche[] = [];
  for (const position of positions) {
    if (!position.proche) continue;
    const valeur = arrondir(valeurDuProfilAffiche + position.ecartCommun, 2) + 0;
    const precedente = zones[zones.length - 1];
    if (precedente && Math.abs(valeur - precedente.fin - 1) < 1e-9) zones[zones.length - 1] = { debut: precedente.debut, fin: valeur };
    else zones.push({ debut: valeur, fin: valeur });
  }
  return zones;
}

/** Le plus petit écart commun permis qui sépare la paire, zéro si elle est séparée, ou `null` sans sortie. À égalité, l'écart négatif. */
export function sortieLaPlusProche(recette: Recette, palette: Palette, autre: Palette): number | null {
  const positions = positionsDeLaPaire(recette, palette, autre);
  const sorties = positions?.filter((position) => !position.proche).sort((a, b) => Math.abs(a.ecartCommun) - Math.abs(b.ecartCommun));
  return sorties?.[0]?.ecartCommun ?? null;
}

/** Le gris à la même clarté OKLab, arrondi à 8 bits après encodage sRGB de `L³`. */
export function grisDeMemeClarte(couleur: Rgb8): Rgb8 {
  const Y = rgb8VersOklch(couleur).L ** 3;
  return lineaireVersRgb8([Y, Y, Y]);
}

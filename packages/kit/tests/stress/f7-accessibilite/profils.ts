/**
 * Les 48 profils sRGB de F7 : six formes de jeu de F3, un ou deux modes de `theme`, un fond de `Root` opaque et lié ou translucide
 * sans ancêtre opaque, le niveau AA ou AAA. Chacun doit donner zéro constat C49 à C52 ; seul C53 sort, pour un état `disabled`.
 * Display P3 est hors périmètre, la dimension « espace de couleur » du plan est retirée (96 profils moins la moitié).
 */
import { controlerLAccessibilite } from '../../../src/controles/accessibilite.js';
import type { Constat } from '../../../src/controles/index.js';
import { choisir, graineDe, mulberry32 } from '../commun/prng.js';
import { FORMES_DE_JEU } from '../f3-composant/profils.js';
import { composantDeContraste, GRAINE_F7, type ComposantDeContraste, type SpecDeContraste } from './composantDeContraste.js';

export interface ProfilDeContraste extends SpecDeContraste {
  /** `p001` à `p048`, dans l'ordre du produit : forme, modes, fond, niveau. */
  readonly id: string;
}

export const PROFILS: readonly ProfilDeContraste[] = FORMES_DE_JEU.flatMap((forme) =>
  ([1, 2] as const).flatMap((modes) =>
    (['opaque', 'translucide'] as const).flatMap((fond) =>
      (['AA', 'AAA'] as const).map((niveau) => ({ forme, modes, fond, niveau }))))).map((profil, rang) => ({ id: `p${String(rang + 1).padStart(3, '0')}`, ...profil }));

const profilDe = (critere: SpecDeContraste): ProfilDeContraste => {
  const trouve = PROFILS.find((profil) => profil.forme === critere.forme && profil.modes === critere.modes && profil.fond === critere.fond && profil.niveau === critere.niveau);
  if (!trouve) throw new Error(`Profil introuvable : ${JSON.stringify(critere)}`);
  return trouve;
};

/** `button-36` à 48 variants, `Light` et `Dark`, fond opaque lié, niveau AA : le profil de référence des opérateurs. */
export const PROFIL_P0: ProfilDeContraste = profilDe({ forme: 'button-36', modes: 2, fond: 'opaque', niveau: 'AA' });

/** `alert-11`, `Light` et `Dark`, fond translucide, niveau AA : le second profil des combinaisons (le plan le voulait en Display P3). */
export const PROFIL_ALPHA: ProfilDeContraste = profilDe({ forme: 'alert-11', modes: 2, fond: 'translucide', niveau: 'AA' });

/** Le troisième profil des combinaisons : un des 48, tiré de la graine. */
export const profilTire = (graine: number = GRAINE_F7): ProfilDeContraste => choisir(mulberry32(graineDe(graine, 'profil-tire')), PROFILS);

export const composantDuProfil = (profil: ProfilDeContraste, graine: number = GRAINE_F7): ComposantDeContraste => composantDeContraste(profil, graine);

/** Les constats de C49 à C53 du composant tel que son profil le fabrique. */
export function constatsDuProfil(composant: ComposantDeContraste): Constat[] {
  return controlerLAccessibilite(composant.releve, composant.catalogue, { niveau: composant.profil.niveau });
}

/** Les constats que P1 interdit : tous sauf C53, qui sort pour un profil à état `disabled`. */
export const constatsInterdits = (constats: readonly Constat[]): Constat[] => constats.filter((constat) => constat.code !== 'C53');

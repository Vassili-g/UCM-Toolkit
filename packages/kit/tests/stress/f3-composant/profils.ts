/**
 * Les 96 profils de base des stress tests de liaisons et de tailles : six formes de jeu, deux jeux de scopes, imbriqués ou non,
 * une ou deux plages de texte, un ou deux modes de taille. P0 et Pα sont les deux profils sur lesquels les opérateurs et les
 * combinaisons tournent ; le troisième est tiré de la graine.
 */
import { choisir, graineDe, mulberry32 } from '../commun/prng.js';
import { construireLeComposant, GRAINE_PAR_DEFAUT, type AxeDeSpec, type ComposantDeBase, type SpecDeComposant } from './composantDeBase.js';

export const FORMES_DE_JEU = ['alert-11', 'button-36', 'button-216', 'switch-4', 'divider-1', 'badge-9'] as const;
export type FormeDeJeu = (typeof FORMES_DE_JEU)[number];

export interface ProfilDeBase {
  /** `p001` à `p096`, dans l'ordre du produit : forme, scopes, imbriqués, plages, modes. */
  readonly id: string;
  readonly forme: FormeDeJeu;
  readonly scopes: 'larges' | 'precis';
  readonly imbriques: boolean;
  readonly plages: 1 | 2;
  readonly modesDeTaille: 1 | 2;
}

interface JeuDeVariants {
  readonly jeu: string;
  readonly axes: readonly AxeDeSpec[];
  readonly exclus?: readonly Readonly<Record<string, string>>[];
}

/**
 * Les axes et valeurs de chaque forme. `alert-11` et `button-216` reprennent la galerie d'Architect. `badge-9` nomme ses axes
 * `Type` et `Tone`, que le kit lit depuis Q-F5-1 : `Type` pilote le style, `Tone` la palette.
 */
export const JEUX_DE_VARIANTS: Readonly<Record<FormeDeJeu, JeuDeVariants>> = {
  'alert-11': {
    jeu: 'Alert',
    axes: [{ nom: 'Severity', valeurs: ['info', 'error', 'success', 'warning'] }, { nom: 'Variant', valeurs: ['standard', 'outlined', 'filled'] }],
    exclus: [{ Severity: 'warning', Variant: 'filled' }],
  },
  'button-36': {
    jeu: 'Button',
    axes: [
      { nom: 'Palette', valeurs: ['primary', 'neutral', 'danger'] }, { nom: 'Style', valeurs: ['solid', 'outline'] },
      { nom: 'State', valeurs: ['default', 'hover', 'disabled'] }, { nom: 'Size', valeurs: ['small', 'medium'] },
    ],
  },
  'button-216': {
    jeu: 'Button',
    axes: [
      { nom: 'Style', valeurs: ['contained', 'outlined', 'text'] }, { nom: 'Palette', valeurs: ['primary', 'secondary', 'neutral', 'info', 'success', 'danger'] },
      { nom: 'State', valeurs: ['default', 'hover', 'focus', 'disabled'] }, { nom: 'Size', valeurs: ['small', 'medium', 'large'] },
    ],
  },
  'switch-4': { jeu: 'Switch', axes: [{ nom: 'State', valeurs: ['default', 'hover', 'pressed', 'disabled'] }] },
  'divider-1': { jeu: 'Divider', axes: [] },
  'badge-9': {
    jeu: 'Badge',
    axes: [{ nom: 'Type', valeurs: ['filled', 'outlined', 'subtle'], segment: 'style' }, { nom: 'Tone', valeurs: ['neutral', 'info', 'danger'], segment: 'palette' }],
  },
};

/** Le produit des cinq dimensions, dans l'ordre : la dernière varie le plus vite. */
export const PROFILS_DE_BASE: readonly ProfilDeBase[] = FORMES_DE_JEU.flatMap((forme) =>
  (['larges', 'precis'] as const).flatMap((scopes) =>
    [false, true].flatMap((imbriques) =>
      ([1, 2] as const).flatMap((plages) =>
        ([1, 2] as const).map((modesDeTaille) => ({ forme, scopes, imbriques, plages, modesDeTaille })))))).map((profil, rang) => ({
  id: `p${String(rang + 1).padStart(3, '0')}`, ...profil,
}));

const profilDe = (critere: Omit<ProfilDeBase, 'id'>): ProfilDeBase => {
  const trouve = PROFILS_DE_BASE.find((profil) => profil.forme === critere.forme && profil.scopes === critere.scopes && profil.imbriques === critere.imbriques
    && profil.plages === critere.plages && profil.modesDeTaille === critere.modesDeTaille);
  if (!trouve) throw new Error(`Profil introuvable : ${JSON.stringify(critere)}`);
  return trouve;
};

/** `button-36`, scopes larges, avec imbriqués, deux plages, un mode : le profil de référence des opérateurs. */
export const PROFIL_P0: ProfilDeBase = profilDe({ forme: 'button-36', scopes: 'larges', imbriques: true, plages: 2, modesDeTaille: 1 });

/** `alert-11`, scopes précis, avec imbriqués, deux plages, deux modes : le second profil des combinaisons. */
export const PROFIL_ALPHA: ProfilDeBase = profilDe({ forme: 'alert-11', scopes: 'precis', imbriques: true, plages: 2, modesDeTaille: 2 });

/** Le troisième profil des combinaisons : un des 96, tiré de la graine. */
export function profilTire(graine: number = GRAINE_PAR_DEFAUT): ProfilDeBase {
  return choisir(mulberry32(graineDe(graine, 'profil-tire')), PROFILS_DE_BASE);
}

export function specDuProfil(profil: ProfilDeBase, graine: number = GRAINE_PAR_DEFAUT): SpecDeComposant {
  const { jeu, axes, exclus } = JEUX_DE_VARIANTS[profil.forme];
  return {
    jeu, axes, ...(exclus ? { exclus } : {}),
    scopes: profil.scopes, imbriques: profil.imbriques, plages: profil.plages, modesDeTaille: profil.modesDeTaille, graine,
  };
}

/** Le composant de base d'un profil. Une même graine rend le même composant. */
export function composantDuProfil(profil: ProfilDeBase, graine: number = GRAINE_PAR_DEFAUT): ComposantDeBase {
  return construireLeComposant(specDuProfil(profil, graine));
}

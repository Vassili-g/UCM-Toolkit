/** Des palettes et des recettes fabriquées pour les tests, à partir de la recette par défaut. */
import {
  boutsDe,
  lireHexa,
  prereglageTailwind,
  recetteParDefaut,
  rgb8VersOklch,
  type Palette,
  type Recette,
} from '../src/index';

/** Une palette au préréglage Tailwind, les deux profils liés. */
export function paletteTailwind(id: string, reference: string, autres: Partial<Palette> = {}): Palette {
  const derive = prereglageTailwind(rgb8VersOklch(lireHexa(reference)!), boutsDe(recetteParDefaut()));
  return {
    id,
    reference,
    derive: {
      lien: true,
      soft: { ...derive, origine: 'tailwind' },
      vivid: { ...derive, origine: 'tailwind' },
    },
    ...autres,
  };
}

/** Les profils par défaut, aux parts communes données : les enveloppes restent celles de la recette par défaut. */
export function profilsAuxParts(soft: number, vivid: number): Recette['profils'] {
  const { profils } = recetteParDefaut();
  return { soft: { ...profils.soft, part: soft }, vivid: { ...profils.vivid, part: vivid } };
}

/**
 * La recette par défaut aux parts communes 0,45 et 0,95 : les parts que décrivent les tests du
 * classement des profils et des alertes de parts, d'avant la part Soft par défaut à 0,85.
 */
export function recetteAuxPartsDe045(...palettes: Palette[]): Recette {
  return { ...recetteParDefaut(), profils: profilsAuxParts(0.45, 0.95), palettes };
}

/** La recette par défaut, avec les palettes données. */
export function recetteAvec(...palettes: Palette[]): Recette {
  return { ...recetteParDefaut(), palettes };
}

/** Une copie modifiable d'une valeur JSON. */
export function copie<T>(valeur: T): any {
  return JSON.parse(JSON.stringify(valeur));
}

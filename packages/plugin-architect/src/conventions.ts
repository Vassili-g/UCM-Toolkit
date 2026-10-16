/** La convention du document reste versionnée et validée par les registres du kit. */
import { CATEGORIES_DE_NOM, REGISTRE_CASSES, REGISTRE_SEPARATEURS, type ConventionsParCategorie } from '@ucm-kit/core/referentiel';

export interface ChoixDeConventions {
  readonly version: 1;
  readonly conventions: ConventionsParCategorie;
  readonly termesUcm: boolean;
}

/** Refuse une catégorie ou une dimension absente des registres publiés. */
export function estConventions(brut: unknown): brut is ConventionsParCategorie {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return false;
  return Object.entries(brut).every(([categorie, choix]) => CATEGORIES_DE_NOM.includes(categorie as typeof CATEGORIES_DE_NOM[number])
    && choix && typeof choix === 'object' && Object.keys(choix).length === 2
    && REGISTRE_CASSES.termes.some((terme) => terme.id === choix.casse)
    && REGISTRE_SEPARATEURS.termes.some((terme) => terme.id === choix.separateur));
}

/** Une donnée illisible n'est jamais réécrite lors d'une simple lecture. */
export function lireChoix(texte: string): ChoixDeConventions | undefined {
  if (!texte) return undefined;
  try {
    const brut = JSON.parse(texte);
    return brut?.version === 1 && typeof brut.termesUcm === 'boolean' && estConventions(brut.conventions) ? brut : undefined;
  } catch { return undefined; }
}

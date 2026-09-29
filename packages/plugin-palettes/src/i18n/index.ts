/** Les catalogues sont inclus au build ; chaque traducteur garde sa langue. */
import type { Catalogue } from './catalogue';
import * as anglais from './en';
import * as francais from './fr';
import { LANGUES, resoudreLangue, type Langue } from './langues';

/** Une langue inscrite au registre sans catalogue ne compile pas. */
export const CATALOGUES: Record<Langue, Catalogue> = { en: anglais, fr: francais };

/** Résout la préférence avant de donner accès au catalogue complet. */
export function creerTraducteur(valeur: unknown = 'en') {
  const langue = resoudreLangue(valeur);
  return { langue, direction: LANGUES.find(({ code }) => code === langue)!.direction, messages: CATALOGUES[langue] };
}

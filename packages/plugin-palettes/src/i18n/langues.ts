/**
 * Les langues proposées, indépendantes de la langue de Figma et du système. Le
 * registre ne charge aucun catalogue : le sandbox le lit pour valider la
 * préférence sans embarquer les textes de l'interface.
 */
export const LANGUES = [
  { code: 'en', nom: 'English', direction: 'ltr', decimale: '.' },
  { code: 'fr', nom: 'Français', direction: 'ltr', decimale: ',' },
] as const satisfies readonly { code: string; nom: string; direction: 'ltr' | 'rtl'; decimale: string }[];

export type Langue = typeof LANGUES[number]['code'];
export const LANGUE_PAR_DEFAUT: Langue = 'en';

/** Une préférence absente ou inconnue reprend le défaut du plugin. */
export function resoudreLangue(valeur: unknown): Langue {
  return resoudreDansRegistre(valeur, LANGUES, LANGUE_PAR_DEFAUT);
}

/** La résolution suit le registre, y compris lorsqu'une troisième langue est ajoutée. */
export function resoudreDansRegistre<C extends string>(valeur: unknown, registre: readonly { code: C }[], defaut: C): C {
  return registre.find(({ code }) => code === valeur)?.code ?? defaut;
}

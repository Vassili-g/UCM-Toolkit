/** Les sept éléments du panneau des constats du mode Composant, dans l'ordre où le panneau les range, leur libellé et les mots du sommaire. */

export const ELEMENTS_DU_PANNEAU = ['couleurs', 'tailles', 'texte', 'tokens', 'variants', 'regles', 'a11y'] as const;

export type IdDElement = (typeof ELEMENTS_DU_PANNEAU)[number];

const pluriel = (n: number): string => (n > 1 ? 's' : '');

export const TEXTES_ELEMENTS = {
  elementsDuPanneau: {
    libelles: {
      couleurs: 'Couleurs',
      tailles: 'Tailles et forme',
      texte: 'Texte',
      tokens: 'Tokens du composant',
      variants: 'Variants et layers',
      regles: 'Règles d’utilisation',
      a11y: 'Accessibilité',
    } satisfies Readonly<Record<IdDElement, string>>,
    etiquetteDuSommaire: 'Éléments du composant',
    tout: 'Tout',
    points: (nombre: number): string => `${nombre} point${pluriel(nombre)}`,
    /** Le nom d'une puce du sommaire : l'icône Bloquant est décorative, le mot la remplace. */
    nomDeLaPuce: (libelle: string, nombre: number, bloquant: string | null): string => `${libelle}, ${nombre} point${pluriel(nombre)}${bloquant === null ? '' : `, ${bloquant}`}`,
    nomDeLaBande: (libelle: string, nombre: number): string => `${libelle}, ${nombre} point${pluriel(nombre)}`,
    nomDeLaBandeTenue: (libelle: string, tenu: string): string => `${libelle}, ${tenu}`,
    deplierLaCarte: 'Déplier la carte',
    enTeteDesBloquants: 'Bloquants',
  },
};

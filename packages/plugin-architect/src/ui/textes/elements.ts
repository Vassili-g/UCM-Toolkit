/** Les sept éléments du panneau des constats du mode Composant, dans l'ordre où le panneau les range, et leur libellé. */

export const ELEMENTS_DU_PANNEAU = ['couleurs', 'tailles', 'texte', 'tokens', 'variants', 'regles', 'a11y'] as const;

export type IdDElement = (typeof ELEMENTS_DU_PANNEAU)[number];

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
  },
};

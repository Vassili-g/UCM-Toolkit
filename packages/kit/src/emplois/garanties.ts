/** Les huit garanties de contraste du thème : membres, fonds, seuils et périmètre du jugement. */
import { variablePresente, type SensDuTheme, type VariableDePalette } from './dossiers.js';

export type FondDeGarantie =
  | { readonly variable: VariableDePalette }
  | { readonly fondDeLaPage: true }
  | { readonly autresPalettes: VariableDePalette };

export interface Garantie {
  readonly numero: number;
  readonly premier: { readonly variable: VariableDePalette };
  readonly fonds: readonly FondDeGarantie[];
  readonly seuil: 'texte' | 'nonTexte';
  readonly portee: 'palette' | 'recette';
}

const FOND_DE_LA_PAGE = { fondDeLaPage: true } as const;
const FONDS_SURFACE: readonly FondDeGarantie[] = [
  { variable: 'surface/default' }, { variable: 'surface/hover' }, { variable: 'surface/pressed' }, FOND_DE_LA_PAGE,
];

export const GARANTIES: readonly Garantie[] = [
  { numero: 1, premier: { variable: 'solid/foreground' }, fonds: [{ variable: 'solid/default' }, { variable: 'solid/hover' }, { variable: 'solid/pressed' }], seuil: 'texte', portee: 'palette' },
  { numero: 2, premier: { variable: 'solid/default' }, fonds: [FOND_DE_LA_PAGE], seuil: 'nonTexte', portee: 'palette' },
  { numero: 3, premier: { variable: 'surface/foreground' }, fonds: FONDS_SURFACE, seuil: 'texte', portee: 'palette' },
  { numero: 4, premier: { variable: 'surface/border' }, fonds: FONDS_SURFACE, seuil: 'nonTexte', portee: 'palette' },
  { numero: 5, premier: { variable: 'page/foreground' }, fonds: [FOND_DE_LA_PAGE], seuil: 'texte', portee: 'palette' },
  { numero: 6, premier: { variable: 'page/border' }, fonds: [FOND_DE_LA_PAGE], seuil: 'nonTexte', portee: 'palette' },
  { numero: 7, premier: { variable: 'page/focus' }, fonds: [FOND_DE_LA_PAGE, { variable: 'surface/default' }], seuil: 'nonTexte', portee: 'palette' },
  { numero: 8, premier: { variable: 'page/focus' }, fonds: [{ autresPalettes: 'surface/default' }], seuil: 'nonTexte', portee: 'recette' },
];

/**
 * Tous les crans doivent être présents dans la liste fournie. Pour une garantie
 * de recette, l'appelant vérifie aussi le fond dans la liste de chaque autre palette.
 */
export function garantieJugeable(garantie: Garantie, crans: readonly number[], sens: SensDuTheme): boolean {
  if (!variablePresente(garantie.premier.variable, crans, sens)) return false;
  return garantie.fonds.every((fond) => {
    if ('fondDeLaPage' in fond) return true;
    return variablePresente('variable' in fond ? fond.variable : fond.autresPalettes, crans, sens);
  });
}

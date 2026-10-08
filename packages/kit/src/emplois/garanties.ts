/** Les sept garanties de contraste du thème, jugées par palette : membres, fonds et seuils. */
import { variablePresente, type SensDuTheme, type VariableDePalette } from './dossiers.js';

export type FondDeGarantie =
  | { readonly variable: VariableDePalette }
  | { readonly fondDeLaPage: true };

export interface Garantie {
  readonly numero: number;
  readonly premier: { readonly variable: VariableDePalette };
  readonly fonds: readonly FondDeGarantie[];
  readonly seuil: 'texte' | 'nonTexte';
}

const FOND_DE_LA_PAGE = { fondDeLaPage: true } as const;
const FONDS_SURFACE: readonly FondDeGarantie[] = [
  { variable: 'surface/default' }, { variable: 'surface/hover' }, { variable: 'surface/pressed' }, FOND_DE_LA_PAGE,
];

export const GARANTIES: readonly Garantie[] = [
  { numero: 1, premier: { variable: 'solid/foreground' }, fonds: [{ variable: 'solid/default' }, { variable: 'solid/hover' }, { variable: 'solid/pressed' }], seuil: 'texte' },
  { numero: 2, premier: { variable: 'solid/default' }, fonds: [FOND_DE_LA_PAGE], seuil: 'nonTexte' },
  { numero: 3, premier: { variable: 'surface/foreground' }, fonds: FONDS_SURFACE, seuil: 'texte' },
  { numero: 4, premier: { variable: 'surface/border' }, fonds: FONDS_SURFACE, seuil: 'nonTexte' },
  { numero: 5, premier: { variable: 'page/foreground' }, fonds: [FOND_DE_LA_PAGE], seuil: 'texte' },
  { numero: 6, premier: { variable: 'page/border' }, fonds: [FOND_DE_LA_PAGE], seuil: 'nonTexte' },
  { numero: 7, premier: { variable: 'page/focus' }, fonds: [FOND_DE_LA_PAGE, { variable: 'surface/default' }], seuil: 'nonTexte' },
];

/** Une garantie se juge quand la liste porte le cran de chacun de ses membres. */
export function garantieJugeable(garantie: Garantie, crans: readonly number[], sens: SensDuTheme): boolean {
  if (!variablePresente(garantie.premier.variable, crans, sens)) return false;
  return garantie.fonds.every((fond) => 'fondDeLaPage' in fond || variablePresente(fond.variable, crans, sens));
}

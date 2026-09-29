/**
 * Les arrondis restent ceux du moteur, qui écrit à la française ; seul le
 * séparateur décimal suit la langue, lu dans le registre.
 */
import { ecrireArrondi, ecrireContraste } from 'ucm-couleur';
import { LANGUES, type Langue } from './langues';

const avecLaDecimale = (texte: string, langue: Langue): string =>
  texte.replace(',', LANGUES.find(({ code }) => code === langue)!.decimale);

export function arrondi(valeur: number, precision: number, langue: Langue): string {
  return avecLaDecimale(ecrireArrondi(valeur, precision), langue);
}

export function contraste(valeur: number, langue: Langue): string {
  return avecLaDecimale(ecrireContraste(valeur), langue);
}

export function pluriel(nombre: number, langue: Langue): Intl.LDMLPluralRule {
  return new Intl.PluralRules(langue).select(nombre);
}

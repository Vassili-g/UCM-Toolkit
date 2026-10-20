/** La grammaire des chemins de l'architecture UCM : un chemin de variable, segment par segment, contre `FORMES_DES_CHEMINS`. */
import { FORMES_DES_CHEMINS, type Collection } from './architecture.js';
import { formeReconnue, termeReconnu } from './reconnaissance.js';

export function cheminConforme(collection: Collection, segments: readonly string[]): boolean {
  if (collection === 'components') return false;
  return FORMES_DES_CHEMINS[collection].some((forme) => forme.length === segments.length && forme.every((position, rang) => {
    const segment = segments[rang];
    if (!segment || segment.trim() !== segment || /[/.]/.test(segment)) return false;
    const forme = formeReconnue(segment);
    if (position.exclues?.some((exclue) => formeReconnue(exclue) === forme)) return false;
    if (position.valeurs) return position.valeurs.some((valeur) => formeReconnue(valeur) === forme);
    return Boolean(termeReconnu(position.registre, segment)) || position.registre.extensible;
  }));
}

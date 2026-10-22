/**
 * La clé du fichier des tokens, rangée dans `ESPACE_ARCHITECT` : le lien « Ouvrir Intencial Tokens » du mode Tokens la lit.
 * Écrire une donnée dans le document est une écriture : elle reste ici. Figma ne sert pas toujours `figma.fileKey`
 * (un plugin en développement ne la reçoit pas) ; sans clé servie, rien n'est écrit.
 */
import { CLES_D_ARCHITECT, ESPACE_ARCHITECT } from '@ucm-kit/core/referentiel';

/** Ce que la clé demande au document. */
export interface PortDeCle {
  readonly fileKey?: string;
  readonly root: {
    getSharedPluginData(espace: string, cle: string): string;
    setSharedPluginData(espace: string, cle: string, valeur: string): void;
  };
}

/**
 * Range la clé servie par Figma et la rend ; rend `null`, sans rien écrire, quand elle n'est pas servie.
 * Une clé déjà rangée à l'identique n'est pas réécrite. Une écriture qui lève rend la clé servie : le rangement est facultatif.
 */
export function rangerLaCleDuFichier(api: PortDeCle): string | null {
  const cle = api.fileKey;
  if (typeof cle !== 'string' || cle === '') return null;
  try {
    if (api.root.getSharedPluginData(ESPACE_ARCHITECT, CLES_D_ARCHITECT.cleDuFichierDesTokens) !== cle) {
      api.root.setSharedPluginData(ESPACE_ARCHITECT, CLES_D_ARCHITECT.cleDuFichierDesTokens, cle);
    }
  } catch { /* le lien reste disponible pour cette session */ }
  return cle;
}

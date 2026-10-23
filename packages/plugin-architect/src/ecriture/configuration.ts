/**
 * La library choisie par le designer, rangée dans le document pour toute l'équipe du fichier : donnée partagée du nœud
 * racine, sous `ESPACE_ARCHITECT`. C'est la seule écriture de la configuration dans le document ; le niveau
 * d'accessibilité, lui, est une préférence personnelle et reste dans `clientStorage`.
 */
import { CLES_D_ARCHITECT, ESPACE_ARCHITECT } from '@ucm-kit/core/referentiel';

/** Ce que le rangement demande au document. */
export interface PortDeLibraryChoisie {
  readonly root: {
    getSharedPluginData(espace: string, cle: string): string;
    setSharedPluginData(espace: string, cle: string, valeur: string): void;
  };
}

/** Le nom de la library rangée, `null` quand il n'y en a pas ou que la lecture lève. */
export function lireLaLibraryRangee(api: PortDeLibraryChoisie): string | null {
  try {
    const texte = api.root.getSharedPluginData(ESPACE_ARCHITECT, CLES_D_ARCHITECT.libraryChoisie);
    return texte === '' ? null : texte;
  } catch {
    return null;
  }
}

/** Range le nom de la library et rend `true` ; rend `false` quand l'écriture lève. Un choix déjà rangé n'est pas réécrit. */
export function rangerLaLibrary(api: PortDeLibraryChoisie, nom: string): boolean {
  try {
    if (api.root.getSharedPluginData(ESPACE_ARCHITECT, CLES_D_ARCHITECT.libraryChoisie) !== nom) {
      api.root.setSharedPluginData(ESPACE_ARCHITECT, CLES_D_ARCHITECT.libraryChoisie, nom);
    }
    return true;
  } catch {
    return false;
  }
}

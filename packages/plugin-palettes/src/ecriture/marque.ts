/**
 * La marque `nommage` : à l'ouverture, Palettes déclare dans le fichier qu'il y nomme ses variables selon les règles
 * d'UCM Nomenclature. UCM Nomenclature la lit pour cesser de protéger les variables de Palettes. Une copie plus ancienne de
 * Palettes ne la pose pas : le fichier qu'elle seule a ouvert garde la protection.
 */
import { CLE_NOMMAGE_DE_PALETTES } from '@ucm-kit/core/referentiel';

import { ESPACE_PARTAGE } from '../lecture';

/** Ce que le rangement touche : la racine du document. */
export interface CibleDeLaMarque {
  readonly root: {
    getSharedPluginData(espace: string, cle: string): string;
    setSharedPluginData(espace: string, cle: string, valeur: string): void;
  };
}

/** Range la marque si elle manque. Un fichier en lecture seule refuse l'écriture : la marque reste absente. */
export function rangerLaMarqueDeNommage(cible: CibleDeLaMarque): void {
  try {
    if (cible.root.getSharedPluginData(ESPACE_PARTAGE, CLE_NOMMAGE_DE_PALETTES) !== '') return;
    cible.root.setSharedPluginData(ESPACE_PARTAGE, CLE_NOMMAGE_DE_PALETTES, JSON.stringify({ version: 1 }));
  } catch {
    // Pas d'écriture possible : UCM Nomenclature garde alors la protection.
  }
}

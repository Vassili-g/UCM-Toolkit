/** Le relevé téléchargeable contient les écritures observées et les noms laissés en place. */
import type { ResultatApplication } from '../ecriture';

export function preparerTelechargementRenommages(resultat: ResultatApplication): { nom: string; contenu: string; type: string } {
  return { nom: 'ucm-architect-renommages.json', type: 'application/json', contenu: JSON.stringify(resultat, null, 2) + '\n' };
}

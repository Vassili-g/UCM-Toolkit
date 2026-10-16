/** Le relevé téléchargeable contient les écritures observées et les noms laissés en place. */
import type { ResultatApplication } from '../ecriture';

export function preparerTelechargementRenommages(resultat: ResultatApplication): { nom: string; contenu: string; type: string } {
  return { nom: 'ucm-architect-renommages.json', type: 'application/json', contenu: JSON.stringify(resultat, null, 2) + '\n' };
}

/** Le fichier proposé au designer, par un lien vers un blob ; rien ne quitte le poste. */
export function telecharger(nom: string, contenu: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  document.body.append(lien);
  lien.click();
  document.body.removeChild(lien);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

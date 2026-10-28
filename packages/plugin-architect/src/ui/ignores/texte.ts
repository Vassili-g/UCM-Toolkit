/** Un texte de l'onglet À faire ou Questions posé dans un élément : les mots cités en code, les variants et les chemins de token en phrase. */
import { creerCheminEnPhrase, creerVariantEnPhrase } from 'ucm-plugin-socle/src/ui/Chemin';

import { creerPuces, type MorceauDeLieu, type VariantDuJeu } from '../composant/variants';
import { morceauxDuTexte } from './modele';

export function poserLeTexteEnrichi(parent: Element | DocumentFragment, texte: string): void {
  for (const morceau of morceauxDuTexte(texte)) {
    if (typeof morceau === 'string') parent.append(morceau);
    else if ('code' in morceau) {
      const code = document.createElement('code');
      code.className = 'mot-cite';
      code.textContent = morceau.code;
      parent.append(code);
    } else if ('variant' in morceau) parent.append(creerVariantEnPhrase(morceau.variant));
    else parent.append(creerCheminEnPhrase(morceau.chemin));
  }
}

/** Une ligne de lieu : le texte enrichi, et les puces là où le modèle en met. */
export function poserLeLieuEnrichi(parent: Element | DocumentFragment, morceaux: readonly MorceauDeLieu[], jeu: readonly VariantDuJeu[]): void {
  for (const morceau of morceaux) {
    if (typeof morceau === 'string') poserLeTexteEnrichi(parent, morceau);
    else parent.append(creerPuces(morceau.puces, jeu));
  }
}

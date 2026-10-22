/**
 * La copie dans le presse-papiers. Le succès ne s'annonce qu'après une copie
 * réussie ; un refus laisse le texte dans une zone sélectionnable, que la vue
 * affiche au designer.
 *
 * Dans l'iframe d'un plugin Figma, `navigator.clipboard` est souvent refusé :
 * `execCommand('copy')` sur une zone de texte sélectionnée est le second essai.
 */

export type IssueDeCopie = 'copie' | 'refusee';

/** Copie le texte ; rend `refusee` quand aucune des deux voies n'a abouti. */
export async function copierTexte(texte: string): Promise<IssueDeCopie> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(texte);
      return 'copie';
    }
  } catch {
    // Le second essai suit.
  }
  const zone = document.createElement('textarea');
  zone.value = texte;
  zone.setAttribute('readonly', '');
  zone.className = 'zone-hors-champ';
  document.body.append(zone);
  zone.select();
  let reussie = false;
  try {
    reussie = document.execCommand('copy');
  } catch {
    reussie = false;
  }
  zone.remove();
  return reussie ? 'copie' : 'refusee';
}

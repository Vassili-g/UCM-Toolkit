/**
 * La largeur affichée d'un graphe, suivie pour qu'il se redessine à sa
 * colonne sans grandir (Z8) : ses textes et ses traits gardent la taille
 * qu'ils ont dans la fenêtre minimale, seules ses colonnes s'étirent.
 */

/**
 * Appelle `surLargeur` à chaque largeur nouvelle de `element`. Le navigateur
 * rend un `ResizeObserver` une fois par image au plus, après la mise en page
 * et avant la peinture : le redessin se peint dans l'image où la largeur a
 * changé, et le premier dessin, fait avant toute mesure, ne se voit jamais.
 * Une largeur nulle, celle d'un élément caché ou d'une carte repliée, ne
 * déclenche rien : la largeur se relit à l'ouverture.
 */
export function suivreLaLargeur(element: Element, surLargeur: (largeur: number) => void): void {
  let derniere = 0;
  new ResizeObserver((entrees) => {
    const largeur = entrees[entrees.length - 1].contentRect.width;
    if (largeur <= 0 || largeur === derniere) return;
    derniere = largeur;
    surLargeur(largeur);
  }).observe(element);
}

/**
 * La poignée entre deux vues côte à côte : un trait de points sur une bande de
 * 7 px, que le plugin tire à la souris. Le geste est celui du plugin ; ce
 * fichier ne dessine que la poignée. Celle de `ResizeGrip.ts` règle la fenêtre.
 */
export function creerPoigneeDeSeparation(etiquette: string): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'arch-poignee';
  element.setAttribute('role', 'separator');
  element.setAttribute('aria-orientation', 'vertical');
  element.setAttribute('aria-label', etiquette);
  return element;
}

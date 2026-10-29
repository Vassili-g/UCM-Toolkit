/** Un terme de Figma cité dans une phrase, comme un scope : le signal `terme-figma` du langage visuel. */
export function creerTermeFigma(terme: string): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'terme-figma';
  element.textContent = terme;
  return element;
}

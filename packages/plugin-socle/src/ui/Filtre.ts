/**
 * Les signaux de filtre : une puce dans le champ pour un filtre, du texte et
 * une bordure bleue pour une recherche qu'un lien du plugin a posée. Les
 * classes viennent de `langage.css`.
 */

/** Un filtre posé sous les onglets ; `libelleDeLaCroix` nomme le geste qui l'enlève. */
export function creerPuceFiltre(type: string, valeur: string, libelleDeLaCroix: string, onEnlever?: () => void): HTMLSpanElement {
  const element = document.createElement('span');
  element.className = 'puce-filtre';
  const nom = document.createElement('span');
  nom.className = 'puce-type';
  nom.textContent = type;
  const croix = document.createElement('span');
  croix.className = 'puce-x';
  croix.setAttribute('aria-label', libelleDeLaCroix);
  croix.textContent = '×';
  if (onEnlever) croix.addEventListener('click', onEnlever);
  element.append(nom, valeur, croix);
  return element;
}

/** Le champ de recherche dont le texte vient d'un lien du plugin : bordure bleue. */
export function creerRechercheActive(valeur: string, etiquette: string): HTMLInputElement {
  const champ = document.createElement('input');
  champ.type = 'search';
  champ.className = 'input recherche-active';
  champ.value = valeur;
  champ.setAttribute('aria-label', etiquette);
  return champ;
}

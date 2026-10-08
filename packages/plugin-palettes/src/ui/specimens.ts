/**
 * Le spécimen d'une variable ([UI-09], [UI-10]) : la forme que la couleur
 * prend dans une interface, peinte avec les couleurs mesurées. Un bouton porte
 * son texte des boutons, blanc ou noir purs, jamais le fond de la page ; un
 * texte coloré s'écrit en un mot, une bordure se pose sur un cadre, un anneau
 * de focus est un contour décalé, un fond teinté un aplat.
 */
import { memoriserVues, type Localisation } from './localisation';

/** Ce que le spécimen dessine : un bouton, un texte, un aplat, un cadre à bordure ou un anneau de focus. */
export type FormeDeSpecimen = 'solid' | 'text' | 'surface' | 'border' | 'focus';

function construireVues(i18n: Localisation) {
  const { TEXTES_DES_GARANTIES } = i18n.messages;

  const rgb = (couleur: readonly number[]): string => `rgb(${couleur.join(', ')})`;

  /**
   * Un spécimen posé sur `fond` : `couleur` est celle de la variable, `texte`
   * le texte des boutons que le bouton porte (blanc ou noir purs).
   */
  function specimenDuRole(forme: FormeDeSpecimen, couleur: readonly number[], fond: readonly number[], texte?: readonly number[]): HTMLSpanElement {
    const cadre = document.createElement('span');
    cadre.className = 'specimen-cadre';
    cadre.style.background = rgb(fond);
    const element = document.createElement('span');
    element.className = 'specimen-forme';
    element.dataset.role = forme;
    element.setAttribute('aria-hidden', 'true');
    if (forme === 'solid') {
      element.style.background = rgb(couleur);
      if (texte) element.style.color = rgb(texte);
      i18n.lier(element, 'textContent', TEXTES_DES_GARANTIES.specimenBouton);
    } else if (forme === 'text') {
      element.style.color = rgb(couleur);
      i18n.lier(element, 'textContent', TEXTES_DES_GARANTIES.specimenTexte);
    } else if (forme === 'focus') {
      element.style.outlineColor = rgb(couleur);
    } else if (forme === 'surface') {
      element.style.background = rgb(couleur);
    } else {
      element.style.borderColor = rgb(couleur);
    }
    cadre.append(element);
    return cadre;
  }
  return { specimenDuRole };
}

export const creerVuesSpecimens = memoriserVues(construireVues);

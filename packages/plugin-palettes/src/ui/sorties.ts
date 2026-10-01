/**
 * Les lignes de sortie d'une fiche de Gestion ([UI-26]) : une ligne par
 * sortie de la palette, avec son nom, une pastille d'état, un détail et ses
 * gestes au bord droit. Le détail trop long se coupe par une ellipse, et son
 * texte entier se lit au survol.
 */
import type { Localisation, Texte } from './localisation';

export interface LigneDeSortie {
  /** La sortie que la ligne suit, lue par les gestes et les tests : `planche` ou `tokens`. */
  readonly sortie: 'planche' | 'tokens';
  readonly nom: Texte;
  /** Le code de l'état, qui choisit la couleur de la pastille. */
  readonly etat: string;
  readonly libelle: Texte;
  readonly detail: Texte;
  readonly gestes: readonly HTMLElement[];
}

export function ligneDeSortie(ligne: LigneDeSortie, i18n: Localisation): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'sortie';
  element.dataset.sortie = ligne.sortie;
  const nom = document.createElement('span');
  nom.className = 'sortie-nom';
  i18n.lier(nom, 'textContent', ligne.nom);
  const etat = document.createElement('span');
  etat.className = 'pastille-d-etat';
  etat.dataset.etat = ligne.etat;
  i18n.lier(etat, 'textContent', ligne.libelle);
  const detail = document.createElement('span');
  detail.className = 'sortie-detail ligne-secondaire';
  i18n.lier(detail, 'textContent', ligne.detail);
  i18n.lier(detail, 'title', ligne.detail);
  const gestes = document.createElement('span');
  gestes.className = 'sortie-gestes';
  gestes.append(...ligne.gestes);
  element.append(nom, etat, detail, gestes);
  return element;
}

/** Les lignes de sortie d'une fiche, sous un filet. */
export function lignesDeSortie(lignes: readonly LigneDeSortie[], i18n: Localisation): HTMLDivElement {
  const element = document.createElement('div');
  element.className = 'sorties';
  element.append(...lignes.map((ligne) => ligneDeSortie(ligne, i18n)));
  return element;
}

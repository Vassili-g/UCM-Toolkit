/** Les éléments que les vues des onglets partagent : titre, note et lien vers une variable. */
import { nomComplet } from '../../copie';
import type { Application } from '../application';

export function titreDeVue(texte: string): HTMLHeadingElement {
  const titre = document.createElement('h2');
  titre.className = 'vue-titre';
  titre.textContent = texte;
  return titre;
}

export function note(texte: string): HTMLParagraphElement {
  const element = document.createElement('p');
  element.className = 'note';
  element.textContent = texte;
  return element;
}

/** Un bouton qui suit une variable, ou l'inspecte sans quitter la vue ; son survol montre sa chaîne. */
export function lienVersVariable(app: Application, variable: string, texte?: string, geste: 'suivre' | 'inspecter' = 'suivre'): HTMLButtonElement {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'lien';
  bouton.textContent = texte ?? (app.etat.index ? nomComplet(app.etat.index, variable) : variable);
  bouton.dataset.chaine = variable;
  bouton.dataset.mode = '';
  bouton.addEventListener('click', () => (geste === 'suivre' ? app.suivre(variable) : app.inspecter(variable)));
  return bouton;
}

/** Une liste à puces d'éléments déjà construits. */
export function liste(elements: readonly HTMLElement[]): HTMLUListElement {
  const ul = document.createElement('ul');
  ul.className = 'liens';
  for (const element of elements) {
    const li = document.createElement('li');
    li.append(element);
    ul.append(li);
  }
  return ul;
}

export function boutonDiscret(texte: string, action: () => void): HTMLButtonElement {
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'bouton-discret';
  bouton.textContent = texte;
  bouton.addEventListener('click', action);
  return bouton;
}

/**
 * Un champ de fichier derrière un bouton du catalogue : le bouton natif
 * affiche le texte du navigateur, dans sa langue.
 */
export function choixDeFichier(champ: HTMLInputElement, libelle: string): HTMLElement {
  const conteneur = document.createElement('div');
  conteneur.className = 'choix-de-fichier';
  champ.hidden = true;
  conteneur.append(boutonDiscret(libelle, () => champ.click()), champ);
  return conteneur;
}

/**
 * Le dépliant « Réglages avancés » de la carte « Configuration de la palette »
 * (recette v8, R7) : modèle, intensités et « Référence exacte dans » y sont
 * rangés, pour que l'aperçu remonte. Sa tête est un bouton qui porte le
 * chevron, le titre et, à droite, un résumé des réglages ; le résumé prend la
 * couleur d'attention quand un réglage s'écarte de sa valeur par défaut. Replié
 * à l'ouverture du plugin ; son état ouvert dure autant que l'élément, donc la
 * session, comme celui des cartes « Réglage global » et « Color shift » : il
 * survit au changement de palette, qui ne fait que redessiner son contenu.
 */
import type { Localisation, Texte } from './localisation';

export interface ReglagesAvancesUi {
  readonly element: HTMLElement;
  /** Le corps du dépliant, où se posent les contrôles. */
  readonly corps: HTMLDivElement;
  /** Le résumé de la tête, et si un réglage diffère de sa valeur par défaut. */
  poserResume(texte: Texte, signale: boolean): void;
  estOuvert(): boolean;
}

let compteur = 0;

export function createReglagesAvances(titre: Texte, i18n: Localisation): ReglagesAvancesUi {
  const element = document.createElement('div');
  element.className = 'reglages-avances';
  compteur += 1;
  const corps = document.createElement('div');
  corps.className = 'reglages-avances-corps';
  corps.id = `reglages-avances-corps-${compteur}`;
  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'reglages-avances-bascule';
  bouton.setAttribute('aria-controls', corps.id);
  const chevron = document.createElement('span');
  chevron.className = 'carte-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  const intitule = document.createElement('span');
  intitule.className = 'reglages-avances-titre';
  i18n.lier(intitule, 'textContent', titre);
  const resume = document.createElement('span');
  resume.className = 'reglages-avances-resume';
  bouton.append(chevron, intitule, resume);
  element.append(bouton, corps);

  let ouvert = false;
  function rendre(): void {
    corps.hidden = !ouvert;
    element.dataset.ouvert = String(ouvert);
    bouton.setAttribute('aria-expanded', String(ouvert));
  }
  bouton.addEventListener('click', () => {
    ouvert = !ouvert;
    rendre();
  });
  rendre();

  return {
    element,
    corps,
    poserResume(texte, signale) {
      i18n.lier(resume, 'textContent', texte);
      i18n.lier(resume, 'title', texte);
      resume.dataset.signale = String(signale);
    },
    estOuvert: () => ouvert,
  };
}

/**
 * Une section repliable de l'onglet Gestion ([UI-36]) : un filet la sépare de
 * la section d'avant, et son en-tête porte un bouton à chevron avec le titre,
 * puis un compte en pastille. Repliée, elle montre un résumé au bord droit de
 * l'en-tête, sur une ligne.
 */
import type { SectionDeGestion } from '../preferences';
import type { Localisation, Texte } from './localisation';

export interface OptionsDeSection {
  readonly code: SectionDeGestion;
  readonly titre: Texte;
  readonly ouverte: boolean;
  /** Le clic du designer sur l'en-tête ; `ouvrir()` ne l'appelle pas. */
  surBascule(ouverte: boolean): void;
}

export interface SectionUi {
  readonly element: HTMLElement;
  /** Le bouton de l'en-tête, qui reçoit le focus quand un geste de la section repliée le perd. */
  readonly bascule: HTMLButtonElement;
  readonly corps: HTMLDivElement;
  /** Le nombre d'éléments de la section ; `null` retire la pastille. */
  poserLeCompte(nombre: number | null): void;
  poserLeResume(contenu: readonly (Node | string)[]): void;
  estOuverte(): boolean;
  /** Déplie la section sans ranger ce choix : il ne vient pas du designer. */
  ouvrir(): void;
}

export function createSection(options: OptionsDeSection, i18n: Localisation): SectionUi {
  const element = document.createElement('section');
  element.className = 'section';
  element.dataset.section = options.code;
  i18n.lier(element, 'aria-label', options.titre);
  const corps = document.createElement('div');
  corps.className = 'section-corps';
  corps.id = `section-${options.code}`;

  const bascule = document.createElement('button');
  bascule.type = 'button';
  bascule.className = 'section-bascule';
  bascule.setAttribute('aria-controls', corps.id);
  const chevron = document.createElement('span');
  chevron.className = 'carte-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  bascule.append(chevron, i18n.noeud(options.titre));
  const titre = document.createElement('h2');
  titre.className = 'section-titre';
  titre.append(bascule);
  const compte = document.createElement('span');
  compte.className = 'section-compte';
  compte.hidden = true;
  const resume = document.createElement('span');
  resume.className = 'section-resume';
  const tete = document.createElement('div');
  tete.className = 'section-tete';
  tete.append(titre, compte, resume);
  element.append(tete, corps);

  let ouverte = options.ouverte;

  function rendre(): void {
    corps.hidden = !ouverte;
    resume.hidden = ouverte || resume.childNodes.length === 0;
    element.dataset.ouverte = String(ouverte);
    bascule.setAttribute('aria-expanded', String(ouverte));
  }
  bascule.addEventListener('click', () => {
    ouverte = !ouverte;
    rendre();
    options.surBascule(ouverte);
  });
  rendre();

  return {
    element,
    bascule,
    corps,
    poserLeCompte(nombre) {
      compte.hidden = nombre === null;
      compte.textContent = nombre === null ? '' : String(nombre);
    },
    poserLeResume(contenu) {
      resume.replaceChildren(...contenu);
      rendre();
    },
    estOuverte: () => ouverte,
    ouvrir() {
      ouverte = true;
      rendre();
    },
  };
}

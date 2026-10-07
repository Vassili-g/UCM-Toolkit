/**
 * Une carte de la configuration d'une palette (`[UI-09]` à `[UI-12]`) : fond
 * secondaire, bordure du socle, titre de carte. Une carte repliable a pour
 * en-tête un conteneur, qui porte un bouton de repli puis, à droite, les choix
 * que `poserLesChoix` lui donne. Le bouton porte le chevron, le glyphe
 * ([UI-19]), le titre et son sous-titre, et un résumé aligné à droite, sur une
 * ligne : un résumé trop long se coupe par une ellipse, et son texte entier se
 * lit au survol ([UI-20]). Les choix restent hors du bouton, qu'un bouton ne
 * peut pas contenir : carte repliée, ils sont cachés et le résumé se lit ;
 * carte ouverte, ils se lisent et le résumé est caché. Son état ouvert dure
 * autant que l'élément, donc la session.
 */
import type { Localisation, Texte } from './localisation';

export interface OptionsDeCarte {
  readonly titre: Texte;
  /**
   * Une carte repliable, et son état à l'ouverture du plugin. `resumeReplie`
   * cache le résumé carte ouverte, quand le corps dit déjà tout ce que le
   * résumé reprend ; sans cela, seule une carte qui porte des choix le cache.
   */
  readonly repliable?: { readonly ouverte: boolean; readonly resumeReplie?: boolean };
  /** Une ligne sous le titre, qui dit ce que la carte règle ([UI-12]). */
  readonly sousTitre?: Texte;
  /** Le dessin posé à gauche du titre ([UI-19]). */
  readonly glyphe?: Element;
}

export interface CarteUi {
  readonly element: HTMLElement;
  /** L'en-tête ; une carte fixe y reçoit ses contrôles à droite du titre. */
  readonly tete: HTMLElement;
  readonly corps: HTMLDivElement;
  /** Le texte à droite du titre, ou dans l'en-tête replié. */
  poserResume(texte: Texte): void;
  /**
   * Pose les choix de la carte dans son en-tête, à droite du bouton de repli,
   * une seule fois. Un clic sur un choix ne replie pas la carte.
   */
  poserLesChoix(...choix: readonly { readonly element: HTMLElement }[]): void;
  ouvrir(): void;
  /** Replie la carte : les actions de `surBascule` reçoivent `false`. Sans effet sur une carte fixe ou déjà repliée. */
  replier(): void;
  /** Donne le focus au bouton de repli ; sans effet sur une carte fixe. */
  focaliser(): void;
  estOuverte(): boolean;
  /** Une carte repliable désactivée reste fermée, et son en-tête dit pourquoi. */
  desactiver(raison: Texte | null): void;
  /** Un geste sur l'en-tête qui ouvre ou replie la carte. */
  surBascule(action: (ouverte: boolean) => void): void;
}

let compteur = 0;

export function createCarte(options: OptionsDeCarte, i18n: Localisation): CarteUi {
  const element = document.createElement('section');
  element.className = 'carte';
  const corps = document.createElement('div');
  corps.className = 'carte-corps';
  compteur += 1;
  corps.id = `carte-corps-${compteur}`;
  const titre = document.createElement('h3');
  titre.className = 'carte-titre';
  i18n.lier(titre, 'textContent', options.titre);
  const resume = document.createElement('span');
  resume.className = 'carte-resume';
  resume.hidden = true;
  i18n.lier(element, 'aria-label', options.titre);
  // Le titre et son sous-titre forment l'intitulé ; sans sous-titre, le titre reste seul.
  let intitule: HTMLElement = titre;
  if (options.sousTitre) {
    intitule = document.createElement('span');
    intitule.className = 'carte-intitule';
    const sousTitre = document.createElement('span');
    sousTitre.className = 'carte-sous-titre';
    i18n.lier(sousTitre, 'textContent', options.sousTitre);
    intitule.append(titre, sousTitre);
  }
  const avantLeTitre: Element[] = options.glyphe ? [options.glyphe] : [];

  let ouverte = options.repliable?.ouverte ?? true;
  const actions: ((ouverte: boolean) => void)[] = [];

  let tete: HTMLElement;
  let bouton: HTMLButtonElement | null = null;
  if (options.repliable) {
    bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'carte-bascule';
    bouton.setAttribute('aria-controls', corps.id);
    const chevron = document.createElement('span');
    chevron.className = 'carte-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    bouton.append(chevron, ...avantLeTitre, intitule, resume);
    bouton.addEventListener('click', () => changer(!ouverte));
    tete = document.createElement('div');
    tete.className = 'carte-tete carte-tete-repliable';
    tete.append(bouton);
  } else {
    tete = document.createElement('div');
    tete.className = 'carte-tete';
    tete.append(...avantLeTitre, intitule, resume);
  }
  if (options.repliable?.resumeReplie) element.dataset.resumeReplie = 'true';
  element.append(tete, corps);

  let desactivee = false;

  /** Pose l'état voulu ; les actions ne partent que si l'état change. */
  function changer(suivante: boolean): void {
    if (ouverte === suivante) return;
    ouverte = suivante;
    rendre();
    for (const action of actions) action(ouverte);
  }

  function rendre(): void {
    corps.hidden = !ouverte || desactivee;
    element.dataset.ouverte = String(ouverte && !desactivee);
    if (bouton) bouton.setAttribute('aria-expanded', String(ouverte && !desactivee));
  }
  rendre();

  return {
    element,
    tete,
    corps,
    poserResume(texte) {
      i18n.lier(resume, 'textContent', texte);
      i18n.lier(resume, 'title', texte);
      resume.hidden = texte === '';
    },
    poserLesChoix(...choix) {
      const emplacement = document.createElement('div');
      emplacement.className = 'carte-choix';
      emplacement.append(...choix.map(({ element: choisi }) => choisi));
      tete.append(emplacement);
      element.dataset.avecChoix = 'true';
    },
    ouvrir: () => changer(true),
    replier: () => changer(false),
    focaliser: () => bouton?.focus(),
    estOuverte: () => ouverte && !desactivee,
    desactiver(raison) {
      desactivee = raison !== null;
      if (bouton) {
        bouton.disabled = desactivee;
        i18n.lier(bouton, 'title', raison ?? '');
      }
      rendre();
    },
    surBascule(action) {
      actions.push(action);
    },
  };
}

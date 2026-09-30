/**
 * Une ligne fixe ([UI-17]) : un message sur une ligne de 24 px, qui ne change
 * jamais de hauteur. Son texte se coupe par une ellipse ; le texte entier est
 * dans `title` et dans le nom accessible, et un clic l'ouvre dans une bulle
 * posée par-dessus les cartes. Présente même sans message, elle dit l'état
 * neutre ou garde sa place vide : un message qui paraît pendant un geste ne
 * déplace aucun contrôle ([UI-20]).
 */
import { memoriserVues, lireTexte, type Localisation, type Texte } from './localisation';

/** Le ton d'une ligne. Sa couleur ne dit que la sévérité, et son icône la redit sans couleur ([VER-14]). */
export type TonDeLaLigne = 'neutre' | 'avertissement' | 'danger' | 'butee';

const ICONES: Record<TonDeLaLigne, string> = { neutre: '', avertissement: '!', danger: '✗', butee: '⊣' };

/** L'écart entre la ligne et sa bulle, et entre la bulle et le bord de la fenêtre. */
const ECART = 4;
const MARGE = 8;

export interface LigneFixeUi {
  readonly element: HTMLDivElement;
  /**
   * Pose le texte, son ton et les gestes qui le suivent. Les gestes sont des
   * contrôles de l'appelant : la ligne ne les recrée pas, et un geste déjà en
   * place garde son focus.
   */
  poser(texte: Texte, ton?: TonDeLaLigne, gestes?: readonly HTMLElement[]): void;
}

function construireVues(i18n: Localisation) {
  /*
   * Une seule bulle pour toute l'interface : en ouvrir une referme l'autre.
   * Échap, un clic ailleurs, le défilement et un changement de taille la
   * ferment.
   */
  const bulle = document.createElement('div');
  bulle.className = 'bulle-de-ligne';
  bulle.id = 'bulle-de-ligne';
  bulle.setAttribute('role', 'status');
  bulle.hidden = true;
  let ouvreur: HTMLButtonElement | null = null;

  function fermer(): void {
    if (bulle.hidden) return;
    bulle.hidden = true;
    ouvreur?.setAttribute('aria-expanded', 'false');
    ouvreur = null;
  }

  function ouvrir(bouton: HTMLButtonElement, texte: Texte): void {
    if (!bulle.isConnected) document.body.append(bulle);
    ouvreur?.setAttribute('aria-expanded', 'false');
    ouvreur = bouton;
    bouton.setAttribute('aria-expanded', 'true');
    i18n.lier(bulle, 'textContent', texte);
    bulle.hidden = false;
    // La bulle se pose sous la ligne, alignée sur son bord, et passe au-dessus quand la fenêtre manque dessous.
    const ligne = bouton.getBoundingClientRect();
    const largeur = Math.min(Math.max(ligne.width, 240), window.innerWidth - 2 * MARGE);
    bulle.style.width = `${largeur}px`;
    bulle.style.left = `${Math.min(Math.max(MARGE, ligne.left), window.innerWidth - MARGE - largeur)}px`;
    const hauteur = bulle.getBoundingClientRect().height;
    const dessous = ligne.bottom + ECART;
    bulle.style.top = `${dessous + hauteur <= window.innerHeight - MARGE ? dessous : Math.max(MARGE, ligne.top - ECART - hauteur)}px`;
  }

  document.addEventListener('keydown', (evenement) => {
    if (evenement.key !== 'Escape' || bulle.hidden) return;
    const retour = ouvreur;
    fermer();
    retour?.focus();
  });
  document.addEventListener('pointerdown', (evenement) => {
    const cible = evenement.target as Node | null;
    if (cible && (bulle.contains(cible) || ouvreur?.contains(cible))) return;
    fermer();
  }, true);
  window.addEventListener('scroll', fermer, true);
  window.addEventListener('resize', fermer);

  function createLigneFixe(): LigneFixeUi {
    const element = document.createElement('div');
    element.className = 'ligne-fixe';
    element.dataset.ton = 'neutre';
    const icone = document.createElement('span');
    icone.className = 'ligne-fixe-icone';
    icone.setAttribute('aria-hidden', 'true');
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'ligne-fixe-texte';
    bouton.setAttribute('aria-expanded', 'false');
    bouton.setAttribute('aria-controls', bulle.id);
    const gestesDeLaLigne = document.createElement('span');
    gestesDeLaLigne.className = 'ligne-fixe-gestes';
    element.append(icone, bouton, gestesDeLaLigne);

    let texteCourant: Texte = '';
    bouton.addEventListener('click', () => {
      if (ouvreur === bouton) fermer();
      else ouvrir(bouton, texteCourant);
    });

    return {
      element,
      poser(texte, ton = 'neutre', gestes = []) {
        texteCourant = texte;
        element.dataset.ton = ton;
        icone.textContent = ICONES[ton];
        i18n.lier(bouton, 'textContent', texte);
        i18n.lier(bouton, 'title', texte);
        bouton.disabled = lireTexte(texte) === '';
        if (bouton.disabled && ouvreur === bouton) fermer();
        else if (ouvreur === bouton) i18n.lier(bulle, 'textContent', texte);
        const actuels = Array.from(gestesDeLaLigne.children);
        if (actuels.length !== gestes.length || actuels.some((geste, rang) => geste !== gestes[rang])) gestesDeLaLigne.replaceChildren(...gestes);
      },
    };
  }

  return { createLigneFixe };
}

export const creerVuesLigneFixe = memoriserVues(construireVues);

/**
 * Le pied de l'onglet Création ([UI-18]) : sous le contenu défilant, une ligne
 * qui porte le bilan de la palette ouverte, le compte de ses garanties et de
 * ses alertes, son premier message et « Vérifier », qui ouvre l'onglet
 * Vérification sur la palette. Le pied ne change jamais de hauteur, et une
 * région `aria-live` n'annonce le bilan qu'à la fin d'un geste ([UI-20]).
 */
import { type Message } from './constats';
import { memoriserVues, lireTexte, type Localisation, type Texte } from './localisation';

/** Ce que le pied résume de la palette ouverte. */
export interface BilanDuPied {
  /** Le nombre de contrôles évalués, un par paire, mode et intensité ([VER-06]) ; 0 pour une palette libre. */
  readonly garanties: number;
  readonly manquees: number;
  readonly libre: boolean;
  /** Tous les messages de la palette, dans l'ordre des sévérités : promesses, alertes, informations. */
  readonly messages: readonly Message[];
}

export interface PiedDeLaPaletteUi {
  readonly element: HTMLDivElement;
  /** `finDuGeste` : le bilan s'annonce au lecteur d'écran, s'il a changé depuis la dernière annonce. */
  afficher(bilan: BilanDuPied, finDuGeste: boolean): void;
}

function construireVues(i18n: Localisation) {
  const { TEXTES_DU_PIED, bilanDuPied } = i18n.messages;

  /** `verifier` ouvre l'onglet Vérification sur la palette ouverte. */
  function createPiedDeLaPalette(verifier: () => void): PiedDeLaPaletteUi {
    const element = document.createElement('div');
    element.className = 'pied-de-la-palette';
    element.setAttribute('role', 'region');
    i18n.lier(element, 'aria-label', TEXTES_DU_PIED.region);
    element.dataset.ton = 'succes';

    const icone = document.createElement('span');
    icone.className = 'pied-icone';
    icone.setAttribute('aria-hidden', 'true');
    const texte = document.createElement('span');
    texte.className = 'pied-texte';
    const versLaVerification = document.createElement('button');
    versLaVerification.type = 'button';
    versLaVerification.className = 'bouton-discret';
    i18n.lier(versLaVerification, 'textContent', TEXTES_DU_PIED.verifier);
    versLaVerification.addEventListener('click', verifier);
    // Le bilan annoncé, hors de la vue : il ne change qu'à la fin d'un geste.
    const annonce = document.createElement('span');
    annonce.className = 'pied-annonce';
    annonce.setAttribute('aria-live', 'polite');

    element.append(icone, texte, versLaVerification, annonce);

    let dernierAnnonce = '';

    return {
      element,
      afficher(bilan, finDuGeste) {
        const alertes = bilan.messages.filter((message) => message.severite === 'alerte').length;
        const resume = bilanDuPied(bilan.garanties, bilan.manquees, alertes, bilan.libre);
        const premier = bilan.messages[0]?.constat.ou;
        const ligne: Texte = premier ? i18n.composer`${resume} · ${premier}` : resume;
        const ton = bilan.manquees > 0 ? 'danger' : alertes > 0 ? 'avertissement' : 'succes';
        element.dataset.ton = ton;
        icone.textContent = ton === 'danger' ? '✗' : ton === 'avertissement' ? '!' : '✓';
        i18n.lier(texte, 'textContent', ligne);
        i18n.lier(texte, 'title', ligne);
        if (finDuGeste && lireTexte(resume) !== dernierAnnonce) {
          dernierAnnonce = lireTexte(resume);
          i18n.lier(annonce, 'textContent', resume);
        }
      },
    };
  }

  return { createPiedDeLaPalette };
}

export const creerVuesPiedDeLaPalette = memoriserVues(construireVues);

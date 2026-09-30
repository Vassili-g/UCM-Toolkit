/**
 * Le pied de l'onglet Création ([UI-18]) : sous le contenu défilant, une ligne
 * qui porte le bilan de la palette ouverte, le compte de ses garanties et de
 * ses alertes, son premier message et « Détails ». « Détails » ouvre un volet
 * superposé, de hauteur fixe, qui liste les messages par sévérité avec leurs
 * liens ([VER-15]) ; Échap et « Fermer » le referment. Le pied ne change
 * jamais de hauteur, et une région `aria-live` n'annonce le bilan qu'à la fin
 * d'un geste ([UI-20]).
 */
import type { CibleDAction } from '../presentation';
import { type Message } from './constats';
import { creerVuesConstats } from './constats';
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
  /** Referme le volet sans déplacer le focus : un lien y mène à un réglage de l'onglet. */
  fermer(): void;
}

function construireVues(i18n: Localisation) {
  const { listeDesMessages } = creerVuesConstats(i18n);
  const { TEXTES_DU_PIED, bilanDuPied } = i18n.messages;

  function createPiedDeLaPalette(ouvrir: (cible: CibleDAction) => void): PiedDeLaPaletteUi {
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
    const details = document.createElement('button');
    details.type = 'button';
    details.className = 'bouton-discret';
    details.setAttribute('aria-expanded', 'false');
    i18n.lier(details, 'textContent', TEXTES_DU_PIED.details);
    // Le bilan annoncé, hors de la vue : il ne change qu'à la fin d'un geste.
    const annonce = document.createElement('span');
    annonce.className = 'pied-annonce';
    annonce.setAttribute('aria-live', 'polite');

    const volet = document.createElement('div');
    volet.className = 'volet-de-la-palette';
    volet.id = 'volet-de-la-palette';
    volet.setAttribute('role', 'dialog');
    i18n.lier(volet, 'aria-label', TEXTES_DU_PIED.titre);
    volet.hidden = true;
    details.setAttribute('aria-controls', volet.id);
    const teteDuVolet = document.createElement('div');
    teteDuVolet.className = 'volet-tete';
    const titre = document.createElement('strong');
    i18n.lier(titre, 'textContent', TEXTES_DU_PIED.titre);
    const fermer = document.createElement('button');
    fermer.type = 'button';
    fermer.className = 'bouton-discret';
    i18n.lier(fermer, 'textContent', TEXTES_DU_PIED.fermer);
    teteDuVolet.append(titre, fermer);
    const corpsDuVolet = document.createElement('div');
    corpsDuVolet.className = 'volet-corps';
    volet.append(teteDuVolet, corpsDuVolet);
    element.append(icone, texte, details, annonce, volet);

    function basculer(ouvert: boolean): void {
      volet.hidden = !ouvert;
      details.setAttribute('aria-expanded', String(ouvert));
      if (ouvert) fermer.focus();
    }
    details.addEventListener('click', () => basculer(volet.hidden));
    fermer.addEventListener('click', () => {
      basculer(false);
      details.focus();
    });
    volet.addEventListener('keydown', (evenement) => {
      if (evenement.key !== 'Escape') return;
      evenement.preventDefault();
      basculer(false);
      details.focus();
    });

    let dernierAnnonce = '';

    return {
      element,
      fermer: () => basculer(false),
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
        corpsDuVolet.replaceChildren(bilan.messages.length > 0 ? listeDesMessages(bilan.messages, ouvrir) : i18n.noeud(TEXTES_DU_PIED.aucun));
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

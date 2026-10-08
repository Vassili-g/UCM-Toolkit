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
  /** Le nombre de contrôles évalués, un par garantie, fond, mode et intensité ([VER-06]) ; 0 pour une palette libre. */
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

/** Ce que l'onglet Vérification retient du bilan : les garanties manquées et les alertes de la palette ouverte. */
export interface CompteDuBilan {
  readonly manquees: number;
  readonly alertes: number;
}

function construireVues(i18n: Localisation) {
  const { TEXTES_DU_PIED, bilanDuPied, nomDeLOngletVerification } = i18n.messages;

  /** Le dernier bilan que le pied a lu, `null` sans palette ouverte : l'onglet Vérification le porte en compteur. */
  let compte: CompteDuBilan | null = null;
  const abonnes = new Set<(compte: CompteDuBilan | null) => void>();
  function poserLeCompte(suivant: CompteDuBilan | null): void {
    if (suivant === compte || (suivant && compte && suivant.manquees === compte.manquees && suivant.alertes === compte.alertes)) return;
    compte = suivant;
    for (const abonne of [...abonnes]) abonne(compte);
  }

  /**
   * Pose le compteur sur l'onglet : rouge pour les garanties manquées, ambre
   * pour des alertes seules, ✓ vert quand tout tient, rien sans palette
   * ouverte. Le nom accessible de l'onglet reprend le bilan.
   */
  function lierLeCompteur(onglet: HTMLElement, libelle: Texte): void {
    const pastille = document.createElement('span');
    pastille.className = 'compteur-de-verification';
    pastille.setAttribute('aria-hidden', 'true');
    pastille.hidden = true;
    onglet.append(pastille);
    const nom: Texte = { lire: () => (compte ? lireTexte(nomDeLOngletVerification(compte.manquees, compte.alertes)) : lireTexte(libelle)) };
    i18n.lier(onglet, 'aria-label', nom);
    abonnes.add((lu) => {
      pastille.hidden = lu === null;
      if (lu === null) {
        delete onglet.dataset.compteur;
        delete pastille.dataset.ton;
      } else {
        const ton = lu.manquees > 0 ? 'danger' : lu.alertes > 0 ? 'avertissement' : 'succes';
        onglet.dataset.compteur = ton;
        pastille.dataset.ton = ton;
        pastille.textContent = ton === 'danger' ? String(lu.manquees) : ton === 'avertissement' ? String(lu.alertes) : '✓';
      }
      i18n.lier(onglet, 'aria-label', nom);
    });
  }

  /** `verifier` ouvre l'onglet Vérification sur la palette ouverte. */
  function createPiedDeLaPalette(verifier: () => void): PiedDeLaPaletteUi {
    const element = document.createElement('div');
    element.className = 'pied-de-la-palette';
    element.setAttribute('role', 'region');
    i18n.lier(element, 'aria-label', TEXTES_DU_PIED.region);
    element.dataset.ton = 'succes';
    element.hidden = true;

    const icone = document.createElement('span');
    icone.className = 'pied-icone';
    icone.setAttribute('aria-hidden', 'true');
    const texte = document.createElement('span');
    texte.className = 'pied-texte';
    // Le compte en gras, puis le premier constat.
    const compteur = document.createElement('b');
    const constat = document.createElement('span');
    texte.append(compteur, constat);
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
        const suite: Texte | null = premier ? i18n.composer` · ${premier}` : null;
        const ton = bilan.manquees > 0 ? 'danger' : alertes > 0 ? 'avertissement' : 'succes';
        element.dataset.ton = ton;
        // Tout tient : le pied se masque, l'annonce et le compteur de l'onglet Vérification restent à jour.
        element.hidden = ton === 'succes';
        icone.textContent = ton === 'danger' ? '✕' : ton === 'avertissement' ? '!' : '✓';
        i18n.lier(compteur, 'textContent', resume);
        i18n.lier(constat, 'textContent', suite);
        poserLeCompte({ manquees: bilan.manquees, alertes });
        i18n.lier(texte, 'title', ligne);
        if (finDuGeste && lireTexte(resume) !== dernierAnnonce) {
          dernierAnnonce = lireTexte(resume);
          i18n.lier(annonce, 'textContent', resume);
        }
      },
    };
  }

  /** Le compteur de l'onglet suit le bilan lu par le pied ; sans palette ouverte, il s'efface. */
  return {
    createPiedDeLaPalette,
    lierLeCompteur,
    effacerLeCompte: () => poserLeCompte(null),
  };
}

export const creerVuesPiedDeLaPalette = memoriserVues(construireVues);

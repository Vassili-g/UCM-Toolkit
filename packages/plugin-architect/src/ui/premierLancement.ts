/**
 * Le premier lancement d'un fichier : l'invitation à analyser (écran 1), puis,
 * quand le premier bilan arrive, la carte de l'écriture des noms avec
 * Continuer (écran 2). La lecture elle-même est montrée par la coquille.
 */
import { createButton } from 'ucm-plugin-socle/src/ui/Button';
import type { Bilan } from '../messages';
import type { Coquille } from './coquille';
import { creerCarteDEcriture } from './ecriture';
import type { EtatDeLEcran } from './etat';
import type { MessageAAfficher } from './frontiere';
import { TEXTES } from './textes';

function creerParagraphe(classe: string, texte = ''): HTMLElement {
  const paragraphe = document.createElement('p');
  paragraphe.className = classe;
  paragraphe.textContent = texte;
  return paragraphe;
}

/** Monte les deux écrans du premier lancement dans le conteneur de la coquille. */
export function monterPremierLancement(coquille: Coquille): void {
  const { frontiere } = coquille;

  const message = creerParagraphe('etat-erreur');
  message.setAttribute('role', 'alert');
  message.hidden = true;

  const titreDeLInvitation = document.createElement('div');
  titreDeLInvitation.className = 'etat-titre';
  titreDeLInvitation.textContent = TEXTES.titreDuPremierLancement;
  const invitation = document.createElement('div');
  invitation.className = 'etat';
  invitation.append(
    titreDeLInvitation,
    creerParagraphe('etat-texte', TEXTES.ligneDuPremierLancement),
    createButton({ label: TEXTES.analyserLeFichier, onClick: () => { frontiere.analyser(); } }),
  );

  /** Le numéro de la demande de Continuer, tant que son bilan n'est pas arrivé. */
  let demandeDeContinuer: number | null = null;
  const continuer = createButton({
    label: TEXTES.continuer,
    onClick: () => {
      message.hidden = true;
      continuer.disabled = true;
      demandeDeContinuer = frontiere.regle({ type: 'ecriture', ecriture: carte.choix() });
    },
  });
  const carte = creerCarteDEcriture({
    auChangement: (choix) => {
      frontiere.simuler({ type: 'ecriture', ecriture: choix });
    },
  });
  const titreDeLEcriture = document.createElement('div');
  titreDeLEcriture.className = 'etat-titre';
  titreDeLEcriture.textContent = TEXTES.titreDeLEcriture;
  const entete = document.createElement('div');
  entete.className = 'ecriture-entete';
  entete.append(titreDeLEcriture, creerParagraphe('subtitle', TEXTES.ligneDeLEcriture));
  const pied = document.createElement('div');
  pied.className = 'ecriture-pied';
  pied.append(continuer);
  const ecriture = document.createElement('div');
  ecriture.className = 'page-stack';
  ecriture.append(entete, carte.element, pied);

  coquille.premierLancement.replaceChildren(message, invitation, ecriture);

  let bilanPose: Bilan | null = null;

  function rendre(etat: EtatDeLEcran): void {
    const bilan = etat.bilan?.premierLancement ? etat.bilan : null;
    invitation.hidden = bilan !== null;
    ecriture.hidden = bilan === null;
    if (bilan === bilanPose) return;
    bilanPose = bilan;
    if (!bilan) return;
    carte.poser(bilan.ecriture);
    continuer.disabled = false;
  }

  function montrer(texte: string): void {
    message.textContent = texte;
    message.hidden = false;
    continuer.disabled = false;
  }

  coquille.abonner((recu: MessageAAfficher, etat) => {
    switch (recu.type) {
      case 'analyse-demandee':
        message.hidden = true;
        break;
      case 'bilan':
        message.hidden = true;
        if (recu.demande === demandeDeContinuer) {
          demandeDeContinuer = null;
          coquille.choisirOnglet('a-appliquer');
        }
        break;
      case 'simulation':
        if (recu.effet?.sorte === 'ecriture' && !ecriture.hidden) carte.poserLesLignes(recu.effet.groupes, recu.effet.variables);
        break;
      case 'refus':
        if (recu.demande === demandeDeContinuer) {
          demandeDeContinuer = null;
          montrer(TEXTES.erreur.echec);
        }
        break;
      case 'erreur':
        // Le bandeau de la coquille dit déjà que le fichier a changé.
        if (recu.code !== 'fichier-modifie' && etat.ecranDeTravail === 'premier-lancement') {
          if (recu.demande === demandeDeContinuer) demandeDeContinuer = null;
          montrer(TEXTES.erreur[recu.code]);
        }
        break;
    }
    rendre(etat);
  });
  rendre(coquille.etat());
}

/**
 * La carte « Page des planches » ([UI-29]) : « Changer » l'ouvre à la place
 * du bloc de la connexion. Une liste à choix unique propose chaque page du
 * fichier, avec son nombre de planches, puis « Nouvelle page » et son champ.
 * « Enregistrer » demande le changement au sandbox ([PLA-29]) ; un refus se
 * lit dans la carte, qui reste ouverte.
 */
import type { IssueDeLaPage } from '../ecriture/planche';
import type { EtatDeLaPlanche } from '../lecture';
import { createCarte } from './carte';
import { creerVuesConstats } from './constats';
import { memoriserVues, type Localisation, type Texte } from './localisation';
import { creerSocleLocalise } from './socleLocalise';

export interface PageDesPlanchesUi {
  readonly element: HTMLElement;
  /** Montre la liste des pages de l'état lu, la page des planches choisie, et prend le focus. */
  ouvrir(planche: EtatDeLaPlanche): void;
  estOuverte(): boolean;
  /** L'issue de « Enregistrer » ; vrai quand la page est choisie : la carte peut se fermer. */
  recevoir(issue: IssueDeLaPage): boolean;
  /** Rend « Enregistrer » inactif, avec la raison ; `null` le rend. */
  bloquer(raison: Texte | null): void;
}

export interface GestesDeLaPage {
  /** Demande le changement ; `false` quand rien ne part, pendant un conflit d'enregistrement. */
  enregistrer(page: { id: string } | { nom: string }): boolean;
  annuler(): void;
}

function construireVues(i18n: Localisation) {
  const { createButton } = creerSocleLocalise(i18n);
  const { blocDeConstat } = creerVuesConstats(i18n);
  const { TEXTES_DE_LA_GESTION, planchesDeLaPage, refusDeLaPage, suiviFutur } = i18n.messages;

  function createPageDesPlanches(gestes: GestesDeLaPage): PageDesPlanchesUi {
    const carte = createCarte({ titre: TEXTES_DE_LA_GESTION.pageDesPlanches }, i18n);
    carte.element.classList.add('carte-ouverte');
    carte.element.hidden = true;

    const champ = document.createElement('div');
    champ.className = 'champ-colonne';
    const libelle = document.createElement('span');
    libelle.className = 'libelle-de-champ';
    libelle.id = 'libelle-de-la-page-des-planches';
    i18n.lier(libelle, 'textContent', TEXTES_DE_LA_GESTION.champDeLaPage);
    const liste = document.createElement('div');
    liste.className = 'liste-de-choix';
    liste.setAttribute('role', 'radiogroup');
    liste.setAttribute('aria-labelledby', libelle.id);
    champ.append(libelle, liste);

    const refus = document.createElement('div');
    refus.className = 'page-stack';
    refus.hidden = true;

    const enregistrer = createButton({ label: TEXTES_DE_LA_GESTION.enregistrer, compact: true, onClick: demander });
    enregistrer.dataset.geste = 'enregistrer';
    const annuler = createButton({ label: TEXTES_DE_LA_GESTION.annuler, variant: 'secondary', compact: true, onClick: () => fermer() });
    annuler.dataset.geste = 'annuler';
    const pied = document.createElement('div');
    pied.className = 'confirmation-gestes';
    pied.append(annuler, enregistrer);

    carte.corps.classList.add('carte-aeree');
    carte.corps.append(champ, refus, pied);

    /** La page rangée à l'ouverture : la choisir de nouveau ne demande rien. */
    let pageRangee: string | null = null;
    let enVol = false;
    let blocage: Texte | null = null;
    const nomDeLaNouvelle = document.createElement('input');
    nomDeLaNouvelle.type = 'text';
    nomDeLaNouvelle.className = 'input';
    i18n.lier(nomDeLaNouvelle, 'aria-label', TEXTES_DE_LA_GESTION.nomDeLaNouvellePage);

    const choisie = (): HTMLInputElement | null => liste.querySelector<HTMLInputElement>('input[type="radio"]:checked');

    /** Ce que « Enregistrer » demanderait ; `null` sans choix, pour la page déjà rangée ou pour un nom vide. */
    function demande(): { id: string } | { nom: string } | null {
      const radio = choisie();
      if (!radio) return null;
      if (radio.value === '') return nomDeLaNouvelle.value.trim() === '' ? null : { nom: nomDeLaNouvelle.value };
      return radio.value === pageRangee ? null : { id: radio.value };
    }

    function rendreLesGestes(): void {
      enregistrer.disabled = enVol || blocage !== null || demande() === null;
      i18n.lier(enregistrer, 'title', blocage ?? '');
      annuler.disabled = enVol;
    }

    function demander(): void {
      const page = demande();
      if (!page || enVol || !gestes.enregistrer(page)) return;
      enVol = true;
      refus.hidden = true;
      rendreLesGestes();
    }

    function fermer(): void {
      carte.element.hidden = true;
      gestes.annuler();
    }

    function choix(valeur: string, contenu: readonly (Node | string)[], detail: Texte): HTMLLabelElement {
      const ligne = document.createElement('label');
      ligne.className = 'choix';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'page-des-planches';
      radio.value = valeur;
      radio.checked = valeur !== '' && valeur === pageRangee;
      radio.addEventListener('change', rendreLesGestes);
      const nom = document.createElement('span');
      nom.className = 'choix-nom';
      nom.append(...contenu);
      const compte = document.createElement('span');
      compte.className = 'ligne-secondaire';
      i18n.lier(compte, 'textContent', detail);
      ligne.append(radio, nom, compte);
      return ligne;
    }

    nomDeLaNouvelle.addEventListener('input', () => {
      const radio = liste.querySelector<HTMLInputElement>('input[type="radio"][value=""]');
      if (radio) radio.checked = true;
      rendreLesGestes();
    });
    nomDeLaNouvelle.addEventListener('keydown', (evenement) => {
      if (evenement.key === 'Enter') demander();
    });

    return {
      element: carte.element,
      ouvrir(planche) {
        pageRangee = planche.page;
        enVol = false;
        nomDeLaNouvelle.value = '';
        refus.replaceChildren();
        refus.hidden = true;
        liste.replaceChildren(
          ...planche.pages.map((page) => choix(page.id, [page.nom], planchesDeLaPage(page.cadres))),
          choix('', [i18n.noeud(TEXTES_DE_LA_GESTION.nouvellePage), nomDeLaNouvelle], ''),
        );
        carte.element.hidden = false;
        rendreLesGestes();
        (choisie() ?? liste.querySelector<HTMLInputElement>('input[type="radio"]'))?.focus();
      },
      estOuverte: () => !carte.element.hidden,
      recevoir(issue) {
        enVol = false;
        if (issue.issue === 'choisie') {
          carte.element.hidden = true;
          return true;
        }
        refus.replaceChildren(issue.issue === 'suivi-futur' ? blocDeConstat(suiviFutur(), 'bloquant') : blocDeConstat(refusDeLaPage(issue), 'alerte'));
        refus.hidden = false;
        rendreLesGestes();
        return false;
      },
      bloquer(raison) {
        blocage = raison;
        rendreLesGestes();
      },
    };
  }
  return { createPageDesPlanches };
}

export const creerVuesPageDesPlanches = memoriserVues(construireVues);

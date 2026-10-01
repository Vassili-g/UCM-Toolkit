/**
 * Le bloc « Connexion à Figma » ([UI-24]) : ce qui relie le plugin au
 * fichier, en tête de l'onglet Gestion dans les deux vues. Son en-tête porte
 * l'heure du dernier état lu et « Synchroniser », qui relit le fichier sans
 * rien écrire. Son corps porte la destination des tokens et la page des
 * planches, chacune avec « Changer », puis le bilan : un compte de palettes
 * par état, et « Tout mettre à jour » en vue complète ([UI-28]).
 */
import { ETATS_DE_FICHE, type EtatDeLaFiche } from '../presentation';
import { createCarte } from './carte';
import { memoriserVues, type Localisation, type Texte } from './localisation';
import { creerSocleLocalise } from './socleLocalise';

export interface EtatDeLaConnexion {
  /**
   * La destination des tokens : le nom de sa collection, ou ce qui se dit
   * d'une collection que le fichier ne porte plus, et son groupe. `null`
   * quand le suivi des variables ne se lit pas : la ligne se cache.
   */
  readonly tokens: { readonly collection: Texte; readonly groupe: string } | null;
  /** Le nom de la page des planches ; `null` tant qu'aucune page n'est rangée. */
  readonly nomDeLaPage: string | null;
  /** Le nombre de palettes de chaque état ; un état absent ne se montre pas. */
  readonly bilan: ReadonlyMap<EtatDeLaFiche, number>;
  /** Le nombre de palettes que « Tout mettre à jour » écrirait ; à zéro, le bouton se cache. */
  readonly enRetard: number;
  /** L'heure du dernier état reçu du sandbox, en millisecondes. */
  readonly luLe: number;
}

export interface ConnexionUi {
  readonly element: HTMLElement;
  readonly synchroniser: HTMLButtonElement;
  /** « Changer », sur la ligne des tokens : le focus y revient quand la carte de la destination se ferme. */
  readonly changerLaDestination: HTMLButtonElement;
  /** « Changer », sur la ligne des planches : le focus y revient quand la carte de la page se ferme. */
  readonly changerLaPage: HTMLButtonElement;
  readonly toutMettreAJour: HTMLButtonElement;
  afficher(etat: EtatDeLaConnexion): void;
}

export interface GestesDeLaConnexion {
  synchroniser(): void;
  changerLaDestination(): void;
  changerLaPage(): void;
  toutMettreAJour(): void;
}

const SVG = 'http://www.w3.org/2000/svg';

/** Les deux flèches en cercle de « Synchroniser » : elles le distinguent de « Changer ». */
function icone(): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', '14');
  svg.setAttribute('height', '14');
  svg.setAttribute('class', 'synchroniser-icone');
  svg.setAttribute('aria-hidden', 'true');
  for (const trace of ['M13.5 8a5.5 5.5 0 0 1-9.6 3.7M2.5 8a5.5 5.5 0 0 1 9.6-3.7', 'M12.4 1.8v2.7H9.7M3.6 14.2v-2.7h2.7']) {
    const chemin = document.createElementNS(SVG, 'path');
    chemin.setAttribute('d', trace);
    svg.append(chemin);
  }
  return svg;
}

function construireVues(i18n: Localisation) {
  const { createButton } = creerSocleLocalise(i18n);
  const { TEXTES_DE_LA_GESTION, bilanDeLEtat, synchroniseIlYA, toutMettreAJour } = i18n.messages;

  function createConnexion(gestes: GestesDeLaConnexion): ConnexionUi {
    const carte = createCarte({ titre: TEXTES_DE_LA_GESTION.connexion }, i18n);
    carte.element.classList.add('connexion');

    const heure = document.createElement('span');
    heure.className = 'ligne-secondaire';
    const synchroniser = document.createElement('button');
    synchroniser.type = 'button';
    synchroniser.className = 'synchroniser';
    synchroniser.dataset.geste = 'synchroniser';
    synchroniser.append(icone(), i18n.noeud(TEXTES_DE_LA_GESTION.synchroniser));
    synchroniser.addEventListener('click', () => gestes.synchroniser());
    carte.tete.append(heure, synchroniser);

    /** Une ligne du bloc : le nom de la sortie, où elle s'écrit, « Changer ». */
    function ligneDeSortie(sortie: 'tokens' | 'planche', libelle: Texte, geste: string, surClic: () => void) {
      const element = document.createElement('div');
      element.className = 'connexion-ligne';
      element.dataset.sortie = sortie;
      const titre = document.createElement('span');
      titre.className = 'sortie-nom';
      i18n.lier(titre, 'textContent', libelle);
      const ou = document.createElement('span');
      ou.className = 'chemin';
      const changer = document.createElement('button');
      changer.type = 'button';
      changer.className = 'bouton-discret';
      changer.dataset.geste = geste;
      i18n.lier(changer, 'textContent', TEXTES_DE_LA_GESTION.changer);
      changer.addEventListener('click', surClic);
      element.append(titre, ou, changer);
      return { element, chemin: ou, changer };
    }

    // La ligne des tokens : la collection, puis le groupe où les palettes s'écrivent.
    const tokens = ligneDeSortie('tokens', TEXTES_DE_LA_GESTION.tokens, 'changer-la-destination', () => gestes.changerLaDestination());
    const collection = document.createElement('code');
    const fleche = document.createElement('span');
    fleche.setAttribute('aria-hidden', 'true');
    fleche.append('›');
    const groupe = document.createElement('code');
    tokens.chemin.append(collection, fleche, groupe);

    // La ligne des planches : sa page.
    const { element: ligne, chemin, changer: changerLaPage } = ligneDeSortie('planche', TEXTES_DE_LA_GESTION.planches, 'changer-la-page', () => gestes.changerLaPage());
    const mot = document.createElement('span');
    mot.className = 'ligne-secondaire';
    i18n.lier(mot, 'textContent', TEXTES_DE_LA_GESTION.page);
    const page = document.createElement('code');
    const aCreer = document.createElement('span');
    aCreer.className = 'ligne-secondaire';
    i18n.lier(aCreer, 'textContent', TEXTES_DE_LA_GESTION.pageACreer);
    chemin.append(mot, page, aCreer);

    const bilan = document.createElement('div');
    bilan.className = 'connexion-bilan';
    const comptes = document.createElement('span');
    comptes.className = 'connexion-comptes';
    const toutMettre = createButton({ label: toutMettreAJour(0), compact: true, onClick: () => gestes.toutMettreAJour() });
    toutMettre.dataset.geste = 'tout-mettre-a-jour';
    bilan.append(comptes, toutMettre);

    carte.corps.append(tokens.element, ligne, bilan);

    return {
      element: carte.element,
      synchroniser,
      changerLaDestination: tokens.changer,
      changerLaPage,
      toutMettreAJour: toutMettre,
      afficher(etat) {
        i18n.lier(heure, 'textContent', synchroniseIlYA(Math.max(0, Math.floor((Date.now() - etat.luLe) / 1000))));
        tokens.element.hidden = etat.tokens === null;
        if (etat.tokens) {
          i18n.lier(collection, 'textContent', etat.tokens.collection);
          // Le groupe se lit comme un dossier : « colors/… » ; vide, les palettes sont à la racine de la collection.
          groupe.textContent = etat.tokens.groupe === '' ? '' : `${etat.tokens.groupe}/…`;
          groupe.hidden = etat.tokens.groupe === '';
          fleche.hidden = etat.tokens.groupe === '';
        }
        // Sans page rangée, le premier dessin crée la page par défaut ([PLA-01]).
        if (etat.nomDeLaPage === null) i18n.lier(page, 'textContent', TEXTES_DE_LA_GESTION.pageParDefaut);
        else i18n.lier(page, 'textContent', etat.nomDeLaPage);
        aCreer.hidden = etat.nomDeLaPage !== null;
        comptes.replaceChildren(...ETATS_DE_FICHE.filter((code) => (etat.bilan.get(code) ?? 0) > 0).map((code) => {
          const pastille = document.createElement('span');
          pastille.className = 'pastille-d-etat';
          pastille.dataset.etat = code;
          i18n.lier(pastille, 'textContent', bilanDeLEtat(code, etat.bilan.get(code)!));
          return pastille;
        }));
        toutMettre.setLabel(toutMettreAJour(etat.enRetard));
        toutMettre.hidden = etat.enRetard === 0;
        bilan.hidden = comptes.childElementCount === 0;
      },
    };
  }
  return { createConnexion };
}

export const creerVuesConnexion = memoriserVues(construireVues);

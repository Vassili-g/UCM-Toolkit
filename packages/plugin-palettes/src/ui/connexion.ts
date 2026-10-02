/**
 * La section « Connexion à Figma » ([UI-24]) : ce qui relie le plugin au
 * fichier, en tête de l'onglet Gestion dans les deux vues. Repliée, son
 * en-tête résume la destination des tokens et la page des planches. Dépliée,
 * elle porte une ligne par sortie, chacune avec « Changer », puis l'heure du
 * dernier état lu et « Synchroniser », qui relit le fichier sans rien écrire.
 */
import type { Localisation, Texte } from './localisation';
import { memoriserVues } from './localisation';
import { createSection } from './section';

export interface EtatDeLaConnexion {
  /**
   * La destination des tokens : le nom de sa collection, ou ce qui se dit
   * d'une collection que le fichier ne porte plus, et son groupe. `null`
   * quand le suivi des variables ne se lit pas : la ligne se cache.
   */
  readonly tokens: { readonly collection: Texte; readonly groupe: string } | null;
  /** Le nom de la page des planches ; `null` tant qu'aucune page n'est rangée. */
  readonly nomDeLaPage: string | null;
  /** L'heure du dernier état reçu du sandbox, en millisecondes. */
  readonly luLe: number;
}

export interface ConnexionUi {
  readonly element: HTMLElement;
  /** Le bouton de l'en-tête : le focus y revient quand une carte se ferme sur la section repliée. */
  readonly bascule: HTMLButtonElement;
  readonly synchroniser: HTMLButtonElement;
  /** « Changer », sur la ligne des tokens : le focus y revient quand la carte de la destination se ferme. */
  readonly changerLaDestination: HTMLButtonElement;
  /** « Changer », sur la ligne des planches : le focus y revient quand la carte de la page se ferme. */
  readonly changerLaPage: HTMLButtonElement;
  estOuverte(): boolean;
  afficher(etat: EtatDeLaConnexion): void;
}

export interface GestesDeLaConnexion {
  synchroniser(): void;
  changerLaDestination(): void;
  changerLaPage(): void;
  /** Le designer ouvre ou replie la section. */
  basculer(ouverte: boolean): void;
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
  const { TEXTES_DE_LA_GESTION, synchroniseIlYA } = i18n.messages;

  /** Où les tokens s'écrivent : la collection, puis le groupe. La ligne et le résumé en portent chacun un. */
  function cheminDesTokens() {
    const element = document.createElement('span');
    element.className = 'chemin';
    const collection = document.createElement('code');
    const fleche = document.createElement('span');
    fleche.setAttribute('aria-hidden', 'true');
    fleche.append('›');
    const groupe = document.createElement('code');
    element.append(collection, fleche, groupe);
    return {
      element,
      afficher(tokens: EtatDeLaConnexion['tokens']): void {
        element.hidden = tokens === null;
        if (!tokens) return;
        i18n.lier(collection, 'textContent', tokens.collection);
        // Le groupe se lit comme un dossier : « colors/… » ; vide, les palettes sont à la racine de la collection.
        groupe.textContent = tokens.groupe === '' ? '' : `${tokens.groupe}/…`;
        groupe.hidden = tokens.groupe === '';
        fleche.hidden = tokens.groupe === '';
      },
    };
  }

  /** Où les planches se dessinent : leur page. */
  function cheminDesPlanches() {
    const element = document.createElement('span');
    element.className = 'chemin';
    const mot = document.createElement('span');
    mot.className = 'ligne-secondaire';
    i18n.lier(mot, 'textContent', TEXTES_DE_LA_GESTION.page);
    const page = document.createElement('code');
    const aCreer = document.createElement('span');
    aCreer.className = 'ligne-secondaire';
    i18n.lier(aCreer, 'textContent', TEXTES_DE_LA_GESTION.pageACreer);
    element.append(mot, page, aCreer);
    return {
      element,
      afficher(nomDeLaPage: string | null): void {
        // Sans page rangée, le premier dessin crée la page par défaut ([PLA-01]).
        if (nomDeLaPage === null) i18n.lier(page, 'textContent', TEXTES_DE_LA_GESTION.pageParDefaut);
        else i18n.lier(page, 'textContent', nomDeLaPage);
        aCreer.hidden = nomDeLaPage !== null;
      },
    };
  }

  function createConnexion(gestes: GestesDeLaConnexion, ouverte: boolean): ConnexionUi {
    const section = createSection({ code: 'connexion', titre: TEXTES_DE_LA_GESTION.connexion, ouverte, surBascule: (etat) => gestes.basculer(etat) }, i18n);

    /** Une ligne de la section : le nom de la sortie, où elle s'écrit, « Changer ». */
    function ligneDeSortie(sortie: 'tokens' | 'planche', libelle: Texte, ou: HTMLElement, geste: string, surClic: () => void) {
      const element = document.createElement('div');
      element.className = 'connexion-ligne';
      element.dataset.sortie = sortie;
      const titre = document.createElement('span');
      titre.className = 'sortie-nom';
      i18n.lier(titre, 'textContent', libelle);
      const changer = document.createElement('button');
      changer.type = 'button';
      changer.className = 'bouton-discret';
      changer.dataset.geste = geste;
      i18n.lier(changer, 'textContent', TEXTES_DE_LA_GESTION.changer);
      changer.addEventListener('click', surClic);
      element.append(titre, ou, changer);
      return { element, changer };
    }

    const tokens = cheminDesTokens();
    const planches = cheminDesPlanches();
    const ligneDesTokens = ligneDeSortie('tokens', TEXTES_DE_LA_GESTION.tokens, tokens.element, 'changer-la-destination', () => gestes.changerLaDestination());
    const ligneDesPlanches = ligneDeSortie('planche', TEXTES_DE_LA_GESTION.planches, planches.element, 'changer-la-page', () => gestes.changerLaPage());

    const heure = document.createElement('span');
    heure.className = 'ligne-secondaire';
    const synchroniser = document.createElement('button');
    synchroniser.type = 'button';
    synchroniser.className = 'synchroniser';
    synchroniser.dataset.geste = 'synchroniser';
    synchroniser.append(icone(), i18n.noeud(TEXTES_DE_LA_GESTION.synchroniser));
    synchroniser.addEventListener('click', () => gestes.synchroniser());
    const pied = document.createElement('div');
    pied.className = 'connexion-pied';
    pied.append(heure, synchroniser);

    section.corps.append(ligneDesTokens.element, ligneDesPlanches.element, pied);

    const tokensDuResume = cheminDesTokens();
    const planchesDuResume = cheminDesPlanches();
    const separateur = document.createElement('span');
    separateur.setAttribute('aria-hidden', 'true');
    separateur.append('·');
    section.poserLeResume([tokensDuResume.element, separateur, planchesDuResume.element]);

    return {
      element: section.element,
      bascule: section.bascule,
      synchroniser,
      changerLaDestination: ligneDesTokens.changer,
      changerLaPage: ligneDesPlanches.changer,
      estOuverte: section.estOuverte,
      afficher(etat) {
        i18n.lier(heure, 'textContent', synchroniseIlYA(Math.max(0, Math.floor((Date.now() - etat.luLe) / 1000))));
        ligneDesTokens.element.hidden = etat.tokens === null;
        tokens.afficher(etat.tokens);
        tokensDuResume.afficher(etat.tokens);
        separateur.hidden = etat.tokens === null;
        planches.afficher(etat.nomDeLaPage);
        planchesDuResume.afficher(etat.nomDeLaPage);
      },
    };
  }
  return { createConnexion };
}

export const creerVuesConnexion = memoriserVues(construireVues);

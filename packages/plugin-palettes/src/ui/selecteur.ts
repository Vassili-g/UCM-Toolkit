/**
 * Le sélecteur de la palette ouverte ([UI-06]) : chaque palette sous son nom
 * ou son hexa, avec une pastille de sa référence ; « Sélectionner une
 * palette » tant qu'aucune n'est choisie. Chaque option porte à droite le
 * verdict de sa palette, ✓, ! ou ✗, et le bouton celui de la palette ouverte
 * ([UI-23], [VER-19]). Un `<select>` natif ne porte ni pastille ni verdict :
 * la liste suit le motif WAI-ARIA « listbox » derrière un bouton. Flèches et
 * Entrée choisissent, Échap referme.
 */
import type { Palette } from 'ucm-couleur';

import type { Verdict } from '../presentation';
import { memoriserVues, type Localisation } from './localisation';

/** Le signe d'un verdict : une forme en plus de la couleur ([VER-14]). */
export const SIGNE_DU_VERDICT: Record<Verdict, string> = { succes: '✓', avertissement: '!', danger: '✗' };

export interface SelecteurUi {
  element: HTMLDivElement;
  afficher(palettes: readonly Palette[], idOuvert: string, verdicts: ReadonlyMap<string, Verdict>): void;
  focaliser(): void;
}

function construireVues(i18n: Localisation) {
  const { TEXTES, VERDICT_EN_MOTS, nomDeLaPalette, paletteOuverteEcrite } = i18n.messages;

  function pastilleDe(palette: Palette): HTMLSpanElement {
    const pastille = document.createElement('span');
    pastille.className = 'pastille-reference';
    pastille.style.background = palette.reference;
    return pastille;
  }

  /** Le signe d'un verdict, que l'assistance technique lit en mots ; caché tant que le verdict n'est pas calculé. */
  function marqueDeVerdict(): HTMLSpanElement {
    const marque = document.createElement('span');
    marque.className = 'marque-de-verdict';
    marque.setAttribute('role', 'img');
    marque.hidden = true;
    return marque;
  }

  function poserLeVerdict(marque: HTMLSpanElement, verdict: Verdict | undefined): void {
    marque.hidden = verdict === undefined;
    if (verdict === undefined) return;
    marque.dataset.ton = verdict;
    i18n.lier(marque, 'textContent', SIGNE_DU_VERDICT[verdict]);
    i18n.lier(marque, 'aria-label', VERDICT_EN_MOTS[verdict]);
  }

  function createSelecteur(onChoix: (id: string) => void): SelecteurUi {
    const element = document.createElement('div');
    element.className = 'selecteur';

    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'selecteur-bouton';
    bouton.setAttribute('aria-haspopup', 'listbox');
    bouton.setAttribute('aria-expanded', 'false');
    i18n.lier(bouton, 'aria-label', TEXTES.choisirUnePalette);

    const liste = document.createElement('ul');
    liste.className = 'selecteur-liste';
    liste.setAttribute('role', 'listbox');
    i18n.lier(liste, 'aria-label', TEXTES.choisirUnePalette);
    liste.tabIndex = -1;
    liste.hidden = true;

    let options: { id: string; element: HTMLLIElement; pastille: HTMLSpanElement; texte: HTMLSpanElement; verdict: HTMLSpanElement }[] = [];
    let ouvert = '';
    let visee = 0;

    function viser(rang: number): void {
      if (options.length === 0) return;
      visee = (rang + options.length) % options.length;
      options.forEach(({ element: option }, position) => option.dataset.visee = String(position === visee));
      liste.setAttribute('aria-activedescendant', options[visee].element.id);
    }

    function ouvrir(): void {
      liste.hidden = false;
      bouton.setAttribute('aria-expanded', 'true');
      viser(Math.max(0, options.findIndex(({ id }) => id === ouvert)));
      liste.focus();
    }

    function fermer(rendreLeFocus: boolean): void {
      liste.hidden = true;
      bouton.setAttribute('aria-expanded', 'false');
      if (rendreLeFocus) bouton.focus();
    }

    function choisir(rang: number): void {
      fermer(true);
      const choisie = options[rang];
      if (choisie && choisie.id !== ouvert) onChoix(choisie.id);
    }

    bouton.addEventListener('click', () => (liste.hidden ? ouvrir() : fermer(false)));
    bouton.addEventListener('keydown', (evenement) => {
      if (evenement.key !== 'ArrowDown' && evenement.key !== 'ArrowUp') return;
      evenement.preventDefault();
      ouvrir();
    });
    liste.addEventListener('keydown', (evenement) => {
      const gestes: Record<string, () => void> = {
        ArrowDown: () => viser(visee + 1),
        ArrowUp: () => viser(visee - 1),
        Home: () => viser(0),
        End: () => viser(options.length - 1),
        Enter: () => choisir(visee),
        ' ': () => choisir(visee),
        Escape: () => fermer(true),
      };
      const geste = gestes[evenement.key];
      if (!geste) return;
      evenement.preventDefault();
      geste();
    });
    element.addEventListener('focusout', (evenement) => {
      if (!element.contains(evenement.relatedTarget as Node | null)) fermer(false);
    });

    element.append(bouton, liste);

    let formeBatie: string | null = null;
    const nomDuBouton = document.createElement('span');
    nomDuBouton.className = 'selecteur-nom';
    let pastilleDuBouton: HTMLSpanElement | null = null;
    const verdictDuBouton = marqueDeVerdict();

    /** Le bouton et les options, avec leurs gestes, pour une liste de palettes et un choix donnés. */
    function batir(palettes: readonly Palette[], courante: Palette | undefined): void {
      nomDuBouton.classList.toggle('selecteur-invite', !courante);
      const fleche = document.createElement('span');
      fleche.className = 'selecteur-fleche';
      fleche.setAttribute('aria-hidden', 'true');
      i18n.lier(fleche, 'textContent', '▾');
      pastilleDuBouton = courante ? pastilleDe(courante) : null;
      bouton.replaceChildren(...(pastilleDuBouton ? [pastilleDuBouton] : []), nomDuBouton, verdictDuBouton, fleche);

      options = palettes.map((palette, rang) => {
        const option = document.createElement('li');
        option.className = 'selecteur-option';
        option.id = `option-${palette.id}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(palette.id === courante?.id));
        const texte = document.createElement('span');
        texte.className = 'selecteur-option-nom';
        const pastille = pastilleDe(palette);
        const verdict = marqueDeVerdict();
        option.append(pastille, texte, verdict);
        option.addEventListener('mousedown', (evenement) => evenement.preventDefault());
        option.addEventListener('click', () => choisir(rang));
        return { id: palette.id, element: option, pastille, texte, verdict };
      });
      liste.replaceChildren(...options.map(({ element: option }) => option));
    }

    return {
      element,
      focaliser: () => bouton.focus(),
      afficher(palettes, idOuvert, verdicts) {
        const courante = palettes.find((palette) => palette.id === idOuvert);
        // Les mêmes palettes, dans le même ordre, et le même choix : pastilles et noms se repeignent en place (Z4.7).
        const forme = `${courante ? idOuvert : ''}|${palettes.map((palette) => palette.id).join(',')}`;
        if (forme !== formeBatie) {
          formeBatie = forme;
          batir(palettes, courante);
        }
        ouvert = idOuvert;
        if (courante && pastilleDuBouton) pastilleDuBouton.style.background = courante.reference;
        // Sans palette choisie, le bouton invite à choisir ([UI-06]).
        i18n.lier(nomDuBouton, 'textContent', courante ? nomDeLaPalette(courante) : TEXTES.selectionnerUnePalette);
        const verdictOuvert = courante ? verdicts.get(courante.id) : undefined;
        poserLeVerdict(verdictDuBouton, verdictOuvert);
        // Le bouton a un nom accessible propre : il redit la palette ouverte et son verdict.
        i18n.lier(bouton, 'aria-label', courante && verdictOuvert ? paletteOuverteEcrite(nomDeLaPalette(courante), VERDICT_EN_MOTS[verdictOuvert]) : TEXTES.choisirUnePalette);
        palettes.forEach((palette, rang) => {
          options[rang].pastille.style.background = palette.reference;
          i18n.lier(options[rang].texte, 'textContent', nomDeLaPalette(palette));
          poserLeVerdict(options[rang].verdict, verdicts.get(palette.id));
        });
      },
    };
  }
  return { createSelecteur };
}

export const creerVuesSelecteur = memoriserVues(construireVues);

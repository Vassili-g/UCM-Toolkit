/**
 * Le sélecteur de la palette ouverte ([UI-06]) : chaque palette sous son nom
 * ou son hexa, avec une pastille de sa référence ; « Sélectionner une
 * palette » tant qu'aucune n'est choisie. Un `<select>` natif ne porte
 * pas de pastille : la liste suit le motif WAI-ARIA « listbox » derrière un
 * bouton. Flèches et Entrée choisissent, Échap referme.
 */
import type { Palette } from 'ucm-couleur';

import { memoriserVues, type Localisation } from './localisation';

export interface SelecteurUi {
  element: HTMLDivElement;
  afficher(palettes: readonly Palette[], idOuvert: string): void;
  focaliser(): void;
}

function construireVues(i18n: Localisation) {
  const { TEXTES, nomDeLaPalette } = i18n.messages;

  function pastilleDe(palette: Palette): HTMLSpanElement {
    const pastille = document.createElement('span');
    pastille.className = 'pastille-reference';
    pastille.style.background = palette.reference;
    return pastille;
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

    let options: { id: string; element: HTMLLIElement; pastille: HTMLSpanElement; texte: HTMLSpanElement }[] = [];
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

    /** Le bouton et les options, avec leurs gestes, pour une liste de palettes et un choix donnés. */
    function batir(palettes: readonly Palette[], courante: Palette | undefined): void {
      nomDuBouton.classList.toggle('selecteur-invite', !courante);
      const fleche = document.createElement('span');
      fleche.className = 'selecteur-fleche';
      fleche.setAttribute('aria-hidden', 'true');
      i18n.lier(fleche, 'textContent', '▾');
      pastilleDuBouton = courante ? pastilleDe(courante) : null;
      bouton.replaceChildren(...(pastilleDuBouton ? [pastilleDuBouton] : []), nomDuBouton, fleche);

      options = palettes.map((palette, rang) => {
        const option = document.createElement('li');
        option.className = 'selecteur-option';
        option.id = `option-${palette.id}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(palette.id === courante?.id));
        const texte = document.createElement('span');
        const pastille = pastilleDe(palette);
        option.append(pastille, texte);
        option.addEventListener('mousedown', (evenement) => evenement.preventDefault());
        option.addEventListener('click', () => choisir(rang));
        return { id: palette.id, element: option, pastille, texte };
      });
      liste.replaceChildren(...options.map(({ element: option }) => option));
    }

    return {
      element,
      focaliser: () => bouton.focus(),
      afficher(palettes, idOuvert) {
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
        palettes.forEach((palette, rang) => {
          options[rang].pastille.style.background = palette.reference;
          i18n.lier(options[rang].texte, 'textContent', nomDeLaPalette(palette));
        });
      },
    };
  }
  return { createSelecteur };
}

export const creerVuesSelecteur = memoriserVues(construireVues);

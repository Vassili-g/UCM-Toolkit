/**
 * Les gestes qui portent sur la palette ouverte ([ENT-03]) : dupliquer et
 * supprimer. Les onglets rangent les palettes par teinte ou par nom : aucun
 * geste ne les réordonne. Un menu selon le motif WAI-ARIA « menu button » : ils
 * n'occupent l'écran qu'à la demande, le compte des objets restant sous la
 * douzaine (protocole de relecture, point (e)).
 */
import { memoriserVues, type Localisation, type Texte } from './localisation';

export type GesteDePalette = 'dupliquer' | 'supprimer';

export interface MenuPaletteUi {
  element: HTMLDivElement;
  /** Rend le focus au bouton du menu, après une confirmation annulée. */
  focaliser(): void;
}

function construireVues(i18n: Localisation) {
  const { TEXTES } = i18n.messages;

  const GESTES: readonly { geste: GesteDePalette; libelle: Texte }[] = [
    { geste: 'dupliquer', libelle: TEXTES.dupliquer },
    { geste: 'supprimer', libelle: TEXTES.supprimer },
  ];

  function createMenuPalette(onGeste: (geste: GesteDePalette) => void): MenuPaletteUi {
    const element = document.createElement('div');
    element.className = 'menu-palette';

    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'icon-button';
    i18n.lier(bouton, 'textContent', '⋯');
    i18n.lier(bouton, 'aria-label', TEXTES.gestesDeLaPalette);
    bouton.setAttribute('aria-haspopup', 'menu');
    bouton.setAttribute('aria-expanded', 'false');

    const liste = document.createElement('ul');
    liste.className = 'menu-liste';
    liste.setAttribute('role', 'menu');
    liste.hidden = true;

    const options = GESTES.map(({ geste, libelle }) => {
      const option = document.createElement('li');
      option.className = 'menu-option';
      option.setAttribute('role', 'menuitem');
      option.dataset.geste = geste;
      option.tabIndex = -1;
      i18n.lier(option, 'textContent', libelle);
      option.addEventListener('click', () => choisir(option));
      liste.append(option);
      return option;
    });

    function fermer(rendreLeFocus: boolean): void {
      liste.hidden = true;
      bouton.setAttribute('aria-expanded', 'false');
      if (rendreLeFocus) bouton.focus();
    }

    function choisir(option: HTMLLIElement): void {
      fermer(true);
      onGeste(option.dataset.geste as GesteDePalette);
    }

    bouton.addEventListener('click', () => {
      if (!liste.hidden) {
        fermer(false);
        return;
      }
      liste.hidden = false;
      bouton.setAttribute('aria-expanded', 'true');
      options[0]?.focus();
    });
    liste.addEventListener('keydown', (evenement) => {
      const rang = options.indexOf(document.activeElement as HTMLLIElement);
      const gestes: Record<string, () => void> = {
        ArrowDown: () => options[(rang + 1) % options.length]?.focus(),
        ArrowUp: () => options[(rang - 1 + options.length) % options.length]?.focus(),
        Enter: () => { if (options[rang]) choisir(options[rang]); },
        ' ': () => { if (options[rang]) choisir(options[rang]); },
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

    return {
      element,
      focaliser: () => bouton.focus(),
    };
  }
  return { createMenuPalette };
}

export const creerVuesMenuPalette = memoriserVues(construireVues);

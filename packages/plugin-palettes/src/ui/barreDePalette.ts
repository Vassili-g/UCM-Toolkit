/**
 * La barre de la palette ouverte ([UI-23]) : la liste déroulante, « Nouvelle
 * palette », le menu « … » et la confirmation de suppression. Elle existe en
 * un seul exemplaire, que l'onglet actif, Création ou Vérification, place
 * dans son panneau : aucun de ses éléments ne se reconstruit, et elle garde
 * sa palette et sa confirmation d'un onglet à l'autre.
 */
import type { Palette } from 'ucm-couleur';

import type { Verdict } from '../presentation';
import { memoriserVues, type Localisation } from './localisation';
import { type GesteDePalette } from './menuPalette';
import { creerVuesMenuPalette } from './menuPalette';
import { creerVuesSelecteur } from './selecteur';
import { creerSocleLocalise } from './socleLocalise';

/** Ce que la barre demande à l'onglet Création, qui porte la recette. */
export interface GestesDeLaBarre {
  choisir(id: string): void;
  /** « Nouvelle palette » : la création s'ouvre dans l'onglet Création. */
  nouvelle(): void;
  /** Dupliquer, monter ou descendre la palette ouverte ; `supprimer` ouvre la confirmation de la barre. */
  agir(geste: GesteDePalette): void;
  /** La suppression que le designer vient de confirmer. */
  supprimer(): void;
}

export interface EntreesDeLaBarre {
  readonly palettes: readonly Palette[];
  readonly idOuvert: string;
  readonly verdicts: ReadonlyMap<string, Verdict>;
  readonly creationOuverte: boolean;
}

export interface BarreDePaletteUi {
  /** La barre et sa confirmation. */
  readonly element: HTMLDivElement;
  afficher(entrees: EntreesDeLaBarre): void;
  /** Place la barre en tête de `parent`, si elle n'y est pas déjà. */
  placerDans(parent: HTMLElement): void;
  /** Referme la confirmation de suppression, sans déplacer le focus. */
  fermerLaConfirmation(): void;
  focaliserLeSelecteur(): void;
  focaliserNouvelle(): void;
}

function construireVues(i18n: Localisation) {
  const { createButton } = creerSocleLocalise(i18n);
  const { createMenuPalette } = creerVuesMenuPalette(i18n);
  const { createSelecteur } = creerVuesSelecteur(i18n);
  const { TEXTES, confirmationDeSuppression, nomDeLaPalette } = i18n.messages;

  function createBarreDePalette(gestes: GestesDeLaBarre): BarreDePaletteUi {
    const element = document.createElement('div');
    element.className = 'barre-de-palette';

    let suppressionDemandee = false;
    let dernieres: EntreesDeLaBarre | null = null;

    // La liste prend la largeur libre ([UI-06]).
    const selecteur = createSelecteur((id) => {
      suppressionDemandee = false;
      gestes.choisir(id);
    });
    // L'action principale de l'onglet Création : créer une palette.
    const plus = createButton({
      label: TEXTES.nouvellePalette,
      onClick: () => {
        suppressionDemandee = false;
        gestes.nouvelle();
      },
    });
    plus.classList.add('bouton-de-barre');
    plus.setAttribute('aria-expanded', 'false');
    const menu = createMenuPalette((geste) => {
      if (geste === 'supprimer') suppressionDemandee = true;
      gestes.agir(geste);
      if (geste === 'supprimer') supprimerVraiment.focus();
    });
    const barre = document.createElement('div');
    barre.className = 'barre-gestes';
    barre.append(selecteur.element, plus, menu.element);

    const confirmation = document.createElement('div');
    confirmation.className = 'confirmation';
    const texteDeConfirmation = document.createElement('p');
    const gestesDeConfirmation = document.createElement('div');
    gestesDeConfirmation.className = 'confirmation-gestes';
    const supprimerVraiment = createButton({
      label: TEXTES.supprimer,
      variant: 'danger',
      onClick: () => {
        suppressionDemandee = false;
        gestes.supprimer();
      },
    });
    gestesDeConfirmation.append(
      supprimerVraiment,
      createButton({
        label: TEXTES.annuler,
        variant: 'secondary',
        onClick: () => {
          suppressionDemandee = false;
          rendre();
          menu.focaliser();
        },
      }),
    );
    confirmation.append(texteDeConfirmation, gestesDeConfirmation);
    confirmation.hidden = true;
    element.append(barre, confirmation);

    function rendre(): void {
      if (!dernieres) return;
      const { palettes, idOuvert, verdicts, creationOuverte } = dernieres;
      const courante = palettes.find((candidate) => candidate.id === idOuvert) ?? null;
      selecteur.afficher(palettes, courante?.id ?? '', verdicts);
      // Le menu porte sur la palette choisie : sans elle, il se cache.
      menu.element.hidden = !courante;
      if (courante) menu.afficher(palettes.indexOf(courante), palettes.length);
      plus.setAttribute('aria-expanded', String(creationOuverte));
      i18n.lier(texteDeConfirmation, 'textContent', courante ? confirmationDeSuppression(nomDeLaPalette(courante)) : '');
      confirmation.hidden = !suppressionDemandee || !courante;
    }

    return {
      element,
      afficher(entrees) {
        dernieres = entrees;
        rendre();
      },
      placerDans(parent) {
        if (element.parentElement !== parent || parent.firstElementChild !== element) parent.prepend(element);
      },
      fermerLaConfirmation() {
        suppressionDemandee = false;
        rendre();
      },
      focaliserLeSelecteur: () => selecteur.focaliser(),
      focaliserNouvelle: () => plus.focus(),
    };
  }
  return { createBarreDePalette };
}

export const creerVuesBarreDePalette = memoriserVues(construireVues);

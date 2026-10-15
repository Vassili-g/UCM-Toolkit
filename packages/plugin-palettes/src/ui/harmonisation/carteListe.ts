/**
 * La carte « Vos palettes » d'Harmonisation ([UI-40]) : une rangée par palette,
 * dans l'ordre de la recette, avec sa case, son nom et ses nuances dans le
 * thème et l'intensité de l'aperçu. La rangée entière est le `label` de sa
 * case. Un rond `!` signale une palette qui appartient à une paire trop
 * proche. Le pied dit combien de palettes sont cochées et les décoche toutes.
 *
 * Les rangées se refont quand la recette, ses paires, le thème ou l'intensité
 * changent ; cocher ne met à jour que les cases et le pied, pour que le focus
 * reste sur la case cliquée.
 */
import type { Mode, PaireTropProche, Profil, Recette } from 'ucm-couleur';

import type { EtatHarmonisation } from '../../harmonisation';
import { createCarte } from '../carte';
import { memoriserVues, type Localisation } from '../localisation';
import { nuancesVues } from './apercu';

export interface GestesDeLaListe {
  /** Le designer coche ou décoche une palette, par la case ou par sa rangée. */
  cocher(id: string): void;
  toutDecocher(): void;
}

export interface CarteDeLaListeUi {
  readonly element: HTMLElement;
  afficher(recette: Recette, paires: readonly PaireTropProche[], etat: EtatHarmonisation): void;
}

interface Rangee {
  readonly id: string;
  readonly element: HTMLLabelElement;
  readonly coche: HTMLInputElement;
}

function construireVues(i18n: Localisation) {
  const { TEXTES_DE_L_HARMONISATION: { liste: TEXTES }, nomDeLaPalette } = i18n.messages;

  function createCarteDeLaListe(gestes: GestesDeLaListe): CarteDeLaListeUi {
    // Le sous-titre dit les numéros de la recette : `afficher` le refait à la première lecture.
    const carte = createCarte({ titre: TEXTES.titre, sousTitre: TEXTES.sousTitre(50, 950, 'light'), repliable: { ouverte: true, resumeReplie: true } }, i18n);
    const sousTitre = carte.element.querySelector<HTMLElement>('.carte-sous-titre')!;
    const aide = document.createElement('p');
    aide.className = 'ligne-secondaire liste-aide';
    i18n.lier(aide, 'textContent', TEXTES.aide);
    const grille = document.createElement('div');
    grille.className = 'liste';
    const pied = document.createElement('div');
    pied.className = 'pied-de-carte';
    const compte = document.createElement('span');
    compte.className = 'ligne-secondaire';
    compte.setAttribute('aria-live', 'polite');
    const decocher = document.createElement('button');
    decocher.type = 'button';
    decocher.className = 'bouton-discret';
    i18n.lier(decocher, 'textContent', TEXTES.toutDecocher);
    decocher.addEventListener('click', () => gestes.toutDecocher());
    pied.append(compte, decocher);
    carte.corps.append(aide, grille, pied);

    let rangees: Rangee[] = [];
    let dessinee: { readonly recette: Recette; readonly paires: readonly PaireTropProche[]; readonly mode: Mode; readonly intensite: Profil } | null = null;

    /** Pour chaque palette d'une paire trop proche, les noms des palettes dont elle est trop proche. */
    function voisines(recette: Recette, paires: readonly PaireTropProche[]): Map<string, string[]> {
      const nom = (id: string): string => nomDeLaPalette(recette.palettes.find((palette) => palette.id === id)!);
      const parPalette = new Map<string, string[]>();
      for (const { palettes: [a, b] } of paires) {
        parPalette.set(a, [...(parPalette.get(a) ?? []), nom(b)]);
        parPalette.set(b, [...(parPalette.get(b) ?? []), nom(a)]);
      }
      return parPalette;
    }

    function rangeeDe(recette: Recette, paires: Map<string, string[]>, id: string, rang: number, etat: EtatHarmonisation): Rangee {
      const palette = recette.palettes.find((candidate) => candidate.id === id)!;
      const nom = nomDeLaPalette(palette);
      const ligne = rang + 2;
      const element = document.createElement('label');
      element.className = 'ligne-de-palette';
      element.dataset.palette = id;
      const fond = document.createElement('span');
      fond.className = 'fond-de-ligne';
      fond.style.gridRow = String(ligne);
      const coche = document.createElement('input');
      coche.type = 'checkbox';
      coche.className = 'case-a-cocher';
      coche.dataset.palette = id;
      coche.style.gridRow = String(ligne);
      coche.style.gridColumn = '1';
      coche.setAttribute('aria-label', nom);
      coche.addEventListener('change', () => gestes.cocher(id));
      const nomAffiche = document.createElement('span');
      nomAffiche.className = 'nom';
      nomAffiche.textContent = nom;
      nomAffiche.title = nom;
      nomAffiche.style.gridRow = String(ligne);
      nomAffiche.style.gridColumn = '2';
      const rampe = document.createElement('span');
      rampe.className = 'rampe-continue';
      rampe.style.gridRow = String(ligne);
      rampe.style.gridColumn = '3';
      for (const nuance of nuancesVues(recette, palette, etat.intensite, etat.mode)) {
        const aplat = document.createElement('i');
        aplat.style.background = nuance.hexa;
        rampe.append(aplat);
      }
      element.append(fond, coche, nomAffiche, rampe);
      const proches = paires.get(id);
      if (proches) {
        const signal = document.createElement('span');
        signal.className = 'signal';
        signal.setAttribute('role', 'img');
        signal.style.gridRow = String(ligne);
        signal.style.gridColumn = '4';
        const texte = TEXTES.tropProcheDe(proches);
        i18n.lier(signal, 'title', texte);
        i18n.lier(signal, 'aria-label', texte);
        signal.textContent = '!';
        element.append(signal);
      }
      return { id, element, coche };
    }

    function dessinerLesRangees(recette: Recette, paires: readonly PaireTropProche[], etat: EtatHarmonisation): void {
      const entete = [document.createElement('span'), document.createElement('span'), document.createElement('span'), document.createElement('span')];
      entete[2].className = 'numeros';
      for (const cran of recette.crans) {
        const numero = document.createElement('span');
        numero.textContent = String(cran);
        entete[2].append(numero);
      }
      const proches = voisines(recette, paires);
      rangees = recette.palettes.map((palette, rang) => rangeeDe(recette, proches, palette.id, rang, etat));
      grille.replaceChildren(...entete, ...rangees.map(({ element }) => element));
    }

    return {
      element: carte.element,
      afficher(recette, paires, etat) {
        const cle = { recette, paires, mode: etat.mode, intensite: etat.intensite };
        if (!dessinee || dessinee.recette !== recette || dessinee.paires !== paires || dessinee.mode !== etat.mode || dessinee.intensite !== etat.intensite) {
          dessinerLesRangees(recette, paires, etat);
          dessinee = cle;
          i18n.lier(sousTitre, 'textContent', TEXTES.sousTitre(recette.crans[0], recette.crans[recette.crans.length - 1], etat.mode));
          carte.poserResume(TEXTES.resume(recette.palettes.length));
        }
        for (const rangee of rangees) {
          const cochee = etat.cochees.includes(rangee.id);
          rangee.element.dataset.cochee = String(cochee);
          rangee.coche.checked = cochee;
        }
        const nombre = etat.cochees.length;
        i18n.lier(compte, 'textContent', etat.trop ? TEXTES.quatreAuPlus : nombre === 0 ? TEXTES.aucuneCochee : TEXTES.cochees(nombre));
        decocher.hidden = nombre === 0;
      },
    };
  }
  return { createCarteDeLaListe };
}

export const creerVuesCarteDeLaListe = memoriserVues(construireVues);

/**
 * La carte « Palettes trop proches » d'Harmonisation ([UI-40]) : une rangée par
 * paire que `pairesTropProches` juge sous le seuil, la plus proche d'abord. La
 * rangée montre les deux couleurs en cause, dans le thème du constat et en
 * Vivid (ou l'unique intensité), puis les deux noms et le constat. « Comparer »
 * confie la paire à l'onglet. La carte est cachée quand aucune paire ne se
 * ressemble trop.
 */
import type { PaireTropProche, Recette } from 'ucm-couleur';

import { createCarte } from '../carte';
import { memoriserVues, type Localisation } from '../localisation';
import { couleurDuRole } from './apercu';

export interface GestesDeLaCarteDesPaires {
  /** Le designer compare la paire : l'onglet la coche et choisit la palette à régler. */
  comparer(paire: PaireTropProche): void;
}

export interface CarteDesPairesUi {
  readonly element: HTMLElement;
  /** Repeint les rangées quand la recette ou ses paires changent ; sinon sans effet. */
  afficher(recette: Recette, paires: readonly PaireTropProche[], visite: readonly PaireTropProche[]): void;
}

const memePaire = (a: PaireTropProche, b: PaireTropProche): boolean => a.palettes.every((id) => b.palettes.includes(id));

function construireVues(i18n: Localisation) {
  const { TEXTES_DE_L_HARMONISATION: { echantillon, paires: TEXTES }, nomDeLaPalette } = i18n.messages;

  function createCarteDesPaires(gestes: GestesDeLaCarteDesPaires): CarteDesPairesUi {
    const carte = createCarte({ titre: TEXTES.titre, sousTitre: TEXTES.sousTitre, repliable: { ouverte: true, resumeReplie: true } }, i18n);
    const liste = document.createElement('div');
    liste.className = 'paires';
    liste.dataset.hauteurTenue = '';
    carte.corps.append(liste);
    let dessinee: { readonly recette: Recette; readonly paires: readonly PaireTropProche[]; readonly visite: readonly PaireTropProche[] } | null = null;

    /** Les deux pastilles d'une paire : le plein et son texte, ou le fond teinté et son texte, du thème du constat. */
    function pastilles(recette: Recette, paire: PaireTropProche): HTMLSpanElement {
      const [fond, encre] = paire.proximite.role === 'plein' ? (['solid/default', 'solid/foreground'] as const) : (['surface/default', 'surface/foreground'] as const);
      const { mode } = paire.proximite;
      const element = document.createElement('span');
      element.className = 'paire-couleurs';
      element.style.background = recette.fonds[mode];
      element.setAttribute('aria-hidden', 'true');
      for (const id of paire.palettes) {
        const palette = recette.palettes.find((candidate) => candidate.id === id)!;
        const pastille = document.createElement('i');
        pastille.style.background = couleurDuRole(recette, palette, fond, mode, 'vivid') ?? 'transparent';
        pastille.style.color = couleurDuRole(recette, palette, encre, mode, 'vivid') ?? 'inherit';
        i18n.lier(pastille, 'textContent', echantillon);
        element.append(pastille);
      }
      return element;
    }

    function rangee(recette: Recette, paire: PaireTropProche, separee: boolean): HTMLDivElement {
      const [a, b] = paire.palettes.map((id) => nomDeLaPalette(recette.palettes.find((palette) => palette.id === id)!));
      const element = document.createElement('div');
      element.className = 'paire';
      element.dataset.paire = paire.palettes.join(' ');
      if (separee) element.dataset.separee = '';
      const texte = document.createElement('span');
      texte.className = 'paire-texte';
      const noms = document.createElement('b');
      const constat = document.createElement('span');
      const nomsEcrits = TEXTES.noms(a, b);
      const constatEcrit = separee ? TEXTES.separee : TEXTES.constat(paire.proximite.role, paire.proximite.mode, paire.proximite.presqueIdentiques);
      i18n.lier(noms, 'textContent', nomsEcrits);
      i18n.lier(noms, 'title', nomsEcrits);
      i18n.lier(constat, 'textContent', constatEcrit);
      i18n.lier(constat, 'title', constatEcrit);
      texte.append(noms, constat);
      const comparer = document.createElement('button');
      comparer.type = 'button';
      comparer.className = 'bilan-verifier';
      i18n.lier(comparer, 'textContent', TEXTES.comparer);
      i18n.lier(comparer, 'aria-label', TEXTES.comparerLaPaire(a, b));
      comparer.addEventListener('click', () => gestes.comparer(paire));
      element.append(pastilles(recette, paire), texte, comparer);
      return element;
    }

    return {
      element: carte.element,
      afficher(recette, paires, visite) {
        if (dessinee?.recette === recette && dessinee.paires === paires && dessinee.visite === visite) return;
        dessinee = { recette, paires, visite };
        const actuelle = (vue: PaireTropProche) => paires.find((paire) => memePaire(paire, vue));
        // Une paire de la visite dont une palette a disparu (une annulation, par exemple) perd sa rangée.
        const existe = (vue: PaireTropProche) => vue.palettes.every((id) => recette.palettes.some((palette) => palette.id === id));
        const rangees = visite.filter(existe).map((vue) => rangee(recette, actuelle(vue) ?? vue, actuelle(vue) === undefined));
        const nouvelles = paires.filter((paire) => !visite.some((vue) => memePaire(paire, vue)));
        carte.element.hidden = rangees.length + nouvelles.length === 0;
        carte.poserResume(TEXTES.resume(paires.length));
        liste.replaceChildren(...rangees, ...nouvelles.map((paire) => rangee(recette, paire, false)));
      },
    };
  }
  return { createCarteDesPaires };
}

export const creerVuesCarteDesPaires = memoriserVues(construireVues);

/**
 * Le nuancier des palettes : une carte par palette, dans l'ordre de la
 * recette. Chaque carte montre trois aplats en Light (la nuance 200, la
 * nuance d'ancrage de la référence, la nuance 800), puis le nom de la palette
 * dans une bande blanche. L'accueil de Création et le bilan de Vérification
 * l'emploient quand aucune palette n'est ouverte.
 *
 * Une carte est un `button` : son nom accessible est celui de la palette,
 * complété de l'état quand elle en porte un. Une carte atténuée reste
 * cliquable.
 */
import { ancrageDe, grilleDe, intensitesDe, rampeDe, rampesDe, type Palette, type Recette } from 'ucm-couleur';

import { memoriserVues, type Localisation } from './localisation';

/** L'état d'une carte : le point rouge d'une palette à corriger, ambre d'une palette à vérifier. */
export type EtatDeCarte = 'rouge' | 'ambre';

/** Une palette à montrer. */
export interface EntreeDuNuancierDesPalettes {
  readonly palette: Palette;
  readonly etat?: EtatDeCarte;
  /** Vrai pour une carte à 30 % d'opacité et désaturée, qui reste cliquable. */
  readonly attenuee?: boolean;
}

export interface EntreesDuNuancierDesPalettes {
  readonly recette: Recette;
  /** Les palettes à montrer, dans l'ordre où le nuancier les range. */
  readonly palettes: readonly EntreeDuNuancierDesPalettes[];
}

export interface NuancierDesPalettesUi {
  element: HTMLDivElement;
  /** Redessine les cartes dans le même conteneur. */
  afficher(entrees: EntreesDuNuancierDesPalettes): void;
}

/** Les trois couleurs des aplats d'une carte, en Light : 200, ancrage, 800. */
export function aplatsDeLaCarte(recette: Recette, palette: Palette): [string, string, string] {
  const rampes = rampesDe(recette, palette);
  const profil = intensitesDe(palette).includes('vivid') ? 'vivid' : 'unique';
  const rampe = rampeDe(rampes, profil).light;
  const { crans } = grilleDe(recette, palette);
  const rang = (numero: number, repli: number) => {
    const trouve = crans.indexOf(numero);
    return trouve >= 0 ? trouve : repli;
  };
  const ancrage = ancrageDe(recette, palette).rangs.light;
  const dernier = rampe.length - 1;
  const hexa = (indice: number) => rampe[Math.min(Math.max(indice, 0), dernier)].hexa;
  return [hexa(rang(200, 1)), hexa(ancrage), hexa(rang(800, dernier - 1))];
}

function construireVues(i18n: Localisation) {
  const { TEXTES_DU_NUANCIER_DES_PALETTES, nomDeLaPalette } = i18n.messages;

  function carte(recette: Recette, entree: EntreeDuNuancierDesPalettes, ouvrir: (id: string) => void): HTMLButtonElement {
    const { palette, etat, attenuee } = entree;
    const nom = nomDeLaPalette(palette);
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'nuancier-carte';
    bouton.dataset.palette = palette.id;
    if (etat) bouton.dataset.etat = etat;
    if (attenuee) bouton.classList.add('attenuee');
    bouton.title = nom;
    i18n.lier(bouton, 'aria-label', etat ? TEXTES_DU_NUANCIER_DES_PALETTES.nomAvecEtat(nom, TEXTES_DU_NUANCIER_DES_PALETTES.etat[etat]) : nom);
    for (const couleur of aplatsDeLaCarte(recette, palette)) {
      const aplat = document.createElement('i');
      aplat.className = 'nuancier-aplat';
      aplat.style.background = couleur;
      bouton.append(aplat);
    }
    const bande = document.createElement('span');
    bande.className = 'nuancier-bande';
    const texte = document.createElement('span');
    texte.className = 'nuancier-nom';
    texte.textContent = nom;
    bande.append(texte);
    if (etat) {
      const point = document.createElement('span');
      point.className = 'nuancier-point';
      point.dataset.etat = etat;
      bande.append(point);
    }
    bouton.append(bande);
    bouton.addEventListener('click', () => ouvrir(palette.id));
    return bouton;
  }

  /** Le nuancier ; `ouvrir` reçoit l'identifiant de la palette dont on clique la carte. */
  function nuancierDesPalettes(ouvrir: (id: string) => void): NuancierDesPalettesUi {
    const element = document.createElement('div');
    element.className = 'nuancier-des-palettes';
    return {
      element,
      afficher({ recette, palettes }) {
        element.replaceChildren(...palettes.map((entree) => carte(recette, entree, ouvrir)));
      },
    };
  }
  return { nuancierDesPalettes };
}

export const creerVuesNuancierDesPalettes = memoriserVues(construireVues);

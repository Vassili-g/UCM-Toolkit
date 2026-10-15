/**
 * Un glisser prévisualise une palette au plus une fois par image : la dernière
 * palette demandée part à l'image suivante, les précédentes sont perdues. Les
 * cartes « Réglages » ([UI-42]) et « Roue des teintes » ([UI-43]) s'en servent.
 */
import type { Palette } from 'ucm-couleur';

export interface PrevisualisationParImage {
  /** Garde `palette` pour l'image suivante, ou remplace celle qui attend. */
  proposer(palette: Palette): void;
  /** Abandonne l'aperçu qui attend. */
  annuler(): void;
}

export function creerPrevisualisationParImage(montrer: (palette: Palette) => void): PrevisualisationParImage {
  let enAttente: { palette: Palette; image: number } | null = null;
  return {
    proposer(palette) {
      if (enAttente) {
        enAttente.palette = palette;
        return;
      }
      const image = requestAnimationFrame(() => {
        const attente = enAttente;
        enAttente = null;
        if (attente) montrer(attente.palette);
      });
      enAttente = { palette, image };
    },
    annuler() {
      if (enAttente) cancelAnimationFrame(enAttente.image);
      enAttente = null;
    },
  };
}

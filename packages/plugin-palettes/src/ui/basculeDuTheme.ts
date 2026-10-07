/**
 * La bascule Light/Dark du thème montré ([UI-23]) : le choix « Aperçu » de la
 * ligne du titre de la palette, que Création et Vérification rendent chacune.
 * Elle lit et pose le thème de l'état partagé (`paletteOuverte.ts`), sans
 * demande au sandbox.
 */
import { MODES, type Mode } from 'ucm-couleur';

import { creerVuesChoix, type ChoixUi } from './choix';
import { memoriserVues, type Localisation } from './localisation';
import type { PaletteOuverte } from './paletteOuverte';

function construireVues(i18n: Localisation) {
  const { createChoix } = creerVuesChoix(i18n);
  const { TEXTES, TEXTES_DE_L_ONGLET } = i18n.messages;

  /** `etat` porte le thème montré, que la bascule suit et que ses segments choisissent. */
  function createBasculeDuTheme(etat: Pick<PaletteOuverte, 'theme' | 'choisirLeTheme' | 'abonnerAuTheme'>): ChoixUi<Mode> {
    const choix = createChoix<Mode>({
      libelle: TEXTES_DE_L_ONGLET.apercu,
      nom: TEXTES.modesDeLApercu,
      options: MODES.map((valeur) => ({ valeur, texte: valeur === 'light' ? TEXTES.modeClairCourt : TEXTES.modeSombreCourt })),
      surChoix: (mode) => etat.choisirLeTheme(mode),
      miseEnAvant: true,
    });
    choix.poser(etat.theme());
    etat.abonnerAuTheme((mode) => choix.poser(mode));
    return choix;
  }
  return { createBasculeDuTheme };
}

export const creerVuesBasculeDuTheme = memoriserVues(construireVues);

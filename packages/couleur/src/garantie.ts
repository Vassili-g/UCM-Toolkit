/**
 * La garantie des courbes ([ENT-10]) : dans la table du sens de chaque mode,
 * le cran de `page/foreground` tient le seuil textuel et le cran de
 * `page/focus` le seuil non textuel contre le cran le plus léger de la même
 * courbe, gris, pour toute teinte, les deux profils et les deux modes, sur
 * les couleurs à 8 bits. Elle ajoute un contrôle : le cran de `solid/default`
 * tient le seuil textuel contre le texte des boutons du mode. Une courbe
 * éditée qui ne la tient plus sonne « courbe hors garantie ». L'alerte
 * n'empêche ni le rangement ni le dessin.
 */
import {
  COULEUR_DU_TEXTE_DES_BOUTONS,
  TABLE_DES_DOSSIERS,
  atteintLeSeuil,
  contraste,
  rangDuCranLeger,
  sensDuTheme,
  type VariableDePalette,
} from '@ucm-kit/core/emplois';

import { lireHexa, type Rgb8 } from './conversions';
import { fabriquerCran, MODES, PROFILS, type Mode, type Profil } from './rampe';
import type { Recette } from './recette';

/** Le pire cas d'un cran qui ne tient plus son seuil. */
export interface ManqueDeGarantie {
  readonly mode: Mode;
  readonly cran: number;
  readonly profil: Profil;
  /** La teinte entière du pire cas, en degrés. */
  readonly teinte: number;
  readonly contraste: number;
  readonly seuil: number;
  /** Ce que le cran est jugé contre : le cran le plus léger de la liste, ou le texte des boutons du mode. */
  readonly contre: 'cranLeger' | 'texteDesBoutons';
}

/** Les variables garanties, le seuil que chacune tient, et ce qu'elle est jugée contre. */
const VARIABLES_GARANTIES: readonly { variable: VariableDePalette; seuil: 'texte' | 'nonTexte'; contre: ManqueDeGarantie['contre'] }[] = [
  { variable: 'page/foreground', seuil: 'texte', contre: 'cranLeger' },
  { variable: 'page/focus', seuil: 'nonTexte', contre: 'cranLeger' },
  { variable: 'solid/default', seuil: 'texte', contre: 'texteDesBoutons' },
];

/**
 * Les manques de la garantie, un par mode, cran, profil et opposant qui
 * échoue, portant la teinte du pire cas. Une liste vide dit que les courbes
 * tiennent.
 */
export function garantieDesCourbes(recette: Recette): ManqueDeGarantie[] {
  const manques: ManqueDeGarantie[] = [];
  for (const mode of MODES) {
    const courbe = recette.courbes[mode];
    const texte = recette.texteDesBoutons[mode];
    const table = TABLE_DES_DOSSIERS[sensDuTheme(mode, texte)];
    const cranLeger = fabriquerCran(courbe[rangDuCranLeger(recette.crans)], 0, 0, recette.gamut).couleur;
    const opposants: { [C in ManqueDeGarantie['contre']]: Rgb8 } = {
      cranLeger,
      texteDesBoutons: lireHexa(COULEUR_DU_TEXTE_DES_BOUTONS[texte])!,
    };
    for (const { variable, seuil: nom, contre } of VARIABLES_GARANTIES) {
      const cran = table[variable];
      if (typeof cran !== 'number') continue;
      const rang = recette.crans.indexOf(cran);
      if (rang < 0) continue;
      const seuil = recette.seuils[nom];
      for (const profil of PROFILS) {
        const part = recette.profils[profil].part;
        let pire = { teinte: 0, contraste: Infinity };
        for (let teinte = 0; teinte < 360; teinte += 1) {
          const valeur = contraste(fabriquerCran(courbe[rang], teinte, part, recette.gamut).couleur, opposants[contre]);
          if (valeur < pire.contraste) pire = { teinte, contraste: valeur };
        }
        if (!atteintLeSeuil(pire.contraste, seuil)) manques.push({ mode, cran, profil, ...pire, seuil, contre });
      }
    }
  }
  return manques;
}

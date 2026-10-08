/** Les textes du document restent indépendants de la langue de l’interface. */
export * from '../i18n/fr';

import type { Mode, TexteDesBoutons } from 'ucm-couleur';

import { NOM_DU_TEXTE_DES_BOUTONS, TEXTES_DE_LA_PLANCHE } from '../i18n/fr';

/**
 * Les textes de la planche en dossiers (lot 9, M2) : une ligne par dossier,
 * `solid`, `surface`, `page`, avec son rôle et ses exemples d'usage. Ils
 * restent en français, quelle que soit la langue de l'interface.
 */
export const TEXTES_DES_DOSSIERS_DE_LA_PLANCHE = {
  titre: (profil: string | null) => (profil ? `Quelle nuance pour quelle variable · ${profil}` : 'Quelle nuance pour quelle variable'),
  dossiers: {
    solid: { role: 'Fond plein', exemples: 'bouton principal, badge plein' },
    surface: { role: 'Fond teinté', exemples: 'alerte, badge doux, ligne sélectionnée' },
    page: { role: 'Sur la page', exemples: 'lien, champ, anneau, filet' },
  },
  /** Le texte et le contour d'un dossier, dits une fois dans l'en-tête de sa ligne. */
  texteDeSolid: (texte: TexteDesBoutons) => `texte : solid/foreground, ${NOM_DU_TEXTE_DES_BOUTONS[texte]}`,
  texteEtContourDeSurface: (cran: number) => `texte et contour : surface/foreground, surface/border · ${cran}`,
  /** La note du neutre, posée dans la ligne `page` : son corps de texte ne suit pas la rampe. */
  noteDuNeutre: 'page/foreground-main : corps de texte, noir ou blanc purs, hors de la rampe',
  specimens: { solid: 'Bouton', surface: 'Fond teinté', lien: 'Lien coloré', champ: 'Champ' },
  /** Les garanties, sous les spécimens, nomment leurs variables. */
  laPage: 'la page',
  texte: 'texte',
  contour: 'contour',
  sansMinimum: 'sans minimum de contraste',
} as const;

/** L'en-tête d'un thème : son mode, le fond de sa page et le texte de ses boutons. */
export function enTeteDuThemeDeLaPlanche(mode: Mode, fond: string, texteDesBoutons: TexteDesBoutons): string {
  return `${TEXTES_DE_LA_PLANCHE.mode[mode]} · fond de la page ${fond} · texte des boutons ${NOM_DU_TEXTE_DES_BOUTONS[texteDesBoutons]}`;
}

/**
 * Les trois grandeurs d'un réglage de palette, teinte, saturation et
 * luminosité, telles que les réglettes du Réglage global ([UI-38]) et de la
 * carte Réglages d'Harmonisation ([UI-42]) les écrivent, les lisent, nomment
 * les bouts de leur piste et la peignent.
 */
import { aUneIntensite, enveloppeDe, fabriquerCran, pivotDe, type Palette, type Profil, type Recette } from 'ucm-couleur';

import { lireNombre } from '../configuration';
import { familleVoisine } from '../familles';
import { CURSEURS, type Grandeur } from '../reglagesParDefaut';
import type { Localisation, Texte } from './localisation';

export function outilsDesGrandeurs(i18n: Localisation) {
  const { TEXTES_DES_REGLAGES, luminositeReglee, saturationReglee, teinteReglee } = i18n.messages;

  /** Le texte d'un champ : la teinte signée en degrés, la saturation en pour cent, la luminosité signée. */
  const ecrire = (grandeur: Grandeur, valeur: number): Texte =>
    grandeur === 'teinte' ? teinteReglee(valeur) : grandeur === 'saturation' ? saturationReglee(valeur) : luminositeReglee(valeur);

  /** La valeur qu'un champ saisi porte, sans signe typographique ni unité ; la saturation se lit en pour cent. */
  function lire(grandeur: Grandeur, saisie: string): number | null {
    const nombre = lireNombre(saisie.replace(/[°%\s+]/g, '').replace('−', '-'));
    if (nombre === null) return null;
    return grandeur === 'saturation' ? nombre / 100 : nombre;
  }

  /** Les mots des deux bouts d'une piste ; ceux de la teinte nomment les familles voisines de la teinte affichée. */
  function boutsDe(grandeur: Grandeur, teinte: number): { gauche: Texte; droite: Texte } {
    if (grandeur !== 'teinte') return TEXTES_DES_REGLAGES.bouts[grandeur];
    const { bouts, familles } = TEXTES_DES_REGLAGES;
    return { gauche: bouts.teinte(familles[familleVoisine(teinte, -1)]), droite: bouts.teinte(familles[familleVoisine(teinte, 1)]) };
  }

  return { ecrire, lire, boutsDe };
}

/** La piste peinte d'une grandeur : neuf couleurs fabriquées par le moteur, de la borne basse à la borne haute. */
export function peindreLaGrandeur(recette: Recette, palette: Palette, profil: Profil, grandeur: Grandeur, valeurs: Record<Grandeur, number>): string {
  const intensite = aUneIntensite(palette) ? 'unique' : profil;
  const pivot = pivotDe(recette, palette, intensite);
  // La référence est une couleur du thème Light : la piste en prend l'enveloppe ([MOT-35]).
  const enveloppe = enveloppeDe(recette, intensite, 'light');
  const { min, max } = CURSEURS[grandeur];
  const depart = { L: pivot.L + valeurs.luminosite, H: pivot.H - valeurs.teinte, part: valeurs.saturation };
  const couleurs = Array.from({ length: 9 }, (_, rang) => {
    const x = min + ((max - min) * rang) / 8;
    const L = grandeur === 'luminosite' ? pivot.L + x : depart.L;
    const H = grandeur === 'teinte' ? depart.H + x : pivot.H;
    const part = grandeur === 'saturation' ? x : depart.part;
    return fabriquerCran(Math.min(1, Math.max(0, L)), H, Math.min(1, Math.max(0, part)), recette.gamut, enveloppe).hexa;
  });
  return `linear-gradient(to right, ${couleurs.join(', ')})`;
}

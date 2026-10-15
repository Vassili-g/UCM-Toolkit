/**
 * Les couleurs que les cartes d'Harmonisation peignent : les rampes d'une
 * palette dans l'intensité et le thème de l'aperçu, et la couleur d'un rôle de
 * la table du kit. Elles se calculent par recette : une carte qui se repeint
 * sans que la recette change ne refait pas les rampes.
 */
import { aUneIntensite, cranDeLaVariable, ecrireHexa, grilleDe, grisDeMemeClarte, lireHexa, rampesDe, sensDuTheme, type Cran, type Intensite, type Mode, type Palette, type Profil, type Rampes, type Recette } from 'ucm-couleur';

/** Les rôles que les cartes montrent : un plein et son texte, un fond teinté et son texte, un contour et un texte de page. */
export type RoleDApercu = 'solid/default' | 'solid/foreground' | 'surface/default' | 'surface/foreground' | 'page/border' | 'page/foreground';

/** L'affichage des cartes de comparaison : les couleurs, ou le gris de même clarté OKLab. */
export type AffichageDApercu = 'couleurs' | 'gris';

/** L'encre d'une surface d'aperçu : sombre sur le fond Light, claire sur le fond Dark. */
export const ENCRE_D_APERCU: Readonly<Record<Mode, string>> = { light: '#1E1E1E', dark: '#F2F2F2' };

const rampesParRecette = new WeakMap<Recette, Map<string, Rampes>>();

function rampesDeLaPalette(recette: Recette, palette: Palette): Rampes {
  let parPalette = rampesParRecette.get(recette);
  if (!parPalette) {
    parPalette = new Map();
    rampesParRecette.set(recette, parPalette);
  }
  let rampes = parPalette.get(palette.id);
  if (!rampes) {
    rampes = rampesDe(recette, palette);
    parPalette.set(palette.id, rampes);
  }
  return rampes;
}

/** Une palette à une intensité se montre sur sa seule rampe, quelle que soit l'intensité vue. */
export function intensiteVue(palette: Palette, intensite: Profil): Intensite {
  return aUneIntensite(palette) ? 'unique' : intensite;
}

/**
 * Les nuances de la palette dans l'intensité vue et le thème de l'aperçu, dans
 * l'ordre de sa grille. Une palette figée qui ne porte qu'une rampe la montre
 * sous les deux intensités.
 */
export function nuancesVues(recette: Recette, palette: Palette, intensite: Profil, mode: Mode): readonly Cran[] {
  const rampes = rampesDeLaPalette(recette, palette);
  const rampe = rampes[intensiteVue(palette, intensite)] ?? rampes.unique ?? rampes.vivid ?? rampes.soft;
  if (!rampe) throw new Error(`Aucune rampe pour la palette ${palette.id}.`);
  return rampe[mode];
}

/**
 * La couleur d'un rôle de la palette, lue au cran que la table du kit lui
 * donne ; `solid/foreground` vaut le texte des boutons du thème. `null` quand
 * la grille de la palette n'a pas ce cran.
 */
export function couleurDuRole(recette: Recette, palette: Palette, role: RoleDApercu, mode: Mode, intensite: Profil): string | null {
  const cran = cranDeLaVariable(role, mode, sensDuTheme(mode, recette.texteDesBoutons[mode]));
  if (cran === 'texteDesBoutons') return recette.texteDesBoutons[mode] === 'blanc' ? '#FFFFFF' : '#000000';
  if (cran === undefined) return null;
  const rang = grilleDe(recette, palette).crans.indexOf(cran);
  return rang < 0 ? null : nuancesVues(recette, palette, intensite, mode)[rang].hexa;
}

/** Le gris de même clarté OKLab qu'une couleur écrite en hexa. */
export function enGris(hexa: string): string {
  const couleur = lireHexa(hexa);
  return couleur ? ecrireHexa(grisDeMemeClarte(couleur)) : hexa;
}

/** La couleur d'un rôle telle que l'affichage la montre ; le texte des boutons pleins reste blanc ou noir en gris. */
export function couleurDuRoleVue(recette: Recette, palette: Palette, role: RoleDApercu, mode: Mode, intensite: Profil, affichage: AffichageDApercu): string | null {
  const couleur = couleurDuRole(recette, palette, role, mode, intensite);
  return couleur === null || affichage === 'couleurs' || role === 'solid/foreground' ? couleur : enGris(couleur);
}

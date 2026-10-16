/**
 * La fraîcheur de la planche ([PLA-19], [PLA-20]) : l'empreinte rangée sur
 * chaque cadre possédé, comparée à celle du modèle que la recette donne
 * aujourd'hui. S'y ajoutent les cadres orphelins ([ENT-03]) et les copies
 * ([PLA-25]). L'interface la calcule après chaque lecture et chaque rangement ;
 * elle ne redessine jamais.
 *
 * Un cadre rangé que la lecture ne retrouve pas n'est pas « jamais généré » :
 * il est introuvable, ou illisible quand Figma a refusé de le lire (V8.2).
 */
import type { Palette, Recette } from 'ucm-couleur';

import type { CadreLu, EtatDeLaPlanche, ProfilDuDocument } from '../lecture';
import { empreinteDuModele } from './modele';
import { nomDeLaPalette } from './textes';

export type EtatDuCadre = 'jamais-dessinee' | 'a-jour' | 'perimee' | 'introuvable' | 'illisible';

/** L'état du cadre d'une palette, et où il se trouve quand il est localisé. */
export interface CadreDUnePalette {
  readonly etat: EtatDuCadre;
  readonly cadre: string | null;
  readonly page: string | null;
  readonly nomDeLaPage: string | null;
}

export interface FraicheurDeLaPlanche {
  /** Une entrée par palette, dans l'ordre de la recette. */
  readonly palettes: readonly ({ readonly palette: string } & CadreDUnePalette)[];
  /** Les cadres possédés dont la palette a quitté la recette. */
  readonly orphelins: readonly CadreLu[];
  /** Les copies de cadre faites par le designer. */
  readonly copies: readonly CadreLu[];
}

/**
 * Les cadres orphelins que des palettes sans cadre reprennent : un cadre
 * possédé dont la palette a quitté la recette, et qui porte le nom d'une
 * palette de la recette, comme une palette supprimée puis recréée. Chaque
 * cadre va à la première palette de ce nom, dans l'ordre de la recette. La
 * clé est la palette de la recette, la valeur la palette qui a quitté la
 * recette. Le dessin et la fraîcheur lisent la même attribution.
 */
export function cadresRepris(possedes: readonly { readonly palette: string; readonly nom: string }[], recette: Pick<Recette, 'palettes'>): Map<string, string> {
  const presentes = new Set(recette.palettes.map((palette) => palette.id));
  const avecCadre = new Set(possedes.map((cadre) => cadre.palette));
  const libres = possedes.filter((cadre) => !presentes.has(cadre.palette));
  const repris = new Map<string, string>();
  const pris = new Set<string>();
  for (const palette of recette.palettes) {
    if (avecCadre.has(palette.id)) continue;
    const orphelin = libres.find((cadre) => cadre.nom === nomDeLaPalette(palette) && !pris.has(cadre.palette));
    if (!orphelin) continue;
    pris.add(orphelin.palette);
    repris.set(palette.id, orphelin.palette);
  }
  return repris;
}

/**
 * Le cadre d'une seule palette : l'état que sa fiche de l'onglet Palettes
 * montre ([UI-05]). Le calcul reconstruit le modèle de ce seul cadre, avec les
 * parties que la recette dessine ([PLA-28]) : un cadre dessiné avec d'autres
 * parties est à actualiser.
 */
export function fraicheurDUnePalette(recette: Recette, profil: ProfilDuDocument, planche: EtatDeLaPlanche, id: string): CadreDUnePalette {
  const palette = recette.palettes.find((candidate) => candidate.id === id);
  const cadre = planche.cadres.find((candidat) => candidat.possede && candidat.palette === id);
  if (palette && cadre) {
    const attendue = empreinteDuModele(recette, palette, profil);
    return { etat: attendue === cadre.empreinte ? 'a-jour' : 'perimee', cadre: cadre.cadre, page: cadre.page, nomDeLaPage: cadre.nomDeLaPage };
  }
  // Le cadre d'une palette supprimée qui porte son nom : le dessin le reprend, et il est à actualiser jusque-là.
  const orphelin = cadresRepris(planche.cadres.filter((candidat) => candidat.possede), recette).get(id);
  const repris = orphelin === undefined ? undefined : planche.cadres.find((candidat) => candidat.possede && candidat.palette === orphelin);
  if (palette && repris) return { etat: 'perimee', cadre: repris.cadre, page: repris.page, nomDeLaPage: repris.nomDeLaPage };
  const manquant = planche.manquants.find((candidat) => candidat.palette === id);
  return { etat: manquant ? manquant.raison : 'jamais-dessinee', cadre: null, page: null, nomDeLaPage: null };
}

export function fraicheurDeLaPlanche(recette: Recette, profil: ProfilDuDocument, planche: EtatDeLaPlanche): FraicheurDeLaPlanche {
  const presentes = new Set(recette.palettes.map((palette) => palette.id));
  const repris = new Set(cadresRepris(planche.cadres.filter((cadre) => cadre.possede), recette).values());
  return {
    palettes: recette.palettes.map((palette) => ({ palette: palette.id, ...fraicheurDUnePalette(recette, profil, planche, palette.id) })),
    orphelins: planche.cadres.filter((cadre) => cadre.possede && !presentes.has(cadre.palette) && !repris.has(cadre.palette)),
    copies: planche.cadres.filter((cadre) => !cadre.possede),
  };
}

/**
 * Ce qu'un import ferait aux cadres déjà dessinés (V12.2), sans rien écrire :
 * les palettes dont le cadre à jour passerait « À actualiser », et celles
 * dont le cadre deviendrait orphelin, retirées par l'import.
 */
export function consequenceDeLImport(
  actuelle: Recette,
  importee: Recette,
  profil: ProfilDuDocument,
  planche: EtatDeLaPlanche,
): { readonly aMettreAJour: readonly Palette[]; readonly orphelins: readonly Palette[] } {
  const avant = fraicheurDeLaPlanche(actuelle, profil, planche);
  const apres = fraicheurDeLaPlanche(importee, profil, planche);
  const aJour = new Set(avant.palettes.filter(({ etat }) => etat === 'a-jour').map(({ palette }) => palette));
  const dejaOrphelins = new Set(avant.orphelins.map(({ cadre }) => cadre));
  const perimees = new Set(apres.palettes.filter(({ palette, etat }) => etat === 'perimee' && aJour.has(palette)).map(({ palette }) => palette));
  const orphelins = new Set(apres.orphelins.filter(({ cadre }) => !dejaOrphelins.has(cadre)).map(({ palette }) => palette));
  return {
    aMettreAJour: importee.palettes.filter(({ id }) => perimees.has(id)),
    orphelins: actuelle.palettes.filter(({ id }) => orphelins.has(id)),
  };
}

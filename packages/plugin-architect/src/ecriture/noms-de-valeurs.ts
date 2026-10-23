/**
 * Écrit les corrections de sorte `nom-de-valeur` : renommer une valeur d'une
 * propriété de variante (C12) dans le nom de chaque variant du jeu.
 *
 * La correction vise le jeu de variants (`cible.layer`), la propriété
 * (`cible.champ`), l'ancienne valeur (`avant`, redite par `aRelire.avant`) et la
 * nouvelle (`apres.nom`). Le fichier doit toujours déclarer UCM (`non-ucm`).
 * Avant d'écrire, le jeu est relu : il existe et la propriété et l'ancienne
 * valeur s'y trouvent encore (`objet-change`). Une nouvelle valeur déjà
 * présente dans la propriété ne s'écrit jamais : deux variants prendraient le
 * même nom, c'est une question pour le designer (`fait-faux`). Les noms de
 * tous les variants sont calculés avant le premier renommage ; un renommage que
 * Figma refuse saute la correction (`erreur`), et les variants déjà renommés le
 * restent jusqu'au Ctrl+Z du lot.
 */
import type { Correction } from '@ucm-kit/core/controles';
import { CLE_ARCHITECTURE_DU_FICHIER, ESPACE_ARCHITECT, lireLArchitectureDuFichier } from '@ucm-kit/core/referentiel';

import type { LiaisonSautee, MotifDeLiaisonSaute } from './liaisons';

/** Un variant tel que le renommage le lit et l'écrit. */
export interface VariantRenommable {
  name: string;
}

export interface JeuRenommable {
  readonly type: string;
  readonly removed?: boolean;
  readonly children?: readonly VariantRenommable[];
}

export interface ApiDeNomsDeValeurs {
  readonly root: { getSharedPluginData(espace: string, cle: string): string };
  getNodeByIdAsync(id: string): Promise<JeuRenommable | null>;
}

export interface ResultatDesNomsDeValeurs {
  readonly ecrites: string[];
  readonly sautees: LiaisonSautee[];
}

const apiDeFigma = (): ApiDeNomsDeValeurs => figma as unknown as ApiDeNomsDeValeurs;

/** `Propriété=Valeur, Autre=Valeur` en paires ordonnées. */
function lireLeNom(nom: string): Array<[string, string]> {
  return nom.split(',').flatMap((morceau) => {
    const coupe = morceau.indexOf('=');
    return coupe < 0 ? [] : [[morceau.slice(0, coupe).trim(), morceau.slice(coupe + 1).trim()] as [string, string]];
  });
}

const ecrireLeNom = (paires: ReadonlyArray<readonly [string, string]>): string => paires.map(([propriete, valeur]) => `${propriete}=${valeur}`).join(', ');

/** Les nouveaux noms des variants, ou le motif de l'écart entre la correction et le jeu. */
function renommages(jeu: JeuRenommable | null, correction: Correction): Array<{ variant: VariantRenommable; nom: string }> | MotifDeLiaisonSaute {
  const propriete = correction.cible.champ;
  const ancienne = correction.avant;
  const nouvelle = correction.apres.nom;
  if (!jeu || jeu.removed || jeu.type !== 'COMPONENT_SET' || !propriete || ancienne === null || correction.aRelire.avant !== ancienne) return 'objet-change';
  const lus = (jeu.children ?? []).map((variant) => ({ variant, paires: lireLeNom(variant.name) }));
  const dePropriete = lus.filter(({ paires }) => paires.some(([nom]) => nom === propriete));
  if (!dePropriete.some(({ paires }) => paires.some(([nom, valeur]) => nom === propriete && valeur === ancienne))) return 'objet-change';
  if (nouvelle === '' || dePropriete.some(({ paires }) => paires.some(([nom, valeur]) => nom === propriete && valeur === nouvelle))) return 'fait-faux';
  return dePropriete.filter(({ paires }) => paires.some(([nom, valeur]) => nom === propriete && valeur === ancienne)).map(({ variant, paires }) => ({
    variant,
    nom: ecrireLeNom(paires.map(([nom, valeur]) => [nom, nom === propriete && valeur === ancienne ? nouvelle : valeur] as const)),
  }));
}

/** Applique les corrections de sorte `nom-de-valeur`, une à la fois, sans point d'annulation. Les autres sortes sont ignorées. */
export async function ecrireLesNomsDeValeurs(corrections: readonly Correction[], api: ApiDeNomsDeValeurs = apiDeFigma()): Promise<ResultatDesNomsDeValeurs> {
  const ecrites: string[] = [];
  const sautees: LiaisonSautee[] = [];
  const aEcrire = corrections.filter((correction) => correction.sorte === 'nom-de-valeur');
  if (aEcrire.length === 0) return { ecrites, sautees };
  if (lireLArchitectureDuFichier(api.root.getSharedPluginData(ESPACE_ARCHITECT, CLE_ARCHITECTURE_DU_FICHIER)) !== 'ucm') {
    return { ecrites, sautees: aEcrire.map(({ id }) => ({ id, motif: 'non-ucm' })) };
  }
  for (const correction of aEcrire) {
    try {
      const identifiant = correction.cible.layer;
      const jeu = identifiant ? await api.getNodeByIdAsync(identifiant).catch(() => null) : null;
      const prevus = renommages(jeu, correction);
      if (typeof prevus === 'string') { sautees.push({ id: correction.id, motif: prevus }); continue; }
      for (const { variant, nom } of prevus) variant.name = nom;
      ecrites.push(correction.id);
    } catch {
      sautees.push({ id: correction.id, motif: 'erreur' });
    }
  }
  return { ecrites, sautees };
}

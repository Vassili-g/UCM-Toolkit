/**
 * Le domaine `configuration` : la library choisie et le niveau d'accessibilité.
 *
 * Le niveau est une préférence du designer, dans `clientStorage`, défaut AA. La library se range dans le document par
 * `ecriture/configuration.ts` : sans choix rangé, celle que `choisirLaLibrary` désigne, sinon aucune. Une library rangée
 * que Figma ne lit plus n'est pas retenue : l'analyse retombe sur le catalogue du fichier.
 */
import { CLES_D_ARCHITECT, ESPACE_ARCHITECT } from '@ucm-kit/core/referentiel';
import { choisirLaLibrary, lireLesLibraries, type CollectionDeLibrary, type PortDeBibliotheque } from 'ucm-plugin-socle/src/bibliotheque';

import { lireLaLibraryRangee, rangerLaLibrary } from '../ecriture/configuration';
import { liaisonsRetenues } from './bibliotheque';
import type { DemandeDeConfiguration, LibraryConfiguree, NiveauDAccessibilite } from '../messages/configuration';
import type { Contexte, Traiter } from './contexte';

export const TYPES: readonly DemandeDeConfiguration['type'][] = ['lire-configuration', 'ranger-library', 'ranger-niveau'];

export const CLE_DU_NIVEAU = `${ESPACE_ARCHITECT}.${CLES_D_ARCHITECT.niveauDeContraste}`;

/** Le niveau rangé, AA quand il manque, est illisible ou que le stockage lève. */
export async function lireLeNiveau(figma: PluginAPI): Promise<NiveauDAccessibilite> {
  try {
    return (await figma.clientStorage.getAsync(CLE_DU_NIVEAU)) === 'AAA' ? 'AAA' : 'AA';
  } catch {
    return 'AA';
  }
}

/** La library de référence : celle rangée si elle est lisible, la seule library du fichier, sinon celle que les liaisons désignent. */
export function libraryDeReference(collections: readonly CollectionDeLibrary[], liaisons: ReadonlyMap<string, number>, rangee: string | null): string | null {
  const libraries = [...new Set(collections.map((collection) => collection.library))];
  if (rangee !== null && libraries.includes(rangee)) return rangee;
  return libraries.length === 1 ? libraries[0] : choisirLaLibrary(collections, liaisons).choisie;
}

async function lireLaConfiguration(contexte: Contexte): Promise<void> {
  const { figma } = contexte;
  const niveau = await lireLeNiveau(figma);
  let lecture;
  try {
    lecture = await lireLesLibraries(figma as unknown as PortDeBibliotheque);
  } catch {
    lecture = null;
  }
  if (lecture === null || lecture.etat === 'illisible') {
    contexte.envoyer({ type: 'configuration', library: null, candidates: [], niveau });
    return;
  }
  const comptes = new Map(choisirLaLibrary(lecture.collections, liaisonsRetenues()).candidates.map(({ library, liaisons }) => [library, liaisons]));
  const candidates: LibraryConfiguree[] = [...new Set(lecture.collections.map((collection) => collection.library))]
    .map((nom) => ({ cle: nom, nom, liaisons: comptes.get(nom) ?? 0 }))
    .sort((a, b) => b.liaisons - a.liaisons || a.nom.localeCompare(b.nom));
  const choisie = libraryDeReference(lecture.collections, liaisonsRetenues(), lireLaLibraryRangee(figma));
  contexte.envoyer({ type: 'configuration', library: candidates.find((candidate) => candidate.cle === choisie) ?? null, candidates, niveau });
}

export const traiter: Traiter<DemandeDeConfiguration> = async (demande, contexte) => {
  switch (demande.type) {
    case 'lire-configuration':
      await lireLaConfiguration(contexte);
      return;
    case 'ranger-library':
      rangerLaLibrary(contexte.figma, demande.cle);
      await lireLaConfiguration(contexte);
      return;
    case 'ranger-niveau':
      try {
        await contexte.figma.clientStorage.setAsync(CLE_DU_NIVEAU, demande.niveau === 'AAA' ? 'AAA' : 'AA');
      } catch {
        // Le niveau reste celui d'avant ; la configuration rendue le dit.
      }
      await lireLaConfiguration(contexte);
      return;
  }
};

/**
 * Le domaine `configuration` : la library choisie et le niveau d'accessibilité.
 *
 * Le niveau est une préférence du designer, dans `clientStorage`, défaut AA. La library se range dans le document par
 * `ecriture/configuration.ts` : sans choix rangé, celle que `choisirLaLibrary` désigne, sinon aucune. Une library rangée
 * que Figma ne lit plus n'est pas retenue : l'analyse retombe sur le catalogue du fichier.
 *
 * `annuler-structure` défait le dernier lot du journal de structure (`ecriture/structure.ts`) : une autre opération en cours rend
 * `occupe`, un fichier qui ne déclare plus UCM rend `hors-ucm`, et rien n'est touché dans les deux cas. Une annulation qui défait
 * quelque chose périme l'analyse. Un changement effectif de library ou de niveau la périme aussi et s'inscrit au journal
 * (origine `configuration`) ; un refus d'écriture ou une valeur identique ne change rien.
 */
import { CLES_D_ARCHITECT, ESPACE_ARCHITECT } from '@ucm-kit/core/referentiel';
import { choisirLaLibrary, lireLesLibraries, type CollectionDeLibrary, type PortDeBibliotheque } from 'ucm-plugin-socle/src/bibliotheque';

import { lireLaLibraryRangee, rangerLaLibrary } from '../ecriture/configuration';
import { creerPortDeRegles } from '../ecriture/noms';
import { annulerLeDernierLotDeStructure, type ApiDeStructure } from '../ecriture/structure';
import { perimerApresUneEcriture, prendreLaPlaceDUneEcriture } from './analyse';
import { liaisonsRetenues } from './bibliotheque';
import { lireLaDeclaration } from './commun';
import type { DemandeDeConfiguration, LibraryConfiguree, NiveauDAccessibilite } from '../messages/configuration';
import type { Contexte, Traiter } from './contexte';

export const TYPES: readonly DemandeDeConfiguration['type'][] = ['lire-configuration', 'ranger-library', 'ranger-niveau', 'annuler-structure'];

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

async function annulerLaStructure(demande: number, contexte: Contexte): Promise<void> {
  const { figma } = contexte;
  const sans = { journal: 'absent' as const, defaites: 0, sautees: [], restantes: 0, limiteDesUsages: false };
  if (lireLaDeclaration(figma) !== 'ucm') {
    contexte.envoyer({ type: 'structure-annulee', demande, refus: 'hors-ucm', ...sans });
    return;
  }
  const place = await prendreLaPlaceDUneEcriture({ sujet: 'structure', generation: 0 });
  if ('occupe' in place) {
    contexte.envoyer({ type: 'structure-annulee', demande, refus: 'occupe', ...sans });
    return;
  }
  let defait = false;
  try {
    const resultat = await annulerLeDernierLotDeStructure({ api: figma as unknown as ApiDeStructure, stockage: creerPortDeRegles(figma) });
    defait = resultat.defaites > 0;
    contexte.envoyer({ type: 'structure-annulee', demande, refus: null, ...resultat });
  } catch {
    // L'annulation a pu défaire des lignes avant de lever : l'analyse se périme, et le journal garde ce qui reste.
    defait = true;
    contexte.envoyer({ type: 'structure-annulee', demande, refus: null, ...sans, journal: 'illisible' });
  } finally {
    place.liberer();
    if (defait) perimerApresUneEcriture(contexte);
  }
}

export const traiter: Traiter<DemandeDeConfiguration> = async (demande, contexte) => {
  switch (demande.type) {
    case 'lire-configuration':
      await lireLaConfiguration(contexte);
      return;
    case 'ranger-library': {
      // Seul un choix rangé et différent de l'ancien change la configuration ; un refus d'écriture ou le même choix n'invalide rien.
      const avant = lireLaLibraryRangee(contexte.figma);
      if (rangerLaLibrary(contexte.figma, demande.cle) && avant !== demande.cle) perimerApresUneEcriture(contexte, 'configuration');
      await lireLaConfiguration(contexte);
      return;
    }
    case 'ranger-niveau': {
      const avant = await lireLeNiveau(contexte.figma);
      const apres: NiveauDAccessibilite = demande.niveau === 'AAA' ? 'AAA' : 'AA';
      try {
        await contexte.figma.clientStorage.setAsync(CLE_DU_NIVEAU, apres);
        if (avant !== apres) perimerApresUneEcriture(contexte, 'configuration');
      } catch {
        // Le niveau reste celui d'avant ; la configuration rendue le dit.
      }
      await lireLaConfiguration(contexte);
      return;
    }
    case 'annuler-structure':
      await annulerLaStructure(demande.demande, contexte);
      return;
  }
};

/**
 * Le domaine `bibliotheque` : l'arbre d'une library lu depuis ses noms, puis les valeurs d'un groupe à son ouverture.
 * Les noms viennent de `teamLibrary` (rien n'est importé) ; les valeurs s'importent par clé, par lots de huit.
 */
import { choisirLaLibrary, lireLesLibraries, type PortDeBibliotheque } from 'ucm-plugin-socle/src/bibliotheque';

import { rangerLaCleDuFichier } from '../ecriture/cleDuFichier';
import { importerLesValeurs } from '../lecture';
import type { DemandeDeBibliotheque } from '../messages/bibliotheque';
import type { Contexte, Traiter } from './contexte';
import { portDeLecture } from './lectureDeFigma';

export const TYPES: readonly DemandeDeBibliotheque['type'][] = ['lire-bibliotheque', 'lire-valeurs'];

/** Le nombre de calques liés, par clé de variable, tel que les lectures de calques l'ont établi ; vide tant qu'aucune n'a eu lieu. */
let liaisonsConnues: ReadonlyMap<string, number> = new Map();
export function retenirLesLiaisons(liaisons: ReadonlyMap<string, number>): void { liaisonsConnues = liaisons; }
export function liaisonsRetenues(): ReadonlyMap<string, number> { return liaisonsConnues; }

async function lireBibliotheque(demande: number, { figma, envoyer }: Contexte): Promise<void> {
  try {
    const lecture = await lireLesLibraries(figma as unknown as PortDeBibliotheque);
    if (lecture.etat === 'illisible') {
      envoyer({ type: 'bibliotheque-illisible', demande, motif: lecture.motif });
      return;
    }
    const cleDuFichierDesTokens = rangerLaCleDuFichier(figma);
    const libraries = [...new Set(lecture.collections.map((collection) => collection.library))];
    const choisie = libraries.length === 1 ? libraries[0] : choisirLaLibrary(lecture.collections, liaisonsConnues).choisie;
    const collections = choisie === null ? [] : lecture.collections.filter((collection) => collection.library === choisie)
      .map((collection) => ({ nom: collection.nom, cle: collection.cle, variables: collection.variables.map(({ nom, cle, type }) => ({ nom, cle, type })) }));
    // Une library n'a pas de clé propre dans l'API : son nom l'identifie.
    envoyer({ type: 'bibliotheque', demande, library: choisie === null ? null : { nom: choisie, cle: choisie }, collections, cleDuFichierDesTokens });
  } catch (erreur) {
    envoyer({ type: 'bibliotheque-illisible', demande, motif: erreur instanceof Error ? erreur.message : String(erreur) });
  }
}

async function lireValeurs(demande: number, cles: readonly string[], { figma, envoyer }: Contexte): Promise<void> {
  try {
    envoyer({ type: 'valeurs', demande, valeurs: await importerLesValeurs(portDeLecture(figma), cles) });
  } catch (erreur) {
    envoyer({ type: 'bibliotheque-illisible', demande, motif: erreur instanceof Error ? erreur.message : String(erreur) });
  }
}

export const traiter: Traiter<DemandeDeBibliotheque> = async (demande, contexte) => {
  switch (demande.type) {
    case 'lire-bibliotheque':
      await lireBibliotheque(demande.demande, contexte);
      return;
    case 'lire-valeurs':
      await lireValeurs(demande.demande, demande.cles, contexte);
      return;
  }
};

/**
 * Le domaine `bibliotheque` de l'interface : un fichier sans variable locale tire ses variables d'une library. Il demande ses noms
 * au sandbox et en fait l'arbre ; les valeurs d'un groupe s'importent à son ouverture, et les cibles d'alias qu'elles nomment à leur suite.
 * Chaque demande porte un numéro de ce domaine : la réponse d'une demande remplacée est ignorée.
 */
import type { CollectionDeBibliotheque, DemandeDeBibliotheque, MessageDeBibliotheque } from '../../messages/bibliotheque';
import { commencePar, segmentsDeGroupe } from '../../groupes';
import type { Releve } from '../../modele';
import { ciblesAImporter, releveDeLibrary, type ValeurImportee } from './releve';

/** Les valeurs qu'un groupe ouvert demande au plus : un groupe plus long n'importe que ses premières variables, celles que la table montre d'abord. */
export const LIMITE_PAR_GROUPE = 100;

export interface OptionsDeBibliotheque {
  readonly envoyer: (message: DemandeDeBibliotheque) => void;
  /** Pose le relevé de la library à la place du relevé du fichier. */
  readonly poser: (releve: Releve, library: { readonly nom: string; readonly cleDuFichierDesTokens: string | null }) => void;
  /** La collection et le groupe que le designer a ouverts dans l'arbre. */
  readonly position: () => { readonly collection: string | null; readonly groupe: readonly string[] };
  readonly horloge?: () => number;
}

export interface Bibliotheque {
  /** Demande les noms de la library ; la réponse d'une demande plus ancienne est ignorée. */
  demander(): void;
  /** Oublie la library : le fichier a des variables locales. */
  quitter(): void;
  /** Demande les valeurs du groupe ouvert qui ne sont pas encore importées. */
  suivre(): void;
  recevoir(message: MessageDeBibliotheque): void;
}

export function monterBibliotheque({ envoyer, poser, position, horloge = Date.now }: OptionsDeBibliotheque): Bibliotheque {
  let compteur = 0;
  let demandeDesNoms: number | null = null;
  let nom = '';
  let cleDuFichierDesTokens: string | null = null;
  let collections: readonly CollectionDeBibliotheque[] = [];
  let revision = 0;
  const valeurs = new Map<string, ValeurImportee>();
  /** Les clés déjà demandées : une valeur n'est demandée qu'une fois par lecture des noms. */
  const demandees = new Set<string>();
  const enVol = new Set<number>();
  let groupeSuivi = '';

  const clesConnues = (): Set<string> => new Set(collections.flatMap((collection) => collection.variables.map((variable) => variable.cle)));

  function reposer(): void {
    revision += 1;
    poser(releveDeLibrary({ nom, collections, valeurs, luA: horloge(), revision }), { nom, cleDuFichierDesTokens });
  }

  function demanderLesValeurs(cles: readonly string[]): void {
    const neuves = cles.filter((cle) => !demandees.has(cle));
    if (neuves.length === 0) return;
    for (const cle of neuves) demandees.add(cle);
    compteur += 1;
    enVol.add(compteur);
    envoyer({ type: 'lire-valeurs', demande: compteur, cles: neuves });
  }

  return {
    demander() {
      compteur += 1;
      demandeDesNoms = compteur;
      envoyer({ type: 'lire-bibliotheque', demande: compteur });
    },
    quitter() {
      demandeDesNoms = null;
      collections = [];
      valeurs.clear();
      demandees.clear();
      enVol.clear();
      groupeSuivi = '';
    },
    suivre() {
      if (collections.length === 0) return;
      const { collection, groupe } = position();
      const cle = JSON.stringify([collection, groupe]);
      if (cle === groupeSuivi) return;
      groupeSuivi = cle;
      const ouverte = collections.find((candidate) => candidate.cle === collection);
      if (!ouverte) return;
      demanderLesValeurs(ouverte.variables.filter((variable) => commencePar(segmentsDeGroupe(variable.nom), groupe)).slice(0, LIMITE_PAR_GROUPE).map((variable) => variable.cle));
    },
    recevoir(message) {
      if (message.type === 'bibliotheque') {
        if (message.demande !== demandeDesNoms || message.library === null) return;
        nom = message.library.nom;
        cleDuFichierDesTokens = message.cleDuFichierDesTokens;
        collections = message.collections;
        valeurs.clear();
        demandees.clear();
        enVol.clear();
        groupeSuivi = '';
        reposer();
        return;
      }
      if (message.type === 'valeurs') {
        if (!enVol.delete(message.demande)) return;
        for (const [cle, valeur] of Object.entries(message.valeurs)) valeurs.set(cle, valeur as ValeurImportee);
        demanderLesValeurs(ciblesAImporter(valeurs, clesConnues(), demandees));
        reposer();
      }
    },
  };
}

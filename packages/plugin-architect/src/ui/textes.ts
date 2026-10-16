/**
 * Tous les textes de l'écran. Un texte entre accents graves met ces mots en
 * code : c'est l'écriture d'un nom, jamais une phrase.
 */
import type { CategorieDeNom } from '@ucm-kit/core/referentiel';

/** Les quatre raisons que l'écran distingue ; un terme UCM l'emporte sur les deux autres. */
export type RaisonAffichee = 'casse-separateur' | 'casse' | 'separateur' | 'terme';

const pluriel = (nombre: number, singulier: string, plurielDuNom: string): string => `${nombre} ${nombre === 1 ? singulier : plurielDuNom}`;

export const TEXTES = {
  marque: 'UCM Architect',
  titreAvantAnalyse: 'Harmoniser les noms',
  analyser: 'Analyser le fichier',
  lectureDuFichier: 'Lecture du fichier…',
  lectureDesVariables: 'Lecture des variables…',
  lectureDesPages: (lues: number, total: number): string => `Lecture des pages : ${lues} / ${total}`,
  miseAJour: 'Mise à jour des propositions…',
  application: 'Application des noms…',
  aide: 'Choisissez une écriture, puis cochez les noms à modifier.',
  titreDuBilan: (nombre: number): string => nombre === 0 ? 'Aucun nom à harmoniser' : `${pluriel(nombre, 'nom', 'noms')} à harmoniser`,
  rienAFaire: 'Tous les noms suivent déjà l’écriture choisie.',
  rienAFaireSaufDoublons: 'Les noms restants sont bloqués par un doublon.',
  ecriture: {
    titre: 'Écriture des noms',
    colonnes: ['Catégorie', 'Écriture détectée', 'Écriture choisie'],
    categories: {
      collections: 'Collections', variables: 'Variables', proprietes: 'Propriétés', valeurs: 'Valeurs',
      palettes: 'Noms de palettes', composants: 'Noms de composants',
    } satisfies Record<CategorieDeNom, string>,
    choix: (categorie: string): string => `Écriture des ${categorie.toLowerCase()}`,
    aucuneDominante: 'Aucune écriture dominante',
    aucunNom: 'Aucun nom',
    comptes: (conformes: number, total: number): string => `${conformes} sur ${total}`,
    nombreDeNoms: (total: number): string => pluriel(total, 'nom', 'noms'),
  },
  termes: {
    libelle: 'Employer les termes UCM',
    exemple: 'Par exemple, remplacer `press` par `pressed` et `disable` par `disabled`.',
  },
  liste: {
    libelle: 'Renommages proposés',
    ancien: 'Nom actuel',
    nouveau: 'Nouveau nom',
    groupes: {
      'casse-separateur': 'Casse et séparation des mots',
      casse: 'Casse',
      separateur: 'Séparation des mots',
      terme: 'Termes UCM',
    } satisfies Record<RaisonAffichee, string>,
    titreDeGroupe: (libelle: string, nombre: number): string => `${libelle} · ${nombre}`,
    cocherLeGroupe: (libelle: string): string => `Cocher tous les noms du groupe ${libelle}`,
  },
  doublons: {
    resume: (nombre: number): string => `${pluriel(nombre, 'nom bloqué', 'noms bloqués')} par un doublon`,
    deviendrait: ' deviendrait ',
    lieu: {
      collections: ', déjà utilisé par une autre collection.',
      variables: ', déjà utilisé dans la même collection.',
      proprietes: ', déjà utilisé dans le même composant.',
      valeurs: ', déjà utilisé dans la même propriété.',
      palettes: ', déjà utilisé dans la même collection.',
      composants: ', déjà utilisé dans la même collection.',
    } satisfies Record<CategorieDeNom, string>,
    action: 'Renommez l’un de ces deux éléments dans Figma, puis relancez l’analyse.',
  },
  pied: {
    aucunNomCoche: 'Aucun nom coché',
    nomsCoches: (nombre: number): string => pluriel(nombre, 'nom coché', 'noms cochés'),
    appliquer: 'Appliquer les noms cochés',
  },
  fin: {
    modifies: (nombre: number): string => pluriel(nombre, 'nom modifié', 'noms modifiés'),
    partiel: 'Certains noms n’ont pas pu être modifiés. Vérifiez le résultat, puis relancez l’analyse.',
    refuse: 'Aucun nom n’a été modifié. Vérifiez le fichier, puis relancez l’analyse.',
    telecharger: 'Télécharger la table des noms',
  },
  note: 'Les groupes séparés par `/` restent des groupes. Les noms de palettes et de composants peuvent garder leur propre écriture. Les doublons bloquent les lignes concernées. Dans Figma, le lot s’annule en une fois.',
} as const;

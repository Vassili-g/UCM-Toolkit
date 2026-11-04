/** Les textes du panneau des constats : ses états et l'alerte du composant périmé. Les textes des cartes de Corrections sont dans `corrections.ts`. */

/** « de » devant une consonne, « d’ » devant une voyelle ou un h. */
export const de = (nom: string): string => (/^[aeiouyàâéèêîôûh]/i.test(nom) ? `d’${nom}` : `de ${nom}`);

/** Un nombre à la française, séparé par une espace simple : 2 000. */
const nombre = (valeur: number): string => String(valeur).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const MOTS: Readonly<Record<number, string>> = { 2: 'Deux', 3: 'Trois', 4: 'Quatre', 5: 'Cinq' };

export const TEXTES_ANALYSE = {
  panneauDesConstats: {
    aucunComposant: 'Sélectionnez un composant dans Figma.',
    horsUcmTitre: 'Ce fichier n’est pas déclaré UCM.',
    horsUcmTexte: 'L’analyse des composants s’ouvre après la déclaration.',
    declarer: 'Déclarer dans la Configuration',
    libraryTitre: 'Choisissez la library de tokens.',
    libraryTexte: (libraries: number): string => `${MOTS[libraries] ?? libraries} libraries activées portent des variables. Aucune n’est encore liée à ce composant.`,
    ouvrirLaConfiguration: 'Ouvrir la Configuration',
    phases: {
      sujet: 'Lecture des variants',
      releve: 'Lecture des variants',
      catalogue: 'Lecture de la library',
      imbriques: 'Lecture des composants imbriqués',
      structure: 'Lecture de la structure',
      regles: 'Vérification des règles',
      controles: 'Vérification des règles',
      corrections: 'Vérification des règles',
      projection: 'Vérification des règles',
    },
    compteDeLecture: (phase: string, fait: number, total: number): string => `${phase} : ${fait} sur ${total}`,
    progression: (lus: number, total: number): string => `analyse en cours, ${lus} variants sur ${total}`,
    arretee: 'analyse arrêtée',
    annulee: 'analyse annulée',
    provisoire: 'L’analyse des composants imbriqués est en cours. D’autres points peuvent s’ajouter.',
    arreteTitre: 'L’analyse s’est arrêtée.',
    arreteTexte: (message: string): string => `Message de l’exporteur : ${message.replace(/\.$/, '')}, puis cliquez Actualiser.`,
    arreteMeta: 'Aucun autre contrôle n’a été fait.',
    annuleeTitre: 'L’analyse a été annulée.',
    annuleeTexte: 'Cliquez Actualiser pour la relancer.',
    annuleeMeta: 'Aucun constat n’a été rendu.',
    aucunTitre: (nom: string, variants: number): string => `Aucun constat sur ${variants > 1 ? `les ${variants} variants` : 'le variant'} ${de(nom)}.`,
    aucunMeta: 'Contrôlés : nommage, liaisons, tailles, tokens, variants, contraste, typographie, règles d’usage, export.',
    aucunVisible: (ignores: number): string => `Aucun constat visible, ${ignores} ${ignores > 1 ? 'ignorés' : 'ignoré'}.`,
    partielleTitre: 'Analyse partielle.',
    /** Une ligne par cause ; jamais « N lus sur N » : le total d'une lecture partielle dépasse toujours ce qui a été lu. */
    partielleCauses: {
      variants: (lus: number, total: number): string => (total <= lus ? 'Le moteur n’a pas lu tous les variants.' : `Le moteur a lu ${lus} ${lus > 1 ? 'variants' : 'variant'} sur ${total}.`),
      layers: (lus: number, total: number | null): string => (total === null || total <= lus ? 'Le moteur n’a pas lu tout le composant.' : `Le moteur a lu ${nombre(lus)} layers sur ${nombre(total)}.`),
      lectures: (nombreDeLectures: number): string => (nombreDeLectures > 1 ? `${nombre(nombreDeLectures)} lectures ont échoué.` : '1 lecture a échoué.'),
      regles: 'Les règles d’utilisation n’ont pas pu être lues.',
      niveau: 'Le niveau du fichier n’a pas pu être lu. Le niveau AA s’applique.',
      ignores: 'Les constats ignorés n’ont pas pu être lus. Ils s’affichent de nouveau.',
    },
    partielleTexte: 'Les constats portent sur la partie lue.',
    occupeTitre: 'Une opération est déjà en cours.',
    occupeTexte: 'L’écriture continue. Actualisez quand elle est finie.',
    rapport: 'Télécharger le rapport d’analyse',
    rapportInfobulle: 'Les points relevés et la description du composant, avec ses variables. Pour signaler un problème.',
    rapportEnCours: 'Préparation du rapport…',
    rapportEchoue: 'Le rapport n’a pas pu être préparé.',
    perimeTitre: 'Le composant a changé depuis l’analyse.',
    perimeTexte: 'Cliquez Actualiser pour relire.',
    perimeMeta: 'Les constats datent d’avant le changement.',
  },
};

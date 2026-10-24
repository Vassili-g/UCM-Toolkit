/** Les textes du panneau des constats : ses états, ses onglets et l'alerte du composant périmé. Les textes des cartes de Corrections sont dans `corrections.ts`. */

/** « de » devant une consonne, « d’ » devant une voyelle ou un h. */
export const de = (nom: string): string => (/^[aeiouyàâéèêîôûh]/i.test(nom) ? `d’${nom}` : `de ${nom}`);

/** Un nombre à la française, séparé par une espace simple : 2 000. */
const nombre = (valeur: number): string => String(valeur).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const MOTS: Readonly<Record<number, string>> = { 2: 'Deux', 3: 'Trois', 4: 'Quatre', 5: 'Cinq' };

export const TEXTES_ANALYSE = {
  panneauDesConstats: {
    etiquetteDesOnglets: 'Constats du composant',
    ongletCorrections: 'Corrections',
    ongletQuestions: 'Questions',
    ongletAFaire: 'À faire dans Figma',
    nomDeLOnglet: (onglet: string, compte: number): string => `${onglet}, ${compte}`,
    aucunComposant: 'Sélectionnez un composant dans Figma.',
    horsUcmTitre: 'Ce fichier n’est pas déclaré UCM.',
    horsUcmTexte: 'L’analyse des composants s’ouvre après la déclaration.',
    declarer: 'Déclarer dans la Configuration',
    libraryTitre: 'Choisissez la library de tokens.',
    libraryTexte: (libraries: number): string => `${MOTS[libraries] ?? libraries} libraries activées portent des variables. Aucune n’est encore liée à ce composant.`,
    ouvrirLaConfiguration: 'Ouvrir la Configuration',
    progression: (lus: number, total: number): string => `analyse en cours, ${lus} variants sur ${total}`,
    arretee: 'analyse arrêtée',
    annulee: 'analyse annulée',
    attendreLesConstats: 'Les constats s’afficheront à la fin de l’analyse.',
    arreteTitre: 'L’analyse s’est arrêtée.',
    arreteTexte: (message: string): string => `Message de l’exporteur : ${message.replace(/\.$/, '')}, puis cliquez Actualiser.`,
    arreteMeta: 'Aucun autre contrôle n’a été fait.',
    annuleeTitre: 'L’analyse a été annulée.',
    annuleeTexte: 'Cliquez Actualiser pour la relancer.',
    annuleeMeta: 'Aucun constat n’a été rendu.',
    aucunTitre: (nom: string, variants: number): string => `Aucun constat sur ${variants > 1 ? `les ${variants} variants` : 'le variant'} ${de(nom)}.`,
    aucunMeta: 'Contrôlés : nommage, liaisons, tailles, tokens, variants, contraste, typographie, règles d’usage, export.',
    partielleTitre: (lus: number, total: number): string => `Analyse partielle : ${nombre(lus)} layers lus sur ${nombre(total)}.`,
    partielleTitreDesVariants: (lus: number, total: number): string => `Analyse partielle : ${lus} variants lus sur ${total}.`,
    partielleTexte: 'Les constats portent sur la partie lue. Les variants non lus ne sont pas contrôlés.',
    partielleDesLecturesTitre: (echecs: number): string => `Analyse partielle : ${echecs > 1 ? `${nombre(echecs)} lectures ont échoué` : '1 lecture a échoué'}.`,
    partielleDesLecturesTexte: 'Les constats ne jugent pas ce qui n’a pas été lu.',
    perimeTitre: 'Le composant a changé depuis l’analyse.',
    perimeTexte: 'Cliquez Actualiser pour relire.',
    perimeMeta: 'Les constats datent d’avant le changement.',
  },
};

/** Les textes de la vue Composant : les mots et les glyphes de MAQUETTE-VUE-COMPOSANT.html. Les sortes d'objet sont des signes du socle, pas des glyphes. */
import type { Nature } from '../../composant';

/** « 42 s », « 2 min 22 s », « 3 min » ; sous la seconde, « moins d’une seconde ». */
export function dureeLisible(ms: number): string {
  const secondes = Math.round(ms / 1000);
  if (secondes < 1) return 'moins d’une seconde';
  if (secondes < 60) return `${secondes} s`;
  const minutes = Math.floor(secondes / 60);
  const reste = secondes % 60;
  return reste === 0 ? `${minutes} min` : `${minutes} min ${reste} s`;
}

export const TEXTES_COMPOSANT = {
  // Vue composant : les mots et les glyphes de MAQUETTE-VUE-COMPOSANT.html
  composant: {
    vide: 'Sélectionnez un composant',
    lecture: 'Lecture du composant…',
    lectureEchouee: (message: string) => `La lecture du composant a échoué : ${message}. Sélectionnez-le de nouveau dans Figma.`,
    filDAriane: 'Fil d’Ariane',
    apercu: 'Aperçu du composant lu',
    filtrer: 'Filtrer',
    filtrerLesTokens: 'Filtrer les tokens',
    toutDeplier: 'Tout déplier ou replier',
    ouvrir: (nom: string) => `Ouvrir ${nom}`,
    variantLu: 'Variant lu',
    etapes: (nombre: number) => `${nombre} étape${nombre > 1 ? 's' : ''}`,
    interrompue: 'interrompue',
    copier: (valeur: string) => `Copier ${valeur}`,
    ecartAvecFigma: (valeur: string) => `Figma rend ${valeur}`,
    ecartAide: 'Figma rend une autre valeur que cette chaîne. Dépliez la ligne pour lire les deux.',
    aucunNeCorrespond: 'Aucun token ne correspond.',
    aucunToken: 'Aucun token, valeurs directes',
    sansToken: 'Sans token',
    aucunSurCeCalque: 'Aucun token sur ce layer.',
    tokens: (nombre: number) => `${nombre} token${nombre > 1 ? 's' : ''}`,
    liaisons: (nombre: number) => `${nombre} liaisons`,
    nombreSansToken: (nombre: number) => `${nombre} sans token`,
    calquesNonLus: (nombre: number) => `${nombre} layer${nombre > 1 ? 's' : ''} non lu${nombre > 1 ? 's' : ''}`,
    calquesIgnores: (nombre: number) => `${nombre} layer${nombre > 1 ? 's' : ''} ignoré${nombre > 1 ? 's' : ''}`,
    valeurAbsente: '—',
    natures: { couleur: 'Couleur', forme: 'Forme', espacement: 'Espacement', taille: 'Taille', texte: 'Texte', autre: 'Autre' } satisfies Record<Nature, string>,
    libelles: { texte: 'Texte', fond: 'Fond', contour: 'Stroke', effet: 'Effet', rayon: 'Rayon', epaisseur: 'Épaisseur', opacite: 'Opacité', ecart: 'Écart', marge: 'Marge', taille: 'Taille', police: 'Texte', style: 'Style' } as Record<string, string>,
    glyphes: {
      miette: '›',
      ecart: '≠',
    },
    fois: (nombre: number) => `×${nombre}`,
  },
  variants: {
    titre: 'Variants',
    tableau: 'Tableau',
    tableauAide: 'Croiser deux properties',
    affiche: 'Affiché',
    copier: 'Copier ses liaisons aux autres variants',
    autres: (nombre: number) => `+${nombre}`,
    nonLu: 'non lu',
    lignes: 'Lignes',
    colonnes: 'Colonnes',
  },
  panneau: {
    resume: (variants: number, etat: string) => `${variants} variant${variants > 1 ? 's' : ''}, ${etat}`,
    pasAnalyse: 'pas encore analysé',
    enCours: 'analyse en cours',
    analyseA: (heure: string, dureeMs?: number) => `analysé à ${heure}${dureeMs === undefined ? '' : ` en ${dureeLisible(dureeMs)}`}`,
    avantAnalyse: (variants: number, nom: string) => `Analyser lit les ${variants} variants d’${nom}, leurs liaisons et leurs règles.`,
    duree: 'L’analyse dure quelques secondes.',
  },
};

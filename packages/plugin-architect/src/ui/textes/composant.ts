/** Les textes de la vue Composant : les mots et les glyphes de MAQUETTE-VUE-COMPOSANT.html. Les sortes d'objet sont des signes du socle, pas des glyphes. */
import type { Nature } from '../../composant';
import { glypheDe } from 'ucm-plugin-socle/src/ui/Signe';

/** « 42 s », « 2 min 22 s », « 3 min » ; sous la seconde, « moins d’une seconde ». */
export function dureeLisible(ms: number): string {
  const secondes = Math.round(ms / 1000);
  if (secondes < 1) return 'moins d’une seconde';
  if (secondes < 60) return `${secondes} s`;
  const minutes = Math.floor(secondes / 60);
  const reste = secondes % 60;
  return reste === 0 ? `${minutes} min` : `${minutes} min ${reste} s`;
}

/** Une liste de mots : « a », « a et b », « a, b et c ». */
const liste = (mots: readonly string[]): string => (mots.length < 2 ? mots.join('') : `${mots.slice(0, -1).join(', ')} et ${mots[mots.length - 1]}`);

export const TEXTES_COMPOSANT = {
  // Les constats du composant qui n'avaient pas de phrase : layers masqués, rôles de layer, homonymes, segments fusionnés, tailles et axes
  carteDuComposant: {
    /** La phrase du masquage d'un constat (`faits.masque` vaut `layer` ou `ancetre`) ; vide quand le layer est visible. */
    masquage: (layer: string, masque: string | null, ancetre: string | null): string => {
      if (masque === 'layer') return `Le layer ${layer} est masqué.`;
      return masque === 'ancetre' && ancetre !== null ? `Le layer ${layer} est dans ${ancetre}, qui est masqué.` : '';
    },
    nomDeLayerDUnRole: (layer: string, role: string): string => `Le layer ${layer} porte le nom d’un ${role}.`,
    nomDeLayerDUnRoleStatut: (role: string): string => `Renommez le layer dans Figma s’il n’est pas un ${role}`,
    homonymes: (nom: string, parent: string | null): string => `Deux layers s’appellent ${nom}${parent === null ? '' : ` sous ${parent}`}. Architect ne sait pas lequel lier.`,
    homonymesStatut: 'Renommez l’un des deux dans Figma',
    /** « La correction règle aussi State=disabled et rôle border. » ; `ecarts` est la liste que le kit joint par des virgules. */
    reglesAussi: (ecarts: string): string => `La correction règle aussi ${liste(ecarts.split(', ').filter((ecart) => ecart !== ''))}.`,
    tailleSelonLeMode: (token: string, clair: number, sombre: number): string => `${token} vaut ${clair} px en Light et ${sombre} px en Dark.`,
    tailleSelonLeModeStatut: 'Donnez-lui la même valeur dans les deux modes, dans la fenêtre Variables',
    deuxAxesDeStyle: (axes: readonly string[]): string => `Les axes ${liste(axes)} décrivent tous${axes.length === 2 ? ' deux' : ''} le style.`,
    deuxAxesDeStyleStatut: 'Gardez un seul axe de style dans les propriétés du composant',
    styleEtDossier: (valeur: string, dossierLu: string): string => `Le style ${valeur} utilise les couleurs de ${dossierLu}.`,
    styleEtDossierStatut: (dossierAttendu: string): string => `Liez-le aux couleurs de ${dossierAttendu}`,
    valeurDeVariant: (valeur: string, axe: string, attendue: string): string => `La valeur ${valeur} de ${axe} s’écrit ${attendue} dans UCM.`,
  },
  // Vue composant : les mots et les glyphes de MAQUETTE-VUE-COMPOSANT.html
  composant: {
    vide: 'Sélectionnez un composant',
    lecture: 'Lecture du composant…',
    lectureDuVariant: 'Lecture du variant',
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
      miette: glypheDe('separateur'),
      ecart: glypheDe('ecart'),
    },
    fois: (nombre: number) => `×${nombre}`,
  },
  variants: {
    titre: 'Variants',
    autres: (nombre: number) => `${glypheDe('ajouter')}${nombre}`,
    nonLu: 'non lu',
    tous: 'Tous les variants',
    nombre: (n: number) => `${n} variant${n > 1 ? 's' : ''}`,
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

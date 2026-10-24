/**
 * Le signe de chaque ligne de la colonne de gauche du mode Composant : la
 * sorte d'objet qu'elle montre, pas son état. La table est pure ; la tuile se
 * pose dans `vues/composant.ts` (`creerSigne` du socle).
 *
 * Une ligne de token se lit par les propriétés que sa variable lie sur ses
 * layers (`padding-left` et `padding-right` donnent `padding-x`), pas par son
 * nom. Une couleur dit son usage : contour, effet, texte, icône, fond.
 */
import { champDe, natureDe, type CalqueDuComposant, type LectureDeComposant, type LigneDeComposant } from '../../composant';

/** Un layer d'icône : un tracé, ou un nom qui dit « icon ». Même lecture que le mapping du kit. */
const estUnLayerDIcone = (calque: CalqueDuComposant | undefined): boolean =>
  calque !== undefined && (calque.type === 'VECTOR' || calque.type === 'BOOLEAN_OPERATION' || /icon/i.test(calque.nom));

/** Un token d'icône : un segment de son nom dit « icon » ou « icons ». */
const estUnTokenDIcone = (nomComplet: string): boolean => /(^|\/)icons?(\/|$)/i.test(nomComplet);

function ligneDIcone(lecture: LectureDeComposant, ligne: LigneDeComposant): boolean {
  if (estUnTokenDIcone(ligne.nomComplet)) return true;
  return ligne.calques.some((id) => estUnLayerDIcone(lecture.calques.find((calque) => calque.id === id)));
}

const COTES: Readonly<Record<string, 'top' | 'right' | 'bottom' | 'left'>> = {
  paddingTop: 'top',
  paddingRight: 'right',
  paddingBottom: 'bottom',
  paddingLeft: 'left',
};

/** Le signe d'un padding selon les côtés liés. Une combinaison hors table (trois côtés, deux côtés voisins) rend le signe des quatre côtés. */
function signeDePadding(champs: ReadonlySet<string>): string {
  const cotes = new Set([...champs].map((champ) => COTES[champ]).filter((cote) => cote !== undefined));
  if (cotes.size === 1) return `padding-${[...cotes][0]}`;
  if (cotes.size === 2 && cotes.has('left') && cotes.has('right')) return 'padding-x';
  if (cotes.size === 2 && cotes.has('top') && cotes.has('bottom')) return 'padding-y';
  return 'padding';
}

/** Les chemins que la variable de la ligne lie sur les layers de la ligne, pour le premier libellé de la ligne. */
function champsDeLaLigne(lecture: LectureDeComposant, ligne: LigneDeComposant): Set<string> {
  const champs = new Set<string>();
  const libelle = ligne.libelles[0];
  for (const liaison of lecture.liaisons) {
    if (liaison.variable !== ligne.variable || !ligne.calques.includes(liaison.calque)) continue;
    const type = lecture.calques.find((calque) => calque.id === liaison.calque)?.type ?? '';
    if (natureDe(liaison.propriete, type).libelle === libelle) champs.add(champDe(liaison.propriete).champ);
  }
  return champs;
}

/** Le signe d'une ligne dont la valeur n'est pas une couleur résolue. */
function signeDuNombre(lecture: LectureDeComposant, ligne: LigneDeComposant): string {
  const champs = champsDeLaLigne(lecture, ligne);
  switch (ligne.libelles[0]) {
    case 'rayon': return 'radius';
    case 'epaisseur': return 'stroke-weight';
    case 'opacite': return 'opacity';
    case 'ecart': return 'gap';
    case 'marge': return signeDePadding(champs);
    case 'taille': {
      if (ligneDIcone(lecture, ligne)) return 'taille-icone';
      return [...champs].some((champ) => /^(min|max)?[Ww]idth$/.test(champ)) ? 'width' : 'height';
    }
    case 'police': return 'text-style';
    // Une propriété que la table ne connaît pas : la variable liée, signe neutre de Figma.
    default: return 'variable';
  }
}

/** L'usage d'une couleur : stroke seul, effet seul, texte seul, icône, sinon fond. */
function usageDeCouleur(lecture: LectureDeComposant, ligne: LigneDeComposant): string {
  const { libelles } = ligne;
  if (libelles.length === 1 && libelles[0] === 'contour') return 'usage-stroke';
  if (libelles.length === 1 && libelles[0] === 'effet') return 'usage-effet';
  if (libelles.length === 1 && libelles[0] === 'texte') return 'usage-texte';
  if (!libelles.includes('texte') && ligneDIcone(lecture, ligne)) return 'usage-icone';
  return 'usage-fill';
}

export interface SigneDeLigne {
  readonly id: string;
  /** Vrai quand la tuile prend la couleur du token : la ligne est une couleur résolue. */
  readonly couleur: boolean;
}

/**
 * Le signe de la ligne. `couleurResolue` dit si la chaîne aboutit à une
 * couleur affichable ; une couleur qui ne se résout pas prend `usage-inconnue`.
 */
export function signeDeLigne(lecture: LectureDeComposant, ligne: LigneDeComposant, couleurResolue: boolean): SigneDeLigne {
  if (ligne.genre === 'style') return { id: 'text-style', couleur: false };
  if (ligne.type === 'COLOR' || (ligne.type === null && ligne.nature === 'couleur')) {
    return couleurResolue ? { id: usageDeCouleur(lecture, ligne), couleur: true } : { id: 'usage-inconnue', couleur: false };
  }
  return { id: signeDuNombre(lecture, ligne), couleur: false };
}

/** Le signe du titre : le composant lu, ou le type du layer choisi dans l'aperçu. */
export function signeDuTitre(surLeSujet: boolean, type: string | undefined): string {
  if (surLeSujet) return 'component';
  switch (type) {
    case 'COMPONENT': return 'component';
    case 'COMPONENT_SET': return 'component-set';
    case 'INSTANCE': return 'instance';
    case 'TEXT': return 'text';
    case 'GROUP': return 'group';
    case 'VECTOR':
    case 'BOOLEAN_OPERATION':
    case 'LINE':
    case 'ELLIPSE':
    case 'POLYGON':
    case 'STAR': return 'vector';
    default: return 'frame';
  }
}

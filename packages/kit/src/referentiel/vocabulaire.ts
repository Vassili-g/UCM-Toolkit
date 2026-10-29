/**
 * Les identifiants retenus et les formes tolérées dans les noms Figma.
 *
 * Après une modification : relancer `npm test`, régénérer la vue illustrée (`generer-donnees-referentiel.ts`) si un registre qu'elle montre change, la planche du moteur (`npm run planche --workspace ucm-couleur`) si un cran, un mode ou un profil change, et changer la version du kit.
 */
import type { Registre } from './termes.js';

export const CRANS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
/** Les numéros qu'une palette de `primitives` peut porter : les crans, puis 1000 et 1050 des palettes à treize nuances. */
export const NUMEROS_DE_PALETTE = [...CRANS, 1000, 1050] as const;
export type NumeroDePalette = (typeof NUMEROS_DE_PALETTE)[number];
export const MODES = ['light', 'dark'] as const;
export const PROFILS = ['soft', 'vivid'] as const;
export const INTENSITE_UNIQUE = 'unique' as const;

export const STATE_SELECTORS: Readonly<Record<string, string>> = {
  default: '',
  hover: ':hover',
  hovered: ':hover',
  focus: ':focus-visible',
  focused: ':focus-visible',
  press: ':active',
  pressed: ':active',
  disable: '[disabled]',
  disabled: '[disabled]',
  // Décisions S01, T12 et S05 de la nomenclature : `selected` est un état ; ses formes booléennes et l'état non sélectionné reviennent à `selected` ou `default`.
  selected: '[aria-selected="true"]',
  'selected-true': '[aria-selected="true"]',
  'selected-false': '',
  unselected: '',
  rest: '',
  resting: '',
  normal: '',
};

export const STATE_PRECEDENCE = [
  'disable', 'disabled', 'press', 'pressed', 'selected-true', 'selected', 'focus', 'focused', 'hover', 'hovered',
  'default', 'rest', 'resting', 'normal', 'selected-false', 'unselected',
] as const;
/** Les tailles que l'exporteur accepte sans que `REGISTRE_TAILLES` les reconnaisse : une compatibilité voulue. */
export const TAILLES_DE_COMPATIBILITE = ['tiny', 'huge'] as const;
export const SIZE_VALUES: ReadonlySet<string> = new Set([
  'tiny', 'small', 'medium', 'large', 'big', 'huge',
  '9xs', '8xs', '7xs', '6xs', '5xs', '4xs', '3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl', '2xl', '3xl', '4xl',
  '5xl', '6xl', '7xl', '8xl', '9xl',
]);

export const SYNONYMES_COURANTS = [
  ['danger', 'error', 'negative', 'critical'],
  ['warning', 'attention', 'notice'],
  ['success', 'positive'],
  ['info', 'information', 'informative'],
  ['pressed', 'active', 'down'],
  ['foreground', 'fg', 'content'],
  ['background', 'bg'],
  ['border', 'stroke'],
  ['radius', 'corner', 'border-radius'],
] as const;

export const ABREVIATIONS: Readonly<Record<string, string>> = {
  bg: 'background', fg: 'foreground', btn: 'button', txt: 'text', img: 'image',
};

export const ECHELLES_DE_TAILLES = [
  ['sm', 'small'], ['md', 'medium'], ['lg', 'large'],
] as const;

export const REGISTRE_CRANS: Registre = {
  id: 'crans', extensible: false,
  termes: CRANS.map((cran) => ({
    id: String(cran),
    libelle: { fr: String(cran), en: String(cran) },
    definition: {
      fr: `Cran ${cran} de la rampe de couleur.`,
      en: `Step ${cran} of the color scale.`,
    },
  })),
};

export const REGISTRE_MODES: Registre = {
  id: 'modes', extensible: true,
  termes: [
    { id: 'light', libelle: { fr: 'Clair', en: 'Light' }, definition: { fr: 'Thème à fonds clairs.', en: 'Theme with light backgrounds.' } },
    { id: 'dark', libelle: { fr: 'Sombre', en: 'Dark' }, definition: { fr: 'Thème à fonds sombres.', en: 'Theme with dark backgrounds.' } },
  ],
};

export const REGISTRE_PROFILS: Registre = {
  id: 'profils', extensible: false,
  termes: [
    { id: 'soft', libelle: { fr: 'Soft', en: 'Soft' }, definition: { fr: 'Profil de la rampe de faible intensité.', en: 'Profile of the low intensity color scale.' } },
    { id: 'vivid', libelle: { fr: 'Vivid', en: 'Vivid' }, definition: { fr: 'Profil de la rampe de forte intensité.', en: 'Profile of the high intensity color scale.' } },
  ],
};

export const REGISTRE_INTENSITES: Registre = {
  id: 'intensites', extensible: false,
  termes: [
    { id: INTENSITE_UNIQUE, libelle: { fr: 'Unique', en: 'Single' }, definition: { fr: 'Une seule intensité, sans distinction Soft et Vivid.', en: 'A single intensity without separate Soft and Vivid scales.' } },
  ],
};

export const REGISTRE_ETATS: Registre = {
  id: 'etats', extensible: true,
  termes: [
    { id: 'default', toleres: ['rest', 'resting', 'normal', 'selected-false', 'unselected'], libelle: { fr: 'Par défaut', en: 'Default' }, definition: { fr: 'État sans interaction en cours.', en: 'State without an ongoing interaction.' } },
    { id: 'hover', toleres: ['hovered'], libelle: { fr: 'Survol', en: 'Hover' }, definition: { fr: 'État sous le pointeur.', en: 'State under the pointer.' } },
    { id: 'focus', toleres: ['focused'], libelle: { fr: 'Focus', en: 'Focus' }, definition: { fr: 'État avec le focus visible.', en: 'State with visible focus.' } },
    { id: 'pressed', toleres: ['press'], libelle: { fr: 'Pressé', en: 'Pressed' }, definition: { fr: 'État pendant la pression.', en: 'State while being pressed.' } },
    { id: 'disabled', toleres: ['disable'], libelle: { fr: 'Désactivé', en: 'Disabled' }, definition: { fr: 'État indisponible pour une interaction.', en: 'State unavailable for interaction.' } },
    { id: 'selected', toleres: ['selected-true'], libelle: { fr: 'Sélectionné', en: 'Selected' }, definition: { fr: 'État choisi dans un groupe d’options.', en: 'State chosen among a group of options.' } },
  ],
};

export const REGISTRE_AXES_ETAT: Registre = {
  id: 'axes-etat', extensible: false,
  termes: [
    { id: 'state', toleres: ['states', 'status', 'etat', 'état'], libelle: { fr: 'État', en: 'State' }, definition: { fr: 'Axe qui décrit les états du composant.', en: 'Axis describing component states.' } },
  ],
};

/** Les écritures d'un axe d'états, telles que le registre les donne ; `estLAxeDEtats` (`reconnaissance.ts`) les compare par forme. */
export const STATE_AXIS_NAMES: readonly string[] = REGISTRE_AXES_ETAT.termes.flatMap((terme) => [terme.id, ...(terme.toleres ?? [])]);

/** Les dossiers gardent les tailles en mots entiers ; les variables emploient les abréviations. */
const TAILLES_RETENUES: readonly (readonly [string, readonly string[]])[] = [
  ['9xs', []], ['8xs', []], ['7xs', []], ['6xs', []], ['5xs', []],
  ['4xs', []], ['3xs', []], ['2xs', []], ['xs', []], ['sm', ['small']], ['md', ['medium']], ['lg', ['large', 'big']],
  ['xl', []], ['2xl', ['xxl']], ['3xl', ['xxxl']], ['4xl', []],
  ['5xl', []], ['6xl', []], ['7xl', []], ['8xl', []], ['9xl', []],
];

export const REGISTRE_TAILLES: Registre = {
  id: 'tailles', extensible: true,
  termes: TAILLES_RETENUES.map(([taille, toleres]) => {
    const echelle = ECHELLES_DE_TAILLES.find(([court]) => court === taille);
    return {
      id: taille,
      ...(echelle ? { identifiantParCategorie: { groupes: echelle[1] } } : {}),
      ...(toleres.length ? { toleres } : {}),
      libelle: { fr: taille, en: taille },
      definition: { fr: `Valeur de taille ${taille}.`, en: `Size value ${taille}.` },
    };
  }),
};

export const REGISTRE_STATUTS: Registre = {
  id: 'statuts', extensible: true,
  termes: [
    { id: 'success', toleres: ['positive'], libelle: { fr: 'Succès', en: 'Success' }, definition: { fr: 'Résultat réussi.', en: 'Successful outcome.' } },
    { id: 'warning', toleres: ['caution', 'attention', 'notice'], libelle: { fr: 'Avertissement', en: 'Warning' }, definition: { fr: 'Situation qui demande une vérification.', en: 'Situation requiring review.' } },
    { id: 'info', toleres: ['information', 'informative'], libelle: { fr: 'Information', en: 'Information' }, definition: { fr: 'Information sans erreur signalée.', en: 'Information without a reported error.' } },
    { id: 'danger', toleres: ['error', 'critical'], libelle: { fr: 'Danger', en: 'Danger' }, definition: { fr: 'Erreur ou action destructive.', en: 'Error or destructive action.' } },
  ],
};

export const REGISTRE_ROLES: Registre = {
  id: 'roles', extensible: true,
  termes: [
    { id: 'background', toleres: ['bg'], libelle: { fr: 'Fond', en: 'Background' }, definition: { fr: 'Couleur du fond.', en: 'Background color.' } },
    { id: 'foreground', libelle: { fr: 'Premier plan', en: 'Foreground' }, definition: { fr: 'Couleur commune au texte, à l’icône et à la bordure posés sur un fond.', en: 'Color shared by the text, icon and border placed on a background.' } },
    { id: 'text', libelle: { fr: 'Texte', en: 'Text' }, definition: { fr: 'Couleur d’un texte seul, quand l’icône et la bordure ont la leur.', en: 'Color of text alone, when the icon and border have their own.' } },
    { id: 'icon', toleres: ['icons'], libelle: { fr: 'Icône', en: 'Icon' }, definition: { fr: 'Couleur d’une icône.', en: 'Color of an icon.' } },
    { id: 'border', libelle: { fr: 'Bordure', en: 'Border' }, definition: { fr: 'Couleur du contour d’un élément.', en: 'Color of an element outline.' } },
    { id: 'divider', toleres: ['separator'], libelle: { fr: 'Séparateur', en: 'Divider' }, definition: { fr: 'Couleur d’un trait de séparation.', en: 'Color of a dividing line.' } },
    { id: 'ring', toleres: ['focus-ring'], libelle: { fr: 'Anneau de focus', en: 'Focus ring' }, definition: { fr: 'Couleur de l’anneau qui indique le focus.', en: 'Color of the ring indicating focus.' } },
    { id: 'inverse', libelle: { fr: 'Inversé', en: 'Inverse' }, definition: { fr: 'Variante posée sur un fond inversé.', en: 'Variant placed on an inverted background.' } },
  ],
};

/** Noms communs des groupes et des propriétés, valables dans toutes les collections : singulier (T05, T13), `radius` (T07). */
export const REGISTRE_GROUPES: Registre = {
  id: 'noms-communs', extensible: true,
  termes: [
    { id: 'color', toleres: ['colors', 'colour', 'colours'], libelle: { fr: 'Couleur', en: 'Color' }, definition: { fr: 'Groupe des couleurs.', en: 'Group of colors.' } },
    { id: 'size', toleres: ['sizes'], libelle: { fr: 'Taille', en: 'Size' }, definition: { fr: 'Groupe des tailles d’un élément.', en: 'Group of an element’s sizes.' } },
    { id: 'radius', toleres: ['border-radius'], libelle: { fr: 'Arrondi', en: 'Radius' }, definition: { fr: 'Arrondi des coins.', en: 'Corner rounding.' } },
  ],
};

/** Les axes et les côtés d'un espacement ou d'une bordure. */
export const REGISTRE_COTES: Registre = {
  id: 'cotes', extensible: false,
  termes: [
    { id: 'x', libelle: { fr: 'Horizontal', en: 'Horizontal' }, definition: { fr: 'Axe horizontal d’un espacement.', en: 'Horizontal axis of a spacing.' } },
    { id: 'y', libelle: { fr: 'Vertical', en: 'Vertical' }, definition: { fr: 'Axe vertical d’un espacement.', en: 'Vertical axis of a spacing.' } },
    { id: 'top', libelle: { fr: 'Haut', en: 'Top' }, definition: { fr: 'Côté haut d’un élément.', en: 'Top side of an element.' } },
    { id: 'right', libelle: { fr: 'Droite', en: 'Right' }, definition: { fr: 'Côté droit d’un élément.', en: 'Right side of an element.' } },
    { id: 'bottom', libelle: { fr: 'Bas', en: 'Bottom' }, definition: { fr: 'Côté bas d’un élément.', en: 'Bottom side of an element.' } },
    { id: 'left', libelle: { fr: 'Gauche', en: 'Left' }, definition: { fr: 'Côté gauche d’un élément.', en: 'Left side of an element.' } },
  ],
};

export const REGISTRES: readonly Registre[] = [
  REGISTRE_CRANS, REGISTRE_MODES, REGISTRE_PROFILS, REGISTRE_INTENSITES,
  REGISTRE_ETATS, REGISTRE_AXES_ETAT, REGISTRE_TAILLES, REGISTRE_STATUTS, REGISTRE_ROLES, REGISTRE_GROUPES, REGISTRE_COTES,
];

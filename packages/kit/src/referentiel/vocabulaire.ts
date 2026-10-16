/** Les identifiants retenus et les formes tolérées dans les noms Figma. */
import type { Registre } from './termes.js';

export const CRANS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
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
};

export const STATE_PRECEDENCE = [
  'disable', 'disabled', 'press', 'pressed', 'focus', 'focused', 'hover', 'hovered', 'default',
] as const;
export const STATE_AXIS_NAMES = ['state', 'states', 'status'] as const;
export const SIZE_VALUES: ReadonlySet<string> = new Set([
  'tiny', 'small', 'medium', 'large', 'big', 'huge',
  '4xs', '3xs', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl', '2xl', '3xl', '4xl',
]);

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
    { id: 'default', libelle: { fr: 'Par défaut', en: 'Default' }, definition: { fr: 'État sans interaction en cours.', en: 'State without an ongoing interaction.' } },
    { id: 'hover', toleres: ['hovered'], libelle: { fr: 'Survol', en: 'Hover' }, definition: { fr: 'État sous le pointeur.', en: 'State under the pointer.' } },
    { id: 'focus', toleres: ['focused'], libelle: { fr: 'Focus', en: 'Focus' }, definition: { fr: 'État avec le focus visible.', en: 'State with visible focus.' } },
    { id: 'pressed', toleres: ['press'], libelle: { fr: 'Pressé', en: 'Pressed' }, definition: { fr: 'État pendant la pression.', en: 'State while being pressed.' } },
    { id: 'disabled', toleres: ['disable'], libelle: { fr: 'Désactivé', en: 'Disabled' }, definition: { fr: 'État indisponible pour une interaction.', en: 'State unavailable for interaction.' } },
  ],
};

export const REGISTRE_AXES_ETAT: Registre = {
  id: 'axes-etat', extensible: false,
  termes: [
    { id: 'state', toleres: ['states', 'status'], libelle: { fr: 'État', en: 'State' }, definition: { fr: 'Axe qui décrit les états du composant.', en: 'Axis describing component states.' } },
  ],
};

export const REGISTRE_TAILLES: Registre = {
  id: 'tailles', extensible: true,
  termes: [...SIZE_VALUES].map((taille) => ({
    id: taille,
    libelle: { fr: taille, en: taille },
    definition: { fr: `Valeur de taille ${taille}.`, en: `Size value ${taille}.` },
  })),
};

export const REGISTRE_STATUTS: Registre = {
  id: 'statuts', extensible: true,
  termes: [
    { id: 'success', libelle: { fr: 'Succès', en: 'Success' }, definition: { fr: 'Résultat réussi.', en: 'Successful outcome.' } },
    { id: 'warning', libelle: { fr: 'Avertissement', en: 'Warning' }, definition: { fr: 'Situation qui demande une vérification.', en: 'Situation requiring review.' } },
    { id: 'info', libelle: { fr: 'Information', en: 'Information' }, definition: { fr: 'Information sans erreur signalée.', en: 'Information without a reported error.' } },
    { id: 'danger', libelle: { fr: 'Danger', en: 'Danger' }, definition: { fr: 'Erreur ou action destructive.', en: 'Error or destructive action.' } },
  ],
};

export const REGISTRE_ROLES: Registre = {
  id: 'roles', extensible: true,
  termes: [
    { id: 'background', libelle: { fr: 'Fond', en: 'Background' }, definition: { fr: 'Couleur du fond.', en: 'Background color.' } },
    { id: 'foreground', libelle: { fr: 'Premier plan', en: 'Foreground' }, definition: { fr: 'Couleur du contenu posé sur un fond.', en: 'Color of content placed on a background.' } },
    { id: 'icon', libelle: { fr: 'Icône', en: 'Icon' }, definition: { fr: 'Couleur d’une icône.', en: 'Color of an icon.' } },
    { id: 'border', libelle: { fr: 'Bordure', en: 'Border' }, definition: { fr: 'Couleur du contour d’un élément.', en: 'Color of an element outline.' } },
    { id: 'divider', libelle: { fr: 'Séparateur', en: 'Divider' }, definition: { fr: 'Couleur d’un trait de séparation.', en: 'Color of a dividing line.' } },
    { id: 'ring', libelle: { fr: 'Anneau de focus', en: 'Focus ring' }, definition: { fr: 'Couleur de l’anneau qui indique le focus.', en: 'Color of the ring indicating focus.' } },
  ],
};

export const REGISTRES: readonly Registre[] = [
  REGISTRE_CRANS, REGISTRE_MODES, REGISTRE_PROFILS, REGISTRE_INTENSITES,
  REGISTRE_ETATS, REGISTRE_AXES_ETAT, REGISTRE_TAILLES, REGISTRE_STATUTS, REGISTRE_ROLES,
];

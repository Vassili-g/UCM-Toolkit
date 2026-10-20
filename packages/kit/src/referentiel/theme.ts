/**
 * Les libellés et définitions du thème partagent les supports des emplois de couleur.
 *
 * Après une modification : relancer `npm test`, régénérer la vue illustrée (`generer-donnees-referentiel.ts`) (elle en tire les définitions des variables), et changer la version du kit.
 */
import { SUPPORT_DES_VARIABLES, VARIABLES_DE_PALETTE, VARIABLES_DU_THEME, type ModeDuTheme, type VariableDePalette, type VariableDuTheme, type SupportDeVariable } from '../emplois/dossiers.js';
import type { IndexDuVocabulaire } from './harmonisation.js';
import { decouperSegment } from './ecriture-des-mots.js';
import type { Langues, Terme } from './termes.js';
import { formeReconnue } from './reconnaissance.js';
import { MODES } from './vocabulaire.js';

export type VariableLibellee = VariableDePalette | 'page/foreground-main' | 'page/foreground-subtle' | 'elevation/page' | 'elevation/raised';
export type DefinitionDeVariable = Terme & { readonly id: VariableDuTheme; readonly support: SupportDeVariable };

type TexteDeVariable = { readonly libelle: Langues; readonly definition: Langues };
const TEXTES_DES_VARIABLES = {
  "solid/default": { libelle: { fr: "bouton", en: "button" }, definition: { fr: "Fond et contour du bouton au repos.", en: "Button background and border at rest." } },
  "solid/hover": { libelle: { fr: "bouton survolé", en: "button, hovered" }, definition: { fr: "Fond et contour du bouton sous le pointeur.", en: "Button background and border under the pointer." } },
  "solid/pressed": { libelle: { fr: "bouton appuyé", en: "button, pressed" }, definition: { fr: "Fond et contour du bouton pendant la pression.", en: "Button background and border while pressed." } },
  "solid/foreground": { libelle: { fr: "texte des boutons", en: "button text" }, definition: { fr: "Texte et icônes sur le fond du bouton.", en: "Text and icons on the button background." } },
  "surface/default": { libelle: { fr: "fond teinté", en: "tinted fill" }, definition: { fr: "Fond teinté au repos.", en: "Tinted background at rest." } },
  "surface/hover": { libelle: { fr: "fond teinté survolé", en: "tinted fill, hovered" }, definition: { fr: "Fond teinté sous le pointeur.", en: "Tinted background under the pointer." } },
  "surface/pressed": { libelle: { fr: "fond teinté appuyé", en: "tinted fill, pressed" }, definition: { fr: "Fond teinté pendant la pression.", en: "Tinted background while pressed." } },
  "surface/foreground": { libelle: { fr: "texte sur fond teinté", en: "text on tinted fill" }, definition: { fr: "Texte et icônes sur un fond teinté.", en: "Text and icons on a tinted background." } },
  "surface/border": { libelle: { fr: "contour sur fond teinté", en: "border on tinted fill" }, definition: { fr: "Contour sur un fond teinté.", en: "Border on a tinted background." } },
  "page/foreground": { libelle: { fr: "texte coloré", en: "colored text" }, definition: { fr: "Texte et icônes colorés sur le fond de la page.", en: "Colored text and icons on the page background." } },
  "page/border": { libelle: { fr: "contour", en: "border" }, definition: { fr: "Contour des éléments sur le fond de la page.", en: "Element borders on the page background." } },
  "page/divider": { libelle: { fr: "filet", en: "divider" }, definition: { fr: "Trait de séparation sur le fond de la page.", en: "Dividing line on the page background." } },
  "ring": { libelle: { fr: "anneau de focus", en: "focus ring" }, definition: { fr: "Trait de l’anneau qui indique le focus visible.", en: "Stroke of the ring indicating visible focus." } },
  "page/foreground-main": { libelle: { fr: "corps de texte", en: "body text" }, definition: { fr: "Texte principal et icônes du neutre sur le fond de la page.", en: "Main neutral text and icons on the page background." } },
  "page/foreground-subtle": { libelle: { fr: "texte secondaire", en: "secondary text" }, definition: { fr: "Texte secondaire et icônes du neutre sur le fond de la page.", en: "Secondary neutral text and icons on the page background." } },
  "elevation/page": { libelle: { fr: "fond de la page", en: "page background" }, definition: { fr: "Fond de la page.", en: "Page background." } },
  "elevation/raised": { libelle: { fr: "fond de la carte", en: "card background" }, definition: { fr: "Fond des cartes au-dessus de la page.", en: "Background of cards above the page." } },
  "scale/0": { libelle: { fr: "borne de départ", en: "start endpoint" }, definition: { fr: "Borne pure au début de l’échelle du neutre : blanc en Light, noir en Dark.", en: "Pure endpoint at the start of the neutral scale: white in Light, black in Dark." } },
  "scale/1000": { libelle: { fr: "borne de fin", en: "end endpoint" }, definition: { fr: "Borne pure à la fin de l’échelle du neutre : noir en Light, blanc en Dark.", en: "Pure endpoint at the end of the neutral scale: black in Light, white in Dark." } },
  "disabled/background": { libelle: { fr: "fond désactivé", en: "disabled background" }, definition: { fr: "Fond des éléments désactivés.", en: "Background of disabled elements." } },
  "disabled/foreground": { libelle: { fr: "texte désactivé", en: "disabled text" }, definition: { fr: "Texte et icônes des éléments désactivés.", en: "Text and icons of disabled elements." } },
  "disabled/border": { libelle: { fr: "contour désactivé", en: "disabled border" }, definition: { fr: "Contour des éléments désactivés.", en: "Border of disabled elements." } },
} as const satisfies Record<VariableDuTheme, TexteDeVariable>;

export const DEFINITIONS_DES_VARIABLES: readonly DefinitionDeVariable[] = (Object.keys(TEXTES_DES_VARIABLES) as VariableDuTheme[])
  .map((id) => ({ id, ...TEXTES_DES_VARIABLES[id], support: SUPPORT_DES_VARIABLES[id] }));

export const REGLE_SCALE = {
  id: 'scale/{cran}', palettes: 'toutes',
  libelle: { fr: 'nuance de la palette', en: 'palette shade' },
  definition: {
    fr: 'Nuance de la rampe de chaque palette, sans rôle de peinture ni portée Figma imposés.',
    en: 'Shade from each palette ramp, with no prescribed painting role or Figma scope.',
  },
  support: SUPPORT_DES_VARIABLES['scale/0'],
} as const;

export const REGISTRE_VARIABLES_THEME = {
  id: 'variables-theme', extensible: false, termes: [...DEFINITIONS_DES_VARIABLES, REGLE_SCALE],
} as const;

/** Les mots d'un segment, remplacés par les termes de `index` (catégorie `variables`) quand il est donné. */
function motsDuSegment(segment: string, index?: IndexDuVocabulaire): string[] {
  const mots = decouperSegment(segment);
  if (!index) return mots;
  const resultat: string[] = [];
  let curseur = 0;
  for (const { debut, fin, par } of index.remplacements(mots, 'variables')) {
    resultat.push(...mots.slice(curseur, debut), ...par);
    curseur = fin;
  }
  return [...resultat, ...mots.slice(curseur)];
}

function formeDuSegment(segment: string, index?: IndexDuVocabulaire): string {
  return motsDuSegment(segment, index).map((mot) => mot.toLowerCase()).join('-');
}

/**
 * La variable de dossier qu'un nom de `theme` porte par sa fin, quelle que soit l'écriture :
 * `Primary/Solid/default` porte `solid/default`. `undefined` pour `identity` et tout nom inconnu.
 */
export function variableDuThemeReconnue(nom: string, index?: IndexDuVocabulaire): VariableDuTheme | undefined {
  const segments = nom.split('/').map((segment) => formeDuSegment(segment, index));
  return VARIABLES_DU_THEME.find((variable) => {
    const fin = variable.split('/').map((segment) => formeReconnue(segment));
    return fin.length <= segments.length && fin.every((segment, rang) => segment === segments[segments.length - fin.length + rang]);
  });
}

/** Le mode du thème qu'un nom de mode désigne, quelle que soit l'écriture ; `undefined` sinon. */
export function modeDuThemeReconnu(nom: string, index?: IndexDuVocabulaire): ModeDuTheme | undefined {
  const forme = formeDuSegment(nom, index);
  return MODES.find((mode) => mode === forme);
}

/** Projette les dix-sept libellés affichés par Palettes, sans les variables globales ni les bornes de la rampe. */
export function libellesDesVariables(langue: keyof Langues): Record<VariableLibellee, string> {
  const variables: readonly VariableLibellee[] = [...VARIABLES_DE_PALETTE, 'page/foreground-main', 'page/foreground-subtle', 'elevation/page', 'elevation/raised'];
  return Object.fromEntries(variables.map((variable) => [variable, TEXTES_DES_VARIABLES[variable].libelle[langue]])) as Record<VariableLibellee, string>;
}

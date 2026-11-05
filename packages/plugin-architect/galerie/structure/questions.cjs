/**
 * Les constats que le lot E4a de la fiabilisation met à l'écran : la palette dont les rôles se partagent entre deux sens, les
 * couches d'une même collection regroupées, l'information « aucune collection n'est reconnue comme theme » et les questions des
 * genres de structure qui n'avaient pas de carte. Leurs faits suivent ceux que le kit écrit (`controles/integrite.ts`,
 * `controles/structure.ts`, `controles/theme.ts`) ; les noms citent les variables de la fixture de `integrite.cjs`.
 */
const constat = (id, code, type, faits, reste = {}) => ({ id, code, type, famille: 'liaisons', variants: [], layers: [], faits, ...reste });

const blanc = { nom: 'utility/neutral/light/white' };
const noir = { nom: 'utility/neutral/light/black' };

/** La palette `secondary` : ses variables se répartissent entre les deux tables, en Light comme en Dark. */
const sensPartage = ['light', 'dark'].map((mode) => constat(
  `C82:sens-partage:theme:secondary:m-${mode}`, 'C82', 'verifier', { genre: 'sens-partage', variable: 'secondary', groupe: 'secondary', mode },
  { question: { id: `C82:sens-partage:theme:secondary:m-${mode}`, candidats: [blanc, noir] } },
));

const couche = (variable, mode, coucheCible, cible) => constat(
  `C82:couche:theme|${variable}:m-${mode}`, 'C82', 'corriger', { genre: 'couche', variable, mode, cible, coucheCible, collection: 'theme' },
);

/** Quatre variables de `theme` qui visent `primitives` dans deux modes, une qui vise `layout` dans un seul. */
const couches = [
  ...['primary/page/border', 'primary/page/divider', 'secondary/page/border', 'secondary/page/divider'].flatMap((variable) => [
    couche(variable, 'light', 'primitives', 'color/red/500'), couche(variable, 'dark', 'primitives', 'color/red/300'),
  ]),
  couche('primary/ring', 'light', 'layout', 'sizing/2'),
];

const themeNonReconnu = constat('C82:theme-non-reconnu', 'C82', 'info', { genre: 'theme-non-reconnu' });

const variableInconnue = constat(
  'C82:variable-inconnue:theme|tertiary/surface/defalt', 'C82', 'verifier',
  { genre: 'variable-inconnue', variable: 'tertiary/surface/defalt', roles: 'surface/default' },
  { question: { id: 'C82:variable-inconnue:theme|tertiary/surface/defalt', candidats: [{ nom: 'tertiary/surface/default' }] } },
);
const rampeAutrePalette = constat(
  'C82:rampe-autre-palette:theme|primary/page/border:m-light', 'C82', 'verifier',
  { genre: 'rampe-autre-palette', variable: 'primary/page/border', mode: 'light', rampe: 'secondary/light', rampeDeLaPalette: 'primary/light' },
  { question: { id: 'C82:rampe-autre-palette:theme|primary/page/border:m-light', candidats: [{ nom: 'brands/primary/light/300' }, { nom: 'brands/secondary/light/300' }] } },
);
const brancheDeMode = constat(
  'C60:theme|primary/page/border:m-dark', 'C60', 'corriger',
  { genre: 'branche-de-mode', variable: 'primary/page/border', mode: 'dark', cible: 'primary/light/300' },
  { question: { id: 'C60:theme|primary/page/border:m-dark', candidats: [{ nom: 'brands/primary/dark/300' }, { nom: 'brands/primary/dark/200' }] } },
);
const roleEnDouble = constat(
  'C82:role-en-double:theme:primary/surface/default', 'C82', 'verifier',
  { genre: 'role-en-double', variable: 'surface/default', groupe: 'primary', variables: 2 },
  { question: { id: 'C82:role-en-double:theme:primary/surface/default', candidats: [{ nom: 'theme/primary/surface/default' }, { nom: 'theme/primary/Surface/Default' }] } },
);
const themeEnDouble = constat('C82:theme-en-double:theme-copy', 'C82', 'corriger', { genre: 'theme-en-double', collection: 'theme (copy)', reference: 'theme' });
const cibleInaccessible = constat('C63:brands:cible-inaccessible', 'C63', 'info', { genre: 'cible-inaccessible', collection: 'brands', cibles: 3, alias: 12 });

/**
 * Lots E4b et E4c. Un constat de scopes dont la proposition est retirée garde sa carte, et le rôle écrit deux fois porte la clé de
 * chaque variable : ses choix « Garder … » deviennent des boutons qui fusionnent.
 */
const scopesSansProposition = [
  constat('C63:cle-ring:scopes', 'C63', 'corriger', { variable: 'primary/ring', scopes: 'ALL_SCOPES' }),
  constat('C82:scopes:brands|cle-rouge', 'C82', 'corriger', { genre: 'scopes', variable: 'primary/red/500', scopes: 'ALL_SCOPES,TEXT_FILL' }),
];
const roleEnDoubleFusion = constat(
  'C82:role-en-double:theme:primary/surface/default', 'C82', 'verifier',
  { genre: 'role-en-double', variable: 'surface/default', groupe: 'primary', variables: 2 },
  { question: { id: 'C82:role-en-double:theme:primary/surface/default', candidats: [{ cle: 'cle-theme-1', nom: 'primary/surface/default' }, { cle: 'cle-theme-2', nom: 'primary/surface/Default' }] } },
);

/** Les genres qui n'avaient pas de carte, dans l'ordre des catégories. */
const genresSansCarte = [variableInconnue, rampeAutrePalette, brancheDeMode, roleEnDouble, themeEnDouble, cibleInaccessible];

module.exports = { sensPartage, couches, themeNonReconnu, genresSansCarte, scopesSansProposition, roleEnDoubleFusion };

/**
 * Les données des états de la section Variants : Alert et ses 11 variants,
 * « Button » et ses 216, et les analyses que le sandbox rendrait. Les noms et
 * les nombres viennent de MAQUETTE-ARCHITECT.html (`COMPOSANTS`).
 *
 * Le jeu de variants est celui de la lecture `alert` des fixtures : le variant
 * lu garde l'identifiant de sa racine, `alert:0`. « Button » est cette lecture
 * dont les noms et les couleurs prennent ceux de la maquette (`enButton`).
 */
const { alert, couleur, constructeur, nombre, alias } = require('../etats/aide.cjs');

const IDENTITE = { sujet: 'alert-set', generation: 1 };

/** Les variants d'un jeu : le produit des valeurs de ses properties, dans l'ordre, sauf les combinaisons exclues. */
function variantsDe(properties, exclus = []) {
  let combinaisons = [[]];
  for (const [nom, valeurs] of properties) combinaisons = combinaisons.flatMap((debut) => valeurs.map((valeur) => [...debut, `${nom}=${valeur}`]));
  return combinaisons.map((paires) => paires.join(', ')).filter((nom) => !exclus.includes(nom));
}

const donnerDesIds = (noms, lu) => noms.map((nom) => ({ id: nom === lu ? 'alert:0' : `alert:v:${nom}`, nom }));

const constat = (rang, type, variants, code = 'C16') => ({ id: `${code}:${rang}`, code, type, famille: 'liaisons', variants, layers: [], faits: {} });

const SEVERITY = ['info', 'error', 'success', 'warning'];
const STYLE = ['standard', 'outlined', 'filled'];
const NOMS_ALERT = variantsDe([['Severity', SEVERITY], ['Variant', STYLE]], ['Severity=warning, Variant=filled']);
const LU_ALERT = 'Severity=success, Variant=standard';
const VARIANTS_ALERT = donnerDesIds(NOMS_ALERT, LU_ALERT);

/** Alert dans son jeu de 11 variants ; le variant lu est `success, standard`. */
const alertEnJeu = { ...alert, sujet: { ...alert.sujet, type: 'COMPONENT_SET', variant: LU_ALERT, variants: VARIANTS_ALERT } };

/**
 * Les constats d'Alert : un par couple, au nombre voulu, plus un constat sans
 * variant. Les nombres par valeur sont ceux de la maquette : Severity info 4,
 * error 4, success 6, warning 4 ; Variant standard 7, outlined 8, filled 3.
 * Les trois constats de `filled` sont des « à vérifier », les autres des
 * « à corriger ».
 */
const NOMBRE_PAR_COUPLE = {
  'info, standard': 1, 'info, outlined': 2, 'info, filled': 1,
  'error, standard': 1, 'error, outlined': 2, 'error, filled': 1,
  'success, standard': 3, 'success, outlined': 2, 'success, filled': 1,
  'warning, standard': 2, 'warning, outlined': 2,
};
const constatsAlert = [];
for (const [couple, nombre] of Object.entries(NOMBRE_PAR_COUPLE)) {
  const [severity, style] = couple.split(', ');
  for (let rang = 0; rang < nombre; rang += 1) constatsAlert.push(constat(constatsAlert.length, style === 'filled' ? 'verifier' : 'corriger', [`Severity=${severity}, Variant=${style}`]));
}
constatsAlert.push(constat(constatsAlert.length, 'corriger', [], 'C30'));

const analyse = (variants, constats) => ({ type: 'analyse', analyse: IDENTITE, statut: 'complete', constats, lecture: null, variants });

/** Le message d'analyse d'Alert : 19 constats, dont le plus grave est « à corriger ». */
const analyseAlert = analyse(VARIANTS_ALERT, constatsAlert);

/** La lecture d'Alert sans jeu de variants : le bouton Constats compte une analyse, la vue n'a pas de section. */
const analyseSansVariants = analyse([], constatsAlert);

/* Button : 216 variants, 41 constats. */
const PROPERTIES_BUTTON = [
  ['Style', ['contained', 'outlined', 'text']],
  ['Palette', ['primary', 'secondary', 'neutral', 'info', 'success', 'danger']],
  ['State', ['default', 'hover', 'focus', 'disabled']],
  ['Size', ['small', 'medium', 'large']],
];
const LU_BUTTON = 'Style=contained, Palette=primary, State=hover, Size=medium';
const VARIANTS_BUTTON = donnerDesIds(variantsDe(PROPERTIES_BUTTON), LU_BUTTON);

/**
 * Trois constats, tous sur des variants `Size=small` : les puces de la maquette
 * ne montrent que cette valeur de Size. Les deux premiers touchent deux variants
 * chacun, pour que les puces comptent plus d'un constat comme les siennes.
 */
const CONTAINED_HOVER = 'Style=contained, Palette=primary, State=hover, Size=small';
const OUTLINED_FOCUS = 'Style=outlined, Palette=danger, State=focus, Size=small';
const constatsButton = [
  constat(0, 'corriger', [CONTAINED_HOVER, OUTLINED_FOCUS]),
  constat(1, 'corriger', [CONTAINED_HOVER, OUTLINED_FOCUS]),
  constat(2, 'verifier', ['Style=text, Palette=info, State=hover, Size=small']),
];
while (constatsButton.length < 41) constatsButton.push(constat(constatsButton.length, 'corriger', [], 'C30'));
const analyseButton = analyse(VARIANTS_BUTTON, constatsButton);

const ROUGE = { r: 142 / 255, g: 63 / 255, b: 64 / 255 };
const BLANC = { r: 1, g: 1, b: 1 };
const memeCouleur = (a, b) => Math.abs(a.r - b.r) < 0.003 && Math.abs(a.g - b.g) < 0.003 && Math.abs(a.b - b.b) < 0.003;

/**
 * « Button » : la lecture d'Alert dont les noms et les couleurs prennent ceux
 * de la maquette, qui remplace de même le texte de la fenêtre d'Alert.
 */
function enButton() {
  const texte = JSON.stringify(alertEnJeu)
    .replace(/colors\/info\/standard\//g, 'color/primary/contained/hover/')
    .replace(/icons\/sizes\/base/g, 'size/medium/icon')
    .replace(/sizes\//g, 'size/medium/')
    .replace('"nom":"Alert"', '"nom":"Button"')
    .replace(/"frontiere":\{"composant":"Button"\}/, '"frontiere":{"composant":"Icon"}');
  const lecture = JSON.parse(texte);
  const attendues = [[couleur('#F0F9FF').couleur, ROUGE], [couleur('#0369A1').couleur, BLANC]];
  const repeindre = (noeud) => {
    if (Array.isArray(noeud)) return noeud.forEach(repeindre);
    if (noeud === null || typeof noeud !== 'object') return;
    if (noeud.nature === 'couleur' && noeud.couleur) {
      for (const [avant, apres] of attendues) if (memeCouleur(noeud.couleur, avant)) noeud.couleur = { ...noeud.couleur, ...apres };
    }
    Object.values(noeud).forEach(repeindre);
  };
  repeindre(lecture);
  return { ...lecture, sujet: { ...lecture.sujet, nom: 'Button', variant: LU_BUTTON, variants: VARIANTS_BUTTON } };
}

/**
 * Le fichier Intencial hors UCM de `t-hors` : cinq collections, dont Interface,
 * qui garde ses noms d'aujourd'hui. `brands` et `theme` ont deux modes. Les
 * nombres de variables sont ceux de l'arbre de la maquette ; ils se comparent
 * en style seul (`zonesDeDonnees`).
 */
function releveHorsUcm() {
  const c = constructeur('Intencial');
  c.collection('primitives', 'primitives', ['Valeur']);
  c.collection('brands', 'brands', ['intencial', 'apicil']);
  c.collection('theme', 'theme', ['light', 'dark']);
  c.collection('layout', 'layout', ['Valeur']);
  c.collection('interface', 'Interface', ['Valeur']);
  const remplir = (collection, total, deja, modes) => {
    for (let rang = deja; rang < total; rang += 1) c.variable(`${collection}-${rang}`, collection, `remplissage-${rang}`, 'FLOAT', Object.fromEntries(modes.map((mode) => [mode, nombre(rang)])));
  };
  const theme = [['primary/solid/default', '#B15152'], ['primary/solid/hover', '#8E3F40'], ['primary/solid/foreground', '#FFFFFF'], ['primary/surface/default', '#F6E6E6'], ['neutral/page/border', '#D4D4D8'],
    ['primary/page/foreground', '#9A3F40'], ['neutral/elevation/raised', '#FFFFFF'], ['neutral/elevation/page', '#F8FAFC'], ['neutral/solid/hover', '#3F3F46']];
  for (const [nom, valeur] of theme) c.variable(`theme:${nom}`, 'theme', nom, 'COLOR', { light: couleur(valeur), dark: couleur(valeur) });
  c.variable('layout:sizing/4', 'layout', 'sizing/4', 'FLOAT', { Valeur: nombre(16) });
  // Les noms d'aujourd'hui, avant tout renommage ; chaque variable vise un token du thème.
  const noms = [['Button/bg/default', 0], ['Button/bg/hovered', 1], ['Button/foreground/default', 2], ['Card/bg/default', 3], ['Card/border/default', 4], ['Card/paddingX', null],
    ['Link/contrasthovered/text', 5], ['Modal/backgrond/default', 6], ['Page/bg/default', 7], ['Tooltip/bg/hovered', 8]];
  noms.forEach(([nom, cible], rang) => {
    if (cible === null) c.variable(`i${rang}`, 'interface', nom, 'FLOAT', { Valeur: alias('layout:sizing/4') });
    else c.variable(`i${rang}`, 'interface', nom, 'COLOR', { Valeur: alias(`theme:${theme[cible][0]}`) });
  });
  for (let rang = noms.length; rang < 66; rang += 1) c.variable(`i${rang}`, 'interface', `remplissage-${rang}`, 'FLOAT', { Valeur: nombre(1) });
  remplir('primitives', 346, 0, ['Valeur']);
  remplir('brands', 420, 0, ['intencial', 'apicil']);
  remplir('theme', 180, theme.length, ['light', 'dark']);
  remplir('layout', 60, 1, ['Valeur']);
  return { ...c.releve(), luA: new Date(2026, 0, 1, 14, 0).getTime() };
}

/** Alert sans jeu de variants ni nom de variant : la vue n'a pas de section Variants. */
const composantSansVariant = { ...alert, sujet: { ...alert.sujet, variant: null, variants: [] } };

module.exports = { composantSansVariant, releveHorsUcm, alertEnJeu, analyseAlert, analyseSansVariants, enButton, analyseButton, IDENTITE };

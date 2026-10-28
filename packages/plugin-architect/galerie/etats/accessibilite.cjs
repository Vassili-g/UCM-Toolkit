/**
 * Les états du contraste et de l'accessibilité dans le panneau des constats : Alert et ses mesures de contraste, Button et ses
 * recommandations, puis les questions d'état de Button. Les constats portent les faits que le kit rend (`controlerLAccessibilite`,
 * `controlerLeMapping`) : le rapport garde ses décimales, le mode est l'étiquette de la mesure (« intencial en Dark »).
 *
 * Un constat de contraste du kit porte un seul variant ; ceux d'ici en regroupent plusieurs, comme la maquette les montre.
 */
const { IDENTITE, enButton, variantsDe, donnerDesIds } = require('../composant/donnees.cjs');
const { preferences, etroite, choisir, composant, apercu } = require('./aide.cjs');
const { alertCorrections, constatsAlert, aucunIgnore, CONTAINER, MESSAGE } = require('./corrections.cjs');
const { constatsDeQuestions } = require('./questions.cjs');

const constat = (id, code, type, famille, faits, variants = [], layers = [], reste = {}) => ({ id, code, type, famille, variants, layers, faits, ...reste });
const message = (variants, constats) => ({ message: { type: 'analyse', analyse: IDENTITE, statut: 'complete', constats, lecture: null, variants } });
const ouvrirLePanneau = (lecture, analyse) => [preferences(), etroite, choisir(lecture), composant(lecture), apercu(lecture), analyse, { message: aucunIgnore }, { clic: '.bouton-panneau' }];
const puceAccessibilite = { clic: '.puce-element[data-element="a11y"]' };
const puceCouleurs = { clic: '.puce-element[data-element="couleurs"]' };
const premiereCarte = { clic: '.bloc-constat .bloc-bouton' };

/* Alert : trois constats de contraste, dont une limite de lecture. */
const nom = (severity, style) => `Severity=${severity}, Variant=${style}`;
const variantsAlert = require('../composant/donnees.cjs').analyseAlert.variants;
const mesure = (usage, champ, calque, rapport, seuil, mode) => ({ usage, champ, calque, rapport, seuil, niveau: 'AA', mode, autresModes: 0 });
/** La paire mesurée et les autres modes : des faits que le kit ne rend pas encore (voir `ui/ignores/modele.ts`). */
const AUTRES_MODES = JSON.stringify([['intencial en Light', 7.1], ['marque-2 en Light', 6.8], ['marque-2 en Dark', 4.6]]);
const contrasteAlert = [
  constat('C49:message', 'C49', 'corriger', 'contraste', { ...mesure('texte', 'fills', 'message', 3.9, 4.5, 'intencial en Dark'), premierPlan: '#C98C5A', fond: '#3C2A1E', rapports: AUTRES_MODES }, [nom('warning', 'standard')], [MESSAGE]),
  constat('C50:stroke', 'C50', 'corriger', 'contraste', mesure('stroke', 'strokes', 'container', 2.4, 3, ''), ['info', 'error', 'success', 'warning'].map((severity) => nom(severity, 'outlined')), [CONTAINER]),
  constat('C49:degrade', 'C49', 'info', 'contraste', { cause: 'degrade', champ: 'fills', usage: 'texte', calque: 'container' }, [nom('error', 'filled')], [], { limite: true }),
];
const constatsDAlert = [
  ...constatsAlert.filter((entree) => entree.correction),
  ...constatsDeQuestions.filter((entree) => entree.question && !entree.correction),
  ...contrasteAlert,
];

/* Button : 216 variants, des recommandations et deux questions d'état. */
const NOMS_BUTTON = variantsDe([
  ['Palette', ['primary', 'secondary', 'neutral', 'info', 'success', 'danger']],
  ['Style', ['contained', 'outlined', 'text']],
  ['State', ['default', 'hover', 'focus', 'disabled']],
  ['Size', ['small', 'medium', 'large']],
]);
const LU_BUTTON = 'Palette=primary, Style=contained, State=hover, Size=medium';
const variantsButton = donnerDesIds(NOMS_BUTTON, LU_BUTTON);
const NOMS_DES_LAYERS = { 0: 'container', 1: 'icon', 3: 'label' };
const lectureButton = enButton();
const button = {
  ...lectureButton,
  sujet: { ...lectureButton.sujet, variant: LU_BUTTON, variants: variantsButton },
  calques: lectureButton.calques.map((calque, rang) => (NOMS_DES_LAYERS[rang] ? { ...calque, nom: NOMS_DES_LAYERS[rang] } : calque)),
};
const CONTAINER_BUTTON = button.calques[0].id;
const LABEL_BUTTON = button.calques[3].id;
const avec = (...paires) => NOMS_BUTTON.filter((variant) => paires.every((paire) => variant.split(', ').includes(paire)));

const accessibiliteButton = [
  constat('C50:anneau', 'C50', 'corriger', 'contraste', mesure('anneau', 'strokes', 'ring', 2.1, 3, ''), avec('Palette=secondary', 'Style=outlined', 'State=focus')),
  constat('C50:sans-anneau', 'C50', 'corriger', 'contraste', { anneauVisible: 0, variantsEnFocus: 3 }, avec('Palette=primary', 'Style=text', 'State=focus'), [CONTAINER_BUTTON]),
  constat('C51:ring', 'C51', 'verifier', 'contraste', { calque: 'ring', strokeWeight: 1, epaisseurRecommandee: 2, espaceRecommande: 2 }, avec('State=focus')),
  constat('C52:20x20', 'C52', 'corriger', 'contraste', { largeur: 20, hauteur: 20, seuil: 24 }, avec('Size=small')),
  constat('C52:120x36', 'C52', 'verifier', 'contraste', { largeur: 120, hauteur: 36, seuil: 44 }, avec('Size=medium')),
  constat('C49:taille', 'C49', 'verifier', 'contraste', { calque: 'label', fontSize: 11, seuil: 12 }, avec('Size=small')),
  constat('C53', 'C53', 'info', 'contraste', { variantsExclus: 54 }, avec('State=disabled')),
];
const INDICE = '46 des 54 variants State=hover emploient un token hover.';
const questionDEtat = (id, layer, champ, actuel, segment, candidat, variants, plage = {}) => constat(id, 'C16', 'corriger', 'liaisons', { axe: 'State', valeur: 'hover', token: actuel, segment, champ, ...plage }, variants, [layer], {
  question: { id: `q:${id}`, candidats: [{ cle: `cle-${id}`, nom: candidat }], indice: INDICE },
});
const questionsButton = [
  questionDEtat('C16:fond', CONTAINER_BUTTON, 'fills', 'button/color/primary/contained/default/background', 'default', 'button/color/primary/contained/hover/background', avec('Palette=primary', 'Style=contained', 'State=hover')),
  questionDEtat('C16:texte', LABEL_BUTTON, 'fills', 'button/color/primary/text/default/foreground', 'default', 'button/color/primary/text/hover/foreground', avec('Palette=primary', 'Style=text', 'State=hover'), { plageDebut: 0, plageFin: 6 }),
];

/*
 * Button dont la taille « medium » s'appelle « default » : State et Size portent la même valeur, et une puce de valeur seule ne dirait plus
 * de quelle property elle vient. Deux constats : une taille, puis un état et une taille.
 */
const NOMS_BUTTON_DEFAUT = NOMS_BUTTON.map((nom) => nom.replace('Size=medium', 'Size=default'));
const LU_BUTTON_DEFAUT = LU_BUTTON.replace('Size=medium', 'Size=default');
const variantsButtonDefaut = donnerDesIds(NOMS_BUTTON_DEFAUT, LU_BUTTON_DEFAUT);
const buttonDefaut = { ...button, sujet: { ...button.sujet, variant: LU_BUTTON_DEFAUT, variants: variantsButtonDefaut } };
const avecDefaut = (...paires) => NOMS_BUTTON_DEFAUT.filter((variant) => paires.every((paire) => variant.split(', ').includes(paire)));
const accessibiliteButtonDefaut = [
  constat('C52:default', 'C52', 'verifier', 'contraste', { largeur: 120, hauteur: 36, seuil: 44 }, avecDefaut('Size=default')),
  constat('C49:default', 'C49', 'verifier', 'contraste', { calque: 'label', fontSize: 11, seuil: 12 }, avecDefaut('State=default', 'Size=default')),
];

const analyseDAlert = message(variantsAlert, constatsDAlert);
const analyseDeButton = message(variantsButton, [...questionsButton, ...accessibiliteButton]);
const analyseDeButtonDefaut = message(variantsButtonDefaut, accessibiliteButtonDefaut);

const ETATS = [
  {
    id: 'x-alert', titre: 'Contraste d’Alert', quand: 'Alert est analysé ; le designer choisit la puce Accessibilité, puis ouvre la première carte du contraste.',
    regarder: 'La section Accessibilité seule, sous sa bande ; aucune phrase ne nomme de variant : la ligne grise donne leur nombre, puis les puces des seules paires qu’ils partagent (le texte de warning et standard, le stroke de 4 variants outlined) ; la première carte ouverte montre la Mesure : le rapport en gras, puis le seuil et le mode ; le stroke dit son rapport au lieu du seuil dans sa ligne grise ; le dégradé est une information qui dit « n’a pas été mesuré » ; une note dit que ces mesures portent sur le dessin.',
    existe: true, atteinte: [...ouvrirLePanneau(alertCorrections, analyseDAlert), puceAccessibilite, premiereCarte],
  },
  {
    id: 'x-button', titre: 'Accessibilité de Button', quand: 'Button est analysé à 216 variants ; le designer choisit la puce Accessibilité.',
    regarder: 'Sept cartes dans la section Accessibilité : l’anneau, la zone cliquable et le texte sous 12 px ; les recommandations disent « Recommandation » ; les 54 variants désactivés sont une information, jamais un manquement, et leur ligne grise dit « 54 variants » suivi de la puce disabled, sans phrase « Tous les variants désactivés ».',
    existe: true, atteinte: [...ouvrirLePanneau(button, analyseDeButton), puceAccessibilite],
  },
  {
    id: 'x-button-corr', titre: 'Questions d’état de Button', quand: 'Button est analysé ; le designer choisit la puce Couleurs.',
    regarder: 'Deux cartes : le fill ou le texte de State=hover lié au token du repos ; la ligne grise donne « 3 variants » et les puces primary, contained et hover, puis dit ce que font les autres variants State=hover ; l’effet met le segment qui part en rouge et celui qui arrive en vert ; un seul bouton bordé.',
    existe: true, atteinte: [...ouvrirLePanneau(button, analyseDeButton), puceCouleurs],
  },
  {
    id: 'u3-valeurs-partagees', titre: 'Valeurs partagées par deux properties', quand: 'Button est analysé avec une taille « default » et un état « default » ; le designer choisit la puce Accessibilité.',
    regarder: 'Deux cartes : la première dit « 72 variants » et une puce qui garde sa property, Size=default, parce que State porte aussi « default » ; la seconde dit « 18 variants » et deux puces qui gardent leur property, State=default et Size=default ; la property est en gris, la valeur en clair ; la bulle d’une puce donne la paire exacte de Figma.',
    existe: true, atteinte: [...ouvrirLePanneau(buttonDefaut, analyseDeButtonDefaut), puceAccessibilite],
  },
].map((etat) => ({ ...etat, disposition: 'etroite' }));

module.exports = { ETATS, analyseDAlert, analyseDeButton, button };

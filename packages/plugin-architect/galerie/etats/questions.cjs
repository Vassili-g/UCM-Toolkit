/**
 * Les états des questions du panneau des constats, et les données d'Alert que `ignores.cjs` reprend : les 9 constats à
 * correction de `corrections.cjs` (4 cartes), deux questions du moteur et les douze constats à faire dans Figma de la maquette.
 *
 * La maquette montre trois questions ; la troisième, « Préparer les tokens du stroke », est celle de la préparation (lot U8), que
 * le kit ne pose pas comme une question de constat. Les constats à faire sont ceux que le kit produit : leurs phrases viennent des
 * faits du constat, comme dans le plugin.
 */
const { IDENTITE } = require('../composant/donnees.cjs');
const { preferences, etroite, choisir, composant, apercu } = require('./aide.cjs');
const { alertCorrections, constatsAlert, aucunIgnore, perime } = require('./corrections.cjs');

const nom = (severity, style) => `Severity=${severity}, Variant=${style}`;
const constat = (id, code, type, famille, faits, variants = [], layers = [], reste = {}) => ({ id, code, type, famille, variants, layers, faits, ...reste });

const corrections = constatsAlert.filter((entree) => entree.correction);
const LAYER_TITLE = 'alert:l:title';

/** Une liaison manquante : le layer title n'a pas de variable, le moteur en propose deux. */
const questionDeTitre = constat('C15:title', 'C15', 'corriger', 'liaisons', { calque: 'title', champ: 'fills' }, [nom('info', 'standard')], [LAYER_TITLE], {
  question: { id: 'q:C15:title', candidats: [{ cle: 'cle-title', nom: 'alert/colors/info/standard/title' }, { cle: 'cle-foreground', nom: 'alert/colors/info/standard/foreground' }] },
});
/** Un nom de valeur : les tokens disent `outline`, quatre variants disent `Outlined`. */
const questionDeNom = constat('C12:outlined', 'C12', 'corriger', 'variants', { jeu: 'Alert', propriete: 'Variant', avant: 'Outlined' },
  ['info', 'error', 'success', 'warning'].map((severity) => nom(severity, 'outlined')), [], { question: { id: 'q:C12:outlined', candidats: [{ nom: 'outline' }] } });

/** Ce que le sandbox rend à `repondre` pour la première question : une liaison exacte, que Corrections reprend. */
const correctionDeTitre = {
  id: 'q:C15:title', sorte: 'liaison', cible: { layer: LAYER_TITLE, champ: 'fills' }, avant: null, apres: { cle: 'cle-title', nom: 'alert/colors/info/standard/title' },
  aRelire: { axes: { Severity: 'info', Variant: 'standard' }, regle: 'Le designer a choisi ce token parmi les candidats du moteur.', avant: null },
};

/** Les douze constats à faire dans Figma de la maquette, dans l'ordre de ses cinq intertitres. */
const aFaire = [
  constat('C44:rangement', 'C44', 'corriger', 'tokens', {
    titre: 'Les tokens d’Alert sont rangés sous `colors`. UCM attend `color`.', action: 'Se règle dans le fichier des tokens, onglet Corrections', elements: '36 tokens',
  }),
  constat('C42:gap', 'C42', 'corriger', 'liaisons', {
    titre: '`alert/size/gap` vise une primitive au lieu de layout.', action: 'Se règle dans le fichier des tokens, onglet À faire dans Figma', calque: 'container',
  }),
  constat('C41:bordure', 'C41', 'bloquant', 'liaisons', {
    titre: 'Une variable liée a disparu de la library.', action: 'Publiez la library, ou liez une autre variable', calque: 'container', elements: 'colors/info/filled/border',
  }),
  constat('C32:filled', 'C32', 'verifier', 'tokens', { token: 'alert/warning/filled', motif: 'sans-variant' }),
  constat('C31:filled', 'C31', 'verifier', 'variants', { Severity: 'warning', Variant: 'filled' }),
  constat('C42:icone', 'C42', 'verifier', 'variants', { titre: 'L’icône de Severity=info, Variant=filled prend une couleur que les 10 autres variants n’emploient pas.', action: 'Vérifiez la couleur dans Figma', calque: 'icon' }, [nom('info', 'filled')]),
  constat('C49:message', 'C49', 'corriger', 'contraste', { usage: 'texte', champ: 'fills', calque: 'message', mode: 'Dark' }, [nom('warning', 'standard')]),
  constat('C50:stroke', 'C50', 'corriger', 'contraste', { usage: 'stroke', champ: 'strokes', calque: 'container' }, ['info', 'error', 'success', 'warning'].map((severity) => nom(severity, 'outlined'))),
  constat('C49:degrade', 'C49', 'info', 'contraste', { cause: 'degrade', champ: 'fills', usage: 'texte', calque: 'container' }, [nom('error', 'filled')], [], { limite: true }),
  constat('C64:message', 'C64', 'verifier', 'typographie', { calque: 'message', motif: 'style-different', styleAttendu: 'Body/Small', styleLu: 'Body/Large' }, [nom('success', 'standard')]),
  constat('C66:icone', 'C66', 'verifier', 'typographie', { calque: 'icon', motif: 'pas-une-instance' }, [nom('info', 'filled')]),
  constat('C35:masque', 'C35', 'verifier', 'visibilite', {
    titre: 'Message de l’exporteur : layer masqué sans propriété, icon-close. Associez une boolean property ou une variable, puis réexportez.', action: 'À faire dans Figma',
  }),
];

/** Un constat que le designer a ignoré : le stroke de error et outlined est plus fin que les autres. */
const ignore = constat('C51:fin', 'C51', 'verifier', 'contraste', { titre: 'Le stroke de Severity=error, Variant=outlined est plus fin que les autres.' });

const constatsDeQuestions = [...corrections, questionDeTitre, questionDeNom, ...aFaire, ignore];
const analyseDeQuestions = { type: 'analyse', analyse: IDENTITE, statut: 'complete', constats: constatsDeQuestions, lecture: null, variants: require('../composant/donnees.cjs').analyseAlert.variants };
const ignoresDeQuestions = { type: 'ignores', analyse: IDENTITE, constats: [ignore.id] };

const ouvrirLePanneau = [preferences(), etroite, choisir(alertCorrections), composant(alertCorrections), apercu(alertCorrections), { message: analyseDeQuestions }, { message: ignoresDeQuestions }, { clic: '.bouton-panneau' }];
const puceCouleurs = { clic: '.puce-element[data-element="couleurs"]' };
const repondue = { message: { type: 'question-repondue', analyse: IDENTITE, question: 'q:C15:title', correction: correctionDeTitre } };

const ETATS = [
  {
    id: 'c-questions', titre: 'Questions du composant', quand: 'Alert est analysé ; le designer choisit la puce Couleurs.',
    regarder: 'Une carte par question : le layer title en olive, le chemin proposé en gris, le segment nouveau en vert ; un seul bouton bordé, les autres candidats en liens, Plus tard à droite ; rien n’est choisi avant le clic.',
    existe: true, atteinte: [...ouvrirLePanneau, puceCouleurs],
  },
  {
    id: 'c-tranchee', titre: 'Question répondue', quand: 'Le designer lie title au token proposé ; le sandbox rend la correction exacte.',
    regarder: 'La carte devient une ligne verte « title sera lié à colors/info/standard/title. » avec Ouvrir Corrections et Annuler la réponse ; la question suivante reste à trancher ; Corrections gagne une carte.',
    existe: true, atteinte: [...ouvrirLePanneau, puceCouleurs, { clic: '.question .btn-secondary' }, repondue],
  },
  {
    id: 'q-annulee', titre: 'Réponse annulée', quand: 'Le designer annule sa réponse ; le sandbox retire la correction.',
    regarder: 'La carte de la question revient avec ses boutons ; Corrections perd la carte que la réponse avait tirée.',
    existe: true, atteinte: [...ouvrirLePanneau, puceCouleurs, { clic: '.question .btn-secondary' }, repondue, { clic: '.constat-actions .btn-texte:last-child' }, { message: { type: 'question-repondue', analyse: IDENTITE, question: 'q:C15:title', correction: null } }],
  },
  {
    id: 'q-perimee', titre: 'Questions d’une analyse périmée', quand: 'Le designer change la sélection dans Figma : l’analyse est périmée.',
    regarder: 'L’alerte « Le composant a changé depuis l’analyse » ; les questions ne se répondent plus : « Les constats datent d’avant le changement. » prend la place des cartes.',
    existe: true, atteinte: [...ouvrirLePanneau, puceCouleurs, perime('selection')],
  },
].map((etat) => ({ ...etat, disposition: 'etroite' }));

module.exports = { ETATS, constatsDeQuestions, analyseDeQuestions, ignoresDeQuestions, ouvrirLePanneau, ignore, aucunIgnore };

/** Les états des constats À faire dans Figma du panneau des constats : la liste de la maquette, ses constats ignorés, et les deux gestes qui les déplacent. Les données viennent de `questions.cjs`. */
const { IDENTITE } = require('../composant/donnees.cjs');
const { ignore, ouvrirLePanneau, constatsDeQuestions, analyseDeQuestions } = require('./questions.cjs');
const { perime, alertCorrections, CONTAINER } = require('./corrections.cjs');

const tout = { clic: '.puce-element[data-element="tout"]' };
const premiereCarte = { clic: '.bloc-constat .bloc-bouton' };
const ignores = (constats) => ({ message: { type: 'ignores', analyse: IDENTITE, constats } });
const rangement = constatsDeQuestions.find((constat) => constat.id === 'C44:rangement');
/** Le Bloquant « variable disparue » vise le layer container : sa carte porte un bouton Sélectionner. */
const analyseAvecLayers = { ...analyseDeQuestions, constats: constatsDeQuestions.map((constat) => (constat.id === 'C41:bordure' ? { ...constat, layers: [CONTAINER] } : constat)) };
const panneauAvecLayers = [...ouvrirLePanneau.slice(0, 5), { message: analyseAvecLayers }, ...ouvrirLePanneau.slice(6), tout];
const selectionner = { clic: '.en-tete-bloquants .bouton-selectionner' };

const regle = (id, code, faits, ajouter) => ({
  id, code, type: 'corriger', famille: 'regles', variants: [], layers: [], faits,
  correction: { id: `cor:${id}`, sorte: 'regles', cible: { layer: 'jeu-Alert' }, avant: null,
    apres: { nom: ajouter ? 'ajouter' : 'Alert' }, aRelire: { regle: 'Les propriétés du composant ont chacune leur règle.', avant: null } },
});
const constatsDeRegles = [
  regle('C43:instance', 'C43', { composant: 'Alert', regles: 1, proprietes: 'Size' }, false),
  regle('C45:propriete', 'C45', { composant: 'Alert', propriete: 'Dismissible', ecart: 'sans-regle', regles: 1 }, true),
  regle('C45:valeur', 'C45', { composant: 'Alert', propriete: 'Size', valeurs: 'Small, Large', ecart: 'sans-valeur', regles: 2 }, true),
];
const etatsDeRegles = constatsDeRegles.flatMap((constat, rang) => {
  const base = [...ouvrirLePanneau.slice(0, 5), { message: { ...analyseDeQuestions, constats: [constat, rangement] } }, ignores([]), { clic: '.bouton-panneau' }, tout];
  const ecarter = [...base, { clic: '.constat-actions [data-action="ignorer"]' }, ignores([constat.id])];
  return [
    { id: `i-regles-${rang + 1}`, titre: `Règles, ${constat.code} ${constat.faits.ecart ?? 'instance absente'}`, quand: 'La carte de correction des règles est ouverte.',
      regarder: 'Les actions Ignorer et Ne plus proposer figurent sous la correction décochée.', existe: true, atteinte: base },
    { id: `i-regles-${rang + 1}-ignore`, titre: 'Règles ignorées', quand: 'Le designer clique Ignorer sur la carte de règles.',
      regarder: 'Le constat rejoint les Ignorés et porte Ne plus ignorer.', existe: true, atteinte: ecarter },
    { id: `i-regles-${rang + 1}-rendu`, titre: 'Règles rendues', quand: 'Le designer clique Ne plus ignorer sur la carte de règles ignorée.',
      regarder: 'La correction revient décochée dans Règles ; le constat quitte les Ignorés.', existe: true,
      atteinte: [...ecarter, { clic: '.muette .btn-texte' }, ignores([])] },
  ];
});

const ETATS = [
  ...etatsDeRegles,
  {
    id: 'c-afaire', titre: 'À faire dans Figma', quand: 'Alert est analysé ; le panneau montre Tout. Un constat est déjà ignoré.',
    regarder: 'Les constats à faire en fin de leur section ; sur chaque carte un liseré, une icône et un mot de la couleur du type (octogone rouge, triangle orange, cercle jaune) ; la phrase, le lieu, où régler ; en bas la section Ignorés et une carte muette.',
    existe: true, atteinte: [...ouvrirLePanneau, tout],
  },
  {
    id: 'i-ouvert', titre: 'Un constat à faire ouvert', quand: 'Le designer ouvre la première carte.',
    regarder: 'La carte déplie son bouton Ignorer ; ouvrir une carte ne change jamais la sélection de Figma.',
    existe: true, atteinte: [...ouvrirLePanneau, tout, premiereCarte],
  },
  {
    id: 'u4-selectionner', titre: 'Un constat qui vise un layer', quand: 'Le Bloquant « variable disparue » vise le layer container ; le panneau montre Tout.',
    regarder: 'Le chevron reste en haut à droite de la carte, sur la ligne de la sévérité ; sous le texte, une ligne d’actions porte le bouton Sélectionner, avec le signe de la sélection de Figma ; les cartes sans layer n’ont pas cette ligne.',
    existe: true, atteinte: panneauAvecLayers,
  },
  {
    id: 'u4-selectionnes', titre: 'Layers sélectionnés', quand: 'Le designer clique Sélectionner ; le plugin sélectionne le layer container dans Figma.',
    regarder: 'Le bouton dit Sélectionnés et se grise ; la carte reste fermée.',
    existe: true, atteinte: [...panneauAvecLayers, selectionner],
  },
  {
    id: 'u4-reactive', titre: 'Sélection changée dans Figma', quand: 'Le designer choisit un autre layer dans Figma : le sandbox envoie la nouvelle sélection.',
    regarder: 'Le bouton redit Sélectionner et redevient actif.',
    existe: true, atteinte: [...panneauAvecLayers, selectionner, { message: { type: 'selection', sujet: { id: alertCorrections.sujet.id, portee: alertCorrections.sujet.id }, ignores: 0, origine: 'figma' } }],
  },
  {
    id: 'i-ignore', titre: 'Un constat ignoré', quand: 'Le designer clique Ignorer ; le sandbox rend la liste des constats ignorés.',
    regarder: 'Le constat quitte sa section et rejoint Ignorés, en carte muette ; la puce de son élément compte un point de moins.',
    existe: true, atteinte: [...ouvrirLePanneau, tout, premiereCarte, { clic: '.constat-actions .btn-texte' }, ignores([ignore.id, rangement.id])],
  },
  {
    id: 'i-rendu', titre: 'Un constat rendu', quand: 'Le designer clique Ne plus ignorer ; le sandbox rend la liste vidée.',
    regarder: 'Le constat revient dans sa section ; la section Ignorés disparaît ; la puce de son élément compte un point de plus.',
    existe: true, atteinte: [...ouvrirLePanneau, tout, { clic: '.muette .btn-texte' }, ignores([])],
  },
  {
    id: 'i-perimee', titre: 'À faire d’une analyse périmée', quand: 'Le designer change la sélection dans Figma : l’analyse est périmée.',
    regarder: 'L’alerte « Le composant a changé depuis l’analyse » ; les cartes restent, Ignorer et Ne plus ignorer sont inactifs.',
    existe: true, atteinte: [...ouvrirLePanneau, tout, perime('selection')],
  },
].map((etat) => ({ ...etat, disposition: 'etroite' }));

module.exports = { ETATS, constatsDeRegles };

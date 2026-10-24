/** Les états des constats À faire dans Figma du panneau des constats : la liste de la maquette, ses constats ignorés, et les deux gestes qui les déplacent. Les données viennent de `questions.cjs`. */
const { IDENTITE } = require('../composant/donnees.cjs');
const { ignore, ouvrirLePanneau, constatsDeQuestions } = require('./questions.cjs');
const { perime } = require('./corrections.cjs');

const tout = { clic: '.puce-element[data-element="tout"]' };
const premiereCarte = { clic: '.bloc-constat .bloc-bouton' };
const ignores = (constats) => ({ message: { type: 'ignores', analyse: IDENTITE, constats } });
const rangement = constatsDeQuestions.find((constat) => constat.id === 'C44:rangement');

const ETATS = [
  {
    id: 'c-afaire', titre: 'À faire dans Figma', quand: 'Alert est analysé ; le panneau montre Tout. Un constat est déjà ignoré.',
    regarder: 'Les constats à faire en fin de leur section ; sur chaque carte un liseré, une icône et un mot de la couleur du type (octogone rouge, triangle orange, cercle jaune) ; la phrase, le lieu, où régler ; en bas la section Ignorés et une carte muette.',
    existe: true, atteinte: [...ouvrirLePanneau, tout],
  },
  {
    id: 'i-ouvert', titre: 'Un constat à faire ouvert', quand: 'Le designer ouvre la première carte.',
    regarder: 'La carte déplie son bouton Ignorer ; la sélection de Figma ne change pas quand le constat n’a aucun layer.',
    existe: true, atteinte: [...ouvrirLePanneau, tout, premiereCarte],
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
    regarder: 'L’alerte « Le composant a changé depuis l’analyse » ; Ignorer et Ne plus ignorer ne se proposent plus.',
    existe: true, atteinte: [...ouvrirLePanneau, tout, perime('selection')],
  },
].map((etat) => ({ ...etat, disposition: 'etroite' }));

module.exports = { ETATS };

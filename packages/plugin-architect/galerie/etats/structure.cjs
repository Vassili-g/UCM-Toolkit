/**
 * Les états du domaine `structure` : « À faire dans Figma » et les corrections de modes et de scopes, dans le mode Tokens. Le sandbox du
 * domaine n'existe pas encore : l'état joue le message `structure` qu'il rendra, sous la demande 1 de ce domaine, que l'interface numérote à part.
 */
const { releveDeStructure, bilanDeStructure, structure } = require('../structure/donnees.cjs');
const { messages } = require('../nomenclature/donnees.cjs');
const { preferences, releve, groupe, chevron } = require('./aide.cjs');

/** L'explorateur sur `theme/primary`, le bilan de Nomenclature et la réponse du sandbox sur la structure. */
const ouvert = () => [
  preferences(), releve(releveDeStructure()), chevron('primitives'), chevron('theme'), groupe('theme', 'primary'),
  { message: messages.initial(true) }, { message: messages.bilan(1, bilanDeStructure), attendre: '.liste' },
  { message: structure(1), attendre: '.structure-liste .bloc' },
];

const ETATS = [
  {
    id: 't-structure', titre: 'Tokens, À faire dans Figma', quand: 'Le designer ouvre À faire dans Figma, sur le groupe primary du thème ; le premier constat est déplié.',
    regarder: 'Six constats sous Alias, Modes, Valeurs et Couches ; chacun a son liseré, son icône et son mot ; les chemins sont cités dans les phrases, sur fond gris ; « vise » reste du texte ; « Ouvrir la fiche » est dans le constat déplié ; la pastille de l’onglet dit 6.',
    existe: true,
    atteinte: [...ouvert(), { clic: '#onglet-a-faire' }, { clic: '[role="tabpanel"]:not([hidden]) .bloc-bouton' }],
  },
  {
    id: 't-portees', titre: 'Corrections, modes et scopes', quand: 'Les corrections de la structure suivent les renommages dans Corrections, sans filtre de collection ; les deux cartes sont dépliées.',
    regarder: 'Sous Modes, « Viser la rampe Dark » avec brands/success/light/600 devenant dark ; sous Scopes, trois variables de surface qui passent de Show in all à Frame fill et Shape fill, en deux colonnes ; le pied dit « Appliquer écrit 4 corrections de modes et de scopes. ».',
    existe: true,
    atteinte: [...ouvert(), { clic: '.puce-x' }, { clic: '#panneau-a-appliquer .structure-liste .bloc-bouton' }, { clic: '#panneau-a-appliquer .structure-liste .bloc + .intertitre-structure + .bloc .bloc-bouton' }],
  },
];

module.exports = { ETATS };

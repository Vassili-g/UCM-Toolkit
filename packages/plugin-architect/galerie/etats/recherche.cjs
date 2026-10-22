/** Les états de la recherche dans l'arbre. */
const { preferences, libre } = require('./aide.cjs');

const ETATS = [
  { id: 'recherche-globale', titre: 'Recherche dans toutes les collections', quand: 'Le designer cherche « surface ».', regarder: 'La portée globale est annoncée ; chaque ligne nomme sa collection.', existe: true, atteinte: [preferences(), libre, { saisie: { dans: '.recherche', valeur: 'surface' } }] },
  { id: 'recherche-vide', titre: 'Recherche sans résultat', quand: 'Aucune variable ne correspond.', regarder: 'Le message propose de vider la recherche.', existe: true, atteinte: [preferences(), libre, { saisie: { dans: '.recherche', valeur: 'introuvable-xyz' } }] },
];

module.exports = { ETATS };

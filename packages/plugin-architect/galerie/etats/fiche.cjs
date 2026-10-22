/**
 * Les états de la fiche d'une variable. L'inspecteur a cédé sa place à
 * Nomenclature dans le panneau latéral (décision M-3) : la fiche et les états
 * qui la montrent viennent au lot U2. Ces états gardent leur place et leur
 * situation ; chacun redevient atteignable avec la fiche.
 */
const ETATS = [
  { id: 'chaine-cinq-collections', titre: 'Chaîne à travers cinq collections', quand: 'Le fond du bouton est inspecté, thème par défaut Dark.', regarder: null, existe: false, attendu: 'Lot U2' },
  { id: 'chaine-longue', titre: 'Chaîne longue', quand: 'Trente alias successifs.', regarder: null, existe: false, attendu: 'Lot U2' },
  { id: 'cycle', titre: 'Cycle', quand: 'essai/a et essai/b se visent.', regarder: null, existe: false, attendu: 'Lot U2' },
  { id: 'cible-distante', titre: 'Cible distante inaccessible', quand: 'legacy/border vise une variable non lue.', regarder: null, existe: false, attendu: 'Lot U2' },
];

module.exports = { ETATS };

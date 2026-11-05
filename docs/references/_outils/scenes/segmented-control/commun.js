// Données communes aux scènes du segmented control.
const LIBELLES = ['Jour', 'Semaine', 'Mois'];
const LONG = ['Jour', 'Toutes les opérations de la semaine', 'Mois'];
const ICONES = [['liste', 'Liste'], ['grille', 'Grille'], ['tableau', 'Tableau']];

// Pictogrammes pour les systèmes qui n'imposent pas leur jeu d'icônes.
const TRACES = {
  liste: 'M5 3h9v1.5H5zM5 7.25h9v1.5H5zM5 11.5h9V13H5zM2 3h1.5v1.5H2zM2 7.25h1.5v1.5H2zM2 11.5h1.5V13H2z',
  grille: 'M2 2h5v5H2zm7 0h5v5H9zM2 9h5v5H2zm7 0h5v5H9z',
  tableau: 'M2 2h12v12H2zm1.5 1.5v2.75h9V3.5zm0 4.25v2.5h4v-2.5zm5.5 0v2.5h3.5v-2.5zm-5.5 4v.75h4v-.75zm5.5 0v.75h3.5v-.75z',
};
const libellesDe = (cas) => (cas === 'long' ? LONG : LIBELLES);
const premierDe = (cas) => (cas === 'icones' ? 'liste' : libellesDe(cas)[0]);

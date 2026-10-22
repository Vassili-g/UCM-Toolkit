/**
 * L'inventaire des états de l'interface d'Architect, réuni depuis
 * `galerie/etats/<domaine>.cjs`. Chaque état atteignable déclare la suite
 * exacte de messages et de gestes qui le produit, jouée dans l'interface
 * compilée. Ajouter un domaine ajoute une ligne à `DOMAINES`.
 *
 * Un état qui porte `disposition: 'etroite'` va dans la galerie de la fenêtre
 * du mode Composant ; les autres vont dans celles du mode Tokens.
 */
const DOMAINES = ['commun', 'arbre', 'recherche', 'fiche', 'nomenclature', 'composant'];

const ETATS = DOMAINES.flatMap((domaine) => require(`./etats/${domaine}.cjs`).ETATS.map((etat) => ({ ...etat, domaine })));

module.exports = { ETATS, DOMAINES };

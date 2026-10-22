/**
 * Assemble l'interface d'Architect en un HTML autonome, par le build du
 * socle. `roles.css` précède la feuille du socle : elle déclare les couleurs
 * sombres que `styles/commun.css` impose ensuite aux rôles, quel que soit le
 * thème de Figma. Les feuilles de chaque domaine suivent, dans l'ordre de la
 * cascade ; ajouter un domaine ajoute une ligne à `FEUILLES_DES_DOMAINES`.
 */
const path = require('path');
const { construireUi } = require('ucm-plugin-socle/build/inline-ui.cjs');

const FEUILLES_DES_DOMAINES = ['commun', 'arbre', 'fiche', 'vues', 'composant', 'nomenclature'];

construireUi({
  srcDir: path.resolve(__dirname, '../src/ui'),
  distDir: path.resolve(__dirname, '../dist'),
  feuilles: ['roles.css', require.resolve('ucm-plugin-socle/socle.css'), ...FEUILLES_DES_DOMAINES.map((domaine) => `styles/${domaine}.css`)],
});

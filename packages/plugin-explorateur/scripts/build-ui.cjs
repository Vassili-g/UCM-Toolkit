/**
 * Assemble l'interface de l'explorateur en un HTML autonome, par le build du
 * socle. `roles.css` précède la feuille du socle : elle déclare les couleurs
 * sombres que `styles.css` impose ensuite aux rôles, quel que soit le thème
 * de Figma.
 */
const path = require('path');
const { construireUi } = require('ucm-plugin-socle/build/inline-ui.cjs');

construireUi({
  srcDir: path.resolve(__dirname, '../src/ui'),
  distDir: path.resolve(__dirname, '../dist'),
  feuilles: ['roles.css', require.resolve('ucm-plugin-socle/socle.css'), 'styles.css'],
});

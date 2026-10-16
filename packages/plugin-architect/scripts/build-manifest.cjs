/** Le manifest distribué utilise les chemins attendus par Figma. */
const path = require('path');
const { construireManifest } = require('ucm-plugin-socle/build/manifest.cjs');
construireManifest(path.resolve(__dirname, '..'));

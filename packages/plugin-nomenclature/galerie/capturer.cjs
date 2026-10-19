/** Les captures emploient le pilote de galerie partagé. */
const { capturerGalerie } = require('ucm-plugin-socle/galerie/capturer.cjs');
const { GALERIES } = require('./build-galerie.cjs');
if (require.main === module) for (const galerie of GALERIES) capturerGalerie(galerie, process.argv.slice(2));

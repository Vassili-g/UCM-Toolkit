/** Lance les tests `*.test.ts` de l'explorateur, par le découvreur du socle. */
const path = require('path');
const { lancerLesTests } = require('ucm-plugin-socle/build/run-tests.cjs');

lancerLesTests({ racine: path.resolve(__dirname, '..'), extensions: ['.test.ts'], nom: 'UCM Token Explorer' });

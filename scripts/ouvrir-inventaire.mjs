/**
 * `npm run inventaire` : génère la page d'inventaire depuis les sources, l'écrit dans
 * le dossier temporaire du système et l'ouvre dans le navigateur par défaut, avec la
 * commande de la plateforme (`start`, `open` ou `xdg-open`). Le fichier commité
 * `INVENTAIRE-UCM.html` ne change pas : `npm run vues` le régénère.
 *
 * Le générateur est en TypeScript ; l'import de `tsx` le rend chargeable, comme dans `vues.mjs`.
 */
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import 'tsx';

const racine = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Écrit la page générée à `chemin`. */
export async function ecrireLaPage(chemin) {
  const generateur = await import(pathToFileURL(join(racine, 'docs/inventaire/generer-inventaire.ts')).href);
  const { page } = await generateur.genererInventaireEtCouverture();
  writeFileSync(chemin, page);
}

function ouvrir(page) {
  const [commande, args] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', page]]
    : process.platform === 'darwin' ? ['open', [page]]
    : ['xdg-open', [page]];
  const enfant = spawn(commande, args, { stdio: 'ignore', detached: true, windowsVerbatimArguments: true });
  enfant.on('error', (erreur) => {
    console.error(`Ouverture impossible : ${erreur.message}`);
    process.exit(1);
  });
  enfant.unref();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const page = join(tmpdir(), 'INVENTAIRE-UCM.html');
  await ecrireLaPage(page);
  console.log(`Écrit : ${page}`);
  ouvrir(page);
}

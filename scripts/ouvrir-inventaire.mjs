/**
 * `npm run inventaire` : ouvre `INVENTAIRE-UCM.html`, à la racine du dépôt, dans le
 * navigateur par défaut, avec la commande de la plateforme (`start`, `open` ou
 * `xdg-open`). La page est commitée ; `npm run vues` la régénère.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const page = join(dirname(fileURLToPath(import.meta.url)), '..', 'INVENTAIRE-UCM.html');
if (!existsSync(page)) {
  console.error(`Page introuvable : ${page}. Lancer npm run vues.`);
  process.exit(1);
}

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

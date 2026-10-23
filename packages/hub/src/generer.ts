/**
 * Génère `HUB-UCM.html` : la page embarque le moteur et le référentiel du kit,
 * compilés par esbuild, et rejoue les rampes à chaque réglage. Elle ne charge
 * aucune ressource et s'ouvre par un double clic. Le kit se lit compilé
 * (`packages/kit/dist`) : `npm run vues` le reconstruit d'abord.
 * `genererHub` est pure ; seul le lancement direct du script écrit le fichier.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { buildSync } from 'esbuild';

const dossier = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Le script de la page, compilé sans carte de source ni horodatage : mêmes sources, mêmes octets. */
function scriptDuHub(): string {
  const resultat = buildSync({
    entryPoints: [path.join(dossier, 'src', 'vues', 'page.ts')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    minify: true,
    legalComments: 'none',
    charset: 'utf8',
    logLevel: 'silent',
  });
  // `</script` dans une chaîne fermerait la balise de la page.
  return resultat.outputFiles[0].text.trim().replace(/<\/script/gi, '<\\/script');
}

export function genererHub(): string {
  const css = readFileSync(path.join(dossier, 'src', 'vues', 'page.css'), 'utf8').trim();
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hub UCM</title>
<style>
${css}
</style>
</head>
<body>
<header id="commandes"></header>
<div class="disposition">
<aside id="reglages"></aside>
<main id="contenu"><p class="note">Calcul des rampes…</p></main>
</div>
<script>
${scriptDuHub()}
</script>
</body>
</html>
`;
}

/** Le chemin du fichier commité, lu par le test. */
export const CHEMIN_DU_HUB = path.join(dossier, 'HUB-UCM.html');

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(CHEMIN_DU_HUB, genererHub());
  console.log(`Hub écrit : ${CHEMIN_DU_HUB}`);
}

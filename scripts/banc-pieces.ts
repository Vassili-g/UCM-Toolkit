/**
 * Le grand tirage du banc des pièces, hors de `npm test`.
 *
 *   npm run banc:pieces                              (graine 1729, 5 200 tirages)
 *   npm run banc:pieces -- --graine 7 --nombre 300
 *
 * Écrit `rapport.txt` et `rapport.json` dans `_local/banc-pieces/`, avec les composants réduits de chaque écart, et sort en erreur au
 * moindre écart non couvert. Les tirages qui contiennent une pièce interne sont comptés « attendu en 15.0 », sans être jugés.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { lancerLeBanc, resumerLeBanc, type ResultatDuBanc } from '../packages/plugin-exporter/tests/aides/banc';

export const GRAINE_DU_BANC = 1729;
export const NOMBRE_DU_BANC = 5200;

const argument = (argv: string[], nom: string): string | undefined => {
  const rang = argv.indexOf(nom);
  return rang >= 0 ? argv[rang + 1] : undefined;
};

/** Lance le banc, écrit le rapport dans `dossier` et rend le résultat. */
export async function executerLeBanc(argv: string[], dossier: string): Promise<{ resultat: ResultatDuBanc; texte: string }> {
  const graine = Number(argument(argv, '--graine') ?? GRAINE_DU_BANC);
  const nombre = Number(argument(argv, '--nombre') ?? NOMBRE_DU_BANC);
  const resultat = await lancerLeBanc({ graine, nombre });
  mkdirSync(dossier, { recursive: true });
  const texte = `${resumerLeBanc(resultat).join('\n')}\n`;
  writeFileSync(path.join(dossier, 'rapport.txt'), texte);
  writeFileSync(path.join(dossier, 'rapport.json'), `${JSON.stringify(resultat, null, 2)}\n`);
  return { resultat, texte };
}

if (require.main === module) {
  const dossier = path.resolve(__dirname, '../_local/banc-pieces');
  executerLeBanc(process.argv.slice(2), dossier).then(({ resultat, texte }) => {
    process.stdout.write(`${texte}(rapport : ${path.join(dossier, 'rapport.txt')})\n`);
    if (resultat.enEcart.length) process.exitCode = 1;
  }, (erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  });
}

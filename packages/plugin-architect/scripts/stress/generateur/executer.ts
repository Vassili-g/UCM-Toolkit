/**
 * Le grand tirage du générateur de composants, hors de `npm test`.
 *
 *   npm run stress:composant -- --graine 1729 --nombre 500
 *   npm run stress:composant -- --generateur                     (graine 1729, 500 cas)
 *   npm run stress:composant -- --generateur --sans-reduction    (sans réduire les écarts)
 *   npm run stress:composant -- --graine 7 --nombre 500 --ecarts-connus   (rétablit les constructions que le tirage évite, voir `reglages`)
 *   npm run stress:composant -- --rejouer _local/stress/generateur/reduits/G1.json
 *
 * Écrit dans `_local/stress/generateur/`, hors de git : `rapport.json` (comptes par famille d'attentes, couverture, écarts, cas),
 * `rapport.txt` (le résumé), `reduits/G<n>.json` (chaque écart au plus petit composant qui le reproduit) et `refus/` (les documents
 * que le garde de l'oracle a refusés : un refus est un défaut du banc). `--rejouer` relance l'analyse d'un cas ou d'un composant
 * réduit et compare à son oracle.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { analyserDocument } from '../../../tests/generateur/analyserDocument';
import { comparerConstats, verifierDocument } from '../../../../plugin-socle/tests/generateur/oracle';
import { reglages } from '../../../../plugin-socle/tests/generateur/generateur';
import { FAMILLES, decrireLesEcarts, tirer, type ResultatDuTirage } from '../../../../plugin-socle/tests/generateur/tirage';

export const GRAINE_DU_GENERATEUR = 1729;
export const NOMBRE_DU_GENERATEUR = 500;
export const DOSSIER_DU_GENERATEUR = path.resolve(__dirname, '../../../../../_local/stress/generateur');

const argument = (nom: string): string | undefined => {
  const rang = process.argv.indexOf(nom);
  return rang >= 0 ? process.argv[rang + 1] : undefined;
};

/** Vrai quand la ligne de commande demande le générateur : il remplace alors la chaîne et les opérateurs de F3. */
export const veutLeGenerateur = (): boolean => ['--generateur', '--graine', '--nombre', '--rejouer', '--ecarts-connus'].some((nom) => process.argv.includes(nom));

function resume(resultat: ResultatDuTirage): string {
  const lignes = [`Générateur de composants : graine ${resultat.graine}, ${resultat.nombre} cas, ${(resultat.dureeMs / 1000).toFixed(1)} s.`];
  lignes.push('', 'Famille d’attentes   tirages  écarts  refus du garde  conformes');
  for (const famille of FAMILLES) {
    const c = resultat.familles[famille];
    lignes.push(`${famille.padEnd(20)} ${String(c.tirages).padStart(7)} ${String(c.ecarts).padStart(7)} ${String(c.refusOracle).padStart(15)} ${String(c.conformes).padStart(10)}`);
  }
  lignes.push('', `Écarts distincts : ${resultat.ecarts.length}. Documents refusés par le garde : ${resultat.refus.length}.`);
  const statuts = Object.entries(resultat.couverture.statuts).map(([s, n]) => `${s} ${n}`).join(', ');
  lignes.push(`Statuts de l’analyse : ${statuts}.`);
  for (const cle of ['anatomies', 'constructions', 'dialectes', 'operations', 'attentes'] as const) {
    lignes.push(`Couverture, ${cle} : ${Object.entries(resultat.couverture[cle]).sort(([a], [b]) => a.localeCompare(b)).map(([nom, n]) => `${nom} ${n}`).join(', ')}.`);
  }
  if (resultat.ecarts.length || resultat.refus.length) lignes.push('', ...decrireLesEcarts(resultat));
  return `${lignes.join('\n')}\n`;
}

async function rejouer(fichier: string): Promise<void> {
  const entree = JSON.parse(readFileSync(fichier, 'utf8'));
  const doc = entree.document ?? entree;
  const refus = verifierDocument(doc);
  if (refus.length) {
    process.stdout.write(`${JSON.stringify({ refusDuGarde: refus }, null, 2)}\n`);
    process.exitCode = 2;
    return;
  }
  const analyse = await analyserDocument(doc);
  process.stdout.write(`${JSON.stringify({ fichier, graine: doc.graine, statut: analyse.statut, dureeMs: Math.round(analyse.dureeMs), constats: analyse.constats, comparaison: comparerConstats(doc, analyse.constats) }, null, 2)}\n`);
}

export async function lancerLeGenerateur(): Promise<void> {
  const aRejouer = argument('--rejouer');
  if (aRejouer) return rejouer(aRejouer);
  const graine = Number(argument('--graine') ?? GRAINE_DU_GENERATEUR);
  const nombre = Number(argument('--nombre') ?? NOMBRE_DU_GENERATEUR);
  const reduire = !process.argv.includes('--sans-reduction');
  reglages.ecartsConnus = process.argv.includes('--ecarts-connus');
  const resultat = await tirer({ graine, nombre, reduire, analyser: analyserDocument });
  mkdirSync(path.join(DOSSIER_DU_GENERATEUR, 'reduits'), { recursive: true });
  mkdirSync(path.join(DOSSIER_DU_GENERATEUR, 'refus'), { recursive: true });
  for (const ecart of resultat.ecarts) {
    if (ecart.reduit) writeFileSync(path.join(DOSSIER_DU_GENERATEUR, 'reduits', `${ecart.id}.json`), `${JSON.stringify({ ecart: { ...ecart, reduit: undefined }, document: ecart.reduit.document }, null, 2)}\n`);
  }
  for (const refus of resultat.refus) writeFileSync(path.join(DOSSIER_DU_GENERATEUR, 'refus', `${refus.cas}.json`), `${JSON.stringify(refus, null, 2)}\n`);
  const sansDocuments = { ...resultat, ecarts: resultat.ecarts.map((e) => ({ ...e, reduit: e.reduit ? { avant: e.reduit.avant, apres: e.reduit.apres } : undefined })) };
  writeFileSync(path.join(DOSSIER_DU_GENERATEUR, 'rapport.json'), `${JSON.stringify(sansDocuments, null, 2)}\n`);
  const texte = resume(resultat);
  writeFileSync(path.join(DOSSIER_DU_GENERATEUR, 'rapport.txt'), texte);
  process.stdout.write(`${texte}(rapport : ${path.join(DOSSIER_DU_GENERATEUR, 'rapport.txt')})\n`);
}

if (require.main === module) {
  lancerLeGenerateur().catch((erreur) => {
    console.error(erreur);
    process.exitCode = 1;
  });
}

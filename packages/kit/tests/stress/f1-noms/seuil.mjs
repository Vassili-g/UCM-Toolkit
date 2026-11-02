/**
 * Chargeur de la mesure du seuil de découpage (plan F1, 4.3) : `node --import tsx --import packages/kit/tests/stress/f1-noms/seuil.mjs <script>`
 * avec `STRESS_F1_SEUIL=<L>`. Il réécrit en mémoire la constante `LONGUEUR_MINIMALE_D_UNE_FAUTE` de
 * `packages/kit/src/referentiel/termes-connus.ts`, sans toucher au fichier. Il sort en erreur si la ligne de la constante n'a plus la forme
 * `const LONGUEUR_MINIMALE_D_UNE_FAUTE = <entier>;` : le seuil mesuré ne serait alors plus celui du kit. Sans `STRESS_F1_SEUIL`, il ne
 * s'enregistre pas. À importer après `tsx`, dont il lit le code déjà transpilé.
 */
import { registerHooks } from 'node:module';

export const FICHIER_DU_SEUIL = '/packages/kit/src/referentiel/termes-connus.ts';
// tsx livre le fichier transpilé et réduit sur une ligne, sans espaces autour du « = » : la forme tolère les deux écritures
const FORME = /(const LONGUEUR_MINIMALE_D_UNE_FAUTE\s*=\s*)(\d+)(\s*;)/;

/** La source avec la constante à `longueur` ; lève une erreur quand la ligne de la constante a changé de forme. */
export function reecrireLaConstante(source, longueur) {
  if (!FORME.test(source)) {
    throw new Error('Le chargeur de seuil ne retrouve plus « const LONGUEUR_MINIMALE_D_UNE_FAUTE = <entier>; » dans ' + FICHIER_DU_SEUIL + ' : la constante a changé de forme, mettre à jour seuil.mjs.');
  }
  return source.replace(FORME, (_ligne, avant, _ancienne, apres) => avant + String(longueur) + apres);
}

const demande = process.env.STRESS_F1_SEUIL;
if (demande !== undefined) {
  const longueur = Number(demande);
  if (!Number.isInteger(longueur) || longueur < 1) {
    console.error('STRESS_F1_SEUIL vaut « ' + demande + ' » : un entier positif est attendu.');
    process.exit(1);
  }
  registerHooks({
    load(url, contexte, suivant) {
      const resultat = suivant(url, contexte);
      if (!url.endsWith(FICHIER_DU_SEUIL)) return resultat;
      try {
        const source = typeof resultat.source === 'string' ? resultat.source : Buffer.from(resultat.source ?? '').toString('utf8');
        return { ...resultat, source: reecrireLaConstante(source, longueur) };
      } catch (erreur) {
        console.error(erreur instanceof Error ? erreur.message : String(erreur));
        process.exit(1);
      }
    },
  });
}

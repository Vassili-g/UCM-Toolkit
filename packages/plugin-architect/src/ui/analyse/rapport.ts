/**
 * Le rapport d'analyse que le designer télécharge pour signaler un problème : les points relevés et la description du composant.
 * Le fichier est un JSON local, sans envoi nulle part ; il contient des noms et des valeurs du document.
 */
import type { AnalyseRecue } from '../composant/analyse';
import { NOM_DU_PRODUIT } from '../textes';

export const VERSION_DU_RAPPORT = 1;

/** Le nom du composant réduit à des lettres, des chiffres et des tirets : il entre dans un nom de fichier. */
const nomNettoye = (nom: string): string => nom.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'composant';

export const nomDuRapport = (composant: string, date: Date): string =>
  `ucm-architect-rapport-${nomNettoye(composant)}-${date.toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;

/** Le contenu du fichier. `capture` est le JSON que le sandbox a rendu : il s'insère tel qu'il a été lu. */
export function contenuDuRapport(composant: { readonly id: string; readonly nom: string }, analyse: AnalyseRecue, capture: string, date: Date): string {
  return JSON.stringify({
    version: VERSION_DU_RAPPORT,
    plugin: NOM_DU_PRODUIT,
    date: date.toISOString(),
    composant,
    analyse: { statut: analyse.statut, recueA: analyse.recueA, dureeMs: analyse.dureeMs ?? null, constats: analyse.tous, ignores: analyse.ignores },
    capture: JSON.parse(capture) as unknown,
  });
}

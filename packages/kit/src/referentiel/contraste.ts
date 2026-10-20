/**
 * Les seuils de contraste du thème et les niveaux de texte, comparés à dix décimales.
 *
 * Après une modification : relancer `npm test`, régénérer la vue illustrée (`generer-donnees-referentiel.ts`) si une garantie change, la planche du moteur (`npm run planche --workspace ucm-couleur`) (les seuils bornent les rampes), et changer la version du kit.
 */
import { atteintLeSeuil } from '../emplois/contraste.js';
import { identifiantsDeRoles, roleDeRendu, type IdentifiantDeRole } from '../format/roles-de-rendu.js';

export const SEUILS_PAR_USAGE = { texte: 4.5, nonTexte: 3 } as const;
/** Le seuil AAA du texte courant (critère 1.4.6) ; le grand texte atteint déjà l'AAA au seuil AA du texte courant. */
export const SEUIL_TEXTE_AAA = 7 as const;
export const SEUILS_PAR_ROLE: Readonly<Partial<Record<IdentifiantDeRole, number>>> = Object.fromEntries(
  identifiantsDeRoles().flatMap((identifiant) => {
    const usage = roleDeRendu(identifiant)?.usageDeContraste;
    return usage ? [[identifiant, SEUILS_PAR_USAGE[usage]]] : [];
  }),
);
/** Un niveau WCAG de contraste de texte, `null` quand le minimum AA n'est pas atteint. */
export type NiveauDeTexte = 'AAA' | 'AA' | null;
export interface NiveauxWcag {
  /** Texte courant : AA à 4,5:1 (critère 1.4.3), AAA à 7:1 (critère 1.4.6). */
  readonly texte: NiveauDeTexte;
  /** Grand texte : AA à 3:1, AAA à 4,5:1. Un couple de couleurs ne dit pas la taille du texte. */
  readonly grandTexte: NiveauDeTexte;
  /** Éléments graphiques : le minimum 3:1 du critère 1.4.11, sans niveau AAA. */
  readonly graphique: boolean;
}

/** Classe le contraste mesuré selon les seuils WCAG 2 du texte courant, du grand texte et des éléments graphiques. */
export function niveauxWcag(valeur: number): NiveauxWcag {
  const niveau = (aa: number, aaa: number): NiveauDeTexte =>
    (atteintLeSeuil(valeur, aaa) ? 'AAA' : atteintLeSeuil(valeur, aa) ? 'AA' : null);
  return { texte: niveau(SEUILS_PAR_USAGE.texte, SEUIL_TEXTE_AAA), grandTexte: niveau(SEUILS_PAR_USAGE.nonTexte, SEUILS_PAR_USAGE.texte), graphique: atteintLeSeuil(valeur, SEUILS_PAR_USAGE.nonTexte) };
}

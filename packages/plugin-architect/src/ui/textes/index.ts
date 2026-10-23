/**
 * Tous les textes de l'interface, en français, réunis par domaine : un
 * catalogue par fichier de ce dossier. Les vues n'écrivent aucun mot en dur :
 * `tests/loiDesTextes.test.ts` refuse un littéral posé dans `textContent`,
 * `title`, `placeholder` ou un nom accessible. Ajouter un domaine ajoute une
 * ligne ici.
 *
 * Le catalogue de Nomenclature (`nomenclature.ts`) garde son propre `TEXTES`,
 * que seules ses vues lisent ; les clés des autres catalogues sont uniques
 * entre elles (`tests/textesParDomaine.test.ts`).
 */
import { TEXTES_ARBRE } from './arbre';
import { TEXTES_COMMUN } from './commun';
import { TEXTES_COMPOSANT } from './composant';
import { TEXTES_FICHE } from './fiche';
import { TEXTES_RECHERCHE } from './recherche';
import { TEXTES_STRUCTURE } from './structure';

export { NOM_DU_PRODUIT } from './commun';
export { titreDeConstat } from './fiche';

export const TEXTES = { ...TEXTES_COMMUN, ...TEXTES_ARBRE, ...TEXTES_FICHE, ...TEXTES_RECHERCHE, ...TEXTES_COMPOSANT, ...TEXTES_STRUCTURE };

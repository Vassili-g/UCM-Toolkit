/**
 * Le graphe local d'une variable : ses cibles d'alias à droite, ses
 * dépendants à gauche, déployés à la demande. Les arêtes actives sont celles
 * de la chaîne que `resoudre` rend dans le contexte : le graphe n'a pas de
 * résolveur à lui.
 */
import { dependantsDirects, type Index } from './indexation';
import { resoudre, type Contexte } from './resolution';

export const NOEUDS_MAXIMAUX = 200;

export interface NoeudDuGraphe {
  readonly id: string;
  /** Négative pour un dépendant, positive pour une cible, zéro pour le centre. */
  readonly colonne: number;
  readonly ligne: number;
  /** Vrai quand le nœud a des voisins non montrés, dans son sens. */
  readonly deployable: boolean;
  readonly deploye: boolean;
}

export interface AreteDuGraphe {
  readonly de: string;
  readonly vers: string;
  readonly active: boolean;
}

export interface GrapheLocal {
  readonly noeuds: readonly NoeudDuGraphe[];
  readonly aretes: readonly AreteDuGraphe[];
  /** Les nœuds atteignables par les déploiements demandés, au-delà de la limite. */
  readonly masques: number;
}

/** Les cibles d'alias d'une variable, dans tous ses modes et surcharges. */
function ciblesDe(index: Index, variable: string): string[] {
  const trouvee = index.variables.get(variable);
  if (!trouvee) return [];
  const cibles = new Set<string>();
  for (const valeur of Object.values(trouvee.valeurs)) if (valeur.nature === 'alias') cibles.add(valeur.cible);
  for (const collection of index.releve.collections) {
    for (const valeur of Object.values(collection.extension?.surcharges[variable] ?? {})) if (valeur.nature === 'alias') cibles.add(valeur.cible);
  }
  return [...cibles];
}

/**
 * Construit le graphe autour de `centre`. Le centre est toujours déployé ;
 * un autre nœud ne l'est que s'il figure dans `deployes`. Au-delà de
 * `NOEUDS_MAXIMAUX`, les nœuds restants sont comptés, pas montrés.
 */
export function grapheLocal(index: Index, centre: string, contexte: Contexte, deployes: ReadonlySet<string>): GrapheLocal {
  const chaine = resoudre(index, centre, contexte).etapes.map((etape) => etape.variable);
  const actives = new Set(chaine.slice(0, -1).map((id, rang) => `${id}>${chaine[rang + 1]}`));
  const resultat = resoudre(index, centre, contexte);
  if (resultat.statut === 'inaccessible' && chaine.length > 0) actives.add(`${chaine[chaine.length - 1]}>${resultat.cible}`);

  const noeuds = new Map<string, NoeudDuGraphe>();
  const aretes = new Map<string, AreteDuGraphe>();
  const lignes = new Map<number, number>();
  let masques = 0;
  const poser = (id: string, colonne: number, deployable: boolean, deploye: boolean): boolean => {
    if (noeuds.has(id)) return true;
    if (noeuds.size >= NOEUDS_MAXIMAUX) {
      masques += 1;
      return false;
    }
    const ligne = lignes.get(colonne) ?? 0;
    lignes.set(colonne, ligne + 1);
    noeuds.set(id, { id, colonne, ligne, deployable, deploye });
    return true;
  };
  const relier = (de: string, vers: string) => {
    const cle = `${de}>${vers}`;
    if (!aretes.has(cle)) aretes.set(cle, { de, vers, active: actives.has(cle) });
  };

  poser(centre, 0, false, true);
  // Les deux sens se parcourent en largeur, chacun dans sa direction.
  for (const sens of [1, -1] as const) {
    let front = [centre];
    for (let colonne = sens; front.length > 0; colonne += sens) {
      const suivant: string[] = [];
      for (const id of front) {
        const voisins = sens === 1 ? ciblesDe(index, id) : dependantsDirects(index, id);
        for (const voisin of voisins) {
          const deploye = deployes.has(voisin);
          const sesVoisins = sens === 1 ? ciblesDe(index, voisin) : dependantsDirects(index, voisin);
          if (!poser(voisin, colonne, sesVoisins.length > 0 && !deploye, deploye)) continue;
          if (sens === 1) relier(id, voisin);
          else relier(voisin, id);
          if (deploye && noeuds.get(voisin)?.colonne === colonne) suivant.push(voisin);
        }
      }
      front = suivant;
    }
  }
  return { noeuds: [...noeuds.values()], aretes: [...aretes.values()], masques };
}

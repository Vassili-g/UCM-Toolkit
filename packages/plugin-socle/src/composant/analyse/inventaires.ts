/**
 * Les inventaires qu'une demande d'analyse lit une fois et partage entre ses lecteurs.
 *
 * Trois inventaires, trois portées. Le local, complet : les collections et les variables du fichier, que le catalogue du
 * fichier et le moteur lisent chacun. Les règles d'une page : le scan de la page par `extractRules`, que le moteur et la
 * lecture des règles d'Architect partagent. Les libraries : le résultat de `lireLesLibraries`, lancé en avance puis repris
 * par le catalogue.
 *
 * `creerInventairesDeLaDemande` rend un objet que l'analyse crée au début de sa demande et oublie à la fin : rien ne survit
 * à la demande, Actualiser et une analyse suivante relisent. Le premier lecteur donne la lecture, les suivants reçoivent sa
 * promesse. Un refus se range aussi : les lecteurs suivants de la même demande le reçoivent, comme pour `ressources.ts`.
 *
 * Les lecteurs d'un même inventaire passent la même lecture native, avec ses propres types : l'inventaire ne les convertit
 * pas. Les lectures par identifiant (variables, styles, maîtres) restent à `ressources.ts`, dont l'inventaire porte la
 * mémoire de la demande : une analyse la crée avec ses lectures, un moteur lancé seul n'en a pas et garde la sienne.
 * Les noms de composant d'une page se lisent une fois par page et par demande.
 *
 * Les champs des noeuds ont aussi une mémoire de la demande (`champs`) : le relevé, les dépendances et le moteur lisent
 * chacun `name`, `parent`, `fills`, `boundVariables` et les autres champs du même nœud, et Figma facture chaque lecture.
 * Elle garde la valeur que Figma a rendue la première fois pendant la demande, `figma.mixed` compris, et la rend aux
 * lecteurs suivants : ils voient tous la même. Elle ne sert pas d'une demande à l'autre.
 */
import { lectureNative, type LecteurDeChamp } from './acquisition';
import { compter } from '../contract/mesure';
import { creerMemoireDeRessources, type MemoireDeRessources, type OptionsDeLaMemoire } from './ressources';

/**
 * Lit `noeud[champ]` une fois par nœud et par champ, sur l'identifiant du nœud. Une valeur absente (`undefined`) se
 * mémorise aussi ; une lecture qui lève lève comme avant et n'est pas mémorisée. Sans identifiant textuel, la lecture est
 * directe. La valeur est partagée entre les lecteurs, là où Figma rend une copie neuve de `boundVariables`, `fills` ou
 * `children` à chaque lecture : un appelant ne la modifie pas.
 */
export type MemoireDeChamps = LecteurDeChamp;

export function creerMemoireDeChamps(): MemoireDeChamps {
  const noeuds = new Map<string, Map<string, unknown>>();
  return <T = unknown>(noeud: object, champ: string): T => {
    const id = (noeud as { readonly id?: unknown }).id;
    if (typeof id !== 'string') return lectureNative<T>(noeud, champ);
    let champs = noeuds.get(id);
    if (!champs) {
      champs = new Map();
      noeuds.set(id, champs);
    } else if (champs.has(champ)) {
      return champs.get(champ) as T;
    }
    const valeur = lectureNative<T>(noeud, champ);
    champs.set(champ, valeur);
    return valeur;
  };
}

export interface InventairesDeLaDemande {
  /** Les collections locales du fichier, une lecture par demande. */
  collectionsLocales<T>(lire: () => Promise<T>): Promise<T>;
  /** Les variables locales du fichier, une lecture par demande. */
  variablesLocales<T>(lire: () => Promise<T>): Promise<T>;
  /**
   * Le scan des règles de `page` pour `composant`, une lecture par page et par composant : le nom du composant décide
   * quel conteneur du scan lui revient. Sans identifiant sur l'un des deux, chaque appel lit.
   */
  reglesDeLaPage<T>(page: { readonly id?: unknown }, composant: { readonly id?: unknown }, lire: () => Promise<T>): Promise<T>;
  /** Les libraries activées, une lecture par demande. */
  libraries<T>(lire: () => Promise<T>): Promise<T>;
  /** Les noms de composant que `page` écrit, une lecture par page et par demande ; sans identifiant de page, chaque appel lit. */
  nomsDeLaPage<T>(page: { readonly id?: unknown }, lire: () => T): T;
  /**
   * Le nœud que `getNodeByIdAsync` rend pour `id`, une lecture par identifiant et par demande, refus compris : la prélecture
   * du relevé d'Architect demande en avance les cibles de surcharges que le relevé demandera ensuite. Le nœud rendu se lit
   * en direct ; un changement du document pendant la demande la périme déjà.
   */
  noeudParIdentifiant<T>(id: string, lire: () => Promise<T>): Promise<T>;
  /** Les variables, collections, styles et maîtres lus par identifiant, une fois chacun par demande ; absente sans options. */
  readonly ressources?: MemoireDeRessources;
  /** Les champs des nœuds, une lecture par nœud et par champ pour toute la demande. */
  readonly champs: MemoireDeChamps;
}

export interface OptionsDesInventaires {
  /** Les lectures de la mémoire de ressources de la demande ; sans elles, l'inventaire n'en porte pas. */
  readonly ressources?: OptionsDeLaMemoire;
}

export function creerInventairesDeLaDemande(options: OptionsDesInventaires = {}): InventairesDeLaDemande {
  const lues = new Map<string, Promise<unknown>>();
  const nomsParPage = new Map<string, () => unknown>();
  const noeuds = new Map<string, Promise<unknown>>();

  const unefois = <T>(cle: string, lire: () => Promise<T>): Promise<T> => {
    const deja = lues.get(cle);
    if (deja) {
      compter('inventairesReutilises');
      return deja as Promise<T>;
    }
    const lecture = lire();
    lues.set(cle, lecture);
    return lecture;
  };

  return {
    collectionsLocales: (lire) => unefois('collections-locales', lire),
    variablesLocales: (lire) => unefois('variables-locales', lire),
    reglesDeLaPage: (page, composant, lire) =>
      typeof page.id === 'string' && typeof composant.id === 'string' ? unefois(`regles:${page.id}:${composant.id}`, lire) : lire(),
    libraries: (lire) => unefois('libraries', lire),
    noeudParIdentifiant: <T>(id: string, lire: () => Promise<T>): Promise<T> => {
      let lecture = noeuds.get(id) as Promise<T> | undefined;
      if (!lecture) {
        lecture = lire();
        noeuds.set(id, lecture);
      }
      return lecture;
    },
    nomsDeLaPage: <T>(page: { readonly id?: unknown }, lire: () => T): T => {
      if (typeof page.id !== 'string') return lire();
      const deja = nomsParPage.get(page.id);
      if (deja) {
        compter('inventairesReutilises');
        return deja() as T;
      }
      // Une lecture qui lève lève pour tous les lecteurs de la page, comme un refus des autres inventaires.
      let issue: { readonly lu: T } | { readonly erreur: unknown };
      try {
        issue = { lu: lire() };
      } catch (erreur) {
        issue = { erreur };
      }
      const rendre = (): T => {
        if ('erreur' in issue) throw issue.erreur;
        return issue.lu;
      };
      nomsParPage.set(page.id, rendre);
      return rendre();
    },
    ressources: options.ressources ? creerMemoireDeRessources(options.ressources) : undefined,
    champs: creerMemoireDeChamps(),
  };
}

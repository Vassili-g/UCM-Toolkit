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
 */
import { compter } from '../contract/mesure';
import { creerMemoireDeRessources, type MemoireDeRessources, type OptionsDeLaMemoire } from './ressources';

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
  /** Les variables, collections, styles et maîtres lus par identifiant, une fois chacun par demande ; absente sans options. */
  readonly ressources?: MemoireDeRessources;
}

export interface OptionsDesInventaires {
  /** Les lectures de la mémoire de ressources de la demande ; sans elles, l'inventaire n'en porte pas. */
  readonly ressources?: OptionsDeLaMemoire;
}

export function creerInventairesDeLaDemande(options: OptionsDesInventaires = {}): InventairesDeLaDemande {
  const lues = new Map<string, Promise<unknown>>();
  const nomsParPage = new Map<string, () => unknown>();

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
  };
}

/**
 * Le limiteur des requêtes indépendantes qu'une analyse lance vers Figma : au plus `REQUETES_EN_VOL` en même temps.
 *
 * `executerAuPlus` démarre les tâches dans l'ordre des éléments et range chaque résultat à son rang, quel que soit l'ordre
 * d'arrivée. Il ne borne que les requêtes qui naissent d'une liste connue d'avance (libraries, identifiants d'une vague).
 * Les lectures que le parcours d'un composant lance au fil des nœuds ne passent pas par lui : leur nombre en vol dépend de
 * l'arbre, et le baisser sans mesure dans Figma ralentirait l'analyse.
 */

/** Le nombre de requêtes indépendantes en vol vers Figma au même moment. */
export const REQUETES_EN_VOL = 8;

export interface OptionsDuLimiteur {
  /** Le nombre de tâches en vol ; `REQUETES_EN_VOL` par défaut. */
  readonly limite?: number;
  /**
   * Appelée avant chaque démarrage, dans l'ordre. Rendre `false` arrête les démarrages sans erreur ; lever abandonne
   * l'exécution (annulation). Une promesse est attendue, une valeur sans promesse ne cède pas la main.
   */
  readonly avant?: () => boolean | void | Promise<boolean | void>;
}

export interface IssueDuLimiteur<R> {
  /** Le résultat de chaque tâche terminée, à son rang ; un rang jamais démarré reste vide. */
  readonly resultats: readonly R[];
  /** Faux quand `avant` a arrêté les démarrages avant la fin de la liste. */
  readonly complet: boolean;
}

/**
 * Exécute `tache` sur chaque élément, `limite` à la fois. Une erreur de `tache` ou de `avant` abandonne l'exécution :
 * aucune autre tâche ne démarre et l'erreur remonte aussitôt, les tâches déjà en vol finissant seules. Une tâche qui doit
 * survivre à l'erreur d'une autre rend son échec en valeur.
 */
export async function executerAuPlus<T, R = void>(
  elements: readonly T[],
  tache: (element: T, rang: number) => Promise<R>,
  options: OptionsDuLimiteur = {},
): Promise<IssueDuLimiteur<R>> {
  const limite = Math.max(1, options.limite ?? REQUETES_EN_VOL);
  const resultats = new Array<R>(elements.length);
  let prochain = 0;
  let arrete = false;
  let echec = false;
  const ouvrier = async (): Promise<void> => {
    try {
      while (prochain < elements.length && !echec) {
        const verdict = options.avant?.();
        if ((verdict instanceof Promise ? await verdict : verdict) === false) {
          arrete = true;
          return;
        }
        // Pendant l'attente de `avant`, un autre ouvrier a pu prendre le dernier élément ou échouer.
        if (prochain >= elements.length || echec) return;
        const rang = prochain++;
        resultats[rang] = await tache(elements[rang], rang);
      }
    } catch (erreur) {
      echec = true;
      throw erreur;
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, elements.length) }, ouvrier));
  return { resultats, complet: !arrete };
}

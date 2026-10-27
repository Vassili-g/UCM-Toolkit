/**
 * Un enregistreur d'accès pour les entrées d'une famille de contrôles : il enveloppe un objet de données par un `Proxy`
 * récursif et note le chemin de chaque lecture. Un chemin est une liste de segments, indices de liste compris.
 *
 * - une propriété lue est le chemin du parent suivi de son nom, qu'elle existe ou non ;
 * - `in` lit la propriété qu'il nomme ;
 * - une énumération des clés (`Object.keys`, `Object.entries`, `for…in`) lit `*` sous le chemin de l'objet ;
 * - les méthodes du prototype (`filter`, `map`…) et les symboles ne sont pas des lectures de données.
 * Les proxies d'un même objet sont uniques, pour que les index et les `Map` de l'appelant gardent leur identité.
 */
export type Chemin = readonly string[];

export function enregistrerLesAcces<T extends object>(racine: T, noter: (chemin: Chemin) => void): T {
  const proxies = new WeakMap<object, object>();
  const chemins = new WeakMap<object, string[]>();

  const envelopper = (valeur: unknown, chemin: string[]): unknown => {
    if (typeof valeur !== 'object' || valeur === null) return valeur;
    const connu = proxies.get(valeur);
    if (connu) return connu;
    const proxy = new Proxy(valeur, {
      get(cible, cle, receveur) {
        const valeurLue = Reflect.get(cible, cle, receveur);
        if (typeof cle === 'symbol') return valeurLue;
        const propre = Object.prototype.hasOwnProperty.call(cible, cle);
        // Une méthode du prototype n'est pas une donnée ; une propriété absente de la chaîne en est une (`undefined`).
        if (!propre && cle in cible) return valeurLue;
        const suivant = [...chemins.get(cible)!, cle];
        noter(suivant);
        return envelopper(valeurLue, suivant);
      },
      has(cible, cle) {
        if (typeof cle === 'string') noter([...chemins.get(cible)!, cle]);
        return Reflect.has(cible, cle);
      },
      ownKeys(cible) {
        noter([...chemins.get(cible)!, '*']);
        return Reflect.ownKeys(cible);
      },
    });
    proxies.set(valeur, proxy);
    chemins.set(valeur, chemin);
    return proxy;
  };

  return envelopper(racine, []) as T;
}

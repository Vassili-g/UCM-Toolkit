/**
 * Un espion de champs pour les nœuds des tests du moteur : il enveloppe les nœuds de `figmaFaux.node` et note, dans
 * l'ordre de première lecture, chaque champ lu et chaque méthode appelée avec ses arguments, par type de nœud. Les nœuds
 * que ses accesseurs et ses méthodes rendent sont enveloppés à leur tour, d'où un seul journal pour tout le parcours.
 */
export type ChampsLus = Record<string, string[]>;

const IGNORES = new Set(['then', 'toJSON', 'constructor']);

export function espionDeChamps() {
  const champs: ChampsLus = {};
  const espions = new WeakMap<object, object>();
  const enveloppes = new WeakSet<object>();
  const connus = new WeakSet<object>();
  const styles = new WeakSet<object>();

  const noter = (cible: object, entree: string): void => {
    const type = (cible as { type?: unknown }).type;
    const famille = styles.has(cible) ? 'STYLE' : typeof type === 'string' ? type : 'INCONNU';
    const liste = champs[famille] ?? (champs[famille] = []);
    if (!liste.includes(entree)) liste.push(entree);
  };

  const texteDArgument = (argument: unknown): string => {
    if (Array.isArray(argument)) return argument.join(',');
    if (typeof argument === 'function') return 'filtre';
    if (typeof argument === 'object' && argument !== null) return JSON.stringify(argument);
    return String(argument);
  };

  const envelopper = (valeur: unknown): unknown => {
    if (valeur instanceof Promise) return valeur.then(envelopper);
    if (Array.isArray(valeur)) return valeur.map(envelopper);
    if (typeof valeur === 'object' && valeur !== null && connus.has(valeur) && !enveloppes.has(valeur)) return espionner(valeur);
    return valeur;
  };

  function espionner<T extends object>(cible: T): T {
    const deja = espions.get(cible);
    if (deja) return deja as T;
    const espion = new Proxy(cible, {
      get(brut, cle, receveur) {
        const valeur = Reflect.get(brut, cle, receveur);
        if (typeof cle !== 'string' || IGNORES.has(cle)) return valeur;
        if (typeof valeur === 'function') {
          return (...arguments_: unknown[]) => {
            noter(brut, `${cle}(${arguments_.map(texteDArgument).join(';')})`);
            return envelopper(valeur.apply(brut, arguments_));
          };
        }
        noter(brut, cle);
        return envelopper(valeur);
      },
      has(brut, cle) {
        if (typeof cle === 'string') noter(brut, `in ${cle}`);
        return Reflect.has(brut, cle);
      },
    });
    espions.set(cible, espion);
    enveloppes.add(espion);
    return espion;
  }

  /** Déclare `racine` et tous ses descendants par `children`. */
  function declarerLArbre<T extends { children?: unknown }>(racine: T): T {
    const pile: unknown[] = [racine];
    while (pile.length > 0) {
      const courant = pile.pop();
      if (typeof courant !== 'object' || courant === null || connus.has(courant)) continue;
      connus.add(courant);
      const enfants = (courant as { children?: unknown }).children;
      if (Array.isArray(enfants)) pile.push(...enfants);
    }
    return racine;
  }

  return {
    champs,
    declarerLArbre,
    /** Déclare un style : ses lectures s'inscrivent sous `STYLE`, pas sous son type. */
    declarerUnStyle<T extends object>(style: T): T {
      connus.add(style);
      styles.add(style);
      return style;
    },
    espion: <T extends object>(objet: T): T => espionner(objet),
    envelopper: envelopper as <T>(valeur: T) => T,
    /** Tout ce qui a été lu, vidé pour le lecteur suivant. */
    releverEtVider(): ChampsLus {
      const copie = Object.fromEntries(Object.entries(champs).map(([type, liste]) => [type, [...liste]]));
      for (const type of Object.keys(champs)) delete champs[type];
      return copie;
    },
  };
}

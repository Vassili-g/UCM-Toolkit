/**
 * Mène un générateur du kit par tranches : le sandbox ne bloque jamais plus de huit millisecondes de suite,
 * et une pause rend la main entre deux tranches pour que les lectures et les nouvelles demandes passent.
 */

/** Durée maximale d'une tranche, en millisecondes. */
export const DUREE_D_UNE_TRANCHE = 8;

export interface OptionsDeTranches {
  readonly duree?: number;
  readonly maintenant?: () => number;
  readonly pause?: () => Promise<void>;
}

export type ResultatDeTranches<T> = { readonly abandonne: false; readonly valeur: T } | { readonly abandonne: true };

export const pauseParDefaut = (): Promise<void> => new Promise((resoudre) => { setTimeout(resoudre, 0); });

/**
 * Avance `calcul` jusqu'à son terme. Après chaque pause, `abandonne` est consulté : s'il rend vrai, le générateur
 * est fermé et le résultat dit l'abandon. Une demande ne peut arriver qu'entre deux tranches, donc un calcul
 * qui tient dans une seule tranche n'est jamais abandonné.
 */
export async function mener<T>(calcul: Generator<void, T>, abandonne: () => boolean, options: OptionsDeTranches = {}): Promise<ResultatDeTranches<T>> {
  const duree = options.duree ?? DUREE_D_UNE_TRANCHE;
  const maintenant = options.maintenant ?? Date.now;
  const pause = options.pause ?? pauseParDefaut;
  if (abandonne()) {
    calcul.return(undefined as never);
    return { abandonne: true };
  }
  let debut = maintenant();
  for (;;) {
    const etape = calcul.next();
    if (etape.done) return { abandonne: false, valeur: etape.value };
    if (maintenant() - debut < duree) continue;
    await pause();
    if (abandonne()) {
      calcul.return(undefined as never);
      return { abandonne: true };
    }
    debut = maintenant();
  }
}

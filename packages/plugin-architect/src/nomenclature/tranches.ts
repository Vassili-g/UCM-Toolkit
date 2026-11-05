/**
 * Mène un générateur du kit par tranches, avec un budget de huit millisecondes vérifié après chaque appel de `next`.
 * Un pas peut dépasser ce budget. Une pause rend la main aux lectures et aux nouvelles demandes entre deux tranches.
 */

/** Budget d'une tranche, en millisecondes, hors dépassement du dernier pas. */
export const DUREE_D_UNE_TRANCHE = 8;

/** Ce que `mener` note de son propre cours : les cessions, le temps passé à attendre les pauses, et la tranche synchrone la plus longue. */
export interface MesureDeTranches {
  cessions: number;
  attenteMs: number;
  pasMaxMs: number;
}

export interface OptionsDeTranches {
  readonly duree?: number;
  /** Remplie par `mener` quand elle est donnée ; une horloge en millisecondes suffit à la tenir. */
  readonly mesure?: MesureDeTranches;
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
  const mesure = options.mesure;
  if (abandonne()) {
    calcul.return(undefined as never);
    return { abandonne: true };
  }
  let debut = maintenant();
  for (;;) {
    const etape = calcul.next();
    if (etape.done) {
      if (mesure) mesure.pasMaxMs = Math.max(mesure.pasMaxMs, maintenant() - debut);
      return { abandonne: false, valeur: etape.value };
    }
    const ecoule = maintenant() - debut;
    if (ecoule < duree) continue;
    const avantLaPause = maintenant();
    if (mesure) { mesure.cessions += 1; mesure.pasMaxMs = Math.max(mesure.pasMaxMs, ecoule); }
    await pause();
    if (mesure) mesure.attenteMs += maintenant() - avantLaPause;
    if (abandonne()) {
      calcul.return(undefined as never);
      return { abandonne: true };
    }
    debut = maintenant();
  }
}

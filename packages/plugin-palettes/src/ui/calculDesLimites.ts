/**
 * Le calcul des limites dynamiques, étalé entre les images ([DER-20]). Une
 * limite juge jusqu'à 180 palettes candidates, 53 ms au plus dans Node : un
 * balayage avance par tranches, et rend la main au navigateur entre deux. Un
 * geste qui commence avant la fin termine d'abord tous les balayages, pour
 * que son glisser lise une limite complète.
 */
import type { Limite } from 'ucm-couleur';

/** La durée d'une tranche, en millisecondes : la moitié d'une image à 60 Hz. */
const TRANCHE = 8;

export interface CalculsDeLimites {
  /** Lance un balayage. Un lancement sous une clé déjà en cours remplace l'ancien, qui ne rend rien. */
  lancer(cle: string, balayage: Iterator<void, Limite, void>, fini: (limite: Limite) => void): void;
  /**
   * Termine d'un trait les balayages en cours, au début d'un geste, sans
   * redessiner : l'appelant redessine ce que le geste lit. Vrai quand un
   * balayage était en cours.
   */
  terminer(): boolean;
  /** Abandonne les balayages en cours, sans rien rendre. */
  abandonner(): void;
  /** Vrai tant qu'un balayage n'a pas fini. */
  enCours(): boolean;
}

interface Balayage {
  readonly iterateur: Iterator<void, Limite, void>;
  readonly fini: (limite: Limite) => void;
}

/** `surFin` suit le dernier balayage fini d'une série : la vue se redessine une fois. */
export function createCalculsDeLimites(surFin: () => void): CalculsDeLimites {
  const enAttente = new Map<string, Balayage>();
  let minuterie: ReturnType<typeof setTimeout> | null = null;

  /** Avance un balayage jusqu'à sa fin ou jusqu'à `echeance` ; vrai quand il a fini. */
  function avancer(cle: string, balayage: Balayage, echeance: number): boolean {
    for (;;) {
      const pas = balayage.iterateur.next();
      if (pas.done) {
        enAttente.delete(cle);
        balayage.fini(pas.value);
        return true;
      }
      if (performance.now() >= echeance) return false;
    }
  }

  function tranche(): void {
    minuterie = null;
    const echeance = performance.now() + TRANCHE;
    for (const [cle, balayage] of [...enAttente]) {
      if (!avancer(cle, balayage, echeance)) break;
    }
    if (enAttente.size > 0) planifier();
    else surFin();
  }

  function planifier(): void {
    if (minuterie === null) minuterie = setTimeout(tranche, 0);
  }

  function abandonner(): void {
    enAttente.clear();
    if (minuterie !== null) clearTimeout(minuterie);
    minuterie = null;
  }

  return {
    lancer(cle, iterateur, fini) {
      enAttente.set(cle, { iterateur, fini });
      planifier();
    },
    terminer() {
      if (enAttente.size === 0) return false;
      for (const [cle, balayage] of [...enAttente]) avancer(cle, balayage, Infinity);
      abandonner();
      return true;
    },
    abandonner,
    enCours: () => enAttente.size > 0,
  };
}

/** Tirage à graine des harnais de stress test : même graine, mêmes tirages, d'un cas à l'autre. */

export type Tireur = () => number;

export function mulberry32(graine: number): Tireur {
  let etat = graine >>> 0;
  return () => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Une sous-graine par cas : le tirage d'un cas ne dépend pas de l'ordre des autres. */
export function graineDe(graine: number, etiquette: string): number {
  let hachage = 0x811c9dc5;
  for (let i = 0; i < etiquette.length; i++) {
    hachage ^= etiquette.charCodeAt(i);
    hachage = Math.imul(hachage, 0x01000193) >>> 0;
  }
  return (hachage ^ (graine >>> 0)) >>> 0;
}

/** Un entier entre `min` et `max`, bornes comprises. */
export function entier(tirer: Tireur, min: number, max: number): number {
  return min + Math.floor(tirer() * (max - min + 1));
}

export function choisir<T>(tirer: Tireur, liste: readonly T[]): T {
  if (liste.length === 0) throw new Error('choisir : liste vide');
  return liste[entier(tirer, 0, liste.length - 1)];
}

/** Fisher-Yates sur une copie. */
export function melanger<T>(tirer: Tireur, liste: readonly T[]): T[] {
  const copie = [...liste];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = entier(tirer, 0, i);
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/** `n` éléments distincts de la liste, sans remise. */
export function echantillon<T>(tirer: Tireur, liste: readonly T[], n: number): T[] {
  return melanger(tirer, liste).slice(0, n);
}

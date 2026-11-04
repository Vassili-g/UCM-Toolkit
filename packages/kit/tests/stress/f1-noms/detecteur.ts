/**
 * Détecteur de mesure du stress test F1 (plan F1, section 4.2) : la règle voulue par D1 et D2, sans seuil de fréquence ni de place.
 * Pour chaque mot d'un fichier absent du vocabulaire et du dictionnaire, il liste les termes du vocabulaire à une lettre
 * (ajout, retrait, remplacement) ou à un échange de deux lettres voisines. Il ne partage aucun code avec le kit : la distance
 * est réécrite ici, pour que la comparaison avec la sortie du kit ne dépende pas de la fonction que le kit emploie.
 */
import type { VocabulaireDeReference } from './dictionnaire.js';

/** Vrai si les deux mots diffèrent d'une lettre (ajoutée, retirée, remplacée) ou d'un échange de deux lettres voisines. */
export function aUneLettreOuUnEchange(a: string, b: string): boolean {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  let debut = 0;
  while (debut < a.length && debut < b.length && a[debut] === b[debut]) debut++;
  const reste = (x: string, depart: number) => x.slice(depart);
  if (a.length === b.length) {
    if (reste(a, debut + 1) === reste(b, debut + 1)) return true;
    return a[debut] === b[debut + 1] && a[debut + 1] === b[debut] && reste(a, debut + 2) === reste(b, debut + 2);
  }
  const [court, long] = a.length < b.length ? [a, b] : [b, a];
  return reste(court, debut) === reste(long, debut + 1);
}

/** Vrai si les deux mots sont à deux éditions exactement (ajout, retrait, remplacement, échange de deux voisines), au sens de Damerau-Levenshtein. */
export function aDeuxEditions(a: string, b: string): boolean {
  if (a === b || Math.abs(a.length - b.length) > 2) return false;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length] === 2;
}

export interface Candidat { readonly mot: string; readonly terme: string }

export interface Detecteur {
  /** Les termes à une lettre ou à un échange du mot ; vide si le mot est du vocabulaire ou du dictionnaire. */
  termesProches(mot: string): string[];
  /** Les termes à deux éditions exactement ; vide si le mot est du vocabulaire, du dictionnaire ou à une lettre d'un terme. */
  termesADeuxEditions(mot: string): string[];
  /** Vrai si le mot est une faute du terme selon la règle voulue. */
  confirme(mot: string, terme: string): boolean;
  /** Les candidats d'un ensemble de mots. */
  analyser(mots: Iterable<string>): Candidat[];
}

/** Les mots d'un nom : coupe sur les non-lettres et sur les passages de minuscule à majuscule, en minuscules, 3 lettres ou plus. */
export function motsDeDetection(nom: string): string[] {
  return nom.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^A-Za-z]+/).map((mot) => mot.toLowerCase()).filter((mot) => mot.length >= 3);
}

export function creerLeDetecteur(vocabulaire: VocabulaireDeReference, motsDuDictionnaire: ReadonlySet<string>): Detecteur {
  const cibles = vocabulaire.alphabetiques.filter((terme) => terme.length >= 3);
  const cache = new Map<string, string[]>();
  const termesProches = (mot: string): string[] => {
    let rendus = cache.get(mot);
    if (!rendus) {
      rendus = vocabulaire.termes.has(mot) || motsDuDictionnaire.has(mot) ? [] : cibles.filter((terme) => aUneLettreOuUnEchange(mot, terme));
      cache.set(mot, rendus);
    }
    return rendus;
  };
  const cacheDeux = new Map<string, string[]>();
  const termesADeuxEditions = (mot: string): string[] => {
    let rendus = cacheDeux.get(mot);
    if (!rendus) {
      rendus = termesProches(mot).length > 0 || vocabulaire.termes.has(mot) || motsDuDictionnaire.has(mot) ? [] : cibles.filter((terme) => aDeuxEditions(mot, terme));
      cacheDeux.set(mot, rendus);
    }
    return rendus;
  };
  return {
    termesProches,
    termesADeuxEditions,
    confirme: (mot, terme) => termesProches(mot).includes(terme),
    analyser: (mots) => [...new Set(mots)].sort().flatMap((mot) => termesProches(mot).map((terme) => ({ mot, terme }))),
  };
}

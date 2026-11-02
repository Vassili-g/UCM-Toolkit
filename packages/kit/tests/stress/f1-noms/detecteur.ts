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

export interface Candidat { readonly mot: string; readonly terme: string }

export interface Detecteur {
  /** Les termes à une lettre ou à un échange du mot ; vide si le mot est du vocabulaire ou du dictionnaire. */
  termesProches(mot: string): string[];
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
  return {
    termesProches,
    confirme: (mot, terme) => termesProches(mot).includes(terme),
    analyser: (mots) => [...new Set(mots)].sort().flatMap((mot) => termesProches(mot).map((terme) => ({ mot, terme }))),
  };
}

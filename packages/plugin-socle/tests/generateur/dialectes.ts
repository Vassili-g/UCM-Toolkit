/**
 * Les dialectes des design systems : le nom de chaque propriété de variante d'un composant et ses valeurs, tels que le système les
 * publie (`packages/kit/fixtures/dialectes/dialectes.json`). Le générateur en tire les noms d'axes et leurs valeurs ; une entrée non
 * vérifiée ne fournit rien.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface ProprieteDeDialecte {
  readonly nom: string;
  readonly valeurs: readonly string[];
  readonly role: 'palette' | 'style' | 'taille' | 'etat' | 'libre';
  readonly verifie: boolean;
}

export interface EntreeDeDialecte {
  readonly systeme: string;
  readonly composant: string;
  readonly verifie: boolean;
  readonly proprietes: readonly ProprieteDeDialecte[];
}

export const CHEMIN_DES_DIALECTES = path.resolve(__dirname, '../../../kit/fixtures/dialectes/dialectes.json');

let lues: { entrees: readonly EntreeDeDialecte[] } | undefined;

/** Les entrées du fichier, lues une fois. */
export function lireLesDialectes(): readonly EntreeDeDialecte[] {
  lues ??= JSON.parse(readFileSync(CHEMIN_DES_DIALECTES, 'utf8')) as { entrees: readonly EntreeDeDialecte[] };
  return lues.entrees;
}

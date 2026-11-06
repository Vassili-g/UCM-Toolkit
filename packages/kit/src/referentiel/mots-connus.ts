/**
 * Les mots courants que le kit ne prend jamais pour une faute : mots anglais de Scowl et segments des noms de design systems
 * (`mots-connus-donnees.ts`, généré par `packages/kit/scripts/generer-mots-connus.ts`). La règle des fautes de 4 à 6 lettres
 * (`questions.ts`, E15) le lit pour un seul mot à la fois, quand ce mot est à une lettre d'un terme du kit. Le texte de licence de Scowl
 * est dans `mots-connus.LICENCE.txt`.
 */
import { MOTS_ANGLAIS, SEGMENTS_DES_SYSTEMES } from './mots-connus-donnees.js';

const SEPARATEUR = /\s+/u;
let mots: ReadonlySet<string> | undefined;

/** Vrai pour un mot du dictionnaire. L'ensemble se construit au premier appel, jamais au chargement du module. */
export function motConnu(mot: string): boolean {
  mots ??= new Set([...MOTS_ANGLAIS.split(SEPARATEUR), ...SEGMENTS_DES_SYSTEMES.split(SEPARATEUR)].filter(Boolean));
  return mots.has(mot.toLowerCase());
}

/** Les mots anglais seuls, pour la mesure des faux positifs qui retire un système du dictionnaire (E15.4). */
export function motsAnglaisConnus(): readonly string[] {
  return MOTS_ANGLAIS.split(SEPARATEUR).filter(Boolean);
}

/** Remplace le dictionnaire par `autres`, ou le rétablit sans argument. Réservé aux mesures, qui retirent un système du dictionnaire. */
export function remplacerLesMotsConnus(autres?: Iterable<string>): void {
  mots = autres ? new Set(autres) : undefined;
}

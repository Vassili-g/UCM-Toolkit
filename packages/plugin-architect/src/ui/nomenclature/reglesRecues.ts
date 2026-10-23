/**
 * Les règles de nommage que le mode Composant prépare et que le mode Tokens reçoit : des questions, en tête de l'onglet Questions.
 *
 * Aucun message du sandbox n'apporte encore ces règles : B8 les tirera du texte de préparation. L'interface les reçoit sous un
 * message qu'elle lit elle-même, `regles-recues`, que ce fichier décrit ; B8 le produira ou le remplacera.
 */
import type { LigneVue } from '../../messages/nomenclature';

/** Une règle préparée depuis un composant : le terme qui disparaît, le terme voulu, et un nom réel du composant avant et après. */
export interface RegleRecue {
  readonly ancien: string;
  readonly nouveau: string;
  readonly composant: string;
  readonly exemple: { readonly ancien: string; readonly nouveau: string };
}

export interface MessageDeReglesRecues {
  readonly type: 'regles-recues';
  readonly regles: readonly RegleRecue[];
}

const texte = (valeur: unknown): boolean => typeof valeur === 'string' && valeur !== '';

function estRegle(valeur: unknown): valeur is RegleRecue {
  if (typeof valeur !== 'object' || valeur === null) return false;
  const { ancien, nouveau, composant, exemple } = valeur as Record<string, unknown>;
  if (typeof exemple !== 'object' || exemple === null) return false;
  return texte(ancien) && texte(nouveau) && texte(composant) && texte((exemple as Record<string, unknown>).ancien) && texte((exemple as Record<string, unknown>).nouveau);
}

export function estReglesRecues(brut: unknown): brut is MessageDeReglesRecues {
  if (typeof brut !== 'object' || brut === null) return false;
  const { type, regles } = brut as Record<string, unknown>;
  return type === 'regles-recues' && Array.isArray(regles) && regles.every(estRegle);
}

/** La clé d'une règle : deux règles de même terme et de même remplaçant n'en font qu'une carte. */
export const cleDeRegleRecue = (regle: RegleRecue): string => `recue:${regle.ancien}>${regle.nouveau}`;

/** L'exemple d'une règle, avec les segments qui portent le terme marqués : ceux de l'ancien nom égaux au terme retiré. */
export function ligneDeRegleRecue(regle: RegleRecue): LigneVue {
  const marques = regle.exemple.ancien.split('/').flatMap((segment, rang) => (segment === regle.ancien ? [rang] : []));
  return { id: cleDeRegleRecue(regle), ancien: regle.exemple.ancien, nouveau: regle.exemple.nouveau, marques, aussi: [] };
}

/** Les règles qu'une liste porte une seule fois, dans l'ordre de réception. */
export function sansDoublon(regles: readonly RegleRecue[]): readonly RegleRecue[] {
  const vues = new Set<string>();
  return regles.filter((regle) => {
    const cle = cleDeRegleRecue(regle);
    if (vues.has(cle)) return false;
    vues.add(cle);
    return true;
  });
}

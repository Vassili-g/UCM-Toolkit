/**
 * Les bornes de ce que la session d'analyse garde, et l'estimation de la taille d'une entrée.
 *
 * Trois bornes pèsent sur la session entière : le nombre de sujets, les octets estimés et les arêtes (les liens
 * « cette requête lit cette sortie » et les ressources de dépendance que l'entrée retient). Elles se choisissent assez
 * larges pour garder les composants qu'un designer rouvre en une séance, et assez serrées pour que le sandbox du plugin
 * ne grossisse pas avec le nombre de composants analysés :
 * - 8 sujets : une page de composants se parcourt ; au-delà, le plus ancien est le moins susceptible de revenir ;
 * - 48 Mio estimés : un catalogue de quelques milliers de variables et un relevé de plusieurs centaines de calques
 *   pèsent quelques Mio, le reste de la marge couvre huit sujets sans que l'un d'eux seul n'épuise la borne ;
 * - 20 000 arêtes : une entrée en porte quelques centaines (maîtres, styles, variables locales, entrées de requêtes).
 *
 * L'estimation est une fonction pure et déterministe, qui parcourt la valeur sans la sérialiser : 2 octets par caractère,
 * 8 par nombre, 4 par booléen, 8 de structure par objet, liste, `Map` ou `Set`, plus ses clés et ses éléments. Elle
 * s'arrête dès que le plafond est franchi : son coût est borné par le plafond, quelle que soit la taille de la valeur.
 */

export interface BornesDeRetention {
  readonly sujets: number;
  readonly octets: number;
  readonly aretes: number;
}

export const BORNES_DE_RETENTION: BornesDeRetention = { sujets: 8, octets: 48 * 1024 * 1024, aretes: 20_000 };

/**
 * La taille approximative de `valeur`, plafonnée : un résultat supérieur à `plafond` dit seulement « plus que le
 * plafond ». Un objet déjà vu (cycle, partage) ne compte qu'une fois.
 */
export function estimerLesOctets(valeur: unknown, plafond: number): number {
  let total = 0;
  const vus = new Set<object>();
  const pile: unknown[] = [valeur];
  while (pile.length > 0 && total <= plafond) {
    const courante = pile.pop();
    switch (typeof courante) {
      case 'string': total += 2 * courante.length; break;
      case 'number': case 'bigint': total += 8; break;
      case 'boolean': total += 4; break;
      case 'function': total += 8; break;
      case 'object': {
        if (courante === null || vus.has(courante)) break;
        vus.add(courante);
        total += 8;
        if (Array.isArray(courante)) for (const element of courante) pile.push(element);
        else if (courante instanceof Map) for (const [cle, element] of courante) pile.push(cle, element);
        else if (courante instanceof Set) for (const element of courante) pile.push(element);
        else for (const [cle, element] of Object.entries(courante)) { total += 2 * cle.length; pile.push(element); }
        break;
      }
      default: break;
    }
  }
  return total;
}

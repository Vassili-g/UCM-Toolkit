/**
 * La reconnaissance d'un terme quelle que soit son écriture (premier principe du plan de fiabilité). Ce module vit à part
 * de `termes.ts` : il lit `decouperSegment`, dont le module dépend d'`architecture.ts`, et `architecture.ts` importe
 * `termes.ts`. Les réunir créerait un cycle que le chargement d'`architecture.ts` seul ne résout pas.
 */
import { decouperSegment } from './ecriture-des-mots.js';
import type { Registre, Terme } from './termes.js';

/** Le texte ramené à la forme qu'on compare : mots de `decouperSegment`, en minuscules, joints par `-`. */
export function formeReconnue(texte: string): string {
  return decouperSegment(texte).map((mot) => mot.toLowerCase()).join('-');
}

/**
 * Retrouve un terme quelle que soit l'écriture du segment : la forme reconnue du segment est comparée à celle de l'identifiant
 * et de chaque forme tolérée. `undefined` pour un terme absent, un segment vide ou sans mot.
 */
export function termeReconnu(registre: Registre, segment: string): Terme | undefined {
  const forme = formeReconnue(segment);
  if (!forme) return undefined;
  return registre.termes.find((terme) => [terme.id, ...(terme.toleres ?? [])].some((ecrit) => formeReconnue(ecrit) === forme));
}

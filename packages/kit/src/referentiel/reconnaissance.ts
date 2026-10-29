/**
 * La reconnaissance d'un terme quelle que soit son écriture (premier principe du plan de fiabilité). Ce module vit à part
 * de `termes.ts` : il lit `decouperSegment`, dont le module dépend d'`architecture.ts`, et `architecture.ts` importe
 * `termes.ts`. Les réunir créerait un cycle que le chargement d'`architecture.ts` seul ne résout pas.
 */
import { decouperSegment } from './ecriture-des-mots.js';
import type { Registre, Terme } from './termes.js';

const FORMES_MEMORISEES_MAX = 20_000;
const formes = new Map<string, string>();
const statistiques = { appels: 0, calculs: 0 };

/** Compteurs des appels de `formeReconnue` et de ceux qui n'ont pas trouvé leur forme en mémoire : la preuve de gain des tests. */
export function statistiquesDeReconnaissance(): { appels: number; calculs: number } {
  return { ...statistiques };
}

/** Vide la mémoire de `formeReconnue` et remet les compteurs à zéro, pour comparer un calcul à froid et à chaud. */
export function reinitialiserLaReconnaissance(): void {
  formes.clear();
  statistiques.appels = 0;
  statistiques.calculs = 0;
}

/**
 * Le texte ramené à la forme qu'on compare : mots de `decouperSegment`, en minuscules, joints par `-`.
 * Le résultat ne dépend que de constantes du module, qu'aucun code n'écrit après le chargement : il est mémorisé, et la mémoire est vidée en entier au plafond.
 */
export function formeReconnue(texte: string): string {
  statistiques.appels++;
  const memorisee = formes.get(texte);
  if (memorisee !== undefined) return memorisee;
  statistiques.calculs++;
  const forme = decouperSegment(texte).map((mot) => mot.toLowerCase()).join('-');
  if (formes.size >= FORMES_MEMORISEES_MAX) formes.clear();
  formes.set(texte, forme);
  return forme;
}

/** La forme de chemin d'un nom : chaque segment passe par `formeReconnue`, les segments se rejoignent par `/`. */
export function formeDuChemin(nom: string | readonly string[]): string {
  const segments = typeof nom === 'string' ? nom.split('/') : nom;
  return segments.map((segment) => formeReconnue(segment)).join('/');
}

type IndexDuRegistre = { nombreDeTermes: number; parForme: Map<string, Terme> };
const indexParRegistre = new WeakMap<Registre, IndexDuRegistre>();

/** Premier terme de l'ordre du registre pour chaque forme reconnue de ses écritures : le résultat du `find` d'avant l'index. */
function indexDuRegistre(registre: Registre): IndexDuRegistre {
  const existant = indexParRegistre.get(registre);
  if (existant && existant.nombreDeTermes === registre.termes.length) return existant;
  const parForme = new Map<string, Terme>();
  for (const terme of registre.termes) {
    for (const ecrit of [terme.id, ...(terme.toleres ?? [])]) {
      const forme = formeReconnue(ecrit);
      if (!parForme.has(forme)) parForme.set(forme, terme);
    }
  }
  const index = { nombreDeTermes: registre.termes.length, parForme };
  indexParRegistre.set(registre, index);
  return index;
}

/**
 * Retrouve un terme quelle que soit l'écriture du segment : la forme reconnue du segment est comparée à celle de l'identifiant
 * et de chaque forme tolérée. `undefined` pour un terme absent, un segment vide ou sans mot.
 */
export function termeReconnu(registre: Registre, segment: string): Terme | undefined {
  const forme = formeReconnue(segment);
  if (!forme) return undefined;
  return indexDuRegistre(registre).parForme.get(forme);
}

/**
 * Nature des segments d'un nom de variable : un nom de composant ou de palette n'est pas un mot du vocabulaire.
 * Pur : la nature vient de la place du segment et de tous les noms du fichier, jamais d'une liste de noms propres.
 *
 * Après une modification : relancer `npm test` et changer la version du kit ; aucune vue ni planche n'en tire de données.
 */
import { REGISTRES_ARCHITECTURE, REGISTRE_COULEURS_ABSOLUES } from './architecture.js';
import { decouperSegment } from './ecriture-des-mots.js';
import type { NomLu } from './harmonisation.js';
import { collectionUcmReconnue } from './normalisation.js';
import { termeOuFormeConnu } from './termes-connus.js';
import { ABREVIATIONS, CRANS, MODES, PROFILS, REGISTRES, SYNONYMES_COURANTS } from './vocabulaire.js';

export type NatureDeSegment = 'composant' | 'palette';
type Nature = NatureDeSegment | null;

/** Un chemin porte une palette à partir de ce nombre de crans différents. UCM Palettes détecte les palettes du fichier sur ce seuil. */
export const SEUIL_DE_PALETTE = 5;

/** Le groupe dont les enfants directs sont des composants, quelle que soit la collection (forme en minuscules). */
const DOSSIER_DES_COMPOSANTS = 'components';
const crans = new Set<string>(CRANS.map(String));
const modesEtProfils = new Set<string>([...MODES, ...PROFILS]);
const couleursAbsolues = new Set(REGISTRE_COULEURS_ABSOLUES.termes.map((terme) => terme.id));

const motsDesRegistres = new Set([
  ...[...REGISTRES, ...REGISTRES_ARCHITECTURE].flatMap((registre) => registre.termes.flatMap((terme) => [terme.id, ...(terme.toleres ?? [])])),
  ...SYNONYMES_COURANTS.flat(),
].map((mot) => mot.toLowerCase()));
/** Le développement d'une abréviation (`btn` → `button`) que seule l'abréviation fait connaître : `button` peut nommer un composant. */
const developpementsSeuls = new Set(Object.values(ABREVIATIONS).map((mot) => mot.toLowerCase()).filter((mot) => !motsDesRegistres.has(mot)));

/** Connu du référentiel, au pluriel près, sans compter le développement d'une abréviation. */
function motDuReferentiel(minuscule: string): boolean {
  if (!termeOuFormeConnu(minuscule)) return false;
  return ![minuscule, minuscule.slice(0, -1), minuscule.slice(0, -2)].some((mot) => developpementsSeuls.has(mot));
}

interface NomEtSegments {
  readonly nom: NomLu;
  readonly segments: readonly string[];
  readonly minuscules: readonly string[];
  /** Nature d'après la place, avant les exclusions. */
  readonly natures: Nature[];
}

/** Le segment qui précède les modes, profils et crans d'une variable dont le dernier segment est un cran ou une couleur absolue. */
function candidatDePalette(minuscules: readonly string[]): number {
  const dernier = minuscules[minuscules.length - 1];
  if (!crans.has(dernier) && !couleursAbsolues.has(dernier)) return -1;
  let rang = minuscules.length - 2;
  while (rang >= 0 && (crans.has(minuscules[rang]) || modesEtProfils.has(minuscules[rang]))) rang--;
  return rang;
}

/**
 * Pour chaque nom, un tableau aligné sur `nom.split('/')` : la nature de chaque segment, ou `null`.
 * Le dernier segment d'une variable est sa propre valeur et n'a jamais de nature.
 * Un mot du référentiel, un mot employé aussi à une place sans nature et une clé de `ordinaires`
 * (forme en minuscules, mots joints par `-` ou soudés) n'en ont jamais.
 */
export function naturesDesNoms(
  noms: Iterable<NomLu>,
  options: { readonly ordinaires?: ReadonlySet<string> } = {},
): ReadonlyMap<string, readonly Nature[]> {
  const tous = [...noms];
  const collectionsUcm = new Map(tous.filter((nom) => nom.categorie === 'collections').map((nom) => [nom.id, collectionUcmReconnue(nom.nom)]));
  const cransParChemin = new Map<string, Set<string>>();
  const cheminsDeclares = new Set<string>();
  const candidats = new Map<string, { readonly lu: NomEtSegments; readonly rang: number; readonly cle: string }[]>();

  const lus = tous.filter((nom) => nom.categorie !== 'collections').map((nom): NomEtSegments => {
    const segments = nom.nom.split('/');
    const minuscules = segments.map((segment) => segment.toLowerCase());
    const dansComponents = collectionsUcm.get(nom.portee) === 'components';
    // Sur UCM, un composant est seulement un élément à la racine d'un dossier `components` : les autres éléments sont des noms de groupe.
    const natures = segments.map((segment, rang): Nature => {
      if (!segment || rang === segments.length - 1) return null;
      if (minuscules[rang] === DOSSIER_DES_COMPOSANTS) return null;
      return (rang === 0 && dansComponents) || minuscules[rang - 1] === DOSSIER_DES_COMPOSANTS ? 'composant' : null;
    });
    return { nom, segments, minuscules, natures };
  });

  for (const lu of lus) {
    const rang = candidatDePalette(lu.minuscules);
    if (rang < 0 || !lu.segments[rang]) continue;
    const cle = JSON.stringify([lu.nom.portee, lu.segments.slice(0, rang + 1)]);
    const dernier = lu.minuscules[lu.minuscules.length - 1];
    if (crans.has(dernier)) {
      const nuances = cransParChemin.get(cle) ?? new Set<string>();
      nuances.add(dernier);
      cransParChemin.set(cle, nuances);
    }
    if (lu.nom.palette) cheminsDeclares.add(cle);
    const memeChemin = candidats.get(cle) ?? [];
    memeChemin.push({ lu, rang, cle });
    candidats.set(cle, memeChemin);
  }
  for (const [cle, variables] of candidats) {
    if (!cheminsDeclares.has(cle) && (cransParChemin.get(cle)?.size ?? 0) < SEUIL_DE_PALETTE) continue;
    for (const { lu, rang } of variables) lu.natures[rang] ??= 'palette';
  }

  const sansNature = new Set(lus.flatMap((lu) => lu.minuscules.filter((_, rang) => lu.natures[rang] === null)));
  const ordinaires = options.ordinaires ?? new Set<string>();
  const formesOrdinaires = new Map<string, boolean>();
  const estOrdinaire = (segment: string, minuscule: string): boolean => {
    if (ordinaires.size === 0) return false;
    let resultat = formesOrdinaires.get(segment);
    if (resultat === undefined) {
      const mots = decouperSegment(segment).map((mot) => mot.toLowerCase());
      resultat = [mots.join('-'), mots.join(''), minuscule].some((forme) => ordinaires.has(forme));
      formesOrdinaires.set(segment, resultat);
    }
    return resultat;
  };

  const resultat = new Map<string, readonly Nature[]>();
  for (const nom of tous) if (nom.categorie === 'collections') resultat.set(nom.id, nom.nom.split('/').map(() => null));
  for (const lu of lus) {
    resultat.set(lu.nom.id, lu.natures.map((nature, rang) => {
      if (!nature) return null;
      const minuscule = lu.minuscules[rang];
      return motDuReferentiel(minuscule) || sansNature.has(minuscule) || estOrdinaire(lu.segments[rang], minuscule) ? null : nature;
    }));
  }
  return resultat;
}

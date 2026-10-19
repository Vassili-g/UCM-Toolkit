/** Termes connus du kit et découpage des segments gardé par ce vocabulaire, pour la détection des questions. */
import { REGISTRES_ARCHITECTURE } from './architecture.js';
import { ABREVIATIONS, REGISTRES, SYNONYMES_COURANTS } from './vocabulaire.js';

/** Propriétés CSS usuelles : un segment qui en forme une reste un seul mot. */
export const TERMES_COMPOSES: readonly string[] = [
  'line-height', 'font-size', 'font-weight', 'font-family', 'font-style', 'letter-spacing', 'border-radius', 'border-width',
  'max-width', 'min-width', 'max-height', 'min-height', 'z-index', 'box-shadow', 'text-align', 'text-transform', 'text-decoration',
];
/** Mots courants des fichiers de tokens, connus pour le découpage sans appartenir à un registre. */
const MOTS_COURANTS = ['text', 'surface', 'search', 'spacing', 'gap', 'filter'];

const composesSoudes = new Map(TERMES_COMPOSES.map((terme) => [terme.replace(/-/g, ''), terme]));
const LONGUEUR_MINIMALE_D_UN_MORCEAU = 3;
const LONGUEUR_MINIMALE_D_UNE_FAUTE = 5;
const LONGUEUR_MAXIMALE_D_UN_BLOC = 40;

const termesConnus = new Set<string>([
  ...[...REGISTRES, ...REGISTRES_ARCHITECTURE].flatMap((registre) => registre.termes.flatMap((terme) => [terme.id, ...(terme.toleres ?? [])])),
  ...SYNONYMES_COURANTS.flat(),
  ...Object.entries(ABREVIATIONS).flat(),
  ...TERMES_COMPOSES,
  ...MOTS_COURANTS,
].map((terme) => terme.toLowerCase()));
const termesPourFautes = [...termesConnus].filter((terme) => terme.length >= LONGUEUR_MINIMALE_D_UNE_FAUTE && !terme.includes('-'));

/** Vrai si `a` et `b` diffèrent d'une seule lettre ajoutée, retirée ou remplacée. */
export function distanceUn(a: string, b: string): boolean {
  const x = [...a], y = [...b];
  if (Math.abs(x.length - y.length) > 1 || a === b) return false;
  let i = 0, j = 0, ecarts = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) { i++; j++; continue; }
    if (++ecarts > 1) return false;
    if (x.length >= y.length) i++;
    if (y.length >= x.length) j++;
  }
  return ecarts + Number(i < x.length || j < y.length) === 1;
}

/** Comme `distanceUn`, avec l'échange de deux lettres voisines (`bordre` pour `border`). */
export function distanceUnOuEchange(a: string, b: string): boolean {
  if (distanceUn(a, b)) return true;
  const x = [...a], y = [...b];
  if (x.length !== y.length || a === b) return false;
  const ecarts = x.flatMap((lettre, rang) => lettre === y[rang] ? [] : [rang]);
  return ecarts.length === 2 && ecarts[1] === ecarts[0] + 1 && x[ecarts[0]] === y[ecarts[1]] && x[ecarts[1]] === y[ecarts[0]];
}

export function termeConnu(mot: string): boolean {
  return termesConnus.has(mot.toLowerCase());
}

const formes = new Map<string, boolean>();
const fautes = new Map<string, boolean>();

/** Pluriel ou terminaison -ed/-d/-ing d'un terme connu. */
function formeConnue(mot: string): boolean {
  let resultat = formes.get(mot);
  if (resultat === undefined) {
    resultat = ['ed', 'd', 'ing', 's', 'es'].some((fin) => mot.endsWith(fin) && mot.length > fin.length + 1 && termesConnus.has(mot.slice(0, -fin.length)));
    formes.set(mot, resultat);
  }
  return resultat;
}

/** Faute à une lettre près (échange compris) d'un terme connu d'au moins cinq lettres, de même initiale. */
function fauteConnue(mot: string): boolean {
  if (mot.length < LONGUEUR_MINIMALE_D_UNE_FAUTE) return false;
  let resultat = fautes.get(mot);
  if (resultat === undefined) {
    resultat = termesPourFautes.some((terme) => terme[0] === mot[0] && distanceUnOuEchange(mot, terme));
    fautes.set(mot, resultat);
  }
  return resultat;
}

/** Pluriel, terminaison -ed/-d/-ing ou faute à une lettre près d'un terme connu. */
export function varianteConnue(mot: string): boolean {
  const minuscule = mot.toLowerCase();
  return formeConnue(minuscule) || fauteConnue(minuscule);
}

/** Terme connu, ou pluriel et terminaison d'un terme connu : un morceau « exact » du découpage. */
export function termeOuFormeConnu(mot: string): boolean {
  const minuscule = mot.toLowerCase();
  return termesConnus.has(minuscule) || formeConnue(minuscule);
}

const groupesDeSynonymes = [...SYNONYMES_COURANTS.map((groupe) => [...groupe] as string[]),
  ...Object.entries(ABREVIATIONS).map(([court, long]) => [court, long])];

/** Vrai si les deux mots sont synonymes, abréviation l'un de l'autre, ou formes d'un même mot (pluriel, -ed, -ing). Une négation n'en fait pas partie : voir `opposes`. */
export function memeConcept(a: string, b: string): boolean {
  if (groupesDeSynonymes.some((groupe) => groupe.includes(a) && groupe.includes(b))) return true;
  const [court, long] = a.length <= b.length ? [a, b] : [b, a];
  return ['ed', 'd', 'ing', 's', 'es'].some((fin) => long === court + fin);
}

/** Vrai si un mot est la négation de l'autre (`selected` / `unselected`, `active` / `inactive`) : deux états opposés, jamais une fusion. */
export function opposes(a: string, b: string): boolean {
  const [court, long] = a.length <= b.length ? [a, b] : [b, a];
  return ['un', 'non', 'non-', 'in', 'dis'].some((prefixe) => long === prefixe + court);
}

export function termeOuVarianteConnu(mot: string): boolean {
  return termeConnu(mot) || varianteConnue(mot);
}

type Decoupe = { readonly morceaux: readonly string[]; readonly approximatifs: number; readonly exacts: number };

/** Coupe un bloc de lettres en morceaux d'au moins trois lettres, dont un au moins exact et les autres connus ou fautifs. */
export function decouperUnBloc(bloc: string): string[] {
  const minuscule = bloc.toLowerCase();
  if (termeConnu(minuscule) || bloc.length > LONGUEUR_MAXIMALE_D_UN_BLOC || bloc.length < LONGUEUR_MINIMALE_D_UN_MORCEAU * 2) return [bloc];
  const solutions = new Map<number, Decoupe | null>();
  const meilleur = (a: Decoupe, b: Decoupe | null): Decoupe => !b || a.approximatifs < b.approximatifs
    || (a.approximatifs === b.approximatifs && a.morceaux.length < b.morceaux.length) ? a : b;
  function depuis(debut: number): Decoupe | null {
    if (debut === bloc.length) return { morceaux: [], approximatifs: 0, exacts: 0 };
    if (solutions.has(debut)) return solutions.get(debut)!;
    let gagnant: Decoupe | null = null;
    for (let fin = debut + LONGUEUR_MINIMALE_D_UN_MORCEAU; fin <= bloc.length; fin++) {
      const morceau = minuscule.slice(debut, fin);
      const exact = termeConnu(morceau) || formeConnue(morceau);
      if (!exact && !fauteConnue(morceau)) continue;
      const suite = depuis(fin);
      if (suite) gagnant = meilleur({ morceaux: [bloc.slice(debut, fin), ...suite.morceaux],
        approximatifs: suite.approximatifs + Number(!exact), exacts: suite.exacts + Number(exact) }, gagnant);
    }
    solutions.set(debut, gagnant);
    return gagnant;
  }
  const decoupe = depuis(0);
  return decoupe && decoupe.morceaux.length > 1 && decoupe.exacts > 0 ? [...decoupe.morceaux] : [bloc];
}

/** Recolle un nombre et le `xs` ou `xl` qui le suit : `5xl` est une taille, pas `5` et `xl`. */
function rassemblerLesTailles(morceaux: readonly string[]): string[] {
  const resultat: string[] = [];
  for (const morceau of morceaux) {
    const precedent = resultat[resultat.length - 1];
    if (precedent !== undefined && /^\p{N}+$/u.test(precedent) && /^x[sl]$/iu.test(morceau)) resultat[resultat.length - 1] = precedent + morceau;
    else resultat.push(morceau);
  }
  return resultat;
}

/**
 * Découpe un segment pour la détection des questions. Les séparateurs explicites, les chiffres et les sigles
 * coupent toujours ; la casse et les blocs soudés ne coupent que si chaque morceau est un terme connu
 * ou une faute proche. Un segment qui forme une propriété CSS usuelle devient ce terme composé,
 * et une taille (`5xl`, `2xs`) reste entière.
 */
export function decouperPourQuestions(segment: string): string[] {
  const compose = segment.replace(/(\p{Ll}|\p{N})(\p{Lu})/gu, '$1-$2').split(/[-_\s]+/u).filter(Boolean).join('-').toLowerCase();
  const termeCompose = TERMES_COMPOSES.includes(compose) ? compose : composesSoudes.get(compose.replace(/-/g, ''));
  if (termeCompose) return [termeCompose];
  const blocs = segment.split(/[-_\s]+/u).filter(Boolean)
    .flatMap((bloc) => rassemblerLesTailles(bloc.replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1\0$2').replace(/(\p{L})(\p{N})|(\p{N})(\p{L})/gu, '$1$3\0$2$4').split('\0')));
  return blocs.flatMap((bloc) => /\p{N}/u.test(bloc) || !/\p{L}/u.test(bloc) ? [bloc] : decouperUnBloc(bloc));
}

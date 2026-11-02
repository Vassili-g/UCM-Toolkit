/**
 * Dictionnaire des mots du corpus de noms justes et listes de candidats du stress test F1 (plan F1, sections 2.3 et 2.4).
 * Le module compte et rapproche des mots ; il ne classe rien. Le classement en « formes d'un même mot », « mots distincts »
 * et « synonymes » revient à la conversation principale, puis au mainteneur (Q-F6).
 */
import { REGISTRES_ARCHITECTURE, REGISTRES_COMPOSANTS } from '../../../src/referentiel/architecture.js';
import { distanceUnOuEchange, TERMES_COMPOSES, termeConnu } from '../../../src/referentiel/termes-connus.js';
import { ABREVIATIONS, REGISTRES, SYNONYMES_COURANTS } from '../../../src/referentiel/vocabulaire.js';
import type { Systeme } from './corpus.js';

export const LONGUEUR_MINIMALE_D_UN_MOT = 3;
export const DF_MINIMAL = 2;
export const TF_MINIMAL = 5;
export const PLAFOND_DE_SYNONYMES = 40;
export const TERMINAISONS = ['s', 'es', 'ed', 'd', 'ing'] as const;

/**
 * Les mots courants que le kit ajoute à son vocabulaire de découpage (`MOTS_COURANTS`, `termes-connus.ts`, non exporté).
 * `verifierLeVocabulaire` refuse la copie si le kit ne les connaît plus.
 */
const MOTS_COURANTS_DU_KIT = ['text', 'surface', 'search', 'spacing', 'gap', 'filter'];

/**
 * Les mots d'un nom tel que le système le publie : coupe sur les non-lettres et sur les passages de minuscule à majuscule, en
 * minuscules, de 3 lettres ou plus. Les préfixes de langage (`md.sys.`) restent, ce qui donne les 657 mots du plan.
 */
export function motsDuNom(nom: string): string[] {
  return nom.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^A-Za-z]+/)
    .map((mot) => mot.toLowerCase()).filter((mot) => mot.length >= LONGUEUR_MINIMALE_D_UN_MOT);
}

export interface MotDuDictionnaire {
  readonly mot: string;
  /** Le nombre de systèmes qui emploient le mot. */
  readonly df: number;
  /** Le nombre de noms qui contiennent le mot (une fois par nom). */
  readonly tf: number;
}
export interface Dictionnaire {
  /** Les mots distincts avant le filtre `df ≥ 2` ou `tf ≥ 5`. */
  readonly motsDistincts: number;
  readonly mots: readonly MotDuDictionnaire[];
  /** Mot vers les systèmes qui l'emploient. */
  readonly systemesDuMot: ReadonlyMap<string, ReadonlySet<string>>;
}

export function construireLeDictionnaire(systemes: readonly Systeme[]): Dictionnaire {
  const tf = new Map<string, number>();
  const systemesDuMot = new Map<string, Set<string>>();
  for (const systeme of systemes) {
    for (const { nom } of systeme.noms) {
      for (const mot of new Set(motsDuNom(nom))) {
        tf.set(mot, (tf.get(mot) ?? 0) + 1);
        const ensemble = systemesDuMot.get(mot) ?? new Set<string>();
        ensemble.add(systeme.id);
        systemesDuMot.set(mot, ensemble);
      }
    }
  }
  const mots = [...tf.entries()]
    .map(([mot, nombreDeNoms]) => ({ mot, df: systemesDuMot.get(mot)!.size, tf: nombreDeNoms }))
    .filter((entree) => entree.df >= DF_MINIMAL || entree.tf >= TF_MINIMAL)
    .sort((a, b) => a.mot.localeCompare(b.mot));
  return { motsDistincts: tf.size, mots, systemesDuMot };
}

export interface VocabulaireDeReference {
  /** Tous les termes en minuscules, avec leurs formes tolérées, synonymes, abréviations, composés et mots courants. */
  readonly termes: ReadonlySet<string>;
  /** Les termes alphabétiques sans tiret : la cible des fautes. */
  readonly alphabetiques: readonly string[];
}

/** Le vocabulaire du kit, relu depuis `src/referentiel/` ; `termeConnu` du kit confirme chaque terme hors registres de composant. */
export function vocabulaireDeReference(): VocabulaireDeReference {
  const termes = new Set<string>();
  const ajouter = (terme: string) => { termes.add(terme.toLowerCase()); };
  for (const registre of [...REGISTRES, ...REGISTRES_ARCHITECTURE, ...REGISTRES_COMPOSANTS]) {
    for (const terme of registre.termes) { ajouter(terme.id); for (const toleree of terme.toleres ?? []) ajouter(toleree); }
  }
  for (const groupe of SYNONYMES_COURANTS) for (const mot of groupe) ajouter(mot);
  for (const [court, long] of Object.entries(ABREVIATIONS)) { ajouter(court); ajouter(long); }
  for (const terme of TERMES_COMPOSES) ajouter(terme);
  for (const mot of MOTS_COURANTS_DU_KIT) {
    if (!termeConnu(mot)) throw new Error(`Le kit ne connaît plus le mot courant « ${mot} » : mettre à jour MOTS_COURANTS_DU_KIT dans dictionnaire.ts.`);
    ajouter(mot);
  }
  return { termes, alphabetiques: [...termes].filter((terme) => /^[a-z]+$/.test(terme)).sort() };
}

export interface PaireDeFormes {
  readonly base: string;
  readonly forme: string;
  readonly terminaison: (typeof TERMINAISONS)[number];
  readonly base_df: number; readonly base_tf: number; readonly forme_df: number; readonly forme_tf: number;
}

/** Les paires `x` / `x+s`, `x+es`, `x+ed`, `x+d`, `x+ing` dont les deux mots sont dans le dictionnaire. */
export function candidatsDeFormes(dictionnaire: Dictionnaire): PaireDeFormes[] {
  const parMot = new Map(dictionnaire.mots.map((entree) => [entree.mot, entree]));
  const paires: PaireDeFormes[] = [];
  for (const base of dictionnaire.mots) {
    for (const terminaison of TERMINAISONS) {
      const forme = parMot.get(base.mot + terminaison);
      if (forme) paires.push({ base: base.mot, forme: forme.mot, terminaison, base_df: base.df, base_tf: base.tf, forme_df: forme.df, forme_tf: forme.tf });
    }
  }
  return paires;
}

export interface PaireADistanceUn {
  readonly a: string; readonly b: string; readonly longueur: number;
  readonly a_df: number; readonly a_tf: number; readonly b_df: number; readonly b_tf: number;
}

/** Les paires de mots du dictionnaire à une lettre ajoutée, retirée, remplacée ou échangée ; elles comprennent les paires de formes. */
export function candidatsADistanceUn(dictionnaire: Dictionnaire): PaireADistanceUn[] {
  const paires: PaireADistanceUn[] = [];
  const mots = dictionnaire.mots;
  for (let i = 0; i < mots.length; i++) {
    for (let j = i + 1; j < mots.length; j++) {
      const a = mots[i], b = mots[j];
      if (Math.abs(a.mot.length - b.mot.length) > 1 || !distanceUnOuEchange(a.mot, b.mot)) continue;
      paires.push({ a: a.mot, b: b.mot, longueur: Math.min(a.mot.length, b.mot.length), a_df: a.df, a_tf: a.tf, b_df: b.df, b_tf: b.tf });
    }
  }
  return paires;
}

export interface MotAmbigu {
  readonly mot: string; readonly df: number; readonly tf: number;
  /** Vrai quand le mot est lui-même un terme du vocabulaire : P-05 ne compte que les mots qui n'en sont pas. */
  readonly dansLeVocabulaire: boolean;
  /** Les termes du vocabulaire à distance 1 (échange compris). */
  readonly termes: readonly string[];
}

/** Les mots du dictionnaire à distance 1 de deux termes du vocabulaire ou plus (cas d'ambiguïté de P-05). */
export function candidatsAmbigus(dictionnaire: Dictionnaire, vocabulaire: VocabulaireDeReference): MotAmbigu[] {
  const resultat: MotAmbigu[] = [];
  for (const entree of dictionnaire.mots) {
    const termes = vocabulaire.alphabetiques.filter((terme) => terme.length >= LONGUEUR_MINIMALE_D_UN_MOT && distanceUnOuEchange(entree.mot, terme));
    if (termes.length >= 2) resultat.push({ mot: entree.mot, df: entree.df, tf: entree.tf, dansLeVocabulaire: vocabulaire.termes.has(entree.mot), termes });
  }
  return resultat;
}

export interface PaireDeSynonymes {
  readonly a: string; readonly b: string;
  /** Le nombre de systèmes où l'un des deux mots occupe une place que l'autre occupe ailleurs. */
  readonly systemes: number;
  readonly places: readonly string[];
}

/**
 * Les paires (A, B) du dictionnaire qui occupent la même place (mot précédent, rang) dans deux systèmes ou plus, et qui ne
 * coexistent sous le même parent dans aucun système, hors groupes de `SYNONYMES_COURANTS`, abréviations et formes tolérées.
 * Les mots viennent du découpage en mots de chaque nom (`motsDuNom`) ; le parent est le mot qui précède.
 */
export function candidatsDeSynonymes(systemes: readonly Systeme[], dictionnaire: Dictionnaire): PaireDeSynonymes[] {
  const dansLeDictionnaire = new Set(dictionnaire.mots.map((entree) => entree.mot));
  const tfParMot = new Map(dictionnaire.mots.map((entree) => [entree.mot, entree.tf]));
  const placesDuMot = new Map<string, Map<string, Set<string>>>();
  const enfants = new Map<string, Set<string>>();
  for (const systeme of systemes) {
    for (const { nom } of systeme.noms) {
      const mots = motsDuNom(nom);
      mots.forEach((mot, rang) => {
        if (!dansLeDictionnaire.has(mot)) return;
        const parent = rang === 0 ? '' : mots[rang - 1];
        const place = `${parent}#${rang}`;
        const parPlace = placesDuMot.get(place) ?? new Map<string, Set<string>>();
        const ensemble = parPlace.get(mot) ?? new Set<string>();
        ensemble.add(systeme.id);
        parPlace.set(mot, ensemble);
        placesDuMot.set(place, parPlace);
        const cle = `${systeme.id}|${parent}`;
        const freres = enfants.get(cle) ?? new Set<string>();
        freres.add(mot);
        enfants.set(cle, freres);
      });
    }
  }
  const connues = new Set<string>();
  const memeGroupe = (a: string, b: string) => connues.has(`${a}|${b}`);
  for (const groupe of [...SYNONYMES_COURANTS.map((g) => [...g]), ...Object.entries(ABREVIATIONS)]) {
    for (const a of groupe) for (const b of groupe) connues.add(`${a}|${b}`);
  }
  for (const registre of [...REGISTRES, ...REGISTRES_ARCHITECTURE, ...REGISTRES_COMPOSANTS]) {
    for (const terme of registre.termes) for (const toleree of terme.toleres ?? []) { connues.add(`${terme.id}|${toleree}`); connues.add(`${toleree}|${terme.id}`); }
  }
  const coexistent = (a: string, b: string): boolean => [...enfants.values()].some((freres) => freres.has(a) && freres.has(b));

  const paires = new Map<string, { systemes: Set<string>; places: Set<string> }>();
  for (const [place, parPlace] of placesDuMot) {
    const mots = [...parPlace.keys()].sort();
    for (let i = 0; i < mots.length; i++) {
      for (let j = i + 1; j < mots.length; j++) {
        const cle = `${mots[i]}|${mots[j]}`;
        const entree = paires.get(cle) ?? { systemes: new Set<string>(), places: new Set<string>() };
        for (const id of parPlace.get(mots[i])!) entree.systemes.add(id);
        for (const id of parPlace.get(mots[j])!) entree.systemes.add(id);
        entree.places.add(place);
        paires.set(cle, entree);
      }
    }
  }
  const retenues: PaireDeSynonymes[] = [];
  for (const [cle, entree] of paires) {
    const [a, b] = cle.split('|');
    if (entree.systemes.size < 2 || memeGroupe(a, b)) continue;
    if (coexistent(a, b)) continue;
    retenues.push({ a, b, systemes: entree.systemes.size, places: [...entree.places].sort().slice(0, 5) });
  }
  const poids = (paire: PaireDeSynonymes) => (tfParMot.get(paire.a) ?? 0) + (tfParMot.get(paire.b) ?? 0);
  return retenues.sort((x, y) => y.systemes - x.systemes || y.places.length - x.places.length || poids(y) - poids(x) || x.a.localeCompare(y.a) || x.b.localeCompare(y.b))
    .slice(0, PLAFOND_DE_SYNONYMES);
}

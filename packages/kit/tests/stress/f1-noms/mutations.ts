/**
 * Opérateurs de mutation du stress test F1 (plan F1, section 3.3) : chaque fonction part d'un mot et rend des mots, sans rien
 * savoir du fichier où ils seront placés. Le tirage dépend de la graine, du mot et de l'opérateur, pas de l'ordre d'appel.
 */
import { choisir, graineDe, melanger, mulberry32 } from '../commun/prng.js';
import { distanceUnOuEchange } from '../../../src/referentiel/termes-connus.js';

export type OperateurDeFaute = 'M-01' | 'M-02' | 'M-03' | 'M-04' | 'M-05';
export const OPERATEURS_DE_FAUTE: readonly OperateurDeFaute[] = ['M-01', 'M-02', 'M-03', 'M-04', 'M-05'];

export interface Mutation {
  readonly operateur: OperateurDeFaute | 'M-06';
  /** La position de la mutation, par exemple `milieu` ou `en-fin`. */
  readonly variante: string;
  readonly source: string;
  readonly mot: string;
}

/** Vrai si le mot ne doit pas servir de mutation : vocabulaire, dictionnaire ou forme d'un terme du kit. */
export type Ecarteur = (mot: string) => boolean;

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const CLAVIER_QWERTY = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const CLAVIER_AZERTY = ['azertyuiop', 'qsdfghjklm', 'wxcvbn'];

/** Les lettres voisines d'une lettre sur un clavier français ou anglais : gauche, droite, rangées du dessus et du dessous. */
export function voisinesSurLeClavier(lettre: string): string[] {
  const trouvees = new Set<string>();
  for (const clavier of [CLAVIER_QWERTY, CLAVIER_AZERTY]) {
    clavier.forEach((rangee, r) => {
      const c = rangee.indexOf(lettre);
      if (c < 0) return;
      for (const [dr, dc] of [[0, -1], [0, 1], [-1, 0], [-1, -1], [1, 0], [1, 1]]) {
        const lettreVoisine = clavier[r + dr]?.[c + dc];
        if (lettreVoisine && lettreVoisine !== lettre) trouvees.add(lettreVoisine);
      }
    });
  }
  return [...trouvees].sort();
}

const milieu = (mot: string): number => Math.floor(mot.length / 2);
const valide = (source: string, mot: string): boolean => /^[a-z]+$/.test(mot) && mot !== source && distanceUnOuEchange(source, mot);

interface Tirage { readonly graine: number; readonly ecarte: Ecarteur }

/** Le premier mot valide parmi des candidats que la graine ordonne. */
function premierValide(source: string, candidats: readonly string[], etiquette: string, { graine, ecarte }: Tirage, deja: ReadonlySet<string>): string | undefined {
  const ordre = melanger(mulberry32(graineDe(graine, etiquette)), candidats);
  return ordre.find((mot) => valide(source, mot) && !ecarte(mot) && !deja.has(mot));
}

const inserer = (mot: string, rang: number, lettre: string) => mot.slice(0, rang) + lettre + mot.slice(rang);
const retirer = (mot: string, rang: number) => mot.slice(0, rang) + mot.slice(rang + 1);
const remplacer = (mot: string, rang: number, lettre: string) => mot.slice(0, rang) + lettre + mot.slice(rang + 1);

/** Échange la paire de lettres distinctes la plus proche de `depuis`, vers la droite puis vers la gauche (plancher 1). */
function echanger(mot: string, depuis: number): string | undefined {
  const rangs: number[] = [];
  for (let r = depuis; r < mot.length - 1; r++) rangs.push(r);
  for (let r = depuis - 1; r >= 1; r--) rangs.push(r);
  const rang = rangs.find((r) => mot[r] !== mot[r + 1]);
  return rang === undefined ? undefined : mot.slice(0, rang) + mot[rang + 1] + mot[rang] + mot.slice(rang + 2);
}

/** Les mutations d'un opérateur M-01 à M-05 pour un mot : les variantes invalides, écartées ou déjà tirées disparaissent. */
export function mutationsDe(source: string, operateur: OperateurDeFaute, tirage: Tirage): Mutation[] {
  const rendues: Mutation[] = [];
  const deja = new Set<string>();
  const garder = (variante: string, mot: string | undefined) => {
    if (mot === undefined || deja.has(mot)) return;
    deja.add(mot);
    rendues.push({ operateur, variante, source, mot });
  };
  const etiquette = (variante: string) => `${source}/${operateur}/${variante}`;
  const voisines = (rang: number) => voisinesSurLeClavier(source[rang]);
  const m = milieu(source), dernier = source.length - 1;
  switch (operateur) {
    case 'M-01': {
      const rangDouble = choisir(mulberry32(graineDe(tirage.graine, etiquette('doublement'))), Array.from({ length: source.length }, (_, i) => i));
      garder('doublement', premierValide(source, [inserer(source, rangDouble, source[rangDouble])], etiquette('doublement'), tirage, deja));
      garder('apres-premiere', premierValide(source, ALPHABET.map((l) => inserer(source, 1, l)), etiquette('apres-premiere'), tirage, deja));
      garder('en-fin', premierValide(source, ALPHABET.map((l) => source + l), etiquette('en-fin'), tirage, deja));
      break;
    }
    case 'M-02':
      garder('deuxieme', premierValide(source, [retirer(source, 1)], etiquette('deuxieme'), tirage, deja));
      garder('milieu', premierValide(source, [retirer(source, m)], etiquette('milieu'), tirage, deja));
      garder('derniere', premierValide(source, [retirer(source, dernier)], etiquette('derniere'), tirage, deja));
      break;
    case 'M-03':
      for (const [variante, rang] of [['deuxieme', 1], ['milieu', m], ['derniere', dernier]] as const) {
        garder(variante, premierValide(source, voisines(rang).map((l) => remplacer(source, rang, l)), etiquette(variante), tirage, deja));
      }
      break;
    case 'M-04': {
      const apres = echanger(source, 1), centre = echanger(source, m);
      garder('apres-premiere', apres && premierValide(source, [apres], etiquette('apres-premiere'), tirage, deja));
      garder('milieu', centre && premierValide(source, [centre], etiquette('milieu'), tirage, deja));
      break;
    }
    case 'M-05':
      garder('retrait-premiere', premierValide(source, [retirer(source, 0)], etiquette('retrait-premiere'), tirage, deja));
      garder('remplacement-premiere', premierValide(source, voisines(0).map((l) => remplacer(source, 0, l)), etiquette('remplacement-premiere'), tirage, deja));
      break;
  }
  return rendues;
}

/** Toutes les mutations d'un mot à une lettre, pour un test de couverture ou la recherche de mots ambigus. */
export function voisinsAUneLettre(mot: string): string[] {
  const voisins = new Set<string>();
  for (let r = 0; r <= mot.length; r++) for (const l of ALPHABET) voisins.add(inserer(mot, r, l));
  for (let r = 0; r < mot.length; r++) {
    voisins.add(retirer(mot, r));
    for (const l of ALPHABET) voisins.add(remplacer(mot, r, l));
    if (r < mot.length - 1) voisins.add(mot.slice(0, r) + mot[r + 1] + mot[r] + mot.slice(r + 2));
  }
  voisins.delete(mot);
  return [...voisins].filter((voisin) => /^[a-z]+$/.test(voisin) && distanceUnOuEchange(mot, voisin)).sort();
}

/**
 * M-06, hors oracle : deux lettres modifiées par deux opérateurs parmi M-01 à M-03. Le mot rendu est écarté s'il tombe à une
 * lettre du mot source (c'est alors une faute de M-01 à M-03).
 */
export function mutationsADeuxLettres(source: string, nombre: number, tirage: Tirage): Mutation[] {
  const tirer = mulberry32(graineDe(tirage.graine, `${source}/M-06`));
  const rendues: Mutation[] = [];
  const deja = new Set<string>();
  for (let essai = 0; essai < 60 && rendues.length < nombre; essai++) {
    let mot = source;
    for (let fois = 0; fois < 2; fois++) {
      const rang = choisir(tirer, Array.from({ length: mot.length }, (_, i) => i));
      const sorte = choisir(tirer, ['ajout', 'retrait', 'remplacement'] as const);
      const lettre = sorte === 'remplacement' ? choisir(tirer, voisinesSurLeClavier(mot[rang]) as readonly string[]) : choisir(tirer, ALPHABET);
      mot = sorte === 'ajout' ? inserer(mot, rang, lettre) : sorte === 'retrait' ? retirer(mot, rang) : remplacer(mot, rang, lettre);
      if (mot.length < 2) break;
    }
    if (mot.length < 3 || !/^[a-z]+$/.test(mot) || mot === source || distanceUnOuEchange(source, mot) || tirage.ecarte(mot) || deja.has(mot)) continue;
    deja.add(mot);
    rendues.push({ operateur: 'M-06', variante: `essai-${essai}`, source, mot });
  }
  return rendues;
}

/** M-10 : pluriel. */
export const pluriels = (mot: string): string[] => [`${mot}s`, `${mot}es`];
/** M-11 : terminaison. */
export const terminaisons = (mot: string): string[] => [`${mot}ed`, `${mot}d`, `${mot}ing`];
/** M-09 : suffixes et préfixes d'une forme tolérée composée. */
export const SUFFIXES_DE_FORME_COMPOSEE = ['thin', 'strong', '2'] as const;
export function formeComposee(forme: string, suffixe: string, attache: 'suffixe' | 'prefixe'): string {
  return attache === 'suffixe' ? `${forme}-${suffixe}` : `${suffixe}-${forme}`;
}

export type CasseDeMot = 'initiale' | 'majuscules' | 'interne' | 'pascal';
export const CASSES: readonly CasseDeMot[] = ['pascal', 'majuscules', 'interne', 'initiale'];
const capitale = (mot: string) => mot[0].toUpperCase() + mot.slice(1);
/** M-12 : le mot écrit dans une casse. `pascal` colle le mot à son voisin (`NeighbourWord`) ; `interne` met la lettre du milieu en capitale. */
export function ecrireEnCasse(mot: string, casse: CasseDeMot, voisin: string): string {
  switch (casse) {
    case 'initiale': return capitale(mot);
    case 'majuscules': return mot.toUpperCase();
    case 'interne': return remplacer(mot, milieu(mot), mot[milieu(mot)].toUpperCase());
    case 'pascal': return capitale(voisin) + capitale(mot);
  }
}

export type SeparateurDeMots = 'tiret' | 'soulignement' | 'espace' | 'camel' | 'pascal' | 'soude';
export const SEPARATEURS: readonly SeparateurDeMots[] = ['tiret', 'soulignement', 'espace', 'camel', 'pascal', 'soude'];
/** M-13 : des mots joints par un séparateur ou par la casse. */
export function joindre(mots: readonly string[], separateur: SeparateurDeMots): string {
  switch (separateur) {
    case 'tiret': return mots.join('-');
    case 'soulignement': return mots.join('_');
    case 'espace': return mots.join(' ');
    case 'camel': return mots.map((mot, rang) => (rang === 0 ? mot : capitale(mot))).join('');
    case 'pascal': return mots.map(capitale).join('');
    case 'soude': return mots.join('');
  }
}

/** M-14 : deux mots soudés, le second portant éventuellement une faute. */
export const souder = (a: string, b: string): string => `${a}${b}`;

/** La fonction `choisir` de la graine pour les scénarios : un élément qui ne dépend que de l'étiquette. */
export const tirerParEtiquette = (graine: number, etiquette: string) => mulberry32(graineDe(graine, etiquette));

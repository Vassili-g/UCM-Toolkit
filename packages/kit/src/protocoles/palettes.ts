/**
 * Les données que UCM Palettes range dans le fichier Figma et que d'autres plugins lisent : la recette, le suivi des
 * variables, la marque `nommage` et les marqueurs `palette` et `cle` d'une variable. Chaque donnée porte son adresse, sa
 * version et son classement. Les adresses sont déclarées dans `referentiel/produits.ts` et republiées ici.
 *
 * Le kit ne touche pas Figma : les écritures restent dans le plugin producteur, et chaque lecteur reçoit le texte ou une
 * fonction `lire` qui appelle Figma.
 *
 * Après une modification : relancer `npm test`, relancer les tests des plugins qui lisent ces données, et changer la
 * version du kit.
 */
import { INTENSITE_UNIQUE, MODES, PROFILS } from '../referentiel/vocabulaire.js';
import { classerLaDonnee, lireLaDonnee, type DonneeLue, type FenetreDeVersions } from './donnee.js';

export { CLE_NOMMAGE_DE_PALETTES, CLE_RECETTE, CLES_PARTAGEES_DE_PALETTES, ESPACE_PARTAGE } from '../referentiel/produits.js';

type Mode = (typeof MODES)[number];
type Profil = (typeof PROFILS)[number];

const estUnObjet = (valeur: unknown): valeur is Record<string, unknown> => typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);

// La recette

/** Les formats de recette que le kit classe. Les formats 8 à 11 se lisent en format 12 dans `ucm-couleur`. */
export const FENETRE_DE_LA_RECETTE: FenetreDeVersions = { champ: 'formatVersion', courante: 12, premiere: 8 };

/**
 * Classe le texte rangé sous `CLE_RECETTE`. Une recette sans `formatVersion` reste illisible. Le kit juge l'enveloppe ;
 * `ucm-couleur` garde le type `Recette`, sa validation et les migrations des formats 8 à 11, qui lisent les bornes et les
 * valeurs par défaut du moteur.
 */
export function classerLEnveloppeDeLaRecette(texte: string | undefined): DonneeLue<Record<string, unknown>> {
  return classerLaDonnee(texte, FENETRE_DE_LA_RECETTE);
}

// Le suivi des variables

export const VERSION_DU_SUIVI_DES_VARIABLES = 1;

/** Un suivi sans version se lit comme la version 1. */
export const FENETRE_DU_SUIVI: FenetreDeVersions = { champ: 'version', courante: 1, premiere: 1, parDefaut: 1 };

/** Le mode qu'une entrée écrit : `unique` quand les thèmes sont dans le chemin, sinon son thème. */
export type ModeDuSuivi = typeof INTENSITE_UNIQUE | Mode;

export interface VariableSuivie {
  readonly id: string;
  /** La dernière couleur que le plugin y a écrite, en hexa majuscule. */
  readonly ecrite: string;
}

/**
 * `destination` : la palette suit la destination des tokens, et une écriture crée ce qui manque. `reprise` : ses clés
 * désignent les variables d'origine d'une palette du fichier, et celles que l'écriture crée sous leur chemin, dans leur
 * collection.
 */
export type Liaison = 'destination' | 'reprise';

export interface PaletteSuivie {
  /** Une sortie conservée après migration, à retirer avec sa propre confirmation. */
  readonly sortieAnterieureDe?: string;
  /** L'identifiant de la collection qui porte les variables de la palette. */
  readonly collection: string;
  /** Le groupe de référence : source de la reprise, puis groupe de la dernière écriture. */
  readonly groupe: string;
  /** L'identifiant du mode de Figma que chaque mode du plan écrit. */
  readonly modes: { readonly [M in ModeDuSuivi]?: string };
  /** Par clé du plan. */
  readonly variables: { readonly [cle: string]: VariableSuivie };
  readonly liaison: Liaison;
  /**
   * Pour une liaison de reprise déjà écrite, le chemin commun des variables d'origine à la reprise : l'écriture les
   * range ensuite sous un segment de thème ou d'intensité, et leurs noms ne le rendent plus.
   */
  readonly chemin?: string;
  /** Pour une liaison de reprise écrite à deux intensités, celle que les variables d'origine portent. */
  readonly intensite?: Profil;
}

/** Ce que la lecture complète rend ; la destination reste brute, Palettes la valide. */
export interface SuiviLu {
  readonly destination: unknown;
  readonly confirmee: unknown;
  readonly palettes: { readonly [id: string]: PaletteSuivie };
}

function lireLaPalette(valeur: unknown): PaletteSuivie | null {
  if (!estUnObjet(valeur) || typeof valeur.collection !== 'string') return null;
  const modes: { [M in ModeDuSuivi]?: string } = {};
  if (estUnObjet(valeur.modes)) {
    for (const mode of [INTENSITE_UNIQUE, ...MODES]) {
      const id = valeur.modes[mode];
      if (typeof id === 'string') modes[mode] = id;
    }
  }
  const variables: Record<string, VariableSuivie> = {};
  if (estUnObjet(valeur.variables)) {
    for (const [cle, variable] of Object.entries(valeur.variables)) {
      if (estUnObjet(variable) && typeof variable.id === 'string' && typeof variable.ecrite === 'string') {
        variables[cle] = { id: variable.id, ecrite: variable.ecrite.toUpperCase() };
      }
    }
  }
  return {
    collection: valeur.collection,
    groupe: typeof valeur.groupe === 'string' ? valeur.groupe : '',
    modes,
    variables,
    liaison: valeur.liaison === 'reprise' ? 'reprise' : 'destination',
    ...(typeof valeur.sortieAnterieureDe === 'string' ? { sortieAnterieureDe: valeur.sortieAnterieureDe } : {}),
    ...(typeof valeur.chemin === 'string' ? { chemin: valeur.chemin } : {}),
    ...(PROFILS.includes(valeur.intensite as Profil) ? { intensite: valeur.intensite as Profil } : {}),
  };
}

/**
 * La lecture complète du suivi. Une version future ne se lit pas : sa forme est inconnue, la lecture rend `future` sans
 * palette. Une entrée de palette d'une forme inattendue est ignorée sans écarter les autres.
 *
 * Elle ne remplace pas `identifiantsDuSuivi`. Un suivi futur y perd ses palettes, donc les variables qu'il protège ;
 * le relevé conservateur les garde. Les deux lecteurs ne fusionnent pas.
 */
export function lireLeSuiviComplet(texte: string): DonneeLue<SuiviLu> {
  const classee = classerLaDonnee(texte, FENETRE_DU_SUIVI);
  if (classee.etat !== 'ancienne' && classee.etat !== 'courante') return classee;
  const brutes = classee.valeur.palettes;
  const palettes: Record<string, PaletteSuivie> = {};
  if (estUnObjet(brutes)) {
    for (const [id, valeur] of Object.entries(brutes)) {
      const palette = lireLaPalette(valeur);
      if (palette) palettes[id] = palette;
    }
  }
  return {
    etat: classee.etat,
    version: classee.version,
    valeur: { destination: classee.valeur.destination, confirmee: classee.valeur.confirmee, palettes },
  };
}

/**
 * Le relevé conservateur : les identifiants de variables que le suivi tient pour siennes (`palettes.*.variables.*.id`),
 * quelle que soit la version. Un texte illisible ou d'une autre forme ne donne aucun identifiant et ne lève pas.
 *
 * Il sert à protéger les variables : un suivi d'une version plus récente garde ses identifiants, alors que
 * `lireLeSuiviComplet` le refuse. Les deux lecteurs ne fusionnent pas.
 */
export function identifiantsDuSuivi(texte: string): ReadonlySet<string> {
  const ids = new Set<string>();
  if (!texte) return ids;
  try {
    const racine: unknown = JSON.parse(texte);
    const palettes = (racine as { palettes?: unknown } | null)?.palettes;
    if (typeof palettes !== 'object' || palettes === null) return ids;
    for (const palette of Object.values(palettes)) {
      const variables = (palette as { variables?: unknown } | null)?.variables;
      if (typeof variables !== 'object' || variables === null) continue;
      for (const suivie of Object.values(variables)) {
        const id = (suivie as { id?: unknown } | null)?.id;
        if (typeof id === 'string' && id !== '') ids.add(id);
      }
    }
  } catch { /* texte illisible : aucune protection ajoutée */ }
  return ids;
}

// La marque `nommage`

export const VERSION_DE_LA_MARQUE = 1;

const FENETRE_DE_LA_MARQUE: FenetreDeVersions = { champ: 'version', courante: VERSION_DE_LA_MARQUE, premiere: VERSION_DE_LA_MARQUE };

/**
 * La marque `nommage` que Palettes range à la racine de `ESPACE_PARTAGE`. `courante` : un JSON objet de `version: 1`.
 * `future` : un objet dont `version` est un entier supérieur à 1. `illisible` : tout autre texte non vide. `refusee` :
 * la lecture a levé.
 */
export type EtatDeLaMarque = 'absente' | 'courante' | 'illisible' | 'future' | 'refusee';

/** La marque n'a qu'une version : `ancienne` n'existe pas encore pour elle. */
function etatDuTexteDeLaMarque(lue: ReturnType<typeof classerLaDonnee>): Exclude<EtatDeLaMarque, 'refusee'> {
  switch (lue.etat) {
    case 'absente': return 'absente';
    case 'future': return 'future';
    case 'illisible': return 'illisible';
    case 'ancienne':
    case 'courante': return 'courante';
  }
}

export function classerLaMarqueDeNommage(texte: string): Exclude<EtatDeLaMarque, 'refusee'> {
  return etatDuTexteDeLaMarque(classerLaDonnee(texte, FENETRE_DE_LA_MARQUE));
}

/** Lit la marque par `lire`, qui appelle Figma ; une exception donne `refusee`. */
export function lireLaMarqueDeNommage(lire: () => string): EtatDeLaMarque {
  const lue = lireLaDonnee(lire, (texte) => classerLaDonnee(texte, FENETRE_DE_LA_MARQUE));
  return lue.etat === 'refusee' ? 'refusee' : etatDuTexteDeLaMarque(lue);
}

/** Le texte que Palettes range sous `CLE_NOMMAGE_DE_PALETTES`. */
export function texteDeLaMarque(): string {
  return JSON.stringify({ version: VERSION_DE_LA_MARQUE });
}

// Les marqueurs d'une variable

/**
 * Le marqueur `palette` n'est pas versionné : un texte non vide prouve que Palettes suit la variable. Il rend
 * l'identifiant de la palette, ou `null` quand le marqueur est vide.
 *
 * Le marqueur `cle` est un texte libre, la clé du plan de la variable. Avant de changer le sens de l'un de ces deux
 * marqueurs, il faudra leur donner une version.
 */
export function marqueurDePaletteLu(texte: string): string | null {
  return texte === '' ? null : texte;
}

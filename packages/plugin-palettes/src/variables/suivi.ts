/**
 * Le suivi des variables ([VAR-04]) : ce que le plugin range sous la clé
 * partagée `ucm_palettes/variables` pour reconnaître ses variables par
 * identifiant, jamais par leur nom. Il porte la destination, et pour chaque
 * palette la collection, le groupe et les modes de sa dernière écriture,
 * puis l'identifiant et la dernière couleur écrite de chaque variable.
 *
 * Il se lit comme le suivi des cadres : une forme inattendue se lit comme
 * un suivi vide, et un suivi d'une version plus récente refuse toute
 * écriture. Pur : `src/ecriture/variables.ts` le range.
 */
import { DESTINATION_PAR_DEFAUT, validerLaDestination, type Destination } from './destination';
import type { ModeDuPlan } from './plan';

/** La clé du suivi des variables, dans l'espace partagé du plugin. */
export const CLE_VARIABLES = 'variables';

export const VERSION_DU_SUIVI_DES_VARIABLES = 1;

/** Les données partagées qu'une variable écrite porte : sa palette et sa clé du plan. Un repère, jamais une preuve de propriété. */
export const CLES_DE_LA_VARIABLE = { palette: 'palette', cle: 'cle' } as const;

export interface VariableSuivie {
  readonly id: string;
  /** La dernière couleur que le plugin y a écrite, en hexa majuscule. */
  readonly ecrite: string;
}

/**
 * `destination` : la palette suit la destination des tokens, et une
 * écriture crée ce qui manque. `reprise` : ses clés désignent les variables
 * d'origine d'une palette du fichier, qu'aucune écriture ne crée, ne renomme
 * ni ne déplace ([VAR-13]).
 */
export type Liaison = 'destination' | 'reprise';

export interface PaletteSuivie {
  /** L'identifiant de la collection qui porte les variables de la palette. */
  readonly collection: string;
  /** Le groupe de la destination à la dernière écriture : un groupe différent demande une mise à jour. */
  readonly groupe: string;
  /** L'identifiant du mode de Figma que chaque mode du plan écrit. */
  readonly modes: { readonly [M in ModeDuPlan]?: string };
  /** Par clé du plan. */
  readonly variables: { readonly [cle: string]: VariableSuivie };
  readonly liaison: Liaison;
}

export interface SuiviDesVariables {
  readonly version: number;
  readonly destination: Destination;
  /** Vrai quand le designer a enregistré la destination une fois : la première écriture n'ouvre plus sa carte. */
  readonly confirmee: boolean;
  readonly palettes: { readonly [id: string]: PaletteSuivie };
}

export const SUIVI_VIDE: SuiviDesVariables = { version: VERSION_DU_SUIVI_DES_VARIABLES, destination: DESTINATION_PAR_DEFAUT, confirmee: false, palettes: {} };

const estUnObjet = (valeur: unknown): valeur is Record<string, unknown> => typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);

function lireLaPalette(valeur: unknown): PaletteSuivie | null {
  if (!estUnObjet(valeur) || typeof valeur.collection !== 'string') return null;
  const modes: { [M in ModeDuPlan]?: string } = {};
  if (estUnObjet(valeur.modes)) {
    for (const mode of ['unique', 'light', 'dark'] as const) {
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
  };
}

/**
 * Le suivi que le texte rangé décrit. Un texte vide, illisible ou d'une
 * forme inattendue donne un suivi vide, que la prochaine écriture
 * remplace ; un champ inattendu est ignoré sans écarter les autres. Un suivi
 * sans version se lit comme la version 1.
 */
export function lireLeSuivi(texte: string): SuiviDesVariables {
  if (texte === '') return SUIVI_VIDE;
  let lu: unknown;
  try {
    lu = JSON.parse(texte);
  } catch {
    return SUIVI_VIDE;
  }
  if (!estUnObjet(lu)) return SUIVI_VIDE;
  const version = typeof lu.version === 'number' ? lu.version : 1;
  // Un suivi d'une version plus récente ne se lit pas : sa forme n'est pas connue.
  if (version > VERSION_DU_SUIVI_DES_VARIABLES) return { ...SUIVI_VIDE, version };
  const validee = validerLaDestination(lu.destination);
  const palettes: Record<string, PaletteSuivie> = {};
  if (estUnObjet(lu.palettes)) {
    for (const [id, valeur] of Object.entries(lu.palettes)) {
      const palette = lireLaPalette(valeur);
      if (palette) palettes[id] = palette;
    }
  }
  const lisible = 'destination' in validee;
  return {
    version,
    destination: lisible ? validee.destination : DESTINATION_PAR_DEFAUT,
    // Une destination illisible revient au défaut, que le designer confirme de nouveau.
    confirmee: lisible && lu.confirmee === true,
    palettes,
  };
}

/** Vrai quand le suivi vient d'une version plus récente du plugin : rien ne s'y écrit. */
export function suiviFutur(suivi: SuiviDesVariables): boolean {
  return suivi.version > VERSION_DU_SUIVI_DES_VARIABLES;
}

/** Le texte à ranger pour un suivi, à la version courante. */
export function texteDuSuivi(suivi: SuiviDesVariables): string {
  return JSON.stringify({ ...suivi, version: VERSION_DU_SUIVI_DES_VARIABLES });
}

/** Les identifiants de toutes les variables que le suivi désigne, toutes palettes confondues. */
export function variablesSuivies(suivi: SuiviDesVariables): Set<string> {
  const ids = new Set<string>();
  for (const palette of Object.values(suivi.palettes)) {
    for (const variable of Object.values(palette.variables)) ids.add(variable.id);
  }
  return ids;
}

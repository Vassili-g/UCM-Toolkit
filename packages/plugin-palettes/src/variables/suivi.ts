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
import {
  VERSION_DU_SUIVI_DES_VARIABLES,
  lireLeSuiviComplet,
  type Liaison,
  type PaletteSuivie,
  type VariableSuivie,
} from '@ucm-kit/core/protocoles';

import { DESTINATION_PAR_DEFAUT, validerLaDestination, type Destination } from './destination';

export { VERSION_DU_SUIVI_DES_VARIABLES };
export type { Liaison, PaletteSuivie, VariableSuivie };

export interface SuiviDesVariables {
  readonly version: number;
  readonly destination: Destination;
  /** Vrai quand le designer a enregistré la destination une fois : la première écriture n'ouvre plus sa carte. */
  readonly confirmee: boolean;
  readonly palettes: { readonly [id: string]: PaletteSuivie };
}

export const SUIVI_VIDE: SuiviDesVariables = { version: VERSION_DU_SUIVI_DES_VARIABLES, destination: DESTINATION_PAR_DEFAUT, confirmee: false, palettes: {} };

/**
 * Le suivi que le texte rangé décrit. Un texte vide, illisible ou d'une
 * forme inattendue donne un suivi vide, que la prochaine écriture
 * remplace ; un champ inattendu est ignoré sans écarter les autres. Un suivi
 * sans version se lit comme la version 1.
 */
export function lireLeSuivi(texte: string): SuiviDesVariables {
  const lu = lireLeSuiviComplet(texte);
  if (lu.etat === 'absente' || lu.etat === 'illisible' || lu.etat === 'refusee') return SUIVI_VIDE;
  // Un suivi d'une version plus récente ne se lit pas : sa forme n'est pas connue.
  if (lu.etat === 'future') return { ...SUIVI_VIDE, version: lu.version };
  const validee = validerLaDestination(lu.valeur.destination);
  const lisible = 'destination' in validee;
  return {
    version: lu.version,
    destination: lisible ? validee.destination : DESTINATION_PAR_DEFAUT,
    // Une destination illisible revient au défaut, que le designer confirme de nouveau.
    confirmee: lisible && lu.valeur.confirmee === true,
    palettes: lu.valeur.palettes,
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

/**
 * Les variables que suivent les autres palettes de la recette, ou leurs
 * sorties anciennes : une écriture ne les remplace jamais ([VAR-08]). Une
 * palette que la recette ne porte plus ne protège plus les siennes.
 */
export function variablesProtegees(suivi: Pick<SuiviDesVariables, 'palettes'>, presentes: ReadonlySet<string>, palette: string): Set<string> {
  const ids = new Set<string>();
  for (const [id, suivie] of Object.entries(suivi.palettes)) {
    const proprietaire = suivie.sortieAnterieureDe ?? id;
    if (proprietaire === palette || !presentes.has(proprietaire)) continue;
    for (const variable of Object.values(suivie.variables)) ids.add(variable.id);
  }
  return ids;
}

/**
 * Les palettes suivies sans ces variables : une variable remplacée quitte la
 * palette supprimée ou la sortie ancienne qui la suivait, et une entrée vidée
 * quitte le suivi ([VAR-08]).
 */
export function sansLesVariables(palettes: { readonly [id: string]: PaletteSuivie }, retirees: ReadonlySet<string>): { [id: string]: PaletteSuivie } {
  const restantes: { [id: string]: PaletteSuivie } = {};
  for (const [id, suivie] of Object.entries(palettes)) {
    const variables = Object.fromEntries(Object.entries(suivie.variables).filter(([, variable]) => !retirees.has(variable.id)));
    if (Object.keys(variables).length === Object.keys(suivie.variables).length) restantes[id] = suivie;
    else if (Object.keys(variables).length > 0) restantes[id] = { ...suivie, variables };
  }
  return restantes;
}

/**
 * Les identifiants des variables que le plugin tient pour siennes. Les
 * variables qu'il a créées le restent, palette supprimée comprise. Celles
 * d'une palette reprise du fichier ne le sont que tant que la recette porte
 * la palette : `presentes` nomme les palettes de la recette, et une reprise
 * supprimée rend ses variables à la liste « Déjà dans le fichier ».
 */
export function variablesSuivies(suivi: SuiviDesVariables, presentes?: ReadonlySet<string>): Set<string> {
  const ids = new Set<string>();
  for (const [id, palette] of Object.entries(suivi.palettes)) {
    if (palette.liaison === 'reprise' && presentes && !presentes.has(id)) continue;
    for (const variable of Object.values(palette.variables)) ids.add(variable.id);
  }
  return ids;
}

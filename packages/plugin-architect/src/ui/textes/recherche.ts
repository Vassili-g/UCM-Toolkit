/** Les textes de la recherche de l'arbre : le tableau qui la montre et les trois liens qui l'écrivent. */

const variables = (nombre: number): string => `${nombre} variable${nombre > 1 ? 's' : ''}`;

export const TEXTES_RECHERCHE = {
  emplacementDeLaRecherche: 'Toutes les collections',
  titreDeLaRecherche: 'Recherche',
  noteDeRecherche: variables,
  noteDuTerme: (nombre: number, formes: readonly string[]): string => `${variables(nombre)} : ${formes.join(', ')}`,
  noteDeVise: (nombre: number, cible: string): string => `${variables(nombre)} ${nombre > 1 ? 'visent' : 'vise'} ${cible}`,
};

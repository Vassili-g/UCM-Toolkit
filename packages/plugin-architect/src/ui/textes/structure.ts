/** Les textes de « À faire dans Figma » en mode Tokens, des corrections de modes et de scopes, et de leur application. */

const variables = (nombre: number): string => (nombre === 1 ? '1 variable' : `${nombre} variables`);
const corrections = (nombre: number): string => (nombre === 1 ? '1 correction' : `${nombre} corrections`);
const constats = (nombre: number): string => (nombre === 1 ? '1 constat' : `${nombre} constats`);
const liste = (mots: readonly string[]): string => (mots.length < 2 ? mots.join('') : `${mots.slice(0, -1).join(', ')} et ${mots[mots.length - 1]}`);

/** Les cases de l'onglet Scope de la fenêtre Edit variable de Figma, par identifiant de l'API, dans l'ordre de la fenêtre. */
const SCOPES_DE_FIGMA: ReadonlyArray<readonly [string, string]> = [
  ['ALL_SCOPES', 'Show in all'],
  ['ALL_FILLS', 'All fills'],
  ['FRAME_FILL', 'Frame fill'],
  ['SHAPE_FILL', 'Shape fill'],
  ['TEXT_FILL', 'Text fill'],
  ['STROKE_COLOR', 'Stroke'],
  ['EFFECT_COLOR', 'Effects'],
];

export const TEXTES_STRUCTURE = {
  // Onglet
  nomDeLOngletAFaire: (nombre: number): string => `À faire dans Figma, ${constats(nombre)}`,
  rienAFaireDansFigma: 'Rien à régler dans la fenêtre Variables de Figma.',
  // Intertitres
  groupeAlias: 'Alias',
  groupeModes: 'Modes',
  groupeValeurs: 'Valeurs',
  groupeCouches: 'Couches',
  groupeScopes: 'Scopes',
  // Phrases des constats
  aliasSupprime: 'Cette variable vise une variable supprimée.',
  libraryInactive: 'Sa cible est dans une library non activée.',
  sansValeurEnMode: (mode: string): string => `Cette variable n’a pas de valeur en ${mode}.`,
  valeurVide: 'Cette variable est vide. Ses voisines ont une valeur.',
  crans: (nombre: number, valeur: string): string => `${nombre === 2 ? 'Deux' : nombre} crans de l’échelle ont la même valeur, ${valeur} px.`,
  couleurSansAlias: 'Cette couleur du thème n’est pas un alias.',
  // Où le régler
  autreCible: 'Choisissez une autre cible dans la fenêtre Variables',
  activerLaLibrary: (library: string): string => `Activez la library ${library} dans Assets, Libraries`,
  donnerUneValeurEnMode: (mode: string): string => `Donnez-lui une valeur en ${mode} dans la fenêtre Variables`,
  donnerUneValeur: 'Donnez-lui une valeur dans la fenêtre Variables',
  lierALaCouleur: 'Liez-la à une couleur de brands dans la fenêtre Variables',
  // Faits d'un constat ouvert
  enMode: (mode: string): string => `En ${mode}`,
  viseUneVariableSupprimee: 'vise une variable supprimée',
  sesVoisines: 'Ses voisines',
  vise: ' vise ',
  et: ' et ',
  ouvrirLaFiche: 'Ouvrir la fiche',
  // Corrections de modes
  viserLaRampe: (mode: string): string => `Viser la rampe ${mode} pour `,
  attendLeCran: (mode: string, cran: string): string => `En ${mode}, UCM attend le cran ${cran} de la rampe ${mode}.`,
  // Corrections de scopes
  regler: (nombre: number): string => `Régler le scope de ${variables(nombre)} `,
  sur: ' sur ',
  listeDeScopes: liste,
  reserve: 'UCM réserve le dossier ',
  auxFonds: ' aux fonds.',
  auxScopes: (scopes: readonly string[]): string => ` à ces scopes : ${liste(scopes)}.`,
  aujourdhui: (scopes: readonly string[]): string => `Aujourd’hui, ${scopes.length > 1 ? 'leurs scopes sont' : 'leur scope est'} ${liste(scopes)}.`,
  legendeAujourdhui: 'Aujourd’hui',
  legendeApres: 'Après l’application',
  scopeDeFigma: (identifiant: string): string => SCOPES_DE_FIGMA.find(([cle]) => cle === identifiant)?.[1] ?? identifiant,
  rangDeScope: (identifiant: string): number => {
    const rang = SCOPES_DE_FIGMA.findIndex(([cle]) => cle === identifiant);
    return rang < 0 ? SCOPES_DE_FIGMA.length : rang;
  },
  // Pied et application
  appliquerEcrit: (nombre: number): { readonly debut: string; readonly nombre: string; readonly fin: string } => ({ debut: 'Appliquer écrit ', nombre: corrections(nombre), fin: ' de modes et de scopes.' }),
  aucuneCorrectionCochee: 'Aucune correction de modes ou de scopes cochée.',
  appliquer: 'Appliquer',
  caseDeCorrection: (nom: string): string => `Corriger ${nom}`,
  caseDeCarte: (action: string): string => `Corriger : ${action}`,
  ecrites: (ecrites: number, sautees: number): string => `${corrections(ecrites)} écrite${ecrites > 1 ? 's' : ''}${sautees > 0 ? `, ${sautees} sautée${sautees > 1 ? 's' : ''}` : ''}.`,
  ouvrirLaFicheDe: (nom: string): string => `Ouvrir la fiche de ${nom}`,
};

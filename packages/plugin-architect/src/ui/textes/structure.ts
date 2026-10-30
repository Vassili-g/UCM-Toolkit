/** Les textes de « À faire dans Figma » en mode Tokens, des corrections de structure (variables manquantes, crans, modes, scopes), et de leur application. */

const variables = (nombre: number): string => (nombre === 1 ? '1 variable' : `${nombre} variables`);
const corrections = (nombre: number): string => (nombre === 1 ? '1 correction' : `${nombre} corrections`);
const constats = (nombre: number): string => (nombre === 1 ? '1 constat' : `${nombre} constats`);
const liste = (mots: readonly string[]): string => (mots.length < 2 ? mots.join('') : `${mots.slice(0, -1).join(', ')} et ${mots[mots.length - 1]}`);
const listeOu = (mots: readonly string[]): string => (mots.length < 2 ? mots.join('') : `${mots.slice(0, -1).join(', ')} ou ${mots[mots.length - 1]}`);

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
  groupeVariablesManquantes: 'Variables manquantes',
  groupeCrans: 'Crans',
  groupeTypes: 'Types',
  groupeRangement: 'Rangement',
  // Phrases des constats
  aliasSupprime: 'Cette variable vise une variable introuvable.',
  libraryInactive: 'Sa cible est dans une library non activée.',
  sansValeurEnMode: (mode: string): string => `Cette variable n’a pas de valeur en ${mode}.`,
  valeurVide: 'Cette variable est vide. Ses voisines ont une valeur.',
  crans: (nombre: number, valeur: string): string => `${nombre === 2 ? 'Deux' : nombre} crans de l’échelle ont la même valeur, ${valeur} px.`,
  couleurSansAlias: 'Cette couleur du thème n’est pas un alias.',
  paletteSansLeRole: { debut: 'Cette palette n’a pas ', fin: '.' },
  sansJumelle: ' Aucune de ses variables n’a d’alias vers brands ou utility.',
  prefixesMultiples: ' Ses variables visent plusieurs rampes.',
  rampeSansCran: (cran: number | string): { readonly debut: string; readonly fin: string } => ({ debut: 'La rampe ', fin: ` n’a pas le cran ${cran}.` }),
  cranSansSens: 'UCM ne sait pas si cette palette met un texte blanc ou noir sur ses boutons.',
  coucheVisee: (collection: string): string => `Cette couleur vise ${collection}.`,
  coucheAttendue: (collection: string, attendues: string): string => `Cette couleur vise ${collection}. UCM attend ${attendues}.`,
  valeurDirecte: 'Cette couleur n’est pas un alias.',
  modeDuThemeManquant: (collection: string, mode: string): string => `La collection ${collection} n’a pas de mode ${mode}.`,
  modesDuThemeManquants: (collection: string, premier: string, second: string): string => `La collection ${collection} n’a ni mode ${premier} ni mode ${second}.`,
  libelleDuMode: (mode: string): string => ({ light: 'Light', dark: 'Dark' } as Readonly<Record<string, string>>)[mode] ?? mode,
  variableDuThemeSansCouleur: 'Cette variable du thème n’est pas une couleur.',
  variableDuThemeMalRangee: (collection: string): string => `Cette variable du thème est rangée dans ${collection}.`,
  // Où le régler
  autreCible: 'Choisissez une autre cible dans la fenêtre Variables',
  activerLaLibrary: (library: string): string => `Activez la library ${library} dans Assets, Libraries`,
  donnerUneValeurEnMode: (mode: string): string => `Donnez-lui une valeur en ${mode} dans la fenêtre Variables`,
  donnerUneValeur: 'Donnez-lui une valeur dans la fenêtre Variables',
  lierALaCouleur: 'Liez-la à une couleur de brands dans la fenêtre Variables',
  creerLaVariable: (role: string): string => `Créez ${role} dans la fenêtre Variables`,
  choisirLEcriture: 'Choisissez l’écriture des noms dans Nomenclature. Architect pourra alors la créer',
  ajouterLeCran: 'Ajoutez ce cran avec UCM Palettes',
  choisirLaCible: 'Choisissez la cible dans la fenêtre Variables',
  choisirUneCibleDans: (attendues: string): string => `Choisissez une cible dans ${attendues} dans la fenêtre Variables`,
  lierAUneCouleur: 'Liez-la à une couleur dans la fenêtre Variables',
  lierALaCouleurDe: (attendues: string): string => `Liez-la à une couleur de ${attendues} dans la fenêtre Variables`,
  ajouterUnMode: (mode: string, collection: string): string => `Ajoutez un mode ${mode} à ${collection} dans la fenêtre Variables`,
  nommerLesModes: (premier: string, second: string): string => `Nommez ses modes ${premier} et ${second} dans la fenêtre Variables`,
  recreerEnCouleur: 'Recréez-la en couleur dans la fenêtre Variables',
  deplacerDansLeTheme: 'Déplacez-la dans theme dans la fenêtre Variables',
  ou: ' ou ',
  attendues: listeOu,
  // Faits d'un constat ouvert
  enMode: (mode: string): string => `En ${mode}`,
  viseUneVariableSupprimee: 'vise une variable introuvable',
  sesVoisines: 'Ses voisines',
  vise: ' vise ',
  et: ' et ',
  ouvrirLaFiche: 'Ouvrir la fiche',
  // Corrections de modes
  viserLaRampe: (mode: string): string => `Viser la rampe ${mode} pour `,
  attendLeCran: (mode: string, cran: string): string => `En ${mode}, UCM attend le cran ${cran} de la rampe ${mode}.`,
  // Corrections de variables manquantes
  creerDansPalettes: (nombre: number): { readonly debut: string; readonly fin: string } => ({ debut: 'Créer ', fin: ` dans ${nombre} ${nombre > 1 ? 'palettes' : 'palette'} de theme` }),
  prevueDansChaquePalette: 'UCM prévoit cette variable dans chaque palette.',
  viseLesCrans: (light: number | string, dark: number | string): string => `En Light elle vise le cran ${light}, en Dark le cran ${dark}.`,
  viseLesCouleurs: (light: number | string, dark: number | string): string => `En Light elle vise ${light}, en Dark ${dark}.`,
  viseUnCran: (mode: string, cran: number | string): string => `En ${mode} elle vise ${typeof cran === 'number' ? 'le cran ' : ''}${cran}.`,
  absente: 'absente',
  cibleDuMode: (mode: string, cible: string): string => `${mode} : ${cible}`,
  scopesDeLaVariable: (liste: string): string => `Scopes : ${liste}`,
  // Corrections de crans
  viserLeCran: (cran: number | string, mode: string): { readonly debut: string; readonly fin: string } => ({ debut: `Viser ${typeof cran === 'number' ? 'le cran ' : ''}${cran} pour `, fin: ` en ${mode}` }),
  attendLeCranAujourdhui: (mode: string, attendu: number | string, lu: number | string): string => {
    const cran = (valeur: number | string): string => (typeof valeur === 'number' ? `le cran ${valeur}` : String(valeur));
    return `En ${mode}, UCM attend ${cran(attendu)}. Aujourd’hui elle vise ${cran(lu)}.`;
  },
  changeLaCouleur: 'Cette correction change la couleur affichée.',
  toutDeselectionner: 'Tout désélectionner',
  // Corrections de scopes
  regler: (nombre: number): string => `Régler le scope de ${variables(nombre)} `,
  sur: ' sur ',
  reserve: (nombre: number): string => (nombre > 1 ? 'UCM réserve ces variables' : 'UCM réserve cette variable'),
  auxFonds: ' aux fonds.',
  aCesScopes: ' à ces scopes : ',
  aujourdhuiSujet: (scopes: number, variables: number): string => `Aujourd’hui, ${variables > 1 ? 'leur' : 'son'} ${scopes > 1 ? 'scopes sont' : 'scope est'} `,
  virgule: ', ',
  legendeAujourdhui: 'Aujourd’hui',
  legendeApres: 'Après l’application',
  scopeDeFigma: (identifiant: string): string => SCOPES_DE_FIGMA.find(([cle]) => cle === identifiant)?.[1] ?? identifiant,
  rangDeScope: (identifiant: string): number => {
    const rang = SCOPES_DE_FIGMA.findIndex(([cle]) => cle === identifiant);
    return rang < 0 ? SCOPES_DE_FIGMA.length : rang;
  },
  // Pied et application
  appliquerEcrit: (nombre: number): { readonly debut: string; readonly nombre: string; readonly fin: string } => ({ debut: 'Appliquer écrit ', nombre: corrections(nombre), fin: ' de structure.' }),
  aucuneCorrectionCochee: 'Aucune correction de structure cochée.',
  appliquer: 'Appliquer',
  caseDeCorrection: (nom: string): string => `Corriger ${nom}`,
  caseDeCarte: (action: string): string => `Corriger : ${action}`,
  ecrites: (ecrites: number, sautees: number): string => `${corrections(ecrites)} écrite${ecrites > 1 ? 's' : ''}${sautees > 0 ? `, ${sautees} sautée${sautees > 1 ? 's' : ''}` : ''}.`,
  publierLaLibrary: 'Publiez la library pour voir ces variables dans les fichiers de composants.',
  motifDeSaut: {
    'deja-la': 'Cette variable existe déjà, avec les mêmes alias.',
    'existe-divergente': 'Une variable de ce nom existe déjà, avec d’autres alias.',
  } as Readonly<Record<string, string>>,
  ouvrirLaFicheDe: (nom: string): string => `Ouvrir la fiche de ${nom}`,
};

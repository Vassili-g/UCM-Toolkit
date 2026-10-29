/**
 * Le catalogue de référence du mode Composant : les variables que les liaisons d'un composant visent, lues sans l'arbre du
 * mode Tokens. Les noms viennent d'abord (library) ou d'un relevé (fichier) ; les valeurs s'importent par clé à la demande
 * des contrôles, par `importerLesValeurs`, seul chemin vers l'import par clé.
 */
import { collectionsDeReference, type CatalogueDeReference, type CouleurResolue, type VariableDuCatalogue } from '@ucm-kit/core/controles';
import { CIBLES_DES_COLLECTIONS, CIBLES_DES_COULEURS_DE_COMPOSANT, variableDuThemeReconnue, type Collection } from '@ucm-kit/core/referentiel';
import { lireLesLibraries, type LectureDesLibraries, type PortDeBibliotheque } from 'ucm-plugin-socle/src/bibliotheque';
import { executerAuPlus } from 'ucm-plugin-socle/src/composant/analyse/limiteur';
import { cleDeBibliotheque, convertirVariable, importerLesValeurs, type PortDeLecture, type ValeurDeLibrary } from './lecture';
import type { Releve, ValeurSource } from './modele';

/** La couche qui lie le plus de couches : celle du composant. */
const ROLE_DU_COMPOSANT: Collection = (Object.keys(CIBLES_DES_COLLECTIONS) as Collection[]).sort((a, b) => CIBLES_DES_COLLECTIONS[b].length - CIBLES_DES_COLLECTIONS[a].length)[0];

/** Les couches qu'un composant lie : la sienne et ses cibles du kit, sans la typographie. La loi interdit d'y écrire les noms. */
const COUCHES_LUES: readonly Collection[] = (Object.keys(CIBLES_DES_COLLECTIONS) as Collection[])
  .filter((couche) => couche === ROLE_DU_COMPOSANT || (CIBLES_DES_COLLECTIONS[ROLE_DU_COMPOSANT].includes(couche) && couche !== 'typography'));

export type LectureDuCatalogue =
  | { readonly etat: 'lu'; readonly catalogue: CatalogueDeReference }
  | { readonly etat: 'illisible'; readonly motif: string };

/** `cles` donne, pour un alias du fichier, la clé de la variable visée quand le relevé la porte : le catalogue nomme les variables par leur clé. */
function valeurDuCatalogue(source: ValeurSource, deLibrary = false, cles?: ReadonlyMap<string, string>): { alias: string } | { valeur: unknown } {
  switch (source.nature) {
    case 'alias': return { alias: deLibrary ? (cleDeBibliotheque(source.cible) ?? source.cible) : (cles?.get(source.cible) ?? source.cible) };
    case 'couleur': return { valeur: source.couleur };
    case 'nombre': return { valeur: source.nombre };
    case 'texte': return { valeur: source.texte };
    case 'booleen': return { valeur: source.booleen };
    case 'courbe': return { valeur: source.courbe };
    case 'non-prise-en-charge': return { valeur: source.brut };
  }
}

/**
 * Les collections `theme`, `layout` et `components` de la library, lues par leurs noms : chaque variable est `non-chargee`.
 * Une collection que Figma refuse de lire est `inaccessible`, sans variable. `dejaLue` évite un second inventaire des
 * libraries quand l'appelant vient de le faire.
 */
export async function lireLeCatalogueDeLibrary(figma: PortDeBibliotheque, library: string, dejaLue?: LectureDesLibraries): Promise<LectureDuCatalogue> {
  const lecture = dejaLue ?? await lireLesLibraries(figma);
  if (lecture.etat === 'illisible') return { etat: 'illisible', motif: lecture.motif };
  const lues = lecture.collections.filter((collection) => collection.library === library);
  const illisibles = lecture.illisibles.filter((collection) => collection.library === library);
  const brutes = [
    ...lues.map((c) => ({ cle: c.cle, nom: c.nom, modes: [], etat: 'lue' as const })),
    ...illisibles.map((c) => ({ cle: c.cle, nom: c.nom, modes: [], etat: 'inaccessible' as const })),
  ];
  const collections = collectionsDeReference(brutes, 'ucm').filter((c) => c.role !== null && COUCHES_LUES.includes(c.role));
  const gardees = new Set(collections.map((c) => c.cle));
  const variables: VariableDuCatalogue[] = lues
    .filter((c) => gardees.has(c.cle))
    .flatMap((c) => c.variables.map((v) => ({ cle: v.cle, nom: v.nom, collection: c.cle, type: v.type, etat: 'non-chargee' as const })));
  return { etat: 'lu', catalogue: { version: 1, library: { nom: library, cle: library }, collections, variables } };
}

/** Les variables locales du fichier, déjà lues : leurs valeurs sont présentes, sans library. */
export function catalogueDuFichier(releve: Pick<Releve, 'collections' | 'variables'>, architecture: 'ucm' | 'libre'): CatalogueDeReference {
  const brutes = releve.collections.map((c) => ({ cle: c.id, nom: c.nom, modes: c.modes.map((m) => ({ id: m.id, nom: m.nom })), etat: 'lue' as const }));
  const cles = new Map(releve.variables.map((v) => [v.id, v.cle ?? v.id] as const));
  const variables: VariableDuCatalogue[] = releve.variables.map((v) => ({
    cle: v.cle ?? v.id,
    nom: v.nom,
    collection: v.collection,
    type: v.type as VariableDuCatalogue['type'],
    etat: 'presente',
    scopes: [...v.portees],
    valeurs: Object.fromEntries(Object.entries(v.valeurs).map(([mode, valeur]) => [mode, valeurDuCatalogue(valeur, false, cles)])),
  }));
  return { version: 1, library: null, collections: collectionsDeReference(brutes, architecture), variables };
}

/**
 * Le catalogue de la prélecture (16.16) ne fait aucun import par clé : `importVariableByKeyAsync` abonne le fichier à la variable.
 * Une clé qui en demanderait un reste `non-chargee`, et `importsEvites` reçoit leur nombre : un catalogue qui en a évité un
 * n'est pas celui que la demande ordinaire lirait.
 */
export interface OptionsDeCatalogue {
  readonly sansImport?: boolean;
  readonly importsEvites?: (n: number) => void;
  /**
   * Vrai quand l'analyse est annulée : aucune lecture ni aucun import ne part plus, ceux en vol finissent, et le catalogue
   * rendu est partiel, que l'analyse jette. Absent, le chargement va au bout.
   */
  readonly annulee?: () => boolean;
}

/** Les tours d'import qui suivent les alias d'une library jusqu'à leurs cibles ; au-delà, la cible reste non chargée. */
const PROFONDEUR_D_ALIAS = 10;

/**
 * Importe les valeurs des seules `cles` demandées parmi les variables non chargées, puis celles que leurs alias visent. Une
 * clé refusée passe à `inaccessible` avec son motif ; une variable déjà présente ou inaccessible reste telle quelle. Le
 * catalogue reçu n'est pas modifié. Quand le port lit une collection, les modes de chaque collection de library touchée
 * s'ajoutent au catalogue : sans eux, le contraste par mode n'a rien à comparer (Q-28). L'identifiant d'une cible d'alias
 * porte la clé de la variable (`cleDeBibliotheque`) : la valeur du catalogue garde cette clé.
 *
 * Un alias qui sort des collections lues (un token de `theme` qui vise une primitive) se suit aussi : sa cible se lit par son
 * identifiant, que Figma importe avec la variable qui la vise, sinon par sa clé. Elle entre au catalogue avec sa collection
 * et ses modes ; sans elle, aucune couleur de la library ne se résout et le contraste ne se mesure pas.
 */
export async function chargerLesValeurs(
  port: Parameters<typeof importerLesValeurs>[0] & Partial<Pick<PortDeLecture, 'getVariableCollectionByIdAsync' | 'getVariableByIdAsync'>>,
  catalogue: CatalogueDeReference,
  cles: readonly string[],
  idsDesCles?: ReadonlyMap<string, string>,
  compter?: (nom: 'parIdentifiant' | 'imports', n: number) => void,
  options: OptionsDeCatalogue = {},
): Promise<{ catalogue: CatalogueDeReference; motifs: Readonly<Record<string, string>> }> {
  const nonChargees = new Set(catalogue.variables.filter((v) => v.etat === 'non-chargee').map((v) => v.cle));
  const connues = new Set(catalogue.variables.map((v) => v.cle));
  const importees: Record<string, ValeurDeLibrary> = {};
  /** Les cibles hors du catalogue, par clé : leur identifiant d'abord, pour les lire sans import. */
  const dehors = new Map<string, string>();
  /** Les identifiants connus des clés du catalogue, complétés par ceux des cibles d'alias ; absente, tout s'importe par clé. */
  const parId = idsDesCles ? new Map(idsDesCles) : undefined;
  const horsCatalogue: Record<string, ValeurDeLibrary> = {};
  const annulee = options.annulee ?? (() => false);
  let attendues = new Set(cles.filter((cle) => nonChargees.has(cle)));
  for (let tour = 0; tour < PROFONDEUR_D_ALIAS && attendues.size > 0 && !annulee(); tour += 1) {
    const lot = [...attendues].filter((cle) => !(cle in importees) && !(cle in horsCatalogue));
    const internes = lot.filter((cle) => nonChargees.has(cle));
    const { lues, restantes } = await lireParIdentifiant(port, internes, parId, annulee);
    compter?.('parIdentifiant', Object.keys(lues).length);
    if (options.sansImport) {
      options.importsEvites?.(restantes.length);
      Object.assign(importees, lues);
    } else {
      compter?.('imports', restantes.length);
      Object.assign(importees, lues, await importerLesValeurs(port, restantes, annulee));
    }
    Object.assign(horsCatalogue, await lireHorsCatalogue(port, lot.filter((cle) => !nonChargees.has(cle)), dehors, options));
    attendues = new Set();
    for (const cle of lot) {
      const lue = importees[cle] ?? horsCatalogue[cle];
      if (lue === undefined || 'illisible' in lue) continue;
      for (const valeur of Object.values(lue.valeurs)) {
        if (valeur.nature !== 'alias') continue;
        const cible = cleDeBibliotheque(valeur.cible) ?? valeur.cible;
        if (cible in importees || cible in horsCatalogue) continue;
        if (nonChargees.has(cible)) {
          parId?.set(cible, valeur.cible);
          attendues.add(cible);
        }
        else if (!connues.has(cible)) {
          dehors.set(cible, valeur.cible);
          attendues.add(cible);
        }
      }
    }
  }

  const motifs: Record<string, string> = {};
  const identifiants = new Map<string, string>();
  const variables = catalogue.variables.map((v): VariableDuCatalogue => {
    const lue = importees[v.cle];
    if (v.etat !== 'non-chargee' || lue === undefined) return v;
    if ('illisible' in lue) { motifs[v.cle] = lue.illisible; return { ...v, etat: 'inaccessible' }; }
    identifiants.set(v.collection, lue.collection);
    return {
      ...v,
      etat: 'presente',
      scopes: [...lue.portees],
      valeurs: Object.fromEntries(Object.entries(lue.valeurs).map(([mode, valeur]) => [mode, valeurDuCatalogue(valeur, true)])),
    };
  });
  const modes = await lireLesModes(port, identifiants, annulee);
  const collections = catalogue.collections.map((c) => (modes.has(c.cle) && c.modes.length === 0 ? { ...c, modes: modes.get(c.cle)! } : c));

  // Les cibles hors du catalogue y entrent sous la collection qui les range, lue une fois, avec ses modes.
  const ajoutees = new Map<string, CatalogueDeReference['collections'][number]>();
  for (const [cle, lue] of Object.entries(horsCatalogue)) {
    if (annulee()) break;
    if ('illisible' in lue) continue;
    let collection = ajoutees.get(lue.collection);
    if (!collection) {
      const lueDeFigma = await port.getVariableCollectionByIdAsync?.(lue.collection).catch(() => null) ?? null;
      if (!lueDeFigma) continue;
      [collection] = collectionsDeReference([{
        cle: lueDeFigma.key || lueDeFigma.id, nom: lueDeFigma.name, modes: lueDeFigma.modes.map((m) => ({ id: m.modeId, nom: m.name })), etat: 'lue',
      }], 'ucm');
      ajoutees.set(lue.collection, collection);
    }
    variables.push({
      cle, nom: lue.nom, collection: collection.cle, type: lue.type as VariableDuCatalogue['type'], etat: 'presente', scopes: [...lue.portees],
      valeurs: Object.fromEntries(Object.entries(lue.valeurs).map(([mode, valeur]) => [mode, valeurDuCatalogue(valeur, true)])),
    });
  }
  const nouvelles = [...ajoutees.values()].filter((ajoutee) => !collections.some((c) => c.cle === ajoutee.cle));
  return { catalogue: { ...catalogue, collections: [...collections, ...nouvelles], variables }, motifs };
}

/** Les cibles d'alias hors du catalogue : par leur identifiant quand le port le lit, sinon par leur clé. */
async function lireHorsCatalogue(
  port: Parameters<typeof importerLesValeurs>[0] & Partial<Pick<PortDeLecture, 'getVariableByIdAsync'>>,
  cles: readonly string[],
  identifiants: ReadonlyMap<string, string>,
  options: OptionsDeCatalogue = {},
): Promise<Record<string, ValeurDeLibrary>> {
  const annulee = options.annulee ?? (() => false);
  const { resultats } = await executerAuPlus(cles, async (cle) => {
    const id = identifiants.get(cle);
    const lue = id && port.getVariableByIdAsync ? await port.getVariableByIdAsync(id).catch(() => null) : null;
    return lue ? convertirVariable(lue) : null;
  }, { avant: () => !annulee() });
  const rendues: Record<string, ValeurDeLibrary> = {};
  const parCle: string[] = [];
  cles.forEach((cle, rang) => {
    const convertie = resultats[rang];
    if (convertie) rendues[cle] = convertie;
    else parCle.push(cle);
  });
  if (options.sansImport) {
    options.importsEvites?.(parCle.length);
    return rendues;
  }
  return { ...rendues, ...(await importerLesValeurs(port, parCle, annulee)) };
}

/**
 * Lit par leur identifiant les clés dont `identifiants` donne un, quand le port le permet. Une lecture n'est acceptée que si
 * la variable existe, porte la clé demandée et se convertit ; les autres clés sont rendues pour l'import par clé.
 */
async function lireParIdentifiant(
  port: Partial<Pick<PortDeLecture, 'getVariableByIdAsync'>>,
  cles: readonly string[],
  identifiants: ReadonlyMap<string, string> | undefined,
  annulee: () => boolean,
): Promise<{ lues: Record<string, ValeurDeLibrary>; restantes: string[] }> {
  const lire = port.getVariableByIdAsync;
  if (!identifiants || !lire) return { lues: {}, restantes: [...cles] };
  const { resultats } = await executerAuPlus(cles, async (cle) => {
    const id = identifiants.get(cle);
    if (id === undefined) return null;
    const lue = await lire.call(port, id).catch(() => null);
    return lue && lue.key === cle ? convertirVariable(lue) : null;
  }, { avant: () => !annulee() });
  const lues: Record<string, ValeurDeLibrary> = {};
  const restantes: string[] = [];
  cles.forEach((cle, rang) => {
    const convertie = resultats[rang];
    if (convertie) lues[cle] = convertie;
    else restantes.push(cle);
  });
  return { lues, restantes };
}

/** Les modes des collections dont on connaît l'identifiant, par clé de collection du catalogue. Une collection illisible n'en rend pas. */
async function lireLesModes(
  port: Partial<Pick<PortDeLecture, 'getVariableCollectionByIdAsync'>>,
  identifiants: ReadonlyMap<string, string>,
  annulee: () => boolean,
): Promise<Map<string, { id: string; nom: string }[]>> {
  const rendus = new Map<string, { id: string; nom: string }[]>();
  const lire = port.getVariableCollectionByIdAsync;
  if (!lire) return rendus;
  await executerAuPlus([...identifiants], async ([cle, id]) => {
    try {
      const collection = await lire.call(port, id);
      if (collection) rendus.set(cle, collection.modes.map((m) => ({ id: m.modeId, nom: m.name })));
    } catch {
      // Sans ses modes, la collection reste lue sans mode : le contraste le dit en limite.
    }
  }, { avant: () => !annulee() });
  return rendus;
}

/** Les variables de fond que la mesure du contraste lit sur le thème, par leur nom dans la collection `theme`. */
const FONDS_DU_THEME = { page: 'elevation/page', carte: 'elevation/raised' } as const;

/** La couche que les couleurs d'un composant visent : le thème. */
const [ROLE_DU_THEME] = CIBLES_DES_COULEURS_DE_COMPOSANT;

/** La première collection `theme` lue du catalogue : celle dont le kit lit les modes. */
function collectionTheme(catalogue: CatalogueDeReference) {
  return catalogue.collections.find((c) => c.role === ROLE_DU_THEME && c.etat === 'lue');
}

/** Les clés de `elevation/page` et `elevation/raised` dans la collection `theme`, à charger avec les valeurs : deux au plus. */
export function clesDesFondsDElevation(catalogue: CatalogueDeReference): string[] {
  const theme = collectionTheme(catalogue);
  if (!theme) return [];
  return Object.values(FONDS_DU_THEME).flatMap((nom) => {
    const trouvee = catalogue.variables.find((v) => v.collection === theme.cle && v.type === 'COLOR' && variableDuThemeReconnue(v.nom) === nom);
    return trouvee ? [trouvee.cle] : [];
  });
}

function couleurDe(valeur: unknown): CouleurResolue | null {
  const c = valeur as Partial<CouleurResolue> | null;
  if (!c || typeof c !== 'object' || typeof c.r !== 'number' || typeof c.g !== 'number' || typeof c.b !== 'number') return null;
  return { r: c.r, g: c.g, b: c.b, a: typeof c.a === 'number' ? c.a : 1 };
}

/** La couleur d'une variable dans un mode, alias suivis ; une cible d'une autre collection se lit dans le même mode, sinon dans son premier. */
function resoudre(catalogue: CatalogueDeReference, cle: string, mode: string, profondeur = 0): CouleurResolue | null {
  if (profondeur > PROFONDEUR_D_ALIAS) return null;
  const variable = catalogue.variables.find((v) => v.cle === cle);
  if (!variable || variable.etat !== 'presente' || !variable.valeurs) return null;
  const modes = catalogue.collections.find((c) => c.cle === variable.collection)?.modes ?? [];
  const lu = variable.valeurs[mode] ?? variable.valeurs[modes[0]?.id ?? ''] ?? Object.values(variable.valeurs)[0];
  if (!lu) return null;
  return 'alias' in lu ? resoudre(catalogue, lu.alias, mode, profondeur + 1) : couleurDe(lu.valeur);
}

/**
 * Le catalogue avec les fonds d'élévation du thème, par mode de la première collection `theme` lue. Un mode n'a d'entrée que si
 * les deux valeurs se résolvent en couleur ; sans entrée, la mesure retombe sur le fond de la page Figma.
 */
export function avecLesFondsDElevation(catalogue: CatalogueDeReference): CatalogueDeReference {
  const theme = collectionTheme(catalogue);
  if (!theme) return catalogue;
  const [page, carte] = [FONDS_DU_THEME.page, FONDS_DU_THEME.carte].map((nom) => catalogue.variables.find((v) => v.collection === theme.cle && variableDuThemeReconnue(v.nom) === nom));
  if (!page || !carte) return catalogue;
  const fonds: NonNullable<CatalogueDeReference['fondsDElevation']> = {};
  for (const mode of theme.modes) {
    const couleurPage = resoudre(catalogue, page.cle, mode.id);
    const couleurCarte = resoudre(catalogue, carte.cle, mode.id);
    if (couleurPage && couleurCarte) fonds[mode.id] = { page: couleurPage, carte: couleurCarte };
  }
  return Object.keys(fonds).length > 0 ? { ...catalogue, fondsDElevation: fonds } : catalogue;
}

/** Le premier fond SOLID visible de la page ; absent quand la page n'en a pas ou que Figma refuse de le lire. */
export function fondDeLaPageFigma(page: { readonly backgrounds?: unknown } | null | undefined): CouleurResolue | undefined {
  try {
    const fonds = page?.backgrounds;
    if (!Array.isArray(fonds)) return undefined;
    const solide = fonds.find((p: { type?: string; visible?: boolean }) => p?.type === 'SOLID' && p.visible !== false) as { color?: unknown; opacity?: number } | undefined;
    const couleur = couleurDe(solide?.color);
    return couleur ? { ...couleur, a: typeof solide?.opacity === 'number' ? solide.opacity : 1 } : undefined;
  } catch {
    return undefined;
  }
}

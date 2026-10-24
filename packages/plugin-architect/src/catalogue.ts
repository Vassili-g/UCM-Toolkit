/**
 * Le catalogue de référence du mode Composant : les variables que les liaisons d'un composant visent, lues sans l'arbre du
 * mode Tokens. Les noms viennent d'abord (library) ou d'un relevé (fichier) ; les valeurs s'importent par clé à la demande
 * des contrôles, par `importerLesValeurs`, seul chemin vers l'import par clé.
 */
import { collectionsDeReference, type CatalogueDeReference, type VariableDuCatalogue } from '@ucm-kit/core/controles';
import { CIBLES_DES_COLLECTIONS, type Collection } from '@ucm-kit/core/referentiel';
import { lireLesLibraries, type PortDeBibliotheque } from 'ucm-plugin-socle/src/bibliotheque';
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
 * Une collection que Figma refuse de lire est `inaccessible`, sans variable.
 */
export async function lireLeCatalogueDeLibrary(figma: PortDeBibliotheque, library: string): Promise<LectureDuCatalogue> {
  const lecture = await lireLesLibraries(figma);
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
): Promise<{ catalogue: CatalogueDeReference; motifs: Readonly<Record<string, string>> }> {
  const nonChargees = new Set(catalogue.variables.filter((v) => v.etat === 'non-chargee').map((v) => v.cle));
  const connues = new Set(catalogue.variables.map((v) => v.cle));
  const importees: Record<string, ValeurDeLibrary> = {};
  /** Les cibles hors du catalogue, par clé : leur identifiant d'abord, pour les lire sans import. */
  const dehors = new Map<string, string>();
  const horsCatalogue: Record<string, ValeurDeLibrary> = {};
  let attendues = new Set(cles.filter((cle) => nonChargees.has(cle)));
  for (let tour = 0; tour < PROFONDEUR_D_ALIAS && attendues.size > 0; tour += 1) {
    const lot = [...attendues].filter((cle) => !(cle in importees) && !(cle in horsCatalogue));
    const internes = lot.filter((cle) => nonChargees.has(cle));
    Object.assign(importees, await importerLesValeurs(port, internes));
    Object.assign(horsCatalogue, await lireHorsCatalogue(port, lot.filter((cle) => !nonChargees.has(cle)), dehors));
    attendues = new Set();
    for (const cle of lot) {
      const lue = importees[cle] ?? horsCatalogue[cle];
      if (lue === undefined || 'illisible' in lue) continue;
      for (const valeur of Object.values(lue.valeurs)) {
        if (valeur.nature !== 'alias') continue;
        const cible = cleDeBibliotheque(valeur.cible) ?? valeur.cible;
        if (cible in importees || cible in horsCatalogue) continue;
        if (nonChargees.has(cible)) attendues.add(cible);
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
  const modes = await lireLesModes(port, identifiants);
  const collections = catalogue.collections.map((c) => (modes.has(c.cle) && c.modes.length === 0 ? { ...c, modes: modes.get(c.cle)! } : c));

  // Les cibles hors du catalogue y entrent sous la collection qui les range, lue une fois, avec ses modes.
  const ajoutees = new Map<string, CatalogueDeReference['collections'][number]>();
  for (const [cle, lue] of Object.entries(horsCatalogue)) {
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
): Promise<Record<string, ValeurDeLibrary>> {
  const rendues: Record<string, ValeurDeLibrary> = {};
  const parCle: string[] = [];
  for (const cle of cles) {
    const id = identifiants.get(cle);
    const lue = id && port.getVariableByIdAsync ? await port.getVariableByIdAsync(id).catch(() => null) : null;
    const convertie = lue ? convertirVariable(lue) : null;
    if (convertie) rendues[cle] = convertie;
    else parCle.push(cle);
  }
  return { ...rendues, ...(await importerLesValeurs(port, parCle)) };
}

/** Les modes des collections dont on connaît l'identifiant, par clé de collection du catalogue. Une collection illisible n'en rend pas. */
async function lireLesModes(
  port: Partial<Pick<PortDeLecture, 'getVariableCollectionByIdAsync'>>,
  identifiants: ReadonlyMap<string, string>,
): Promise<Map<string, { id: string; nom: string }[]>> {
  const rendus = new Map<string, { id: string; nom: string }[]>();
  const lire = port.getVariableCollectionByIdAsync;
  if (!lire) return rendus;
  await Promise.all([...identifiants].map(async ([cle, id]) => {
    try {
      const collection = await lire.call(port, id);
      if (collection) rendus.set(cle, collection.modes.map((m) => ({ id: m.modeId, nom: m.name })));
    } catch {
      // Sans ses modes, la collection reste lue sans mode : le contraste le dit en limite.
    }
  }));
  return rendus;
}

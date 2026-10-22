/**
 * Le catalogue de référence du mode Composant : les variables que les liaisons d'un composant visent, lues sans l'arbre du
 * mode Tokens. Les noms viennent d'abord (library) ou d'un relevé (fichier) ; les valeurs s'importent par clé à la demande
 * des contrôles, par `importerLesValeurs`, seul chemin vers l'import par clé.
 */
import { collectionsDeReference, type CatalogueDeReference, type VariableDuCatalogue } from '@ucm-kit/core/controles';
import { CIBLES_DES_COLLECTIONS, type Collection } from '@ucm-kit/core/referentiel';
import { lireLesLibraries, type PortDeBibliotheque } from 'ucm-plugin-socle/src/bibliotheque';
import { importerLesValeurs, type ValeurDeLibrary } from './lecture';
import type { Releve, ValeurSource } from './modele';

/** La couche qui lie le plus de couches : celle du composant. */
const ROLE_DU_COMPOSANT: Collection = (Object.keys(CIBLES_DES_COLLECTIONS) as Collection[]).sort((a, b) => CIBLES_DES_COLLECTIONS[b].length - CIBLES_DES_COLLECTIONS[a].length)[0];

/** Les couches qu'un composant lie : la sienne et ses cibles du kit, sans la typographie. La loi interdit d'y écrire les noms. */
const COUCHES_LUES: readonly Collection[] = (Object.keys(CIBLES_DES_COLLECTIONS) as Collection[])
  .filter((couche) => couche === ROLE_DU_COMPOSANT || (CIBLES_DES_COLLECTIONS[ROLE_DU_COMPOSANT].includes(couche) && couche !== 'typography'));

export type LectureDuCatalogue =
  | { readonly etat: 'lu'; readonly catalogue: CatalogueDeReference }
  | { readonly etat: 'illisible'; readonly motif: string };

function valeurDuCatalogue(source: ValeurSource): { alias: string } | { valeur: unknown } {
  switch (source.nature) {
    case 'alias': return { alias: source.cible };
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
  const variables: VariableDuCatalogue[] = releve.variables.map((v) => ({
    cle: v.cle ?? v.id,
    nom: v.nom,
    collection: v.collection,
    type: v.type as VariableDuCatalogue['type'],
    etat: 'presente',
    scopes: [...v.portees],
    valeurs: Object.fromEntries(Object.entries(v.valeurs).map(([mode, valeur]) => [mode, valeurDuCatalogue(valeur)])),
  }));
  return { version: 1, library: null, collections: collectionsDeReference(brutes, architecture), variables };
}

/**
 * Importe les valeurs des seules `cles` demandées parmi les variables non chargées. Une clé refusée passe à `inaccessible`
 * avec son motif ; une variable déjà présente ou inaccessible reste telle quelle. Le catalogue reçu n'est pas modifié.
 */
export async function chargerLesValeurs(
  port: Parameters<typeof importerLesValeurs>[0],
  catalogue: CatalogueDeReference,
  cles: readonly string[],
): Promise<{ catalogue: CatalogueDeReference; motifs: Readonly<Record<string, string>> }> {
  const demandees = new Set(cles);
  const aImporter = catalogue.variables.filter((v) => v.etat === 'non-chargee' && demandees.has(v.cle)).map((v) => v.cle);
  const importees: Record<string, ValeurDeLibrary> = aImporter.length > 0 ? await importerLesValeurs(port, aImporter) : {};
  const motifs: Record<string, string> = {};
  const variables = catalogue.variables.map((v): VariableDuCatalogue => {
    const lue = importees[v.cle];
    if (v.etat !== 'non-chargee' || lue === undefined) return v;
    if ('illisible' in lue) { motifs[v.cle] = lue.illisible; return { ...v, etat: 'inaccessible' }; }
    return {
      ...v,
      etat: 'presente',
      scopes: [...lue.portees],
      valeurs: Object.fromEntries(Object.entries(lue.valeurs).map(([mode, valeur]) => [mode, valeurDuCatalogue(valeur)])),
    };
  });
  return { catalogue: { ...catalogue, variables }, motifs };
}


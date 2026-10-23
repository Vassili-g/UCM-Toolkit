/**
 * Le relevé d'une library, bâti depuis ses noms puis complété par les valeurs que le sandbox importe. Le module est pur : il ne touche ni
 * au DOM ni au sandbox.
 *
 * Une variable de library a pour identifiant sa clé publiée, et une collection la sienne : un alias de valeur importée porte
 * l'identifiant de sa cible (`VariableID:<clé>/<n>`), que `cleDeLaCible` ramène à cette clé pour que la cible se retrouve dans le relevé.
 * Une library ne donne le nom d'un mode qu'à l'import et n'en donne ici que l'identifiant : les modes se nomment par leur rang.
 */
import type { CollectionDeBibliotheque } from '../../messages/bibliotheque';
import { FORMAT_DU_RELEVE, type CollectionRelevee, type LectureManquee, type Releve, type ValeurSource, type VariableRelevee } from '../../modele';
import { TEXTES } from '../textes';

/** La valeur que l'import rend pour une clé : la variable lue, ou le motif pour lequel elle ne se lit pas. */
export type ValeurImportee = VariableRelevee | { readonly illisible: string };

export const estIllisible = (valeur: ValeurImportee): valeur is { readonly illisible: string } => 'illisible' in valeur;

/** La clé publiée que porte l'identifiant d'une variable de library, `VariableID:<clé>/<node>` ; `null` pour tout autre identifiant. */
export function cleDeLaCible(id: string): string | null {
  return /^VariableID:([^/:]+)\//u.exec(id)?.[1] ?? null;
}

function versLaCle(valeur: ValeurSource): ValeurSource {
  if (valeur.nature !== 'alias') return valeur;
  return { ...valeur, cible: cleDeLaCible(valeur.cible) ?? valeur.cible };
}

/** Les modes qu'une collection montre : ceux des valeurs importées, dans l'ordre où ils sont apparus. */
function modesDe(importees: readonly VariableRelevee[]): CollectionRelevee['modes'] {
  const ids = [...new Set(importees.flatMap((variable) => Object.keys(variable.valeurs)))];
  return ids.map((id, rang) => ({ id, nom: ids.length === 1 ? TEXTES.modeUnique : TEXTES.modeNumero(rang + 1) }));
}

export interface EntreesDeLibrary {
  readonly nom: string;
  readonly collections: readonly CollectionDeBibliotheque[];
  /** Les valeurs déjà importées, par clé de variable. */
  readonly valeurs: ReadonlyMap<string, ValeurImportee>;
  readonly luA: number;
  readonly revision: number;
}

/** Le relevé de la library : toutes ses variables, avec une valeur seulement pour celles que l'import a rendues. */
export function releveDeLibrary({ nom, collections, valeurs, luA, revision }: EntreesDeLibrary): Releve {
  const manquees: LectureManquee[] = [];
  const variables: VariableRelevee[] = [];
  const relevees: CollectionRelevee[] = collections.map((collection) => {
    const importees: VariableRelevee[] = [];
    for (const { nom: nomDeVariable, cle, type } of collection.variables) {
      const importee = valeurs.get(cle);
      if (importee && estIllisible(importee)) manquees.push({ id: cle, genre: 'variable', issue: 'refusee', message: importee.illisible });
      const lue = importee && !estIllisible(importee) ? importee : null;
      if (lue) importees.push(lue);
      variables.push({
        id: cle, nom: nomDeVariable, description: lue?.description ?? '', cle, distante: true, masqueeALaPublication: false, collection: collection.cle,
        type: (lue?.type ?? type) as VariableRelevee['type'], portees: lue?.portees ?? [], syntaxe: lue?.syntaxe ?? {},
        valeurs: lue ? Object.fromEntries(Object.entries(lue.valeurs).map(([mode, valeur]) => [mode, versLaCle(valeur)])) : {},
      });
    }
    const modes = modesDe(importees);
    return {
      id: collection.cle, nom: collection.nom, cle: collection.cle, distante: true, masqueeALaPublication: false, modes, modeParDefaut: modes[0]?.id ?? '',
      variables: collection.variables.map((variable) => variable.cle), extension: null,
    };
  });
  return {
    format: FORMAT_DU_RELEVE, revision, fichier: nom, luA, collections: relevees, variables, manquees,
    capacites: { collectionsEtendues: false, variablesDistantes: true },
  };
}

/** Les clés que les alias des valeurs importées visent et que ni l'import ni une demande en vol ne couvrent, dans la limite des clés connues. */
export function ciblesAImporter(valeurs: ReadonlyMap<string, ValeurImportee>, connues: ReadonlySet<string>, deja: ReadonlySet<string>): string[] {
  const cibles = new Set<string>();
  for (const importee of valeurs.values()) {
    if (estIllisible(importee)) continue;
    for (const valeur of Object.values(importee.valeurs)) {
      if (valeur.nature !== 'alias') continue;
      const cle = cleDeLaCible(valeur.cible) ?? valeur.cible;
      if (connues.has(cle) && !deja.has(cle)) cibles.add(cle);
    }
  }
  return [...cibles];
}

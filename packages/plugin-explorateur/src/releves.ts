/**
 * Le relevé exporté et réimporté, et la comparaison de deux relevés.
 *
 * Deux variables se rapprochent par leur identifiant Figma, puis par leur
 * clé publiée. Un nom égal ne suffit pas : il ne fait qu'une proposition, que
 * le designer confirme. Un renommage reste un renommage, jamais une
 * suppression suivie d'une création.
 */
import { FORMAT_DU_RELEVE, TYPES_DE_VARIABLE, type Releve, type ValeurSource, type VariableRelevee } from './modele';

export const FORMAT_D_EXPORT = 'ucm-explorateur/releve';
export const TAILLE_MAXIMALE_DU_RELEVE = 20 * 1024 * 1024;

export function exporterReleve(releve: Releve): string {
  return `${JSON.stringify({ format: FORMAT_D_EXPORT, version: FORMAT_DU_RELEVE, releve }, null, 2)}\n`;
}

const estObjet = (valeur: unknown): valeur is Record<string, unknown> => typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);

function valeurSourceValide(valeur: unknown): boolean {
  if (!estObjet(valeur)) return false;
  switch (valeur.nature) {
    case 'alias':
      return typeof valeur.cible === 'string';
    case 'couleur':
      return estObjet(valeur.couleur) && ['r', 'g', 'b', 'a'].every((cle) => typeof (valeur.couleur as Record<string, unknown>)[cle] === 'number');
    case 'nombre':
      return typeof valeur.nombre === 'number';
    case 'texte':
      return typeof valeur.texte === 'string';
    case 'booleen':
      return typeof valeur.booleen === 'boolean';
    case 'courbe':
      return typeof valeur.courbe === 'string';
    case 'non-prise-en-charge':
      return typeof valeur.brut === 'string';
    default:
      return false;
  }
}

/** Le premier champ invalide d'un relevé importé, ou `null`. */
export function champInvalide(releve: unknown): string | null {
  if (!estObjet(releve)) return 'releve';
  if (!Array.isArray(releve.collections)) return 'collections';
  if (!Array.isArray(releve.variables)) return 'variables';
  if (!Array.isArray(releve.manquees)) return 'manquees';
  for (const [rang, collection] of releve.collections.entries()) {
    if (!estObjet(collection) || typeof collection.id !== 'string' || typeof collection.nom !== 'string' || !Array.isArray(collection.modes) || !Array.isArray(collection.variables) || typeof collection.modeParDefaut !== 'string') return `collections[${rang}]`;
  }
  for (const [rang, variable] of releve.variables.entries()) {
    if (!estObjet(variable) || typeof variable.id !== 'string' || typeof variable.nom !== 'string' || typeof variable.collection !== 'string' || !TYPES_DE_VARIABLE.includes(variable.type as never) || !estObjet(variable.valeurs)) return `variables[${rang}]`;
    if (!Object.values(variable.valeurs).every(valeurSourceValide)) return `variables[${rang}].valeurs`;
  }
  return null;
}

export type ImportDeReleve = { readonly releve: Releve } | { readonly refus: 'taille' | 'illisible' | 'format' | 'version'; readonly detail?: string };

/** Lit un relevé exporté. Un refus laisse en place le relevé comparé précédemment. */
export function importerReleve(texte: string): ImportDeReleve {
  if (texte.length > TAILLE_MAXIMALE_DU_RELEVE) return { refus: 'taille' };
  let objet: unknown;
  try {
    objet = JSON.parse(texte);
  } catch {
    return { refus: 'illisible' };
  }
  if (!estObjet(objet) || objet.format !== FORMAT_D_EXPORT) return { refus: 'format' };
  if (objet.version !== FORMAT_DU_RELEVE) return { refus: 'version', detail: String(objet.version) };
  const invalide = champInvalide(objet.releve);
  if (invalide) return { refus: 'format', detail: invalide };
  const releve = objet.releve as Record<string, unknown>;
  return { releve: { ...(releve as unknown as Releve), format: FORMAT_DU_RELEVE, capacites: estObjet(releve.capacites) ? (releve.capacites as unknown as Releve['capacites']) : { collectionsEtendues: false, variablesDistantes: false } } };
}

export type NatureDEcartDeReleves = 'renommee' | 'type' | 'cible' | 'valeur' | 'mode';

export interface EcartDeReleves {
  readonly nature: NatureDEcartDeReleves;
  readonly courante: string;
  readonly autre: string;
  readonly mode?: string;
}

export interface ComparaisonDeReleves {
  readonly ecarts: readonly EcartDeReleves[];
  /** Les rapprochements faits, autre → courante, et par quel moyen. */
  readonly rapprochees: ReadonlyMap<string, { readonly courante: string; readonly par: 'identifiant' | 'cle' | 'designer' }>;
  readonly nonRapprochees: { readonly courantes: readonly string[]; readonly autres: readonly string[] };
  /** Des variables non rapprochées qui portent le même nom : une proposition, jamais une conclusion. */
  readonly propositions: ReadonlyArray<{ readonly courante: string; readonly autre: string }>;
}

function memeSource(a: ValeurSource, b: ValeurSource): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Compare le relevé courant à un autre. `manuels` porte les rapprochements
 * confirmés par le designer, autre → courante.
 */
export function comparerReleves(courant: Releve, autre: Releve, manuels: ReadonlyMap<string, string> = new Map()): ComparaisonDeReleves {
  const courantes = new Map(courant.variables.map((variable) => [variable.id, variable]));
  const parCle = new Map(courant.variables.filter((variable) => variable.cle).map((variable) => [variable.cle as string, variable.id]));
  const rapprochees = new Map<string, { courante: string; par: 'identifiant' | 'cle' | 'designer' }>();
  const prises = new Set<string>();
  for (const variable of autre.variables) {
    const manuel = manuels.get(variable.id);
    let trouve: { courante: string; par: 'identifiant' | 'cle' | 'designer' } | null = null;
    if (manuel && courantes.has(manuel)) trouve = { courante: manuel, par: 'designer' };
    else if (courantes.has(variable.id)) trouve = { courante: variable.id, par: 'identifiant' };
    else if (variable.cle && parCle.has(variable.cle)) trouve = { courante: parCle.get(variable.cle) as string, par: 'cle' };
    if (trouve && !prises.has(trouve.courante)) {
      rapprochees.set(variable.id, trouve);
      prises.add(trouve.courante);
    }
  }
  const nomsDesModes = (releve: Releve) => new Map(releve.collections.flatMap((collection) => collection.modes.map((mode) => [mode.id, mode.nom] as const)));
  const modesAutres = nomsDesModes(autre);
  const modesCourants = nomsDesModes(courant);
  const ecarts: EcartDeReleves[] = [];
  const autres = new Map(autre.variables.map((variable) => [variable.id, variable]));
  for (const [idAutre, { courante: idCourante }] of rapprochees) {
    const a = autres.get(idAutre) as VariableRelevee;
    const c = courantes.get(idCourante) as VariableRelevee;
    if (a.nom !== c.nom) ecarts.push({ nature: 'renommee', courante: idCourante, autre: idAutre });
    if (a.type !== c.type) ecarts.push({ nature: 'type', courante: idCourante, autre: idAutre });
    // Les modes se rapprochent par identifiant, puis par nom dans la même collection.
    const modeCorrespondant = (mode: string): string | undefined => {
      if (mode in c.valeurs) return mode;
      const nom = modesAutres.get(mode);
      return Object.keys(c.valeurs).find((candidat) => modesCourants.get(candidat) === nom);
    };
    const modesVus = new Set<string>();
    for (const [mode, valeur] of Object.entries(a.valeurs)) {
      const correspondant = modeCorrespondant(mode);
      if (!correspondant) {
        ecarts.push({ nature: 'mode', courante: idCourante, autre: idAutre, mode });
        continue;
      }
      modesVus.add(correspondant);
      const actuelle = c.valeurs[correspondant];
      if (memeSource(valeur, actuelle)) continue;
      const alias = valeur.nature === 'alias' || actuelle.nature === 'alias';
      ecarts.push({ nature: alias ? 'cible' : 'valeur', courante: idCourante, autre: idAutre, mode: correspondant });
    }
    if (Object.keys(c.valeurs).some((mode) => !modesVus.has(mode))) ecarts.push({ nature: 'mode', courante: idCourante, autre: idAutre });
  }
  const nonCourantes = courant.variables.filter((variable) => !prises.has(variable.id)).map((variable) => variable.id);
  const nonAutres = autre.variables.filter((variable) => !rapprochees.has(variable.id)).map((variable) => variable.id);
  const parNom = new Map(nonCourantes.map((id) => [courantes.get(id)!.nom, id]));
  const propositions = nonAutres.flatMap((id) => {
    const courante = parNom.get(autres.get(id)!.nom);
    return courante ? [{ courante, autre: id }] : [];
  });
  return { ecarts, rapprochees, nonRapprochees: { courantes: nonCourantes, autres: nonAutres }, propositions };
}

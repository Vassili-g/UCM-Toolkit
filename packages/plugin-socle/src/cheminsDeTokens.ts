/**
 * Le chemin qu'un token reçoit dans `tokens.json` et dans les contrats : le
 * nom de sa collection puis celui de sa variable, normalisés par le format
 * puis rendus citables. UCM Exporter l'écrit ; l'explorateur de tokens le
 * recalcule pour rapprocher une variable Figma d'un fichier importé.
 */
import { normalizeName } from '@ucm-kit/core/format';

/**
 * Réduit un nom normalisé à ce qu'une référence DTCG sait citer.
 *
 * Une accolade coupe la référence `{chemin}`, et un segment qui commence par
 * `$` est lu comme une métadonnée de groupe : le token sort alors de l'index du
 * kit. Figma refuse `.`, `{` et `}` dans un nom de variable, et son éditeur y
 * refuse un `$` de tête, mais il accepte `$test` et `{test}` comme noms de
 * collection. Les accolades partent avant les `$`, sans quoi `{$Brand}`
 * garderait le sien. Un nom déjà citable ressort inchangé.
 */
export function cheminCitable(nomNormalise: string): string {
  return nomNormalise
    .split('.')
    .map((segment) => segment.replace(/[{}]/g, '').replace(/^\$+/, ''))
    .filter(Boolean)
    .join('.');
}

/**
 * Le préfixe qu'une collection donne aux chemins de ses variables : son nom
 * normalisé puis rendu citable. C'est aussi la clé de son axe de modes dans
 * `com.ucm.axes`, si bien que les deux ne peuvent pas diverger.
 */
export function prefixeDeCollection(collectionName: string): string {
  return cheminCitable(normalizeName(collectionName));
}

/**
 * Assemble le chemin canonique d'un token : collection + variable, chacun
 * normalisé puis rendu citable. Évite les doublons si la variable répète déjà
 * la collection.
 *
 * @example joinTokenPath('Brand Tokens', 'Primary/default')
 * // → 'brand-tokens.primary.default'
 * @example joinTokenPath('{$Brand}', 'Primary/default') // → 'brand.primary.default'
 */
export function joinTokenPath(collectionName: string, variableName: string): string {
  const collection = prefixeDeCollection(collectionName);
  const variable = cheminCitable(normalizeName(variableName));

  if (!collection) return variable;
  if (!variable || variable === collection || variable.startsWith(`${collection}.`)) {
    return variable || collection;
  }

  return `${collection}.${variable}`;
}


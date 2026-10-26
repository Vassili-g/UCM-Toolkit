/**
 * Écriture d'un artefact JSON : une ligne par entrée, sur deux niveaux.
 */

/** Profondeur de découpage : au-delà, la valeur est écrite sur une seule ligne. */
export const PROFONDEUR_DE_DECOUPAGE = 2;

function* jsonCompact(value: unknown, cle: string, ancetres: Set<object>): Generator<void, string | undefined> {
  yield;
  if (value && typeof value === 'object' && 'toJSON' in value && typeof value.toJSON === 'function') value = value.toJSON(cle);
  if (value instanceof Number || value instanceof String || value instanceof Boolean) value = value.valueOf();
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (ancetres.has(value)) throw new TypeError('Converting circular structure to JSON');
  ancetres.add(value);
  try {
    const items: string[] = [];
    if (Array.isArray(value)) {
      const longueur = value.length;
      for (let rang = 0; rang < longueur; rang += 1) {
        yield;
        const item = yield* jsonCompact(value[rang], String(rang), ancetres);
        items.push(item ?? 'null');
      }
      return `[${items.join(',')}]`;
    }
    for (const key of Object.keys(value)) {
      yield;
      const item = yield* jsonCompact((value as Record<string, unknown>)[key], key, ancetres);
      if (item !== undefined) items.push(`${JSON.stringify(key)}:${item}`);
    }
    return `{${items.join(',')}}`;
  } finally {
    ancetres.delete(value);
  }
}

function* ecrire(value: unknown, depth: number, indent: number): Generator<void, string> {
  yield;
  // `JSON.stringify` écrit `{}` pour toute `Map` : son contenu passe par un objet.
  if (value instanceof Map && depth <= 0) {
    const objet: Record<string, unknown> = {};
    for (const [key, item] of value) {
      yield;
      Object.defineProperty(objet, String(key), { value: item, enumerable: true, writable: true, configurable: true });
    }
    return (yield* jsonCompact(objet, '', new Set())) as string;
  }
  if (depth <= 0 || value === null || typeof value !== 'object') return (yield* jsonCompact(value, '', new Set())) as string;
  const pad = '  '.repeat(indent);
  const inner = `${pad}  `;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items: string[] = new Array(value.length);
    for (let rang = 0; rang < value.length; rang += 1) {
      yield;
      if (rang in value) items[rang] = inner + (yield* ecrire(value[rang], depth - 1, indent + 1));
    }
    return `[\n${items.join(',\n')}\n${pad}]`;
  }
  // Une `Map` s'écrit comme un objet, dans l'ordre de ses clés : un objet range
  // une clé entière, `"2026"`, avant toutes les autres.
  const entries: Iterable<readonly [string, unknown]> = value instanceof Map
    ? value.entries()
    : (function* () { for (const key of Object.keys(value as object)) yield [key, (value as Record<string, unknown>)[key]] as const; })();
  const items: string[] = [];
  for (const [key, item] of entries) {
    yield;
    items.push(`${inner}${JSON.stringify(String(key))}:${yield* ecrire(item, depth - 1, indent + 1)}`);
  }
  if (items.length === 0) return '{}';
  return `{\n${items.join(',\n')}\n${pad}}`;
}

/**
 * Sérialise un artefact du plugin. Le résultat est du JSON strict : le relire
 * avec `JSON.parse` redonne exactement la valeur passée, une `Map` revenant en
 * objet. Le découpage fixe à deux niveaux garde une entrée de collection par
 * ligne, sans seuil dépendant du nombre de variants qui reformaterait tout le
 * fichier.
 */
export function serializeJson(value: unknown): string {
  const calcul = serializeJsonParEtapes(value);
  let etape = calcul.next();
  while (!etape.done) etape = calcul.next();
  return etape.value;
}

/** Même artefact, avec des étapes jusque dans les valeurs écrites sur une ligne. */
export function* serializeJsonParEtapes(value: unknown): Generator<void, string> {
  return yield* ecrire(value, PROFONDEUR_DE_DECOUPAGE, 0);
}

export default serializeJson;

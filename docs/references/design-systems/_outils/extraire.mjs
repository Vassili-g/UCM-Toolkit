/**
 * Écrit `<système>/noms.json` : le tableau trié des noms de tokens publiés par
 * chaque système, sans les valeurs. Lit les fichiers figés par `sources.json`
 * (SHA-256 vérifié) ; n'exécute aucun code téléchargé.
 *
 * Forme d'une ligne : { nom, type, couche }.
 * - nom : tel que publié (variable CSS avec ses `--`, clé d'objet, chemin DTCG
 *   joint par `.`, jeton Material `md.sys.color.primary`).
 * - type : `color`, `dimension`, `duration`, `fontFamily`, `fontWeight`,
 *   `shadow`, `cubicBezier`, `number`, ou null quand la source ne le dit pas.
 * - couche : `primitive`, `semantique` ou `composant`, seulement quand la
 *   source la rend évidente (préfixe, dossier) ; sinon null.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const racine = new URL('../', import.meta.url);
const sources = JSON.parse(readFileSync(new URL('sources.json', racine), 'utf8'));

function lire(s) {
  const brut = readFileSync(new URL(s.localFile, racine));
  if (createHash('sha256').update(brut).digest('hex') !== s.sha256) {
    throw new Error(`SHA-256 différent pour ${s.localFile} : relancer recuperer.mjs`);
  }
  return brut.toString('utf8');
}

/* Type deviné d'après la valeur publiée. */
function typeDeValeur(v) {
  const t = String(v ?? '').trim();
  if (/^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|oklch\(|oklab\(|color-mix\(|transparent$|currentcolor$)/i.test(t)) return 'color';
  if (/^cubic-bezier\(/i.test(t)) return 'cubicBezier';
  if (/^-?[\d.]+(ms|s)$/.test(t)) return 'duration';
  if (/^-?[\d.]+(px|rem|em|%|vw|vh)$/.test(t) || /^calc\(/.test(t)) return 'dimension';
  if (/^-?[\d.]+$/.test(t)) return 'number';
  if (/^(normal|bold|bolder|lighter)$/.test(t)) return 'fontWeight';
  if (/(sans-serif|serif|monospace|system-ui)/i.test(t)) return 'fontFamily';
  if (/^(inset\s+)?-?[\d.]+(px)?\s+-?[\d.]+(px)?\s/.test(t) && /(rgba?\(|#)/.test(t)) return 'shadow';
  return null;
}

/* Type deviné d'après le nom, pour les sources qui n'ont pas de valeurs. */
function typeDeNom(n) {
  const m = n.toLowerCase();
  if (/(^|[.\-_])(color|colour)([.\-_]|$)|background|foreground/.test(m)) return 'color';
  if (/(duration|delay)/.test(m)) return 'duration';
  if (/(easing|curve)/.test(m)) return 'cubicBezier';
  if (/(shadow|elevation)/.test(m)) return 'shadow';
  if (/(font[.\-_]?family|typeface)/.test(m)) return 'fontFamily';
  if (/(font[.\-_]?weight)/.test(m)) return 'fontWeight';
  if (/(space|spacing|radius|border[.\-_]?width|size|width|height|breakpoint)/.test(m)) return 'dimension';
  return null;
}

/** Variables CSS déclarées : `--nom: valeur;`. */
function variablesCss(texte, couche = null) {
  const sansCommentaires = texte.replace(/\/\*[\s\S]*?\*\//g, '');
  const sortie = [];
  for (const m of sansCommentaires.matchAll(/(?:^|[;{\s])(--[\w-]+)\s*:\s*([^;}]*)/g)) {
    sortie.push({ nom: m[1], type: typeDeValeur(m[2]), couche });
  }
  return sortie;
}

/** Feuilles d'un arbre DTCG, chemin joint par `.`. Une feuille porte `$value` ou `$extensions` sans enfants. */
function feuillesDtcg(arbre, couche = null) {
  const sortie = [];
  const aller = (n, chemin, typeHerite) => {
    if (!n || typeof n !== 'object') return;
    const type = n.$type ?? typeHerite ?? null;
    const enfants = Object.entries(n).filter(([k, v]) => !k.startsWith('$') && v && typeof v === 'object');
    if (('$value' in n || '$extensions' in n) && enfants.length === 0 && chemin) {
      sortie.push({ nom: chemin, type, couche });
      return;
    }
    for (const [k, v] of enfants) aller(v, chemin ? `${chemin}.${k}` : k, type);
  };
  aller(arbre, '', null);
  return sortie;
}

/** Objets JavaScript générés (Fluent) : `export const x = {` puis clés à 4 espaces, ou clés à 8 espaces pour les alias. */
function clesFluent(texte, alias) {
  const sortie = [];
  let courant = null;
  for (const ligne of texte.split('\n')) {
    const bloc = ligne.match(/(?:^|\s)(?:export )?const (\w+) = \{/);
    if (bloc) courant = bloc[1];
    if (alias) {
      const m = ligne.match(/^ {8}(\w+):/);
      if (m) sortie.push({ nom: m[1], type: typeDeNom(m[1]), couche: 'semantique' });
    } else if (courant) {
      const m = ligne.match(/^ {4}['"]?([\w-]+)['"]?:\s*(.*)$/);
      if (m) {
        const valeur = m[2].replace(/,$/, '').replace(/^['"]|['"]$/g, '');
        sortie.push({ nom: `${courant}.${m[1]}`, type: typeDeValeur(valeur) ?? typeDeNom(`${courant}.${m[1]}`), couche: 'primitive' });
      }
    }
  }
  return sortie;
}

/** Clés d'une carte Sass Material : `    'clé': …` (4 espaces). */
function materialScss(s) {
  const m = s.originalPath.match(/_md-(ref|sys|comp)-([a-z0-9-]+)\.scss$/);
  if (!m) return [];
  const [, famille, reste] = m;
  const couche = { ref: 'primitive', sys: 'semantique', comp: 'composant' }[famille];
  const prefixe = famille === 'comp' ? `md.comp.${reste}` : `md.${famille}.${reste}`;
  const lignes = lire(s).split('\n');
  const sortie = [];
  lignes.forEach((l, i) => {
    const c = l.match(/^ {4}'([\w-]+)':\s*(.*)$/);
    if (!c) return;
    const bloc = [c[2], lignes[i + 1] ?? '', lignes[i + 2] ?? '', lignes[i + 3] ?? '', lignes[i + 4] ?? ''].join(' ');
    const valeur = bloc.match(/null,\s*([^)]*?)\)/)?.[1] ?? c[2].replace(/,$/, '');
    sortie.push({ nom: `${prefixe}.${c[1]}`, type: typeDeValeur(valeur) ?? typeDeNom(`${reste}.${c[1]}`), couche });
  });
  return sortie;
}

const parSysteme = {
  atlassian(s) {
    if (!/token-names/.test(s.localFile)) return [];
    return [...lire(s).matchAll(/^\s*'([\w.\-]+)':\s*'--ds-/gm)].map((m) => ({ nom: m[1], type: typeDeNom(m[1]), couche: null }));
  },
  carbon(s) {
    if (/dtcg__color-palette/.test(s.localFile)) return feuillesDtcg(JSON.parse(lire(s)), 'primitive');
    if (/dtcg__themes/.test(s.localFile)) return feuillesDtcg(JSON.parse(lire(s)), 'semantique');
    if (/dtcg__components/.test(s.localFile)) return feuillesDtcg(JSON.parse(lire(s)), 'composant');
    if (/\.scss\.txt$/.test(s.localFile)) {
      return [...lire(s).matchAll(/^\$([\w-]+)\s*:\s*([^;]*)/gm)].map((m) => ({ nom: `$${m[1]}`, type: typeDeValeur(m[2]), couche: null }));
    }
    return [];
  },
  spectrum(s) {
    if (!/variables\.json/.test(s.localFile)) return [];
    return Object.entries(JSON.parse(lire(s))).map(([nom, v]) => {
      const feuille = JSON.stringify(v).match(/"value":"([^"]*)"/);
      return { nom, type: (feuille ? typeDeValeur(feuille[1]) : null) ?? typeDeNom(nom), couche: null };
    });
  },
  primer(s) {
    if (!/\.css\.txt$/.test(s.localFile)) return [];
    return variablesCss(lire(s), /css__base__/.test(s.localFile) ? 'primitive' : 'semantique');
  },
  polaris: (s) => (/styles\.css/.test(s.localFile) ? variablesCss(lire(s)) : []),
  'material-3': materialScss,
  'fluent-2'(s) {
    if (!/\.js\.txt$/.test(s.localFile)) return [];
    return clesFluent(lire(s), /lib__alias__/.test(s.localFile));
  },
  'figma-sds'(s) {
    if (!/theme\.css/.test(s.localFile)) return [];
    // Le fichier est découpé par collection Figma, annoncée en commentaire : `/* color_primitives: … */`.
    return lire(s).split(/(?=^\/\* [a-z_]+(?::| \*\/))/m).flatMap((bloc) => {
      const collection = bloc.match(/^\/\* ([a-z_]+)/)?.[1];
      const couche = !collection || collection === 'styles' ? null : collection.endsWith('_primitives') ? 'primitive' : 'semantique';
      return variablesCss(bloc, couche);
    });
  },
  radix: (s) => (/tokens\.css/.test(s.localFile) ? variablesCss(lire(s)) : []),
  tailwind: (s) => (/theme\.css/.test(s.localFile) ? variablesCss(lire(s)) : []),
  shadcn(s) {
    if (!/neutral\.json/.test(s.localFile)) return [];
    const j = JSON.parse(lire(s));
    return Object.values(j.cssVars ?? {}).flatMap((vars) =>
      Object.entries(vars).map(([k, v]) => ({ nom: `--${k}`, type: typeDeValeur(v) ?? typeDeNom(k), couche: null })));
  },
  mui(s) {
    if (!/theme-par-defaut/.test(s.localFile)) return [];
    return JSON.parse(lire(s))
      .filter((c) => !/internal_|unstable_/.test(c))
      .map((c) => c.replace(/\.\d+$/, ''))
      .map((c) => ({ nom: c, type: typeDeNom(c), couche: null }));
  },
  'untitled-ui': (s) => (/theme\.css/.test(s.localFile) ? variablesCss(lire(s)) : []),
};

/** Une ligne par nom, un nom par ligne : le diff reste lisible. */
const serialiser = (noms) => `[\n${noms.map((n) => `  ${JSON.stringify(n)}`).join(',\n')}\n]\n`;

{
  const resume = {};
  for (const systeme of Object.keys(parSysteme)) {
    const brut = sources.filter((s) => s.systeme === systeme).flatMap((s) => parSysteme[systeme](s));
    const vus = new Map();
    for (const r of brut) {
      const ancien = vus.get(r.nom);
      if (!ancien) vus.set(r.nom, { ...r });
      else {
        ancien.type ??= r.type;
        ancien.couche ??= r.couche;
      }
    }
    const noms = [...vus.values()].sort((a, b) => (a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : 0));
    writeFileSync(new URL(`${systeme}/noms.json`, racine), serialiser(noms));
    resume[systeme] = { noms: noms.length, couche: noms.filter((n) => n.couche).length, type: noms.filter((n) => n.type).length };
  }
  console.table(resume);
}

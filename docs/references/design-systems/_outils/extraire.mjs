/**
 * Écrit `<système>/noms.json`, le tableau trié des noms de tokens publiés par
 * chaque système, et `<système>/valeurs.json`, leurs valeurs par mode. Lit les
 * fichiers figés par `sources.json` (SHA-256 vérifié) ; n'exécute aucun code
 * téléchargé. Une source marquée `usage: "composant"` (code d'un composant)
 * n'alimente aucun des deux : le releveur la lit à la main.
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
import { pathToFileURL } from 'node:url';

const racine = new URL('../', import.meta.url);
const sources = JSON.parse(readFileSync(new URL('sources.json', racine), 'utf8'));
const sourcesDeTokens = sources.filter((s) => s.usage !== 'composant');

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

/**
 * Feuilles d'un arbre DTCG, chemin joint par `.`. Un nœud qui porte `$value` ou
 * `$extensions` est un token, même quand il a aussi des enfants : Carbon publie
 * `background` et `background.hover` dans le même objet.
 * @param {object} arbre
 * @param {string | null} [couche]
 */
export function feuillesDtcg(arbre, couche = null) {
  return noeudsDtcg(arbre, couche).map(({ nom, type, couche: c }) => ({ nom, type, couche: c }));
}

/** Les tokens d'un arbre DTCG avec leur nœud, pour lire les valeurs. */
function noeudsDtcg(arbre, couche = null) {
  const sortie = [];
  const aller = (n, chemin, typeHerite) => {
    if (!n || typeof n !== 'object') return;
    const type = n.$type ?? typeHerite ?? null;
    if (('$value' in n || '$extensions' in n) && chemin) sortie.push({ nom: chemin, type, couche, noeud: n });
    for (const [k, v] of Object.entries(n)) {
      if (!k.startsWith('$') && v && typeof v === 'object') aller(v, chemin ? `${chemin}.${k}` : k, type);
    }
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

/** Type d'un token Ant Design : la valeur, sinon le nom en camelCase. */
function typeAnt(nom, valeur) {
  const t = typeDeValeur(valeur);
  if (t) return t;
  const cle = nom.split('.').at(-1);
  if (/^motionEase/.test(cle)) return 'cubicBezier';
  if (/^motionDuration/.test(cle)) return 'duration';
  if (/^fontFamily/.test(cle)) return 'fontFamily';
  if (/Shadow/.test(cle)) return 'shadow';
  if (/(^color|Color|Bg)/.test(cle)) return 'color';
  if (/(Size|Height|Width|Radius|Padding|Margin|Gap)/.test(cle) || /^(padding|margin|size|line)/.test(cle)) return 'dimension';
  return null;
}

/**
 * Tokens d'Ant Design : `token-meta.json` nomme les tokens globaux et ceux de
 * chaque composant (`Button.contentFontSize`), `token.json` donne la valeur des
 * tokens de composant. Les valeurs des tokens globaux ne sont pas publiées en
 * fichier : elles se calculent à l'exécution depuis les graines.
 */
function tokensAnt(s) {
  if (/es__version__token-meta/.test(s.localFile)) {
    const meta = JSON.parse(lire(s));
    return [
      ...Object.keys(meta.global ?? {}).map((nom) => ({ nom, type: typeAnt(nom, null), couche: null })),
      ...Object.entries(meta.components ?? {}).flatMap(([composant, liste]) =>
        liste.map((t) => ({ nom: `${composant}.${t.token}`, type: typeAnt(t.token, null), couche: 'composant' }))),
    ];
  }
  if (/es__version__token\.json/.test(s.localFile)) {
    return Object.entries(JSON.parse(lire(s))).flatMap(([composant, t]) =>
      Object.entries(t.component ?? {}).map(([cle, v]) => ({ nom: `${composant}.${cle}`, type: typeAnt(cle, String(v)), couche: 'composant' })));
  }
  return [];
}

/** Découpe `texte` aux virgules du premier niveau de parenthèses et de guillemets. */
function separerAuNiveauZero(texte) {
  const parts = [];
  let profondeur = 0;
  let guillemet = null;
  let debut = 0;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemet) {
      if (c === guillemet) guillemet = null;
    } else if (c === '"' || c === "'") guillemet = c;
    else if (c === '(') profondeur++;
    else if (c === ')') profondeur--;
    else if (c === ',' && profondeur === 0) {
      parts.push(texte.slice(debut, i));
      debut = i + 1;
    }
  }
  parts.push(texte.slice(debut));
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** Position du premier `:` hors parenthèses et guillemets, ou -1. */
function deuxPointsDeNiveauZero(texte) {
  let profondeur = 0;
  let guillemet = null;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemet) {
      if (c === guillemet) guillemet = null;
    } else if (c === '"' || c === "'") guillemet = c;
    else if (c === '(') profondeur++;
    else if (c === ')') profondeur--;
    else if (c === ':' && profondeur === 0) return i;
  }
  return -1;
}

/** Position de la parenthèse qui ferme celle du début de `texte`, ou -1. */
function parentheseFermanteDe(texte) {
  let profondeur = 0;
  let guillemet = null;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (guillemet) {
      if (c === guillemet) guillemet = null;
    } else if (c === '"' || c === "'") guillemet = c;
    else if (c === '(') profondeur++;
    else if (c === ')' && --profondeur === 0) return i;
  }
  return -1;
}

/** Une carte Sass `(clé: valeur, …)` rendue en entrées, ou null si le texte n'en est pas une. */
function carteSass(texte) {
  let t = texte.trim();
  if (!t.startsWith('(') || !t.endsWith(')')) return null;
  let interieur = t.slice(1, -1);
  // GOV.UK double les parenthèses de ses couleurs fonctionnelles : `( ( "brand": … ) )`.
  while (interieur.trim().startsWith('(') && parentheseFermanteDe(interieur.trim()) === interieur.trim().length - 1) {
    t = interieur.trim();
    interieur = t.slice(1, -1);
  }
  if (deuxPointsDeNiveauZero(interieur) < 0) return null;
  return separerAuNiveauZero(interieur).map((entree) => {
    const i = deuxPointsDeNiveauZero(entree);
    return [entree.slice(0, i).trim().replace(/^["']|["']$/g, ''), entree.slice(i + 1).trim()];
  });
}

/**
 * Réglages Sass de GOV.UK : variables `$govuk-…` de premier niveau, dont les
 * cartes sont dépliées en `$govuk-palette.blue.primary`. Une carte `(name:, variant:)`
 * reste une feuille : elle désigne une couleur de la palette.
 */
export function reglagesGovuk(texte) {
  const propre = texte.replace(/^\s*\/\/.*$/gm, '');
  const sortie = [];
  const deplier = (nom, valeur, couche) => {
    const carte = carteSass(valeur);
    const estReference = carte && carte.every(([k]) => k === 'name' || k === 'variant');
    if (carte && !estReference) {
      for (const [k, v] of carte) deplier(`${nom}.${k}`, v, couche);
      return;
    }
    const brut = valeur.replace(/\s+/g, ' ').trim();
    const couleur = couche === 'primitive' || couche === 'semantique';
    sortie.push({ nom, valeur: brut, type: couleur ? 'color' : (typeDeValeur(brut) ?? typeDeNom(nom)), couche });
  };
  for (const m of propre.matchAll(/^\$([\w-]+)\s*:/gm)) {
    let profondeur = 0;
    let fin = -1;
    for (let i = m.index + m[0].length; i < propre.length; i++) {
      const c = propre[i];
      if (c === '(') profondeur++;
      else if (c === ')') profondeur--;
      else if (c === ';' && profondeur === 0) { fin = i; break; }
    }
    if (fin < 0) continue;
    const valeur = propre.slice(m.index + m[0].length, fin).replace(/\s*!default\s*$/, '').trim();
    const nom = `$${m[1]}`;
    const couche = nom === '$govuk-palette' ? 'primitive' : nom === '$govuk-default-functional-colours' ? 'semantique' : null;
    deplier(nom, valeur, couche);
  }
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
  'ant-design': tokensAnt,
  govuk: (s) => (/\.scss\.txt$/.test(s.localFile) ? reglagesGovuk(lire(s)).filter((r) => r.nom !== '$govuk-functional-colours') : []),
};

/* ---------------------------------------------------------------------------
 * Valeurs
 *
 * Chaque lecteur rend des lignes `{ nom, mode, valeur, description?, alpha?,
 * resolue? }` : `valeur` est la valeur publiée, `resolue` la fin de la chaîne
 * d'alias quand le lecteur la connaît d'avance. `resoudre` complète les autres
 * en suivant les alias dans les lignes du système. Une ligne `aux: true` sert
 * seulement à résoudre : elle n'est pas écrite.
 * ------------------------------------------------------------------------- */

const sansGuillemets = (v) => String(v).trim().replace(/^['"`]|['"`]$/g, '');

/** Blocs d'une feuille CSS, avec la chaîne de leurs sélecteurs (`['@layer base', '.dark-mode']`). */
export function blocsCss(texte) {
  const t = texte.replace(/\/\*[\s\S]*?\*\//g, '');
  const sortie = [];
  const pile = [];
  let debut = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '{') {
      pile.push({ sel: t.slice(debut, i).trim(), corps: '' });
      debut = i + 1;
    } else if (c === '}') {
      const b = pile.pop();
      if (!b) continue;
      b.corps += t.slice(debut, i);
      sortie.push({ chaine: [...pile.map((p) => p.sel), b.sel], corps: b.corps });
      debut = i + 1;
    } else if (c === ';' && pile.length) {
      pile.at(-1).corps += t.slice(debut, i + 1);
      debut = i + 1;
    }
  }
  return sortie;
}

/** Valeurs des variables CSS d'un texte ; `modeDe(chaine)` rend le mode d'un bloc, ou `false` pour l'ignorer. */
function valeursCss(texte, modeDe) {
  const sortie = [];
  for (const bloc of blocsCss(texte)) {
    const mode = modeDe(bloc.chaine);
    if (mode === false) continue;
    for (const m of bloc.corps.matchAll(/(?:^|[;\s])(--[\w-]+)\s*:\s*([^;]*)/g)) {
      sortie.push({ nom: m[1], mode, valeur: m[2].replace(/\s*!important\s*$/, '').trim() });
    }
  }
  return sortie;
}

/** Un nom qui existe en mode sombre prend `light` comme mode clair, au lieu de `null`. */
function nommerLeModeClair(lignes) {
  const sombres = new Set(lignes.filter((l) => l.mode === 'dark').map((l) => l.nom));
  return lignes.map((l) => (l.mode === null && sombres.has(l.nom) ? { ...l, mode: 'light' } : l));
}

/** Radix : un sélecteur en `.dark` donne le mode sombre, `:not(...)` ne compte pas. */
const modeDeSelecteurRadix = (sel) => (/\.dark/.test(sel.replace(/:not\([^)]*\)/g, '')) ? 'dark' : null);

const valeursParSysteme = {
  carbon(liste) {
    const lignes = [];
    for (const s of liste) {
      if (/dtcg__color-palette/.test(s.localFile)) {
        for (const { nom, noeud } of noeudsDtcg(JSON.parse(lire(s)), 'primitive')) {
          if ('$value' in noeud) {
            lignes.push({
              nom, mode: null,
              valeur: typeof noeud.$value === 'string' ? noeud.$value : (noeud.$value.hex ?? JSON.stringify(noeud.$value)),
              description: noeud.$description,
            });
          }
        }
      } else if (/dtcg__(themes|components)/.test(s.localFile)) {
        for (const { nom, noeud } of noeudsDtcg(JSON.parse(lire(s)))) {
          const themes = noeud.$extensions?.['carbon.themes'];
          if (!themes) continue;
          for (const [mode, v] of Object.entries(themes)) {
            const ligne = { nom, mode, valeur: typeof v === 'string' ? v : String(v.value), description: noeud.$description };
            if (typeof v === 'object' && v.alpha !== undefined) ligne.alpha = v.alpha;
            lignes.push(ligne);
          }
        }
      }
    }
    return lignes;
  },
  spectrum(liste) {
    const s = liste.find((x) => /variables\.json/.test(x.localFile));
    const lignes = [];
    const texte = (v) => (typeof v === 'string' ? v : JSON.stringify(v));
    for (const [nom, noeud] of Object.entries(JSON.parse(lire(s)))) {
      if (noeud.value !== undefined) {
        lignes.push({ nom, mode: null, valeur: texte(noeud.value) });
        continue;
      }
      for (const mode of Object.keys(noeud.sets ?? {})) {
        if (mode === 'wireframe') continue;
        let courant = noeud.sets[mode];
        let ref = courant.ref;
        while (courant.sets) {
          courant = courant.sets[mode] ?? Object.values(courant.sets)[0];
          ref ??= courant.ref;
        }
        if (courant.value === undefined) continue;
        lignes.push({ nom, mode, valeur: ref ?? texte(courant.value), resolue: texte(courant.value) });
      }
    }
    return lignes;
  },
  primer(liste) {
    return nommerLeModeClair(liste.filter((s) => /\.css\.txt$/.test(s.localFile)).flatMap((s) => {
      const mode = /themes__light/.test(s.localFile) ? 'light' : /themes__dark/.test(s.localFile) ? 'dark' : null;
      return valeursCss(lire(s), (chaine) => (chaine.length > 1 ? false : mode));
    }));
  },
  polaris(liste) {
    const s = liste.find((x) => /styles\.css/.test(x.localFile));
    return nommerLeModeClair(valeursCss(lire(s), (chaine) => {
      if (chaine.length !== 1) return false;
      if (chaine[0] === ':root,.p-theme-light') return null;
      return chaine[0] === '.p-theme-dark-experimental' ? 'dark' : false;
    }));
  },
  'material-3'(liste) {
    const lignes = [];
    for (const s of liste) {
      const m = s.originalPath.match(/_md-(ref|sys|comp)-([a-z0-9-]+)\.scss$/);
      if (!m) continue;
      const prefixe = `md.${m[1]}.${m[2]}`;
      const texte = lire(s);
      const fonctions = [...texte.matchAll(/@function (values[\w-]*)\(/g)];
      fonctions.forEach((f, i) => {
        const corps = texte.slice(f.index, fonctions[i + 1]?.index ?? texte.length);
        const mode = f[1] === 'values-light' ? 'light' : f[1] === 'values-dark' ? 'dark' : null;
        for (const e of corps.matchAll(/^ {4}'([\w-]+)':\s*([\s\S]*?),?\s*(?=\n {4}'[\w-]+':|\n\s*\);)/gm)) {
          let valeur = e[2].replace(/\s+/g, ' ').trim();
          const fixe = valeur.match(/^if\(\$exclude-hardcoded-values, null, ([\s\S]*)\)$/);
          if (fixe) valeur = fixe[1].replace(/^\(([^()]*)\)$/, '$1');
          lignes.push({ nom: `${prefixe}.${e[1]}`, mode, valeur });
        }
      });
    }
    return lignes;
  },
  'fluent-2'(liste) {
    const lignes = [];
    for (const s of liste) {
      if (!/\.js\.txt$/.test(s.localFile)) continue;
      const texte = lire(s);
      if (/lib__alias__(light|dark)Color\.js/.test(s.localFile)) {
        const mode = /alias__dark/.test(s.localFile) ? 'dark' : 'light';
        for (const m of texte.matchAll(/^ {8}(\w+):\s*(.*?),?\s*$/gm)) lignes.push({ nom: m[1], mode, valeur: sansGuillemets(m[2].replace(/,$/, '')) });
      } else if (/lib__global__/.test(s.localFile)) {
        let courant = null;
        for (const ligne of texte.split('\n')) {
          const bloc = ligne.match(/(?:^|\s)(?:export )?const (\w+) = \{/);
          if (bloc) courant = bloc[1];
          const constante = ligne.match(/(?:^|\s)export const (\w+) = (['"`][^'"`]*['"`]);/);
          if (constante) lignes.push({ nom: constante[1], mode: null, valeur: sansGuillemets(constante[2]), aux: true });
          const m = courant && ligne.match(/^ {4}['"]?([\w-]+)['"]?:\s*(.*)$/);
          if (m && !/[{[]$/.test(m[2].trim())) lignes.push({ nom: `${courant}.${m[1]}`, mode: null, valeur: sansGuillemets(m[2].replace(/,$/, '')) });
        }
      }
    }
    return lignes;
  },
  'figma-sds'(liste) {
    const s = liste.find((x) => /theme\.css/.test(x.localFile));
    return nommerLeModeClair(valeursCss(lire(s), (chaine) => {
      if (chaine.length === 1) return chaine[0] === ':root' ? null : false;
      return chaine.length === 2 && /prefers-color-scheme:\s*dark/.test(chaine[0]) && chaine[1] === ':root' ? 'dark' : false;
    }));
  },
  radix(liste) {
    const s = liste.find((x) => /tokens\.css/.test(x.localFile));
    return nommerLeModeClair(valeursCss(lire(s), (chaine) => (chaine.length === 1 ? modeDeSelecteurRadix(chaine[0]) : false)));
  },
  tailwind(liste) {
    const s = liste.find((x) => /theme\.css/.test(x.localFile));
    return valeursCss(lire(s), () => null);
  },
  shadcn(liste) {
    const s = liste.find((x) => /neutral\.json/.test(x.localFile));
    const j = JSON.parse(lire(s));
    return Object.entries(j.cssVars ?? {}).flatMap(([mode, vars]) =>
      Object.entries(vars).map(([k, v]) => ({ nom: `--${k}`, mode: mode === 'light' || mode === 'dark' ? mode : null, valeur: String(v) })));
  },
  mui(liste) {
    // Le fichier de valeurs vient de `mui-theme.mjs`, à lancer à la main : sans lui, pas de valeurs.
    const s = liste.find((x) => /valeurs-du-theme-par-defaut/.test(x.localFile));
    if (!s) return [];
    return Object.entries(JSON.parse(lire(s))).map(([nom, v]) => ({ nom, mode: null, valeur: String(v) }));
  },
  'untitled-ui'(liste) {
    const s = liste.find((x) => /theme\.css/.test(x.localFile));
    return nommerLeModeClair(valeursCss(lire(s), (chaine) => {
      if (chaine.length === 1 && chaine[0] === '@theme') return null;
      return chaine.length === 2 && chaine[1] === '.dark-mode' ? 'dark' : false;
    }));
  },
  atlassian(liste) {
    const noms = liste.find((x) => /token-names/.test(x.localFile));
    const parVariable = new Map();
    for (const m of lire(noms).matchAll(/^\s*'([\w.-]+)':\s*'(--ds-[\w-]+)'/gm)) parVariable.set(m[2], m[1]);
    const lignes = [];
    for (const s of liste) {
      const mode = /atlassian-(light|dark)\.js/.exec(s.localFile)?.[1];
      if (!mode) continue;
      for (const m of lire(s).matchAll(/(--ds-[\w-]+):\s*([^;]*);/g)) {
        if (parVariable.has(m[1])) lignes.push({ nom: parVariable.get(m[1]), mode, valeur: m[2].trim() });
      }
    }
    return lignes;
  },
  'ant-design'(liste) {
    const lignes = [];
    for (const s of liste) {
      if (/es__version__token-meta/.test(s.localFile)) {
        const meta = JSON.parse(lire(s));
        for (const [nom, t] of Object.entries(meta.global ?? {})) lignes.push({ nom, mode: null, valeur: null, description: t.descEn });
        for (const [composant, tokens] of Object.entries(meta.components ?? {})) {
          for (const t of tokens) lignes.push({ nom: `${composant}.${t.token}`, mode: null, valeur: null, description: t.descEn });
        }
      } else if (/es__version__token\.json/.test(s.localFile)) {
        for (const [composant, t] of Object.entries(JSON.parse(lire(s)))) {
          for (const [cle, v] of Object.entries(t.component ?? {})) lignes.push({ nom: `${composant}.${cle}`, mode: null, valeur: String(v) });
        }
      }
    }
    // Un token présent dans les deux fichiers : la valeur de l'un, la description de l'autre.
    const fusion = new Map();
    for (const l of lignes) {
      const ancien = fusion.get(l.nom);
      if (!ancien) fusion.set(l.nom, { ...l });
      else {
        ancien.valeur ??= l.valeur;
        ancien.description ??= l.description;
      }
    }
    return [...fusion.values()];
  },
  govuk(liste) {
    const lignes = [];
    for (const s of liste) {
      if (!/\.scss\.txt$/.test(s.localFile)) continue;
      for (const r of reglagesGovuk(lire(s))) {
        if (r.nom === '$govuk-functional-colours') continue;
        lignes.push({ nom: r.nom, mode: null, valeur: r.valeur });
      }
    }
    return lignes;
  },
};

/*
 * Dépliage des alias de chaque système : remplace chaque référence de `valeur`
 * par ce que `resoudreNom(cible)` rend, ou rend null si l'une d'elles ne se
 * résout pas.
 */
const REFERENCE_VAR = /var\((--[\w-]+)(?:\s*,[^()]*(?:\([^()]*\)[^()]*)*)?\)/g;
const deplierCss = (valeur, resoudreNom) => {
  let complet = true;
  const texte = valeur.replace(REFERENCE_VAR, (_, cible) => {
    const r = resoudreNom(cible);
    if (r === null) complet = false;
    return r ?? '';
  });
  return complet ? texte : null;
};
const deplierAccolades = (valeur, resoudreNom) => {
  const m = valeur.match(/^\{([^}]+)\}$/);
  return m ? resoudreNom(m[1]) : valeur;
};
const depliers = {
  carbon: deplierAccolades,
  spectrum: deplierAccolades,
  'material-3': (valeur, resoudreNom) => {
    const m = valeur.match(/^map\.get\(\$deps, '([\w-]+)', '([\w-]+)'\)$/);
    return m ? resoudreNom(`${m[1].replace('-', '.').replace('-', '.')}.${m[2]}`) : valeur;
  },
  'fluent-2': (valeur, resoudreNom) => {
    const m = valeur.match(/^(\w+)\[(\d+)\]$/);
    if (m) return resoudreNom(`${m[1] === 'brand' ? 'brandWeb' : m[1]}.${m[2]}`);
    return /^(white|black)$/.test(valeur) ? resoudreNom(valeur) : valeur;
  },
  govuk: (valeur, resoudreNom) => {
    const ref = valeur.match(/^\(\s*name:\s*"([\w-]+)"(?:,\s*variant:\s*"([\w-]+)")?\s*\)$/);
    // `white` est une valeur de la palette, sans variante : `$govuk-palette.white`.
    if (ref) return resoudreNom(`$govuk-palette.${ref[1]}.${ref[2] ?? 'primary'}`) ?? (ref[2] ? null : resoudreNom(`$govuk-palette.${ref[1]}`));
    const variable = valeur.match(/^(\$[\w-]+)$/);
    return variable ? resoudreNom(variable[1]) : valeur;
  },
  'ant-design': (valeur) => valeur,
  mui: (valeur) => valeur,
};
for (const systeme of ['polaris', 'primer', 'figma-sds', 'radix', 'tailwind', 'shadcn', 'untitled-ui', 'atlassian']) depliers[systeme] = deplierCss;

/** Ajoute `resolue` aux lignes d'un système, en développant une ligne sans mode en une par mode quand les modes diffèrent. */
export function resoudre(systeme, lignes) {
  const parNom = new Map();
  for (const l of lignes) parNom.set(l.nom, [...(parNom.get(l.nom) ?? []), l]);
  const modes = [...new Set(lignes.map((l) => l.mode).filter(Boolean))].sort();
  const deplier = depliers[systeme];

  const resoudreNom = (nom, mode, vus) => {
    if (vus.includes(nom) || vus.length > 25) return null;
    const candidats = parNom.get(nom) ?? [];
    const ligne = candidats.find((l) => l.mode === mode) ?? candidats.find((l) => l.mode === null);
    return ligne ? resoudreLigne(ligne, mode, [...vus, nom]) : null;
  };
  const resoudreLigne = (ligne, mode, vus) => {
    if (ligne.valeur === null) return null;
    if (ligne.resolue !== undefined) return ligne.resolue;
    return deplier(ligne.valeur, (cible) => resoudreNom(cible, mode, vus));
  };

  const sortie = [];
  for (const l of lignes) {
    if (l.aux) continue;
    if (l.mode !== null) {
      sortie.push({ ...l, resolue: resoudreLigne(l, l.mode, [l.nom]) });
      continue;
    }
    const sans = resoudreLigne(l, null, [l.nom]);
    const parMode = modes.map((m) => [m, resoudreLigne(l, m, [l.nom])]);
    if (parMode.every(([, r]) => r === sans)) sortie.push({ ...l, resolue: sans });
    else for (const [m, r] of parMode) sortie.push({ ...l, mode: m, resolue: r });
  }
  return sortie;
}

/** Ordre de `noms.json` : le nom, puis le mode. */
const comparer = (a, b) => {
  if (a.nom !== b.nom) return a.nom < b.nom ? -1 : 1;
  const ma = a.mode ?? '';
  const mb = b.mode ?? '';
  return ma < mb ? -1 : ma > mb ? 1 : 0;
};

/** Une ligne par nom et par mode. La description ne figure que sur la première ligne d'un nom. */
export function lignesDeValeurs(systeme, liste, nomsConnus) {
  const vues = new Set();
  const uniques = valeursParSysteme[systeme](liste).filter((l) => {
    const cle = `${l.nom}\u0000${l.mode}`;
    if (vues.has(cle)) return false;
    vues.add(cle);
    return true;
  });
  const resolues = resoudre(systeme, uniques).filter((l) => nomsConnus.has(l.nom)).sort(comparer);
  const decrits = new Set();
  return resolues.map((l) => {
    const ligne = { nom: l.nom, mode: l.mode, valeur: l.valeur, resolue: l.resolue ?? null };
    if (l.alpha !== undefined) ligne.alpha = l.alpha;
    if (l.description && !decrits.has(l.nom)) ligne.description = l.description;
    decrits.add(l.nom);
    return ligne;
  });
}

/** Une ligne par nom, un nom par ligne : le diff reste lisible. */
const serialiser = (lignes) => `[\n${lignes.map((n) => `  ${JSON.stringify(n)}`).join(',\n')}\n]\n`;

/** Les noms d'un système, tels que `noms.json` les écrit. */
export function nomsDuSysteme(systeme, liste) {
  const vus = new Map();
  for (const r of liste.flatMap((s) => parSysteme[systeme](s))) {
    const ancien = vus.get(r.nom);
    if (!ancien) vus.set(r.nom, { nom: r.nom, type: r.type, couche: r.couche });
    else {
      ancien.type ??= r.type;
      ancien.couche ??= r.couche;
    }
  }
  return [...vus.values()].sort((a, b) => (a.nom < b.nom ? -1 : a.nom > b.nom ? 1 : 0));
}

/** Noms et valeurs d'un système tels que `node extraire.mjs` les écrit ; `valeurs` vaut null sans lecteur de valeurs. */
export function extraireSysteme(systeme) {
  const liste = sourcesDeTokens.filter((s) => s.systeme === systeme);
  const noms = nomsDuSysteme(systeme, liste);
  const valeurs = valeursParSysteme[systeme] ? lignesDeValeurs(systeme, liste, new Set(noms.map((n) => n.nom))) : null;
  return { noms, valeurs };
}

export const SYSTEMES_A_NOMS = Object.keys(parSysteme);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const resume = {};
  for (const systeme of SYSTEMES_A_NOMS) {
    const { noms, valeurs } = extraireSysteme(systeme);
    writeFileSync(new URL(`${systeme}/noms.json`, racine), serialiser(noms));
    resume[systeme] = { noms: noms.length, couche: noms.filter((n) => n.couche).length, type: noms.filter((n) => n.type).length };
    if (valeurs) {
      if (valeurs.length) writeFileSync(new URL(`${systeme}/valeurs.json`, racine), serialiser(valeurs));
      resume[systeme].valeurs = valeurs.length;
      resume[systeme].resolues = valeurs.filter((v) => v.resolue !== null).length;
    }
  }
  console.table(resume);
}

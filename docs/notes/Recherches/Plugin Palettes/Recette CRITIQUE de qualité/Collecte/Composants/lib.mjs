/**
 * Outils communs de la collecte `Composants/` : lecture des sources figées
 * (SHA-256 vérifié), lecture des couleurs CSS, composition d'une couleur
 * translucide, contraste WCAG 2, et petit analyseur de feuilles CSS.
 * Aucun code téléchargé n'est exécuté : tout passe par lecture de texte.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export const dossier = new URL('./', import.meta.url);
const liste = JSON.parse(readFileSync(new URL('sources.json', dossier), 'utf8'));
export const parId = Object.fromEntries(liste.map((s) => [s.id, s]));

/** Contenu d'une source, après contrôle de son SHA-256. */
export function texte(id) {
  const s = parId[id];
  if (!s) throw new Error(`Source inconnue : ${id}`);
  const brut = readFileSync(new URL(s.localFile, dossier));
  const sha = createHash('sha256').update(brut).digest('hex');
  if (sha !== s.sha256) throw new Error(`SHA-256 différent pour ${id} : relancer fetch.mjs`);
  return brut.toString('utf8');
}
/** Chemin du fichier local d'une source, relatif à `Collecte/Composants/`. */
export const fichier = (id) => parId[id].localFile;
export const versionDe = (id) => parId[id].revision;

/** Numéro de ligne (à partir de 1) de la première occurrence d'un motif. */
export function ligneDe(t, motif) {
  const m = typeof motif === 'string' ? t.indexOf(motif) : t.search(motif);
  return m < 0 ? undefined : t.slice(0, m).split('\n').length;
}

/* ------------------------------------------------------------------ couleurs */

const clamp = (x) => Math.min(255, Math.max(0, x));
const hex2 = (n) => Math.round(clamp(n)).toString(16).padStart(2, '0');
export const versHex = ([r, g, b]) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

function oklchVersRgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((v) => {
    const c = Math.min(1, Math.max(0, v));
    return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  });
}

/** Lit une couleur CSS publiée : hexa, rgb()/rgba(), oklch(), white, black, transparent. */
export function lire(valeur) {
  const v = valeur.trim();
  let m;
  if (v === 'white') return { rgb: [255, 255, 255], a: 1 };
  if (v === 'black') return { rgb: [0, 0, 0], a: 1 };
  if (v === 'transparent') return { rgb: [0, 0, 0], a: 0 };
  if ((m = v.match(/^#([0-9a-f]{3})$/i))) {
    const [r, g, b] = m[1].split('').map((c) => parseInt(c + c, 16));
    return { rgb: [r, g, b], a: 1 };
  }
  if ((m = v.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i))) {
    const n = parseInt(m[1], 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], a: m[2] ? parseInt(m[2], 16) / 255 : 1 };
  }
  if ((m = v.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/))) {
    return { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] };
  }
  if ((m = v.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+)(%?))?\s*\)$/))) {
    const L = m[2] ? +m[1] / 100 : +m[1];
    const a = m[5] === undefined ? 1 : m[6] ? +m[5] / 100 : +m[5];
    return { rgb: oklchVersRgb(L, +m[3], +m[4]), a };
  }
  throw new Error(`Couleur illisible : ${valeur}`);
}

/** Deux écritures de la même couleur (hexa court ou long, avec ou sans alpha) ? */
export function memeCouleur(a, b) {
  const x = lire(a);
  const y = lire(b);
  return x.rgb.every((v, i) => Math.round(v) === Math.round(y.rgb[i])) && Math.abs(x.a - y.a) < 0.005;
}

/** Couleur (éventuellement translucide) composée sur un fond opaque, en hexa. */
export function composer(c, fondHex) {
  if (c.a >= 1) return versHex(c.rgb);
  const f = lire(fondHex).rgb;
  return versHex(c.rgb.map((x, i) => Math.round(x) * c.a + f[i] * (1 - c.a)));
}

export const luminance = (hex) => {
  const [r, g, b] = lire(hex).rgb.map((x) => {
    const c = Math.round(x) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** Contraste WCAG 2 entre deux hexa opaques, arrondi à 0,01. */
export const contraste = (h1, h2) => {
  const [a, b] = [luminance(h1), luminance(h2)].sort((x, y) => y - x);
  return Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100;
};

/**
 * Une valeur de couleur lue dans une source.
 * `publie` est la valeur écrite dans le fichier ; `token` son nom. Une valeur
 * translucide porte `alpha` ; son hexa n'est calculé que sur un fond donné
 * (`surFond`), et reste marqué comme calculé.
 */
export function valeur({ token, publie, id, ligne, via, pas, surFond, role, aussi }) {
  const c = lire(publie);
  const e = { token, valeurPubliee: publie };
  if (pas !== undefined) e.pas = pas;
  if (role) e.role = role;
  if (via) e.resolutionVia = via;
  if (c.a < 1) {
    e.translucide = true;
    e.alpha = Math.round(c.a * 1000) / 1000;
    if (c.a === 0) e.transparent = true;
    if (surFond) {
      e.composeSur = surFond;
      e.hexCalcule = composer(c, surFond);
    }
  } else {
    e.hex = versHex(c.rgb);
    if (/^oklch/.test(publie)) e.conversion = 'oklch vers sRGB (calcul), arrondi à 8 bits';
  }
  e.source = { fichier: fichier(id) };
  if (ligne) e.source.ligne = ligne;
  if (aussi) Object.assign(e, aussi);
  return e;
}
export const hexDe = (e) => e.hex ?? e.hexCalcule;

/**
 * Recalcule une valeur sur un fond donné (le hexa est alors calculé).
 * Une valeur opaque reste telle quelle.
 */
export function surFond(e, fondHex) {
  if (!e || !e.translucide) return e;
  const c = { rgb: lire(e.valeurPubliee).rgb, a: e.alpha };
  return { ...e, composeSur: fondHex, hexCalcule: composer(c, fondHex) };
}

/* ------------------------------------------------------------------ feuilles CSS */

/** Sépare une liste de sélecteurs sur les virgules hors parenthèses. */
function separerSelecteurs(prelude) {
  const out = [];
  let prof = 0;
  let debut = 0;
  for (let i = 0; i < prelude.length; i++) {
    if (prelude[i] === '(' || prelude[i] === '[') prof++;
    else if (prelude[i] === ')' || prelude[i] === ']') prof--;
    else if (prelude[i] === ',' && prof === 0) {
      out.push(prelude.slice(debut, i).trim());
      debut = i + 1;
    }
  }
  out.push(prelude.slice(debut).trim());
  return out.filter(Boolean);
}

/**
 * Découpe une feuille CSS, imbriquée ou non, en règles à plat
 * `{ sel, decls, media }`. Les at-rules `@media` et `@supports` passent dans
 * `media` ; `&` est remplacé par le sélecteur parent ; les sélecteurs séparés
 * par une virgule donnent une règle chacun. Une propriété répétée garde sa
 * dernière valeur, `!important` retiré.
 */
export function regles(css, parents = [''], media = '', sortie = []) {
  const sans = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const decls = {};
  const enfants = [];
  let courant = '';
  let i = 0;
  while (i < sans.length) {
    const c = sans[i];
    if (c === ';') {
      const k = courant.indexOf(':');
      if (k > 0 && !courant.trim().startsWith('@')) {
        decls[courant.slice(0, k).trim()] = courant.slice(k + 1).replace(/!important/g, '').trim();
      }
      courant = '';
      i++;
    } else if (c === '{') {
      let prof = 1;
      let j = i + 1;
      for (; j < sans.length && prof > 0; j++) {
        if (sans[j] === '{') prof++;
        else if (sans[j] === '}') prof--;
      }
      enfants.push({ prelude: courant.trim(), corps: sans.slice(i + 1, j - 1) });
      courant = '';
      i = j;
    } else {
      courant += c;
      i++;
    }
  }
  const dernier = courant.trim();
  if (dernier.includes(':') && !dernier.startsWith('@')) {
    const k = dernier.indexOf(':');
    decls[dernier.slice(0, k).trim()] = dernier.slice(k + 1).replace(/!important/g, '').trim();
  }
  if (Object.keys(decls).length > 0) {
    for (const sel of parents) if (sel !== '') sortie.push({ sel, decls, media });
  }
  for (const { prelude, corps } of enfants) {
    if (prelude.startsWith('@media') || prelude.startsWith('@supports')) {
      regles(corps, parents, `${media} ${prelude.replace(/^@(media|supports)\s*/, '')}`.trim(), sortie);
    } else if (prelude.startsWith('@')) {
      continue;
    } else {
      const sels = separerSelecteurs(prelude).flatMap((s) =>
        parents.map((p) => (s.includes('&') ? s.replace(/&/g, p) : p === '' ? s : `${p} ${s}`)),
      );
      regles(corps, sels, media, sortie);
    }
  }
  return sortie;
}

/** Déclarations fusionnées de toutes les règles dont le sélecteur est exactement `sel`. */
export function declsDe(regs, sel, media) {
  const out = {};
  let trouve = false;
  for (const r of regs) {
    if (r.sel === sel && (media === undefined || r.media === media)) {
      Object.assign(out, r.decls);
      trouve = true;
    }
  }
  if (!trouve) throw new Error(`Règle CSS absente : ${sel}${media ? ` (${media})` : ''}`);
  return out;
}

/** `var(--nom, repli)` : nom et repli. */
export function lireVar(valeurCss) {
  const m = valeurCss.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([\s\S]+))?\)$/);
  return m ? { nom: m[1], repli: m[2]?.trim() } : null;
}

/** Déclarations `--nom: valeur;` d'un bloc de texte (une par ligne ou séparées par `;`). */
export function declarationsVar(zone) {
  const decls = {};
  for (const m of zone.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) decls[m[1]] = m[2].trim();
  return decls;
}

/* ------------------------------------------------------------------ supports */

/**
 * Page et carte de référence de chaque système, lues dans les relevés de
 * `../Surfaces/processed/surfaces.json` (produits par `../Surfaces/extract.mjs`).
 */
const surfacesJson = JSON.parse(readFileSync(new URL('../Surfaces/processed/surfaces.json', dossier), 'utf8'));
export function supportDe(systemeId, themeId) {
  const sy = surfacesJson.systemes.find((s) => s.id === systemeId);
  const th = sy?.themes.find((t) => t.id === themeId);
  if (!th) throw new Error(`Support introuvable : ${systemeId} ${themeId}`);
  const carte = th.cartes?.[0];
  return {
    page: th.page ? { token: th.page.token, hex: hexDe(th.page) } : null,
    carte: carte ? { token: carte.token, hex: hexDe(carte) } : null,
    source: '../Surfaces/processed/surfaces.json',
  };
}

/**
 * Évalue une ligne de relevé : contrastes texte/fond et fond/support.
 * Les valeurs translucides sont composées sur le support correspondant.
 * `support` = { page: {token, hex}, carte: {token, hex} }.
 */
export function evaluer(ligne, support) {
  const ref = support?.carte ?? support?.page;
  const out = { ...ligne, support };
  const compose = (e, sur) => (e && e.translucide && sur ? surFond(e, sur.hex) : e);
  if (ref) {
    const fond = compose(ligne.fond, ref);
    out.fond = fond;
    if (ligne.texte) {
      let texteE = ligne.texte;
      const fh = hexDe(fond);
      if (texteE.translucide && fh) texteE = surFond(texteE, fh);
      out.texte = texteE;
      const th = hexDe(texteE);
      if (fh && th) {
        out.contrasteTexteFond = contraste(th, fh);
        out.contrasteTexteFondSur = `fond composé sur ${support.carte ? 'la carte' : 'la page'} ${ref.hex}`;
      }
    }
    if (ligne.contour) out.contour = compose(ligne.contour, ref);
    for (const k of ['survol', 'appui']) {
      if (ligne[k]) {
        out[k] = { ...ligne[k] };
        if (ligne[k].fond) out[k].fond = compose(ligne[k].fond, ref);
        if (ligne[k].texte) {
          const fh = hexDe(out[k].fond ?? fond);
          out[k].texte = ligne[k].texte.translucide && fh ? surFond(ligne[k].texte, fh) : ligne[k].texte;
        }
      }
    }
  }
  if (!ref && ligne.texte && hexDe(ligne.fond) && hexDe(ligne.texte)) {
    out.contrasteTexteFond = contraste(hexDe(ligne.texte), hexDe(ligne.fond));
    out.contrasteTexteFondSur = 'aucun support relevé : fond opaque';
  }
  const fh = out.fond && hexDe(out.fond);
  if (fh && support?.page && support.page.hex) {
    const fondPage = surFond(ligne.fond, support.page.hex);
    out.contrasteFondPage = contraste(hexDe(fondPage), support.page.hex);
  }
  if (fh && support?.carte && support.carte.hex) {
    const fondCarte = surFond(ligne.fond, support.carte.hex);
    out.contrasteFondCarte = contraste(hexDe(fondCarte), support.carte.hex);
  }
  for (const k of ['survol', 'appui']) {
    const e = out[k]?.fond;
    if (e && ref) {
      out[k].contrasteTexteFond = out[k].texte && hexDe(e) && hexDe(out[k].texte)
        ? contraste(hexDe(out[k].texte), hexDe(e))
        : undefined;
    }
  }
  return out;
}

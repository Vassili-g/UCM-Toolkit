/**
 * Lit les fichiers de `sources/` (sans exécuter aucun code téléchargé) et écrit
 * `processed/surfaces.json` et `processed/statuts.json`.
 * Aucune valeur n'est saisie à la main : chaque couleur vient d'un fichier de
 * `sources/`, avec le nom du token, la valeur publiée et le fichier d'origine.
 * Les valeurs calculées (composition d'une couleur translucide, conversion
 * oklch vers sRGB, contraste WCAG 2) sont signalées comme telles.
 * Usage : node Collecte/Surfaces/extract.mjs (après fetch.mjs)
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const racine = new URL('./', import.meta.url);
const sources = JSON.parse(readFileSync(new URL('sources.json', racine), 'utf8'));
const parId = Object.fromEntries(sources.map((s) => [s.id, s]));

const texte = (id) => {
  const s = parId[id];
  if (!s) throw new Error(`Source inconnue : ${id}`);
  const brut = readFileSync(new URL(s.localFile, racine));
  const sha = createHash('sha256').update(brut).digest('hex');
  if (sha !== s.sha256) throw new Error(`SHA-256 différent pour ${id} : relancer fetch.mjs`);
  return brut.toString('utf8');
};
const fichier = (id) => parId[id].localFile;
const ligneDe = (t, motif) => {
  const m = typeof motif === 'string' ? t.indexOf(motif) : t.search(motif);
  return m < 0 ? undefined : t.slice(0, m).split('\n').length;
};

/* ------------------------------------------------------------------ couleurs */

const clamp = (x) => Math.min(255, Math.max(0, x));
const hex2 = (n) => Math.round(clamp(n)).toString(16).padStart(2, '0');
const versHex = ([r, g, b]) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

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

/** Lit une couleur CSS publiée : hexa, rgb()/rgba(), oklch(), white, black. */
function lire(valeur) {
  const v = valeur.trim();
  let m;
  if (v === 'white') return { rgb: [255, 255, 255], a: 1 };
  if (v === 'black') return { rgb: [0, 0, 0], a: 1 };
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

const composer = (c, fondHex) => {
  if (c.a >= 1) return versHex(c.rgb);
  const f = lire(fondHex).rgb;
  return versHex(c.rgb.map((x, i) => Math.round(x) * c.a + f[i] * (1 - c.a)));
};
const luminance = (hex) => {
  const [r, g, b] = lire(hex).rgb.map((x) => {
    const c = Math.round(x) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contraste = (h1, h2) => {
  const [a, b] = [luminance(h1), luminance(h2)].sort((x, y) => y - x);
  return Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100;
};
const sens = (carte, page) =>
  carte === page ? 'identique' : luminance(carte) > luminance(page) ? 'plus claire' : 'plus foncée';

/**
 * Entrée de token : nom, valeur publiée, source. `fond` est l'hexa opaque sur
 * lequel composer une valeur translucide ; `hex` est alors une valeur calculée.
 */
function entree({ token, publie, id, ligne, via, fond, role, aussi, affiche }) {
  const c = lire(publie);
  const e = { token, valeurPubliee: affiche ?? publie };
  if (affiche) e.valeurResolue = publie;
  if (role) e.role = role;
  if (via) e.resolutionVia = via;
  if (c.a < 1) {
    e.translucide = true;
    e.alpha = Math.round(c.a * 1000) / 1000;
    if (fond) {
      e.composeSur = fond;
      e.hexCalcule = composer(c, fond);
    }
  } else {
    e.hex = versHex(c.rgb);
    if (/^oklch/.test(publie)) e.conversion = 'oklch vers sRGB (calcul), arrondi au pas de 8 bits';
  }
  e.source = { fichier: fichier(id) };
  if (ligne) e.source.ligne = ligne;
  if (aussi) Object.assign(e, aussi);
  return e;
}
/** Hexa opaque utilisable dans un calcul de contraste. */
const hexDe = (e) => e.hex ?? e.hexCalcule;

/** Une surface comparée à la page (et, si besoin, à une carte de référence). */
function comparee(e, page) {
  const h = hexDe(e);
  if (!page || !h) return e;
  const hp = hexDe(page);
  e.contrasteAvecPage = contraste(h, hp);
  e.sens = sens(h, hp) === 'identique' ? 'identique à la page' : `${sens(h, hp)} que la page`;
  return e;
}

/* ----------------------------------------------------------------- analyseurs */

/** Déclarations `--nom: valeur;` du premier bloc d'un fichier CSS. */
function premierBlocCss(t) {
  const arret = t.search(/@media/);
  const zone = arret < 0 ? t : t.slice(0, arret);
  const ouvre = zone.indexOf('{');
  const ferme = zone.lastIndexOf('}');
  const corps = zone.slice(ouvre + 1, ferme);
  const decls = {};
  const lignes = {};
  const base = zone.slice(0, ouvre + 1).split('\n').length - 1;
  corps.split('\n').forEach((l, i) => {
    const m = l.match(/^\s*--([\w-]+):\s*([^;]+);/);
    if (m) {
      decls[m[1]] = m[2].trim();
      lignes[m[1]] = base + i + 1;
    }
  });
  return { decls, lignes };
}
function resoudreVar(decls, nom, chaine = []) {
  const v = decls[nom];
  if (v === undefined) throw new Error(`Variable absente : --${nom}`);
  const m = v.match(/^var\(--([\w-]+)\)$/);
  if (!m) return { valeur: v, chaine: [...chaine, nom] };
  return resoudreVar(decls, m[1], [...chaine, nom]);
}

/** Valeurs de `export const nom = '...'` d'un module JS généré (Carbon). */
function exportsJs(t) {
  const out = {};
  for (const m of t.matchAll(/^export const (\w+) = '([^']*)';/gm)) out[m[1]] = m[2];
  return out;
}

/* ---- Lecture : Primer ---- */

const primer = (() => {
  const themes = {};
  for (const [theme, id] of [['light', 'primerLight'], ['dark', 'primerDark']]) {
    const t = texte(id);
    const { decls, lignes } = premierBlocCss(t);
    const prendre = (nom, role) => {
      const r = resoudreVar(decls, nom);
      const publie = decls[nom];
      return {
        nom,
        e: entree({
          token: `--${nom}`,
          publie: r.valeur,
          id,
          ligne: lignes[nom],
          via: publie.startsWith('var(') ? { chaine: r.chaine.map((n) => `--${n}`) } : undefined,
          affiche: publie.startsWith('var(') ? publie : undefined,
          role,
        }),
      };
    };
    themes[theme] = { t, id, decls, lignes, prendre };
  }
  return themes;
})();

/* ---- Lecture : Atlassian ---- */

const atlaskit = (() => {
  const noms = texte('atlaskitTokenNames');
  const nomDeToken = (token) => {
    const m = noms.match(new RegExp(`'${token.replace(/\./g, '\\.')}':\\s*'(--[\\w-]+)'`));
    if (!m) throw new Error(`Token Atlassian absent de token-names : ${token}`);
    return { variable: m[1], ligne: ligneDe(noms, `'${token}':`) };
  };
  const themes = {};
  for (const [theme, id] of [['light', 'atlaskitLight'], ['dark', 'atlaskitDark']]) {
    const t = texte(id);
    const m = t.match(/exports\.default = "(.*)";\s*$/s);
    const css = JSON.parse(`"${m[1]}"`);
    const premier = css.slice(0, css.indexOf('}'));
    const decls = {};
    for (const l of premier.split('\n')) {
      const d = l.match(/^\s*--([\w-]+):\s*([^;]+);/);
      if (d) decls[d[1]] = d[2].trim();
    }
    const prendre = (token, role) => {
      const { variable, ligne } = nomDeToken(token);
      const v = decls[variable.slice(2)];
      if (v === undefined) throw new Error(`Valeur absente : ${variable}`);
      if (v.startsWith('var(')) throw new Error(`Référence non résolue : ${variable}`);
      const e = entree({ token, publie: v, id, role, aussi: { variableCss: variable } });
      e.source.tokenNames = { fichier: fichier('atlaskitTokenNames'), ligne };
      return e;
    };
    themes[theme] = { prendre };
  }
  return themes;
})();

/* ---- Lecture : Carbon ---- */

const carbon = (() => {
  const noms = { white: 'carbonWhite', g10: 'carbonG10', g90: 'carbonG90', g100: 'carbonG100' };
  const themes = {};
  for (const [theme, id] of Object.entries(noms)) {
    const t = texte(id);
    const ex = exportsJs(t);
    const camel = (token) => token.replace(/-(\w)/g, (_, c) => c.toUpperCase()).replace(/-?(\d+)/, (_, d) => d);
    const prendre = (token, role) => {
      const cle = token.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/-(\d+)/, '$1');
      if (ex[cle] === undefined) throw new Error(`Carbon ${theme} : ${cle} absent`);
      return entree({ token, publie: ex[cle], id, ligne: ligneDe(t, `export const ${cle} =`), role, aussi: { exportJs: cle } });
    };
    themes[theme] = { prendre };
  }
  // fonds des notifications « low contrast »
  const scss = texte('carbonNotificationTokens');
  const notif = {};
  for (const ton of ['error', 'info', 'success', 'warning']) {
    const m = scss.match(new RegExp(`\\$notification-background-${ton}:\\s*\\(([^)]*)\\)`));
    if (!m) throw new Error(`notification-background-${ton} absent`);
    const parTheme = {};
    for (const p of m[1].matchAll(/([\w-]+):\s*([^,\n]+),/g)) parTheme[p[1]] = p[2].trim();
    notif[ton] = { parTheme, ligne: ligneDe(scss, `$notification-background-${ton}:`) };
  }
  const styles = texte('carbonInlineNotification');
  // vérification des paires lues dans le composant
  const verif = {};
  for (const ton of ['error', 'success', 'info', 'warning']) {
    verif[ton] = new RegExp(`inline-notification-low-contrast-${ton}[\\s\\S]{0,260}\\$support-${ton},\\s*\\$notification-background-${ton}`).test(styles);
  }
  const texteBase = /@mixin inline-notification-low-contrast-base\s*\{\s*color:\s*\$text-primary;/.test(styles);
  if (!texteBase || Object.values(verif).some((v) => !v)) throw new Error('Paires de la notification Carbon non retrouvées');
  return {
    themes,
    notif,
    nomScss: { white: 'white-theme', g10: 'g-10', g90: 'g-90', g100: 'g-100' },
    lignesComposant: {
      texte: ligneDe(styles, '@mixin inline-notification-low-contrast-base'),
      error: ligneDe(styles, '@mixin inline-notification-low-contrast-error'),
      success: ligneDe(styles, '@mixin inline-notification-low-contrast-success'),
      info: ligneDe(styles, '@mixin inline-notification-low-contrast-info'),
      warning: ligneDe(styles, '@mixin inline-notification-low-contrast-warning'),
    },
  };
})();

/* ---- Lecture : Polaris ---- */

const polaris = (() => {
  const t = texte('polarisTokensBuild');
  const i = t.indexOf('var themes = ') + 'var themes = '.length;
  let prof = 0;
  let j = i;
  for (; j < t.length; j++) {
    if (t[j] === '{') prof++;
    if (t[j] === '}' && --prof === 0) break;
  }
  const themes = JSON.parse(t.slice(i, j + 1));
  const prendre = (theme, nom, fond) => {
    const v = themes[theme].color[nom];
    if (v === undefined) throw new Error(`Polaris ${theme} : ${nom} absent`);
    return entree({ token: nom, publie: v, id: 'polarisTokensBuild', fond, aussi: { variableCss: `--p-${nom}` } });
  };
  // Paires lues dans le CSS du Badge et dans le code du Banner
  const css = texte('polarisStyles');
  const badge = {};
  for (const m of css.matchAll(/\.Polaris-Badge--tone(\w+)\s*\{\s*background-color:\s*var\(--p-([\w-]+)\);\s*color:\s*var\(--p-([\w-]+)\);/g)) {
    badge[m[1]] = { fond: m[2], texte: m[3], ligne: ligneDe(css, `.Polaris-Badge--tone${m[1]}{`) };
  }
  const util = texte('polarisBannerUtilities');
  const banner = {};
  for (const m of util.matchAll(/(\w+): \{\s*withinPage: \{\s*background: '([\w-]+)',\s*text: '([\w-]+)',\s*icon: '[\w-]+'\s*\},\s*withinContentContainer: \{\s*background: '([\w-]+)',\s*text: '([\w-]+)'/g)) {
    banner[m[1]] = { pageFond: m[2], pageTexte: m[3], contenuFond: m[4], contenuTexte: m[5], ligne: ligneDe(util, `  ${m[1]}: {`) };
  }
  return { themes, prendre, badge, banner, motifThemes: { light: 'light', dark: 'dark-experimental' } };
})();

/* ---- Lecture : Material 3 ---- */

const m3 = (() => {
  const ref = {};
  const refTxt = texte('m3RefPalette');
  for (const m of refTxt.matchAll(/'([\w-]+)':\s*if\(\$exclude-hardcoded-values,\s*null,\s*(#[0-9a-f]+)\)/gi)) ref[m[1]] = m[2];
  const sys = texte('m3SysColor');
  const blocs = {};
  for (const [theme, fn] of [['dark', 'values-dark'], ['light', 'values-light']]) {
    const debut = sys.indexOf(`@function ${fn}(`);
    const fin = sys.indexOf(');\n}', debut);
    const zone = sys.slice(debut, fin);
    const roles = {};
    for (const m of zone.matchAll(/'([\w-]+)':\s*map\.get\(\$deps,\s*'md-ref-palette',\s*'([\w-]+)'\)/g)) {
      roles[m[1]] = { palette: m[2], ligne: ligneDe(sys, new RegExp(`'${m[1]}':\\s*map\\.get[^\\n]*'${m[2]}'\\)`)) };
    }
    // les lignes sont cherchées dans la zone du thème
    const dec = sys.slice(0, debut).split('\n').length - 1;
    zone.split('\n').forEach((l, i) => {
      const m = l.match(/'([\w-]+)':\s*(?:map\.get\(\$deps,\s*'md-ref-palette',\s*'([\w-]+)'\)|$)/);
      if (m && roles[m[1]]) roles[m[1]].ligne = dec + i + 1;
    });
    blocs[theme] = roles;
  }
  const prendre = (theme, role, rolePourEntree) => {
    const r = blocs[theme][role];
    if (!r) throw new Error(`M3 ${theme} : ${role} absent`);
    const v = ref[r.palette];
    if (!v) throw new Error(`M3 palette ${r.palette} absente`);
    return entree({
      token: `md.sys.color.${role}`,
      publie: v,
      id: 'm3SysColor',
      ligne: r.ligne,
      via: { palette: `md.ref.palette.${r.palette}`, fichierPalette: fichier('m3RefPalette'), lignePalette: ligneDe(refTxt, `'${r.palette}':`) },
      role: rolePourEntree,
    });
  };
  // jetons CSS de labs/gb (autre artefact du même paquet)
  const css = texte('m3ColorTokensFull');
  const refCss = {};
  for (const m of css.matchAll(/--md-ref-palette-([\w-]+):\s*(#[0-9a-f]+)/gi)) refCss[m[1]] = m[2];
  const labs = (theme, role) => {
    const m = css.match(new RegExp(`--md-sys-color-${role}:\\s*light-dark\\(var\\(--md-ref-palette-([\\w-]+)\\),\\s*var\\(--md-ref-palette-([\\w-]+)\\)\\)`));
    if (!m) return null;
    const pal = theme === 'light' ? m[1] : m[2];
    return entree({
      token: `--md-sys-color-${role}`,
      publie: refCss[pal],
      id: 'm3ColorTokensFull',
      via: { palette: `--md-ref-palette-${pal}`, expression: `light-dark(${m[1]}, ${m[2]})` },
    });
  };
  // couleurs de conteneur des composants
  const composant = (id, theme) => {
    const t = texte(id);
    const m = t.match(/'container-color':\s*map\.get\(\$deps,\s*'md-sys-color',\s*'([\w-]+)'\)/) ?? t.match(/'container-color':\s*\n\s*map\.get\(\$deps,\s*'md-sys-color',\s*'([\w-]+)'\)/);
    if (!m) throw new Error(`container-color introuvable dans ${id}`);
    return { role: m[1], ligne: ligneDe(t, "'container-color':"), fichier: fichier(id) };
  };
  const successWarning = /success|warning|info/i.test(sys) || /--md-sys-color-(success|warning|info)/i.test(css);
  return { prendre, labs, composant, successWarning, blocs };
})();

/* ---- Lecture : Fluent 2 ---- */

const fluent = (() => {
  const colorsTxt = texte('fluentColors');
  const objets = {};
  for (const m of colorsTxt.matchAll(/export const (\w+) = \{([^}]*)\};/g)) {
    const o = {};
    for (const p of m[2].matchAll(/'?(\w+)'?:\s*'([^']+)'/g)) o[p[1]] = p[2];
    objets[m[1]] = o;
  }
  const scalaires = {};
  for (const m of colorsTxt.matchAll(/export const (\w+) = '(#[0-9a-f]+)';/g)) scalaires[m[1]] = m[2];
  const valeurDe = (expr) => {
    let m;
    if ((m = expr.match(/^(\w+)\[(\d+)\]$/))) {
      const v = objets[m[1]]?.[m[2]];
      if (!v) throw new Error(`Fluent : ${expr} introuvable`);
      return v;
    }
    if (scalaires[expr]) return scalaires[expr];
    throw new Error(`Fluent : expression non gérée ${expr}`);
  };
  const themes = {};
  for (const [theme, idAlias, idPal] of [['light', 'fluentLightColor', 'fluentLightPalette'], ['dark', 'fluentDarkColor', 'fluentDarkPalette']]) {
    const alias = texte(idAlias);
    const pal = texte(idPal);
    const neutre = (token, role) => {
      const m = alias.match(new RegExp(`^\\s*${token}:\\s*([\\w]+(?:\\[\\d+\\])?),`, 'm'));
      if (!m) throw new Error(`Fluent ${theme} : ${token} absent`);
      return entree({ token, publie: valeurDe(m[1]), id: idAlias, ligne: ligneDe(alias, new RegExp(`^\\s*${token}:`, 'm')), via: { expression: m[1], fichierCouleurs: fichier('fluentColors') }, role });
    };
    // Règles de correspondance lues dans les fichiers de palette (vérifiées par motif)
    const attendu = (motif) => {
      if (!motif.test(pal)) throw new Error(`Fluent ${theme} : règle de palette non retrouvée ${motif}`);
    };
    const R = theme === 'light'
      ? { Background1: 'tint60', Background2: 'tint40', Foreground1: 'shade10', Foreground2: 'shade30', Foreground3: 'primary', Border1: 'tint40' }
      : { Background1: 'shade40', Background2: 'shade30', Foreground1: 'tint30', Foreground2: 'tint40', Foreground3: 'tint20', Border1: 'primary' };
    for (const [suffixe, pas] of Object.entries(R)) {
      attendu(new RegExp(`colorPalette\\$\\{color\\}${suffixe}\`\\]: statusSharedColors\\[sharedColor\\]\\.${pas}`));
      attendu(new RegExp(`colorStatus\\$\\{color\\}${suffixe}\`\\]: mappedStatusColors\\[sharedColor\\]\\.${pas}`));
    }
    const palette = (couleur, suffixe) => {
      const nomCouleur = couleur[0].toLowerCase() + couleur.slice(1);
      const cap = nomCouleur[0].toUpperCase() + nomCouleur.slice(1);
      let pas = R[suffixe];
      let patch = null;
      const re = new RegExp(`statusColorPaletteTokens\\.colorPalette${cap}${suffixe} = statusSharedColors\\.${nomCouleur}\\.(\\w+);`);
      const m = pal.match(re);
      if (m) {
        pas = m[1];
        patch = ligneDe(pal, re);
      }
      const v = objets[nomCouleur]?.[pas];
      if (!v) throw new Error(`Fluent : ${nomCouleur}.${pas} introuvable`);
      return entree({
        token: `colorPalette${cap}${suffixe}`,
        publie: v,
        id: idPal,
        via: { expression: `${nomCouleur}.${pas}`, regle: patch ? `correction unitaire ligne ${patch}` : 'règle générale de la boucle', fichierCouleurs: fichier('fluentColors'), ligneCouleurs: ligneDe(colorsTxt, `export const ${nomCouleur} =`) },
      });
    };
    const statut = (tonCap, suffixe) => {
      const ton = tonCap[0].toLowerCase() + tonCap.slice(1);
      const cap = tonCap;
      const mapping = texte('fluentStatusMapping');
      const cm = mapping.match(new RegExp(`${ton}:\\s*'(\\w+)'`));
      if (!cm) throw new Error(`Fluent : statusColorMapping.${ton} absent`);
      const couleur = cm[1];
      let pas = R[suffixe];
      const re = new RegExp(`colorStatusTokens\\.colorStatus${cap}${suffixe} = mappedStatusColors\\[statusColorMapping\\.${ton}\\]\\.(\\w+);`);
      const m = pal.match(re);
      let patch = null;
      if (m) {
        pas = m[1];
        patch = ligneDe(pal, re);
      }
      const v = objets[couleur]?.[pas];
      if (!v) throw new Error(`Fluent : ${couleur}.${pas} introuvable`);
      return entree({
        token: `colorStatus${cap}${suffixe}`,
        publie: v,
        id: idPal,
        via: { expression: `${couleur}.${pas}`, correspondance: `statusColorMapping.${ton} = ${couleur}`, regle: patch ? `correction unitaire ligne ${patch}` : 'règle générale de la boucle', fichierCouleurs: fichier('fluentColors') },
      });
    };
    themes[theme] = { neutre, palette, statut };
  }
  return themes;
})();

/* ---- Lecture : shadcn/ui ---- */

const shadcn = (() => {
  const themes = {};
  const tTs = texte('shadcnThemes');
  const debut = tTs.indexOf('name: "neutral"');
  const fin = tTs.indexOf('name: "stone"');
  const neutral = tTs.slice(debut, fin);
  const iDark = neutral.indexOf('dark: {');
  const zones = { light: neutral.slice(0, iDark), dark: neutral.slice(iDark) };
  const decalage = tTs.slice(0, debut).split('\n').length - 1;
  const tCss = texte('shadcnGlobals');
  const iRoot = tCss.indexOf(':root {');
  const iDarkCss = tCss.indexOf('.dark {');
  const blocsCss = { light: tCss.slice(iRoot, iDarkCss), dark: tCss.slice(iDarkCss) };
  for (const theme of ['light', 'dark']) {
    const dansThemes = (nom, role) => {
      const re = new RegExp(`^\\s*"?${nom}"?:\\s*"([^"]+)"`, 'm');
      const m = zones[theme].match(re);
      if (!m) throw new Error(`shadcn themes.ts ${theme} : ${nom} absent`);
      const l = decalage + zones[theme].slice(0, zones[theme].search(re)).split('\n').length + (theme === 'dark' ? neutral.slice(0, iDark).split('\n').length - 1 : 0);
      return entree({ token: `--${nom}`, publie: m[1], id: 'shadcnThemes', ligne: l, role, aussi: { jeu: 'registry/themes.ts, thème "neutral"' } });
    };
    const dansCss = (nom, role) => {
      const re = new RegExp(`^\\s*--${nom}:\\s*([^;]+);`, 'm');
      const m = blocsCss[theme].match(re);
      if (!m) throw new Error(`shadcn globals.css ${theme} : ${nom} absent`);
      const base = (theme === 'light' ? iRoot : iDarkCss);
      const l = tCss.slice(0, base).split('\n').length - 1 + blocsCss[theme].slice(0, blocsCss[theme].search(re)).split('\n').length;
      return entree({ token: `--${nom}`, publie: m[1].trim(), id: 'shadcnGlobals', ligne: l, role, aussi: { jeu: 'app/globals.css du site de documentation' } });
    };
    themes[theme] = { dansThemes, dansCss };
  }
  return themes;
})();

/* ---- Lecture : Radix ---- */

const radix = {
  // Valeurs relevées dans Collecte/Radix/sources (non retéléchargées) :
  // base.css.txt (--color-background, --color-panel-solid) et gray.css.txt (--gray-1, --gray-2).
  light: {
    page: { token: '--color-background', valeurPubliee: 'white', hex: '#ffffff', source: { fichier: '../Radix/sources/themes/base.css.txt', ligne: 58 } },
    carte: { token: '--color-panel-solid', valeurPubliee: 'white', hex: '#ffffff', source: { fichier: '../Radix/sources/themes/base.css.txt', ligne: 60 } },
  },
  dark: {
    page: { token: '--color-background', valeurPubliee: 'var(--gray-1)', resolutionVia: { chaine: ['--gray-1'], fichier: '../Radix/sources/themes/gray.css.txt', ligne: 62 }, hex: '#111111', source: { fichier: '../Radix/sources/themes/base.css.txt', ligne: 73 } },
    carte: { token: '--color-panel-solid', valeurPubliee: 'var(--gray-2)', resolutionVia: { chaine: ['--gray-2'], fichier: '../Radix/sources/themes/gray.css.txt', ligne: 63 }, hex: '#191919', source: { fichier: '../Radix/sources/themes/base.css.txt', ligne: 75 } },
  },
};
// Vérification contre les fichiers locaux de Radix (lecture seule, sans retéléchargement)
{
  const lecture = (p) => readFileSync(new URL(p, racine), 'utf8');
  const base = lecture('../Radix/sources/themes/base.css.txt').split('\n');
  const gris = lecture('../Radix/sources/themes/gray.css.txt').split('\n');
  const att = (cond, msg) => {
    if (!cond) throw new Error(`Radix : ${msg}`);
  };
  att(/--color-background: white;/.test(base[57]), 'ligne 58 de base.css.txt');
  att(/--color-panel-solid: white;/.test(base[59]), 'ligne 60 de base.css.txt');
  att(/--color-background: var\(--gray-1\);/.test(base[72]), 'ligne 73 de base.css.txt');
  att(/--color-panel-solid: var\(--gray-2\);/.test(base[74]), 'ligne 75 de base.css.txt');
  att(/--gray-1: #111111;/.test(gris[61]), 'ligne 62 de gray.css.txt');
  att(/--gray-2: #191919;/.test(gris[62]), 'ligne 63 de gray.css.txt');
}

/* ---- Assemblage des surfaces ---- */

const surfaces = { systemes: [] };

/* ---- Primer ---- */
{
  const s = { id: 'primer', nom: 'GitHub Primer', versions: ['@primer/primitives@11.10.0'], themes: [] };
  for (const theme of ['light', 'dark']) {
    const P = primer[theme];
    const page = P.prendre('bgColor-default', 'page : fond par défaut des pages et zones de contenu').e;
    const carte = comparee(P.prendre('card-bgColor', 'carte (token dédié)').e, page);
    const creuse = comparee(P.prendre('bgColor-inset', 'fond creusé (inset)').e, page);
    const overlay = comparee(P.prendre('overlay-bgColor', 'fond des superpositions (overlay)').e, page);
    const muted = comparee(P.prendre('bgColor-muted', 'fond atténué, zones secondaires').e, page);
    s.themes.push({ id: theme, page, cartes: [carte], creuse, overlay, autres: [muted] });
  }
  surfaces.systemes.push(s);
}

/* ---- Atlassian ---- */
{
  const s = { id: 'atlassian', nom: 'Atlassian', versions: ['@atlaskit/tokens@20.4.1'], themes: [] };
  for (const theme of ['light', 'dark']) {
    const A = atlaskit[theme];
    const page = A.prendre('elevation.surface', 'page : surface par défaut');
    const carte = comparee(A.prendre('elevation.surface.raised', 'carte : surface surélevée'), page);
    const creuse = comparee(A.prendre('elevation.surface.sunken', 'surface creusée'), page);
    const overlay = comparee(A.prendre('elevation.surface.overlay', 'surface des superpositions'), page);
    s.themes.push({ id: theme, page, cartes: [carte], creuse, overlay, autres: [] });
  }
  surfaces.systemes.push(s);
}

/* ---- Carbon ---- */
{
  const s = {
    id: 'carbon',
    nom: 'IBM Carbon',
    versions: ['@carbon/themes@11.83.0'],
    notes: [
      'Les couches de Carbon sont relatives : layer-02 se pose sur layer-01, qui se pose sur background. Le contraste avec la page est donné pour les trois, mais seul layer-01 repose directement sur la page.',
      "Le token `overlay` est un voile rgba(0, 0, 0, 0.6), pas une surface ; l'hexa est calculé en le composant sur la page.",
      'Carbon ne publie pas de fond creusé nommé.',
    ],
    themes: [],
  };
  for (const theme of ['white', 'g10', 'g90', 'g100']) {
    const C = carbon.themes[theme];
    const page = C.prendre('background', 'page');
    const hp = hexDe(page);
    const carte1 = comparee(C.prendre('layer-01', 'carte : première couche'), page);
    const carte2 = comparee(C.prendre('layer-02', 'deuxième couche (se pose sur layer-01)'), page);
    const accent = comparee(C.prendre('layer-accent-01', "couche d'accent (sur layer-01)"), page);
    const ov = C.prendre('overlay', 'voile derrière les modales');
    const c = lire(ov.valeurPubliee);
    ov.composeSur = { page: hp };
    ov.hexCalcule = composer(c, hp);
    delete ov.hex;
    comparee(ov, page);
    s.themes.push({ id: theme, page, cartes: [carte1, carte2], creuse: null, overlay: ov, autres: [accent] });
  }
  surfaces.systemes.push(s);
}

/* ---- Polaris ---- */
{
  const s = {
    id: 'polaris',
    nom: 'Shopify Polaris',
    versions: ['@shopify/polaris-tokens@9.4.2'],
    notes: [
      "Le thème sombre publié s'appelle `dark-experimental`. Il ne redéfinit qu'une partie des tokens : `color-bg-surface-secondary` reste à #f7f7f7 et les fonds de statut `bg-surface-*` restent ceux du thème clair.",
      "`color-backdrop-bg` (rgba(0, 0, 0, 0.71)) est le voile derrière les modales ; l'hexa est calculé en le composant sur la page.",
    ],
    themes: [],
  };
  for (const [id, th] of Object.entries(polaris.motifThemes)) {
    const page = polaris.prendre(th, 'color-bg');
    page.role = 'page';
    const carte = comparee(Object.assign(polaris.prendre(th, 'color-bg-surface'), { role: 'carte' }), page);
    const creuse = comparee(Object.assign(polaris.prendre(th, 'color-bg-surface-secondary'), { role: 'surface secondaire (le plus proche du creusé)' }), page);
    const ov = Object.assign(polaris.prendre(th, 'color-backdrop-bg', hexDe(page)), { role: 'voile derrière les modales' });
    comparee(ov, page);
    s.themes.push({ id, themePublie: th, page, cartes: [carte], creuse, overlay: ov, autres: [] });
  }
  surfaces.systemes.push(s);
}

/* ---- Material 3 ---- */
{
  const s = {
    id: 'material3',
    nom: 'Material 3',
    versions: ['@material/web@2.5.0 (tokens/versions/v0_192)'],
    notes: [
      "Schéma de base (baseline), sans couleur source dynamique. Le thème s'obtient par `light-dark()` dans le CSS de labs, et par deux fonctions `values-light` et `values-dark` dans les tokens SCSS.",
      "Le rôle `background` est présent dans les tokens SCSS et vaut `surface` ; il est absent du CSS de labs/gb.",
      "Le composant Card existe en trois variantes (elevated, filled, outlined), sans variante par défaut déclarée dans les fichiers lus : les trois sont donnés.",
      "M3 ne publie pas de fond « creusé » nommé. `surface-dim` et `surface-container-lowest` sont donnés en autres surfaces.",
    ],
    themes: [],
  };
  const cartes = [
    ['m3ElevatedCard', 'Elevated card'],
    ['m3FilledCard', 'Filled card'],
    ['m3OutlinedCard', 'Outlined card'],
  ];
  for (const theme of ['light', 'dark']) {
    const page = m3.prendre(theme, 'background', 'page');
    const cs = cartes.map(([id, nom]) => {
      const c = m3.composant(id);
      const e = m3.prendre(theme, c.role, `${nom} : container-color`);
      e.composant = { fichier: c.fichier, ligne: c.ligne, containerColor: `md.sys.color.${c.role}` };
      return comparee(e, page);
    });
    const dlg = m3.composant('m3Dialog');
    const overlay = comparee(Object.assign(m3.prendre(theme, dlg.role, 'Dialog : container-color'), { composant: { fichier: dlg.fichier, ligne: dlg.ligne, containerColor: `md.sys.color.${dlg.role}` } }), page);
    const menu = m3.composant('m3Menu');
    const autres = [
      comparee(Object.assign(m3.prendre(theme, menu.role, 'Menu : container-color'), { composant: { fichier: menu.fichier, ligne: menu.ligne, containerColor: `md.sys.color.${menu.role}` } }), page),
    ];
    for (const r of ['surface', 'surface-dim', 'surface-bright', 'surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest']) {
      const e = comparee(m3.prendre(theme, r, 'échelle des surfaces'), page);
      const l = m3.labs(theme, r);
      if (l) e.verifLabs = { token: l.token, hex: hexDe(l), identique: hexDe(l) === hexDe(e) };
      autres.push(e);
    }
    const sc = m3.prendre(theme, 'scrim', 'voile (scrim) : couleur seule, l\'opacité n\'est pas dans ce token');
    s.themes.push({ id: theme, page, cartes: cs, creuse: null, overlay, autres: [...autres, sc] });
  }
  surfaces.systemes.push(s);
}

/* ---- Fluent 2 ---- */
{
  const s = {
    id: 'fluent2',
    nom: 'Microsoft Fluent 2',
    versions: ['@fluentui/tokens@1.0.0-alpha.24 (thèmes web)', '@fluentui/react-card@9.7.3', '@fluentui/react-message-bar@9.7.7'],
    notes: [
      "Fluent ne déclare pas de rôle « page ». `colorNeutralBackground1` est la surface de base ; le Card `filled` l'utilise (useCardStyles, ligne indiquée), `filledAlternative` utilise `colorNeutralBackground2`, et la barre de message sans statut utilise `colorNeutralBackground3`.",
      "Le contraste est donc calculé entre la carte (Background1) et chacun des fonds neutres 2 à 6, sans en désigner un comme page.",
    ],
    themes: [],
  };
  const cardTxt = texte('fluentCardStyles');
  const verifCarte = [
    ['filled', 'colorNeutralBackground1'],
    ['filledAlternative', 'colorNeutralBackground2'],
  ];
  for (const [classe, tok] of verifCarte) {
    if (!new RegExp(`${classe}: \\{\\s*backgroundColor: tokens\\.${tok},`).test(cardTxt)) throw new Error(`Fluent Card ${classe} ne correspond pas à ${tok}`);
  }
  const barre = texte('fluentMessageBarStyles');
  if (!/backgroundColor: tokens\.colorNeutralBackground3\s*\}\);/.test(barre)) throw new Error('MessageBar : colorNeutralBackground3 non retrouvé');
  for (const theme of ['light', 'dark']) {
    const F = fluent[theme];
    const carte = F.neutre('colorNeutralBackground1', 'carte : Card `filled` (useCardStyles.styles.raw.js)');
    carte.composant = { fichier: fichier('fluentCardStyles'), ligne: ligneDe(cardTxt, /filled: \{\s*backgroundColor/), classe: 'filled' };
    const autres = [];
    for (const [n, role] of [
      [2, 'Card `filledAlternative`'],
      [3, 'barre de message sans statut (MessageBar)'],
      [4, 'fond neutre 4'],
      [5, 'fond neutre 5'],
      [6, 'fond neutre 6'],
    ]) {
      const e = F.neutre(`colorNeutralBackground${n}`, role);
      const h = hexDe(e);
      const hc = hexDe(carte);
      e.contrasteAvecCarte = contraste(h, hc);
      e.sensParRapportALaCarte = h === hc ? 'identique à la carte' : luminance(h) > luminance(hc) ? 'plus claire que la carte' : 'plus foncée que la carte';
      autres.push(e);
    }
    autres[0].composant = { fichier: fichier('fluentCardStyles'), ligne: ligneDe(cardTxt, /filledAlternative: \{\s*backgroundColor/), classe: 'filledAlternative' };
    autres[1].composant = { fichier: fichier('fluentMessageBarStyles'), ligne: ligneDe(barre, 'backgroundColor: tokens.colorNeutralBackground3'), classe: 'useRootBaseStyles' };
    s.themes.push({ id: theme, page: null, cartes: [carte], creuse: null, overlay: null, autres });
  }
  surfaces.systemes.push(s);
}

/* ---- shadcn/ui ---- */
{
  const s = {
    id: 'shadcn',
    nom: 'shadcn/ui',
    versions: [`shadcn-ui/ui@${parId.shadcnThemes.revision}`],
    notes: [
      'Deux fichiers sont lus : le jeu `neutral` de registry/themes.ts (ce que le registre publie) et le globals.css du site de documentation. Leurs valeurs de `--background` et `--card` sont identiques ; les écarts éventuels sont signalés dans `verifGlobals`.',
      "Les valeurs sont en oklch ; l'hexa est une conversion calculée.",
      "Le fichier public/r/themes/neutral.json de la même révision porte d'anciennes valeurs HSL où --card égale --background dans les deux thèmes (champ ancienRegistreJson) ; il ne correspond ni à themes.ts ni à globals.css.",
      "shadcn ne publie pas de fond creusé nommé. `--muted` est donné comme fond secondaire, `--popover` comme surface des superpositions.",
    ],
    themes: [],
  };
  for (const theme of ['light', 'dark']) {
    const S = shadcn[theme];
    const page = S.dansThemes('background', 'page');
    const carte = comparee(S.dansThemes('card', 'carte'), page);
    const popover = comparee(S.dansThemes('popover', 'surface des popovers et menus'), page);
    const muted = comparee(S.dansThemes('muted', 'fond atténué'), page);
    const verif = {};
    for (const n of ['background', 'card', 'popover', 'muted']) {
      const g = S.dansCss(n);
      const ref = { background: page, card: carte, popover, muted }[n];
      verif[n] = { valeurPubliee: g.valeurPubliee, hex: hexDe(g), identiqueAuRegistre: hexDe(g) === hexDe(ref), source: g.source };
    }
    const ancien = JSON.parse(texte('shadcnNeutralJson')).cssVars[theme];
    const hsl = (chaine) => {
      const [h, sat, lum] = chaine.match(/[0-9.]+/g).map(Number);
      const s2 = sat / 100;
      const l2 = lum / 100;
      const k = (n) => (n + h / 30) % 12;
      const a = s2 * Math.min(l2, 1 - l2);
      return versHex([0, 8, 4].map((n) => 255 * (l2 - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))));
    };
    const ancienRegistre = {};
    for (const n of ['background', 'card']) {
      const texteJson = texte('shadcnNeutralJson');
      ancienRegistre[n] = { valeurPubliee: ancien[n], hexCalcule: hsl(ancien[n]), source: { fichier: fichier('shadcnNeutralJson'), ligne: ligneDe(texteJson, `"${n}": "${ancien[n]}"`) } };
    }
    s.themes.push({ id: theme, page, cartes: [carte], creuse: null, overlay: popover, autres: [muted], verifGlobals: { fichier: fichier('shadcnGlobals'), ...verif }, ancienRegistreJson: ancienRegistre });
  }
  surfaces.systemes.push(s);
}

/* ---- Radix Themes ---- */
{
  const s = {
    id: 'radix',
    nom: 'Radix Themes',
    versions: ['@radix-ui/themes@3.3.0', '@radix-ui/colors@3.0.0 (relevé existant, non retéléchargé)'],
    notes: ['Valeurs reprises des fichiers de Collecte/Radix/sources, relus sans retéléchargement. Le panneau est le panneau opaque (`--color-panel-solid`).'],
    themes: [],
  };
  for (const theme of ['light', 'dark']) {
    const page = radix[theme].page;
    const carte = comparee({ ...radix[theme].carte, role: 'carte : panneau opaque' }, page);
    s.themes.push({ id: theme, page: { ...page, role: 'page' }, cartes: [carte], creuse: null, overlay: null, autres: [] });
  }
  surfaces.systemes.push(s);
}

/* ---- Assemblage des statuts ---- */

const statuts = { systemes: [] };

/** Évalue une paire fond/texte contre la page et les cartes d'un thème. */
function evaluer({ ton, usage, fond, texteEntree, bordure, icone, page, cartes, composant, notes, nomTexte = 'texte' }) {
  const hp = hexDe(page);
  const refCarte = cartes[0];
  const out = { ton, usage, fond: { ...fond }, [nomTexte]: texteEntree, ...(bordure ? { bordure } : {}), ...(icone ? { icone } : {}) };
  if (composant) out.composant = composant;
  const translucide = fond.translucide === true;
  const f = fond.alpha !== undefined ? lire(fond.valeurResolue ?? fond.valeurPubliee) : null;
  if (translucide) {
    out.fond.hexSurPage = composer(f, hp);
    out.fond.hexSurCarte = {};
    for (const c of cartes) out.fond.hexSurCarte[c.token] = composer(f, hexDe(c));
    delete out.fond.hexCalcule;
    out.fond.composeSur = 'page et chacune des cartes de ce thème (voir hexSurPage et hexSurCarte)';
  }
  const hexFondSurCarte = (c) => (translucide ? composer(f, hexDe(c)) : hexDe(fond));
  const th = hexDe(texteEntree);
  out.contrasteTexteFond = contraste(th, hexFondSurCarte(refCarte));
  out.contrasteTexteFondReference = `fond sur la carte ${refCarte.token}`;
  if (translucide) out.contrasteTexteFondSurPage = contraste(th, composer(f, hp));
  out.contrasteFondPage = contraste(translucide ? composer(f, hp) : hexDe(fond), hp);
  out.contrasteFondCartes = {};
  for (const c of cartes) out.contrasteFondCartes[c.token] = contraste(hexFondSurCarte(c), hexDe(c));
  if (notes) out.notes = notes;
  return out;
}

/* ---- Material 3 ---- */
{
  const s = {
    id: 'material3',
    nom: 'Material 3',
    versions: ['@material/web@2.5.0'],
    notes: [
      "M3 publie un seul ton de statut : error (`error-container` et `on-error-container`). Les fichiers sys-color lus ne contiennent aucun rôle success, warning ni info (recherche textuelle : aucune occurrence).",
      'Deux artefacts du même paquet divergent sur `on-error-container` en clair : tokens SCSS v0_192 (error10) contre labs/gb CSS (error30). Les deux sont donnés.',
    ],
    themes: [],
  };
  if (m3.successWarning) throw new Error('M3 : un rôle success/warning/info existe, adapter le relevé');
  for (const theme of ['light', 'dark']) {
    const surf = surfaces.systemes.find((x) => x.id === 'material3').themes.find((x) => x.id === theme);
    const page = surf.page;
    const cartes = surf.cartes;
    const fond = m3.prendre(theme, 'error-container', 'fond');
    const txt = m3.prendre(theme, 'on-error-container', 'texte');
    const err = m3.prendre(theme, 'error', 'icône / accent');
    const labsFond = m3.labs(theme, 'error-container');
    const labsTxt = m3.labs(theme, 'on-error-container');
    const e1 = evaluer({ ton: 'error', usage: 'Tokens SCSS v0_192 : error-container / on-error-container', fond, texteEntree: txt, icone: err, page, cartes });
    const e2 = evaluer({ ton: 'error', usage: 'CSS labs/gb (md-color-tokens-full.css) : error-container / on-error-container', fond: labsFond, texteEntree: labsTxt, page, cartes });
    e2.accordAvecScss = { fond: hexDe(labsFond) === hexDe(fond), texte: hexDe(labsTxt) === hexDe(txt) };
    s.themes.push({ id: theme, tons: [e1, e2] });
  }
  statuts.systemes.push(s);
}

/* ---- Carbon ---- */
{
  const s = {
    id: 'carbon',
    nom: 'IBM Carbon',
    versions: ['@carbon/themes@11.83.0', '@carbon/styles@1.117.0'],
    notes: [
      "Notification inline « low contrast » : fond `notification-background-<ton>`, texte `text-primary`, trait et icône `support-<ton>` (paires vérifiées dans _inline-notification.scss, lignes en `composant`).",
      'En g90 et g100, le fond de notification est un gris neutre, identique à layer-01 du même thème : la couleur du ton ne passe que par le trait et l\'icône.',
    ],
    themes: [],
  };
  for (const theme of ['white', 'g10', 'g90', 'g100']) {
    const surf = surfaces.systemes.find((x) => x.id === 'carbon').themes.find((x) => x.id === theme);
    const C = carbon.themes[theme];
    const tons = [];
    for (const ton of ['error', 'success', 'warning', 'info']) {
      const n = carbon.notif[ton];
      const brut = n.parTheme[carbon.nomScss[theme]];
      const fond = entree({ token: `notification-background-${ton}`, publie: brut, id: 'carbonNotificationTokens', ligne: n.ligne, role: 'fond' });
      const txt = C.prendre('text-primary', 'texte');
      const support = C.prendre(`support-${ton}`, 'trait et icône');
      const e = evaluer({ ton, usage: 'Inline notification, style low-contrast', fond, texteEntree: txt, bordure: support, page: surf.page, cartes: surf.cartes, composant: { fichier: fichier('carbonInlineNotification'), lignes: { texte: carbon.lignesComposant.texte, ton: carbon.lignesComposant[ton] } } });
      tons.push(e);
    }
    s.themes.push({ id: theme, tons });
  }
  statuts.systemes.push(s);
}

/* ---- Polaris ---- */
{
  const s = {
    id: 'polaris',
    nom: 'Shopify Polaris',
    versions: ['@shopify/polaris-tokens@9.4.2', '@shopify/polaris@13.9.5'],
    notes: [
      'Badge (Badge.css, dans polarisStyles) : fond `bg-fill-<ton>-secondary`, texte `text-<ton>`.',
      'Banner dans un contenu (Banner/utilities.js, withinContentContainer) : fond `bg-surface-<ton>`, texte `text-<ton>` ; dans une page : aplat plein `bg-fill-<ton>` et texte `text-<ton>-on-bg-fill` (non relevé ici).',
      "Le thème sombre `dark-experimental` ne redéfinit pas les tokens de statut : ils valent ceux du thème clair, posés sur une page sombre (#1a1a1a) et une carte #303030. Les valeurs sont celles que le paquet publie.",
      "Le ton « info » de Polaris est le ton bleu ; « caution » (Badge `attention`) est le jaune ; « warning » est l'orange.",
    ],
    themes: [],
  };
  const tons = [
    ['critical', 'Critical'],
    ['success', 'Success'],
    ['warning', 'Warning'],
    ['info', 'Info'],
    ['caution', 'Attention'],
  ];
  for (const [id, th] of Object.entries(polaris.motifThemes)) {
    const surf = surfaces.systemes.find((x) => x.id === 'polaris').themes.find((x) => x.id === id);
    const list = [];
    for (const [ton, cle] of tons) {
      const b = polaris.badge[cle];
      if (!b) throw new Error(`Polaris Badge ${cle} introuvable`);
      if (b.fond !== `color-bg-fill-${ton}-secondary` || b.texte !== `color-text-${ton}`) throw new Error(`Polaris Badge ${cle} : paire inattendue ${b.fond}/${b.texte}`);
      const fond = polaris.prendre(th, b.fond);
      const txt = polaris.prendre(th, b.texte);
      const icone = polaris.prendre(th, `color-icon-${ton}`);
      list.push(evaluer({ ton, usage: 'Badge (tone)', fond, texteEntree: txt, icone, page: surf.page, cartes: surf.cartes, composant: { fichier: fichier('polarisStyles'), ligne: b.ligne, classe: `Polaris-Badge--tone${cle}` } }));
    }
    for (const ton of ['critical', 'success', 'warning', 'info']) {
      const b = polaris.banner[ton];
      if (!b) throw new Error(`Polaris Banner ${ton} introuvable`);
      if (b.contenuFond !== `bg-surface-${ton}` || b.contenuTexte !== `text-${ton}`) throw new Error(`Polaris Banner ${ton} : paire inattendue`);
      const fond = polaris.prendre(th, `color-${b.contenuFond}`);
      const txt = polaris.prendre(th, `color-${b.contenuTexte}`);
      list.push(evaluer({ ton, usage: 'Banner dans un contenu (withinContentContainer)', fond, texteEntree: txt, page: surf.page, cartes: surf.cartes, composant: { fichier: fichier('polarisBannerUtilities'), ligne: b.ligne } }));
    }
    s.themes.push({ id, themePublie: th, tons: list });
  }
  statuts.systemes.push(s);
}

/* ---- Fluent 2 ---- */
{
  const s = {
    id: 'fluent2',
    nom: 'Microsoft Fluent 2',
    versions: ['@fluentui/tokens@1.0.0-alpha.24', '@fluentui/react-message-bar@9.7.7', '@fluentui/react-badge@9.5.6'],
    notes: [
      'Badge `tint` (useBadgeStyles) : fond `colorPalette<Couleur>Background1`, texte `colorPalette<Couleur>Foreground1`, contour `…Border1`. danger = Red, severe = DarkOrange, success = Green, warning = Yellow.',
      "MessageBar (useMessageBarStyles) : fond `colorStatus<Ton>Background1`, contour `…Border1`, icône `colorStatus<Ton>Foreground1` (Foreground3 pour warning) ; le texte n'est pas fixé dans ce fichier, la colonne `texte` donne `colorNeutralForeground1`, le texte courant du thème, à titre indicatif et non lu dans un composant.",
      'Les paires `…Background2` / `…Foreground2` existent dans les tokens (ligne `palette 2`) ; aucun composant lu ne les assemble.',
      "Les cartes de comparaison sont Background1 (Card filled) ; la page n'est pas déclarée, son contraste est celui avec le fond neutre 2 (Background2), donné comme repère.",
    ],
    themes: [],
  };
  const badgeTxt = texte('fluentBadgeStyles');
  const mbTxt = texte('fluentMessageBarStyles');
  const verifBadge = { Red: 'danger', DarkOrange: 'severe', Green: 'success', Yellow: 'warning' };
  for (const c of Object.keys(verifBadge)) {
    const re = new RegExp(`'tint-${verifBadge[c]}':\\s*\\{\\s*backgroundColor: tokens\\.colorPalette${c}Background1,\\s*color: tokens\\.colorPalette${c}Foreground1,`);
    if (!re.test(badgeTxt)) throw new Error(`Fluent Badge tint-${verifBadge[c]} : paire non retrouvée`);
  }
  for (const [ton, cle] of [['Danger', 'error'], ['Warning', 'warning'], ['Success', 'success']]) {
    if (!new RegExp(`${cle}: \\{\\s*backgroundColor: tokens\\.colorStatus${ton}Background1`).test(mbTxt)) throw new Error(`MessageBar ${cle} : fond non retrouvé`);
  }
  for (const theme of ['light', 'dark']) {
    const surf = surfaces.systemes.find((x) => x.id === 'fluent2').themes.find((x) => x.id === theme);
    const F = fluent[theme];
    const carte = surf.cartes[0];
    const page = surf.autres[0]; // Background2 : repère, la page n'est pas déclarée
    const list = [];
    const defaut = F.neutre('colorNeutralForeground1', 'texte courant du thème');
    for (const [ton, cle, nomBadge] of [['Danger', 'error', 'danger'], ['Warning', 'warning', 'warning'], ['Success', 'success', 'success']]) {
      const fond = F.statut(ton, 'Background1');
      const ico = F.statut(ton, cle === 'warning' ? 'Foreground3' : 'Foreground1');
      const bord = F.statut(ton, 'Border1');
      list.push(evaluer({ ton: cle, usage: 'MessageBar', fond, texteEntree: defaut, icone: ico, bordure: bord, page, cartes: [carte], composant: { fichier: fichier('fluentMessageBarStyles'), ligne: ligneDe(mbTxt, `backgroundColor: tokens.colorStatus${ton}Background1`) } }));
    }
    for (const [couleur, nomBadge] of Object.entries(verifBadge)) {
      const fond = F.palette(couleur, 'Background1');
      const txt = F.palette(couleur, 'Foreground1');
      const bord = F.palette(couleur, 'Border1');
      list.push(evaluer({ ton: nomBadge, usage: 'Badge tint', fond, texteEntree: txt, bordure: bord, page, cartes: [carte], composant: { fichier: fichier('fluentBadgeStyles'), ligne: ligneDe(badgeTxt, `'tint-${nomBadge}': {`) } }));
      const fond2 = F.palette(couleur, 'Background2');
      const txt2 = F.palette(couleur, 'Foreground2');
      list.push(evaluer({ ton: nomBadge, usage: 'palette 2 : Background2 / Foreground2 (aucun composant lu)', fond: fond2, texteEntree: txt2, page, cartes: [carte] }));
    }
    s.themes.push({ id: theme, reperePage: surf.autres[0].token, tons: list });
  }
  statuts.systemes.push(s);
}

/* ---- Primer (complément de contraste) ---- */
{
  const s = {
    id: 'primer',
    nom: 'GitHub Primer',
    versions: ['@primer/primitives@11.10.0'],
    notes: [
      'Complément : les valeurs figurent déjà dans RELEVE-STATUTS-ET-FOCUS.md ; ce bloc ajoute les contrastes.',
      "Flash : fond `bgColor-<ton>-muted`, texte neutre `fgColor-default`, icône `fgColor-<ton>` (association reprise du relevé précédent, non relue dans le code de Flash). Label : texte `fgColor-<ton>` sans fond. La colonne `texteTon` donne le contraste de `fgColor-<ton>` sur le fond, à titre de repère.",
      'Les fonds `-muted` sont translucides en sombre (alpha 10 à 15 %) : l\'hexa est composé sur la page et sur la carte.',
    ],
    themes: [],
  };
  for (const theme of ['light', 'dark']) {
    const surf = surfaces.systemes.find((x) => x.id === 'primer').themes.find((x) => x.id === theme);
    const P = primer[theme];
    const list = [];
    for (const [ton, nom] of [['success', 'success'], ['attention', 'attention'], ['danger', 'danger'], ['accent', 'accent']]) {
      const fond = P.prendre(`bgColor-${nom}-muted`, 'fond').e;
      const txt = P.prendre('fgColor-default', 'texte neutre (Flash)').e;
      const ton2 = P.prendre(`fgColor-${nom}`, 'texte et icône du ton').e;
      const bord = P.prendre(`borderColor-${nom}-muted`, 'contour').e;
      const e = evaluer({ ton, usage: 'Flash', fond, texteEntree: txt, bordure: bord, page: surf.page, cartes: surf.cartes });
      const f = fond.alpha !== undefined ? lire(fond.valeurResolue ?? fond.valeurPubliee) : null;
      const fh = f ? composer(f, hexDe(surf.cartes[0])) : hexDe(fond);
      e.texteTon = { ...ton2, contrasteSurFond: contraste(hexDe(ton2), fh) };
      list.push(e);
    }
    s.themes.push({ id: theme, tons: list });
  }
  statuts.systemes.push(s);
}

/* ---- Atlassian (complément de contraste) ---- */
{
  const s = {
    id: 'atlassian',
    nom: 'Atlassian',
    versions: ['@atlaskit/tokens@20.4.1'],
    notes: [
      'Complément : les valeurs figurent déjà dans RELEVE-STATUTS-ET-FOCUS.md ; ce bloc ajoute les contrastes.',
      'Lozenge discret : fond `color.background.<ton>.subtler`, texte `color.text.<ton>.bolder`. Section message : fond `color.background.<ton>`, texte neutre `color.text`.',
    ],
    themes: [],
  };
  for (const theme of ['light', 'dark']) {
    const surf = surfaces.systemes.find((x) => x.id === 'atlassian').themes.find((x) => x.id === theme);
    const A = atlaskit[theme];
    const list = [];
    for (const ton of ['success', 'warning', 'danger', 'information']) {
      list.push(evaluer({ ton, usage: 'Lozenge discret', fond: A.prendre(`color.background.${ton}.subtler`), texteEntree: A.prendre(`color.text.${ton}.bolder`), bordure: A.prendre(`color.border.${ton}`), page: surf.page, cartes: surf.cartes }));
    }
    for (const ton of ['success', 'warning', 'danger', 'information']) {
      list.push(evaluer({ ton, usage: 'Section message', fond: A.prendre(`color.background.${ton}`), texteEntree: A.prendre('color.text'), page: surf.page, cartes: surf.cartes }));
    }
    s.themes.push({ id: theme, tons: list });
  }
  statuts.systemes.push(s);
}

/* ---------------------------------------------------------------------- écriture */

const entete = {
  genereLe: 'extract.mjs (voir README.md)',
  methode: 'Valeurs lues dans sources/ ; hexa calculé = composition d\'une couleur translucide ou conversion oklch ; contraste = WCAG 2, luminance relative standard, arrondi à 0,01.',
  sources: sources.map((x) => ({ id: x.id, fichier: x.localFile, version: x.revision, sha256: x.sha256 })),
};
mkdirSync(new URL('processed/', racine), { recursive: true });
writeFileSync(new URL('processed/surfaces.json', racine), JSON.stringify({ ...entete, ...surfaces }, null, 2) + '\n');
writeFileSync(new URL('processed/statuts.json', racine), JSON.stringify({ ...entete, ...statuts }, null, 2) + '\n');
console.log('processed/surfaces.json et processed/statuts.json écrits.');

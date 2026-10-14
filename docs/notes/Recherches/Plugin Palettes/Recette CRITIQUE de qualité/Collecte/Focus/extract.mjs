/**
 * Lit les fichiers de `sources/` (sans exécuter aucun code téléchargé) et écrit
 * `focus.json` : l'indicateur de focus du bouton plein, d'un bouton secondaire
 * ou à contour, et du champ de saisie, pour dix systèmes.
 * Aucune couleur n'est saisie à la main : chaque valeur vient d'un fichier de
 * `sources/`, avec le motif lu et la ligne. Les valeurs calculées (composition
 * d'une couleur translucide, conversion oklch vers sRGB, palettes Ant Design en
 * thème sombre, contraste WCAG 2) sont signalées comme telles.
 * Usage : node Collecte/Focus/extract.mjs (après fetch.mjs)
 */
import { readFileSync, writeFileSync } from 'node:fs';
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
const ligneAu = (t, index) => t.slice(0, index).split('\n').length;
/** Ligne (1-based) de la première occurrence ; échoue si le motif a disparu. */
const ligneDe = (id, motif, depuis = 0) => {
  const t = texte(id);
  const reste = t.slice(depuis);
  const m = typeof motif === 'string' ? reste.indexOf(motif) : reste.search(motif);
  if (m < 0) throw new Error(`Motif absent de ${id} : ${motif}`);
  return ligneAu(t, depuis + m);
};
const src = (id, motif, depuis = 0) => ({ fichier: fichier(id), ligne: ligneDe(id, motif, depuis) });
const exiger = (id, motif) => {
  const t = texte(id);
  const ok = typeof motif === 'string' ? t.includes(motif) : motif.test(t);
  if (!ok) throw new Error(`Règle attendue absente de ${id} : ${motif}`);
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

/** Lit une couleur CSS : hexa, rgb()/rgba() (virgules ou espaces), oklch(), white, black, transparent. */
function lire(valeur) {
  const v = String(valeur).trim();
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
  if ((m = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)(%?)\s*)?\)$/))) {
    const a = m[4] === undefined ? 1 : m[5] ? +m[4] / 100 : +m[4];
    return { rgb: [+m[1], +m[2], +m[3]], a };
  }
  if ((m = v.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+|none)(?:\s*\/\s*([\d.]+)(%?))?\s*\)$/))) {
    const L = m[2] ? +m[1] / 100 : +m[1];
    const a = m[5] === undefined ? 1 : m[6] ? +m[5] / 100 : +m[5];
    const teinte = m[4] === 'none' ? 0 : +m[4];
    return { rgb: oklchVersRgb(L, +m[3], teinte), a };
  }
  throw new Error(`Couleur illisible : ${valeur}`);
}

const arrondi2 = (x) => Math.round(x * 100) / 100;
/** Couleur translucide posée sur un fond opaque ; renvoie un hexa. */
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
  return arrondi2((a + 0.05) / (b + 0.05));
};
if (contraste('#000000', '#ffffff') !== 21) throw new Error('Contrôle du contraste : noir sur blanc doit donner 21');

/* ------------------------------------------------------------ lecture de CSS */

/**
 * Premier bloc dont le sélecteur (début de ligne, indentation admise) est
 * exactement `selecteur`. Renvoie le corps, la ligne d'ouverture et les
 * déclarations `propriété: valeur` d'une ligne.
 */
function bloc(id, selecteur, depuis = 0) {
  const t = texte(id);
  let i = depuis;
  for (;;) {
    i = t.indexOf(selecteur, i);
    if (i < 0) throw new Error(`Bloc absent de ${id} : ${selecteur}`);
    const debutLigne = t.lastIndexOf('\n', i - 1) + 1;
    const avant = t.slice(debutLigne, i);
    const apres = t.slice(i + selecteur.length).match(/^\s*\{/);
    if (/^\s*$/.test(avant) && apres) {
      const ouvre = t.indexOf('{', i + selecteur.length);
      let prof = 0;
      let j = ouvre;
      for (; j < t.length; j++) {
        if (t[j] === '{') prof++;
        else if (t[j] === '}' && --prof === 0) break;
      }
      const corps = t.slice(ouvre + 1, j);
      const ligne0 = ligneAu(t, ouvre);
      const decl = new Map();
      corps.split('\n').forEach((l, k) => {
        const m = l.match(/^\s*([a-z-]+|--[\w-]+)\s*:\s*(.+?);?\s*$/i);
        if (m) decl.set(m[1], { valeur: m[2].replace(/;$/, ''), ligne: ligne0 + k, fichier: fichier(id) });
      });
      return { corps, ligne: ligne0, decl, id };
    }
    i += selecteur.length;
  }
}

/**
 * Valeur finale d'une variable, en suivant `var(--x, repli)` dans des couches
 * (la dernière qui définit la variable l'emporte). `sources` liste les lignes
 * suivies.
 */
function resoudre(valeur, couches, chaine = [], sources = []) {
  const m = String(valeur).trim().match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/);
  if (!m) return { litteral: String(valeur).trim(), chaine, sources };
  let trouve;
  for (let k = couches.length - 1; k >= 0 && !trouve; k--) trouve = couches[k].get(m[1]);
  if (!trouve) {
    if (m[2]) return resoudre(m[2], couches, [...chaine, `${m[1]} (repli)`], sources);
    throw new Error(`Variable introuvable : ${m[1]}`);
  }
  return resoudre(trouve.valeur, couches, [...chaine, `${m[1]}: ${trouve.valeur}`], [
    ...sources,
    { fichier: trouve.fichier, ligne: trouve.ligne },
  ]);
}
/** Variable résolue, avec sa chaîne lisible. */
const variable = (nom, couches) => resoudre(`var(${nom})`, couches);
const unique = (liste) => {
  const vus = new Set();
  return liste.filter((s) => {
    const k = `${s.fichier}:${s.ligne}`;
    return vus.has(k) ? false : (vus.add(k), true);
  });
};
const avecAlpha = (litteral, facteur) => {
  const c = lire(litteral);
  return `rgba(${c.rgb.map((x) => Math.round(x)).join(', ')}, ${Math.round(c.a * facteur * 10000) / 10000})`;
};

/* ---------------------------------------------------------------- assemblage */

/** Fond (page ou composant) : hexa opaque, avec la valeur publiée. */
function fond(publie, litteral, source, surPage) {
  const c = lire(litteral);
  const f = { publie, source };
  if (c.a < 1) {
    f.alpha = arrondi2(c.a);
    if (!surPage) throw new Error(`Fond translucide sans fond de page : ${publie}`);
    f.composeSur = surPage.hex;
    f.hex = composer(c, surPage.hex);
    f.transparent = c.a === 0;
  } else f.hex = versHex(c.rgb);
  return f;
}

/** Couche d'indicateur, évaluée contre la page et contre le composant. */
function couche(def, page, composant) {
  const c = lire(def.couleur);
  const sur = def.recouvre === 'composant' ? composant.hex : page.hex;
  const hex = composer(c, sur);
  const e = {
    role: def.role,
    forme: def.forme,
    valeurPubliee: def.publie,
    couleurResolue: def.couleur,
  };
  if (c.a < 1) {
    e.alpha = arrondi2(c.a);
    e.composeSur = sur;
  }
  e.hexCompose = hex;
  e.recouvre = def.recouvre;
  e.epaisseurPx = def.epaisseurPx;
  e.decalagePx = def.decalagePx;
  e.contrasteAvecPage = contraste(hex, page.hex);
  e.contrasteAvecComposant = contraste(hex, composant.hex);
  e.source = def.source;
  return e;
}

/**
 * Un thème d'un composant. `principal` est l'indice de la couche qui sert
 * d'indicateur (la plus extérieure, sinon la plus marquante).
 */
function etat({ page, composant, couches, principal = 0, type, bordure, remarques = [] }) {
  const pageF = page;
  const compF = composant;
  const liste = couches.map((d) => couche(d, pageF, compF));
  const p = liste[principal];
  const r = {
    fondPage: pageF,
    fondComposant: compF,
    geometrie: {
      type,
      epaisseurPx: p.epaisseurPx,
      decalagePx: p.decalagePx,
      position: p.recouvre === 'composant' ? 'intérieur' : 'extérieur',
      colle: p.decalagePx === 0 && p.recouvre === 'page',
      bordureComposant: bordure,
    },
    couches: liste,
    principal,
    contrasteAvecPage: p.contrasteAvecPage,
    contrasteAvecComposant: p.contrasteAvecComposant,
    pale: p.contrasteAvecPage < 3,
    autreCoucheNette: liste.some((c, i) => i !== principal && c.contrasteAvecPage >= 3),
    colleEtPale: p.decalagePx === 0 && p.recouvre === 'page' && p.contrasteAvecPage < 3,
  };
  if (remarques.length) r.remarques = remarques;
  return r;
}

const systemes = [];
function systeme(id, nom, version, composants) {
  systemes.push({ id, nom, version, composants });
}

/* ------------------------------------------------------- 1. Bootstrap 5.3.8 */
{
  const css = 'bootstrapCss';
  const racineLight = bloc(css, '[data-bs-theme=light]');
  const racineDark = bloc(css, '[data-bs-theme=dark]');
  const btn = bloc(css, '.btn');
  const focusVisible = bloc(css, '.btn:focus-visible');
  const primaire = bloc(css, '.btn-primary');
  const contour = bloc(css, '.btn-outline-primary');
  const champ = bloc(css, '.form-control');
  const champFocus = bloc(css, '.form-control:focus');
  const D = (b, nom) => {
    const d = b.decl.get(nom);
    if (!d) throw new Error(`Déclaration absente : ${nom}`);
    return d;
  };
  exiger(css, '--bs-btn-focus-box-shadow: 0 0 0 0.25rem rgba(var(--bs-btn-focus-shadow-rgb), .5);');
  if (D(focusVisible, 'box-shadow').valeur !== 'var(--bs-btn-focus-box-shadow)') throw new Error('Bootstrap : focus-visible a changé');
  const px = (rem) => Math.round(parseFloat(rem) * 16 * 100) / 100;
  const largeurRing = px(D(btn, '--bs-btn-focus-box-shadow').valeur.match(/0 0 0 ([\d.]+rem)/)[1]);

  const themeBootstrap = (racineTheme) => {
    const pageD = D(racineTheme, '--bs-body-bg');
    const page = fond('--bs-body-bg', pageD.valeur, { fichier: pageD.fichier, ligne: pageD.ligne });
    const borderD = D(racineTheme, '--bs-border-color');
    const rgbOmbre = (b) => D(b, '--bs-btn-focus-shadow-rgb');
    const bouton = (b, nom) => {
      const rgb = rgbOmbre(b);
      const hoverBg = D(b, '--bs-btn-hover-bg');
      const hoverBd = D(b, '--bs-btn-hover-border-color');
      const bg = b.decl.get('--bs-btn-bg') ?? D(btn, '--bs-btn-bg');
      const bd0 = b.decl.get('--bs-btn-border-color') ?? D(btn, '--bs-btn-border-color');
      const compo = hoverBg;
      const e = etat({
        page,
        composant: fond(`${nom} --bs-btn-hover-bg (le focus-visible applique le fond du survol)`, compo.valeur, { fichier: compo.fichier, ligne: compo.ligne }, page),
        couches: [
          {
            role: 'halo',
            forme: 'box-shadow étendu, flou nul',
            publie: `0 0 0 0.25rem rgba(${rgb.valeur}, .5)`,
            couleur: `rgba(${rgb.valeur}, 0.5)`,
            recouvre: 'page',
            epaisseurPx: largeurRing,
            decalagePx: 0,
            source: [
              { fichier: btn.decl.get('--bs-btn-focus-box-shadow').fichier, ligne: btn.decl.get('--bs-btn-focus-box-shadow').ligne },
              { fichier: rgb.fichier, ligne: rgb.ligne },
            ],
          },
        ],
        type: 'halo',
        bordure: `1px, de ${bd0.valeur} vers ${hoverBd.valeur} (--bs-btn-hover-border-color)`,
        remarques: [
          `Fond au repos : ${bg.valeur}. Au focus-visible, la règle applique color, background-color et border-color du survol (ligne ${focusVisible.ligne}).`,
        ],
      });
      if (bg.valeur !== 'transparent') {
        const contrasteRepos = contraste(e.couches[0].hexCompose, versHex(lire(bg.valeur).rgb));
        e.remarques.push(`Contraste du halo composé (${e.couches[0].hexCompose}) contre le fond au repos ${bg.valeur} : ${contrasteRepos}.`);
      }
      return e;
    };
    const champEtat = () => {
      const bd = D(champFocus, 'border-color');
      const ombre = D(champFocus, 'box-shadow');
      const m = ombre.valeur.match(/^0 0 0 ([\d.]+rem) (rgba\([^)]+\))$/);
      const bgD = D(champFocus, 'background-color');
      const bgPage = resoudre(bgD.valeur, [racineTheme.decl]);
      return etat({
        page,
        composant: fond(`${bgD.valeur} (${bgPage.chaine.join(' ; ')})`, bgPage.litteral, { fichier: bgD.fichier, ligne: bgD.ligne }),
        couches: [
          {
            role: 'halo',
            forme: 'box-shadow étendu, flou nul',
            publie: ombre.valeur,
            couleur: m[2],
            recouvre: 'page',
            epaisseurPx: px(m[1]),
            decalagePx: 0,
            source: [{ fichier: ombre.fichier, ligne: ombre.ligne }],
          },
          {
            role: 'bordure',
            forme: 'border-color du champ',
            publie: bd.valeur,
            couleur: bd.valeur,
            recouvre: 'composant',
            epaisseurPx: 1,
            decalagePx: 0,
            source: [{ fichier: bd.fichier, ligne: bd.ligne }],
          },
        ],
        principal: 0,
        type: 'halo+bordure',
        bordure: `1px, de --bs-border-color (${borderD.valeur}) vers ${bd.valeur}`,
      });
    };
    return {
      plein: bouton(primaire, '.btn-primary'),
      contour: bouton(contour, '.btn-outline-primary'),
      champ: champEtat(),
    };
  };
  const L = themeBootstrap(racineLight);
  const Dk = themeBootstrap(racineDark);
  exiger(css, /\[data-bs-theme=dark\] \{[^}]*--bs-body-bg: #212529/);
  const dernierFocusDark = /\[data-bs-theme=dark\][^{]*\.(btn|form-control)[^{]*:focus/.test(texte(css));
  if (dernierFocusDark) throw new Error('Bootstrap : une règle sombre de focus est apparue, à relever');
  void champ;
  const rem = { plein: 'bouton plein principal', contour: 'bouton à contour', champ: 'champ de saisie' };
  systeme('bootstrap', 'Bootstrap', '5.3.8', [
    { id: 'plein', composant: rem.plein, variante: 'btn-primary', light: L.plein, dark: Dk.plein },
    { id: 'contour', composant: rem.contour, variante: 'btn-outline-primary', light: L.contour, dark: Dk.contour },
    { id: 'champ', composant: rem.champ, variante: 'form-control', light: L.champ, dark: Dk.champ },
  ]);
}


/* ------------------------------------------------- utilitaires Tailwind */

/** Classes de l'élément qui contient `marqueur`, cherché après `ancre`. */
function classesDe(id, ancre, marqueur) {
  const t = texte(id);
  const a = t.indexOf(ancre);
  if (a < 0) throw new Error(`Ancre absente de ${id} : ${ancre}`);
  const m = t.indexOf(marqueur, a);
  if (m < 0) throw new Error(`Marqueur absent de ${id} : ${marqueur}`);
  const debut = t.lastIndexOf('\n', m) + 1;
  const fin = t.indexOf('\n', m);
  const ligne = t.slice(debut, fin < 0 ? undefined : fin);
  const c = ligne.match(/class="([^"]+)"/);
  if (!c) throw new Error(`Pas de class= dans ${id} : ${ligne.slice(0, 80)}`);
  return { classes: c[1].split(/\s+/), ligne: ligneAu(t, m), source: { fichier: fichier(id), ligne: ligneAu(t, m) } };
}

/* -------------------------------------------------------- 2. Flowbite 4.0.2 */
{
  const tw = bloc('tailwindTheme', '@theme default').decl;
  const base = bloc('flowbiteTheme', '@theme').decl;
  const sombre = bloc('flowbiteTheme', '.dark').decl;
  const couches = { light: [tw, base], dark: [tw, base, sombre] };
  const jeton = (nom, th) => variable(`--color-${nom}`, couches[th]);

  const bouton = (cl, th) => {
    const classes = cl.classes;
    const degrade = classes.some((c) => c.startsWith('bg-gradient'));
    const bagueClaire = classes.find((c) => /^focus:ring-(?!\d)[a-z0-9-]+$/.test(c));
    const bagueSombre = classes.find((c) => /^dark:focus:ring-(?!\d)[a-z0-9-]+$/.test(c));
    const bague = th === 'dark' && bagueSombre ? bagueSombre : bagueClaire;
    const largeur = classes.find((c) => /^focus:ring-\d+$/.test(c));
    const fill = degrade ? classes.find((c) => /^via-/.test(c)) : classes.find((c) => /^bg-[a-z-]+$/.test(c));
    if (!bague || !largeur || !fill) throw new Error('Flowbite : classes de focus absentes');
    const nomBague = bague.replace(/^(dark:)?focus:ring-/, '');
    const nomFill = fill.replace(/^(bg|via)-/, '');
    const rb = jeton(nomBague, th);
    const rf = jeton(nomFill, th);
    const rp = jeton('neutral-primary', th);
    const page = fond('--color-neutral-primary', rp.litteral, unique(rp.sources)[0]);
    const comp = fond(`--color-${nomFill} (${rf.chaine.join(' ; ')})`, rf.litteral, unique(rf.sources)[0], page);
    const remarques = [];
    if (classes.includes('focus:outline-none')) remarques.push('focus:outline-none retire le contour natif.');
    if (degrade) remarques.push('Fond en dégradé de blue-500 à blue-700 : le fond du composant est pris à la couleur du milieu (via-blue-600).');
    if (bagueSombre) remarques.push(`Variante sombre explicite dans les classes : ${bagueSombre}.`);
    return etat({
      page,
      composant: comp,
      couches: [
        {
          role: 'halo',
          forme: 'ring Tailwind (box-shadow étendu, sans décalage)',
          publie: `${largeur} ${bague} (${rb.chaine.join(' ; ')})`,
          couleur: rb.litteral,
          recouvre: 'page',
          epaisseurPx: parseInt(largeur.split('-').pop(), 10),
          decalagePx: 0,
          source: [cl.source, ...unique(rb.sources)],
        },
      ],
      type: 'halo',
      bordure: `inchangée (${classes.filter((c) => /^border/.test(c)).join(' ') || 'aucune classe border'})`,
      remarques,
    });
  };
  const defaut = classesDe('flowbiteButtons', '## Default button', '>Default</button>');
  const secondaire = classesDe('flowbiteButtons', '## Default button', '>Secondary</button>');
  const contour = classesDe('flowbiteButtons', '## Outline buttons', '>Brand</button>');
  const degrade = classesDe('flowbiteButtons', '## Gradient monochrome', '>Blue</button>');
  const mk = (cl) => ({ light: bouton(cl, 'light'), dark: bouton(cl, 'dark') });

  // Champ : classes de la documentation et base du plugin (anneau de 1px au focus)
  const champ = classesDe('flowbiteForms', 'Base Input', '<input type="text"');
  exiger('flowbitePlugin', "'--tw-ring-color': 'var(--color-brand)'");
  exiger('flowbitePlugin', 'calc(1px + var(--tw-ring-offset-width))');
  exiger('flowbitePlugin', "'border-color': 'var(--color-brand)'");
  const lPlugin = src('flowbitePlugin', 'calc(1px + var(--tw-ring-offset-width))');
  const lBordure = src('flowbitePlugin', "'border-color': 'var(--color-brand)'");
  if (!champ.classes.includes('focus:ring-brand') || !champ.classes.includes('focus:border-brand')) {
    throw new Error('Flowbite : classes de focus du champ changées');
  }
  const nomBordure = champ.classes.find((c) => /^border-(?!\d)[a-z-]+$/.test(c)).slice(7);
  const champEtat = (th) => {
    const rb = jeton('brand', th);
    const rp = jeton('neutral-primary', th);
    const nomFill = champ.classes.find((c) => /^bg-/.test(c)).slice(3);
    const rf = jeton(nomFill, th);
    const rbd = jeton(nomBordure, th);
    const page = fond('--color-neutral-primary', rp.litteral, unique(rp.sources)[0]);
    return etat({
      page,
      composant: fond(`--color-${nomFill} (${rf.chaine.join(' ; ')})`, rf.litteral, unique(rf.sources)[0], page),
      couches: [
        {
          role: 'halo',
          forme: 'anneau de 1px du plugin Flowbite (box-shadow), couleur focus:ring-brand',
          publie: `focus:ring-brand (${rb.chaine.join(' ; ')}) ; anneau de 1px du plugin`,
          couleur: rb.litteral,
          recouvre: 'page',
          epaisseurPx: 1,
          decalagePx: 0,
          source: [champ.source, lPlugin, ...unique(rb.sources)],
        },
        {
          role: 'bordure',
          forme: 'border-color du champ (focus:border-brand)',
          publie: `focus:border-brand (${rb.chaine.join(' ; ')})`,
          couleur: rb.litteral,
          recouvre: 'composant',
          epaisseurPx: 1,
          decalagePx: 0,
          source: [champ.source, lBordure],
        },
      ],
      type: 'halo+bordure',
      bordure: `1px, de --color-${nomBordure} (${rbd.litteral}) vers --color-brand`,
    });
  };
  systeme('flowbite', 'Flowbite', '4.0.2', [
    { id: 'plein', composant: 'bouton plein principal', variante: 'Default (bg-brand)', ...mk(defaut) },
    { id: 'secondaire', composant: 'bouton secondaire', variante: 'Secondary (bg-neutral-secondary-medium)', ...mk(secondaire) },
    { id: 'contour', composant: 'bouton à contour', variante: 'Outline Brand', ...mk(contour) },
    { id: 'plein-degrade', composant: 'bouton plein principal', variante: 'Gradient monochrome Blue (classes focus:ring-blue-300 dark:focus:ring-blue-800)', ...mk(degrade) },
    { id: 'champ', composant: 'champ de saisie', variante: 'Base Input', light: champEtat('light'), dark: champEtat('dark') },
  ]);
}

/* ---------------------------------------- 3. shadcn/ui, registre new-york v4 */
{
  const racineTheme = bloc('shadcnGlobals', ':root').decl;
  const sombre = bloc('shadcnGlobals', '.dark').decl;
  const couches = { light: [racineTheme], dark: [racineTheme, sombre] };
  const jeton = (nom, th) => variable(`--${nom}`, couches[th]);
  const bt = texte('shadcnButton');
  const it = texte('shadcnInput');
  const focusBouton = 'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';
  if (!bt.includes(focusBouton)) throw new Error('shadcn : focus du bouton changé');
  if (!it.includes(focusBouton)) throw new Error('shadcn : focus du champ changé');
  exiger('shadcnButton', 'default: "bg-primary text-primary-foreground hover:bg-primary/90"');
  exiger('shadcnButton', 'dark:border-input dark:bg-input/30');
  exiger('shadcnInput', 'border-input bg-transparent');
  exiger('shadcnInput', 'dark:bg-input/30');
  const sFocus = src('shadcnButton', focusBouton);
  const sFocusIn = src('shadcnInput', 'focus-visible:border-ring');
  const sPrimary = src('shadcnButton', 'default: "bg-primary');
  const sOutline = src('shadcnButton', 'dark:border-input dark:bg-input/30');
  const sInputFill = src('shadcnInput', 'border-input bg-transparent');

  const halo = (th, srcFocus) => {
    const r = jeton('ring', th);
    return {
      role: 'halo',
      forme: 'ring Tailwind de 3px (focus-visible:ring-[3px]), couleur ring/50',
      publie: `focus-visible:ring-ring/50 (--ring: ${r.litteral})`,
      couleur: avecAlpha(r.litteral, 0.5),
      recouvre: 'page',
      epaisseurPx: 3,
      decalagePx: 0,
      source: [srcFocus, ...unique(r.sources)],
    };
  };
  const bordureRing = (th, srcFocus) => {
    const r = jeton('ring', th);
    return {
      role: 'bordure',
      forme: 'border-color du composant (focus-visible:border-ring)',
      publie: `focus-visible:border-ring (--ring: ${r.litteral})`,
      couleur: r.litteral,
      recouvre: 'composant',
      epaisseurPx: 1,
      decalagePx: 0,
      source: [srcFocus, ...unique(r.sources)],
    };
  };
  const pageDe = (th) => {
    const r = jeton('background', th);
    return fond(`--background (${r.litteral})`, r.litteral, unique(r.sources)[0]);
  };
  const plein = (th) => {
    const page = pageDe(th);
    const r = jeton('primary', th);
    return etat({
      page,
      composant: fond(`bg-primary --primary (${r.litteral})`, r.litteral, unique(r.sources)[0], page),
      couches: [halo(th, sFocus)],
      type: 'halo',
      bordure: 'aucune bordure sur la variante default (border-ring sans effet visible)',
      remarques: [`Classes de la variante : ${sPrimary.fichier} ligne ${sPrimary.ligne}.`],
    });
  };
  const contour = (th) => {
    const page = pageDe(th);
    const clair = th === 'light';
    const r = clair ? jeton('background', th) : jeton('input', th);
    const litteral = clair ? r.litteral : avecAlpha(r.litteral, 0.3);
    return etat({
      page,
      composant: fond(clair ? `bg-background (${r.litteral})` : `dark:bg-input/30 (${r.litteral} à 30 %)`, litteral, unique(r.sources)[0], page),
      couches: [halo(th, sFocus), bordureRing(th, sFocus)],
      type: 'halo+bordure',
      bordure: `1px, de ${clair ? '--border' : '--input (dark:border-input)'} vers --ring`,
      remarques: [`Classes de la variante outline : ${sOutline.fichier} ligne ${sOutline.ligne}.`],
    });
  };
  const champ = (th) => {
    const page = pageDe(th);
    const clair = th === 'light';
    const r = jeton('input', th);
    return etat({
      page,
      composant: clair
        ? fond('bg-transparent', 'transparent', sInputFill, page)
        : fond(`dark:bg-input/30 (${r.litteral} à 30 %)`, avecAlpha(r.litteral, 0.3), unique(r.sources)[0], page),
      couches: [halo(th, sFocusIn), bordureRing(th, sFocusIn)],
      type: 'halo+bordure',
      bordure: '1px, de --input vers --ring',
    });
  };
  systeme('shadcn', 'shadcn/ui (new-york v4)', 'révision 30a58d4', [
    { id: 'plein', composant: 'bouton plein principal', variante: 'default', light: plein('light'), dark: plein('dark') },
    { id: 'contour', composant: 'bouton à contour', variante: 'outline', light: contour('light'), dark: contour('dark') },
    { id: 'champ', composant: 'champ de saisie', variante: 'Input', light: champ('light'), dark: champ('dark') },
  ]);
}

/* ------------------------------------------------------- 8. Untitled UI React */
{
  const tw = bloc('tailwindTheme', '@theme default').decl;
  const base = bloc('untitledTheme', '@theme').decl;
  const sombre = bloc('untitledTheme', '.dark-mode').decl;
  const couches = { light: [tw, base], dark: [tw, base, sombre] };
  const motifBouton = 'outline-brand transition duration-100 ease-linear before:absolute focus-visible:outline-2 focus-visible:outline-offset-2';
  exiger('untitledButton', motifBouton);
  const sBouton = src('untitledButton', motifBouton);
  exiger('untitledButton', 'bg-brand-solid text-white');
  exiger('untitledButton', 'bg-primary text-secondary shadow-xs-skeuomorphic ring-1 ring-primary ring-inset');
  const sPlein = src('untitledButton', 'bg-brand-solid text-white');
  const sSecond = src('untitledButton', 'bg-primary text-secondary shadow-xs-skeuomorphic');
  exiger('untitledInput', 'isFocusWithin && !isDisabled && "ring-2 ring-brand"');
  exiger('untitledInput', 'bg-primary shadow-xs ring-1 ring-primary');
  const sChamp = src('untitledInput', 'isFocusWithin && !isDisabled && "ring-2 ring-brand"');
  const sChampBase = src('untitledInput', 'bg-primary shadow-xs ring-1 ring-primary');
  const v = (nom, th) => variable(nom, couches[th]);
  const pageDe = (th) => {
    const r = v('--background-color-primary', th);
    return fond(`bg-primary --background-color-primary (${r.chaine.join(' ; ')})`, r.litteral, unique(r.sources)[0]);
  };
  const bouton = (th, fillVar, sFill, nomFill) => {
    const page = pageDe(th);
    const o = v('--outline-color-brand', th);
    const f = v(fillVar, th);
    return etat({
      page,
      composant: fond(`${nomFill} ${fillVar} (${f.chaine.join(' ; ')})`, f.litteral, unique(f.sources)[0], page),
      couches: [
        {
          role: 'trait',
          forme: 'outline (focus-visible:outline-2, outline-offset-2), détaché de 2px',
          publie: `outline-brand (${o.chaine.join(' ; ')})`,
          couleur: o.litteral,
          recouvre: 'page',
          epaisseurPx: 2,
          decalagePx: 2,
          source: [sBouton, ...unique(o.sources)],
        },
      ],
      type: 'trait détaché',
      bordure: 'inchangée (ring-1 ring-inset au repos)',
      remarques: [`Classes de la variante : ${sFill.fichier} ligne ${sFill.ligne}.`],
    });
  };
  const champ = (th) => {
    const page = pageDe(th);
    const r = v('--ring-color-brand', th);
    return etat({
      page,
      composant: fond(`bg-primary (${page.hex})`, page.hex, sChampBase, page),
      couches: [
        {
          role: 'trait',
          forme: 'anneau intérieur de 2px (ring-2 ring-inset sur le conteneur au focus-within)',
          publie: `ring-brand (${r.chaine.join(' ; ')})`,
          couleur: r.litteral,
          recouvre: 'composant',
          epaisseurPx: 2,
          decalagePx: 0,
          source: [sChamp, ...unique(r.sources)],
        },
      ],
      type: 'trait intérieur',
      bordure: 'anneau de 1px ring-primary remplacé par un anneau de 2px ring-brand',
    });
  };
  systeme('untitled-ui-react', 'Untitled UI React', 'révision 1d410cb', [
    { id: 'plein', composant: 'bouton plein principal', variante: 'primary', light: bouton('light', '--background-color-brand-solid', sPlein, 'bg-brand-solid'), dark: bouton('dark', '--background-color-brand-solid', sPlein, 'bg-brand-solid') },
    { id: 'secondaire', composant: 'bouton secondaire', variante: 'secondary', light: bouton('light', '--background-color-primary', sSecond, 'bg-primary'), dark: bouton('dark', '--background-color-primary', sSecond, 'bg-primary') },
    { id: 'champ', composant: 'champ de saisie', variante: 'Input', light: champ('light'), dark: champ('dark') },
  ]);
}

/* ------------------------------------------------------ 4. Chakra UI 3.37.0 */
{
  const sem = texte('chakraSemanticColors');
  const col = texte('chakraColors');
  /** Corps de l'objet ouvert par `motif` (accolade comprise dans le motif). */
  const objet = (t, motif) => {
    const m = motif.exec(t);
    if (!m) throw new Error(`Chakra : objet absent ${motif}`);
    const ouvre = m.index + m[0].length - 1;
    let prof = 0;
    let j = ouvre;
    for (; j < t.length; j++) {
      if (t[j] === '{') prof++;
      else if (t[j] === '}' && --prof === 0) break;
    }
    return { corps: t.slice(ouvre + 1, j), debut: ouvre + 1 };
  };
  const semantique = (palette, cle) => {
    const o = objet(sem, new RegExp(`\\n  ${palette}: \\{`));
    const c = objet(o.corps, new RegExp(`\\n\\s*${cle}: \\{`));
    const mm = c.corps.match(/_light:\s*"([^"]+)",\s*_dark:\s*"([^"]+)"/);
    if (!mm) throw new Error(`Chakra : ${palette}.${cle} sans _light/_dark`);
    const index = o.debut + o.corps.indexOf(mm[0]);
    return { light: mm[1], dark: mm[2], source: { fichier: fichier('chakraSemanticColors'), ligne: ligneAu(sem, index) } };
  };
  const jetonChakra = (ref) => {
    const m = ref.match(/^\{colors\.(\w+)(?:\.(\d+))?\}$/);
    if (!m) return { litteral: ref, source: null };
    let v;
    let index;
    if (m[2]) {
      const o = objet(col, new RegExp(`\\n  ${m[1]}: \\{`));
      const mv = o.corps.match(new RegExp(`\\b${m[2]}: \\{ value: "([^"]+)" \\}`));
      if (!mv) throw new Error(`Chakra : ${ref} absent`);
      v = mv[1];
      index = o.debut + o.corps.indexOf(mv[0]);
    } else {
      const mv = col.match(new RegExp(`\\n  ${m[1]}: \\{ value: "([^"]+)" \\}`));
      if (!mv) throw new Error(`Chakra : ${ref} absent`);
      v = mv[1];
      index = mv.index;
    }
    return { litteral: v, source: { fichier: fichier('chakraColors'), ligne: ligneAu(col, index) } };
  };
  const resolu = (palette, cle, th) => {
    const s = semantique(palette, cle);
    const j = jetonChakra(s[th]);
    return { reference: s[th], litteral: j.litteral, sources: [s.source, j.source].filter(Boolean) };
  };

  exiger('chakraGlobalCss', 'colorPalette: "gray"');
  exiger('chakraButton', 'focusVisibleRing: "outside"');
  exiger('chakraButton', 'bg: "colorPalette.solid"');
  exiger('chakraInput', 'focusVisibleRing: "inside"');
  exiger('chakraInput', '"--focus-color": "colors.colorPalette.focusRing"');
  const presetBase = texte('chakraPresetBase');
  const dehors = presetBase.match(/outside: \{[^}]*outlineWidth: "var\(--focus-ring-width, ([\d.]+)px\)",\s*outlineOffset: "var\(--focus-ring-offset, ([\d.]+)px\)"/);
  const dedans = presetBase.match(/inside: \{[^}]*outlineOffset: "([\d.]+)px",\s*outlineWidth: "var\(--focus-ring-width, ([\d.]+)px\)"[^}]*borderColor: "var\(--focus-ring-color\)"/);
  if (!dehors || !dedans) throw new Error('Chakra : géométrie de createFocusRing changée');
  const largeurHors = +dehors[1];
  const decalageHors = +dehors[2];
  const decalageDans = +dedans[1];
  const largeurDans = +dedans[2];
  const sHors = src('chakraPresetBase', 'outside: {');
  const sDans = src('chakraPresetBase', 'inside: {');
  const sBouton = src('chakraButton', 'focusVisibleRing: "outside"');
  const sInput = src('chakraInput', 'focusVisibleRing: "inside"');

  const pageDe = (th) => {
    const s = semantique('bg', 'DEFAULT');
    const j = jetonChakra(s[th]);
    return fond(`bg.DEFAULT (${s[th]} = ${j.litteral})`, j.litteral, s.source);
  };
  const bague = (palette, th) => resolu(palette, 'focusRing', th);
  const bouton = (palette, th, variante) => {
    const page = pageDe(th);
    const r = bague(palette, th);
    let composant;
    if (variante === 'solid') {
      const f = resolu(palette, 'solid', th);
      composant = fond(`colorPalette.solid, palette ${palette} (${f.reference} = ${f.litteral})`, f.litteral, f.sources[0], page);
    } else {
      composant = fond('bg transparent (variante outline)', 'transparent', sBouton, page);
    }
    return etat({
      page,
      composant,
      couches: [
        {
          role: 'trait',
          forme: 'outline (focusVisibleRing outside), détaché',
          publie: `colorPalette.focusRing, palette ${palette} (${r.reference} = ${r.litteral})`,
          couleur: r.litteral,
          recouvre: 'page',
          epaisseurPx: largeurHors,
          decalagePx: decalageHors,
          source: [sBouton, sHors, ...r.sources],
        },
      ],
      type: 'trait détaché',
      bordure: 'inchangée (1px transparent, ou colorPalette.border en variante outline)',
    });
  };
  const champ = (palette, th) => {
    const page = pageDe(th);
    const r = bague(palette, th);
    return etat({
      page,
      composant: fond('bg transparent (variante outline)', 'transparent', sInput, page),
      couches: [
        {
          role: 'trait',
          forme: 'outline (focusVisibleRing inside) : largeur 1px, décalage 0, donc contre le bord extérieur de la bordure',
          publie: `colorPalette.focusRing, palette ${palette} (${r.reference} = ${r.litteral})`,
          couleur: r.litteral,
          recouvre: 'page',
          epaisseurPx: largeurDans,
          decalagePx: decalageDans,
          source: [sInput, sDans, ...r.sources],
        },
        {
          role: 'bordure',
          forme: 'border-color du champ, identique à la couleur de l\'anneau',
          publie: `borderColor: var(--focus-ring-color) (${r.reference} = ${r.litteral})`,
          couleur: r.litteral,
          recouvre: 'composant',
          epaisseurPx: 1,
          decalagePx: 0,
          source: [sDans, ...r.sources],
        },
      ],
      type: 'trait collé+bordure',
      bordure: `1px, de colors.border (${resolu('border', 'DEFAULT', th).litteral}) vers la couleur de l'anneau`,
    });
  };
  systeme('chakra', 'Chakra UI', '3.37.0', [
    { id: 'plein', composant: 'bouton plein principal', variante: 'solid, colorPalette gray (défaut du thème)', light: bouton('gray', 'light', 'solid'), dark: bouton('gray', 'dark', 'solid') },
    { id: 'plein-blue', composant: 'bouton plein principal', variante: 'solid, colorPalette blue', light: bouton('blue', 'light', 'solid'), dark: bouton('blue', 'dark', 'solid') },
    { id: 'contour', composant: 'bouton à contour', variante: 'outline, colorPalette gray', light: bouton('gray', 'light', 'outline'), dark: bouton('gray', 'dark', 'outline') },
    { id: 'champ', composant: 'champ de saisie', variante: 'outline, colorPalette gray', light: champ('gray', 'light'), dark: champ('gray', 'dark') },
    { id: 'champ-blue', composant: 'champ de saisie', variante: 'outline, colorPalette blue', light: champ('blue', 'light'), dark: champ('blue', 'dark') },
  ]);
}

/* ------------------------------------------------------- 5. Mantine 7.17.8 */
{
  const racineM = bloc('mantineStyles', ':root').decl;
  const schemas = { light: bloc('mantineStyles', ":root[data-mantine-color-scheme='light']").decl, dark: bloc('mantineStyles', ":root[data-mantine-color-scheme='dark']").decl };
  const couches = (th) => [racineM, schemas[th]];
  const focusAuto = bloc('mantineStyles', '.mantine-focus-auto:focus-visible');
  const outlineD = focusAuto.decl.get('outline');
  const offsetD = focusAuto.decl.get('outline-offset');
  if (!outlineD || outlineD.valeur !== '2px solid var(--mantine-primary-color-filled)') throw new Error('Mantine : outline du focus changé');
  if (!offsetD || offsetD.valeur !== 'calc(0.125rem * var(--mantine-scale))') throw new Error('Mantine : décalage du focus changé');
  exiger('mantineUnstyledButton', 'getStyles("root", { focusable: true })');
  exiger('mantineGlobalClassNames', 'auto: "mantine-focus-auto"');
  exiger('mantineDefaultTheme', 'focusRing: "auto"');
  exiger('mantineDefaultTheme', 'primaryShade: { light: 6, dark: 8 }');
  exiger('mantineVariantResolver', 'background: "var(--mantine-color-default)"');
  exiger('mantineStyles', /\.m_77c9d27d \{[^}]*background: var\(--button-bg, var\(--mantine-primary-color-filled\)\)/);
  exiger('mantineStyles', /\.m_8fb7ebe7:focus,\s*\.m_8fb7ebe7:focus-within \{\s*outline: none;\s*--input-bd: var\(--input-bd-focus\);/);
  const sFocus = { fichier: fichier('mantineStyles'), ligne: focusAuto.ligne };
  const sBtnFill = src('mantineStyles', /\.m_77c9d27d \{[^}]*background: var\(--button-bg/);
  const sBtnFillLigne = { fichier: fichier('mantineStyles'), ligne: ligneDe('mantineStyles', 'background: var(--button-bg, var(--mantine-primary-color-filled))') };
  void sBtnFill;
  const sInputFocus = src('mantineStyles', '--input-bd: var(--input-bd-focus);');
  const sInputBorder = src('mantineStyles', 'border: calc(0.0625rem * var(--mantine-scale)) solid var(--input-bd);');
  const pageDe = (th) => {
    const r = variable('--mantine-color-body', couches(th));
    return fond(`--mantine-color-body (${r.chaine.join(' ; ')})`, r.litteral, unique(r.sources)[0]);
  };
  const bouton = (th, defaut) => {
    const page = pageDe(th);
    const o = variable('--mantine-primary-color-filled', couches(th));
    const f = defaut ? variable('--mantine-color-default', couches(th)) : o;
    return etat({
      page,
      composant: fond(defaut ? `--mantine-color-default (${f.chaine.join(' ; ')})` : `--mantine-primary-color-filled (${f.chaine.join(' ; ')})`, f.litteral, defaut ? unique(f.sources)[0] : sBtnFillLigne, page),
      couches: [
        {
          role: 'trait',
          forme: 'outline de 2px, décalage 0,125rem (classe mantine-focus-auto)',
          publie: `outline: 2px solid var(--mantine-primary-color-filled) (${o.chaine.join(' ; ')})`,
          couleur: o.litteral,
          recouvre: 'page',
          epaisseurPx: 2,
          decalagePx: 2,
          source: [sFocus, ...unique(o.sources)],
        },
      ],
      type: 'trait détaché',
      bordure: 'inchangée',
      remarques: defaut
        ? ['Variante default : fond --mantine-color-default lu dans default-variant-colors-resolver.mjs.']
        : ['La couleur de l\'anneau est celle du fond du bouton plein.'],
    });
  };
  const champ = (th) => {
    const page = pageDe(th);
    const bloc1 = bloc('mantineStyles', `[data-mantine-color-scheme='${th}'] .m_6c018570[data-variant='default']`);
    const bd = bloc1.decl.get('--input-bd-focus');
    const bg = bloc1.decl.get('--input-bg');
    const bd0 = bloc1.decl.get('--input-bd');
    const o = resoudre(bd.valeur, couches(th));
    const f = resoudre(bg.valeur, couches(th));
    const r0 = resoudre(bd0.valeur, couches(th));
    return etat({
      page,
      composant: fond(`--input-bg (${bg.valeur} = ${f.litteral})`, f.litteral, { fichier: bg.fichier, ligne: bg.ligne }, page),
      couches: [
        {
          role: 'bordure',
          forme: 'bordure de 1px dont la couleur passe de --input-bd à --input-bd-focus ; outline: none',
          publie: `--input-bd-focus: ${bd.valeur} (${o.chaine.join(' ; ')})`,
          couleur: o.litteral,
          recouvre: 'composant',
          epaisseurPx: 1,
          decalagePx: 0,
          source: [{ fichier: bd.fichier, ligne: bd.ligne }, sInputFocus, sInputBorder, ...unique(o.sources)],
        },
      ],
      type: 'bordure seule',
      bordure: `1px, de ${bd0.valeur} (${r0.litteral}) vers ${bd.valeur} (${o.litteral})`,
    });
  };
  systeme('mantine', 'Mantine', '7.17.8', [
    { id: 'plein', composant: 'bouton plein principal', variante: 'filled (défaut)', light: bouton('light', false), dark: bouton('dark', false) },
    { id: 'secondaire', composant: 'bouton secondaire', variante: 'default', light: bouton('light', true), dark: bouton('dark', true) },
    { id: 'champ', composant: 'champ de saisie', variante: 'TextInput default', light: champ('light'), dark: champ('dark') },
  ]);
}

/* ------------------------------------------------------ 6. Ant Design 5.29.3 */
{
  /* Port de @ant-design/fast-color 2.0.6 (conversions RGB, teinte-saturation-valeur, HSL, mélange) */
  const arr = Math.round;
  const depuisHex = (h) => {
    const n = h.replace('#', '');
    return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16) };
  };
  const hsvDe = ({ r, g, b }) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    if (delta !== 0) h = arr(60 * (r === max ? (g - b) / delta + (g < b ? 6 : 0) : g === max ? (b - r) / delta + 2 : (r - g) / delta + 4));
    return { h, s: delta === 0 ? 0 : delta / max, v: max / 255 };
  };
  const rgbDeHsv = ({ h, s, v }) => {
    const vv = arr(v * 255);
    let r = vv;
    let g = vv;
    let b = vv;
    if (s <= 0) return { r, g, b };
    const hh = (h % 360) / 60;
    const i = Math.floor(hh);
    const ff = hh - i;
    const p = arr(v * (1 - s) * 255);
    const q = arr(v * (1 - s * ff) * 255);
    const t = arr(v * (1 - s * (1 - ff)) * 255);
    switch (i) {
      case 0: g = t; b = p; break;
      case 1: r = q; b = p; break;
      case 2: r = p; b = t; break;
      case 3: r = p; g = q; break;
      case 4: r = t; g = p; break;
      default: g = p; b = q; break;
    }
    return { r, g, b };
  };
  const rgbDeHsl = ({ h, s, l }) => {
    if (s <= 0) {
      const v = arr(l * 255);
      return { r: v, g: v, b: v };
    }
    const hp = h / 60;
    const chroma = (1 - Math.abs(2 * l - 1)) * s;
    const second = chroma * (1 - Math.abs((hp % 2) - 1));
    let r = 0;
    let g = 0;
    let b = 0;
    if (hp >= 0 && hp < 1) { r = chroma; g = second; }
    else if (hp < 2) { r = second; g = chroma; }
    else if (hp < 3) { g = chroma; b = second; }
    else if (hp < 4) { g = second; b = chroma; }
    else if (hp < 5) { r = second; b = chroma; }
    else { r = chroma; b = second; }
    const m = l - chroma / 2;
    return { r: arr((r + m) * 255), g: arr((g + m) * 255), b: arr((b + m) * 255) };
  };
  const hexDeRgb = ({ r, g, b }) => versHex([r, g, b]);
  const lightnessDe = ({ r, g, b }) => (Math.max(r, g, b) + Math.min(r, g, b)) / 510;
  const hslDe = (c) => {
    const hsv = hsvDe(c);
    return { h: hsv.h, s: hsv.s, l: lightnessDe(c) };
  };
  const eclaircir = (hex, quantite) => {
    const c = depuisHex(hex);
    const hsl = hslDe(c);
    return hexDeRgb(rgbDeHsl({ ...hsl, l: Math.min(1, hsl.l + quantite / 100) }));
  };
  const melanger = (hexBase, c2, quantite) => {
    const a = depuisHex(hexBase);
    const p = quantite / 100;
    const f = (k) => arr((c2[k] - a[k]) * p + a[k]);
    return { r: f('r'), g: f('g'), b: f('b') };
  };

  /* Port de @ant-design/colors 7.2.1 : generate(), lu dans sources/ */
  const gen = texte('antColorsGenerate');
  const const1 = (nom) => {
    const m = gen.match(new RegExp(`var ${nom} = ([\\d.]+);`));
    if (!m) throw new Error(`@ant-design/colors : constante absente ${nom}`);
    return +m[1];
  };
  const hueStep = const1('hueStep');
  const saturationStep = const1('saturationStep');
  const saturationStep2 = const1('saturationStep2');
  const brightnessStep1 = const1('brightnessStep1');
  const brightnessStep2 = const1('brightnessStep2');
  const lightColorCount = const1('lightColorCount');
  const darkColorCount = const1('darkColorCount');
  const darkMap = [...gen.matchAll(/index: (\d+),\s*amount: (\d+)/g)].map((m) => ({ index: +m[1], amount: +m[2] }));
  if (darkMap.length !== 10) throw new Error('@ant-design/colors : darkColorMap changée');
  const getHue = (hsv, i, light) => {
    let hue;
    if (arr(hsv.h) >= 60 && arr(hsv.h) <= 240) hue = light ? arr(hsv.h) - hueStep * i : arr(hsv.h) + hueStep * i;
    else hue = light ? arr(hsv.h) + hueStep * i : arr(hsv.h) - hueStep * i;
    if (hue < 0) hue += 360;
    else if (hue >= 360) hue -= 360;
    return hue;
  };
  const getSaturation = (hsv, i, light) => {
    if (hsv.h === 0 && hsv.s === 0) return hsv.s;
    let s;
    if (light) s = hsv.s - saturationStep * i;
    else if (i === darkColorCount) s = hsv.s + saturationStep;
    else s = hsv.s + saturationStep2 * i;
    if (s > 1) s = 1;
    if (light && i === lightColorCount && s > 0.1) s = 0.1;
    if (s < 0.06) s = 0.06;
    return Math.round(s * 100) / 100;
  };
  const getValue = (hsv, i, light) => {
    let v = light ? hsv.v + brightnessStep1 * i : hsv.v - brightnessStep2 * i;
    v = Math.max(0, Math.min(1, v));
    return Math.round(v * 100) / 100;
  };
  const generer = (hex, sombre) => {
    const hsv = hsvDe(depuisHex(hex));
    const motifs = [];
    for (let i = lightColorCount; i > 0; i -= 1) motifs.push(rgbDeHsv({ h: getHue(hsv, i, true), s: getSaturation(hsv, i, true), v: getValue(hsv, i, true) }));
    motifs.push(depuisHex(hex));
    for (let i = 1; i <= darkColorCount; i += 1) motifs.push(rgbDeHsv({ h: getHue(hsv, i), s: getSaturation(hsv, i), v: getValue(hsv, i) }));
    if (sombre) return darkMap.map(({ index, amount }) => hexDeRgb(melanger('#141414', motifs[index], amount)));
    return motifs.map(hexDeRgb);
  };

  /* Contrôle du port : la palette claire de #1677ff doit égaler la liste publiée dans presets.js */
  const presets = texte('antColorsPresets');
  const bleuPublie = presets.match(/(?:var|const|export var) blue = \[([^\]]+)\]/);
  if (!bleuPublie) throw new Error('@ant-design/colors : liste blue absente de presets.js');
  const listeBleue = bleuPublie[1].split(',').map((x) => x.replace(/['"\s]/g, '').toLowerCase());

  const seed = texte('antdSeed');
  const primaireSeed = seed.match(/colorPrimary: '(#[0-9a-fA-F]{6})'/);
  if (!primaireSeed) throw new Error('Ant Design : colorPrimary absent de seed.js');
  const lineWidth = +seed.match(/lineWidth: (\d+)/)[1];
  const claire = generer(primaireSeed[1].toLowerCase(), false);
  if (JSON.stringify(claire) !== JSON.stringify(listeBleue)) throw new Error(`Port de generate() faux : ${claire} contre ${listeBleue}`);
  const sombre = generer(primaireSeed[1].toLowerCase(), true);

  /* Règles lues dans le code d'Ant Design */
  exiger('antdAlias', 'lineWidthFocus: mergedToken.lineWidth * 3');
  exiger('antdAlias', 'controlOutlineWidth: mergedToken.lineWidth * 2');
  exiger('antdAlias', 'controlOutline: getAlphaColor(mergedToken.colorPrimaryBg, mergedToken.colorBgContainer)');
  exiger('antdStyle', 'outline: `${unit(token.lineWidthFocus)} solid ${token.colorPrimaryBorder}`');
  exiger('antdStyle', 'outlineOffset: offset !== null && offset !== void 0 ? offset : 1');
  exiger('antdStyle', "'&:focus-visible': genFocusOutline(token, offset)");
  exiger('antdButtonStyle', "'&:not(:disabled)': genFocusStyle(token)");
  exiger('antdInputToken', 'activeShadow: `0 0 0 ${controlOutlineWidth}px ${controlOutline}`');
  exiger('antdInputToken', 'activeBorderColor: colorPrimary');
  exiger('antdInputVariants', /'&:focus, &:focus-within': \{\s*borderColor: options\.activeBorderColor,\s*boxShadow: options\.activeShadow,\s*outline: 0,/);
  exiger('antdGenColorMap', 'colorPrimaryBorder: primaryColors[3]');
  exiger('antdGenColorMap', 'colorPrimary: primaryColors[6]');
  exiger('antdGenColorMap', 'colorPrimaryBg: primaryColors[1]');
  exiger('antdLightColors', '3: colors[2]');
  exiger('antdLightColors', '6: colors[5]');
  exiger('antdDarkColors', '3: colors[2]');
  exiger('antdDarkColors', '6: colors[5]');
  exiger('antdDarkColors', 'colorBgContainer: getSolidColor(colorBgBase, 8)');
  exiger('antdDarkAlgorithm', 'instance.lighten(brightness)');
  exiger('antdLightColors', 'colorBgContainer: getSolidColor(colorBgBase, 0)');
  exiger('antdLightAlgorithm', 'instance.darken(brightness)');
  exiger('antdDarkIndex', 'colorPrimaryBg: colorMapToken.colorPrimaryBorder');
  const lignes = {
    outline: src('antdStyle', 'outline: `${unit(token.lineWidthFocus)} solid ${token.colorPrimaryBorder}`'),
    bouton: src('antdButtonStyle', "'&:not(:disabled)': genFocusStyle(token)"),
    ombre: src('antdInputToken', 'activeShadow: `0 0 0 ${controlOutlineWidth}px ${controlOutline}`'),
    bordure: src('antdInputToken', 'activeBorderColor: colorPrimary'),
    alias: src('antdAlias', 'controlOutline: getAlphaColor('),
    largeur: src('antdAlias', 'lineWidthFocus: mergedToken.lineWidth * 3'),
    seed: src('antdSeed', 'colorPrimary:'),
    claires: src('antdLightColors', '3: colors[2]'),
    sombres: src('antdDarkColors', '3: colors[2]'),
    generate: src('antColorsGenerate', 'export default function generate'),
  };

  /* getAlphaColor d'Ant Design, recopié de util/getAlphaColor.js (alias.js l'appelle pour controlOutline) */
  const alphaDe = (devant, derriere) => {
    const f = depuisHex(devant);
    const b = depuisHex(derriere);
    const stable = (x) => x >= 0 && x <= 255;
    for (let fA = 0.01; fA <= 1; fA += 0.01) {
      const r = arr((f.r - b.r * (1 - fA)) / fA);
      const g = arr((f.g - b.g * (1 - fA)) / fA);
      const bl = arr((f.b - b.b * (1 - fA)) / fA);
      if (stable(r) && stable(g) && stable(bl)) return `rgba(${r}, ${g}, ${bl}, ${Math.round(fA * 100) / 100})`;
    }
    return devant;
  };

  const theme = (th) => {
    const palette = th === 'light' ? claire : sombre;
    const primaire = palette[5];
    const bordurePrimaire = palette[2];
    const fondPrimaire = th === 'light' ? palette[0] : palette[2];
    const conteneur = th === 'light' ? '#ffffff' : eclaircir('#000000', 8);
    const contourAlpha = alphaDe(fondPrimaire, conteneur);
    const page = fond(th === 'light' ? 'colorBgContainer = darken(#fff, 0)' : 'colorBgContainer = lighten(#000, 8) (calculé)', conteneur, th === 'light' ? lignes.claires : lignes.sombres);
    const rLargeur = 3 * lineWidth;
    const sourcePalette = [th === 'light' ? lignes.claires : lignes.sombres, lignes.generate, lignes.seed];
    const bouton = (nomFill, hexFill) =>
      etat({
        page,
        composant: fond(nomFill, hexFill, sourcePalette[0], page),
        couches: [
          {
            role: 'trait',
            forme: 'outline de lineWidthFocus (3px), décalage 1px (genFocusOutline)',
            publie: `${rLargeur}px solid colorPrimaryBorder = palette[3] ${th === 'dark' ? '(thème sombre, calculé)' : ''}`.trim(),
            couleur: bordurePrimaire,
            recouvre: 'page',
            epaisseurPx: rLargeur,
            decalagePx: 1,
            source: [lignes.outline, lignes.bouton, lignes.largeur, ...sourcePalette],
          },
        ],
        type: 'trait détaché',
        bordure: 'inchangée',
      });
    const champ = etat({
      page,
      composant: fond('colorBgContainer (activeBg)', conteneur, lignes.bordure, page),
      couches: [
        {
          role: 'halo',
          forme: 'box-shadow 0 0 0 2px controlOutline (controlOutlineWidth = 2 x lineWidth)',
          publie: `activeShadow = 0 0 0 ${2 * lineWidth}px ${contourAlpha} (controlOutline = getAlphaColor(colorPrimaryBg ${fondPrimaire}, colorBgContainer ${conteneur}))`,
          couleur: contourAlpha,
          recouvre: 'page',
          epaisseurPx: 2 * lineWidth,
          decalagePx: 0,
          source: [lignes.ombre, lignes.alias, ...sourcePalette],
        },
        {
          role: 'bordure',
          forme: 'borderColor = activeBorderColor = colorPrimary',
          publie: `colorPrimary = palette[6] ${th === 'dark' ? '(thème sombre, calculé)' : ''}`.trim(),
          couleur: primaire,
          recouvre: 'composant',
          epaisseurPx: lineWidth,
          decalagePx: 0,
          source: [lignes.bordure, ...sourcePalette],
        },
      ],
      type: 'halo+bordure',
      bordure: `${lineWidth}px, de colorBorder vers colorPrimary`,
    });
    return {
      plein: bouton('colorPrimary (palette[6])', primaire),
      secondaire: bouton('colorBgContainer (bouton default)', conteneur),
      champ,
    };
  };
  const L = theme('light');
  const Dk = theme('dark');
  systeme('ant-design', 'Ant Design', '5.29.3', [
    { id: 'plein', composant: 'bouton plein principal', variante: 'type primary', light: L.plein, dark: Dk.plein },
    { id: 'secondaire', composant: 'bouton secondaire', variante: 'default', light: L.secondaire, dark: Dk.secondaire },
    { id: 'champ', composant: 'champ de saisie', variante: 'Input outlined', light: L.champ, dark: Dk.champ },
  ]);
}

/* -------------------------------------------------------- 7. Material UI 7.3.11 */
{
  const palette = texte('muiCreatePalette');
  const bleus = texte('muiBlue');
  const nuance = (n) => {
    const m = bleus.match(new RegExp(`\\b${n}: '(#[0-9a-f]{6})'`));
    if (!m) throw new Error(`Material UI : blue[${n}] absent`);
    return { hex: m[1], source: { fichier: fichier('muiBlue'), ligne: ligneDe('muiBlue', `${n}: '${m[1]}'`) } };
  };
  const primaire = palette.match(/function getDefaultPrimary\(mode = 'light'\) \{\s*if \(mode === 'dark'\) \{\s*return \{\s*main: _blue\.default\[(\d+)\]/);
  const primaireClair = palette.match(/return \{\s*main: _blue\.default\[(\d+)\],\s*light: _blue\.default\[(\d+)\],\s*dark: _blue\.default\[(\d+)\]\s*\};\s*\}\s*function getDefaultSecondary/);
  if (!primaire || !primaireClair) throw new Error('Material UI : getDefaultPrimary changé');
  const nuanceMain = { light: +primaireClair[1], dark: +primaire[1] };
  const fonds = [...palette.matchAll(/background: \{\s*paper: ([^,]+),\s*default: ([^\n]+)\n/g)];
  if (fonds.length < 2) throw new Error('Material UI : fonds de page changés');
  const litt = (x) => (x.trim().includes('common') ? '#fff' : x.trim().replace(/['",]/g, ''));
  const fondPage = { light: litt(fonds[0][2]), dark: litt(fonds[1][2]) };
  const sPageClair = src('muiCreatePalette', fonds[0][0].split('\n')[0]);
  const sPageSombre = { fichier: fichier('muiCreatePalette'), ligne: ligneAu(palette, palette.indexOf(fonds[1][0])) };
  const textePrimaire = palette.match(/text: \{\s*\/\/[^\n]*\n\s*primary: '(rgba\([^']+\))'/)[1];
  const seuil = +palette.match(/contrastThreshold = (\d+)/)[1];
  exiger('muiCreatePalette', 'primary: _common.default.white');
  exiger('muiButton', /\[`&\.\$\{_buttonClasses\.default\.focusVisible\}`\]: \{\s*boxShadow: \(theme\.vars \|\| theme\)\.shadows\[6\]/);
  exiger('muiButton', 'focusRipple: !disableFocusRipple');
  exiger('muiButtonBase', 'if (focusVisible && focusRipple && !disableRipple)');
  exiger('muiTouchRipple', /&\.\$\{_touchRippleClasses\.default\.rippleVisible\} \{\s*opacity: 0\.3;/);
  exiger('muiTouchRipple', 'background-color: currentColor;');
  exiger('muiOutlinedInput', /focused\} \.\$\{_outlinedInputClasses\.default\.notchedOutline\}`\]: \{\s*borderWidth: 2/);
  exiger('muiOutlinedInput', 'borderColor: (theme.vars || theme).palette[color].main');
  const sRipple = src('muiTouchRipple', /&\.\$\{_touchRippleClasses\.default\.rippleVisible\} \{/);
  const sRippleCur = src('muiTouchRipple', 'background-color: currentColor;');
  const sFocusRipple = src('muiButton', 'focusRipple: !disableFocusRipple');
  const sOmbre = src('muiButton', /boxShadow: \(theme\.vars \|\| theme\)\.shadows\[6\]/);
  const sBordureFocus = src('muiOutlinedInput', 'borderWidth: 2');
  const sBordureCouleur = src('muiOutlinedInput', 'borderColor: (theme.vars || theme).palette[color].main');
  const sPrimaire = src('muiCreatePalette', 'function getDefaultPrimary');

  const rapportContraste = (a, b) => contraste(a, b);
  const theme = (th) => {
    const main = nuance(nuanceMain[th]);
    const page = fond(`palette.background.default (${fondPage[th]})`, fondPage[th], th === 'light' ? sPageClair : sPageSombre);
    const blanc = '#ffffff';
    const texteContenu = rapportContraste(main.hex, blanc) >= seuil ? blanc : textePrimaire;
    const bordureChamp = th === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)';
    const remarqueOmbre = `Le focus-visible du bouton contained ajoute aussi boxShadow: shadows[6] (trois ombres noires translucides, ligne ${sOmbre.ligne}), sans trait de couleur.`;
    const plein = etat({
      page,
      composant: fond(`palette.primary.main = blue[${nuanceMain[th]}]`, main.hex, main.source, page),
      couches: [
        {
          role: 'ondulation',
          forme: 'ondulation de focus (TouchRipple, pulsation continue) dans le bouton, couleur currentColor à 0,3',
          publie: `currentColor = ${texteContenu === blanc ? 'contrastText blanc' : 'contrastText ' + textePrimaire}, opacity 0.3 (rippleVisible)`,
          couleur: avecAlpha(texteContenu, 0.3),
          recouvre: 'composant',
          epaisseurPx: null,
          decalagePx: 0,
          source: [sRipple, sRippleCur, sFocusRipple, sPrimaire],
        },
      ],
      type: 'ondulation intérieure + ombre',
      bordure: 'inchangée',
      remarques: [remarqueOmbre],
    });
    const contour = etat({
      page,
      composant: fond('variant outlined, fond transparent', 'transparent', sFocusRipple, page),
      couches: [
        {
          role: 'ondulation',
          forme: 'ondulation de focus dans le bouton, couleur currentColor (primary.main) à 0,3',
          publie: `currentColor = palette.primary.main blue[${nuanceMain[th]}], opacity 0.3`,
          couleur: avecAlpha(main.hex, 0.3),
          recouvre: 'composant',
          epaisseurPx: null,
          decalagePx: 0,
          source: [sRipple, sRippleCur, sFocusRipple, sPrimaire],
        },
      ],
      type: 'ondulation intérieure',
      bordure: 'inchangée (1px, primary.main à 0,5)',
    });
    const champ = etat({
      page,
      composant: fond('OutlinedInput sans fond propre', 'transparent', sBordureFocus, page),
      couches: [
        {
          role: 'bordure',
          forme: 'notchedOutline : borderWidth 2px, borderColor primary.main',
          publie: `palette.primary.main = blue[${nuanceMain[th]}]`,
          couleur: main.hex,
          recouvre: 'composant',
          epaisseurPx: 2,
          decalagePx: 0,
          source: [sBordureFocus, sBordureCouleur, sPrimaire],
        },
      ],
      type: 'bordure seule',
      bordure: `1px ${bordureChamp} vers 2px primary.main`,
    });
    return { plein, contour, champ };
  };
  const L = theme('light');
  const Dk = theme('dark');
  systeme('material-ui', 'Material UI', '7.3.11', [
    { id: 'plein', composant: 'bouton plein principal', variante: 'contained, color primary', light: L.plein, dark: Dk.plein },
    { id: 'contour', composant: 'bouton à contour', variante: 'outlined, color primary', light: L.contour, dark: Dk.contour },
    { id: 'champ', composant: 'champ de saisie', variante: 'OutlinedInput', light: L.champ, dark: Dk.champ },
  ]);
}

/* ------------------------------------------------------------- 9. Atlassian */
{
  const jetonAtlas = (id, nom) => {
    const t = texte(id);
    const m = t.match(new RegExp(`${nom}: (#[0-9A-Fa-f]{6,8});`));
    if (!m) throw new Error(`Atlassian : ${nom} absent de ${id}`);
    return { hex: m[1].toLowerCase(), source: { fichier: fichier(id), ligne: ligneDe(id, `${nom}:`) } };
  };
  const css = texte('atlaskitTextfieldCss');
  const js = texte('atlaskitTextfield');
  const standard = js.match(/focusWithinStyle = \{\s*standard: "([^"]+)"/);
  if (!standard) throw new Error('Atlassian : focusWithinStyle.standard absent');
  const regles = {};
  for (const classe of standard[1].split(' ')) {
    const m = css.match(new RegExp(`\\.${classe}\\.${classe}:has\\(input:focus\\)\\{([^}]*)\\}`));
    if (!m) throw new Error(`Atlassian : règle ${classe} absente du CSS compilé`);
    regles[classe] = m[1];
  }
  const toutes = Object.values(regles).join(';');
  const bordureM = toutes.match(/border-color:var\((--ds-[\w-]+),(#[0-9a-f]+)\)/);
  const ombreM = toutes.match(/box-shadow:inset 0 0 0 var\(--ds-border-width,(\d+)px\) var\((--ds-[\w-]+),(#[0-9a-f]+)\)/);
  const fondM = toutes.match(/background-color:var\((--ds-[\w-]+),(#[0-9a-f]+)\)/);
  if (!bordureM || !ombreM || !fondM) throw new Error('Atlassian : règles de focus du champ changées');
  const sRegle = src('atlaskitTextfieldCss', `.${standard[1].split(' ')[0]}.`);
  const sClasses = src('atlaskitTextfield', 'focusWithinStyle = {');
  const theme = (th) => {
    const id = th === 'light' ? 'atlaskitLight' : 'atlaskitDark';
    const surface = jetonAtlas(id, '--ds-surface');
    const bd = jetonAtlas(id, bordureM[1]);
    const ombre = jetonAtlas(id, ombreM[2]);
    const bg = jetonAtlas(id, fondM[1]);
    const page = fond(`--ds-surface (${surface.hex})`, surface.hex, surface.source);
    return etat({
      page,
      composant: fond(`${fondM[1]} (${bg.hex})`, bg.hex, bg.source, page),
      couches: [
        {
          role: 'bordure',
          forme: 'border-color du conteneur (:has(input:focus))',
          publie: `${bordureM[1]}: ${bd.hex}`,
          couleur: bd.hex,
          recouvre: 'composant',
          epaisseurPx: 1,
          decalagePx: 0,
          source: [sClasses, sRegle, bd.source],
        },
        {
          role: 'ombre-interne',
          forme: 'box-shadow inset de 1px, même couleur que la bordure',
          publie: `inset 0 0 0 ${ombreM[1]}px ${ombreM[2]}: ${ombre.hex}`,
          couleur: ombre.hex,
          recouvre: 'composant',
          epaisseurPx: +ombreM[1],
          decalagePx: -1,
          source: [sClasses, sRegle, ombre.source],
        },
      ],
      type: 'bordure + trait intérieur',
      bordure: '1px, de --ds-border-input vers --ds-border-focused, doublée par 1px intérieur',
    });
  };
  // Anneau de référence du paquet @atlaskit/focus-ring (non appliqué au bouton dans @atlaskit/button)
  exiger('atlaskitFocusRing', 'outline: "var(--ds-border-width-focused, 2px)".concat(" solid ", "var(--ds-border-focused, #4688EC)")');
  exiger('atlaskitFocusRing', 'var BORDER_WIDTH = 2;');
  exiger('atlaskitFocusRing', 'outlineOffset: BORDER_WIDTH');
  const sRing = src('atlaskitFocusRing', 'baseFocusOutsideStyles');
  const anneau = (th) => {
    const id = th === 'light' ? 'atlaskitLight' : 'atlaskitDark';
    const surface = jetonAtlas(id, '--ds-surface');
    const bd = jetonAtlas(id, '--ds-border-focused');
    const page = fond(`--ds-surface (${surface.hex})`, surface.hex, surface.source);
    return etat({
      page,
      composant: fond('aucun composant : l\'anneau est évalué contre la page seule', surface.hex, surface.source, page),
      couches: [
        {
          role: 'trait',
          forme: 'outline de 2px, décalage 2px (FocusRing, mode extérieur)',
          publie: `--ds-border-focused: ${bd.hex}`,
          couleur: bd.hex,
          recouvre: 'page',
          epaisseurPx: 2,
          decalagePx: 2,
          source: [sRing, bd.source],
        },
      ],
      type: 'trait détaché',
      bordure: 'inchangée',
    });
  };
  // Le bouton : aucune règle de focus dans le paquet publié
  const cssBouton = texte('atlaskitButtonBaseCss');
  const aOutline = /outline-(?:width|style|color|offset)|outline:/.test(cssBouton);
  const focusRegles = [...cssBouton.matchAll(/\._\w+:focus-visible\{[^}]*\}/g)].map((m) => m[0]);
  const cssReset = texte('atlaskitCssReset');
  const resetBouton = /(?:^|\n)(?:button|input)[^{]*:focus/.test(cssReset);
  const pkg = JSON.parse(texte('atlaskitButtonPackage'));
  const bBase = texte('atlaskitButtonBase');
  const importeRing = /focus-ring|FocusRing/.test(bBase) || /focus-ring|FocusRing/.test(texte('atlaskitButtonDefault'));
  const illisible = {
    lisible: false,
    raison:
      'Le paquet @atlaskit/button publie le CSS compilé du bouton (button-base.compiled.css) sans aucune règle outline ni box-shadow de focus. ' +
      `Règles :focus-visible trouvées : ${focusRegles.join(' ') || 'aucune'} (z-index du bouton scindé). ` +
      `Propriété outline présente dans le CSS compilé : ${aOutline}. Import de @atlaskit/focus-ring dans button-base.js ou button.js : ${importeRing}. ` +
      `Dépendance @atlaskit/focus-ring déclarée dans package.json : ${Boolean(pkg.dependencies && pkg.dependencies['@atlaskit/focus-ring'])}. ` +
      `Le reset @atlaskit/css-reset ne cible que le lien : règle de focus sur button ou input trouvée : ${resetBouton}.`,
    sources: [
      { fichier: fichier('atlaskitButtonBaseCss'), ligne: 1 },
      { fichier: fichier('atlaskitButtonPackage'), ligne: ligneDe('atlaskitButtonPackage', '@atlaskit/focus-ring') },
      { fichier: fichier('atlaskitCssReset'), ligne: ligneDe('atlaskitCssReset', 'a:focus-visible') },
    ],
  };
  if (aOutline || importeRing || resetBouton) throw new Error('Atlassian : le bouton a maintenant une règle de focus, à relever');
  systeme('atlassian', 'Atlassian', '@atlaskit/button 25.4.7, @atlaskit/textfield 10.2.6, @atlaskit/tokens 20.4.1', [
    { id: 'plein', composant: 'bouton plein principal', variante: 'appearance primary', ...illisible },
    { id: 'secondaire', composant: 'bouton secondaire', variante: 'appearance default', ...illisible },
    { id: 'champ', composant: 'champ de saisie', variante: 'Textfield standard', light: theme('light'), dark: theme('dark') },
    { id: 'anneau-reference', composant: 'anneau de référence du paquet @atlaskit/focus-ring (non appliqué au bouton)', variante: 'FocusRing extérieur', reference: true, light: anneau('light'), dark: anneau('dark') },
  ]);
}

/* ------------------------------------------------------------ 10. GOV.UK Frontend */
{
  const palette = texte('govukPalette');
  const couleurPalette = (nom, variante = 'primary') => {
    if (nom === 'white') {
      const m = palette.match(/"white": (#[0-9a-f]{6})/);
      return { hex: m[1], source: src('govukPalette', '"white": #') };
    }
    const bloc1 = palette.match(new RegExp(`"${nom}": \\(([^)]*)\\)`));
    if (!bloc1) throw new Error(`GOV.UK : couleur ${nom} absente`);
    const m = bloc1[1].match(new RegExp(`"${variante}": (#[0-9a-f]{6})`));
    if (!m) throw new Error(`GOV.UK : ${nom} ${variante} absent`);
    const ligne = ligneAu(palette, palette.indexOf(bloc1[0]) + bloc1[0].indexOf(m[0]));
    return { hex: m[1], source: { fichier: fichier('govukPalette'), ligne } };
  };
  const fonctionnel = texte('govukFunctionalColours');
  const nomFonctionnel = (cle) => {
    const m = fonctionnel.match(new RegExp(`"${cle}": \\(\\s*name: "(\\w+)"`));
    if (!m) throw new Error(`GOV.UK : couleur fonctionnelle ${cle} absente`);
    return { nom: m[1], source: { fichier: fichier('govukFunctionalColours'), ligne: ligneDe('govukFunctionalColours', `"${cle}": (`) } };
  };
  const focus = nomFonctionnel('focus');
  const focusTexte = nomFonctionnel('focus-text');
  const bordureChamp = nomFonctionnel('input-border');
  const corps = nomFonctionnel('body-background');
  const jaune = couleurPalette(focus.nom);
  const noir = couleurPalette(focusTexte.nom);
  const bordureNoire = couleurPalette(bordureChamp.nom);
  const blanc = couleurPalette(corps.nom);
  const vert = (() => {
    exiger('govukButtonSettings', '$govuk-button-background-colour: helpers.govuk-colour("green") !default;');
    return couleurPalette('green');
  })();
  exiger('govukButtonSettings', '$govuk-button-text-colour: helpers.govuk-colour("white") !default;');
  exiger('govukButtonMixin', /&:focus \{\s*border-color: base\.govuk-functional-colour\(focus\);\s*outline: base\.\$govuk-focus-width solid transparent;\s*box-shadow: inset 0 0 0 1px base\.govuk-functional-colour\(focus\);/);
  exiger('govukButtonMixin', /&:focus:not\(:active\):not\(:hover\) \{\s*border-color: base\.govuk-functional-colour\(focus\);\s*color: base\.govuk-functional-colour\(focus-text\);\s*background-color: base\.govuk-functional-colour\(focus\);\s*box-shadow: 0 2px 0 base\.govuk-functional-colour\(focus-text\);/);
  exiger('govukButtonMixin', '$govuk-secondary-button-colour: base.govuk-colour("black", $variant: "tint-95");');
  exiger('govukInputMixin', /&:focus \{\s*@include base\.govuk-focused-form-input;/);
  exiger('govukFocused', /@mixin govuk-focused-form-input \{\s*outline: \$govuk-focus-width solid;\s*outline-color: govuk-functional-colour\(focus\);[^}]*outline-offset: 0;[^}]*box-shadow: inset 0 0 0 \$govuk-border-width-form-element govuk-functional-colour\(input-border\);/);
  const mesures = texte('govukMeasurements');
  const focusLargeur = +mesures.match(/\$govuk-focus-width: (\d+)px/)[1];
  const bordureLargeur = +mesures.match(/\$govuk-border-width-form-element: (\d+)px/)[1];
  const gris = couleurPalette('black', 'tint-95');
  const sFocusBouton = src('govukButtonMixin', '&:focus:not(:active):not(:hover)');
  const sFocusBase = src('govukButtonMixin', '&:focus {');
  const sSecond = src('govukButtonMixin', '$govuk-secondary-button-colour:');
  const sFocusChamp = src('govukFocused', '@mixin govuk-focused-form-input');
  const sInput = src('govukInputMixin', '@include base.govuk-focused-form-input');
  const sFocusLargeur = src('govukMeasurements', '$govuk-focus-width');
  const sBordureLargeur = src('govukMeasurements', '$govuk-border-width-form-element');
  const page = fond(`govuk-functional-colour(body-background) = ${corps.nom}`, blanc.hex, blanc.source);
  const sourcesCouleurs = [focus.source, jaune.source, focusTexte.source, noir.source];
  const bouton = (nomFond, hexFond, sFond) =>
    etat({
      page,
      composant: fond(nomFond, hexFond, sFond, page),
      couches: [
        {
          role: 'remplissage',
          forme: 'le fond du bouton devient la couleur de focus, avec une bordure de la même couleur',
          publie: `background-color: govuk-functional-colour(focus) = ${focus.nom} ${jaune.hex}`,
          couleur: jaune.hex,
          recouvre: 'composant',
          epaisseurPx: null,
          decalagePx: 0,
          source: [sFocusBouton, ...sourcesCouleurs],
        },
        {
          role: 'ombre',
          forme: 'box-shadow 0 2px 0 sous le bouton, couleur du texte de focus',
          publie: `box-shadow: 0 2px 0 govuk-functional-colour(focus-text) = ${focusTexte.nom} ${noir.hex}`,
          couleur: noir.hex,
          recouvre: 'page',
          epaisseurPx: 2,
          decalagePx: 0,
          source: [sFocusBouton, ...sourcesCouleurs],
        },
      ],
      principal: 0,
      type: 'remplissage + trait inférieur',
      bordure: `bordure de 2px (couleur du fond au repos) vers ${jaune.hex}`,
      remarques: [
        'Le bouton passe du fond au repos au jaune ; le texte passe au noir. L\'ombre noire de 2px sous le bouton reste la couche nette.',
        `Un outline transparent de ${focusLargeur}px est posé aussi (ligne ${sFocusBase.ligne} de ${sFocusBase.fichier}) : il ne se voit qu'en mode de contraste forcé.`,
      ],
    });
  const champ = etat({
    page,
    composant: fond('champ sans fond propre (la page se voit)', 'transparent', sInput, page),
    couches: [
      {
        role: 'trait',
        forme: 'outline de 3px, décalage 0, contre le bord extérieur de la bordure',
        publie: `outline: ${focusLargeur}px solid govuk-functional-colour(focus) = ${focus.nom} ${jaune.hex}`,
        couleur: jaune.hex,
        recouvre: 'page',
        epaisseurPx: focusLargeur,
        decalagePx: 0,
        source: [sFocusChamp, sInput, sFocusLargeur, ...sourcesCouleurs],
      },
      {
        role: 'ombre-interne',
        forme: 'box-shadow inset de 2px, couleur de la bordure du champ : double l\'épaisseur de la bordure',
        publie: `box-shadow: inset 0 0 0 ${bordureLargeur}px govuk-functional-colour(input-border) = ${bordureChamp.nom} ${bordureNoire.hex}`,
        couleur: bordureNoire.hex,
        recouvre: 'composant',
        epaisseurPx: bordureLargeur,
        decalagePx: -bordureLargeur,
        source: [sFocusChamp, sBordureLargeur, bordureChamp.source, bordureNoire.source],
      },
    ],
    principal: 0,
    type: 'trait collé + bordure doublée',
    bordure: `${bordureLargeur}px noire au repos, doublée à ${bordureLargeur * 2}px par l'ombre intérieure`,
  });
  systeme('govuk', 'GOV.UK Frontend', '6.5.1', [
    { id: 'plein', composant: 'bouton plein principal', variante: 'govuk-button (vert)', light: bouton(`$govuk-button-background-colour = green ${vert.hex}`, vert.hex, vert.source), dark: null },
    { id: 'secondaire', composant: 'bouton secondaire', variante: 'govuk-button--secondary', light: bouton(`$govuk-secondary-button-colour = black tint-95 ${gris.hex}`, gris.hex, sSecond), dark: null },
    { id: 'champ', composant: 'champ de saisie', variante: 'govuk-input', light: champ, dark: null },
  ]);
}

/* ------------------------------------------------------------------- sortie */

const meta = {
  objet:
    'Indicateur de focus clavier du bouton plein principal, d\'un bouton secondaire ou à contour et du champ de saisie texte, dans dix systèmes. Valeurs publiées, sans recommandation.',
  fonds:
    'Fond de page : celui que le système déclare pour le thème (blanc en clair, sauf mention). Fond du composant : le fond que le composant a au moment du focus. Une couleur translucide se compose sur le fond qu\'elle recouvre : la page pour un halo ou un trait posé hors du composant, le composant pour une couche à l\'intérieur.',
  contraste: 'WCAG 2, luminance relative standard, arrondi à 0,01. Les couleurs sont lues au pas de 8 bits.',
  champs: {
    principal: 'Indice de la couche qui sert d\'indicateur : la plus extérieure, sinon la plus marquante.',
    pale: 'Vrai si la couche principale contraste à moins de 3:1 avec le fond de page.',
    colle: 'Vrai si la couche principale est hors du composant et sans décalage (0).',
    colleEtPale: 'Vrai si la couche principale est collée et pâle.',
    autreCoucheNette: 'Vrai si une autre couche (bordure, trait intérieur, ombre) atteint 3:1 contre la page.',
    decalagePx: '0 : collé au bord du composant. Positif : espace entre le composant et le trait. Négatif : couche à l\'intérieur du bord.',
    recouvre: 'Fond sur lequel la couche se compose : page ou composant.',
  },
  themesAbsents: 'Une valeur null pour dark signifie que le système ne publie pas de thème sombre.',
};

/** Retire les valeurs undefined pour un JSON stable. */
const json = JSON.stringify({ meta, systemes }, null, 2) + '\n';
writeFileSync(new URL('focus.json', racine), json);

if (process.argv.includes('--tableau')) {
  const lignesTableau = [];
  const cellule = (e) => {
    if (!e) return 'aucun thème sombre';
    const p = e.couches[e.principal];
    return `${p.hexCompose}, ${e.contrasteAvecPage} / ${e.contrasteAvecComposant}`;
  };
  for (const s of systemes) {
    for (const c of s.composants) {
      if (c.lisible === false) {
        lignesTableau.push(`| ${s.nom} | ${c.composant} (${c.variante}) | non lisible dans le paquet publié | | | |`);
        continue;
      }
      const p = c.light.couches[c.light.principal];
      const g = c.light.geometrie;
      const etiquette = (e) => (e ? [e.pale ? 'pâle' : 'net', e.colleEtPale ? 'collé' : '', e.autreCoucheNette ? 'autre couche nette' : ''].filter(Boolean).join(', ') : 'sans objet');
      lignesTableau.push(
        `| ${s.nom} | ${c.composant} (${c.variante}) | ${p.role}, ${p.epaisseurPx ?? 'n/a'} px, décalage ${p.decalagePx} | ${cellule(c.light)} | ${cellule(c.dark)} | Light : ${etiquette(c.light)} ; Dark : ${etiquette(c.dark)} |`,
      );
    }
  }
  console.log(lignesTableau.join('\n'));
}
console.log(`focus.json : ${systemes.length} systèmes, ${systemes.reduce((n, s) => n + s.composants.length, 0)} composants.`);

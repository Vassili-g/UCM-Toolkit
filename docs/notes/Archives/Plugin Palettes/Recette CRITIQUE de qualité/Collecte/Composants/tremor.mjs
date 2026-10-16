/**
 * Tremor (code copié, révision ca4d588f) : Badge, Callout et Button, avec la
 * palette de Tailwind CSS 4.1.3 (`theme.css`, valeurs oklch converties).
 * Les classes sont lues dans les `tv({ variants })` des composants ; chaque
 * classe `bg-<couleur>-<pas>[/alpha]` est résolue dans `theme.css`. Les
 * variantes `dark:` donnent le thème sombre.
 */
import { texte, fichier, ligneDe, valeur, evaluer } from './lib.mjs';

const VERSION = 'tremorlabs/tremor@ca4d588f + tailwindcss@4.1.3';
const THEME_CSS = texte('tailwindTheme');

/** `--color-<nom>-<pas>: <valeur>;` du thème Tailwind. */
const couleurs = {};
for (const m of THEME_CSS.matchAll(/--color-([a-z]+)(?:-(\d+))?:\s*([^;]+);/g)) {
  couleurs[m[2] ? `${m[1]}-${m[2]}` : m[1]] = { valeur: m[3].trim(), ligne: ligneDe(THEME_CSS, `--color-${m[1]}${m[2] ? `-${m[2]}` : ''}:`) };
}

/** Variantes d'un `tv()` : nom vers liste de classes (chaînes entre guillemets). */
function variantes(id) {
  const t = texte(id);
  const debut = t.indexOf('variants: {');
  const fin = t.indexOf('defaultVariants');
  const zone = t.slice(debut, fin);
  const out = {};
  for (const m of zone.matchAll(/\n\s{6}(\w+): \[([\s\S]*?)\n\s{6}\],/g)) {
    out[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].flatMap((s) => s[1].split(/\s+/));
  }
  return { out, ligneBase: (nom) => ligneDe(t, new RegExp(`\\n\\s{6}${nom}: \\[`)) };
}

/** Classe `prefixe-couleur[-pas][/alpha]` -> valeur de couleur ; `prefixe` = bg, text, ring. */
function classe(liste, prefixe, theme, composant, id, etat = '') {
  const motif = theme === 'sombre'
    ? new RegExp(`^dark:${etat}${prefixe}-([a-z]+(?:-\\d+)?|\\[#[0-9a-fA-F]+\\])(?:/(\\d+))?$`)
    : new RegExp(`^${etat}${prefixe}-([a-z]+(?:-\\d+)?|\\[#[0-9a-fA-F]+\\])(?:/(\\d+))?$`);
  let trouve = liste.find((c) => motif.test(c));
  // Une classe sans préfixe `dark:` vaut aussi en sombre si aucune variante sombre n'existe
  let heritee = false;
  if (!trouve && theme === 'sombre') {
    const clair = new RegExp(`^${etat}${prefixe}-([a-z]+(?:-\\d+)?|\\[#[0-9a-fA-F]+\\])(?:/(\\d+))?$`);
    trouve = liste.find((c) => clair.test(c));
    heritee = Boolean(trouve);
  }
  if (!trouve) return null;
  const m = trouve.match(/([a-z]+(?:-\d+)?|\[#[0-9a-fA-F]+\])(?:\/(\d+))?$/);
  const nom = m[1];
  const alpha = m[2] ? +m[2] / 100 : undefined;
  let publie;
  let pas;
  let ligne;
  if (nom.startsWith('[#')) {
    publie = nom.slice(1, -1);
    pas = 'valeur libre';
  } else {
    const c = couleurs[nom];
    if (!c) throw new Error(`Tailwind : couleur ${nom} absente de theme.css`);
    publie = c.valeur;
    pas = nom.match(/-(\d+)$/)?.[1] ?? nom;
    ligne = c.ligne;
    if (alpha !== undefined) {
      const mm = publie.match(/^oklch\((.+)\)$/);
      publie = mm ? `oklch(${mm[1]} / ${alpha})` : publie;
    }
  }
  const e = valeur({
    token: trouve,
    publie,
    id: 'tailwindTheme',
    ligne,
    pas: alpha !== undefined ? `${pas}/${Math.round(alpha * 100)}` : pas,
    via: { classeTailwind: trouve, variable: nom.startsWith('[#') ? undefined : `--color-${nom}` },
    aussi: { composant: { fichier: fichier(id), ligne: composant } },
  });
  if (heritee) e.note = 'aucune variante `dark:` : la classe claire s\'applique aussi en sombre';
  return e;
}

export function lignes() {
  const out = [];
  const base = { systeme: 'Tremor (Tailwind CSS)', version: VERSION };

  const card = texte('tremorCard');
  const carteClair = card.match(/"bg-white dark:bg-\[(#[0-9a-fA-F]{6})\]"/);
  if (!carteClair) throw new Error('Tremor : fond de Card a changé');
  const support = {
    clair: { page: null, carte: { token: 'Card : bg-white', hex: '#ffffff' } },
    sombre: { page: null, carte: { token: `Card : dark:bg-[${carteClair[1]}]`, hex: carteClair[1].toLowerCase() } },
  };

  // Badge
  const badge = variantes('tremorBadge');
  const tons = { info: 'default', neutre: 'neutral', success: 'success', danger: 'error', warning: 'warning' };
  for (const theme of ['clair', 'sombre']) {
    for (const [ton, nom] of Object.entries(tons)) {
      const l = badge.out[nom];
      if (!l) throw new Error(`Tremor Badge : variante ${nom} absente`);
      const ln = badge.ligneBase(nom);
      out.push(evaluer({
        ...base, type: 'badge-discret', composant: 'Badge', variante: nom, ton, theme,
        fond: classe(l, 'bg', theme, ln, 'tremorBadge'),
        texte: classe(l, 'text', theme, ln, 'tremorBadge'),
        contour: { ...classe(l, 'ring', theme, ln, 'tremorBadge'), epaisseur: '1 px, anneau interne (`ring-1 ring-inset`)' },
        notes: ['Contour par anneau interne translucide, alpha compris dans le pas indiqué.'],
      }, support[theme]));
    }
  }

  // Callout
  const callout = variantes('tremorCallout');
  for (const theme of ['clair', 'sombre']) {
    for (const [ton, nom] of Object.entries({ ...tons, neutre: 'neutral' })) {
      const l = callout.out[nom === 'default' ? 'default' : nom];
      if (!l) throw new Error(`Tremor Callout : variante ${nom} absente`);
      const ln = callout.ligneBase(nom);
      out.push(evaluer({
        ...base, type: 'alerte', composant: 'Callout', variante: nom, ton, theme,
        fond: classe(l, 'bg', theme, ln, 'tremorCallout'),
        texte: classe(l, 'text', theme, ln, 'tremorCallout'),
        contour: null,
        notes: ['Pas de contour. En sombre, le fond est le pas 950 à 70 % (translucide).'],
      }, support[theme]));
    }
  }

  // Button
  const bouton = variantes('tremorButton');
  for (const theme of ['clair', 'sombre']) {
    const lightL = bouton.out.light;
    const lnL = bouton.ligneBase('light');
    out.push(evaluer({
      ...base, type: 'bouton-teinte', composant: 'Button', variante: 'light', ton: 'neutre', theme,
      fond: classe(lightL, 'bg', theme, lnL, 'tremorButton'),
      texte: classe(lightL, 'text', theme, lnL, 'tremorButton'),
      contour: null,
      survol: { fond: classe(lightL, 'bg', theme, lnL, 'tremorButton', 'hover:') },
      appui: { note: 'aucune classe `active:` : pas d\'état d\'appui' },
      notes: ['Fond gris neutre. Aucun bouton teinté par un ton de statut.'],
    }, support[theme]));
    for (const [ton, nom] of [['marque', 'primary'], ['danger', 'destructive']]) {
      const l = bouton.out[nom];
      const ln = bouton.ligneBase(nom);
      out.push(evaluer({
        ...base, type: 'bouton-plein', composant: 'Button', variante: nom, ton, theme,
        fond: classe(l, 'bg', theme, ln, 'tremorButton'),
        texte: classe(l, 'text', theme, ln, 'tremorButton'),
        contour: null,
        survol: { fond: classe(l, 'bg', theme, ln, 'tremorButton', 'hover:') },
        appui: { note: 'aucune classe `active:` : pas d\'état d\'appui' },
      }, support[theme]));
    }
  }
  return out;
}

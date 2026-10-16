/**
 * Shopify Polaris : Badge, Banner et Button de @shopify/polaris 13.9.5
 * (feuille `styles.css`, `Banner/utilities.js`), avec les tokens de
 * @shopify/polaris-tokens 9.4.2 (thèmes `light` et `dark-experimental`).
 * Le thème sombre publié est partiel : les tokens de statut gardent leurs
 * valeurs claires, ce que les lignes du thème sombre reflètent.
 */
import { texte, fichier, ligneDe, valeur, regles, declsDe, supportDe, evaluer } from './lib.mjs';

const VERSION = '@shopify/polaris@13.9.5 + @shopify/polaris-tokens@9.4.2';
const THEMES = { clair: 'light', sombre: 'dark-experimental' };

/** Tables de tokens des thèmes, lues dans le module compilé sans l'exécuter. */
const tokens = (() => {
  const t = texte('polarisTokensBuild');
  const i = t.indexOf('var themes = ') + 'var themes = '.length;
  let prof = 0;
  let j = i;
  for (; j < t.length; j++) {
    if (t[j] === '{') prof++;
    if (t[j] === '}' && --prof === 0) break;
  }
  return JSON.parse(t.slice(i, j + 1));
})();

function jeton(theme, nom, composant) {
  const v = tokens[THEMES[theme]].color[nom];
  if (v === undefined) throw new Error(`Polaris ${theme} : ${nom} absent`);
  return valeur({ token: nom, publie: v, id: 'polarisTokensBuild', via: { variableCss: `--p-${nom}` }, aussi: composant ? { composant } : undefined });
}
const sansPrefixe = (nomCss) => {
  const m = nomCss.match(/^var\(--p-([\w-]+)\)$/);
  if (!m) throw new Error(`Polaris : variable attendue : ${nomCss}`);
  return m[1];
};

export function lignes() {
  const out = [];
  const base = { systeme: 'Shopify Polaris', version: VERSION };
  const css = texte('polarisStyles');
  const regs = regles(css);
  const util = texte('polarisBannerUtilities');
  const lieuCss = (motif) => ({ fichier: fichier('polarisStyles'), ligne: ligneDe(css, motif) });

  const badges = { danger: 'Critical', success: 'Success', warning: 'Warning', info: 'Info' };
  const bannerCles = { danger: 'critical', success: 'success', warning: 'warning', info: 'info' };

  // Banner : paires lues dans utilities.js
  const banner = {};
  for (const m of util.matchAll(/(\w+): \{\s*withinPage: \{\s*background: '([\w-]+)',\s*text: '([\w-]+)',\s*icon: '[\w-]+'\s*\},\s*withinContentContainer: \{\s*background: '([\w-]+)',\s*text: '([\w-]+)'/g)) {
    banner[m[1]] = { pageFond: m[2], pageTexte: m[3], contenuFond: m[4], contenuTexte: m[5], ligne: ligneDe(util, `  ${m[1]}: {`) };
  }

  for (const theme of ['clair', 'sombre']) {
    const support = supportDe('polaris', theme === 'clair' ? 'light' : 'dark');
    const noteSombre = theme === 'sombre' ? ['Thème `dark-experimental` : les tokens de statut gardent les valeurs claires.'] : [];

    for (const [ton, tone] of Object.entries(badges)) {
      const d = declsDe(regs, `.Polaris-Badge--tone${tone}`);
      const c = lieuCss(`.Polaris-Badge--tone${tone}{`);
      out.push(evaluer({
        ...base, type: 'badge-discret', composant: 'Badge', variante: `tone ${tone.toLowerCase()}`, ton, theme,
        fond: jeton(theme, sansPrefixe(d['background-color']), c),
        texte: jeton(theme, sansPrefixe(d.color), c),
        contour: null,
        notes: ['Pas de contour.', ...noteSombre],
      }, support));
    }

    for (const [ton, cle] of Object.entries(bannerCles)) {
      const b = banner[cle];
      if (!b) throw new Error(`Polaris : Banner ${cle} absent`);
      const c = { fichier: fichier('polarisBannerUtilities'), ligne: b.ligne };
      out.push(evaluer({
        ...base, type: 'alerte', composant: 'Banner', variante: 'dans un contenu (withinContentContainer)', ton, theme,
        fond: jeton(theme, `color-${b.contenuFond}`, c),
        texte: jeton(theme, `color-${b.contenuTexte}`, c),
        contour: null,
        notes: ['Pas de contour.', ...noteSombre],
      }, support));
      out.push(evaluer({
        ...base, type: 'alerte', composant: 'Banner', variante: 'dans une page (withinPage, aplat)', ton, theme,
        fond: jeton(theme, `color-${b.pageFond}`, c),
        texte: jeton(theme, `color-${b.pageTexte}`, c),
        contour: null,
        notes: ['Aplat plein ; le texte est le jeton « on-bg-fill ».', ...noteSombre],
      }, support));
    }

    // Button : primary (aplat de marque) et tertiary critical (texte coloré)
    const primary = declsDe(regs, '.Polaris-Button--variantPrimary');
    const bgVar = (v) => sansPrefixe(v.split(',').pop().trim());
    const c1 = lieuCss('.Polaris-Button--variantPrimary{');
    out.push(evaluer({
      ...base, type: 'bouton-plein', composant: 'Button', variante: 'primary (marque)', ton: 'marque', theme,
      fond: jeton(theme, bgVar(primary['--pc-button-bg']), c1),
      texte: jeton(theme, sansPrefixe(primary['--pc-button-color']), c1),
      contour: null,
      survol: { fond: jeton(theme, bgVar(primary['--pc-button-bg_hover']), c1) },
      appui: { fond: jeton(theme, bgVar(primary['--pc-button-bg_active']), c1) },
      notes: ['Le fond est un dégradé (`--p-color-button-gradient-bg-fill`) posé sur le fond uni ; seul le fond uni est relevé.', ...noteSombre],
    }, support));
    for (const [ton, cle] of [['danger', 'Critical'], ['success', 'Success']]) {
      const p = declsDe(regs, `.Polaris-Button--tone${cle}:is(.Polaris-Button--variantPrimary)`);
      const c = lieuCss(`.Polaris-Button--tone${cle}:is(.Polaris-Button--variantPrimary){`);
      out.push(evaluer({
        ...base, type: 'bouton-plein', composant: 'Button', variante: `primary tone ${cle.toLowerCase()}`, ton, theme,
        fond: jeton(theme, sansPrefixe(p['--pc-button-bg']), c),
        texte: jeton(theme, sansPrefixe(primary['--pc-button-color']), c1),
        contour: null,
        survol: { fond: jeton(theme, sansPrefixe(p['--pc-button-bg_hover']), c) },
        appui: { fond: jeton(theme, sansPrefixe(p['--pc-button-bg_active']), c) },
        notes: ['Même texte que `primary`.', ...noteSombre],
      }, support));
    }

    // Tertiary tone critical : texte coloré, fond transparent, survol neutre
    const ter = declsDe(regs, '.Polaris-Button--variantTertiary');
    const cri = declsDe(regs, '.Polaris-Button--toneCritical:is(.Polaris-Button--variantSecondary, .Polaris-Button--variantTertiary, .Polaris-Button--variantPlain)');
    const c2 = lieuCss('.Polaris-Button--toneCritical:is(.Polaris-Button--variantSecondary, .Polaris-Button--variantTertiary');
    out.push(evaluer({
      ...base, type: 'bouton-teinte', composant: 'Button', variante: 'tertiary tone critical', ton: 'danger', theme,
      fond: valeur({ token: 'background (tertiary)', publie: 'transparent', id: 'polarisStyles', aussi: { composant: lieuCss('.Polaris-Button--variantTertiary{') } }),
      texte: jeton(theme, sansPrefixe(cri['--pc-button-color']), c2),
      contour: null,
      survol: { fond: jeton(theme, sansPrefixe(ter['--pc-button-bg_hover']), lieuCss('.Polaris-Button--variantTertiary{')), texte: jeton(theme, sansPrefixe(cri['--pc-button-color_hover']), c2) },
      appui: { fond: jeton(theme, sansPrefixe(ter['--pc-button-bg_active']), lieuCss('.Polaris-Button--variantTertiary{')), texte: jeton(theme, sansPrefixe(cri['--pc-button-color_active']), c2) },
      notes: ['Aucun fond teinté : Polaris colore le texte, le fond de survol reste neutre (`bg-fill-transparent-hover`).', ...noteSombre],
    }, support));
  }
  return out;
}

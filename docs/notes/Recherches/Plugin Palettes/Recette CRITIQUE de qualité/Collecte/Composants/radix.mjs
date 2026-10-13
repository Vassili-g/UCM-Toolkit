/**
 * Radix Themes 3.3.0 (couleurs @radix-ui/colors 3.0.0) : Badge (soft, surface,
 * solid), Callout (soft, surface), Button (soft, solid).
 * Les règles sont lues dans les feuilles du paquet ; les valeurs, dans les
 * feuilles de couleur de chaque famille. Les quatre familles blue, green,
 * amber et red servent de témoins d'info, succès, avertissement et danger :
 * Radix expose des familles de couleur et ne leur attribue pas ces sens.
 */
import { texte, fichier, valeur, regles, declsDe, ligneDe, supportDe, evaluer, lireVar } from './lib.mjs';

const VERSION = '@radix-ui/themes@3.3.0 / @radix-ui/colors@3.0.0';
const FAMILLES = { success: 'green', warning: 'amber', danger: 'red', info: 'blue' };
const FICHIERS = { green: 'radixGreen', amber: 'radixAmber', red: 'radixRed', blue: 'radixBlue' };

/** Bloc `{ ... }` qui suit la première occurrence d'un motif. */
function bloc(t, motif) {
  const debut = t.search(motif);
  if (debut < 0) throw new Error(`Bloc absent : ${motif}`);
  const ouvre = t.indexOf('{', debut);
  let prof = 1;
  let j = ouvre + 1;
  for (; j < t.length && prof > 0; j++) {
    if (t[j] === '{') prof++;
    else if (t[j] === '}') prof--;
  }
  return { corps: t.slice(ouvre + 1, j - 1), debut: ouvre };
}

/** Variables d'une famille de couleur pour un thème, avec leur ligne. */
function palette(famille, theme) {
  const id = FICHIERS[famille];
  const t = texte(id);
  const { corps, debut } = bloc(t, theme === 'light' ? /^:root, \.light, \.light-theme \{/m : /^\.dark, \.dark-theme \{/m);
  const base = t.slice(0, debut).split('\n').length - 1;
  const vars = {};
  corps.split('\n').forEach((l, i) => {
    const m = l.match(/^\s*(--[\w-]+):\s*([^;]+);/);
    if (m) vars[m[1]] = { valeur: m[2].trim(), ligne: base + i + 1 };
  });
  const c = t.match(new RegExp(`--${famille}-contrast:\\s*([^;]+);`));
  if (!c) throw new Error(`Contraste absent : ${famille}`);
  vars[`--${famille}-contrast`] = { valeur: c[1].trim(), ligne: ligneDe(t, `--${famille}-contrast:`) };
  return { id, vars };
}

/** Valeur d'un token `--accent-xxx` pour une famille et un thème. */
function accent(token, famille, theme, composant) {
  const p = palette(famille, theme);
  const nom = token.replace('--accent-', `--${famille}-`);
  const v = p.vars[nom];
  if (!v) throw new Error(`Radix ${famille} ${theme} : ${nom} absent`);
  const pas = token.replace('--accent-', '');
  return valeur({
    token,
    publie: v.valeur,
    id: p.id,
    ligne: v.ligne,
    pas,
    via: { famille: nom },
    aussi: composant ? { composant } : undefined,
  });
}

const jetons = (decl) => [...decl.matchAll(/var\((--accent-[\w]+)\)/g)].map((m) => m[1]);

export function lignes() {
  const out = [];
  const css = {
    badge: { id: 'radixBadge', t: texte('radixBadge') },
    callout: { id: 'radixCallout', t: texte('radixCallout') },
    bouton: { id: 'radixBaseButton', t: texte('radixBaseButton') },
  };
  const regs = {
    badge: regles(css.badge.t),
    callout: regles(css.callout.t),
    bouton: regles(css.bouton.t),
  };
  const lieu = (cle, motif) => ({ fichier: fichier(css[cle].id), ligne: ligneDe(css[cle].t, motif) });
  const un = (decl, cle) => {
    const v = jetons(decl[cle]);
    if (v.length !== 1) throw new Error(`Radix : jeton attendu dans ${cle}: ${decl[cle]}`);
    return v[0];
  };

  const selBadge = (v) => `.rt-Badge:where(.rt-variant-${v})`;
  const selCallout = (v) => `.rt-CalloutRoot:where(.rt-variant-${v})`;
  const selBtn = (v) => `.rt-BaseButton:where(.rt-variant-${v})`;

  const regleBadge = {
    soft: declsDe(regs.badge, selBadge('soft')),
    surface: declsDe(regs.badge, selBadge('surface')),
    solid: declsDe(regs.badge, selBadge('solid')),
  };
  const regleCallout = {
    racine: declsDe(regs.callout, '.rt-CalloutRoot'),
    soft: declsDe(regs.callout, selCallout('soft')),
    surface: declsDe(regs.callout, selCallout('surface')),
  };
  const regleBtn = {
    softTexte: declsDe(regs.bouton, '.rt-BaseButton:where(.rt-variant-soft, .rt-variant-ghost)'),
    soft: declsDe(regs.bouton, selBtn('soft')),
    softHover: declsDe(regs.bouton, `${selBtn('soft')}:where(:hover)`, '(hover: hover)'),
    softActive: declsDe(regs.bouton, `${selBtn('soft')}:where(:active:not([data-state='open']))`),
    solid: declsDe(regs.bouton, selBtn('solid')),
    solidHover: declsDe(regs.bouton, `${selBtn('solid')}:where(:hover)`, '(hover: hover)'),
    solidActive: declsDe(regs.bouton, `${selBtn('solid')}:where(:active:not([data-state='open']))`),
  };

  const base = { systeme: 'Radix Themes', version: VERSION };

  for (const theme of ['light', 'dark']) {
    const support = supportDe('radix', theme);
    for (const [ton, famille] of Object.entries(FAMILLES)) {
      const A = (token, cle) => accent(token, famille, theme, cle);
      const themeId = theme === 'light' ? 'clair' : 'sombre';

      // Badge soft
      out.push(evaluer({
        ...base, type: 'badge-discret', composant: 'Badge', variante: 'soft', ton, famille, theme: themeId,
        fond: A(un(regleBadge.soft, 'background-color'), lieu('badge', selBadge('soft'))),
        texte: A(un(regleBadge.soft, 'color'), lieu('badge', selBadge('soft'))),
        contour: null,
        notes: ['Pas de contour. Le texte est translucide (alpha), composé sur le fond.'],
      }, support));

      // Badge surface
      out.push(evaluer({
        ...base, type: 'badge-discret', composant: 'Badge', variante: 'surface', ton, famille, theme: themeId,
        fond: A(un(regleBadge.surface, 'background-color'), lieu('badge', selBadge('surface'))),
        texte: A(un(regleBadge.surface, 'color'), lieu('badge', selBadge('surface'))),
        contour: { ...A(un(regleBadge.surface, 'box-shadow'), lieu('badge', selBadge('surface'))), epaisseur: '1px, ombre interne' },
        notes: ['Contour par `box-shadow: inset 0 0 0 1px`.'],
      }, support));

      // Badge solid
      out.push(evaluer({
        ...base, type: 'badge-plein', composant: 'Badge', variante: 'solid', ton, famille, theme: themeId,
        fond: A(un(regleBadge.solid, 'background-color'), lieu('badge', selBadge('solid'))),
        texte: A(un(regleBadge.solid, 'color'), lieu('badge', selBadge('solid'))),
        contour: null,
      }, support));

      // Callout soft
      out.push(evaluer({
        ...base, type: 'alerte', composant: 'Callout', variante: 'soft', ton, famille, theme: themeId,
        fond: A(un(regleCallout.soft, 'background-color'), lieu('callout', selCallout('soft'))),
        texte: A(un(regleCallout.racine, 'color'), lieu('callout', '.rt-CalloutRoot {')),
        contour: null,
        notes: ['Le texte et l\'icône héritent de `color` posé sur la racine du Callout.'],
      }, support));

      // Callout surface
      out.push(evaluer({
        ...base, type: 'alerte', composant: 'Callout', variante: 'surface', ton, famille, theme: themeId,
        fond: A(un(regleCallout.surface, 'background-color'), lieu('callout', selCallout('surface'))),
        texte: A(un(regleCallout.racine, 'color'), lieu('callout', '.rt-CalloutRoot {')),
        contour: { ...A(un(regleCallout.surface, 'box-shadow'), lieu('callout', selCallout('surface'))), epaisseur: '1px, ombre interne' },
      }, support));

      // Button soft
      out.push(evaluer({
        ...base, type: 'bouton-teinte', composant: 'Button', variante: 'soft', ton, famille, theme: themeId,
        fond: A(un(regleBtn.soft, 'background-color'), lieu('bouton', selBtn('soft'))),
        texte: A(un(regleBtn.softTexte, 'color'), lieu('bouton', '.rt-BaseButton:where(.rt-variant-soft, .rt-variant-ghost)')),
        contour: null,
        survol: { fond: A(un(regleBtn.softHover, 'background-color'), lieu('bouton', `${selBtn('soft')}`)) },
        appui: { fond: A(un(regleBtn.softActive, 'background-color'), lieu('bouton', `${selBtn('soft')}`)) },
        notes: ['Le texte garde `accent-a11` aux trois états.'],
      }, support));

      // Button solid : survol et appui
      const filtre = theme === 'light' ? 'brightness(0.92) saturate(1.1)' : 'brightness(1.08)';
      out.push(evaluer({
        ...base, type: 'bouton-plein', composant: 'Button', variante: 'solid', ton, famille, theme: themeId,
        fond: A(un(regleBtn.solid, 'background-color'), lieu('bouton', selBtn('solid'))),
        texte: A(un(regleBtn.solid, 'color'), lieu('bouton', selBtn('solid'))),
        contour: null,
        survol: { fond: A(un(regleBtn.solidHover, 'background-color'), lieu('bouton', selBtn('solid'))) },
        appui: { fond: A(un(regleBtn.solidActive, 'background-color'), lieu('bouton', selBtn('solid'))), filtre },
        notes: [`À l'appui, le fond reste \`accent-10\` et la règle ajoute \`filter: ${filtre}\` (variable \`--base-button-solid-active-filter\`). L'effet du filtre n'est pas calculé.`],
      }, support));
    }
  }
  return out;
}

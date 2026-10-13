/**
 * Atlassian : Lozenge 17.0.5 (version actuelle, celle que `index` exporte),
 * Section message 10.2.6, Button 25.4.7, avec les tokens de @atlaskit/tokens
 * 20.4.1 (clair et sombre).
 * Les composants sont compilés en classes atomiques (`_xxxx`) : le script lit
 * l'association classes/rôles dans le JS du composant, puis la déclaration de
 * chaque classe dans la feuille compilée. Les valeurs viennent des thèmes de
 * tokens ; le repli écrit dans la feuille (`var(--ds-x, #hex)`) sert de
 * contrôle et doit égaler la valeur du thème clair.
 */
import { texte, fichier, ligneDe, valeur, regles, supportDe, evaluer, lireVar, memeCouleur } from './lib.mjs';

const VERSION_TOKENS = '@atlaskit/tokens@20.4.1';

/** Variables `--ds-*` d'un thème, lues dans la chaîne CSS du module généré. */
function themeTokens(id) {
  const t = texte(id);
  const m = t.match(/exports\.default = "(.*)";\s*$/s);
  const css = JSON.parse(`"${m[1]}"`);
  const premier = css.slice(0, css.indexOf('}'));
  const vars = {};
  for (const l of premier.split('\n')) {
    const d = l.match(/^\s*(--ds-[\w-]+):\s*([^;]+);/);
    if (d) vars[d[1]] = d[2].trim();
  }
  return vars;
}
const THEMES = { clair: themeTokens('atlaskitLight'), sombre: themeTokens('atlaskitDark') };
const ID_THEME = { clair: 'atlaskitLight', sombre: 'atlaskitDark' };
const NOMS = texte('atlaskitTokenNames');

/** Nom de variable `--ds-x` vers token pointé `color.x` (lu dans token-names). */
function nomPointe(variable) {
  const m = NOMS.match(new RegExp(`'([\\w.]+)':\\s*'${variable.replace(/[-]/g, '\\-')}'`));
  return m ? m[1] : undefined;
}
const pasDe = (variable) => {
  const m = variable.match(/(subtlest|subtler|subtle|bolder|bold)(?:-(hovered|pressed))?$/);
  if (m) return m[2] ? `${m[1]}.${m[2]}` : m[1];
  const d = variable.match(/^--ds-background-(?:success|warning|danger|information)(?:-(hovered|pressed))?$/);
  return d ? (d[1] ? `défaut.${d[1]}` : 'défaut') : undefined;
};

/** Valeur d'une variable pour un thème, contrôlée contre le repli (thème clair). */
function jeton(variableCss, theme, repli, composant) {
  const v = THEMES[theme][variableCss];
  if (v === undefined) throw new Error(`Atlassian ${theme} : ${variableCss} absent du thème`);
  if (repli !== undefined && !memeCouleur(THEMES.clair[variableCss], repli)) {
    throw new Error(`Atlassian : repli ${repli} différent du thème clair pour ${variableCss}`);
  }
  const token = nomPointe(variableCss) ?? variableCss;
  return valeur({
    token,
    publie: v,
    id: ID_THEME[theme],
    pas: pasDe(variableCss),
    via: { variableCss },
    aussi: composant ? { composant } : undefined,
  });
}

/** Table classe -> déclarations par pseudo-classe, depuis une feuille compilée. */
function atomes(id) {
  const regs = regles(texte(id));
  const table = {};
  for (const r of regs) {
    const m = r.sel.match(/^\.(_[\w]+)((?::[\w-]+)*)$/);
    if (!m) continue;
    const cle = `${m[1]}${m[2]}`;
    table[cle] = { ...(table[cle] ?? {}), ...r.decls };
  }
  return table;
}

/** Déclarations d'un groupe de classes ("_a _b") pour une pseudo-classe. */
function groupe(table, classes, pseudo = '') {
  const out = {};
  for (const c of classes.split(/\s+/)) Object.assign(out, table[`${c}${pseudo}`] ?? {});
  return out;
}

/** Valeur `var(--ds-x, #repli)` d'une propriété, ou erreur. */
function varDe(decls, propriete, contexte) {
  const brut = decls[propriete];
  if (brut === undefined) throw new Error(`Atlassian : ${propriete} absent (${contexte})`);
  const v = lireVar(brut);
  if (!v) throw new Error(`Atlassian : ${propriete} n'est pas une variable (${contexte}) : ${brut}`);
  return v;
}

export function lignes() {
  const out = [];
  const base = { systeme: 'Atlassian' };

  // ---------- Lozenge
  const lozJs = texte('atlaskitLozengeJs');
  const lozTable = atomes('atlaskitLozengeCss');
  const lozCle = (cle) => {
    const m = lozJs.match(new RegExp(`'${cle.replace('.', '\\.')}':\\s*"([^"]+)"`));
    if (!m) throw new Error(`Lozenge : clé ${cle} absente`);
    return m[1];
  };
  if (!/styles\.iconBorderFilter/.test(lozJs)) throw new Error('Lozenge : iconBorderFilter n\'est plus appliqué');
  const lozLieu = (cle) => ({ fichier: fichier('atlaskitLozengeJs'), ligne: ligneDe(lozJs, `'${cle}':`) });
  const lozenges = { success: 'success', warning: 'warning', danger: 'danger', info: 'information' };
  const versionLoz = '@atlaskit/lozenge@17.0.5 (new/lozenge-base) + ' + VERSION_TOKENS;
  for (const theme of ['clair', 'sombre']) {
    const support = supportDe('atlassian', theme === 'clair' ? 'light' : 'dark');
    for (const [ton, nom] of Object.entries(lozenges)) {
      const cle = `semantic.${nom}`;
      const rest = groupe(lozTable, lozCle(cle));
      const inter = lozCle(`interactive.${cle}`);
      const bg = varDe(rest, 'background-color', cle);
      const tx = varDe(rest, 'color', cle);
      const bd = varDe(rest, '--border-color', cle);
      const hov = varDe(groupe(lozTable, inter, ':hover'), 'background-color', `${cle} :hover`);
      const act = varDe(groupe(lozTable, inter, ':active'), 'background-color', `${cle} :active`);
      const c = lozLieu(cle);
      out.push(evaluer({
        ...base, version: versionLoz, type: 'badge-discret', composant: 'Lozenge', variante: 'semantic (défaut)', ton, theme,
        fond: jeton(bg.nom, theme, bg.repli, c),
        texte: jeton(tx.nom, theme, tx.repli, c),
        contour: jeton(bd.nom, theme, bd.repli, c),
        survol: { fond: jeton(hov.nom, theme, hov.repli, lozLieu(`interactive.${cle}`)), note: 'seulement si le Lozenge reçoit `onClick`' },
        appui: { fond: jeton(act.nom, theme, act.repli, lozLieu(`interactive.${cle}`)), note: 'seulement si le Lozenge reçoit `onClick`' },
        notes: ['Contour 1 px : la couleur vient de `--border-color` (`border.X.subtle`), appliquée par `iconBorderFilter` quand le Lozenge n\'est pas sélectionné.'],
      }, support));
    }
  }

  // ---------- Section message
  const smJs = texte('atlaskitSectionMessageJs');
  const smTable = atomes('atlaskitSectionMessageCss');
  const smAppearance = {};
  const zone = smJs.slice(smJs.indexOf('var appearanceStyles'), smJs.indexOf('};', smJs.indexOf('var appearanceStyles')));
  for (const m of zone.matchAll(/(\w+):\s*"([^"]+)"/g)) smAppearance[m[1]] = m[2];
  const smTexte = (smJs.match(/content:\s*"([^"]+)"/) ?? [])[1];
  const sections = { success: 'success', warning: 'warning', danger: 'error', info: 'information' };
  for (const theme of ['clair', 'sombre']) {
    const support = supportDe('atlassian', theme === 'clair' ? 'light' : 'dark');
    for (const [ton, nom] of Object.entries(sections)) {
      const bg = varDe(groupe(smTable, smAppearance[nom]), 'background-color', nom);
      const tx = varDe(groupe(smTable, smTexte), 'color', 'content');
      const c = { fichier: fichier('atlaskitSectionMessageJs'), ligne: ligneDe(smJs, 'var appearanceStyles') };
      out.push(evaluer({
        ...base, version: '@atlaskit/section-message@10.2.6 + ' + VERSION_TOKENS, type: 'alerte', composant: 'Section message', variante: nom, ton, theme,
        fond: jeton(bg.nom, theme, bg.repli, c),
        texte: jeton(tx.nom, theme, tx.repli, c),
        contour: null,
        notes: ['Pas de contour. Le texte est neutre (`color.text`), seule l\'icône porte la couleur du ton.'],
      }, support));
    }
  }

  // ---------- Button
  const btJs = texte('atlaskitButtonJs');
  const btTable = atomes('atlaskitButtonCss');
  const stylesButton = (nom) => {
    const m = btJs.match(new RegExp(`var ${nom}Styles = \\{\\s*root:\\s*"([^"]+)",\\s*interactive:\\s*"([^"]+)"`));
    if (!m) throw new Error(`Button : ${nom}Styles absent`);
    return { racine: m[1], inter: m[2], ligne: ligneDe(btJs, `var ${nom}Styles`) };
  };
  const versionBtn = '@atlaskit/button@25.4.7 + ' + VERSION_TOKENS;
  for (const theme of ['clair', 'sombre']) {
    const support = supportDe('atlassian', theme === 'clair' ? 'light' : 'dark');
    const bouton = (nom, ton, type, variante, notes) => {
      const s = stylesButton(nom);
      const racine = groupe(btTable, s.racine);
      const bg = varDe(racine, 'background-color', nom);
      const tx = varDe(racine, 'color', nom);
      const hov = varDe(groupe(btTable, s.inter, ':hover'), 'background-color', `${nom} :hover`);
      const act = varDe(groupe(btTable, s.inter, ':active'), 'background-color', `${nom} :active`);
      const bordure = groupe(btTable, s.racine, ':after')['border-color'];
      const c = { fichier: fichier('atlaskitButtonJs'), ligne: s.ligne };
      const ligne = {
        ...base, version: versionBtn, type, composant: 'Button', variante, ton, theme,
        fond: jeton(bg.nom, theme, bg.repli, c),
        texte: jeton(tx.nom, theme, tx.repli, c),
        contour: bordure ? jeton(lireVar(bordure).nom, theme, lireVar(bordure).repli, c) : null,
        survol: { fond: jeton(hov.nom, theme, hov.repli, c) },
        appui: { fond: jeton(act.nom, theme, act.repli, c) },
        notes,
      };
      out.push(evaluer(ligne, support));
    };
    bouton('default', 'neutre', 'bouton-teinte', 'default', [
      'Fond transparent au repos, contour par `::after` (`color.border`). Aucun bouton de la bibliothèque n\'emploie de fond teinté : `default` et `subtle` sont neutres.',
    ]);
    bouton('subtle', 'neutre', 'bouton-teinte', 'subtle', ['Fond transparent, sans contour.']);
    bouton('primary', 'marque', 'bouton-plein', 'primary', ['Le texte est `color.text.inverse`.']);
    bouton('danger', 'danger', 'bouton-plein', 'danger', []);
    bouton('warning', 'warning', 'bouton-plein', 'warning', ['Le texte est `color.text.warning.inverse`.']);

    // Gamme de fonds teintés disponibles dans les tokens, sans composant qui les emploie
    const gamme = { success: 'success', warning: 'warning', danger: 'danger', info: 'information' };
    for (const [ton, nom] of Object.entries(gamme)) {
      for (const niveau of ['', 'subtler']) {
        const v = `--ds-background-${nom}${niveau ? `-${niveau}` : ''}`;
        const c = { fichier: fichier(ID_THEME[theme]), ligne: undefined };
        out.push(evaluer({
          ...base, version: VERSION_TOKENS, type: 'gamme-tokens', composant: 'tokens seuls (aucun composant lu)', variante: niveau || 'défaut (sans suffixe)', ton, theme,
          fond: jeton(v, theme, undefined, c),
          texte: jeton(`--ds-text-${nom}-bolder`, theme, undefined, c),
          contour: null,
          survol: { fond: jeton(`${v}-hovered`, theme, undefined, c) },
          appui: { fond: jeton(`${v}-pressed`, theme, undefined, c) },
          notes: ['Les tokens existent avec leurs états survol et appui ; le texte `bolder` est celui du Lozenge. Aucun Button lu ne les assemble.'],
        }, support));
      }
    }
  }
  return out;
}

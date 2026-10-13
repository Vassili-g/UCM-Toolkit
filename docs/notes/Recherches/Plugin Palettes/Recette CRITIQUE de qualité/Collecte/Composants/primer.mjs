/**
 * GitHub Primer : Label, Flash et Button de @primer/react 38.40.1 (feuilles
 * compilées de `dist/`), avec les tokens de @primer/primitives 11.10.0
 * (thèmes `light` et `dark`, figés dans ../Surfaces/).
 * La feuille d'un composant écrit `var(--token, repli)` ; le repli est la
 * valeur claire et sert de contrôle.
 */
import { texte, fichier, ligneDe, valeur, regles, declsDe, supportDe, evaluer, lireVar, memeCouleur } from './lib.mjs';

const VERSION = '@primer/react@38.40.1 + @primer/primitives@11.10.0';

/** Déclarations `--nom: valeur;` du premier bloc d'un thème de tokens. */
function themeTokens(id) {
  const t = texte(id);
  const arret = t.search(/@media/);
  const zone = arret < 0 ? t : t.slice(0, arret);
  const ouvre = zone.indexOf('{');
  const decls = {};
  const lignes = {};
  const base = zone.slice(0, ouvre + 1).split('\n').length - 1;
  zone.slice(ouvre + 1, zone.lastIndexOf('}')).split('\n').forEach((l, i) => {
    const m = l.match(/^\s*(--[\w-]+):\s*([^;]+);/);
    if (m) {
      decls[m[1]] = m[2].trim();
      lignes[m[1]] = base + i + 1;
    }
  });
  return { decls, lignes };
}
const THEMES = { clair: themeTokens('primerLight'), sombre: themeTokens('primerDark') };
const ID_THEME = { clair: 'primerLight', sombre: 'primerDark' };

/** Résout une variable de token jusqu'à sa couleur. */
function resoudre(theme, nom, chaine = []) {
  const T = THEMES[theme];
  const v = T.decls[nom];
  if (v === undefined) throw new Error(`Primer ${theme} : ${nom} absent`);
  const r = lireVar(v);
  if (!r) return { valeur: v, chaine: [...chaine, nom], ligne: T.lignes[nom] };
  return resoudre(theme, r.nom, [...chaine, nom]);
}

function jeton(nom, theme, repli, composant) {
  const r = resoudre(theme, nom);
  if (repli !== undefined) {
    const claire = resoudre('clair', nom).valeur;
    if (!memeCouleur(claire, repli)) throw new Error(`Primer : repli ${repli} différent du thème clair pour ${nom} (${claire})`);
  }
  return valeur({
    token: nom,
    publie: r.valeur,
    id: ID_THEME[theme],
    ligne: r.ligne,
    via: r.chaine.length > 1 ? { chaine: r.chaine } : undefined,
    aussi: composant ? { composant } : undefined,
  });
}

const variableDe = (decls, propriete, contexte) => {
  const brut = decls[propriete];
  if (brut === undefined) throw new Error(`Primer : ${propriete} absent (${contexte})`);
  const v = lireVar(brut);
  if (!v) throw new Error(`Primer : ${propriete} n'est pas une variable (${contexte}) : ${brut}`);
  return v;
};

export function lignes() {
  const out = [];
  const base = { systeme: 'GitHub Primer', version: VERSION };

  const label = regles(texte('primerLabelCss'));
  const flash = regles(texte('primerFlashCss'));
  const bouton = regles(texte('primerButtonCss'));
  const nomLabel = texte('primerLabelCss').match(/:where\((\.prc-Label-Label-[\w-]+)\)/)[1];
  const nomFlash = texte('primerFlashCss').match(/(\.prc-Flash-Flash-[\w-]+)/)[1];
  const nomBouton = texte('primerButtonCss').match(/(\.prc-Button-ButtonBase-[\w-]+)\{/)[1];

  const lieu = (id, motif) => ({ fichier: fichier(id), ligne: ligneDe(texte(id), motif) });

  const labels = { success: 'success', warning: 'attention', danger: 'danger', info: 'accent' };
  const flashs = { success: 'success', warning: 'warning', danger: 'danger', info: 'default' };

  for (const theme of ['clair', 'sombre']) {
    const support = supportDe('primer', theme === 'clair' ? 'light' : 'dark');

    // Label : contour et texte colorés, sans fond
    const baseLabel = declsDe(label, `:where(${nomLabel})`);
    for (const [ton, variante] of Object.entries(labels)) {
      const d = declsDe(label, `:where(${nomLabel}):where([data-variant=${variante}])`);
      const bd = variableDe(d, 'border-color', `Label ${variante}`);
      const tx = variableDe(d, 'color', `Label ${variante}`);
      const c = lieu('primerLabelCss', `[data-variant=${variante}]`);
      out.push(evaluer({
        ...base, type: 'badge-discret', composant: 'Label', variante, ton, theme,
        fond: valeur({ token: 'background-color: transparent', publie: baseLabel['background-color'], id: 'primerLabelCss', aussi: { composant: c } }),
        texte: jeton(tx.nom, theme, tx.repli, c),
        contour: jeton(bd.nom, theme, bd.repli, c),
        notes: ['Pas de fond : le Label est un contour de 1 px et un texte colorés. Le contour porte le pas « emphasis » de la couleur.'],
      }, support));
    }

    // Flash : fond `muted`, contour `muted`, texte neutre, icône colorée
    const racine = declsDe(flash, nomFlash);
    for (const [ton, variante] of Object.entries(flashs)) {
      const d = declsDe(flash, `${nomFlash}:where([data-variant=${variante}])`);
      const bg = variableDe(d, 'background-color', `Flash ${variante}`);
      const bd = variableDe(d, 'border-color', `Flash ${variante}`);
      const tx = variableDe(racine, 'color', 'Flash racine');
      const ic = variableDe(declsDe(flash, `${nomFlash}:where([data-variant=${variante}]) :where(svg)`), 'color', `Flash ${variante} icône`);
      const c = lieu('primerFlashCss', `[data-variant=${variante}]`);
      out.push(evaluer({
        ...base, type: 'alerte', composant: 'Flash', variante, ton, theme,
        fond: jeton(bg.nom, theme, bg.repli, c),
        texte: jeton(tx.nom, theme, tx.repli, c),
        contour: jeton(bd.nom, theme, bd.repli, c),
        icone: jeton(ic.nom, theme, ic.repli, c),
        notes: ['Contour 1 px translucide (40 %). Le texte est neutre, seule l\'icône porte la couleur du ton.'],
      }, support));
    }

    // Button
    const rest = (v) => declsDe(bouton, `${nomBouton}:where([data-variant=${v}])`);
    const survol = (v) => declsDe(bouton, `${nomBouton}:where([data-variant=${v}]):hover`);
    const appui = (v) => declsDe(bouton, `${nomBouton}:where([data-variant=${v}]):active`);
    const racineBtn = declsDe(bouton, nomBouton);
    const bouton1 = (variante, ton, type, notes) => {
      const r = rest(variante);
      const h = survol(variante);
      const a = appui(variante);
      const bg = variableDe(r, 'background-color', variante);
      const tx = variableDe(r, 'color', variante);
      const bdRest = variableDe(racineBtn, 'border-color', 'racine');
      const bgH = variableDe(h, 'background-color', `${variante} :hover`);
      const bgA = variableDe(a, 'background-color', `${variante} :active`);
      const txH = h.color ? variableDe(h, 'color', `${variante} :hover`) : null;
      const txA = a.color ? variableDe(a, 'color', `${variante} :active`) : null;
      const bdR = r['border-color'] ? variableDe(r, 'border-color', variante) : bdRest;
      const c = lieu('primerButtonCss', `[data-variant=${variante}]`);
      out.push(evaluer({
        ...base, type, composant: 'Button', variante, ton, theme,
        fond: jeton(bg.nom, theme, bg.repli, c),
        texte: jeton(tx.nom, theme, tx.repli, c),
        contour: jeton(bdR.nom, theme, bdR.repli, c),
        survol: { fond: jeton(bgH.nom, theme, bgH.repli, c), texte: txH ? jeton(txH.nom, theme, txH.repli, c) : undefined },
        appui: { fond: jeton(bgA.nom, theme, bgA.repli, c), texte: txA ? jeton(txA.nom, theme, txA.repli, c) : undefined },
        notes,
      }, support));
    };
    bouton1('default', 'neutre', 'bouton-teinte', ['Fond gris neutre (`control-bgColor`), contour gris. Aucun bouton teinté par un ton.']);
    bouton1('danger', 'danger', 'bouton-teinte', ['Au repos : fond gris neutre et texte rouge. Au survol et à l\'appui : fond rouge plein et texte blanc. Aucun fond teinté de rouge au repos.']);
    bouton1('primary', 'success', 'bouton-plein', ['Le vert est le ton du bouton principal de Primer.']);
  }
  return out;
}
